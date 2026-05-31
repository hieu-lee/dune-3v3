import assert from "node:assert/strict";
import {
  combatFixture,
  completedContract,
  incompleteContract,
  playerById,
} from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntrigueStrengthAndSpies({
  cards: { backedByChoam, findWeakness, verifierCombat, weirdingCombat },
  data,
  spaces: { arrakeenSpace, secretsSpace },
  state,
}) {
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

}
