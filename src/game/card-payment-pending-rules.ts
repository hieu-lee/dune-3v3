import { resolveInfluence } from "./agent-effects";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
} from "./conflict-rules";
import {
  resolveAgentPayResourceForContracts,
  resolveAgentPayResourceForDrawCards,
  resolveAgentPayResourceForInfluences,
  resolveAgentPayResourceForSandworms,
  resolveAgentPayTeamResourceForVps,
} from "./effect-resolver";
import {
  playersWithPendingCardEffect,
  potentialDeferredMakerChoiceSpice,
  sameTeamAllies,
} from "./card-pending-helpers";
import type {
  BoardSpace,
  Card,
  GameState,
  PendingAction,
  Player,
  SandwormEffectRecipient,
} from "./types";

export function pendingActionForAgentPayResourceForInfluence(
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

export function pendingActionForAgentPayResourceForSandworms(
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

export function pendingActionForAgentPayResourceForContracts(
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

export function pendingActionForAgentPayResourceForDrawCards(
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

export function pendingActionForAgentPayTeamResourceForVp(
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
