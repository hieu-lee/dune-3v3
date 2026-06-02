import {
  conflictProtectedByShieldWall,
} from "./critical-locations";
import {
  conflictDeploymentBlockedFor,
} from "./conflict-rules";
import {
  isCallToArmsIntrigue,
  isDetonationIntrigue,
  isSpecialMissionIntrigue,
  isUnexpectedAlliesIntrigue,
} from "./card-identifiers";
import {
  activatedAllyEffectOwner,
} from "./market-rules";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import {
  canPlaySpecialMissionPlaceSpy,
  specialMissionRecallSpySpaces,
} from "./spy-pending-rules";
import {
  removeSpyPostOwner,
} from "./spy-posts";
import {
  recordTurnSpiceGain,
  recordTurnUnitDeployment,
} from "./turn-trackers";
import type {
  GameState,
  PendingAction,
} from "./types";

export type SpecialMissionChoice =
  | { kind: "place-spy" }
  | { kind: "recall-spy"; spaceId: string };

export function playSpecialMissionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: SpecialMissionChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isSpecialMissionIntrigue(intrigue) || !choice || typeof choice !== "object") return state;

  if (choice.kind === "place-spy") {
    if (!canPlaySpecialMissionPlaceSpy(state, player)) return state;
    return playTypedPlotIntrigue(
      state,
      playerId,
      intrigueId,
      isSpecialMissionIntrigue,
      (actor) => `${actor.leader} plays Special Mission and may place a spy on a City observation post.`,
      { choiceId: "place-spy" },
    );
  }

  if (choice.kind === "recall-spy") {
    const space = specialMissionRecallSpySpaces(state, player).find((candidate) => candidate.id === choice.spaceId);
    if (!space) return state;
    const { spyPosts, sharedSpyPosts } = removeSpyPostOwner(state, space.id, player.id);
    const shieldWallText = state.shieldWall ? ", removes the Shield Wall," : "";
    return recordTurnSpiceGain({
      ...state,
      shieldWall: false,
      spyPosts,
      sharedSpyPosts,
      players: state.players.map((candidate) =>
        candidate.id === player.id
          ? {
              ...candidate,
              resources: { ...candidate.resources, spice: candidate.resources.spice + 2 },
              spies: candidate.spies + 1,
              intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
            }
          : candidate,
      ),
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [
        `${player.leader} plays Special Mission, recalls a spy from ${space.name}${shieldWallText} and gains 2 spice.`,
        ...state.log,
      ],
    }, player.id, 2);
  }

  return state;
}

export function playDetonationIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: "shield-wall" | "deploy",
  deployOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDetonationIntrigue(intrigue)) return state;
  if (choice === "shield-wall" && !state.shieldWall) return state;
  const deployOwnerResult = choice === "deploy"
    ? activatedAllyEffectOwner(state, player, deployOwnerId)
    : { valid: true, owner: undefined };
  if (choice === "deploy" && (!state.conflict || !deployOwnerResult.valid || !deployOwnerResult.owner)) return state;
  if (
    choice === "deploy" &&
    deployOwnerResult.owner &&
    conflictDeploymentBlockedFor(state, player.id, deployOwnerResult.owner.id)
  ) {
    return state;
  }

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? { ...candidate, intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id) }
      : candidate,
  );
  const baseState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
  };

  if (choice === "shield-wall") {
    return {
      ...baseState,
      shieldWall: false,
      log: [`${player.leader} plays Detonation and removes the Shield Wall.`, ...state.log],
    };
  }

  const deployOwner = deployOwnerResult.owner;
  if (!deployOwner) return state;
  const deployable = Math.min(deployOwner.garrison, 4);
  const deployLabel = deployOwner && deployOwner.id !== player.id ? ` for ${deployOwner.leader}` : "";
  const deployPending: PendingAction | undefined = deployable > 0
    ? { kind: "deploy", ownerId: deployOwner.id, remaining: deployable, source: "Detonation" }
    : undefined;
  return {
    ...baseState,
    pendingAction: deployPending,
    log: [
      deployable > 0
        ? `${player.leader} plays Detonation${deployLabel} and may deploy up to ${deployable} troops.`
        : `${player.leader} plays Detonation${deployLabel} and deploys no troops.`,
      ...state.log,
    ],
  };
}

export function playUnexpectedAlliesIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  removeShieldWall: boolean,
  sandwormOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isUnexpectedAlliesIntrigue(intrigue)) return state;
  if (!state.conflict || player.resources.water < 2) return state;
  if (state.shieldWall && conflictProtectedByShieldWall(state.conflict) && !removeShieldWall) return state;

  const sandwormOwnerResult = activatedAllyEffectOwner(state, player, sandwormOwnerId);
  if (!sandwormOwnerResult.valid || !sandwormOwnerResult.owner) return state;
  const sandwormOwner = sandwormOwnerResult.owner;
  if (conflictDeploymentBlockedFor(state, player.id, sandwormOwner.id)) return state;

  const removedShieldWall = removeShieldWall && state.shieldWall;
  const ownerLabel = sandwormOwner.id !== player.id ? ` for ${sandwormOwner.leader}` : "";
  const shieldLabel = removedShieldWall ? " removes the Shield Wall," : "";

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, water: next.resources.water - 2 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === sandwormOwner.id) {
      next = {
        ...next,
        conflict: next.conflict + 3,
        deployedSandworms: next.deployedSandworms + 1,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    shieldWall: removedShieldWall ? false : state.shieldWall,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Unexpected Allies${ownerLabel}, spends 2 water,${shieldLabel} and summons 1 sandworm.`,
      ...state.log,
    ],
  };
  return recordTurnUnitDeployment(nextState, player.id, 1);
}

export function playCallToArmsPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isCallToArmsIntrigue,
    (player) =>
      `${player.leader} plays Call to Arms; acquisitions during this Reveal turn will recruit 1 troop.`,
  );
}
