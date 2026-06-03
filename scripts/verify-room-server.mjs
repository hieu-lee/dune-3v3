import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRoomServer } from "./room-server.mjs";

const outDir = "artifacts/qa/verify-room-server";
const rootStorageDir = "qa-room-server-root-storage";
const publicStorageFile = join("public", "qa-room-server-public-storage.json");
await rm(outDir, { force: true, recursive: true });
await rm(rootStorageDir, { force: true, recursive: true });
await rm(publicStorageFile, { force: true });
await mkdir(outDir, { recursive: true });
const storageFile = join(outDir, "rooms.json");

let server = await createRoomServer({ port: 0, log: false, storageFile });
let baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
const {
  canMoveCardToThroneRow,
  canPay,
  effectiveCost,
  iconCanReach,
  startCombatPhase,
} = await server.ssrLoadModule("/src/game/state.ts");
const {
  boardSpaces,
  conflictCards,
  imperiumDeck,
  intrigueCards,
  muadDibCommanderCards,
  reserveMarket,
  standardContracts,
} = await server.ssrLoadModule("/src/game/data.ts");

async function jsonFetch(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => undefined);
  return { response, body };
}

async function assertConfiguredStorageIsPrivate(storagePath, publicPaths) {
  const privateServer = await createRoomServer({ port: 0, log: false, storageFile: storagePath });
  const privateBaseUrl = privateServer.resolvedUrls.local[0].replace(/\/$/, "");
  try {
    const createdResponse = await fetch(`${privateBaseUrl}/api/rooms`, { method: "POST" });
    assert.equal(createdResponse.status, 201, `Room creation should succeed for storage ${storagePath}`);
    const created = await createdResponse.json();
    const claimResponse = await fetch(`${privateBaseUrl}/api/rooms/${created.roomId}/seats/p1/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Storage Leak Guard" }),
    });
    assert.equal(claimResponse.status, 200, `Seat claim should persist storage ${storagePath}`);
    const claim = await claimResponse.json();
    for (const publicPath of publicPaths) {
      const storageResponse = await fetch(`${privateBaseUrl}${publicPath}`);
      const storageBody = await storageResponse.text();
      assert.equal(storageResponse.status, 404, `Configured room storage should not be web-accessible at ${publicPath}`);
      assert.equal(storageBody.includes(claim.token), false, `Blocked storage response should not expose reconnect token at ${publicPath}`);
    }
  } finally {
    await privateServer.close();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openRoomEventStream(roomId, token) {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/api/rooms/${roomId}/events?token=${encodeURIComponent(token)}`, {
    signal: controller.signal,
  });
  assert.equal(response.status, 200, "Room event stream should open");
  return { controller, response };
}

async function closeRoomEventStream(stream) {
  stream.controller.abort();
  await stream.response.body?.cancel().catch(() => undefined);
}

async function restartServer() {
  await server.close();
  server = await createRoomServer({ port: 0, log: false, storageFile });
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
}

function player(snapshot, playerId) {
  const found = snapshot.game.players.find((candidate) => candidate.id === playerId);
  assert.ok(found, `Expected player ${playerId}`);
  return found;
}

function assertHiddenHand(snapshot, playerId) {
  const owner = player(snapshot, playerId);
  assert.ok(owner.hand.length > 0, `${playerId} should preserve hidden hand count`);
  assert.ok(owner.hand.every((card) => card.name === "Hidden card"), `${playerId} hand should be hidden`);
}

function assertVisibleHand(snapshot, playerId) {
  const owner = player(snapshot, playerId);
  assert.ok(owner.hand.length > 0, `${playerId} should have a hand`);
  assert.ok(owner.hand.some((card) => card.name !== "Hidden card"), `${playerId} hand should be visible`);
}

function assertHiddenSharedDecks(snapshot) {
  assert.ok(snapshot.game.marketDeck.length > 0, "Imperium deck count should be preserved");
  assert.ok(snapshot.game.marketDeck.every((card) => card.name === "Hidden card"), "Imperium deck order should be hidden");
  assert.ok(snapshot.game.contractDeck.length > 0, "CHOAM contract deck count should be preserved");
  assert.ok(
    snapshot.game.contractDeck.every((card) => card.name === "Hidden CHOAM contract"),
    "CHOAM contract deck order should be hidden",
  );
  assert.ok(snapshot.game.intrigueDeck.length > 0, "Intrigue deck count should be preserved");
  assert.ok(snapshot.game.intrigueDeck.every((card) => card.name === "Hidden Intrigue"), "Intrigue deck order should be hidden");
  assert.ok(snapshot.game.conflictDeck.length > 0, "Conflict deck count should be preserved");
  assert.ok(snapshot.game.conflictDeck.every((card) => card.name === "Hidden Conflict"), "Conflict deck order should be hidden");
}

function assertHiddenDrawDeck(snapshot, playerId) {
  const owner = player(snapshot, playerId);
  assert.ok(owner.deck.length > 0, `${playerId} draw deck count should be preserved`);
  assert.ok(owner.deck.every((card) => card.name === "Hidden card"), `${playerId} draw deck order should be hidden`);
}

function assertHiddenObjectives(snapshot, playerId) {
  const owner = player(snapshot, playerId);
  assert.ok(
    owner.objectives.every((objective) => objective.name === "Hidden Objective" || objective.name === "Scored Objective"),
    `${playerId} objectives should be hidden from non-owners`,
  );
}

function assertVisibleObjectives(snapshot, playerId) {
  const owner = player(snapshot, playerId);
  if (owner.objectives.length === 0) return;
  assert.ok(
    owner.objectives.some((objective) => !objective.name.startsWith("Hidden") && objective.name !== "Scored Objective"),
    `${playerId} should see their own objective names`,
  );
}

async function roomAction(roomId, token, baseVersion, action) {
  return await jsonFetch(`/api/rooms/${roomId}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-room-token": token,
    },
    body: JSON.stringify({ baseVersion, action }),
  });
}

async function createRoomWithThronePending() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const created = await jsonFetch("/api/rooms", { method: "POST" });
    assert.equal(created.response.status, 201, "Action test room creation should succeed");
    if (created.body.game.pendingAction?.kind === "throne-row") return created.body;
  }
  assert.fail("Expected at least one created room to need Shaddam's setup Throne Row choice");
}

function firstLegalAgentMove(snapshot) {
  const game = snapshot.game;
  const activePlayer = game.players[game.activeSeat];
  for (const card of activePlayer.hand) {
    for (const space of boardSpaces) {
      if (game.spaces[space.id]) continue;
      if (!iconCanReach(card, space, activePlayer, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts)) continue;
      if (!canPay(activePlayer, effectiveCost(space, game.players))) continue;
      return { card, space };
    }
  }
  return undefined;
}

function dataCardBySourceId(cards, sourceId, label) {
  const card = cards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(card, `Expected ${label} source ${sourceId}`);
  return { ...card };
}

function conflictBySourceId(sourceId) {
  const conflict = dataCardBySourceId(conflictCards, sourceId, "Conflict");
  return { ...conflict, rewards: [...conflict.rewards] };
}

function intrigueBySourceId(sourceId) {
  const intrigue = dataCardBySourceId(intrigueCards, sourceId, "Intrigue");
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function contractByName(name) {
  const contract = standardContracts.find((candidate) => candidate.name === name);
  assert.ok(contract, `Expected CHOAM contract ${name}`);
  return { ...contract };
}

function combatRoomState(record, setupPlayers, firstSeat = 1) {
  const baseGame = record.game;
  return startCombatPhase({
    ...baseGame,
    phase: "playing",
    firstSeat,
    activeSeat: firstSeat,
    conflict: conflictBySourceId(453),
    conflictDeck: [conflictBySourceId(452)],
    conflictDiscard: [],
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: ["stale"],
    players: setupPlayers(baseGame.players.map((candidate) => ({
      ...candidate,
      agentsReady: 0,
      revealed: true,
      persuasion: 0,
      conflict: 0,
      deployedTroops: 0,
      hand: [],
      playArea: [],
      discard: [],
      deck: [],
      intrigues: [],
      objectives: [],
      wonConflicts: [],
    }))),
  });
}

async function resolveSetupThroneChoice(roomId, snapshot) {
  if (snapshot.game.pendingAction?.kind !== "throne-row") return { snapshot, tokens: {} };
  const p4Claim = await jsonFetch(`/api/rooms/${roomId}/seats/p4/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Shaddam" }),
  });
  assert.equal(p4Claim.response.status, 200, "Setup owner should be claimable");
  const throneCard = p4Claim.body.snapshot.game.imperiumRow.find(canMoveCardToThroneRow);
  assert.ok(throneCard, "Setup room should have a movable Throne Row card");
  const throneChoice = await roomAction(roomId, p4Claim.body.token, p4Claim.body.snapshot.version, {
    kind: "choose-throne-row-card",
    cardId: throneCard.id,
  });
  assert.equal(throneChoice.response.status, 200, "Setup owner should resolve setup Throne Row choice");
  return { snapshot: throneChoice.body.snapshot, tokens: { p4: p4Claim.body.token } };
}

