import assert from "node:assert/strict";

import { playerById } from "./verify-leaders-fixtures.mjs";

export function verifyLeaderJessicaSignets({ cards, data, game, spaces, state }) {
  const { allySignet, emperorSignet, intrigueCard, leadTheWayDiscardDraw, leadTheWayDraw, muadDibSignet } = cards;
  const { arrakeen } = spaces;

  const ladyJessica = playerById(game, "p5");
  assert.equal(ladyJessica.jessicaMemories, 0, "Lady Jessica should start with no memories");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(secrets, "Secrets should exist for Lady Jessica Other Memories");
  const jessicaSpiceAgonyOwner = {
    ...ladyJessica,
    resources: { ...ladyJessica.resources, spice: 1 },
    intrigues: [],
    playArea: [allySignet],
    jessicaMemories: 0,
  };
  const jessicaSpiceAgonyGame = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) => (player.id === ladyJessica.id ? jessicaSpiceAgonyOwner : player)),
  };
  const jessicaSpiceAgonyPending = state.pendingActionForCard(
    allySignet,
    jessicaSpiceAgonyOwner,
    jessicaSpiceAgonyGame,
    jessicaSpiceAgonyOwner,
    secrets,
  );
  assert.deepEqual(
    jessicaSpiceAgonyPending,
    {
      kind: "jessica-spice-agony",
      ownerId: ladyJessica.id,
      cardId: allySignet.id,
      source: "Spice Agony",
    },
    "Lady Jessica's Signet Ring should queue Spice Agony when she can pay 1 spice",
  );
  const jessicaSpiceAgonyResolved = state.resolveJessicaSpiceAgonyChoice(
    { ...jessicaSpiceAgonyGame, pendingAction: jessicaSpiceAgonyPending, pendingQueue: [] },
    jessicaSpiceAgonyPending,
    "pay",
  );
  assert.equal(playerById(jessicaSpiceAgonyResolved, ladyJessica.id).resources.spice, 0, "Spice Agony should spend 1 spice");
  assert.equal(playerById(jessicaSpiceAgonyResolved, ladyJessica.id).jessicaMemories, 1, "Spice Agony should add 1 memory");
  assert.equal(state.playerTroopSupply(playerById(jessicaSpiceAgonyResolved, ladyJessica.id)), 8, "Spice Agony memory should consume one supply troop");
  assert.deepEqual(
    playerById(jessicaSpiceAgonyResolved, ladyJessica.id).intrigues.map((card) => card.id),
    [intrigueCard.id],
    "Spice Agony should draw 1 Intrigue card",
  );
  assert.equal(jessicaSpiceAgonyResolved.pendingAction, undefined, "Resolved Spice Agony should advance pending actions");
  assert.equal(
    state.pendingActionForCard(
      allySignet,
      { ...jessicaSpiceAgonyOwner, resources: { ...jessicaSpiceAgonyOwner.resources, spice: 0 } },
      jessicaSpiceAgonyGame,
      jessicaSpiceAgonyOwner,
      secrets,
    ),
    undefined,
    "Spice Agony should require 1 payable spice",
  );
  assert.equal(
    state.pendingActionForCard(
      allySignet,
      { ...jessicaSpiceAgonyOwner, garrison: 12, deployedTroops: 0, jessicaMemories: 0 },
      jessicaSpiceAgonyGame,
      jessicaSpiceAgonyOwner,
      secrets,
    ),
    undefined,
    "Spice Agony should require a troop in Jessica's supply for the memory",
  );
  const noSupplySpiceAgony = state.resolveJessicaSpiceAgonyChoice(
    {
      ...jessicaSpiceAgonyGame,
      players: jessicaSpiceAgonyGame.players.map((player) =>
        player.id === ladyJessica.id ? { ...jessicaSpiceAgonyOwner, garrison: 12, deployedTroops: 0, jessicaMemories: 0 } : player,
      ),
      pendingAction: jessicaSpiceAgonyPending,
      pendingQueue: [],
    },
    jessicaSpiceAgonyPending,
    "pay",
  );
  assert.equal(playerById(noSupplySpiceAgony, ladyJessica.id).jessicaMemories, 0, "Spice Agony should not create memories without troop supply");
  assert.equal(playerById(noSupplySpiceAgony, ladyJessica.id).intrigues.length, 0, "Spice Agony should not draw Intrigues without troop supply");
  const haggaBasin = data.boardSpaces.find((space) => space.id === "hagga-basin");
  assert.ok(haggaBasin, "Hagga Basin should exist for deferred Spice Agony spice");
  const deferredMakerSpiceOwner = {
    ...jessicaSpiceAgonyOwner,
    resources: { ...jessicaSpiceAgonyOwner.resources, spice: 0, water: 1 },
    makerHooks: true,
  };
  const deferredMakerSpiceGame = {
    ...jessicaSpiceAgonyGame,
    shieldWall: false,
    players: jessicaSpiceAgonyGame.players.map((player) =>
      player.id === ladyJessica.id ? deferredMakerSpiceOwner : player,
    ),
  };
  const deferredMakerSpicePending = state.pendingActionForCard(
    allySignet,
    deferredMakerSpiceOwner,
    deferredMakerSpiceGame,
    deferredMakerSpiceOwner,
    haggaBasin,
  );
  assert.deepEqual(
    deferredMakerSpicePending,
    {
      kind: "jessica-spice-agony",
      ownerId: ladyJessica.id,
      cardId: allySignet.id,
      source: "Spice Agony",
    },
    "Spice Agony should queue when a pending Maker choice can supply the 1 spice payment",
  );
  const deferredMakerPending = state.pendingActionForMakerChoice(
    deferredMakerSpiceGame,
    haggaBasin,
    deferredMakerSpiceOwner,
    deferredMakerSpiceOwner,
  );
  assert.ok(deferredMakerPending, "Deferred Maker spice regression needs a Maker choice pending action");
  const afterDeferredMakerSpice = state.resolveMakerChoice(
    {
      ...deferredMakerSpiceGame,
      pendingAction: deferredMakerPending,
      pendingQueue: [deferredMakerSpicePending],
    },
    deferredMakerPending,
    "spice",
  );
  assert.equal(playerById(afterDeferredMakerSpice, ladyJessica.id).resources.spice, 2, "Maker spice branch should pay Jessica before Spice Agony resolves");
  assert.deepEqual(afterDeferredMakerSpice.pendingAction, deferredMakerSpicePending, "Maker choice should advance to the deferred Spice Agony pending action");
  const afterDeferredMakerWorms = state.resolveMakerChoice(
    {
      ...deferredMakerSpiceGame,
      pendingAction: deferredMakerPending,
      pendingQueue: [deferredMakerSpicePending],
    },
    deferredMakerPending,
    "sandworms",
  );
  assert.deepEqual(afterDeferredMakerWorms.pendingAction, deferredMakerSpicePending, "Choosing Maker worms should still advance to the queued optional Spice Agony");
  assert.equal(
    state.resolveJessicaSpiceAgonyChoice(afterDeferredMakerWorms, deferredMakerSpicePending, "pay"),
    afterDeferredMakerWorms,
    "Deferred Spice Agony should not resolve if the Maker choice did not provide spice",
  );
  const skippedDeferredSpiceAgony = state.resolveJessicaSpiceAgonyChoice(afterDeferredMakerWorms, deferredMakerSpicePending, "skip");
  assert.equal(skippedDeferredSpiceAgony.pendingAction, undefined, "Deferred Spice Agony should remain skippable after choosing Maker worms");
  const afterDeferredSpiceAgony = state.resolveJessicaSpiceAgonyChoice(
    afterDeferredMakerSpice,
    deferredMakerSpicePending,
    "pay",
  );
  assert.equal(playerById(afterDeferredSpiceAgony, ladyJessica.id).resources.spice, 1, "Deferred Spice Agony should spend 1 of the Maker spice");
  assert.equal(playerById(afterDeferredSpiceAgony, ladyJessica.id).jessicaMemories, 1, "Deferred Spice Agony should still create a memory");
  assert.deepEqual(
    playerById(afterDeferredSpiceAgony, ladyJessica.id).intrigues.map((card) => card.id),
    [intrigueCard.id],
    "Deferred Spice Agony should still draw 1 Intrigue card",
  );
  assert.equal(
    state.pendingActionForCard(
      allySignet,
      { ...deferredMakerSpiceOwner, garrison: 12, deployedTroops: 0, jessicaMemories: 0 },
      {
        ...deferredMakerSpiceGame,
        players: deferredMakerSpiceGame.players.map((player) =>
          player.id === ladyJessica.id ? { ...deferredMakerSpiceOwner, garrison: 12, deployedTroops: 0, jessicaMemories: 0 } : player,
        ),
      },
      deferredMakerSpiceOwner,
      haggaBasin,
    ),
    undefined,
    "Deferred Maker spice should not queue Spice Agony without troop supply",
  );
  assert.equal(
    state.pendingActionForCard(
      muadDibSignet,
      jessicaSpiceAgonyOwner,
      jessicaSpiceAgonyGame,
      jessicaSpiceAgonyOwner,
      secrets,
    ),
    undefined,
    "Spice Agony should not trigger from Muad'Dib's Commander Signet Ring",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, jessicaSpiceAgonyOwner, jessicaSpiceAgonyGame, jessicaSpiceAgonyOwner, secrets),
    undefined,
    "Spice Agony should not trigger from Shaddam's Commander Signet Ring",
  );
  const skippedSpiceAgony = state.resolveJessicaSpiceAgonyChoice(
    { ...jessicaSpiceAgonyGame, pendingAction: jessicaSpiceAgonyPending, pendingQueue: [] },
    jessicaSpiceAgonyPending,
    "skip",
  );
  assert.equal(playerById(skippedSpiceAgony, ladyJessica.id).resources.spice, 1, "Skipping Spice Agony should not spend spice");
  assert.equal(playerById(skippedSpiceAgony, ladyJessica.id).jessicaMemories, 0, "Skipping Spice Agony should not add a memory");

  const jessicaOtherMemoriesOwner = {
    ...ladyJessica,
    hand: [],
    deck: [leadTheWayDraw, leadTheWayDiscardDraw],
    discard: [],
    jessicaMemories: 2,
  };
  const jessicaOtherMemoriesPending = state.pendingActionForJessicaOtherMemories(jessicaOtherMemoriesOwner, secrets);
  assert.deepEqual(
    jessicaOtherMemoriesPending,
    {
      kind: "jessica-other-memories",
      ownerId: ladyJessica.id,
      source: "Other Memories",
      spaceId: secrets.id,
    },
    "Lady Jessica should be able to trigger Other Memories on Bene Gesserit spaces",
  );
  assert.equal(
    state.pendingActionForJessicaOtherMemories({ ...jessicaOtherMemoriesOwner, jessicaMemories: 0 }, secrets),
    undefined,
    "Other Memories should require at least one memory to return",
  );
  assert.equal(
    state.pendingActionForJessicaOtherMemories(jessicaOtherMemoriesOwner, arrakeen),
    undefined,
    "Other Memories should require a Bene Gesserit space",
  );
  assert.equal(
    state.pendingActionForJessicaOtherMemories({ ...jessicaOtherMemoriesOwner, leader: "Princess Irulan" }, secrets),
    undefined,
    "Other Memories should not trigger for another Ally leader",
  );
  const jessicaOtherMemoriesGame = {
    ...game,
    players: game.players.map((player) => (player.id === ladyJessica.id ? jessicaOtherMemoriesOwner : player)),
    pendingAction: jessicaOtherMemoriesPending,
    pendingQueue: [],
  };
  const jessicaOtherMemoriesResolved = state.resolveJessicaOtherMemoriesChoice(
    jessicaOtherMemoriesGame,
    jessicaOtherMemoriesPending,
    "flip",
  );
  assert.equal(
    playerById(jessicaOtherMemoriesResolved, ladyJessica.id).leader,
    "Reverend Mother Jessica",
    "Other Memories should flip Lady Jessica to Reverend Mother Jessica",
  );
  assert.equal(
    playerById(jessicaOtherMemoriesResolved, ladyJessica.id).leaderCard.name,
    "Reverend Mother Jessica",
    "Other Memories should update the leader reference art after flipping",
  );
  assert.equal(playerById(jessicaOtherMemoriesResolved, ladyJessica.id).jessicaMemories, 0, "Other Memories should return all memories");
  assert.equal(state.playerTroopSupply(playerById(jessicaOtherMemoriesResolved, ladyJessica.id)), 9, "Other Memories should return memory troops to Jessica's supply");
  assert.equal(
    state.pendingActionForJessicaOtherMemories(playerById(jessicaOtherMemoriesResolved, ladyJessica.id), secrets),
    undefined,
    "Other Memories should not queue after Jessica has flipped to Reverend Mother",
  );
  assert.deepEqual(
    playerById(jessicaOtherMemoriesResolved, ladyJessica.id).hand.map((card) => card.id),
    [leadTheWayDraw.id, leadTheWayDiscardDraw.id],
    "Other Memories should draw one deck card per returned memory",
  );
  const skippedOtherMemories = state.resolveJessicaOtherMemoriesChoice(
    jessicaOtherMemoriesGame,
    jessicaOtherMemoriesPending,
    "skip",
  );
  assert.equal(playerById(skippedOtherMemories, ladyJessica.id).leader, "Lady Jessica", "Skipping Other Memories should not flip");
  assert.equal(playerById(skippedOtherMemories, ladyJessica.id).jessicaMemories, 2, "Skipping Other Memories should keep memories");

  const reverendJessicaOwner = {
    ...ladyJessica,
    leader: "Reverend Mother Jessica",
    leaderCard: data.leaderCardByName("Reverend Mother Jessica"),
    resources: { ...ladyJessica.resources, spice: 1, water: 0 },
    playArea: [allySignet],
    jessicaMemories: 0,
  };
  const reverendJessicaGame = {
    ...game,
    players: game.players.map((player) => (player.id === ladyJessica.id ? reverendJessicaOwner : player)),
  };
  const waterOfLifePending = state.pendingActionForCard(
    allySignet,
    reverendJessicaOwner,
    reverendJessicaGame,
    reverendJessicaOwner,
    secrets,
  );
  assert.deepEqual(
    waterOfLifePending,
    {
      kind: "jessica-water-of-life",
      ownerId: ladyJessica.id,
      cardId: allySignet.id,
      source: "Water of Life",
    },
    "Reverend Mother Jessica's Signet Ring should queue Water of Life when she can pay 1 spice",
  );
  const waterOfLifeResolved = state.resolveJessicaWaterOfLifeChoice(
    { ...reverendJessicaGame, pendingAction: waterOfLifePending, pendingQueue: [] },
    waterOfLifePending,
    "pay",
  );
  assert.equal(playerById(waterOfLifeResolved, ladyJessica.id).resources.spice, 0, "Water of Life should spend 1 spice");
  assert.equal(playerById(waterOfLifeResolved, ladyJessica.id).resources.water, 1, "Water of Life should gain 1 water");
  assert.equal(waterOfLifeResolved.pendingAction, undefined, "Resolved Water of Life should advance pending actions");
  assert.equal(
    state.pendingActionForCard(
      allySignet,
      { ...reverendJessicaOwner, resources: { ...reverendJessicaOwner.resources, spice: 0 } },
      reverendJessicaGame,
      reverendJessicaOwner,
      secrets,
    ),
    undefined,
    "Water of Life should require 1 payable spice",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, reverendJessicaOwner, reverendJessicaGame, reverendJessicaOwner, secrets),
    undefined,
    "Water of Life should not trigger from Shaddam's Commander Signet Ring",
  );
  assert.equal(
    state.pendingActionForCard(allySignet, { ...reverendJessicaOwner, playArea: [] }, reverendJessicaGame, reverendJessicaOwner, secrets),
    undefined,
    "Water of Life should require the Signet Ring in play",
  );
  const skippedWaterOfLife = state.resolveJessicaWaterOfLifeChoice(
    { ...reverendJessicaGame, pendingAction: waterOfLifePending, pendingQueue: [] },
    waterOfLifePending,
    "skip",
  );
  assert.equal(playerById(skippedWaterOfLife, ladyJessica.id).resources.spice, 1, "Skipping Water of Life should not spend spice");
  assert.equal(playerById(skippedWaterOfLife, ladyJessica.id).resources.water, 0, "Skipping Water of Life should not gain water");
  const deferredWaterOwner = {
    ...reverendJessicaOwner,
    resources: { ...reverendJessicaOwner.resources, spice: 0, water: 1 },
    makerHooks: true,
  };
  const deferredWaterGame = {
    ...reverendJessicaGame,
    shieldWall: false,
    players: reverendJessicaGame.players.map((player) =>
      player.id === ladyJessica.id ? deferredWaterOwner : player,
    ),
  };
  const deferredWaterPending = state.pendingActionForCard(
    allySignet,
    deferredWaterOwner,
    deferredWaterGame,
    deferredWaterOwner,
    haggaBasin,
  );
  assert.deepEqual(
    deferredWaterPending,
    {
      kind: "jessica-water-of-life",
      ownerId: ladyJessica.id,
      cardId: allySignet.id,
      source: "Water of Life",
    },
    "Water of Life should queue when a pending Maker choice can supply the 1 spice payment",
  );
  const deferredWaterMakerPending = state.pendingActionForMakerChoice(
    deferredWaterGame,
    haggaBasin,
    deferredWaterOwner,
    deferredWaterOwner,
  );
  assert.ok(deferredWaterMakerPending, "Deferred Water of Life regression needs a Maker choice pending action");
  const afterWaterMakerSpice = state.resolveMakerChoice(
    {
      ...deferredWaterGame,
      pendingAction: deferredWaterMakerPending,
      pendingQueue: [deferredWaterPending],
    },
    deferredWaterMakerPending,
    "spice",
  );
  const afterDeferredWaterOfLife = state.resolveJessicaWaterOfLifeChoice(
    afterWaterMakerSpice,
    deferredWaterPending,
    "pay",
  );
  assert.equal(playerById(afterDeferredWaterOfLife, ladyJessica.id).resources.spice, 1, "Deferred Water of Life should spend 1 of the Maker spice");
  assert.equal(playerById(afterDeferredWaterOfLife, ladyJessica.id).resources.water, 2, "Deferred Water of Life should gain 1 water");
  const afterWaterMakerWorms = state.resolveMakerChoice(
    {
      ...deferredWaterGame,
      pendingAction: deferredWaterMakerPending,
      pendingQueue: [deferredWaterPending],
    },
    deferredWaterMakerPending,
    "sandworms",
  );
  assert.deepEqual(afterWaterMakerWorms.pendingAction, deferredWaterPending, "Choosing Maker worms should still advance to the queued optional Water of Life");
  assert.equal(
    state.resolveJessicaWaterOfLifeChoice(afterWaterMakerWorms, deferredWaterPending, "pay"),
    afterWaterMakerWorms,
    "Deferred Water of Life should not resolve if the Maker choice did not provide spice",
  );
  assert.equal(
    state.resolveJessicaWaterOfLifeChoice(afterWaterMakerWorms, deferredWaterPending, "skip").pendingAction,
    undefined,
    "Deferred Water of Life should remain skippable after choosing Maker worms",
  );


  return {
    players: { ladyJessica, reverendJessicaOwner },
    spaces: { haggaBasin, secrets },
    states: { jessicaOtherMemoriesResolved },
  };
}
