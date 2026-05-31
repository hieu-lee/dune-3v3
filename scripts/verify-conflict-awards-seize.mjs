import assert from "node:assert/strict";

export function verifySeizeSpiceRefineryConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
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
}
