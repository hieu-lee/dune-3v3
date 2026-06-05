import {
  beneGesseritOperativeSourceId,
  branchingPathSourceId,
  calculusOfPowerSourceId,
  capturedMentatSourceId,
  chaniCleverTacticianSourceId,
  cargoRunnerSourceId,
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
  imperialSpymasterSourceId,
  junctionHeadquartersSourceId,
  leadershipSourceId,
  longLiveTheFightersSourceId,
  makerKeeperSourceId,
  maulaPistolSourceId,
  northernWatermasterSourceId,
  overthrowSourceId,
  paracompassSourceId,
  prepareTheWaySourceId,
  priceIsNoObjectSourceId,
  priorityContractsSourceId,
  publicSpectacleSourceId,
  rebelSupplierSourceId,
  reliableInformantSourceId,
  sardaukarCoordinationSourceId,
  sardaukarSoldierSourceId,
  shishakliSourceId,
  smugglersHavenSourceId,
  smugglersHarvesterSourceId,
  southernEldersSourceId,
  spacingGuildFavorSourceId,
  spaceTimeFoldingSourceId,
  steersmanSourceId,
  spiceMustFlowSourceId,
  spyNetworkSourceId,
  stilgarDevotedSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
  treadInDarknessSourceId,
  theacherousManeuverSourceId,
  undercoverAssetSourceId,
  unswervingLoyaltySourceId,
  weirdingWomanSourceId,
  wheelsWithinWheelsSourceId,
} from "./card-identifiers";
import {
  acquireDrawIntrigues,
  acquireGainInfluence,
  acquireGainInfluenceChoice,
  acquireGainResource,
  acquireGainVp,
  acquirePlaceSpies,
  acquireTakeContracts,
  agentAcquireCard,
  agentDiscardCardForDraw,
  agentDiscardCardsForReward,
  agentDeployRecruitedTroops,
  agentDrawCards,
  agentDrawIntrigues,
  agentGainBoardSpaceInfluence,
  agentGainInfluenceChoice,
  agentGainResource,
  agentOpponentsDiscardCards,
  agentPaidRewardChoice,
  agentPayResourceForDrawCards,
  agentPlaceSpies,
  agentRecallAgent,
  agentRecruitTroops,
  agentReturnSourceToHand,
  agentSelectTopDeckCards,
  agentTakeContracts,
  agentTrashCards,
  agentTrashIntrigueForReward,
  agentTrashSource,
  agentTrashSourceForDrawCards,
  discardGainResource,
  trashDrawIntrigues,
  acquiredCardThisTurn,
  hasAlliance,
  hasCardTraitInPlay,
  hasCompletedContracts,
  hasConflictUnits,
  hasHighCouncilSeat,
  hasInfluence,
  hasRole,
  hasSpyPostOnMakerSpace,
  hasSpyPosts,
  hasSwordmasterBonus,
  hasTeam,
  recalledSpyThisTurn,
  revealDeployOrRetreatTroops,
  revealDrawIntrigues,
  revealGainInfluence,
  revealGainInfluenceForSpiedFactions,
  revealGainPersuasion,
  revealLoseInfluenceForInfluence,
  revealPaidRewardChoice,
  revealPendingActionChoice,
  revealPlaceSpies,
  revealRecallSpyForIntrigues,
  revealRecallSpiesForPersuasion,
  revealGainResource,
  revealGainStrength,
  revealPayResourceForSandworms,
  revealRetreatTroopsForStrength,
  revealRecruitTroops,
  revealTrashCardForStrength,
  visitedMakerSpace,
  visitedSpaceIcon,
  visitedSpaceWithSpyPost,
} from "./effect-specs";
import {
  attributeNumber,
  catalogCardTraits,
  catalog,
  hasConditionalAttribute,
  iconAttributeMap,
  type HubCard,
} from "./catalog-data";
import { imperiumPlayText } from "./imperium-card-play-text";
import type {
  Card,
  CardEffectSpec,
  FactionId,
  GameEffectConditionSpec,
  PaidRewardChoiceEffectOption,
  ResourceId,
} from "./types";

