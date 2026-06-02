import { resolveInfluence } from "./agent-effects";
import {
  canMoveCardToThroneRow,
  isGenericSignetRingCard,
} from "./card-identifiers";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
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
  resolveAgentPayResourceForContracts,
  resolveAgentPayResourceForDrawCards,
  resolveAgentPayResourceForInfluences,
  resolveAgentPayResourceForSandworms,
  resolveAgentPayTeamResourceForVps,
  resolveAgentTrashSourceForTrades,
  resolveCardEffects,
  resolveRevealLoseInfluenceForIntrigues,
  resolveRevealPayResourceForSandworms,
  resolveRevealPayResourceForStrengths,
  resolveRevealPayResourceForTroops,
  resolveRevealRetreatTroopsForStrength,
  resolveRevealTrashCardEffects,
  resolveAgentAcquireCards,
} from "./effect-resolver";
import { discardCardForDrawChoices } from "./discard-draw-rules";
import { discardCardForInfluenceAndDrawChoices } from "./discard-influence-draw-rules";
import { changeAllegiancesGainChoices } from "./influence-choices";
import { influenceEffectOwnerForChoice } from "./influence-loss-rules";
import { loseInfluenceForIntriguesChoices } from "./influence-intrigue-rules";
import {
  feydRauthaLeaderName,
  ladyAmberMetulliLeaderName,
  ladyJessicaLeaderName,
  princessIrulanLeaderName,
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import {
  acquirableCardsForPending,
  irulanSignetAcquireCards,
  irulanSignetTrashableCards,
} from "./market-rules";
import {
  recallableSpySpaces,
} from "./spy-choices";
import {
  mergedSpyPlacement,
  spyPendingForPlacement,
} from "./spy-effect-pending-rules";
import { trashableCardsForPending } from "./trash-rules";
import { hasUsedReverendMotherJessicaRepeat } from "./turn-trackers";
import type {
  BoardSpace,
  Card,
  FactionId,
  GameState,
  IconId,
  PaidRewardChoicePendingOption,
  PendingAction,
  Player,
} from "./types";

export const stabanUnseenNetworkSource = "Unseen Network";
export const stabanUnseenNetworkFactionIcons: IconId[] = ["emperor", "spacing", "bene", "fremen"];
type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;

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

function pendingActionForRevealSpyPlacement(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction | undefined {
  if (!card.effects) return undefined;
  const result = resolveCardEffects([card], {
    trigger: "reveal",
    source,
    state,
  });
  const sourcePlacement = mergedSpyPlacement(card.name, result.spyPlacements);
  const allyPlacement = mergedSpyPlacement(card.name, result.activatedAlly.spyPlacements);
  if (allyPlacement) {
    throw new Error(`Unsupported activated Ally reveal spy placement for ${card.name}`);
  }
  return sourcePlacement ? spyPendingForPlacement(card.name, source, sourcePlacement, state) : undefined;
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

function pendingActionForAgentPaidRewardChoice(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
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
  const options = effect.options.flatMap((option): PaidRewardChoicePendingOption[] => {
    const recipient = paidRewardChoiceRecipientFor(source, target, option.reward.selector);
    if (!recipient || option.cost <= 0) return [];
    switch (option.reward.kind) {
      case "recruit-troops":
        if (option.reward.amount <= 0 || option.reward.destination !== "garrison") return [];
        return [{
          id: option.id,
          resource: option.resource,
          cost: option.cost,
          reward: {
            kind: "recruit-troops",
            recipientId: recipient.id,
            amount: option.reward.amount,
            destination: option.reward.destination,
          },
        }];
      case "gain-influence":
        if (option.reward.amount <= 0) return [];
        return [{
          id: option.id,
          resource: option.resource,
          cost: option.cost,
          reward: {
            kind: "gain-influence",
            recipientId: recipient.id,
            faction: option.reward.faction,
            amount: option.reward.amount,
          },
        }];
      default: {
        const reward = option.reward as { kind?: unknown };
        throw new Error(`Unsupported paid-reward-choice reward "${String(reward.kind)}"`);
      }
    }
  });
  return options.length > 0
    ? {
        kind: "paid-reward-choice",
        ownerId: source.id,
        cardId: card.id,
        source: effect.source ?? card.name,
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
      if (effect.recipient !== "activated-ally" || effect.destination !== "conflict") return undefined;
      if (source.role !== "Commander" || target.team !== source.team || target.role !== "Ally") return undefined;
      if (conflictDeploymentBlockedFor(state, source.id, target.id) || !canSummonSandworms(state, target, effect.sandworms)) {
        return undefined;
      }
      return {
        kind: "pay-resource-for-sandworms",
        ownerId: source.id,
        recipientId: target.id,
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
  const agentPaidRewardChoicePending = pendingActionForAgentPaidRewardChoice(card, source, state, target);
  if (agentPaidRewardChoicePending) typedPendings.push(agentPaidRewardChoicePending);
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
  if (typedPendings.length > 0) return typedPendings;
  if (
    isGenericSignetRingCard(card) &&
    source.leader === princessIrulanLeaderName &&
    source.role === "Ally" &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    const pending: IrulanSignetRingPendingAction = {
      kind: "irulan-signet-ring",
      ownerId: source.id,
      cardId: card.id,
      source: "Chronicler's Insight",
    };
    const canAcquire = state ? irulanSignetAcquireCards(state, pending).length > 0 : false;
    const canTrash = state ? irulanSignetTrashableCards(state, pending).length > 0 : source.hand.length > 0;
    return canAcquire || canTrash ? [pending] : [];
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === ladyJessicaLeaderName &&
    source.role === "Ally" &&
    source.resources.spice + (state && space ? potentialDeferredMakerChoiceSpice(state, source, target, space) : 0) >= 1 &&
    playerTroopSupply(source) > 0 &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    return [{
      kind: "jessica-spice-agony",
      ownerId: source.id,
      cardId: card.id,
      source: "Spice Agony",
    }];
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === reverendMotherJessicaLeaderName &&
    source.role === "Ally" &&
    source.resources.spice + (state && space ? potentialDeferredMakerChoiceSpice(state, source, target, space) : 0) >= 1 &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    return [{
      kind: "jessica-water-of-life",
      ownerId: source.id,
      cardId: card.id,
      source: "Water of Life",
    }];
  }
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

export function pendingActionForJessicaOtherMemories(
  source: Player,
  space: BoardSpace,
): PendingAction | undefined {
  if (source.leader !== ladyJessicaLeaderName || source.role !== "Ally" || source.jessicaMemories <= 0 || space.icon !== "bene") return undefined;
  return {
    kind: "jessica-other-memories",
    ownerId: source.id,
    source: "Other Memories",
    spaceId: space.id,
  };
}

export function pendingActionForReverendMotherJessicaRepeat(
  state: Pick<GameState, "turnReverendMotherJessicaRepeats">,
  owner: Player,
  space: BoardSpace,
  deferredWater = 0,
): PendingAction | undefined {
  if (
    owner.leader !== reverendMotherJessicaLeaderName ||
    owner.role !== "Ally" ||
    (space.icon !== "bene" && space.icon !== "fremen") ||
    Boolean(space.personal) ||
    owner.resources.water + deferredWater < 1 ||
    hasUsedReverendMotherJessicaRepeat(state, owner.id)
  ) {
    return undefined;
  }
  return {
    kind: "jessica-reverend-mother",
    ownerId: owner.id,
    source: "Reverend Mother",
    spaceId: space.id,
  };
}

export function pendingActionsForRevealPayResourceForTroops(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction[] {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return [];

  const effectState = { ...state, players: playersWithPendingCardEffect(state, source) };
  return resolveRevealPayResourceForTroops(card.effects, {
    trigger: "reveal",
    source,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.troops <= 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    if (effect.recipient !== "same-team-allies" || effect.destination !== "garrison") return [];
    const allies = sameTeamAllies(effectState.players, source);
    if (!allies) return [];
    return [{
      kind: "pay-resource-for-troops",
      ownerId: source.id,
      recipientIds: [allies[0].id, allies[1].id],
      resource: effect.resource,
      cost: effect.cost,
      troops: effect.troops,
      destination: effect.destination,
      optional: effect.optional,
      ...(effect.trashSource ? { trashSource: true } : {}),
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

export function pendingActionsForRevealPayResourceForSandworms(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id) || !recipient) return [];
  if (source.role === "Commander" && (recipient.team !== source.team || recipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && recipient.id !== source.id) return [];

  const players = playersWithPendingCardEffect(state, source, recipient);
  const effectState = { ...state, players };
  return resolveRevealPayResourceForSandworms(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.sandworms <= 0 || effect.persuasionCost < 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    if (source.persuasion < effect.persuasionCost) return [];
    if (effect.recipient !== "combat-recipient" || effect.destination !== "conflict") return [];
    if (!canSummonSandworms(state, recipient, effect.sandworms)) return [];
    return [{
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
      ...(effect.persuasionCost > 0 ? { persuasionCost: effect.persuasionCost } : {}),
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

export function pendingActionsForRevealPayResourceForStrength(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const combatRecipient = state.players.find((player) => player.id === combatRecipientId);
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id) || !combatRecipient) return [];
  if (source.role === "Commander" && (combatRecipient.team !== source.team || combatRecipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && combatRecipient.id !== source.id) return [];
  if (!playerHasConflictUnits(combatRecipient)) return [];

  const players = playersWithPendingCardEffect(state, source, combatRecipient);
  const effectState = { ...state, players };
  return resolveRevealPayResourceForStrengths(card.effects, {
    trigger: "reveal",
    source,
    target: combatRecipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.strength <= 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    return [{
      kind: "pay-resource-for-strength",
      ownerId: source.id,
      combatRecipientId,
      resource: effect.resource,
      cost: effect.cost,
      strength: effect.strength,
      optional: effect.optional,
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

export function pendingActionsForReveal(
  source: Player,
  state: GameState,
  revealedCards: Card[],
  combatRecipientId: string,
): PendingAction[] {
  const printedRevealCards = revealedCards
    .filter((card) => card.conditionalPersuasion || card.conditionalSwords)
    .map((card) => card.name);
  const allowPersuasionAdjustment = revealedCards.some((card) => card.conditionalPersuasion);
  const allowStrengthAdjustment = revealedCards.some((card) => card.conditionalSwords);
  const revealAdjustPending: PendingAction | undefined = printedRevealCards.length > 0
    ? {
        kind: "reveal-adjust",
        ownerId: source.id,
        combatRecipientId,
        cards: printedRevealCards,
        persuasionAdjustment: 0,
        strengthAdjustment: 0,
        allowPersuasionAdjustment,
        allowStrengthAdjustment,
        source: "Printed reveal",
      }
    : undefined;
  const revealTrashCardPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealTrashCards(card, source, state, combatRecipientId)
  );
  const revealSpyPlacementPendings = revealedCards
    .map((card) => pendingActionForRevealSpyPlacement(card, source, state))
    .filter((pending): pending is PendingAction => Boolean(pending));
  const payResourceStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForStrength(card, source, state, combatRecipientId)
  );
  const payResourceTroopPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForTroops(card, source, state)
  );
  const payResourceSandwormPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForSandworms(card, source, state, combatRecipientId)
  );
  const influenceIntriguePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealInfluenceIntrigues(card, source, state, combatRecipientId)
  );
  const retreatTroopStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealRetreatTroopsForStrength(card, source, state, combatRecipientId)
  );
  const feydDeviousStrengthPending = pendingActionForFeydDeviousStrength(source, state, combatRecipientId);
  const amberDesertScoutsPending = pendingActionForLadyAmberDesertScouts(source);

  return [
    revealAdjustPending,
    ...revealSpyPlacementPendings,
    ...revealTrashCardPendings,
    ...payResourceStrengthPendings,
    ...payResourceTroopPendings,
    ...payResourceSandwormPendings,
    ...influenceIntriguePendings,
    ...retreatTroopStrengthPendings,
    feydDeviousStrengthPending,
    amberDesertScoutsPending,
  ].filter((action): action is PendingAction => Boolean(action));
}

function pendingActionsForRevealInfluenceIntrigues(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealLoseInfluenceForIntrigues(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.amount <= 0) return [];
    if (loseInfluenceForIntriguesChoices(source).length === 0) return [];
    return [{
      kind: "lose-influence-for-intrigues",
      ownerId: source.id,
      source: card.name,
      amount: effect.amount,
      optional: effect.optional,
    }];
  });
}

function pendingActionForFeydDeviousStrength(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction | undefined {
  if (source.leader !== feydRauthaLeaderName || source.role !== "Ally") return undefined;
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient || !playerHasConflictUnits(recipient)) return undefined;
  const pending: Extract<PendingAction, { kind: "recall-spy" }> = {
    kind: "recall-spy",
    ownerId: source.id,
    combatRecipientId,
    remaining: 1,
    strength: 2,
    source: "Devious Strength",
    optional: true,
  };
  return recallableSpySpaces(state, pending).length > 0 ? pending : undefined;
}

function pendingActionForLadyAmberDesertScouts(source: Player): PendingAction | undefined {
  if (
    source.leader !== ladyAmberMetulliLeaderName ||
    source.role !== "Ally" ||
    source.deployedTroops <= 0
  ) {
    return undefined;
  }
  return {
    kind: "amber-desert-scouts",
    ownerId: source.id,
    source: "Desert Scouts",
  };
}

function pendingActionsForRevealTrashCards(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealTrashCardEffects(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self") return [];
    if (effect.strengthReward !== undefined && (!recipient || !playerHasConflictUnits(recipient))) return [];
    const pending: Extract<PendingAction, { kind: "trash-card" }> = {
      kind: "trash-card",
      ownerId: source.id,
      source: card.name,
      optional: effect.optional,
      ...(effect.zones ? { zones: effect.zones } : {}),
      ...(effect.excludeSource ? { excludeCardId: card.id } : {}),
      ...(effect.requiredTrait ? { requiredTrait: effect.requiredTrait } : {}),
      ...(effect.strengthReward !== undefined && recipient ? {
        combatRecipientId: recipient.id,
        strengthReward: effect.strengthReward,
      } : {}),
      ...(effect.spiceRewardCostThreshold !== undefined ? {
        spiceRewardCostThreshold: effect.spiceRewardCostThreshold,
      } : {}),
      ...(effect.spiceReward !== undefined ? { spiceReward: effect.spiceReward } : {}),
    };
    return trashableCardsForPending(source, pending).length > 0 ? [pending] : [];
  });
}

function pendingActionsForRevealRetreatTroopsForStrength(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient || !playerHasConflictUnits(recipient)) return [];

  return resolveRevealRetreatTroopsForStrength(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.troopCount <= 0 || effect.strength <= 0) return [];
    if (recipient.deployedTroops < effect.troopCount) return [];
    return [{
      kind: "retreat-troops-for-strength",
      ownerId: source.id,
      combatRecipientId,
      troopCount: effect.troopCount,
      strength: effect.strength,
      optional: effect.optional,
      source: card.name,
    }];
  });
}
