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

type CapturedMentatPendingAction = Extract<PendingAction, { kind: "captured-mentat" }>;

export function capturedMentatDiscardChoices(player: Player, pending: CapturedMentatPendingAction): Card[] {
  if (player.id !== pending.ownerId) return [];
  return player.hand;
}

export function capturedMentatInfluenceChoices(player: Player): FactionId[] {
  return changeAllegiancesGainChoices(player);
}

export function resolveCapturedMentatChoice(
  state: GameState,
  pending: CapturedMentatPendingAction,
  discardCardId: string,
  faction: FactionId,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !capturedMentatInfluenceChoices(owner).includes(faction)) return state;
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
  const ownerAfterDraw = drawCards(ownerAfterDiscard, ownerAfterDiscard.hand.length + 1);
  const drewCard = ownerAfterDraw.hand.length > ownerAfterDiscard.hand.length;

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) next = ownerAfterDraw;
    if (player.id === influenceOwner.id) next = adjustInfluence(next, faction, 1);
    return next;
  });
  const influenceText =
    influenceOwner.id === owner.id
      ? `gains 1 ${factionLabels[faction]} Influence`
      : `${influenceOwner.leader} gains 1 ${factionLabels[faction]} Influence`;
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves Captured Mentat: discards ${discardedCard.name}, ${influenceText}, and ${drewCard ? "draws 1 card" : "has no card to draw"}.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipCapturedMentat(state: GameState, pending: CapturedMentatPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to discard a card for Captured Mentat.`, ...state.log],
  };
}
