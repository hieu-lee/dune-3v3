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
  started: boolean;
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
  started: boolean;
  createdAt: number;
  updatedAt: number;
  game: GameState;
  endgameReady: Record<string, boolean | undefined>;
  seats: Record<string, StoredSeatClaim | undefined>;
  ai?: StoredRoomAiState;
};

function cachedHidden<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const existing = cache.get(key);
  if (existing) return existing;
  const value = Object.freeze(create()) as T;
  cache.set(key, value);
  return value;
}

const hiddenCardCache = new Map<string, Card>();
const hiddenIntrigueCache = new Map<string, IntrigueCard>();
const hiddenContractCache = new Map<string, ContractCard>();
const hiddenConflictCache = new Map<string, ConflictCard>();
const hiddenObjectiveCache = new Map<string, ObjectiveCard>();
const hiddenCardArrayCache = new Map<string, Card[]>();
const hiddenIntrigueArrayCache = new Map<string, IntrigueCard[]>();
const hiddenContractArrayCache = new Map<string, ContractCard[]>();
const hiddenConflictArrayCache = new Map<number, ConflictCard[]>();
const hiddenObjectiveArrayCache = new Map<string, ObjectiveCard[]>();
const hiddenCardIcons = Object.freeze([]) as unknown as Card["icons"];
const hiddenConflictRewards = Object.freeze([]) as unknown as ConflictCard["rewards"];

function hiddenCard(playerId: string, index: number): Card {
  return cachedHidden(hiddenCardCache, `${playerId}:${index}`, () => ({
    id: `hidden-hand-${playerId}-${index}`,
    name: "Hidden card",
    icons: hiddenCardIcons,
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  }));
}

function hiddenIntrigue(playerId: string, index: number): IntrigueCard {
  return cachedHidden(hiddenIntrigueCache, `${playerId}:${index}`, () => ({
    id: `hidden-intrigue-${playerId}-${index}`,
    name: "Hidden Intrigue",
    summary: "",
  }));
}

function hiddenContract(index: number, scope = "contract"): ContractCard {
  return cachedHidden(hiddenContractCache, `${scope}:${index}`, () => ({
    id: scope === "contract" ? `hidden-contract-${index}` : `hidden-contract-${scope}-${index}`,
    name: "Hidden CHOAM contract",
  }));
}

function hiddenConflict(index: number): ConflictCard {
  return cachedHidden(hiddenConflictCache, String(index), () => ({
    id: `hidden-conflict-${index}`,
    name: "Hidden Conflict",
    level: 1,
    battleIcon: "wild",
    rewards: hiddenConflictRewards,
    stakes: "",
  }));
}

function hiddenObjective(playerId: string, index: number, objective: ObjectiveCard): ObjectiveCard {
  const key = `${playerId}:${index}:${objective.scored ? "scored" : "hidden"}:${objective.playerCount}`;
  return cachedHidden(hiddenObjectiveCache, key, () => ({
    id: `hidden-objective-${playerId}-${index}`,
    name: objective.scored ? "Scored Objective" : "Hidden Objective",
    battleIcon: "crysknife",
    playerCount: objective.playerCount,
    scored: objective.scored,
  }));
}

function cachedHiddenArray<T>(cache: Map<string, T[]>, key: string, create: () => T[]): T[] {
  const existing = cache.get(key);
  if (existing) return existing;
  const value = Object.freeze(create()) as T[];
  cache.set(key, value);
  return value;
}

function hiddenCards(scope: string, count: number): Card[] {
  return cachedHiddenArray(hiddenCardArrayCache, `${scope}:${count}`, () =>
    Array.from({ length: count }, (_card, index) => hiddenCard(scope, index)),
  );
}

function hiddenIntrigues(scope: string, count: number): IntrigueCard[] {
  return cachedHiddenArray(hiddenIntrigueArrayCache, `${scope}:${count}`, () =>
    Array.from({ length: count }, (_card, index) => hiddenIntrigue(scope, index)),
  );
}

function hiddenContracts(scope: string, count: number): ContractCard[] {
  return cachedHiddenArray(hiddenContractArrayCache, `${scope}:${count}`, () =>
    Array.from({ length: count }, (_card, index) => hiddenContract(index, scope)),
  );
}

function hiddenConflicts(count: number): ConflictCard[] {
  const existing = hiddenConflictArrayCache.get(count);
  if (existing) return existing;
  const value = Object.freeze(Array.from({ length: count }, (_card, index) => hiddenConflict(index))) as ConflictCard[];
  hiddenConflictArrayCache.set(count, value);
  return value;
}

function hiddenObjectives(playerId: string, objectives: ObjectiveCard[]): ObjectiveCard[] {
  const key = `${playerId}:${objectives.map((objective, index) =>
    `${index}:${objective.scored ? "scored" : "hidden"}:${objective.playerCount}`,
  ).join("|")}`;
  return cachedHiddenArray(hiddenObjectiveArrayCache, key, () =>
    objectives.map((objective, index) => hiddenObjective(playerId, index, objective)),
  );
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
      deck: hiddenCards(`${player.id}-deck`, player.deck.length),
    };
  }
  return {
    ...player,
    deck: hiddenCards(`${player.id}-deck`, player.deck.length),
    hand: hiddenCards(player.id, player.hand.length),
    manipulatedCards: hiddenCards(`${player.id}-manipulated`, player.manipulatedCards.length),
    intrigues: hiddenIntrigues(player.id, player.intrigues.length),
    objectives: hiddenObjectives(player.id, player.objectives),
    reservedContracts: hiddenContracts(`${player.id}-reserved`, player.reservedContracts.length),
  };
}

function endgameChoicesForViewer(game: GameState, viewerPlayerId?: string): RoomEndgameChoices {
  if (!viewerPlayerId) return { iconChoices: [], conditionalChoices: [] };
  return {
    iconChoices: endgameBattleIconChoices(game).filter((choice) => choice.playerId === viewerPlayerId),
    conditionalChoices: endgameConditionalIntrigueChoices(game).filter((choice) => choice.playerId === viewerPlayerId),
  };
}

function roomStartedForSnapshot(room: StoredRoom) {
  if (room.started !== false) return true;
  return Boolean(room.game.pendingAction || room.game.pendingQueue.length > 0 || room.game.phase !== "playing");
}

export function sanitizeGameForSeat(game: GameState, viewerPlayerId?: string): GameState {
  return {
    ...game,
    marketDeck: hiddenCards("market-deck", game.marketDeck.length),
    contractDeck: hiddenContracts("contract", game.contractDeck.length),
    intrigueDeck: hiddenIntrigues("deck", game.intrigueDeck.length),
    conflictDeck: hiddenConflicts(game.conflictDeck.length),
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
    started: roomStartedForSnapshot(room),
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
