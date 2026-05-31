import type { Dispatch, SetStateAction } from "react";
import type { ChangeAllegiancesSelection } from "./app-helpers";
import { activatedAllyIdFor } from "./app-turn-actions";
import {
  playBackedByChoamPlotIntrigue,
  playBuyAccessPlotIntrigue,
  playCallToArmsPlotIntrigue,
  playChangeAllegiancesPlotIntrigue,
  playContingencyPlanPlotIntrigue,
  playCunningPlotIntrigue,
  playCouncilorsAmbitionPlotIntrigue,
  playDepartForArrakisPlotIntrigue,
  playDetonationIntrigue,
  playDistractionPlotIntrigue,
  playImperiumPoliticsPlotIntrigue,
  playInspireAwePlotIntrigue,
  playIntelligenceReportPlotIntrigue,
  playLeveragePlotIntrigue,
  playManipulatePlotIntrigue,
  playMarketOpportunityPlotIntrigue,
  playMercenariesPlotIntrigue,
  playOpportunismPlotIntrigue,
  playPlotBattleIconIntrigue,
  playShaddamsFavorPlotIntrigue,
  playSietchRitualPlotIntrigue,
  playSpecialMissionPlotIntrigue,
  playStrategicStockpilingPlotIntrigue,
  playUnexpectedAlliesIntrigue,
  scoreGurneyAlwaysSmiling,
} from "./game/state";
import type {
  BuyAccessChoice,
  ChangeAllegiancesChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
  SpecialMissionChoice,
} from "./game/state";
import type { FactionId, GameState } from "./game/types";

type CommanderTargets = Record<string, string>;
type SetGame = Dispatch<SetStateAction<GameState>>;
type SetChangeAllegiancesSelections = Dispatch<SetStateAction<Record<string, ChangeAllegiancesSelection>>>;

type PlotActionHandlersInput = {
  commanderTargets: CommanderTargets;
  setChangeAllegiancesSelections: SetChangeAllegiancesSelections;
  setGame: SetGame;
};

function activePlayerId(current: GameState) {
  return current.players[current.activeSeat].id;
}

function routedCommanderTargetId(current: GameState, commanderTargets: CommanderTargets) {
  const player = current.players[current.activeSeat];
  return player.role === "Commander"
    ? activatedAllyIdFor(player, current.players, commanderTargets)
    : undefined;
}

export function createPlotActionHandlers({
  commanderTargets,
  setChangeAllegiancesSelections,
  setGame,
}: PlotActionHandlersInput) {
  return {
    scorePlotIntrigue(intrigueId: string) {
      setGame((current) => playPlotBattleIconIntrigue(current, activePlayerId(current), intrigueId));
    },

    playContingencyPlanPlot(intrigueId: string) {
      setGame((current) => playContingencyPlanPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playCallToArmsPlot(intrigueId: string) {
      setGame((current) => playCallToArmsPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playIntelligenceReportPlot(intrigueId: string) {
      setGame((current) => playIntelligenceReportPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playInspireAwePlot(intrigueId: string) {
      setGame((current) => playInspireAwePlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets)));
    },

    playManipulatePlot(intrigueId: string, cardId: string) {
      setGame((current) => playManipulatePlotIntrigue(current, activePlayerId(current), intrigueId, cardId));
    },

    playLeveragePlot(intrigueId: string) {
      setGame((current) => playLeveragePlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playDistractionPlot(intrigueId: string) {
      setGame((current) => playDistractionPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playCunningPlot(intrigueId: string, choice: "draw" | "paid-trash") {
      setGame((current) => playCunningPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playSietchRitualPlot(intrigueId: string, discardCardId: string, faction: SietchRitualChoice) {
      setGame((current) => {
        const player = current.players[current.activeSeat];
        const personalFaction = player.role === "Commander" && player.team === "muaddib" ? "fremen" : undefined;
        const influenceOwnerId = player.role === "Commander" && faction !== personalFaction
          ? activatedAllyIdFor(player, current.players, commanderTargets)
          : undefined;
        return playSietchRitualPlotIntrigue(current, player.id, intrigueId, discardCardId, faction, influenceOwnerId);
      });
    },

    updateChangeAllegiancesSelection(intrigueId: string, selection: ChangeAllegiancesSelection) {
      setChangeAllegiancesSelections((current) => ({
        ...current,
        [intrigueId]: { ...current[intrigueId], ...selection },
      }));
    },

    playChangeAllegiancesPlot(intrigueId: string, choice: ChangeAllegiancesChoice) {
      setGame((current) => playChangeAllegiancesPlotIntrigue(
        current,
        activePlayerId(current),
        intrigueId,
        choice,
        routedCommanderTargetId(current, commanderTargets),
      ));
    },

    playSpecialMissionPlot(intrigueId: string, choice: SpecialMissionChoice) {
      setGame((current) => playSpecialMissionPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playOpportunismPlot(intrigueId: string, choice: InfluenceLossPair) {
      setGame((current) => playOpportunismPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playImperiumPoliticsPlot(intrigueId: string, faction: ImperiumPoliticsChoice) {
      setGame((current) => {
        const player = current.players[current.activeSeat];
        const influenceOwnerId = player.role === "Commander" && faction !== "emperor"
          ? activatedAllyIdFor(player, current.players, commanderTargets)
          : undefined;
        return playImperiumPoliticsPlotIntrigue(current, player.id, intrigueId, faction, influenceOwnerId);
      });
    },

    playBuyAccessPlot(intrigueId: string, choice: BuyAccessChoice) {
      setGame((current) => playBuyAccessPlotIntrigue(
        current,
        activePlayerId(current),
        intrigueId,
        choice,
        routedCommanderTargetId(current, commanderTargets),
      ));
    },

    playDepartForArrakisPlot(intrigueId: string, choice: "draw" | "spend-spice") {
      setGame((current) => playDepartForArrakisPlotIntrigue(
        current,
        activePlayerId(current),
        intrigueId,
        choice,
        routedCommanderTargetId(current, commanderTargets),
      ));
    },

    playCouncilorsAmbitionPlot(intrigueId: string) {
      setGame((current) => playCouncilorsAmbitionPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playStrategicStockpilingPlot(intrigueId: string, choice: "spice" | "water" | "both") {
      setGame((current) => playStrategicStockpilingPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playShaddamsFavorPlot(intrigueId: string) {
      setGame((current) => playShaddamsFavorPlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets)));
    },

    playMarketOpportunityPlot(intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") {
      setGame((current) => playMarketOpportunityPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playMercenariesPlot(intrigueId: string) {
      setGame((current) => playMercenariesPlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets)));
    },

    playBackedByChoamPlot(intrigueId: string, faction: FactionId) {
      setGame((current) => playBackedByChoamPlotIntrigue(current, activePlayerId(current), intrigueId, faction));
    },

    playDetonation(intrigueId: string, choice: "shield-wall" | "deploy") {
      setGame((current) => playDetonationIntrigue(current, activePlayerId(current), intrigueId, choice, routedCommanderTargetId(current, commanderTargets)));
    },

    playUnexpectedAllies(intrigueId: string, removeShieldWall: boolean) {
      setGame((current) => {
        const playerId = activePlayerId(current);
        const resolved = playUnexpectedAlliesIntrigue(current, playerId, intrigueId, removeShieldWall, routedCommanderTargetId(current, commanderTargets));
        return scoreGurneyAlwaysSmiling(resolved, playerId);
      });
    },
  };
}
