import { plotIntrigueEffects, type CardEffectSpecOptions } from "./effect-spec-base";
import type {
  AcquireCardDestination,
  CardEffectSpec,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  IconId,
  PlayerSelector,
  ResourceId,
  TrashCardZone,
} from "./types";

type PlotDeployTroopSelector = Extract<PlayerSelector, "self" | "activated-ally">;
type PlotSummonSandwormSelector = Extract<PlayerSelector, "self" | "activated-ally">;

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

export function plotDeployTroops(
  selector: PlotDeployTroopSelector,
  max: number,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([
    {
      kind: "deploy-troops",
      selector,
      max,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
}

export function plotRemoveShieldWall(
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([
    {
      kind: "remove-shield-wall",
      selector: "self",
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
}

export function plotSummonSandworms(
  selector: PlotSummonSandwormSelector,
  amount: number,
  options: {
    source?: string;
  } = {},
  conditions?: GameEffectConditionSpec[],
  specOptions?: CardEffectSpecOptions,
): CardEffectSpec {
  return plotIntrigueEffects([
    {
      kind: "summon-sandworms",
      selector,
      amount,
      ...(options.source ? { source: options.source } : {}),
    },
  ], conditions, specOptions);
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
