import type {
  GameEffectSpec,
  GameEffectTrigger,
  ResourceId,
} from "./types";
import {
  validateCondition,
} from "./effect-spec-condition-validation";
import {
  invalidSpecField,
  supportedAcquireDestinations,
  supportedFactions,
  supportedIcons,
  supportedResources,
  supportedTrashZones,
  unsupportedKind,
  validateAmount,
  validateOptionalBoolean,
  validateOptionalTrue,
  validatePositiveAmount,
  validateSourceLabel,
} from "./effect-spec-validation-utils";

type PaidRewardChoiceEffect = Extract<GameEffectSpec, { kind: "paid-reward-choice" }>;
type PendingActionChoiceEffect = Extract<GameEffectSpec, { kind: "pending-action-choice" }>;
type LeaderTransitionChoiceEffect = Extract<GameEffectSpec, { kind: "leader-transition-choice" }>;

export function validatePaidRewardChoiceEffect(effect: PaidRewardChoiceEffect, trigger: GameEffectTrigger) {
  if (trigger !== "agent-play" && trigger !== "reveal") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  const selector = (effect as { selector?: unknown }).selector;
  if (selector !== "self") {
    throw new Error(`Unsupported effect selector "${String(selector)}" for ${effect.kind}`);
  }
  validateSourceLabel("paid-reward-choice source", effect.source);
  const requiredRecipient = (effect as { requiredRecipient?: unknown }).requiredRecipient;
  if (requiredRecipient !== undefined && requiredRecipient !== "activated-ally") {
    invalidSpecField("paid-reward-choice requiredRecipient", requiredRecipient);
  }
  validateOptionalTrue("paid-reward-choice requirePayableOption", (effect as { requirePayableOption?: unknown }).requirePayableOption);
  if (!Array.isArray(effect.options) || effect.options.length === 0) {
    invalidSpecField("paid-reward-choice options", effect.options);
  }
  const optionIds = new Set<string>();
  effect.options.forEach((option) => {
    if (typeof option.id !== "string" || option.id.trim().length === 0) {
      invalidSpecField("paid-reward-choice option id", option.id);
    }
    if (optionIds.has(option.id)) {
      invalidSpecField("paid-reward-choice duplicate option id", option.id);
    }
    optionIds.add(option.id);
    if (!supportedResources.has(option.resource)) {
      throw new Error(`Unsupported effect resource "${option.resource}"`);
    }
    validatePositiveAmount("paid-reward-choice cost", option.cost);
    const validateAtomicReward = (reward: typeof option.reward) => {
      if (reward.kind === "bundle") {
        invalidSpecField("paid-reward-choice nested bundle", reward.kind);
      }
      if (reward.selector !== "self" && reward.selector !== "activated-ally") {
        throw new Error(`Unsupported paid-reward-choice selector "${reward.selector}"`);
      }
      if (reward.kind === "recruit-troops") {
        validatePositiveAmount("paid-reward-choice troops", reward.amount);
        if (reward.destination !== "garrison") {
          invalidSpecField("paid-reward-choice troop destination", reward.destination);
        }
        return;
      }
      if (reward.kind === "gain-influence") {
        if (!supportedFactions.has(reward.faction)) {
          throw new Error(`Unsupported effect faction "${reward.faction}"`);
        }
        validatePositiveAmount("paid-reward-choice influence", reward.amount);
        return;
      }
      if (reward.kind === "gain-resource") {
        if (!supportedResources.has(reward.resource)) {
          throw new Error(`Unsupported effect resource "${reward.resource}"`);
        }
        validatePositiveAmount("paid-reward-choice resource", reward.amount);
        return;
      }
      if (reward.kind === "gain-vp") {
        validatePositiveAmount("paid-reward-choice VP", reward.amount);
        return;
      }
      if (reward.kind === "draw-intrigues") {
        validatePositiveAmount("paid-reward-choice intrigues", reward.amount);
        return;
      }
      if (reward.kind === "gain-leader-counter") {
        if (reward.counter !== "jessicaMemories") {
          invalidSpecField("paid-reward-choice leader counter", reward.counter);
        }
        validatePositiveAmount("paid-reward-choice leader counter", reward.amount);
        validatePositiveAmount("paid-reward-choice leader counter troopSupplyCost", reward.troopSupplyCost);
        if (reward.troopSupplyCost !== reward.amount) {
          invalidSpecField("paid-reward-choice leader counter troopSupplyCost", reward.troopSupplyCost);
        }
        return;
      }
      unsupportedKind("paid-reward-choice reward", reward);
    };
    const validateReward = (reward: typeof option.reward) => {
      if (reward.kind === "bundle") {
        if (!Array.isArray(reward.rewards) || reward.rewards.length === 0) {
          invalidSpecField("paid-reward-choice bundle rewards", reward.rewards);
        }
        reward.rewards.forEach((nestedReward) => validateAtomicReward(nestedReward));
        return;
      }
      validateAtomicReward(reward);
    };
    validateReward(option.reward);
  });
}

