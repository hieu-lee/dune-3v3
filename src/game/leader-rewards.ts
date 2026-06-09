import { resolveAllianceOwnersForInfluenceChanges } from "./alliance-rules";
import { playerHasConflictUnits } from "./conflict-rules";
import { factionLabels } from "./data";
import { playerTroopSupply } from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  gurneyHalleckLeaderName,
  ladyMargotFenringLeaderName,
  muadDibLeaderName,
  princessIrulanLeaderName,
} from "./leader-constants";
import {
  queuePendingActions,
} from "./pending-actions";
import {
  placeableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { FactionId, GameState, PendingAction, Player, ResourceId } from "./types";

const influenceVictoryPointThreshold = 2;
const standardTrackRewardThreshold = 4;
const commanderTeamResourceThreshold = 1;
const commanderTeamSecondResourceThreshold = 3;
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
        ? { ...candidate, persuasion: candidate.persuasion + 1, gurneyAlwaysSmilingScored: true }
        : candidate,
    ),
    log: [
      `${player.leader} resolves Always Smiling with ${player.conflict} strength in the Conflict and gains 1 persuasion.`,
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

  const requestedRecipient = state.players.find((player) => player.id === (recipientId ?? source.revealActivatedAllyId));
  const sandwormAlly =
    requestedRecipient?.role === "Ally" &&
    requestedRecipient.team === source.team &&
    requestedRecipient.deployedSandworms >= 1
      ? requestedRecipient
      : state.players.find((player) =>
          player.role === "Ally" &&
          player.team === source.team &&
          player.deployedSandworms >= 1
        );
  if (!sandwormAlly) {
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

function reachesInfluenceThreshold(previous: Player, next: Player, faction: FactionId, threshold: number) {
  return previous.influence[faction] < threshold && next.influence[faction] >= threshold;
}

function addLogAfterCurrentAction(state: GameState, logEntry: string): GameState {
  return {
    ...state,
    log: state.log.length > 0
      ? [state.log[0], logEntry, ...state.log.slice(1)]
      : [logEntry],
  };
}

function drawIntrigueCardsAfterCurrentActionLog(
  state: GameState,
  ownerId: string,
  count: number,
  source: string,
): GameState {
  const previousLog = state.log;
  const drawnState = drawIntrigueCards(state, ownerId, count, source);
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

function gainPlayerResource(player: Player, resource: ResourceId, amount: number): Player {
  return {
    ...player,
    resources: {
      ...player.resources,
      [resource]: player.resources[resource] + amount,
    },
  };
}

function resourceLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function resolveGreatHousesInfluenceReward(state: GameState, owner: Player): GameState {
  const recruitCount = Math.min(playerTroopSupply(owner), 2);
  if (recruitCount <= 0) return state;
  return addLogAfterCurrentAction({
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? { ...player, garrison: player.garrison + recruitCount } : player
    ),
  }, `${owner.leader} reaches 4 ${factionLabels.greatHouses} Influence and recruits ${recruitCount} troop${recruitCount === 1 ? "" : "s"}.`);
}

function resolveSpacingInfluenceReward(state: GameState, owner: Player): GameState {
  return addLogAfterCurrentAction({
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? gainPlayerResource(player, "solari", 3) : player
    ),
  }, `${owner.leader} reaches 4 ${factionLabels.spacing} Influence and gains 3 Solari.`);
}

function resolveBeneInfluenceReward(state: GameState, owner: Player): GameState {
  return drawIntrigueCardsAfterCurrentActionLog(
    state,
    owner.id,
    1,
    `4 ${factionLabels.bene} Influence`,
  );
}

function fringeWorldsSpyPending(state: GameState, owner: Player): PendingAction | undefined {
  const pending: PendingAction = {
    kind: "spy",
    ownerId: owner.id,
    remaining: 1,
    source: `4 ${factionLabels.fringeWorlds} Influence`,
    recallForSupply: true,
    mustPlaceSpy: true,
  };
  return placeableSpySpaces(state, pending).length > 0 ||
    recallableSpySupplySpaces(state, pending).length > 0
    ? pending
    : undefined;
}

function resolveFringeWorldsInfluenceReward(state: GameState, owner: Player): GameState {
  const spyPending = fringeWorldsSpyPending(state, owner);
  if (!spyPending) {
    return addLogAfterCurrentAction(
      state,
      `${owner.leader} reaches 4 ${factionLabels.fringeWorlds} Influence but has no legal spy placement.`,
    );
  }
  return addLogAfterCurrentAction({
    ...state,
    ...queuePendingActions(state, [spyPending]),
  }, `${owner.leader} reaches 4 ${factionLabels.fringeWorlds} Influence and must place 1 spy.`);
}

function resolveStandardTrackInfluenceReward(
  state: GameState,
  previous: Player,
  current: Player,
  faction: FactionId,
): GameState {
  if (!reachesInfluenceThreshold(previous, current, faction, standardTrackRewardThreshold)) return state;
  switch (faction) {
    case "greatHouses":
      return resolveGreatHousesInfluenceReward(state, current);
    case "spacing":
      return resolveSpacingInfluenceReward(state, current);
    case "bene":
      return resolveBeneInfluenceReward(state, current);
    case "fringeWorlds":
      return resolveFringeWorldsInfluenceReward(state, current);
    default:
      return state;
  }
}

function resolveStandardTrackInfluenceRewards(
  state: GameState,
  previousPlayers: Player[],
  factions: FactionId[],
): GameState {
  return previousPlayers.reduce((nextState, previous) => {
    const current = nextState.players.find((player) => player.id === previous.id);
    if (!current) return nextState;
    return factions.reduce(
      (rewardState, faction) => resolveStandardTrackInfluenceReward(rewardState, previous, current, faction),
      nextState,
    );
  }, state);
}

function resolveCommanderTeamResourceReward(
  state: GameState,
  commander: Player,
  faction: FactionId,
  threshold: number,
  resource: ResourceId,
): GameState {
  const teamMemberIds = new Set(state.players
    .filter((player) => player.team === commander.team)
    .map((player) => player.id));
  let rewardedState: GameState = {
    ...state,
    players: state.players.map((player) =>
      teamMemberIds.has(player.id) ? gainPlayerResource(player, resource, 1) : player
    ),
  };
  if (resource === "spice") {
    for (const playerId of teamMemberIds) {
      rewardedState = recordTurnSpiceGain(rewardedState, playerId, 1);
    }
  }
  return addLogAfterCurrentAction(
    rewardedState,
    `${commander.leader} reaches ${threshold} ${factionLabels[faction]} Influence; each player on their team gains 1 ${resourceLabel(resource)}.`,
  );
}

function resolveCommanderTeamSpyReward(
  state: GameState,
  commander: Player,
  faction: FactionId,
  threshold: number,
): GameState {
  return addLogAfterCurrentAction({
    ...state,
    players: state.players.map((player) =>
      player.team === commander.team ? { ...player, spies: player.spies + 1 } : player
    ),
  }, `${commander.leader} reaches ${threshold} ${factionLabels[faction]} Influence; each player on their team gains 1 spy.`);
}

function resolveCommanderInfluenceRewards(state: GameState, previousPlayers: Player[]): GameState {
  return previousPlayers.reduce((nextState, previous) => {
    const current = nextState.players.find((player) => player.id === previous.id);
    if (!current || current.role !== "Commander") return nextState;
    if (current.team === "muaddib") {
      let rewardState = nextState;
      if (reachesInfluenceThreshold(previous, current, "fremen", commanderTeamResourceThreshold)) {
        rewardState = resolveCommanderTeamResourceReward(
          rewardState,
          current,
          "fremen",
          commanderTeamResourceThreshold,
          "spice",
        );
      }
      if (reachesInfluenceThreshold(previous, current, "fremen", commanderTeamSecondResourceThreshold)) {
        rewardState = resolveCommanderTeamResourceReward(
          rewardState,
          current,
          "fremen",
          commanderTeamSecondResourceThreshold,
          "water",
        );
      }
      return rewardState;
    }
    if (current.team === "shaddam") {
      let rewardState = nextState;
      if (reachesInfluenceThreshold(previous, current, "emperor", commanderTeamResourceThreshold)) {
        rewardState = resolveCommanderTeamResourceReward(
          rewardState,
          current,
          "emperor",
          commanderTeamResourceThreshold,
          "solari",
        );
      }
      if (reachesInfluenceThreshold(previous, current, "emperor", commanderTeamSecondResourceThreshold)) {
        rewardState = resolveCommanderTeamSpyReward(
          rewardState,
          current,
          "emperor",
          commanderTeamSecondResourceThreshold,
        );
      }
      return rewardState;
    }
    return nextState;
  }, state);
}

export function resolveLeaderSpecificInfluenceThresholdRewardEffects(state: GameState, previousPlayers: Player[]): GameState {
  return previousPlayers.reduce((nextState, previous) => {
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
}

export function resolveStandardAndCommanderInfluenceThresholdRewardEffects(
  state: GameState,
  previousPlayers: Player[],
): GameState {
  const standardRewardState = resolveStandardTrackInfluenceRewards(
    state,
    previousPlayers,
    ["greatHouses", "spacing", "bene"],
  );
  const commanderRewardState = resolveCommanderInfluenceRewards(standardRewardState, previousPlayers);
  return resolveStandardTrackInfluenceRewards(commanderRewardState, previousPlayers, ["fringeWorlds"]);
}

export function resolveLeaderInfluenceThresholdRewardEffects(state: GameState, previousPlayers: Player[]): GameState {
  return resolveStandardAndCommanderInfluenceThresholdRewardEffects(
    resolveLeaderSpecificInfluenceThresholdRewardEffects(state, previousPlayers),
    previousPlayers,
  );
}

export function resolveLeaderInfluenceThresholdRewards(state: GameState, previousPlayers: Player[]): GameState {
  return resolveAllianceOwnersForInfluenceChanges(
    resolveLeaderInfluenceThresholdRewardEffects(state, previousPlayers),
    previousPlayers,
  );
}

export function resolveStandardAndCommanderInfluenceThresholdRewards(
  state: GameState,
  previousPlayers: Player[],
): GameState {
  return resolveAllianceOwnersForInfluenceChanges(
    resolveStandardAndCommanderInfluenceThresholdRewardEffects(state, previousPlayers),
    previousPlayers,
  );
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
