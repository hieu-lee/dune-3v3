import assert from "node:assert/strict";

export function verifySpiceFreightersConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const spiceFreightersReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              garrison: 3,
              influence: { ...player.influence, bene: 1 },
              resources: { ...player.resources, spice: 3 },
              vp: 0,
            }
          : player,
      ), 455),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const spiceFreightersPending = state.startNextRound(spiceFreightersReward);
  assert.deepEqual(
    spiceFreightersPending.pendingAction,
    {
      kind: "conflict-influence",
      ownerId: "p2",
      remaining: 1,
      source: "Spice Freighters",
    },
    "Spice Freighters should pause for first-place Influence choice",
  );
  assert.deepEqual(
    spiceFreightersPending.pendingQueue,
    [{
      kind: "conflict-vp-conversion",
      ownerId: "p2",
      source: "Spice Freighters",
      remaining: 1,
      vp: 1,
      cost: { kind: "resource", resource: "spice", amount: 3 },
    }],
    "Spice Freighters should queue its 3-spice VP conversion after the Influence choice",
  );
  assert.equal(playerById(spiceFreightersPending, "p2").vp, 0, "Spice Freighters should not award fixed VP");
  assert.equal(playerById(spiceFreightersPending, "p2").garrison, 3, "Spice Freighters first place should not recruit troops");

  const spiceFreightersInfluence = state.startNextRound(
    state.gainConflictInfluenceForPending(
      spiceFreightersPending,
      spiceFreightersPending.pendingAction,
      "bene",
    ),
  );
  const spiceFreightersInfluencedWinner = playerById(spiceFreightersInfluence, "p2");
  assert.equal(spiceFreightersInfluencedWinner.influence.bene, 2, "Spice Freighters should gain chosen Influence");
  assert.equal(spiceFreightersInfluencedWinner.vp, 1, "Spice Freighters Influence should score the 2-Influence VP");
  assert.equal(spiceFreightersInfluence.pendingAction?.kind, "conflict-vp-conversion");
  assert.equal(spiceFreightersInfluence.round, spiceFreightersReward.round, "Spice Freighters conversion should pause before next round");
  const spiceFreightersPaid = state.startNextRound(
    state.payConflictVpConversion(spiceFreightersInfluence, spiceFreightersInfluence.pendingAction),
  );
  assert.equal(playerById(spiceFreightersPaid, "p2").resources.spice, 0);
  assert.equal(playerById(spiceFreightersPaid, "p2").vp, 2, "Spice Freighters conversion should pay 3 spice for 1 VP");
  assert.equal(spiceFreightersPaid.pendingAction, undefined);
  assert.equal(spiceFreightersPaid.round, spiceFreightersReward.round + 1);
  assert.equal(spiceFreightersPaid.conflict.sourceId, 452, "Paid Spice Freighters reward should reveal the next Conflict");

  const unpayableSpiceFreightersReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              influence: { ...player.influence, spacing: 0 },
              resources: { ...player.resources, spice: 0 },
              vp: 0,
            }
          : player,
      ), 455),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const unpayableSpiceFreightersPending = state.startNextRound(unpayableSpiceFreightersReward);
  const unpayableSpiceFreightersInfluence = state.startNextRound(
    state.gainConflictInfluenceForPending(
      unpayableSpiceFreightersPending,
      unpayableSpiceFreightersPending.pendingAction,
      "spacing",
    ),
  );
  assert.equal(
    unpayableSpiceFreightersInfluence.pendingAction,
    undefined,
    "Unpayable Spice Freighters conversion should not leave a disabled pending action",
  );
  assert.equal(unpayableSpiceFreightersInfluence.round, unpayableSpiceFreightersReward.round + 1);
  assert.equal(playerById(unpayableSpiceFreightersInfluence, "p2").resources.spice, 0);
  assert.equal(playerById(unpayableSpiceFreightersInfluence, "p2").vp, 0);

  const margotSpiceFreightersReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              leader: "Lady Margot Fenring",
              leaderCard: data.leaderCardByName("Lady Margot Fenring"),
              conflict: 9,
              deployedTroops: 1,
              influence: { ...player.influence, bene: 1 },
              resources: { ...player.resources, spice: 1 },
              vp: 0,
            }
          : player,
      ), 455),
    conflictDeck: [conflictBySourceId(data, 452)],
    turnSpiceGains: {},
  };
  const margotSpiceFreightersPending = state.startNextRound(margotSpiceFreightersReward);
  assert.equal(
    margotSpiceFreightersPending.pendingQueue[0]?.kind,
    "conflict-vp-conversion",
    "Spice Freighters should queue conversion when Influence rewards may enable payment later",
  );
  const margotSpiceFreightersInfluence = state.startNextRound(
    state.gainConflictInfluenceForPending(
      margotSpiceFreightersPending,
      margotSpiceFreightersPending.pendingAction,
      "bene",
    ),
  );
  assert.equal(playerById(margotSpiceFreightersInfluence, "p2").resources.spice, 3);
  assert.equal(
    margotSpiceFreightersInfluence.turnSpiceGains.p2,
    2,
    "Spice Freighters Influence should allow Margot Loyalty spice before conversion",
  );
  const margotSpiceFreightersPaid = state.startNextRound(
    state.payConflictVpConversion(margotSpiceFreightersInfluence, margotSpiceFreightersInfluence.pendingAction),
  );
  assert.equal(playerById(margotSpiceFreightersPaid, "p2").resources.spice, 0);
  assert.equal(playerById(margotSpiceFreightersPaid, "p2").vp, 2);

  const doubledSpiceFreightersReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              conflict: 9,
              deployedSandworms: 1,
              influence: { ...player.influence, spacing: 0 },
              resources: { ...player.resources, spice: 6 },
              vp: 0,
            }
          : player,
      ), 455),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const doubledSpiceFreightersPending = state.startNextRound(doubledSpiceFreightersReward);
  assert.equal(doubledSpiceFreightersPending.pendingAction?.remaining, 2);
  assert.equal(doubledSpiceFreightersPending.pendingQueue[0]?.remaining, 2);
  const doubledSpiceFreightersOnce = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledSpiceFreightersPending,
      doubledSpiceFreightersPending.pendingAction,
      "spacing",
    ),
  );
  const doubledSpiceFreightersTwice = state.startNextRound(
    state.gainConflictInfluenceForPending(
      doubledSpiceFreightersOnce,
      doubledSpiceFreightersOnce.pendingAction,
      "spacing",
    ),
  );
  assert.equal(playerById(doubledSpiceFreightersTwice, "p3").influence.spacing, 2);
  assert.equal(playerById(doubledSpiceFreightersTwice, "p3").vp, 1);
  assert.equal(doubledSpiceFreightersTwice.pendingAction?.remaining, 2);
  const doubledSpiceFreightersPaidOnce = state.startNextRound(
    state.payConflictVpConversion(doubledSpiceFreightersTwice, doubledSpiceFreightersTwice.pendingAction),
  );
  assert.equal(doubledSpiceFreightersPaidOnce.pendingAction?.remaining, 1);
  const doubledSpiceFreightersPaidTwice = state.startNextRound(
    state.payConflictVpConversion(doubledSpiceFreightersPaidOnce, doubledSpiceFreightersPaidOnce.pendingAction),
  );
  assert.equal(playerById(doubledSpiceFreightersPaidTwice, "p3").resources.spice, 0);
  assert.equal(playerById(doubledSpiceFreightersPaidTwice, "p3").vp, 3);
}
