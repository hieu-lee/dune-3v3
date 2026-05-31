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
    { kind: "contract", ownerId: "p2", source: "Leverage", publicOnly: true },
    "Leverage should queue a public-only contract choice",
  );
  assert.match(leveraged.log[0], /plays Leverage, gains 1 Solari and may take a face-up CHOAM contract/);
  const leverageContractTaken = state.takeChoamContract(leveraged, leveraged.pendingAction, leverageContract.id);
  assert.equal(playerById(leverageContractTaken, "p2").contracts.at(-1).card.id, leverageContract.id);
  assert.deepEqual(leverageContractTaken.contractOffer.map((contract) => contract.id), [leverageReplacement.id]);
  assert.equal(leverageContractTaken.pendingAction, undefined);
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
