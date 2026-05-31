import {
  BookOpen,
  CircleDollarSign,
  Crown,
  Droplets,
  Eye,
  FileText,
  HandCoins,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ActiveHandPanel } from "./components/ActiveHandPanel";
import { BoardPanel } from "./components/BoardPanel";
import { CommandBar } from "./components/CommandBar";
import { LeaderReferenceModal } from "./components/LeaderReferenceModal";
import { MarketPanel } from "./components/MarketPanel";
import { PlayerColumn } from "./components/PlayerColumn";
import { RecentLogPanel } from "./components/RecentLogPanel";
import { TableSidebar } from "./components/TableSidebar";
import {
  addResources,
  boardSpaceIntrigueGainFor,
  boardSpaceSpiceGainFor,
  factionShortLabels,
  memoryCountLabel,
  pendingLocksTableState,
  resourceChoiceLabel,
  resources,
  revealGainLabel,
  revealPersuasionFor,
  selectedFactionChoice,
  shaddamSignetInfluenceFactions,
  tableStateLockedByPendingActions,
  tradeGoods,
  troopSupplyLabel,
  type ChangeAllegiancesSelection,
} from "./app-helpers";
import {
  canMoveCardToThroneRow,
  isBackedByChoamIntrigue,
  isBuyAccessIntrigue,
  isCallToArmsIntrigue,
  isChangeAllegiancesIntrigue,
  isContingencyPlanIntrigue,
  isCunningIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDepartForArrakisIntrigue,
  isDetonationIntrigue,
  isDevourIntrigue,
  isDistractionIntrigue,
  isFindWeaknessIntrigue,
  isGoToGroundIntrigue,
  isImperiumPoliticsIntrigue,
  isImpressIntrigue,
  isInspireAweIntrigue,
  isIntelligenceReportIntrigue,
  isLeverageIntrigue,
  isManipulateIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
  isOpportunismIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isShaddamsFavorIntrigue,
  isSietchRitualIntrigue,
  isSpecialMissionIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isStrategicStockpilingIntrigue,
  isTacticalOptionIntrigue,
  isUnexpectedAlliesIntrigue,
  isWeirdingCombatIntrigue,
} from "./game/card-identifiers";
import { conflictProtectedByShieldWall, criticalLocationNames } from "./game/critical-locations";
import { battleIconLabels, boardSpaces, factionLabels, iconLabels, teams } from "./game/data";
import {
  acquirableCardsForPending,
  acquireCardForPending,
  advanceSeat,
  acquireMarketCard,
  applyBoardEffect,
  applyCardAgentEffect,
  canPlaceSpyPost,
  canPlayDistractionPlotIntrigue,
  canPay,
  canPlaySpecialMissionPlaceSpy,
  changeAllegiancesGainChoices,
  changeAllegiancesLossChoices,
  collectChoamContractFallback,
  collectMakerSpice,
  combatIntrigueStrength,
  combatIntrigueTargets,
  conflictDeploymentBlockedFor,
  defaultActivatedAllyId,
  deployControlDefenseTroop,
  deployTroopToConflict,
  drawIntrigueCards,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  effectiveCost,
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
  finishEndgame,
  finishPendingAction,
  finishRevealTurn,
  finishRevealAdjustment as resolveRevealAdjustment,
  hasGainedSpiceThisTurn,
  hasDeployedThreeOrMoreUnitsThisTurn,
  iconCanReach,
  initialGame,
  influenceLossChoices,
  influenceLossPairChoices,
  influenceLossOptions,
  irulanSignetAcquireCards,
  irulanSignetTrashableCards,
  loseInfluenceForPending,
  manipulateAcquisitionCost,
  maybeStartCombatPhase,
  passCombatIntrigue,
  pendingActionForCard,
  pendingActionsForReveal,
  pendingActionForJessicaOtherMemories,
  pendingActionForReverendMotherJessicaRepeat,
  pendingActionForMakerChoice,
  pendingActionForSietchTabr,
  pendingActionsFor,
  pendingActionForSpace,
  playerTroopSupply,
  playCombatIntrigue,
  placeSpyForPending,
  placeableSpySpaces,
  queuePendingActions,
  recordTurnSpiceGain,
  recallableSpySpaces,
  recallableSpySupplySpaces,
  recallSpyForSupplyForPending,
  recallSpyForPending,
  reinforceTroop,
  moveImperiumCardToThroneRow,
  resolveConflictTie,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  canPayConflictVpConversion,
  adjustThreatenSpiceProductionContribution,
  conflictVpConversionSpyChoices,
  playerHasConflictUnits,
  payConflictVpConversion,
  setMakerHooks,
  setShieldWall,
  setAllianceOwner,
  setChoamContractCompleted,
  playBackedByChoamPlotIntrigue,
  playBuyAccessPlotIntrigue,
  playCallToArmsPlotIntrigue,
  playChangeAllegiancesPlotIntrigue,
  playContingencyPlanPlotIntrigue,
  playCunningPlotIntrigue,
  playCouncilorsAmbitionPlotIntrigue,
  playDepartForArrakisPlotIntrigue,
  playDetonationIntrigue,
  playDistractionPlotIntrigue,
  playImperiumPoliticsPlotIntrigue,
  playInspireAwePlotIntrigue,
  playIntelligenceReportPlotIntrigue,
  playLeveragePlotIntrigue,
  playManipulatePlotIntrigue,
  playMarketOpportunityPlotIntrigue,
  playMercenariesPlotIntrigue,
  playOpportunismPlotIntrigue,
  playPlotBattleIconIntrigue,
  playShaddamsFavorPlotIntrigue,
  playSietchRitualPlotIntrigue,
  playSpecialMissionPlotIntrigue,
  playStrategicStockpilingPlotIntrigue,
  playUnexpectedAlliesIntrigue,
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
  resolveLocationControlIncome,
  resolveLeaderInfluenceThresholdRewards,
  resolveSietchTabrChoice,
  resolveShaddamSignetRingChoice,
  resolveStabanSmuggleSpice,
  resolveStabanUnseenNetworkChoice,
  scoreGurneyAlwaysSmiling,
  resolveThreatenSpiceProductionChoice,
  imperiumPoliticsFactionChoices,
  sietchRitualFactionChoices,
  specialMissionCitySpySpaces,
  specialMissionRecallSpySpaces,
  spyPostCount,
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
  trashableCardsForPending,
  trashPlayerCard,
  transferTradeGood,
  threatenSpiceProductionContributionTotal,
  updateTradeSelection,
  buyAccessPairChoices,
} from "./game/state";
import type {
  BoardSpace,
  Card,
  FactionId,
  GameState,
  PendingAction,
  Player,
  ResourceId,
  Resources,
  TradeGoodId,
  TrashCardZone,
} from "./game/types";
import type { BuyAccessChoice, ChangeAllegiancesChoice, CombatIntrigueChoice, ImperiumPoliticsChoice, InfluenceLossPair, IrulanSignetRingChoice, JessicaOtherMemoriesChoice, JessicaReverendMotherChoice, JessicaSpiceAgonyChoice, JessicaWaterOfLifeChoice, LadyAmberDesertScoutsChoice, ShaddamSignetRingChoice, SietchRitualChoice, SpecialMissionChoice, StabanUnseenNetworkChoice } from "./game/state";

export {
  boardSpaceIntrigueGainFor,
  pendingLocksTableState,
  revealPersuasionFor,
  tableStateLockedByPendingActions,
} from "./app-helpers";

