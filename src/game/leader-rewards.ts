import { resolveAllianceOwnersForInfluenceChanges } from "./alliance-rules";
import { playerHasConflictUnits } from "./conflict-rules";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  gurneyHalleckLeaderName,
  ladyMargotFenringLeaderName,
  muadDibLeaderName,
  princessIrulanLeaderName,
} from "./leader-constants";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { FactionId, GameState, Player } from "./types";

const influenceVictoryPointThreshold = 2;
const gurneyAlwaysSmilingBaseThreshold = 6;
const gurneyAlwaysSmilingSixPlayerThreshold = 10;
const margotLoyaltyFaction: FactionId = "bene";
const margotLoyaltyThreshold = 2;
const margotLoyaltySpice = 2;
const irulanBirthrightFaction: FactionId = "greatHouses";
const irulanBirthrightThreshold = 2;

export function scoreGurneyAlwaysSmiling(state: GameState, playerId: string): GameState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const threshold = state.players.length === 6 ? gurneyAlwaysSmilingSixPlayerThreshold : gurneyAlwaysSmilingBaseThreshold;
  if (
    !player ||
    state.phase !== "playing" ||
    state.players[state.activeSeat]?.id !== player.id ||
    player.leader !== gurneyHalleckLeaderName ||
    !player.revealed ||
    player.gurneyAlwaysSmilingScored ||
    !playerHasConflictUnits(player) ||
    player.conflict < threshold
  ) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === player.id
        ? { ...candidate, vp: candidate.vp + 1, gurneyAlwaysSmilingScored: true }
        : candidate,
    ),
    log: [
      `${player.leader} resolves Always Smiling with ${player.conflict} strength in the Conflict and gains 1 VP.`,
      ...state.log,
    ],
  };
}

export function scoreActiveGurneyAlwaysSmilingForRecipient(state: GameState, recipientId: string): GameState {
  const activePlayer = state.players[state.activeSeat];
  return activePlayer?.id === recipientId ? scoreGurneyAlwaysSmiling(state, recipientId) : state;
}

export function markMuadDibUnpredictableFoeResolved(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, muadDibUnpredictableFoeResolved: true } : player
    ),
  };
}

export function resolveMuadDibUnpredictableFoe(state: GameState, recipientId?: string): GameState {
  const source = state.players[state.activeSeat];
  if (
    !source ||
    state.phase !== "playing" ||
    source.leader !== muadDibLeaderName ||
    source.role !== "Commander" ||
    !source.revealed ||
    source.muadDibUnpredictableFoeResolved
  ) {
    return state;
  }

  const recipient = state.players.find((player) => player.id === (recipientId ?? source.revealActivatedAllyId));
  if (
    !recipient ||
    recipient.role !== "Ally" ||
    recipient.team !== source.team ||
    recipient.deployedSandworms < 1
  ) {
    return state;
  }

  return drawIntrigueCards(markMuadDibUnpredictableFoeResolved(state, source.id), source.id, 1, "Reveal");
}

export function adjustInfluence(player: Player, faction: FactionId, amount: number): Player {
  const previous = player.influence[faction];
  const next = Math.max(0, previous + amount);
  const vpDelta =
    previous < influenceVictoryPointThreshold && next >= influenceVictoryPointThreshold
      ? 1
      : previous >= influenceVictoryPointThreshold && next < influenceVictoryPointThreshold
        ? -1
        : 0;
  return {
    ...player,
    vp: player.vp + vpDelta,
    influence: { ...player.influence, [faction]: next },
  };
}

function reachesPrincessIrulanBirthright(previous: Player, next: Player) {
  return (
    previous.leader === princessIrulanLeaderName &&
    next.leader === princessIrulanLeaderName &&
    previous.influence[irulanBirthrightFaction] < irulanBirthrightThreshold &&
    next.influence[irulanBirthrightFaction] >= irulanBirthrightThreshold
  );
}

function reachesLadyMargotLoyalty(previous: Player, next: Player) {
  return (
    previous.leader === ladyMargotFenringLeaderName &&
    next.leader === ladyMargotFenringLeaderName &&
    previous.influence[margotLoyaltyFaction] < margotLoyaltyThreshold &&
    next.influence[margotLoyaltyFaction] >= margotLoyaltyThreshold
  );
}

export function resolveLeaderInfluenceThresholdRewards(state: GameState, previousPlayers: Player[]): GameState {
  const thresholdRewardState = previousPlayers.reduce((nextState, previous) => {
    const current = nextState.players.find((player) => player.id === previous.id);
    if (!current) return nextState;
    if (reachesPrincessIrulanBirthright(previous, current)) {
      const previousLog = nextState.log;
      const drawnState = drawIntrigueCards(nextState, current.id, 1, "Imperial Birthright");
      const addedLogCount = drawnState.log.length - previousLog.length;
      if (previousLog.length === 0 || addedLogCount <= 0) return drawnState;
      return {
        ...drawnState,
        log: [
          previousLog[0],
          ...drawnState.log.slice(0, addedLogCount),
          ...previousLog.slice(1),
        ],
      };
    }
    if (!reachesLadyMargotLoyalty(previous, current)) return nextState;
    const loyaltyLog = `${current.leader} resolves Loyalty: gains ${margotLoyaltySpice} spice.`;
    const rewardedState = {
      ...nextState,
      players: nextState.players.map((player) =>
        player.id === current.id
          ? {
              ...player,
              resources: {
                ...player.resources,
                spice: player.resources.spice + margotLoyaltySpice,
              },
            }
          : player,
      ),
      log: nextState.log.length > 0
        ? [nextState.log[0], loyaltyLog, ...nextState.log.slice(1)]
        : [loyaltyLog],
    };
    return recordTurnSpiceGain(rewardedState, current.id, margotLoyaltySpice);
  }, state);
  return resolveAllianceOwnersForInfluenceChanges(thresholdRewardState, previousPlayers);
}

export function adjustInfluenceAndResolveThresholdRewards(
  state: GameState,
  playerId: string,
  faction: FactionId,
  amount: number,
): GameState {
  const previousPlayers = state.players;
  const nextState = {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? adjustInfluence(player, faction, amount) : player,
    ),
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, previousPlayers);
}
