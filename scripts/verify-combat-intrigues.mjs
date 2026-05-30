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

function completedContract(data, index) {
  return { card: data.standardContracts[index], completed: true, takenRound: 1 };
}

function incompleteContract(data, index) {
  return { card: data.standardContracts[index], completed: false, takenRound: 1 };
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
  const contingencyPlan = intrigueBySourceId(data, 147);
  const backedByChoam = intrigueBySourceId(data, 448);
  const mercenaries = intrigueBySourceId(data, 128);
  assert.equal(impress.combatSwords, 2, "Impress should expose its structured Combat strength");
  assert.equal(weirdingCombat.combatSwords, 5, "Weirding Combat should expose its structured Combat strength");
  assert.equal(
    weirdingCombat.summary,
    "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
    "Weirding Combat should expose its conditional Influence threshold",
  );
  assert.equal(contingencyPlan.combatSwords, 3, "Contingency Plan should expose its printed Combat strength");
  assert.equal(contingencyPlan.automatedCombatSwords, 3, "Contingency Plan's full Combat branch should auto-resolve");
  assert.equal(backedByChoam.combatSwords, 4, "Backed by CHOAM should expose its structured Combat strength");
  assert.equal(impress.automatedCombatSwords, undefined, "Impress has extra printed text and should not auto-resolve");
  assert.equal(weirdingCombat.automatedCombatSwords, undefined, "Weirding Combat should resolve from state-aware Influence");
  assert.equal(backedByChoam.automatedCombatSwords, undefined, "Backed by CHOAM should resolve from completed contract state");
  assert.equal(mercenaries.combatSwords, undefined, "Non-Combat Intrigues should not expose Combat strength");
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.automatedCombatSwords)
      .map((card) => card.name),
    ["Contingency Plan"],
    "Only fully modeled catalog Combat Intrigues should auto-resolve",
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
  const allyExplicitTargetPlayed = state.playCombatIntrigue(allyCombat, "p2", verifierCombat.id, "p2");
  assert.equal(playerById(allyExplicitTargetPlayed, "p2").conflict, 4, "Ally Combat Intrigues should allow explicit self-targeting");
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

  const contingencyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [contingencyPlan] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const contingencyCombat = state.startCombatPhase(contingencyFixture);
  const contingencyPlayed = state.playCombatIntrigue(contingencyCombat, "p2", contingencyPlan.id);
  assert.equal(playerById(contingencyPlayed, "p2").conflict, 5, "Contingency Plan Combat should add 3 strength");
  assert.deepEqual(playerById(contingencyPlayed, "p2").intrigues, []);
  assert.equal(contingencyPlayed.intrigueDiscard.at(-1).id, contingencyPlan.id);
  assert.match(contingencyPlayed.log[0], /plays Contingency Plan for Feyd-Rautha Harkonnen, adding 3 strength/);

  const weirdingFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [weirdingCombat] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const weirdingLow = state.startCombatPhase(weirdingFixture);
  assert.equal(
    state.combatIntrigueStrength(weirdingLow, playerById(weirdingLow, "p2"), weirdingCombat),
    3,
    "Weirding Combat should add 3 strength below the Bene Gesserit threshold",
  );
  const weirdingLowPlayed = state.playCombatIntrigue(weirdingLow, "p2", weirdingCombat.id);
  assert.equal(playerById(weirdingLowPlayed, "p2").conflict, 5);
  assert.equal(weirdingLowPlayed.intrigueDiscard.at(-1).id, weirdingCombat.id);
  assert.match(weirdingLowPlayed.log[0], /plays Weirding Combat for Feyd-Rautha Harkonnen, adding 3 strength/);

  const weirdingHighFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            influence: { ...player.influence, bene: 3 },
            intrigues: [weirdingCombat],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const weirdingHigh = state.startCombatPhase(weirdingHighFixture);
  assert.equal(
    state.combatIntrigueStrength(weirdingHigh, playerById(weirdingHigh, "p2"), weirdingCombat),
    5,
    "Weirding Combat should add 5 strength at 3+ Bene Gesserit Influence",
  );
  const weirdingHighPlayed = state.playCombatIntrigue(weirdingHigh, "p2", weirdingCombat.id);
  assert.equal(playerById(weirdingHighPlayed, "p2").conflict, 7);
  assert.match(weirdingHighPlayed.log[0], /adding 5 strength/);

  const backedIncompleteFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, contracts: [completedContract(data, 0)], intrigues: [backedByChoam] }
        : player,
    ),
  );
  const backedIncomplete = state.startCombatPhase(backedIncompleteFixture);
  assert.equal(
    state.combatIntrigueStrength(backedIncomplete, playerById(backedIncomplete, "p2"), backedByChoam),
    undefined,
    "Backed by CHOAM should require two completed contracts for its Combat branch",
  );
  assert.equal(
    state.playCombatIntrigue(backedIncomplete, "p2", backedByChoam.id),
    backedIncomplete,
    "Backed by CHOAM should not auto-resolve before the completed-contract threshold",
  );

  const backedUncompletedFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            contracts: [incompleteContract(data, 0), incompleteContract(data, 1)],
            intrigues: [backedByChoam],
          }
        : player,
    ),
  );
  const backedUncompleted = state.startCombatPhase(backedUncompletedFixture);
  assert.equal(
    state.combatIntrigueStrength(backedUncompleted, playerById(backedUncompleted, "p2"), backedByChoam),
    undefined,
    "Backed by CHOAM should count completed contracts, not merely held contracts",
  );

  const backedCompleteFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
            intrigues: [backedByChoam],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const backedComplete = state.startCombatPhase(backedCompleteFixture);
  assert.equal(
    state.combatIntrigueStrength(backedComplete, playerById(backedComplete, "p2"), backedByChoam),
    4,
    "Backed by CHOAM should add 4 strength with two completed contracts",
  );
  const backedCompletePlayed = state.playCombatIntrigue(backedComplete, "p2", backedByChoam.id);
  assert.equal(playerById(backedCompletePlayed, "p2").conflict, 6);
  assert.equal(backedCompletePlayed.intrigueDiscard.at(-1).id, backedByChoam.id);
  assert.match(backedCompletePlayed.log[0], /plays Backed by CHOAM for Feyd-Rautha Harkonnen, adding 4 strength/);

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
  assert.equal(
    state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id),
    commanderCombat,
    "Commander Combat Intrigues should require an explicit Ally target",
  );
  const commanderPlayed = state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id, "p6");
  assert.equal(playerById(commanderPlayed, "p6").conflict, 3, "Commander Combat Intrigue should add strength to the chosen Ally");
  assert.deepEqual(playerById(commanderPlayed, "p4").intrigues, []);
  assert.equal(playerById(commanderPlayed, "p2").conflict, 5, "Other eligible Allies should not receive the chosen card's strength");

  const commanderWeirdingFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return { ...player, conflict: 5, deployedTroops: 1, influence: { ...player.influence, bene: 3 } };
        }
        if (player.id === "p4") return { ...player, intrigues: [weirdingCombat] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderWeirding = state.startCombatPhase(commanderWeirdingFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderWeirding, playerById(commanderWeirding, "p4"), weirdingCombat),
    5,
    "Commander Weirding Combat should use the team's effective Bene Gesserit Influence",
  );
  const commanderWeirdingPlayed = state.playCombatIntrigue(commanderWeirding, "p4", weirdingCombat.id, "p6");
  assert.equal(playerById(commanderWeirdingPlayed, "p6").conflict, 6);
  assert.equal(playerById(commanderWeirdingPlayed, "p2").conflict, 5);
  assert.match(commanderWeirdingPlayed.log[0], /Shaddam Corrino IV plays Weirding Combat for Princess Irulan, adding 5 strength/);

  const commanderBackedFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return {
            ...player,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
            intrigues: [backedByChoam],
          };
        }
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderBacked = state.startCombatPhase(commanderBackedFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderBacked, playerById(commanderBacked, "p4"), backedByChoam),
    4,
    "Commander Backed by CHOAM should use the Commander's completed contracts",
  );
  const commanderBackedPlayed = state.playCombatIntrigue(commanderBacked, "p4", backedByChoam.id, "p6");
  assert.equal(playerById(commanderBackedPlayed, "p6").conflict, 5);
  assert.equal(playerById(commanderBackedPlayed, "p2").conflict, 5);
  assert.match(commanderBackedPlayed.log[0], /Shaddam Corrino IV plays Backed by CHOAM for Princess Irulan, adding 4 strength/);

  const commanderBackedTargetContractsFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
          };
        }
        if (player.id === "p4") return { ...player, intrigues: [backedByChoam] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderBackedTargetContracts = state.startCombatPhase(commanderBackedTargetContractsFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderBackedTargetContracts, playerById(commanderBackedTargetContracts, "p4"), backedByChoam),
    undefined,
    "Commander Backed by CHOAM should not use the target Ally's completed contracts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderBackedTargetContracts, "p4", backedByChoam.id, "p2"),
    commanderBackedTargetContracts,
    "Commander Backed by CHOAM should stay blocked when only the Ally target has completed contracts",
  );

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