try {
  const created = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(created.response.status, 201, "Room creation should succeed");
  const roomId = created.body.roomId;
  assert.match(roomId, /^[A-F0-9]{8}$/, "Room id should be a short share code");
  assert.equal(created.body.seats.length, 6, "Room snapshot should expose all six seats");
  assert.equal(created.body.viewerPlayerId, undefined, "Unclaimed room snapshot should not have a viewer seat");
  assertHiddenHand(created.body, "p1");
  assertHiddenHand(created.body, "p2");
  assertHiddenObjectives(created.body, "p2");
  assertHiddenSharedDecks(created.body);

  const p1Claim = await jsonFetch(`/api/rooms/${roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Alice" }),
  });
  assert.equal(p1Claim.response.status, 200, "Seat claim should succeed");
  assert.ok(p1Claim.body.token, "Seat claim should return a reconnect token");
  assert.equal(p1Claim.body.snapshot.viewerPlayerId, "p1");
  assert.equal(
    p1Claim.body.snapshot.seats.find((seat) => seat.playerId === "p1")?.claimedBy,
    "Alice",
    "Claimed seat should expose the player name",
  );
  assertVisibleHand(p1Claim.body.snapshot, "p1");
  assertHiddenDrawDeck(p1Claim.body.snapshot, "p1");
  assertHiddenHand(p1Claim.body.snapshot, "p2");
  assertHiddenObjectives(p1Claim.body.snapshot, "p2");
  assertHiddenSharedDecks(p1Claim.body.snapshot);
  const rawStorageResponse = await fetch(`${baseUrl}/artifacts/qa/verify-room-server/rooms.json`);
  const rawStorageBody = await rawStorageResponse.text();
  assert.equal(rawStorageResponse.status, 404, "Room storage artifacts should not be web-accessible");
  assert.equal(rawStorageBody.includes(p1Claim.body.token), false, "Blocked storage artifact responses should not expose reconnect tokens");
  const encodedRawStorageResponse = await fetch(`${baseUrl}/%61rtifacts/qa/verify-room-server/rooms.json`);
  const encodedRawStorageBody = await encodedRawStorageResponse.text();
  assert.equal(encodedRawStorageResponse.status, 404, "Room storage artifacts should not be web-accessible through percent-encoded paths");
  assert.equal(encodedRawStorageBody.includes(p1Claim.body.token), false, "Blocked percent-encoded storage responses should not expose reconnect tokens");
  const rawStorageFsResponse = await fetch(`${baseUrl}/@fs${resolve(storageFile)}`);
  const rawStorageFsBody = await rawStorageFsResponse.text();
  assert.equal(rawStorageFsResponse.status, 404, "Room storage artifacts should not be web-accessible through Vite /@fs");
  assert.equal(rawStorageFsBody.includes(p1Claim.body.token), false, "Blocked /@fs storage responses should not expose reconnect tokens");
  const rawStorageCaseFsResponse = await fetch(`${baseUrl}/@fs${resolve(storageFile).replace("/artifacts/", "/ARTIFACTS/")}`);
  const rawStorageCaseFsBody = await rawStorageCaseFsResponse.text();
  assert.equal(rawStorageCaseFsResponse.status, 404, "Room storage artifacts should not be web-accessible through case-varied Vite /@fs");
  assert.equal(rawStorageCaseFsBody.includes(p1Claim.body.token), false, "Blocked case-varied /@fs storage responses should not expose reconnect tokens");
  await assertConfiguredStorageIsPrivate(join(rootStorageDir, "rooms.json"), ["/qa-room-server-root-storage/rooms.json"]);
  await assertConfiguredStorageIsPrivate(publicStorageFile, [
    "/qa-room-server-public-storage.json",
    "/public/qa-room-server-public-storage.json",
  ]);

  const duplicateTokenClaim = await jsonFetch(`/api/rooms/${roomId}/seats/p3/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Alice Again", token: p1Claim.body.token }),
  });
  assert.equal(
    duplicateTokenClaim.response.status,
    409,
    "A reconnect token should not be reusable for a different seat",
  );

  const recovered = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": p1Claim.body.token },
  });
  assert.equal(recovered.response.status, 200, "Stored reconnect token should recover the room");
  assert.equal(recovered.body.viewerPlayerId, "p1");
  assertVisibleHand(recovered.body, "p1");
  assertHiddenDrawDeck(recovered.body, "p1");
  assertHiddenHand(recovered.body, "p2");
  assertHiddenSharedDecks(recovered.body);

  const blockedClaim = await jsonFetch(`/api/rooms/${roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Mallory", token: "wrong-token" }),
  });
  assert.equal(blockedClaim.response.status, 409, "Claimed seats should reject a different token");

  const p2Claim = await jsonFetch(`/api/rooms/${roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bob" }),
  });
  assert.equal(p2Claim.response.status, 200);
  assert.equal(p2Claim.body.snapshot.viewerPlayerId, "p2");
  assertHiddenHand(p2Claim.body.snapshot, "p1");
  assertVisibleHand(p2Claim.body.snapshot, "p2");
  assertHiddenDrawDeck(p2Claim.body.snapshot, "p2");
  assertVisibleObjectives(p2Claim.body.snapshot, "p2");
  assertHiddenSharedDecks(p2Claim.body.snapshot);

  const firstP1Stream = await openRoomEventStream(roomId, p1Claim.body.token);
  const secondP1Stream = await openRoomEventStream(roomId, p1Claim.body.token);
  const versionBeforeStaleStreamClose = server.rooms.get(roomId).version;
  await closeRoomEventStream(firstP1Stream);
  await sleep(100);
  assert.equal(
    server.rooms.get(roomId).seats.p1?.connected,
    true,
    "Closing a stale room event stream should not mark a replacement stream offline",
  );
  assert.equal(
    server.rooms.get(roomId).version,
    versionBeforeStaleStreamClose,
    "Closing a stale room event stream should not bump room version while a replacement stream remains",
  );
  await closeRoomEventStream(secondP1Stream);
  await sleep(100);

  await restartServer();

  assert.equal(server.rooms.has(roomId), true, "Persisted rooms should load after a server restart");
  assert.equal(
    server.rooms.get(roomId).seats.p1?.connected,
    false,
    "Loaded seats should start disconnected to avoid stale online indicators",
  );
  const persistedPublic = await jsonFetch(`/api/rooms/${roomId}`);
  assert.equal(persistedPublic.response.status, 200, "Persisted rooms should remain publicly joinable by code");
  assert.equal(persistedPublic.body.viewerPlayerId, undefined, "No-token persisted room view should stay unclaimed");
  assertHiddenHand(persistedPublic.body, "p1");
  assertHiddenHand(persistedPublic.body, "p2");
  assertHiddenSharedDecks(persistedPublic.body);
  assert.equal(
    JSON.stringify(persistedPublic.body).includes(p1Claim.body.token),
    false,
    "Public persisted snapshots should not expose p1 reconnect tokens",
  );
  assert.equal(
    JSON.stringify(persistedPublic.body).includes(p2Claim.body.token),
    false,
    "Public persisted snapshots should not expose p2 reconnect tokens",
  );
  const persistedAlice = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": p1Claim.body.token },
  });
  assert.equal(persistedAlice.response.status, 200, "Persisted reconnect token should recover a restarted room");
  assert.equal(persistedAlice.body.viewerPlayerId, "p1", "Restart recovery should restore the claimed viewer seat");
  assertVisibleHand(persistedAlice.body, "p1");
  assertHiddenDrawDeck(persistedAlice.body, "p1");
  assertHiddenHand(persistedAlice.body, "p2");
  assertHiddenObjectives(persistedAlice.body, "p2");
  assertHiddenSharedDecks(persistedAlice.body);
  assert.equal(
    JSON.stringify(persistedAlice.body).includes(p1Claim.body.token),
    false,
    "Private persisted snapshots should not echo the viewer reconnect token",
  );
  assert.equal(
    JSON.stringify(persistedAlice.body).includes(p2Claim.body.token),
    false,
    "Private persisted snapshots should not expose another seat's reconnect token",
  );
  assert.equal(
    persistedAlice.body.seats.find((seat) => seat.playerId === "p1")?.connected,
    true,
    "Recovered viewer seat should be marked connected after restart",
  );
  assert.equal(
    persistedAlice.body.seats.find((seat) => seat.playerId === "p2")?.claimedBy,
    "Bob",
    "Other claimed seats should remain claimed after restart",
  );
  assert.equal(
    persistedAlice.body.seats.find((seat) => seat.playerId === "p2")?.connected,
    false,
    "Other persisted seats should stay disconnected until they reconnect",
  );
  const persistedWrongClaim = await jsonFetch(`/api/rooms/${roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Mallory", token: "wrong-token-after-restart" }),
  });
  assert.equal(persistedWrongClaim.response.status, 409, "Persisted claimed seats should still reject a different token");
  const persistedWrongTokenReuse = await jsonFetch(`/api/rooms/${roomId}/seats/p3/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Alice Reuse", token: p1Claim.body.token }),
  });
  assert.equal(
    persistedWrongTokenReuse.response.status,
    409,
    "Persisted reconnect tokens should not become claimable by a different seat",
  );
  const persistedBob = await jsonFetch(`/api/rooms/${roomId}`, {
    headers: { "x-room-token": p2Claim.body.token },
  });
  assert.equal(persistedBob.response.status, 200, "A second persisted reconnect token should recover after restart");
  assert.equal(persistedBob.body.viewerPlayerId, "p2");
  assertHiddenHand(persistedBob.body, "p1");
  assertVisibleHand(persistedBob.body, "p2");
  assertHiddenDrawDeck(persistedBob.body, "p2");
  assertVisibleObjectives(persistedBob.body, "p2");
  assertHiddenSharedDecks(persistedBob.body);

  let persistedActionSnapshot = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(persistedActionSnapshot.response.status, 201, "Persisted action room creation should succeed");
  const persistedActionRoomId = persistedActionSnapshot.body.roomId;
  const persistedSetup = await resolveSetupThroneChoice(persistedActionRoomId, persistedActionSnapshot.body);
  persistedActionSnapshot = { body: persistedSetup.snapshot };
  const persistedActivePlayerId = persistedActionSnapshot.body.game.players[persistedActionSnapshot.body.game.activeSeat].id;
  const persistedActiveClaim = persistedSetup.tokens[persistedActivePlayerId]
    ? { body: { token: persistedSetup.tokens[persistedActivePlayerId], snapshot: persistedActionSnapshot.body }, response: { status: 200 } }
    : await jsonFetch(`/api/rooms/${persistedActionRoomId}/seats/${persistedActivePlayerId}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Persisted Active" }),
      });
  assert.equal(persistedActiveClaim.response.status, 200, "Persisted action active player should be claimable");
  const persistedReveal = await roomAction(
    persistedActionRoomId,
    persistedActiveClaim.body.token,
    persistedActiveClaim.body.snapshot.version,
    { kind: "reveal-turn" },
  );
  assert.equal(persistedReveal.response.status, 200, "Pre-restart room action should mutate persisted game state");
  await restartServer();
  const persistedRevealRecovered = await jsonFetch(`/api/rooms/${persistedActionRoomId}`, {
    headers: { "x-room-token": persistedActiveClaim.body.token },
  });
  assert.equal(persistedRevealRecovered.response.status, 200, "Persisted mutated game room should recover after restart");
  const persistedRevealedPlayer = player(persistedRevealRecovered.body, persistedActivePlayerId);
  assert.equal(persistedRevealedPlayer.revealed, true, "Pre-restart revealed state should survive restart");
  assert.equal(persistedRevealedPlayer.hand.length, 0, "Pre-restart hand movement should survive restart");
  assert.ok(persistedRevealedPlayer.playArea.length > 0, "Pre-restart play area should survive restart");
  const persistedEndReveal = await roomAction(
    persistedActionRoomId,
    persistedActiveClaim.body.token,
    persistedRevealRecovered.body.version,
    { kind: "end-reveal" },
  );
  assert.equal(persistedEndReveal.response.status, 200, "Recovered rooms should continue accepting legal actions");
  assert.notEqual(
    persistedEndReveal.body.snapshot.game.players[persistedEndReveal.body.snapshot.game.activeSeat].id,
    persistedActivePlayerId,
    "Recovered room action should advance turn state",
  );

  let actionSnapshot = await createRoomWithThronePending();
  const actionRoomId = actionSnapshot.roomId;
  const p4Claim = await jsonFetch(`/api/rooms/${actionRoomId}/seats/p4/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Shaddam" }),
  });
  assert.equal(p4Claim.response.status, 200, "Pending owner should be able to claim Shaddam");
  actionSnapshot = p4Claim.body.snapshot;
  const throneCard = actionSnapshot.game.imperiumRow.find(canMoveCardToThroneRow);
  assert.ok(throneCard, "Action test room should have a movable Throne Row card");

  const staleThroneChoice = await roomAction(actionRoomId, p4Claim.body.token, actionSnapshot.version - 1, {
    kind: "choose-throne-row-card",
    cardId: throneCard.id,
  });
  assert.equal(staleThroneChoice.response.status, 409, "Room actions should reject stale base versions");
  assert.equal(staleThroneChoice.body.snapshot.version, actionSnapshot.version, "Stale response should return a fresh snapshot");

  const malformedAction = await roomAction(actionRoomId, p4Claim.body.token, actionSnapshot.version, undefined);
  assert.equal(malformedAction.response.status, 400, "Malformed room actions should fail with a client error");

  const p1ActionClaim = await jsonFetch(`/api/rooms/${actionRoomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Not Shaddam" }),
  });
  assert.equal(p1ActionClaim.response.status, 200, "A second action-test seat should be claimable");
  const setupVersionAfterP1Claim = p1ActionClaim.body.snapshot.version;
  const wrongThroneChoice = await roomAction(actionRoomId, p1ActionClaim.body.token, setupVersionAfterP1Claim, {
    kind: "choose-throne-row-card",
    cardId: throneCard.id,
  });
  assert.equal(wrongThroneChoice.response.status, 403, "Only the pending owner should resolve setup choices");

  const throneChoice = await roomAction(actionRoomId, p4Claim.body.token, setupVersionAfterP1Claim, {
    kind: "choose-throne-row-card",
    cardId: throneCard.id,
  });
  assert.equal(throneChoice.response.status, 200, "Pending owner should resolve setup Throne Row choice");
  actionSnapshot = throneChoice.body.snapshot;
  assert.equal(actionSnapshot.game.pendingAction, undefined, "Setup action should clear after choosing a Throne Row card");
  assert.equal(
    actionSnapshot.game.throneRow.some((card) => card.id === throneCard.id),
    true,
    "Chosen setup card should move to the Throne Row",
  );

  const activePlayerId = actionSnapshot.game.players[actionSnapshot.game.activeSeat].id;
  const wrongTurnToken = activePlayerId === "p1" ? p4Claim.body.token : p1ActionClaim.body.token;
  const wrongReveal = await roomAction(actionRoomId, wrongTurnToken, actionSnapshot.version, { kind: "reveal-turn" });
  assert.equal(wrongReveal.response.status, 403, "Non-active seats should not perform active turn actions");

  let activeToken =
    activePlayerId === "p4"
      ? p4Claim.body.token
      : activePlayerId === "p1"
        ? p1ActionClaim.body.token
        : undefined;
  if (!activeToken) {
    const activeClaim = await jsonFetch(`/api/rooms/${actionRoomId}/seats/${activePlayerId}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Active Player" }),
    });
    assert.equal(activeClaim.response.status, 200, "Active player should be claimable for room actions");
    activeToken = activeClaim.body.token;
    actionSnapshot = activeClaim.body.snapshot;
  }

  const revealAction = await roomAction(actionRoomId, activeToken, actionSnapshot.version, { kind: "reveal-turn" });
  assert.equal(revealAction.response.status, 200, "Claimed active player should reveal through the room action endpoint");
  actionSnapshot = revealAction.body.snapshot;
  const revealedPlayer = player(actionSnapshot, activePlayerId);
  assert.equal(revealedPlayer.revealed, true, "Room reveal action should update authoritative game state");
  assert.equal(revealedPlayer.hand.length, 0, "Revealed player should move their hand to play area");

  const affordableReserveCard = actionSnapshot.game.reserveMarket.find((card) => (card.cost ?? 0) <= revealedPlayer.persuasion);
  assert.ok(affordableReserveCard, "Revealed active player should be able to afford a reserve card in the action test");
  const buyAction = await roomAction(actionRoomId, activeToken, actionSnapshot.version, {
    kind: "buy-card",
    cardId: affordableReserveCard.id,
  });
  assert.equal(buyAction.response.status, 200, "Claimed active player should buy a card through the room action endpoint");
  actionSnapshot = buyAction.body.snapshot;
  assert.ok(
    player(actionSnapshot, activePlayerId).discard.some((card) => card.name === affordableReserveCard.name),
    "Room buy-card action should add the acquired card to discard",
  );

  const endRevealAction = await roomAction(actionRoomId, activeToken, actionSnapshot.version, { kind: "end-reveal" });
  assert.equal(endRevealAction.response.status, 200, "Claimed active player should end reveal through the room action endpoint");
  actionSnapshot = endRevealAction.body.snapshot;
  assert.notEqual(
    actionSnapshot.game.players[actionSnapshot.game.activeSeat].id,
    activePlayerId,
    "Ending reveal should advance the active seat",
  );
  assertHiddenSharedDecks(actionSnapshot);

  const agentRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(agentRoom.response.status, 201, "Agent action test room creation should succeed");
  let agentSnapshot = agentRoom.body;
  const agentRoomId = agentSnapshot.roomId;
  const setupResult = await resolveSetupThroneChoice(agentRoomId, agentSnapshot);
  agentSnapshot = setupResult.snapshot;
  const agentPlayerId = agentSnapshot.game.players[agentSnapshot.game.activeSeat].id;
  const agentClaim = setupResult.tokens[agentPlayerId]
    ? { body: { token: setupResult.tokens[agentPlayerId], snapshot: agentSnapshot }, response: { status: 200 } }
    : await jsonFetch(`/api/rooms/${agentRoomId}/seats/${agentPlayerId}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Player" }),
      });
  assert.equal(agentClaim.response.status, 200, "Agent action active player should be claimable");
  agentSnapshot = agentClaim.body.snapshot;
  const legalMove = firstLegalAgentMove(agentSnapshot);
  assert.ok(legalMove, "Expected at least one legal Agent placement in the active starter hand");
  const placeAgent = await roomAction(agentRoomId, agentClaim.body.token, agentSnapshot.version, {
    kind: "place-agent",
    cardId: legalMove.card.id,
    spaceId: legalMove.space.id,
  });
  assert.equal(placeAgent.response.status, 200, "Claimed active player should place an Agent through the room action endpoint");
  const placedSnapshot = placeAgent.body.snapshot;
  assert.equal(placedSnapshot.game.agentTurnComplete, true, "Room Agent placement should complete the Agent action");
  assert.equal(
    Boolean(placedSnapshot.game.spaces[legalMove.space.id]),
    true,
    "Room Agent placement should update the authoritative board occupancy",
  );
  assertHiddenSharedDecks(placedSnapshot);

  const endAgentRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(endAgentRoom.response.status, 201, "End-Agent action test room creation should succeed");
  const endAgentRoomRecord = server.rooms.get(endAgentRoom.body.roomId);
  assert.ok(endAgentRoomRecord, "End-Agent action room should be stored in memory");
  endAgentRoomRecord.game = {
    ...endAgentRoomRecord.game,
    pendingAction: undefined,
    pendingQueue: [],
    agentTurnComplete: true,
  };
  const endAgentPlayerId = endAgentRoomRecord.game.players[endAgentRoomRecord.game.activeSeat].id;
  const endAgentClaim = await jsonFetch(`/api/rooms/${endAgentRoom.body.roomId}/seats/${endAgentPlayerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "End Agent Player" }),
  });
  assert.equal(endAgentClaim.response.status, 200, "End-Agent active player should be claimable");
  const endAgentAction = await roomAction(endAgentRoom.body.roomId, endAgentClaim.body.token, endAgentClaim.body.snapshot.version, {
    kind: "end-agent",
  });
  assert.equal(endAgentAction.response.status, 200, "Claimed active player should end an Agent turn through the room action endpoint");
  assert.notEqual(
    endAgentAction.body.snapshot.game.players[endAgentAction.body.snapshot.game.activeSeat].id,
    endAgentPlayerId,
    "Room end-agent action should advance to another seat",
  );

  const pendingRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(pendingRoom.response.status, 201, "Pending action test room creation should succeed");
  const pendingRoomRecord = server.rooms.get(pendingRoom.body.roomId);
  assert.ok(pendingRoomRecord, "Pending action test room should be stored in memory");
  const pendingOwnerId = "p2";
  pendingRoomRecord.game = {
    ...pendingRoomRecord.game,
    pendingAction: {
      kind: "maker-choice",
      ownerId: pendingOwnerId,
      spiceOwnerId: pendingOwnerId,
      spice: 2,
      sandworms: 1,
      canSummonSandworms: false,
      source: "Verifier Maker",
      spaceId: "hagga-basin",
    },
    pendingQueue: [],
  };
  const pendingOwnerBefore = pendingRoomRecord.game.players.find((candidate) => candidate.id === pendingOwnerId);
  assert.ok(pendingOwnerBefore, "Pending owner should exist");
  const pendingOwnerClaim = await jsonFetch(`/api/rooms/${pendingRoom.body.roomId}/seats/${pendingOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Pending Owner" }),
  });
  assert.equal(pendingOwnerClaim.response.status, 200, "Pending owner should be claimable");
  const pendingWrongClaim = await jsonFetch(`/api/rooms/${pendingRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Wrong Pending Player" }),
  });
  assert.equal(pendingWrongClaim.response.status, 200, "Wrong pending player should be claimable");
  const wrongPendingAction = await roomAction(pendingRoom.body.roomId, pendingWrongClaim.body.token, pendingWrongClaim.body.snapshot.version, {
    kind: "pending",
    command: { kind: "choose-maker-reward", choice: "spice" },
  });
  assert.equal(wrongPendingAction.response.status, 403, "Only the pending owner should resolve pending room choices");
  const illegalMakerChoiceVersion = server.rooms.get(pendingRoom.body.roomId).version;
  const illegalMakerChoice = await roomAction(pendingRoom.body.roomId, pendingOwnerClaim.body.token, pendingWrongClaim.body.snapshot.version, {
    kind: "pending",
    command: { kind: "choose-maker-reward", choice: "sandworms" },
  });
  assert.equal(illegalMakerChoice.response.status, 409, "Room maker choice should reject unavailable sandworm rewards");
  assert.equal(
    server.rooms.get(pendingRoom.body.roomId).version,
    illegalMakerChoiceVersion,
    "Rejected room maker choice should not advance the room version",
  );
  const makerPendingAction = await roomAction(pendingRoom.body.roomId, pendingOwnerClaim.body.token, pendingWrongClaim.body.snapshot.version, {
    kind: "pending",
    command: { kind: "choose-maker-reward", choice: "spice" },
  });
  assert.equal(makerPendingAction.response.status, 200, "Pending owner should resolve maker choice through room action endpoint");
  const pendingOwnerAfter = player(makerPendingAction.body.snapshot, pendingOwnerId);
  assert.equal(
    pendingOwnerAfter.resources.spice,
    pendingOwnerBefore.resources.spice + 2,
    "Room pending maker choice should apply rewards on authoritative state",
  );
  assert.equal(makerPendingAction.body.snapshot.game.pendingAction, undefined, "Room pending maker choice should advance pending action");

  const splitMakerRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(splitMakerRoom.response.status, 201, "Split Maker room creation should succeed");
  const splitMakerRecord = server.rooms.get(splitMakerRoom.body.roomId);
  assert.ok(splitMakerRecord, "Split Maker room should be stored in memory");
  const splitMakerOwnerId = "p3";
  const splitMakerSpiceOwnerId = "p1";
  const splitMakerSpiceOwnerBefore = splitMakerRecord.game.players.find((candidate) => candidate.id === splitMakerSpiceOwnerId);
  assert.ok(splitMakerSpiceOwnerBefore, "Split Maker spice owner should exist");
  splitMakerRecord.game = {
    ...splitMakerRecord.game,
    pendingAction: {
      kind: "maker-choice",
      ownerId: splitMakerOwnerId,
      spiceOwnerId: splitMakerSpiceOwnerId,
      spice: 2,
      sandworms: 1,
      canSummonSandworms: true,
      source: "Verifier Split Maker",
      spaceId: "hagga-basin",
    },
    pendingQueue: [],
  };
  const splitMakerOwnerClaim = await jsonFetch(`/api/rooms/${splitMakerRoom.body.roomId}/seats/${splitMakerOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Split Maker Owner" }),
  });
  assert.equal(splitMakerOwnerClaim.response.status, 200, "Split Maker owner should be claimable");
  const splitMakerSpiceOwnerClaim = await jsonFetch(`/api/rooms/${splitMakerRoom.body.roomId}/seats/${splitMakerSpiceOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Split Maker Spice Owner" }),
  });
  assert.equal(splitMakerSpiceOwnerClaim.response.status, 200, "Split Maker spice owner should be claimable");
  const forgedSplitMakerSandwormsVersion = server.rooms.get(splitMakerRoom.body.roomId).version;
  const forgedSplitMakerSandworms = await roomAction(
    splitMakerRoom.body.roomId,
    splitMakerSpiceOwnerClaim.body.token,
    forgedSplitMakerSandwormsVersion,
    { kind: "pending", command: { kind: "choose-maker-reward", choice: "sandworms" } },
  );
  assert.equal(forgedSplitMakerSandworms.response.status, 403, "Room Maker spice owners should not choose the sandworm owner's reward");
  assert.equal(
    server.rooms.get(splitMakerRoom.body.roomId).version,
    forgedSplitMakerSandwormsVersion,
    "Rejected split Maker sandworm choice should not advance the room version",
  );
  const forgedSplitMakerSpice = await roomAction(
    splitMakerRoom.body.roomId,
    splitMakerOwnerClaim.body.token,
    forgedSplitMakerSandwormsVersion,
    { kind: "pending", command: { kind: "choose-maker-reward", choice: "spice" } },
  );
  assert.equal(forgedSplitMakerSpice.response.status, 403, "Room Maker sandworm owners should not choose the spice owner's reward");
  assert.equal(
    server.rooms.get(splitMakerRoom.body.roomId).version,
    forgedSplitMakerSandwormsVersion,
    "Rejected split Maker spice choice should not advance the room version",
  );
  const splitMakerSpice = await roomAction(
    splitMakerRoom.body.roomId,
    splitMakerSpiceOwnerClaim.body.token,
    forgedSplitMakerSandwormsVersion,
    { kind: "pending", command: { kind: "choose-maker-reward", choice: "spice" } },
  );
  assert.equal(splitMakerSpice.response.status, 200, "Room Maker spice owners should choose their own spice reward");
  assert.equal(
    player(splitMakerSpice.body.snapshot, splitMakerSpiceOwnerId).resources.spice,
    splitMakerSpiceOwnerBefore.resources.spice + 2,
    "Room split Maker spice choice should reward only the spice owner",
  );

  const splitSietchRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(splitSietchRoom.response.status, 201, "Split Sietch Tabr room creation should succeed");
  const splitSietchRecord = server.rooms.get(splitSietchRoom.body.roomId);
  assert.ok(splitSietchRecord, "Split Sietch Tabr room should be stored in memory");
  const splitSietchOwnerId = "p3";
  const splitSietchWaterOwnerId = "p1";
  const splitSietchWaterOwnerBefore = splitSietchRecord.game.players.find((candidate) => candidate.id === splitSietchWaterOwnerId);
  assert.ok(splitSietchWaterOwnerBefore, "Split Sietch Tabr water owner should exist");
  splitSietchRecord.game = {
    ...splitSietchRecord.game,
    shieldWall: true,
    pendingAction: {
      kind: "sietch-tabr",
      ownerId: splitSietchOwnerId,
      waterOwnerId: splitSietchWaterOwnerId,
      canTakeMakerHooks: true,
      canRemoveShieldWall: true,
      source: "Verifier Split Sietch Tabr",
      spaceId: "sietch-tabr",
      conflictBlocked: true,
    },
    pendingQueue: [],
  };
  const splitSietchOwnerClaim = await jsonFetch(`/api/rooms/${splitSietchRoom.body.roomId}/seats/${splitSietchOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Split Sietch Owner" }),
  });
  assert.equal(splitSietchOwnerClaim.response.status, 200, "Split Sietch owner should be claimable");
  const splitSietchWaterOwnerClaim = await jsonFetch(`/api/rooms/${splitSietchRoom.body.roomId}/seats/${splitSietchWaterOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Split Sietch Water Owner" }),
  });
  assert.equal(splitSietchWaterOwnerClaim.response.status, 200, "Split Sietch water owner should be claimable");
  const forgedSplitSietchHooksVersion = server.rooms.get(splitSietchRoom.body.roomId).version;
  const forgedSplitSietchHooks = await roomAction(
    splitSietchRoom.body.roomId,
    splitSietchWaterOwnerClaim.body.token,
    forgedSplitSietchHooksVersion,
    { kind: "pending", command: { kind: "choose-sietch-tabr", choice: "hooks" } },
  );
  assert.equal(forgedSplitSietchHooks.response.status, 403, "Room Sietch water owners should not choose the hooks owner's reward");
  assert.equal(
    server.rooms.get(splitSietchRoom.body.roomId).version,
    forgedSplitSietchHooksVersion,
    "Rejected split Sietch hooks choice should not advance the room version",
  );
  const forgedSplitSietchShieldWall = await roomAction(
    splitSietchRoom.body.roomId,
    splitSietchOwnerClaim.body.token,
    forgedSplitSietchHooksVersion,
    { kind: "pending", command: { kind: "choose-sietch-tabr", choice: "shield-wall" } },
  );
  assert.equal(forgedSplitSietchShieldWall.response.status, 403, "Room Sietch hooks owners should not choose the water owner's reward");
  assert.equal(
    server.rooms.get(splitSietchRoom.body.roomId).version,
    forgedSplitSietchHooksVersion,
    "Rejected split Sietch shield-wall choice should not advance the room version",
  );
  const splitSietchShieldWall = await roomAction(
    splitSietchRoom.body.roomId,
    splitSietchWaterOwnerClaim.body.token,
    forgedSplitSietchHooksVersion,
    { kind: "pending", command: { kind: "choose-sietch-tabr", choice: "shield-wall" } },
  );
  assert.equal(splitSietchShieldWall.response.status, 200, "Room Sietch water owners should choose their own water reward");
  assert.equal(
    player(splitSietchShieldWall.body.snapshot, splitSietchWaterOwnerId).resources.water,
    splitSietchWaterOwnerBefore.resources.water + 1,
    "Room split Sietch shield-wall choice should reward the water owner",
  );
  assert.equal(splitSietchShieldWall.body.snapshot.game.shieldWall, false, "Room split Sietch shield-wall choice should remove the Shield Wall");

  const influenceLossRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(influenceLossRoom.response.status, 201, "Influence-loss authorization room creation should succeed");
  const influenceLossRecord = server.rooms.get(influenceLossRoom.body.roomId);
  assert.ok(influenceLossRecord, "Influence-loss authorization room should be stored in memory");
  const influenceOwnerId = "p2";
  const influenceAlternateId = "p4";
  influenceLossRecord.game = {
    ...influenceLossRecord.game,
    pendingAction: {
      kind: "lose-influence",
      ownerId: influenceOwnerId,
      alternateOwnerIds: [influenceAlternateId],
      combatRecipientId: influenceOwnerId,
      strength: 2,
      source: "Verifier Influence Loss",
      optional: true,
    },
    pendingQueue: [],
    players: influenceLossRecord.game.players.map((candidate) => {
      if (candidate.id === influenceOwnerId || candidate.id === influenceAlternateId) {
        return { ...candidate, influence: { ...candidate.influence, emperor: 1 }, conflict: 0 };
      }
      return candidate;
    }),
  };
  const influenceOwnerClaim = await jsonFetch(`/api/rooms/${influenceLossRoom.body.roomId}/seats/${influenceOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Influence Owner" }),
  });
  assert.equal(influenceOwnerClaim.response.status, 200, "Influence-loss owner should be claimable");
  const influenceAlternateClaim = await jsonFetch(`/api/rooms/${influenceLossRoom.body.roomId}/seats/${influenceAlternateId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Influence Alternate" }),
  });
  assert.equal(influenceAlternateClaim.response.status, 200, "Influence-loss alternate should be claimable");
  const forgedInfluenceLoss = await roomAction(
    influenceLossRoom.body.roomId,
    influenceAlternateClaim.body.token,
    influenceAlternateClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "lose-influence", ownerId: influenceOwnerId, faction: "emperor" },
    },
  );
  assert.equal(forgedInfluenceLoss.response.status, 403, "Room Influence-loss alternates should not lose Influence from another seat");
  assert.equal(
    server.rooms.get(influenceLossRoom.body.roomId).game.players.find((candidate) => candidate.id === influenceOwnerId)?.influence.emperor,
    1,
    "Forged room Influence loss should not reduce the target owner's Influence",
  );
  const forgedInfluenceSkip = await roomAction(
    influenceLossRoom.body.roomId,
    influenceAlternateClaim.body.token,
    influenceAlternateClaim.body.snapshot.version,
    { kind: "pending", command: { kind: "skip-influence-loss" } },
  );
  assert.equal(forgedInfluenceSkip.response.status, 403, "Room Influence-loss alternates should not decline the owner's optional loss");
  const alternateInfluenceLoss = await roomAction(
    influenceLossRoom.body.roomId,
    influenceAlternateClaim.body.token,
    influenceAlternateClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "lose-influence", ownerId: influenceAlternateId, faction: "emperor" },
    },
  );
  assert.equal(alternateInfluenceLoss.response.status, 200, "Room Influence-loss alternates should be able to pay from their own seat");
  assert.equal(
    player(alternateInfluenceLoss.body.snapshot, influenceAlternateId).influence.emperor,
    0,
    "Room Influence-loss alternate payment should reduce only the claimed alternate's Influence",
  );

  const teamPaymentRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(teamPaymentRoom.response.status, 201, "Team-resource payment authorization room creation should succeed");
  const teamPaymentRecord = server.rooms.get(teamPaymentRoom.body.roomId);
  assert.ok(teamPaymentRecord, "Team-resource payment authorization room should be stored in memory");
  const threatenSpiceProduction = muadDibCommanderCards.find((card) => card.name === "Threaten Spice Production");
  assert.ok(threatenSpiceProduction, "Threaten Spice Production should be available for team-resource payment fixtures");
  const teamPaymentOwnerId = "p1";
  const teamPaymentAllyAId = "p3";
  const teamPaymentAllyBId = "p5";
  const teamPaymentOwnerInitialVp = teamPaymentRecord.game.players.find((candidate) => candidate.id === teamPaymentOwnerId)?.vp ?? 0;
  teamPaymentRecord.game = {
    ...teamPaymentRecord.game,
    pendingAction: {
      kind: "team-resource-payment",
      ownerId: teamPaymentOwnerId,
      contributorIds: [teamPaymentOwnerId, teamPaymentAllyAId, teamPaymentAllyBId],
      contributions: {
        [teamPaymentOwnerId]: 0,
        [teamPaymentAllyAId]: 0,
        [teamPaymentAllyBId]: 0,
      },
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
    players: teamPaymentRecord.game.players.map((candidate) => {
      if (candidate.id === teamPaymentOwnerId) {
        return { ...candidate, resources: { ...candidate.resources, spice: 3 }, playArea: [threatenSpiceProduction] };
      }
      if (candidate.id === teamPaymentAllyAId || candidate.id === teamPaymentAllyBId) {
        return { ...candidate, resources: { ...candidate.resources, spice: 2 } };
      }
      return candidate;
    }),
  };
  const teamPaymentAllyAClaim = await jsonFetch(`/api/rooms/${teamPaymentRoom.body.roomId}/seats/${teamPaymentAllyAId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Team Payment Ally A" }),
  });
  assert.equal(teamPaymentAllyAClaim.response.status, 200, "Team-resource payment contributor should be claimable");
  const teamPaymentOwnerClaim = await jsonFetch(`/api/rooms/${teamPaymentRoom.body.roomId}/seats/${teamPaymentOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Team Payment Owner" }),
  });
  assert.equal(teamPaymentOwnerClaim.response.status, 200, "Team-resource payment owner should be claimable");
  const forgedContribution = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentAllyAClaim.body.token,
    teamPaymentOwnerClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "adjust-team-resource-payment", contributorId: teamPaymentAllyBId, delta: 1 },
    },
  );
  assert.equal(forgedContribution.response.status, 403, "Room contributors should not adjust another seat's contribution");
  assert.equal(
    server.rooms.get(teamPaymentRoom.body.roomId).game.pendingAction?.contributions[teamPaymentAllyBId],
    0,
    "Forged room team-resource contribution should not mutate another contributor",
  );
  const ownContribution = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentAllyAClaim.body.token,
    teamPaymentOwnerClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "adjust-team-resource-payment", contributorId: teamPaymentAllyAId, delta: 1 },
    },
  );
  assert.equal(ownContribution.response.status, 200, "Room contributors should adjust their own team-resource contribution");
  assert.equal(
    ownContribution.body.snapshot.game.pendingAction?.contributions[teamPaymentAllyAId],
    1,
    "Room contributor-owned adjustment should update that contributor only",
  );
  const underfundedTeamPaymentVersion = ownContribution.body.snapshot.version;
  const underfundedTeamPaymentResolve = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentOwnerClaim.body.token,
    underfundedTeamPaymentVersion,
    { kind: "pending", command: { kind: "choose-team-resource-payment" } },
  );
  assert.equal(underfundedTeamPaymentResolve.response.status, 409, "Room team-resource payment should reject underfunded resolution");
  assert.equal(
    server.rooms.get(teamPaymentRoom.body.roomId).version,
    underfundedTeamPaymentVersion,
    "Rejected underfunded room team-resource payment should not advance the room version",
  );
  const teamPaymentLatest = server.rooms.get(teamPaymentRoom.body.roomId);
  teamPaymentLatest.game = {
    ...teamPaymentLatest.game,
    pendingAction: {
      ...teamPaymentLatest.game.pendingAction,
      contributions: {
        [teamPaymentOwnerId]: 3,
        [teamPaymentAllyAId]: 2,
        [teamPaymentAllyBId]: 2,
      },
    },
  };
  teamPaymentLatest.version += 1;
  const forgedTeamPaymentResolve = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentAllyAClaim.body.token,
    teamPaymentLatest.version,
    { kind: "pending", command: { kind: "choose-team-resource-payment" } },
  );
  assert.equal(forgedTeamPaymentResolve.response.status, 403, "Room contributors should not resolve the owner's team-resource payment");
  const forgedTeamPaymentSkip = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentAllyAClaim.body.token,
    teamPaymentLatest.version,
    { kind: "pending", command: { kind: "skip-team-resource-payment" } },
  );
  assert.equal(forgedTeamPaymentSkip.response.status, 403, "Room contributors should not decline the owner's team-resource payment");
  const ownerTeamPaymentResolve = await roomAction(
    teamPaymentRoom.body.roomId,
    teamPaymentOwnerClaim.body.token,
    teamPaymentLatest.version,
    { kind: "pending", command: { kind: "choose-team-resource-payment" } },
  );
  assert.equal(ownerTeamPaymentResolve.response.status, 200, "Room payment owner should resolve a fully contributed team-resource payment");
  assert.equal(
    player(ownerTeamPaymentResolve.body.snapshot, teamPaymentOwnerId).vp,
    teamPaymentOwnerInitialVp + 1,
    "Room team-resource payment owner should gain the payment VP",
  );

  const boardInfluenceRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(boardInfluenceRoom.response.status, 201, "Board influence authorization room creation should succeed");
  const boardInfluenceRecord = server.rooms.get(boardInfluenceRoom.body.roomId);
  assert.ok(boardInfluenceRecord, "Board influence authorization room should be stored in memory");
  const boardInfluenceCommanderId = "p1";
  const boardInfluenceAllyId = "p3";
  const boardInfluenceCommanderSeat = boardInfluenceRecord.game.players.findIndex((candidate) => candidate.id === boardInfluenceCommanderId);
  assert.ok(boardInfluenceCommanderSeat >= 0, "Board influence Commander should exist");
  boardInfluenceRecord.game = {
    ...boardInfluenceRecord.game,
    activeSeat: boardInfluenceCommanderSeat,
    spaces: { ...boardInfluenceRecord.game.spaces, shipping: boardInfluenceAllyId },
    pendingAction: {
      kind: "board-influence-choice",
      source: "Shipping",
      spaceId: "shipping",
      targetOwnerId: boardInfluenceAllyId,
      choices: [
        { ownerId: boardInfluenceAllyId, faction: "greatHouses" },
        { ownerId: boardInfluenceAllyId, faction: "spacing" },
        { ownerId: boardInfluenceAllyId, faction: "bene" },
        { ownerId: boardInfluenceCommanderId, faction: "fremen" },
        { ownerId: boardInfluenceAllyId, faction: "fringeWorlds" },
      ],
    },
    pendingQueue: [],
    players: boardInfluenceRecord.game.players.map((candidate) =>
      candidate.id === boardInfluenceCommanderId || candidate.id === boardInfluenceAllyId
        ? { ...candidate, influence: { ...candidate.influence, fremen: 0, bene: 0 } }
        : candidate
    ),
  };
  const boardInfluenceAllyClaim = await jsonFetch(`/api/rooms/${boardInfluenceRoom.body.roomId}/seats/${boardInfluenceAllyId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Board Influence Ally" }),
  });
  assert.equal(boardInfluenceAllyClaim.response.status, 200, "Board influence choice Ally should be claimable");
  const forgedBoardInfluence = await roomAction(
    boardInfluenceRoom.body.roomId,
    boardInfluenceAllyClaim.body.token,
    boardInfluenceAllyClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "choose-board-influence", ownerId: boardInfluenceCommanderId, faction: "fremen" },
    },
  );
  assert.equal(forgedBoardInfluence.response.status, 403, "Room board influence choices should not grant Influence to another seat");
  assert.equal(
    server.rooms.get(boardInfluenceRoom.body.roomId).game.players.find((candidate) => candidate.id === boardInfluenceCommanderId)?.influence.fremen,
    0,
    "Forged room board influence choice should not mutate the other eligible owner",
  );
  const ownBoardInfluence = await roomAction(
    boardInfluenceRoom.body.roomId,
    boardInfluenceAllyClaim.body.token,
    boardInfluenceAllyClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "choose-board-influence", ownerId: boardInfluenceAllyId, faction: "bene" },
    },
  );
  assert.equal(ownBoardInfluence.response.status, 200, "Room board influence choice should allow the claimed owner to choose their option");
  assert.equal(
    player(ownBoardInfluence.body.snapshot, boardInfluenceAllyId).influence.bene,
    1,
    "Room board influence choice should grant Influence only to the claimed owner",
  );

  const contractRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(contractRoom.response.status, 201, "Contract fallback room creation should succeed");
  const contractRoomRecord = server.rooms.get(contractRoom.body.roomId);
  assert.ok(contractRoomRecord, "Contract fallback room should be stored in memory");
  const fallbackContractOwnerId = "p2";
  const fallbackContract = contractByName("Harvest 3+");
  const automatedContract = contractByName("Immediate");
  contractRoomRecord.game = {
    ...contractRoomRecord.game,
    pendingAction: undefined,
    pendingQueue: [],
    players: contractRoomRecord.game.players.map((candidate) =>
      candidate.id === fallbackContractOwnerId
        ? {
            ...candidate,
            contracts: [
              { card: fallbackContract, completed: false, takenRound: contractRoomRecord.game.round },
              { card: automatedContract, completed: false, takenRound: contractRoomRecord.game.round },
            ],
          }
        : { ...candidate, contracts: [] }
    ),
  };
  const contractOwnerClaim = await jsonFetch(`/api/rooms/${contractRoom.body.roomId}/seats/${fallbackContractOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Contract Owner" }),
  });
  assert.equal(contractOwnerClaim.response.status, 200, "Fallback contract owner should be claimable");
  const contractWrongClaim = await jsonFetch(`/api/rooms/${contractRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Wrong Contract Player" }),
  });
  assert.equal(contractWrongClaim.response.status, 200, "Wrong fallback contract player should be claimable");
  const wrongContractCompletion = await roomAction(
    contractRoom.body.roomId,
    contractWrongClaim.body.token,
    contractWrongClaim.body.snapshot.version,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: fallbackContract.id,
      completed: true,
    },
  );
  assert.equal(wrongContractCompletion.response.status, 403, "Only the contract owner should mark fallback completion");
  const automatedContractCompletion = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    contractWrongClaim.body.snapshot.version,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: automatedContract.id,
      completed: true,
    },
  );
  assert.equal(automatedContractCompletion.response.status, 409, "Automated CHOAM contracts should not be manually marked online");
  contractRoomRecord.version += 1;
  contractRoomRecord.game = {
    ...contractRoomRecord.game,
    pendingAction: { kind: "maker-choice", ownerId: fallbackContractOwnerId, source: "Verifier Maker Choice" },
    pendingQueue: [],
  };
  const lockedContractCompletion = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    contractRoomRecord.version,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: fallbackContract.id,
      completed: true,
    },
  );
  assert.equal(lockedContractCompletion.response.status, 409, "Fallback CHOAM completion should wait for table-locking pending actions");
  contractRoomRecord.version += 1;
  contractRoomRecord.game = {
    ...contractRoomRecord.game,
    pendingAction: undefined,
    pendingQueue: [],
  };
  const fallbackContractCompletion = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    contractRoomRecord.version,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: fallbackContract.id,
      completed: true,
    },
  );
  assert.equal(fallbackContractCompletion.response.status, 200, "Fallback CHOAM completion should resolve through room actions");
  assert.equal(
    player(fallbackContractCompletion.body.snapshot, fallbackContractOwnerId).contracts
      .find((contract) => contract.card.id === fallbackContract.id)?.completed,
    true,
    "Room fallback CHOAM completion should update authoritative contract state",
  );
  const fallbackContractReopen = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    fallbackContractCompletion.body.snapshot.version,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: fallbackContract.id,
      completed: false,
    },
  );
  assert.equal(fallbackContractReopen.response.status, 200, "Fallback CHOAM completion should be correctable online");
  assert.equal(
    player(fallbackContractReopen.body.snapshot, fallbackContractOwnerId).contracts
      .find((contract) => contract.card.id === fallbackContract.id)?.completed,
    false,
    "Room fallback CHOAM correction should reopen the contract",
  );
  contractRoomRecord.version += 1;
  contractRoomRecord.game = {
    ...contractRoomRecord.game,
    phase: "finished",
  };
  const finishedContractVersion = contractRoomRecord.version;
  const finishedContractCompletion = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    finishedContractVersion,
    {
      kind: "set-contract-completed",
      playerId: fallbackContractOwnerId,
      contractId: fallbackContract.id,
      completed: true,
    },
  );
  assert.equal(finishedContractCompletion.response.status, 409, "Finished rooms should not allow CHOAM completion edits");
  assert.equal(
    contractRoomRecord.version,
    finishedContractVersion,
    "Rejected finished-room CHOAM completion should not advance the room version",
  );
  contractRoomRecord.version += 1;
  contractRoomRecord.game = {
    ...contractRoomRecord.game,
    phase: "playing",
    contractOffer: [fallbackContract],
    pendingAction: { kind: "contract", ownerId: fallbackContractOwnerId, source: "Verifier Contract", optional: true },
    pendingQueue: [],
  };
  const invalidContractSelectionVersion = contractRoomRecord.version;
  const invalidContractSelection = await roomAction(
    contractRoom.body.roomId,
    contractOwnerClaim.body.token,
    invalidContractSelectionVersion,
    {
      kind: "pending",
      command: { kind: "take-contract", contractId: "missing-contract" },
    },
  );
  assert.equal(invalidContractSelection.response.status, 409, "Room contract selection should reject unavailable contract ids");
  assert.equal(
    server.rooms.get(contractRoom.body.roomId).version,
    invalidContractSelectionVersion,
    "Rejected room contract selection should not advance the room version",
  );

  const tradeRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(tradeRoom.response.status, 201, "Intrigue trade privacy room creation should succeed");
  const tradeRoomRecord = server.rooms.get(tradeRoom.body.roomId);
  assert.ok(tradeRoomRecord, "Intrigue trade privacy room should be stored in memory");
  const tradeCard = intrigueBySourceId(147);
  const sameTeamTradePlayers = tradeRoomRecord.game.players
    .filter((candidate) => candidate.team === tradeRoomRecord.game.players[0].team);
  assert.ok(sameTeamTradePlayers.length >= 2, "Expected at least two same-team players for Intrigue trade privacy");
  const [tradeActor, tradePartner] = sameTeamTradePlayers;
  const tradeObserver = tradeRoomRecord.game.players.find((candidate) =>
    candidate.id !== tradeActor.id && candidate.id !== tradePartner.id
  );
  assert.ok(tradeObserver, "Expected a non-participant Intrigue trade observer");
  tradeRoomRecord.game = {
    ...tradeRoomRecord.game,
    pendingAction: {
      kind: "trade",
      actorId: tradeActor.id,
      partnerId: tradePartner.id,
      resource: "intrigue",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Verifier Trade",
    },
    pendingQueue: [],
    players: tradeRoomRecord.game.players.map((candidate) => {
      if (candidate.id === tradeActor.id) return { ...candidate, intrigues: [tradeCard], hand: [], deck: [], discard: [] };
      if (candidate.id === tradePartner.id) return { ...candidate, intrigues: [], hand: [], deck: [], discard: [] };
      return { ...candidate, intrigues: [], hand: [], deck: [], discard: [] };
    }),
  };
  const tradeActorClaim = await jsonFetch(`/api/rooms/${tradeRoom.body.roomId}/seats/${tradeActor.id}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Trade Actor" }),
  });
  assert.equal(tradeActorClaim.response.status, 200, "Intrigue trade actor should be claimable");
  const tradePartnerClaim = await jsonFetch(`/api/rooms/${tradeRoom.body.roomId}/seats/${tradePartner.id}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Trade Partner" }),
  });
  assert.equal(tradePartnerClaim.response.status, 200, "Intrigue trade partner should be claimable");
  const tradeObserverClaim = await jsonFetch(`/api/rooms/${tradeRoom.body.roomId}/seats/${tradeObserver.id}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Trade Observer" }),
  });
  assert.equal(tradeObserverClaim.response.status, 200, "Intrigue trade observer should be claimable");
  const forgedTradeTransfer = await roomAction(tradeRoom.body.roomId, tradePartnerClaim.body.token, tradeObserverClaim.body.snapshot.version, {
    kind: "pending",
    command: {
      kind: "transfer-trade",
      fromId: tradeActor.id,
      toId: tradePartner.id,
      intrigueId: tradeCard.id,
    },
  });
  assert.equal(forgedTradeTransfer.response.status, 403, "Room trade participants should not move another seat's Intrigue");
  const tradeTransfer = await roomAction(tradeRoom.body.roomId, tradeActorClaim.body.token, tradeObserverClaim.body.snapshot.version, {
    kind: "pending",
    command: {
      kind: "transfer-trade",
      fromId: tradeActor.id,
      toId: tradePartner.id,
      intrigueId: tradeCard.id,
    },
  });
  assert.equal(tradeTransfer.response.status, 200, "Intrigue trade transfer should resolve through room actions");
  const tradeObserverSnapshot = await jsonFetch(`/api/rooms/${tradeRoom.body.roomId}`, {
    headers: { "x-room-token": tradeObserverClaim.body.token },
  });
  assert.equal(tradeObserverSnapshot.response.status, 200, "Intrigue trade observer snapshot should load");
  assert.equal(
    JSON.stringify(tradeObserverSnapshot.body).includes(tradeCard.name),
    false,
    "Room snapshots should not leak traded Intrigue names through hidden hands or logs",
  );
  assert.ok(
    tradeObserverSnapshot.body.game.log.some((entry) =>
      entry === `${tradeActor.leader} trades 1 Intrigue card to ${tradePartner.leader}.`
    ),
    "Room trade log should keep a generic public Intrigue transfer entry",
  );
  assert.ok(
    player(tradeObserverSnapshot.body, tradePartner.id).intrigues.every((card) => card.name === "Hidden Intrigue"),
    "Room trade observer should not see the received Intrigue name",
  );

  const resourceTradeRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(resourceTradeRoom.response.status, 201, "Resource trade authorization room creation should succeed");
  const resourceTradeRecord = server.rooms.get(resourceTradeRoom.body.roomId);
  assert.ok(resourceTradeRecord, "Resource trade authorization room should be stored in memory");
  const [resourceTradeActor, resourceTradePartner] = resourceTradeRecord.game.players
    .filter((candidate) => candidate.team === resourceTradeRecord.game.players[0].team);
  resourceTradeRecord.game = {
    ...resourceTradeRecord.game,
    pendingAction: {
      kind: "trade",
      actorId: resourceTradeActor.id,
      partnerId: resourceTradePartner.id,
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Verifier Resource Trade",
    },
    pendingQueue: [],
    players: resourceTradeRecord.game.players.map((candidate) => {
      if (candidate.id === resourceTradeActor.id) return { ...candidate, resources: { ...candidate.resources, spice: 1 } };
      if (candidate.id === resourceTradePartner.id) return { ...candidate, resources: { ...candidate.resources, spice: 0 } };
      return candidate;
    }),
  };
  const resourceTradePartnerClaim = await jsonFetch(`/api/rooms/${resourceTradeRoom.body.roomId}/seats/${resourceTradePartner.id}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Resource Trade Partner" }),
  });
  assert.equal(resourceTradePartnerClaim.response.status, 200, "Resource trade partner should be claimable");
  const forgedResourceSelection = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradePartnerClaim.body.token,
    resourceTradePartnerClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "update-trade", resource: "water" },
    },
  );
  assert.equal(forgedResourceSelection.response.status, 403, "Room trade partners should not change the actor's trade selection");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).game.pendingAction?.resource,
    "spice",
    "Forged room trade selection should not change the selected resource",
  );
  const forgedTradeClearVersion = server.rooms.get(resourceTradeRoom.body.roomId).version;
  const forgedTradeClear = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradePartnerClaim.body.token,
    forgedTradeClearVersion,
    { kind: "pending", command: { kind: "clear-pending-action" } },
  );
  assert.equal(forgedTradeClear.response.status, 403, "Room trade partners should not finish the actor's trade");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).version,
    forgedTradeClearVersion,
    "Rejected room trade clear should not advance the room version",
  );
  const resourceTradeActorClaim = await jsonFetch(`/api/rooms/${resourceTradeRoom.body.roomId}/seats/${resourceTradeActor.id}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Resource Trade Actor" }),
  });
  assert.equal(resourceTradeActorClaim.response.status, 200, "Resource trade actor should be claimable");
  const noOpResourceSelection = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradeActorClaim.body.token,
    resourceTradeActorClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "update-trade", resource: "spice", partnerId: resourceTradePartner.id },
    },
  );
  assert.equal(noOpResourceSelection.response.status, 409, "Room trade actors should not bump the room version by reselecting the current trade");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).version,
    resourceTradeActorClaim.body.snapshot.version,
    "Rejected no-op room trade selection should not advance the room version",
  );
  const unsupportedResourceSelection = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradeActorClaim.body.token,
    resourceTradeActorClaim.body.snapshot.version,
    {
      kind: "pending",
      command: { kind: "update-trade", resource: "melange" },
    },
  );
  assert.equal(unsupportedResourceSelection.response.status, 409, "Room trade actors should not select unsupported trade goods");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).game.pendingAction?.resource,
    "spice",
    "Unsupported room trade selection should not change the selected resource",
  );
  const forgedResourceTransfer = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradePartnerClaim.body.token,
    resourceTradeActorClaim.body.snapshot.version,
    {
      kind: "pending",
      command: {
        kind: "transfer-trade",
        fromId: resourceTradeActor.id,
        toId: resourceTradePartner.id,
      },
    },
  );
  assert.equal(forgedResourceTransfer.response.status, 403, "Room trade participants should not move another seat's resources");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).game.players.find((candidate) => candidate.id === resourceTradeActor.id)?.resources.spice,
    1,
    "Forged room trade resource transfer should not remove the actor's spice",
  );
  const firstResourceTransfer = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradeActorClaim.body.token,
    resourceTradeActorClaim.body.snapshot.version,
    {
      kind: "pending",
      command: {
        kind: "transfer-trade",
        fromId: resourceTradeActor.id,
        toId: resourceTradePartner.id,
      },
    },
  );
  assert.equal(firstResourceTransfer.response.status, 200, "Room trade actor should transfer one selected resource");
  const repeatedResourceTransfer = await roomAction(
    resourceTradeRoom.body.roomId,
    resourceTradeActorClaim.body.token,
    firstResourceTransfer.body.snapshot.version,
    {
      kind: "pending",
      command: {
        kind: "transfer-trade",
        fromId: resourceTradeActor.id,
        toId: resourceTradePartner.id,
      },
    },
  );
  assert.equal(repeatedResourceTransfer.response.status, 409, "Room trade actor should not transfer the selected resource twice");
  assert.equal(
    server.rooms.get(resourceTradeRoom.body.roomId).game.players.find((candidate) => candidate.id === resourceTradeActor.id)?.resources.spice,
    0,
    "Rejected repeat room trade should not remove another spice",
  );

  const deployRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(deployRoom.response.status, 201, "Deploy pending test room creation should succeed");
  const deployRoomRecord = server.rooms.get(deployRoom.body.roomId);
  assert.ok(deployRoomRecord, "Deploy pending test room should be stored in memory");
  const deployOwnerId = "p3";
  deployRoomRecord.game = {
    ...deployRoomRecord.game,
    pendingAction: { kind: "deploy", ownerId: deployOwnerId, remaining: 1, source: "Verifier Deploy" },
    pendingQueue: [],
    players: deployRoomRecord.game.players.map((candidate) =>
      candidate.id === deployOwnerId
        ? { ...candidate, garrison: Math.max(candidate.garrison, 1), conflict: 0, deployedTroops: 0 }
        : candidate
    ),
  };
  const deployClaim = await jsonFetch(`/api/rooms/${deployRoom.body.roomId}/seats/${deployOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Deploy Owner" }),
  });
  assert.equal(deployClaim.response.status, 200, "Deploy owner should be claimable");
  const deployPendingAction = await roomAction(deployRoom.body.roomId, deployClaim.body.token, deployClaim.body.snapshot.version, {
    kind: "pending",
    command: { kind: "deploy-one" },
  });
  assert.equal(deployPendingAction.response.status, 200, "Deploy owner should deploy through room pending endpoint");
  const deployOwnerAfter = player(deployPendingAction.body.snapshot, deployOwnerId);
  assert.equal(deployOwnerAfter.deployedTroops, 1, "Room pending deploy should move one troop to the conflict");
  assert.equal(deployPendingAction.body.snapshot.game.pendingAction, undefined, "Room pending deploy should finish when remaining reaches zero");

  const contingencyPlan = intrigueBySourceId(147);
  const plotRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(plotRoom.response.status, 201, "Plot Intrigue test room creation should succeed");
  const plotRecord = server.rooms.get(plotRoom.body.roomId);
  assert.ok(plotRecord, "Plot Intrigue test room should be stored in memory");
  const plotOwnerId = "p2";
  const plotOwnerInitial = plotRecord.game.players.find((candidate) => candidate.id === plotOwnerId);
  assert.ok(plotOwnerInitial, "Plot owner should exist");
  plotRecord.game = {
    ...plotRecord.game,
    phase: "playing",
    activeSeat: plotRecord.game.players.findIndex((candidate) => candidate.id === plotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    players: plotRecord.game.players.map((candidate) =>
      candidate.id === plotOwnerId
        ? { ...candidate, intrigues: [contingencyPlan], hand: [], deck: [], discard: [] }
        : { ...candidate, intrigues: [], hand: [], deck: [], discard: [] }
    ),
  };
  const plotWrongClaim = await jsonFetch(`/api/rooms/${plotRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Wrong Plot Player" }),
  });
  assert.equal(plotWrongClaim.response.status, 200, "Wrong Plot seat should be claimable");
  const plotOwnerClaim = await jsonFetch(`/api/rooms/${plotRoom.body.roomId}/seats/${plotOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Plot Owner" }),
  });
  assert.equal(plotOwnerClaim.response.status, 200, "Plot owner should be claimable");
  const wrongPlotAction = await roomAction(plotRoom.body.roomId, plotWrongClaim.body.token, plotOwnerClaim.body.snapshot.version, {
    kind: "plot-intrigue",
    command: { kind: "contingency-plan", intrigueId: contingencyPlan.id },
  });
  assert.equal(wrongPlotAction.response.status, 403, "Only the active claimed player should play Plot Intrigues");
  const plotAction = await roomAction(plotRoom.body.roomId, plotOwnerClaim.body.token, plotOwnerClaim.body.snapshot.version, {
    kind: "plot-intrigue",
    command: { kind: "contingency-plan", intrigueId: contingencyPlan.id },
  });
  assert.equal(plotAction.response.status, 200, "Active room player should play a simple Plot Intrigue");
  const plotOwnerAfter = player(plotAction.body.snapshot, plotOwnerId);
  assert.equal(plotOwnerAfter.resources.solari, plotOwnerInitial.resources.solari + 2, "Room Plot Intrigue should apply rewards");
  assert.deepEqual(plotOwnerAfter.intrigues, [], "Room Plot Intrigue should leave the owner's Intrigue hand");
  assert.equal(plotAction.body.snapshot.game.intrigueDiscard.at(-1).id, contingencyPlan.id, "Room Plot Intrigue should discard the card");

  const cunning = intrigueBySourceId(133);
  const cunningDrawCard = imperiumDeck[0];
  assert.ok(cunningDrawCard, "Cunning room test needs a draw card");
  const cunningRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(cunningRoom.response.status, 201, "Cunning Plot test room creation should succeed");
  const cunningRecord = server.rooms.get(cunningRoom.body.roomId);
  assert.ok(cunningRecord, "Cunning Plot room should be stored in memory");
  cunningRecord.game = {
    ...cunningRecord.game,
    phase: "playing",
    activeSeat: cunningRecord.game.players.findIndex((candidate) => candidate.id === plotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    players: cunningRecord.game.players.map((candidate) =>
      candidate.id === plotOwnerId
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: Math.max(candidate.resources.spice, 2) },
            intrigues: [cunning],
            hand: [],
            deck: [cunningDrawCard],
            discard: [],
          }
        : { ...candidate, intrigues: [], hand: [], deck: [], discard: [] }
    ),
  };
  const cunningClaim = await jsonFetch(`/api/rooms/${cunningRoom.body.roomId}/seats/${plotOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Cunning Owner" }),
  });
  assert.equal(cunningClaim.response.status, 200, "Cunning owner should be claimable");
  const cunningAction = await roomAction(cunningRoom.body.roomId, cunningClaim.body.token, cunningClaim.body.snapshot.version, {
    kind: "plot-intrigue",
    command: { kind: "cunning", intrigueId: cunning.id, choice: "paid-trash" },
  });
  assert.equal(cunningAction.response.status, 200, "Choice Plot Intrigues should resolve through room actions");
  const cunningOwnerAfter = player(cunningAction.body.snapshot, plotOwnerId);
  assert.equal(cunningOwnerAfter.resources.spice, 1, "Room Cunning paid branch should spend spice");
  assert.equal(cunningOwnerAfter.hand.length, 1, "Room Cunning paid branch should draw before trashing");
  assert.deepEqual(
    cunningAction.body.snapshot.game.pendingAction,
    { kind: "trash-card", ownerId: plotOwnerId, source: "Cunning", optional: false },
    "Room Cunning paid branch should queue the owner's trash choice",
  );

  const manipulate = intrigueBySourceId(143);
  const manipulateRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(manipulateRoom.response.status, 201, "Manipulate Plot test room creation should succeed");
  const manipulateRecord = server.rooms.get(manipulateRoom.body.roomId);
  assert.ok(manipulateRecord, "Manipulate Plot room should be stored in memory");
  const manipulatedRowCard = manipulateRecord.game.imperiumRow[0];
  const replacementRowCard = manipulateRecord.game.marketDeck[0];
  assert.ok(manipulatedRowCard && replacementRowCard, "Manipulate room test needs row and replacement cards");
  manipulateRecord.game = {
    ...manipulateRecord.game,
    phase: "playing",
    activeSeat: manipulateRecord.game.players.findIndex((candidate) => candidate.id === plotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    players: manipulateRecord.game.players.map((candidate) =>
      candidate.id === plotOwnerId
        ? { ...candidate, intrigues: [manipulate], hand: [], deck: [], discard: [], manipulatedCards: [] }
        : { ...candidate, intrigues: [], hand: [], deck: [], discard: [] }
    ),
  };
  const manipulateClaim = await jsonFetch(`/api/rooms/${manipulateRoom.body.roomId}/seats/${plotOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Manipulate Owner" }),
  });
  assert.equal(manipulateClaim.response.status, 200, "Manipulate owner should be claimable");
  const manipulateAction = await roomAction(manipulateRoom.body.roomId, manipulateClaim.body.token, manipulateClaim.body.snapshot.version, {
    kind: "plot-intrigue",
    command: { kind: "manipulate", intrigueId: manipulate.id, cardId: manipulatedRowCard.id },
  });
  assert.equal(manipulateAction.response.status, 200, "Target-card Plot Intrigues should resolve through room actions");
  const manipulateOwnerAfter = player(manipulateAction.body.snapshot, plotOwnerId);
  assert.equal(manipulateOwnerAfter.manipulatedCards[0]?.id, manipulatedRowCard.id, "Room Manipulate should track the removed row card");
  assert.equal(
    manipulateAction.body.snapshot.game.imperiumRow.some((card) => card.id === replacementRowCard.id),
    true,
    "Room Manipulate should refill the Imperium Row",
  );

  const mercenaries = intrigueBySourceId(128);
  const mercenariesDrawIntrigue = intrigueBySourceId(147);
  const commanderPlotRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(commanderPlotRoom.response.status, 201, "Commander Plot test room creation should succeed");
  const commanderPlotRecord = server.rooms.get(commanderPlotRoom.body.roomId);
  assert.ok(commanderPlotRecord, "Commander Plot room should be stored in memory");
  const commanderPlotOwnerId = "p4";
  const commanderAllyId = "p6";
  const commanderAllyInitial = commanderPlotRecord.game.players.find((candidate) => candidate.id === commanderAllyId);
  const defaultCommanderAllyInitial = commanderPlotRecord.game.players.find((candidate) => candidate.id === "p2");
  assert.ok(commanderAllyInitial, "Commander Plot Ally should exist");
  assert.ok(defaultCommanderAllyInitial, "Default Commander Plot Ally should exist");
  commanderPlotRecord.game = {
    ...commanderPlotRecord.game,
    phase: "playing",
    activeSeat: commanderPlotRecord.game.players.findIndex((candidate) => candidate.id === commanderPlotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDeck: [mercenariesDrawIntrigue],
    intrigueDiscard: [],
    players: commanderPlotRecord.game.players.map((candidate) => {
      if (candidate.id === commanderPlotOwnerId) {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: Math.max(candidate.resources.solari, 3) },
          intrigues: [mercenaries],
          hand: [],
          deck: [],
          discard: [],
        };
      }
      if (candidate.id === commanderAllyId) return { ...candidate, garrison: 0, intrigues: [], hand: [], deck: [], discard: [] };
      return { ...candidate, intrigues: [], hand: [], deck: [], discard: [] };
    }),
  };
  const commanderPlotClaim = await jsonFetch(`/api/rooms/${commanderPlotRoom.body.roomId}/seats/${commanderPlotOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Commander Plot Owner" }),
  });
  assert.equal(commanderPlotClaim.response.status, 200, "Commander Plot owner should be claimable");
  const invalidCommanderPlotAction = await roomAction(
    commanderPlotRoom.body.roomId,
    commanderPlotClaim.body.token,
    commanderPlotClaim.body.snapshot.version,
    {
      kind: "plot-intrigue",
      commanderTargets: { [commanderPlotOwnerId]: "p3" },
      command: { kind: "mercenaries", intrigueId: mercenaries.id },
    },
  );
  assert.equal(invalidCommanderPlotAction.response.status, 200, "Invalid Commander targets should be sanitized to a legal teammate");
  assert.equal(
    player(invalidCommanderPlotAction.body.snapshot, "p2").garrison,
    defaultCommanderAllyInitial.garrison + 2,
    "Sanitized Commander Plot target should use the default same-team Ally",
  );

  const validCommanderPlotRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(validCommanderPlotRoom.response.status, 201, "Valid Commander Plot test room creation should succeed");
  const validCommanderPlotRecord = server.rooms.get(validCommanderPlotRoom.body.roomId);
  assert.ok(validCommanderPlotRecord, "Valid Commander Plot room should be stored in memory");
  const validCommanderAllyInitialGarrison = 0;
  validCommanderPlotRecord.game = {
    ...validCommanderPlotRecord.game,
    phase: "playing",
    activeSeat: validCommanderPlotRecord.game.players.findIndex((candidate) => candidate.id === commanderPlotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDeck: [mercenariesDrawIntrigue],
    intrigueDiscard: [],
    players: validCommanderPlotRecord.game.players.map((candidate) => {
      if (candidate.id === commanderPlotOwnerId) {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: Math.max(candidate.resources.solari, 3) },
          intrigues: [mercenaries],
          hand: [],
          deck: [],
          discard: [],
        };
      }
      if (candidate.id === commanderAllyId) {
        return { ...candidate, garrison: validCommanderAllyInitialGarrison, intrigues: [], hand: [], deck: [], discard: [] };
      }
      return { ...candidate, intrigues: [], hand: [], deck: [], discard: [] };
    }),
  };
  const validCommanderPlotClaim = await jsonFetch(`/api/rooms/${validCommanderPlotRoom.body.roomId}/seats/${commanderPlotOwnerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Valid Commander Plot Owner" }),
  });
  assert.equal(validCommanderPlotClaim.response.status, 200, "Valid Commander Plot owner should be claimable");
  const validCommanderPlotAction = await roomAction(
    validCommanderPlotRoom.body.roomId,
    validCommanderPlotClaim.body.token,
    validCommanderPlotClaim.body.snapshot.version,
    {
      kind: "plot-intrigue",
      commanderTargets: { [commanderPlotOwnerId]: commanderAllyId },
      command: { kind: "mercenaries", intrigueId: mercenaries.id },
    },
  );
  assert.equal(validCommanderPlotAction.response.status, 200, "Commander-routed Plot Intrigues should resolve through room actions");
  assert.equal(
    player(validCommanderPlotAction.body.snapshot, commanderAllyId).garrison,
    validCommanderAllyInitialGarrison + 2,
    "Room Commander Plot Intrigue should recruit for the selected same-team Ally",
  );

  const verifierCombat = {
    ...intrigueBySourceId(152),
    id: "room-verifier-combat",
    name: "Room Verifier Combat",
    sourceId: undefined,
    combatSwords: undefined,
    effects: [{ trigger: "combat-intrigue", effects: [{ kind: "gain-strength", selector: "self", amount: 2 }] }],
  };
  const combatPlayRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(combatPlayRoom.response.status, 201, "Combat play test room creation should succeed");
  const combatPlayRecord = server.rooms.get(combatPlayRoom.body.roomId);
  assert.ok(combatPlayRecord, "Combat play test room should be stored in memory");
  combatPlayRecord.game = combatRoomState(combatPlayRecord, (players) =>
    players.map((candidate) => {
      if (candidate.id === "p2") {
        return { ...candidate, conflict: 2, deployedTroops: 1, intrigues: [verifierCombat] };
      }
      if (candidate.id === "p3") return { ...candidate, conflict: 3, deployedTroops: 1 };
      return candidate;
    }),
  );
  assert.equal(combatPlayRecord.game.players[combatPlayRecord.game.activeSeat].id, "p2", "Combat fixture should start with p2");
  const combatWrongClaim = await jsonFetch(`/api/rooms/${combatPlayRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Wrong Combat Player" }),
  });
  assert.equal(combatWrongClaim.response.status, 200, "Wrong combat seat should be claimable");
  const combatOwnerClaim = await jsonFetch(`/api/rooms/${combatPlayRoom.body.roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Combat Owner" }),
  });
  assert.equal(combatOwnerClaim.response.status, 200, "Combat owner should be claimable");
  const wrongCombatAction = await roomAction(combatPlayRoom.body.roomId, combatWrongClaim.body.token, combatOwnerClaim.body.snapshot.version, {
    kind: "play-combat-intrigue",
    intrigueId: verifierCombat.id,
  });
  assert.equal(wrongCombatAction.response.status, 403, "Only the active combat actor should play Combat Intrigues");
  const combatPlayAction = await roomAction(combatPlayRoom.body.roomId, combatOwnerClaim.body.token, combatOwnerClaim.body.snapshot.version, {
    kind: "play-combat-intrigue",
    intrigueId: verifierCombat.id,
  });
  assert.equal(combatPlayAction.response.status, 200, "Active combat actor should play a Combat Intrigue through room actions");
  const combatOwnerAfter = player(combatPlayAction.body.snapshot, "p2");
  assert.equal(combatOwnerAfter.conflict, 4, "Room Combat Intrigue play should add strength on authoritative state");
  assert.deepEqual(combatOwnerAfter.intrigues, [], "Room Combat Intrigue play should remove the card from the owner's hand");
  assert.equal(
    combatPlayAction.body.snapshot.game.players[combatPlayAction.body.snapshot.game.activeSeat].id,
    "p3",
    "Room Combat Intrigue play should advance to the next combat actor",
  );

  const combatPassRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(combatPassRoom.response.status, 201, "Combat pass test room creation should succeed");
  const combatPassRecord = server.rooms.get(combatPassRoom.body.roomId);
  assert.ok(combatPassRecord, "Combat pass test room should be stored in memory");
  combatPassRecord.game = combatRoomState(combatPassRecord, (players) =>
    players.map((candidate) => {
      if (candidate.id === "p2") return { ...candidate, conflict: 2, deployedTroops: 1 };
      if (candidate.id === "p3") return { ...candidate, conflict: 3, deployedTroops: 1 };
      return candidate;
    }),
  );
  const combatPassClaim = await jsonFetch(`/api/rooms/${combatPassRoom.body.roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Combat Pass Owner" }),
  });
  assert.equal(combatPassClaim.response.status, 200, "Combat pass owner should be claimable");
  const combatPassAction = await roomAction(combatPassRoom.body.roomId, combatPassClaim.body.token, combatPassClaim.body.snapshot.version, {
    kind: "pass-combat",
  });
  assert.equal(combatPassAction.response.status, 200, "Active combat actor should pass through room actions");
  assert.deepEqual(combatPassAction.body.snapshot.game.combatPasses, ["p2"], "Room combat pass should record the passing actor");
  assert.equal(
    combatPassAction.body.snapshot.game.players[combatPassAction.body.snapshot.game.activeSeat].id,
    "p3",
    "Room combat pass should advance to the next combat actor",
  );

  const endgameRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(endgameRoom.response.status, 201, "Endgame action test room creation should succeed");
  const endgameRecord = server.rooms.get(endgameRoom.body.roomId);
  assert.ok(endgameRecord, "Endgame action room should be stored in memory");
  const crysknifeIntrigue = intrigueBySourceId(159);
  const crysknifeConflict = { ...conflictBySourceId(454), scored: false };
  const endgameOwnerInitial = endgameRecord.game.players.find((candidate) => candidate.id === "p2");
  assert.ok(endgameOwnerInitial, "Endgame owner should exist");
  endgameRecord.game = {
    ...endgameRecord.game,
    phase: "endgame",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: endgameRecord.game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [crysknifeIntrigue], wonConflicts: [crysknifeConflict] }
        : { ...candidate, intrigues: [], wonConflicts: [] }
    ),
  };
  const endgameWrongClaim = await jsonFetch(`/api/rooms/${endgameRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Wrong Endgame Player" }),
  });
  assert.equal(endgameWrongClaim.response.status, 200, "Wrong Endgame seat should be claimable");
  const endgameOwnerClaim = await jsonFetch(`/api/rooms/${endgameRoom.body.roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Endgame Owner" }),
  });
  assert.equal(endgameOwnerClaim.response.status, 200, "Endgame owner should be claimable");
  const wrongPlayerReady = await roomAction(endgameRoom.body.roomId, endgameWrongClaim.body.token, endgameOwnerClaim.body.snapshot.version, {
    kind: "finalize-endgame",
  });
  assert.equal(wrongPlayerReady.response.status, 200, "A player with no own Endgame choices should be able to mark ready");
  assert.equal(wrongPlayerReady.body.snapshot.endgameReady.p1, true, "Room ready state should expose public Endgame readiness");
  assert.equal(wrongPlayerReady.body.snapshot.game.phase, "endgame", "One ready player should not finalize the whole room");
  const repeatReady = await roomAction(endgameRoom.body.roomId, endgameWrongClaim.body.token, wrongPlayerReady.body.snapshot.version, {
    kind: "finalize-endgame",
  });
  assert.equal(repeatReady.response.status, 409, "A player should not be able to mark Endgame ready twice");
  assert.equal(endgameRecord.version, wrongPlayerReady.body.snapshot.version, "Rejected repeat Endgame ready should not advance the room version");
  const ownerReadyBeforeScoring = await roomAction(endgameRoom.body.roomId, endgameOwnerClaim.body.token, wrongPlayerReady.body.snapshot.version, {
    kind: "finalize-endgame",
  });
  assert.equal(
    ownerReadyBeforeScoring.response.status,
    409,
    "A player with own scoreable Endgame Intrigues should resolve them before marking ready",
  );
  const wrongEndgameScore = await roomAction(endgameRoom.body.roomId, endgameWrongClaim.body.token, wrongPlayerReady.body.snapshot.version, {
    kind: "score-endgame-icon",
    playerId: "p2",
    intrigueId: crysknifeIntrigue.id,
    conflictId: crysknifeConflict.id,
  });
  assert.equal(wrongEndgameScore.response.status, 403, "Only the Endgame Intrigue owner should score their card");
  const endgameScore = await roomAction(endgameRoom.body.roomId, endgameOwnerClaim.body.token, wrongPlayerReady.body.snapshot.version, {
    kind: "score-endgame-icon",
    playerId: "p2",
    intrigueId: crysknifeIntrigue.id,
    conflictId: crysknifeConflict.id,
  });
  assert.equal(endgameScore.response.status, 200, "Endgame battle-icon Intrigues should score through room actions");
  const scoredEndgameOwner = player(endgameScore.body.snapshot, "p2");
  assert.equal(scoredEndgameOwner.vp, endgameOwnerInitial.vp + 1, "Room Endgame scoring should add VP");
  assert.deepEqual(scoredEndgameOwner.intrigues, [], "Room Endgame scoring should discard the scored Intrigue");
  assert.equal(scoredEndgameOwner.wonConflicts[0].scored, true, "Room Endgame scoring should flip the matched Conflict");
  endgameRecord.endgameReady = Object.fromEntries(endgameRecord.game.players
    .filter((candidate) => candidate.id !== "p2")
    .map((candidate) => [candidate.id, true]));
  const finalizedEndgame = await roomAction(endgameRoom.body.roomId, endgameOwnerClaim.body.token, endgameScore.body.snapshot.version, {
    kind: "finalize-endgame",
  });
  assert.equal(finalizedEndgame.response.status, 200, "Rooms should finalize Endgame after all seats are ready");
  assert.equal(finalizedEndgame.body.snapshot.game.phase, "finished", "Room finalization should finish the game");

  const conditionalRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(conditionalRoom.response.status, 201, "Conditional Endgame test room creation should succeed");
  const conditionalRecord = server.rooms.get(conditionalRoom.body.roomId);
  assert.ok(conditionalRecord, "Conditional Endgame room should be stored in memory");
  const choamProfits = intrigueBySourceId(450);
  const completedContracts = standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  assert.equal(completedContracts.length, 4, "Conditional Endgame fixture should have enough contracts");
  const conditionalOwnerInitial = conditionalRecord.game.players.find((candidate) => candidate.id === "p2");
  assert.ok(conditionalOwnerInitial, "Conditional Endgame owner should exist");
  conditionalRecord.game = {
    ...conditionalRecord.game,
    phase: "endgame",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: conditionalRecord.game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [choamProfits], contracts: completedContracts, wonConflicts: [] }
        : { ...candidate, intrigues: [], wonConflicts: [] }
    ),
  };
  const conditionalClaim = await jsonFetch(`/api/rooms/${conditionalRoom.body.roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Conditional Endgame Owner" }),
  });
  assert.equal(conditionalClaim.response.status, 200, "Conditional Endgame owner should be claimable");
  const conditionalScore = await roomAction(conditionalRoom.body.roomId, conditionalClaim.body.token, conditionalClaim.body.snapshot.version, {
    kind: "score-endgame-conditional",
    playerId: "p2",
    intrigueId: choamProfits.id,
  });
  assert.equal(conditionalScore.response.status, 200, "Conditional Endgame Intrigues should score through room actions");
  const conditionalOwnerAfter = player(conditionalScore.body.snapshot, "p2");
  assert.equal(conditionalOwnerAfter.vp, conditionalOwnerInitial.vp + 1, "Room conditional Endgame scoring should add VP");
  assert.deepEqual(conditionalOwnerAfter.intrigues, [], "Room conditional Endgame scoring should discard the scored Intrigue");

  const secureSpiceRoom = await jsonFetch("/api/rooms", { method: "POST" });
  assert.equal(secureSpiceRoom.response.status, 201, "Secure Spice Trade Endgame room creation should succeed");
  const secureSpiceRecord = server.rooms.get(secureSpiceRoom.body.roomId);
  assert.ok(secureSpiceRecord, "Secure Spice Trade Endgame room should be stored in memory");
  const secureSpiceTrade = intrigueBySourceId(161);
  const spiceMustFlow = dataCardBySourceId(reserveMarket, 538, "Reserve Imperium card");
  secureSpiceRecord.game = {
    ...secureSpiceRecord.game,
    phase: "endgame",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: secureSpiceRecord.game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            deck: [
              { ...spiceMustFlow, id: `${spiceMustFlow.id}-deck-1` },
              { ...spiceMustFlow, id: `${spiceMustFlow.id}-deck-2` },
            ],
            hand: [],
            discard: [],
            playArea: [],
            intrigues: [secureSpiceTrade],
            wonConflicts: [],
          }
        : { ...candidate, deck: [], hand: [], discard: [], playArea: [], intrigues: [], wonConflicts: [] }
    ),
  };
  const secureSpiceWrongClaim = await jsonFetch(`/api/rooms/${secureSpiceRoom.body.roomId}/seats/p1/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Secure Spice Observer" }),
  });
  assert.equal(secureSpiceWrongClaim.response.status, 200, "Secure Spice observer should be claimable");
  assert.deepEqual(
    secureSpiceWrongClaim.body.snapshot.endgameChoices.conditionalChoices,
    [],
    "Room Endgame choices should not expose another player's Secure Spice Trade eligibility",
  );
  const secureSpiceClaim = await jsonFetch(`/api/rooms/${secureSpiceRoom.body.roomId}/seats/p2/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Secure Spice Owner" }),
  });
  assert.equal(secureSpiceClaim.response.status, 200, "Secure Spice Trade owner should be claimable");
  assertHiddenDrawDeck(secureSpiceClaim.body.snapshot, "p2");
  assert.deepEqual(
    secureSpiceClaim.body.snapshot.endgameChoices.conditionalChoices,
    [{ playerId: "p2", intrigueId: secureSpiceTrade.id, vp: 1, spice: 2 }],
    "Room snapshots should expose own Secure Spice Trade choices even when The Spice Must Flow cards are hidden in the draw deck",
  );
  const secureSpiceOwnerBefore = player(secureSpiceClaim.body.snapshot, "p2");
  const secureSpiceScore = await roomAction(secureSpiceRoom.body.roomId, secureSpiceClaim.body.token, secureSpiceClaim.body.snapshot.version, {
    kind: "score-endgame-conditional",
    playerId: "p2",
    intrigueId: secureSpiceTrade.id,
  });
  assert.equal(secureSpiceScore.response.status, 200, "Secure Spice Trade should score through room actions with deck-counted Spice Must Flow cards");
  const secureSpiceOwnerAfter = player(secureSpiceScore.body.snapshot, "p2");
  assert.equal(secureSpiceOwnerAfter.vp, secureSpiceOwnerBefore.vp + 1);
  assert.equal(secureSpiceOwnerAfter.resources.spice, secureSpiceOwnerBefore.resources.spice + 2);

  console.log("room server verification passed");
} finally {
  await server.close();
  await rm(rootStorageDir, { force: true, recursive: true });
  await rm(publicStorageFile, { force: true });
}
