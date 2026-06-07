import { boardSpaces } from "./data";
import type { BoardSpace, GameState, Player } from "./types";

export type SpyPostState = Pick<GameState, "spyPosts" | "sharedSpyPosts">;

export type SpyObservationPost = {
  id: string;
  representativeSpaceId?: string;
  spaceIds: readonly string[];
};

export const spyObservationPosts: readonly SpyObservationPost[] = [
  { id: "arrakeen-spice-refinery", spaceIds: ["arrakeen", "spice-refinery"] },
  {
    id: "high-council-imperial-privilege-swordmaster",
    spaceIds: ["high-council", "imperial-privilege", "swordmaster"],
  },
  { id: "assembly-hall-gather-support", spaceIds: ["assembly-hall", "gather-support"] },
  { id: "shipping-accept-contract", spaceIds: ["shipping", "accept-contract"] },
  { id: "military-support-economic-support", spaceIds: ["military-support", "economic-support"] },
  { id: "espionage-secrets", spaceIds: ["espionage", "secrets"] },
  { id: "controversial-tech-expedition", spaceIds: ["controversial-tech", "expedition"] },
  { id: "sietch-tabr-research-station", spaceIds: ["sietch-tabr", "research-station"] },
  { id: "research-station-spice-refinery", spaceIds: ["research-station", "spice-refinery"] },
  { id: "deliver-supplies-heighliner", spaceIds: ["deliver-supplies", "heighliner"] },
  { id: "carthag", spaceIds: ["carthag"] },
  { id: "deep-desert", spaceIds: ["deep-desert"] },
  { id: "habbanya-erg", spaceIds: ["habbanya-erg"] },
  { id: "hagga-basin", spaceIds: ["hagga-basin"] },
  { id: "imperial-basin", spaceIds: ["imperial-basin"] },
];

function spyObservationPostRepresentativeSpaceId(post: SpyObservationPost) {
  return post.representativeSpaceId ?? post.spaceIds[0] ?? post.id;
}

const observationPostById = new Map(spyObservationPosts.map((post) => [post.id, post]));
const observationPostByRepresentativeSpaceId = new Map(
  spyObservationPosts.map((post) => [spyObservationPostRepresentativeSpaceId(post), post] as const),
);
const observationPostsByObservedSpaceId = spyObservationPosts.reduce((postsBySpaceId, post) => {
  for (const spaceId of post.spaceIds) {
    const posts = postsBySpaceId.get(spaceId) ?? [];
    posts.push(post);
    postsBySpaceId.set(spaceId, posts);
  }
  return postsBySpaceId;
}, new Map<string, SpyObservationPost[]>());
const defaultObservationPostBySpaceId = new Map<string, SpyObservationPost>();
for (const post of spyObservationPosts) {
  defaultObservationPostBySpaceId.set(spyObservationPostRepresentativeSpaceId(post), post);
}
for (const post of spyObservationPosts) {
  for (const spaceId of post.spaceIds) {
    if (!defaultObservationPostBySpaceId.has(spaceId)) defaultObservationPostBySpaceId.set(spaceId, post);
  }
}
const observedSpaceIds = new Set(spyObservationPosts.flatMap((post) => post.spaceIds));
const boardSpaceNameById = new Map(boardSpaces.map((space) => [space.id, space.name]));

function uniqueValues<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function spyObservationPostForSpace(spaceId: string) {
  return (
    observationPostByRepresentativeSpaceId.get(spaceId) ??
    defaultObservationPostBySpaceId.get(spaceId) ??
    observationPostById.get(spaceId)
  );
}

export function spyObservationPostIdForSpace(spaceId: string) {
  return spyObservationPostForSpace(spaceId)?.id ?? spaceId;
}

export function spyObservationPostSpaceIdsForSpace(spaceId: string) {
  return spyObservationPostForSpace(spaceId)?.spaceIds ?? [spaceId];
}

function spyObservationPostStorageIdsForPost(post: SpyObservationPost) {
  return uniqueValues([
    post.id,
    ...post.spaceIds.filter((spaceId) => defaultObservationPostBySpaceId.get(spaceId)?.id === post.id),
  ]);
}

function spyObservationPostStorageIdsForSpace(spaceId: string) {
  const post = spyObservationPostForSpace(spaceId);
  return post ? spyObservationPostStorageIdsForPost(post) : [spaceId];
}

export function spyObservationPostChoiceSpaces() {
  const representativeSpaceIds = new Set(spyObservationPosts.map(spyObservationPostRepresentativeSpaceId));
  return boardSpaces.filter((space) => representativeSpaceIds.has(space.id) || !observedSpaceIds.has(space.id));
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
  const posts = observationPostsByObservedSpaceId.get(spaceId);
  const storageIds = posts
    ? posts.flatMap(spyObservationPostStorageIdsForPost)
    : [spaceId];
  return uniqueValues(storageIds.flatMap((postId) => [
    state.spyPosts[postId],
    ...(state.sharedSpyPosts[postId] ?? []),
  ]).filter((ownerId): ownerId is string => Boolean(ownerId)));
}

