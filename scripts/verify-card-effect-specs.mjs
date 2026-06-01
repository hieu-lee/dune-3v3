import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function revealSpec(effects, conditions) {
  return {
    trigger: "reveal",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function agentSpec(effects, conditions) {
  return {
    trigger: "agent-play",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function hasRevealSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "reveal") ?? false;
}

function hasAgentPlaySpec(card) {
  return card.effects?.some((spec) => spec.trigger === "agent-play") ?? false;
}

function expectedFixedReveal(card) {
  return {
    persuasion: card.persuasion,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
    swords: card.swords,
  };
}

function actualFixedReveal(turnActions, player, card) {
  const plan = turnActions.revealTurnPlan({ ...player, hand: [card], highCouncilSeat: false });
  return {
    persuasion: plan.persuasion,
    revealGain: plan.revealGain,
    swords: plan.swords,
  };
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
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = state.initialGame();
  const p2 = playerById(game, "p2");
  const p3 = playerById(game, "p3");
  const p4 = playerById(game, "p4");
  const revealSpecCards = [
    ...data.allyStarterCards,
    ...data.muadDibCommanderCards,
    ...data.emperorCommanderCards,
    ...data.reserveMarket,
    ...data.imperiumDeck,
  ].filter(hasRevealSpec);
  const convincingArgument = data.allyStarterCards.find((card) => card.name === "Convincing Argument");
  const dagger = data.allyStarterCards.find((card) => card.name === "Dagger");
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  const cargoRunner = data.imperiumDeck.find((card) => card.name === "Cargo Runner");
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  const makerKeeper = data.imperiumDeck.find((card) => card.name === "Maker Keeper");
  const maulaPistol = data.imperiumDeck.find((card) => card.name === "Maula Pistol");
  const northernWatermaster = data.imperiumDeck.find((card) => card.name === "Northern Watermaster");
  const paracompass = data.imperiumDeck.find((card) => card.name === "Paracompass");
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  const limitedLandsraadAccess = data.muadDibCommanderCards.find((card) => card.name === "Limited Landsraad Access");
  const devastatingAssault = data.emperorCommanderCards.find((card) => card.name === "Devastating Assault");
  const emperorSignet = data.emperorCommanderCards.find((card) => card.name === "Signet Ring");
  const imperialOrnithopter = data.emperorCommanderCards.find((card) => card.name === "Imperial Ornithopter");
  const arrakeen = data.boardSpaces.find((space) => space.id === "arrakeen");
  const haggaBasin = data.boardSpaces.find((space) => space.id === "hagga-basin");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(
    convincingArgument &&
    dagger &&
    smuggler &&
    interstellarTrade &&
    calculus &&
    capturedMentat &&
    beneGesseritOperative &&
    cargoRunner &&
    chani &&
    makerKeeper &&
    maulaPistol &&
    northernWatermaster &&
    paracompass,
  );
  assert.ok(prepareTheWay && limitedLandsraadAccess && devastatingAssault && emperorSignet && imperialOrnithopter);
  assert.ok(arrakeen && haggaBasin && imperialBasin && secrets && highCouncil);
  assert.equal(revealSpecCards.length, 34, "Unexpected number of cards with declarative Reveal specs");
  assert.deepEqual(
    [
      ...data.reserveMarket,
      ...data.imperiumDeck,
    ].filter(hasAgentPlaySpec).map((card) => card.name).sort(),
    [
      "Bene Gesserit Operative",
      "Captured Mentat",
      "Cargo Runner",
      "Chani, Clever Tactician",
      "Maker Keeper",
      "Maula Pistol",
      "Northern Watermaster",
      "Paracompass",
      "Prepare The Way",
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
	    beneGesseritOperative,
	    chani,
	  ]) {
    assert.ok(
      card.effects?.some((spec) => spec.trigger === "reveal"),
      `${card.name} should carry a declarative Reveal effect spec`,
    );
  }
  assert.ok(
    prepareTheWay.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Prepare The Way should carry a declarative Agent draw spec gated by Bene Gesserit influence",
  );
  assert.ok(
    makerKeeper.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
    ),
    "Maker Keeper should carry a Bene Gesserit Influence-gated water Agent spec",
  );
  assert.ok(
    makerKeeper.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "fremen" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 1)
    ),
    "Maker Keeper should carry a Fremen Influence-gated spice Agent spec",
  );
  assert.ok(
    cargoRunner.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 2) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ) &&
    cargoRunner.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Cargo Runner should carry stacked completed-contract Agent draw specs",
  );
  assert.ok(
    maulaPistol.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Maula Pistol should carry an unconditional Agent draw spec",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-conflict-units" && condition.count === 3) &&
      spec.effects.some((effect) => effect.kind === "draw-intrigues" && effect.amount === 1)
    ),
	    "Chani should carry a conflict-unit-gated Agent Intrigue draw spec",
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
    "Chani should carry a declarative Fremen Bond Reveal persuasion spec",
  );
	  assert.ok(
	    chani.effects?.some((spec) =>
	      spec.trigger === "reveal" &&
	      spec.effects.some((effect) =>
	        effect.kind === "retreat-troops-for-strength" &&
	        effect.amount === 2 &&
	        effect.strength === 4 &&
	        effect.optional === true
	      )
	    ),
    "Chani should carry a declarative Reveal troop-retreat strength spec",
	  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Calculus of Power should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.optional === true &&
        effect.excludeSource === true &&
        effect.requiredTrait === "Faction: Emperor" &&
        effect.strengthReward === 3 &&
        effect.zones?.length === 1 &&
        effect.zones[0] === "playArea"
      )
    ),
    "Calculus of Power should carry a declarative Reveal trash-card strength spec",
  );
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
        effect.selector === "self" &&
        effect.drawCards === 1 &&
        effect.influenceAmount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Agent discard-for-Influence-and-draw spec",
  );
  assert.ok(
    beneGesseritOperative.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "Bene Gesserit Operative should carry a mandatory Agent spy-placement spec",
  );
  assert.ok(
    northernWatermaster.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
    ),
    "Northern Watermaster should carry a water Agent spec",
  );
  assert.ok(
    paracompass.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 2)
    ),
    "Paracompass should carry a Solari Agent spec",
  );
  assert.ok(
    devastatingAssault.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 1
      )
    ),
    "Devastating Assault should carry a routed Agent recruit spec",
  );
  assert.ok(
    emperorSignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "block-conflict-deployment" &&
        effect.selector === "self" &&
        effect.source === "Emperor of the Known Universe"
      )
    ),
    "Shaddam Signet Ring should carry a declarative Agent deployment-block spec",
  );
  for (const card of revealSpecCards) {
    assert.deepEqual(
      actualFixedReveal(turnActions, p2, card),
      expectedFixedReveal(card),
      `${card.name} reveal spec should match its fixed printed reveal fields before conditional context`,
    );
  }

  const legacyReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [{ ...convincingArgument, effects: undefined }, { ...dagger, effects: undefined }],
    highCouncilSeat: false,
  });
  assert.equal(legacyReveal.persuasion, 2, "Legacy reveal cards should still use printed persuasion");
  assert.equal(legacyReveal.swords, 1, "Legacy reveal cards should still use printed strength");

  const specReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [convincingArgument, dagger],
    highCouncilSeat: false,
  });
  assert.equal(specReveal.persuasion, 2, "Spec starter cards should reveal for their printed persuasion");
  assert.equal(specReveal.swords, 1, "Spec starter cards should reveal for their printed strength");
  const fremenSupportCard = {
    ...convincingArgument,
    id: "effect-spec-fremen-bond-support",
    name: "Effect Spec Fremen Bond Support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
    conditionalPersuasion: false,
    conditionalSwords: false,
    traits: ["Faction: Fremen"],
  };
  const chaniSoloReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(chaniSoloReveal.persuasion, 0, "Fremen Bond should not trigger from Chani alone");
  assert.deepEqual(chaniSoloReveal.printedRevealCards, [], "Chani Fremen Bond should not need manual reveal fallback");
  const chaniHandBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani, fremenSupportCard],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(chaniHandBondReveal.persuasion, 2, "Fremen Bond should count another Fremen card revealed from hand");
  const chaniPlayAreaBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [fremenSupportCard],
    highCouncilSeat: false,
  });
  assert.equal(chaniPlayAreaBondReveal.persuasion, 2, "Fremen Bond should count another Fremen card already in play");

  const overrideCard = {
    ...convincingArgument,
    id: "effect-spec-override-card",
    name: "Effect Spec Override",
    persuasion: 99,
    swords: 99,
    revealGain: { spice: 99 },
    effects: [revealSpec([
      { kind: "gain-persuasion", selector: "self", amount: 2 },
      { kind: "gain-strength", selector: "self", amount: 1 },
      { kind: "gain-resource", selector: "self", resource: "water", amount: 1 },
    ])],
  };
  const overrideReveal = turnActions.revealTurnPlan({ ...p2, hand: [overrideCard], highCouncilSeat: false });
  assert.equal(overrideReveal.persuasion, 2, "Reveal specs should override legacy card persuasion");
  assert.equal(overrideReveal.swords, 1, "Reveal specs should override legacy card strength");
  assert.deepEqual(overrideReveal.revealGain, { water: 1 }, "Reveal specs should override legacy revealGain");
  const unsupportedSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-selector-card",
    name: "Effect Spec Unsupported Selector",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "teammate", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "teammate"/,
    "Unsupported effect selectors should fail loudly instead of silently becoming no-ops",
  );
  const unsupportedAmountCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-amount-card",
    name: "Effect Spec Unsupported Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: { kind: "renown" } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedAmountCard], highCouncilSeat: false }),
    /Unsupported effect amount "renown"/,
    "Unsupported effect amounts should fail loudly instead of silently becoming zero",
  );
  const negativeAmountCard = {
    ...convincingArgument,
    id: "effect-spec-negative-amount-card",
    name: "Effect Spec Negative Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: -1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [negativeAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Gain effect amounts should be non-negative integers",
  );
  const fractionalAmountCard = {
    ...convincingArgument,
    id: "effect-spec-fractional-amount-card",
    name: "Effect Spec Fractional Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: 1.5 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [fractionalAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "1.5"/,
    "Gain effect amounts should not accept fractional values",
  );
  const invalidMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-multiplier-card",
    name: "Effect Spec Invalid Multiplier",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: {
      kind: "completed-contracts",
      multiplier: Number.NaN,
    } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidMultiplierCard], highCouncilSeat: false }),
    /Invalid completed-contracts multiplier "NaN"/,
    "Completed-contract multipliers should be finite when present",
  );
  const negativeMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-negative-multiplier-card",
    name: "Effect Spec Negative Multiplier",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: {
      kind: "completed-contracts",
      multiplier: -1,
    } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [negativeMultiplierCard], highCouncilSeat: false }),
    /Invalid completed-contracts multiplier "-1"/,
    "Completed-contract multipliers should be non-negative integers when present",
  );
  const unsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-condition-card",
    name: "Effect Spec Unsupported Condition",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-alliance" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedConditionCard], highCouncilSeat: false }),
    /Unsupported effect condition "has-alliance"/,
    "Unsupported effect conditions should fail loudly instead of silently becoming false",
  );
  const skippedUnsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-skipped-unsupported-condition-card",
    name: "Effect Spec Skipped Unsupported Condition",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "visited-maker-space" }, { kind: "has-alliance" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [skippedUnsupportedConditionCard], highCouncilSeat: false }),
    /Unsupported effect condition "has-alliance"/,
    "Unsupported effect conditions should fail before applicability short-circuiting can hide them",
  );
  const invalidSpyCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-count-card",
    name: "Effect Spec Invalid Spy Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-spy-posts" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidSpyCountCard], highCouncilSeat: false }),
    /Invalid has-spy-posts count "undefined"/,
    "Spy-count conditions should fail loudly when count is missing",
  );
  const invalidInfluenceFactionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-faction-card",
    name: "Effect Spec Invalid Influence Faction",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-influence", faction: "guild", amount: 1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceFactionCard], highCouncilSeat: false }),
    /Unsupported effect faction "guild"/,
    "Influence conditions should reject unsupported faction ids",
  );
  const invalidInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-amount-card",
    name: "Effect Spec Invalid Influence Amount",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-influence", faction: "bene", amount: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceAmountCard], highCouncilSeat: false }),
    /Invalid has-influence amount "-1"/,
    "Influence conditions should require a non-negative integer threshold",
  );
  const invalidCompletedContractsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-completed-contracts-count-card",
    name: "Effect Spec Invalid Completed Contracts Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-completed-contracts", count: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCompletedContractsCountCard], highCouncilSeat: false }),
    /Invalid has-completed-contracts count "-1"/,
    "Completed-contract conditions should require a non-negative integer threshold",
  );
  const invalidCardTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-card",
    name: "Effect Spec Invalid Card Trait",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-card-trait-in-play", trait: "" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCardTraitCard], highCouncilSeat: false }),
    /Invalid has-card-trait-in-play trait ""/,
    "Card-trait conditions should require a non-empty trait",
  );
  const invalidCardTraitCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-count-card",
    name: "Effect Spec Invalid Card Trait Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-card-trait-in-play", trait: "Faction: Fremen", count: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCardTraitCountCard], highCouncilSeat: false }),
    /Invalid has-card-trait-in-play count "-1"/,
    "Card-trait conditions should require a non-negative integer threshold",
  );
  const invalidTeamConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-team-condition-card",
    name: "Effect Spec Invalid Team Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-team", team: "atreides" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTeamConditionCard, p2, p2),
    /Unsupported effect team "atreides"/,
    "Team conditions should reject unsupported team ids",
  );
  const invalidRoleConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-role-condition-card",
    name: "Effect Spec Invalid Role Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-role", role: "Captain" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRoleConditionCard, p2, p2),
    /Unsupported effect role "Captain"/,
    "Role conditions should reject unsupported role ids",
  );
  const invalidSpyPlacementAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-amount-card",
    name: "Effect Spec Invalid Spy Placement Amount",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "place-spies", selector: "self", amount: -1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidSpyPlacementAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Spy placement effect amounts should require a non-negative integer amount",
  );
	  const revealSpyPlacementCard = {
	    ...convincingArgument,
    id: "effect-spec-reveal-spy-placement-card",
    name: "Effect Spec Reveal Spy Placement",
    effects: [revealSpec([{ kind: "place-spies", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealSpyPlacementCard], highCouncilSeat: false }),
    /Unsupported effect "place-spies" for reveal/,
    "Spy placement specs should stay out of Reveal until a pending-action resolver supports them",
  );
  const agentTrashCard = {
    ...convincingArgument,
    id: "effect-spec-agent-trash-card",
    name: "Effect Spec Agent Trash Card",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentTrashCard, p2, p2),
    /Unsupported effect "trash-card" for agent-play/,
    "Trash-card specs should fail outside Reveal until an Agent pending-action resolver supports them",
  );
  const invalidTrashZoneCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-zone-card",
    name: "Effect Spec Invalid Trash Zone",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", zones: ["deck"], optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashZoneCard], highCouncilSeat: false }),
    /Unsupported trash-card zone "deck"/,
    "Trash-card specs should reject unsupported zones",
  );
  const invalidTrashTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-trait-card",
    name: "Effect Spec Invalid Trash Trait",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", requiredTrait: "", optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashTraitCard], highCouncilSeat: false }),
    /Invalid trash-card requiredTrait ""/,
    "Trash-card specs should require a non-empty required trait",
  );
  const invalidTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-strength-card",
    name: "Effect Spec Invalid Trash Strength",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", strengthReward: -1, optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashStrengthCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Trash-card strength rewards should require non-negative integer amounts",
  );
  const agentInfluenceIntrigueCard = {
    ...convincingArgument,
    id: "effect-spec-agent-influence-intrigue-card",
    name: "Effect Spec Agent Influence Intrigue",
    effects: [agentSpec([{ kind: "lose-influence-for-intrigues", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentInfluenceIntrigueCard, p2, p2),
    /Unsupported effect "lose-influence-for-intrigues" for agent-play/,
    "Influence-for-Intrigue specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidInfluenceIntrigueSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-selector-card",
    name: "Effect Spec Invalid Influence Intrigue Selector",
    effects: [revealSpec([{ kind: "lose-influence-for-intrigues", selector: "activated-ally", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceIntrigueSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Influence-for-Intrigue specs should reject activated Ally reveal selectors",
  );
  const invalidInfluenceIntrigueAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-amount-card",
    name: "Effect Spec Invalid Influence Intrigue Amount",
    effects: [revealSpec([{ kind: "lose-influence-for-intrigues", selector: "self", amount: -1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceIntrigueAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Influence-for-Intrigue specs should require non-negative integer amounts",
  );
  const revealDiscardInfluenceDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-influence-draw-card",
    name: "Effect Spec Reveal Discard Influence Draw",
    effects: [revealSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardInfluenceDrawCard], highCouncilSeat: false }),
    /Unsupported effect "discard-card-for-influence-and-draw" for reveal/,
    "Discard-for-Influence-and-draw specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardInfluenceDrawSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-selector-card",
    name: "Effect Spec Invalid Discard Influence Draw Selector",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "activated-ally",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-card-for-influence-and-draw/,
    "Discard-for-Influence-and-draw specs should reject activated Ally selectors",
  );
  const invalidDiscardInfluenceDrawAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-amount-card",
    name: "Effect Spec Invalid Discard Influence Draw Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: -1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative draw amounts",
  );
  const invalidDiscardInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-amount-card",
    name: "Effect Spec Invalid Discard Influence Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative Influence amounts",
  );
  const revealDeploymentBlockCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-deployment-block-card",
    name: "Effect Spec Reveal Deployment Block",
    effects: [revealSpec([{ kind: "block-conflict-deployment", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDeploymentBlockCard], highCouncilSeat: false }),
    /Unsupported effect "block-conflict-deployment" for reveal/,
    "Deployment-block specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDeploymentBlockSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-selector-card",
    name: "Effect Spec Invalid Deployment Block Selector",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for block-conflict-deployment/,
    "Deployment-block specs should reject activated Ally selectors",
  );
  const invalidDeploymentBlockSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-source-card",
    name: "Effect Spec Invalid Deployment Block Source",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSourceCard, p2, p2),
    /Invalid block-conflict-deployment source ""/,
    "Deployment-block specs should reject empty source labels",
  );
	  const conditionalRevealRetreatCard = {
	    ...convincingArgument,
	    id: "effect-spec-conditional-reveal-retreat-card",
	    name: "Effect Spec Conditional Reveal Retreat",
	    conditionalPersuasion: false,
	    effects: [revealSpec(
	      [{ kind: "retreat-troops-for-strength", selector: "self", amount: 1, strength: 3 }],
	      [{ kind: "has-conflict-units", count: 2 }],
	    )],
	  };
	  const commanderRetreatFixture = withActivePlayer(game, p4.id, () => ({
	    agentsReady: 0,
	    conflict: 0,
	    deployedTroops: 0,
	    hand: [conditionalRevealRetreatCard],
	    playArea: [],
	  }));
	  const commanderRetreatState = {
	    ...commanderRetreatFixture,
	    players: commanderRetreatFixture.players.map((player) =>
	      player.id === p2.id
	        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
	        : player,
	    ),
	  };
	  const commanderRetreatPlan = turnActions.revealTurnPlan(playerById(commanderRetreatState, p4.id), commanderRetreatState);
	  const commanderRetreatRevealed = turnActions.revealTurnAction(commanderRetreatState, {
	    commanderTargets: { [p4.id]: p2.id },
	    revealPlan: commanderRetreatPlan,
	  });
	  assert.equal(
	    commanderRetreatRevealed.pendingAction?.kind,
	    "retreat-troops-for-strength",
	    "Conditional Reveal retreat should evaluate conflict-unit conditions against the activated Ally",
	  );
	  const commanderRetreatUnqualifiedState = {
	    ...commanderRetreatFixture,
	    players: commanderRetreatFixture.players.map((player) =>
	      player.id === p2.id
	        ? { ...player, conflict: 2, deployedTroops: 1, garrison: 0 }
	        : player,
	    ),
	  };
	  const commanderRetreatUnqualifiedPlan = turnActions.revealTurnPlan(
	    playerById(commanderRetreatUnqualifiedState, p4.id),
	    commanderRetreatUnqualifiedState,
	  );
	  const commanderRetreatUnqualified = turnActions.revealTurnAction(commanderRetreatUnqualifiedState, {
	    commanderTargets: { [p4.id]: p2.id },
	    revealPlan: commanderRetreatUnqualifiedPlan,
	  });
	  assert.equal(
	    commanderRetreatUnqualified.pendingAction,
	    undefined,
	    "Conditional Reveal retreat should not use the Commander as the conflict-unit condition owner",
	  );
	  const invalidConflictUnitsCountCard = {
	    ...convincingArgument,
	    id: "effect-spec-invalid-conflict-units-count-card",
	    name: "Effect Spec Invalid Conflict Units Count",
	    effects: [agentSpec(
	      [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
	      [{ kind: "has-conflict-units", count: -1 }],
	    )],
	  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidConflictUnitsCountCard, p2, p2),
    /Invalid has-conflict-units count "-1"/,
    "Conflict-unit conditions should require a non-negative integer threshold",
  );
	  const revealIntrigueDrawCard = {
	    ...convincingArgument,
	    id: "effect-spec-reveal-intrigue-draw-card",
    name: "Effect Spec Reveal Intrigue Draw",
    effects: [revealSpec([{ kind: "draw-intrigues", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealIntrigueDrawCard], highCouncilSeat: false }),
	    /Unsupported effect "draw-intrigues" for reveal/,
	    "Intrigue draw specs should stay out of Reveal until a reveal-time state resolver supports them",
	  );
	  const agentRetreatStrengthCard = {
	    ...convincingArgument,
	    id: "effect-spec-agent-retreat-strength-card",
	    name: "Effect Spec Agent Retreat Strength",
	    effects: [{
	      trigger: "agent-play",
	      effects: [{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: 4 }],
	    }],
	  };
	  assert.throws(
	    () => state.applyCardAgentEffect(agentRetreatStrengthCard, p2, p2),
	    /Unsupported effect "retreat-troops-for-strength" for agent-play/,
	    "Retreat-for-strength specs should stay in Reveal until other trigger resolvers support them",
	  );
	  const invalidRetreatStrengthCard = {
	    ...convincingArgument,
	    id: "effect-spec-invalid-retreat-strength-card",
	    name: "Effect Spec Invalid Retreat Strength",
	    effects: [revealSpec([{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: -4 }])],
	  };
	  assert.throws(
	    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRetreatStrengthCard], highCouncilSeat: false }),
	    /Invalid effect amount "-4"/,
	    "Retreat-for-strength specs should require non-negative strength",
	  );
	  const unsupportedEffectCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-effect-card",
    name: "Effect Spec Unsupported Effect",
    effects: [revealSpec([{ kind: "draw-card", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedEffectCard], highCouncilSeat: false }),
    /Unsupported effect "draw-card"/,
    "Unsupported effects should fail loudly instead of silently becoming no-ops",
  );
  const unsupportedResourceCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-resource-card",
    name: "Effect Spec Unsupported Resource",
    effects: [revealSpec([{ kind: "gain-resource", selector: "self", resource: "melange", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedResourceCard], highCouncilSeat: false }),
    /Unsupported effect resource "melange"/,
    "Unsupported resource ids should fail before they can enter revealGain",
  );
  const unsupportedTriggerCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-trigger-card",
    name: "Effect Spec Unsupported Trigger",
    effects: [{
      trigger: "reveall",
      effects: [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedTriggerCard], highCouncilSeat: false }),
    /Unsupported effect trigger "reveall"/,
    "Unsupported effect triggers should fail loudly instead of falling back to legacy fields",
  );
  const nonRevealUnsupportedEffectCard = {
    ...convincingArgument,
    id: "effect-spec-non-reveal-unsupported-effect-card",
    name: "Effect Spec Non-Reveal Unsupported Effect",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "draw-card", selector: "self", amount: 1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [nonRevealUnsupportedEffectCard], highCouncilSeat: false }),
    /Unsupported effect "draw-card"/,
    "Unsupported non-Reveal effect shapes should fail before Reveal filtering can hide them",
  );

  const noMakerReveal = turnActions.revealTurnPlan({ ...p2, hand: [smuggler], highCouncilSeat: false }, game);
  assert.equal(noMakerReveal.persuasion, 1, "Smuggler's Harvester spec should include base persuasion");
  assert.equal(noMakerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not gain spice without a Maker visit");
  const makerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smuggler], highCouncilSeat: false },
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
  );
  assert.equal(makerReveal.revealGain.spice, 1, "Smuggler's Harvester should gain spice after a Maker visit");

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const interstellarReveal = turnActions.revealTurnPlan({
    ...p2,
    contracts: [...completedContracts, { card: data.standardContracts[2], completed: false, takenRound: 1 }],
    hand: [interstellarTrade],
    highCouncilSeat: false,
  }, game);
  assert.equal(interstellarReveal.persuasion, 2, "Interstellar Trade should use completed-contract amount specs");

  const beneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id }, sharedSpyPosts: {} },
  );
  assert.equal(beneReveal.persuasion, 3, "Bene Gesserit Operative should use spy-count reveal specs");
  const sharedBeneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    {
      ...game,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
      sharedSpyPosts: { [secrets.id]: [p2.id] },
    },
  );
  assert.equal(sharedBeneReveal.persuasion, 3, "Shared spy posts should count for owner-scoped reveal specs");
  const teammateSpyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: "p6" }, sharedSpyPosts: {} },
  );
  assert.equal(teammateSpyReveal.persuasion, 1, "Teammate spy posts should not count for owner-scoped reveal specs");

  const prepareDrawSource = {
    ...p2,
    deck: [{ ...dagger, id: "prepare-the-way-draw-fixture" }],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 2 },
  };
  const prepared = state.applyCardAgentEffect(
    prepareTheWay,
    prepareDrawSource,
    prepareDrawSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? prepareDrawSource : player) },
  );
  assert.equal(prepared.source.hand.length, 1, "Prepare The Way Agent spec should draw at 2 Bene Gesserit Influence");
  assert.match(prepared.log ?? "", /Prepare The Way: draws 1 card/);
  const unpreparedSource = { ...prepareDrawSource, deck: [{ ...dagger, id: "prepare-the-way-blocked-draw-fixture" }], influence: p2.influence };
  const unprepared = state.applyCardAgentEffect(
    prepareTheWay,
    unpreparedSource,
    unpreparedSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? unpreparedSource : player) },
  );
  assert.equal(unprepared.source.hand.length, 0, "Prepare The Way Agent spec should not draw below 2 Bene Gesserit Influence");
  assert.equal(unprepared.log, undefined, "Prepare The Way Agent spec should not log below its Influence threshold");

  const maulaDraw = { ...dagger, id: "maula-pistol-agent-draw-fixture" };
  const maulaPistolEffect = state.applyCardAgentEffect(
    maulaPistol,
    { ...p2, deck: [maulaDraw], discard: [], hand: [] },
    p2,
  );
  assert.equal(maulaPistolEffect.source.hand[0]?.id, maulaDraw.id, "Maula Pistol Agent spec should draw 1 card");
  assert.match(maulaPistolEffect.log ?? "", /Maula Pistol: draws 1 card/);

  const cargoRunnerDeck = [
    { ...dagger, id: "cargo-runner-agent-draw-1" },
    { ...convincingArgument, id: "cargo-runner-agent-draw-2" },
  ];
  const cargoRunnerUncontracted = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: [], deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerUncontracted.source.hand.length, 0, "Cargo Runner should not draw below two completed contracts");
  assert.equal(cargoRunnerUncontracted.log, undefined, "Cargo Runner should not log below its completed-contract threshold");
  const cargoRunnerTwoContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: completedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerTwoContracts.source.hand.length, 1, "Cargo Runner should draw 1 card with two completed contracts");
  assert.match(cargoRunnerTwoContracts.log ?? "", /Cargo Runner: draws 1 card/);
  const fourCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const cargoRunnerFourContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: fourCompletedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerFourContracts.source.hand.length, 2, "Cargo Runner should draw 2 cards with four completed contracts");
  assert.match(cargoRunnerFourContracts.log ?? "", /Cargo Runner: draws 2 cards/);

  const chaniQualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniQualified.sourceIntriguesToDraw, 1, "Chani should expose a pending Intrigue draw at three conflict units");
  assert.equal(chaniQualified.log, undefined, "Chani should let the actual Intrigue draw log report the draw");
  const chaniWithWorm = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 1 },
    p2,
  );
  assert.equal(chaniWithWorm.sourceIntriguesToDraw, 1, "Chani should count sandworms as conflict units");
  const commanderChani = state.applyCardAgentEffect(
    chani,
    p4,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
  );
  assert.equal(
    commanderChani.sourceIntriguesToDraw,
    1,
    "Chani should use the activated Ally's conflict units during Commander Agent turns",
  );
  const chaniUnqualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniUnqualified.sourceIntriguesToDraw, undefined, "Chani should not draw below three conflict units");
  assert.equal(chaniUnqualified.log, undefined, "Chani should not log below the conflict-unit threshold");

	  const chaniIntrigue = data.intrigueCards[0];
	  assert.ok(chaniIntrigue, "Verifier needs an Intrigue fixture");
	  const chaniSecondIntrigue = data.intrigueCards[1];
	  assert.ok(chaniSecondIntrigue, "Verifier needs a second Intrigue fixture");
  const chaniFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 3,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniPlaced = turnActions.placeAgentAction(
    { ...chaniFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniPlaced, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani Agent spec should draw from the Intrigue deck during Agent placement",
  );
  assert.deepEqual(chaniPlaced.intrigueDeck, [], "Chani Agent spec should remove the drawn Intrigue from the deck");
  assert.deepEqual(chaniPlaced.intrigueDiscard, [], "Chani Agent spec should not mutate the Intrigue discard");
  assert.match(chaniPlaced.log.join("\n"), /draws an Intrigue card from Chani, Clever Tactician/);
  const chaniBlockedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-blocked-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniBlocked = turnActions.placeAgentAction(
    { ...chaniBlockedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniBlocked, p2.id).intrigues.length,
    0,
    "Chani Agent spec should not draw before reaching three conflict units",
  );
  assert.equal(chaniBlocked.intrigueDeck[0]?.id, chaniIntrigue.id, "Blocked Chani should leave the Intrigue deck untouched");
  assert.deepEqual(chaniBlocked.intrigueDiscard, [], "Blocked Chani should leave the Intrigue discard untouched");
  assert.equal(
    chaniBlocked.pendingAction?.kind,
    "deploy",
    "Conflict-unit-gated Intrigue draw should defer while deployment can reach the threshold",
  );
  assert.equal(
    chaniBlocked.pendingAction?.postDeployIntrigueDraw?.minConflictUnits,
    3,
    "Deferred Chani draw should track the printed conflict-unit threshold",
  );
  const chaniDeferred = state.deployTroopToConflict(chaniBlocked, chaniBlocked.pendingAction);
  assert.equal(
    playerById(chaniDeferred, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after deployment reaches three conflict units",
  );
  assert.deepEqual(chaniDeferred.intrigueDeck, [], "Deferred Chani draw should remove the Intrigue from the deck");
  assert.deepEqual(chaniDeferred.intrigueDiscard, [], "Deferred Chani draw should not mutate the Intrigue discard");
	  assert.equal(
	    chaniDeferred.pendingAction?.kind === "deploy"
	      ? chaniDeferred.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Deferred Chani draw should resolve at most once",
	  );
	  const chaniMultiDeployFixture = withActivePlayer(game, p2.id, () => ({
	    agentsReady: 1,
	    deck: [{ ...dagger, id: "chani-multi-arrakeen-board-draw-fixture" }],
	    discard: [],
	    deployedTroops: 1,
	    deployedSandworms: 0,
	    garrison: 2,
	    hand: [chani],
	    intrigues: [],
	    playArea: [],
	  }));
	  const chaniMultiDeployPending = turnActions.placeAgentAction(
	    { ...chaniMultiDeployFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
	    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
	  );
	  assert.equal(
	    chaniMultiDeployPending.pendingAction?.kind,
	    "deploy",
	    "Multi-deploy Chani fixture should queue deployment",
	  );
	  const chaniFirstDeploy = state.deployTroopToConflict(chaniMultiDeployPending, chaniMultiDeployPending.pendingAction);
	  assert.equal(
	    playerById(chaniFirstDeploy, p2.id).intrigues.length,
	    0,
	    "Chani should not draw after a first deployment that remains below three conflict units",
	  );
	  assert.equal(
	    chaniFirstDeploy.pendingAction?.kind === "deploy"
	      ? chaniFirstDeploy.pendingAction.postDeployIntrigueDraw?.minConflictUnits
	      : undefined,
	    3,
	    "Chani's deferred draw should stay pending until a later deployment reaches the threshold",
	  );
	  assert.equal(chaniFirstDeploy.intrigueDeck[0]?.id, chaniIntrigue.id, "Below-threshold Chani deployment should leave the deck untouched");
	  assert.equal(
	    chaniFirstDeploy.pendingAction?.kind,
	    "deploy",
	    "Chani should still have a deployment pending after the first multi-deploy troop",
	  );
	  const chaniSecondDeploy = state.deployTroopToConflict(chaniFirstDeploy, chaniFirstDeploy.pendingAction);
	  assert.equal(
	    playerById(chaniSecondDeploy, p2.id).intrigues[0]?.id,
	    chaniIntrigue.id,
	    "Chani should draw after a later deployment reaches three conflict units",
	  );
	  assert.deepEqual(chaniSecondDeploy.intrigueDeck, [], "Multi-deploy Chani draw should remove the Intrigue from the deck");
	  assert.equal(
	    chaniSecondDeploy.pendingAction?.kind === "deploy"
	      ? chaniSecondDeploy.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Multi-deploy Chani draw should clear the deferred draw after it resolves",
	  );
	  const chaniSkippedFixture = withActivePlayer(game, p2.id, () => ({
	    agentsReady: 1,
	    deck: [{ ...dagger, id: "chani-skipped-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniSkippedPending = turnActions.placeAgentAction(
    { ...chaniSkippedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  const chaniSkipped = state.finishPendingAction(chaniSkippedPending);
  assert.equal(
    playerById(chaniSkipped, p2.id).intrigues.length,
    0,
    "Skipping deployment should not resolve Chani's deferred Intrigue draw below the threshold",
  );
  assert.deepEqual(chaniSkipped.intrigueDeck, [chaniIntrigue], "Skipped Chani deployment should leave the Intrigue deck untouched");
  assert.deepEqual(chaniSkipped.intrigueDiscard, [], "Skipped Chani deployment should leave the Intrigue discard untouched");

  const chaniMakerFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    garrison: 0,
    hand: [chani],
    intrigues: [],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const chaniMakerChoice = turnActions.placeAgentAction(
    { ...chaniMakerFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], shieldWall: false, spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
  );
  assert.equal(chaniMakerChoice.pendingAction?.kind, "maker-choice", "Chani on Hagga Basin should defer through the Maker choice");
  assert.equal(
    chaniMakerChoice.pendingAction?.kind === "maker-choice"
      ? chaniMakerChoice.pendingAction.postDeployIntrigueDraw?.minConflictUnits
      : undefined,
    3,
    "Maker-choice Chani draw should carry the conflict-unit threshold",
  );
  const chaniMakerWorm = state.resolveMakerChoice(chaniMakerChoice, chaniMakerChoice.pendingAction, "sandworms");
  assert.equal(
    playerById(chaniMakerWorm, p3.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after a Maker-choice sandworm reaches three conflict units",
  );
	  assert.deepEqual(chaniMakerWorm.intrigueDeck, [], "Maker-choice Chani draw should remove the Intrigue from the deck");
	  assert.deepEqual(chaniMakerWorm.intrigueDiscard, [], "Maker-choice Chani draw should not mutate the Intrigue discard");
	  const chaniMakerDeployFixture = withActivePlayer(game, p3.id, () => ({
	    agentsReady: 1,
	    deck: [],
	    discard: [],
	    deployedTroops: 2,
	    deployedSandworms: 0,
	    garrison: 1,
	    hand: [chani],
	    intrigues: [],
	    makerHooks: true,
	    playArea: [],
	    resources: { solari: 0, spice: 0, water: 1 },
	  }));
	  const chaniMakerDeployChoice = turnActions.placeAgentAction(
	    {
	      ...chaniMakerDeployFixture,
	      intrigueDeck: [chaniIntrigue, chaniSecondIntrigue],
	      intrigueDiscard: [],
	      shieldWall: false,
	      spaces: {},
	    },
	    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
	  );
	  assert.equal(
	    chaniMakerDeployChoice.pendingAction?.kind,
	    "maker-choice",
	    "Maker-choice Chani fixture should resolve a Maker choice first",
	  );
	  assert.equal(
	    chaniMakerDeployChoice.pendingQueue[0]?.kind,
	    "deploy",
	    "Maker-choice Chani fixture should keep deployment queued behind the Maker choice",
	  );
	  const chaniMakerDeployWorm = state.resolveMakerChoice(
	    chaniMakerDeployChoice,
	    chaniMakerDeployChoice.pendingAction,
	    "sandworms",
	  );
	  assert.equal(
	    playerById(chaniMakerDeployWorm, p3.id).intrigues.length,
	    1,
	    "Maker-choice Chani should draw once when the sandworm reaches the threshold",
	  );
	  assert.deepEqual(
	    chaniMakerDeployWorm.intrigueDeck,
	    [chaniSecondIntrigue],
	    "Maker-choice Chani should leave the second Intrigue card in the deck after the first draw",
	  );
	  assert.equal(
	    chaniMakerDeployWorm.pendingAction?.kind === "deploy"
	      ? chaniMakerDeployWorm.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Maker-choice Chani draw should clear duplicate deferred metadata from the queued deploy",
	  );
	  assert.equal(chaniMakerDeployWorm.pendingAction?.kind, "deploy", "Maker-choice Chani should advance to the queued deploy");
	  const chaniMakerDeployAfterDeploy = state.deployTroopToConflict(
	    chaniMakerDeployWorm,
	    chaniMakerDeployWorm.pendingAction,
	  );
	  assert.equal(
	    playerById(chaniMakerDeployAfterDeploy, p3.id).intrigues.length,
	    1,
	    "Queued deployment after a Maker-choice Chani draw should not draw a second Intrigue",
	  );
	  assert.deepEqual(
	    chaniMakerDeployAfterDeploy.intrigueDeck,
	    [chaniSecondIntrigue],
	    "Queued deployment after a Maker-choice Chani draw should leave the remaining Intrigue in the deck",
	  );

	  const makerKeeperSource = {
    ...p2,
    resources: { solari: 0, spice: 0, water: 0 },
    influence: { ...p2.influence, bene: 2, fringeWorlds: 2 },
  };
  const makerKept = state.applyCardAgentEffect(
    makerKeeper,
    makerKeeperSource,
    makerKeeperSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? makerKeeperSource : player) },
  );
  assert.deepEqual(
    makerKept.source.resources,
    { solari: 0, spice: 1, water: 1 },
    "Maker Keeper should use Fremen-icon influence for its conditional Agent spice",
  );
  assert.equal(makerKept.sourceSpiceGained, 1, "Maker Keeper Agent spice should be trackable");
  assert.match(makerKept.log ?? "", /Maker Keeper: gains 1 spice and 1 water/);
  const unqualifiedMakerKeeper = state.applyCardAgentEffect(
    makerKeeper,
    { ...makerKeeperSource, influence: p2.influence },
    { ...makerKeeperSource, influence: p2.influence },
    { ...game, players: game.players.map((player) => player.id === p2.id ? { ...makerKeeperSource, influence: p2.influence } : player) },
  );
  assert.deepEqual(
    unqualifiedMakerKeeper.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Maker Keeper should not gain Agent resources below Influence thresholds",
  );
  assert.equal(unqualifiedMakerKeeper.log, undefined, "Maker Keeper should not log when no Agent spec applies");
  const northernWatermasterEffect = state.applyCardAgentEffect(
    northernWatermaster,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(northernWatermasterEffect.source.resources, { solari: 0, spice: 0, water: 1 }, "Northern Watermaster should gain 1 Agent water");
  assert.match(northernWatermasterEffect.log ?? "", /Northern Watermaster: gains 1 water/);
  const paracompassEffect = state.applyCardAgentEffect(
    paracompass,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(paracompassEffect.source.resources, { solari: 2, spice: 0, water: 0 }, "Paracompass should gain 2 Agent Solari");
  assert.match(paracompassEffect.log ?? "", /Paracompass: gains 2 Solari/);
  const devastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    { ...p2, garrison: 0 },
  );
  assert.equal(devastatingAssaultEffect.source.resources.solari, 1, "Devastating Assault should gain 1 Agent Solari");
  assert.equal(devastatingAssaultEffect.target.garrison, 1, "Devastating Assault should recruit 1 troop for the activated Ally");
  assert.equal(devastatingAssaultEffect.recruitedTroops, 1, "Activated-Ally Agent recruits should be exposed for deployment limits");
  assert.match(devastatingAssaultEffect.log ?? "", /Devastating Assault: gains 1 Solari; .* recruits 1 troop/);
  const invalidDevastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    p4,
  );
  assert.equal(invalidDevastatingAssaultEffect.source.resources.solari, 0, "Routed Agent specs should not partially apply without an activated Ally");
  assert.equal(invalidDevastatingAssaultEffect.log, undefined, "Invalid routed Agent specs should not log");

  const manualCard = {
    ...convincingArgument,
    id: "effect-spec-manual-reveal",
    name: "Manual Reveal Fixture",
    conditionalPersuasion: true,
  };
  const manualFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    hand: [manualCard],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const manualPlan = turnActions.revealTurnPlan(playerById(manualFixture, p2.id), manualFixture);
  assert.deepEqual(manualPlan.printedRevealCards, [manualCard.name], "Manual reveal fallback should still be reported");
  const manualRevealed = turnActions.revealTurnAction(manualFixture, {
    commanderTargets: {},
    revealPlan: manualPlan,
  });
  assert.equal(manualRevealed.pendingAction?.kind, "reveal-adjust", "Manual reveal fallback should still queue reveal adjustment");

  console.log("card effect spec verification passed");
} finally {
  await server.close();
}
