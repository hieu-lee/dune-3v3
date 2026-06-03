import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecSourceTrashValidation({
  boardSpaces,
  cards,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { highCouncil, imperialBasin } = boardSpaces;
  const {
    calculus,
    convincingArgument,
    dagger,
    desertSurvival,
    hiddenMissive,
    inHighPlaces,
    shishakli,
    treadInDarkness,
  } = cards;
  const { p2 } = players;

  const calculusAgentHandTrash = {
    ...dagger,
    id: "calculus-agent-hand-trash-card",
    name: "Calculus Agent Hand Trash",
  };
  const calculusAgentPlayTrash = {
    ...convincingArgument,
    id: "calculus-agent-play-trash-card",
    name: "Calculus Agent Play Trash",
  };
  const calculusAgentDiscardTrash = {
    ...convincingArgument,
    id: "calculus-agent-discard-trash-card",
    name: "Calculus Agent Discard Trash",
  };
  const calculusAgentSpace = {
    id: "calculus-agent-test-space",
    name: "Calculus Agent Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const calculusAgentPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [calculusAgentDiscardTrash],
      hand: [calculus, calculusAgentHandTrash],
      playArea: [calculusAgentPlayTrash],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: calculus,
      selectedSpace: calculusAgentSpace,
    },
  );
  assert.equal(
    calculusAgentPlaced.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should queue a typed Agent selected-card trash pending action",
  );
  assert.equal(calculusAgentPlaced.pendingAction.source, "Calculus of Power");
  assert.equal(calculusAgentPlaced.pendingAction.optional, true);
  assert.equal(calculusAgentPlaced.pendingAction.zones, undefined, "Calculus Agent trash should use all standard trash zones");
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusAgentPlaced, p2.id), calculusAgentPlaced.pendingAction)
      .map(({ zone, card }) => `${zone}:${card.id}`),
    [
      `hand:${calculusAgentHandTrash.id}`,
      `discard:${calculusAgentDiscardTrash.id}`,
      `playArea:${calculusAgentPlayTrash.id}`,
      `playArea:${calculus.id}`,
    ],
    "Calculus Agent trash should offer hand, discard, in-play, and source-card choices",
  );
  const calculusAgentTrashed = state.trashPlayerCard(
    calculusAgentPlaced,
    calculusAgentPlaced.pendingAction,
    "hand",
    calculusAgentHandTrash.id,
  );
  const calculusAgentOwner = playerById(calculusAgentTrashed, p2.id);
  assert.equal(
    calculusAgentOwner.hand.some((card) => card.id === calculusAgentHandTrash.id),
    false,
    "Resolving Calculus Agent trash should remove the selected hand card",
  );
  assert.equal(
    calculusAgentOwner.playArea.some((card) => card.id === calculus.id),
    true,
    "Resolving Calculus Agent trash should leave Calculus in play when another card was trashed",
  );
  assert.equal(calculusAgentTrashed.pendingAction, undefined);
  assert.match(calculusAgentTrashed.log[0], /trashes Calculus Agent Hand Trash from Calculus of Power/);
  const desertSurvivalOtherPlayCard = { ...dagger, id: "desert-survival-other-play-card" };
  const desertSurvivalFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [desertSurvival],
    playArea: [desertSurvivalOtherPlayCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  assert.equal(
    state.pendingActionForCard(desertSurvival, playerById(desertSurvivalFixture, p2.id), desertSurvivalFixture),
    undefined,
    "Desert Survival should only queue its source-trash choice from play",
  );
  const desertSurvivalPlaced = turnActions.placeAgentAction(desertSurvivalFixture, {
    commanderTargets: {},
    selectedCard: desertSurvival,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    desertSurvivalPlaced.pendingAction?.kind,
    "trash-card",
    "Desert Survival should queue a typed optional trash-card pending action",
  );
  assert.equal(desertSurvivalPlaced.pendingAction.source, "Desert Survival");
  assert.equal(desertSurvivalPlaced.pendingAction.optional, true);
  assert.deepEqual(desertSurvivalPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredCardId, desertSurvival.id);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(desertSurvivalPlaced, p2.id), desertSurvivalPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: desertSurvival.id }],
    "Desert Survival source-trash choices should exclude other cards in play",
  );
  const desertSurvivalOtherTrashAttempt = state.trashPlayerCard(
    desertSurvivalPlaced,
    desertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvivalOtherPlayCard.id,
  );
  assert.equal(
    playerById(desertSurvivalOtherTrashAttempt, p2.id).playArea.some((card) => card.id === desertSurvivalOtherPlayCard.id),
    true,
    "Desert Survival source-trash pending should reject non-source cards in play",
  );
  assert.equal(
    desertSurvivalOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Desert Survival trash attempts should leave the pending action unresolved",
  );
  const desertSurvivalTrashed = state.trashPlayerCard(
    desertSurvivalPlaced,
    desertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvival.id,
  );
  assert.equal(
    playerById(desertSurvivalTrashed, p2.id).playArea.some((card) => card.id === desertSurvival.id),
    false,
    "Resolving Desert Survival trash should remove the source card from play",
  );
  assert.equal(
    playerById(desertSurvivalTrashed, p2.id).playArea.some((card) => card.id === desertSurvivalOtherPlayCard.id),
    true,
    "Resolving Desert Survival trash should leave other cards in play",
  );
  assert.equal(desertSurvivalTrashed.pendingAction, undefined);
  assert.match(desertSurvivalTrashed.log[0], /trashes Desert Survival from Desert Survival/);
  const desertSurvivalSkipped = state.skipTrashCard(desertSurvivalPlaced, desertSurvivalPlaced.pendingAction);
  assert.equal(
    playerById(desertSurvivalSkipped, p2.id).playArea.some((card) => card.id === desertSurvival.id),
    true,
    "Skipping Desert Survival trash should leave the source card in play",
  );
  assert.equal(desertSurvivalSkipped.pendingAction, undefined);
  assert.match(desertSurvivalSkipped.log[0], /declines to trash a card from Desert Survival/);
  const duplicateDesertSurvivalInPlay = {
    ...desertSurvival,
    name: "Desert Survival Duplicate",
    agentPlacementSpaceId: "shipping",
    agentPlacementTargetOwnerId: p2.id,
  };
  const duplicateDesertSurvivalFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [desertSurvival],
    playArea: [duplicateDesertSurvivalInPlay],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const duplicateDesertSurvivalPlaced = turnActions.placeAgentAction(duplicateDesertSurvivalFixture, {
    commanderTargets: {},
    selectedCard: desertSurvival,
    selectedSpace: imperialBasin,
  });
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction?.kind, "trash-card");
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction.requiredCardId, desertSurvival.id);
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.deepEqual(
    state.trashableCardsForPending(
      playerById(duplicateDesertSurvivalPlaced, p2.id),
      duplicateDesertSurvivalPlaced.pendingAction,
    ).map(({ card }) => card.agentPlacementSpaceId),
    [imperialBasin.id],
    "Desert Survival source trash should distinguish duplicate IDs by placement metadata",
  );
  const duplicateDesertSurvivalTrashed = state.trashPlayerCard(
    duplicateDesertSurvivalPlaced,
    duplicateDesertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvival.id,
  );
  const remainingDuplicateDesertSurvivals = playerById(duplicateDesertSurvivalTrashed, p2.id).playArea.filter(
    (card) => card.id === desertSurvival.id,
  );
  assert.equal(
    remainingDuplicateDesertSurvivals.length,
    1,
    "Source trash should remove only one matching source-card instance",
  );
  assert.equal(
    remainingDuplicateDesertSurvivals[0]?.agentPlacementSpaceId,
    "shipping",
    "Source trash should leave a same-id non-source card in play",
  );
  const treadDrawCard = { ...dagger, id: "tread-in-darkness-draw-card", name: "Tread in Darkness Draw Probe" };
  const treadExtraDeckCard = {
    ...convincingArgument,
    id: "tread-in-darkness-extra-deck-card",
    name: "Tread in Darkness Extra Deck Probe",
  };
  const treadOtherBeneCard = {
    ...hiddenMissive,
    id: "tread-in-darkness-other-bene-card",
    name: "Tread in Darkness Other Bene",
  };
  const treadFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [treadDrawCard, treadExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [treadOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadPlaced = turnActions.placeAgentAction(treadFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadPlaced.pendingAction?.kind,
    "trash-card",
    "Tread in Darkness should queue a source-trash pending action when another Bene Gesserit card is in play",
  );
  assert.equal(treadPlaced.pendingAction.source, "Tread in Darkness");
  assert.equal(treadPlaced.pendingAction.optional, true);
  assert.equal(treadPlaced.pendingAction.drawCardsReward, 1);
  assert.deepEqual(treadPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(treadPlaced.pendingAction.requiredCardId, treadInDarkness.id);
  assert.equal(treadPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(treadPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(treadPlaced, p2.id), treadPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: treadInDarkness.id }],
    "Tread in Darkness source-trash draw should only offer its source card",
  );
  const treadOtherTrashAttempt = state.trashPlayerCard(
    treadPlaced,
    treadPlaced.pendingAction,
    "playArea",
    treadOtherBeneCard.id,
  );
  assert.equal(
    treadOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Tread in Darkness trash attempts should leave the pending action unresolved",
  );
  assert.equal(
    playerById(treadOtherTrashAttempt, p2.id).playArea.some((card) => card.id === treadOtherBeneCard.id),
    true,
    "Tread in Darkness should reject trashing the other Bene Gesserit card",
  );
  const treadTrashed = state.trashPlayerCard(
    treadPlaced,
    treadPlaced.pendingAction,
    "playArea",
    treadInDarkness.id,
  );
  const treadOwner = playerById(treadTrashed, p2.id);
  assert.equal(
    treadOwner.playArea.some((card) => card.id === treadInDarkness.id),
    false,
    "Resolving Tread in Darkness trash should remove the source card from play",
  );
  assert.equal(
    treadOwner.playArea.some((card) => card.id === treadOtherBeneCard.id),
    true,
    "Resolving Tread in Darkness trash should leave the other Bene Gesserit card in play",
  );
  assert.equal(
    treadOwner.hand.some((card) => card.id === treadDrawCard.id),
    true,
    "Resolving Tread in Darkness trash should draw 1 card",
  );
  assert.deepEqual(
    treadOwner.hand.map((card) => card.id),
    [treadDrawCard.id],
    "Resolving Tread in Darkness trash should draw exactly 1 card",
  );
  assert.deepEqual(
    treadOwner.deck.map((card) => card.id),
    [treadExtraDeckCard.id],
    "Resolving Tread in Darkness trash should leave the second deck card undrawn",
  );
  assert.equal(treadTrashed.pendingAction, undefined);
  assert.match(treadTrashed.log[0], /trashes Tread in Darkness from Tread in Darkness and draws 1 card/);
  const treadSkipped = state.skipTrashCard(treadPlaced, treadPlaced.pendingAction);
  const treadSkippedOwner = playerById(treadSkipped, p2.id);
  assert.equal(
    treadSkippedOwner.playArea.some((card) => card.id === treadInDarkness.id),
    true,
    "Skipping Tread in Darkness trash should leave the source card in play",
  );
  assert.equal(
    treadSkippedOwner.hand.some((card) => card.id === treadDrawCard.id),
    false,
    "Skipping Tread in Darkness trash should not draw the reward card",
  );
  assert.deepEqual(
    treadSkippedOwner.deck.map((card) => card.id),
    [treadDrawCard.id, treadExtraDeckCard.id],
    "Skipping Tread in Darkness trash should leave the deck untouched",
  );
  assert.equal(treadSkipped.pendingAction, undefined);
  assert.match(treadSkipped.log[0], /declines to trash a card from Tread in Darkness/);
  const treadUnqualifiedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [treadDrawCard, treadExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadUnqualifiedPlaced = turnActions.placeAgentAction(treadUnqualifiedFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadUnqualifiedPlaced.pendingAction,
    undefined,
    "Tread in Darkness should not queue its source-trash draw without another Bene Gesserit card in play",
  );
  const treadEmptyDeckFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [treadOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadEmptyDeckPlaced = turnActions.placeAgentAction(treadEmptyDeckFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadEmptyDeckPlaced.pendingAction?.kind,
    "trash-card",
    "Tread in Darkness should still queue its source-trash draw with an empty deck",
  );
  const treadEmptyDeckTrashed = state.trashPlayerCard(
    treadEmptyDeckPlaced,
    treadEmptyDeckPlaced.pendingAction,
    "playArea",
    treadInDarkness.id,
  );
  const treadEmptyDeckOwner = playerById(treadEmptyDeckTrashed, p2.id);
  assert.equal(
    treadEmptyDeckOwner.playArea.some((card) => card.id === treadInDarkness.id),
    false,
    "Tread in Darkness should trash itself even when the draw reward cannot be satisfied",
  );
  assert.equal(treadEmptyDeckOwner.hand.length, 0, "Unsatisfied Tread in Darkness draw should not add cards");
  assert.match(treadEmptyDeckTrashed.log[0], /trashes Tread in Darkness from Tread in Darkness and has no card to draw/);
  const shishakliDrawCard = { ...dagger, id: "shishakli-draw-card", name: "Shishakli Draw Probe" };
  const shishakliExtraDeckCard = {
    ...convincingArgument,
    id: "shishakli-extra-deck-card",
    name: "Shishakli Extra Deck Probe",
  };
  const shishakliOtherPlayCard = {
    ...dagger,
    id: "shishakli-other-play-card",
    name: "Shishakli Other Play Card",
  };
  const shishakliFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [shishakliDrawCard, shishakliExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [shishakli],
    playArea: [shishakliOtherPlayCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  assert.equal(
    state.pendingActionForCard(shishakli, playerById(shishakliFixture, p2.id), shishakliFixture),
    undefined,
    "Shishakli should only queue its source-trash draw choice from play",
  );
  const shishakliPlaced = turnActions.placeAgentAction(shishakliFixture, {
    commanderTargets: {},
    selectedCard: shishakli,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    shishakliPlaced.pendingAction?.kind,
    "trash-card",
    "Shishakli should queue a source-trash draw pending action",
  );
  assert.equal(shishakliPlaced.pendingAction.source, "Shishakli");
  assert.equal(shishakliPlaced.pendingAction.optional, true);
  assert.equal(shishakliPlaced.pendingAction.drawCardsReward, 1);
  assert.deepEqual(shishakliPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(shishakliPlaced.pendingAction.requiredCardId, shishakli.id);
  assert.equal(shishakliPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(shishakliPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(shishakliPlaced, p2.id), shishakliPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: shishakli.id }],
    "Shishakli source-trash draw should only offer its source card",
  );
  const shishakliOtherTrashAttempt = state.trashPlayerCard(
    shishakliPlaced,
    shishakliPlaced.pendingAction,
    "playArea",
    shishakliOtherPlayCard.id,
  );
  assert.equal(
    shishakliOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Shishakli trash attempts should leave the pending action unresolved",
  );
  assert.equal(
    playerById(shishakliOtherTrashAttempt, p2.id).playArea.some((card) => card.id === shishakliOtherPlayCard.id),
    true,
    "Shishakli should reject trashing other in-play cards",
  );
  const shishakliTrashed = state.trashPlayerCard(
    shishakliPlaced,
    shishakliPlaced.pendingAction,
    "playArea",
    shishakli.id,
  );
  const shishakliOwner = playerById(shishakliTrashed, p2.id);
  assert.equal(
    shishakliOwner.playArea.some((card) => card.id === shishakli.id),
    false,
    "Resolving Shishakli trash should remove the source card from play",
  );
  assert.equal(
    shishakliOwner.playArea.some((card) => card.id === shishakliOtherPlayCard.id),
    true,
    "Resolving Shishakli trash should leave other cards in play",
  );
  assert.deepEqual(
    shishakliOwner.hand.map((card) => card.id),
    [shishakliDrawCard.id],
    "Resolving Shishakli trash should draw exactly 1 card",
  );
  assert.deepEqual(
    shishakliOwner.deck.map((card) => card.id),
    [shishakliExtraDeckCard.id],
    "Resolving Shishakli trash should leave the second deck card undrawn",
  );
  assert.equal(shishakliTrashed.pendingAction, undefined);
  assert.match(shishakliTrashed.log[0], /trashes Shishakli from Shishakli and draws 1 card/);
  const shishakliSkipped = state.skipTrashCard(shishakliPlaced, shishakliPlaced.pendingAction);
  const shishakliSkippedOwner = playerById(shishakliSkipped, p2.id);
  assert.equal(
    shishakliSkippedOwner.playArea.some((card) => card.id === shishakli.id),
    true,
    "Skipping Shishakli trash should leave the source card in play",
  );
  assert.equal(
    shishakliSkippedOwner.hand.some((card) => card.id === shishakliDrawCard.id),
    false,
    "Skipping Shishakli trash should not draw the reward card",
  );
  assert.deepEqual(
    shishakliSkippedOwner.deck.map((card) => card.id),
    [shishakliDrawCard.id, shishakliExtraDeckCard.id],
    "Skipping Shishakli trash should leave the deck untouched",
  );
  assert.equal(shishakliSkipped.pendingAction, undefined);
  assert.match(shishakliSkipped.log[0], /declines to trash a card from Shishakli/);
  const inHighPlacesDrawCard = {
    ...dagger,
    id: "in-high-places-draw-card",
    name: "In High Places Draw Probe",
  };
  const inHighPlacesExtraDeckCard = {
    ...convincingArgument,
    id: "in-high-places-extra-deck-card",
    name: "In High Places Extra Deck Probe",
  };
  const inHighPlacesOtherBeneCard = {
    ...hiddenMissive,
    id: "in-high-places-other-bene-card",
    name: "In High Places Other Bene",
  };
  const inHighPlacesFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [inHighPlacesDrawCard, inHighPlacesExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [inHighPlaces],
    playArea: [inHighPlacesOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 2,
  }));
  const inHighPlacesPlaced = turnActions.placeAgentAction(inHighPlacesFixture, {
    commanderTargets: {},
    selectedCard: inHighPlaces,
    selectedSpace: imperialBasin,
  });
  const inHighPlacesOwner = playerById(inHighPlacesPlaced, p2.id);
  assert.deepEqual(
    inHighPlacesOwner.hand.map((card) => card.id),
    [inHighPlacesDrawCard.id],
    "In High Places should draw exactly one card when another Bene Gesserit card is in play",
  );
  assert.deepEqual(
    inHighPlacesOwner.deck.map((card) => card.id),
    [inHighPlacesExtraDeckCard.id],
    "In High Places should leave the second deck card undrawn",
  );
  assert.equal(
    inHighPlacesPlaced.pendingAction?.kind,
    "spy",
    "In High Places should queue spy placement when another Bene Gesserit card is in play",
  );
  assert.equal(inHighPlacesPlaced.pendingAction.ownerId, p2.id);
  assert.equal(inHighPlacesPlaced.pendingAction.source, "In High Places");
  assert.equal(inHighPlacesPlaced.pendingAction.remaining, 1);
  assert.equal(inHighPlacesPlaced.pendingAction.recallForSupply, true);
  assert.equal(inHighPlacesPlaced.pendingAction.mustPlaceSpy, true);
  assert.equal(
    state.finishPendingAction(inHighPlacesPlaced),
    inHighPlacesPlaced,
    "In High Places spy placement should be mandatory",
  );
  const inHighPlacesSpyPlaced = state.placeSpyForPending(
    inHighPlacesPlaced,
    inHighPlacesPlaced.pendingAction,
    highCouncil.id,
  );
  assert.equal(inHighPlacesSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(inHighPlacesSpyPlaced, p2.id).spies, 1, "In High Places should spend one spy from supply");
  assert.equal(inHighPlacesSpyPlaced.spyPosts[highCouncil.id], p2.id, "In High Places should place the selected spy");
  assert.match(inHighPlacesSpyPlaced.log[0], /places a spy near High Council from In High Places/);
  const inHighPlacesUnqualified = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [inHighPlacesDrawCard, inHighPlacesExtraDeckCard],
      discard: [],
      garrison: 0,
      hand: [inHighPlaces],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 2,
    })),
    {
      commanderTargets: {},
      selectedCard: inHighPlaces,
      selectedSpace: imperialBasin,
    },
  );
  assert.deepEqual(
    playerById(inHighPlacesUnqualified, p2.id).hand.map((card) => card.id),
    [],
    "In High Places should not draw when it is the only Bene Gesserit card in play",
  );
  assert.equal(
    inHighPlacesUnqualified.pendingAction,
    undefined,
    "In High Places should not queue spy placement when it is the only Bene Gesserit card in play",
  );
  const genericDrawRewardTrashCard = {
    ...dagger,
    id: "generic-draw-reward-trash-card",
    name: "Generic Draw Reward Trash",
  };
  const genericDrawRewardDeckCard = {
    ...convincingArgument,
    id: "generic-draw-reward-deck-card",
    name: "Generic Draw Reward Deck",
  };
  const genericDrawRewardPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Generic Draw Reward",
    optional: true,
    zones: ["playArea"],
    drawCardsReward: 2,
  };
  const genericDrawRewardState = withActivePlayer(game, p2.id, () => ({
    deck: [genericDrawRewardDeckCard],
    discard: [],
    hand: [],
    playArea: [genericDrawRewardTrashCard],
  }));
  const genericDrawRewardPartial = state.trashPlayerCard(
    { ...genericDrawRewardState, pendingAction: genericDrawRewardPending },
    genericDrawRewardPending,
    "playArea",
    genericDrawRewardTrashCard.id,
  );
  const genericDrawRewardOwner = playerById(genericDrawRewardPartial, p2.id);
  assert.deepEqual(
    genericDrawRewardOwner.hand.map((card) => card.id),
    [genericDrawRewardDeckCard.id],
    "Generic trash-card draw reward should draw the one available card",
  );
  assert.equal(
    genericDrawRewardOwner.playArea.some((card) => card.id === genericDrawRewardTrashCard.id),
    false,
    "Generic trash-card draw reward should still trash the selected card",
  );
  assert.match(
    genericDrawRewardPartial.log[0],
    /trashes Generic Draw Reward Trash from Generic Draw Reward and draws 1 of 2 cards/,
    "Generic trash-card draw reward should log partial draws",
  );
  const genericDuplicateTrashCardA = {
    ...dagger,
    id: "generic-duplicate-trash-card",
    name: "Generic Duplicate Trash A",
  };
  const genericDuplicateTrashCardB = {
    ...dagger,
    id: "generic-duplicate-trash-card",
    name: "Generic Duplicate Trash B",
  };
  const genericDuplicateTrashPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Generic Duplicate Trash",
    optional: true,
    zones: ["playArea"],
  };
  const genericDuplicateTrashState = withActivePlayer(game, p2.id, () => ({
    playArea: [genericDuplicateTrashCardA, genericDuplicateTrashCardB],
  }));
  assert.deepEqual(
    state.trashableCardsForPending(playerById(genericDuplicateTrashState, p2.id), genericDuplicateTrashPending)
      .map(({ card }) => card.name),
    ["Generic Duplicate Trash A", "Generic Duplicate Trash B"],
    "Generic duplicate trash choices should preserve both visible choices",
  );
  const genericDuplicateTrashResolved = state.trashPlayerCard(
    genericDuplicateTrashState,
    genericDuplicateTrashPending,
    "playArea",
    genericDuplicateTrashCardB.id,
    1,
  );
  assert.deepEqual(
    playerById(genericDuplicateTrashResolved, p2.id).playArea.map((card) => card.name),
    ["Generic Duplicate Trash A"],
    "Choice-indexed trash should remove the clicked duplicate-id card instance",
  );
}
