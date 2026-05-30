import {
  BookOpen,
  CircleDollarSign,
  Crown,
  Droplets,
  Eye,
  FileText,
  HandCoins,
  Hexagon,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
  Swords,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Fragment, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { battleIconLabels, boardSpaces, factionIds, factionLabels, iconLabels, teams } from "./game/data";
import {
  advanceSeat,
  acquireMarketCard,
  allPlayersDone,
  applyBoardEffect,
  boardSpaceRewardApplies,
  canPlaceSpyPost,
  canMoveCardToThroneRow,
  canPay,
  collectChoamContractFallback,
  collectMakerSpice,
  combatIntrigueStrength,
  combatIntrigueTargets,
  conflictProtectedByShieldWall,
  defaultActivatedAllyId,
  deployTroopToConflict,
  drawIntrigueCards,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  effectiveCost,
  effectiveEmperorIconInfluence,
  effectiveRequirementInfluence,
  finishEndgame,
  finishPendingAction,
  finishRevealTurn,
  finishRevealAdjustment as resolveRevealAdjustment,
  iconCanReach,
  initialGame,
  influenceLossChoices,
  influenceLossOptions,
  isBackedByChoamIntrigue,
  isCallToArmsIntrigue,
  isContingencyPlanIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDevourIntrigue,
  isDetonationIntrigue,
  isFindWeaknessIntrigue,
  isGoToGroundIntrigue,
  isIntelligenceReportIntrigue,
  isMarketOpportunityIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isShaddamsFavorIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isStrategicStockpilingIntrigue,
  isTacticalOptionIntrigue,
  isUnexpectedAlliesIntrigue,
  isWeirdingCombatIntrigue,
  loseInfluenceForPending,
  maybeStartCombatPhase,
  passCombatIntrigue,
  pendingActionForCard,
  pendingActionForMakerChoice,
  pendingActionForSietchTabr,
  pendingActionsFor,
  pendingActionForSpace,
  playerDoublesConflictRewards,
  playCombatIntrigue,
  placeSpyForPending,
  queuePendingActions,
  recallableSpySpaces,
  recallSpyForPending,
  reinforceTroop,
  moveImperiumCardToThroneRow,
  resolveConflictTie,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  canHaveMakerHooks,
  playerHasConflictUnits,
  setMakerHooks,
  setShieldWall,
  setAllianceOwner,
  setChoamContractCompleted,
  playBackedByChoamPlotIntrigue,
  playCallToArmsPlotIntrigue,
  playContingencyPlanPlotIntrigue,
  playCouncilorsAmbitionPlotIntrigue,
  playDetonationIntrigue,
  playIntelligenceReportPlotIntrigue,
  playMarketOpportunityPlotIntrigue,
  playPlotBattleIconIntrigue,
  playShaddamsFavorPlotIntrigue,
  playStrategicStockpilingPlotIntrigue,
  playUnexpectedAlliesIntrigue,
  resolveMakerChoice,
  resolveSietchTabrChoice,
  skipLoseInfluence,
  skipRecallSpy,
  skipTrashCard,
  startNextRound,
  takeChoamContract,
  trashableCards,
  trashPlayerCard,
  transferTradeGood,
  updateTradeSelection,
} from "./game/state";
import type { BoardSpace, Card, FactionId, GameState, Player, ResourceId, Resources, TeamId, TradeGoodId, TrashCardZone } from "./game/types";
import type { CombatIntrigueChoice } from "./game/state";

const resources: Array<{ id: ResourceId; label: string; Icon: LucideIcon }> = [
  { id: "solari", label: "Solari", Icon: CircleDollarSign },
  { id: "spice", label: "Spice", Icon: Sparkles },
  { id: "water", label: "Water", Icon: Droplets },
];

const tradeGoods: Array<{ id: TradeGoodId; label: string; Icon: LucideIcon }> = [
  ...resources,
  { id: "intrigue", label: "Intrigue", Icon: Eye },
];

const factionShortLabels: Record<FactionId, string> = {
  emperor: "EMP",
  spacing: "SG",
  bene: "BG",
  fremen: "FRE",
  greatHouses: "GH",
  fringeWorlds: "FW",
};

export function revealPersuasionFor(player: Player) {
  const highCouncilPersuasion = player.highCouncilSeat ? 2 : 0;
  return player.hand.reduce((sum, card) => sum + card.persuasion, 0) + highCouncilPersuasion;
}

export function boardSpaceIntrigueGainFor(space: BoardSpace, player: Player) {
  return boardSpaceRewardApplies(space, player) ? space.gain?.intrigue ?? 0 : 0;
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => initialGame());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [commanderTargets, setCommanderTargets] = useState<Record<string, string>>({});
  const leaderDialogRef = useRef<HTMLElement | null>(null);
  const leaderCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const leaderOpenerRef = useRef<HTMLButtonElement | null>(null);
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

  useEffect(() => {
    if (!selectedLeaderId) return;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    window.setTimeout(() => leaderCloseButtonRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLeaderReference();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(leaderDialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        leaderDialogRef.current?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedLeaderId]);

  const legalSpaces = useMemo(() => {
    if (game.phase !== "playing" || !selectedCard || activePlayer.agentsReady <= 0 || game.pendingAction) return new Set<string>();
    return new Set(
      boardSpaces
        .filter((space) => !game.spaces[space.id])
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts, game.players))
        .filter((space) => canPay(activePlayer, effectiveCost(space, game.players)))
        .map((space) => space.id),
    );
  }, [activePlayer, game.pendingAction, game.phase, game.players, game.spaces, game.spyPosts, game.swordmasterClaimed, selectedCard]);

  const canPlayAgent = Boolean(game.phase === "playing" && selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && !game.pendingAction);

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
      const sietchTabrPending = pendingActionForSietchTabr(current, selectedSpace, makerChoiceOwner, player);
      const { source, target: effectedTarget } = applyBoardEffect(
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
      const players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) return source;
        if (candidate.id === effectedTarget.id) return effectedTarget;
        return candidate;
      });
      const spacePending = sietchTabrPending
        ? undefined
        : pendingActionForSpace(
          selectedSpace,
          source,
          player.role === "Commander" ? effectedTarget : source,
          players,
        );
      const cardPending = pendingActionForCard(selectedCard, source, current);
      const pendingActions = pendingActionsFor(spacePending, cardPending, source.spies);
      if (sietchTabrPending) pendingActions.unshift(sietchTabrPending);
      if (makerChoicePending) pendingActions.unshift(makerChoicePending);
      const pending = queuePendingActions(
        current,
        pendingActions,
      );
      const nextState: GameState = {
        ...current,
        players,
        spaces: { ...current.spaces, [selectedSpace.id]: target.id },
        makerSpice: collectMakerSpice(current, selectedSpace),
        swordmasterClaimed: current.swordmasterClaimed || selectedSpace.id === "swordmaster",
        ...pending,
        log: [
          selectedCard.trashOnPlay
            ? `${player.leader} trashes ${selectedCard.name}.`
            : undefined,
          makerBonus > 0
            ? `${player.leader} collects ${makerBonus} bonus spice from ${selectedSpace.name}.`
            : undefined,
          player.role === "Commander"
            ? `${player.leader} activates ${target.leader} at ${selectedSpace.name} with ${selectedCard.name}.`
            : `${player.leader} sends an Agent to ${selectedSpace.name} with ${selectedCard.name}.`,
          ...current.log,
        ].filter((entry): entry is string => Boolean(entry)),
      };
      const intrigueGain = boardSpaceIntrigueGainFor(selectedSpace, player);
      const resolvedState = intrigueGain > 0
        ? drawIntrigueCards(nextState, source.id, intrigueGain, selectedSpace.name)
        : nextState;
      if (allPlayersDone(resolvedState.players)) return maybeStartCombatPhase(resolvedState);
      return { ...resolvedState, activeSeat: advanceSeat(resolvedState) };
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function revealTurn() {
    if (game.phase !== "playing") return;
    if (game.pendingAction) return;
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
      return {
        ...current,
        players,
        pendingAction:
          printedRevealCards.length > 0
            ? {
                kind: "reveal-adjust",
                ownerId: player.id,
                combatRecipientId: player.role === "Commander" ? targetId : player.id,
                cards: printedRevealCards,
                persuasionAdjustment: 0,
                strengthAdjustment: 0,
                source: "Printed reveal",
              }
            : current.pendingAction,
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
    });
  }

  function buyCard(card: Card) {
    if (game.phase !== "playing") return;
    if (game.pendingAction || game.pendingQueue.length > 0) return;
    if (!activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)) return;
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

  function deployOne() {
    if (game.pendingAction?.kind !== "deploy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "deploy") return current;
      return maybeStartCombatPhase(deployTroopToConflict(current, pending));
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
      if (current.pendingAction?.kind === "maker-choice" || current.pendingAction?.kind === "sietch-tabr") return current;
      return setMakerHooks(current, playerId, hasHooks);
    });
  }

  function updateShieldWall(standing: boolean) {
    setGame((current) => {
      if (current.pendingAction?.kind === "maker-choice" || current.pendingAction?.kind === "sietch-tabr") return current;
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
      return playUnexpectedAlliesIntrigue(current, player.id, intrigueId, removeShieldWall, sandwormOwnerId);
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

  const teamScores = (["muaddib", "shaddam"] as TeamId[]).map((team) => ({
    team,
    vp: game.players.filter((player) => player.team === team).reduce((sum, player) => sum + player.vp, 0),
    conflict: game.players
      .filter((player) => player.team === team)
      .reduce((sum, player) => sum + player.conflict, 0),
  }));
  const sandwormRewardDoublers = game.conflict ? game.players.filter(playerDoublesConflictRewards) : [];
  const sandwormRewardLabel = sandwormRewardDoublers.map((player) => player.leader).join(", ");
  const pendingAction = game.pendingAction;
  const tableStateLockedByPending = pendingAction?.kind === "maker-choice" || pendingAction?.kind === "sietch-tabr";
  const pendingOwner = pendingAction?.kind === "deploy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingActor = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.actorId) : undefined;
  const pendingPartner = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.partnerId) : undefined;
  const pendingSpyOwner = pendingAction?.kind === "spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingContractOwner =
    pendingAction?.kind === "contract" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
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
  const pendingThroneOwner =
    pendingAction?.kind === "throne-row" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashOwner =
    pendingAction?.kind === "trash-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashChoices = pendingTrashOwner ? trashableCards(pendingTrashOwner) : [];
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
  const shaddamCommander = game.players.find((player) => player.team === "shaddam" && player.role === "Commander");
  const reservedContractChoices = pendingContractOwner?.reservedContracts ?? [];
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
      ? game.players.filter((player) => player.team === pendingActor.team && player.id !== pendingActor.id)
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
  const shaddamsFavorOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const currentConflictProtected = conflictProtectedByShieldWall(game.conflict);
  const unexpectedAlliesCanPay = activePlayer.resources.water >= 2;
  const unexpectedAlliesBlockedByShieldWall = Boolean(game.conflict && game.shieldWall && currentConflictProtected);
  const unexpectedAlliesCanSummonWithoutWall = Boolean(game.conflict && (!game.shieldWall || !currentConflictProtected));
  const unexpectedAlliesDisabled = plotIntrigueLocked || !game.conflict || !unexpectedAlliesCanPay;
  const spyPlacementSpaces = pendingSpyOwner
    ? boardSpaces.filter((space) => canPlaceSpyPost(game, space, pendingSpyOwner))
    : [];

  return (
    <main className="app-shell">
      <section className="command-bar">
        <div>
          <p className="eyebrow">Six-player team table</p>
          <h1>Dune: Imperium - Uprising 3v3</h1>
        </div>
        <div className="round-panel">
          <span>{game.phase === "playing" ? `Round ${game.round}` : game.phase}</span>
          <strong>
            {game.phase === "playing" || game.phase === "combat"
              ? activePlayer.leader
              : game.winningTeam
                ? `${teams[game.winningTeam].name} wins`
                : "Team scores"}
          </strong>
          <small>
            {game.phase === "playing"
              ? activePlayer.agentsReady > 0 ? "Agent turn" : "Reveal turn"
              : game.phase === "combat"
                ? "Combat Intrigues"
                : game.endgameReason}
          </small>
        </div>
        <button className="icon-button" type="button" onClick={resetGame} title="Reset table">
          <RotateCcw size={18} />
        </button>
      </section>

      <section className="table-grid">
        <aside className="team-column">
          {teamScores.map(({ team, vp, conflict }) => (
            <article className="team-card" key={team} style={{ "--accent": teams[team].accent } as CSSProperties}>
              <div className="team-heading">
                <Crown size={18} />
                <div>
                  <h2>{teams[team].name}</h2>
                  <p>{teams[team].motto}</p>
                </div>
              </div>
              <div className="team-metrics">
                <span>{vp} VP</span>
                <span>{conflict} strength</span>
              </div>
            </article>
          ))}
          <article className="conflict-card">
            {game.conflict ? (
              <>
                {game.conflict.thumbnailPath && <img className="conflict-art" src={game.conflict.thumbnailPath} alt="" />}
                <div className="team-heading">
                  <Swords size={18} />
                  <div>
                    <div className="conflict-meta">
                      <span className="conflict-level">
                        Conflict {game.conflict.level} - {game.conflictDeck.length} queued
                      </span>
                      <span className="battle-icon-chip" title="Battle icon">
                        {battleIconLabels[game.conflict.battleIcon]}
                      </span>
                    </div>
                    <h2>{game.conflict.name}</h2>
                    <p>{game.conflict.stakes}</p>
                  </div>
                </div>
                <div className="conflict-rewards">
                  {game.conflict.rewards.slice(0, 6).map((reward, index) => (
                    <span key={`${reward}-${index}`}>{reward}</span>
                  ))}
                </div>
                {sandwormRewardDoublers.length > 0 && (
                  <div
                    className="sandworm-reward-note"
                    role="note"
                    title="Double printed Conflict-card rewards taken by these players. Battle icons and location control are not doubled."
                  >
                    <Sparkles size={14} />
                    <span>2x printed rewards: {sandwormRewardLabel}; battle icons and location control are not doubled</span>
                  </div>
                )}
              </>
            ) : (
              <div className="team-heading">
                <Swords size={18} />
                <div>
                  <span className="conflict-level">Conflict deck exhausted</span>
                  <h2>No Conflict Remaining</h2>
                  <p>The nine-card six-player conflict stack has been resolved.</p>
                </div>
              </div>
            )}
            <div className="shield-state">
              <Shield size={16} />
              <label
                className={[game.shieldWall ? "selected" : "", tableStateLockedByPending ? "disabled" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="checkbox"
                  checked={game.shieldWall}
                  disabled={tableStateLockedByPending}
                  aria-label="Shield Wall standing"
                  onChange={(event) => updateShieldWall(event.currentTarget.checked)}
                />
                <span>Shield Wall {game.shieldWall ? "standing" : "removed"}</span>
              </label>
            </div>
          </article>
          <article className="choam-card">
            <div className="team-heading">
              <FileText size={18} />
              <div>
                <span className="conflict-level">{game.contractOffer.length + game.contractDeck.length} public contracts</span>
                <h2>CHOAM Contracts</h2>
                <p>Take a face-up contract from contract spaces.</p>
              </div>
            </div>
            <div className="contract-offer">
              {game.contractOffer.map((contract) => (
                <div className="contract-preview" key={contract.id}>
                  {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                  <strong>{contract.name}</strong>
                </div>
              ))}
              {game.contractOffer.length === 0 && <p>Contract spaces pay 2 Solari.</p>}
            </div>
            {shaddamCommander && shaddamCommander.reservedContracts.length > 0 && (
              <div className="contract-reserve">
                <span>Sardaukar reserve</span>
                <div className="contract-offer">
                  {shaddamCommander.reservedContracts.map((contract) => (
                    <div className="contract-preview" key={contract.id}>
                      {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                      <strong>{contract.name}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
          <article className="intrigue-deck-card">
            <div className="team-heading">
              <Eye size={18} />
              <div>
                <span className="conflict-level">{game.intrigueDeck.length} cards queued</span>
                <h2>Intrigue Deck</h2>
                <p>Board spaces draw physical Intrigue cards into the owning player's hand.</p>
              </div>
            </div>
            <div className="team-metrics">
              <span>{game.intrigueDeck.length} deck</span>
              <span>{game.intrigueDiscard.length} discard</span>
            </div>
          </article>
        </aside>

        <section className="board-panel" aria-label="Six-player board spaces">
          <div className="board-header">
            <div>
              <p className="eyebrow">6p board side</p>
              <h2>Agent Placement</h2>
            </div>
            <div className="legend">
              <span><Hexagon size={14} /> legal</span>
              <span><Users size={14} /> team</span>
              <span><Swords size={14} /> combat</span>
            </div>
          </div>

          <div className="space-grid">
            {boardSpaces.map((space) => {
              const occupant = game.players.find((player) => player.id === game.spaces[space.id]);
              const spyOwner = game.players.find((player) => player.id === game.spyPosts[space.id]);
              const unavailable = space.id === "swordmaster" && game.swordmasterClaimed;
              const legal = legalSpaces.has(space.id);
              const selected = playingPhase && selectedSpaceId === space.id;
              return (
                <button
                  key={space.id}
                  className={`space-tile ${legal ? "legal" : ""} ${selected ? "selected" : ""} ${occupant || unavailable ? "occupied" : ""}`}
                  type="button"
                  onClick={() => playingPhase && setSelectedSpaceId(space.id)}
                  disabled={!playingPhase}
                  title={space.detail}
                >
                  <span className="space-zone">{space.zone}</span>
                  {space.thumbnailPath && <img className="space-art" src={space.thumbnailPath} alt="" loading="lazy" />}
                  <strong>{space.name}</strong>
                  <small>{iconLabels[space.icon]}</small>
                  <span className="space-detail">{space.detail}</span>
                  {spyOwner && <span className="spy-marker">{spyOwner.leader} spy</span>}
                  {space.maker && (
                    <span className="maker-marker">
                      <Sparkles size={12} />
                      {game.makerSpice[space.id] ?? 0} bonus
                    </span>
                  )}
                  <span className="space-footer">
                    {space.combat && <Swords size={14} />}
                    {space.team && <Users size={14} />}
                    {space.contract && <FileText size={14} />}
                    {occupant ? occupant.leader : unavailable ? "Claimed" : costLabel(effectiveCost(space, game.players))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="player-column">
          {game.players.map((player, index) => (
            <article
              className={`player-card ${index === game.activeSeat ? "active" : ""}`}
              key={player.id}
              style={{ "--player": player.color } as CSSProperties}
            >
              <div className="player-identity">
                {player.leaderCard.thumbnailPath && (
                  <button
                    className="leader-art-button"
                    type="button"
                    onClick={(event) => openLeaderReference(player.id, event.currentTarget)}
                    aria-label={`View ${player.leader} leader card`}
                    title={`View ${player.leader} leader card`}
                  >
                    <img className="leader-art" src={player.leaderCard.thumbnailPath} alt="" loading="eager" />
                  </button>
                )}
                <div className="player-topline">
                  <span>{player.name}</span>
                  <strong>{player.leader}</strong>
                  <small>{player.role} - {teams[player.team].name}</small>
                </div>
              </div>
              <div className="resource-row">
                {resources.map(({ id, label, Icon }) => (
                  <span key={id} title={label}>
                    <Icon size={14} />
                    {player.resources[id]}
                  </span>
                ))}
              </div>
              <div className="mini-stats">
                <span>{player.agentsReady}/{player.agentsTotal} {player.role === "Commander" ? "activations" : "agents"}</span>
                <span>{player.garrison} garrison</span>
                {player.deployedTroops > 0 && <span>{player.deployedTroops} deployed</span>}
                {player.deployedSandworms > 0 && <span>{player.deployedSandworms} worms</span>}
                {game.conflict && playerDoublesConflictRewards(player) && (
                  <span
                    className="sandworm-reward-chip"
                    role="note"
                    aria-label="Double printed Conflict-card rewards. Battle icons and location control are not doubled."
                    title="Double printed Conflict-card rewards. Battle icons and location control are not doubled."
                  >
                    2x printed rewards only
                  </span>
                )}
                <span>{player.conflict} strength</span>
                {player.highCouncilSeat && <span>High Council</span>}
                {player.makerHooks && <span>Maker Hooks</span>}
                <span>{player.spies} spies</span>
                <span>{player.intrigues.length} intrigue</span>
                <span>{player.contracts.length} contracts</span>
                {player.wonConflicts.length > 0 && <span>{player.wonConflicts.length} conflicts</span>}
                {player.reservedContracts.length > 0 && <span>{player.reservedContracts.length} reserved</span>}
              </div>
              {player.objectives.length > 0 && (
                <div className="objective-row">
                  {player.objectives.map((objective) => (
                    <span className={objective.scored ? "scored" : ""} key={objective.id} title={objective.name}>
                      {battleIconLabels[objective.battleIcon]}
                      {objective.firstPlayer ? " - first" : ""}
                    </span>
                  ))}
                </div>
              )}
              {player.wonConflicts.length > 0 && (
                <div className="objective-row conflict-supply-row">
                  {player.wonConflicts.map((conflict) => (
                    <span className={conflict.scored ? "scored" : ""} key={conflict.id} title={conflict.name}>
                      {battleIconLabels[conflict.battleIcon]}
                    </span>
                  ))}
                </div>
              )}
              <div className="alliance-status-row" aria-label={`${player.leader} alliance tokens`}>
                {factionIds.map((faction) => {
                  const ownsAlliance = game.alliances[faction] === player.id;
                  return (
                    <label className={ownsAlliance ? "selected" : ""} key={faction} title={`${factionLabels[faction]} Alliance`}>
                      <input
                        type="checkbox"
                        checked={ownsAlliance}
                        aria-label={`${factionLabels[faction]} Alliance`}
                        onChange={(event) => updateAllianceOwner(player.id, faction, event.currentTarget.checked)}
                      />
                      <span>{factionShortLabels[faction]}</span>
                    </label>
                  );
                })}
              </div>
              {canHaveMakerHooks(player) && (
                <div className="alliance-status-row" aria-label={`${player.leader} Maker Hooks`}>
                  <label
                    className={[player.makerHooks ? "selected" : "", tableStateLockedByPending ? "disabled" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    title="Maker Hooks"
                  >
                    <input
                      type="checkbox"
                      checked={player.makerHooks}
                      disabled={tableStateLockedByPending}
                      aria-label="Maker Hooks"
                      onChange={(event) => updateMakerHooks(player.id, event.currentTarget.checked)}
                    />
                    <span>Hooks</span>
                  </label>
                </div>
              )}
              {player.contracts.length > 0 && (
                <div className="contract-status-row">
                  {player.contracts.map((contract) => (
                    <label className={contract.completed ? "completed" : ""} key={contract.card.id} title={contract.card.name}>
                      <input
                        type="checkbox"
                        checked={contract.completed}
                        onChange={(event) =>
                          updateContractCompleted(player.id, contract.card.id, event.currentTarget.checked)
                        }
                      />
                      <span>{contract.card.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </article>
          ))}
        </aside>
      </section>

      {selectedLeader && (
        <div className="modal-backdrop" role="presentation" onClick={closeLeaderReference}>
          <article
            className="leader-modal"
            ref={leaderDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedLeader.leader} leader card`}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">{selectedLeader.role} - {teams[selectedLeader.team].name}</p>
                <h2>{selectedLeader.leader}</h2>
              </div>
              <button
                className="icon-button"
                ref={leaderCloseButtonRef}
                type="button"
                onClick={closeLeaderReference}
                title="Close leader card"
              >
                <X size={18} />
              </button>
            </header>
            {selectedLeader.leaderCard.imagePath ? (
              <img
                className="leader-reference-art"
                src={selectedLeader.leaderCard.imagePath}
                alt={`${selectedLeader.leader} leader card`}
              />
            ) : (
              <p>Leader card art is unavailable.</p>
            )}
          </article>
        </div>
      )}

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
                    {goToGroundCard
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
                {pendingAction.kind === "reinforce" && `Military Support - ${pendingAction.remaining} troops`}
                {pendingAction.kind === "trade" && `Trade from ${pendingAction.source}`}
                {pendingAction.kind === "spy" && `Spy placement - ${pendingAction.remaining}`}
                {pendingAction.kind === "reveal-adjust" && "Printed reveal adjustment"}
                {pendingAction.kind === "contract" && `${pendingContractOwner?.leader ?? "Player"} CHOAM contract`}
                {pendingAction.kind === "maker-choice" && `${pendingMakerLabel ?? "Player"} Maker space`}
                {pendingAction.kind === "sietch-tabr" && `${pendingSietchLabel ?? "Player"} Sietch Tabr`}
                {pendingAction.kind === "throne-row" && `${pendingThroneOwner?.leader ?? "Shaddam"} Throne Row`}
                {pendingAction.kind === "trash-card" && `${pendingTrashOwner?.leader ?? "Player"} optional trash`}
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

            {pendingAction.kind === "spy" && pendingSpyOwner && (
              <div className="pending-controls spy-grid">
                <span>{pendingSpyOwner.leader}: {pendingSpyOwner.spies} spies ready</span>
                {spyPlacementSpaces.map((space) => (
                  <button type="button" key={space.id} onClick={() => placeSpy(space.id)}>
                    {space.name}
                  </button>
                ))}
                <button type="button" onClick={clearPendingAction}>Done</button>
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
                <button type="button" onClick={skipTrash}>Skip</button>
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

            {pendingAction.kind === "reinforce" && (
              <div className="pending-controls support-grid">
                {reinforceAllies.map((ally) => (
                  <div className="support-target" key={ally.id}>
                    <strong>{ally.leader}</strong>
                    <button type="button" onClick={() => reinforceOne(ally.id, "garrison")}>Garrison</button>
                    <button type="button" onClick={() => reinforceOne(ally.id, "conflict")}>Conflict</button>
                  </div>
                ))}
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
                {game.contractOffer.length === 0 && reservedContractChoices.length === 0 && (
                  <button type="button" onClick={collectContractFallback}>
                    <CircleDollarSign size={15} />
                    Collect 2 Solari
                  </button>
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

        <div className="hand-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Active hand</p>
              <h2>{activePlayer.leader}</h2>
            </div>
            <div className="turn-actions">
              <button type="button" className="primary-action" onClick={playAgent} disabled={!canPlayAgent}>
                <HandCoins size={17} />
                Place Agent
              </button>
              <button type="button" onClick={revealTurn} disabled={!playingPhase || activePlayer.revealed || Boolean(game.pendingAction)}>
                <BookOpen size={17} />
                Reveal
              </button>
              <button type="button" onClick={endReveal} disabled={!playingPhase || !activePlayer.revealed || Boolean(game.pendingAction)}>
                <SkipForward size={17} />
                End
              </button>
            </div>
          </div>
          {activePlayer.role === "Commander" && (
            <div className="activation-strip">
              <span>Activating</span>
              {activeAllies.map((ally) => (
                <button
                  type="button"
                  key={ally.id}
                  className={activatedAlly.id === ally.id ? "selected" : ""}
                  disabled={!playingPhase || activePlayer.revealed}
                  onClick={() =>
                    setCommanderTargets((current) => ({
                      ...current,
                      [activePlayer.id]: ally.id,
                    }))
                  }
                >
                  {ally.leader}
                </button>
              ))}
            </div>
          )}
          <div className="card-row">
            {activePlayer.hand.map((card) => (
              <button
                type="button"
                className={`hand-card ${playingPhase && selectedCardId === card.id ? "selected" : ""}`}
                key={card.id}
                onClick={() => playingPhase && setSelectedCardId(card.id)}
                disabled={!playingPhase}
              >
                {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                <span>{card.icons.map((icon) => iconLabels[icon]).join(" / ") || "Reveal"}</span>
                <strong>{card.name}</strong>
                <p>{card.play}</p>
                <footer>
                  <span><BookOpen size={13} /> {card.persuasion}</span>
                  <span><Swords size={13} /> {card.swords}</span>
                  {(card.conditionalPersuasion || card.conditionalSwords) && <span>Printed</span>}
                </footer>
              </button>
            ))}
          </div>
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
                  const intelligenceReportDrawCount = boardSpaces.filter((space) =>
                    game.spyPosts[space.id] === activePlayer.id
                  ).length >= 2 ? 2 : 1;
                  const councilorsAmbitionCanPlay = activePlayer.highCouncilSeat;
                  const strategicStockpilingCanSpice = activePlayer.resources.spice >= 5;
                  const strategicStockpilingCanWater =
                    activePlayer.resources.water >= 3 &&
                    effectiveRequirementInfluence(activePlayer, "spacing", game.players) >= 3;
                  const shaddamsFavorGainsSolari = effectiveEmperorIconInfluence(activePlayer, game.players) >= 3;
                  const marketOpportunityCanSellSpice = activePlayer.resources.spice >= 2;
                  const marketOpportunityCanBuySpice = activePlayer.resources.solari >= 5;
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
                          : isCouncilorsAmbitionIntrigue(card)
                            ? "Plot / High Council water"
                          : isStrategicStockpilingIntrigue(card)
                            ? "Plot / spend stockpiles for VP"
                          : isShaddamsFavorIntrigue(card)
                            ? `Plot / recruit${shaddamsFavorGainsSolari ? " / 3 Solari" : ""}`
                          : isMarketOpportunityIntrigue(card)
                            ? "Plot / exchange spice and Solari"
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
                            disabled={plotIntrigueLocked || !game.conflict}
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
        </div>

        <div className="market-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Imperium row</p>
              <h2>Acquire After Reveal</h2>
            </div>
            <strong className="persuasion">{activePlayer.persuasion} persuasion</strong>
          </div>
          <div className="market-row">
            {[...game.imperiumRow, ...game.reserveMarket].map((card) => (
              <button
                type="button"
                className="market-card"
                key={card.id}
                onClick={() => buyCard(card)}
                disabled={!playingPhase || pendingLocked || !activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)}
              >
                {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                <span>
                  {card.cost} persuasion
                  {card.acquired ? ` - ${card.acquired} VP` : ""}
                  {(card.conditionalPersuasion || card.conditionalSwords) ? " - printed reveal" : ""}
                </span>
                <strong>{card.name}</strong>
                <p>{card.conditionalPersuasion || card.conditionalSwords ? "Resolve the printed reveal text on the card." : card.reveal}</p>
              </button>
            ))}
          </div>
          {game.throneRow.length > 0 && (
            <section className="throne-market">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Shaddam team market</p>
                  <h2>Throne Row</h2>
                </div>
                <span>{game.throneRow.length} held</span>
              </div>
              <div className="market-row throne-row">
                {game.throneRow.map((card) => (
                  <button
                    type="button"
                    className="market-card throne-card"
                    key={card.id}
                    onClick={() => buyCard(card)}
                    disabled={
                      !playingPhase ||
                      pendingLocked ||
                      !activePlayer.revealed ||
                      activePlayer.team !== "shaddam" ||
                      activePlayer.persuasion < (card.cost ?? 0)
                    }
                  >
                    {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                    <span>{card.cost} persuasion</span>
                    <strong>{card.name}</strong>
                    <p>{card.conditionalPersuasion || card.conditionalSwords ? "Resolve the printed reveal text on the card." : card.reveal}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="log-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Table log</p>
              <h2>Recent Actions</h2>
            </div>
          </div>
          <ol>
            {game.log.slice(0, 5).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function costLabel(cost?: Partial<Resources>) {
  if (!cost || Object.keys(cost).length === 0) return "Free";
  return Object.entries(cost)
    .map(([key, value]) => `${value} ${key}`)
    .join(", ");
}

function addResources(resources: Resources, gain: Partial<Resources>) {
  const next = { ...resources };
  Object.entries(gain).forEach(([key, value]) => {
    next[key as ResourceId] += value ?? 0;
  });
  return next;
}

function revealGainLabel(gain: Partial<Resources>) {
  const entries = Object.entries(gain).filter(([, value]) => (value ?? 0) > 0);
  if (entries.length === 0) return "";
  return ` and gains ${entries.map(([key, value]) => `${value} ${key}`).join(", ")}`;
}
