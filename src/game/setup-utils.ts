import {
  boardSpaces,
  conflictCards,
  intrigueCards,
  shaddamReservedContracts,
  standardContracts,
} from "./data";
import {
  cloneConflicts,
  cloneContracts,
  cloneIntrigues,
  shuffleItems,
} from "./deck-utils";

export function buildSixPlayerConflictDeck() {
  const levelTwo = shuffleItems(conflictCards.filter((conflict) => conflict.level === 2)).slice(0, 5);
  const levelThree = shuffleItems(conflictCards.filter((conflict) => conflict.level === 3));
  return cloneConflicts([...levelTwo, ...levelThree]);
}

export function buildChoamContractDeck() {
  if (standardContracts.length !== 18) {
    throw new Error(`Expected 18 public CHOAM contracts, found ${standardContracts.length}.`);
  }
  return cloneContracts(shuffleItems(standardContracts));
}

export function buildShaddamContractReserve() {
  if (shaddamReservedContracts.length !== 2) {
    throw new Error(`Expected 2 Shaddam reserved contracts, found ${shaddamReservedContracts.length}.`);
  }
  return cloneContracts(shaddamReservedContracts);
}

export function buildIntrigueDeck() {
  if (intrigueCards.length !== 39) {
    throw new Error(`Expected 39 Uprising Intrigue cards, found ${intrigueCards.length}.`);
  }
  return shuffleItems(cloneIntrigues(intrigueCards));
}

export const makerSpaceIds = boardSpaces.filter((space) => space.maker).map((space) => space.id);

export function emptyMakerSpice(): Record<string, number> {
  return Object.fromEntries(makerSpaceIds.map((spaceId) => [spaceId, 0]));
}
