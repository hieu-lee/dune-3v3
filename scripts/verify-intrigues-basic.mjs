import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifyBasicPlotIntrigues({ cards, data, game, state }) {
  const {
    crysknife,
    leverage,
    manipulate,
    mercenaries,
  } = cards;

  const plotFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [crysknife, mercenaries] }
        : { ...candidate, intrigues: [] },
    ),
  };
  const playedPlot = state.playPlotBattleIconIntrigue(plotFixture, "p2", crysknife.id);
  assert.equal(playerById(playedPlot, "p2").vp, playerById(plotFixture, "p2").vp, "Plot battle-icon Intrigues should not score VP");
  assert.equal(playerById(playedPlot, "p2").resources.spice, playerById(plotFixture, "p2").resources.spice + 1, "Plot battle-icon Intrigues should gain 1 spice");
  assert.deepEqual(playerById(playedPlot, "p2").intrigues.map((card) => card.id), [mercenaries.id]);
  assert.equal(playedPlot.intrigueDiscard.at(-1).id, crysknife.id, "Played Plot Intrigue should go to discard");
  assert.match(playedPlot.log[0], /plays Crysknife as a Plot Intrigue for 1 spice/);

  const pendingPlot = {
    ...plotFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playPlotBattleIconIntrigue(pendingPlot, "p2", crysknife.id),
    pendingPlot,
    "Plot Intrigues should wait for pending actions to resolve",
  );
  const queuedPlot = {
    ...plotFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playPlotBattleIconIntrigue(queuedPlot, "p2", crysknife.id),
    queuedPlot,
    "Plot Intrigues should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p3", crysknife.id),
    plotFixture,
    "Only the active player should play Plot Intrigues",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p2", mercenaries.id),
    plotFixture,
    "Non-battle-icon Intrigues should not use the Plot battle-icon scorer",
  );

  const manipulateRowCard = data.imperiumDeck.find((card) => (card.cost ?? 0) > 0) ?? data.imperiumDeck[0];
  const manipulateReplacement = data.imperiumDeck.find((card) => card.id !== manipulateRowCard?.id);
  assert.ok(manipulateRowCard, "Expected an Imperium Row card for Manipulate");
  assert.ok(manipulateReplacement, "Expected an Imperium Row replacement card for Manipulate");
  const manipulateFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    imperiumRow: [manipulateRowCard],
    marketDeck: [manipulateReplacement],
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, discard: [], manipulatedCards: [], intrigues: [manipulate] }
        : { ...candidate, manipulatedCards: [], intrigues: [] },
    ),
  };
  assert.equal(
    state.isManipulateIntrigue(manipulate),
    true,
    "Manipulate should be recognized as a structured Plot Intrigue",
  );
  const manipulated = state.playManipulatePlotIntrigue(
    manipulateFixture,
    "p2",
    manipulate.id,
    manipulateRowCard.id,
  );
  assert.deepEqual(manipulated.imperiumRow.map((card) => card.id), [manipulateReplacement.id]);
  assert.deepEqual(playerById(manipulated, "p2").manipulatedCards.map((card) => card.id), [manipulateRowCard.id]);
  assert.deepEqual(playerById(manipulated, "p2").intrigues, []);
  assert.equal(manipulated.intrigueDiscard.at(-1).id, manipulate.id);
  assert.match(manipulated.log[0], /plays Manipulate, removes .* from the Imperium Row/);
  const manipulatedReveal = {
    ...manipulated,
    players: manipulated.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, revealed: true, persuasion: state.manipulateAcquisitionCost(manipulateRowCard) }
        : candidate,
    ),
  };
  const manipulatedBought = state.acquireMarketCard(manipulatedReveal, "p2", manipulateRowCard.id);
  assert.equal(playerById(manipulatedBought, "p2").discard.at(-1).id, manipulateRowCard.id);
  assert.equal(playerById(manipulatedBought, "p2").persuasion, 0, "Manipulate acquisition should spend the discounted cost");
  assert.deepEqual(playerById(manipulatedBought, "p2").manipulatedCards, []);
  assert.deepEqual(manipulatedBought.imperiumRow.map((card) => card.id), [manipulateReplacement.id]);
  const manipulatedCallToArms = {
    ...manipulatedReveal,
    players: manipulatedReveal.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, callToArmsActive: true, garrison: 2 }
        : candidate,
    ),
  };
  const manipulatedCallToArmsBought = state.acquireMarketCard(manipulatedCallToArms, "p2", manipulateRowCard.id);
  assert.equal(playerById(manipulatedCallToArmsBought, "p2").garrison, 3, "Call to Arms should recruit on Manipulate acquisition");
  const manipulatedSkipped = state.finishRevealTurn(
    {
      ...manipulated,
      players: manipulated.players.map((candidate) =>
        candidate.id === "p2" ? { ...candidate, revealed: true, agentsReady: 0 } : candidate,
      ),
    },
    "p2",
  );
  assert.deepEqual(playerById(manipulatedSkipped, "p2").manipulatedCards, [], "Reveal cleanup should clear unbought Manipulate cards");
  assert.equal(
    state.playManipulatePlotIntrigue(manipulateFixture, "p2", manipulate.id, "missing-card"),
    manipulateFixture,
    "Manipulate should reject cards outside the Imperium Row",
  );
  const pendingManipulate = {
    ...manipulateFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playManipulatePlotIntrigue(pendingManipulate, "p2", manipulate.id, manipulateRowCard.id),
    pendingManipulate,
    "Manipulate should wait for pending actions to resolve",
  );
  const queuedManipulate = {
    ...manipulateFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playManipulatePlotIntrigue(queuedManipulate, "p2", manipulate.id, manipulateRowCard.id),
    queuedManipulate,
    "Manipulate should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playManipulatePlotIntrigue(manipulateFixture, "p3", manipulate.id, manipulateRowCard.id),
    manipulateFixture,
    "Only the active player should play Manipulate",
  );
  assert.equal(
    state.playManipulatePlotIntrigue(manipulateFixture, "p2", mercenaries.id, manipulateRowCard.id),
    manipulateFixture,
    "Manipulate should reject other Intrigue cards",
  );
  const combatManipulate = { ...manipulateFixture, phase: "combat" };
  assert.equal(
    state.playManipulatePlotIntrigue(combatManipulate, "p2", manipulate.id, manipulateRowCard.id),
    combatManipulate,
    "Manipulate should only resolve during normal play",
  );

  const leverageContract = data.standardContracts[0];
  const leverageReplacement = data.standardContracts[1];
  assert.ok(leverageContract, "Expected a face-up contract for Leverage");
  assert.ok(leverageReplacement, "Expected a contract replacement for Leverage");
  const leverageFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: { p2: 1 },
    contractOffer: [leverageContract],
    contractDeck: [leverageReplacement],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 0 }, contracts: [], intrigues: [leverage] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(state.isLeverageIntrigue(leverage), true, "Leverage should be recognized as a structured Plot Intrigue");
  assert.equal(state.hasGainedSpiceThisTurn(leverageFixture, "p2"), true, "Leverage should detect turn spice gains");
  const leveraged = state.playLeveragePlotIntrigue(leverageFixture, "p2", leverage.id);
  assert.equal(playerById(leveraged, "p2").resources.solari, 1, "Leverage should gain 1 Solari");
  assert.deepEqual(playerById(leveraged, "p2").intrigues, []);
  assert.equal(leveraged.intrigueDiscard.at(-1).id, leverage.id);
  assert.deepEqual(
    leveraged.pendingAction,
    { kind: "contract", ownerId: "p2", source: "Leverage", publicOnly: true, optional: true },
    "Leverage should queue an optional public-only contract choice",
  );
  assert.match(leveraged.log[0], /plays Leverage, gains 1 Solari and may take a face-up CHOAM contract/);
  const leverageContractTaken = state.takeChoamContract(leveraged, leveraged.pendingAction, leverageContract.id);
  assert.equal(playerById(leverageContractTaken, "p2").contracts.at(-1).card.id, leverageContract.id);
  assert.deepEqual(leverageContractTaken.contractOffer.map((contract) => contract.id), [leverageReplacement.id]);
  assert.equal(leverageContractTaken.pendingAction, undefined);
  const leverageSkippedContract = state.finishPendingAction(leveraged);
  assert.equal(leverageSkippedContract.pendingAction, undefined, "Optional Leverage contract choice should be skippable");
  assert.equal(playerById(leverageSkippedContract, "p2").contracts.length, 0, "Skipping Leverage contract should not take a contract");
  assert.deepEqual(
    leverageSkippedContract.contractOffer.map((contract) => contract.id),
    [leverageContract.id],
    "Skipping Leverage contract should leave the public offer unchanged",
  );
  const shaddamReserved = playerById(game, "p4").reservedContracts[0];
  assert.ok(shaddamReserved, "Expected a reserved Shaddam contract");
  const reservedLeverage = {
    ...leveraged,
    players: leveraged.players.map((candidate) =>
      candidate.id === "p4" ? { ...candidate, reservedContracts: [shaddamReserved] } : candidate,
    ),
    pendingAction: { kind: "contract", ownerId: "p4", source: "Leverage", publicOnly: true },
  };
  assert.equal(
    state.takeChoamContract(reservedLeverage, reservedLeverage.pendingAction, shaddamReserved.id),
    reservedLeverage,
    "Leverage should not allow reserved contracts",
  );
  const noContractLeverage = state.playLeveragePlotIntrigue(
    { ...leverageFixture, contractOffer: [], contractDeck: [] },
    "p2",
    leverage.id,
  );
  assert.equal(noContractLeverage.pendingAction, undefined, "Leverage should still resolve without a contract offer");
  assert.equal(playerById(noContractLeverage, "p2").resources.solari, 1);
  const noSpiceLeverage = { ...leverageFixture, turnSpiceGains: {} };
  assert.equal(
    state.playLeveragePlotIntrigue(noSpiceLeverage, "p2", leverage.id),
    noSpiceLeverage,
    "Leverage should require gaining spice this turn",
  );
  const multiContractLeverage = {
    ...leverage,
    id: "intrigue-leverage-multi-contract-test",
    effects: [
      ...(leverage.effects ?? []),
      {
        trigger: "plot-intrigue",
        conditions: [{ kind: "gained-spice-this-turn" }],
        effects: [{
          kind: "take-contracts",
          selector: "self",
          amount: 1,
          sourcePool: "public-offer",
          optional: true,
          source: "Leverage",
        }],
      },
    ],
  };
  const multiContractLeverageFixture = {
    ...leverageFixture,
    players: leverageFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [multiContractLeverage] }
        : candidate,
    ),
  };
  assert.throws(
    () => state.playLeveragePlotIntrigue(multiContractLeverageFixture, "p2", multiContractLeverage.id),
    /Unsupported multiple Plot Intrigue take-contracts effects/,
    "Typed Plot Intrigues should reject unsupported multiple contract effects instead of ignoring extras",
  );
  const leverageSpiceTracked = state.playPlotBattleIconIntrigue(
    {
      ...game,
      activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
      pendingAction: undefined,
      pendingQueue: [],
      turnSpiceGains: {},
      intrigueDiscard: [],
      players: game.players.map((candidate) =>
        candidate.id === "p2" ? { ...candidate, intrigues: [crysknife] } : { ...candidate, intrigues: [] },
      ),
    },
    "p2",
    crysknife.id,
  );
  assert.equal(
    state.hasGainedSpiceThisTurn(leverageSpiceTracked, "p2"),
    true,
    "Plot spice gains should qualify the player for Leverage later in the same turn",
  );
  const pendingLeverage = {
    ...leverageFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playLeveragePlotIntrigue(pendingLeverage, "p2", leverage.id),
    pendingLeverage,
    "Leverage should wait for pending actions to resolve",
  );
  const queuedLeverage = {
    ...leverageFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playLeveragePlotIntrigue(queuedLeverage, "p2", leverage.id),
    queuedLeverage,
    "Leverage should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playLeveragePlotIntrigue(leverageFixture, "p3", leverage.id),
    leverageFixture,
    "Only the active player should play Leverage",
  );
  assert.equal(
    state.playLeveragePlotIntrigue(leverageFixture, "p2", mercenaries.id),
    leverageFixture,
    "Leverage should reject other Intrigue cards",
  );
}

