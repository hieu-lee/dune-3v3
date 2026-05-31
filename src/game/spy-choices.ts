import { boardSpaces } from "./data";
import {
  canPlaceSharedSpyPost,
  canPlaceSpyPost,
  playerHasSpyPost,
  removeSpyPostOwner,
} from "./spy-posts";
import type { GameState, PendingAction } from "./types";

type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;

export function recallableSpySpaces(state: GameState, pending: RecallSpyPendingAction) {
  return boardSpaces.filter((space) => playerHasSpyPost(state, space.id, pending.ownerId));
}

export function placeableSpySpaces(state: GameState, pending: SpyPendingAction) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.spies <= 0) return [];
  return boardSpaces.filter((space) =>
    (pending.allowSharedPost ? canPlaceSharedSpyPost(state, space, owner) : canPlaceSpyPost(state, space, owner)) &&
    (!pending.placementIcon || space.icon === pending.placementIcon)
  );
}

export function recallableSpySupplySpaces(state: GameState, pending: SpyPendingAction) {
  if (!pending.recallForSupply) return [];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.spies > 0) return [];
  const allOwnSpies = boardSpaces.filter((space) => playerHasSpyPost(state, space.id, owner.id));
  if (placeableSpySpaces({ ...state, players: state.players.map((player) =>
    player.id === owner.id ? { ...player, spies: 1 } : player,
  ) }, pending).length > 0) {
    return allOwnSpies;
  }
  if (pending.allowSharedPost) {
    return allOwnSpies.filter((space) => {
      const recalledSpyState = removeSpyPostOwner(state, space.id, owner.id);
      return placeableSpySpaces({
        ...state,
        ...recalledSpyState,
        players: state.players.map((player) =>
          player.id === owner.id ? { ...player, spies: 1 } : player,
        ),
      }, pending).length > 0;
    });
  }
  return allOwnSpies.filter((space) => {
    if (pending.placementIcon && space.icon !== pending.placementIcon) return false;
    const recalledSpyState = removeSpyPostOwner(state, space.id, owner.id);
    return placeableSpySpaces({
      ...state,
      ...recalledSpyState,
      players: state.players.map((player) =>
        player.id === owner.id ? { ...player, spies: 1 } : player,
      ),
    }, pending).length > 0;
  });
}
