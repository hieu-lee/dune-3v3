#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { createRoomServer } from "./room-server.mjs";

const outDir = "artifacts/qa/browser-room-vp-endgame";
await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

const seats = [
  ["p1", "Alice"],
  ["p2", "Bob"],
  ["p3", "Chani"],
  ["p4", "Duncan"],
  ["p5", "Esmar"],
  ["p6", "Farok"],
];

const expectedSeats = {
  p1: { leader: "Muad'Dib", role: "Commander" },
  p2: { leader: "Feyd-Rautha Harkonnen", role: "Ally" },
  p3: { leader: "Gurney Halleck", role: "Ally" },
  p4: { leader: "Shaddam Corrino IV", role: "Commander" },
  p5: { leader: "Lady Jessica", role: "Ally" },
  p6: { leader: "Princess Irulan", role: "Ally" },
};

const consoleMessages = [];
const requestFailures = [];
const screenshots = [];
const server = await createRoomServer({ port: 0, log: false, storageFile: join(outDir, "rooms.json") });
const browser = await chromium.launch({ headless: true });
const { conflictCards, teams } = await server.ssrLoadModule("/src/game/data.ts");
const { canMoveCardToThroneRow } = await server.ssrLoadModule("/src/game/state.ts");

function observePage(page) {
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText;
    if (request.resourceType() === "eventsource" && failure === "net::ERR_ABORTED") return;
    if (request.resourceType() === "image" && failure === "net::ERR_ABORTED") return;
    requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure,
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400 || !response.url().startsWith(server.resolvedUrls.local[0])) return;
    requestFailures.push({
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      url: response.url(),
      status,
      statusText: response.statusText(),
    });
  });
}

async function capture(page, name) {
  const screenshotPath = join(outDir, name);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const state = await page.evaluate(() => window.__DUNE_DEBUG__?.getGame?.() ?? null);
  const statePath = screenshotPath.replace(/\.png$/, ".state.json");
  await writeFile(statePath, JSON.stringify(state, null, 2));
  screenshots.push(screenshotPath);
  return { screenshot: screenshotPath, state: statePath };
}

async function currentGame(page) {
  return await page.evaluate(() => window.__DUNE_DEBUG__?.getGame?.() ?? null);
}

async function roomToken(page, roomId) {
  return await page.evaluate((id) => {
    const stored = window.localStorage.getItem(`dune-3v3-room-${id}`);
    return stored ? JSON.parse(stored).token : undefined;
  }, roomId);
}

async function jsonFetch(path, options = {}) {
  const response = await fetch(`${server.resolvedUrls.local[0].replace(/\/$/, "")}${path}`, options);
  const body = await response.json().catch(() => undefined);
  return { response, body };
}

async function snapshot(roomId, playerId, tokens) {
  const { response, body } = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": tokens.get(playerId) },
  });
  assert.equal(response.status, 200, `Expected ${playerId} to load room snapshot`);
  return body;
}

