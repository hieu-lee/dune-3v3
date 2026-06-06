import { boardSpaceInfluenceChoicesFor } from "./board-influence-effect-rules";
import {
  canMoveCardToThroneRow,
} from "./card-identifiers";
import { cardHasTrait } from "./card-traits";
import {
  canPayResourceCost,
  playersWithPendingCardEffect,
  potentialDeferredResourcesForCost,
  sameTeamAllies,
} from "./card-pending-helpers";
import { pendingActionForAgentPaidRewardChoice } from "./card-paid-reward-pending-rules";
import {
  pendingActionForAgentPayResourceForContracts,
  pendingActionForAgentPayResourceForDrawCards,
  pendingActionForAgentPayResourceForInfluence,
  pendingActionForAgentPayResourceForSandworms,
  pendingActionForAgentPayTeamResourceForVp,
} from "./card-payment-pending-rules";
import {
  resolveAgentBoardSpaceInfluences,
  resolveAgentCommanderResourceSplits,
  resolveAgentDiscardCardsForRewards,
  resolveAgentDiscardCardForDraws,
  resolveAgentDiscardCardForInfluenceAndDraws,
  resolveAgentGainInfluenceChoices,
  resolveAgentMoveCardToThroneRows,
  resolveAgentOpponentsDiscardCards,
  resolveAgentPendingActionChoices,
  resolveTakeContracts,
  resolveAgentTrashIntrigueForRewards,
  resolveAgentTrashSourceForTrades,
  resolveAgentTopDeckSelections,
  resolveTrashCardEffects,
  resolveCardEffects,
  resolveAgentAcquireCards,
} from "./effect-resolver";
import { discardCardForDrawChoices } from "./discard-draw-rules";
import { discardCardForInfluenceAndDrawChoices } from "./discard-influence-draw-rules";
import { discardCardsForRewardChoices } from "./discard-reward-rules";
import { changeAllegiancesGainChoices } from "./influence-choices";
import { influenceEffectOwnerForChoice } from "./influence-loss-rules";
import {
  pendingActionForFeydPersonalTraining,
} from "./feyd-training-rules";
import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  pendingActionChoiceOptionIsResolvable,
} from "./pending-action-choice-rules";
import {
  trashableCardsForPending,
} from "./trash-rules";
import {
  mergedSpyPlacement,
  spyPendingForPlacement,
} from "./spy-effect-pending-rules";
import type {
  BoardSpace,
  Card,
  GameState,
  IconId,
  PendingAction,
  PendingActionChoiceNestedPending,
  PendingActionChoicePendingOption,
  Player,
} from "./types";

export const stabanUnseenNetworkSource = "Unseen Network";
export const stabanUnseenNetworkFactionIcons: IconId[] = ["emperor", "spacing", "bene", "fremen"];

