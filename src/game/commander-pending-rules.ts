import {
  factionLabels,
} from "./data";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  drawCards,
} from "./deck-utils";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  recordTurnUnitDeployment,
} from "./turn-trackers";
import type {
  GameState,
  PendingAction,
  Player,
  ResourceId,
} from "./types";

type PayResourceForStrengthPendingAction = Extract<PendingAction, { kind: "pay-resource-for-strength" }>;
type PayResourceForTroopsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-troops" }>;
type PayResourceForDrawCardsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-draw-cards" }>;
type PayResourceForInfluencePendingAction = Extract<PendingAction, { kind: "pay-resource-for-influence" }>;
type PayResourceForSandwormsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-sandworms" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function paymentPendingOptionalIsValid(pending: { optional?: unknown }) {
  return pending.optional === true;
}

function paymentPendingTrashSourceIsValid(pending: { cardId?: string; trashSource?: unknown }) {
  if (pending.trashSource !== undefined && typeof pending.trashSource !== "boolean") return false;
  if (pending.trashSource === true && pending.cardId === undefined) return false;
  return true;
}

function paymentPendingAmountIsValid(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function drawnCardsText(requested: number, actual: number) {
  if (actual === 0) return requested === 1 ? "has no card to draw" : "has no cards to draw";
  if (actual === requested) return `draws ${actual} card${actual === 1 ? "" : "s"}`;
  return `draws ${actual} of ${requested} cards`;
}

export function resolvePayResourceForTroopsChoice(
  state: GameState,
  pending: PayResourceForTroopsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipientIds = Array.isArray(pending.recipientIds) ? pending.recipientIds : [];
  const recipients = recipientIds.map((recipientId) =>
    state.players.find((player) => player.id === recipientId)
  );
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.troops <= 0 ||
    pending.destination !== "garrison" ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    recipientIds.length !== 2 ||
    new Set(recipientIds).size !== recipientIds.length ||
    recipients.some((recipient) =>
      !recipient ||
      recipient.team !== owner.team ||
      recipient.role !== "Ally"
    )
  ) {
    return state;
  }

  const recipientSet = new Set(recipientIds);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...player,
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
        ...(pending.trashSource && pending.cardId
          ? { playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    if (recipientSet.has(player.id)) {
      next = { ...next, garrison: next.garrison + pending.troops };
    }
    return next;
  });
  const recipientLabel = recipients
    .filter((recipient): recipient is Player => Boolean(recipient))
    .map((recipient) => recipient.leader)
    .join(" and ");

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipientLabel} each gain ${pending.troops} troops.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForTroops(state: GameState, pending: PayResourceForTroopsPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForDrawCardsChoice(
  state: GameState,
  pending: PayResourceForDrawCardsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.drawCards) ||
    !paymentPendingOptionalIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId))
  ) {
    return state;
  }

  const ownerAfterPayment = {
    ...owner,
    resources: { ...owner.resources, [pending.resource]: availableResource - pending.cost },
  };
  const ownerAfterDraw = drawCards(ownerAfterPayment, ownerAfterPayment.hand.length + pending.drawCards);
  const actualDrawn = ownerAfterDraw.hand.length - ownerAfterPayment.hand.length;

  return {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterDraw : player),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${drawnCardsText(pending.drawCards, actualDrawn)}.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForDrawCards(
  state: GameState,
  pending: PayResourceForDrawCardsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.drawCards) ||
    !paymentPendingOptionalIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForStrengthChoice(
  state: GameState,
  pending: PayResourceForStrengthPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.strength <= 0 ||
    !paymentPendingOptionalIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    (owner.role === "Commander" && (recipient.team !== owner.team || recipient.role !== "Ally")) ||
    (owner.role !== "Commander" && recipient.id !== owner.id) ||
    !playerHasConflictUnits(recipient)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...player,
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
      };
    }
    if (player.id === recipient.id) {
      next = { ...next, conflict: next.conflict + pending.strength };
    }
    return next;
  });

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} adds ${pending.strength} strength.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForStrength(state: GameState, pending: PayResourceForStrengthPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  if (!paymentPendingOptionalIsValid(pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (!resourceLabel) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForInfluenceChoice(
  state: GameState,
  pending: PayResourceForInfluencePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.influenceOwnerId);
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.amount <= 0 ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    recipient.team !== owner.team ||
    (recipient.id !== owner.id && recipient.role !== "Ally")
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...next,
        resources: { ...next.resources, [pending.resource]: availableResource - pending.cost },
        ...(pending.trashSource && pending.cardId
          ? { playArea: next.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    if (player.id === recipient.id) {
      next = adjustInfluence(next, pending.faction, pending.amount);
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} gains ${pending.amount} ${factionLabels[pending.faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipPayResourceForInfluence(state: GameState, pending: PayResourceForInfluencePendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForSandwormsChoice(
  state: GameState,
  pending: PayResourceForSandwormsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  const persuasionCost = pending.persuasionCost ?? 0;
  const validRecipient = Boolean(
    owner &&
      recipient &&
      (
        (owner.role === "Commander" && recipient.team === owner.team && recipient.role === "Ally") ||
        (owner.role !== "Commander" && recipient.id === owner.id)
      ),
  );
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    owner.persuasion < persuasionCost ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.sandworms) ||
    !paymentPendingAmountIsValid(pending.strength) ||
    (pending.persuasionCost !== undefined && !paymentPendingAmountIsValid(pending.persuasionCost)) ||
    pending.strength !== pending.sandworms * 3 ||
    pending.destination !== "conflict" ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    !validRecipient ||
    conflictDeploymentBlockedFor(state, owner.id, recipient.id) ||
    !canSummonSandworms(state, recipient, pending.sandworms)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...next,
        resources: { ...next.resources, [pending.resource]: availableResource - pending.cost },
        persuasion: next.persuasion - persuasionCost,
        ...(pending.trashSource && pending.cardId
          ? { playArea: next.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    if (player.id === recipient.id) {
      next = {
        ...next,
        conflict: next.conflict + pending.strength,
        deployedSandworms: next.deployedSandworms + pending.sandworms,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel}${persuasionCost > 0 ? ` and forgoes ${persuasionCost} persuasion` : ""} for ${pending.source}; ${recipient.leader} summons ${pending.sandworms} sandworm${pending.sandworms === 1 ? "" : "s"}.`,
      ...state.log,
    ],
  };
  return recordTurnUnitDeployment(nextState, owner.id, pending.sandworms);
}

export function skipPayResourceForSandworms(state: GameState, pending: PayResourceForSandwormsPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.sandworms) ||
    !paymentPendingAmountIsValid(pending.strength) ||
    (pending.persuasionCost !== undefined && !paymentPendingAmountIsValid(pending.persuasionCost)) ||
    pending.strength !== pending.sandworms * 3 ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}
