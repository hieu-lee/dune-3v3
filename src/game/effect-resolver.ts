import { validateSpec } from "./effect-spec-validation";
import {
  addInfluenceAmount,
  addResourceSpend,
  addRevealGain,
  amountFor,
  hasResourceGain,
  mergeEffectSourceLabel,
  retreatBoundFor,
  selectorApplies,
  specApplies,
  unsupportedKind,
} from "./effect-resolver-helpers";
import {
  emptyEffectResult,
  emptyPlayerEffectResult,
} from "./effect-resolver-types";
import type {
  Card,
  CardEffectSpec,
  FactionId,
  GameEffectSpec,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
} from "./types";
import type {
  EffectResolverState,
  GameEffectContext,
  GameEffectResult,
  PlayerEffectResult,
  SpyPlacementEffectResult,
} from "./effect-resolver-types";

export {
  resolveAgentPaidRewardChoices,
  resolveAgentPendingActionChoices,
  resolveLeaderTransitionChoices,
} from "./effect-choice-resolver";
export * from "./effect-pending-resolver";
export type {
  AgentAcquireCard,
  AgentBoardSpaceInfluence,
  AgentCommanderResourceSplit,
  AgentDiscardCardsForReward,
  AgentDiscardCardForDraw,
  AgentDiscardCardForInfluenceAndDraw,
  AgentGainInfluenceChoice,
  AgentMoveCardToThroneRow,
  AgentOpponentsDiscardCards,
  AgentPaidRewardChoice,
  AgentPendingActionChoice,
  AgentPayResourceForContracts,
  AgentPayResourceForDrawCards,
  AgentPayResourceForInfluence,
  AgentPayResourceForSandworms,
  AgentPayTeamResourceForVp,
  AgentTrashIntrigueForReward,
  AgentTrashSourceForTrade,
  CombatInfluenceLossForStrength,
  CombatRetreatTroops,
  CombatSpyRecallForStrength,
  DeferredAgentIntrigueDraw,
  DiscardCardEffect,
  EffectResolverState,
  GameEffectContext,
  GameEffectResult,
  InfluenceAdjustmentEffect,
  LeaderTransitionChoice,
  ManipulateRowCardEffect,
  PlotDeployTroops,
  PlotSummonSandworms,
  RevealLoseInfluenceForIntrigues,
  RevealPayResourceForHighCouncilSeat,
  RevealPayResourceForSandworms,
  RevealPayResourceForStrength,
  RevealPayResourceForTroops,
  RevealDeployOrRetreatTroops,
  RevealRetreatTroops,
  RevealRetreatTroopsForStrength,
  RevealSpyRecallForStrength,
  RevealTrashCardEffect,
  SpyPlacementEffectResult,
  SpyRecallEffectResult,
  TakeContractsEffect,
  TrashCardEffect,
} from "./effect-resolver-types";

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

