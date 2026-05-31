import { shuffleItems } from "./deck-utils";
import type { GameState, IntrigueCard } from "./types";

export function drawIntrigueCards(state: GameState, ownerId: string, count: number, source: string): GameState {
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner || count <= 0) return state;

  let deck = [...state.intrigueDeck];
  let discard = [...state.intrigueDiscard];
  const drawn: IntrigueCard[] = [];

  while (drawn.length < count && (deck.length > 0 || discard.length > 0)) {
    if (deck.length === 0) {
      deck = shuffleItems(discard);
      discard = [];
    }
    const card = deck.shift();
    if (card) drawn.push(card);
  }

  if (drawn.length === 0) return state;

  const players = state.players.map((player) =>
    player.id === ownerId ? { ...player, intrigues: [...player.intrigues, ...drawn] } : player,
  );
  const cardText = drawn.length === 1 ? "an Intrigue card" : `${drawn.length} Intrigue cards`;

  return {
    ...state,
    players,
    intrigueDeck: deck,
    intrigueDiscard: discard,
    log: [`${owner.leader} draws ${cardText} from ${source}.`, ...state.log],
  };
}
