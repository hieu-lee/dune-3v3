import type { Card, FactionId, IntrigueCard } from "./types";

export const secureSpiceTradeSourceId = 161;
export const choamProfitsSourceId = 450;
export const reachAgreementSourceId = 449;
export const strategicStockpilingSourceId = 130;
export const detonationSourceId = 131;
export const departForArrakisSourceId = 132;
export const sietchRitualSourceId = 127;
export const unexpectedAlliesSourceId = 137;
export const mercenariesSourceId = 128;
export const cunningSourceId = 133;
export const opportunismSourceId = 134;
export const changeAllegiancesSourceId = 135;
export const specialMissionSourceId = 136;
export const buyAccessSourceId = 139;
export const imperiumPoliticsSourceId = 140;
export const callToArmsSourceId = 138;
export const shaddamsFavorSourceId = 141;
export const intelligenceReportSourceId = 142;
export const manipulateSourceId = 143;
export const distractionSourceId = 144;
export const leverageSourceId = 447;
export const councilorsAmbitionSourceId = 129;
export const marketOpportunitySourceId = 145;
export const contingencyPlanSourceId = 147;
export const inspireAweSourceId = 148;
export const goToGroundSourceId = 146;
export const findWeaknessSourceId = 149;
export const spiceIsPowerSourceId = 150;
export const devourSourceId = 151;
export const impressSourceId = 152;
export const springTheTrapSourceId = 153;
export const weirdingCombatSourceId = 154;
export const tacticalOptionSourceId = 155;
export const questionableMethodsSourceId = 156;
export const backedByChoamSourceId = 448;
export const spiceMustFlowSourceId = 538;
export const prepareTheWaySourceId = 537;
export const shadowAllianceSourceId = 160;
export const genericSignetRingSourceId = 531;
export const muadDibSignetRingSourceId = 545;
export const shaddamSignetRingSourceId = 554;
export const demandAttentionSourceId = 548;
export const desertCallSourceId = 549;
export const threatenSpiceProductionSourceId = 553;
export const commandRespectSourceId = 546;
export const corrinoMightSourceId = 556;
export const usulSourceId = 552;
export const criticalShipmentsSourceId = 557;
export const demandResultsSourceId = 558;
export const devastatingAssaultSourceId = 559;
export const smugglersHarvesterSourceId = 17;
export const interstellarTradeSourceId = 184;
export const calculusOfPowerSourceId = 42;
export const capturedMentatSourceId = 61;
export const beneGesseritOperativeSourceId = 30;
export const cargoRunnerSourceId = 181;
export const makerKeeperSourceId = 19;
export const maulaPistolSourceId = 32;
export const northernWatermasterSourceId = 34;
export const paracompassSourceId = 49;

export const shadowAllianceFactions: FactionId[] = [
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
];

export function isDetonationIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === detonationSourceId;
}

export function isUnexpectedAlliesIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === unexpectedAlliesSourceId;
}

export function isDepartForArrakisIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === departForArrakisSourceId;
}

export function isSietchRitualIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === sietchRitualSourceId;
}

export function isMercenariesIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === mercenariesSourceId;
}

export function isCunningIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === cunningSourceId;
}

export function isOpportunismIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === opportunismSourceId;
}

export function isChangeAllegiancesIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === changeAllegiancesSourceId;
}

export function isSpecialMissionIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === specialMissionSourceId;
}

export function isBuyAccessIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === buyAccessSourceId;
}

export function isImperiumPoliticsIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === imperiumPoliticsSourceId;
}

export function isCallToArmsIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === callToArmsSourceId;
}

export function isCouncilorsAmbitionIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === councilorsAmbitionSourceId;
}

export function isContingencyPlanIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === contingencyPlanSourceId;
}

export function isIntelligenceReportIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === intelligenceReportSourceId;
}

export function isManipulateIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === manipulateSourceId;
}

export function isDistractionIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === distractionSourceId;
}

export function isLeverageIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === leverageSourceId;
}

export function isInspireAweIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === inspireAweSourceId;
}

export function isDevourIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === devourSourceId;
}

