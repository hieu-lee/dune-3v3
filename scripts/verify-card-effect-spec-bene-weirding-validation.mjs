import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecBeneWeirdingValidation({
  boardSpaces,
  cards,
  game,
  players,
  turnActions,
  withActivePlayer,
}) {
  const { highCouncil, imperialBasin, secrets, shipping } = boardSpaces;
  const { beneGesseritOperative, weirdingWoman } = cards;
  const { p2, p4, p6 } = players;
  const beneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id }, sharedSpyPosts: {} },
  );
  assert.equal(beneReveal.persuasion, 3, "Bene Gesserit Operative should use spy-count reveal specs");
  const sharedBeneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    {
      ...game,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
      sharedSpyPosts: { [secrets.id]: [p2.id] },
    },
  );
  assert.equal(sharedBeneReveal.persuasion, 3, "Shared spy posts should count for owner-scoped reveal specs");
  const teammateSpyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: "p6" }, sharedSpyPosts: {} },
  );
  assert.equal(teammateSpyReveal.persuasion, 1, "Teammate spy posts should not count for owner-scoped reveal specs");

  const weirdingReturnFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingReturned = turnActions.placeAgentAction(weirdingReturnFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingReturnOwner = playerById(weirdingReturned, p2.id);
  assert.equal(
    weirdingReturnOwner.hand.some((card) => card.id === weirdingWoman.id),
    true,
    "Weirding Woman should return to hand with another Bene Gesserit card in play",
  );
  assert.equal(
    weirdingReturnOwner.hand.find((card) => card.id === weirdingWoman.id)?.agentPlacementSpaceId,
    undefined,
    "Returned Weirding Woman should not keep stale Agent placement metadata in hand",
  );
  assert.equal(
    weirdingReturnOwner.playArea.some((card) => card.id === weirdingWoman.id),
    false,
    "Weirding Woman should leave play after its typed return resolves",
  );
  assert.equal(
    weirdingReturnOwner.playArea.some((card) => card.id === beneGesseritOperative.id),
    true,
    "Weirding Woman should not move the supporting Bene Gesserit card",
  );
  assert.equal(weirdingReturned.spaces[imperialBasin.id], p2.id, "Returning Weirding Woman should leave the sent Agent on the board space");
  assert.match(weirdingReturned.log.join("\n"), /Weirding Woman: returns this card to hand/);

  const duplicateHandWeirdingWoman = { ...weirdingWoman };
  const weirdingDuplicateHandFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman, duplicateHandWeirdingWoman],
    playArea: [beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingDuplicateHandReturned = turnActions.placeAgentAction(weirdingDuplicateHandFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingDuplicateHandOwner = playerById(weirdingDuplicateHandReturned, p2.id);
  assert.equal(
    weirdingDuplicateHandOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    2,
    "Agent placement should remove only the selected Weirding Woman hand copy before returning the played copy",
  );
  assert.equal(
    weirdingDuplicateHandOwner.playArea.some((card) => card.id === weirdingWoman.id),
    false,
    "Duplicate hand Weirding Woman placement should still return the played copy from play",
  );

  const olderWeirdingWomanInPlay = {
    ...weirdingWoman,
    agentPlacementSpaceId: shipping.id,
    agentPlacementTargetOwnerId: p2.id,
  };
  const weirdingDuplicateFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [olderWeirdingWomanInPlay, beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingDuplicateReturned = turnActions.placeAgentAction(weirdingDuplicateFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingDuplicateOwner = playerById(weirdingDuplicateReturned, p2.id);
  assert.equal(
    weirdingDuplicateOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    1,
    "Weirding Woman should return the newly played source card when another same-id copy is already in play",
  );
  assert.equal(
    weirdingDuplicateOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementSpaceId === shipping.id),
    true,
    "Return-source-to-hand should leave older same-id play-area cards in play",
  );
  assert.equal(
    weirdingDuplicateOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementSpaceId === imperialBasin.id),
    false,
    "Return-source-to-hand should remove the current Agent placement copy, not an older same-id copy",
  );

  const commanderOlderWeirdingWomanInPlay = {
    ...weirdingWoman,
    agentPlacementSpaceId: shipping.id,
    agentPlacementTargetOwnerId: p6.id,
  };
  const commanderWeirdingFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [commanderOlderWeirdingWomanInPlay, beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderWeirdingReturned = turnActions.placeAgentAction(commanderWeirdingFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const commanderWeirdingOwner = playerById(commanderWeirdingReturned, p4.id);
  assert.equal(
    commanderWeirdingOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    1,
    "Commander Weirding Woman should return the newly played source card to the Commander hand",
  );
  assert.equal(
    commanderWeirdingOwner.hand.find((card) => card.id === weirdingWoman.id)?.agentPlacementTargetOwnerId,
    undefined,
    "Commander returned Weirding Woman should clear activated-Ally placement metadata",
  );
  assert.equal(
    commanderWeirdingOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementTargetOwnerId === p6.id),
    true,
    "Commander return-source-to-hand should leave older same-id cards with different target metadata in play",
  );
  assert.equal(
    commanderWeirdingOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementTargetOwnerId === p2.id),
    false,
    "Commander return-source-to-hand should remove the current activated-Ally target copy",
  );
  assert.equal(
    commanderWeirdingReturned.spaces[imperialBasin.id],
    p2.id,
    "Commander Weirding Woman should leave the sent Agent assigned to the activated Ally's board space",
  );

  const weirdingUnqualifiedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingUnqualified = turnActions.placeAgentAction(weirdingUnqualifiedFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingUnqualifiedOwner = playerById(weirdingUnqualified, p2.id);
  assert.equal(
    weirdingUnqualifiedOwner.hand.some((card) => card.id === weirdingWoman.id),
    false,
    "Weirding Woman should leave hand when the Bene Gesserit condition is not met",
  );
  assert.equal(
    weirdingUnqualifiedOwner.playArea.some((card) => card.id === weirdingWoman.id),
    true,
    "Weirding Woman should remain in play when the Bene Gesserit condition is not met",
  );
  assert.doesNotMatch(weirdingUnqualified.log.join("\n"), /Weirding Woman: returns this card to hand/);
}
