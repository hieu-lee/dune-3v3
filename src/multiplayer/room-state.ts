import type {
  BattleIconId,
  Card,
  ConflictCard,
  ContractCard,
  GameState,
  IntrigueCard,
  ObjectiveCard,
  PendingAction,
  Player,
  Role,
  TeamId,
} from "../game/types";
import {
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
} from "../game/state";

export type RoomEndgameChoices = {
  iconChoices: Array<{
    playerId: string;
    intrigueId: string;
    conflictId: string;
    battleIcon: BattleIconId;
  }>;
  conditionalChoices: Array<{
    playerId: string;
    intrigueId: string;
    vp: number;
    spice?: number;
  }>;
};

export type PublicSeatClaim = {
  playerId: string;
  playerName: string;
  leader: string;
  team: TeamId;
  role: Role;
  claimedBy?: string;
  connected: boolean;
  ai?: boolean;
};

export type RoomAiStatus = "idle" | "running" | "error";

export type PublicRoomAiState = {
  enabled: boolean;
  team: TeamId;
  status: RoomAiStatus;
  actionCount: number;
  error?: string;
  lastActiveAt?: number;
};

export type RoomSnapshot = {
  roomId: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  endgameReady: Record<string, boolean | undefined>;
  endgameChoices: RoomEndgameChoices;
  viewerPlayerId?: string;
  seats: PublicSeatClaim[];
  ai?: PublicRoomAiState;
  game: GameState;
};

export type StoredSeatClaim = {
  playerId: string;
  name: string;
  token: string;
  connected: boolean;
  ai?: boolean;
};

export type StoredRoomAiState = PublicRoomAiState & {
  previousSummaries?: Partial<Record<TeamId, string>>;
  lastDiscussedCompletedRound?: number;
};

export type StoredRoom = {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  game: GameState;
  endgameReady: Record<string, boolean | undefined>;
  seats: Record<string, StoredSeatClaim | undefined>;
  ai?: StoredRoomAiState;
};

function hiddenCard(playerId: string, index: number): Card {
  return {
    id: `hidden-hand-${playerId}-${index}`,
    name: "Hidden card",
    icons: [],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
}

function hiddenIntrigue(playerId: string, index: number): IntrigueCard {
  return {
    id: `hidden-intrigue-${playerId}-${index}`,
    name: "Hidden Intrigue",
    summary: "",
  };
}

function hiddenContract(index: number): ContractCard {
  return {
    id: `hidden-contract-${index}`,
    name: "Hidden CHOAM contract",
  };
}

function hiddenConflict(index: number): ConflictCard {
  return {
    id: `hidden-conflict-${index}`,
    name: "Hidden Conflict",
    level: 1,
    battleIcon: "wild",
    rewards: [],
    stakes: "",
  };
}

function hiddenObjective(playerId: string, index: number, objective: ObjectiveCard): ObjectiveCard {
  return {
    id: `hidden-objective-${playerId}-${index}`,
    name: objective.scored ? "Scored Objective" : "Hidden Objective",
    battleIcon: "crysknife",
    playerCount: objective.playerCount,
    scored: objective.scored,
  };
}

function sanitizePendingAction(action: PendingAction | undefined, viewerPlayerId?: string): PendingAction | undefined {
  if (!action) return undefined;
  if (action.kind === "top-deck-selection" && action.ownerId !== viewerPlayerId && action.inspectedCards) {
    const { inspectedCards: _inspectedCards, ...safeAction } = action;
    return safeAction;
  }
  return action;
}

function sanitizePlayer(player: Player, viewerPlayerId?: string): Player {
  if (player.id === viewerPlayerId) {
    return {
      ...player,
      deck: player.deck.map((_card, index) => hiddenCard(`${player.id}-deck`, index)),
    };
  }
  return {
    ...player,
    deck: player.deck.map((_card, index) => hiddenCard(`${player.id}-deck`, index)),
    hand: player.hand.map((_card, index) => hiddenCard(player.id, index)),
    intrigues: player.intrigues.map((_card, index) => hiddenIntrigue(player.id, index)),
    objectives: player.objectives.map((objective, index) => hiddenObjective(player.id, index, objective)),
  };
}

function endgameChoicesForViewer(game: GameState, viewerPlayerId?: string): RoomEndgameChoices {
  if (!viewerPlayerId) return { iconChoices: [], conditionalChoices: [] };
  return {
    iconChoices: endgameBattleIconChoices(game).filter((choice) => choice.playerId === viewerPlayerId),
    conditionalChoices: endgameConditionalIntrigueChoices(game).filter((choice) => choice.playerId === viewerPlayerId),
  };
}

export function sanitizeGameForSeat(game: GameState, viewerPlayerId?: string): GameState {
  return {
    ...game,
    marketDeck: game.marketDeck.map((_card, index) => hiddenCard("market-deck", index)),
    contractDeck: game.contractDeck.map((_card, index) => hiddenContract(index)),
    intrigueDeck: game.intrigueDeck.map((_card, index) => hiddenIntrigue("deck", index)),
    conflictDeck: game.conflictDeck.map((_card, index) => hiddenConflict(index)),
    pendingAction: sanitizePendingAction(game.pendingAction, viewerPlayerId),
    pendingQueue: game.pendingQueue.map((action) => sanitizePendingAction(action, viewerPlayerId) ?? action),
    players: game.players.map((player) => sanitizePlayer(player, viewerPlayerId)),
  };
}

export function roomSnapshotFor(room: StoredRoom, viewerToken?: string): RoomSnapshot {
  const viewerSeat = Object.values(room.seats).find((seat) => seat?.token === viewerToken);
  const viewerPlayerId = viewerSeat?.playerId;
  return {
    roomId: room.id,
    version: room.version,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    endgameReady: { ...room.endgameReady },
    endgameChoices: endgameChoicesForViewer(room.game, viewerPlayerId),
    viewerPlayerId,
    ai: room.ai ? {
      enabled: room.ai.enabled,
      team: room.ai.team,
      status: room.ai.status,
      actionCount: room.ai.actionCount,
      error: room.ai.error,
      lastActiveAt: room.ai.lastActiveAt,
    } : undefined,
    seats: room.game.players.map((player) => {
      const claim = room.seats[player.id];
      return {
        playerId: player.id,
        playerName: player.name,
        leader: player.leader,
        team: player.team,
        role: player.role,
        claimedBy: claim?.name,
        connected: claim?.connected ?? false,
        ai: claim?.ai ?? false,
      };
    }),
    game: sanitizeGameForSeat(room.game, viewerPlayerId),
  };
}
