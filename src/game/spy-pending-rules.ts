import {
  stabanUnseenNetworkFactionIcons,
  stabanUnseenNetworkSource,
} from "./card-pending-rules";
import { boardSpaces } from "./data";
import { drawIntrigueCards } from "./intrigue-deck";
import { advancePendingAction } from "./pending-actions";
import { stabanTuekLeaderName } from "./player-setup";
import {
  placeableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import {
  canPlaceSharedSpyPost,
  canPlaceSpyPost,
  playerHasSpyPost,
  removeSpyPostOwner,
  spyPostOwnerIds,
} from "./spy-posts";
import {
  hasDeployedThreeOrMoreUnitsThisTurn,
  recordTurnSpiceGain,
} from "./turn-trackers";
import type {
  BoardSpace,
  GameState,
  PendingAction,
  Player,
} from "./types";

type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type StabanUnseenNetworkPendingAction = Extract<PendingAction, { kind: "staban-unseen-network" }>;
type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;
type FinishPendingResolution = (state: GameState) => GameState;

function stabanUnseenNetworkRewardForSpace(space: BoardSpace) {
  if (space.icon === "landsraad") return "landsraad" as const;
  if (stabanUnseenNetworkFactionIcons.includes(space.icon)) return "faction" as const;
  return undefined;
}

function pendingActionForStabanUnseenNetwork(
  state: GameState,
  owner: Player,
  space: BoardSpace,
): StabanUnseenNetworkPendingAction | undefined {
  if (owner.leader !== stabanTuekLeaderName || owner.role !== "Ally") return undefined;
  const reward = stabanUnseenNetworkRewardForSpace(space);
  if (!reward) return undefined;
  if (reward === "landsraad" && owner.resources.spice < 1) return undefined;
  if (reward === "faction" && owner.resources.solari < 2) return undefined;
  return {
    kind: "staban-unseen-network",
    ownerId: owner.id,
    spaceId: space.id,
    reward,
    source: stabanUnseenNetworkSource,
  };
}

export function resolvePlaceSpyForPending(
  state: GameState,
  pending: SpyPendingAction,
  spaceId: string,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  if (
    !owner ||
    !space ||
    owner.spies <= 0 ||
    pending.remaining <= 0 ||
    !(pending.allowSharedPost ? canPlaceSharedSpyPost(state, space, owner) : canPlaceSpyPost(state, space, owner)) ||
    (pending.placementIcon && space.icon !== pending.placementIcon)
  ) {
    return state;
  }

  const nextSpies = owner.spies - 1;
  const players = state.players.map((player) =>
    player.id === owner.id ? { ...player, spies: nextSpies } : player,
  );
  const remaining = Math.min(pending.remaining - 1, nextSpies);
  const sharedOwners = state.sharedSpyPosts[space.id] ?? [];
  const spyPosts = pending.allowSharedPost
    ? state.spyPosts
    : { ...state.spyPosts, [space.id]: owner.id };
  const sharedSpyPosts = pending.allowSharedPost
    ? { ...state.sharedSpyPosts, [space.id]: [...sharedOwners, owner.id] }
    : state.sharedSpyPosts;
  const advanced = advancePendingAction(state);
  const stabanPending =
    pending.postPlacementAction === "staban-unseen-network" && remaining === 0
      ? pendingActionForStabanUnseenNetwork(
          {
            ...state,
            players,
            spyPosts,
            sharedSpyPosts,
          },
          { ...owner, spies: nextSpies },
          space,
        )
      : undefined;
  return finishPendingResolution({
    ...state,
    players,
    spyPosts,
    sharedSpyPosts,
    ...(remaining > 0
      ? { pendingAction: { ...pending, remaining } }
      : stabanPending
        ? {
            pendingAction: stabanPending,
            pendingQueue: advanced.pendingAction ? [advanced.pendingAction, ...advanced.pendingQueue] : advanced.pendingQueue,
          }
        : advanced),
    log: [`${owner.leader} places a spy near ${space.name} from ${pending.source}.`, ...state.log],
  });
}

export function recallSpyForSupplyForPending(
  state: GameState,
  pending: SpyPendingAction,
  spaceId: string,
): GameState {
  if (!pending.recallForSupply) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.spies > 0 || pending.remaining <= 0) return state;
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  if (!space || !playerHasSpyPost(state, space.id, owner.id)) return state;
  if (!recallableSpySupplySpaces(state, pending).some((candidate) => candidate.id === space.id)) return state;

  const { spyPosts, sharedSpyPosts } = removeSpyPostOwner(state, space.id, owner.id);
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? { ...player, spies: player.spies + 1 } : player,
    ),
    spyPosts,
    sharedSpyPosts,
    pendingAction: { ...pending, recallForSupply: false, mustPlaceSpy: true },
    log: [`${owner.leader} recalls a spy from ${space.name} for ${pending.source}.`, ...state.log],
  };
}

