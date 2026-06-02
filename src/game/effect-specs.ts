import type {
  AcquireCardDestination,
  CardEffectSpec,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  IconId,
  InfluenceLossForStrengthAlternateOwner,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  PlayerSelector,
  ResourceId,
  Role,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamId,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
  TroopEffectDestination,
  TroopEffectRecipient,
  TrashCardZone,
} from "./types";

type AgentAcquireCardOptions = (
  | { maxCost: EffectAmountSpec; paymentResource?: ResourceId }
  | { maxCost?: EffectAmountSpec; paymentResource: ResourceId }
) & {
  destination: AcquireCardDestination;
  minCost?: EffectAmountSpec;
  optional?: boolean;
  source?: string;
};

type CardEffectSpecOptions = {
  choiceId?: string;
};

function effectSpec(
  trigger: CardEffectSpec["trigger"],
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options: CardEffectSpecOptions = {},
): CardEffectSpec {
  return {
    trigger,
    ...(options.choiceId !== undefined ? { choiceId: options.choiceId } : {}),
    ...(conditions && conditions.length > 0 ? { conditions } : {}),
    effects,
  };
}

export function agentPlayEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("agent-play", effects, conditions);
}

export function revealEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("reveal", effects, conditions);
}

export function acquireEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("acquire", effects, conditions);
}

export function plotIntrigueEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return effectSpec("plot-intrigue", effects, conditions, options);
}

export function combatIntrigueEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return effectSpec("combat-intrigue", effects, conditions, options);
}

export function combatGainStrength(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([{ kind: "gain-strength", selector: "self", amount }], conditions, options);
}

export function combatAcquireCard(
  destination: AcquireCardDestination,
  maxCost: EffectAmountSpec,
  options: {
    source?: string;
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "acquire-card",
      selector: "self",
      maxCost,
      destination,
      ...(options.source ? { source: options.source } : {}),
      ...(options.optional ? { optional: true } : {}),
    },
  ], conditions);
}

export function combatTrashCard(
  options: {
    optional: true;
    zones?: TrashCardZone[];
    excludeSource?: boolean;
    requiredTrait?: string;
  },
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "trash-card",
      selector: "self",
      ...options,
    },
  ], conditions);
}

export function combatRecallSpiesForStrength(
  amount: number,
  strength: EffectAmountSpec,
  options: {
    source?: string;
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "recall-spy",
      selector: "self",
      amount,
      strengthReward: strength,
      ...(options.source ? { source: options.source } : {}),
      ...(options.optional !== undefined ? { optional: options.optional } : {}),
    },
  ], conditions);
}

export function combatLoseInfluenceForStrength(
  strengthReward: EffectAmountSpec,
  options: {
    source?: string;
    alternateOwner?: InfluenceLossForStrengthAlternateOwner;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "lose-influence-for-strength",
      selector: "self",
      amount: 1,
      strengthReward,
      owner: "combat-recipient",
      optional: true,
      ...(options.source ? { source: options.source } : {}),
      ...(options.alternateOwner ? { alternateOwner: options.alternateOwner } : {}),
    },
  ], conditions);
}

export function combatRetreatTroops(
  min: number,
  max: number,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "retreat-troops",
      selector: "self",
      min,
      max,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
}

export function combatTakeContracts(
  amount: EffectAmountSpec,
  options: {
    sourcePool?: ContractEffectSourcePool;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "take-contracts",
      selector: "self",
      amount,
      sourcePool: options.sourcePool ?? "public-offer",
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
}

export function plotGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "gain-resource", selector: "self", resource, amount }], conditions, options);
}

export function plotDrawCards(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "draw-cards", selector: "self", amount }], conditions, options);
}

export function plotDrawIntrigues(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "draw-intrigues", selector: "self", amount }], conditions, options);
}

export function plotActivateAcquireRecruitBonus(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "activate-acquire-recruit-bonus", selector: "self", amount }], conditions, options);
}

export function plotSpendResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "spend-resource", selector: "self", resource, amount }], conditions, options);
}

export function plotTrashCard(
  options: {
    optional?: boolean;
    zones?: TrashCardZone[];
    excludeSource?: boolean;
    requiredTrait?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "trash-card", selector: "self", ...options }], conditions, specOptions);
}

export function plotDiscardCard(
  amount: EffectAmountSpec,
  options: {
    optional?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "discard-card", selector: "self", amount, ...options }], conditions, specOptions);
}

export function plotDiscardCardForInfluence(
  choiceId: string,
  faction: FactionId,
  selector: PlayerSelector,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "discard-card", selector: "self", amount: 1 },
    { kind: "gain-influence", selector, faction, amount: 1 },
  ], conditions, { choiceId });
}

