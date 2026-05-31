import { recordTurnSpiceGain } from "./turn-trackers";
import type { GameState, PendingAction, Player, ResourceId, TradeGoodId } from "./types";

type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;

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
