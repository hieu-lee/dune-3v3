import { acquireEffects } from "./effect-spec-base";
import type {
  CardEffectSpec,
  ContractEffectSourcePool,
  EffectAmountSpec,
  GameEffectConditionSpec,
  IconId,
  ResourceId,
} from "./types";

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

export function acquireGainInfluenceChoice(
  amount: EffectAmountSpec,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return acquireEffects([{ kind: "gain-influence-choice", selector: "self", amount, ...options }], conditions);
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

export function acquireTakeContracts(
  amount: EffectAmountSpec,
  options: {
    sourcePool?: ContractEffectSourcePool;
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return acquireEffects([
    {
      kind: "take-contracts",
      selector: "self",
      amount,
      sourcePool: options.sourcePool ?? "public-offer",
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions);
}
