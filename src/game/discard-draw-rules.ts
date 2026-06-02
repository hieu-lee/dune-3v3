import { drawCards } from "./deck-utils";
import { applyDiscardedFromHandTriggers } from "./discard-trigger-rules";
import { drawIntrigueCards } from "./intrigue-deck";
import { advancePendingAction } from "./pending-actions";
import type { Card, GameState, PendingAction, Player } from "./types";

type DiscardCardForDrawPendingAction = Extract<PendingAction, { kind: "discard-card-for-draw" }>;

export function discardCardForDrawChoices(
  player: Player,
  pending: DiscardCardForDrawPendingAction,
): Card[] {
  if (player.id !== pending.ownerId) return [];
  return player.hand;
}

function drawnCardsText(requested: number, actual: number) {
  if (requested === 0) return "draws no cards";
  if (actual === 0) return requested === 1 ? "has no card to draw" : "has no cards to draw";
  if (actual === requested) return `draws ${actual} card${actual === 1 ? "" : "s"}`;
  return `draws ${actual} of ${requested} cards`;
}

function bonusDrawFor(discardedCard: Card, pending: DiscardCardForDrawPendingAction) {
  if (!pending.bonusDraw) return 0;
  return discardedCard.traits?.includes(pending.bonusDraw.requiredDiscardTrait)
    ? pending.bonusDraw.drawCards
    : 0;
}

function bonusIntriguesFor(discardedCard: Card, pending: DiscardCardForDrawPendingAction) {
  if (!pending.bonusIntrigues) return 0;
  return discardedCard.traits?.includes(pending.bonusIntrigues.requiredDiscardTrait)
    ? pending.bonusIntrigues.amount
    : 0;
}

export function resolveDiscardCardForDraw(
  state: GameState,
  pending: DiscardCardForDrawPendingAction,
  discardCardId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const discardedCard = discardCardForDrawChoices(owner, pending).find((card) => card.id === discardCardId);
  if (!discardedCard) return state;

  const requestedDraws = pending.drawCards + bonusDrawFor(discardedCard, pending);
  const requestedIntrigues = bonusIntriguesFor(discardedCard, pending);
  const ownerAfterDiscard = {
    ...owner,
    hand: owner.hand.filter((card) => card.id !== discardedCard.id),
    discard: [...owner.discard, discardedCard],
  };
  const ownerAfterDraw = requestedDraws > 0
    ? drawCards(ownerAfterDiscard, ownerAfterDiscard.hand.length + requestedDraws)
    : ownerAfterDiscard;
  const drawnCards = ownerAfterDraw.hand.length - ownerAfterDiscard.hand.length;

  const nextStateWithoutLog = {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterDraw : player),
    ...advancePendingAction(state),
    log: state.log,
  };
  const nextStateWithIntrigues = requestedIntrigues > 0
    ? drawIntrigueCards(nextStateWithoutLog, owner.id, requestedIntrigues, pending.source)
    : nextStateWithoutLog;
  const nextState = {
    ...nextStateWithIntrigues,
    log: [
      `${owner.leader} resolves ${pending.source}: discards ${discardedCard.name} and ${drawnCardsText(requestedDraws, drawnCards)}.`,
      ...nextStateWithIntrigues.log,
    ],
  };
  return applyDiscardedFromHandTriggers(nextState, owner.id, discardedCard, { logAfterCurrentAction: true });
}

export function skipDiscardCardForDraw(
  state: GameState,
  pending: DiscardCardForDrawPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to discard a card for ${pending.source}.`, ...state.log],
  };
}
