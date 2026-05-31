import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyStarterDeckDesertCall({
  data,
  game,
  players: { muadDib, shaddamAlly, muadDibAllyA, muadDibAllyB },
  state,
}) {
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
      activeSeat: game.players.findIndex((player) => player.id === muadDib.id),
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
  assert.equal(resolvedDesertCall.turnUnitDeployments[muadDib.id], 1, "Desert Call should count as a Commander unit deployment turn");
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

  return {
    conflicts: { nonProtectedDesertCallConflict },
    spaces: { haggaForDesertCall, imperialBasinForDesertCall, spiceRefineryForDesertCall },
  };
}
