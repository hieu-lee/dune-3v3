#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer as createViteServer } from "vite";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

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

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function tokenFromRequest(request, url) {
  return request.headers["x-room-token"]?.toString() || url.searchParams.get("token") || undefined;
}

function sseWrite(response, event, data) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
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

function isPathInside(child, parent) {
  const rel = relative(parent.toLowerCase(), child.toLowerCase());
  return rel === "" || (rel && !rel.startsWith("..") && !rel.startsWith(sep));
}

function disconnectLoadedSeats(room) {
  return {
    ...room,
    endgameReady: room.endgameReady ?? {},
    seats: Object.fromEntries(
      Object.entries(room.seats ?? {}).map(([playerId, seat]) => [
        playerId,
        seat ? { ...seat, connected: false } : undefined,
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
  host = "127.0.0.1",
  port = 5188,
  log = true,
  storageFile = defaultStorageFile(),
} = {}) {
  const server = createHttpServer();
  const resolvedStorageFile = normalizeStorageFile(storageFile);
  const projectArtifactsDir = resolve("artifacts");
  const vite = await createViteServer({
    appType: "spa",
    logLevel: log ? "info" : "silent",
    server: { hmr: { server }, middlewareMode: true },
  });
  let roomStateModule;
  let gameStateModule;
  let roomActionsModule;
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
    const { advancePendingAction, scoreGurneyAlwaysSmiling } = await gameState();
    return migrateObsoleteRevealAdjust(room, { advancePendingAction, scoreGurneyAlwaysSmiling });
  }

  const rooms = await loadStoredRooms(resolvedStorageFile, migrateLoadedRoom);
  const streams = new Map();
  const roomWriteChains = new Map();

  async function roomActions() {
    roomActionsModule ??= await vite.ssrLoadModule("/src/multiplayer/room-actions.ts");
    return roomActionsModule;
  }

  async function snapshotFor(room, token) {
    const { roomSnapshotFor } = await roomState();
    return roomSnapshotFor(room, token);
  }

  async function writeRoomsToDisk() {
    if (!resolvedStorageFile) return;
    const tempFile = `${resolvedStorageFile}.${process.pid}.${saveSerial += 1}.tmp`;
    await mkdir(dirname(resolvedStorageFile), { recursive: true });
    const payload = {
      schemaVersion: 1,
      savedAt: Date.now(),
      rooms: [...rooms.values()],
    };
    await writeFile(tempFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await rename(tempFile, resolvedStorageFile);
  }

  function persistRooms() {
    if (!resolvedStorageFile) return Promise.resolve();
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

  async function createRoom() {
    const { initialGame } = await gameState();
    let id = roomCode();
    while (rooms.has(id)) id = roomCode();
    const now = Date.now();
    const room = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      game: initialGame(),
      endgameReady: {},
      seats: {},
    };
    rooms.set(id, room);
    await persistRooms();
    return room;
  }

  async function broadcast(room) {
    const roomStreams = streams.get(room.id);
    if (!roomStreams) return;
    const stale = [];
    for (const client of roomStreams) {
      try {
        sseWrite(client.response, "room", await snapshotFor(room, client.token));
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

  function markDisconnected(room, token) {
    void enqueueRoomWrite(room.id, async () => {
      if (tokenHasOpenStream(room.id, token)) return;
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (!claim || !claim.connected) return;
      claim.connected = false;
      room.version += 1;
      room.updatedAt = Date.now();
      await persistRooms();
      await broadcast(room);
    }).catch((error) => {
      console.error(`failed to persist disconnected room ${room.id}:`, error);
    });
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
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (claim && !claim.connected) {
        await enqueueRoomWrite(room.id, async () => {
          const latestClaim = Object.values(room.seats).find((seat) => seat?.token === token);
          if (!latestClaim || latestClaim.connected) return;
          latestClaim.connected = true;
          room.version += 1;
          room.updatedAt = Date.now();
          await persistRooms();
          await broadcast(room);
        });
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
        if (existing && existing.token !== previousToken) {
          return sendError(response, 409, "Seat already claimed");
        }
        const existingTokenSeat = Object.values(room.seats).find((seat) => seat?.token === previousToken);
        if (!existing && existingTokenSeat && existingTokenSeat.playerId !== playerId) {
          return sendError(response, 409, "Reconnect token already belongs to another seat");
        }
        const token = existing?.token ?? previousToken ?? reconnectToken();
        room.seats[playerId] = {
          playerId,
          name,
          token,
          connected: true,
        };
        room.version += 1;
        room.updatedAt = Date.now();
        await persistRooms();
        await broadcast(room);
        return sendJson(response, 200, {
          token,
          snapshot: await snapshotFor(room, token),
        });
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
        if (body.baseVersion !== room.version) {
          return sendJson(response, 409, {
            error: "Room state changed; refresh and try again",
            snapshot: await snapshotFor(room, token),
          });
        }
        try {
          const action = body.action;
          const {
            applyRoomAction,
            assertPlayerCanMarkEndgameReady,
            finishEndgameAfterReady,
          } = await roomActions();
          if (action?.kind === "finalize-endgame") {
            assertPlayerCanMarkEndgameReady(room.game, claim.playerId);
            if (room.endgameReady[claim.playerId]) {
              return sendError(response, 409, "You are already ready for Endgame finalization");
            }
            room.endgameReady = { ...room.endgameReady, [claim.playerId]: true };
            if (allPlayersEndgameReady(room)) {
              room.game = finishEndgameAfterReady(room.game);
              room.endgameReady = {};
            }
          } else {
            const previousPhase = room.game.phase;
            room.game = applyRoomAction(room.game, claim.playerId, action);
            clearEndgameReadyForAction(room, action, claim.playerId, previousPhase);
          }
        } catch (error) {
          const status = Number.isInteger(error?.status) ? error.status : 500;
          const message = error instanceof Error ? error.message : "Unable to apply room action";
          return sendError(response, status, message);
        }
        room.version += 1;
        room.updatedAt = Date.now();
        await persistRooms();
        await broadcast(room);
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
      const claim = Object.values(room.seats).find((seat) => seat?.token === token);
      if (claim && !claim.connected) {
        await enqueueRoomWrite(room.id, async () => {
          const latestClaim = Object.values(room.seats).find((seat) => seat?.token === token);
          if (!latestClaim || latestClaim.connected) return;
          latestClaim.connected = true;
          room.version += 1;
          room.updatedAt = Date.now();
          await persistRooms();
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
        const message = error instanceof Error ? error.message : "Unexpected room server error";
        sendError(response, 500, message);
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

  return {
    rooms,
    resolvedUrls: { local: [url] },
    storageFile: resolvedStorageFile,
    ssrLoadModule: (...args) => vite.ssrLoadModule(...args),
    close: async () => {
      for (const roomStreams of streams.values()) {
        for (const client of roomStreams) client.response.end();
      }
      await Promise.allSettled([...roomWriteChains.values()]);
      await persistRooms();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await vite.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const hostArg = process.argv.find((arg) => arg.startsWith("--host="));
  const storageArg = process.argv.find((arg) => arg.startsWith("--storage-file="));
  const server = await createRoomServer({
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
