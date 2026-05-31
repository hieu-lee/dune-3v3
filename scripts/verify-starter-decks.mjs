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
  assert.match(
    data.muadDibCommanderCards.find((card) => card.name === "Command Respect")?.play ?? "",
    /trash this card to trade/i,
    "Command Respect should expose its automated Swordmaster trade payment",
  );
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
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.swords, 1);
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.conditionalSwords, undefined);
  assert.match(
    data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.reveal ?? "",
    /Spend 3 spice/,
    "Corrino Might should expose its automated reveal payment",
  );
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

  const commandRespect = data.muadDibCommanderCards.find((card) => card.name === "Command Respect");
  assert.ok(commandRespect, "Muad'Dib Commander deck should include Command Respect");
  assert.equal(
    state.isCommandRespectCommanderCard(commandRespect),
    true,
    "Command Respect should be recognized as its Commander starter card",
  );
  const arrakeenForCommandRespect = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeenForCommandRespect, "Arrakeen should exist for Command Respect regression");
  const commandRespectIntrigue = data.intrigueCards[0];
  assert.ok(commandRespectIntrigue, "Verifier needs an Intrigue card for Command Respect trade");
  const baseCommandRespectCommander = {
    ...muadDib,
    swordmasterBonus: true,
    playArea: [commandRespect],
    intrigues: [commandRespectIntrigue],
  };
  const baseCommandRespectGame = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return baseCommandRespectCommander;
      if (player.id === muadDibAllyA.id) return { ...muadDibAllyA, intrigues: [] };
      if (player.id === muadDibAllyB.id) return { ...muadDibAllyB, resources: { solari: 0, spice: 2, water: 0 } };
      return player;
    }),
  };
  const commandRespectPending = state.pendingActionForCard(
    commandRespect,
    baseCommandRespectCommander,
    baseCommandRespectGame,
    muadDibAllyA,
    arrakeenForCommandRespect,
  );
  assert.deepEqual(commandRespectPending, {
    kind: "command-respect",
    commanderId: muadDib.id,
    partnerIds: [muadDibAllyA.id, muadDibAllyB.id],
    cardId: commandRespect.id,
    source: "Command Respect",
  });
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      { ...baseCommandRespectCommander, swordmasterBonus: false },
      baseCommandRespectGame,
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should require Muad'Dib's Swordmaster Bonus token",
  );
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      { ...baseCommandRespectCommander, playArea: [] },
      baseCommandRespectGame,
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should require the card in play before it can be trashed",
  );
  assert.equal(
    state.pendingActionForCard(commandRespect, muadDibAllyA, baseCommandRespectGame, muadDibAllyB, arrakeenForCommandRespect),
    undefined,
    "Command Respect should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(commandRespect, emperor, baseCommandRespectGame, shaddamAlly, arrakeenForCommandRespect),
    undefined,
    "Command Respect should not trigger for Shaddam's Commander",
  );
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      baseCommandRespectCommander,
      {
        ...baseCommandRespectGame,
        players: baseCommandRespectGame.players.filter((player) => player.id !== muadDibAllyB.id),
      },
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should need both Muad'Dib Allies available as trade partners",
  );
  const commandRespectState = { ...baseCommandRespectGame, pendingAction: commandRespectPending, pendingQueue: [] };
  const resolvedCommandRespect = state.resolveCommandRespectTrade(
    commandRespectState,
    commandRespectPending,
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(resolvedCommandRespect, muadDib.id).playArea.length,
    0,
    "Command Respect payment should trash the card from play",
  );
  assert.deepEqual(
    resolvedCommandRespect.pendingAction,
    {
      kind: "trade",
      actorId: muadDib.id,
      partnerId: muadDibAllyA.id,
      resource: "intrigue",
      actorGiven: 0,
      partnerGiven: 0,
      partnerLocked: true,
      source: "Command Respect",
    },
    "Command Respect should hand off to the normal trade pending action",
  );
  assert.deepEqual(
    state.updateTradeSelection(resolvedCommandRespect, resolvedCommandRespect.pendingAction, "intrigue", muadDibAllyB.id).pendingAction,
    resolvedCommandRespect.pendingAction,
    "Command Respect should lock the partner chosen when the card was trashed",
  );
  assert.match(
    resolvedCommandRespect.log[0],
    /trashes Command Respect to trade/,
    "Command Respect should log the self-trash trade payment",
  );
  const queuedCommandRespectSpy = {
    kind: "spy",
    ownerId: muadDib.id,
    remaining: 1,
    source: "Queued Command Respect regression",
  };
  const queuedCommandRespectTrade = state.resolveCommandRespectTrade(
    { ...commandRespectState, pendingQueue: [queuedCommandRespectSpy] },
    commandRespectPending,
    muadDibAllyA.id,
  );
  assert.deepEqual(
    queuedCommandRespectTrade.pendingQueue,
    [queuedCommandRespectSpy],
    "Command Respect should preserve queued actions behind the trade",
  );
  assert.deepEqual(
    state.finishPendingAction(queuedCommandRespectTrade).pendingAction,
    queuedCommandRespectSpy,
    "Finishing an empty Command Respect trade should expose the previously queued action",
  );
  const afterCommandRespectIntrigueTrade = state.transferTradeGood(
    resolvedCommandRespect,
    resolvedCommandRespect.pendingAction,
    muadDib.id,
    muadDibAllyA.id,
    commandRespectIntrigue.id,
  );
  assert.equal(
    playerById(afterCommandRespectIntrigueTrade, muadDib.id).intrigues.length,
    0,
    "Command Respect trade should let Muad'Dib give an Intrigue",
  );
  assert.equal(
    playerById(afterCommandRespectIntrigueTrade, muadDibAllyA.id).intrigues[0]?.id,
    commandRespectIntrigue.id,
    "Command Respect trade should give the chosen Ally the traded Intrigue",
  );
  const finishedCommandRespectTrade = state.finishPendingAction(afterCommandRespectIntrigueTrade);
  assert.equal(finishedCommandRespectTrade.pendingAction, undefined, "Command Respect trade should finish through the normal trade flow");
  const skippedCommandRespect = state.skipCommandRespect(commandRespectState, commandRespectPending);
  assert.equal(
    playerById(skippedCommandRespect, muadDib.id).playArea.length,
    1,
    "Skipping Command Respect should leave the card in play",
  );
  assert.equal(skippedCommandRespect.pendingAction, undefined, "Skipping Command Respect should advance pending action");
  const invalidCommandRespectPartner = state.resolveCommandRespectTrade(
    commandRespectState,
    commandRespectPending,
    shaddamAlly.id,
  );
  assert.equal(
    playerById(invalidCommandRespectPartner, muadDib.id).playArea.length,
    1,
    "Command Respect should not trash for an opposing trade partner",
  );
  assert.deepEqual(
    invalidCommandRespectPartner.pendingAction,
    commandRespectPending,
    "Command Respect should keep waiting after an invalid partner choice",
  );

  const desertCall = data.muadDibCommanderCards.find((card) => card.name === "Desert Call");
  assert.ok(desertCall, "Muad'Dib Commander deck should include Desert Call");
  assert.equal(
    state.isDesertCallCommanderCard(desertCall),
    true,
    "Desert Call should be recognized as its Commander starter card",
  );
  const imperialBasinForDesertCall = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasinForDesertCall, "Imperial Basin should exist for Desert Call regression");
  const spiceRefineryForDesertCall = data.boardSpaces.find((space) => space.id === "spice-refinery");
  assert.ok(spiceRefineryForDesertCall, "Spice Refinery should exist for Desert Call non-spice regression");
  const habbanyaForDesertCall = data.boardSpaces.find((space) => space.id === "habbanya-erg");
  assert.ok(habbanyaForDesertCall, "Habbanya Erg should exist for Desert Call post-cost regression");
  const haggaForDesertCall = data.boardSpaces.find((space) => space.id === "hagga-basin");
  assert.ok(haggaForDesertCall, "Hagga Basin should exist for Desert Call queue-order regression");
  const nonProtectedDesertCallConflict = data.conflictCards.find((conflict) => conflict.name === "CHOAM Security");
  assert.ok(nonProtectedDesertCallConflict, "CHOAM Security should exist for Desert Call non-protected regression");
  const protectedDesertCallConflict = data.conflictCards.find((conflict) => conflict.name === "Battle For Arrakeen");
  assert.ok(protectedDesertCallConflict, "Battle For Arrakeen should exist for Desert Call Shield Wall regression");
  const baseDesertCallSource = {
    ...muadDib,
    resources: { solari: 0, spice: 0, water: 1 },
    playArea: [desertCall],
  };
  const baseDesertCallTarget = {
    ...muadDibAllyA,
    makerHooks: true,
    conflict: 0,
    deployedSandworms: 0,
  };
  const baseDesertCallGame = {
    ...game,
    conflict: nonProtectedDesertCallConflict,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return baseDesertCallSource;
      if (player.id === muadDibAllyA.id) return baseDesertCallTarget;
      if (player.id === muadDibAllyB.id) return { ...player, makerHooks: true };
      return player;
    }),
  };
  const desertCallPending = state.pendingActionForCard(
    desertCall,
    baseDesertCallSource,
    baseDesertCallGame,
    baseDesertCallTarget,
    imperialBasinForDesertCall,
  );
  assert.deepEqual(desertCallPending, {
    kind: "desert-call",
    commanderId: muadDib.id,
    allyId: muadDibAllyA.id,
    cardId: desertCall.id,
    source: "Desert Call",
  });
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      { ...baseDesertCallSource, resources: { solari: 0, spice: 0, water: 0 } },
      baseDesertCallGame,
      baseDesertCallTarget,
      imperialBasinForDesertCall,
    ),
    undefined,
    "Desert Call should not queue when Muad'Dib cannot pay 1 water after board costs",
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      baseDesertCallSource,
      baseDesertCallGame,
      { ...baseDesertCallTarget, makerHooks: false },
      imperialBasinForDesertCall,
    ),
    undefined,
    "Desert Call should require Maker Hooks on the activated Ally",
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      baseDesertCallSource,
      { ...baseDesertCallGame, conflict: protectedDesertCallConflict, shieldWall: true },
      baseDesertCallTarget,
      imperialBasinForDesertCall,
    ),
    undefined,
    "Desert Call should not queue when the Shield Wall protects the current Conflict",
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      baseDesertCallSource,
      { ...baseDesertCallGame, conflict: null },
      baseDesertCallTarget,
      imperialBasinForDesertCall,
    ),
    undefined,
    "Desert Call should not queue without a current Conflict",
  );
  assert.deepEqual(
    state.pendingActionForCard(
      desertCall,
      baseDesertCallSource,
      { ...baseDesertCallGame, conflict: protectedDesertCallConflict, shieldWall: false },
      baseDesertCallTarget,
      imperialBasinForDesertCall,
    ),
    desertCallPending,
    "Desert Call should queue for protected locations after the Shield Wall is removed",
  );
  assert.equal(
    state.pendingActionForCard(desertCall, baseDesertCallSource, baseDesertCallGame, shaddamAlly, imperialBasinForDesertCall),
    undefined,
    "Desert Call should not summon worms for an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(desertCall, muadDibAllyA, baseDesertCallGame, muadDibAllyB, imperialBasinForDesertCall),
    undefined,
    "Desert Call should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      baseDesertCallSource,
      baseDesertCallGame,
      baseDesertCallTarget,
      spiceRefineryForDesertCall,
    ),
    undefined,
    "Desert Call should only queue from a spice-icon board space",
  );
  const dryAfterHabbanya = state.applyBoardEffect(
    { ...baseDesertCallSource, resources: { solari: 0, spice: 0, water: 1 } },
    baseDesertCallTarget,
    habbanyaForDesertCall,
    habbanyaForDesertCall.cost,
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      dryAfterHabbanya.source,
      baseDesertCallGame,
      dryAfterHabbanya.target,
      habbanyaForDesertCall,
    ),
    undefined,
    "Desert Call should use Muad'Dib's water after the board-space cost is paid",
  );
  const wetAfterHabbanya = state.applyBoardEffect(
    { ...baseDesertCallSource, resources: { solari: 0, spice: 0, water: 2 } },
    baseDesertCallTarget,
    habbanyaForDesertCall,
    habbanyaForDesertCall.cost,
  );
  assert.equal(
    state.pendingActionForCard(
      desertCall,
      wetAfterHabbanya.source,
      baseDesertCallGame,
      wetAfterHabbanya.target,
      habbanyaForDesertCall,
    )?.kind,
    "desert-call",
    "Desert Call should queue from post-space water when Muad'Dib can still pay 1 water",
  );
  assert.equal(
    state.pendingActionForCard(desertCall, baseDesertCallSource, undefined, baseDesertCallTarget, imperialBasinForDesertCall),
    undefined,
    "Desert Call should need current Conflict state before it can queue",
  );
  const noGarrisonDesertCallTarget = { ...baseDesertCallTarget, garrison: 0 };
  const haggaMakerPending = state.pendingActionForMakerChoice(
    baseDesertCallGame,
    haggaForDesertCall,
    noGarrisonDesertCallTarget,
    { ...baseDesertCallSource, resources: { solari: 0, spice: 0, water: 2 } },
  );
  assert.ok(haggaMakerPending, "Hagga Basin should queue a Maker choice before Desert Call");
  const haggaDesertCallEffect = state.applyBoardEffect(
    { ...baseDesertCallSource, resources: { solari: 0, spice: 0, water: 2 } },
    noGarrisonDesertCallTarget,
    haggaForDesertCall,
    haggaForDesertCall.cost,
    0,
    true,
  );
  const haggaSpacePending = state.pendingActionForSpace(
    haggaForDesertCall,
    haggaDesertCallEffect.source,
    haggaDesertCallEffect.target,
    baseDesertCallGame.players,
  );
  assert.equal(haggaSpacePending, undefined, "No-garrison Hagga Basin should not add a deploy pending action");
  const haggaDesertCallPending = state.pendingActionForCard(
    desertCall,
    haggaDesertCallEffect.source,
    baseDesertCallGame,
    haggaDesertCallEffect.target,
    haggaForDesertCall,
  );
  assert.ok(haggaDesertCallPending, "Desert Call should queue after Hagga Basin leaves Muad'Dib able to pay water");
  assert.deepEqual(
    [haggaMakerPending, ...state.pendingActionsFor(haggaSpacePending, haggaDesertCallPending, haggaDesertCallEffect.source.spies)],
    [haggaMakerPending, haggaDesertCallPending],
    "Desert Call should queue after a Maker choice on the same Agent turn",
  );
  const afterHaggaMaker = state.resolveMakerChoice(
    {
      ...baseDesertCallGame,
      pendingAction: haggaMakerPending,
      pendingQueue: [haggaDesertCallPending],
      players: baseDesertCallGame.players.map((player) => {
        if (player.id === muadDib.id) return haggaDesertCallEffect.source;
        if (player.id === muadDibAllyA.id) return haggaDesertCallEffect.target;
        return player;
      }),
      log: [],
    },
    haggaMakerPending,
    "spice",
  );
  assert.deepEqual(
    afterHaggaMaker.pendingAction,
    haggaDesertCallPending,
    "Resolving the queued Maker choice should advance to Desert Call",
  );
  const resolvedQueuedDesertCall = state.resolveDesertCallChoice(afterHaggaMaker, haggaDesertCallPending);
  assert.equal(
    playerById(resolvedQueuedDesertCall, muadDibAllyA.id).deployedSandworms,
    1,
    "Queued Desert Call should still summon after the Maker choice resolves",
  );

  const resolvedDesertCall = state.resolveDesertCallChoice(
    {
      ...baseDesertCallGame,
      pendingAction: desertCallPending,
      pendingQueue: [],
      log: [],
    },
    desertCallPending,
  );
  assert.equal(
    playerById(resolvedDesertCall, muadDib.id).resources.water,
    0,
    "Desert Call resolution spends 1 Muad'Dib water",
  );
  assert.deepEqual(
    playerById(resolvedDesertCall, muadDib.id).playArea,
    [],
    "Desert Call resolution trashes Desert Call from play",
  );
  assert.equal(
    playerById(resolvedDesertCall, muadDibAllyA.id).deployedSandworms,
    1,
    "Desert Call should summon the sandworm for the activated Ally",
  );
  assert.equal(
    playerById(resolvedDesertCall, muadDibAllyA.id).conflict,
    3,
    "Desert Call's summoned sandworm should add 3 strength for the activated Ally",
  );
  assert.equal(
    playerById(resolvedDesertCall, muadDib.id).deployedSandworms,
    0,
    "Desert Call should not deploy sandworms to Muad'Dib's Commander",
  );
  assert.equal(resolvedDesertCall.pendingAction, undefined, "Desert Call resolution should advance pending action");
  assert.match(resolvedDesertCall.log[0], /spends 1 water for Desert Call/, "Desert Call should log resolution");

  const skippedDesertCall = state.skipDesertCall(
    {
      ...baseDesertCallGame,
      pendingAction: desertCallPending,
      pendingQueue: [],
      log: [],
    },
    desertCallPending,
  );
  assert.equal(
    playerById(skippedDesertCall, muadDib.id).resources.water,
    1,
    "Skipping Desert Call should not spend Muad'Dib water",
  );
  assert.deepEqual(
    playerById(skippedDesertCall, muadDib.id).playArea,
    [desertCall],
    "Skipping Desert Call should keep Desert Call in play",
  );
  assert.equal(
    playerById(skippedDesertCall, muadDibAllyA.id).deployedSandworms,
    0,
    "Skipping Desert Call should not summon a sandworm",
  );
  assert.equal(skippedDesertCall.pendingAction, undefined, "Skipping Desert Call should advance pending action");
  const noCardDesertCallState = {
    ...baseDesertCallGame,
    pendingAction: desertCallPending,
    pendingQueue: [],
    players: baseDesertCallGame.players.map((player) =>
      player.id === muadDib.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolveDesertCallChoice(noCardDesertCallState, desertCallPending),
    noCardDesertCallState,
    "Desert Call should not resolve if the card is no longer in play",
  );
  const missingAllyDesertCallState = {
    ...baseDesertCallGame,
    pendingAction: desertCallPending,
    pendingQueue: [],
    players: baseDesertCallGame.players.filter((player) => player.id !== muadDibAllyA.id),
  };
  assert.equal(
    state.resolveDesertCallChoice(missingAllyDesertCallState, desertCallPending),
    missingAllyDesertCallState,
    "Desert Call should not resolve if the pending Ally is no longer in the game",
  );
  const noHooksDesertCallState = {
    ...baseDesertCallGame,
    pendingAction: desertCallPending,
    pendingQueue: [],
    players: baseDesertCallGame.players.map((player) =>
      player.id === muadDibAllyA.id ? { ...player, makerHooks: false } : player,
    ),
  };
  assert.equal(
    state.resolveDesertCallChoice(noHooksDesertCallState, desertCallPending),
    noHooksDesertCallState,
    "Desert Call should not resolve if the pending Ally no longer has Maker Hooks",
  );
  const restoredShieldWallDesertCallState = {
    ...baseDesertCallGame,
    conflict: protectedDesertCallConflict,
    shieldWall: true,
    pendingAction: desertCallPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolveDesertCallChoice(restoredShieldWallDesertCallState, desertCallPending),
    restoredShieldWallDesertCallState,
    "Desert Call should not resolve if the Shield Wall now protects the current Conflict",
  );

  const threatenSpiceProduction = data.muadDibCommanderCards.find((card) => card.name === "Threaten Spice Production");
  assert.ok(threatenSpiceProduction, "Muad'Dib Commander deck should include Threaten Spice Production");
  assert.equal(
    state.isThreatenSpiceProductionCommanderCard(threatenSpiceProduction),
    true,
    "Threaten Spice Production should be recognized as its Commander starter card",
  );

  function addThreatenSpiceContribution(gameState, contributorId, amount) {
    let next = gameState;
    for (let count = 0; count < amount; count += 1) {
      const pending = next.pendingAction;
      assert.equal(pending?.kind, "threaten-spice-production", "Expected Threaten Spice Production pending action");
      next = state.adjustThreatenSpiceProductionContribution(next, pending, contributorId, 1);
    }
    return next;
  }

  const baseThreatenCommander = {
    ...muadDib,
    resources: { solari: 0, spice: 3, water: 1 },
    playArea: [threatenSpiceProduction],
  };
  const baseThreatenAllyA = {
    ...muadDibAllyA,
    resources: { solari: 0, spice: 2, water: 0 },
    makerHooks: true,
    conflict: 0,
    deployedSandworms: 0,
  };
  const baseThreatenAllyB = {
    ...muadDibAllyB,
    resources: { solari: 0, spice: 2, water: 0 },
    makerHooks: true,
  };
  const baseThreatenGame = {
    ...game,
    conflict: nonProtectedDesertCallConflict,
    shieldWall: false,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return baseThreatenCommander;
      if (player.id === muadDibAllyA.id) return baseThreatenAllyA;
      if (player.id === muadDibAllyB.id) return baseThreatenAllyB;
      return player;
    }),
  };
  const threatenPending = state.pendingActionForCard(
    threatenSpiceProduction,
    baseThreatenCommander,
    baseThreatenGame,
    baseThreatenAllyA,
    imperialBasinForDesertCall,
  );
  assert.deepEqual(threatenPending, {
    kind: "threaten-spice-production",
    commanderId: muadDib.id,
    contributorIds: [muadDib.id, muadDibAllyA.id, muadDibAllyB.id],
    contributions: {
      [muadDib.id]: 0,
      [muadDibAllyA.id]: 0,
      [muadDibAllyB.id]: 0,
    },
    cost: 7,
    cardId: threatenSpiceProduction.id,
    source: "Threaten Spice Production",
  });
  assert.equal(
    state.pendingActionForCard(
      threatenSpiceProduction,
      { ...baseThreatenCommander, resources: { solari: 0, spice: 2, water: 1 } },
      {
        ...baseThreatenGame,
        players: baseThreatenGame.players.map((player) =>
          player.id === muadDib.id
            ? { ...baseThreatenCommander, resources: { solari: 0, spice: 2, water: 1 } }
            : player,
        ),
      },
      baseThreatenAllyA,
      imperialBasinForDesertCall,
    ),
    undefined,
    "Threaten Spice Production should not queue when the team has less than 7 spice",
  );
  assert.equal(
    state.pendingActionForCard(
      threatenSpiceProduction,
      baseThreatenCommander,
      baseThreatenGame,
      baseThreatenAllyA,
      spiceRefineryForDesertCall,
    ),
    undefined,
    "Threaten Spice Production should only queue from a spice-icon board space",
  );
  assert.equal(
    state.pendingActionForCard(threatenSpiceProduction, emperor, baseThreatenGame, shaddamAlly, imperialBasinForDesertCall),
    undefined,
    "Threaten Spice Production should not trigger from Shaddam",
  );
  assert.equal(
    state.pendingActionForCard(threatenSpiceProduction, muadDibAllyA, baseThreatenGame, muadDibAllyB, imperialBasinForDesertCall),
    undefined,
    "Threaten Spice Production should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(threatenSpiceProduction, baseThreatenCommander, undefined, baseThreatenAllyA, imperialBasinForDesertCall),
    undefined,
    "Threaten Spice Production should need current table state before it can queue",
  );

  const afterImperialBasinThreaten = state.applyBoardEffect(
    { ...baseThreatenCommander, resources: { solari: 0, spice: 6, water: 1 } },
    { ...baseThreatenAllyA, resources: { solari: 0, spice: 0, water: 0 } },
    imperialBasinForDesertCall,
  );
  assert.equal(
    state.pendingActionForCard(
      threatenSpiceProduction,
      afterImperialBasinThreaten.source,
      {
        ...baseThreatenGame,
        players: baseThreatenGame.players.map((player) => {
          if (player.id === muadDib.id) return afterImperialBasinThreaten.source;
          if (player.id === muadDibAllyA.id) return afterImperialBasinThreaten.target;
          if (player.id === muadDibAllyB.id) return { ...baseThreatenAllyB, resources: { solari: 0, spice: 0, water: 0 } };
          return player;
        }),
      },
      afterImperialBasinThreaten.target,
      imperialBasinForDesertCall,
    )?.kind,
    "threaten-spice-production",
    "Threaten Spice Production should count spice gained from the visited spice space",
  );

  let threatenContributionState = {
    ...baseThreatenGame,
    pendingAction: threatenPending,
    pendingQueue: [],
    log: [],
  };
  assert.equal(
    state.adjustThreatenSpiceProductionContribution(
      threatenContributionState,
      threatenPending,
      muadDibAllyA.id,
      -1,
    ),
    threatenContributionState,
    "Threaten Spice Production should reject negative contribution adjustments",
  );
  threatenContributionState = addThreatenSpiceContribution(threatenContributionState, muadDib.id, 3);
  threatenContributionState = addThreatenSpiceContribution(threatenContributionState, muadDibAllyA.id, 2);
  threatenContributionState = addThreatenSpiceContribution(threatenContributionState, muadDibAllyB.id, 2);
  assert.equal(
    state.threatenSpiceProductionContributionTotal(threatenContributionState.pendingAction),
    7,
    "Threaten Spice Production should track exact team spice contributions",
  );
  assert.equal(
    state.adjustThreatenSpiceProductionContribution(
      threatenContributionState,
      threatenContributionState.pendingAction,
      muadDibAllyB.id,
      1,
    ),
    threatenContributionState,
    "Threaten Spice Production should reject contributions above the 7-spice cost",
  );
  const resolvedThreatenSpiceProduction = state.resolveThreatenSpiceProductionChoice(
    threatenContributionState,
    threatenContributionState.pendingAction,
  );
  assert.equal(
    playerById(resolvedThreatenSpiceProduction, muadDib.id).resources.spice,
    0,
    "Threaten Spice Production should spend Muad'Dib's committed spice",
  );
  assert.equal(
    playerById(resolvedThreatenSpiceProduction, muadDibAllyA.id).resources.spice,
    0,
    "Threaten Spice Production should spend the first Ally's committed spice",
  );
  assert.equal(
    playerById(resolvedThreatenSpiceProduction, muadDibAllyB.id).resources.spice,
    0,
    "Threaten Spice Production should spend the second Ally's committed spice",
  );
  assert.equal(
    playerById(resolvedThreatenSpiceProduction, muadDib.id).vp,
    baseThreatenCommander.vp + 1,
    "Threaten Spice Production should award the VP to Muad'Dib",
  );
  assert.equal(
    playerById(resolvedThreatenSpiceProduction, muadDibAllyA.id).vp,
    baseThreatenAllyA.vp,
    "Threaten Spice Production should not award VP to contributing Allies",
  );
  assert.deepEqual(
    playerById(resolvedThreatenSpiceProduction, muadDib.id).playArea,
    [],
    "Threaten Spice Production should trash the card after successful payment",
  );
  assert.equal(resolvedThreatenSpiceProduction.pendingAction, undefined, "Threaten Spice Production should advance after payment");
  assert.match(
    resolvedThreatenSpiceProduction.log[0],
    /pays 7 spice/,
    "Threaten Spice Production should log the team payment",
  );

  const skippedThreatenSpiceProduction = state.skipThreatenSpiceProduction(
    {
      ...baseThreatenGame,
      pendingAction: threatenPending,
      pendingQueue: [],
      log: [],
    },
    threatenPending,
  );
  assert.equal(
    playerById(skippedThreatenSpiceProduction, muadDib.id).resources.spice,
    3,
    "Skipping Threaten Spice Production should not spend Muad'Dib spice",
  );
  assert.equal(
    playerById(skippedThreatenSpiceProduction, muadDib.id).vp,
    baseThreatenCommander.vp,
    "Skipping Threaten Spice Production should not award VP",
  );
  assert.deepEqual(
    playerById(skippedThreatenSpiceProduction, muadDib.id).playArea,
    [threatenSpiceProduction],
    "Skipping Threaten Spice Production should keep the card in play",
  );
  assert.equal(skippedThreatenSpiceProduction.pendingAction, undefined, "Skipping Threaten Spice Production should advance");

  const noCardThreatenState = {
    ...baseThreatenGame,
    pendingAction: threatenPending,
    pendingQueue: [],
    players: baseThreatenGame.players.map((player) =>
      player.id === muadDib.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolveThreatenSpiceProductionChoice(noCardThreatenState, threatenPending),
    noCardThreatenState,
    "Threaten Spice Production should not resolve if the card is no longer in play",
  );
  const offTeamThreatenPending = {
    ...threatenPending,
    contributorIds: [muadDib.id, shaddamAlly.id, muadDibAllyB.id],
    contributions: {
      [muadDib.id]: 3,
      [shaddamAlly.id]: 2,
      [muadDibAllyB.id]: 2,
    },
  };
  const offTeamThreatenState = {
    ...baseThreatenGame,
    pendingAction: offTeamThreatenPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolveThreatenSpiceProductionChoice(offTeamThreatenState, offTeamThreatenPending),
    offTeamThreatenState,
    "Threaten Spice Production should reject off-team contributors",
  );
  const overAvailableThreatenPending = {
    ...threatenPending,
    contributions: {
      [muadDib.id]: 4,
      [muadDibAllyA.id]: 1,
      [muadDibAllyB.id]: 2,
    },
  };
  const overAvailableThreatenState = {
    ...baseThreatenGame,
    pendingAction: overAvailableThreatenPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolveThreatenSpiceProductionChoice(overAvailableThreatenState, overAvailableThreatenPending),
    overAvailableThreatenState,
    "Threaten Spice Production should reject contributions above a player's current spice",
  );
  const underpaidThreatenPending = {
    ...threatenPending,
    contributions: {
      [muadDib.id]: 3,
      [muadDibAllyA.id]: 2,
      [muadDibAllyB.id]: 1,
    },
  };
  const underpaidThreatenState = {
    ...baseThreatenGame,
    pendingAction: underpaidThreatenPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolveThreatenSpiceProductionChoice(underpaidThreatenState, underpaidThreatenPending),
    underpaidThreatenState,
    "Threaten Spice Production should reject payments under 7 spice",
  );

  const makerThreatenCommander = {
    ...baseThreatenCommander,
    resources: { solari: 0, spice: 3, water: 1 },
  };
  const makerThreatenAllyA = {
    ...baseThreatenAllyA,
    resources: { solari: 0, spice: 1, water: 0 },
    garrison: 0,
  };
  const makerThreatenAllyB = {
    ...baseThreatenAllyB,
    resources: { solari: 0, spice: 1, water: 0 },
  };
  const makerThreatenGame = {
    ...baseThreatenGame,
    players: baseThreatenGame.players.map((player) => {
      if (player.id === muadDib.id) return makerThreatenCommander;
      if (player.id === muadDibAllyA.id) return makerThreatenAllyA;
      if (player.id === muadDibAllyB.id) return makerThreatenAllyB;
      return player;
    }),
  };
  const threatenMakerPending = state.pendingActionForMakerChoice(
    makerThreatenGame,
    haggaForDesertCall,
    makerThreatenAllyA,
    makerThreatenCommander,
  );
  assert.ok(threatenMakerPending, "Hagga Basin should queue a Maker choice before Threaten Spice Production");
  const threatenMakerEffect = state.applyBoardEffect(
    makerThreatenCommander,
    makerThreatenAllyA,
    haggaForDesertCall,
    haggaForDesertCall.cost,
    0,
    true,
  );
  const threatenAfterMakerPending = state.pendingActionForCard(
    threatenSpiceProduction,
    threatenMakerEffect.source,
    makerThreatenGame,
    threatenMakerEffect.target,
    haggaForDesertCall,
  );
  assert.equal(
    threatenAfterMakerPending?.kind,
    "threaten-spice-production",
    "Threaten Spice Production should queue when deferred Maker spice could enable payment",
  );
  const afterThreatenMakerSpice = state.resolveMakerChoice(
    {
      ...makerThreatenGame,
      pendingAction: threatenMakerPending,
      pendingQueue: [threatenAfterMakerPending],
      players: makerThreatenGame.players.map((player) => {
        if (player.id === muadDib.id) return threatenMakerEffect.source;
        if (player.id === muadDibAllyA.id) return threatenMakerEffect.target;
        return player;
      }),
      log: [],
    },
    threatenMakerPending,
    "spice",
  );
  assert.deepEqual(
    afterThreatenMakerSpice.pendingAction,
    threatenAfterMakerPending,
    "Resolving the queued Maker spice choice should advance to Threaten Spice Production",
  );
  let payableAfterMakerSpice = addThreatenSpiceContribution(afterThreatenMakerSpice, muadDib.id, 5);
  payableAfterMakerSpice = addThreatenSpiceContribution(payableAfterMakerSpice, muadDibAllyA.id, 1);
  payableAfterMakerSpice = addThreatenSpiceContribution(payableAfterMakerSpice, muadDibAllyB.id, 1);
  const resolvedAfterMakerSpice = state.resolveThreatenSpiceProductionChoice(
    payableAfterMakerSpice,
    payableAfterMakerSpice.pendingAction,
  );
  assert.equal(
    playerById(resolvedAfterMakerSpice, muadDib.id).vp,
    makerThreatenCommander.vp + 1,
    "Threaten Spice Production should resolve after choosing Maker spice",
  );
  const afterThreatenMakerWorm = state.resolveMakerChoice(
    {
      ...makerThreatenGame,
      pendingAction: threatenMakerPending,
      pendingQueue: [threatenAfterMakerPending],
      players: makerThreatenGame.players.map((player) => {
        if (player.id === muadDib.id) return threatenMakerEffect.source;
        if (player.id === muadDibAllyA.id) return threatenMakerEffect.target;
        return player;
      }),
      log: [],
    },
    threatenMakerPending,
    "sandworms",
  );
  let underfundedAfterMakerWorm = addThreatenSpiceContribution(afterThreatenMakerWorm, muadDib.id, 3);
  underfundedAfterMakerWorm = addThreatenSpiceContribution(underfundedAfterMakerWorm, muadDibAllyA.id, 1);
  underfundedAfterMakerWorm = addThreatenSpiceContribution(underfundedAfterMakerWorm, muadDibAllyB.id, 1);
  assert.equal(
    state.resolveThreatenSpiceProductionChoice(
      underfundedAfterMakerWorm,
      underfundedAfterMakerWorm.pendingAction,
    ),
    underfundedAfterMakerWorm,
    "Threaten Spice Production should not resolve after choosing worms without enough actual spice",
  );
  const skippedAfterMakerWorm = state.skipThreatenSpiceProduction(
    underfundedAfterMakerWorm,
    underfundedAfterMakerWorm.pendingAction,
  );
  assert.equal(skippedAfterMakerWorm.pendingAction, undefined, "Threaten Spice Production should remain skippable after choosing worms");

  const demandAttention = data.muadDibCommanderCards.find((card) => card.name === "Demand Attention");
  assert.ok(demandAttention, "Muad'Dib Commander deck should include Demand Attention");
  assert.equal(
    state.isDemandAttentionCommanderCard(demandAttention),
    true,
    "Demand Attention should be recognized as its Commander starter card",
  );
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(secrets, "Secrets should exist for Demand Attention faction-space regression");
  const arrakeenForDemandAttention = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeenForDemandAttention, "Arrakeen should exist for Demand Attention non-faction regression");
  const desertMastery = data.boardSpaces.find((space) => space.id === "desert-mastery");
  assert.ok(desertMastery, "Desert Mastery should exist for Demand Attention personal-space regression");
  const espionage = data.boardSpaces.find((space) => space.id === "espionage");
  assert.ok(espionage, "Espionage should exist for Demand Attention queue-order regression");
  const baseDemandAttentionSource = {
    ...muadDib,
    resources: { solari: 4, spice: 0, water: 0 },
    playArea: [demandAttention],
  };
  const baseDemandAttentionTarget = {
    ...muadDibAllyA,
    influence: { ...muadDibAllyA.influence, bene: 1 },
  };
  const demandAttentionBoardEffect = state.applyBoardEffect(
    baseDemandAttentionSource,
    baseDemandAttentionTarget,
    secrets,
  );
  assert.equal(
    demandAttentionBoardEffect.target.influence.bene,
    2,
    "Secrets should first give the activated Muad'Dib Ally 1 Bene Gesserit Influence",
  );
  assert.equal(
    demandAttentionBoardEffect.target.vp,
    muadDibAllyA.vp + 1,
    "Secrets should score exactly 1 VP when the activated Ally reaches 2 Bene Gesserit Influence",
  );
  const demandAttentionPending = state.pendingActionForCard(
    demandAttention,
    demandAttentionBoardEffect.source,
    game,
    demandAttentionBoardEffect.target,
    secrets,
  );
  assert.deepEqual(demandAttentionPending, {
    kind: "demand-attention",
    commanderId: muadDib.id,
    recipientId: muadDibAllyA.id,
    faction: "bene",
    cardId: demandAttention.id,
    source: "Demand Attention",
  });
  const demandAttentionSpySource = { ...demandAttentionBoardEffect.source, spies: 1 };
  const espionageSpacePending = state.pendingActionForSpace(
    espionage,
    demandAttentionSpySource,
    demandAttentionBoardEffect.target,
    game.players,
  );
  assert.deepEqual(espionageSpacePending, {
    kind: "spy",
    ownerId: muadDib.id,
    remaining: 1,
    source: "Espionage",
  });
  const espionageDemandAttentionPending = state.pendingActionForCard(
    demandAttention,
    demandAttentionSpySource,
    game,
    demandAttentionBoardEffect.target,
    espionage,
  );
  assert.deepEqual(
    state.pendingActionsFor(espionageSpacePending, espionageDemandAttentionPending, demandAttentionSpySource.spies),
    [espionageSpacePending, espionageDemandAttentionPending],
    "Demand Attention should queue after a faction-space pending action on the same Agent turn",
  );
  assert.equal(
    state.pendingActionForCard(
      demandAttention,
      { ...demandAttentionBoardEffect.source, resources: { solari: 3, spice: 0, water: 0 } },
      game,
      demandAttentionBoardEffect.target,
      secrets,
    ),
    undefined,
    "Demand Attention should not queue when Muad'Dib cannot pay 4 Solari",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, demandAttentionBoardEffect.source, game, shaddamAlly, secrets),
    undefined,
    "Demand Attention should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, muadDibAllyA, game, muadDibAllyB, secrets),
    undefined,
    "Demand Attention should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(
      demandAttention,
      demandAttentionBoardEffect.source,
      game,
      demandAttentionBoardEffect.target,
      arrakeenForDemandAttention,
    ),
    undefined,
    "Demand Attention should not queue on non-faction spaces",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, demandAttentionBoardEffect.source, game, demandAttentionBoardEffect.target),
    undefined,
    "Demand Attention should need a faction space",
  );

  const baseDemandAttentionResolution = {
    ...game,
    pendingAction: demandAttentionPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return demandAttentionBoardEffect.source;
      if (player.id === muadDibAllyA.id) return demandAttentionBoardEffect.target;
      return player;
    }),
    log: [],
  };
  const resolvedDemandAttention = state.resolveDemandAttentionChoice(
    baseDemandAttentionResolution,
    demandAttentionPending,
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDib.id).resources.solari,
    0,
    "Demand Attention resolution spends 4 Muad'Dib Solari",
  );
  assert.deepEqual(
    playerById(resolvedDemandAttention, muadDib.id).playArea,
    [],
    "Demand Attention resolution trashes Demand Attention from play",
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDibAllyA.id).influence.bene,
    3,
    "Demand Attention should upgrade the activated Ally's faction visit from 1 Influence to 2",
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDibAllyA.id).vp,
    muadDibAllyA.vp + 1,
    "Demand Attention should not score a second VP when the activated Ally was already at 2 Influence",
  );
  assert.equal(resolvedDemandAttention.pendingAction, undefined, "Demand Attention resolution should advance pending action");
  assert.match(resolvedDemandAttention.log[0], /spends 4 Solari for Demand Attention/, "Demand Attention should log resolution");

  const skippedDemandAttention = state.skipDemandAttention(baseDemandAttentionResolution, demandAttentionPending);
  assert.equal(
    playerById(skippedDemandAttention, muadDib.id).resources.solari,
    4,
    "Skipping Demand Attention should not spend Muad'Dib Solari",
  );
  assert.deepEqual(
    playerById(skippedDemandAttention, muadDib.id).playArea,
    [demandAttention],
    "Skipping Demand Attention should keep Demand Attention in play",
  );
  assert.equal(
    playerById(skippedDemandAttention, muadDibAllyA.id).influence.bene,
    2,
    "Skipping Demand Attention should keep only the printed board-space Influence",
  );
  assert.equal(
    playerById(skippedDemandAttention, muadDibAllyA.id).vp,
    muadDibAllyA.vp + 1,
    "Skipping Demand Attention should keep only the printed board-space VP gain",
  );
  const noCardDemandAttentionState = {
    ...baseDemandAttentionResolution,
    players: baseDemandAttentionResolution.players.map((player) =>
      player.id === muadDib.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolveDemandAttentionChoice(noCardDemandAttentionState, demandAttentionPending),
    noCardDemandAttentionState,
    "Demand Attention should not resolve if the card is no longer in play",
  );
  const missingRecipientDemandAttentionState = {
    ...baseDemandAttentionResolution,
    players: baseDemandAttentionResolution.players.filter((player) => player.id !== muadDibAllyA.id),
  };
  assert.equal(
    state.resolveDemandAttentionChoice(missingRecipientDemandAttentionState, demandAttentionPending),
    missingRecipientDemandAttentionState,
    "Demand Attention should not resolve if the pending recipient is no longer in the game",
  );

  const personalDemandAttentionSource = {
    ...baseDemandAttentionSource,
    influence: { ...muadDib.influence, fremen: 0 },
    vp: muadDib.vp,
  };
  const personalDemandAttentionTarget = {
    ...muadDibAllyB,
    influence: { ...muadDibAllyB.influence, fremen: 0 },
  };
  const personalDemandAttentionBoardEffect = state.applyBoardEffect(
    personalDemandAttentionSource,
    personalDemandAttentionTarget,
    desertMastery,
  );
  assert.equal(
    personalDemandAttentionBoardEffect.source.influence.fremen,
    1,
    "Muad'Dib personal Fremen spaces should first give their printed Influence to the Commander",
  );
  assert.equal(
    personalDemandAttentionBoardEffect.target.influence.fremen,
    0,
    "Muad'Dib personal Fremen spaces should not give printed Influence to the activated Ally",
  );
  const personalDemandAttentionPending = state.pendingActionForCard(
    demandAttention,
    personalDemandAttentionBoardEffect.source,
    game,
    personalDemandAttentionBoardEffect.target,
    desertMastery,
  );
  assert.deepEqual(personalDemandAttentionPending, {
    kind: "demand-attention",
    commanderId: muadDib.id,
    recipientId: muadDib.id,
    faction: "fremen",
    cardId: demandAttention.id,
    source: "Demand Attention",
  });
  const resolvedPersonalDemandAttention = state.resolveDemandAttentionChoice(
    {
      ...game,
      pendingAction: personalDemandAttentionPending,
      pendingQueue: [],
      players: game.players.map((player) => {
        if (player.id === muadDib.id) return personalDemandAttentionBoardEffect.source;
        if (player.id === muadDibAllyB.id) return personalDemandAttentionBoardEffect.target;
        return player;
      }),
      log: [],
    },
    personalDemandAttentionPending,
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDib.id).influence.fremen,
    2,
    "Demand Attention should upgrade Muad'Dib's personal-space Influence when the Commander received the board effect",
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDib.id).vp,
    muadDib.vp + 1,
    "Demand Attention should score Muad'Dib once when the personal-space upgrade reaches 2 Fremen Influence",
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDibAllyB.id).influence.fremen,
    0,
    "Demand Attention should not redirect personal-space Influence to the activated Ally",
  );

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

  const demandResults = data.emperorCommanderCards.find((card) => card.name === "Demand Results");
  assert.ok(demandResults, "Emperor Commander deck should include Demand Results");
  assert.equal(
    state.isDemandResultsCommanderCard(demandResults),
    true,
    "Demand Results should be recognized as its Commander starter card",
  );
  const demandResultsPending = state.pendingActionForCard(demandResults, emperor, game, shaddamAlly);
  assert.deepEqual(demandResultsPending, {
    kind: "demand-results",
    commanderId: emperor.id,
    allyIds: [shaddamAlly.id, shaddamAllyB.id],
    contractIds: [game.contractOffer[0].id, game.contractOffer[1].id],
    cardId: demandResults.id,
    source: "Demand Results",
  });
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      { ...emperor, resources: { ...emperor.resources, solari: 1 } },
      game,
      shaddamAlly,
    ),
    undefined,
    "Demand Results should not queue when Shaddam cannot pay 2 Solari",
  );
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      emperor,
      { ...game, contractOffer: [game.contractOffer[0]] },
      shaddamAlly,
    ),
    undefined,
    "Demand Results should need both face-up public contracts",
  );
  assert.equal(
    state.pendingActionForCard(
      demandResults,
      emperor,
      { ...game, players: game.players.filter((player) => player.id !== shaddamAllyB.id) },
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
  const gatherSupport = data.boardSpaces.find((space) => space.id === "gather-support");
  assert.ok(gatherSupport, "Gather Support should exist for Demand Results post-cost regression");
  const poorDemandResultsSource = state.applyBoardEffect(
    { ...emperor, resources: { solari: 2, spice: 0, water: 0 } },
    shaddamAlly,
    gatherSupport,
    gatherSupport.cost,
  ).source;
  assert.equal(
    state.pendingActionForCard(demandResults, poorDemandResultsSource, game, shaddamAlly),
    undefined,
    "Demand Results should not queue if the Landsraad space cost leaves Shaddam without 2 Solari",
  );
  const richDemandResultsSource = state.applyBoardEffect(
    { ...emperor, resources: { solari: 4, spice: 0, water: 0 } },
    shaddamAlly,
    gatherSupport,
    gatherSupport.cost,
  ).source;
  assert.equal(
    state.pendingActionForCard(demandResults, richDemandResultsSource, game, shaddamAlly)?.kind,
    "demand-results",
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
  const resolvedDemandResults = state.resolveDemandResultsChoice(
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

  const oneReplacementDemandResults = state.resolveDemandResultsChoice(
    { ...baseDemandResultsResolution, contractDeck: [replacementA] },
    demandResultsPending,
    0,
  );
  assert.deepEqual(
    oneReplacementDemandResults.contractOffer.map((contract) => contract.id),
    [replacementA.id],
    "Demand Results should refill only as many public contracts as remain in the deck",
  );

  const swappedDemandResults = state.resolveDemandResultsChoice(
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

  const skippedDemandResults = state.skipDemandResults(baseDemandResultsResolution, demandResultsPending);
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
  const staleDemandResults = state.resolveDemandResultsChoice(
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
    state.resolveDemandResultsChoice(noCardDemandResultsState, demandResultsPending, 0),
    noCardDemandResultsState,
    "Demand Results should not resolve if the card is no longer in play",
  );
  const duplicateAllyDemandResultsPending = {
    ...demandResultsPending,
    allyIds: [shaddamAlly.id, shaddamAlly.id],
  };
  assert.equal(
    state.resolveDemandResultsChoice(baseDemandResultsResolution, duplicateAllyDemandResultsPending, 0),
    baseDemandResultsResolution,
    "Demand Results should not resolve a malformed pending action with duplicate Ally IDs",
  );
  assert.equal(
    state.resolveDemandResultsChoice(baseDemandResultsResolution, demandResultsPending, 2),
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
  const corrinoMightPending = state.pendingActionForCorrinoMightReveal(
    corrinoMight,
    baseCorrinoMightCommander,
    baseCorrinoMightGame,
  );
  assert.deepEqual(corrinoMightPending, {
    kind: "corrino-might",
    commanderId: emperor.id,
    allyIds: [shaddamAlly.id, shaddamAllyB.id],
    cost: 3,
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
  assert.equal(
    state.pendingActionForCorrinoMightReveal(
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
    undefined,
    "Corrino Might should not queue when Shaddam cannot pay 3 spice",
  );
  assert.equal(
    state.pendingActionForCorrinoMightReveal(
      corrinoMight,
      { ...baseCorrinoMightCommander, playArea: [] },
      {
        ...baseCorrinoMightGame,
        players: baseCorrinoMightGame.players.map((player) =>
          player.id === emperor.id ? { ...player, playArea: [] } : player,
        ),
      },
    ),
    undefined,
    "Corrino Might should not queue before the revealed card enters play",
  );
  assert.equal(
    state.pendingActionForCorrinoMightReveal(corrinoMight, shaddamAlly, baseCorrinoMightGame),
    undefined,
    "Corrino Might should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCorrinoMightReveal(corrinoMight, muadDib, baseCorrinoMightGame),
    undefined,
    "Corrino Might should not trigger for the opposing Commander",
  );
  assert.equal(
    state.pendingActionForCorrinoMightReveal(
      corrinoMight,
      baseCorrinoMightCommander,
      {
        ...baseCorrinoMightGame,
        players: baseCorrinoMightGame.players.filter((player) => player.id !== shaddamAllyB.id),
      },
    ),
    undefined,
    "Corrino Might should need both Shaddam Allies",
  );

  const resolvedCorrinoMight = state.resolveCorrinoMightChoice(
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

  const skippedCorrinoMight = state.skipCorrinoMight(
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
    state.resolveCorrinoMightChoice(staleCorrinoMightState, corrinoMightPending),
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
    state.resolveCorrinoMightChoice(noCardCorrinoMightState, corrinoMightPending),
    noCardCorrinoMightState,
    "Corrino Might should not resolve if the card is no longer in play",
  );
  const duplicateAllyCorrinoMightPending = {
    ...corrinoMightPending,
    allyIds: [shaddamAlly.id, shaddamAlly.id],
  };
  const duplicateAllyCorrinoMightState = {
    ...baseCorrinoMightGame,
    pendingAction: duplicateAllyCorrinoMightPending,
    pendingQueue: [],
  };
  assert.equal(
    state.resolveCorrinoMightChoice(duplicateAllyCorrinoMightState, duplicateAllyCorrinoMightPending),
    duplicateAllyCorrinoMightState,
    "Corrino Might should reject duplicate Ally IDs",
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
    state.resolveCorrinoMightChoice(poorCorrinoMightState, corrinoMightPending),
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
