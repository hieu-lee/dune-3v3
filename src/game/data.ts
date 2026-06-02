import catalogJson from "./uprising-catalog.generated.json";
import {
  beneGesseritOperativeSourceId,
  calculusOfPowerSourceId,
  cargoRunnerSourceId,
  capturedMentatSourceId,
  chaniCleverTacticianSourceId,
  contingencyPlanSourceId,
  councilorsAmbitionSourceId,
  covertOperationSourceId,
  dangerousRhetoricSourceId,
  desertPowerSourceId,
  doubleAgentSourceId,
  ecologicalTestingStationSourceId,
  fedaykinStilltentSourceId,
  guildEnvoySourceId,
  guildSpySourceId,
  hiddenMissiveSourceId,
  inHighPlacesSourceId,
  imperialSpymasterSourceId,
  intelligenceReportSourceId,
  leadershipSourceId,
  leverageSourceId,
  interstellarTradeSourceId,
  makerKeeperSourceId,
  marketOpportunitySourceId,
  maulaPistolSourceId,
  mercenariesSourceId,
  northernWatermasterSourceId,
  overthrowSourceId,
  paracompassSourceId,
  prepareTheWaySourceId,
  priceIsNoObjectSourceId,
  publicSpectacleSourceId,
  rebelSupplierSourceId,
  reliableInformantSourceId,
  sardaukarSoldierSourceId,
  shaddamsFavorSourceId,
  southernEldersSourceId,
  spaceTimeFoldingSourceId,
  spyNetworkSourceId,
  stilgarDevotedSourceId,
  theacherousManeuverSourceId,
  undercoverAssetSourceId,
  smugglersHarvesterSourceId,
  spiceMustFlowSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
  wheelsWithinWheelsSourceId,
} from "./card-identifiers";
import {
  acquireDrawIntrigues,
  acquireGainResource,
  acquireGainVp,
  acquirePlaceSpies,
  agentAcquireCard,
  agentDiscardCardForDraw,
  agentDiscardCardForInfluenceAndDraw,
  agentDrawCards,
  agentDrawIntrigues,
  agentGainInfluenceChoice,
  agentGainResource,
  agentOpponentsDiscardCards,
  agentPayResourceForDrawCards,
  agentPlaceSpies,
  agentRecruitTroops,
  hasCompletedContracts,
  hasCardTraitInPlay,
  hasConflictUnits,
  hasHighCouncilSeat,
  hasInfluence,
  hasRole,
  hasSpyPosts,
  hasSwordmasterBonus,
  gainedSpiceThisTurn,
  plotDrawCards,
  plotDrawIntrigues,
  plotGainResource,
  plotRecruitTroops,
  plotResourceExchange,
  plotSpendResource,
  plotTakeContracts,
  revealGainPersuasion,
  revealPlaceSpies,
  revealGainResource,
  revealGainStrength,
  revealLoseInfluenceForIntrigues,
  revealPayResourceForSandworms,
  revealRetreatTroopsForStrength,
  revealTrashCardForStrength,
  visitedMakerSpace,
  visitedSpaceIcon,
  visitedSpaceWithSpyPost,
} from "./effect-specs";
import type {
  BattleIconId,
  BoardSpace,
  Card,
  ConflictCard,
  ConflictBattleIconId,
  ContractCard,
  IconId,
  IntrigueCard,
  LeaderCard,
  CardEffectSpec,
  GameEffectConditionSpec,
  ResourceId,
} from "./types";
export {
  battleIconLabels,
  factionIds,
  factionLabels,
  iconLabels,
  sixPlayerObjectiveCards,
  teams,
} from "./static-data";
export {
  allyStarterCards,
  commanderStarterDecks,
  emperorCommanderCards,
  muadDibCommanderCards,
} from "./starter-deck-data";

type HubAttribute = [string, number | string | null];
type HubCard = {
  id: number;
  name: string;
  type: string;
  displayType: string | null;
  slug: string;
  fullImageUrl: string | null;
  thumbnailImageUrl: string | null;
  localImagePath: string | null;
  localThumbnailPath: string | null;
  attributes: HubAttribute[];
};

const catalog = catalogJson as unknown as { counts: Record<string, number>; cards: HubCard[] };
const iconAttributeMap: Record<string, IconId> = {
  "Agent icon: Emperor": "emperor",
  "Agent icon: Spacing Guild": "spacing",
  "Agent icon: Bene Gesserit": "bene",
  "Agent icon: Fremen": "fremen",
  "Agent icon: Landsraad": "landsraad",
  "Agent icon: City": "city",
  "Agent icon: Spice Trade": "spice",
  "Agent icon: Spy": "spy",
};

