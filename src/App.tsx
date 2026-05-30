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
import { boardSpaces, iconLabels, teams } from "./game/data";
import {
  advancePendingAction,
  advanceSeat,
  allPlayersDone,
  applyBoardEffect,
  canPay,
  collectChoamContractFallback,
  defaultActivatedAllyId,
  drawIntrigueCards,
  effectiveCost,
  iconCanReach,
  initialGame,
  pendingActionForCard,
  pendingActionsFor,
  pendingActionForSpace,
  queuePendingActions,
  startNextRound,
  takeChoamContract,
  transferTradeGood,
  updateTradeSelection,
} from "./game/state";
import type { BoardSpace, Card, GameState, Player, ResourceId, Resources, TeamId, TradeGoodId } from "./game/types";

const resources: Array<{ id: ResourceId; label: string; Icon: LucideIcon }> = [
  { id: "solari", label: "Solari", Icon: CircleDollarSign },
  { id: "spice", label: "Spice", Icon: Sparkles },
  { id: "water", label: "Water", Icon: Droplets },
];

const tradeGoods: Array<{ id: TradeGoodId; label: string; Icon: LucideIcon }> = [
  ...resources,
  { id: "intrigue", label: "Intrigue", Icon: Eye },
];

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
    if (!selectedCard || activePlayer.agentsReady <= 0 || game.pendingAction) return new Set<string>();
    return new Set(
      boardSpaces
        .filter((space) => !game.spaces[space.id])
        .filter((space) => iconCanReach(selectedCard, space, activePlayer, game.swordmasterClaimed, game.spyPosts))
        .filter((space) => canPay(activePlayer, effectiveCost(space, game.players)))
        .map((space) => space.id),
    );
  }, [activePlayer, game.pendingAction, game.players, game.spaces, game.spyPosts, game.swordmasterClaimed, selectedCard]);

  const canPlayAgent = Boolean(selectedCard && selectedSpace && legalSpaces.has(selectedSpace.id) && !game.pendingAction);

  function playAgent() {
    if (!canPlayAgent || !selectedCard || !selectedSpace) return;
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
      const cardPending = pendingActionForCard(selectedCard, source);
      const pending = queuePendingActions(
        current,
        pendingActionsFor(spacePending, cardPending, source.spies),
      );
      const nextState: GameState = {
        ...current,
        players,
        spaces: { ...current.spaces, [selectedSpace.id]: target.id },
        swordmasterClaimed: current.swordmasterClaimed || selectedSpace.id === "swordmaster",
        ...pending,
        log: [
          selectedCard.trashOnPlay
            ? `${player.leader} trashes ${selectedCard.name}.`
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
      if (allPlayersDone(resolvedState.players)) return startNextRound(resolvedState);
      return { ...resolvedState, activeSeat: advanceSeat(resolvedState) };
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function revealTurn() {
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
      const players = current.players.map((candidate, index) => {
        if (index === current.activeSeat) {
          return {
            ...candidate,
            revealed: true,
            agentsReady: 0,
            resources: addResources(candidate.resources, revealGain),
            persuasion,
            conflict: candidate.role === "Commander" ? candidate.conflict : candidate.conflict + swords,
            playArea: [...candidate.playArea, ...candidate.hand],
            hand: [],
          };
        }
        if (candidate.id === targetId && player.role === "Commander") {
          return { ...candidate, conflict: candidate.conflict + swords };
        }
        return candidate;
      });
      const target = current.players.find((candidate) => candidate.id === targetId);
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
            ? `${player.leader} reveals for ${persuasion} persuasion${revealGainLabel(revealGain)} and gives ${swords} strength to ${target?.leader ?? "an Ally"}.`
            : `${player.leader} reveals for ${persuasion} persuasion, ${swords} strength${revealGainLabel(revealGain)}.`,
          ...current.log,
        ],
      };
    });
  }

  function buyCard(card: Card) {
    if (game.pendingAction) return;
    if (!activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)) return;
    setGame((current) => {
      const fromReserve = current.reserveMarket.some((candidate) => candidate.id === card.id);
      const [replacement, ...marketDeckAfterDraw] = current.marketDeck;
      const marketDeck = fromReserve ? current.marketDeck : marketDeckAfterDraw;
      const imperiumRow = fromReserve
        ? current.imperiumRow
        : current.imperiumRow.filter((candidate) => candidate.id !== card.id).concat(replacement ? [replacement] : []);
      const players = current.players.map((player, index) =>
        index === current.activeSeat
          ? acquireCard(player, card, fromReserve)
          : player,
      );
      return {
        ...current,
        players,
        imperiumRow,
        marketDeck,
        log: [
          `${activePlayer.leader} acquires ${card.name}${card.acquired ? ` for ${card.acquired} VP` : ""}.`,
          ...current.log,
        ],
      };
    });
  }

  function endReveal() {
    if (game.pendingAction) return;
    if (!activePlayer.revealed) return;
    setGame((current) => {
      if (allPlayersDone(current.players)) return startNextRound(current);
      return { ...current, activeSeat: advanceSeat(current) };
    });
    setSelectedCardId(null);
    setSelectedSpaceId(null);
  }

  function clearPendingAction() {
    setGame((current) => ({ ...current, ...advancePendingAction(current) }));
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
      return {
        ...current,
        players,
        spyPosts: { ...current.spyPosts, [space.id]: owner.id },
        ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(current)),
        log: [`${owner.leader} places a spy near ${space.name} from ${pending.source}.`, ...current.log],
      };
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
        ? Math.max(-pending.strengthAdjustment, strengthDelta)
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

  function finishRevealAdjustment() {
    if (game.pendingAction?.kind !== "reveal-adjust") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "reveal-adjust") return current;
      return {
        ...current,
        ...advancePendingAction(current),
        log: [
          `Printed reveal adjustment resolved: ${signed(pending.persuasionAdjustment)} persuasion, ${signed(pending.strengthAdjustment)} strength.`,
          ...current.log,
        ],
      };
    });
  }

  function deployOne() {
    if (game.pendingAction?.kind !== "deploy") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "deploy") return current;
      const owner = current.players.find((player) => player.id === pending.ownerId);
      if (!owner || owner.garrison <= 0 || pending.remaining <= 0) return { ...current, pendingAction: undefined };
      const players = current.players.map((player) =>
        player.id === pending.ownerId
          ? { ...player, garrison: player.garrison - 1, conflict: player.conflict + 2 }
          : player,
      );
      const remaining = pending.remaining - 1;
      return {
        ...current,
        players,
        ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(current)),
        log: [`${owner.leader} deploys 1 troop from ${pending.source}.`, ...current.log],
      };
    });
  }

  function reinforceOne(playerId: string, destination: "garrison" | "conflict") {
    if (game.pendingAction?.kind !== "reinforce") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "reinforce" || pending.remaining <= 0) return current;
      const recipient = current.players.find((player) => player.id === playerId);
      if (!recipient || recipient.team !== pending.team || recipient.role !== "Ally") return current;
      const players = current.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              garrison: destination === "garrison" ? player.garrison + 1 : player.garrison,
              conflict: destination === "conflict" ? player.conflict + 2 : player.conflict,
            }
          : player,
      );
      const remaining = pending.remaining - 1;
      return {
        ...current,
        players,
        ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(current)),
        log: [`${recipient.leader} receives Military Support into ${destination}.`, ...current.log],
      };
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
      return takeChoamContract(current, pending, contractId);
    });
  }

  function collectContractFallback() {
    if (game.pendingAction?.kind !== "contract") return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== "contract") return current;
      return collectChoamContractFallback(current, pending);
    });
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
  const shaddamCommander = game.players.find((player) => player.team === "shaddam" && player.role === "Commander");
  const reservedContractChoices = pendingContractOwner?.reservedContracts ?? [];
  const revealAdjustOwner =
    pendingAction?.kind === "reveal-adjust" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const revealAdjustRecipient =
    pendingAction?.kind === "reveal-adjust"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const tradePartners =
    pendingActor && pendingAction?.kind === "trade"
      ? game.players.filter((player) => player.team === pendingActor.team && player.id !== pendingActor.id)
      : [];
  const tradeLocked = pendingAction?.kind === "trade" && pendingAction.actorGiven + pendingAction.partnerGiven > 0;
  const reinforceAllies =
    pendingAction?.kind === "reinforce"
      ? game.players.filter((player) => player.team === pendingAction.team && player.role === "Ally")
      : [];
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
          <span>Round {game.round}</span>
          <strong>{activePlayer.leader}</strong>
          <small>{activePlayer.agentsReady > 0 ? "Agent turn" : "Reveal turn"}</small>
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
                    <span className="conflict-level">
                      Conflict {game.conflict.level} - {game.conflictDeck.length} queued
                    </span>
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
              const selected = selectedSpaceId === space.id;
              return (
                <button
                  key={space.id}
                  className={`space-tile ${legal ? "legal" : ""} ${selected ? "selected" : ""} ${occupant || unavailable ? "occupied" : ""}`}
                  type="button"
                  onClick={() => setSelectedSpaceId(space.id)}
                  title={space.detail}
                >
                  <span className="space-zone">{space.zone}</span>
                  {space.thumbnailPath && <img className="space-art" src={space.thumbnailPath} alt="" loading="lazy" />}
                  <strong>{space.name}</strong>
                  <small>{iconLabels[space.icon]}</small>
                  <span className="space-detail">{space.detail}</span>
                  {spyOwner && <span className="spy-marker">{spyOwner.leader} spy</span>}
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
                <span>{player.conflict} strength</span>
                <span>{player.spies} spies</span>
                <span>{player.intrigues.length} intrigue</span>
                <span>{player.contracts.length} contracts</span>
                {player.reservedContracts.length > 0 && <span>{player.reservedContracts.length} reserved</span>}
              </div>
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
                <button type="button" onClick={finishRevealAdjustment}>Done</button>
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
              <button type="button" onClick={revealTurn} disabled={activePlayer.revealed || Boolean(game.pendingAction)}>
                <BookOpen size={17} />
                Reveal
              </button>
              <button type="button" onClick={endReveal} disabled={!activePlayer.revealed || Boolean(game.pendingAction)}>
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
                className={`hand-card ${selectedCardId === card.id ? "selected" : ""}`}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
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
                    <span>Intrigue</span>
                    <strong>{card.name}</strong>
                    <p>{card.summary}</p>
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
                disabled={Boolean(game.pendingAction) || !activePlayer.revealed || activePlayer.persuasion < (card.cost ?? 0)}
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

function acquireCard(player: Player, card: Card, fromReserve: boolean): Player {
  const purchaseSequence = player.purchaseSequence + 1;
  const acquiredCard = fromReserve
    ? { ...card, id: `${card.id}-${player.id}-${purchaseSequence}` }
    : card;
  return {
    ...player,
    vp: player.vp + (card.acquired ?? 0),
    persuasion: player.persuasion - (card.cost ?? 0),
    purchaseSequence,
    discard: [...player.discard, acquiredCard],
  };
}

function canPlaceSpyPost(space: BoardSpace, owner: Player, game: GameState) {
  if (game.spyPosts[space.id]) return false;
  if (space.id === "swordmaster" && game.swordmasterClaimed) return false;
  if (!space.personal) return true;
  return owner.role === "Commander" && owner.team === space.personal;
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}
