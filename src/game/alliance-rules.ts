import { factionIds, factionLabels } from "./data";
import type { FactionId, GameState, Player } from "./types";

export const allianceInfluenceThreshold = 4;

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

function influenceFor(player: Player, faction: FactionId) {
  return player.influence[faction] ?? 0;
}

function bestAllianceCandidate(
  state: GameState,
  faction: FactionId,
  isCandidate: (player: Player) => boolean,
) {
  return state.players
    .map((player, seatIndex) => ({ influence: influenceFor(player, faction), player, seatIndex }))
    .filter(({ player }) => isCandidate(player))
    .sort((first, second) => second.influence - first.influence || first.seatIndex - second.seatIndex)[0]
    ?.player;
}

function resolveAllianceOwner(state: GameState, faction: FactionId): GameState {
  const currentOwnerId = state.alliances[faction];
  const currentOwner = currentOwnerId
    ? state.players.find((player) => player.id === currentOwnerId)
    : undefined;

  if (currentOwnerId && !currentOwner) return setAllianceOwner(state, faction);

  if (!currentOwner) {
    const claimant = bestAllianceCandidate(
      state,
      faction,
      (player) => influenceFor(player, faction) >= allianceInfluenceThreshold,
    );
    return claimant ? setAllianceOwner(state, faction, claimant.id) : state;
  }

  const currentOwnerInfluence = influenceFor(currentOwner, faction);
  if (currentOwnerInfluence < allianceInfluenceThreshold) {
    const replacement = bestAllianceCandidate(
      state,
      faction,
      (player) =>
        player.id !== currentOwner.id &&
        influenceFor(player, faction) >= allianceInfluenceThreshold,
    );
    return setAllianceOwner(state, faction, replacement?.id);
  }

  const challenger = bestAllianceCandidate(
    state,
    faction,
    (player) =>
      player.id !== currentOwner.id &&
      influenceFor(player, faction) > currentOwnerInfluence,
  );
  return challenger ? setAllianceOwner(state, faction, challenger.id) : state;
}

export function resolveAllianceOwners(state: GameState): GameState {
  return factionIds.reduce((nextState, faction) => resolveAllianceOwner(nextState, faction), state);
}

export function resolveAllianceOwnersForInfluenceChanges(
  state: GameState,
  previousPlayers: Player[],
): GameState {
  const changedFactions = factionIds.filter((faction) =>
    state.players.some((player) => {
      const previous = previousPlayers.find((candidate) => candidate.id === player.id);
      return previous && influenceFor(previous, faction) !== influenceFor(player, faction);
    })
  );
  return changedFactions.reduce((nextState, faction) => resolveAllianceOwner(nextState, faction), state);
}

export function playerHasAnyAlliance(state: Pick<GameState, "alliances">, playerId: string) {
  return Object.values(state.alliances).includes(playerId);
}
