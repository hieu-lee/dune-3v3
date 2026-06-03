import assert from "node:assert/strict";

export function verifyCardEffectSpecPlotInfluenceChoices({
  cards,
  effectResolver,
  game,
  players,
}) {
  const { changeAllegiances, opportunism } = cards;
  const { p1, p2, p4, p5, p6 } = players;
  const opportunismFactions = [
    "emperor",
    "spacing",
    "bene",
    "fremen",
    "greatHouses",
    "fringeWorlds",
  ];
  const opportunismChoiceIds = opportunismFactions.flatMap(
    (first, firstIndex) =>
      opportunismFactions
        .slice(firstIndex)
        .map((second) => `${first}+${second}`),
  );
  assert.deepEqual(
    opportunism.effects
      ?.filter((spec) => spec.trigger === "plot-intrigue")
      .map((spec) => spec.choiceId)
      .sort(),
    opportunismChoiceIds.sort(),
    "Opportunism should carry typed Plot choice specs for every payable influence-loss pair shape",
  );
  assert.ok(
    opportunism.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spacing+bene" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "spacing" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Opportunism should carry a typed mixed Influence-loss Solari-for-VP Plot choice spec",
  );
  assert.ok(
    opportunism.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "bene+bene" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Opportunism should carry a typed same-Faction Influence-loss Plot choice spec",
  );
  const opportunismNoChoiceResolved = effectResolver.resolveGameEffects(
    opportunism.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    opportunismNoChoiceResolved.spentResources,
    {},
    "Opportunism Plot choice specs should not spend Solari without a selected choice",
  );
  assert.deepEqual(
    opportunismNoChoiceResolved.influenceLosses,
    {},
    "Opportunism Plot choice specs should not lose Influence without a selected choice",
  );
  assert.equal(
    opportunismNoChoiceResolved.vp,
    0,
    "Opportunism Plot choice specs should not score VP without a selected choice",
  );
  const opportunismSpacingBeneResolved = effectResolver.resolveGameEffects(
    opportunism.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spacing+bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    opportunismSpacingBeneResolved.spentResources.solari,
    2,
    "Opportunism mixed choice should spend 2 Solari",
  );
  assert.equal(
    opportunismSpacingBeneResolved.influenceLosses.spacing,
    1,
    "Opportunism mixed choice should lose 1 Spacing Guild Influence",
  );
  assert.equal(
    opportunismSpacingBeneResolved.influenceLosses.bene,
    1,
    "Opportunism mixed choice should lose 1 Bene Gesserit Influence",
  );
  assert.equal(
    opportunismSpacingBeneResolved.vp,
    1,
    "Opportunism mixed choice should gain 1 VP",
  );
  const opportunismBeneBeneResolved = effectResolver.resolveGameEffects(
    opportunism.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "bene+bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    opportunismBeneBeneResolved.spentResources.solari,
    2,
    "Opportunism same-Faction choice should spend 2 Solari",
  );
  assert.equal(
    opportunismBeneBeneResolved.influenceLosses.bene,
    2,
    "Opportunism same-Faction choice should aggregate two Influence losses",
  );
  assert.equal(
    opportunismBeneBeneResolved.vp,
    1,
    "Opportunism same-Faction choice should gain 1 VP",
  );
  const changeAllegiancesPlotSpecs =
    changeAllegiances.effects?.filter(
      (spec) => spec.trigger === "plot-intrigue",
    ) ?? [];
  assert.equal(
    changeAllegiancesPlotSpecs.length,
    394,
    "Change Allegiances should carry typed Plot choice specs for Ally, Shaddam, and Muad'Dib influence options",
  );
  assert.ok(
    changeAllegiances.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "shift:greatHouses->bene" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ),
    ),
    "Change Allegiances should carry a typed Ally Influence shift spec",
  );
  assert.ok(
    changeAllegiances.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spend:spacing" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "spacing" &&
            effect.amount === 1,
        ),
    ),
    "Change Allegiances should carry a typed Ally spice-for-Influence spec",
  );
  assert.ok(
    changeAllegiances.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "both:greatHouses->bene+spend:spacing" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "spacing" &&
            effect.amount === 1,
        ),
    ),
    "Change Allegiances should carry a typed Ally both-rows spec",
  );
  assert.ok(
    changeAllegiances.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "shift:bene->emperor" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "emperor" &&
            effect.amount === 1,
        ),
    ),
    "Change Allegiances should carry a typed Shaddam routed-loss personal-gain shift spec",
  );
  assert.ok(
    changeAllegiances.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "both:fremen->fringeWorlds+spend:fremen" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "fringeWorlds" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ),
    ),
    "Change Allegiances should carry a typed Muad'Dib personal and routed both-rows spec",
  );
  const changeAllegiancesNoChoiceResolved = effectResolver.resolveGameEffects(
    changeAllegiances.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.spentResources,
    {},
    "Change Allegiances Plot choice specs should not spend spice without a selected choice",
  );
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.influenceLosses,
    {},
    "Change Allegiances Plot choice specs should not lose Influence without a selected choice",
  );
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.influenceGains,
    {},
    "Change Allegiances Plot choice specs should not gain Influence without a selected choice",
  );
  const changeAllegiancesAllyShiftResolved = effectResolver.resolveGameEffects(
    changeAllegiances.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "shift:greatHouses->bene",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    changeAllegiancesAllyShiftResolved.influenceAdjustments,
    [
      { selector: "self", faction: "greatHouses", amount: -1 },
      { selector: "self", faction: "bene", amount: 1 },
    ],
    "Ally Change Allegiances shift should resolve ordered self Influence adjustments",
  );
  assert.equal(
    changeAllegiancesAllyShiftResolved.influenceLosses.greatHouses,
    1,
    "Ally Change Allegiances shift should record the selected Influence loss",
  );
  assert.equal(
    changeAllegiancesAllyShiftResolved.influenceGains.bene,
    1,
    "Ally Change Allegiances shift should record the selected Influence gain",
  );
  const changeAllegiancesAllyBothResolved = effectResolver.resolveGameEffects(
    changeAllegiances.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "both:greatHouses->bene+spend:spacing",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    changeAllegiancesAllyBothResolved.spentResources.spice,
    3,
    "Change Allegiances both rows should spend 3 spice",
  );
  assert.deepEqual(
    changeAllegiancesAllyBothResolved.influenceAdjustments,
    [
      { selector: "self", faction: "greatHouses", amount: -1 },
      { selector: "self", faction: "bene", amount: 1 },
      { selector: "self", faction: "spacing", amount: 1 },
    ],
    "Ally Change Allegiances both rows should resolve loss before both gains",
  );
  const changeAllegiancesShaddamShiftResolved =
    effectResolver.resolveGameEffects(changeAllegiances.effects, {
      trigger: "plot-intrigue",
      choiceId: "shift:bene->emperor",
      source: p4,
      target: p6,
      state: game,
    });
  assert.deepEqual(
    changeAllegiancesShaddamShiftResolved.influenceAdjustments,
    [
      { selector: "activated-ally", faction: "bene", amount: -1 },
      { selector: "self", faction: "emperor", amount: 1 },
    ],
    "Shaddam Change Allegiances should route main-board losses to the activated Ally and personal gains to self",
  );
  assert.equal(
    changeAllegiancesShaddamShiftResolved.influenceGains.emperor,
    1,
    "Shaddam Change Allegiances should record personal Emperor Influence gains",
  );
  const changeAllegiancesShaddamRoutedSpendResolved =
    effectResolver.resolveGameEffects(changeAllegiances.effects, {
      trigger: "plot-intrigue",
      choiceId: "spend:greatHouses",
      source: p4,
      target: p6,
      state: game,
    });
  assert.equal(
    changeAllegiancesShaddamRoutedSpendResolved.spentResources.spice,
    3,
    "Shaddam Change Allegiances routed spend should spend Commander spice",
  );
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendResolved.influenceGains,
    {},
    "Shaddam Change Allegiances routed spend should not put game-board Influence on the Commander",
  );
  assert.equal(
    changeAllegiancesShaddamRoutedSpendResolved.activatedAlly.influenceGains
      .greatHouses,
    1,
    "Shaddam Change Allegiances routed spend should put game-board Influence on the activated Ally",
  );
  const changeAllegiancesShaddamRoutedSpendNoTarget =
    effectResolver.resolveGameEffects(changeAllegiances.effects, {
      trigger: "plot-intrigue",
      choiceId: "spend:greatHouses",
      source: p4,
      state: game,
    });
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendNoTarget.spentResources,
    {},
    "Commander Change Allegiances routed specs should not resolve without an activated Ally target",
  );
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendNoTarget.activatedAlly.influenceGains,
    {},
    "Commander Change Allegiances routed specs should not gain activated Ally Influence without a target",
  );
  const changeAllegiancesShaddamPersonalSpendResolved =
    effectResolver.resolveGameEffects(changeAllegiances.effects, {
      trigger: "plot-intrigue",
      choiceId: "spend:emperor",
      source: p4,
      state: game,
    });
  assert.equal(
    changeAllegiancesShaddamPersonalSpendResolved.influenceGains.emperor,
    1,
    "Shaddam Change Allegiances personal Emperor spend should resolve without an activated Ally target",
  );
  const changeAllegiancesMuadDibBothResolved =
    effectResolver.resolveGameEffects(changeAllegiances.effects, {
      trigger: "plot-intrigue",
      choiceId: "both:fremen->fringeWorlds+spend:fremen",
      source: p1,
      target: p5,
      state: game,
    });
  assert.equal(
    changeAllegiancesMuadDibBothResolved.spentResources.spice,
    3,
    "Muad'Dib Change Allegiances both rows should spend Commander spice",
  );
  assert.deepEqual(
    changeAllegiancesMuadDibBothResolved.influenceAdjustments,
    [
      { selector: "self", faction: "fremen", amount: -1 },
      { selector: "activated-ally", faction: "fringeWorlds", amount: 1 },
      { selector: "self", faction: "fremen", amount: 1 },
    ],
    "Muad'Dib Change Allegiances should keep personal Fremen adjustments on self and route main-board gains",
  );
}