async function roomAction(roomId, playerId, tokens, action) {
  const current = await snapshot(roomId, playerId, tokens);
  const { response, body } = await jsonFetch(`/api/rooms/${roomId}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-room-token": tokens.get(playerId),
    },
    body: JSON.stringify({ baseVersion: current.version, action }),
  });
  assert.equal(
    response.status,
    200,
    `${playerId} should apply ${JSON.stringify(action)}: ${response.status} ${JSON.stringify(body)}`,
  );
  return body.snapshot;
}

async function claimSeat(page, playerId, name) {
  await page.getByLabel("Player name").fill(name);
  await page.getByTestId(`room-seat-${playerId}`).click();
  await page.waitForFunction(
    (seatId) => document.querySelector(`[data-testid="room-seat-${seatId}"]`)?.classList.contains("selected"),
    playerId,
  );
}

async function waitForVisiblePrivateHand(page, playerId) {
  await page.waitForFunction((ownerId) => {
    const game = window.__DUNE_DEBUG__?.getGame?.();
    const owner = game?.players.find((player) => player.id === ownerId);
    return Boolean(owner?.hand.length && owner.hand.some((card) => card.name !== "Hidden card"));
  }, playerId);
}

async function waitForRoomVersion(page, minimumVersion) {
  await page.waitForFunction(
    (version) => (window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.version ?? 0) >= version,
    minimumVersion,
  );
}

async function waitForCurrentRoomVersion(page, roomId) {
  const room = server.rooms.get(roomId);
  assert.ok(room, "Room should exist while waiting for browser room version");
  await waitForRoomVersion(page, room.version);
}

async function reloadRoomPages(clients) {
  await Promise.all(clients.map(({ page }) => page.reload({ waitUntil: "domcontentloaded" })));
  await Promise.all(clients.map(({ page, playerId }) =>
    page.waitForFunction(
      (seatId) => document.querySelector(`[data-testid="room-seat-${seatId}"]`)?.classList.contains("selected"),
      playerId,
    )
  ));
}

function roomRecord(roomId) {
  const room = server.rooms.get(roomId);
  assert.ok(room, `Expected room ${roomId}`);
  return room;
}

function bumpRoomVersion(room) {
  room.version += 1;
  room.updatedAt = Date.now();
  return room.version;
}

async function assertConverged(roomId, clients) {
  const room = roomRecord(roomId);
  const expected = {
    version: room.version,
    phase: room.game.phase,
    activeSeat: room.game.activeSeat,
    pendingKind: room.game.pendingAction?.kind,
  };
  const failures = [];
  await Promise.all(clients.map(async ({ page, playerId }) => {
    try {
      await page.waitForFunction(
        ({ version, phase, activeSeat, pendingKind }) => {
          const snapshot = window.__DUNE_DEBUG__?.getRoomSnapshot?.();
          const game = window.__DUNE_DEBUG__?.getGame?.();
          return snapshot?.version === version &&
            JSON.stringify(snapshot.game) === JSON.stringify(game) &&
            game?.phase === phase &&
            game.activeSeat === activeSeat &&
            game.pendingAction?.kind === pendingKind;
        },
        expected,
      );
    } catch (error) {
      const diagnostics = await page.evaluate(() => {
        const snapshot = window.__DUNE_DEBUG__?.getRoomSnapshot?.();
        const game = window.__DUNE_DEBUG__?.getGame?.();
        return {
          href: window.location.href,
          snapshotVersion: snapshot?.version,
          snapshotViewer: snapshot?.viewerPlayerId,
          snapshotPhase: snapshot?.game?.phase,
          snapshotRound: snapshot?.game?.round,
          snapshotActiveSeat: snapshot?.game?.activeSeat,
          snapshotPendingKind: snapshot?.game?.pendingAction?.kind,
          gamePhase: game?.phase,
          gameRound: game?.round,
          gameActiveSeat: game?.activeSeat,
          gamePendingKind: game?.pendingAction?.kind,
          snapshotGameMatchesDebugGame: Boolean(snapshot && game) && JSON.stringify(snapshot.game) === JSON.stringify(game),
        };
      });
      failures.push({
        playerId,
        message: error instanceof Error ? error.message : String(error),
        diagnostics,
      });
    }
  }));
  assert.deepEqual(failures, [], `Room clients did not converge:\n${JSON.stringify({ expected, failures }, null, 2)}`);
}

function assertHiddenSharedDecks(game) {
  assert.ok(game.marketDeck.every((card) => card.name === "Hidden card"), "Imperium deck should be hidden");
  assert.ok(game.contractDeck.every((card) => card.name === "Hidden CHOAM contract"), "Contract deck should be hidden");
  assert.ok(game.intrigueDeck.every((card) => card.name === "Hidden Intrigue"), "Intrigue deck should be hidden");
  assert.ok(game.conflictDeck.every((card) => card.name === "Hidden Conflict"), "Conflict deck should be hidden");
}

function assertRoomPrivacy(game, viewerId) {
  assert.equal(game.players.length, 6, "Room projection should include all six players");
  for (const player of game.players) {
    assert.deepEqual(
      { leader: player.leader, role: player.role },
      expectedSeats[player.id],
      `${player.id} should keep the expected six-player seat identity`,
    );
    assert.ok(player.deck.every((card) => card.name === "Hidden card"), `${viewerId} should not see ${player.id} draw deck order`);
    if (player.id === viewerId) {
      assert.ok(
        player.hand.length === 0 || player.hand.every((card) => card.name !== "Hidden card"),
        `${viewerId} own hand should be real or empty after reveal`,
      );
    } else {
      assert.ok(player.hand.every((card) => card.name === "Hidden card"), `${viewerId} should not see ${player.id} hand`);
      assert.ok(player.intrigues.every((card) => card.name === "Hidden Intrigue"), `${viewerId} should not see ${player.id} Intrigues`);
      assert.ok(
        player.objectives.every((objective) => objective.name === "Hidden Objective" || objective.name === "Scored Objective"),
        `${viewerId} should not see ${player.id} Objectives`,
      );
    }
  }
  assertHiddenSharedDecks(game);
}

function conflictBySourceId(sourceId) {
  const conflict = conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

function finalTeamScores(game) {
  return {
    muaddib: game.players
      .filter((player) => player.team === "muaddib")
      .reduce((sum, player) => sum + player.vp, 0),
    shaddam: game.players
      .filter((player) => player.team === "shaddam")
      .reduce((sum, player) => sum + player.vp, 0),
  };
}

function expectedWinningTeam(teamScores) {
  if (teamScores.muaddib === teamScores.shaddam) return undefined;
  return teamScores.muaddib > teamScores.shaddam ? "muaddib" : "shaddam";
}

function expectedFinalScoreLog(teamScores, winningTeam) {
  if (!winningTeam) return `The game ends tied at ${teamScores.muaddib}-${teamScores.shaddam}.`;
  return `${teams[winningTeam].name} wins ${Math.max(teamScores.muaddib, teamScores.shaddam)}-${Math.min(teamScores.muaddib, teamScores.shaddam)}.`;
}

async function resolveSetup(roomId, tokens, clients) {
  const room = roomRecord(roomId);
  if (room.game.pendingAction?.kind !== "throne-row") return;
  const card = room.game.imperiumRow.find(canMoveCardToThroneRow);
  assert.ok(card, "Throne Row setup should expose a movable Imperium Row card");
  await roomAction(roomId, "p4", tokens, { kind: "choose-throne-row-card", cardId: card.id });
  await assertConverged(roomId, clients);
}

async function clickReady(page, playerId, roomId, expectedPhase) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await waitForCurrentRoomVersion(page, roomId);
    await page.locator(".endgame-panel").getByRole("button", { name: /^Ready/ }).click();
    try {
      await page.waitForFunction(
        ({ phase, seatId }) => {
          const game = window.__DUNE_DEBUG__?.getGame?.();
          const snapshot = window.__DUNE_DEBUG__?.getRoomSnapshot?.();
          if (game?.phase !== phase) return false;
          return phase === "finished" || snapshot?.endgameReady?.[seatId] === true;
        },
        { phase: expectedPhase, seatId: playerId },
        { timeout: 5000 },
      );
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

try {
  const contexts = [];
  const clients = [];

  const firstContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  contexts.push(firstContext);
  const firstPage = await firstContext.newPage();
  observePage(firstPage);
  await firstPage.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await firstPage.getByRole("button", { name: "Create" }).click();
  await firstPage.waitForFunction(() => new URL(window.location.href).searchParams.has("room"));
  const roomId = await firstPage.evaluate(() => new URL(window.location.href).searchParams.get("room"));
  assert.match(roomId, /^[A-F0-9]{8}$/);

  clients.push({ context: firstContext, page: firstPage, playerId: "p1", name: "Alice" });
  await claimSeat(firstPage, "p1", "Alice");
  await waitForVisiblePrivateHand(firstPage, "p1");

  for (const [playerId, name] of seats.slice(1)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    contexts.push(context);
    const page = await context.newPage();
    observePage(page);
    await page.goto(`${server.resolvedUrls.local[0]}?room=${roomId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".room-seat"));
    await claimSeat(page, playerId, name);
    await waitForVisiblePrivateHand(page, playerId);
    clients.push({ context, page, playerId, name });
  }

  const clientsById = new Map(clients.map((client) => [client.playerId, client]));
  const tokens = new Map();
  for (const { page, playerId } of clients) {
    const token = await roomToken(page, roomId);
    assert.ok(token, `${playerId} should store a reconnect token`);
    tokens.set(playerId, token);
  }

  await assertConverged(roomId, clients);
  for (const { page, playerId } of clients) assertRoomPrivacy(await currentGame(page), playerId);
  await capture(firstPage, "vp-endgame-all-seats-claimed.png");

  await resolveSetup(roomId, tokens, clients);

  const triggerPlayerId = "p2";
  const triggerRoom = roomRecord(roomId);
  const activeSeat = triggerRoom.game.players.findIndex((player) => player.id === triggerPlayerId);
  assert.ok(activeSeat >= 0, "Trigger player should have a seat index");
  triggerRoom.game = {
    ...triggerRoom.game,
    phase: "playing",
    round: 7,
    firstSeat: activeSeat,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    combatPasses: [],
    conflict: conflictBySourceId(454),
    conflictDeck: [conflictBySourceId(456)],
    conflictDiscard: [],
    endgameReason: undefined,
    players: triggerRoom.game.players.map((player) => ({
      ...player,
      vp: player.id === triggerPlayerId ? 10 : player.role === "Commander" ? 4 : 1,
      agentsReady: 0,
      revealed: true,
      persuasion: 0,
      conflict: 0,
      deployedTroops: 0,
      deployedSandworms: 0,
      hand: [],
      playArea: [],
      manipulatedCards: [],
      intrigues: [],
      wonConflicts: [],
    })),
  };
  const fixtureVersion = bumpRoomVersion(triggerRoom);
  await reloadRoomPages(clients);
  await Promise.all(clients.map(({ page }) => waitForRoomVersion(page, fixtureVersion)));
  await assertConverged(roomId, clients);
  for (const { page, playerId } of clients) assertRoomPrivacy(await currentGame(page), playerId);

  const triggerPage = clientsById.get(triggerPlayerId).page;
  assert.equal(await triggerPage.getByTestId("end-reveal").isDisabled(), false, "10 VP trigger player should be able to end Reveal");
  assert.equal(await firstPage.getByTestId("end-reveal").isDisabled(), true, "Non-active room clients should not end another player's Reveal");
  await capture(triggerPage, "vp-endgame-ready-to-recall.png");

  await triggerPage.getByTestId("end-reveal").click();
  await Promise.all(clients.map(({ page }) =>
    page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame?.()?.phase === "endgame")
  ));
  await assertConverged(roomId, clients);
  const endgame = roomRecord(roomId).game;
  assert.equal(endgame.phase, "endgame", "Room action should trigger Endgame");
  assert.match(endgame.endgameReason, /Feyd-Rautha Harkonnen reached 10 VP/);
  assert.equal(endgame.conflictDeck.length, 1, "10 VP Endgame should trigger before Conflict-deck exhaustion");
  assert.equal(endgame.round, 7, "10 VP Endgame should not start another round");
  assert.equal(endgame.pendingAction, undefined, "10 VP Endgame fixture should not leave pending actions");
  await capture(firstPage, "vp-endgame-triggered.png");

  for (let index = 0; index < clients.length; index += 1) {
    const { page, playerId } = clients[index];
    const expectedPhase = index === clients.length - 1 ? "finished" : "endgame";
    await clickReady(page, playerId, roomId, expectedPhase);
  }
  await Promise.all(clients.map(({ page }) =>
    page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame?.()?.phase === "finished")
  ));
  await assertConverged(roomId, clients);
  const finished = roomRecord(roomId).game;
  const teamScores = finalTeamScores(finished);
  const winningTeam = expectedWinningTeam(teamScores);
  const finalScoreLog = expectedFinalScoreLog(teamScores, winningTeam);
  assert.equal(finished.winningTeam, winningTeam, "Finished room should derive the winner from team VP");
  assert.equal(finished.log[0], finalScoreLog, "Finished room should log the final team-score result");
  await capture(firstPage, "vp-endgame-finished.png");

  for (const context of contexts) await context.close();

  const consoleFailures = consoleMessages.filter((message) => message.type === "error" || message.type === "pageerror");
  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${JSON.stringify(consoleFailures, null, 2)}`);
  assert.deepEqual(requestFailures, [], `Browser request failures:\n${JSON.stringify(requestFailures, null, 2)}`);

  const summary = {
    roomId,
    claimedSeats: seats.map(([playerId, name]) => ({ playerId, name })),
    triggerPlayerId,
    triggerRound: 7,
    endgameReason: endgame.endgameReason,
    remainingConflictDeckCount: endgame.conflictDeck.length,
    finalPhase: finished.phase,
    finalTeamScores: teamScores,
    finalWinningTeam: finished.winningTeam ?? null,
    finalScoreLog,
    screenshots,
    consoleErrorCount: consoleFailures.length,
    requestFailureCount: requestFailures.length,
    url: server.resolvedUrls.local[0],
  };
  await writeFile(join(outDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
  await writeFile(join(outDir, "request-failures.json"), JSON.stringify(requestFailures, null, 2));
  await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("browser room VP endgame passed");
  console.log(`claimed seats: ${summary.claimedSeats.length}`);
  console.log(`endgame reason: ${summary.endgameReason}`);
  console.log(`remaining conflict cards: ${summary.remainingConflictDeckCount}`);
  console.log(`final team scores: ${JSON.stringify(summary.finalTeamScores)}`);
  console.log(`final winning team: ${summary.finalWinningTeam ?? "tie"}`);
  console.log(`screenshot count: ${summary.screenshots.length}`);
  console.log(`console error count: ${summary.consoleErrorCount}`);
  console.log(`request failure count: ${summary.requestFailureCount}`);
  console.log(`summary: ${join(outDir, "summary.json")}`);
} finally {
  await browser.close();
  await server.close();
}
