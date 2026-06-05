import type {
  CardEffectSpec,
  EffectAmountSpec,
  GameEffectSpec,
  PaidRewardChoiceEffectAtomicReward,
  PaidRewardChoiceEffectOption,
  PaidRewardChoiceEffectReward,
  PendingActionChoiceEffectOption,
  ResourceId,
} from "./types";

export function cloneCardEffects(effects: CardEffectSpec[] | undefined): CardEffectSpec[] | undefined {
  return effects?.map((spec) => ({
    ...spec,
    conditions: spec.conditions?.map((condition) => ({ ...condition })),
    effects: spec.effects.map((effect): GameEffectSpec => {
      if (effect.kind === "summon-sandworms") return { ...effect };
      if (effect.kind === "leader-transition-choice") {
        return {
          ...effect,
          drawCardsPerCounter: cloneAmount(effect.drawCardsPerCounter),
          ...(effect.followUp
            ? {
                followUp: {
                  ...effect.followUp,
                  cost: cloneAmount(effect.followUp.cost),
                },
              }
            : {}),
        };
      }
      if (effect.kind === "paid-reward-choice") {
        return {
          ...effect,
          options: clonePaidRewardChoiceOptions(effect.options),
        };
      }
      if (effect.kind === "pending-action-choice") {
        return {
          ...effect,
          options: clonePendingActionChoiceOptions(effect.options),
        };
      }
      if (effect.kind === "trash-intrigue-for-reward") {
        return {
          ...effect,
          ...(effect.cost ? { cost: cloneResourceAmountMap(effect.cost) } : {}),
          ...(effect.drawIntrigues !== undefined ? { drawIntrigues: cloneAmount(effect.drawIntrigues) } : {}),
          ...(effect.gain ? { gain: cloneResourceAmountMap(effect.gain) } : {}),
          ...(effect.gainVp !== undefined ? { gainVp: cloneAmount(effect.gainVp) } : {}),
        };
      }
      if (effect.kind === "discard-cards-for-reward") {
        return {
          ...effect,
          amount: cloneAmount(effect.amount),
          ...(effect.cost ? { cost: cloneResourceAmountMap(effect.cost) } : {}),
          ...(effect.gain ? { gain: cloneResourceAmountMap(effect.gain) } : {}),
          ...(effect.gainVp !== undefined ? { gainVp: cloneAmount(effect.gainVp) } : {}),
          ...(effect.takeContracts
            ? {
                takeContracts: {
                  ...effect.takeContracts,
                  amount: cloneAmount(effect.takeContracts.amount),
                },
              }
            : {}),
        };
      }
      if (effect.kind === "discard-card-for-draw") {
        return {
          ...effect,
          drawCards: cloneAmount(effect.drawCards),
          ...(effect.drawIntrigues !== undefined ? { drawIntrigues: cloneAmount(effect.drawIntrigues) } : {}),
          ...(effect.bonusDraw
            ? {
                bonusDraw: {
                  ...effect.bonusDraw,
                  drawCards: cloneAmount(effect.bonusDraw.drawCards),
                },
              }
            : {}),
          ...(effect.bonusIntrigues
            ? {
                bonusIntrigues: {
                  ...effect.bonusIntrigues,
                  amount: cloneAmount(effect.bonusIntrigues.amount),
                },
              }
          : {}),
        };
      }
      if (effect.kind === "place-spies") {
        return {
          ...effect,
          ...(effect.placementIcons ? { placementIcons: [...effect.placementIcons] } : {}),
        };
      }
      return {
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
        ...("drawIntrigues" in effect && effect.drawIntrigues !== undefined
          ? { drawIntrigues: cloneAmount(effect.drawIntrigues) }
          : {}),
        ...("spiceRewardCostThreshold" in effect && effect.spiceRewardCostThreshold !== undefined
          ? { spiceRewardCostThreshold: cloneAmount(effect.spiceRewardCostThreshold) }
          : {}),
        ...("spiceReward" in effect && effect.spiceReward !== undefined
          ? { spiceReward: cloneAmount(effect.spiceReward) }
          : {}),
        ...("drawCardsReward" in effect && effect.drawCardsReward !== undefined
          ? { drawCardsReward: cloneAmount(effect.drawCardsReward) }
          : {}),
        ...("vpReward" in effect && effect.vpReward !== undefined
          ? { vpReward: cloneAmount(effect.vpReward) }
          : {}),
        ...("loseAmount" in effect
          ? { loseAmount: cloneAmount(effect.loseAmount) }
          : {}),
        ...("gainAmount" in effect
          ? { gainAmount: cloneAmount(effect.gainAmount) }
          : {}),
        ...("resourceCost" in effect && effect.resourceCost !== undefined
          ? { resourceCost: cloneResourceAmountMap(effect.resourceCost) }
          : {}),
        ...("drawCards" in effect
          ? { drawCards: cloneAmount(effect.drawCards) }
          : {}),
        ...("influenceAmount" in effect
          ? { influenceAmount: cloneAmount(effect.influenceAmount) }
          : {}),
        ...("persuasionCost" in effect && effect.persuasionCost !== undefined
          ? { persuasionCost: cloneAmount(effect.persuasionCost) }
          : {}),
        ...("persuasionReward" in effect && effect.persuasionReward !== undefined
          ? { persuasionReward: cloneAmount(effect.persuasionReward) }
          : {}),
        ...("options" in effect
          ? { options: effect.options.map((option) => ({ ...option })) }
          : {}),
      };
    }),
  }));
}

