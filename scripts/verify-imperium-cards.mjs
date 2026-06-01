import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function resolveSetupPendingActions(state, game) {
  let current = game;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Expected an eligible Throne Row setup card");
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
  }
  assert.equal(current.pendingAction, undefined, "Imperium card verifier setup should not leave pending actions");
  return current;
}

function withActivePlayer(game, playerId, patch) {
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected ${playerId}`);
  return {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    roundMakerSpaceVisits: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = resolveSetupPendingActions(state, state.initialGame());
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  assert.ok(smuggler, "Imperium deck should include Smuggler's Harvester");
  assert.equal(state.isSmugglersHarvesterCard(smuggler), true, "Smuggler's Harvester should be recognized");
  assert.match(smuggler.reveal, /Maker board space/, "Smuggler's Harvester should show its conditional Reveal text");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  assert.ok(interstellarTrade, "Imperium deck should include Interstellar Trade");
  assert.equal(state.isInterstellarTradeCard(interstellarTrade), true, "Interstellar Trade should be recognized");
  assert.equal(
    interstellarTrade.conditionalPersuasion,
    false,
    "Interstellar Trade should have structured reveal persuasion instead of manual printed reveal handling",
  );
  assert.match(interstellarTrade.reveal, /completed contract/, "Interstellar Trade should describe its contract reveal text");
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  assert.ok(calculus, "Imperium deck should include Calculus of Power");
  assert.equal(state.isCalculusOfPowerCard(calculus), true, "Calculus of Power should be recognized");
  assert.equal(
    calculus.conditionalSwords,
    false,
    "Calculus of Power should use structured optional trash strength instead of manual printed reveal handling",
  );
  assert.match(calculus.reveal, /another Emperor card/, "Calculus of Power should describe its structured Reveal trash text");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  assert.ok(capturedMentat, "Imperium deck should include Captured Mentat");
  assert.equal(state.isCapturedMentatCard(capturedMentat), true, "Captured Mentat should be recognized");
  assert.equal(capturedMentat.cost, 5, "Captured Mentat should cost 5 persuasion");
  assert.deepEqual(capturedMentat.icons, ["landsraad", "spice"], "Captured Mentat should reach Landsraad and Spice Trade spaces");
  assert.equal(capturedMentat.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.equal(capturedMentat.conditionalPersuasion, false, "Captured Mentat should not need manual persuasion entry");
  assert.match(capturedMentat.play, /discard 1 card.*gain 1 Influence.*draw 1 card/i);
  assert.match(capturedMentat.reveal, /lose 1 Influence.*draw 1 Intrigue/i);
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Reserve market should include Prepare The Way");
  assert.equal(state.isPrepareTheWayCard(prepareTheWay), true, "Prepare The Way should be recognized");
  assert.deepEqual(
    data.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Reserve market should expose Prepare The Way and The Spice Must Flow",
  );
  assert.equal(prepareTheWay.cost, 2, "Prepare The Way should cost 2 persuasion");
  assert.deepEqual(prepareTheWay.icons, ["landsraad", "city"], "Prepare The Way should send Agents to Landsraad and City spaces");
  assert.equal(prepareTheWay.persuasion, 2, "Prepare The Way should reveal for 2 persuasion");
  assert.equal(prepareTheWay.conditionalPersuasion, false, "Prepare The Way should not require manual reveal handling");
  assert.deepEqual(prepareTheWay.traits, ["Faction: Bene Gesserit"], "Prepare The Way should keep its Bene Gesserit trait");
  assert.match(prepareTheWay.play, /2 or more Bene Gesserit Influence.*draw 1 card/i);
  assert.match(prepareTheWay.reveal, /\+2 persuasion/i);
  const calculusTrashTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusTrashTarget, "Expected an Emperor Imperium card for Calculus of Power trash coverage");
  const calculusBlockedTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && !card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusBlockedTarget, "Expected a non-Emperor Imperium card for Calculus of Power filtering coverage");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin?.maker, "Imperial Basin should be a Maker board space");
  const carthag = data.boardSpaces.find((space) => space.id === "carthag");
  assert.ok(carthag, "Carthag should exist for Prepare The Way Agent coverage");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(highCouncil, "High Council should exist for Captured Mentat Agent coverage");
  const p2 = playerById(game, "p2");
  const p4 = playerById(game, "p4");
  const dune = [...p2.hand, ...p2.deck, ...p2.discard].find((card) => card.name === "Dune, The Desert Planet");
  assert.ok(dune, "Feyd should have Dune, The Desert Planet available for a Spice Trade Agent turn");

  const prepareBuyFixture = withActivePlayer(game, p2.id, () => ({
    revealed: true,
    persuasion: 2,
  }));
  const prepareBought = state.acquireMarketCard(prepareBuyFixture, p2.id, prepareTheWay.id);
  assert.equal(playerById(prepareBought, p2.id).persuasion, 0, "Prepare The Way should spend 2 persuasion");
  assert.equal(playerById(prepareBought, p2.id).vp, p2.vp, "Prepare The Way should not award acquisition VP");
  assert.equal(playerById(prepareBought, p2.id).discard.at(-1).sourceId, 537, "Prepare The Way should go to discard");
  assert.notEqual(
    playerById(prepareBought, p2.id).discard.at(-1).id,
    prepareTheWay.id,
    "Reserve acquisitions should create a physical card copy",
  );
  assert.deepEqual(
    prepareBought.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Buying Prepare The Way should leave the reserve stack available",
  );

  const prepareDrawCard = { ...calculusTrashTarget, id: "prepare-way-draw-target" };
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
  assert.equal(playerById(prepared, p2.id).hand.length, 1, "Prepare The Way should draw 1 card at 2 Bene Gesserit Influence");
  assert.equal(playerById(prepared, p2.id).hand[0].id, prepareDrawCard.id);
  assert.ok(playerById(prepared, p2.id).playArea.some((card) => card.id === prepareTheWay.id));
  assert.ok(prepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

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
    { commanderTargets: {}, selectedCard: prepareTheWay, selectedSpace: carthag },
  );
  assert.equal(playerById(unprepared, p2.id).hand.length, 0, "Prepare The Way should not draw below 2 Bene Gesserit Influence");
  assert.equal(
    unprepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)),
    false,
    "Prepare The Way should not log a draw when the threshold is unmet",
  );

  const capturedDiscardCard = { ...dune, id: "captured-mentat-discard-card" };
  const capturedDrawCard = { ...calculusTrashTarget, id: "captured-mentat-draw-card" };
  const capturedMentatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [capturedDrawCard],
    discard: [],
    hand: [capturedMentat, capturedDiscardCard],
    influence: { emperor: 0, spacing: 0, bene: 0, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(capturedMentat, playerById(capturedMentatFixture, p2.id), capturedMentatFixture),
    undefined,
    "Captured Mentat should only queue from play",
  );
  const capturedMentatPlayed = turnActions.placeAgentAction(capturedMentatFixture, {
    commanderTargets: {},
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.equal(capturedMentatPlayed.pendingAction?.kind, "captured-mentat", "Captured Mentat should queue its Agent choice");
  assert.equal(capturedMentatPlayed.pendingAction.ownerId, p2.id);
  assert.deepEqual(
    state.capturedMentatDiscardChoices(playerById(capturedMentatPlayed, p2.id), capturedMentatPlayed.pendingAction).map((card) => card.id),
    [capturedDiscardCard.id],
    "Captured Mentat should discard from the remaining hand",
  );
  assert.deepEqual(
    state.capturedMentatInfluenceChoices(playerById(capturedMentatPlayed, p2.id)),
    ["greatHouses", "spacing", "bene", "fringeWorlds"],
    "Ally Captured Mentat should choose among main-board Influence tracks",
  );
  assert.equal(
    state.resolveCapturedMentatChoice(capturedMentatPlayed, capturedMentatPlayed.pendingAction, "missing-card", "bene"),
    capturedMentatPlayed,
    "Captured Mentat should reject missing discard cards",
  );
  assert.equal(
    state.resolveCapturedMentatChoice(capturedMentatPlayed, capturedMentatPlayed.pendingAction, capturedDiscardCard.id, "emperor"),
    capturedMentatPlayed,
    "Captured Mentat should reject invalid Influence choices",
  );
  const capturedMentatResolved = state.resolveCapturedMentatChoice(
    capturedMentatPlayed,
    capturedMentatPlayed.pendingAction,
    capturedDiscardCard.id,
    "bene",
  );
  assert.equal(capturedMentatResolved.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatResolved, p2.id).hand.map((card) => card.id), [capturedDrawCard.id]);
  assert.equal(playerById(capturedMentatResolved, p2.id).discard.at(-1).id, capturedDiscardCard.id);
  assert.equal(playerById(capturedMentatResolved, p2.id).influence.bene, 1);
  assert.ok(capturedMentatResolved.log.some((entry) => /Captured Mentat: discards .* gains 1 Bene Gesserit Influence.*draws 1 card/.test(entry)));
  const capturedMentatSkipped = state.skipCapturedMentat(capturedMentatPlayed, capturedMentatPlayed.pendingAction);
  assert.equal(capturedMentatSkipped.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatSkipped, p2.id).hand.map((card) => card.id), [capturedDiscardCard.id]);
  assert.equal(playerById(capturedMentatSkipped, p2.id).influence.bene, 0);

  const capturedMentatNoDiscard = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [capturedDrawCard],
      discard: [],
      hand: [capturedMentat],
      playArea: [],
      resources: { solari: 6, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: capturedMentat, selectedSpace: highCouncil },
  );
  assert.equal(capturedMentatNoDiscard.pendingAction, undefined, "Captured Mentat should not pause without a card to discard");

  const commanderCapturedDiscard = { ...dune, id: "commander-captured-mentat-discard-card" };
  const commanderCapturedDraw = { ...calculusTrashTarget, id: "commander-captured-mentat-draw-card" };
  const commanderCapturedBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderCapturedDraw],
    discard: [],
    hand: [capturedMentat, commanderCapturedDiscard],
    influence: { ...player.influence, emperor: 0, greatHouses: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  const commanderCapturedFixture = {
    ...commanderCapturedBase,
    players: commanderCapturedBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 0 }, vp: 0 }
        : player,
    ),
  };
  const commanderCapturedPlayed = turnActions.placeAgentAction(commanderCapturedFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.deepEqual(
    state.capturedMentatInfluenceChoices(playerById(commanderCapturedPlayed, p4.id)),
    ["emperor", "greatHouses", "spacing", "bene", "fringeWorlds"],
    "Shaddam Captured Mentat should include personal Emperor and main-board Influence choices",
  );
  assert.equal(commanderCapturedPlayed.pendingAction.influenceOwnerId, p2.id);
  const commanderCapturedResolved = state.resolveCapturedMentatChoice(
    commanderCapturedPlayed,
    commanderCapturedPlayed.pendingAction,
    commanderCapturedDiscard.id,
    "greatHouses",
  );
  assert.equal(playerById(commanderCapturedResolved, p2.id).influence.greatHouses, 1);
  assert.equal(playerById(commanderCapturedResolved, p4.id).influence.greatHouses, 0);
  assert.deepEqual(playerById(commanderCapturedResolved, p4.id).hand.map((card) => card.id), [commanderCapturedDraw.id]);
  assert.equal(playerById(commanderCapturedResolved, p2.id).hand.length, playerById(commanderCapturedPlayed, p2.id).hand.length);

  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "captured-mentat-intrigue-draw" };
  const capturedMentatRevealBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { emperor: 0, spacing: 0, bene: 2, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const capturedMentatRevealFixture = {
    ...capturedMentatRevealBase,
    intrigueDeck: [capturedMentatIntrigue],
    intrigueDiscard: [],
  };
  const capturedMentatRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatRevealFixture, p2.id),
    capturedMentatRevealFixture,
  );
  assert.equal(capturedMentatRevealPlan.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.deepEqual(
    capturedMentatRevealPlan.printedRevealCards,
    [],
    "Captured Mentat reveal should use structured Influence-for-Intrigue handling",
  );
  const capturedMentatRevealed = turnActions.revealTurnAction(capturedMentatRevealFixture, {
    commanderTargets: {},
    revealPlan: capturedMentatRevealPlan,
  });
  assert.equal(capturedMentatRevealed.pendingAction?.kind, "captured-mentat-reveal");
  assert.deepEqual(
    state.capturedMentatRevealInfluenceChoices(playerById(capturedMentatRevealed, p2.id)),
    ["bene"],
    "Captured Mentat reveal should expose positive Influence tracks",
  );
  assert.equal(
    state.resolveCapturedMentatRevealChoice(capturedMentatRevealed, capturedMentatRevealed.pendingAction, "emperor"),
    capturedMentatRevealed,
    "Captured Mentat reveal should reject Influence tracks the player cannot lose",
  );
  const capturedMentatRevealResolved = state.resolveCapturedMentatRevealChoice(
    capturedMentatRevealed,
    capturedMentatRevealed.pendingAction,
    "bene",
  );
  assert.equal(capturedMentatRevealResolved.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).influence.bene, 1);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).vp, 0, "Captured Mentat reveal should lose Influence threshold VP");
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).intrigues.at(-1).id, capturedMentatIntrigue.id);
  const capturedMentatRevealSkipped = state.skipCapturedMentatReveal(capturedMentatRevealed, capturedMentatRevealed.pendingAction);
  assert.equal(capturedMentatRevealSkipped.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).influence.bene, 2);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).intrigues.length, 0);

  const commanderCapturedMentatIntrigue = { ...data.intrigueCards[1], id: "commander-captured-mentat-intrigue-draw" };
  const commanderCapturedRevealBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { ...player.influence, emperor: 2, greatHouses: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const commanderCapturedRevealFixture = {
    ...commanderCapturedRevealBase,
    intrigueDeck: [commanderCapturedMentatIntrigue],
    intrigueDiscard: [],
    players: commanderCapturedRevealBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 2 }, vp: 1 }
        : player,
    ),
  };
  const commanderCapturedRevealPlan = turnActions.revealTurnPlan(
    playerById(commanderCapturedRevealFixture, p4.id),
    commanderCapturedRevealFixture,
  );
  const commanderCapturedRevealed = turnActions.revealTurnAction(commanderCapturedRevealFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCapturedRevealPlan,
  });
  assert.deepEqual(
    state.capturedMentatRevealInfluenceChoices(playerById(commanderCapturedRevealed, p4.id)),
    ["emperor"],
    "Commander Captured Mentat reveal should expose only personal Influence",
  );
  const commanderCapturedRevealResolved = state.resolveCapturedMentatRevealChoice(
    commanderCapturedRevealed,
    commanderCapturedRevealed.pendingAction,
    "emperor",
  );
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).influence.emperor, 1);
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).intrigues.at(-1).id, commanderCapturedMentatIntrigue.id);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).influence.greatHouses, 2);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).intrigues.length, playerById(commanderCapturedRevealed, p2.id).intrigues.length);

  const commanderPrepareDrawCard = { ...calculusTrashTarget, id: "commander-prepare-way-draw-target" };
  const commanderPrepareBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderPrepareDrawCard],
    discard: [],
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderPrepareFixture = {
    ...commanderPrepareBase,
    players: commanderPrepareBase.players.map((player) => {
      if (player.id === p2.id) return { ...player, garrison: 0, hand: [], influence: { ...player.influence, bene: 0 } };
      if (player.id === "p6") return { ...player, influence: { ...player.influence, bene: 2 } };
      return player;
    }),
  };
  const commanderPrepared = turnActions.placeAgentAction(commanderPrepareFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(
    playerById(commanderPrepared, p4.id).hand[0].id,
    commanderPrepareDrawCard.id,
    "Commander Prepare The Way should draw for the Commander through shared Bene Gesserit Influence",
  );
  assert.equal(playerById(commanderPrepared, p2.id).hand.length, 0, "Activated Ally should not receive the drawn card");
  assert.ok(commanderPrepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

  const noMakerReveal = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const noMakerPlan = turnActions.revealTurnPlan(playerById(noMakerReveal, p2.id), noMakerReveal);
  assert.equal(noMakerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not pay without a Maker visit");

  const makerAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [dune, smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const afterMakerAgent = turnActions.placeAgentAction(makerAgentFixture, {
    commanderTargets: {},
    selectedCard: dune,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    state.hasVisitedMakerSpaceThisRound(afterMakerAgent, p2.id),
    true,
    "Sending an Agent to a Maker board space should mark that player for round reveal checks",
  );
  assert.equal(playerById(afterMakerAgent, p2.id).resources.spice, 1, "Imperial Basin should pay its base spice");
  assert.deepEqual(afterMakerAgent.pendingAction, undefined, "Zero garrison should avoid a deployment pending action");

  const revealFixture = {
    ...afterMakerAgent,
    activeSeat: makerAgentFixture.activeSeat,
    agentTurnComplete: false,
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: afterMakerAgent.players.map((player) =>
      player.id === p2.id ? { ...player, agentsReady: 0, revealed: false, persuasion: 0 } : player,
    ),
  };
  const makerPlan = turnActions.revealTurnPlan(playerById(revealFixture, p2.id), revealFixture);
  assert.equal(makerPlan.persuasion, 1, "Smuggler's Harvester should still reveal for 1 persuasion");
  assert.equal(makerPlan.revealGain.spice, 1, "Smuggler's Harvester should add 1 reveal spice after a Maker visit");

  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: {},
    revealPlan: makerPlan,
  });
  assert.equal(playerById(revealed, p2.id).resources.spice, 2, "Smuggler's Harvester should add 1 spice on Reveal");
  assert.equal(revealed.turnSpiceGains[p2.id], 1, "Smuggler's Harvester reveal spice should count as turn spice gain");
  assert.equal(playerById(revealed, p2.id).persuasion, 1);
  assert.deepEqual(playerById(revealed, p2.id).hand, [], "Reveal should move Smuggler's Harvester from hand");
  assert.ok(
    playerById(revealed, p2.id).playArea.some((card) => card.id === smuggler.id),
    "Reveal should put Smuggler's Harvester into play area",
  );

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const incompleteContract = {
    card: data.standardContracts[2],
    completed: false,
    takenRound: 1,
  };
  assert.ok(incompleteContract.card, "Expected a third standard contract for Interstellar Trade coverage");
  const interstellarFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    contracts: [...completedContracts, incompleteContract],
    discard: [],
    hand: [interstellarTrade],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const interstellarPlan = turnActions.revealTurnPlan(playerById(interstellarFixture, p2.id), interstellarFixture);
  assert.equal(interstellarPlan.persuasion, 2, "Interstellar Trade should reveal for 1 persuasion per completed contract");
  assert.deepEqual(
    interstellarPlan.printedRevealCards,
    [],
    "Interstellar Trade should not require a manual printed reveal adjustment",
  );
  const interstellarRevealed = turnActions.revealTurnAction(interstellarFixture, {
    commanderTargets: {},
    revealPlan: interstellarPlan,
  });
  assert.equal(playerById(interstellarRevealed, p2.id).persuasion, 2);
  assert.equal(interstellarRevealed.pendingAction, undefined, "Interstellar Trade reveal should not pause for printed text");
  const lateCompletedContract = {
    card: data.standardContracts[3],
    completed: true,
    takenRound: 1,
  };
  assert.ok(lateCompletedContract.card, "Expected a fourth standard contract for Interstellar Trade one-shot coverage");
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

  const calculusFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedSandworms: 0,
    deployedTroops: 1,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget, calculusBlockedTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusPlan = turnActions.revealTurnPlan(playerById(calculusFixture, p2.id), calculusFixture);
  assert.equal(calculusPlan.persuasion, 2, "Calculus of Power should keep its printed 2 persuasion");
  assert.equal(calculusPlan.swords, 0, "Calculus of Power optional swords should not be added before trashing");
  assert.deepEqual(
    calculusPlan.printedRevealCards,
    [],
    "Calculus of Power should not require a manual printed reveal adjustment",
  );
  const calculusRevealed = turnActions.revealTurnAction(calculusFixture, {
    commanderTargets: {},
    revealPlan: calculusPlan,
  });
  assert.equal(calculusRevealed.pendingAction?.kind, "trash-card", "Calculus of Power should queue optional trash");
  const calculusPending = calculusRevealed.pendingAction;
  assert.equal(calculusPending.source, "Calculus of Power");
  assert.equal(calculusPending.optional, true);
  assert.deepEqual(calculusPending.zones, ["playArea"]);
  assert.equal(calculusPending.excludeCardId, calculus.id);
  assert.equal(calculusPending.requiredTrait, "Faction: Emperor");
  assert.equal(calculusPending.combatRecipientId, p2.id);
  assert.equal(calculusPending.strengthReward, 3);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusRevealed, p2.id), calculusPending).map(({ card }) => card.id),
    [calculusTrashTarget.id],
    "Calculus of Power should only allow another Emperor card in play",
  );
  const blockedCalculusTrash = state.trashPlayerCard(
    calculusRevealed,
    calculusPending,
    "playArea",
    calculusBlockedTarget.id,
  );
  assert.equal(
    blockedCalculusTrash.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should reject non-Emperor trash choices",
  );
  assert.equal(playerById(blockedCalculusTrash, p2.id).conflict, 4);
  const afterCalculusTrash = state.trashPlayerCard(calculusRevealed, calculusPending, "playArea", calculusTrashTarget.id);
  assert.equal(playerById(afterCalculusTrash, p2.id).conflict, 7, "Calculus of Power trash should add 3 strength");
  assert.equal(afterCalculusTrash.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculus.id),
    "Calculus of Power should not trash itself",
  );
  assert.equal(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    false,
    "Calculus of Power should trash the selected Emperor card",
  );
  const afterCalculusSkip = state.skipTrashCard(calculusRevealed, calculusPending);
  assert.equal(playerById(afterCalculusSkip, p2.id).conflict, 4, "Skipping Calculus of Power should not add strength");
  assert.equal(afterCalculusSkip.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusSkip, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    "Skipping Calculus of Power should leave eligible cards in play",
  );
  const baseCommanderCalculusFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    conflict: 0,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderCalculusFixture = {
    ...baseCommanderCalculusFixture,
    players: baseCommanderCalculusFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 5, deployedSandworms: 0, deployedTroops: 1 }
        : player,
    ),
  };
  const commanderCalculusPlan = turnActions.revealTurnPlan(playerById(commanderCalculusFixture, p4.id), commanderCalculusFixture);
  const commanderCalculusRevealed = turnActions.revealTurnAction(commanderCalculusFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCalculusPlan,
  });
  assert.equal(
    commanderCalculusRevealed.pendingAction?.kind,
    "trash-card",
    "Commander Calculus of Power should queue trash from the Commander's play area",
  );
  assert.equal(commanderCalculusRevealed.pendingAction.ownerId, p4.id);
  assert.equal(commanderCalculusRevealed.pendingAction.combatRecipientId, p2.id);
  const afterCommanderCalculusTrash = state.trashPlayerCard(
    commanderCalculusRevealed,
    commanderCalculusRevealed.pendingAction,
    "playArea",
    calculusTrashTarget.id,
  );
  assert.equal(playerById(afterCommanderCalculusTrash, p4.id).conflict, 0, "Commander should not receive Calculus strength");
  assert.equal(playerById(afterCommanderCalculusTrash, p2.id).conflict, 8, "Activated Ally should receive Calculus strength");

  console.log("Imperium card verification passed");
} finally {
  await server.close();
}
