import { validateSpec } from "./effect-spec-validation";
import { amountFor, specApplies } from "./effect-resolver-helpers";
import type {
  AgentPaidRewardChoice,
  AgentPaidRewardChoiceAtomicReward,
  AgentPendingActionChoice,
  GameEffectContext,
  LeaderTransitionChoice,
} from "./effect-resolver-types";
import type {
  CardEffectSpec,
  PaidRewardChoiceEffectAtomicReward,
  PaidRewardChoiceEffectOption,
  PendingActionChoiceEffectOption,
} from "./types";

function resolvePaidRewardChoiceOption(
  option: PaidRewardChoiceEffectOption,
  context: GameEffectContext,
): AgentPaidRewardChoice["options"][number] {
  const resolveReward = (reward: PaidRewardChoiceEffectAtomicReward): AgentPaidRewardChoiceAtomicReward => {
    switch (reward.kind) {
      case "recruit-troops":
        return {
          kind: "recruit-troops",
          selector: reward.selector,
          amount: amountFor(reward.amount, context.source),
          destination: reward.destination,
        };
      case "gain-influence":
        return {
          kind: "gain-influence",
          selector: reward.selector,
          faction: reward.faction,
          amount: amountFor(reward.amount, context.source),
        };
      case "gain-resource":
        return {
          kind: "gain-resource",
          selector: reward.selector,
          resource: reward.resource,
          amount: amountFor(reward.amount, context.source),
        };
      case "gain-vp":
        return {
          kind: "gain-vp",
          selector: reward.selector,
          amount: amountFor(reward.amount, context.source),
        };
      case "draw-intrigues":
        return {
          kind: "draw-intrigues",
          selector: reward.selector,
          amount: amountFor(reward.amount, context.source),
        };
      case "gain-leader-counter":
        return {
          kind: "gain-leader-counter",
          selector: reward.selector,
          counter: reward.counter,
          amount: amountFor(reward.amount, context.source),
          troopSupplyCost: amountFor(reward.troopSupplyCost, context.source),
        };
      default: {
        const unsupported = reward as { kind?: unknown };
        throw new Error(`Unsupported paid-reward-choice reward "${String(unsupported.kind)}"`);
      }
    }
  };
  const resolvedBase = {
    id: option.id,
    resource: option.resource,
    cost: amountFor(option.cost, context.source),
  };
  if (option.reward.kind === "bundle") {
    return {
      ...resolvedBase,
      reward: {
        kind: "bundle",
        rewards: option.reward.rewards.map(resolveReward),
      },
    };
  }
  switch (option.reward.kind) {
    case "recruit-troops":
      return {
        ...resolvedBase,
        reward: resolveReward(option.reward),
      };
    case "gain-influence":
      return {
        ...resolvedBase,
        reward: resolveReward(option.reward),
      };
    case "gain-resource":
    case "gain-vp":
      return {
        ...resolvedBase,
        reward: resolveReward(option.reward),
      };
    case "draw-intrigues":
    case "gain-leader-counter":
      return {
        ...resolvedBase,
        reward: resolveReward(option.reward),
      };
    default: {
      const reward = option.reward as { kind?: unknown };
      throw new Error(`Unsupported paid-reward-choice reward "${String(reward.kind)}"`);
    }
  }
}

function resolvePaidRewardChoicesForTrigger(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
  trigger: GameEffectContext["trigger"],
): AgentPaidRewardChoice[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "paid-reward-choice")
      .map((effect) => ({
        selector: effect.selector,
        options: effect.options.map((option) => resolvePaidRewardChoiceOption(option, context)),
        ...(effect.requiredRecipient ? { requiredRecipient: effect.requiredRecipient } : {}),
        ...(effect.requirePayableOption ? { requirePayableOption: true } : {}),
        source: effect.source,
      }));
  });
}

export function resolveAgentPaidRewardChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPaidRewardChoice[] {
  return resolvePaidRewardChoicesForTrigger(specs, context, "agent-play");
}

export function resolveRevealPaidRewardChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPaidRewardChoice[] {
  return resolvePaidRewardChoicesForTrigger(specs, context, "reveal");
}

