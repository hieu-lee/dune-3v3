import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyImperiumCardLateCatalogSpecs({
  cards,
  data,
  game,
  state,
}) {
  const { calculus, chani } = cards;
  const priorityContracts = data.imperiumDeck.find(
    (card) => card.name === "Priority Contracts",
  );
  assert.ok(
    priorityContracts,
    "Imperium deck should include Priority Contracts",
  );
  const corrinthCity = data.imperiumDeck.find(
    (card) => card.name === "Corrinth City",
  );
  assert.ok(corrinthCity, "Imperium deck should include Corrinth City");
  const deliveryAgreement = data.imperiumDeck.find(
    (card) => card.name === "Delivery Agreement",
  );
  assert.ok(
    deliveryAgreement,
    "Imperium deck should include Delivery Agreement",
  );
  assert.ok(
    priorityContracts.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ) &&
      priorityContracts.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.effects.some(
            (effect) =>
              effect.kind === "gain-vp" &&
              effect.selector === "self" &&
              effect.amount === 1,
          ),
      ) &&
      priorityContracts.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.effects.some(
            (effect) =>
              effect.kind === "take-contracts" &&
              effect.selector === "self" &&
              effect.amount === 1 &&
              effect.sourcePool === "public-offer" &&
              effect.source === "Priority Contracts",
          ),
      ),
    "Priority Contracts should model its Agent spice, VP, and public contract rewards as typed effects",
  );
  assert.match(
    priorityContracts.play,
    /Spice 2.*Take a face-up contract.*Victory Point/i,
  );
  assert.equal(
    priorityContracts.acquired,
    undefined,
    "Priority Contracts VP should not be treated as an acquire bonus",
  );
  assert.deepEqual(
    priorityContracts.traits,
    ["Faction: Spacing Guild"],
    "Priority Contracts should expose only its Spacing Guild card trait",
  );
  assert.equal(
    data.imperiumDeck.find((card) => card.name === "Junction Headquarters")
      ?.acquired,
    undefined,
    "Junction Headquarters VP should be modeled by its typed Agent effect",
  );
  assert.deepEqual(
    corrinthCity.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-cards-for-reward",
            selector: "self",
            amount: 2,
            cost: { solari: 5 },
            gainVp: 1,
            source: "Corrinth City",
          },
        ],
      },
    ],
    "Corrinth City should model its Agent discard-cost VP reward as a typed effect",
  );
  assert.match(
    corrinthCity.play,
    /Discard 2 cards.*spend 5 Solari.*gain 1 VP/i,
  );
  assert.match(corrinthCity.reveal, /\+5 persuasion.*High Council/i);
  assert.ok(
    corrinthCity.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-high-council-seat" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.cost === 5 &&
            effect.persuasionCost === 5 &&
            effect.persuasionReward === 2 &&
            effect.source === "Corrinth City",
        ),
    ),
    "Corrinth City should model its paid High Council Reveal branch as a typed effect",
  );
  assert.equal(
    corrinthCity.acquired,
    undefined,
    "Corrinth City VP should be modeled by its typed Agent effect",
  );
  assert.deepEqual(
    deliveryAgreement.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-cards-for-reward",
            selector: "self",
            amount: 1,
            takeContracts: {
              amount: 1,
              sourcePool: "public-offer",
            },
            source: "Delivery Agreement",
          },
        ],
      },
    ],
    "Delivery Agreement should model its Agent discard-contract reward as a typed effect",
  );
  assert.match(
    deliveryAgreement.play,
    /Discard 1 card.*face-up CHOAM contract/i,
  );
  assert.match(
    deliveryAgreement.reveal,
    /Gain 1 spice.*four or more contracts.*gain 1 VP/i,
  );
  assert.ok(
    deliveryAgreement.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-completed-contracts" &&
            condition.count === 4,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.selector === "self" &&
            effect.sourceOnly === true &&
            effect.vpReward === 1,
        ),
    ),
    "Delivery Agreement should model its completed-contract Reveal source-trash VP branch as a typed effect",
  );
  assert.equal(
    deliveryAgreement.acquired,
    undefined,
    "Delivery Agreement's conditional Reveal VP should not be treated as an acquire bonus",
  );
  assert.equal(
    data.imperiumDeck.find((card) => card.name === "Smuggler's Haven")
      ?.acquired,
    undefined,
    "Smuggler's Haven VP should be modeled by its typed Agent effect",
  );
  const smugglersHaven = data.imperiumDeck.find(
    (card) => card.name === "Smuggler's Haven",
  );
  assert.ok(
    smugglersHaven?.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Smuggler's Haven should carry its printed Agent VP as a typed effect",
  );
  assert.match(
    smugglersHaven.play,
    /Gain 1 VP.*Pay 4 spice to summon 1 sandworm/i,
  );
  const prepareTheWay = data.reserveMarket.find(
    (card) => card.sourceId === 537,
  );
  assert.ok(prepareTheWay, "Reserve market should include Prepare The Way");
  const spiceMustFlow = data.reserveMarket.find(
    (card) => card.sourceId === 538,
  );
  assert.ok(spiceMustFlow, "Reserve market should include The Spice Must Flow");
  const overthrow = data.imperiumDeck.find((card) => card.name === "Overthrow");
  assert.ok(overthrow, "Imperium deck should include Overthrow");
  const priceIsNoObject = data.imperiumDeck.find(
    (card) => card.name === "Price is No Object",
  );
  assert.ok(priceIsNoObject, "Imperium deck should include Price is No Object");
  const guildSpy = data.imperiumDeck.find((card) => card.name === "Guild Spy");
  assert.ok(guildSpy, "Imperium deck should include Guild Spy");
  const branchingPath = data.imperiumDeck.find(
    (card) => card.name === "Branching Path",
  );
  assert.ok(branchingPath, "Imperium deck should include Branching Path");
  const junctionHeadquarters = data.imperiumDeck.find(
    (card) => card.name === "Junction Headquarters",
  );
  assert.ok(
    junctionHeadquarters,
    "Imperium deck should include Junction Headquarters",
  );
  const spyNetwork = data.imperiumDeck.find(
    (card) => card.name === "Spy Network",
  );
  assert.ok(spyNetwork, "Imperium deck should include Spy Network");
  const strikeFleet = data.imperiumDeck.find(
    (card) => card.name === "Strike Fleet",
  );
  assert.ok(strikeFleet, "Imperium deck should include Strike Fleet");
  const shishakli = data.imperiumDeck.find((card) => card.name === "Shishakli");
  assert.ok(shishakli, "Imperium deck should include Shishakli");
  assert.equal(
    state.isPrepareTheWayCard(prepareTheWay),
    true,
    "Prepare The Way should be recognized",
  );
  assert.deepEqual(
    data.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Reserve market should expose Prepare The Way and The Spice Must Flow",
  );
  assert.equal(
    prepareTheWay.cost,
    2,
    "Prepare The Way should cost 2 persuasion",
  );
  assert.deepEqual(
    prepareTheWay.icons,
    ["landsraad", "city"],
    "Prepare The Way should send Agents to Landsraad and City spaces",
  );
  assert.equal(
    prepareTheWay.persuasion,
    2,
    "Prepare The Way should reveal for 2 persuasion",
  );
  assert.ok(
    prepareTheWay.effects?.some((spec) => spec.trigger === "agent-play"),
    "Prepare The Way should use a structured Agent draw effect",
  );
  assert.deepEqual(
    prepareTheWay.traits,
    ["Faction: Bene Gesserit"],
    "Prepare The Way should keep its Bene Gesserit trait",
  );
  assert.match(
    prepareTheWay.play,
    /2 or more Bene Gesserit Influence.*draw 1 card/i,
  );
  assert.match(prepareTheWay.reveal, /\+2 persuasion/i);
  assert.equal(
    spiceMustFlow.acquired,
    1,
    "The Spice Must Flow should keep its legacy acquisition VP display",
  );
  assert.deepEqual(
    spiceMustFlow.traits,
    ["Faction: Spacing Guild"],
    "The Spice Must Flow should expose only its Spacing Guild card trait",
  );
  assert.ok(
    spiceMustFlow.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-vp" && effect.amount === 1,
        ),
    ),
    "The Spice Must Flow should model its VP as a typed acquire effect",
  );
  assert.ok(
    spiceMustFlow.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "The Spice Must Flow should model its acquire spice as a typed acquire effect",
  );
  assert.ok(
    spyNetwork.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "Spy Network should model its acquisition spy bonus as a typed acquire effect",
  );
  assert.deepEqual(
    spyNetwork.traits,
    ["Faction: Emperor", "Faction: Spacing Guild"],
    "Spy Network should expose only its printed faction card traits",
  );
  assert.match(spyNetwork.play, /No agent icons/i);
  assert.doesNotMatch(spyNetwork.play, /Acquire bonus|Intrigue 1|Spy 1/i);
  assert.match(spyNetwork.reveal, /recall 1 spy to draw 1 Intrigue/i);
  assert.ok(
    spyNetwork.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-spy-posts" && condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recall-spy" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.drawIntrigues === 1 &&
            effect.optional === true &&
            effect.source === "Spy Network",
        ),
    ),
    "Spy Network should model its conditional Reveal spy recall Intrigue draw as a typed effect",
  );
  assert.equal(strikeFleet.cost, 5, "Strike Fleet should cost 5 persuasion");
  assert.deepEqual(
    strikeFleet.icons,
    ["spy"],
    "Strike Fleet should use the Spy Agent icon",
  );
  assert.ok(
    strikeFleet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "recalled-spy-this-turn",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 3,
        ),
    ),
    "Strike Fleet should model its same-turn spy recall Ally recruit as a typed Agent effect",
  );
  assert.ok(
    strikeFleet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "recalled-spy-this-turn",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 3,
        ),
    ),
    "Strike Fleet should route Commander same-turn spy recall recruits to the activated Ally",
  );
  assert.ok(
    strikeFleet.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "Strike Fleet should keep its acquisition spy bonus as a typed acquire effect",
  );
  assert.ok(
    strikeFleet.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ) &&
      strikeFleet.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "gain-strength" && effect.amount === 3,
          ),
      ),
    "Strike Fleet should keep typed Reveal persuasion and strength effects",
  );
  assert.equal(
    strikeFleet.play,
    "If you recalled a Spy this turn, recruit 3 troops.",
  );
  assert.equal(strikeFleet.reveal, "+1 persuasion and +3 strength.");
  assert.ok(
    overthrow.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) => effect.kind === "draw-intrigues" && effect.amount === 1,
        ),
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
    priceIsNoObject.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "solari" &&
            effect.amount === 2,
        ),
    ),
    "Price is No Object should model its acquisition Solari as a typed acquire effect",
  );
  assert.ok(
    priceIsNoObject.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "acquire-card" &&
            effect.destination === "hand" &&
            effect.paymentResource === "solari" &&
            effect.optional === true,
        ),
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
  assert.match(
    guildSpy.play,
    /discard 1 card.*draw 1 card.*Spacing Guild.*draw 1 Intrigue card/i,
  );
  assert.deepEqual(
    branchingPath.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        conditions: [{ kind: "has-alliance", faction: "bene" }],
        effects: [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            drawIntrigues: 1,
            gain: { spice: 2 },
            optional: true,
          },
        ],
      },
    ],
    "Branching Path should model its Bene Gesserit Alliance Intrigue trash reward as a typed effect",
  );
  assert.match(
    branchingPath.play,
    /Bene Gesserit Alliance.*may trash 1 Intrigue.*draw 1 Intrigue.*gain 2 spice/i,
  );
  assert.equal(
    branchingPath.reveal,
    "+2 persuasion.",
    "Branching Path should keep its fixed Reveal persuasion",
  );
  assert.deepEqual(
    junctionHeadquarters.effects?.filter(
      (spec) => spec.trigger === "agent-play",
    ),
    [
      {
        trigger: "agent-play",
        conditions: [{ kind: "has-alliance", faction: "spacing" }],
        effects: [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            cost: { spice: 2 },
            gainVp: 1,
            optional: true,
          },
        ],
      },
    ],
    "Junction Headquarters should model its Spacing Guild Alliance Intrigue trash VP reward as a typed effect",
  );
  assert.ok(
    junctionHeadquarters.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ) &&
      junctionHeadquarters.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) =>
              effect.kind === "gain-resource" &&
              effect.resource === "water" &&
              effect.amount === 1,
          ),
      ) &&
      junctionHeadquarters.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "recruit-troops" && effect.amount === 1,
          ),
      ),
    "Junction Headquarters should carry typed Reveal persuasion, water, and troop rewards",
  );
  assert.match(
    junctionHeadquarters.play,
    /Spacing Guild Alliance.*may trash 1 Intrigue.*pay 2 spice.*gain 1 VP/i,
  );
  assert.equal(
    junctionHeadquarters.reveal,
    "+1 persuasion. Gain 1 water and recruit 1 troop.",
    "Junction Headquarters reveal text should expose all typed reveal rewards",
  );
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
    shishakli.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-strength" && effect.amount === 2,
        ),
    ),
    "Shishakli should keep its fixed Reveal strength spec",
  );
  assert.ok(
    shishakli.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ),
    ),
    "Shishakli should model its Fremen Bond Reveal Influence as a typed effect",
  );
  for (const name of [
    "Bene Gesserit Operative",
    "Branching Path",
    "Calculus of Power",
    "Cargo Runner",
    "Chani, Clever Tactician",
    "Corrinth City",
    "Delivery Agreement",
    "Guild Spy",
    "In High Places",
    "Junction Headquarters",
    "Long Live the Fighters",
    "Maker Keeper",
    "Maula Pistol",
    "Northern Watermaster",
    "Overthrow",
    "Paracompass",
    "Price is No Object",
    "Priority Contracts",
    "Shishakli",
    "Steersman",
  ]) {
    const card = data.imperiumDeck.find((candidate) => candidate.name === name);
    assert.ok(
      card?.effects?.some((spec) => spec.trigger === "agent-play"),
      `${name} should use a structured Agent effect`,
    );
  }
  const calculusTrashTarget = data.imperiumDeck.find(
    (card) =>
      card.id !== calculus.id && card.traits?.includes("Faction: Emperor"),
  );
  assert.ok(
    calculusTrashTarget,
    "Expected an Emperor Imperium card for Calculus of Power trash coverage",
  );
  const calculusBlockedTarget = data.imperiumDeck.find(
    (card) =>
      card.id !== calculus.id && !card.traits?.includes("Faction: Emperor"),
  );
  assert.ok(
    calculusBlockedTarget,
    "Expected a non-Emperor Imperium card for Calculus of Power filtering coverage",
  );
  const fremenBondSupport = data.imperiumDeck.find(
    (card) => card.id !== chani.id && card.traits?.includes("Faction: Fremen"),
  );
  assert.ok(
    fremenBondSupport,
    "Expected another Fremen Imperium card for Fremen Bond coverage",
  );
  const imperialBasin = data.boardSpaces.find(
    (space) => space.id === "imperial-basin",
  );
  assert.ok(
    imperialBasin?.maker,
    "Imperial Basin should be a Maker board space",
  );
  const carthag = data.boardSpaces.find((space) => space.id === "carthag");
  assert.ok(carthag, "Carthag should exist for Prepare The Way Agent coverage");
  const shipping = data.boardSpaces.find((space) => space.id === "shipping");
  assert.ok(
    shipping,
    "Shipping should exist for Steersman Recall Agent pending coverage",
  );
  const highCouncil = data.boardSpaces.find(
    (space) => space.id === "high-council",
  );
  assert.ok(
    highCouncil,
    "High Council should exist for Captured Mentat Agent coverage",
  );
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(
    secrets,
    "Secrets should exist for Bene Gesserit Operative Agent coverage",
  );
  const p2 = playerById(game, "p2");
  const p4 = playerById(game, "p4");
  const p6 = playerById(game, "p6");
  const dune = [...p2.hand, ...p2.deck, ...p2.discard].find(
    (card) => card.name === "Dune, The Desert Planet",
  );
  assert.ok(
    dune,
    "Feyd should have Dune, The Desert Planet available for a Spice Trade Agent turn",
  );
  return {
    cards: {
      corrinthCity,
      deliveryAgreement,
      overthrow,
      prepareTheWay,
      priceIsNoObject,
      priorityContracts,
      spiceMustFlow,
      spyNetwork,
    },
    fixtures: {
      calculusBlockedTarget,
      calculusTrashTarget,
      dune,
      fremenBondSupport,
    },
    players: { p2, p4, p6 },
    spaces: { carthag, highCouncil, imperialBasin, secrets, shipping },
  };
}
