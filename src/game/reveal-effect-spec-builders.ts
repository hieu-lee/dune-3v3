import { revealEffects } from "./effect-spec-base";
import type {
  CardEffectSpec,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  IconId,
  PaidRewardChoiceEffectOption,
  PendingActionChoiceEffectOption,
  ResourceId,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TrashCardZone,
  TroopEffectDestination,
  TroopEffectRecipient,
} from "./types";

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

export function revealDrawIntrigues(amount: EffectAmountSpec, conditions?: GameEffectConditionSpec[]): CardEffectSpec {
  return revealEffects([{ kind: "draw-intrigues", selector: "self", amount }], conditions);
}

export function revealGainInfluence(
  faction: FactionId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([{ kind: "gain-influence", selector: "self", faction, amount }], conditions);
}

export function revealGainInfluenceForSpiedFactions(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([{ kind: "gain-influence-for-spied-factions", selector: "self", amount }], conditions);
}

export function revealPaidRewardChoice(
  options: PaidRewardChoiceEffectOption[],
  specOptions: {
    requirePayableOption?: true;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "paid-reward-choice",
      selector: "self",
      options,
      ...(specOptions.requirePayableOption ? { requirePayableOption: true } : {}),
      ...(specOptions.source ? { source: specOptions.source } : {}),
    },
  ], conditions);
}

export function revealPendingActionChoice(
  options: PendingActionChoiceEffectOption[],
  specOptions: {
    optional?: true;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "pending-action-choice",
      selector: "self",
      options,
      ...(specOptions.optional ? { optional: true } : {}),
      ...(specOptions.source ? { source: specOptions.source } : {}),
    },
  ], conditions);
}

export function revealRecruitTroops(
  amount: EffectAmountSpec,
  options: { source?: string } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([{ kind: "recruit-troops", selector: "self", amount, ...options }], conditions);
}

export function revealPlaceSpies(
  amount: EffectAmountSpec,
  options: {
    recallForSupply?: boolean;
    mustPlace?: boolean;
    placementIcon?: IconId;
    placementIcons?: IconId[];
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

export function revealDeployOrRetreatTroops(
  troops: EffectAmountSpec,
  options: {
    optional?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "deploy-or-retreat-troops",
      selector: "self",
      amount: troops,
      optional: options.optional ?? true,
      ...(options.source ? { source: options.source } : {}),
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

export function revealTrashSourceForVp(
  vp: EffectAmountSpec,
  options: {
    optional?: boolean;
    persuasionCost?: EffectAmountSpec;
    resourceCost?: Partial<Record<ResourceId, EffectAmountSpec>>;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "trash-card",
      selector: "self",
      sourceOnly: true,
      zones: ["playArea"],
      vpReward: vp,
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

export function revealLoseInfluenceForInfluence(
  options: {
    loseAmount?: EffectAmountSpec;
    gainAmount?: EffectAmountSpec;
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "lose-influence-for-influence",
      selector: "self",
      loseAmount: options.loseAmount ?? 1,
      gainAmount: options.gainAmount ?? 1,
      optional: true,
      ...options,
    },
  ], conditions);
}

export function revealRecallSpyForIntrigues(
  drawIntrigues: EffectAmountSpec,
  options: {
    amount?: EffectAmountSpec;
    optional?: boolean;
    persuasionReward?: EffectAmountSpec;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "recall-spy",
      selector: "self",
      amount: options.amount ?? 1,
      drawIntrigues,
      ...(options.persuasionReward !== undefined ? { persuasionReward: options.persuasionReward } : {}),
      optional: true,
      ...(options.source ? { source: options.source } : {}),
      ...(options.optional !== undefined ? { optional: options.optional } : {}),
    },
  ], conditions);
}

export function revealRecallSpiesForPersuasion(
  amount: EffectAmountSpec,
  persuasionReward: EffectAmountSpec,
  options: {
    optional?: boolean;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "recall-spy",
      selector: "self",
      amount,
      persuasionReward,
      optional: true,
      ...(options.source ? { source: options.source } : {}),
      ...(options.optional !== undefined ? { optional: options.optional } : {}),
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

export function revealPayResourceForHighCouncilSeat(
  resource: ResourceId,
  cost: EffectAmountSpec,
  options: {
    optional?: true;
    persuasionCost?: EffectAmountSpec;
    persuasionReward?: EffectAmountSpec;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return revealEffects([
    {
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource,
      cost,
      optional: true,
      ...(options.persuasionCost !== undefined ? { persuasionCost: options.persuasionCost } : {}),
      ...(options.persuasionReward !== undefined ? { persuasionReward: options.persuasionReward } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}
