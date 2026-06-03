import {
  branchingPathSourceId,
  corrinthCitySourceId,
  covertOperationSourceId,
  dangerousRhetoricSourceId,
  desertPowerSourceId,
  desertSurvivalSourceId,
  deliveryAgreementSourceId,
  doubleAgentSourceId,
  ecologicalTestingStationSourceId,
  fedaykinStilltentSourceId,
  guildEnvoySourceId,
  guildSpySourceId,
  hiddenMissiveSourceId,
  inHighPlacesSourceId,
  interstellarTradeSourceId,
  junctionHeadquartersSourceId,
  longLiveTheFightersSourceId,
  overthrowSourceId,
  priceIsNoObjectSourceId,
  reliableInformantSourceId,
  sardaukarCoordinationSourceId,
  shishakliSourceId,
  smugglersHavenSourceId,
  smugglersHarvesterSourceId,
  spacingGuildFavorSourceId,
  spaceTimeFoldingSourceId,
  steersmanSourceId,
  spyNetworkSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
  treadInDarknessSourceId,
  truthtranceSourceId,
  unswervingLoyaltySourceId,
  weirdingWomanSourceId,
  wheelsWithinWheelsSourceId,
} from "./card-identifiers";
import { summarizeAttributes, type HubCard } from "./catalog-data";

export function imperiumPlayText(card: HubCard) {
  if (card.id === smugglersHarvesterSourceId) {
    return "If you sent an Agent to a Maker board space this turn, gain 1 spice.";
  }
  if (card.id === doubleAgentSourceId) {
    return "If you have a spy on the board space you sent an Agent to this turn, you may place a spy on the same observation post as another player's spy.";
  }
  if (card.id === ecologicalTestingStationSourceId) {
    return "Pay 2 water to draw 2 cards.";
  }
  if (card.id === fedaykinStilltentSourceId) {
    return "If you sent an Agent to a Maker board space this turn, recruit 1 troop.";
  }
  if (card.id === hiddenMissiveSourceId) {
    return "If you have 2 or more Bene Gesserit Influence, recruit 1 troop and draw 1 card.";
  }
  if (card.id === wheelsWithinWheelsSourceId) {
    return "If you have 2 or more Emperor/Great Houses Influence, gain 2 Solari. If you have 2 or more Spacing Guild Influence, gain 1 spice.";
  }
  if (card.id === reliableInformantSourceId) {
    return "Gain 1 Solari on Emperor, Bene Gesserit, or Spacing Guild board spaces.";
  }
  if (card.id === smugglersHavenSourceId) {
    return "Gain 1 VP. Pay 4 spice to summon 1 sandworm.";
  }
  if (card.id === corrinthCitySourceId) {
    return "Discard 2 cards and spend 5 Solari to gain 1 VP.";
  }
  if (card.id === deliveryAgreementSourceId) {
    return "Discard 1 card to take a face-up CHOAM contract.";
  }
  if (card.id === spaceTimeFoldingSourceId) {
    return "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 more card.";
  }
  if (card.id === guildEnvoySourceId) {
    return "Discard 1 card. If you discarded a Spacing Guild card, draw 2 cards.";
  }
  if (card.id === guildSpySourceId) {
    return "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 Intrigue card.";
  }
  if (card.id === branchingPathSourceId) {
    return "Bene Gesserit Alliance: may trash 1 Intrigue to draw 1 Intrigue card and gain 2 spice.";
  }
  if (card.id === junctionHeadquartersSourceId) {
    return "Spacing Guild Alliance: may trash 1 Intrigue and pay 2 spice to gain 1 VP.";
  }
  if (card.id === spacingGuildFavorSourceId) {
    return "Draw 1 card. When discarded from hand, gain 2 spice.";
  }
  if (card.id === covertOperationSourceId) {
    return "Each opponent discards a card.";
  }
  if (card.id === dangerousRhetoricSourceId) {
    return "Gain 1 Influence and trash this card.";
  }
  if (card.id === desertSurvivalSourceId) {
    return "You may trash this card.";
  }
  if (card.id === treadInDarknessSourceId) {
    return "If you have another Bene Gesserit card in play, you may trash this card to draw 1 card.";
  }
  if (card.id === shishakliSourceId) {
    return "You may trash this card to draw 1 card.";
  }
  if (card.id === inHighPlacesSourceId) {
    return "If you have another Bene Gesserit card in play, draw 1 card and place 1 spy.";
  }
  if (card.id === desertPowerSourceId) {
    return "If you sent an Agent to a Maker board space this turn, gain 2 spice.";
  }
  if (card.id === priceIsNoObjectSourceId) {
    return "You may acquire a card to your hand using Solari instead of persuasion.";
  }
  if (card.id === subversiveAdvisorSourceId) {
    return "If you sent an Agent to a Faction board space this turn, gain two Influence instead of one and trash this card.";
  }
  if (card.id === overthrowSourceId) {
    return "Gain two Influence instead of one.";
  }
  if (card.id === steersmanSourceId) {
    return "Draw 1 card. Recall Agent.";
  }
  if (card.id === longLiveTheFightersSourceId) {
    return "If your deck has three or more cards, look at the top three cards. Draw one, discard one, and trash one.";
  }
  if (card.id === interstellarTradeSourceId || card.id === truthtranceSourceId) {
    return "No Agent effect.";
  }
  if (card.id === spyNetworkSourceId) {
    return "No agent icons.";
  }
  if (card.id === unswervingLoyaltySourceId) {
    return "No agent icons.";
  }
  if (card.id === weirdingWomanSourceId) {
    return "If you have another Bene Gesserit card in play, return this card from play to your hand.";
  }
  if (card.id === sardaukarCoordinationSourceId) {
    return "You may deploy any troops you recruit this turn to the Conflict.";
  }
  if (card.id === strikeFleetSourceId) {
    return "If you recalled a Spy this turn, recruit 3 troops.";
  }
  return summarizeAttributes(card);
}
