import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import {
  verifyBasicCardEffectIntrigues,
  verifyBasicPlotIntrigues,
  verifyCunningPlotIntrigue,
} from "./verify-intrigues-basic.mjs";
import { verifyCallToArmsPlotIntrigue } from "./verify-intrigues-call-to-arms.mjs";
import { collectIntrigueVerifierCards } from "./verify-intrigues-cards.mjs";
import { verifyEconomyPlotIntrigues } from "./verify-intrigues-economy.mjs";
import {
  verifyBuyAccessPlotIntrigue,
  verifyChangeAllegiancesPlotIntrigue,
  verifyOpportunismPlotIntrigue,
  verifySietchRitualPlotIntrigue,
} from "./verify-intrigues-influence.mjs";
import { verifyImperiumPoliticsPlotIntrigue } from "./verify-intrigues-politics.mjs";
import { verifyDistractionPlotIntrigue } from "./verify-intrigues-spy.mjs";
import { verifySpecialMissionPlotIntrigue } from "./verify-intrigues-tactical.mjs";

const projectRoot = new URL("..", import.meta.url);
const resourceKeys = ["solari", "spice", "water"];

function assertUnique(items, label, pick) {
  const values = items.map(pick);
  assert.equal(new Set(values).size, values.length, `${label} should be unique`);
}

function assertLocalArt(card) {
  const artPath = card.thumbnailPath ?? card.imagePath;
  assert.ok(artPath, `${card.name} is missing Intrigue art`);
  assert.ok(artPath.startsWith("/assets/"), `${card.name} Intrigue art must be local`);
  assert.ok(
    existsSync(join(projectRoot.pathname, "public", artPath)),
    `${card.name} Intrigue art does not exist at ${artPath}`,
  );
}

