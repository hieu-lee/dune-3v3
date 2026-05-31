import { canMoveCardToThroneRow } from "./card-identifiers";
import { advancePendingAction } from "./pending-actions";
import { defaultActivatedAllyId } from "./placement-rules";
import { trashableCardsForPending } from "./trash-rules";
import type { Card, GameState, PendingAction, Player } from "./types";

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;
type ThroneRowPendingAction = Extract<PendingAction, { kind: "throne-row" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

const irulanSignetAcquireCost = 1;
const irulanSignetTrashRewardCost = 1;
const irulanSignetTrashRewardSpice = 2;

export function manipulateAcquisitionCost(card: Card) {
  return Math.max(0, (card.cost ?? 0) - 1);
}

export function irulanSignetAcquirePending(ownerId: string): AcquireCardPendingAction {
  return {
    kind: "acquire-card",
    ownerId,
    source: "Chronicler's Insight",
    minCost: irulanSignetAcquireCost,
    maxCost: irulanSignetAcquireCost,
    destination: "hand",
  };
}

export function irulanSignetTrashPending(ownerId: string): TrashCardPendingAction {
  return {
    kind: "trash-card",
    ownerId,
    source: "Chronicler's Insight",
    optional: false,
    zones: ["hand"],
    spiceRewardCostThreshold: irulanSignetTrashRewardCost,
    spiceReward: irulanSignetTrashRewardSpice,
  };
}

export function addAcquiredCard(
  player: Player,
  card: Card,
  fromReserve: boolean,
  destination: AcquireCardPendingAction["destination"],
  persuasionCost = 0,
): Player {
  const purchaseSequence = player.purchaseSequence + 1;
  const acquiredCard = fromReserve
    ? { ...card, id: `${card.id}-${player.id}-${purchaseSequence}` }
    : card;
  const destinationCards = destination === "hand" ? player.hand : player.discard;
  return {
    ...player,
    vp: player.vp + (card.acquired ?? 0),
    persuasion: player.persuasion - persuasionCost,
    purchaseSequence,
    ...(destination === "hand"
      ? { hand: [...destinationCards, acquiredCard] }
      : { discard: [...destinationCards, acquiredCard] }),
  };
}

export function activatedAllyEffectOwner(state: GameState, player: Player, ownerId?: string) {
  if (player.role !== "Commander") return { valid: true, owner: player };
  const lockedOwnerId = player.revealed ? player.revealActivatedAllyId : undefined;
  if (lockedOwnerId && ownerId && ownerId !== lockedOwnerId) {
    return { valid: false, owner: undefined };
  }
  const resolvedOwnerId = lockedOwnerId ?? ownerId ?? defaultActivatedAllyId(player, state.players);
  const owner = state.players.find(
    (candidate) =>
      candidate.id === resolvedOwnerId &&
      candidate.team === player.team &&
      candidate.role === "Ally",
  );
  return { valid: Boolean(owner), owner };
}

export function callToArmsRecruitOwner(state: GameState, buyer: Player, recruitOwnerId?: string) {
  if (!buyer.callToArmsActive) return { valid: true, owner: undefined };
  if (buyer.role !== "Commander") return { valid: true, owner: buyer };
  return activatedAllyEffectOwner(state, buyer, recruitOwnerId);
}

export function acquireMarketCard(
  state: GameState,
  buyerId: string,
  cardId: string,
  callToArmsRecruitOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const buyer = state.players[state.activeSeat];
  if (!buyer || buyer.id !== buyerId || !buyer.revealed) return state;

  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = state.throneRow.find((card) => card.id === cardId);
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const rowCard = rowIndex >= 0 ? state.imperiumRow[rowIndex] : undefined;
  const manipulatedIndex = buyer.manipulatedCards.findIndex((card) => card.id === cardId);
  const manipulatedCard = manipulatedIndex >= 0 ? buyer.manipulatedCards[manipulatedIndex] : undefined;
  const card = reserveCard ?? throneCard ?? rowCard ?? manipulatedCard;
  const persuasionCost = manipulatedCard ? manipulateAcquisitionCost(manipulatedCard) : card?.cost ?? 0;
  if (!card || buyer.persuasion < persuasionCost) return state;
  if (throneCard && buyer.team !== "shaddam") return state;

  const fromReserve = Boolean(reserveCard);
  const [replacement, ...marketDeckAfterDraw] = state.marketDeck;
  const marketDeck = rowCard ? marketDeckAfterDraw : state.marketDeck;
  const imperiumRow = rowCard
    ? state.imperiumRow.flatMap((candidate, index) => {
        if (index !== rowIndex) return [candidate];
        return replacement ? [replacement] : [];
      })
    : state.imperiumRow;
  const throneRow = throneCard ? state.throneRow.filter((candidate) => candidate.id !== card.id) : state.throneRow;
  const callToArmsRecruit = callToArmsRecruitOwner(state, buyer, callToArmsRecruitOwnerId);
  if (!callToArmsRecruit.valid) return state;
  const recruitOwner = callToArmsRecruit.owner;
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === buyer.id) {
      if (manipulatedCard) {
        next = {
          ...next,
          manipulatedCards: next.manipulatedCards.filter((candidate) => candidate.id !== manipulatedCard.id),
        };
      }
      next = addAcquiredCard(next, card, fromReserve, "discard", persuasionCost);
    }
    if (recruitOwner && player.id === recruitOwner.id) next = { ...next, garrison: next.garrison + 1 };
    return next;
  });
  const recruitText = recruitOwner
    ? recruitOwner.id === buyer.id
      ? " and recruits 1 troop"
      : ` and ${recruitOwner.leader} recruits 1 troop`
    : "";

  return {
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    log: [
      `${buyer.leader} acquires ${card.name}${card.acquired ? ` for ${card.acquired} VP` : ""}${recruitText}.`,
      ...state.log,
    ],
  };
}

export function moveImperiumCardToThroneRow(
  state: GameState,
  pending: ThroneRowPendingAction,
  cardId: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.team !== "shaddam" || owner.role !== "Commander") return state;

  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const card = state.imperiumRow[rowIndex];
  if (!card || !canMoveCardToThroneRow(card)) return state;

  const [replacement, ...marketDeck] = state.marketDeck;
  const imperiumRow = state.imperiumRow.flatMap((candidate, index) => {
    if (index !== rowIndex) return [candidate];
    return replacement ? [replacement] : [];
  });

  return {
    ...state,
    imperiumRow,
    marketDeck,
    throneRow: [...state.throneRow, card],
    ...advancePendingAction(state),
    log: [`${owner.leader} moves ${card.name} to the Throne Row from ${pending.source}.`, ...state.log],
  };
}

export function acquirableCardsForPending(state: GameState, pending: AcquireCardPendingAction) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return [];
  const minCost = pending.minCost ?? 0;
  const affordable = (card: Card) => {
    const cost = card.cost ?? 0;
    return cost >= minCost && cost <= pending.maxCost;
  };
  return [
    ...state.imperiumRow.filter(affordable),
    ...state.reserveMarket.filter(affordable),
    ...(owner.team === "shaddam" ? state.throneRow.filter(affordable) : []),
  ];
}

export function irulanSignetAcquireCards(state: GameState, pending: IrulanSignetRingPendingAction) {
  return acquirableCardsForPending(state, irulanSignetAcquirePending(pending.ownerId));
}

export function irulanSignetTrashableCards(state: GameState, pending: IrulanSignetRingPendingAction) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return owner ? trashableCardsForPending(owner, irulanSignetTrashPending(owner.id)) : [];
}
