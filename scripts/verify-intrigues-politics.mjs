import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifyImperiumPoliticsPlotIntrigue({ cards, game, state }) {
  const { imperiumPolitics, mercenaries } = cards;

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
            influence: { ...candidate.influence, greatHouses: 1, fringeWorlds: 1, emperor: 1 },
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
    ["greatHouses", "fringeWorlds"],
    "Allies should choose Great Houses or Fremen/Fringe from Imperium Politics",
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
  const imperiumPoliticsFringe = state.playImperiumPoliticsPlotIntrigue(
    imperiumPoliticsFixture,
    "p2",
    imperiumPolitics.id,
    "fringeWorlds",
  );
  assert.equal(playerById(imperiumPoliticsFringe, "p2").influence.fringeWorlds, 2, "Imperium Politics should allow Fremen/Fringe Influence");
  assert.equal(playerById(imperiumPoliticsFringe, "p2").resources.solari, 1);
  const poorImperiumPolitics = {
    ...imperiumPoliticsFixture,
    players: imperiumPoliticsFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, solari: 0 }, intrigues: [imperiumPolitics] }
        : candidate,
    ),
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(poorImperiumPolitics, "p2", imperiumPolitics.id, "fringeWorlds"),
    poorImperiumPolitics,
    "Imperium Politics should require 1 Solari",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", mercenaries.id, "fringeWorlds"),
    imperiumPoliticsFixture,
    "Imperium Politics should reject other Intrigue cards",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", imperiumPolitics.id, "emperor"),
    imperiumPoliticsFixture,
    "Only Shaddam should choose personal Emperor Influence from Imperium Politics",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p2", imperiumPolitics.id, "spacing"),
    imperiumPoliticsFixture,
    "Imperium Politics should reject unknown choices",
  );
  const pendingImperiumPolitics = {
    ...imperiumPoliticsFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(pendingImperiumPolitics, "p2", imperiumPolitics.id, "fringeWorlds"),
    pendingImperiumPolitics,
    "Imperium Politics should wait for pending actions to resolve",
  );
  const queuedImperiumPolitics = {
    ...imperiumPoliticsFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(queuedImperiumPolitics, "p2", imperiumPolitics.id, "fringeWorlds"),
    queuedImperiumPolitics,
    "Imperium Politics should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(imperiumPoliticsFixture, "p3", imperiumPolitics.id, "fringeWorlds"),
    imperiumPoliticsFixture,
    "Only the active player should play Imperium Politics",
  );
  const combatImperiumPolitics = { ...imperiumPoliticsFixture, phase: "combat" };
  assert.equal(
    state.playImperiumPoliticsPlotIntrigue(combatImperiumPolitics, "p2", imperiumPolitics.id, "fringeWorlds"),
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
          influence: { ...candidate.influence, emperor: 1, greatHouses: 0, fringeWorlds: 0 },
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [imperiumPolitics],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1, fringeWorlds: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.imperiumPoliticsFactionChoices(playerById(commanderImperiumPoliticsFixture, "p4")),
    ["emperor", "greatHouses", "fringeWorlds"],
    "Shaddam should choose personal Emperor, Great Houses, or Fremen/Fringe from Imperium Politics",
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
  const shaddamFringePolitics = state.playImperiumPoliticsPlotIntrigue(
    commanderImperiumPoliticsFixture,
    "p4",
    imperiumPolitics.id,
    "fringeWorlds",
    "p6",
  );
  assert.equal(playerById(shaddamFringePolitics, "p6").influence.fringeWorlds, 2, "Commander Fremen/Fringe Influence should move the activated Ally");
  assert.equal(playerById(shaddamFringePolitics, "p4").influence.fringeWorlds, 0);
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
}