export function validatePendingActionChoiceEffect(effect: PendingActionChoiceEffect, trigger: GameEffectTrigger) {
  if (trigger !== "agent-play" && trigger !== "reveal") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  const selector = (effect as { selector?: unknown }).selector;
  if (selector !== "self") {
    throw new Error(`Unsupported effect selector "${String(selector)}" for ${effect.kind}`);
  }
  validateSourceLabel("pending-action-choice source", effect.source);
  validateOptionalBoolean("pending-action-choice optional", effect.optional);
  if (!Array.isArray(effect.options) || effect.options.length === 0) {
    invalidSpecField("pending-action-choice options", effect.options);
  }
  const optionIds = new Set<string>();
  effect.options.forEach((option) => {
    if (typeof option.id !== "string" || option.id.trim().length === 0) {
      invalidSpecField("pending-action-choice option id", option.id);
    }
    if (optionIds.has(option.id)) {
      invalidSpecField("pending-action-choice duplicate option id", option.id);
    }
    optionIds.add(option.id);
    if (typeof option.label !== "string" || option.label.trim().length === 0) {
      invalidSpecField("pending-action-choice option label", option.label);
    }
    option.conditions?.forEach((condition) => validateCondition(condition, trigger));
    const nestedSelector = (option.effect as { selector?: unknown }).selector;
    if (nestedSelector !== "self") {
      throw new Error(`Unsupported pending-action-choice selector "${String(nestedSelector)}"`);
    }
    if (option.effect.kind === "acquire-card") {
      if (!supportedAcquireDestinations.has(option.effect.destination)) {
        invalidSpecField("pending-action-choice acquire destination", option.effect.destination);
      }
      if (option.effect.paymentResource !== undefined && !supportedResources.has(option.effect.paymentResource)) {
        throw new Error(`Unsupported effect resource "${option.effect.paymentResource}"`);
      }
      if (option.effect.minCost !== undefined) validateAmount(option.effect.minCost);
      if (option.effect.maxCost !== undefined) validateAmount(option.effect.maxCost);
      if (
        typeof option.effect.minCost === "number" &&
        typeof option.effect.maxCost === "number" &&
        option.effect.minCost > option.effect.maxCost
      ) {
        invalidSpecField("pending-action-choice acquire cost bounds", `${option.effect.minCost}-${option.effect.maxCost}`);
      }
      if (option.effect.maxCost === undefined && option.effect.paymentResource === undefined) {
        throw new Error("Invalid pending-action-choice acquire constraint: expected maxCost or paymentResource");
      }
      validateOptionalBoolean("pending-action-choice acquire optional", (option.effect as { optional?: unknown }).optional);
      validateSourceLabel("pending-action-choice acquire source", option.effect.source);
      return;
    }
    if (option.effect.kind === "trash-card") {
      validateOptionalBoolean("pending-action-choice trash optional", (option.effect as { optional?: unknown }).optional);
      if (option.effect.zones?.some((zone) => !supportedTrashZones.has(zone))) {
        throw new Error(`Unsupported trash-card zone "${option.effect.zones.find((zone) => !supportedTrashZones.has(zone))}"`);
      }
      if (
        option.effect.requiredTrait !== undefined &&
        (typeof option.effect.requiredTrait !== "string" || option.effect.requiredTrait.trim().length === 0)
      ) {
        invalidSpecField("pending-action-choice trash requiredTrait", option.effect.requiredTrait);
      }
      if (option.effect.sourceOnly !== undefined && option.effect.sourceOnly !== true) {
        invalidSpecField("pending-action-choice trash sourceOnly", option.effect.sourceOnly);
      }
      const sourceOnly = option.effect.sourceOnly === true;
      if (sourceOnly) {
        if (trigger !== "reveal") {
          throw new Error(`Unsupported pending-action-choice trash sourceOnly for ${trigger}`);
        }
        if (!option.effect.zones || option.effect.zones.length !== 1 || option.effect.zones[0] !== "playArea") {
          invalidSpecField("pending-action-choice source trash zones", option.effect.zones);
        }
        if (option.effect.excludeSource !== undefined) {
          invalidSpecField("pending-action-choice source trash excludeSource", option.effect.excludeSource);
        }
        if (option.effect.requiredTrait !== undefined) {
          invalidSpecField("pending-action-choice source trash requiredTrait", option.effect.requiredTrait);
        }
        if (option.effect.spiceRewardCostThreshold !== undefined) {
          throw new Error("Unsupported pending-action-choice source trash spiceRewardCostThreshold");
        }
        if (option.effect.spiceReward !== undefined) {
          throw new Error("Unsupported pending-action-choice source trash spiceReward");
        }
        if (option.effect.vpReward === undefined) {
          invalidSpecField("pending-action-choice source trash vpReward", option.effect.vpReward);
        }
        validatePositiveAmount("pending-action-choice source trash VP", option.effect.vpReward);
      } else if ((option.effect as { vpReward?: unknown }).vpReward !== undefined) {
        throw new Error("Unsupported pending-action-choice trash vpReward");
      }
      if (option.effect.spiceRewardCostThreshold !== undefined) validateAmount(option.effect.spiceRewardCostThreshold);
      if (option.effect.spiceReward !== undefined) validateAmount(option.effect.spiceReward);
      if (option.effect.persuasionCost !== undefined) validateAmount(option.effect.persuasionCost);
      if (option.effect.resourceCost !== undefined) {
        for (const [resource, amount] of Object.entries(option.effect.resourceCost)) {
          if (!supportedResources.has(resource as ResourceId)) {
            throw new Error(`Unsupported effect resource "${resource}"`);
          }
          validateAmount(amount);
        }
      }
      validateSourceLabel("pending-action-choice trash source", option.effect.source);
      return;
    }
    if (option.effect.kind === "gain-persuasion") {
      if (trigger !== "reveal") {
        throw new Error(`Unsupported pending-action-choice gain-persuasion for ${trigger}`);
      }
      validatePositiveAmount("pending-action-choice persuasion", option.effect.amount);
      validateSourceLabel("pending-action-choice persuasion source", option.effect.source);
      return;
    }
    if (option.effect.kind === "gain-resource") {
      if (trigger !== "reveal") {
        throw new Error(`Unsupported pending-action-choice gain-resource for ${trigger}`);
      }
      if (!supportedResources.has(option.effect.resource)) {
        throw new Error(`Unsupported effect resource "${option.effect.resource}"`);
      }
      validatePositiveAmount("pending-action-choice resource", option.effect.amount);
      validateSourceLabel("pending-action-choice resource source", option.effect.source);
      return;
    }
    if (option.effect.kind === "gain-strength") {
      if (trigger !== "reveal") {
        throw new Error(`Unsupported pending-action-choice gain-strength for ${trigger}`);
      }
      validatePositiveAmount("pending-action-choice strength", option.effect.amount);
      validateSourceLabel("pending-action-choice strength source", option.effect.source);
      return;
    }
    if (option.effect.kind === "place-spies") {
      if (trigger !== "reveal") {
        throw new Error(`Unsupported pending-action-choice place-spies for ${trigger}`);
      }
      validatePositiveAmount("pending-action-choice place-spies amount", option.effect.amount);
      validateOptionalBoolean("pending-action-choice place-spies recallForSupply", option.effect.recallForSupply);
      validateOptionalBoolean("pending-action-choice place-spies mustPlace", option.effect.mustPlace);
      validateOptionalBoolean("pending-action-choice place-spies allowSharedPost", option.effect.allowSharedPost);
      if (option.effect.placementIcon !== undefined && !supportedIcons.has(option.effect.placementIcon)) {
        throw new Error(`Unsupported effect icon "${option.effect.placementIcon}"`);
      }
      if (option.effect.placementIcons !== undefined) {
        if (!Array.isArray(option.effect.placementIcons) || option.effect.placementIcons.length === 0) {
          invalidSpecField("pending-action-choice place-spies placementIcons", option.effect.placementIcons);
        }
        const unsupportedIcon = option.effect.placementIcons.find((icon) => !supportedIcons.has(icon));
        if (unsupportedIcon) throw new Error(`Unsupported effect icon "${unsupportedIcon}"`);
      }
      if (
        option.effect.postPlacementAction !== undefined &&
        option.effect.postPlacementAction !== "staban-unseen-network"
      ) {
        invalidSpecField("pending-action-choice place-spies postPlacementAction", option.effect.postPlacementAction);
      }
      validateSourceLabel("pending-action-choice place-spies source", option.effect.source);
      return;
    }
    unsupportedKind("pending-action-choice effect", option.effect);
  });
}