const acquireSpySourceIds = new Set([
  guildSpySourceId,
  inHighPlacesSourceId,
  spyNetworkSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
]);

const mainBoardInfluenceFactions: FactionId[] = ["greatHouses", "spacing", "bene", "fringeWorlds"];

function paidInfluenceOptions(
  selector: "self" | "activated-ally",
  factions: FactionId[],
  resource: ResourceId,
  cost: number,
): PaidRewardChoiceEffectOption[] {
  return factions.map((faction) => ({
    id: `${selector}-${faction}`,
    resource,
    cost,
    reward: { kind: "gain-influence", selector, faction, amount: 1 },
  }));
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
    return "+1 persuasion.";
  }
  if (card.id === unswervingLoyaltySourceId) {
    return "+1 persuasion. Recruit 1 troop. Fremen Bond: you may deploy or retreat 1 troop.";
  }
  if (card.id === interstellarTradeSourceId) {
    return "+1 persuasion for each completed contract.";
  }
  if (card.id === junctionHeadquartersSourceId) {
    return "+1 persuasion. Gain 1 water and recruit 1 troop.";
  }
  if (card.id === calculusOfPowerSourceId) {
    return "+2 persuasion. You may trash another Emperor card you have in play to add 3 strength.";
  }
  if (card.id === capturedMentatSourceId) {
    return "+1 persuasion. You may lose 1 Influence to gain 1 Influence.";
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return "+1 persuasion. If you have two or more spies on the board, +2 persuasion.";
  }
  if (card.id === spyNetworkSourceId) {
    return "+2 persuasion and +1 strength. If you have two or more spies on the board, you may recall 1 spy to draw 1 Intrigue.";
  }
  if (card.id === guildSpySourceId) {
    return "+2 persuasion. If you acquired The Spice Must Flow this turn, gain 1 Influence with each faction you're spying on.";
  }
  if (card.id === shishakliSourceId) {
    return "+2 strength. Fremen Bond: gain 1 Fremen Influence.";
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
  if (card.id === publicSpectacleSourceId) {
    return "+1 persuasion. Place 1 spy.";
  }
  if (card.id === rebelSupplierSourceId) {
    return "Gain 1 spice and +1 strength.";
  }
  if (card.id === covertOperationSourceId) {
    return "Place 2 spies.";
  }
  if (card.id === desertPowerSourceId) {
    return "+2 persuasion, or pay 1 water to summon 1 sandworm.";
  }
  if (card.id === priceIsNoObjectSourceId) {
    return "+2 persuasion. Gain 2 Solari.";
  }
  if (card.id === smugglersHavenSourceId) {
    return "+1 persuasion. If you are spying on a Maker board space, gain 2 spice.";
  }
  if (card.id === southernEldersSourceId) {
    return "Gain 1 water. Fremen Bond: +2 persuasion.";
  }
  if (card.id === spiceMustFlowSourceId) {
    return "Gain 1 spice.";
  }
  if (card.id === corrinthCitySourceId) {
    return "Gain 5 Solari, or spend 5 Solari to take your High Council seat.";
  }
  if (card.id === deliveryAgreementSourceId) {
    return "Gain 1 spice, or if you have completed four or more contracts, trash this card to gain 1 VP.";
  }
  if (card.id === leadershipSourceId) {
    return "+2 persuasion and +1 strength. Add +1 strength for each other revealed card that provides strength this turn.";
  }
  if (card.id === inHighPlacesSourceId) {
    return "+2 persuasion. You may recall 2 spies to gain +3 persuasion.";
  }
  if (card.id === undercoverAssetSourceId) {
    return "Place 1 spy or +2 strength.";
  }
  if (card.id === overthrowSourceId) {
    return "+2 persuasion and +2 strength. Recruit 1 troop.";
  }
  if (card.id === priorityContractsSourceId) {
    return "Gain 2 spice, or if you have completed four or more contracts, trash this card to gain 1 VP.";
  }
  if (card.id === sardaukarCoordinationSourceId) {
    return "+2 persuasion. Add +1 strength for each Emperor card you revealed, including this one.";
  }
  if (card.id === spacingGuildFavorSourceId) {
    return "+2 persuasion. You may pay 3 spice to gain 1 Influence.";
  }
  if (card.id === steersmanSourceId) {
    return "+2 persuasion. Gain 2 spice.";
  }
  if (card.id === stilgarDevotedSourceId) {
    return "+2 persuasion for each Fremen card you have in play, including this one.";
  }
  if (card.id === wheelsWithinWheelsSourceId) {
    return "+1 persuasion. Place 1 spy.";
  }
  return printedReveal ? "Resolve printed reveal text." : revealText(persuasion, swords);
}

