import { resolveInfluence } from "./agent-effects";
import {
  canMoveCardToThroneRow,
} from "./card-identifiers";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
} from "./conflict-rules";
import { playerTroopSupply } from "./deck-utils";
import {
  resolveAgentCommanderResourceSplits,
  resolveAgentDiscardCardForDraws,
  resolveAgentDiscardCardForInfluenceAndDraws,
  resolveAgentGainInfluenceChoices,
  resolveAgentMoveCardToThroneRows,
  resolveAgentOpponentsDiscardCards,
  resolveAgentPaidRewardChoices,
  resolveAgentPendingActionChoices,
  resolveAgentPayResourceForContracts,
  resolveAgentPayResourceForDrawCards,
  resolveAgentPayResourceForInfluences,
  resolveAgentPayResourceForSandworms,
  resolveAgentPayTeamResourceForVps,
  resolveAgentTrashSourceForTrades,
  resolveTrashCardEffects,
  resolveCardEffects,
  resolveAgentAcquireCards,
} from "./effect-resolver";
import { discardCardForDrawChoices } from "./discard-draw-rules";
import { discardCardForInfluenceAndDrawChoices } from "./discard-influence-draw-rules";
import { changeAllegiancesGainChoices } from "./influence-choices";
import { influenceEffectOwnerForChoice } from "./influence-loss-rules";
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
  PaidRewardChoicePendingOption,
  PaidRewardChoicePendingAtomicReward,
  PaidRewardChoicePendingReward,
  PendingAction,
  PendingActionChoiceNestedPending,
  PendingActionChoicePendingOption,
  Player,
  SandwormEffectRecipient,
} from "./types";

export const stabanUnseenNetworkSource = "Unseen Network";
export const stabanUnseenNetworkFactionIcons: IconId[] = ["emperor", "spacing", "bene", "fremen"];

function sameTeamAllies(players: Player[], source: Player): [Player, Player] | undefined {
  const allies = players.filter((player) => player.team === source.team && player.role === "Ally");
  if (allies.length < 2) return undefined;
  return [allies[0], allies[1]];
}

function playersWithPendingCardEffect(state: GameState, source: Player, target?: Player) {
  return state.players.map((player) => {
    if (player.id === source.id) return source;
    if (target && player.id === target.id) return target;
    return player;
  });
}

function potentialDeferredMakerChoiceSpice(state: GameState, source: Player, target: Player | undefined, space: BoardSpace) {
  const spice = space.gain?.spice ?? 0;
  const owner = source.role === "Commander" ? target : source;
  if (!space.makerWorms || spice <= 0 || !owner || !canSummonSandworms(state, owner, space.makerWorms)) {
    return 0;
  }
  return spice;
}

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
      if (effect.selector !== "self" || maxDrawCards <= 0) return undefined;
      const pending: Extract<PendingAction, { kind: "discard-card-for-draw" }> = {
        kind: "discard-card-for-draw",
        ownerId: source.id,
        source: card.name,
        drawCards: effect.drawCards,
        optional: effect.optional,
        ...(effect.bonusDraw ? { bonusDraw: { ...effect.bonusDraw } } : {}),
      };
      if (discardCardForDrawChoices(source, pending).length === 0) return undefined;
      return pending;
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

function paidRewardChoiceRecipientFor(source: Player, target: Player | undefined, selector: "self" | "activated-ally") {
  if (selector === "self") return source;
  if (
    source.role === "Commander" &&
    target?.role === "Ally" &&
    target.team === source.team
  ) {
    return target;
  }
  return undefined;
}

function potentialDeferredPaidRewardResource(
  state: GameState | undefined,
  source: Player,
  target: Player | undefined,
  space: BoardSpace | undefined,
  resource: PaidRewardChoicePendingOption["resource"],
) {
  if (!state || !space) return 0;
  if (resource === "spice") return potentialDeferredMakerChoiceSpice(state, source, target, space);
  if (resource === "water" && space.sietchTabr) return 1;
  return 0;
}

