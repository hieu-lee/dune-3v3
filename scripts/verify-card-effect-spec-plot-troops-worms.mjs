import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecPlotTroopsWorms({
  cards,
  effectResolver,
  game,
  players,
  state,
  withActivePlayer,
}) {
  const {
    callToArms,
    convincingArgument,
    departForArrakis,
    detonation,
    unexpectedAllies,
  } = cards;
  const { p1, p2, p4, p6 } = players;
  assert.ok(
    callToArms.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "activate-acquire-recruit-bonus" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Call to Arms should carry a typed Plot acquire-recruit bonus activation spec",
  );
  const callToArmsPlotResolved = effectResolver.resolveGameEffects(
    callToArms.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    callToArmsPlotResolved.acquireRecruitBonus,
    1,
    "Call to Arms Plot spec should resolve one acquisition recruit bonus",
  );
  assert.equal(
    callToArmsPlotResolved.recruitedTroops,
    0,
    "Call to Arms Plot spec should not recruit immediately",
  );
  const callToArmsNoSupplyAcquireCard = {
    ...convincingArgument,
    id: "call-to-arms-no-supply-acquire-card",
    name: "Call to Arms No Supply Acquire",
    cost: 0,
    effects: undefined,
  };
  const callToArmsNoSupplyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      callToArmsActive: true,
      deployedTroops: 0,
      garrison: 12,
      jessicaMemories: 0,
      persuasion: 0,
      revealed: true,
    })),
    imperiumRow: [callToArmsNoSupplyAcquireCard],
    marketDeck: [],
  };
  const callToArmsNoSupplyAcquired = state.acquireMarketCard(
    callToArmsNoSupplyFixture,
    p2.id,
    callToArmsNoSupplyAcquireCard.id,
  );
  assert.equal(
    playerById(callToArmsNoSupplyAcquired, p2.id).garrison,
    12,
    "Call to Arms should not recruit beyond the acquisition recruit owner's troop supply",
  );
  assert.equal(
    callToArmsNoSupplyAcquired.log[0]?.includes("recruits 1 troop"),
    false,
    "Call to Arms should not log an unplaced acquisition recruit bonus",
  );
  assert.ok(
    detonation.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "shield-wall" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "remove-shield-wall" &&
            effect.selector === "self" &&
            effect.source === "Detonation",
        ),
    ),
    "Detonation should carry a typed Shield Wall removal branch spec",
  );
  assert.ok(
    detonation.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "deploy" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "deploy-troops" &&
            effect.selector === "self" &&
            effect.max === 4 &&
            effect.source === "Detonation",
        ),
    ),
    "Detonation should carry a typed Ally troop deployment branch spec",
  );
  assert.ok(
    detonation.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "deploy" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "deploy-troops" &&
            effect.selector === "activated-ally" &&
            effect.max === 4 &&
            effect.source === "Detonation",
        ),
    ),
    "Detonation should carry a typed Commander activated-Ally troop deployment branch spec",
  );
  assert.equal(
    effectResolver.resolveGameEffects(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "shield-wall",
      source: p2,
      state: game,
    }).removeShieldWall,
    true,
    "Detonation Shield Wall branch should resolve through generic Plot effects",
  );
  assert.equal(
    effectResolver.resolveGameEffects(detonation.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }).removeShieldWall,
    false,
    "Detonation Shield Wall branch should remain choice-gated",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p2,
      state: game,
    }),
    [{ selector: "self", max: 4, source: "Detonation" }],
    "Detonation Ally deploy branch should resolve a self troop deployment effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p4,
      target: p6,
      state: game,
    }),
    [{ selector: "activated-ally", max: 4, source: "Detonation" }],
    "Detonation Commander deploy branch should resolve an activated-Ally troop deployment effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p4,
      state: game,
    }),
    [],
    "Detonation Commander deploy branch should require an activated Ally target",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Detonation deploy branch should remain choice-gated",
  );
  assert.ok(
    !unexpectedAllies.effects?.some((spec) => spec.trigger === "plot-intrigue" && spec.choiceId === "summon"),
    "Unexpected Allies should not expose a summon-only branch",
  );
  assert.ok(
    unexpectedAllies.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "remove-shield-wall" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "summon-sandworms" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Unexpected Allies",
        ),
    ),
    "Unexpected Allies should carry a typed Ally sandworm summon spec on its combined branch",
  );
  assert.ok(
    unexpectedAllies.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "remove-shield-wall" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "summon-sandworms" &&
            effect.selector === "activated-ally" &&
            effect.amount === 1 &&
            effect.source === "Unexpected Allies",
        ),
    ),
    "Unexpected Allies should carry a typed Commander activated-Ally sandworm summon spec on its combined branch",
  );
  assert.ok(
    unexpectedAllies.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "remove-shield-wall" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.amount === 2,
        ),
    ) &&
      unexpectedAllies.effects?.some(
        (spec) =>
          spec.trigger === "plot-intrigue" &&
          spec.choiceId === "remove-shield-wall" &&
          spec.effects.some(
            (effect) =>
              effect.kind === "remove-shield-wall" &&
              effect.selector === "self" &&
              effect.source === "Unexpected Allies",
          ),
      ),
    "Unexpected Allies should carry a typed combined remove-Shield-Wall branch with water spend",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }).spentResources,
    {},
    "Unexpected Allies obsolete summon branch should not resolve a water cost",
  );
  assert.equal(
    effectResolver.resolveGameEffects(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }).removeShieldWall,
    false,
    "Unexpected Allies obsolete summon branch should not remove the Shield Wall",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }),
    [],
    "Unexpected Allies obsolete summon branch should not resolve a sandworm summon effect",
  );
  const unexpectedAlliesWallResolved = effectResolver.resolveGameEffects(
    unexpectedAllies.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p4,
      target: p6,
      state: game,
    },
  );
  assert.deepEqual(
    unexpectedAlliesWallResolved.spentResources,
    { water: 2 },
    "Unexpected Allies remove-wall branch should resolve the typed water cost",
  );
  assert.equal(
    unexpectedAlliesWallResolved.removeShieldWall,
    true,
    "Unexpected Allies remove-wall branch should resolve typed Shield Wall removal",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, source: "Unexpected Allies" }],
    "Unexpected Allies Ally combined branch should resolve a self sandworm summon effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p4,
      target: p6,
      state: game,
    }),
    [{ selector: "activated-ally", amount: 1, source: "Unexpected Allies" }],
    "Unexpected Allies Commander remove-wall branch should resolve an activated-Ally sandworm summon effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p4,
      state: game,
    }),
    [],
    "Unexpected Allies Commander sandworm summon should require an activated Ally target",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Unexpected Allies combined branch should remain choice-gated",
  );
  assert.ok(
    departForArrakis.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "draw" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "fremen" &&
            condition.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Depart For Arrakis should carry a typed Fremen-gated draw choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spend-spice" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ),
    "Depart For Arrakis should carry a typed spice spend choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spend-spice" &&
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
    "Depart For Arrakis should carry a typed Ally troop recruit choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spend-spice" &&
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
    "Depart For Arrakis should carry a typed Commander activated-Ally troop recruit choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "spend-spice" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "fremen" &&
            condition.amount === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Depart For Arrakis should carry a typed conditional draw on the spice choice",
  );
  const departNoChoiceResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    departNoChoiceResolved.spentResources,
    {},
    "Depart For Arrakis Plot choice specs should not resolve without a selected choice",
  );
  assert.equal(
    departNoChoiceResolved.cardsToDraw,
    0,
    "Depart For Arrakis should not draw without a selected choice",
  );
  assert.equal(
    departNoChoiceResolved.recruitedTroops,
    0,
    "Depart For Arrakis should not recruit without a selected choice",
  );
  const departFringePlayer = {
    ...p2,
    influence: { ...p2.influence, fringeWorlds: 3 },
  };
  const departFringeState = {
    players: game.players.map((player) =>
      player.id === p2.id ? departFringePlayer : player,
    ),
  };
  const departDrawResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: departFringePlayer,
      state: departFringeState,
    },
  );
  assert.equal(
    departDrawResolved.cardsToDraw,
    1,
    "Depart For Arrakis draw choice should draw with 3 Fringe Worlds Influence",
  );
  assert.deepEqual(
    departDrawResolved.spentResources,
    {},
    "Depart For Arrakis draw choice should not spend spice",
  );
  assert.equal(
    departDrawResolved.recruitedTroops,
    0,
    "Depart For Arrakis draw choice should not recruit troops",
  );
  const departDrawBlockedResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    departDrawBlockedResolved.cardsToDraw,
    0,
    "Depart For Arrakis draw choice should require Fremen/Fringe Influence",
  );
  const departSpiceOnlyResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spend-spice",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    departSpiceOnlyResolved.spentResources.spice,
    2,
    "Depart For Arrakis spice choice should spend 2 spice",
  );
  assert.equal(
    departSpiceOnlyResolved.recruitedTroops,
    3,
    "Depart For Arrakis spice choice should recruit 3 troops for Allies",
  );
  assert.equal(
    departSpiceOnlyResolved.cardsToDraw,
    0,
    "Depart For Arrakis spice choice should skip draw below the Fremen/Fringe threshold",
  );
  const departSpiceDrawResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spend-spice",
      source: departFringePlayer,
      state: departFringeState,
    },
  );
  assert.equal(
    departSpiceDrawResolved.spentResources.spice,
    2,
    "Depart For Arrakis spice-plus-draw choice should spend 2 spice",
  );
  assert.equal(
    departSpiceDrawResolved.recruitedTroops,
    3,
    "Depart For Arrakis spice-plus-draw choice should recruit 3 troops",
  );
  assert.equal(
    departSpiceDrawResolved.cardsToDraw,
    1,
    "Depart For Arrakis spice choice should draw when the threshold is met",
  );
  const departCommanderAlly = {
    ...p6,
    influence: { ...p6.influence, fringeWorlds: 3 },
  };
  const departCommanderState = {
    players: game.players.map((player) =>
      player.id === p6.id ? departCommanderAlly : player,
    ),
  };
  const departCommanderResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spend-spice",
      source: p4,
      target: departCommanderAlly,
      state: departCommanderState,
    },
  );
  assert.equal(
    departCommanderResolved.spentResources.spice,
    2,
    "Commander Depart For Arrakis should spend Commander spice",
  );
  assert.equal(
    departCommanderResolved.recruitedTroops,
    0,
    "Commander Depart For Arrakis should not recruit for the Commander",
  );
  assert.equal(
    departCommanderResolved.activatedAlly.recruitedTroops,
    3,
    "Commander Depart For Arrakis should route troop recruitment to the activated Ally",
  );
  assert.equal(
    departCommanderResolved.cardsToDraw,
    1,
    "Commander Depart For Arrakis should use same-team Ally Fringe Worlds Influence for the draw threshold",
  );
  const departMuadDibPlayer = {
    ...p1,
    influence: { ...p1.influence, fremen: 3 },
  };
  const departMuadDibResolved = effectResolver.resolveGameEffects(
    departForArrakis.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: departMuadDibPlayer,
      state: {
        players: game.players.map((player) =>
          player.id === p1.id ? departMuadDibPlayer : player,
        ),
      },
    },
  );
  assert.equal(
    departMuadDibResolved.cardsToDraw,
    1,
    "Muad'Dib Depart For Arrakis should use personal Fremen Influence for the draw threshold",
  );
}
