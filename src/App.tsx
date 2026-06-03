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
  setAllianceOwner,
  setChoamContractCompleted,
} from "./game/state";
import type {
  Card,
  FactionId,
  GameState,
} from "./game/types";
import type { CombatIntrigueChoice } from "./game/state";

export {
  boardSpaceIntrigueGainFor,
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
      setGame: (game: GameState) => void;
      setCommanderTarget: (commanderId: string, allyId: string) => void;
    };
    __DUNE_DEBUG_CAPTURE__?: (request: { label?: string; game: GameState }) => Promise<unknown>;
  }
}

const appEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_DUNE_DEBUG?: string } }).env;
const browserDebugEnabled = Boolean(appEnv?.DEV || appEnv?.VITE_DUNE_DEBUG === "1");

export default function App() {
  const [game, setGame] = useState<GameState>(() => initialGame());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [commanderTargets, setCommanderTargets] = useState<Record<string, string>>({});
  const [changeAllegiancesSelections, setChangeAllegiancesSelections] = useState<Record<string, ChangeAllegiancesSelection>>({});
  const leaderOpenerRef = useRef<HTMLButtonElement | null>(null);

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
      setCommanderTarget: (commanderId, allyId) => setCommanderTargets((current) => ({ ...current, [commanderId]: allyId })),
      setGame: (nextGame) => setGame(nextGame),
    };
    window.addEventListener("keydown", handleDebugCaptureKeydown);
    return () => {
      window.removeEventListener("keydown", handleDebugCaptureKeydown);
      delete window.__DUNE_DEBUG__;
    };
  }, [commanderTargets, game]);

  const activePlayer = game.players[game.activeSeat];
  const activeAllies = game.players.filter((player) => player.team === activePlayer.team && player.role === "Ally");
  const activatedAlly =
    activePlayer.role === "Commander"
      ? activeAllies.find((player) => player.id === activatedAllyIdFor(activePlayer, game.players, commanderTargets)) ?? activeAllies[0]
      : activePlayer;
  const selectedCard = activePlayer.hand.find((card) => card.id === selectedCardId) ?? null;
  const selectedSpace = boardSpaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedLeader = game.players.find((player) => player.id === selectedLeaderId) ?? null;

  function closeLeaderReference() {
    setSelectedLeaderId(null);
    window.setTimeout(() => leaderOpenerRef.current?.focus(), 0);
  }

  function openLeaderReference(playerId: string, opener: HTMLButtonElement) {
    leaderOpenerRef.current = opener;
    setSelectedLeaderId(playerId);
  }

  const legalSpaces = useMemo(() => {
    if (game.phase !== "playing" || game.agentTurnComplete || !selectedCard || activePlayer.agentsReady <= 0 || game.pendingAction) return new Set<string>();
    return new Set(
      boardSpaces
        .filter((space) => !game.spaces[space.id])
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts))
        .filter((space) => canPay(activePlayer, effectiveCost(space, game.players)))
        .map((space) => space.id),
    );
  }, [activePlayer, game.agentTurnComplete, game.pendingAction, game.phase, game.players, game.sharedSpyPosts, game.spaces, game.spyPosts, game.swordmasterClaimed, selectedCard]);

  const canPlayAgent = Boolean(game.phase === "playing" && !game.agentTurnComplete && selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && !game.pendingAction);

  function playAgent() {
    if (game.phase !== "playing" || !canPlayAgent || !selectedCard || !selectedSpace) return;
    setGame((current) => placeAgentAction(current, { commanderTargets, selectedCard, selectedSpace }));
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function endAgentTurn() {
    if (game.phase !== "playing" || game.pendingAction || game.pendingQueue.length > 0 || !game.agentTurnComplete) return;
    setGame((current) => {
      if (current.phase !== "playing" || current.pendingAction || current.pendingQueue.length > 0 || !current.agentTurnComplete) {
        return current;
      }
      const advancedState = {
        ...current,
        agentTurnComplete: false,
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
    if (game.phase !== "playing") return;
    if (game.pendingAction) return;
    if (game.agentTurnComplete) return;
    if (activePlayer.revealed) return;
    const revealPlan = revealTurnPlan(activePlayer, game);
    setGame((current) => revealTurnAction(current, { commanderTargets, revealPlan }));
  }

  function buyCard(card: Card) {
    if (game.phase !== "playing") return;
    if (game.pendingAction || game.pendingQueue.length > 0) return;
    const manipulatedCard = activePlayer.manipulatedCards.some((candidate) => candidate.id === card.id);
    const cardCost = manipulatedCard ? manipulateAcquisitionCost(card) : card.cost ?? 0;
    if (!activePlayer.revealed || activePlayer.persuasion < cardCost) return;
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
    if (game.phase !== "playing") return;
    if (game.pendingAction) return;
    if (!activePlayer.revealed) return;
    setGame((current) => {
      return finishRevealTurn(current, current.players[current.activeSeat].id);
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function updateContractCompleted(playerId: string, contractId: string, completed: boolean) {
    setGame((current) => setChoamContractCompleted(current, playerId, contractId, completed));
  }

  function updateAllianceOwner(playerId: string, faction: FactionId, ownsAlliance: boolean) {
    setGame((current) => setAllianceOwner(current, faction, ownsAlliance ? playerId : undefined));
  }

  function updateMakerHooks(playerId: string, hasHooks: boolean) {
    setGame((current) => {
      if (tableStateLockedByPendingActions(current)) return current;
      return setMakerHooks(current, playerId, hasHooks);
    });
  }

  function updateShieldWall(standing: boolean) {
    setGame((current) => {
      if (tableStateLockedByPendingActions(current)) return current;
      return setShieldWall(current, standing);
    });
  }

  function playCombatCard(intrigueId: string, targetId?: string, combatChoice?: CombatIntrigueChoice) {
    if (game.phase !== "combat") return;
    setGame((current) =>
      playCombatIntrigue(current, current.players[current.activeSeat].id, intrigueId, targetId, combatChoice),
    );
  }

  function passCombatCard() {
    if (game.phase !== "combat") return;
    setGame((current) => passCombatIntrigue(current, current.players[current.activeSeat].id));
  }

  function scoreEndgameIntrigue(playerId: string, intrigueId: string, conflictId: string) {
    setGame((current) => scoreEndgameBattleIconIntrigue(current, playerId, intrigueId, conflictId));
  }

  function scoreConditionalEndgameIntrigue(playerId: string, intrigueId: string) {
    setGame((current) => scoreEndgameConditionalIntrigue(current, playerId, intrigueId));
  }

  function finalizeEndgame() {
    setGame((current) => finishEndgame(current));
  }

  function resetGame() {
    setGame(initialGame());
    setSelectedCardId(null);
    setSelectedSpaceId(null);
    setSelectedLeaderId(null);
    setCommanderTargets({});
  }

  const pendingAction = game.pendingAction;
  const tableStateLockedByPending = tableStateLockedByPendingActions(game);
  const combatActor = game.phase === "combat" ? game.players[game.activeSeat] : undefined;
  const endgameChoices = endgameBattleIconChoices(game);
  const conditionalEndgameChoices = endgameConditionalIntrigueChoices(game);
  const playingPhase = game.phase === "playing";
  const pendingLocked = Boolean(game.pendingAction) || game.pendingQueue.length > 0;
  const plotIntrigueLocked = !playingPhase || pendingLocked;
  const debugCaptureAvailable = browserDebugEnabled && typeof window.__DUNE_DEBUG_CAPTURE__ === "function";
  const pendingActionHandlers = createPendingActionHandlers({
    commanderTargets,
    game,
    setGame,
  });
  const plotActionHandlers = createPlotActionHandlers({
    commanderTargets,
    setChangeAllegiancesSelections,
    setGame,
  });

  return (
    <main className="app-shell">
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
          playingPhase={playingPhase}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={setSelectedSpaceId}
        />

        <PlayerColumn
          game={game}
          tableStateLockedByPending={tableStateLockedByPending}
          onOpenLeaderReference={openLeaderReference}
          onAllianceOwnerChange={updateAllianceOwner}
          onMakerHooksChange={updateMakerHooks}
          onContractCompletedChange={updateContractCompleted}
        />
      </section>

      <LeaderReferenceModal player={selectedLeader} onClose={closeLeaderReference} />

      <section className="action-dock">
        {game.phase === "combat" && combatActor && !pendingAction && (
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
            game={game}
            iconChoices={endgameChoices}
            onFinalize={finalizeEndgame}
            onScoreConditional={scoreConditionalEndgameIntrigue}
            onScoreIcon={scoreEndgameIntrigue}
          />
        )}

        {pendingAction && (
          <PendingActionPanel
            game={game}
            pendingAction={pendingAction}
            {...pendingActionHandlers}
          />
        )}

        <ActiveHandPanel
          activeAllies={activeAllies}
          activePlayer={activePlayer}
          activatedAlly={activatedAlly}
          agentTurnComplete={game.agentTurnComplete}
          canPlayAgent={canPlayAgent}
          pendingActionActive={Boolean(game.pendingAction)}
          pendingLocked={pendingLocked}
          playingPhase={playingPhase}
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
            {...plotActionHandlers}
          />
        </ActiveHandPanel>

        <MarketPanel
          activePlayer={activePlayer}
          game={game}
          pendingLocked={pendingLocked}
          playingPhase={playingPhase}
          onBuyCard={buyCard}
        />

        <RecentLogPanel entries={game.log} />
      </section>
    </main>
  );
}