declare global {
  interface Window {
    __DUNE_DEBUG__?: {
      getGame: () => GameState;
      setGame: (game: GameState) => void;
    };
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
    window.__DUNE_DEBUG__ = {
      getGame: () => game,
      setGame: (nextGame) => setGame(nextGame),
    };
    return () => {
      delete window.__DUNE_DEBUG__;
    };
  }, [game]);

  const activePlayer = game.players[game.activeSeat];
  const activeAllies = game.players.filter((player) => player.team === activePlayer.team && player.role === "Ally");
  function activatedAllyIdFor(player: Player, players: Player[]) {
    if (player.role !== "Commander") return player.id;
    if (player.revealed && player.revealActivatedAllyId) return player.revealActivatedAllyId;
    return commanderTargets[player.id] ?? defaultActivatedAllyId(player, players);
  }
  const activatedAlly =
    activePlayer.role === "Commander"
      ? activeAllies.find((player) => player.id === activatedAllyIdFor(activePlayer, game.players)) ?? activeAllies[0]
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
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const targetId =
        player.role === "Commander"
          ? activatedAllyIdFor(player, current.players)
          : player.id;
      const target = current.players.find((candidate) => candidate.id === targetId) ?? player;
      const hand = player.hand.filter((card) => card.id !== selectedCard.id);
      const playArea = selectedCard.trashOnPlay ? player.playArea : [...player.playArea, selectedCard];
      const cost = effectiveCost(selectedSpace, current.players);
      const makerBonus = selectedSpace.maker ? current.makerSpice[selectedSpace.id] ?? 0 : 0;
      const makerChoiceOwner = player.role === "Commander" ? target : player;
      const makerChoicePending = pendingActionForMakerChoice(current, selectedSpace, makerChoiceOwner, player);
      const spiceGain = boardSpaceSpiceGainFor(selectedSpace, player, makerBonus, Boolean(makerChoicePending));
      const sietchTabrPending = pendingActionForSietchTabr(current, selectedSpace, makerChoiceOwner, player);
      let { source, target: effectedTarget } = applyBoardEffect(
        {
          ...player,
          hand,
          playArea,
          agentsReady: player.agentsReady - 1,
        },
        target,
        selectedSpace,
        cost,
        makerBonus,
        Boolean(makerChoicePending),
      );
      const cardAgentEffect = applyCardAgentEffect(
        selectedCard,
        source,
        player.role === "Commander" ? effectedTarget : source,
        current,
      );
      source = cardAgentEffect.source;
      effectedTarget = cardAgentEffect.target;
      let players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) return source;
        if (candidate.id === effectedTarget.id) return effectedTarget;
        return candidate;
      });
      let deploymentOwner = player.role === "Commander" ? effectedTarget : source;
      const conflictDeploymentBlock = cardAgentEffect.blocksDeploymentsThisTurn
        ? { actorId: source.id, ownerId: deploymentOwner.id, source: selectedCard.name }
        : undefined;
      const controlledPostEffectState = resolveLocationControlIncome(
        { ...current, players, conflictDeploymentBlock },
        selectedSpace,
      );
      players = controlledPostEffectState.players;
      source = players.find((candidate) => candidate.id === source.id) ?? source;
      effectedTarget = players.find((candidate) => candidate.id === effectedTarget.id) ?? effectedTarget;
      deploymentOwner = player.role === "Commander" ? effectedTarget : source;
      const postEffectState = { ...controlledPostEffectState, players, conflictDeploymentBlock };
      const spacePending = sietchTabrPending
        ? undefined
        : pendingActionForSpace(
          selectedSpace,
          source,
          deploymentOwner,
          players,
          cardAgentEffect.recruitedTroops,
          Boolean(cardAgentEffect.blocksDeploymentsThisTurn),
        );
      const cardPending = pendingActionForCard(
        selectedCard,
        source,
        postEffectState,
        deploymentOwner,
        selectedSpace,
      );
      const jessicaOtherMemoriesPending = pendingActionForJessicaOtherMemories(source, selectedSpace);
      const jessicaRepeatDeferredWater = cardPending?.kind === "jessica-water-of-life" ? 1 : 0;
      const jessicaReverendMotherPending = pendingActionForReverendMotherJessicaRepeat(
        current,
        source,
        selectedSpace,
        jessicaRepeatDeferredWater,
      );
      const prioritizedCardPending =
        cardPending?.kind === "jessica-spice-agony" || cardPending?.kind === "jessica-water-of-life"
          ? cardPending
          : undefined;
      const pendingActions = prioritizedCardPending || jessicaOtherMemoriesPending || jessicaReverendMotherPending
        ? [
            ...[prioritizedCardPending, jessicaOtherMemoriesPending, jessicaReverendMotherPending].filter((action): action is PendingAction => Boolean(action)),
            ...pendingActionsFor(spacePending, prioritizedCardPending ? undefined : cardPending, source.spies),
          ]
        : pendingActionsFor(spacePending, cardPending, source.spies);
      if (sietchTabrPending) {
        const sietchAction = {
          ...sietchTabrPending,
          ...(cardAgentEffect.recruitedTroops ? { extraRecruitedTroops: cardAgentEffect.recruitedTroops } : {}),
          ...(cardAgentEffect.blocksDeploymentsThisTurn ? { conflictBlocked: true } : {}),
        };
        pendingActions.unshift(
          sietchAction,
        );
      }
      if (makerChoicePending) pendingActions.unshift(makerChoicePending);
      const pending = queuePendingActions(
        controlledPostEffectState,
        pendingActions,
      );
      const nextState: GameState = {
        ...controlledPostEffectState,
        agentTurnComplete: true,
        players,
        spaces: { ...current.spaces, [selectedSpace.id]: target.id },
        makerSpice: collectMakerSpice(current, selectedSpace),
        swordmasterClaimed: current.swordmasterClaimed || selectedSpace.id === "swordmaster",
        conflictDeploymentBlock,
        ...pending,
        log: [
          selectedCard.trashOnPlay
            ? `${player.leader} trashes ${selectedCard.name}.`
            : undefined,
          makerBonus > 0
            ? `${player.leader} collects ${makerBonus} bonus spice from ${selectedSpace.name}.`
            : undefined,
          cardAgentEffect.log,
          player.role === "Commander"
            ? `${player.leader} activates ${target.leader} at ${selectedSpace.name} with ${selectedCard.name}.`
            : `${player.leader} sends an Agent to ${selectedSpace.name} with ${selectedCard.name}.`,
          ...controlledPostEffectState.log,
        ].filter((entry): entry is string => Boolean(entry)),
      };
      const intrigueGain = boardSpaceIntrigueGainFor(selectedSpace, player);
      const influenceThresholdState = resolveLeaderInfluenceThresholdRewards(nextState, current.players);
      const intrigueState = intrigueGain > 0
        ? drawIntrigueCards(influenceThresholdState, source.id, intrigueGain, selectedSpace.name)
        : influenceThresholdState;
      // Commanders send the Agent; activated Allies only receive routed board effects.
      const resolvedState = resolveStabanSmuggleSpice(intrigueState, player.id, selectedSpace.id);
      const totalSpiceGain = spiceGain + (cardAgentEffect.sourceSpiceGained ?? 0);
      return totalSpiceGain > 0 ? recordTurnSpiceGain(resolvedState, source.id, totalSpiceGain) : resolvedState;
    });
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
    const persuasion = revealPersuasionFor(activePlayer);
    const swords = activePlayer.hand.reduce((sum, card) => sum + card.swords, 0) + (activePlayer.swordmasterBonus ? 2 : 0);
    const revealGain = activePlayer.hand.reduce<Partial<Resources>>((gain, card) => {
      Object.entries(card.revealGain ?? {}).forEach(([resource, amount]) => {
        gain[resource as ResourceId] = (gain[resource as ResourceId] ?? 0) + (amount ?? 0);
      });
      return gain;
    }, {});
    const printedRevealCards = activePlayer.hand
      .filter((card) => card.conditionalPersuasion || card.conditionalSwords)
      .map((card) => card.name);
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const targetId =
        player.role === "Commander"
          ? activatedAllyIdFor(player, current.players)
          : player.id;
      const target = current.players.find((candidate) => candidate.id === targetId);
      const combatRecipient = player.role === "Commander" ? target : player;
      const combatSwords = combatRecipient && playerHasConflictUnits(combatRecipient) ? swords : 0;
      const players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) {
          return {
            ...candidate,
            revealed: true,
            agentsReady: 0,
            resources: addResources(candidate.resources, revealGain),
            persuasion,
            revealActivatedAllyId: candidate.role === "Commander" ? target?.id : undefined,
            conflict: candidate.role === "Commander" ? candidate.conflict : candidate.conflict + combatSwords,
            playArea: [...candidate.playArea, ...candidate.hand],
            hand: [],
          };
        }
        if (candidate.id === targetId && player.role === "Commander") {
          return { ...candidate, conflict: candidate.conflict + combatSwords };
        }
        return candidate;
      });
      const postRevealState = { ...current, players };
      const revealedPlayer = players[current.activeSeat];
      const pending = queuePendingActions(
        current,
        pendingActionsForReveal(
          revealedPlayer,
          postRevealState,
          player.hand,
          player.role === "Commander" ? targetId : player.id,
        ),
      );
      const revealedState: GameState = {
        ...current,
        conflictDeploymentBlock: undefined,
        players,
        ...pending,
        log: [
          ...(
            printedRevealCards.length > 0
              ? [`Resolve printed reveal text for ${printedRevealCards.join(", ")} before finalizing rewards.`]
              : []
          ),
          player.role === "Commander"
            ? `${player.leader} reveals for ${persuasion} persuasion${revealGainLabel(revealGain)} and gives ${combatSwords} strength to ${target?.leader ?? "an Ally"}.`
            : `${player.leader} reveals for ${persuasion} persuasion, ${combatSwords} strength${revealGainLabel(revealGain)}.`,
          ...current.log,
        ],
      };
      const spiceTrackedState = (revealGain.spice ?? 0) > 0
        ? recordTurnSpiceGain(revealedState, player.id, revealGain.spice ?? 0)
        : revealedState;
      return scoreGurneyAlwaysSmiling(spiceTrackedState, player.id);
    });
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
          ? activatedAllyIdFor(buyer, current.players)
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
      const recruitOwnerId = owner?.role === "Commander" ? activatedAllyIdFor(owner, current.players) : undefined;
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

  function scorePlotIntrigue(intrigueId: string) {
    setGame((current) => playPlotBattleIconIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playContingencyPlanPlot(intrigueId: string) {
    setGame((current) => playContingencyPlanPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playCallToArmsPlot(intrigueId: string) {
    setGame((current) => playCallToArmsPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playIntelligenceReportPlot(intrigueId: string) {
    setGame((current) => playIntelligenceReportPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playInspireAwePlot(intrigueId: string) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const sandwormOwnerId = player.role === "Commander" ? activatedAllyIdFor(player, current.players) : undefined;
      return playInspireAwePlotIntrigue(current, player.id, intrigueId, sandwormOwnerId);
    });
  }

  function playManipulatePlot(intrigueId: string, cardId: string) {
    setGame((current) => playManipulatePlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, cardId));
  }

  function playLeveragePlot(intrigueId: string) {
    setGame((current) => playLeveragePlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playDistractionPlot(intrigueId: string) {
    setGame((current) => playDistractionPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playCunningPlot(intrigueId: string, choice: "draw" | "paid-trash") {
    setGame((current) => playCunningPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, choice));
  }

  function playSietchRitualPlot(intrigueId: string, discardCardId: string, faction: SietchRitualChoice) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const personalFaction = player.role === "Commander" && player.team === "muaddib" ? "fremen" : undefined;
      const influenceOwnerId = player.role === "Commander" && faction !== personalFaction
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playSietchRitualPlotIntrigue(current, player.id, intrigueId, discardCardId, faction, influenceOwnerId);
    });
  }

  function updateChangeAllegiancesSelection(intrigueId: string, selection: ChangeAllegiancesSelection) {
    setChangeAllegiancesSelections((current) => ({
      ...current,
      [intrigueId]: { ...current[intrigueId], ...selection },
    }));
  }

  function playChangeAllegiancesPlot(intrigueId: string, choice: ChangeAllegiancesChoice) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const influenceOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playChangeAllegiancesPlotIntrigue(current, player.id, intrigueId, choice, influenceOwnerId);
    });
  }

  function playSpecialMissionPlot(intrigueId: string, choice: SpecialMissionChoice) {
    setGame((current) => playSpecialMissionPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, choice));
  }

  function playOpportunismPlot(intrigueId: string, choice: InfluenceLossPair) {
    setGame((current) => playOpportunismPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, choice));
  }

  function playImperiumPoliticsPlot(intrigueId: string, faction: ImperiumPoliticsChoice) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const influenceOwnerId = player.role === "Commander" && faction !== "emperor"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playImperiumPoliticsPlotIntrigue(current, player.id, intrigueId, faction, influenceOwnerId);
    });
  }

  function playBuyAccessPlot(intrigueId: string, choice: BuyAccessChoice) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const influenceOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playBuyAccessPlotIntrigue(current, player.id, intrigueId, choice, influenceOwnerId);
    });
  }

  function playDepartForArrakisPlot(intrigueId: string, choice: "draw" | "spend-spice") {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const troopOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playDepartForArrakisPlotIntrigue(current, player.id, intrigueId, choice, troopOwnerId);
    });
  }

  function playCouncilorsAmbitionPlot(intrigueId: string) {
    setGame((current) => playCouncilorsAmbitionPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId));
  }

  function playStrategicStockpilingPlot(intrigueId: string, choice: "spice" | "water" | "both") {
    setGame((current) =>
      playStrategicStockpilingPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, choice),
    );
  }

  function playShaddamsFavorPlot(intrigueId: string) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const troopOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playShaddamsFavorPlotIntrigue(current, player.id, intrigueId, troopOwnerId);
    });
  }

  function playMarketOpportunityPlot(intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") {
    setGame((current) => playMarketOpportunityPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, choice));
  }

  function playMercenariesPlot(intrigueId: string) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const troopOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playMercenariesPlotIntrigue(current, player.id, intrigueId, troopOwnerId);
    });
  }

  function playBackedByChoamPlot(intrigueId: string, faction: FactionId) {
    setGame((current) => playBackedByChoamPlotIntrigue(current, current.players[current.activeSeat].id, intrigueId, faction));
  }

  function playDetonation(intrigueId: string, choice: "shield-wall" | "deploy") {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const deployOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      return playDetonationIntrigue(current, player.id, intrigueId, choice, deployOwnerId);
    });
  }

  function playUnexpectedAllies(intrigueId: string, removeShieldWall: boolean) {
    setGame((current) => {
      const player = current.players[current.activeSeat];
      const sandwormOwnerId = player.role === "Commander"
        ? activatedAllyIdFor(player, current.players)
        : undefined;
      const resolved = playUnexpectedAlliesIntrigue(current, player.id, intrigueId, removeShieldWall, sandwormOwnerId);
      return scoreGurneyAlwaysSmiling(resolved, player.id);
    });
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
  const pendingOwner = pendingAction?.kind === "deploy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingControlDefenseOwner =
    pendingAction?.kind === "control-defense" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingControlDefenseSupply = pendingControlDefenseOwner ? playerTroopSupply(pendingControlDefenseOwner) : 0;
  const pendingActor = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.actorId) : undefined;
  const pendingPartner = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.partnerId) : undefined;
  const pendingSpyOwner = pendingAction?.kind === "spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingContractOwner =
    pendingAction?.kind === "contract" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingAcquireOwner =
    pendingAction?.kind === "acquire-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingAcquireCards = pendingAction?.kind === "acquire-card" ? acquirableCardsForPending(game, pendingAction) : [];
  const pendingMakerOwner =
    pendingAction?.kind === "maker-choice" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingMakerSpiceOwner =
    pendingAction?.kind === "maker-choice" ? game.players.find((player) => player.id === pendingAction.spiceOwnerId) : undefined;
  const pendingMakerCanSummon =
    pendingAction?.kind === "maker-choice" ? pendingAction.canSummonSandworms : false;
  const pendingMakerSplit =
    pendingAction?.kind === "maker-choice" &&
    pendingMakerOwner &&
    pendingMakerSpiceOwner &&
    pendingMakerOwner.id !== pendingMakerSpiceOwner.id;
  const pendingMakerLabel = pendingMakerSplit
    ? `${pendingMakerSpiceOwner.leader} spice / ${pendingMakerOwner.leader} worms`
    : pendingMakerOwner?.leader;
  const pendingSietchOwner =
    pendingAction?.kind === "sietch-tabr" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingSietchWaterOwner =
    pendingAction?.kind === "sietch-tabr" ? game.players.find((player) => player.id === pendingAction.waterOwnerId) : undefined;
  const pendingSietchSplit =
    pendingAction?.kind === "sietch-tabr" &&
    pendingSietchOwner &&
    pendingSietchWaterOwner &&
    pendingSietchOwner.id !== pendingSietchWaterOwner.id;
  const pendingSietchLabel = pendingSietchSplit
    ? `${pendingSietchWaterOwner.leader} water / ${pendingSietchOwner.leader} units`
    : pendingSietchOwner?.leader;
  const pendingResourceSplitCommander =
    pendingAction?.kind === "commander-resource-split"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingResourceSplitAlly =
    pendingAction?.kind === "commander-resource-split"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingShaddamSignetCommander =
    pendingAction?.kind === "shaddam-signet-ring"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingShaddamSignetAlly =
    pendingAction?.kind === "shaddam-signet-ring"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingCommandRespectCommander =
    pendingAction?.kind === "command-respect"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingCommandRespectPartners =
    pendingAction?.kind === "command-respect"
      ? pendingAction.partnerIds
          .map((partnerId) => game.players.find((player) => player.id === partnerId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const pendingDemandResultsCommander =
    pendingAction?.kind === "demand-results"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDemandResultsAllies =
    pendingAction?.kind === "demand-results"
      ? pendingAction.allyIds.map((allyId) => game.players.find((player) => player.id === allyId))
      : [];
  const pendingDemandResultsContracts =
    pendingAction?.kind === "demand-results"
      ? pendingAction.contractIds.map((contractId) => game.contractOffer.find((contract) => contract.id === contractId))
      : [];
  const pendingCorrinoMightCommander =
    pendingAction?.kind === "corrino-might"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingCorrinoMightAllies =
    pendingAction?.kind === "corrino-might"
      ? pendingAction.allyIds.map((allyId) => game.players.find((player) => player.id === allyId))
      : [];
  const pendingDemandAttentionCommander =
    pendingAction?.kind === "demand-attention"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDemandAttentionRecipient =
    pendingAction?.kind === "demand-attention"
      ? game.players.find((player) => player.id === pendingAction.recipientId)
      : undefined;
  const pendingDesertCallCommander =
    pendingAction?.kind === "desert-call"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDesertCallAlly =
    pendingAction?.kind === "desert-call"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingThreatenSpiceCommander =
    pendingAction?.kind === "threaten-spice-production"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingThreatenSpiceContributors =
    pendingAction?.kind === "threaten-spice-production"
      ? pendingAction.contributorIds
          .map((contributorId) => game.players.find((player) => player.id === contributorId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const pendingThreatenSpiceTotal =
    pendingAction?.kind === "threaten-spice-production"
      ? threatenSpiceProductionContributionTotal(pendingAction)
      : 0;
  const pendingThreatenSpiceCanPay =
    pendingAction?.kind === "threaten-spice-production" &&
    pendingThreatenSpiceContributors.length === pendingAction.contributorIds.length &&
    pendingThreatenSpiceTotal === pendingAction.cost &&
    pendingThreatenSpiceContributors.every(
      (contributor) => (pendingAction.contributions[contributor.id] ?? 0) <= contributor.resources.spice,
    );
  const pendingThroneOwner =
    pendingAction?.kind === "throne-row" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashOwner =
    pendingAction?.kind === "trash-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashChoices =
    pendingAction?.kind === "trash-card" && pendingTrashOwner
      ? trashableCardsForPending(pendingTrashOwner, pendingAction)
      : [];
  const pendingIrulanSignetOwner =
    pendingAction?.kind === "irulan-signet-ring" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingIrulanSignetAcquireCards =
    pendingAction?.kind === "irulan-signet-ring" ? irulanSignetAcquireCards(game, pendingAction) : [];
  const pendingIrulanSignetTrashChoices =
    pendingAction?.kind === "irulan-signet-ring" ? irulanSignetTrashableCards(game, pendingAction) : [];
  const pendingStabanUnseenNetworkOwner =
    pendingAction?.kind === "staban-unseen-network" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingStabanUnseenNetworkSpace =
    pendingAction?.kind === "staban-unseen-network" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingLadyAmberDesertScoutsOwner =
    pendingAction?.kind === "amber-desert-scouts" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaSpiceAgonyOwner =
    pendingAction?.kind === "jessica-spice-agony" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaWaterOfLifeOwner =
    pendingAction?.kind === "jessica-water-of-life" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaReverendMotherOwner =
    pendingAction?.kind === "jessica-reverend-mother" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaReverendMotherSpace =
    pendingAction?.kind === "jessica-reverend-mother" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingJessicaOtherMemoriesOwner =
    pendingAction?.kind === "jessica-other-memories" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingConflictVpOwner =
    pendingAction?.kind === "conflict-vp-conversion" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingConflictVpCanPay =
    pendingAction?.kind === "conflict-vp-conversion" ? canPayConflictVpConversion(game, pendingAction) : false;
  const pendingConflictVpSpyChoices =
    pendingAction?.kind === "conflict-vp-conversion" ? conflictVpConversionSpyChoices(game, pendingAction) : [];
  const pendingRecallSpyOwner =
    pendingAction?.kind === "recall-spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingRecallSpyRecipient =
    pendingAction?.kind === "recall-spy"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingRecallSpyChoices = pendingAction?.kind === "recall-spy" ? recallableSpySpaces(game, pendingAction) : [];
  const pendingInfluenceOwner =
    pendingAction?.kind === "lose-influence" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingInfluenceRecipient =
    pendingAction?.kind === "lose-influence"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingInfluenceChoices = pendingAction?.kind === "lose-influence" ? influenceLossOptions(game, pendingAction) : [];
  const pendingInfluenceChoiceOwnerIds = [...new Set(pendingInfluenceChoices.map((choice) => choice.ownerId))];
  const pendingInfluenceChoiceOwners = pendingInfluenceChoiceOwnerIds
    .map((ownerId) => game.players.find((player) => player.id === ownerId))
    .filter((player): player is Player => Boolean(player));
  const pendingInfluencePayerLabel =
    pendingInfluenceChoiceOwners.length > 0
      ? pendingInfluenceChoiceOwners.map((owner) => owner.leader).join(" or ")
      : pendingInfluenceOwner?.leader;
  const reservedContractChoices =
    pendingContractOwner && pendingAction?.kind === "contract" && !pendingAction.publicOnly
      ? pendingContractOwner.reservedContracts
      : [];
  const revealAdjustOwner =
    pendingAction?.kind === "reveal-adjust" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const revealAdjustRecipient =
    pendingAction?.kind === "reveal-adjust"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const combatActor = game.phase === "combat" ? game.players[game.activeSeat] : undefined;
  const combatTargets = combatActor
    ? combatIntrigueTargets(game, combatActor.id)
        .map((playerId) => game.players.find((player) => player.id === playerId))
        .filter((player): player is Player => Boolean(player))
    : [];
  const combatCards =
    combatActor?.intrigues.filter((card) =>
      card.combatSwords ||
      combatIntrigueStrength(game, combatActor, card) ||
      isDevourIntrigue(card) ||
      isGoToGroundIntrigue(card) ||
      isReachAgreementIntrigue(card)
    ) ?? [];
  const tradePartners =
    pendingActor && pendingAction?.kind === "trade"
      ? game.players.filter((player) =>
          player.team === pendingActor.team &&
          player.id !== pendingActor.id &&
          (!pendingAction.partnerLocked || player.id === pendingAction.partnerId)
        )
      : [];
  const tradeLocked = pendingAction?.kind === "trade" && pendingAction.actorGiven + pendingAction.partnerGiven > 0;
  const reinforceAllies =
    pendingAction?.kind === "reinforce"
      ? game.players.filter((player) => player.team === pendingAction.team && player.role === "Ally")
      : [];
  const conflictTieAllies =
    pendingAction?.kind === "conflict-tie"
      ? game.players.filter((player) => pendingAction.tiedPlayerIds.includes(player.id))
      : [];
  const endgameChoices = endgameBattleIconChoices(game);
  const conditionalEndgameChoices = endgameConditionalIntrigueChoices(game);
  const hasEndgameChoices = endgameChoices.length + conditionalEndgameChoices.length > 0;
  const playingPhase = game.phase === "playing";
  const pendingLocked = Boolean(game.pendingAction) || game.pendingQueue.length > 0;
  const plotIntrigueLocked = !playingPhase || pendingLocked;
  const detonationDeployOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const unexpectedAlliesOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const detonationDeploymentBlocked = conflictDeploymentBlockedFor(game, activePlayer.id, detonationDeployOwner.id);
  const unexpectedAlliesDeploymentBlocked = conflictDeploymentBlockedFor(game, activePlayer.id, unexpectedAlliesOwner.id);
  const shaddamsFavorOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const mercenariesOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const departForArrakisOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const imperiumPoliticsOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const currentConflictProtected = conflictProtectedByShieldWall(game.conflict);
  const unexpectedAlliesCanPay = activePlayer.resources.water >= 2;
  const unexpectedAlliesBlockedByShieldWall = Boolean(game.conflict && game.shieldWall && currentConflictProtected);
  const unexpectedAlliesCanSummonWithoutWall = Boolean(game.conflict && (!game.shieldWall || !currentConflictProtected));
  const unexpectedAlliesDisabled =
    plotIntrigueLocked || !game.conflict || !unexpectedAlliesCanPay || unexpectedAlliesDeploymentBlocked;
  const spyPlacementSpaces = pendingAction?.kind === "spy" ? placeableSpySpaces(game, pendingAction) : [];
  const pendingSpySupplyRecallSpaces = pendingAction?.kind === "spy"
    ? recallableSpySupplySpaces(game, pendingAction)
    : [];

  return (
    <main className="app-shell">
      <CommandBar activePlayer={activePlayer} game={game} onResetGame={resetGame} />

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
          <div className="pending-panel combat-panel">
            <div>
              <p className="eyebrow">Combat Intrigues</p>
              <h2>{combatActor.leader}</h2>
            </div>
            <div className="pending-controls support-grid combat-grid">
              {combatCards.map((card) => {
                const devourCard = isDevourIntrigue(card);
                const findWeaknessCard = isFindWeaknessIntrigue(card);
                const goToGroundCard = isGoToGroundIntrigue(card);
                const impressCard = isImpressIntrigue(card);
                const questionableMethodsCard = isQuestionableMethodsIntrigue(card);
                const reachAgreementCard = isReachAgreementIntrigue(card);
                const spiceIsPowerCard = isSpiceIsPowerIntrigue(card);
                const springTheTrapCard = isSpringTheTrapIntrigue(card);
                const tacticalOptionCard = isTacticalOptionIntrigue(card);
                const automatedStrength = combatIntrigueStrength(game, combatActor, card);
                const hasSpiceIsPowerBranch = combatTargets.some(
                  (target) => target.resources.spice >= 3 || target.deployedTroops >= 3,
                );
                const canAutoResolve = Boolean(
                  automatedStrength || devourCard || findWeaknessCard || (spiceIsPowerCard && hasSpiceIsPowerBranch),
                );
                return (
                  <div className="support-target combat-target" key={card.id}>
                    <strong>{card.name}</strong>
                    <span
                      title={
                        questionableMethodsCard
                          ? "Add 1 strength; the recipient may lose Influence, or a Commander may lose personal Influence, for 4 more strength."
                        : goToGroundCard
                          ? "Retreat 1 or 2 troops from the chosen recipient, then optionally place a spy for that recipient."
                        : reachAgreementCard
                          ? "Retreat 1 or 2 troops from the chosen recipient, then take a CHOAM contract for that recipient."
                        : impressCard
                          ? "Add 2 strength to the chosen recipient; that recipient acquires a card that costs 3 or less."
                        : spiceIsPowerCard
                            ? "Choose one branch: retreat 3 of the recipient's troops for 3 spice, or spend 3 spice for 6 strength."
                          : tacticalOptionCard
                            ? "Choose either 2 strength or a troop count to retreat from the chosen recipient."
                          : undefined
                      }
                    >
                      <Swords size={14} />
                      {findWeaknessCard
                        ? "+2 / recall spy for +3"
                        : questionableMethodsCard
                          ? "+1 / lose Ally/Cmdr personal Inf. for +4"
                        : goToGroundCard
                          ? "Retreat 1-2 troops / optional spy"
                        : reachAgreementCard
                          ? "Retreat 1-2 troops / take contract"
                        : impressCard
                          ? "+2 strength / acquire <=3"
                        : spiceIsPowerCard
                          ? "Retreat 3 for +3 spice / spend 3 for +6"
                        : springTheTrapCard
                          ? "Recall 2 spies for +7"
                        : tacticalOptionCard
                          ? "+2 strength OR retreat troops"
                        : devourCard && !automatedStrength
                        ? "+2 / +4 with worm"
                        : isBackedByChoamIntrigue(card) && !automatedStrength
                        ? "2+ completed contracts"
                        : `+${automatedStrength ?? card.combatSwords} strength`}
                    </span>
                    {impressCard
                      ? combatTargets.map((target) => (
                          <button
                            type="button"
                            key={target.id}
                            onClick={() => playCombatCard(card.id, target.id)}
                            title={`Add 2 strength to ${target.leader}; ${target.leader} acquires a card that costs 3 or less`}
                          >
                            {combatActor.role === "Commander" ? `${target.leader}: +2 + acquire` : "+2 + acquire"}
                          </button>
                        ))
                    : goToGroundCard
                      ? combatTargets.length > 0
                        ? combatTargets.map((target) => (
                            <Fragment key={target.id}>
                              {target.deployedTroops > 0
                                ? Array.from({ length: Math.min(2, target.deployedTroops) }, (_, index) => index + 1).map((count) => {
                                    const targetCanPlaceSpy = target.spies > 0 && boardSpaces.some((space) => canPlaceSpyPost(game, space, target));
                                    return (
                                      <button
                                        type="button"
                                        key={`${target.id}-ground-retreat-${count}`}
                                        onClick={() => playCombatCard(card.id, target.id, { kind: "retreat-troops", count })}
                                        title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}${targetCanPlaceSpy ? ", then optionally place a spy" : ""}`}
                                      >
                                        {combatActor.role === "Commander"
                                          ? `${target.leader}: retreat ${count}${targetCanPlaceSpy ? " + spy" : ""}`
                                          : `Retreat ${count}${targetCanPlaceSpy ? " + spy" : ""}`}
                                      </button>
                                    );
                                  })
                                : (
                                    <span>
                                      {combatActor.role === "Commander"
                                        ? `${target.leader}: requires deployed troops.`
                                        : "Requires 1 or 2 deployed troops."}
                                    </span>
                                  )}
                            </Fragment>
                          ))
                        : <span>Requires 1 or 2 deployed troops.</span>
                    : reachAgreementCard
                      ? combatTargets.length > 0
                        ? combatTargets.map((target) => (
                            <Fragment key={target.id}>
                              {target.deployedTroops > 0
                                ? Array.from({ length: Math.min(2, target.deployedTroops) }, (_, index) => index + 1).map((count) => (
                                    <button
                                      type="button"
                                      key={`${target.id}-contract-retreat-${count}`}
                                      onClick={() => playCombatCard(card.id, target.id, { kind: "retreat-troops", count })}
                                      title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}, then take a CHOAM contract`}
                                    >
                                      {combatActor.role === "Commander"
                                        ? `${target.leader}: retreat ${count} + contract`
                                        : `Retreat ${count} + contract`}
                                    </button>
                                  ))
                                : (
                                    <span>
                                      {combatActor.role === "Commander"
                                        ? `${target.leader}: requires deployed troops.`
                                        : "Requires 1 or 2 deployed troops."}
                                    </span>
                                  )}
                            </Fragment>
                          ))
                        : <span>Requires 1 or 2 deployed troops.</span>
                    : tacticalOptionCard
                      ? combatTargets.map((target) => (
                          <Fragment key={target.id}>
                            <button
                              type="button"
                              onClick={() => playCombatCard(card.id, target.id, "add-strength")}
                              title={`Play ${card.name} for ${target.leader}`}
                            >
                              {combatActor.role === "Commander" ? `${target.leader}: +2` : "Add +2"}
                            </button>
                            {Array.from({ length: target.deployedTroops }, (_, index) => index + 1).map((count) => (
                              <button
                                type="button"
                                key={`${target.id}-retreat-${count}`}
                                onClick={() => playCombatCard(card.id, target.id, { kind: "retreat-troops", count })}
                                title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}`}
                              >
                                {combatActor.role === "Commander" ? `${target.leader}: retreat ${count}` : `Retreat ${count}`}
                              </button>
                            ))}
                          </Fragment>
                        ))
                    : spiceIsPowerCard
                      ? hasSpiceIsPowerBranch
                        ? combatTargets.map((target) => (
                            <Fragment key={target.id}>
                              {target.resources.spice >= 3 && (
                                <button
                                  type="button"
                                  onClick={() => playCombatCard(card.id, target.id, "spend-spice")}
                                  title={`Spend 3 spice from ${target.leader} for 6 strength`}
                                >
                                  {combatActor.role === "Commander" ? `${target.leader}: spend 3 (+6)` : "Spend 3 spice (+6)"}
                                </button>
                              )}
                              {target.deployedTroops >= 3 && (
                                <button
                                  type="button"
                                  onClick={() => playCombatCard(card.id, target.id, "retreat-troops")}
                                  title={`Retreat 3 troops from ${target.leader} to gain 3 spice`}
                                >
                                  {combatActor.role === "Commander" ? `${target.leader}: retreat 3` : "Retreat 3 troops (+3 spice)"}
                                </button>
                              )}
                            </Fragment>
                          ))
                        : <span>Requires 3 spice or 3 deployed troops.</span>
                    : canAutoResolve
                      ? combatTargets.map((target) => {
                          const targetStrength = combatIntrigueStrength(game, combatActor, card, target);
                          if (!targetStrength) return null;
                          return (
                            <button
                              type="button"
                              key={target.id}
                              onClick={() => playCombatCard(card.id, target.id)}
                              title={`Play ${card.name} for ${target.leader}`}
                            >
                              {combatActor.role === "Commander"
                                ? `${target.leader}${devourCard || findWeaknessCard || questionableMethodsCard || springTheTrapCard ? ` (+${targetStrength})` : ""}`
                                : "Play"}
                            </button>
                          );
                        })
                      : <span>
                          {isBackedByChoamIntrigue(card)
                            ? "Requires 2 completed contracts."
                            : springTheTrapCard
                              ? "Requires 2 own spy posts."
                              : "Resolve printed card text."}
                        </span>}
                  </div>
                );
              })}
              {combatCards.length === 0 && <span>No structured Combat Intrigues.</span>}
              <button className="combat-pass" type="button" onClick={passCombatCard}>
                Pass
              </button>
            </div>
          </div>
        )}

        {(game.phase === "endgame" || game.phase === "finished") && (
          <div className="pending-panel endgame-panel">
            <div>
              <p className="eyebrow">{game.phase === "finished" ? "Final result" : "Endgame"}</p>
              <h2>{game.phase === "finished" ? "Team Scores Locked" : game.endgameReason}</h2>
            </div>
            {game.phase === "endgame" && (
              <div className="pending-controls support-grid">
                {endgameChoices.map((choice) => {
                  const owner = game.players.find((player) => player.id === choice.playerId);
                  const intrigue = owner?.intrigues.find((card) => card.id === choice.intrigueId);
                  const conflict = owner?.wonConflicts.find((card) => card.id === choice.conflictId);
                  if (!owner || !intrigue || !conflict) return null;
                  return (
                    <div className="support-target" key={`${choice.playerId}-${choice.intrigueId}-${choice.conflictId}`}>
                      <strong>{owner.leader}</strong>
                      <span>{intrigue.name} / {conflict.name}</span>
                      <button type="button" onClick={() => scoreEndgameIntrigue(owner.id, intrigue.id, conflict.id)}>
                        Score {battleIconLabels[choice.battleIcon]}
                      </button>
                    </div>
                  );
                })}
                {conditionalEndgameChoices.map((choice) => {
                  const owner = game.players.find((player) => player.id === choice.playerId);
                  const intrigue = owner?.intrigues.find((card) => card.id === choice.intrigueId);
                  if (!owner || !intrigue) return null;
                  const rewardText = `${choice.vp} VP${choice.spice ? ` / ${choice.spice} spice` : ""}`;
                  return (
                    <div className="support-target" key={`${choice.playerId}-${choice.intrigueId}`}>
                      <strong>{owner.leader}</strong>
                      <span>{intrigue.name}</span>
                      <button type="button" onClick={() => scoreConditionalEndgameIntrigue(owner.id, intrigue.id)}>
                        Score {rewardText}
                      </button>
                    </div>
                  );
                })}
                {!hasEndgameChoices && <span>No Endgame Intrigues are scoreable.</span>}
                <button type="button" onClick={finalizeEndgame}>Finalize Scores</button>
              </div>
            )}
          </div>
        )}

        {pendingAction && (
          <div className="pending-panel">
            <div>
              <p className="eyebrow">Pending table choice</p>
              <h2>
                {pendingAction.kind === "deploy" && `${pendingOwner?.leader ?? "Player"} deployment`}
                {pendingAction.kind === "control-defense" && `${pendingControlDefenseOwner?.leader ?? "Player"} control deployment`}
                {pendingAction.kind === "reinforce" && `Military Support - ${pendingAction.remaining} troops`}
                {pendingAction.kind === "trade" && `Trade from ${pendingAction.source}`}
                {pendingAction.kind === "spy" && `${pendingAction.placementIcon ? `${iconLabels[pendingAction.placementIcon]} ` : ""}Spy placement - ${pendingAction.remaining}`}
                {pendingAction.kind === "reveal-adjust" && "Printed reveal adjustment"}
                {pendingAction.kind === "contract" && `${pendingContractOwner?.leader ?? "Player"} CHOAM contract`}
                {pendingAction.kind === "acquire-card" && `${pendingAcquireOwner?.leader ?? "Player"} acquisition`}
                {pendingAction.kind === "maker-choice" && `${pendingMakerLabel ?? "Player"} Maker space`}
                {pendingAction.kind === "sietch-tabr" && `${pendingSietchLabel ?? "Player"} Sietch Tabr`}
                {pendingAction.kind === "commander-resource-split" && `${pendingResourceSplitCommander?.leader ?? "Commander"} ${pendingAction.source}`}
                {pendingAction.kind === "shaddam-signet-ring" && `${pendingShaddamSignetCommander?.leader ?? "Shaddam"} Emperor of the Known Universe`}
                {pendingAction.kind === "irulan-signet-ring" && `${pendingIrulanSignetOwner?.leader ?? "Princess Irulan"} Chronicler's Insight`}
                {pendingAction.kind === "staban-unseen-network" && `${pendingStabanUnseenNetworkOwner?.leader ?? "Staban Tuek"} Unseen Network`}
                {pendingAction.kind === "amber-desert-scouts" && `${pendingLadyAmberDesertScoutsOwner?.leader ?? "Lady Amber"} Desert Scouts`}
                {pendingAction.kind === "jessica-spice-agony" && `${pendingJessicaSpiceAgonyOwner?.leader ?? "Lady Jessica"} Spice Agony`}
                {pendingAction.kind === "jessica-water-of-life" && `${pendingJessicaWaterOfLifeOwner?.leader ?? "Reverend Mother Jessica"} Water of Life`}
                {pendingAction.kind === "jessica-reverend-mother" && `${pendingJessicaReverendMotherOwner?.leader ?? "Reverend Mother Jessica"} Reverend Mother`}
                {pendingAction.kind === "jessica-other-memories" && `${pendingJessicaOtherMemoriesOwner?.leader ?? "Lady Jessica"} Other Memories`}
                {pendingAction.kind === "conflict-vp-conversion" && `${pendingConflictVpOwner?.leader ?? "Player"} Conflict reward`}
                {pendingAction.kind === "command-respect" && `${pendingCommandRespectCommander?.leader ?? "Muad'Dib"} Command Respect`}
                {pendingAction.kind === "demand-results" && `${pendingDemandResultsCommander?.leader ?? "Shaddam"} Demand Results`}
                {pendingAction.kind === "corrino-might" && `${pendingCorrinoMightCommander?.leader ?? "Shaddam"} Corrino Might`}
                {pendingAction.kind === "demand-attention" && `${pendingDemandAttentionCommander?.leader ?? "Muad'Dib"} Demand Attention`}
                {pendingAction.kind === "desert-call" && `${pendingDesertCallCommander?.leader ?? "Muad'Dib"} Desert Call`}
                {pendingAction.kind === "threaten-spice-production" && `${pendingThreatenSpiceCommander?.leader ?? "Muad'Dib"} Threaten Spice Production`}
                {pendingAction.kind === "throne-row" && `${pendingThroneOwner?.leader ?? "Shaddam"} Throne Row`}
                {pendingAction.kind === "trash-card" && `${pendingTrashOwner?.leader ?? "Player"} ${pendingAction.optional ? "optional " : ""}trash`}
                {pendingAction.kind === "recall-spy" && `${pendingRecallSpyOwner?.leader ?? "Player"} recall spy`}
                {pendingAction.kind === "lose-influence" && `${pendingInfluencePayerLabel ?? "Player"} influence choice`}
                {pendingAction.kind === "conflict-tie" && `${teams[pendingAction.team].name} conflict tie`}
              </h2>
            </div>

            {pendingAction.kind === "deploy" && (
              <div className="pending-controls">
                <span>{pendingAction.remaining} deployable</span>
                <button type="button" onClick={deployOne} disabled={!pendingOwner || pendingOwner.garrison <= 0}>
                  <Swords size={15} />
                  Deploy 1
                </button>
                <button type="button" onClick={clearPendingAction}>Done</button>
              </div>
            )}

            {pendingAction.kind === "control-defense" && (
              <div className="pending-controls">
                {pendingControlDefenseOwner ? (
                  <>
                    <span>
                      {criticalLocationNames[pendingAction.location]} control: {pendingControlDefenseSupply} in supply
                    </span>
                    <button
                      type="button"
                      onClick={deployControlDefense}
                      disabled={pendingControlDefenseSupply <= 0}
                    >
                      <Swords size={15} />
                      Deploy 1
                    </button>
                    <button type="button" onClick={skipControlDefense}>Skip</button>
                  </>
                ) : (
                  <>
                    <span>Control marker owner can no longer resolve this deployment.</span>
                    <button type="button" onClick={skipControlDefense}>Skip</button>
                  </>
                )}
              </div>
            )}

            {pendingAction.kind === "spy" && pendingSpyOwner && (
              <div className="pending-controls spy-grid">
                <span>{pendingSpyOwner.leader}: {pendingSpyOwner.spies} spies ready</span>
                {pendingSpyOwner.spies <= 0 && pendingSpySupplyRecallSpaces.length > 0 && (
                  <span>Recall one spy for supply, then place.</span>
                )}
                {pendingSpySupplyRecallSpaces.map((space) => (
                  <button
                    type="button"
                    key={`recall-${space.id}`}
                    onClick={() => recallSpyForSupply(space.id)}
                    title={`Recall spy from ${space.name} for no effect`}
                  >
                    <RotateCcw size={14} />
                    {space.name}
                  </button>
                ))}
                {spyPlacementSpaces.map((space) => (
                  <button type="button" key={space.id} onClick={() => placeSpy(space.id)}>
                    {space.name}
                  </button>
                ))}
                {spyPlacementSpaces.length === 0 && pendingSpyOwner.spies > 0 && <span>No legal spy posts</span>}
                <button
                  type="button"
                  onClick={clearPendingAction}
                  disabled={pendingAction.mustPlaceSpy}
                  title={pendingAction.mustPlaceSpy ? "Place the spy to finish this effect" : undefined}
                >
                  Done
                </button>
              </div>
            )}

            {pendingAction.kind === "trash-card" && pendingTrashOwner && (
              <div className="pending-controls trade-intrigue-grid">
                <div className="trade-intrigue-column">
                  <strong>{pendingTrashOwner.leader}</strong>
                  {pendingTrashChoices.length === 0 && <span>No trashable cards</span>}
                  {pendingTrashChoices.map(({ zone, card }) => (
                    <button
                      type="button"
                      key={`${zone}-${card.id}`}
                      onClick={() => trashCard(zone, card.id)}
                      title={`Trash ${card.name}`}
                    >
                      {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                      <span>{card.name} ({zone === "playArea" ? "in play" : zone})</span>
                    </button>
                  ))}
                </div>
                {pendingAction.optional && <button type="button" onClick={skipTrash}>Skip</button>}
              </div>
            )}

            {pendingAction.kind === "recall-spy" && pendingRecallSpyOwner && (
              <div className="pending-controls spy-grid">
                <span>
                  {pendingRecallSpyOwner.leader}: {pendingAction.remaining} {pendingAction.remaining === 1 ? "spy" : "spies"} for +{pendingAction.strength} strength
                  {pendingRecallSpyRecipient ? ` to ${pendingRecallSpyRecipient.leader}` : ""}
                </span>
                {pendingRecallSpyChoices.map((space) => (
                  <button
                    type="button"
                    key={space.id}
                    onClick={() => recallSpy(space.id)}
                    title={`Recall spy from ${space.name}`}
                  >
                    <RotateCcw size={14} />
                    {space.name}
                  </button>
                ))}
                {pendingRecallSpyChoices.length === 0 && <span>No spy posts</span>}
                {pendingAction.optional && <button type="button" onClick={skipRecall}>Skip</button>}
              </div>
            )}

            {pendingAction.kind === "lose-influence" && pendingInfluencePayerLabel && (
              <div className="pending-controls support-grid">
                <span>
                  {pendingInfluencePayerLabel}: lose 1 Influence for +{pendingAction.strength} strength
                  {pendingInfluenceRecipient ? ` to ${pendingInfluenceRecipient.leader}` : ""}
                </span>
                {pendingInfluenceChoices.map(({ ownerId, faction }) => {
                  const owner = game.players.find((player) => player.id === ownerId);
                  const showOwner = owner && (pendingInfluenceChoiceOwnerIds.length > 1 || owner.id !== pendingAction.ownerId);
                  const ownerRoleLabel = owner?.id === pendingAction.combatRecipientId ? "Recipient" : "Commander personal";
                  const label = showOwner
                    ? `${ownerRoleLabel}: ${owner.leader} / ${factionLabels[faction]}`
                    : factionLabels[faction];
                  return (
                    <button
                      type="button"
                      key={`${ownerId}-${faction}`}
                      onClick={() => loseInfluence(ownerId, faction)}
                      title={`${owner?.leader ?? "Player"} loses 1 ${factionLabels[faction]} Influence`}
                    >
                      <span>{factionShortLabels[faction]}</span>
                      {label}
                    </button>
                  );
                })}
                {pendingInfluenceChoices.length === 0 && <span>No Influence to lose</span>}
                {pendingAction.optional && <button type="button" onClick={skipInfluenceLoss}>Skip</button>}
              </div>
            )}

            {pendingAction.kind === "reveal-adjust" && revealAdjustOwner && revealAdjustRecipient && (
              <div className="pending-controls reveal-adjust">
                <span>{pendingAction.cards.join(", ")}</span>
                <span>{revealAdjustOwner.persuasion} persuasion</span>
                <button
                  type="button"
                  onClick={() => adjustRevealReward(-1, 0)}
                  disabled={pendingAction.persuasionAdjustment <= 0}
                >
                  -1
                </button>
                <button type="button" onClick={() => adjustRevealReward(1, 0)}>+1</button>
                <span>{revealAdjustRecipient.conflict} strength</span>
                <button
                  type="button"
                  onClick={() => adjustRevealReward(0, -1)}
                  disabled={pendingAction.strengthAdjustment <= 0}
                >
                  -1
                </button>
                <button type="button" onClick={() => adjustRevealReward(0, 1)}>+1</button>
                <button type="button" onClick={finishRevealAdjust}>Done</button>
              </div>
            )}

            {pendingAction.kind === "maker-choice" && pendingMakerOwner && (
              <div className="pending-controls">
                <span>{pendingMakerLabel}</span>
                <button type="button" onClick={() => chooseMakerReward("spice")}>
                  +{pendingAction.spice} spice{pendingMakerSplit ? `: ${pendingMakerSpiceOwner.leader}` : ""}
                </button>
                <button type="button" onClick={() => chooseMakerReward("sandworms")} disabled={!pendingMakerCanSummon}>
                  Summon {pendingAction.sandworms}{pendingMakerSplit ? `: ${pendingMakerOwner.leader}` : ""}
                </button>
              </div>
            )}

            {pendingAction.kind === "sietch-tabr" && pendingSietchOwner && pendingSietchWaterOwner && (
              <div className="pending-controls">
                <span>{pendingSietchLabel}</span>
                <button type="button" onClick={() => chooseSietchTabr("hooks")}>
                  {pendingAction.canTakeMakerHooks ? "Hooks + " : ""}Troop + water
                </button>
                <button type="button" onClick={() => chooseSietchTabr("shield-wall")}>
                  Water{pendingAction.canRemoveShieldWall ? " + remove Shield Wall" : ""}
                </button>
              </div>
            )}

            {pendingAction.kind === "commander-resource-split" && pendingResourceSplitCommander && pendingResourceSplitAlly && (
              <div className="pending-controls">
                <span>{pendingResourceSplitCommander.leader} / {pendingResourceSplitAlly.leader}</span>
                {pendingAction.options.map((option, index) => {
                  const Icon = resources.find((resource) => resource.id === option.commanderResource)?.Icon ?? Sparkles;
                  return (
                    <button
                      type="button"
                      key={`${option.commanderResource}-${option.allyResource}`}
                      onClick={() => chooseCommanderResourceSplit(index)}
                    >
                      <Icon size={15} />
                      Commander {resourceChoiceLabel(option.commanderAmount, option.commanderResource)} / Ally {resourceChoiceLabel(option.allyAmount, option.allyResource)}
                    </button>
                  );
                })}
              </div>
            )}

            {pendingAction.kind === "shaddam-signet-ring" && (
              <div className="pending-controls influence-buttons">
                {pendingShaddamSignetCommander && pendingShaddamSignetAlly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => chooseShaddamSignet("troop")}
                      disabled={pendingShaddamSignetCommander.resources.solari < 1}
                    >
                      <CircleDollarSign size={15} />
                      Spend 1: {pendingShaddamSignetAlly.leader} recruits 1 troop
                    </button>
                    {shaddamSignetInfluenceFactions.map((faction) => {
                      const owner =
                        faction === "emperor" ? pendingShaddamSignetCommander : pendingShaddamSignetAlly;
                      return (
                        <button
                          type="button"
                          key={faction}
                          onClick={() => chooseShaddamSignet({ kind: "influence", faction })}
                          disabled={pendingShaddamSignetCommander.resources.solari < 3}
                        >
                          <CircleDollarSign size={15} />
                          Spend 3: {owner.leader} +1 {factionLabels[faction]}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <span>Emperor of the Known Universe can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseShaddamSignet("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "irulan-signet-ring" && (
              <div className="pending-controls">
                {pendingIrulanSignetOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => chooseIrulanSignet("acquire")}
                      disabled={pendingIrulanSignetAcquireCards.length === 0}
                    >
                      <BookOpen size={15} />
                      Acquire cost-1 card to hand
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseIrulanSignet("trash")}
                      disabled={pendingIrulanSignetTrashChoices.length === 0}
                    >
                      <X size={15} />
                      Trash hand card
                    </button>
                  </>
                ) : (
                  <span>Chronicler's Insight can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseIrulanSignet("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "staban-unseen-network" && (
              <div className="pending-controls">
                {pendingStabanUnseenNetworkOwner && pendingStabanUnseenNetworkSpace ? (
                  pendingAction.reward === "landsraad" ? (
                    <button
                      type="button"
                      onClick={() => chooseStabanUnseenNetwork("pay")}
                      disabled={pendingStabanUnseenNetworkOwner.resources.spice < 1}
                    >
                      <Sparkles size={15} />
                      Spend 1 spice: +3 Solari
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => chooseStabanUnseenNetwork("pay")}
                      disabled={pendingStabanUnseenNetworkOwner.resources.solari < 2}
                    >
                      <Eye size={15} />
                      Spend 2 Solari: Intrigue
                    </button>
                  )
                ) : (
                  <span>Unseen Network can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseStabanUnseenNetwork("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "amber-desert-scouts" && (
              <div className="pending-controls">
                {pendingLadyAmberDesertScoutsOwner ? (
                  <button
                    type="button"
                    onClick={() => chooseLadyAmberDesertScouts("retreat")}
                    disabled={pendingLadyAmberDesertScoutsOwner.deployedTroops <= 0}
                  >
                    <RotateCcw size={15} />
                    Retreat 1 troop
                  </button>
                ) : (
                  <span>Desert Scouts can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseLadyAmberDesertScouts("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "jessica-spice-agony" && (
              <div className="pending-controls">
                {pendingJessicaSpiceAgonyOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => chooseJessicaSpiceAgony("pay")}
                      disabled={pendingJessicaSpiceAgonyOwner.resources.spice < 1 || playerTroopSupply(pendingJessicaSpiceAgonyOwner) <= 0}
                    >
                      <Sparkles size={15} />
                      Spend 1 spice: Intrigue + memory
                    </button>
                    <span>{memoryCountLabel(pendingJessicaSpiceAgonyOwner.jessicaMemories)} / {troopSupplyLabel(playerTroopSupply(pendingJessicaSpiceAgonyOwner))}</span>
                  </>
                ) : (
                  <span>Spice Agony can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseJessicaSpiceAgony("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "jessica-water-of-life" && (
              <div className="pending-controls">
                {pendingJessicaWaterOfLifeOwner ? (
                  <button
                    type="button"
                    onClick={() => chooseJessicaWaterOfLife("pay")}
                    disabled={pendingJessicaWaterOfLifeOwner.resources.spice < 1}
                  >
                    <Droplets size={15} />
                    Spend 1 spice: +1 water
                  </button>
                ) : (
                  <span>Water of Life can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseJessicaWaterOfLife("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "jessica-reverend-mother" && (
              <div className="pending-controls">
                {pendingJessicaReverendMotherOwner && pendingJessicaReverendMotherSpace ? (
                  <button
                    type="button"
                    onClick={() => chooseJessicaReverendMother("repeat")}
                    disabled={pendingJessicaReverendMotherOwner.resources.water < 1}
                  >
                    <Droplets size={15} />
                    Spend 1 water: repeat {pendingJessicaReverendMotherSpace.name}
                  </button>
                ) : (
                  <span>Reverend Mother can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseJessicaReverendMother("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "jessica-other-memories" && (
              <div className="pending-controls">
                {pendingJessicaOtherMemoriesOwner ? (
                  <>
                    <button type="button" onClick={() => chooseJessicaOtherMemories("flip")}>
                      <BookOpen size={15} />
                      Return {memoryCountLabel(pendingJessicaOtherMemoriesOwner.jessicaMemories)}: draw and flip
                    </button>
                    <span>Reverend Mother side becomes active.</span>
                  </>
                ) : (
                  <span>Other Memories can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={() => chooseJessicaOtherMemories("skip")}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "conflict-vp-conversion" && (
              <div className="pending-controls spy-grid">
                {pendingConflictVpOwner ? (
                  <>
                    <span>
                      {pendingAction.remaining} available conversion{pendingAction.remaining === 1 ? "" : "s"} from {pendingAction.source}
                    </span>
                    {pendingAction.cost.kind === "resource" ? (
                      <button
                        type="button"
                        onClick={payConflictVpReward}
                        disabled={!pendingConflictVpCanPay}
                      >
                        {pendingAction.cost.resource === "spice" ? <Sparkles size={15} /> : <CircleDollarSign size={15} />}
                        Spend {pendingAction.cost.amount} {pendingAction.cost.resource}: +{pendingAction.vp} VP
                      </button>
                    ) : (
                      <>
                        <span>
                          Recall {pendingAction.cost.count - pendingAction.cost.recalled} more {pendingAction.cost.count - pendingAction.cost.recalled === 1 ? "spy" : "spies"}.
                        </span>
                        {pendingConflictVpSpyChoices.map((space) => (
                          <button
                            type="button"
                            key={space.id}
                            onClick={() => recallConflictRewardSpy(space.id)}
                            title={`Recall spy from ${space.name}`}
                          >
                            <RotateCcw size={14} />
                            {space.name}
                          </button>
                        ))}
                        {pendingConflictVpSpyChoices.length === 0 && <span>No spy posts to recall</span>}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={skipConflictVpReward}
                      disabled={pendingAction.cost.kind === "recall-spies" && pendingAction.cost.recalled > 0}
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <span>Conflict reward can no longer resolve with the current table state.</span>
                )}
              </div>
            )}

            {pendingAction.kind === "command-respect" && (
              <div className="pending-controls">
                {pendingCommandRespectCommander && pendingCommandRespectPartners.length > 0 ? (
                  <>
                    <span>Trash Command Respect to trade with one teammate.</span>
                    {pendingCommandRespectPartners.map((partner) => (
                      <button
                        type="button"
                        key={partner.id}
                        onClick={() => chooseCommandRespectTrade(partner.id)}
                      >
                        <HandCoins size={15} />
                        Trade with {partner.leader}
                      </button>
                    ))}
                  </>
                ) : (
                  <span>Command Respect can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipCommandRespectChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "demand-results" && (
              <div className="pending-controls contract-choice">
                {pendingDemandResultsAllies[0] && pendingDemandResultsAllies[1] && pendingDemandResultsContracts[0] && pendingDemandResultsContracts[1] ? (
                  <>
                    <span>Spend 2 Solari, assign both contracts, then trash Demand Results.</span>
                    <button type="button" onClick={() => chooseDemandResults(0)}>
                      <span>{pendingDemandResultsContracts[0].name} to {pendingDemandResultsAllies[0].leader}</span>
                      <span>{pendingDemandResultsContracts[1].name} to {pendingDemandResultsAllies[1].leader}</span>
                    </button>
                    <button type="button" onClick={() => chooseDemandResults(1)}>
                      <span>{pendingDemandResultsContracts[1].name} to {pendingDemandResultsAllies[0].leader}</span>
                      <span>{pendingDemandResultsContracts[0].name} to {pendingDemandResultsAllies[1].leader}</span>
                    </button>
                  </>
                ) : (
                  <span>Demand Results can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipDemandResultsChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "corrino-might" && (
              <div className="pending-controls">
                {pendingCorrinoMightAllies[0] && pendingCorrinoMightAllies[1] ? (
                  <button
                    type="button"
                    onClick={chooseCorrinoMight}
                    disabled={!pendingCorrinoMightCommander || pendingCorrinoMightCommander.resources.spice < pendingAction.cost}
                  >
                    <Sparkles size={15} />
                    Spend {pendingAction.cost}: both Allies +2 troops, trash
                  </button>
                ) : (
                  <span>Corrino Might can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipCorrinoMightChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "demand-attention" && (
              <div className="pending-controls">
                {pendingDemandAttentionRecipient ? (
                  <button type="button" onClick={chooseDemandAttention}>
                    <CircleDollarSign size={15} />
                    Spend 4: {pendingDemandAttentionRecipient.leader} +1 {factionLabels[pendingAction.faction]} Influence
                  </button>
                ) : (
                  <span>Demand Attention can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipDemandAttentionChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "desert-call" && (
              <div className="pending-controls">
                {pendingDesertCallAlly ? (
                  <button type="button" onClick={chooseDesertCall}>
                    <Droplets size={15} />
                    Spend 1 water: {pendingDesertCallAlly.leader} summons 1 sandworm
                  </button>
                ) : (
                  <span>Desert Call can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipDesertCallChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "threaten-spice-production" && (
              <div className="pending-controls threaten-spice-choice">
                {pendingThreatenSpiceCommander && pendingThreatenSpiceContributors.length === pendingAction.contributorIds.length ? (
                  <>
                    <span>{pendingThreatenSpiceTotal}/{pendingAction.cost} spice committed</span>
                    <div className="threaten-spice-grid">
                      {pendingThreatenSpiceContributors.map((contributor) => {
                        const contribution = pendingAction.contributions[contributor.id] ?? 0;
                        return (
                          <div className="threaten-spice-contributor" key={contributor.id}>
                            <strong>{contributor.leader}</strong>
                            <span>{contribution}/{contributor.resources.spice}</span>
                            <button
                              type="button"
                              onClick={() => adjustThreatenSpiceProduction(contributor.id, -1)}
                              disabled={contribution <= 0}
                              title={`Remove 1 spice from ${contributor.leader}`}
                              aria-label={`Remove 1 spice from ${contributor.leader}`}
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustThreatenSpiceProduction(contributor.id, 1)}
                              disabled={contribution >= contributor.resources.spice || pendingThreatenSpiceTotal >= pendingAction.cost}
                              title={`Add 1 spice from ${contributor.leader}`}
                              aria-label={`Add 1 spice from ${contributor.leader}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" onClick={chooseThreatenSpiceProduction} disabled={!pendingThreatenSpiceCanPay}>
                      <Sparkles size={15} />
                      Pay {pendingAction.cost}: +1 VP
                    </button>
                  </>
                ) : (
                  <span>Threaten Spice Production can no longer resolve with the current table state.</span>
                )}
                <button type="button" onClick={skipThreatenSpiceProductionChoice}>Skip</button>
              </div>
            )}

            {pendingAction.kind === "reinforce" && (
              <div className="pending-controls support-grid">
                {reinforceAllies.map((ally) => (
                  <div className="support-target" key={ally.id}>
                    <strong>{ally.leader}</strong>
                    <button type="button" onClick={() => reinforceOne(ally.id, "garrison")}>Garrison</button>
                    <button
                      type="button"
                      onClick={() => reinforceOne(ally.id, "conflict")}
                      disabled={pendingAction.conflictBlocked}
                      title={pendingAction.conflictBlocked ? "Conflict deployment is blocked this turn." : undefined}
                    >
                      Conflict
                    </button>
                  </div>
                ))}
                {pendingAction.conflictBlocked && <span>Conflict deployment is blocked this turn.</span>}
              </div>
            )}

            {pendingAction.kind === "trade" && pendingActor && pendingPartner && (
              <div className="pending-controls trade-controls">
                <div className="resource-picker">
                  {tradeGoods.map(({ id, label, Icon }) => (
                    <button
                      type="button"
                      className={pendingAction.resource === id ? "selected" : ""}
                      key={id}
                      onClick={() => updateTrade(id)}
                      disabled={tradeLocked && pendingAction.resource !== id}
                      title={label}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="resource-picker">
                  {tradePartners.map((partner) => (
                    <button
                      type="button"
                      className={pendingPartner.id === partner.id ? "selected" : ""}
                      key={partner.id}
                      onClick={() => updateTrade(pendingAction.resource, partner.id)}
                      disabled={tradeLocked && pendingPartner.id !== partner.id}
                    >
                      {partner.leader}
                    </button>
                  ))}
                </div>
                {pendingAction.resource === "intrigue" ? (
                  <div className="trade-intrigue-grid">
                    {[pendingActor, pendingPartner].map((owner) => {
                      const recipient = owner.id === pendingActor.id ? pendingPartner : pendingActor;
                      return (
                        <div className="trade-intrigue-column" key={owner.id}>
                          <strong>{owner.leader}</strong>
                          {owner.intrigues.length === 0 && <span>No Intrigues</span>}
                          {owner.intrigues.map((card) => (
                            <button
                              type="button"
                              key={card.id}
                              onClick={() => transferTrade(owner.id, recipient.id, card.id)}
                              title={`Trade ${card.name} to ${recipient.leader}`}
                            >
                              {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                              <span>{card.name}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => transferTrade(pendingActor.id, pendingPartner.id)}>
                      {pendingActor.leader} gives 1 ({pendingAction.actorGiven})
                    </button>
                    <button type="button" onClick={() => transferTrade(pendingPartner.id, pendingActor.id)}>
                      {pendingPartner.leader} gives 1 ({pendingAction.partnerGiven})
                    </button>
                  </>
                )}
                <button type="button" onClick={clearPendingAction}>Done</button>
              </div>
            )}

            {pendingAction.kind === "contract" && pendingContractOwner && (
              <div className="pending-controls contract-choice">
                {game.contractOffer.length > 0 && <span className="choice-divider">Public</span>}
                {game.contractOffer.map((contract) => (
                  <button type="button" key={contract.id} onClick={() => takeContract(contract.id)}>
                    {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                    <span>{contract.name}</span>
                  </button>
                ))}
                {reservedContractChoices.length > 0 && <span className="choice-divider">Reserved</span>}
                {reservedContractChoices.map((contract) => (
                  <button type="button" key={contract.id} onClick={() => takeContract(contract.id)}>
                    {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                    <span>{contract.name}</span>
                  </button>
                ))}
                {game.contractOffer.length === 0 && reservedContractChoices.length === 0 && !pendingAction.publicOnly && (
                  <button type="button" onClick={collectContractFallback}>
                    <CircleDollarSign size={15} />
                    Collect 2 Solari
                  </button>
                )}
              </div>
            )}

            {pendingAction.kind === "acquire-card" && pendingAcquireOwner && (
              <div className="pending-controls contract-choice">
                {pendingAcquireCards.map((card) => (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => acquirePendingCard(card.id)}
                    title={`Acquire ${card.name} for ${pendingAcquireOwner.leader}`}
                  >
                    {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                    <span>{card.name}</span>
                  </button>
                ))}
                {pendingAcquireCards.length === 0 && (
                  <span>No eligible cards cost {pendingAction.maxCost} or less.</span>
                )}
              </div>
            )}

            {pendingAction.kind === "throne-row" && pendingThroneOwner && (
              <div className="pending-controls contract-choice throne-choice">
                {game.imperiumRow.filter(canMoveCardToThroneRow).map((card) => (
                  <button type="button" key={card.id} onClick={() => chooseThroneRowCard(card.id)}>
                    {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                    <span>{card.name}</span>
                  </button>
                ))}
                {game.imperiumRow.every((card) => !canMoveCardToThroneRow(card)) && (
                  <button type="button" onClick={clearPendingAction}>No eligible card</button>
                )}
              </div>
            )}

            {pendingAction.kind === "conflict-tie" && (
              <div className="pending-controls support-grid">
                {conflictTieAllies.map((ally) => (
                  <div className="support-target" key={ally.id}>
                    <strong>{ally.leader}</strong>
                    <span>{ally.conflict} strength</span>
                    <button type="button" onClick={() => chooseConflictTieWinner(ally.id)}>Takes first</button>
                  </div>
                ))}
                <button type="button" onClick={() => chooseConflictTieWinner()}>No concession</button>
              </div>
            )}
          </div>
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
          {activePlayer.intrigues.length > 0 && (
            <section className="intrigue-hand" aria-label={`${activePlayer.leader} Intrigue cards`}>
              <div className="intrigue-heading">
                <Eye size={15} />
                <span>{activePlayer.intrigues.length} Intrigue</span>
              </div>
              <div className="intrigue-row">
                {activePlayer.intrigues.map((card) => {
                  const activeCombatStrength = combatIntrigueStrength(game, activePlayer, card);
                  const backedByChoamPlotChoices = isBackedByChoamIntrigue(card) ? influenceLossChoices(activePlayer) : [];
                  const intelligenceReportDrawCount = spyPostCount(game, activePlayer.id) >= 2 ? 2 : 1;
                  const inspireAweToHand =
                    activePlayer.deployedSandworms > 0 ||
                    (activePlayer.role === "Commander" && activatedAlly.deployedSandworms > 0);
                  const manipulateChoices = isManipulateIntrigue(card) ? game.imperiumRow : [];
                  const leverageCanPlay = hasGainedSpiceThisTurn(game, activePlayer.id);
                  const distractionTriggerMet = hasDeployedThreeOrMoreUnitsThisTurn(game, activePlayer.id);
                  const distractionCanPlay = isDistractionIntrigue(card)
                    ? canPlayDistractionPlotIntrigue(game, activePlayer)
                    : false;
                  const councilorsAmbitionCanPlay = activePlayer.highCouncilSeat;
                  const strategicStockpilingCanSpice = activePlayer.resources.spice >= 5;
                  const strategicStockpilingCanWater =
                    activePlayer.resources.water >= 3 &&
                    effectiveRequirementInfluence(activePlayer, "spacing", game.players) >= 3;
                  const shaddamsFavorGainsSolari = effectiveEmperorIconInfluence(activePlayer, game.players) >= 3;
                  const marketOpportunityCanSellSpice = activePlayer.resources.spice >= 2;
                  const marketOpportunityCanBuySpice = activePlayer.resources.solari >= 5;
                  const mercenariesCanPay = activePlayer.resources.solari >= 3;
                  const cunningCanPay = activePlayer.resources.spice >= 1;
                  const sietchRitualChoices = isSietchRitualIntrigue(card)
                    ? sietchRitualFactionChoices(activePlayer)
                    : [];
                  const changeAllegiancesInfluenceOwnerId = activePlayer.role === "Commander" ? activatedAlly.id : undefined;
                  const changeAllegiancesGainOptions = isChangeAllegiancesIntrigue(card)
                    ? changeAllegiancesGainChoices(activePlayer)
                    : [];
                  const changeAllegiancesLossOptions = isChangeAllegiancesIntrigue(card)
                    ? changeAllegiancesLossChoices(game, activePlayer, changeAllegiancesInfluenceOwnerId)
                    : [];
                  const changeAllegiancesSelection = changeAllegiancesSelections[card.id] ?? {};
                  const selectedChangeLoss = selectedFactionChoice(
                    changeAllegiancesSelection.loseFaction,
                    changeAllegiancesLossOptions,
                  );
                  const selectedChangeShiftGain = selectedFactionChoice(
                    changeAllegiancesSelection.shiftGainFaction,
                    changeAllegiancesGainOptions,
                  );
                  const selectedChangeSpiceGain = selectedFactionChoice(
                    changeAllegiancesSelection.spiceGainFaction,
                    changeAllegiancesGainOptions,
                  );
                  const changeAllegiancesCanPaySpice = activePlayer.resources.spice >= 3;
                  const changeAllegiancesPersonalFaction = activePlayer.role === "Commander"
                    ? activePlayer.team === "muaddib" ? "fremen" : "emperor"
                    : undefined;
                  const changeAllegiancesOwnerLabel = (faction: FactionId) =>
                    activePlayer.role === "Commander" && faction !== changeAllegiancesPersonalFaction
                      ? `: ${activatedAlly.leader}`
                      : "";
                  const specialMissionCanPlaceSpy = isSpecialMissionIntrigue(card)
                    ? canPlaySpecialMissionPlaceSpy(game, activePlayer)
                    : false;
                  const specialMissionCitySpaces = isSpecialMissionIntrigue(card)
                    ? specialMissionCitySpySpaces(game, activePlayer)
                    : [];
                  const specialMissionRecallSpaces = isSpecialMissionIntrigue(card)
                    ? specialMissionRecallSpySpaces(game, activePlayer)
                    : [];
                  const opportunismCanPay = activePlayer.resources.solari >= 2;
                  const opportunismChoices = isOpportunismIntrigue(card) ? influenceLossPairChoices(activePlayer) : [];
                  const buyAccessCanPay = activePlayer.resources.solari >= 5;
                  const buyAccessChoices = isBuyAccessIntrigue(card) ? buyAccessPairChoices(activePlayer) : [];
                  const imperiumPoliticsCanPay = activePlayer.resources.solari >= 1;
                  const imperiumPoliticsChoices = isImperiumPoliticsIntrigue(card)
                    ? imperiumPoliticsFactionChoices(activePlayer)
                    : [];
                  const departForArrakisCanDraw = effectiveFremenIconInfluence(activePlayer, game.players) >= 3;
                  const departForArrakisCanPay = activePlayer.resources.spice >= 2;
                  return (
                    <article className="intrigue-card" key={card.id}>
                      {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                      <span>
                        {isContingencyPlanIntrigue(card)
                          ? "Plot / Combat / +3 strength"
                          : isCallToArmsIntrigue(card)
                            ? "Plot / reveal acquisitions recruit"
                          : isIntelligenceReportIntrigue(card)
                            ? `Plot / draw ${intelligenceReportDrawCount}`
                          : isInspireAweIntrigue(card)
                            ? `Plot / acquire <=3${inspireAweToHand ? " to hand" : ""}`
                          : isManipulateIntrigue(card)
                            ? "Plot / row replace + discount"
                          : isLeverageIntrigue(card)
                            ? "Plot / spice turn contract"
                          : isDistractionIntrigue(card)
                            ? "Plot / 3-unit shared spy"
                          : isCunningIntrigue(card)
                            ? "Plot / draw or pay to trash"
                          : isSietchRitualIntrigue(card)
                            ? "Plot / discard for Influence"
                          : isChangeAllegiancesIntrigue(card)
                            ? "Plot / shift or buy Influence"
                          : isSpecialMissionIntrigue(card)
                            ? "Plot / City spy or wall spice"
                          : isOpportunismIntrigue(card)
                            ? "Plot / cash Influence for VP"
                          : isBuyAccessIntrigue(card)
                            ? "Plot / buy two Influence"
                          : isImperiumPoliticsIntrigue(card)
                            ? "Plot / buy Influence"
                          : isDepartForArrakisIntrigue(card)
                            ? `Plot / ${departForArrakisCanDraw ? "draw / " : ""}spend spice for troops`
                          : isCouncilorsAmbitionIntrigue(card)
                            ? "Plot / High Council water"
                          : isStrategicStockpilingIntrigue(card)
                            ? "Plot / spend stockpiles for VP"
                          : isShaddamsFavorIntrigue(card)
                            ? `Plot / recruit${shaddamsFavorGainsSolari ? " / 3 Solari" : ""}`
                          : isMarketOpportunityIntrigue(card)
                            ? "Plot / exchange spice and Solari"
                          : isMercenariesIntrigue(card)
                            ? "Plot / hire troops and Intrigue"
                          : isFindWeaknessIntrigue(card)
                            ? "Combat / +2 / recall spy for +3"
                          : isQuestionableMethodsIntrigue(card)
                            ? "Combat / +1 / lose Ally/Cmdr personal Inf. for +4"
                          : isGoToGroundIntrigue(card)
                            ? "Combat / retreat 1-2 troops / optional spy"
                          : isReachAgreementIntrigue(card)
                            ? "Combat / retreat 1-2 troops / take contract"
                          : isSpiceIsPowerIntrigue(card)
                            ? "Combat / retreat 3 troops for spice / spend 3 spice for +6"
                          : isTacticalOptionIntrigue(card)
                            ? "Combat / +2 strength / retreat troops"
                          : isSpringTheTrapIntrigue(card)
                            ? "Combat / recall 2 spies for +7"
                          : isDevourIntrigue(card)
                            ? activeCombatStrength
                              ? `Combat / +${activeCombatStrength} strength${activePlayer.deployedSandworms > 0 ? " / optional trash" : ""}`
                              : "Combat / +2 or +4 with worm"
                          : isBackedByChoamIntrigue(card)
                            ? activeCombatStrength ? `Plot / lose Inf. for +4 Solari / Combat +${activeCombatStrength}` : "Plot / lose Inf. for +4 Solari / Combat needs 2 contracts"
                          : isWeirdingCombatIntrigue(card) && activeCombatStrength
                            ? `Combat / +${activeCombatStrength} strength`
                            : card.battleIcon
                              ? `Plot / Endgame / ${battleIconLabels[card.battleIcon]}`
                              : card.combatSwords
                                ? `Combat / +${card.combatSwords} printed strength`
                                : "Intrigue"}
                      </span>
                      <strong>{card.name}</strong>
                      <p>{card.summary}</p>
                      {card.battleIcon && (
                        <button
                          type="button"
                          onClick={() => scorePlotIntrigue(card.id)}
                          disabled={plotIntrigueLocked}
                        >
                          <Sparkles size={14} />
                          Gain Plot Spice
                        </button>
                      )}
                      {isContingencyPlanIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playContingencyPlanPlot(card.id)}
                          disabled={plotIntrigueLocked}
                        >
                          <CircleDollarSign size={14} />
                          Gain 2 Solari
                        </button>
                      )}
                      {isCallToArmsIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playCallToArmsPlot(card.id)}
                          disabled={plotIntrigueLocked}
                          title="Each card you acquire during this Reveal turn recruits 1 troop"
                        >
                          <Users size={14} />
                          Arm Acquisitions
                        </button>
                      )}
                      {isIntelligenceReportIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playIntelligenceReportPlot(card.id)}
                          disabled={plotIntrigueLocked}
                        >
                          <BookOpen size={14} />
                          Draw {intelligenceReportDrawCount}
                        </button>
                      )}
                      {isInspireAweIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playInspireAwePlot(card.id)}
                          disabled={plotIntrigueLocked}
                          title={
                            inspireAweToHand
                              ? "Acquire a card that costs 3 or less to your hand"
                              : "Acquire a card that costs 3 or less to your discard pile"
                          }
                        >
                          <BookOpen size={14} />
                          Acquire &lt;=3{inspireAweToHand ? " to Hand" : ""}
                        </button>
                      )}
                      {isManipulateIntrigue(card) && (
                        <div className="intrigue-actions">
                          {manipulateChoices.map((rowCard) => (
                            <button
                              type="button"
                              key={rowCard.id}
                              onClick={() => playManipulatePlot(card.id, rowCard.id)}
                              disabled={plotIntrigueLocked}
                              title={`Remove ${rowCard.name} from the Imperium Row and discount it by 1 this round`}
                            >
                              <BookOpen size={14} />
                              Remove {rowCard.name}
                            </button>
                          ))}
                          {manipulateChoices.length === 0 && <span>No Imperium Row cards to remove.</span>}
                        </div>
                      )}
                      {isLeverageIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playLeveragePlot(card.id)}
                          disabled={plotIntrigueLocked || !leverageCanPlay}
                          title="Requires gaining spice during this turn"
                        >
                          <FileText size={14} />
                          Leverage Contract
                        </button>
                      )}
                      {isDistractionIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playDistractionPlot(card.id)}
                          disabled={plotIntrigueLocked || !distractionCanPlay}
                          title={distractionTriggerMet ? "Requires another player's spy post and a spy to place" : "Requires deploying three or more units this turn"}
                        >
                          <Eye size={14} />
                          Share Spy Post
                        </button>
                      )}
                      {isCunningIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playCunningPlot(card.id, "draw")}
                            disabled={plotIntrigueLocked}
                          >
                            <BookOpen size={14} />
                            Draw 1
                          </button>
                          <button
                            type="button"
                            onClick={() => playCunningPlot(card.id, "paid-trash")}
                            disabled={plotIntrigueLocked || !cunningCanPay}
                            title="Spend 1 spice to draw 1 card, then trash 1 card"
                          >
                            <X size={14} />
                            1 Spice -&gt; Draw + Trash
                          </button>
                        </div>
                      )}
                      {isSietchRitualIntrigue(card) && (
                        <div className="intrigue-actions">
                          {activePlayer.hand.length === 0 && <span>Requires a card in hand to discard.</span>}
                          {activePlayer.hand.map((discardCard) =>
                            sietchRitualChoices.map((faction) => {
                              const personalFaction = activePlayer.role === "Commander" && activePlayer.team === "muaddib"
                                ? "fremen"
                                : undefined;
                              const ownerLabel = activePlayer.role === "Commander" && faction !== personalFaction
                                ? `: ${activatedAlly.leader}`
                                : "";
                              return (
                                <button
                                  type="button"
                                  key={`${discardCard.id}-${faction}`}
                                  onClick={() => playSietchRitualPlot(card.id, discardCard.id, faction)}
                                  disabled={plotIntrigueLocked}
                                  title={`Discard ${discardCard.name} to gain 1 ${factionLabels[faction]} Influence${ownerLabel ? ` for ${activatedAlly.leader}` : ""}`}
                                >
                                  <Minus size={14} />
                                  Discard {discardCard.name} -&gt; {factionShortLabels[faction]}{ownerLabel}
                                </button>
                              );
                            }),
                          )}
                        </div>
                      )}
                      {isChangeAllegiancesIntrigue(card) && (
                        <div className="intrigue-actions">
                          {changeAllegiancesLossOptions.length > 0 && (
                            <div className="intrigue-choice-row">
                              <label>
                                <span>Lose</span>
                                <select
                                  className="intrigue-select"
                                  value={selectedChangeLoss ?? ""}
                                  onChange={(event) =>
                                    updateChangeAllegiancesSelection(card.id, {
                                      loseFaction: event.target.value as FactionId,
                                    })
                                  }
                                >
                                  {changeAllegiancesLossOptions.map((faction) => (
                                    <option key={faction} value={faction}>
                                      {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>Gain</span>
                                <select
                                  className="intrigue-select"
                                  value={selectedChangeShiftGain ?? ""}
                                  onChange={(event) =>
                                    updateChangeAllegiancesSelection(card.id, {
                                      shiftGainFaction: event.target.value as FactionId,
                                    })
                                  }
                                >
                                  {changeAllegiancesGainOptions.map((faction) => (
                                    <option key={faction} value={faction}>
                                      {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedChangeLoss || !selectedChangeShiftGain) return;
                                  playChangeAllegiancesPlot(card.id, {
                                    kind: "shift",
                                    loseFaction: selectedChangeLoss,
                                    gainFaction: selectedChangeShiftGain,
                                  });
                                }}
                                disabled={plotIntrigueLocked || !selectedChangeLoss || !selectedChangeShiftGain}
                                title="Lose 1 Influence to gain 1 Influence"
                              >
                                <Minus size={14} />
                                Lose -&gt; Gain
                              </button>
                            </div>
                          )}
                          {changeAllegiancesLossOptions.length === 0 && <span>Lose branch requires Influence.</span>}
                          <div className="intrigue-choice-row">
                            <label>
                              <span>3 Spice gain</span>
                              <select
                                className="intrigue-select"
                                value={selectedChangeSpiceGain ?? ""}
                                onChange={(event) =>
                                  updateChangeAllegiancesSelection(card.id, {
                                    spiceGainFaction: event.target.value as FactionId,
                                  })
                                }
                              >
                                {changeAllegiancesGainOptions.map((faction) => (
                                  <option key={faction} value={faction}>
                                    {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedChangeSpiceGain) return;
                                playChangeAllegiancesPlot(card.id, {
                                  kind: "spend-spice",
                                  gainFaction: selectedChangeSpiceGain,
                                });
                              }}
                              disabled={plotIntrigueLocked || !changeAllegiancesCanPaySpice || !selectedChangeSpiceGain}
                              title="Spend 3 spice to gain 1 Influence"
                            >
                              <HandCoins size={14} />
                              3 Spice -&gt; Gain
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedChangeLoss || !selectedChangeShiftGain || !selectedChangeSpiceGain) return;
                                playChangeAllegiancesPlot(card.id, {
                                  kind: "both",
                                  loseFaction: selectedChangeLoss,
                                  shiftGainFaction: selectedChangeShiftGain,
                                  spiceGainFaction: selectedChangeSpiceGain,
                                });
                              }}
                              disabled={
                                plotIntrigueLocked ||
                                !changeAllegiancesCanPaySpice ||
                                !selectedChangeLoss ||
                                !selectedChangeShiftGain ||
                                !selectedChangeSpiceGain
                              }
                              title="Resolve both rows: lose Influence, spend 3 spice, and gain twice"
                            >
                              <Sparkles size={14} />
                              Both rows
                            </button>
                          </div>
                        </div>
                      )}
                      {isSpecialMissionIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playSpecialMissionPlot(card.id, { kind: "place-spy" })}
                            disabled={plotIntrigueLocked || !specialMissionCanPlaceSpy}
                            title={
                              activePlayer.spies > 0
                                ? "Place 1 spy on a City observation post"
                                : "Recall one of your spies for supply, then place it on a City observation post"
                            }
                          >
                            <Eye size={14} />
                            City Spy
                          </button>
                          {specialMissionCitySpaces.length === 0 && activePlayer.spies > 0 && (
                            <span>No open City spy posts.</span>
                          )}
                          {specialMissionRecallSpaces.map((space) => (
                            <button
                              type="button"
                              key={space.id}
                              onClick={() => playSpecialMissionPlot(card.id, { kind: "recall-spy", spaceId: space.id })}
                              disabled={plotIntrigueLocked}
                              title={`Recall a spy from ${space.name}, remove the Shield Wall, and gain 2 spice`}
                            >
                              <RotateCcw size={14} />
                              {space.name} -&gt; Wall + 2 Spice
                            </button>
                          ))}
                          {specialMissionRecallSpaces.length === 0 && <span>Recall branch requires one of your spies on the board.</span>}
                        </div>
                      )}
                      {isOpportunismIntrigue(card) && (
                        <div className="intrigue-actions">
                          {opportunismChoices.map(([first, second]) => {
                            const lossLabel = first === second
                              ? `2 ${factionShortLabels[first]}`
                              : `${factionShortLabels[first]} + ${factionShortLabels[second]}`;
                            const fullLossLabel = first === second
                              ? `2 ${factionLabels[first]} Influence`
                              : `1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence`;
                            return (
                              <button
                                type="button"
                                key={`${first}-${second}`}
                                onClick={() => playOpportunismPlot(card.id, [first, second])}
                                disabled={plotIntrigueLocked || !opportunismCanPay}
                                title={`Spend 2 Solari and lose ${fullLossLabel} to gain 1 VP`}
                              >
                                <Minus size={14} />
                                2 Solari + {lossLabel} -&gt; VP
                              </button>
                            );
                          })}
                          {opportunismChoices.length === 0 && <span>Requires two Influence to lose.</span>}
                        </div>
                      )}
                      {isImperiumPoliticsIntrigue(card) && (
                        <div className="intrigue-actions">
                          {imperiumPoliticsChoices.map((faction) => {
                            const ownerLabel =
                              activePlayer.role === "Commander" && faction !== "emperor"
                                ? `: ${imperiumPoliticsOwner.leader}`
                                : "";
                            return (
                              <button
                                type="button"
                                key={faction}
                                onClick={() => playImperiumPoliticsPlot(card.id, faction)}
                                disabled={plotIntrigueLocked || !imperiumPoliticsCanPay}
                                title={`Spend 1 Solari to gain 1 ${factionLabels[faction]} Influence${ownerLabel ? ` for ${imperiumPoliticsOwner.leader}` : ""}`}
                              >
                                <HandCoins size={14} />
                                1 Solari -&gt; {factionShortLabels[faction]}{ownerLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {isBuyAccessIntrigue(card) && (
                        <div className="intrigue-actions">
                          {buyAccessChoices.map(([first, second]) => {
                            const personalFaction = activePlayer.role === "Commander"
                              ? activePlayer.team === "muaddib" ? "fremen" : "emperor"
                              : undefined;
                            const buyAccessLabel = activePlayer.role === "Commander"
                              ? [
                                  [first, second].filter((faction) => faction === personalFaction),
                                  [first, second].filter((faction) => faction !== personalFaction),
                                ]
                                .flatMap((factions, index) => {
                                  if (factions.length === 0) return [];
                                  const label = factions.map((faction) => factionShortLabels[faction]).join(" + ");
                                  return index === 0 ? [`Self: ${label}`] : [`${activatedAlly.leader}: ${label}`];
                                })
                                .join(" / ")
                              : `${factionShortLabels[first]} + ${factionShortLabels[second]}`;
                            return (
                              <button
                                type="button"
                                key={`${first}-${second}`}
                                onClick={() => playBuyAccessPlot(card.id, [first, second])}
                                disabled={plotIntrigueLocked || !buyAccessCanPay}
                                title={`Spend 5 Solari to gain 1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence${activePlayer.role === "Commander" ? `; game-board Influence goes to ${activatedAlly.leader}` : ""}`}
                              >
                                <HandCoins size={14} />
                                5 Solari -&gt; {buyAccessLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {isDepartForArrakisIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playDepartForArrakisPlot(card.id, "draw")}
                            disabled={plotIntrigueLocked || !departForArrakisCanDraw}
                            title="Requires 3 Fremen/Fringe Influence"
                          >
                            <BookOpen size={14} />
                            Draw 1
                          </button>
                          <button
                            type="button"
                            onClick={() => playDepartForArrakisPlot(card.id, "spend-spice")}
                            disabled={plotIntrigueLocked || !departForArrakisCanPay}
                            title={departForArrakisCanDraw
                              ? "Spend 2 spice to recruit 3 troops, and draw 1 card"
                              : "Spend 2 spice to recruit 3 troops"}
                          >
                            <Users size={14} />
                            2 Spice -&gt; 3 Troops
                            {departForArrakisOwner.id !== activePlayer.id ? `: ${departForArrakisOwner.leader}` : ""}
                            {departForArrakisCanDraw ? " + Draw" : ""}
                          </button>
                        </div>
                      )}
                      {isCouncilorsAmbitionIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playCouncilorsAmbitionPlot(card.id)}
                          disabled={plotIntrigueLocked || !councilorsAmbitionCanPlay}
                          title="Requires a High Council seat"
                        >
                          <Droplets size={14} />
                          Gain 2 Water
                        </button>
                      )}
                      {isStrategicStockpilingIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playStrategicStockpilingPlot(card.id, "spice")}
                            disabled={plotIntrigueLocked || !strategicStockpilingCanSpice}
                            title="Spend 5 spice to gain 1 VP"
                          >
                            <Sparkles size={14} />
                            5 Spice -&gt; VP
                          </button>
                          <button
                            type="button"
                            onClick={() => playStrategicStockpilingPlot(card.id, "water")}
                            disabled={plotIntrigueLocked || !strategicStockpilingCanWater}
                            title="Requires 3 Spacing Guild Influence; spend 3 water to gain 1 VP"
                          >
                            <Droplets size={14} />
                            3 Water -&gt; VP
                          </button>
                          <button
                            type="button"
                            onClick={() => playStrategicStockpilingPlot(card.id, "both")}
                            disabled={plotIntrigueLocked || !strategicStockpilingCanSpice || !strategicStockpilingCanWater}
                            title="Resolve both Strategic Stockpiling effects"
                          >
                            <Crown size={14} />
                            Both -&gt; 2 VP
                          </button>
                        </div>
                      )}
                      {isShaddamsFavorIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playShaddamsFavorPlot(card.id)}
                          disabled={plotIntrigueLocked}
                          title={shaddamsFavorGainsSolari
                            ? "Recruit 1 troop and gain 3 Solari"
                            : "Recruit 1 troop"}
                        >
                          <Users size={14} />
                          Recruit{activePlayer.role === "Commander" ? `: ${shaddamsFavorOwner.leader}` : ""}
                          {shaddamsFavorGainsSolari ? " + 3 Solari" : ""}
                        </button>
                      )}
                      {isMarketOpportunityIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playMarketOpportunityPlot(card.id, "spice-to-solari")}
                            disabled={plotIntrigueLocked || !marketOpportunityCanSellSpice}
                            title="Spend 2 spice to gain 5 Solari"
                          >
                            <CircleDollarSign size={14} />
                            2 Spice -&gt; 5 Solari
                          </button>
                          <button
                            type="button"
                            onClick={() => playMarketOpportunityPlot(card.id, "solari-to-spice")}
                            disabled={plotIntrigueLocked || !marketOpportunityCanBuySpice}
                            title="Spend 5 Solari to gain 5 spice"
                          >
                            <Sparkles size={14} />
                            5 Solari -&gt; 5 Spice
                          </button>
                        </div>
                      )}
                      {isMercenariesIntrigue(card) && (
                        <button
                          type="button"
                          onClick={() => playMercenariesPlot(card.id)}
                          disabled={plotIntrigueLocked || !mercenariesCanPay}
                          title="Spend 3 Solari to draw 1 Intrigue and recruit 2 troops"
                        >
                          <Users size={14} />
                          Hire Mercs
                          {activePlayer.role === "Commander" ? `: ${mercenariesOwner.leader}` : ""}
                        </button>
                      )}
                      {isBackedByChoamIntrigue(card) && (
                        <div className="intrigue-actions">
                          {backedByChoamPlotChoices.map((faction) => (
                            <button
                              type="button"
                              key={faction}
                              onClick={() => playBackedByChoamPlot(card.id, faction)}
                              disabled={plotIntrigueLocked}
                              title={`Lose 1 ${factionLabels[faction]} Influence to gain 4 Solari`}
                            >
                              <CircleDollarSign size={14} />
                              Lose {factionShortLabels[faction]} -&gt; 4 Solari
                            </button>
                          ))}
                          {backedByChoamPlotChoices.length === 0 && (
                            <button type="button" disabled title="Requires at least 1 Influence">
                              Need Influence
                            </button>
                          )}
                        </div>
                      )}
                      {isDetonationIntrigue(card) && (
                        <div className="intrigue-actions">
                          <button
                            type="button"
                            onClick={() => playDetonation(card.id, "shield-wall")}
                            disabled={plotIntrigueLocked || !game.shieldWall}
                          >
                            <Shield size={14} />
                            Remove Shield Wall
                          </button>
                          <button
                            type="button"
                            onClick={() => playDetonation(card.id, "deploy")}
                            disabled={plotIntrigueLocked || !game.conflict || detonationDeploymentBlocked}
                            title={detonationDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                          >
                            <Swords size={14} />
                            Deploy up to {Math.min(detonationDeployOwner.garrison, 4)}
                          </button>
                        </div>
                      )}
                      {isUnexpectedAlliesIntrigue(card) && (
                        <div className="intrigue-actions">
                          {unexpectedAlliesCanSummonWithoutWall && (
                            <button
                              type="button"
                              onClick={() => playUnexpectedAllies(card.id, false)}
                              disabled={unexpectedAlliesDisabled}
                              title={unexpectedAlliesDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                            >
                              <Sparkles size={14} />
                              Worm{unexpectedAlliesOwner.id !== activePlayer.id ? `: ${unexpectedAlliesOwner.leader}` : ""}
                            </button>
                          )}
                          {game.shieldWall && (
                            <button
                              type="button"
                              onClick={() => playUnexpectedAllies(card.id, true)}
                              disabled={unexpectedAlliesDisabled}
                              title={unexpectedAlliesDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                            >
                              <Shield size={14} />
                              {unexpectedAlliesBlockedByShieldWall ? "Wall + worm" : "Remove wall + worm"}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
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
