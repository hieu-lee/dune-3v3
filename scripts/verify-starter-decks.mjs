import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyStarterDeckCatalog } from "./verify-starter-decks-catalog.mjs";
import { verifyStarterDeckCommandRespect } from "./verify-starter-decks-command-respect.mjs";
import { verifyStarterDeckDesertCall } from "./verify-starter-decks-desert-call.mjs";
import { verifyStarterDeckDemandAttention } from "./verify-starter-decks-demand-attention.mjs";
import { verifyStarterDeckThreatenSpiceProduction } from "./verify-starter-decks-threaten-spice-production.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const {
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB, shaddamAllyB },
  } = verifyStarterDeckCatalog({ data, state });

  verifyStarterDeckCommandRespect({
    data,
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB },
    state,
  });

  const {
    conflicts: { nonProtectedDesertCallConflict },
    spaces: { haggaForDesertCall, imperialBasinForDesertCall, spiceRefineryForDesertCall },
  } = verifyStarterDeckDesertCall({
    data,
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, muadDibAllyB },
    state,
  });

  verifyStarterDeckThreatenSpiceProduction({
    conflicts: { nonProtectedDesertCallConflict },
    data,
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB, shaddamAllyB },
    spaces: { haggaForDesertCall, imperialBasinForDesertCall, spiceRefineryForDesertCall },
    state,
  });

  verifyStarterDeckDemandAttention({
    data,
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, muadDibAllyB },
    state,
  });

  const usul = data.muadDibCommanderCards.find((card) => card.name === "Usul");
  assert.ok(usul, "Muad'Dib Commander deck should include Usul");
  assert.equal(state.isUsulCommanderCard(usul), true, "Usul should be recognized as its Commander starter card");
  const muadDibWithUsul = { ...muadDib, playArea: [usul] };
  const usulGame = {
    ...game,
    players: game.players.map((player) => player.id === muadDib.id ? muadDibWithUsul : player),
  };
  const usulPending = state.pendingActionForCard(usul, muadDibWithUsul, usulGame, muadDibAllyA);
  assert.deepEqual(usulPending, {
    kind: "commander-resource-split",
    commanderId: muadDib.id,
    allyId: muadDibAllyA.id,
    team: "muaddib",
    source: "Usul",
    options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
      { commanderResource: "spice", commanderAmount: 1, allyResource: "water", allyAmount: 1 },
    ],
  });
  assert.equal(
    state.pendingActionForCard(usul, muadDib, game, muadDibAllyA),
    undefined,
    "Usul should require the played card in the Commander's play area",
  );
  assert.equal(
    state.pendingActionForCard(usul, muadDibWithUsul, usulGame, shaddamAlly),
    undefined,
    "Usul should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(usul, { ...muadDibAllyA, playArea: [usul] }, game, muadDibAllyB),
    undefined,
    "Usul should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(usul, muadDibWithUsul, usulGame),
    undefined,
    "Usul needs the activated Ally target",
  );

  const baseUsulResolution = {
    ...game,
    pendingAction: usulPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === muadDib.id || player.id === muadDibAllyA.id
        ? { ...player, resources: { solari: 0, spice: 0, water: 0 } }
        : player,
    ),
    log: [],
  };
  const waterSplit = state.resolveCommanderResourceSplitChoice(baseUsulResolution, usulPending, 0);
  assert.equal(playerById(waterSplit, muadDib.id).resources.water, 1, "Usul water choice gives Commander water");
  assert.equal(playerById(waterSplit, muadDib.id).resources.spice, 0, "Usul water choice does not give Commander spice");
  assert.equal(playerById(waterSplit, muadDibAllyA.id).resources.spice, 1, "Usul water choice gives Ally spice");
  assert.equal(state.hasGainedSpiceThisTurn(waterSplit, muadDibAllyA.id), true, "Usul should track Ally spice gains");
  assert.equal(waterSplit.pendingAction, undefined, "Usul resolution should advance pending action");
  assert.match(waterSplit.log[0], /resolves Usul/, "Usul resolution should log the split");

  const spiceSplit = state.resolveCommanderResourceSplitChoice(baseUsulResolution, usulPending, 1);
  assert.equal(playerById(spiceSplit, muadDib.id).resources.spice, 1, "Usul spice choice gives Commander spice");
  assert.equal(playerById(spiceSplit, muadDib.id).resources.water, 0, "Usul spice choice does not give Commander water");
  assert.equal(playerById(spiceSplit, muadDibAllyA.id).resources.water, 1, "Usul spice choice gives Ally water");
  assert.equal(state.hasGainedSpiceThisTurn(spiceSplit, muadDib.id), true, "Usul should track Commander spice gains");

  const arrakeen = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeen, "Arrakeen should exist for Usul queue regression");
  const arrakeenDeployPending = state.pendingActionForSpace(arrakeen, muadDib, muadDibAllyA, game.players);
  assert.deepEqual(arrakeenDeployPending, {
    kind: "deploy",
    ownerId: muadDibAllyA.id,
    remaining: 3,
    source: "Arrakeen",
  });
  const queuedUsulActions = state.pendingActionsFor(arrakeenDeployPending, usulPending, muadDib.spies);
  const queueBaseUsulResolution = { ...baseUsulResolution, pendingAction: undefined, pendingQueue: [] };
  const queuedUsulState = {
    ...queueBaseUsulResolution,
    ...state.queuePendingActions(queueBaseUsulResolution, queuedUsulActions),
  };
  assert.deepEqual(
    queuedUsulState.pendingAction,
    arrakeenDeployPending,
    "Usul should wait behind the combat-space deployment choice",
  );
  assert.deepEqual(queuedUsulState.pendingQueue, [usulPending], "Usul should be queued after deployment");
  const skippedDeployState = state.finishPendingAction(queuedUsulState);
  assert.deepEqual(skippedDeployState.pendingAction, usulPending, "Finishing deployment should expose Usul next");
  const queuedWaterSplit = state.resolveCommanderResourceSplitChoice(skippedDeployState, usulPending, 0);
  assert.equal(playerById(queuedWaterSplit, muadDib.id).resources.water, 1, "Queued Usul gives Commander water");
  assert.equal(playerById(queuedWaterSplit, muadDibAllyA.id).resources.spice, 1, "Queued Usul gives Ally spice");
  assert.equal(queuedWaterSplit.pendingAction, undefined, "Queued Usul resolution clears the pending queue");

  const wrongTeamUsulState = state.resolveCommanderResourceSplitChoice(
    {
      ...baseUsulResolution,
      pendingAction: { ...usulPending, team: "shaddam" },
    },
    { ...usulPending, team: "shaddam" },
    0,
  );
  assert.equal(playerById(wrongTeamUsulState, muadDib.id).resources.water, 0, "Wrong-team Usul should not pay Muad'Dib");
  assert.equal(playerById(wrongTeamUsulState, muadDibAllyA.id).resources.spice, 0, "Wrong-team Usul should not pay Ally");

  const criticalShipments = data.emperorCommanderCards.find((card) => card.name === "Critical Shipments");
  assert.ok(criticalShipments, "Emperor Commander deck should include Critical Shipments");
  assert.equal(
    state.isCriticalShipmentsCommanderCard(criticalShipments),
    true,
    "Critical Shipments should be recognized as its Commander starter card",
  );
  const emperorWithCriticalShipments = { ...emperor, playArea: [criticalShipments] };
  const criticalShipmentsGame = {
    ...game,
    players: game.players.map((player) => player.id === emperor.id ? emperorWithCriticalShipments : player),
  };
  const criticalShipmentsPending = state.pendingActionForCard(
    criticalShipments,
    emperorWithCriticalShipments,
    criticalShipmentsGame,
    shaddamAlly,
  );
  assert.deepEqual(criticalShipmentsPending, {
    kind: "commander-resource-split",
    commanderId: emperor.id,
    allyId: shaddamAlly.id,
    team: "shaddam",
    source: "Critical Shipments",
    options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "solari", allyAmount: 2 },
      { commanderResource: "solari", commanderAmount: 2, allyResource: "water", allyAmount: 1 },
    ],
  });
  assert.equal(
    state.pendingActionForCard(criticalShipments, emperor, game, shaddamAlly),
    undefined,
    "Critical Shipments should require the played card in the Commander's play area",
  );
  assert.equal(
    state.pendingActionForCard(criticalShipments, emperorWithCriticalShipments, criticalShipmentsGame, muadDibAllyA),
    undefined,
    "Critical Shipments should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(criticalShipments, { ...shaddamAlly, playArea: [criticalShipments] }, game, shaddamAllyB),
    undefined,
    "Critical Shipments should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(criticalShipments, emperorWithCriticalShipments, criticalShipmentsGame),
    undefined,
    "Critical Shipments needs the activated Ally target",
  );

  const baseCriticalShipmentsResolution = {
    ...game,
    pendingAction: criticalShipmentsPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === emperor.id || player.id === shaddamAlly.id
        ? { ...player, resources: { solari: 0, spice: 0, water: 0 } }
        : player,
    ),
    log: [],
  };
  const commanderWaterSplit = state.resolveCommanderResourceSplitChoice(
    baseCriticalShipmentsResolution,
    criticalShipmentsPending,
    0,
  );
  assert.equal(
    playerById(commanderWaterSplit, emperor.id).resources.water,
    1,
    "Critical Shipments water choice gives Commander water",
  );
  assert.equal(
    playerById(commanderWaterSplit, shaddamAlly.id).resources.solari,
    2,
    "Critical Shipments water choice gives Ally 2 Solari",
  );
  assert.match(
    commanderWaterSplit.log[0],
    /resolves Critical Shipments/,
    "Critical Shipments resolution should log the split",
  );
  const commanderSolariSplit = state.resolveCommanderResourceSplitChoice(
    baseCriticalShipmentsResolution,
    criticalShipmentsPending,
    1,
  );
  assert.equal(
    playerById(commanderSolariSplit, emperor.id).resources.solari,
    2,
    "Critical Shipments Solari choice gives Commander 2 Solari",
  );
  assert.equal(
    playerById(commanderSolariSplit, shaddamAlly.id).resources.water,
    1,
    "Critical Shipments Solari choice gives Ally water",
  );

  const acceptContract = data.boardSpaces.find((space) => space.id === "accept-contract");
  assert.ok(acceptContract, "Accept Contract should exist for Critical Shipments queue regression");
  const contractPending = state.pendingActionForSpace(acceptContract, emperor, shaddamAlly, game.players);
  assert.deepEqual(contractPending, {
    kind: "contract",
    ownerId: emperor.id,
    source: "Accept Contract",
    spaceId: "accept-contract",
  });
  const queuedCriticalShipmentsActions = state.pendingActionsFor(
    contractPending,
    criticalShipmentsPending,
    emperor.spies,
  );
  const queueBaseCriticalShipmentsResolution = {
    ...baseCriticalShipmentsResolution,
    pendingAction: undefined,
    pendingQueue: [],
  };
  const queuedCriticalShipmentsState = {
    ...queueBaseCriticalShipmentsResolution,
    ...state.queuePendingActions(queueBaseCriticalShipmentsResolution, queuedCriticalShipmentsActions),
  };
  assert.deepEqual(
    queuedCriticalShipmentsState.pendingAction,
    contractPending,
    "Critical Shipments should wait behind the spice-space contract choice",
  );
  assert.deepEqual(
    queuedCriticalShipmentsState.pendingQueue,
    [criticalShipmentsPending],
    "Critical Shipments should be queued after the spice-space choice",
  );
  const skippedContractState = state.finishPendingAction(queuedCriticalShipmentsState);
  assert.deepEqual(
    skippedContractState.pendingAction,
    criticalShipmentsPending,
    "Finishing the spice-space choice should expose Critical Shipments next",
  );
  const queuedCriticalShipmentsSplit = state.resolveCommanderResourceSplitChoice(
    skippedContractState,
    criticalShipmentsPending,
    1,
  );
  assert.equal(
    playerById(queuedCriticalShipmentsSplit, emperor.id).resources.solari,
    2,
    "Queued Critical Shipments gives Commander 2 Solari",
  );
  assert.equal(
    playerById(queuedCriticalShipmentsSplit, shaddamAlly.id).resources.water,
    1,
    "Queued Critical Shipments gives Ally water",
  );
  assert.equal(
    queuedCriticalShipmentsSplit.pendingAction,
    undefined,
    "Queued Critical Shipments resolution clears the pending queue",
  );
  const wrongTeamCriticalShipmentsState = state.resolveCommanderResourceSplitChoice(
    {
      ...baseCriticalShipmentsResolution,
      pendingAction: { ...criticalShipmentsPending, team: "muaddib" },
    },
    { ...criticalShipmentsPending, team: "muaddib" },
    1,
  );
  assert.equal(
    playerById(wrongTeamCriticalShipmentsState, emperor.id).resources.solari,
    0,
    "Wrong-team Critical Shipments should not pay Shaddam",
  );
  assert.equal(
    playerById(wrongTeamCriticalShipmentsState, shaddamAlly.id).resources.water,
    0,
    "Wrong-team Critical Shipments should not pay Ally",
  );

  const demandResults = data.emperorCommanderCards.find((card) => card.name === "Demand Results");
  assert.ok(demandResults, "Emperor Commander deck should include Demand Results");
  assert.equal(
    state.isDemandResultsCommanderCard(demandResults),
    true,
    "Demand Results should be recognized as its Commander starter card",
  );
  const demandResultsSource = {
    ...emperor,
    resources: { ...emperor.resources, solari: 2 },
    playArea: [demandResults],
  };
  const demandResultsGame = {
    ...game,
    players: game.players.map((player) => player.id === emperor.id ? demandResultsSource : player),
  };
  const demandResultsPending = state.pendingActionForCard(demandResults, demandResultsSource, demandResultsGame, shaddamAlly);
  assert.deepEqual(demandResultsPending, {
    kind: "pay-resource-for-contracts",
    ownerId: emperor.id,
    recipientIds: [shaddamAlly.id, shaddamAllyB.id],
    contractIds: [game.contractOffer[0].id, game.contractOffer[1].id],
    resource: "solari",
    cost: 2,
    optional: true,
    trashSource: true,
    cardId: demandResults.id,
    source: "Demand Results",
  });
  assert.equal(
    state.pendingActionForCard(demandResults, emperor, game, shaddamAlly),
    undefined,
    "Demand Results should require the played card in Shaddam's play area",
  );
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      { ...demandResultsSource, resources: { ...demandResultsSource.resources, solari: 1 } },
      demandResultsGame,
      shaddamAlly,
    ),
    undefined,
    "Demand Results should not queue when Shaddam cannot pay 2 Solari",
  );
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      demandResultsSource,
      { ...demandResultsGame, contractOffer: [game.contractOffer[0]] },
      shaddamAlly,
    ),
    undefined,
    "Demand Results should need both face-up public contracts",
  );
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      demandResultsSource,
      { ...demandResultsGame, players: demandResultsGame.players.filter((player) => player.id !== shaddamAllyB.id) },
      shaddamAlly,
    ),
    undefined,
    "Demand Results should need both Shaddam Allies",
  );
  assert.equal(
    state.pendingActionForCard(demandResults, shaddamAlly, game, shaddamAllyB),
    undefined,
    "Demand Results should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(demandResults, muadDib, game, muadDibAllyA),
    undefined,
    "Demand Results should not trigger for Muad'Dib's Commander",
  );
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(highCouncil, "High Council should exist for Demand Results post-cost regression");
  const poorDemandResultsSource = state.applyBoardEffect(
    { ...emperor, resources: { solari: 6, spice: 0, water: 0 }, playArea: [demandResults] },
    shaddamAlly,
    highCouncil,
    highCouncil.cost,
  ).source;
  assert.equal(
    state.pendingActionForCard(demandResults, poorDemandResultsSource, game, shaddamAlly),
    undefined,
    "Demand Results should not queue if the High Council cost leaves Shaddam without 2 Solari",
  );
  const richDemandResultsSource = state.applyBoardEffect(
    { ...emperor, resources: { solari: 7, spice: 0, water: 0 }, playArea: [demandResults] },
    shaddamAlly,
    highCouncil,
    highCouncil.cost,
  ).source;
  assert.equal(
    state.pendingActionForCard(demandResults, richDemandResultsSource, game, shaddamAlly)?.kind,
    "pay-resource-for-contracts",
    "Demand Results should queue from post-space resources when Shaddam can still pay 2 Solari",
  );

  const [contractA, contractB] = game.contractOffer;
  const [replacementA, replacementB, ...remainingContractDeck] = game.contractDeck;
  const baseDemandResultsResolution = {
    ...game,
    pendingAction: demandResultsPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === emperor.id) {
        return {
          ...player,
          resources: { solari: 2, spice: 0, water: 0 },
          playArea: [demandResults],
          contracts: [],
        };
      }
      if (player.id === shaddamAlly.id || player.id === shaddamAllyB.id) {
        return { ...player, contracts: [] };
      }
      return player;
    }),
    log: [],
  };
  const resolvedDemandResults = state.resolvePayResourceForContractsChoice(
    baseDemandResultsResolution,
    demandResultsPending,
    0,
  );
  assert.equal(
    playerById(resolvedDemandResults, emperor.id).resources.solari,
    0,
    "Demand Results resolution spends 2 Shaddam Solari",
  );
  assert.deepEqual(
    playerById(resolvedDemandResults, emperor.id).playArea,
    [],
    "Demand Results resolution trashes Demand Results from play",
  );
  assert.deepEqual(
    playerById(resolvedDemandResults, shaddamAlly.id).contracts.map((contract) => contract.card.id),
    [contractA.id],
    "Demand Results first option gives the first contract to the first Shaddam Ally",
  );
  assert.deepEqual(
    playerById(resolvedDemandResults, shaddamAllyB.id).contracts.map((contract) => contract.card.id),
    [contractB.id],
    "Demand Results first option gives the second contract to the second Shaddam Ally",
  );
  assert.equal(
    playerById(resolvedDemandResults, shaddamAlly.id).contracts[0].takenRound,
    game.round,
    "Demand Results should record the round contracts were taken",
  );
  assert.deepEqual(
    resolvedDemandResults.contractOffer.map((contract) => contract.id),
    [replacementA.id, replacementB.id],
    "Demand Results should replace both public contracts from the contract deck",
  );
  assert.deepEqual(
    resolvedDemandResults.contractDeck.map((contract) => contract.id),
    remainingContractDeck.map((contract) => contract.id),
    "Demand Results should consume exactly two public contract replacements",
  );
  assert.equal(resolvedDemandResults.pendingAction, undefined, "Demand Results resolution should advance pending action");
  assert.match(resolvedDemandResults.log[0], /spends 2 Solari for Demand Results/, "Demand Results should log resolution");

  const oneReplacementDemandResults = state.resolvePayResourceForContractsChoice(
    { ...baseDemandResultsResolution, contractDeck: [replacementA] },
    demandResultsPending,
    0,
  );
  assert.deepEqual(
    oneReplacementDemandResults.contractOffer.map((contract) => contract.id),
    [replacementA.id],
    "Demand Results should refill only as many public contracts as remain in the deck",
  );

  const swappedDemandResults = state.resolvePayResourceForContractsChoice(
    baseDemandResultsResolution,
    demandResultsPending,
    1,
  );
  assert.deepEqual(
    playerById(swappedDemandResults, shaddamAlly.id).contracts.map((contract) => contract.card.id),
    [contractB.id],
    "Demand Results second option gives the second contract to the first Shaddam Ally",
  );
  assert.deepEqual(
    playerById(swappedDemandResults, shaddamAllyB.id).contracts.map((contract) => contract.card.id),
    [contractA.id],
    "Demand Results second option gives the first contract to the second Shaddam Ally",
  );

  const skippedDemandResults = state.skipPayResourceForContracts(baseDemandResultsResolution, demandResultsPending);
  assert.equal(
    playerById(skippedDemandResults, emperor.id).resources.solari,
    2,
    "Skipping Demand Results should not spend Shaddam Solari",
  );
  assert.deepEqual(
    playerById(skippedDemandResults, emperor.id).playArea,
    [demandResults],
    "Skipping Demand Results should keep Demand Results in play",
  );
  assert.deepEqual(
    skippedDemandResults.contractOffer.map((contract) => contract.id),
    game.contractOffer.map((contract) => contract.id),
    "Skipping Demand Results should not replace contracts",
  );
  assert.deepEqual(
    playerById(skippedDemandResults, shaddamAlly.id).contracts,
    [],
    "Skipping Demand Results should not assign contracts",
  );
  assert.equal(skippedDemandResults.pendingAction, undefined, "Skipping Demand Results should advance pending action");

  const staleDemandResultsState = { ...baseDemandResultsResolution, contractOffer: [replacementA, replacementB] };
  const staleDemandResults = state.resolvePayResourceForContractsChoice(
    staleDemandResultsState,
    demandResultsPending,
    0,
  );
  assert.equal(staleDemandResults, staleDemandResultsState, "Stale Demand Results should return the original state");
  assert.equal(staleDemandResults.players, baseDemandResultsResolution.players, "Stale Demand Results should not mutate players");
  assert.deepEqual(
    staleDemandResults.contractOffer.map((contract) => contract.id),
    [replacementA.id, replacementB.id],
    "Stale Demand Results should not mutate public offers",
  );
  const noCardDemandResultsState = {
    ...baseDemandResultsResolution,
    players: baseDemandResultsResolution.players.map((player) =>
      player.id === emperor.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolvePayResourceForContractsChoice(noCardDemandResultsState, demandResultsPending, 0),
    noCardDemandResultsState,
    "Demand Results should not resolve if the card is no longer in play",
  );
  const forgedDemandResultsSource = {
    ...demandResults,
    id: "forged-demand-results-source",
    effects: [],
  };
  const forgedDemandResultsPending = {
    ...demandResultsPending,
    cardId: forgedDemandResultsSource.id,
  };
  const forgedDemandResultsState = {
    ...baseDemandResultsResolution,
    pendingAction: forgedDemandResultsPending,
    players: baseDemandResultsResolution.players.map((player) =>
      player.id === emperor.id ? { ...player, playArea: [forgedDemandResultsSource] } : player,
    ),
  };
  assert.equal(
    state.resolvePayResourceForContractsChoice(forgedDemandResultsState, forgedDemandResultsPending, 0),
    forgedDemandResultsState,
    "Demand Results should not resolve when a forged pending points at a card without the contract-payment effect",
  );
  const duplicateRecipientDemandResultsPending = {
    ...demandResultsPending,
    recipientIds: [shaddamAlly.id, shaddamAlly.id],
  };
  const duplicateRecipientDemandResultsState = {
    ...baseDemandResultsResolution,
    pendingAction: duplicateRecipientDemandResultsPending,
  };
  assert.equal(
    state.resolvePayResourceForContractsChoice(duplicateRecipientDemandResultsState, duplicateRecipientDemandResultsPending, 0),
    duplicateRecipientDemandResultsState,
    "Demand Results should not resolve a malformed pending action with duplicate Ally IDs",
  );
  const duplicateContractDemandResultsPending = {
    ...demandResultsPending,
    contractIds: [contractA.id, contractA.id],
  };
  const duplicateContractDemandResultsState = {
    ...baseDemandResultsResolution,
    pendingAction: duplicateContractDemandResultsPending,
  };
  assert.equal(
    state.resolvePayResourceForContractsChoice(duplicateContractDemandResultsState, duplicateContractDemandResultsPending, 0),
    duplicateContractDemandResultsState,
    "Demand Results should not resolve a malformed pending action with duplicate contract IDs",
  );
  const malformedOptionalDemandResultsPending = {
    ...demandResultsPending,
    optional: false,
  };
  const malformedOptionalDemandResultsState = {
    ...baseDemandResultsResolution,
    pendingAction: malformedOptionalDemandResultsPending,
  };
  assert.equal(
    state.resolvePayResourceForContractsChoice(malformedOptionalDemandResultsState, malformedOptionalDemandResultsPending, 0),
    malformedOptionalDemandResultsState,
    "Demand Results should not resolve a malformed pending action with a non-optional payment",
  );
  assert.equal(
    state.skipPayResourceForContracts(malformedOptionalDemandResultsState, malformedOptionalDemandResultsPending),
    malformedOptionalDemandResultsState,
    "Demand Results should not skip a malformed pending action with a non-optional payment",
  );
  assert.equal(
    state.resolvePayResourceForContractsChoice(baseDemandResultsResolution, demandResultsPending, 2),
    baseDemandResultsResolution,
    "Demand Results should ignore invalid assignment choices",
  );

  const corrinoMight = data.emperorCommanderCards.find((card) => card.name === "Corrino Might");
  assert.ok(corrinoMight, "Emperor Commander deck should include Corrino Might");
  assert.equal(corrinoMight.sourceId, 556, "Corrino Might should use the catalog source id");
  assert.deepEqual(corrinoMight.icons, ["landsraad"], "Corrino Might should send Agents to Landsraad spaces");
  assert.equal(corrinoMight.persuasion, 0, "Corrino Might should not add reveal persuasion");
  assert.equal(corrinoMight.swords, 1, "Corrino Might should add its printed reveal sword");
  assert.equal(corrinoMight.conditionalSwords, undefined, "Corrino Might should not use manual reveal sword adjustment");
  assert.equal(
    state.isCorrinoMightCommanderCard(corrinoMight),
    true,
    "Corrino Might should be recognized as its Commander starter card",
  );
  const revealAdjustmentCard = {
    ...corrinoMight,
    id: "corrino-reveal-adjust-regression",
    name: "Corrino Reveal Adjust Regression",
    sourceId: undefined,
    conditionalSwords: true,
    effects: [],
  };
  const baseCorrinoMightCommander = {
    ...emperor,
    resources: { solari: 0, spice: 3, water: 0 },
    playArea: [corrinoMight],
  };
  const baseCorrinoMightAllyA = {
    ...shaddamAlly,
    garrison: 1,
    conflict: 2,
    deployedTroops: 1,
  };
  const baseCorrinoMightAllyB = {
    ...shaddamAllyB,
    garrison: 2,
  };
  const baseCorrinoMightGame = {
    ...game,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === emperor.id) return baseCorrinoMightCommander;
      if (player.id === shaddamAlly.id) return baseCorrinoMightAllyA;
      if (player.id === shaddamAllyB.id) return baseCorrinoMightAllyB;
      return player;
    }),
  };
  const [corrinoMightPending] = state.pendingActionsForRevealPayResourceForTroops(
    corrinoMight,
    baseCorrinoMightCommander,
    baseCorrinoMightGame,
  );
  assert.deepEqual(corrinoMightPending, {
    kind: "pay-resource-for-troops",
    ownerId: emperor.id,
    recipientIds: [shaddamAlly.id, shaddamAllyB.id],
    resource: "spice",
    cost: 3,
    troops: 2,
    destination: "garrison",
    optional: true,
    trashSource: true,
    cardId: corrinoMight.id,
    source: "Corrino Might",
  });
  const revealCorrinoMightCommander = {
    ...baseCorrinoMightCommander,
    playArea: [revealAdjustmentCard, corrinoMight],
    hand: [],
  };
  const revealCorrinoMightGame = {
    ...baseCorrinoMightGame,
    players: baseCorrinoMightGame.players.map((player) =>
      player.id === emperor.id ? revealCorrinoMightCommander : player,
    ),
  };
  assert.deepEqual(
    state.pendingActionsForReveal(
      revealCorrinoMightCommander,
      revealCorrinoMightGame,
      [revealAdjustmentCard, corrinoMight],
      shaddamAlly.id,
    ),
    [
      {
        kind: "reveal-adjust",
        ownerId: emperor.id,
        combatRecipientId: shaddamAlly.id,
        cards: ["Corrino Reveal Adjust Regression"],
        persuasionAdjustment: 0,
        strengthAdjustment: 0,
        allowPersuasionAdjustment: false,
        allowStrengthAdjustment: true,
        source: "Printed reveal",
      },
      corrinoMightPending,
    ],
    "Reveal pending actions should queue manual printed reveals before Corrino Might",
  );
  const afterCorrinoRevealAdjust = {
    ...revealCorrinoMightGame,
    pendingAction: state.pendingActionsForReveal(
      revealCorrinoMightCommander,
      revealCorrinoMightGame,
      [revealAdjustmentCard, corrinoMight],
      shaddamAlly.id,
    )[0],
    pendingQueue: [corrinoMightPending],
  };
  assert.deepEqual(
    state.finishRevealAdjustment(afterCorrinoRevealAdjust, afterCorrinoRevealAdjust.pendingAction).pendingAction,
    corrinoMightPending,
    "Finishing printed reveal adjustment should expose queued Corrino Might",
  );
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForTroops(
      corrinoMight,
      { ...baseCorrinoMightCommander, resources: { solari: 0, spice: 2, water: 0 } },
      {
        ...baseCorrinoMightGame,
        players: baseCorrinoMightGame.players.map((player) =>
          player.id === emperor.id
            ? { ...baseCorrinoMightCommander, resources: { solari: 0, spice: 2, water: 0 } }
            : player,
        ),
      },
    ),
    [],
    "Corrino Might should not queue when Shaddam cannot pay 3 spice",
  );
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForTroops(
      corrinoMight,
      { ...baseCorrinoMightCommander, playArea: [] },
      {
        ...baseCorrinoMightGame,
        players: baseCorrinoMightGame.players.map((player) =>
          player.id === emperor.id ? { ...player, playArea: [] } : player,
        ),
      },
    ),
    [],
    "Corrino Might should not queue before the revealed card enters play",
  );
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForTroops(corrinoMight, shaddamAlly, baseCorrinoMightGame),
    [],
    "Corrino Might should not trigger from an Ally starter deck owner",
  );
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForTroops(corrinoMight, muadDib, baseCorrinoMightGame),
    [],
    "Corrino Might should not trigger for the opposing Commander",
  );
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForTroops(
      corrinoMight,
      baseCorrinoMightCommander,
      {
        ...baseCorrinoMightGame,
        players: baseCorrinoMightGame.players.filter((player) => player.id !== shaddamAllyB.id),
      },
    ),
    [],
    "Corrino Might should need both Shaddam Allies",
  );

  const resolvedCorrinoMight = state.resolvePayResourceForTroopsChoice(
    {
      ...baseCorrinoMightGame,
      pendingAction: corrinoMightPending,
      pendingQueue: [],
      log: [],
    },
    corrinoMightPending,
  );
  assert.equal(
    playerById(resolvedCorrinoMight, emperor.id).resources.spice,
    0,
    "Corrino Might resolution should spend 3 Shaddam spice",
  );
  assert.deepEqual(
    playerById(resolvedCorrinoMight, emperor.id).playArea,
    [],
    "Corrino Might resolution should trash Corrino Might from play",
  );
  assert.equal(
    playerById(resolvedCorrinoMight, shaddamAlly.id).garrison,
    3,
    "Corrino Might should recruit 2 troops for the first Shaddam Ally",
  );
  assert.equal(
    playerById(resolvedCorrinoMight, shaddamAlly.id).conflict,
    2,
    "Corrino Might's optional payment should not add extra reveal strength",
  );
  assert.equal(
    playerById(resolvedCorrinoMight, shaddamAllyB.id).garrison,
    4,
    "Corrino Might should recruit 2 troops for the second Shaddam Ally",
  );
  assert.equal(
    playerById(resolvedCorrinoMight, emperor.id).garrison,
    baseCorrinoMightCommander.garrison,
    "Corrino Might should not recruit troops for Shaddam's Commander",
  );
  assert.equal(resolvedCorrinoMight.pendingAction, undefined, "Corrino Might resolution should advance pending action");
  assert.match(resolvedCorrinoMight.log[0], /spends 3 spice for Corrino Might/, "Corrino Might should log resolution");

  const skippedCorrinoMight = state.skipPayResourceForTroops(
    {
      ...baseCorrinoMightGame,
      pendingAction: corrinoMightPending,
      pendingQueue: [],
      log: [],
    },
    corrinoMightPending,
  );
  assert.equal(
    playerById(skippedCorrinoMight, emperor.id).resources.spice,
    3,
    "Skipping Corrino Might should not spend Shaddam spice",
  );
  assert.deepEqual(
    playerById(skippedCorrinoMight, emperor.id).playArea,
    [corrinoMight],
    "Skipping Corrino Might should keep Corrino Might in play",
  );
  assert.equal(
    playerById(skippedCorrinoMight, shaddamAlly.id).garrison,
    1,
    "Skipping Corrino Might should not recruit troops",
  );
  assert.equal(skippedCorrinoMight.pendingAction, undefined, "Skipping Corrino Might should advance pending action");
  const staleCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: undefined,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(staleCorrinoMightState, corrinoMightPending),
    staleCorrinoMightState,
    "Stale Corrino Might should return the original state",
  );
  const noCardCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: corrinoMightPending,
    pendingQueue: [],
    players: baseCorrinoMightGame.players.map((player) =>
      player.id === emperor.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(noCardCorrinoMightState, corrinoMightPending),
    noCardCorrinoMightState,
    "Corrino Might should not resolve if the card is no longer in play",
  );
  const duplicateAllyCorrinoMightPending = {
    ...corrinoMightPending,
    recipientIds: [shaddamAlly.id, shaddamAlly.id],
  };
  const duplicateAllyCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: duplicateAllyCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(duplicateAllyCorrinoMightState, duplicateAllyCorrinoMightPending),
    duplicateAllyCorrinoMightState,
    "Corrino Might should reject duplicate Ally IDs",
  );
  const missingAllyCorrinoMightPending = {
    ...corrinoMightPending,
    recipientIds: [shaddamAlly.id],
  };
  const missingAllyCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: missingAllyCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(missingAllyCorrinoMightState, missingAllyCorrinoMightPending),
    missingAllyCorrinoMightState,
    "Corrino Might should reject malformed pending actions missing the second Ally",
  );
  const missingRecipientIdsCorrinoMightPending = {
    ...corrinoMightPending,
  };
  delete missingRecipientIdsCorrinoMightPending.recipientIds;
  const missingRecipientIdsCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: missingRecipientIdsCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(missingRecipientIdsCorrinoMightState, missingRecipientIdsCorrinoMightPending),
    missingRecipientIdsCorrinoMightState,
    "Corrino Might should reject malformed pending actions with missing recipient IDs",
  );
  const unknownResourceCorrinoMightPending = {
    ...corrinoMightPending,
    resource: "melange",
  };
  const unknownResourceCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: unknownResourceCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(unknownResourceCorrinoMightState, unknownResourceCorrinoMightPending),
    unknownResourceCorrinoMightState,
    "Corrino Might should reject malformed pending actions with unsupported resource ids",
  );
  assert.equal(
    state.skipPayResourceForTroops(unknownResourceCorrinoMightState, unknownResourceCorrinoMightPending),
    unknownResourceCorrinoMightState,
    "Corrino Might skip should reject malformed pending actions with unsupported resource ids",
  );
  const invalidTrashSourceCorrinoMightPending = {
    ...corrinoMightPending,
    trashSource: "false",
  };
  const invalidTrashSourceCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: invalidTrashSourceCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(invalidTrashSourceCorrinoMightState, invalidTrashSourceCorrinoMightPending),
    invalidTrashSourceCorrinoMightState,
    "Corrino Might should reject malformed pending actions with non-boolean trashSource",
  );
  assert.equal(
    state.skipPayResourceForTroops(invalidTrashSourceCorrinoMightState, invalidTrashSourceCorrinoMightPending),
    invalidTrashSourceCorrinoMightState,
    "Corrino Might skip should reject malformed pending actions with non-boolean trashSource",
  );
  const missingTrashCardCorrinoMightPending = {
    ...corrinoMightPending,
  };
  delete missingTrashCardCorrinoMightPending.cardId;
  const missingTrashCardCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: missingTrashCardCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(missingTrashCardCorrinoMightState, missingTrashCardCorrinoMightPending),
    missingTrashCardCorrinoMightState,
    "Corrino Might should reject malformed pending actions that trash without a source card id",
  );
  assert.equal(
    state.skipPayResourceForTroops(missingTrashCardCorrinoMightState, missingTrashCardCorrinoMightPending),
    missingTrashCardCorrinoMightState,
    "Corrino Might skip should reject malformed pending actions that trash without a source card id",
  );
  const requiredCorrinoMightPending = {
    ...corrinoMightPending,
    optional: false,
  };
  const requiredCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: requiredCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(requiredCorrinoMightState, requiredCorrinoMightPending),
    requiredCorrinoMightState,
    "Corrino Might should reject malformed required troop payment pending actions",
  );
  assert.equal(
    state.skipPayResourceForTroops(requiredCorrinoMightState, requiredCorrinoMightPending),
    requiredCorrinoMightState,
    "Corrino Might skip should reject malformed required troop payment pending actions",
  );
  const poorCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: corrinoMightPending,
    pendingQueue: [],
    players: baseCorrinoMightGame.players.map((player) =>
      player.id === emperor.id ? { ...player, resources: { solari: 0, spice: 2, water: 0 } } : player,
    ),
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(poorCorrinoMightState, corrinoMightPending),
    poorCorrinoMightState,
    "Corrino Might should not resolve if Shaddam no longer has 3 spice",
  );

  const devastatingAssault = data.emperorCommanderCards.find((card) => card.name === "Devastating Assault");
  assert.ok(devastatingAssault, "Emperor Commander deck should include Devastating Assault");
  assert.equal(devastatingAssault.sourceId, 559, "Devastating Assault should use the catalog source id");
  assert.deepEqual(devastatingAssault.icons, ["spice"], "Devastating Assault should send Agents to spice spaces");
  assert.equal(devastatingAssault.persuasion, 1, "Devastating Assault should keep its printed reveal persuasion");
  assert.equal(devastatingAssault.swords, 0, "Devastating Assault should not have unconditional reveal swords");
  assert.equal(
    devastatingAssault.conditionalSwords,
    undefined,
    "Devastating Assault should use structured reveal payment instead of manual printed reveal handling",
  );
  assert.match(devastatingAssault.reveal, /spend 3 Solari/i, "Devastating Assault should expose its automated reveal payment");
  assert.equal(
    state.isDevastatingAssaultCommanderCard(devastatingAssault),
    true,
    "Devastating Assault should be recognized as its Commander starter card",
  );
  const baseAssaultSource = {
    ...emperor,
    resources: { solari: 0, spice: 0, water: 0 },
  };
  const baseAssaultTarget = {
    ...shaddamAlly,
    garrison: 0,
  };
  const assaultEffect = state.applyCardAgentEffect(devastatingAssault, baseAssaultSource, baseAssaultTarget);
  assert.equal(
    assaultEffect.source.resources.solari,
    1,
    "Devastating Assault should give Shaddam's Commander 1 Solari",
  );
  assert.equal(
    assaultEffect.target.garrison,
    1,
    "Devastating Assault should recruit 1 troop for the activated Ally",
  );
  assert.equal(
    assaultEffect.source.garrison,
    baseAssaultSource.garrison,
    "Devastating Assault should not recruit for Shaddam's Commander",
  );
  assert.match(assaultEffect.log, /Devastating Assault/, "Devastating Assault should log its Agent reward");
  assert.equal(assaultEffect.recruitedTroops, 1, "Devastating Assault should report 1 current-turn recruit");

  const opposingTeamAssault = state.applyCardAgentEffect(devastatingAssault, baseAssaultSource, muadDibAllyA);
  assert.equal(
    opposingTeamAssault.source.resources.solari,
    0,
    "Devastating Assault should not reward an opposing Ally activation",
  );
  assert.equal(opposingTeamAssault.log, undefined, "Invalid Devastating Assault activations should not log");
  const allyOwnedAssault = state.applyCardAgentEffect(devastatingAssault, shaddamAlly, shaddamAllyB);
  assert.equal(
    allyOwnedAssault.target.garrison,
    shaddamAllyB.garrison,
    "Devastating Assault should not trigger from an Ally starter deck owner",
  );
  assert.equal(allyOwnedAssault.log, undefined, "Ally-owned Devastating Assault should not log");
  const missingTargetAssault = state.applyCardAgentEffect(devastatingAssault, baseAssaultSource, baseAssaultSource);
  assert.equal(
    missingTargetAssault.source.resources.solari,
    0,
    "Devastating Assault should not trigger without an activated Ally target",
  );
  assert.equal(missingTargetAssault.log, undefined, "Missing-target Devastating Assault should not log");

  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin, "Imperial Basin should exist for Devastating Assault deploy-order regression");
  const basinBoardEffect = state.applyBoardEffect(baseAssaultSource, baseAssaultTarget, imperialBasin);
  const basinAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    basinBoardEffect.source,
    basinBoardEffect.target,
  );
  const basinPlayers = game.players.map((player) => {
    if (player.id === emperor.id) return basinAssaultEffect.source;
    if (player.id === shaddamAlly.id) return basinAssaultEffect.target;
    return player;
  });
  assert.equal(
    basinAssaultEffect.source.resources.spice,
    1,
    "Imperial Basin should still pay its printed spice before Devastating Assault is applied",
  );
  assert.equal(
    basinAssaultEffect.source.resources.solari,
    1,
    "Devastating Assault should preserve board-space rewards while adding Solari",
  );
  assert.deepEqual(
    state.pendingActionForSpace(
      imperialBasin,
      basinAssaultEffect.source,
      basinAssaultEffect.target,
      basinPlayers,
      basinAssaultEffect.recruitedTroops,
    ),
    {
      kind: "deploy",
      ownerId: shaddamAlly.id,
      remaining: 1,
      source: "Imperial Basin",
    },
    "Devastating Assault's recruited troop should be deployable from the same combat space",
  );
  const twoGarrisonAssaultTarget = { ...baseAssaultTarget, garrison: 2 };
  const twoGarrisonBoardEffect = state.applyBoardEffect(baseAssaultSource, twoGarrisonAssaultTarget, imperialBasin);
  const twoGarrisonAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    twoGarrisonBoardEffect.source,
    twoGarrisonBoardEffect.target,
  );
  const twoGarrisonPlayers = game.players.map((player) => {
    if (player.id === emperor.id) return twoGarrisonAssaultEffect.source;
    if (player.id === shaddamAlly.id) return twoGarrisonAssaultEffect.target;
    return player;
  });
  assert.deepEqual(
    state.pendingActionForSpace(
      imperialBasin,
      twoGarrisonAssaultEffect.source,
      twoGarrisonAssaultEffect.target,
      twoGarrisonPlayers,
      twoGarrisonAssaultEffect.recruitedTroops,
    ),
    {
      kind: "deploy",
      ownerId: shaddamAlly.id,
      remaining: 3,
      source: "Imperial Basin",
    },
    "Devastating Assault's card-recruited troop should increase the same-turn deploy cap",
  );
  const acceptContractAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    baseAssaultSource,
    baseAssaultTarget,
  );
  assert.deepEqual(
    state.pendingActionForSpace(
      acceptContract,
      acceptContractAssaultEffect.source,
      acceptContractAssaultEffect.target,
      game.players,
      acceptContractAssaultEffect.recruitedTroops,
    ),
    {
      kind: "contract",
      ownerId: emperor.id,
      source: "Accept Contract",
      spaceId: "accept-contract",
    },
    "Devastating Assault should not create deployment from a non-combat spice space",
  );

  console.log("starter deck verification passed");
} finally {
  await server.close();
}
