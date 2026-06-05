import {
  hasAcquiredCardThisTurn,
  hasDeployedUnitsThisTurn,
  hasGainedSpiceThisTurn,
  hasRecalledSpyThisTurn,
  hasVisitedMakerSpaceThisRound,
} from "./turn-trackers";
import {
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import { boardSpaces } from "./board-space-data";
import { playerConflictUnitCount } from "./conflict-rules";
import { playerHasSpyPost, spyPostCount } from "./spy-posts";
import type { GameEffectContext } from "./effect-resolver-types";
import type {
  Card,
  CardEffectSpec,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  LeaderCounterId,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
  TroopRetreatBoundSpec,
} from "./types";

export function unsupportedKind(label: string, value: unknown): never {
  const kind = typeof value === "object" && value !== null && "kind" in value
    ? String((value as { kind?: unknown }).kind)
    : String(value);
  throw new Error(`Unsupported ${label} "${kind}"`);
}

export function mergeEffectSourceLabel(
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

export function addRevealGain(gain: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return gain;
  return {
    ...gain,
    [resource]: (gain[resource] ?? 0) + amount,
  };
}

export function addResourceSpend(spent: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return spent;
  return {
    ...spent,
    [resource]: (spent[resource] ?? 0) + amount,
  };
}

export function addInfluenceAmount(amounts: Partial<Record<FactionId, number>>, faction: FactionId, amount: number) {
  if (amount === 0) return amounts;
  const current = amounts ?? {};
  return {
    ...current,
    [faction]: (current[faction] ?? 0) + amount,
  };
}

export function hasResourceGain(gain: Partial<Resources>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function effectAmountMultiplier(amount: Exclude<EffectAmountSpec, number>) {
  return amount.multiplier ?? 1;
}

function cardTraitCount(cards: readonly Card[], trait: string) {
  return cards.filter((card) => card.traits?.includes(trait)).length;
}

function combatRecipientForAmount(context: GameEffectContext | undefined, source: Player) {
  if (!context) return source;
  if (source.role === "Commander") {
    return context.target?.role === "Ally" && context.target.team === source.team
      ? context.target
      : undefined;
  }
  return source;
}

function amountSpecCanBePositive(amount: EffectAmountSpec, context: GameEffectContext): boolean {
  if (typeof amount === "number") return amount > 0;
  if (amount.kind === "other-revealed-card-strength-count") return false;
  return amountFor(amount, context.source, context) > 0;
}

function revealedCardProvidesStrength(card: Card, context: GameEffectContext): boolean {
  const revealSpecs = card.effects?.filter((spec) => spec.trigger === "reveal");
  if (!revealSpecs || revealSpecs.length === 0) return (card.swords ?? 0) > 0;
  return revealSpecs.some((spec) =>
    spec.effects.some((effect) => effect.kind === "gain-strength" && amountSpecCanBePositive(effect.amount, context)) &&
    (spec.conditions ?? []).every((condition) => conditionApplies(condition, context))
  );
}

export function amountFor(amount: EffectAmountSpec, source: Player, context?: GameEffectContext): number {
  if (typeof amount === "number") return amount;
  if (amount.kind === "completed-contracts") {
    return source.contracts.filter((contract) => contract.completed).length * (amount.multiplier ?? 1);
  }
  if (amount.kind === "card-trait-count-in-play") {
    return cardTraitCount(source.playArea, amount.trait) * effectAmountMultiplier(amount);
  }
  if (amount.kind === "revealed-card-trait-count") {
    return cardTraitCount(context?.revealedCards ?? [], amount.trait) * effectAmountMultiplier(amount);
  }
  if (amount.kind === "combat-recipient-sandworms") {
    return (combatRecipientForAmount(context, source)?.deployedSandworms ?? 0) * effectAmountMultiplier(amount);
  }
  if (amount.kind === "other-revealed-card-strength-count") {
    const revealedCards = context?.revealedCards ?? [];
    const resolvingCard = context?.resolvingCard;
    if (!context || !resolvingCard) return 0;
    return revealedCards
      .filter((card) => card.id !== resolvingCard.id)
      .filter((card) => revealedCardProvidesStrength(card, context))
      .length * effectAmountMultiplier(amount);
  }
  return unsupportedKind("effect amount", amount);
}

function leaderCounterAmount(source: Player, counter: LeaderCounterId) {
  if (counter === "jessicaMemories") return source.jessicaMemories;
  return unsupportedKind("leader counter", counter);
}

export function conditionApplies(condition: GameEffectConditionSpec, context: GameEffectContext) {
  if (condition.kind === "visited-maker-space") {
    if (context.trigger === "agent-play") return Boolean(context.space?.maker);
    return context.state?.roundMakerSpaceVisits
      ? hasVisitedMakerSpaceThisRound({ roundMakerSpaceVisits: context.state.roundMakerSpaceVisits }, context.source.id)
      : false;
  }
  if (condition.kind === "visited-space-icon") {
    return context.space?.icon === condition.icon;
  }
  if (condition.kind === "visited-space-has-spy-post") {
    return Boolean(
      context.space?.id &&
      context.state?.spyPosts &&
      context.state.sharedSpyPosts &&
      playerHasSpyPost(
        { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
        context.space.id,
        context.source.id,
      ),
    );
  }
  if (condition.kind === "has-spy-post-on-maker-space") {
    const spyPosts = context.state?.spyPosts;
    const sharedSpyPosts = context.state?.sharedSpyPosts;
    if (!spyPosts || !sharedSpyPosts) return false;
    return boardSpaces.some((space) =>
      space.maker &&
      playerHasSpyPost({ spyPosts, sharedSpyPosts }, space.id, context.source.id)
    );
  }
  if (condition.kind === "has-combat-recipient") {
    return Boolean(combatEffectRecipient(context));
  }
  if (condition.kind === "has-combat-recipient-sandworms") {
    return (combatEffectRecipient(context)?.deployedSandworms ?? 0) >= condition.count;
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
  if (condition.kind === "has-sandworms-in-conflict") {
    return (combatEffectRecipient(context)?.deployedSandworms ?? 0) >= condition.count;
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
  if (condition.kind === "has-high-council-seat") {
    return context.source.highCouncilSeat;
  }
  if (condition.kind === "has-swordmaster-bonus") {
    return context.source.swordmasterBonus;
  }
  if (condition.kind === "has-leader") {
    return context.source.leader === condition.leader;
  }
  if (condition.kind === "has-leader-counter") {
    return leaderCounterAmount(context.source, condition.counter) >= condition.amount;
  }
  if (condition.kind === "has-alliance") {
    if (!context.state?.alliances) return false;
    if (condition.faction) return context.state.alliances[condition.faction] === context.source.id;
    return Object.values(context.state.alliances).includes(context.source.id);
  }
  if (condition.kind === "acquired-card-this-turn") {
    return context.state?.turnAcquiredCardIds
      ? hasAcquiredCardThisTurn(
          { turnAcquiredCardIds: context.state.turnAcquiredCardIds },
          context.source.id,
          condition.cardId,
        )
      : false;
  }
  if (condition.kind === "deployed-units-this-turn") {
    return context.state?.turnUnitDeployments
      ? hasDeployedUnitsThisTurn(
          { turnUnitDeployments: context.state.turnUnitDeployments },
          context.source.id,
          condition.count,
        )
      : false;
  }
  if (condition.kind === "recalled-spy-this-turn") {
    return context.state?.turnSpyRecalls
      ? hasRecalledSpyThisTurn({ turnSpyRecalls: context.state.turnSpyRecalls }, context.source.id)
      : false;
  }
  if (condition.kind === "gained-spice-this-turn") {
    return context.state?.turnSpiceGains
      ? hasGainedSpiceThisTurn({ turnSpiceGains: context.state.turnSpiceGains }, context.source.id)
      : false;
  }
  return unsupportedKind("effect condition", condition);
}

function conditionInfluence(source: Player, faction: FactionId, players: Player[]) {
  if (faction === "emperor") return effectiveEmperorIconInfluence(source, players);
  if (faction === "fremen") return effectiveFremenIconInfluence(source, players);
  return effectiveRequirementInfluence(source, faction, players);
}

export function conflictUnitConditionPlayer(context: GameEffectContext) {
  return context.source.role === "Commander" &&
    context.target?.role === "Ally" &&
    context.target.team === context.source.team
    ? context.target
    : context.source;
}

function combatEffectRecipient(context: GameEffectContext) {
  if (context.source.role === "Commander") {
    return context.target?.role === "Ally" && context.target.team === context.source.team
      ? context.target
      : undefined;
  }
  return context.source;
}

export function retreatBoundFor(bound: TroopRetreatBoundSpec, context: GameEffectContext) {
  if (typeof bound === "number") return bound;
  if (bound.kind === "deployed-troops") return combatEffectRecipient(context)?.deployedTroops ?? 0;
  return unsupportedKind("retreat-troops bound", bound);
}

export function specApplies(spec: CardEffectSpec, context: GameEffectContext) {
  return spec.trigger === context.trigger &&
    (spec.choiceId === undefined || spec.choiceId === context.choiceId) &&
    spec.effects.every((effect) => selectorApplies(effect.selector, context)) &&
    (spec.conditions ?? []).every((condition) => conditionApplies(condition, context));
}

export function selectorApplies(selector: PlayerSelector, context: GameEffectContext) {
  if (selector === "self") return true;
  if (selector === "activated-ally") {
    return context.source.role === "Commander" &&
      context.target?.role === "Ally" &&
      context.target.team === context.source.team;
  }
  return unsupportedKind("effect selector", selector);
}
