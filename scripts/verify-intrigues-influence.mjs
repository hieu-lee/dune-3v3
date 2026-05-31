import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifySietchRitualPlotIntrigue({ cards, data, game, state }) {
  const { mercenaries, sietchRitual } = cards;

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
}
