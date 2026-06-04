import assert from "node:assert/strict";

import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyStarterDeckCommanderResourceSplits({ data, game, players, state }) {
  const { emperor, muadDib, muadDibAllyA, muadDibAllyB, shaddamAlly, shaddamAllyB } = players;

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
  const resolvedContractState = state.takeChoamContract(
    queuedCriticalShipmentsState,
    contractPending,
    queuedCriticalShipmentsState.contractOffer[0].id,
  );
  assert.deepEqual(
    resolvedContractState.pendingAction,
    criticalShipmentsPending,
    "Resolving the spice-space contract choice should expose Critical Shipments next",
  );
  const queuedCriticalShipmentsCommanderSolari =
    playerById(resolvedContractState, emperor.id).resources.solari;
  const queuedCriticalShipmentsAllyWater =
    playerById(resolvedContractState, shaddamAlly.id).resources.water;
  const queuedCriticalShipmentsSplit = state.resolveCommanderResourceSplitChoice(
    resolvedContractState,
    criticalShipmentsPending,
    1,
  );
  assert.equal(
    playerById(queuedCriticalShipmentsSplit, emperor.id).resources.solari,
    queuedCriticalShipmentsCommanderSolari + 2,
    "Queued Critical Shipments gives Commander 2 Solari",
  );
  assert.equal(
    playerById(queuedCriticalShipmentsSplit, shaddamAlly.id).resources.water,
    queuedCriticalShipmentsAllyWater + 1,
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
}
