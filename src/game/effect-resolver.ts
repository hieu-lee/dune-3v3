import { hasVisitedMakerSpaceThisRound } from "./turn-trackers";
import {
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import { playerConflictUnitCount } from "./conflict-rules";
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
  IconId,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
} from "./types";

export type SpyPlacementEffectResult = {
  count: number;
  recallForSupply?: boolean;
  mustPlace?: boolean;
  placementIcon?: IconId;
  allowSharedPost?: boolean;
};

export type EffectResolverState = Partial<
  Pick<GameState, "players" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts">
>;

export type GameEffectContext = {
  trigger: GameEffectTrigger;
  source: Player;
  target?: Player;
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

type PlayerEffectResult = {
  cardsToDraw: number;
  intriguesToDraw: number;
  recruitedTroops: number;
  revealGain: Partial<Resources>;
  spyPlacements: SpyPlacementEffectResult[];
};

export type GameEffectResult = PlayerEffectResult & {
  activatedAlly: PlayerEffectResult;
  persuasion: number;
  swords: number;
};

const emptyPlayerEffectResult: PlayerEffectResult = {
  cardsToDraw: 0,
  intriguesToDraw: 0,
  recruitedTroops: 0,
  revealGain: {},
  spyPlacements: [],
};

const emptyEffectResult: GameEffectResult = {
  cardsToDraw: 0,
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
  if (effect.kind === "place-spies") {
    if (trigger !== "agent-play") {
      throw new Error(`Unsupported effect "${effect.kind}" for ${trigger}`);
    }
    validateAmount(effect.amount);
    return;
  }
  unsupportedKind("effect", effect);
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
) {
  if (selector === "self") {
    return { ...result, revealGain: addRevealGain(result.revealGain, resource, amount) };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        revealGain: addRevealGain(result.activatedAlly.revealGain, resource, amount),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedRecruitedTroops(result: GameEffectResult, selector: PlayerSelector, amount: number) {
  if (selector === "self") {
    return { ...result, recruitedTroops: result.recruitedTroops + amount };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        recruitedTroops: result.activatedAlly.recruitedTroops + amount,
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
    return addSelectedRevealGain(result, effect.selector, effect.resource, amount);
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
    return { ...result, cardsToDraw: result.cardsToDraw + amount };
  }
  if (effect.kind === "draw-intrigues") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedIntriguesToDraw(result, effect.selector, amount);
  }
  if (effect.kind === "recruit-troops") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRecruitedTroops(result, effect.selector, amount);
  }
  if (effect.kind === "retreat-troops-for-strength") {
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
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    persuasion: result.persuasion + next.persuasion,
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
    swords: result.swords + next.swords,
    activatedAlly: mergePlayerEffectResult(result.activatedAlly, next.activatedAlly),
  };
}

function mergePlayerEffectResult(result: PlayerEffectResult, next: PlayerEffectResult): PlayerEffectResult {
  return {
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
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

function legacyRevealResult(card: Card): GameEffectResult {
  return {
    cardsToDraw: 0,
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
