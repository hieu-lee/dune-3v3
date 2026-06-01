import type { CardEffectSpec, EffectAmountSpec, GameEffectConditionSpec, GameEffectSpec, ResourceId } from "./types";

export function revealEffects(effects: GameEffectSpec[], conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return {
    trigger: "reveal",
    ...(conditions && conditions.length > 0 ? { conditions } : {}),
    effects,
  };
}

export function revealGainResource(
  resource: ResourceId,
  amount: number,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([{ kind: "gain-resource", selector: "self", resource, amount }], conditions);
}

export function revealGainPersuasion(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([{ kind: "gain-persuasion", selector: "self", amount }], conditions);
}

export function revealGainStrength(amount: EffectAmountSpec, conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return revealEffects([{ kind: "gain-strength", selector: "self", amount }], conditions);
}

export function visitedMakerSpace() {
  return { kind: "visited-maker-space" } as const;
}

export function hasSpyPosts(count: number) {
  return { kind: "has-spy-posts", count } as const;
}

export function cloneCardEffects(effects: CardEffectSpec[] | undefined): CardEffectSpec[] | undefined {
  return effects?.map((spec) => ({
    ...spec,
    conditions: spec.conditions?.map((condition) => ({ ...condition })),
    effects: spec.effects.map((effect) => ({
      ...effect,
      amount: typeof effect.amount === "number" ? effect.amount : { ...effect.amount },
    })),
  }));
}
