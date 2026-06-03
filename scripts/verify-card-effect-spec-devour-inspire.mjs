import assert from "node:assert/strict";

export function verifyCardEffectSpecDevourInspire({
  cards,
  effectResolver,
  game,
  players,
}) {
  const { devour, inspireAwe } = cards;
  const { p2, p4, p6 } = players;
  assert.ok(
    devour.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-combat-recipient",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-strength" &&
            effect.selector === "self" &&
            effect.amount === 2,
        ),
    ),
    "Devour should carry a typed Combat recipient-gated base strength spec",
  );
  assert.ok(
    devour.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-combat-recipient-sandworms" &&
            condition.count === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-strength" &&
            effect.selector === "self" &&
            effect.amount === 2,
        ),
    ),
    "Devour should carry a typed Combat recipient sandworm strength bonus spec",
  );
  assert.ok(
    devour.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-combat-recipient-sandworms" &&
            condition.count === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.selector === "self" &&
            effect.optional === true,
        ),
    ),
    "Devour should carry a typed Combat recipient sandworm trash-card spec",
  );
  const devourAllyNoWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, deployedSandworms: 0 },
    state: game,
  });
  assert.equal(
    devourAllyNoWorm.swords,
    2,
    "Devour should resolve two strength for an Ally without sandworms",
  );
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(devour.effects, {
      trigger: "combat-intrigue",
      source: { ...p2, deployedSandworms: 0 },
      state: game,
    }),
    [],
    "Devour trash-card spec should not resolve for an Ally without sandworms",
  );
  const devourAllyWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, deployedSandworms: 1 },
    state: game,
  });
  assert.equal(
    devourAllyWorm.swords,
    4,
    "Devour should resolve four strength for an Ally with a sandworm",
  );
  const devourTrashEffects = effectResolver.resolveTrashCardEffects(
    devour.effects,
    {
      trigger: "combat-intrigue",
      source: { ...p2, deployedSandworms: 1 },
      state: game,
    },
  );
  assert.equal(
    devourTrashEffects.length,
    1,
    "Devour should resolve one Combat trash-card effect with a sandworm",
  );
  assert.equal(
    devourTrashEffects[0]?.selector,
    "self",
    "Devour trash-card effect should target self in the card spec",
  );
  assert.equal(
    devourTrashEffects[0]?.optional,
    true,
    "Devour trash-card effect should be optional",
  );
  const devourCommanderNoTarget = effectResolver.resolveGameEffects(
    devour.effects,
    {
      trigger: "combat-intrigue",
      source: p4,
      state: game,
    },
  );
  assert.equal(
    devourCommanderNoTarget.swords,
    0,
    "Commander Devour should not resolve strength without a target",
  );
  const devourCommanderTargetNoWorm = effectResolver.resolveGameEffects(
    devour.effects,
    {
      trigger: "combat-intrigue",
      source: p4,
      target: { ...p6, deployedSandworms: 0 },
      state: game,
    },
  );
  assert.equal(
    devourCommanderTargetNoWorm.swords,
    2,
    "Commander Devour should resolve two strength against a no-worm target Ally",
  );
  const devourCommanderTargetWorm = effectResolver.resolveGameEffects(
    devour.effects,
    {
      trigger: "combat-intrigue",
      source: p4,
      target: { ...p6, deployedSandworms: 1 },
      state: game,
    },
  );
  assert.equal(
    devourCommanderTargetWorm.swords,
    4,
    "Commander Devour should resolve four strength against a target Ally with a sandworm",
  );
  assert.ok(
    inspireAwe.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "to-discard" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "acquire-card" &&
            effect.selector === "self" &&
            effect.maxCost === 3 &&
            effect.destination === "discard" &&
            effect.source === "Inspire Awe",
        ),
    ),
    "Inspire Awe should carry a typed Plot acquire-card-to-discard spec",
  );
  assert.ok(
    inspireAwe.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "to-hand" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "acquire-card" &&
            effect.selector === "self" &&
            effect.maxCost === 3 &&
            effect.destination === "hand" &&
            effect.source === "Inspire Awe",
        ),
    ),
    "Inspire Awe should carry a typed Plot acquire-card-to-hand spec",
  );
  assert.deepEqual(
    effectResolver.resolveAcquireCards(inspireAwe.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Inspire Awe should not resolve a Plot acquire-card effect without a selected choice",
  );
  const inspireAweDiscardEffects = effectResolver.resolveAcquireCards(
    inspireAwe.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "to-discard",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    inspireAweDiscardEffects.length,
    1,
    "Inspire Awe discard choice should resolve one acquire-card effect",
  );
  assert.equal(
    inspireAweDiscardEffects[0]?.selector,
    "self",
    "Inspire Awe discard acquisition should target self",
  );
  assert.equal(
    inspireAweDiscardEffects[0]?.maxCost,
    3,
    "Inspire Awe discard acquisition should cap card cost at 3",
  );
  assert.equal(
    inspireAweDiscardEffects[0]?.destination,
    "discard",
    "Inspire Awe discard choice should acquire to discard",
  );
  assert.equal(
    inspireAweDiscardEffects[0]?.optional,
    false,
    "Inspire Awe acquisition should be mandatory when available",
  );
  assert.equal(
    inspireAweDiscardEffects[0]?.source,
    "Inspire Awe",
    "Inspire Awe acquire-card effect should preserve its source",
  );
  const inspireAweHandEffects = effectResolver.resolveAcquireCards(
    inspireAwe.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "to-hand",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    inspireAweHandEffects.length,
    1,
    "Inspire Awe hand choice should resolve one acquire-card effect",
  );
  assert.equal(
    inspireAweHandEffects[0]?.selector,
    "self",
    "Inspire Awe hand acquisition should target self",
  );
  assert.equal(
    inspireAweHandEffects[0]?.maxCost,
    3,
    "Inspire Awe hand acquisition should cap card cost at 3",
  );
  assert.equal(
    inspireAweHandEffects[0]?.destination,
    "hand",
    "Inspire Awe hand choice should acquire to hand",
  );
  assert.equal(
    inspireAweHandEffects[0]?.optional,
    false,
    "Inspire Awe hand acquisition should be mandatory when available",
  );
  assert.equal(
    inspireAweHandEffects[0]?.source,
    "Inspire Awe",
    "Inspire Awe hand acquire-card effect should preserve its source",
  );
}
