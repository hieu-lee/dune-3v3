import {
  playContingencyPlanPlotIntrigue,
  playCunningPlotIntrigue,
  playDistractionPlotIntrigue,
  playInspireAwePlotIntrigue,
  playIntelligenceReportPlotIntrigue,
  playLeveragePlotIntrigue,
  playManipulatePlotIntrigue,
} from "./plot-intrigue-basic-rules";
import {
  playBuyAccessPlotIntrigue,
  playChangeAllegiancesPlotIntrigue,
  playImperiumPoliticsPlotIntrigue,
  playOpportunismPlotIntrigue,
  playSietchRitualPlotIntrigue,
} from "./plot-intrigue-influence-rules";
import {
  playBackedByChoamPlotIntrigue,
  playCouncilorsAmbitionPlotIntrigue,
  playDepartForArrakisPlotIntrigue,
  playMarketOpportunityPlotIntrigue,
  playMercenariesPlotIntrigue,
  playShaddamsFavorPlotIntrigue,
  playStrategicStockpilingPlotIntrigue,
} from "./plot-intrigue-resource-rules";
import {
  playCallToArmsPlotIntrigue,
  playDetonationIntrigue,
  playSpecialMissionPlotIntrigue,
  playUnexpectedAlliesIntrigue,
} from "./plot-intrigue-tactical-rules";
import { playPlotBattleIconIntrigue } from "./endgame-intrigues";
import { factionIds } from "./data";
import { legalActivatedAlliesForCommander } from "./placement-rules";
import { specialMissionRecallSpySpaces } from "./spy-pending-rules";
import type { FactionId, GameState, Player } from "./types";
import type { ChangeAllegiancesChoice } from "./plot-intrigue-influence-rules";
import type { ImperiumPoliticsChoice, SietchRitualChoice } from "./influence-choices";

const sietchRitualChoices = ["bene", "fremen", "fringeWorlds"] as const satisfies readonly SietchRitualChoice[];
const imperiumPoliticsChoices = ["greatHouses", "emperor", "spacing"] as const satisfies readonly ImperiumPoliticsChoice[];

function clonedStateChanges(
  state: GameState,
  action: (state: GameState) => GameState,
) {
  const clone = structuredClone(state);
  return action(clone) !== clone;
}

function commanderTargetIds(player: Player, players: Player[]) {
  if (player.role !== "Commander") return [undefined];
  const allyIds = legalActivatedAlliesForCommander(player, players).map((ally) => ally.id);
  return [undefined, ...allyIds];
}

function factionPairs(): Array<[FactionId, FactionId]> {
  return factionIds.flatMap((first) => factionIds.map((second) => [first, second] as [FactionId, FactionId]));
}

function changeAllegiancesChoices(): ChangeAllegiancesChoice[] {
  return [
    ...factionPairs().map(([loseFaction, gainFaction]) => ({ kind: "shift" as const, loseFaction, gainFaction })),
    ...factionIds.map((gainFaction) => ({ kind: "spend-spice" as const, gainFaction })),
    ...factionIds.flatMap((loseFaction) =>
      factionIds.flatMap((shiftGainFaction) =>
        factionIds.map((spiceGainFaction) => ({
          kind: "both" as const,
          loseFaction,
          shiftGainFaction,
          spiceGainFaction,
        }))
      )
    ),
  ];
}

