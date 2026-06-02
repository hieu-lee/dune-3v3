import {
  factionLabels,
} from "./data";
import {
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import {
  isBackedByChoamIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDepartForArrakisIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
  isShaddamsFavorIntrigue,
  isStrategicStockpilingIntrigue,
} from "./card-identifiers";
import {
  influenceLossChoices,
} from "./influence-choices";
import {
  drawCards,
} from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  adjustInfluence,
} from "./leader-rewards";
import {
  activatedAllyEffectOwner,
} from "./market-rules";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import {
  recordTurnSpiceGain,
} from "./turn-trackers";
import type {
  FactionId,
  GameState,
} from "./types";

export type DepartForArrakisChoice = "draw" | "spend-spice";
export type StrategicStockpilingChoice = "spice" | "water" | "both";
export type MarketOpportunityChoice = "spice-to-solari" | "solari-to-spice";

export function playDepartForArrakisPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: DepartForArrakisChoice,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDepartForArrakisIntrigue(intrigue)) return state;
  if (choice !== "draw" && choice !== "spend-spice") return state;

  const canDraw = effectiveFremenIconInfluence(player, state.players) >= 3;
  const spendsSpice = choice === "spend-spice";
  if (choice === "draw" && !canDraw) return state;
  if (spendsSpice && player.resources.spice < 2) return state;

  const troopOwnerResult = spendsSpice
    ? activatedAllyEffectOwner(state, player, troopOwnerId)
    : { valid: true, owner: undefined };
  if (!troopOwnerResult.valid) return state;
  const troopOwner = troopOwnerResult.owner;

  let cardsDrawn = 0;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: {
          ...next.resources,
          spice: next.resources.spice - (spendsSpice ? 2 : 0),
        },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
      if (canDraw) {
        const drawn = drawCards(next, next.hand.length + 1);
        cardsDrawn = drawn.hand.length - next.hand.length;
        next = drawn;
      }
    }
    if (spendsSpice && troopOwner && candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 3 };
    }
    return next;
  });

  const cardText = cardsDrawn === 1 ? "1 card" : `${cardsDrawn} cards`;
  const drawText = canDraw ? `draws ${cardText}` : "";
  const troopLabel = troopOwner && troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const troopText = spendsSpice ? `spends 2 spice and recruits 3 troops${troopLabel}` : "";
  const joiner = canDraw && spendsSpice ? ", " : "";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Depart For Arrakis, ${drawText}${joiner}${troopText}.`,
      ...state.log,
    ],
  };
}

export function playCouncilorsAmbitionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isCouncilorsAmbitionIntrigue,
    (player) => `${player.leader} plays Councilor's Ambition and gains 2 water.`,
  );
}

export function playMercenariesPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isMercenariesIntrigue(intrigue) || player.resources.solari < 3) return state;

  const troopOwnerResult = activatedAllyEffectOwner(state, player, troopOwnerId);
  if (!troopOwnerResult.valid || !troopOwnerResult.owner) return state;
  const troopOwner = troopOwnerResult.owner;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 3 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 2 };
    }
    return next;
  });
  const troopLabel = troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const drawnState = drawIntrigueCards(
    {
      ...state,
      players,
    },
    player.id,
    1,
    "Mercenaries",
  );
  return {
    ...drawnState,
    intrigueDiscard: [...drawnState.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Mercenaries${troopLabel}, spends 3 Solari, and recruits 2 troops.`,
      ...drawnState.log,
    ],
  };
}

export function playStrategicStockpilingPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: StrategicStockpilingChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isStrategicStockpilingIntrigue(intrigue)) return state;

  const spendSpice = choice === "spice" || choice === "both";
  const spendWater = choice === "water" || choice === "both";
  if (!spendSpice && !spendWater) return state;
  if (spendSpice && player.resources.spice < 5) return state;
  if (
    spendWater &&
    (player.resources.water < 3 || effectiveRequirementInfluence(player, "spacing", state.players) < 3)
  ) {
    return state;
  }

  const vp = (spendSpice ? 1 : 0) + (spendWater ? 1 : 0);
  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          vp: candidate.vp + vp,
          resources: {
            ...candidate.resources,
            spice: candidate.resources.spice - (spendSpice ? 5 : 0),
            water: candidate.resources.water - (spendWater ? 3 : 0),
          },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  const paymentText = spendSpice && spendWater
    ? "spends 5 spice and 3 water"
    : spendSpice
      ? "spends 5 spice"
      : "spends 3 water";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Strategic Stockpiling, ${paymentText}, and gains ${vp} VP.`,
      ...state.log,
    ],
  };
}

export function playShaddamsFavorPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isShaddamsFavorIntrigue(intrigue)) return state;

  const troopOwnerResult = activatedAllyEffectOwner(state, player, troopOwnerId);
  if (!troopOwnerResult.valid || !troopOwnerResult.owner) return state;
  const troopOwner = troopOwnerResult.owner;

  const gainsSolari = effectiveEmperorIconInfluence(player, state.players) >= 3;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: {
          ...next.resources,
          solari: next.resources.solari + (gainsSolari ? 3 : 0),
        },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 1 };
    }
    return next;
  });
  const troopLabel = troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const solariLabel = gainsSolari ? " and gains 3 Solari" : "";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Shaddam's Favor${troopLabel}, recruits 1 troop${solariLabel}.`,
      ...state.log,
    ],
  };
}

export function playMarketOpportunityPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: MarketOpportunityChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isMarketOpportunityIntrigue(intrigue)) return state;
  if (choice !== "spice-to-solari" && choice !== "solari-to-spice") return state;
  if (choice === "spice-to-solari" && player.resources.spice < 2) return state;
  if (choice === "solari-to-spice" && player.resources.solari < 5) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    const resources = { ...candidate.resources };
    if (choice === "spice-to-solari") {
      resources.spice -= 2;
      resources.solari += 5;
    } else {
      resources.solari -= 5;
      resources.spice += 5;
    }
    return {
      ...candidate,
      resources,
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
    };
  });
  const logText = choice === "spice-to-solari"
    ? `${player.leader} plays Market Opportunity, spends 2 spice, and gains 5 Solari.`
    : `${player.leader} plays Market Opportunity, spends 5 Solari, and gains 5 spice.`;
  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [logText, ...state.log],
  };
  return choice === "solari-to-spice" ? recordTurnSpiceGain(nextState, player.id, 5) : nextState;
}

export function playBackedByChoamPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  faction: FactionId,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isBackedByChoamIntrigue(intrigue) || !influenceLossChoices(player).includes(faction)) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    const influenced = adjustInfluence(candidate, faction, -1);
    return {
      ...influenced,
      resources: { ...influenced.resources, solari: influenced.resources.solari + 4 },
      intrigues: influenced.intrigues.filter((card) => card.id !== intrigue.id),
    };
  });
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Backed by CHOAM as a Plot Intrigue, loses 1 ${factionLabels[faction]} Influence, and gains 4 Solari.`,
      ...state.log,
    ],
  };
}
