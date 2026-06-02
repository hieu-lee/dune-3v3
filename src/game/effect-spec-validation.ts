import type {
  CardEffectSpec,
  CommanderResourceSplitOption,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  GameEffectTrigger,
  IconId,
  ResourceId,
  Role,
  TeamId,
  TradeGoodId,
  TrashCardZone,
} from "./types";

const supportedTriggers = new Set<GameEffectTrigger>([
  "agent-play",
  "reveal",
  "acquire",
  "plot-intrigue",
  "combat-intrigue",
  "conflict-reward",
  "endgame",
  "round-start",
  "round-end",
]);

const supportedResources = new Set<ResourceId>(["solari", "spice", "water"]);
const supportedTradeGoods = new Set<TradeGoodId>(["solari", "spice", "water", "intrigue"]);
const supportedIcons = new Set<IconId>(["emperor", "spacing", "bene", "fremen", "landsraad", "city", "spice", "spy"]);
const supportedAcquireDestinations = new Set(["discard", "hand"]);
const supportedTrashZones = new Set<TrashCardZone>(["hand", "discard", "playArea"]);
const supportedFactions = new Set<FactionId>([
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
]);
const supportedTeams = new Set<TeamId>(["muaddib", "shaddam"]);
const supportedRoles = new Set<Role>(["Commander", "Ally"]);

function unsupportedKind(label: string, value: unknown): never {
  const kind = typeof value === "object" && value !== null && "kind" in value
    ? String((value as { kind?: unknown }).kind)
    : String(value);
  throw new Error(`Unsupported ${label} "${kind}"`);
}

function invalidSpecField(label: string, value: unknown): never {
  throw new Error(`Invalid ${label} "${String(value)}"`);
}

function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validateTrigger(trigger: GameEffectTrigger): asserts trigger is GameEffectTrigger {
  if (!supportedTriggers.has(trigger)) {
    throw new Error(`Unsupported effect trigger "${trigger}"`);
  }
}

function validateAmount(amount: EffectAmountSpec) {
  if (typeof amount === "number") {
    if (isNonNegativeInteger(amount)) return;
    invalidSpecField("effect amount", amount);
  }
  if (amount.kind === "completed-contracts") {
    if (amount.multiplier === undefined || isNonNegativeInteger(amount.multiplier)) return;
    invalidSpecField("completed-contracts multiplier", amount.multiplier);
  }
  unsupportedKind("effect amount", amount);
}

function validateFixedAmount(label: string, amount: number) {
  if (isNonNegativeInteger(amount)) return;
  invalidSpecField(label, amount);
}

function validateSourceLabel(label: string, value: unknown) {
  if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
    invalidSpecField(label, value);
  }
}

function validateOptionalBoolean(label: string, value: unknown) {
  if (value !== undefined && typeof value !== "boolean") {
    invalidSpecField(label, value);
  }
}

function validateOptionalTrue(label: string, value: unknown) {
  if (value !== undefined && value !== true) {
    invalidSpecField(label, value);
  }
}

function validateCondition(condition: GameEffectConditionSpec) {
  if (condition.kind === "visited-maker-space") return;
  if (condition.kind === "visited-space-has-spy-post") return;
  if (condition.kind === "visited-space-icon") {
    if (supportedIcons.has(condition.icon)) return;
    throw new Error(`Unsupported effect icon "${condition.icon}"`);
  }
  if (condition.kind === "has-spy-posts") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-spy-posts count", condition.count);
  }
  if (condition.kind === "has-conflict-units") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-conflict-units count", condition.count);
  }
  if (condition.kind === "has-influence") {
    if (!supportedFactions.has(condition.faction)) {
      throw new Error(`Unsupported effect faction "${condition.faction}"`);
    }
    if (isNonNegativeInteger(condition.amount)) return;
    invalidSpecField("has-influence amount", condition.amount);
  }
  if (condition.kind === "has-completed-contracts") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-completed-contracts count", condition.count);
  }
  if (condition.kind === "has-card-trait-in-play") {
    if (typeof condition.trait !== "string" || condition.trait.trim().length === 0) {
      invalidSpecField("has-card-trait-in-play trait", condition.trait);
    }
    if (condition.count === undefined || isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-card-trait-in-play count", condition.count);
  }
  if (condition.kind === "has-team") {
    if (supportedTeams.has(condition.team)) return;
    throw new Error(`Unsupported effect team "${condition.team}"`);
  }
  if (condition.kind === "has-role") {
    if (supportedRoles.has(condition.role)) return;
    throw new Error(`Unsupported effect role "${condition.role}"`);
  }
  if (condition.kind === "has-high-council-seat") return;
  if (condition.kind === "has-swordmaster-bonus") return;
  if (condition.kind === "has-leader") {
    if (typeof condition.leader === "string" && condition.leader.trim().length > 0) return;
    invalidSpecField("has-leader leader", condition.leader);
  }
  if (condition.kind === "has-alliance") {
    if (condition.faction === undefined || supportedFactions.has(condition.faction)) return;
    throw new Error(`Unsupported effect faction "${condition.faction}"`);
  }
  if (condition.kind === "gained-spice-this-turn") return;
  unsupportedKind("effect condition", condition);
}

