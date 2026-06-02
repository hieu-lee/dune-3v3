import { cloneCardEffects } from "./effect-specs";
import type { Card, ConflictCard, ContractCard, IntrigueCard, ObjectiveCard, Player } from "./types";

const playerTroopPieceCount = 12;

export function cloneCards(cards: Card[]) {
  return cards.map((card) => ({
    ...card,
    icons: [...card.icons],
    effects: cloneCardEffects(card.effects),
    revealGain: card.revealGain ? { ...card.revealGain } : undefined,
    traits: card.traits ? [...card.traits] : undefined,
  }));
}

export function playerTroopSupply(player: Player) {
  if (player.role === "Commander") return 0;
  return Math.max(0, playerTroopPieceCount - player.garrison - player.deployedTroops - player.jessicaMemories);
}

export function shuffleCards(cards: Card[]) {
  return shuffleItems(cards);
}

export function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function cloneConflicts(conflicts: ConflictCard[]) {
  return conflicts.map((conflict) => ({ ...conflict, rewards: [...conflict.rewards] }));
}

export function cloneContracts(contracts: ContractCard[]) {
  return contracts.map((contract) => ({ ...contract }));
}

export function cloneIntrigues(intrigues: IntrigueCard[]) {
  return intrigues.map((intrigue) => ({
    ...intrigue,
    effects: cloneCardEffects(intrigue.effects),
    traits: intrigue.traits ? [...intrigue.traits] : undefined,
  }));
}

export function cloneObjectives(objectives: ObjectiveCard[]) {
  return objectives.map((objective) => ({ ...objective }));
}

export function drawCards(player: Player, count: number): Player {
  const deck = [...player.deck];
  const hand = [...player.hand];
  const discard = [...player.discard];

  while (hand.length < count && (deck.length > 0 || discard.length > 0)) {
    if (deck.length === 0) {
      deck.push(...shuffleCards(discard.splice(0)));
    }
    const card = deck.shift();
    if (card) hand.push(card);
  }

  return { ...player, deck, hand, discard };
}
