import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecCorrinthDeliveryValidation({
  cards,
  data,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { convincingArgument, corrinthCity, dagger, deliveryAgreement } = cards;
  const { p2 } = players;
  const corrinthReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [corrinthCity], highCouncilSeat: false },
    game,
  );
  assert.equal(corrinthReveal.persuasion, 5, "Corrinth City should resolve its default +5 persuasion Reveal branch");
  const corrinthRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [corrinthCity],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    revealed: false,
  }));
  const corrinthRevealActionPlan = turnActions.revealTurnPlan(
    playerById(corrinthRevealFixture, p2.id),
    corrinthRevealFixture,
  );
  const corrinthRevealed = turnActions.revealTurnAction(corrinthRevealFixture, {
    commanderTargets: {},
    revealPlan: corrinthRevealActionPlan,
  });
  assert.deepEqual(
    corrinthRevealed.pendingAction,
    {
      kind: "pay-resource-for-high-council-seat",
      ownerId: p2.id,
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionCost: 5,
      persuasionReward: 2,
      source: "Corrinth City",
      cardId: corrinthCity.id,
    },
    "Corrinth City should queue its paid High Council Reveal branch",
  );
  assert.equal(playerById(corrinthRevealed, p2.id).persuasion, 5, "Corrinth City should add +5 persuasion before branch payment");
  const corrinthCouncilPaid = state.resolvePayResourceForHighCouncilSeatChoice(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
  );
  assert.equal(corrinthCouncilPaid.pendingAction, undefined, "Corrinth City High Council payment should resolve its pending action");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).resources.solari, 0, "Corrinth City High Council branch should spend 5 Solari");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).highCouncilSeat, true, "Corrinth City High Council branch should take a seat");
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).persuasion,
    2,
    "Corrinth City High Council branch should replace +5 persuasion with the current High Council +2",
  );
  assert.match(corrinthCouncilPaid.log[0], /spends 5 Solari.*takes a High Council seat.*gains 2 persuasion/i);
  const corrinthCouncilSkipped = state.skipPayResourceForHighCouncilSeat(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
  );
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).resources.solari, 5, "Skipping Corrinth City High Council should keep Solari");
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).persuasion, 5, "Skipping Corrinth City High Council should keep +5 persuasion");
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).highCouncilSeat, false, "Skipping Corrinth City High Council should not take a seat");
  const { cardId: _corrinthHighCouncilCardId, ...corrinthMissingCardPending } = corrinthRevealed.pendingAction;
  const corrinthMissingCardIdState = {
    ...corrinthRevealed,
    pendingAction: corrinthMissingCardPending,
    pendingQueue: [],
  };
  const corrinthMissingCardIdResolved = state.resolvePayResourceForHighCouncilSeatChoice(
    corrinthMissingCardIdState,
    corrinthMissingCardIdState.pendingAction,
  );
  assert.equal(
    playerById(corrinthMissingCardIdResolved, p2.id).highCouncilSeat,
    false,
    "Corrinth City High Council payment should reject malformed pendings without a source card id",
  );
  assert.equal(
    playerById(corrinthMissingCardIdResolved, p2.id).resources.solari,
    5,
    "Malformed Corrinth City High Council payment should not spend Solari",
  );
  const corrinthFullCouncilFixture = {
    ...corrinthRevealFixture,
    players: corrinthRevealFixture.players.map((player) =>
      ["p1", "p3", "p4", "p5"].includes(player.id)
        ? { ...player, highCouncilSeat: true }
        : player.id === p2.id
          ? { ...player, highCouncilSeat: false }
          : player
    ),
  };
  const corrinthFullCouncilPlan = turnActions.revealTurnPlan(
    playerById(corrinthFullCouncilFixture, p2.id),
    corrinthFullCouncilFixture,
  );
  const corrinthFullCouncilRevealed = turnActions.revealTurnAction(corrinthFullCouncilFixture, {
    commanderTargets: {},
    revealPlan: corrinthFullCouncilPlan,
  });
  assert.equal(corrinthFullCouncilRevealed.pendingAction, undefined, "Corrinth City should not queue High Council payment when seats are full");
  const deliveryReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [deliveryAgreement], highCouncilSeat: false },
    game,
  );
  assert.equal(deliveryReveal.revealGain.spice, 1, "Delivery Agreement should resolve its default Reveal spice reward");
  const deliveryCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const deliveryRevealFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts,
    discard: [],
    hand: [deliveryAgreement],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    revealed: false,
    vp: 0,
  }));
  const deliveryRevealActionPlan = turnActions.revealTurnPlan(
    playerById(deliveryRevealFixture, p2.id),
    deliveryRevealFixture,
  );
  const deliveryRevealed = turnActions.revealTurnAction(deliveryRevealFixture, {
    commanderTargets: {},
    revealPlan: deliveryRevealActionPlan,
  });
  assert.deepEqual(
    deliveryRevealed.pendingAction,
    {
      kind: "trash-card",
      ownerId: p2.id,
      source: "Delivery Agreement",
      optional: true,
      zones: ["playArea"],
      requiredCardId: deliveryAgreement.id,
      vpReward: 1,
    },
    "Delivery Agreement should queue its completed-contract Reveal source-trash VP branch",
  );
  assert.equal(playerById(deliveryRevealed, p2.id).resources.spice, 1, "Delivery Agreement should gain Reveal spice before optional trash");
  const deliveryVpTrashed = state.trashPlayerCard(
    deliveryRevealed,
    deliveryRevealed.pendingAction,
    "playArea",
    deliveryAgreement.id,
    0,
  );
  assert.equal(deliveryVpTrashed.pendingAction, undefined, "Delivery Agreement Reveal trash should resolve its pending action");
  assert.equal(playerById(deliveryVpTrashed, p2.id).vp, 1, "Delivery Agreement Reveal trash should gain 1 VP");
  assert.equal(
    playerById(deliveryVpTrashed, p2.id).playArea.some((card) => card.id === deliveryAgreement.id),
    false,
    "Delivery Agreement Reveal trash should remove the source card from play",
  );
  const deliveryVpSkipped = state.skipTrashCard(deliveryRevealed, deliveryRevealed.pendingAction);
  assert.equal(playerById(deliveryVpSkipped, p2.id).vp, 0, "Skipping Delivery Agreement Reveal trash should not gain VP");
  assert.equal(
    playerById(deliveryVpSkipped, p2.id).playArea.some((card) => card.id === deliveryAgreement.id),
    true,
    "Skipping Delivery Agreement Reveal trash should leave the source card in play",
  );
  const malformedVpTrashPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Malformed VP Trash",
    optional: true,
    zones: ["hand"],
    vpReward: 1,
  };
  const malformedVpTrashFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      discard: [],
      hand: [dagger],
      playArea: [],
      vp: 0,
    })),
    pendingAction: malformedVpTrashPending,
    pendingQueue: [],
  };
  const malformedVpTrashResolved = state.trashPlayerCard(
    malformedVpTrashFixture,
    malformedVpTrashPending,
    "hand",
    dagger.id,
    0,
  );
  assert.equal(
    playerById(malformedVpTrashResolved, p2.id).vp,
    0,
    "Trash-card VP rewards should only apply to source-card play-area trash pendings",
  );
  const deliveryUndercontractedFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts.slice(0, 3),
    hand: [deliveryAgreement],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const deliveryUndercontractedPlan = turnActions.revealTurnPlan(
    playerById(deliveryUndercontractedFixture, p2.id),
    deliveryUndercontractedFixture,
  );
  const deliveryUndercontractedRevealed = turnActions.revealTurnAction(deliveryUndercontractedFixture, {
    commanderTargets: {},
    revealPlan: deliveryUndercontractedPlan,
  });
  assert.equal(deliveryUndercontractedRevealed.pendingAction, undefined, "Delivery Agreement should not queue Reveal trash below four completed contracts");
  const corrinthAcquireReplacement = data.imperiumDeck.find((card) => card.id !== corrinthCity.id);
  const deliveryAcquireReplacement = data.imperiumDeck.find((card) => card.id !== deliveryAgreement.id);
  assert.ok(corrinthAcquireReplacement && deliveryAcquireReplacement, "Expected Imperium Row replacements for discard-reward acquisition coverage");
  const corrinthAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: corrinthCity.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [corrinthCity],
      marketDeck: [corrinthAcquireReplacement],
    },
    p2.id,
    corrinthCity.id,
  );
  assert.equal(playerById(corrinthAcquired, p2.id).vp, 0, "Acquiring Corrinth City should not award its Agent VP");
  const deliveryAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: deliveryAgreement.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [deliveryAgreement],
      marketDeck: [deliveryAcquireReplacement],
    },
    p2.id,
    deliveryAgreement.id,
  );
  assert.equal(playerById(deliveryAcquired, p2.id).vp, 0, "Acquiring Delivery Agreement should not award its conditional Reveal VP");

  const corrinthCitySpace = {
    id: "corrinth-city-test-space",
    name: "Corrinth City Test Space",
    zone: "Emperor",
    icon: "emperor",
    detail: "Verifier-only Emperor space without board pending rewards.",
  };
  const corrinthDiscardOne = { ...dagger, id: "corrinth-city-discard-one" };
  const corrinthDiscardTwo = { ...convincingArgument, id: "corrinth-city-discard-two" };
  const corrinthPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        discard: [],
        hand: [corrinthCity, corrinthDiscardOne, corrinthDiscardTwo],
        playArea: [],
        resources: { solari: 5, spice: 0, water: 0 },
        vp: 0,
      })),
    },
    {
      commanderTargets: {},
      selectedCard: corrinthCity,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.deepEqual(
    corrinthPlaced.pendingAction,
    {
      kind: "discard-cards-for-reward",
      ownerId: p2.id,
      source: "Corrinth City",
      remaining: 2,
      total: 2,
      cost: { solari: 5 },
      gain: {},
      gainVp: 1,
      optional: false,
    },
    "Corrinth City should queue a two-card discard payment after Agent placement",
  );
  const corrinthAfterFirstDiscard = state.resolveDiscardCardsForRewardChoice(
    corrinthPlaced,
    corrinthPlaced.pendingAction,
    corrinthDiscardOne.id,
  );
  assert.equal(corrinthAfterFirstDiscard.pendingAction?.kind, "discard-cards-for-reward");
  assert.equal(corrinthAfterFirstDiscard.pendingAction?.remaining, 1, "Corrinth City should require its second discard before reward");
  assert.equal(playerById(corrinthAfterFirstDiscard, p2.id).resources.solari, 5, "Corrinth City should not spend Solari before the final discard");
  assert.equal(playerById(corrinthAfterFirstDiscard, p2.id).vp, 0, "Corrinth City should not grant VP before the final discard");
  const corrinthResolved = state.resolveDiscardCardsForRewardChoice(
    corrinthAfterFirstDiscard,
    corrinthAfterFirstDiscard.pendingAction,
    corrinthDiscardTwo.id,
  );
  assert.equal(corrinthResolved.pendingAction, undefined, "Corrinth City should clear its pending action after two discards");
  assert.equal(playerById(corrinthResolved, p2.id).resources.solari, 0, "Corrinth City should spend 5 Solari after its discards");
  assert.equal(playerById(corrinthResolved, p2.id).vp, 1, "Corrinth City should grant 1 VP after its discards and Solari payment");
  assert.deepEqual(
    playerById(corrinthResolved, p2.id).discard.slice(-2).map((card) => card.id),
    [corrinthDiscardOne.id, corrinthDiscardTwo.id],
    "Corrinth City should discard both selected hand cards",
  );
  assert.match(corrinthResolved.log[0], /resolves Corrinth City: discards .* and spends 5 Solari; gains 1 VP/);

  const deliveryAgreementSpace = {
    id: "delivery-agreement-test-space",
    name: "Delivery Agreement Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only City space without board pending rewards.",
  };
  const deliveryDiscard = { ...dagger, id: "delivery-agreement-discard-card" };
  const deliveryOffer = data.standardContracts[11];
  const deliveryReplacement = data.standardContracts[12];
  assert.ok(deliveryOffer && deliveryReplacement, "Expected standard contracts for Delivery Agreement coverage");
  const deliveryPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      contractOffer: [deliveryOffer],
      contractDeck: [deliveryReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: deliveryAgreement,
      selectedSpace: deliveryAgreementSpace,
    },
  );
  assert.deepEqual(
    deliveryPlaced.pendingAction,
    {
      kind: "discard-cards-for-reward",
      ownerId: p2.id,
      source: "Delivery Agreement",
      remaining: 1,
      total: 1,
      cost: {},
      gain: {},
      gainVp: 0,
      takeContracts: { amount: 1, sourcePool: "public-offer" },
      optional: false,
    },
    "Delivery Agreement should queue a discard before the public contract choice",
  );
  const deliveryDiscarded = state.resolveDiscardCardsForRewardChoice(
    deliveryPlaced,
    deliveryPlaced.pendingAction,
    deliveryDiscard.id,
  );
  assert.deepEqual(
    deliveryDiscarded.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Delivery Agreement", publicOnly: true },
    "Delivery Agreement should queue its public CHOAM contract after the discard resolves",
  );
  assert.equal(playerById(deliveryDiscarded, p2.id).discard.at(-1)?.id, deliveryDiscard.id, "Delivery Agreement should discard the selected card");
  assert.equal(playerById(deliveryDiscarded, p2.id).vp, 0, "Delivery Agreement Agent text should not grant VP");
  const deliveryResolved = state.takeChoamContract(
    deliveryDiscarded,
    deliveryDiscarded.pendingAction,
    deliveryOffer.id,
  );
  assert.equal(deliveryResolved.pendingAction, undefined);
  assert.equal(playerById(deliveryResolved, p2.id).contracts.at(-1)?.card.id, deliveryOffer.id);
  assert.deepEqual(
    deliveryResolved.contractOffer.map((contract) => contract.id),
    [deliveryReplacement.id],
    "Delivery Agreement should refill the public contract offer after taking a contract",
  );
  const deliveryNoOfferPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: deliveryAgreement,
      selectedSpace: deliveryAgreementSpace,
    },
  );
  assert.equal(deliveryNoOfferPlaced.pendingAction, undefined, "Delivery Agreement should not ask for a discard when no face-up contracts remain");
  assert.equal(
    playerById(deliveryNoOfferPlaced, p2.id).hand.some((card) => card.id === deliveryDiscard.id),
    true,
    "Delivery Agreement should leave discard choices in hand when no face-up contracts remain",
  );
}
