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
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { battleIconLabels, boardSpaces, factionIds, factionLabels, iconLabels, teams } from "./game/data";
import {
  advancePendingAction,
  advanceSeat,
  acquireMarketCard,
  allPlayersDone,
  applyBoardEffect,
  canMoveCardToThroneRow,
  canPay,
  collectChoamContractFallback,
  collectMakerSpice,
  combatIntrigueTargets,
  defaultActivatedAllyId,
  deployTroopToConflict,
  drawIntrigueCards,
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  effectiveCost,
  finishEndgame,
  finishRevealAdjustment as resolveRevealAdjustment,
  iconCanReach,
  initialGame,
  maybeStartCombatPhase,
  passCombatIntrigue,
  pendingActionForCard,
  pendingActionsFor,
  pendingActionForSpace,
  playCombatIntrigue,
  queuePendingActions,
  reinforceTroop,
  moveImperiumCardToThroneRow,
  resolveConflictTie,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
  setAllianceOwner,
  setChoamContractCompleted,
  playPlotBattleIconIntrigue,
  startCombatPhase,
  startNextRound,
  takeChoamContract,
  transferTradeGood,
  updateTradeSelection,
} from "./game/state";
import type { BoardSpace, Card, FactionId, GameState, Player, ResourceId, Resources, TeamId, TradeGoodId } from "./game/types";

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
  const activatedAlly =
    activePlayer.role === "Commander"
      ? activeAllies.find((player) => player.id === commanderTargets[activePlayer.id]) ?? activeAllies[0]
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
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts))
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
          ? commanderTargets[player.id] ?? defaultActivatedAllyId(player, current.players)
          : player.id;
      const target = current.players.find((candidate) => candidate.id === targetId) ?? player;
      const hand = player.hand.filter((card) => card.id !== selectedCard.id);
      const playArea = selectedCard.trashOnPlay ? player.playArea : [...player.playArea, selectedCard];
      const cost = effectiveCost(selectedSpace, current.players);
      const makerBonus = selectedSpace.maker ? current.makerSpice[selectedSpace.id] ?? 0 : 0;
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
      );
      const players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) return source;
        if (candidate.id === effectedTarget.id) return effectedTarget;
        return candidate;
      });
      const spacePending = pendingActionForSpace(
        selectedSpace,
        source,
        player.role === "Commander" ? effectedTarget : source,
        players,
      );
      const cardPending = pendingActionForCard(selectedCard, source, current);
      const pending = queuePendingActions(
        current,
        pendingActionsFor(spacePending, cardPending, source.spies),
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
      const intrigueGain = selectedSpace.gain?.intrigue ?? 0;
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
    const persuasion = activePlayer.hand.reduce((sum, card) => sum + card.persuasion, 0);
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
          ? commanderTargets[player.id] ?? defaultActivatedAllyId(player, current.players)
          : player.id;
      const target = current.players.find((candidate) => candidate.id === targetId);
      const combatRecipient = player.role === "Commander" ? target : player;
      const combatSwords = combatRecipient && combatRecipient.deployedTroops > 0 ? swords : 0;
      const players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) {
          return {
            ...candidate,
            revealed: true,
            agentsReady: 0,
            resources: addResources(candidate.resources, revealGain),
            persuasion,
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
    if (game.pendingAction) return;
    if (!activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)) return;
    setGame((current) => {
      const buyer = current.players[current.activeSeat];
      return acquireMarketCard(current, buyer.id, card.id);
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
      if (allPlayersDone(current.players)) return startCombatPhase(current);
      return { ...current, activeSeat: advanceSeat(current) };
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function clearPendingAction() {
    setGame((current) => maybeStartCombatPhase({ ...current, ...advancePendingAction(current) }));
  }

  function placeSpy(spaceId: string) {
    if (game.pendingAction?.kind !== "spy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "spy" || pending.remaining <= 0) return current;
      const owner = current.players.find((player) => player.id === pending.ownerId);
      const space = boardSpaces.find((candidate) => candidate.id === spaceId);
      if (!owner || !space || owner.spies <= 0 || !canPlaceSpyPost(space, owner, current)) return current;
      const nextSpies = owner.spies - 1;
      const players = current.players.map((player) =>
        player.id === owner.id ? { ...player, spies: nextSpies } : player,
      );
      const remaining = Math.min(pending.remaining - 1, nextSpies);
      const nextState = {
        ...current,
        players,
        spyPosts: { ...current.spyPosts, [space.id]: owner.id },
        ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(current)),
        log: [`${owner.leader} places a spy near ${space.name} from ${pending.source}.`, ...current.log],
      };
      return maybeStartCombatPhase(nextState);
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
        ? Math.max(-pending.strengthAdjustment, recipient.deployedTroops > 0 ? strengthDelta : Math.min(0, strengthDelta))
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

  function chooseConflictTieWinner(winnerId?: string) {
    if (game.pendingAction?.kind !== "conflict-tie") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "conflict-tie") return current;
      return startNextRound(resolveConflictTie(current, pending, winnerId));
    });
  }

  function playCombatCard(intrigueId: string, targetId?: string) {
    if (game.phase !== "combat") return;
    setGame((current) => playCombatIntrigue(current, current.players[current.activeSeat].id, intrigueId, targetId));
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
  const pendingAction = game.pendingAction;
  const pendingOwner = pendingAction?.kind === "deploy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingActor = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.actorId) : undefined;
  const pendingPartner = pendingAction?.kind === "trade" ? game.players.find((player) => player.id === pendingAction.partnerId) : undefined;
  const pendingSpyOwner = pendingAction?.kind === "spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingContractOwner =
    pendingAction?.kind === "contract" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingThroneOwner =
    pendingAction?.kind === "throne-row" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
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
  const combatCards = combatActor?.intrigues.filter((card) => card.combatSwords || card.automatedCombatSwords) ?? [];
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
  const spyPlacementSpaces = pendingSpyOwner
    ? boardSpaces.filter((space) => canPlaceSpyPost(space, pendingSpyOwner, game))
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
              Shield Wall {game.shieldWall ? "standing" : "removed"}
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
                <span>{player.conflict} strength</span>
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
        {game.phase === "combat" && combatActor && (
          <div className="pending-panel combat-panel">
            <div>
              <p className="eyebrow">Combat Intrigues</p>
              <h2>{combatActor.leader}</h2>
            </div>
            <div className="pending-controls support-grid combat-grid">
              {combatCards.map((card) => (
                <div className="support-target combat-target" key={card.id}>
                  <strong>{card.name}</strong>
                  <span>
                    <Swords size={14} />
                    +{card.automatedCombatSwords ?? card.combatSwords} strength
                  </span>
                  {card.automatedCombatSwords
                    ? combatTargets.map((target) => (
                        <button
                          type="button"
                          key={target.id}
                          onClick={() => playCombatCard(card.id, target.id)}
                          title={`Play ${card.name} for ${target.leader}`}
                        >
                          {combatActor.role === "Commander" ? target.leader : "Play"}
                        </button>
                      ))
                    : <span>Resolve printed card text.</span>}
                </div>
              ))}
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
                {pendingAction.kind === "throne-row" && `${pendingThroneOwner?.leader ?? "Shaddam"} Throne Row`}
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
                  disabled={!playingPhase}
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
                {activePlayer.intrigues.map((card) => (
                  <article className="intrigue-card" key={card.id}>
                    {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                    <span>
                      {card.battleIcon
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
                        disabled={!playingPhase || Boolean(game.pendingAction)}
                      >
                        <Sparkles size={14} />
                        Gain Plot Spice
                      </button>
                    )}
                  </article>
                ))}
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
                disabled={!playingPhase || Boolean(game.pendingAction) || !activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)}
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
                      Boolean(game.pendingAction) ||
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

function canPlaceSpyPost(space: BoardSpace, owner: Player, game: GameState) {
  if (game.spyPosts[space.id]) return false;
  if (space.id === "swordmaster" && game.swordmasterClaimed) return false;
  if (!space.personal) return true;
  return owner.role === "Commander" && owner.team === space.personal;
}