export function playerHasPlayablePlotIntrigue(state: GameState, player: Player) {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return false;
  if (state.players[state.activeSeat]?.id !== player.id) return false;
  if (player.intrigues.length === 0) return false;

  const targets = commanderTargetIds(player, state.players);
  const pairs = factionPairs();
  const changeChoices = changeAllegiancesChoices();
  const recallSpaces = specialMissionRecallSpySpaces(state, player);

  return player.intrigues.some((intrigue) => {
    const intrigueId = intrigue.id;
    const actions: Array<(next: GameState) => GameState> = [
      (next) => playPlotBattleIconIntrigue(next, player.id, intrigueId),
      (next) => playContingencyPlanPlotIntrigue(next, player.id, intrigueId),
      (next) => playCallToArmsPlotIntrigue(next, player.id, intrigueId),
      (next) => playIntelligenceReportPlotIntrigue(next, player.id, intrigueId),
      (next) => playLeveragePlotIntrigue(next, player.id, intrigueId),
      (next) => playDistractionPlotIntrigue(next, player.id, intrigueId),
      (next) => playCunningPlotIntrigue(next, player.id, intrigueId, "draw"),
      (next) => playCunningPlotIntrigue(next, player.id, intrigueId, "paid-trash"),
      (next) => playSpecialMissionPlotIntrigue(next, player.id, intrigueId, { kind: "place-spy" }),
      (next) => playCouncilorsAmbitionPlotIntrigue(next, player.id, intrigueId),
      (next) => playStrategicStockpilingPlotIntrigue(next, player.id, intrigueId, "spice"),
      (next) => playStrategicStockpilingPlotIntrigue(next, player.id, intrigueId, "water"),
      (next) => playStrategicStockpilingPlotIntrigue(next, player.id, intrigueId, "both"),
      (next) => playMarketOpportunityPlotIntrigue(next, player.id, intrigueId, "spice-to-solari"),
      (next) => playMarketOpportunityPlotIntrigue(next, player.id, intrigueId, "solari-to-spice"),
      (next) => playDetonationIntrigue(next, player.id, intrigueId, "shield-wall"),
      ...state.imperiumRow.map((card) =>
        (next: GameState) => playManipulatePlotIntrigue(next, player.id, intrigueId, card.id)
      ),
      ...player.hand.flatMap((card) =>
        sietchRitualChoices.flatMap((faction) =>
          targets.map((targetId) =>
            (next: GameState) => playSietchRitualPlotIntrigue(next, player.id, intrigueId, card.id, faction, targetId)
          )
        )
      ),
      ...changeChoices.flatMap((choice) =>
        targets.map((targetId) =>
          (next: GameState) => playChangeAllegiancesPlotIntrigue(next, player.id, intrigueId, choice, targetId)
        )
      ),
      ...recallSpaces.map((space) =>
        (next: GameState) => playSpecialMissionPlotIntrigue(next, player.id, intrigueId, {
          kind: "recall-spy",
          spaceId: space.id,
        })
      ),
      ...pairs.map((choice) =>
        (next: GameState) => playOpportunismPlotIntrigue(next, player.id, intrigueId, choice)
      ),
      ...imperiumPoliticsChoices.map((faction) =>
        (next: GameState) => playImperiumPoliticsPlotIntrigue(next, player.id, intrigueId, faction)
      ),
      ...pairs.map((choice) =>
        (next: GameState) => playBuyAccessPlotIntrigue(next, player.id, intrigueId, choice)
      ),
      ...targets.flatMap((targetId) => [
        (next: GameState) => playInspireAwePlotIntrigue(next, player.id, intrigueId, targetId),
        (next: GameState) => playDepartForArrakisPlotIntrigue(next, player.id, intrigueId, "draw", targetId),
        (next: GameState) => playDepartForArrakisPlotIntrigue(next, player.id, intrigueId, "spend-spice", targetId),
        (next: GameState) => playShaddamsFavorPlotIntrigue(next, player.id, intrigueId, targetId),
        (next: GameState) => playMercenariesPlotIntrigue(next, player.id, intrigueId, targetId),
        (next: GameState) => playDetonationIntrigue(next, player.id, intrigueId, "deploy", targetId),
        (next: GameState) => playUnexpectedAlliesIntrigue(next, player.id, intrigueId, true, targetId),
      ]),
      ...factionIds.map((faction) =>
        (next: GameState) => playBackedByChoamPlotIntrigue(next, player.id, intrigueId, faction)
      ),
    ];
    return actions.some((action) => clonedStateChanges(state, action));
  });
}
