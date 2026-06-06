import {
  backedByChoamSourceId,
  buyAccessSourceId,
  callToArmsSourceId,
  changeAllegiancesSourceId,
  contingencyPlanSourceId,
  councilorsAmbitionSourceId,
  cunningSourceId,
  departForArrakisSourceId,
  detonationSourceId,
  devourSourceId,
  distractionSourceId,
  findWeaknessSourceId,
  goToGroundSourceId,
  impressSourceId,
  imperiumPoliticsSourceId,
  inspireAweSourceId,
  intelligenceReportSourceId,
  leverageSourceId,
  manipulateSourceId,
  marketOpportunitySourceId,
  mercenariesSourceId,
  opportunismSourceId,
  questionableMethodsSourceId,
  reachAgreementSourceId,
  shaddamsFavorSourceId,
  sietchRitualSourceId,
  specialMissionSourceId,
  spiceIsPowerSourceId,
  springTheTrapSourceId,
  strategicStockpilingSourceId,
  tacticalOptionSourceId,
  unexpectedAlliesSourceId,
  weirdingCombatSourceId,
} from "./card-identifiers";
import {
  combatAcquireCard,
  combatGainResource,
  combatGainStrength,
  combatLoseInfluenceForStrength,
  combatPlaceSpies,
  combatRecallSpiesForStrength,
  combatRetreatTroops,
  combatSpendResource,
  combatTakeContracts,
  combatTrashCard,
  deployedTroopsRetreatBound,
  deployedUnitsThisTurn,
  gainedSpiceThisTurn,
  hasCombatRecipient,
  hasCombatRecipientSandworms,
  hasCompletedContracts,
  hasHighCouncilSeat,
  hasInfluence,
  hasRole,
  hasSpyPosts,
  hasTeam,
  plotAcquireCard,
  plotActivateAcquireRecruitBonus,
  plotDiscardCardForInfluence,
  plotDeployTroops,
  plotDrawCards,
  plotDrawIntrigues,
  plotGainResource,
  plotLoseInfluenceForResource,
  plotManipulateRowCard,
  plotPayResourcesAndLoseInfluenceForVp,
  plotPayResourcesForVp,
  plotPayResourceForInfluence,
  plotPayResourceForInfluenceGains,
  plotPlaceSpies,
  plotRecallSpy,
  plotRecruitTroops,
  plotRemoveShieldWall,
  plotResourceExchange,
  plotShiftInfluence,
  plotShiftInfluenceAndPayResourceForInfluenceGains,
  plotSpendResource,
  plotSummonSandworms,
  plotTakeContracts,
  plotTrashCard,
} from "./effect-specs";
import {
  attributeNumber,
  catalogCardTraits,
  catalog,
  summarizeAttributes,
  type HubCard,
} from "./catalog-data";
import type {
  BattleIconId,
  CardEffectSpec,
  ConflictBattleIconId,
  ConflictCard,
  ContractCard,
  FactionId,
  GameEffectConditionSpec,
  IntrigueCard,
  LeaderCard,
} from "./types";

const influenceLossFactions: FactionId[] = [
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
];

const buyAccessAllyFactions: FactionId[] = ["greatHouses", "fringeWorlds", "bene", "spacing"];
const buyAccessShaddamFactions: FactionId[] = ["emperor", "greatHouses", "fringeWorlds", "bene", "spacing"];
const buyAccessMuadDibFactions: FactionId[] = ["greatHouses", "fremen", "fringeWorlds", "bene", "spacing"];
const changeAllegiancesAllyFactions: FactionId[] = ["greatHouses", "spacing", "bene", "fringeWorlds"];
const changeAllegiancesShaddamFactions: FactionId[] = ["emperor", ...changeAllegiancesAllyFactions];
const changeAllegiancesMuadDibFactions: FactionId[] = [
  "greatHouses",
  "spacing",
  "bene",
  "fremen",
  "fringeWorlds",
];

function buyAccessChoiceId(first: FactionId, second: FactionId) {
  return `${first}+${second}`;
}

function buyAccessPrintedIcon(faction: FactionId) {
  if (faction === "emperor" || faction === "greatHouses") return "emperor";
  if (faction === "fremen" || faction === "fringeWorlds") return "fremen";
  return faction;
}

