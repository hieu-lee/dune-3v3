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