export function plotManipulateRowCard(
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "manipulate-row-card", selector: "self", ...options }], conditions, specOptions);
}

export function plotResourceExchange(
  choiceId: string,
  spendResource: ResourceId,
  spendAmount: EffectAmountSpec,
  gainResource: ResourceId,
  gainAmount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "spend-resource", selector: "self", resource: spendResource, amount: spendAmount },
    { kind: "gain-resource", selector: "self", resource: gainResource, amount: gainAmount },
  ], conditions, { choiceId });
}

export function plotLoseInfluenceForResource(
  choiceId: string,
  faction: FactionId,
  influenceAmount: EffectAmountSpec,
  resource: ResourceId,
  resourceAmount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "lose-influence", selector: "self", faction, amount: influenceAmount },
    { kind: "gain-resource", selector: "self", resource, amount: resourceAmount },
  ], conditions, { choiceId });
}

export function plotGainInfluence(
  selector: PlayerSelector,
  faction: FactionId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "gain-influence", selector, faction, amount }], conditions, options);
}

export function plotPayResourceForInfluence(
  choiceId: string,
  resource: ResourceId,
  resourceAmount: EffectAmountSpec,
  selector: PlayerSelector,
  faction: FactionId,
  influenceAmount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "spend-resource", selector: "self", resource, amount: resourceAmount },
    { kind: "gain-influence", selector, faction, amount: influenceAmount },
  ], conditions, { choiceId });
}

export function plotPayResourceForInfluenceGains(
  choiceId: string,
  resource: ResourceId,
  resourceAmount: EffectAmountSpec,
  gains: Array<{ selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec }>,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "spend-resource", selector: "self", resource, amount: resourceAmount },
    ...gains.map(({ selector, faction, amount }) => ({ kind: "gain-influence" as const, selector, faction, amount })),
  ], conditions, { choiceId });
}

export function plotShiftInfluence(
  choiceId: string,
  loss: { selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec },
  gain: { selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec },
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "lose-influence", selector: loss.selector, faction: loss.faction, amount: loss.amount },
    { kind: "gain-influence", selector: gain.selector, faction: gain.faction, amount: gain.amount },
  ], conditions, { choiceId });
}

export function plotShiftInfluenceAndPayResourceForInfluenceGains(
  choiceId: string,
  loss: { selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec },
  resource: ResourceId,
  resourceAmount: EffectAmountSpec,
  gains: Array<{ selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec }>,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    { kind: "lose-influence", selector: loss.selector, faction: loss.faction, amount: loss.amount },
    { kind: "spend-resource", selector: "self", resource, amount: resourceAmount },
    ...gains.map(({ selector, faction, amount }) => ({ kind: "gain-influence" as const, selector, faction, amount })),
  ], conditions, { choiceId });
}

export function plotPayResourcesForVp(
  choiceId: string,
  costs: Array<{ resource: ResourceId; amount: EffectAmountSpec }>,
  vp: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    ...costs.map(({ resource, amount }) => ({ kind: "spend-resource" as const, selector: "self" as const, resource, amount })),
    { kind: "gain-vp", selector: "self", amount: vp },
  ], conditions, { choiceId });
}

export function plotPayResourcesAndLoseInfluenceForVp(
  choiceId: string,
  costs: Array<{ resource: ResourceId; amount: EffectAmountSpec }>,
  losses: Array<{ faction: FactionId; amount: EffectAmountSpec }>,
  vp: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    ...costs.map(({ resource, amount }) => ({ kind: "spend-resource" as const, selector: "self" as const, resource, amount })),
    ...losses.map(({ faction, amount }) => ({ kind: "lose-influence" as const, selector: "self" as const, faction, amount })),
    { kind: "gain-vp", selector: "self", amount: vp },
  ], conditions, { choiceId });
}

export function plotRecruitTroops(
  selector: PlayerSelector,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "recruit-troops", selector, amount }], conditions, options);
}

