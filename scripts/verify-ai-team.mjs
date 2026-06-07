#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { createRoomServer } from "./room-server.mjs";
import {
  AI_HOW_TO_PLAY,
  assertAiSnapshotHasNoForeignPrivateCards,
  buildAiSeatSnapshot,
  chooseAiAction,
  createAiRuntime,
  createMockAiClient,
  createOpenAiResponseClient,
  discussRoundSummary,
  legalActionsForSeat,
  nextActionSeats,
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
    snapshot: { howToPlay: "legacy nested rules doc", legalActions },
    legalActions,
    maxToolRounds: 3,
  });
  assert.equal(retryChoice.actionId, "legal-b", "Responses retry should recover after an invalid action id");
  const initialActionPayload = JSON.parse(payloads[0].input[0].content);
  assert.equal(
    initialActionPayload.howToPlay,
    AI_HOW_TO_PLAY,
    "AI action payload should include the how-to-play rules document alongside the snapshot",
  );
  assert.equal(
    Object.hasOwn(initialActionPayload.snapshot, "howToPlay"),
    false,
    "AI action payload should not duplicate the how-to-play document inside the snapshot",
  );
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

async function verifyOpenAiResponseRetryPath() {
  let calls = 0;
  const client = createOpenAiResponseClient({
    apiKey: "verifier-key",
    model: "verifier-model",
    reasoningEffort: "none",
    maxRetries: 2,
    retryBaseMs: 0,
    sleepFn: async () => {},
    async fetchFn() {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 503,
          headers: { get: () => null },
          async text() {
            return "";
          },
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({ output: [{ type: "message", content: "ok" }] });
        },
      };
    },
  });
  const response = await client.responsesCreate({ input: "retry verifier" });
  assert.equal(calls, 2, "OpenAI Responses client should retry transient 5xx responses");
  assert.equal(response.output[0].content, "ok", "OpenAI Responses client should return the successful retry response");

  let bodyAbortCalls = 0;
  const bodyAbortClient = createOpenAiResponseClient({
    apiKey: "verifier-key",
    maxRetries: 1,
    retryBaseMs: 0,
    sleepFn: async () => {},
    async fetchFn() {
      bodyAbortCalls += 1;
      if (bodyAbortCalls === 1) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async text() {
            const error = new Error("body read aborted");
            error.name = "AbortError";
            throw error;
          },
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({ output: [{ type: "message", content: "body retry ok" }] });
        },
      };
    },
  });
  const bodyAbortResponse = await bodyAbortClient.responsesCreate({ input: "body abort retry verifier" });
  assert.equal(bodyAbortCalls, 2, "OpenAI Responses client should retry retryable body-read failures");
  assert.equal(
    bodyAbortResponse.output[0].content,
    "body retry ok",
    "OpenAI Responses client should not treat a failed body read as an empty successful response",
  );

  let badRequestCalls = 0;
  const noRetryClient = createOpenAiResponseClient({
    apiKey: "verifier-key",
    maxRetries: 2,
    retryBaseMs: 0,
    sleepFn: async () => {},
    async fetchFn() {
      badRequestCalls += 1;
      return {
        ok: false,
        status: 400,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({ error: "bad request" });
        },
      };
    },
  });
  await assert.rejects(
    () => noRetryClient.responsesCreate({ input: "do not retry" }),
    /OpenAI Responses API failed \(400\)/,
    "OpenAI Responses client should not retry non-transient request errors",
  );
  assert.equal(badRequestCalls, 1, "OpenAI Responses client should fail fast on non-retryable responses");
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
  assert.equal(
    Object.hasOwn(p1AiSnapshot, "howToPlay"),
    false,
    "AI seat snapshot should stay focused on game state; how-to-play is sent beside it",
  );
  assert.ok(
    AI_HOW_TO_PLAY.split(/\s+/).length < 1100,
    "AI how-to-play document should stay concise enough for every round prompt",
  );
  assert.ok(p1AiSnapshot.players.length === 6, "AI snapshot should include public status for all seats");
  const p1SnapshotPlayer = p1AiSnapshot.players.find((player) => player.id === p1AiSnapshot.viewerPlayerId);
  assert.deepEqual(
    {
      viewerRole: p1AiSnapshot.viewerRole,
      leader: p1SnapshotPlayer?.leader,
      team: p1SnapshotPlayer?.team,
      role: p1SnapshotPlayer?.role,
    },
    {
      viewerRole: "Commander",
      leader: "Muad'Dib",
      team: "muaddib",
      role: "Commander",
    },
    "AI snapshot should identify which character, team, and role the viewer is using",
  );
  assert.deepEqual(
    Object.fromEntries(p1AiSnapshot.players.map((player) => [player.id, { leader: player.leader, team: player.team, role: player.role }])),
    {
      p1: { leader: "Muad'Dib", team: "muaddib", role: "Commander" },
      p2: { leader: "Feyd-Rautha Harkonnen", team: "shaddam", role: "Ally" },
      p3: { leader: "Gurney Halleck", team: "muaddib", role: "Ally" },
      p4: { leader: "Shaddam Corrino IV", team: "shaddam", role: "Commander" },
      p5: { leader: "Lady Jessica", team: "muaddib", role: "Ally" },
      p6: { leader: "Princess Irulan", team: "shaddam", role: "Ally" },
    },
    "AI snapshot should expose every public seat's character, team, and role",
  );
  const mockPromptChoice = await chooseAiAction({
    aiClient: {
      async chooseAction({ howToPlay, snapshot, legalActions }) {
        assert.equal(howToPlay, AI_HOW_TO_PLAY, "Mock AI action hook should receive the same top-level how-to-play document as the real API path");
        assert.equal(
          Object.hasOwn(snapshot, "howToPlay"),
          false,
          "Mock AI action hook should not receive a duplicated how-to-play document inside the snapshot",
        );
        return { actionId: legalActions[0].id, reason: "Verifier prompt contract check." };
      },
    },
    snapshot: { ...p1AiSnapshot, howToPlay: "legacy nested rules doc" },
    legalActions: [{ id: "prompt-contract", label: "Prompt contract", playerId: "p1", action: { kind: "prompt-contract" } }],
  });
  assert.equal(mockPromptChoice.actionId, "prompt-contract", "Mock prompt contract check should return a legal action");
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
      async proposeSummary({ howToPlay, seatSnapshots }) {
        assert.equal(howToPlay, AI_HOW_TO_PLAY, "Round discussion proposal should include the how-to-play document");
        assert.equal(
          seatSnapshots.every((snapshot) => !Object.hasOwn(snapshot, "howToPlay")),
          true,
          "Public discussion snapshots should not duplicate the separately supplied how-to-play document",
        );
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
      async voteSummary({ howToPlay }) {
        assert.equal(howToPlay, AI_HOW_TO_PLAY, "Round discussion vote should include the how-to-play document");
        return { vote: "AGREE", reason: "Public-safe." };
      },
    },
    teamId: "muaddib",
    previousSummary: "",
    seatSnapshots: [
      { ...p1TopDeckAiSnapshot, howToPlay: "legacy nested rules doc" },
      { ...p1TopDeckAiSnapshot, howToPlay: "legacy nested rules doc" },
      { ...p1TopDeckAiSnapshot, howToPlay: "legacy nested rules doc" },
    ],
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

  const throneAcquireCard = runtime.data.imperiumDeck.find((card) => card.cost === 1);
  assert.ok(throneAcquireCard, "Expected a cost-1 Imperium card for acquire-card verification");
  room.game = {
    ...room.game,
    pendingAction: {
      kind: "acquire-card",
      ownerId: "p6",
      source: "Verifier Throne Acquire",
      minCost: 1,
      maxCost: 1,
      destination: "hand",
      optional: false,
    },
    pendingQueue: [],
    imperiumRow: room.game.imperiumRow.map((card, index) => ({ ...card, cost: Math.max(card.cost ?? 0, 2), id: `ai-acquire-row-${index}` })),
    reserveMarket: room.game.reserveMarket.map((card, index) => ({ ...card, cost: Math.max(card.cost ?? 0, 2), id: `ai-acquire-reserve-${index}` })),
    throneRow: [{ ...throneAcquireCard, id: "ai-acquire-throne-cost-one", cost: 1 }],
  };
  const p6AcquireActions = legalActionsForSeat(room, "p6", runtime);
  assert.deepEqual(
    p6AcquireActions[0]?.action,
    { kind: "pending", command: { kind: "acquire-pending-card", cardId: "ai-acquire-throne-cost-one" } },
    "AI should use shared acquire-card eligibility, including Shaddam Throne Row cards",
  );
  const acquiredFromThrone = runtime.actions.applyRoomAction(room.game, "p6", p6AcquireActions[0].action);
  assert.equal(acquiredFromThrone.pendingAction, undefined, "Generated Throne Row acquire-card action should resolve");
  assert.ok(
    acquiredFromThrone.players.find((player) => player.id === "p6")?.hand.some((card) => card.id === "ai-acquire-throne-cost-one"),
    "Generated Throne Row acquire-card action should acquire the card to the configured destination",
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
  const p1InitialPaymentActions = legalActionsForSeat(room, "p1", runtime);
  assert.equal(
    p1InitialPaymentActions.some((action) =>
      action.action.command?.kind === "adjust-team-resource-payment" &&
      action.action.command.delta < 0
    ),
    false,
    "AI should not expose negative team-resource adjustments while payment is underfunded",
  );
  assert.equal(
    p1InitialPaymentActions.some((action) =>
      action.action.command?.kind === "choose-team-resource-payment" ||
      action.action.command?.kind === "skip-team-resource-payment"
    ),
    false,
    "AI should keep team-resource payments moving toward funding while legal contributors remain",
  );
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
  assert.equal(
    p1PaymentActions.every((action) => action.action.command?.kind === "choose-team-resource-payment"),
    true,
    "AI should expose only the resolve action once team-resource payment is fully funded",
  );
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
  assert.equal(
    p2TradeActions.some((action) => action.action.command?.kind === "update-trade"),
    false,
    "AI should not expose trade updates once the current selection has a transferable good",
  );
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

  room.game = {
    ...room.game,
    pendingAction: {
      kind: "trade",
      actorId: "p2",
      partnerId: "p4",
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Verifier Partner Trade",
    },
    pendingQueue: [],
    players: room.game.players.map((player) => {
      if (player.id === "p2") {
        return { ...player, resources: { ...player.resources, spice: 0, water: 1, solari: 0 } };
      }
      if (player.id === "p4") {
        return { ...player, resources: { ...player.resources, spice: 1, water: 0, solari: 0 } };
      }
      return player;
    }),
  };
  const p2PartnerTransferActions = legalActionsForSeat(room, "p2", runtime);
  assert.equal(
    p2PartnerTransferActions.some((action) => action.action.command?.kind === "clear-pending-action"),
    false,
    "AI should not let the actor clear a trade while the partner can transfer the selected good",
  );
  const partnerTransferCandidates = nextActionSeats(room, runtime);
  assert.equal(
    partnerTransferCandidates[0]?.player.id,
    "p4",
    "AI should advance to the partner transfer instead of letting the earlier actor clear the trade",
  );
  assert.ok(
    partnerTransferCandidates[0]?.legalActions.some((action) =>
      action.action.command?.kind === "transfer-trade" &&
      action.action.command.fromId === "p4" &&
      action.action.command.toId === "p2"
    ),
    "AI should expose the partner's selected-good transfer before the trade can be cleared",
  );
  const p4TradeSpice = partnerTransferCandidates[0]?.legalActions.find((action) =>
    action.action.command?.kind === "transfer-trade" &&
    action.action.command.fromId === "p4" &&
    action.action.command.toId === "p2"
  );
  assert.ok(p4TradeSpice, "Verifier should find the partner's selected-good transfer");
  room.game = runtime.actions.applyRoomAction(room.game, "p4", p4TradeSpice.action);
  const p2AfterPartnerTransferActions = legalActionsForSeat(room, "p2", runtime);
  assert.ok(
    p2AfterPartnerTransferActions.some((action) => action.action.command?.kind === "clear-pending-action"),
    "AI should let the actor finish after the partner has made a one-way trade transfer",
  );
  assert.equal(
    p2AfterPartnerTransferActions.some((action) =>
      action.action.command?.kind === "transfer-trade" &&
      action.action.command.fromId === "p2" &&
      action.action.command.toId === "p4"
    ),
    false,
    "AI should not force the actor to send the received selected good back before finishing",
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
      source: "Verifier Trade Update",
    },
    pendingQueue: [],
    players: room.game.players.map((player) => {
      if (player.id === "p2" || player.id === "p4") {
        return { ...player, resources: { ...player.resources, spice: 0, water: 0, solari: 0 } };
      }
      if (player.id === "p6") {
        return { ...player, resources: { ...player.resources, water: 1 } };
      }
      return player;
    }),
  };
  const p2TradeUpdateActions = legalActionsForSeat(room, "p2", runtime);
  assert.ok(
    p2TradeUpdateActions.some((action) =>
      action.action.command?.kind === "update-trade" &&
      action.action.command.resource === "water" &&
      action.action.command.partnerId === "p6"
    ),
    "AI should still expose trade updates when the current selection cannot transfer but another teammate/resource can",
  );

  const feydSignet = runtime.data.allyStarterCards.find((card) => card.name === "Signet Ring");
  assert.ok(feydSignet, "Expected ally Signet Ring for Feyd training verification");
  room.game = {
    ...room.game,
    pendingAction: {
      kind: "feyd-training",
      ownerId: "p2",
      cardId: feydSignet.id,
      source: "Personal Training",
      nextPosition: 1,
      options: [
        { id: "pay-solari-trash", label: "Spend 1 Solari to trash a card", reward: "pay-solari-trash" },
        { id: "spy", label: "Place 1 Spy", reward: "spy" },
      ],
    },
    pendingQueue: [],
    players: room.game.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            feydTraining: 0,
            resources: { ...player.resources, solari: 0 },
            playArea: [feydSignet],
            hand: [],
            discard: [],
          }
        : player
    ),
  };
  const feydTrainingActions = legalActionsForSeat(room, "p2", runtime);
  assert.deepEqual(
    feydTrainingActions.map((action) => action.action.command),
    [{ kind: "choose-feyd-training", optionId: "spy" }],
    "AI should expose later legal Feyd training options when earlier options are not currently resolvable",
  );
  const feydTrainingAfter = runtime.actions.applyRoomAction(room.game, "p2", feydTrainingActions[0].action);
  assert.equal(
    feydTrainingAfter.players.find((player) => player.id === "p2")?.feydTraining,
    1,
    "Generated Feyd training option should advance the training track",
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
await verifyOpenAiResponseRetryPath();

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
