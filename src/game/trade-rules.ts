import {
  resolveAgentTrashSourceForTrades,
} from "./effect-resolver";
import { advancePendingAction } from "./pending-actions";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { GameState, PendingAction, Player, ResourceId, TradeGoodId } from "./types";

type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;
type TrashSourceForTradePendingAction = Extract<PendingAction, { kind: "trash-source-for-trade" }>;

const supportedTradeGoods = new Set<TradeGoodId>(["solari", "spice", "water", "intrigue"]);

function pendingTradePartnerIds(pending: TrashSourceForTradePendingAction) {
  return Array.isArray(pending.partnerIds) ? pending.partnerIds : [];
}

function pendingTradeSourceIsValid(pending: TrashSourceForTradePendingAction) {
  return typeof pending.source === "string" && pending.source.trim().length > 0;
}

function pendingTradeOptionalIsValid(pending: TrashSourceForTradePendingAction) {
  return pending.optional === true;
}

function pendingTradePartnerLockedIsValid(pending: TrashSourceForTradePendingAction) {
  return pending.partnerLocked === undefined || typeof pending.partnerLocked === "boolean";
}

function sourceCardSupportsPendingTrade(
  state: GameState,
  pending: TrashSourceForTradePendingAction,
  owner: Player,
  partner: Player,
) {
  const sourceCard = owner.playArea.find((card) => card.id === pending.cardId);
  if (!sourceCard?.effects) return false;
  return resolveAgentTrashSourceForTrades(sourceCard.effects, {
    trigger: "agent-play",
    source: owner,
    target: partner,
    state,
  }).some((effect) =>
    effect.selector === "self" &&
    effect.partner === "same-team-allies" &&
    effect.resource === pending.resource &&
    effect.optional === pending.optional &&
    effect.partnerLocked === (pending.partnerLocked === true) &&
    (effect.source ?? sourceCard.name) === pending.source
  );
}

export function resolveTrashSourceForTradeChoice(
  state: GameState,
  pending: TrashSourceForTradePendingAction,
  partnerId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const partner = state.players.find((player) => player.id === partnerId);
  const partnerIds = pendingTradePartnerIds(pending);
  const partnerIdSet = new Set(partnerIds);
  const partners = partnerIds.map((candidateId) => state.players.find((player) => player.id === candidateId));
  if (
    !owner ||
    owner.role !== "Commander" ||
    !partner ||
    partner.team !== owner.team ||
    partner.role !== "Ally" ||
    !partnerIdSet.has(partner.id) ||
    partnerIds.length !== 2 ||
    partnerIdSet.size !== partnerIds.length ||
    partners.some((candidate) => !candidate || candidate.team !== owner.team || candidate.role !== "Ally") ||
    !supportedTradeGoods.has(pending.resource) ||
    !pendingTradeOptionalIsValid(pending) ||
    !pendingTradePartnerLockedIsValid(pending) ||
    !pendingTradeSourceIsValid(pending) ||
    !sourceCardSupportsPendingTrade(state, pending, owner, partner)
  ) {
    return state;
  }

  const players = state.players.map((player) =>
    player.id === owner.id
      ? { ...player, playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
      : player,
  );
  const tradePending: PendingAction = {
    kind: "trade",
    actorId: owner.id,
    partnerId: partner.id,
    resource: pending.resource,
    actorGiven: 0,
    partnerGiven: 0,
    ...(pending.partnerLocked ? { partnerLocked: true } : {}),
    source: pending.source,
  };

  return {
    ...state,
    players,
    pendingAction: tradePending,
    log: [
      `${owner.leader} trashes ${pending.source} to trade with ${partner.leader}.`,
      ...state.log,
    ],
  };
}

export function skipTrashSourceForTrade(
  state: GameState,
  pending: TrashSourceForTradePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (
    !supportedTradeGoods.has(pending.resource) ||
    !pendingTradeOptionalIsValid(pending) ||
    !pendingTradePartnerLockedIsValid(pending) ||
    !pendingTradeSourceIsValid(pending)
  ) {
    return state;
  }
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} keeps ${pending.source} and declines to trade.`, ...state.log],
  };
}

export function defaultTradePartnerId(player: Player, target: Player, players: Player[]) {
  if (player.role === "Commander" && target.id !== player.id) return target.id;
  return players.find((candidate) => candidate.team === player.team && candidate.id !== player.id)?.id ?? target.id;
}

export function updateTradeSelection(
  state: GameState,
  pending: TradePendingAction,
  resource: TradeGoodId,
  partnerId?: string,
): GameState {
  const nextPartnerId = partnerId ?? pending.partnerId;
  const actor = state.players.find((player) => player.id === pending.actorId);
  const partner = state.players.find((player) => player.id === nextPartnerId);
  if (!actor || !partner || actor.id === partner.id || actor.team !== partner.team) return state;
  if (pending.partnerLocked && nextPartnerId !== pending.partnerId) return state;

  const transfersStarted = pending.actorGiven + pending.partnerGiven > 0;
  const selectionChanged = resource !== pending.resource || nextPartnerId !== pending.partnerId;
  if (transfersStarted && selectionChanged) return state;

  return {
    ...state,
    pendingAction: {
      ...pending,
      resource,
      partnerId: nextPartnerId,
      actorGiven: selectionChanged ? 0 : pending.actorGiven,
      partnerGiven: selectionChanged ? 0 : pending.partnerGiven,
    },
  };
}

export function transferTradeGood(
  state: GameState,
  pending: TradePendingAction,
  fromId: string,
  toId: string,
  intrigueId?: string,
): GameState {
  const from = state.players.find((player) => player.id === fromId);
  const to = state.players.find((player) => player.id === toId);
  if (!from || !to) return state;
  if (![pending.actorId, pending.partnerId].includes(fromId) || ![pending.actorId, pending.partnerId].includes(toId)) {
    return state;
  }
  if (fromId === toId) return state;
  if (from.team !== to.team) return state;

  const actorMoved = fromId === pending.actorId;
  const pendingAction = {
    ...pending,
    actorGiven: pending.actorGiven + (actorMoved ? 1 : 0),
    partnerGiven: pending.partnerGiven + (actorMoved ? 0 : 1),
  };

  if (pending.resource === "intrigue") {
    if (!intrigueId) return state;
    const card = from.intrigues.find((intrigue) => intrigue.id === intrigueId);
    if (!card) return state;
    const players = state.players.map((player) => {
      if (player.id === fromId) {
        return { ...player, intrigues: player.intrigues.filter((intrigue) => intrigue.id !== card.id) };
      }
      if (player.id === toId) {
        return { ...player, intrigues: [...player.intrigues, card] };
      }
      return player;
    });
    return {
      ...state,
      players,
      pendingAction,
      log: [`${from.leader} trades ${card.name} to ${to.leader}.`, ...state.log],
    };
  }

  const resource: ResourceId = pending.resource;
  if (from.resources[resource] <= 0) return state;
  const players = state.players.map((player) => {
    if (player.id === fromId) {
      return { ...player, resources: { ...player.resources, [resource]: player.resources[resource] - 1 } };
    }
    if (player.id === toId) {
      return { ...player, resources: { ...player.resources, [resource]: player.resources[resource] + 1 } };
    }
    return player;
  });
  const nextState = {
    ...state,
    players,
    pendingAction,
    log: [`${from.leader} trades 1 ${resource} to ${to.leader}.`, ...state.log],
  };
  return resource === "spice" ? recordTurnSpiceGain(nextState, toId, 1) : nextState;
}
