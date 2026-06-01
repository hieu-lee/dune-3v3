import assert from "node:assert/strict";

function testTrashCard(player, id, name) {
  const template = [...player.hand, ...player.discard, ...player.playArea, ...player.deck][0];
  assert.ok(template, `Expected ${player.leader} to have a card template for trash fixture`);
  return { ...template, id, name };
}

export function verifyLowerRankConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const siegeRanks = {
    ...fixture(state, data, (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return {
            ...player,
            conflict: 9,
            deployedTroops: 1,
            garrison: 0,
            resources: { ...player.resources, solari: 0 },
          };
        }
        if (player.id === "p3") {
          return {
            ...player,
            conflict: 5,
            deployedSandworms: 1,
            garrison: 0,
            resources: { ...player.resources, solari: 0 },
          };
        }
        if (player.id === "p5") {
          return {
            ...player,
            conflict: 3,
            deployedTroops: 1,
            garrison: 0,
            resources: { ...player.resources, solari: 0 },
          };
        }
        return player;
      }), 456),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const siegeRanksResult = state.startNextRound(siegeRanks);
  assert.equal(playerById(siegeRanksResult, "p2").resources.solari, 2, "Siege winner should keep first reward Solari");
  assert.equal(playerById(siegeRanksResult, "p2").garrison, 2, "Siege winner should recruit first reward troops");
  assert.equal(playerById(siegeRanksResult, "p3").resources.solari, 8, "Sandworms should double second reward Solari");
  assert.equal(playerById(siegeRanksResult, "p3").garrison, 2, "Sandworms should double second reward troops");
  assert.equal(playerById(siegeRanksResult, "p5").resources.solari, 3, "Third place should gain the third reward");
  assert.ok(
    siegeRanksResult.log.some((entry) =>
      entry.includes("second-place reward") &&
      entry.includes("gains 8 solari") &&
      entry.includes("sandworm doubling")
    ),
    "Lower-rank rewards should log rank and sandworm doubling",
  );

  const tiedSecond = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p3" || player.id === "p6") {
        return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      }
      if (player.id === "p5") return { ...player, conflict: 3, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      return player;
    }), 456);
  const tiedSecondResult = state.startNextRound(tiedSecond);
  assert.equal(playerById(tiedSecondResult, "p3").resources.solari, 3, "Tied second players should gain third reward");
  assert.equal(playerById(tiedSecondResult, "p6").resources.solari, 3, "Each cross-team tied second player should gain third reward");
  assert.equal(playerById(tiedSecondResult, "p5").resources.solari, 0, "No further rewards should be paid after a second-place tie");

  const sameTeamSecondTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p3" || player.id === "p5") {
        return { ...player, conflict: 5, deployedTroops: 1, garrison: 0, resources: { ...player.resources, solari: 0 } };
      }
      return player;
    }), 456);
  const sameTeamSecondTiePending = state.startNextRound(sameTeamSecondTie);
  assert.deepEqual(sameTeamSecondTiePending.pendingAction, {
    kind: "conflict-tie",
    team: "muaddib",
    tiedPlayerIds: ["p3", "p5"],
    strength: 5,
    rank: 2,
    source: "Siege Of Arrakeen",
  });
  const sameTeamSecondConceded = state.startNextRound(
    state.resolveConflictTie(sameTeamSecondTiePending, sameTeamSecondTiePending.pendingAction, "p3"),
  );
  assert.equal(playerById(sameTeamSecondConceded, "p2").wonConflicts.length, 1, "Unique winner should still take the Conflict");
  assert.equal(playerById(sameTeamSecondConceded, "p3").resources.solari, 4, "Chosen tied-second Ally should gain second reward");
  assert.equal(playerById(sameTeamSecondConceded, "p3").garrison, 1, "Chosen tied-second Ally should recruit second reward troop");
  assert.equal(playerById(sameTeamSecondConceded, "p5").resources.solari, 3, "Conceding tied-second Ally should gain third reward");

  const sameTeamSecondNoConcession = state.startNextRound(
    state.resolveConflictTie(sameTeamSecondTiePending, sameTeamSecondTiePending.pendingAction),
  );
  assert.equal(playerById(sameTeamSecondNoConcession, "p3").resources.solari, 3, "No concession should pay third reward to tied second Ally");
  assert.equal(playerById(sameTeamSecondNoConcession, "p5").resources.solari, 3, "No concession should pay third reward to both tied second Allies");

  const tiedThird = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p3") return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p5" || player.id === "p6") {
        return { ...player, conflict: 3, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      }
      return player;
    }), 456);
  const tiedThirdResult = state.startNextRound(tiedThird);
  assert.equal(playerById(tiedThirdResult, "p3").resources.solari, 4, "Unique second place should gain second reward");
  assert.equal(playerById(tiedThirdResult, "p5").resources.solari, 0, "Tied third place should receive nothing");
  assert.equal(playerById(tiedThirdResult, "p6").resources.solari, 0, "All tied third players should receive nothing");

  const sameTeamThirdTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p3") return { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p5") return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p2" || player.id === "p6") {
        return { ...player, conflict: 3, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      }
      return player;
    }), 456);
  const sameTeamThirdTiePending = state.startNextRound(sameTeamThirdTie);
  assert.equal(sameTeamThirdTiePending.pendingAction?.rank, 3, "Same-team third tie should pause for concession");
  const sameTeamThirdConceded = state.startNextRound(
    state.resolveConflictTie(sameTeamThirdTiePending, sameTeamThirdTiePending.pendingAction, "p2"),
  );
  assert.equal(playerById(sameTeamThirdConceded, "p5").resources.solari, 4, "Unique second should still gain second reward");
  assert.equal(playerById(sameTeamThirdConceded, "p2").resources.solari, 3, "Chosen tied-third Ally should gain third reward");
  assert.equal(playerById(sameTeamThirdConceded, "p6").resources.solari, 0, "Conceding tied-third Ally should gain nothing");
  const sameTeamThirdNoConcession = state.startNextRound(
    state.resolveConflictTie(sameTeamThirdTiePending, sameTeamThirdTiePending.pendingAction),
  );
  assert.equal(playerById(sameTeamThirdNoConcession, "p2").resources.solari, 0, "No concession should pay no tied-third rewards");
  assert.equal(playerById(sameTeamThirdNoConcession, "p6").resources.solari, 0, "No concession should leave both tied-third Allies unpaid");

  const crossTeamFirstTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 9, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      if (player.id === "p3") {
        return {
          ...player,
          conflict: 9,
          deployedSandworms: 1,
          resources: { ...player.resources, solari: 0 },
        };
      }
      if (player.id === "p5") return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      return player;
    }), 456);
  const crossTeamFirstTieResult = state.startNextRound(crossTeamFirstTie);
  assert.equal(playerById(crossTeamFirstTieResult, "p2").resources.solari, 4, "Tied first players should gain second reward");
  assert.equal(playerById(crossTeamFirstTieResult, "p3").resources.solari, 8, "Sandworms should double tied-first second reward");
  assert.equal(playerById(crossTeamFirstTieResult, "p5").resources.solari, 3, "Exactly two tied first should leave third reward available");
  assert.equal(playerById(crossTeamFirstTieResult, "p2").wonConflicts.length, 0, "No one should take a cross-team tied Conflict");
  assert.equal(crossTeamFirstTieResult.conflictDiscard.some((conflict) => conflict.sourceId === 456), true);
  assert.equal(crossTeamFirstTieResult.locationControl.arrakeen, undefined, "Tied first should not set location control");

  const sameTeamFirstTie = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2" || player.id === "p6") {
        return { ...player, conflict: 9, deployedTroops: 1, garrison: 0, resources: { ...player.resources, solari: 0 } };
      }
      if (player.id === "p3") return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      return player;
    }), 456);
  const sameTeamFirstTiePending = state.startNextRound(sameTeamFirstTie);
  assert.equal(sameTeamFirstTiePending.pendingAction?.kind, "conflict-tie", "Same-team first tie should still pause for concession");
  const sameTeamConceded = state.startNextRound(
    state.resolveConflictTie(sameTeamFirstTiePending, sameTeamFirstTiePending.pendingAction, "p2"),
  );
  assert.equal(playerById(sameTeamConceded, "p2").wonConflicts.length, 1, "Chosen same-team Ally should win after concession");
  assert.equal(playerById(sameTeamConceded, "p6").resources.solari, 4, "Conceding Ally should gain second reward");
  assert.equal(playerById(sameTeamConceded, "p6").garrison, 1, "Conceding Ally should recruit second reward troop");
  assert.equal(playerById(sameTeamConceded, "p3").resources.solari, 3, "Concession should keep third reward available");

  const sameTeamNoConcession = state.startNextRound(
    state.resolveConflictTie(sameTeamFirstTiePending, sameTeamFirstTiePending.pendingAction),
  );
  assert.equal(playerById(sameTeamNoConcession, "p2").wonConflicts.length, 0);
  assert.equal(playerById(sameTeamNoConcession, "p2").resources.solari, 4, "No concession should pay second reward to tied Ally");
  assert.equal(playerById(sameTeamNoConcession, "p6").resources.solari, 4, "No concession should pay second reward to both tied Allies");
  assert.equal(playerById(sameTeamNoConcession, "p3").resources.solari, 3, "No concession should still pay third reward after exactly two tied first");

  const cascadingSameTeamTies = fixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2" || player.id === "p6") {
        return { ...player, conflict: 9, deployedTroops: 1, garrison: 0, resources: { ...player.resources, solari: 0 } };
      }
      if (player.id === "p3" || player.id === "p5") {
        return { ...player, conflict: 5, deployedTroops: 1, resources: { ...player.resources, solari: 0 } };
      }
      return player;
    }), 456);
  const cascadingFirstTie = state.startNextRound(cascadingSameTeamTies);
  assert.equal(cascadingFirstTie.pendingAction?.rank, 1, "First same-team tie should pause first");
  const cascadingThirdTie = state.resolveConflictTie(cascadingFirstTie, cascadingFirstTie.pendingAction, "p2");
  assert.equal(cascadingThirdTie.pendingAction?.rank, 3, "Resolving first tie should expose the lower same-team third tie");
  assert.equal(playerById(cascadingThirdTie, "p2").wonConflicts.length, 0, "Cascading tie should defer rewards until all concessions resolve");
  const cascadingResolved = state.startNextRound(
    state.resolveConflictTie(cascadingThirdTie, cascadingThirdTie.pendingAction, "p3"),
  );
  assert.equal(playerById(cascadingResolved, "p2").wonConflicts.length, 1, "First concession winner should take Conflict after cascade");
  assert.equal(playerById(cascadingResolved, "p6").resources.solari, 4, "First concession loser should gain second reward");
  assert.equal(playerById(cascadingResolved, "p3").resources.solari, 3, "Lower concession winner should gain third reward");
  assert.equal(playerById(cascadingResolved, "p5").resources.solari, 0, "Lower concession loser should gain nothing");

  const cascadingNoFirstConcession = state.resolveConflictTie(cascadingFirstTie, cascadingFirstTie.pendingAction);
  assert.equal(cascadingNoFirstConcession.pendingAction?.rank, 3, "No first concession should still expose lower third tie");
  const cascadingNoFirstResolved = state.startNextRound(
    state.resolveConflictTie(cascadingNoFirstConcession, cascadingNoFirstConcession.pendingAction, "p3"),
  );
  assert.equal(playerById(cascadingNoFirstResolved, "p2").wonConflicts.length, 0, "No first concession should leave no Conflict winner");
  assert.equal(playerById(cascadingNoFirstResolved, "p2").resources.solari, 4, "No first concession should pay second reward");
  assert.equal(playerById(cascadingNoFirstResolved, "p6").resources.solari, 4, "No first concession should pay both tied first Allies second reward");
  assert.equal(playerById(cascadingNoFirstResolved, "p3").resources.solari, 3, "Lower concession should still pay third reward");

  const tradeDisputeLowerTrash = {
    ...fixture(state, data, (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return {
            ...player,
            conflict: 9,
            deployedTroops: 1,
            hand: [],
            discard: [],
            playArea: [],
            resources: { ...player.resources, water: 0, spice: 0 },
          };
        }
        if (player.id === "p3") {
          const trashCard = testTrashCard(player, "lower-trade-dispute-trash", "Lower Trade Dispute Trash");
          return {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            hand: [trashCard],
            discard: [],
            playArea: [],
            resources: { ...player.resources, water: 0, spice: 0 },
          };
        }
        if (player.id === "p5") {
          return {
            ...player,
            conflict: 3,
            deployedTroops: 1,
            garrison: 0,
            resources: { ...player.resources, water: 0, spice: 0 },
          };
        }
        return player;
      }), 462),
    contractDeck: [],
    contractOffer: [],
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const lowerTrashPending = state.startNextRound(tradeDisputeLowerTrash);
  assert.equal(playerById(lowerTrashPending, "p3").resources.water, 1, "Trade Dispute second reward should pay water");
  assert.equal(playerById(lowerTrashPending, "p3").resources.spice, 1, "Trade Dispute second reward should pay spice");
  assert.equal(playerById(lowerTrashPending, "p5").resources.water, 1, "Trade Dispute third reward should pay water");
  assert.equal(playerById(lowerTrashPending, "p5").garrison, 1, "Trade Dispute third reward should recruit a troop");
  assert.deepEqual(lowerTrashPending.pendingAction, {
    kind: "trash-card",
    ownerId: "p3",
    optional: false,
    source: "Trade Dispute",
  });
  const lowerTrashResolved = state.trashPlayerCard(
    lowerTrashPending,
    lowerTrashPending.pendingAction,
    "hand",
    "lower-trade-dispute-trash",
  );
  assert.equal(lowerTrashResolved.pendingAction, undefined, "Resolved second-place trash should clear pending action");
  assert.equal(lowerTrashResolved.conflict?.sourceId, 452, "Resolved lower-rank pending reward should advance the round");
}
