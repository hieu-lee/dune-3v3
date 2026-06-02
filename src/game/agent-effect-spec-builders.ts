import { agentPlayEffects } from "./effect-spec-base";
import {
  clonePaidRewardChoiceOptions,
  clonePendingActionChoiceOptions,
} from "./effect-spec-clone";
import type {
  AcquireCardDestination,
  CardEffectSpec,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  GameEffectConditionSpec,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  PaidRewardChoiceEffectOption,
  PendingActionChoiceEffectOption,
  PlayerSelector,
  ResourceId,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
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

export function agentPaidRewardChoice(
  options: PaidRewardChoiceEffectOption[],
  specOptions: {
    requirePayableOption?: true;
    requiredRecipient?: "activated-ally";
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "paid-reward-choice",
      selector: "self",
      options: clonePaidRewardChoiceOptions(options),
      ...(specOptions.requiredRecipient ? { requiredRecipient: specOptions.requiredRecipient } : {}),
      ...(specOptions.requirePayableOption ? { requirePayableOption: true } : {}),
      ...(specOptions.source ? { source: specOptions.source } : {}),
    },
  ], conditions);
}

export function agentPendingActionChoice(
  options: PendingActionChoiceEffectOption[],
  specOptions: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "pending-action-choice",
      selector: "self",
      options: clonePendingActionChoiceOptions(options),
      ...(specOptions.source ? { source: specOptions.source } : {}),
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

export function agentTrashSource(
  options: {
    optional?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return agentPlayEffects([
    {
      kind: "trash-card",
      selector: "self",
      optional: options.optional ?? true,
      zones: ["playArea"],
      sourceOnly: true,
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
