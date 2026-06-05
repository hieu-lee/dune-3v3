import { useEffect, useMemo, useRef, useState } from "react";
import { ActiveHandPanel } from "./components/ActiveHandPanel";
import { BoardPanel } from "./components/BoardPanel";
import { CommandBar } from "./components/CommandBar";
import { CombatIntriguePanel } from "./components/CombatIntriguePanel";
import { EndgamePanel } from "./components/EndgamePanel";
import { IntrigueHandPanel } from "./components/IntrigueHandPanel";
import { LeaderReferenceModal } from "./components/LeaderReferenceModal";
import { MarketPanel } from "./components/MarketPanel";
import { PendingActionPanel } from "./components/PendingActionPanel";
import { PlayerColumn } from "./components/PlayerColumn";
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
  placeAgentAction,
  revealTurnAction,
  revealTurnPlan,
} from "./app-turn-actions";
import { boardSpaces } from "./game/data";
import {
  advanceSeat,
  acquireMarketCard,
  canPay,
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
  playCombatIntrigue,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  setMakerHooks,
  setShieldWall,
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
	      setGame: (game: GameState) => void;
	      setCommanderTarget: (commanderId: string, allyId: string) => void;
    };
    __DUNE_DEBUG_CAPTURE__?: (request: { label?: string; game: GameState }) => Promise<unknown>;
  }
}

const appEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_DUNE_DEBUG?: string } }).env;
const browserDebugEnabled = Boolean(appEnv?.DEV || appEnv?.VITE_DUNE_DEBUG === "1");