function pendingActionForAgentSpyPlacement(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const result = resolveCardEffects([card], {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  const sourcePlacement = mergedSpyPlacement(card.name, result.spyPlacements);
  const allyPlacement = mergedSpyPlacement(card.name, result.activatedAlly.spyPlacements);
  if (sourcePlacement && allyPlacement) {
    throw new Error(`Unsupported mixed spy placement owners for ${card.name}`);
  }
  if (sourcePlacement) {
    return spyPendingForPlacement(card.name, source, sourcePlacement, effectState);
  }
  if (allyPlacement && target) {
    return spyPendingForPlacement(card.name, target, allyPlacement, effectState);
  }
  return undefined;
}

function pendingActionForAgentDiscardCardForInfluenceAndDraw(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentDiscardCardForInfluenceAndDraws(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.drawCards <= 0 || effect.influenceAmount <= 0) return undefined;
      if (source.hand.length === 0 || discardCardForInfluenceAndDrawChoices(source).length === 0) return undefined;
      return {
        kind: "discard-card-for-influence-and-draw",
        ownerId: source.id,
        ...(source.role === "Commander" && target ? { influenceOwnerId: target.id } : {}),
        source: card.name,
        drawCards: effect.drawCards,
        influenceAmount: effect.influenceAmount,
        optional: effect.optional,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentDiscardCardForDraw(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentDiscardCardForDraws(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      const maxDrawCards = effect.drawCards + (effect.bonusDraw?.drawCards ?? 0);
      const maxIntrigues = (effect.drawIntrigues ?? 0) + (effect.bonusIntrigues?.amount ?? 0);
      if (effect.selector !== "self" || (maxDrawCards <= 0 && maxIntrigues <= 0)) return undefined;
      const pending: Extract<PendingAction, { kind: "discard-card-for-draw" }> = {
        kind: "discard-card-for-draw",
        ownerId: source.id,
        source: card.name,
        drawCards: effect.drawCards,
        ...(effect.drawIntrigues !== undefined ? { drawIntrigues: effect.drawIntrigues } : {}),
        optional: effect.optional,
        ...(effect.bonusDraw ? { bonusDraw: { ...effect.bonusDraw } } : {}),
        ...(effect.bonusIntrigues ? { bonusIntrigues: { ...effect.bonusIntrigues } } : {}),
      };
      if (discardCardForDrawChoices(source, pending).length === 0) return undefined;
      return pending;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentDiscardCardsForReward(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentDiscardCardsForRewards(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.amount <= 0 || effect.gainVp < 0) return undefined;
      if (!canPayResourceCost(source.resources, effect.cost)) return undefined;
      const pending: Extract<PendingAction, { kind: "discard-cards-for-reward" }> = {
        kind: "discard-cards-for-reward",
        ownerId: source.id,
        source: effect.source ?? card.name,
        remaining: effect.amount,
        total: effect.amount,
        cost: { ...effect.cost },
        gain: { ...effect.gain },
        gainVp: effect.gainVp,
        ...(effect.takeContracts ? { takeContracts: { ...effect.takeContracts } } : {}),
        optional: effect.optional,
      };
      if (discardCardsForRewardChoices(source, pending).length < effect.amount) return undefined;
      if (
        effect.takeContracts &&
        (!state ||
          effect.takeContracts.sourcePool !== "public-offer" ||
          state.contractOffer.length < effect.takeContracts.amount)
      ) {
        return undefined;
      }
      return pending;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function hasResourceGain(gain: Partial<Record<keyof Player["resources"], number>>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function pendingActionForAgentTrashIntrigueForReward(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
  futureIntrigues = 0,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentTrashIntrigueForRewards(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (
        effect.selector !== "self" ||
        (effect.drawIntrigues <= 0 && !hasResourceGain(effect.gain) && effect.gainVp <= 0)
      ) return undefined;
      if (source.intrigues.length + futureIntrigues <= 0) return undefined;
      const deferredResources = potentialDeferredResourcesForCost(state, source, target, space, effect.cost);
      if (!canPayResourceCost(source.resources, effect.cost, deferredResources)) return undefined;
      return {
        kind: "trash-intrigue-for-reward",
        ownerId: source.id,
        source: effect.source ?? card.name,
        cost: { ...effect.cost },
        drawIntrigues: effect.drawIntrigues,
        gain: { ...effect.gain },
        gainVp: effect.gainVp,
        optional: effect.optional,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentGainInfluenceChoice(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  const sourceCardInPlay = source.playArea.find((candidate) => candidate.id === card.id);
  if (!card.effects || !sourceCardInPlay) return undefined;
  if (!state) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentGainInfluenceChoices(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.amount <= 0) return undefined;
      if (effect.trashSource && !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
      const choices = changeAllegiancesGainChoices(source).flatMap((faction) => {
        const ownerResult = influenceEffectOwnerForChoice(effectState, source, faction, target?.id);
        return ownerResult.valid && ownerResult.owner ? [{ ownerId: ownerResult.owner.id, faction }] : [];
      });
      if (choices.length === 0) return undefined;
      return {
        kind: "board-influence-choice",
        source: effect.source ?? card.name,
        sourceEffect: "gain-influence-choice",
        amount: effect.amount,
        cardId: card.id,
        cardOwnerId: source.id,
        ...(sourceCardInPlay.agentPlacementSpaceId ? { spaceId: sourceCardInPlay.agentPlacementSpaceId } : {}),
        ...(source.role === "Commander" && (sourceCardInPlay.agentPlacementTargetOwnerId ?? target?.id)
          ? { targetOwnerId: sourceCardInPlay.agentPlacementTargetOwnerId ?? target?.id }
          : {}),
        ...(effect.trashSource ? { trashSource: true } : {}),
        choices,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentBoardSpaceInfluence(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  const sourceCardInPlay = source.playArea.find((candidate) => candidate.id === card.id);
  if (!card.effects || !sourceCardInPlay || !state || !space) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentBoardSpaceInfluences(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.amount <= 0) return undefined;
      if (effect.trashSource && !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
      if (
        effect.requiredHandTrashTrait &&
        !source.hand.some((candidate) => cardHasTrait(candidate, effect.requiredHandTrashTrait ?? ""))
      ) {
        return undefined;
      }
      const choices = boardSpaceInfluenceChoicesFor(space, source, target);
      if (choices.length === 0) return undefined;
      return {
        kind: "board-influence-choice",
        source: effect.source ?? card.name,
        sourceEffect: "gain-board-space-influence",
        amount: effect.amount,
        cardId: card.id,
        cardOwnerId: source.id,
        ...(sourceCardInPlay.agentPlacementSpaceId ? { spaceId: sourceCardInPlay.agentPlacementSpaceId } : {}),
        ...(source.role === "Commander" && (sourceCardInPlay.agentPlacementTargetOwnerId ?? target?.id)
          ? { targetOwnerId: sourceCardInPlay.agentPlacementTargetOwnerId ?? target?.id }
          : {}),
        ...(effect.trashSource ? { trashSource: true } : {}),
        ...(effect.requiredHandTrashTrait ? { requiredHandTrashTrait: effect.requiredHandTrashTrait } : {}),
        choices,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionsForAgentOpponentsDiscardCards(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction[] {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return [];
  if (!state) return [];
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentOpponentsDiscardCards(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  const discardCountsByOwner = new Map<string, number>();
  const sourceLabelsByOwner = new Map<string, string[]>();
  for (const effect of effects) {
    if (effect.selector !== "self" || effect.amount <= 0) continue;
    for (const player of effectState.players) {
      if (player.team === source.team || player.hand.length === 0) continue;
      discardCountsByOwner.set(player.id, (discardCountsByOwner.get(player.id) ?? 0) + effect.amount);
      const sourceLabels = sourceLabelsByOwner.get(player.id) ?? [];
      const sourceLabel = effect.source ?? card.name;
      if (!sourceLabels.includes(sourceLabel)) sourceLabels.push(sourceLabel);
      sourceLabelsByOwner.set(player.id, sourceLabels);
    }
  }
  return effectState.players.flatMap((player): PendingAction[] => {
    const discardCount = discardCountsByOwner.get(player.id) ?? 0;
    if (discardCount <= 0 || player.hand.length === 0) return [];
    const sourceLabels = sourceLabelsByOwner.get(player.id) ?? [card.name];
    return [{
      kind: "discard-hand-card",
      ownerId: player.id,
      source: sourceLabels.join(" / "),
      remaining: Math.min(discardCount, player.hand.length),
    }];
  });
}

function pendingActionForAgentAcquireCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentAcquireCards(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
    space,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || (effect.destination !== "hand" && effect.destination !== "discard")) return undefined;
      const pendingBase = {
        kind: "acquire-card" as const,
        ownerId: source.id,
        source: effect.source ?? card.name,
        ...(effect.minCost !== undefined ? { minCost: effect.minCost } : {}),
        destination: effect.destination,
        optional: effect.optional,
      };
      const pending: Extract<PendingAction, { kind: "acquire-card" }> | undefined =
        effect.paymentResource !== undefined
          ? {
              ...pendingBase,
              ...(effect.maxCost !== undefined ? { maxCost: effect.maxCost } : {}),
              paymentResource: effect.paymentResource,
            }
          : effect.maxCost !== undefined
            ? { ...pendingBase, maxCost: effect.maxCost }
            : undefined;
      if (!pending) return undefined;
      return acquirableCardsForPending(effectState, pending).length > 0 ? pending : undefined;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionChoiceNestedPendingFor(
  card: Card,
  source: Player,
  state: GameState,
  option: ReturnType<typeof resolveAgentPendingActionChoices>[number]["options"][number],
  defaultSource: string,
): PendingActionChoiceNestedPending | undefined {
  const sourceLabel = option.effect.source ?? defaultSource;
  if (option.effect.kind === "acquire-card") {
    const pendingBase = {
      kind: "acquire-card" as const,
      ownerId: source.id,
      source: sourceLabel,
      ...(option.effect.minCost !== undefined ? { minCost: option.effect.minCost } : {}),
      destination: option.effect.destination,
      optional: option.effect.optional,
    };
    return option.effect.paymentResource !== undefined
      ? {
          ...pendingBase,
          ...(option.effect.maxCost !== undefined ? { maxCost: option.effect.maxCost } : {}),
          paymentResource: option.effect.paymentResource,
        }
      : option.effect.maxCost !== undefined
        ? { ...pendingBase, maxCost: option.effect.maxCost }
        : undefined;
  }
  if (option.effect.kind === "trash-card") {
    return {
      kind: "trash-card",
      ownerId: source.id,
      source: sourceLabel,
      optional: option.effect.optional,
      ...(option.effect.zones ? { zones: option.effect.zones } : {}),
      ...(option.effect.excludeSource ? { excludeCardId: card.id } : {}),
      ...(option.effect.sourceOnly ? { zones: ["playArea"], requiredCardId: card.id } : {}),
      ...(option.effect.requiredTrait ? { requiredTrait: option.effect.requiredTrait } : {}),
      ...(option.effect.spiceRewardCostThreshold !== undefined ? {
        spiceRewardCostThreshold: option.effect.spiceRewardCostThreshold,
      } : {}),
      ...(option.effect.spiceReward !== undefined ? { spiceReward: option.effect.spiceReward } : {}),
      ...(option.effect.vpReward !== undefined ? { vpReward: option.effect.vpReward } : {}),
      ...(option.effect.persuasionCost !== undefined ? { persuasionCost: option.effect.persuasionCost } : {}),
      ...(option.effect.resourceCost ? { resourceCost: option.effect.resourceCost } : {}),
    };
  }
  if (option.effect.kind === "place-spies") {
    const pending = spyPendingForPlacement(
      sourceLabel,
      source,
      {
        count: option.effect.amount,
        recallForSupply: option.effect.recallForSupply,
        mustPlace: option.effect.mustPlace,
        placementIcon: option.effect.placementIcon,
        placementIcons: option.effect.placementIcons,
        allowSharedPost: option.effect.allowSharedPost,
        source: option.effect.source,
        postPlacementAction: option.effect.postPlacementAction,
      },
      state,
    );
    return pending?.kind === "spy" ? pending : undefined;
  }
  if (option.effect.kind === "gain-persuasion") {
    return {
      kind: "gain-persuasion",
      ownerId: source.id,
      source: sourceLabel,
      amount: option.effect.amount,
    };
  }
  if (option.effect.kind === "gain-resource") {
    return {
      kind: "gain-resource",
      ownerId: source.id,
      source: sourceLabel,
      resource: option.effect.resource,
      amount: option.effect.amount,
    };
  }
  if (option.effect.kind === "gain-strength") {
    return {
      kind: "gain-strength",
      ownerId: source.id,
      combatRecipientId: source.id,
      source: sourceLabel,
      amount: option.effect.amount,
    };
  }
  const effect = option.effect as { kind?: unknown };
  throw new Error(`Unsupported pending-action-choice effect "${String(effect.kind)}"`);
}

function pendingActionForAgentPendingActionChoice(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPendingActionChoices(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
    space,
  });
  if (effects.length > 1) throw new Error(`Unsupported multiple pending action choices for ${card.name}`);
  const [effect] = effects;
  if (!effect || effect.selector !== "self") return undefined;
  const defaultSource = effect.source ?? card.name;
  const options = effect.options.flatMap((option): PendingActionChoicePendingOption[] => {
    const pending = pendingActionChoiceNestedPendingFor(card, source, effectState, option, defaultSource);
    if (!pending) return [];
    const pendingOption = {
      id: option.id,
      label: option.label,
      pending,
    };
    return pendingActionChoiceOptionIsResolvable(effectState, pendingOption) ? [pendingOption] : [];
  });
  return options.length > 0
    ? {
        kind: "pending-action-choice",
        ownerId: source.id,
        cardId: card.id,
        source: defaultSource,
        ...(effect.optional ? { optional: true } : {}),
        options,
      }
    : undefined;
}

function pendingActionForAgentTakeContracts(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || state.contractOffer.length === 0) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveTakeContracts(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
    space,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.amount !== 1 || effect.sourcePool !== "public-offer") return undefined;
      return {
        kind: "contract",
        ownerId: source.id,
        source: effect.source ?? card.name,
        publicOnly: true,
        ...(effect.optional ? { optional: true } : {}),
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentThroneRowMove(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (source.team !== "shaddam" || source.role !== "Commander") return undefined;
  if (!state?.imperiumRow.some(canMoveCardToThroneRow)) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentMoveCardToThroneRows(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self") return undefined;
      return {
        kind: "throne-row",
        ownerId: source.id,
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentCommanderResourceSplit(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (source.role !== "Commander" || target?.team !== source.team || target.role !== "Ally") return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentCommanderResourceSplits(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.options.length === 0) return undefined;
      return {
        kind: "commander-resource-split",
        commanderId: source.id,
        allyId: target.id,
        team: source.team,
        source: effect.source ?? card.name,
        options: effect.options.map((option) => ({ ...option })),
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentTrashSourceForTrade(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentTrashSourceForTrades(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.partner !== "same-team-allies") return undefined;
      const partners = sameTeamAllies(effectState.players, source);
      if (!partners) return undefined;
      return {
        kind: "trash-source-for-trade",
        ownerId: source.id,
        partnerIds: [partners[0].id, partners[1].id],
        cardId: card.id,
        resource: effect.resource,
        optional: effect.optional,
        ...(effect.partnerLocked ? { partnerLocked: true } : {}),
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentTrashSourceCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  const sourceCardsInPlay = source.playArea.filter((candidate) =>
    candidate.id === card.id &&
    (!space || candidate.agentPlacementSpaceId === space.id) &&
    (!target || candidate.agentPlacementTargetOwnerId === target.id)
  );
  if (!card.effects || sourceCardsInPlay.length !== 1) return undefined;
  const [sourceCardInPlay] = sourceCardsInPlay;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveTrashCardEffects(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || !effect.sourceOnly) return undefined;
      const pending: Extract<PendingAction, { kind: "trash-card" }> = {
        kind: "trash-card",
        ownerId: source.id,
        source: card.name,
        optional: effect.optional,
        zones: ["playArea"],
        requiredCardId: card.id,
        ...(sourceCardInPlay.agentPlacementSpaceId
          ? { requiredAgentPlacementSpaceId: sourceCardInPlay.agentPlacementSpaceId }
          : {}),
        ...(sourceCardInPlay.agentPlacementTargetOwnerId
          ? { requiredAgentPlacementTargetOwnerId: sourceCardInPlay.agentPlacementTargetOwnerId }
          : {}),
        ...(effect.drawCardsReward !== undefined ? { drawCardsReward: effect.drawCardsReward } : {}),
      };
      return trashableCardsForPending(source, pending).length > 0 ? pending : undefined;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentTrashCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveTrashCardEffects(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.sourceOnly) return undefined;
      const pending: Extract<PendingAction, { kind: "trash-card" }> = {
        kind: "trash-card",
        ownerId: source.id,
        source: card.name,
        optional: effect.optional,
        ...(effect.zones ? { zones: effect.zones } : {}),
        ...(effect.requiredTrait ? { requiredTrait: effect.requiredTrait } : {}),
      };
      return trashableCardsForPending(source, pending).length > 0 || !pending.optional ? pending : undefined;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentTopDeckSelection(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentTopDeckSelections(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self") return undefined;
      if (source.deck.length < effect.minimumDeckCards || source.deck.length < effect.lookCards) return undefined;
      return {
        kind: "top-deck-selection",
        ownerId: source.id,
        source: effect.source ?? card.name,
        lookCards: effect.lookCards,
        drawCards: effect.drawCards,
        discardCards: effect.discardCards,
        trashCards: effect.trashCards,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

export function pendingActionsForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
  futureIntrigues = 0,
): PendingAction[] {
  const typedPendings: PendingAction[] = [];
  const agentSpyPlacementPending = pendingActionForAgentSpyPlacement(card, source, state, target, space);
  if (agentSpyPlacementPending) typedPendings.push(agentSpyPlacementPending);
  const agentDiscardInfluenceDrawPending = pendingActionForAgentDiscardCardForInfluenceAndDraw(card, source, state, target);
  if (agentDiscardInfluenceDrawPending) typedPendings.push(agentDiscardInfluenceDrawPending);
  const agentDiscardDrawPending = pendingActionForAgentDiscardCardForDraw(card, source, state, target);
  if (agentDiscardDrawPending) typedPendings.push(agentDiscardDrawPending);
  const agentDiscardRewardPending = pendingActionForAgentDiscardCardsForReward(card, source, state, target);
  if (agentDiscardRewardPending) typedPendings.push(agentDiscardRewardPending);
  const agentTrashIntriguePending = pendingActionForAgentTrashIntrigueForReward(card, source, state, target, space, futureIntrigues);
  if (agentTrashIntriguePending) typedPendings.push(agentTrashIntriguePending);
  const agentGainInfluencePending = pendingActionForAgentGainInfluenceChoice(card, source, state, target);
  if (agentGainInfluencePending) typedPendings.push(agentGainInfluencePending);
  const agentBoardSpaceInfluencePending = pendingActionForAgentBoardSpaceInfluence(card, source, state, target, space);
  if (agentBoardSpaceInfluencePending) typedPendings.push(agentBoardSpaceInfluencePending);
  const agentPaidRewardChoicePending = pendingActionForAgentPaidRewardChoice(card, source, state, target, space);
  if (agentPaidRewardChoicePending) typedPendings.push(agentPaidRewardChoicePending);
  const feydTrainingPending = pendingActionForFeydPersonalTraining(card, source, state, space);
  if (feydTrainingPending) typedPendings.push(feydTrainingPending);
  const agentPendingActionChoice = pendingActionForAgentPendingActionChoice(card, source, state, target, space);
  if (agentPendingActionChoice) typedPendings.push(agentPendingActionChoice);
  const agentOpponentDiscardPendings = pendingActionsForAgentOpponentsDiscardCards(card, source, state, target);
  typedPendings.push(...agentOpponentDiscardPendings);
  const agentAcquireCardPending = pendingActionForAgentAcquireCard(card, source, state, target, space);
  if (agentAcquireCardPending) typedPendings.push(agentAcquireCardPending);
  const agentPayResourceInfluencePending = pendingActionForAgentPayResourceForInfluence(card, source, state, target, space);
  if (agentPayResourceInfluencePending) typedPendings.push(agentPayResourceInfluencePending);
  const agentPayResourceSandwormsPending = pendingActionForAgentPayResourceForSandworms(card, source, state, target, space);
  if (agentPayResourceSandwormsPending) typedPendings.push(agentPayResourceSandwormsPending);
  const agentPayResourceContractsPending = pendingActionForAgentPayResourceForContracts(card, source, state, target);
  if (agentPayResourceContractsPending) typedPendings.push(agentPayResourceContractsPending);
  const agentTakeContractsPending = pendingActionForAgentTakeContracts(card, source, state, target, space);
  if (agentTakeContractsPending) typedPendings.push(agentTakeContractsPending);
  const agentPayResourceDrawCardsPending = pendingActionForAgentPayResourceForDrawCards(card, source, state, target, space);
  if (agentPayResourceDrawCardsPending) typedPendings.push(agentPayResourceDrawCardsPending);
  const agentPayTeamResourceVpPending = pendingActionForAgentPayTeamResourceForVp(card, source, state, target, space);
  if (agentPayTeamResourceVpPending) typedPendings.push(agentPayTeamResourceVpPending);
  const agentThroneRowPending = pendingActionForAgentThroneRowMove(card, source, state, target);
  if (agentThroneRowPending) typedPendings.push(agentThroneRowPending);
  const agentCommanderResourceSplitPending = pendingActionForAgentCommanderResourceSplit(card, source, state, target);
  if (agentCommanderResourceSplitPending) typedPendings.push(agentCommanderResourceSplitPending);
  const agentTrashSourceForTradePending = pendingActionForAgentTrashSourceForTrade(card, source, state, target);
  if (agentTrashSourceForTradePending) typedPendings.push(agentTrashSourceForTradePending);
  const agentTopDeckSelectionPending = pendingActionForAgentTopDeckSelection(card, source, state, target, space);
  if (agentTopDeckSelectionPending) typedPendings.push(agentTopDeckSelectionPending);
  const agentTrashCardPending = pendingActionForAgentTrashCard(card, source, state, target, space);
  if (agentTrashCardPending) typedPendings.push(agentTrashCardPending);
  const agentTrashSourceCardPending = pendingActionForAgentTrashSourceCard(card, source, state, target, space);
  if (agentTrashSourceCardPending) typedPendings.push(agentTrashSourceCardPending);
  if (typedPendings.length > 0) return typedPendings;
  return [];
}

export function pendingActionForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  return pendingActionsForCard(card, source, state, target, space)[0];
}
