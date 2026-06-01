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
