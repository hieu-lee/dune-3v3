import type { GameState } from "./types";

export function hasGainedSpiceThisTurn(state: Pick<GameState, "turnSpiceGains">, playerId: string) {
  return (state.turnSpiceGains[playerId] ?? 0) > 0;
}

export function hasAcquiredCardThisTurn(
  state: Pick<GameState, "turnAcquiredCardIds">,
  playerId: string,
  cardId: string,
) {
  return Boolean(state.turnAcquiredCardIds?.[playerId]?.includes(cardId));
}

export function recordTurnAcquiredCard(state: GameState, playerId: string, cardIds: string | string[]): GameState {
  if (state.phase !== "playing") return state;
  const existingCardIds = state.turnAcquiredCardIds?.[playerId] ?? [];
  const nextCardIds = [...new Set([
    ...existingCardIds,
    ...(Array.isArray(cardIds) ? cardIds : [cardIds]),
  ])];
  return {
    ...state,
    turnAcquiredCardIds: {
      ...state.turnAcquiredCardIds,
      [playerId]: nextCardIds,
    },
  };
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

export function hasVisitedMakerSpaceThisTurn(state: Pick<GameState, "turnMakerSpaceVisits">, playerId: string) {
  return Boolean(state.turnMakerSpaceVisits?.[playerId]);
}

export function recordTurnMakerSpaceVisit(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  const owner = state.players.find((player) => player.id === playerId);
  const heldContractIds = owner?.contracts
    .filter((contract) => !contract.completed)
    .map((contract) => contract.card.id) ?? [];
  const eligibleContractIds = [
    ...new Set([
      ...(state.turnHarvestContractIds?.[playerId] ?? []),
      ...heldContractIds,
    ]),
  ];
  return {
    ...state,
    turnHarvestContractIds: {
      ...state.turnHarvestContractIds,
      [playerId]: eligibleContractIds,
    },
    turnMakerSpaceVisits: {
      ...state.turnMakerSpaceVisits,
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

export function hasRecalledSpyThisTurn(state: Pick<GameState, "turnSpyRecalls">, playerId: string) {
  return (state.turnSpyRecalls[playerId] ?? 0) > 0;
}

export function recordTurnSpyRecall(state: GameState, playerId: string, amount = 1): GameState {
  if (state.phase !== "playing" || amount <= 0) return state;
  return {
    ...state,
    turnSpyRecalls: {
      ...state.turnSpyRecalls,
      [playerId]: (state.turnSpyRecalls[playerId] ?? 0) + amount,
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
