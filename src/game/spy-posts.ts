import { boardSpaces } from "./data";
import type { BoardSpace, GameState, Player } from "./types";

export type SpyPostState = Pick<GameState, "spyPosts" | "sharedSpyPosts">;

export type SpyObservationPost = {
  id: string;
  spaceIds: readonly string[];
};

export const spyObservationPosts: readonly SpyObservationPost[] = [
  { id: "arrakeen-spice-refinery", spaceIds: ["arrakeen", "spice-refinery"] },
  { id: "deliver-supplies-heighliner", spaceIds: ["deliver-supplies", "heighliner"] },
];

const sharedObservationPostBySpaceId = new Map(
  spyObservationPosts.flatMap((post) => post.spaceIds.map((spaceId) => [spaceId, post] as const)),
);
const boardSpaceNameById = new Map(boardSpaces.map((space) => [space.id, space.name]));

export function spyObservationPostIdForSpace(spaceId: string) {
  return sharedObservationPostBySpaceId.get(spaceId)?.id ?? spaceId;
}

export function spyObservationPostSpaceIdsForSpace(spaceId: string) {
  return sharedObservationPostBySpaceId.get(spaceId)?.spaceIds ?? [spaceId];
}

function spyObservationPostStorageIdsForSpace(spaceId: string) {
  const post = sharedObservationPostBySpaceId.get(spaceId);
  if (!post) return [spaceId];
  return [post.id, ...post.spaceIds];
}

function arraysEqual(first: readonly string[], second: readonly string[]) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function addOwnerCount(ownerCounts: Map<string, number>, ownerOrder: string[], ownerId: string | undefined) {
  if (!ownerId) return;
  if (!ownerCounts.has(ownerId)) ownerOrder.push(ownerId);
  ownerCounts.set(ownerId, (ownerCounts.get(ownerId) ?? 0) + 1);
}

function pendingSpyRecallOwnerId(action: GameState["pendingAction"]) {
  if (action?.kind === "recall-spy") return action.ownerId;
  if (action?.kind === "conflict-vp-conversion" && action.cost.kind === "recall-spies") return action.ownerId;
  return undefined;
}

function pendingSpyRecallOwnerIds(state: GameState) {
  return new Set(
    [state.pendingAction, ...(state.pendingQueue ?? [])]
      .map(pendingSpyRecallOwnerId)
      .filter((ownerId): ownerId is string => Boolean(ownerId)),
  );
}

export function spyObservationPostLabelForSpace(spaceId: string) {
  return spyObservationPostSpaceIdsForSpace(spaceId)
    .map((observedSpaceId) => boardSpaceNameById.get(observedSpaceId) ?? observedSpaceId)
    .join(" / ");
}

export function spyObservationPostDetailForSpace(spaceId: string) {
  const observedSpaceNames = spyObservationPostSpaceIdsForSpace(spaceId)
    .map((observedSpaceId) => boardSpaceNameById.get(observedSpaceId) ?? observedSpaceId);
  return observedSpaceNames.length > 1
    ? `Observes ${observedSpaceNames.join(" and ")}.`
    : "Observes this board space.";
}

export function spyPostOwnerIds(
  state: SpyPostState,
  spaceId: string,
) {
  return Array.from(new Set(spyObservationPostStorageIdsForSpace(spaceId).flatMap((postId) => [
    state.spyPosts[postId],
    ...(state.sharedSpyPosts[postId] ?? []),
  ]).filter((ownerId): ownerId is string => Boolean(ownerId))));
}

export function spyPostOccupied(state: SpyPostState, spaceId: string) {
  return spyPostOwnerIds(state, spaceId).length > 0;
}

export function playerHasSpyPost(state: SpyPostState, spaceId: string, playerId: string) {
  return spyPostOwnerIds(state, spaceId).includes(playerId);
}

export function spyPostCount(state: SpyPostState, ownerId: string) {
  return new Set(
    boardSpaces
      .filter((space) => playerHasSpyPost(state, space.id, ownerId))
      .map((space) => spyObservationPostIdForSpace(space.id)),
  ).size;
}

