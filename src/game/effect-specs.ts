import type {
  CardEffectSpec,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  IconId,
  PlayerSelector,
  ResourceId,
  Role,
  TeamId,
  TrashCardZone,
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

export function revealRetreatTroopsForStrength(
  troops: EffectAmountSpec,
  strength: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "retreat-troops-for-strength",
      selector: "self",
      amount: troops,
      strength,
      optional: true,
    },
  ], conditions);
}

export function revealTrashCardForStrength(
  strength: EffectAmountSpec,
  options: {
    zones?: TrashCardZone[];
    excludeSource?: boolean;
    requiredTrait?: string;
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "trash-card",
      selector: "self",
      strengthReward: strength,
      optional: true,
      ...options,
    },
  ], conditions);
}

export function revealLoseInfluenceForIntrigues(
  amount: EffectAmountSpec,
  options: {
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "lose-influence-for-intrigues",
      selector: "self",
      amount,
      optional: true,
      ...options,
    },
  ], conditions);
}

export function agentDiscardCardForInfluenceAndDraw(
  drawCards: EffectAmountSpec,
  influenceAmount: EffectAmountSpec,
  options: {
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards,
      influenceAmount,
      optional: true,
      ...options,
    },
  ], conditions);
}

export function agentBlockConflictDeployment(
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "block-conflict-deployment", selector: "self", ...options }], conditions);
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

export function hasCardTraitInPlay(trait: string, count = 1) {
  return { kind: "has-card-trait-in-play", trait, count } as const;
}

export function hasTeam(team: TeamId) {
  return { kind: "has-team", team } as const;
}

export function hasRole(role: Role) {
  return { kind: "has-role", role } as const;
}

export function cloneCardEffects(effects: CardEffectSpec[] | undefined): CardEffectSpec[] | undefined {
  return effects?.map((spec) => ({
    ...spec,
    conditions: spec.conditions?.map((condition) => ({ ...condition })),
    effects: spec.effects.map((effect) => ({
      ...effect,
      ...("amount" in effect ? { amount: cloneAmount(effect.amount) } : {}),
      ...("strength" in effect
        ? { strength: cloneAmount(effect.strength) }
        : {}),
      ...("strengthReward" in effect && effect.strengthReward !== undefined
        ? { strengthReward: cloneAmount(effect.strengthReward) }
        : {}),
      ...("spiceRewardCostThreshold" in effect && effect.spiceRewardCostThreshold !== undefined
        ? { spiceRewardCostThreshold: cloneAmount(effect.spiceRewardCostThreshold) }
        : {}),
      ...("spiceReward" in effect && effect.spiceReward !== undefined
        ? { spiceReward: cloneAmount(effect.spiceReward) }
        : {}),
      ...("drawCards" in effect
        ? { drawCards: cloneAmount(effect.drawCards) }
        : {}),
      ...("influenceAmount" in effect
        ? { influenceAmount: cloneAmount(effect.influenceAmount) }
        : {}),
    })),
  }));
}

function cloneAmount(amount: EffectAmountSpec): EffectAmountSpec {
  return typeof amount === "number" ? amount : { ...amount };
}