const summaryIgnore = new Set(["Persuasion cost", "Persuasion on reveal", "Swords"]);
const conflictLevelAttributes = new Set(["conflict-1", "conflict-2", "conflict-3"]);
const riseOfIxContractNames = new Set([
  "Dreadnought",
  "Harvest 3+ (contract)",
  "Harvest 4+ (contract)",
  "Heighliner III",
  "High Council III",
  "Interstellar Shipping",
  "Smuggling",
  "Tech Negotiation",
]);
const shaddamReservedContractNames = new Set(["Sardaukar I", "Sardaukar II"]);
const automatedCombatSwordValues: Partial<Record<number, number>> = {
  147: 3,
};
const acquireSpySourceIds = new Set([
  guildSpySourceId,
  inHighPlacesSourceId,
  spyNetworkSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
]);
const intrigueSummariesByCatalogId: Partial<Record<number, string>> = {
  127: "Discard a card to gain 1 Bene Gesserit or Fremen/Fringe Influence.",
  128: "Spend 3 Solari to draw 1 Intrigue and recruit 2 troops.",
  132: "Spend 2 spice to recruit 3 troops; with 3+ Fremen/Fringe Influence, draw 1 card.",
  133: "Draw 1 card OR spend 1 spice to draw 1 card and trash 1 card.",
  134: "Spend 2 Solari and lose 2 Influence to gain 1 VP.",
  143: "Remove and replace a card in the Imperium Row; during your Reveal turn this round, you may acquire it for 1 Persuasion less.",
  144: "After you deploy three or more units to the Conflict in a single turn, place a spy on the same observation post as another player's spy.",
  447: "If you gained spice this turn, gain 1 Solari and may take a face-up CHOAM contract.",
  135: "Lose 1 Influence to gain 1 Influence; you may also spend 3 spice to gain 1 Influence.",
  136: "Place 1 spy on a City observation post OR recall 1 spy to remove the Shield Wall and gain 2 spice.",
  131: "Remove the Shield Wall OR deploy up to four troops from your garrison to the Conflict.",
  129: "If you have a seat on the High Council, gain 2 water.",
  130: "Spend 5 spice to gain 1 VP; with 3+ Spacing Guild Influence, you may also spend 3 water to gain 1 VP.",
  139: "Spend 5 Solari to gain two different Influence among Emperor/Great Houses, Fremen/Fringe, Bene Gesserit, and Spacing Guild.",
  140: "Spend 1 Solari to gain 1 Emperor/Great Houses or Spacing Guild Influence.",
  138: "During your Reveal turn this round, whenever you acquire a card, recruit 1 troop.",
  142: "Draw 1 card; draw 1 more if you have two or more spies on the board.",
  141: "Recruit 1 troop; with 3+ Emperor/Great Houses Influence, gain 3 Solari.",
  147: "Gain 2 Solari as a Plot Intrigue OR add 3 strength as a Combat Intrigue.",
  148: "Acquire a card that costs 3 or less; put it in your hand if you have a sandworm in the Conflict.",
  145: "Spend 2 spice to gain 5 Solari OR spend 5 Solari to gain 5 spice.",
  149: "Add 2 strength; you may recall 1 spy to add 3 more strength.",
  150: "Retreat 3 troops to gain 3 spice OR spend 3 spice to add 6 strength.",
  152: "Add 2 strength, then acquire a card that costs 3 or less.",
  153: "Recall 2 spies to add 7 strength.",
  155: "Add 2 strength OR retreat any number of your troops.",
  156: "Add 1 strength; the recipient may lose 1 Influence, or a Commander may lose personal Influence, to add 4 more strength.",
  137: "Pay 2 water to deploy a sandworm to the Conflict; may remove the Shield Wall.",
  146: "Retreat 1 or 2 troops, then optionally place a spy.",
  151: "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
  154: "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
  448: "Lose 1 Influence to gain 4 Solari as a Plot Intrigue OR add 4 strength in Combat if you have completed at least two contracts.",
  449: "Retreat 1 or 2 troops, then take a face-up CHOAM contract.",
};

export const catalogStats = catalog.counts;

