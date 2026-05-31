import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifyEconomyPlotIntrigues({ cards, data, game, state }) {
  const { councilorsAmbition, mercenaries, strategicStockpiling } = cards;

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

  const mercenariesDraw = data.intrigueCards.find((card) => card.sourceId === 155);
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
}
