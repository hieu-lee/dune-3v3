#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { createRoomServer } from "./room-server.mjs";
import {
  assertAiSnapshotHasNoForeignPrivateCards,
  buildAiSeatSnapshot,
  chooseAiAction,
  createAiRuntime,
  createMockAiClient,
  discussRoundSummary,
  legalActionsForSeat,
} from "./ai-team-driver.mjs";
import { runAiRoomMonitor } from "./ai-room-monitor.mjs";

const outDir = "artifacts/qa/verify-ai-team";
await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

async function jsonFetch(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => undefined);
  return { response, body };
}

async function claimSeat(baseUrl, roomId, playerId) {
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}/seats/${playerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-room-sync": "poll" },
    body: JSON.stringify({ name: `Verifier ${playerId}` }),
  });
  assert.equal(response.status, 200, `Verifier should claim ${playerId}`);
  return body.token;
}

async function seatSnapshot(baseUrl, roomId, token) {
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}`, {
    headers: { "x-room-token": token, "x-room-sync": "poll" },
  });
  assert.equal(response.status, 200, "Verifier should load seat snapshot");
  return body;
}

function assertNoForeignHands(aiSnapshot, fullGame) {
  assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, fullGame);
  for (const player of aiSnapshot.players) {
    if (player.id === aiSnapshot.viewerPlayerId) {
      assert.ok(Array.isArray(player.hand), "Viewer snapshot should include own hand");
      assert.ok(Array.isArray(player.intrigues), "Viewer snapshot should include own Intrigues");
    } else {
      assert.equal(Object.hasOwn(player, "hand"), false, "AI snapshot should omit other players' hand arrays");
      assert.equal(Object.hasOwn(player, "intrigues"), false, "AI snapshot should omit other players' Intrigue arrays");
    }
  }
}

function cardByTrait(cards, trait) {
  const card = cards.find((candidate) => candidate.traits?.includes(trait));
  assert.ok(card, `Expected card with trait ${trait}`);
  return { ...card, id: `ai-test-${trait.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` };
}

async function verifyToolCallRetryPath() {
  const legalActions = [
    { id: "legal-a", label: "Legal A", playerId: "p1", action: { kind: "end-reveal" } },
    { id: "legal-b", label: "Legal B", playerId: "p1", action: { kind: "pass-combat" } },
  ];
  const payloads = [];
  const retryClient = {
    model: "fake-responses",
    reasoningEffort: "none",
    async responsesCreate(payload) {
      payloads.push(payload);
      if (payloads.length === 1) {
        return {
          output: [{
            type: "function_call",
            name: "submit_action",
            call_id: "bad-call",
            arguments: JSON.stringify({ action_id: "missing", reason: "bad id" }),
          }],
        };
      }
      return {
        output: [{
          type: "function_call",
          name: "submit_action",
          call_id: "good-call",
          arguments: JSON.stringify({ action_id: "legal-b", reason: "valid retry" }),
        }],
      };
    },
  };
  const retryChoice = await chooseAiAction({
    aiClient: retryClient,
    snapshot: { legalActions },
    legalActions,
    maxToolRounds: 3,
  });
  assert.equal(retryChoice.actionId, "legal-b", "Responses retry should recover after an invalid action id");
  assert.ok(
    payloads[1].input.some((item) => item.type === "function_call_output" && item.call_id === "bad-call"),
    "Responses retry should return function_call_output for invalid tool calls",
  );

  const multiClient = {
    model: "fake-responses",
    reasoningEffort: "none",
    async responsesCreate() {
      return {
        output: [
          {
            type: "function_call",
            name: "submit_action",
            call_id: "multi-bad",
            arguments: JSON.stringify({ action_id: "missing", reason: "bad id" }),
          },
          {
            type: "function_call",
            name: "submit_action",
            call_id: "multi-good",
            arguments: JSON.stringify({ action_id: "legal-a", reason: "second call is valid" }),
          },
        ],
      };
    },
  };
  const multiChoice = await chooseAiAction({
    aiClient: multiClient,
    snapshot: { legalActions },
    legalActions,
    maxToolRounds: 1,
  });
  assert.equal(multiChoice.actionId, "legal-a", "Responses handling should inspect multiple function calls");
}

let server = await createRoomServer({ port: 0, log: false, storageFile: join(outDir, "rooms.json") });
try {
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
  const runtime = await createAiRuntime(server);
  const created = await jsonFetch(baseUrl, "/api/rooms", { method: "POST" });
  assert.equal(created.response.status, 201, "AI verifier room creation should succeed");
  const roomId = created.body.roomId;

  const tokens = new Map();
  for (const playerId of ["p1", "p2", "p3", "p4", "p5", "p6"]) {
    tokens.set(playerId, await claimSeat(baseUrl, roomId, playerId));
  }

  const room = server.rooms.get(roomId);
  assert.ok(room, "Verifier room should be stored");
  const p1RoomSnapshot = await seatSnapshot(baseUrl, roomId, tokens.get("p1"));
  const p1Legal = legalActionsForSeat(room, "p1", runtime);
  const p1AiSnapshot = buildAiSeatSnapshot({
    roomSnapshot: p1RoomSnapshot,
    teamId: "muaddib",
    previousSummary: "Initial verifier strategy.",
    legalActions: p1Legal,
  });
  assert.equal(p1AiSnapshot.viewerPlayerId, "p1");
  assert.equal(p1AiSnapshot.teamId, "muaddib");
  assert.ok(p1AiSnapshot.players.length === 6, "AI snapshot should include public status for all seats");
  assert.deepEqual(
    Object.keys(p1AiSnapshot.players[0].influence).sort(),
    ["bene", "emperor", "fremen", "fringeWorlds", "greatHouses", "spacing"].sort(),
    "AI snapshot should expose all real Influence tracks with game-state keys",
  );
  assertNoForeignHands(p1AiSnapshot, room.game);

  room.game = {
    ...room.game,
    pendingAction: {
      kind: "top-deck-selection",
      ownerId: "p1",
      source: "Verifier Top Deck",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      inspectedCards: runtime.data.imperiumDeck.slice(0, 3).map((card, index) => ({ ...card, id: `ai-top-deck-${index}` })),
    },
    pendingQueue: [],
  };
  const p1TopDeckRoomSnapshot = await seatSnapshot(baseUrl, roomId, tokens.get("p1"));
  const p1TopDeckAiSnapshot = buildAiSeatSnapshot({
    roomSnapshot: p1TopDeckRoomSnapshot,
    teamId: "muaddib",
    legalActions: legalActionsForSeat(room, "p1", runtime),
  });
  assert.equal(
    p1TopDeckAiSnapshot.pendingAction.inspectedCards.length,
    3,
    "AI top-deck owner snapshot should include inspected cards the room projection allows the owner to see",
  );
  assert.equal(
    p1TopDeckAiSnapshot.pendingAction.inspectedCards.every((card) => card.name && card.name !== "Hidden card"),
    true,
    "AI top-deck owner snapshot should include real inspected card names",
  );
  await discussRoundSummary({
    aiClient: {
      async proposeSummary({ seatSnapshots }) {
        const viewer = seatSnapshots[0].players.find((player) => player.id === seatSnapshots[0].viewerPlayerId);
        assert.equal(
          seatSnapshots[0].pendingAction.inspectedCards,
          undefined,
          "Shared discussion snapshots should omit private top-deck inspected cards",
        );
        assert.equal(
          Object.hasOwn(viewer, "hand"),
          false,
          "Shared discussion snapshots should omit private hand arrays",
        );
        return "Public-safe top-deck discussion.";
      },
      async voteSummary() {
        return { vote: "AGREE", reason: "Public-safe." };
      },
    },
    teamId: "muaddib",
    previousSummary: "",
    seatSnapshots: [p1TopDeckAiSnapshot, p1TopDeckAiSnapshot, p1TopDeckAiSnapshot],
    maxIterations: 1,
  });

  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const boardInfluenceOwnerId = "p2";
  const emperorCard = cardByTrait(runtime.data.imperiumDeck, "Faction: Emperor");
  const treacherousManeuver = runtime.data.imperiumDeck.find((card) => card.name === "Treacherous Maneuver");
  const economicSupport = runtime.data.boardSpaces.find((space) => space.id === "economic-support");
  assert.ok(treacherousManeuver, "Expected Treacherous Maneuver card data");
  assert.ok(economicSupport, "Expected Economic Support board space");
  const treacherousPlaced = turnActions.placeAgentAction(
    withActivePlayer(room.game, boardInfluenceOwnerId, () => ({
      agentsReady: 1,
      hand: [treacherousManeuver, emperorCard],
      playArea: [],
      discard: [],
      resources: { solari: 0, spice: 0, water: 0 },
      influence: { emperor: 0, spacing: 0, bene: 0, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    })),
    { commanderTargets: {}, selectedCard: treacherousManeuver, selectedSpace: economicSupport },
  );
  room.game = runtime.state.finishPendingAction(treacherousPlaced);
  const commanderPendingActions = legalActionsForSeat(room, boardInfluenceOwnerId, runtime);
  assert.equal(commanderPendingActions.length, 1, "Required-trash board Influence should be resolved by source owner");
  assert.deepEqual(
    commanderPendingActions[0].action.command,
    { kind: "choose-board-influence", ownerId: boardInfluenceOwnerId, faction: "greatHouses", trashCardId: emperorCard.id },
    "Required-trash board Influence should include the hand trash card id",
  );
  assert.deepEqual(
    runtime.actions.applyRoomAction(room.game, boardInfluenceOwnerId, commanderPendingActions[0].action).pendingAction,
    undefined,
    "Required-trash board Influence generated action should pass room action validation",
  );

  room.game = {
    ...room.game,
    pendingAction: {
      kind: "recall-spy",
      ownerId: boardInfluenceOwnerId,
      combatRecipientId: boardInfluenceOwnerId,
      remaining: 1,
      strength: 2,
      source: "Verifier Recall",
      optional: false,
    },
    pendingQueue: [],
    spyPosts: { "arrakeen": boardInfluenceOwnerId },
    sharedSpyPosts: {},
  };
  const requiredRecallActions = legalActionsForSeat(room, boardInfluenceOwnerId, runtime);
  assert.deepEqual(
    requiredRecallActions[0]?.action,
    { kind: "pending", command: { kind: "recall-spy", spaceId: "arrakeen" } },
    "Required spy recall should choose a legal recall space instead of skipping",
  );

  const threatenSpiceProduction = runtime.data.muadDibCommanderCards.find((card) => card.name === "Threaten Spice Production");
  assert.ok(threatenSpiceProduction, "Expected Threaten Spice Production for team-resource verification");
  room.game = {
    ...room.game,
    pendingAction: {
      kind: "team-resource-payment",
      ownerId: "p1",
      contributorIds: ["p1", "p3", "p5"],
      contributions: { p1: 0, p3: 0, p5: 0 },
      resource: "spice",
      cost: 7,
      vp: 1,
      optional: true,
      trashSource: true,
      cardId: threatenSpiceProduction.id,
      spaceId: "imperial-basin",
      source: "Threaten Spice Production",
    },
    pendingQueue: [],
    players: room.game.players.map((player) => {
      if (player.id === "p1") {
        return { ...player, resources: { ...player.resources, spice: 3 }, playArea: [threatenSpiceProduction] };
      }
      if (player.id === "p3" || player.id === "p5") {
        return { ...player, resources: { ...player.resources, spice: 2 } };
      }
      return player;
    }),
  };
  const p3PaymentActions = legalActionsForSeat(room, "p3", runtime);
  const p3Contribute = p3PaymentActions.find((action) =>
    action.action.command?.kind === "adjust-team-resource-payment" &&
    action.action.command.contributorId === "p3" &&
    action.action.command.delta === 1
  );
  assert.ok(p3Contribute, "AI should expose legal team-resource contribution adjustments for ally contributors");
  const paymentAfterP3 = runtime.actions.applyRoomAction(room.game, "p3", p3Contribute.action);
  assert.equal(
    paymentAfterP3.pendingAction?.kind === "team-resource-payment" ? paymentAfterP3.pendingAction.contributions.p3 : undefined,
    1,
    "Generated team-resource contribution should pass room validation",
  );
  room.game = {
    ...room.game,
    pendingAction: {
      ...room.game.pendingAction,
      contributions: { p1: 3, p3: 2, p5: 2 },
    },
  };
  const p1PaymentActions = legalActionsForSeat(room, "p1", runtime);
  const p1Pay = p1PaymentActions.find((action) => action.action.command?.kind === "choose-team-resource-payment");
  assert.ok(p1Pay, "AI should expose payable team-resource resolution for the commander");
  const paidTeamResource = runtime.actions.applyRoomAction(room.game, "p1", p1Pay.action);
  assert.equal(paidTeamResource.pendingAction, undefined, "Generated team-resource payment should resolve the pending action");
  assert.equal(
    paidTeamResource.players.find((player) => player.id === "p1")?.vp,
    (room.game.players.find((player) => player.id === "p1")?.vp ?? 0) + 1,
    "Generated team-resource payment should grant the configured VP",
  );

  room.game = {
    ...room.game,
    pendingAction: {
      kind: "trade",
      actorId: "p2",
      partnerId: "p4",
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Verifier Trade",
    },
    pendingQueue: [],
    players: room.game.players.map((player) =>
      player.id === "p2"
        ? { ...player, resources: { ...player.resources, spice: 1 } }
        : player
    ),
  };
  const p2TradeActions = legalActionsForSeat(room, "p2", runtime);
  const p2TradeSpice = p2TradeActions.find((action) =>
    action.action.command?.kind === "transfer-trade" &&
    action.action.command.fromId === "p2" &&
    action.action.command.toId === "p4"
  );
  assert.ok(p2TradeSpice, "AI should expose nonzero trade transfers for the actor");
  const tradeAfterP2 = runtime.actions.applyRoomAction(room.game, "p2", p2TradeSpice.action);
  assert.equal(
    tradeAfterP2.pendingAction?.kind === "trade" ? tradeAfterP2.pendingAction.actorGiven : undefined,
    1,
    "Generated trade transfer should pass room validation and mark actor contribution",
  );
  assert.equal(
    tradeAfterP2.players.find((player) => player.id === "p2")?.resources.spice,
    0,
    "Generated trade transfer should spend the actor's selected good",
  );

  const p3RoomSnapshot = await seatSnapshot(baseUrl, roomId, tokens.get("p3"));
  const p5RoomSnapshot = await seatSnapshot(baseUrl, roomId, tokens.get("p5"));
  const mockClient = createMockAiClient();
  const discussion = await discussRoundSummary({
    aiClient: mockClient,
    teamId: "muaddib",
    previousSummary: "",
    seatSnapshots: [
      p1AiSnapshot,
      buildAiSeatSnapshot({ roomSnapshot: p3RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p3", runtime) }),
      buildAiSeatSnapshot({ roomSnapshot: p5RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p5", runtime) }),
    ],
  });
  assert.equal(discussion.agreed, true, "Mock AI discussion should reach two AGREE votes");
  assert.ok(discussion.wordCount <= 1000, "AI summary should stay under 1000 words");
  const privateName = p1AiSnapshot.players.find((player) => player.id === "p1").hand[0]?.name;
  assert.ok(privateName, "Verifier needs a private card name for redaction coverage");
  const leakyDiscussion = await discussRoundSummary({
    aiClient: {
      async proposeSummary() {
        return `We should reveal ${privateName} later.`;
      },
      async voteSummary() {
        return { vote: "DISAGREE", reason: `Do not mention ${privateName}.` };
      },
    },
    teamId: "muaddib",
    previousSummary: "",
    seatSnapshots: [
      p1AiSnapshot,
      buildAiSeatSnapshot({ roomSnapshot: p3RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p3", runtime) }),
      buildAiSeatSnapshot({ roomSnapshot: p5RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p5", runtime) }),
    ],
    maxIterations: 1,
  });
  assert.equal(leakyDiscussion.summary.includes(privateName), false, "Shared S should redact exact private card names");
  assert.equal(
    JSON.stringify(leakyDiscussion.transcript).includes(privateName),
    false,
    "Shared discussion transcript should redact exact private card names",
  );
  const privateId = p1AiSnapshot.players.find((player) => player.id === "p1").hand[0]?.id;
  assert.ok(privateId, "Verifier needs a private card id for redaction coverage");
  const idLeakyDiscussion = await discussRoundSummary({
    aiClient: {
      async proposeSummary() {
        return `Track private id ${privateId}.`;
      },
      async voteSummary() {
        return { vote: "AGREE", reason: `Private id ${privateId} is useful.` };
      },
    },
    teamId: "muaddib",
    previousSummary: "",
    seatSnapshots: [
      p1AiSnapshot,
      buildAiSeatSnapshot({ roomSnapshot: p3RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p3", runtime) }),
      buildAiSeatSnapshot({ roomSnapshot: p5RoomSnapshot, teamId: "muaddib", legalActions: legalActionsForSeat(room, "p5", runtime) }),
    ],
    maxIterations: 1,
  });
  assert.equal(
    JSON.stringify(idLeakyDiscussion).includes(privateId),
    false,
    "Shared S and discussion transcript should redact exact private card ids",
  );
} finally {
  await server.close();
}

await verifyToolCallRetryPath();

const monitorResult = await runAiRoomMonitor({
  mock: true,
  maxSteps: 950,
  outDir: join(outDir, "monitor"),
  assertPrivacy: true,
});
assert.equal(monitorResult.summary.finalPhase, "finished", "Mock AI teams should finish a full game");
assert.ok(monitorResult.summary.finalRound >= 5, "Mock AI game should progress through multiple full rounds before finishing");
assert.ok(monitorResult.summary.actionCount > 100, "Mock AI game should exercise many real room actions");
assert.ok(monitorResult.summary.discussionCount >= 2, "Mock AI teams should discuss across rounds");

console.log("AI team verification passed");
console.log(`mock monitor actions: ${monitorResult.summary.actionCount}`);
console.log(`mock monitor final round: ${monitorResult.summary.finalRound}`);
console.log(`mock monitor scores: ${JSON.stringify(monitorResult.summary.finalTeamScores)}`);
