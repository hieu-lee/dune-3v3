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
  const questionableMethods = intrigueBySourceId(data, 156);
  const springTheTrap = intrigueBySourceId(data, 153);
  const weirdingCombat = intrigueBySourceId(data, 154);
  const contingencyPlan = intrigueBySourceId(data, 147);
  const devour = intrigueBySourceId(data, 151);
  const backedByChoam = intrigueBySourceId(data, 448);
  const mercenaries = intrigueBySourceId(data, 128);
  const espionageSpace = boardSpaceByName(data, "Espionage");
  const secretsSpace = boardSpaceByName(data, "Secrets");
  const arrakeenSpace = boardSpaceByName(data, "Arrakeen");
  assert.equal(impress.combatSwords, 2, "Impress should expose its structured Combat strength");
  assert.equal(findWeakness.combatSwords, 5, "Find Weakness should expose its maximum structured Combat strength");
  assert.equal(
    findWeakness.summary,
    "Add 2 strength; you may recall 1 spy to add 3 more strength.",
    "Find Weakness should expose its base strength and optional spy recall",
  );
  assert.equal(springTheTrap.combatSwords, 7, "Spring The Trap should expose its structured Combat strength");
  assert.equal(
    springTheTrap.summary,
    "Recall 2 spies to add 7 strength.",
    "Spring The Trap should expose its two-spy cost and Combat strength",
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
  assert.equal(questionableMethods.automatedCombatSwords, undefined, "Questionable Methods should resolve through Influence-loss state");
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
