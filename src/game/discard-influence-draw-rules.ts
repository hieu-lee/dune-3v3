import { factionLabels } from "./data";
import { drawCards } from "./deck-utils";
import { changeAllegiancesGainChoices } from "./influence-choices";
import {
  influenceEffectOwnerForChoice,
} from "./influence-loss-rules";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import { advancePendingAction } from "./pending-actions";
import type { Card, FactionId, GameState, PendingAction, Player } from "./types";

type DiscardCardForInfluenceAndDrawPendingAction = Extract<
  PendingAction,
  { kind: "discard-card-for-influence-and-draw" }
>;

export function discardCardForInfluenceAndDrawDiscardChoices(
  player: Player,
  pending: DiscardCardForInfluenceAndDrawPendingAction,
): Card[] {
  if (player.id !== pending.ownerId) return [];
  return player.hand;
}

export function discardCardForInfluenceAndDrawChoices(player: Player): FactionId[] {
  return changeAllegiancesGainChoices(player);
}

function drawnCardsText(requested: number, actual: number) {
  if (actual === 0) return requested === 1 ? "has no card to draw" : "has no cards to draw";
  if (actual === requested) return `draws ${actual} card${actual === 1 ? "" : "s"}`;
  return `draws ${actual} of ${requested} cards`;
}

export function resolveDiscardCardForInfluenceAndDraw(
  state: GameState,
  pending: DiscardCardForInfluenceAndDrawPendingAction,
  discardCardId: string,
  faction: FactionId,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !discardCardForInfluenceAndDrawChoices(owner).includes(faction)) return state;
  const discardedCard = owner.hand.find((card) => card.id === discardCardId);
  if (!discardedCard) return state;

  const influenceOwnerResult = influenceEffectOwnerForChoice(
    state,
    owner,
    faction,
    pending.influenceOwnerId,
  );
  if (!influenceOwnerResult.valid || !influenceOwnerResult.owner) return state;
  const influenceOwner = influenceOwnerResult.owner;
  const ownerAfterDiscard = {
    ...owner,
    hand: owner.hand.filter((card) => card.id !== discardedCard.id),
    discard: [...owner.discard, discardedCard],
  };
  const ownerAfterDraw = drawCards(ownerAfterDiscard, ownerAfterDiscard.hand.length + pending.drawCards);
  const drawnCards = ownerAfterDraw.hand.length - ownerAfterDiscard.hand.length;

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) next = ownerAfterDraw;
    if (player.id === influenceOwner.id) next = adjustInfluence(next, faction, pending.influenceAmount);
    return next;
  });
  const influenceText =
    influenceOwner.id === owner.id
      ? `gains ${pending.influenceAmount} ${factionLabels[faction]} Influence`
      : `${influenceOwner.leader} gains ${pending.influenceAmount} ${factionLabels[faction]} Influence`;
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: discards ${discardedCard.name}, ${influenceText}, and ${drawnCardsText(pending.drawCards, drawnCards)}.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipDiscardCardForInfluenceAndDraw(
  state: GameState,
  pending: DiscardCardForInfluenceAndDrawPendingAction,
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
