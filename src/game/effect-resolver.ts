import { hasVisitedMakerSpaceThisRound } from "./turn-trackers";
import { effectiveRequirementInfluence } from "./board-rules";
import { spyPostCount } from "./spy-posts";
import type {
  Card,
  CardEffectSpec,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  GameEffectTrigger,
  GameState,
  Player,
  ResourceId,
  Resources,
} from "./types";

export type EffectResolverState = Partial<
  Pick<GameState, "players" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts">
>;

export type GameEffectContext = {
  trigger: GameEffectTrigger;
  source: Player;
  state?: EffectResolverState;
};

export type GameEffectResult = {
  cardsToDraw: number;
  persuasion: number;
  revealGain: Partial<Resources>;
  swords: number;
};

const emptyEffectResult: GameEffectResult = {
  cardsToDraw: 0,
  persuasion: 0,
  revealGain: {},
  swords: 0,
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
const supportedFactions = new Set<FactionId>([
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
]);

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

function validateCondition(condition: GameEffectConditionSpec) {
  if (condition.kind === "visited-maker-space") return;
  if (condition.kind === "has-spy-posts") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-spy-posts count", condition.count);
  }
  if (condition.kind === "has-influence") {
    if (!supportedFactions.has(condition.faction)) {
      throw new Error(`Unsupported effect faction "${condition.faction}"`);
    }
    if (isNonNegativeInteger(condition.amount)) return;
    invalidSpecField("has-influence amount", condition.amount);
  }
  unsupportedKind("effect condition", condition);
}

function validateEffect(effect: GameEffectSpec) {
  if (effect.selector !== "self") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
  }
  if (effect.kind === "gain-resource") {
    if (!supportedResources.has(effect.resource)) {
      throw new Error(`Unsupported effect resource "${effect.resource}"`);
    }
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "gain-persuasion" || effect.kind === "gain-strength") {
    validateAmount(effect.amount);
    return;
  }
  if (effect.kind === "draw-cards") {
    validateAmount(effect.amount);
    return;
  }
  unsupportedKind("effect", effect);
}

function validateSpec(spec: CardEffectSpec) {
  validateTrigger(spec.trigger);
  spec.conditions?.forEach(validateCondition);
  spec.effects.forEach(validateEffect);
}

function addRevealGain(gain: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return gain;
  return {
    ...gain,
    [resource]: (gain[resource] ?? 0) + amount,
  };
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
  if (condition.kind === "has-spy-posts") {
    return context.state?.spyPosts && context.state.sharedSpyPosts
      ? spyPostCount(
        { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
        context.source.id,
      ) >= condition.count
      : false;
  }
  if (condition.kind === "has-influence") {
    return effectiveRequirementInfluence(
      context.source,
      condition.faction,
      context.state?.players ?? [context.source],
    ) >= condition.amount;
  }
  return unsupportedKind("effect condition", condition);
}

function specApplies(spec: CardEffectSpec, context: GameEffectContext) {
  return spec.trigger === context.trigger && (spec.conditions ?? []).every((condition) => conditionApplies(condition, context));
}

function resolveEffect(result: GameEffectResult, effect: GameEffectSpec, context: GameEffectContext): GameEffectResult {
  if (effect.selector !== "self") {
    throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
  }
  if (effect.kind === "gain-resource") {
    const amount = amountFor(effect.amount, context.source);
    return { ...result, revealGain: addRevealGain(result.revealGain, effect.resource, amount) };
  }
  if (effect.kind === "gain-persuasion") {
    const amount = amountFor(effect.amount, context.source);
    return { ...result, persuasion: result.persuasion + amount };
  }
  if (effect.kind === "gain-strength") {
    const amount = amountFor(effect.amount, context.source);
    return { ...result, swords: result.swords + amount };
  }
  if (effect.kind === "draw-cards") {
    const amount = amountFor(effect.amount, context.source);
    return { ...result, cardsToDraw: result.cardsToDraw + amount };
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
    persuasion: result.persuasion + next.persuasion,
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    swords: result.swords + next.swords,
  };
}

export function resolveCardEffects(cards: Array<{ effects?: CardEffectSpec[] }>, context: GameEffectContext): GameEffectResult {
  return cards.reduce((result, card) => mergeEffectResult(result, resolveGameEffects(card.effects, context)), emptyEffectResult);
}

function legacyRevealResult(card: Card): GameEffectResult {
  return {
    cardsToDraw: 0,
    persuasion: card.persuasion,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
    swords: card.swords,
  };
}

export function resolveCardRevealEffects(
  cards: Card[],
  source: Player,
  state?: EffectResolverState,
): GameEffectResult {
  return cards.reduce((result, card) => {
    card.effects?.forEach(validateSpec);
    const revealSpecs = card.effects?.filter((spec) => spec.trigger === "reveal");
    const cardResult = revealSpecs && revealSpecs.length > 0
      ? resolveGameEffects(revealSpecs, { trigger: "reveal", source, state })
      : legacyRevealResult(card);
    return mergeEffectResult(result, cardResult);
  }, emptyEffectResult);
}
