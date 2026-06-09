import { advancePendingAction } from "./pending-actions";
import { applyTrashedCardTriggers } from "./discard-trigger-rules";
import type { Card, GameState, PendingAction, Player } from "./types";

type TopDeckSelectionPendingAction = Extract<PendingAction, { kind: "top-deck-selection" }>;

export type TopDeckSelectionChoice = {
  drawIndex: number;
  discardIndex: number;
  trashIndex: number;
};

export function topDeckSelectionCards(
  player: Player,
  pending: TopDeckSelectionPendingAction,
): Card[] {
  if (player.id !== pending.ownerId) return [];
  if (pending.inspectedCards) return pending.inspectedCards.slice(0, pending.lookCards);
  return player.deck.slice(0, pending.lookCards);
}

export function skipTopDeckSelection(
  state: GameState,
  pending: TopDeckSelectionPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  if (topDeckSelectionCards(owner, pending).length >= pending.lookCards) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} cannot resolve ${pending.source}: fewer than ${pending.lookCards} cards remain in deck.`,
      ...state.log,
    ],
  };
}

function isValidSingleCardChoice(choice: TopDeckSelectionChoice, cardCount: number) {
  const indexes = [choice.drawIndex, choice.discardIndex, choice.trashIndex];
  return indexes.every((index) => Number.isInteger(index) && index >= 0 && index < cardCount) &&
    new Set(indexes).size === indexes.length;
}

export function resolveTopDeckSelection(
  state: GameState,
  pending: TopDeckSelectionPendingAction,
  choice: TopDeckSelectionChoice,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (pending.drawCards !== 1 || pending.discardCards !== 1 || pending.trashCards !== 1) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  if (!isValidSingleCardChoice(choice, pending.lookCards)) return state;
  const inspectedCards = topDeckSelectionCards(owner, pending);
  if (inspectedCards.length < pending.lookCards) return state;

  const drawnCard = inspectedCards[choice.drawIndex];
  const discardedCard = inspectedCards[choice.discardIndex];
  const trashedCard = inspectedCards[choice.trashIndex];
  if (!drawnCard || !discardedCard || !trashedCard) return state;
  const inspectedCardIds = new Set(inspectedCards.map((card) => card.id));

  const ownerAfterSelection = {
    ...owner,
    deck: owner.deck.filter((card) => !inspectedCardIds.has(card.id)),
    hand: [...owner.hand, drawnCard],
    discard: [...owner.discard, discardedCard],
    trash: [...(owner.trash ?? []), trashedCard],
  };

  const selectedState = {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterSelection : player),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: draws 1 card, discards ${discardedCard.name}, and trashes ${trashedCard.name}.`,
      ...state.log,
    ],
  };
  return applyTrashedCardTriggers(selectedState, owner.id, trashedCard, { logAfterCurrentAction: true });
}
