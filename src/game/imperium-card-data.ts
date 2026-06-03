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
  theacherousManeuverSourceId,
  treadInDarknessSourceId,
  truthtranceSourceId,
  undercoverAssetSourceId,
  unswervingLoyaltySourceId,
  weirdingWomanSourceId,
  wheelsWithinWheelsSourceId,
} from "./card-identifiers";
import {
  acquireDrawIntrigues,
  acquireGainInfluenceChoice,
  acquireGainResource,
  acquireGainVp,
  acquirePlaceSpies,
  acquireTakeContracts,
  agentAcquireCard,
  agentDiscardCardForDraw,
  agentDiscardCardForInfluenceAndDraw,
  agentDiscardCardsForReward,
  agentDeployRecruitedTroops,
  agentDrawCards,
  agentDrawIntrigues,
  agentGainBoardSpaceInfluence,
  agentGainInfluenceChoice,
  agentGainResource,
  agentGainVp,
  agentOpponentsDiscardCards,
  agentPayResourceForDrawCards,
  agentPayResourceForSandworms,
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
  recalledSpyThisTurn,
  revealDeployOrRetreatTroops,
  revealGainInfluence,
  revealGainPersuasion,
  revealPlaceSpies,
  revealRecallSpyForIntrigues,
  revealGainResource,
  revealGainStrength,
  revealLoseInfluenceForIntrigues,
  revealPayResourceForHighCouncilSeat,
  revealPayResourceForSandworms,
  revealRetreatTroopsForStrength,
  revealRecruitTroops,
  revealTrashCardForStrength,
  revealTrashSourceForVp,
  visitedMakerSpace,
  visitedSpaceIcon,
  visitedSpaceWithSpyPost,
} from "./effect-specs";
import {
  attributeNumber,
  catalog,
  hasConditionalAttribute,
  iconAttributeMap,
  summarizeAttributes,
  type HubCard,
} from "./catalog-data";
import type {
  Card,
  CardEffectSpec,
  GameEffectConditionSpec,
  ResourceId,
} from "./types";

const acquireSpySourceIds = new Set([
  guildSpySourceId,
  inHighPlacesSourceId,
  spyNetworkSourceId,
  strikeFleetSourceId,
  subversiveAdvisorSourceId,
]);

function imperiumTrait(name: string) {
  return name === "Faction: Bene Geserit" ? "Faction: Bene Gesserit" : name;
}

function imperiumTraits(card: HubCard) {
  return card.attributes.map(([name]) => imperiumTrait(name));
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
    return "+1 persuasion. You may lose 1 Influence to draw 1 Intrigue.";
  }
  if (card.id === beneGesseritOperativeSourceId) {
    return "+1 persuasion. If you have two or more spies on the board, +2 persuasion.";
  }
  if (card.id === spyNetworkSourceId) {
    return "+2 persuasion and +1 strength. If you have two or more spies on the board, you may recall 1 spy to draw 1 Intrigue.";
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
  if (card.id === covertOperationSourceId) {
    return "Gain 2 Solari.";
  }
  if (card.id === desertPowerSourceId) {
    return "+2 persuasion, or pay 1 water to summon 1 sandworm.";
  }
  if (card.id === smugglersHavenSourceId) {
    return "+1 persuasion. If you are spying on a Maker board space, gain 2 spice.";
  }
  if (card.id === corrinthCitySourceId) {
    return "+5 persuasion, or spend 5 Solari to take your High Council seat.";
  }
  if (card.id === deliveryAgreementSourceId) {
    return "Gain 1 spice. If you have completed four or more contracts, trash this card to gain 1 VP.";
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
      revealGainStrength(1),
    ];
  }
  if (card.id === interstellarTradeSourceId) {
    return [
      acquireGainInfluenceChoice(1, { source: "Interstellar Trade" }),
      acquireTakeContracts(1, { source: "Interstellar Trade" }),
      revealGainPersuasion({ kind: "completed-contracts" }),
    ];
  }
  if (card.id === steersmanSourceId) {
    return [
      agentDrawCards(1),
      agentRecallAgent(),
      revealGainPersuasion(2),
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
      agentGainVp(1),
      agentPayResourceForSandworms("spice", 4, 1, { recipient: "self-or-activated-ally" }),
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
      revealGainPersuasion(5),
      revealPayResourceForHighCouncilSeat("solari", 5, {
        persuasionCost: 5,
        persuasionReward: 2,
        source: "Corrinth City",
      }),
    ];
  }
  if (card.id === deliveryAgreementSourceId) {
    return [
      agentDiscardCardsForReward(1, {
        takeContracts: { amount: 1, sourcePool: "public-offer" },
        source: "Delivery Agreement",
      }),
      revealGainResource("spice", 1),
      revealTrashSourceForVp(1, {}, [hasCompletedContracts(4)]),
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
      agentGainResource("spice", 2),
      agentGainVp(1),
      agentTakeContracts(1, { source: "Priority Contracts" }),
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
    const inHighPlacesAgentCondition = [hasCardTraitInPlay("Faction: Bene Gesserit", 2)];
    const strikeFleetAgentCondition = [recalledSpyThisTurn()];
    return [
      ...(fixedRevealEffects(
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
  [imperialSpymasterSourceId]: { drawIntrigues: 1 },
  [leadershipSourceId]: { drawCards: 1 },
  [publicSpectacleSourceId]: { gainInfluence: 1, placeSpies: 1 },
  [rebelSupplierSourceId]: { gain: { spice: 1 }, recruitTroops: 2 },
  [sardaukarSoldierSourceId]: { drawIntrigues: 1 },
  [southernEldersSourceId]: { gain: { water: 1 }, recruitTroops: 2 },
  [spacingGuildFavorSourceId]: { drawCards: 1, discardGain: { spice: 2 } },
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
  return effect.kind === "gain-vp" ||
    effect.kind === "pay-team-resource-for-vp" ||
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

function imperiumPlayText(card: HubCard) {
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
      traits: imperiumTraits(card),
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
    acquired: acquiredVictoryPoints(card, effects),
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
    traits: card.id === unswervingLoyaltySourceId ? ["Faction: Fremen"] : imperiumTraits(card),
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