export function verifyBasicCardEffectIntrigues({ cards, data, game, state }) {
  const {
    contingencyPlan,
    inspireAwe,
    intelligenceReport,
    mercenaries,
  } = cards;

  const contingencyFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 1 }, intrigues: [contingencyPlan] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isContingencyPlanIntrigue(contingencyPlan),
    true,
    "Contingency Plan should be recognized as a structured Plot Intrigue",
  );
  const contingencyPlotted = state.playContingencyPlanPlotIntrigue(
    contingencyFixture,
    "p2",
    contingencyPlan.id,
  );
  assert.equal(playerById(contingencyPlotted, "p2").resources.solari, 3, "Contingency Plan Plot should gain 2 Solari");
  assert.deepEqual(playerById(contingencyPlotted, "p2").intrigues, []);
  assert.equal(contingencyPlotted.intrigueDiscard.at(-1).id, contingencyPlan.id);
  assert.match(contingencyPlotted.log[0], /plays Contingency Plan as a Plot Intrigue for 2 Solari/);
  const pendingContingency = {
    ...contingencyFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playContingencyPlanPlotIntrigue(pendingContingency, "p2", contingencyPlan.id),
    pendingContingency,
    "Contingency Plan should wait for pending actions to resolve",
  );
  const queuedContingency = {
    ...contingencyFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playContingencyPlanPlotIntrigue(queuedContingency, "p2", contingencyPlan.id),
    queuedContingency,
    "Contingency Plan should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playContingencyPlanPlotIntrigue(contingencyFixture, "p3", contingencyPlan.id),
    contingencyFixture,
    "Only the active player should play Contingency Plan as a Plot Intrigue",
  );

  const inspireAweAcquireCard = data.imperiumDeck.find((card) => (card.cost ?? 0) <= 3);
  const inspireAweReplacement = data.imperiumDeck.find((card) => card.id !== inspireAweAcquireCard?.id);
  assert.ok(inspireAweAcquireCard, "Expected a low-cost Imperium Row card for Inspire Awe");
  assert.ok(inspireAweReplacement, "Expected an Imperium Row replacement card for Inspire Awe");
  const inspireAweFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    imperiumRow: [inspireAweAcquireCard],
    marketDeck: [inspireAweReplacement],
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, hand: [], discard: [], deployedSandworms: 0, intrigues: [inspireAwe] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isInspireAweIntrigue(inspireAwe),
    true,
    "Inspire Awe should be recognized as a structured Plot Intrigue",
  );
  const inspireAwePlotted = state.playInspireAwePlotIntrigue(inspireAweFixture, "p2", inspireAwe.id);
  assert.deepEqual(playerById(inspireAwePlotted, "p2").intrigues, []);
  assert.equal(inspireAwePlotted.intrigueDiscard.at(-1).id, inspireAwe.id);
  assert.deepEqual(
    inspireAwePlotted.pendingAction,
    { kind: "acquire-card", ownerId: "p2", source: "Inspire Awe", maxCost: 3, destination: "discard" },
    "Inspire Awe without a sandworm should acquire to discard",
  );
  assert.equal(
    state.finishPendingAction(inspireAwePlotted),
    inspireAwePlotted,
    "Inspire Awe acquisition should not be skippable",
  );
  const inspireAweAcquired = state.acquireCardForPending(
    inspireAwePlotted,
    inspireAwePlotted.pendingAction,
    inspireAweAcquireCard.id,
  );
  assert.equal(playerById(inspireAweAcquired, "p2").discard.at(-1).id, inspireAweAcquireCard.id);
  assert.equal(playerById(inspireAweAcquired, "p2").hand.length, 0);
  assert.deepEqual(inspireAweAcquired.imperiumRow.map((card) => card.id), [inspireAweReplacement.id]);
  const inspireAweWormFixture = {
    ...inspireAweFixture,
    imperiumRow: [inspireAweAcquireCard],
    marketDeck: [inspireAweReplacement],
    players: inspireAweFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, deployedSandworms: 1, intrigues: [inspireAwe] } : candidate,
    ),
  };
  const inspireAweToHand = state.playInspireAwePlotIntrigue(inspireAweWormFixture, "p2", inspireAwe.id);
  assert.deepEqual(
    inspireAweToHand.pendingAction,
    { kind: "acquire-card", ownerId: "p2", source: "Inspire Awe", maxCost: 3, destination: "hand" },
    "Inspire Awe with a sandworm should acquire to hand",
  );
  const inspireAweHandAcquired = state.acquireCardForPending(
    inspireAweToHand,
    inspireAweToHand.pendingAction,
    inspireAweAcquireCard.id,
  );
  assert.equal(playerById(inspireAweHandAcquired, "p2").hand.at(-1).id, inspireAweAcquireCard.id);
  assert.equal(playerById(inspireAweHandAcquired, "p2").discard.length, 0);
  const noCardInspireAwe = state.playInspireAwePlotIntrigue(
    { ...inspireAweFixture, imperiumRow: [], marketDeck: [], reserveMarket: [] },
    "p2",
    inspireAwe.id,
  );
  assert.equal(noCardInspireAwe.pendingAction, undefined, "Inspire Awe should resolve without a pending action if no card is eligible");
  assert.match(noCardInspireAwe.log[0], /no eligible card is available/);
  const commanderInspireAweFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    imperiumRow: [inspireAweAcquireCard],
    marketDeck: [inspireAweReplacement],
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          callToArmsActive: true,
          hand: [],
          discard: [],
          intrigues: [inspireAwe],
        };
      }
      if (candidate.id === "p6") return { ...candidate, deployedSandworms: 1, garrison: 2, hand: [], discard: [], intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderInspireAwe = state.playInspireAwePlotIntrigue(
    commanderInspireAweFixture,
    "p4",
    inspireAwe.id,
    "p6",
  );
  assert.deepEqual(
    commanderInspireAwe.pendingAction,
    { kind: "acquire-card", ownerId: "p4", source: "Inspire Awe", maxCost: 3, destination: "hand" },
    "Commander Inspire Awe should use the activated Ally's sandworm but acquire for the Commander",
  );
  const commanderInspireAweAcquired = state.acquireCardForPending(
    commanderInspireAwe,
    commanderInspireAwe.pendingAction,
    inspireAweAcquireCard.id,
    "p6",
  );
  assert.equal(playerById(commanderInspireAweAcquired, "p4").hand.at(-1).id, inspireAweAcquireCard.id);
  assert.equal(playerById(commanderInspireAweAcquired, "p6").garrison, 3, "Commander Call to Arms should recruit for the Reveal Ally");
  assert.equal(playerById(commanderInspireAweAcquired, "p6").hand.length, 0, "The activated Ally should not receive the acquired card");
  assert.equal(
    state.playInspireAwePlotIntrigue(commanderInspireAweFixture, "p4", inspireAwe.id, "p2"),
    commanderInspireAweFixture,
    "Revealed Commander Inspire Awe should reject a same-team Ally who was not activated for Reveal",
  );
  const pendingInspireAwe = {
    ...inspireAweFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playInspireAwePlotIntrigue(pendingInspireAwe, "p2", inspireAwe.id),
    pendingInspireAwe,
    "Inspire Awe should wait for pending actions to resolve",
  );
  const queuedInspireAwe = {
    ...inspireAweFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playInspireAwePlotIntrigue(queuedInspireAwe, "p2", inspireAwe.id),
    queuedInspireAwe,
    "Inspire Awe should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playInspireAwePlotIntrigue(inspireAweFixture, "p3", inspireAwe.id),
    inspireAweFixture,
    "Only the active player should play Inspire Awe",
  );
  assert.equal(
    state.playInspireAwePlotIntrigue(inspireAweFixture, "p2", mercenaries.id),
    inspireAweFixture,
    "Inspire Awe should reject other Intrigue cards",
  );
  const combatInspireAwe = { ...inspireAweFixture, phase: "combat" };
  assert.equal(
    state.playInspireAwePlotIntrigue(combatInspireAwe, "p2", inspireAwe.id),
    combatInspireAwe,
    "Inspire Awe should only resolve during normal play",
  );

  const [firstSpySpace, secondSpySpace, opposingSpySpace] = state
    .spyObservationPostChoiceSpaces()
    .filter((space) => !space.personal)
    .map((space) => state.spyObservationPostIdForSpace(space.id));
  assert.ok(firstSpySpace && secondSpySpace && opposingSpySpace, "Expected at least three board spaces for spy fixtures");
  const intelligenceFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    spyPosts: { [firstSpySpace]: "p2", [secondSpySpace]: "p3" },
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, hand: [], deck: candidate.deck.slice(0, 3), discard: [], intrigues: [intelligenceReport] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isIntelligenceReportIntrigue(intelligenceReport),
    true,
    "Intelligence Report should be recognized as a structured Plot Intrigue",
  );
  const intelligenceOne = state.playIntelligenceReportPlotIntrigue(
    intelligenceFixture,
    "p2",
    intelligenceReport.id,
  );
  assert.equal(playerById(intelligenceOne, "p2").hand.length, 1, "Intelligence Report should draw 1 card without two own spies");
  assert.equal(playerById(intelligenceOne, "p2").deck.length, 2, "Intelligence Report should consume the drawn card from deck");
  assert.deepEqual(playerById(intelligenceOne, "p2").intrigues, []);
  assert.equal(intelligenceOne.intrigueDiscard.at(-1).id, intelligenceReport.id);
  assert.match(intelligenceOne.log[0], /plays Intelligence Report as a Plot Intrigue and draws 1 card/);
  const intelligenceTwoFixture = {
    ...intelligenceFixture,
    spyPosts: { [firstSpySpace]: "p2", [secondSpySpace]: "p2", [opposingSpySpace]: "p3" },
    players: intelligenceFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, hand: [], deck: playerById(game, "p2").deck.slice(0, 3), discard: [], intrigues: [intelligenceReport] }
        : candidate,
    ),
  };
  const intelligenceTwo = state.playIntelligenceReportPlotIntrigue(
    intelligenceTwoFixture,
    "p2",
    intelligenceReport.id,
  );
  assert.equal(playerById(intelligenceTwo, "p2").hand.length, 2, "Intelligence Report should draw 2 cards with two own spies");
  assert.equal(playerById(intelligenceTwo, "p2").deck.length, 1);
  assert.match(intelligenceTwo.log[0], /draws 2 cards/);
  const pendingIntelligence = {
    ...intelligenceFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(pendingIntelligence, "p2", intelligenceReport.id),
    pendingIntelligence,
    "Intelligence Report should wait for pending actions to resolve",
  );
  const queuedIntelligence = {
    ...intelligenceFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(queuedIntelligence, "p2", intelligenceReport.id),
    queuedIntelligence,
    "Intelligence Report should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(intelligenceFixture, "p3", intelligenceReport.id),
    intelligenceFixture,
    "Only the active player should play Intelligence Report as a Plot Intrigue",
  );
  const intelligenceWrongCardFixture = {
    ...intelligenceFixture,
    players: intelligenceFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(intelligenceWrongCardFixture, "p2", mercenaries.id),
    intelligenceWrongCardFixture,
    "Intelligence Report should reject other Intrigue cards",
  );
}