export default function App() {
  const roomSession = useRoomSession();
  const [game, setGame] = useState<GameState>(() => initialGame());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [commanderTargets, setCommanderTargets] = useState<Record<string, string>>({});
  const [changeAllegiancesSelections, setChangeAllegiancesSelections] = useState<Record<string, ChangeAllegiancesSelection>>({});
  const leaderOpenerRef = useRef<HTMLButtonElement | null>(null);
  const localGameRef = useRef<GameState | null>(null);
  const wasInRoomRef = useRef(false);

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
	      setCommanderTarget: (commanderId, allyId) => setCommanderTargets((current) => ({ ...current, [commanderId]: allyId })),
	      setGame: (nextGame) => setGame(nextGame),
	    };
    window.addEventListener("keydown", handleDebugCaptureKeydown);
    return () => {
      window.removeEventListener("keydown", handleDebugCaptureKeydown);
      delete window.__DUNE_DEBUG__;
    };
	  }, [commanderTargets, game, roomSession.snapshot, roomSession.syncMode]);

  useEffect(() => {
    if (!roomSession.snapshot) {
      if (wasInRoomRef.current && !roomSession.inRoom) {
        wasInRoomRef.current = false;
        setGame(localGameRef.current ?? initialGame());
        setSelectedCardId(null);
        setSelectedSpaceId(null);
      }
      return;
    }
    if (!wasInRoomRef.current) {
      localGameRef.current = game;
      wasInRoomRef.current = true;
    }
    setGame(roomSession.snapshot.game);
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }, [roomSession.inRoom, roomSession.snapshot]);

  const activePlayer = game.players[game.activeSeat];
  const claimedPlayer = roomSession.claimedPlayerId
    ? game.players.find((player) => player.id === roomSession.claimedPlayerId)
    : undefined;
  const activeAllies = game.players.filter((player) => player.team === activePlayer.team && player.role === "Ally");
  const activatedAlly =
    activePlayer.role === "Commander"
      ? activeAllies.find((player) => player.id === activatedAllyIdFor(activePlayer, game.players, commanderTargets)) ?? activeAllies[0]
      : activePlayer;
  const selectedCard = activePlayer.hand.find((card) => card.id === selectedCardId) ?? null;
  const selectedSpace = boardSpaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedLeader = game.players.find((player) => player.id === selectedLeaderId) ?? null;
  const canControlActivePlayer = !roomSession.inRoom || roomSession.claimedPlayerId === activePlayer.id;

  function closeLeaderReference() {
    setSelectedLeaderId(null);
    window.setTimeout(() => leaderOpenerRef.current?.focus(), 0);
  }

  function openLeaderReference(playerId: string, opener: HTMLButtonElement) {
    leaderOpenerRef.current = opener;
    setSelectedLeaderId(playerId);
  }

  const legalSpaces = useMemo(() => {
    if (!canControlActivePlayer || game.phase !== "playing" || game.agentTurnComplete || !selectedCard || activePlayer.agentsReady <= 0 || game.pendingAction) return new Set<string>();
    return new Set(
      boardSpaces
        .filter((space) => !game.spaces[space.id])
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts))
        .filter((space) => canPay(activePlayer, effectiveCost(space, game.players)))
        .map((space) => space.id),
    );
  }, [activePlayer, canControlActivePlayer, game.agentTurnComplete, game.pendingAction, game.phase, game.players, game.sharedSpyPosts, game.spaces, game.spyPosts, game.swordmasterClaimed, selectedCard]);

  const canPlayAgent = Boolean(canControlActivePlayer && game.phase === "playing" && !game.agentTurnComplete && selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && !game.pendingAction);

  function playAgent() {
    if (game.phase !== "playing" || !canPlayAgent || !selectedCard || !selectedSpace) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({
        kind: "place-agent",
        cardId: selectedCard.id,
        spaceId: selectedSpace.id,
        commanderTargets,
      }).then((applied) => {
        if (!applied) return;
        setSelectedCardId(null);
        setSelectedSpaceId(null);
      });
      return;
    }
    setGame((current) => placeAgentAction(current, { commanderTargets, selectedCard, selectedSpace }));
    setSelectedCardId(null);
    setSelectedSpaceId(null);
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
      void roomSession.sendAction({ kind: "reveal-turn", commanderTargets });
      return;
    }
    const targetId =
      activePlayer.role === "Commander"
        ? activatedAllyIdFor(activePlayer, game.players, commanderTargets)
        : activePlayer.id;
    const revealTarget = game.players.find((player) => player.id === targetId);
    const revealPlan = revealTurnPlan(activePlayer, game, revealTarget);
    setGame((current) => revealTurnAction(current, { commanderTargets, revealPlan }));
  }

  function buyCard(card: Card) {
    if (!canControlActivePlayer || game.phase !== "playing") return;
    if (game.pendingAction || game.pendingQueue.length > 0) return;
    const manipulatedCard = activePlayer.manipulatedCards.some((candidate) => candidate.id === card.id);
    const cardCost = manipulatedCard ? manipulateAcquisitionCost(card) : card.cost ?? 0;
    if (!activePlayer.revealed || activePlayer.persuasion < cardCost) return;
    if (roomSession.inRoom) {
      void roomSession.sendAction({ kind: "buy-card", cardId: card.id, commanderTargets });
      return;
    }
    setGame((current) => {
      const buyer = current.players[current.activeSeat];
      const callToArmsRecruitOwnerId =
        buyer.callToArmsActive && buyer.role === "Commander"
          ? activatedAllyIdFor(buyer, current.players, commanderTargets)
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
    setGame((current) => passCombatIntrigue(current, current.players[current.activeSeat].id));
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

  function resetGame() {
    if (roomSession.inRoom) return;
    setGame(initialGame());
    setSelectedCardId(null);
    setSelectedSpaceId(null);
    setSelectedLeaderId(null);
    setCommanderTargets({});
  }

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
  const roomActionLocked = roomSession.inRoom && !canControlActivePlayer;
  const pendingLocked = Boolean(game.pendingAction) || game.pendingQueue.length > 0 || roomActionLocked;
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
  const pendingActionHandlers = createPendingActionHandlers({
    commanderTargets,
    game,
    setGame,
  });
  const roomPendingActionHandlers = createRoomPendingActionHandlers(roomSession.sendAction);
  const plotActionHandlers = createPlotActionHandlers({
    commanderTargets,
    setChangeAllegiancesSelections,
    setGame,
  });
  const roomPlotActionHandlers = createRoomPlotActionHandlers(
    roomSession.sendAction,
    commanderTargets,
    setChangeAllegiancesSelections,
  );

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
        onJoinRoom={roomSession.joinRoom}
        onLeaveRoom={roomSession.leaveRoom}
        onReleaseSeat={roomSession.releaseSeat}
      />
      {roomSession.inRoom && (
        <RoomPrivatePanel
          compactForPending={game.pendingAction?.kind === "team-resource-payment"}
          phase={game.phase}
          player={claimedPlayer}
        />
      )}
      {roomSession.inRoom && !canResolveRoomPending && (
        <RoomPendingPanel
          claimedPlayerId={roomSession.claimedPlayerId}
          game={game}
          onChooseThroneRowCard={(cardId) => void roomSession.sendAction({ kind: "choose-throne-row-card", cardId })}
        />
      )}

      <CommandBar
        activePlayer={activePlayer}
        game={game}
        onCaptureDebug={debugCaptureAvailable ? () => void window.__DUNE_DEBUG__?.capture("button") : undefined}
        onResetGame={resetGame}
      />

      <section className="table-grid">
        <TableSidebar
          game={game}
          tableStateLockedByPending={tableStateLockedByPending}
          onShieldWallChange={updateShieldWall}
        />

        <BoardPanel
          game={game}
          legalSpaceIds={legalSpaces}
          placementDecisionActive={placementDecisionActive}
          playingPhase={playingPhase && !roomActionLocked}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={setSelectedSpaceId}
        />

        <PlayerColumn
          game={game}
          tableStateLockedByPending={tableStateLockedByPending}
          onOpenLeaderReference={openLeaderReference}
          onMakerHooksChange={updateMakerHooks}
        />
      </section>

      <LeaderReferenceModal player={selectedLeader} onClose={closeLeaderReference} />

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

        {pendingAction && (!roomSession.inRoom || canResolveRoomPending) && (
          <PendingActionPanel
            game={game}
            pendingAction={pendingAction}
            viewerPlayerId={roomSession.inRoom ? roomSession.claimedPlayerId : undefined}
            {...(roomSession.inRoom ? roomPendingActionHandlers : pendingActionHandlers)}
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
          playingPhase={playingPhase && !roomActionLocked}
          selectedCardId={selectedCardId}
          onEndAgentTurn={endAgentTurn}
          onEndReveal={endReveal}
          onPlaceAgent={playAgent}
          onRevealTurn={revealTurn}
          onSelectCard={setSelectedCardId}
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

        <RecentLogPanel entries={game.log} />
      </section>
    </main>
  );
}
