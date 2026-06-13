import { useEffect, useMemo, useRef, useState } from "react";
import { Link, MonitorPlay, PanelLeftOpen, PlugZap, ScrollText, Users } from "lucide-react";
import { ActiveHandPanel } from "./components/ActiveHandPanel";
import { BoardPanel, type BoardSpySlotChoices } from "./components/BoardPanel";
import { CardPlayReveal, type CardPlayAnnouncement } from "./components/CardPlayReveal";
import { CommandBar } from "./components/CommandBar";
import { CombatIntriguePanel } from "./components/CombatIntriguePanel";
import { EndgamePanel } from "./components/EndgamePanel";
import { IntrigueHandPanel } from "./components/IntrigueHandPanel";
import { LeaderReferenceModal } from "./components/LeaderReferenceModal";
import { MarketPanel } from "./components/MarketPanel";
import { PendingActionPanel } from "./components/PendingActionPanel";
import { PendingResolutionOverlay } from "./components/PendingResolutionOverlay";
import { PileInspector, type OpenPile } from "./components/PileInspector";
import { PlayerColumn } from "./components/PlayerColumn";
import { PlayerTableStrip } from "./components/PlayerTableStrip";
import type { VaultPileId } from "./components/PlayerVault";
import { RecentLogPanel } from "./components/RecentLogPanel";
import { RoomPanel } from "./components/RoomPanel";
import { RoomPendingPanel } from "./components/RoomPendingPanel";
import { RoomPrivatePanel } from "./components/RoomPrivatePanel";
import { TableSidebar } from "./components/TableSidebar";
import {
  tableStateLockedByPendingActions,
  type ChangeAllegiancesSelection,
} from "./app-helpers";
import { createPendingActionHandlers } from "./app-pending-action-handlers";
import { createPlotActionHandlers } from "./app-plot-actions";
import {
  activatedAllyIdFor,
  legalActivatedAllyIdFor,
  placeAgentAction,
  revealTurnAction,
  revealTurnPlan,
} from "./app-turn-actions";
import { boardSpaces } from "./game/data";
import {
  advanceSeat,
  acquireMarketCard,
  agentSpaceAvailable,
  canPay,
  commanderCanActivateAlly,
  conflictVpConversionSpyChoices,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  effectiveCost,
  finishEndgame,
  finishRevealTurn,
  iconCanReach,
  initialGame,
  manipulateAcquisitionCost,
  maybeStartCombatPhase,
  passCombatIntrigue,
  placeableSpySpaces,
  playCombatIntrigue,
  recallableSpySpaces,
  recallableSpySupplySpaces,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  setMakerHooks,
  setShieldWall,
  spyEntrySpaceIdsForOccupiedSpace,
} from "./game/state";
import type {
  Card,
  GameState,
} from "./game/types";
import type { CombatIntrigueChoice } from "./game/state";
import { roomPendingActionCanResolve } from "./multiplayer/room-actions";
import { createRoomPendingActionHandlers } from "./multiplayer/room-pending-action-handlers";
import { createRoomPlotActionHandlers } from "./multiplayer/room-plot-action-handlers";
import type { RoomSnapshot } from "./multiplayer/room-state";
import { useRoomSession } from "./multiplayer/useRoomSession";

export {
  boardSpaceIntrigueGainFor,
  boardSpaceRevealPersuasionFor,
  pendingLocksTableState,
  revealPersuasionFor,
  tableStateLockedByPendingActions,
} from "./app-helpers";

declare global {
  interface Window {
    __DUNE_DEBUG__?: {
      capture: (label?: string) => Promise<unknown>;
      getCommanderTargets: () => Record<string, string>;
      getGame: () => GameState;
      getRoomSnapshot: () => RoomSnapshot | null;
      getRoomSyncMode: () => "events" | "poll";
      leaveRoom: () => void;
      setGame: (game: GameState) => void;
      setCommanderTarget: (commanderId: string, allyId: string) => void;
    };
    __DUNE_DEBUG_CAPTURE__?: (request: { label?: string; game: GameState }) => Promise<unknown>;
  }
}

const appEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_DUNE_DEBUG?: string } }).env;
const browserDebugEnabled = Boolean(appEnv?.DEV || appEnv?.VITE_DUNE_DEBUG === "1");

const MAX_REVEAL_QUEUE = 8;