function pendingActionForAgentPaidRewardChoice(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentPaidRewardChoices(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  if (effects.length > 1) throw new Error(`Unsupported multiple paid reward choices for ${card.name}`);
  const [effect] = effects;
  if (!effect || effect.selector !== "self") return undefined;
  if (effect.requiredRecipient && !paidRewardChoiceRecipientFor(source, target, effect.requiredRecipient)) {
    return undefined;
  }
  const pendingRewardFor = (reward: typeof effect.options[number]["reward"]): PaidRewardChoicePendingReward | undefined => {
    if (reward.kind === "bundle") {
      const rewards = reward.rewards.map(pendingRewardFor);
      if (rewards.some((candidate) => !candidate || candidate.kind === "bundle")) return undefined;
      const atomicRewards = rewards as PaidRewardChoicePendingAtomicReward[];
      const leaderCounterTroopCostsByRecipient = new Map<string, number>();
      atomicRewards.forEach((atomicReward) => {
        if (atomicReward.kind !== "gain-leader-counter") return;
        leaderCounterTroopCostsByRecipient.set(
          atomicReward.recipientId,
          (leaderCounterTroopCostsByRecipient.get(atomicReward.recipientId) ?? 0) + atomicReward.troopSupplyCost,
        );
      });
      for (const [recipientId, troopSupplyCost] of leaderCounterTroopCostsByRecipient.entries()) {
        const recipient = [source, target].find((candidate) => candidate?.id === recipientId);
        if (!recipient || playerTroopSupply(recipient) < troopSupplyCost) return undefined;
      }
      return { kind: "bundle", rewards: atomicRewards };
    }
    const recipient = paidRewardChoiceRecipientFor(source, target, reward.selector);
    if (!recipient) return undefined;
    if (reward.kind === "gain-leader-counter") {
      if (
        reward.amount <= 0 ||
        reward.counter !== "jessicaMemories" ||
        reward.troopSupplyCost <= 0 ||
        reward.troopSupplyCost !== reward.amount ||
        playerTroopSupply(recipient) < reward.troopSupplyCost
      ) {
        return undefined;
      }
      return {
        kind: "gain-leader-counter",
        recipientId: recipient.id,
        counter: reward.counter,
        amount: reward.amount,
        troopSupplyCost: reward.troopSupplyCost,
      };
    }
    if (reward.kind === "draw-intrigues") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "draw-intrigues",
        recipientId: recipient.id,
        amount: reward.amount,
      };
    }
    if (reward.kind === "recruit-troops") {
      if (reward.amount <= 0 || reward.destination !== "garrison") return undefined;
      return {
        kind: "recruit-troops",
        recipientId: recipient.id,
        amount: reward.amount,
        destination: reward.destination,
      };
    }
    if (reward.kind === "gain-influence") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "gain-influence",
        recipientId: recipient.id,
        faction: reward.faction,
        amount: reward.amount,
      };
    }
    if (reward.kind === "gain-resource") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "gain-resource",
        recipientId: recipient.id,
        resource: reward.resource,
        amount: reward.amount,
      };
    }
    const unsupported = reward as { kind?: unknown };
    throw new Error(`Unsupported paid-reward-choice reward "${String(unsupported.kind)}"`);
  };
  const options = effect.options.flatMap((option): PaidRewardChoicePendingOption[] => {
    if (option.cost <= 0) return [];
    const deferredResource = potentialDeferredPaidRewardResource(state, source, target, space, option.resource);
    if (effect.requirePayableOption && source.resources[option.resource] + deferredResource < option.cost) return [];
    const reward = pendingRewardFor(option.reward);
    return reward ? [{
      id: option.id,
      resource: option.resource,
      cost: option.cost,
      reward,
    }] : [];
  });
  return options.length > 0
    ? {
        kind: "paid-reward-choice",
        ownerId: source.id,
        cardId: card.id,
        source: effect.source ?? card.name,
        ...(effect.requirePayableOption ? { requirePayableOption: true } : {}),
        options,
      }
    : undefined;
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
      ...(option.effect.requiredTrait ? { requiredTrait: option.effect.requiredTrait } : {}),
      ...(option.effect.spiceRewardCostThreshold !== undefined ? {
        spiceRewardCostThreshold: option.effect.spiceRewardCostThreshold,
      } : {}),
      ...(option.effect.spiceReward !== undefined ? { spiceReward: option.effect.spiceReward } : {}),
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
    const pending = pendingActionChoiceNestedPendingFor(card, source, option, defaultSource);
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
        options,
      }
    : undefined;
}

function pendingActionForAgentPayResourceForInfluence(
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
  const effects = resolveAgentPayResourceForInfluences(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.cost <= 0 || effect.amount <= 0) return undefined;
      if (source.resources[effect.resource] < effect.cost) return undefined;
      if (effect.recipient !== "board-effect-recipient") return undefined;
      const recipient = space?.personal ? source : target;
      if (!recipient) return undefined;
      if (
        recipient.team !== source.team ||
        (recipient.id !== source.id && recipient.role !== "Ally")
      ) {
        return undefined;
      }
      const faction = effect.faction === "board-space"
        ? space ? resolveInfluence(space, source) : null
        : effect.faction;
      if (!faction) return undefined;
      return {
        kind: "pay-resource-for-influence",
        ownerId: source.id,
        influenceOwnerId: recipient.id,
        resource: effect.resource,
        cost: effect.cost,
        faction,
        amount: effect.amount,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true, cardId: card.id } : {}),
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function agentSandwormPaymentRecipient(recipient: SandwormEffectRecipient, source: Player, target: Player) {
  if (recipient === "activated-ally") {
    return source.role === "Commander" && target.team === source.team && target.role === "Ally" ? target : undefined;
  }
  if (recipient === "self-or-activated-ally") {
    if (source.role !== "Commander") return source;
    return target.team === source.team && target.role === "Ally" ? target : undefined;
  }
  return undefined;
}

