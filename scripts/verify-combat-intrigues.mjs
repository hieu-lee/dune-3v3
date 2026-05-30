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

function starterCard(data, index) {
  const card = data.allyStarterCards[index];
  assert.ok(card, `Expected starter card ${index}`);
  return {
    ...card,
    icons: [...card.icons],
    revealGain: card.revealGain ? { ...card.revealGain } : undefined,
    traits: card.traits ? [...card.traits] : undefined,
  };
}

function boardSpaceByName(data, name) {
  const space = data.boardSpaces.find((candidate) => candidate.name === name);
  assert.ok(space, `Expected board space ${name}`);
  return space;
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
  const findWeakness = intrigueBySourceId(data, 149);
  const goToGround = intrigueBySourceId(data, 146);
  const spiceIsPower = intrigueBySourceId(data, 150);
  const questionableMethods = intrigueBySourceId(data, 156);
  const springTheTrap = intrigueBySourceId(data, 153);
  const tacticalOption = intrigueBySourceId(data, 155);
  const reachAgreement = intrigueBySourceId(data, 449);
  const weirdingCombat = intrigueBySourceId(data, 154);
  const contingencyPlan = intrigueBySourceId(data, 147);
  const devour = intrigueBySourceId(data, 151);
  const backedByChoam = intrigueBySourceId(data, 448);
  const mercenaries = intrigueBySourceId(data, 128);
  const espionageSpace = boardSpaceByName(data, "Espionage");
  const secretsSpace = boardSpaceByName(data, "Secrets");
  const vastWealthSpace = boardSpaceByName(data, "Vast Wealth");
  const arrakeenSpace = boardSpaceByName(data, "Arrakeen");
  assert.equal(impress.combatSwords, 2, "Impress should expose its structured Combat strength");
  assert.equal(findWeakness.combatSwords, 5, "Find Weakness should expose its maximum structured Combat strength");
  assert.equal(
    findWeakness.summary,
    "Add 2 strength; you may recall 1 spy to add 3 more strength.",
    "Find Weakness should expose its base strength and optional spy recall",
  );
  assert.equal(goToGround.combatSwords, undefined, "Go To Ground should resolve through its structured retreat and spy flow");
  assert.equal(
    goToGround.summary,
    "Retreat 1 or 2 troops, then optionally place a spy.",
    "Go To Ground should expose its retreat and spy placement effect",
  );
  assert.equal(springTheTrap.combatSwords, 7, "Spring The Trap should expose its structured Combat strength");
  assert.equal(
    springTheTrap.summary,
    "Recall 2 spies to add 7 strength.",
    "Spring The Trap should expose its two-spy cost and Combat strength",
  );
  assert.equal(spiceIsPower.combatSwords, 6, "Spice is Power should expose its maximum structured Combat strength");
  assert.equal(
    spiceIsPower.summary,
    "Retreat 3 troops to gain 3 spice OR spend 3 spice to add 6 strength.",
    "Spice is Power should expose both printed Combat branches",
  );
  assert.equal(tacticalOption.combatSwords, 2, "Tactical Option should expose its structured Combat strength");
  assert.equal(
    tacticalOption.summary,
    "Add 2 strength OR retreat any number of your troops.",
    "Tactical Option should expose both printed Combat branches",
  );
  assert.equal(reachAgreement.combatSwords, undefined, "Reach Agreement should resolve through its structured retreat and contract flow");
  assert.equal(
    reachAgreement.summary,
    "Retreat 1 or 2 troops, then take a face-up CHOAM contract.",
    "Reach Agreement should expose its retreat and contract effect",
  );
  assert.equal(questionableMethods.combatSwords, 5, "Questionable Methods should expose its maximum structured Combat strength");
  assert.equal(
    questionableMethods.summary,
    "Add 1 strength; the recipient may lose 1 Influence, or a Commander may lose personal Influence, to add 4 more strength.",
    "Questionable Methods should expose its base strength and optional Influence loss",
  );
  assert.equal(weirdingCombat.combatSwords, 5, "Weirding Combat should expose its structured Combat strength");
  assert.equal(
    weirdingCombat.summary,
    "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
    "Weirding Combat should expose its conditional Influence threshold",
  );
  assert.equal(contingencyPlan.combatSwords, 3, "Contingency Plan should expose its printed Combat strength");
  assert.equal(contingencyPlan.automatedCombatSwords, 3, "Contingency Plan's full Combat branch should auto-resolve");
  assert.equal(devour.combatSwords, 4, "Devour should expose its maximum structured Combat strength");
  assert.equal(
    devour.summary,
    "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
    "Devour should expose its sandworm bonus and optional trash text",
  );
  assert.equal(backedByChoam.combatSwords, 4, "Backed by CHOAM should expose its structured Combat strength");
  assert.equal(impress.automatedCombatSwords, undefined, "Impress has extra printed text and should not auto-resolve");
  assert.equal(findWeakness.automatedCombatSwords, undefined, "Find Weakness should resolve through spy-recall state");
  assert.equal(goToGround.automatedCombatSwords, undefined, "Go To Ground should resolve through retreat and spy choices");
  assert.equal(questionableMethods.automatedCombatSwords, undefined, "Questionable Methods should resolve through Influence-loss state");
  assert.equal(spiceIsPower.automatedCombatSwords, undefined, "Spice is Power should resolve through an explicit branch choice");
  assert.equal(tacticalOption.automatedCombatSwords, undefined, "Tactical Option should resolve through an explicit branch choice");
  assert.equal(reachAgreement.automatedCombatSwords, undefined, "Reach Agreement should resolve through retreat and contract choices");
  assert.equal(springTheTrap.automatedCombatSwords, undefined, "Spring The Trap should resolve through spy-recall state");
  assert.equal(weirdingCombat.automatedCombatSwords, undefined, "Weirding Combat should resolve from state-aware Influence");
  assert.equal(devour.automatedCombatSwords, undefined, "Devour should resolve from target sandworm state");
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

  const spiceSpendFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, resources: { ...player.resources, spice: 3 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceSpendCombat = state.startCombatPhase(spiceSpendFixture);
  assert.equal(
    state.combatIntrigueStrength(spiceSpendCombat, playerById(spiceSpendCombat, "p2"), spiceIsPower),
    6,
    "Spice is Power should expose the spend branch when the recipient has 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceSpendCombat, "p2", spiceIsPower.id),
    spiceSpendCombat,
    "Spice is Power should require an explicit branch choice",
  );
  const spiceSpendPlayed = state.playCombatIntrigue(spiceSpendCombat, "p2", spiceIsPower.id, undefined, "spend-spice");
  assert.equal(playerById(spiceSpendPlayed, "p2").resources.spice, 0, "Spice is Power spend branch should spend recipient spice");
  assert.equal(playerById(spiceSpendPlayed, "p2").conflict, 8, "Spice is Power spend branch should add 6 strength");
  assert.equal(playerById(spiceSpendPlayed, "p2").deployedTroops, 1, "Spice is Power spend branch should not retreat troops");
  assert.equal(spiceSpendPlayed.intrigueDiscard.at(-1).id, spiceIsPower.id);
  assert.match(spiceSpendPlayed.log[0], /spends 3 spice to add 6 strength/);

  const spiceDryFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, resources: { ...player.resources, spice: 2 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceDryCombat = state.startCombatPhase(spiceDryFixture);
  assert.equal(
    state.combatIntrigueStrength(spiceDryCombat, playerById(spiceDryCombat, "p2"), spiceIsPower),
    undefined,
    "Spice is Power should not expose the spend branch before the recipient has 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceDryCombat, "p2", spiceIsPower.id, undefined, "spend-spice"),
    spiceDryCombat,
    "Spice is Power spend branch should require 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceDryCombat, "p2", spiceIsPower.id, undefined, "retreat-troops"),
    spiceDryCombat,
    "Spice is Power retreat branch should require 3 deployed troops",
  );

  const spiceRetreatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 3, garrison: 1, resources: { ...player.resources, spice: 0 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceRetreatCombat = state.startCombatPhase(spiceRetreatFixture);
  const spiceRetreatPlayed = state.playCombatIntrigue(spiceRetreatCombat, "p2", spiceIsPower.id, undefined, "retreat-troops");
  assert.equal(playerById(spiceRetreatPlayed, "p2").deployedTroops, 0, "Spice is Power should retreat three troops");
  assert.equal(playerById(spiceRetreatPlayed, "p2").garrison, 4, "Spice is Power should return retreated troops to garrison");
  assert.equal(playerById(spiceRetreatPlayed, "p2").resources.spice, 3, "Spice is Power retreat branch should gain 3 spice");
  assert.equal(playerById(spiceRetreatPlayed, "p2").conflict, 3, "Spice is Power retreat branch should remove the troops' strength");
  assert.equal(spiceRetreatPlayed.players[spiceRetreatPlayed.activeSeat].id, "p3", "Combat should continue with remaining actors after a retreat");
  assert.match(spiceRetreatPlayed.log[0], /retreats 3 troops and gains 3 spice/);

  const spiceLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 6, deployedTroops: 3, garrison: 0, resources: { ...player.resources, spice: 0 }, intrigues: [spiceIsPower] }
        : player,
    ),
  );
  const spiceLastActorCombat = state.startCombatPhase(spiceLastActorFixture);
  const spiceLastActorPlayed = state.playCombatIntrigue(
    spiceLastActorCombat,
    "p2",
    spiceIsPower.id,
    undefined,
    "retreat-troops",
  );
  assert.equal(spiceLastActorPlayed.phase, "playing", "Retreating the last units should resolve Combat instead of leaving no actors");
  assert.equal(spiceLastActorPlayed.round, spiceLastActorFixture.round + 1);
  assert.ok(
    spiceLastActorPlayed.log.some((entry) => entry.includes("resolves with no winner")),
    "Retreating the last units should resolve the Conflict with no winner",
  );

  const tacticalAddFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalAddCombat = state.startCombatPhase(tacticalAddFixture);
  assert.equal(
    state.combatIntrigueStrength(tacticalAddCombat, playerById(tacticalAddCombat, "p2"), tacticalOption),
    2,
    "Tactical Option should expose its +2 strength branch",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalAddCombat, "p2", tacticalOption.id),
    tacticalAddCombat,
    "Tactical Option should require an explicit branch choice",
  );
  const tacticalAdded = state.playCombatIntrigue(tacticalAddCombat, "p2", tacticalOption.id, undefined, "add-strength");
  assert.equal(playerById(tacticalAdded, "p2").conflict, 4, "Tactical Option strength branch should add 2 strength");
  assert.equal(playerById(tacticalAdded, "p2").deployedTroops, 1, "Tactical Option strength branch should not retreat troops");
  assert.equal(tacticalAdded.intrigueDiscard.at(-1).id, tacticalOption.id);
  assert.match(tacticalAdded.log[0], /plays Tactical Option for Feyd-Rautha Harkonnen, adding 2 strength/);

  const tacticalRetreatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 10, deployedTroops: 4, garrison: 1, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalRetreatCombat = state.startCombatPhase(tacticalRetreatFixture);
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 0 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 5 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject more troops than are deployed",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject fractional troop counts",
  );
  const tacticalRetreated = state.playCombatIntrigue(
    tacticalRetreatCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 3 },
  );
  assert.equal(playerById(tacticalRetreated, "p2").deployedTroops, 1, "Tactical Option should retreat the chosen troop count");
  assert.equal(playerById(tacticalRetreated, "p2").garrison, 4, "Tactical Option should return retreated troops to garrison");
  assert.equal(playerById(tacticalRetreated, "p2").conflict, 4, "Tactical Option retreat should remove each retreated troop's strength");
  assert.match(tacticalRetreated.log[0], /retreats 3 troops/);

  const tacticalWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 10, deployedTroops: 2, deployedSandworms: 1, garrison: 0, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalWormCombat = state.startCombatPhase(tacticalWormFixture);
  const tacticalWormRetreated = state.playCombatIntrigue(
    tacticalWormCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(tacticalWormRetreated, "p2").deployedTroops, 0, "Tactical Option should allow all troops to retreat");
  assert.equal(playerById(tacticalWormRetreated, "p2").deployedSandworms, 1, "Tactical Option should not retreat sandworms");
  assert.equal(playerById(tacticalWormRetreated, "p2").conflict, 6, "Tactical Option should preserve non-troop strength after retreat");
  assert.equal(tacticalWormRetreated.phase, "combat", "A remaining sandworm should keep the player in Combat");

  const tacticalLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [tacticalOption] }
        : player,
    ),
  );
  const tacticalLastActorCombat = state.startCombatPhase(tacticalLastActorFixture);
  const tacticalLastActorRetreated = state.playCombatIntrigue(
    tacticalLastActorCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(tacticalLastActorRetreated.phase, "playing", "Retreating the last Tactical Option units should resolve Combat");
  assert.equal(tacticalLastActorRetreated.round, tacticalLastActorFixture.round + 1);
  assert.ok(
    tacticalLastActorRetreated.log.some((entry) => entry.includes("resolves with no winner")),
    "Retreating the last Tactical Option units should resolve the Conflict with no winner",
  );

  const reachAgreementContract = data.standardContracts[0];
  const reachAgreementReplacement = data.standardContracts[1];
  const reachAgreementFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [reachAgreement] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    contractOffer: [reachAgreementContract],
    contractDeck: [reachAgreementReplacement],
  };
  const reachAgreementCombat = state.startCombatPhase(reachAgreementFixture);
  assert.equal(
    state.combatIntrigueStrength(reachAgreementCombat, playerById(reachAgreementCombat, "p2"), reachAgreement),
    undefined,
    "Reach Agreement should not expose fixed Combat strength",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id),
    reachAgreementCombat,
    "Reach Agreement should require an explicit retreat count",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 0 }),
    reachAgreementCombat,
    "Reach Agreement should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 3 }),
    reachAgreementCombat,
    "Reach Agreement should reject more than two troops",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    reachAgreementCombat,
    "Reach Agreement should reject fractional troop counts",
  );
  const reachAgreementPlayed = state.playCombatIntrigue(
    reachAgreementCombat,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(reachAgreementPlayed, "p2").deployedTroops, 0, "Reach Agreement should retreat the chosen troop count");
  assert.equal(playerById(reachAgreementPlayed, "p2").garrison, 2, "Reach Agreement should return retreated troops to garrison");
  assert.equal(playerById(reachAgreementPlayed, "p2").conflict, 0, "Reach Agreement should remove retreated troop strength");
  assert.deepEqual(playerById(reachAgreementPlayed, "p2").intrigues, [], "Reach Agreement should leave the player's hand");
  assert.equal(reachAgreementPlayed.intrigueDiscard.at(-1).id, reachAgreement.id);
  assert.deepEqual(reachAgreementPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p2",
    source: "Reach Agreement",
  });
  assert.equal(
    reachAgreementPlayed.players[reachAgreementPlayed.activeSeat].id,
    "p3",
    "Reach Agreement should continue with the next remaining Combat actor while the contract choice is pending",
  );
  assert.equal(
    state.passCombatIntrigue(reachAgreementPlayed, reachAgreementPlayed.players[reachAgreementPlayed.activeSeat].id),
    reachAgreementPlayed,
    "Combat should stay locked while Reach Agreement contract pickup is pending",
  );
  const reachAgreementTookContract = state.takeChoamContract(
    reachAgreementPlayed,
    reachAgreementPlayed.pendingAction,
    reachAgreementContract.id,
  );
  assert.equal(reachAgreementTookContract.pendingAction, undefined, "Taking the Reach Agreement contract should clear the pending action");
  assert.equal(reachAgreementTookContract.phase, "combat", "Combat should resume after Reach Agreement if actors remain");
  assert.equal(reachAgreementTookContract.players[reachAgreementTookContract.activeSeat].id, "p3");
  assert.equal(playerById(reachAgreementTookContract, "p2").contracts.at(-1).card.id, reachAgreementContract.id);
  assert.equal(playerById(reachAgreementTookContract, "p2").contracts.at(-1).takenAtSpaceId, undefined);
  assert.deepEqual(reachAgreementTookContract.contractOffer.map((contract) => contract.id), [reachAgreementReplacement.id]);
  assert.deepEqual(reachAgreementTookContract.contractDeck, []);
  assert.match(reachAgreementTookContract.log[0], /takes the .* CHOAM contract from Reach Agreement/);

  const reachAgreementOneTroopFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 7, deployedTroops: 2, garrison: 1, intrigues: [reachAgreement] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    contractOffer: [],
    contractDeck: [],
  };
  const reachAgreementOneTroop = state.startCombatPhase(reachAgreementOneTroopFixture);
  const reachAgreementRetreatedOne = state.playCombatIntrigue(
    reachAgreementOneTroop,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").deployedTroops, 1, "Reach Agreement should allow retreating one troop");
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").garrison, 2);
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").conflict, 5);
  const reachAgreementFallback = state.collectChoamContractFallback(
    reachAgreementRetreatedOne,
    reachAgreementRetreatedOne.pendingAction,
  );
  assert.equal(playerById(reachAgreementFallback, "p2").resources.solari, playerById(reachAgreementRetreatedOne, "p2").resources.solari + 2);
  assert.equal(reachAgreementFallback.pendingAction, undefined, "Reach Agreement should fall back to 2 Solari when no contracts remain");
  assert.match(reachAgreementFallback.log[0], /gains 2 Solari from Reach Agreement/);

  const reachAgreementWormOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 3, deployedTroops: 0, deployedSandworms: 1, intrigues: [reachAgreement] }
        : player,
    ),
  );
  const reachAgreementWormOnly = state.startCombatPhase(reachAgreementWormOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(reachAgreementWormOnly, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1 }),
    reachAgreementWormOnly,
    "Reach Agreement should reject a sandworm-only recipient with no troops to retreat",
  );

  const reachAgreementLastActorContract = data.standardContracts[2];
  const reachAgreementLastActorFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [reachAgreement] }
          : player,
      ),
    ),
    contractOffer: [reachAgreementLastActorContract],
    contractDeck: [],
  };
  const reachAgreementLastActor = state.startCombatPhase(reachAgreementLastActorFixture);
  const reachAgreementLastActorPlayed = state.playCombatIntrigue(
    reachAgreementLastActor,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(reachAgreementLastActorPlayed.phase, "combat", "Reach Agreement should keep Combat open while its contract is pending");
  assert.deepEqual(reachAgreementLastActorPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p2",
    source: "Reach Agreement",
  });
  assert.equal(playerById(reachAgreementLastActorPlayed, "p2").deployedTroops, 0);
  assert.deepEqual(
    state.combatIntrigueActorIds(reachAgreementLastActorPlayed),
    [],
    "Reach Agreement may leave no Combat actors before the contract is chosen",
  );
  const reachAgreementLastActorTookContract = state.takeChoamContract(
    reachAgreementLastActorPlayed,
    reachAgreementLastActorPlayed.pendingAction,
    reachAgreementLastActorContract.id,
  );
  assert.equal(reachAgreementLastActorTookContract.phase, "playing", "Taking the pending contract should then resolve empty Combat");
  assert.equal(reachAgreementLastActorTookContract.round, reachAgreementLastActorFixture.round + 1);
  assert.equal(playerById(reachAgreementLastActorTookContract, "p2").contracts.at(-1).card.id, reachAgreementLastActorContract.id);
  assert.ok(
    reachAgreementLastActorTookContract.log.some((entry) => entry.includes("resolves with no winner")),
    "Reach Agreement should resolve the Conflict with no winner after the last units retreat and the contract resolves",
  );

  const goToGroundFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [goToGround] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const goToGroundCombat = state.startCombatPhase(goToGroundFixture);
  assert.equal(state.isGoToGroundIntrigue(goToGround), true, "Go To Ground should be recognized as a structured Combat Intrigue");
  assert.equal(
    state.combatIntrigueStrength(goToGroundCombat, playerById(goToGroundCombat, "p2"), goToGround),
    undefined,
    "Go To Ground should not expose fixed Combat strength",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id),
    goToGroundCombat,
    "Go To Ground should require an explicit retreat count",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 0 }),
    goToGroundCombat,
    "Go To Ground should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 3 }),
    goToGroundCombat,
    "Go To Ground should reject more than two troops",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    goToGroundCombat,
    "Go To Ground should reject fractional troop counts",
  );
  const goToGroundPlayed = state.playCombatIntrigue(
    goToGroundCombat,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(goToGroundPlayed, "p2").deployedTroops, 0, "Go To Ground should retreat the chosen troop count");
  assert.equal(playerById(goToGroundPlayed, "p2").garrison, 2, "Go To Ground should return retreated troops to garrison");
  assert.equal(playerById(goToGroundPlayed, "p2").conflict, 0, "Go To Ground should remove retreated troop strength");
  assert.deepEqual(playerById(goToGroundPlayed, "p2").intrigues, [], "Go To Ground should leave the player's hand");
  assert.equal(goToGroundPlayed.intrigueDiscard.at(-1).id, goToGround.id);
  assert.deepEqual(goToGroundPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
  });
  assert.equal(
    goToGroundPlayed.players[goToGroundPlayed.activeSeat].id,
    "p3",
    "Go To Ground should continue with the next remaining Combat actor while spy placement is pending",
  );
  assert.equal(
    state.passCombatIntrigue(goToGroundPlayed, goToGroundPlayed.players[goToGroundPlayed.activeSeat].id),
    goToGroundPlayed,
    "Combat should stay locked while Go To Ground spy placement is pending",
  );
  const goToGroundSkippedSpy = state.finishPendingAction(goToGroundPlayed);
  assert.equal(goToGroundSkippedSpy.pendingAction, undefined, "Skipping the Go To Ground spy should clear the pending action");
  assert.equal(goToGroundSkippedSpy.phase, "combat", "Skipping the Go To Ground spy should resume Combat when actors remain");
  assert.equal(goToGroundSkippedSpy.players[goToGroundSkippedSpy.activeSeat].id, "p3");
  assert.equal(playerById(goToGroundSkippedSpy, "p2").spies, playerById(goToGroundPlayed, "p2").spies);
  assert.equal(goToGroundSkippedSpy.spyPosts[secretsSpace.id], undefined);
  assert.ok(
    state.placeableSpySpaces(goToGroundPlayed, goToGroundPlayed.pendingAction).some((space) => space.id === secretsSpace.id),
    "Go To Ground should offer legal spy posts to the recipient",
  );
  const goToGroundOccupiedSpyPost = {
    ...goToGroundPlayed,
    spyPosts: { ...goToGroundPlayed.spyPosts, [secretsSpace.id]: "p3" },
  };
  assert.equal(
    state.placeSpyForPending(goToGroundOccupiedSpyPost, goToGroundOccupiedSpyPost.pendingAction, secretsSpace.id),
    goToGroundOccupiedSpyPost,
    "Go To Ground spy placement should reject occupied spy posts",
  );
  assert.equal(
    state.placeSpyForPending(goToGroundPlayed, goToGroundPlayed.pendingAction, vastWealthSpace.id),
    goToGroundPlayed,
    "Go To Ground spy placement should reject personal Commander-board posts for an Ally",
  );
  const goToGroundSpyPlaced = state.placeSpyForPending(goToGroundPlayed, goToGroundPlayed.pendingAction, secretsSpace.id);
  assert.equal(goToGroundSpyPlaced.pendingAction, undefined, "Placing the Go To Ground spy should clear the pending action");
  assert.equal(goToGroundSpyPlaced.phase, "combat", "Combat should resume after Go To Ground if actors remain");
  assert.equal(goToGroundSpyPlaced.players[goToGroundSpyPlaced.activeSeat].id, "p3");
  assert.equal(playerById(goToGroundSpyPlaced, "p2").spies, playerById(goToGroundPlayed, "p2").spies - 1);
  assert.equal(goToGroundSpyPlaced.spyPosts[secretsSpace.id], "p2");
  assert.match(goToGroundSpyPlaced.log[0], /places a spy near Secrets from Go To Ground/);

  const goToGroundOneTroopFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 2, garrison: 1, intrigues: [goToGround] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const goToGroundOneTroop = state.startCombatPhase(goToGroundOneTroopFixture);
  const goToGroundOneTroopOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 5, deployedTroops: 1, garrison: 0, intrigues: [goToGround] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const goToGroundOneTroopOnly = state.startCombatPhase(goToGroundOneTroopOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(goToGroundOneTroopOnly, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 2 }),
    goToGroundOneTroopOnly,
    "Go To Ground should reject retreating more troops than the recipient has",
  );
  const goToGroundRetreatedOne = state.playCombatIntrigue(
    goToGroundOneTroop,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(goToGroundRetreatedOne, "p2").deployedTroops, 1, "Go To Ground should allow retreating one troop");
  assert.equal(playerById(goToGroundRetreatedOne, "p2").garrison, 2);
  assert.equal(playerById(goToGroundRetreatedOne, "p2").conflict, 5);
  assert.deepEqual(goToGroundRetreatedOne.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
  });

  const goToGroundWormOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 3, deployedTroops: 0, deployedSandworms: 1, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundWormOnly = state.startCombatPhase(goToGroundWormOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(goToGroundWormOnly, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 1 }),
    goToGroundWormOnly,
    "Go To Ground should reject a sandworm-only recipient with no troops to retreat",
  );

  const goToGroundMixedWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 4,
            deployedTroops: 1,
            deployedSandworms: 1,
            spies: 0,
            intrigues: [goToGround],
          }
        : player.id === "p3"
          ? { ...player, conflict: 1, deployedTroops: 1 }
          : player,
    ),
  );
  const goToGroundMixedWorm = state.startCombatPhase(goToGroundMixedWormFixture);
  const goToGroundMixedWormPlayed = state.playCombatIntrigue(
    goToGroundMixedWorm,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").deployedTroops, 0, "Go To Ground should retreat troops from a mixed troop/sandworm force");
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").deployedSandworms, 1, "Go To Ground should not retreat sandworms");
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").conflict, 2, "Go To Ground should only remove troop strength from a mixed troop/sandworm force");
  assert.equal(goToGroundMixedWormPlayed.phase, "combat", "A remaining sandworm should keep the recipient in Combat");
  assert.ok(
    state.combatIntrigueActorIds(goToGroundMixedWormPlayed).includes("p2"),
    "A recipient with only sandworms left should remain a Combat actor",
  );
  let goToGroundMixedWormResolved = goToGroundMixedWormPlayed;
  for (let passCount = 0; passCount < 10 && goToGroundMixedWormResolved.phase === "combat"; passCount += 1) {
    goToGroundMixedWormResolved = passCurrent(state, goToGroundMixedWormResolved);
  }
  assert.equal(goToGroundMixedWormResolved.phase, "playing", "Combat should resolve after the mixed sandworm survivor passes");
  assert.ok(
    playerById(goToGroundMixedWormResolved, "p2").wonConflicts.some((conflict) => conflict.sourceId === goToGroundMixedWormFixture.conflict.sourceId),
    "A sandworm survivor with remaining strength should still be eligible to win the Conflict",
  );

  const goToGroundNoSpyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 0, intrigues: [goToGround] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const goToGroundNoSpy = state.startCombatPhase(goToGroundNoSpyFixture);
  const goToGroundNoSpyPlayed = state.playCombatIntrigue(
    goToGroundNoSpy,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoSpyPlayed.pendingAction, undefined, "Go To Ground should not queue spy placement with no spies in supply");
  assert.equal(goToGroundNoSpyPlayed.phase, "combat", "Combat should continue with remaining actors after a no-spy Go To Ground");
  assert.equal(goToGroundNoSpyPlayed.players[goToGroundNoSpyPlayed.activeSeat].id, "p3");
  assert.match(goToGroundNoSpyPlayed.log[0], /retreats 2 troops\./);

  const occupiedNonPersonalSpyPosts = Object.fromEntries(
    data.boardSpaces.filter((space) => !space.personal).map((space) => [space.id, "p3"]),
  );
  const goToGroundNoLegalSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 3, intrigues: [goToGround] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    spyPosts: occupiedNonPersonalSpyPosts,
  };
  const goToGroundNoLegalSpy = state.startCombatPhase(goToGroundNoLegalSpyFixture);
  assert.deepEqual(
    state.placeableSpySpaces(goToGroundNoLegalSpy, { kind: "spy", ownerId: "p2", remaining: 1, source: "Go To Ground" }),
    [],
    "Test fixture should leave the Go To Ground recipient with spies but no legal spy posts",
  );
  const goToGroundNoLegalSpyPlayed = state.playCombatIntrigue(
    goToGroundNoLegalSpy,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoLegalSpyPlayed.pendingAction, undefined, "Go To Ground should not queue spy placement when every legal post is occupied");
  assert.equal(goToGroundNoLegalSpyPlayed.phase, "combat", "Combat should continue when Go To Ground has spies but no legal spy post");
  assert.equal(goToGroundNoLegalSpyPlayed.players[goToGroundNoLegalSpyPlayed.activeSeat].id, "p3");
  assert.match(goToGroundNoLegalSpyPlayed.log[0], /retreats 2 troops\./);

  const goToGroundNoSpyLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 0, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundNoSpyLastActor = state.startCombatPhase(goToGroundNoSpyLastActorFixture);
  const goToGroundNoSpyLastActorPlayed = state.playCombatIntrigue(
    goToGroundNoSpyLastActor,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoSpyLastActorPlayed.phase, "playing", "Go To Ground should resolve empty Combat immediately when no spy can be placed");
  assert.equal(goToGroundNoSpyLastActorPlayed.round, goToGroundNoSpyLastActorFixture.round + 1);
  assert.ok(
    goToGroundNoSpyLastActorPlayed.log.some((entry) => entry.includes("resolves with no winner")),
    "Go To Ground should resolve with no winner when the last units retreat and no spy is pending",
  );

  const goToGroundLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundLastActor = state.startCombatPhase(goToGroundLastActorFixture);
  const goToGroundLastActorPlayed = state.playCombatIntrigue(
    goToGroundLastActor,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundLastActorPlayed.phase, "combat", "Go To Ground should keep Combat open while spy placement is pending");
  assert.deepEqual(goToGroundLastActorPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
  });
  assert.deepEqual(
    state.combatIntrigueActorIds(goToGroundLastActorPlayed),
    [],
    "Go To Ground may leave no Combat actors before the spy choice resolves",
  );
  const goToGroundLastActorSpyPlaced = state.placeSpyForPending(
    goToGroundLastActorPlayed,
    goToGroundLastActorPlayed.pendingAction,
    secretsSpace.id,
  );
  assert.equal(goToGroundLastActorSpyPlaced.phase, "playing", "Placing the pending spy should then resolve empty Combat");
  assert.equal(goToGroundLastActorSpyPlaced.round, goToGroundLastActorFixture.round + 1);
  assert.equal(goToGroundLastActorSpyPlaced.spyPosts[secretsSpace.id], "p2");
  assert.ok(
    goToGroundLastActorSpyPlaced.log.some((entry) => entry.includes("resolves with no winner")),
    "Go To Ground should resolve the Conflict with no winner after the last units retreat and the spy resolves",
  );
  const goToGroundLastActorSkippedSpy = state.finishPendingAction(goToGroundLastActorPlayed);
  assert.equal(goToGroundLastActorSkippedSpy.phase, "playing", "Skipping the pending spy should also resolve empty Combat");
  assert.equal(goToGroundLastActorSkippedSpy.round, goToGroundLastActorFixture.round + 1);
  assert.equal(goToGroundLastActorSkippedSpy.spyPosts[secretsSpace.id], undefined);

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

  const findWeaknessNoSpyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [findWeakness] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const findWeaknessNoSpy = state.startCombatPhase(findWeaknessNoSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(findWeaknessNoSpy, playerById(findWeaknessNoSpy, "p2"), findWeakness),
    2,
    "Find Weakness should add its base 2 strength before any spy recall",
  );
  const findWeaknessNoSpyPlayed = state.playCombatIntrigue(findWeaknessNoSpy, "p2", findWeakness.id);
  assert.equal(playerById(findWeaknessNoSpyPlayed, "p2").conflict, 4);
  assert.equal(findWeaknessNoSpyPlayed.pendingAction, undefined, "Find Weakness should not queue recall without an owned spy post");
  assert.match(findWeaknessNoSpyPlayed.log[0], /plays Find Weakness for Feyd-Rautha Harkonnen, adding 2 strength/);

  const findWeaknessSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 2, intrigues: [findWeakness] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
            : player,
      ),
    ),
    spyPosts: { [secretsSpace.id]: "p2" },
  };
  const findWeaknessSpy = state.startCombatPhase(findWeaknessSpyFixture);
  const findWeaknessSpyPlayed = state.playCombatIntrigue(findWeaknessSpy, "p2", findWeakness.id);
  assert.equal(playerById(findWeaknessSpyPlayed, "p2").conflict, 4, "Find Weakness should add base strength immediately");
  assert.deepEqual(findWeaknessSpyPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 1,
    strength: 3,
    source: "Find Weakness",
    optional: true,
  });
  assert.deepEqual(
    state.recallableSpySpaces(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction).map((space) => space.name),
    ["Secrets"],
    "Find Weakness should list only the actor's spy posts for recall",
  );
  assert.equal(
    state.passCombatIntrigue(findWeaknessSpyPlayed, findWeaknessSpyPlayed.players[findWeaknessSpyPlayed.activeSeat].id),
    findWeaknessSpyPlayed,
    "Combat should stay locked while Find Weakness recall is pending",
  );
  assert.equal(
    state.playCombatIntrigue(findWeaknessSpyPlayed, findWeaknessSpyPlayed.players[findWeaknessSpyPlayed.activeSeat].id, verifierCombat.id),
    findWeaknessSpyPlayed,
    "Additional Combat Intrigues should wait for Find Weakness recall to resolve",
  );
  assert.equal(
    state.recallSpyForPending(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction, arrakeenSpace.id),
    findWeaknessSpyPlayed,
    "Find Weakness recall should reject unowned spy posts",
  );
  const findWeaknessActiveSeatAfterPlay = findWeaknessSpyPlayed.activeSeat;
  const findWeaknessSkipped = state.skipRecallSpy(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction);
  assert.equal(findWeaknessSkipped.pendingAction, undefined, "Skipping Find Weakness recall should clear the pending action");
  assert.equal(findWeaknessSkipped.activeSeat, findWeaknessActiveSeatAfterPlay, "Skipping Find Weakness recall should not advance Combat again");
  assert.equal(playerById(findWeaknessSkipped, "p2").spies, 2, "Skipping Find Weakness recall should keep the spy supply unchanged");
  assert.equal(findWeaknessSkipped.spyPosts[secretsSpace.id], "p2", "Skipping Find Weakness recall should leave the spy post in place");
  assert.equal(playerById(findWeaknessSkipped, "p2").conflict, 4, "Skipping Find Weakness recall should keep only the base strength");
  assert.match(findWeaknessSkipped.log[0], /declines to recall a spy for Find Weakness/);
  const findWeaknessRecalled = state.recallSpyForPending(
    findWeaknessSpyPlayed,
    findWeaknessSpyPlayed.pendingAction,
    secretsSpace.id,
  );
  assert.equal(findWeaknessRecalled.pendingAction, undefined, "Resolving Find Weakness recall should clear the pending action");
  assert.equal(findWeaknessRecalled.activeSeat, findWeaknessActiveSeatAfterPlay, "Resolving Find Weakness recall should not advance Combat again");
  assert.equal(playerById(findWeaknessRecalled, "p2").spies, 3, "Find Weakness should return the recalled spy to supply");
  assert.equal(findWeaknessRecalled.spyPosts[secretsSpace.id], undefined, "Find Weakness should remove the recalled spy post");
  assert.equal(playerById(findWeaknessRecalled, "p2").conflict, 7, "Find Weakness recall should add the 3 strength bonus");
  assert.match(findWeaknessRecalled.log[0], /recalls a spy from Secrets for Find Weakness, adding 3 strength/);

  const questionableNoInfluenceFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [questionableMethods] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const questionableNoInfluence = state.startCombatPhase(questionableNoInfluenceFixture);
  assert.equal(
    state.combatIntrigueStrength(questionableNoInfluence, playerById(questionableNoInfluence, "p2"), questionableMethods),
    1,
    "Questionable Methods should add its base 1 strength before any Influence loss",
  );
  const questionableNoInfluencePlayed = state.playCombatIntrigue(
    questionableNoInfluence,
    "p2",
    questionableMethods.id,
  );
  assert.equal(playerById(questionableNoInfluencePlayed, "p2").conflict, 3);
  assert.equal(
    questionableNoInfluencePlayed.pendingAction,
    undefined,
    "Questionable Methods should not queue Influence loss when the recipient has no Influence",
  );
  assert.equal(questionableNoInfluencePlayed.intrigueDiscard.at(-1).id, questionableMethods.id);
  assert.match(questionableNoInfluencePlayed.log[0], /plays Questionable Methods for Feyd-Rautha Harkonnen, adding 1 strength/);

  const questionableInfluenceFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            intrigues: [questionableMethods],
            influence: { ...player.influence, bene: 2 },
            vp: 1,
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
          : player,
    ),
  );
  const questionableInfluence = state.startCombatPhase(questionableInfluenceFixture);
  const questionableInfluencePlayed = state.playCombatIntrigue(questionableInfluence, "p2", questionableMethods.id);
  assert.equal(playerById(questionableInfluencePlayed, "p2").conflict, 3, "Questionable Methods should add base strength immediately");
  assert.deepEqual(questionableInfluencePlayed.pendingAction, {
    kind: "lose-influence",
    ownerId: "p2",
    combatRecipientId: "p2",
    strength: 4,
    source: "Questionable Methods",
    optional: true,
  });
  assert.deepEqual(
    state.influenceLossChoices(playerById(questionableInfluencePlayed, "p2")),
    ["bene"],
    "Questionable Methods should list only positive Influence tracks",
  );
  assert.deepEqual(
    state.influenceLossOptions(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction),
    [{ ownerId: "p2", faction: "bene" }],
    "Questionable Methods should expose Influence-loss owner choices",
  );
  assert.equal(
    state.passCombatIntrigue(questionableInfluencePlayed, questionableInfluencePlayed.players[questionableInfluencePlayed.activeSeat].id),
    questionableInfluencePlayed,
    "Combat should stay locked while Questionable Methods Influence loss is pending",
  );
  assert.equal(
    state.playCombatIntrigue(questionableInfluencePlayed, questionableInfluencePlayed.players[questionableInfluencePlayed.activeSeat].id, verifierCombat.id),
    questionableInfluencePlayed,
    "Additional Combat Intrigues should wait for Questionable Methods Influence loss to resolve",
  );
  assert.equal(
    state.loseInfluenceForPending(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction, "p2", "emperor"),
    questionableInfluencePlayed,
    "Questionable Methods should reject Influence tracks the recipient cannot lose",
  );
  assert.equal(
    state.loseInfluenceForPending(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction, "missing", "bene"),
    questionableInfluencePlayed,
    "Questionable Methods should reject missing Influence-loss owners without advancing pending actions",
  );
  assert.equal(
    state.loseInfluenceForPending(
      questionableInfluencePlayed,
      { ...questionableInfluencePlayed.pendingAction, combatRecipientId: "missing" },
      "p2",
      "bene",
    ),
    questionableInfluencePlayed,
    "Questionable Methods should reject stale or forged pending actions",
  );
  const questionableMissingRecipientState = {
    ...questionableInfluencePlayed,
    pendingAction: { ...questionableInfluencePlayed.pendingAction, combatRecipientId: "missing" },
  };
  assert.equal(
    state.loseInfluenceForPending(
      questionableMissingRecipientState,
      questionableMissingRecipientState.pendingAction,
      "p2",
      "bene",
    ),
    questionableMissingRecipientState,
    "Questionable Methods should reject missing combat recipients without advancing pending actions",
  );
  const questionableActiveSeatAfterPlay = questionableInfluencePlayed.activeSeat;
  const questionableSkipped = state.skipLoseInfluence(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction);
  assert.equal(questionableSkipped.pendingAction, undefined, "Skipping Questionable Methods should clear the pending action");
  assert.equal(questionableSkipped.activeSeat, questionableActiveSeatAfterPlay, "Skipping Questionable Methods should not advance Combat again");
  assert.equal(playerById(questionableSkipped, "p2").influence.bene, 2, "Skipping Questionable Methods should keep Influence");
  assert.equal(playerById(questionableSkipped, "p2").conflict, 3, "Skipping Questionable Methods should keep only the base strength");
  assert.match(questionableSkipped.log[0], /No Influence is lost for Questionable Methods/);
  const questionableLostInfluence = state.loseInfluenceForPending(
    questionableInfluencePlayed,
    questionableInfluencePlayed.pendingAction,
    "p2",
    "bene",
  );
  assert.equal(questionableLostInfluence.pendingAction, undefined, "Resolving Questionable Methods should clear the pending action");
  assert.equal(questionableLostInfluence.activeSeat, questionableActiveSeatAfterPlay, "Resolving Questionable Methods should not advance Combat again");
  assert.equal(playerById(questionableLostInfluence, "p2").influence.bene, 1, "Questionable Methods should remove 1 Influence");
  assert.equal(playerById(questionableLostInfluence, "p2").vp, 0, "Questionable Methods should remove the Influence threshold VP");
  assert.equal(playerById(questionableLostInfluence, "p2").conflict, 7, "Questionable Methods Influence loss should add 4 strength");
  assert.match(questionableLostInfluence.log[0], /loses 1 Bene Gesserit Influence for Questionable Methods, adding 4 strength/);

  const springTheTrapOneSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 2, intrigues: [springTheTrap] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    spyPosts: { [secretsSpace.id]: "p2" },
  };
  const springTheTrapOneSpy = state.startCombatPhase(springTheTrapOneSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(springTheTrapOneSpy, playerById(springTheTrapOneSpy, "p2"), springTheTrap),
    undefined,
    "Spring The Trap should require two actor-owned spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapOneSpy, "p2", springTheTrap.id),
    springTheTrapOneSpy,
    "Spring The Trap should not play with only one actor-owned spy post",
  );
  const springTheTrapMixedSpy = {
    ...springTheTrapOneSpy,
    spyPosts: { [secretsSpace.id]: "p2", [espionageSpace.id]: "p3" },
  };
  assert.equal(
    state.combatIntrigueStrength(springTheTrapMixedSpy, playerById(springTheTrapMixedSpy, "p2"), springTheTrap),
    undefined,
    "Spring The Trap should not count another player's spy post",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapMixedSpy, "p2", springTheTrap.id),
    springTheTrapMixedSpy,
    "Spring The Trap should stay blocked with mixed spy ownership",
  );

  const springTheTrapTwoSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 1, intrigues: [springTheTrap] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
            : player,
      ),
    ),
    spyPosts: { [secretsSpace.id]: "p2", [espionageSpace.id]: "p2" },
  };
  const springTheTrapTwoSpy = state.startCombatPhase(springTheTrapTwoSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(springTheTrapTwoSpy, playerById(springTheTrapTwoSpy, "p2"), springTheTrap),
    7,
    "Spring The Trap should become playable with two actor-owned spy posts",
  );
  const springTheTrapPlayed = state.playCombatIntrigue(springTheTrapTwoSpy, "p2", springTheTrap.id);
  assert.deepEqual(playerById(springTheTrapPlayed, "p2").intrigues, [], "Spring The Trap should leave the player's hand");
  assert.equal(springTheTrapPlayed.intrigueDiscard.at(-1).id, springTheTrap.id, "Spring The Trap should be discarded when played");
  assert.equal(playerById(springTheTrapPlayed, "p2").conflict, 2, "Spring The Trap should not add strength before recalls resolve");
  assert.deepEqual(springTheTrapPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 2,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  assert.deepEqual(
    state.recallableSpySpaces(springTheTrapPlayed, springTheTrapPlayed.pendingAction).map((space) => space.name),
    ["Secrets", "Espionage"],
    "Spring The Trap should list the actor's two spy posts for recall",
  );
  assert.equal(
    state.skipRecallSpy(springTheTrapPlayed, springTheTrapPlayed.pendingAction),
    springTheTrapPlayed,
    "Spring The Trap recall should be required",
  );
  assert.equal(
    state.passCombatIntrigue(springTheTrapPlayed, springTheTrapPlayed.players[springTheTrapPlayed.activeSeat].id),
    springTheTrapPlayed,
    "Combat should stay locked while Spring The Trap recall is pending",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapPlayed, springTheTrapPlayed.players[springTheTrapPlayed.activeSeat].id, verifierCombat.id),
    springTheTrapPlayed,
    "Additional Combat Intrigues should wait for Spring The Trap recall to resolve",
  );
  const springActiveSeatAfterPlay = springTheTrapPlayed.activeSeat;
  const springFirstRecall = state.recallSpyForPending(springTheTrapPlayed, springTheTrapPlayed.pendingAction, secretsSpace.id);
  assert.equal(springFirstRecall.activeSeat, springActiveSeatAfterPlay, "First Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springFirstRecall, "p2").spies, 2, "First Spring The Trap recall should return one spy to supply");
  assert.equal(playerById(springFirstRecall, "p2").conflict, 2, "First Spring The Trap recall should not add partial strength");
  assert.equal(springFirstRecall.spyPosts[secretsSpace.id], undefined);
  assert.equal(springFirstRecall.spyPosts[espionageSpace.id], "p2");
  assert.deepEqual(springFirstRecall.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 1,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  const springSecondRecall = state.recallSpyForPending(springFirstRecall, springFirstRecall.pendingAction, espionageSpace.id);
  assert.equal(springSecondRecall.pendingAction, undefined, "Second Spring The Trap recall should clear the pending action");
  assert.equal(springSecondRecall.activeSeat, springActiveSeatAfterPlay, "Second Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springSecondRecall, "p2").spies, 3, "Spring The Trap should return both recalled spies to supply");
  assert.equal(springSecondRecall.spyPosts[espionageSpace.id], undefined);
  assert.equal(playerById(springSecondRecall, "p2").conflict, 9, "Spring The Trap should add 7 strength after the second recall");
  assert.match(springSecondRecall.log[0], /recalls a spy from Espionage for Spring The Trap, adding 7 strength/);

  const devourNoWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, deployedSandworms: 0, intrigues: [devour] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const devourNoWorm = state.startCombatPhase(devourNoWormFixture);
  assert.equal(
    state.combatIntrigueStrength(devourNoWorm, playerById(devourNoWorm, "p2"), devour),
    2,
    "Devour should add 2 strength without a sandworm in the recipient's Conflict",
  );
  const devourNoWormPlayed = state.playCombatIntrigue(devourNoWorm, "p2", devour.id);
  assert.equal(playerById(devourNoWormPlayed, "p2").conflict, 4);
  assert.equal(devourNoWormPlayed.pendingAction, undefined, "Devour should not offer trash without a sandworm");
  assert.equal(devourNoWormPlayed.intrigueDiscard.at(-1).id, devour.id);
  assert.match(devourNoWormPlayed.log[0], /plays Devour for Feyd-Rautha Harkonnen, adding 2 strength/);

  const devourTrashChoice = starterCard(data, 0);
  const devourWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            deployedSandworms: 1,
            playArea: [devourTrashChoice],
            intrigues: [devour],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const devourWorm = state.startCombatPhase(devourWormFixture);
  assert.equal(
    state.combatIntrigueStrength(devourWorm, playerById(devourWorm, "p2"), devour),
    4,
    "Devour should add 4 strength when the recipient has a sandworm in the Conflict",
  );
  const devourWormPlayed = state.playCombatIntrigue(devourWorm, "p2", devour.id);
  assert.equal(playerById(devourWormPlayed, "p2").conflict, 6);
  assert.deepEqual(devourWormPlayed.pendingAction, {
    kind: "trash-card",
    ownerId: "p2",
    source: "Devour",
    optional: true,
  });
  assert.match(devourWormPlayed.log[0], /adding 4 strength and may trash a card/);
  assert.ok(devourWormPlayed.pendingAction, "Devour should queue an optional trash choice");
  assert.equal(
    state.passCombatIntrigue(devourWormPlayed, devourWormPlayed.players[devourWormPlayed.activeSeat].id),
    devourWormPlayed,
    "Combat should stay locked while Devour trash is pending",
  );
  assert.equal(
    state.playCombatIntrigue(devourWormPlayed, devourWormPlayed.players[devourWormPlayed.activeSeat].id, verifierCombat.id),
    devourWormPlayed,
    "Additional Combat Intrigues should wait for Devour trash to resolve",
  );
  const devourActiveSeatAfterPlay = devourWormPlayed.activeSeat;
  const devourSkipped = state.skipTrashCard(devourWormPlayed, devourWormPlayed.pendingAction);
  assert.equal(devourSkipped.pendingAction, undefined, "Skipping Devour trash should clear the pending action");
  assert.equal(devourSkipped.activeSeat, devourActiveSeatAfterPlay, "Skipping Devour trash should not advance Combat again");
  assert.equal(playerById(devourSkipped, "p2").playArea.length, 1, "Skipping Devour trash should keep the card");
  assert.match(devourSkipped.log[0], /declines to trash a card from Devour/);
  const devourTrashed = state.trashPlayerCard(devourWormPlayed, devourWormPlayed.pendingAction, "playArea", devourTrashChoice.id);
  assert.equal(devourTrashed.pendingAction, undefined, "Trashing from Devour should clear the pending action");
  assert.equal(devourTrashed.activeSeat, devourActiveSeatAfterPlay, "Resolving Devour trash should not advance Combat again");
  assert.deepEqual(playerById(devourTrashed, "p2").playArea, []);
  assert.ok(
    devourTrashed.log[0].includes(`trashes ${devourTrashChoice.name} from Devour`),
    "Devour trash should log the selected card",
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
  assert.equal(
    state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id),
    commanderCombat,
    "Commander Combat Intrigues should require an explicit Ally target",
  );
  const commanderPlayed = state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id, "p6");
  assert.equal(playerById(commanderPlayed, "p6").conflict, 3, "Commander Combat Intrigue should add strength to the chosen Ally");
  assert.deepEqual(playerById(commanderPlayed, "p4").intrigues, []);
  assert.equal(playerById(commanderPlayed, "p2").conflict, 5, "Other eligible Allies should not receive the chosen card's strength");

  const commanderSpiceSpendFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, resources: { ...player.resources, spice: 5 }, intrigues: [spiceIsPower] };
        }
        if (player.id === "p6") {
          return { ...player, conflict: 1, deployedTroops: 1, resources: { ...player.resources, spice: 3 } };
        }
        return player;
      }),
    3,
  );
  const commanderSpiceSpend = state.startCombatPhase(commanderSpiceSpendFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpiceSpend, playerById(commanderSpiceSpend, "p4"), spiceIsPower),
    undefined,
    "Commander Spice is Power should need a target before checking spend-branch spice",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderSpiceSpend, playerById(commanderSpiceSpend, "p4"), spiceIsPower, playerById(commanderSpiceSpend, "p6")),
    6,
    "Commander Spice is Power should use the target Ally's spice for the spend branch",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpiceSpend, "p4", spiceIsPower.id, undefined, "spend-spice"),
    commanderSpiceSpend,
    "Commander Spice is Power should require an explicit Ally target",
  );
  const commanderSpiceSpent = state.playCombatIntrigue(
    commanderSpiceSpend,
    "p4",
    spiceIsPower.id,
    "p6",
    "spend-spice",
  );
  assert.equal(playerById(commanderSpiceSpent, "p6").resources.spice, 0, "Commander Spice is Power spend branch should spend the target Ally's spice");
  assert.equal(playerById(commanderSpiceSpent, "p6").conflict, 7, "Commander Spice is Power spend branch should add strength to the target Ally");
  assert.equal(playerById(commanderSpiceSpent, "p4").resources.spice, 5, "Commander Spice is Power should not spend Commander spice");
  assert.equal(playerById(commanderSpiceSpent, "p2").conflict, 5, "Commander Spice is Power should not split effects");
  assert.match(commanderSpiceSpent.log[0], /Princess Irulan spends 3 spice to add 6 strength/);

  const commanderSpiceRetreatFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [spiceIsPower] };
        if (player.id === "p6") {
          return { ...player, conflict: 8, deployedTroops: 3, garrison: 0, resources: { ...player.resources, spice: 0 } };
        }
        return player;
      }),
    3,
  );
  const commanderSpiceRetreat = state.startCombatPhase(commanderSpiceRetreatFixture);
  const commanderSpiceRetreated = state.playCombatIntrigue(
    commanderSpiceRetreat,
    "p4",
    spiceIsPower.id,
    "p6",
    "retreat-troops",
  );
  assert.equal(playerById(commanderSpiceRetreated, "p6").deployedTroops, 0, "Commander Spice is Power should retreat the target Ally's troops");
  assert.equal(playerById(commanderSpiceRetreated, "p6").garrison, 3);
  assert.equal(playerById(commanderSpiceRetreated, "p6").resources.spice, 3);
  assert.equal(playerById(commanderSpiceRetreated, "p6").conflict, 2);
  assert.equal(playerById(commanderSpiceRetreated, "p2").conflict, 5);
  assert.match(commanderSpiceRetreated.log[0], /Princess Irulan retreats 3 troops and gains 3 spice/);

  const commanderTacticalFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [tacticalOption] };
        if (player.id === "p6") return { ...player, conflict: 7, deployedTroops: 3, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderTactical = state.startCombatPhase(commanderTacticalFixture);
  assert.equal(
    state.playCombatIntrigue(commanderTactical, "p4", tacticalOption.id, undefined, "add-strength"),
    commanderTactical,
    "Commander Tactical Option should require an explicit Ally target",
  );
  const commanderTacticalAdded = state.playCombatIntrigue(
    commanderTactical,
    "p4",
    tacticalOption.id,
    "p6",
    "add-strength",
  );
  assert.equal(playerById(commanderTacticalAdded, "p6").conflict, 9, "Commander Tactical Option should add strength to the target Ally");
  assert.equal(playerById(commanderTacticalAdded, "p2").conflict, 5, "Commander Tactical Option should not split effects");

  const commanderTacticalRetreated = state.playCombatIntrigue(
    commanderTactical,
    "p4",
    tacticalOption.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderTacticalRetreated, "p6").deployedTroops, 1, "Commander Tactical Option should retreat target Ally troops");
  assert.equal(playerById(commanderTacticalRetreated, "p6").garrison, 2);
  assert.equal(playerById(commanderTacticalRetreated, "p6").conflict, 3);
  assert.equal(playerById(commanderTacticalRetreated, "p2").conflict, 5);
  assert.match(commanderTacticalRetreated.log[0], /Princess Irulan retreats 2 troops/);

  const commanderTacticalAllRetreatFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [tacticalOption] };
        if (player.id === "p6") return { ...player, conflict: 6, deployedTroops: 3, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderTacticalAllRetreat = state.startCombatPhase(commanderTacticalAllRetreatFixture);
  const commanderTacticalAllRetreated = state.playCombatIntrigue(
    commanderTacticalAllRetreat,
    "p4",
    tacticalOption.id,
    "p6",
    { kind: "retreat-troops", count: 3 },
  );
  assert.equal(playerById(commanderTacticalAllRetreated, "p6").deployedTroops, 0);
  assert.equal(playerById(commanderTacticalAllRetreated, "p6").conflict, 0);
  assert.equal(playerById(commanderTacticalAllRetreated, "p2").conflict, 5);
  assert.equal(
    commanderTacticalAllRetreated.players[commanderTacticalAllRetreated.activeSeat].id,
    "p2",
    "Commander Tactical Option should continue with another eligible same-team Ally after the target retreats fully",
  );

  const commanderReachAgreementContract = data.standardContracts[3];
  const commanderReachAgreementFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [reachAgreement] };
          if (player.id === "p6") return { ...player, conflict: 4, deployedTroops: 2, garrison: 0 };
          return player;
        }),
      3,
    ),
    contractOffer: [commanderReachAgreementContract],
    contractDeck: [],
  };
  const commanderReachAgreement = state.startCombatPhase(commanderReachAgreementFixture);
  assert.equal(
    state.playCombatIntrigue(commanderReachAgreement, "p4", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1 }),
    commanderReachAgreement,
    "Commander Reach Agreement should require an explicit Ally target",
  );
  const commanderReachAgreementPlayed = state.playCombatIntrigue(
    commanderReachAgreement,
    "p4",
    reachAgreement.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").deployedTroops, 0, "Commander Reach Agreement should retreat target Ally troops");
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").garrison, 2);
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").conflict, 0);
  assert.equal(playerById(commanderReachAgreementPlayed, "p2").conflict, 5, "Commander Reach Agreement should not split effects");
  assert.deepEqual(playerById(commanderReachAgreementPlayed, "p4").intrigues, [], "Commander Reach Agreement should leave the Commander's hand");
  assert.deepEqual(commanderReachAgreementPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p6",
    source: "Reach Agreement",
  });
  assert.equal(
    commanderReachAgreementPlayed.players[commanderReachAgreementPlayed.activeSeat].id,
    "p2",
    "Commander Reach Agreement should continue with another eligible Ally after the target retreats fully",
  );
  const commanderReachAgreementTookContract = state.takeChoamContract(
    commanderReachAgreementPlayed,
    commanderReachAgreementPlayed.pendingAction,
    commanderReachAgreementContract.id,
  );
  assert.equal(playerById(commanderReachAgreementTookContract, "p6").contracts.at(-1).card.id, commanderReachAgreementContract.id);
  assert.equal(playerById(commanderReachAgreementTookContract, "p4").contracts.length, 0, "Commander Reach Agreement should not give the Commander the contract");
  assert.equal(playerById(commanderReachAgreementTookContract, "p2").contracts.length, 0, "Commander Reach Agreement should not give a different Ally the contract");
  assert.equal(commanderReachAgreementTookContract.phase, "combat");
  assert.equal(commanderReachAgreementTookContract.players[commanderReachAgreementTookContract.activeSeat].id, "p2");
  assert.match(commanderReachAgreementTookContract.log[0], /Princess Irulan takes the .* CHOAM contract from Reach Agreement/);

  const commanderGoToGroundFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [goToGround] };
        if (player.id === "p6") return { ...player, conflict: 4, deployedTroops: 2, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderGoToGround = state.startCombatPhase(commanderGoToGroundFixture);
  assert.equal(
    state.playCombatIntrigue(commanderGoToGround, "p4", goToGround.id, undefined, { kind: "retreat-troops", count: 1 }),
    commanderGoToGround,
    "Commander Go To Ground should require an explicit Ally target",
  );
  const commanderGoToGroundPlayed = state.playCombatIntrigue(
    commanderGoToGround,
    "p4",
    goToGround.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").deployedTroops, 0, "Commander Go To Ground should retreat target Ally troops");
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").garrison, 2);
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").conflict, 0);
  assert.equal(playerById(commanderGoToGroundPlayed, "p2").conflict, 5, "Commander Go To Ground should not split effects");
  assert.deepEqual(playerById(commanderGoToGroundPlayed, "p4").intrigues, [], "Commander Go To Ground should leave the Commander's hand");
  assert.deepEqual(commanderGoToGroundPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p6",
    remaining: 1,
    source: "Go To Ground",
  });
  assert.equal(
    commanderGoToGroundPlayed.players[commanderGoToGroundPlayed.activeSeat].id,
    "p2",
    "Commander Go To Ground should continue with another eligible Ally after the target retreats fully",
  );
  const commanderGoToGroundSpyPlaced = state.placeSpyForPending(
    commanderGoToGroundPlayed,
    commanderGoToGroundPlayed.pendingAction,
    espionageSpace.id,
  );
  assert.equal(commanderGoToGroundSpyPlaced.phase, "combat");
  assert.equal(commanderGoToGroundSpyPlaced.players[commanderGoToGroundSpyPlaced.activeSeat].id, "p2");
  assert.equal(playerById(commanderGoToGroundSpyPlaced, "p6").spies, playerById(commanderGoToGroundPlayed, "p6").spies - 1);
  assert.equal(playerById(commanderGoToGroundSpyPlaced, "p4").spies, playerById(commanderGoToGroundPlayed, "p4").spies, "Commander Go To Ground should not spend a Commander spy");
  assert.equal(commanderGoToGroundSpyPlaced.spyPosts[espionageSpace.id], "p6", "Commander Go To Ground should place the target Ally's spy");
  assert.match(commanderGoToGroundSpyPlaced.log[0], /Princess Irulan places a spy near Espionage from Go To Ground/);

  const commanderFindWeaknessFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, spies: 2, intrigues: [findWeakness] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p4" },
  };
  const commanderFindWeakness = state.startCombatPhase(commanderFindWeaknessFixture);
  assert.equal(
    state.playCombatIntrigue(commanderFindWeakness, "p4", findWeakness.id),
    commanderFindWeakness,
    "Commander Find Weakness should require an explicit Ally target",
  );
  const commanderFindWeaknessPlayed = state.playCombatIntrigue(commanderFindWeakness, "p4", findWeakness.id, "p6");
  assert.equal(playerById(commanderFindWeaknessPlayed, "p6").conflict, 3, "Commander Find Weakness base strength should go to the target");
  assert.equal(playerById(commanderFindWeaknessPlayed, "p2").conflict, 5, "Commander Find Weakness should not split strength");
  assert.deepEqual(commanderFindWeaknessPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p4",
    combatRecipientId: "p6",
    remaining: 1,
    strength: 3,
    source: "Find Weakness",
    optional: true,
  });
  const commanderFindWeaknessRecalled = state.recallSpyForPending(
    commanderFindWeaknessPlayed,
    commanderFindWeaknessPlayed.pendingAction,
    secretsSpace.id,
  );
  assert.equal(playerById(commanderFindWeaknessRecalled, "p4").spies, 3, "Commander Find Weakness should recall the Commander's own spy");
  assert.equal(playerById(commanderFindWeaknessRecalled, "p6").conflict, 6, "Commander Find Weakness recall should add bonus strength to the target Ally");
  assert.equal(commanderFindWeaknessRecalled.spyPosts[secretsSpace.id], undefined);

  const commanderFindWeaknessAllySpyFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [findWeakness] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1, spies: 2 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p6" },
  };
  const commanderFindWeaknessAllySpy = state.startCombatPhase(commanderFindWeaknessAllySpyFixture);
  const commanderFindWeaknessAllySpyPlayed = state.playCombatIntrigue(
    commanderFindWeaknessAllySpy,
    "p4",
    findWeakness.id,
    "p6",
  );
  assert.equal(
    commanderFindWeaknessAllySpyPlayed.pendingAction,
    undefined,
    "Commander Find Weakness should not recall a target Ally's spy",
  );
  assert.equal(playerById(commanderFindWeaknessAllySpyPlayed, "p6").conflict, 3);
  assert.equal(commanderFindWeaknessAllySpyPlayed.spyPosts[secretsSpace.id], "p6");

  const commanderQuestionableMethodsFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [questionableMethods] };
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            influence: { ...player.influence, fringeWorlds: 2 },
            vp: 1,
          };
        }
        return player;
      }),
    3,
  );
  const commanderQuestionableMethods = state.startCombatPhase(commanderQuestionableMethodsFixture);
  assert.equal(
    state.playCombatIntrigue(commanderQuestionableMethods, "p4", questionableMethods.id),
    commanderQuestionableMethods,
    "Commander Questionable Methods should require an explicit Ally target",
  );
  const commanderQuestionableMethodsPlayed = state.playCombatIntrigue(
    commanderQuestionableMethods,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.equal(playerById(commanderQuestionableMethodsPlayed, "p6").conflict, 2, "Commander Questionable Methods base strength should go to the target");
  assert.equal(playerById(commanderQuestionableMethodsPlayed, "p2").conflict, 5, "Commander Questionable Methods should not split strength");
  assert.deepEqual(commanderQuestionableMethodsPlayed.pendingAction, {
    kind: "lose-influence",
    ownerId: "p6",
    combatRecipientId: "p6",
    strength: 4,
    source: "Questionable Methods",
    optional: true,
  });
  const commanderQuestionableMethodsLostInfluence = state.loseInfluenceForPending(
    commanderQuestionableMethodsPlayed,
    commanderQuestionableMethodsPlayed.pendingAction,
    "p6",
    "fringeWorlds",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p6").influence.fringeWorlds,
    1,
    "Commander Questionable Methods should spend the target Ally's Influence",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p6").conflict,
    6,
    "Commander Questionable Methods should add bonus strength to the target Ally",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p4").influence.fringeWorlds,
    0,
    "Commander Questionable Methods should not spend the Commander's Influence",
  );
  assert.equal(playerById(commanderQuestionableMethodsLostInfluence, "p2").conflict, 5);

  const commanderQuestionableMethodsActorInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, emperor: 2 }, vp: 1 };
        }
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsActorInfluence = state.startCombatPhase(commanderQuestionableMethodsActorInfluenceFixture);
  const commanderQuestionableMethodsActorInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsActorInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.deepEqual(
    commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    {
      kind: "lose-influence",
      ownerId: "p6",
      alternateOwnerIds: ["p4"],
      combatRecipientId: "p6",
      strength: 4,
      source: "Questionable Methods",
      optional: true,
    },
    "Commander Questionable Methods should allow the Commander to spend their personal Influence",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      commanderQuestionableMethodsActorInfluencePlayed,
      commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    ),
    [{ ownerId: "p4", faction: "emperor" }],
    "Commander Questionable Methods should expose only the Commander's personal Influence when the target Ally has none",
  );
  assert.equal(playerById(commanderQuestionableMethodsActorInfluencePlayed, "p6").conflict, 2);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluencePlayed, "p4").influence.emperor, 2);
  const commanderQuestionableMethodsActorInfluenceLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsActorInfluencePlayed,
    commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    "p4",
    "emperor",
  );
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p4").influence.emperor, 1);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p4").vp, 0);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p6").conflict, 6);

  assert.equal(
    state.loseInfluenceForPending(
      commanderQuestionableMethodsActorInfluencePlayed,
      commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
      "p4",
      "bene",
    ),
    commanderQuestionableMethodsActorInfluencePlayed,
    "Commander Questionable Methods should reject non-personal Commander Influence tracks",
  );

  const muadDibQuestionableMethodsActorInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p1") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, fremen: 2 }, vp: 1 };
        }
        if (player.id === "p3") return { ...player, conflict: 1, deployedTroops: 1 };
        if (player.id === "p5") return { ...player, conflict: 5, deployedTroops: 1 };
        return player;
      }),
    0,
  );
  const muadDibQuestionableMethodsActorInfluence = state.startCombatPhase(
    muadDibQuestionableMethodsActorInfluenceFixture,
  );
  const muadDibQuestionableMethodsActorInfluencePlayed = state.playCombatIntrigue(
    muadDibQuestionableMethodsActorInfluence,
    "p1",
    questionableMethods.id,
    "p3",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      muadDibQuestionableMethodsActorInfluencePlayed,
      muadDibQuestionableMethodsActorInfluencePlayed.pendingAction,
    ),
    [{ ownerId: "p1", faction: "fremen" }],
    "Muad'Dib Questionable Methods should expose the Commander's personal Fremen Influence",
  );
  const muadDibQuestionableMethodsActorInfluenceLost = state.loseInfluenceForPending(
    muadDibQuestionableMethodsActorInfluencePlayed,
    muadDibQuestionableMethodsActorInfluencePlayed.pendingAction,
    "p1",
    "fremen",
  );
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p1").influence.fremen, 1);
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p1").vp, 0);
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p3").conflict, 6);

  const commanderQuestionableMethodsMixedInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, emperor: 2 }, vp: 1 };
        }
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            influence: { ...player.influence, fringeWorlds: 2 },
            vp: 1,
          };
        }
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsMixedInfluence = state.startCombatPhase(commanderQuestionableMethodsMixedInfluenceFixture);
  const commanderQuestionableMethodsMixedInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsMixedInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      commanderQuestionableMethodsMixedInfluencePlayed,
      commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    ),
    [
      { ownerId: "p6", faction: "fringeWorlds" },
      { ownerId: "p4", faction: "emperor" },
    ],
    "Commander Questionable Methods should expose both target Ally and Commander personal Influence choices",
  );
  const commanderQuestionableMethodsMixedActiveSeat = commanderQuestionableMethodsMixedInfluencePlayed.activeSeat;
  const commanderQuestionableMethodsMixedTargetLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsMixedInfluencePlayed,
    commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    "p6",
    "fringeWorlds",
  );
  assert.equal(
    commanderQuestionableMethodsMixedTargetLost.activeSeat,
    commanderQuestionableMethodsMixedActiveSeat,
    "Mixed Questionable Methods target resolution should not advance Combat again",
  );
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p6").influence.fringeWorlds, 1);
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p4").influence.emperor, 2);
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p6").conflict, 6);
  const commanderQuestionableMethodsMixedCommanderLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsMixedInfluencePlayed,
    commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    "p4",
    "emperor",
  );
  assert.equal(
    commanderQuestionableMethodsMixedCommanderLost.activeSeat,
    commanderQuestionableMethodsMixedActiveSeat,
    "Mixed Questionable Methods Commander resolution should not advance Combat again",
  );
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p6").influence.fringeWorlds, 2);
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p4").influence.emperor, 1);
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p6").conflict, 6);

  const commanderQuestionableMethodsUnrelatedInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return { ...player, conflict: 5, deployedTroops: 1, influence: { ...player.influence, bene: 2 }, vp: 1 };
        }
        if (player.id === "p4") return { ...player, intrigues: [questionableMethods] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsUnrelatedInfluence = state.startCombatPhase(
    commanderQuestionableMethodsUnrelatedInfluenceFixture,
  );
  const commanderQuestionableMethodsUnrelatedInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsUnrelatedInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.equal(
    commanderQuestionableMethodsUnrelatedInfluencePlayed.pendingAction,
    undefined,
    "Commander Questionable Methods should not spend an unrelated Ally's Influence",
  );
  assert.equal(playerById(commanderQuestionableMethodsUnrelatedInfluencePlayed, "p6").conflict, 2);
  assert.equal(playerById(commanderQuestionableMethodsUnrelatedInfluencePlayed, "p2").influence.bene, 2);

  const commanderSpringFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, spies: 1, intrigues: [springTheTrap] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p4", [espionageSpace.id]: "p4" },
  };
  const commanderSpring = state.startCombatPhase(commanderSpringFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpring, playerById(commanderSpring, "p4"), springTheTrap),
    7,
    "Commander Spring The Trap should use the Commander's own spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpring, "p4", springTheTrap.id),
    commanderSpring,
    "Commander Spring The Trap should require an explicit Ally target",
  );
  const commanderSpringPlayed = state.playCombatIntrigue(commanderSpring, "p4", springTheTrap.id, "p6");
  assert.deepEqual(playerById(commanderSpringPlayed, "p4").intrigues, [], "Commander Spring The Trap should leave the Commander's hand");
  assert.equal(commanderSpringPlayed.intrigueDiscard.at(-1).id, springTheTrap.id);
  assert.equal(playerById(commanderSpringPlayed, "p6").conflict, 1, "Commander Spring The Trap should wait to add strength until recalls resolve");
  assert.equal(playerById(commanderSpringPlayed, "p2").conflict, 5, "Commander Spring The Trap should not split strength");
  assert.deepEqual(commanderSpringPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p4",
    combatRecipientId: "p6",
    remaining: 2,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  const commanderSpringFirstRecall = state.recallSpyForPending(commanderSpringPlayed, commanderSpringPlayed.pendingAction, secretsSpace.id);
  const commanderSpringSecondRecall = state.recallSpyForPending(
    commanderSpringFirstRecall,
    commanderSpringFirstRecall.pendingAction,
    espionageSpace.id,
  );
  assert.equal(playerById(commanderSpringSecondRecall, "p4").spies, 3, "Commander Spring The Trap should recall the Commander's own spies");
  assert.equal(playerById(commanderSpringSecondRecall, "p6").conflict, 8, "Commander Spring The Trap should add strength to the target Ally");
  assert.equal(playerById(commanderSpringSecondRecall, "p2").conflict, 5);
  assert.equal(commanderSpringSecondRecall.spyPosts[secretsSpace.id], undefined);
  assert.equal(commanderSpringSecondRecall.spyPosts[espionageSpace.id], undefined);

  const commanderSpringAllySpyFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [springTheTrap] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1, spies: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p6", [espionageSpace.id]: "p6" },
  };
  const commanderSpringAllySpy = state.startCombatPhase(commanderSpringAllySpyFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpringAllySpy, playerById(commanderSpringAllySpy, "p4"), springTheTrap),
    undefined,
    "Commander Spring The Trap should not count the target Ally's spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpringAllySpy, "p4", springTheTrap.id, "p6"),
    commanderSpringAllySpy,
    "Commander Spring The Trap should stay blocked when only the target Ally has spy posts",
  );

  const commanderDevourTrashChoice = starterCard(data, 1);
  const commanderDevourFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1, deployedSandworms: 0 };
        if (player.id === "p4") return { ...player, intrigues: [devour] };
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            deployedSandworms: 1,
            discard: [commanderDevourTrashChoice],
          };
        }
        return player;
      }),
    3,
  );
  const commanderDevour = state.startCombatPhase(commanderDevourFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour),
    undefined,
    "Commander Devour needs a target before resolving sandworm-dependent strength",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour, playerById(commanderDevour, "p2")),
    2,
    "Commander Devour should add 2 for a target without sandworms",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour, playerById(commanderDevour, "p6")),
    4,
    "Commander Devour should add 4 for a target with sandworms",
  );
  assert.equal(
    state.playCombatIntrigue(commanderDevour, "p4", devour.id),
    commanderDevour,
    "Commander Devour should require an explicit Ally target",
  );
  const commanderDevourPlayed = state.playCombatIntrigue(commanderDevour, "p4", devour.id, "p6");
  assert.equal(playerById(commanderDevourPlayed, "p6").conflict, 5);
  assert.equal(playerById(commanderDevourPlayed, "p2").conflict, 5);
  assert.deepEqual(commanderDevourPlayed.pendingAction, {
    kind: "trash-card",
    ownerId: "p6",
    source: "Devour",
    optional: true,
  });
  assert.match(commanderDevourPlayed.log[0], /Shaddam Corrino IV plays Devour for Princess Irulan, adding 4 strength/);
  const commanderDevourHandTrashed = state.trashPlayerCard(
    commanderDevourPlayed,
    commanderDevourPlayed.pendingAction,
    "discard",
    commanderDevourTrashChoice.id,
  );
  assert.deepEqual(playerById(commanderDevourHandTrashed, "p6").discard, [], "Devour should trash from discard when selected");

  const devourHandTrashChoice = starterCard(data, 2);
  const devourHandFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            deployedSandworms: 1,
            hand: [devourHandTrashChoice],
            intrigues: [devour],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const devourHand = state.startCombatPhase(devourHandFixture);
  const devourHandPlayed = state.playCombatIntrigue(devourHand, "p2", devour.id);
  assert.ok(devourHandPlayed.pendingAction, "Devour should queue trash when the only eligible card is in hand");
  const devourHandTrashed = state.trashPlayerCard(
    devourHandPlayed,
    devourHandPlayed.pendingAction,
    "hand",
    devourHandTrashChoice.id,
  );
  assert.deepEqual(playerById(devourHandTrashed, "p2").hand, [], "Devour should trash from hand when selected");

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
