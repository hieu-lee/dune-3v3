import { advancePendingAction } from "./pending-actions";
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
  return trashableCards(player).filter(({ zone }) => zones.includes(zone));
}

export function trashPlayerCard(
  state: GameState,
  pending: TrashCardPendingAction,
  zone: TrashCardZone,
  cardId: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  if (pending.zones && !pending.zones.includes(zone)) return state;
  const cards = cardsForTrashZone(owner, zone);
  const card = cards.find((candidate) => candidate.id === cardId);
  if (!card) return state;
  const spiceReward =
    pending.spiceReward &&
    (card.cost ?? 0) >= (pending.spiceRewardCostThreshold ?? 0)
      ? pending.spiceReward
      : 0;
  const players = state.players.map((player) =>
    player.id === owner.id
      ? {
          ...updateTrashZone(player, zone, cards.filter((candidate) => candidate.id !== card.id)),
          resources: {
            ...player.resources,
            spice: player.resources.spice + spiceReward,
          },
        }
      : player,
  );
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} trashes ${card.name} from ${pending.source}${spiceReward > 0 ? ` and gains ${spiceReward} spice` : ""}.`,
      ...state.log,
    ],
  };
  return recordTurnSpiceGain(nextState, owner.id, spiceReward);
}

export function skipTrashCard(state: GameState, pending: TrashCardPendingAction): GameState {
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to trash a card from ${pending.source}.`, ...state.log],
  };
}
