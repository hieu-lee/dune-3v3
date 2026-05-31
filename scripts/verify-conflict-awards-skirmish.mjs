import assert from "node:assert/strict";

export function verifySkirmishConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const crysknifeSkirmishReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 5,
              deployedTroops: 1,
              influence: { ...player.influence, bene: 1 },
              vp: 0,
            }
          : player,
      ), 451),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const crysknifeSkirmishPending = state.startNextRound(crysknifeSkirmishReward);
  assert.deepEqual(
    crysknifeSkirmishPending.pendingAction,
    {
      kind: "conflict-influence",
      ownerId: "p2",
      remaining: 1,
      source: "Skirmish (Crysknife)",
    },
    "Skirmish Crysknife should pause for first-place Influence choice",
  );
  assert.equal(crysknifeSkirmishPending.round, crysknifeSkirmishReward.round, "Influence choice should pause before next round");
  const crysknifeSkirmishResolved = state.startNextRound(
    state.gainConflictInfluenceForPending(
      crysknifeSkirmishPending,
      crysknifeSkirmishPending.pendingAction,
      "bene",
    ),
  );
  const crysknifeSkirmishWinner = playerById(crysknifeSkirmishResolved, "p2");
  assert.equal(crysknifeSkirmishWinner.influence.bene, 2, "Skirmish Crysknife should gain chosen Influence");
  assert.equal(crysknifeSkirmishWinner.vp, 1, "Skirmish Crysknife Influence should score the 2-Influence VP");
  assert.equal(crysknifeSkirmishResolved.pendingAction, undefined, "Resolved Skirmish Crysknife should clear pending choice");
  assert.equal(crysknifeSkirmishResolved.round, crysknifeSkirmishReward.round + 1, "Resolved choice should reveal the next round");
  assert.equal(crysknifeSkirmishResolved.conflict.sourceId, 452, "Resolved choice should reveal the next Conflict");
  assert.ok(
    crysknifeSkirmishResolved.log.some((entry) =>
      entry.includes("gains 1 Bene Gesserit Influence") &&
      entry.includes("Skirmish (Crysknife)")
    ),
    "Skirmish Crysknife should log the chosen Influence reward",
  );
  assert.equal(
    state.gainConflictInfluenceForPending(
      {
        ...crysknifeSkirmishResolved,
        pendingAction: {
          kind: "throne-row",
          ownerId: "p2",
          source: "Stale guard",
        },
      },
      crysknifeSkirmishPending.pendingAction,
      "bene",
    ).pendingAction?.kind,
    "throne-row",
    "Skirmish Crysknife resolver should ignore stale pending objects",
  );

  const doubledCrysknifeSkirmishReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              conflict: 5,
              deployedSandworms: 1,
              influence: { ...player.influence, spacing: 0 },
              vp: 0,
            }
          : player,
      ), 451),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const doubledCrysknifeSkirmishPending = state.startNextRound(doubledCrysknifeSkirmishReward);
  assert.equal(
    doubledCrysknifeSkirmishPending.pendingAction?.remaining,
    2,
    "Sandworms should double Skirmish Crysknife Influence choices",
  );
  const doubledCrysknifeSkirmishOnce = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledCrysknifeSkirmishPending,
      doubledCrysknifeSkirmishPending.pendingAction,
      "spacing",
    ),
  );
  assert.equal(doubledCrysknifeSkirmishOnce.pendingAction?.remaining, 1);
  assert.equal(doubledCrysknifeSkirmishOnce.round, doubledCrysknifeSkirmishReward.round);
  const doubledCrysknifeSkirmishTwice = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledCrysknifeSkirmishOnce,
      doubledCrysknifeSkirmishOnce.pendingAction,
      "spacing",
    ),
  );
  const doubledCrysknifeSkirmishWinner = playerById(doubledCrysknifeSkirmishTwice, "p3");
  assert.equal(doubledCrysknifeSkirmishWinner.influence.spacing, 2, "Doubled Skirmish Crysknife can choose the same Influence twice");
  assert.equal(doubledCrysknifeSkirmishWinner.vp, 1, "Doubled Skirmish Crysknife should score the threshold VP once");
  assert.equal(doubledCrysknifeSkirmishTwice.pendingAction, undefined);
  assert.equal(doubledCrysknifeSkirmishTwice.round, doubledCrysknifeSkirmishReward.round + 1);

  const ornithopterSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            intrigues: [],
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 452);
  const ornithopterSkirmishResult = state.startNextRound(ornithopterSkirmishReward);
  const ornithopterSkirmishWinner = playerById(ornithopterSkirmishResult, "p2");
  assert.equal(ornithopterSkirmishWinner.resources.solari, 1, "Skirmish Ornithopter should pay first-place Solari");
  assert.equal(
    ornithopterSkirmishWinner.intrigues.length,
    1,
    "Skirmish Ornithopter should draw one first-place Intrigue",
  );
  assert.equal(
    ornithopterSkirmishResult.intrigueDeck.length,
    ornithopterSkirmishReward.intrigueDeck.length - 1,
    "Skirmish Ornithopter should draw from the Intrigue deck",
  );
  assert.equal(ornithopterSkirmishResult.pendingAction, undefined, "Skirmish Ornithopter should not require choices");
  assert.ok(
    ornithopterSkirmishResult.log.some((entry) =>
      entry.includes("draws an Intrigue card") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Skirmish Ornithopter should log the Intrigue draw",
  );
  assert.ok(
    ornithopterSkirmishResult.log.some((entry) =>
      entry.includes("gains 1 solari") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Skirmish Ornithopter should log the Solari reward",
  );

  const doubledOrnithopterSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? {
            ...player,
            conflict: 5,
            deployedSandworms: 1,
            intrigues: [],
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 452);
  const doubledOrnithopterSkirmishResult = state.startNextRound(doubledOrnithopterSkirmishReward);
  const doubledOrnithopterSkirmishWinner = playerById(doubledOrnithopterSkirmishResult, "p3");
  assert.equal(
    doubledOrnithopterSkirmishWinner.resources.solari,
    2,
    "Sandworms should double Skirmish Ornithopter Solari",
  );
  assert.equal(
    doubledOrnithopterSkirmishWinner.intrigues.length,
    2,
    "Sandworms should double Skirmish Ornithopter Intrigue draws",
  );
  assert.ok(
    doubledOrnithopterSkirmishResult.log.some((entry) =>
      entry.includes("draws 2 Intrigue cards") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Doubled Skirmish Ornithopter should log both Intrigue draws",
  );
  assert.ok(
    doubledOrnithopterSkirmishResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Skirmish Ornithopter should log the doubled Solari reward",
  );

  const desertMouseSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 453);
  const desertMouseSkirmishResult = state.startNextRound(desertMouseSkirmishReward);
  const desertMouseSkirmishWinner = playerById(desertMouseSkirmishResult, "p2");
  assert.equal(desertMouseSkirmishWinner.resources.solari, 2, "Skirmish Desert Mouse should pay first-place Solari");
  assert.equal(desertMouseSkirmishResult.pendingAction, undefined, "Skirmish Desert Mouse should not require choices");
  assert.ok(
    desertMouseSkirmishResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("Skirmish (Desert Mouse)")
    ),
    "Skirmish Desert Mouse should log the paid printed reward",
  );

  const doubledDesertMouseSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? {
            ...player,
            conflict: 5,
            deployedSandworms: 1,
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 453);
  const doubledDesertMouseSkirmishResult = state.startNextRound(doubledDesertMouseSkirmishReward);
  const doubledDesertMouseSkirmishWinner = playerById(doubledDesertMouseSkirmishResult, "p3");
  assert.equal(
    doubledDesertMouseSkirmishWinner.resources.solari,
    4,
    "Sandworms should double Skirmish Desert Mouse Solari",
  );
  assert.ok(
    doubledDesertMouseSkirmishResult.log.some((entry) =>
      entry.includes("gains 4 solari") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Skirmish Desert Mouse should log the doubled printed reward",
  );
}