export default function App() {
  const roomSession = useRoomSession();
  const [game, setGame] = useState<GameState>(() => initialGame({ includeSetupPending: false }));
  const [localStarted, setLocalStarted] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedSpyEntrySpaceId, setSelectedSpyEntrySpaceId] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [tableInfoOpen, setTableInfoOpen] = useState(false);
  const [rightDrawer, setRightDrawer] = useState<"leaders" | "log" | null>(null);
  const [inspectedPile, setInspectedPile] = useState<OpenPile | null>(null);
  const [inspectedPileCardIndex, setInspectedPileCardIndex] = useState<number | null>(null);
  const [playQueue, setPlayQueue] = useState<CardPlayAnnouncement[]>([]);
  const playAreaSizesRef = useRef<Map<string, number>>(new Map());
  const playAreaContextRef = useRef<string | null>(null);
  const playAnnouncementSeqRef = useRef(0);
  const [commanderTargets, setCommanderTargets] = useState<Record<string, string>>({});
  const [changeAllegiancesSelections, setChangeAllegiancesSelections] = useState<Record<string, ChangeAllegiancesSelection>>({});
  const leaderOpenerRef = useRef<HTMLButtonElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const localGameRef = useRef<GameState | null>(null);
  const localStartedRef = useRef(false);
  const wasInRoomRef = useRef(false);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const contextKey = roomSession.inRoom ? `room:${roomSession.roomId}` : "local";
    const sizes = playAreaSizesRef.current;
    // On the first run or whenever the whole game is swapped (room enter/leave),
    // re-baseline play-area sizes without announcing pre-existing plays.
    const contextChanged = playAreaContextRef.current !== contextKey;
    if (contextChanged) {
      sizes.clear();
      playAreaContextRef.current = contextKey;
    }
    const announcements: CardPlayAnnouncement[] = [];
    for (const player of game.players) {
      // Only announce for players already baselined; a player id first seen
      // mid-context (e.g. joining a room) is baselined silently, not announced.
      const known = sizes.has(player.id);
      const previousSize = sizes.get(player.id) ?? 0;
      const currentSize = player.playArea.length;
      if (!contextChanged && known && currentSize > previousSize) {
        // Announce every newly added card in order so a full Reveal (whole hand
        // appended at once) shows each card, not just the last one.
        for (let index = previousSize; index < currentSize; index += 1) {
          const card = player.playArea[index];
          if (card) {
            announcements.push({
              id: ++playAnnouncementSeqRef.current,
              card,
              playerName: player.leader,
              playerColor: player.color,
              action: player.revealed ? "revealed" : "played",
            });
          }
        }
      }
      sizes.set(player.id, currentSize);
    }
    if (announcements.length > 0) {
      // Bound the queue so a bulk reveal/reshuffle can't back the overlay up
      // indefinitely. Keep the currently-displayed head, then the most recent
      // items, so trimming never evicts the card that is mid-animation.
      setPlayQueue((queue) => {
        const next = [...queue, ...announcements];
        if (next.length <= MAX_REVEAL_QUEUE) return next;
        return [next[0], ...next.slice(-(MAX_REVEAL_QUEUE - 1))];
      });
    }
  }, [game, roomSession.inRoom, roomSession.roomId]);

  useEffect(() => {
    localStartedRef.current = localStarted;
  }, [localStarted]);

  useEffect(() => {
    if (!browserDebugEnabled) {
      delete window.__DUNE_DEBUG__;
      return;
    }
    async function capture(label?: string) {
      const captureHandler = window.__DUNE_DEBUG_CAPTURE__;
      if (!captureHandler) {
        console.warn("Dune debug capture requested, but no browser capture handler is attached.");
        return undefined;
      }
      return captureHandler({ label, game });
    }
    function handleDebugCaptureKeydown(event: KeyboardEvent) {
      if (!(event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")) return;
      event.preventDefault();
      void window.__DUNE_DEBUG__?.capture("hotkey");
    }
    window.__DUNE_DEBUG__ = {
      capture,
      getCommanderTargets: () => commanderTargets,
      getGame: () => game,
      getRoomSnapshot: () => roomSession.snapshot,
      getRoomSyncMode: () => roomSession.syncMode,
      leaveRoom: roomSession.leaveRoom,
      setCommanderTarget: (commanderId, allyId) => setCommanderTargets((current) => ({ ...current, [commanderId]: allyId })),
      setGame: (nextGame) => setGame(nextGame),
    };
    window.addEventListener("keydown", handleDebugCaptureKeydown);
    return () => {
      window.removeEventListener("keydown", handleDebugCaptureKeydown);
      delete window.__DUNE_DEBUG__;
    };
  }, [commanderTargets, game, roomSession.leaveRoom, roomSession.snapshot, roomSession.syncMode]);

  useEffect(() => {
    if (!roomSession.snapshot) {
      if (wasInRoomRef.current && !roomSession.inRoom) {
        wasInRoomRef.current = false;
        setGame(localGameRef.current ?? initialGame({ includeSetupPending: false }));
        setLocalStarted(Boolean(localGameRef.current));
        setSelectedCardId(null);
        setSelectedSpaceId(null);
        setSelectedSpyEntrySpaceId(null);
      }
      return;
    }
    if (!wasInRoomRef.current) {
      localGameRef.current = localStartedRef.current ? gameRef.current ?? game : null;
      wasInRoomRef.current = true;
    }
    setGame(roomSession.snapshot.game);
    setSelectedCardId(null);
    setSelectedSpaceId(null);
    setSelectedSpyEntrySpaceId(null);
  }, [roomSession.inRoom, roomSession.snapshot]);

  const activePlayer = game.players[game.activeSeat];
  const roomStarted = !roomSession.inRoom || roomSession.snapshot?.started === true;
  const claimedPlayer = roomSession.claimedPlayerId
    ? game.players.find((player) => player.id === roomSession.claimedPlayerId)
    : undefined;
  const activeAllies = game.players.filter((player) => player.team === activePlayer.team && player.role === "Ally");
  const activatedAllyId = activePlayer.role === "Commander"
    ? activatedAllyIdFor(activePlayer, game.players, commanderTargets) ??
      legalActivatedAllyIdFor(activePlayer, game.players, commanderTargets)
    : activePlayer.id;
  const effectiveCommanderTargets = activePlayer.role === "Commander" && activatedAllyId
    ? { ...commanderTargets, [activePlayer.id]: activatedAllyId }
    : commanderTargets;
  const activatedAlly =
    activePlayer.role === "Commander"
      ? activeAllies.find((player) => player.id === activatedAllyId) ?? activeAllies[0]
      : activePlayer;
  const canUseActivatedAlly = activePlayer.role !== "Commander" || commanderCanActivateAlly(activePlayer, activatedAlly);
  const selectedCard = activePlayer.hand.find((card) => card.id === selectedCardId) ?? null;
  const selectedSpace = boardSpaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedLeader = game.players.find((player) => player.id === selectedLeaderId) ?? null;
  const canControlActivePlayer = !roomSession.inRoom || (roomStarted && roomSession.claimedPlayerId === activePlayer.id);

  function closeLeaderReference() {
    setSelectedLeaderId(null);
    window.setTimeout(() => leaderOpenerRef.current?.focus(), 0);
  }

  function openLeaderReference(playerId: string, opener: HTMLButtonElement) {
    leaderOpenerRef.current = opener;
    setSelectedLeaderId(playerId);
  }

  function openPile(playerId: string, pile: VaultPileId) {
    setInspectedPile((current) =>
      current && current.playerId === playerId && current.pile === pile ? null : { playerId, pile },
    );
    setInspectedPileCardIndex(null);
  }

  function closePile() {
    setInspectedPile(null);
    setInspectedPileCardIndex(null);
  }

  const legalSpaces = useMemo(() => {
    if (!canControlActivePlayer || game.phase !== "playing" || game.agentTurnComplete || !selectedCard || activePlayer.agentsReady <= 0 || game.pendingAction) return new Set<string>();
    return new Set(
      boardSpaces
        .filter((space) => agentSpaceAvailable(game, space, activePlayer))
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts))
        .filter((space) => canPay(activePlayer, effectiveCost(space, game.players)))
        .map((space) => space.id),
    );
  }, [activePlayer, canControlActivePlayer, game.agentTurnComplete, game.pendingAction, game.phase, game.players, game.sharedSpyPosts, game.spaces, game.spyPosts, game.swordmasterClaimed, selectedCard]);

  const spyEntrySpaceIds = useMemo(() => {
    if (!selectedSpace || !game.spaces[selectedSpace.id]) return [];
    return spyEntrySpaceIdsForOccupiedSpace(game, selectedSpace.id, activePlayer.id);
  }, [activePlayer.id, game, selectedSpace]);
  const activeSpyEntrySpaceId = spyEntrySpaceIds.length === 1
    ? spyEntrySpaceIds[0]
    : selectedSpyEntrySpaceId && spyEntrySpaceIds.includes(selectedSpyEntrySpaceId)
      ? selectedSpyEntrySpaceId
      : undefined;
  const spyEntryChoiceReady = spyEntrySpaceIds.length === 0 || Boolean(activeSpyEntrySpaceId);

  const canPlayAgent = Boolean(canControlActivePlayer && canUseActivatedAlly && game.phase === "playing" && !game.agentTurnComplete && selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && spyEntryChoiceReady && !game.pendingAction);

  function placeAgentWith(card: Card, space: (typeof boardSpaces)[number], spyEntrySpaceId?: string) {
    if (roomSession.inRoom) {
      void roomSession.sendAction({
        kind: "place-agent",
        cardId: card.id,
        spaceId: space.id,
        ...(spyEntrySpaceId ? { spyEntrySpaceId } : {}),
        commanderTargets: effectiveCommanderTargets,
      }).then((applied) => {
        if (!applied) return;
        setSelectedCardId(null);
        setSelectedSpaceId(null);
        setSelectedSpyEntrySpaceId(null);
      });
      return;
    }
    setGame((current) => maybeStartCombatPhase(placeAgentAction(current, {
      commanderTargets: effectiveCommanderTargets,
      selectedCard: card,
      selectedSpace: space,
      spyEntrySpaceId,
    })));
    setSelectedCardId(null);
    setSelectedSpaceId(null);
    setSelectedSpyEntrySpaceId(null);
  }

  function playAgent() {
    if (game.phase !== "playing" || !canPlayAgent || !selectedCard || !selectedSpace) return;
    placeAgentWith(selectedCard, selectedSpace, activeSpyEntrySpaceId);
  }

  function endAgentTurn() {
    if (!canControlActivePlayer || game.phase !== "playing" || game.pendingAction || game.pendingQueue.length > 0 || !game.agentTurnComplete) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "end-agent" }).then((applied) => {
        if (!applied) return;
        setSelectedCardId(null);
        setSelectedSpaceId(null);
      });
      return;
    }
    setGame((current) => {
      if (current.phase !== "playing" || current.pendingAction || current.pendingQueue.length > 0 || !current.agentTurnComplete) {
        return current;
      }
      const advancedState = {
        ...current,
        agentTurnComplete: false,
        turnHarvestContractIds: {},
        turnMakerSpaceVisits: {},
        turnAcquiredCardIds: {},
        turnSpiceGains: {},
        turnReverendMotherJessicaRepeats: {},
        turnSpyRecalls: {},
        turnUnitDeployments: {},
        activeSeat: advanceSeat(current),
      };
      return maybeStartCombatPhase(advancedState);
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function revealTurn() {
    if (!canControlActivePlayer || game.phase !== "playing") return;
    if (game.pendingAction) return;
    if (game.agentTurnComplete) return;
    if (activePlayer.revealed) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "reveal-turn", commanderTargets: effectiveCommanderTargets });
      return;
    }
    const targetId =
      activePlayer.role === "Commander"
        ? legalActivatedAllyIdFor(activePlayer, game.players, effectiveCommanderTargets)
        : activePlayer.id;
    const revealTarget = game.players.find((player) => player.id === targetId);
    const revealPlan = revealTurnPlan(activePlayer, game, revealTarget);
    setGame((current) =>
      revealTurnAction(current, { commanderTargets: effectiveCommanderTargets, playerId: activePlayer.id, revealPlan })
    );
  }

  function buyCard(card: Card) {
    if (!canControlActivePlayer || game.phase !== "playing") return;
    if (game.pendingAction || game.pendingQueue.length > 0) return;
    const manipulatedCard = activePlayer.manipulatedCards.some((candidate) => candidate.id === card.id);
    const cardCost = manipulatedCard ? manipulateAcquisitionCost(card) : card.cost ?? 0;
    if (!activePlayer.revealed || activePlayer.persuasion < cardCost) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "buy-card", cardId: card.id, commanderTargets: effectiveCommanderTargets });
      return;
    }
    setGame((current) => {
      const buyer = current.players[current.activeSeat];
      const callToArmsRecruitOwnerId =
        buyer.callToArmsActive && buyer.role === "Commander"
          ? legalActivatedAllyIdFor(buyer, current.players, effectiveCommanderTargets)
          : undefined;
      return acquireMarketCard(current, buyer.id, card.id, callToArmsRecruitOwnerId);
    });
  }

  function endReveal() {
    if (!canControlActivePlayer || game.phase !== "playing") return;
    if (game.pendingAction) return;
    if (!activePlayer.revealed) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "end-reveal" }).then((applied) => {
        if (!applied) return;
        setSelectedCardId(null);
        setSelectedSpaceId(null);
      });
      return;
    }
    setGame((current) => {
      return finishRevealTurn(current, current.players[current.activeSeat].id);
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function updateMakerHooks(playerId: string, hasHooks: boolean) {
    if (roomSession.inRoom) return;
    setGame((current) => {
      if (tableStateLockedByPendingActions(current)) return current;
      return setMakerHooks(current, playerId, hasHooks);
    });
  }

  function updateShieldWall(standing: boolean) {
    if (roomSession.inRoom) return;
    setGame((current) => {
      if (tableStateLockedByPendingActions(current)) return current;
      return setShieldWall(current, standing);
    });
  }

  function playCombatCard(intrigueId: string, targetId?: string, combatChoice?: CombatIntrigueChoice) {
    if (game.phase !== "combat") return;
    if (!canControlActivePlayer) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "play-combat-intrigue", intrigueId, targetId, combatChoice });
      return;
    }
    setGame((current) =>
      playCombatIntrigue(current, current.players[current.activeSeat].id, intrigueId, targetId, combatChoice),
    );
  }

  function passCombatCard() {
    if (game.phase !== "combat") return;
    if (!canControlActivePlayer) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "pass-combat" });
      return;
    }
    setGame((current) => passCombatIntrigue(current, activePlayer.id));
  }

  function scoreEndgameIntrigue(playerId: string, intrigueId: string, conflictId: string) {
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "score-endgame-icon", playerId, intrigueId, conflictId });
      return;
    }
    setGame((current) => scoreEndgameBattleIconIntrigue(current, playerId, intrigueId, conflictId));
  }

  function scoreConditionalEndgameIntrigue(playerId: string, intrigueId: string) {
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "score-endgame-conditional", playerId, intrigueId });
      return;
    }
    setGame((current) => scoreEndgameConditionalIntrigue(current, playerId, intrigueId));
  }

  function finalizeEndgame() {
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "finalize-endgame" });
      return;
    }
    setGame((current) => finishEndgame(current));
  }

  function startLocalGame() {
    setGame(initialGame());
    setLocalStarted(true);
    setSelectedCardId(null);
    setSelectedSpaceId(null);
    setSelectedLeaderId(null);
    setSelectedSpyEntrySpaceId(null);
    setCommanderTargets({});
  }

  function resetGame() {
    if (roomSession.inRoom) return;
    startLocalGame();
  }

  const showLaunchScreen = !roomSession.inRoom && !localStarted;

  const pendingAction = game.pendingAction;
  const tableStateLockedByPending = tableStateLockedByPendingActions(game) || roomSession.inRoom;
  const combatActor = game.phase === "combat" ? game.players[game.activeSeat] : undefined;
  const endgameChoices = roomSession.inRoom
    ? roomSession.snapshot?.endgameChoices.iconChoices ?? []
    : endgameBattleIconChoices(game);
  const conditionalEndgameChoices = roomSession.inRoom
    ? roomSession.snapshot?.endgameChoices.conditionalChoices ?? []
    : endgameConditionalIntrigueChoices(game);
  const playingPhase = game.phase === "playing";
  const roomActionLocked = roomSession.inRoom && (!roomStarted || !canControlActivePlayer);
  const pendingLocked = Boolean(game.pendingAction) || game.pendingQueue.length > 0 || roomActionLocked;
  const handPendingStatusLabel =
    game.pendingAction || game.pendingQueue.length > 0
      ? "Resolve pending choice"
      : roomSession.inRoom && !roomStarted
        ? "Waiting for game start"
        : roomActionLocked
          ? "Waiting for active player"
          : undefined;
  const placementDecisionActive = Boolean(
    selectedCard &&
      canControlActivePlayer &&
      playingPhase &&
      !game.agentTurnComplete &&
      activePlayer.agentsReady > 0 &&
      !game.pendingAction &&
      game.pendingQueue.length === 0 &&
      !roomActionLocked,
  );
  const plotIntrigueLocked = !playingPhase || pendingLocked;
  const debugCaptureAvailable = browserDebugEnabled && typeof window.__DUNE_DEBUG_CAPTURE__ === "function";
  const canResolveRoomPending = roomSession.inRoom && roomPendingActionCanResolve(game, roomSession.claimedPlayerId);
  const showRoomWaitingPending = Boolean(
    roomStarted &&
      roomSession.inRoom &&
      roomSession.claimedPlayerId &&
      pendingAction &&
      !canResolveRoomPending,
  );
  const showResolvablePending = Boolean(pendingAction && (!roomSession.inRoom || (roomStarted && canResolveRoomPending)));
  const pendingOverlayActive = showRoomWaitingPending || showResolvablePending;
  const pendingOverlayResetKey = pendingAction
    ? `${roomSession.inRoom ? "room" : "local"}:${canResolveRoomPending ? "resolve" : "wait"}:${JSON.stringify(pendingAction)}:${game.pendingQueue.length}`
    : "none";
  const pendingActionHandlers = createPendingActionHandlers({
    commanderTargets: effectiveCommanderTargets,
    game,
    setGame,
  });
  const roomPendingActionHandlers = createRoomPendingActionHandlers(roomSession.sendAction, pendingAction);
  const boardSpySlotChoices = useMemo<BoardSpySlotChoices | undefined>(() => {
    const pending = game.pendingAction;
    if (!pending && placementDecisionActive && spyEntrySpaceIds.length > 0) {
      return {
        mode: "agent-entry",
        legalSpaceIds: new Set(spyEntrySpaceIds),
        selectedSpaceId: activeSpyEntrySpaceId,
      };
    }
    if (!pending || (roomSession.inRoom && !canResolveRoomPending)) return undefined;
    if (pending.kind === "spy") {
      const placementSpaces = placeableSpySpaces(game, pending);
      if (placementSpaces.length > 0) {
        return {
          mode: "place",
          legalSpaceIds: new Set(placementSpaces.map((space) => space.id)),
        };
      }
      const supplyRecallSpaces = recallableSpySupplySpaces(game, pending);
      if (supplyRecallSpaces.length > 0) {
        return {
          mode: "supply-recall",
          legalSpaceIds: new Set(supplyRecallSpaces.map((space) => space.id)),
        };
      }
      return undefined;
    }
    if (pending.kind === "recall-spy") {
      const recallSpaces = recallableSpySpaces(game, pending);
      if (recallSpaces.length === 0) return undefined;
      return {
        mode: "recall",
        legalSpaceIds: new Set(recallSpaces.map((space) => space.id)),
      };
    }
    if (pending.kind === "conflict-vp-conversion") {
      const recallSpaces = conflictVpConversionSpyChoices(game, pending);
      if (recallSpaces.length === 0) return undefined;
      return {
        mode: "conflict-recall",
        legalSpaceIds: new Set(recallSpaces.map((space) => space.id)),
      };
    }
    return undefined;
  }, [activeSpyEntrySpaceId, canResolveRoomPending, game, placementDecisionActive, roomSession.inRoom, spyEntrySpaceIds]);
  const plotActionHandlers = createPlotActionHandlers({
    commanderTargets: effectiveCommanderTargets,
    setChangeAllegiancesSelections,
    setGame,
  });
  const roomPlotActionHandlers = createRoomPlotActionHandlers(
    roomSession.sendAction,
    effectiveCommanderTargets,
    setChangeAllegiancesSelections,
  );
  const selectBoardSpySlot = (spaceId: string) => {
    if (!boardSpySlotChoices) return;
    if (boardSpySlotChoices.mode === "agent-entry") {
      if (selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && canUseActivatedAlly) {
        placeAgentWith(selectedCard, selectedSpace, spaceId);
        return;
      }
      setSelectedSpyEntrySpaceId(spaceId);
      return;
    }
    const handlers = roomSession.inRoom ? roomPendingActionHandlers : pendingActionHandlers;
    if (boardSpySlotChoices.mode === "place") {
      handlers.placeSpy(spaceId);
      return;
    }
    if (boardSpySlotChoices.mode === "supply-recall") {
      handlers.recallSpyForSupply(spaceId);
      return;
    }
    if (boardSpySlotChoices.mode === "conflict-recall") {
      handlers.recallConflictRewardSpy(spaceId);
      return;
    }
    handlers.recallSpy(spaceId);
  };
  const selectBoardSpace = (spaceId: string) => {
    const space = boardSpaces.find((candidate) => candidate.id === spaceId);
    setSelectedSpaceId(spaceId);
    setSelectedSpyEntrySpaceId(null);
    if (
      !space ||
      !selectedCard ||
      !canControlActivePlayer ||
      !canUseActivatedAlly ||
      !playingPhase ||
      game.agentTurnComplete ||
      activePlayer.agentsReady <= 0 ||
      game.pendingAction ||
      game.pendingQueue.length > 0 ||
      !legalSpaces.has(space.id)
    ) {
      return;
    }
    const entrySpaceIds = game.spaces[space.id]
      ? spyEntrySpaceIdsForOccupiedSpace(game, space.id, activePlayer.id)
      : [];
    if (entrySpaceIds.length > 1) return;
    placeAgentWith(selectedCard, space, entrySpaceIds[0]);
  };
  const selectHandCard = (cardId: string | null) => {
    setSelectedCardId(cardId);
    setSelectedSpyEntrySpaceId(null);
  };

  if (showLaunchScreen) {
    return (
      <LaunchScreen
        loading={roomSession.status === "loading"}
        onCreateRoom={roomSession.createRoom}
        onJoinRoom={roomSession.joinRoom}
        onStartLocal={startLocalGame}
      />
    );
  }

  return (
    <main className="app-shell">
      <RoomPanel
        claimedPlayerId={roomSession.claimedPlayerId}
        error={roomSession.error}
        inRoom={roomSession.inRoom}
        roomId={roomSession.roomId}
        snapshot={roomSession.snapshot}
        status={roomSession.status}
        onClaimSeat={roomSession.claimSeat}
        onCreateRoom={roomSession.createRoom}
        onFillAiOpponents={roomSession.fillAiOpponents}
        onJoinRoom={roomSession.joinRoom}
        onLeaveRoom={roomSession.leaveRoom}
        onReleaseSeat={roomSession.releaseSeat}
        onStartRoom={roomSession.startRoom}
      />
      <RoomPrivatePanel
        compactForPending={game.pendingAction?.kind === "team-resource-payment"}
        phase={game.phase}
        player={roomSession.inRoom ? claimedPlayer : activePlayer}
        showHand={roomSession.inRoom}
      />

      <CommandBar
        activePlayer={activePlayer}
        game={game}
        onCaptureDebug={debugCaptureAvailable ? () => void window.__DUNE_DEBUG__?.capture("button") : undefined}
        onResetGame={resetGame}
      />

      <PlayerTableStrip game={game} />

      <section className="table-grid">
        <BoardPanel
          game={game}
          legalSpaceIds={legalSpaces}
          placementDecisionActive={placementDecisionActive}
          playingPhase={playingPhase && !roomActionLocked}
          selectedSpaceId={selectedSpaceId}
          spySlotChoices={boardSpySlotChoices}
          onSelectSpace={selectBoardSpace}
          onSelectSpySlot={selectBoardSpySlot}
        />
      </section>

      <div className="table-drawer-controls table-drawer-controls-left">
        <button
          className={`table-drawer-toggle ${tableInfoOpen ? "is-active" : ""}`}
          type="button"
          aria-controls="table-info-drawer"
          aria-expanded={tableInfoOpen}
          title={tableInfoOpen ? "Hide table column" : "Show table column"}
          onClick={() => setTableInfoOpen((open) => !open)}
        >
          <PanelLeftOpen size={18} />
          <span>Table</span>
        </button>
      </div>

      <div className="table-drawer-controls table-drawer-controls-right">
        <button
          className={`table-drawer-toggle ${rightDrawer === "leaders" ? "is-active" : ""}`}
          type="button"
          aria-controls="leader-drawer"
          aria-expanded={rightDrawer === "leaders"}
          title={rightDrawer === "leaders" ? "Hide leaders" : "Show leaders"}
          onClick={() => setRightDrawer((open) => open === "leaders" ? null : "leaders")}
        >
          <Users size={18} />
          <span>Leaders</span>
        </button>
        <button
          className={`table-drawer-toggle ${rightDrawer === "log" ? "is-active" : ""}`}
          type="button"
          aria-controls="table-log-drawer"
          aria-expanded={rightDrawer === "log"}
          title={rightDrawer === "log" ? "Hide table log" : "Show table log"}
          onClick={() => setRightDrawer((open) => open === "log" ? null : "log")}
        >
          <ScrollText size={18} />
          <span>Log</span>
        </button>
      </div>

      <aside
        id="table-info-drawer"
        className={`table-drawer table-drawer-left ${tableInfoOpen ? "is-open" : ""}`}
        aria-label="Current conflict and contracts"
        aria-hidden={!tableInfoOpen}
        inert={!tableInfoOpen}
      >
        <TableSidebar
          game={game}
          tableStateLockedByPending={tableStateLockedByPending}
          onShieldWallChange={updateShieldWall}
        />
      </aside>

      <aside
        id="leader-drawer"
        className={`table-drawer table-drawer-right ${rightDrawer === "leaders" ? "is-open" : ""}`}
        aria-label="Leaders"
        aria-hidden={rightDrawer !== "leaders"}
        inert={rightDrawer !== "leaders"}
      >
        <PlayerColumn
          game={game}
          tableStateLockedByPending={tableStateLockedByPending}
          onOpenLeaderReference={openLeaderReference}
          onMakerHooksChange={updateMakerHooks}
          onOpenPile={openPile}
        />
      </aside>

      <aside
        id="table-log-drawer"
        className={`table-drawer table-drawer-right table-log-drawer ${rightDrawer === "log" ? "is-open" : ""}`}
        aria-label="Table log"
        aria-hidden={rightDrawer !== "log"}
        inert={rightDrawer !== "log"}
      >
        <RecentLogPanel entries={game.log} variant="drawer" />
      </aside>

      <LeaderReferenceModal player={selectedLeader} onClose={closeLeaderReference} />

      <CardPlayReveal
        announcement={playQueue[0] ?? null}
        onDone={() => setPlayQueue((queue) => queue.slice(1))}
      />

      <PileInspector
        game={game}
        open={inspectedPile}
        selectedIndex={inspectedPileCardIndex}
        onSelectIndex={setInspectedPileCardIndex}
        onClose={closePile}
      />

      <section className="action-dock">
        {game.phase === "combat" && combatActor && !pendingAction && (!roomSession.inRoom || canControlActivePlayer) && (
          <CombatIntriguePanel
            actor={combatActor}
            game={game}
            onPass={passCombatCard}
            onPlay={playCombatCard}
          />
        )}

        {(game.phase === "endgame" || game.phase === "finished") && (
          <EndgamePanel
            conditionalChoices={conditionalEndgameChoices}
            endgameReady={roomSession.snapshot?.endgameReady}
            game={game}
            iconChoices={endgameChoices}
            roomMode={roomSession.inRoom}
            viewerPlayerId={roomSession.claimedPlayerId}
            onFinalize={finalizeEndgame}
            onScoreConditional={scoreConditionalEndgameIntrigue}
            onScoreIcon={scoreEndgameIntrigue}
          />
        )}

        <ActiveHandPanel
          activeAllies={activeAllies}
          activePlayer={activePlayer}
          activatedAlly={activatedAlly}
          agentTurnComplete={game.agentTurnComplete}
          canPlayAgent={canPlayAgent}
          phase={game.phase}
          pendingActionActive={Boolean(game.pendingAction)}
          pendingLocked={pendingLocked}
          pendingStatusLabel={handPendingStatusLabel}
          playingPhase={playingPhase && !roomActionLocked}
          selectedCardId={selectedCardId}
          onEndAgentTurn={endAgentTurn}
          onEndReveal={endReveal}
          onPlaceAgent={playAgent}
          onRevealTurn={revealTurn}
          onSelectCard={selectHandCard}
          onSelectCommanderTarget={(commanderId, allyId) =>
            setCommanderTargets((current) => ({
              ...current,
              [commanderId]: allyId,
            }))
          }
        >
          <IntrigueHandPanel
            activePlayer={activePlayer}
            activatedAlly={activatedAlly}
            changeAllegiancesSelections={changeAllegiancesSelections}
            game={game}
            plotIntrigueLocked={plotIntrigueLocked}
            {...(roomSession.inRoom ? roomPlotActionHandlers : plotActionHandlers)}
          />
        </ActiveHandPanel>

        <MarketPanel
          activePlayer={activePlayer}
          combatContext={game.phase === "combat"}
          compactForActionContext={Boolean(game.pendingAction) || game.phase === "combat"}
          game={game}
          pendingLocked={pendingLocked}
          playingPhase={playingPhase && !roomActionLocked}
          onBuyCard={buyCard}
        />
      </section>

      <PendingResolutionOverlay active={pendingOverlayActive} resetKey={pendingOverlayResetKey}>
        {showRoomWaitingPending && (
          <RoomPendingPanel
            claimedPlayerId={roomSession.claimedPlayerId}
            game={game}
            onChooseThroneRowCard={(cardId) => void roomSession.sendAction({ kind: "choose-throne-row-card", cardId })}
          />
        )}
        {showResolvablePending && pendingAction && (
          <PendingActionPanel
            game={game}
            pendingAction={pendingAction}
            viewerPlayerId={roomSession.inRoom ? roomSession.claimedPlayerId : undefined}
            {...(roomSession.inRoom ? roomPendingActionHandlers : pendingActionHandlers)}
          />
        )}
      </PendingResolutionOverlay>
    </main>
  );
}

type LaunchScreenProps = {
  loading: boolean;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onStartLocal: () => void;
};

function LaunchScreen({ loading, onCreateRoom, onJoinRoom, onStartLocal }: LaunchScreenProps) {
  const [joinCode, setJoinCode] = useState("");

  return (
    <main className="launch-screen" aria-label="Dune Imperium Uprising">
      <div className="launch-actions" aria-label="Game mode">
        <button type="button" onClick={onStartLocal}>
          <MonitorPlay size={18} />
          Local
        </button>
        <button type="button" className="primary-action" disabled={loading} onClick={onCreateRoom}>
          <PlugZap size={18} />
          Create room
        </button>
        <form
          className="launch-join"
          onSubmit={(event) => {
            event.preventDefault();
            onJoinRoom(joinCode);
          }}
        >
          <input
            aria-label="Room code"
            placeholder="Room code or link"
            value={joinCode}
            onChange={(event) => setJoinCode(event.currentTarget.value)}
          />
          <button type="submit">
            <Link size={18} />
            Join
          </button>
        </form>
      </div>
    </main>
  );
}
