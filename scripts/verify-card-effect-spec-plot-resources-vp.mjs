import assert from "node:assert/strict";

export function verifyCardEffectSpecPlotResourcesVp({
  cards,
  deckUtils,
  effectResolver,
  game,
  players,
}) {
  const { marketOpportunity, shaddamsFavor, strategicStockpiling } = cards;
  const { p2, p4, p6 } = players;
  assert.ok(
    marketOpportunity.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spice-to-solari" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 5,
        ),
    ),
    "Market Opportunity should carry a typed spice-to-Solari Plot choice spec",
  );
  assert.ok(
    marketOpportunity.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "solari-to-spice" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 5,
        ),
    ),
    "Market Opportunity should carry a typed Solari-to-spice Plot choice spec",
  );
  const marketNoChoiceResolved = effectResolver.resolveGameEffects(
    marketOpportunity.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    marketNoChoiceResolved.spentResources,
    {},
    "Market Opportunity Plot choice specs should not resolve without a selected choice",
  );
  assert.deepEqual(
    marketNoChoiceResolved.revealGain,
    {},
    "Market Opportunity Plot choice specs should not gain resources without a selected choice",
  );
  const marketSpiceToSolariResolved = effectResolver.resolveGameEffects(
    marketOpportunity.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spice-to-solari",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    marketSpiceToSolariResolved.spentResources.spice,
    2,
    "Market Opportunity spice-to-Solari spec should spend 2 spice",
  );
  assert.equal(
    marketSpiceToSolariResolved.revealGain.solari,
    5,
    "Market Opportunity spice-to-Solari spec should gain 5 Solari",
  );
  assert.equal(
    marketSpiceToSolariResolved.spentResources.solari,
    undefined,
    "Market Opportunity spice-to-Solari spec should not spend Solari",
  );
  const marketSolariToSpiceResolved = effectResolver.resolveGameEffects(
    marketOpportunity.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "solari-to-spice",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    marketSolariToSpiceResolved.spentResources.solari,
    5,
    "Market Opportunity Solari-to-spice spec should spend 5 Solari",
  );
  assert.equal(
    marketSolariToSpiceResolved.revealGain.spice,
    5,
    "Market Opportunity Solari-to-spice spec should gain 5 spice",
  );
  assert.equal(
    marketSolariToSpiceResolved.spentResources.spice,
    undefined,
    "Market Opportunity Solari-to-spice spec should not spend spice",
  );
  const [marketOpportunityClone] = deckUtils.cloneIntrigues([
    marketOpportunity,
  ]);
  assert.notEqual(
    marketOpportunityClone.effects,
    marketOpportunity.effects,
    "Intrigue cloning should deep-clone typed effect arrays",
  );
  assert.notEqual(
    marketOpportunityClone.effects?.[0],
    marketOpportunity.effects?.[0],
    "Intrigue cloning should deep-clone typed effect specs",
  );
  assert.equal(
    marketOpportunityClone.effects?.[0]?.choiceId,
    "spice-to-solari",
    "Intrigue cloning should preserve typed choice ids",
  );
  assert.ok(
    strategicStockpiling.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spice" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Strategic Stockpiling should carry a typed spice-for-VP Plot choice spec",
  );
  assert.ok(
    strategicStockpiling.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "water" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "spacing" &&
            condition.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Strategic Stockpiling should carry a typed Spacing-gated water-for-VP Plot choice spec",
  );
  assert.ok(
    strategicStockpiling.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "both" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "spacing" &&
            condition.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-vp" &&
            effect.selector === "self" &&
            effect.amount === 2,
        ),
    ),
    "Strategic Stockpiling should carry a typed combined Plot choice spec",
  );
  const strategicNoChoiceResolved = effectResolver.resolveGameEffects(
    strategicStockpiling.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    strategicNoChoiceResolved.spentResources,
    {},
    "Strategic Stockpiling Plot choice specs should not resolve without a selected choice",
  );
  assert.equal(
    strategicNoChoiceResolved.vp,
    0,
    "Strategic Stockpiling Plot choice specs should not score VP without a selected choice",
  );
  const strategicSpacingPlayer = {
    ...p2,
    influence: { ...p2.influence, spacing: 3 },
  };
  const strategicSpacingState = {
    players: game.players.map((player) =>
      player.id === p2.id ? strategicSpacingPlayer : player,
    ),
  };
  const strategicSpiceResolved = effectResolver.resolveGameEffects(
    strategicStockpiling.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spice",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    strategicSpiceResolved.spentResources.spice,
    5,
    "Strategic Stockpiling spice choice should spend 5 spice",
  );
  assert.equal(
    strategicSpiceResolved.spentResources.water,
    undefined,
    "Strategic Stockpiling spice choice should not spend water",
  );
  assert.equal(
    strategicSpiceResolved.vp,
    1,
    "Strategic Stockpiling spice choice should gain 1 VP",
  );
  const strategicWaterResolved = effectResolver.resolveGameEffects(
    strategicStockpiling.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "water",
      source: strategicSpacingPlayer,
      state: strategicSpacingState,
    },
  );
  assert.equal(
    strategicWaterResolved.spentResources.water,
    3,
    "Strategic Stockpiling water choice should spend 3 water",
  );
  assert.equal(
    strategicWaterResolved.spentResources.spice,
    undefined,
    "Strategic Stockpiling water choice should not spend spice",
  );
  assert.equal(
    strategicWaterResolved.vp,
    1,
    "Strategic Stockpiling water choice should gain 1 VP",
  );
  const strategicBothResolved = effectResolver.resolveGameEffects(
    strategicStockpiling.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "both",
      source: strategicSpacingPlayer,
      state: strategicSpacingState,
    },
  );
  assert.equal(
    strategicBothResolved.spentResources.spice,
    5,
    "Strategic Stockpiling combined choice should spend 5 spice",
  );
  assert.equal(
    strategicBothResolved.spentResources.water,
    3,
    "Strategic Stockpiling combined choice should spend 3 water",
  );
  assert.equal(
    strategicBothResolved.vp,
    2,
    "Strategic Stockpiling combined choice should gain 2 VP",
  );
  const strategicWaterWithoutInfluenceResolved =
    effectResolver.resolveGameEffects(strategicStockpiling.effects, {
      trigger: "plot-intrigue",
      choiceId: "water",
      source: p2,
      state: game,
    });
  assert.deepEqual(
    strategicWaterWithoutInfluenceResolved.spentResources,
    {},
    "Strategic Stockpiling water choice should not resolve below 3 Spacing Guild Influence",
  );
  assert.equal(
    strategicWaterWithoutInfluenceResolved.vp,
    0,
    "Strategic Stockpiling water choice should not score below 3 Spacing Guild Influence",
  );
  assert.ok(
    shaddamsFavor.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Shaddam's Favor should carry a typed Plot self troop recruit spec for Allies",
  );
  assert.ok(
    shaddamsFavor.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 1,
        ),
    ),
    "Shaddam's Favor should carry a typed Plot activated-Ally troop recruit spec for Commanders",
  );
  assert.ok(
    shaddamsFavor.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "emperor" &&
            condition.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 3,
        ),
    ),
    "Shaddam's Favor should carry a typed Emperor-icon-gated Plot Solari gain spec",
  );
  const shaddamsFavorAllyResolved = effectResolver.resolveGameEffects(
    shaddamsFavor.effects,
    {
      trigger: "plot-intrigue",
      source: {
        ...p2,
        influence: { ...p2.influence, greatHouses: 3, emperor: 0 },
      },
      state: {
        players: game.players.map((player) =>
          player.id === p2.id
            ? {
                ...player,
                influence: { ...player.influence, greatHouses: 3, emperor: 0 },
              }
            : player,
        ),
      },
    },
  );
  assert.equal(
    shaddamsFavorAllyResolved.recruitedTroops,
    1,
    "Shaddam's Favor Plot spec should recruit for Ally actors",
  );
  assert.equal(
    shaddamsFavorAllyResolved.revealGain.solari,
    3,
    "Shaddam's Favor Plot spec should pay Solari with 3 Great Houses Influence",
  );
  const shaddamsFavorCommanderResolved = effectResolver.resolveGameEffects(
    shaddamsFavor.effects,
    {
      trigger: "plot-intrigue",
      source: {
        ...p4,
        influence: { ...p4.influence, emperor: 3, greatHouses: 0 },
      },
      target: p6,
      state: {
        players: game.players.map((player) =>
          player.id === p4.id
            ? {
                ...player,
                influence: { ...player.influence, emperor: 3, greatHouses: 0 },
              }
            : player,
        ),
      },
    },
  );
  assert.equal(
    shaddamsFavorCommanderResolved.activatedAlly.recruitedTroops,
    1,
    "Shaddam's Favor Plot spec should route Commander troop recruitment to the activated Ally",
  );
  assert.equal(
    shaddamsFavorCommanderResolved.revealGain.solari,
    3,
    "Shaddam's Favor Plot spec should count Shaddam personal Emperor Influence for Solari",
  );
}
