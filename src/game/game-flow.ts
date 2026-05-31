import { teams } from "./data";
import { emptyMakerSpice, makerSpaceIds } from "./setup-utils";
import type { BoardSpace, GameState, Player, TeamId } from "./types";

export function advanceSeat(state: GameState): number {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const nextSeat = (state.activeSeat + offset) % state.players.length;
    const nextPlayer = state.players[nextSeat];
    if (!nextPlayer.revealed || nextPlayer.agentsReady > 0) return nextSeat;
  }
  return state.activeSeat;
}

export function allPlayersDone(players: Player[]) {
  return players.every((player) => player.revealed && player.agentsReady === 0);
}

export function advanceMakerSpice(state: GameState): Record<string, number> {
  const makerSpice = { ...emptyMakerSpice(), ...state.makerSpice };
  makerSpaceIds.forEach((spaceId) => {
    if (!state.spaces[spaceId]) makerSpice[spaceId] += 1;
  });
  return makerSpice;
}

export function collectMakerSpice(state: GameState, space: BoardSpace): Record<string, number> {
  if (!space.maker) return state.makerSpice;
  return { ...emptyMakerSpice(), ...state.makerSpice, [space.id]: 0 };
}

function teamVictoryPoints(players: Player[], team: TeamId) {
  return players
    .filter((player) => player.team === team)
    .reduce((sum, player) => sum + player.vp, 0);
}

export function endgameTriggerReason(state: GameState): string | undefined {
  const leader = state.players.find((player) => player.vp >= 10);
  if (leader) return `${leader.leader} reached 10 VP.`;
  if (state.conflictDeck.length === 0) return "The Conflict deck is empty.";
  return undefined;
}

export function finishEndgame(state: GameState): GameState {
  if (state.phase === "finished") return state;
  const muaddibVp = teamVictoryPoints(state.players, "muaddib");
  const shaddamVp = teamVictoryPoints(state.players, "shaddam");
  const winningTeam = muaddibVp === shaddamVp ? undefined : muaddibVp > shaddamVp ? "muaddib" : "shaddam";
  return {
    ...state,
    phase: "finished",
    winningTeam,
    log: [
      winningTeam
        ? `${teams[winningTeam].name} wins ${Math.max(muaddibVp, shaddamVp)}-${Math.min(muaddibVp, shaddamVp)}.`
        : `The game ends tied at ${muaddibVp}-${shaddamVp}.`,
      ...state.log,
    ],
  };
}