export function plotTakeContracts(
  amount: EffectAmountSpec,
  options: {
    sourcePool?: ContractEffectSourcePool;
    optional?: true;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    {
      kind: "take-contracts",
      selector: "self",
      amount,
      sourcePool: options.sourcePool ?? "public-offer",
      ...(options.optional ? { optional: true } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function plotAcquireCard(
  choiceId: string,
  destination: AcquireCardDestination,
  maxCost: EffectAmountSpec,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return plotIntrigueEffects([
    {
      kind: "acquire-card",
      selector: "self",
      maxCost,
      destination,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, { choiceId });
}

export function plotPlaceSpies(
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
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "place-spies", selector: "self", amount, ...options }], conditions, specOptions);
}

export function plotRecallSpy(
  options: {
    source?: string;
    reward?: {
      resource: ResourceId;
      amount: EffectAmountSpec;
    };
    removeShieldWall?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([{ kind: "recall-spy", selector: "self", ...options }], conditions, specOptions);
}

export function acquireGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return acquireEffects([{ kind: "gain-resource", selector: "self", resource, amount }], conditions);
}

export function acquireGainVp(amount: EffectAmountSpec, conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return acquireEffects([{ kind: "gain-vp", selector: "self", amount }], conditions);
}

export function acquireDrawIntrigues(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return acquireEffects([{ kind: "draw-intrigues", selector: "self", amount }], conditions);
}

export function acquirePlaceSpies(
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
  return acquireEffects([{ kind: "place-spies", selector: "self", amount, ...options }], conditions);
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

export function revealPlaceSpies(
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
  return revealEffects([{ kind: "place-spies", selector: "self", amount, ...options }], conditions);
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

export function revealPayResourceForSandworms(
  resource: ResourceId,
  cost: EffectAmountSpec,
  sandworms: EffectAmountSpec,
  options: {
    recipient?: SandwormEffectRecipient;
    destination?: SandwormEffectDestination;
    optional?: true;
    trashSource?: boolean;
    persuasionCost?: EffectAmountSpec;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource,
      cost,
      sandworms,
      recipient: options.recipient ?? "combat-recipient",
      destination: options.destination ?? "conflict",
      optional: true,
      ...(options.trashSource ? { trashSource: true } : {}),
      ...(options.persuasionCost !== undefined ? { persuasionCost: options.persuasionCost } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function agentPayResourceForDrawCards(
  resource: ResourceId,
  cost: EffectAmountSpec,
  drawCards: EffectAmountSpec,
  options: {
    optional?: true;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource,
      cost,
      drawCards,
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

export function agentDiscardCardForDraw(
  drawCards: EffectAmountSpec,
  options: {
    optional?: boolean;
    bonusDraw?: {
      requiredDiscardTrait: string;
      drawCards: EffectAmountSpec;
    };
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards,
      optional: options.optional ?? false,
      ...(options.bonusDraw ? { bonusDraw: { ...options.bonusDraw } } : {}),
    },
  ], conditions);
}

export function agentOpponentsDiscardCards(
  amount: EffectAmountSpec,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "opponents-discard-cards",
      selector: "self",
      amount,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}

export function agentAcquireCard(
  options: AgentAcquireCardOptions,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "acquire-card", selector: "self", ...options }], conditions);
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

export function agentPayTeamResourceForVp(
  resource: ResourceId,
  cost: EffectAmountSpec,
  vp: EffectAmountSpec,
  options: {
    contributors?: TeamResourcePaymentContributor;
    recipient?: TeamResourcePaymentRecipient;
    optional?: true;
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pay-team-resource-for-vp",
      selector: "self",
      resource,
      cost,
      vp,
      contributors: options.contributors ?? "self-and-same-team-allies",
      recipient: options.recipient ?? "self",
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

export function agentGainInfluenceChoice(
  amount: EffectAmountSpec,
  options: {
    trashSource?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([{ kind: "gain-influence-choice", selector: "self", amount, ...options }], conditions);
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

export function visitedSpaceWithSpyPost() {
  return { kind: "visited-space-has-spy-post" } as const;
}

export function hasSpyPosts(count: number) {
  return { kind: "has-spy-posts", count } as const;
}

export function hasCombatRecipient() {
  return { kind: "has-combat-recipient" } as const;
}

export function hasCombatRecipientSandworms(count: number) {
  return { kind: "has-combat-recipient-sandworms", count } as const;
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

export function hasHighCouncilSeat() {
  return { kind: "has-high-council-seat" } as const;
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

export function deployedUnitsThisTurn(count: number) {
  return { kind: "deployed-units-this-turn", count } as const;
}

export function gainedSpiceThisTurn() {
  return { kind: "gained-spice-this-turn" } as const;
}

export function cloneCardEffects(effects: CardEffectSpec[] | undefined): CardEffectSpec[] | undefined {
  return effects?.map((spec) => ({
    ...spec,
    conditions: spec.conditions?.map((condition) => ({ ...condition })),
    effects: spec.effects.map((effect) => ({
      ...effect,
      ...("amount" in effect && effect.amount !== undefined
        ? { amount: cloneAmount(effect.amount) }
        : {}),
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
      ...("bonusDraw" in effect && effect.bonusDraw
        ? { bonusDraw: { ...effect.bonusDraw, drawCards: cloneAmount(effect.bonusDraw.drawCards) } }
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
