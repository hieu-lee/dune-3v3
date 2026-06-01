import { playerHasConflictUnits } from "./conflict-rules";
import { advancePendingAction } from "./pending-actions";
import type { GameState, PendingAction } from "./types";

type RetreatTroopsForStrengthPendingAction = Extract<PendingAction, { kind: "retreat-troops-for-strength" }>;

export function canResolveRetreatTroopsForStrength(
  state: GameState,
  pending: RetreatTroopsForStrengthPendingAction,
) {
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  return Boolean(
    recipient &&
    playerHasConflictUnits(recipient) &&
    recipient.deployedTroops >= pending.troopCount &&
    pending.troopCount > 0 &&
    pending.strength > 0,
  );
}

export function resolveRetreatTroopsForStrength(
  state: GameState,
  pending: RetreatTroopsForStrengthPendingAction,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  if (!owner || !recipient || !canResolveRetreatTroopsForStrength(state, pending)) return state;

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === recipient.id
        ? {
            ...player,
            conflict: Math.max(0, player.conflict - pending.troopCount * 2 + pending.strength),
            deployedTroops: player.deployedTroops - pending.troopCount,
            garrison: player.garrison + pending.troopCount,
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: ${recipient.leader} retreats ${pending.troopCount} ${pending.troopCount === 1 ? "troop" : "troops"} to add ${pending.strength} strength.`,
      ...state.log,
    ],
  };
}

export function skipRetreatTroopsForStrength(
  state: GameState,
  pending: RetreatTroopsForStrengthPendingAction,
): GameState {
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} skips ${pending.source}.`, ...state.log],
  };
}