function buyAccessPlotSpecsFor(
  factions: FactionId[],
  ownerForFaction: (faction: FactionId) => "self" | "activated-ally",
  conditions: GameEffectConditionSpec[],
): CardEffectSpec[] {
  return factions.flatMap((first, firstIndex) =>
    factions.slice(firstIndex + 1)
      .filter((second) => buyAccessPrintedIcon(first) !== buyAccessPrintedIcon(second))
      .map((second) =>
        plotPayResourceForInfluenceGains(
          buyAccessChoiceId(first, second),
          "solari",
          5,
          [
            { selector: ownerForFaction(first), faction: first, amount: 1 },
            { selector: ownerForFaction(second), faction: second, amount: 1 },
          ],
          conditions,
        )
      )
  );
}

function changeAllegiancesShiftChoiceId(loseFaction: FactionId, gainFaction: FactionId) {
  return `shift:${loseFaction}->${gainFaction}`;
}

function changeAllegiancesSpendChoiceId(gainFaction: FactionId) {
  return `spend:${gainFaction}`;
}

function changeAllegiancesBothChoiceId(
  loseFaction: FactionId,
  shiftGainFaction: FactionId,
  spiceGainFaction: FactionId,
) {
  return `both:${loseFaction}->${shiftGainFaction}+spend:${spiceGainFaction}`;
}

function changeAllegiancesPlotSpecsFor(
  factions: FactionId[],
  ownerForFaction: (faction: FactionId) => "self" | "activated-ally",
  conditions: GameEffectConditionSpec[],
): CardEffectSpec[] {
  const shiftSpecs = factions.flatMap((loseFaction) =>
    factions.map((gainFaction) =>
      plotShiftInfluence(
        changeAllegiancesShiftChoiceId(loseFaction, gainFaction),
        { selector: ownerForFaction(loseFaction), faction: loseFaction, amount: 1 },
        { selector: ownerForFaction(gainFaction), faction: gainFaction, amount: 1 },
        conditions,
      )
    )
  );
  const spendSpecs = factions.map((gainFaction) =>
    plotPayResourceForInfluence(
      changeAllegiancesSpendChoiceId(gainFaction),
      "spice",
      3,
      ownerForFaction(gainFaction),
      gainFaction,
      1,
      conditions,
    )
  );
  const bothSpecs = factions.flatMap((loseFaction) =>
    factions.flatMap((shiftGainFaction) =>
      factions.map((spiceGainFaction) =>
        plotShiftInfluenceAndPayResourceForInfluenceGains(
          changeAllegiancesBothChoiceId(loseFaction, shiftGainFaction, spiceGainFaction),
          { selector: ownerForFaction(loseFaction), faction: loseFaction, amount: 1 },
          "spice",
          3,
          [
            { selector: ownerForFaction(shiftGainFaction), faction: shiftGainFaction, amount: 1 },
            { selector: ownerForFaction(spiceGainFaction), faction: spiceGainFaction, amount: 1 },
          ],
          conditions,
        )
      )
    )
  );
  return [...shiftSpecs, ...spendSpecs, ...bothSpecs];
}

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
export {
  catalogStats,
} from "./catalog-data";
export {
  imperiumDeck,
  reserveMarket,
} from "./imperium-card-data";
export {
  boardSpaces,
} from "./board-space-data";

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
const intrigueSummariesByCatalogId: Partial<Record<number, string>> = {
  127: "Discard a card to gain 1 Bene Gesserit or Fremen/Fringe Influence.",
  128: "Spend 3 Solari to draw 1 Intrigue and recruit 2 troops.",
  132: "Spend 2 spice to recruit 3 troops; with 3+ Fremen/Fringe Influence, draw 1 card.",
  133: "Draw 1 card OR spend 1 spice to draw 1 card and trash 1 card.",
  134: "Spend 2 Solari and lose 2 Influence to gain 1 VP.",
  143: "Remove and replace a card in the Imperium Row; during your Reveal turn this round, you may acquire it for 1 Persuasion less.",
  144: "After you deploy three or more units to the Conflict in a single turn, you may place a spy on the same observation post as another player's spy.",
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
  137: "Pay 2 water to remove the Shield Wall and deploy a sandworm to the Conflict.",
  146: "Retreat 1 or 2 troops, then place a spy.",
  151: "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
  154: "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
  157: "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Desert Mouse or wild Conflict you won to gain 1 VP.",
  158: "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Ornithopter or wild Conflict you won to gain 1 VP.",
  159: "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Crysknife or wild Conflict you won to gain 1 VP.",
  160: "Endgame: if you have 4+ Influence on a Faction track where an opponent has the Alliance, gain 1 VP.",
  161: "Endgame: if you have at least two The Spice Must Flow cards, gain 1 VP and 2 spice.",
  448: "Lose 1 Influence to gain 4 Solari as a Plot Intrigue OR add 4 strength in Combat if you have completed at least two contracts.",
  449: "Retreat 1 or 2 troops, then take a face-up CHOAM contract.",
  450: "Endgame: if you have completed four or more contracts, gain 1 VP.",
};