function pendingActionForAgentPayResourceForSandworms(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || !target || !space) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayResourceForSandworms(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
    space,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.cost <= 0 || effect.sandworms <= 0) return undefined;
      if (source.resources[effect.resource] < effect.cost) return undefined;
      if (effect.destination !== "conflict") return undefined;
      const recipient = agentSandwormPaymentRecipient(effect.recipient, source, target);
      if (!recipient) return undefined;
      if (conflictDeploymentBlockedFor(state, source.id, recipient.id) || !canSummonSandworms(state, recipient, effect.sandworms)) {
        return undefined;
      }
      return {
        kind: "pay-resource-for-sandworms",
        ownerId: source.id,
        recipientId: recipient.id,
        resource: effect.resource,
        cost: effect.cost,
        sandworms: effect.sandworms,
        strength: effect.sandworms * 3,
        destination: effect.destination,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        source: effect.source ?? card.name,
        cardId: card.id,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayResourceForContracts(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayResourceForContracts(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.recipient !== "same-team-allies" || effect.sourcePool !== "public-offer") {
        return undefined;
      }
      if (effect.cost <= 0 || effect.contractCount !== 2 || source.resources[effect.resource] < effect.cost) return undefined;
      if (state.contractOffer.length < effect.contractCount) return undefined;
      const allies = sameTeamAllies(effectState.players, source);
      if (!allies) return undefined;
      return {
        kind: "pay-resource-for-contracts",
        ownerId: source.id,
        recipientIds: [allies[0].id, allies[1].id],
        contractIds: [state.contractOffer[0].id, state.contractOffer[1].id],
        resource: effect.resource,
        cost: effect.cost,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        cardId: card.id,
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayResourceForDrawCards(
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
  const effects = resolveAgentPayResourceForDrawCards(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.cost <= 0 || effect.drawCards <= 0) return undefined;
      const deferredResource = effect.resource === "water" && space?.sietchTabr ? 1 : 0;
      if (source.resources[effect.resource] + deferredResource < effect.cost) return undefined;
      return {
        kind: "pay-resource-for-draw-cards",
        ownerId: source.id,
        resource: effect.resource,
        cost: effect.cost,
        drawCards: effect.drawCards,
        optional: effect.optional,
        source: effect.source ?? card.name,
        cardId: card.id,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayTeamResourceForVp(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayTeamResourceForVps(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.contributors !== "self-and-same-team-allies" || effect.recipient !== "self") {
        return undefined;
      }
      if (effect.cost <= 0 || effect.vp <= 0) return undefined;
      const allies = sameTeamAllies(effectState.players, source);
      if (!allies) return undefined;
      const contributors = [
        effectState.players.find((player) => player.id === source.id) ?? source,
        ...allies,
      ];
      const deferredResource = effect.resource === "spice" && space
        ? potentialDeferredMakerChoiceSpice(state, source, target, space)
        : 0;
      const totalResource =
        contributors.reduce((sum, contributor) => sum + contributor.resources[effect.resource], 0) + deferredResource;
      if (totalResource < effect.cost) return undefined;
      return {
        kind: "team-resource-payment",
        ownerId: source.id,
        contributorIds: contributors.map((contributor) => contributor.id),
        contributions: Object.fromEntries(contributors.map((contributor) => [contributor.id, 0])),
        resource: effect.resource,
        cost: effect.cost,
        vp: effect.vp,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        cardId: card.id,
        ...(space ? { spaceId: space.id } : {}),
        source: effect.source ?? card.name,
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

export function pendingActionsForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction[] {
  const typedPendings: PendingAction[] = [];
  const agentSpyPlacementPending = pendingActionForAgentSpyPlacement(card, source, state, target, space);
  if (agentSpyPlacementPending) typedPendings.push(agentSpyPlacementPending);
  const agentDiscardInfluenceDrawPending = pendingActionForAgentDiscardCardForInfluenceAndDraw(card, source, state, target);
  if (agentDiscardInfluenceDrawPending) typedPendings.push(agentDiscardInfluenceDrawPending);
  const agentDiscardDrawPending = pendingActionForAgentDiscardCardForDraw(card, source, state, target);
  if (agentDiscardDrawPending) typedPendings.push(agentDiscardDrawPending);
  const agentGainInfluencePending = pendingActionForAgentGainInfluenceChoice(card, source, state, target);
  if (agentGainInfluencePending) typedPendings.push(agentGainInfluencePending);
  const agentPaidRewardChoicePending = pendingActionForAgentPaidRewardChoice(card, source, state, target, space);
  if (agentPaidRewardChoicePending) typedPendings.push(agentPaidRewardChoicePending);
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