function addSelectedResourceSpend(
  result: GameEffectResult,
  selector: PlayerSelector,
  resource: ResourceId,
  amount: number,
) {
  if (selector === "self") {
    return {
      ...result,
      spentResources: addResourceSpend(result.spentResources, resource, amount),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        spentResources: addResourceSpend(result.activatedAlly.spentResources, resource, amount),
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

function addSelectedInfluenceGain(
  result: GameEffectResult,
  selector: PlayerSelector,
  faction: FactionId,
  amount: number,
) {
  if (selector === "self") {
    return {
      ...result,
      influenceGains: addInfluenceAmount(result.influenceGains, faction, amount),
      influenceAdjustments: [...result.influenceAdjustments, { selector, faction, amount }],
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      influenceAdjustments: [...result.influenceAdjustments, { selector, faction, amount }],
      activatedAlly: {
        ...result.activatedAlly,
        influenceGains: addInfluenceAmount(result.activatedAlly.influenceGains, faction, amount),
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
  if (effect.kind === "spend-resource") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedResourceSpend(result, effect.selector, effect.resource, amount);
  }
  if (effect.kind === "lose-influence") {
    const amount = amountFor(effect.amount, context.source);
    return {
      ...result,
      influenceLosses: addInfluenceAmount(result.influenceLosses, effect.faction, amount),
      influenceAdjustments: [
        ...result.influenceAdjustments,
        { selector: effect.selector, faction: effect.faction, amount: -amount },
      ],
    };
  }
  if (effect.kind === "gain-influence") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedInfluenceGain(result, effect.selector, effect.faction, amount);
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
  if (effect.kind === "gain-vp") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, vp: result.vp + amount };
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
  if (effect.kind === "discard-card") {
    return result;
  }
  if (effect.kind === "activate-acquire-recruit-bonus") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, acquireRecruitBonus: result.acquireRecruitBonus + amount };
  }
  if (effect.kind === "remove-shield-wall") {
    return { ...result, removeShieldWall: true };
  }
  if (effect.kind === "gain-influence-choice") {
    return result;
  }
  if (effect.kind === "gain-board-space-influence") {
    return result;
  }
  if (effect.kind === "paid-reward-choice") {
    return result;
  }
  if (effect.kind === "pending-action-choice") {
    return result;
  }
  if (effect.kind === "acquire-card") {
    return result;
  }
  if (effect.kind === "recruit-troops") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRecruitedTroops(result, effect.selector, amount, effect.source);
  }
  if (effect.kind === "deploy-recruited-troops") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    return {
      ...result,
      deployRecruitedTroops: true,
      deployRecruitedTroopsSource: effect.source ?? result.deployRecruitedTroopsSource,
    };
  }
  if (effect.kind === "deploy-troops") {
    return result;
  }
  if (effect.kind === "summon-sandworms") {
    return result;
  }
  if (effect.kind === "retreat-troops-for-strength") {
    return result;
  }
  if (effect.kind === "deploy-or-retreat-troops") {
    return result;
  }
  if (effect.kind === "retreat-troops") {
    return result;
  }
  if (effect.kind === "trash-card") {
    return result;
  }
  if (effect.kind === "lose-influence-for-intrigues") {
    return result;
  }
  if (effect.kind === "lose-influence-for-strength") {
    return result;
  }
  if (effect.kind === "pay-resource-for-strength") {
    return result;
  }
  if (effect.kind === "pay-resource-for-troops") {
    return result;
  }
  if (effect.kind === "pay-resource-for-draw-cards") {
    return result;
  }
  if (effect.kind === "discard-card-for-influence-and-draw") {
    return result;
  }
  if (effect.kind === "discard-card-for-draw") {
    return result;
  }
  if (effect.kind === "discard-cards-for-reward") {
    return result;
  }
  if (effect.kind === "select-top-deck-cards") {
    return result;
  }
  if (effect.kind === "trash-intrigue-for-reward") {
    return result;
  }
  if (effect.kind === "opponents-discard-cards") {
    return result;
  }
  if (effect.kind === "pay-resource-for-influence") {
    return result;
  }
  if (effect.kind === "pay-resource-for-sandworms") {
    return result;
  }
  if (effect.kind === "pay-resource-for-high-council-seat") {
    return result;
  }
  if (effect.kind === "pay-resource-for-contracts") {
    return result;
  }
  if (effect.kind === "take-contracts") {
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
  if (effect.kind === "return-source-to-hand") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    return {
      ...result,
      returnSourceToHand: true,
      returnSourceToHandSource: effect.source ?? result.returnSourceToHandSource,
    };
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
  if (effect.kind === "recall-agent") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (result.recalledAgents > 0) {
      throw new Error("Unsupported multiple recall-agent effects");
    }
    return {
      ...result,
      recalledAgents: result.recalledAgents + 1,
      recalledAgentSource: mergeEffectSourceLabel(
        result.recalledAgents > 0,
        result.recalledAgentSource,
        true,
        effect.source,
      ),
    };
  }
  if (effect.kind === "manipulate-row-card") {
    return result;
  }
  if (effect.kind === "recall-spy") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    if (!context.space?.id) return result;
    const rewardAmount = effect.reward ? amountFor(effect.reward.amount, context.source) : 0;
    const withRecall = {
      ...result,
      removeShieldWall: result.removeShieldWall || effect.removeShieldWall === true,
      spyRecalls: [
        ...result.spyRecalls,
        {
          spaceId: context.space.id,
          source: effect.source,
        },
      ],
    };
    return effect.reward
      ? addSelectedRevealGain(withRecall, effect.selector, effect.reward.resource, rewardAmount, effect.source)
      : withRecall;
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
  if (result.recalledAgents + next.recalledAgents > 1) {
    throw new Error("Unsupported multiple recall-agent effects");
  }
  return {
    acquireRecruitBonus: result.acquireRecruitBonus + next.acquireRecruitBonus,
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    drawCardsSource: mergeEffectSourceLabel(
      result.cardsToDraw > 0,
      result.drawCardsSource,
      next.cardsToDraw > 0,
      next.drawCardsSource,
    ),
    blocksDeploymentsThisTurn: result.blocksDeploymentsThisTurn || next.blocksDeploymentsThisTurn,
    deploymentBlockSource: result.deploymentBlockSource ?? next.deploymentBlockSource,
    influenceGains: Object.entries(next.influenceGains ?? {}).reduce(
      (gains, [faction, amount]) => addInfluenceAmount(gains, faction as FactionId, amount ?? 0),
      result.influenceGains,
    ),
    influenceAdjustments: [...result.influenceAdjustments, ...next.influenceAdjustments],
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    influenceLosses: Object.entries(next.influenceLosses ?? {}).reduce(
      (losses, [faction, amount]) => addInfluenceAmount(losses, faction as FactionId, amount ?? 0),
      result.influenceLosses,
    ),
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    recruitedTroopsSource: mergeEffectSourceLabel(
      result.recruitedTroops > 0,
      result.recruitedTroopsSource,
      next.recruitedTroops > 0,
      next.recruitedTroopsSource,
    ),
    persuasion: result.persuasion + next.persuasion,
    recalledAgents: result.recalledAgents + next.recalledAgents,
    recalledAgentSource: mergeEffectSourceLabel(
      result.recalledAgents > 0,
      result.recalledAgentSource,
      next.recalledAgents > 0,
      next.recalledAgentSource,
    ),
    returnSourceToHand: result.returnSourceToHand || next.returnSourceToHand,
    returnSourceToHandSource: result.returnSourceToHandSource ?? next.returnSourceToHandSource,
    deployRecruitedTroops: result.deployRecruitedTroops || next.deployRecruitedTroops,
    deployRecruitedTroopsSource: result.deployRecruitedTroopsSource ?? next.deployRecruitedTroopsSource,
    removeShieldWall: result.removeShieldWall || next.removeShieldWall,
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
    spentResources: Object.entries(next.spentResources ?? {}).reduce(
      (spent, [resource, amount]) => addResourceSpend(spent, resource as ResourceId, amount ?? 0),
      result.spentResources,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
    spyRecalls: [...result.spyRecalls, ...next.spyRecalls],
    swords: result.swords + next.swords,
    vp: result.vp + next.vp,
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
    influenceGains: Object.entries(next.influenceGains ?? {}).reduce(
      (gains, [faction, amount]) => addInfluenceAmount(gains, faction as FactionId, amount ?? 0),
      result.influenceGains,
    ),
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
    spentResources: Object.entries(next.spentResources ?? {}).reduce(
      (spent, [resource, amount]) => addResourceSpend(spent, resource as ResourceId, amount ?? 0),
      result.spentResources,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
  };
}

export function resolveCardEffects(cards: Array<{ effects?: CardEffectSpec[] }>, context: GameEffectContext): GameEffectResult {
  return cards.reduce((result, card) => mergeEffectResult(result, resolveGameEffects(card.effects, context)), emptyEffectResult);
}

function legacyRevealResult(card: Card): GameEffectResult {
  return {
    acquireRecruitBonus: 0,
    cardsToDraw: 0,
    blocksDeploymentsThisTurn: false,
    influenceLosses: {},
    influenceGains: {},
    influenceAdjustments: [],
    intriguesToDraw: 0,
    recruitedTroops: 0,
    persuasion: card.persuasion,
    recalledAgents: 0,
    returnSourceToHand: false,
    deployRecruitedTroops: false,
    removeShieldWall: false,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
    spentResources: {},
    spyPlacements: [],
    spyRecalls: [],
    swords: card.swords,
    vp: 0,
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

function legacyAcquireResult(card: Card): GameEffectResult {
  return {
    acquireRecruitBonus: 0,
    cardsToDraw: 0,
    blocksDeploymentsThisTurn: false,
    influenceLosses: {},
    influenceGains: {},
    influenceAdjustments: [],
    intriguesToDraw: 0,
    recruitedTroops: 0,
    persuasion: 0,
    recalledAgents: 0,
    returnSourceToHand: false,
    deployRecruitedTroops: false,
    removeShieldWall: false,
    revealGain: {},
    spentResources: {},
    spyPlacements: [],
    spyRecalls: [],
    swords: 0,
    vp: card.acquired ?? 0,
    activatedAlly: emptyPlayerEffectResult,
  };
}

export function resolveCardAcquireEffects(
  card: Card,
  source: Player,
  state?: EffectResolverState,
): GameEffectResult {
  card.effects?.forEach(validateSpec);
  const acquireSpecs = card.effects?.filter((spec) => spec.trigger === "acquire");
  return acquireSpecs && acquireSpecs.length > 0
    ? resolveGameEffects(acquireSpecs, { trigger: "acquire", source, state })
    : legacyAcquireResult(card);
}
