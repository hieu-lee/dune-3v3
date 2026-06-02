import { canMoveCardToThroneRow } from "./card-identifiers";
import { resolveCardAcquireEffects, type GameEffectResult } from "./effect-resolver";
import { drawIntrigueCards } from "./intrigue-deck";
import { advancePendingAction, queuePendingActions } from "./pending-actions";
import { defaultActivatedAllyId } from "./placement-rules";
import { pendingActionForSpyPlacements } from "./spy-effect-pending-rules";
import { recordTurnSpiceGain } from "./turn-trackers";
import { trashableCardsForPending } from "./trash-rules";
import type { Card, GameState, PendingAction, Player, ResourceId, Resources } from "./types";

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;
type ThroneRowPendingAction = Extract<PendingAction, { kind: "throne-row" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

const irulanSignetAcquireCost = 1;
const irulanSignetTrashRewardCost = 1;
const irulanSignetTrashRewardSpice = 2;

function resourceLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function addResources(resources: Resources, gain: Partial<Resources>): Resources {
  return {
    ...resources,
    solari: resources.solari + (gain.solari ?? 0),
    spice: resources.spice + (gain.spice ?? 0),
    water: resources.water + (gain.water ?? 0),
  };
}

function formatResourceEntries(resources: Partial<Resources>) {
  return Object.entries(resources)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => `${amount} ${resourceLabel(resource as ResourceId)}`)
    .join(", ");
}

export function acquireRewardParts(reward: GameEffectResult) {
  const parts: string[] = [];
  if (reward.vp > 0) parts.push(`for ${reward.vp} VP`);
  const resourceText = formatResourceEntries(reward.revealGain);
  if (resourceText) parts.push(`gains ${resourceText}`);
  return parts;
}

export function formatAcquireOutcome(parts: string[]) {
  if (parts.length === 0) return "";
  const startsWithVp = parts[0].startsWith("for ");
  const formattedParts = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return startsWithVp ? ` ${formattedParts}` : ` and ${formattedParts}`;
}

export function recordAcquireSpiceGain(state: GameState, playerId: string, reward: GameEffectResult) {
  const spiceGain = reward.revealGain.spice ?? 0;
  return spiceGain > 0 ? recordTurnSpiceGain(state, playerId, spiceGain) : state;
}

export function drawAcquireIntrigues(
  state: GameState,
  playerId: string,
  card: Card,
  acquireReward: GameEffectResult,
) {
  return acquireReward.intriguesToDraw > 0
    ? drawIntrigueCards(state, playerId, acquireReward.intriguesToDraw, card.name)
    : state;
}

export function pendingActionForAcquireSpyReward(
  state: GameState,
  playerId: string,
  card: Card,
  acquireReward: GameEffectResult,
): PendingAction | undefined {
  const owner = state.players.find((player) => player.id === playerId);
  return owner ? pendingActionForSpyPlacements(card.name, owner, acquireReward.spyPlacements, state) : undefined;
}

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

function acquireCardCostBoundIsValid(cost: unknown) {
  return cost === undefined || (typeof cost === "number" && Number.isInteger(cost) && cost >= 0);
}

export function acquireCardPendingIsValid(pending: AcquireCardPendingAction) {
  return (pending.maxCost !== undefined || pending.paymentResource !== undefined)
    && typeof pending.ownerId === "string"
    && typeof pending.source === "string"
    && pending.source.trim().length > 0
    && (pending.destination === "hand" || pending.destination === "discard")
    && (
      pending.paymentResource === undefined ||
      pending.paymentResource === "solari" ||
      pending.paymentResource === "spice" ||
      pending.paymentResource === "water"
    )
    && acquireCardCostBoundIsValid(pending.minCost)
    && acquireCardCostBoundIsValid(pending.maxCost)
    && (pending.minCost === undefined || pending.maxCost === undefined || pending.minCost <= pending.maxCost)
    && (pending.optional === undefined || typeof pending.optional === "boolean");
}

export function addAcquiredCard(
  player: Player,
  card: Card,
  fromReserve: boolean,
  destination: AcquireCardPendingAction["destination"],
  persuasionCost = 0,
  acquireReward: GameEffectResult = resolveCardAcquireEffects(card, player),
): Player {
  const purchaseSequence = player.purchaseSequence + 1;
  const acquiredCard = fromReserve
    ? { ...card, id: `${card.id}-${player.id}-${purchaseSequence}` }
    : card;
  const destinationCards = destination === "hand" ? player.hand : player.discard;
  return {
    ...player,
    resources: addResources(player.resources, acquireReward.revealGain),
    vp: player.vp + acquireReward.vp,
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
  const acquireReward = resolveCardAcquireEffects(card, buyer, state);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === buyer.id) {
      if (manipulatedCard) {
        next = {
          ...next,
          manipulatedCards: next.manipulatedCards.filter((candidate) => candidate.id !== manipulatedCard.id),
        };
      }
      next = addAcquiredCard(next, card, fromReserve, "discard", persuasionCost, acquireReward);
    }
    if (recruitOwner && player.id === recruitOwner.id) next = { ...next, garrison: next.garrison + 1 };
    return next;
  });
  const recruitPart = recruitOwner
    ? recruitOwner.id === buyer.id
      ? "recruits 1 troop"
      : `${recruitOwner.leader} recruits 1 troop`
    : undefined;
  const outcomeText = formatAcquireOutcome([
    ...acquireRewardParts(acquireReward),
    ...(recruitPart ? [recruitPart] : []),
  ]);

  const acquiredStateBase = recordAcquireSpiceGain({
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    log: [
      `${buyer.leader} acquires ${card.name}${outcomeText}.`,
      ...state.log,
    ],
  }, buyer.id, acquireReward);
  const acquiredState = drawAcquireIntrigues(acquiredStateBase, buyer.id, card, acquireReward);
  const acquireSpyPending = pendingActionForAcquireSpyReward(acquiredState, buyer.id, card, acquireReward);
  return {
    ...acquiredState,
    ...queuePendingActions(acquiredState, acquireSpyPending ? [acquireSpyPending] : []),
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
  if (!owner || !acquireCardPendingIsValid(pending)) return [];
  const minCost = pending.minCost ?? 0;
  const affordable = (card: Card) => {
    const cost = card.cost ?? 0;
    const withinPendingCost = cost >= minCost && (pending.maxCost === undefined || cost <= pending.maxCost);
    const hasPaymentResource = pending.paymentResource === undefined || owner.resources[pending.paymentResource] >= cost;
    return withinPendingCost && hasPaymentResource;
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
