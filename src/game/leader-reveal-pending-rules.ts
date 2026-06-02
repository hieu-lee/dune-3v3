import {
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  feydRauthaLeaderName,
  ladyAmberMetulliLeaderName,
} from "./leader-constants";
import {
  recallableSpySpaces,
} from "./spy-choices";
import type {
  GameState,
  PendingAction,
  Player,
} from "./types";

function pendingActionForFeydDeviousStrength(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction | undefined {
  if (source.leader !== feydRauthaLeaderName || source.role !== "Ally") return undefined;
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient || !playerHasConflictUnits(recipient)) return undefined;
  const pending: Extract<PendingAction, { kind: "recall-spy" }> = {
    kind: "recall-spy",
    ownerId: source.id,
    combatRecipientId,
    remaining: 1,
    strength: 2,
    source: "Devious Strength",
    optional: true,
  };
  return recallableSpySpaces(state, pending).length > 0 ? pending : undefined;
}

function pendingActionForLadyAmberDesertScouts(source: Player): PendingAction | undefined {
  if (
    source.leader !== ladyAmberMetulliLeaderName ||
    source.role !== "Ally" ||
    source.deployedTroops <= 0
  ) {
    return undefined;
  }
  return {
    kind: "amber-desert-scouts",
    ownerId: source.id,
    source: "Desert Scouts",
  };
}

export function pendingActionsForRevealLeaderAbilities(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  return [
    pendingActionForFeydDeviousStrength(source, state, combatRecipientId),
    pendingActionForLadyAmberDesertScouts(source),
  ].filter((action): action is PendingAction => Boolean(action));
}
