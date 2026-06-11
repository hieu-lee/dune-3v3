#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer as createViteServer } from "vite";
import {
  assertAiSnapshotHasNoForeignPrivateCards,
  buildAiSeatSnapshot,
  chooseAiAction,
  createAiRuntime,
  createMockAiClient,
  createOpenAiResponseClient,
  discussRoundSummary,
  nextActionSeats,
} from "./ai-team-driver.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const maxJsonBodyBytes = 1024 * 1024;

function roomCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

function reconnectToken() {
  return randomBytes(18).toString("base64url");
}

function sendJson(response, status, body) {
  response.writeHead(status, jsonHeaders);
  response.end(JSON.stringify(body));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

function sendNoContent(response) {
  response.writeHead(204, { "cache-control": "no-store" });
  response.end();
}

function pendingActionKey(pendingAction) {
  if (!pendingAction) return undefined;
  return [
    pendingAction.kind,
    pendingAction.ownerId ?? "",
    pendingAction.actorId ?? "",
    pendingAction.partnerId ?? "",
    pendingAction.team ?? "",
    pendingAction.source ?? "",
  ].join(":");
}

function actionLooksLikeResolvedPendingRetry(action, currentPendingAction) {
  return (
    action?.kind === "pending" &&
    action.command?.kind === "clear-pending-action" &&
    action.command.pendingKey &&
    action.command.pendingKey !== pendingActionKey(currentPendingAction)
  );
}

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readJson(request) {
  const chunks = [];
  let byteLength = 0;
  let bodyTooLarge = false;
  for await (const chunk of request) {
    byteLength += chunk.length;
    if (bodyTooLarge) continue;
    if (byteLength <= maxJsonBodyBytes) {
      chunks.push(chunk);
    } else {
      bodyTooLarge = true;
    }
  }
  if (bodyTooLarge) throw requestError(413, "JSON request body is too large");
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw requestError(400, "Malformed JSON request body");
  }
}

function tokenFromRequest(request, url) {
  return request.headers["x-room-token"]?.toString() || url.searchParams.get("token") || undefined;
}

