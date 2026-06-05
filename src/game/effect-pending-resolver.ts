import { playerConflictUnitCount } from "./conflict-rules";
import { validateSpec } from "./effect-spec-validation";
import {
  amountFor,
  conditionApplies,
  conflictUnitConditionPlayer,
  retreatBoundFor,
  selectorApplies,
  specApplies,
} from "./effect-resolver-helpers";
import { spyPostCount } from "./spy-posts";
import type {
  AgentAcquireCard,
  AgentBoardSpaceInfluence,
  AgentCommanderResourceSplit,
  AgentDiscardCardsForReward,
  AgentDiscardCardForDraw,
  AgentDiscardCardForInfluenceAndDraw,
  AgentGainInfluenceChoice,
  AgentMoveCardToThroneRow,
  AgentOpponentsDiscardCards,
  AgentPayResourceForContracts,
  AgentPayResourceForDrawCards,
  AgentPayResourceForInfluence,
  AgentPayResourceForSandworms,
  AgentPayTeamResourceForVp,
  AgentTrashIntrigueForReward,
  AgentTrashSourceForTrade,
  AgentTopDeckSelection,
  CombatInfluenceLossForStrength,
  CombatRetreatTroops,
  CombatSpyRecallForStrength,
  DeferredAgentIntrigueDraw,
  DiscardCardEffect,
  GameEffectContext,
  ManipulateRowCardEffect,
  PlotDeployTroops,
  PlotSummonSandworms,
  RevealDeployOrRetreatTroops,
  RevealLoseInfluenceForInfluence,
  RevealLoseInfluenceForIntrigues,
  RevealRetreatTroopsForStrength,
  RevealRetreatTroops,
  RevealSpyRecallForIntrigues,
  RevealSpyRecallForStrength,
  RevealTrashCardEffect,
  TakeContractsEffect,
  TrashCardEffect,
} from "./effect-resolver-types";
import type {
  CardEffectSpec,
  EffectAmountSpec,
  ResourceId,
  Resources,
} from "./types";

export {
  resolveRevealPayResourceForHighCouncilSeats,
  resolveRevealPayResourceForSandworms,
  resolveRevealPayResourceForStrengths,
  resolveRevealPayResourceForTroops,
} from "./effect-reveal-payment-resolver";

function resolvedResourceGain(
  gain: Partial<Record<ResourceId, EffectAmountSpec>> | undefined,
  context: GameEffectContext,
): Partial<Resources> {
  const resolved: Partial<Resources> = {};
  for (const [resource, amount] of Object.entries(gain ?? {}) as [ResourceId, EffectAmountSpec][]) {
    resolved[resource] = amountFor(amount, context.source, context);
  }
  return resolved;
}

export function resolveDeferredAgentConflictUnitIntrigueDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): DeferredAgentIntrigueDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (spec.choiceId !== undefined && spec.choiceId !== context.choiceId) return [];
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

export function resolveRevealDeployOrRetreatTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealDeployOrRetreatTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "deploy-or-retreat-troops")
      .map((effect) => ({
        selector: effect.selector,
        troopCount: amountFor(effect.amount, context.source),
        optional: effect.optional ?? true,
        source: effect.source,
      }));
  });
}

export function resolveRevealRetreatTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealRetreatTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "retreat-troops")
      .map((effect) => {
        const max = retreatBoundFor(effect.max, context);
        if (effect.min !== max) {
          throw new Error("Unsupported Reveal retreat-troops range without a troop-count choice");
        }
        return {
          selector: effect.selector,
          count: max,
          optional: effect.optional ?? true,
          source: effect.source,
        };
      });
  });
}

export function resolveTrashCardEffects(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): TrashCardEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-card")
      .map((effect) => ({
        selector: effect.selector,
        optional: effect.optional ?? true,
        zones: effect.zones ? [...effect.zones] : undefined,
        excludeSource: effect.excludeSource ?? false,
        sourceOnly: effect.sourceOnly ?? false,
        requiredTrait: effect.requiredTrait,
        strengthReward: effect.strengthReward === undefined ? undefined : amountFor(effect.strengthReward, context.source),
        spiceRewardCostThreshold: effect.spiceRewardCostThreshold === undefined
          ? undefined
          : amountFor(effect.spiceRewardCostThreshold, context.source),
        spiceReward: effect.spiceReward === undefined ? undefined : amountFor(effect.spiceReward, context.source),
        drawCardsReward: effect.drawCardsReward === undefined
          ? undefined
          : amountFor(effect.drawCardsReward, context.source),
        vpReward: effect.vpReward === undefined ? undefined : amountFor(effect.vpReward, context.source),
        persuasionCost: effect.persuasionCost === undefined
          ? undefined
          : amountFor(effect.persuasionCost, context.source, context),
        resourceCost: resolvedResourceGain(effect.resourceCost, context),
      }));
  });
}

