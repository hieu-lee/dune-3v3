import type {
  CardEffectSpec,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  PlayerSelector,
  ResourceId,
  Role,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamId,
  TradeEffectPartner,
  TradeGoodId,
  TroopEffectDestination,
  TroopEffectRecipient,
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

export function revealPayResourceForStrength(
  resource: ResourceId,
  cost: EffectAmountSpec,
  strength: EffectAmountSpec,
  options: {
    optional?: true;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "pay-resource-for-strength",
      selector: "self",
      resource,
      cost,
      strength,
      optional: true,
      ...options,
    },
  ], conditions);
}

export function revealPayResourceForTroops(
  resource: ResourceId,
  cost: EffectAmountSpec,
  troops: EffectAmountSpec,
  options: {
    recipient?: TroopEffectRecipient;
    destination?: TroopEffectDestination;
    optional?: true;
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "pay-resource-for-troops",
      selector: "self",
      resource,
      cost,
      troops,
      recipient: options.recipient ?? "same-team-allies",
      destination: options.destination ?? "garrison",
      optional: true,
      ...(options.trashSource ? { trashSource: true } : {}),
      ...(options.source ? { source: options.source } : {}),
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

export function agentPayResourceForInfluence(
  resource: ResourceId,
  cost: EffectAmountSpec,
  faction: InfluenceEffectFaction,
  amount: EffectAmountSpec,
  options: {
    recipient?: InfluenceEffectRecipient;
    optional?: true;
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pay-resource-for-influence",
      selector: "self",
      resource,
      cost,
      faction,
      amount,
      recipient: options.recipient ?? "board-effect-recipient",
      optional: true,
      ...(options.trashSource ? { trashSource: true } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function agentPayResourceForSandworms(
  resource: ResourceId,
  cost: EffectAmountSpec,
  sandworms: EffectAmountSpec,
  options: {
    recipient?: SandwormEffectRecipient;
    destination?: SandwormEffectDestination;
    optional?: true;
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource,
      cost,
      sandworms,
      recipient: options.recipient ?? "activated-ally",
      destination: options.destination ?? "conflict",
      optional: true,
      ...(options.trashSource ? { trashSource: true } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function agentPayResourceForContracts(
  resource: ResourceId,
  cost: EffectAmountSpec,
  contractCount: EffectAmountSpec,
  options: {
    recipient?: ContractEffectRecipient;
    sourcePool?: ContractEffectSourcePool;
    optional?: true;
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pay-resource-for-contracts",
      selector: "self",
      resource,
      cost,
      contractCount,
      recipient: options.recipient ?? "same-team-allies",
      sourcePool: options.sourcePool ?? "public-offer",
      optional: true,
      ...(options.trashSource ? { trashSource: true } : {}),
      ...(options.source ? { source: options.source } : {}),
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

export function agentCommanderResourceSplit(
  splitOptions: CommanderResourceSplitOption[],
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "commander-resource-split", selector: "self", options: splitOptions, ...options }], conditions);
}

export function agentTrashSourceForTrade(
  resource: TradeGoodId,
  options: {
    partner?: TradeEffectPartner;
    optional?: true;
    partnerLocked?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "trash-source-for-trade",
      selector: "self",
      partner: options.partner ?? "same-team-allies",
      resource,
      optional: true,
      partnerLocked: options.partnerLocked ?? true,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function agentMoveCardToThroneRow(
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "move-card-to-throne-row", selector: "self", ...options }], conditions);
}

export function agentDrawCards(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec;
export function agentDrawCards(
  amount: EffectAmountSpec,
  options: { source?: string },
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec;
export function agentDrawCards(
  amount: EffectAmountSpec,
  optionsOrConditions: { source?: string } | GameEffectConditionSpec[] = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  const options = Array.isArray(optionsOrConditions) ? {} : optionsOrConditions;
  const resolvedConditions = Array.isArray(optionsOrConditions) ? optionsOrConditions : conditions;
  return agentPlayEffects([{ kind: "draw-cards", selector: "self", amount, ...options }], resolvedConditions);
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
): CardEffectSpec;
export function agentGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  options: { source?: string },
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec;
export function agentGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  optionsOrConditions: { source?: string } | GameEffectConditionSpec[] = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  const options = Array.isArray(optionsOrConditions) ? {} : optionsOrConditions;
  const resolvedConditions = Array.isArray(optionsOrConditions) ? optionsOrConditions : conditions;
  return agentPlayEffects([{ kind: "gain-resource", selector: "self", resource, amount, ...options }], resolvedConditions);
}

export function agentRecruitTroops(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec;
export function agentRecruitTroops(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  options: { source?: string },
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec;
export function agentRecruitTroops(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  optionsOrConditions: { source?: string } | GameEffectConditionSpec[] = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  const options = Array.isArray(optionsOrConditions) ? {} : optionsOrConditions;
  const resolvedConditions = Array.isArray(optionsOrConditions) ? optionsOrConditions : conditions;
  return agentPlayEffects([{ kind: "recruit-troops", selector, amount, ...options }], resolvedConditions);
}

export function agentPlaceSpies(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  options: {
    recallForSupply?: boolean;
    mustPlace?: boolean;
    placementIcon?: IconId;
    allowSharedPost?: boolean;
    source?: string;
    postPlacementAction?: "staban-unseen-network";
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "place-spies", selector, amount, ...options }], conditions);
}

export function visitedMakerSpace() {
  return { kind: "visited-maker-space" } as const;
}

export function visitedSpaceIcon(icon: IconId) {
  return { kind: "visited-space-icon", icon } as const;
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

export function hasSwordmasterBonus() {
  return { kind: "has-swordmaster-bonus" } as const;
}

export function hasLeader(leader: string) {
  return { kind: "has-leader", leader } as const;
}

export function hasAlliance(faction?: FactionId) {
  return faction ? ({ kind: "has-alliance", faction } as const) : ({ kind: "has-alliance" } as const);
}

export function cloneCardEffects(effects: CardEffectSpec[] | undefined): CardEffectSpec[] | undefined {
  return effects?.map((spec) => ({
    ...spec,
    conditions: spec.conditions?.map((condition) => ({ ...condition })),
    effects: spec.effects.map((effect) => ({
      ...effect,
      ...("amount" in effect ? { amount: cloneAmount(effect.amount) } : {}),
      ...("cost" in effect
        ? { cost: cloneAmount(effect.cost) }
        : {}),
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
      ...("options" in effect
        ? { options: effect.options.map((option) => ({ ...option })) }
        : {}),
    })),
  }));
}

function cloneAmount(amount: EffectAmountSpec): EffectAmountSpec {
  return typeof amount === "number" ? amount : { ...amount };
}