function assertOnlyFactionTraits(card) {
  const traits = card.traits ?? [];
  assert.deepEqual(
    traits.filter((trait) => !trait.startsWith("Faction: ")),
    [],
    `${card.name} should not expose catalog reward metadata as Intrigue rule traits`,
  );
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function conflictByName(data, name) {
  const conflict = data.conflictCards.find((candidate) => candidate.name === name);
  assert.ok(conflict, `Expected conflict ${name}`);
  return conflict;
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(data.intrigueCards.length, 39, "Uprising Intrigue deck should expose 39 cards");
  assertUnique(data.intrigueCards, "Intrigue ids", (card) => card.id);
  assertUnique(data.intrigueCards, "Intrigue names", (card) => card.name);
  assertUnique(data.intrigueCards, "Intrigue source ids", (card) => card.sourceId);
  for (const card of data.intrigueCards) {
    assert.ok(card.summary, `${card.name} should include a summary`);
    assertLocalArt(card);
    assertOnlyFactionTraits(card);
  }
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.battleIcon)
      .map((card) => [card.name, card.battleIcon])
      .sort(),
    [
      ["Crysknife", "crysknife"],
      ["Desert Mouse", "desertMouse"],
      ["Ornithopter", "ornithopter"],
    ],
    "Battle-icon Endgame Intrigues should expose structured icons",
  );

  const game = state.initialGame();
  assert.equal(game.intrigueDeck.length, 39, "Initial game should shuffle the full Intrigue deck");
  assert.equal(game.intrigueDiscard.length, 0, "Initial Intrigue discard should be empty");
  for (const player of game.players) {
    assert.deepEqual(Object.keys(player.resources).sort(), resourceKeys, `${player.leader} should not track Intrigue as a resource`);
    assert.equal(player.intrigues.length, 0, `${player.leader} should not start with Intrigue cards`);
  }

  const drawn = state.drawIntrigueCards(game, "p2", 2, "Test");
  const player = drawn.players.find((candidate) => candidate.id === "p2");
  assert.ok(player, "p2 should remain in the game");
  assert.equal(player.intrigues.length, 2, "Drawing should add physical Intrigue cards to the player");
  assert.equal(drawn.intrigueDeck.length, 37, "Drawing two Intrigue cards should consume the deck");
  assert.equal(drawn.intrigueDiscard.length, 0, "Drawing should not create a discard");
  assert.match(drawn.log[0], /draws 2 Intrigue cards from Test/);

  const {
    backedByChoam,
    buyAccess,
    callToArms,
    changeAllegiances,
    contingencyPlan,
    councilorsAmbition,
    crysknife,
    cunning,
    departForArrakis,
    detonation,
    devour,
    distraction,
    findWeakness,
    goToGround,
    imperiumPolitics,
    impress,
    inspireAwe,
    intelligenceReport,
    leverage,
    manipulate,
    marketOpportunity,
    mercenaries,
    opportunism,
    questionableMethods,
    shaddamsFavor,
    sietchRitual,
    specialMission,
    springTheTrap,
    strategicStockpiling,
    unexpectedAllies,
  } = collectIntrigueVerifierCards(data);
  verifyBasicPlotIntrigues({
    cards: { crysknife, leverage, manipulate, mercenaries },
    data,
    game,
    state,
  });
  verifyDistractionPlotIntrigue({
    cards: { distraction, mercenaries },
    data,
    game,
    state,
  });
  verifyBasicCardEffectIntrigues({
    cards: { contingencyPlan, inspireAwe, intelligenceReport, mercenaries },
    data,
    game,
    state,
  });

  const departFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 2 },
            influence: { ...candidate.influence, fringeWorlds: 3 },
            hand: [],
            deck: candidate.deck.slice(0, 3),
            discard: [],
            garrison: 1,
            intrigues: [departForArrakis],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isDepartForArrakisIntrigue(departForArrakis),
    true,
    "Depart For Arrakis should be recognized as a structured Plot Intrigue",
  );
  const departDraw = state.playDepartForArrakisPlotIntrigue(departFixture, "p2", departForArrakis.id, "draw");
  assert.equal(playerById(departDraw, "p2").hand.length, 1, "Depart For Arrakis draw branch should draw 1 card");
  assert.equal(playerById(departDraw, "p2").resources.spice, 2, "Depart For Arrakis draw branch should not spend spice");
  assert.equal(playerById(departDraw, "p2").garrison, 1, "Depart For Arrakis draw branch should not recruit troops");
  assert.deepEqual(playerById(departDraw, "p2").intrigues, []);
  assert.equal(departDraw.intrigueDiscard.at(-1).id, departForArrakis.id);
  assert.match(departDraw.log[0], /plays Depart For Arrakis, draws 1 card/);
  const departBoth = state.playDepartForArrakisPlotIntrigue(departFixture, "p2", departForArrakis.id, "spend-spice");
  assert.equal(playerById(departBoth, "p2").hand.length, 1, "Depart For Arrakis should draw when the Fremen/Fringe threshold is met");
  assert.equal(playerById(departBoth, "p2").resources.spice, 0, "Depart For Arrakis should spend 2 spice");
  assert.equal(playerById(departBoth, "p2").garrison, 4, "Depart For Arrakis should recruit 3 troops");
  assert.equal(playerById(departBoth, "p2").conflict, 0, "Depart For Arrakis should not deploy recruited troops");
  assert.equal(playerById(departBoth, "p2").deployedTroops, 0, "Depart For Arrakis should not move troops to the Conflict");
  assert.match(departBoth.log[0], /draws 1 card, spends 2 spice and recruits 3 troops/);
  const departTroopsOnlyFixture = {
    ...departFixture,
    players: departFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            influence: { ...candidate.influence, fremen: 3, fringeWorlds: 0 },
            hand: [],
            deck: candidate.deck.slice(0, 3),
            resources: { ...candidate.resources, spice: 2 },
            garrison: 1,
            intrigues: [departForArrakis],
          }
        : candidate,
    ),
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(departTroopsOnlyFixture, "p2", departForArrakis.id, "draw"),
    departTroopsOnlyFixture,
    "Depart For Arrakis should use Fringe Worlds, not an Ally's personal Fremen track, for the draw threshold",
  );
  const departTroopsOnly = state.playDepartForArrakisPlotIntrigue(
    departTroopsOnlyFixture,
    "p2",
    departForArrakis.id,
    "spend-spice",
  );
  assert.equal(playerById(departTroopsOnly, "p2").hand.length, 0, "Depart For Arrakis should allow the troop branch without draw eligibility");
  assert.equal(playerById(departTroopsOnly, "p2").resources.spice, 0);
  assert.equal(playerById(departTroopsOnly, "p2").garrison, 4);
  assert.match(departTroopsOnly.log[0], /spends 2 spice and recruits 3 troops/);
  const noSupplyDepart = {
    ...departTroopsOnlyFixture,
    players: departTroopsOnlyFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            deployedTroops: 0,
            discard: [],
            garrison: 12,
            jessicaMemories: 0,
            resources: { ...candidate.resources, spice: 2 },
            intrigues: [departForArrakis],
          }
        : candidate,
    ),
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(noSupplyDepart, "p2", departForArrakis.id, "spend-spice"),
    noSupplyDepart,
    "Depart For Arrakis troop branch should not spend spice when troop supply and draw payoff are both unavailable",
  );
  const noSupplyDrawDepart = {
    ...departFixture,
    players: departFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            deployedTroops: 0,
            discard: [],
            garrison: 12,
            jessicaMemories: 0,
            resources: { ...candidate.resources, spice: 2 },
            intrigues: [departForArrakis],
          }
        : candidate,
    ),
  };
  const noSupplyDrawDepartPlayed = state.playDepartForArrakisPlotIntrigue(
    noSupplyDrawDepart,
    "p2",
    departForArrakis.id,
    "spend-spice",
  );
  assert.equal(playerById(noSupplyDrawDepartPlayed, "p2").resources.spice, 0);
  assert.equal(playerById(noSupplyDrawDepartPlayed, "p2").garrison, 12);
  assert.equal(playerById(noSupplyDrawDepartPlayed, "p2").hand.length, 1);
  assert.match(noSupplyDrawDepartPlayed.log[0], /draws 1 card, spends 2 spice/);
  const noSupplyDrySpendDepart = {
    ...noSupplyDrawDepart,
    players: noSupplyDrawDepart.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, deck: [], discard: [], hand: [], intrigues: [departForArrakis] }
        : candidate,
    ),
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(noSupplyDrySpendDepart, "p2", departForArrakis.id, "spend-spice"),
    noSupplyDrySpendDepart,
    "Depart For Arrakis troop branch should not spend spice for an empty draw and zero recruited troops",
  );
  const poorDepart = {
    ...departFixture,
    players: departFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 1 }, intrigues: [departForArrakis] }
        : candidate,
    ),
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(poorDepart, "p2", departForArrakis.id, "spend-spice"),
    poorDepart,
    "Depart For Arrakis troop branch should require 2 spice",
  );
  const poorDepartDraw = state.playDepartForArrakisPlotIntrigue(poorDepart, "p2", departForArrakis.id, "draw");
  assert.equal(playerById(poorDepartDraw, "p2").hand.length, 1, "Depart For Arrakis draw branch should not require spice");
  assert.equal(playerById(poorDepartDraw, "p2").resources.spice, 1);
  const dryDepart = {
    ...departFixture,
    players: departFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 0 },
            hand: [],
            deck: [],
            discard: [],
            intrigues: [departForArrakis],
          }
        : candidate,
    ),
  };
  const dryDepartDraw = state.playDepartForArrakisPlotIntrigue(dryDepart, "p2", departForArrakis.id, "draw");
  assert.equal(playerById(dryDepartDraw, "p2").hand.length, 0, "Depart For Arrakis should resolve even when no card can be drawn");
  assert.deepEqual(playerById(dryDepartDraw, "p2").intrigues, []);
  assert.match(dryDepartDraw.log[0], /draws 0 cards/);
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(departFixture, "p2", departForArrakis.id, "bad-choice"),
    departFixture,
    "Depart For Arrakis should reject unknown choices",
  );
  const pendingDepart = {
    ...departFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(pendingDepart, "p2", departForArrakis.id, "draw"),
    pendingDepart,
    "Depart For Arrakis should wait for pending actions to resolve",
  );
  const queuedDepart = {
    ...departFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(queuedDepart, "p2", departForArrakis.id, "draw"),
    queuedDepart,
    "Depart For Arrakis should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(departFixture, "p3", departForArrakis.id, "draw"),
    departFixture,
    "Only the active player should play Depart For Arrakis",
  );
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(departFixture, "p2", mercenaries.id, "draw"),
    departFixture,
    "Depart For Arrakis should reject other Intrigue cards",
  );
  const combatDepart = { ...departFixture, phase: "combat" };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(combatDepart, "p2", departForArrakis.id, "draw"),
    combatDepart,
    "Depart For Arrakis should only resolve during normal play",
  );
  const commanderDepartFixture = {
    ...departFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 2 },
          hand: [],
          deck: candidate.deck.slice(0, 2),
          discard: [],
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [departForArrakis],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, influence: { ...candidate.influence, fringeWorlds: 3 }, garrison: 1, hand: [], intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderDepart = state.playDepartForArrakisPlotIntrigue(
    commanderDepartFixture,
    "p4",
    departForArrakis.id,
    "spend-spice",
    "p6",
  );
  assert.equal(playerById(commanderDepart, "p4").resources.spice, 0, "Commander Depart For Arrakis should spend Commander spice");
  assert.equal(playerById(commanderDepart, "p4").hand.length, 1, "Commander Depart For Arrakis should draw for the Commander");
  assert.equal(playerById(commanderDepart, "p4").garrison, 0, "Commander Depart For Arrakis should not recruit for the Commander");
  assert.equal(playerById(commanderDepart, "p6").garrison, 4, "Commander Depart For Arrakis should recruit for the activated Ally");
  assert.equal(playerById(commanderDepart, "p6").conflict, 0, "Commander Depart For Arrakis should recruit without deploying");
  assert.match(commanderDepart.log[0], /Depart For Arrakis.*for Princess Irulan/);
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(commanderDepartFixture, "p4", departForArrakis.id, "spend-spice", "p2"),
    commanderDepartFixture,
    "Revealed Commander Depart For Arrakis should reject a same-team Ally who was not activated for Reveal",
  );
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(commanderDepartFixture, "p4", departForArrakis.id, "spend-spice", "p4"),
    commanderDepartFixture,
    "Commander Depart For Arrakis should reject recruiting for the Commander",
  );
  const unlockedCommanderDepartFixture = {
    ...commanderDepartFixture,
    players: commanderDepartFixture.players.map((candidate) =>
      candidate.id === "p4" ? { ...candidate, revealed: false, revealActivatedAllyId: undefined } : candidate,
    ),
  };
  assert.equal(
    state.playDepartForArrakisPlotIntrigue(unlockedCommanderDepartFixture, "p4", departForArrakis.id, "spend-spice", "p3"),
    unlockedCommanderDepartFixture,
    "Commander Depart For Arrakis should reject non-team troop owners",
  );
  const muadDibCommanderDepart = {
    ...departFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p1"),
    players: game.players.map((candidate) =>
      candidate.id === "p1"
        ? {
            ...candidate,
            influence: { ...candidate.influence, fremen: 3 },
            hand: [],
            deck: candidate.deck.slice(0, 2),
            intrigues: [departForArrakis],
          }
        : { ...candidate, influence: { ...candidate.influence, fringeWorlds: 0 }, intrigues: [] },
    ),
  };
  const muadDibDepartDraw = state.playDepartForArrakisPlotIntrigue(
    muadDibCommanderDepart,
    "p1",
    departForArrakis.id,
    "draw",
  );
  assert.equal(playerById(muadDibDepartDraw, "p1").hand.length, 1, "Muad'Dib should use personal Fremen Influence for Depart For Arrakis");

  verifyCunningPlotIntrigue({
    cards: { cunning, mercenaries },
    game,
    state,
  });

  verifySietchRitualPlotIntrigue({
    cards: { mercenaries, sietchRitual },
    data,
    game,
    state,
  });

  verifyChangeAllegiancesPlotIntrigue({
    cards: { changeAllegiances, mercenaries },
    game,
    state,
  });

  verifySpecialMissionPlotIntrigue({
    cards: { mercenaries, specialMission },
    data,
    game,
    state,
  });

  verifyOpportunismPlotIntrigue({
    cards: { mercenaries, opportunism },
    game,
    state,
  });

  verifyBuyAccessPlotIntrigue({
    cards: { buyAccess, mercenaries },
    game,
    state,
  });

  verifyImperiumPoliticsPlotIntrigue({
    cards: { imperiumPolitics, mercenaries },
    game,
    state,
  });

  verifyCallToArmsPlotIntrigue({
    cards: { callToArms, mercenaries },
    data,
    game,
    state,
  });

  verifyEconomyPlotIntrigues({
    cards: { councilorsAmbition, marketOpportunity, mercenaries, shaddamsFavor, strategicStockpiling },
    data,
    game,
    state,
  });

  const backedPlotFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 1 },
            influence: { ...candidate.influence, bene: 2, spacing: 1 },
            vp: candidate.vp + 1,
            intrigues: [backedByChoam],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isBackedByChoamIntrigue(backedByChoam),
    true,
    "Backed by CHOAM should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.influenceLossChoices(playerById(backedPlotFixture, "p2")),
    ["spacing", "bene"],
    "Backed by CHOAM Plot should offer the active player's positive Influence tracks",
  );
  const backedPlotted = state.playBackedByChoamPlotIntrigue(backedPlotFixture, "p2", backedByChoam.id, "bene");
  assert.equal(playerById(backedPlotted, "p2").resources.solari, 5, "Backed by CHOAM Plot should gain 4 Solari");
  assert.equal(playerById(backedPlotted, "p2").influence.bene, 1, "Backed by CHOAM Plot should lose the chosen Influence");
  assert.equal(playerById(backedPlotted, "p2").influence.spacing, 1, "Backed by CHOAM Plot should not lose other Influence tracks");
  assert.equal(playerById(backedPlotted, "p2").vp, playerById(backedPlotFixture, "p2").vp - 1, "Dropping below 2 Influence should remove the threshold VP");
  assert.deepEqual(playerById(backedPlotted, "p2").intrigues, []);
  assert.equal(backedPlotted.intrigueDiscard.at(-1).id, backedByChoam.id);
  assert.match(backedPlotted.log[0], /plays Backed by CHOAM as a Plot Intrigue, loses 1 Bene Gesserit Influence, and gains 4 Solari/);
  assert.equal(
    state.playBackedByChoamPlotIntrigue(backedPlotFixture, "p2", backedByChoam.id, "emperor"),
    backedPlotFixture,
    "Backed by CHOAM Plot should reject Influence tracks the player cannot lose",
  );
  const backedWrongIntrigueFixture = {
    ...backedPlotFixture,
    players: backedPlotFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playBackedByChoamPlotIntrigue(backedWrongIntrigueFixture, "p2", mercenaries.id, "bene"),
    backedWrongIntrigueFixture,
    "Backed by CHOAM Plot should reject other Intrigue cards even when they are in hand",
  );
  const p2BaseInfluence = playerById(game, "p2").influence;
  const p2BaseVp = playerById(game, "p2").vp;
  const backedNoInfluence = {
    ...backedPlotFixture,
    players: backedPlotFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, influence: { ...p2BaseInfluence }, vp: p2BaseVp }
        : candidate,
    ),
  };
  assert.equal(
    state.playBackedByChoamPlotIntrigue(backedNoInfluence, "p2", backedByChoam.id, "bene"),
    backedNoInfluence,
    "Backed by CHOAM Plot should require at least one positive Influence track",
  );
  const playablePlotAgentDone = state.maybeStartCombatPhase({
    ...backedPlotFixture,
    agentTurnComplete: true,
  });
  assert.equal(
    playablePlotAgentDone.activeSeat,
    backedPlotFixture.activeSeat,
    "Agent turn should not auto-end while a Plot Intrigue is playable",
  );
  const unplayablePlotAgentDone = state.maybeStartCombatPhase({
    ...backedNoInfluence,
    agentTurnComplete: true,
  });
  assert.equal(
    unplayablePlotAgentDone.activeSeat,
    backedNoInfluence.activeSeat,
    "Agent turn should not auto-end when held Intrigues have no playable Plot action",
  );
  const commanderForExhaustedAllyPlot = playerById(game, "p4");
  const exhaustedAllyIds = game.players
    .filter((candidate) => candidate.team === commanderForExhaustedAllyPlot.team && candidate.role === "Ally")
    .map((candidate) => candidate.id);
  assert.equal(exhaustedAllyIds.length, 2, "Verifier needs both Commander Allies");
  const exhaustedAllyPlotFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === commanderForExhaustedAllyPlot.id),
    agentTurnComplete: true,
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === commanderForExhaustedAllyPlot.id
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 3 },
            commanderActivatedAllyIds: exhaustedAllyIds,
            intrigues: [mercenaries],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(exhaustedAllyPlotFixture, commanderForExhaustedAllyPlot.id, mercenaries.id),
    exhaustedAllyPlotFixture,
    "Commander Plot Intrigues that require an activated Ally should reject already activated Allies",
  );
  const exhaustedAllyPlotAutoEnd = state.maybeStartCombatPhase(exhaustedAllyPlotFixture);
  assert.equal(
    exhaustedAllyPlotAutoEnd.activeSeat,
    exhaustedAllyPlotFixture.activeSeat,
    "Agent turn should not auto-end when a Commander's only held Plot Intrigue has no legal Ally target",
  );
  const commanderBackedPlot = {
    ...backedPlotFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) =>
      candidate.id === "p4"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 0 },
            influence: { ...candidate.influence, emperor: 2 },
            vp: candidate.vp + 1,
            intrigues: [backedByChoam],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  const commanderBackedPlotted = state.playBackedByChoamPlotIntrigue(
    commanderBackedPlot,
    "p4",
    backedByChoam.id,
    "emperor",
  );
  assert.equal(playerById(commanderBackedPlotted, "p4").resources.solari, 4, "Commander Backed by CHOAM Plot should gain Solari for the Commander");
  assert.equal(playerById(commanderBackedPlotted, "p4").influence.emperor, 1, "Commander Backed by CHOAM Plot should spend the Commander's own Influence");
  assert.equal(playerById(commanderBackedPlotted, "p4").vp, playerById(commanderBackedPlot, "p4").vp - 1);
  const pendingBackedPlot = {
    ...backedPlotFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playBackedByChoamPlotIntrigue(pendingBackedPlot, "p2", backedByChoam.id, "bene"),
    pendingBackedPlot,
    "Backed by CHOAM Plot should wait for pending actions to resolve",
  );
  const queuedBackedPlot = {
    ...backedPlotFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playBackedByChoamPlotIntrigue(queuedBackedPlot, "p2", backedByChoam.id, "bene"),
    queuedBackedPlot,
    "Backed by CHOAM Plot should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playBackedByChoamPlotIntrigue(backedPlotFixture, "p3", backedByChoam.id, "bene"),
    backedPlotFixture,
    "Only the active player should play Backed by CHOAM as a Plot Intrigue",
  );

  const detonationFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    shieldWall: true,
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, garrison: 5, conflict: 0, deployedTroops: 0, intrigues: [detonation] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(state.isDetonationIntrigue(detonation), true, "Detonation should be recognized as a structured Plot Intrigue");
  const wallRemoved = state.playDetonationIntrigue(detonationFixture, "p2", detonation.id, "shield-wall");
  assert.equal(wallRemoved.shieldWall, false, "Detonation should remove the Shield Wall");
  assert.deepEqual(playerById(wallRemoved, "p2").intrigues, []);
  assert.equal(wallRemoved.intrigueDiscard.at(-1).id, detonation.id, "Played Detonation should enter the Intrigue discard");
  assert.equal(wallRemoved.pendingAction, undefined, "Shield Wall Detonation should resolve immediately");
  assert.match(wallRemoved.log[0], /plays Detonation and removes the Shield Wall/);

  const wallAlreadyRemoved = { ...detonationFixture, shieldWall: false };
  assert.equal(
    state.playDetonationIntrigue(wallAlreadyRemoved, "p2", detonation.id, "shield-wall"),
    wallAlreadyRemoved,
    "Detonation should not be discarded for a no-op Shield Wall branch",
  );

  const deployQueued = state.playDetonationIntrigue(detonationFixture, "p2", detonation.id, "deploy");
  assert.deepEqual(
    deployQueued.pendingAction,
    { kind: "deploy", ownerId: "p2", remaining: 4, source: "Detonation" },
    "Detonation should queue up to four troop deployments",
  );
  assert.equal(playerById(deployQueued, "p2").garrison, 5, "Queued Detonation should not deploy before the player chooses");
  assert.deepEqual(playerById(deployQueued, "p2").intrigues, []);
  assert.equal(deployQueued.intrigueDiscard.at(-1).id, detonation.id);
  assert.match(deployQueued.log[0], /may deploy up to 4 troops/);
  const detonationDeploy = state.deployTroopToConflict(deployQueued, deployQueued.pendingAction);
  assert.equal(playerById(detonationDeploy, "p2").garrison, 4, "Detonation deployment should spend a garrison troop");
  assert.equal(playerById(detonationDeploy, "p2").conflict, 2, "Detonation deployment should add troop strength");
  assert.equal(playerById(detonationDeploy, "p2").deployedTroops, 1);
  assert.deepEqual(
    detonationDeploy.pendingAction,
    { kind: "deploy", ownerId: "p2", remaining: 3, source: "Detonation" },
  );

  const commanderDetonation = {
    ...detonationFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) =>
      candidate.id === "p4"
        ? { ...candidate, intrigues: [detonation] }
        : candidate.id === "p6"
          ? { ...candidate, garrison: 3, conflict: 0, deployedTroops: 0, intrigues: [] }
          : { ...candidate, intrigues: [] },
    ),
  };
  const commanderDeployQueued = state.playDetonationIntrigue(commanderDetonation, "p4", detonation.id, "deploy", "p6");
  assert.deepEqual(
    commanderDeployQueued.pendingAction,
    { kind: "deploy", ownerId: "p6", remaining: 3, source: "Detonation" },
    "Commander Detonation deployments should queue for the selected activated Ally",
  );
  assert.equal(commanderDeployQueued.intrigueDiscard.at(-1).id, detonation.id);
  assert.match(commanderDeployQueued.log[0], /Shaddam Corrino IV plays Detonation for Princess Irulan/);

  const lockedCommanderDetonation = {
    ...commanderDetonation,
    players: commanderDetonation.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [detonation],
        };
      }
      if (candidate.id === "p2") return { ...candidate, garrison: 3, conflict: 0, deployedTroops: 0 };
      if (candidate.id === "p6") return { ...candidate, garrison: 3, conflict: 0, deployedTroops: 0 };
      return candidate;
    }),
  };
  const lockedCommanderDeployQueued = state.playDetonationIntrigue(
    lockedCommanderDetonation,
    "p4",
    detonation.id,
    "deploy",
  );
  assert.deepEqual(
    lockedCommanderDeployQueued.pendingAction,
    { kind: "deploy", ownerId: "p6", remaining: 3, source: "Detonation" },
    "Revealed Commander Detonation should default deployments to the locked Reveal Ally",
  );
  assert.equal(
    state.playDetonationIntrigue(lockedCommanderDetonation, "p4", detonation.id, "deploy", "p2"),
    lockedCommanderDetonation,
    "Revealed Commander Detonation should reject a same-team Ally who was not activated for Reveal",
  );

  const zeroTroopDetonation = {
    ...detonationFixture,
    players: detonationFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, garrison: 0 } : candidate,
    ),
  };
  const zeroTroops = state.playDetonationIntrigue(zeroTroopDetonation, "p2", detonation.id, "deploy");
  assert.equal(zeroTroops.pendingAction, undefined, "A zero-troop Detonation deployment should resolve without a queue");
  assert.equal(zeroTroops.intrigueDiscard.at(-1).id, detonation.id);
  assert.match(zeroTroops.log[0], /deploys no troops/);

  const pendingDetonation = {
    ...detonationFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playDetonationIntrigue(pendingDetonation, "p2", detonation.id, "deploy"),
    pendingDetonation,
    "Detonation should wait for pending actions to resolve",
  );
  const queuedDetonation = {
    ...detonationFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playDetonationIntrigue(queuedDetonation, "p2", detonation.id, "deploy"),
    queuedDetonation,
    "Detonation should wait for queued pending actions to resolve",
  );

  const nonProtectedConflict = conflictByName(data, "CHOAM Security");
  const protectedConflict = conflictByName(data, "Battle For Arrakeen");
  const unexpectedAlliesFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p3"),
    conflict: nonProtectedConflict,
    shieldWall: true,
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((candidate) =>
      candidate.id === "p3"
        ? {
            ...candidate,
            makerHooks: false,
            resources: { ...candidate.resources, water: 2 },
            conflict: 0,
            deployedSandworms: 0,
            intrigues: [unexpectedAllies],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isUnexpectedAlliesIntrigue(unexpectedAllies),
    true,
    "Unexpected Allies should be recognized as a structured Plot Intrigue",
  );
  assert.equal(
    state.playUnexpectedAlliesIntrigue(unexpectedAlliesFixture, "p3", unexpectedAllies.id, false),
    unexpectedAlliesFixture,
    "Unexpected Allies should reject the obsolete summon-only branch",
  );
  const wormSummoned = state.playUnexpectedAlliesIntrigue(
    unexpectedAlliesFixture,
    "p3",
    unexpectedAllies.id,
    true,
  );
  assert.equal(playerById(wormSummoned, "p3").resources.water, 0, "Unexpected Allies should cost 2 water");
  assert.equal(
    playerById(wormSummoned, "p3").makerHooks,
    false,
    "Unexpected Allies should not require Maker Hooks",
  );
  assert.equal(playerById(wormSummoned, "p3").deployedSandworms, 1, "Unexpected Allies should deploy a sandworm");
  assert.equal(playerById(wormSummoned, "p3").conflict, 3, "Unexpected Allies sandworms should add 3 strength");
  assert.equal(wormSummoned.turnUnitDeployments.p3, 1, "Unexpected Allies should track the sandworm as a unit deployed this turn");
  assert.equal(wormSummoned.shieldWall, false, "Unexpected Allies should remove the Shield Wall as part of its printed effect");
  assert.deepEqual(playerById(wormSummoned, "p3").intrigues, []);
  assert.equal(wormSummoned.intrigueDiscard.at(-1).id, unexpectedAllies.id);
  assert.match(wormSummoned.log[0], /plays Unexpected Allies, spends 2 water, removes the Shield Wall, and summons 1 sandworm/);

  const protectedUnexpectedAllies = { ...unexpectedAlliesFixture, conflict: protectedConflict };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(protectedUnexpectedAllies, "p3", unexpectedAllies.id, false),
    protectedUnexpectedAllies,
    "Unexpected Allies should not summon through a standing Shield Wall on a protected Conflict",
  );
  const protectedWallRemoved = state.playUnexpectedAlliesIntrigue(
    protectedUnexpectedAllies,
    "p3",
    unexpectedAllies.id,
    true,
  );
  assert.equal(protectedWallRemoved.shieldWall, false, "Unexpected Allies should remove the Shield Wall when chosen");
  assert.equal(playerById(protectedWallRemoved, "p3").deployedSandworms, 1);
  assert.match(protectedWallRemoved.log[0], /spends 2 water, removes the Shield Wall, and summons 1 sandworm/);

  const commanderUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) =>
      candidate.id === "p4"
        ? { ...candidate, resources: { ...candidate.resources, water: 2 }, intrigues: [unexpectedAllies] }
        : candidate.id === "p6"
          ? { ...candidate, conflict: 0, deployedSandworms: 0, intrigues: [] }
          : { ...candidate, intrigues: [] },
    ),
  };
  const commanderSummoned = state.playUnexpectedAlliesIntrigue(
    commanderUnexpectedAllies,
    "p4",
    unexpectedAllies.id,
    true,
    "p6",
  );
  assert.equal(playerById(commanderSummoned, "p4").resources.water, 0, "Commander should pay for Unexpected Allies");
  assert.equal(playerById(commanderSummoned, "p4").deployedSandworms, 0, "Commander should not receive the sandworm");
  assert.equal(playerById(commanderSummoned, "p6").deployedSandworms, 1, "Selected activated Ally should receive the sandworm");
  assert.equal(playerById(commanderSummoned, "p6").conflict, 3);
  assert.match(commanderSummoned.log[0], /Shaddam Corrino IV plays Unexpected Allies for Princess Irulan/);

  const lockedCommanderUnexpectedAllies = {
    ...commanderUnexpectedAllies,
    players: commanderUnexpectedAllies.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          resources: { ...candidate.resources, water: 2 },
          intrigues: [unexpectedAllies],
        };
      }
      if (candidate.id === "p2") return { ...candidate, conflict: 0, deployedSandworms: 0 };
      if (candidate.id === "p6") return { ...candidate, conflict: 0, deployedSandworms: 0 };
      return candidate;
    }),
  };
  const lockedCommanderSummoned = state.playUnexpectedAlliesIntrigue(
    lockedCommanderUnexpectedAllies,
    "p4",
    unexpectedAllies.id,
    true,
  );
  assert.equal(
    playerById(lockedCommanderSummoned, "p6").deployedSandworms,
    1,
    "Revealed Commander Unexpected Allies should default the sandworm to the locked Reveal Ally",
  );
  assert.equal(
    playerById(lockedCommanderSummoned, "p2").deployedSandworms,
    0,
    "Revealed Commander Unexpected Allies should not use another same-team Ally",
  );
  assert.equal(
    state.playUnexpectedAlliesIntrigue(lockedCommanderUnexpectedAllies, "p4", unexpectedAllies.id, true, "p2"),
    lockedCommanderUnexpectedAllies,
    "Revealed Commander Unexpected Allies should reject a same-team Ally who was not activated for Reveal",
  );

  const dryUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    players: unexpectedAlliesFixture.players.map((candidate) =>
      candidate.id === "p3"
        ? { ...candidate, resources: { ...candidate.resources, water: 1 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(dryUnexpectedAllies, "p3", unexpectedAllies.id, true),
    dryUnexpectedAllies,
    "Unexpected Allies should require 2 water",
  );

  const pendingUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    pendingAction: { kind: "spy", ownerId: "p3", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(pendingUnexpectedAllies, "p3", unexpectedAllies.id, true),
    pendingUnexpectedAllies,
    "Unexpected Allies should wait for pending actions to resolve",
  );
  const queuedUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p3", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(queuedUnexpectedAllies, "p3", unexpectedAllies.id, true),
    queuedUnexpectedAllies,
    "Unexpected Allies should wait for queued pending actions to resolve",
  );

  for (const space of data.boardSpaces.filter((candidate) => candidate.gain?.intrigue)) {
    const source = game.players.find((candidate) => candidate.id === "p2");
    assert.ok(source, "Initial game should include p2");
    const result = state.applyBoardEffect(source, source, space);
    assert.equal(
      Object.hasOwn(result.source.resources, "intrigue"),
      false,
      `${space.name} should not write Intrigue into resource counters`,
    );
  }

  console.log("intrigue verification passed");
} finally {
  await server.close();
}