export function resolveStabanSmuggleSpice(state: GameState, actorId: string, spaceId: string): GameState {
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  if (!space?.maker) return state;
  const ownerIds = spyPostOwnerIds(state, space.id).filter((ownerId) => ownerId !== actorId);
  return ownerIds.reduce((nextState, ownerId) => {
    const owner = nextState.players.find((player) => player.id === ownerId);
    if (!owner || owner.leader !== stabanTuekLeaderName || owner.role !== "Ally") return nextState;
    const rewardedState = {
      ...nextState,
      players: nextState.players.map((player) =>
        player.id === owner.id
          ? {
              ...player,
              resources: {
                ...player.resources,
                spice: player.resources.spice + 1,
              },
            }
          : player,
      ),
      log: [`${owner.leader} resolves Smuggle Spice from ${space.name}: gains 1 spice.`, ...nextState.log],
    };
    return recordTurnSpiceGain(rewardedState, owner.id, 1);
  }, state);
}

export function resolveStabanUnseenNetworkChoiceForPending(
  state: GameState,
  pending: StabanUnseenNetworkPendingAction,
  choice: "pay" | "skip",
  finishPendingResolution: FinishPendingResolution,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  if (!owner || !space || owner.leader !== stabanTuekLeaderName || owner.role !== "Ally") return state;
  if (choice === "skip") {
    return finishPendingResolution({
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source} after placing a spy near ${space.name}.`, ...state.log],
    });
  }

  if (pending.reward === "landsraad") {
    if (owner.resources.spice < 1) return state;
    return finishPendingResolution({
      ...state,
      players: state.players.map((player) =>
        player.id === owner.id
          ? {
              ...player,
              resources: {
                ...player.resources,
                spice: player.resources.spice - 1,
                solari: player.resources.solari + 3,
              },
            }
          : player,
      ),
      ...advancePendingAction(state),
      log: [`${owner.leader} spends 1 spice for ${pending.source}: gains 3 Solari.`, ...state.log],
    });
  }

  if (owner.resources.solari < 2) return state;
  const paidState = {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            resources: {
              ...player.resources,
              solari: player.resources.solari - 2,
            },
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [`${owner.leader} spends 2 Solari for ${pending.source}.`, ...state.log],
  };
  return finishPendingResolution(drawIntrigueCards(paidState, owner.id, 1, pending.source));
}

export function recallSpyForPending(
  state: GameState,
  pending: RecallSpyPendingAction,
  spaceId: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  if (!space || !playerHasSpyPost(state, space.id, owner.id) || pending.remaining <= 0) return state;

  const { spyPosts, sharedSpyPosts } = removeSpyPostOwner(state, space.id, owner.id);
  const remaining = pending.remaining - 1;
  const finalRecall = remaining <= 0;
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) next = { ...next, spies: next.spies + 1 };
    if (finalRecall && player.id === pending.combatRecipientId) {
      next = { ...next, conflict: next.conflict + pending.strength };
    }
    return next;
  });
  const strengthText = finalRecall
    ? `, adding ${pending.strength} strength to ${recipient?.leader ?? "the chosen combatant"}`
    : "";

  return {
    ...state,
    players,
    spyPosts,
    sharedSpyPosts,
    ...(finalRecall ? advancePendingAction(state) : { pendingAction: { ...pending, remaining } }),
    log: [`${owner.leader} recalls a spy from ${space.name} for ${pending.source}${strengthText}.`, ...state.log],
  };
}

export function skipRecallSpy(state: GameState, pending: RecallSpyPendingAction): GameState {
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to recall a spy for ${pending.source}.`, ...state.log],
  };
}

export function specialMissionSpyPending(player: Player): SpyPendingAction {
  return {
    kind: "spy",
    ownerId: player.id,
    remaining: 1,
    source: "Special Mission",
    placementIcon: "city",
    recallForSupply: true,
    mustPlaceSpy: true,
  };
}

export function specialMissionCitySpySpaces(state: GameState, player: Player) {
  return boardSpaces.filter((space) =>
    space.icon === "city" &&
    canPlaceSpyPost(state, space, player)
  );
}

export function specialMissionRecallSpySpaces(state: GameState, player: Player) {
  return boardSpaces.filter((space) => playerHasSpyPost(state, space.id, player.id));
}

export function canPlaySpecialMissionPlaceSpy(state: GameState, player: Player) {
  const pending = specialMissionSpyPending(player);
  if (player.spies > 0) return placeableSpySpaces(state, pending).length > 0;
  return recallableSpySupplySpaces(state, pending).length > 0;
}

export function distractionSpyPending(player: Player): SpyPendingAction {
  return {
    kind: "spy",
    ownerId: player.id,
    remaining: 1,
    source: "Distraction",
    recallForSupply: true,
    allowSharedPost: true,
  };
}

export function distractionSpySpaces(state: GameState, player: Player) {
  return boardSpaces.filter((space) => canPlaceSharedSpyPost(state, space, player));
}

export function canPlayDistractionPlotIntrigue(state: GameState, player: Player) {
  if (!hasDeployedThreeOrMoreUnitsThisTurn(state, player.id)) return false;
  const pending = distractionSpyPending(player);
  return placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0;
}
