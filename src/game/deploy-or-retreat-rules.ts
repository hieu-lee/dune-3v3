import { conflictDeploymentBlockedFor } from "./conflict-rules";
import { advancePendingAction } from "./pending-actions";
import { recordTurnUnitDeployment } from "./turn-trackers";
import type { GameState, PendingAction } from "./types";

export type DeployOrRetreatTroopsChoice = "deploy" | "retreat";

type DeployOrRetreatTroopsPendingAction = Extract<PendingAction, { kind: "deploy-or-retreat-troops" }>;

export function canDeployForDeployOrRetreatTroops(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
) {
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  return Boolean(
    state.conflict &&
    recipient &&
    pending.troopCount > 0 &&
    recipient.garrison >= pending.troopCount &&
    !conflictDeploymentBlockedFor(state, pending.ownerId, pending.recipientId),
  );
}

export function canRetreatForDeployOrRetreatTroops(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
) {
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  return Boolean(
    state.conflict &&
    recipient &&
    pending.troopCount > 0 &&
    recipient.deployedTroops >= pending.troopCount,
  );
}

export function canResolveDeployOrRetreatTroopsChoice(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
) {
  return canDeployForDeployOrRetreatTroops(state, pending) || canRetreatForDeployOrRetreatTroops(state, pending);
}

export function resolveDeployOrRetreatTroopsChoice(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
  choice: DeployOrRetreatTroopsChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  if (!owner || !recipient || pending.troopCount <= 0) return state;

  if (choice === "deploy") {
    if (!canDeployForDeployOrRetreatTroops(state, pending)) return state;
    const nextState = {
      ...state,
      players: state.players.map((player) =>
        player.id === recipient.id
          ? {
              ...player,
              garrison: player.garrison - pending.troopCount,
              conflict: player.conflict + pending.troopCount * 2,
              deployedTroops: player.deployedTroops + pending.troopCount,
            }
          : player,
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} resolves ${pending.source}: ${recipient.leader} deploys ${pending.troopCount} ${pending.troopCount === 1 ? "troop" : "troops"}.`,
        ...state.log,
      ],
    };
    return recordTurnUnitDeployment(nextState, owner.id, pending.troopCount);
  }

  if (!canRetreatForDeployOrRetreatTroops(state, pending)) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === recipient.id
        ? {
            ...player,
            garrison: player.garrison + pending.troopCount,
            conflict: Math.max(0, player.conflict - pending.troopCount * 2),
            deployedTroops: player.deployedTroops - pending.troopCount,
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: ${recipient.leader} retreats ${pending.troopCount} ${pending.troopCount === 1 ? "troop" : "troops"}.`,
      ...state.log,
    ],
  };
}

export function skipDeployOrRetreatTroopsChoice(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
): GameState {
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} skips ${pending.source}.`, ...state.log],
  };
}
