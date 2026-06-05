import {
  stabanUnseenNetworkFactionIcons,
  stabanUnseenNetworkSource,
} from "./card-pending-rules";
import { boardSpaces } from "./data";
import { drawIntrigueCards } from "./intrigue-deck";
import { scoreActiveGurneyAlwaysSmilingForRecipient } from "./leader-rewards";
import { advancePendingAction } from "./pending-actions";
import { stabanTuekLeaderName } from "./player-setup";
import {
  placeableSpySpaces,
  recallableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import {
  normalizeSpyObservationPosts,
  removeSpyPostOwner,
  spyObservationPostIdForSpace,
  spyObservationPostLabelForSpace,
  spyPostOwnerIds,
  spyPostRecallCountForOwner,
} from "./spy-posts";
import {
  recordTurnSpiceGainAndCompleteHarvestContracts,
} from "./contract-rules";
import {
  hasDeployedThreeOrMoreUnitsThisTurn,
  recordTurnSpyRecall,
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
    !placeableSpySpaces(state, pending).some((candidate) => candidate.id === space.id)
  ) {
    return state;
  }

  const nextSpies = owner.spies - 1;
  const postId = spyObservationPostIdForSpace(space.id);
  const postLabel = spyObservationPostLabelForSpace(space.id);
  const players = state.players.map((player) =>
    player.id === owner.id ? { ...player, spies: nextSpies } : player,
  );
  const remaining = pending.recallForSupply
    ? pending.remaining - 1
    : Math.min(pending.remaining - 1, nextSpies);
  const sharedOwners = state.sharedSpyPosts[postId] ?? [];
  const spyPosts = pending.allowSharedPost
    ? state.spyPosts
    : { ...state.spyPosts, [postId]: owner.id };
  const sharedSpyPosts = pending.allowSharedPost
    ? { ...state.sharedSpyPosts, [postId]: [...sharedOwners, owner.id] }
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
      ? { pendingAction: { ...pending, remaining, mustPlaceSpy: false } }
      : stabanPending
        ? {
            pendingAction: stabanPending,
            pendingQueue: advanced.pendingAction ? [advanced.pendingAction, ...advanced.pendingQueue] : advanced.pendingQueue,
          }
        : advanced),
    log: [`${owner.leader} places a spy near ${postLabel} from ${pending.source}.`, ...state.log],
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
  if (!space || spyPostRecallCountForOwner(state, space.id, owner.id) <= 0) return state;
  if (!recallableSpySupplySpaces(state, pending).some((candidate) => candidate.id === space.id)) return state;

  const { spyPosts, sharedSpyPosts, removedSpyCount } = removeSpyPostOwner(state, space.id, owner.id);
  const recalledSpyCount = Math.max(1, removedSpyCount);
  return recordTurnSpyRecall({
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? { ...player, spies: player.spies + removedSpyCount } : player,
    ),
    spyPosts,
    sharedSpyPosts,
    pendingAction: { ...pending, recallForSupply: pending.remaining > 1, mustPlaceSpy: true },
    log: [`${owner.leader} recalls a spy from ${spyObservationPostLabelForSpace(space.id)} for ${pending.source}.`, ...state.log],
  }, owner.id, recalledSpyCount);
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
    return recordTurnSpiceGainAndCompleteHarvestContracts(rewardedState, owner.id, 1).state;
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
  if (
    !space ||
    spyPostRecallCountForOwner(state, space.id, owner.id) <= 0 ||
    pending.remaining <= 0 ||
    !recallableSpySpaces(state, pending).some((candidate) => candidate.id === space.id)
  ) {
    return state;
  }

  const { spyPosts, sharedSpyPosts, removedSpyCount } = removeSpyPostOwner(state, space.id, owner.id);
  const recalledSpyCount = Math.max(1, removedSpyCount);
  const remaining = pending.remaining - recalledSpyCount;
  const finalRecall = remaining <= 0;
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...next,
        spies: next.spies + removedSpyCount,
        persuasion: finalRecall ? next.persuasion + (pending.persuasionReward ?? 0) : next.persuasion,
      };
    }
    if (finalRecall && player.id === pending.combatRecipientId) {
      next = { ...next, conflict: next.conflict + pending.strength };
    }
    return next;
  });
  const strengthText = finalRecall && pending.strength > 0
    ? `, adding ${pending.strength} strength to ${recipient?.leader ?? "the chosen combatant"}`
    : "";
  const persuasionText = finalRecall && (pending.persuasionReward ?? 0) > 0
    ? `, gaining ${pending.persuasionReward} persuasion`
    : "";
  let recalledState = recordTurnSpyRecall({
    ...state,
    players,
    spyPosts,
    sharedSpyPosts,
    ...(finalRecall ? advancePendingAction(state) : { pendingAction: { ...pending, remaining } }),
    log: [`${owner.leader} recalls a spy from ${spyObservationPostLabelForSpace(space.id)} for ${pending.source}${strengthText}${persuasionText}.`, ...state.log],
  }, owner.id, recalledSpyCount);
  if (finalRecall) recalledState = normalizeSpyObservationPosts(recalledState);

  const resolvedState = finalRecall && pending.drawIntrigues
    ? drawIntrigueCards(recalledState, owner.id, pending.drawIntrigues, pending.source)
    : recalledState;
  return finalRecall && pending.strength > 0
    ? scoreActiveGurneyAlwaysSmilingForRecipient(resolvedState, pending.combatRecipientId)
    : resolvedState;
}

export function skipRecallSpy(state: GameState, pending: RecallSpyPendingAction): GameState {
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return normalizeSpyObservationPosts({
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to recall a spy for ${pending.source}.`, ...state.log],
  });
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
  return placeableSpySpaces(state, specialMissionSpyPending(player));
}

export function specialMissionRecallSpySpaces(state: GameState, player: Player) {
  return recallableSpySpaces(state, {
    kind: "recall-spy",
    ownerId: player.id,
    combatRecipientId: player.id,
    remaining: 1,
    strength: 0,
    source: "Special Mission",
    optional: false,
  });
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
  return placeableSpySpaces(state, distractionSpyPending(player));
}

export function canPlayDistractionPlotIntrigue(state: GameState, player: Player) {
  if (!hasDeployedThreeOrMoreUnitsThisTurn(state, player.id)) return false;
  const pending = distractionSpyPending(player);
  return placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0;
}
