import { conflictProtectedByShieldWall } from "./critical-locations";
import type { GameState, Player } from "./types";

export function playerHasConflictUnits(player: Player) {
  return player.deployedTroops + player.deployedSandworms > 0;
}

export function playerDoublesConflictRewards(player: Player) {
  return player.deployedSandworms > 0;
}

export function sandwormRewardReminderEntries(players: Player[]) {
  const doublers = players.filter(playerDoublesConflictRewards);
  if (doublers.length === 0) return [];

  const names = doublers.map((player) => player.leader).join(", ");
  return [
    `${names} ${doublers.length === 1 ? "has" : "have"} sandworms: double printed Conflict-card rewards they take; battle icons and location control are not doubled.`,
  ];
}

export function canHaveMakerHooks(player: Player) {
  return player.team === "muaddib" && player.role === "Ally";
}

export function canSummonSandworms(state: Pick<GameState, "conflict" | "shieldWall">, owner: Player, count: number) {
  if (!canHaveMakerHooks(owner) || !owner.makerHooks || count <= 0 || !state.conflict) return false;
  return !state.shieldWall || !conflictProtectedByShieldWall(state.conflict);
}

export function conflictDeploymentBlockedFor(
  state: Pick<GameState, "conflictDeploymentBlock">,
  actorId: string,
  ownerId: string,
) {
  const block = state.conflictDeploymentBlock;
  return Boolean(block && block.actorId === actorId && block.ownerId === ownerId);
}

export function conflictDeploymentBlockedForOwner(state: Pick<GameState, "conflictDeploymentBlock">, ownerId: string) {
  return state.conflictDeploymentBlock?.ownerId === ownerId;
}
