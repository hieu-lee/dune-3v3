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
import { createPlotActionHandlers } from "./app-plot-actions";
import {
  activatedAllyIdFor,
  placeAgentAction,
  revealTurnAction,
  revealTurnPlan,
} from "./app-turn-actions";
import { boardSpaces } from "./game/data";
import {
  acquireCardForPending,
  advanceSeat,
  acquireMarketCard,
  canPay,
  collectChoamContractFallback,
  deployControlDefenseTroop,
  deployTroopToConflict,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  effectiveCost,
  finishEndgame,
  finishPendingAction,
  finishRevealTurn,
  finishRevealAdjustment as resolveRevealAdjustment,
  gainConflictInfluenceForPending,
  iconCanReach,
  initialGame,
  loseInfluenceForPending,
  manipulateAcquisitionCost,
  maybeStartCombatPhase,
  passCombatIntrigue,
  playCombatIntrigue,
  playerHasConflictUnits,
  placeSpyForPending,
  recallSpyForSupplyForPending,
  recallSpyForPending,
  reinforceTroop,
  moveImperiumCardToThroneRow,
  resolveConflictTie,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  adjustThreatenSpiceProductionContribution,
  payConflictVpConversion,
  setMakerHooks,
  setShieldWall,
  setAllianceOwner,
  setChoamContractCompleted,
  resolveCommandRespectTrade,
  resolveCorrinoMightChoice,
  resolveCommanderResourceSplitChoice,
  resolveDemandAttentionChoice,
  resolveDemandResultsChoice,
  resolveDesertCallChoice,
  resolveIrulanSignetRingChoice,
  resolveJessicaOtherMemoriesChoice,
  resolveJessicaReverendMotherChoice,
  resolveJessicaSpiceAgonyChoice,
  resolveJessicaWaterOfLifeChoice,
  resolveLadyAmberDesertScoutsChoice,
  recallSpyForConflictVpConversion,
  resolveMakerChoice,
  resolveSietchTabrChoice,
  resolveShaddamSignetRingChoice,
  resolveStabanUnseenNetworkChoice,
  scoreGurneyAlwaysSmiling,
  resolveThreatenSpiceProductionChoice,
  skipCommandRespect,
  skipControlDefenseTroop,
  skipDemandAttention,
  skipCorrinoMight,
  skipDemandResults,
  skipDesertCall,
  skipConflictVpConversion,
  skipThreatenSpiceProduction,
  skipLoseInfluence,
  skipRecallSpy,
  skipTrashCard,
  startNextRound,
  takeChoamContract,
  trashPlayerCard,
  transferTradeGood,
  updateTradeSelection,
} from "./game/state";
import type {
  Card,
  FactionId,
  GameState,
  TradeGoodId,
  TrashCardZone,
} from "./game/types";
import type { CombatIntrigueChoice, IrulanSignetRingChoice, JessicaOtherMemoriesChoice, JessicaReverendMotherChoice, JessicaSpiceAgonyChoice, JessicaWaterOfLifeChoice, LadyAmberDesertScoutsChoice, ShaddamSignetRingChoice, StabanUnseenNetworkChoice } from "./game/state";

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
    const revealPlan = revealTurnPlan(activePlayer);
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

  function chooseThroneRowCard(cardId: string) {
    if (game.pendingAction?.kind !== "throne-row") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "throne-row") return current;
      return maybeStartCombatPhase(moveImperiumCardToThroneRow(current, pending, cardId));
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

  function clearPendingAction() {
    setGame((current) => maybeStartCombatPhase(finishPendingAction(current)));
  }

  function trashCard(zone: TrashCardZone, cardId: string) {
    if (game.pendingAction?.kind !== "trash-card") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "trash-card") return current;
      return maybeStartCombatPhase(trashPlayerCard(current, pending, zone, cardId));
    });
  }

  function skipTrash() {
    if (game.pendingAction?.kind !== "trash-card") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "trash-card") return current;
      return maybeStartCombatPhase(skipTrashCard(current, pending));
    });
  }

  function recallSpy(spaceId: string) {
    if (game.pendingAction?.kind !== "recall-spy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "recall-spy") return current;
      return maybeStartCombatPhase(recallSpyForPending(current, pending, spaceId));
    });
  }

  function skipRecall() {
    if (game.pendingAction?.kind !== "recall-spy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "recall-spy") return current;
      return maybeStartCombatPhase(skipRecallSpy(current, pending));
    });
  }

  function loseInfluence(ownerId: string, faction: FactionId) {
    if (game.pendingAction?.kind !== "lose-influence") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "lose-influence") return current;
      return maybeStartCombatPhase(loseInfluenceForPending(current, pending, ownerId, faction));
    });
  }

  function skipInfluenceLoss() {
    if (game.pendingAction?.kind !== "lose-influence") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "lose-influence") return current;
      return maybeStartCombatPhase(skipLoseInfluence(current, pending));
    });
  }

  function placeSpy(spaceId: string) {
    if (game.pendingAction?.kind !== "spy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "spy") return current;
      return maybeStartCombatPhase(placeSpyForPending(current, pending, spaceId));
    });
  }

  function recallSpyForSupply(spaceId: string) {
    if (game.pendingAction?.kind !== "spy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "spy") return current;
      return recallSpyForSupplyForPending(current, pending, spaceId);
    });
  }

  function adjustRevealReward(persuasionDelta: number, strengthDelta: number) {
    if (game.pendingAction?.kind !== "reveal-adjust") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "reveal-adjust") return current;
      const owner = current.players.find((player) => player.id === pending.ownerId);
      const recipient = current.players.find((player) => player.id === pending.combatRecipientId);
      const appliedPersuasion = owner
        ? Math.max(-pending.persuasionAdjustment, persuasionDelta)
        : 0;
      const appliedStrength = recipient
        ? Math.max(-pending.strengthAdjustment, playerHasConflictUnits(recipient) ? strengthDelta : Math.min(0, strengthDelta))
        : 0;
      if (appliedPersuasion === 0 && appliedStrength === 0) return current;
      const players = current.players.map((player) => {
        let next = player;
        if (player.id === pending.ownerId) next = { ...next, persuasion: next.persuasion + appliedPersuasion };
        if (player.id === pending.combatRecipientId) next = { ...next, conflict: next.conflict + appliedStrength };
        return next;
      });
      return {
        ...current,
        players,
        pendingAction: {
          ...pending,
          persuasionAdjustment: pending.persuasionAdjustment + appliedPersuasion,
          strengthAdjustment: pending.strengthAdjustment + appliedStrength,
        },
      };
    });
  }

  function finishRevealAdjust() {
    if (game.pendingAction?.kind !== "reveal-adjust") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "reveal-adjust") return current;
      return resolveRevealAdjustment(current, pending);
    });
  }

  function chooseMakerReward(choice: "spice" | "sandworms") {
    if (game.pendingAction?.kind !== "maker-choice") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "maker-choice") return current;
      if (choice === "sandworms" && !pending.canSummonSandworms) return current;
      return maybeStartCombatPhase(resolveMakerChoice(current, pending, choice));
    });
  }

  function chooseSietchTabr(choice: "hooks" | "shield-wall") {
    if (game.pendingAction?.kind !== "sietch-tabr") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "sietch-tabr") return current;
      return maybeStartCombatPhase(resolveSietchTabrChoice(current, pending, choice));
    });
  }

  function chooseCommanderResourceSplit(optionIndex: number) {
    if (game.pendingAction?.kind !== "commander-resource-split") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "commander-resource-split") return current;
      return maybeStartCombatPhase(resolveCommanderResourceSplitChoice(current, pending, optionIndex));
    });
  }

  function chooseShaddamSignet(choice: ShaddamSignetRingChoice) {
    if (game.pendingAction?.kind !== "shaddam-signet-ring") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "shaddam-signet-ring") return current;
      return maybeStartCombatPhase(resolveShaddamSignetRingChoice(current, pending, choice));
    });
  }

  function chooseIrulanSignet(choice: IrulanSignetRingChoice) {
    if (game.pendingAction?.kind !== "irulan-signet-ring") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "irulan-signet-ring") return current;
      return maybeStartCombatPhase(resolveIrulanSignetRingChoice(current, pending, choice));
    });
  }

  function chooseStabanUnseenNetwork(choice: StabanUnseenNetworkChoice) {
    if (game.pendingAction?.kind !== "staban-unseen-network") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "staban-unseen-network") return current;
      return maybeStartCombatPhase(resolveStabanUnseenNetworkChoice(current, pending, choice));
    });
  }

  function chooseLadyAmberDesertScouts(choice: LadyAmberDesertScoutsChoice) {
    if (game.pendingAction?.kind !== "amber-desert-scouts") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "amber-desert-scouts") return current;
      return maybeStartCombatPhase(resolveLadyAmberDesertScoutsChoice(current, pending, choice));
    });
  }

  function chooseJessicaSpiceAgony(choice: JessicaSpiceAgonyChoice) {
    if (game.pendingAction?.kind !== "jessica-spice-agony") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "jessica-spice-agony") return current;
      return maybeStartCombatPhase(resolveJessicaSpiceAgonyChoice(current, pending, choice));
    });
  }

  function chooseJessicaWaterOfLife(choice: JessicaWaterOfLifeChoice) {
    if (game.pendingAction?.kind !== "jessica-water-of-life") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "jessica-water-of-life") return current;
      return maybeStartCombatPhase(resolveJessicaWaterOfLifeChoice(current, pending, choice));
    });
  }

  function chooseJessicaReverendMother(choice: JessicaReverendMotherChoice) {
    if (game.pendingAction?.kind !== "jessica-reverend-mother") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "jessica-reverend-mother") return current;
      return maybeStartCombatPhase(resolveJessicaReverendMotherChoice(current, pending, choice));
    });
  }

  function chooseJessicaOtherMemories(choice: JessicaOtherMemoriesChoice) {
    if (game.pendingAction?.kind !== "jessica-other-memories") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "jessica-other-memories") return current;
      return maybeStartCombatPhase(resolveJessicaOtherMemoriesChoice(current, pending, choice));
    });
  }

  function chooseCommandRespectTrade(partnerId: string) {
    if (game.pendingAction?.kind !== "command-respect") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "command-respect") return current;
      return resolveCommandRespectTrade(current, pending, partnerId);
    });
  }

  function skipCommandRespectChoice() {
    if (game.pendingAction?.kind !== "command-respect") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "command-respect") return current;
      return maybeStartCombatPhase(skipCommandRespect(current, pending));
    });
  }

  function chooseDemandResults(optionIndex: number) {
    if (game.pendingAction?.kind !== "demand-results") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "demand-results") return current;
      return maybeStartCombatPhase(resolveDemandResultsChoice(current, pending, optionIndex));
    });
  }

  function skipDemandResultsChoice() {
    if (game.pendingAction?.kind !== "demand-results") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "demand-results") return current;
      return maybeStartCombatPhase(skipDemandResults(current, pending));
    });
  }

  function chooseCorrinoMight() {
    if (game.pendingAction?.kind !== "corrino-might") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "corrino-might") return current;
      return maybeStartCombatPhase(resolveCorrinoMightChoice(current, pending));
    });
  }

  function skipCorrinoMightChoice() {
    if (game.pendingAction?.kind !== "corrino-might") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "corrino-might") return current;
      return maybeStartCombatPhase(skipCorrinoMight(current, pending));
    });
  }

  function chooseDemandAttention() {
    if (game.pendingAction?.kind !== "demand-attention") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "demand-attention") return current;
      return maybeStartCombatPhase(resolveDemandAttentionChoice(current, pending));
    });
  }

  function skipDemandAttentionChoice() {
    if (game.pendingAction?.kind !== "demand-attention") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "demand-attention") return current;
      return maybeStartCombatPhase(skipDemandAttention(current, pending));
    });
  }

  function chooseDesertCall() {
    if (game.pendingAction?.kind !== "desert-call") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "desert-call") return current;
      return maybeStartCombatPhase(resolveDesertCallChoice(current, pending));
    });
  }

  function skipDesertCallChoice() {
    if (game.pendingAction?.kind !== "desert-call") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "desert-call") return current;
      return maybeStartCombatPhase(skipDesertCall(current, pending));
    });
  }

  function adjustThreatenSpiceProduction(contributorId: string, delta: number) {
    if (game.pendingAction?.kind !== "threaten-spice-production") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "threaten-spice-production") return current;
      return adjustThreatenSpiceProductionContribution(current, pending, contributorId, delta);
    });
  }

  function chooseThreatenSpiceProduction() {
    if (game.pendingAction?.kind !== "threaten-spice-production") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "threaten-spice-production") return current;
      return maybeStartCombatPhase(resolveThreatenSpiceProductionChoice(current, pending));
    });
  }

  function skipThreatenSpiceProductionChoice() {
    if (game.pendingAction?.kind !== "threaten-spice-production") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "threaten-spice-production") return current;
      return maybeStartCombatPhase(skipThreatenSpiceProduction(current, pending));
    });
  }

  function deployOne() {
    if (game.pendingAction?.kind !== "deploy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "deploy") return current;
      const deployed = deployTroopToConflict(current, pending);
      return maybeStartCombatPhase(scoreGurneyAlwaysSmiling(deployed, current.players[current.activeSeat].id));
    });
  }

  function deployControlDefense() {
    if (game.pendingAction?.kind !== "control-defense") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "control-defense") return current;
      return deployControlDefenseTroop(current, pending);
    });
  }

  function skipControlDefense() {
    if (game.pendingAction?.kind !== "control-defense") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "control-defense") return current;
      return skipControlDefenseTroop(current, pending);
    });
  }

  function reinforceOne(playerId: string, destination: "garrison" | "conflict") {
    if (game.pendingAction?.kind !== "reinforce") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "reinforce") return current;
      return maybeStartCombatPhase(reinforceTroop(current, pending, playerId, destination));
    });
  }

  function updateTrade(resource: TradeGoodId, partnerId?: string) {
    if (game.pendingAction?.kind !== "trade") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "trade") return current;
      return updateTradeSelection(current, pending, resource, partnerId);
    });
  }

  function transferTrade(fromId: string, toId: string, intrigueId?: string) {
    if (game.pendingAction?.kind !== "trade") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "trade") return current;
      return transferTradeGood(current, pending, fromId, toId, intrigueId);
    });
  }

  function takeContract(contractId: string) {
    if (game.pendingAction?.kind !== "contract") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "contract") return current;
      return maybeStartCombatPhase(takeChoamContract(current, pending, contractId));
    });
  }

  function acquirePendingCard(cardId: string) {
    if (game.pendingAction?.kind !== "acquire-card") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "acquire-card") return current;
      const owner = current.players.find((player) => player.id === pending.ownerId);
      const recruitOwnerId = owner?.role === "Commander" ? activatedAllyIdFor(owner, current.players, commanderTargets) : undefined;
      return maybeStartCombatPhase(acquireCardForPending(current, pending, cardId, recruitOwnerId));
    });
  }

  function collectContractFallback() {
    if (game.pendingAction?.kind !== "contract") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "contract") return current;
      return maybeStartCombatPhase(collectChoamContractFallback(current, pending));
    });
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

  function chooseConflictTieWinner(winnerId?: string) {
    if (game.pendingAction?.kind !== "conflict-tie") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-tie") return current;
      return startNextRound(resolveConflictTie(current, pending, winnerId));
    });
  }

  function payConflictVpReward() {
    if (game.pendingAction?.kind !== "conflict-vp-conversion") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-vp-conversion") return current;
      return startNextRound(payConflictVpConversion(current, pending));
    });
  }

  function recallConflictRewardSpy(spaceId: string) {
    if (game.pendingAction?.kind !== "conflict-vp-conversion") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-vp-conversion") return current;
      return startNextRound(recallSpyForConflictVpConversion(current, pending, spaceId));
    });
  }

  function skipConflictVpReward() {
    if (game.pendingAction?.kind !== "conflict-vp-conversion") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-vp-conversion") return current;
      return startNextRound(skipConflictVpConversion(current, pending));
    });
  }

  function chooseConflictInfluence(faction: FactionId) {
    if (game.pendingAction?.kind !== "conflict-influence") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-influence") return current;
      return startNextRound(gainConflictInfluenceForPending(current, pending, faction));
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
            acquirePendingCard={acquirePendingCard}
            adjustRevealReward={adjustRevealReward}
            adjustThreatenSpiceProduction={adjustThreatenSpiceProduction}
            chooseCommandRespectTrade={chooseCommandRespectTrade}
            chooseCommanderResourceSplit={chooseCommanderResourceSplit}
            chooseConflictInfluence={chooseConflictInfluence}
            chooseConflictTieWinner={chooseConflictTieWinner}
            chooseCorrinoMight={chooseCorrinoMight}
            chooseDemandAttention={chooseDemandAttention}
            chooseDemandResults={chooseDemandResults}
            chooseDesertCall={chooseDesertCall}
            chooseIrulanSignet={chooseIrulanSignet}
            chooseJessicaOtherMemories={chooseJessicaOtherMemories}
            chooseJessicaReverendMother={chooseJessicaReverendMother}
            chooseJessicaSpiceAgony={chooseJessicaSpiceAgony}
            chooseJessicaWaterOfLife={chooseJessicaWaterOfLife}
            chooseLadyAmberDesertScouts={chooseLadyAmberDesertScouts}
            chooseMakerReward={chooseMakerReward}
            chooseShaddamSignet={chooseShaddamSignet}
            chooseSietchTabr={chooseSietchTabr}
            chooseStabanUnseenNetwork={chooseStabanUnseenNetwork}
            chooseThreatenSpiceProduction={chooseThreatenSpiceProduction}
            chooseThroneRowCard={chooseThroneRowCard}
            clearPendingAction={clearPendingAction}
            collectContractFallback={collectContractFallback}
            deployControlDefense={deployControlDefense}
            deployOne={deployOne}
            finishRevealAdjust={finishRevealAdjust}
            loseInfluence={loseInfluence}
            payConflictVpReward={payConflictVpReward}
            placeSpy={placeSpy}
            recallConflictRewardSpy={recallConflictRewardSpy}
            recallSpy={recallSpy}
            recallSpyForSupply={recallSpyForSupply}
            reinforceOne={reinforceOne}
            skipCommandRespectChoice={skipCommandRespectChoice}
            skipControlDefense={skipControlDefense}
            skipConflictVpReward={skipConflictVpReward}
            skipCorrinoMightChoice={skipCorrinoMightChoice}
            skipDemandAttentionChoice={skipDemandAttentionChoice}
            skipDemandResultsChoice={skipDemandResultsChoice}
            skipDesertCallChoice={skipDesertCallChoice}
            skipInfluenceLoss={skipInfluenceLoss}
            skipRecall={skipRecall}
            skipThreatenSpiceProductionChoice={skipThreatenSpiceProductionChoice}
            skipTrash={skipTrash}
            takeContract={takeContract}
            transferTrade={transferTrade}
            trashCard={trashCard}
            updateTrade={updateTrade}
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