export function spyObservationPostOwnerIds(
  state: SpyPostState,
  spaceId: string,
) {
  return uniqueValues(spyObservationPostStorageIdsForSpace(spaceId).flatMap((postId) => [
    state.spyPosts[postId],
    ...(state.sharedSpyPosts[postId] ?? []),
  ]).filter((ownerId): ownerId is string => Boolean(ownerId)));
}

export function spyPostOccupied(state: SpyPostState, spaceId: string) {
  return spyObservationPostOwnerIds(state, spaceId).length > 0;
}

export function playerHasSpyPost(state: SpyPostState, spaceId: string, playerId: string) {
  return spyPostOwnerIds(state, spaceId).includes(playerId);
}

export function spyPostCount(state: SpyPostState, ownerId: string) {
  return spyObservationPostChoiceSpaces()
    .filter((space) => spyObservationPostOwnerIds(state, space.id).includes(ownerId))
    .length;
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

export function spyObservationPostChoiceSpaceIdsForObservedSpace(spaceId: string) {
  const posts = observationPostsByObservedSpaceId.get(spaceId) ?? [];
  return posts.length > 0 ? posts.map(spyObservationPostRepresentativeSpaceId) : [spaceId];
}

export function spyEntrySpaceIdsForOccupiedSpace(
  state: SpyPostState,
  spaceId: string,
  ownerId: string,
) {
  return spyObservationPostChoiceSpaceIdsForObservedSpace(spaceId).filter((choiceSpaceId) =>
    spyObservationPostOwnerIds(state, choiceSpaceId).includes(ownerId)
  );
}

export function normalizeSpyObservationPosts(state: GameState): GameState {
  const spyPosts = { ...state.spyPosts };
  const sharedSpyPosts = { ...state.sharedSpyPosts };
  const refundedSpies = new Map<string, number>();
  const deferredRecallOwnerIds = pendingSpyRecallOwnerIds(state);
  let changed = false;

  for (const post of spyObservationPosts) {
    const storageIds = spyObservationPostStorageIdsForPost(post);
    const ownerCounts = new Map<string, number>();
    const ownerOrder: string[] = [];

    for (const storageId of storageIds) {
      addOwnerCount(ownerCounts, ownerOrder, state.spyPosts[storageId]);
      for (const ownerId of state.sharedSpyPosts[storageId] ?? []) {
        addOwnerCount(ownerCounts, ownerOrder, ownerId);
      }
    }

    if (ownerOrder.length === 0) continue;

    const legacyStoragePresent = storageIds.some((storageId) =>
      storageId !== post.id && (state.spyPosts[storageId] !== undefined || state.sharedSpyPosts[storageId] !== undefined)
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
    const [primaryOwner, ...finalSharedOwners] = finalOwnerEntries;
    if (!primaryOwner) continue;
    spyPosts[post.id] = primaryOwner;
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

export function removeSpyPostOwnerFromObservedSpace(
  state: SpyPostState,
  spaceId: string,
  ownerId: string,
  preferredSpaceId?: string,
) {
  const defaultPost = spyObservationPostForSpace(spaceId);
  const observedPosts = observationPostsByObservedSpaceId.get(spaceId) ?? [];
  const availablePosts = uniqueValues([
    defaultPost,
    ...observedPosts,
  ].filter((post): post is SpyObservationPost => Boolean(post)));
  const posts = preferredSpaceId
    ? availablePosts.filter((post) =>
        spyObservationPostRepresentativeSpaceId(post) === preferredSpaceId ||
        post.id === preferredSpaceId
      )
    : availablePosts;

  if (posts.length === 0) {
    const recalledSpaceId = preferredSpaceId ?? spaceId;
    const result = removeSpyPostOwner(state, recalledSpaceId, ownerId);
    return {
      ...result,
      recalledSpaceId: result.removedSpyCount > 0 ? recalledSpaceId : undefined,
    };
  }

  for (const post of posts) {
    const representativeSpaceId = spyObservationPostRepresentativeSpaceId(post);
    const result = removeSpyPostOwner(state, representativeSpaceId, ownerId);
    if (result.removedSpyCount > 0) {
      return {
        ...result,
        recalledSpaceId: representativeSpaceId,
      };
    }
  }

  return {
    spyPosts: { ...state.spyPosts },
    sharedSpyPosts: { ...state.sharedSpyPosts },
    removedSpyCount: 0,
    recalledSpaceId: undefined,
  };
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
  const owners = spyObservationPostOwnerIds(state, space.id);
  return owners.length > 0 && owners.some((ownerId) => ownerId !== owner.id) && !owners.includes(owner.id);
}