function cloneResourceAmountMap(
  gain: Partial<Record<ResourceId, EffectAmountSpec>>,
): Partial<Record<ResourceId, EffectAmountSpec>> {
  return Object.fromEntries(
    Object.entries(gain).map(([resource, amount]) => [resource, cloneAmount(amount as EffectAmountSpec)]),
  ) as Partial<Record<ResourceId, EffectAmountSpec>>;
}

export function clonePendingActionChoiceOptions(options: PendingActionChoiceEffectOption[]): PendingActionChoiceEffectOption[] {
  return options.map((option) => {
    if (option.effect.kind === "acquire-card") {
      return {
        ...option,
        ...(option.conditions ? { conditions: option.conditions.map((condition) => ({ ...condition })) } : {}),
        effect: {
          ...option.effect,
          ...(option.effect.minCost !== undefined ? { minCost: cloneAmount(option.effect.minCost) } : {}),
          ...(option.effect.maxCost !== undefined ? { maxCost: cloneAmount(option.effect.maxCost) } : {}),
        },
      };
    }
    if (option.effect.kind === "trash-card") {
      return {
        ...option,
        ...(option.conditions ? { conditions: option.conditions.map((condition) => ({ ...condition })) } : {}),
        effect: {
          ...option.effect,
          ...(option.effect.zones ? { zones: [...option.effect.zones] } : {}),
          ...(option.effect.spiceRewardCostThreshold !== undefined
            ? { spiceRewardCostThreshold: cloneAmount(option.effect.spiceRewardCostThreshold) }
            : {}),
          ...(option.effect.spiceReward !== undefined
            ? { spiceReward: cloneAmount(option.effect.spiceReward) }
            : {}),
          ...(option.effect.vpReward !== undefined
            ? { vpReward: cloneAmount(option.effect.vpReward) }
            : {}),
          ...(option.effect.persuasionCost !== undefined
            ? { persuasionCost: cloneAmount(option.effect.persuasionCost) }
            : {}),
          ...(option.effect.resourceCost
            ? { resourceCost: cloneResourceAmountMap(option.effect.resourceCost) }
            : {}),
        },
      };
    }
    if (option.effect.kind === "place-spies") {
      return {
        ...option,
        ...(option.conditions ? { conditions: option.conditions.map((condition) => ({ ...condition })) } : {}),
        effect: {
          ...option.effect,
          amount: cloneAmount(option.effect.amount),
          ...(option.effect.placementIcons ? { placementIcons: [...option.effect.placementIcons] } : {}),
        },
      };
    }
    if (
      option.effect.kind === "gain-persuasion" ||
      option.effect.kind === "gain-resource" ||
      option.effect.kind === "gain-strength"
    ) {
      return {
        ...option,
        ...(option.conditions ? { conditions: option.conditions.map((condition) => ({ ...condition })) } : {}),
        effect: {
          ...option.effect,
          amount: cloneAmount(option.effect.amount),
        },
      };
    }
    if (option.effect.kind === "pay-resource-for-high-council-seat") {
      return {
        ...option,
        ...(option.conditions ? { conditions: option.conditions.map((condition) => ({ ...condition })) } : {}),
        effect: {
          ...option.effect,
          cost: cloneAmount(option.effect.cost),
          ...(option.effect.persuasionCost !== undefined
            ? { persuasionCost: cloneAmount(option.effect.persuasionCost) }
            : {}),
          ...(option.effect.persuasionReward !== undefined
            ? { persuasionReward: cloneAmount(option.effect.persuasionReward) }
            : {}),
        },
      };
    }
    const effect = option.effect as { kind?: unknown };
    throw new Error(`Unsupported pending-action-choice effect "${String(effect.kind)}"`);
  });
}

export function clonePaidRewardChoiceOptions(options: PaidRewardChoiceEffectOption[]): PaidRewardChoiceEffectOption[] {
  return options.map((option) => ({
    ...option,
    cost: cloneAmount(option.cost),
    reward: clonePaidRewardChoiceReward(option.reward),
  }));
}

function clonePaidRewardChoiceReward(reward: PaidRewardChoiceEffectReward): PaidRewardChoiceEffectReward {
  if (reward.kind === "bundle") {
    return {
      kind: "bundle",
      rewards: reward.rewards.map(clonePaidRewardChoiceAtomicReward),
    };
  }
  return clonePaidRewardChoiceAtomicReward(reward);
}

function clonePaidRewardChoiceAtomicReward(
  reward: PaidRewardChoiceEffectAtomicReward,
): PaidRewardChoiceEffectAtomicReward {
  switch (reward.kind) {
    case "recruit-troops":
    case "gain-influence":
    case "gain-resource":
    case "gain-vp":
    case "draw-intrigues":
      return {
        ...reward,
        amount: cloneAmount(reward.amount),
      };
    case "gain-leader-counter":
      return {
        ...reward,
        amount: cloneAmount(reward.amount),
        troopSupplyCost: cloneAmount(reward.troopSupplyCost),
      };
    default: {
      const unsupported = reward as { kind?: unknown };
      throw new Error(`Unsupported paid-reward-choice reward "${String(unsupported.kind)}"`);
    }
  }
}

function cloneAmount(amount: EffectAmountSpec): EffectAmountSpec {
  return typeof amount === "number" ? amount : { ...amount };
}