function imperiumCardEffects(card: HubCard): CardEffectSpec[] | undefined {
  const simpleAgentEffects = imperiumSimpleAgentEffects(card);
  if (simpleAgentEffects) return simpleAgentEffects;

  if (card.id === smugglersHarvesterSourceId) {
    return [
      agentGainResource("spice", 1, [visitedMakerSpace()]),
      revealGainPersuasion(1),
    ];
  }
  if (card.id === unswervingLoyaltySourceId) {
    return [
      revealGainPersuasion(1),
      revealRecruitTroops(1),
      revealDeployOrRetreatTroops(1, {}, [hasCardTraitInPlay("Faction: Fremen", 2)]),
    ];
  }
  if (card.id === weirdingWomanSourceId) {
    return [
      agentReturnSourceToHand({}, [hasCardTraitInPlay("Faction: Bene Gesserit", 2)]),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === sardaukarCoordinationSourceId) {
    return [
      agentDeployRecruitedTroops({ source: "Sardaukar Coordination" }),
      revealGainPersuasion(2),
      revealGainStrength({ kind: "revealed-card-trait-count", trait: "Faction: Emperor" }),
    ];
  }
  if (card.id === interstellarTradeSourceId) {
    return [
      agentGainInfluenceChoice(1, { source: "Interstellar Trade" }),
      acquireTakeContracts(1, { source: "Interstellar Trade" }),
      revealGainPersuasion({ kind: "completed-contracts" }),
    ];
  }
  if (card.id === steersmanSourceId) {
    return [
      agentDrawCards(1),
      agentRecallAgent(),
      acquireGainInfluence("spacing", 1),
      revealGainPersuasion(2),
      revealGainResource("spice", 2),
    ];
  }
  if (card.id === spacingGuildFavorSourceId) {
    return [
      agentDrawCards(1),
      discardGainResource("spice", 2),
      revealGainPersuasion(2),
      revealPaidRewardChoice(
        paidInfluenceOptions("self", mainBoardInfluenceFactions, "spice", 3),
        { requirePayableOption: true, source: "Spacing Guild's Favor" },
        [hasRole("Ally")],
      ),
      revealPaidRewardChoice(
        [
          ...paidInfluenceOptions("self", ["emperor"], "spice", 3),
          ...paidInfluenceOptions("activated-ally", mainBoardInfluenceFactions, "spice", 3),
        ],
        { requirePayableOption: true, source: "Spacing Guild's Favor" },
        [hasRole("Commander"), hasTeam("shaddam")],
      ),
      revealPaidRewardChoice(
        [
          ...paidInfluenceOptions("self", ["fremen"], "spice", 3),
          ...paidInfluenceOptions("activated-ally", mainBoardInfluenceFactions, "spice", 3),
        ],
        { requirePayableOption: true, source: "Spacing Guild's Favor" },
        [hasRole("Commander"), hasTeam("muaddib")],
      ),
    ];
  }
  if (card.id === branchingPathSourceId) {
    return [
      agentTrashIntrigueForReward({
        drawIntrigues: 1,
        gain: { spice: 2 },
        optional: true,
      }, [hasAlliance("bene")]),
      revealGainPersuasion(2),
    ];
  }
  if (card.id === junctionHeadquartersSourceId) {
    return [
      agentTrashIntrigueForReward({
        cost: { spice: 2 },
        gainVp: 1,
        optional: true,
      }, [hasAlliance("spacing")]),
      revealGainPersuasion(1),
      revealGainResource("water", 1),
      revealRecruitTroops(1),
    ];
  }
  if (card.id === calculusOfPowerSourceId) {
    return [
      agentTrashCards(),
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
      agentDiscardCardForDraw(1, { drawIntrigues: 1 }),
      revealGainPersuasion(1),
      revealLoseInfluenceForInfluence(),
    ];
  }
  if (card.id === leadershipSourceId) {
    return [
      agentDrawCards({ kind: "combat-recipient-sandworms" }),
      revealGainPersuasion(2),
      revealGainStrength(1),
      revealGainStrength({ kind: "other-revealed-card-strength-count" }),
    ];
  }
  if (card.id === undercoverAssetSourceId) {
    return [
      revealPendingActionChoice(
        [
          {
            id: "spy",
            label: "Place 1 spy",
            effect: {
              kind: "place-spies",
              selector: "self",
              amount: 1,
              recallForSupply: true,
              mustPlace: true,
            },
          },
          {
            id: "strength",
            label: "+2 strength",
            effect: { kind: "gain-strength", selector: "self", amount: 2 },
          },
        ],
        { source: "Undercover Asset" },
      ),
    ];
  }
  if (card.id === theacherousManeuverSourceId) {
    return [
      agentGainBoardSpaceInfluence(1, {
        trashSource: true,
        requiredHandTrashTrait: "Faction: Emperor",
        source: "Treacherous Maneuver",
      }),
      revealGainPersuasion(1),
      revealDrawIntrigues(1),
    ];
  }
  if (card.id === covertOperationSourceId) {
    return [
      agentOpponentsDiscardCards(1, { source: "Covert Operation" }),
      revealPlaceSpies(2, { recallForSupply: true, mustPlace: true }),
    ];
  }
  if (card.id === dangerousRhetoricSourceId) {
    return [
      agentGainInfluenceChoice(1, { trashSource: true }),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === desertSurvivalSourceId) {
    return [
      agentTrashSource(),
      revealGainPersuasion(1),
      revealGainStrength(1),
    ];
  }
  if (card.id === treadInDarknessSourceId) {
    return [
      agentTrashSourceForDrawCards(1, {}, [hasCardTraitInPlay("Faction: Bene Gesserit", 2)]),
      revealGainPersuasion(2),
      revealGainStrength(1),
    ];
  }
  if (card.id === shishakliSourceId) {
    return [
      agentTrashSourceForDrawCards(1),
      revealGainStrength(2),
      revealGainInfluence("fremen", 1, [hasCardTraitInPlay("Faction: Fremen", 2)]),
    ];
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return [
      agentPlaceSpies("self", 1, { recallForSupply: true, mustPlace: true }),
      revealGainPersuasion(1),
      revealGainPersuasion(2, [hasSpyPosts(2)]),
    ];
  }
  if (card.id === spyNetworkSourceId) {
    return [
      revealGainPersuasion(2),
      revealGainStrength(1),
      revealRecallSpyForIntrigues(1, { source: "Spy Network" }, [hasSpyPosts(2)]),
      acquirePlaceSpies(1, { recallForSupply: true, mustPlace: true }),
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
  if (card.id === smugglersHavenSourceId) {
    return [
      agentPaidRewardChoice(
        [{
          id: "vp",
          resource: "spice",
          cost: 4,
          reward: { kind: "gain-vp", selector: "self", amount: 1 },
        }],
        { requirePayableOption: true, source: "Smuggler's Haven" },
      ),
      revealGainPersuasion(1),
      revealGainResource("spice", 2, [hasSpyPostOnMakerSpace()]),
    ];
  }
  if (card.id === corrinthCitySourceId) {
    return [
      agentDiscardCardsForReward(2, {
        cost: { solari: 5 },
        gainVp: 1,
        source: "Corrinth City",
      }),
      revealPendingActionChoice(
        [
          {
            id: "solari",
            label: "+5 Solari",
            effect: {
              kind: "gain-resource",
              selector: "self",
              resource: "solari",
              amount: 5,
              source: "Corrinth City",
            },
          },
          {
            id: "high-council",
            label: "Spend 5 Solari for High Council seat",
            effect: {
              kind: "pay-resource-for-high-council-seat",
              selector: "self",
              resource: "solari",
              cost: 5,
              persuasionReward: 2,
              source: "Corrinth City",
            },
          },
        ],
        { source: "Corrinth City" },
      ),
    ];
  }
  if (card.id === deliveryAgreementSourceId) {
    return [
      agentDiscardCardsForReward(1, {
        takeContracts: { amount: 1, sourcePool: "public-offer" },
        source: "Delivery Agreement",
      }),
      revealPendingActionChoice(
        [
          {
            id: "spice",
            label: "+1 spice",
            effect: { kind: "gain-resource", selector: "self", resource: "spice", amount: 1 },
          },
          {
            id: "vp",
            label: "Trash this card for 1 VP",
            conditions: [hasCompletedContracts(4)],
            effect: {
              kind: "trash-card",
              selector: "self",
              zones: ["playArea"],
              sourceOnly: true,
              optional: false,
              vpReward: 1,
            },
          },
        ],
        { source: "Delivery Agreement" },
      ),
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
  if (card.id === longLiveTheFightersSourceId) {
    return [
      agentSelectTopDeckCards({
        lookCards: 3,
        drawCards: 1,
        discardCards: 1,
        trashCards: 1,
        minimumDeckCards: 3,
      }),
      revealGainPersuasion(2),
      revealGainStrength(3),
    ];
  }
  if (card.id === priorityContractsSourceId) {
    return [
      agentTakeContracts(1, { source: "Priority Contracts" }),
      revealPendingActionChoice(
        [
          {
            id: "spice",
            label: "+2 spice",
            effect: { kind: "gain-resource", selector: "self", resource: "spice", amount: 2 },
          },
          {
            id: "vp",
            label: "Trash this card for 1 VP",
            conditions: [hasCompletedContracts(4)],
            effect: {
              kind: "trash-card",
              selector: "self",
              zones: ["playArea"],
              sourceOnly: true,
              optional: false,
              vpReward: 1,
            },
          },
        ],
        { source: "Priority Contracts" },
      ),
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
      agentPlaceSpies(
        "self",
        1,
        { recallForSupply: true, mustPlace: true, placementIcons: ["emperor", "bene", "spacing"] },
      ),
      revealGainPersuasion(1),
      revealGainResource("solari", 1),
    ];
  }
  if (card.id === publicSpectacleSourceId) {
    return [
      agentGainInfluenceChoice(1, {}, [recalledSpyThisTurn()]),
      revealGainPersuasion(1),
      revealPlaceSpies(1, { recallForSupply: true, mustPlace: true }),
    ];
  }
  if (card.id === rebelSupplierSourceId) {
    return [
      ...agentRecruitTroopsForActivatedOwner(2, [recalledSpyThisTurn()]),
      revealGainResource("spice", 1),
      revealGainStrength(1),
    ];
  }
  if (card.id === southernEldersSourceId) {
    return [
      ...agentRecruitTroopsForActivatedOwner(2, [hasCardTraitInPlay("Faction: Bene Gesserit", 2)]),
      revealGainResource("water", 1),
      revealGainPersuasion(2, [hasCardTraitInPlay("Faction: Fremen", 2)]),
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
      revealPlaceSpies(1, { recallForSupply: true, mustPlace: true }),
    ];
  }
  if (card.id === sardaukarSoldierSourceId) {
    return [
      revealGainPersuasion(1),
      revealGainStrength(1),
      trashDrawIntrigues(1),
    ];
  }
  if (card.id === stilgarDevotedSourceId) {
    return [
      ...agentRecruitTroopsForActivatedOwner(2),
      revealGainPersuasion({ kind: "card-trait-count-in-play", trait: "Faction: Fremen", multiplier: 2 }),
    ];
  }
  if (acquireSpySourceIds.has(card.id)) {
    const inHighPlacesAgentCondition = [hasCardTraitInPlay("Faction: Bene Gesserit", 2)];
    const strikeFleetAgentCondition = [recalledSpyThisTurn()];
    return [
      ...(card.id === inHighPlacesSourceId
        ? [
            revealGainPersuasion(2),
            revealRecallSpiesForPersuasion(2, 3, { source: "In High Places" }),
          ]
        : fixedRevealEffects(
            attributeNumber(card, "Persuasion on reveal"),
            attributeNumber(card, "Swords"),
          ) ?? []),
      ...(card.id === guildSpySourceId
        ? [
            agentDiscardCardForDraw(1, {
              bonusIntrigues: {
                requiredDiscardTrait: "Faction: Spacing Guild",
                amount: 1,
              },
            }),
            revealGainInfluenceForSpiedFactions(
              1,
              [acquiredCardThisTurn(String(spiceMustFlowSourceId))],
            ),
          ]
        : []),
      ...(card.id === inHighPlacesSourceId
        ? [
            agentDrawCards(1, inHighPlacesAgentCondition),
            agentPlaceSpies("self", 1, { recallForSupply: true, mustPlace: true }, inHighPlacesAgentCondition),
          ]
        : []),
      ...(card.id === strikeFleetSourceId
        ? agentRecruitTroopsForActivatedOwner(3, strikeFleetAgentCondition)
        : []),
      ...(card.id === subversiveAdvisorSourceId
        ? [agentGainBoardSpaceInfluence(1, { trashSource: true })]
        : []),
      acquirePlaceSpies(1, { recallForSupply: true, mustPlace: true }),
    ];
  }
  if (card.id === overthrowSourceId) {
    return [
      agentGainBoardSpaceInfluence(1),
      ...(fixedRevealEffects(
        attributeNumber(card, "Persuasion on reveal"),
        attributeNumber(card, "Swords"),
      ) ?? []),
      revealRecruitTroops(1),
      acquireDrawIntrigues(1),
    ];
  }
  if (card.id === priceIsNoObjectSourceId) {
    return [
      agentAcquireCard({ destination: "hand", paymentResource: "solari", optional: true }),
      ...(fixedRevealEffects(
        attributeNumber(card, "Persuasion on reveal"),
        attributeNumber(card, "Swords"),
        { solari: 2 },
      ) ?? []),
      acquireGainResource("solari", 2),
    ];
  }
  if (card.id === spiceMustFlowSourceId) {
    return [
      acquireGainVp(1),
      revealGainResource("spice", 1),
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
  discardGain?: Partial<Record<ResourceId, number>>;
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
  [imperialSpymasterSourceId]: { drawIntrigues: 1, conditions: [recalledSpyThisTurn()] },
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
  for (const resource of ["solari", "spice", "water"] as const) {
    const amount = config.discardGain?.[resource] ?? 0;
    if (amount > 0) effects.push(discardGainResource(resource, amount));
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

function effectModelsVictoryPoint(effect: CardEffectSpec["effects"][number]) {
  const paidRewardModelsVictoryPoint = (reward: Extract<CardEffectSpec["effects"][number], { kind: "paid-reward-choice" }>["options"][number]["reward"]): boolean =>
    reward.kind === "bundle"
      ? reward.rewards.some((nestedReward) => nestedReward.kind === "gain-vp")
      : reward.kind === "gain-vp";
  return effect.kind === "gain-vp" ||
    effect.kind === "pay-team-resource-for-vp" ||
    (effect.kind === "paid-reward-choice" && effect.options.some((option) => paidRewardModelsVictoryPoint(option.reward))) ||
    (effect.kind === "pending-action-choice" && effect.options.some((option) =>
      option.effect.kind === "trash-card" && option.effect.vpReward !== undefined
    )) ||
    (effect.kind === "trash-card" && effect.vpReward !== undefined) ||
    (effect.kind === "discard-cards-for-reward" && effect.gainVp !== undefined) ||
    (effect.kind === "trash-intrigue-for-reward" && effect.gainVp !== undefined);
}

function effectsModelVictoryPoints(effects: CardEffectSpec[] | undefined) {
  return effects?.some((spec) => spec.effects.some(effectModelsVictoryPoint)) ?? false;
}

function acquiredVictoryPoints(card: HubCard, effects: CardEffectSpec[] | undefined) {
  if (!hasConditionalAttribute(card, "Victory Point")) return undefined;
  if (card.id === deliveryAgreementSourceId) return undefined;
  if (hasConditionalAttribute(card, "Acquire bonus")) return 1;
  return effectsModelVictoryPoints(effects) ? undefined : 1;
}

function toImperiumCard(card: HubCard): Card {
  if (card.id === prepareTheWaySourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: ["landsraad", "city"],
      persuasion: 2,
      swords: 0,
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
      effects: imperiumCardEffects(card),
      play: "Discard 1 card to draw 1 Intrigue and 1 card.",
      reveal: imperiumRevealText(card, 1, 0, false),
      cost: 5,
      imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
      thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
      sourceId: card.id,
      sourceSlug: card.slug,
      sourceType: card.type,
      traits: catalogCardTraits(card),
    };
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return {
      id: `hub-${card.id}`,
      name: card.name,
      icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
      persuasion: 1,
      swords: 0,
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
  const persuasion =
    card.id === paracompassSourceId ? 0 :
    card.id === inHighPlacesSourceId ? 2 :
    card.id === southernEldersSourceId ? 0 :
    attributeNumber(card, "Persuasion on reveal");
  const swords = card.id === undercoverAssetSourceId ? 0 : attributeNumber(card, "Swords");
  const revealGain =
    card.id === fedaykinStilltentSourceId
      ? { water: 1 }
      : card.id === southernEldersSourceId
        ? { water: 1 }
      : card.id === reliableInformantSourceId
        ? { solari: 1 }
      : card.id === rebelSupplierSourceId
          ? { spice: 1 }
          : card.id === steersmanSourceId
            ? { spice: 2 }
          : card.id === priceIsNoObjectSourceId
          ? { solari: 2 }
          : card.id === spiceMustFlowSourceId
            ? { spice: 1 }
          : undefined;
  const effects = imperiumCardEffects(card) ?? fixedRevealEffects(persuasion, swords, revealGain);
  const name = card.id === theacherousManeuverSourceId ? "Treacherous Maneuver" : card.name;
  return {
    id: `hub-${card.id}`,
    name,
    icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
    acquired: acquiredVictoryPoints(card, effects),
    persuasion,
    swords,
    revealGain,
    effects,
    ...(card.id === undercoverAssetSourceId ? { ignoreInfluenceRequirements: true } : {}),
    play: imperiumPlayText(card),
    reveal: card.id === theacherousManeuverSourceId
      ? "+1 persuasion. Draw 1 Intrigue."
      : imperiumRevealText(card, persuasion, swords, false),
    cost: attributeNumber(card, "Persuasion cost"),
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    sourceType: card.type,
    traits: card.id === unswervingLoyaltySourceId ? ["Faction: Fremen"] : catalogCardTraits(card),
  };
}

export const imperiumDeck: Card[] = catalog.cards
  .filter((card) => card.type === "imperium")
  .map(toImperiumCard);

const reserveMarketSourceIds = [prepareTheWaySourceId, spiceMustFlowSourceId];

export const reserveMarket: Card[] = catalog.cards
  .filter((card) => reserveMarketSourceIds.includes(card.id))
  .sort((first, second) => reserveMarketSourceIds.indexOf(first.id) - reserveMarketSourceIds.indexOf(second.id))
  .map(toImperiumCard);
