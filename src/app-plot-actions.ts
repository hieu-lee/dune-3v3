import type { Dispatch, SetStateAction } from "react";
import type { ChangeAllegiancesSelection } from "./app-helpers";
import { legalActivatedAllyIdFor } from "./app-turn-actions";
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
  maybeStartCombatPhase,
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
    ? legalActivatedAllyIdFor(player, current.players, commanderTargets)
    : undefined;
}

function finishPlotIntrigueAction(current: GameState, next: GameState) {
  return next === current ? current : maybeStartCombatPhase(next);
}

export function createPlotActionHandlers({
  commanderTargets,
  setChangeAllegiancesSelections,
  setGame,
}: PlotActionHandlersInput) {
  const playPlot = (play: (current: GameState) => GameState) => {
    setGame((current) => finishPlotIntrigueAction(current, play(current)));
  };

  return {
    scorePlotIntrigue(intrigueId: string) {
      playPlot((current) => playPlotBattleIconIntrigue(current, activePlayerId(current), intrigueId));
    },

    playContingencyPlanPlot(intrigueId: string) {
      playPlot((current) => playContingencyPlanPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playCallToArmsPlot(intrigueId: string) {
      playPlot((current) => playCallToArmsPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playIntelligenceReportPlot(intrigueId: string) {
      playPlot((current) => playIntelligenceReportPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playInspireAwePlot(intrigueId: string) {
      playPlot((current) =>
        playInspireAwePlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets))
      );
    },

    playManipulatePlot(intrigueId: string, cardId: string) {
      playPlot((current) => playManipulatePlotIntrigue(current, activePlayerId(current), intrigueId, cardId));
    },

    playLeveragePlot(intrigueId: string) {
      playPlot((current) => playLeveragePlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playDistractionPlot(intrigueId: string) {
      playPlot((current) => playDistractionPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playCunningPlot(intrigueId: string, choice: "draw" | "paid-trash") {
      playPlot((current) => playCunningPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playSietchRitualPlot(intrigueId: string, discardCardId: string, faction: SietchRitualChoice) {
      playPlot((current) => {
        const player = current.players[current.activeSeat];
        const personalFaction = player.role === "Commander" && player.team === "muaddib" ? "fremen" : undefined;
        const influenceOwnerId = player.role === "Commander" && faction !== personalFaction
          ? legalActivatedAllyIdFor(player, current.players, commanderTargets)
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
      playPlot((current) =>
        playChangeAllegiancesPlotIntrigue(
          current,
          activePlayerId(current),
          intrigueId,
          choice,
          routedCommanderTargetId(current, commanderTargets),
        )
      );
    },

    playSpecialMissionPlot(intrigueId: string, choice: SpecialMissionChoice) {
      playPlot((current) => playSpecialMissionPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playOpportunismPlot(intrigueId: string, choice: InfluenceLossPair) {
      playPlot((current) => playOpportunismPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playImperiumPoliticsPlot(intrigueId: string, faction: ImperiumPoliticsChoice) {
      playPlot((current) => {
        const player = current.players[current.activeSeat];
        const influenceOwnerId = player.role === "Commander" && faction !== "emperor"
          ? legalActivatedAllyIdFor(player, current.players, commanderTargets)
          : undefined;
        return playImperiumPoliticsPlotIntrigue(current, player.id, intrigueId, faction, influenceOwnerId);
      });
    },

    playBuyAccessPlot(intrigueId: string, choice: BuyAccessChoice) {
      playPlot((current) =>
        playBuyAccessPlotIntrigue(
          current,
          activePlayerId(current),
          intrigueId,
          choice,
          routedCommanderTargetId(current, commanderTargets),
        )
      );
    },

    playDepartForArrakisPlot(intrigueId: string, choice: "draw" | "spend-spice") {
      playPlot((current) =>
        playDepartForArrakisPlotIntrigue(
          current,
          activePlayerId(current),
          intrigueId,
          choice,
          routedCommanderTargetId(current, commanderTargets),
        )
      );
    },

    playCouncilorsAmbitionPlot(intrigueId: string) {
      playPlot((current) => playCouncilorsAmbitionPlotIntrigue(current, activePlayerId(current), intrigueId));
    },

    playStrategicStockpilingPlot(intrigueId: string, choice: "spice" | "water" | "both") {
      playPlot((current) => playStrategicStockpilingPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playShaddamsFavorPlot(intrigueId: string) {
      playPlot((current) =>
        playShaddamsFavorPlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets))
      );
    },

    playMarketOpportunityPlot(intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") {
      playPlot((current) => playMarketOpportunityPlotIntrigue(current, activePlayerId(current), intrigueId, choice));
    },

    playMercenariesPlot(intrigueId: string) {
      playPlot((current) =>
        playMercenariesPlotIntrigue(current, activePlayerId(current), intrigueId, routedCommanderTargetId(current, commanderTargets))
      );
    },

    playBackedByChoamPlot(intrigueId: string, faction: FactionId) {
      playPlot((current) => playBackedByChoamPlotIntrigue(current, activePlayerId(current), intrigueId, faction));
    },

    playDetonation(intrigueId: string, choice: "shield-wall" | "deploy") {
      playPlot((current) =>
        playDetonationIntrigue(current, activePlayerId(current), intrigueId, choice, routedCommanderTargetId(current, commanderTargets))
      );
    },

    playUnexpectedAllies(intrigueId: string, removeShieldWall: boolean) {
      playPlot((current) => {
        const playerId = activePlayerId(current);
        const resolved = playUnexpectedAlliesIntrigue(
          current,
          playerId,
          intrigueId,
          removeShieldWall,
          routedCommanderTargetId(current, commanderTargets),
        );
        return scoreGurneyAlwaysSmiling(resolved, playerId);
      });
    },
  };
}
