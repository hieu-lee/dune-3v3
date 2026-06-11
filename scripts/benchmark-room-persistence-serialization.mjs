#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { createServer as createViteServer } from "vite";

const iterations = numericArg("--iterations", 5);
const warmupIterations = numericArg("--warmup", 1);
const sampleCount = numericArg("--samples", 3);
const roomCounts = listArg("--rooms", [1, 10]);

function numericArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!match) return fallback;
  const value = Number(match.slice(name.length + 1));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function listArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!match) return fallback;
  const values = match
    .slice(name.length + 1)
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  return values.length > 0 ? values : fallback;
}

function cycle(items, count) {
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_entry, index) => ({
    ...items[index % items.length],
    id: `${items[index % items.length].id}-bench-${index}`,
  }));
}

function stressGame(game, data) {
  const deckCards = cycle(data.imperiumDeck, 80);
  const intrigueCards = cycle(data.intrigueCards, 12);
  const contractCards = cycle(data.standardContracts, 12);
  return {
    ...game,
    marketDeck: deckCards,
    contractDeck: contractCards,
    intrigueDeck: intrigueCards,
    conflictDeck: cycle(data.conflictCards, 9),
    players: game.players.map((player) => ({
      ...player,
      deck: deckCards.map((card, index) => ({ ...card, id: `${player.id}-deck-${index}` })),
      hand: deckCards.slice(0, 15).map((card, index) => ({ ...card, id: `${player.id}-hand-${index}` })),
      manipulatedCards: deckCards.slice(15, 25).map((card, index) => ({ ...card, id: `${player.id}-manipulated-${index}` })),
      intrigues: intrigueCards.map((card, index) => ({ ...card, id: `${player.id}-intrigue-${index}` })),
      reservedContracts: contractCards.map((contract, index) => ({ ...contract, id: `${player.id}-contract-${index}` })),
    })),
  };
}

function makeRoom(game, index) {
  return {
    id: `BENCH-${String(index).padStart(3, "0")}`,
    version: index + 1,
    started: true,
    createdAt: 1,
    updatedAt: index + 1,
    game: {
      ...game,
      round: game.round + (index % 5),
    },
    endgameReady: {},
    seats: {
      p1: { playerId: "p1", name: `Seat 1 ${index}`, token: `token-p1-${index}`, connected: index % 2 === 0 },
      p2: { playerId: "p2", name: `Seat 2 ${index}`, token: `token-p2-${index}`, connected: index % 3 === 0 },
      p3: { playerId: "p3", name: `Seat 3 ${index}`, token: `token-p3-${index}`, connected: index % 5 === 0 },
    },
  };
}

function payloadFor(game, count) {
  return {
    schemaVersion: 1,
    savedAt: 1_700_000_000_000,
    rooms: Array.from({ length: count }, (_entry, index) => makeRoom(game, index)),
  };
}

function measure(label, payload, serialize) {
  for (let index = 0; index < warmupIterations; index += 1) serialize(payload);
  globalThis.gc?.();
  const samples = [];
  let bytes = 0;
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      bytes = Buffer.byteLength(serialize(payload), "utf8");
    }
    const durationMs = performance.now() - startedAt;
    samples.push(durationMs / iterations);
  }
  samples.sort((left, right) => left - right);
  const medianMsPerSave = samples[Math.floor(samples.length / 2)];
  return {
    label,
    medianMsPerSave: Number(medianMsPerSave.toFixed(3)),
    bytes,
  };
}

function measureCachedChangedRoom(payload) {
  const roomIds = payload.rooms.map((room) => room.id);
  const roomsById = new Map(payload.rooms.map((room) => [room.id, room]));
  const serializedRooms = new Map(payload.rooms.map((room) => [room.id, JSON.stringify(room)]));
  function serializeChangedRoom(iteration) {
    const roomId = roomIds[iteration % roomIds.length];
    const room = roomsById.get(roomId);
    serializedRooms.set(roomId, JSON.stringify({
      ...room,
      updatedAt: room.updatedAt + iteration + 1,
    }));
    const serializedRoomList = roomIds.map((id) => {
      let serializedRoom = serializedRooms.get(id);
      if (!serializedRoom) {
        serializedRoom = JSON.stringify(roomsById.get(id));
        serializedRooms.set(id, serializedRoom);
      }
      return serializedRoom;
    });
    return `{"schemaVersion":${payload.schemaVersion},"savedAt":${payload.savedAt + iteration},"rooms":[${serializedRoomList.join(",")}]}\n`;
  }
  for (let index = 0; index < warmupIterations; index += 1) serializeChangedRoom(index);
  globalThis.gc?.();
  const samples = [];
  let bytes = 0;
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      bytes = Buffer.byteLength(serializeChangedRoom(sample * iterations + index), "utf8");
    }
    const durationMs = performance.now() - startedAt;
    samples.push(durationMs / iterations);
  }
  samples.sort((left, right) => left - right);
  const medianMsPerSave = samples[Math.floor(samples.length / 2)];
  return {
    label: "cached-compact-json",
    medianMsPerSave: Number(medianMsPerSave.toFixed(3)),
    bytes,
  };
}

const vite = await createViteServer({ appType: "spa", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { initialGame } = await vite.ssrLoadModule("/src/game/state.ts");
  const data = await vite.ssrLoadModule("/src/game/data.ts");
  const game = stressGame(initialGame({ includeSetupPending: false }), data);

  const results = roomCounts.map((roomCount) => {
    const payload = payloadFor(game, roomCount);
    const pretty = measure("pretty-json", payload, (value) => `${JSON.stringify(value, null, 2)}\n`);
    const compact = measure("compact-json", payload, (value) => `${JSON.stringify(value)}\n`);
    const cachedCompact = measureCachedChangedRoom(payload);
    return {
      roomCount,
      pretty,
      compact,
      cachedCompact,
      speedup: Number((pretty.medianMsPerSave / compact.medianMsPerSave).toFixed(2)),
      cachedSpeedup: Number((compact.medianMsPerSave / cachedCompact.medianMsPerSave).toFixed(2)),
      byteReduction: Number((1 - compact.bytes / pretty.bytes).toFixed(3)),
    };
  });

  console.log(JSON.stringify({
    benchmark: "room-persistence-serialization",
    iterations,
    warmupIterations,
    sampleCount,
    results,
  }, null, 2));
} finally {
  await vite.close();
}
