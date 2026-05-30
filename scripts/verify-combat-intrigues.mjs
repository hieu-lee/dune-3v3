import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

function intrigueBySourceId(data, sourceId) {
  const intrigue = data.intrigueCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(intrigue, `Expected Intrigue source ${sourceId}`);
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function combatFixture(state, data, setupPlayers, firstSeat = 1) {
  const game = state.initialGame();
  return {
    ...game,
    phase: "playing",
    firstSeat,
    activeSeat: firstSeat,
    conflict: conflictBySourceId(data, 454),
    conflictDeck: [conflictBySourceId(data, 456)],
    conflictDiscard: [],
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: ["stale"],
    players: setupPlayers(game.players.map((player) => ({
      ...player,
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
  };
}

function passCurrent(state, game) {
  return state.passCombatIntrigue(game, game.players[game.activeSeat].id);
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const impress = intrigueBySourceId(data, 152);
  const weirdingCombat = intrigueBySourceId(data, 154);
  const mercenaries = intrigueBySourceId(data, 128);
  assert.equal(impress.combatSwords, 2, "Impress should expose its structured Combat strength");
  assert.equal(weirdingCombat.combatSwords, 5, "Weirding Combat should expose its structured Combat strength");
  assert.equal(impress.automatedCombatSwords, undefined, "Impress has extra printed text and should not auto-resolve");
  assert.equal(weirdingCombat.automatedCombatSwords, undefined, "Weirding Combat should wait for printed text modeling");
  assert.equal(mercenaries.combatSwords, undefined, "Non-Combat Intrigues should not expose Combat strength");
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.automatedCombatSwords)
      .map((card) => card.name),
    [],
    "No catalog Combat Intrigue should auto-resolve until its full printed effect is modeled",
  );
  const verifierCombat = {
    ...impress,
    id: "intrigue-verifier-auto-combat",
    name: "Verifier Combat",
    automatedCombatSwords: 2,
  };

  const twoTeamConflict = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1 };
      if (player.id === "p3") return { ...player, conflict: 4, deployedTroops: 1 };
      return player;
    }),
  );
  const combat = state.startCombatPhase(twoTeamConflict);
  assert.equal(combat.phase, "combat", "Finished player turns should open a Combat phase before conflict resolution");
  assert.equal(combat.players[combat.activeSeat].id, "p2", "Combat should start at the first eligible seat from the marker");
  assert.deepEqual(
    state.combatIntrigueActorIds(combat),
    ["p1", "p2", "p3", "p4"],
    "Allies in conflict and their Commanders should receive Combat Intrigue opportunities",
  );
  assert.deepEqual(combat.combatPasses, [], "Starting Combat should clear stale pass state");
  assert.equal(playerById(combat, "p3").wonConflicts.length, 0, "Conflict should not resolve before Combat passes");

  const pendingCombat = {
    ...twoTeamConflict,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Verifier" },
  };
  assert.equal(
    state.startCombatPhase(pendingCombat),
    pendingCombat,
    "Combat should not clear unresolved pending actions",
  );
  assert.equal(
    state.maybeStartCombatPhase(pendingCombat),
    pendingCombat,
    "Automatic Combat transition should wait for pending actions",
  );
  assert.equal(
    state.maybeStartCombatPhase({ ...pendingCombat, pendingAction: undefined }).phase,
    "combat",
    "Automatic Combat transition should start once the pending queue is empty",
  );
  const revealAdjust = {
    kind: "reveal-adjust",
    ownerId: "p2",
    combatRecipientId: "p2",
    cards: ["Verifier printed reveal"],
    persuasionAdjustment: 0,
    strengthAdjustment: 0,
    source: "Verifier",
  };
  const revealAdjustPendingCombat = { ...twoTeamConflict, pendingAction: revealAdjust };
  assert.equal(
    state.maybeStartCombatPhase(revealAdjustPendingCombat),
    revealAdjustPendingCombat,
    "Reveal-adjust pending actions should preserve the reveal/buy window until the player ends reveal",
  );
  const revealAdjustFinished = state.finishRevealAdjustment(revealAdjustPendingCombat, revealAdjust);
  assert.equal(revealAdjustFinished.phase, "playing", "Finishing reveal adjustment should not enter Combat automatically");
  assert.equal(revealAdjustFinished.pendingAction, undefined);
  assert.match(revealAdjustFinished.log[0], /Printed reveal adjustment resolved/);

  const p2Pass = passCurrent(state, combat);
  assert.equal(p2Pass.players[p2Pass.activeSeat].id, "p3", "Passing should advance clockwise to the next actor");
  assert.deepEqual(p2Pass.combatPasses, ["p2"]);
  const p3Pass = passCurrent(state, p2Pass);
  const p4Pass = passCurrent(state, p3Pass);
  const allPassed = passCurrent(state, p4Pass);
  assert.equal(allPassed.phase, "playing", "Consecutive passes from every Combat actor should resolve the conflict");
  assert.equal(allPassed.round, twoTeamConflict.round + 1);
  assert.equal(playerById(allPassed, "p3").wonConflicts.length, 1, "Highest eligible Ally should take the Conflict after passes");
  assert.equal(playerById(allPassed, "p3").wonConflicts[0].sourceId, 454);
  assert.equal(playerById(allPassed, "p3").conflict, 0, "Round advancement should clear conflict strength");

  const allyPlayFixture = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1, intrigues: [verifierCombat] };
      if (player.id === "p3") return { ...player, conflict: 3, deployedTroops: 1 };
      return player;
    }),
  );
  const allyCombat = state.startCombatPhase(allyPlayFixture);
  const allyPlayed = state.playCombatIntrigue(allyCombat, "p2", verifierCombat.id);
  assert.equal(playerById(allyPlayed, "p2").conflict, 4, "Ally Combat Intrigues should add strength to that Ally");
  assert.deepEqual(playerById(allyPlayed, "p2").intrigues, [], "Played Combat Intrigue should leave the player's hand");
  assert.equal(allyPlayed.intrigueDiscard.at(-1).id, verifierCombat.id, "Played Combat Intrigue should be discarded");
  assert.deepEqual(allyPlayed.combatPasses, [], "A Combat Intrigue play should restart the pass chain");
  assert.equal(allyPlayed.players[allyPlayed.activeSeat].id, "p3", "Play should advance to the next Combat actor");

  const printedOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [impress] }
        : player,
    ),
  );
  const printedOnlyCombat = state.startCombatPhase(printedOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(printedOnlyCombat, "p2", impress.id),
    printedOnlyCombat,
    "Printed Combat Intrigues should not auto-resolve from catalog strength alone",
  );

  const resetPassFixture = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1 };
      if (player.id === "p3") return { ...player, conflict: 3, deployedTroops: 1, intrigues: [verifierCombat] };
      return player;
    }),
  );
  const resetCombat = state.startCombatPhase(resetPassFixture);
  const resetAfterPass = passCurrent(state, resetCombat);
  const resetAfterPlay = state.playCombatIntrigue(resetAfterPass, "p3", verifierCombat.id);
  assert.deepEqual(resetAfterPlay.combatPasses, [], "Playing after a pass should require fresh passes from actors");

  const commanderFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [verifierCombat] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderCombat = state.startCombatPhase(commanderFixture);
  assert.equal(commanderCombat.players[commanderCombat.activeSeat].id, "p4", "Commander seat should act when its team has Allies in conflict");
  assert.deepEqual(
    state.combatIntrigueTargets(commanderCombat, "p4"),
    ["p2", "p6"],
    "Commanders should target only same-team Allies with units in the Conflict",
  );
  const commanderPlayed = state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id, "p6");
  assert.equal(playerById(commanderPlayed, "p6").conflict, 3, "Commander Combat Intrigue should add strength to the chosen Ally");
  assert.deepEqual(playerById(commanderPlayed, "p4").intrigues, []);
  assert.equal(playerById(commanderPlayed, "p2").conflict, 5, "Other eligible Allies should not receive the chosen card's strength");

  const nonCombatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [mercenaries] }
        : player,
    ),
  );
  const nonCombat = state.startCombatPhase(nonCombatFixture);
  assert.equal(
    state.playCombatIntrigue(nonCombat, "p2", mercenaries.id),
    nonCombat,
    "Intrigues without structured Combat strength should not be playable through this reducer",
  );

  const noActors = combatFixture(state, data, (players) => players);
  const noActorResult = state.startCombatPhase(noActors);
  assert.equal(noActorResult.phase, "playing", "No eligible Combat actors should fall through to conflict resolution");
  assert.equal(noActorResult.round, noActors.round + 1);

  console.log("combat intrigue verification passed");
} finally {
  await server.close();
}
