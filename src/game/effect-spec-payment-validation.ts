import type {
  GameEffectSpec,
  GameEffectTrigger,
} from "./types";
import {
  invalidSpecField,
  supportedFactions,
  supportedResources,
  validateAmount,
  validateOptionalBoolean,
  validateOptionalTrue,
  validatePositiveAmount,
  validateSourceLabel,
} from "./effect-spec-validation-utils";

export function validatePaymentEffect(effect: GameEffectSpec, trigger: GameEffectTrigger) {
  if (effect.kind === "pay-resource-for-strength") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("pay-resource-for-strength source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.strength);
    validateOptionalTrue("pay-resource-for-strength optional", (effect as { optional?: unknown }).optional);
    return true;
  }
  if (effect.kind === "pay-resource-for-troops") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    const recipient = (effect as { recipient?: unknown }).recipient;
    if (recipient !== "same-team-allies") {
      invalidSpecField("pay-resource-for-troops recipient", recipient);
    }
    const destination = (effect as { destination?: unknown }).destination;
    if (destination !== "garrison") {
      invalidSpecField("pay-resource-for-troops destination", destination);
    }
    validateSourceLabel("pay-resource-for-troops source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.troops);
    validateOptionalTrue("pay-resource-for-troops optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("pay-resource-for-troops trashSource", (effect as { trashSource?: unknown }).trashSource);
    return true;
  }
  if (effect.kind === "pay-resource-for-draw-cards") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("pay-resource-for-draw-cards source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.drawCards);
    validateOptionalTrue("pay-resource-for-draw-cards optional", (effect as { optional?: unknown }).optional);
    return true;
  }
  if (effect.kind === "pay-resource-for-influence") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    if (effect.faction !== "board-space" && !supportedFactions.has(effect.faction)) {
      throw new Error(`Unsupported effect faction "${effect.faction}"`);
    }
    const recipient = (effect as { recipient?: unknown }).recipient;
    if (recipient !== "board-effect-recipient") {
      invalidSpecField("pay-resource-for-influence recipient", recipient);
    }
    validateSourceLabel("pay-resource-for-influence source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.amount);
    validateOptionalTrue("pay-resource-for-influence optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("pay-resource-for-influence trashSource", (effect as { trashSource?: unknown }).trashSource);
    return true;
  }
  if (effect.kind === "pay-resource-for-sandworms") {
    if (trigger !== "agent-play" && trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    const recipient = (effect as { recipient?: unknown }).recipient;
    if (
      trigger === "agent-play" &&
      recipient !== "activated-ally" &&
      recipient !== "self-or-activated-ally"
    ) {
      invalidSpecField("pay-resource-for-sandworms recipient", recipient);
    }
    if (trigger === "reveal" && recipient !== "combat-recipient") {
      invalidSpecField("pay-resource-for-sandworms recipient", recipient);
    }
    const destination = (effect as { destination?: unknown }).destination;
    if (destination !== "conflict") {
      invalidSpecField("pay-resource-for-sandworms destination", destination);
    }
    validateSourceLabel("pay-resource-for-sandworms source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.sandworms);
    if (trigger === "agent-play" && effect.persuasionCost !== undefined) {
      invalidSpecField("pay-resource-for-sandworms persuasionCost", effect.persuasionCost);
    }
    if (effect.persuasionCost !== undefined) validateAmount(effect.persuasionCost);
    validateOptionalTrue("pay-resource-for-sandworms optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("pay-resource-for-sandworms trashSource", (effect as { trashSource?: unknown }).trashSource);
    return true;
  }
  if (effect.kind === "pay-resource-for-high-council-seat") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("pay-resource-for-high-council-seat source", effect.source);
    validatePositiveAmount("pay-resource-for-high-council-seat cost", effect.cost);
    if (effect.persuasionCost !== undefined) {
      validateAmount(effect.persuasionCost);
    }
    if (effect.persuasionReward !== undefined) {
      validateAmount(effect.persuasionReward);
    }
    validateOptionalTrue("pay-resource-for-high-council-seat optional", (effect as { optional?: unknown }).optional);
    return true;
  }
  if (effect.kind === "pay-resource-for-contracts") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    const recipient = (effect as { recipient?: unknown }).recipient;
    if (recipient !== "same-team-allies") {
      invalidSpecField("pay-resource-for-contracts recipient", recipient);
    }
    const sourcePool = (effect as { sourcePool?: unknown }).sourcePool;
    if (sourcePool !== "public-offer") {
      invalidSpecField("pay-resource-for-contracts sourcePool", sourcePool);
    }
    validateSourceLabel("pay-resource-for-contracts source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.contractCount);
    validateOptionalTrue("pay-resource-for-contracts optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("pay-resource-for-contracts trashSource", (effect as { trashSource?: unknown }).trashSource);
    return true;
  }
  if (effect.kind === "pay-team-resource-for-vp") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    const contributors = (effect as { contributors?: unknown }).contributors;
    if (contributors !== "self-and-same-team-allies") {
      invalidSpecField("pay-team-resource-for-vp contributors", contributors);
    }
    const recipient = (effect as { recipient?: unknown }).recipient;
    if (recipient !== "self") {
      invalidSpecField("pay-team-resource-for-vp recipient", recipient);
    }
    validateSourceLabel("pay-team-resource-for-vp source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.vp);
    validateOptionalTrue("pay-team-resource-for-vp optional", (effect as { optional?: unknown }).optional);
    validateOptionalBoolean("pay-team-resource-for-vp trashSource", (effect as { trashSource?: unknown }).trashSource);
    return true;
  }
  return false;
}
