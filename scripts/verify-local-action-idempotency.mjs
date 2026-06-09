import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const revealCard = {
    id: "local-stale-reveal-card",
    name: "Local Stale Reveal Card",
    icons: [],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const initial = state.initialGame({ includeSetupPending: false });
  const revealBase = {
    ...initial,
    activeSeat: 1,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    log: [],
    players: initial.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            hand: [revealCard],
            playArea: [],
            resources: { ...player.resources, spice: 0 },
            revealed: false,
            agentsReady: 0,
            conflict: 0,
            deployedTroops: 0,
          }
        : player
    ),
  };
  const staleRevealPlan = {
    influenceGains: {},
    intriguesToDraw: 0,
    persuasion: 2,
    recruitedTroops: 0,
    revealGain: { spice: 1 },
    swords: 0,
  };
  const onceRevealed = turnActions.revealTurnAction(revealBase, {
    commanderTargets: {},
    revealPlan: staleRevealPlan,
  });
  const duplicateReveal = turnActions.revealTurnAction(onceRevealed, {
    commanderTargets: {},
    revealPlan: staleRevealPlan,
  });
  const onceRevealedPlayer = onceRevealed.players[onceRevealed.activeSeat];
  const duplicateRevealPlayer = duplicateReveal.players[duplicateReveal.activeSeat];
  assert.equal(
    duplicateRevealPlayer.resources.spice,
    onceRevealedPlayer.resources.spice,
    "A stale duplicate local Reveal action should not apply reveal resources again",
  );
  assert.equal(
    duplicateReveal.turnSpiceGains.p2,
    onceRevealed.turnSpiceGains.p2,
    "A stale duplicate local Reveal action should not record the same reveal spice gain again",
  );
  assert.deepEqual(
    duplicateReveal.log,
    onceRevealed.log,
    "A stale duplicate local Reveal action should not add a second reveal log entry",
  );

  const plotIntrigue = data.intrigueCards.find((card) => card.sourceId === 143);
  assert.ok(plotIntrigue, "Expected Manipulate intrigue fixture");
  const conflict = data.conflictCards.find((card) => card.sourceId === 453);
  assert.ok(conflict, "Expected conflict fixture");
  const combatBaseInitial = state.initialGame({ includeSetupPending: false });
  const combatBase = state.startCombatPhase({
    ...combatBaseInitial,
    phase: "playing",
    firstSeat: 1,
    activeSeat: 1,
    conflict,
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: [],
    log: [],
    players: combatBaseInitial.players.map((player) => {
      const combatActor = ["p2", "p3"].includes(player.id);
      return {
        ...player,
        agentsReady: 0,
        revealed: true,
        conflict: combatActor ? 2 : 0,
        deployedTroops: combatActor ? 1 : 0,
        hand: [],
        playArea: [],
        discard: [],
        deck: [],
        intrigues: combatActor ? [plotIntrigue] : [],
      };
    }),
  });
  assert.equal(combatBase.phase, "combat", "Combat pass fixture should start in Combat");
  assert.equal(combatBase.players[combatBase.activeSeat].id, "p2", "Combat pass fixture should start with p2");
  const clickedActorId = combatBase.players[combatBase.activeSeat].id;
  const oncePassed = state.passCombatIntrigue(combatBase, clickedActorId);
  const duplicatePass = state.passCombatIntrigue(oncePassed, clickedActorId);
  assert.deepEqual(
    duplicatePass.combatPasses,
    oncePassed.combatPasses,
    "A stale duplicate local Combat pass should keep the originally clicked actor id and not pass the next actor",
  );
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(
    appSource,
    /setGame\(\(current\)\s*=>\s*passCombatIntrigue\(current,\s*activePlayer\.id\)\)/,
    "Local Combat pass should retain the clicked actor id inside the state updater, so a stale duplicate click cannot pass the next actor",
  );

  console.log("local action idempotency verification passed");
} finally {
  await server.close();
}
