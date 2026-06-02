import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  trashableCardsForPending,
} from "./trash-rules";
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
  if (option.pending.kind === "acquire-card") {
    return acquirableCardsForPending(state, option.pending).length > 0;
  }
  if (option.pending.kind === "trash-card") {
    const owner = state.players.find((player) => player.id === option.pending.ownerId);
    return Boolean(owner && trashableCardsForPending(owner, option.pending).length > 0);
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
  return {
    ...state,
    pendingAction: option.pending,
    log: [`${owner.leader} chooses ${option.label} for ${pending.source}.`, ...state.log],
  };
}

export function skipPendingActionChoice(
  state: GameState,
  pending: PendingActionChoicePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines ${pending.source}.`, ...state.log],
  };
}
