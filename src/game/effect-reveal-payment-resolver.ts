import { validateSpec } from "./effect-spec-validation";
import { amountFor, specApplies } from "./effect-resolver-helpers";
import type {
  GameEffectContext,
  RevealPayResourceForHighCouncilSeat,
  RevealPayResourceForSandworms,
  RevealPayResourceForStrength,
  RevealPayResourceForTroops,
} from "./effect-resolver-types";
import type { CardEffectSpec } from "./types";

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

export function resolveRevealPayResourceForSandworms(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForSandworms[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
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
        persuasionCost: effect.persuasionCost !== undefined ? amountFor(effect.persuasionCost, context.source) : 0,
        source: effect.source,
      }));
  });
}

export function resolveRevealPayResourceForHighCouncilSeats(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForHighCouncilSeat[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-high-council-seat")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        optional: true,
        persuasionCost: effect.persuasionCost === undefined ? 0 : amountFor(effect.persuasionCost, context.source),
        persuasionReward: effect.persuasionReward === undefined ? 0 : amountFor(effect.persuasionReward, context.source),
        source: effect.source,
      }));
  });
}