export function resolveRevealTrashCardEffects(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealTrashCardEffect[] {
  return resolveTrashCardEffects(specs, { ...context, trigger: "reveal" });
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

export function resolveRevealLoseInfluenceForInfluences(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealLoseInfluenceForInfluence[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "lose-influence-for-influence")
      .map((effect) => ({
        selector: effect.selector,
        loseAmount: amountFor(effect.loseAmount, context.source, context),
        gainAmount: amountFor(effect.gainAmount, context.source, context),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveRevealSpyRecallForIntrigues(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealSpyRecallForIntrigues[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "recall-spy")
      .filter((effect) => effect.drawIntrigues !== undefined || effect.persuasionReward !== undefined)
      .flatMap((effect) => {
        if (effect.amount === undefined) {
          throw new Error("Unsupported Reveal recall-spy effect without amount");
        }
        const amount = amountFor(effect.amount, context.source, context);
        if (
          context.state?.spyPosts &&
          context.state.sharedSpyPosts &&
          spyPostCount(
            { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
            context.source.id,
          ) < amount
        ) {
          return [];
        }
        return {
          selector: effect.selector,
          amount,
          drawIntrigues: effect.drawIntrigues === undefined
            ? 0
            : amountFor(effect.drawIntrigues, context.source, context),
          persuasionReward: effect.persuasionReward === undefined
            ? 0
            : amountFor(effect.persuasionReward, context.source, context),
          optional: effect.optional ?? true,
          source: effect.source,
        };
      });
  });
}

export function resolveRevealSpyRecallForStrengths(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealSpyRecallForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "recall-spy")
      .filter((effect) => effect.strengthReward !== undefined)
      .flatMap((effect) => {
        if (effect.amount === undefined || effect.strengthReward === undefined) {
          throw new Error("Unsupported Reveal recall-spy effect without amount and strengthReward");
        }
        const amount = amountFor(effect.amount, context.source);
        if (
          context.state?.spyPosts &&
          context.state.sharedSpyPosts &&
          spyPostCount(
            { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
            context.source.id,
          ) < amount
        ) {
          return [];
        }
        return {
          selector: effect.selector,
          amount,
          strength: amountFor(effect.strengthReward, context.source),
          optional: effect.optional ?? true,
          source: effect.source,
        };
      });
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

export function resolveAgentDiscardCardForDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentDiscardCardForDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-card-for-draw")
      .map((effect) => ({
        selector: effect.selector,
        drawCards: amountFor(effect.drawCards, context.source),
        ...(effect.drawIntrigues !== undefined ? { drawIntrigues: amountFor(effect.drawIntrigues, context.source) } : {}),
        optional: effect.optional ?? false,
        ...(effect.bonusDraw
          ? {
              bonusDraw: {
                requiredDiscardTrait: effect.bonusDraw.requiredDiscardTrait,
                drawCards: amountFor(effect.bonusDraw.drawCards, context.source),
              },
            }
          : {}),
        ...(effect.bonusIntrigues
          ? {
              bonusIntrigues: {
                requiredDiscardTrait: effect.bonusIntrigues.requiredDiscardTrait,
                amount: amountFor(effect.bonusIntrigues.amount, context.source),
              },
            }
          : {}),
      }));
  });
}

export function resolveAgentDiscardCardsForRewards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentDiscardCardsForReward[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-cards-for-reward")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        cost: resolvedResourceGain(effect.cost, context),
        gain: resolvedResourceGain(effect.gain, context),
        gainVp: effect.gainVp === undefined ? 0 : amountFor(effect.gainVp, context.source),
        ...(effect.takeContracts
          ? {
              takeContracts: {
                amount: amountFor(effect.takeContracts.amount, context.source),
                sourcePool: effect.takeContracts.sourcePool,
              },
            }
          : {}),
        optional: effect.optional ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentTopDeckSelections(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentTopDeckSelection[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "select-top-deck-cards")
      .map((effect) => {
        const lookCards = amountFor(effect.lookCards, context.source);
        const drawCards = amountFor(effect.drawCards, context.source);
        const discardCards = amountFor(effect.discardCards, context.source);
        const trashCards = amountFor(effect.trashCards, context.source);
        if (drawCards + discardCards + trashCards !== lookCards) {
          throw new Error(`Unsupported select-top-deck-cards assignment count "${drawCards}+${discardCards}+${trashCards}/${lookCards}"`);
        }
        return {
          selector: effect.selector,
          lookCards,
          drawCards,
          discardCards,
          trashCards,
          minimumDeckCards: effect.minimumDeckCards === undefined
            ? lookCards
            : amountFor(effect.minimumDeckCards, context.source),
          source: effect.source,
        };
      });
  });
}

export function resolveAgentTrashIntrigueForRewards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentTrashIntrigueForReward[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-intrigue-for-reward")
      .map((effect) => ({
        selector: effect.selector,
        cost: resolvedResourceGain(effect.cost, context),
        drawIntrigues: effect.drawIntrigues === undefined ? 0 : amountFor(effect.drawIntrigues, context.source),
        gain: resolvedResourceGain(effect.gain, context),
        gainVp: effect.gainVp === undefined ? 0 : amountFor(effect.gainVp, context.source),
        optional: effect.optional ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentGainInfluenceChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentGainInfluenceChoice[] {
  if (context.trigger !== "agent-play") return [];
  return resolveGainInfluenceChoices(specs, context);
}

export function resolveAgentBoardSpaceInfluences(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentBoardSpaceInfluence[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "gain-board-space-influence")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        trashSource: effect.trashSource ?? false,
        requiredHandTrashTrait: effect.requiredHandTrashTrait,
        source: effect.source,
      }));
  });
}

export function resolveGainInfluenceChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentGainInfluenceChoice[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "gain-influence-choice")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentOpponentsDiscardCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentOpponentsDiscardCards[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "opponents-discard-cards")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        source: effect.source,
      }));
  });
}