function toLeaderCard(card: HubCard): LeaderCard {
  return {
    id: `leader-${card.id}`,
    name: card.name,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const leaderCards: LeaderCard[] = catalog.cards
  .filter((card) => card.type === "leader")
  .map(toLeaderCard);

const leaderCardsByName = new Map(leaderCards.map((leader) => [leader.name, leader]));

export function leaderCardByName(name: string) {
  const leader = leaderCardsByName.get(name);
  if (!leader) throw new Error(`Missing Uprising leader card for ${name}.`);
  return leader;
}

function attributeNumber(card: HubCard, name: string, fallback = 0) {
  const value = card.attributes.find(([attributeName]) => attributeName === name)?.[1];
  if (typeof value === "number") return value;
  return fallback;
}

function hasConditionalAttribute(card: HubCard, name: string) {
  return card.attributes.some(([attributeName, value]) => attributeName === name && value === null);
}

function summarizeAttributes(card: HubCard) {
  const traits = card.attributes
    .filter(([name]) => !summaryIgnore.has(name) && !name.startsWith("Agent icon:") && !name.includes("Commander deck"))
    .slice(0, 5)
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  return traits.length ? traits.join(", ") : "Use printed card text from the imported image.";
}

function revealText(persuasion: number, swords: number) {
  const parts = [`+${persuasion} persuasion`];
  if (swords > 0) parts.push(`+${swords} strength`);
  return `${parts.join(" and ")}.`;
}

function imperiumRevealText(card: HubCard, persuasion: number, swords: number, printedReveal: boolean) {
  if (card.id === prepareTheWaySourceId) {
    return "+2 persuasion.";
  }
  if (card.id === smugglersHarvesterSourceId) {
    return "If you sent an Agent to a Maker board space this turn, gain 1 spice. +1 persuasion.";
  }
  if (card.id === interstellarTradeSourceId) {
    return "+1 persuasion for each completed contract.";
  }
  if (card.id === calculusOfPowerSourceId) {
    return "+2 persuasion. You may trash another Emperor card you have in play to add 3 strength.";
  }
  if (card.id === capturedMentatSourceId) {
    return "+1 persuasion. You may lose 1 Influence to draw 1 Intrigue.";
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return "+1 persuasion. If you have two or more spies on the board, +2 persuasion.";
  }
  if (card.id === chaniCleverTacticianSourceId) {
    return "Fremen Bond: +2 persuasion. You may retreat two troops to add 4 strength.";
  }
  if (card.id === ecologicalTestingStationSourceId) {
    return "+1 persuasion. Fremen Bond: gain 1 water.";
  }
  if (card.id === fedaykinStilltentSourceId) {
    return "Gain 1 water.";
  }
  if (card.id === northernWatermasterSourceId) {
    return "+1 persuasion. Fremen Bond: gain 2 spice.";
  }
  if (card.id === paracompassSourceId) {
    return "If you have a seat on the High Council, +2 persuasion. If you also have a Swordmaster, +1 persuasion.";
  }
  if (card.id === doubleAgentSourceId) {
    return "+1 persuasion and +1 strength.";
  }
  if (card.id === wheelsWithinWheelsSourceId) {
    return "+1 persuasion. Place 1 spy.";
  }
  if (card.id === reliableInformantSourceId) {
    return "+1 persuasion. Gain 1 Solari.";
  }
  if (card.id === covertOperationSourceId) {
    return "Gain 2 Solari.";
  }
  if (card.id === desertPowerSourceId) {
    return "+2 persuasion, or pay 1 water to summon 1 sandworm.";
  }
  return printedReveal ? "Resolve printed reveal text." : revealText(persuasion, swords);
}

function imperiumCardEffects(card: HubCard): CardEffectSpec[] | undefined {
  const simpleAgentEffects = imperiumSimpleAgentEffects(card);
  if (simpleAgentEffects) return simpleAgentEffects;

  if (card.id === smugglersHarvesterSourceId) {
    return [
      revealGainPersuasion(1),
      revealGainResource("spice", 1, [visitedMakerSpace()]),
    ];
  }
  if (card.id === interstellarTradeSourceId) {
    return [revealGainPersuasion({ kind: "completed-contracts" })];
  }
  if (card.id === calculusOfPowerSourceId) {
    return [
      revealGainPersuasion(2),
      revealTrashCardForStrength(3, {
        zones: ["playArea"],
        excludeSource: true,
        requiredTrait: "Faction: Emperor",
      }),
    ];
  }
  if (card.id === capturedMentatSourceId) {
    return [
      agentDiscardCardForInfluenceAndDraw(1, 1),
      revealGainPersuasion(1),
      revealLoseInfluenceForIntrigues(1),
    ];
  }
  if (card.id === covertOperationSourceId) {
    return [
      agentOpponentsDiscardCards(1),
      revealGainResource("solari", 2),
    ];
  }
  if (card.id === dangerousRhetoricSourceId) {
    return [
      agentGainInfluenceChoice(1, { trashSource: true }),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return [
      agentPlaceSpies("self", 1, { recallForSupply: true, mustPlace: true }),
      revealGainPersuasion(1),
      revealGainPersuasion(2, [hasSpyPosts(2)]),
    ];
  }
  if (card.id === fedaykinStilltentSourceId) {
    return [
      revealGainResource("water", 1),
      agentRecruitTroops("self", 1, [visitedMakerSpace(), hasRole("Ally")]),
      agentRecruitTroops("activated-ally", 1, [visitedMakerSpace(), hasRole("Commander")]),
    ];
  }
  if (card.id === ecologicalTestingStationSourceId) {
    return [
      agentPayResourceForDrawCards("water", 2, 2),
      revealGainPersuasion(1),
      revealGainResource("water", 1, [hasCardTraitInPlay("Faction: Fremen", 2)]),
    ];
  }
  if (card.id === doubleAgentSourceId) {
    return [
      agentPlaceSpies(
        "self",
        1,
        { allowSharedPost: true },
        [visitedSpaceWithSpyPost()],
      ),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === hiddenMissiveSourceId) {
    return [
      agentDrawCards(1, [hasInfluence("bene", 2)]),
      agentRecruitTroops("self", 1, [hasInfluence("bene", 2), hasRole("Ally")]),
      agentRecruitTroops("activated-ally", 1, [hasInfluence("bene", 2), hasRole("Commander")]),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === makerKeeperSourceId) {
    return [
      agentGainResource("water", 1, [hasInfluence("bene", 2)]),
      agentGainResource("spice", 1, [hasInfluence("fremen", 2)]),
      revealGainPersuasion(2),
    ];
  }
  if (card.id === cargoRunnerSourceId) {
    return [
      agentDrawCards(1, [hasCompletedContracts(2)]),
      agentDrawCards(1, [hasCompletedContracts(4)]),
      revealGainPersuasion(1),
    ];
  }
  if (card.id === chaniCleverTacticianSourceId) {
    return [
      agentDrawIntrigues(1, [hasConflictUnits(3)]),
      revealGainPersuasion(2, [hasCardTraitInPlay("Faction: Fremen", 2)]),
      revealRetreatTroopsForStrength(2, 4),
    ];
  }
  if (card.id === maulaPistolSourceId) {
    return [
      agentDrawCards(1),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === northernWatermasterSourceId) {
    return [
      revealGainPersuasion(1),
      revealGainResource("spice", 2, [hasCardTraitInPlay("Faction: Fremen", 2)]),
      agentGainResource("water", 1),
    ];
  }
  if (card.id === paracompassSourceId) {
    return [
      agentGainResource("solari", 2),
      revealGainPersuasion(2, [hasHighCouncilSeat()]),
      revealGainPersuasion(1, [hasHighCouncilSeat(), hasSwordmasterBonus()]),
    ];
  }
  if (card.id === reliableInformantSourceId) {
    return [
      agentGainResource("solari", 1, [visitedSpaceIcon("emperor")]),
      agentGainResource("solari", 1, [visitedSpaceIcon("bene")]),
      agentGainResource("solari", 1, [visitedSpaceIcon("spacing")]),
      revealGainPersuasion(1),
      revealGainResource("solari", 1),
    ];
  }
  if (card.id === spaceTimeFoldingSourceId) {
    return [
      agentDiscardCardForDraw(1, {
        bonusDraw: {
          requiredDiscardTrait: "Faction: Spacing Guild",
          drawCards: 1,
        },
      }),
      revealGainPersuasion(1),
    ];
  }
  if (card.id === guildEnvoySourceId) {
    return [
      agentDiscardCardForDraw(0, {
        bonusDraw: {
          requiredDiscardTrait: "Faction: Spacing Guild",
          drawCards: 2,
        },
      }),
      revealGainPersuasion(1),
    ];
  }
  if (card.id === wheelsWithinWheelsSourceId) {
    return [
      agentGainResource("solari", 2, [hasInfluence("emperor", 2)]),
      agentGainResource("spice", 1, [hasInfluence("spacing", 2)]),
      revealGainPersuasion(1),
      revealPlaceSpies(1, { mustPlace: true }),
    ];
  }
  if (acquireSpySourceIds.has(card.id)) {
    return [
      ...(fixedRevealEffects(
        attributeNumber(card, "Persuasion on reveal"),
        attributeNumber(card, "Swords"),
      ) ?? []),
      acquirePlaceSpies(1, { recallForSupply: true, mustPlace: true }),
    ];
  }
  if (card.id === overthrowSourceId) {
    return [
      ...(fixedRevealEffects(
        attributeNumber(card, "Persuasion on reveal"),
        attributeNumber(card, "Swords"),
      ) ?? []),
      acquireDrawIntrigues(1),
    ];
  }
  if (card.id === priceIsNoObjectSourceId) {
    return [
      agentAcquireCard({ destination: "hand", paymentResource: "solari", optional: true }),
      ...(fixedRevealEffects(
        attributeNumber(card, "Persuasion on reveal"),
        attributeNumber(card, "Swords"),
      ) ?? []),
      acquireGainResource("solari", 2),
    ];
  }
  if (card.id === spiceMustFlowSourceId) {
    return [
      acquireGainVp(1),
      acquireGainResource("spice", 1),
    ];
  }
  return undefined;
}

type SimpleAgentEffectConfig = {
  conditions?: GameEffectConditionSpec[];
  drawCards?: number;
  drawIntrigues?: number;
  gainInfluence?: number;
  gain?: Partial<Record<ResourceId, number>>;
  placeSpies?: number;
  recruitTroops?: number;
  revealPaySandworms?: {
    resource: ResourceId;
    cost: number;
    sandworms: number;
    persuasionCost?: number;
  };
};

const simpleAgentEffectConfigs: Record<number, SimpleAgentEffectConfig> = {
  [desertPowerSourceId]: {
    conditions: [visitedMakerSpace()],
    gain: { spice: 2 },
    revealPaySandworms: { resource: "water", cost: 1, sandworms: 1, persuasionCost: 2 },
  },
  [imperialSpymasterSourceId]: { drawIntrigues: 1 },
  [leadershipSourceId]: { drawCards: 1 },
  [publicSpectacleSourceId]: { gainInfluence: 1, placeSpies: 1 },
  [rebelSupplierSourceId]: { gain: { spice: 1 }, recruitTroops: 2 },
  [sardaukarSoldierSourceId]: { drawIntrigues: 1 },
  [southernEldersSourceId]: { gain: { water: 1 }, recruitTroops: 2 },
  [stilgarDevotedSourceId]: { recruitTroops: 2 },
  [theacherousManeuverSourceId]: { drawIntrigues: 1, gainInfluence: 1 },
  [undercoverAssetSourceId]: { placeSpies: 1 },
};

function agentRecruitTroopsForActivatedOwner(
  amount: number,
  conditions: GameEffectConditionSpec[] = [],
): CardEffectSpec[] {
  return [
    agentRecruitTroops("self", amount, [...conditions, hasRole("Ally")]),
    agentRecruitTroops("activated-ally", amount, [...conditions, hasRole("Commander")]),
  ];
}

function imperiumSimpleAgentEffects(card: HubCard): CardEffectSpec[] | undefined {
  const config = simpleAgentEffectConfigs[card.id];
  if (!config) return undefined;
  const effects = [
    ...(fixedRevealEffects(
      attributeNumber(card, "Persuasion on reveal"),
      attributeNumber(card, "Swords"),
    ) ?? []),
  ];
  const conditions = config.conditions ?? [];
  if (config.revealPaySandworms) {
    effects.push(revealPayResourceForSandworms(
      config.revealPaySandworms.resource,
      config.revealPaySandworms.cost,
      config.revealPaySandworms.sandworms,
      { persuasionCost: config.revealPaySandworms.persuasionCost },
    ));
  }
  if (config.drawIntrigues) {
    effects.push(agentDrawIntrigues(config.drawIntrigues, conditions));
  }
  if (config.drawCards) {
    effects.push(agentDrawCards(config.drawCards, conditions));
  }
  if (config.gainInfluence) {
    effects.push(agentGainInfluenceChoice(config.gainInfluence, {}, conditions));
  }
  if (config.placeSpies) {
    effects.push(agentPlaceSpies("self", config.placeSpies, { recallForSupply: true, mustPlace: true }, conditions));
  }
  for (const resource of ["solari", "spice", "water"] as const) {
    const amount = config.gain?.[resource] ?? 0;
    if (amount > 0) effects.push(agentGainResource(resource, amount, conditions));
  }
  if (config.recruitTroops) {
    effects.push(...agentRecruitTroopsForActivatedOwner(config.recruitTroops, conditions));
  }
  return effects;
}

function fixedRevealEffects(
  persuasion: number,
  swords: number,
  revealGain?: Partial<Record<ResourceId, number>>,
): CardEffectSpec[] | undefined {
  const effects: CardEffectSpec[] = [];
  if (persuasion > 0) effects.push(revealGainPersuasion(persuasion));
  if (swords > 0) effects.push(revealGainStrength(swords));
  for (const resource of ["solari", "spice", "water"] as const) {
    const amount = revealGain?.[resource] ?? 0;
    if (amount > 0) effects.push(revealGainResource(resource, amount));
  }
  return effects.length > 0 ? effects : undefined;
}

function imperiumPlayText(card: HubCard) {
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
  if (card.id === spaceTimeFoldingSourceId) {
    return "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 more card.";
  }
  if (card.id === guildEnvoySourceId) {
    return "Discard 1 card. If you discarded a Spacing Guild card, draw 2 cards.";
  }
  if (card.id === covertOperationSourceId) {
    return "Each opponent discards a card.";
  }
  if (card.id === dangerousRhetoricSourceId) {
    return "Gain 1 Influence and trash this card.";
  }
  if (card.id === desertPowerSourceId) {
    return "If you sent an Agent to a Maker board space this turn, gain 2 spice.";
  }
  if (card.id === priceIsNoObjectSourceId) {
    return "You may acquire a card to your hand using Solari instead of persuasion.";
  }
  return summarizeAttributes(card);
}

function toImperiumCard(card: HubCard): Card {
  if (card.id === prepareTheWaySourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: ["landsraad", "city"],
      persuasion: 2,
      swords: 0,
      conditionalPersuasion: false,
      conditionalSwords: false,
      effects: [
        agentDrawCards(1, [hasInfluence("bene", 2)]),
        revealGainPersuasion(2),
      ],
      play: "If you have 2 or more Bene Gesserit Influence, draw 1 card.",
      reveal: "+2 persuasion.",
      cost: 2,
      imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
      thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
      sourceId: card.id,
      sourceSlug: card.slug,
      sourceType: card.type,
      traits: ["Faction: Bene Gesserit"],
    };
  }
  if (card.id === capturedMentatSourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
      persuasion: 1,
      swords: 0,
      conditionalPersuasion: false,
      conditionalSwords: false,
      effects: imperiumCardEffects(card),
      play: "You may discard 1 card to gain 1 Influence and draw 1 card.",
      reveal: imperiumRevealText(card, 1, 0, false),
      cost: 5,
      imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
      thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
      sourceId: card.id,
      sourceSlug: card.slug,
      sourceType: card.type,
      traits: card.attributes.map(([name]) => name),
    };
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
      persuasion: 1,
      swords: 0,
      conditionalPersuasion: false,
      conditionalSwords: false,
      effects: imperiumCardEffects(card),
      play: "Place 1 spy.",
      reveal: imperiumRevealText(card, 1, 0, false),
      cost: 3,
      imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
      thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
      sourceId: card.id,
      sourceSlug: card.slug,
      sourceType: card.type,
      traits: ["Faction: Bene Gesserit"],
    };
  }
  if (card.id === chaniCleverTacticianSourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
      persuasion: 0,
      swords: 0,
      conditionalPersuasion: false,
      conditionalSwords: false,
      effects: imperiumCardEffects(card),
      play: "If you have three or more units in the Conflict, draw 1 Intrigue.",
      reveal: imperiumRevealText(card, 0, 0, true),
      cost: 5,
      imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
      thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
      sourceId: card.id,
      sourceSlug: card.slug,
      sourceType: card.type,
      traits: ["Faction: Fremen"],
    };
  }
  const persuasion = card.id === paracompassSourceId ? 0 : attributeNumber(card, "Persuasion on reveal");
  const swords = attributeNumber(card, "Swords");
  const revealGain =
    card.id === fedaykinStilltentSourceId
      ? { water: 1 }
      : card.id === reliableInformantSourceId
        ? { solari: 1 }
        : card.id === covertOperationSourceId
          ? { solari: 2 }
          : undefined;
  const effects = imperiumCardEffects(card) ?? fixedRevealEffects(persuasion, swords, revealGain);
  const automatedConditionalPersuasion = card.id === interstellarTradeSourceId || card.id === paracompassSourceId;
  const automatedConditionalSwords = card.id === calculusOfPowerSourceId;
  const conditionalPersuasion =
    !automatedConditionalPersuasion && !card.attributes.some(([name]) => name === "Persuasion on reveal");
  const conditionalSwords = !automatedConditionalSwords && hasConditionalAttribute(card, "Swords");
  return {
    id: `hub-${card.id}`,
    name: card.name,
    icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
    acquired: hasConditionalAttribute(card, "Victory Point") ? 1 : undefined,
    persuasion,
    swords,
    conditionalPersuasion,
    conditionalSwords,
    revealGain,
    effects,
    play: imperiumPlayText(card),
    reveal: imperiumRevealText(card, persuasion, swords, conditionalPersuasion || conditionalSwords),
    cost: attributeNumber(card, "Persuasion cost"),
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    sourceType: card.type,
    traits: card.attributes.map(([name]) => name),
  };
}

export const imperiumDeck: Card[] = catalog.cards
  .filter((card) => card.type === "imperium")
  .map(toImperiumCard);

function conflictLevel(card: HubCard): ConflictCard["level"] {
  if (card.attributes.some(([name]) => name === "conflict-3")) return 3;
  if (card.attributes.some(([name]) => name === "conflict-2")) return 2;
  return 1;
}

const conflictBattleIconsByCatalogId: Partial<Record<number, ConflictBattleIconId>> = {
  451: "crysknife",
  452: "ornithopter",
  453: "desertMouse",
  454: "crysknife",
  455: "crysknife",
  456: "ornithopter",
  457: "crysknife",
  458: "ornithopter",
  459: "ornithopter",
  460: "desertMouse",
  461: "desertMouse",
  462: "desertMouse",
  463: "wild",
  464: "ornithopter",
  465: "crysknife",
  466: "desertMouse",
};

function toConflictCard(card: HubCard): ConflictCard {
  const rewards = card.attributes
    .filter(([name]) => !conflictLevelAttributes.has(name))
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  const battleIcon = conflictBattleIconsByCatalogId[card.id];
  if (!battleIcon) {
    throw new Error(`Missing battle icon for conflict card ${card.id} (${card.name})`);
  }

  return {
    id: `conflict-${card.id}`,
    name: card.name,
    level: conflictLevel(card),
    battleIcon,
    rewards,
    stakes: rewards.length ? rewards.join(", ") : "Resolve printed conflict rewards.",
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const conflictCards: ConflictCard[] = catalog.cards
  .filter((card) => card.type === "conflict")
  .map(toConflictCard);

function intrigueCardEffects(card: HubCard): CardEffectSpec[] | undefined {
  if (card.id === councilorsAmbitionSourceId) {
    return [plotGainResource("water", 2, [hasHighCouncilSeat()])];
  }
  if (card.id === contingencyPlanSourceId) {
    return [plotGainResource("solari", 2)];
  }
  if (card.id === leverageSourceId) {
    return [
      plotGainResource("solari", 1, [gainedSpiceThisTurn()]),
      plotTakeContracts(1, { optional: true, source: "Leverage" }, [gainedSpiceThisTurn()]),
    ];
  }
  if (card.id === intelligenceReportSourceId) {
    return [
      plotDrawCards(1),
      plotDrawCards(1, [hasSpyPosts(2)]),
    ];
  }
  if (card.id === mercenariesSourceId) {
    return [
      plotSpendResource("solari", 3),
      plotDrawIntrigues(1),
      plotRecruitTroops("self", 2, [hasRole("Ally")]),
      plotRecruitTroops("activated-ally", 2, [hasRole("Commander")]),
    ];
  }
  if (card.id === marketOpportunitySourceId) {
    return [
      plotResourceExchange("spice-to-solari", "spice", 2, "solari", 5),
      plotResourceExchange("solari-to-spice", "solari", 5, "spice", 5),
    ];
  }
  if (card.id === shaddamsFavorSourceId) {
    return [
      plotRecruitTroops("self", 1, [hasRole("Ally")]),
      plotRecruitTroops("activated-ally", 1, [hasRole("Commander")]),
      plotGainResource("solari", 3, [hasInfluence("emperor", 3)]),
    ];
  }
  return undefined;
}

function toIntrigueCard(card: HubCard): IntrigueCard {
  const battleIcon = intrigueBattleIconsByCatalogId[card.id];
  const combatSwords = attributeNumber(card, "Swords");
  const automatedCombatSwords = automatedCombatSwordValues[card.id];
  return {
    id: `intrigue-${card.id}`,
    name: card.name,
    summary: intrigueSummariesByCatalogId[card.id] ?? summarizeAttributes(card),
    effects: intrigueCardEffects(card),
    battleIcon,
    combatSwords: combatSwords > 0 ? combatSwords : undefined,
    automatedCombatSwords,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    traits: card.attributes.map(([name]) => name),
  };
}

const intrigueBattleIconsByCatalogId: Partial<Record<number, BattleIconId>> = {
  157: "desertMouse",
  158: "ornithopter",
  159: "crysknife",
};

export const intrigueCards: IntrigueCard[] = catalog.cards
  .filter((card) => card.type === "intrigue")
  .map(toIntrigueCard);

function toContractCard(card: HubCard): ContractCard {
  return {
    id: `contract-${card.id}`,
    name: card.name,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const standardContracts: ContractCard[] = catalog.cards
  .filter((card) => card.type === "contract")
  .filter((card) => !riseOfIxContractNames.has(card.name))
  .filter((card) => !shaddamReservedContractNames.has(card.name))
  .map(toContractCard);

export const shaddamReservedContracts: ContractCard[] = catalog.cards
  .filter((card) => card.type === "contract")
  .filter((card) => shaddamReservedContractNames.has(card.name))
  .map(toContractCard);

const locationCardsByName = new Map(catalog.cards.filter((card) => card.type === "location").map((card) => [card.name, card]));

const sixPlayerBoardSpaceArtById: Record<string, { imagePath: string; thumbnailPath: string; sourceSlug: string }> = {
  carthag: {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-carthag.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-carthag.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-carthag",
  },
  "controversial-tech": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-controversial-technology.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-controversial-technology.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-controversial-technology",
  },
  "desert-mastery": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-desert-mastery.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-desert-mastery.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-desert-mastery",
  },
  "economic-support": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-economic-support.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-economic-support.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-economic-support",
  },
  expedition: {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-expedition.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-expedition.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-expedition",
  },
  "habbanya-erg": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-habbanya-erg.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-habbanya-erg.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-habbanya-erg",
  },
  "hardy-warriors": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-hardy-warriors.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-hardy-warriors.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-hardy-warriors",
  },
  "military-support": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-military-support.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-military-support.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-military-support",
  },
  sardaukar: {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-sardaukar-6p.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-sardaukar-6p.webp",
    sourceSlug: "dire-wolf-design-diary-5-sardaukar-personal-board",
  },
  swordmaster: {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-swordmaster-6p.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-swordmaster-6p.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-swordmaster",
  },
  "vast-wealth": {
    imagePath: "/assets/dune-cards-hub/location/uprising-location-vast-wealth.webp",
    thumbnailPath: "/assets/dune-cards-hub/location/uprising-location-vast-wealth.webp",
    sourceSlug: "dire-wolf-six-player-board-space-guide-vast-wealth",
  },
};

