import assert from "node:assert/strict";

export function verifyTestOfLoyaltyConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const testOfLoyaltyReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              influence: { ...player.influence, emperor: 1 },
              resources: { ...player.resources, solari: 0 },
              vp: 0,
            }
          : player,
      ), 458),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const testOfLoyaltyResult = state.startNextRound(testOfLoyaltyReward);
  const testOfLoyaltyWinner = playerById(testOfLoyaltyResult, "p2");
  assert.equal(testOfLoyaltyWinner.resources.solari, 2, "Test Of Loyalty should pay first-place Solari");
  assert.equal(testOfLoyaltyWinner.influence.emperor, 2, "Test Of Loyalty should pay Emperor Influence");
  assert.equal(testOfLoyaltyWinner.vp, 1, "Test Of Loyalty Influence should score the 2-Influence VP");
  assert.deepEqual(
    testOfLoyaltyResult.pendingAction,
    { kind: "spy", ownerId: "p2", remaining: 1, source: "Test Of Loyalty", recallForSupply: true },
    "Test Of Loyalty should queue its first-place spy reward",
  );
  assert.ok(
    testOfLoyaltyResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("1 Emperor Influence") &&
      entry.includes("Test Of Loyalty")
    ),
    "Test Of Loyalty should log the paid printed reward",
  );
  assert.ok(
    testOfLoyaltyResult.log.some((entry) =>
      entry.includes("may place 1 spy") &&
      entry.includes("Test Of Loyalty")
    ),
    "Test Of Loyalty should log the pending spy reward",
  );

  const testSpySpace = state.placeableSpySpaces(
    testOfLoyaltyResult,
    testOfLoyaltyResult.pendingAction,
  )[0];
  assert.ok(testSpySpace, "Test Of Loyalty should expose a legal spy placement");
  const testSpyPlaced = state.placeSpyForPending(
    testOfLoyaltyResult,
    testOfLoyaltyResult.pendingAction,
    testSpySpace.id,
  );
  assert.equal(testSpyPlaced.spyPosts[testSpySpace.id], "p2", "Test Of Loyalty should place the rewarded spy");
  assert.equal(testSpyPlaced.pendingAction, undefined, "Placed Test Of Loyalty spy should clear the reward pending action");
  assert.equal(testSpyPlaced.round, testOfLoyaltyResult.round + 1, "Placed Test Of Loyalty spy should advance to the next round");
  assert.equal(testSpyPlaced.conflict?.sourceId, 454, "Placed Test Of Loyalty spy should reveal the next Conflict");

  const testSpySkipped = state.finishPendingAction(testOfLoyaltyResult);
  assert.equal(testSpySkipped.pendingAction, undefined, "Skipped Test Of Loyalty spy should clear the reward pending action");
  assert.equal(testSpySkipped.round, testOfLoyaltyResult.round + 1, "Skipped Test Of Loyalty spy should advance to the next round");
  assert.equal(testSpySkipped.conflict?.sourceId, 454, "Skipped Test Of Loyalty spy should reveal the next Conflict");

  const doubledTestOfLoyaltyReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              conflict: 9,
              deployedSandworms: 1,
              influence: { ...player.influence, emperor: 0 },
              resources: { ...player.resources, solari: 0 },
              vp: 0,
            }
          : player,
      ), 458),
    conflictDeck: [conflictBySourceId(data, 454)],
  };
  const doubledTestOfLoyaltyResult = state.startNextRound(doubledTestOfLoyaltyReward);
  const doubledTestOfLoyaltyWinner = playerById(doubledTestOfLoyaltyResult, "p3");
  assert.equal(doubledTestOfLoyaltyWinner.resources.solari, 4, "Sandworms should double Test Of Loyalty Solari");
  assert.equal(doubledTestOfLoyaltyWinner.influence.emperor, 2, "Sandworms should double Test Of Loyalty Emperor Influence");
  assert.equal(doubledTestOfLoyaltyWinner.vp, 1, "Doubled Test Of Loyalty Influence should score the VP threshold once");
  assert.deepEqual(
    doubledTestOfLoyaltyResult.pendingAction,
    { kind: "spy", ownerId: "p3", remaining: 2, source: "Test Of Loyalty", recallForSupply: true },
    "Sandworms should double Test Of Loyalty spy placement",
  );
  assert.ok(
    doubledTestOfLoyaltyResult.log.some((entry) =>
      entry.includes("gains 4 solari") &&
      entry.includes("2 Emperor Influence") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Test Of Loyalty should log the doubled printed reward",
  );
  assert.ok(
    doubledTestOfLoyaltyResult.log.some((entry) =>
      entry.includes("may place 2 spies") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Test Of Loyalty should log the doubled spy reward",
  );

  const doubledFirstSpySpace = state.placeableSpySpaces(
    doubledTestOfLoyaltyResult,
    doubledTestOfLoyaltyResult.pendingAction,
  )[0];
  assert.ok(doubledFirstSpySpace, "Doubled Test Of Loyalty should expose a first spy placement");
  const doubledFirstSpyPlaced = state.placeSpyForPending(
    doubledTestOfLoyaltyResult,
    doubledTestOfLoyaltyResult.pendingAction,
    doubledFirstSpySpace.id,
  );
  assert.equal(
    doubledFirstSpyPlaced.pendingAction?.remaining,
    1,
    "Doubled Test Of Loyalty should keep the second spy placement pending",
  );
  assert.equal(
    doubledFirstSpyPlaced.round,
    doubledTestOfLoyaltyResult.round,
    "Doubled Test Of Loyalty should not advance before the second spy is resolved",
  );
  const doubledSecondSpySpace = state.placeableSpySpaces(
    doubledFirstSpyPlaced,
    doubledFirstSpyPlaced.pendingAction,
  )[0];
  assert.ok(doubledSecondSpySpace, "Doubled Test Of Loyalty should expose a second spy placement");
  const doubledSecondSpyPlaced = state.placeSpyForPending(
    doubledFirstSpyPlaced,
    doubledFirstSpyPlaced.pendingAction,
    doubledSecondSpySpace.id,
  );
  assert.equal(
    doubledSecondSpyPlaced.pendingAction,
    undefined,
    "Doubled Test Of Loyalty should clear after both spies are placed",
  );
  assert.equal(
    doubledSecondSpyPlaced.round,
    doubledTestOfLoyaltyResult.round + 1,
    "Doubled Test Of Loyalty should advance after both spies are placed",
  );
  assert.equal(
    doubledSecondSpyPlaced.conflict?.sourceId,
    454,
    "Doubled Test Of Loyalty should reveal the next Conflict after both spies are placed",
  );
}
