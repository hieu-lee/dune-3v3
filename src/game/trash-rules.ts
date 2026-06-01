import { advancePendingAction } from "./pending-actions";
import { playerHasConflictUnits } from "./conflict-rules";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { Card, GameState, PendingAction, Player, TrashCardZone } from "./types";

type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

function cardsForTrashZone(player: Player, zone: TrashCardZone) {
  if (zone === "hand") return player.hand;
  if (zone === "discard") return player.discard;
  return player.playArea;
}

function updateTrashZone(player: Player, zone: TrashCardZone, cards: Card[]) {
  if (zone === "hand") return { ...player, hand: cards };
  if (zone === "discard") return { ...player, discard: cards };
  return { ...player, playArea: cards };
}

export function trashableCards(player: Player) {
  return (["hand", "discard", "playArea"] as TrashCardZone[]).flatMap((zone) =>
    cardsForTrashZone(player, zone).map((card) => ({ zone, card })),
  );
}

export function trashableCardsForPending(player: Player, pending: TrashCardPendingAction) {
  const zones = pending.zones ?? (["hand", "discard", "playArea"] as TrashCardZone[]);
  return trashableCards(player).filter(({ card, zone }) =>
    zones.includes(zone) &&
    card.id !== pending.excludeCardId &&
    (!pending.requiredTrait || card.traits?.includes(pending.requiredTrait))
  );
}

export function advancePastUnresolvableMandatoryTrash(state: GameState): GameState {
  let nextState = state;
  while (nextState.pendingAction?.kind === "trash-card" && !nextState.pendingAction.optional) {
    const pending = nextState.pendingAction;
    const owner = nextState.players.find((player) => player.id === pending.ownerId);
    if (owner && trashableCardsForPending(owner, pending).length > 0) break;
    nextState = {
      ...nextState,
      ...advancePendingAction(nextState),
      log: [`${owner?.leader ?? "Player"} has no trashable cards for ${pending.source}.`, ...nextState.log],
    };
  }
  return nextState;
}

export function trashPlayerCard(
  state: GameState,
  pending: TrashCardPendingAction,
  zone: TrashCardZone,
  cardId: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return advancePastUnresolvableMandatoryTrash({ ...state, ...advancePendingAction(state) });
  if (!trashableCardsForPending(owner, pending).some((choice) => choice.zone === zone && choice.card.id === cardId)) {
    if (!pending.optional && trashableCardsForPending(owner, pending).length === 0) {
      return advancePastUnresolvableMandatoryTrash(state);
    }
    return state;
  }
  const cards = cardsForTrashZone(owner, zone);
  const card = cards.find((candidate) => candidate.id === cardId);
  if (!card) return state;
  const combatRecipient = pending.combatRecipientId
    ? state.players.find((player) => player.id === pending.combatRecipientId)
    : undefined;
  const strengthReward = pending.strengthReward && combatRecipient && playerHasConflictUnits(combatRecipient)
    ? pending.strengthReward
    : 0;
  const spiceReward =
    pending.spiceReward &&
    (card.cost ?? 0) >= (pending.spiceRewardCostThreshold ?? 0)
      ? pending.spiceReward
      : 0;
  const players = state.players.map((player) => {
    let nextPlayer = player;
    if (player.id === owner.id) {
      nextPlayer = {
        ...updateTrashZone(player, zone, cards.filter((candidate) => candidate.id !== card.id)),
        resources: {
          ...player.resources,
          spice: player.resources.spice + spiceReward,
        },
      };
    }
    if (player.id === combatRecipient?.id && strengthReward > 0) {
      nextPlayer = { ...nextPlayer, conflict: nextPlayer.conflict + strengthReward };
    }
    return nextPlayer;
  });
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} trashes ${card.name} from ${pending.source}${spiceReward > 0 ? ` and gains ${spiceReward} spice` : ""}${strengthReward > 0 ? ` and adds ${strengthReward} strength` : ""}.`,
      ...state.log,
    ],
  };
  return advancePastUnresolvableMandatoryTrash(recordTurnSpiceGain(nextState, owner.id, spiceReward));
}

export function skipTrashCard(state: GameState, pending: TrashCardPendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!pending.optional && owner && trashableCardsForPending(owner, pending).length > 0) return state;
  return advancePastUnresolvableMandatoryTrash({
    ...state,
    ...advancePendingAction(state),
    log: [
      pending.optional
        ? `${owner?.leader ?? "Player"} declines to trash a card from ${pending.source}.`
        : `${owner?.leader ?? "Player"} has no trashable cards for ${pending.source}.`,
      ...state.log,
    ],
  });
}
