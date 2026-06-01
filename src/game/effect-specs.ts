import type {
  CardEffectSpec,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  IconId,
  PlayerSelector,
  ResourceId,
} from "./types";

export function agentPlayEffects(effects: GameEffectSpec[], conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return {
    trigger: "agent-play",
    ...(conditions && conditions.length > 0 ? { conditions } : {}),
    effects,
  };
}

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

export function agentDrawCards(amount: EffectAmountSpec, conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return agentPlayEffects([{ kind: "draw-cards", selector: "self", amount }], conditions);
}

export function agentDrawIntrigues(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "draw-intrigues", selector: "self", amount }], conditions);
}

export function agentGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "gain-resource", selector: "self", resource, amount }], conditions);
}

export function agentRecruitTroops(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "recruit-troops", selector, amount }], conditions);
}

export function agentPlaceSpies(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  options: {
    recallForSupply?: boolean;
    mustPlace?: boolean;
    placementIcon?: IconId;
    allowSharedPost?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "place-spies", selector, amount, ...options }], conditions);
}

export function visitedMakerSpace() {
  return { kind: "visited-maker-space" } as const;
}

export function hasSpyPosts(count: number) {
  return { kind: "has-spy-posts", count } as const;
}

export function hasConflictUnits(count: number) {
  return { kind: "has-conflict-units", count } as const;
}

export function hasInfluence(faction: FactionId, amount: number) {
  return { kind: "has-influence", faction, amount } as const;
}

export function hasCompletedContracts(count: number) {
  return { kind: "has-completed-contracts", count } as const;
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