export function isFindWeaknessIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === findWeaknessSourceId;
}

export function isGoToGroundIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === goToGroundSourceId;
}

export function isSpiceIsPowerIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === spiceIsPowerSourceId;
}

export function isImpressIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === impressSourceId;
}

export function isSpringTheTrapIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === springTheTrapSourceId;
}

export function isWeirdingCombatIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === weirdingCombatSourceId;
}

export function isQuestionableMethodsIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === questionableMethodsSourceId;
}

export function isReachAgreementIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === reachAgreementSourceId;
}

export function isTacticalOptionIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === tacticalOptionSourceId;
}

export function isBackedByChoamIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === backedByChoamSourceId;
}

export function isStrategicStockpilingIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === strategicStockpilingSourceId;
}

export function isShaddamsFavorIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === shaddamsFavorSourceId;
}

export function isMarketOpportunityIntrigue(intrigue: IntrigueCard) {
  return intrigue.sourceId === marketOpportunitySourceId;
}

export function isFremenCard(card: Card) {
  return card.traits?.includes("Faction: Fremen") ?? false;
}

export function isPrepareTheWayCard(card: Card) {
  return card.sourceId === prepareTheWaySourceId || card.name === "Prepare The Way";
}

export function isCapturedMentatCard(card: Card) {
  return card.sourceId === capturedMentatSourceId || card.name === "Captured Mentat";
}

export function isBeneGesseritOperativeCard(card: Card) {
  return card.sourceId === beneGesseritOperativeSourceId || card.name === "Bene Gesserit Operative";
}

export function canMoveCardToThroneRow(card: Card) {
  return !isFremenCard(card);
}

export function isUsulCommanderCard(card: Card) {
  return card.sourceId === usulSourceId || card.name === "Usul";
}

export function isDemandAttentionCommanderCard(card: Card) {
  return card.sourceId === demandAttentionSourceId || card.name === "Demand Attention";
}

export function isDesertCallCommanderCard(card: Card) {
  return card.sourceId === desertCallSourceId || card.name === "Desert Call";
}

export function isThreatenSpiceProductionCommanderCard(card: Card) {
  return card.sourceId === threatenSpiceProductionSourceId || card.name === "Threaten Spice Production";
}

export function isCommandRespectCommanderCard(card: Card) {
  return card.sourceId === commandRespectSourceId || card.name === "Command Respect";
}

export function isMuadDibSignetRingCard(card: Card) {
  return (
    card.sourceId === muadDibSignetRingSourceId ||
    (card.name === "Signet Ring" && card.id.includes("muaddib-signet-ring"))
  );
}

export function isShaddamSignetRingCard(card: Card) {
  return (
    card.sourceId === shaddamSignetRingSourceId ||
    (card.name === "Signet Ring" && card.id.includes("emperor-signet-ring"))
  );
}

export function isGenericSignetRingCard(card: Card) {
  return (
    card.sourceId === genericSignetRingSourceId ||
    (card.name === "Signet Ring" && card.id.includes("starter-ally-signet-ring"))
  );
}

export function isCorrinoMightCommanderCard(card: Card) {
  return card.sourceId === corrinoMightSourceId || card.name === "Corrino Might";
}

export function isCriticalShipmentsCommanderCard(card: Card) {
  return card.sourceId === criticalShipmentsSourceId || card.name === "Critical Shipments";
}

export function isDemandResultsCommanderCard(card: Card) {
  return card.sourceId === demandResultsSourceId || card.name === "Demand Results";
}

export function isDevastatingAssaultCommanderCard(card: Card) {
  return card.sourceId === devastatingAssaultSourceId || card.name === "Devastating Assault";
}

export function isSmugglersHarvesterCard(card: Card) {
  return card.sourceId === smugglersHarvesterSourceId || card.name === "Smuggler's Harvester";
}

export function isInterstellarTradeCard(card: Card) {
  return card.sourceId === interstellarTradeSourceId || card.name === "Interstellar Trade";
}

export function isCalculusOfPowerCard(card: Card) {
  return card.sourceId === calculusOfPowerSourceId || card.name === "Calculus of Power";
}