function sseWrite(response, event, data) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sseWriteSerialized(response, event, serializedData) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${serializedData}\n\n`);
}

function clearEndgameReadyForAction(room, action, actorId, previousPhase) {
  if (room.game.phase !== "endgame") {
    room.endgameReady = {};
    return;
  }
  if (previousPhase !== "endgame") {
    room.endgameReady = {};
    return;
  }
  if (
    action?.kind === "score-endgame-icon" ||
    action?.kind === "score-endgame-conditional"
  ) {
    room.endgameReady = { ...room.endgameReady, [actorId]: undefined };
  }
}

function allPlayersEndgameReady(room) {
  return room.game.players.every((player) => room.endgameReady[player.id]);
}

function defaultStorageFile() {
  return process.env.DUNE_ROOM_STORAGE_FILE || join(homedir(), ".dune-3v3", "room-server", "rooms.json");
}

function normalizeStorageFile(storageFile) {
  if (storageFile === false || storageFile === null) return undefined;
  return resolve(storageFile ?? defaultStorageFile());
}

function splitAllowedHosts(value) {
  return value.split(",").map((host) => host.trim()).filter(Boolean);
}

function roomAllowedHosts(extraAllowedHosts = []) {
  return [...new Set([
    ".trycloudflare.com",
    ...splitAllowedHosts(process.env.DUNE_ALLOWED_HOSTS ?? ""),
    ...extraAllowedHosts,
  ])];
}

function pollTimerKey(roomId, token) {
  return `${roomId}:${token}`;
}

function isPathInside(child, parent) {
  const rel = relative(parent.toLowerCase(), child.toLowerCase());
  return rel === "" || (rel && !rel.startsWith("..") && !rel.startsWith(sep));
}

function disconnectLoadedSeats(room) {
  return {
    ...room,
    started: room.started ?? true,
    endgameReady: room.endgameReady ?? {},
    seats: Object.fromEntries(
      Object.entries(room.seats ?? {}).map(([playerId, seat]) => [
        playerId,
        seat ? { ...seat, connected: Boolean(seat.ai) } : undefined,
      ]),
    ),
  };
}

function isObsoleteRevealAdjustPending(action) {
  return action?.kind === "reveal-adjust";
}

function signedAdjustment(value) {
  const numericValue = Number.isFinite(value) ? value : 0;
  return numericValue >= 0 ? `+${numericValue}` : `${numericValue}`;
}

function migrationTimestamp() {
  return Date.now();
}

function migrateObsoleteRevealAdjust(room, { advancePendingAction, scoreGurneyAlwaysSmiling }) {
  const game = room.game;
  const pendingQueue = Array.isArray(game.pendingQueue) ? game.pendingQueue : [];
  const filteredQueue = pendingQueue.filter((action) => !isObsoleteRevealAdjustPending(action));
  const removedQueuedRevealAdjust = filteredQueue.length !== pendingQueue.length;
  if (!isObsoleteRevealAdjustPending(game.pendingAction) && !removedQueuedRevealAdjust) return room;

  let nextGame = removedQueuedRevealAdjust ? { ...game, pendingQueue: filteredQueue } : game;
  if (isObsoleteRevealAdjustPending(game.pendingAction)) {
    const pending = game.pendingAction;
    const advancedState = {
      ...nextGame,
      ...advancePendingAction(nextGame),
      log: [
        `Printed reveal adjustment resolved: ${signedAdjustment(pending.persuasionAdjustment)} persuasion, ${signedAdjustment(pending.strengthAdjustment)} strength.`,
        ...(Array.isArray(game.log) ? game.log : []),
      ],
    };
    nextGame = scoreGurneyAlwaysSmiling(advancedState, pending.ownerId);
  }

  return {
    ...room,
    version: room.version + 1,
    updatedAt: migrationTimestamp(),
    game: nextGame,
  };
}

function migrateSpyObservationPosts(room, { normalizeSpyObservationPosts }) {
  const game = normalizeSpyObservationPosts(room.game);
  if (game === room.game) return room;
  return {
    ...room,
    version: room.version + 1,
    updatedAt: migrationTimestamp(),
    game,
  };
}

function migrateCardTraits(room, { normalizeGameCardTraits }) {
  const game = normalizeGameCardTraits(room.game);
  if (game === room.game) return room;
  return {
    ...room,
    version: room.version + 1,
    updatedAt: migrationTimestamp(),
    game,
  };
}

function migrateReservedContractPrivacy(room, { reservedContracts }) {
  const reservedIds = new Set(reservedContracts.map((contract) => contract.id));
  const reservedNames = reservedContracts.map((contract) => contract.name);
  let changed = false;
  const players = room.game.players.map((player) => {
    let playerChanged = false;
    const contracts = player.contracts.map((contract) => {
      if (contract.reserved || !reservedIds.has(contract.card?.id)) return contract;
      changed = true;
      playerChanged = true;
      return { ...contract, reserved: true };
    });
    return playerChanged ? { ...player, contracts } : player;
  });
  const log = Array.isArray(room.game.log)
    ? room.game.log.map((line) => {
        const redacted = reservedNames.reduce(
          (current, name) =>
            current.replace(
              `takes the reserved ${name} CHOAM contract`,
              "takes a reserved CHOAM contract",
            ),
          line,
        );
        if (redacted !== line) changed = true;
        return redacted;
      })
    : room.game.log;
  if (!changed) return room;
  return {
    ...room,
    version: room.version + 1,
    updatedAt: migrationTimestamp(),
    game: {
      ...room.game,
      players,
      log,
    },
  };
}

function validStoredRoom(candidate) {
  return (
    candidate &&
    typeof candidate.id === "string" &&
    Number.isInteger(candidate.version) &&
    Number.isInteger(candidate.createdAt) &&
    Number.isInteger(candidate.updatedAt) &&
    candidate.game &&
    Array.isArray(candidate.game.players)
  );
}

async function loadStoredRooms(storageFile, migrateRoom = (room) => room) {
  if (!storageFile) return new Map();
  let parsed;
  try {
    parsed = JSON.parse(await readFile(storageFile, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }
  const roomRecords = Array.isArray(parsed?.rooms) ? parsed.rooms : Array.isArray(parsed) ? parsed : [];
  const rooms = new Map();
  for (const record of roomRecords) {
    if (!validStoredRoom(record)) continue;
    const disconnectedRoom = disconnectLoadedSeats(record);
    rooms.set(record.id, await migrateRoom(disconnectedRoom));
  }
  return rooms;
}

export async function createRoomServer({
  allowedHosts = roomAllowedHosts(),
  aiClient: providedAiClient,
  host = "127.0.0.1",
  port = 5188,
  log = true,
  pollDisconnectMs = 15_000,
  storageFile = defaultStorageFile(),
} = {}) {
  const server = createHttpServer();
  const resolvedStorageFile = normalizeStorageFile(storageFile);
  const projectArtifactsDir = resolve("artifacts");
  const vite = await createViteServer({
    appType: "spa",
    logLevel: log ? "info" : "silent",
    server: { allowedHosts, hmr: { server }, middlewareMode: true },
  });
  let roomStateModule;
  let gameStateModule;
  let roomActionsModule;
  let aiRuntimePromise;
  let aiClientInstance;
  let saveChain = Promise.resolve();
  let saveSerial = 0;

  async function roomState() {
    roomStateModule ??= await vite.ssrLoadModule("/src/multiplayer/room-state.ts");
    return roomStateModule;
  }

  async function gameState() {
    gameStateModule ??= await vite.ssrLoadModule("/src/game/state.ts");
    return gameStateModule;
  }

  async function migrateLoadedRoom(room) {
    const {
      advancePendingAction,
      normalizeSpyObservationPosts,
      normalizeGameCardTraits,
      scoreGurneyAlwaysSmiling,
    } = await gameState();
    const { shaddamReservedContracts } = await vite.ssrLoadModule("/src/game/data.ts");
    return migrateObsoleteRevealAdjust(
      migrateReservedContractPrivacy(
        migrateCardTraits(
          migrateSpyObservationPosts(room, { normalizeSpyObservationPosts }),
          { normalizeGameCardTraits },
        ),
        { reservedContracts: shaddamReservedContracts },
      ),
      { advancePendingAction, scoreGurneyAlwaysSmiling },
    );
  }

  const rooms = await loadStoredRooms(resolvedStorageFile, migrateLoadedRoom);
  const serializedRooms = new Map([...rooms].map(([roomId, room]) => [roomId, JSON.stringify(room)]));
  let serializedRoomListDirty = true;
  let serializedRoomList = [];
  const streams = new Map();
  const pollDisconnectTimers = new Map();
  const roomWriteChains = new Map();
  const aiRuns = new Set();
  const aiRunPromises = new Set();

  async function roomActions() {
    roomActionsModule ??= await vite.ssrLoadModule("/src/multiplayer/room-actions.ts");
    return roomActionsModule;
  }

  function aiClient() {
    if (providedAiClient) return providedAiClient;
    if (process.env.DUNE_ROOM_AI_MODE === "mock") {
      aiClientInstance ??= createMockAiClient();
      return aiClientInstance;
    }
    aiClientInstance ??= createOpenAiResponseClient({
      model: process.env.DUNE_ROOM_AI_MODEL,
      reasoningEffort: process.env.DUNE_ROOM_AI_REASONING_EFFORT,
      log: log ? (...args) => console.log("[room-ai]", ...args) : undefined,
    });
    return aiClientInstance;
  }

  function aiClientCanGenerateSummary(client) {
    return typeof client.responsesCreate === "function"
      || (typeof client.proposeSummary === "function" && typeof client.voteSummary === "function");
  }

  function aiRuntime() {
    aiRuntimePromise ??= createAiRuntime({
      rooms,
      ssrLoadModule: (...args) => vite.ssrLoadModule(...args),
    });
    return aiRuntimePromise;
  }

  async function snapshotFor(room, token) {
    const { roomSnapshotFor } = await roomState();
    return roomSnapshotFor(room, token);
  }

  async function writeRoomsToDisk() {
    if (!resolvedStorageFile) return;
    const tempFile = `${resolvedStorageFile}.${process.pid}.${saveSerial += 1}.tmp`;
    await mkdir(dirname(resolvedStorageFile), { recursive: true });
    if (serializedRoomListDirty) {
      serializedRoomList = [...rooms.keys()].map((roomId) => {
        let serializedRoom = serializedRooms.get(roomId);
        if (!serializedRoom) {
          const room = rooms.get(roomId);
          serializedRoom = JSON.stringify(room);
          serializedRooms.set(roomId, serializedRoom);
        }
        return serializedRoom;
      });
      serializedRoomListDirty = false;
    }
    const payload = `{"schemaVersion":1,"savedAt":${Date.now()},"rooms":[${serializedRoomList.join(",")}]}\n`;
    await writeFile(tempFile, payload, "utf8");
    await rename(tempFile, resolvedStorageFile);
  }

  function persistRooms(changedRoom) {
    if (!resolvedStorageFile) return Promise.resolve();
    if (changedRoom) {
      serializedRooms.set(changedRoom.id, JSON.stringify(changedRoom));
      serializedRoomListDirty = true;
    } else {
      for (const [roomId, room] of rooms) serializedRooms.set(roomId, JSON.stringify(room));
      serializedRoomListDirty = true;
    }
    saveChain = saveChain.then(writeRoomsToDisk, writeRoomsToDisk);
    return saveChain;
  }

  function enqueueRoomWrite(roomId, task) {
    const previous = roomWriteChains.get(roomId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    const settled = next.catch(() => undefined);
    roomWriteChains.set(roomId, settled);
    return next.finally(() => {
      if (roomWriteChains.get(roomId) === settled) roomWriteChains.delete(roomId);
    });
  }

  async function drainRoomWrites() {
    while (roomWriteChains.size > 0) {
      await Promise.allSettled([...roomWriteChains.values()]);
    }
  }

  async function createRoom() {
    const { initialGame } = await gameState();
    let id = roomCode();
    while (rooms.has(id)) id = roomCode();
    const now = Date.now();
    const room = {
      id,
      version: 1,
      started: false,
      createdAt: now,
      updatedAt: now,
      game: initialGame({ includeSetupPending: false }),
      endgameReady: {},
      seats: {},
    };
    rooms.set(id, room);
    await persistRooms(room);
    return room;
  }

  async function broadcast(room) {
    const roomStreams = streams.get(room.id);
    if (!roomStreams) return;
    const stale = [];
    const serializedSnapshotsByToken = new Map();
    for (const client of roomStreams) {
      try {
        const cacheKey = client.token ?? "";
        let serializedSnapshot = serializedSnapshotsByToken.get(cacheKey);
        if (!serializedSnapshot) {
          serializedSnapshot = JSON.stringify(await snapshotFor(room, client.token));
          serializedSnapshotsByToken.set(cacheKey, serializedSnapshot);
        }
        sseWriteSerialized(client.response, "room", serializedSnapshot);
      } catch {
        stale.push(client);
      }
    }
    stale.forEach((client) => roomStreams.delete(client));
  }

  function tokenHasOpenStream(roomId, token) {
    if (!token) return false;
    return [...(streams.get(roomId) ?? [])].some((client) => client.token === token);
  }

  function clearPollDisconnectTimer(roomId, token) {
    if (!token) return;
    const key = pollTimerKey(roomId, token);
    const timer = pollDisconnectTimers.get(key);
    if (!timer) return;
    clearTimeout(timer);
    pollDisconnectTimers.delete(key);
  }

  function clearAllPollDisconnectTimers() {
    for (const timer of pollDisconnectTimers.values()) clearTimeout(timer);
    pollDisconnectTimers.clear();
  }

  function markDisconnected(room, token) {
    clearPollDisconnectTimer(room.id, token);
    void enqueueRoomWrite(room.id, async () => {
      if (tokenHasOpenStream(room.id, token)) return;
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (!claim || !claim.connected) return;
      claim.connected = false;
      room.version += 1;
      room.updatedAt = Date.now();
      await persistRooms(room);
      await broadcast(room);
    }).catch((error) => {
      console.error(`failed to persist disconnected room ${room.id}:`, error);
    });
  }

  function schedulePollDisconnect(room, token) {
    if (!token || tokenHasOpenStream(room.id, token)) return;
    clearPollDisconnectTimer(room.id, token);
    const timer = setTimeout(() => markDisconnected(room, token), pollDisconnectMs);
    timer.unref?.();
    pollDisconnectTimers.set(pollTimerKey(room.id, token), timer);
  }

  function requestIsPollSync(request, url) {
    return request.headers["x-room-sync"]?.toString().toLowerCase() === "poll" ||
      url.searchParams.get("sync")?.toLowerCase() === "poll";
  }

  function roomVersionFromRequest(request, url) {
    const rawVersion = request.headers["x-room-version"]?.toString() ?? url.searchParams.get("since");
    if (!rawVersion) return undefined;
    const version = Number(rawVersion);
    return Number.isInteger(version) && version > 0 ? version : undefined;
  }

  function seatClaimForToken(room, token) {
    if (!token) return undefined;
    return Object.values(room.seats).find((seat) => seat?.token === token);
  }

  async function persistAndBroadcastRoom(room) {
    room.version += 1;
    room.updatedAt = Date.now();
    await persistRooms(room);
    await broadcast(room);
  }

  function allSeatsClaimed(room) {
    return room.game.players.every((player) => room.seats[player.id]);
  }

  function roomIsStarted(room) {
    return room.started !== false ||
      Boolean(room.game.pendingAction || room.game.pendingQueue?.length > 0 || room.game.phase !== "playing");
  }

  function roomSeatsAreLocked(room) {
    return roomIsStarted(room);
  }

  function seatClaimRequiresReconnectToken(room, existing, existingTokenSeat) {
    return Boolean(existing) || room.started !== false || Boolean(roomIsStarted(room) && existingTokenSeat);
  }

  async function startRoom(room) {
    if (room.started) return;
    const { pendingActionForShaddamPersonalBoard } = await gameState();
    const setupPending = pendingActionForShaddamPersonalBoard(room.game);
    room.started = true;
    if (setupPending && !room.game.pendingAction && room.game.pendingQueue.length === 0) {
      room.game = {
        ...room.game,
        pendingAction: setupPending,
        log: [
          "Resolve Shaddam's starting Throne Row choice from the Emperor personal board.",
          ...room.game.log,
        ],
      };
    }
  }

  async function applyInternalRoomAction(room, actorId, action) {
    const {
      applyRoomAction,
      assertPlayerCanMarkEndgameReady,
      finishEndgameAfterReady,
    } = await roomActions();
    if (action?.kind === "finalize-endgame") {
      assertPlayerCanMarkEndgameReady(room.game, actorId);
      if (room.endgameReady[actorId]) {
        const error = new Error("You are already ready for Endgame finalization");
        error.status = 409;
        throw error;
      }
      room.endgameReady = { ...room.endgameReady, [actorId]: true };
      if (allPlayersEndgameReady(room)) {
        room.game = finishEndgameAfterReady(room.game);
        room.endgameReady = {};
      }
      return;
    }
    const previousPhase = room.game.phase;
    room.game = applyRoomAction(room.game, actorId, action);
    clearEndgameReadyForAction(room, action, actorId, previousPhase);
  }

  function roomTeamIds(room) {
    return [...new Set(room.game.players.map((player) => player.team))];
  }

  function opponentTeamFor(room, teamId) {
    return roomTeamIds(room).find((candidate) => candidate !== teamId);
  }

  function aiPlayerIds(room) {
    if (!room.ai?.enabled) return new Set();
    return new Set(room.game.players.filter((player) => player.team === room.ai.team).map((player) => player.id));
  }

  function previousSummaryFor(room, teamId) {
    return room.ai?.previousSummaries?.[teamId] ?? "";
  }

  async function aiTeamSeatSnapshots(room, runtime, teamId, note) {
    const legalCandidates = nextActionSeats(room, runtime);
    const snapshots = [];
    for (const player of room.game.players.filter((candidate) => candidate.team === teamId)) {
      const token = room.seats[player.id]?.token;
      if (!token) continue;
      const legalActions = legalCandidates.find((candidate) => candidate.player.id === player.id)?.legalActions ?? [];
      const roomSnapshot = await snapshotFor(room, token);
      const aiSnapshot = buildAiSeatSnapshot({
        roomSnapshot,
        teamId,
        legalActions,
        previousSummary: previousSummaryFor(room, teamId),
        note,
      });
      assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, room.game);
      snapshots.push(aiSnapshot);
    }
    return snapshots;
  }

  async function maybeDiscussAiRound(room, runtime, client) {
    if (!aiClientCanGenerateSummary(client)) return;
    if (!room.ai?.enabled || room.game.phase !== "playing") return;
    const completedRound = room.game.round - 1;
    if (completedRound < 1 || completedRound <= (room.ai.lastDiscussedCompletedRound ?? 0)) return;
    const teamId = room.ai.team;
    const snapshots = await aiTeamSeatSnapshots(room, runtime, teamId, `Review completed round ${completedRound}.`);
    if (!snapshots.length) return;
    const discussion = await discussRoundSummary({
      aiClient: client,
      completedRound,
      previousSummary: previousSummaryFor(room, teamId),
      seatSnapshots: snapshots,
      teamId,
    });
    await enqueueRoomWrite(room.id, async () => {
      const latest = rooms.get(room.id);
      if (!latest?.ai?.enabled || latest.ai.team !== teamId) return;
      if (latest.game.phase !== "playing" || latest.game.round - 1 !== completedRound) return;
      if (completedRound <= (latest.ai.lastDiscussedCompletedRound ?? 0)) return;
      latest.ai.previousSummaries = { ...(latest.ai.previousSummaries ?? {}), [teamId]: discussion.summary };
      latest.ai.lastDiscussedCompletedRound = completedRound;
      await persistAndBroadcastRoom(latest);
    });
  }

  function aiRoundDiscussionIsPending(room) {
    if (!room.ai?.enabled || room.game.phase !== "playing") return false;
    const completedRound = room.game.round - 1;
    return completedRound >= 1 && completedRound > (room.ai.lastDiscussedCompletedRound ?? 0);
  }

  function aiActionIsPending(room, runtime) {
    if (!roomIsStarted(room)) return false;
    const controlledIds = aiPlayerIds(room);
    if (controlledIds.size === 0) return false;
    return nextActionSeats(room, runtime).some((entry) => controlledIds.has(entry.player.id));
  }

  async function markAiStatus(roomId, status, error) {
    await enqueueRoomWrite(roomId, async () => {
      const room = rooms.get(roomId);
      if (!room?.ai?.enabled) return;
      if (room.ai.status === status && room.ai.error === error) return;
      room.ai.status = status;
      room.ai.error = error;
      await persistAndBroadcastRoom(room);
    });
  }

  async function chooseAndApplyAiStep(roomId, runtime, client) {
    const invalidActionIds = new Set();
    let lastError = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const room = rooms.get(roomId);
      if (!room?.ai?.enabled || room.game.phase === "finished") return false;
      if (!roomIsStarted(room)) return false;
      const baseVersion = room.version;
      const controlledIds = aiPlayerIds(room);
      const candidate = nextActionSeats(room, runtime).find((entry) => controlledIds.has(entry.player.id));
      if (!candidate) return false;
      if (room.ai.status !== "running" || room.ai.error) {
        await markAiStatus(roomId, "running", undefined);
        continue;
      }
      const token = room.seats[candidate.player.id]?.token;
      if (!token) {
        throw new Error(`AI seat ${candidate.player.id} is missing its reconnect token`);
      }
      const legalActions = candidate.legalActions.filter((action) => !invalidActionIds.has(action.id));
      if (!legalActions.length) {
        throw new Error(`AI ${candidate.player.name} has no remaining legal action after rejected attempts`);
      }
      const roomSnapshot = await snapshotFor(room, token);
      const aiSnapshot = buildAiSeatSnapshot({
        roomSnapshot,
        teamId: room.ai.team,
        legalActions,
        previousSummary: previousSummaryFor(room, room.ai.team),
        note: lastError ? `Previous selected action was rejected: ${lastError}` : undefined,
      });
      assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, room.game);
      const selected = await chooseAiAction({
        aiClient: client,
        snapshot: aiSnapshot,
        legalActions,
        invalidActionIds,
      });
      const result = await enqueueRoomWrite(roomId, async () => {
        const latest = rooms.get(roomId);
        if (!latest?.ai?.enabled) return { applied: false };
        if (latest.version !== baseVersion) return { retry: true };
        try {
          await applyInternalRoomAction(latest, candidate.player.id, selected.action.action);
        } catch (error) {
          return {
            invalidActionId: selected.action.id,
            error: error instanceof Error ? error.message : "Unable to apply AI action",
          };
        }
        latest.ai.status = "running";
        latest.ai.error = undefined;
        latest.ai.actionCount = (latest.ai.actionCount ?? 0) + 1;
        latest.ai.lastActiveAt = Date.now();
        await persistAndBroadcastRoom(latest);
        return { applied: true };
      });
      if (result.applied) return true;
      if (result.retry) continue;
      if (result.invalidActionId) {
        invalidActionIds.add(result.invalidActionId);
        lastError = result.error;
        continue;
      }
      return false;
    }
    throw new Error(lastError || "AI could not find a valid action");
  }

  function scheduleAiRoom(roomId) {
    if (aiRuns.has(roomId)) return;
    setTimeout(() => {
      const runPromise = runAiRoom(roomId).catch((error) => {
        console.error(`room AI loop failed for ${roomId}:`, error);
      }).finally(() => aiRunPromises.delete(runPromise));
      aiRunPromises.add(runPromise);
    }, 0).unref?.();
  }

  async function runAiRoom(roomId) {
    if (aiRuns.has(roomId)) return;
    aiRuns.add(roomId);
    try {
      const runtime = await aiRuntime();
      const client = aiClient();
      let acted = false;
      for (let steps = 0; steps < 200; steps += 1) {
        const room = rooms.get(roomId);
        if (!room?.ai?.enabled) return;
        if (room.game.phase === "finished") {
          await markAiStatus(roomId, "idle", undefined);
          return;
        }
        if (
          (room.ai.status !== "running" || room.ai.error) &&
          (aiRoundDiscussionIsPending(room) || aiActionIsPending(room, runtime))
        ) {
          await markAiStatus(roomId, "running", undefined);
        }
        await maybeDiscussAiRound(room, runtime, client);
        acted = await chooseAndApplyAiStep(roomId, runtime, client);
        if (!acted) {
          await markAiStatus(roomId, "idle", undefined);
          return;
        }
      }
      if (acted) scheduleAiRoom(roomId);
    } catch (error) {
      await markAiStatus(roomId, "error", error instanceof Error ? error.message : "AI automation failed");
    } finally {
      aiRuns.delete(roomId);
    }
  }

  async function handleApi(request, response, url) {
    const createRoomMatch = request.method === "POST" && url.pathname === "/api/rooms";
    if (createRoomMatch) {
      const room = await createRoom();
      return sendJson(response, 201, await snapshotFor(room));
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
    if (request.method === "GET" && roomMatch) {
      const room = rooms.get(roomMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const token = tokenFromRequest(request, url);
      const knownVersion = roomVersionFromRequest(request, url);
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (claim) {
        await enqueueRoomWrite(room.id, async () => {
          const latestClaim = Object.values(room.seats).find((seat) => seat?.token === token);
          if (!latestClaim) return;
          if (requestIsPollSync(request, url)) schedulePollDisconnect(room, token);
          if (latestClaim.connected) return;
          latestClaim.connected = true;
          room.version += 1;
          room.updatedAt = Date.now();
          await persistRooms(room);
          await broadcast(room);
        });
      }
      if (requestIsPollSync(request, url) && knownVersion === room.version && (!token || claim)) {
        return sendNoContent(response);
      }
      return sendJson(response, 200, await snapshotFor(room, token));
    }

    const claimMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/seats\/([^/]+)\/claim$/);
    if (request.method === "POST" && claimMatch) {
      const room = rooms.get(claimMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const playerId = decodeURIComponent(claimMatch[2]);
      const player = room.game.players.find((candidate) => candidate.id === playerId);
      if (!player) return sendError(response, 404, "Seat not found");
      const body = await readJson(request);
      const name = String(body.name ?? "").trim().slice(0, 32) || player.name;
      const previousToken = typeof body.token === "string" ? body.token : undefined;
      return await enqueueRoomWrite(room.id, async () => {
        const existing = room.seats[playerId];
        const existingTokenSeat = seatClaimForToken(room, previousToken);
        if (seatClaimRequiresReconnectToken(room, existing, existingTokenSeat)) {
          const tokenOwnsTargetSeat = Boolean(previousToken && (
            existing?.token === previousToken ||
            existingTokenSeat?.playerId === playerId
          ));
          if (!tokenOwnsTargetSeat) {
            return sendError(response, 409, existing ? "Claimed seat requires its reconnect token" : "Started rooms do not allow new seat claims");
          }
        }
        if (existing && existing.token !== previousToken && existing.connected) {
          return sendError(response, 409, "Seat already claimed");
        }
        if (existingTokenSeat && existingTokenSeat.playerId !== playerId) {
          if (existing) return sendError(response, 409, "Reconnect token already belongs to another claimed seat");
          room.seats[existingTokenSeat.playerId] = undefined;
        }
        const token = previousToken && (existing?.token === previousToken || existingTokenSeat)
          ? previousToken
          : reconnectToken();
        if (existing?.token && existing.token !== token) clearPollDisconnectTimer(room.id, existing.token);
        room.seats[playerId] = {
          playerId,
          name,
          token,
          connected: true,
        };
        if (requestIsPollSync(request, url)) schedulePollDisconnect(room, token);
        await persistAndBroadcastRoom(room);
        return sendJson(response, 200, {
          token,
          snapshot: await snapshotFor(room, token),
        });
      });
    }

    const startMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/start$/);
    if (request.method === "POST" && startMatch) {
      const room = rooms.get(startMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const token = tokenFromRequest(request, url);
      return await enqueueRoomWrite(room.id, async () => {
        const claim = Object.values(room.seats).find((seat) => seat?.token === token);
        if (!claim) return sendError(response, 401, "Claim a seat before starting the room");
        if (!allSeatsClaimed(room)) return sendError(response, 409, "Claim all six seats before starting the room");
        if (!room.started) {
          await startRoom(room);
          await persistAndBroadcastRoom(room);
        }
        scheduleAiRoom(room.id);
        return sendJson(response, 200, { snapshot: await snapshotFor(room, token) });
      });
    }

    const releaseMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/seats\/([^/]+)\/release$/);
    if (request.method === "POST" && releaseMatch) {
      const room = rooms.get(releaseMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const playerId = decodeURIComponent(releaseMatch[2]);
      const token = tokenFromRequest(request, url);
      return await enqueueRoomWrite(room.id, async () => {
        const existing = room.seats[playerId];
        if (!existing) return sendError(response, 409, "Seat is not claimed");
        if (roomSeatsAreLocked(room)) return sendError(response, 409, "Started seats cannot be released");
        if (!token || existing.token !== token) {
          return sendError(response, 403, "Only the current seat token can release that seat");
        }
        clearPollDisconnectTimer(room.id, existing.token);
        room.seats[playerId] = undefined;
        await persistAndBroadcastRoom(room);
        return sendJson(response, 200, { snapshot: await snapshotFor(room, token) });
      });
    }

    const aiFillMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/ai\/fill$/);
    if (request.method === "POST" && aiFillMatch) {
      const room = rooms.get(aiFillMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const token = tokenFromRequest(request, url);
      try {
        aiClient();
      } catch (error) {
        return sendError(response, 503, error instanceof Error ? error.message : "AI client is not available");
      }
      return await enqueueRoomWrite(room.id, async () => {
        const claim = Object.values(room.seats).find((seat) => seat?.token === token);
        if (!claim || claim.ai) return sendError(response, 401, "Claim a human seat before filling AI opponents");
        if (room.ai?.enabled) return sendError(response, 409, "AI opponents are already filled");
        const player = room.game.players.find((candidate) => candidate.id === claim.playerId);
        if (!player) return sendError(response, 404, "Claimed player is no longer in this room");
        const aiTeam = opponentTeamFor(room, player.team);
        if (!aiTeam) return sendError(response, 409, "This room does not have an opposing team");
        const humanTeamSeats = room.game.players.filter((candidate) => candidate.team === player.team);
        const opponentSeats = room.game.players.filter((candidate) => candidate.team === aiTeam);
        if (!humanTeamSeats.every((candidate) => room.seats[candidate.id] && !room.seats[candidate.id]?.ai)) {
          return sendError(response, 409, "Claim all three seats on your team before filling AI opponents");
        }
        if (!opponentSeats.every((candidate) => !room.seats[candidate.id] || room.seats[candidate.id]?.ai)) {
          return sendError(response, 409, "The opposing team already has a human player");
        }
        for (const opponent of opponentSeats) {
          room.seats[opponent.id] = {
            playerId: opponent.id,
            name: `AI ${opponent.leader}`,
            token: reconnectToken(),
            connected: true,
            ai: true,
          };
        }
        room.ai = {
          enabled: true,
          team: aiTeam,
          status: "idle",
          actionCount: room.ai?.actionCount ?? 0,
          previousSummaries: room.ai?.previousSummaries ?? {},
          lastDiscussedCompletedRound: room.ai?.lastDiscussedCompletedRound ?? 0,
        };
        await persistAndBroadcastRoom(room);
        scheduleAiRoom(room.id);
        return sendJson(response, 200, { snapshot: await snapshotFor(room, token) });
      });
    }

    const actionMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/actions$/);
    if (request.method === "POST" && actionMatch) {
      const room = rooms.get(actionMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const token = tokenFromRequest(request, url);
      const body = await readJson(request);
      return await enqueueRoomWrite(room.id, async () => {
        const claim = Object.values(room.seats).find((seat) => seat?.token === token);
        if (!claim) return sendError(response, 401, "Claim a seat before taking room actions");
        if (!roomIsStarted(room)) {
          return sendJson(response, 409, {
            error: "Start the room before taking game actions",
            snapshot: await snapshotFor(room, token),
          });
        }
        if (body.baseVersion !== room.version) {
          if (actionLooksLikeResolvedPendingRetry(body.action, room.game.pendingAction)) {
            return sendJson(response, 200, { snapshot: await snapshotFor(room, token) });
          }
          return sendJson(response, 409, {
            error: "Room state changed; refresh and try again",
            snapshot: await snapshotFor(room, token),
          });
        }
        try {
          await applyInternalRoomAction(room, claim.playerId, body.action);
        } catch (error) {
          const status = Number.isInteger(error?.status) ? error.status : 500;
          const message = error instanceof Error ? error.message : "Unable to apply room action";
          return sendError(response, status, message);
        }
        await persistAndBroadcastRoom(room);
        scheduleAiRoom(room.id);
        return sendJson(response, 200, { snapshot: await snapshotFor(room, token) });
      });
    }

    const eventsMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/events$/);
    if (request.method === "GET" && eventsMatch) {
      const room = rooms.get(eventsMatch[1]);
      if (!room) return sendError(response, 404, "Room not found");
      const token = tokenFromRequest(request, url);
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      response.write("retry: 1000\n\n");
      const roomStreams = streams.get(room.id) ?? new Set();
      streams.set(room.id, roomStreams);
      const client = { response, token };
      roomStreams.add(client);
      clearPollDisconnectTimer(room.id, token);
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (claim && !claim.connected) {
        await enqueueRoomWrite(room.id, async () => {
          const latestClaim = Object.values(room.seats).find((seat) => seat?.token === token);
          if (!latestClaim || latestClaim.connected) return;
          latestClaim.connected = true;
          room.version += 1;
          room.updatedAt = Date.now();
          await persistRooms(room);
          await broadcast(room);
        });
      }
      sseWrite(response, "room", await snapshotFor(room, token));
      request.on("close", () => {
        roomStreams.delete(client);
        markDisconnected(room, token);
      });
      return undefined;
    }

    return sendError(response, 404, "API route not found");
  }

  function staticFileIsBlocked(filePath) {
    if (isPathInside(filePath, projectArtifactsDir)) return true;
    if (!resolvedStorageFile) return false;
    const normalizedFilePath = filePath.toLowerCase();
    const normalizedStorageFile = resolvedStorageFile.toLowerCase();
    return normalizedFilePath === normalizedStorageFile || normalizedFilePath.startsWith(`${normalizedStorageFile}.`);
  }

  function staticRequestIsBlocked(url) {
    let decodedPathname;
    try {
      decodedPathname = decodeURIComponent(url.pathname);
    } catch {
      return true;
    }
    const pathname = decodedPathname.toLowerCase();
    if (pathname === "/artifacts" || pathname.startsWith("/artifacts/")) return true;
    try {
      if (pathname.startsWith("/@fs/")) return staticFileIsBlocked(resolve(decodedPathname.slice("/@fs".length)));
      const relativeStaticPath = decodedPathname.replace(/^\/+/, "");
      return [resolve(relativeStaticPath), resolve("public", relativeStaticPath)].some(staticFileIsBlocked);
    } catch {
      return true;
    }
  }

  server.on("request", async (request, response) => {
    assert.ok(request.url, "HTTP request should include a URL");
    const url = new URL(request.url, `http://${request.headers.host ?? `${host}:${port}`}`);
    if (url.pathname.startsWith("/api/")) {
      try {
        await handleApi(request, response, url);
      } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 500;
        const message = error instanceof Error ? error.message : "Unexpected room server error";
        sendError(response, status, message);
      }
      return;
    }
    if (staticRequestIsBlocked(url)) {
      sendError(response, 404, "Not found");
      return;
    }
    vite.middlewares(request, response);
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object", "Room server should listen on a TCP port");
  const url = `http://${address.address === "::" ? "127.0.0.1" : address.address}:${address.port}/`;
  for (const room of rooms.values()) {
    if (room.ai?.enabled) scheduleAiRoom(room.id);
  }

  return {
    rooms,
    resolvedUrls: { local: [url] },
    storageFile: resolvedStorageFile,
    ssrLoadModule: (...args) => vite.ssrLoadModule(...args),
    close: async () => {
      clearAllPollDisconnectTimers();
      for (const roomStreams of streams.values()) {
        for (const client of roomStreams) client.response.end();
      }
      await Promise.allSettled([...aiRunPromises]);
      await drainRoomWrites();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await drainRoomWrites();
      await persistRooms();
      await vite.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const hostArg = process.argv.find((arg) => arg.startsWith("--host="));
  const storageArg = process.argv.find((arg) => arg.startsWith("--storage-file="));
  const allowedHostArgs = process.argv
    .filter((arg) => arg.startsWith("--allowed-host="))
    .map((arg) => arg.slice("--allowed-host=".length))
    .filter(Boolean);
  const server = await createRoomServer({
    allowedHosts: roomAllowedHosts(allowedHostArgs),
    host: hostArg ? hostArg.slice("--host=".length) : "0.0.0.0",
    port: portArg ? Number(portArg.slice("--port=".length)) : 5188,
    storageFile: process.argv.includes("--no-storage")
      ? false
      : storageArg
        ? storageArg.slice("--storage-file=".length)
        : undefined,
  });
  console.log(`private room server ready: ${server.resolvedUrls.local[0]}`);
  if (server.storageFile) console.log(`room storage file: ${server.storageFile}`);
}
