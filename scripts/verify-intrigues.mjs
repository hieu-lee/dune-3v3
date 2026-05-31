import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

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
  }
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.battleIcon)
      .map((card) => [card.name, card.battleIcon])
      .sort(),
    [
      ["Crysknife", "crysknife"],
      ["Desert Mouse", "desertMouse"],
      ["Ornitopter", "ornithopter"],
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

  const crysknife = data.intrigueCards.find((card) => card.sourceId === 159);
  const strategicStockpiling = data.intrigueCards.find((card) => card.sourceId === 130);
  const detonation = data.intrigueCards.find((card) => card.sourceId === 131);
  const departForArrakis = data.intrigueCards.find((card) => card.sourceId === 132);
  const unexpectedAllies = data.intrigueCards.find((card) => card.sourceId === 137);
  const callToArms = data.intrigueCards.find((card) => card.sourceId === 138);
  const shaddamsFavor = data.intrigueCards.find((card) => card.sourceId === 141);
  const intelligenceReport = data.intrigueCards.find((card) => card.sourceId === 142);
  const cunning = data.intrigueCards.find((card) => card.sourceId === 133);
  const sietchRitual = data.intrigueCards.find((card) => card.sourceId === 127);
  const opportunism = data.intrigueCards.find((card) => card.sourceId === 134);
  const buyAccess = data.intrigueCards.find((card) => card.sourceId === 139);
  const imperiumPolitics = data.intrigueCards.find((card) => card.sourceId === 140);
  const councilorsAmbition = data.intrigueCards.find((card) => card.sourceId === 129);
  const marketOpportunity = data.intrigueCards.find((card) => card.sourceId === 145);
  const contingencyPlan = data.intrigueCards.find((card) => card.sourceId === 147);
  const findWeakness = data.intrigueCards.find((card) => card.sourceId === 149);
  const goToGround = data.intrigueCards.find((card) => card.sourceId === 146);
  const questionableMethods = data.intrigueCards.find((card) => card.sourceId === 156);
  const springTheTrap = data.intrigueCards.find((card) => card.sourceId === 153);
  const devour = data.intrigueCards.find((card) => card.sourceId === 151);
  const backedByChoam = data.intrigueCards.find((card) => card.sourceId === 448);
  const mercenaries = data.intrigueCards.find((card) => card.sourceId === 128);
  assert.ok(crysknife, "Crysknife Intrigue should be available");
  assert.ok(strategicStockpiling, "Strategic Stockpiling Intrigue should be available");
  assert.ok(detonation, "Detonation Intrigue should be available");
  assert.ok(departForArrakis, "Depart For Arrakis Intrigue should be available");
  assert.ok(unexpectedAllies, "Unexpected Allies Intrigue should be available");
  assert.ok(callToArms, "Call to Arms Intrigue should be available");
  assert.ok(shaddamsFavor, "Shaddam's Favor Intrigue should be available");
  assert.ok(intelligenceReport, "Intelligence Report Intrigue should be available");
  assert.ok(cunning, "Cunning Intrigue should be available");
  assert.ok(sietchRitual, "Sietch Ritual Intrigue should be available");
  assert.ok(opportunism, "Opportunism Intrigue should be available");
  assert.ok(buyAccess, "Buy Access Intrigue should be available");
  assert.ok(imperiumPolitics, "Imperium Politics Intrigue should be available");
  assert.ok(councilorsAmbition, "Councilor's Ambition Intrigue should be available");
  assert.ok(marketOpportunity, "Market Opportunity Intrigue should be available");
  assert.ok(contingencyPlan, "Contingency Plan Intrigue should be available");
  assert.ok(findWeakness, "Find Weakness Intrigue should be available");
  assert.ok(goToGround, "Go To Ground Intrigue should be available");
  assert.ok(questionableMethods, "Questionable Methods Intrigue should be available");
  assert.ok(springTheTrap, "Spring The Trap Intrigue should be available");
  assert.ok(devour, "Devour Intrigue should be available");
  assert.ok(backedByChoam, "Backed by CHOAM Intrigue should be available");
  assert.ok(mercenaries, "Mercenaries Intrigue should be available");
  assert.equal(
    strategicStockpiling.summary,
    "Spend 5 spice to gain 1 VP; with 3+ Spacing Guild Influence, you may also spend 3 water to gain 1 VP.",
    "Strategic Stockpiling should expose both VP conversion branches",
  );
  assert.equal(
    detonation.summary,
    "Remove the Shield Wall OR deploy up to four troops from your garrison to the Conflict.",
    "Detonation should expose its printed Plot choice instead of a generic imported-image summary",
  );
  assert.equal(
    departForArrakis.summary,
    "Spend 2 spice to recruit 3 troops; with 3+ Fremen/Fringe Influence, draw 1 card.",
    "Depart For Arrakis should expose its spice troop cost and conditional card draw",
  );
  assert.equal(
    unexpectedAllies.summary,
    "Pay 2 water to deploy a sandworm to the Conflict; may remove the Shield Wall.",
    "Unexpected Allies should expose its water, detonation, and sandworm effect",
  );
  assert.equal(
    callToArms.summary,
    "During your Reveal turn this round, whenever you acquire a card, recruit 1 troop.",
    "Call to Arms should expose its reveal-turn acquisition trigger",
  );
  assert.equal(
    councilorsAmbition.summary,
    "If you have a seat on the High Council, gain 2 water.",
    "Councilor's Ambition should expose its High Council requirement",
  );
  assert.equal(
    shaddamsFavor.summary,
    "Recruit 1 troop; with 3+ Emperor/Great Houses Influence, gain 3 Solari.",
    "Shaddam's Favor should expose its recruit and conditional Solari effects",
  );
  assert.equal(
    intelligenceReport.summary,
    "Draw 1 card; draw 1 more if you have two or more spies on the board.",
    "Intelligence Report should expose its conditional card draw",
  );
  assert.equal(
    cunning.summary,
    "Draw 1 card OR spend 1 spice to draw 1 card and trash 1 card.",
    "Cunning should expose both Plot branches",
  );
  assert.equal(
    sietchRitual.summary,
    "Discard a card to gain 1 Bene Gesserit or Fremen/Fringe Influence.",
    "Sietch Ritual should expose its discard-for-Influence choice",
  );
  assert.equal(
    opportunism.summary,
    "Spend 2 Solari and lose 2 Influence to gain 1 VP.",
    "Opportunism should expose its Solari and Influence costs for 1 VP",
  );
  assert.equal(
    buyAccess.summary,
    "Spend 5 Solari to gain two different Influence among Emperor/Great Houses, Fremen/Fringe, Bene Gesserit, and Spacing Guild.",
    "Buy Access should expose its Solari-for-two-Influence choice",
  );
  assert.equal(
    imperiumPolitics.summary,
    "Spend 1 Solari to gain 1 Emperor/Great Houses or Spacing Guild Influence.",
    "Imperium Politics should expose its Solari-for-Influence choice",
  );
  assert.equal(
    marketOpportunity.summary,
    "Spend 2 spice to gain 5 Solari OR spend 5 Solari to gain 5 spice.",
    "Market Opportunity should expose both resource exchange branches",
  );
  assert.equal(
    contingencyPlan.summary,
    "Gain 2 Solari as a Plot Intrigue OR add 3 strength as a Combat Intrigue.",
    "Contingency Plan should expose both printed timing branches",
  );
  assert.equal(
    findWeakness.summary,
    "Add 2 strength; you may recall 1 spy to add 3 more strength.",
    "Find Weakness should expose its base strength and optional spy recall",
  );
  assert.equal(
    goToGround.summary,
    "Retreat 1 or 2 troops, then optionally place a spy.",
    "Go To Ground should expose its troop retreat and spy placement effect",
  );
  assert.equal(
    questionableMethods.summary,
    "Add 1 strength; the recipient may lose 1 Influence, or a Commander may lose personal Influence, to add 4 more strength.",
    "Questionable Methods should expose its base strength and optional Influence loss",
  );
  assert.equal(
    springTheTrap.summary,
    "Recall 2 spies to add 7 strength.",
    "Spring The Trap should expose its two-spy cost and Combat strength",
  );
  assert.equal(
    devour.summary,
    "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
    "Devour should expose its sandworm threshold and optional trash effect",
  );
  assert.equal(
    backedByChoam.summary,
    "Lose 1 Influence to gain 4 Solari as a Plot Intrigue OR add 4 strength in Combat if you have completed at least two contracts.",
    "Backed by CHOAM should expose its Plot branch and completed-contract Combat threshold",
  );
  assert.equal(
    mercenaries.summary,
    "Spend 3 Solari to draw 1 Intrigue and recruit 2 troops.",
    "Mercenaries should expose its Solari cost, Intrigue draw, and troop recruit",
  );
  const plotFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [crysknife, mercenaries] }
        : { ...candidate, intrigues: [] },
    ),
  };
  const playedPlot = state.playPlotBattleIconIntrigue(plotFixture, "p2", crysknife.id);
  assert.equal(playerById(playedPlot, "p2").vp, playerById(plotFixture, "p2").vp, "Plot battle-icon Intrigues should not score VP");
  assert.equal(playerById(playedPlot, "p2").resources.spice, playerById(plotFixture, "p2").resources.spice + 1, "Plot battle-icon Intrigues should gain 1 spice");
  assert.deepEqual(playerById(playedPlot, "p2").intrigues.map((card) => card.id), [mercenaries.id]);
  assert.equal(playedPlot.intrigueDiscard.at(-1).id, crysknife.id, "Played Plot Intrigue should go to discard");
  assert.match(playedPlot.log[0], /plays Crysknife as a Plot Intrigue for 1 spice/);

  const pendingPlot = {
    ...plotFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playPlotBattleIconIntrigue(pendingPlot, "p2", crysknife.id),
    pendingPlot,
    "Plot Intrigues should wait for pending actions to resolve",
  );
  const queuedPlot = {
    ...plotFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playPlotBattleIconIntrigue(queuedPlot, "p2", crysknife.id),
    queuedPlot,
    "Plot Intrigues should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p3", crysknife.id),
    plotFixture,
    "Only the active player should play Plot Intrigues",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p2", mercenaries.id),
    plotFixture,
    "Non-battle-icon Intrigues should not use the Plot battle-icon scorer",
  );

  const contingencyFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 1 }, intrigues: [contingencyPlan] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isContingencyPlanIntrigue(contingencyPlan),
    true,
    "Contingency Plan should be recognized as a structured Plot Intrigue",
  );
  const contingencyPlotted = state.playContingencyPlanPlotIntrigue(
    contingencyFixture,
    "p2",
    contingencyPlan.id,
  );
  assert.equal(playerById(contingencyPlotted, "p2").resources.solari, 3, "Contingency Plan Plot should gain 2 Solari");
  assert.deepEqual(playerById(contingencyPlotted, "p2").intrigues, []);
  assert.equal(contingencyPlotted.intrigueDiscard.at(-1).id, contingencyPlan.id);
  assert.match(contingencyPlotted.log[0], /plays Contingency Plan as a Plot Intrigue for 2 Solari/);
  const pendingContingency = {
    ...contingencyFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playContingencyPlanPlotIntrigue(pendingContingency, "p2", contingencyPlan.id),
    pendingContingency,
    "Contingency Plan should wait for pending actions to resolve",
  );
  const queuedContingency = {
    ...contingencyFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playContingencyPlanPlotIntrigue(queuedContingency, "p2", contingencyPlan.id),
    queuedContingency,
    "Contingency Plan should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playContingencyPlanPlotIntrigue(contingencyFixture, "p3", contingencyPlan.id),
    contingencyFixture,
    "Only the active player should play Contingency Plan as a Plot Intrigue",
  );

  const [firstSpySpace, secondSpySpace, opposingSpySpace] = data.boardSpaces.map((space) => space.id);
  assert.ok(firstSpySpace && secondSpySpace && opposingSpySpace, "Expected at least three board spaces for spy fixtures");
  const intelligenceFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    spyPosts: { [firstSpySpace]: "p2", [secondSpySpace]: "p3" },
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, hand: [], deck: candidate.deck.slice(0, 3), discard: [], intrigues: [intelligenceReport] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isIntelligenceReportIntrigue(intelligenceReport),
    true,
    "Intelligence Report should be recognized as a structured Plot Intrigue",
  );
  const intelligenceOne = state.playIntelligenceReportPlotIntrigue(
    intelligenceFixture,
    "p2",
    intelligenceReport.id,
  );
  assert.equal(playerById(intelligenceOne, "p2").hand.length, 1, "Intelligence Report should draw 1 card without two own spies");
  assert.equal(playerById(intelligenceOne, "p2").deck.length, 2, "Intelligence Report should consume the drawn card from deck");
  assert.deepEqual(playerById(intelligenceOne, "p2").intrigues, []);
  assert.equal(intelligenceOne.intrigueDiscard.at(-1).id, intelligenceReport.id);
  assert.match(intelligenceOne.log[0], /plays Intelligence Report as a Plot Intrigue and draws 1 card/);
  const intelligenceTwoFixture = {
    ...intelligenceFixture,
    spyPosts: { [firstSpySpace]: "p2", [secondSpySpace]: "p2", [opposingSpySpace]: "p3" },
    players: intelligenceFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, hand: [], deck: playerById(game, "p2").deck.slice(0, 3), discard: [], intrigues: [intelligenceReport] }
        : candidate,
    ),
  };
  const intelligenceTwo = state.playIntelligenceReportPlotIntrigue(
    intelligenceTwoFixture,
    "p2",
    intelligenceReport.id,
  );
  assert.equal(playerById(intelligenceTwo, "p2").hand.length, 2, "Intelligence Report should draw 2 cards with two own spies");
  assert.equal(playerById(intelligenceTwo, "p2").deck.length, 1);
  assert.match(intelligenceTwo.log[0], /draws 2 cards/);
  const pendingIntelligence = {
    ...intelligenceFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(pendingIntelligence, "p2", intelligenceReport.id),
    pendingIntelligence,
    "Intelligence Report should wait for pending actions to resolve",
  );
  const queuedIntelligence = {
    ...intelligenceFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(queuedIntelligence, "p2", intelligenceReport.id),
    queuedIntelligence,
    "Intelligence Report should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(intelligenceFixture, "p3", intelligenceReport.id),
    intelligenceFixture,
    "Only the active player should play Intelligence Report as a Plot Intrigue",
  );
  const intelligenceWrongCardFixture = {
    ...intelligenceFixture,
    players: intelligenceFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playIntelligenceReportPlotIntrigue(intelligenceWrongCardFixture, "p2", mercenaries.id),
    intelligenceWrongCardFixture,
    "Intelligence Report should reject other Intrigue cards",
  );

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

  const cunningFixture = {
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
            hand: [],
            deck: candidate.deck.slice(0, 3),
            discard: [],
            playArea: [],
            intrigues: [cunning],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isCunningIntrigue(cunning),
    true,
    "Cunning should be recognized as a structured Plot Intrigue",
  );
  const cunningDrawn = state.playCunningPlotIntrigue(cunningFixture, "p2", cunning.id, "draw");
  assert.equal(playerById(cunningDrawn, "p2").hand.length, 1, "Cunning free branch should draw 1 card");
  assert.equal(playerById(cunningDrawn, "p2").resources.spice, 2, "Cunning free branch should not spend spice");
  assert.deepEqual(playerById(cunningDrawn, "p2").intrigues, []);
  assert.equal(cunningDrawn.pendingAction, undefined, "Cunning free branch should not queue a trash choice");
  assert.equal(cunningDrawn.intrigueDiscard.at(-1).id, cunning.id);
  assert.match(cunningDrawn.log[0], /plays Cunning and draws 1 card/);
  const cunningPaid = state.playCunningPlotIntrigue(cunningFixture, "p2", cunning.id, "paid-trash");
  assert.equal(playerById(cunningPaid, "p2").hand.length, 1, "Cunning paid branch should draw before trashing");
  assert.equal(playerById(cunningPaid, "p2").resources.spice, 1, "Cunning paid branch should spend 1 spice");
  assert.deepEqual(cunningPaid.pendingAction, {
    kind: "trash-card",
    ownerId: "p2",
    source: "Cunning",
    optional: false,
  });
  assert.equal(cunningPaid.intrigueDiscard.at(-1).id, cunning.id);
  assert.match(cunningPaid.log[0], /spends 1 spice, draws 1 card, and must trash 1 card/);
  assert.equal(
    state.skipTrashCard(cunningPaid, cunningPaid.pendingAction),
    cunningPaid,
    "Cunning's paid branch should require the trash",
  );
  const cunningTrashChoice = playerById(cunningPaid, "p2").hand[0];
  const cunningTrashed = state.trashPlayerCard(cunningPaid, cunningPaid.pendingAction, "hand", cunningTrashChoice.id);
  assert.equal(playerById(cunningTrashed, "p2").hand.length, 0, "Cunning trash should remove the selected card");
  assert.equal(cunningTrashed.pendingAction, undefined, "Cunning trash should clear the pending action");
  assert.match(cunningTrashed.log[0], /trashes .* from Cunning/);
  const poorCunning = {
    ...cunningFixture,
    players: cunningFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 0 }, intrigues: [cunning] }
        : candidate,
    ),
  };
  assert.equal(
    state.playCunningPlotIntrigue(poorCunning, "p2", cunning.id, "paid-trash"),
    poorCunning,
    "Cunning paid branch should require 1 spice",
  );
  const pendingCunning = {
    ...cunningFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playCunningPlotIntrigue(pendingCunning, "p2", cunning.id, "draw"),
    pendingCunning,
    "Cunning should wait for pending actions to resolve",
  );
  const queuedCunning = {
    ...cunningFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playCunningPlotIntrigue(queuedCunning, "p2", cunning.id, "draw"),
    queuedCunning,
    "Cunning should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playCunningPlotIntrigue(cunningFixture, "p3", cunning.id, "draw"),
    cunningFixture,
    "Only the active player should play Cunning as a Plot Intrigue",
  );
  assert.equal(
    state.playCunningPlotIntrigue(cunningFixture, "p2", mercenaries.id, "draw"),
    cunningFixture,
    "Cunning should reject other Intrigue cards",
  );
  const commanderCunningFixture = {
    ...cunningFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 1 },
          hand: [],
          deck: candidate.deck.slice(0, 2),
          discard: [],
          playArea: [],
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [cunning],
        };
      }
      if (candidate.id === "p6") return { ...candidate, hand: [], deck: candidate.deck.slice(0, 2), intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderCunning = state.playCunningPlotIntrigue(
    commanderCunningFixture,
    "p4",
    cunning.id,
    "paid-trash",
  );
  assert.equal(playerById(commanderCunning, "p4").resources.spice, 0, "Commander Cunning should spend Commander spice");
  assert.equal(playerById(commanderCunning, "p4").hand.length, 1, "Commander Cunning should draw for the Commander");
  assert.equal(playerById(commanderCunning, "p6").hand.length, 0, "Commander Cunning should not target the activated Ally");
  assert.equal(commanderCunning.pendingAction?.ownerId, "p4", "Commander Cunning should require the Commander to trash");

  const sietchDiscardCard = { ...data.allyStarterCards[0], id: "sietch-discard-card" };
  const sietchRitualFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            hand: [sietchDiscardCard],
            discard: [],
            influence: { ...candidate.influence, bene: 1, fringeWorlds: 1 },
            intrigues: [sietchRitual],
          }
        : { ...candidate, hand: [], discard: [], intrigues: [] },
    ),
  };
  assert.equal(
    state.isSietchRitualIntrigue(sietchRitual),
    true,
    "Sietch Ritual should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.sietchRitualFactionChoices(playerById(sietchRitualFixture, "p2")),
    ["bene", "fringeWorlds"],
    "Allies should map Sietch Ritual's Fremen icon to Fringe Worlds",
  );
  const sietchBene = state.playSietchRitualPlotIntrigue(
    sietchRitualFixture,
    "p2",
    sietchRitual.id,
    sietchDiscardCard.id,
    "bene",
  );
  assert.deepEqual(playerById(sietchBene, "p2").hand, [], "Sietch Ritual should discard the selected hand card");
  assert.equal(playerById(sietchBene, "p2").discard.at(-1).id, sietchDiscardCard.id);
  assert.equal(playerById(sietchBene, "p2").influence.bene, 2, "Sietch Ritual should gain chosen Bene Gesserit Influence");
  assert.equal(playerById(sietchBene, "p2").vp, playerById(sietchRitualFixture, "p2").vp + 1);
  assert.deepEqual(playerById(sietchBene, "p2").intrigues, []);
  assert.equal(sietchBene.intrigueDiscard.at(-1).id, sietchRitual.id);
  assert.match(sietchBene.log[0], /plays Sietch Ritual, discards .* and gains 1 Bene Gesserit Influence/);
  const sietchFringe = state.playSietchRitualPlotIntrigue(
    sietchRitualFixture,
    "p2",
    sietchRitual.id,
    sietchDiscardCard.id,
    "fringeWorlds",
  );
  assert.equal(playerById(sietchFringe, "p2").influence.fringeWorlds, 2, "Sietch Ritual should gain Fringe Worlds for an Ally's Fremen icon");
  assert.equal(
    state.playSietchRitualPlotIntrigue(sietchRitualFixture, "p2", sietchRitual.id, sietchDiscardCard.id, "fremen"),
    sietchRitualFixture,
    "Allies should not choose personal Fremen Influence from Sietch Ritual",
  );
  const emptyHandSietch = {
    ...sietchRitualFixture,
    players: sietchRitualFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, hand: [], intrigues: [sietchRitual] } : candidate,
    ),
  };
  assert.equal(
    state.playSietchRitualPlotIntrigue(emptyHandSietch, "p2", sietchRitual.id, sietchDiscardCard.id, "bene"),
    emptyHandSietch,
    "Sietch Ritual should require a hand card to discard",
  );
  assert.equal(
    state.playSietchRitualPlotIntrigue(sietchRitualFixture, "p2", mercenaries.id, sietchDiscardCard.id, "bene"),
    sietchRitualFixture,
    "Sietch Ritual should reject other Intrigue cards",
  );
  const pendingSietch = {
    ...sietchRitualFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playSietchRitualPlotIntrigue(pendingSietch, "p2", sietchRitual.id, sietchDiscardCard.id, "bene"),
    pendingSietch,
    "Sietch Ritual should wait for pending actions to resolve",
  );
  const queuedSietch = {
    ...sietchRitualFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playSietchRitualPlotIntrigue(queuedSietch, "p2", sietchRitual.id, sietchDiscardCard.id, "bene"),
    queuedSietch,
    "Sietch Ritual should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playSietchRitualPlotIntrigue(sietchRitualFixture, "p3", sietchRitual.id, sietchDiscardCard.id, "bene"),
    sietchRitualFixture,
    "Only the active player should play Sietch Ritual as a Plot Intrigue",
  );
  const combatSietch = { ...sietchRitualFixture, phase: "combat" };
  assert.equal(
    state.playSietchRitualPlotIntrigue(combatSietch, "p2", sietchRitual.id, sietchDiscardCard.id, "bene"),
    combatSietch,
    "Sietch Ritual should only resolve during normal play",
  );
  const commanderSietchFixture = {
    ...sietchRitualFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p1"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p1") {
        return {
          ...candidate,
          hand: [sietchDiscardCard],
          discard: [],
          influence: { ...candidate.influence, fremen: 1 },
          revealed: true,
          revealActivatedAllyId: "p5",
          intrigues: [sietchRitual],
        };
      }
      if (candidate.id === "p5") {
        return { ...candidate, hand: [], discard: [], influence: { ...candidate.influence, bene: 1, fringeWorlds: 1 }, intrigues: [] };
      }
      return { ...candidate, hand: [], discard: [], intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.sietchRitualFactionChoices(playerById(commanderSietchFixture, "p1")),
    ["bene", "fremen", "fringeWorlds"],
    "Muad'Dib should choose personal Fremen or activated-Ally main-board Influence",
  );
  const commanderSietchBene = state.playSietchRitualPlotIntrigue(
    commanderSietchFixture,
    "p1",
    sietchRitual.id,
    sietchDiscardCard.id,
    "bene",
    "p5",
  );
  assert.equal(playerById(commanderSietchBene, "p1").influence.bene, 0, "Commander Sietch Ritual should not gain main-board Bene directly");
  assert.equal(playerById(commanderSietchBene, "p5").influence.bene, 2, "Commander Sietch Ritual should give Bene to the activated Ally");
  assert.match(commanderSietchBene.log[0], /Lady Jessica gains 1 Bene Gesserit Influence/);
  const commanderSietchFremen = state.playSietchRitualPlotIntrigue(
    commanderSietchFixture,
    "p1",
    sietchRitual.id,
    sietchDiscardCard.id,
    "fremen",
  );
  assert.equal(playerById(commanderSietchFremen, "p1").influence.fremen, 2, "Muad'Dib should gain personal Fremen from Sietch Ritual");
  assert.equal(playerById(commanderSietchFremen, "p5").influence.fringeWorlds, 1, "Personal Fremen should not affect activated-Ally Fringe Worlds");
  const commanderSietchFringe = state.playSietchRitualPlotIntrigue(
    commanderSietchFixture,
    "p1",
    sietchRitual.id,
    sietchDiscardCard.id,
    "fringeWorlds",
    "p5",
  );
  assert.equal(playerById(commanderSietchFringe, "p5").influence.fringeWorlds, 2, "Muad'Dib should be able to route the printed Fremen icon to Fringe Worlds");
  assert.equal(
    state.playSietchRitualPlotIntrigue(commanderSietchFixture, "p1", sietchRitual.id, sietchDiscardCard.id, "bene", "p2"),
    commanderSietchFixture,
    "Commander Sietch Ritual should reject non-activated same-team Ally targets once reveal locks an Ally",
  );
  const shaddamSietchFixture = {
    ...commanderSietchFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          hand: [sietchDiscardCard],
          discard: [],
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [sietchRitual],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, hand: [], discard: [], influence: { ...candidate.influence, fringeWorlds: 1 }, intrigues: [] };
      }
      return { ...candidate, hand: [], discard: [], intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.sietchRitualFactionChoices(playerById(shaddamSietchFixture, "p4")),
    ["bene", "fringeWorlds"],
    "Shaddam should map Sietch Ritual's Fremen icon to activated-Ally Fringe Worlds",
  );
  const shaddamSietchFringe = state.playSietchRitualPlotIntrigue(
    shaddamSietchFixture,
    "p4",
    sietchRitual.id,
    sietchDiscardCard.id,
    "fringeWorlds",
    "p6",
  );
  assert.equal(playerById(shaddamSietchFringe, "p6").influence.fringeWorlds, 2);
  assert.equal(
    state.playSietchRitualPlotIntrigue(shaddamSietchFixture, "p4", sietchRitual.id, sietchDiscardCard.id, "fremen", "p6"),
    shaddamSietchFixture,
    "Shaddam should not choose personal Fremen Influence from Sietch Ritual",
  );

  const opportunismFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            vp: 3,
            resources: { ...candidate.resources, solari: 3 },
            influence: {
              emperor: 0,
              spacing: 1,
              bene: 2,
              fremen: 0,
              greatHouses: 0,
              fringeWorlds: 0,
            },
            intrigues: [opportunism],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isOpportunismIntrigue(opportunism),
    true,
    "Opportunism should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.influenceLossPairChoices(playerById(opportunismFixture, "p2")),
    [
      ["spacing", "bene"],
      ["bene", "bene"],
    ],
    "Opportunism should offer any payable two-Influence loss pair, including two of the same Faction",
  );
  const opportunismPlayed = state.playOpportunismPlotIntrigue(
    opportunismFixture,
    "p2",
    opportunism.id,
    ["spacing", "bene"],
  );
  assert.equal(playerById(opportunismPlayed, "p2").resources.solari, 1, "Opportunism should spend 2 Solari");
  assert.equal(playerById(opportunismPlayed, "p2").influence.spacing, 0, "Opportunism should lose chosen Spacing Guild Influence");
  assert.equal(playerById(opportunismPlayed, "p2").influence.bene, 1, "Opportunism should lose chosen Bene Gesserit Influence");
  assert.equal(
    playerById(opportunismPlayed, "p2").vp,
    playerById(opportunismFixture, "p2").vp,
    "Opportunism should add 1 VP after losing any threshold Influence VP",
  );
  assert.deepEqual(playerById(opportunismPlayed, "p2").intrigues, []);
  assert.equal(opportunismPlayed.intrigueDiscard.at(-1).id, opportunism.id);
  assert.match(opportunismPlayed.log[0], /plays Opportunism, spends 2 Solari, loses 1 Spacing Guild Influence and 1 Bene Gesserit Influence, and gains 1 VP/);
  const opportunismSameFaction = state.playOpportunismPlotIntrigue(
    opportunismFixture,
    "p2",
    opportunism.id,
    ["bene", "bene"],
  );
  assert.equal(playerById(opportunismSameFaction, "p2").influence.bene, 0, "Opportunism should allow losing two Influence from one Faction");
  assert.match(opportunismSameFaction.log[0], /loses 2 Bene Gesserit Influence/);
  const opportunismReversed = state.playOpportunismPlotIntrigue(
    opportunismFixture,
    "p2",
    opportunism.id,
    ["bene", "spacing"],
  );
  assert.equal(playerById(opportunismReversed, "p2").influence.spacing, 0, "Opportunism should accept unordered loss pairs");
  assert.equal(playerById(opportunismReversed, "p2").influence.bene, 1);
  const poorOpportunism = {
    ...opportunismFixture,
    players: opportunismFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 1 }, intrigues: [opportunism] }
        : candidate,
    ),
  };
  assert.equal(
    state.playOpportunismPlotIntrigue(poorOpportunism, "p2", opportunism.id, ["spacing", "bene"]),
    poorOpportunism,
    "Opportunism should require 2 Solari",
  );
  const shortInfluenceOpportunism = {
    ...opportunismFixture,
    players: opportunismFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            influence: {
              emperor: 0,
              spacing: 0,
              bene: 1,
              fremen: 0,
              greatHouses: 0,
              fringeWorlds: 0,
            },
            intrigues: [opportunism],
          }
        : candidate,
    ),
  };
  assert.deepEqual(
    state.influenceLossPairChoices(playerById(shortInfluenceOpportunism, "p2")),
    [],
    "Opportunism should not offer choices unless two Influence can be paid",
  );
  assert.equal(
    state.playOpportunismPlotIntrigue(shortInfluenceOpportunism, "p2", opportunism.id, ["bene", "bene"]),
    shortInfluenceOpportunism,
    "Opportunism should require actually losing both Influence",
  );
  assert.equal(
    state.playOpportunismPlotIntrigue(opportunismFixture, "p2", mercenaries.id, ["spacing", "bene"]),
    opportunismFixture,
    "Opportunism should reject other Intrigue cards",
  );
  assert.equal(
    state.playOpportunismPlotIntrigue(opportunismFixture, "p2", opportunism.id, ["spacing"]),
    opportunismFixture,
    "Opportunism should require exactly two Influence choices",
  );
  assert.equal(
    state.playOpportunismPlotIntrigue(opportunismFixture, "p2", opportunism.id, ["spacing", "bene", "bene"]),
    opportunismFixture,
    "Opportunism should reject more than two Influence choices",
  );
  const pendingOpportunism = {
    ...opportunismFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playOpportunismPlotIntrigue(pendingOpportunism, "p2", opportunism.id, ["spacing", "bene"]),
    pendingOpportunism,
    "Opportunism should wait for pending actions to resolve",
  );
  const queuedOpportunism = {
    ...opportunismFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playOpportunismPlotIntrigue(queuedOpportunism, "p2", opportunism.id, ["spacing", "bene"]),
    queuedOpportunism,
    "Opportunism should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playOpportunismPlotIntrigue(opportunismFixture, "p3", opportunism.id, ["spacing", "bene"]),
    opportunismFixture,
    "Only the active player should play Opportunism as a Plot Intrigue",
  );
  const combatOpportunism = { ...opportunismFixture, phase: "combat" };
  assert.equal(
    state.playOpportunismPlotIntrigue(combatOpportunism, "p2", opportunism.id, ["spacing", "bene"]),
    combatOpportunism,
    "Opportunism should only resolve during normal play",
  );

  const buyAccessFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 5 },
            influence: { ...candidate.influence, greatHouses: 1, fringeWorlds: 1, bene: 1, spacing: 1 },
            intrigues: [buyAccess],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isBuyAccessIntrigue(buyAccess),
    true,
    "Buy Access should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.buyAccessPairChoices(playerById(buyAccessFixture, "p2")),
    [
      ["greatHouses", "fringeWorlds"],
      ["greatHouses", "bene"],
      ["greatHouses", "spacing"],
      ["fringeWorlds", "bene"],
      ["fringeWorlds", "spacing"],
      ["bene", "spacing"],
    ],
    "Allies should choose two different printed Buy Access icons after six-player mapping",
  );
  const buyAccessGreatBene = state.playBuyAccessPlotIntrigue(
    buyAccessFixture,
    "p2",
    buyAccess.id,
    ["greatHouses", "bene"],
  );
  assert.equal(playerById(buyAccessGreatBene, "p2").resources.solari, 0, "Buy Access should spend 5 Solari");
  assert.equal(playerById(buyAccessGreatBene, "p2").influence.greatHouses, 2, "Buy Access should gain Great Houses Influence");
  assert.equal(playerById(buyAccessGreatBene, "p2").influence.bene, 2, "Buy Access should gain Bene Gesserit Influence");
  assert.equal(playerById(buyAccessGreatBene, "p2").vp, playerById(buyAccessFixture, "p2").vp + 2);
  assert.deepEqual(playerById(buyAccessGreatBene, "p2").intrigues, []);
  assert.equal(buyAccessGreatBene.intrigueDiscard.at(-1).id, buyAccess.id);
  assert.match(buyAccessGreatBene.log[0], /Buy Access, spends 5 Solari, and gains 1 Great Houses Influence and 1 Bene Gesserit Influence/);
  const buyAccessReversed = state.playBuyAccessPlotIntrigue(
    buyAccessFixture,
    "p2",
    buyAccess.id,
    ["spacing", "greatHouses"],
  );
  assert.equal(playerById(buyAccessReversed, "p2").influence.spacing, 2, "Buy Access should accept unordered pairs");
  assert.equal(playerById(buyAccessReversed, "p2").influence.greatHouses, 2);
  const poorBuyAccess = {
    ...buyAccessFixture,
    players: buyAccessFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 4 }, intrigues: [buyAccess] }
        : candidate,
    ),
  };
  assert.equal(
    state.playBuyAccessPlotIntrigue(poorBuyAccess, "p2", buyAccess.id, ["greatHouses", "bene"]),
    poorBuyAccess,
    "Buy Access should require 5 Solari",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p2", mercenaries.id, ["greatHouses", "bene"]),
    buyAccessFixture,
    "Buy Access should reject other Intrigue cards",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p2", buyAccess.id, ["greatHouses", "greatHouses"]),
    buyAccessFixture,
    "Buy Access should reject duplicate mapped choices",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p2", buyAccess.id, ["greatHouses"]),
    buyAccessFixture,
    "Buy Access should require exactly two choices",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p2", buyAccess.id, ["greatHouses", "bene", "spacing"]),
    buyAccessFixture,
    "Buy Access should reject more than two choices",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p2", buyAccess.id, ["emperor", "bene"]),
    buyAccessFixture,
    "Allies should not choose personal Emperor Influence from Buy Access",
  );
  const pendingBuyAccess = {
    ...buyAccessFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playBuyAccessPlotIntrigue(pendingBuyAccess, "p2", buyAccess.id, ["greatHouses", "bene"]),
    pendingBuyAccess,
    "Buy Access should wait for pending actions to resolve",
  );
  const queuedBuyAccess = {
    ...buyAccessFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playBuyAccessPlotIntrigue(queuedBuyAccess, "p2", buyAccess.id, ["greatHouses", "bene"]),
    queuedBuyAccess,
    "Buy Access should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(buyAccessFixture, "p3", buyAccess.id, ["greatHouses", "bene"]),
    buyAccessFixture,
    "Only the active player should play Buy Access",
  );
  const combatBuyAccess = { ...buyAccessFixture, phase: "combat" };
  assert.equal(
    state.playBuyAccessPlotIntrigue(combatBuyAccess, "p2", buyAccess.id, ["greatHouses", "bene"]),
    combatBuyAccess,
    "Buy Access should only resolve during normal play",
  );
  const commanderBuyAccessFixture = {
    ...buyAccessFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 5 },
          influence: { ...candidate.influence, emperor: 1, greatHouses: 0, bene: 0, spacing: 0 },
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [buyAccess],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1, bene: 1, spacing: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.buyAccessPairChoices(playerById(commanderBuyAccessFixture, "p4")),
    [
      ["emperor", "fringeWorlds"],
      ["emperor", "bene"],
      ["emperor", "spacing"],
      ["greatHouses", "fringeWorlds"],
      ["greatHouses", "bene"],
      ["greatHouses", "spacing"],
      ["fringeWorlds", "bene"],
      ["fringeWorlds", "spacing"],
      ["bene", "spacing"],
    ],
    "Shaddam should choose either personal Emperor or game-board Great Houses, not both",
  );
  const shaddamPersonalBuyAccess = state.playBuyAccessPlotIntrigue(
    commanderBuyAccessFixture,
    "p4",
    buyAccess.id,
    ["emperor", "bene"],
    "p6",
  );
  assert.equal(playerById(shaddamPersonalBuyAccess, "p4").resources.solari, 0, "Commander Buy Access should spend Commander Solari");
  assert.equal(playerById(shaddamPersonalBuyAccess, "p4").influence.emperor, 2, "Shaddam can use Buy Access for personal Emperor Influence");
  assert.equal(playerById(shaddamPersonalBuyAccess, "p6").influence.bene, 2, "Shaddam should delegate game-board Buy Access Influence");
  assert.equal(playerById(shaddamPersonalBuyAccess, "p4").vp, playerById(commanderBuyAccessFixture, "p4").vp + 1);
  assert.equal(playerById(shaddamPersonalBuyAccess, "p6").vp, playerById(commanderBuyAccessFixture, "p6").vp + 1);
  assert.match(shaddamPersonalBuyAccess.log[0], /gains 1 Emperor Influence and Princess Irulan gains 1 Bene Gesserit Influence/);
  const shaddamDelegatedBuyAccess = state.playBuyAccessPlotIntrigue(
    commanderBuyAccessFixture,
    "p4",
    buyAccess.id,
    ["greatHouses", "spacing"],
    "p6",
  );
  assert.equal(playerById(shaddamDelegatedBuyAccess, "p4").influence.greatHouses, 0, "Shaddam should not take game-board Great Houses Influence");
  assert.equal(playerById(shaddamDelegatedBuyAccess, "p4").influence.spacing, 0, "Shaddam should not take game-board Spacing Guild Influence");
  assert.equal(playerById(shaddamDelegatedBuyAccess, "p6").influence.greatHouses, 2);
  assert.equal(playerById(shaddamDelegatedBuyAccess, "p6").influence.spacing, 2);
  assert.equal(
    state.playBuyAccessPlotIntrigue(commanderBuyAccessFixture, "p4", buyAccess.id, ["emperor", "greatHouses"], "p6"),
    commanderBuyAccessFixture,
    "Shaddam should not use both mappings of the printed Emperor icon from Buy Access",
  );
  assert.equal(
    state.playBuyAccessPlotIntrigue(commanderBuyAccessFixture, "p4", buyAccess.id, ["greatHouses", "bene"], "p2"),
    commanderBuyAccessFixture,
    "Revealed Commander Buy Access should reject a same-team Ally who was not activated for Reveal",
  );
  const muadDibBuyAccessFixture = {
    ...buyAccessFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p1"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p1") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 5 },
          influence: { ...candidate.influence, fremen: 1 },
          revealed: true,
          revealActivatedAllyId: "p5",
          intrigues: [buyAccess],
        };
      }
      if (candidate.id === "p5") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1, fringeWorlds: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  const muadDibBuyAccess = state.playBuyAccessPlotIntrigue(
    muadDibBuyAccessFixture,
    "p1",
    buyAccess.id,
    ["fremen", "greatHouses"],
    "p5",
  );
  assert.equal(playerById(muadDibBuyAccess, "p1").influence.fremen, 2, "Muad'Dib can use Buy Access for personal Fremen Influence");
  assert.equal(playerById(muadDibBuyAccess, "p5").influence.greatHouses, 2, "Muad'Dib should delegate game-board Buy Access Influence");
  assert.equal(
    state.playBuyAccessPlotIntrigue(muadDibBuyAccessFixture, "p1", buyAccess.id, ["fremen", "fringeWorlds"], "p5"),
    muadDibBuyAccessFixture,
    "Muad'Dib should not use both mappings of the printed Fremen icon from Buy Access",
  );

  const imperiumPoliticsFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 2 },
            influence: { ...candidate.influence, greatHouses: 1, spacing: 1, emperor: 1 },
            intrigues: [imperiumPolitics],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isImperiumPoliticsIntrigue(imperiumPolitics),
    true,
    "Imperium Politics should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.imperiumPoliticsFactionChoices(playerById(imperiumPoliticsFixture, "p2")),
    ["greatHouses", "spacing"],
    "Allies should choose Great Houses or Spacing Guild from Imperium Politics",
  );
  const imperiumPoliticsGreatHouses = state.playImperiumPoliticsPlotIntrigue(
    imperiumPoliticsFixture,
    "p2",
    imperiumPolitics.id,
    "greatHouses",
  );
  assert.equal(playerById(imperiumPoliticsGreatHouses, "p2").resources.solari, 1, "Imperium Politics should spend 1 Solari");
  assert.equal(playerById(imperiumPoliticsGreatHouses, "p2").influence.greatHouses, 2, "The Emperor-icon option should map to Great Houses for Allies");
  assert.equal(playerById(imperiumPoliticsGreatHouses, "p2").influence.emperor, 1, "Allies should not gain personal Emperor Influence");
  assert.equal(playerById(imperiumPoliticsGreatHouses, "p2").vp, playerById(imperiumPoliticsFixture, "p2").vp + 1);
  assert.deepEqual(playerById(imperiumPoliticsGreatHouses, "p2").intrigues, []);
  assert.equal(imperiumPoliticsGreatHouses.intrigueDiscard.at(-1).id, imperiumPolitics.id);
  assert.match(imperiumPoliticsGreatHouses.log[0], /Imperium Politics, spends 1 Solari, and gains 1 Great Houses Influence/);
  const imperiumPoliticsSpacing = state.playImperiumPoliticsPlotIntrigue(
    imperiumPoliticsFixture,
    "p2",
    imperiumPolitics.id,
    "spacing",
  );
  assert.equal(playerById(imperiumPoliticsSpacing, "p2").influence.spacing, 2, "Imperium Politics should allow Spacing Guild Influence");
  assert.equal(playerById(imperiumPoliticsSpacing, "p2").resources.solari, 1);
  const poorImperiumPolitics = {
    ...imperiumPoliticsFixture,
    players: imperiumPoliticsFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 0 }, intrigues: [imperiumPolitics] }
        : candidate,
    ),
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(poorImperiumPolitics, "p2", imperiumPolitics.id, "spacing"),
    poorImperiumPolitics,
    "Imperium Politics should require 1 Solari",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", mercenaries.id, "spacing"),
    imperiumPoliticsFixture,
    "Imperium Politics should reject other Intrigue cards",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", imperiumPolitics.id, "emperor"),
    imperiumPoliticsFixture,
    "Only Shaddam should choose personal Emperor Influence from Imperium Politics",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", imperiumPolitics.id, "fremen"),
    imperiumPoliticsFixture,
    "Imperium Politics should reject unknown choices",
  );
  const pendingImperiumPolitics = {
    ...imperiumPoliticsFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(pendingImperiumPolitics, "p2", imperiumPolitics.id, "spacing"),
    pendingImperiumPolitics,
    "Imperium Politics should wait for pending actions to resolve",
  );
  const queuedImperiumPolitics = {
    ...imperiumPoliticsFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(queuedImperiumPolitics, "p2", imperiumPolitics.id, "spacing"),
    queuedImperiumPolitics,
    "Imperium Politics should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p3", imperiumPolitics.id, "spacing"),
    imperiumPoliticsFixture,
    "Only the active player should play Imperium Politics",
  );
  const combatImperiumPolitics = { ...imperiumPoliticsFixture, phase: "combat" };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(combatImperiumPolitics, "p2", imperiumPolitics.id, "spacing"),
    combatImperiumPolitics,
    "Imperium Politics should only resolve during normal play",
  );
  const commanderImperiumPoliticsFixture = {
    ...imperiumPoliticsFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 2 },
          influence: { ...candidate.influence, emperor: 1, greatHouses: 0, spacing: 0 },
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [imperiumPolitics],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1, spacing: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.imperiumPoliticsFactionChoices(playerById(commanderImperiumPoliticsFixture, "p4")),
    ["emperor", "greatHouses", "spacing"],
    "Shaddam should choose personal Emperor, Great Houses, or Spacing Guild from Imperium Politics",
  );
  const shaddamPersonalPolitics = state.playImperiumPoliticsPlotIntrigue(
    commanderImperiumPoliticsFixture,
    "p4",
    imperiumPolitics.id,
    "emperor",
  );
  assert.equal(playerById(shaddamPersonalPolitics, "p4").resources.solari, 1, "Shaddam should spend Commander Solari");
  assert.equal(playerById(shaddamPersonalPolitics, "p4").influence.emperor, 2, "Shaddam can use the Emperor icon on his personal board");
  assert.equal(playerById(shaddamPersonalPolitics, "p4").vp, playerById(commanderImperiumPoliticsFixture, "p4").vp + 1);
  assert.equal(playerById(shaddamPersonalPolitics, "p6").influence.greatHouses, 1);
  assert.match(shaddamPersonalPolitics.log[0], /Shaddam Corrino IV.*gains 1 Emperor Influence/);
  const shaddamGreatHousesPolitics = state.playImperiumPoliticsPlotIntrigue(
    commanderImperiumPoliticsFixture,
    "p4",
    imperiumPolitics.id,
    "greatHouses",
    "p6",
  );
  assert.equal(playerById(shaddamGreatHousesPolitics, "p4").resources.solari, 1);
  assert.equal(playerById(shaddamGreatHousesPolitics, "p4").influence.greatHouses, 0, "Shaddam should not take game-board Great Houses Influence");
  assert.equal(playerById(shaddamGreatHousesPolitics, "p6").influence.greatHouses, 2, "Commander game-board Influence should move the activated Ally");
  assert.equal(playerById(shaddamGreatHousesPolitics, "p6").vp, playerById(commanderImperiumPoliticsFixture, "p6").vp + 1);
  assert.match(shaddamGreatHousesPolitics.log[0], /Princess Irulan gains 1 Great Houses Influence/);
  const shaddamSpacingPolitics = state.playImperiumPoliticsPlotIntrigue(
    commanderImperiumPoliticsFixture,
    "p4",
    imperiumPolitics.id,
    "spacing",
    "p6",
  );
  assert.equal(playerById(shaddamSpacingPolitics, "p6").influence.spacing, 2, "Commander Spacing Guild Influence should move the activated Ally");
  assert.equal(playerById(shaddamSpacingPolitics, "p4").influence.spacing, 0);
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(commanderImperiumPoliticsFixture, "p4", imperiumPolitics.id, "greatHouses", "p2"),
    commanderImperiumPoliticsFixture,
    "Revealed Commander Imperium Politics should reject a same-team Ally who was not activated for Reveal",
  );
  const muadDibImperiumPoliticsFixture = {
    ...imperiumPoliticsFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p1"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p1") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 2 },
          revealed: true,
          revealActivatedAllyId: "p5",
          intrigues: [imperiumPolitics],
        };
      }
      if (candidate.id === "p5") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  const muadDibGreatHousesPolitics = state.playImperiumPoliticsPlotIntrigue(
    muadDibImperiumPoliticsFixture,
    "p1",
    imperiumPolitics.id,
    "greatHouses",
    "p5",
  );
  assert.equal(playerById(muadDibGreatHousesPolitics, "p1").influence.greatHouses, 0, "Muad'Dib should not gain game-board Great Houses Influence");
  assert.equal(playerById(muadDibGreatHousesPolitics, "p5").influence.greatHouses, 2, "Muad'Dib should move the activated Ally's Great Houses cube");
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(muadDibImperiumPoliticsFixture, "p1", imperiumPolitics.id, "emperor", "p5"),
    muadDibImperiumPoliticsFixture,
    "Muad'Dib should not choose personal Emperor Influence from Imperium Politics",
  );

  const spiceMustFlow = data.reserveMarket.find((card) => card.name === "The Spice Must Flow");
  assert.ok(spiceMustFlow, "The Spice Must Flow reserve card should be available for acquisition tests");
  const callToArmsFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, garrison: 2, persuasion: 18, intrigues: [callToArms] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isCallToArmsIntrigue(callToArms),
    true,
    "Call to Arms should be recognized as a structured Plot Intrigue",
  );
  const callToArmsPlayed = state.playCallToArmsPlotIntrigue(callToArmsFixture, "p2", callToArms.id);
  assert.equal(playerById(callToArmsPlayed, "p2").callToArmsActive, true, "Call to Arms should arm reveal acquisitions");
  assert.equal(playerById(callToArmsPlayed, "p2").garrison, 2, "Call to Arms should not recruit immediately");
  assert.deepEqual(playerById(callToArmsPlayed, "p2").intrigues, []);
  assert.equal(callToArmsPlayed.intrigueDiscard.at(-1).id, callToArms.id);
  assert.match(callToArmsPlayed.log[0], /plays Call to Arms/);
  const callToArmsRevealed = {
    ...callToArmsPlayed,
    players: callToArmsPlayed.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, revealed: true, persuasion: 18 } : candidate,
    ),
  };
  const firstArmedAcquire = state.acquireMarketCard(callToArmsRevealed, "p2", spiceMustFlow.id);
  assert.equal(playerById(firstArmedAcquire, "p2").garrison, 3, "Call to Arms should recruit on the first acquisition");
  assert.equal(playerById(firstArmedAcquire, "p2").persuasion, 9);
  assert.match(firstArmedAcquire.log[0], /acquires The Spice Must Flow for 1 VP and recruits 1 troop/);
  const secondArmedAcquire = state.acquireMarketCard(firstArmedAcquire, "p2", spiceMustFlow.id);
  assert.equal(playerById(secondArmedAcquire, "p2").garrison, 4, "Call to Arms should recruit on each acquisition");
  assert.equal(playerById(secondArmedAcquire, "p2").persuasion, 0);
  const rowCallToArmsCard =
    data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester") ??
    data.imperiumDeck.find((card) => (card.cost ?? 0) > 0 && (card.cost ?? 0) <= 3);
  assert.ok(rowCallToArmsCard, "Expected a low-cost Imperium Row card for Call to Arms tests");
  const rowReplacementCard = data.imperiumDeck.find((card) => card.id !== rowCallToArmsCard.id);
  assert.ok(rowReplacementCard, "Expected an Imperium Row replacement card for Call to Arms tests");
  const rowCallToArmsFixture = {
    ...callToArmsRevealed,
    imperiumRow: [rowCallToArmsCard],
    marketDeck: [rowReplacementCard],
    players: callToArmsRevealed.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, garrison: 2, persuasion: rowCallToArmsCard.cost ?? 0 }
        : candidate,
    ),
  };
  const rowCallToArmsBought = state.acquireMarketCard(rowCallToArmsFixture, "p2", rowCallToArmsCard.id);
  assert.equal(playerById(rowCallToArmsBought, "p2").garrison, 3, "Call to Arms should recruit on Imperium Row buys");
  assert.equal(rowCallToArmsBought.imperiumRow[0].id, rowReplacementCard.id, "Imperium Row buys should still refill the row");
  assert.equal(playerById(rowCallToArmsBought, "p2").discard.at(-1).id, rowCallToArmsCard.id);
  const callToArmsCleared = state.finishRevealTurn(firstArmedAcquire, "p2");
  assert.equal(playerById(callToArmsCleared, "p2").callToArmsActive, false, "Reveal cleanup should clear Call to Arms");
  const afterCallToArmsCleared = state.acquireMarketCard(
    {
      ...callToArmsCleared,
      activeSeat: callToArmsCleared.players.findIndex((candidate) => candidate.id === "p2"),
      players: callToArmsCleared.players.map((candidate) =>
        candidate.id === "p2" ? { ...candidate, persuasion: 9 } : candidate,
      ),
    },
    "p2",
    spiceMustFlow.id,
  );
  assert.equal(playerById(afterCallToArmsCleared, "p2").garrison, 3, "Cleared Call to Arms should not recruit later");

  const callToArmsRetroFixture = {
    ...callToArmsFixture,
    players: callToArmsFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, revealed: true, persuasion: 18 } : candidate,
    ),
  };
  const boughtBeforeCall = state.acquireMarketCard(callToArmsRetroFixture, "p2", spiceMustFlow.id);
  assert.equal(playerById(boughtBeforeCall, "p2").garrison, 2, "Call to Arms should not affect earlier acquisitions");
  const armedAfterBuy = state.playCallToArmsPlotIntrigue(boughtBeforeCall, "p2", callToArms.id);
  const boughtAfterCall = state.acquireMarketCard(armedAfterBuy, "p2", spiceMustFlow.id);
  assert.equal(playerById(boughtAfterCall, "p2").garrison, 3, "Call to Arms should affect later acquisitions only");

  const commanderCallToArmsFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          persuasion: 9,
          garrison: 0,
          intrigues: [callToArms],
        };
      }
      if (candidate.id === "p6") return { ...candidate, garrison: 2, intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderArmed = state.playCallToArmsPlotIntrigue(commanderCallToArmsFixture, "p4", callToArms.id);
  const commanderBought = state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id);
  assert.equal(playerById(commanderBought, "p4").persuasion, 0, "Commander should spend their own persuasion");
  assert.equal(playerById(commanderBought, "p4").garrison, 0, "Commander should not recruit troops personally");
  assert.equal(playerById(commanderBought, "p6").garrison, 3, "Activated Ally should receive the Call to Arms troop");
  assert.match(commanderBought.log[0], /Princess Irulan recruits 1 troop/);
  const throneCallToArmsCard = { ...rowCallToArmsCard, id: `${rowCallToArmsCard.id}-throne-call-to-arms` };
  const commanderThroneCallToArms = {
    ...commanderArmed,
    imperiumRow: [],
    marketDeck: [],
    throneRow: [throneCallToArmsCard],
    players: commanderArmed.players.map((candidate) => {
      if (candidate.id === "p4") return { ...candidate, persuasion: throneCallToArmsCard.cost ?? 0 };
      if (candidate.id === "p6") return { ...candidate, garrison: 2 };
      return candidate;
    }),
  };
  const commanderThroneBought = state.acquireMarketCard(
    commanderThroneCallToArms,
    "p4",
    throneCallToArmsCard.id,
    "p6",
  );
  assert.equal(playerById(commanderThroneBought, "p6").garrison, 3, "Call to Arms should recruit on Throne Row buys");
  assert.equal(commanderThroneBought.throneRow.length, 0, "Throne Row acquisition should remove the bought card");
  assert.equal(playerById(commanderThroneBought, "p4").discard.at(-1).id, throneCallToArmsCard.id);
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p2"),
    commanderArmed,
    "Commander Call to Arms should reject a same-team Ally who was not activated for Reveal",
  );
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p3"),
    commanderArmed,
    "Commander Call to Arms should reject an opposing troop recipient",
  );
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p4"),
    commanderArmed,
    "Commander Call to Arms should reject recruiting for the Commander",
  );

  const callToArmsNoPersuasion = {
    ...callToArmsRevealed,
    players: callToArmsRevealed.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, persuasion: 8 } : candidate,
    ),
  };
  assert.equal(
    state.acquireMarketCard(callToArmsNoPersuasion, "p2", spiceMustFlow.id),
    callToArmsNoPersuasion,
    "Failed Call to Arms acquisitions should not recruit",
  );
  const inactiveCallToArmsAcquire = {
    ...callToArmsRevealed,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p3"),
  };
  assert.equal(
    state.acquireMarketCard(inactiveCallToArmsAcquire, "p2", spiceMustFlow.id),
    inactiveCallToArmsAcquire,
    "Call to Arms acquisitions should require the buyer to be active",
  );
  const queuedCallToArmsAcquire = {
    ...callToArmsRevealed,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.acquireMarketCard(queuedCallToArmsAcquire, "p2", spiceMustFlow.id),
    queuedCallToArmsAcquire,
    "Call to Arms acquisitions should wait for queued pending actions",
  );
  const combatCallToArmsAcquire = {
    ...callToArmsRevealed,
    phase: "combat",
  };
  assert.equal(
    state.acquireMarketCard(combatCallToArmsAcquire, "p2", spiceMustFlow.id),
    combatCallToArmsAcquire,
    "Call to Arms acquisitions should only happen during playing phase",
  );
  const allDoneCallToArms = {
    ...callToArmsRevealed,
    players: callToArmsRevealed.players.map((candidate) => ({
      ...candidate,
      agentsReady: 0,
      revealed: true,
      callToArmsActive: candidate.id === "p2",
    })),
  };
  const afterAllDoneCallToArms = state.maybeStartCombatPhase(allDoneCallToArms);
  assert.equal(
    afterAllDoneCallToArms,
    allDoneCallToArms,
    "A revealed active player should explicitly end the Reveal turn before combat starts",
  );
  const afterAllDoneEnd = state.finishRevealTurn(allDoneCallToArms, "p2");
  assert.equal(
    afterAllDoneEnd.players.some((candidate) => candidate.callToArmsActive),
    false,
    "Explicit Reveal end should clear lingering Call to Arms effects",
  );
  const pendingDeployCallToArms = {
    ...allDoneCallToArms,
    pendingAction: { kind: "deploy", ownerId: "p2", remaining: 1, source: "Test" },
    players: allDoneCallToArms.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, garrison: 1 } : candidate,
    ),
  };
  const deployedBeforeCombat = state.deployTroopToConflict(pendingDeployCallToArms, pendingDeployCallToArms.pendingAction);
  const afterDeployCallToArms = state.maybeStartCombatPhase(deployedBeforeCombat);
  assert.equal(
    afterDeployCallToArms.players.some((candidate) => candidate.callToArmsActive),
    true,
    "Pending resolution during Reveal should leave the acquisition window open",
  );
  const afterDeployEnd = state.finishRevealTurn(afterDeployCallToArms, "p2");
  assert.equal(
    afterDeployEnd.players.some((candidate) => candidate.callToArmsActive),
    false,
    "Reveal end after pending resolution should clear lingering Call to Arms effects",
  );
  const pendingCallToArms = {
    ...callToArmsFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(pendingCallToArms, "p2", callToArms.id),
    pendingCallToArms,
    "Call to Arms should wait for pending actions to resolve",
  );
  const queuedCallToArms = {
    ...callToArmsFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(queuedCallToArms, "p2", callToArms.id),
    queuedCallToArms,
    "Call to Arms should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playCallToArmsPlotIntrigue(callToArmsFixture, "p3", callToArms.id),
    callToArmsFixture,
    "Only the active player should play Call to Arms as a Plot Intrigue",
  );
  const callToArmsWrongCardFixture = {
    ...callToArmsFixture,
    players: callToArmsFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(callToArmsWrongCardFixture, "p2", mercenaries.id),
    callToArmsWrongCardFixture,
    "Call to Arms should reject other Intrigue cards",
  );

  const councilorsAmbitionFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, highCouncilSeat: true, resources: { ...candidate.resources, water: 0 }, intrigues: [councilorsAmbition] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isCouncilorsAmbitionIntrigue(councilorsAmbition),
    true,
    "Councilor's Ambition should be recognized as a structured Plot Intrigue",
  );
  const councilorsAmbitionPlayed = state.playCouncilorsAmbitionPlotIntrigue(
    councilorsAmbitionFixture,
    "p2",
    councilorsAmbition.id,
  );
  assert.equal(playerById(councilorsAmbitionPlayed, "p2").resources.water, 2, "Councilor's Ambition should gain 2 water");
  assert.deepEqual(playerById(councilorsAmbitionPlayed, "p2").intrigues, []);
  assert.equal(councilorsAmbitionPlayed.intrigueDiscard.at(-1).id, councilorsAmbition.id);
  assert.match(councilorsAmbitionPlayed.log[0], /plays Councilor's Ambition and gains 2 water/);
  const noCouncilSeatAmbition = {
    ...councilorsAmbitionFixture,
    players: councilorsAmbitionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, highCouncilSeat: false, intrigues: [councilorsAmbition] } : candidate,
    ),
  };
  assert.equal(
    state.playCouncilorsAmbitionPlotIntrigue(noCouncilSeatAmbition, "p2", councilorsAmbition.id),
    noCouncilSeatAmbition,
    "Councilor's Ambition should require a High Council seat",
  );
  const pendingCouncilorsAmbition = {
    ...councilorsAmbitionFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playCouncilorsAmbitionPlotIntrigue(pendingCouncilorsAmbition, "p2", councilorsAmbition.id),
    pendingCouncilorsAmbition,
    "Councilor's Ambition should wait for pending actions to resolve",
  );
  const queuedCouncilorsAmbition = {
    ...councilorsAmbitionFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playCouncilorsAmbitionPlotIntrigue(queuedCouncilorsAmbition, "p2", councilorsAmbition.id),
    queuedCouncilorsAmbition,
    "Councilor's Ambition should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playCouncilorsAmbitionPlotIntrigue(councilorsAmbitionFixture, "p3", councilorsAmbition.id),
    councilorsAmbitionFixture,
    "Only the active player should play Councilor's Ambition as a Plot Intrigue",
  );
  const councilorsAmbitionWrongCardFixture = {
    ...councilorsAmbitionFixture,
    players: councilorsAmbitionFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playCouncilorsAmbitionPlotIntrigue(councilorsAmbitionWrongCardFixture, "p2", mercenaries.id),
    councilorsAmbitionWrongCardFixture,
    "Councilor's Ambition should reject other Intrigue cards",
  );

  const mercenariesDraw = data.intrigueCards.find((card) => card.sourceId === 144);
  assert.ok(mercenariesDraw, "Mercenaries verifier needs another Intrigue to draw");
  const mercenariesFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDeck: [mercenariesDraw],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 3 },
            garrison: 1,
            intrigues: [mercenaries],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isMercenariesIntrigue(mercenaries),
    true,
    "Mercenaries should be recognized as a structured Plot Intrigue",
  );
  const mercenariesPlayed = state.playMercenariesPlotIntrigue(
    mercenariesFixture,
    "p2",
    mercenaries.id,
  );
  assert.equal(playerById(mercenariesPlayed, "p2").resources.solari, 0, "Mercenaries should spend 3 Solari");
  assert.equal(playerById(mercenariesPlayed, "p2").garrison, 3, "Mercenaries should recruit 2 troops");
  assert.deepEqual(playerById(mercenariesPlayed, "p2").intrigues.map((card) => card.id), [mercenariesDraw.id]);
  assert.equal(mercenariesPlayed.intrigueDeck.length, 0, "Mercenaries should draw from the Intrigue deck");
  assert.equal(mercenariesPlayed.intrigueDiscard.at(-1).id, mercenaries.id);
  assert.match(mercenariesPlayed.log[0], /plays Mercenaries, spends 3 Solari, and recruits 2 troops/);
  assert.match(mercenariesPlayed.log[1], /draws an Intrigue card from Mercenaries/);

  const poorMercenaries = {
    ...mercenariesFixture,
    players: mercenariesFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 2 }, intrigues: [mercenaries] }
        : candidate,
    ),
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(poorMercenaries, "p2", mercenaries.id),
    poorMercenaries,
    "Mercenaries should require 3 Solari",
  );
  const commanderMercenariesFixture = {
    ...mercenariesFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    intrigueDeck: [mercenariesDraw],
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 3 },
          intrigues: [mercenaries],
        };
      }
      if (candidate.id === "p2" || candidate.id === "p6") return { ...candidate, garrison: 1, intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderMercenaries = state.playMercenariesPlotIntrigue(
    commanderMercenariesFixture,
    "p4",
    mercenaries.id,
    "p6",
  );
  assert.equal(playerById(commanderMercenaries, "p4").resources.solari, 0, "Commander Mercenaries should spend Commander Solari");
  assert.deepEqual(
    playerById(commanderMercenaries, "p4").intrigues.map((card) => card.id),
    [mercenariesDraw.id],
    "Commander Mercenaries should draw the Intrigue for the Commander",
  );
  assert.equal(
    playerById(commanderMercenaries, "p6").garrison,
    3,
    "Commander Mercenaries should recruit for the activated Ally",
  );
  assert.equal(playerById(commanderMercenaries, "p2").garrison, 1, "Commander Mercenaries should not recruit for another Ally");
  assert.match(commanderMercenaries.log[0], /Shaddam Corrino IV plays Mercenaries for Princess Irulan/);
  assert.equal(
    state.playMercenariesPlotIntrigue(commanderMercenariesFixture, "p4", mercenaries.id, "p3"),
    commanderMercenariesFixture,
    "Commander Mercenaries should reject non-team troop owners",
  );
  const lockedCommanderMercenariesFixture = {
    ...commanderMercenariesFixture,
    players: commanderMercenariesFixture.players.map((candidate) =>
      candidate.id === "p4"
        ? { ...candidate, revealed: true, revealActivatedAllyId: "p6", intrigues: [mercenaries] }
        : candidate,
    ),
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(lockedCommanderMercenariesFixture, "p4", mercenaries.id, "p2"),
    lockedCommanderMercenariesFixture,
    "Revealed Commander Mercenaries should reject a same-team Ally who was not activated for Reveal",
  );
  const pendingMercenaries = {
    ...mercenariesFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(pendingMercenaries, "p2", mercenaries.id),
    pendingMercenaries,
    "Mercenaries should wait for pending actions to resolve",
  );
  const queuedMercenaries = {
    ...mercenariesFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(queuedMercenaries, "p2", mercenaries.id),
    queuedMercenaries,
    "Mercenaries should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playMercenariesPlotIntrigue(mercenariesFixture, "p3", mercenaries.id),
    mercenariesFixture,
    "Only the active player should play Mercenaries as a Plot Intrigue",
  );
  const mercenariesWrongCardFixture = {
    ...mercenariesFixture,
    players: mercenariesFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [councilorsAmbition] } : candidate,
    ),
  };
  assert.equal(
    state.playMercenariesPlotIntrigue(mercenariesWrongCardFixture, "p2", councilorsAmbition.id),
    mercenariesWrongCardFixture,
    "Mercenaries should reject other Intrigue cards",
  );

  const strategicStockpilingFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 5, water: 3 },
            influence: { ...candidate.influence, spacing: 3 },
            intrigues: [strategicStockpiling],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isStrategicStockpilingIntrigue(strategicStockpiling),
    true,
    "Strategic Stockpiling should be recognized as a structured Plot Intrigue",
  );
  const strategicBoth = state.playStrategicStockpilingPlotIntrigue(
    strategicStockpilingFixture,
    "p2",
    strategicStockpiling.id,
    "both",
  );
  assert.equal(
    playerById(strategicBoth, "p2").vp,
    playerById(strategicStockpilingFixture, "p2").vp + 2,
    "Strategic Stockpiling should score both branches together",
  );
  assert.equal(playerById(strategicBoth, "p2").resources.spice, 0);
  assert.equal(playerById(strategicBoth, "p2").resources.water, 0);
  assert.deepEqual(playerById(strategicBoth, "p2").intrigues, []);
  assert.equal(strategicBoth.intrigueDiscard.at(-1).id, strategicStockpiling.id);
  assert.match(strategicBoth.log[0], /plays Strategic Stockpiling, spends 5 spice and 3 water, and gains 2 VP/);

  const strategicSpiceFixture = {
    ...strategicStockpilingFixture,
    players: strategicStockpilingFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 5, water: 0 },
            influence: { ...candidate.influence, spacing: 0 },
            intrigues: [strategicStockpiling],
          }
        : candidate,
    ),
  };
  const strategicSpice = state.playStrategicStockpilingPlotIntrigue(
    strategicSpiceFixture,
    "p2",
    strategicStockpiling.id,
    "spice",
  );
  assert.equal(playerById(strategicSpice, "p2").vp, playerById(strategicSpiceFixture, "p2").vp + 1);
  assert.equal(playerById(strategicSpice, "p2").resources.spice, 0);
  assert.equal(playerById(strategicSpice, "p2").resources.water, 0);
  assert.match(strategicSpice.log[0], /spends 5 spice, and gains 1 VP/);

  const strategicWaterFixture = {
    ...strategicStockpilingFixture,
    players: strategicStockpilingFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 0, water: 3 },
            influence: { ...candidate.influence, spacing: 3 },
            intrigues: [strategicStockpiling],
          }
        : candidate,
    ),
  };
  const strategicWater = state.playStrategicStockpilingPlotIntrigue(
    strategicWaterFixture,
    "p2",
    strategicStockpiling.id,
    "water",
  );
  assert.equal(playerById(strategicWater, "p2").vp, playerById(strategicWaterFixture, "p2").vp + 1);
  assert.equal(playerById(strategicWater, "p2").resources.spice, 0);
  assert.equal(playerById(strategicWater, "p2").resources.water, 0);
  assert.match(strategicWater.log[0], /spends 3 water, and gains 1 VP/);

  const strategicNoGuild = {
    ...strategicWaterFixture,
    players: strategicWaterFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, influence: { ...candidate.influence, spacing: 2 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(strategicNoGuild, "p2", strategicStockpiling.id, "water"),
    strategicNoGuild,
    "Strategic Stockpiling water branch should require 3 Spacing Guild Influence",
  );
  const strategicMissingWater = {
    ...strategicStockpilingFixture,
    players: strategicStockpilingFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 5, water: 2 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(strategicMissingWater, "p2", strategicStockpiling.id, "both"),
    strategicMissingWater,
    "Strategic Stockpiling should reject the combined branch when either cost is missing",
  );
  const strategicMissingSpice = {
    ...strategicSpiceFixture,
    players: strategicSpiceFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 4 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(strategicMissingSpice, "p2", strategicStockpiling.id, "spice"),
    strategicMissingSpice,
    "Strategic Stockpiling spice branch should require 5 spice",
  );
  const commanderStrategicFixture = {
    ...strategicStockpilingFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 0, water: 3 },
          influence: { ...candidate.influence, spacing: 0 },
          intrigues: [strategicStockpiling],
        };
      }
      if (candidate.id === "p2") {
        return { ...candidate, influence: { ...candidate.influence, spacing: 3 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderStrategic = state.playStrategicStockpilingPlotIntrigue(
    commanderStrategicFixture,
    "p4",
    strategicStockpiling.id,
    "water",
  );
  assert.equal(
    playerById(commanderStrategic, "p4").vp,
    playerById(commanderStrategicFixture, "p4").vp + 1,
    "Commander Strategic Stockpiling should use team effective Spacing Guild Influence",
  );
  assert.equal(playerById(commanderStrategic, "p4").resources.water, 0);

  const pendingStrategic = {
    ...strategicStockpilingFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(pendingStrategic, "p2", strategicStockpiling.id, "both"),
    pendingStrategic,
    "Strategic Stockpiling should wait for pending actions to resolve",
  );
  const queuedStrategic = {
    ...strategicStockpilingFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(queuedStrategic, "p2", strategicStockpiling.id, "both"),
    queuedStrategic,
    "Strategic Stockpiling should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(strategicStockpilingFixture, "p3", strategicStockpiling.id, "both"),
    strategicStockpilingFixture,
    "Only the active player should play Strategic Stockpiling as a Plot Intrigue",
  );
  const strategicWrongCardFixture = {
    ...strategicStockpilingFixture,
    players: strategicStockpilingFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playStrategicStockpilingPlotIntrigue(strategicWrongCardFixture, "p2", mercenaries.id, "both"),
    strategicWrongCardFixture,
    "Strategic Stockpiling should reject other Intrigue cards",
  );

  const shaddamsFavorFixture = {
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
            influence: { ...candidate.influence, greatHouses: 0 },
            garrison: 2,
            intrigues: [shaddamsFavor],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isShaddamsFavorIntrigue(shaddamsFavor),
    true,
    "Shaddam's Favor should be recognized as a structured Plot Intrigue",
  );
  const shaddamsFavorRecruit = state.playShaddamsFavorPlotIntrigue(
    shaddamsFavorFixture,
    "p2",
    shaddamsFavor.id,
  );
  assert.equal(playerById(shaddamsFavorRecruit, "p2").garrison, 3, "Shaddam's Favor should recruit 1 troop");
  assert.equal(
    playerById(shaddamsFavorRecruit, "p2").resources.solari,
    1,
    "Shaddam's Favor should not gain Solari below the Emperor-icon threshold",
  );
  assert.deepEqual(playerById(shaddamsFavorRecruit, "p2").intrigues, []);
  assert.equal(shaddamsFavorRecruit.intrigueDiscard.at(-1).id, shaddamsFavor.id);
  assert.match(shaddamsFavorRecruit.log[0], /plays Shaddam's Favor, recruits 1 troop\./);

  const shaddamsFavorGreatHousesFixture = {
    ...shaddamsFavorFixture,
    players: shaddamsFavorFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 1 },
            influence: { ...candidate.influence, greatHouses: 3, emperor: 0 },
            garrison: 2,
            intrigues: [shaddamsFavor],
          }
        : candidate,
    ),
  };
  const shaddamsFavorGreatHouses = state.playShaddamsFavorPlotIntrigue(
    shaddamsFavorGreatHousesFixture,
    "p2",
    shaddamsFavor.id,
  );
  assert.equal(playerById(shaddamsFavorGreatHouses, "p2").garrison, 3);
  assert.equal(
    playerById(shaddamsFavorGreatHouses, "p2").resources.solari,
    4,
    "Allies should use Great Houses for Emperor-icon card effects in six-player mode",
  );
  assert.match(shaddamsFavorGreatHouses.log[0], /recruits 1 troop and gains 3 Solari/);

  const shaddamsFavorAllyEmperorFixture = {
    ...shaddamsFavorFixture,
    players: shaddamsFavorFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, solari: 1 },
            influence: { ...candidate.influence, greatHouses: 0, emperor: 3 },
            garrison: 2,
            intrigues: [shaddamsFavor],
          }
        : candidate,
    ),
  };
  const shaddamsFavorAllyEmperor = state.playShaddamsFavorPlotIntrigue(
    shaddamsFavorAllyEmperorFixture,
    "p2",
    shaddamsFavor.id,
  );
  assert.equal(
    playerById(shaddamsFavorAllyEmperor, "p2").resources.solari,
    1,
    "Allies should not use the personal Emperor track for Emperor-icon card effects",
  );

  const commanderFavorFixture = {
    ...shaddamsFavorFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 2 },
          influence: { ...candidate.influence, emperor: 3, greatHouses: 0 },
          intrigues: [shaddamsFavor],
        };
      }
      if (candidate.id === "p6") return { ...candidate, garrison: 2, intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderFavor = state.playShaddamsFavorPlotIntrigue(
    commanderFavorFixture,
    "p4",
    shaddamsFavor.id,
    "p6",
  );
  assert.equal(
    playerById(commanderFavor, "p6").garrison,
    3,
    "Commander Shaddam's Favor should recruit for the activated Ally",
  );
  assert.equal(
    playerById(commanderFavor, "p4").resources.solari,
    5,
    "Commander Shaddam's Favor should gain Solari for the Commander",
  );
  assert.deepEqual(playerById(commanderFavor, "p4").intrigues, []);
  assert.equal(commanderFavor.intrigueDiscard.at(-1).id, shaddamsFavor.id);
  assert.match(commanderFavor.log[0], /Shaddam Corrino IV plays Shaddam's Favor for Princess Irulan/);

  const lockedCommanderFavorFixture = {
    ...commanderFavorFixture,
    players: commanderFavorFixture.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          resources: { ...candidate.resources, solari: 2 },
          intrigues: [shaddamsFavor],
        };
      }
      if (candidate.id === "p2") return { ...candidate, garrison: 2 };
      if (candidate.id === "p6") return { ...candidate, garrison: 2 };
      return candidate;
    }),
  };
  const lockedCommanderFavor = state.playShaddamsFavorPlotIntrigue(
    lockedCommanderFavorFixture,
    "p4",
    shaddamsFavor.id,
  );
  assert.equal(
    playerById(lockedCommanderFavor, "p6").garrison,
    3,
    "Revealed Commander Shaddam's Favor should default to the locked Reveal Ally",
  );
  assert.equal(
    playerById(lockedCommanderFavor, "p2").garrison,
    2,
    "Revealed Commander Shaddam's Favor should not use another same-team Ally",
  );
  assert.equal(
    state.playShaddamsFavorPlotIntrigue(lockedCommanderFavorFixture, "p4", shaddamsFavor.id, "p2"),
    lockedCommanderFavorFixture,
    "Revealed Commander Shaddam's Favor should reject a same-team Ally who was not activated for Reveal",
  );

  const commanderGreatHousesFavorFixture = {
    ...commanderFavorFixture,
    players: commanderFavorFixture.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 2 },
          influence: { ...candidate.influence, emperor: 0, greatHouses: 0 },
          intrigues: [shaddamsFavor],
        };
      }
      if (candidate.id === "p2") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 3 }, intrigues: [] };
      }
      return candidate;
    }),
  };
  const commanderGreatHousesFavor = state.playShaddamsFavorPlotIntrigue(
    commanderGreatHousesFavorFixture,
    "p4",
    shaddamsFavor.id,
    "p6",
  );
  assert.equal(
    playerById(commanderGreatHousesFavor, "p4").resources.solari,
    5,
    "Shaddam should be able to use Great Houses for Emperor-icon card effects",
  );

  const commanderAllyEmperorFavorFixture = {
    ...commanderFavorFixture,
    players: commanderFavorFixture.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, solari: 2 },
          influence: { ...candidate.influence, emperor: 0, greatHouses: 0 },
          intrigues: [shaddamsFavor],
        };
      }
      if (candidate.id === "p6") {
        return {
          ...candidate,
          influence: { ...candidate.influence, emperor: 3, greatHouses: 0 },
          garrison: 2,
          intrigues: [],
        };
      }
      return candidate;
    }),
  };
  const commanderAllyEmperorFavor = state.playShaddamsFavorPlotIntrigue(
    commanderAllyEmperorFavorFixture,
    "p4",
    shaddamsFavor.id,
    "p6",
  );
  assert.equal(
    playerById(commanderAllyEmperorFavor, "p4").resources.solari,
    2,
    "Shaddam should not use a same-team Ally's personal Emperor track for Emperor-icon card effects",
  );
  assert.equal(playerById(commanderAllyEmperorFavor, "p6").garrison, 3);

  assert.equal(
    state.playShaddamsFavorPlotIntrigue(commanderFavorFixture, "p4", shaddamsFavor.id, "p3"),
    commanderFavorFixture,
    "Commander Shaddam's Favor should reject non-team troop owners",
  );
  const pendingFavor = {
    ...shaddamsFavorFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playShaddamsFavorPlotIntrigue(pendingFavor, "p2", shaddamsFavor.id),
    pendingFavor,
    "Shaddam's Favor should wait for pending actions to resolve",
  );
  const queuedFavor = {
    ...shaddamsFavorFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playShaddamsFavorPlotIntrigue(queuedFavor, "p2", shaddamsFavor.id),
    queuedFavor,
    "Shaddam's Favor should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playShaddamsFavorPlotIntrigue(shaddamsFavorFixture, "p3", shaddamsFavor.id),
    shaddamsFavorFixture,
    "Only the active player should play Shaddam's Favor as a Plot Intrigue",
  );
  const shaddamsFavorWrongCardFixture = {
    ...shaddamsFavorFixture,
    players: shaddamsFavorFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playShaddamsFavorPlotIntrigue(shaddamsFavorWrongCardFixture, "p2", mercenaries.id),
    shaddamsFavorWrongCardFixture,
    "Shaddam's Favor should reject other Intrigue cards",
  );

  const marketOpportunityFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 2, solari: 5 },
            intrigues: [marketOpportunity],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isMarketOpportunityIntrigue(marketOpportunity),
    true,
    "Market Opportunity should be recognized as a structured Plot Intrigue",
  );
  const marketSpiceSold = state.playMarketOpportunityPlotIntrigue(
    marketOpportunityFixture,
    "p2",
    marketOpportunity.id,
    "spice-to-solari",
  );
  assert.equal(playerById(marketSpiceSold, "p2").resources.spice, 0, "Market Opportunity should spend 2 spice");
  assert.equal(playerById(marketSpiceSold, "p2").resources.solari, 10, "Market Opportunity should gain 5 Solari");
  assert.deepEqual(playerById(marketSpiceSold, "p2").intrigues, []);
  assert.equal(marketSpiceSold.intrigueDiscard.at(-1).id, marketOpportunity.id);
  assert.match(marketSpiceSold.log[0], /plays Market Opportunity, spends 2 spice, and gains 5 Solari/);

  const marketSpiceBought = state.playMarketOpportunityPlotIntrigue(
    marketOpportunityFixture,
    "p2",
    marketOpportunity.id,
    "solari-to-spice",
  );
  assert.equal(playerById(marketSpiceBought, "p2").resources.spice, 7, "Market Opportunity should gain 5 spice");
  assert.equal(playerById(marketSpiceBought, "p2").resources.solari, 0, "Market Opportunity should spend 5 Solari");
  assert.equal(marketSpiceBought.intrigueDiscard.at(-1).id, marketOpportunity.id);
  assert.match(marketSpiceBought.log[0], /plays Market Opportunity, spends 5 Solari, and gains 5 spice/);

  const marketMissingSpice = {
    ...marketOpportunityFixture,
    players: marketOpportunityFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 1 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(marketMissingSpice, "p2", marketOpportunity.id, "spice-to-solari"),
    marketMissingSpice,
    "Market Opportunity spice-to-Solari branch should require 2 spice",
  );
  const marketMissingSolari = {
    ...marketOpportunityFixture,
    players: marketOpportunityFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 4 } }
        : candidate,
    ),
  };
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(marketMissingSolari, "p2", marketOpportunity.id, "solari-to-spice"),
    marketMissingSolari,
    "Market Opportunity Solari-to-spice branch should require 5 Solari",
  );
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(marketOpportunityFixture, "p2", marketOpportunity.id, "bad-choice"),
    marketOpportunityFixture,
    "Market Opportunity should reject unknown exchange choices",
  );
  const commanderMarketFixture = {
    ...marketOpportunityFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) =>
      candidate.id === "p4"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 2, solari: 5 },
            intrigues: [marketOpportunity],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  const commanderMarket = state.playMarketOpportunityPlotIntrigue(
    commanderMarketFixture,
    "p4",
    marketOpportunity.id,
    "spice-to-solari",
  );
  assert.equal(playerById(commanderMarket, "p4").resources.spice, 0);
  assert.equal(playerById(commanderMarket, "p4").resources.solari, 10);
  assert.deepEqual(playerById(commanderMarket, "p4").intrigues, []);
  const commanderMarketBuy = state.playMarketOpportunityPlotIntrigue(
    commanderMarketFixture,
    "p4",
    marketOpportunity.id,
    "solari-to-spice",
  );
  assert.equal(playerById(commanderMarketBuy, "p4").resources.spice, 7);
  assert.equal(playerById(commanderMarketBuy, "p4").resources.solari, 0);
  assert.deepEqual(playerById(commanderMarketBuy, "p4").intrigues, []);

  const pendingMarket = {
    ...marketOpportunityFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(pendingMarket, "p2", marketOpportunity.id, "spice-to-solari"),
    pendingMarket,
    "Market Opportunity should wait for pending actions to resolve",
  );
  const queuedMarket = {
    ...marketOpportunityFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(queuedMarket, "p2", marketOpportunity.id, "spice-to-solari"),
    queuedMarket,
    "Market Opportunity should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(marketOpportunityFixture, "p3", marketOpportunity.id, "spice-to-solari"),
    marketOpportunityFixture,
    "Only the active player should play Market Opportunity as a Plot Intrigue",
  );
  const marketWrongCardFixture = {
    ...marketOpportunityFixture,
    players: marketOpportunityFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playMarketOpportunityPlotIntrigue(marketWrongCardFixture, "p2", mercenaries.id, "spice-to-solari"),
    marketWrongCardFixture,
    "Market Opportunity should reject other Intrigue cards",
  );

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
  const wormSummoned = state.playUnexpectedAlliesIntrigue(
    unexpectedAlliesFixture,
    "p3",
    unexpectedAllies.id,
    false,
  );
  assert.equal(playerById(wormSummoned, "p3").resources.water, 0, "Unexpected Allies should cost 2 water");
  assert.equal(
    playerById(wormSummoned, "p3").makerHooks,
    false,
    "Unexpected Allies should not require Maker Hooks",
  );
  assert.equal(playerById(wormSummoned, "p3").deployedSandworms, 1, "Unexpected Allies should deploy a sandworm");
  assert.equal(playerById(wormSummoned, "p3").conflict, 3, "Unexpected Allies sandworms should add 3 strength");
  assert.equal(wormSummoned.shieldWall, true, "Unexpected Allies should not force optional Shield Wall removal");
  assert.deepEqual(playerById(wormSummoned, "p3").intrigues, []);
  assert.equal(wormSummoned.intrigueDiscard.at(-1).id, unexpectedAllies.id);
  assert.match(wormSummoned.log[0], /plays Unexpected Allies, spends 2 water, and summons 1 sandworm/);

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
    false,
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
    false,
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
    state.playUnexpectedAlliesIntrigue(lockedCommanderUnexpectedAllies, "p4", unexpectedAllies.id, false, "p2"),
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
    state.playUnexpectedAlliesIntrigue(dryUnexpectedAllies, "p3", unexpectedAllies.id, false),
    dryUnexpectedAllies,
    "Unexpected Allies should require 2 water",
  );

  const pendingUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    pendingAction: { kind: "spy", ownerId: "p3", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(pendingUnexpectedAllies, "p3", unexpectedAllies.id, false),
    pendingUnexpectedAllies,
    "Unexpected Allies should wait for pending actions to resolve",
  );
  const queuedUnexpectedAllies = {
    ...unexpectedAlliesFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p3", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playUnexpectedAlliesIntrigue(queuedUnexpectedAllies, "p3", unexpectedAllies.id, false),
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
