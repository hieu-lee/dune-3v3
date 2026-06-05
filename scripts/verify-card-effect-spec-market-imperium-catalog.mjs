import assert from "node:assert/strict";
import {
  agentSpec,
  hasAcquireEffect,
  hasAgentEffect,
  hasAgentPlaySpec,
  hasRevealEffect,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecMarketImperiumCatalog({
  cards,
  effectResolver,
  game,
  groups,
  players,
}) {
  const {
    beneGesseritOperative,
    branchingPath,
    calculus,
    capturedMentat,
    cargoRunner,
    chani,
    convincingArgument,
    corrinthCity,
    covertOperation,
    dagger,
    deliveryAgreement,
    desertPower,
    desertSurvival,
    doubleAgent,
    fedaykinStilltent,
    guildEnvoy,
    guildSpy,
    hiddenMissive,
    imperialOrnithopter,
    imperialSpymaster,
    inHighPlaces,
    interstellarTrade,
    junctionHeadquarters,
    leadership,
    limitedLandsraadAccess,
    makerKeeper,
    maulaPistol,
    northernWatermaster,
    overthrow,
    paracompass,
    prepareTheWay,
    priceIsNoObject,
    priorityContracts,
    publicSpectacle,
    rebelSupplier,
    reliableInformant,
    sardaukarCoordination,
    sardaukarSoldier,
    smuggler,
    smugglersHaven,
    southernElders,
    spaceTimeFolding,
    spacingGuildFavor,
    spiceMustFlow,
    spyNetwork,
    stilgar,
    strikeFleet,
    subversiveAdvisor,
    theacherousManeuver,
    undercoverAsset,
    weirdingWoman,
    wheelsWithinWheels,
  } = cards;
  const { marketAndImperiumCards } = groups;
  const { p2 } = players;
  for (const card of [
    guildSpy,
    inHighPlaces,
    spyNetwork,
    strikeFleet,
    subversiveAdvisor,
  ]) {
    assert.ok(
      card.effects?.some(
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
      `${card.name} should use a typed acquire spy-placement effect`,
    );
  }
  assert.ok(
    overthrow.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-intrigues" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Overthrow should use a typed acquire Intrigue draw effect",
  );
  assert.deepEqual(
    overthrow.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "gain-board-space-influence",
          selector: "self",
          amount: 1,
        },
      ]),
    ],
    "Overthrow should only use its typed Agent current-board-space Influence bonus without source trash",
  );
  assert.equal(
    overthrow.play,
    "Gain two Influence instead of one.",
    "Overthrow play text should expose its automated Faction-space Influence bonus",
  );
  assert.ok(
    priceIsNoObject.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 2,
        ),
    ),
    "Price is No Object should use a typed acquire Solari effect",
  );
  assert.ok(
    priceIsNoObject.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "acquire-card" &&
            effect.selector === "self" &&
            effect.destination === "hand" &&
            effect.paymentResource === "solari" &&
            effect.optional === true &&
            effect.minCost === undefined &&
            effect.maxCost === undefined,
        ),
    ),
    "Price is No Object should use a typed Agent acquire-card Solari payment effect",
  );
  assert.ok(
    subversiveAdvisor.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-board-space-influence" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.trashSource === true,
        ),
    ),
    "Subversive Advisor should use a typed Agent current-board-space Influence bonus with source trash",
  );
  assert.equal(
    subversiveAdvisor.play,
    "If you sent an Agent to a Faction board space this turn, gain two Influence instead of one and trash this card.",
    "Subversive Advisor play text should expose its automated Faction-space Influence bonus",
  );
  assert.ok(
    inHighPlaces.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "In High Places should use a typed another-Bene-Gesserit Agent draw spec",
  );
  assert.ok(
    inHighPlaces.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "In High Places should use a typed another-Bene-Gesserit Agent spy-placement spec",
  );
  assert.equal(
    inHighPlaces.play,
    "If you have another Bene Gesserit card in play, draw 1 card and place 1 spy.",
    "In High Places play text should expose its conditional Agent draw and spy placement",
  );
  assert.ok(
    weirdingWoman.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "return-source-to-hand" &&
            effect.selector === "self",
        ),
    ),
    "Weirding Woman should use a typed another-Bene-Gesserit Agent source return spec",
  );
  assert.ok(
    hasRevealEffect(
      weirdingWoman,
      (effect) =>
        effect.kind === "gain-persuasion" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ) &&
      hasRevealEffect(
        weirdingWoman,
        (effect) =>
          effect.kind === "gain-strength" &&
          effect.selector === "self" &&
          effect.amount === 1,
      ),
    "Weirding Woman should carry typed Reveal persuasion and strength specs",
  );
  assert.equal(
    weirdingWoman.play,
    "If you have another Bene Gesserit card in play, return this card from play to your hand.",
    "Weirding Woman play text should expose its conditional Agent return",
  );
  assert.ok(
    hasAgentEffect(
      sardaukarCoordination,
      (effect) =>
        effect.kind === "deploy-recruited-troops" &&
        effect.selector === "self" &&
        effect.source === "Sardaukar Coordination",
    ),
    "Sardaukar Coordination should use a typed Agent same-turn recruited-troop deployment spec",
  );
  assert.ok(
    hasRevealEffect(
      sardaukarCoordination,
      (effect) =>
        effect.kind === "gain-persuasion" &&
        effect.selector === "self" &&
        effect.amount === 2,
    ) &&
      hasRevealEffect(
        sardaukarCoordination,
        (effect) =>
          effect.kind === "gain-strength" &&
          effect.selector === "self" &&
          effect.amount?.kind === "revealed-card-trait-count" &&
          effect.amount.trait === "Faction: Emperor",
      ),
    "Sardaukar Coordination should carry typed Reveal persuasion and strength specs",
  );
  assert.equal(
    sardaukarCoordination.play,
    "You may deploy any troops you recruit this turn to the Conflict.",
    "Sardaukar Coordination play text should expose its typed Agent deployment modifier",
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
    "Strike Fleet should use a typed Ally Agent recruit spec gated by same-turn spy recall",
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
    "Strike Fleet should route Commander same-turn-spy-recall troop recruitment to the activated Ally",
  );
  assert.equal(
    strikeFleet.play,
    "If you recalled a Spy this turn, recruit 3 troops.",
    "Strike Fleet play text should expose its conditional Agent troop recruitment",
  );
  assert.ok(
    spiceMustFlow.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "The Spice Must Flow should use a typed acquire VP effect",
  );
  assert.ok(
    spiceMustFlow.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "The Spice Must Flow should use a typed reveal spice effect",
  );
  assert.ok(
    hasAgentEffect(
      interstellarTrade,
      (effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Interstellar Trade",
    ),
    "Interstellar Trade should use a typed Agent Influence-choice effect",
  );
  assert.ok(
    hasAcquireEffect(
      interstellarTrade,
      (effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Interstellar Trade",
    ),
    "Interstellar Trade should use a typed acquire face-up contract effect",
  );
  assert.ok(
    priorityContracts.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pending-action-choice" &&
            effect.options.some(
              (option) =>
                option.id === "spice" &&
                option.effect.kind === "gain-resource" &&
                option.effect.resource === "spice" &&
                option.effect.amount === 2,
            ),
        ),
    ),
    "Priority Contracts should use a typed Reveal spice choice",
  );
  assert.ok(
    priorityContracts.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pending-action-choice" &&
            effect.options.some(
              (option) =>
                option.id === "vp" &&
                option.conditions?.some(
                  (condition) => condition.kind === "has-completed-contracts" && condition.count === 4,
                ) &&
                option.effect.kind === "trash-card" &&
                option.effect.selector === "self" &&
                option.effect.sourceOnly === true &&
                option.effect.vpReward === 1,
            ),
        ),
    ),
    "Priority Contracts should use a typed conditional Reveal self-trash VP choice",
  );
  assert.ok(
    hasAgentEffect(
      priorityContracts,
      (effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Priority Contracts",
    ),
    "Priority Contracts should use a typed Agent face-up contract effect",
  );
  assert.equal(
    priorityContracts.acquired,
    undefined,
    "Priority Contracts VP should not be treated as an acquire bonus",
  );
  assert.equal(
    junctionHeadquarters.acquired,
    undefined,
    "Junction Headquarters VP should be modeled by its typed Agent effect",
  );
  assert.ok(
    hasAgentEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "discard-cards-for-reward" &&
        effect.selector === "self" &&
        effect.amount === 2 &&
        effect.cost?.solari === 5 &&
        effect.gainVp === 1 &&
        effect.source === "Corrinth City",
    ),
    "Corrinth City should use a typed Agent discard-cost VP effect",
  );
  assert.ok(
    hasRevealEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "pending-action-choice" &&
        effect.selector === "self" &&
        effect.source === "Corrinth City" &&
        effect.options.some(
          (option) =>
            option.id === "solari" &&
            option.effect.kind === "gain-resource" &&
            option.effect.resource === "solari" &&
            option.effect.amount === 5,
        ) &&
        effect.options.some(
          (option) =>
            option.id === "high-council" &&
            option.effect.kind === "pay-resource-for-high-council-seat" &&
            option.effect.resource === "solari" &&
            option.effect.cost === 5 &&
            option.effect.persuasionReward === 2 &&
            option.effect.source === "Corrinth City",
        ),
    ),
    "Corrinth City should carry its Solari or High Council Reveal branches as a typed choice",
  );
  assert.equal(
    hasRevealEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "gain-persuasion" &&
        effect.selector === "self" &&
        effect.amount === 5,
    ),
    false,
    "Corrinth City should not carry its printed Solari branch as a persuasion effect",
  );
  assert.deepEqual(
    effectResolver.resolveRevealPendingActionChoices(
      corrinthCity.effects,
      {
        trigger: "reveal",
        source: p2,
        state: game,
      },
    ),
    [
      {
        selector: "self",
        source: "Corrinth City",
        options: [
          {
            id: "solari",
            label: "+5 Solari",
            effect: {
              kind: "gain-resource",
              selector: "self",
              resource: "solari",
              amount: 5,
              source: "Corrinth City",
            },
          },
          {
            id: "high-council",
            label: "Spend 5 Solari for High Council seat",
            effect: {
              kind: "pay-resource-for-high-council-seat",
              selector: "self",
              resource: "solari",
              cost: 5,
              optional: true,
              persuasionCost: 0,
              persuasionReward: 2,
              source: "Corrinth City",
            },
          },
        ],
      },
    ],
    "Corrinth City should resolve its Solari or High Council Reveal choice through the typed pending resolver",
  );
  assert.ok(
    hasAgentEffect(
      deliveryAgreement,
      (effect) =>
        effect.kind === "discard-cards-for-reward" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.takeContracts?.amount === 1 &&
        effect.takeContracts?.sourcePool === "public-offer" &&
        effect.source === "Delivery Agreement",
    ),
    "Delivery Agreement should use a typed Agent discard-for-public-contract effect",
  );
  assert.ok(
    hasRevealEffect(
      deliveryAgreement,
      (effect) =>
        effect.kind === "pending-action-choice" &&
        effect.source === "Delivery Agreement" &&
        effect.options.some((option) =>
          option.id === "spice" &&
          option.effect.kind === "gain-resource" &&
          option.effect.selector === "self" &&
          option.effect.resource === "spice" &&
          option.effect.amount === 1
        ),
    ),
    "Delivery Agreement should carry its Reveal spice branch as a typed choice",
  );
  assert.ok(
    hasRevealEffect(
      deliveryAgreement,
      (effect) =>
        effect.kind === "pending-action-choice" &&
        effect.source === "Delivery Agreement" &&
        effect.options.some((option) =>
          option.id === "vp" &&
          option.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
          option.effect.kind === "trash-card" &&
          option.effect.selector === "self" &&
          option.effect.sourceOnly === true &&
          option.effect.zones?.length === 1 &&
          option.effect.zones[0] === "playArea" &&
          option.effect.vpReward === 1 &&
          option.effect.optional === false
        ),
    ),
    "Delivery Agreement should carry its completed-contract source-trash VP Reveal branch as a typed choice",
  );
  assert.equal(
    corrinthCity.acquired,
    undefined,
    "Corrinth City VP should be modeled by its typed Agent effect",
  );
  assert.equal(
    deliveryAgreement.acquired,
    undefined,
    "Delivery Agreement's conditional Reveal VP should not be treated as an acquire bonus",
  );
  assert.equal(
    smugglersHaven.acquired,
    undefined,
    "Smuggler's Haven VP should be modeled by its typed Agent effect",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter(hasAgentPlaySpec)
      .map((card) => card.name)
      .sort(),
    [
      "Bene Gesserit Operative",
      "Branching Path",
      "Calculus of Power",
      "Captured Mentat",
      "Cargo Runner",
      "Chani, Clever Tactician",
      "Corrinth City",
      "Covert Operation",
      "Dangerous Rhetoric",
      "Delivery Agreement",
      "Desert Power",
      "Desert Survival",
      "Double Agent",
      "Ecological Testing Station",
      "Fedaykin Stilltent",
      "Guild Envoy",
      "Guild Spy",
      "Hidden Missive",
      "Imperial Spymaster",
      "In High Places",
      "Interstellar Trade",
      "Junction Headquarters",
      "Leadership",
      "Long Live the Fighters",
      "Maker Keeper",
      "Maula Pistol",
      "Northern Watermaster",
      "Overthrow",
      "Paracompass",
      "Prepare The Way",
      "Price is No Object",
      "Priority Contracts",
      "Public Spectacle",
      "Rebel Supplier",
      "Reliable Informant",
      "Sardaukar Coordination",
      "Shishakli",
      "Smuggler's Harvester",
      "Smuggler's Haven",
      "Southern Elders",
      "Space-time Folding",
      "Spacing Guild's Favor",
      "Steersman",
      "Stilgar, The Devoted",
      "Strike Fleet",
      "Subversive Advisor",
      "Treacherous Maneuver",
      "Tread in Darkness",
      "Weirding Woman",
      "Wheels Within Wheels",
    ],
    "Unexpected cards with declarative Agent-play specs",
  );
  for (const card of [
    convincingArgument,
    dagger,
    prepareTheWay,
    limitedLandsraadAccess,
    imperialOrnithopter,
    smuggler,
    interstellarTrade,
    calculus,
    capturedMentat,
    covertOperation,
    doubleAgent,
    fedaykinStilltent,
    hiddenMissive,
    cargoRunner,
    makerKeeper,
    maulaPistol,
    northernWatermaster,
    paracompass,
    reliableInformant,
    sardaukarCoordination,
    smugglersHaven,
    spacingGuildFavor,
    spaceTimeFolding,
    guildEnvoy,
    wheelsWithinWheels,
    branchingPath,
    beneGesseritOperative,
    chani,
    desertPower,
    desertSurvival,
    imperialSpymaster,
    rebelSupplier,
    sardaukarSoldier,
    southernElders,
    stilgar,
    leadership,
    publicSpectacle,
    theacherousManeuver,
    undercoverAsset,
    weirdingWoman,
  ]) {
    assert.ok(
      card.effects?.some((spec) => spec.trigger === "reveal"),
      `${card.name} should carry a declarative Reveal effect spec`,
    );
  }
  assert.ok(
    hasAgentEffect(
      leadership,
      (effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount?.kind === "combat-recipient-sandworms",
    ),
    "Leadership should carry a declarative Agent draw-card spec",
  );
  assert.ok(
    hasAgentEffect(
      imperialSpymaster,
      (effect) =>
        effect.kind === "draw-intrigues" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Imperial Spymaster should carry a declarative Agent Intrigue draw spec",
  );
  assert.ok(
    sardaukarSoldier.effects?.some(
      (spec) =>
        spec.trigger === "trash" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-intrigues" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Sardaukar Soldier should carry a declarative trash-trigger Intrigue draw spec",
  );
  assert.ok(
    hasAgentEffect(
      theacherousManeuver,
      (effect) =>
        effect.kind === "gain-board-space-influence" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.trashSource === true &&
        effect.requiredHandTrashTrait === "Faction: Emperor" &&
        effect.source === "Treacherous Maneuver",
    ),
    "Treacherous Maneuver should carry a declarative Agent board-space Influence spec with its trash cost",
  );
  assert.ok(
    hasAgentEffect(
      publicSpectacle,
      (effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Public Spectacle should carry a declarative Agent Influence-choice spec",
  );
  assert.ok(
    hasAgentEffect(
      theacherousManeuver,
      (effect) =>
        effect.kind === "gain-board-space-influence" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Treacherous Maneuver should carry a declarative Agent board-space Influence spec",
  );
  assert.ok(
    hasRevealEffect(
      rebelSupplier,
      (effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 1,
    ),
    "Rebel Supplier should carry a declarative Reveal spice spec",
  );
  assert.ok(
    desertPower.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "visited-maker-space",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ),
    "Desert Power should carry a Maker-space-gated Agent spice spec",
  );
  assert.ok(
    desertPower.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-sandworms" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.cost === 1 &&
            effect.sandworms === 1 &&
            effect.recipient === "combat-recipient" &&
            effect.destination === "conflict" &&
            effect.persuasionCost === 2,
        ),
    ),
    "Desert Power should carry a typed Reveal payment replacing persuasion with a sandworm",
  );
  assert.equal(
    desertPower.reveal,
    "+2 persuasion, or pay 1 water to summon 1 sandworm.",
    "Desert Power reveal text should expose its typed sandworm choice",
  );
  assert.ok(
    hasRevealEffect(
      southernElders,
      (effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 1,
    ),
    "Southern Elders should carry a declarative Reveal water spec",
  );
  for (const [card, expectedTroops] of [
    [rebelSupplier, 2],
    [southernElders, 2],
    [stilgar, 2],
  ]) {
    assert.ok(
      card.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-role" && condition.role === "Ally",
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "recruit-troops" &&
              effect.selector === "self" &&
              effect.amount === expectedTroops,
          ),
      ),
      `${card.name} should recruit troops to an Ally player through a declarative Agent spec`,
    );
    assert.ok(
      card.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-role" && condition.role === "Commander",
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "recruit-troops" &&
              effect.selector === "activated-ally" &&
              effect.amount === expectedTroops,
          ),
      ),
      `${card.name} should route Commander troop rewards to the activated Ally through a declarative Agent spec`,
    );
  }
  assert.ok(
    prepareTheWay.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "bene" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ),
    "Prepare The Way should carry a declarative Agent draw spec gated by Bene Gesserit influence",
  );
}
