import { boardSpaces } from "./data";
import type { BoardSpace, GameState, Player } from "./types";

export type SpyPostState = Pick<GameState, "spyPosts" | "sharedSpyPosts">;

export function spyPostOwnerIds(
  state: SpyPostState,
  spaceId: string,
) {
  return Array.from(new Set([
    state.spyPosts[spaceId],
    ...(state.sharedSpyPosts[spaceId] ?? []),
  ].filter((ownerId): ownerId is string => Boolean(ownerId))));
}

export function spyPostOccupied(state: SpyPostState, spaceId: string) {
  return spyPostOwnerIds(state, spaceId).length > 0;
}

export function playerHasSpyPost(state: SpyPostState, spaceId: string, playerId: string) {
  return spyPostOwnerIds(state, spaceId).includes(playerId);
}

export function spyPostCount(state: SpyPostState, ownerId: string) {
  return boardSpaces.filter((space) => playerHasSpyPost(state, space.id, ownerId)).length;
}

export function removeSpyPostOwner(
  state: SpyPostState,
  spaceId: string,
  ownerId: string,
) {
  const spyPosts = { ...state.spyPosts };
  const sharedSpyPosts = { ...state.sharedSpyPosts };
  if (spyPosts[spaceId] === ownerId) delete spyPosts[spaceId];
  if (sharedSpyPosts[spaceId]?.includes(ownerId)) {
    const remainingOwners = sharedSpyPosts[spaceId].filter((candidate) => candidate !== ownerId);
    if (remainingOwners.length > 0) sharedSpyPosts[spaceId] = remainingOwners;
    else delete sharedSpyPosts[spaceId];
  }
  return { spyPosts, sharedSpyPosts };
}

export function canUseSpyPost(
  state: Pick<GameState, "swordmasterClaimed">,
  space: BoardSpace,
  owner: Player,
) {
  void state;
  if (!space.personal) return true;
  return owner.role === "Commander" && owner.team === space.personal;
}

export function canPlaceSpyPost(
  state: SpyPostState & Pick<GameState, "swordmasterClaimed">,
  space: BoardSpace,
  owner: Player,
) {
  if (spyPostOccupied(state, space.id)) return false;
  return canUseSpyPost(state, space, owner);
}

export function canPlaceSharedSpyPost(
  state: SpyPostState & Pick<GameState, "swordmasterClaimed">,
  space: BoardSpace,
  owner: Player,
) {
  if (!canUseSpyPost(state, space, owner)) return false;
  const owners = spyPostOwnerIds(state, space.id);
  return owners.length > 0 && owners.some((ownerId) => ownerId !== owner.id) && !owners.includes(owner.id);
}
