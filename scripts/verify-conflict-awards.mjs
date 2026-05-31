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

function objectiveById(data, objectiveId) {
  const objective = data.sixPlayerObjectiveCards.find((candidate) => candidate.id === objectiveId);
  assert.ok(objective, `Expected Objective ${objectiveId}`);
  return { ...objective };
}

function fixture(state, data, setupPlayers, conflictSourceId = 454) {
  const game = state.initialGame();
  return {
    ...game,
    conflict: conflictBySourceId(data, conflictSourceId),
    conflictDeck: [conflictBySourceId(data, 456)],
    conflictDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: setupPlayers(game.players.map((player) => ({
      ...player,
      conflict: 0,
      deployedTroops: 0,
      objectives: [],
      wonConflicts: [],
      revealed: true,
      agentsReady: 0,
    }))),
  };
}

function roundStartFixture(state, data, setupPlayers, conflictSourceId = 460) {
  const game = state.initialGame();
  return {
    ...game,
    conflict: null,
    conflictDeck: [conflictBySourceId(data, conflictSourceId)],
    conflictDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: setupPlayers(game.players.map((player) => ({
      ...player,
      conflict: 0,
      deployedTroops: 0,
      deployedSandworms: 0,
      revealed: true,
      agentsReady: 0,
    }))),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const crysknifeObjective = objectiveById(data, "objective-crysknife-1");
  const desertMouseObjective = objectiveById(data, "objective-desert-mouse-first");

  const deployFixture = fixture(state, data, (players) =>
    players.map((player) => (player.id === "p2" ? { ...player, garrison: 2 } : player)),
  );
  const deployed = state.deployTroopToConflict(deployFixture, {
    kind: "deploy",
    ownerId: "p2",
    remaining: 2,
    source: "Verifier deployment",
  });
  const deployedPlayer = playerById(deployed, "p2");
  assert.equal(deployedPlayer.garrison, 1, "Deploying should spend one garrison troop");
  assert.equal(deployedPlayer.conflict, 2, "Deploying should add troop strength");
  assert.equal(deployedPlayer.deployedTroops, 1, "Deploying should mark a troop in the Conflict");
  assert.deepEqual(deployed.pendingAction, {
    kind: "deploy",
    ownerId: "p2",
    remaining: 1,
    source: "Verifier deployment",
  });

  const reinforceFixture = fixture(state, data, (players) => players);
  const reinforcedConflict = state.reinforceTroop(reinforceFixture, {
    kind: "reinforce",
    team: "shaddam",
    remaining: 2,
    source: "Verifier support",
  }, "p2", "conflict");
  const reinforcedConflictPlayer = playerById(reinforcedConflict, "p2");
  assert.equal(reinforcedConflictPlayer.garrison, playerById(reinforceFixture, "p2").garrison);
  assert.equal(reinforcedConflictPlayer.conflict, 2);
  assert.equal(reinforcedConflictPlayer.deployedTroops, 1);
  assert.deepEqual(reinforcedConflict.pendingAction, {
    kind: "reinforce",
    team: "shaddam",
    remaining: 1,
    source: "Verifier support",
  });

  const reinforcedGarrison = state.reinforceTroop(reinforceFixture, {
    kind: "reinforce",
    team: "shaddam",
    remaining: 1,
    source: "Verifier support",
  }, "p2", "garrison");
  const reinforcedGarrisonPlayer = playerById(reinforcedGarrison, "p2");
  assert.equal(reinforcedGarrisonPlayer.garrison, playerById(reinforceFixture, "p2").garrison + 1);
  assert.equal(reinforcedGarrisonPlayer.conflict, 0);
  assert.equal(reinforcedGarrisonPlayer.deployedTroops, 0, "Garrison reinforcement should not mark a Conflict unit");

  const controlledImperialBasin = {
    ...roundStartFixture(state, data, (players) => players, 460),
    firstSeat: 1,
    activeSeat: 1,
    locationControl: { "imperial-basin": "p2" },
  };
  const controlledImperialBasinRound = state.startNextRound(controlledImperialBasin);
  assert.equal(controlledImperialBasinRound.round, controlledImperialBasin.round + 1);
  assert.equal(controlledImperialBasinRound.conflict.sourceId, 460, "Secure Imperial Basin should reveal as the new Conflict");
  assert.deepEqual(controlledImperialBasinRound.pendingAction, {
    kind: "control-defense",
    ownerId: "p2",
    location: "imperial-basin",
    source: "Secure Imperial Basin",
  });
  assert.equal(controlledImperialBasinRound.pendingQueue.length, 0);
  assert.equal(controlledImperialBasinRound.activeSeat, controlledImperialBasinRound.firstSeat);
  const controlDefenseDeployed = state.deployControlDefenseTroop(
    controlledImperialBasinRound,
    controlledImperialBasinRound.pendingAction,
  );
  assert.equal(playerById(controlDefenseDeployed, "p2").garrison, playerById(controlledImperialBasinRound, "p2").garrison);
  assert.equal(playerById(controlDefenseDeployed, "p2").deployedTroops, 1);
  assert.equal(playerById(controlDefenseDeployed, "p2").conflict, 2);
  assert.deepEqual(controlDefenseDeployed.turnUnitDeployments, {}, "Control defense should not count as a turn deployment");
  assert.equal(controlDefenseDeployed.pendingAction, undefined);
  assert.equal(controlDefenseDeployed.round, controlledImperialBasinRound.round, "Control defense should not advance the round");
  assert.equal(controlDefenseDeployed.activeSeat, controlledImperialBasinRound.firstSeat);
  assert.notEqual(
    controlledImperialBasinRound.players[controlledImperialBasinRound.activeSeat].id,
    controlledImperialBasinRound.pendingAction.ownerId,
    "Control defense owner can differ from the first action seat",
  );

  const skippedControlDefense = state.skipControlDefenseTroop(
    controlledImperialBasinRound,
    controlledImperialBasinRound.pendingAction,
  );
  assert.equal(playerById(skippedControlDefense, "p2").deployedTroops, 0);
  assert.equal(playerById(skippedControlDefense, "p2").conflict, 0);
  assert.equal(skippedControlDefense.pendingAction, undefined);

  const controlledArrakeen = {
    ...roundStartFixture(state, data, (players) => players, 456),
    locationControl: { arrakeen: "p2" },
  };
  assert.equal(state.startNextRound(controlledArrakeen).pendingAction?.kind, "control-defense");

  const noSupplyControl = {
    ...roundStartFixture(state, data, (players) =>
      players.map((player) => (player.id === "p2" ? { ...player, garrison: 12 } : player)),
    ),
    locationControl: { "imperial-basin": "p2" },
  };
  assert.equal(state.startNextRound(noSupplyControl).pendingAction, undefined, "No supply troops should skip control defense");

  const uncontrolledLocationConflict = {
    ...roundStartFixture(state, data, (players) => players, 457),
    locationControl: { "imperial-basin": "p2" },
  };
  assert.equal(
    state.startNextRound(uncontrolledLocationConflict).pendingAction,
    undefined,
    "Control defense should require control of the revealed location",
  );

  const nonLocationConflict = {
    ...roundStartFixture(state, data, (players) => players, 454),
    locationControl: { "imperial-basin": "p2" },
  };
  assert.equal(state.startNextRound(nonLocationConflict).pendingAction, undefined, "Non-location Conflicts should not queue control defense");

  const endgameBeforeConflictReveal = {
    ...roundStartFixture(state, data, (players) =>
      players.map((player) => (player.id === "p2" ? { ...player, vp: 10 } : player)),
    ),
    locationControl: { "imperial-basin": "p2" },
  };
  const endgameBeforeConflictRevealResult = state.startNextRound(endgameBeforeConflictReveal);
  assert.equal(endgameBeforeConflictRevealResult.phase, "endgame");
  assert.equal(endgameBeforeConflictRevealResult.pendingAction, undefined, "Endgame should prevent a new control-defense reveal");

  const objectiveMatch = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 1, objectives: [crysknifeObjective] }
        : player,
    ),
  );
  const objectiveMatched = state.startNextRound(objectiveMatch);
  const objectiveWinner = playerById(objectiveMatched, "p2");
  assert.equal(objectiveWinner.wonConflicts.length, 1, "Winner should keep the Conflict card");
  assert.equal(objectiveWinner.wonConflicts[0].sourceId, 454);
  assert.equal(objectiveWinner.wonConflicts[0].scored, true, "Matched won Conflict should flip face down");
  assert.equal(objectiveWinner.objectives[0].scored, true, "Matched Objective should flip face down");
  assert.equal(objectiveWinner.vp, playerById(objectiveMatch, "p2").vp + 1, "Battle icon match should score 1 VP");
  assert.equal(objectiveWinner.deployedTroops, 0, "Round advancement should recall deployed troops");
  assert.equal(objectiveWinner.conflict, 0, "Round advancement should clear strength");
  assert.equal(objectiveMatched.conflictDiscard.some((conflict) => conflict.sourceId === 454), false);

  const sandwormObjectiveMatch = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? { ...player, conflict: 7, deployedSandworms: 1, objectives: [crysknifeObjective] }
        : player,
    ),
  );
  const sandwormLeader = playerById(sandwormObjectiveMatch, "p3").leader;
  assert.equal(
    state.playerDoublesConflictRewards(playerById(sandwormObjectiveMatch, "p3")),
    true,
    "A player with a deployed sandworm should double printed Conflict-card rewards",
  );
  const sandwormObjectiveResult = state.startNextRound(sandwormObjectiveMatch);
  const sandwormObjectiveWinner = playerById(sandwormObjectiveResult, "p3");
  assert.equal(
    sandwormObjectiveWinner.vp,
    playerById(sandwormObjectiveMatch, "p3").vp + 1,
    "Battle icon VP should not double from sandworms",
  );
  assert.ok(
    sandwormObjectiveResult.log.some((entry) =>
      entry.includes(sandwormLeader) &&
      entry.includes("double printed Conflict-card rewards") &&
      entry.includes("battle icons") &&
      entry.includes("location control")
    ),
    "Conflict resolution should remind the table to double only printed card rewards for sandworm players",
  );

  const unmatched = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 1, objectives: [desertMouseObjective] }
        : player,
    ),
  );
  const unmatchedResult = state.startNextRound(unmatched);
  const unmatchedWinner = playerById(unmatchedResult, "p2");
  assert.equal(unmatchedWinner.vp, playerById(unmatched, "p2").vp, "Unmatched Conflict should not score VP");
  assert.equal(unmatchedWinner.objectives[0].scored, undefined);
  assert.equal(unmatchedWinner.wonConflicts[0].scored, false);

  const siegeArrakeenReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 9, deployedTroops: 1, garrison: 0, resources: { ...player.resources, solari: 0 } }
          : player,
      ), 456),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const siegeArrakeenResult = state.startNextRound(siegeArrakeenReward);
  const siegeArrakeenWinner = playerById(siegeArrakeenResult, "p2");
  assert.equal(siegeArrakeenWinner.resources.solari, 2, "Siege Of Arrakeen should pay first-place Solari");
  assert.equal(siegeArrakeenWinner.garrison, 2, "Siege Of Arrakeen should recruit two first-place troops");
  assert.equal(siegeArrakeenResult.locationControl.arrakeen, "p2", "Siege Of Arrakeen should set Arrakeen control");
  assert.equal(siegeArrakeenResult.pendingAction, undefined, "Siege Of Arrakeen reward should not require choices");
  assert.ok(
    siegeArrakeenResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("recruits 2 troops") &&
      entry.includes("Siege Of Arrakeen")
    ),
    "Siege Of Arrakeen should log the paid printed reward",
  );

  const doubledSiegeArrakeenReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? { ...player, conflict: 9, deployedSandworms: 1, garrison: 0, resources: { ...player.resources, solari: 0 } }
          : player,
      ), 456),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const doubledSiegeArrakeenResult = state.startNextRound(doubledSiegeArrakeenReward);
  const doubledSiegeArrakeenWinner = playerById(doubledSiegeArrakeenResult, "p3");
  assert.equal(doubledSiegeArrakeenWinner.resources.solari, 4, "Sandworms should double Siege Of Arrakeen Solari");
  assert.equal(doubledSiegeArrakeenWinner.garrison, 4, "Sandworms should double Siege Of Arrakeen troop recruitment");
  assert.ok(
    doubledSiegeArrakeenResult.log.some((entry) =>
      entry.includes("gains 4 solari") &&
      entry.includes("recruits 4 troops") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Siege Of Arrakeen should log the doubled printed reward",
  );

  const supplyCappedSiegeArrakeenReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 9, deployedTroops: 1, garrison: 10, resources: { ...player.resources, solari: 0 } }
          : player,
      ), 456),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const supplyCappedSiegeArrakeenResult = state.startNextRound(supplyCappedSiegeArrakeenReward);
  const supplyCappedSiegeArrakeenWinner = playerById(supplyCappedSiegeArrakeenResult, "p2");
  assert.equal(supplyCappedSiegeArrakeenWinner.resources.solari, 2, "Supply cap should not block Siege Of Arrakeen Solari");
  assert.equal(
    supplyCappedSiegeArrakeenWinner.garrison,
    11,
    "Siege Of Arrakeen troop reward should recruit only available troop supply",
  );

  const seizeSpiceRefineryReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, spice: 0 } }
          : player,
      ), 457),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const seizeSpiceRefineryResult = state.startNextRound(seizeSpiceRefineryReward);
  const seizeSpiceRefineryWinner = playerById(seizeSpiceRefineryResult, "p2");
  assert.equal(seizeSpiceRefineryWinner.resources.spice, 2, "Seize Spice Refinery should pay first-place spice");
  assert.equal(
    seizeSpiceRefineryResult.locationControl["spice-refinery"],
    "p2",
    "Seize Spice Refinery should set Spice Refinery control",
  );
  assert.deepEqual(
    seizeSpiceRefineryResult.pendingAction,
    { kind: "spy", ownerId: "p2", remaining: 1, source: "Seize Spice Refinery", recallForSupply: true },
    "Seize Spice Refinery should queue its first-place spy reward",
  );
  assert.ok(
    seizeSpiceRefineryResult.log.some((entry) =>
      entry.includes("gains 2 spice") &&
      entry.includes("Seize Spice Refinery")
    ),
    "Seize Spice Refinery should log the paid printed reward",
  );
  assert.ok(
    seizeSpiceRefineryResult.log.some((entry) =>
      entry.includes("may place 1 spy") &&
      entry.includes("Seize Spice Refinery")
    ),
    "Seize Spice Refinery should log the pending spy reward",
  );
  const seizeSpySpace = state.placeableSpySpaces(
    seizeSpiceRefineryResult,
    seizeSpiceRefineryResult.pendingAction,
  )[0];
  assert.ok(seizeSpySpace, "Seize Spice Refinery should expose a legal spy placement");
  const seizeSpyPlaced = state.placeSpyForPending(
    seizeSpiceRefineryResult,
    seizeSpiceRefineryResult.pendingAction,
    seizeSpySpace.id,
  );
  assert.equal(seizeSpyPlaced.spyPosts[seizeSpySpace.id], "p2", "Seize Spice Refinery should place the rewarded spy");
  assert.equal(playerById(seizeSpyPlaced, "p2").spies, playerById(seizeSpiceRefineryResult, "p2").spies - 1);
  assert.equal(seizeSpyPlaced.pendingAction, undefined, "Placed Seize Spice Refinery spy should clear the reward pending action");
  assert.equal(seizeSpyPlaced.round, seizeSpiceRefineryResult.round + 1, "Placed Seize Spice Refinery spy should advance to the next round");
  assert.equal(seizeSpyPlaced.conflict?.sourceId, 454, "Placed Seize Spice Refinery spy should reveal the next Conflict");

  const seizeSpySkipped = state.finishPendingAction(seizeSpiceRefineryResult);
  assert.equal(seizeSpySkipped.pendingAction, undefined, "Skipped Seize Spice Refinery spy should clear the reward pending action");
  assert.equal(seizeSpySkipped.round, seizeSpiceRefineryResult.round + 1, "Skipped Seize Spice Refinery spy should advance to the next round");
  assert.equal(seizeSpySkipped.conflict?.sourceId, 454, "Skipped Seize Spice Refinery spy should reveal the next Conflict");

  const doubledSeizeSpiceRefineryReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? { ...player, conflict: 9, deployedSandworms: 1, resources: { ...player.resources, spice: 0 } }
          : player,
      ), 457),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const doubledSeizeSpiceRefineryResult = state.startNextRound(doubledSeizeSpiceRefineryReward);
  const doubledSeizeSpiceRefineryWinner = playerById(doubledSeizeSpiceRefineryResult, "p3");
  assert.equal(doubledSeizeSpiceRefineryWinner.resources.spice, 4, "Sandworms should double Seize Spice Refinery spice");
  assert.equal(
    doubledSeizeSpiceRefineryResult.locationControl["spice-refinery"],
    "p3",
    "Doubled Seize Spice Refinery should still set one control marker",
  );
  assert.deepEqual(
    doubledSeizeSpiceRefineryResult.pendingAction,
    { kind: "spy", ownerId: "p3", remaining: 2, source: "Seize Spice Refinery", recallForSupply: true },
    "Sandworms should double Seize Spice Refinery spy placement",
  );
  assert.ok(
    doubledSeizeSpiceRefineryResult.log.some((entry) =>
      entry.includes("gains 4 spice") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Seize Spice Refinery should log the doubled printed reward",
  );
  assert.ok(
    doubledSeizeSpiceRefineryResult.log.some((entry) =>
      entry.includes("may place 2 spies") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Seize Spice Refinery should log the doubled spy reward",
  );
  const doubledSeizeReadyFirstSpySpace = state.placeableSpySpaces(
    doubledSeizeSpiceRefineryResult,
    doubledSeizeSpiceRefineryResult.pendingAction,
  )[0];
  assert.ok(doubledSeizeReadyFirstSpySpace, "Doubled Seize Spice Refinery should expose a first spy placement");
  const doubledSeizeReadyFirstSpyPlaced = state.placeSpyForPending(
    doubledSeizeSpiceRefineryResult,
    doubledSeizeSpiceRefineryResult.pendingAction,
    doubledSeizeReadyFirstSpySpace.id,
  );
  assert.equal(
    doubledSeizeReadyFirstSpyPlaced.pendingAction?.remaining,
    1,
    "Doubled Seize Spice Refinery should keep the second spy placement pending",
  );
  assert.equal(
    doubledSeizeReadyFirstSpyPlaced.round,
    doubledSeizeSpiceRefineryResult.round,
    "Doubled Seize Spice Refinery should not advance before the second spy is resolved",
  );
  const doubledSeizeReadySecondSpySpace = state.placeableSpySpaces(
    doubledSeizeReadyFirstSpyPlaced,
    doubledSeizeReadyFirstSpyPlaced.pendingAction,
  )[0];
  assert.ok(doubledSeizeReadySecondSpySpace, "Doubled Seize Spice Refinery should expose a second spy placement");
  const doubledSeizeReadySecondSpyPlaced = state.placeSpyForPending(
    doubledSeizeReadyFirstSpyPlaced,
    doubledSeizeReadyFirstSpyPlaced.pendingAction,
    doubledSeizeReadySecondSpySpace.id,
  );
  assert.equal(
    doubledSeizeReadySecondSpyPlaced.pendingAction,
    undefined,
    "Doubled Seize Spice Refinery should clear after both ready spies are placed",
  );
  assert.equal(
    doubledSeizeReadySecondSpyPlaced.round,
    doubledSeizeSpiceRefineryResult.round + 1,
    "Doubled Seize Spice Refinery should advance after both ready spies are placed",
  );
  assert.equal(
    doubledSeizeReadySecondSpyPlaced.conflict?.sourceId,
    454,
    "Doubled Seize Spice Refinery should reveal the next Conflict after both ready spies are placed",
  );

  const doubledSeizeWithSupplyRecall = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? { ...player, conflict: 9, deployedSandworms: 1, spies: 0, resources: { ...player.resources, spice: 0 } }
          : player,
      ), 457),
    conflictDeck: [conflictBySourceId(data, 454)],
    spyPosts: { arrakeen: "p3", espionage: "p3", secrets: "p3" },
  };
  const doubledSeizeSupplyRecallPending = state.startNextRound(doubledSeizeWithSupplyRecall);
  assert.equal(
    doubledSeizeSupplyRecallPending.pendingAction?.remaining,
    2,
    "Doubled Seize Spice Refinery should queue two spy placements even with no ready spies",
  );
  const doubledSeizeFirstRecallChoice = state.recallableSpySupplySpaces(
    doubledSeizeSupplyRecallPending,
    doubledSeizeSupplyRecallPending.pendingAction,
  ).find((space) => space.id === "secrets");
  assert.ok(doubledSeizeFirstRecallChoice, "Doubled Seize Spice Refinery should allow recalling a spy for supply");
  const doubledSeizeFirstSupplyRecalled = state.recallSpyForSupplyForPending(
    doubledSeizeSupplyRecallPending,
    doubledSeizeSupplyRecallPending.pendingAction,
    doubledSeizeFirstRecallChoice.id,
  );
  assert.equal(
    doubledSeizeFirstSupplyRecalled.pendingAction?.mustPlaceSpy,
    true,
    "Doubled Seize Spice Refinery should require placing the recalled spy",
  );
  assert.equal(
    doubledSeizeFirstSupplyRecalled.pendingAction?.recallForSupply,
    true,
    "Doubled Seize Spice Refinery should preserve recall-for-supply across repeated placements",
  );
  const doubledSeizeRecallFirstSpySpace = state.placeableSpySpaces(
    doubledSeizeFirstSupplyRecalled,
    doubledSeizeFirstSupplyRecalled.pendingAction,
  )[0];
  assert.ok(doubledSeizeRecallFirstSpySpace, "Doubled Seize Spice Refinery should have a first recalled-spy placement");
  const doubledSeizeRecallFirstSpyPlaced = state.placeSpyForPending(
    doubledSeizeFirstSupplyRecalled,
    doubledSeizeFirstSupplyRecalled.pendingAction,
    doubledSeizeRecallFirstSpySpace.id,
  );
  assert.equal(
    doubledSeizeRecallFirstSpyPlaced.pendingAction?.remaining,
    1,
    "Doubled Seize Spice Refinery should keep the second spy reward after placing the first recalled spy",
  );
  assert.equal(
    doubledSeizeRecallFirstSpyPlaced.pendingAction?.mustPlaceSpy,
    false,
    "Doubled Seize Spice Refinery should make the second recall optional after the first spy is placed",
  );
  assert.equal(
    doubledSeizeRecallFirstSpyPlaced.pendingAction?.recallForSupply,
    true,
    "Doubled Seize Spice Refinery should allow another recall after placing the first recalled spy",
  );
  const doubledSeizeSecondRecallChoice = state.recallableSpySupplySpaces(
    doubledSeizeRecallFirstSpyPlaced,
    doubledSeizeRecallFirstSpyPlaced.pendingAction,
  )[0];
  assert.ok(
    doubledSeizeSecondRecallChoice,
    "Doubled Seize Spice Refinery should allow recalling another existing spy for the second placement",
  );
  const doubledSeizeSecondSupplyRecalled = state.recallSpyForSupplyForPending(
    doubledSeizeRecallFirstSpyPlaced,
    doubledSeizeRecallFirstSpyPlaced.pendingAction,
    doubledSeizeSecondRecallChoice.id,
  );
  const doubledSeizeRecallSecondSpySpace = state.placeableSpySpaces(
    doubledSeizeSecondSupplyRecalled,
    doubledSeizeSecondSupplyRecalled.pendingAction,
  )[0];
  assert.ok(doubledSeizeRecallSecondSpySpace, "Doubled Seize Spice Refinery should have a second recalled-spy placement");
  const doubledSeizeRecallSecondSpyPlaced = state.placeSpyForPending(
    doubledSeizeSecondSupplyRecalled,
    doubledSeizeSecondSupplyRecalled.pendingAction,
    doubledSeizeRecallSecondSpySpace.id,
  );
  assert.equal(
    doubledSeizeRecallSecondSpyPlaced.pendingAction,
    undefined,
    "Doubled Seize Spice Refinery should clear after the recalled supply spy is placed",
  );
  assert.equal(
    doubledSeizeRecallSecondSpyPlaced.round,
    doubledSeizeWithSupplyRecall.round + 1,
    "Doubled Seize Spice Refinery should advance after the second recalled supply spy is placed",
  );
  assert.equal(
    doubledSeizeRecallSecondSpyPlaced.conflict?.sourceId,
    454,
    "Doubled Seize Spice Refinery should reveal the next Conflict after the second recalled supply spy is placed",
  );

  const protectSietchesReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 9,
            deployedTroops: 1,
            garrison: 0,
            influence: { ...player.influence, fremen: 1 },
            resources: { ...player.resources, water: 0 },
            vp: 0,
          }
        : player,
    ), 461);
  const protectSietchesResult = state.startNextRound(protectSietchesReward);
  const protectSietchesWinner = playerById(protectSietchesResult, "p2");
  assert.equal(protectSietchesWinner.resources.water, 1, "Protect The Sietches should pay first-place water");
  assert.equal(protectSietchesWinner.garrison, 1, "Protect The Sietches should recruit a first-place troop");
  assert.equal(protectSietchesWinner.influence.fremen, 2, "Protect The Sietches should award Fremen Influence");
  assert.equal(protectSietchesWinner.vp, 1, "Protect The Sietches Influence should score the 2-Influence VP");
  assert.equal(protectSietchesResult.pendingAction, undefined, "Protect The Sietches reward should not require choices");
  assert.ok(
    protectSietchesResult.log.some((entry) =>
      entry.includes("gains 1 water") &&
      entry.includes("1 Fremen Influence") &&
      entry.includes("recruits 1 troop") &&
      entry.includes("Protect The Sietches")
    ),
    "Protect The Sietches should log the paid printed reward",
  );

  const doubledProtectSietchesReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? {
            ...player,
            conflict: 9,
            deployedSandworms: 1,
            garrison: 0,
            influence: { ...player.influence, fremen: 0 },
            resources: { ...player.resources, water: 0 },
            vp: 0,
          }
        : player,
    ), 461);
  const doubledProtectSietchesResult = state.startNextRound(doubledProtectSietchesReward);
  const doubledProtectSietchesWinner = playerById(doubledProtectSietchesResult, "p3");
  assert.equal(doubledProtectSietchesWinner.resources.water, 2, "Sandworms should double Protect The Sietches water");
  assert.equal(doubledProtectSietchesWinner.garrison, 2, "Sandworms should double Protect The Sietches troop recruitment");
  assert.equal(doubledProtectSietchesWinner.influence.fremen, 2, "Sandworms should double Protect The Sietches Influence");
  assert.equal(doubledProtectSietchesWinner.vp, 1, "Doubled Influence should still score the threshold VP once");
  assert.ok(
    doubledProtectSietchesResult.log.some((entry) =>
      entry.includes("gains 2 water") &&
      entry.includes("2 Fremen Influence") &&
      entry.includes("recruits 2 troops") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Protect The Sietches should log the doubled printed reward",
  );

  const secureImperialBasinReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 1, garrison: 0, resources: { ...player.resources, spice: 0 } }
        : player,
    ), 460);
  const secureImperialBasinResult = state.startNextRound(secureImperialBasinReward);
  const secureImperialBasinWinner = playerById(secureImperialBasinResult, "p2");
  assert.equal(secureImperialBasinWinner.resources.spice, 2, "Secure Imperial Basin should pay first-place spice");
  assert.equal(secureImperialBasinWinner.garrison, 1, "Secure Imperial Basin should recruit a first-place troop");
  assert.equal(secureImperialBasinResult.locationControl["imperial-basin"], "p2", "Secure Imperial Basin should set control");
  assert.equal(secureImperialBasinResult.pendingAction, undefined, "Secure Imperial Basin reward should not require choices");
  assert.ok(
    secureImperialBasinResult.log.some((entry) =>
      entry.includes("gains 2 spice") &&
      entry.includes("recruits 1 troop") &&
      entry.includes("Secure Imperial Basin")
    ),
    "Secure Imperial Basin should log the paid printed reward",
  );

  const doubledSecureImperialBasinReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? { ...player, conflict: 9, deployedSandworms: 1, garrison: 0, resources: { ...player.resources, spice: 0 } }
        : player,
    ), 460);
  const doubledSecureImperialBasinResult = state.startNextRound(doubledSecureImperialBasinReward);
  const doubledSecureImperialBasinWinner = playerById(doubledSecureImperialBasinResult, "p3");
  assert.equal(doubledSecureImperialBasinWinner.resources.spice, 4, "Sandworms should double Secure Imperial Basin spice");
  assert.equal(doubledSecureImperialBasinWinner.garrison, 2, "Sandworms should double Secure Imperial Basin troop recruitment");
  assert.ok(
    doubledSecureImperialBasinResult.log.some((entry) =>
      entry.includes("gains 4 spice") &&
      entry.includes("recruits 2 troops") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Secure Imperial Basin should log the doubled printed reward",
  );

  const supplyCappedSecureImperialBasinReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 1, garrison: 11, resources: { ...player.resources, spice: 0 } }
        : player,
    ), 460);
  const supplyCappedSecureImperialBasinResult = state.startNextRound(supplyCappedSecureImperialBasinReward);
  const supplyCappedSecureImperialBasinWinner = playerById(supplyCappedSecureImperialBasinResult, "p2");
  assert.equal(supplyCappedSecureImperialBasinWinner.resources.spice, 2, "Supply cap should not block Secure Imperial Basin spice");
  assert.equal(
    supplyCappedSecureImperialBasinWinner.garrison,
    11,
    "Secure Imperial Basin troop reward should respect available troop supply",
  );

  const imperialBasinBattle = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, spice: 4 }, vp: 0 }
        : player,
    ), 464);
  const imperialBasinPending = state.startNextRound(imperialBasinBattle);
  assert.equal(playerById(imperialBasinPending, "p2").vp, 1, "Battle For Imperial Basin should award its printed first-place VP");
  assert.equal(imperialBasinPending.locationControl["imperial-basin"], "p2", "Battle For Imperial Basin should set control");
  assert.deepEqual(imperialBasinPending.pendingAction, {
    kind: "conflict-vp-conversion",
    ownerId: "p2",
    source: "Battle For Imperial Basin",
    remaining: 1,
    vp: 1,
    cost: { kind: "resource", resource: "spice", amount: 4 },
  });
  const imperialBasinPaid = state.startNextRound(
    state.payConflictVpConversion(imperialBasinPending, imperialBasinPending.pendingAction),
  );
  assert.equal(playerById(imperialBasinPaid, "p2").vp, 2, "Imperial Basin conversion should spend spice for 1 VP");
  assert.equal(playerById(imperialBasinPaid, "p2").resources.spice, 0);
  assert.equal(imperialBasinPaid.pendingAction, undefined);
  const imperialBasinEndgamePending = state.startNextRound({
    ...imperialBasinBattle,
    players: imperialBasinBattle.players.map((player) =>
      player.id === "p2" ? { ...player, vp: 9 } : player,
    ),
  });
  assert.equal(
    imperialBasinEndgamePending.phase,
    "playing",
    "Payable printed Conflict conversion should pause before endgame checks",
  );
  assert.equal(imperialBasinEndgamePending.pendingAction?.kind, "conflict-vp-conversion");
  assert.equal(playerById(imperialBasinEndgamePending, "p2").vp, 10);
  const imperialBasinEndgame = state.startNextRound(
    state.payConflictVpConversion(imperialBasinEndgamePending, imperialBasinEndgamePending.pendingAction),
  );
  assert.equal(imperialBasinEndgame.phase, "endgame", "Endgame should trigger after the pending conversion resolves");
  assert.equal(playerById(imperialBasinEndgame, "p2").vp, 11);
  const imperialBasinSpace = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasinSpace, "Imperial Basin space should exist");
  const imperialControlIncome = state.resolveLocationControlIncome(imperialBasinPaid, imperialBasinSpace);
  assert.equal(
    playerById(imperialControlIncome, "p2").resources.spice,
    playerById(imperialBasinPaid, "p2").resources.spice + 1,
    "Imperial Basin controller should gain spice when the space is visited",
  );

  const sandwormImperialBasin = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? { ...player, conflict: 9, deployedSandworms: 1, resources: { ...player.resources, spice: 8 }, vp: 0 }
        : player,
    ), 464);
  const sandwormImperialPending = state.startNextRound(sandwormImperialBasin);
  assert.equal(playerById(sandwormImperialPending, "p3").vp, 2, "Sandworms should double the printed VP reward");
  assert.equal(sandwormImperialPending.pendingAction.remaining, 2, "Sandworms should allow paying the printed conversion twice");
  const sandwormImperialPaidOnce = state.startNextRound(
    state.payConflictVpConversion(sandwormImperialPending, sandwormImperialPending.pendingAction),
  );
  assert.equal(sandwormImperialPaidOnce.pendingAction.remaining, 1);
  const sandwormImperialPaidTwice = state.startNextRound(
    state.payConflictVpConversion(sandwormImperialPaidOnce, sandwormImperialPaidOnce.pendingAction),
  );
  assert.equal(playerById(sandwormImperialPaidTwice, "p3").vp, 4);
  assert.equal(playerById(sandwormImperialPaidTwice, "p3").resources.spice, 0);

  const spiceRefineryBattle = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 6 }, vp: 0 }
        : player,
    ), 466);
  const spiceRefineryPending = state.startNextRound(spiceRefineryBattle);
  assert.equal(spiceRefineryPending.locationControl["spice-refinery"], "p2");
  assert.deepEqual(spiceRefineryPending.pendingAction?.cost, { kind: "resource", resource: "solari", amount: 6 });
  const spiceRefineryPaid = state.startNextRound(
    state.payConflictVpConversion(spiceRefineryPending, spiceRefineryPending.pendingAction),
  );
  assert.equal(playerById(spiceRefineryPaid, "p2").vp, 2, "Battle For Spice Refinery conversion should spend Solari for 1 VP");
  assert.equal(playerById(spiceRefineryPaid, "p2").resources.solari, 0);

  const conversionBeforeDefense = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 6 }, vp: 0 }
          : player,
      ), 466),
    conflictDeck: [conflictBySourceId(data, 460)],
    locationControl: { "imperial-basin": "p3" },
  };
  const conversionBeforeDefensePending = state.startNextRound(conversionBeforeDefense);
  assert.equal(conversionBeforeDefensePending.pendingAction?.kind, "conflict-vp-conversion");
  assert.equal(conversionBeforeDefensePending.conflict, null, "Conflict conversion should pause before the next Conflict reveal");
  const defenseAfterConversion = state.startNextRound(
    state.payConflictVpConversion(conversionBeforeDefensePending, conversionBeforeDefensePending.pendingAction),
  );
  assert.deepEqual(defenseAfterConversion.pendingAction, {
    kind: "control-defense",
    ownerId: "p3",
    location: "imperial-basin",
    source: "Secure Imperial Basin",
  });

  const arrakeenBattle = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 9, deployedTroops: 1, spies: 1, vp: 0 }
          : player,
      ), 465),
    spyPosts: { arrakeen: "p2", carthag: "p2" },
    sharedSpyPosts: {},
  };
  const arrakeenPending = state.startNextRound(arrakeenBattle);
  assert.equal(arrakeenPending.locationControl.arrakeen, "p2");
  assert.equal(playerById(arrakeenPending, "p2").vp, 1, "Battle For Arrakeen should award its printed first-place VP");
  assert.deepEqual(arrakeenPending.pendingAction?.cost, { kind: "recall-spies", count: 2, recalled: 0 });
  const arrakeenRecalledOnce = state.startNextRound(
    state.recallSpyForConflictVpConversion(arrakeenPending, arrakeenPending.pendingAction, "arrakeen"),
  );
  assert.equal(arrakeenRecalledOnce.pendingAction.cost.recalled, 1);
  assert.equal(playerById(arrakeenRecalledOnce, "p2").vp, 1, "Arrakeen conversion should score only after two recalls");
  const arrakeenRecalledTwice = state.startNextRound(
    state.recallSpyForConflictVpConversion(arrakeenRecalledOnce, arrakeenRecalledOnce.pendingAction, "carthag"),
  );
  assert.equal(playerById(arrakeenRecalledTwice, "p2").vp, 2);
  assert.equal(playerById(arrakeenRecalledTwice, "p2").spies, 3);
  assert.deepEqual(arrakeenRecalledTwice.pendingAction, {
    kind: "control-defense",
    ownerId: "p2",
    location: "arrakeen",
    source: "Siege Of Arrakeen",
  });
  assert.equal(
    state.skipControlDefenseTroop(arrakeenRecalledTwice, arrakeenRecalledTwice.pendingAction).pendingAction,
    undefined,
  );

  const doubledArrakeenWithPartialSecondConversion = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? { ...player, conflict: 9, deployedSandworms: 1, spies: 0, vp: 0 }
          : player,
      ), 465),
    spyPosts: { arrakeen: "p3", carthag: "p3", "imperial-basin": "p3" },
    sharedSpyPosts: {},
  };
  const doubledArrakeenPending = state.startNextRound(doubledArrakeenWithPartialSecondConversion);
  assert.equal(doubledArrakeenPending.pendingAction?.remaining, 2);
  const doubledArrakeenFirstRecall = state.startNextRound(
    state.recallSpyForConflictVpConversion(doubledArrakeenPending, doubledArrakeenPending.pendingAction, "arrakeen"),
  );
  const doubledArrakeenFirstConversion = state.startNextRound(
    state.recallSpyForConflictVpConversion(doubledArrakeenFirstRecall, doubledArrakeenFirstRecall.pendingAction, "carthag"),
  );
  assert.equal(doubledArrakeenFirstConversion.pendingAction?.remaining, 1);
  assert.equal(state.conflictVpConversionSpyChoices(doubledArrakeenFirstConversion, doubledArrakeenFirstConversion.pendingAction).length, 0);
  const blockedPartialSecondRecall = state.recallSpyForConflictVpConversion(
    doubledArrakeenFirstConversion,
    doubledArrakeenFirstConversion.pendingAction,
    "imperial-basin",
  );
  assert.equal(
    blockedPartialSecondRecall.pendingAction.cost.recalled,
    0,
    "Doubled Arrakeen should not start a spy conversion the player cannot finish",
  );
  const skippedPartialSecond = state.startNextRound(
    state.skipConflictVpConversion(blockedPartialSecondRecall, blockedPartialSecondRecall.pendingAction),
  );
  assert.deepEqual(skippedPartialSecond.pendingAction, {
    kind: "control-defense",
    ownerId: "p3",
    location: "arrakeen",
    source: "Siege Of Arrakeen",
  });
  assert.equal(playerById(skippedPartialSecond, "p3").vp, 3, "First doubled printed VP plus one completed spy conversion should remain");

  const previousCrysknife = { ...conflictBySourceId(data, 455), scored: false };
  const conflictMatch = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 8, deployedTroops: 1, wonConflicts: [previousCrysknife] }
        : player,
    ),
  );
  const conflictMatched = state.startNextRound(conflictMatch);
  const conflictWinner = playerById(conflictMatched, "p2");
  assert.equal(conflictWinner.wonConflicts.length, 2);
  assert.equal(conflictWinner.wonConflicts.every((conflict) => conflict.scored), true, "Both matched Conflicts should flip down");
  assert.equal(conflictWinner.vp, playerById(conflictMatch, "p2").vp + 1);

  const opposingTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2" || player.id === "p3") return { ...player, conflict: 6, deployedTroops: 1 };
      return player;
    }),
  );
  const opposingTied = state.startNextRound(opposingTie);
  assert.equal(opposingTied.conflictDiscard.some((conflict) => conflict.sourceId === 454), true);
  assert.equal(opposingTied.players.every((player) => player.wonConflicts.length === 0), true);

  const zeroStrength = fixture(state, data, (players) => players);
  const zeroResult = state.startNextRound(zeroStrength);
  assert.equal(zeroResult.conflictDiscard.some((conflict) => conflict.sourceId === 454), true);
  assert.equal(zeroResult.players.every((player) => player.wonConflicts.length === 0), true);

  const swordsOnly = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2" ? { ...player, conflict: 5, deployedTroops: 0 } : player,
    ),
  );
  const swordsOnlyResult = state.startNextRound(swordsOnly);
  assert.equal(swordsOnlyResult.conflictDiscard.some((conflict) => conflict.sourceId === 454), true);
  assert.equal(playerById(swordsOnlyResult, "p2").wonConflicts.length, 0, "Strength without units should not win");

  const scoredObjectiveIgnored = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 1, objectives: [{ ...crysknifeObjective, scored: true }] }
        : player,
    ),
  );
  const scoredObjectiveResult = state.startNextRound(scoredObjectiveIgnored);
  const scoredObjectiveWinner = playerById(scoredObjectiveResult, "p2");
  assert.equal(scoredObjectiveWinner.vp, playerById(scoredObjectiveIgnored, "p2").vp);
  assert.equal(scoredObjectiveWinner.wonConflicts[0].scored, false, "Already-scored Objectives should not match again");

  const scoredConflictIgnored = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 1, wonConflicts: [{ ...previousCrysknife, scored: true }] }
        : player,
    ),
  );
  const scoredConflictResult = state.startNextRound(scoredConflictIgnored);
  const scoredConflictWinner = playerById(scoredConflictResult, "p2");
  assert.equal(scoredConflictWinner.vp, playerById(scoredConflictIgnored, "p2").vp);
  assert.equal(scoredConflictWinner.wonConflicts.at(-1).scored, false, "Already-scored Conflicts should not match again");

  const sameTeamTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2" || player.id === "p6") return { ...player, conflict: 5, deployedTroops: 1 };
      return player;
    }),
  );
  const sameTeamPending = state.startNextRound(sameTeamTie);
  assert.equal(sameTeamPending.round, sameTeamTie.round, "Same-team ties should pause before recall");
  assert.deepEqual(sameTeamPending.pendingAction, {
    kind: "conflict-tie",
    team: "shaddam",
    tiedPlayerIds: ["p2", "p6"],
    strength: 5,
    source: "CHOAM Security",
  });
  const conceded = state.startNextRound(state.resolveConflictTie(sameTeamPending, sameTeamPending.pendingAction, "p2"));
  assert.equal(playerById(conceded, "p2").wonConflicts.length, 1, "Chosen Ally should take the tied Conflict");
  assert.equal(playerById(conceded, "p6").wonConflicts.length, 0);
  assert.equal(conceded.conflictDiscard.some((conflict) => conflict.sourceId === 454), false);

  const noConcession = state.startNextRound(state.resolveConflictTie(sameTeamPending, sameTeamPending.pendingAction));
  assert.equal(noConcession.conflictDiscard.some((conflict) => conflict.sourceId === 454), true);
  assert.equal(noConcession.players.every((player) => player.wonConflicts.length === 0), true);

  const sameTeamBattleTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, spice: 4 }, vp: 0 };
      if (player.id === "p6") return { ...player, conflict: 5, deployedTroops: 1, vp: 0 };
      return player;
    }), 464);
  const sameTeamBattlePending = state.startNextRound(sameTeamBattleTie);
  const sameTeamBattleConceded = state.resolveConflictTie(sameTeamBattlePending, sameTeamBattlePending.pendingAction, "p2");
  assert.equal(sameTeamBattleConceded.locationControl["imperial-basin"], "p2", "Same-team Battle concession should set location control");
  assert.equal(playerById(sameTeamBattleConceded, "p2").vp, 1, "Same-team Battle concession should award printed VP");
  assert.equal(sameTeamBattleConceded.pendingAction?.kind, "conflict-vp-conversion");
  assert.equal(sameTeamBattleConceded.pendingQueue.length, 0, "Same-team Battle concession should clear conflict-tie before queuing conversion");
  const sameTeamBattlePaid = state.startNextRound(
    state.payConflictVpConversion(sameTeamBattleConceded, sameTeamBattleConceded.pendingAction),
  );
  assert.equal(playerById(sameTeamBattlePaid, "p2").vp, 2);

  const commanderIgnored = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p4") return { ...player, conflict: 12, deployedTroops: 4 };
      if (player.id === "p2") return { ...player, conflict: 3, deployedTroops: 1 };
      return player;
    }),
  );
  const commanderResult = state.startNextRound(commanderIgnored);
  assert.equal(playerById(commanderResult, "p2").wonConflicts.length, 1, "Only Allies should win Conflicts");
  assert.equal(playerById(commanderResult, "p4").wonConflicts.length, 0);

  const propaganda = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 1, objectives: [crysknifeObjective] }
        : player,
    ), 463);
  const propagandaResult = state.startNextRound(propaganda);
  const propagandaWinner = playerById(propagandaResult, "p2");
  assert.equal(propagandaWinner.vp, playerById(propaganda, "p2").vp, "Wild Propaganda should not score before Endgame");
  assert.equal(propagandaWinner.objectives[0].scored, undefined);
  assert.equal(propagandaWinner.wonConflicts[0].battleIcon, "wild");
  assert.equal(propagandaWinner.wonConflicts[0].scored, false);

  console.log("conflict award verification passed");
} finally {
  await server.close();
}
