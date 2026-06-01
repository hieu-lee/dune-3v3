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

function hasRevealSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "reveal") ?? false;
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
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  const limitedLandsraadAccess = data.muadDibCommanderCards.find((card) => card.name === "Limited Landsraad Access");
  const imperialOrnithopter = data.emperorCommanderCards.find((card) => card.name === "Imperial Ornithopter");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(convincingArgument && dagger && smuggler && interstellarTrade && beneGesseritOperative);
  assert.ok(prepareTheWay && limitedLandsraadAccess && imperialOrnithopter);
  assert.ok(imperialBasin && secrets && highCouncil);
  assert.equal(revealSpecCards.length, 31, "Unexpected number of cards with declarative Reveal specs");
  for (const card of [
    convincingArgument,
    dagger,
    prepareTheWay,
    limitedLandsraadAccess,
    imperialOrnithopter,
    smuggler,
    interstellarTrade,
    beneGesseritOperative,
  ]) {
    assert.ok(
      card.effects?.some((spec) => spec.trigger === "reveal"),
      `${card.name} should carry a declarative Reveal effect spec`,
    );
  }
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
