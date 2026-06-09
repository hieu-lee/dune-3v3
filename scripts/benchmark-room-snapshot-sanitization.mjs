#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { createServer as createViteServer } from "vite";

const iterations = numericArg("--iterations", 20_000);
const warmupIterations = numericArg("--warmup", 2_000);
const stressMultiplier = numericArg("--stress-multiplier", 12);
const sampleCount = numericArg("--samples", 5);

function numericArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!match) return fallback;
  const value = Number(match.slice(name.length + 1));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function cycle(items, count) {
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_entry, index) => ({
    ...items[index % items.length],
    id: `${items[index % items.length].id}-bench-${index}`,
  }));
}

function stressGame(game, data) {
  const deckCards = cycle(data.imperiumDeck, stressMultiplier * 40);
  const handCards = cycle(data.imperiumDeck.slice(20), stressMultiplier * 8);
  const intrigueCards = cycle(data.intrigueCards, stressMultiplier * 4);
  const conflictCards = cycle(data.conflictCards, stressMultiplier * 3);
  const contractCards = cycle(data.standardContracts, stressMultiplier * 4);

  return {
    ...game,
    marketDeck: deckCards,
    contractDeck: contractCards,
    intrigueDeck: intrigueCards,
    conflictDeck: conflictCards,
    pendingQueue: [
      {
        kind: "top-deck-selection",
        ownerId: "p1",
        source: "Benchmark queue owner",
        lookCards: 3,
        drawCards: 1,
        discardCards: 1,
        trashCards: 1,
        inspectedCards: handCards.slice(0, 3),
      },
      {
        kind: "top-deck-selection",
        ownerId: "p2",
        source: "Benchmark queue opponent",
        lookCards: 3,
        drawCards: 1,
        discardCards: 1,
        trashCards: 1,
        inspectedCards: handCards.slice(3, 6),
      },
    ],
    players: game.players.map((player, playerIndex) => ({
      ...player,
      deck: deckCards.map((card, index) => ({ ...card, id: `${player.id}-deck-${index}` })),
      hand: handCards.map((card, index) => ({ ...card, id: `${player.id}-hand-${index}` })),
      manipulatedCards: handCards.map((card, index) => ({ ...card, id: `${player.id}-manipulated-${index}` })),
      intrigues: intrigueCards.map((card, index) => ({ ...card, id: `${player.id}-intrigue-${index}` })),
      objectives: cycle(player.objectives, player.objectives.length * stressMultiplier)
        .map((objective, index) => ({
          ...objective,
          id: `${player.id}-objective-${index}`,
          scored: playerIndex % 2 === 0 && index % 3 === 0,
        })),
      reservedContracts: player.id === "p4"
        ? contractCards.map((contract, index) => ({ ...contract, id: `${player.id}-reserved-${index}` }))
        : player.reservedContracts,
    })),
  };
}

function makeRoom(game) {
  return {
    id: "BENCH",
    version: 1,
    started: true,
    createdAt: 1,
    updatedAt: 1,
    game,
    endgameReady: {},
    seats: {
      p1: { playerId: "p1", name: "Seat 1", token: "token-p1", connected: true },
      p2: { playerId: "p2", name: "Seat 2", token: "token-p2", connected: true },
      p3: { playerId: "p3", name: "Seat 3", token: "token-p3", connected: true },
    },
  };
}

function hiddenReferences(snapshot) {
  return [
    ...snapshot.game.marketDeck,
    ...snapshot.game.contractDeck,
    ...snapshot.game.intrigueDeck,
    ...snapshot.game.conflictDeck,
    ...snapshot.game.players.flatMap((player) => [
      ...player.deck,
      ...player.hand,
      ...player.manipulatedCards,
      ...player.intrigues,
      ...player.objectives.filter((objective) => objective.name === "Hidden Objective" || objective.name === "Scored Objective"),
      ...player.reservedContracts,
    ]),
  ];
}

function hiddenArrays(snapshot) {
  return [
    snapshot.game.marketDeck,
    snapshot.game.contractDeck,
    snapshot.game.intrigueDeck,
    snapshot.game.conflictDeck,
    ...snapshot.game.players.flatMap((player) => [
      player.deck,
      player.hand,
      player.manipulatedCards,
      player.intrigues,
      player.objectives,
      player.reservedContracts,
    ]),
  ].filter((entries) => entries.length > 0);
}

function placeholderReuseRatio(snapshotFor, room, token) {
  const first = hiddenReferences(snapshotFor(room, token));
  const second = hiddenReferences(snapshotFor(room, token));
  const secondRefs = new Set(second);
  const reused = first.filter((entry) => secondRefs.has(entry)).length;
  return first.length === 0 ? 1 : reused / first.length;
}

function hiddenArrayReuseRatio(snapshotFor, room, token) {
  const first = hiddenArrays(snapshotFor(room, token));
  const second = hiddenArrays(snapshotFor(room, token));
  const secondRefs = new Set(second);
  const reused = first.filter((entry) => secondRefs.has(entry)).length;
  return first.length === 0 ? 1 : reused / first.length;
}

function measure(label, snapshotFor, room, token) {
  for (let index = 0; index < warmupIterations; index += 1) snapshotFor(room, token);
  globalThis.gc?.();
  const samples = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) snapshotFor(room, token);
    const durationMs = performance.now() - startedAt;
    samples.push(durationMs);
  }
  samples.sort((left, right) => left - right);
  const medianMs = samples[Math.floor(samples.length / 2)];
  return {
    label,
    iterations,
    medianMs: Number(medianMs.toFixed(3)),
    snapshotsPerSecond: Number((iterations / (medianMs / 1000)).toFixed(1)),
    placeholderReuseRatio: Number(placeholderReuseRatio(snapshotFor, room, token).toFixed(4)),
    hiddenArrayReuseRatio: Number(hiddenArrayReuseRatio(snapshotFor, room, token).toFixed(4)),
  };
}

const vite = await createViteServer({ appType: "spa", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { initialGame } = await vite.ssrLoadModule("/src/game/state.ts");
  const data = await vite.ssrLoadModule("/src/game/data.ts");
  const { roomSnapshotFor } = await vite.ssrLoadModule("/src/multiplayer/room-state.ts");

  const standardRoom = makeRoom(initialGame({ includeSetupPending: false }));
  const stressRoom = makeRoom(stressGame(initialGame({ includeSetupPending: false }), data));

  console.log(JSON.stringify({
    benchmark: "room-snapshot-sanitization",
    iterations,
    warmupIterations,
    sampleCount,
    stressMultiplier,
    results: [
      measure("standard-viewer", roomSnapshotFor, standardRoom, "token-p1"),
      measure("standard-observer", roomSnapshotFor, standardRoom, undefined),
      measure("stress-viewer", roomSnapshotFor, stressRoom, "token-p1"),
      measure("stress-observer", roomSnapshotFor, stressRoom, undefined),
    ],
  }, null, 2));
} finally {
  await vite.close();
}