function resolvePendingActionChoiceOption(
  option: PendingActionChoiceEffectOption,
  context: GameEffectContext,
): AgentPendingActionChoice["options"][number] {
  if (option.effect.kind === "acquire-card") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "acquire-card",
        selector: option.effect.selector,
        ...(option.effect.minCost !== undefined ? { minCost: amountFor(option.effect.minCost, context.source) } : {}),
        ...(option.effect.maxCost !== undefined ? { maxCost: amountFor(option.effect.maxCost, context.source) } : {}),
        destination: option.effect.destination,
        ...(option.effect.paymentResource ? { paymentResource: option.effect.paymentResource } : {}),
        optional: option.effect.optional ?? false,
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  if (option.effect.kind === "trash-card") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "trash-card",
        selector: option.effect.selector,
        optional: option.effect.optional ?? false,
        ...(option.effect.zones ? { zones: [...option.effect.zones] } : {}),
        excludeSource: option.effect.excludeSource ?? false,
        ...(option.effect.sourceOnly ? { sourceOnly: true } : {}),
        ...(option.effect.requiredTrait ? { requiredTrait: option.effect.requiredTrait } : {}),
        ...(option.effect.spiceRewardCostThreshold !== undefined
          ? { spiceRewardCostThreshold: amountFor(option.effect.spiceRewardCostThreshold, context.source) }
          : {}),
        ...(option.effect.spiceReward !== undefined
          ? { spiceReward: amountFor(option.effect.spiceReward, context.source) }
          : {}),
        ...(option.effect.vpReward !== undefined
          ? { vpReward: amountFor(option.effect.vpReward, context.source) }
          : {}),
        ...(option.effect.persuasionCost !== undefined
          ? { persuasionCost: amountFor(option.effect.persuasionCost, context.source) }
          : {}),
        ...(option.effect.resourceCost
          ? {
              resourceCost: Object.fromEntries(
                Object.entries(option.effect.resourceCost)
                  .map(([resource, amount]) => [resource, amountFor(amount, context.source)])
              ),
            }
          : {}),
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  if (option.effect.kind === "place-spies") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "place-spies",
        selector: option.effect.selector,
        amount: amountFor(option.effect.amount, context.source),
        ...(option.effect.recallForSupply ? { recallForSupply: true } : {}),
        ...(option.effect.mustPlace ? { mustPlace: true } : {}),
        ...(option.effect.placementIcon ? { placementIcon: option.effect.placementIcon } : {}),
        ...(option.effect.placementIcons ? { placementIcons: [...option.effect.placementIcons] } : {}),
        ...(option.effect.allowSharedPost ? { allowSharedPost: true } : {}),
        ...(option.effect.source ? { source: option.effect.source } : {}),
        ...(option.effect.postPlacementAction ? { postPlacementAction: option.effect.postPlacementAction } : {}),
      },
    };
  }
  if (option.effect.kind === "gain-persuasion") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "gain-persuasion",
        selector: option.effect.selector,
        amount: amountFor(option.effect.amount, context.source),
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  if (option.effect.kind === "gain-resource") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "gain-resource",
        selector: option.effect.selector,
        resource: option.effect.resource,
        amount: amountFor(option.effect.amount, context.source),
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  if (option.effect.kind === "gain-strength") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "gain-strength",
        selector: option.effect.selector,
        amount: amountFor(option.effect.amount, context.source),
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  if (option.effect.kind === "pay-resource-for-high-council-seat") {
    return {
      id: option.id,
      label: option.label,
      effect: {
        kind: "pay-resource-for-high-council-seat",
        selector: option.effect.selector,
        resource: option.effect.resource,
        cost: amountFor(option.effect.cost, context.source),
        optional: true,
        persuasionCost: option.effect.persuasionCost === undefined
          ? 0
          : amountFor(option.effect.persuasionCost, context.source),
        persuasionReward: option.effect.persuasionReward === undefined
          ? 0
          : amountFor(option.effect.persuasionReward, context.source),
        ...(option.effect.source ? { source: option.effect.source } : {}),
      },
    };
  }
  const effect = option.effect as { kind?: unknown };
  throw new Error(`Unsupported pending-action-choice effect "${String(effect.kind)}"`);
}

function resolvePendingActionChoicesForTrigger(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
  trigger: GameEffectContext["trigger"],
): AgentPendingActionChoice[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pending-action-choice")
      .map((effect) => ({
        selector: effect.selector,
        options: effect.options
          .filter((option) => specApplies({ trigger, effects: [], conditions: option.conditions }, context))
          .map((option) => resolvePendingActionChoiceOption(option, context)),
        ...(effect.optional ? { optional: true } : {}),
        source: effect.source,
      }));
  });
}

export function resolveAgentPendingActionChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPendingActionChoice[] {
  return resolvePendingActionChoicesForTrigger(specs, context, "agent-play");
}

export function resolveRevealPendingActionChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPendingActionChoice[] {
  return resolvePendingActionChoicesForTrigger(specs, context, "reveal");
}

export function resolveLeaderTransitionChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): LeaderTransitionChoice[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-placement") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "leader-transition-choice")
      .map((effect) => ({
        selector: effect.selector,
        fromLeader: effect.fromLeader,
        toLeader: effect.toLeader,
        counter: effect.counter,
        counterAmount: effect.counterAmount,
        drawCardsPerCounter: amountFor(effect.drawCardsPerCounter, context.source),
        ...(effect.followUp
          ? {
              followUp: {
                ...effect.followUp,
                cost: amountFor(effect.followUp.cost, context.source),
              },
            }
          : {}),
        ...(effect.source ? { source: effect.source } : {}),
      }));
  });
}
