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
  const unexpectedAllies = data.intrigueCards.find((card) => card.sourceId === 137);
  const intelligenceReport = data.intrigueCards.find((card) => card.sourceId === 142);
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
  assert.ok(unexpectedAllies, "Unexpected Allies Intrigue should be available");
  assert.ok(intelligenceReport, "Intelligence Report Intrigue should be available");
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
    unexpectedAllies.summary,
    "Pay 2 water to deploy a sandworm to the Conflict; may remove the Shield Wall.",
    "Unexpected Allies should expose its water, detonation, and sandworm effect",
  );
  assert.equal(
    intelligenceReport.summary,
    "Draw 1 card; draw 1 more if you have two or more spies on the board.",
    "Intelligence Report should expose its conditional card draw",
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
