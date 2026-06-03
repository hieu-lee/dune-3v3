import assert from "node:assert/strict";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";
export function verifyImperiumCardMarketContractEffects({
  cards,
  data,
  game,
  playerId,
  spaces,
  state,
  turnActions,
}) {
  const {
    corrinthCity,
    deliveryAgreement,
    interstellarTrade,
    priorityContracts,
    smuggler,
  } = cards;
  const { imperialBasin } = spaces;
  const p2 = playerById(game, playerId);
  const noMakerReveal = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const noMakerPlan = turnActions.revealTurnPlan(
    playerById(noMakerReveal, p2.id),
    noMakerReveal,
  );
  assert.equal(
    noMakerPlan.persuasion,
    1,
    "Smuggler's Harvester should reveal for 1 persuasion",
  );
  assert.equal(
    noMakerPlan.revealGain.spice ?? 0,
    0,
    "Smuggler's Harvester should not pay spice on Reveal",
  );
  const makerAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const afterMakerAgent = turnActions.placeAgentAction(makerAgentFixture, {
    commanderTargets: {},
    selectedCard: smuggler,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    state.hasVisitedMakerSpaceThisRound(afterMakerAgent, p2.id),
    true,
    "Sending an Agent to a Maker board space should mark that player for round reveal checks",
  );
  assert.equal(
    playerById(afterMakerAgent, p2.id).resources.spice,
    2,
    "Imperial Basin plus Smuggler's Harvester should pay 2 total spice",
  );
  assert.deepEqual(
    afterMakerAgent.pendingAction,
    undefined,
    "Zero garrison should avoid a deployment pending action",
  );
  const revealFixture = withActivePlayer(
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
    p2.id,
    () => ({
      agentsReady: 0,
      discard: [],
      hand: [smuggler],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    }),
  );
  const makerPlan = turnActions.revealTurnPlan(
    playerById(revealFixture, p2.id),
    revealFixture,
  );
  assert.equal(
    makerPlan.persuasion,
    1,
    "Smuggler's Harvester should still reveal for 1 persuasion",
  );
  assert.equal(
    makerPlan.revealGain.spice ?? 0,
    0,
    "Smuggler's Harvester should not add reveal spice after a Maker visit",
  );
  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: {},
    revealPlan: makerPlan,
  });
  assert.equal(
    playerById(revealed, p2.id).resources.spice,
    0,
    "Smuggler's Harvester should not add spice on Reveal",
  );
  assert.equal(
    revealed.turnSpiceGains[p2.id] ?? 0,
    0,
    "Smuggler's Harvester Reveal should not count spice gain",
  );
  assert.equal(playerById(revealed, p2.id).persuasion, 1);
  assert.deepEqual(
    playerById(revealed, p2.id).hand,
    [],
    "Reveal should move Smuggler's Harvester from hand",
  );
  assert.ok(
    playerById(revealed, p2.id).playArea.some(
      (card) => card.id === smuggler.id,
    ),
    "Reveal should put Smuggler's Harvester into play area",
  );
  const completedContracts = data.standardContracts
    .slice(0, 2)
    .map((card, index) => ({
      card,
      completed: true,
      takenRound: index + 1,
    }));
  const incompleteContract = {
    card: data.standardContracts[2],
    completed: false,
    takenRound: 1,
  };
  assert.ok(
    incompleteContract.card,
    "Expected a third standard contract for Interstellar Trade coverage",
  );
  const interstellarFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    contracts: [...completedContracts, incompleteContract],
    discard: [],
    hand: [interstellarTrade],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const interstellarPlan = turnActions.revealTurnPlan(
    playerById(interstellarFixture, p2.id),
    interstellarFixture,
  );
  assert.equal(
    interstellarPlan.persuasion,
    2,
    "Interstellar Trade should reveal for 1 persuasion per completed contract",
  );
  assert.deepEqual(
    interstellarPlan.printedRevealCards,
    [],
    "Interstellar Trade should not require a manual printed reveal adjustment",
  );
  const interstellarRevealed = turnActions.revealTurnAction(
    interstellarFixture,
    {
      commanderTargets: {},
      revealPlan: interstellarPlan,
    },
  );
  assert.equal(playerById(interstellarRevealed, p2.id).persuasion, 2);
  assert.equal(
    interstellarRevealed.pendingAction,
    undefined,
    "Interstellar Trade reveal should not pause for printed text",
  );
  const lateCompletedContract = {
    card: data.standardContracts[3],
    completed: true,
    takenRound: 1,
  };
  assert.ok(
    lateCompletedContract.card,
    "Expected a fourth standard contract for Interstellar Trade one-shot coverage",
  );
  const afterLateCompletion = {
    ...interstellarRevealed,
    players: interstellarRevealed.players.map((player) =>
      player.id === p2.id
        ? { ...player, contracts: [...player.contracts, lateCompletedContract] }
        : player,
    ),
  };
  assert.equal(
    playerById(afterLateCompletion, p2.id).persuasion,
    2,
    "Interstellar Trade persuasion should be fixed by the reveal plan and not re-count later contract completions",
  );
  const interstellarAcquireReplacement = data.imperiumDeck.find(
    (card) => card.id !== interstellarTrade.id,
  );
  const interstellarAcquireContract = data.standardContracts[4];
  const interstellarAcquireContractReplacement = data.standardContracts[5];
  assert.ok(
    interstellarAcquireReplacement,
    "Expected an Imperium Row replacement for Interstellar Trade acquisition coverage",
  );
  assert.ok(
    interstellarAcquireContract,
    "Expected a public contract for Interstellar Trade acquisition coverage",
  );
  assert.ok(
    interstellarAcquireContractReplacement,
    "Expected a public contract replacement for Interstellar Trade acquisition coverage",
  );
  const interstellarAcquireBase = withActivePlayer(game, p2.id, () => ({
    contracts: [],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 1 },
    persuasion: interstellarTrade.cost,
    playArea: [],
    revealed: true,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const interstellarAcquireFixture = {
    ...interstellarAcquireBase,
    imperiumRow: [interstellarTrade],
    marketDeck: [interstellarAcquireReplacement],
    contractOffer: [interstellarAcquireContract],
    contractDeck: [interstellarAcquireContractReplacement],
  };
  const interstellarAcquired = state.acquireMarketCard(
    interstellarAcquireFixture,
    p2.id,
    interstellarTrade.id,
  );
  assert.equal(
    playerById(interstellarAcquired, p2.id).discard.at(-1)?.id,
    interstellarTrade.id,
  );
  assert.equal(playerById(interstellarAcquired, p2.id).persuasion, 0);
  assert.equal(
    interstellarAcquired.pendingAction?.kind,
    "board-influence-choice",
  );
  assert.equal(interstellarAcquired.pendingAction.sourceTrigger, "acquire");
  assert.equal(interstellarAcquired.pendingAction.source, "Interstellar Trade");
  assert.equal(interstellarAcquired.pendingAction.cardId, interstellarTrade.id);
  assert.deepEqual(
    interstellarAcquired.pendingAction.choices.map(
      (choice) => `${choice.ownerId}:${choice.faction}`,
    ),
    [
      `${p2.id}:greatHouses`,
      `${p2.id}:spacing`,
      `${p2.id}:bene`,
      `${p2.id}:fringeWorlds`,
    ],
    "Interstellar Trade should offer main-board Influence choices to an Ally buyer",
  );
  assert.deepEqual(
    interstellarAcquired.pendingQueue,
    [
      {
        kind: "contract",
        ownerId: p2.id,
        source: "Interstellar Trade",
        publicOnly: true,
      },
    ],
    "Interstellar Trade should queue its face-up CHOAM contract after the Influence choice",
  );
  const forgedInterstellarAcquirePending = {
    ...interstellarAcquired.pendingAction,
    cardId: "missing-interstellar-trade-card",
  };
  const forgedInterstellarAcquireFixture = {
    ...interstellarAcquired,
    pendingAction: forgedInterstellarAcquirePending,
  };
  const forgedInterstellarAcquireResolved = state.resolveBoardInfluenceChoice(
    forgedInterstellarAcquireFixture,
    forgedInterstellarAcquirePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedInterstellarAcquireResolved,
    forgedInterstellarAcquireFixture,
    "Acquire Influence pendings should require the acquired source card to carry the matching spec",
  );
  const interstellarInfluenceResolved = state.resolveBoardInfluenceChoice(
    interstellarAcquired,
    interstellarAcquired.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(
    playerById(interstellarInfluenceResolved, p2.id).influence.bene,
    2,
  );
  assert.equal(playerById(interstellarInfluenceResolved, p2.id).vp, 1);
  assert.equal(interstellarInfluenceResolved.pendingAction?.kind, "contract");
  const interstellarContractResolved = state.takeChoamContract(
    interstellarInfluenceResolved,
    interstellarInfluenceResolved.pendingAction,
    interstellarAcquireContract.id,
  );
  assert.equal(interstellarContractResolved.pendingAction, undefined);
  assert.equal(
    playerById(interstellarContractResolved, p2.id).contracts.at(-1)?.card.id,
    interstellarAcquireContract.id,
  );
  assert.deepEqual(
    interstellarContractResolved.contractOffer.map((contract) => contract.id),
    [interstellarAcquireContractReplacement.id],
    "Interstellar Trade contract acquisition should refill the public offer",
  );
  const noPublicInterstellarAcquired = state.acquireMarketCard(
    {
      ...interstellarAcquireBase,
      imperiumRow: [interstellarTrade],
      marketDeck: [interstellarAcquireReplacement],
      contractOffer: [],
      contractDeck: [],
    },
    p2.id,
    interstellarTrade.id,
  );
  assert.equal(
    noPublicInterstellarAcquired.pendingAction?.kind,
    "board-influence-choice",
  );
  assert.deepEqual(
    noPublicInterstellarAcquired.pendingQueue,
    [],
    "Interstellar Trade should not queue a contract choice when no face-up contracts remain",
  );
  const priorityContractsSpace = {
    id: "priority-contracts-test-space",
    name: "Priority Contracts Test Space",
    zone: "Landsraad",
    icon: "landsraad",
    detail: "Verifier-only Landsraad space without board pending rewards.",
  };
  const priorityContractsOffer = data.standardContracts[6];
  const priorityContractsReplacement = data.standardContracts[7];
  assert.ok(
    priorityContractsOffer && priorityContractsReplacement,
    "Expected standard contracts for Priority Contracts coverage",
  );
  const priorityContractsPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsOffer],
      contractDeck: [priorityContractsReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.deepEqual(
    priorityContractsPlaced.pendingAction,
    {
      kind: "contract",
      ownerId: p2.id,
      source: "Priority Contracts",
      publicOnly: true,
    },
    "Priority Contracts should queue a public CHOAM contract after Agent placement",
  );
  assert.equal(
    playerById(priorityContractsPlaced, p2.id).resources.spice,
    3,
    "Priority Contracts should grant 2 spice immediately",
  );
  assert.equal(
    playerById(priorityContractsPlaced, p2.id).vp,
    1,
    "Priority Contracts should grant 1 VP immediately",
  );
  assert.match(
    priorityContractsPlaced.log[0],
    /Priority Contracts: gains 2 spice; gains 1 VP/,
  );
  const priorityContractsResolved = state.takeChoamContract(
    priorityContractsPlaced,
    priorityContractsPlaced.pendingAction,
    priorityContractsOffer.id,
  );
  assert.equal(priorityContractsResolved.pendingAction, undefined);
  assert.equal(
    playerById(priorityContractsResolved, p2.id).contracts.at(-1)?.card.id,
    priorityContractsOffer.id,
  );
  assert.deepEqual(
    priorityContractsResolved.contractOffer.map((contract) => contract.id),
    [priorityContractsReplacement.id],
    "Priority Contracts should refill the public contract offer after taking a contract",
  );
  const priorityContractsNoOffer = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.equal(
    priorityContractsNoOffer.pendingAction,
    undefined,
    "Priority Contracts should not queue when no public contracts remain",
  );
  assert.equal(
    playerById(priorityContractsNoOffer, p2.id).resources.spice,
    3,
    "Priority Contracts no-offer path should still grant spice",
  );
  assert.equal(
    playerById(priorityContractsNoOffer, p2.id).vp,
    1,
    "Priority Contracts no-offer path should still grant VP",
  );
  const corrinthReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [corrinthCity], highCouncilSeat: false },
    game,
  );
  assert.equal(
    corrinthReveal.persuasion,
    5,
    "Corrinth City should resolve its typed +5 persuasion Reveal branch",
  );
  const corrinthRevealFixture = withActivePlayer(game, p2.id, () => ({
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
    "pay-resource-for-high-council-seat",
    "Corrinth City should queue High Council payment on Reveal",
  );
  const corrinthCouncilPaid = state.resolvePayResourceForHighCouncilSeatChoice(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
  );
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).highCouncilSeat,
    true,
    "Corrinth City Reveal payment should take High Council seat",
  );
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).resources.solari,
    0,
    "Corrinth City Reveal payment should spend 5 Solari",
  );
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).persuasion,
    2,
    "Corrinth City Reveal payment should leave the current High Council +2 persuasion",
  );
  const deliveryReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [deliveryAgreement], highCouncilSeat: false },
    game,
  );
  assert.equal(
    deliveryReveal.revealGain.spice,
    1,
    "Delivery Agreement should resolve its typed Reveal spice reward",
  );
  const deliveryCompletedContracts = data.standardContracts
    .slice(0, 4)
    .map((card, index) => ({
      card,
      completed: true,
      takenRound: index + 1,
    }));
  const deliveryRevealFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts,
    discard: [],
    hand: [deliveryAgreement],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
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
    "trash-card",
    "Delivery Agreement should queue completed-contract Reveal trash",
  );
  assert.equal(
    deliveryRevealed.pendingAction?.vpReward,
    1,
    "Delivery Agreement Reveal trash should carry VP reward",
  );
  const deliveryVpTrashed = state.trashPlayerCard(
    deliveryRevealed,
    deliveryRevealed.pendingAction,
    "playArea",
    deliveryAgreement.id,
    0,
  );
  assert.equal(
    playerById(deliveryVpTrashed, p2.id).vp,
    1,
    "Delivery Agreement Reveal trash should gain 1 VP",
  );
  const discardBase = data.allyStarterCards.find(
    (card) => card.name === "Dagger",
  );
  const discardBaseTwo = data.allyStarterCards.find(
    (card) => card.name === "Convincing Argument",
  );
  assert.ok(
    discardBase && discardBaseTwo,
    "Expected starter discard fixtures for discard-reward coverage",
  );
  const corrinthCitySpace = {
    id: "corrinth-city-test-space",
    name: "Corrinth City Test Space",
    zone: "Emperor",
    icon: "emperor",
    detail: "Verifier-only Emperor space without board pending rewards.",
  };
  const corrinthDiscardOne = {
    ...discardBase,
    id: "corrinth-city-discard-one",
  };
  const corrinthDiscardTwo = {
    ...discardBaseTwo,
    id: "corrinth-city-discard-two",
  };
  const corrinthPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [corrinthCity, corrinthDiscardOne, corrinthDiscardTwo],
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
      vp: 0,
    })),
    {
      commanderTargets: {},
      selectedCard: corrinthCity,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.equal(
    corrinthPlaced.pendingAction?.kind,
    "discard-cards-for-reward",
    "Corrinth City should queue discard-for-reward",
  );
  assert.equal(corrinthPlaced.pendingAction?.remaining, 2);
  const corrinthAfterFirstDiscard = state.resolveDiscardCardsForRewardChoice(
    corrinthPlaced,
    corrinthPlaced.pendingAction,
    corrinthDiscardOne.id,
  );
  const corrinthResolved = state.resolveDiscardCardsForRewardChoice(
    corrinthAfterFirstDiscard,
    corrinthAfterFirstDiscard.pendingAction,
    corrinthDiscardTwo.id,
  );
  assert.equal(
    corrinthResolved.pendingAction,
    undefined,
    "Corrinth City should resolve after two discards",
  );
  assert.equal(
    playerById(corrinthResolved, p2.id).resources.solari,
    0,
    "Corrinth City should spend 5 Solari",
  );
  assert.equal(
    playerById(corrinthResolved, p2.id).vp,
    1,
    "Corrinth City should grant 1 VP",
  );
  const deliveryAgreementSpace = {
    id: "delivery-agreement-test-space",
    name: "Delivery Agreement Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only City space without board pending rewards.",
  };
  const deliveryDiscard = {
    ...discardBase,
    id: "delivery-agreement-discard-card",
  };
  const deliveryOffer = data.standardContracts[11];
  const deliveryReplacement = data.standardContracts[12];
  assert.ok(
    deliveryOffer && deliveryReplacement,
    "Expected standard contracts for Delivery Agreement coverage",
  );
  const deliveryPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
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
  assert.equal(
    deliveryPlaced.pendingAction?.kind,
    "discard-cards-for-reward",
    "Delivery Agreement should queue discard-for-reward",
  );
  const deliveryDiscarded = state.resolveDiscardCardsForRewardChoice(
    deliveryPlaced,
    deliveryPlaced.pendingAction,
    deliveryDiscard.id,
  );
  assert.deepEqual(
    deliveryDiscarded.pendingAction,
    {
      kind: "contract",
      ownerId: p2.id,
      source: "Delivery Agreement",
      publicOnly: true,
    },
    "Delivery Agreement should queue a public contract after its discard",
  );
  const deliveryResolved = state.takeChoamContract(
    deliveryDiscarded,
    deliveryDiscarded.pendingAction,
    deliveryOffer.id,
  );
  assert.equal(
    playerById(deliveryResolved, p2.id).contracts.at(-1)?.card.id,
    deliveryOffer.id,
  );
  assert.deepEqual(
    deliveryResolved.contractOffer.map((contract) => contract.id),
    [deliveryReplacement.id],
    "Delivery Agreement should refill the public offer after taking a contract",
  );
}
