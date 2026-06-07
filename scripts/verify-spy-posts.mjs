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
    state.removeSpyPostOwnerFromObservedSpace,
    spies.removeSpyPostOwnerFromObservedSpace,
    "state.ts should preserve the public removeSpyPostOwnerFromObservedSpace export",
  );
  assert.equal(
    state.spyPostRecallCountForOwner,
    spies.spyPostRecallCountForOwner,
    "state.ts should preserve the public spyPostRecallCountForOwner export",
  );
  assert.equal(
    state.spyObservationPostChoiceSpaces,
    spies.spyObservationPostChoiceSpaces,
    "state.ts should preserve the public spyObservationPostChoiceSpaces export",
  );
  assert.equal(
    state.spyObservationPostOwnerIds,
    spies.spyObservationPostOwnerIds,
    "state.ts should preserve the public spyObservationPostOwnerIds export",
  );

  const game = state.initialGame();
  const feyd = playerById(game, "p2");
  const shaddam = playerById(game, "p4");
  const muaddib = playerById(game, "p1");
  const highCouncil = spaceById(data, "high-council");
  const imperialPrivilege = spaceById(data, "imperial-privilege");
  const assemblyHall = spaceById(data, "assembly-hall");
  const gatherSupport = spaceById(data, "gather-support");
  const shipping = spaceById(data, "shipping");
  const acceptContract = spaceById(data, "accept-contract");
  const militarySupport = spaceById(data, "military-support");
  const economicSupport = spaceById(data, "economic-support");
  const espionage = spaceById(data, "espionage");
  const secrets = spaceById(data, "secrets");
  const controversialTech = spaceById(data, "controversial-tech");
  const expedition = spaceById(data, "expedition");
  const sietchTabr = spaceById(data, "sietch-tabr");
  const arrakeen = spaceById(data, "arrakeen");
  const carthag = spaceById(data, "carthag");
  const researchStation = spaceById(data, "research-station");
  const spiceRefinery = spaceById(data, "spice-refinery");
  const deliverSupplies = spaceById(data, "deliver-supplies");
  const heighliner = spaceById(data, "heighliner");
  const swordmaster = spaceById(data, "swordmaster");
  const imperialBasin = spaceById(data, "imperial-basin");
  const habbanyaErg = spaceById(data, "habbanya-erg");
  const haggaBasin = spaceById(data, "hagga-basin");
  const deepDesert = spaceById(data, "deep-desert");
  const hardyWarriors = spaceById(data, "hardy-warriors");
  const desertMastery = spaceById(data, "desert-mastery");
  const vastWealth = spaceById(data, "vast-wealth");
  const sardaukar = spaceById(data, "sardaukar");

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
  const observationPostExpectations = [
    {
      space: highCouncil,
      postId: "high-council-imperial-privilege-swordmaster",
      spaceIds: [highCouncil.id, imperialPrivilege.id, swordmaster.id],
      label: "High Council / Imperial Privilege / Swordmaster",
    },
    {
      space: assemblyHall,
      postId: "assembly-hall-gather-support",
      spaceIds: [assemblyHall.id, gatherSupport.id],
      label: "Assembly Hall / Gather Support",
    },
    {
      space: shipping,
      postId: "shipping-accept-contract",
      spaceIds: [shipping.id, acceptContract.id],
      label: "Shipping / Accept Contract",
    },
    {
      space: militarySupport,
      postId: "military-support-economic-support",
      spaceIds: [militarySupport.id, economicSupport.id],
      label: "Military Support / Economic Support",
    },
    {
      space: espionage,
      postId: "espionage-secrets",
      spaceIds: [espionage.id, secrets.id],
      label: "Espionage / Secrets",
    },
    {
      space: controversialTech,
      postId: "controversial-tech-expedition",
      spaceIds: [controversialTech.id, expedition.id],
      label: "Controversial Technology / Expedition",
    },
    {
      space: sietchTabr,
      postId: "sietch-tabr-research-station",
      spaceIds: [sietchTabr.id, researchStation.id],
      label: "Sietch Tabr / Research Station",
    },
    {
      space: researchStation,
      postId: "research-station-spice-refinery",
      spaceIds: [researchStation.id, spiceRefinery.id],
      label: "Research Station / Spice Refinery",
    },
    { space: carthag, postId: "carthag", spaceIds: [carthag.id], label: "Carthag" },
    { space: deepDesert, postId: "deep-desert", spaceIds: [deepDesert.id], label: "Deep Desert" },
    { space: habbanyaErg, postId: "habbanya-erg", spaceIds: [habbanyaErg.id], label: "Habbanya Erg" },
    { space: haggaBasin, postId: "hagga-basin", spaceIds: [haggaBasin.id], label: "Hagga Basin" },
    { space: imperialBasin, postId: "imperial-basin", spaceIds: [imperialBasin.id], label: "Imperial Basin" },
    { space: hardyWarriors, postId: "hardy-warriors", spaceIds: [hardyWarriors.id], label: "Hardy Warriors" },
    { space: desertMastery, postId: "desert-mastery", spaceIds: [desertMastery.id], label: "Desert Mastery" },
    { space: vastWealth, postId: "vast-wealth", spaceIds: [vastWealth.id], label: "Vast Wealth" },
    { space: sardaukar, postId: "sardaukar", spaceIds: [sardaukar.id], label: "Sardaukar" },
  ];
  for (const expected of observationPostExpectations) {
    assert.equal(
      spies.spyObservationPostIdForSpace(expected.space.id),
      expected.postId,
      `${expected.space.name} should use the expected physical observation post`,
    );
    assert.deepEqual(
      spies.spyObservationPostSpaceIdsForSpace(expected.space.id),
      expected.spaceIds,
      `${expected.space.name} should observe the expected board spaces`,
    );
    assert.equal(
      spies.spyObservationPostLabelForSpace(expected.space.id),
      expected.label,
      `${expected.space.name} should render the expected spy-post label`,
    );
  }
  const observationChoiceSpaceIds = state.spyObservationPostChoiceSpaces().map((space) => space.id);
  assert.deepEqual(
    observationPostExpectations
      .map((expected) => expected.space.id)
      .filter((spaceId) => !observationChoiceSpaceIds.includes(spaceId)),
    [],
    "Every physical observation post should expose its representative board space as a choice",
  );
  assert.equal(
    observationChoiceSpaceIds.includes(spiceRefinery.id),
    false,
    "Spice Refinery should stay folded under Arrakeen for default physical-post choices",
  );
  assert.equal(
    observationChoiceSpaceIds.includes(imperialPrivilege.id),
    false,
    "Non-representative observed board spaces should not appear as separate spy-post choices",
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
  const removedObservedResearchSpy = spies.removeSpyPostOwnerFromObservedSpace({
    spyPosts: { "sietch-tabr-research-station": feyd.id },
    sharedSpyPosts: {},
  }, researchStation.id, feyd.id);
  assert.equal(
    removedObservedResearchSpy.removedSpyCount,
    1,
    "Removing a spy from an observed split location should find any owned observing edge",
  );
  assert.equal(
    removedObservedResearchSpy.recalledSpaceId,
    sietchTabr.id,
    "Observed-space removal should report the representative space for the recalled edge",
  );
  assert.deepEqual(removedObservedResearchSpy.spyPosts, {});

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
  const hiddenRecallPending = {
    kind: "recall-spy",
    ownerId: feyd.id,
    combatRecipientId: feyd.id,
    remaining: 1,
    strength: 0,
    source: "test",
    optional: false,
  };
  assert.equal(
    state.recallSpyForPending(
      {
        ...sharedArrakeenPostState,
        pendingAction: hiddenRecallPending,
        pendingQueue: [],
      },
      hiddenRecallPending,
      spiceRefinery.id,
    ).spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Pending spy recall should reject folded non-choice board-space ids",
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

  const sietchPostId = spies.spyObservationPostIdForSpace(sietchTabr.id);
  const researchPostId = spies.spyObservationPostIdForSpace(researchStation.id);
  const arrakeenPostId = spies.spyObservationPostIdForSpace(arrakeen.id);
  const overlappingResearchState = {
    ...game,
    spyPosts: {
      [sietchPostId]: feyd.id,
      [researchPostId]: shaddam.id,
      [arrakeenPostId]: "p3",
    },
    sharedSpyPosts: {},
  };
  assert.equal(
    spies.playerHasSpyPost(overlappingResearchState, researchStation.id, feyd.id),
    true,
    "A spy near Sietch Tabr should observe Research Station",
  );
  assert.equal(
    spies.playerHasSpyPost(overlappingResearchState, researchStation.id, shaddam.id),
    true,
    "A spy near Research Station should observe Research Station",
  );
  assert.deepEqual(
    spies.spyPostOwnerIds(overlappingResearchState, researchStation.id),
    [feyd.id, shaddam.id],
    "Research Station should collect owners from both physical posts that observe it",
  );
  assert.deepEqual(
    spies.spyPostOwnerIds(overlappingResearchState, spiceRefinery.id),
    ["p3", shaddam.id],
    "Spice Refinery should collect owners from Arrakeen / Spice Refinery and Research Station / Spice Refinery",
  );
  assert.deepEqual(
    spies.spyObservationPostOwnerIds(overlappingResearchState, sietchTabr.id),
    [feyd.id],
    "Sietch Tabr should report only the chosen Sietch Tabr / Research Station physical post owners",
  );
  assert.deepEqual(
    spies.spyObservationPostOwnerIds(overlappingResearchState, researchStation.id),
    [shaddam.id],
    "Research Station should report only the chosen Research Station / Spice Refinery physical post owners",
  );
  assert.deepEqual(
    spies.spyObservationPostOwnerIds(overlappingResearchState, spiceRefinery.id),
    ["p3"],
    "Spice Refinery should default to the chosen Arrakeen / Spice Refinery physical post owners",
  );

  const occupiedSietchOnly = {
    ...game,
    spyPosts: { [sietchPostId]: feyd.id },
    sharedSpyPosts: {},
  };
  assert.equal(
    spies.canPlaceSpyPost(occupiedSietchOnly, researchStation, shaddam),
    true,
    "An occupied Sietch Tabr / Research Station post should not block the separate Research Station / Spice Refinery post",
  );
  assert.equal(
    spies.canPlaceSpyPost(occupiedSietchOnly, sietchTabr, shaddam),
    false,
    "The occupied Sietch Tabr / Research Station physical post should block normal placement through Sietch Tabr",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedSietchOnly, researchStation, shaddam),
    false,
    "Shared placement should not treat a different physical post observing Research Station as shareable",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedSietchOnly, sietchTabr, shaddam),
    true,
    "Shared placement should allow joining the occupied selected physical post",
  );
  assert.deepEqual(
    state.recallableSpySpaces(occupiedSietchOnly, {
      kind: "recall-spy",
      ownerId: feyd.id,
      combatRecipientId: feyd.id,
      remaining: 1,
      strength: 0,
      source: "test",
      optional: false,
    }).map((space) => space.id),
    [sietchTabr.id],
    "Recall choices should expose the representative of the owned physical post",
  );

  const occupiedArrakeenOnly = {
    ...game,
    spyPosts: { [arrakeenPostId]: feyd.id },
    sharedSpyPosts: {},
  };
  assert.equal(
    spies.canPlaceSpyPost(occupiedArrakeenOnly, spiceRefinery, shaddam),
    false,
    "Occupying Arrakeen / Spice Refinery should block placement through Spice Refinery's default physical post",
  );
  assert.equal(
    spies.canPlaceSpyPost(occupiedArrakeenOnly, researchStation, shaddam),
    true,
    "Occupying Arrakeen / Spice Refinery should not block the separate Research Station / Spice Refinery post",
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
  assert.deepEqual(
    citySpyChoices.filter((spaceId) =>
      [arrakeen.id, sietchTabr.id, carthag.id, researchStation.id, spiceRefinery.id].includes(spaceId)
    ),
    [sietchTabr.id, arrakeen.id, carthag.id, researchStation.id],
    "City spy placement choices should expose each physical city post representative once",
  );
  assert.equal(
    citySpyChoices.filter((spaceId) => spaceId === arrakeen.id || spaceId === spiceRefinery.id).length,
    1,
    "Shared Arrakeen / Spice Refinery post should appear once in spy placement choices",
  );
  const pendingCitySpyState = {
    ...game,
    pendingAction: citySpyPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === feyd.id ? { ...player, spies: 1 } : player
    ),
  };
  assert.equal(
    state.placeSpyForPending(
      pendingCitySpyState,
      citySpyPending,
      spiceRefinery.id,
    ),
    pendingCitySpyState,
    "Pending spy placement should reject folded non-choice board-space ids",
  );
  const placedOnArrakeenPost = state.placeSpyForPending(
    pendingCitySpyState,
    citySpyPending,
    arrakeen.id,
  );
  assert.equal(
    placedOnArrakeenPost.spyPosts[spies.spyObservationPostIdForSpace(arrakeen.id)],
    feyd.id,
    "Placing through the Arrakeen representative should store the canonical shared post id",
  );
  assert.equal(
    placedOnArrakeenPost.spyPosts[arrakeen.id],
    undefined,
    "New shared-post placements should not store the representative board-space id",
  );
  assert.equal(
    spies.playerHasSpyPost(placedOnArrakeenPost, spiceRefinery.id, feyd.id),
    true,
    "A spy placed through Arrakeen should also observe Spice Refinery",
  );
  assert.match(
    placedOnArrakeenPost.log[0],
    /Arrakeen \/ Spice Refinery/,
    "Shared-post placement logs should name every observed space",
  );

  console.log("spy post verification passed");
} finally {
  await server.close();
}
