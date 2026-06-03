#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { createRoomServer } from "./room-server.mjs";

const outDir = "artifacts/qa/browser-room-marathon";
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
const actionLog = [];
const server = await createRoomServer({ port: 0, log: false, storageFile: join(outDir, "rooms.json") });
const browser = await chromium.launch({ headless: true });
const {
  canPay,
  effectiveCost,
  iconCanReach,
  canMoveCardToThroneRow,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  playerTroopSupply,
  trashableCardsForPending,
} = await server.ssrLoadModule("/src/game/state.ts");
const { boardSpaces } = await server.ssrLoadModule("/src/game/data.ts");

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

function roomRecord(roomId) {
  const room = server.rooms.get(roomId);
  assert.ok(room, `Expected room ${roomId}`);
  return room;
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
  if (response.status !== 200) {
    throw new Error(`${playerId} failed ${JSON.stringify(action)}: ${response.status} ${JSON.stringify(body)}`);
  }
  actionLog.push({
    playerId,
    action,
    phase: body.snapshot.game.phase,
    round: body.snapshot.game.round,
    version: body.snapshot.version,
  });
  return body.snapshot;
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
      assert.ok(player.hand.every((card) => card.name !== "Hidden card") || player.hand.length === 0, `${viewerId} own hand should be real or empty after reveal`);
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

async function assertConverged(roomId, clients) {
  const room = roomRecord(roomId);
  const expected = {
    phase: room.game.phase,
    round: room.game.round,
    activeSeat: room.game.activeSeat,
    pendingKind: room.game.pendingAction?.kind,
  };
  await Promise.all(clients.map(({ page }) =>
    page.waitForFunction(
      ({ phase, round, activeSeat, pendingKind }) => {
        const game = window.__DUNE_DEBUG__?.getGame?.();
        return game?.phase === phase &&
          game.round === round &&
          game.activeSeat === activeSeat &&
          game.pendingAction?.kind === pendingKind;
      },
      expected,
    )
  ));
}

function firstChoiceId(choices) {
  return choices?.[0]?.optionId ?? choices?.[0]?.id ?? choices?.[0]?.faction;
}

function firstFaction(choices) {
  return choices?.[0]?.faction ?? choices?.[0] ?? "emperor";
}

function pendingOwnerId(room, pending, command) {
  if (!pending) return undefined;
  if (command?.kind === "choose-board-influence") return command.ownerId;
  if (command?.kind === "choose-maker-reward") {
    return command.choice === "spice" ? pending.spiceOwnerId : pending.ownerId;
  }
  if (command?.kind === "choose-sietch-tabr") {
    return command.choice === "hooks" ? pending.ownerId : pending.waterOwnerId;
  }
  if (command?.kind === "adjust-team-resource-payment") return command.contributorId;
  if (command?.kind === "reinforce-one") return command.playerId;
  if (command?.kind === "lose-influence") return command.ownerId;
  if (pending.kind === "commander-resource-split") return pending.commanderId;
  if (pending.kind === "trade") return pending.actorId;
  if (pending.kind === "reinforce" || pending.kind === "conflict-tie") {
    return room.game.players.find((player) => player.team === pending.team)?.id;
  }
  if ("ownerId" in pending) return pending.ownerId;
  return undefined;
}

function commanderTargetsFor(player, players) {
  if (player.role !== "Commander") return undefined;
  const ally = players.find((candidate) => candidate.team === player.team && candidate.role === "Ally");
  return ally ? { [player.id]: ally.id } : undefined;
}

function legalAgentPlacement(game, player) {
  if (player.revealed || player.agentsReady <= 0 || game.agentTurnComplete) return undefined;
  const commanderTargets = commanderTargetsFor(player, game.players);
  for (const card of player.hand) {
    for (const space of boardSpaces) {
      if (game.spaces[space.id]) continue;
      if (!canPay(player, effectiveCost(space, game.players))) continue;
      if (!iconCanReach(card, space, player, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts)) {
        continue;
      }
      return {
        action: {
          kind: "place-agent",
          cardId: card.id,
          spaceId: space.id,
          ...(commanderTargets ? { commanderTargets } : {}),
        },
      };
    }
  }
  return undefined;
}

function pendingCommand(room, pending) {
  switch (pending.kind) {
    case "commander-resource-split":
      return { kind: "choose-commander-resource-split", optionIndex: 0 };
    case "reveal-adjust":
      return { kind: "finish-reveal-adjust" };
    case "paid-reward-choice":
      return { kind: "skip-paid-reward" };
    case "pending-action-choice":
      return { kind: "skip-pending-action-choice" };
    case "trash-card": {
      if (pending.optional) return { kind: "skip-trash" };
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const choice = owner ? trashableCardsForPending(owner, pending)[0] : undefined;
      return choice
        ? {
            kind: "trash-card",
            zone: choice.zone,
            cardId: choice.card.id,
            choiceIndex: 0,
          }
        : undefined;
    }
    case "trash-intrigue-for-reward":
      return { kind: "skip-trash-intrigue-for-reward" };
    case "trash-source-for-trade":
      return { kind: "skip-trash-source-for-trade" };
    case "discard-card-for-draw":
      return { kind: "skip-discard-card-for-draw" };
    case "discard-card-for-influence-and-draw":
      return { kind: "skip-discard-card-for-influence-and-draw" };
    case "discard-cards-for-reward":
      return { kind: "skip-discard-cards-for-reward" };
    case "discard-hand-card": {
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const card = owner?.hand[0];
      return card ? { kind: "choose-discard-hand-card", discardCardId: card.id } : undefined;
    }
    case "top-deck-selection":
      return { kind: "skip-top-deck-selection" };
    case "lose-influence":
      return { kind: "skip-influence-loss" };
    case "lose-influence-for-intrigues":
      return { kind: "skip-lose-influence-for-intrigues" };
    case "pay-resource-for-strength":
      return { kind: "skip-pay-resource-for-strength" };
    case "pay-resource-for-troops":
      return { kind: "skip-pay-resource-for-troops" };
    case "pay-resource-for-influence":
      return { kind: "skip-pay-resource-for-influence" };
    case "pay-resource-for-contracts":
      return { kind: "skip-pay-resource-for-contracts" };
    case "pay-resource-for-draw-cards":
      return { kind: "skip-pay-resource-for-draw-cards" };
    case "pay-resource-for-high-council-seat":
      return { kind: "skip-pay-resource-for-high-council-seat" };
    case "pay-resource-for-sandworms":
      return { kind: "skip-pay-resource-for-sandworms" };
    case "optional-space-payment":
      return { kind: "skip-optional-space-payment" };
    case "retreat-troops-for-strength":
      return { kind: "skip-retreat-troops-for-strength" };
    case "deploy-or-retreat-troops":
      return { kind: "skip-deploy-or-retreat-troops" };
    case "recall-spy":
      return { kind: "skip-recall" };
    case "deploy":
    case "spy":
      return { kind: "clear-pending-action" };
    case "control-defense":
      return { kind: "skip-control-defense" };
    case "maker-choice":
      return { kind: "choose-maker-reward", choice: "spice" };
    case "sietch-tabr":
      return { kind: "choose-sietch-tabr", choice: "shield-wall" };
    case "board-influence-choice": {
      const choice = pending.choices[0];
      return choice ? { kind: "choose-board-influence", ownerId: choice.ownerId, faction: choice.faction } : undefined;
    }
    case "conflict-influence":
      return { kind: "choose-conflict-influence", faction: firstFaction(pending.choices) };
    case "conflict-vp-conversion":
      return { kind: "skip-conflict-vp-reward" };
    case "conflict-tie":
      return { kind: "choose-conflict-tie-winner" };
    case "team-resource-payment":
      return { kind: "skip-team-resource-payment" };
    case "trade":
      return pending.actorGiven === 0 && pending.partnerGiven === 0
        ? { kind: "clear-pending-action" }
        : undefined;
    case "contract":
      if (pending.optional) return { kind: "clear-pending-action" };
      if (room.game.contractOffer[0]) return { kind: "take-contract", contractId: room.game.contractOffer[0].id };
      if (!pending.publicOnly) {
        const owner = room.game.players.find((player) => player.id === pending.ownerId);
        if (owner?.reservedContracts[0]) {
          return { kind: "take-contract", contractId: owner.reservedContracts[0].id };
        }
      }
      return { kind: "collect-contract-fallback" };
    case "acquire-card": {
      if (pending.optional) return { kind: "clear-pending-action" };
      const card = [...room.game.reserveMarket, ...room.game.imperiumRow].find((candidate) =>
        !pending.maxCost || (candidate.cost ?? 0) <= pending.maxCost
      );
      return card ? { kind: "acquire-pending-card", cardId: card.id } : undefined;
    }
    case "staban-unseen-network":
      return { kind: "choose-staban-unseen-network", choice: "skip" };
    case "amber-desert-scouts":
      return { kind: "choose-lady-amber-desert-scouts", choice: "skip" };
    case "repeat-board-space":
      return { kind: "choose-repeat-board-space", choice: "skip" };
    case "leader-transition":
      return { kind: "choose-leader-transition", choice: firstChoiceId(pending.choices) ?? "skip" };
    case "throne-row": {
      const card = room.game.imperiumRow.find(canMoveCardToThroneRow);
      return card ? { kind: "choose-throne-row-card", cardId: card.id } : { kind: "clear-pending-action" };
    }
    case "reinforce": {
      const player = room.game.players.find((candidate) =>
        candidate.team === pending.team &&
        candidate.role === "Ally" &&
        playerTroopSupply(candidate) > 0
      );
      return player ? { kind: "reinforce-one", playerId: player.id, destination: "garrison" } : { kind: "clear-pending-action" };
    }
    default:
      return undefined;
  }
}

async function resolvePending(roomId, tokens, clients, max = 100) {
  for (let index = 0; index < max; index += 1) {
    const room = roomRecord(roomId);
    const pending = room.game.pendingAction;
    if (!pending) return;
    const command = pendingCommand(room, pending);
    const ownerId = pendingOwnerId(room, pending, command);
    if (!ownerId || !command) {
      throw new Error(`Unsupported pending ${JSON.stringify(pending, null, 2)}`);
    }
    await roomAction(roomId, ownerId, tokens, { kind: "pending", command });
    await assertConverged(roomId, clients);
  }
  throw new Error("Pending action loop did not finish");
}

async function resolveSetup(roomId, tokens, clients) {
  const room = roomRecord(roomId);
  if (room.game.pendingAction?.kind !== "throne-row") return;
  const card = room.game.imperiumRow.find(canMoveCardToThroneRow);
  assert.ok(card, "Throne Row setup should expose a movable Imperium Row card");
  await roomAction(roomId, "p4", tokens, { kind: "choose-throne-row-card", cardId: card.id });
  await assertConverged(roomId, clients);
}

async function resolveEndgameChoices(roomId, tokens, clients) {
  let progressed = true;
  while (progressed) {
    progressed = false;
    const room = roomRecord(roomId);
    for (const choice of endgameBattleIconChoices(room.game)) {
      await roomAction(roomId, choice.playerId, tokens, {
        kind: "score-endgame-icon",
        playerId: choice.playerId,
        intrigueId: choice.intrigueId,
        conflictId: choice.conflictId,
      });
      await assertConverged(roomId, clients);
      progressed = true;
      break;
    }
    if (progressed) continue;
    for (const choice of endgameConditionalIntrigueChoices(room.game)) {
      await roomAction(roomId, choice.playerId, tokens, {
        kind: "score-endgame-conditional",
        playerId: choice.playerId,
        intrigueId: choice.intrigueId,
      });
      await assertConverged(roomId, clients);
      progressed = true;
      break;
    }
  }
}

async function driveMarathon(roomId, tokens, clients) {
  let capturedMidpoint = false;
  let capturedAgentPlacement = false;
  let agentPlacements = 0;
  for (let step = 1; step <= 700; step += 1) {
    await resolvePending(roomId, tokens, clients);
    const room = roomRecord(roomId);
    const game = room.game;
    if (!capturedMidpoint && game.round >= 5 && game.phase === "playing") {
      await capture(clients[0].page, "marathon-round-five.png");
      capturedMidpoint = true;
    }
    if (game.phase === "finished") return { steps: step, agentPlacements };
    if (game.phase === "playing") {
      const active = game.players[game.activeSeat];
      if (game.agentTurnComplete) {
        await roomAction(roomId, active.id, tokens, { kind: "end-agent" });
        await assertConverged(roomId, clients);
        continue;
      }
      const placement = legalAgentPlacement(game, active);
      if (placement) {
        await roomAction(roomId, active.id, tokens, placement.action);
        agentPlacements += 1;
        await assertConverged(roomId, clients);
        if (!capturedAgentPlacement) {
          await capture(clients[0].page, "marathon-first-agent-placement.png");
          capturedAgentPlacement = true;
        }
        continue;
      }
      if (!active.revealed) {
        await roomAction(roomId, active.id, tokens, { kind: "reveal-turn" });
        await assertConverged(roomId, clients);
        continue;
      }
      await roomAction(roomId, active.id, tokens, { kind: "end-reveal" });
      await assertConverged(roomId, clients);
      continue;
    }
    if (game.phase === "combat") {
      const active = game.players[game.activeSeat];
      await roomAction(roomId, active.id, tokens, { kind: "pass-combat" });
      await assertConverged(roomId, clients);
      continue;
    }
    if (game.phase === "endgame") {
      await resolveEndgameChoices(roomId, tokens, clients);
      for (const player of roomRecord(roomId).game.players) {
        if (roomRecord(roomId).game.phase === "finished") break;
        await roomAction(roomId, player.id, tokens, { kind: "finalize-endgame" });
        await assertConverged(roomId, clients);
      }
      continue;
    }
  }
  throw new Error("Room marathon did not finish within the step limit");
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

  const tokens = new Map();
  for (const { page, playerId } of clients) {
    const token = await roomToken(page, roomId);
    assert.ok(token, `${playerId} should store a reconnect token`);
    tokens.set(playerId, token);
  }
  await assertConverged(roomId, clients);
  for (const { page, playerId } of clients) assertRoomPrivacy(await currentGame(page), playerId);
  await capture(firstPage, "marathon-all-seats-claimed.png");

  await resolveSetup(roomId, tokens, clients);
  const { steps, agentPlacements } = await driveMarathon(roomId, tokens, clients);
  await assertConverged(roomId, clients);
  const finished = roomRecord(roomId).game;
  assert.equal(finished.phase, "finished", "Marathon should finish through normal room actions");
  assert.equal(finished.conflictDeck.length, 0, "Marathon should naturally empty the Conflict deck");
  assert.ok(finished.round >= 9, "Marathon should reach the late-game round count");
  assert.ok(agentPlacements >= 6, "Marathon should exercise online Agent placement for all six seats");
  for (const { page, playerId } of clients) assertRoomPrivacy(await currentGame(page), playerId);
  await capture(firstPage, "marathon-finished.png");

  for (const context of contexts) await context.close();

  const consoleFailures = consoleMessages.filter((message) => message.type === "error" || message.type === "pageerror");
  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${JSON.stringify(consoleFailures, null, 2)}`);
  assert.deepEqual(requestFailures, [], `Browser request failures:\n${JSON.stringify(requestFailures, null, 2)}`);

  const summary = {
    roomId,
    claimedSeats: seats.map(([playerId, name]) => ({ playerId, name })),
    finalPhase: finished.phase,
    finalRound: finished.round,
    finalConflictDeckCount: finished.conflictDeck.length,
    steps,
    agentPlacements,
    actionCount: actionLog.length,
    screenshots,
    consoleErrorCount: consoleFailures.length,
    requestFailureCount: requestFailures.length,
    url: server.resolvedUrls.local[0],
  };
  await writeFile(join(outDir, "actions.json"), JSON.stringify(actionLog, null, 2));
  await writeFile(join(outDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
  await writeFile(join(outDir, "request-failures.json"), JSON.stringify(requestFailures, null, 2));
  await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("browser room marathon passed");
  console.log(`claimed seats: ${summary.claimedSeats.length}`);
  console.log(`final round: ${summary.finalRound}`);
  console.log(`agent placements: ${summary.agentPlacements}`);
  console.log(`actions: ${summary.actionCount}`);
  console.log(`screenshot count: ${summary.screenshots.length}`);
  console.log(`console error count: ${summary.consoleErrorCount}`);
  console.log(`request failure count: ${summary.requestFailureCount}`);
  console.log(`summary: ${join(outDir, "summary.json")}`);
} finally {
  await browser.close();
  await server.close();
}
