import assert from "node:assert/strict";

import { playerById } from "./verify-leaders-fixtures.mjs";

export function verifyLeaderJessicaSignets({ appTurnActions, cards, data, game, spaces, state }) {
  const { placeAgentAction } = appTurnActions;
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
  const expectedSpiceAgonyPending = {
    kind: "paid-reward-choice",
    ownerId: ladyJessica.id,
    cardId: allySignet.id,
    source: "Spice Agony",
    requirePayableOption: true,
    options: [{
      id: "spice-agony",
      resource: "spice",
      cost: 1,
      reward: {
        kind: "bundle",
        rewards: [
          {
            kind: "draw-intrigues",
            recipientId: ladyJessica.id,
            amount: 1,
          },
          {
            kind: "gain-leader-counter",
            recipientId: ladyJessica.id,
            counter: "jessicaMemories",
            amount: 1,
            troopSupplyCost: 1,
          },
        ],
      },
    }],
  };
  assert.deepEqual(
    jessicaSpiceAgonyPending,
    expectedSpiceAgonyPending,
    "Lady Jessica's Signet Ring should queue Spice Agony when she can pay 1 spice",
  );
  const jessicaSpiceAgonyResolved = state.resolvePaidRewardChoice(
    { ...jessicaSpiceAgonyGame, pendingAction: jessicaSpiceAgonyPending, pendingQueue: [] },
    jessicaSpiceAgonyPending,
    "spice-agony",
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
  const noSupplySpiceAgony = state.resolvePaidRewardChoice(
    {
      ...jessicaSpiceAgonyGame,
      players: jessicaSpiceAgonyGame.players.map((player) =>
        player.id === ladyJessica.id ? { ...jessicaSpiceAgonyOwner, garrison: 12, deployedTroops: 0, jessicaMemories: 0 } : player,
      ),
      pendingAction: jessicaSpiceAgonyPending,
      pendingQueue: [],
    },
    jessicaSpiceAgonyPending,
    "spice-agony",
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
    expectedSpiceAgonyPending,
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
    state.resolvePaidRewardChoice(afterDeferredMakerWorms, deferredMakerSpicePending, "spice-agony"),
    afterDeferredMakerWorms,
    "Deferred Spice Agony should not resolve if the Maker choice did not provide spice",
  );
  const skippedDeferredSpiceAgony = state.skipPaidRewardChoice(afterDeferredMakerWorms, deferredMakerSpicePending);
  assert.equal(skippedDeferredSpiceAgony.pendingAction, undefined, "Deferred Spice Agony should remain skippable after choosing Maker worms");
  const afterDeferredSpiceAgony = state.resolvePaidRewardChoice(
    afterDeferredMakerSpice,
    deferredMakerSpicePending,
    "spice-agony",
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
  const skippedSpiceAgony = state.skipPaidRewardChoice(
    { ...jessicaSpiceAgonyGame, pendingAction: jessicaSpiceAgonyPending, pendingQueue: [] },
    jessicaSpiceAgonyPending,
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
  const jessicaOtherMemoriesPending = state.pendingActionsForLeaderPlacementEffects(game, jessicaOtherMemoriesOwner, secrets)[0];
  const expectedOtherMemoriesPending = {
    kind: "leader-transition",
    ownerId: ladyJessica.id,
    source: "Other Memories",
    fromLeader: "Lady Jessica",
    toLeader: "Reverend Mother Jessica",
    counter: "jessicaMemories",
    counterAmount: "all",
    drawCardsPerCounter: 1,
    followUp: {
      kind: "repeat-board-space",
      spaceId: secrets.id,
      ability: "reverend-mother-jessica",
      source: "Reverend Mother",
      resource: "water",
      cost: 1,
    },
  };
  assert.deepEqual(
    jessicaOtherMemoriesPending,
    expectedOtherMemoriesPending,
    "Lady Jessica should be able to trigger Other Memories on Bene Gesserit spaces",
  );
  assert.deepEqual(
    state.pendingActionsForLeaderPlacementEffects(game, { ...jessicaOtherMemoriesOwner, jessicaMemories: 0 }, secrets),
    [],
    "Other Memories should require at least one memory to return",
  );
  assert.deepEqual(
    state.pendingActionsForLeaderPlacementEffects(game, jessicaOtherMemoriesOwner, arrakeen),
    [],
    "Other Memories should require a Bene Gesserit space",
  );
  assert.deepEqual(
    state.pendingActionsForLeaderPlacementEffects(game, { ...jessicaOtherMemoriesOwner, leader: "Princess Irulan" }, secrets),
    [],
    "Other Memories should not trigger for another Ally leader",
  );
  const jessicaOtherMemoriesGame = {
    ...game,
    players: game.players.map((player) => (player.id === ladyJessica.id ? jessicaOtherMemoriesOwner : player)),
    pendingAction: jessicaOtherMemoriesPending,
    pendingQueue: [],
  };
  const jessicaOtherMemoriesResolved = state.resolveLeaderTransitionChoice(
    jessicaOtherMemoriesGame,
    jessicaOtherMemoriesPending,
    "transition",
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
  assert.deepEqual(
    state.pendingActionsForLeaderPlacementEffects(game, playerById(jessicaOtherMemoriesResolved, ladyJessica.id), secrets),
    [],
    "Other Memories should not queue after Jessica has flipped to Reverend Mother",
  );
  assert.deepEqual(
    playerById(jessicaOtherMemoriesResolved, ladyJessica.id).hand.map((card) => card.id),
    [leadTheWayDraw.id, leadTheWayDiscardDraw.id],
    "Other Memories should draw one deck card per returned memory",
  );
  const skippedOtherMemories = state.resolveLeaderTransitionChoice(
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
  const expectedWaterOfLifePending = {
    kind: "paid-reward-choice",
    ownerId: ladyJessica.id,
    cardId: allySignet.id,
    source: "Water of Life",
    requirePayableOption: true,
    options: [{
      id: "water",
      resource: "spice",
      cost: 1,
      reward: {
        kind: "gain-resource",
        recipientId: ladyJessica.id,
        resource: "water",
        amount: 1,
      },
    }],
  };
  const expectedReverendRepeatPending = (spaceId) => ({
    kind: "repeat-board-space",
    ownerId: ladyJessica.id,
    source: "Reverend Mother",
    spaceId,
    resource: "water",
    cost: 1,
    optional: true,
    ability: "reverend-mother-jessica",
  });
  assert.deepEqual(
    waterOfLifePending,
    expectedWaterOfLifePending,
    "Reverend Mother Jessica's Signet Ring should queue Water of Life when she can pay 1 spice",
  );
  const waterOfLifeResolved = state.resolvePaidRewardChoice(
    { ...reverendJessicaGame, pendingAction: waterOfLifePending, pendingQueue: [] },
    waterOfLifePending,
    "water",
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
  const skippedWaterOfLife = state.skipPaidRewardChoice(
    { ...reverendJessicaGame, pendingAction: waterOfLifePending, pendingQueue: [] },
    waterOfLifePending,
  );
  assert.equal(playerById(skippedWaterOfLife, ladyJessica.id).resources.spice, 1, "Skipping Water of Life should not spend spice");
  assert.equal(playerById(skippedWaterOfLife, ladyJessica.id).resources.water, 0, "Skipping Water of Life should not gain water");
  const expedition = data.boardSpaces.find((space) => space.id === "expedition");
  assert.ok(expedition, "Expedition should exist for Water of Life into Reverend Mother repeat ordering");
  const reverendSeat = game.players.findIndex((player) => player.id === ladyJessica.id);
  assert.notEqual(reverendSeat, -1, "Expected Reverend Mother Jessica's active seat");
  const waterRepeatOwner = {
    ...reverendJessicaOwner,
    resources: { ...reverendJessicaOwner.resources, spice: 1, water: 0 },
    influence: { ...reverendJessicaOwner.influence, fringeWorlds: 0 },
    hand: [allySignet],
    playArea: [],
  };
  const waterRepeatGame = {
    ...game,
    activeSeat: reverendSeat,
    players: game.players.map((player) => (player.id === ladyJessica.id ? waterRepeatOwner : player)),
    pendingAction: undefined,
    pendingQueue: [],
  };
  const waterRepeatPlaced = placeAgentAction(waterRepeatGame, {
    commanderTargets: {},
    selectedCard: allySignet,
    selectedSpace: expedition,
  });
  assert.deepEqual(
    waterRepeatPlaced.pendingAction,
    expectedWaterOfLifePending,
    "Agent placement should put deferred Water of Life before Reverend Mother repeat",
  );
  assert.deepEqual(
    waterRepeatPlaced.pendingQueue[0],
    expectedReverendRepeatPending(expedition.id),
    "Agent placement should queue Reverend Mother repeat immediately behind Water of Life when its water can be supplied",
  );
  const waterRepeatAfterWater = state.resolvePaidRewardChoice(
    waterRepeatPlaced,
    waterRepeatPlaced.pendingAction,
    "water",
  );
  assert.deepEqual(
    waterRepeatAfterWater.pendingAction,
    expectedReverendRepeatPending(expedition.id),
    "Resolving Water of Life should advance to the queued repeat-board-space pending action",
  );
  assert.equal(playerById(waterRepeatAfterWater, ladyJessica.id).resources.water, 1, "Resolved Water of Life should make the queued repeat payable");
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
    expectedWaterOfLifePending,
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
  const afterDeferredWaterOfLife = state.resolvePaidRewardChoice(
    afterWaterMakerSpice,
    deferredWaterPending,
    "water",
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
    state.resolvePaidRewardChoice(afterWaterMakerWorms, deferredWaterPending, "water"),
    afterWaterMakerWorms,
    "Deferred Water of Life should not resolve if the Maker choice did not provide spice",
  );
  assert.equal(
    state.skipPaidRewardChoice(afterWaterMakerWorms, deferredWaterPending).pendingAction,
    undefined,
    "Deferred Water of Life should remain skippable after choosing Maker worms",
  );


  return {
    players: { ladyJessica, reverendJessicaOwner },
    spaces: { haggaBasin, secrets },
    states: { jessicaOtherMemoriesResolved },
  };
}
