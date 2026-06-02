import { revealEffects } from "./effect-spec-base";
import type {
  CardEffectSpec,
  EffectAmountSpec,
  GameEffectConditionSpec,
  IconId,
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
