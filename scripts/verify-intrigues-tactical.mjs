import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifySpecialMissionPlotIntrigue({ cards, data, game, state }) {
  const { mercenaries, specialMission } = cards;

  const spyChoiceSpaces = state.spyObservationPostChoiceSpaces();
  const citySpySpaces = spyChoiceSpaces.filter((space) => space.icon === "city");
  const citySpySpace = citySpySpaces[0];
  const secondCitySpySpace = citySpySpaces[1];
  const nonCitySpySpace = spyChoiceSpaces.find((space) => space.icon !== "city" && !space.personal);
  assert.ok(citySpySpace && secondCitySpySpace && nonCitySpySpace, "Expected City and non-City spy post fixtures");
  const nonCitySpyPostId = state.spyObservationPostIdForSpace(nonCitySpySpace.id);
  const specialMissionFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    shieldWall: true,
    spyPosts: {},
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            spies: 1,
            resources: { ...candidate.resources, spice: 0 },
            intrigues: [specialMission],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isSpecialMissionIntrigue(specialMission),
    true,
    "Special Mission should be recognized as a structured Plot Intrigue",
  );
  assert.ok(
    state.specialMissionCitySpySpaces(specialMissionFixture, playerById(specialMissionFixture, "p2"))
      .every((space) => space.icon === "city"),
    "Special Mission should restrict its spy placement branch to City posts",
  );
  const specialMissionSpyPending = state.playSpecialMissionPlotIntrigue(
    specialMissionFixture,
    "p2",
    specialMission.id,
    { kind: "place-spy" },
  );
  assert.deepEqual(specialMissionSpyPending.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Special Mission",
    placementIcon: "city",
    recallForSupply: true,
    mustPlaceSpy: true,
  });
  assert.equal(
    state.finishPendingAction(specialMissionSpyPending),
    specialMissionSpyPending,
    "Special Mission should not allow skipping mandatory City spy placement",
  );
  assert.deepEqual(playerById(specialMissionSpyPending, "p2").intrigues, []);
  assert.equal(specialMissionSpyPending.intrigueDiscard.at(-1).id, specialMission.id);
  assert.match(specialMissionSpyPending.log[0], /plays Special Mission and may place a spy on a City observation post/);
  assert.ok(
    state.placeableSpySpaces(specialMissionSpyPending, specialMissionSpyPending.pendingAction)
      .every((space) => space.icon === "city"),
    "Special Mission pending spy placement should offer only City posts",
  );
  assert.equal(
    state.placeSpyForPending(specialMissionSpyPending, specialMissionSpyPending.pendingAction, nonCitySpySpace.id),
    specialMissionSpyPending,
    "Special Mission should reject non-City spy posts",
  );
  const specialMissionSpyPlaced = state.placeSpyForPending(
    specialMissionSpyPending,
    specialMissionSpyPending.pendingAction,
    citySpySpace.id,
  );
  assert.equal(playerById(specialMissionSpyPlaced, "p2").spies, 0, "Special Mission should spend the actor's spy");
  assert.equal(
    specialMissionSpyPlaced.spyPosts[state.spyObservationPostIdForSpace(citySpySpace.id)],
    "p2",
    "Special Mission should place the actor's spy on the chosen City post",
  );
  assert.equal(specialMissionSpyPlaced.pendingAction, undefined);
  assert.match(specialMissionSpyPlaced.log[0], /places a spy near .* from Special Mission/);

  const specialMissionRecallFixture = {
    ...specialMissionFixture,
    spyPosts: { [nonCitySpyPostId]: "p2" },
    players: specialMissionFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, spies: 2, resources: { ...candidate.resources, spice: 1 }, intrigues: [specialMission] }
        : candidate,
    ),
  };
  const specialMissionRecalled = state.playSpecialMissionPlotIntrigue(
    specialMissionRecallFixture,
    "p2",
    specialMission.id,
    { kind: "recall-spy", spaceId: nonCitySpySpace.id },
  );
  assert.equal(specialMissionRecalled.spyPosts[nonCitySpyPostId], undefined, "Special Mission should recall the chosen spy");
  assert.equal(playerById(specialMissionRecalled, "p2").spies, 3, "Special Mission should return the recalled spy to supply");
  assert.equal(playerById(specialMissionRecalled, "p2").resources.spice, 3, "Special Mission should gain 2 spice");
  assert.equal(specialMissionRecalled.shieldWall, false, "Special Mission should remove the Shield Wall");
  assert.deepEqual(playerById(specialMissionRecalled, "p2").intrigues, []);
  assert.equal(specialMissionRecalled.intrigueDiscard.at(-1).id, specialMission.id);
  assert.match(specialMissionRecalled.log[0], /plays Special Mission, recalls a spy from .* removes the Shield Wall, and gains 2 spice/);
  const specialMissionNoWall = state.playSpecialMissionPlotIntrigue(
    { ...specialMissionRecallFixture, shieldWall: false },
    "p2",
    specialMission.id,
    { kind: "recall-spy", spaceId: nonCitySpySpace.id },
  );
  assert.equal(playerById(specialMissionNoWall, "p2").resources.spice, 3, "Special Mission recall should still gain spice after the Shield Wall is gone");
  assert.match(specialMissionNoWall.log[0], /recalls a spy from .* and gains 2 spice/);

  const noSupplySpecialMission = {
    ...specialMissionFixture,
    spyPosts: { [nonCitySpyPostId]: "p2" },
    players: specialMissionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, spies: 0, intrigues: [specialMission] } : candidate,
    ),
  };
  const noSupplyPending = state.playSpecialMissionPlotIntrigue(
    noSupplySpecialMission,
    "p2",
    specialMission.id,
    { kind: "place-spy" },
  );
  assert.deepEqual(
    state.recallableSpySupplySpaces(noSupplyPending, noSupplyPending.pendingAction).map((space) => space.id),
    [nonCitySpySpace.id],
    "Special Mission should allow recalling an actor spy for supply before placing",
  );
  const noSupplyRecalled = state.recallSpyForSupplyForPending(
    noSupplyPending,
    noSupplyPending.pendingAction,
    nonCitySpySpace.id,
  );
  assert.equal(playerById(noSupplyRecalled, "p2").spies, 1, "Special Mission supply recall should return one spy");
  assert.equal(noSupplyRecalled.spyPosts[nonCitySpyPostId], undefined);
  assert.equal(
    state.finishPendingAction(noSupplyRecalled),
    noSupplyRecalled,
    "Special Mission should not allow skipping after recalling a spy for placement supply",
  );
  const noSupplyPlaced = state.placeSpyForPending(noSupplyRecalled, noSupplyRecalled.pendingAction, citySpySpace.id);
  assert.equal(playerById(noSupplyPlaced, "p2").spies, 0);
  assert.equal(noSupplyPlaced.spyPosts[state.spyObservationPostIdForSpace(citySpySpace.id)], "p2");

  const occupiedCitySpecialMission = {
    ...specialMissionFixture,
    spyPosts: Object.fromEntries(citySpySpaces.map((space) => [space.id, "p3"])),
    players: specialMissionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, spies: 1, intrigues: [specialMission] } : candidate,
    ),
  };
  assert.equal(
    state.playSpecialMissionPlotIntrigue(occupiedCitySpecialMission, "p2", specialMission.id, { kind: "place-spy" }),
    occupiedCitySpecialMission,
    "Special Mission should require an open City spy post or a recallable own City spy",
  );
  const sharedCitySupplyTrap = {
    ...specialMissionFixture,
    spyPosts: Object.fromEntries(citySpySpaces.map((space) => [space.id, "p3"])),
    sharedSpyPosts: { [citySpySpace.id]: ["p2"] },
    players: specialMissionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, spies: 0, intrigues: [specialMission] } : candidate,
    ),
  };
  const sharedCitySupplyPending = {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Special Mission",
    placementIcon: "city",
    recallForSupply: true,
    mustPlaceSpy: true,
  };
  assert.equal(
    state.canPlaySpecialMissionPlaceSpy(sharedCitySupplyTrap, playerById(sharedCitySupplyTrap, "p2")),
    false,
    "Special Mission should not start a mandatory placement when recalling a shared City spy leaves no open City post",
  );
  assert.deepEqual(
    state.recallableSpySupplySpaces(sharedCitySupplyTrap, sharedCitySupplyPending),
    [],
    "Special Mission should not offer recall-for-supply choices that cannot produce a legal City placement",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(sharedCitySupplyTrap, "p2", specialMission.id, { kind: "place-spy" }),
    sharedCitySupplyTrap,
    "Special Mission should avoid shared-spy recall traps that would strand a mandatory pending action",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(specialMissionFixture, "p2", specialMission.id, { kind: "recall-spy", spaceId: nonCitySpySpace.id }),
    specialMissionFixture,
    "Special Mission recall branch should require an actor-owned spy post",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(specialMissionRecallFixture, "p2", specialMission.id, { kind: "recall-spy", spaceId: citySpySpace.id }),
    specialMissionRecallFixture,
    "Special Mission should reject recalling another or absent spy post",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(specialMissionFixture, "p2", mercenaries.id, { kind: "place-spy" }),
    specialMissionFixture,
    "Special Mission should reject other Intrigue cards",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(specialMissionFixture, "p2", specialMission.id, { kind: "unknown" }),
    specialMissionFixture,
    "Special Mission should reject unknown choice kinds",
  );
  const pendingSpecialMission = {
    ...specialMissionFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playSpecialMissionPlotIntrigue(pendingSpecialMission, "p2", specialMission.id, { kind: "place-spy" }),
    pendingSpecialMission,
    "Special Mission should wait for pending actions to resolve",
  );
  const queuedSpecialMission = {
    ...specialMissionFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playSpecialMissionPlotIntrigue(queuedSpecialMission, "p2", specialMission.id, { kind: "place-spy" }),
    queuedSpecialMission,
    "Special Mission should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playSpecialMissionPlotIntrigue(specialMissionFixture, "p3", specialMission.id, { kind: "place-spy" }),
    specialMissionFixture,
    "Only the active player should play Special Mission",
  );
  const combatSpecialMission = { ...specialMissionFixture, phase: "combat" };
  assert.equal(
    state.playSpecialMissionPlotIntrigue(combatSpecialMission, "p2", specialMission.id, { kind: "place-spy" }),
    combatSpecialMission,
    "Special Mission should only resolve during normal play",
  );

  const commanderSpecialMissionFixture = {
    ...specialMissionFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    spyPosts: { [nonCitySpyPostId]: "p4" },
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          spies: 2,
          resources: { ...candidate.resources, spice: 1 },
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [specialMission],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, spies: 3, resources: { ...candidate.resources, spice: 0 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderSpecialMissionRecall = state.playSpecialMissionPlotIntrigue(
    commanderSpecialMissionFixture,
    "p4",
    specialMission.id,
    { kind: "recall-spy", spaceId: nonCitySpySpace.id },
  );
  assert.equal(playerById(commanderSpecialMissionRecall, "p4").resources.spice, 3, "Commander Special Mission should gain Commander spice");
  assert.equal(playerById(commanderSpecialMissionRecall, "p4").spies, 3, "Commander Special Mission should recall the Commander's spy");
  assert.equal(playerById(commanderSpecialMissionRecall, "p6").resources.spice, 0, "Commander Special Mission should not route spice to the activated Ally");
  assert.equal(playerById(commanderSpecialMissionRecall, "p6").spies, 3, "Commander Special Mission should not affect the activated Ally spy supply");
  const commanderSpecialMissionPending = state.playSpecialMissionPlotIntrigue(
    commanderSpecialMissionFixture,
    "p4",
    specialMission.id,
    { kind: "place-spy" },
  );
  assert.equal(commanderSpecialMissionPending.pendingAction.ownerId, "p4", "Commander Special Mission should place a Commander spy");
  const commanderSpecialMissionPlaced = state.placeSpyForPending(
    commanderSpecialMissionPending,
    commanderSpecialMissionPending.pendingAction,
    secondCitySpySpace.id,
  );
  assert.equal(playerById(commanderSpecialMissionPlaced, "p4").spies, 1);
  assert.equal(playerById(commanderSpecialMissionPlaced, "p6").spies, 3);
  assert.equal(
    commanderSpecialMissionPlaced.spyPosts[state.spyObservationPostIdForSpace(secondCitySpySpace.id)],
    "p4",
  );
}
