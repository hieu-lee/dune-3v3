import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function resolveSetupPendingActions(state, game) {
  let current = game;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Expected an eligible Throne Row setup card");
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
  }
  assert.equal(current.pendingAction, undefined, "Imperium card verifier setup should not leave pending actions");
  return current;
}

function withActivePlayer(game, playerId, patch) {
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected ${playerId}`);
  return {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    roundMakerSpaceVisits: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = resolveSetupPendingActions(state, state.initialGame());
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  assert.ok(smuggler, "Imperium deck should include Smuggler's Harvester");
  assert.equal(state.isSmugglersHarvesterCard(smuggler), true, "Smuggler's Harvester should be recognized");
  assert.match(smuggler.play, /Maker board space/, "Smuggler's Harvester should show its conditional Agent text");
  assert.equal(smuggler.reveal, "+1 persuasion.", "Smuggler's Harvester should reveal for fixed persuasion only");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  assert.ok(interstellarTrade, "Imperium deck should include Interstellar Trade");
  assert.equal(state.isInterstellarTradeCard(interstellarTrade), true, "Interstellar Trade should be recognized");
  assert.equal(
    interstellarTrade.conditionalPersuasion,
    false,
    "Interstellar Trade should have structured reveal persuasion instead of manual printed reveal handling",
  );
  assert.match(interstellarTrade.reveal, /completed contract/, "Interstellar Trade should describe its contract reveal text");
  assert.ok(
    interstellarTrade.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Interstellar Trade"
      )
    ),
    "Interstellar Trade should carry a typed acquire Influence-choice effect",
  );
  assert.ok(
    interstellarTrade.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Interstellar Trade"
      )
    ),
    "Interstellar Trade should carry a typed acquire public contract effect",
  );
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  assert.ok(calculus, "Imperium deck should include Calculus of Power");
  assert.equal(state.isCalculusOfPowerCard(calculus), true, "Calculus of Power should be recognized");
  assert.equal(
    calculus.conditionalSwords,
    false,
    "Calculus of Power should use structured optional trash strength instead of manual printed reveal handling",
  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ) &&
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
          effect.optional === true &&
          effect.requiredTrait === "Faction: Emperor" &&
          effect.excludeSource === true &&
          effect.strengthReward === 3
      )
    ),
    "Calculus of Power should use declarative Reveal persuasion and trash-card strength effects",
  );
  assert.match(calculus.reveal, /another Emperor card/, "Calculus of Power should describe its structured Reveal trash text");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  assert.ok(capturedMentat, "Imperium deck should include Captured Mentat");
  assert.equal(state.isCapturedMentatCard(capturedMentat), true, "Captured Mentat should be recognized");
  assert.equal(capturedMentat.cost, 5, "Captured Mentat should cost 5 persuasion");
  assert.deepEqual(capturedMentat.icons, ["landsraad", "spice"], "Captured Mentat should reach Landsraad and Spice Trade spaces");
  assert.equal(capturedMentat.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.equal(capturedMentat.conditionalPersuasion, false, "Captured Mentat should not need manual persuasion entry");
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Captured Mentat should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence-for-intrigues" &&
        effect.amount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Reveal Influence-for-Intrigue spec",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-influence-and-draw" &&
        effect.drawCards === 1 &&
        effect.influenceAmount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Agent discard-for-Influence-and-draw spec",
  );
  assert.match(capturedMentat.play, /discard 1 card.*gain 1 Influence.*draw 1 card/i);
  assert.match(capturedMentat.reveal, /lose 1 Influence.*draw 1 Intrigue/i);
  const dangerousRhetoric = data.imperiumDeck.find((card) => card.name === "Dangerous Rhetoric");
  assert.ok(dangerousRhetoric, "Imperium deck should include Dangerous Rhetoric");
  assert.ok(
    dangerousRhetoric.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.amount === 1 &&
        effect.trashSource === true
      )
    ),
    "Dangerous Rhetoric should carry a declarative Agent Influence choice spec",
  );
  assert.match(dangerousRhetoric.play, /Gain 1 Influence.*trash this card/i);
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  assert.ok(beneGesseritOperative, "Imperium deck should include Bene Gesserit Operative");
  assert.equal(state.isBeneGesseritOperativeCard(beneGesseritOperative), true, "Bene Gesserit Operative should be recognized");
  assert.equal(beneGesseritOperative.cost, 3, "Bene Gesserit Operative should cost 3 persuasion");
  assert.deepEqual(beneGesseritOperative.icons, ["bene"], "Bene Gesserit Operative should reach Bene Gesserit spaces");
  assert.equal(beneGesseritOperative.persuasion, 1, "Bene Gesserit Operative should reveal for 1 base persuasion");
  assert.equal(beneGesseritOperative.conditionalPersuasion, false, "Bene Gesserit Operative should use structured spy-count reveal handling");
  assert.deepEqual(beneGesseritOperative.traits, ["Faction: Bene Gesserit"], "Bene Gesserit Operative should normalize its Bene Gesserit trait");
  assert.ok(
    beneGesseritOperative.effects?.some((spec) => spec.trigger === "agent-play"),
    "Bene Gesserit Operative should use a structured Agent spy-placement effect",
  );
  assert.match(beneGesseritOperative.play, /place 1 spy/i);
  assert.match(beneGesseritOperative.reveal, /two or more spies.*\+2 persuasion/i);
  const inHighPlaces = data.imperiumDeck.find((card) => card.name === "In High Places");
  assert.ok(inHighPlaces, "Imperium deck should include In High Places");
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent draw effect",
  );
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent spy-placement effect",
  );
  assert.match(inHighPlaces.play, /another Bene Gesserit card.*draw 1 card.*place 1 spy/i);
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  assert.ok(chani, "Imperium deck should include Chani, Clever Tactician");
  assert.equal(chani.cost, 5, "Chani should cost 5 persuasion");
  assert.deepEqual(chani.icons, ["city", "fremen", "spice"], "Chani should reach City, Fremen, and Spice Trade spaces");
  assert.equal(chani.persuasion, 0, "Chani's Fremen Bond persuasion should not be granted automatically");
  assert.equal(chani.swords, 0, "Chani's troop-retreat strength should not be granted automatically");
  assert.equal(chani.conditionalPersuasion, false, "Chani should use automated Fremen Bond reveal handling");
  assert.equal(chani.conditionalSwords, false, "Chani troop-retreat strength should use automated retreat handling");
  assert.ok(
    chani.effects?.some((spec) => spec.trigger === "agent-play"),
    "Chani should use a structured Agent Intrigue draw effect",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Chani should use a structured Fremen Bond persuasion effect",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops-for-strength" &&
        effect.amount === 2 &&
        effect.strength === 4
      )
    ),
    "Chani should use a structured Reveal troop-retreat strength effect",
  );
  assert.deepEqual(chani.traits, ["Faction: Fremen"], "Chani should keep her Fremen trait");
  assert.match(chani.play, /three or more units.*draw 1 Intrigue/i);
  assert.match(chani.reveal, /Fremen Bond.*\+2 persuasion.*retreat two troops.*4 strength/i);
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Reserve market should include Prepare The Way");
  const spiceMustFlow = data.reserveMarket.find((card) => card.sourceId === 538);
  assert.ok(spiceMustFlow, "Reserve market should include The Spice Must Flow");
  const overthrow = data.imperiumDeck.find((card) => card.name === "Overthrow");
  assert.ok(overthrow, "Imperium deck should include Overthrow");
  const priceIsNoObject = data.imperiumDeck.find((card) => card.name === "Price is No Object");
  assert.ok(priceIsNoObject, "Imperium deck should include Price is No Object");
  const guildSpy = data.imperiumDeck.find((card) => card.name === "Guild Spy");
  assert.ok(guildSpy, "Imperium deck should include Guild Spy");
  const spyNetwork = data.imperiumDeck.find((card) => card.name === "Spy Network");
  assert.ok(spyNetwork, "Imperium deck should include Spy Network");
  const shishakli = data.imperiumDeck.find((card) => card.name === "Shishakli");
  assert.ok(shishakli, "Imperium deck should include Shishakli");
  assert.equal(state.isPrepareTheWayCard(prepareTheWay), true, "Prepare The Way should be recognized");
  assert.deepEqual(
    data.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Reserve market should expose Prepare The Way and The Spice Must Flow",
  );
  assert.equal(prepareTheWay.cost, 2, "Prepare The Way should cost 2 persuasion");
  assert.deepEqual(prepareTheWay.icons, ["landsraad", "city"], "Prepare The Way should send Agents to Landsraad and City spaces");
  assert.equal(prepareTheWay.persuasion, 2, "Prepare The Way should reveal for 2 persuasion");
  assert.equal(prepareTheWay.conditionalPersuasion, false, "Prepare The Way should not require manual reveal handling");
  assert.ok(
    prepareTheWay.effects?.some((spec) => spec.trigger === "agent-play"),
    "Prepare The Way should use a structured Agent draw effect",
  );
  assert.deepEqual(prepareTheWay.traits, ["Faction: Bene Gesserit"], "Prepare The Way should keep its Bene Gesserit trait");
  assert.match(prepareTheWay.play, /2 or more Bene Gesserit Influence.*draw 1 card/i);
  assert.match(prepareTheWay.reveal, /\+2 persuasion/i);
  assert.equal(spiceMustFlow.acquired, 1, "The Spice Must Flow should keep its legacy acquisition VP display");
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-vp" && effect.amount === 1)
    ),
    "The Spice Must Flow should model its VP as a typed acquire effect",
  );
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 1)
    ),
    "The Spice Must Flow should model its acquire spice as a typed acquire effect",
  );
  assert.ok(
    spyNetwork.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "Spy Network should model its acquisition spy bonus as a typed acquire effect",
  );
  assert.ok(
    overthrow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "draw-intrigues" && effect.amount === 1)
    ),
    "Overthrow should model its acquisition Intrigue draw as a typed acquire effect",
  );
  assert.deepEqual(
    overthrow.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "gain-board-space-influence",
            selector: "self",
            amount: 1,
          },
        ],
      },
    ],
    "Overthrow should only model its Agent Faction-space Influence bonus as a typed effect",
  );
  assert.match(overthrow.play, /Gain two Influence instead of one/i);
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 2)
    ),
    "Price is No Object should model its acquisition Solari as a typed acquire effect",
  );
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.destination === "hand" &&
        effect.paymentResource === "solari" &&
        effect.optional === true
      )
    ),
    "Price is No Object should model its Solari-paid Agent acquisition as a typed effect",
  );
  assert.match(
    priceIsNoObject.play,
    /acquire a card to your hand using Solari instead of persuasion/i,
    "Price is No Object should expose its automated Agent acquire text in hand",
  );
  assert.deepEqual(
    guildSpy.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-card-for-draw",
            selector: "self",
            drawCards: 1,
            optional: false,
            bonusIntrigues: {
              requiredDiscardTrait: "Faction: Spacing Guild",
              amount: 1,
            },
          },
        ],
      },
    ],
    "Guild Spy should model its Agent discard-draw Intrigue bonus as a typed effect",
  );
  assert.match(guildSpy.play, /discard 1 card.*draw 1 card.*Spacing Guild.*draw 1 Intrigue card/i);
  assert.deepEqual(
    shishakli.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "trash-card",
            selector: "self",
            optional: true,
            zones: ["playArea"],
            sourceOnly: true,
            drawCardsReward: 1,
          },
        ],
      },
    ],
    "Shishakli should model its Agent source-trash draw as a typed effect",
  );
  assert.match(shishakli.play, /trash this card to draw 1 card/i);
  assert.ok(
    shishakli.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 2)
    ),
    "Shishakli should keep its fixed Reveal strength spec",
  );
  for (const name of ["Bene Gesserit Operative", "Cargo Runner", "Chani, Clever Tactician", "Guild Spy", "In High Places", "Maker Keeper", "Maula Pistol", "Northern Watermaster", "Overthrow", "Paracompass", "Price is No Object", "Shishakli"]) {
    const card = data.imperiumDeck.find((candidate) => candidate.name === name);
    assert.ok(card?.effects?.some((spec) => spec.trigger === "agent-play"), `${name} should use a structured Agent effect`);
  }
  const calculusTrashTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusTrashTarget, "Expected an Emperor Imperium card for Calculus of Power trash coverage");
  const calculusBlockedTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && !card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusBlockedTarget, "Expected a non-Emperor Imperium card for Calculus of Power filtering coverage");
  const fremenBondSupport = data.imperiumDeck.find((card) =>
    card.id !== chani.id && card.traits?.includes("Faction: Fremen")
  );
  assert.ok(fremenBondSupport, "Expected another Fremen Imperium card for Fremen Bond coverage");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin?.maker, "Imperial Basin should be a Maker board space");
  const carthag = data.boardSpaces.find((space) => space.id === "carthag");
  assert.ok(carthag, "Carthag should exist for Prepare The Way Agent coverage");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(highCouncil, "High Council should exist for Captured Mentat Agent coverage");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(secrets, "Secrets should exist for Bene Gesserit Operative Agent coverage");
  const p2 = playerById(game, "p2");
  const p4 = playerById(game, "p4");
  const p6 = playerById(game, "p6");
  const dune = [...p2.hand, ...p2.deck, ...p2.discard].find((card) => card.name === "Dune, The Desert Planet");
  assert.ok(dune, "Feyd should have Dune, The Desert Planet available for a Spice Trade Agent turn");

  const chaniRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniRevealPlan = turnActions.revealTurnPlan(playerById(chaniRevealFixture, p2.id), chaniRevealFixture);
  assert.equal(chaniRevealPlan.persuasion, 0, "Chani should not automatically grant Fremen Bond persuasion");
  assert.equal(chaniRevealPlan.swords, 0, "Chani should not automatically grant troop-retreat strength");
  assert.deepEqual(
    chaniRevealPlan.printedRevealCards,
    [],
    "Chani should not queue manual printed reveal adjustment",
  );
  const chaniRevealed = turnActions.revealTurnAction(chaniRevealFixture, {
    commanderTargets: {},
    revealPlan: chaniRevealPlan,
  });
  assert.equal(chaniRevealed.pendingAction, undefined, "Chani reveal should not pause for printed text");
  assert.equal(chaniRevealed.pendingQueue.length, 0, "Chani should not queue troop retreat without two deployed troops");
  const chaniFremenSupport = {
    ...fremenBondSupport,
    id: "chani-fremen-bond-support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
    conditionalPersuasion: false,
    conditionalSwords: false,
  };
  const chaniHandBondPlan = turnActions.revealTurnPlan(
    {
      ...playerById(chaniRevealFixture, p2.id),
      hand: [chani, chaniFremenSupport],
      playArea: [],
      highCouncilSeat: false,
    },
    chaniRevealFixture,
  );
  assert.equal(chaniHandBondPlan.persuasion, 2, "Chani Fremen Bond should count another revealed Fremen card");
  const chaniPlayAreaBondPlan = turnActions.revealTurnPlan(
    {
      ...playerById(chaniRevealFixture, p2.id),
      hand: [chani],
      playArea: [chaniFremenSupport],
      highCouncilSeat: false,
    },
    chaniRevealFixture,
  );
  assert.equal(chaniPlayAreaBondPlan.persuasion, 2, "Chani Fremen Bond should count another Fremen card already in play");

  const chaniOneTroopFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 2,
    deployedTroops: 1,
    discard: [],
    garrison: 0,
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniOneTroopPlan = turnActions.revealTurnPlan(playerById(chaniOneTroopFixture, p2.id), chaniOneTroopFixture);
  const chaniOneTroopRevealed = turnActions.revealTurnAction(chaniOneTroopFixture, {
    commanderTargets: {},
    revealPlan: chaniOneTroopPlan,
  });
  assert.equal(chaniOneTroopRevealed.pendingQueue.length, 0, "Chani should not queue troop retreat with only one deployed troop");

  const chaniRetreatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedTroops: 2,
    discard: [],
    garrison: 0,
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniRetreatPlan = turnActions.revealTurnPlan(playerById(chaniRetreatFixture, p2.id), chaniRetreatFixture);
  const chaniRetreatRevealed = turnActions.revealTurnAction(chaniRetreatFixture, {
    commanderTargets: {},
    revealPlan: chaniRetreatPlan,
  });
  assert.equal(chaniRetreatRevealed.pendingAction?.kind, "retreat-troops-for-strength", "Chani troop retreat should be the active reveal pending action");
  assert.equal(
    chaniRetreatRevealed.pendingQueue.length,
    0,
    "Chani should not queue manual Fremen Bond before troop retreat",
  );
  assert.equal(
    chaniRetreatRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniRetreatRevealed.pendingAction.troopCount
      : undefined,
    2,
    "Chani retreat pending action should require two troops",
  );
  assert.equal(
    chaniRetreatRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniRetreatRevealed.pendingAction.strength
      : undefined,
    4,
    "Chani retreat pending action should add four strength",
  );
  const chaniRetreated = state.resolveRetreatTroopsForStrength(chaniRetreatRevealed, chaniRetreatRevealed.pendingAction);
  assert.equal(playerById(chaniRetreated, p2.id).deployedTroops, 0, "Chani should retreat the two selected troops");
  assert.equal(playerById(chaniRetreated, p2.id).garrison, 2, "Chani should return retreated troops to garrison");
  assert.equal(playerById(chaniRetreated, p2.id).conflict, 4, "Chani should replace the troops' strength with four Reveal strength");
  assert.equal(chaniRetreated.pendingAction, undefined, "Chani retreat should clear its pending action");

  const syntheticRetreatState = {
    ...chaniRetreatFixture,
    pendingAction: {
      kind: "retreat-troops-for-strength",
      ownerId: p2.id,
      combatRecipientId: p2.id,
      troopCount: 1,
      strength: 4,
      optional: true,
      source: "Synthetic retreat verifier",
    },
  };
	  const syntheticRetreated = state.resolveRetreatTroopsForStrength(
	    syntheticRetreatState,
	    syntheticRetreatState.pendingAction,
	  );
	  assert.equal(playerById(syntheticRetreated, p2.id).deployedTroops, 1, "Synthetic retreat should remove the requested troop count");
	  assert.equal(playerById(syntheticRetreated, p2.id).garrison, 1, "Synthetic retreat should return exactly one troop to garrison");
	  assert.equal(playerById(syntheticRetreated, p2.id).conflict, 6, "Synthetic retreat should subtract troop strength and add printed strength");
	  const nonOptionalSkip = state.skipRetreatTroopsForStrength(
	    { ...syntheticRetreatState, pendingAction: { ...syntheticRetreatState.pendingAction, optional: false } },
	    { ...syntheticRetreatState.pendingAction, optional: false },
	  );
	  assert.equal(
	    nonOptionalSkip.pendingAction?.kind,
	    "retreat-troops-for-strength",
	    "Mandatory retreat-for-strength pending actions should not be skippable",
	  );

  const chaniCommanderRetreatFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniCommanderRetreatState = {
    ...chaniCommanderRetreatFixture,
    players: chaniCommanderRetreatFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
        : player,
    ),
  };
  const chaniCommanderRetreatPlan = turnActions.revealTurnPlan(
    playerById(chaniCommanderRetreatState, p4.id),
    chaniCommanderRetreatState,
  );
  const chaniCommanderRevealed = turnActions.revealTurnAction(chaniCommanderRetreatState, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: chaniCommanderRetreatPlan,
  });
  assert.equal(
    chaniCommanderRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniCommanderRevealed.pendingAction.combatRecipientId
      : undefined,
    p2.id,
    "Commander Chani reveal should route troop retreat to the activated Ally",
  );
  const chaniCommanderRetreated = state.resolveRetreatTroopsForStrength(
    chaniCommanderRevealed,
    chaniCommanderRevealed.pendingAction,
  );
  assert.equal(playerById(chaniCommanderRetreated, p2.id).deployedTroops, 0, "Commander Chani should retreat the activated Ally's troops");
  assert.equal(playerById(chaniCommanderRetreated, p2.id).garrison, 2, "Commander Chani should return activated Ally troops to garrison");
  assert.equal(playerById(chaniCommanderRetreated, p2.id).conflict, 4, "Commander Chani should add strength to the activated Ally");

  const prepareBuyFixture = withActivePlayer(game, p2.id, () => ({
    revealed: true,
    persuasion: 2,
  }));
  const prepareBought = state.acquireMarketCard(prepareBuyFixture, p2.id, prepareTheWay.id);
  assert.equal(playerById(prepareBought, p2.id).persuasion, 0, "Prepare The Way should spend 2 persuasion");
  assert.equal(playerById(prepareBought, p2.id).vp, p2.vp, "Prepare The Way should not award acquisition VP");
  assert.equal(playerById(prepareBought, p2.id).discard.at(-1).sourceId, 537, "Prepare The Way should go to discard");
  assert.notEqual(
    playerById(prepareBought, p2.id).discard.at(-1).id,
    prepareTheWay.id,
    "Reserve acquisitions should create a physical card copy",
  );
  assert.deepEqual(
    prepareBought.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Buying Prepare The Way should leave the reserve stack available",
  );

  const spiceBuyFixture = withActivePlayer(game, p2.id, (player) => ({
    revealed: true,
    persuasion: 9,
    resources: { ...player.resources, spice: 0 },
    vp: 0,
  }));
  const spiceBought = state.acquireMarketCard(spiceBuyFixture, p2.id, spiceMustFlow.id);
  const spiceBuyer = playerById(spiceBought, p2.id);
  assert.equal(spiceBuyer.persuasion, 0, "The Spice Must Flow should spend 9 persuasion");
  assert.equal(spiceBuyer.vp, 1, "The Spice Must Flow should award exactly one VP through acquire specs");
  assert.equal(spiceBuyer.resources.spice, 1, "The Spice Must Flow should award its acquire spice bonus");
  assert.equal(spiceBought.turnSpiceGains[p2.id], 1, "The Spice Must Flow acquire spice should count as turn spice gain");
  assert.equal(spiceBuyer.discard.at(-1).sourceId, 538, "The Spice Must Flow should go to discard when bought");
  assert.notEqual(
    spiceBuyer.discard.at(-1).id,
    spiceMustFlow.id,
    "The Spice Must Flow reserve acquisitions should create a physical card copy",
  );
  assert.match(spiceBought.log[0], /acquires The Spice Must Flow for 1 VP and gains 1 spice/);

  const overthrowReplacement = data.imperiumDeck.find((card) => card.id !== overthrow.id);
  const overthrowIntrigue = { ...data.intrigueCards[0], id: "overthrow-acquire-intrigue" };
  assert.ok(overthrowReplacement, "Expected an Imperium row replacement card for Overthrow purchase coverage");
  assert.ok(overthrowIntrigue.name, "Expected an Intrigue card for Overthrow acquire coverage");
  const overthrowBuyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      revealed: true,
      persuasion: overthrow.cost,
      discard: [],
      intrigues: [],
    })),
    imperiumRow: [overthrow],
    intrigueDeck: [overthrowIntrigue],
    intrigueDiscard: [],
    marketDeck: [overthrowReplacement],
  };
  const overthrowBought = state.acquireMarketCard(overthrowBuyFixture, p2.id, overthrow.id);
  const overthrowBuyer = playerById(overthrowBought, p2.id);
  assert.equal(overthrowBuyer.persuasion, 0, "Overthrow should spend its persuasion cost");
  assert.equal(overthrowBuyer.discard.at(-1).id, overthrow.id, "Overthrow should go to discard when bought from the row");
  assert.equal(overthrowBuyer.intrigues.at(-1).id, overthrowIntrigue.id, "Overthrow acquire bonus should draw one Intrigue");
  assert.equal(overthrowBought.intrigueDeck.length, 0, "Overthrow acquire bonus should consume the Intrigue deck");
  assert.match(overthrowBought.log[0], /draws an Intrigue card from Overthrow/);
  assert.match(overthrowBought.log[1], /acquires Overthrow/);

  const priceReplacement = data.imperiumDeck.find((card) => card.id !== priceIsNoObject.id);
  assert.ok(priceReplacement, "Expected an Imperium row replacement card for Price is No Object purchase coverage");
  const priceBuyFixture = {
    ...withActivePlayer(game, p2.id, (player) => ({
      revealed: true,
      persuasion: priceIsNoObject.cost,
      discard: [],
      resources: { ...player.resources, solari: 0 },
    })),
    imperiumRow: [priceIsNoObject],
    marketDeck: [priceReplacement],
  };
  const priceBought = state.acquireMarketCard(priceBuyFixture, p2.id, priceIsNoObject.id);
  const priceBuyer = playerById(priceBought, p2.id);
  assert.equal(priceBuyer.persuasion, 0, "Price is No Object should spend its persuasion cost");
  assert.equal(priceBuyer.resources.solari, 2, "Price is No Object acquire bonus should award 2 Solari");
  assert.equal(priceBuyer.discard.at(-1).id, priceIsNoObject.id, "Price is No Object should go to discard when bought from the row");
  assert.match(priceBought.log[0], /acquires Price is No Object and gains 2 Solari/);

  const priceAgentAcquireTarget = { ...beneGesseritOperative, id: "price-agent-bene-gesserit-operative" };
  const priceAgentBlockedTarget = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    (card.cost ?? 0) > priceAgentAcquireTarget.cost
  );
  assert.ok(priceAgentBlockedTarget, "Expected an unaffordable Imperium card for Price is No Object Agent coverage");
  const priceAgentReplacement = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    card.id !== priceAgentBlockedTarget.id
  );
  assert.ok(priceAgentReplacement, "Expected an Imperium row replacement card for Price is No Object Agent coverage");
  const priceAgentFixture = {
    ...withActivePlayer(game, p2.id, (player) => ({
      agentsReady: 1,
      discard: [],
      hand: [priceIsNoObject],
      playArea: [],
      persuasion: 0,
      resources: { ...player.resources, solari: priceAgentAcquireTarget.cost },
    })),
    imperiumRow: [priceAgentAcquireTarget, priceAgentBlockedTarget],
    marketDeck: [priceAgentReplacement],
  };
  const priceAgentPlayed = turnActions.placeAgentAction(priceAgentFixture, {
    commanderTargets: {},
    selectedCard: priceIsNoObject,
    selectedSpace: secrets,
  });
  const priceAgentPending = priceAgentPlayed.pendingAction;
  assert.equal(priceAgentPending?.kind, "acquire-card", "Price is No Object Agent play should queue an acquire-card choice");
  assert.equal(priceAgentPending.ownerId, p2.id);
  assert.equal(priceAgentPending.source, "Price is No Object");
  assert.equal(priceAgentPending.destination, "hand");
  assert.equal(priceAgentPending.paymentResource, "solari");
  assert.equal(priceAgentPending.optional, true);
  assert.equal(priceAgentPending.maxCost, undefined);
  const priceAgentChoices = state.acquirableCardsForPending(priceAgentPlayed, priceAgentPending);
  assert.ok(
    priceAgentChoices.some((card) => card.id === priceAgentAcquireTarget.id),
    "Price is No Object should offer affordable Imperium Row cards",
  );
  assert.equal(
    priceAgentChoices.some((card) => card.id === priceAgentBlockedTarget.id),
    false,
    "Price is No Object should exclude Imperium Row cards that cost more Solari than the owner has",
  );
  assert.ok(
    priceAgentChoices.every((card) => (card.cost ?? 0) <= priceAgentAcquireTarget.cost),
    "Price is No Object should only offer cards affordable with Solari",
  );
  assert.equal(
    state.finishPendingAction(priceAgentPlayed).pendingAction,
    undefined,
    "Price is No Object's optional acquire-card pending should be skippable",
  );
  const priceAgentResolved = state.acquireCardForPending(
    priceAgentPlayed,
    priceAgentPending,
    priceAgentAcquireTarget.id,
  );
  const priceAgentOwner = playerById(priceAgentResolved, p2.id);
  assert.equal(
    priceAgentOwner.resources.solari,
    0,
    "Price is No Object Agent acquire should spend the acquired card's printed cost in Solari",
  );
  assert.equal(priceAgentOwner.persuasion, 0, "Price is No Object Agent acquire should not spend persuasion");
  assert.equal(
    priceAgentOwner.hand.at(-1).id,
    priceAgentAcquireTarget.id,
    "Price is No Object Agent acquire should put the selected card into hand",
  );
  assert.match(
    priceAgentResolved.log[0],
    /acquires Bene Gesserit Operative to their hand for 3 Solari from Price is No Object/,
  );
  const priceAgentNoSolari = turnActions.placeAgentAction(
    {
      ...priceAgentFixture,
      players: priceAgentFixture.players.map((player) =>
        player.id === p2.id
          ? { ...player, resources: { ...player.resources, solari: 0 } }
          : player,
      ),
      pendingAction: undefined,
      pendingQueue: [],
    },
    {
      commanderTargets: {},
      selectedCard: priceIsNoObject,
      selectedSpace: secrets,
    },
  );
  assert.notEqual(
    priceAgentNoSolari.pendingAction?.kind,
    "acquire-card",
    "Price is No Object should not queue an acquire-card choice without enough Solari for any card",
  );
  const unconstrainedAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Unconstrained Acquire",
    destination: "hand",
    optional: true,
  };
  const unconstrainedAcquireFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      resources: { solari: 99, spice: 0, water: 0 },
    })),
    imperiumRow: [priceAgentAcquireTarget],
    marketDeck: [priceAgentReplacement],
    pendingAction: unconstrainedAcquirePending,
    pendingQueue: [],
  };
  assert.deepEqual(
    state.acquirableCardsForPending(unconstrainedAcquireFixture, unconstrainedAcquirePending),
    [],
    "Unconstrained acquire-card pendings should expose no eligible cards",
  );
  const unconstrainedResolved = state.acquireCardForPending(
    unconstrainedAcquireFixture,
    unconstrainedAcquirePending,
    priceAgentAcquireTarget.id,
  );
  assert.equal(
    playerById(unconstrainedResolved, p2.id).hand.length,
    0,
    "Unconstrained acquire-card pendings should not resolve acquisitions",
  );
  assert.equal(
    unconstrainedResolved.pendingAction,
    unconstrainedAcquirePending,
    "Unconstrained acquire-card pendings should remain unresolved",
  );
  const malformedAcquirePendingBase = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Malformed Acquire",
    maxCost: priceAgentAcquireTarget.cost,
    optional: true,
  };
  const invalidDestinationAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "deck",
  };
  const missingSourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: undefined,
  };
  const nonStringSourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: 17,
  };
  const emptySourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: "  ",
  };
  const nonStringOwnerAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    ownerId: 17,
  };
  const invalidResourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    paymentResource: "melange",
  };
  const stringCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: String(priceAgentAcquireTarget.cost),
  };
  const negativeCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: -1,
  };
  const nanCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: Number.NaN,
  };
  const negativeMinCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    minCost: -1,
  };
  const invertedCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    minCost: priceAgentAcquireTarget.cost + 1,
    maxCost: priceAgentAcquireTarget.cost,
  };
  const stringOptionalAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    optional: "true",
  };
  for (const malformedPending of [
    invalidDestinationAcquirePending,
    missingSourceAcquirePending,
    nonStringSourceAcquirePending,
    emptySourceAcquirePending,
    nonStringOwnerAcquirePending,
    invalidResourceAcquirePending,
    stringCostAcquirePending,
    negativeCostAcquirePending,
    nanCostAcquirePending,
    negativeMinCostAcquirePending,
    invertedCostAcquirePending,
    stringOptionalAcquirePending,
  ]) {
    const malformedFixture = {
      ...unconstrainedAcquireFixture,
      pendingAction: malformedPending,
    };
    assert.deepEqual(
      state.acquirableCardsForPending(malformedFixture, malformedPending),
      [],
      "Malformed acquire-card pendings should expose no eligible cards",
    );
    const malformedResolved = state.acquireCardForPending(
      malformedFixture,
      malformedPending,
      priceAgentAcquireTarget.id,
    );
    assert.equal(
      playerById(malformedResolved, p2.id).hand.length,
      0,
      "Malformed acquire-card pendings should not resolve acquisitions",
    );
    assert.equal(
      malformedResolved.pendingAction,
      malformedPending,
      "Malformed acquire-card pendings should remain unresolved",
    );
  }
  assert.equal(
    state.finishPendingAction({
      ...unconstrainedAcquireFixture,
      pendingAction: stringOptionalAcquirePending,
    }).pendingAction,
    stringOptionalAcquirePending,
    "Acquire-card pending skip should require optional to be boolean true",
  );
  const forgedAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Forged Acquire",
    maxCost: priceAgentAcquireTarget.cost,
    destination: "hand",
  };
  const forgedAcquireFixture = {
    ...unconstrainedAcquireFixture,
    pendingAction: undefined,
  };
  const forgedResolved = state.acquireCardForPending(
    forgedAcquireFixture,
    forgedAcquirePending,
    priceAgentAcquireTarget.id,
  );
  assert.equal(
    playerById(forgedResolved, p2.id).hand.length,
    0,
    "Acquire-card resolution should require the active pending object",
  );
  assert.equal(
    forgedResolved.pendingAction,
    undefined,
    "Forged acquire-card resolution should leave pending state untouched",
  );

  const spyNetworkReplacement = data.imperiumDeck.find((card) => card.id !== spyNetwork.id);
  assert.ok(spyNetworkReplacement, "Expected an Imperium row replacement card for Spy Network purchase coverage");
  const spyNetworkBuyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      revealed: true,
      persuasion: spyNetwork.cost,
      discard: [],
      spies: 1,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    spyPosts: {},
    sharedSpyPosts: {},
  };
  const spyNetworkBought = state.acquireMarketCard(spyNetworkBuyFixture, p2.id, spyNetwork.id);
  const spyNetworkBuyer = playerById(spyNetworkBought, p2.id);
  assert.equal(spyNetworkBuyer.persuasion, 0, "Spy Network should spend its persuasion cost");
  assert.equal(spyNetworkBuyer.discard.at(-1).id, spyNetwork.id, "Spy Network should go to discard when bought from the row");
  assert.deepEqual(
    spyNetworkBought.imperiumRow.map((card) => card.id),
    [spyNetworkReplacement.id],
    "Buying Spy Network from the row should draw a replacement",
  );
  assert.equal(spyNetworkBought.pendingAction?.kind, "spy", "Buying Spy Network should queue a spy placement");
  assert.equal(spyNetworkBought.pendingAction.ownerId, p2.id);
  assert.equal(spyNetworkBought.pendingAction.source, "Spy Network");
  assert.equal(spyNetworkBought.pendingAction.remaining, 1);
  assert.equal(spyNetworkBought.pendingAction.recallForSupply, true);
  assert.equal(spyNetworkBought.pendingAction.mustPlaceSpy, true);
  const spyNetworkSpyPlaced = state.placeSpyForPending(
    spyNetworkBought,
    spyNetworkBought.pendingAction,
    highCouncil.id,
  );
  assert.equal(spyNetworkSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(spyNetworkSpyPlaced, p2.id).spies, 0, "Spy Network acquire bonus should spend one spy");
  assert.equal(spyNetworkSpyPlaced.spyPosts[highCouncil.id], p2.id, "Spy Network acquire bonus should place the selected spy");
  assert.match(spyNetworkSpyPlaced.log[0], /places a spy near High Council from Spy Network/);

  const spiceAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: 9,
    destination: "hand",
  };
  const spicePendingFixtureBase = withActivePlayer(game, p2.id, (player) => ({
    resources: { ...player.resources, spice: 0 },
    vp: 0,
  }));
  const spicePendingFixture = {
    ...spicePendingFixtureBase,
    pendingAction: spiceAcquirePending,
    pendingQueue: [],
  };
  const spicePendingAcquired = state.acquireCardForPending(spicePendingFixture, spiceAcquirePending, spiceMustFlow.id);
  const spicePendingOwner = playerById(spicePendingAcquired, p2.id);
  assert.equal(spicePendingOwner.vp, 1, "Acquire-card pending actions should award The Spice Must Flow VP");
  assert.equal(spicePendingOwner.resources.spice, 1, "Acquire-card pending actions should award The Spice Must Flow spice");
  assert.equal(spicePendingAcquired.turnSpiceGains[p2.id], 1, "Acquire-card pending spice should count as turn spice gain");
  assert.equal(spicePendingOwner.hand.at(-1).sourceId, 538, "Acquire-card pending should honor the requested destination");
  assert.equal(spicePendingAcquired.pendingAction, undefined, "Acquire-card pending should advance after acquisition");
  assert.match(
    spicePendingAcquired.log[0],
    /acquires The Spice Must Flow to their hand from Verifier Acquire for 1 VP and gains 1 spice/,
  );

  const overthrowAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: overthrow.cost,
    destination: "hand",
  };
  const overthrowPendingIntrigue = { ...data.intrigueCards[1], id: "overthrow-pending-acquire-intrigue" };
  assert.ok(overthrowPendingIntrigue.name, "Expected an Intrigue card for pending Overthrow acquire coverage");
  const overthrowPendingFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      intrigues: [],
    })),
    imperiumRow: [overthrow],
    intrigueDeck: [overthrowPendingIntrigue],
    intrigueDiscard: [],
    marketDeck: [overthrowReplacement],
    pendingAction: overthrowAcquirePending,
    pendingQueue: [],
  };
  const overthrowPendingAcquired = state.acquireCardForPending(
    overthrowPendingFixture,
    overthrowAcquirePending,
    overthrow.id,
  );
  const overthrowPendingOwner = playerById(overthrowPendingAcquired, p2.id);
  assert.equal(overthrowPendingOwner.hand.at(-1).id, overthrow.id, "Acquire-card pending should honor Overthrow hand destination");
  assert.equal(
    overthrowPendingOwner.intrigues.at(-1).id,
    overthrowPendingIntrigue.id,
    "Acquire-card pending should apply Overthrow acquire Intrigue reward",
  );
  assert.match(overthrowPendingAcquired.log[0], /draws an Intrigue card from Overthrow/);
  assert.match(overthrowPendingAcquired.log[1], /acquires Overthrow to their hand from Verifier Acquire/);
  assert.equal(overthrowPendingAcquired.pendingAction, undefined, "Overthrow acquire-card pending should advance after acquisition");

  const queuedAfterAcquire = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Queued Verifier",
    optional: false,
    zones: ["hand"],
  };
  const spyAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: spyNetwork.cost,
    destination: "hand",
  };
  const spyPendingAcquireFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      spies: 1,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    pendingAction: spyAcquirePending,
    pendingQueue: [queuedAfterAcquire],
    spyPosts: {},
    sharedSpyPosts: {},
  };
  const spyPendingAcquired = state.acquireCardForPending(spyPendingAcquireFixture, spyAcquirePending, spyNetwork.id);
  const spyPendingOwner = playerById(spyPendingAcquired, p2.id);
  assert.equal(spyPendingOwner.hand.at(-1).id, spyNetwork.id, "Acquire-card pending should honor Spy Network hand destination");
  assert.equal(spyPendingAcquired.pendingAction?.kind, "spy", "Acquire-card pending should immediately queue Spy Network spy bonus");
  assert.equal(spyPendingAcquired.pendingAction.source, "Spy Network");
  assert.equal(spyPendingAcquired.pendingQueue[0], queuedAfterAcquire, "Spy Network acquire bonus should resolve before existing queued prompts");

  const queuedSpyAfterAcquire = {
    kind: "spy",
    ownerId: p2.id,
    remaining: 1,
    recallForSupply: true,
    mustPlaceSpy: true,
    source: "Queued Spy",
  };
  const spyPendingAcquireRecallFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      spies: 0,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    pendingAction: spyAcquirePending,
    pendingQueue: [queuedSpyAfterAcquire],
    spyPosts: { [highCouncil.id]: p2.id },
    sharedSpyPosts: {},
  };
  const spyPendingAcquiredWithRecall = state.acquireCardForPending(
    spyPendingAcquireRecallFixture,
    spyAcquirePending,
    spyNetwork.id,
  );
  assert.equal(
    spyPendingAcquiredWithRecall.pendingAction?.remaining,
    2,
    "Merged recall-for-supply spy rewards should not cap remaining to zero when supply is empty",
  );
  assert.equal(spyPendingAcquiredWithRecall.pendingAction.mustPlaceSpy, true);
  assert.deepEqual(
    state.recallableSpySupplySpaces(spyPendingAcquiredWithRecall, spyPendingAcquiredWithRecall.pendingAction).map((space) => space.id),
    [highCouncil.id],
    "Merged acquire spy rewards should expose recall-for-supply choices instead of deadlocking",
  );
  const spyPendingRecallResolved = state.recallSpyForSupplyForPending(
    spyPendingAcquiredWithRecall,
    spyPendingAcquiredWithRecall.pendingAction,
    highCouncil.id,
  );
  const spyPendingRecallPlaced = state.placeSpyForPending(
    spyPendingRecallResolved,
    spyPendingRecallResolved.pendingAction,
    secrets.id,
  );
  assert.equal(
    spyPendingRecallPlaced.pendingAction?.remaining,
    1,
    "Merged recall-for-supply spy rewards should remain resolvable after placing the recalled spy",
  );
  assert.equal(spyPendingRecallPlaced.pendingAction.mustPlaceSpy, false);
  assert.equal(
    state.finishPendingAction(spyPendingRecallPlaced).pendingAction,
    undefined,
    "Remaining merged recall-for-supply spy rewards should be skippable after the mandatory placement resolves",
  );

  const prepareDrawCard = { ...calculusTrashTarget, id: "prepare-way-draw-target" };
  const prepareAgentFixture = withActivePlayer(game, p2.id, (player) => ({
    agentsReady: 1,
    deck: [prepareDrawCard],
    discard: [],
    garrison: 0,
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 2 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const prepared = turnActions.placeAgentAction(prepareAgentFixture, {
    commanderTargets: {},
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(playerById(prepared, p2.id).hand.length, 1, "Prepare The Way should draw 1 card at 2 Bene Gesserit Influence");
  assert.equal(playerById(prepared, p2.id).hand[0].id, prepareDrawCard.id);
  assert.ok(playerById(prepared, p2.id).playArea.some((card) => card.id === prepareTheWay.id));
  assert.ok(prepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

  const unprepared = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, (player) => ({
      agentsReady: 1,
      deck: [prepareDrawCard],
      discard: [],
      garrison: 0,
      hand: [prepareTheWay],
      influence: { ...player.influence, bene: 1 },
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: prepareTheWay, selectedSpace: carthag },
  );
  assert.equal(playerById(unprepared, p2.id).hand.length, 0, "Prepare The Way should not draw below 2 Bene Gesserit Influence");
  assert.equal(
    unprepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)),
    false,
    "Prepare The Way should not log a draw when the threshold is unmet",
  );

  const operativeFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const operativePlayed = turnActions.placeAgentAction(operativeFixture, {
    commanderTargets: {},
    selectedCard: beneGesseritOperative,
    selectedSpace: secrets,
  });
  assert.equal(operativePlayed.pendingAction?.kind, "spy", "Bene Gesserit Operative should queue spy placement");
  assert.equal(operativePlayed.pendingAction.ownerId, p2.id);
  assert.equal(operativePlayed.pendingAction.source, "Bene Gesserit Operative");
  assert.equal(operativePlayed.pendingAction.remaining, 1);
  assert.equal(operativePlayed.pendingAction.mustPlaceSpy, true);
  assert.equal(state.finishPendingAction(operativePlayed), operativePlayed, "Bene Gesserit Operative spy placement should be mandatory");
  const operativeSpyPlaced = state.placeSpyForPending(operativePlayed, operativePlayed.pendingAction, highCouncil.id);
  assert.equal(operativeSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(operativeSpyPlaced, p2.id).spies, 2, "Bene Gesserit Operative should spend one spy from supply");
  assert.equal(operativeSpyPlaced.spyPosts[highCouncil.id], p2.id, "Bene Gesserit Operative should place the selected spy");
  assert.match(operativeSpyPlaced.log[0], /places a spy near High Council from Bene Gesserit Operative/);

  const operativeNoSupplyBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 0,
  }));
  const operativeNoSupplyPlayed = turnActions.placeAgentAction(
    {
      ...operativeNoSupplyBase,
      spyPosts: { [highCouncil.id]: p2.id },
    },
    { commanderTargets: {}, selectedCard: beneGesseritOperative, selectedSpace: secrets },
  );
  assert.equal(operativeNoSupplyPlayed.pendingAction?.kind, "spy", "Bene Gesserit Operative should allow recalling for spy supply");
  assert.equal(operativeNoSupplyPlayed.pendingAction.recallForSupply, true);
  assert.deepEqual(
    state.recallableSpySupplySpaces(operativeNoSupplyPlayed, operativeNoSupplyPlayed.pendingAction).map((space) => space.id),
    [highCouncil.id],
    "Bene Gesserit Operative should expose owned spies when supply is empty",
  );
  const operativeSupplyRecalled = state.recallSpyForSupplyForPending(
    operativeNoSupplyPlayed,
    operativeNoSupplyPlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(playerById(operativeSupplyRecalled, p2.id).spies, 1);
  assert.equal(operativeSupplyRecalled.spyPosts[highCouncil.id], undefined);
  assert.equal(operativeSupplyRecalled.pendingAction.mustPlaceSpy, true);
  const operativeAfterSupplyRecallPlaced = state.placeSpyForPending(
    operativeSupplyRecalled,
    operativeSupplyRecalled.pendingAction,
    secrets.id,
  );
  assert.equal(playerById(operativeAfterSupplyRecallPlaced, p2.id).spies, 0);
  assert.equal(operativeAfterSupplyRecallPlaced.spyPosts[secrets.id], p2.id);

  const operativeNoSpy = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [beneGesseritOperative],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 0,
    })),
    { commanderTargets: {}, selectedCard: beneGesseritOperative, selectedSpace: secrets },
  );
  assert.equal(operativeNoSpy.pendingAction, undefined, "Bene Gesserit Operative should not pause without supply or an owned spy");

  const commanderOperativeBase = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const commanderOperativePlayed = turnActions.placeAgentAction(commanderOperativeBase, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: beneGesseritOperative,
    selectedSpace: secrets,
  });
  assert.equal(commanderOperativePlayed.pendingAction?.kind, "spy", "Commander Bene Gesserit Operative should queue spy placement");
  assert.equal(commanderOperativePlayed.pendingAction.ownerId, p4.id, "Commander should own the Operative spy placement");
  assert.equal(commanderOperativePlayed.pendingAction.source, "Bene Gesserit Operative");
  const commanderOperativeSpyPlaced = state.placeSpyForPending(
    commanderOperativePlayed,
    commanderOperativePlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(playerById(commanderOperativeSpyPlaced, p4.id).spies, 2, "Commander Operative should spend a Commander spy");
  assert.equal(
    playerById(commanderOperativeSpyPlaced, p2.id).spies,
    playerById(commanderOperativePlayed, p2.id).spies,
    "Commander Operative should not spend the activated Ally's spy",
  );
  assert.equal(commanderOperativeSpyPlaced.spyPosts[highCouncil.id], p4.id);

  const operativeRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const operativeRevealPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  });
  assert.equal(operativeRevealPlan.persuasion, 3, "Bene Gesserit Operative should reveal for 3 persuasion with two spies");
  assert.deepEqual(
    operativeRevealPlan.printedRevealCards,
    [],
    "Bene Gesserit Operative should not require a manual printed reveal adjustment",
  );
  const operativeRevealed = turnActions.revealTurnAction(
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
    },
    { commanderTargets: {}, revealPlan: operativeRevealPlan },
  );
  assert.equal(playerById(operativeRevealed, p2.id).persuasion, 3);
  assert.equal(operativeRevealed.pendingAction, undefined);
  const operativeUnboostedPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id },
  });
  assert.equal(operativeUnboostedPlan.persuasion, 1, "Bene Gesserit Operative should reveal for 1 persuasion below two spies");
  const operativeTeamSpyPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p6.id },
  });
  assert.equal(operativeTeamSpyPlan.persuasion, 1, "Bene Gesserit Operative should ignore teammate spy posts on Reveal");
  const operativeSharedSpyPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
    sharedSpyPosts: { [secrets.id]: [p2.id] },
  });
  assert.equal(operativeSharedSpyPlan.persuasion, 3, "Bene Gesserit Operative should count shared spy posts owned by the revealer");
  const commanderOperativeRevealFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderAllySpyPlan = turnActions.revealTurnPlan(playerById(commanderOperativeRevealFixture, p4.id), {
    ...commanderOperativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  });
  assert.equal(commanderAllySpyPlan.persuasion, 1, "Commander Operative reveal should ignore the activated Ally's spy posts");
  const commanderOwnSpyPlan = turnActions.revealTurnPlan(playerById(commanderOperativeRevealFixture, p4.id), {
    ...commanderOperativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p4.id },
  });
  assert.equal(commanderOwnSpyPlan.persuasion, 3, "Commander Operative reveal should count the Commander's own spy posts");

  const capturedDiscardCard = { ...dune, id: "captured-mentat-discard-card" };
  const capturedDrawCard = { ...calculusTrashTarget, id: "captured-mentat-draw-card" };
  const capturedMentatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [capturedDrawCard],
    discard: [],
    hand: [capturedMentat, capturedDiscardCard],
    influence: { emperor: 0, spacing: 0, bene: 0, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(capturedMentat, playerById(capturedMentatFixture, p2.id), capturedMentatFixture),
    undefined,
    "Captured Mentat should only queue from play",
  );
  const capturedMentatPlayed = turnActions.placeAgentAction(capturedMentatFixture, {
    commanderTargets: {},
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.equal(
    capturedMentatPlayed.pendingAction?.kind,
    "discard-card-for-influence-and-draw",
    "Captured Mentat should queue its Agent choice",
  );
  assert.equal(capturedMentatPlayed.pendingAction.ownerId, p2.id);
  assert.equal(capturedMentatPlayed.pendingAction.drawCards, 1);
  assert.equal(capturedMentatPlayed.pendingAction.influenceAmount, 1);
  assert.equal(capturedMentatPlayed.pendingAction.optional, true);
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawDiscardChoices(
      playerById(capturedMentatPlayed, p2.id),
      capturedMentatPlayed.pendingAction,
    ).map((card) => card.id),
    [capturedDiscardCard.id],
    "Captured Mentat should discard from the remaining hand",
  );
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawChoices(playerById(capturedMentatPlayed, p2.id)),
    ["greatHouses", "spacing", "bene", "fringeWorlds"],
    "Ally Captured Mentat should choose among main-board Influence tracks",
  );
  assert.equal(
    state.resolveDiscardCardForInfluenceAndDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      "missing-card",
      "bene",
    ),
    capturedMentatPlayed,
    "Captured Mentat should reject missing discard cards",
  );
  assert.equal(
    state.resolveDiscardCardForInfluenceAndDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      capturedDiscardCard.id,
      "emperor",
    ),
    capturedMentatPlayed,
    "Captured Mentat should reject invalid Influence choices",
  );
  const capturedMentatResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    capturedMentatPlayed,
    capturedMentatPlayed.pendingAction,
    capturedDiscardCard.id,
    "bene",
  );
  assert.equal(capturedMentatResolved.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatResolved, p2.id).hand.map((card) => card.id), [capturedDrawCard.id]);
  assert.equal(playerById(capturedMentatResolved, p2.id).discard.at(-1).id, capturedDiscardCard.id);
  assert.equal(playerById(capturedMentatResolved, p2.id).influence.bene, 1);
  assert.ok(capturedMentatResolved.log.some((entry) => /Captured Mentat: discards .* gains 1 Bene Gesserit Influence.*draws 1 card/.test(entry)));
  const capturedMentatSkipped = state.skipDiscardCardForInfluenceAndDraw(capturedMentatPlayed, capturedMentatPlayed.pendingAction);
  assert.equal(capturedMentatSkipped.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatSkipped, p2.id).hand.map((card) => card.id), [capturedDiscardCard.id]);
  assert.equal(playerById(capturedMentatSkipped, p2.id).influence.bene, 0);

  const dangerousRhetoricFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    influence: { ...p2.influence, spacing: 1 },
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    vp: 0,
  }));
  const dangerousRhetoricPlayed = turnActions.placeAgentAction(dangerousRhetoricFixture, {
    commanderTargets: {},
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(
    dangerousRhetoricPlayed.pendingAction?.kind,
    "board-influence-choice",
    "Dangerous Rhetoric should queue its Agent Influence choice",
  );
  assert.equal(dangerousRhetoricPlayed.pendingAction.source, "Dangerous Rhetoric");
  assert.equal(dangerousRhetoricPlayed.pendingAction.trashSource, true);
  assert.equal(dangerousRhetoricPlayed.pendingAction.cardId, dangerousRhetoric.id);
  assert.equal(dangerousRhetoricPlayed.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricPlayed, p2.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementSpaceId,
    highCouncil.id,
    "Dangerous Rhetoric source card should record its Agent placement space",
  );
  assert.deepEqual(
    dangerousRhetoricPlayed.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
    "Dangerous Rhetoric should offer main-board Influence tracks to an Ally",
  );
  const dangerousRhetoricResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricPlayed,
    dangerousRhetoricPlayed.pendingAction,
    p2.id,
    "spacing",
  );
  assert.equal(dangerousRhetoricResolved.pendingAction, undefined);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).influence.spacing, 2);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).vp, 1);
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should trash itself after resolving",
  );
  assert.match(dangerousRhetoricResolved.log[0], /gains 1 Spacing Guild Influence from Dangerous Rhetoric/);
  for (const malformedPending of [
    { ...dangerousRhetoricPlayed.pendingAction, source: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, source: "  " },
    { ...dangerousRhetoricPlayed.pendingAction, amount: 0 },
    { ...dangerousRhetoricPlayed.pendingAction, amount: Number.NaN },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: "true" },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: true, cardId: undefined, cardOwnerId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: undefined, cardId: undefined, cardOwnerId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: true, cardId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, targetOwnerId: p4.id },
    { ...dangerousRhetoricPlayed.pendingAction, choices: "bene" },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [null] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: p2.id, faction: "guild" }] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: 17, faction: "bene" }] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: "missing-player", faction: "bene" }] },
  ]) {
    const malformedFixture = {
      ...dangerousRhetoricPlayed,
      pendingAction: malformedPending,
    };
    const malformedResolved = state.resolveBoardInfluenceChoice(
      malformedFixture,
      malformedPending,
      p2.id,
      "bene",
    );
    assert.equal(
      malformedResolved,
      malformedFixture,
      "Malformed board-influence-choice pendings should remain unresolved",
    );
  }
  const forgedBoardAmountPending = {
    kind: "board-influence-choice",
    source: "Forged Shipping",
    amount: 3,
    choices: [{ ownerId: p2.id, faction: "bene" }],
  };
  const forgedBoardAmountFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedBoardAmountPending,
  };
  const forgedBoardAmountResolved = state.resolveBoardInfluenceChoice(
    forgedBoardAmountFixture,
    forgedBoardAmountPending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardAmountResolved,
    forgedBoardAmountFixture,
    "Board-space Influence choices should not accept forged multi-Influence amounts without source-card metadata",
  );
  const forgedAmountBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    amount: 2,
  };
  const forgedAmountBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    { ...dangerousRhetoricPlayed, pendingAction: forgedAmountBoardInfluencePending },
    forgedAmountBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedAmountBoardInfluenceResolved.pendingAction,
    forgedAmountBoardInfluencePending,
    "Board Influence choice resolution should reject active trash-source pendings whose amount is not backed by the source card spec",
  );
  const forgedSourceCard = { ...capturedDiscardCard, id: "forged-board-influence-source-card" };
  const forgedSourceBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    cardId: forgedSourceCard.id,
  };
  const forgedSourceBoardInfluenceFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedSourceBoardInfluencePending,
    players: dangerousRhetoricPlayed.players.map((player) =>
      player.id === p2.id
        ? { ...player, playArea: [forgedSourceCard] }
        : player,
    ),
  };
  const forgedSourceBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    forgedSourceBoardInfluenceFixture,
    forgedSourceBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedSourceBoardInfluenceResolved,
    forgedSourceBoardInfluenceFixture,
    "Board Influence choice resolution should reject active trash-source pendings whose card does not carry a matching typed effect",
  );
  const forgedBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    source: "Forged Dangerous Rhetoric",
  };
  const forgedBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    { ...dangerousRhetoricPlayed, pendingAction: undefined },
    forgedBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardInfluenceResolved.pendingAction,
    undefined,
    "Board Influence choice resolution should require the active pending object",
  );

  const dangerousRhetoricCommanderFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const dangerousRhetoricCommanderPlayed = turnActions.placeAgentAction(dangerousRhetoricCommanderFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction?.kind, "board-influence-choice");
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction.targetOwnerId, p2.id);
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricCommanderPlayed, p4.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementTargetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric source card should record the activated Ally target",
  );
  assert.deepEqual(
    dangerousRhetoricCommanderPlayed.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p4.id}:emperor`, `${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
  );
  const dangerousRhetoricForgedAllyPending = {
    ...dangerousRhetoricCommanderPlayed.pendingAction,
    choices: dangerousRhetoricCommanderPlayed.pendingAction.choices.map((choice) =>
      choice.ownerId === p2.id ? { ...choice, ownerId: p6.id } : choice,
    ),
  };
  const dangerousRhetoricForgedAllyFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedAllyPending,
  };
  const dangerousRhetoricForgedAllyResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricForgedAllyFixture,
    dangerousRhetoricForgedAllyPending,
    p6.id,
    "bene",
  );
  assert.equal(
    dangerousRhetoricForgedAllyResolved,
    dangerousRhetoricForgedAllyFixture,
    "Commander Dangerous Rhetoric should reject forged choices for a different same-team Ally",
  );
  const dangerousRhetoricForgedTargetOwnerPending = {
    ...dangerousRhetoricForgedAllyPending,
    targetOwnerId: p6.id,
  };
  const dangerousRhetoricForgedTargetOwnerFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedTargetOwnerPending,
  };
  const dangerousRhetoricForgedTargetOwnerResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricForgedTargetOwnerFixture,
    dangerousRhetoricForgedTargetOwnerPending,
    p6.id,
    "bene",
  );
  assert.equal(
    dangerousRhetoricForgedTargetOwnerResolved,
    dangerousRhetoricForgedTargetOwnerFixture,
    "Commander Dangerous Rhetoric should reject forged targetOwnerId values that disagree with the source card",
  );

  const capturedMentatNoDiscard = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [capturedDrawCard],
      discard: [],
      hand: [capturedMentat],
      playArea: [],
      resources: { solari: 6, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: capturedMentat, selectedSpace: highCouncil },
  );
  assert.equal(capturedMentatNoDiscard.pendingAction, undefined, "Captured Mentat should not pause without a card to discard");

  const commanderCapturedDiscard = { ...dune, id: "commander-captured-mentat-discard-card" };
  const commanderCapturedDraw = { ...calculusTrashTarget, id: "commander-captured-mentat-draw-card" };
  const commanderCapturedBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderCapturedDraw],
    discard: [],
    hand: [capturedMentat, commanderCapturedDiscard],
    influence: { ...player.influence, emperor: 0, greatHouses: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  const commanderCapturedFixture = {
    ...commanderCapturedBase,
    players: commanderCapturedBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 0 }, vp: 0 }
        : player,
    ),
  };
  const commanderCapturedPlayed = turnActions.placeAgentAction(commanderCapturedFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawChoices(playerById(commanderCapturedPlayed, p4.id)),
    ["emperor", "greatHouses", "spacing", "bene", "fringeWorlds"],
    "Shaddam Captured Mentat should include personal Emperor and main-board Influence choices",
  );
  assert.equal(commanderCapturedPlayed.pendingAction.influenceOwnerId, p2.id);
  const commanderCapturedResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    commanderCapturedPlayed,
    commanderCapturedPlayed.pendingAction,
    commanderCapturedDiscard.id,
    "greatHouses",
  );
  assert.equal(playerById(commanderCapturedResolved, p2.id).influence.greatHouses, 1);
  assert.equal(playerById(commanderCapturedResolved, p4.id).influence.greatHouses, 0);
  assert.deepEqual(playerById(commanderCapturedResolved, p4.id).hand.map((card) => card.id), [commanderCapturedDraw.id]);
  assert.equal(playerById(commanderCapturedResolved, p2.id).hand.length, playerById(commanderCapturedPlayed, p2.id).hand.length);

  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "captured-mentat-intrigue-draw" };
  const capturedMentatRevealBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { emperor: 0, spacing: 0, bene: 2, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const capturedMentatRevealFixture = {
    ...capturedMentatRevealBase,
    intrigueDeck: [capturedMentatIntrigue],
    intrigueDiscard: [],
  };
  const capturedMentatRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatRevealFixture, p2.id),
    capturedMentatRevealFixture,
  );
  assert.equal(capturedMentatRevealPlan.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.deepEqual(
    capturedMentatRevealPlan.printedRevealCards,
    [],
    "Captured Mentat reveal should use structured Influence-for-Intrigue handling",
  );
  const capturedMentatRevealed = turnActions.revealTurnAction(capturedMentatRevealFixture, {
    commanderTargets: {},
    revealPlan: capturedMentatRevealPlan,
  });
  assert.equal(capturedMentatRevealed.pendingAction?.kind, "lose-influence-for-intrigues");
  assert.equal(capturedMentatRevealed.pendingAction?.amount, 1);
  assert.equal(capturedMentatRevealed.pendingAction?.optional, true);
  assert.deepEqual(
    state.loseInfluenceForIntriguesChoices(playerById(capturedMentatRevealed, p2.id)),
    ["bene"],
    "Captured Mentat reveal should expose positive Influence tracks",
  );
  assert.equal(
    state.resolveLoseInfluenceForIntriguesChoice(capturedMentatRevealed, capturedMentatRevealed.pendingAction, "emperor"),
    capturedMentatRevealed,
    "Captured Mentat reveal should reject Influence tracks the player cannot lose",
  );
  const capturedMentatRevealResolved = state.resolveLoseInfluenceForIntriguesChoice(
    capturedMentatRevealed,
    capturedMentatRevealed.pendingAction,
    "bene",
  );
  assert.equal(capturedMentatRevealResolved.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).influence.bene, 1);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).vp, 0, "Captured Mentat reveal should lose Influence threshold VP");
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).intrigues.at(-1).id, capturedMentatIntrigue.id);
  const capturedMentatRevealSkipped = state.skipLoseInfluenceForIntrigues(capturedMentatRevealed, capturedMentatRevealed.pendingAction);
  assert.equal(capturedMentatRevealSkipped.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).influence.bene, 2);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).intrigues.length, 0);

  const commanderCapturedMentatIntrigue = { ...data.intrigueCards[1], id: "commander-captured-mentat-intrigue-draw" };
  const commanderCapturedRevealBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { ...player.influence, emperor: 2, greatHouses: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const commanderCapturedRevealFixture = {
    ...commanderCapturedRevealBase,
    intrigueDeck: [commanderCapturedMentatIntrigue],
    intrigueDiscard: [],
    players: commanderCapturedRevealBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 2 }, vp: 1 }
        : player,
    ),
  };
  const commanderCapturedRevealPlan = turnActions.revealTurnPlan(
    playerById(commanderCapturedRevealFixture, p4.id),
    commanderCapturedRevealFixture,
  );
  const commanderCapturedRevealed = turnActions.revealTurnAction(commanderCapturedRevealFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCapturedRevealPlan,
  });
  assert.deepEqual(
    state.loseInfluenceForIntriguesChoices(playerById(commanderCapturedRevealed, p4.id)),
    ["emperor"],
    "Commander Captured Mentat reveal should expose only personal Influence",
  );
  const commanderCapturedRevealResolved = state.resolveLoseInfluenceForIntriguesChoice(
    commanderCapturedRevealed,
    commanderCapturedRevealed.pendingAction,
    "emperor",
  );
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).influence.emperor, 1);
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).intrigues.at(-1).id, commanderCapturedMentatIntrigue.id);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).influence.greatHouses, 2);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).intrigues.length, playerById(commanderCapturedRevealed, p2.id).intrigues.length);

  const commanderPrepareDrawCard = { ...calculusTrashTarget, id: "commander-prepare-way-draw-target" };
  const commanderPrepareBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderPrepareDrawCard],
    discard: [],
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderPrepareFixture = {
    ...commanderPrepareBase,
    players: commanderPrepareBase.players.map((player) => {
      if (player.id === p2.id) return { ...player, garrison: 0, hand: [], influence: { ...player.influence, bene: 0 } };
      if (player.id === "p6") return { ...player, influence: { ...player.influence, bene: 2 } };
      return player;
    }),
  };
  const commanderPrepared = turnActions.placeAgentAction(commanderPrepareFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(
    playerById(commanderPrepared, p4.id).hand[0].id,
    commanderPrepareDrawCard.id,
    "Commander Prepare The Way should draw for the Commander through shared Bene Gesserit Influence",
  );
  assert.equal(playerById(commanderPrepared, p2.id).hand.length, 0, "Activated Ally should not receive the drawn card");
  assert.ok(commanderPrepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

  const noMakerReveal = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const noMakerPlan = turnActions.revealTurnPlan(playerById(noMakerReveal, p2.id), noMakerReveal);
  assert.equal(noMakerPlan.persuasion, 1, "Smuggler's Harvester should reveal for 1 persuasion");
  assert.equal(noMakerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not pay spice on Reveal");

  const makerAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const afterMakerAgent = turnActions.placeAgentAction(makerAgentFixture, {
    commanderTargets: {},
    selectedCard: smuggler,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    state.hasVisitedMakerSpaceThisRound(afterMakerAgent, p2.id),
    true,
    "Sending an Agent to a Maker board space should mark that player for round reveal checks",
  );
  assert.equal(
    playerById(afterMakerAgent, p2.id).resources.spice,
    2,
    "Imperial Basin plus Smuggler's Harvester should pay 2 total spice",
  );
  assert.deepEqual(afterMakerAgent.pendingAction, undefined, "Zero garrison should avoid a deployment pending action");

  const revealFixture = withActivePlayer(
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
    p2.id,
    () => ({
      agentsReady: 0,
      discard: [],
      hand: [smuggler],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    }),
  );
  const makerPlan = turnActions.revealTurnPlan(playerById(revealFixture, p2.id), revealFixture);
  assert.equal(makerPlan.persuasion, 1, "Smuggler's Harvester should still reveal for 1 persuasion");
  assert.equal(makerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not add reveal spice after a Maker visit");

  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: {},
    revealPlan: makerPlan,
  });
  assert.equal(playerById(revealed, p2.id).resources.spice, 0, "Smuggler's Harvester should not add spice on Reveal");
  assert.equal(revealed.turnSpiceGains[p2.id] ?? 0, 0, "Smuggler's Harvester Reveal should not count spice gain");
  assert.equal(playerById(revealed, p2.id).persuasion, 1);
  assert.deepEqual(playerById(revealed, p2.id).hand, [], "Reveal should move Smuggler's Harvester from hand");
  assert.ok(
    playerById(revealed, p2.id).playArea.some((card) => card.id === smuggler.id),
    "Reveal should put Smuggler's Harvester into play area",
  );

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const incompleteContract = {
    card: data.standardContracts[2],
    completed: false,
    takenRound: 1,
  };
  assert.ok(incompleteContract.card, "Expected a third standard contract for Interstellar Trade coverage");
  const interstellarFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    contracts: [...completedContracts, incompleteContract],
    discard: [],
    hand: [interstellarTrade],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const interstellarPlan = turnActions.revealTurnPlan(playerById(interstellarFixture, p2.id), interstellarFixture);
  assert.equal(interstellarPlan.persuasion, 2, "Interstellar Trade should reveal for 1 persuasion per completed contract");
  assert.deepEqual(
    interstellarPlan.printedRevealCards,
    [],
    "Interstellar Trade should not require a manual printed reveal adjustment",
  );
  const interstellarRevealed = turnActions.revealTurnAction(interstellarFixture, {
    commanderTargets: {},
    revealPlan: interstellarPlan,
  });
  assert.equal(playerById(interstellarRevealed, p2.id).persuasion, 2);
  assert.equal(interstellarRevealed.pendingAction, undefined, "Interstellar Trade reveal should not pause for printed text");
  const lateCompletedContract = {
    card: data.standardContracts[3],
    completed: true,
    takenRound: 1,
  };
  assert.ok(lateCompletedContract.card, "Expected a fourth standard contract for Interstellar Trade one-shot coverage");
  const afterLateCompletion = {
    ...interstellarRevealed,
    players: interstellarRevealed.players.map((player) =>
      player.id === p2.id
        ? { ...player, contracts: [...player.contracts, lateCompletedContract] }
        : player,
    ),
  };
  assert.equal(
    playerById(afterLateCompletion, p2.id).persuasion,
    2,
    "Interstellar Trade persuasion should be fixed by the reveal plan and not re-count later contract completions",
  );
  const interstellarAcquireReplacement = data.imperiumDeck.find((card) => card.id !== interstellarTrade.id);
  const interstellarAcquireContract = data.standardContracts[4];
  const interstellarAcquireContractReplacement = data.standardContracts[5];
  assert.ok(interstellarAcquireReplacement, "Expected an Imperium Row replacement for Interstellar Trade acquisition coverage");
  assert.ok(interstellarAcquireContract, "Expected a public contract for Interstellar Trade acquisition coverage");
  assert.ok(
    interstellarAcquireContractReplacement,
    "Expected a public contract replacement for Interstellar Trade acquisition coverage",
  );
  const interstellarAcquireBase = withActivePlayer(game, p2.id, () => ({
    contracts: [],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 1 },
    persuasion: interstellarTrade.cost,
    playArea: [],
    revealed: true,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const interstellarAcquireFixture = {
    ...interstellarAcquireBase,
    imperiumRow: [interstellarTrade],
    marketDeck: [interstellarAcquireReplacement],
    contractOffer: [interstellarAcquireContract],
    contractDeck: [interstellarAcquireContractReplacement],
  };
  const interstellarAcquired = state.acquireMarketCard(interstellarAcquireFixture, p2.id, interstellarTrade.id);
  assert.equal(playerById(interstellarAcquired, p2.id).discard.at(-1)?.id, interstellarTrade.id);
  assert.equal(playerById(interstellarAcquired, p2.id).persuasion, 0);
  assert.equal(interstellarAcquired.pendingAction?.kind, "board-influence-choice");
  assert.equal(interstellarAcquired.pendingAction.sourceTrigger, "acquire");
  assert.equal(interstellarAcquired.pendingAction.source, "Interstellar Trade");
  assert.equal(interstellarAcquired.pendingAction.cardId, interstellarTrade.id);
  assert.deepEqual(
    interstellarAcquired.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
    "Interstellar Trade should offer main-board Influence choices to an Ally buyer",
  );
  assert.deepEqual(
    interstellarAcquired.pendingQueue,
    [{ kind: "contract", ownerId: p2.id, source: "Interstellar Trade", publicOnly: true }],
    "Interstellar Trade should queue its face-up CHOAM contract after the Influence choice",
  );
  const forgedInterstellarAcquirePending = {
    ...interstellarAcquired.pendingAction,
    cardId: "missing-interstellar-trade-card",
  };
  const forgedInterstellarAcquireFixture = {
    ...interstellarAcquired,
    pendingAction: forgedInterstellarAcquirePending,
  };
  const forgedInterstellarAcquireResolved = state.resolveBoardInfluenceChoice(
    forgedInterstellarAcquireFixture,
    forgedInterstellarAcquirePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedInterstellarAcquireResolved,
    forgedInterstellarAcquireFixture,
    "Acquire Influence pendings should require the acquired source card to carry the matching spec",
  );
  const interstellarInfluenceResolved = state.resolveBoardInfluenceChoice(
    interstellarAcquired,
    interstellarAcquired.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(interstellarInfluenceResolved, p2.id).influence.bene, 2);
  assert.equal(playerById(interstellarInfluenceResolved, p2.id).vp, 1);
  assert.equal(interstellarInfluenceResolved.pendingAction?.kind, "contract");
  const interstellarContractResolved = state.takeChoamContract(
    interstellarInfluenceResolved,
    interstellarInfluenceResolved.pendingAction,
    interstellarAcquireContract.id,
  );
  assert.equal(interstellarContractResolved.pendingAction, undefined);
  assert.equal(playerById(interstellarContractResolved, p2.id).contracts.at(-1)?.card.id, interstellarAcquireContract.id);
  assert.deepEqual(
    interstellarContractResolved.contractOffer.map((contract) => contract.id),
    [interstellarAcquireContractReplacement.id],
    "Interstellar Trade contract acquisition should refill the public offer",
  );
  const noPublicInterstellarAcquired = state.acquireMarketCard(
    {
      ...interstellarAcquireBase,
      imperiumRow: [interstellarTrade],
      marketDeck: [interstellarAcquireReplacement],
      contractOffer: [],
      contractDeck: [],
    },
    p2.id,
    interstellarTrade.id,
  );
  assert.equal(noPublicInterstellarAcquired.pendingAction?.kind, "board-influence-choice");
  assert.deepEqual(
    noPublicInterstellarAcquired.pendingQueue,
    [],
    "Interstellar Trade should not queue a contract choice when no face-up contracts remain",
  );

  const calculusFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedSandworms: 0,
    deployedTroops: 1,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget, calculusBlockedTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusPlan = turnActions.revealTurnPlan(playerById(calculusFixture, p2.id), calculusFixture);
  assert.equal(calculusPlan.persuasion, 2, "Calculus of Power should keep its printed 2 persuasion");
  assert.equal(calculusPlan.swords, 0, "Calculus of Power optional swords should not be added before trashing");
  assert.deepEqual(
    calculusPlan.printedRevealCards,
    [],
    "Calculus of Power should not require a manual printed reveal adjustment",
  );
  const calculusRevealed = turnActions.revealTurnAction(calculusFixture, {
    commanderTargets: {},
    revealPlan: calculusPlan,
  });
  assert.equal(calculusRevealed.pendingAction?.kind, "trash-card", "Calculus of Power should queue optional trash");
  const calculusPending = calculusRevealed.pendingAction;
  assert.equal(calculusPending.source, "Calculus of Power");
  assert.equal(calculusPending.optional, true);
  assert.deepEqual(calculusPending.zones, ["playArea"]);
  assert.equal(calculusPending.excludeCardId, calculus.id);
  assert.equal(calculusPending.requiredTrait, "Faction: Emperor");
  assert.equal(calculusPending.combatRecipientId, p2.id);
  assert.equal(calculusPending.strengthReward, 3);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusRevealed, p2.id), calculusPending).map(({ card }) => card.id),
    [calculusTrashTarget.id],
    "Calculus of Power should only allow another Emperor card in play",
  );
  const blockedCalculusTrash = state.trashPlayerCard(
    calculusRevealed,
    calculusPending,
    "playArea",
    calculusBlockedTarget.id,
  );
  assert.equal(
    blockedCalculusTrash.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should reject non-Emperor trash choices",
  );
  assert.equal(playerById(blockedCalculusTrash, p2.id).conflict, 4);
  const afterCalculusTrash = state.trashPlayerCard(calculusRevealed, calculusPending, "playArea", calculusTrashTarget.id);
  assert.equal(playerById(afterCalculusTrash, p2.id).conflict, 7, "Calculus of Power trash should add 3 strength");
  assert.equal(afterCalculusTrash.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculus.id),
    "Calculus of Power should not trash itself",
  );
  assert.equal(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    false,
    "Calculus of Power should trash the selected Emperor card",
  );
  const afterCalculusSkip = state.skipTrashCard(calculusRevealed, calculusPending);
  assert.equal(playerById(afterCalculusSkip, p2.id).conflict, 4, "Skipping Calculus of Power should not add strength");
  assert.equal(afterCalculusSkip.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusSkip, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    "Skipping Calculus of Power should leave eligible cards in play",
  );
  const baseCommanderCalculusFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    conflict: 0,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderCalculusFixture = {
    ...baseCommanderCalculusFixture,
    players: baseCommanderCalculusFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 5, deployedSandworms: 0, deployedTroops: 1 }
        : player,
    ),
  };
  const commanderCalculusPlan = turnActions.revealTurnPlan(playerById(commanderCalculusFixture, p4.id), commanderCalculusFixture);
  const commanderCalculusRevealed = turnActions.revealTurnAction(commanderCalculusFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCalculusPlan,
  });
  assert.equal(
    commanderCalculusRevealed.pendingAction?.kind,
    "trash-card",
    "Commander Calculus of Power should queue trash from the Commander's play area",
  );
  assert.equal(commanderCalculusRevealed.pendingAction.ownerId, p4.id);
  assert.equal(commanderCalculusRevealed.pendingAction.combatRecipientId, p2.id);
  const afterCommanderCalculusTrash = state.trashPlayerCard(
    commanderCalculusRevealed,
    commanderCalculusRevealed.pendingAction,
    "playArea",
    calculusTrashTarget.id,
  );
  assert.equal(playerById(afterCommanderCalculusTrash, p4.id).conflict, 0, "Commander should not receive Calculus strength");
  assert.equal(playerById(afterCommanderCalculusTrash, p2.id).conflict, 8, "Activated Ally should receive Calculus strength");

  console.log("Imperium card verification passed");
} finally {
  await server.close();
}