export function validateLeaderTransitionChoiceEffect(effect: LeaderTransitionChoiceEffect, trigger: GameEffectTrigger) {
  if (trigger !== "agent-placement") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (typeof effect.fromLeader !== "string" || effect.fromLeader.trim().length === 0) {
    invalidSpecField("leader-transition-choice fromLeader", effect.fromLeader);
  }
  if (typeof effect.toLeader !== "string" || effect.toLeader.trim().length === 0) {
    invalidSpecField("leader-transition-choice toLeader", effect.toLeader);
  }
  if (effect.fromLeader === effect.toLeader) {
    invalidSpecField("leader-transition-choice toLeader", effect.toLeader);
  }
  if (effect.counter !== "jessicaMemories") {
    invalidSpecField("leader-transition-choice counter", effect.counter);
  }
  if (effect.counterAmount !== "all") {
    invalidSpecField("leader-transition-choice counterAmount", effect.counterAmount);
  }
  validatePositiveAmount("leader-transition-choice drawCardsPerCounter", effect.drawCardsPerCounter);
  validateSourceLabel("leader-transition-choice source", effect.source);
  if (effect.followUp !== undefined) {
    if (effect.followUp.kind !== "repeat-board-space") {
      unsupportedKind("leader-transition-choice followUp", effect.followUp);
    }
    if (effect.followUp.sameSpace !== true) {
      invalidSpecField("leader-transition-choice followUp sameSpace", effect.followUp.sameSpace);
    }
    if (effect.followUp.ability !== "reverend-mother-jessica") {
      invalidSpecField("leader-transition-choice followUp ability", effect.followUp.ability);
    }
    validateSourceLabel("leader-transition-choice followUp source", effect.followUp.source);
    if (!supportedResources.has(effect.followUp.resource)) {
      throw new Error(`Unsupported effect resource "${effect.followUp.resource}"`);
    }
    validatePositiveAmount("leader-transition-choice followUp cost", effect.followUp.cost);
  }
}
