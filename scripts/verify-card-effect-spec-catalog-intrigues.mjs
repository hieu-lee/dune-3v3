import assert from "node:assert/strict";
import { verifyCardEffectSpecDevourInspire } from "./verify-card-effect-spec-devour-inspire.mjs";
import {
  hasAcquireSpec,
  hasCombatEffect,
  hasFixedRevealReward,
  hasPlotEffect,
  hasRevealSpec,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecCatalogIntrigues({
  cards,
  effectResolver,
  game,
  groups,
  players,
  spaces,
  state,
}) {
  const { marketAndImperiumCards, revealSpecCards } = groups;
  const { p2, p4, p6 } = players;
  const { highCouncil, secrets } = spaces;
  const {
    contingencyPlan,
    councilorsAmbition,
    devour,
    findWeakness,
    goToGround,
    impress,
    inspireAwe,
    questionableMethods,
    reachAgreement,
    spiceIsPower,
    springTheTrap,
    spyNetwork,
    tacticalOption,
  } = cards;
  assert.equal(
    revealSpecCards.length,
    83,
    "Unexpected number of cards with declarative Reveal specs",
  );
  assert.equal(
    marketAndImperiumCards.filter(hasFixedRevealReward).length,
    48,
    "Unexpected number of reserve/Imperium cards with fixed reveal rewards",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter((card) => hasFixedRevealReward(card) && !hasRevealSpec(card))
      .map((card) => card.name)
      .sort(),
    [],
    "Every reserve/Imperium fixed reveal reward should have a declarative Reveal spec",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter((card) => !hasRevealSpec(card))
      .map((card) => card.name)
      .sort(),
    [],
    "Every reserve/Imperium card should now carry a declarative Reveal spec",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter(hasAcquireSpec)
      .map((card) => card.name)
      .sort(),
    [
      "Guild Spy",
      "In High Places",
      "Interstellar Trade",
      "Overthrow",
      "Price is No Object",
      "Spy Network",
      "Steersman",
      "Strike Fleet",
      "Subversive Advisor",
      "The Spice Must Flow",
    ],
    "Only implemented acquisition reward cards should currently carry declarative Acquire specs",
  );
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
    "Spy Network should carry a typed conditional Reveal spy-recall Intrigue spec",
  );
  assert.deepEqual(
    effectResolver.resolveRevealSpyRecallForIntrigues(spyNetwork.effects, {
      trigger: "reveal",
      source: p2,
      state: {
        ...game,
        spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
        sharedSpyPosts: {},
      },
    }),
    [
      {
      selector: "self",
      amount: 1,
      drawIntrigues: 1,
      persuasionReward: 0,
      optional: true,
      source: "Spy Network",
      },
    ],
    "Spy Network Reveal spy-recall spec should resolve with two owned spy posts",
  );
  assert.deepEqual(
    effectResolver.resolveRevealSpyRecallForIntrigues(spyNetwork.effects, {
      trigger: "reveal",
      source: p2,
      state: { ...game, spyPosts: { [secrets.id]: p2.id }, sharedSpyPosts: {} },
    }),
    [],
    "Spy Network Reveal spy-recall spec should not resolve below two owned spy posts",
  );
  assert.ok(
    councilorsAmbition.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-high-council-seat",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.amount === 2,
        ),
    ),
    "Councilor's Ambition should carry a typed High Council-gated Plot Intrigue water gain spec",
  );
  const councilorsAmbitionPlotResolved = effectResolver.resolveGameEffects(
    councilorsAmbition.effects,
    {
      trigger: "plot-intrigue",
      source: { ...p2, highCouncilSeat: true },
      state: game,
    },
  );
  assert.equal(
    councilorsAmbitionPlotResolved.revealGain.water,
    2,
    "Councilor's Ambition Plot spec should resolve its water gain with a High Council seat",
  );
  const councilorsAmbitionNoSeatResolved = effectResolver.resolveGameEffects(
    councilorsAmbition.effects,
    {
      trigger: "plot-intrigue",
      source: { ...p2, highCouncilSeat: false },
      state: game,
    },
  );
  assert.equal(
    councilorsAmbitionNoSeatResolved.revealGain.water,
    undefined,
    "Councilor's Ambition Plot spec should not resolve without a High Council seat",
  );
  assert.ok(
    hasPlotEffect(
      contingencyPlan,
      (effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 2,
    ),
    "Contingency Plan should carry a typed Plot Intrigue Solari gain spec",
  );
  const contingencyPlanPlotResolved = effectResolver.resolveGameEffects(
    contingencyPlan.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    contingencyPlanPlotResolved.revealGain.solari,
    2,
    "Contingency Plan Plot spec should resolve its Solari gain",
  );
  assert.ok(
    hasCombatEffect(
      contingencyPlan,
      (effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 3,
    ),
    "Contingency Plan should carry a typed Combat Intrigue strength spec",
  );
  const contingencyPlanCombatResolved = effectResolver.resolveGameEffects(
    contingencyPlan.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    contingencyPlanCombatResolved.swords,
    3,
    "Contingency Plan Combat spec should resolve its strength",
  );
  assert.ok(
    hasCombatEffect(
      impress,
      (effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2,
    ),
    "Impress should carry a typed Combat Intrigue strength spec",
  );
  assert.ok(
    hasCombatEffect(
      impress,
      (effect) =>
        effect.kind === "acquire-card" &&
        effect.selector === "self" &&
        effect.maxCost === 3 &&
        effect.destination === "discard" &&
        effect.source === "Impress",
    ),
    "Impress should carry a typed Combat Intrigue acquire-card spec",
  );
  const impressCombatResolved = effectResolver.resolveGameEffects(
    impress.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    impressCombatResolved.swords,
    2,
    "Impress Combat spec should resolve its strength",
  );
  const impressAcquireEffects = effectResolver.resolveAcquireCards(
    impress.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    impressAcquireEffects.length,
    1,
    "Impress Combat spec should resolve one acquire-card effect",
  );
  assert.equal(
    impressAcquireEffects[0]?.selector,
    "self",
    "Impress acquisition should target self in the card spec",
  );
  assert.equal(
    impressAcquireEffects[0]?.maxCost,
    3,
    "Impress acquisition should cap card cost at 3",
  );
  assert.equal(
    impressAcquireEffects[0]?.destination,
    "discard",
    "Impress acquisition should go to discard",
  );
  assert.equal(
    impressAcquireEffects[0]?.optional,
    false,
    "Impress acquisition should be mandatory when available",
  );
  assert.equal(
    impressAcquireEffects[0]?.source,
    "Impress",
    "Impress acquire-card effect should preserve its source",
  );
  assert.ok(
    hasCombatEffect(
      findWeakness,
      (effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2,
    ),
    "Find Weakness should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    findWeakness.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-spy-posts" && condition.count === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recall-spy" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.strengthReward === 3 &&
            effect.optional === true &&
            effect.source === "Find Weakness",
        ),
    ),
    "Find Weakness should carry a typed optional Combat spy-recall strength spec",
  );
  const findWeaknessBaseCombat = effectResolver.resolveGameEffects(
    findWeakness.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    findWeaknessBaseCombat.swords,
    2,
    "Find Weakness Combat spec should resolve its base strength",
  );
  assert.deepEqual(
    effectResolver.resolveCombatSpyRecallForStrengths(findWeakness.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Find Weakness spy-recall spec should not resolve without an owned spy post",
  );
  const findWeaknessSpyRecallEffects =
    effectResolver.resolveCombatSpyRecallForStrengths(findWeakness.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: { ...game, spyPosts: { [secrets.id]: p2.id }, sharedSpyPosts: {} },
    });
  assert.deepEqual(
    findWeaknessSpyRecallEffects,
    [
      {
        selector: "self",
        amount: 1,
        strength: 3,
        optional: true,
        source: "Find Weakness",
      },
    ],
    "Find Weakness spy-recall spec should resolve with one owned spy post",
  );
  assert.ok(
    goToGround.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops" &&
            effect.selector === "self" &&
            effect.min === 1 &&
            effect.max === 2 &&
            effect.source === "Go To Ground",
        ),
    ),
    "Go To Ground should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    goToGround.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Go To Ground",
        ),
    ),
    "Go To Ground should carry a typed Combat spy-placement spec",
  );
  const goToGroundCombatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 2,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(
      goToGround.effects,
      goToGroundCombatContext,
    ),
    [{ selector: "self", count: 2, min: 1, max: 2, source: "Go To Ground" }],
    "Go To Ground selected retreat spec should resolve the chosen troop count",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(
      goToGround.effects,
      goToGroundCombatContext,
    ).spyPlacements,
    [
      {
        count: 1,
      recallForSupply: undefined,
      mustPlace: undefined,
      placementIcon: undefined,
      placementIcons: undefined,
      allowSharedPost: undefined,
        source: "Go To Ground",
        postPlacementAction: undefined,
      },
    ],
    "Go To Ground spy-placement spec should resolve through the generic effect resolver",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(goToGround.effects, {
      ...goToGroundCombatContext,
      choiceId: undefined,
    }).spyPlacements,
    [],
    "Go To Ground spy-placement spec should remain gated by the selected-retreat choice",
  );
  assert.ok(
    spiceIsPower.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops" &&
            effect.selector === "self" &&
            effect.min === 3 &&
            effect.max === 3 &&
            effect.source === "Spice is Power",
        ),
    ),
    "Spice is Power should carry a typed exact Combat troop-retreat spec",
  );
  assert.ok(
    spiceIsPower.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 3 &&
            effect.source === "Spice is Power",
        ),
    ),
    "Spice is Power should carry a typed Combat spice gain spec",
  );
  assert.ok(
    spiceIsPower.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "spend-spice" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 3 &&
            effect.source === "Spice is Power",
        ),
    ),
    "Spice is Power should carry a typed Combat spice spend spec",
  );
  assert.ok(
    spiceIsPower.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "spend-spice" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-strength" &&
            effect.selector === "self" &&
            effect.amount === 6,
        ),
    ),
    "Spice is Power should carry a typed spend-branch Combat strength spec",
  );
  const spiceIsPowerRetreatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 3,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(
      spiceIsPower.effects,
      spiceIsPowerRetreatContext,
    ),
    [{ selector: "self", count: 3, min: 3, max: 3, source: "Spice is Power" }],
    "Spice is Power retreat branch should resolve exactly three selected troops",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(
      spiceIsPower.effects,
      spiceIsPowerRetreatContext,
    ).revealGain,
    { spice: 3 },
    "Spice is Power retreat branch should resolve its typed spice gain",
  );
  const spiceIsPowerSpendResolved = effectResolver.resolveGameEffects(
    spiceIsPower.effects,
    {
      trigger: "combat-intrigue",
      choiceId: "spend-spice",
      source: p2,
      target: p2,
      state: game,
    },
  );
  assert.equal(
    spiceIsPowerSpendResolved.swords,
    6,
    "Spice is Power spend branch should resolve typed Combat strength",
  );
  assert.deepEqual(
    spiceIsPowerSpendResolved.spentResources,
    { spice: 3 },
    "Spice is Power spend branch should resolve its typed spice spend",
  );
  const spiceIsPowerNoChoice = effectResolver.resolveGameEffects(
    spiceIsPower.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      target: p2,
      state: game,
    },
  );
  assert.equal(
    spiceIsPowerNoChoice.swords,
    0,
    "Spice is Power specs should remain choice-gated",
  );
  assert.deepEqual(
    spiceIsPowerNoChoice.revealGain,
    {},
    "Spice is Power should not gain spice without a branch choice",
  );
  assert.deepEqual(
    spiceIsPowerNoChoice.spentResources,
    {},
    "Spice is Power should not spend spice without a branch choice",
  );
  assert.ok(
    tacticalOption.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "add-strength" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-strength" &&
            effect.selector === "self" &&
            effect.amount === 2,
        ),
    ),
    "Tactical Option should carry a typed selected Combat strength branch spec",
  );
  assert.ok(
    tacticalOption.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops" &&
            effect.selector === "self" &&
            effect.min === 1 &&
            effect.max?.kind === "deployed-troops" &&
            effect.source === "Tactical Option",
        ),
    ),
    "Tactical Option should carry a typed selected Combat dynamic troop-retreat spec",
  );
  const tacticalStrengthResolved = effectResolver.resolveGameEffects(
    tacticalOption.effects,
    {
      trigger: "combat-intrigue",
      choiceId: "add-strength",
      source: p2,
      target: p2,
      state: game,
    },
  );
  assert.equal(
    tacticalStrengthResolved.swords,
    2,
    "Tactical Option strength branch should resolve typed Combat strength",
  );
  const tacticalNoChoice = effectResolver.resolveGameEffects(
    tacticalOption.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      target: p2,
      state: game,
    },
  );
  assert.equal(
    tacticalNoChoice.swords,
    0,
    "Tactical Option specs should remain choice-gated",
  );
  const tacticalRetreatSource = { ...p2, deployedTroops: 4 };
  const tacticalRetreatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 4,
    source: tacticalRetreatSource,
    target: tacticalRetreatSource,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(
      tacticalOption.effects,
      tacticalRetreatContext,
    ),
    [{ selector: "self", count: 4, min: 1, max: 4, source: "Tactical Option" }],
    "Tactical Option selected retreat spec should resolve up to the source Ally's deployed troop count",
  );
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(tacticalOption.effects, {
      ...tacticalRetreatContext,
      selectedTroopCount: 5,
    }),
    [],
    "Tactical Option selected retreat spec should reject more than the source Ally's deployed troop count",
  );
  const tacticalCommanderTarget = { ...p6, deployedTroops: 3 };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(tacticalOption.effects, {
      trigger: "combat-intrigue",
      choiceId: "retreat-troops",
      selectedTroopCount: 3,
      source: p4,
      target: tacticalCommanderTarget,
      state: game,
    }),
    [{ selector: "self", count: 3, min: 1, max: 3, source: "Tactical Option" }],
    "Tactical Option selected retreat spec should resolve up to the Commander target Ally's deployed troop count",
  );
  assert.ok(
    hasCombatEffect(
      questionableMethods,
      (effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Questionable Methods should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    hasCombatEffect(
      questionableMethods,
      (effect) =>
        effect.kind === "lose-influence-for-strength" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.strengthReward === 4 &&
        effect.owner === "combat-recipient" &&
        effect.alternateOwner === "source-commander-personal" &&
        effect.optional === true &&
        effect.source === "Questionable Methods",
    ),
    "Questionable Methods should carry a typed optional Combat Influence-loss strength spec",
  );
  const questionableCombatResolved = effectResolver.resolveGameEffects(
    questionableMethods.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    questionableCombatResolved.swords,
    1,
    "Questionable Methods Combat spec should resolve its base strength",
  );
  const choiceGatedCombatStrength = {
    ...questionableMethods,
    id: "effect-spec-choice-gated-combat-strength-card",
    name: "Effect Spec Choice Gated Combat Strength",
    combatSwords: undefined,
    automatedCombatSwords: undefined,
    effects: [
      {
        trigger: "combat-intrigue",
        choiceId: "add-strength",
        effects: [{ kind: "gain-strength", selector: "self", amount: 2 }],
      },
    ],
  };
  assert.equal(
    state.combatIntrigueStrength(game, p2, choiceGatedCombatStrength),
    undefined,
    "Choice-gated Combat strength should not resolve without its selected choice",
  );
  assert.equal(
    state.combatIntrigueStrength(
      game,
      p2,
      choiceGatedCombatStrength,
      undefined,
      "add-strength",
    ),
    2,
    "Choice-gated Combat strength should resolve when gameplay supplies the selected choice",
  );
  assert.deepEqual(
    effectResolver.resolveCombatInfluenceLossForStrengths(
      questionableMethods.effects,
      {
        trigger: "combat-intrigue",
        source: p4,
        target: p6,
        state: game,
      },
    ),
    [
      {
        selector: "self",
        amount: 1,
        strength: 4,
        owner: "combat-recipient",
        alternateOwner: "source-commander-personal",
        optional: true,
        source: "Questionable Methods",
      },
    ],
    "Questionable Methods Influence-loss spec should resolve with recipient and Commander-personal owner routing",
  );
  assert.ok(
    reachAgreement.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops" &&
            effect.selector === "self" &&
            effect.min === 1 &&
            effect.max === 2 &&
            effect.source === "Reach Agreement",
        ),
    ),
    "Reach Agreement should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    reachAgreement.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.choiceId === "retreat-troops" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "take-contracts" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.sourcePool === "public-offer" &&
            effect.optional !== true &&
            effect.source === "Reach Agreement",
        ),
    ),
    "Reach Agreement should carry a typed Combat contract pending spec",
  );
  const reachAgreementCombatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 2,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(
      reachAgreement.effects,
      reachAgreementCombatContext,
    ),
    [{ selector: "self", count: 2, min: 1, max: 2, source: "Reach Agreement" }],
    "Reach Agreement selected retreat spec should resolve the chosen troop count",
  );
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(reachAgreement.effects, {
      ...reachAgreementCombatContext,
      selectedTroopCount: undefined,
    }),
    [],
    "Reach Agreement selected retreat spec should require a selected troop count",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(
      reachAgreement.effects,
      reachAgreementCombatContext,
    ),
    [
      {
        selector: "self",
        amount: 1,
        sourcePool: "public-offer",
        optional: false,
        source: "Reach Agreement",
      },
    ],
    "Reach Agreement contract spec should resolve through the reusable take-contracts resolver",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(reachAgreement.effects, {
      ...reachAgreementCombatContext,
      choiceId: undefined,
    }),
    [],
    "Reach Agreement contract spec should remain gated by its selected-retreat choice",
  );
  assert.ok(
    springTheTrap.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-spy-posts" && condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recall-spy" &&
            effect.selector === "self" &&
            effect.amount === 2 &&
            effect.strengthReward === 7 &&
            effect.source === "Spring The Trap" &&
            effect.optional !== true,
        ),
    ),
    "Spring The Trap should carry a typed required Combat spy-recall strength spec",
  );
  assert.deepEqual(
    effectResolver.resolveCombatSpyRecallForStrengths(springTheTrap.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: { ...game, spyPosts: { [secrets.id]: p2.id }, sharedSpyPosts: {} },
    }),
    [],
    "Spring The Trap spy-recall spec should not resolve with only one owned spy post",
  );
  const springTheTrapRecallEffects =
    effectResolver.resolveCombatSpyRecallForStrengths(springTheTrap.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: {
        ...game,
        spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
        sharedSpyPosts: {},
      },
    });
  assert.deepEqual(
    springTheTrapRecallEffects,
    [
      {
        selector: "self",
        amount: 2,
        strength: 7,
        optional: false,
        source: "Spring The Trap",
      },
    ],
    "Spring The Trap spy-recall spec should resolve as a required two-spy recall",
  );
  verifyCardEffectSpecDevourInspire({
    cards: { devour, inspireAwe },
    effectResolver,
    game,
    players: { p2, p4, p6 },
  });
}
