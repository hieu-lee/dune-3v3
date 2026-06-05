import type {
  CardEffectSpec,
  CommanderResourceSplitOption,
  EffectAmountSpec,
  GameEffectSpec,
  GameEffectTrigger,
  ResourceId,
} from "./types";
import {
  validateLeaderTransitionChoiceEffect,
  validatePaidRewardChoiceEffect,
  validatePendingActionChoiceEffect,
} from "./effect-spec-choice-validation";
import {
  validatePaymentEffect,
} from "./effect-spec-payment-validation";
import {
  validateCondition,
  validateTrigger,
} from "./effect-spec-condition-validation";
import {
  invalidSpecField,
  supportedAcquireDestinations,
  supportedFactions,
  supportedIcons,
  supportedResources,
  supportedTradeGoods,
  supportedTrashZones,
  unsupportedKind,
  validateAmount,
  validateFixedAmount,
  validateOptionalBoolean,
  validateOptionalTrue,
  validatePositiveAmount,
  validatePositiveFixedAmount,
  validateRetreatBound,
  validateSourceLabel,
} from "./effect-spec-validation-utils";

function validateResourceAmountMap(
  label: string,
  gain: Partial<Record<ResourceId, EffectAmountSpec>> | undefined,
) {
  if (gain === undefined) return false;
  if (typeof gain !== "object" || gain === null || Array.isArray(gain)) {
    invalidSpecField(label, gain);
  }
  let hasReward = false;
  for (const [resource, amount] of Object.entries(gain) as [ResourceId, EffectAmountSpec][]) {
    if (!supportedResources.has(resource)) {
      throw new Error(`Unsupported effect resource "${resource}"`);
    }
    validatePositiveAmount(`${label} ${resource}`, amount);
    hasReward = true;
  }
  return hasReward;
}

