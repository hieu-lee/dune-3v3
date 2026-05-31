import {
  choamProfitsSourceId,
  secureSpiceTradeSourceId,
  shadowAllianceFactions,
  shadowAllianceSourceId,
  spiceMustFlowSourceId,
} from "./card-identifiers";
import { commanderPersonalFaction } from "./commander-rules";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { BattleIconId, FactionId, GameState, IntrigueCard, Player } from "./types";

function faceUpBattleIconConflicts(player: Player, battleIcon: BattleIconId) {
  return player.wonConflicts.filter(
    (conflict) => !conflict.scored && (conflict.battleIcon === battleIcon || conflict.battleIcon === "wild"),
  );
}

export function endgameBattleIconChoices(state: GameState) {
  if (state.phase !== "endgame") return [];
  return state.players.flatMap((player) => {
    if (player.role !== "Ally") return [];
    return player.intrigues.flatMap((intrigue) => {
      if (!intrigue.battleIcon) return [];
      const battleIcon = intrigue.battleIcon;
      return faceUpBattleIconConflicts(player, battleIcon).map((conflict) => ({
        playerId: player.id,
        intrigueId: intrigue.id,
        conflictId: conflict.id,
        battleIcon,
      }));
    });
  });
}

export function scoreEndgameBattleIconIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  conflictId?: string,
): GameState {
  if (state.phase !== "endgame") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.role !== "Ally") return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue?.battleIcon) return state;
  const matches = faceUpBattleIconConflicts(player, intrigue.battleIcon);
  const conflict = conflictId
    ? matches.find((candidate) => candidate.id === conflictId)
    : matches[0];
  if (!conflict) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    return {
      ...candidate,
      vp: candidate.vp + 1,
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
      wonConflicts: candidate.wonConflicts.map((wonConflict) =>
        wonConflict.id === conflict.id ? { ...wonConflict, scored: true } : wonConflict,
      ),
    };
  });
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} scores ${intrigue.name} by flipping ${conflict.name} for 1 VP.`,
      ...state.log,
    ],
  };
}

function countPlayerCardsBySourceId(player: Player, sourceId: number) {
  return [...player.deck, ...player.hand, ...player.discard, ...player.playArea]
    .filter((card) => card.sourceId === sourceId)
    .length;
}

function effectiveEndgameInfluence(player: Player, faction: FactionId, players: Player[]) {
  if (player.role !== "Commander") return player.influence[faction];
  if (commanderPersonalFaction(player) === faction) return player.influence[faction];
  return Math.max(
    0,
    ...players
      .filter((candidate) => candidate.team === player.team && candidate.role === "Ally")
      .map((ally) => ally.influence[faction]),
  );
}

function hasShadowAllianceMatch(state: GameState, player: Player) {
  return shadowAllianceFactions.some((faction) => {
    if (effectiveEndgameInfluence(player, faction, state.players) < 4) return false;
    const ownerId = state.alliances[faction];
    const owner = ownerId ? state.players.find((candidate) => candidate.id === ownerId) : undefined;
    return Boolean(owner && owner.team !== player.team);
  });
}

function scoreableConditionalEndgameReward(state: GameState, player: Player, intrigue: IntrigueCard) {
  if (intrigue.sourceId === secureSpiceTradeSourceId) {
    return countPlayerCardsBySourceId(player, spiceMustFlowSourceId) >= 2 ? { vp: 1, spice: 2 } : undefined;
  }
  if (intrigue.sourceId === choamProfitsSourceId) {
    return player.contracts.filter((contract) => contract.completed).length >= 4 ? { vp: 1 } : undefined;
  }
  if (intrigue.sourceId === shadowAllianceSourceId) {
    return hasShadowAllianceMatch(state, player) ? { vp: 1 } : undefined;
  }
  return undefined;
}

export function endgameConditionalIntrigueChoices(state: GameState) {
  if (state.phase !== "endgame") return [];
  return state.players.flatMap((player) =>
    player.intrigues.flatMap((intrigue) => {
      const reward = scoreableConditionalEndgameReward(state, player, intrigue);
      return reward ? [{ playerId: player.id, intrigueId: intrigue.id, ...reward }] : [];
    }),
  );
}

export function scoreEndgameConditionalIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "endgame") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue) return state;
  const reward = scoreableConditionalEndgameReward(state, player, intrigue);
  if (!reward) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          vp: candidate.vp + reward.vp,
          resources: {
            ...candidate.resources,
            spice: candidate.resources.spice + (reward.spice ?? 0),
          },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} scores ${intrigue.name} for ${reward.vp} VP${reward.spice ? ` and ${reward.spice} spice` : ""}.`,
      ...state.log,
    ],
  };
}

export function playPlotBattleIconIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue?.battleIcon) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          resources: { ...candidate.resources, spice: candidate.resources.spice + 1 },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return recordTurnSpiceGain({
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [`${player.leader} plays ${intrigue.name} as a Plot Intrigue for 1 spice.`, ...state.log],
  }, player.id, 1);
}
