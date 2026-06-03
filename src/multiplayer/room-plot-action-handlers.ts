import type { Dispatch, SetStateAction } from "react";
import type { ChangeAllegiancesSelection } from "../app-helpers";
import type {
  BuyAccessChoice,
  ChangeAllegiancesChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
  SpecialMissionChoice,
} from "../game/state";
import type { FactionId } from "../game/types";
import type { RoomActionCommand, RoomPlotActionCommand } from "./room-actions";

type RoomSendAction = (action: RoomActionCommand) => void | Promise<boolean>;
type CommanderTargets = Record<string, string>;
type SetChangeAllegiancesSelections = Dispatch<SetStateAction<Record<string, ChangeAllegiancesSelection>>>;

export function createRoomPlotActionHandlers(
  sendAction: RoomSendAction,
  commanderTargets: CommanderTargets,
  setChangeAllegiancesSelections: SetChangeAllegiancesSelections,
) {
  const playPlotIntrigue = (command: RoomPlotActionCommand) => {
    void sendAction({ kind: "plot-intrigue", command, commanderTargets });
  };

  return {
    scorePlotIntrigue(intrigueId: string) {
      playPlotIntrigue({ kind: "score-battle-icon", intrigueId });
    },

    playContingencyPlanPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "contingency-plan", intrigueId });
    },

    playCallToArmsPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "call-to-arms", intrigueId });
    },

    playIntelligenceReportPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "intelligence-report", intrigueId });
    },

    playInspireAwePlot(intrigueId: string) {
      playPlotIntrigue({ kind: "inspire-awe", intrigueId });
    },

    playManipulatePlot(intrigueId: string, cardId: string) {
      playPlotIntrigue({ kind: "manipulate", intrigueId, cardId });
    },

    playLeveragePlot(intrigueId: string) {
      playPlotIntrigue({ kind: "leverage", intrigueId });
    },

    playDistractionPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "distraction", intrigueId });
    },

    playCunningPlot(intrigueId: string, choice: "draw" | "paid-trash") {
      playPlotIntrigue({ kind: "cunning", intrigueId, choice });
    },

    playSietchRitualPlot(intrigueId: string, discardCardId: string, faction: SietchRitualChoice) {
      playPlotIntrigue({ kind: "sietch-ritual", intrigueId, discardCardId, faction });
    },

    updateChangeAllegiancesSelection(intrigueId: string, selection: ChangeAllegiancesSelection) {
      setChangeAllegiancesSelections((current) => ({
        ...current,
        [intrigueId]: { ...current[intrigueId], ...selection },
      }));
    },

    playChangeAllegiancesPlot(intrigueId: string, choice: ChangeAllegiancesChoice) {
      playPlotIntrigue({ kind: "change-allegiances", intrigueId, choice });
    },

    playSpecialMissionPlot(intrigueId: string, choice: SpecialMissionChoice) {
      playPlotIntrigue({ kind: "special-mission", intrigueId, choice });
    },

    playOpportunismPlot(intrigueId: string, choice: InfluenceLossPair) {
      playPlotIntrigue({ kind: "opportunism", intrigueId, choice });
    },

    playImperiumPoliticsPlot(intrigueId: string, faction: ImperiumPoliticsChoice) {
      playPlotIntrigue({ kind: "imperium-politics", intrigueId, faction });
    },

    playBuyAccessPlot(intrigueId: string, choice: BuyAccessChoice) {
      playPlotIntrigue({ kind: "buy-access", intrigueId, choice });
    },

    playDepartForArrakisPlot(intrigueId: string, choice: "draw" | "spend-spice") {
      playPlotIntrigue({ kind: "depart-for-arrakis", intrigueId, choice });
    },

    playCouncilorsAmbitionPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "councilors-ambition", intrigueId });
    },

    playStrategicStockpilingPlot(intrigueId: string, choice: "spice" | "water" | "both") {
      playPlotIntrigue({ kind: "strategic-stockpiling", intrigueId, choice });
    },

    playShaddamsFavorPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "shaddams-favor", intrigueId });
    },

    playMarketOpportunityPlot(intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") {
      playPlotIntrigue({ kind: "market-opportunity", intrigueId, choice });
    },

    playMercenariesPlot(intrigueId: string) {
      playPlotIntrigue({ kind: "mercenaries", intrigueId });
    },

    playBackedByChoamPlot(intrigueId: string, faction: FactionId) {
      playPlotIntrigue({ kind: "backed-by-choam", intrigueId, faction });
    },

    playDetonation(intrigueId: string, choice: "shield-wall" | "deploy") {
      playPlotIntrigue({ kind: "detonation", intrigueId, choice });
    },

    playUnexpectedAllies(intrigueId: string, removeShieldWall: boolean) {
      playPlotIntrigue({ kind: "unexpected-allies", intrigueId, removeShieldWall });
    },
  };
}
