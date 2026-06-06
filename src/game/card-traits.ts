import { guildSpySourceId } from "./card-identifiers";
import type { GameState, PendingAction, Player } from "./types";

type CardTraitSource = {
  sourceId?: number;
  traits?: string[];
};

const guildSpyPrintedTrait = "Faction: Spacing Guild";

export function cardHasTrait(card: CardTraitSource | undefined, trait: string) {
  if (!card) return false;
  if (card.traits?.includes(trait)) return true;
  return trait === guildSpyPrintedTrait && card.sourceId === guildSpySourceId;
}

export function normalizeCardTraits<T extends CardTraitSource>(card: T): T {
  if (card.sourceId !== guildSpySourceId || card.traits?.includes(guildSpyPrintedTrait)) return card;
  return {
    ...card,
    traits: [...(card.traits ?? []), guildSpyPrintedTrait],
  };
}

function normalizeCardArray<T extends CardTraitSource>(cards: T[]) {
  let changed = false;
  const normalized = cards.map((card) => {
    const next = normalizeCardTraits(card);
    if (next !== card) changed = true;
    return next;
  });
  return changed ? normalized : cards;
}

function normalizePlayerCardTraits(player: Player) {
  const deck = normalizeCardArray(player.deck);
  const hand = normalizeCardArray(player.hand);
  const discard = normalizeCardArray(player.discard);
  const playArea = normalizeCardArray(player.playArea);
  const manipulatedCards = normalizeCardArray(player.manipulatedCards);
  if (
    deck === player.deck &&
    hand === player.hand &&
    discard === player.discard &&
    playArea === player.playArea &&
    manipulatedCards === player.manipulatedCards
  ) {
    return player;
  }
  return {
    ...player,
    deck,
    hand,
    discard,
    playArea,
    manipulatedCards,
  };
}

function normalizePendingActionCardTraits(action: undefined): undefined;
function normalizePendingActionCardTraits(action: PendingAction): PendingAction;
function normalizePendingActionCardTraits(action: PendingAction | undefined): PendingAction | undefined;
function normalizePendingActionCardTraits(action: PendingAction | undefined): PendingAction | undefined {
  if (action?.kind !== "top-deck-selection" || !action.inspectedCards) return action;
  const inspectedCards = normalizeCardArray(action.inspectedCards);
  return inspectedCards === action.inspectedCards ? action : { ...action, inspectedCards };
}

export function normalizeGameCardTraits(state: GameState) {
  const players = state.players.map(normalizePlayerCardTraits);
  const imperiumRow = normalizeCardArray(state.imperiumRow);
  const marketDeck = normalizeCardArray(state.marketDeck);
  const reserveMarket = normalizeCardArray(state.reserveMarket);
  const throneRow = normalizeCardArray(state.throneRow);
  const pendingAction = normalizePendingActionCardTraits(state.pendingAction);
  const pendingQueue = state.pendingQueue.map(normalizePendingActionCardTraits);
  const playersChanged = players.some((player, index) => player !== state.players[index]);
  const pendingQueueChanged = pendingQueue.some((action, index) => action !== state.pendingQueue[index]);
  if (
    !playersChanged &&
    imperiumRow === state.imperiumRow &&
    marketDeck === state.marketDeck &&
    reserveMarket === state.reserveMarket &&
    throneRow === state.throneRow &&
    pendingAction === state.pendingAction &&
    !pendingQueueChanged
  ) {
    return state;
  }
  return {
    ...state,
    players,
    imperiumRow,
    marketDeck,
    reserveMarket,
    throneRow,
    pendingAction,
    pendingQueue,
  };
}