export function resolveAgentAcquireCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentAcquireCard[] {
  if (context.trigger !== "agent-play") return [];
  return resolveAcquireCards(specs, context);
}

export function resolveAcquireCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentAcquireCard[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "acquire-card")
      .map((effect) => ({
        selector: effect.selector,
        ...(effect.minCost !== undefined ? { minCost: amountFor(effect.minCost, context.source) } : {}),
        ...(effect.maxCost !== undefined ? { maxCost: amountFor(effect.maxCost, context.source) } : {}),
        destination: effect.destination,
        paymentResource: effect.paymentResource,
        optional: effect.optional ?? false,
        source: effect.source,
      }));
  });
}

export function resolveDiscardCardEffects(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): DiscardCardEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-card")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        optional: effect.optional ?? false,
        source: effect.source,
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
        persuasionCost: effect.persuasionCost !== undefined ? amountFor(effect.persuasionCost, context.source) : 0,
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

export function resolveTakeContracts(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): TakeContractsEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "take-contracts")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        sourcePool: effect.sourcePool,
        optional: effect.optional === true,
        source: effect.source,
      }));
  });
}

export function resolveManipulateRowCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): ManipulateRowCardEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "manipulate-row-card")
      .map((effect) => ({
        selector: effect.selector,
        source: effect.source,
      }));
  });
}

export function resolveCombatSpyRecallForStrengths(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): CombatSpyRecallForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "combat-intrigue") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "recall-spy")
      .flatMap((effect) => {
        if (effect.amount === undefined || effect.strengthReward === undefined) {
          throw new Error("Unsupported Combat Intrigue recall-spy effect without amount and strengthReward");
        }
        const amount = amountFor(effect.amount, context.source);
        if (
          context.state?.spyPosts &&
          context.state.sharedSpyPosts &&
          spyPostCount(
            { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
            context.source.id,
          ) < amount
        ) {
          return [];
        }
        return {
          selector: effect.selector,
          amount,
          strength: amountFor(effect.strengthReward, context.source),
          optional: effect.optional ?? false,
          source: effect.source,
        };
      });
  });
}

export function resolveCombatInfluenceLossForStrengths(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): CombatInfluenceLossForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "combat-intrigue") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "lose-influence-for-strength")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        strength: amountFor(effect.strengthReward, context.source),
        owner: effect.owner,
        alternateOwner: effect.alternateOwner,
        optional: true,
        source: effect.source,
      }));
  });
}

export function resolvePlotDeployTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): PlotDeployTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "plot-intrigue") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "deploy-troops")
      .map((effect) => ({
        selector: effect.selector,
        max: effect.max,
        source: effect.source,
      }));
  });
}

export function resolvePlotSummonSandworms(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): PlotSummonSandworms[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "plot-intrigue") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "summon-sandworms")
      .map((effect) => ({
        selector: effect.selector,
        amount: effect.amount,
        source: effect.source,
      }));
  });
}

export function resolveCombatRetreatTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): CombatRetreatTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "combat-intrigue") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "retreat-troops")
      .flatMap((effect) => {
        const count = context.selectedTroopCount;
        const max = retreatBoundFor(effect.max, context);
        if (
          count === undefined ||
          !Number.isInteger(count) ||
          count < effect.min ||
          count > max
        ) {
          return [];
        }
        return {
          selector: effect.selector,
          count,
          min: effect.min,
          max,
          source: effect.source,
        };
      });
  });
}

export function resolveAgentPayResourceForDrawCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForDrawCards[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-draw-cards")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        drawCards: amountFor(effect.drawCards, context.source),
        optional: true,
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
