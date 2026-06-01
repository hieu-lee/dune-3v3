import { hasVisitedMakerSpaceThisRound } from "./turn-trackers";
import {
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import { playerConflictUnitCount } from "./conflict-rules";
import { spyPostCount } from "./spy-posts";
import type {
  BoardSpace,
  Card,
  CardEffectSpec,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  GameEffectTrigger,
  GameState,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
  Role,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamId,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
  TroopEffectDestination,
  TroopEffectRecipient,
  TrashCardZone,
} from "./types";

export type SpyPlacementEffectResult = {
  count: number;
  recallForSupply?: boolean;
  mustPlace?: boolean;
  placementIcon?: IconId;
  allowSharedPost?: boolean;
  source?: string;
  postPlacementAction?: "staban-unseen-network";
};

export type EffectResolverState = Partial<
  Pick<GameState, "alliances" | "players" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts">
>;

export type GameEffectContext = {
  trigger: GameEffectTrigger;
  source: Player;
  target?: Player;
  space?: Pick<BoardSpace, "icon">;
  state?: EffectResolverState;
};

export type DeferredAgentIntrigueDraw = {
  selector: PlayerSelector;
  amount: number;
  minConflictUnits: number;
};

export type RevealRetreatTroopsForStrength = {
  selector: PlayerSelector;
  troopCount: number;
  strength: number;
  optional: boolean;
};

export type RevealTrashCardEffect = {
  selector: PlayerSelector;
  optional: boolean;
  zones?: TrashCardZone[];
  excludeSource: boolean;
  requiredTrait?: string;
  strengthReward?: number;
  spiceRewardCostThreshold?: number;
  spiceReward?: number;
};

export type RevealLoseInfluenceForIntrigues = {
  selector: PlayerSelector;
  amount: number;
  optional: boolean;
};

export type RevealPayResourceForStrength = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  strength: number;
  optional: true;
  source?: string;
};

export type RevealPayResourceForTroops = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  troops: number;
  recipient: TroopEffectRecipient;
  destination: TroopEffectDestination;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentDiscardCardForInfluenceAndDraw = {
  selector: PlayerSelector;
  drawCards: number;
  influenceAmount: number;
  optional: boolean;
};

export type AgentPayResourceForInfluence = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  faction: InfluenceEffectFaction;
  amount: number;
  recipient: InfluenceEffectRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForSandworms = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  sandworms: number;
  recipient: SandwormEffectRecipient;
  destination: SandwormEffectDestination;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForContracts = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  contractCount: number;
  recipient: ContractEffectRecipient;
  sourcePool: ContractEffectSourcePool;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentPayTeamResourceForVp = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  vp: number;
  contributors: TeamResourcePaymentContributor;
  recipient: TeamResourcePaymentRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentMoveCardToThroneRow = {
  selector: PlayerSelector;
  source?: string;
};

export type AgentCommanderResourceSplit = {
  selector: PlayerSelector;
  options: CommanderResourceSplitOption[];
  source?: string;
};

export type AgentTrashSourceForTrade = {
  selector: PlayerSelector;
  partner: TradeEffectPartner;
  resource: TradeGoodId;
  optional: true;
  partnerLocked: boolean;
  source?: string;
};

type PlayerEffectResult = {
  cardsToDraw: number;
  drawCardsSource?: string;
  blocksDeploymentsThisTurn: boolean;
  deploymentBlockSource?: string;
  intriguesToDraw: number;
  recruitedTroops: number;
  recruitedTroopsSource?: string;
  revealGain: Partial<Resources>;
  revealGainSource?: string;
  spyPlacements: SpyPlacementEffectResult[];
};

export type GameEffectResult = PlayerEffectResult & {
  activatedAlly: PlayerEffectResult;
  persuasion: number;
  swords: number;
};

const emptyPlayerEffectResult: PlayerEffectResult = {
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  intriguesToDraw: 0,
  recruitedTroops: 0,
  revealGain: {},
  spyPlacements: [],
};

