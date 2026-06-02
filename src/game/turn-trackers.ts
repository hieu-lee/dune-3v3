import type { GameState } from "./types";

export function hasGainedSpiceThisTurn(state: Pick<GameState, "turnSpiceGains">, playerId: string) {
  return (state.turnSpiceGains[playerId] ?? 0) > 0;
}

export function hasVisitedMakerSpaceThisRound(state: Pick<GameState, "roundMakerSpaceVisits">, playerId: string) {
  return Boolean(state.roundMakerSpaceVisits?.[playerId]);
}

export function recordRoundMakerSpaceVisit(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  return {
    ...state,
    roundMakerSpaceVisits: {
      ...state.roundMakerSpaceVisits,
      [playerId]: true,
    },
  };
}

export function recordTurnSpiceGain(state: GameState, playerId: string, amount: number): GameState {
  if (state.phase !== "playing" || amount <= 0) return state;
  return {
    ...state,
    turnSpiceGains: {
      ...state.turnSpiceGains,
      [playerId]: (state.turnSpiceGains[playerId] ?? 0) + amount,
    },
  };
}

export function hasUsedReverendMotherJessicaRepeat(
  state: Pick<GameState, "turnReverendMotherJessicaRepeats">,
  playerId: string,
) {
  return Boolean(state.turnReverendMotherJessicaRepeats[playerId]);
}

export function recordReverendMotherJessicaRepeat(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  return {
    ...state,
    turnReverendMotherJessicaRepeats: {
      ...state.turnReverendMotherJessicaRepeats,
      [playerId]: true,
    },
  };
}

export function hasDeployedThreeOrMoreUnitsThisTurn(
  state: Pick<GameState, "turnUnitDeployments">,
  playerId: string,
) {
  return hasDeployedUnitsThisTurn(state, playerId, 3);
}

export function hasDeployedUnitsThisTurn(
  state: Pick<GameState, "turnUnitDeployments">,
  playerId: string,
  count: number,
) {
  return (state.turnUnitDeployments[playerId] ?? 0) >= count;
}

export function recordTurnUnitDeployment(state: GameState, playerId: string, amount: number): GameState {
  if (state.phase !== "playing" || amount <= 0) return state;
  return {
    ...state,
    turnUnitDeployments: {
      ...state.turnUnitDeployments,
      [playerId]: (state.turnUnitDeployments[playerId] ?? 0) + amount,
    },
  };
}
