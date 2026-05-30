import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);

function countNames(cards) {
  return cards.reduce((counts, card) => {
    counts[card.name] = (counts[card.name] ?? 0) + 1;
    return counts;
  }, {});
}

function allPlayerStarterCards(player) {
  return [...player.deck, ...player.hand, ...player.discard, ...player.playArea];
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function assertLocalArt(cards, label) {
  for (const card of cards) {
    const artPath = card.thumbnailPath ?? card.imagePath;
    assert.ok(artPath, `${label}: ${card.name} is missing an art path`);
    assert.ok(artPath.startsWith("/assets/"), `${label}: ${card.name} art must be a local asset path`);
    assert.ok(
      existsSync(join(projectRoot.pathname, "public", artPath)),
      `${label}: ${card.name} art does not exist at ${artPath}`,
    );
  }
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(data.allyStarterCards.length, 10, "Ally deck should contain 10 cards");
  assert.deepEqual(countNames(data.allyStarterCards), {
    "Convincing Argument": 2,
    Dagger: 2,
    Diplomacy: 1,
    "Dune, The Desert Planet": 2,
    Reconnaissance: 1,
    "Seek Allies": 1,
    "Signet Ring": 1,
  });
  assert.deepEqual(
    data.allyStarterCards.filter((card) => card.name === "Dagger").map((card) => card.icons),
    [["landsraad"], ["landsraad"]],
  );
  assert.equal(data.allyStarterCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assertLocalArt(data.allyStarterCards, "Ally deck");

  assert.equal(data.muadDibCommanderCards.length, 10, "Muad'Dib Commander deck should contain 10 cards");
  assert.deepEqual(countNames(data.muadDibCommanderCards), {
    "Command Respect": 1,
    "Convincing Argument": 1,
    "Demand Attention": 1,
    "Desert Call": 1,
    "Limited Landsraad Access": 2,
    "Seek Allies": 1,
    "Signet Ring": 1,
    "Threaten Spice Production": 1,
    Usul: 1,
  });
  assert.deepEqual(
    data.muadDibCommanderCards.filter((card) => card.name === "Limited Landsraad Access").map((card) => ({
      swords: card.swords,
      revealGain: card.revealGain,
    })),
    [
      { swords: 1, revealGain: { spice: 1 } },
      { swords: 1, revealGain: { spice: 1 } },
    ],
  );
  assert.equal(data.muadDibCommanderCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assertLocalArt(data.muadDibCommanderCards, "Muad'Dib Commander deck");

  assert.equal(data.emperorCommanderCards.length, 10, "Emperor Commander deck should contain 10 cards");
  assert.deepEqual(countNames(data.emperorCommanderCards), {
    "Convincing Argument": 1,
    "Corrino Might": 1,
    "Critical Shipments": 1,
    "Demand Results": 1,
    "Devastating Assault": 1,
    "Imperial Ornithopter": 2,
    "Imperial Tent": 1,
    "Seek Allies": 1,
    "Signet Ring": 1,
  });
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.swords, 0);
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.conditionalSwords, true);
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Demand Results")?.swords, 1);
  assert.deepEqual(
    data.emperorCommanderCards.filter((card) => card.name === "Imperial Ornithopter").map((card) => ({
      persuasion: card.persuasion,
      revealGain: card.revealGain,
    })),
    [
      { persuasion: 1, revealGain: { solari: 1 } },
      { persuasion: 1, revealGain: { solari: 1 } },
    ],
  );
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assertLocalArt(data.emperorCommanderCards, "Emperor Commander deck");

  const game = state.initialGame();
  const [muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB, shaddamAllyB] = game.players;
  const commanderDeckNames = countNames(allPlayerStarterCards(muadDib));
  assert.equal(commanderDeckNames["Command Respect"], 1, "Muad'Dib should use the Muad'Dib Commander deck");
  assert.equal(commanderDeckNames["Dune, The Desert Planet"] ?? 0, 0, "Muad'Dib should not use the Ally deck");
  assert.equal(countNames(allPlayerStarterCards(emperor))["Corrino Might"], 1, "Shaddam should use the Emperor deck");

  for (const player of game.players) {
    const cards = allPlayerStarterCards(player);
    assert.equal(cards.length, 10, `${player.id} should have 10 total starter cards`);
    assert.equal(new Set(cards.map((card) => card.id)).size, 10, `${player.id} physical card ids should be unique`);
  }

  for (const player of [shaddamAlly, muadDibAllyA, muadDibAllyB, shaddamAllyB]) {
    const names = countNames(allPlayerStarterCards(player));
    assert.equal(names["Dune, The Desert Planet"], 2, `${player.id} should use the Ally deck`);
    assert.equal(names["Seek Allies"], 1, `${player.id} should use the Ally deck`);
    assert.equal(names["Command Respect"] ?? 0, 0, `${player.id} should not use a Commander deck`);
  }

  const usul = data.muadDibCommanderCards.find((card) => card.name === "Usul");
  assert.ok(usul, "Muad'Dib Commander deck should include Usul");
  assert.equal(state.isUsulCommanderCard(usul), true, "Usul should be recognized as its Commander starter card");
  const usulPending = state.pendingActionForCard(usul, muadDib, game, muadDibAllyA);
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
    state.pendingActionForCard(usul, muadDib, game, shaddamAlly),
    undefined,
    "Usul should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(usul, muadDibAllyA, game, muadDibAllyB),
    undefined,
    "Usul should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(usul, muadDib, game),
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
  assert.equal(waterSplit.pendingAction, undefined, "Usul resolution should advance pending action");
  assert.match(waterSplit.log[0], /resolves Usul/, "Usul resolution should log the split");

  const spiceSplit = state.resolveCommanderResourceSplitChoice(baseUsulResolution, usulPending, 1);
  assert.equal(playerById(spiceSplit, muadDib.id).resources.spice, 1, "Usul spice choice gives Commander spice");
  assert.equal(playerById(spiceSplit, muadDib.id).resources.water, 0, "Usul spice choice does not give Commander water");
  assert.equal(playerById(spiceSplit, muadDibAllyA.id).resources.water, 1, "Usul spice choice gives Ally water");

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
  const criticalShipmentsPending = state.pendingActionForCard(criticalShipments, emperor, game, shaddamAlly);
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
    state.pendingActionForCard(criticalShipments, emperor, game, muadDibAllyA),
    undefined,
    "Critical Shipments should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(criticalShipments, shaddamAlly, game, shaddamAllyB),
    undefined,
    "Critical Shipments should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(criticalShipments, emperor, game),
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

  const devastatingAssault = data.emperorCommanderCards.find((card) => card.name === "Devastating Assault");
  assert.ok(devastatingAssault, "Emperor Commander deck should include Devastating Assault");
  assert.equal(devastatingAssault.sourceId, 559, "Devastating Assault should use the catalog source id");
  assert.deepEqual(devastatingAssault.icons, ["spice"], "Devastating Assault should send Agents to spice spaces");
  assert.equal(devastatingAssault.persuasion, 1, "Devastating Assault should keep its printed reveal persuasion");
  assert.equal(devastatingAssault.swords, 0, "Devastating Assault should not have unconditional reveal swords");
  assert.equal(
    devastatingAssault.conditionalSwords,
    true,
    "Devastating Assault should keep its Swordmaster bonus reveal flag",
  );
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