function validateEffect(effect: GameEffectSpec, trigger: GameEffectTrigger) {
  if (effect.selector !== "self" && effect.selector !== "activated-ally") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
  }
  if (
    effect.selector === "activated-ally" &&
    trigger !== "agent-play" &&
    !(
      trigger === "plot-intrigue" &&
      (
        effect.kind === "recruit-troops" ||
        effect.kind === "deploy-troops" ||
        effect.kind === "summon-sandworms" ||
        effect.kind === "gain-influence" ||
        effect.kind === "lose-influence"
      )
    )
  ) {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${trigger}`);
  }
  if (
    trigger === "acquire" &&
    effect.kind !== "gain-resource" &&
    effect.kind !== "gain-vp" &&
    effect.kind !== "place-spies" &&
    effect.kind !== "draw-intrigues" &&
    effect.kind !== "gain-influence" &&
    effect.kind !== "gain-influence-choice" &&
    effect.kind !== "take-contracts"
  ) {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (trigger === "agent-placement" && effect.kind !== "leader-transition-choice") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (trigger === "discard" && effect.kind !== "gain-resource") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (trigger === "trash" && effect.kind !== "draw-intrigues") {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (effect.kind === "gain-resource") {
    if (
      trigger !== "agent-play" &&
      trigger !== "reveal" &&
      trigger !== "acquire" &&
      trigger !== "discard" &&
      trigger !== "plot-intrigue" &&
      trigger !== "combat-intrigue"
    ) {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("gain-resource source", effect.source);
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "spend-resource") {
    if (trigger !== "plot-intrigue" && trigger !== "combat-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    const selector = (effect as { selector?: unknown }).selector;
    if (selector !== "self") {
      throw new Error(`Unsupported effect selector "${selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("spend-resource source", effect.source);
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "lose-influence") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (!supportedFactions.has(effect.faction)) {
      throw new Error(`Unsupported effect faction "${effect.faction}"`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-influence") {
    if (trigger !== "plot-intrigue" && trigger !== "reveal" && trigger !== "acquire") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (!supportedFactions.has(effect.faction)) {
      throw new Error(`Unsupported effect faction "${effect.faction}"`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-influence-for-spied-factions") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validatePositiveAmount("gain-influence-for-spied-factions amount", effect.amount);
    return;
  }
  if (effect.kind === "gain-vp") {
    if (trigger !== "agent-play" && trigger !== "acquire" && trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-persuasion" || effect.kind === "gain-strength") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "draw-cards") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("draw-cards source", effect.source);
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "draw-intrigues") {
    if (trigger !== "agent-play" && trigger !== "reveal" && trigger !== "acquire" && trigger !== "plot-intrigue" && trigger !== "trash") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "discard-card") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    validateOptionalBoolean("discard-card optional", (effect as { optional?: unknown }).optional);
    validateSourceLabel("discard-card source", effect.source);
    return;
  }
  if (effect.kind === "activate-acquire-recruit-bonus") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (effect.amount !== 1) {
      invalidSpecField("activate-acquire-recruit-bonus amount", effect.amount);
    }
    return;
  }
  if (effect.kind === "remove-shield-wall") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateSourceLabel("remove-shield-wall source", effect.source);
    return;
  }
  if (effect.kind === "gain-influence-choice") {
    if (trigger !== "agent-play" && trigger !== "acquire") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    validateOptionalBoolean("gain-influence-choice trashSource", (effect as { trashSource?: unknown }).trashSource);
    if (trigger === "acquire" && effect.trashSource === true) {
      invalidSpecField("acquire gain-influence-choice trashSource", effect.trashSource);
    }
    validateSourceLabel("gain-influence-choice source", effect.source);
    return;
  }
  if (effect.kind === "gain-board-space-influence") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    const selector = (effect as { selector?: unknown }).selector;
    if (selector !== "self") {
      throw new Error(`Unsupported effect selector "${selector}" for gain-board-space-influence`);
    }
    validatePositiveAmount("gain-board-space-influence amount", effect.amount);
    validateOptionalBoolean("gain-board-space-influence trashSource", effect.trashSource);
    if (
      effect.requiredHandTrashTrait !== undefined &&
      (typeof effect.requiredHandTrashTrait !== "string" || effect.requiredHandTrashTrait.trim().length === 0)
    ) {
      invalidSpecField("gain-board-space-influence requiredHandTrashTrait", effect.requiredHandTrashTrait);
    }
    validateSourceLabel("gain-board-space-influence source", effect.source);
    return;
  }
  if (effect.kind === "paid-reward-choice") {
    validatePaidRewardChoiceEffect(effect, trigger);
    return;
  }
  if (effect.kind === "pending-action-choice") {
    validatePendingActionChoiceEffect(effect, trigger);
    return;
  }
  if (effect.kind === "leader-transition-choice") {
    validateLeaderTransitionChoiceEffect(effect, trigger);
    return;
  }
  if (effect.kind === "acquire-card") {
    if (trigger !== "agent-play" && trigger !== "plot-intrigue" && trigger !== "combat-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedAcquireDestinations.has(effect.destination)) {
      invalidSpecField("acquire-card destination", effect.destination);
    }
    if (effect.paymentResource !== undefined && !supportedResources.has(effect.paymentResource)) {
      throw new Error(`Unsupported effect resource "${effect.paymentResource}"`);
    }
    if (effect.minCost !== undefined) validateAmount(effect.minCost);
    if (effect.maxCost !== undefined) validateAmount(effect.maxCost);
    if (
      typeof effect.minCost === "number" &&
      typeof effect.maxCost === "number" &&
      effect.minCost > effect.maxCost
    ) {
      invalidSpecField("acquire-card cost bounds", `${effect.minCost}-${effect.maxCost}`);
    }
    if (effect.maxCost === undefined && effect.paymentResource === undefined) {
      throw new Error("Invalid acquire-card constraint: expected maxCost or paymentResource");
    }
    validateOptionalBoolean("acquire-card optional", (effect as { optional?: unknown }).optional);
    validateSourceLabel("acquire-card source", effect.source);
    return;
  }
  if (effect.kind === "recruit-troops") {
    validateSourceLabel("recruit-troops source", effect.source);
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "deploy-recruited-troops") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("deploy-recruited-troops source", effect.source);
    return;
  }
  if (effect.kind === "deploy-troops") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self" && effect.selector !== "activated-ally") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveFixedAmount("deploy-troops max", effect.max);
    validateSourceLabel("deploy-troops source", effect.source);
    return;
  }
  if (effect.kind === "summon-sandworms") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self" && effect.selector !== "activated-ally") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveFixedAmount("summon-sandworms amount", effect.amount);
    validateSourceLabel("summon-sandworms source", effect.source);
    return;
  }
  if (effect.kind === "retreat-troops-for-strength") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    validateAmount(effect.strength);
    return;
  }
  if (effect.kind === "deploy-or-retreat-troops") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveAmount("deploy-or-retreat-troops amount", effect.amount);
    validateOptionalBoolean("deploy-or-retreat-troops optional", (effect as { optional?: unknown }).optional);
    validateSourceLabel("deploy-or-retreat-troops source", effect.source);
    return;
  }
  if (effect.kind === "retreat-troops") {
    if (trigger !== "combat-intrigue" && trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveFixedAmount("retreat-troops min", effect.min);
    validateRetreatBound("retreat-troops max", effect.max);
    if (typeof effect.max === "number" && effect.min > effect.max) {
      invalidSpecField("retreat-troops bounds", `${effect.min}-${effect.max}`);
    }
    validateOptionalBoolean("retreat-troops optional", effect.optional);
    validateSourceLabel("retreat-troops source", effect.source);
    return;
  }
  if (effect.kind === "trash-card") {
    if (trigger !== "reveal" && trigger !== "plot-intrigue" && trigger !== "combat-intrigue" && trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateOptionalBoolean("trash-card optional", (effect as { optional?: unknown }).optional);
    if (effect.zones?.some((zone) => !supportedTrashZones.has(zone))) {
      throw new Error(`Unsupported trash-card zone "${effect.zones.find((zone) => !supportedTrashZones.has(zone))}"`);
    }
    if (effect.sourceOnly !== undefined && effect.sourceOnly !== true) {
      invalidSpecField("trash-card sourceOnly", effect.sourceOnly);
    }
    if (trigger === "agent-play") {
      const sourceOnly = effect.sourceOnly === true;
      if (effect.excludeSource !== undefined) {
        invalidSpecField("trash-card excludeSource", effect.excludeSource);
      }
      if (sourceOnly) {
        if (!effect.zones || effect.zones.length !== 1 || effect.zones[0] !== "playArea") {
          invalidSpecField("agent source trash-card zones", effect.zones);
        }
      }
      if (effect.requiredTrait !== undefined) {
        if (sourceOnly) {
          throw new Error(`Unsupported trash-card requiredTrait for ${trigger} sourceOnly`);
        }
        if (typeof effect.requiredTrait !== "string" || effect.requiredTrait.trim().length === 0) {
          invalidSpecField("trash-card requiredTrait", effect.requiredTrait);
        }
      }
      if (effect.strengthReward !== undefined) {
        throw new Error(`Unsupported trash-card strengthReward for ${trigger}`);
      }
      if (effect.spiceRewardCostThreshold !== undefined) {
        throw new Error(`Unsupported trash-card spiceRewardCostThreshold for ${trigger}`);
      }
      if (effect.spiceReward !== undefined) {
        throw new Error(`Unsupported trash-card spiceReward for ${trigger}`);
      }
      if (effect.drawCardsReward !== undefined) {
        if (!sourceOnly) {
          throw new Error(`Unsupported trash-card drawCardsReward for ${trigger} without sourceOnly`);
        }
        validateAmount(effect.drawCardsReward);
      }
      if (effect.vpReward !== undefined) {
        throw new Error(`Unsupported trash-card vpReward for ${trigger}`);
      }
      if (effect.persuasionCost !== undefined) {
        throw new Error(`Unsupported trash-card persuasionCost for ${trigger}`);
      }
      if (effect.resourceCost !== undefined) {
        throw new Error(`Unsupported trash-card resourceCost for ${trigger}`);
      }
      return;
    }
    const revealSourceOnly = trigger === "reveal" && effect.sourceOnly === true;
    if (effect.sourceOnly !== undefined && !revealSourceOnly) {
      throw new Error(`Unsupported trash-card sourceOnly for ${trigger}`);
    }
    if (effect.drawCardsReward !== undefined) {
      throw new Error(`Unsupported trash-card drawCardsReward for ${trigger}`);
    }
    if (effect.vpReward !== undefined && !revealSourceOnly) {
      throw new Error(`Unsupported trash-card vpReward for ${trigger}`);
    }
    if (revealSourceOnly) {
      if (!effect.zones || effect.zones.length !== 1 || effect.zones[0] !== "playArea") {
        invalidSpecField("reveal source trash-card zones", effect.zones);
      }
      if (effect.excludeSource !== undefined) {
        invalidSpecField("trash-card excludeSource", effect.excludeSource);
      }
      if (effect.requiredTrait !== undefined) {
        invalidSpecField("trash-card requiredTrait", effect.requiredTrait);
      }
      if (effect.strengthReward !== undefined) {
        throw new Error(`Unsupported trash-card strengthReward for ${trigger} sourceOnly`);
      }
      if (effect.spiceRewardCostThreshold !== undefined) {
        throw new Error(`Unsupported trash-card spiceRewardCostThreshold for ${trigger} sourceOnly`);
      }
      if (effect.spiceReward !== undefined) {
        throw new Error(`Unsupported trash-card spiceReward for ${trigger} sourceOnly`);
      }
      if (effect.vpReward === undefined) {
        invalidSpecField("trash-card vpReward", effect.vpReward);
      }
      validatePositiveAmount("trash-card vpReward", effect.vpReward);
      if (effect.persuasionCost !== undefined) validatePositiveAmount("trash-card persuasionCost", effect.persuasionCost);
      validateResourceAmountMap("trash-card resourceCost", effect.resourceCost);
      return;
    }
    if (trigger === "combat-intrigue" && effect.optional !== true) {
      invalidSpecField("combat trash-card optional", effect.optional);
    }
    if (
      effect.requiredTrait !== undefined &&
      (typeof effect.requiredTrait !== "string" || effect.requiredTrait.trim().length === 0)
    ) {
      invalidSpecField("trash-card requiredTrait", effect.requiredTrait);
    }
    if (trigger === "plot-intrigue" || trigger === "combat-intrigue") {
      if (effect.strengthReward !== undefined) {
        throw new Error(`Unsupported trash-card strengthReward for ${trigger}`);
      }
      if (effect.spiceRewardCostThreshold !== undefined) {
        throw new Error(`Unsupported trash-card spiceRewardCostThreshold for ${trigger}`);
      }
      if (effect.spiceReward !== undefined) {
        throw new Error(`Unsupported trash-card spiceReward for ${trigger}`);
      }
    }
    if (effect.strengthReward !== undefined) validateAmount(effect.strengthReward);
    if (effect.spiceRewardCostThreshold !== undefined) validateAmount(effect.spiceRewardCostThreshold);
    if (effect.spiceReward !== undefined) validateAmount(effect.spiceReward);
    if (effect.persuasionCost !== undefined) {
      throw new Error(`Unsupported trash-card persuasionCost for ${trigger}`);
    }
    if (effect.resourceCost !== undefined) {
      throw new Error(`Unsupported trash-card resourceCost for ${trigger}`);
    }
    return;
  }
  if (effect.kind === "lose-influence-for-intrigues") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "lose-influence-for-influence") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveAmount("lose-influence-for-influence loseAmount", effect.loseAmount);
    validatePositiveAmount("lose-influence-for-influence gainAmount", effect.gainAmount);
    validateOptionalBoolean("lose-influence-for-influence optional", (effect as { optional?: unknown }).optional);
    return;
  }
  if (effect.kind === "lose-influence-for-strength") {
    if (trigger !== "combat-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (effect.amount !== 1) {
      invalidSpecField("lose-influence-for-strength amount", effect.amount);
    }
    if (effect.owner !== "combat-recipient") {
      invalidSpecField("lose-influence-for-strength owner", effect.owner);
    }
    if (
      effect.alternateOwner !== undefined &&
      effect.alternateOwner !== "source-commander-personal"
    ) {
      invalidSpecField("lose-influence-for-strength alternateOwner", effect.alternateOwner);
    }
    validatePositiveAmount("lose-influence-for-strength strengthReward", effect.strengthReward);
    const optional = (effect as { optional?: unknown }).optional;
    if (optional !== true) {
      invalidSpecField("lose-influence-for-strength optional", optional);
    }
    validateSourceLabel("lose-influence-for-strength source", effect.source);
    return;
  }
  if (effect.kind === "discard-card-for-influence-and-draw") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.drawCards);
    validateAmount(effect.influenceAmount);
    return;
  }
  if (effect.kind === "discard-card-for-draw") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.drawCards);
    if (effect.drawIntrigues !== undefined) validateAmount(effect.drawIntrigues);
    validateOptionalBoolean("discard-card-for-draw optional", (effect as { optional?: unknown }).optional);
    if (effect.bonusDraw !== undefined) {
      if (
        typeof effect.bonusDraw.requiredDiscardTrait !== "string" ||
        effect.bonusDraw.requiredDiscardTrait.trim().length === 0
      ) {
        invalidSpecField("discard-card-for-draw bonusDraw requiredDiscardTrait", effect.bonusDraw.requiredDiscardTrait);
      }
      validateAmount(effect.bonusDraw.drawCards);
    }
    if (effect.bonusIntrigues !== undefined) {
      if (
        typeof effect.bonusIntrigues.requiredDiscardTrait !== "string" ||
        effect.bonusIntrigues.requiredDiscardTrait.trim().length === 0
      ) {
        invalidSpecField(
          "discard-card-for-draw bonusIntrigues requiredDiscardTrait",
          effect.bonusIntrigues.requiredDiscardTrait,
        );
      }
      validateAmount(effect.bonusIntrigues.amount);
    }
    return;
  }
  if (effect.kind === "discard-cards-for-reward") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveAmount("discard-cards-for-reward amount", effect.amount);
    validateResourceAmountMap("discard-cards-for-reward cost", effect.cost);
    const hasResourceReward = validateResourceAmountMap("discard-cards-for-reward gain", effect.gain);
    if (effect.gainVp !== undefined) validatePositiveAmount("discard-cards-for-reward gainVp", effect.gainVp);
    let hasContractReward = false;
    if (effect.takeContracts !== undefined) {
      validatePositiveAmount("discard-cards-for-reward takeContracts amount", effect.takeContracts.amount);
      if (effect.takeContracts.amount !== 1) {
        invalidSpecField("discard-cards-for-reward takeContracts amount", effect.takeContracts.amount);
      }
      if (effect.takeContracts.sourcePool !== "public-offer") {
        invalidSpecField("discard-cards-for-reward takeContracts sourcePool", effect.takeContracts.sourcePool);
      }
      hasContractReward = true;
    }
    if (!hasResourceReward && effect.gainVp === undefined && !hasContractReward) {
      invalidSpecField("discard-cards-for-reward reward", undefined);
    }
    validateOptionalBoolean("discard-cards-for-reward optional", (effect as { optional?: unknown }).optional);
    validateSourceLabel("discard-cards-for-reward source", effect.source);
    return;
  }
  if (effect.kind === "select-top-deck-cards") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validatePositiveAmount("select-top-deck-cards lookCards", effect.lookCards);
    validatePositiveAmount("select-top-deck-cards drawCards", effect.drawCards);
    validatePositiveAmount("select-top-deck-cards discardCards", effect.discardCards);
    validatePositiveAmount("select-top-deck-cards trashCards", effect.trashCards);
    if (effect.minimumDeckCards !== undefined) {
      validatePositiveAmount("select-top-deck-cards minimumDeckCards", effect.minimumDeckCards);
    }
    if (effect.lookCards !== 3) {
      invalidSpecField("select-top-deck-cards lookCards", effect.lookCards);
    }
    if (effect.drawCards !== 1) {
      invalidSpecField("select-top-deck-cards drawCards", effect.drawCards);
    }
    if (effect.discardCards !== 1) {
      invalidSpecField("select-top-deck-cards discardCards", effect.discardCards);
    }
    if (effect.trashCards !== 1) {
      invalidSpecField("select-top-deck-cards trashCards", effect.trashCards);
    }
    if (effect.minimumDeckCards !== undefined && effect.minimumDeckCards !== 3) {
      invalidSpecField("select-top-deck-cards minimumDeckCards", effect.minimumDeckCards);
    }
    if (
      typeof effect.lookCards === "number" &&
      typeof effect.drawCards === "number" &&
      typeof effect.discardCards === "number" &&
      typeof effect.trashCards === "number" &&
      effect.drawCards + effect.discardCards + effect.trashCards !== effect.lookCards
    ) {
      invalidSpecField(
        "select-top-deck-cards assignment count",
        `${effect.drawCards}+${effect.discardCards}+${effect.trashCards}/${effect.lookCards}`,
      );
    }
    validateSourceLabel("select-top-deck-cards source", effect.source);
    return;
  }
  if (effect.kind === "trash-intrigue-for-reward") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (effect.drawIntrigues !== undefined) {
      validatePositiveAmount("trash-intrigue-for-reward drawIntrigues", effect.drawIntrigues);
    }
    validateResourceAmountMap("trash-intrigue-for-reward cost", effect.cost);
    const hasResourceReward = validateResourceAmountMap("trash-intrigue-for-reward gain", effect.gain);
    if (effect.gainVp !== undefined) validatePositiveAmount("trash-intrigue-for-reward gainVp", effect.gainVp);
    if (effect.drawIntrigues === undefined && !hasResourceReward && effect.gainVp === undefined) {
      invalidSpecField("trash-intrigue-for-reward reward", undefined);
    }
    validateOptionalBoolean("trash-intrigue-for-reward optional", (effect as { optional?: unknown }).optional);
    validateSourceLabel("trash-intrigue-for-reward source", effect.source);
    return;
  }
  if (effect.kind === "opponents-discard-cards") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    validateSourceLabel("opponents-discard-cards source", effect.source);
    return;
  }
  if (effect.kind === "take-contracts") {
    if (
      trigger !== "agent-play" &&
      trigger !== "plot-intrigue" &&
      trigger !== "combat-intrigue" &&
      trigger !== "acquire"
    ) {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const sourcePool = (effect as { sourcePool?: unknown }).sourcePool;
    if (sourcePool !== "public-offer") {
      invalidSpecField("take-contracts sourcePool", sourcePool);
    }
    validateSourceLabel("take-contracts source", effect.source);
    if (effect.amount !== 1) {
      invalidSpecField("take-contracts amount", effect.amount);
    }
    validateOptionalTrue("take-contracts optional", (effect as { optional?: unknown }).optional);
    if ((trigger === "agent-play" || trigger === "combat-intrigue" || trigger === "acquire") && effect.optional === true) {
      const triggerLabel =
        trigger === "agent-play"
          ? "agent"
          : trigger === "combat-intrigue"
            ? "combat"
            : "acquire";
      invalidSpecField(`${triggerLabel} take-contracts optional`, effect.optional);
    }
    return;
  }
  if (validatePaymentEffect(effect, trigger)) return;
  if (effect.kind === "commander-resource-split") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("commander-resource-split source", effect.source);
    if (!Array.isArray(effect.options) || effect.options.length === 0) {
      invalidSpecField("commander-resource-split options", effect.options);
    }
    effect.options.forEach(validateCommanderResourceSplitOption);
    return;
  }
  if (effect.kind === "trash-source-for-trade") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const partner = (effect as { partner?: unknown }).partner;
    if (partner !== "same-team-allies") {
      invalidSpecField("trash-source-for-trade partner", partner);
    }
    if (!supportedTradeGoods.has(effect.resource)) {
      throw new Error(`Unsupported effect trade resource "${effect.resource}"`);
    }
    validateOptionalTrue("trash-source-for-trade optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("trash-source-for-trade partnerLocked", (effect as { partnerLocked?: unknown }).partnerLocked);
    validateSourceLabel("trash-source-for-trade source", effect.source);
    return;
  }
  if (effect.kind === "return-source-to-hand") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("return-source-to-hand source", effect.source);
    return;
  }
  if (effect.kind === "block-conflict-deployment") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("block-conflict-deployment source", effect.source);
    return;
  }
  if (effect.kind === "move-card-to-throne-row") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("move-card-to-throne-row source", effect.source);
    return;
  }
  if (effect.kind === "recall-agent") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("recall-agent source", effect.source);
    return;
  }
  if (effect.kind === "manipulate-row-card") {
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("manipulate-row-card source", effect.source);
    return;
  }
  if (effect.kind === "recall-spy") {
    if (trigger !== "plot-intrigue" && trigger !== "combat-intrigue" && trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateSourceLabel("recall-spy source", effect.source);
    if (trigger === "combat-intrigue") {
      const amount = effect.amount;
      const strengthReward = effect.strengthReward;
      if (amount === undefined) {
        invalidSpecField("recall-spy amount", amount);
      }
      if (strengthReward === undefined) {
        invalidSpecField("recall-spy strengthReward", strengthReward);
      }
      if (effect.reward !== undefined) {
        throw new Error(`Unsupported recall-spy reward for ${trigger}`);
      }
      if (effect.drawIntrigues !== undefined) {
        throw new Error(`Unsupported recall-spy drawIntrigues for ${trigger}`);
      }
      if (effect.removeShieldWall !== undefined) {
        throw new Error(`Unsupported recall-spy removeShieldWall for ${trigger}`);
      }
      validatePositiveFixedAmount("recall-spy amount", amount);
      validatePositiveAmount("recall-spy strengthReward", strengthReward);
      validateOptionalBoolean("recall-spy optional", effect.optional);
      return;
    }
    if (trigger === "reveal") {
      const amount = effect.amount;
      const drawIntrigues = effect.drawIntrigues;
      const strengthReward = effect.strengthReward;
      const persuasionReward = effect.persuasionReward;
      if (amount === undefined) {
        invalidSpecField("recall-spy amount", amount);
      }
      const rewardCount = [drawIntrigues, strengthReward, persuasionReward]
        .filter((reward) => reward !== undefined)
        .length;
      if (rewardCount !== 1) {
        invalidSpecField("recall-spy reveal reward", { drawIntrigues, strengthReward, persuasionReward });
      }
      if (effect.reward !== undefined) {
        throw new Error(`Unsupported recall-spy reward for ${trigger}`);
      }
      if (effect.removeShieldWall !== undefined) {
        throw new Error(`Unsupported recall-spy removeShieldWall for ${trigger}`);
      }
      validatePositiveFixedAmount("recall-spy amount", amount);
      if (drawIntrigues !== undefined) {
        validatePositiveAmount("recall-spy drawIntrigues", drawIntrigues);
      }
      if (strengthReward !== undefined) {
        validatePositiveAmount("recall-spy strengthReward", strengthReward);
      }
      if (persuasionReward !== undefined) {
        validatePositiveAmount("recall-spy persuasionReward", persuasionReward);
      }
      validateOptionalBoolean("recall-spy optional", effect.optional);
      return;
    }
    if (effect.amount !== undefined) {
      throw new Error(`Unsupported recall-spy amount for ${trigger}`);
    }
    if (effect.strengthReward !== undefined) {
      throw new Error(`Unsupported recall-spy strengthReward for ${trigger}`);
    }
    if (effect.drawIntrigues !== undefined) {
      throw new Error(`Unsupported recall-spy drawIntrigues for ${trigger}`);
    }
    if (effect.persuasionReward !== undefined) {
      throw new Error(`Unsupported recall-spy persuasionReward for ${trigger}`);
    }
    if (effect.optional !== undefined) {
      throw new Error(`Unsupported recall-spy optional for ${trigger}`);
    }
    if (effect.reward !== undefined) {
      if (!supportedResources.has(effect.reward.resource)) {
        throw new Error(`Unsupported effect resource "${effect.reward.resource}"`);
      }
      validateAmount(effect.reward.amount);
    }
    validateOptionalBoolean("recall-spy removeShieldWall", effect.removeShieldWall);
    return;
  }
  if (effect.kind === "place-spies") {
    if (
      trigger !== "agent-play" &&
      trigger !== "reveal" &&
      trigger !== "acquire" &&
      trigger !== "plot-intrigue" &&
      trigger !== "combat-intrigue"
    ) {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateSourceLabel("place-spies source", effect.source);
    if (effect.placementIcon !== undefined && !supportedIcons.has(effect.placementIcon)) {
      throw new Error(`Unsupported effect icon "${effect.placementIcon}"`);
    }
    if (effect.placementIcons !== undefined) {
      if (!Array.isArray(effect.placementIcons) || effect.placementIcons.length === 0) {
        invalidSpecField("place-spies placementIcons", effect.placementIcons);
      }
      const unsupportedIcon = effect.placementIcons.find((icon) => !supportedIcons.has(icon));
      if (unsupportedIcon) throw new Error(`Unsupported effect icon "${unsupportedIcon}"`);
    }
    validateOptionalBoolean("place-spies recallForSupply", effect.recallForSupply);
    validateOptionalBoolean("place-spies mustPlace", effect.mustPlace);
    validateOptionalBoolean("place-spies allowSharedPost", effect.allowSharedPost);
    if (
      effect.postPlacementAction !== undefined &&
      effect.postPlacementAction !== "staban-unseen-network"
    ) {
      invalidSpecField("place-spies postPlacementAction", effect.postPlacementAction);
    }
    validateAmount(effect.amount);
    return;
  }
  unsupportedKind("effect", effect);
}

function validateCommanderResourceSplitOption(option: CommanderResourceSplitOption) {
  if (!supportedResources.has(option.commanderResource)) {
    throw new Error(`Unsupported effect resource "${option.commanderResource}"`);
  }
  if (!supportedResources.has(option.allyResource)) {
    throw new Error(`Unsupported effect resource "${option.allyResource}"`);
  }
  validateFixedAmount("commander-resource-split commanderAmount", option.commanderAmount);
  validateFixedAmount("commander-resource-split allyAmount", option.allyAmount);
}

export function validateSpec(spec: CardEffectSpec) {
  validateTrigger(spec.trigger);
  validateSourceLabel("choiceId", spec.choiceId);
  if (spec.choiceId !== undefined && spec.trigger !== "plot-intrigue" && spec.trigger !== "combat-intrigue") {
    throw new Error(`Unsupported choiceId for ${spec.trigger}`);
  }
  spec.conditions?.forEach((condition) => validateCondition(condition, spec.trigger));
  spec.effects.forEach((effect) => validateEffect(effect, spec.trigger));
}
