import {
  canPlaceSharedSpyPost,
  canPlaceSpyPost,
  removeSpyPostOwner,
  spyObservationPostIdForSpace,
  spyObservationPostChoiceSpaces,
  spyObservationPostOwnerIds,
} from "./spy-posts";
import type { GameState, PendingAction } from "./types";

type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;

export function recallableSpySpaces(state: GameState, pending: RecallSpyPendingAction) {
  const allowedSpaceIds = pending.spaceIds ? new Set(pending.spaceIds) : undefined;
  return uniqueSpyPostSpaces(spyObservationPostChoiceSpaces().filter((space) =>
    (!allowedSpaceIds || allowedSpaceIds.has(space.id)) &&
    spyObservationPostOwnerIds(state, space.id).includes(pending.ownerId)
  ));
}

export function placeableSpySpaces(state: GameState, pending: SpyPendingAction) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.spies <= 0) return [];
  return uniqueSpyPostSpaces(spyObservationPostChoiceSpaces().filter((space) =>
    (pending.allowSharedPost ? canPlaceSharedSpyPost(state, space, owner) : canPlaceSpyPost(state, space, owner)) &&
    (!pending.placementIcon || space.icon === pending.placementIcon) &&
    (!pending.placementIcons || pending.placementIcons.includes(space.icon))
  ));
}

export function recallableSpySupplySpaces(state: GameState, pending: SpyPendingAction) {
  if (!pending.recallForSupply) return [];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.spies > 0) return [];
  const allOwnSpies = recallableSpySpaces(state, { kind: "recall-spy", ownerId: owner.id, combatRecipientId: owner.id, remaining: 1, strength: 0, source: pending.source, optional: false });
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
  return uniqueSpyPostSpaces(allOwnSpies.filter((space) => {
    if (pending.placementIcon && space.icon !== pending.placementIcon) return false;
    if (pending.placementIcons && !pending.placementIcons.includes(space.icon)) return false;
    const recalledSpyState = removeSpyPostOwner(state, space.id, owner.id);
    return placeableSpySpaces({
      ...state,
      ...recalledSpyState,
      players: state.players.map((player) =>
        player.id === owner.id ? { ...player, spies: 1 } : player,
      ),
    }, pending).length > 0;
  }));
}

function uniqueSpyPostSpaces(spaces: ReturnType<typeof spyObservationPostChoiceSpaces>) {
  const seenPostIds = new Set<string>();
  return spaces.filter((space) => {
    const postId = spyObservationPostIdForSpace(space.id);
    if (seenPostIds.has(postId)) return false;
    seenPostIds.add(postId);
    return true;
  });
}
