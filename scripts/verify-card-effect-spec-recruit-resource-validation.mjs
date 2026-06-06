import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecRecruitResourceValidation({
  boardSpaces,
  cards,
  data,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { arrakeen, haggaBasin, sietchTabr, spiceRefinery } = boardSpaces;
  const {
    cargoRunner,
    chani,
    convincingArgument,
    dagger,
    desertPower,
    ecologicalTestingStation,
    leadership,
    rebelSupplier,
    southernElders,
    stilgar,
    strikeFleet,
  } = cards;
  const { p2, p3, p4 } = players;
  const rebelSupplierSpyRecallGame = {
    ...game,
    turnSpyRecalls: { ...game.turnSpyRecalls, [p2.id]: 1, [p4.id]: 1 },
  };
  const rebelSupplierEffect = state.applyCardAgentEffect(
    rebelSupplier,
    { ...p2, garrison: 0, resources: { ...p2.resources, spice: 0 } },
    p2,
    rebelSupplierSpyRecallGame,
  );
  assert.equal(rebelSupplierEffect.source.resources.spice, 0, "Rebel Supplier Agent spec should not gain reveal spice");
  assert.equal(rebelSupplierEffect.source.garrison, 2, "Rebel Supplier Agent spec should recruit 2 troops for an Ally");
  assert.equal(rebelSupplierEffect.recruitedTroops, 2, "Rebel Supplier recruited troops should count for deployment limits");

  const rebelSupplierCommanderEffect = state.applyCardAgentEffect(
    rebelSupplier,
    { ...p4, garrison: 0, resources: { ...p4.resources, spice: 0 } },
    { ...p2, garrison: 0 },
    rebelSupplierSpyRecallGame,
  );
  assert.equal(rebelSupplierCommanderEffect.source.resources.spice, 0, "Commander Rebel Supplier should not gain reveal spice on Agent play");
  assert.equal(rebelSupplierCommanderEffect.source.garrison, 0, "Commander Rebel Supplier should not recruit troops to the Commander");
  assert.equal(rebelSupplierCommanderEffect.target.garrison, 2, "Commander Rebel Supplier should recruit troops to the activated Ally");
  assert.equal(rebelSupplierCommanderEffect.recruitedTroops, 2, "Commander Rebel Supplier recruited troops should count for deployment limits");

  const southernEldersPlayArea = [
    southernElders,
    { ...convincingArgument, id: "southern-elders-bene-fixture", traits: ["Faction: Bene Gesserit"] },
  ];
  const southernEldersEffect = state.applyCardAgentEffect(
    southernElders,
    { ...p2, garrison: 0, playArea: southernEldersPlayArea, resources: { ...p2.resources, water: 0 } },
    p2,
    game,
  );
  assert.equal(southernEldersEffect.source.resources.water, 0, "Southern Elders Agent spec should not gain reveal water");
  assert.equal(southernEldersEffect.source.garrison, 2, "Southern Elders Agent spec should recruit 2 troops for an Ally");
  assert.equal(southernEldersEffect.recruitedTroops, 2, "Southern Elders recruited troops should count for deployment limits");

  const southernEldersCommanderEffect = state.applyCardAgentEffect(
    southernElders,
    { ...p4, garrison: 0, playArea: southernEldersPlayArea, resources: { ...p4.resources, water: 0 } },
    { ...p2, garrison: 0 },
    game,
  );
  assert.equal(southernEldersCommanderEffect.source.resources.water, 0, "Commander Southern Elders should not gain reveal water on Agent play");
  assert.equal(southernEldersCommanderEffect.source.garrison, 0, "Commander Southern Elders should not recruit troops to the Commander");
  assert.equal(southernEldersCommanderEffect.target.garrison, 2, "Commander Southern Elders should recruit troops to the activated Ally");
  assert.equal(southernEldersCommanderEffect.recruitedTroops, 2, "Commander Southern Elders recruited troops should count for deployment limits");

  const stilgarEffect = state.applyCardAgentEffect(stilgar, { ...p2, garrison: 0 }, p2, game);
  assert.equal(stilgarEffect.source.garrison, 2, "Stilgar Agent spec should recruit 2 troops for an Ally");
  assert.equal(stilgarEffect.recruitedTroops, 2, "Stilgar recruited troops should count for deployment limits");

  const stilgarCommanderEffect = state.applyCardAgentEffect(stilgar, { ...p4, garrison: 0 }, { ...p2, garrison: 0 }, game);
  assert.equal(stilgarCommanderEffect.source.garrison, 0, "Commander Stilgar should not recruit troops to the Commander");
  assert.equal(stilgarCommanderEffect.target.garrison, 2, "Commander Stilgar should recruit troops to the activated Ally");
  assert.equal(stilgarCommanderEffect.recruitedTroops, 2, "Commander Stilgar recruited troops should count for deployment limits");

  const strikeFleetNoRecallEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p2, garrison: 0 },
    p2,
    { ...game, turnSpyRecalls: {} },
  );
  assert.equal(strikeFleetNoRecallEffect.source.garrison, 0, "Strike Fleet should not recruit before the player recalls a spy this turn");
  assert.equal(strikeFleetNoRecallEffect.recruitedTroops, undefined, "Strike Fleet should not count troops before a same-turn spy recall");
  const strikeFleetRecallEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p2, garrison: 0 },
    p2,
    { ...game, turnSpyRecalls: { [p2.id]: 1 } },
  );
  assert.equal(strikeFleetRecallEffect.source.garrison, 3, "Strike Fleet should recruit 3 troops after a same-turn spy recall");
  assert.equal(strikeFleetRecallEffect.recruitedTroops, 3, "Strike Fleet recruited troops should count for deployment limits");
  assert.match(strikeFleetRecallEffect.log ?? "", /Strike Fleet: recruits 3 troops/);
  const strikeFleetCommanderEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p4, garrison: 0 },
    { ...p2, garrison: 0 },
    { ...game, turnSpyRecalls: { [p4.id]: 1 } },
  );
  assert.equal(strikeFleetCommanderEffect.source.garrison, 0, "Commander Strike Fleet should not recruit troops to the Commander");
  assert.equal(strikeFleetCommanderEffect.target.garrison, 3, "Commander Strike Fleet should recruit troops to the activated Ally");
  assert.equal(strikeFleetCommanderEffect.recruitedTroops, 3, "Commander Strike Fleet recruited troops should count for deployment limits");

  const desertPowerMakerEffect = state.applyCardAgentEffect(
    desertPower,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    haggaBasin,
  );
  assert.equal(desertPowerMakerEffect.source.resources.spice, 2, "Desert Power should gain 2 Agent spice on Maker spaces");
  assert.equal(desertPowerMakerEffect.sourceSpiceGained, 2, "Desert Power Agent spice should be trackable");
  assert.match(desertPowerMakerEffect.log ?? "", /Desert Power: gains 2 spice/);
  const desertPowerNonMakerEffect = state.applyCardAgentEffect(
    desertPower,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    arrakeen,
  );
  assert.equal(
    desertPowerNonMakerEffect.source.resources.spice,
    0,
    "Desert Power should not gain Agent spice outside Maker spaces",
  );
  assert.equal(desertPowerNonMakerEffect.log, undefined, "Desert Power should not log outside Maker spaces");

  const unprotectedConflict = data.conflictCards.find((card) => card.name === "Skirmish (Desert Mouse)");
  assert.ok(unprotectedConflict, "Verifier needs an unprotected Conflict fixture");
  const desertPowerRevealFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedSandworms: 0,
    hand: [desertPower],
    makerHooks: true,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const desertPowerRevealState = {
    ...desertPowerRevealFixture,
    conflict: unprotectedConflict,
    shieldWall: false,
  };
  const desertPowerRevealPlan = turnActions.revealTurnPlan(
    playerById(desertPowerRevealState, p3.id),
    desertPowerRevealState,
  );
  assert.equal(desertPowerRevealPlan.persuasion, 2, "Desert Power should default to its +2 Reveal persuasion");
  const desertPowerRevealed = turnActions.revealTurnAction(desertPowerRevealState, {
    commanderTargets: {},
    revealPlan: desertPowerRevealPlan,
  });
  assert.equal(
    desertPowerRevealed.pendingAction?.kind,
    "pay-resource-for-sandworms",
    "Desert Power should queue its Reveal sandworm payment when the recipient can summon",
  );
  assert.equal(desertPowerRevealed.pendingAction?.persuasionCost, 2);
  assert.equal(desertPowerRevealed.pendingAction?.source, "Desert Power");
  const desertPowerWormed = state.resolvePayResourceForSandwormsChoice(
    desertPowerRevealed,
    desertPowerRevealed.pendingAction,
  );
  assert.equal(playerById(desertPowerWormed, p3.id).resources.water, 0, "Desert Power Reveal payment should spend 1 water");
  assert.equal(playerById(desertPowerWormed, p3.id).persuasion, 0, "Desert Power Reveal payment should replace its persuasion");
  assert.equal(playerById(desertPowerWormed, p3.id).deployedSandworms, 1, "Desert Power Reveal payment should summon a sandworm");
  assert.equal(playerById(desertPowerWormed, p3.id).conflict, 3, "Desert Power sandworm should add 3 strength");
  const desertPowerSkipped = state.skipPayResourceForSandworms(
    desertPowerRevealed,
    desertPowerRevealed.pendingAction,
  );
  assert.equal(playerById(desertPowerSkipped, p3.id).resources.water, 1, "Skipping Desert Power payment should keep water");
  assert.equal(playerById(desertPowerSkipped, p3.id).persuasion, 2, "Skipping Desert Power payment should keep persuasion");

  const leadershipDesertPowerRevealFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedSandworms: 0,
    hand: [leadership, desertPower],
    makerHooks: true,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const leadershipDesertPowerRevealState = {
    ...leadershipDesertPowerRevealFixture,
    conflict: unprotectedConflict,
    shieldWall: false,
  };
  const leadershipDesertPowerRevealPlan = turnActions.revealTurnPlan(
    playerById(leadershipDesertPowerRevealState, p3.id),
    leadershipDesertPowerRevealState,
  );
  const leadershipDesertPowerRevealed = turnActions.revealTurnAction(leadershipDesertPowerRevealState, {
    commanderTargets: {},
    revealPlan: leadershipDesertPowerRevealPlan,
  });
  assert.equal(
    leadershipDesertPowerRevealed.pendingAction?.kind,
    "pay-resource-for-sandworms",
    "Leadership plus Desert Power should still queue the Reveal sandworm payment",
  );
  assert.equal(
    leadershipDesertPowerRevealed.pendingAction?.leadershipBonus,
    true,
    "Desert Power should carry the deferred Leadership bonus when revealed with Leadership",
  );
  const leadershipDesertPowerWormed = state.resolvePayResourceForSandwormsChoice(
    leadershipDesertPowerRevealed,
    leadershipDesertPowerRevealed.pendingAction,
  );
  assert.equal(
    playerById(leadershipDesertPowerWormed, p3.id).conflict,
    4,
    "Leadership should add 1 strength after Desert Power resolves its sandworm strength",
  );
  assert.match(
    leadershipDesertPowerWormed.log.join("\n"),
    /adds 1 strength from Leadership because Desert Power provided strength/,
    "Leadership should log its deferred Desert Power bonus",
  );

  const ecologicalSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [ecologicalTestingStation], playArea: [], highCouncilSeat: false },
    game,
  );
  assert.equal(ecologicalSoloReveal.persuasion, 1, "Ecological Testing Station should reveal for 1 persuasion");
  assert.equal(ecologicalSoloReveal.revealGain.water ?? 0, 0, "Ecological Testing Station should not gain water without Fremen Bond");
  const ecologicalFremenBondFixture = {
    ...convincingArgument,
    id: "ecological-testing-station-fremen-bond-fixture",
    name: "Ecological Testing Station Fremen Bond Fixture",
    effects: undefined,
    persuasion: 0,
    revealGain: undefined,
    swords: 0,
    traits: ["Faction: Fremen"],
  };
  const ecologicalBondReveal = turnActions.revealTurnPlan(
    {
      ...p2,
      hand: [ecologicalTestingStation, ecologicalFremenBondFixture],
      playArea: [],
      highCouncilSeat: false,
    },
    game,
  );
  assert.equal(ecologicalBondReveal.persuasion, 1, "Ecological Testing Station Fremen Bond helper should not add persuasion");
  assert.equal(ecologicalBondReveal.revealGain.water, 1, "Ecological Testing Station should gain water with Fremen Bond");
  const ecologicalPaymentDraws = [
    { ...dagger, id: "ecological-testing-station-payment-draw-1" },
    { ...convincingArgument, id: "ecological-testing-station-payment-draw-2" },
  ];
  const ecologicalPaymentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 2 },
  }));
  const ecologicalPlaced = turnActions.placeAgentAction(
    { ...ecologicalPaymentFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  assert.deepEqual(
    ecologicalPlaced.pendingAction,
    {
      kind: "pay-resource-for-draw-cards",
      ownerId: p2.id,
      resource: "water",
      cost: 2,
      drawCards: 2,
      optional: true,
      source: "Ecological Testing Station",
      cardId: ecologicalTestingStation.id,
    },
    "Ecological Testing Station Agent placement should queue the water-payment draw choice",
  );
  const ecologicalResolved = state.resolvePayResourceForDrawCardsChoice(ecologicalPlaced, ecologicalPlaced.pendingAction);
  assert.equal(playerById(ecologicalResolved, p2.id).resources.water, 0, "Ecological Testing Station should spend 2 water");
  assert.deepEqual(
    playerById(ecologicalResolved, p2.id).hand.map((card) => card.id),
    ecologicalPaymentDraws.map((card) => card.id),
    "Ecological Testing Station payment should draw 2 cards",
  );
  assert.equal(ecologicalResolved.pendingAction, undefined, "Ecological Testing Station payment should clear the pending action");
  assert.match(ecologicalResolved.log[0], /spends 2 water for Ecological Testing Station; draws 2 cards/);
  const ecologicalSkipFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 2 },
  }));
  const ecologicalSkippedPlaced = turnActions.placeAgentAction(
    { ...ecologicalSkipFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  const ecologicalSkipped = state.skipPayResourceForDrawCards(ecologicalSkippedPlaced, ecologicalSkippedPlaced.pendingAction);
  assert.equal(playerById(ecologicalSkipped, p2.id).resources.water, 2, "Skipping Ecological Testing Station should preserve water");
  assert.equal(playerById(ecologicalSkipped, p2.id).hand.length, 0, "Skipping Ecological Testing Station should not draw cards");
  assert.equal(ecologicalSkipped.pendingAction, undefined, "Skipping Ecological Testing Station should clear the pending action");
  assert.match(ecologicalSkipped.log[0], /declines to pay 2 water for Ecological Testing Station/);
  const ecologicalSietchTabrFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    influence: { ...p2.influence, fringeWorlds: 2 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const ecologicalSietchTabrPlaced = turnActions.placeAgentAction(
    { ...ecologicalSietchTabrFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: sietchTabr },
  );
  assert.equal(ecologicalSietchTabrPlaced.pendingAction?.kind, "sietch-tabr", "Sietch Tabr should resolve before Ecological payment");
  assert.equal(
    ecologicalSietchTabrPlaced.pendingQueue[0]?.kind,
    "pay-resource-for-draw-cards",
    "Ecological Testing Station should queue when Sietch Tabr water makes the payment affordable",
  );
  const ecologicalAfterSietch = state.resolveSietchTabrChoice(
    ecologicalSietchTabrPlaced,
    ecologicalSietchTabrPlaced.pendingAction,
    "shield-wall",
  );
  assert.equal(playerById(ecologicalAfterSietch, p2.id).resources.water, 2, "Sietch Tabr should provide the second payment water");
  assert.equal(
    ecologicalAfterSietch.pendingAction?.kind,
    "pay-resource-for-draw-cards",
    "Ecological Testing Station payment should surface after Sietch Tabr resolves",
  );
  const ecologicalAfterSietchPayment = state.resolvePayResourceForDrawCardsChoice(
    ecologicalAfterSietch,
    ecologicalAfterSietch.pendingAction,
  );
  assert.equal(playerById(ecologicalAfterSietchPayment, p2.id).resources.water, 0, "Deferred Sietch Tabr payment should spend both water");
  assert.deepEqual(
    playerById(ecologicalAfterSietchPayment, p2.id).hand.map((card) => card.id),
    ecologicalPaymentDraws.map((card) => card.id),
    "Deferred Sietch Tabr payment should draw 2 cards",
  );
  const ecologicalNoWaterFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const ecologicalNoWaterPlaced = turnActions.placeAgentAction(
    { ...ecologicalNoWaterFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  assert.equal(
    ecologicalNoWaterPlaced.pendingAction,
    undefined,
    "Ecological Testing Station should not queue a payment choice without 2 water",
  );

  const cargoRunnerDeck = [
    { ...dagger, id: "cargo-runner-agent-draw-1" },
    { ...convincingArgument, id: "cargo-runner-agent-draw-2" },
  ];
  const cargoRunnerUncontracted = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: [], deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerUncontracted.source.hand.length, 0, "Cargo Runner should not draw below two completed contracts");
  assert.equal(cargoRunnerUncontracted.log, undefined, "Cargo Runner should not log below its completed-contract threshold");
  const cargoRunnerCompletedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const cargoRunnerTwoContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: cargoRunnerCompletedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerTwoContracts.source.hand.length, 1, "Cargo Runner should draw 1 card with two completed contracts");
  assert.match(cargoRunnerTwoContracts.log ?? "", /Cargo Runner: draws 1 card/);
  const fourCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const cargoRunnerFourContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: fourCompletedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerFourContracts.source.hand.length, 2, "Cargo Runner should draw 2 cards with four completed contracts");
  assert.match(cargoRunnerFourContracts.log ?? "", /Cargo Runner: draws 2 cards/);

  const chaniQualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniQualified.sourceIntriguesToDraw, 1, "Chani should expose a pending Intrigue draw at three conflict units");
  assert.equal(chaniQualified.log, undefined, "Chani should let the actual Intrigue draw log report the draw");
  const chaniWithWorm = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 1 },
    p2,
  );
  assert.equal(chaniWithWorm.sourceIntriguesToDraw, 1, "Chani should count sandworms as conflict units");
  const commanderChani = state.applyCardAgentEffect(
    chani,
    p4,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
  );
  assert.equal(
    commanderChani.sourceIntriguesToDraw,
    1,
    "Chani should use the activated Ally's conflict units during Commander Agent turns",
  );
  const chaniUnqualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniUnqualified.sourceIntriguesToDraw, undefined, "Chani should not draw below three conflict units");
  assert.equal(chaniUnqualified.log, undefined, "Chani should not log below the conflict-unit threshold");

  const chaniIntrigue = data.intrigueCards[0];
  assert.ok(chaniIntrigue, "Verifier needs an Intrigue fixture");
  const chaniSecondIntrigue = data.intrigueCards[1];
  assert.ok(chaniSecondIntrigue, "Verifier needs a second Intrigue fixture");
  const chaniFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 3,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniPlaced = turnActions.placeAgentAction(
    { ...chaniFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniPlaced, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani Agent spec should draw from the Intrigue deck during Agent placement",
  );
  assert.deepEqual(chaniPlaced.intrigueDeck, [], "Chani Agent spec should remove the drawn Intrigue from the deck");
  assert.deepEqual(chaniPlaced.intrigueDiscard, [], "Chani Agent spec should not mutate the Intrigue discard");
  assert.match(chaniPlaced.log.join("\n"), /draws an Intrigue card from Chani, Clever Tactician/);
  const chaniBlockedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-blocked-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniBlocked = turnActions.placeAgentAction(
    { ...chaniBlockedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniBlocked, p2.id).intrigues.length,
    0,
    "Chani Agent spec should not draw before reaching three conflict units",
  );
  assert.equal(chaniBlocked.intrigueDeck[0]?.id, chaniIntrigue.id, "Blocked Chani should leave the Intrigue deck untouched");
  assert.deepEqual(chaniBlocked.intrigueDiscard, [], "Blocked Chani should leave the Intrigue discard untouched");
  assert.equal(
    chaniBlocked.pendingAction?.kind,
    "deploy",
    "Conflict-unit-gated Intrigue draw should defer while deployment can reach the threshold",
  );
  assert.equal(
    chaniBlocked.pendingAction?.postDeployIntrigueDraw?.minConflictUnits,
    3,
    "Deferred Chani draw should track the printed conflict-unit threshold",
  );
  const chaniDeferred = state.deployTroopToConflict(chaniBlocked, chaniBlocked.pendingAction);
  assert.equal(
    playerById(chaniDeferred, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after deployment reaches three conflict units",
  );
  assert.deepEqual(chaniDeferred.intrigueDeck, [], "Deferred Chani draw should remove the Intrigue from the deck");
  assert.deepEqual(chaniDeferred.intrigueDiscard, [], "Deferred Chani draw should not mutate the Intrigue discard");
  assert.equal(
    chaniDeferred.pendingAction?.kind === "deploy"
      ? chaniDeferred.pendingAction.postDeployIntrigueDraw
      : undefined,
    undefined,
    "Deferred Chani draw should resolve at most once",
  );
  const chaniMultiDeployFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-multi-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 1,
    deployedSandworms: 0,
    garrison: 2,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniMultiDeployPending = turnActions.placeAgentAction(
    { ...chaniMultiDeployFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    chaniMultiDeployPending.pendingAction?.kind,
    "deploy",
    "Multi-deploy Chani fixture should queue deployment",
  );
  const chaniFirstDeploy = state.deployTroopToConflict(chaniMultiDeployPending, chaniMultiDeployPending.pendingAction);
  assert.equal(
    playerById(chaniFirstDeploy, p2.id).intrigues.length,
    0,
    "Chani should not draw after a first deployment that remains below three conflict units",
  );
  assert.equal(
    chaniFirstDeploy.pendingAction?.kind === "deploy"
      ? chaniFirstDeploy.pendingAction.postDeployIntrigueDraw?.minConflictUnits
      : undefined,
    3,
    "Chani's deferred draw should stay pending until a later deployment reaches the threshold",
  );
  assert.equal(chaniFirstDeploy.intrigueDeck[0]?.id, chaniIntrigue.id, "Below-threshold Chani deployment should leave the deck untouched");
  assert.equal(
    chaniFirstDeploy.pendingAction?.kind,
    "deploy",
    "Chani should still have a deployment pending after the first multi-deploy troop",
  );
  const chaniSecondDeploy = state.deployTroopToConflict(chaniFirstDeploy, chaniFirstDeploy.pendingAction);
  assert.equal(
    playerById(chaniSecondDeploy, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after a later deployment reaches three conflict units",
  );
  assert.deepEqual(chaniSecondDeploy.intrigueDeck, [], "Multi-deploy Chani draw should remove the Intrigue from the deck");
  assert.equal(
    chaniSecondDeploy.pendingAction?.kind === "deploy"
      ? chaniSecondDeploy.pendingAction.postDeployIntrigueDraw
      : undefined,
    undefined,
    "Multi-deploy Chani draw should clear the deferred draw after it resolves",
  );
  const chaniSkippedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-skipped-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniSkippedPending = turnActions.placeAgentAction(
    { ...chaniSkippedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  const chaniSkipped = state.finishPendingAction(chaniSkippedPending);
  assert.equal(
    playerById(chaniSkipped, p2.id).intrigues.length,
    0,
    "Skipping deployment should not resolve Chani's deferred Intrigue draw below the threshold",
  );
  assert.deepEqual(chaniSkipped.intrigueDeck, [chaniIntrigue], "Skipped Chani deployment should leave the Intrigue deck untouched");
  assert.deepEqual(chaniSkipped.intrigueDiscard, [], "Skipped Chani deployment should leave the Intrigue discard untouched");

  const chaniMakerFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    garrison: 0,
    hand: [chani],
    intrigues: [],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const chaniMakerChoice = turnActions.placeAgentAction(
    { ...chaniMakerFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], shieldWall: false, spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
  );
  assert.equal(chaniMakerChoice.pendingAction?.kind, "maker-choice", "Chani on Hagga Basin should defer through the Maker choice");
  assert.equal(
    chaniMakerChoice.pendingAction?.kind === "maker-choice"
      ? chaniMakerChoice.pendingAction.postDeployIntrigueDraw?.minConflictUnits
      : undefined,
    3,
    "Maker-choice Chani draw should carry the conflict-unit threshold",
  );
  const chaniMakerWorm = state.resolveMakerChoice(chaniMakerChoice, chaniMakerChoice.pendingAction, "sandworms");
  assert.equal(
    playerById(chaniMakerWorm, p3.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after a Maker-choice sandworm reaches three conflict units",
  );
  assert.deepEqual(chaniMakerWorm.intrigueDeck, [], "Maker-choice Chani draw should remove the Intrigue from the deck");
  assert.deepEqual(chaniMakerWorm.intrigueDiscard, [], "Maker-choice Chani draw should not mutate the Intrigue discard");
  const chaniMakerDeployFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    garrison: 1,
    hand: [chani],
    intrigues: [],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const chaniMakerDeployChoice = turnActions.placeAgentAction(
    {
      ...chaniMakerDeployFixture,
      intrigueDeck: [chaniIntrigue, chaniSecondIntrigue],
      intrigueDiscard: [],
      shieldWall: false,
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
  );
  assert.equal(
    chaniMakerDeployChoice.pendingAction?.kind,
    "maker-choice",
    "Maker-choice Chani fixture should resolve a Maker choice first",
  );
  assert.equal(
    chaniMakerDeployChoice.pendingQueue[0]?.kind,
    "deploy",
    "Maker-choice Chani fixture should keep deployment queued behind the Maker choice",
  );
  const chaniMakerDeployWorm = state.resolveMakerChoice(
    chaniMakerDeployChoice,
    chaniMakerDeployChoice.pendingAction,
    "sandworms",
  );
  assert.equal(
    playerById(chaniMakerDeployWorm, p3.id).intrigues.length,
    1,
    "Maker-choice Chani should draw once when the sandworm reaches the threshold",
  );
  assert.deepEqual(
    chaniMakerDeployWorm.intrigueDeck,
    [chaniSecondIntrigue],
    "Maker-choice Chani should leave the second Intrigue card in the deck after the first draw",
  );
  assert.equal(
    chaniMakerDeployWorm.pendingAction?.kind === "deploy"
      ? chaniMakerDeployWorm.pendingAction.postDeployIntrigueDraw
      : undefined,
    undefined,
    "Maker-choice Chani draw should clear duplicate deferred metadata from the queued deploy",
  );
  assert.equal(chaniMakerDeployWorm.pendingAction?.kind, "deploy", "Maker-choice Chani should advance to the queued deploy");
  const chaniMakerDeployAfterDeploy = state.deployTroopToConflict(
    chaniMakerDeployWorm,
    chaniMakerDeployWorm.pendingAction,
  );
  assert.equal(
    playerById(chaniMakerDeployAfterDeploy, p3.id).intrigues.length,
    1,
    "Queued deployment after a Maker-choice Chani draw should not draw a second Intrigue",
  );
  assert.deepEqual(
    chaniMakerDeployAfterDeploy.intrigueDeck,
    [chaniSecondIntrigue],
    "Queued deployment after a Maker-choice Chani draw should leave the remaining Intrigue in the deck",
  );
}