export function spyPostRecallCountForOwner(
  state: SpyPostState,
  spaceId: string,
  ownerId: string,
) {
  return spyObservationPostStorageIdsForSpace(spaceId).reduce((count, postId) => {
    const primaryCount = state.spyPosts[postId] === ownerId ? 1 : 0;
    const sharedCount = (state.sharedSpyPosts[postId] ?? []).filter((candidate) => candidate === ownerId).length;
    return count + primaryCount + sharedCount;
  }, 0);
}

export function normalizeSpyObservationPosts(state: GameState): GameState {
  const spyPosts = { ...state.spyPosts };
  const sharedSpyPosts = { ...state.sharedSpyPosts };
  const refundedSpies = new Map<string, number>();
  const deferredRecallOwnerIds = pendingSpyRecallOwnerIds(state);
  let changed = false;

  for (const post of spyObservationPosts) {
    const storageIds = [post.id, ...post.spaceIds];
    const ownerCounts = new Map<string, number>();
    const ownerOrder: string[] = [];

    for (const storageId of storageIds) {
      addOwnerCount(ownerCounts, ownerOrder, state.spyPosts[storageId]);
      for (const ownerId of state.sharedSpyPosts[storageId] ?? []) {
        addOwnerCount(ownerCounts, ownerOrder, ownerId);
      }
    }

    if (ownerOrder.length === 0) continue;

    const legacyStoragePresent = post.spaceIds.some((spaceId) =>
      state.spyPosts[spaceId] !== undefined || state.sharedSpyPosts[spaceId] !== undefined
    );
    const finalOwnerEntries = ownerOrder.flatMap((ownerId) => {
      const count = ownerCounts.get(ownerId) ?? 0;
      const preservedCount = count > 1 && deferredRecallOwnerIds.has(ownerId) ? count : 1;
      const refund = count - preservedCount;
      if (refund > 0) refundedSpies.set(ownerId, (refundedSpies.get(ownerId) ?? 0) + refund);
      return Array.from({ length: preservedCount }, () => ownerId);
    });
    const currentOwnerEntries = [
      state.spyPosts[post.id],
      ...(state.sharedSpyPosts[post.id] ?? []),
    ].filter((ownerId): ownerId is string => Boolean(ownerId));
    const currentSharedOwners = state.sharedSpyPosts[post.id] ?? [];
    const alreadyNormalized =
      !legacyStoragePresent &&
      arraysEqual(currentOwnerEntries, finalOwnerEntries) &&
      (currentSharedOwners.length > 0 || state.sharedSpyPosts[post.id] === undefined);

    if (alreadyNormalized) continue;

    changed = true;
    for (const storageId of storageIds) {
      delete spyPosts[storageId];
      delete sharedSpyPosts[storageId];
    }
    spyPosts[post.id] = finalOwnerEntries[0];
    const finalSharedOwners = finalOwnerEntries.slice(1);
    if (finalSharedOwners.length > 0) sharedSpyPosts[post.id] = finalSharedOwners;
  }

  if (!changed) return state;

  return {
    ...state,
    players: state.players.map((player) => {
      const refund = refundedSpies.get(player.id) ?? 0;
      return refund > 0 ? { ...player, spies: player.spies + refund } : player;
    }),
    spyPosts,
    sharedSpyPosts,
  };
}

export function removeSpyPostOwner(
  state: SpyPostState,
  spaceId: string,
  ownerId: string,
) {
  const spyPosts = { ...state.spyPosts };
  const sharedSpyPosts = { ...state.sharedSpyPosts };
  let removedSpyCount = 0;
  for (const postId of spyObservationPostStorageIdsForSpace(spaceId)) {
    if (spyPosts[postId] === ownerId) {
      delete spyPosts[postId];
      removedSpyCount += 1;
    }
    if (sharedSpyPosts[postId]?.includes(ownerId)) {
      const previousOwners = sharedSpyPosts[postId];
      const remainingOwners = previousOwners.filter((candidate) => candidate !== ownerId);
      removedSpyCount += previousOwners.length - remainingOwners.length;
      if (remainingOwners.length > 0) sharedSpyPosts[postId] = remainingOwners;
      else delete sharedSpyPosts[postId];
    }
  }
  return { spyPosts, sharedSpyPosts, removedSpyCount };
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
