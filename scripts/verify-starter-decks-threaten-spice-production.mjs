import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyStarterDeckThreatenSpiceProduction({
  conflicts: { nonProtectedDesertCallConflict },
  data,
  game,
  players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB },
  spaces: { haggaForDesertCall, imperialBasinForDesertCall, spiceRefineryForDesertCall },
  state,
}) {
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
  const controlIncomeThreatenSource = {
    ...baseThreatenCommander,
    resources: { solari: 0, spice: 2, water: 1 },
  };
  const controlIncomeThreatenAllyA = {
    ...baseThreatenAllyA,
    resources: { solari: 0, spice: 2, water: 0 },
  };
  const controlIncomeThreatenAllyB = {
    ...baseThreatenAllyB,
    resources: { solari: 0, spice: 1, water: 0 },
  };
  const controlIncomeBoardEffect = state.applyBoardEffect(
    controlIncomeThreatenSource,
    controlIncomeThreatenAllyA,
    imperialBasinForDesertCall,
  );
  const controlIncomePostEffect = state.resolveLocationControlIncome(
    {
      ...baseThreatenGame,
      locationControl: { "imperial-basin": controlIncomeThreatenAllyB.id },
      players: baseThreatenGame.players.map((player) => {
        if (player.id === muadDib.id) return controlIncomeBoardEffect.source;
        if (player.id === muadDibAllyA.id) return controlIncomeBoardEffect.target;
        if (player.id === muadDibAllyB.id) return controlIncomeThreatenAllyB;
        return player;
      }),
    },
    imperialBasinForDesertCall,
  );
  assert.equal(
    state.pendingActionForCard(
      threatenSpiceProduction,
      playerById(controlIncomePostEffect, muadDib.id),
      controlIncomePostEffect,
      playerById(controlIncomePostEffect, muadDibAllyA.id),
      imperialBasinForDesertCall,
    )?.kind,
    "threaten-spice-production",
    "Threaten Spice Production should count critical-location control income before pending-card eligibility is checked",
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
}
