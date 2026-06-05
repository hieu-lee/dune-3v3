import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  advancePendingAction,
} from "./pending-actions";
import { playerHasConflictUnits } from "./conflict-rules";
import { scoreActiveGurneyAlwaysSmilingForRecipient } from "./leader-rewards";
import {
  trashableCardsForPending,
} from "./trash-rules";
import {
  placeableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { recordTurnSpiceGain } from "./turn-trackers";
import type {
  GameState,
  PendingAction,
  PendingActionChoicePendingOption,
} from "./types";

type PendingActionChoicePendingAction = Extract<PendingAction, { kind: "pending-action-choice" }>;

export function pendingActionChoiceOptionIsResolvable(
  state: GameState,
  option: PendingActionChoicePendingOption,
) {
  const nestedPending = option.pending;
  if (nestedPending.kind === "acquire-card") {
    return acquirableCardsForPending(state, nestedPending).length > 0;
  }
  if (nestedPending.kind === "trash-card") {
    const owner = state.players.find((player) => player.id === nestedPending.ownerId);
    return Boolean(owner && trashableCardsForPending(owner, nestedPending).length > 0);
  }
  if (nestedPending.kind === "gain-persuasion") {
    return nestedPending.amount > 0;
  }
  if (nestedPending.kind === "gain-resource") {
    return nestedPending.amount > 0;
  }
  if (nestedPending.kind === "gain-strength") {
    const recipient = state.players.find((player) => player.id === nestedPending.combatRecipientId);
    return Boolean(recipient && nestedPending.amount > 0 && playerHasConflictUnits(recipient));
  }
  if (nestedPending.kind === "spy") {
    return placeableSpySpaces(state, nestedPending).length > 0 ||
      recallableSpySupplySpaces(state, nestedPending).length > 0;
  }
  return false;
}

export function resolvePendingActionChoice(
  state: GameState,
  pending: PendingActionChoicePendingAction,
  optionId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId))) return state;
  const option = pending.options.find((candidate) => candidate.id === optionId);
  if (!option || !pendingActionChoiceOptionIsResolvable(state, option)) return state;
  const nestedPending = option.pending;
  if (nestedPending.kind === "gain-persuasion") {
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.ownerId
          ? { ...player, persuasion: player.persuasion + nestedPending.amount }
          : player
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: gains ${nestedPending.amount} persuasion.`,
        ...state.log,
      ],
    };
  }
  if (nestedPending.kind === "gain-resource") {
    const resourceGainedState = {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.ownerId
          ? {
              ...player,
              resources: {
                ...player.resources,
                [nestedPending.resource]: player.resources[nestedPending.resource] + nestedPending.amount,
              },
            }
          : player
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: gains ${nestedPending.amount} ${nestedPending.resource}.`,
        ...state.log,
      ],
    };
    return nestedPending.resource === "spice"
      ? recordTurnSpiceGain(resourceGainedState, nestedPending.ownerId, nestedPending.amount)
      : resourceGainedState;
  }
  if (nestedPending.kind === "gain-strength") {
    const strengthenedState = {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.combatRecipientId
          ? { ...player, conflict: player.conflict + nestedPending.amount }
          : player
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: adds ${nestedPending.amount} strength.`,
        ...state.log,
      ],
    };
    return scoreActiveGurneyAlwaysSmilingForRecipient(strengthenedState, nestedPending.combatRecipientId);
  }
  return {
    ...state,
    pendingAction: nestedPending,
    log: [`${owner.leader} chooses ${option.label} for ${pending.source}.`, ...state.log],
  };
}

export function skipPendingActionChoice(
  state: GameState,
  pending: PendingActionChoicePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (pending.optional !== true) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines ${pending.source}.`, ...state.log],
  };
}
