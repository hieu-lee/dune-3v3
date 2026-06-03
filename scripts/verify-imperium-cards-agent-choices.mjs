import assert from "node:assert/strict";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";
export function verifyImperiumCardAgentChoiceEffects({
  cards,
  fixtures,
  game,
  playerId,
  spaces,
  state,
  turnActions,
}) {
  const {
    calculus,
    capturedMentat,
    longLiveTheFighters,
    prepareTheWay,
    steersman,
  } = cards;
  const { calculusBlockedTarget, calculusTrashTarget, fremenBondSupport } =
    fixtures;
  const { carthag, shipping } = spaces;
  const p2 = playerById(game, playerId);
  const prepareDrawCard = {
    ...calculusTrashTarget,
    id: "prepare-way-draw-target",
  };
  const prepareAgentFixture = withActivePlayer(game, p2.id, (player) => ({
    agentsReady: 1,
    deck: [prepareDrawCard],
    discard: [],
    garrison: 0,
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 2 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const prepared = turnActions.placeAgentAction(prepareAgentFixture, {
    commanderTargets: {},
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(
    playerById(prepared, p2.id).hand.length,
    1,
    "Prepare The Way should draw 1 card at 2 Bene Gesserit Influence",
  );
  assert.equal(playerById(prepared, p2.id).hand[0].id, prepareDrawCard.id);
  assert.ok(
    playerById(prepared, p2.id).playArea.some(
      (card) => card.id === prepareTheWay.id,
    ),
  );
  assert.ok(
    prepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)),
  );
  const unprepared = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, (player) => ({
      agentsReady: 1,
      deck: [prepareDrawCard],
      discard: [],
      garrison: 0,
      hand: [prepareTheWay],
      influence: { ...player.influence, bene: 1 },
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: prepareTheWay,
      selectedSpace: carthag,
    },
  );
  assert.equal(
    playerById(unprepared, p2.id).hand.length,
    0,
    "Prepare The Way should not draw below 2 Bene Gesserit Influence",
  );
  assert.equal(
    unprepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)),
    false,
    "Prepare The Way should not log a draw when the threshold is unmet",
  );
  const longLiveDraw = {
    ...calculusTrashTarget,
    id: "long-live-imperium-draw-card",
    name: "Long Live Imperium Draw",
  };
  const longLiveDiscard = {
    ...capturedMentat,
    id: "long-live-imperium-discard-card",
    name: "Long Live Imperium Discard",
  };
  const longLiveTrash = {
    ...fremenBondSupport,
    id: "long-live-imperium-trash-card",
    name: "Long Live Imperium Trash",
  };
  const longLiveRemaining = {
    ...calculusBlockedTarget,
    id: "long-live-imperium-remaining-card",
    name: "Long Live Imperium Remaining",
  };
  const longLiveSpace = {
    id: "long-live-imperium-test-space",
    name: "Long Live Imperium Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const longLivePlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard, longLiveTrash, longLiveRemaining],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(
    longLivePlaced.pendingAction?.kind,
    "top-deck-selection",
    "Long Live the Fighters should queue top-deck selection",
  );
  assert.deepEqual(
    state
      .topDeckSelectionCards(
        playerById(longLivePlaced, p2.id),
        longLivePlaced.pendingAction,
      )
      .map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should expose the inspected top three cards",
  );
  assert.deepEqual(
    longLivePlaced.pendingAction.inspectedCards.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should reserve inspected cards on its pending action",
  );
  assert.deepEqual(
    playerById(longLivePlaced, p2.id).deck.map((card) => card.id),
    [longLiveRemaining.id],
    "Long Live the Fighters should remove inspected cards from the deck while pending",
  );
  assert.equal(
    state.skipTopDeckSelectionChoice(
      longLivePlaced,
      longLivePlaced.pendingAction,
    ),
    longLivePlaced,
    "Long Live the Fighters should not skip while the inspected cards are still available",
  );
  const {
    inspectedCards: _longLiveInspectedCards,
    ...longLiveLegacyPendingAction
  } = longLivePlaced.pendingAction;
  const longLiveStalePendingState = {
    ...longLivePlaced,
    pendingAction: longLiveLegacyPendingAction,
    players: longLivePlaced.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [longLiveDraw, longLiveDiscard],
            discard: [],
            hand: [],
            playArea: [longLiveTheFighters],
          }
        : player,
    ),
  };
  const longLiveStaleSkipped = state.skipTopDeckSelectionChoice(
    longLiveStalePendingState,
    longLiveStalePendingState.pendingAction,
  );
  assert.equal(
    longLiveStaleSkipped.pendingAction,
    undefined,
    "Long Live the Fighters should skip a stale top-deck pending action",
  );
  assert.deepEqual(
    playerById(longLiveStaleSkipped, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters stale skip should leave the shortened deck untouched",
  );
  assert.match(
    longLiveStaleSkipped.log[0],
    /cannot resolve Long Live the Fighters: fewer than 3 cards remain in deck\./,
  );
  const longLiveResolved = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 1, discardIndex: 0, trashIndex: 2 },
  );
  const longLiveOwner = playerById(longLiveResolved, p2.id);
  assert.equal(longLiveResolved.pendingAction, undefined);
  assert.ok(
    longLiveOwner.hand.some((card) => card.id === longLiveDiscard.id),
    "Long Live the Fighters should draw the selected inspected card",
  );
  assert.equal(
    longLiveOwner.discard.at(-1)?.id,
    longLiveDraw.id,
    "Long Live the Fighters should discard the selected inspected card",
  );
  assert.deepEqual(
    longLiveOwner.deck.map((card) => card.id),
    [longLiveRemaining.id],
    "Long Live the Fighters should leave only uninspected cards in deck",
  );
  assert.equal(
    [
      ...longLiveOwner.hand,
      ...longLiveOwner.discard,
      ...longLiveOwner.deck,
      ...longLiveOwner.playArea,
    ].some((card) => card.id === longLiveTrash.id),
    false,
    "Long Live the Fighters should trash the selected inspected card",
  );
  const longLiveShortDeckPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(
    longLiveShortDeckPlaced.pendingAction,
    undefined,
    "Long Live the Fighters should not queue with fewer than three deck cards",
  );
  const calculusAgentTrashTarget = {
    ...calculusTrashTarget,
    id: "calculus-agent-trash-target",
  };
  const calculusAgentSpace = {
    id: "calculus-agent-test-space",
    name: "Calculus Agent Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const calculusAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [calculus, calculusAgentTrashTarget],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusAgentPlaced = turnActions.placeAgentAction(
    calculusAgentFixture,
    {
      commanderTargets: {},
      selectedCard: calculus,
      selectedSpace: calculusAgentSpace,
    },
  );
  assert.equal(
    calculusAgentPlaced.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should queue Agent trash",
  );
  assert.equal(calculusAgentPlaced.pendingAction.source, "Calculus of Power");
  assert.deepEqual(
    state
      .trashableCardsForPending(
        playerById(calculusAgentPlaced, p2.id),
        calculusAgentPlaced.pendingAction,
      )
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [
      { zone: "hand", id: calculusAgentTrashTarget.id },
      { zone: "playArea", id: calculus.id },
    ],
    "Calculus Agent trash should allow a card from hand or in play",
  );
  const calculusAgentResolved = state.trashPlayerCard(
    calculusAgentPlaced,
    calculusAgentPlaced.pendingAction,
    "hand",
    calculusAgentTrashTarget.id,
  );
  assert.equal(
    playerById(calculusAgentResolved, p2.id).hand.length,
    0,
    "Calculus Agent trash should remove the selected hand card",
  );
  assert.ok(
    playerById(calculusAgentResolved, p2.id).playArea.some(
      (card) => card.id === calculus.id,
    ),
  );
  assert.equal(calculusAgentResolved.pendingAction, undefined);
  const steersmanDrawTarget = {
    ...calculusTrashTarget,
    id: "steersman-draw-target",
  };
  const steersmanFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [steersmanDrawTarget],
    discard: [],
    garrison: 0,
    hand: [steersman],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const steersmanPlayed = turnActions.placeAgentAction(steersmanFixture, {
    commanderTargets: {},
    selectedCard: steersman,
    selectedSpace: carthag,
  });
  assert.equal(
    playerById(steersmanPlayed, p2.id).agentsReady,
    1,
    "Steersman should recall the just-sent Agent to ready supply",
  );
  assert.equal(
    steersmanPlayed.spaces[carthag.id],
    undefined,
    "Steersman should leave the recalled board space unoccupied",
  );
  assert.equal(
    playerById(steersmanPlayed, p2.id).hand[0]?.id,
    steersmanDrawTarget.id,
    "Steersman should draw one card on Agent play",
  );
  assert.ok(
    playerById(steersmanPlayed, p2.id).playArea.some(
      (card) => card.id === steersman.id,
    ),
  );
  assert.ok(
    steersmanPlayed.log.some((entry) =>
      /Steersman: draws 1 card; recalls the Agent/.test(entry),
    ),
  );
  const steersmanShippingDrawTarget = {
    ...calculusTrashTarget,
    id: "steersman-shipping-draw-target",
  };
  const steersmanShippingFixture = withActivePlayer(game, p2.id, (player) => ({
    agentsReady: 1,
    deck: [steersmanShippingDrawTarget],
    discard: [],
    garrison: 0,
    hand: [steersman],
    influence: { ...player.influence, spacing: 2 },
    playArea: [],
    resources: { solari: 0, spice: 3, water: 0 },
  }));
  const steersmanShippingPlayed = turnActions.placeAgentAction(
    steersmanShippingFixture,
    {
      commanderTargets: {},
      selectedCard: steersman,
      selectedSpace: shipping,
    },
  );
  assert.equal(
    steersmanShippingPlayed.pendingAction?.kind,
    "board-influence-choice",
    "Steersman on Shipping should leave the board Influence choice resolvable after Recall Agent",
  );
  assert.equal(steersmanShippingPlayed.pendingAction.targetOwnerId, p2.id);
  assert.equal(
    steersmanShippingPlayed.spaces[shipping.id],
    undefined,
    "Steersman should leave Shipping unoccupied before resolving its pending reward",
  );
  const steersmanShippingResolved = state.resolveBoardInfluenceChoice(
    steersmanShippingPlayed,
    steersmanShippingPlayed.pendingAction,
    p2.id,
    "spacing",
  );
  assert.equal(
    playerById(steersmanShippingResolved, p2.id).influence.spacing,
    3,
    "Steersman should resolve Shipping Influence after recalling the Agent",
  );
  assert.equal(
    playerById(steersmanShippingResolved, p2.id).agentsReady,
    1,
    "Resolving Shipping should preserve the recalled Agent",
  );
  assert.equal(steersmanShippingResolved.pendingAction, undefined);
  assert.equal(
    steersmanShippingResolved.spaces[shipping.id],
    undefined,
    "Shipping should remain unoccupied after its pending reward resolves",
  );
}
