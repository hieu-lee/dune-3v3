import type { ChangeAllegiancesSelection } from "../app-helpers";
import type {
  BuyAccessChoice,
  ChangeAllegiancesChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
  SpecialMissionChoice,
} from "../game/state";
import type { FactionId, GameState, Player } from "../game/types";

export type IntrigueHandPanelProps = {
  activePlayer: Player;
  activatedAlly: Player;
  changeAllegiancesSelections: Record<string, ChangeAllegiancesSelection>;
  game: GameState;
  plotIntrigueLocked: boolean;
  playBackedByChoamPlot: (intrigueId: string, faction: FactionId) => void;
  playBuyAccessPlot: (intrigueId: string, choice: BuyAccessChoice) => void;
  playCallToArmsPlot: (intrigueId: string) => void;
  playChangeAllegiancesPlot: (intrigueId: string, choice: ChangeAllegiancesChoice) => void;
  playContingencyPlanPlot: (intrigueId: string) => void;
  playCouncilorsAmbitionPlot: (intrigueId: string) => void;
  playCunningPlot: (intrigueId: string, choice: "draw" | "paid-trash") => void;
  playDepartForArrakisPlot: (intrigueId: string, choice: "draw" | "spend-spice") => void;
  playDetonation: (intrigueId: string, choice: "shield-wall" | "deploy") => void;
  playDistractionPlot: (intrigueId: string) => void;
  playImperiumPoliticsPlot: (intrigueId: string, faction: ImperiumPoliticsChoice) => void;
  playInspireAwePlot: (intrigueId: string) => void;
  playIntelligenceReportPlot: (intrigueId: string) => void;
  playLeveragePlot: (intrigueId: string) => void;
  playManipulatePlot: (intrigueId: string, cardId: string) => void;
  playMarketOpportunityPlot: (intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") => void;
  playMercenariesPlot: (intrigueId: string) => void;
  playOpportunismPlot: (intrigueId: string, choice: InfluenceLossPair) => void;
  playShaddamsFavorPlot: (intrigueId: string) => void;
  playSietchRitualPlot: (intrigueId: string, discardCardId: string, faction: SietchRitualChoice) => void;
  playSpecialMissionPlot: (intrigueId: string, choice: SpecialMissionChoice) => void;
  playStrategicStockpilingPlot: (intrigueId: string, choice: "spice" | "water" | "both") => void;
  playUnexpectedAllies: (intrigueId: string, removeShieldWall: boolean) => void;
  scorePlotIntrigue: (intrigueId: string) => void;
  updateChangeAllegiancesSelection: (intrigueId: string, selection: ChangeAllegiancesSelection) => void;
};
