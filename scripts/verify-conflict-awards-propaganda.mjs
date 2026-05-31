import assert from "node:assert/strict";

export function verifyPropagandaConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  objectiveById,
  playerById,
}) {
  const crysknifeObjective = objectiveById(data, "objective-crysknife-1");
  const propagandaReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              intrigues: [],
              influence: { ...player.influence, bene: 1, spacing: 0 },
              objectives: [crysknifeObjective],
              resources: { ...player.resources, spice: 0 },
              vp: 0,
            }
          : player,
      ), 463),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const propagandaPending = state.startNextRound(propagandaReward);
  assert.deepEqual(
    propagandaPending.pendingAction,
    {
      kind: "conflict-influence",
      ownerId: "p2",
      remaining: 2,
      source: "Propaganda",
      choices: ["emperor", "spacing", "bene", "fremen"],
    },
    "Propaganda should pause for two fixed Influence choices",
  );
  assert.equal(playerById(propagandaPending, "p2").wonConflicts[0].battleIcon, "wild");
  assert.equal(playerById(propagandaPending, "p2").wonConflicts[0].scored, false);
  assert.equal(playerById(propagandaPending, "p2").objectives[0].scored, undefined);
  assert.equal(playerById(propagandaPending, "p2").resources.spice, 0, "Propaganda first place should not gain lower-place spice");
  assert.equal(playerById(propagandaPending, "p2").intrigues.length, 0, "Propaganda first place should not draw lower-place Intrigues");
  assert.equal(playerById(propagandaPending, "p2").vp, 0, "Wild Propaganda should not score before Endgame");

  const propagandaAfterBene = state.startNextRound(
    state.gainConflictInfluenceForPending(
      propagandaPending,
      propagandaPending.pendingAction,
      "bene",
    ),
  );
  assert.equal(playerById(propagandaAfterBene, "p2").influence.bene, 2);
  assert.equal(playerById(propagandaAfterBene, "p2").vp, 1, "Chosen Bene Gesserit should score the Influence VP threshold");
  assert.deepEqual(
    propagandaAfterBene.pendingAction,
    {
      kind: "conflict-influence",
      ownerId: "p2",
      remaining: 1,
      source: "Propaganda",
      choices: ["emperor", "spacing", "fremen"],
    },
    "Propaganda should remove a chosen fixed Influence option",
  );
  const repeatedBeneBlocked = state.gainConflictInfluenceForPending(
    propagandaAfterBene,
    propagandaAfterBene.pendingAction,
    "bene",
  );
  assert.deepEqual(
    repeatedBeneBlocked.pendingAction,
    propagandaAfterBene.pendingAction,
    "Propaganda should not allow choosing the same printed icon twice in one reward copy",
  );

  const propagandaResolved = state.startNextRound(
    state.gainConflictInfluenceForPending(
      propagandaAfterBene,
      propagandaAfterBene.pendingAction,
      "spacing",
    ),
  );
  assert.equal(playerById(propagandaResolved, "p2").influence.spacing, 1);
  assert.equal(propagandaResolved.pendingAction, undefined);
  assert.equal(propagandaResolved.round, propagandaReward.round + 1);
  assert.equal(propagandaResolved.conflict.sourceId, 452);

  const doubledPropagandaReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              conflict: 9,
              deployedSandworms: 1,
              influence: {
                ...player.influence,
                emperor: 0,
                spacing: 0,
                bene: 0,
                fremen: 0,
              },
              vp: 0,
            }
          : player,
      ), 463),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const doubledPropagandaPending = state.startNextRound(doubledPropagandaReward);
  assert.equal(doubledPropagandaPending.pendingAction?.remaining, 2);
  assert.equal(doubledPropagandaPending.pendingQueue[0]?.remaining, 2);
  const doubledFirstEmperor = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledPropagandaPending,
      doubledPropagandaPending.pendingAction,
      "emperor",
    ),
  );
  const doubledFirstSpacing = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledFirstEmperor,
      doubledFirstEmperor.pendingAction,
      "spacing",
    ),
  );
  assert.equal(
    doubledFirstSpacing.pendingAction?.choices?.includes("emperor"),
    true,
    "Sandworm-doubled Propaganda should reset fixed choices for the second reward copy",
  );
  const doubledSecondEmperor = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledFirstSpacing,
      doubledFirstSpacing.pendingAction,
      "emperor",
    ),
  );
  const doubledResolved = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledSecondEmperor,
      doubledSecondEmperor.pendingAction,
      "bene",
    ),
  );
  const doubledWinner = playerById(doubledResolved, "p3");
  assert.equal(doubledWinner.influence.emperor, 2);
  assert.equal(doubledWinner.influence.spacing, 1);
  assert.equal(doubledWinner.influence.bene, 1);
  assert.equal(doubledWinner.vp, 1, "Doubled Propaganda should score one VP for the doubled Emperor threshold");
  assert.equal(doubledResolved.pendingAction, undefined);
}