export function verifyCunningPlotIntrigue({ cards, game, state }) {
  const { cunning, mercenaries } = cards;

  const cunningFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 2 },
            hand: [],
            deck: candidate.deck.slice(0, 3),
            discard: [],
            playArea: [],
            intrigues: [cunning],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isCunningIntrigue(cunning),
    true,
    "Cunning should be recognized as a structured Plot Intrigue",
  );
  const cunningDrawn = state.playCunningPlotIntrigue(cunningFixture, "p2", cunning.id, "draw");
  assert.equal(playerById(cunningDrawn, "p2").hand.length, 1, "Cunning free branch should draw 1 card");
  assert.equal(playerById(cunningDrawn, "p2").resources.spice, 2, "Cunning free branch should not spend spice");
  assert.deepEqual(playerById(cunningDrawn, "p2").intrigues, []);
  assert.equal(cunningDrawn.pendingAction, undefined, "Cunning free branch should not queue a trash choice");
  assert.equal(cunningDrawn.intrigueDiscard.at(-1).id, cunning.id);
  assert.match(cunningDrawn.log[0], /plays Cunning and draws 1 card/);
  const cunningPaid = state.playCunningPlotIntrigue(cunningFixture, "p2", cunning.id, "paid-trash");
  assert.equal(playerById(cunningPaid, "p2").hand.length, 1, "Cunning paid branch should draw before trashing");
  assert.equal(playerById(cunningPaid, "p2").resources.spice, 1, "Cunning paid branch should spend 1 spice");
  assert.deepEqual(cunningPaid.pendingAction, {
    kind: "trash-card",
    ownerId: "p2",
    source: "Cunning",
    optional: false,
  });
  assert.equal(cunningPaid.intrigueDiscard.at(-1).id, cunning.id);
  assert.match(cunningPaid.log[0], /spends 1 spice, draws 1 card, and must trash 1 card/);
  assert.equal(
    state.skipTrashCard(cunningPaid, cunningPaid.pendingAction),
    cunningPaid,
    "Cunning's paid branch should require the trash",
  );
  const cunningTrashChoice = playerById(cunningPaid, "p2").hand[0];
  const cunningTrashed = state.trashPlayerCard(cunningPaid, cunningPaid.pendingAction, "hand", cunningTrashChoice.id);
  assert.equal(playerById(cunningTrashed, "p2").hand.length, 0, "Cunning trash should remove the selected card");
  assert.equal(cunningTrashed.pendingAction, undefined, "Cunning trash should clear the pending action");
  assert.match(cunningTrashed.log[0], /trashes .* from Cunning/);
  const poorCunning = {
    ...cunningFixture,
    players: cunningFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 0 }, intrigues: [cunning] }
        : candidate,
    ),
  };
  assert.equal(
    state.playCunningPlotIntrigue(poorCunning, "p2", cunning.id, "paid-trash"),
    poorCunning,
    "Cunning paid branch should require 1 spice",
  );
  const noTrashCunning = {
    ...cunningFixture,
    players: cunningFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 1 },
            hand: [],
            deck: [],
            discard: [],
            playArea: [],
            intrigues: [cunning],
          }
        : candidate,
    ),
  };
  assert.equal(
    state.playCunningPlotIntrigue(noTrashCunning, "p2", cunning.id, "paid-trash"),
    noTrashCunning,
    "Cunning paid branch should leave state unchanged when no card is trashable after drawing",
  );
  const pendingCunning = {
    ...cunningFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playCunningPlotIntrigue(pendingCunning, "p2", cunning.id, "draw"),
    pendingCunning,
    "Cunning should wait for pending actions to resolve",
  );
  const queuedCunning = {
    ...cunningFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playCunningPlotIntrigue(queuedCunning, "p2", cunning.id, "draw"),
    queuedCunning,
    "Cunning should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playCunningPlotIntrigue(cunningFixture, "p3", cunning.id, "draw"),
    cunningFixture,
    "Only the active player should play Cunning as a Plot Intrigue",
  );
  assert.equal(
    state.playCunningPlotIntrigue(cunningFixture, "p2", mercenaries.id, "draw"),
    cunningFixture,
    "Cunning should reject other Intrigue cards",
  );
  const commanderCunningFixture = {
    ...cunningFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 1 },
          hand: [],
          deck: candidate.deck.slice(0, 2),
          discard: [],
          playArea: [],
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [cunning],
        };
      }
      if (candidate.id === "p6") return { ...candidate, hand: [], deck: candidate.deck.slice(0, 2), intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderCunning = state.playCunningPlotIntrigue(
    commanderCunningFixture,
    "p4",
    cunning.id,
    "paid-trash",
  );
  assert.equal(playerById(commanderCunning, "p4").resources.spice, 0, "Commander Cunning should spend Commander spice");
  assert.equal(playerById(commanderCunning, "p4").hand.length, 1, "Commander Cunning should draw for the Commander");
  assert.equal(playerById(commanderCunning, "p6").hand.length, 0, "Commander Cunning should not target the activated Ally");
  assert.equal(commanderCunning.pendingAction?.ownerId, "p4", "Commander Cunning should require the Commander to trash");
}