const intrigueNamesByCatalogId: Partial<Record<number, string>> = {
  158: "Ornithopter",
};

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
  if (card.id === backedByChoamSourceId) {
    return [
      ...influenceLossFactions.map((faction) =>
        plotLoseInfluenceForResource(faction, faction, 1, "solari", 4),
      ),
      combatGainStrength(4, [hasCompletedContracts(2)]),
    ];
  }
  if (card.id === callToArmsSourceId) {
    return [plotActivateAcquireRecruitBonus(1)];
  }
  if (card.id === detonationSourceId) {
    return [
      plotRemoveShieldWall({ source: "Detonation" }, undefined, { choiceId: "shield-wall" }),
      plotDeployTroops("self", 4, { source: "Detonation" }, [hasRole("Ally")], { choiceId: "deploy" }),
      plotDeployTroops("activated-ally", 4, { source: "Detonation" }, [hasRole("Commander")], { choiceId: "deploy" }),
    ];
  }
  if (card.id === unexpectedAlliesSourceId) {
    return [
      plotSpendResource("water", 2, undefined, { choiceId: "remove-shield-wall" }),
      plotRemoveShieldWall({ source: "Unexpected Allies" }, undefined, { choiceId: "remove-shield-wall" }),
      plotSummonSandworms("self", 1, { source: "Unexpected Allies" }, [hasRole("Ally")], { choiceId: "remove-shield-wall" }),
      plotSummonSandworms("activated-ally", 1, { source: "Unexpected Allies" }, [hasRole("Commander")], { choiceId: "remove-shield-wall" }),
    ];
  }
  if (card.id === councilorsAmbitionSourceId) {
    return [plotGainResource("water", 2, [hasHighCouncilSeat()])];
  }
  if (card.id === contingencyPlanSourceId) {
    return [
      plotGainResource("solari", 2),
      combatGainStrength(3),
    ];
  }
  if (card.id === impressSourceId) {
    return [
      combatGainStrength(2),
      combatAcquireCard("discard", 3, { source: "Impress" }),
    ];
  }
  if (card.id === findWeaknessSourceId) {
    return [
      combatGainStrength(2),
      combatRecallSpiesForStrength(1, 3, { optional: true, source: "Find Weakness" }, [hasSpyPosts(1)]),
    ];
  }
  if (card.id === goToGroundSourceId) {
    return [
      combatRetreatTroops(1, 2, { source: "Go To Ground" }, undefined, { choiceId: "retreat-troops" }),
      combatPlaceSpies(1, { source: "Go To Ground", mustPlace: true }, undefined, { choiceId: "retreat-troops" }),
    ];
  }
  if (card.id === spiceIsPowerSourceId) {
    return [
      combatRetreatTroops(3, 3, { source: "Spice is Power" }, undefined, { choiceId: "retreat-troops" }),
      combatGainResource("spice", 3, { source: "Spice is Power" }, undefined, { choiceId: "retreat-troops" }),
      combatSpendResource("spice", 3, { source: "Spice is Power" }, undefined, { choiceId: "spend-spice" }),
      combatGainStrength(6, undefined, { choiceId: "spend-spice" }),
    ];
  }
  if (card.id === tacticalOptionSourceId) {
    return [
      combatGainStrength(2, undefined, { choiceId: "add-strength" }),
      combatRetreatTroops(1, deployedTroopsRetreatBound(), { source: "Tactical Option" }, undefined, { choiceId: "retreat-troops" }),
    ];
  }
  if (card.id === questionableMethodsSourceId) {
    return [
      combatGainStrength(1),
      combatLoseInfluenceForStrength(4, {
        source: "Questionable Methods",
        alternateOwner: "source-commander-personal",
      }),
    ];
  }
  if (card.id === reachAgreementSourceId) {
    return [
      combatRetreatTroops(1, 2, { source: "Reach Agreement" }, undefined, { choiceId: "retreat-troops" }),
      combatTakeContracts(1, { source: "Reach Agreement" }, undefined, { choiceId: "retreat-troops" }),
    ];
  }
  if (card.id === springTheTrapSourceId) {
    return [
      combatRecallSpiesForStrength(2, 7, { source: "Spring The Trap" }, [hasSpyPosts(2)]),
    ];
  }
  if (card.id === devourSourceId) {
    return [
      combatGainStrength(2, [hasCombatRecipient()]),
      combatGainStrength(2, [hasCombatRecipientSandworms(1)]),
      combatTrashCard({ optional: true }, [hasCombatRecipientSandworms(1)]),
    ];
  }
  if (card.id === inspireAweSourceId) {
    return [
      plotAcquireCard("to-discard", "discard", 3, { source: "Inspire Awe" }),
      plotAcquireCard("to-hand", "hand", 3, { source: "Inspire Awe" }),
    ];
  }
  if (card.id === sietchRitualSourceId) {
    return [
      plotDiscardCardForInfluence("bene", "bene", "self", [hasRole("Ally")]),
      plotDiscardCardForInfluence("fringeWorlds", "fringeWorlds", "self", [hasRole("Ally")]),
      plotDiscardCardForInfluence("bene", "bene", "activated-ally", [hasRole("Commander")]),
      plotDiscardCardForInfluence("fringeWorlds", "fringeWorlds", "activated-ally", [hasRole("Commander")]),
      plotDiscardCardForInfluence("fremen", "fremen", "self", [hasRole("Commander"), hasTeam("muaddib")]),
    ];
  }
  if (card.id === changeAllegiancesSourceId) {
    return [
      ...changeAllegiancesPlotSpecsFor(changeAllegiancesAllyFactions, () => "self", [hasRole("Ally")]),
      ...changeAllegiancesPlotSpecsFor(
        changeAllegiancesShaddamFactions,
        (faction) => faction === "emperor" ? "self" : "activated-ally",
        [hasRole("Commander"), hasTeam("shaddam")],
      ),
      ...changeAllegiancesPlotSpecsFor(
        changeAllegiancesMuadDibFactions,
        (faction) => faction === "fremen" ? "self" : "activated-ally",
        [hasRole("Commander"), hasTeam("muaddib")],
      ),
    ];
  }
  if (card.id === cunningSourceId) {
    return [
      plotDrawCards(1, undefined, { choiceId: "draw" }),
      plotSpendResource("spice", 1, undefined, { choiceId: "paid-trash" }),
      plotDrawCards(1, undefined, { choiceId: "paid-trash" }),
      plotTrashCard({ optional: false }, undefined, { choiceId: "paid-trash" }),
    ];
  }
  if (card.id === distractionSourceId) {
    return [
      plotPlaceSpies(1, { recallForSupply: true, allowSharedPost: true, source: "Distraction" }, [
        deployedUnitsThisTurn(3),
      ]),
    ];
  }
  if (card.id === specialMissionSourceId) {
    return [
      plotPlaceSpies(1, {
        recallForSupply: true,
        mustPlace: true,
        placementIcon: "city",
        source: "Special Mission",
      }, undefined, { choiceId: "place-spy" }),
      plotRecallSpy({
        reward: { resource: "spice", amount: 2 },
        removeShieldWall: true,
        source: "Special Mission",
      }, undefined, { choiceId: "recall-spy" }),
    ];
  }
  if (card.id === leverageSourceId) {
    return [
      plotGainResource("solari", 1, [gainedSpiceThisTurn()]),
      plotTakeContracts(1, { optional: true, source: "Leverage" }, [gainedSpiceThisTurn()]),
    ];
  }
  if (card.id === manipulateSourceId) {
    return [plotManipulateRowCard({ source: "Manipulate" })];
  }
  if (card.id === departForArrakisSourceId) {
    return [
      plotDrawCards(1, [hasInfluence("fremen", 3)], { choiceId: "draw" }),
      plotSpendResource("spice", 2, undefined, { choiceId: "spend-spice" }),
      plotRecruitTroops("self", 3, [hasRole("Ally")], { choiceId: "spend-spice" }),
      plotRecruitTroops("activated-ally", 3, [hasRole("Commander")], { choiceId: "spend-spice" }),
      plotDrawCards(1, [hasInfluence("fremen", 3)], { choiceId: "spend-spice" }),
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
  if (card.id === opportunismSourceId) {
    return influenceLossFactions.flatMap((first, firstIndex) =>
      influenceLossFactions.slice(firstIndex).map((second) =>
        plotPayResourcesAndLoseInfluenceForVp(
          `${first}+${second}`,
          [{ resource: "solari", amount: 2 }],
          first === second
            ? [{ faction: first, amount: 2 }]
            : [
                { faction: first, amount: 1 },
                { faction: second, amount: 1 },
              ],
          1,
        )
      )
    );
  }
  if (card.id === marketOpportunitySourceId) {
    return [
      plotResourceExchange("spice-to-solari", "spice", 2, "solari", 5),
      plotResourceExchange("solari-to-spice", "solari", 5, "spice", 5),
    ];
  }
  if (card.id === buyAccessSourceId) {
    return [
      ...buyAccessPlotSpecsFor(buyAccessAllyFactions, () => "self", [hasRole("Ally")]),
      ...buyAccessPlotSpecsFor(
        buyAccessShaddamFactions,
        (faction) => faction === "emperor" ? "self" : "activated-ally",
        [hasRole("Commander"), hasTeam("shaddam")],
      ),
      ...buyAccessPlotSpecsFor(
        buyAccessMuadDibFactions,
        (faction) => faction === "fremen" ? "self" : "activated-ally",
        [hasRole("Commander"), hasTeam("muaddib")],
      ),
    ];
  }
  if (card.id === imperiumPoliticsSourceId) {
    return [
      plotPayResourceForInfluence("emperor", "solari", 1, "self", "emperor", 1, [
        hasRole("Commander"),
        hasTeam("shaddam"),
      ]),
      plotPayResourceForInfluence("greatHouses", "solari", 1, "self", "greatHouses", 1, [hasRole("Ally")]),
      plotPayResourceForInfluence("spacing", "solari", 1, "self", "spacing", 1, [hasRole("Ally")]),
      plotPayResourceForInfluence("greatHouses", "solari", 1, "activated-ally", "greatHouses", 1, [
        hasRole("Commander"),
      ]),
      plotPayResourceForInfluence("spacing", "solari", 1, "activated-ally", "spacing", 1, [
        hasRole("Commander"),
      ]),
    ];
  }
  if (card.id === strategicStockpilingSourceId) {
    return [
      plotPayResourcesForVp("spice", [{ resource: "spice", amount: 5 }], 1),
      plotPayResourcesForVp("water", [{ resource: "water", amount: 3 }], 1, [hasInfluence("spacing", 3)]),
      plotPayResourcesForVp("both", [
        { resource: "spice", amount: 5 },
        { resource: "water", amount: 3 },
      ], 2, [hasInfluence("spacing", 3)]),
    ];
  }
  if (card.id === shaddamsFavorSourceId) {
    return [
      plotRecruitTroops("self", 1, [hasRole("Ally")]),
      plotRecruitTroops("activated-ally", 1, [hasRole("Commander")]),
      plotGainResource("solari", 3, [hasInfluence("emperor", 3)]),
    ];
  }
  if (card.id === weirdingCombatSourceId) {
    return [
      combatGainStrength(3),
      combatGainStrength(2, [hasInfluence("bene", 3)]),
    ];
  }
  return undefined;
}

function toIntrigueCard(card: HubCard): IntrigueCard {
  const battleIcon = intrigueBattleIconsByCatalogId[card.id];
  const combatSwords = attributeNumber(card, "Swords");
  return {
    id: `intrigue-${card.id}`,
    name: intrigueNamesByCatalogId[card.id] ?? card.name,
    summary: intrigueSummariesByCatalogId[card.id] ?? summarizeAttributes(card),
    effects: intrigueCardEffects(card),
    battleIcon,
    combatSwords: combatSwords > 0 ? combatSwords : undefined,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    traits: catalogCardTraits(card),
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