function validateEffect(effect: GameEffectSpec, trigger: GameEffectTrigger) {
  if (effect.selector !== "self" && effect.selector !== "activated-ally") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
  }
  if (
    effect.selector === "activated-ally" &&
    trigger !== "agent-play" &&
    !(trigger === "plot-intrigue" && effect.kind === "recruit-troops")
  ) {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${trigger}`);
  }
  if (
    trigger === "acquire" &&
    effect.kind !== "gain-resource" &&
    effect.kind !== "gain-vp" &&
    effect.kind !== "place-spies" &&
    effect.kind !== "draw-intrigues"
  ) {
    throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
  }
  if (effect.kind === "gain-resource") {
    if (trigger !== "agent-play" && trigger !== "reveal" && trigger !== "acquire" && trigger !== "plot-intrigue") {
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
    if (trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("spend-resource source", effect.source);
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-vp") {
    if (trigger !== "acquire") {
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
    if (trigger !== "agent-play" && trigger !== "acquire" && trigger !== "plot-intrigue") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-influence-choice") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    validateAmount(effect.amount);
    validateOptionalBoolean("gain-influence-choice trashSource", (effect as { trashSource?: unknown }).trashSource);
    validateSourceLabel("gain-influence-choice source", effect.source);
    return;
  }
  if (effect.kind === "acquire-card") {
    if (trigger !== "agent-play") {
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
  if (effect.kind === "trash-card") {
    if (trigger !== "reveal") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (effect.zones?.some((zone) => !supportedTrashZones.has(zone))) {
      throw new Error(`Unsupported trash-card zone "${effect.zones.find((zone) => !supportedTrashZones.has(zone))}"`);
    }
    if (
      effect.requiredTrait !== undefined &&
      (typeof effect.requiredTrait !== "string" || effect.requiredTrait.trim().length === 0)
    ) {
      invalidSpecField("trash-card requiredTrait", effect.requiredTrait);
    }
    if (effect.strengthReward !== undefined) validateAmount(effect.strengthReward);
    if (effect.spiceRewardCostThreshold !== undefined) validateAmount(effect.spiceRewardCostThreshold);
    if (effect.spiceReward !== undefined) validateAmount(effect.spiceReward);
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
    return;
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
    return;
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
    return;
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
    if (trigger === "agent-play" && recipient !== "activated-ally") {
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
    return;
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
    return;
  }
  if (effect.kind === "take-contracts") {
    if (trigger !== "plot-intrigue") {
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
    validateAmount(effect.amount);
    validateOptionalTrue("take-contracts optional", (effect as { optional?: unknown }).optional);
    return;
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
    return;
  }
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
  if (effect.kind === "place-spies") {
    if (trigger !== "agent-play" && trigger !== "reveal" && trigger !== "acquire") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateSourceLabel("place-spies source", effect.source);
    if (effect.placementIcon !== undefined && !supportedIcons.has(effect.placementIcon)) {
      throw new Error(`Unsupported effect icon "${effect.placementIcon}"`);
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
  spec.conditions?.forEach(validateCondition);
  spec.effects.forEach((effect) => validateEffect(effect, spec.trigger));
}