const emptyEffectResult: GameEffectResult = {
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  intriguesToDraw: 0,
  recruitedTroops: 0,
  persuasion: 0,
  revealGain: {},
  spyPlacements: [],
  swords: 0,
  activatedAlly: emptyPlayerEffectResult,
};

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

function mergeEffectSourceLabel(
  existingHasEffect: boolean,
  existingSource: string | undefined,
  nextHasEffect: boolean,
  nextSource: string | undefined,
) {
  if (!nextHasEffect) return existingSource;
  if (!existingHasEffect) return nextSource;
  if (!existingSource || !nextSource) return undefined;
  return existingSource === nextSource ? existingSource : undefined;
}

function validateCondition(condition: GameEffectConditionSpec) {
  if (condition.kind === "visited-maker-space") return;
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
  if (condition.kind === "has-swordmaster-bonus") return;
  if (condition.kind === "has-leader") {
    if (typeof condition.leader === "string" && condition.leader.trim().length > 0) return;
    invalidSpecField("has-leader leader", condition.leader);
  }
  if (condition.kind === "has-alliance") {
    if (condition.faction === undefined || supportedFactions.has(condition.faction)) return;
    throw new Error(`Unsupported effect faction "${condition.faction}"`);
  }
  unsupportedKind("effect condition", condition);
}

