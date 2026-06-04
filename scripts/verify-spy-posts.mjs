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

function spaceById(data, spaceId) {
  const space = data.boardSpaces.find((candidate) => candidate.id === spaceId);
  assert.ok(space, `Expected board space ${spaceId}`);
  return space;
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const spies = await server.ssrLoadModule("/src/game/spy-posts.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(
    state.spyPostOwnerIds,
    spies.spyPostOwnerIds,
    "state.ts should preserve the public spyPostOwnerIds export",
  );
  assert.equal(
    state.canPlaceSpyPost,
    spies.canPlaceSpyPost,
    "state.ts should preserve the public canPlaceSpyPost export",
  );
  assert.equal(
    state.normalizeSpyObservationPosts,
    spies.normalizeSpyObservationPosts,
    "state.ts should preserve the public normalizeSpyObservationPosts export",
  );
  assert.equal(
    state.spyPostRecallCountForOwner,
    spies.spyPostRecallCountForOwner,
    "state.ts should preserve the public spyPostRecallCountForOwner export",
  );

  const game = state.initialGame();
  const feyd = playerById(game, "p2");
  const shaddam = playerById(game, "p4");
  const muaddib = playerById(game, "p1");
  const arrakeen = spaceById(data, "arrakeen");
  const spiceRefinery = spaceById(data, "spice-refinery");
  const deliverSupplies = spaceById(data, "deliver-supplies");
  const heighliner = spaceById(data, "heighliner");
  const swordmaster = spaceById(data, "swordmaster");
  const vastWealth = spaceById(data, "vast-wealth");

  const sharedState = {
    spyPosts: { [arrakeen.id]: feyd.id },
    sharedSpyPosts: { [arrakeen.id]: ["p3", feyd.id] },
  };
  assert.deepEqual(
    spies.spyPostOwnerIds(sharedState, arrakeen.id),
    [feyd.id, "p3"],
    "Spy owners should be unique across standard and shared posts",
  );
  assert.equal(spies.spyPostOccupied(sharedState, arrakeen.id), true);
  assert.equal(spies.playerHasSpyPost(sharedState, arrakeen.id, feyd.id), true);

  const removedFeyd = spies.removeSpyPostOwner(sharedState, arrakeen.id, feyd.id);
  assert.deepEqual(removedFeyd.spyPosts, {});
  assert.deepEqual(removedFeyd.sharedSpyPosts, { [arrakeen.id]: ["p3"] });
  assert.deepEqual(sharedState.spyPosts, { [arrakeen.id]: feyd.id }, "Removing a spy should not mutate input state");

  const removedP3 = spies.removeSpyPostOwner(removedFeyd, arrakeen.id, "p3");
  assert.deepEqual(removedP3.sharedSpyPosts, {}, "Removing the last shared spy should delete the shared post entry");

  assert.equal(
    spies.spyObservationPostIdForSpace(arrakeen.id),
    "arrakeen-spice-refinery",
    "Arrakeen should use the shared Arrakeen / Spice Refinery observation post",
  );
  assert.deepEqual(
    spies.spyObservationPostSpaceIdsForSpace(spiceRefinery.id),
    [arrakeen.id, spiceRefinery.id],
    "Spice Refinery should observe the same two-space post as Arrakeen",
  );
  assert.equal(
    spies.spyObservationPostLabelForSpace(arrakeen.id),
    "Arrakeen / Spice Refinery",
    "Shared city observation post labels should name every observed space",
  );
  assert.equal(
    spies.spyObservationPostIdForSpace(deliverSupplies.id),
    "deliver-supplies-heighliner",
    "Deliver Supplies should use the shared Deliver Supplies / Heighliner observation post",
  );
  assert.deepEqual(
    spies.spyObservationPostSpaceIdsForSpace(heighliner.id),
    [deliverSupplies.id, heighliner.id],
    "Heighliner should observe the same two-space post as Deliver Supplies",
  );

  const removedLegacyDuplicateArrakeen = spies.removeSpyPostOwner({
    spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id },
    sharedSpyPosts: {},
  }, arrakeen.id, feyd.id);
  assert.equal(
    removedLegacyDuplicateArrakeen.removedSpyCount,
    2,
    "Removing an unnormalized same-owner legacy Arrakeen / Spice Refinery post should report both stored tokens",
  );
  assert.deepEqual(removedLegacyDuplicateArrakeen.spyPosts, {});

  const removedLegacyDuplicateSpacing = spies.removeSpyPostOwner({
    spyPosts: { [deliverSupplies.id]: feyd.id, [heighliner.id]: feyd.id },
    sharedSpyPosts: {},
  }, heighliner.id, feyd.id);
  assert.equal(
    removedLegacyDuplicateSpacing.removedSpyCount,
    2,
    "Removing an unnormalized same-owner legacy Deliver Supplies / Heighliner post should report both stored tokens",
  );
  assert.deepEqual(removedLegacyDuplicateSpacing.spyPosts, {});

  const legacyDuplicateSharedPosts = {
    ...game,
    players: game.players.map((player) => player.id === feyd.id ? { ...player, spies: 0 } : player),
    spyPosts: {
      [arrakeen.id]: feyd.id,
      [spiceRefinery.id]: feyd.id,
      [deliverSupplies.id]: feyd.id,
      [heighliner.id]: feyd.id,
    },
    sharedSpyPosts: {},
  };
  const normalizedDuplicateSharedPosts = spies.normalizeSpyObservationPosts(legacyDuplicateSharedPosts);
  assert.equal(
    normalizedDuplicateSharedPosts.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Legacy Arrakeen / Spice Refinery duplicate storage should collapse to the canonical post id",
  );
  assert.equal(normalizedDuplicateSharedPosts.spyPosts[arrakeen.id], undefined);
  assert.equal(normalizedDuplicateSharedPosts.spyPosts[spiceRefinery.id], undefined);
  assert.equal(
    normalizedDuplicateSharedPosts.spyPosts[spies.spyObservationPostIdForSpace(heighliner.id)],
    feyd.id,
    "Legacy Deliver Supplies / Heighliner duplicate storage should collapse to the canonical post id",
  );
  assert.equal(normalizedDuplicateSharedPosts.spyPosts[deliverSupplies.id], undefined);
  assert.equal(normalizedDuplicateSharedPosts.spyPosts[heighliner.id], undefined);
  assert.equal(
    playerById(normalizedDuplicateSharedPosts, feyd.id).spies,
    2,
    "Normalizing two same-owner legacy duplicate posts should refund the two extra stored spy tokens",
  );
  assert.equal(
    spies.spyPostCount(normalizedDuplicateSharedPosts, feyd.id),
    2,
    "Normalized duplicate legacy posts should count only the two physical observation posts",
  );

  const legacyDuplicateRecallPending = {
    kind: "recall-spy",
    ownerId: feyd.id,
    combatRecipientId: feyd.id,
    remaining: 1,
    strength: 0,
    source: "test",
    optional: false,
  };
  const recalledUnnormalizedLegacyPost = state.recallSpyForPending(
    {
      ...legacyDuplicateSharedPosts,
      spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id },
    },
    legacyDuplicateRecallPending,
    arrakeen.id,
  );
  assert.equal(
    playerById(recalledUnnormalizedLegacyPost, feyd.id).spies,
    2,
    "Recalling an unnormalized same-owner legacy shared post should refund every removed stored token",
  );
  assert.equal(recalledUnnormalizedLegacyPost.spyPosts[arrakeen.id], undefined);
  assert.equal(recalledUnnormalizedLegacyPost.spyPosts[spiceRefinery.id], undefined);

  const legacyDuplicateTwoRecallPending = {
    ...legacyDuplicateRecallPending,
    remaining: 2,
    strength: 7,
  };
  const activeLegacyDuplicateRecallState = {
    ...legacyDuplicateSharedPosts,
    spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id },
    pendingAction: legacyDuplicateTwoRecallPending,
    pendingQueue: [],
  };
  const normalizedActiveLegacyDuplicateRecallState = spies.normalizeSpyObservationPosts(activeLegacyDuplicateRecallState);
  assert.equal(
    normalizedActiveLegacyDuplicateRecallState.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Normalization should canonicalize same-owner legacy duplicate storage while preserving active spy-recall credit",
  );
  assert.deepEqual(
    normalizedActiveLegacyDuplicateRecallState.sharedSpyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    [feyd.id],
    "Normalization should preserve the pending owner's second recall credit as a canonical duplicate entry",
  );
  assert.equal(normalizedActiveLegacyDuplicateRecallState.spyPosts[arrakeen.id], undefined);
  assert.equal(normalizedActiveLegacyDuplicateRecallState.spyPosts[spiceRefinery.id], undefined);
  assert.equal(
    playerById(normalizedActiveLegacyDuplicateRecallState, feyd.id).spies,
    0,
    "Deferred active pending normalization should not refund duplicate spy tokens before the recall resolves",
  );
  const recalledTwoSpyLegacyPost = state.recallSpyForPending(
    normalizedActiveLegacyDuplicateRecallState,
    legacyDuplicateTwoRecallPending,
    arrakeen.id,
  );
  assert.equal(
    recalledTwoSpyLegacyPost.pendingAction,
    undefined,
    "Recalling one unnormalized same-owner legacy shared post should satisfy a two-spy recall pending",
  );
  assert.equal(
    playerById(recalledTwoSpyLegacyPost, feyd.id).spies,
    2,
    "Two-spy legacy recall should refund both removed stored tokens",
  );
  assert.equal(
    playerById(recalledTwoSpyLegacyPost, feyd.id).conflict,
    feyd.conflict + 7,
    "Two-spy legacy recall should apply the pending strength when duplicate recall credit completes it",
  );
  assert.equal(
    recalledTwoSpyLegacyPost.turnSpyRecalls[feyd.id],
    2,
    "Two-spy legacy recall should track both recalled stored tokens for same-turn effects",
  );
  const activeTwoPostLegacyDuplicateRecallState = spies.normalizeSpyObservationPosts({
    ...legacyDuplicateSharedPosts,
    spyPosts: {
      [arrakeen.id]: feyd.id,
      [spiceRefinery.id]: feyd.id,
      [deliverSupplies.id]: feyd.id,
      [heighliner.id]: feyd.id,
    },
    pendingAction: legacyDuplicateTwoRecallPending,
    pendingQueue: [],
  });
  const recalledOneOfTwoLegacyDuplicatePosts = state.recallSpyForPending(
    activeTwoPostLegacyDuplicateRecallState,
    legacyDuplicateTwoRecallPending,
    arrakeen.id,
  );
  assert.equal(
    recalledOneOfTwoLegacyDuplicatePosts.pendingAction,
    undefined,
    "A completed legacy duplicate recall should clear the pending action",
  );
  assert.equal(
    recalledOneOfTwoLegacyDuplicatePosts.spyPosts[spies.spyObservationPostIdForSpace(heighliner.id)],
    feyd.id,
    "Successful recall cleanup should preserve the unselected shared post as one canonical physical spy",
  );
  assert.equal(
    recalledOneOfTwoLegacyDuplicatePosts.sharedSpyPosts[spies.spyObservationPostIdForSpace(heighliner.id)],
    undefined,
    "Successful recall cleanup should collapse duplicate credit on unselected shared posts after pending is satisfied",
  );
  assert.equal(
    playerById(recalledOneOfTwoLegacyDuplicatePosts, feyd.id).spies,
    3,
    "Successful recall cleanup should refund the recalled duplicate pair plus the unselected duplicate token",
  );
  const optionalLegacyDuplicateRecallPending = { ...legacyDuplicateTwoRecallPending, optional: true };
  const skippedLegacyDuplicateRecall = state.skipRecallSpy(
    {
      ...normalizedActiveLegacyDuplicateRecallState,
      pendingAction: optionalLegacyDuplicateRecallPending,
    },
    optionalLegacyDuplicateRecallPending,
  );
  assert.equal(
    skippedLegacyDuplicateRecall.pendingAction,
    undefined,
    "Skipping an optional legacy duplicate recall should advance the pending action",
  );
  assert.equal(
    skippedLegacyDuplicateRecall.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Skipping an optional legacy duplicate recall should leave one canonical physical post",
  );
  assert.equal(
    skippedLegacyDuplicateRecall.sharedSpyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    undefined,
    "Skipping an optional legacy duplicate recall should collapse the duplicate canonical recall credit",
  );
  assert.equal(
    playerById(skippedLegacyDuplicateRecall, feyd.id).spies,
    1,
    "Skipping an optional legacy duplicate recall should refund the duplicate stored token",
  );

  const activeMixedOwnerLegacyDuplicateRecallState = {
    ...legacyDuplicateSharedPosts,
    players: game.players.map((player) => {
      if (player.id === feyd.id) return { ...player, spies: 0 };
      if (player.id === "p3") return { ...player, spies: 0 };
      return player;
    }),
    spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id },
    sharedSpyPosts: { [arrakeen.id]: ["p3"], [spiceRefinery.id]: ["p3"] },
    pendingAction: legacyDuplicateTwoRecallPending,
    pendingQueue: [],
  };
  const normalizedMixedOwnerLegacyDuplicateRecallState = spies.normalizeSpyObservationPosts(activeMixedOwnerLegacyDuplicateRecallState);
  assert.equal(
    normalizedMixedOwnerLegacyDuplicateRecallState.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Mixed-owner legacy duplicate storage should still canonicalize the shared post",
  );
  assert.deepEqual(
    normalizedMixedOwnerLegacyDuplicateRecallState.sharedSpyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    [feyd.id, "p3"],
    "Only the active pending owner's duplicate recall credit should be preserved after mixed-owner normalization",
  );
  assert.equal(
    playerById(normalizedMixedOwnerLegacyDuplicateRecallState, "p3").spies,
    1,
    "Non-pending owners on a deferred shared post should still receive duplicate legacy refunds",
  );
  assert.equal(
    spies.spyPostRecallCountForOwner(normalizedMixedOwnerLegacyDuplicateRecallState, arrakeen.id, feyd.id),
    2,
    "The active pending owner should keep two recall credits on the canonical post",
  );
  assert.equal(
    spies.spyPostRecallCountForOwner(normalizedMixedOwnerLegacyDuplicateRecallState, arrakeen.id, "p3"),
    1,
    "A non-pending owner should be collapsed to one recall credit on the canonical post",
  );

  const conflictConversionPending = {
    kind: "conflict-vp-conversion",
    ownerId: feyd.id,
    source: "test",
    remaining: 1,
    vp: 1,
    cost: { kind: "recall-spies", count: 2, recalled: 0 },
  };
  const legacyDuplicateConflictState = spies.normalizeSpyObservationPosts({
    ...game,
    players: game.players.map((player) =>
      player.id === feyd.id ? { ...player, spies: 0, vp: 0 } : player
    ),
    spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id, carthag: feyd.id },
    sharedSpyPosts: {},
    pendingQueue: [],
  });
  assert.equal(
    state.canPayConflictVpConversion(legacyDuplicateConflictState, conflictConversionPending),
    true,
    "A normalized legacy duplicate plus a separate post should still satisfy a two-spy VP conversion",
  );
  assert.deepEqual(
    state.conflictVpConversionSpyChoices(legacyDuplicateConflictState, conflictConversionPending).map((space) => space.id),
    [arrakeen.id, "carthag"],
    "Conflict VP conversion choices should dedupe the shared legacy post and keep the separate post",
  );
  const conflictRecalledSharedPost = state.recallSpyForConflictVpConversion(
    legacyDuplicateConflictState,
    conflictConversionPending,
    arrakeen.id,
  );
  assert.equal(conflictRecalledSharedPost.pendingAction.cost.recalled, 1);
  assert.equal(
    playerById(conflictRecalledSharedPost, feyd.id).spies,
    2,
    "First conflict VP recall should keep the normalized duplicate refund and return the recalled shared post",
  );
  const conflictRecalledSeparatePost = state.recallSpyForConflictVpConversion(
    conflictRecalledSharedPost,
    conflictRecalledSharedPost.pendingAction,
    "carthag",
  );
  assert.equal(playerById(conflictRecalledSeparatePost, feyd.id).spies, 3);
  assert.equal(playerById(conflictRecalledSeparatePost, feyd.id).vp, 1);

  const activeLegacyDuplicateConflictState = {
    ...game,
    players: game.players.map((player) =>
      player.id === feyd.id ? { ...player, spies: 0, vp: 0 } : player
    ),
    spyPosts: { [arrakeen.id]: feyd.id, [spiceRefinery.id]: feyd.id },
    sharedSpyPosts: {},
    pendingAction: conflictConversionPending,
    pendingQueue: [],
  };
  const normalizedActiveLegacyDuplicateConflictState = spies.normalizeSpyObservationPosts(activeLegacyDuplicateConflictState);
  assert.equal(
    normalizedActiveLegacyDuplicateConflictState.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Normalization should canonicalize same-owner legacy duplicate storage while preserving active conflict VP recall credit",
  );
  assert.deepEqual(
    normalizedActiveLegacyDuplicateConflictState.sharedSpyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    [feyd.id],
    "Normalization should preserve the pending conflict VP owner's second recall credit as a canonical duplicate entry",
  );
  assert.deepEqual(
    state.conflictVpConversionSpyChoices(
      normalizedActiveLegacyDuplicateConflictState,
      conflictConversionPending,
    ).map((space) => space.id),
    [arrakeen.id],
    "A two-token unnormalized legacy shared post should satisfy a two-spy conflict VP conversion choice",
  );
  const completedLegacyDuplicateConflict = state.recallSpyForConflictVpConversion(
    normalizedActiveLegacyDuplicateConflictState,
    conflictConversionPending,
    arrakeen.id,
  );
  assert.equal(
    completedLegacyDuplicateConflict.pendingAction,
    undefined,
    "Recalling one unnormalized same-owner legacy shared post should complete a two-spy conflict VP conversion",
  );
  assert.equal(playerById(completedLegacyDuplicateConflict, feyd.id).spies, 2);
  assert.equal(playerById(completedLegacyDuplicateConflict, feyd.id).vp, 1);
  const activeTwoPostLegacyDuplicateConflictState = spies.normalizeSpyObservationPosts({
    ...game,
    players: game.players.map((player) =>
      player.id === feyd.id ? { ...player, spies: 0, vp: 0 } : player
    ),
    spyPosts: {
      [arrakeen.id]: feyd.id,
      [spiceRefinery.id]: feyd.id,
      [deliverSupplies.id]: feyd.id,
      [heighliner.id]: feyd.id,
    },
    sharedSpyPosts: {},
    pendingAction: conflictConversionPending,
    pendingQueue: [],
  });
  const completedOneOfTwoLegacyDuplicateConflicts = state.recallSpyForConflictVpConversion(
    activeTwoPostLegacyDuplicateConflictState,
    conflictConversionPending,
    arrakeen.id,
  );
  assert.equal(
    completedOneOfTwoLegacyDuplicateConflicts.pendingAction,
    undefined,
    "A completed legacy duplicate conflict conversion should clear the pending action",
  );
  assert.equal(
    completedOneOfTwoLegacyDuplicateConflicts.spyPosts[spies.spyObservationPostIdForSpace(heighliner.id)],
    feyd.id,
    "Successful conflict conversion cleanup should preserve the unselected shared post as one canonical physical spy",
  );
  assert.equal(
    completedOneOfTwoLegacyDuplicateConflicts.sharedSpyPosts[spies.spyObservationPostIdForSpace(heighliner.id)],
    undefined,
    "Successful conflict conversion cleanup should collapse duplicate credit on unselected shared posts after pending is satisfied",
  );
  assert.equal(playerById(completedOneOfTwoLegacyDuplicateConflicts, feyd.id).spies, 3);
  assert.equal(playerById(completedOneOfTwoLegacyDuplicateConflicts, feyd.id).vp, 1);
  const tripleCreditConflictPending = {
    ...conflictConversionPending,
    remaining: 2,
  };
  const tripleCreditConflictState = spies.normalizeSpyObservationPosts({
    ...game,
    players: game.players.map((player) =>
      player.id === feyd.id ? { ...player, spies: 0, vp: 0 } : player
    ),
    spyPosts: {
      [spies.spyObservationPostIdForSpace(arrakeen.id)]: feyd.id,
      [arrakeen.id]: feyd.id,
      [spiceRefinery.id]: feyd.id,
    },
    sharedSpyPosts: {},
    pendingAction: tripleCreditConflictPending,
    pendingQueue: [],
  });
  assert.equal(
    spies.spyPostRecallCountForOwner(tripleCreditConflictState, arrakeen.id, feyd.id),
    3,
    "Canonical plus legacy triple storage should preserve three recall credits while conversion is pending",
  );
  const tripleCreditConflictRecalled = state.recallSpyForConflictVpConversion(
    tripleCreditConflictState,
    tripleCreditConflictPending,
    arrakeen.id,
  );
  assert.equal(
    tripleCreditConflictRecalled.pendingAction.cost.recalled,
    0,
    "Surplus legacy conflict recall credit should not carry an unfinishable partial conversion",
  );
  assert.equal(tripleCreditConflictRecalled.pendingAction.remaining, 1);
  assert.equal(
    state.conflictVpConversionSpyChoices(tripleCreditConflictRecalled, tripleCreditConflictRecalled.pendingAction).length,
    0,
    "Triple-credit conversion should not expose choices after the only physical post was recalled",
  );
  assert.notEqual(
    state.skipConflictVpConversion(tripleCreditConflictRecalled, tripleCreditConflictRecalled.pendingAction),
    tripleCreditConflictRecalled,
    "Dropping unfinishable surplus partial credit should allow the remaining conversion to be skipped",
  );
  const skippedLegacyDuplicateConflict = state.skipConflictVpConversion(
    normalizedActiveLegacyDuplicateConflictState,
    conflictConversionPending,
  );
  assert.equal(
    skippedLegacyDuplicateConflict.pendingAction,
    undefined,
    "Skipping a legacy duplicate conflict VP conversion should advance the pending action",
  );
  assert.equal(
    skippedLegacyDuplicateConflict.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Skipping a legacy duplicate conflict VP conversion should leave one canonical physical post",
  );
  assert.equal(
    skippedLegacyDuplicateConflict.sharedSpyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    undefined,
    "Skipping a legacy duplicate conflict VP conversion should collapse the duplicate canonical recall credit",
  );
  assert.equal(
    playerById(skippedLegacyDuplicateConflict, feyd.id).spies,
    1,
    "Skipping a legacy duplicate conflict VP conversion should refund the duplicate stored token",
  );

  const sharedArrakeenPostState = {
    ...game,
    spyPosts: { [spies.spyObservationPostIdForSpace(arrakeen.id)]: feyd.id },
  };
  assert.equal(
    spies.playerHasSpyPost(sharedArrakeenPostState, arrakeen.id, feyd.id),
    true,
    "A spy on the shared Arrakeen / Spice Refinery post should observe Arrakeen",
  );
  assert.equal(
    spies.playerHasSpyPost(sharedArrakeenPostState, spiceRefinery.id, feyd.id),
    true,
    "A spy on the shared Arrakeen / Spice Refinery post should observe Spice Refinery",
  );
  assert.equal(
    spies.spyPostCount(sharedArrakeenPostState, feyd.id),
    1,
    "One shared physical observation post should count as one spy post",
  );
  assert.deepEqual(
    state.recallableSpySpaces(sharedArrakeenPostState, {
      kind: "recall-spy",
      ownerId: feyd.id,
      combatRecipientId: feyd.id,
      remaining: 1,
      strength: 0,
      source: "test",
      optional: false,
    }).map((space) => space.id),
    [arrakeen.id],
    "Shared observation posts should appear once in recall choices",
  );
  assert.equal(
    state.iconCanReach({ icons: ["spy"] }, spiceRefinery, feyd, false, sharedArrakeenPostState.spyPosts, game.players, {}),
    true,
    "A spy icon should reach every board space connected to the shared post",
  );
  assert.equal(
    state.iconCanReach({ icons: ["spy"] }, arrakeen, feyd, false, { [spiceRefinery.id]: feyd.id }, game.players, {}),
    true,
    "Legacy per-space spy keys should still observe the whole shared post",
  );
  assert.equal(
    spies.canPlaceSpyPost(sharedArrakeenPostState, spiceRefinery, shaddam),
    false,
    "Occupying a shared physical post through Arrakeen should block placement through Spice Refinery",
  );

  const sharedSpacingPostState = {
    ...game,
    spyPosts: { [spies.spyObservationPostIdForSpace(heighliner.id)]: feyd.id },
  };
  assert.equal(
    spies.playerHasSpyPost(sharedSpacingPostState, deliverSupplies.id, feyd.id),
    true,
    "A spy on the shared Deliver Supplies / Heighliner post should observe Deliver Supplies",
  );
  assert.equal(
    spies.playerHasSpyPost(sharedSpacingPostState, heighliner.id, feyd.id),
    true,
    "A spy on the shared Deliver Supplies / Heighliner post should observe Heighliner",
  );

  assert.equal(spies.canPlaceSpyPost(game, arrakeen, feyd), true);
  assert.equal(
    spies.canPlaceSpyPost({ ...game, spyPosts: { [arrakeen.id]: "p3" } }, arrakeen, feyd),
    false,
    "Normal spy placement should reject occupied posts",
  );
  assert.equal(
    spies.canPlaceSpyPost({ ...game, swordmasterClaimed: true }, swordmaster, feyd),
    true,
    "Swordmaster observation post should stay usable because the space remains available to unclaimed players",
  );

  assert.equal(spies.canPlaceSpyPost(game, vastWealth, shaddam), true, "Shaddam Commander can use Shaddam personal spaces");
  assert.equal(spies.canPlaceSpyPost(game, vastWealth, feyd), false, "Allies cannot use Commander personal spaces");
  assert.equal(spies.canPlaceSpyPost(game, vastWealth, muaddib), false, "Opposing Commanders cannot use personal spaces");

  const occupiedArrakeen = { ...game, spyPosts: { [arrakeen.id]: "p3" } };
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedArrakeen, arrakeen, feyd),
    true,
    "Shared spy placement should allow joining another player's occupied post",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedArrakeen, arrakeen, { ...feyd, id: "p3" }),
    false,
    "Shared spy placement should reject owners already on that post",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(game, arrakeen, feyd),
    false,
    "Shared spy placement should require another player's existing spy",
  );

  const citySpyPending = {
    kind: "spy",
    ownerId: feyd.id,
    remaining: 1,
    source: "test",
    placementIcon: "city",
  };
  const citySpyChoices = state.placeableSpySpaces(game, citySpyPending).map((space) => space.id);
  assert.equal(
    citySpyChoices.filter((spaceId) => spaceId === arrakeen.id || spaceId === spiceRefinery.id).length,
    1,
    "Shared Arrakeen / Spice Refinery post should appear once in spy placement choices",
  );
  const placedOnSpiceRefinery = state.placeSpyForPending(
    {
      ...game,
      pendingAction: citySpyPending,
      pendingQueue: [],
      players: game.players.map((player) =>
        player.id === feyd.id ? { ...player, spies: 1 } : player
      ),
    },
    citySpyPending,
    spiceRefinery.id,
  );
  assert.equal(
    placedOnSpiceRefinery.spyPosts[spies.spyObservationPostIdForSpace(spiceRefinery.id)],
    feyd.id,
    "Placing through Spice Refinery should store the canonical shared post id",
  );
  assert.equal(
    placedOnSpiceRefinery.spyPosts[spiceRefinery.id],
    undefined,
    "New shared-post placements should not store the representative board-space id",
  );
  assert.equal(
    spies.playerHasSpyPost(placedOnSpiceRefinery, arrakeen.id, feyd.id),
    true,
    "A spy placed through Spice Refinery should also observe Arrakeen",
  );
  assert.match(
    placedOnSpiceRefinery.log[0],
    /Arrakeen \/ Spice Refinery/,
    "Shared-post placement logs should name every observed space",
  );

  console.log("spy post verification passed");
} finally {
  await server.close();
}
