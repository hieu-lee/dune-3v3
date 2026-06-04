import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifyDistractionPlotIntrigue({ cards, data, game, state }) {
  const { distraction, mercenaries } = cards;

  const spyChoiceSpaces = state.spyObservationPostChoiceSpaces();
  const distractionSpySpace = spyChoiceSpaces.find((space) => !space.personal);
  const distractionOwnSpySpace = spyChoiceSpaces.find((space) => !space.personal && space.id !== distractionSpySpace?.id);
  const personalSpySpace = data.boardSpaces.find((space) => space.personal);
  const swordmasterSpace = data.boardSpaces.find((space) => space.id === "swordmaster");
  assert.ok(distractionSpySpace && distractionOwnSpySpace && personalSpySpace && swordmasterSpace, "Expected spy post fixtures for Distraction");
  const distractionPostId = state.spyObservationPostIdForSpace(distractionSpySpace.id);
  const distractionOwnPostId = state.spyObservationPostIdForSpace(distractionOwnSpySpace.id);
  const spyIconCard = data.imperiumDeck.find((card) => card.icons.includes("spy"));
  assert.ok(spyIconCard, "Distraction verifier needs a card with a spy Agent icon");
  const distractionFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    turnUnitDeployments: { p2: 3 },
    spyPosts: { [distractionPostId]: "p3" },
    sharedSpyPosts: {},
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, spies: 1, intrigues: [distraction] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(state.isDistractionIntrigue(distraction), true, "Distraction should be recognized as a structured Plot Intrigue");
  assert.equal(
    state.hasDeployedThreeOrMoreUnitsThisTurn(distractionFixture, "p2"),
    true,
    "Distraction should detect three-unit turns",
  );
  assert.equal(
    state.canPlayDistractionPlotIntrigue(distractionFixture, playerById(distractionFixture, "p2")),
    true,
    "Distraction should be playable with a three-unit turn, a spy in supply, and another player's spy post",
  );
  const distractionPlayed = state.playDistractionPlotIntrigue(distractionFixture, "p2", distraction.id);
  assert.deepEqual(distractionPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Distraction",
    recallForSupply: true,
    allowSharedPost: true,
  });
  assert.equal(distractionPlayed.intrigueDiscard.at(-1).id, distraction.id);
  assert.deepEqual(playerById(distractionPlayed, "p2").intrigues, []);
  assert.deepEqual(
    state.placeableSpySpaces(distractionPlayed, distractionPlayed.pendingAction).map((space) => space.id),
    [distractionSpySpace.id],
    "Distraction should only offer posts occupied by another player's spy and not by the actor",
  );
  assert.equal(
    state.placeSpyForPending(
      distractionPlayed,
      { kind: "spy", ownerId: "p2", remaining: 1, source: "Normal Spy" },
      distractionSpySpace.id,
    ),
    distractionPlayed,
    "Normal spy placement should still reject occupied observation posts",
  );
  const distractionPlaced = state.placeSpyForPending(distractionPlayed, distractionPlayed.pendingAction, distractionSpySpace.id);
  assert.equal(playerById(distractionPlaced, "p2").spies, 0, "Distraction should spend one spy from supply");
  assert.equal(distractionPlaced.spyPosts[distractionPostId], "p3", "Distraction should preserve the original spy owner");
  assert.deepEqual(distractionPlaced.sharedSpyPosts[distractionPostId], ["p2"]);
  assert.deepEqual(
    state.spyPostOwnerIds(distractionPlaced, distractionSpySpace.id).sort(),
    ["p2", "p3"],
    "Distraction should expose both spies on the same post",
  );
  assert.equal(state.spyPostCount(distractionPlaced, "p2"), 1, "Shared Distraction spies should count as the actor's spy posts");
  assert.equal(
    state.iconCanReach(
      spyIconCard,
      distractionSpySpace,
      playerById(distractionPlaced, "p2"),
      distractionPlaced.swordmasterClaimed,
      distractionPlaced.spyPosts,
      distractionPlaced.players,
      distractionPlaced.sharedSpyPosts,
    ),
    true,
    "Shared Distraction spies should satisfy Spy Agent-icon reach",
  );
  const distractionRecall = {
    ...distractionPlaced,
    pendingAction: { kind: "recall-spy", ownerId: "p2", combatRecipientId: "p2", remaining: 1, strength: 0, source: "Test", optional: true },
  };
  const distractionRecalled = state.recallSpyForPending(distractionRecall, distractionRecall.pendingAction, distractionSpySpace.id);
  assert.equal(distractionRecalled.spyPosts[distractionPostId], "p3", "Recalling the shared spy should preserve the original spy");
  assert.equal(distractionRecalled.sharedSpyPosts[distractionPostId], undefined);
  assert.equal(playerById(distractionRecalled, "p2").spies, 1, "Recalling the shared spy should return it to supply");
  const primaryRecall = {
    ...distractionPlaced,
    players: distractionPlaced.players.map((candidate) => candidate.id === "p3" ? { ...candidate, spies: 2 } : candidate),
    pendingAction: { kind: "recall-spy", ownerId: "p3", combatRecipientId: "p3", remaining: 1, strength: 0, source: "Test", optional: true },
  };
  const primaryRecalled = state.recallSpyForPending(primaryRecall, primaryRecall.pendingAction, distractionSpySpace.id);
  assert.equal(primaryRecalled.spyPosts[distractionPostId], undefined, "Recalling the original spy should clear the primary post owner");
  assert.deepEqual(primaryRecalled.sharedSpyPosts[distractionPostId], ["p2"], "Recalling the original spy should preserve the shared spy");
  assert.equal(playerById(primaryRecalled, "p3").spies, 3);
  const distractionNeedsDeployments = { ...distractionFixture, turnUnitDeployments: { p2: 2 } };
  assert.equal(
    state.playDistractionPlotIntrigue(distractionNeedsDeployments, "p2", distraction.id),
    distractionNeedsDeployments,
    "Distraction should require three or more units deployed this turn",
  );
  const distractionNoOtherSpy = { ...distractionFixture, spyPosts: {}, sharedSpyPosts: {} };
  assert.equal(
    state.canPlayDistractionPlotIntrigue(distractionNoOtherSpy, playerById(distractionNoOtherSpy, "p2")),
    false,
    "Distraction should require another player's spy post",
  );
  const distractionOwnOnly = { ...distractionFixture, spyPosts: { [distractionPostId]: "p2" }, sharedSpyPosts: {} };
  assert.equal(
    state.canPlayDistractionPlotIntrigue(distractionOwnOnly, playerById(distractionOwnOnly, "p2")),
    false,
    "Distraction should not place onto an actor-only spy post",
  );
  const personalOnlyDistraction = { ...distractionFixture, spyPosts: { [personalSpySpace.id]: "p4" }, sharedSpyPosts: {} };
  assert.equal(
    state.canPlayDistractionPlotIntrigue(personalOnlyDistraction, playerById(personalOnlyDistraction, "p2")),
    false,
    "Distraction should not bypass Commander personal-board spy post restrictions",
  );
  const claimedSwordmasterDistraction = {
    ...distractionFixture,
    swordmasterClaimed: true,
    spyPosts: { [swordmasterSpace.id]: "p3" },
    sharedSpyPosts: {},
  };
  assert.equal(
    state.canPlayDistractionPlotIntrigue(claimedSwordmasterDistraction, playerById(claimedSwordmasterDistraction, "p2")),
    true,
    "Distraction should still place onto Swordmaster after another player claims Swordmaster",
  );
  const noSupplyDistraction = {
    ...distractionFixture,
    spyPosts: {
      [distractionPostId]: "p3",
      [distractionOwnPostId]: "p2",
    },
    players: distractionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, spies: 0, intrigues: [distraction] } : candidate,
    ),
  };
  const noSupplyPlayed = state.playDistractionPlotIntrigue(noSupplyDistraction, "p2", distraction.id);
  assert.deepEqual(
    state.recallableSpySupplySpaces(noSupplyPlayed, noSupplyPlayed.pendingAction).map((space) => space.id),
    [distractionOwnSpySpace.id],
    "Distraction should allow recalling an owned spy for supply before shared placement",
  );
  const distractionNoSupplyRecalled = state.recallSpyForSupplyForPending(noSupplyPlayed, noSupplyPlayed.pendingAction, distractionOwnSpySpace.id);
  assert.deepEqual(distractionNoSupplyRecalled.pendingAction, {
    ...noSupplyPlayed.pendingAction,
    recallForSupply: false,
    mustPlaceSpy: true,
  });
  const distractionNoSupplyPlaced = state.placeSpyForPending(
    distractionNoSupplyRecalled,
    distractionNoSupplyRecalled.pendingAction,
    distractionSpySpace.id,
  );
  assert.deepEqual(distractionNoSupplyPlaced.sharedSpyPosts[distractionPostId], ["p2"]);
  const pendingDistraction = {
    ...distractionFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playDistractionPlotIntrigue(pendingDistraction, "p2", distraction.id),
    pendingDistraction,
    "Distraction should wait for pending actions to resolve",
  );
  const queuedDistraction = {
    ...distractionFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playDistractionPlotIntrigue(queuedDistraction, "p2", distraction.id),
    queuedDistraction,
    "Distraction should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playDistractionPlotIntrigue(distractionFixture, "p3", distraction.id),
    distractionFixture,
    "Only the active player should play Distraction",
  );
  assert.equal(
    state.playDistractionPlotIntrigue(distractionFixture, "p2", mercenaries.id),
    distractionFixture,
    "Distraction should reject other Intrigue cards",
  );
  const deployTrackingFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: { kind: "deploy", ownerId: "p2", remaining: 3, source: "Test" },
    pendingQueue: [],
    turnUnitDeployments: {},
    players: game.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, garrison: 3, conflict: 0, deployedTroops: 0 } : candidate,
    ),
  };
  const firstDeployment = state.deployTroopToConflict(deployTrackingFixture, deployTrackingFixture.pendingAction);
  const secondDeployment = state.deployTroopToConflict(firstDeployment, firstDeployment.pendingAction);
  const thirdDeployment = state.deployTroopToConflict(secondDeployment, secondDeployment.pendingAction);
  assert.equal(state.hasDeployedThreeOrMoreUnitsThisTurn(firstDeployment, "p2"), false);
  assert.equal(state.hasDeployedThreeOrMoreUnitsThisTurn(thirdDeployment, "p2"), true);
}
