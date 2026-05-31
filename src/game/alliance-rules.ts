import { factionLabels } from "./data";
import type { FactionId, GameState } from "./types";

export function setAllianceOwner(state: GameState, faction: FactionId, ownerId?: string): GameState {
  const previousOwnerId = state.alliances[faction];
  if (previousOwnerId === ownerId) return state;

  const owner = ownerId ? state.players.find((player) => player.id === ownerId) : undefined;
  if (ownerId && !owner) return state;
  const previousOwner = previousOwnerId
    ? state.players.find((player) => player.id === previousOwnerId)
    : undefined;

  const alliances = { ...state.alliances };
  if (ownerId) alliances[faction] = ownerId;
  else delete alliances[faction];

  const players = state.players.map((player) => {
    let vpDelta = 0;
    if (player.id === previousOwnerId) vpDelta -= 1;
    if (player.id === ownerId) vpDelta += 1;
    return vpDelta === 0 ? player : { ...player, vp: player.vp + vpDelta };
  });

  const label = factionLabels[faction];
  const logEntry = owner
    ? previousOwner
      ? `${owner.leader} takes the ${label} Alliance from ${previousOwner.leader}.`
      : `${owner.leader} claims the ${label} Alliance.`
    : previousOwner
      ? `${previousOwner.leader} returns the ${label} Alliance.`
      : undefined;

  return {
    ...state,
    alliances,
    players,
    log: logEntry ? [logEntry, ...state.log] : state.log,
  };
}

export function playerHasAnyAlliance(state: Pick<GameState, "alliances">, playerId: string) {
  return Object.values(state.alliances).includes(playerId);
}
