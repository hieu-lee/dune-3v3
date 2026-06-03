import {
  factionLabels,
} from "./data";
import { effectiveFremenIconInfluence } from "./board-rules";
import {
  isBackedByChoamIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDepartForArrakisIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
  isShaddamsFavorIntrigue,
  isStrategicStockpilingIntrigue,
} from "./card-identifiers";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import { playerTroopSupply } from "./deck-utils";
import { activatedAllyEffectOwner } from "./market-rules";
import type {
  FactionId,
  GameState,
} from "./types";

export type DepartForArrakisChoice = "draw" | "spend-spice";
export type StrategicStockpilingChoice = "spice" | "water" | "both";
export type MarketOpportunityChoice = "spice-to-solari" | "solari-to-spice";

export function canResolveDepartForArrakisSpiceChoice(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
) {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return false;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId || player.resources.spice < 2) return false;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDepartForArrakisIntrigue(intrigue)) return false;
  const ownerResult = activatedAllyEffectOwner(state, player, troopOwnerId);
  if (!ownerResult.valid || !ownerResult.owner) return false;
  const canRecruitTroop = playerTroopSupply(ownerResult.owner) > 0;
  const canActuallyDraw = effectiveFremenIconInfluence(player, state.players) >= 3 &&
    player.deck.length + player.discard.length > 0;
  return canRecruitTroop || canActuallyDraw;
}

export function playDepartForArrakisPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: DepartForArrakisChoice,
  troopOwnerId?: string,
): GameState {
  if (choice !== "draw" && choice !== "spend-spice") return state;
  if (
    choice === "spend-spice" &&
    !canResolveDepartForArrakisSpiceChoice(state, playerId, intrigueId, troopOwnerId)
  ) {
    return state;
  }
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isDepartForArrakisIntrigue,
    (player, _contractPending, activatedAlly, resolved, outcome) => {
      const drawsCards = resolved.cardsToDraw > 0;
      const spendsSpice = (resolved.spentResources.spice ?? 0) > 0;
      const recruitedTroops = (outcome.recruitedTroops ?? 0) + (outcome.activatedAllyRecruitedTroops ?? 0);
      const cardText = outcome.cardsDrawn === 1 ? "1 card" : `${outcome.cardsDrawn} cards`;
      const drawText = drawsCards ? `draws ${cardText}` : "";
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      const troopText = spendsSpice
        ? `spends 2 spice${recruitedTroops > 0 ? ` and recruits ${recruitedTroops} troop${recruitedTroops === 1 ? "" : "s"}${troopLabel}` : ""}`
        : "";
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
    (player, _contractPending, activatedAlly, _resolved, outcome) => {
      const recruitedTroops = (outcome.recruitedTroops ?? 0) + (outcome.activatedAllyRecruitedTroops ?? 0);
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      const recruitText = recruitedTroops > 0
        ? `, and recruits ${recruitedTroops} troop${recruitedTroops === 1 ? "" : "s"}${troopLabel}`
        : "";
      return `${player.leader} plays Mercenaries, spends 3 Solari${recruitText}.`;
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
    (player, _contractPending, activatedAlly, resolved, outcome) => {
      const recruitedTroops = (outcome.recruitedTroops ?? 0) + (outcome.activatedAllyRecruitedTroops ?? 0);
      const troopLabel = activatedAlly && activatedAlly.id !== player.id ? ` for ${activatedAlly.leader}` : "";
      const gainsSolari = (resolved.revealGain.solari ?? 0) >= 3;
      const parts = [
        recruitedTroops > 0
          ? `recruits ${recruitedTroops} troop${recruitedTroops === 1 ? "" : "s"}${troopLabel}`
          : undefined,
        gainsSolari ? "gains 3 Solari" : undefined,
      ].filter((part): part is string => Boolean(part));
      return `${player.leader} plays Shaddam's Favor${parts.length > 0 ? `, ${parts.join(" and ")}` : ""}.`;
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
  return playTypedPlotIntrigue(
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
}

export function playBackedByChoamPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  faction: FactionId,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isBackedByChoamIntrigue,
    (player) =>
      `${player.leader} plays Backed by CHOAM as a Plot Intrigue, loses 1 ${factionLabels[faction]} Influence, and gains 4 Solari.`,
    { choiceId: faction },
  );
}
