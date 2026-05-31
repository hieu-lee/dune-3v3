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

export function verifyChangeAllegiancesPlotIntrigue({ cards, game, state }) {
  const { changeAllegiances, mercenaries } = cards;

  const changeAllegiancesFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            resources: { ...candidate.resources, spice: 3 },
            influence: {
              emperor: 0,
              spacing: 1,
              bene: 1,
              fremen: 0,
              greatHouses: 1,
              fringeWorlds: 0,
            },
            intrigues: [changeAllegiances],
          }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isChangeAllegiancesIntrigue(changeAllegiances),
    true,
    "Change Allegiances should be recognized as a structured Plot Intrigue",
  );
  assert.deepEqual(
    state.changeAllegiancesGainChoices(playerById(changeAllegiancesFixture, "p2")),
    ["greatHouses", "spacing", "bene", "fringeWorlds"],
    "Allies should choose among game-board Influence tracks for Change Allegiances",
  );
  assert.deepEqual(
    state.changeAllegiancesLossChoices(changeAllegiancesFixture, playerById(changeAllegiancesFixture, "p2")),
    ["greatHouses", "spacing", "bene"],
    "Change Allegiances should offer only payable Influence losses",
  );
  const changeShift = state.playChangeAllegiancesPlotIntrigue(
    changeAllegiancesFixture,
    "p2",
    changeAllegiances.id,
    { kind: "shift", loseFaction: "greatHouses", gainFaction: "bene" },
  );
  assert.equal(playerById(changeShift, "p2").influence.greatHouses, 0, "Change Allegiances should lose the chosen Influence");
  assert.equal(playerById(changeShift, "p2").influence.bene, 2, "Change Allegiances should gain shifted Influence");
  assert.equal(playerById(changeShift, "p2").resources.spice, 3, "The shift row should not spend spice");
  assert.equal(playerById(changeShift, "p2").vp, playerById(changeAllegiancesFixture, "p2").vp + 1);
  assert.deepEqual(playerById(changeShift, "p2").intrigues, []);
  assert.equal(changeShift.intrigueDiscard.at(-1).id, changeAllegiances.id);
  assert.match(changeShift.log[0], /plays Change Allegiances; .* loses 1 Great Houses Influence and gains 1 Bene Gesserit Influence/);
  const changeSameFaction = state.playChangeAllegiancesPlotIntrigue(
    changeAllegiancesFixture,
    "p2",
    changeAllegiances.id,
    { kind: "shift", loseFaction: "spacing", gainFaction: "spacing" },
  );
  assert.equal(playerById(changeSameFaction, "p2").influence.spacing, 1, "Change Allegiances should allow a same-Faction net-zero shift");
  assert.equal(playerById(changeSameFaction, "p2").vp, playerById(changeAllegiancesFixture, "p2").vp);
  const changeSpice = state.playChangeAllegiancesPlotIntrigue(
    changeAllegiancesFixture,
    "p2",
    changeAllegiances.id,
    { kind: "spend-spice", gainFaction: "spacing" },
  );
  assert.equal(playerById(changeSpice, "p2").resources.spice, 0, "Change Allegiances should spend 3 spice for the bottom row");
  assert.equal(playerById(changeSpice, "p2").influence.spacing, 2, "Change Allegiances should gain the bought Influence");
  assert.equal(playerById(changeSpice, "p2").vp, playerById(changeAllegiancesFixture, "p2").vp + 1);
  assert.match(changeSpice.log[0], /plays Change Allegiances, spends 3 spice, and gains 1 Spacing Guild Influence/);
  const changeBoth = state.playChangeAllegiancesPlotIntrigue(
    changeAllegiancesFixture,
    "p2",
    changeAllegiances.id,
    { kind: "both", loseFaction: "greatHouses", shiftGainFaction: "bene", spiceGainFaction: "spacing" },
  );
  assert.equal(playerById(changeBoth, "p2").resources.spice, 0, "Change Allegiances should spend spice once when both rows resolve");
  assert.equal(playerById(changeBoth, "p2").influence.greatHouses, 0);
  assert.equal(playerById(changeBoth, "p2").influence.bene, 2);
  assert.equal(playerById(changeBoth, "p2").influence.spacing, 2);
  assert.equal(playerById(changeBoth, "p2").vp, playerById(changeAllegiancesFixture, "p2").vp + 2);
  assert.equal(changeBoth.intrigueDiscard.filter((card) => card.id === changeAllegiances.id).length, 1);
  assert.match(changeBoth.log[0], /plays Change Allegiances; .* loses 1 Great Houses Influence, .* spends 3 spice, and gains 1 Bene Gesserit Influence and gains 1 Spacing Guild Influence/);
  const poorChangeAllegiances = {
    ...changeAllegiancesFixture,
    players: changeAllegiancesFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, resources: { ...candidate.resources, spice: 2 }, intrigues: [changeAllegiances] }
        : candidate,
    ),
  };
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(poorChangeAllegiances, "p2", changeAllegiances.id, { kind: "spend-spice", gainFaction: "bene" }),
    poorChangeAllegiances,
    "Change Allegiances should require 3 spice for the bottom row",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(
      poorChangeAllegiances,
      "p2",
      changeAllegiances.id,
      { kind: "both", loseFaction: "greatHouses", shiftGainFaction: "bene", spiceGainFaction: "spacing" },
    ),
    poorChangeAllegiances,
    "Change Allegiances should require 3 spice when both rows resolve",
  );
  const noLossChangeAllegiances = {
    ...changeAllegiancesFixture,
    players: changeAllegiancesFixture.players.map((candidate) =>
      candidate.id === "p2"
        ? {
            ...candidate,
            influence: {
              emperor: 0,
              spacing: 0,
              bene: 0,
              fremen: 0,
              greatHouses: 0,
              fringeWorlds: 0,
            },
            intrigues: [changeAllegiances],
          }
        : candidate,
    ),
  };
  assert.deepEqual(
    state.changeAllegiancesLossChoices(noLossChangeAllegiances, playerById(noLossChangeAllegiances, "p2")),
    [],
    "Change Allegiances should not offer the top row without payable Influence",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(noLossChangeAllegiances, "p2", changeAllegiances.id, { kind: "shift", loseFaction: "bene", gainFaction: "spacing" }),
    noLossChangeAllegiances,
    "Change Allegiances should require a payable Influence loss for the top row",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(changeAllegiancesFixture, "p2", mercenaries.id, { kind: "shift", loseFaction: "spacing", gainFaction: "bene" }),
    changeAllegiancesFixture,
    "Change Allegiances should reject other Intrigue cards",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(changeAllegiancesFixture, "p2", changeAllegiances.id, { kind: "shift", loseFaction: "emperor", gainFaction: "bene" }),
    changeAllegiancesFixture,
    "Allies should not lose personal Emperor Influence for Change Allegiances",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(changeAllegiancesFixture, "p2", changeAllegiances.id, { kind: "unknown", gainFaction: "bene" }),
    changeAllegiancesFixture,
    "Change Allegiances should reject unknown choice kinds",
  );
  const pendingChangeAllegiances = {
    ...changeAllegiancesFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(pendingChangeAllegiances, "p2", changeAllegiances.id, { kind: "shift", loseFaction: "spacing", gainFaction: "bene" }),
    pendingChangeAllegiances,
    "Change Allegiances should wait for pending actions to resolve",
  );
  const queuedChangeAllegiances = {
    ...changeAllegiancesFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(queuedChangeAllegiances, "p2", changeAllegiances.id, { kind: "shift", loseFaction: "spacing", gainFaction: "bene" }),
    queuedChangeAllegiances,
    "Change Allegiances should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(changeAllegiancesFixture, "p3", changeAllegiances.id, { kind: "shift", loseFaction: "spacing", gainFaction: "bene" }),
    changeAllegiancesFixture,
    "Only the active player should play Change Allegiances",
  );
  const combatChangeAllegiances = { ...changeAllegiancesFixture, phase: "combat" };
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(combatChangeAllegiances, "p2", changeAllegiances.id, { kind: "shift", loseFaction: "spacing", gainFaction: "bene" }),
    combatChangeAllegiances,
    "Change Allegiances should only resolve during normal play",
  );

  const shaddamChangeAllegiancesFixture = {
    ...changeAllegiancesFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 3 },
          influence: { ...candidate.influence, emperor: 1 },
          revealed: true,
          revealActivatedAllyId: "p6",
          intrigues: [changeAllegiances],
        };
      }
      if (candidate.id === "p6") {
        return { ...candidate, influence: { ...candidate.influence, greatHouses: 1, bene: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.changeAllegiancesGainChoices(playerById(shaddamChangeAllegiancesFixture, "p4")),
    ["emperor", "greatHouses", "spacing", "bene", "fringeWorlds"],
    "Shaddam should choose personal Emperor or activated-Ally main-board Influence for Change Allegiances",
  );
  assert.deepEqual(
    state.changeAllegiancesLossChoices(
      shaddamChangeAllegiancesFixture,
      playerById(shaddamChangeAllegiancesFixture, "p4"),
      "p6",
    ),
    ["emperor", "greatHouses", "bene"],
    "Commander Change Allegiances should list personal losses plus activated-Ally main-board losses",
  );
  const shaddamChangeShift = state.playChangeAllegiancesPlotIntrigue(
    shaddamChangeAllegiancesFixture,
    "p4",
    changeAllegiances.id,
    { kind: "shift", loseFaction: "bene", gainFaction: "emperor" },
    "p6",
  );
  assert.equal(playerById(shaddamChangeShift, "p6").influence.bene, 0, "Commander Change Allegiances should make the activated Ally pay main-board losses");
  assert.equal(playerById(shaddamChangeShift, "p4").influence.emperor, 2, "Shaddam should keep personal Emperor gains");
  assert.match(shaddamChangeShift.log[0], /Princess Irulan loses 1 Bene Gesserit Influence and gains 1 Emperor Influence/);
  const shaddamChangeSpice = state.playChangeAllegiancesPlotIntrigue(
    shaddamChangeAllegiancesFixture,
    "p4",
    changeAllegiances.id,
    { kind: "spend-spice", gainFaction: "greatHouses" },
    "p6",
  );
  assert.equal(playerById(shaddamChangeSpice, "p4").resources.spice, 0, "Commander Change Allegiances should spend Commander spice");
  assert.equal(playerById(shaddamChangeSpice, "p4").influence.greatHouses, 0, "Commander Change Allegiances should not give main-board Influence to the Commander");
  assert.equal(playerById(shaddamChangeSpice, "p6").influence.greatHouses, 2, "Commander Change Allegiances should route main-board gains to the activated Ally");
  const shaddamChangeBoth = state.playChangeAllegiancesPlotIntrigue(
    shaddamChangeAllegiancesFixture,
    "p4",
    changeAllegiances.id,
    { kind: "both", loseFaction: "emperor", shiftGainFaction: "bene", spiceGainFaction: "emperor" },
    "p6",
  );
  assert.equal(playerById(shaddamChangeBoth, "p4").resources.spice, 0);
  assert.equal(playerById(shaddamChangeBoth, "p4").influence.emperor, 1, "Commander personal loss and personal gain should net correctly");
  assert.equal(playerById(shaddamChangeBoth, "p6").influence.bene, 2, "Both rows should still route main-board gains to the activated Ally");
  assert.equal(
    state.playChangeAllegiancesPlotIntrigue(
      shaddamChangeAllegiancesFixture,
      "p4",
      changeAllegiances.id,
      { kind: "spend-spice", gainFaction: "greatHouses" },
      "p2",
    ),
    shaddamChangeAllegiancesFixture,
    "Revealed Commander Change Allegiances should reject a same-team Ally who was not activated for Reveal",
  );

  const muadDibChangeAllegiancesFixture = {
    ...changeAllegiancesFixture,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p1"),
    players: game.players.map((candidate) => {
      if (candidate.id === "p1") {
        return {
          ...candidate,
          resources: { ...candidate.resources, spice: 3 },
          influence: { ...candidate.influence, fremen: 1 },
          revealed: true,
          revealActivatedAllyId: "p5",
          intrigues: [changeAllegiances],
        };
      }
      if (candidate.id === "p5") {
        return { ...candidate, influence: { ...candidate.influence, fringeWorlds: 1 }, intrigues: [] };
      }
      return { ...candidate, intrigues: [] };
    }),
  };
  assert.deepEqual(
    state.changeAllegiancesGainChoices(playerById(muadDibChangeAllegiancesFixture, "p1")),
    ["greatHouses", "spacing", "bene", "fremen", "fringeWorlds"],
    "Muad'Dib should choose personal Fremen or activated-Ally main-board Influence for Change Allegiances",
  );
  assert.deepEqual(
    state.changeAllegiancesLossChoices(
      muadDibChangeAllegiancesFixture,
      playerById(muadDibChangeAllegiancesFixture, "p1"),
      "p5",
    ),
    ["fremen", "fringeWorlds"],
    "Muad'Dib Change Allegiances should list personal Fremen plus activated-Ally main-board losses",
  );
  const muadDibChangeShift = state.playChangeAllegiancesPlotIntrigue(
    muadDibChangeAllegiancesFixture,
    "p1",
    changeAllegiances.id,
    { kind: "shift", loseFaction: "fremen", gainFaction: "fringeWorlds" },
    "p5",
  );
  assert.equal(playerById(muadDibChangeShift, "p1").influence.fremen, 0, "Muad'Dib should pay personal Fremen losses personally");
  assert.equal(playerById(muadDibChangeShift, "p5").influence.fringeWorlds, 2, "Muad'Dib should route main-board Fremen-icon gains to Fringe Worlds");
  const muadDibChangeSpice = state.playChangeAllegiancesPlotIntrigue(
    muadDibChangeAllegiancesFixture,
    "p1",
    changeAllegiances.id,
    { kind: "spend-spice", gainFaction: "fremen" },
    "p5",
  );
  assert.equal(playerById(muadDibChangeSpice, "p1").resources.spice, 0);
  assert.equal(playerById(muadDibChangeSpice, "p1").influence.fremen, 2, "Muad'Dib should keep personal Fremen gains");
}
