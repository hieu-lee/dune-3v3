import assert from "node:assert/strict";
import { createServer } from "vite";

import { playerById } from "./verify-leaders-fixtures.mjs";
import { verifyLeaderCatalogAndSignets } from "./verify-leaders-catalog-signets.mjs";
import { verifyLeaderJessicaSignets } from "./verify-leaders-jessica-signets.mjs";
import { verifyLeaderSpiesAndReverendRepeat } from "./verify-leaders-spies-repeat.mjs";
import { verifyLeaderIrulanSignetAndBirthright } from "./verify-leaders-irulan.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const { validateSpec } = await server.ssrLoadModule("/src/game/effect-spec-validation.ts");
  const { leaderRevealEffectSpecs } = await server.ssrLoadModule("/src/game/leader-effect-data.ts");
  const appTurnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  leaderRevealEffectSpecs.forEach(validateSpec);
  assert.deepEqual(
    leaderRevealEffectSpecs.map((spec) => spec.effects.map((effect) => effect.source)),
    [["Devious Strength"], ["Desert Scouts"]],
    "Feyd and Amber reveal abilities should be modeled as typed leader reveal specs",
  );

  const {
    cards: {
      allySignet,
      changeAllegiances,
      costOneImperiumCard,
      demandAttention,
      detonation,
      emperorSignet,
      intrigueCard,
      leadTheWayDiscardDraw,
      leadTheWayDraw,
      muadDibSignet,
      sietchRitual,
      unexpectedAllies,
    },
    game,
    players: { emperor, feyd, irulan, ladyAmber, muadDib, muadDibAllyA, shaddamAlly },
    seats: { gurneySeat },
    spaces: { arrakeen, imperialBasin },
  } = verifyLeaderCatalogAndSignets({ data, state });

  const {
    players: { ladyJessica, reverendJessicaOwner },
    spaces: { haggaBasin, secrets },
    states: { jessicaOtherMemoriesResolved },
  } = verifyLeaderJessicaSignets({
    appTurnActions,
    cards: {
      allySignet,
      emperorSignet,
      intrigueCard,
      leadTheWayDiscardDraw,
      leadTheWayDraw,
      muadDibSignet,
    },
    data,
    game,
    spaces: { arrakeen },
    state,
  });

  const {
    players: { ladyMargot },
  } = verifyLeaderSpiesAndReverendRepeat({
    cards: { allySignet, intrigueCard, leadTheWayDraw },
    data,
    game,
    players: { feyd, irulan, ladyJessica, muadDib, muadDibAllyA, reverendJessicaOwner },
    spaces: { arrakeen, haggaBasin, imperialBasin, secrets },
    state,
    states: { jessicaOtherMemoriesResolved },
  });

  verifyLeaderIrulanSignetAndBirthright({
    cards: { allySignet, changeAllegiances, costOneImperiumCard, intrigueCard },
    game,
    players: { emperor, irulan },
    spaces: { arrakeen },
    state,
  });

  const margotLoyaltyBase = {
    ...game,
    turnSpiceGains: {},
    players: game.players.map((player) =>
      player.id === ladyMargot.id
        ? {
            ...ladyMargot,
            resources: { ...ladyMargot.resources, spice: 0 },
            influence: { ...ladyMargot.influence, bene: 0 },
          }
        : player,
    ),
  };
  const margotLoyaltyReached = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...margotLoyaltyBase,
      players: margotLoyaltyBase.players.map((player) =>
        player.id === ladyMargot.id ? state.adjustInfluence(player, "bene", 2) : player,
      ),
    },
    margotLoyaltyBase.players,
  );
  assert.equal(playerById(margotLoyaltyReached, ladyMargot.id).influence.bene, 2, "Margot should reach Bene Gesserit 2 Influence");
  assert.equal(playerById(margotLoyaltyReached, ladyMargot.id).vp, ladyMargot.vp + 1, "Margot should still score the 2-Influence VP");
  assert.equal(playerById(margotLoyaltyReached, ladyMargot.id).resources.spice, 2, "Margot's Loyalty should gain 2 spice");
  assert.equal(margotLoyaltyReached.turnSpiceGains[ladyMargot.id], 2, "Margot's Loyalty spice should count as a turn spice gain");
  assert.match(margotLoyaltyReached.log[1], /Loyalty/, "Margot's Loyalty should log after the triggering action");
  const margotLoyaltyNoRepeatBase = {
    ...margotLoyaltyBase,
    turnSpiceGains: {},
    players: margotLoyaltyBase.players.map((player) =>
      player.id === ladyMargot.id
        ? {
            ...player,
            resources: { ...player.resources, spice: 0 },
            influence: { ...player.influence, bene: 2 },
          }
        : player,
    ),
  };
  const margotLoyaltyNoRepeat = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...margotLoyaltyNoRepeatBase,
      players: margotLoyaltyNoRepeatBase.players.map((player) =>
        player.id === ladyMargot.id ? state.adjustInfluence(player, "bene", 1) : player,
      ),
    },
    margotLoyaltyNoRepeatBase.players,
  );
  assert.equal(playerById(margotLoyaltyNoRepeat, ladyMargot.id).resources.spice, 0, "Margot's Loyalty should not repeat at 2 -> 3 Influence");
  const margotLoyaltyDropped = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...margotLoyaltyNoRepeatBase,
      players: margotLoyaltyNoRepeatBase.players.map((player) =>
        player.id === ladyMargot.id ? state.adjustInfluence(player, "bene", -1) : player,
      ),
    },
    margotLoyaltyNoRepeatBase.players,
  );
  assert.equal(playerById(margotLoyaltyDropped, ladyMargot.id).resources.spice, 0, "Margot's Loyalty should not trigger while dropping below 2 Influence");
  const margotLoyaltyRegained = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...margotLoyaltyDropped,
      turnSpiceGains: {},
      players: margotLoyaltyDropped.players.map((player) =>
        player.id === ladyMargot.id
          ? {
              ...state.adjustInfluence(player, "bene", 1),
              resources: { ...player.resources, spice: 0 },
            }
          : player,
      ),
    },
    margotLoyaltyDropped.players,
  );
  assert.equal(playerById(margotLoyaltyRegained, ladyMargot.id).resources.spice, 2, "Margot's Loyalty should trigger again after dropping below 2 and regaining it");
  const margotWrongInfluence = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...margotLoyaltyBase,
      players: margotLoyaltyBase.players.map((player) =>
        player.id === ladyMargot.id ? state.adjustInfluence(player, "greatHouses", 2) : player,
      ),
    },
    margotLoyaltyBase.players,
  );
  assert.equal(playerById(margotWrongInfluence, ladyMargot.id).resources.spice, 0, "Margot's Loyalty should require Bene Gesserit Influence");
  const margotSietchRitualBase = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === ladyMargot.id),
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) =>
      player.id === ladyMargot.id
        ? {
            ...ladyMargot,
            resources: { ...ladyMargot.resources, spice: 0 },
            influence: { ...ladyMargot.influence, bene: 1 },
            hand: [leadTheWayDraw],
            intrigues: [sietchRitual],
          }
        : player,
    ),
  };
  const margotSietchRitual = state.playSietchRitualPlotIntrigue(
    margotSietchRitualBase,
    ladyMargot.id,
    sietchRitual.id,
    leadTheWayDraw.id,
    "bene",
  );
  assert.equal(playerById(margotSietchRitual, ladyMargot.id).influence.bene, 2, "Sietch Ritual should move Margot to Bene Gesserit 2 Influence");
  assert.equal(playerById(margotSietchRitual, ladyMargot.id).resources.spice, 2, "Sietch Ritual should trigger Margot Loyalty");
  assert.equal(margotSietchRitual.turnSpiceGains[ladyMargot.id], 2, "Sietch Ritual Loyalty spice should be tracked");
  const demandAttentionPending = {
    kind: "pay-resource-for-influence",
    ownerId: muadDib.id,
    influenceOwnerId: ladyMargot.id,
    resource: "solari",
    cost: 4,
    faction: "bene",
    amount: 1,
    optional: true,
    trashSource: true,
    cardId: demandAttention.id,
    source: "Demand Attention",
  };
  const margotDemandAttentionBase = {
    ...game,
    pendingAction: demandAttentionPending,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) => {
      if (player.id === muadDib.id) {
        return {
          ...player,
          resources: { ...player.resources, solari: 4 },
          playArea: [demandAttention],
        };
      }
      if (player.id === ladyMargot.id) {
        return {
          ...ladyMargot,
          team: muadDib.team,
          resources: { ...ladyMargot.resources, spice: 0 },
          influence: { ...ladyMargot.influence, bene: 1 },
        };
      }
      return player;
    }),
  };
  const margotDemandAttention = state.resolvePayResourceForInfluenceChoice(
    margotDemandAttentionBase,
    demandAttentionPending,
  );
  assert.equal(playerById(margotDemandAttention, ladyMargot.id).influence.bene, 2, "Demand Attention should move Margot to Bene Gesserit 2 Influence");
  assert.equal(playerById(margotDemandAttention, ladyMargot.id).resources.spice, 2, "Demand Attention should trigger Margot Loyalty");
  assert.equal(margotDemandAttention.turnSpiceGains[ladyMargot.id], 2, "Demand Attention Loyalty spice should be tracked");
  const margotChangeAllegiancesBase = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === ladyMargot.id),
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: {},
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === ladyMargot.id
        ? {
            ...ladyMargot,
            resources: { ...ladyMargot.resources, spice: 0 },
            influence: { ...ladyMargot.influence, bene: 2 },
            intrigues: [changeAllegiances],
          }
        : player,
    ),
  };
  const margotChangeSameFaction = state.playChangeAllegiancesPlotIntrigue(
    margotChangeAllegiancesBase,
    ladyMargot.id,
    changeAllegiances.id,
    { kind: "shift", loseFaction: "bene", gainFaction: "bene" },
  );
  assert.equal(playerById(margotChangeSameFaction, ladyMargot.id).influence.bene, 2, "Change Allegiances should keep same-Faction Bene Gesserit net-zero");
  assert.equal(playerById(margotChangeSameFaction, ladyMargot.id).resources.spice, 2, "Margot should gain Loyalty spice when Change Allegiances drops and regains Bene Gesserit 2 Influence");
  assert.equal(margotChangeSameFaction.turnSpiceGains[ladyMargot.id], 2, "Change Allegiances Loyalty spice should be tracked");
  assert.match(margotChangeSameFaction.log[1], /Loyalty/, "Margot's same-Faction Change Allegiances reward should log after the played Intrigue");

  const gurneyRevealBase = {
    ...game,
    activeSeat: gurneySeat,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === muadDibAllyA.id
        ? {
            ...player,
            revealed: true,
            conflict: 10,
            deployedTroops: 5,
            vp: 1,
            gurneyAlwaysSmilingScored: false,
          }
        : player,
    ),
  };
  const gurneyScored = state.scoreGurneyAlwaysSmiling(gurneyRevealBase, muadDibAllyA.id);
  assert.equal(playerById(gurneyScored, muadDibAllyA.id).vp, 2, "Gurney should gain 1 VP at 10+ strength in six-player mode");
  assert.equal(
    playerById(gurneyScored, muadDibAllyA.id).gurneyAlwaysSmilingScored,
    true,
    "Gurney should mark Always Smiling as scored for the Reveal turn",
  );
  assert.match(gurneyScored.log[0], /Always Smiling/, "Gurney's Reveal ability should log when it scores");
  const gurneyNoDouble = state.scoreGurneyAlwaysSmiling(gurneyScored, muadDibAllyA.id);
  assert.equal(playerById(gurneyNoDouble, muadDibAllyA.id).vp, 2, "Always Smiling should score at most once per Reveal turn");
  const gurneyUnderThreshold = state.scoreGurneyAlwaysSmiling(
    {
      ...gurneyRevealBase,
      players: gurneyRevealBase.players.map((player) =>
        player.id === muadDibAllyA.id ? { ...player, conflict: 9 } : player,
      ),
    },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyUnderThreshold, muadDibAllyA.id).vp, 1, "Gurney should not score below 10 strength in six-player mode");
  const gurneyInactiveTurn = state.scoreGurneyAlwaysSmiling(
    { ...gurneyRevealBase, activeSeat: game.players.findIndex((player) => player.id === muadDib.id) },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyInactiveTurn, muadDibAllyA.id).vp, 1, "Always Smiling should only score on Gurney's own active Reveal turn");
  const gurneyNoUnits = state.scoreGurneyAlwaysSmiling(
    {
      ...gurneyRevealBase,
      players: gurneyRevealBase.players.map((player) =>
        player.id === muadDibAllyA.id ? { ...player, deployedTroops: 0, deployedSandworms: 0 } : player,
      ),
    },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyNoUnits, muadDibAllyA.id).vp, 1, "Gurney should not score from swords alone with no Conflict units");
  const gurneyNonSixPlayer = state.scoreGurneyAlwaysSmiling(
    { ...gurneyRevealBase, players: gurneyRevealBase.players.slice(0, 5) },
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyNonSixPlayer, muadDibAllyA.id).vp,
    1,
    "The automated Gurney threshold should only apply to this six-player implementation",
  );
  const deployCrossingPending = { kind: "deploy", ownerId: muadDibAllyA.id, remaining: 1, source: "Reveal-turn Detonation" };
  const gurneyAfterRevealDeployment = state.scoreGurneyAlwaysSmiling(
    state.deployTroopToConflict(
      {
        ...gurneyRevealBase,
        pendingAction: deployCrossingPending,
        pendingQueue: [],
        players: gurneyRevealBase.players.map((player) =>
          player.id === muadDibAllyA.id
            ? { ...player, conflict: 8, garrison: 1, deployedTroops: 4, vp: 1, gurneyAlwaysSmilingScored: false }
            : player,
        ),
      },
      deployCrossingPending,
    ),
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyAfterRevealDeployment, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after a Reveal-turn deployment brings Gurney to 10 strength",
  );
  const deployOrRetreatCrossingPending = {
    kind: "deploy-or-retreat-troops",
    ownerId: muadDibAllyA.id,
    recipientId: muadDibAllyA.id,
    troopCount: 1,
    optional: true,
    source: "Verifier deploy-or-retreat",
  };
  const gurneyAfterDeployOrRetreatChoice = state.resolveDeployOrRetreatTroopsChoice(
    {
      ...gurneyRevealBase,
      pendingAction: deployOrRetreatCrossingPending,
      pendingQueue: [],
      players: gurneyRevealBase.players.map((player) =>
        player.id === muadDibAllyA.id
          ? { ...player, conflict: 8, garrison: 1, deployedTroops: 4, vp: 1, gurneyAlwaysSmilingScored: false }
          : player,
      ),
    },
    deployOrRetreatCrossingPending,
    "deploy",
  );
  assert.equal(
    playerById(gurneyAfterDeployOrRetreatChoice, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after a deploy-or-retreat choice brings Gurney to 10 strength",
  );
  const gurneyUnexpectedAlliesState = {
    ...gurneyRevealBase,
    shieldWall: false,
    players: gurneyRevealBase.players.map((player) =>
      player.id === muadDibAllyA.id
        ? {
            ...player,
            conflict: 7,
            deployedTroops: 4,
            deployedSandworms: 0,
            resources: { ...player.resources, water: 2 },
            intrigues: [unexpectedAllies],
            vp: 1,
            gurneyAlwaysSmilingScored: false,
          }
        : { ...player, intrigues: [] },
    ),
  };
  const gurneyAfterUnexpectedAllies = state.scoreGurneyAlwaysSmiling(
    state.playUnexpectedAlliesIntrigue(gurneyUnexpectedAlliesState, muadDibAllyA.id, unexpectedAllies.id, false),
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyAfterUnexpectedAllies, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after Reveal-turn Unexpected Allies brings Gurney to 10 strength",
  );

  const feydDeviousStrengthBase = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === feyd.id),
    spyPosts: { [state.spyObservationPostIdForSpace("secrets")]: feyd.id },
    sharedSpyPosts: {},
    players: game.players.map((player) =>
      player.id === feyd.id
        ? { ...player, spies: 2, deployedTroops: 1, conflict: 2 }
        : player,
    ),
  };
  const feydDeviousStrengthPending = state.pendingActionsForReveal(
    playerById(feydDeviousStrengthBase, feyd.id),
    feydDeviousStrengthBase,
    [],
    feyd.id,
  );
  assert.deepEqual(
    feydDeviousStrengthPending,
    [{
      kind: "recall-spy",
      ownerId: feyd.id,
      combatRecipientId: feyd.id,
      remaining: 1,
      strength: 2,
      source: "Devious Strength",
      optional: true,
    }],
    "Feyd should be able to recall one spy for Devious Strength on his Reveal turn",
  );
  const feydDeviousStrengthResolved = state.recallSpyForPending(
    { ...feydDeviousStrengthBase, pendingAction: feydDeviousStrengthPending[0], pendingQueue: [] },
    feydDeviousStrengthPending[0],
    "espionage",
  );
  assert.equal(
    playerById(feydDeviousStrengthResolved, feyd.id).conflict,
    4,
    "Devious Strength should add 2 Reveal strength after recalling a spy",
  );
  assert.equal(
    playerById(feydDeviousStrengthResolved, feyd.id).spies,
    3,
    "Devious Strength should return the recalled spy to Feyd's supply",
  );
  assert.equal(
    feydDeviousStrengthResolved.spyPosts[state.spyObservationPostIdForSpace("secrets")],
    undefined,
    "Devious Strength should remove the recalled spy post",
  );
  assert.equal(
    state.pendingActionsForReveal(
      playerById({ ...feydDeviousStrengthBase, spyPosts: {} }, feyd.id),
      { ...feydDeviousStrengthBase, spyPosts: {} },
      [],
      feyd.id,
    ).length,
    0,
    "Devious Strength should require one of Feyd's spies on the board",
  );
  const feydNoConflictUnits = {
    ...feydDeviousStrengthBase,
    players: feydDeviousStrengthBase.players.map((player) =>
      player.id === feyd.id ? { ...player, deployedTroops: 0, deployedSandworms: 0 } : player,
    ),
  };
  assert.equal(
    state.pendingActionsForReveal(playerById(feydNoConflictUnits, feyd.id), feydNoConflictUnits, [], feyd.id).length,
    0,
    "Devious Strength should not queue when Feyd has no units in the Conflict",
  );
  const irulanWithSpy = {
    ...feydDeviousStrengthBase,
    spyPosts: { secrets: irulan.id },
    players: feydDeviousStrengthBase.players.map((player) =>
      player.id === irulan.id ? { ...player, deployedTroops: 1, conflict: 2 } : player,
    ),
  };
  assert.equal(
    state.pendingActionsForReveal(playerById(irulanWithSpy, irulan.id), irulanWithSpy, [], irulan.id).length,
    0,
    "Devious Strength should not trigger for non-Feyd leaders",
  );

  const amberRevealBase = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === ladyAmber.id
        ? { ...ladyAmber, garrison: 1, conflict: 6, deployedTroops: 2 }
        : player,
    ),
  };
  const amberRevealPlayer = playerById(amberRevealBase, ladyAmber.id);
  const amberDesertScoutsPending = state.pendingActionsForReveal(
    amberRevealPlayer,
    amberRevealBase,
    [],
    ladyAmber.id,
  );
  assert.deepEqual(
    amberDesertScoutsPending,
    [{
      kind: "amber-desert-scouts",
      ownerId: ladyAmber.id,
      source: "Desert Scouts",
    }],
    "Amber should be able to retreat one deployed troop on her Reveal turn",
  );
  const amberDesertScoutsResolved = state.resolveLadyAmberDesertScoutsChoice(
    { ...amberRevealBase, pendingAction: amberDesertScoutsPending[0], pendingQueue: [] },
    amberDesertScoutsPending[0],
    "retreat",
  );
  assert.equal(playerById(amberDesertScoutsResolved, ladyAmber.id).deployedTroops, 1, "Desert Scouts should retreat one troop");
  assert.equal(playerById(amberDesertScoutsResolved, ladyAmber.id).garrison, 2, "Desert Scouts should return the troop to garrison");
  assert.equal(playerById(amberDesertScoutsResolved, ladyAmber.id).conflict, 4, "Desert Scouts should remove the retreated troop strength");
  assert.equal(amberDesertScoutsResolved.pendingAction, undefined, "Desert Scouts should advance the pending action");
  assert.match(amberDesertScoutsResolved.log[0], /retreats 1 troop/, "Desert Scouts should log the retreat");
  const amberDesertScoutsSkipped = state.resolveLadyAmberDesertScoutsChoice(
    { ...amberRevealBase, pendingAction: amberDesertScoutsPending[0], pendingQueue: [] },
    amberDesertScoutsPending[0],
    "skip",
  );
  assert.equal(playerById(amberDesertScoutsSkipped, ladyAmber.id).deployedTroops, 2, "Skipping Desert Scouts should keep troops deployed");
  assert.equal(playerById(amberDesertScoutsSkipped, ladyAmber.id).conflict, 6, "Skipping Desert Scouts should preserve strength");
  const amberNoTroopsReveal = {
    ...amberRevealBase,
    players: amberRevealBase.players.map((player) =>
      player.id === ladyAmber.id ? { ...player, conflict: 3, deployedTroops: 0 } : player,
    ),
  };
  assert.equal(
    state.pendingActionsForReveal(playerById(amberNoTroopsReveal, ladyAmber.id), amberNoTroopsReveal, [], ladyAmber.id).length,
    0,
    "Desert Scouts should require one of Amber's troops in the Conflict",
  );

  const shaddamSignetSource = {
    ...emperor,
    resources: { ...emperor.resources, solari: 3 },
    playArea: [emperorSignet],
  };
  const shaddamSignetEffect = state.applyCardAgentEffect(emperorSignet, shaddamSignetSource, shaddamAlly);
  assert.equal(
    shaddamSignetEffect.blocksDeploymentsThisTurn,
    true,
    "Emperor of the Known Universe should block same-turn Conflict deployment",
  );
  assert.equal(shaddamSignetEffect.target.id, shaddamAlly.id, "Shaddam Signet should keep the activated Ally target");
  assert.match(
    shaddamSignetEffect.log ?? "",
    /Emperor of the Known Universe: units can't be deployed/,
    "Shaddam Signet should log the deployment block under the ability name",
  );
  assert.equal(
    state.pendingActionForSpace(
      arrakeen,
      shaddamSignetEffect.source,
      shaddamSignetEffect.target,
      game.players,
      0,
      shaddamSignetEffect.blocksDeploymentsThisTurn,
    ),
    undefined,
    "Shaddam Signet should suppress the activated Ally's same-turn combat-space deployment",
  );
  const militarySupport = data.boardSpaces.find((space) => space.id === "military-support");
  assert.ok(militarySupport, "Military Support should exist for Shaddam Signet reinforcement regression");
  const blockedReinforcePending = state.pendingActionForSpace(
    militarySupport,
    shaddamSignetEffect.source,
    shaddamSignetEffect.target,
    game.players,
    0,
    shaddamSignetEffect.blocksDeploymentsThisTurn,
  );
  assert.deepEqual(blockedReinforcePending, {
    kind: "reinforce",
    team: "shaddam",
    remaining: 3,
    source: "Military Support",
    conflictBlocked: true,
  });
  const blockedReinforceGame = {
    ...game,
    pendingAction: blockedReinforcePending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === shaddamAlly.id ? { ...player, garrison: 0, conflict: 0, deployedTroops: 0 } : player,
    ),
  };
  const rejectedConflictReinforce = state.reinforceTroop(
    blockedReinforceGame,
    blockedReinforcePending,
    shaddamAlly.id,
    "conflict",
  );
  assert.equal(playerById(rejectedConflictReinforce, shaddamAlly.id).conflict, 0, "Blocked reinforcement should not enter Conflict");
  assert.equal(
    rejectedConflictReinforce.pendingAction?.kind,
    "reinforce",
    "Blocked reinforcement should keep the pending action for a garrison choice",
  );
  const garrisonReinforce = state.reinforceTroop(
    blockedReinforceGame,
    blockedReinforcePending,
    shaddamAlly.id,
    "garrison",
  );
  assert.equal(playerById(garrisonReinforce, shaddamAlly.id).garrison, 1, "Blocked reinforcement should still allow garrison recruitment");
  assert.equal(garrisonReinforce.pendingAction?.remaining, 2, "Garrison reinforcement should consume one blocked reinforce choice");
  const blockedSietchPending = {
    kind: "sietch-tabr",
    ownerId: shaddamAlly.id,
    waterOwnerId: emperor.id,
    canTakeMakerHooks: false,
    canRemoveShieldWall: true,
    source: "Sietch Tabr",
    spaceId: "sietch-tabr",
    conflictBlocked: true,
  };
  const blockedSietchGame = {
    ...game,
    pendingAction: blockedSietchPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === shaddamAlly.id) return { ...player, garrison: 2, conflict: 0, deployedTroops: 0 };
      if (player.id === emperor.id) return { ...player, resources: { ...player.resources, water: 0 } };
      return player;
    }),
  };
  const blockedSietch = state.resolveSietchTabrChoice(blockedSietchGame, blockedSietchPending, "hooks");
  assert.equal(playerById(blockedSietch, shaddamAlly.id).garrison, 3, "Blocked Sietch Tabr should still recruit to garrison");
  assert.equal(playerById(blockedSietch, shaddamAlly.id).conflict, 0, "Blocked Sietch Tabr should not deploy troops");
  assert.equal(blockedSietch.pendingAction, undefined, "Blocked Sietch Tabr should not queue deployment");

  const signetDeploymentBlock = {
    actorId: emperor.id,
    ownerId: shaddamAlly.id,
    source: "Emperor of the Known Universe",
  };
  const blockedPlotDeploymentGame = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === emperor.id),
    conflictDeploymentBlock: signetDeploymentBlock,
    pendingAction: undefined,
    pendingQueue: [],
    shieldWall: false,
    players: game.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...player, resources: { ...player.resources, water: 2 }, intrigues: [detonation, unexpectedAllies] };
      }
      if (player.id === shaddamAlly.id) {
        return { ...player, garrison: 3, conflict: 0, deployedTroops: 0, deployedSandworms: 0 };
      }
      return { ...player, intrigues: [] };
    }),
  };
  assert.equal(
    state.conflictDeploymentBlockedFor(blockedPlotDeploymentGame, emperor.id, shaddamAlly.id),
    true,
    "Shaddam Signet should register the activated Ally as deployment-blocked for Shaddam's turn",
  );
  assert.equal(
    state.conflictDeploymentBlockedFor(blockedPlotDeploymentGame, emperor.id, "p6"),
    false,
    "Shaddam Signet deployment block should not affect an unactivated Ally",
  );
  const blockedDetonation = state.playDetonationIntrigue(
    blockedPlotDeploymentGame,
    emperor.id,
    detonation.id,
    "deploy",
    shaddamAlly.id,
  );
  assert.equal(blockedDetonation, blockedPlotDeploymentGame, "Shaddam Signet should block Detonation troop deployment");
  const blockedUnexpectedAllies = state.playUnexpectedAlliesIntrigue(
    blockedPlotDeploymentGame,
    emperor.id,
    unexpectedAllies.id,
    false,
    shaddamAlly.id,
  );
  assert.equal(
    blockedUnexpectedAllies,
    blockedPlotDeploymentGame,
    "Shaddam Signet should block Unexpected Allies sandworm deployment",
  );
  const blockedDeployPending = { kind: "deploy", ownerId: shaddamAlly.id, remaining: 1, source: "Blocked regression" };
  const blockedDeploy = state.deployTroopToConflict(
    { ...blockedPlotDeploymentGame, pendingAction: blockedDeployPending },
    blockedDeployPending,
  );
  assert.equal(playerById(blockedDeploy, shaddamAlly.id).garrison, 3, "Blocked deployment should not spend a garrison troop");
  assert.equal(playerById(blockedDeploy, shaddamAlly.id).conflict, 0, "Blocked deployment should not add Conflict strength");
  assert.equal(blockedDeploy.pendingAction, undefined, "Blocked deployment should advance the stale pending action");

  const shaddamSignetPending = state.pendingActionForCard(
    emperorSignet,
    shaddamSignetSource,
    game,
    shaddamAlly,
    arrakeen,
  );
  assert.deepEqual(shaddamSignetPending, {
    kind: "paid-reward-choice",
    ownerId: emperor.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
    options: [
      {
        id: "troop",
        resource: "solari",
        cost: 1,
        reward: { kind: "recruit-troops", recipientId: shaddamAlly.id, amount: 1, destination: "garrison" },
      },
      {
        id: "emperor",
        resource: "solari",
        cost: 3,
        reward: { kind: "gain-influence", recipientId: emperor.id, faction: "emperor", amount: 1 },
      },
      {
        id: "greatHouses",
        resource: "solari",
        cost: 3,
        reward: { kind: "gain-influence", recipientId: shaddamAlly.id, faction: "greatHouses", amount: 1 },
      },
      {
        id: "spacing",
        resource: "solari",
        cost: 3,
        reward: { kind: "gain-influence", recipientId: shaddamAlly.id, faction: "spacing", amount: 1 },
      },
      {
        id: "bene",
        resource: "solari",
        cost: 3,
        reward: { kind: "gain-influence", recipientId: shaddamAlly.id, faction: "bene", amount: 1 },
      },
      {
        id: "fringeWorlds",
        resource: "solari",
        cost: 3,
        reward: { kind: "gain-influence", recipientId: shaddamAlly.id, faction: "fringeWorlds", amount: 1 },
      },
    ],
  });
  assert.equal(
    state.pendingActionForCard(emperorSignet, { ...shaddamSignetSource, playArea: [] }, game, shaddamAlly, arrakeen),
    undefined,
    "Shaddam Signet choice should require the Signet Ring in play",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, shaddamAlly, game, shaddamAlly, arrakeen),
    undefined,
    "Shaddam Signet choice should not trigger from an Ally owner",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, shaddamSignetSource, game, muadDibAllyA, arrakeen),
    undefined,
    "Shaddam Signet choice should require an activated Shaddam Ally",
  );

  const signetResolutionBase = {
    ...game,
    pendingAction: shaddamSignetPending,
    pendingQueue: [],
    conflictDeploymentBlock: signetDeploymentBlock,
    players: game.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...shaddamSignetSource, influence: { ...player.influence, emperor: 1 } };
      }
      if (player.id === shaddamAlly.id) {
        return {
          ...player,
          garrison: 0,
          influence: { ...player.influence, greatHouses: 1, spacing: 1 },
        };
      }
      return player;
    }),
  };
  const troopChoice = state.resolvePaidRewardChoice(signetResolutionBase, shaddamSignetPending, "troop");
  assert.equal(playerById(troopChoice, emperor.id).resources.solari, 2, "Shaddam Signet troop branch should cost Shaddam 1 Solari");
  assert.equal(playerById(troopChoice, shaddamAlly.id).garrison, 1, "Shaddam Signet troop branch should recruit for the activated Ally");
  assert.equal(playerById(troopChoice, shaddamAlly.id).conflict, 0, "Shaddam Signet troop branch should not deploy the recruited troop");
  assert.equal(troopChoice.pendingAction, undefined, "Shaddam Signet troop branch should clear the pending action");
  assert.equal(troopChoice.conflictDeploymentBlock, undefined, "Shaddam Signet block should clear when the Signet pending choice resolves");

  const greatHousesChoice = state.resolvePaidRewardChoice(
    signetResolutionBase,
    shaddamSignetPending,
    "greatHouses",
  );
  assert.equal(playerById(greatHousesChoice, emperor.id).resources.solari, 0, "Shaddam Signet Influence branch should cost Shaddam 3 Solari");
  assert.equal(
    playerById(greatHousesChoice, shaddamAlly.id).influence.greatHouses,
    2,
    "Shaddam Signet main-board Influence branch should move the activated Ally",
  );
  assert.equal(playerById(greatHousesChoice, shaddamAlly.id).vp, shaddamAlly.vp + 1, "Shaddam Signet Ally Influence can score the 2-Influence VP");
  assert.equal(playerById(greatHousesChoice, emperor.id).influence.greatHouses, 0, "Shaddam should not take main-board Great Houses Influence");

  const personalEmperorChoice = state.resolvePaidRewardChoice(
    signetResolutionBase,
    shaddamSignetPending,
    "emperor",
  );
  assert.equal(
    playerById(personalEmperorChoice, emperor.id).influence.emperor,
    2,
    "Shaddam Signet personal Emperor choice should move Shaddam's personal track",
  );
  assert.equal(playerById(personalEmperorChoice, emperor.id).vp, emperor.vp + 1, "Shaddam personal Influence can score the 2-Influence VP");
  assert.equal(playerById(personalEmperorChoice, shaddamAlly.id).influence.emperor, 0, "Activated Ally should not take personal Emperor Influence");
  const malformedPaidRewardPending = {
    ...shaddamSignetPending,
    options: [{
      id: "vp",
      resource: "solari",
      cost: 1,
      reward: { kind: "gain-vp", recipientId: emperor.id, amount: 1 },
    }],
  };
  const malformedPaidRewardState = { ...signetResolutionBase, pendingAction: malformedPaidRewardPending };
  assert.equal(
    state.resolvePaidRewardChoice(malformedPaidRewardState, malformedPaidRewardPending, "vp"),
    malformedPaidRewardState,
    "Paid reward choice resolution should reject unsupported restored pending reward kinds",
  );
  const irulanShaddamSignetPending = {
    ...shaddamSignetPending,
    kind: "paid-reward-choice",
    ownerId: emperor.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
    options: shaddamSignetPending.options.map((option) =>
      option.reward.kind === "gain-influence" && option.reward.recipientId === shaddamAlly.id
        ? { ...option, reward: { ...option.reward, recipientId: irulan.id } }
        : option
    ),
  };
  const irulanShaddamSignetBase = {
    ...signetResolutionBase,
    pendingAction: irulanShaddamSignetPending,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: signetResolutionBase.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...player, resources: { ...player.resources, solari: 3 }, playArea: [emperorSignet] };
      }
      if (player.id === irulan.id) {
        return { ...player, influence: { ...player.influence, greatHouses: 1 }, intrigues: [] };
      }
      return player;
    }),
  };
  const irulanShaddamSignetBirthright = state.resolvePaidRewardChoice(
    irulanShaddamSignetBase,
    irulanShaddamSignetPending,
    "greatHouses",
  );
  assert.equal(
    playerById(irulanShaddamSignetBirthright, irulan.id).influence.greatHouses,
    2,
    "Shaddam Signet should route Great Houses Influence to activated Irulan",
  );
  assert.equal(
    playerById(irulanShaddamSignetBirthright, irulan.id).intrigues.length,
    1,
    "Commander-routed Great Houses Influence should trigger Irulan's Imperial Birthright",
  );
  const skippedSignet = state.skipPaidRewardChoice(signetResolutionBase, shaddamSignetPending);
  assert.equal(playerById(skippedSignet, emperor.id).resources.solari, 3, "Skipping Shaddam Signet should not spend Solari");
  assert.equal(playerById(skippedSignet, shaddamAlly.id).garrison, 0, "Skipping Shaddam Signet should not recruit troops");
  assert.equal(skippedSignet.conflictDeploymentBlock, undefined, "Skipping Shaddam Signet should clear the one-turn deployment block");
  const laterDeployPending = { kind: "deploy", ownerId: shaddamAlly.id, remaining: 1, source: "Later turn" };
  const laterDeploy = state.deployTroopToConflict(
    {
      ...skippedSignet,
      pendingAction: laterDeployPending,
      players: skippedSignet.players.map((player) =>
        player.id === shaddamAlly.id ? { ...player, garrison: 3, conflict: 0, deployedTroops: 0 } : player,
      ),
    },
    laterDeployPending,
  );
  assert.equal(playerById(laterDeploy, shaddamAlly.id).garrison, 2, "Later turns should allow the Ally to deploy after Shaddam Signet clears");
  assert.equal(playerById(laterDeploy, shaddamAlly.id).conflict, 2, "Later deployment should add Conflict strength after Shaddam Signet clears");

  console.log("leader verification passed");
} finally {
  await server.close();
}
