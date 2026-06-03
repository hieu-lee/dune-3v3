import {
  criticalLocationForConflict,
  criticalLocationForSpace,
  criticalLocationIncome,
  criticalLocationNames,
} from "./critical-locations";
import { recordTurnSpiceGainAndCompleteHarvestContracts } from "./contract-rules";
import { playerTroopSupply } from "./deck-utils";
import type { BoardSpace, ConflictCard, GameState, PendingAction, Player } from "./types";

type ControlDefensePendingAction = Extract<PendingAction, { kind: "control-defense" }>;

export function pendingActionForControlDefense(
  state: Pick<GameState, "locationControl">,
  conflict: ConflictCard | null | undefined,
  players: Player[],
): ControlDefensePendingAction | undefined {
  if (!conflict) return undefined;
  const location = criticalLocationForConflict(conflict);
  const ownerId = location ? state.locationControl[location] : undefined;
  const owner = ownerId ? players.find((player) => player.id === ownerId) : undefined;
  if (!location || !owner || owner.role !== "Ally" || playerTroopSupply(owner) <= 0) return undefined;
  return {
    kind: "control-defense",
    ownerId: owner.id,
    location,
    source: conflict.name,
  };
}

export function resolveLocationControlIncome(state: GameState, space: BoardSpace): GameState {
  const location = criticalLocationForSpace(space.id);
  const ownerId = location ? state.locationControl[location] : undefined;
  const owner = ownerId ? state.players.find((player) => player.id === ownerId) : undefined;
  if (!location || !owner) return state;

  const income = criticalLocationIncome[location];
  const nextState = {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            resources: {
              ...player.resources,
              [income.resource]: player.resources[income.resource] + income.amount,
            },
          }
        : player,
    ),
    log: [
      `${owner.leader} gains ${income.amount} ${income.resource} from controlling ${criticalLocationNames[location]}.`,
      ...state.log,
    ],
  };
  return income.resource === "spice"
    ? recordTurnSpiceGainAndCompleteHarvestContracts(nextState, owner.id, income.amount).state
    : nextState;
}
