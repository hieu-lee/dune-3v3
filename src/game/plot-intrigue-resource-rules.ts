import {
  factionLabels,
} from "./data";
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
  adjustInfluence,
} from "./leader-rewards";
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
  if (choice !== "draw" && choice !== "spend-spice") return state;
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isDepartForArrakisIntrigue,
    (player, _contractPending, activatedAlly, resolved, outcome) => {
      const drawsCards = resolved.cardsToDraw > 0;
      const spendsSpice = (resolved.spentResources.spice ?? 0) > 0;
      const cardText = outcome.cardsDrawn === 1 ? "1 card" : `${outcome.cardsDrawn} cards`;
      const drawText = drawsCards ? `draws ${cardText}` : "";
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      const troopText = spendsSpice ? `spends 2 spice and recruits 3 troops${troopLabel}` : "";
      const joiner = drawsCards && spendsSpice ? ", " : "";
      return `${player.leader} plays Depart For Arrakis, ${drawText}${joiner}${troopText}.`;
    },
    {
      choiceId: choice,
      ...(choice === "spend-spice" ? { activatedAllyOwnerId: troopOwnerId, requireActivatedAlly: true } : {}),
    },
  );
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
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isMercenariesIntrigue,
    (player, _contractPending, activatedAlly) => {
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      return `${player.leader} plays Mercenaries${troopLabel}, spends 3 Solari, and recruits 2 troops.`;
    },
    { activatedAllyOwnerId: troopOwnerId, requireActivatedAlly: true },
  );
}

export function playStrategicStockpilingPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: StrategicStockpilingChoice,
): GameState {
  if (choice !== "spice" && choice !== "water" && choice !== "both") return state;
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isStrategicStockpilingIntrigue,
    (player, _contractPending, _activatedAlly, resolved) => {
      const spendSpice = (resolved.spentResources.spice ?? 0) > 0;
      const spendWater = (resolved.spentResources.water ?? 0) > 0;
      const paymentText = spendSpice && spendWater
        ? "spends 5 spice and 3 water"
        : spendSpice
          ? "spends 5 spice"
          : "spends 3 water";
      return `${player.leader} plays Strategic Stockpiling, ${paymentText}, and gains ${resolved.vp} VP.`;
    },
    { choiceId: choice },
  );
}

export function playShaddamsFavorPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isShaddamsFavorIntrigue,
    (player, _contractPending, activatedAlly, resolved) => {
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      const gainsSolari = (resolved.revealGain.solari ?? 0) >= 3;
      const solariLabel = gainsSolari ? " and gains 3 Solari" : "";
      return `${player.leader} plays Shaddam's Favor${troopLabel}, recruits 1 troop${solariLabel}.`;
    },
    { activatedAllyOwnerId: troopOwnerId, requireActivatedAlly: true },
  );
}

export function playMarketOpportunityPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: MarketOpportunityChoice,
): GameState {
  if (choice !== "spice-to-solari" && choice !== "solari-to-spice") return state;
  const nextState = playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isMarketOpportunityIntrigue,
    (player) =>
      choice === "spice-to-solari"
        ? `${player.leader} plays Market Opportunity, spends 2 spice, and gains 5 Solari.`
        : `${player.leader} plays Market Opportunity, spends 5 Solari, and gains 5 spice.`,
    { choiceId: choice },
  );
  return choice === "solari-to-spice" && nextState !== state
    ? recordTurnSpiceGain(nextState, playerId, 5)
    : nextState;
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