function withBoardSpaceArt(space: BoardSpace): BoardSpace {
  const sixPlayerArt = sixPlayerBoardSpaceArtById[space.id];
  if (sixPlayerArt) return { ...space, ...sixPlayerArt };
  if (space.personal) return space;
  const card = locationCardsByName.get(space.name);
  if (!card) return space;
  return {
    ...space,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? card.localImagePath ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

const boardSpaceSpecs: BoardSpace[] = [
  {
    id: "dutiful-service",
    name: "Dutiful Service",
    zone: "Faction",
    icon: "emperor",
    influence: "emperor",
    contract: true,
    detail: "Emperor influence and a face-up CHOAM contract.",
  },
  {
    id: "economic-support",
    name: "Economic Support",
    zone: "Faction",
    icon: "emperor",
    influence: "greatHouses",
    gain: { spice: 1 },
    team: "trade",
    detail: "Great Houses influence, spice, then teammate trade.",
  },
  {
    id: "military-support",
    name: "Military Support",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 2 },
    influence: "greatHouses",
    troops: 3,
    team: "reinforce",
    detail: "Recruit three troops split across allied teammates.",
  },
  {
    id: "vast-wealth",
    name: "Vast Wealth",
    zone: "Faction",
    icon: "emperor",
    influence: "emperor",
    gain: { solari: 3 },
    team: "commander",
    personal: "shaddam",
    detail: "Commander-side Emperor pressure and Solari.",
  },
  {
    id: "sardaukar",
    name: "Sardaukar",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 3 },
    influence: "emperor",
    gain: { intrigue: 1 },
    troops: 4,
    team: "commander",
    personal: "shaddam",
    detail: "Shaddam personal-board space; 3 spice in six-player mode.",
  },
  {
    id: "hardy-warriors",
    name: "Hardy Warriors",
    zone: "Faction",
    icon: "fremen",
    cost: { water: 1 },
    influence: "fremen",
    troops: 2,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence and two recruited troops.",
  },
  {
    id: "expedition",
    name: "Expedition",
    zone: "Faction",
    icon: "fremen",
    influence: "fringeWorlds",
    contract: true,
    detail: "Fringe Worlds influence and a face-up CHOAM contract.",
  },
  {
    id: "controversial-tech",
    name: "Controversial Technology",
    zone: "Faction",
    icon: "fremen",
    cost: { spice: 2 },
    influence: "fringeWorlds",
    draw: 1,
    gain: { intrigue: 1 },
    detail: "Fringe Worlds influence, Intrigue, draw, and trash.",
  },
  {
    id: "desert-mastery",
    name: "Desert Mastery",
    zone: "Faction",
    icon: "fremen",
    influence: "fremen",
    gain: { spice: 1 },
    draw: 1,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence, card draw, spice, combat.",
  },
  {
    id: "sietch-tabr",
    name: "Sietch Tabr",
    zone: "City",
    icon: "city",
    requirement: { faction: "fringeWorlds", amount: 2 },
    combat: true,
    sietchTabr: true,
    detail: "Requires 2 Fremen/Fringe influence; choose Hooks, troop, water or water and remove the Shield Wall.",
  },
  {
    id: "arrakeen",
    name: "Arrakeen",
    zone: "City",
    icon: "city",
    troops: 1,
    draw: 1,
    combat: true,
    detail: "Recruit, draw, and city control income.",
  },
  {
    id: "carthag",
    name: "Carthag",
    zone: "City",
    icon: "city",
    gain: { intrigue: 1 },
    troops: 1,
    combat: true,
    detail: "Recruit a troop and take an Intrigue.",
  },
  {
    id: "research-station",
    name: "Research Station",
    zone: "City",
    icon: "city",
    cost: { water: 2 },
    troops: 2,
    draw: 2,
    combat: true,
    detail: "High-value draw and deployment point.",
  },
  {
    id: "swordmaster",
    name: "Swordmaster",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 8 },
    detail: "Six-player single-use Swordmaster, then +2 reveal strength.",
  },
  {
    id: "high-council",
    name: "High Council",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 5 },
    gain: { spice: 2, intrigue: 1 },
    troops: 3,
    detail: "Council seat or repeat reward shell.",
  },
  {
    id: "gather-support",
    name: "Gather Support",
    zone: "Landsraad",
    icon: "landsraad",
    troops: 2,
    detail: "Recruit two troops; optionally pay 2 Solari for 1 water.",
  },
  {
    id: "secrets",
    name: "Secrets",
    zone: "Faction",
    icon: "bene",
    influence: "bene",
    gain: { intrigue: 1 },
    detail: "Bene Gesserit influence and intrigue pressure.",
  },
  {
    id: "espionage",
    name: "Espionage",
    zone: "Faction",
    icon: "bene",
    cost: { spice: 1 },
    influence: "bene",
    draw: 1,
    spy: 1,
    detail: "Influence, draw, and place a spy.",
  },
  {
    id: "deliver-supplies",
    name: "Deliver Supplies",
    zone: "Faction",
    icon: "spacing",
    influence: "spacing",
    gain: { water: 1 },
    detail: "Spacing Guild influence and water.",
  },
  {
    id: "accept-contract",
    name: "Accept Contract",
    zone: "Spice Trade",
    icon: "spice",
    draw: 1,
    contract: true,
    detail: "Draw a card and take a face-up CHOAM contract.",
  },
  {
    id: "shipping",
    name: "Shipping",
    zone: "Spice Trade",
    icon: "spice",
    cost: { spice: 3 },
    requirement: { faction: "spacing", amount: 2 },
    gain: { solari: 5 },
    detail: "Requires 2 Spacing Guild Influence, then gains Solari and any one Influence.",
  },
  {
    id: "spice-refinery",
    name: "Spice Refinery",
    zone: "City",
    icon: "city",
    gain: { solari: 2 },
    combat: true,
    detail: "Gain 2 Solari, or pay 1 spice for 4 Solari, and contest city control.",
  },
  {
    id: "heighliner",
    name: "Heighliner",
    zone: "Faction",
    icon: "spacing",
    cost: { spice: 5 },
    influence: "spacing",
    troops: 5,
    combat: true,
    detail: "Guild influence and a heavy troop deployment.",
  },
  {
    id: "imperial-basin",
    name: "Imperial Basin",
    zone: "Desert",
    icon: "spice",
    gain: { spice: 1 },
    combat: true,
    maker: true,
    detail: "Maker space with bonus spice.",
  },
  {
    id: "habbanya-erg",
    name: "Habbanya Erg",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    draw: 1,
    combat: true,
    maker: true,
    detail: "Six-player Maker space with draw.",
  },
  {
    id: "hagga-basin",
    name: "Hagga Basin",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    combat: true,
    maker: true,
    makerWorms: 1,
    detail: "Maker space; choose 2 spice or a sandworm with Maker Hooks.",
  },
  {
    id: "deep-desert",
    name: "Deep Desert",
    zone: "Desert",
    icon: "spice",
    cost: { water: 3 },
    gain: { spice: 4 },
    combat: true,
    maker: true,
    makerWorms: 2,
    detail: "Deep maker space; choose 4 spice or two sandworms with Maker Hooks.",
  },
];

export const boardSpaces: BoardSpace[] = boardSpaceSpecs.map(withBoardSpaceArt);

const reserveMarketSourceIds = [prepareTheWaySourceId, spiceMustFlowSourceId];

export const reserveMarket: Card[] = catalog.cards
  .filter((card) => reserveMarketSourceIds.includes(card.id))
  .sort((first, second) => reserveMarketSourceIds.indexOf(first.id) - reserveMarketSourceIds.indexOf(second.id))
  .map(toImperiumCard);
