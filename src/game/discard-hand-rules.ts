import { advancePendingAction } from "./pending-actions";
import type { Card, GameState, PendingAction, Player } from "./types";

type DiscardHandCardPendingAction = Extract<PendingAction, { kind: "discard-hand-card" }>;

export function discardHandCardChoices(
  player: Player,
  pending: DiscardHandCardPendingAction,
): Card[] {
  if (player.id !== pending.ownerId) return [];
  return player.hand;
}

export function resolveDiscardHandCard(
  state: GameState,
  pending: DiscardHandCardPendingAction,
  discardCardId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  const discardedCard = discardHandCardChoices(owner, pending).find((card) => card.id === discardCardId);
  if (!discardedCard) return state;

  const remaining = pending.remaining - 1;
  const ownerAfterDiscard = {
    ...owner,
    hand: owner.hand.filter((card) => card.id !== discardedCard.id),
    discard: [...owner.discard, discardedCard],
  };
  const canDiscardMore = remaining > 0 && ownerAfterDiscard.hand.length > 0;

  return {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterDiscard : player),
    ...(canDiscardMore
      ? { pendingAction: { ...pending, remaining } }
      : advancePendingAction(state)),
    log: [
      `${owner.leader} resolves ${pending.source}: discards ${discardedCard.name}.`,
      ...state.log,
    ],
  };
}
