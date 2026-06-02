import { combatIntrigueEffects, type CardEffectSpecOptions } from "./effect-spec-base";
import type {
  AcquireCardDestination,
  CardEffectSpec,
  ContractEffectSourcePool,
  EffectAmountSpec,
  GameEffectConditionSpec,
  InfluenceLossForStrengthAlternateOwner,
  ResourceId,
  TrashCardZone,
  TroopRetreatBoundSpec,
} from "./types";

export function combatGainStrength(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([{ kind: "gain-strength", selector: "self", amount }], conditions, options);
}

export function combatGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "gain-resource",
      selector: "self",
      resource,
      amount,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
}

export function combatSpendResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "spend-resource",
      selector: "self",
      resource,
      amount,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
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

export function combatPlaceSpies(
  amount: EffectAmountSpec,
  options: {
    source?: string;
    mustPlace?: boolean;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return combatIntrigueEffects([
    {
      kind: "place-spies",
      selector: "self",
      amount,
      ...(options.source ? { source: options.source } : {}),
      ...(options.mustPlace !== undefined ? { mustPlace: options.mustPlace } : {}),
    },
  ], conditions, specOptions);
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
  max: TroopRetreatBoundSpec,
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

export function deployedTroopsRetreatBound(): TroopRetreatBoundSpec {
  return { kind: "deployed-troops" };
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
