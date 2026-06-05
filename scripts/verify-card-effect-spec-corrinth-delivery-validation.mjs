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
  assert.equal(corrinthReveal.persuasion, 0, "Corrinth City should not resolve printed 5 Solari as persuasion");
  assert.equal(corrinthReveal.revealGain.solari ?? 0, 0, "Corrinth City should not auto-gain Solari before its Reveal choice");
  const corrinthSolariFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [corrinthCity],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    revealed: false,
  }));
  const corrinthSolariPlan = turnActions.revealTurnPlan(
    playerById(corrinthSolariFixture, p2.id),
    corrinthSolariFixture,
  );
  const corrinthSolariRevealed = turnActions.revealTurnAction(corrinthSolariFixture, {
    commanderTargets: {},
    revealPlan: corrinthSolariPlan,
  });
  assert.equal(
    corrinthSolariRevealed.pendingAction?.kind,
    "pending-action-choice",
    "Corrinth City should queue a Reveal branch choice",
  );
  assert.deepEqual(
    corrinthSolariRevealed.pendingAction.options.map((option) => option.id),
    ["solari"],
    "Corrinth City should expose only the Solari branch when the High Council branch is not payable",
  );
  assert.equal(
    state.skipPendingActionChoice(corrinthSolariRevealed, corrinthSolariRevealed.pendingAction),
    corrinthSolariRevealed,
    "Corrinth City's mandatory Reveal branch choice should not be skippable",
  );
  const corrinthSolariChosen = state.resolvePendingActionChoice(
    corrinthSolariRevealed,
    corrinthSolariRevealed.pendingAction,
    "solari",
  );
  assert.equal(corrinthSolariChosen.pendingAction, undefined, "Corrinth City Solari branch should resolve its choice");
  assert.equal(playerById(corrinthSolariChosen, p2.id).resources.solari, 5, "Corrinth City Solari branch should gain 5 Solari");
  assert.equal(playerById(corrinthSolariChosen, p2.id).persuasion, 0, "Corrinth City Solari branch should not gain persuasion");
  assert.equal(playerById(corrinthSolariChosen, p2.id).highCouncilSeat, false, "Corrinth City Solari branch should not take a High Council seat");
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
  assert.equal(
    corrinthRevealed.pendingAction?.kind,
    "pending-action-choice",
    "Corrinth City should queue payable Reveal branches",
  );
  assert.deepEqual(
    corrinthRevealed.pendingAction.options.map((option) => option.id),
    ["solari", "high-council"],
    "Corrinth City should offer Solari or High Council when the branch is payable",
  );
  assert.deepEqual(
    corrinthRevealed.pendingAction.options.find((option) => option.id === "high-council")?.pending,
    {
      kind: "pay-resource-for-high-council-seat",
      ownerId: p2.id,
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionCost: 0,
      persuasionReward: 2,
      source: "Corrinth City",
      cardId: corrinthCity.id,
    },
    "Corrinth City High Council choice should require pre-existing Solari and award the current High Council persuasion",
  );
  assert.equal(playerById(corrinthRevealed, p2.id).persuasion, 0, "Corrinth City should not add persuasion before branch choice");
  const corrinthCouncilPaid = state.resolvePendingActionChoice(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
    "high-council",
  );
  assert.equal(corrinthCouncilPaid.pendingAction, undefined, "Corrinth City High Council branch should resolve its choice");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).resources.solari, 0, "Corrinth City High Council branch should spend 5 Solari");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).highCouncilSeat, true, "Corrinth City High Council branch should take a seat");
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).persuasion,
    2,
    "Corrinth City High Council branch should add the current High Council +2 persuasion",
  );
  assert.match(corrinthCouncilPaid.log[0], /chooses .*High Council.*spends 5 solari.*takes a High Council seat.*gains 2 persuasion/i);
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
  assert.deepEqual(
    corrinthFullCouncilRevealed.pendingAction?.kind === "pending-action-choice"
      ? corrinthFullCouncilRevealed.pendingAction.options.map((option) => option.id)
      : [],
    ["solari"],
    "Corrinth City should only offer the Solari branch when High Council seats are full",
  );
  const deliveryReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [deliveryAgreement], highCouncilSeat: false },
    game,
  );
  assert.equal(deliveryReveal.revealGain.spice ?? 0, 0, "Delivery Agreement should not auto-gain spice before its Reveal choice");
  const deliverySpiceFixture = withActivePlayer(game, p2.id, () => ({
    discard: [],
    hand: [deliveryAgreement],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const deliverySpicePlan = turnActions.revealTurnPlan(
    playerById(deliverySpiceFixture, p2.id),
    deliverySpiceFixture,
  );
  const deliverySpiceRevealed = turnActions.revealTurnAction(deliverySpiceFixture, {
    commanderTargets: {},
    revealPlan: deliverySpicePlan,
  });
  assert.equal(deliverySpiceRevealed.pendingAction?.kind, "pending-action-choice", "Delivery Agreement should queue a Reveal choice");
  assert.deepEqual(
    deliverySpiceRevealed.pendingAction.options.map((option) => option.id),
    ["spice"],
    "Delivery Agreement should expose only its spice branch without completed contracts",
  );
  const deliverySpiceChosen = state.resolvePendingActionChoice(
    deliverySpiceRevealed,
    deliverySpiceRevealed.pendingAction,
    "spice",
  );
  assert.equal(playerById(deliverySpiceChosen, p2.id).resources.spice, 1, "Delivery Agreement spice branch should gain spice");
  assert.equal(deliverySpiceChosen.turnSpiceGains[p2.id], 1, "Delivery Agreement spice branch should count as turn spice gain");
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
  assert.equal(
    deliveryRevealed.pendingAction?.kind,
    "pending-action-choice",
    "Delivery Agreement should queue completed-contract Reveal branch choices",
  );
  assert.deepEqual(
    deliveryRevealed.pendingAction.options.map((option) => option.id),
    ["spice", "vp"],
    "Delivery Agreement should offer spice or source-trash VP with four completed contracts",
  );
  assert.equal(
    state.skipPendingActionChoice(deliveryRevealed, deliveryRevealed.pendingAction),
    deliveryRevealed,
    "Delivery Agreement's mandatory Reveal branch choice should not be skippable",
  );
  const deliveryVpChoice = state.resolvePendingActionChoice(
    deliveryRevealed,
    deliveryRevealed.pendingAction,
    "vp",
  );
  assert.deepEqual(
    deliveryVpChoice.pendingAction,
    {
      kind: "trash-card",
      ownerId: p2.id,
      source: "Delivery Agreement",
      optional: false,
      zones: ["playArea"],
      requiredCardId: deliveryAgreement.id,
      vpReward: 1,
    },
    "Delivery Agreement VP branch should queue source-card trash",
  );
  assert.equal(playerById(deliveryVpChoice, p2.id).resources.spice, 0, "Delivery Agreement VP branch should not gain spice");
  assert.equal(deliveryVpChoice.turnSpiceGains[p2.id] ?? 0, 0, "Delivery Agreement VP branch should not count as turn spice gain");
  const deliveryVpTrashed = state.trashPlayerCard(
    deliveryVpChoice,
    deliveryVpChoice.pendingAction,
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
  assert.equal(
    deliveryUndercontractedRevealed.pendingAction?.kind,
    "pending-action-choice",
    "Delivery Agreement should still offer its spice branch below four completed contracts",
  );
  assert.deepEqual(
    deliveryUndercontractedRevealed.pendingAction.options.map((option) => option.id),
    ["spice"],
    "Delivery Agreement should not queue its Reveal VP branch below four completed contracts",
  );
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
