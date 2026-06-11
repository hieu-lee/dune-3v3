#!/usr/bin/env node
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createServer as createViteServer } from "vite";
import { createAiRuntime, legalActionsForSeat } from "./ai-team-driver.mjs";

const iterations = numericArg("--iterations", 20);
const warmupIterations = numericArg("--warmup", 3);
const sampleCount = numericArg("--samples", 5);
const stressMultiplier = numericArg("--stress-multiplier", 3);

function numericArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!match) return fallback;
  const value = Number(match.slice(name.length + 1));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function cycle(items, count, idPrefix) {
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_entry, index) => ({
    ...items[index % items.length],
    id: `${idPrefix}-${index}`,
  }));
}

function makeRoom(game) {
  return {
    id: "BENCH-AI",
    version: 1,
    started: true,
    createdAt: 1,
    updatedAt: 1,
    game,
    endgameReady: {},
    seats: {},
  };
}

function activeSeatFor(game, playerId) {
  const seat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(seat, -1, `Expected player ${playerId}`);
  return seat;
}

function withActivePlayer(game, playerId, patch) {
  const activeSeat = activeSeatFor(game, playerId);
  return {
    ...game,
    activeSeat,
    firstSeat: activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    agentTurnComplete: false,
    spaces: {},
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, ...patch(player) } : player
    ),
  };
}

function standardAgentRoom(initialGame, data) {
  const game = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 2,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: cycle(data.imperiumDeck, 5, "standard-hand"),
    intrigues: [],
  }));
  return makeRoom(game);
}

function plotHeavyRoom(initialGame, data) {
  const plotIntrigues = data.intrigueCards.filter((card) =>
    (card.effects ?? []).some((effect) => effect.trigger === "plot-intrigue")
  );
  const game = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 2,
    revealed: false,
    garrison: 6,
    spies: 3,
    resources: { spice: 20, solari: 20, water: 20 },
    influence: {
      emperor: 4,
      spacing: 4,
      bene: 4,
      fremen: 4,
      greatHouses: 4,
      fringeWorlds: 4,
    },
    hand: cycle(data.imperiumDeck, stressMultiplier * 3, "plot-heavy-hand"),
    intrigues: cycle(plotIntrigues, stressMultiplier * 3, "plot-heavy-intrigue"),
  }));
  return makeRoom(game);
}

function pendingDeployRoom(initialGame) {
  const pendingAction = {
    kind: "deploy",
    ownerId: "p2",
    remaining: 2,
    source: "Benchmark deployment",
  };
  const game = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 0,
    revealed: false,
    garrison: 3,
  }));
  return makeRoom({ ...game, pendingAction });
}

function combatIntrigueRoom(initialGame, data) {
  const combatIntrigues = data.intrigueCards.filter((card) =>
    (card.effects ?? []).some((effect) => effect.trigger === "combat-intrigue")
  );
  const game = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 0,
    revealed: true,
    conflict: 4,
    deployedTroops: 2,
    intrigues: cycle(combatIntrigues, stressMultiplier * 3, "combat-heavy-intrigue"),
  }));
  return makeRoom({
    ...game,
    phase: "combat",
    players: game.players.map((player) =>
      player.id === "p3" ? { ...player, conflict: 2, deployedTroops: 1 } : player
    ),
  });
}

function assertNoMutation(label, room, playerId, runtime) {
  const before = JSON.stringify(room.game);
  legalActionsForSeat(room, playerId, runtime);
  assert.equal(JSON.stringify(room.game), before, `${label} legal action enumeration must not mutate the source game`);
}

function measure(label, room, playerId, runtime) {
  const coverage = {};
  const actionCount = legalActionsForSeat(room, playerId, runtime, coverage).length;
  assertNoMutation(label, room, playerId, runtime);
  for (let index = 0; index < warmupIterations; index += 1) {
    legalActionsForSeat(room, playerId, runtime);
  }
  globalThis.gc?.();
  const samples = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      legalActionsForSeat(room, playerId, runtime);
    }
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  const medianMs = samples[Math.floor(samples.length / 2)];
  return {
    label,
    playerId,
    actionCount,
    plotCommandVariants: coverage.plotCommandVariants ?? 0,
    trustedPlaceAgentActions: coverage.trustedPlaceAgentActions ?? 0,
    iterations,
    medianMs: Number(medianMs.toFixed(3)),
    enumerationsPerSecond: Number((iterations / (medianMs / 1000)).toFixed(1)),
  };
}

const vite = await createViteServer({ appType: "spa", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { initialGame } = await vite.ssrLoadModule("/src/game/state.ts");
  const data = await vite.ssrLoadModule("/src/game/data.ts");
  const runtime = await createAiRuntime(vite);

  const rooms = [
    ["standard-agent", standardAgentRoom(initialGame, data), "p2"],
    ["plot-heavy", plotHeavyRoom(initialGame, data), "p2"],
    ["pending-deploy", pendingDeployRoom(initialGame), "p2"],
    ["combat-intrigues", combatIntrigueRoom(initialGame, data), "p2"],
  ];

  console.log(JSON.stringify({
    benchmark: "ai-legal-actions",
    iterations,
    warmupIterations,
    sampleCount,
    stressMultiplier,
    results: rooms.map(([label, room, playerId]) => measure(label, room, playerId, runtime)),
  }, null, 2));
} finally {
  await vite.close();
}
