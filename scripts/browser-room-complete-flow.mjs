#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { createRoomServer } from "./room-server.mjs";

const outDir = "artifacts/qa/browser-room-complete-flow";
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

async function roomAction(roomId, token, baseVersion, action) {
  return await jsonFetch(`/api/rooms/${roomId}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-room-token": token } : {}),
    },
    body: JSON.stringify({ baseVersion, action }),
  });
}

async function roomActionFor(roomId, tokens, playerId, action) {
  const token = tokens.get(playerId);
  assert.ok(token, `${playerId} should have a room token`);
  const current = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": token },
  });
  assert.equal(current.response.status, 200, `${playerId} should load a fresh room snapshot`);
  return await roomAction(roomId, token, current.body.version, action);
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

async function waitForAllSeatsClaimed(page) {
  await page.waitForFunction(() => {
    const seats = [...document.querySelectorAll(".room-seat small")];
    return seats.length === 6 && seats.every((seat) => !seat.textContent?.includes("Claim"));
  });
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

async function waitForRoomVersion(page, minimumVersion) {
  await page.waitForFunction(
    (version) => (window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.version ?? 0) >= version,
    minimumVersion,
  );
}

async function waitForRoomVersions(clients, minimumVersion) {
  await Promise.all(clients.map(({ page }) => waitForRoomVersion(page, minimumVersion)));
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
      assert.ok(player.hand.some((card) => card.name !== "Hidden card"), `${viewerId} should see their own hand`);
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

function bumpRoomVersion(room) {
  room.version += 1;
  room.updatedAt = Date.now();
  return room.version;
}

async function resolveSetupIfNeeded(roomId, clientsById) {
  const room = server.rooms.get(roomId);
  assert.ok(room, "Room should exist before setup resolution");
  if (room.game.pendingAction?.kind !== "throne-row") return;
  const nonOwnerPage = clientsById.get("p1").page;
  assert.equal(
    await nonOwnerPage.locator("[data-testid^='room-throne-card-']:not([disabled])").count(),
    0,
    "Non-owner room client should not get enabled Throne Row choices",
  );
  const shaddamPage = clientsById.get("p4").page;
  const roomChoice = shaddamPage.locator("[data-testid^='room-throne-card-']").first();
  if (await roomChoice.count()) {
    await roomChoice.click();
  } else {
    await shaddamPage.locator(".pending-panel .throne-choice button").first().click();
  }
  await shaddamPage.waitForFunction(() => !window.__DUNE_DEBUG__?.getGame?.()?.pendingAction);
}

async function assertConverged(roomId, clients) {
  const room = server.rooms.get(roomId);
  assert.ok(room, "Room should exist while checking six-browser convergence");
  const expected = {
    phase: room.game.phase,
    activeSeat: room.game.activeSeat,
    pendingKind: room.game.pendingAction?.kind,
  };
  await Promise.all(clients.map(({ page }) =>
    page.waitForFunction(
      ({ phase, activeSeat, pendingKind }) => {
        const game = window.__DUNE_DEBUG__?.getGame?.();
        return game?.phase === phase && game.activeSeat === activeSeat && game.pendingAction?.kind === pendingKind;
      },
      expected,
    )
  ));
  const games = await Promise.all(clients.map(({ page }) => currentGame(page)));
  const [{ phase, activeSeat, pendingAction }] = games;
  for (const game of games) {
    assert.equal(game.phase, phase, "All six pages should converge on phase");
    assert.equal(game.activeSeat, activeSeat, "All six pages should converge on active seat");
    assert.deepEqual(game.pendingAction, pendingAction, "All six pages should converge on pending action");
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
  await Promise.all(clients.map(({ page }) => waitForAllSeatsClaimed(page)));
  for (const { page, playerId } of clients) assertRoomPrivacy(await currentGame(page), playerId);
  const tokens = new Map();
  for (const { page, playerId } of clients) {
    const token = await roomToken(page, roomId);
    assert.ok(token, `${playerId} should persist a reconnect token in isolated browser storage`);
    tokens.set(playerId, token);
  }
  await capture(firstPage, "six-room-all-seats-claimed.png");

  const reconnectClient = clientsById.get("p3");
  await reconnectClient.page.reload({ waitUntil: "domcontentloaded" });
  await reconnectClient.page.waitForFunction(() =>
    document.querySelector("[data-testid='room-seat-p3']")?.classList.contains("selected")
  );
  await waitForVisiblePrivateHand(reconnectClient.page, "p3");
  assertRoomPrivacy(await currentGame(reconnectClient.page), "p3");
  await capture(reconnectClient.page, "six-room-p3-reconnected.png");

  await resolveSetupIfNeeded(roomId, clientsById);
  await assertConverged(roomId, clients);

  const gameAfterSetup = await currentGame(firstPage);
  const activePlayerId = gameAfterSetup.players[gameAfterSetup.activeSeat].id;
  const activeClient = clientsById.get(activePlayerId);
  assert.ok(activeClient, `Expected claimed active player ${activePlayerId}`);
  const activeToken = tokens.get(activePlayerId);
  const wrongPlayerId = seats.map(([playerId]) => playerId).find((playerId) => playerId !== activePlayerId);
  const wrongToken = tokens.get(wrongPlayerId);
  const activeSnapshot = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": activeToken },
  });
  assert.equal(activeSnapshot.response.status, 200, "Active API snapshot should load before permission checks");
  const noTokenAction = await roomAction(roomId, undefined, activeSnapshot.body.version, { kind: "reveal-turn" });
  assert.equal(noTokenAction.response.status, 401, "Room actions should reject unclaimed browsers");
  const wrongTokenAction = await roomAction(roomId, wrongToken, activeSnapshot.body.version, { kind: "reveal-turn" });
  assert.equal(wrongTokenAction.response.status, 403, "Room actions should reject non-active claimed seats");
  const staleAction = await roomAction(roomId, activeToken, activeSnapshot.body.version - 1, { kind: "reveal-turn" });
  assert.equal(staleAction.response.status, 409, "Room actions should reject stale base versions");

  for (const { page, playerId } of clients) {
    const revealDisabled = await page.getByTestId("reveal-turn").isDisabled();
    assert.equal(revealDisabled, playerId !== activePlayerId, `${playerId} reveal permission should match active seat`);
  }
  await activeClient.page.getByTestId("reveal-turn").click();
  await activeClient.page.waitForFunction(
    (playerId) => window.__DUNE_DEBUG__?.getGame?.()?.players.find((player) => player.id === playerId)?.revealed === true,
    activePlayerId,
  );
  await assertConverged(roomId, clients);
  await capture(activeClient.page, "six-room-active-revealed.png");
  await activeClient.page.getByTestId("end-reveal").click();
  await activeClient.page.waitForFunction(
    (playerId) => window.__DUNE_DEBUG__?.getGame?.()?.players[window.__DUNE_DEBUG__?.getGame?.()?.activeSeat]?.id !== playerId,
    activePlayerId,
  );
  await assertConverged(roomId, clients);
  await capture(activeClient.page, "six-room-active-ended.png");

  const pendingRoom = server.rooms.get(roomId);
  assert.ok(pendingRoom, "Room should exist before pending fixture");
  const pendingOwnerId = "p5";
  const pendingOwnerBefore = pendingRoom.game.players.find((player) => player.id === pendingOwnerId);
  assert.ok(pendingOwnerBefore, "Pending owner should exist");
  const pendingOwnerSpiceBefore = pendingOwnerBefore.resources.spice;
  pendingRoom.game = {
    ...pendingRoom.game,
    pendingAction: {
      kind: "maker-choice",
      ownerId: pendingOwnerId,
      spiceOwnerId: pendingOwnerId,
      spice: 2,
      sandworms: 1,
      canSummonSandworms: false,
      source: "Six Browser Maker",
      spaceId: "hagga-basin",
    },
    pendingQueue: [],
  };
  bumpRoomVersion(pendingRoom);
  await reloadRoomPages(clients);
  await assertConverged(roomId, clients);
  const pendingOwnerPage = clientsById.get(pendingOwnerId).page;
  await pendingOwnerPage.waitForFunction(
    (ownerId) => {
      const pending = window.__DUNE_DEBUG__?.getGame?.()?.pendingAction;
      return pending?.kind === "maker-choice" && pending.ownerId === ownerId;
    },
    pendingOwnerId,
  );
  assert.equal(
    await firstPage.locator(".pending-controls").count(),
    0,
    "Non-owner room client should not receive pending controls",
  );
  assert.equal(
    await pendingOwnerPage.getByRole("button", { name: /\+2 spice/ }).count(),
    1,
    "Pending owner room client should receive pending controls",
  );
  const pendingOwnerSnapshot = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": tokens.get(pendingOwnerId) },
  });
  assert.equal(pendingOwnerSnapshot.response.status, 200, "Pending owner should load a fresh room version");
  const pendingActionResult = await roomAction(roomId, tokens.get(pendingOwnerId), pendingOwnerSnapshot.body.version, {
    kind: "pending",
    command: { kind: "choose-maker-reward", choice: "spice" },
  });
  assert.equal(
    pendingActionResult.response.status,
    200,
    `Pending owner action should succeed: ${JSON.stringify(pendingActionResult.body)}`,
  );
  await assertConverged(roomId, clients);
  await pendingOwnerPage.waitForFunction(
    ({ ownerId, expectedSpice }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return !game?.pendingAction && owner?.resources.spice === expectedSpice;
    },
    { ownerId: pendingOwnerId, expectedSpice: pendingOwnerSpiceBefore + 2 },
  );
  await capture(pendingOwnerPage, "six-room-pending-resolved.png");

  const conflictVpOwnerId = "p2";
  const conflictVpOwnerPage = clientsById.get(conflictVpOwnerId).page;
  const conflictVpResourceRoom = server.rooms.get(roomId);
  assert.ok(conflictVpResourceRoom, "Room should exist before Conflict VP resource fixture");
  assert.ok(conflictVpResourceRoom.game.conflictDeck.length > 0, "Conflict VP resource fixture should have a next Conflict card");
  conflictVpResourceRoom.game = {
    ...conflictVpResourceRoom.game,
    phase: "playing",
    conflict: null,
    locationControl: {},
    pendingAction: {
      kind: "conflict-vp-conversion",
      ownerId: conflictVpOwnerId,
      source: "Six Browser Resource Conflict",
      remaining: 1,
      vp: 1,
      cost: { kind: "resource", resource: "spice", amount: 2 },
    },
    pendingQueue: [],
    players: conflictVpResourceRoom.game.players.map((player) =>
      player.id === conflictVpOwnerId
        ? { ...player, resources: { ...player.resources, spice: 3 } }
        : player
    ),
  };
  bumpRoomVersion(conflictVpResourceRoom);
  await reloadRoomPages(clients);
  await assertConverged(roomId, clients);
  const conflictVpResourceBefore = await currentGame(conflictVpOwnerPage);
  const conflictVpResourceOwnerBefore = conflictVpResourceBefore.players.find((player) => player.id === conflictVpOwnerId);
  assert.ok(conflictVpResourceOwnerBefore, "Conflict VP resource owner should exist");
  assert.equal(
    await firstPage.locator(".pending-controls").count(),
    0,
    "Non-owner room client should not receive Conflict VP resource controls",
  );
  const conflictVpResourceResult = await roomActionFor(roomId, tokens, conflictVpOwnerId, {
    kind: "pending",
    command: { kind: "pay-conflict-vp-reward" },
  });
  assert.equal(
    conflictVpResourceResult.response.status,
    200,
    `Conflict VP resource room action should succeed: ${JSON.stringify(conflictVpResourceResult.body)}`,
  );
  await conflictVpOwnerPage.waitForFunction(
    ({ ownerId, expectedSpice, expectedVp }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return game?.pendingAction?.kind !== "conflict-vp-conversion" &&
        owner?.resources.spice === expectedSpice &&
        owner?.vp === expectedVp;
    },
    {
      ownerId: conflictVpOwnerId,
      expectedSpice: conflictVpResourceOwnerBefore.resources.spice - 2,
      expectedVp: conflictVpResourceOwnerBefore.vp + 1,
    },
  );
  await assertConverged(roomId, clients);
  await capture(conflictVpOwnerPage, "six-room-conflict-vp-resource-paid.png");

  const conflictVpSpyRoom = server.rooms.get(roomId);
  assert.ok(conflictVpSpyRoom, "Room should exist before Conflict VP spy fixture");
  assert.ok(conflictVpSpyRoom.game.conflictDeck.length > 0, "Conflict VP spy fixture should have a next Conflict card");
  conflictVpSpyRoom.game = {
    ...conflictVpSpyRoom.game,
    phase: "playing",
    conflict: null,
    locationControl: {},
    spyPosts: { ...conflictVpSpyRoom.game.spyPosts, arrakeen: conflictVpOwnerId, carthag: conflictVpOwnerId },
    sharedSpyPosts: {},
    pendingAction: {
      kind: "conflict-vp-conversion",
      ownerId: conflictVpOwnerId,
      source: "Six Browser Spy Conflict",
      remaining: 1,
      vp: 1,
      cost: { kind: "recall-spies", count: 2, recalled: 0 },
    },
    pendingQueue: [],
    players: conflictVpSpyRoom.game.players.map((player) =>
      player.id === conflictVpOwnerId
        ? { ...player, spies: Math.max(0, player.spies - 2) }
        : player
    ),
  };
  bumpRoomVersion(conflictVpSpyRoom);
  await reloadRoomPages(clients);
  await assertConverged(roomId, clients);
  const conflictVpSpyBefore = await currentGame(conflictVpOwnerPage);
  const conflictVpSpyOwnerBefore = conflictVpSpyBefore.players.find((player) => player.id === conflictVpOwnerId);
  assert.ok(conflictVpSpyOwnerBefore, "Conflict VP spy owner should exist");
  assert.equal(
    await firstPage.locator(".pending-controls").count(),
    0,
    "Non-owner room client should not receive Conflict VP spy controls",
  );
  const conflictVpFirstSpyResult = await roomActionFor(roomId, tokens, conflictVpOwnerId, {
    kind: "pending",
    command: { kind: "recall-conflict-reward-spy", spaceId: "arrakeen" },
  });
  assert.equal(
    conflictVpFirstSpyResult.response.status,
    200,
    `Conflict VP first spy room action should succeed: ${JSON.stringify(conflictVpFirstSpyResult.body)}`,
  );
  await conflictVpOwnerPage.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame?.();
    return game?.pendingAction?.kind === "conflict-vp-conversion" &&
      game.pendingAction.cost.kind === "recall-spies" &&
      game.pendingAction.cost.recalled === 1 &&
      game.spyPosts.arrakeen === undefined;
  });
  await assertConverged(roomId, clients);
  await capture(conflictVpOwnerPage, "six-room-conflict-vp-spy-partial.png");
  const conflictVpSecondSpyResult = await roomActionFor(roomId, tokens, conflictVpOwnerId, {
    kind: "pending",
    command: { kind: "recall-conflict-reward-spy", spaceId: "carthag" },
  });
  assert.equal(
    conflictVpSecondSpyResult.response.status,
    200,
    `Conflict VP second spy room action should succeed: ${JSON.stringify(conflictVpSecondSpyResult.body)}`,
  );
  await conflictVpOwnerPage.waitForFunction(
    ({ ownerId, expectedSpies, expectedVp }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return game?.pendingAction?.kind !== "conflict-vp-conversion" &&
        game?.spyPosts.carthag === undefined &&
        owner?.spies === expectedSpies &&
        owner?.vp === expectedVp;
    },
    {
      ownerId: conflictVpOwnerId,
      expectedSpies: conflictVpSpyOwnerBefore.spies + 2,
      expectedVp: conflictVpSpyOwnerBefore.vp + 1,
    },
  );
  await assertConverged(roomId, clients);
  await capture(conflictVpOwnerPage, "six-room-conflict-vp-spy-paid.png");

  const endgameRoom = server.rooms.get(roomId);
  assert.ok(endgameRoom, "Room should exist before endgame fixture");
  endgameRoom.game = {
    ...endgameRoom.game,
    phase: "endgame",
    endgameReason: "Six-browser complete-flow fixture",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: endgameRoom.game.players.map((player) => ({
      ...player,
      intrigues: [],
      wonConflicts: [],
    })),
  };
  endgameRoom.endgameReady = {};
  const endgameFixtureVersion = bumpRoomVersion(endgameRoom);
  await reloadRoomPages(clients);
  await waitForRoomVersions(clients, endgameFixtureVersion);
  await capture(firstPage, "six-room-endgame-ready-start.png");

  for (let index = 0; index < clients.length; index += 1) {
    const { playerId } = clients[index];
    const endgameReadyResult = await roomActionFor(roomId, tokens, playerId, { kind: "finalize-endgame" });
    assert.equal(
      endgameReadyResult.response.status,
      200,
      `${playerId} should mark Endgame ready: ${JSON.stringify(endgameReadyResult.body)}`,
    );
    await assertConverged(roomId, clients);
  }
  await Promise.all(clients.map(({ page }) =>
    page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame?.()?.phase === "finished")
  ));
  await capture(firstPage, "six-room-finished.png");

  for (const context of contexts) await context.close();

  const consoleFailures = consoleMessages.filter((message) => message.type === "error" || message.type === "pageerror");
  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${JSON.stringify(consoleFailures, null, 2)}`);
  assert.deepEqual(requestFailures, [], `Browser request failures:\n${JSON.stringify(requestFailures, null, 2)}`);

  const summary = {
    roomId,
    claimedSeats: seats.map(([playerId, name]) => ({ playerId, name })),
    screenshots,
    consoleErrorCount: consoleFailures.length,
    requestFailureCount: requestFailures.length,
    url: server.resolvedUrls.local[0],
  };
  await writeFile(join(outDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
  await writeFile(join(outDir, "request-failures.json"), JSON.stringify(requestFailures, null, 2));
  await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("browser room complete-flow passed");
  console.log(`claimed seats: ${summary.claimedSeats.length}`);
  console.log(`screenshot count: ${summary.screenshots.length}`);
  console.log(`console error count: ${summary.consoleErrorCount}`);
  console.log(`request failure count: ${summary.requestFailureCount}`);
  console.log(`summary: ${join(outDir, "summary.json")}`);
} finally {
  await browser.close();
  await server.close();
}