function validateEffect(effect: GameEffectSpec, trigger: GameEffectTrigger) {
  if (effect.selector !== "self" && effect.selector !== "activated-ally") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
  }
  if (effect.selector === "activated-ally" && trigger !== "agent-play") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${trigger}`);
  }
  if (effect.kind === "gain-resource") {
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateSourceLabel("gain-resource source", effect.source);
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
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateAmount(effect.amount);
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
    if (recipient !== "activated-ally") {
      invalidSpecField("pay-resource-for-sandworms recipient", recipient);
    }
    const destination = (effect as { destination?: unknown }).destination;
    if (destination !== "conflict") {
      invalidSpecField("pay-resource-for-sandworms destination", destination);
    }
    validateSourceLabel("pay-resource-for-sandworms source", effect.source);
    validateAmount(effect.cost);
    validateAmount(effect.sandworms);
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
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateSourceLabel("place-spies source", effect.source);
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

function validateSpec(spec: CardEffectSpec) {
  validateTrigger(spec.trigger);
  spec.conditions?.forEach(validateCondition);
  spec.effects.forEach((effect) => validateEffect(effect, spec.trigger));
}

function addRevealGain(gain: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return gain;
  return {
    ...gain,
    [resource]: (gain[resource] ?? 0) + amount,
  };
}

function hasResourceGain(gain: Partial<Resources>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function amountFor(amount: EffectAmountSpec, source: Player) {
  if (typeof amount === "number") return amount;
  if (amount.kind === "completed-contracts") {
    return source.contracts.filter((contract) => contract.completed).length * (amount.multiplier ?? 1);
  }
  return unsupportedKind("effect amount", amount);
}

function conditionApplies(condition: GameEffectConditionSpec, context: GameEffectContext) {
  if (condition.kind === "visited-maker-space") {
    return context.state?.roundMakerSpaceVisits
      ? hasVisitedMakerSpaceThisRound({ roundMakerSpaceVisits: context.state.roundMakerSpaceVisits }, context.source.id)
      : false;
  }
  if (condition.kind === "visited-space-icon") {
    return context.space?.icon === condition.icon;
  }
  if (condition.kind === "has-spy-posts") {
    return context.state?.spyPosts && context.state.sharedSpyPosts
      ? spyPostCount(
        { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
        context.source.id,
      ) >= condition.count
      : false;
  }
  if (condition.kind === "has-conflict-units") {
    return playerConflictUnitCount(conflictUnitConditionPlayer(context)) >= condition.count;
  }
  if (condition.kind === "has-influence") {
    return conditionInfluence(context.source, condition.faction, context.state?.players ?? [context.source]) >= condition.amount;
  }
  if (condition.kind === "has-completed-contracts") {
    return context.source.contracts.filter((contract) => contract.completed).length >= condition.count;
  }
  if (condition.kind === "has-card-trait-in-play") {
    const count = condition.count ?? 1;
    return context.source.playArea.filter((card) => card.traits?.includes(condition.trait)).length >= count;
  }
  if (condition.kind === "has-team") {
    return context.source.team === condition.team;
  }
  if (condition.kind === "has-role") {
    return context.source.role === condition.role;
  }
  if (condition.kind === "has-swordmaster-bonus") {
    return context.source.swordmasterBonus;
  }
  if (condition.kind === "has-leader") {
    return context.source.leader === condition.leader;
  }
  if (condition.kind === "has-alliance") {
    if (!context.state?.alliances) return false;
    if (condition.faction) return context.state.alliances[condition.faction] === context.source.id;
    return Object.values(context.state.alliances).includes(context.source.id);
  }
  return unsupportedKind("effect condition", condition);
}

function conditionInfluence(source: Player, faction: FactionId, players: Player[]) {
  if (faction === "emperor") return effectiveEmperorIconInfluence(source, players);
  if (faction === "fremen") return effectiveFremenIconInfluence(source, players);
  return effectiveRequirementInfluence(source, faction, players);
}

function conflictUnitConditionPlayer(context: GameEffectContext) {
  return context.source.role === "Commander" &&
    context.target?.role === "Ally" &&
    context.target.team === context.source.team
    ? context.target
    : context.source;
}

function specApplies(spec: CardEffectSpec, context: GameEffectContext) {
  return spec.trigger === context.trigger &&
    spec.effects.every((effect) => selectorApplies(effect.selector, context)) &&
    (spec.conditions ?? []).every((condition) => conditionApplies(condition, context));
}

function selectorApplies(selector: PlayerSelector, context: GameEffectContext) {
  if (selector === "self") return true;
  if (selector === "activated-ally") {
    return context.source.role === "Commander" &&
      context.target?.role === "Ally" &&
      context.target.team === context.source.team;
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedRevealGain(
  result: GameEffectResult,
  selector: PlayerSelector,
  resource: ResourceId,
  amount: number,
  source?: string,
) {
  if (selector === "self") {
    return {
      ...result,
      revealGain: addRevealGain(result.revealGain, resource, amount),
      revealGainSource: mergeEffectSourceLabel(
        hasResourceGain(result.revealGain),
        result.revealGainSource,
        amount > 0,
        source,
      ),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        revealGain: addRevealGain(result.activatedAlly.revealGain, resource, amount),
        revealGainSource: mergeEffectSourceLabel(
          hasResourceGain(result.activatedAlly.revealGain),
          result.activatedAlly.revealGainSource,
          amount > 0,
          source,
        ),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedRecruitedTroops(
  result: GameEffectResult,
  selector: PlayerSelector,
  amount: number,
  source?: string,
) {
  if (selector === "self") {
    return {
      ...result,
      recruitedTroops: result.recruitedTroops + amount,
      recruitedTroopsSource: mergeEffectSourceLabel(
        result.recruitedTroops > 0,
        result.recruitedTroopsSource,
        amount > 0,
        source,
      ),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        recruitedTroops: result.activatedAlly.recruitedTroops + amount,
        recruitedTroopsSource: mergeEffectSourceLabel(
          result.activatedAlly.recruitedTroops > 0,
          result.activatedAlly.recruitedTroopsSource,
          amount > 0,
          source,
        ),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedIntriguesToDraw(result: GameEffectResult, selector: PlayerSelector, amount: number) {
  if (selector === "self") {
    return { ...result, intriguesToDraw: result.intriguesToDraw + amount };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        intriguesToDraw: result.activatedAlly.intriguesToDraw + amount,
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedSpyPlacement(
  result: GameEffectResult,
  selector: PlayerSelector,
  placement: SpyPlacementEffectResult,
) {
  if (placement.count === 0) return result;
  if (selector === "self") {
    return { ...result, spyPlacements: [...result.spyPlacements, placement] };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        spyPlacements: [...result.activatedAlly.spyPlacements, placement],
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function resolveEffect(result: GameEffectResult, effect: GameEffectSpec, context: GameEffectContext): GameEffectResult {
  if (!selectorApplies(effect.selector, context)) return result;
  if (effect.kind === "gain-resource") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRevealGain(result, effect.selector, effect.resource, amount, effect.source);
  }
  if (effect.kind === "gain-persuasion") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, persuasion: result.persuasion + amount };
  }
  if (effect.kind === "gain-strength") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, swords: result.swords + amount };
  }
  if (effect.kind === "draw-cards") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return {
      ...result,
      cardsToDraw: result.cardsToDraw + amount,
      drawCardsSource: mergeEffectSourceLabel(
        result.cardsToDraw > 0,
        result.drawCardsSource,
        amount > 0,
        effect.source,
      ),
    };
  }
  if (effect.kind === "draw-intrigues") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedIntriguesToDraw(result, effect.selector, amount);
  }
  if (effect.kind === "recruit-troops") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRecruitedTroops(result, effect.selector, amount, effect.source);
  }
  if (effect.kind === "retreat-troops-for-strength") {
    return result;
  }
  if (effect.kind === "trash-card") {
    return result;
  }
  if (effect.kind === "lose-influence-for-intrigues") {
    return result;
  }
  if (effect.kind === "pay-resource-for-strength") {
    return result;
  }
  if (effect.kind === "pay-resource-for-troops") {
    return result;
  }
  if (effect.kind === "discard-card-for-influence-and-draw") {
    return result;
  }
  if (effect.kind === "pay-resource-for-influence") {
    return result;
  }
  if (effect.kind === "pay-resource-for-sandworms") {
    return result;
  }
  if (effect.kind === "pay-resource-for-contracts") {
    return result;
  }
  if (effect.kind === "pay-team-resource-for-vp") {
    return result;
  }
  if (effect.kind === "commander-resource-split") {
    return result;
  }
  if (effect.kind === "trash-source-for-trade") {
    return result;
  }
  if (effect.kind === "block-conflict-deployment") {
    return {
      ...result,
      blocksDeploymentsThisTurn: true,
      deploymentBlockSource: effect.source ?? result.deploymentBlockSource,
    };
  }
  if (effect.kind === "move-card-to-throne-row") {
    return result;
  }
  if (effect.kind === "place-spies") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedSpyPlacement(result, effect.selector, {
      count: amount,
      recallForSupply: effect.recallForSupply,
      mustPlace: effect.mustPlace,
      placementIcon: effect.placementIcon,
      allowSharedPost: effect.allowSharedPost,
      source: effect.source,
      postPlacementAction: effect.postPlacementAction,
    });
  }
  return unsupportedKind("effect", effect);
}

export function resolveGameEffects(specs: CardEffectSpec[] | undefined, context: GameEffectContext): GameEffectResult {
  specs?.forEach(validateSpec);
  return (specs ?? []).reduce((result, spec) => {
    if (!specApplies(spec, context)) return result;
    return spec.effects.reduce((effectResult, effect) => resolveEffect(effectResult, effect, context), result);
  }, emptyEffectResult);
}

function mergeEffectResult(result: GameEffectResult, next: GameEffectResult): GameEffectResult {
  return {
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    drawCardsSource: mergeEffectSourceLabel(
      result.cardsToDraw > 0,
      result.drawCardsSource,
      next.cardsToDraw > 0,
      next.drawCardsSource,
    ),
    blocksDeploymentsThisTurn: result.blocksDeploymentsThisTurn || next.blocksDeploymentsThisTurn,
    deploymentBlockSource: result.deploymentBlockSource ?? next.deploymentBlockSource,
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    recruitedTroopsSource: mergeEffectSourceLabel(
      result.recruitedTroops > 0,
      result.recruitedTroopsSource,
      next.recruitedTroops > 0,
      next.recruitedTroopsSource,
    ),
    persuasion: result.persuasion + next.persuasion,
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    revealGainSource: mergeEffectSourceLabel(
      hasResourceGain(result.revealGain),
      result.revealGainSource,
      hasResourceGain(next.revealGain),
      next.revealGainSource,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
    swords: result.swords + next.swords,
    activatedAlly: mergePlayerEffectResult(result.activatedAlly, next.activatedAlly),
  };
}

function mergePlayerEffectResult(result: PlayerEffectResult, next: PlayerEffectResult): PlayerEffectResult {
  return {
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    drawCardsSource: mergeEffectSourceLabel(
      result.cardsToDraw > 0,
      result.drawCardsSource,
      next.cardsToDraw > 0,
      next.drawCardsSource,
    ),
    blocksDeploymentsThisTurn: result.blocksDeploymentsThisTurn || next.blocksDeploymentsThisTurn,
    deploymentBlockSource: result.deploymentBlockSource ?? next.deploymentBlockSource,
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    recruitedTroopsSource: mergeEffectSourceLabel(
      result.recruitedTroops > 0,
      result.recruitedTroopsSource,
      next.recruitedTroops > 0,
      next.recruitedTroopsSource,
    ),
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    revealGainSource: mergeEffectSourceLabel(
      hasResourceGain(result.revealGain),
      result.revealGainSource,
      hasResourceGain(next.revealGain),
      next.revealGainSource,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
  };
}

export function resolveCardEffects(cards: Array<{ effects?: CardEffectSpec[] }>, context: GameEffectContext): GameEffectResult {
  return cards.reduce((result, card) => mergeEffectResult(result, resolveGameEffects(card.effects, context)), emptyEffectResult);
}

export function resolveDeferredAgentConflictUnitIntrigueDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): DeferredAgentIntrigueDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!spec.effects.every((effect) => selectorApplies(effect.selector, context))) return [];

    const conflictUnitConditions = (spec.conditions ?? []).filter((condition) => condition.kind === "has-conflict-units");
    if (conflictUnitConditions.length === 0) return [];
    if (conflictUnitConditions.length > 1) {
      throw new Error("Unsupported multiple has-conflict-units conditions for deferred Agent Intrigue draw");
    }
    const [condition] = conflictUnitConditions;
    if ((spec.conditions ?? [])
      .filter((candidate) => candidate.kind !== "has-conflict-units")
      .some((candidate) => !conditionApplies(candidate, context))) {
      return [];
    }
    if (playerConflictUnitCount(conflictUnitConditionPlayer(context)) >= condition.count) return [];

    const drawEffects = spec.effects.filter((effect) => effect.kind === "draw-intrigues");
    if (drawEffects.length === 0) return [];
    if (drawEffects.length !== spec.effects.length) {
      throw new Error("Unsupported mixed deferred conflict-unit Agent effects");
    }
    return drawEffects.map((effect) => ({
      selector: effect.selector,
      amount: amountFor(effect.amount, context.source),
      minConflictUnits: condition.count,
    }));
  });
}

export function resolveRevealRetreatTroopsForStrength(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealRetreatTroopsForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "retreat-troops-for-strength")
      .map((effect) => ({
        selector: effect.selector,
        troopCount: amountFor(effect.amount, context.source),
        strength: amountFor(effect.strength, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveRevealTrashCardEffects(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealTrashCardEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-card")
      .map((effect) => ({
        selector: effect.selector,
        optional: effect.optional ?? true,
        zones: effect.zones ? [...effect.zones] : undefined,
        excludeSource: effect.excludeSource ?? false,
        requiredTrait: effect.requiredTrait,
        strengthReward: effect.strengthReward === undefined ? undefined : amountFor(effect.strengthReward, context.source),
        spiceRewardCostThreshold: effect.spiceRewardCostThreshold === undefined
          ? undefined
          : amountFor(effect.spiceRewardCostThreshold, context.source),
        spiceReward: effect.spiceReward === undefined ? undefined : amountFor(effect.spiceReward, context.source),
      }));
  });
}

export function resolveRevealLoseInfluenceForIntrigues(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealLoseInfluenceForIntrigues[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "lose-influence-for-intrigues")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveRevealPayResourceForStrengths(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-strength")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        strength: amountFor(effect.strength, context.source),
        optional: true,
        source: effect.source,
      }));
  });
}

export function resolveRevealPayResourceForTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-troops")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        troops: amountFor(effect.troops, context.source),
        recipient: effect.recipient,
        destination: effect.destination,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentDiscardCardForInfluenceAndDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentDiscardCardForInfluenceAndDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-card-for-influence-and-draw")
      .map((effect) => ({
        selector: effect.selector,
        drawCards: amountFor(effect.drawCards, context.source),
        influenceAmount: amountFor(effect.influenceAmount, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveAgentPayResourceForInfluences(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForInfluence[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-influence")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        faction: effect.faction,
        amount: amountFor(effect.amount, context.source),
        recipient: effect.recipient,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForSandworms(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForSandworms[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-sandworms")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        sandworms: amountFor(effect.sandworms, context.source),
        recipient: effect.recipient,
        destination: effect.destination,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForContracts(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForContracts[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-contracts")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        contractCount: amountFor(effect.contractCount, context.source),
        recipient: effect.recipient,
        sourcePool: effect.sourcePool,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayTeamResourceForVps(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayTeamResourceForVp[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-team-resource-for-vp")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        vp: amountFor(effect.vp, context.source),
        contributors: effect.contributors,
        recipient: effect.recipient,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentMoveCardToThroneRows(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentMoveCardToThroneRow[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "move-card-to-throne-row")
      .map((effect) => ({
        selector: effect.selector,
        source: effect.source,
      }));
  });
}

export function resolveAgentCommanderResourceSplits(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentCommanderResourceSplit[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "commander-resource-split")
      .map((effect) => ({
        selector: effect.selector,
        options: effect.options.map((option) => ({ ...option })),
        source: effect.source,
      }));
  });
}

export function resolveAgentTrashSourceForTrades(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentTrashSourceForTrade[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-source-for-trade")
      .map((effect) => ({
        selector: effect.selector,
        partner: effect.partner,
        resource: effect.resource,
        optional: true,
        partnerLocked: effect.partnerLocked ?? true,
        source: effect.source,
      }));
  });
}

function legacyRevealResult(card: Card): GameEffectResult {
  return {
    cardsToDraw: 0,
    blocksDeploymentsThisTurn: false,
    intriguesToDraw: 0,
    recruitedTroops: 0,
    persuasion: card.persuasion,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
    spyPlacements: [],
    swords: card.swords,
    activatedAlly: emptyPlayerEffectResult,
  };
}

export function resolveCardRevealEffects(
  cards: Card[],
  source: Player,
  state?: EffectResolverState,
): GameEffectResult {
  const revealSource = cards.length > 0
    ? { ...source, playArea: [...source.playArea, ...cards] }
    : source;
  return cards.reduce((result, card) => {
    card.effects?.forEach(validateSpec);
    const revealSpecs = card.effects?.filter((spec) => spec.trigger === "reveal");
    const cardResult = revealSpecs && revealSpecs.length > 0
      ? resolveGameEffects(revealSpecs, { trigger: "reveal", source: revealSource, state })
      : legacyRevealResult(card);
    return mergeEffectResult(result, cardResult);
  }, emptyEffectResult);
}
