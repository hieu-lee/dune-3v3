import assert from "node:assert/strict";
import { createServer } from "vite";
import { agentSpec, hasAgentEffect, hasRevealEffect, hasRevealSpec, plotSpec } from "./verify-card-effect-spec-helpers.mjs";
import { verifyCardEffectSpecAcquireConditionValidation } from "./verify-card-effect-spec-acquire-condition-validation.mjs";
import { verifyCardEffectSpecCatalogIntrigues } from "./verify-card-effect-spec-catalog-intrigues.mjs";
import { verifyCardEffectSpecChoiceValidation } from "./verify-card-effect-spec-choice-validation.mjs";
import { verifyCardEffectSpecCommanderLeader } from "./verify-card-effect-spec-commander-leader.mjs";
import { verifyCardEffectSpecCoreValidation } from "./verify-card-effect-spec-core-validation.mjs";
import { verifyCardEffectSpecContractCardValidation } from "./verify-card-effect-spec-contract-card-validation.mjs";
import { verifyCardEffectSpecCorrinthDeliveryValidation } from "./verify-card-effect-spec-corrinth-delivery-validation.mjs";
import { verifyCardEffectSpecDiscardManipulationValidation } from "./verify-card-effect-spec-discard-manipulation-validation.mjs";
import { verifyCardEffectSpecImperiumAgentReveal } from "./verify-card-effect-spec-imperium-agent-reveal.mjs";
import { verifyCardEffectSpecImperiumContractAlliance } from "./verify-card-effect-spec-imperium-contract-alliance.mjs";
import { verifyCardEffectSpecImperiumMakerSpy } from "./verify-card-effect-spec-imperium-maker-spy.mjs";
import { verifyCardEffectSpecImperiumUtility } from "./verify-card-effect-spec-imperium-utility.mjs";
import { verifyCardEffectSpecIntrigueCombat } from "./verify-card-effect-spec-intrigue-combat.mjs";
import { verifyCardEffectSpecMarketImperiumCatalog } from "./verify-card-effect-spec-market-imperium-catalog.mjs";
import { verifyCardEffectSpecMercenaries } from "./verify-card-effect-spec-mercenaries.mjs";
import { verifyCardEffectSpecPaymentInfluenceSandwormsValidation } from "./verify-card-effect-spec-payment-influence-sandworms-validation.mjs";
import { verifyCardEffectSpecPaymentTroopsDrawValidation } from "./verify-card-effect-spec-payment-troops-draw-validation.mjs";
import { verifyCardEffectSpecPaymentValidation } from "./verify-card-effect-spec-payment-validation.mjs";
import { verifyCardEffectSpecPlotInfluenceChoices } from "./verify-card-effect-spec-plot-influence-choices.mjs";
import { verifyCardEffectSpecPlotInfluenceRouting } from "./verify-card-effect-spec-plot-influence-routing.mjs";
import { verifyCardEffectSpecPlotResourcesVp } from "./verify-card-effect-spec-plot-resources-vp.mjs";
import { verifyCardEffectSpecPlotTroopsWorms } from "./verify-card-effect-spec-plot-troops-worms.mjs";
import { verifyCardEffectSpecRevealPending } from "./verify-card-effect-spec-reveal-pending.mjs";
import { verifyCardEffectSpecResourceContractValidation } from "./verify-card-effect-spec-resource-contract-validation.mjs";
import { verifyCardEffectSpecRetreatValidation } from "./verify-card-effect-spec-retreat-validation.mjs";
import {
  shaddamSignetPaidRewardOptions,
  verifyCardEffectSpecShaddamCommander,
} from "./verify-card-effect-spec-shaddam-commander.mjs";
import { verifyCardEffectSpecSpyRecallValidation } from "./verify-card-effect-spec-spy-recall-validation.mjs";
import { verifyCardEffectSpecTrashValidation } from "./verify-card-effect-spec-trash-validation.mjs";
import { verifyCardEffectSpecUnsupportedValidation } from "./verify-card-effect-spec-unsupported-validation.mjs";
import { verifyCardEffectSpecUtilityValidation } from "./verify-card-effect-spec-utility-validation.mjs";
import { verifyCardEffectSpecPlotChoices } from "./verify-card-effect-spec-plot-choices.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function withActivePlayer(game, playerId, patch) {
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected ${playerId}`);
  return {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const deckUtils = await server.ssrLoadModule("/src/game/deck-utils.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const effectResolver = await server.ssrLoadModule("/src/game/effect-resolver.ts");
  const leaderEffectData = await server.ssrLoadModule("/src/game/leader-effect-data.ts");
  const plotIntrigueEffectRules = await server.ssrLoadModule("/src/game/plot-intrigue-effect-rules.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = state.initialGame();
  const p1 = playerById(game, "p1");
  const p2 = playerById(game, "p2");
  const p3 = playerById(game, "p3");
  const p4 = playerById(game, "p4");
  const p5 = playerById(game, "p5");
  const p6 = playerById(game, "p6");
  const revealSpecCards = [
    ...data.allyStarterCards,
    ...data.muadDibCommanderCards,
    ...data.emperorCommanderCards,
    ...data.reserveMarket,
    ...data.imperiumDeck,
  ].filter(hasRevealSpec);
  const marketAndImperiumCards = [
    ...data.reserveMarket,
    ...data.imperiumDeck,
  ];
  const convincingArgument = data.allyStarterCards.find((card) => card.name === "Convincing Argument");
  const dagger = data.allyStarterCards.find((card) => card.name === "Dagger");
  const reconnaissance = data.allyStarterCards.find((card) => card.name === "Reconnaissance");
  const allySignet = data.allyStarterCards.find((card) => card.name === "Signet Ring");
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  const corrinthCity = data.imperiumDeck.find((card) => card.name === "Corrinth City");
  const covertOperation = data.imperiumDeck.find((card) => card.name === "Covert Operation");
  const dangerousRhetoric = data.imperiumDeck.find((card) => card.name === "Dangerous Rhetoric");
  const desertPower = data.imperiumDeck.find((card) => card.name === "Desert Power");
  const desertSurvival = data.imperiumDeck.find((card) => card.name === "Desert Survival");
  const deliveryAgreement = data.imperiumDeck.find((card) => card.name === "Delivery Agreement");
  const doubleAgent = data.imperiumDeck.find((card) => card.name === "Double Agent");
  const imperialSpymaster = data.imperiumDeck.find((card) => card.name === "Imperial Spymaster");
  const fedaykinStilltent = data.imperiumDeck.find((card) => card.name === "Fedaykin Stilltent");
  const hiddenMissive = data.imperiumDeck.find((card) => card.name === "Hidden Missive");
  const ecologicalTestingStation = data.imperiumDeck.find((card) => card.name === "Ecological Testing Station");
  const cargoRunner = data.imperiumDeck.find((card) => card.name === "Cargo Runner");
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  const leadership = data.imperiumDeck.find((card) => card.name === "Leadership");
  const longLiveTheFighters = data.imperiumDeck.find((card) => card.name === "Long Live the Fighters");
  const makerKeeper = data.imperiumDeck.find((card) => card.name === "Maker Keeper");
  const maulaPistol = data.imperiumDeck.find((card) => card.name === "Maula Pistol");
  const northernWatermaster = data.imperiumDeck.find((card) => card.name === "Northern Watermaster");
  const paracompass = data.imperiumDeck.find((card) => card.name === "Paracompass");
  const priorityContracts = data.imperiumDeck.find((card) => card.name === "Priority Contracts");
  const publicSpectacle = data.imperiumDeck.find((card) => card.name === "Public Spectacle");
  const rebelSupplier = data.imperiumDeck.find((card) => card.name === "Rebel Supplier");
  const reliableInformant = data.imperiumDeck.find((card) => card.name === "Reliable Informant");
  const sardaukarCoordination = data.imperiumDeck.find((card) => card.name === "Sardaukar Coordination");
  const sardaukarSoldier = data.imperiumDeck.find((card) => card.name === "Sardaukar Soldier");
  const shishakli = data.imperiumDeck.find((card) => card.name === "Shishakli");
  const smugglersHaven = data.imperiumDeck.find((card) => card.name === "Smuggler's Haven");
  const southernElders = data.imperiumDeck.find((card) => card.name === "Southern Elders");
  const spacingGuildFavor = data.imperiumDeck.find((card) => card.name === "Spacing Guild's Favor");
  const spaceTimeFolding = data.imperiumDeck.find((card) => card.name === "Space-time Folding");
  const steersman = data.imperiumDeck.find((card) => card.name === "Steersman");
  const stilgar = data.imperiumDeck.find((card) => card.name === "Stilgar, The Devoted");
  const theacherousManeuver = data.imperiumDeck.find((card) => card.name === "Theacherous Maneuver");
  const undercoverAsset = data.imperiumDeck.find((card) => card.name === "Undercover Asset");
  const unswervingLoyalty = data.imperiumDeck.find((card) => card.name === "Unswerving Loyalty");
  const truthtrance = data.imperiumDeck.find((card) => card.name === "Truthtrance");
  const weirdingWoman = data.imperiumDeck.find((card) => card.name === "Weirding Woman");
  const guildEnvoy = data.imperiumDeck.find((card) => card.name === "Guild Envoy");
  const guildSpy = data.imperiumDeck.find((card) => card.name === "Guild Spy");
  const branchingPath = data.imperiumDeck.find((card) => card.name === "Branching Path");
  const junctionHeadquarters = data.imperiumDeck.find((card) => card.name === "Junction Headquarters");
  const inHighPlaces = data.imperiumDeck.find((card) => card.name === "In High Places");
  const overthrow = data.imperiumDeck.find((card) => card.name === "Overthrow");
  const priceIsNoObject = data.imperiumDeck.find((card) => card.name === "Price is No Object");
  const spyNetwork = data.imperiumDeck.find((card) => card.name === "Spy Network");
  const strikeFleet = data.imperiumDeck.find((card) => card.name === "Strike Fleet");
  const subversiveAdvisor = data.imperiumDeck.find((card) => card.name === "Subversive Advisor");
  const treadInDarkness = data.imperiumDeck.find((card) => card.name === "Tread in Darkness");
  const wheelsWithinWheels = data.imperiumDeck.find((card) => card.name === "Wheels Within Wheels");
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  const spiceMustFlow = data.reserveMarket.find((card) => card.sourceId === 538);
  const backedByChoam = data.intrigueCards.find((card) => card.name === "Backed by CHOAM");
  const buyAccess = data.intrigueCards.find((card) => card.name === "Buy Access");
  const callToArms = data.intrigueCards.find((card) => card.name === "Call to Arms");
  const changeAllegiances = data.intrigueCards.find((card) => card.name === "Change Allegiances");
  const councilorsAmbition = data.intrigueCards.find((card) => card.name === "Councilor's Ambition");
  const contingencyPlan = data.intrigueCards.find((card) => card.name === "Contingency Plan");
  const cunning = data.intrigueCards.find((card) => card.name === "Cunning");
  const departForArrakis = data.intrigueCards.find((card) => card.name === "Depart For Arrakis");
  const detonation = data.intrigueCards.find((card) => card.name === "Detonation");
  const unexpectedAllies = data.intrigueCards.find((card) => card.name === "Unexpected Allies");
  const devour = data.intrigueCards.find((card) => card.name === "Devour");
  const distraction = data.intrigueCards.find((card) => card.name === "Distraction");
  const findWeakness = data.intrigueCards.find((card) => card.name === "Find Weakness");
  const goToGround = data.intrigueCards.find((card) => card.name === "Go To Ground");
  const impress = data.intrigueCards.find((card) => card.name === "Impress");
  const imperiumPolitics = data.intrigueCards.find((card) => card.name === "Imperium Politics");
  const inspireAwe = data.intrigueCards.find((card) => card.name === "Inspire Awe");
  const intelligenceReport = data.intrigueCards.find((card) => card.name === "Intelligence Report");
  const leverage = data.intrigueCards.find((card) => card.name === "Leverage");
  const manipulate = data.intrigueCards.find((card) => card.name === "Manipulate");
  const marketOpportunity = data.intrigueCards.find((card) => card.name === "Market Opportunity");
  const mercenaries = data.intrigueCards.find((card) => card.name === "Mercenaries");
  const opportunism = data.intrigueCards.find((card) => card.name === "Opportunism");
  const questionableMethods = data.intrigueCards.find((card) => card.name === "Questionable Methods");
  const reachAgreement = data.intrigueCards.find((card) => card.name === "Reach Agreement");
  const shaddamsFavor = data.intrigueCards.find((card) => card.name === "Shaddam's Favor");
  const spiceIsPower = data.intrigueCards.find((card) => card.name === "Spice is Power");
  const specialMission = data.intrigueCards.find((card) => card.name === "Special Mission");
  const springTheTrap = data.intrigueCards.find((card) => card.name === "Spring The Trap");
  const tacticalOption = data.intrigueCards.find((card) => card.name === "Tactical Option");
  const sietchRitual = data.intrigueCards.find((card) => card.name === "Sietch Ritual");
  const strategicStockpiling = data.intrigueCards.find((card) => card.name === "Strategic Stockpiling");
  const weirdingCombat = data.intrigueCards.find((card) => card.name === "Weirding Combat");
  const commandRespect = data.muadDibCommanderCards.find((card) => card.name === "Command Respect");
  const limitedLandsraadAccess = data.muadDibCommanderCards.find((card) => card.name === "Limited Landsraad Access");
  const demandAttention = data.muadDibCommanderCards.find((card) => card.name === "Demand Attention");
  const desertCall = data.muadDibCommanderCards.find((card) => card.name === "Desert Call");
  const threatenSpiceProduction = data.muadDibCommanderCards.find((card) => card.name === "Threaten Spice Production");
  const muadDibSignet = data.muadDibCommanderCards.find((card) => card.name === "Signet Ring");
  const usul = data.muadDibCommanderCards.find((card) => card.name === "Usul");
  const corrinoMight = data.emperorCommanderCards.find((card) => card.name === "Corrino Might");
  const criticalShipments = data.emperorCommanderCards.find((card) => card.name === "Critical Shipments");
  const demandResults = data.emperorCommanderCards.find((card) => card.name === "Demand Results");
  const devastatingAssault = data.emperorCommanderCards.find((card) => card.name === "Devastating Assault");
  const imperialTent = data.emperorCommanderCards.find((card) => card.name === "Imperial Tent");
  const emperorSignet = data.emperorCommanderCards.find((card) => card.name === "Signet Ring");
  const imperialOrnithopter = data.emperorCommanderCards.find((card) => card.name === "Imperial Ornithopter");
  const arrakeen = data.boardSpaces.find((space) => space.id === "arrakeen");
  const acceptContract = data.boardSpaces.find((space) => space.id === "accept-contract");
  const haggaBasin = data.boardSpaces.find((space) => space.id === "hagga-basin");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  const dutifulService = data.boardSpaces.find((space) => space.id === "dutiful-service");
  const deliverSupplies = data.boardSpaces.find((space) => space.id === "deliver-supplies");
  const shipping = data.boardSpaces.find((space) => space.id === "shipping");
  const sietchTabr = data.boardSpaces.find((space) => space.id === "sietch-tabr");
  const militarySupport = data.boardSpaces.find((space) => space.id === "military-support");
  const spiceRefinery = data.boardSpaces.find((space) => space.id === "spice-refinery");
  assert.ok(
    convincingArgument &&
    dagger &&
    reconnaissance &&
    allySignet &&
    smuggler &&
    interstellarTrade &&
    calculus &&
    capturedMentat &&
    beneGesseritOperative &&
    corrinthCity &&
    covertOperation &&
    deliveryAgreement &&
    doubleAgent &&
    desertPower &&
    desertSurvival &&
    imperialSpymaster &&
    fedaykinStilltent &&
    hiddenMissive &&
    ecologicalTestingStation &&
    cargoRunner &&
    chani &&
    leadership &&
    longLiveTheFighters &&
    makerKeeper &&
    maulaPistol &&
    northernWatermaster &&
    paracompass &&
    priorityContracts &&
    publicSpectacle &&
    rebelSupplier &&
    reliableInformant &&
    sardaukarCoordination &&
    sardaukarSoldier &&
    shishakli &&
    smugglersHaven &&
    southernElders &&
    spacingGuildFavor &&
    spaceTimeFolding &&
    stilgar &&
    theacherousManeuver &&
    undercoverAsset &&
    unswervingLoyalty &&
    truthtrance &&
    weirdingWoman &&
    guildEnvoy &&
    guildSpy &&
    branchingPath &&
    junctionHeadquarters &&
    inHighPlaces &&
    overthrow &&
    priceIsNoObject &&
    spyNetwork &&
    strikeFleet &&
    subversiveAdvisor &&
    treadInDarkness &&
    wheelsWithinWheels,
  );
  assert.ok(commandRespect && prepareTheWay && spiceMustFlow && limitedLandsraadAccess && demandAttention && desertCall && threatenSpiceProduction && muadDibSignet && usul && corrinoMight && criticalShipments && demandResults && devastatingAssault && imperialTent && emperorSignet && imperialOrnithopter);
  assert.ok(backedByChoam && buyAccess && callToArms && changeAllegiances && councilorsAmbition && contingencyPlan && cunning && departForArrakis && detonation && unexpectedAllies && devour && distraction && findWeakness && goToGround && impress && imperiumPolitics && inspireAwe && intelligenceReport && leverage && manipulate && marketOpportunity && mercenaries && opportunism && questionableMethods && reachAgreement && shaddamsFavor && spiceIsPower && specialMission && springTheTrap && tacticalOption && sietchRitual && strategicStockpiling && weirdingCombat);
  assert.ok(arrakeen && acceptContract && haggaBasin && imperialBasin && secrets && highCouncil && dutifulService && deliverSupplies && shipping && sietchTabr && militarySupport && spiceRefinery);
  verifyCardEffectSpecCatalogIntrigues({
    cards: {
      contingencyPlan,
      councilorsAmbition,
      devour,
      findWeakness,
      goToGround,
      impress,
      inspireAwe,
      questionableMethods,
      reachAgreement,
      spiceIsPower,
      springTheTrap,
      spyNetwork,
      tacticalOption,
    },
    effectResolver,
    game,
    groups: { marketAndImperiumCards, revealSpecCards },
    players: { p2, p4, p6 },
    spaces: { highCouncil, secrets },
    state,
  });
  verifyCardEffectSpecPlotChoices({
    cards: {
      cunning,
      distraction,
      intelligenceReport,
      leverage,
      manipulate,
      sietchRitual,
      specialMission,
    },
    data,
    effectResolver,
    game,
    players: { p1, p2, p4, p6 },
  });
  verifyCardEffectSpecMercenaries({
    cards: { backedByChoam, mercenaries },
    effectResolver,
    game,
    players: { p2, p4, p6 },
    state,
    withActivePlayer,
  });
  verifyCardEffectSpecPlotInfluenceChoices({
    cards: { changeAllegiances, opportunism },
    effectResolver,
    game,
    players: { p1, p2, p4, p5, p6 },
  });
  verifyCardEffectSpecPlotInfluenceRouting({
    cards: { buyAccess, imperiumPolitics },
    effectResolver,
    game,
    players: { p1, p2, p4, p5, p6 },
    plotIntrigueEffectRules,
    withActivePlayer,
  });
  verifyCardEffectSpecIntrigueCombat({
    cards: { backedByChoam, weirdingCombat },
    data,
    effectResolver,
    game,
    players: { p2 },
  });
  verifyCardEffectSpecPlotTroopsWorms({
    cards: {
      callToArms,
      convincingArgument,
      departForArrakis,
      detonation,
      unexpectedAllies,
    },
    effectResolver,
    game,
    players: { p1, p2, p4, p6 },
    state,
    withActivePlayer,
  });
  verifyCardEffectSpecPlotResourcesVp({
    cards: { marketOpportunity, shaddamsFavor, strategicStockpiling },
    deckUtils,
    effectResolver,
    game,
    players: { p2, p4, p6 },
  });
  verifyCardEffectSpecMarketImperiumCatalog({
    cards: {
      beneGesseritOperative,
      branchingPath,
      calculus,
      capturedMentat,
      cargoRunner,
      chani,
      convincingArgument,
      corrinthCity,
      covertOperation,
      dagger,
      deliveryAgreement,
      desertPower,
      desertSurvival,
      doubleAgent,
      fedaykinStilltent,
      guildEnvoy,
      guildSpy,
      hiddenMissive,
      imperialOrnithopter,
      imperialSpymaster,
      inHighPlaces,
      interstellarTrade,
      junctionHeadquarters,
      leadership,
      limitedLandsraadAccess,
      makerKeeper,
      maulaPistol,
      northernWatermaster,
      overthrow,
      paracompass,
      prepareTheWay,
      priceIsNoObject,
      priorityContracts,
      publicSpectacle,
      rebelSupplier,
      reliableInformant,
      sardaukarCoordination,
      sardaukarSoldier,
      smuggler,
      smugglersHaven,
      southernElders,
      spaceTimeFolding,
      spacingGuildFavor,
      spiceMustFlow,
      spyNetwork,
      stilgar,
      strikeFleet,
      subversiveAdvisor,
      theacherousManeuver,
      undercoverAsset,
      weirdingWoman,
      wheelsWithinWheels,
    },
    effectResolver,
    game,
    groups: { marketAndImperiumCards },
    players: { p2 },
  });
  verifyCardEffectSpecCommanderLeader({
    cards: {
      allySignet,
      commandRespect,
      demandAttention,
      desertCall,
      muadDibSignet,
      threatenSpiceProduction,
      usul,
    },
    effectResolver,
    game,
    leaderEffectData,
    players: { p5, p6 },
    spaces: { arrakeen, secrets },
  });
  verifyCardEffectSpecImperiumAgentReveal({
    cards: {
      beneGesseritOperative,
      calculus,
      capturedMentat,
      cargoRunner,
      chani,
      covertOperation,
      dangerousRhetoric,
      desertSurvival,
      fedaykinStilltent,
      hiddenMissive,
      makerKeeper,
      maulaPistol,
      shishakli,
      spyNetwork,
      treadInDarkness,
      truthtrance,
      unswervingLoyalty,
    },
    effectResolver,
    game,
    players: { p2 },
  });
  verifyCardEffectSpecImperiumUtility({
    cards: {
      guildEnvoy,
      guildSpy,
      northernWatermaster,
      paracompass,
      reliableInformant,
      spaceTimeFolding,
      steersman,
    },
  });
  verifyCardEffectSpecImperiumContractAlliance({
    cards: {
      branchingPath,
      corrinthCity,
      deliveryAgreement,
      junctionHeadquarters,
      longLiveTheFighters,
      spacingGuildFavor,
    },
    effectResolver,
    game,
    players: { p2 },
  });
  verifyCardEffectSpecImperiumMakerSpy({
    cards: {
      doubleAgent,
      ecologicalTestingStation,
      fedaykinStilltent,
      hiddenMissive,
      smuggler,
      smugglersHaven,
      wheelsWithinWheels,
    },
  });
  verifyCardEffectSpecShaddamCommander({
    cards: {
      corrinoMight,
      criticalShipments,
      demandResults,
      devastatingAssault,
      emperorSignet,
      imperialTent,
    },
    effectResolver,
    game,
    players: { p1, p2, p4, p6 },
  });
  verifyCardEffectSpecRevealPending({
    cards: { convincingArgument, covertOperation, dagger },
    game,
    players: { p2 },
    revealSpecCards,
    state,
    turnActions,
  });
  const fremenSupportCard = {
    ...convincingArgument,
    id: "effect-spec-fremen-bond-support",
    name: "Effect Spec Fremen Bond Support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
    conditionalPersuasion: false,
    conditionalSwords: false,
    traits: ["Faction: Fremen"],
  };
  verifyCardEffectSpecCoreValidation({
    cards: { chani, convincingArgument },
    effectResolver,
    fremenSupportCard,
    game,
    players: { p2, p4 },
    turnActions,
  });
  verifyCardEffectSpecAcquireConditionValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecResourceContractValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2 },
    state,
  });
  verifyCardEffectSpecSpyRecallValidation({
    boardSpaces: { highCouncil, secrets },
    cards: { backedByChoam, convincingArgument },
    effectResolver,
    game,
    players: { p2, p4, p6 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecTrashValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2 },
    turnActions,
  });
  verifyCardEffectSpecPaymentValidation({
    cards: { convincingArgument },
    game,
    players: { p2 },
    state,
    turnActions,
  });
  verifyCardEffectSpecPaymentTroopsDrawValidation({
    cards: { convincingArgument },
    game,
    players: { p2, p4, p6 },
    state,
    turnActions,
  });
  verifyCardEffectSpecChoiceValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2, p4, p6 },
    state,
    turnActions,
  });
  verifyCardEffectSpecPaymentInfluenceSandwormsValidation({
    cards: { convincingArgument },
    data,
    game,
    players: { p1, p2, p3, p4 },
    state,
    turnActions,
  });
  verifyCardEffectSpecDiscardManipulationValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2, p4 },
    state,
    turnActions,
  });
  verifyCardEffectSpecUtilityValidation({
    boardSpaces: { arrakeen, shipping },
    cards: { convincingArgument },
    players: { p2, p4 },
    state,
    turnActions,
  });
  verifyCardEffectSpecRetreatValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2, p4 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecUnsupportedValidation({
    cards: { convincingArgument },
    effectResolver,
    game,
    players: { p2 },
    turnActions,
  });
  verifyCardEffectSpecContractCardValidation({
    boardSpaces: { acceptContract, deliverSupplies, imperialBasin },
    cards: { dagger, interstellarTrade, priorityContracts, smuggler },
    data,
    effectResolver,
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecCorrinthDeliveryValidation({
    cards: { convincingArgument, corrinthCity, dagger, deliveryAgreement },
    data,
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  const beneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id }, sharedSpyPosts: {} },
  );
  assert.equal(beneReveal.persuasion, 3, "Bene Gesserit Operative should use spy-count reveal specs");
  const sharedBeneReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    {
      ...game,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
      sharedSpyPosts: { [secrets.id]: [p2.id] },
    },
  );
  assert.equal(sharedBeneReveal.persuasion, 3, "Shared spy posts should count for owner-scoped reveal specs");
  const teammateSpyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [beneGesseritOperative], highCouncilSeat: false },
    { ...game, spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: "p6" }, sharedSpyPosts: {} },
  );
  assert.equal(teammateSpyReveal.persuasion, 1, "Teammate spy posts should not count for owner-scoped reveal specs");

  const weirdingReturnFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingReturned = turnActions.placeAgentAction(weirdingReturnFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingReturnOwner = playerById(weirdingReturned, p2.id);
  assert.equal(
    weirdingReturnOwner.hand.some((card) => card.id === weirdingWoman.id),
    true,
    "Weirding Woman should return to hand with another Bene Gesserit card in play",
  );
  assert.equal(
    weirdingReturnOwner.hand.find((card) => card.id === weirdingWoman.id)?.agentPlacementSpaceId,
    undefined,
    "Returned Weirding Woman should not keep stale Agent placement metadata in hand",
  );
  assert.equal(
    weirdingReturnOwner.playArea.some((card) => card.id === weirdingWoman.id),
    false,
    "Weirding Woman should leave play after its typed return resolves",
  );
  assert.equal(
    weirdingReturnOwner.playArea.some((card) => card.id === beneGesseritOperative.id),
    true,
    "Weirding Woman should not move the supporting Bene Gesserit card",
  );
  assert.equal(weirdingReturned.spaces[imperialBasin.id], p2.id, "Returning Weirding Woman should leave the sent Agent on the board space");
  assert.match(weirdingReturned.log.join("\n"), /Weirding Woman: returns this card to hand/);

  const duplicateHandWeirdingWoman = { ...weirdingWoman };
  const weirdingDuplicateHandFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman, duplicateHandWeirdingWoman],
    playArea: [beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingDuplicateHandReturned = turnActions.placeAgentAction(weirdingDuplicateHandFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingDuplicateHandOwner = playerById(weirdingDuplicateHandReturned, p2.id);
  assert.equal(
    weirdingDuplicateHandOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    2,
    "Agent placement should remove only the selected Weirding Woman hand copy before returning the played copy",
  );
  assert.equal(
    weirdingDuplicateHandOwner.playArea.some((card) => card.id === weirdingWoman.id),
    false,
    "Duplicate hand Weirding Woman placement should still return the played copy from play",
  );

  const olderWeirdingWomanInPlay = {
    ...weirdingWoman,
    agentPlacementSpaceId: shipping.id,
    agentPlacementTargetOwnerId: p2.id,
  };
  const weirdingDuplicateFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [olderWeirdingWomanInPlay, beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingDuplicateReturned = turnActions.placeAgentAction(weirdingDuplicateFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingDuplicateOwner = playerById(weirdingDuplicateReturned, p2.id);
  assert.equal(
    weirdingDuplicateOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    1,
    "Weirding Woman should return the newly played source card when another same-id copy is already in play",
  );
  assert.equal(
    weirdingDuplicateOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementSpaceId === shipping.id),
    true,
    "Return-source-to-hand should leave older same-id play-area cards in play",
  );
  assert.equal(
    weirdingDuplicateOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementSpaceId === imperialBasin.id),
    false,
    "Return-source-to-hand should remove the current Agent placement copy, not an older same-id copy",
  );

  const commanderOlderWeirdingWomanInPlay = {
    ...weirdingWoman,
    agentPlacementSpaceId: shipping.id,
    agentPlacementTargetOwnerId: p6.id,
  };
  const commanderWeirdingFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [commanderOlderWeirdingWomanInPlay, beneGesseritOperative],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderWeirdingReturned = turnActions.placeAgentAction(commanderWeirdingFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const commanderWeirdingOwner = playerById(commanderWeirdingReturned, p4.id);
  assert.equal(
    commanderWeirdingOwner.hand.filter((card) => card.id === weirdingWoman.id).length,
    1,
    "Commander Weirding Woman should return the newly played source card to the Commander hand",
  );
  assert.equal(
    commanderWeirdingOwner.hand.find((card) => card.id === weirdingWoman.id)?.agentPlacementTargetOwnerId,
    undefined,
    "Commander returned Weirding Woman should clear activated-Ally placement metadata",
  );
  assert.equal(
    commanderWeirdingOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementTargetOwnerId === p6.id),
    true,
    "Commander return-source-to-hand should leave older same-id cards with different target metadata in play",
  );
  assert.equal(
    commanderWeirdingOwner.playArea.some((card) => card.id === weirdingWoman.id && card.agentPlacementTargetOwnerId === p2.id),
    false,
    "Commander return-source-to-hand should remove the current activated-Ally target copy",
  );
  assert.equal(
    commanderWeirdingReturned.spaces[imperialBasin.id],
    p2.id,
    "Commander Weirding Woman should leave the sent Agent assigned to the activated Ally's board space",
  );

  const weirdingUnqualifiedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [weirdingWoman],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const weirdingUnqualified = turnActions.placeAgentAction(weirdingUnqualifiedFixture, {
    commanderTargets: {},
    selectedCard: weirdingWoman,
    selectedSpace: imperialBasin,
  });
  const weirdingUnqualifiedOwner = playerById(weirdingUnqualified, p2.id);
  assert.equal(
    weirdingUnqualifiedOwner.hand.some((card) => card.id === weirdingWoman.id),
    false,
    "Weirding Woman should leave hand when the Bene Gesserit condition is not met",
  );
  assert.equal(
    weirdingUnqualifiedOwner.playArea.some((card) => card.id === weirdingWoman.id),
    true,
    "Weirding Woman should remain in play when the Bene Gesserit condition is not met",
  );
  assert.doesNotMatch(weirdingUnqualified.log.join("\n"), /Weirding Woman: returns this card to hand/);

  const prepareDrawSource = {
    ...p2,
    deck: [{ ...dagger, id: "prepare-the-way-draw-fixture" }],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 2 },
  };
  const prepared = state.applyCardAgentEffect(
    prepareTheWay,
    prepareDrawSource,
    prepareDrawSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? prepareDrawSource : player) },
  );
  assert.equal(prepared.source.hand.length, 1, "Prepare The Way Agent spec should draw at 2 Bene Gesserit Influence");
  assert.match(prepared.log ?? "", /Prepare The Way: draws 1 card/);
  const unpreparedSource = { ...prepareDrawSource, deck: [{ ...dagger, id: "prepare-the-way-blocked-draw-fixture" }], influence: p2.influence };
  const unprepared = state.applyCardAgentEffect(
    prepareTheWay,
    unpreparedSource,
    unpreparedSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? unpreparedSource : player) },
  );
  assert.equal(unprepared.source.hand.length, 0, "Prepare The Way Agent spec should not draw below 2 Bene Gesserit Influence");
  assert.equal(unprepared.log, undefined, "Prepare The Way Agent spec should not log below its Influence threshold");

  const maulaDraw = { ...dagger, id: "maula-pistol-agent-draw-fixture" };
  const maulaPistolEffect = state.applyCardAgentEffect(
    maulaPistol,
    { ...p2, deck: [maulaDraw], discard: [], hand: [] },
    p2,
  );
  assert.equal(maulaPistolEffect.source.hand[0]?.id, maulaDraw.id, "Maula Pistol Agent spec should draw 1 card");
  assert.match(maulaPistolEffect.log ?? "", /Maula Pistol: draws 1 card/);

  const leadershipDraw = { ...dagger, id: "leadership-agent-draw-fixture" };
  const leadershipEffect = state.applyCardAgentEffect(
    leadership,
    { ...p2, deck: [leadershipDraw], discard: [], hand: [] },
    p2,
    game,
  );
  assert.equal(leadershipEffect.source.hand[0]?.id, leadershipDraw.id, "Leadership Agent spec should draw 1 card");
  assert.match(leadershipEffect.log ?? "", /Leadership: draws 1 card/);

  const longLiveDraw = { ...dagger, id: "long-live-draw-card", name: "Long Live Draw" };
  const longLiveDiscard = { ...convincingArgument, id: "long-live-discard-card", name: "Long Live Discard" };
  const longLiveTrash = { ...reconnaissance, id: "long-live-trash-card", name: "Long Live Trash" };
  const longLiveFourth = { ...dagger, id: "long-live-fourth-card", name: "Long Live Fourth" };
  const longLiveSpace = {
    id: "long-live-test-space",
    name: "Long Live Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const longLivePlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard, longLiveTrash, longLiveFourth],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(longLivePlaced.pendingAction?.kind, "top-deck-selection", "Long Live the Fighters should queue top-deck selection after Agent placement");
  assert.equal(longLivePlaced.pendingAction.ownerId, p2.id);
  assert.equal(longLivePlaced.pendingAction.source, "Long Live the Fighters");
  assert.equal(longLivePlaced.pendingAction.lookCards, 3);
  assert.equal(longLivePlaced.pendingAction.drawCards, 1);
  assert.equal(longLivePlaced.pendingAction.discardCards, 1);
  assert.equal(longLivePlaced.pendingAction.trashCards, 1);
  assert.deepEqual(
    state.topDeckSelectionCards(playerById(longLivePlaced, p2.id), longLivePlaced.pendingAction).map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should inspect the top three cards only",
  );
  assert.deepEqual(
    longLivePlaced.pendingAction.inspectedCards.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should reserve the inspected cards in the pending action",
  );
  assert.deepEqual(
    playerById(longLivePlaced, p2.id).deck.map((card) => card.id),
    [longLiveFourth.id],
    "Long Live the Fighters should remove reserved inspected cards from the draw deck while pending",
  );
  const longLiveInvalidChoice = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 0, discardIndex: 0, trashIndex: 2 },
  );
  assert.equal(
    longLiveInvalidChoice,
    longLivePlaced,
    "Long Live the Fighters should reject duplicate top-deck assignments",
  );
  assert.equal(
    state.skipTopDeckSelectionChoice(longLivePlaced, longLivePlaced.pendingAction),
    longLivePlaced,
    "Long Live the Fighters should not skip while the top-deck selection is still resolvable",
  );
  const { inspectedCards: _longLiveInspectedCards, ...longLiveLegacyPendingAction } = longLivePlaced.pendingAction;
  const longLiveStalePendingState = {
    ...longLivePlaced,
    pendingAction: longLiveLegacyPendingAction,
    players: longLivePlaced.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [longLiveDraw, longLiveDiscard],
            discard: [],
            hand: [],
            playArea: [longLiveTheFighters],
          }
        : player,
    ),
  };
  const longLiveStaleSkipped = state.skipTopDeckSelectionChoice(
    longLiveStalePendingState,
    longLiveStalePendingState.pendingAction,
  );
  assert.equal(
    longLiveStaleSkipped.pendingAction,
    undefined,
    "Long Live the Fighters should skip a stale top-deck selection when fewer than three cards remain",
  );
  assert.deepEqual(
    playerById(longLiveStaleSkipped, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters stale skip should preserve remaining deck cards",
  );
  assert.match(
    longLiveStaleSkipped.log[0],
    /cannot resolve Long Live the Fighters: fewer than 3 cards remain in deck\./,
  );
  const longLiveResolved = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 1, discardIndex: 0, trashIndex: 2 },
  );
  assert.equal(longLiveResolved.pendingAction, undefined, "Resolving Long Live the Fighters should clear its pending action");
  const longLiveOwner = playerById(longLiveResolved, p2.id);
  assert.ok(longLiveOwner.hand.some((card) => card.id === longLiveDiscard.id), "Long Live the Fighters should draw the selected top-deck card");
  assert.equal(longLiveOwner.discard.at(-1)?.id, longLiveDraw.id, "Long Live the Fighters should discard the selected top-deck card");
  assert.deepEqual(longLiveOwner.deck.map((card) => card.id), [longLiveFourth.id], "Long Live the Fighters should remove all inspected cards from deck");
  assert.equal(
    [...longLiveOwner.hand, ...longLiveOwner.discard, ...longLiveOwner.deck, ...longLiveOwner.playArea].some((card) => card.id === longLiveTrash.id),
    false,
    "Long Live the Fighters should trash the selected top-deck card",
  );
  assert.match(
    longLiveResolved.log[0],
    /resolves Long Live the Fighters: draws 1 card, discards Long Live Draw, and trashes Long Live Trash\./,
  );
  const longLiveShortDeckPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(
    longLiveShortDeckPlaced.pendingAction,
    undefined,
    "Long Live the Fighters should not queue top-deck selection with fewer than three deck cards",
  );
  assert.deepEqual(
    playerById(longLiveShortDeckPlaced, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters should leave short decks unchanged",
  );

  for (const card of [imperialSpymaster, sardaukarSoldier]) {
    const intrigueEffect = state.applyCardAgentEffect(card, p2, p2, game);
    assert.equal(intrigueEffect.sourceIntriguesToDraw, 1, `${card.name} Agent spec should draw 1 Intrigue`);
  }
  const theacherousManeuverEffect = state.applyCardAgentEffect(theacherousManeuver, p2, p2, game);
  assert.equal(
    theacherousManeuverEffect.sourceIntriguesToDraw,
    1,
    "Theacherous Maneuver Agent spec should draw 1 Intrigue",
  );

  const pendingPrimitiveSource = (card, patch = {}) => ({
    ...p2,
    hand: [],
    influence: { ...p2.influence, bene: 1 },
    playArea: [card],
    spies: 1,
    ...patch,
  });
  const pendingPrimitiveFixture = (source) => ({
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    sharedSpyPosts: {},
    spyPosts: {},
    players: game.players.map((player) => player.id === source.id ? source : player),
  });

  const undercoverSource = pendingPrimitiveSource(undercoverAsset);
  const undercoverPendings = state.pendingActionsForCard(
    undercoverAsset,
    undercoverSource,
    pendingPrimitiveFixture(undercoverSource),
  );
  assert.deepEqual(
    undercoverPendings.map((pending) => pending.kind),
    ["spy"],
    "Undercover Asset should queue a typed spy placement",
  );
  assert.equal(undercoverPendings[0].ownerId, p2.id, "Undercover Asset spy placement should target the source player");
  assert.equal(undercoverPendings[0].source, "Undercover Asset");

  const publicSpectacleSource = pendingPrimitiveSource(publicSpectacle);
  const publicSpectaclePendings = state.pendingActionsForCard(
    publicSpectacle,
    publicSpectacleSource,
    pendingPrimitiveFixture(publicSpectacleSource),
  );
  assert.deepEqual(
    publicSpectaclePendings.map((pending) => pending.kind),
    ["spy", "board-influence-choice"],
    "Public Spectacle should compose spy placement before its typed Influence choice",
  );
  assert.equal(publicSpectaclePendings[0].ownerId, p2.id, "Public Spectacle spy placement should target the source player");
  assert.equal(publicSpectaclePendings[0].source, "Public Spectacle");
  assert.equal(publicSpectaclePendings[1].source, "Public Spectacle");
  assert.equal(publicSpectaclePendings[1].sourceEffect, "gain-influence-choice");
  assert.equal(publicSpectaclePendings[1].amount, 1);
  assert.equal(publicSpectaclePendings[1].cardId, publicSpectacle.id);
  assert.equal(publicSpectaclePendings[1].cardOwnerId, p2.id);
  assert.equal(publicSpectaclePendings[1].trashSource, undefined, "Public Spectacle should not trash itself after Influence");
  assert.ok(publicSpectaclePendings[1].choices.length > 0, "Public Spectacle should expose at least one Influence choice");

  const theacherousManeuverSource = pendingPrimitiveSource(theacherousManeuver);
  const theacherousManeuverPendings = state.pendingActionsForCard(
    theacherousManeuver,
    theacherousManeuverSource,
    pendingPrimitiveFixture(theacherousManeuverSource),
  );
  assert.deepEqual(
    theacherousManeuverPendings.map((pending) => pending.kind),
    ["board-influence-choice"],
    "Theacherous Maneuver should queue a typed Influence choice",
  );
  assert.equal(theacherousManeuverPendings[0].source, "Theacherous Maneuver");
  assert.equal(theacherousManeuverPendings[0].sourceEffect, "gain-influence-choice");
  assert.equal(theacherousManeuverPendings[0].amount, 1);
  assert.equal(theacherousManeuverPendings[0].cardId, theacherousManeuver.id);
  assert.equal(theacherousManeuverPendings[0].cardOwnerId, p2.id);
  assert.ok(theacherousManeuverPendings[0].choices.length > 0, "Theacherous Maneuver should expose Influence choices");

  const shaddamSignetPaidRewardSource = {
    ...p4,
    playArea: [emperorSignet],
    resources: { ...p4.resources, solari: 3 },
  };
  const shaddamSignetPaidRewardTarget = { ...p6, garrison: 0 };
  const shaddamSignetPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === shaddamSignetPaidRewardSource.id) return shaddamSignetPaidRewardSource;
      if (player.id === shaddamSignetPaidRewardTarget.id) return shaddamSignetPaidRewardTarget;
      return player;
    }),
  };
  const shaddamSignetPaidRewardPendingOptions = shaddamSignetPaidRewardOptions.map((option) => {
    if (option.reward.kind === "recruit-troops") {
      return {
        id: option.id,
        resource: option.resource,
        cost: option.cost,
        reward: {
          kind: "recruit-troops",
          recipientId: shaddamSignetPaidRewardTarget.id,
          amount: option.reward.amount,
          destination: option.reward.destination,
        },
      };
    }
    return {
      id: option.id,
      resource: option.resource,
      cost: option.cost,
      reward: {
        kind: "gain-influence",
        recipientId: option.reward.selector === "self"
          ? shaddamSignetPaidRewardSource.id
          : shaddamSignetPaidRewardTarget.id,
        faction: option.reward.faction,
        amount: option.reward.amount,
      },
    };
  });
  assert.deepEqual(
    state.pendingActionsForCard(
      emperorSignet,
      shaddamSignetPaidRewardSource,
      shaddamSignetPaidRewardFixture,
      shaddamSignetPaidRewardTarget,
    ),
    [{
      kind: "paid-reward-choice",
      ownerId: shaddamSignetPaidRewardSource.id,
      cardId: emperorSignet.id,
      source: "Emperor of the Known Universe",
      options: shaddamSignetPaidRewardPendingOptions,
    }],
    "Shaddam Signet Ring should queue a generic paid reward choice pending action",
  );
  const shaddamSignetTroopRewardOption = shaddamSignetPaidRewardPendingOptions.find((option) =>
    option.reward.kind === "recruit-troops"
  );
  assert.ok(shaddamSignetTroopRewardOption, "Expected Shaddam Signet Ring to expose a troop paid-reward option");
  const shaddamSignetNoSupplyPending = {
    kind: "paid-reward-choice",
    ownerId: shaddamSignetPaidRewardSource.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
    options: [shaddamSignetTroopRewardOption],
  };
  const shaddamSignetNoSupplyState = {
    ...shaddamSignetPaidRewardFixture,
    pendingAction: shaddamSignetNoSupplyPending,
    players: shaddamSignetPaidRewardFixture.players.map((player) =>
      player.id === shaddamSignetPaidRewardTarget.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player
    ),
  };
  assert.equal(
    state.resolvePaidRewardChoice(
      shaddamSignetNoSupplyState,
      shaddamSignetNoSupplyPending,
      shaddamSignetTroopRewardOption.id,
    ),
    shaddamSignetNoSupplyState,
    "Paid reward troop choices should reject stale resolution when the recipient lacks troop supply",
  );
  assert.deepEqual(
    state.pendingActionsForCard(emperorSignet, shaddamSignetPaidRewardSource, shaddamSignetPaidRewardFixture),
    [],
    "Shaddam Signet Ring paid reward choice should require a valid activated Ally target",
  );
  const irulanPendingActionChoiceAcquireCard = marketAndImperiumCards.find((card) => card.cost === 1);
  assert.ok(irulanPendingActionChoiceAcquireCard, "Expected at least one cost-1 market or Imperium card for Irulan pending choice coverage");
  const irulanPendingActionChoiceTrashCard = { ...dagger, id: "irulan-pending-action-choice-trash-card" };
  const irulanPendingActionChoiceSource = {
    ...p6,
    leader: "Princess Irulan",
    role: "Ally",
    hand: [irulanPendingActionChoiceTrashCard],
    playArea: [allySignet],
  };
  const irulanPendingActionChoiceFixture = {
    ...game,
    imperiumRow: [irulanPendingActionChoiceAcquireCard],
    reserveMarket: [],
    throneRow: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === irulanPendingActionChoiceSource.id ? irulanPendingActionChoiceSource : player
    ),
  };
  assert.deepEqual(
    state.pendingActionsForCard(
      allySignet,
      irulanPendingActionChoiceSource,
      irulanPendingActionChoiceFixture,
      irulanPendingActionChoiceSource,
      arrakeen,
    ),
    [{
      kind: "pending-action-choice",
      ownerId: irulanPendingActionChoiceSource.id,
      cardId: allySignet.id,
      source: "Chronicler's Insight",
      options: [
        {
          id: "acquire",
          label: "Acquire cost-1 card to hand",
          pending: {
            kind: "acquire-card",
            ownerId: irulanPendingActionChoiceSource.id,
            source: "Chronicler's Insight",
            minCost: 1,
            maxCost: 1,
            destination: "hand",
            optional: false,
          },
        },
        {
          id: "trash",
          label: "Trash hand card",
          pending: {
            kind: "trash-card",
            ownerId: irulanPendingActionChoiceSource.id,
            source: "Chronicler's Insight",
            optional: false,
            zones: ["hand"],
            spiceRewardCostThreshold: 1,
            spiceReward: 2,
          },
        },
      ],
    }],
    "Irulan Signet Ring should queue a generic pending action choice with acquire and trash branches",
  );
  const mixedPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-mixed-paid-reward-card",
    name: "Effect Spec Mixed Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Mixed Paid Reward",
      options: [
        {
          id: "self-emperor",
          resource: "solari",
          cost: 2,
          reward: { kind: "gain-influence", selector: "self", faction: "emperor", amount: 1 },
        },
        {
          id: "ally-troop",
          resource: "solari",
          cost: 1,
          reward: { kind: "recruit-troops", selector: "activated-ally", amount: 1, destination: "garrison" },
        },
      ],
    }])],
  };
  const mixedPaidRewardSource = {
    ...p4,
    playArea: [mixedPaidRewardCard],
    resources: { ...p4.resources, solari: 2 },
  };
  const mixedPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === mixedPaidRewardSource.id ? mixedPaidRewardSource : player),
  };
  assert.deepEqual(
    state.pendingActionsForCard(mixedPaidRewardCard, mixedPaidRewardSource, mixedPaidRewardFixture),
    [{
      kind: "paid-reward-choice",
      ownerId: mixedPaidRewardSource.id,
      cardId: mixedPaidRewardCard.id,
      source: "Mixed Paid Reward",
      options: [{
        id: "self-emperor",
        resource: "solari",
        cost: 2,
        reward: {
          kind: "gain-influence",
          recipientId: mixedPaidRewardSource.id,
          faction: "emperor",
          amount: 1,
        },
      }],
    }],
    "Generic paid reward choices should keep valid self options when no activated Ally recipient is required",
  );
  const paidSpiceRewardCard = {
    ...convincingArgument,
    id: "effect-spec-paid-spice-reward-card",
    name: "Effect Spec Paid Spice Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Paid Spice Reward",
      options: [{
        id: "spice",
        resource: "water",
        cost: 1,
        reward: { kind: "gain-resource", selector: "self", resource: "spice", amount: 2 },
      }],
    }])],
  };
  const paidSpiceRewardSource = {
    ...p4,
    playArea: [paidSpiceRewardCard],
    resources: { ...p4.resources, water: 1, spice: 0 },
  };
  const paidSpiceRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) => player.id === paidSpiceRewardSource.id ? paidSpiceRewardSource : player),
  };
  const [paidSpiceRewardPending] = state.pendingActionsForCard(
    paidSpiceRewardCard,
    paidSpiceRewardSource,
    paidSpiceRewardFixture,
    paidSpiceRewardSource,
  );
  assert.deepEqual(
    paidSpiceRewardPending,
    {
      kind: "paid-reward-choice",
      ownerId: paidSpiceRewardSource.id,
      cardId: paidSpiceRewardCard.id,
      source: "Paid Spice Reward",
      options: [{
        id: "spice",
        resource: "water",
        cost: 1,
        reward: {
          kind: "gain-resource",
          recipientId: paidSpiceRewardSource.id,
          resource: "spice",
          amount: 2,
        },
      }],
    },
    "Generic paid reward choices should queue resource reward branches",
  );
  const paidSpiceRewardResolved = state.resolvePaidRewardChoice(
    { ...paidSpiceRewardFixture, pendingAction: paidSpiceRewardPending },
    paidSpiceRewardPending,
    "spice",
  );
  assert.equal(playerById(paidSpiceRewardResolved, paidSpiceRewardSource.id).resources.water, 0, "Paid spice reward should spend the payment resource");
  assert.equal(playerById(paidSpiceRewardResolved, paidSpiceRewardSource.id).resources.spice, 2, "Paid spice reward should gain spice");
  assert.equal(paidSpiceRewardResolved.turnSpiceGains[paidSpiceRewardSource.id], 2, "Paid spice rewards should count as turn spice gains");

  const bundledPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-bundled-paid-reward-card",
    name: "Effect Spec Bundled Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Bundled Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "bundle",
        resource: "spice",
        cost: 1,
        reward: {
          kind: "bundle",
          rewards: [
            { kind: "draw-intrigues", selector: "self", amount: 1 },
            {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
          ],
        },
      }],
    }])],
  };
  const bundledPaidRewardSource = {
    ...p5,
    leader: "Lady Jessica",
    role: "Ally",
    playArea: [bundledPaidRewardCard],
    resources: { ...p5.resources, spice: 1 },
    intrigues: [],
    jessicaMemories: 0,
  };
  const bundledPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === bundledPaidRewardSource.id ? bundledPaidRewardSource : player),
  };
  const [bundledPaidRewardPending] = state.pendingActionsForCard(
    bundledPaidRewardCard,
    bundledPaidRewardSource,
    bundledPaidRewardFixture,
    bundledPaidRewardSource,
  );
  assert.deepEqual(
    bundledPaidRewardPending,
    {
      kind: "paid-reward-choice",
      ownerId: bundledPaidRewardSource.id,
      cardId: bundledPaidRewardCard.id,
      source: "Bundled Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "bundle",
        resource: "spice",
        cost: 1,
        reward: {
          kind: "bundle",
          rewards: [
            { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
            {
              kind: "gain-leader-counter",
              recipientId: bundledPaidRewardSource.id,
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
          ],
        },
      }],
    },
    "Generic paid reward choices should queue bundled Intrigue and leader-counter rewards",
  );
  const bundledPaidRewardSupplyBefore = state.playerTroopSupply(bundledPaidRewardSource);
  const bundledPaidRewardResolved = state.resolvePaidRewardChoice(
    { ...bundledPaidRewardFixture, pendingAction: bundledPaidRewardPending },
    bundledPaidRewardPending,
    "bundle",
  );
  const bundledPaidRewardPlayer = playerById(bundledPaidRewardResolved, bundledPaidRewardSource.id);
  assert.equal(bundledPaidRewardPlayer.resources.spice, 0, "Bundled paid reward should spend the payment resource");
  assert.equal(bundledPaidRewardPlayer.jessicaMemories, 1, "Bundled paid reward should add a Jessica memory");
  assert.equal(
    state.playerTroopSupply(bundledPaidRewardPlayer),
    bundledPaidRewardSupplyBefore - 1,
    "Bundled paid reward leader-counter costs should consume troop supply",
  );
  assert.equal(bundledPaidRewardPlayer.intrigues.length, 1, "Bundled paid reward should draw Intrigues");
  const malformedLeaderCounterPending = {
    ...bundledPaidRewardPending,
    options: [{
      ...bundledPaidRewardPending.options[0],
      reward: {
        kind: "bundle",
        rewards: [
          { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
          {
            kind: "gain-leader-counter",
            recipientId: bundledPaidRewardSource.id,
            counter: "jessicaMemories",
            amount: 2,
            troopSupplyCost: 1,
          },
        ],
      },
    }],
  };
  const malformedLeaderCounterState = {
    ...bundledPaidRewardFixture,
    pendingAction: malformedLeaderCounterPending,
  };
  assert.equal(
    state.resolvePaidRewardChoice(malformedLeaderCounterState, malformedLeaderCounterPending, "bundle"),
    malformedLeaderCounterState,
    "Paid reward resolver should reject malformed leader-counter rewards with mismatched troop costs",
  );
  const nestedBundlePending = {
    ...bundledPaidRewardPending,
    options: [{
      ...bundledPaidRewardPending.options[0],
      reward: {
        kind: "bundle",
        rewards: [
          {
            kind: "bundle",
            recipientId: bundledPaidRewardSource.id,
            rewards: [{ kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 }],
          },
          { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
        ],
      },
    }],
  };
  const nestedBundleState = {
    ...bundledPaidRewardFixture,
    pendingAction: nestedBundlePending,
  };
  assert.equal(
    state.resolvePaidRewardChoice(nestedBundleState, nestedBundlePending, "bundle"),
    nestedBundleState,
    "Paid reward resolver should reject malformed nested bundle pendings instead of resolving partially",
  );
  const doubleMemoryPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-double-memory-paid-reward-card",
    name: "Effect Spec Double Memory Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Double Memory Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "double-memory",
        resource: "spice",
        cost: 1,
        reward: {
          kind: "bundle",
          rewards: [
            {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
            {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
          ],
        },
      }],
    }])],
  };
  const oneSupplyJessica = {
    ...p5,
    leader: "Lady Jessica",
    role: "Ally",
    garrison: 11,
    deployedTroops: 0,
    jessicaMemories: 0,
    playArea: [doubleMemoryPaidRewardCard],
    resources: { ...p5.resources, spice: 1 },
  };
  const oneSupplyJessicaFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === oneSupplyJessica.id ? oneSupplyJessica : player),
  };
  assert.deepEqual(
    state.pendingActionsForCard(doubleMemoryPaidRewardCard, oneSupplyJessica, oneSupplyJessicaFixture, oneSupplyJessica),
    [],
    "Paid reward pending creation should aggregate bundled leader-counter troop costs by recipient",
  );

  const rebelSupplierEffect = state.applyCardAgentEffect(
    rebelSupplier,
    { ...p2, garrison: 0, resources: { ...p2.resources, spice: 0 } },
    p2,
    game,
  );
  assert.equal(rebelSupplierEffect.source.resources.spice, 1, "Rebel Supplier Agent spec should gain 1 spice");
  assert.equal(rebelSupplierEffect.source.garrison, 2, "Rebel Supplier Agent spec should recruit 2 troops for an Ally");
  assert.equal(rebelSupplierEffect.recruitedTroops, 2, "Rebel Supplier recruited troops should count for deployment limits");
  assert.equal(rebelSupplierEffect.sourceSpiceGained, 1, "Rebel Supplier spice should be trackable for turn spice gains");

  const rebelSupplierCommanderEffect = state.applyCardAgentEffect(
    rebelSupplier,
    { ...p4, garrison: 0, resources: { ...p4.resources, spice: 0 } },
    { ...p2, garrison: 0 },
    game,
  );
  assert.equal(rebelSupplierCommanderEffect.source.resources.spice, 1, "Commander Rebel Supplier should give spice to the Commander");
  assert.equal(rebelSupplierCommanderEffect.source.garrison, 0, "Commander Rebel Supplier should not recruit troops to the Commander");
  assert.equal(rebelSupplierCommanderEffect.target.garrison, 2, "Commander Rebel Supplier should recruit troops to the activated Ally");
  assert.equal(rebelSupplierCommanderEffect.recruitedTroops, 2, "Commander Rebel Supplier recruited troops should count for deployment limits");

  const southernEldersEffect = state.applyCardAgentEffect(
    southernElders,
    { ...p2, garrison: 0, resources: { ...p2.resources, water: 0 } },
    p2,
    game,
  );
  assert.equal(southernEldersEffect.source.resources.water, 1, "Southern Elders Agent spec should gain 1 water");
  assert.equal(southernEldersEffect.source.garrison, 2, "Southern Elders Agent spec should recruit 2 troops for an Ally");
  assert.equal(southernEldersEffect.recruitedTroops, 2, "Southern Elders recruited troops should count for deployment limits");

  const southernEldersCommanderEffect = state.applyCardAgentEffect(
    southernElders,
    { ...p4, garrison: 0, resources: { ...p4.resources, water: 0 } },
    { ...p2, garrison: 0 },
    game,
  );
  assert.equal(southernEldersCommanderEffect.source.resources.water, 1, "Commander Southern Elders should give water to the Commander");
  assert.equal(southernEldersCommanderEffect.source.garrison, 0, "Commander Southern Elders should not recruit troops to the Commander");
  assert.equal(southernEldersCommanderEffect.target.garrison, 2, "Commander Southern Elders should recruit troops to the activated Ally");
  assert.equal(southernEldersCommanderEffect.recruitedTroops, 2, "Commander Southern Elders recruited troops should count for deployment limits");

  const stilgarEffect = state.applyCardAgentEffect(stilgar, { ...p2, garrison: 0 }, p2, game);
  assert.equal(stilgarEffect.source.garrison, 2, "Stilgar Agent spec should recruit 2 troops for an Ally");
  assert.equal(stilgarEffect.recruitedTroops, 2, "Stilgar recruited troops should count for deployment limits");

  const stilgarCommanderEffect = state.applyCardAgentEffect(stilgar, { ...p4, garrison: 0 }, { ...p2, garrison: 0 }, game);
  assert.equal(stilgarCommanderEffect.source.garrison, 0, "Commander Stilgar should not recruit troops to the Commander");
  assert.equal(stilgarCommanderEffect.target.garrison, 2, "Commander Stilgar should recruit troops to the activated Ally");
  assert.equal(stilgarCommanderEffect.recruitedTroops, 2, "Commander Stilgar recruited troops should count for deployment limits");

  const strikeFleetNoRecallEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p2, garrison: 0 },
    p2,
    { ...game, turnSpyRecalls: {} },
  );
  assert.equal(strikeFleetNoRecallEffect.source.garrison, 0, "Strike Fleet should not recruit before the player recalls a spy this turn");
  assert.equal(strikeFleetNoRecallEffect.recruitedTroops, undefined, "Strike Fleet should not count troops before a same-turn spy recall");
  const strikeFleetRecallEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p2, garrison: 0 },
    p2,
    { ...game, turnSpyRecalls: { [p2.id]: 1 } },
  );
  assert.equal(strikeFleetRecallEffect.source.garrison, 3, "Strike Fleet should recruit 3 troops after a same-turn spy recall");
  assert.equal(strikeFleetRecallEffect.recruitedTroops, 3, "Strike Fleet recruited troops should count for deployment limits");
  assert.match(strikeFleetRecallEffect.log ?? "", /Strike Fleet: recruits 3 troops/);
  const strikeFleetCommanderEffect = state.applyCardAgentEffect(
    strikeFleet,
    { ...p4, garrison: 0 },
    { ...p2, garrison: 0 },
    { ...game, turnSpyRecalls: { [p4.id]: 1 } },
  );
  assert.equal(strikeFleetCommanderEffect.source.garrison, 0, "Commander Strike Fleet should not recruit troops to the Commander");
  assert.equal(strikeFleetCommanderEffect.target.garrison, 3, "Commander Strike Fleet should recruit troops to the activated Ally");
  assert.equal(strikeFleetCommanderEffect.recruitedTroops, 3, "Commander Strike Fleet recruited troops should count for deployment limits");

  const desertPowerMakerEffect = state.applyCardAgentEffect(
    desertPower,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    haggaBasin,
  );
  assert.equal(desertPowerMakerEffect.source.resources.spice, 2, "Desert Power should gain 2 Agent spice on Maker spaces");
  assert.equal(desertPowerMakerEffect.sourceSpiceGained, 2, "Desert Power Agent spice should be trackable");
  assert.match(desertPowerMakerEffect.log ?? "", /Desert Power: gains 2 spice/);
  const desertPowerNonMakerEffect = state.applyCardAgentEffect(
    desertPower,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    arrakeen,
  );
  assert.equal(
    desertPowerNonMakerEffect.source.resources.spice,
    0,
    "Desert Power should not gain Agent spice outside Maker spaces",
  );
  assert.equal(desertPowerNonMakerEffect.log, undefined, "Desert Power should not log outside Maker spaces");

  const unprotectedConflict = data.conflictCards.find((card) => card.name === "Skirmish (Desert Mouse)");
  assert.ok(unprotectedConflict, "Verifier needs an unprotected Conflict fixture");
  const desertPowerRevealFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedSandworms: 0,
    hand: [desertPower],
    makerHooks: true,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const desertPowerRevealState = {
    ...desertPowerRevealFixture,
    conflict: unprotectedConflict,
    shieldWall: false,
  };
  const desertPowerRevealPlan = turnActions.revealTurnPlan(
    playerById(desertPowerRevealState, p3.id),
    desertPowerRevealState,
  );
  assert.equal(desertPowerRevealPlan.persuasion, 2, "Desert Power should default to its +2 Reveal persuasion");
  const desertPowerRevealed = turnActions.revealTurnAction(desertPowerRevealState, {
    commanderTargets: {},
    revealPlan: desertPowerRevealPlan,
  });
  assert.equal(
    desertPowerRevealed.pendingAction?.kind,
    "pay-resource-for-sandworms",
    "Desert Power should queue its Reveal sandworm payment when the recipient can summon",
  );
  assert.equal(desertPowerRevealed.pendingAction?.persuasionCost, 2);
  assert.equal(desertPowerRevealed.pendingAction?.source, "Desert Power");
  const desertPowerWormed = state.resolvePayResourceForSandwormsChoice(
    desertPowerRevealed,
    desertPowerRevealed.pendingAction,
  );
  assert.equal(playerById(desertPowerWormed, p3.id).resources.water, 0, "Desert Power Reveal payment should spend 1 water");
  assert.equal(playerById(desertPowerWormed, p3.id).persuasion, 0, "Desert Power Reveal payment should replace its persuasion");
  assert.equal(playerById(desertPowerWormed, p3.id).deployedSandworms, 1, "Desert Power Reveal payment should summon a sandworm");
  assert.equal(playerById(desertPowerWormed, p3.id).conflict, 3, "Desert Power sandworm should add 3 strength");
  const desertPowerSkipped = state.skipPayResourceForSandworms(
    desertPowerRevealed,
    desertPowerRevealed.pendingAction,
  );
  assert.equal(playerById(desertPowerSkipped, p3.id).resources.water, 1, "Skipping Desert Power payment should keep water");
  assert.equal(playerById(desertPowerSkipped, p3.id).persuasion, 2, "Skipping Desert Power payment should keep persuasion");

  const ecologicalSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [ecologicalTestingStation], playArea: [], highCouncilSeat: false },
    game,
  );
  assert.equal(ecologicalSoloReveal.persuasion, 1, "Ecological Testing Station should reveal for 1 persuasion");
  assert.equal(ecologicalSoloReveal.revealGain.water ?? 0, 0, "Ecological Testing Station should not gain water without Fremen Bond");
  const ecologicalFremenBondFixture = {
    ...convincingArgument,
    id: "ecological-testing-station-fremen-bond-fixture",
    name: "Ecological Testing Station Fremen Bond Fixture",
    effects: undefined,
    persuasion: 0,
    revealGain: undefined,
    swords: 0,
    traits: ["Faction: Fremen"],
  };
  const ecologicalBondReveal = turnActions.revealTurnPlan(
    {
      ...p2,
      hand: [ecologicalTestingStation, ecologicalFremenBondFixture],
      playArea: [],
      highCouncilSeat: false,
    },
    game,
  );
  assert.equal(ecologicalBondReveal.persuasion, 1, "Ecological Testing Station Fremen Bond helper should not add persuasion");
  assert.equal(ecologicalBondReveal.revealGain.water, 1, "Ecological Testing Station should gain water with Fremen Bond");
  const ecologicalPaymentDraws = [
    { ...dagger, id: "ecological-testing-station-payment-draw-1" },
    { ...convincingArgument, id: "ecological-testing-station-payment-draw-2" },
  ];
  const ecologicalPaymentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 2 },
  }));
  const ecologicalPlaced = turnActions.placeAgentAction(
    { ...ecologicalPaymentFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  assert.deepEqual(
    ecologicalPlaced.pendingAction,
    {
      kind: "pay-resource-for-draw-cards",
      ownerId: p2.id,
      resource: "water",
      cost: 2,
      drawCards: 2,
      optional: true,
      source: "Ecological Testing Station",
      cardId: ecologicalTestingStation.id,
    },
    "Ecological Testing Station Agent placement should queue the water-payment draw choice",
  );
  const ecologicalResolved = state.resolvePayResourceForDrawCardsChoice(ecologicalPlaced, ecologicalPlaced.pendingAction);
  assert.equal(playerById(ecologicalResolved, p2.id).resources.water, 0, "Ecological Testing Station should spend 2 water");
  assert.deepEqual(
    playerById(ecologicalResolved, p2.id).hand.map((card) => card.id),
    ecologicalPaymentDraws.map((card) => card.id),
    "Ecological Testing Station payment should draw 2 cards",
  );
  assert.equal(ecologicalResolved.pendingAction, undefined, "Ecological Testing Station payment should clear the pending action");
  assert.match(ecologicalResolved.log[0], /spends 2 water for Ecological Testing Station; draws 2 cards/);
  const ecologicalSkipFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 2 },
  }));
  const ecologicalSkippedPlaced = turnActions.placeAgentAction(
    { ...ecologicalSkipFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  const ecologicalSkipped = state.skipPayResourceForDrawCards(ecologicalSkippedPlaced, ecologicalSkippedPlaced.pendingAction);
  assert.equal(playerById(ecologicalSkipped, p2.id).resources.water, 2, "Skipping Ecological Testing Station should preserve water");
  assert.equal(playerById(ecologicalSkipped, p2.id).hand.length, 0, "Skipping Ecological Testing Station should not draw cards");
  assert.equal(ecologicalSkipped.pendingAction, undefined, "Skipping Ecological Testing Station should clear the pending action");
  assert.match(ecologicalSkipped.log[0], /declines to pay 2 water for Ecological Testing Station/);
  const ecologicalSietchTabrFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    influence: { ...p2.influence, fringeWorlds: 2 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const ecologicalSietchTabrPlaced = turnActions.placeAgentAction(
    { ...ecologicalSietchTabrFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: sietchTabr },
  );
  assert.equal(ecologicalSietchTabrPlaced.pendingAction?.kind, "sietch-tabr", "Sietch Tabr should resolve before Ecological payment");
  assert.equal(
    ecologicalSietchTabrPlaced.pendingQueue[0]?.kind,
    "pay-resource-for-draw-cards",
    "Ecological Testing Station should queue when Sietch Tabr water makes the payment affordable",
  );
  const ecologicalAfterSietch = state.resolveSietchTabrChoice(
    ecologicalSietchTabrPlaced,
    ecologicalSietchTabrPlaced.pendingAction,
    "shield-wall",
  );
  assert.equal(playerById(ecologicalAfterSietch, p2.id).resources.water, 2, "Sietch Tabr should provide the second payment water");
  assert.equal(
    ecologicalAfterSietch.pendingAction?.kind,
    "pay-resource-for-draw-cards",
    "Ecological Testing Station payment should surface after Sietch Tabr resolves",
  );
  const ecologicalAfterSietchPayment = state.resolvePayResourceForDrawCardsChoice(
    ecologicalAfterSietch,
    ecologicalAfterSietch.pendingAction,
  );
  assert.equal(playerById(ecologicalAfterSietchPayment, p2.id).resources.water, 0, "Deferred Sietch Tabr payment should spend both water");
  assert.deepEqual(
    playerById(ecologicalAfterSietchPayment, p2.id).hand.map((card) => card.id),
    ecologicalPaymentDraws.map((card) => card.id),
    "Deferred Sietch Tabr payment should draw 2 cards",
  );
  const ecologicalNoWaterFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: ecologicalPaymentDraws,
    discard: [],
    garrison: 0,
    hand: [ecologicalTestingStation],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const ecologicalNoWaterPlaced = turnActions.placeAgentAction(
    { ...ecologicalNoWaterFixture, spaces: {} },
    { commanderTargets: {}, selectedCard: ecologicalTestingStation, selectedSpace: spiceRefinery },
  );
  assert.equal(
    ecologicalNoWaterPlaced.pendingAction,
    undefined,
    "Ecological Testing Station should not queue a payment choice without 2 water",
  );

  const cargoRunnerDeck = [
    { ...dagger, id: "cargo-runner-agent-draw-1" },
    { ...convincingArgument, id: "cargo-runner-agent-draw-2" },
  ];
  const cargoRunnerUncontracted = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: [], deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerUncontracted.source.hand.length, 0, "Cargo Runner should not draw below two completed contracts");
  assert.equal(cargoRunnerUncontracted.log, undefined, "Cargo Runner should not log below its completed-contract threshold");
  const cargoRunnerCompletedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const cargoRunnerTwoContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: cargoRunnerCompletedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerTwoContracts.source.hand.length, 1, "Cargo Runner should draw 1 card with two completed contracts");
  assert.match(cargoRunnerTwoContracts.log ?? "", /Cargo Runner: draws 1 card/);
  const fourCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const cargoRunnerFourContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: fourCompletedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
    p2,
  );
  assert.equal(cargoRunnerFourContracts.source.hand.length, 2, "Cargo Runner should draw 2 cards with four completed contracts");
  assert.match(cargoRunnerFourContracts.log ?? "", /Cargo Runner: draws 2 cards/);

  const chaniQualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniQualified.sourceIntriguesToDraw, 1, "Chani should expose a pending Intrigue draw at three conflict units");
  assert.equal(chaniQualified.log, undefined, "Chani should let the actual Intrigue draw log report the draw");
  const chaniWithWorm = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 1 },
    p2,
  );
  assert.equal(chaniWithWorm.sourceIntriguesToDraw, 1, "Chani should count sandworms as conflict units");
  const commanderChani = state.applyCardAgentEffect(
    chani,
    p4,
    { ...p2, deployedTroops: 3, deployedSandworms: 0 },
  );
  assert.equal(
    commanderChani.sourceIntriguesToDraw,
    1,
    "Chani should use the activated Ally's conflict units during Commander Agent turns",
  );
  const chaniUnqualified = state.applyCardAgentEffect(
    chani,
    { ...p2, deployedTroops: 2, deployedSandworms: 0 },
    p2,
  );
  assert.equal(chaniUnqualified.sourceIntriguesToDraw, undefined, "Chani should not draw below three conflict units");
  assert.equal(chaniUnqualified.log, undefined, "Chani should not log below the conflict-unit threshold");

	  const chaniIntrigue = data.intrigueCards[0];
	  assert.ok(chaniIntrigue, "Verifier needs an Intrigue fixture");
	  const chaniSecondIntrigue = data.intrigueCards[1];
	  assert.ok(chaniSecondIntrigue, "Verifier needs a second Intrigue fixture");
  const chaniFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 3,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniPlaced = turnActions.placeAgentAction(
    { ...chaniFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniPlaced, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani Agent spec should draw from the Intrigue deck during Agent placement",
  );
  assert.deepEqual(chaniPlaced.intrigueDeck, [], "Chani Agent spec should remove the drawn Intrigue from the deck");
  assert.deepEqual(chaniPlaced.intrigueDiscard, [], "Chani Agent spec should not mutate the Intrigue discard");
  assert.match(chaniPlaced.log.join("\n"), /draws an Intrigue card from Chani, Clever Tactician/);
  const chaniBlockedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [{ ...dagger, id: "chani-blocked-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniBlocked = turnActions.placeAgentAction(
    { ...chaniBlockedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  assert.equal(
    playerById(chaniBlocked, p2.id).intrigues.length,
    0,
    "Chani Agent spec should not draw before reaching three conflict units",
  );
  assert.equal(chaniBlocked.intrigueDeck[0]?.id, chaniIntrigue.id, "Blocked Chani should leave the Intrigue deck untouched");
  assert.deepEqual(chaniBlocked.intrigueDiscard, [], "Blocked Chani should leave the Intrigue discard untouched");
  assert.equal(
    chaniBlocked.pendingAction?.kind,
    "deploy",
    "Conflict-unit-gated Intrigue draw should defer while deployment can reach the threshold",
  );
  assert.equal(
    chaniBlocked.pendingAction?.postDeployIntrigueDraw?.minConflictUnits,
    3,
    "Deferred Chani draw should track the printed conflict-unit threshold",
  );
  const chaniDeferred = state.deployTroopToConflict(chaniBlocked, chaniBlocked.pendingAction);
  assert.equal(
    playerById(chaniDeferred, p2.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after deployment reaches three conflict units",
  );
  assert.deepEqual(chaniDeferred.intrigueDeck, [], "Deferred Chani draw should remove the Intrigue from the deck");
  assert.deepEqual(chaniDeferred.intrigueDiscard, [], "Deferred Chani draw should not mutate the Intrigue discard");
	  assert.equal(
	    chaniDeferred.pendingAction?.kind === "deploy"
	      ? chaniDeferred.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Deferred Chani draw should resolve at most once",
	  );
	  const chaniMultiDeployFixture = withActivePlayer(game, p2.id, () => ({
	    agentsReady: 1,
	    deck: [{ ...dagger, id: "chani-multi-arrakeen-board-draw-fixture" }],
	    discard: [],
	    deployedTroops: 1,
	    deployedSandworms: 0,
	    garrison: 2,
	    hand: [chani],
	    intrigues: [],
	    playArea: [],
	  }));
	  const chaniMultiDeployPending = turnActions.placeAgentAction(
	    { ...chaniMultiDeployFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
	    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
	  );
	  assert.equal(
	    chaniMultiDeployPending.pendingAction?.kind,
	    "deploy",
	    "Multi-deploy Chani fixture should queue deployment",
	  );
	  const chaniFirstDeploy = state.deployTroopToConflict(chaniMultiDeployPending, chaniMultiDeployPending.pendingAction);
	  assert.equal(
	    playerById(chaniFirstDeploy, p2.id).intrigues.length,
	    0,
	    "Chani should not draw after a first deployment that remains below three conflict units",
	  );
	  assert.equal(
	    chaniFirstDeploy.pendingAction?.kind === "deploy"
	      ? chaniFirstDeploy.pendingAction.postDeployIntrigueDraw?.minConflictUnits
	      : undefined,
	    3,
	    "Chani's deferred draw should stay pending until a later deployment reaches the threshold",
	  );
	  assert.equal(chaniFirstDeploy.intrigueDeck[0]?.id, chaniIntrigue.id, "Below-threshold Chani deployment should leave the deck untouched");
	  assert.equal(
	    chaniFirstDeploy.pendingAction?.kind,
	    "deploy",
	    "Chani should still have a deployment pending after the first multi-deploy troop",
	  );
	  const chaniSecondDeploy = state.deployTroopToConflict(chaniFirstDeploy, chaniFirstDeploy.pendingAction);
	  assert.equal(
	    playerById(chaniSecondDeploy, p2.id).intrigues[0]?.id,
	    chaniIntrigue.id,
	    "Chani should draw after a later deployment reaches three conflict units",
	  );
	  assert.deepEqual(chaniSecondDeploy.intrigueDeck, [], "Multi-deploy Chani draw should remove the Intrigue from the deck");
	  assert.equal(
	    chaniSecondDeploy.pendingAction?.kind === "deploy"
	      ? chaniSecondDeploy.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Multi-deploy Chani draw should clear the deferred draw after it resolves",
	  );
	  const chaniSkippedFixture = withActivePlayer(game, p2.id, () => ({
	    agentsReady: 1,
	    deck: [{ ...dagger, id: "chani-skipped-arrakeen-board-draw-fixture" }],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    hand: [chani],
    intrigues: [],
    playArea: [],
  }));
  const chaniSkippedPending = turnActions.placeAgentAction(
    { ...chaniSkippedFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: arrakeen },
  );
  const chaniSkipped = state.finishPendingAction(chaniSkippedPending);
  assert.equal(
    playerById(chaniSkipped, p2.id).intrigues.length,
    0,
    "Skipping deployment should not resolve Chani's deferred Intrigue draw below the threshold",
  );
  assert.deepEqual(chaniSkipped.intrigueDeck, [chaniIntrigue], "Skipped Chani deployment should leave the Intrigue deck untouched");
  assert.deepEqual(chaniSkipped.intrigueDiscard, [], "Skipped Chani deployment should leave the Intrigue discard untouched");

  const chaniMakerFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    deployedTroops: 2,
    deployedSandworms: 0,
    garrison: 0,
    hand: [chani],
    intrigues: [],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 1 },
  }));
  const chaniMakerChoice = turnActions.placeAgentAction(
    { ...chaniMakerFixture, intrigueDeck: [chaniIntrigue], intrigueDiscard: [], shieldWall: false, spaces: {} },
    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
  );
  assert.equal(chaniMakerChoice.pendingAction?.kind, "maker-choice", "Chani on Hagga Basin should defer through the Maker choice");
  assert.equal(
    chaniMakerChoice.pendingAction?.kind === "maker-choice"
      ? chaniMakerChoice.pendingAction.postDeployIntrigueDraw?.minConflictUnits
      : undefined,
    3,
    "Maker-choice Chani draw should carry the conflict-unit threshold",
  );
  const chaniMakerWorm = state.resolveMakerChoice(chaniMakerChoice, chaniMakerChoice.pendingAction, "sandworms");
  assert.equal(
    playerById(chaniMakerWorm, p3.id).intrigues[0]?.id,
    chaniIntrigue.id,
    "Chani should draw after a Maker-choice sandworm reaches three conflict units",
  );
	  assert.deepEqual(chaniMakerWorm.intrigueDeck, [], "Maker-choice Chani draw should remove the Intrigue from the deck");
	  assert.deepEqual(chaniMakerWorm.intrigueDiscard, [], "Maker-choice Chani draw should not mutate the Intrigue discard");
	  const chaniMakerDeployFixture = withActivePlayer(game, p3.id, () => ({
	    agentsReady: 1,
	    deck: [],
	    discard: [],
	    deployedTroops: 2,
	    deployedSandworms: 0,
	    garrison: 1,
	    hand: [chani],
	    intrigues: [],
	    makerHooks: true,
	    playArea: [],
	    resources: { solari: 0, spice: 0, water: 1 },
	  }));
	  const chaniMakerDeployChoice = turnActions.placeAgentAction(
	    {
	      ...chaniMakerDeployFixture,
	      intrigueDeck: [chaniIntrigue, chaniSecondIntrigue],
	      intrigueDiscard: [],
	      shieldWall: false,
	      spaces: {},
	    },
	    { commanderTargets: {}, selectedCard: chani, selectedSpace: haggaBasin },
	  );
	  assert.equal(
	    chaniMakerDeployChoice.pendingAction?.kind,
	    "maker-choice",
	    "Maker-choice Chani fixture should resolve a Maker choice first",
	  );
	  assert.equal(
	    chaniMakerDeployChoice.pendingQueue[0]?.kind,
	    "deploy",
	    "Maker-choice Chani fixture should keep deployment queued behind the Maker choice",
	  );
	  const chaniMakerDeployWorm = state.resolveMakerChoice(
	    chaniMakerDeployChoice,
	    chaniMakerDeployChoice.pendingAction,
	    "sandworms",
	  );
	  assert.equal(
	    playerById(chaniMakerDeployWorm, p3.id).intrigues.length,
	    1,
	    "Maker-choice Chani should draw once when the sandworm reaches the threshold",
	  );
	  assert.deepEqual(
	    chaniMakerDeployWorm.intrigueDeck,
	    [chaniSecondIntrigue],
	    "Maker-choice Chani should leave the second Intrigue card in the deck after the first draw",
	  );
	  assert.equal(
	    chaniMakerDeployWorm.pendingAction?.kind === "deploy"
	      ? chaniMakerDeployWorm.pendingAction.postDeployIntrigueDraw
	      : undefined,
	    undefined,
	    "Maker-choice Chani draw should clear duplicate deferred metadata from the queued deploy",
	  );
	  assert.equal(chaniMakerDeployWorm.pendingAction?.kind, "deploy", "Maker-choice Chani should advance to the queued deploy");
	  const chaniMakerDeployAfterDeploy = state.deployTroopToConflict(
	    chaniMakerDeployWorm,
	    chaniMakerDeployWorm.pendingAction,
	  );
	  assert.equal(
	    playerById(chaniMakerDeployAfterDeploy, p3.id).intrigues.length,
	    1,
	    "Queued deployment after a Maker-choice Chani draw should not draw a second Intrigue",
	  );
	  assert.deepEqual(
	    chaniMakerDeployAfterDeploy.intrigueDeck,
	    [chaniSecondIntrigue],
	    "Queued deployment after a Maker-choice Chani draw should leave the remaining Intrigue in the deck",
	  );

	  const makerKeeperSource = {
    ...p2,
    resources: { solari: 0, spice: 0, water: 0 },
    influence: { ...p2.influence, bene: 2, fringeWorlds: 2 },
  };
  const makerKept = state.applyCardAgentEffect(
    makerKeeper,
    makerKeeperSource,
    makerKeeperSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? makerKeeperSource : player) },
  );
  assert.deepEqual(
    makerKept.source.resources,
    { solari: 0, spice: 1, water: 1 },
    "Maker Keeper should use Fremen-icon influence for its conditional Agent spice",
  );
  assert.equal(makerKept.sourceSpiceGained, 1, "Maker Keeper Agent spice should be trackable");
  assert.match(makerKept.log ?? "", /Maker Keeper: gains 1 spice and 1 water/);
  const unqualifiedMakerKeeper = state.applyCardAgentEffect(
    makerKeeper,
    { ...makerKeeperSource, influence: p2.influence },
    { ...makerKeeperSource, influence: p2.influence },
    { ...game, players: game.players.map((player) => player.id === p2.id ? { ...makerKeeperSource, influence: p2.influence } : player) },
  );
  assert.deepEqual(
    unqualifiedMakerKeeper.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Maker Keeper should not gain Agent resources below Influence thresholds",
  );
  assert.equal(unqualifiedMakerKeeper.log, undefined, "Maker Keeper should not log when no Agent spec applies");
  const northernWatermasterEffect = state.applyCardAgentEffect(
    northernWatermaster,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(northernWatermasterEffect.source.resources, { solari: 0, spice: 0, water: 1 }, "Northern Watermaster should gain 1 Agent water");
  assert.match(northernWatermasterEffect.log ?? "", /Northern Watermaster: gains 1 water/);
  const northernSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster], highCouncilSeat: false },
    game,
  );
  assert.equal(northernSoloReveal.persuasion, 1, "Northern Watermaster should always reveal for 1 persuasion");
  assert.deepEqual(northernSoloReveal.revealGain, {}, "Northern Watermaster Fremen Bond should not trigger by itself");
  const northernHandBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster, fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.equal(northernHandBondReveal.persuasion, 1, "Northern Watermaster Fremen Bond support should not add persuasion");
  assert.deepEqual(
    northernHandBondReveal.revealGain,
    { spice: 2 },
    "Northern Watermaster Fremen Bond should gain 2 spice with another revealed Fremen card",
  );
  const northernPlayAreaBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster], playArea: [fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    northernPlayAreaBondReveal.revealGain,
    { spice: 2 },
    "Northern Watermaster Fremen Bond should count a Fremen card already in play",
  );
  const shishakliSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli], highCouncilSeat: false },
    game,
  );
  assert.equal(shishakliSoloReveal.swords, 2, "Shishakli should always reveal for 2 strength");
  assert.deepEqual(shishakliSoloReveal.influenceGains, {}, "Shishakli Fremen Bond should not trigger by itself");
  const shishakliHandBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli, fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    shishakliHandBondReveal.influenceGains,
    { fremen: 1 },
    "Shishakli Fremen Bond should gain 1 Fremen Influence with another revealed Fremen card",
  );
  const shishakliPlayAreaBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli], playArea: [fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    shishakliPlayAreaBondReveal.influenceGains,
    { fremen: 1 },
    "Shishakli Fremen Bond should count a Fremen card already in play",
  );
  const shishakliRevealFixture = withActivePlayer(game, p2.id, (player) => ({
    ...player,
    agentsReady: 1,
    garrison: 0,
    hand: [shishakli, fremenSupportCard],
    highCouncilSeat: false,
    influence: { ...player.influence, fremen: 1 },
    playArea: [],
    vp: 0,
  }));
  const shishakliRevealPlan = turnActions.revealTurnPlan(
    playerById(shishakliRevealFixture, p2.id),
    shishakliRevealFixture,
  );
  const shishakliRevealed = turnActions.revealTurnAction(
    shishakliRevealFixture,
    { commanderTargets: {}, revealPlan: shishakliRevealPlan },
  );
  assert.equal(playerById(shishakliRevealed, p2.id).influence.fremen, 2, "Shishakli Reveal should apply Fremen Influence");
  assert.equal(playerById(shishakliRevealed, p2.id).vp, 1, "Shishakli Reveal Influence should resolve threshold VP");
  assert.match(shishakliRevealed.log[0], /gains 1 Fremen Influence/, "Shishakli Reveal log should mention Influence gain");
  const shishakliCapturedMentatFixture = withActivePlayer(game, p2.id, (player) => ({
    ...player,
    agentsReady: 1,
    hand: [shishakli, capturedMentat, fremenSupportCard],
    highCouncilSeat: false,
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 0,
      fremen: 0,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    playArea: [],
  }));
  const shishakliCapturedMentatPlan = turnActions.revealTurnPlan(
    playerById(shishakliCapturedMentatFixture, p2.id),
    shishakliCapturedMentatFixture,
  );
  const shishakliCapturedMentatRevealed = turnActions.revealTurnAction(
    shishakliCapturedMentatFixture,
    { commanderTargets: {}, revealPlan: shishakliCapturedMentatPlan },
  );
  assert.equal(
    playerById(shishakliCapturedMentatRevealed, p2.id).influence.fremen,
    1,
    "Shishakli should apply Reveal Influence before same-reveal pending choices are generated",
  );
  assert.equal(
    shishakliCapturedMentatRevealed.pendingAction?.kind,
    "lose-influence-for-intrigues",
    "Captured Mentat should see Shishakli's same-reveal Influence gain when queuing its pending choice",
  );
  assert.equal(shishakliCapturedMentatRevealed.pendingAction?.source, "Captured Mentat");
  const paracompassEffect = state.applyCardAgentEffect(
    paracompass,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(paracompassEffect.source.resources, { solari: 2, spice: 0, water: 0 }, "Paracompass should gain 2 Agent Solari");
  assert.match(paracompassEffect.log ?? "", /Paracompass: gains 2 Solari/);
  const paracompassNoCouncilReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: false, swordmasterBonus: false },
    game,
  );
  assert.equal(paracompassNoCouncilReveal.persuasion, 0, "Paracompass should not reveal for persuasion without High Council");
  const paracompassSwordmasterOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: false, swordmasterBonus: true },
    game,
  );
  assert.equal(paracompassSwordmasterOnlyReveal.persuasion, 0, "Paracompass Swordmaster bonus should require High Council");
  const paracompassCouncilReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: true, swordmasterBonus: false },
    game,
  );
  const highCouncilOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [], highCouncilSeat: true, swordmasterBonus: false },
    game,
  );
  assert.equal(
    paracompassCouncilReveal.persuasion - highCouncilOnlyReveal.persuasion,
    2,
    "Paracompass should add 2 card persuasion with High Council",
  );
  const paracompassCouncilSwordmasterReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: true, swordmasterBonus: true },
    game,
  );
  const highCouncilSwordmasterOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [], highCouncilSeat: true, swordmasterBonus: true },
    game,
  );
  assert.equal(
    paracompassCouncilSwordmasterReveal.persuasion - highCouncilSwordmasterOnlyReveal.persuasion,
    3,
    "Paracompass should add 3 card persuasion with High Council and Swordmaster",
  );
  for (const [space, label] of [
    [dutifulService, "Emperor"],
    [secrets, "Bene Gesserit"],
    [deliverSupplies, "Spacing Guild"],
  ]) {
    const reliableInformantEffect = state.applyCardAgentEffect(
      reliableInformant,
      { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
      p2,
      game,
      space,
    );
    assert.deepEqual(
      reliableInformantEffect.source.resources,
      { solari: 1, spice: 0, water: 0 },
      `Reliable Informant should gain 1 Agent Solari on ${label} spaces`,
    );
    assert.match(reliableInformantEffect.log ?? "", /Reliable Informant: gains 1 Solari/);
  }
  const reliableInformantLandsraadEffect = state.applyCardAgentEffect(
    reliableInformant,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    highCouncil,
  );
  assert.deepEqual(
    reliableInformantLandsraadEffect.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Reliable Informant should not gain Agent Solari on unrelated board-space icons",
  );
  assert.equal(reliableInformantLandsraadEffect.log, undefined, "Reliable Informant should not log when no Agent spec applies");
  const reliableInformantReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [reliableInformant], highCouncilSeat: false },
    game,
  );
  assert.equal(reliableInformantReveal.persuasion, 1, "Reliable Informant should reveal for 1 persuasion");
  assert.deepEqual(reliableInformantReveal.revealGain, { solari: 1 }, "Reliable Informant should reveal for 1 Solari");
  const smugglersHavenConflict = data.conflictCards.find((card) => card.name === "CHOAM Security");
  assert.ok(smugglersHavenConflict, "Verifier needs an unprotected Conflict for Smuggler's Haven sandworms");
  const smugglersHavenAllySource = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
    playArea: [smugglersHaven],
    resources: { solari: 0, spice: 4, water: 0 },
  };
  const smugglersHavenAllyState = {
    ...game,
    conflict: smugglersHavenConflict,
    players: game.players.map((player) => player.id === p3.id ? smugglersHavenAllySource : player),
    shieldWall: false,
  };
  const smugglersHavenAgentEffect = state.applyCardAgentEffect(
    smugglersHaven,
    smugglersHavenAllySource,
    smugglersHavenAllySource,
    smugglersHavenAllyState,
    deliverSupplies,
  );
  assert.equal(
    smugglersHavenAgentEffect.source.vp,
    smugglersHavenAllySource.vp + 1,
    "Smuggler's Haven should gain its printed VP during Agent play",
  );
  assert.match(smugglersHavenAgentEffect.log ?? "", /Smuggler's Haven: gains 1 VP/);
  const smugglersHavenAllyPending = state.pendingActionForCard(
    smugglersHaven,
    smugglersHavenAllySource,
    smugglersHavenAllyState,
    smugglersHavenAllySource,
    deliverSupplies,
  );
  assert.deepEqual(
    smugglersHavenAllyPending,
    {
      kind: "pay-resource-for-sandworms",
      ownerId: p3.id,
      recipientId: p3.id,
      resource: "spice",
      cost: 4,
      sandworms: 1,
      strength: 3,
      destination: "conflict",
      optional: true,
      source: "Smuggler's Haven",
      cardId: smugglersHaven.id,
    },
    "Smuggler's Haven should queue a self sandworm payment for an Ally",
  );
  const smugglersHavenAllyResolved = state.resolvePayResourceForSandwormsChoice(
    { ...smugglersHavenAllyState, pendingAction: smugglersHavenAllyPending },
    smugglersHavenAllyPending,
  );
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).resources.spice, 0, "Smuggler's Haven Ally payment should spend 4 spice");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).deployedSandworms, 1, "Smuggler's Haven Ally payment should deploy a self sandworm");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).conflict, 3, "Smuggler's Haven Ally sandworm should add 3 strength");
  assert.equal(
    smugglersHavenAllyResolved.turnUnitDeployments[p3.id],
    1,
    "Smuggler's Haven Ally sandworm should count as that player's turn deployment",
  );
  assert.equal(
    state.pendingActionForCard(
      smugglersHaven,
      { ...smugglersHavenAllySource, makerHooks: false },
      {
        ...smugglersHavenAllyState,
        players: smugglersHavenAllyState.players.map((player) =>
          player.id === p3.id ? { ...smugglersHavenAllySource, makerHooks: false } : player,
        ),
      },
      { ...smugglersHavenAllySource, makerHooks: false },
      deliverSupplies,
    ),
    undefined,
    "Smuggler's Haven should not queue self sandworms without Maker Hooks",
  );
  const smugglersHavenCommanderSource = {
    ...p1,
    playArea: [smugglersHaven],
    resources: { solari: 0, spice: 4, water: 0 },
  };
  const smugglersHavenCommanderAlly = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
  };
  const smugglersHavenCommanderState = {
    ...game,
    conflict: smugglersHavenConflict,
    players: game.players.map((player) => {
      if (player.id === p1.id) return smugglersHavenCommanderSource;
      if (player.id === p3.id) return smugglersHavenCommanderAlly;
      return player;
    }),
    shieldWall: false,
  };
  const smugglersHavenCommanderPending = state.pendingActionForCard(
    smugglersHaven,
    smugglersHavenCommanderSource,
    smugglersHavenCommanderState,
    smugglersHavenCommanderAlly,
    deliverSupplies,
  );
  assert.ok(smugglersHavenCommanderPending, "Smuggler's Haven should queue for a Commander with a hooked activated Ally");
  assert.equal(smugglersHavenCommanderPending?.ownerId, p1.id, "Commander Smuggler's Haven payment should be paid by the Commander");
  assert.equal(
    smugglersHavenCommanderPending?.recipientId,
    p3.id,
    "Commander Smuggler's Haven payment should summon for the activated Ally",
  );
  const smugglersHavenCommanderResolved = state.resolvePayResourceForSandwormsChoice(
    { ...smugglersHavenCommanderState, pendingAction: smugglersHavenCommanderPending },
    smugglersHavenCommanderPending,
  );
  assert.equal(playerById(smugglersHavenCommanderResolved, p1.id).resources.spice, 0, "Commander Smuggler's Haven should spend Commander spice");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).deployedSandworms, 1, "Commander Smuggler's Haven should deploy the Ally sandworm");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).conflict, 3, "Commander Smuggler's Haven sandworm should add Ally strength");
  assert.equal(
    smugglersHavenCommanderResolved.turnUnitDeployments[p1.id],
    1,
    "Commander Smuggler's Haven sandworm should count for the Commander turn",
  );
  const smugglersHavenSpiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [imperialBasin.id]: p2.id } },
  );
  assert.equal(smugglersHavenSpiedMakerReveal.persuasion, 1, "Smuggler's Haven should reveal for 1 persuasion");
  assert.equal(
    smugglersHavenSpiedMakerReveal.revealGain.spice,
    2,
    "Smuggler's Haven should gain 2 Reveal spice when the player has a spy on any Maker space",
  );
  const smugglersHavenRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smugglersHaven],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const smugglersHavenRevealed = turnActions.revealTurnAction(
    { ...smugglersHavenRevealFixture, spyPosts: { [imperialBasin.id]: p2.id } },
    {
      commanderTargets: {},
      revealPlan: smugglersHavenSpiedMakerReveal,
    },
  );
  assert.equal(
    playerById(smugglersHavenRevealed, p2.id).resources.spice,
    2,
    "Smuggler's Haven should add its Maker-spy spice during Reveal resolution",
  );
  assert.equal(
    smugglersHavenRevealed.turnSpiceGains[p2.id],
    2,
    "Smuggler's Haven Reveal spice should be tracked as turn spice gain",
  );
  const smugglersHavenUnspiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    game,
  );
  assert.equal(
    smugglersHavenUnspiedMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice without the player's Maker-space spy",
  );
  const smugglersHavenOpponentSpiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [imperialBasin.id]: p1.id } },
  );
  assert.equal(
    smugglersHavenOpponentSpiedMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice from another player's Maker-space spy",
  );
  const smugglersHavenSpiedNonMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [deliverSupplies.id]: p2.id } },
  );
  assert.equal(
    smugglersHavenSpiedNonMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice from a spy on a non-Maker space",
  );
  const spaceTimeNonGuildDiscard = { ...dagger, id: "space-time-non-guild-discard-card" };
  const spaceTimeDrawOne = { ...convincingArgument, id: "space-time-draw-one-card" };
  const spaceTimeDrawTwo = { ...convincingArgument, id: "space-time-draw-two-card" };
  const spaceTimeNonGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spaceTimeNonGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spaceTimeNonGuildPlaced = turnActions.placeAgentAction(spaceTimeNonGuildFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Space-time Folding should queue discard-for-draw after Agent placement");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.ownerId, p2.id, "Space-time Folding discard choice should belong to the card player");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.drawCards, 1, "Space-time Folding should draw one card before its trait bonus");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.optional, false, "Space-time Folding discard should be mandatory when a hand card remains");
  assert.equal(
    spaceTimeNonGuildPlaced.pendingAction?.bonusDraw?.requiredDiscardTrait,
    "Faction: Spacing Guild",
    "Space-time Folding should preserve its Spacing Guild bonus trait",
  );
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.bonusDraw?.drawCards, 1, "Space-time Folding should draw one bonus card");
  const spaceTimeMandatorySkipped = state.skipDiscardCardForDraw(spaceTimeNonGuildPlaced, spaceTimeNonGuildPlaced.pendingAction);
  assert.equal(
    spaceTimeMandatorySkipped.pendingAction,
    spaceTimeNonGuildPlaced.pendingAction,
    "Mandatory Space-time Folding discard should not be skippable",
  );
  const spaceTimeNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    spaceTimeNonGuildPlaced,
    spaceTimeNonGuildPlaced.pendingAction,
    spaceTimeNonGuildDiscard.id,
  );
  assert.equal(spaceTimeNonGuildResolved.pendingAction, undefined, "Resolving Space-time Folding should clear its pending action");
  const spaceTimeNonGuildOwner = playerById(spaceTimeNonGuildResolved, p2.id);
  assert.equal(spaceTimeNonGuildOwner.discard.at(-1).id, spaceTimeNonGuildDiscard.id, "Space-time Folding should discard the selected card");
  assert.ok(
    spaceTimeNonGuildOwner.hand.some((card) => card.id === spaceTimeDrawOne.id),
    "Space-time Folding should draw one card when the discarded card is not Spacing Guild",
  );
  assert.equal(
    spaceTimeNonGuildOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    false,
    "Space-time Folding should not draw the bonus card for non-Spacing Guild discards",
  );
  assert.match(spaceTimeNonGuildResolved.log[0], /Space-time Folding: discards .* and draws 1 card/);

  const spaceTimeGuildDiscard = { ...spaceTimeFolding, id: "space-time-guild-discard-card" };
  const spaceTimeGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spaceTimeGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spaceTimeGuildPlaced = turnActions.placeAgentAction(spaceTimeGuildFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  assert.equal(spaceTimeGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Space-time Folding should queue the same pending action for Spacing Guild discards");
  const spaceTimeGuildResolved = state.resolveDiscardCardForDrawChoice(
    spaceTimeGuildPlaced,
    spaceTimeGuildPlaced.pendingAction,
    spaceTimeGuildDiscard.id,
  );
  const spaceTimeGuildOwner = playerById(spaceTimeGuildResolved, p2.id);
  assert.ok(
    spaceTimeGuildOwner.hand.some((card) => card.id === spaceTimeDrawOne.id) &&
      spaceTimeGuildOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    "Space-time Folding should draw two cards when discarding a Spacing Guild card",
  );
  assert.match(spaceTimeGuildResolved.log[0], /Space-time Folding: discards .* and draws 2 cards/);

  const spaceTimeEmptyHandPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [spaceTimeDrawOne],
      discard: [],
      hand: [spaceTimeFolding],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: spaceTimeFolding,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(
    spaceTimeEmptyHandPlaced.pendingAction,
    undefined,
    "Space-time Folding should not queue a discard choice when no card remains in hand after placement",
  );
  const spaceTimeReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [spaceTimeFolding], highCouncilSeat: false },
    game,
  );
  assert.equal(spaceTimeReveal.persuasion, 1, "Space-time Folding should reveal for 1 persuasion through specs");

  const guildEnvoyNonGuildDiscard = { ...dagger, id: "guild-envoy-non-guild-discard-card" };
  const guildEnvoyDrawOne = { ...convincingArgument, id: "guild-envoy-draw-one-card" };
  const guildEnvoyDrawTwo = { ...convincingArgument, id: "guild-envoy-draw-two-card" };
  const guildEnvoyNonGuildPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
      discard: [],
      hand: [guildEnvoy, guildEnvoyNonGuildDiscard],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Guild Envoy should queue discard-for-draw after Agent placement");
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.drawCards, 0, "Guild Envoy should have no base draw");
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.bonusDraw?.drawCards, 2, "Guild Envoy should draw two cards only from its bonus");
  const guildEnvoyNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildEnvoyNonGuildPlaced,
    guildEnvoyNonGuildPlaced.pendingAction,
    guildEnvoyNonGuildDiscard.id,
  );
  const guildEnvoyNonGuildOwner = playerById(guildEnvoyNonGuildResolved, p2.id);
  assert.equal(guildEnvoyNonGuildOwner.discard.at(-1).id, guildEnvoyNonGuildDiscard.id, "Guild Envoy should discard the selected card");
  assert.equal(
    guildEnvoyNonGuildOwner.hand.some((card) => card.id === guildEnvoyDrawOne.id || card.id === guildEnvoyDrawTwo.id),
    false,
    "Guild Envoy should draw no cards when the discarded card is not Spacing Guild",
  );
  assert.match(guildEnvoyNonGuildResolved.log[0], /Guild Envoy: discards .* and draws no cards/);

  const guildEnvoyGuildDiscard = { ...spaceTimeFolding, id: "guild-envoy-guild-discard-card" };
  const guildEnvoyGuildPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
      discard: [],
      hand: [guildEnvoy, guildEnvoyGuildDiscard],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  const guildEnvoyGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildEnvoyGuildPlaced,
    guildEnvoyGuildPlaced.pendingAction,
    guildEnvoyGuildDiscard.id,
  );
  const guildEnvoyGuildOwner = playerById(guildEnvoyGuildResolved, p2.id);
  assert.ok(
    guildEnvoyGuildOwner.hand.some((card) => card.id === guildEnvoyDrawOne.id) &&
      guildEnvoyGuildOwner.hand.some((card) => card.id === guildEnvoyDrawTwo.id),
    "Guild Envoy should draw two cards when discarding a Spacing Guild card",
  );
  assert.match(guildEnvoyGuildResolved.log[0], /Guild Envoy: discards .* and draws 2 cards/);

  const guildEnvoyEmptyHandPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne],
      discard: [],
      hand: [guildEnvoy],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(
    guildEnvoyEmptyHandPlaced.pendingAction,
    undefined,
    "Guild Envoy should not queue a discard choice when no card remains in hand after placement",
  );
  const guildEnvoyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [guildEnvoy], highCouncilSeat: false },
    game,
  );
  assert.equal(guildEnvoyReveal.persuasion, 1, "Guild Envoy should reveal for 1 persuasion through specs");

  const guildSpyNonGuildDiscard = { ...dagger, id: "guild-spy-non-guild-discard-card", traits: [] };
  const guildSpyDrawOne = { ...convincingArgument, id: "guild-spy-draw-one-card" };
  const guildSpyDrawTwo = { ...convincingArgument, id: "guild-spy-draw-two-card" };
  const guildSpyBoardIntrigue = { ...backedByChoam, id: "guild-spy-board-intrigue-card" };
  const guildSpyBonusIntrigue = { ...buyAccess, id: "guild-spy-bonus-intrigue-card" };
  const guildSpyNonGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [guildSpyDrawOne, guildSpyDrawTwo],
    discard: [],
    hand: [guildSpy, guildSpyNonGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const guildSpyNonGuildPlaced = turnActions.placeAgentAction(
    { ...guildSpyNonGuildFixture, intrigueDeck: [guildSpyBoardIntrigue, guildSpyBonusIntrigue], intrigueDiscard: [] },
    {
      commanderTargets: {},
      selectedCard: guildSpy,
      selectedSpace: secrets,
    },
  );
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Guild Spy should queue discard-for-draw after Agent placement");
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.drawCards, 1, "Guild Spy should draw one card before its trait bonus");
  assert.equal(
    guildSpyNonGuildPlaced.pendingAction?.bonusIntrigues?.requiredDiscardTrait,
    "Faction: Spacing Guild",
    "Guild Spy should preserve its Spacing Guild bonus Intrigue trait",
  );
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.bonusIntrigues?.amount, 1, "Guild Spy should draw one bonus Intrigue");
  const guildSpyNonGuildIntriguesBefore = playerById(guildSpyNonGuildPlaced, p2.id).intrigues.length;
  const guildSpyNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildSpyNonGuildPlaced,
    guildSpyNonGuildPlaced.pendingAction,
    guildSpyNonGuildDiscard.id,
  );
  const guildSpyNonGuildOwner = playerById(guildSpyNonGuildResolved, p2.id);
  assert.equal(guildSpyNonGuildOwner.discard.at(-1).id, guildSpyNonGuildDiscard.id, "Guild Spy should discard the selected non-Guild card");
  assert.ok(
    guildSpyNonGuildOwner.hand.some((card) => card.id === guildSpyDrawOne.id),
    "Guild Spy should draw one card when the discarded card is not Spacing Guild",
  );
  assert.equal(
    guildSpyNonGuildOwner.hand.some((card) => card.id === guildSpyDrawTwo.id),
    false,
    "Guild Spy should not draw an extra card from its Intrigue bonus",
  );
  assert.equal(
    guildSpyNonGuildOwner.intrigues.length,
    guildSpyNonGuildIntriguesBefore,
    "Guild Spy should not add an Intrigue when the discarded card is not Spacing Guild",
  );
  assert.equal(
    guildSpyNonGuildOwner.intrigues.some((card) => card.id === guildSpyBonusIntrigue.id),
    false,
    "Guild Spy should not draw its bonus Intrigue when the discarded card is not Spacing Guild",
  );
  assert.match(guildSpyNonGuildResolved.log[0], /Guild Spy: discards .* and draws 1 card/);

  const guildSpyGuildDiscard = { ...spaceTimeFolding, id: "guild-spy-guild-discard-card" };
  const guildSpyGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [guildSpyDrawOne, guildSpyDrawTwo],
    discard: [],
    hand: [guildSpy, guildSpyGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const guildSpyGuildPlaced = turnActions.placeAgentAction(
    { ...guildSpyGuildFixture, intrigueDeck: [guildSpyBoardIntrigue, guildSpyBonusIntrigue], intrigueDiscard: [] },
    {
      commanderTargets: {},
      selectedCard: guildSpy,
      selectedSpace: secrets,
    },
  );
  const guildSpyGuildIntriguesBefore = playerById(guildSpyGuildPlaced, p2.id).intrigues.length;
  const guildSpyGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildSpyGuildPlaced,
    guildSpyGuildPlaced.pendingAction,
    guildSpyGuildDiscard.id,
  );
  const guildSpyGuildOwner = playerById(guildSpyGuildResolved, p2.id);
  assert.ok(
    guildSpyGuildOwner.hand.some((card) => card.id === guildSpyDrawOne.id),
    "Guild Spy should draw its base card after discarding a Spacing Guild card",
  );
  assert.equal(
    guildSpyGuildOwner.hand.some((card) => card.id === guildSpyDrawTwo.id),
    false,
    "Guild Spy should not convert its Intrigue bonus into an extra card draw",
  );
  assert.ok(
    guildSpyGuildOwner.intrigues.some((card) => card.id === guildSpyBonusIntrigue.id),
    "Guild Spy should draw one Intrigue after discarding a Spacing Guild card",
  );
  assert.equal(guildSpyGuildOwner.intrigues.length, guildSpyGuildIntriguesBefore + 1);
  assert.match(guildSpyGuildResolved.log[0], /Guild Spy: discards .* and draws 1 card/);
  assert.match(guildSpyGuildResolved.log[1], /draws an Intrigue card from Guild Spy/);
  assert.equal(guildSpyGuildResolved.intrigueDeck.some((card) => card.id === guildSpyBonusIntrigue.id), false);

  const branchingPathTrashIntrigue = { ...backedByChoam, id: "branching-path-trash-intrigue-card" };
  const branchingPathBoardIntrigue = { ...intelligenceReport, id: "branching-path-board-intrigue-card" };
  const branchingPathRewardIntrigue = { ...buyAccess, id: "branching-path-reward-intrigue-card" };
  const branchingPathFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [branchingPath],
    intrigueDeck: [],
    intrigues: [branchingPathTrashIntrigue],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const branchingPathPlaced = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(branchingPathPlaced.pendingAction?.kind, "trash-intrigue-for-reward", "Branching Path should queue Intrigue trash with the Bene Gesserit Alliance");
  assert.equal(branchingPathPlaced.pendingAction?.drawIntrigues, 1, "Branching Path should draw one replacement Intrigue");
  assert.deepEqual(branchingPathPlaced.pendingAction?.gain, { spice: 2 }, "Branching Path should carry its 2-spice reward");
  assert.equal(branchingPathPlaced.pendingAction?.optional, true, "Branching Path Intrigue trash should be optional");
  const branchingPathResolved = state.resolveTrashIntrigueForRewardChoice(
    branchingPathPlaced,
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathOwner = playerById(branchingPathResolved, p2.id);
  assert.equal(
    branchingPathOwner.intrigues.some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should remove the trashed Intrigue from hand",
  );
  assert.ok(
    branchingPathOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw one Intrigue after trashing",
  );
  assert.equal(
    branchingPathResolved.intrigueDiscard.some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should remove the trashed Intrigue from the Intrigue draw cycle",
  );
  assert.equal(branchingPathOwner.resources.spice, 2, "Branching Path should gain 2 spice");
  assert.equal(
    branchingPathResolved.turnSpiceGains[p2.id],
    2,
    "Branching Path spice should count as turn spice gain",
  );
  assert.equal(branchingPathResolved.pendingAction, undefined, "Resolving Branching Path should clear its pending action");
  assert.match(branchingPathResolved.log[0], /Branching Path: trashes .* to draw 1 Intrigue card and gains 2 spice/);
  assert.match(branchingPathResolved.log[1], /draws an Intrigue card from Branching Path/);
  const branchingPathSkipped = state.skipTrashIntrigueForReward(branchingPathPlaced, branchingPathPlaced.pendingAction);
  const branchingPathSkippedOwner = playerById(branchingPathSkipped, p2.id);
  assert.ok(
    branchingPathSkippedOwner.intrigues.some((card) => card.id === branchingPathTrashIntrigue.id),
    "Skipping Branching Path should keep the selected Intrigue",
  );
  assert.ok(
    branchingPathSkippedOwner.intrigues.some((card) => card.id === branchingPathBoardIntrigue.id),
    "Skipping Branching Path should keep the Intrigue drawn from the board space",
  );
  assert.equal(branchingPathSkippedOwner.resources.spice, 0, "Skipping Branching Path should not gain spice");
  assert.equal(branchingPathSkipped.pendingAction, undefined, "Skipping Branching Path should clear its pending action");
  assert.match(branchingPathSkipped.log[0], /declines to trash an Intrigue for Branching Path/);
  const branchingPathDiscardDrawResolved = state.resolveTrashIntrigueForRewardChoice(
    {
      ...branchingPathPlaced,
      intrigueDeck: [],
      intrigueDiscard: [branchingPathRewardIntrigue],
    },
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathDiscardDrawOwner = playerById(branchingPathDiscardDrawResolved, p2.id);
  assert.ok(
    branchingPathDiscardDrawOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw its replacement Intrigue from the discard pile if the deck is empty",
  );
  assert.equal(
    [
      ...branchingPathDiscardDrawResolved.intrigueDeck,
      ...branchingPathDiscardDrawResolved.intrigueDiscard,
      ...branchingPathDiscardDrawOwner.intrigues,
    ].some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should not recycle the trashed Intrigue through the deck, discard, or owner hand",
  );
  const branchingPathNoReplacementResolved = state.resolveTrashIntrigueForRewardChoice(
    {
      ...branchingPathPlaced,
      intrigueDeck: [],
      intrigueDiscard: [],
    },
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathNoReplacementOwner = playerById(branchingPathNoReplacementResolved, p2.id);
  assert.equal(branchingPathNoReplacementOwner.resources.spice, 2, "Branching Path should still gain spice without a replacement Intrigue");
  assert.equal(
    branchingPathNoReplacementOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    false,
    "Branching Path should not draw a missing replacement Intrigue",
  );
  assert.match(
    branchingPathNoReplacementResolved.log[0],
    /Branching Path: trashes .* but draws no Intrigue cards and gains 2 spice/,
    "Branching Path should log actual replacement Intrigue draws",
  );

  const branchingPathNoAlliance = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: {},
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathNoAlliance.pendingAction,
    undefined,
    "Branching Path should not queue its Intrigue-trash reward without the Bene Gesserit Alliance",
  );
  const branchingPathBoardIntrigueOnly = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
      players: branchingPathFixture.players.map((player) =>
        player.id === p2.id ? { ...player, intrigues: [] } : player
      ),
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathBoardIntrigueOnly.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Branching Path should queue when the selected board space draws an Intrigue to trash",
  );
  const branchingPathBoardIntrigueOwner = playerById(branchingPathBoardIntrigueOnly, p2.id);
  assert.ok(
    branchingPathBoardIntrigueOwner.intrigues.some((card) => card.id === branchingPathBoardIntrigue.id),
    "Branching Path should let the player choose the Intrigue drawn from Secrets",
  );
  const branchingPathBoardIntrigueResolved = state.resolveTrashIntrigueForRewardChoice(
    branchingPathBoardIntrigueOnly,
    branchingPathBoardIntrigueOnly.pendingAction,
    branchingPathBoardIntrigue.id,
  );
  const branchingPathBoardIntrigueResolvedOwner = playerById(branchingPathBoardIntrigueResolved, p2.id);
  assert.ok(
    branchingPathBoardIntrigueResolvedOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw a replacement after trashing the same-space Intrigue",
  );
  assert.equal(
    [
      ...branchingPathBoardIntrigueResolved.intrigueDeck,
      ...branchingPathBoardIntrigueResolved.intrigueDiscard,
      ...branchingPathBoardIntrigueResolvedOwner.intrigues,
    ].some((card) => card.id === branchingPathBoardIntrigue.id),
    false,
    "Branching Path should remove the same-space Intrigue from the draw cycle when it is trashed",
  );
  const branchingPathEmptyIntrigueSupply = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [],
      intrigueDiscard: [],
      players: branchingPathFixture.players.map((player) => ({ ...player, intrigues: [] })),
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathEmptyIntrigueSupply.pendingAction,
    undefined,
    "Branching Path should not queue when no starting or drawable same-space Intrigue exists",
  );
  const branchingPathNoIntrigueSource = {
    ...p2,
    hand: [],
    playArea: [branchingPath],
    intrigues: [],
  };
  const branchingPathNoIntriguePendings = state.pendingActionsForCard(
    branchingPath,
    branchingPathNoIntrigueSource,
    {
      ...game,
      alliances: { bene: p2.id },
      players: game.players.map((player) => player.id === p2.id ? branchingPathNoIntrigueSource : player),
    },
    p2,
    arrakeen,
  );
  assert.equal(
    branchingPathNoIntriguePendings.some((pending) => pending.kind === "trash-intrigue-for-reward"),
    false,
    "Branching Path should not queue without a starting or same-space Intrigue to trash",
  );

  const junctionTrashIntrigue = { ...backedByChoam, id: "junction-trash-intrigue-card" };
  const junctionFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [junctionHeadquarters],
    intrigues: [junctionTrashIntrigue],
    playArea: [],
    resources: { solari: 0, spice: 1, water: 0 },
    vp: 0,
  }));
  const junctionPlaced = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: { spacing: p2.id },
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionPlaced.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction Headquarters should queue Intrigue trash with the Spacing Guild Alliance and enough post-space spice",
  );
  assert.deepEqual(junctionPlaced.pendingAction?.cost, { spice: 2 }, "Junction Headquarters should carry its 2-spice cost");
  assert.equal(junctionPlaced.pendingAction?.drawIntrigues, 0, "Junction Headquarters should not draw a replacement Intrigue");
  assert.deepEqual(junctionPlaced.pendingAction?.gain, {}, "Junction Headquarters should not carry resource rewards");
  assert.equal(junctionPlaced.pendingAction?.gainVp, 1, "Junction Headquarters should carry its VP reward");
  assert.equal(junctionPlaced.pendingAction?.optional, true, "Junction Headquarters Intrigue trash should be optional");
  const junctionResolved = state.resolveTrashIntrigueForRewardChoice(
    junctionPlaced,
    junctionPlaced.pendingAction,
    junctionTrashIntrigue.id,
  );
  const junctionOwner = playerById(junctionResolved, p2.id);
  assert.equal(
    junctionOwner.intrigues.some((card) => card.id === junctionTrashIntrigue.id),
    false,
    "Junction Headquarters should remove the trashed Intrigue from hand",
  );
  assert.equal(junctionOwner.resources.spice, 0, "Junction Headquarters should spend the post-space 2 spice");
  assert.equal(junctionOwner.vp, 1, "Junction Headquarters should gain 1 VP");
  assert.equal(junctionResolved.turnSpiceGains[p2.id], 1, "Junction Headquarters should not erase the Imperial Basin spice gain");
  assert.equal(junctionResolved.pendingAction, undefined, "Resolving Junction Headquarters should clear its pending action");
  assert.match(junctionResolved.log[0], /Junction Headquarters: trashes .* and spends 2 spice and gains 1 VP/);
  const junctionNoAlliance = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionNoAlliance.pendingAction,
    undefined,
    "Junction Headquarters should not queue without the Spacing Guild Alliance",
  );
  const junctionNotEnoughSpice = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: { spacing: p2.id },
      players: junctionFixture.players.map((player) =>
        player.id === p2.id ? { ...player, resources: { solari: 0, spice: 0, water: 0 } } : player
      ),
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionNotEnoughSpice.pendingAction,
    undefined,
    "Junction Headquarters should not queue when the owner cannot pay 2 spice after space rewards",
  );
  const junctionDeferredMakerTrashIntrigue = { ...backedByChoam, id: "junction-deferred-maker-trash-intrigue-card" };
  const junctionDeferredMakerFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [junctionHeadquarters],
    intrigues: [junctionDeferredMakerTrashIntrigue],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 1, water: 1 },
    vp: 0,
  }));
  const junctionDeferredMakerPlaced = turnActions.placeAgentAction(
    {
      ...junctionDeferredMakerFixture,
      alliances: { spacing: p3.id },
      conflict: smugglersHavenConflict,
      shieldWall: false,
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: haggaBasin,
    },
  );
  assert.equal(
    junctionDeferredMakerPlaced.pendingAction?.kind,
    "maker-choice",
    "Junction Headquarters should queue Hagga Basin Maker choice before the costed Intrigue trash choice",
  );
  assert.equal(
    junctionDeferredMakerPlaced.pendingQueue[0]?.kind,
    "trash-intrigue-for-reward",
    "Junction Headquarters should count deferred Maker spice when checking its costed Intrigue trash payability",
  );
  assert.deepEqual(
    junctionDeferredMakerPlaced.pendingQueue[0]?.cost,
    { spice: 2 },
    "Junction deferred Maker pending should keep the printed 2-spice Junction cost",
  );
  const junctionDeferredMakerSpiceChosen = state.resolveMakerChoice(
    junctionDeferredMakerPlaced,
    junctionDeferredMakerPlaced.pendingAction,
    "spice",
  );
  assert.equal(
    junctionDeferredMakerSpiceChosen.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction deferred Maker choice should advance to the Intrigue trash pending after taking spice",
  );
  const junctionDeferredMakerResolved = state.resolveTrashIntrigueForRewardChoice(
    junctionDeferredMakerSpiceChosen,
    junctionDeferredMakerSpiceChosen.pendingAction,
    junctionDeferredMakerTrashIntrigue.id,
  );
  const junctionDeferredMakerOwner = playerById(junctionDeferredMakerResolved, p3.id);
  assert.equal(
    junctionDeferredMakerOwner.resources.spice,
    1,
    "Junction deferred Maker resolution should gain 2 Hagga spice and spend 2 Junction spice",
  );
  assert.equal(junctionDeferredMakerOwner.vp, 1, "Junction deferred Maker resolution should gain 1 VP");
  const junctionDeferredMakerSandwormChosen = state.resolveMakerChoice(
    junctionDeferredMakerPlaced,
    junctionDeferredMakerPlaced.pendingAction,
    "sandworms",
  );
  assert.equal(
    junctionDeferredMakerSandwormChosen.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction deferred Maker sandworm choice should still advance to the optional Intrigue trash pending",
  );
  assert.equal(
    state.canPayTrashIntrigueForReward(
      playerById(junctionDeferredMakerSandwormChosen, p3.id),
      junctionDeferredMakerSandwormChosen.pendingAction,
    ),
    false,
    "Junction deferred Maker sandworm choice should leave the costed Intrigue trash pending unpayable",
  );
  const junctionDeferredMakerUnpayableAttempt = state.resolveTrashIntrigueForRewardChoice(
    junctionDeferredMakerSandwormChosen,
    junctionDeferredMakerSandwormChosen.pendingAction,
    junctionDeferredMakerTrashIntrigue.id,
  );
  assert.strictEqual(
    junctionDeferredMakerUnpayableAttempt,
    junctionDeferredMakerSandwormChosen,
    "Resolving an unpayable Junction pending should not mutate game state",
  );
  const junctionDeferredMakerSkipped = state.skipTrashIntrigueForReward(
    junctionDeferredMakerSandwormChosen,
    junctionDeferredMakerSandwormChosen.pendingAction,
  );
  assert.equal(
    junctionDeferredMakerSkipped.pendingAction,
    undefined,
    "Skipping the unpayable optional Junction pending should advance the queue",
  );
  const junctionRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    garrison: 0,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionRevealPlan = turnActions.revealTurnPlan(playerById(junctionRevealFixture, p2.id), junctionRevealFixture);
  assert.equal(junctionRevealPlan.persuasion, 1, "Junction Headquarters should reveal for 1 persuasion");
  assert.equal(junctionRevealPlan.revealGain.water, 1, "Junction Headquarters should reveal for 1 water");
  assert.equal(junctionRevealPlan.recruitedTroops, 1, "Junction Headquarters should reveal for 1 recruited troop");
  const junctionRevealed = turnActions.revealTurnAction(junctionRevealFixture, {
    commanderTargets: {},
    revealPlan: junctionRevealPlan,
  });
  const junctionRevealOwner = playerById(junctionRevealed, p2.id);
  assert.equal(junctionRevealOwner.resources.water, 1, "Junction reveal should add its water");
  assert.equal(junctionRevealOwner.garrison, 1, "Junction reveal should recruit its troop");
  assert.equal(junctionRevealOwner.persuasion, 1, "Junction reveal should finalize its persuasion");
  assert.match(junctionRevealed.log[0], /reveals for 1 persuasion, 0 strength and gains 1 water and recruits 1 troop/);
  const junctionNoSupplyRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    deployedTroops: 0,
    garrison: 12,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    jessicaMemories: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionNoSupplyRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionNoSupplyRevealFixture, p2.id),
    junctionNoSupplyRevealFixture,
  );
  assert.equal(
    junctionNoSupplyRevealPlan.recruitedTroops,
    1,
    "Junction Headquarters reveal plan should still expose its printed troop reward when supply is empty",
  );
  const junctionNoSupplyRevealed = turnActions.revealTurnAction(junctionNoSupplyRevealFixture, {
    commanderTargets: {},
    revealPlan: junctionNoSupplyRevealPlan,
  });
  assert.equal(
    playerById(junctionNoSupplyRevealed, p2.id).garrison,
    12,
    "Junction reveal should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    playerById(junctionNoSupplyRevealed, p2.id).resources.water,
    1,
    "Junction no-supply reveal should still add its water",
  );
  assert.equal(
    junctionNoSupplyRevealed.log[0].includes("recruits 1 troop"),
    false,
    "Junction no-supply reveal should not log an unplaced troop",
  );
  const junctionCommanderBaseRevealFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    garrison: 0,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionCommanderRevealFixture = {
    ...junctionCommanderBaseRevealFixture,
    players: junctionCommanderBaseRevealFixture.players.map((player) =>
      player.id === p6.id ? { ...player, garrison: 0 } : player
    ),
  };
  const junctionCommanderRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionCommanderRevealFixture, p4.id),
    junctionCommanderRevealFixture,
  );
  const junctionCommanderRevealed = turnActions.revealTurnAction(junctionCommanderRevealFixture, {
    commanderTargets: { [p4.id]: p6.id },
    revealPlan: junctionCommanderRevealPlan,
  });
  assert.equal(
    playerById(junctionCommanderRevealed, p4.id).garrison,
    0,
    "Commander Junction reveal should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(junctionCommanderRevealed, p6.id).garrison,
    1,
    "Commander Junction reveal should recruit troops to the activated Ally",
  );
  assert.equal(
    playerById(junctionCommanderRevealed, p4.id).resources.water,
    1,
    "Commander Junction reveal should keep water on the Commander",
  );
  assert.ok(
    junctionCommanderRevealed.log[0].includes(`${p6.leader} recruits 1 troop`),
    "Commander Junction reveal log should name the activated Ally as the troop recipient",
  );
  const junctionCommanderNoSupplyRevealFixture = {
    ...junctionCommanderBaseRevealFixture,
    players: junctionCommanderBaseRevealFixture.players.map((player) =>
      player.id === p6.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player
    ),
  };
  const junctionCommanderNoSupplyRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionCommanderNoSupplyRevealFixture, p4.id),
    junctionCommanderNoSupplyRevealFixture,
  );
  assert.equal(
    junctionCommanderNoSupplyRevealPlan.recruitedTroops,
    1,
    "Commander Junction reveal plan should still expose its activated-Ally troop reward when supply is empty",
  );
  const junctionCommanderNoSupplyRevealed = turnActions.revealTurnAction(junctionCommanderNoSupplyRevealFixture, {
    commanderTargets: { [p4.id]: p6.id },
    revealPlan: junctionCommanderNoSupplyRevealPlan,
  });
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p4.id).garrison,
    0,
    "Commander Junction no-supply reveal should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p6.id).garrison,
    12,
    "Commander Junction no-supply reveal should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p4.id).resources.water,
    1,
    "Commander Junction no-supply reveal should keep water on the Commander",
  );
  assert.equal(
    junctionCommanderNoSupplyRevealed.log[0].includes(`${p6.leader} recruits 1 troop`),
    false,
    "Commander Junction no-supply reveal should not log an unplaced activated-Ally troop",
  );

  const spacingGuildFavorDraw = { ...convincingArgument, id: "spacing-guild-favor-agent-draw-card" };
  const spacingGuildFavorAgentEffect = state.applyCardAgentEffect(
    spacingGuildFavor,
    {
      ...p2,
      deck: [spacingGuildFavorDraw],
      hand: [],
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
    game,
  );
  assert.equal(
    spacingGuildFavorAgentEffect.source.hand[0]?.id,
    spacingGuildFavorDraw.id,
    "Spacing Guild's Favor Agent spec should draw 1 card",
  );
  assert.equal(
    spacingGuildFavorAgentEffect.source.resources.spice,
    0,
    "Spacing Guild's Favor Agent play should not trigger its discard spice",
  );

  const spacingGuildFavorDiscardCard = { ...spacingGuildFavor, id: "space-time-spacing-guild-favor-discard-card" };
  const spacingGuildFavorDiscardFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spacingGuildFavorDiscardCard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spacingGuildFavorDiscardPlaced = turnActions.placeAgentAction(spacingGuildFavorDiscardFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  const spacingGuildFavorDiscardForDrawResolved = state.resolveDiscardCardForDrawChoice(
    spacingGuildFavorDiscardPlaced,
    spacingGuildFavorDiscardPlaced.pendingAction,
    spacingGuildFavorDiscardCard.id,
  );
  const spacingGuildFavorDiscardOwner = playerById(spacingGuildFavorDiscardForDrawResolved, p2.id);
  assert.equal(
    spacingGuildFavorDiscardOwner.resources.spice,
    2,
    "Spacing Guild's Favor should gain 2 spice when discarded for another card effect",
  );
  assert.equal(
    spacingGuildFavorDiscardForDrawResolved.turnSpiceGains[p2.id],
    2,
    "Spacing Guild's Favor discard spice should count as spice gained this turn",
  );
  assert.ok(
    spacingGuildFavorDiscardOwner.hand.some((card) => card.id === spaceTimeDrawOne.id) &&
      spacingGuildFavorDiscardOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    "Spacing Guild's Favor should still count as a Spacing Guild discard for Space-time Folding's bonus draw",
  );
  assert.match(spacingGuildFavorDiscardForDrawResolved.log[0], /Space-time Folding: discards Spacing Guild's Favor/);
  assert.match(spacingGuildFavorDiscardForDrawResolved.log[1], /Spacing Guild's Favor: gains 2 spice/);

  const forcedSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "forced-spacing-guild-favor-discard-card" };
  const forcedDiscardPending = {
    kind: "discard-hand-card",
    ownerId: p5.id,
    source: "Verifier forced discard",
    remaining: 1,
  };
  const forcedDiscardFixture = {
    ...game,
    pendingAction: forcedDiscardPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p5.id
        ? {
            ...player,
            discard: [],
            hand: [forcedSpacingGuildFavorDiscard],
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const forcedDiscardResolved = state.resolveDiscardHandCardChoice(
    forcedDiscardFixture,
    forcedDiscardPending,
    forcedSpacingGuildFavorDiscard.id,
  );
  assert.equal(
    playerById(forcedDiscardResolved, p5.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded by a hand-discard pending action",
  );

  const influenceSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "influence-spacing-guild-favor-discard-card" };
  const influenceDiscardPending = {
    kind: "discard-card-for-influence-and-draw",
    ownerId: p2.id,
    influenceOwnerId: p2.id,
    source: "Verifier influence discard",
    drawCards: 1,
    influenceAmount: 1,
    optional: true,
  };
  const influenceDiscardDrawCard = { ...convincingArgument, id: "influence-spacing-guild-favor-draw-card" };
  const influenceDiscardFixture = {
    ...game,
    pendingAction: influenceDiscardPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [influenceDiscardDrawCard],
            discard: [],
            hand: [influenceSpacingGuildFavorDiscard],
            influence: { ...player.influence, bene: 1 },
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const influenceDiscardResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    influenceDiscardFixture,
    influenceDiscardPending,
    influenceSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(influenceDiscardResolved, p2.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded for Influence and card draw",
  );
  assert.equal(
    playerById(influenceDiscardResolved, p2.id).hand[0]?.id,
    influenceDiscardDrawCard.id,
    "Discard-trigger resource gain should compose with the original card draw",
  );

  const margotInfluenceSpacingGuildFavorDiscard = {
    ...spacingGuildFavor,
    id: "margot-influence-spacing-guild-favor-discard-card",
  };
  const margotInfluenceDiscardPending = {
    kind: "discard-card-for-influence-and-draw",
    ownerId: p2.id,
    influenceOwnerId: p2.id,
    source: "Verifier Margot influence discard",
    drawCards: 1,
    influenceAmount: 1,
    optional: true,
  };
  const margotInfluenceDrawCard = { ...convincingArgument, id: "margot-influence-spacing-guild-favor-draw-card" };
  const margotInfluenceFixture = {
    ...game,
    pendingAction: margotInfluenceDiscardPending,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            leader: "Lady Margot Fenring",
            deck: [margotInfluenceDrawCard],
            discard: [],
            hand: [margotInfluenceSpacingGuildFavorDiscard],
            influence: { ...player.influence, bene: 1 },
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const margotInfluenceResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    margotInfluenceFixture,
    margotInfluenceDiscardPending,
    margotInfluenceSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(margotInfluenceResolved, p2.id).resources.spice,
    4,
    "Discard-for-Influence should compose Spacing Guild's Favor spice with Margot Loyalty spice",
  );
  assert.equal(
    margotInfluenceResolved.turnSpiceGains[p2.id],
    4,
    "Discard-for-Influence trigger and Margot Loyalty spice should both count as turn spice gains",
  );
  assert.match(
    margotInfluenceResolved.log[0],
    /Verifier Margot influence discard: discards Spacing Guild's Favor/,
    "Discard-for-Influence action should remain the primary log entry",
  );
  assert.match(
    margotInfluenceResolved.log[1],
    /Loyalty/,
    "Influence threshold rewards should stay attached to the triggering action log",
  );
  assert.match(
    margotInfluenceResolved.log[2],
    /Spacing Guild's Favor: gains 2 spice/,
    "Discard trigger logs should remain secondary to the discard action and threshold reward",
  );

  const sietchSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "sietch-spacing-guild-favor-discard-card" };
  const sietchDiscardFixture = withActivePlayer(game, p2.id, (player) => ({
    discard: [],
    hand: [sietchSpacingGuildFavorDiscard],
    influence: { ...player.influence, bene: 1 },
    intrigues: [sietchRitual],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const sietchDiscardResolved = state.playSietchRitualPlotIntrigue(
    sietchDiscardFixture,
    p2.id,
    sietchRitual.id,
    sietchSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(sietchDiscardResolved, p2.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded by typed Plot discard effects",
  );
  assert.equal(
    sietchDiscardResolved.turnSpiceGains[p2.id],
    2,
    "Typed Plot discards should record Spacing Guild's Favor spice as gained this turn",
  );

  const cleanupSpacingGuildFavor = { ...spacingGuildFavor, id: "cleanup-spacing-guild-favor-card" };
  const cleanupDrawCards = Array.from({ length: 5 }, (_, index) => ({
    ...convincingArgument,
    id: `cleanup-spacing-guild-favor-draw-card-${index}`,
  }));
  const cleanupState = state.startNextRound({
    ...game,
    conflict: undefined,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: cleanupDrawCards,
            discard: [],
            hand: [cleanupSpacingGuildFavor],
            playArea: [],
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  });
  const cleanupOwner = playerById(cleanupState, p2.id);
  assert.equal(
    cleanupOwner.resources.spice,
    0,
    "Spacing Guild's Favor should not trigger when moved to discard during round cleanup",
  );
  assert.equal(
    cleanupOwner.hand.some((card) => card.id === cleanupSpacingGuildFavor.id),
    false,
    "Round cleanup should remove Spacing Guild's Favor from hand",
  );
  assert.ok(
    cleanupOwner.discard.some((card) => card.id === cleanupSpacingGuildFavor.id),
    "Round cleanup should move Spacing Guild's Favor to discard without triggering it",
  );
  const calculusAgentHandTrash = {
    ...dagger,
    id: "calculus-agent-hand-trash-card",
    name: "Calculus Agent Hand Trash",
  };
  const calculusAgentPlayTrash = {
    ...convincingArgument,
    id: "calculus-agent-play-trash-card",
    name: "Calculus Agent Play Trash",
  };
  const calculusAgentDiscardTrash = {
    ...convincingArgument,
    id: "calculus-agent-discard-trash-card",
    name: "Calculus Agent Discard Trash",
  };
  const calculusAgentSpace = {
    id: "calculus-agent-test-space",
    name: "Calculus Agent Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const calculusAgentPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [calculusAgentDiscardTrash],
      hand: [calculus, calculusAgentHandTrash],
      playArea: [calculusAgentPlayTrash],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: calculus,
      selectedSpace: calculusAgentSpace,
    },
  );
  assert.equal(
    calculusAgentPlaced.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should queue a typed Agent selected-card trash pending action",
  );
  assert.equal(calculusAgentPlaced.pendingAction.source, "Calculus of Power");
  assert.equal(calculusAgentPlaced.pendingAction.optional, true);
  assert.equal(calculusAgentPlaced.pendingAction.zones, undefined, "Calculus Agent trash should use all standard trash zones");
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusAgentPlaced, p2.id), calculusAgentPlaced.pendingAction)
      .map(({ zone, card }) => `${zone}:${card.id}`),
    [
      `hand:${calculusAgentHandTrash.id}`,
      `discard:${calculusAgentDiscardTrash.id}`,
      `playArea:${calculusAgentPlayTrash.id}`,
      `playArea:${calculus.id}`,
    ],
    "Calculus Agent trash should offer hand, discard, in-play, and source-card choices",
  );
  const calculusAgentTrashed = state.trashPlayerCard(
    calculusAgentPlaced,
    calculusAgentPlaced.pendingAction,
    "hand",
    calculusAgentHandTrash.id,
  );
  const calculusAgentOwner = playerById(calculusAgentTrashed, p2.id);
  assert.equal(
    calculusAgentOwner.hand.some((card) => card.id === calculusAgentHandTrash.id),
    false,
    "Resolving Calculus Agent trash should remove the selected hand card",
  );
  assert.equal(
    calculusAgentOwner.playArea.some((card) => card.id === calculus.id),
    true,
    "Resolving Calculus Agent trash should leave Calculus in play when another card was trashed",
  );
  assert.equal(calculusAgentTrashed.pendingAction, undefined);
  assert.match(calculusAgentTrashed.log[0], /trashes Calculus Agent Hand Trash from Calculus of Power/);
  const desertSurvivalOtherPlayCard = { ...dagger, id: "desert-survival-other-play-card" };
  const desertSurvivalFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [desertSurvival],
    playArea: [desertSurvivalOtherPlayCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  assert.equal(
    state.pendingActionForCard(desertSurvival, playerById(desertSurvivalFixture, p2.id), desertSurvivalFixture),
    undefined,
    "Desert Survival should only queue its source-trash choice from play",
  );
  const desertSurvivalPlaced = turnActions.placeAgentAction(desertSurvivalFixture, {
    commanderTargets: {},
    selectedCard: desertSurvival,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    desertSurvivalPlaced.pendingAction?.kind,
    "trash-card",
    "Desert Survival should queue a typed optional trash-card pending action",
  );
  assert.equal(desertSurvivalPlaced.pendingAction.source, "Desert Survival");
  assert.equal(desertSurvivalPlaced.pendingAction.optional, true);
  assert.deepEqual(desertSurvivalPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredCardId, desertSurvival.id);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(desertSurvivalPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(desertSurvivalPlaced, p2.id), desertSurvivalPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: desertSurvival.id }],
    "Desert Survival source-trash choices should exclude other cards in play",
  );
  const desertSurvivalOtherTrashAttempt = state.trashPlayerCard(
    desertSurvivalPlaced,
    desertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvivalOtherPlayCard.id,
  );
  assert.equal(
    playerById(desertSurvivalOtherTrashAttempt, p2.id).playArea.some((card) => card.id === desertSurvivalOtherPlayCard.id),
    true,
    "Desert Survival source-trash pending should reject non-source cards in play",
  );
  assert.equal(
    desertSurvivalOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Desert Survival trash attempts should leave the pending action unresolved",
  );
  const desertSurvivalTrashed = state.trashPlayerCard(
    desertSurvivalPlaced,
    desertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvival.id,
  );
  assert.equal(
    playerById(desertSurvivalTrashed, p2.id).playArea.some((card) => card.id === desertSurvival.id),
    false,
    "Resolving Desert Survival trash should remove the source card from play",
  );
  assert.equal(
    playerById(desertSurvivalTrashed, p2.id).playArea.some((card) => card.id === desertSurvivalOtherPlayCard.id),
    true,
    "Resolving Desert Survival trash should leave other cards in play",
  );
  assert.equal(desertSurvivalTrashed.pendingAction, undefined);
  assert.match(desertSurvivalTrashed.log[0], /trashes Desert Survival from Desert Survival/);
  const desertSurvivalSkipped = state.skipTrashCard(desertSurvivalPlaced, desertSurvivalPlaced.pendingAction);
  assert.equal(
    playerById(desertSurvivalSkipped, p2.id).playArea.some((card) => card.id === desertSurvival.id),
    true,
    "Skipping Desert Survival trash should leave the source card in play",
  );
  assert.equal(desertSurvivalSkipped.pendingAction, undefined);
  assert.match(desertSurvivalSkipped.log[0], /declines to trash a card from Desert Survival/);
  const duplicateDesertSurvivalInPlay = {
    ...desertSurvival,
    name: "Desert Survival Duplicate",
    agentPlacementSpaceId: "shipping",
    agentPlacementTargetOwnerId: p2.id,
  };
  const duplicateDesertSurvivalFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [desertSurvival],
    playArea: [duplicateDesertSurvivalInPlay],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const duplicateDesertSurvivalPlaced = turnActions.placeAgentAction(duplicateDesertSurvivalFixture, {
    commanderTargets: {},
    selectedCard: desertSurvival,
    selectedSpace: imperialBasin,
  });
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction?.kind, "trash-card");
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction.requiredCardId, desertSurvival.id);
  assert.equal(duplicateDesertSurvivalPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.deepEqual(
    state.trashableCardsForPending(
      playerById(duplicateDesertSurvivalPlaced, p2.id),
      duplicateDesertSurvivalPlaced.pendingAction,
    ).map(({ card }) => card.agentPlacementSpaceId),
    [imperialBasin.id],
    "Desert Survival source trash should distinguish duplicate IDs by placement metadata",
  );
  const duplicateDesertSurvivalTrashed = state.trashPlayerCard(
    duplicateDesertSurvivalPlaced,
    duplicateDesertSurvivalPlaced.pendingAction,
    "playArea",
    desertSurvival.id,
  );
  const remainingDuplicateDesertSurvivals = playerById(duplicateDesertSurvivalTrashed, p2.id).playArea.filter(
    (card) => card.id === desertSurvival.id,
  );
  assert.equal(
    remainingDuplicateDesertSurvivals.length,
    1,
    "Source trash should remove only one matching source-card instance",
  );
  assert.equal(
    remainingDuplicateDesertSurvivals[0]?.agentPlacementSpaceId,
    "shipping",
    "Source trash should leave a same-id non-source card in play",
  );
  const treadDrawCard = { ...dagger, id: "tread-in-darkness-draw-card", name: "Tread in Darkness Draw Probe" };
  const treadExtraDeckCard = {
    ...convincingArgument,
    id: "tread-in-darkness-extra-deck-card",
    name: "Tread in Darkness Extra Deck Probe",
  };
  const treadOtherBeneCard = {
    ...hiddenMissive,
    id: "tread-in-darkness-other-bene-card",
    name: "Tread in Darkness Other Bene",
  };
  const treadFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [treadDrawCard, treadExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [treadOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadPlaced = turnActions.placeAgentAction(treadFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadPlaced.pendingAction?.kind,
    "trash-card",
    "Tread in Darkness should queue a source-trash pending action when another Bene Gesserit card is in play",
  );
  assert.equal(treadPlaced.pendingAction.source, "Tread in Darkness");
  assert.equal(treadPlaced.pendingAction.optional, true);
  assert.equal(treadPlaced.pendingAction.drawCardsReward, 1);
  assert.deepEqual(treadPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(treadPlaced.pendingAction.requiredCardId, treadInDarkness.id);
  assert.equal(treadPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(treadPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(treadPlaced, p2.id), treadPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: treadInDarkness.id }],
    "Tread in Darkness source-trash draw should only offer its source card",
  );
  const treadOtherTrashAttempt = state.trashPlayerCard(
    treadPlaced,
    treadPlaced.pendingAction,
    "playArea",
    treadOtherBeneCard.id,
  );
  assert.equal(
    treadOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Tread in Darkness trash attempts should leave the pending action unresolved",
  );
  assert.equal(
    playerById(treadOtherTrashAttempt, p2.id).playArea.some((card) => card.id === treadOtherBeneCard.id),
    true,
    "Tread in Darkness should reject trashing the other Bene Gesserit card",
  );
  const treadTrashed = state.trashPlayerCard(
    treadPlaced,
    treadPlaced.pendingAction,
    "playArea",
    treadInDarkness.id,
  );
  const treadOwner = playerById(treadTrashed, p2.id);
  assert.equal(
    treadOwner.playArea.some((card) => card.id === treadInDarkness.id),
    false,
    "Resolving Tread in Darkness trash should remove the source card from play",
  );
  assert.equal(
    treadOwner.playArea.some((card) => card.id === treadOtherBeneCard.id),
    true,
    "Resolving Tread in Darkness trash should leave the other Bene Gesserit card in play",
  );
  assert.equal(
    treadOwner.hand.some((card) => card.id === treadDrawCard.id),
    true,
    "Resolving Tread in Darkness trash should draw 1 card",
  );
  assert.deepEqual(
    treadOwner.hand.map((card) => card.id),
    [treadDrawCard.id],
    "Resolving Tread in Darkness trash should draw exactly 1 card",
  );
  assert.deepEqual(
    treadOwner.deck.map((card) => card.id),
    [treadExtraDeckCard.id],
    "Resolving Tread in Darkness trash should leave the second deck card undrawn",
  );
  assert.equal(treadTrashed.pendingAction, undefined);
  assert.match(treadTrashed.log[0], /trashes Tread in Darkness from Tread in Darkness and draws 1 card/);
  const treadSkipped = state.skipTrashCard(treadPlaced, treadPlaced.pendingAction);
  const treadSkippedOwner = playerById(treadSkipped, p2.id);
  assert.equal(
    treadSkippedOwner.playArea.some((card) => card.id === treadInDarkness.id),
    true,
    "Skipping Tread in Darkness trash should leave the source card in play",
  );
  assert.equal(
    treadSkippedOwner.hand.some((card) => card.id === treadDrawCard.id),
    false,
    "Skipping Tread in Darkness trash should not draw the reward card",
  );
  assert.deepEqual(
    treadSkippedOwner.deck.map((card) => card.id),
    [treadDrawCard.id, treadExtraDeckCard.id],
    "Skipping Tread in Darkness trash should leave the deck untouched",
  );
  assert.equal(treadSkipped.pendingAction, undefined);
  assert.match(treadSkipped.log[0], /declines to trash a card from Tread in Darkness/);
  const treadUnqualifiedFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [treadDrawCard, treadExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadUnqualifiedPlaced = turnActions.placeAgentAction(treadUnqualifiedFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadUnqualifiedPlaced.pendingAction,
    undefined,
    "Tread in Darkness should not queue its source-trash draw without another Bene Gesserit card in play",
  );
  const treadEmptyDeckFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [],
    discard: [],
    garrison: 0,
    hand: [treadInDarkness],
    playArea: [treadOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const treadEmptyDeckPlaced = turnActions.placeAgentAction(treadEmptyDeckFixture, {
    commanderTargets: {},
    selectedCard: treadInDarkness,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    treadEmptyDeckPlaced.pendingAction?.kind,
    "trash-card",
    "Tread in Darkness should still queue its source-trash draw with an empty deck",
  );
  const treadEmptyDeckTrashed = state.trashPlayerCard(
    treadEmptyDeckPlaced,
    treadEmptyDeckPlaced.pendingAction,
    "playArea",
    treadInDarkness.id,
  );
  const treadEmptyDeckOwner = playerById(treadEmptyDeckTrashed, p2.id);
  assert.equal(
    treadEmptyDeckOwner.playArea.some((card) => card.id === treadInDarkness.id),
    false,
    "Tread in Darkness should trash itself even when the draw reward cannot be satisfied",
  );
  assert.equal(treadEmptyDeckOwner.hand.length, 0, "Unsatisfied Tread in Darkness draw should not add cards");
  assert.match(treadEmptyDeckTrashed.log[0], /trashes Tread in Darkness from Tread in Darkness and has no card to draw/);
  const shishakliDrawCard = { ...dagger, id: "shishakli-draw-card", name: "Shishakli Draw Probe" };
  const shishakliExtraDeckCard = {
    ...convincingArgument,
    id: "shishakli-extra-deck-card",
    name: "Shishakli Extra Deck Probe",
  };
  const shishakliOtherPlayCard = {
    ...dagger,
    id: "shishakli-other-play-card",
    name: "Shishakli Other Play Card",
  };
  const shishakliFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [shishakliDrawCard, shishakliExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [shishakli],
    playArea: [shishakliOtherPlayCard],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  assert.equal(
    state.pendingActionForCard(shishakli, playerById(shishakliFixture, p2.id), shishakliFixture),
    undefined,
    "Shishakli should only queue its source-trash draw choice from play",
  );
  const shishakliPlaced = turnActions.placeAgentAction(shishakliFixture, {
    commanderTargets: {},
    selectedCard: shishakli,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    shishakliPlaced.pendingAction?.kind,
    "trash-card",
    "Shishakli should queue a source-trash draw pending action",
  );
  assert.equal(shishakliPlaced.pendingAction.source, "Shishakli");
  assert.equal(shishakliPlaced.pendingAction.optional, true);
  assert.equal(shishakliPlaced.pendingAction.drawCardsReward, 1);
  assert.deepEqual(shishakliPlaced.pendingAction.zones, ["playArea"]);
  assert.equal(shishakliPlaced.pendingAction.requiredCardId, shishakli.id);
  assert.equal(shishakliPlaced.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(shishakliPlaced.pendingAction.requiredAgentPlacementTargetOwnerId, p2.id);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(shishakliPlaced, p2.id), shishakliPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [{ zone: "playArea", id: shishakli.id }],
    "Shishakli source-trash draw should only offer its source card",
  );
  const shishakliOtherTrashAttempt = state.trashPlayerCard(
    shishakliPlaced,
    shishakliPlaced.pendingAction,
    "playArea",
    shishakliOtherPlayCard.id,
  );
  assert.equal(
    shishakliOtherTrashAttempt.pendingAction?.kind,
    "trash-card",
    "Rejected Shishakli trash attempts should leave the pending action unresolved",
  );
  assert.equal(
    playerById(shishakliOtherTrashAttempt, p2.id).playArea.some((card) => card.id === shishakliOtherPlayCard.id),
    true,
    "Shishakli should reject trashing other in-play cards",
  );
  const shishakliTrashed = state.trashPlayerCard(
    shishakliPlaced,
    shishakliPlaced.pendingAction,
    "playArea",
    shishakli.id,
  );
  const shishakliOwner = playerById(shishakliTrashed, p2.id);
  assert.equal(
    shishakliOwner.playArea.some((card) => card.id === shishakli.id),
    false,
    "Resolving Shishakli trash should remove the source card from play",
  );
  assert.equal(
    shishakliOwner.playArea.some((card) => card.id === shishakliOtherPlayCard.id),
    true,
    "Resolving Shishakli trash should leave other cards in play",
  );
  assert.deepEqual(
    shishakliOwner.hand.map((card) => card.id),
    [shishakliDrawCard.id],
    "Resolving Shishakli trash should draw exactly 1 card",
  );
  assert.deepEqual(
    shishakliOwner.deck.map((card) => card.id),
    [shishakliExtraDeckCard.id],
    "Resolving Shishakli trash should leave the second deck card undrawn",
  );
  assert.equal(shishakliTrashed.pendingAction, undefined);
  assert.match(shishakliTrashed.log[0], /trashes Shishakli from Shishakli and draws 1 card/);
  const shishakliSkipped = state.skipTrashCard(shishakliPlaced, shishakliPlaced.pendingAction);
  const shishakliSkippedOwner = playerById(shishakliSkipped, p2.id);
  assert.equal(
    shishakliSkippedOwner.playArea.some((card) => card.id === shishakli.id),
    true,
    "Skipping Shishakli trash should leave the source card in play",
  );
  assert.equal(
    shishakliSkippedOwner.hand.some((card) => card.id === shishakliDrawCard.id),
    false,
    "Skipping Shishakli trash should not draw the reward card",
  );
  assert.deepEqual(
    shishakliSkippedOwner.deck.map((card) => card.id),
    [shishakliDrawCard.id, shishakliExtraDeckCard.id],
    "Skipping Shishakli trash should leave the deck untouched",
  );
  assert.equal(shishakliSkipped.pendingAction, undefined);
  assert.match(shishakliSkipped.log[0], /declines to trash a card from Shishakli/);
  const inHighPlacesDrawCard = {
    ...dagger,
    id: "in-high-places-draw-card",
    name: "In High Places Draw Probe",
  };
  const inHighPlacesExtraDeckCard = {
    ...convincingArgument,
    id: "in-high-places-extra-deck-card",
    name: "In High Places Extra Deck Probe",
  };
  const inHighPlacesOtherBeneCard = {
    ...hiddenMissive,
    id: "in-high-places-other-bene-card",
    name: "In High Places Other Bene",
  };
  const inHighPlacesFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [inHighPlacesDrawCard, inHighPlacesExtraDeckCard],
    discard: [],
    garrison: 0,
    hand: [inHighPlaces],
    playArea: [inHighPlacesOtherBeneCard],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 2,
  }));
  const inHighPlacesPlaced = turnActions.placeAgentAction(inHighPlacesFixture, {
    commanderTargets: {},
    selectedCard: inHighPlaces,
    selectedSpace: imperialBasin,
  });
  const inHighPlacesOwner = playerById(inHighPlacesPlaced, p2.id);
  assert.deepEqual(
    inHighPlacesOwner.hand.map((card) => card.id),
    [inHighPlacesDrawCard.id],
    "In High Places should draw exactly one card when another Bene Gesserit card is in play",
  );
  assert.deepEqual(
    inHighPlacesOwner.deck.map((card) => card.id),
    [inHighPlacesExtraDeckCard.id],
    "In High Places should leave the second deck card undrawn",
  );
  assert.equal(
    inHighPlacesPlaced.pendingAction?.kind,
    "spy",
    "In High Places should queue spy placement when another Bene Gesserit card is in play",
  );
  assert.equal(inHighPlacesPlaced.pendingAction.ownerId, p2.id);
  assert.equal(inHighPlacesPlaced.pendingAction.source, "In High Places");
  assert.equal(inHighPlacesPlaced.pendingAction.remaining, 1);
  assert.equal(inHighPlacesPlaced.pendingAction.recallForSupply, true);
  assert.equal(inHighPlacesPlaced.pendingAction.mustPlaceSpy, true);
  assert.equal(
    state.finishPendingAction(inHighPlacesPlaced),
    inHighPlacesPlaced,
    "In High Places spy placement should be mandatory",
  );
  const inHighPlacesSpyPlaced = state.placeSpyForPending(
    inHighPlacesPlaced,
    inHighPlacesPlaced.pendingAction,
    highCouncil.id,
  );
  assert.equal(inHighPlacesSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(inHighPlacesSpyPlaced, p2.id).spies, 1, "In High Places should spend one spy from supply");
  assert.equal(inHighPlacesSpyPlaced.spyPosts[highCouncil.id], p2.id, "In High Places should place the selected spy");
  assert.match(inHighPlacesSpyPlaced.log[0], /places a spy near High Council from In High Places/);
  const inHighPlacesUnqualified = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [inHighPlacesDrawCard, inHighPlacesExtraDeckCard],
      discard: [],
      garrison: 0,
      hand: [inHighPlaces],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 2,
    })),
    {
      commanderTargets: {},
      selectedCard: inHighPlaces,
      selectedSpace: imperialBasin,
    },
  );
  assert.deepEqual(
    playerById(inHighPlacesUnqualified, p2.id).hand.map((card) => card.id),
    [],
    "In High Places should not draw when it is the only Bene Gesserit card in play",
  );
  assert.equal(
    inHighPlacesUnqualified.pendingAction,
    undefined,
    "In High Places should not queue spy placement when it is the only Bene Gesserit card in play",
  );
  const genericDrawRewardTrashCard = {
    ...dagger,
    id: "generic-draw-reward-trash-card",
    name: "Generic Draw Reward Trash",
  };
  const genericDrawRewardDeckCard = {
    ...convincingArgument,
    id: "generic-draw-reward-deck-card",
    name: "Generic Draw Reward Deck",
  };
  const genericDrawRewardPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Generic Draw Reward",
    optional: true,
    zones: ["playArea"],
    drawCardsReward: 2,
  };
  const genericDrawRewardState = withActivePlayer(game, p2.id, () => ({
    deck: [genericDrawRewardDeckCard],
    discard: [],
    hand: [],
    playArea: [genericDrawRewardTrashCard],
  }));
  const genericDrawRewardPartial = state.trashPlayerCard(
    { ...genericDrawRewardState, pendingAction: genericDrawRewardPending },
    genericDrawRewardPending,
    "playArea",
    genericDrawRewardTrashCard.id,
  );
  const genericDrawRewardOwner = playerById(genericDrawRewardPartial, p2.id);
  assert.deepEqual(
    genericDrawRewardOwner.hand.map((card) => card.id),
    [genericDrawRewardDeckCard.id],
    "Generic trash-card draw reward should draw the one available card",
  );
  assert.equal(
    genericDrawRewardOwner.playArea.some((card) => card.id === genericDrawRewardTrashCard.id),
    false,
    "Generic trash-card draw reward should still trash the selected card",
  );
  assert.match(
    genericDrawRewardPartial.log[0],
    /trashes Generic Draw Reward Trash from Generic Draw Reward and draws 1 of 2 cards/,
    "Generic trash-card draw reward should log partial draws",
  );
  const genericDuplicateTrashCardA = {
    ...dagger,
    id: "generic-duplicate-trash-card",
    name: "Generic Duplicate Trash A",
  };
  const genericDuplicateTrashCardB = {
    ...dagger,
    id: "generic-duplicate-trash-card",
    name: "Generic Duplicate Trash B",
  };
  const genericDuplicateTrashPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Generic Duplicate Trash",
    optional: true,
    zones: ["playArea"],
  };
  const genericDuplicateTrashState = withActivePlayer(game, p2.id, () => ({
    playArea: [genericDuplicateTrashCardA, genericDuplicateTrashCardB],
  }));
  assert.deepEqual(
    state.trashableCardsForPending(playerById(genericDuplicateTrashState, p2.id), genericDuplicateTrashPending)
      .map(({ card }) => card.name),
    ["Generic Duplicate Trash A", "Generic Duplicate Trash B"],
    "Generic duplicate trash choices should preserve both visible choices",
  );
  const genericDuplicateTrashResolved = state.trashPlayerCard(
    genericDuplicateTrashState,
    genericDuplicateTrashPending,
    "playArea",
    genericDuplicateTrashCardB.id,
    1,
  );
  assert.deepEqual(
    playerById(genericDuplicateTrashResolved, p2.id).playArea.map((card) => card.name),
    ["Generic Duplicate Trash A"],
    "Choice-indexed trash should remove the clicked duplicate-id card instance",
  );
  const dangerousRhetoricFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    influence: { ...p2.influence, bene: 1 },
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(dangerousRhetoric, playerById(dangerousRhetoricFixture, p2.id), dangerousRhetoricFixture),
    undefined,
    "Dangerous Rhetoric should only queue its Influence choice from play",
  );
  const dangerousRhetoricPlaced = turnActions.placeAgentAction(dangerousRhetoricFixture, {
    commanderTargets: {},
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(
    dangerousRhetoricPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Dangerous Rhetoric should queue a typed Influence choice",
  );
  assert.equal(dangerousRhetoricPlaced.pendingAction.source, "Dangerous Rhetoric");
  assert.equal(dangerousRhetoricPlaced.pendingAction.amount, 1);
  assert.equal(dangerousRhetoricPlaced.pendingAction.trashSource, true);
  assert.equal(dangerousRhetoricPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(dangerousRhetoricPlaced.pendingAction.cardId, dangerousRhetoric.id);
  assert.equal(dangerousRhetoricPlaced.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricPlaced, p2.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementSpaceId,
    highCouncil.id,
    "Dangerous Rhetoric should record the Agent placement space on the source card in play",
  );
  assert.deepEqual(
    dangerousRhetoricPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p2.id, faction: "spacing" },
      { ownerId: p2.id, faction: "bene" },
      { ownerId: p2.id, faction: "fringeWorlds" },
    ],
    "Ally Dangerous Rhetoric should offer main-board Influence choices",
  );
  const dangerousRhetoricResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricPlaced,
    dangerousRhetoricPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(dangerousRhetoricResolved.pendingAction, undefined);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).influence.bene, 2);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).vp, 1, "Dangerous Rhetoric should award Influence threshold VP");
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should trash itself after the Influence choice",
  );
  assert.match(dangerousRhetoricResolved.log[0], /gains 1 Bene Gesserit Influence from Dangerous Rhetoric/);
  const dangerousRhetoricStrippedTrashSourcePending = {
    ...dangerousRhetoricPlaced.pendingAction,
    trashSource: true,
    cardId: undefined,
    cardOwnerId: undefined,
  };
  const dangerousRhetoricStrippedTrashSourceState = {
    ...dangerousRhetoricPlaced,
    pendingAction: dangerousRhetoricStrippedTrashSourcePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricStrippedTrashSourceState,
      dangerousRhetoricStrippedTrashSourcePending,
      p2.id,
      "bene",
    ),
    dangerousRhetoricStrippedTrashSourceState,
    "Dangerous Rhetoric should reject trash-source pendings without source-card metadata",
  );
  const dangerousRhetoricStrippedSourceCardPending = {
    ...dangerousRhetoricPlaced.pendingAction,
    trashSource: undefined,
    cardId: undefined,
    cardOwnerId: undefined,
  };
  const dangerousRhetoricStrippedSourceCardState = {
    ...dangerousRhetoricPlaced,
    pendingAction: dangerousRhetoricStrippedSourceCardPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricStrippedSourceCardState,
      dangerousRhetoricStrippedSourceCardPending,
      p2.id,
      "bene",
    ),
    dangerousRhetoricStrippedSourceCardState,
    "Dangerous Rhetoric should reject metadata-stripped card Influence pendings",
  );
  const dangerousRhetoricShippingPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, (player) => ({
        agentsReady: 1,
        hand: [dangerousRhetoric],
        influence: { ...player.influence, bene: 0, emperor: 0, greatHouses: 0, spacing: 2 },
        playArea: [],
        resources: { solari: 0, spice: 3, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [shipping.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: dangerousRhetoric,
      selectedSpace: shipping,
    },
  );
  assert.equal(
    dangerousRhetoricShippingPlaced.pendingAction?.source,
    "Shipping",
    "Shipping board Influence should remain the active pending action before Dangerous Rhetoric",
  );
  assert.equal(dangerousRhetoricShippingPlaced.pendingAction?.sourceEffect, undefined);
  assert.equal(
    dangerousRhetoricShippingPlaced.pendingQueue[0]?.source,
    "Dangerous Rhetoric",
    "Dangerous Rhetoric should stay queued separately after Shipping's board Influence",
  );
  assert.equal(dangerousRhetoricShippingPlaced.pendingQueue[0]?.sourceEffect, "gain-influence-choice");
  assert.equal(dangerousRhetoricShippingPlaced.pendingQueue[0]?.amount, 1);
  const dangerousRhetoricShippingBoardResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricShippingPlaced,
    dangerousRhetoricShippingPlaced.pendingAction,
    p2.id,
    "greatHouses",
  );
  assert.equal(playerById(dangerousRhetoricShippingBoardResolved, p2.id).influence.greatHouses, 1);
  assert.equal(
    dangerousRhetoricShippingBoardResolved.pendingAction?.source,
    "Dangerous Rhetoric",
    "Resolving Shipping should advance to the separate Dangerous Rhetoric Influence choice",
  );
  assert.equal(dangerousRhetoricShippingBoardResolved.pendingAction?.amount, 1);
  const dangerousRhetoricShippingCardResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricShippingBoardResolved,
    dangerousRhetoricShippingBoardResolved.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(dangerousRhetoricShippingCardResolved, p2.id).influence.bene, 1);
  assert.equal(dangerousRhetoricShippingCardResolved.pendingAction, undefined);
  assert.equal(
    playerById(dangerousRhetoricShippingCardResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should still resolve and trash after a separate Shipping board Influence choice",
  );
  const dangerousRhetoricCommanderPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p4.id, () => ({
      agentsReady: 1,
      hand: [dangerousRhetoric],
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
    })),
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: dangerousRhetoric,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    dangerousRhetoricCommanderPlaced.pendingAction?.targetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric should lock the activated Ally target on the pending action",
  );
  assert.equal(dangerousRhetoricCommanderPlaced.pendingAction?.spaceId, highCouncil.id);
  const dangerousRhetoricCommanderSourceCard = playerById(dangerousRhetoricCommanderPlaced, p4.id).playArea.find(
    (card) => card.id === dangerousRhetoric.id,
  );
  assert.equal(
    dangerousRhetoricCommanderSourceCard?.agentPlacementTargetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric should record the activated Ally on the source card in play",
  );
  assert.deepEqual(
    dangerousRhetoricCommanderPlaced.pendingAction?.choices,
    [
      { ownerId: p4.id, faction: "emperor" },
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p2.id, faction: "spacing" },
      { ownerId: p2.id, faction: "bene" },
      { ownerId: p2.id, faction: "fringeWorlds" },
    ],
    "Commander Dangerous Rhetoric should route personal Influence to the Commander and main-board Influence to the activated Ally",
  );
  const alternateShaddamAlly = dangerousRhetoricCommanderPlaced.players.find((player) =>
    player.team === p4.team &&
    player.role === "Ally" &&
    player.id !== p2.id
  );
  assert.ok(alternateShaddamAlly, "Expected another Shaddam Ally for Dangerous Rhetoric routing hardening");
  const dangerousRhetoricForgedTargetPending = {
    ...dangerousRhetoricCommanderPlaced.pendingAction,
    choices: dangerousRhetoricCommanderPlaced.pendingAction.choices.map((choice) =>
      choice.ownerId === p2.id ? { ...choice, ownerId: alternateShaddamAlly.id } : choice,
    ),
  };
  const dangerousRhetoricForgedTargetState = {
    ...dangerousRhetoricCommanderPlaced,
    pendingAction: dangerousRhetoricForgedTargetPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricForgedTargetState,
      dangerousRhetoricForgedTargetPending,
      alternateShaddamAlly.id,
      "bene",
    ),
    dangerousRhetoricForgedTargetState,
    "Commander Dangerous Rhetoric should reject forged choices for a different same-team Ally",
  );
  const dangerousRhetoricForgedLockedTargetPending = {
    ...dangerousRhetoricForgedTargetPending,
    targetOwnerId: alternateShaddamAlly.id,
  };
  const dangerousRhetoricForgedLockedTargetState = {
    ...dangerousRhetoricCommanderPlaced,
    pendingAction: dangerousRhetoricForgedLockedTargetPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricForgedLockedTargetState,
      dangerousRhetoricForgedLockedTargetPending,
      alternateShaddamAlly.id,
      "bene",
    ),
    dangerousRhetoricForgedLockedTargetState,
    "Commander Dangerous Rhetoric should reject forged targetOwnerId values that disagree with the source card",
  );
  const overthrowFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [overthrow],
    influence: { ...p2.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(overthrow, playerById(overthrowFixture, p2.id), overthrowFixture),
    undefined,
    "Overthrow should only queue its board-space Influence bonus after its Agent placement is known",
  );
  const overthrowFactionPlaced = turnActions.placeAgentAction(
    {
      ...overthrowFixture,
      sharedSpyPosts: {},
      spyPosts: { [secrets.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: overthrow,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    playerById(overthrowFactionPlaced, p2.id).influence.bene,
    1,
    "Overthrow should keep the normal board-space Influence before its pending bonus resolves",
  );
  assert.equal(overthrowFactionPlaced.pendingAction?.kind, "board-influence-choice");
  assert.equal(overthrowFactionPlaced.pendingAction.source, "Overthrow");
  assert.equal(overthrowFactionPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(overthrowFactionPlaced.pendingAction.amount, 1);
  assert.equal(overthrowFactionPlaced.pendingAction.trashSource, undefined);
  assert.equal(overthrowFactionPlaced.pendingAction.cardId, overthrow.id);
  assert.equal(overthrowFactionPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(overthrowFactionPlaced.pendingAction.spaceId, secrets.id);
  assert.deepEqual(
    overthrowFactionPlaced.pendingAction.choices,
    [{ ownerId: p2.id, faction: "bene" }],
    "Ally Overthrow should only offer the current board-space Influence",
  );
  const overthrowForgedChoicePending = {
    ...overthrowFactionPlaced.pendingAction,
    choices: [
      ...overthrowFactionPlaced.pendingAction.choices,
      { ownerId: p2.id, faction: "spacing" },
    ],
  };
  const overthrowForgedChoiceState = {
    ...overthrowFactionPlaced,
    pendingAction: overthrowForgedChoicePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      overthrowForgedChoiceState,
      overthrowForgedChoicePending,
      p2.id,
      "spacing",
    ),
    overthrowForgedChoiceState,
    "Overthrow should reject forged off-space Influence choices",
  );
  const overthrowFactionResolved = state.resolveBoardInfluenceChoice(
    overthrowFactionPlaced,
    overthrowFactionPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(overthrowFactionResolved, p2.id).influence.bene, 2);
  assert.ok(
    playerById(overthrowFactionResolved, p2.id).vp > playerById(overthrowFactionPlaced, p2.id).vp,
    "Overthrow should resolve Influence threshold rewards after its bonus",
  );
  assert.equal(
    playerById(overthrowFactionResolved, p2.id).playArea.some((card) => card.id === overthrow.id),
    true,
    "Overthrow should remain in play after its board-space Influence bonus",
  );
  assert.match(overthrowFactionResolved.log[0], /gains 1 Bene Gesserit Influence from Overthrow/);
  const overthrowCommanderPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p4.id, () => ({
        agentsReady: 1,
        hand: [overthrow],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [dutifulService.id]: p4.id },
    },
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: overthrow,
      selectedSpace: dutifulService,
    },
  );
  assert.equal(
    overthrowCommanderPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Commander Overthrow should combine with the mapped board Influence choice",
  );
  assert.equal(overthrowCommanderPlaced.pendingAction.source, "Overthrow");
  assert.equal(overthrowCommanderPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(overthrowCommanderPlaced.pendingAction.amount, 2);
  assert.equal(overthrowCommanderPlaced.pendingAction.trashSource, undefined);
  assert.equal(overthrowCommanderPlaced.pendingAction.targetOwnerId, p2.id);
  assert.deepEqual(
    overthrowCommanderPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p4.id, faction: "emperor" },
    ],
    "Commander Overthrow should keep the normal mapped board-space choices but make the chosen one worth 2",
  );
  assert.equal(
    overthrowCommanderPlaced.pendingQueue.find((pending) =>
      pending.kind === "board-influence-choice" && pending.source === "Dutiful Service"
    ),
    undefined,
    "Overthrow should not leave the original 1-Influence board choice queued separately",
  );
  const overthrowCommanderResolved = state.resolveBoardInfluenceChoice(
    overthrowCommanderPlaced,
    overthrowCommanderPlaced.pendingAction,
    p4.id,
    "emperor",
  );
  assert.equal(playerById(overthrowCommanderResolved, p4.id).influence.emperor, 2);
  assert.equal(playerById(overthrowCommanderResolved, p2.id).influence.greatHouses, 0);
  assert.equal(
    playerById(overthrowCommanderResolved, p4.id).playArea.some((card) => card.id === overthrow.id),
    true,
    "Commander Overthrow should remain in play after resolving the combined Influence choice",
  );
  const subversiveNonFactionPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 10, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [highCouncil.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: subversiveAdvisor,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    subversiveNonFactionPlaced.pendingAction,
    undefined,
    "Subversive Advisor should not queue its Influence bonus outside Faction board spaces",
  );
  assert.equal(
    playerById(subversiveNonFactionPlaced, p2.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    true,
    "Subversive Advisor should stay in play when its Faction-space condition is not met",
  );
  const subversiveFactionPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [secrets.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: subversiveAdvisor,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    playerById(subversiveFactionPlaced, p2.id).influence.bene,
    1,
    "Subversive Advisor should keep the normal board-space Influence before its pending bonus resolves",
  );
  assert.equal(subversiveFactionPlaced.pendingAction?.kind, "board-influence-choice");
  assert.equal(subversiveFactionPlaced.pendingAction.source, "Subversive Advisor");
  assert.equal(subversiveFactionPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(subversiveFactionPlaced.pendingAction.amount, 1);
  assert.equal(subversiveFactionPlaced.pendingAction.trashSource, true);
  assert.equal(subversiveFactionPlaced.pendingAction.cardId, subversiveAdvisor.id);
  assert.equal(subversiveFactionPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(subversiveFactionPlaced.pendingAction.spaceId, secrets.id);
  assert.deepEqual(
    subversiveFactionPlaced.pendingAction.choices,
    [{ ownerId: p2.id, faction: "bene" }],
    "Ally Subversive Advisor should only offer the current board-space Influence",
  );
  const subversiveForgedChoicePending = {
    ...subversiveFactionPlaced.pendingAction,
    choices: [
      ...subversiveFactionPlaced.pendingAction.choices,
      { ownerId: p2.id, faction: "spacing" },
    ],
  };
  const subversiveForgedChoiceState = {
    ...subversiveFactionPlaced,
    pendingAction: subversiveForgedChoicePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      subversiveForgedChoiceState,
      subversiveForgedChoicePending,
      p2.id,
      "spacing",
    ),
    subversiveForgedChoiceState,
    "Subversive Advisor should reject forged off-space Influence choices",
  );
  const subversiveFactionResolved = state.resolveBoardInfluenceChoice(
    subversiveFactionPlaced,
    subversiveFactionPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(subversiveFactionResolved, p2.id).influence.bene, 2);
  assert.ok(
    playerById(subversiveFactionResolved, p2.id).vp > playerById(subversiveFactionPlaced, p2.id).vp,
    "Subversive Advisor should resolve Influence threshold rewards after its bonus",
  );
  assert.equal(
    playerById(subversiveFactionResolved, p2.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    false,
    "Subversive Advisor should trash itself after the board-space Influence bonus",
  );
  assert.match(subversiveFactionResolved.log[0], /gains 1 Bene Gesserit Influence from Subversive Advisor/);
  const subversiveCommanderPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p4.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [dutifulService.id]: p4.id },
    },
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: subversiveAdvisor,
      selectedSpace: dutifulService,
    },
  );
  assert.equal(
    subversiveCommanderPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Commander Subversive Advisor should combine with the mapped board Influence choice",
  );
  assert.equal(subversiveCommanderPlaced.pendingAction.source, "Subversive Advisor");
  assert.equal(subversiveCommanderPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(subversiveCommanderPlaced.pendingAction.amount, 2);
  assert.equal(subversiveCommanderPlaced.pendingAction.trashSource, true);
  assert.equal(subversiveCommanderPlaced.pendingAction.targetOwnerId, p2.id);
  assert.deepEqual(
    subversiveCommanderPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p4.id, faction: "emperor" },
    ],
    "Commander Subversive Advisor should keep the normal mapped board-space choices but make the chosen one worth 2",
  );
  assert.equal(
    subversiveCommanderPlaced.pendingQueue.find((pending) =>
      pending.kind === "board-influence-choice" && pending.source === "Dutiful Service"
    ),
    undefined,
    "Subversive Advisor should not leave the original 1-Influence board choice queued separately",
  );
  const subversiveCommanderResolved = state.resolveBoardInfluenceChoice(
    subversiveCommanderPlaced,
    subversiveCommanderPlaced.pendingAction,
    p4.id,
    "emperor",
  );
  assert.equal(playerById(subversiveCommanderResolved, p4.id).influence.emperor, 2);
  assert.equal(playerById(subversiveCommanderResolved, p2.id).influence.greatHouses, 0);
  assert.equal(
    playerById(subversiveCommanderResolved, p4.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    false,
    "Commander Subversive Advisor should trash itself after resolving the combined Influence choice",
  );
  const fedaykinMakerEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    game,
    imperialBasin,
  );
  assert.equal(fedaykinMakerEffect.source.garrison, 1, "Fedaykin Stilltent should recruit 1 troop on a Maker Agent space");
  assert.equal(fedaykinMakerEffect.recruitedTroops, 1, "Fedaykin Stilltent recruit should count for deployment limits");
  assert.match(fedaykinMakerEffect.log ?? "", /Fedaykin Stilltent: recruits 1 troop/);
  const fedaykinNoSupplyEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    p2,
    game,
    imperialBasin,
  );
  assert.equal(
    fedaykinNoSupplyEffect.source.garrison,
    12,
    "Fedaykin Stilltent should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    fedaykinNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Fedaykin Stilltent should not count unplaced troops for deployment limits",
  );
  assert.equal(fedaykinNoSupplyEffect.log, undefined, "Fedaykin Stilltent should not log an unplaced troop");
  const fedaykinNonMakerEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    { ...game, roundMakerSpaceVisits: { [p2.id]: true } },
    acceptContract,
  );
  assert.equal(
    fedaykinNonMakerEffect.source.garrison,
    0,
    "Fedaykin Stilltent should not use prior round Maker visits during a non-Maker Agent placement",
  );
  assert.equal(fedaykinNonMakerEffect.log, undefined, "Fedaykin Stilltent should not log on non-Maker Agent spaces");
  const fedaykinNoSpaceEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    { ...game, roundMakerSpaceVisits: { [p2.id]: true } },
  );
  assert.equal(
    fedaykinNoSpaceEffect.source.garrison,
    0,
    "Fedaykin Stilltent Agent specs should require current board-space context",
  );
  const fedaykinCommanderEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p4, garrison: 0 },
    { ...p2, garrison: 0 },
    game,
    imperialBasin,
  );
  assert.equal(fedaykinCommanderEffect.source.garrison, 0, "Fedaykin Stilltent should not recruit troops to the Commander");
  assert.equal(fedaykinCommanderEffect.target.garrison, 1, "Fedaykin Stilltent should recruit to the activated Ally for Commander plays");
  assert.equal(fedaykinCommanderEffect.recruitedTroops, 1, "Fedaykin Stilltent Commander recruit should count for deployment limits");
  const fedaykinReveal = turnActions.revealTurnPlan({ ...p2, hand: [fedaykinStilltent], highCouncilSeat: false }, game);
  assert.equal(fedaykinReveal.persuasion, 0, "Fedaykin Stilltent should not reveal for persuasion");
  assert.deepEqual(fedaykinReveal.revealGain, { water: 1 }, "Fedaykin Stilltent should reveal for 1 water");
  const fedaykinPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [fedaykinStilltent],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const fedaykinPlaced = turnActions.placeAgentAction(fedaykinPlacementFixture, {
    commanderTargets: {},
    selectedCard: fedaykinStilltent,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    playerById(fedaykinPlaced, p2.id).garrison,
    1,
    "Fedaykin Stilltent should receive current Maker space context through placeAgentAction",
  );
  assert.equal(fedaykinPlaced.pendingAction?.kind, "deploy", "Fedaykin Stilltent's recruited troop should be deployable");
  assert.match(fedaykinPlaced.log.join("\n"), /Fedaykin Stilltent: recruits 1 troop/);
  const strikeFleetRecallPending = {
    kind: "recall-spy",
    ownerId: p2.id,
    combatRecipientId: p2.id,
    remaining: 1,
    strength: 0,
    source: "Verifier Spy Recall",
    optional: true,
  };
  const strikeFleetSpyRecallFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deployedTroops: 0,
      discard: [],
      garrison: 0,
      hand: [strikeFleet],
      playArea: [],
    })),
    pendingAction: strikeFleetRecallPending,
    pendingQueue: [],
    spyPosts: {
      [arrakeen.id]: p2.id,
      [secrets.id]: p2.id,
    },
    sharedSpyPosts: {},
  };
  const strikeFleetSpyRecalled = state.recallSpyForPending(
    strikeFleetSpyRecallFixture,
    strikeFleetRecallPending,
    secrets.id,
  );
  assert.equal(strikeFleetSpyRecalled.turnSpyRecalls[p2.id], 1, "Spy recall pending resolution should mark same-turn spy recalls");
  const strikeFleetPlaced = turnActions.placeAgentAction(strikeFleetSpyRecalled, {
    commanderTargets: {},
    selectedCard: strikeFleet,
    selectedSpace: arrakeen,
  });
  assert.equal(
    playerById(strikeFleetPlaced, p2.id).garrison,
    4,
    "Strike Fleet should combine Arrakeen's troop with its same-turn-spy-recall recruits",
  );
  assert.deepEqual(
    strikeFleetPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 4,
      source: "Arrakeen",
    },
    "Strike Fleet recruited troops should be deployable through the normal combat-space pending cap",
  );
  assert.match(strikeFleetPlaced.log.join("\n"), /Strike Fleet: recruits 3 troops/);
  const sardaukarPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [sardaukarCoordination],
    highCouncilSeat: true,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const sardaukarPlaced = turnActions.placeAgentAction(sardaukarPlacementFixture, {
    commanderTargets: {},
    selectedCard: sardaukarCoordination,
    selectedSpace: highCouncil,
  });
  assert.equal(
    playerById(sardaukarPlaced, p2.id).garrison,
    3,
    "Sardaukar Coordination should see High Council's recruited troops in the deployment owner garrison",
  );
  assert.deepEqual(
    sardaukarPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 3,
      source: "Sardaukar Coordination",
    },
    "Sardaukar Coordination should let same-turn recruits deploy from a non-combat Landsraad space",
  );
  const sardaukarDeployed = state.deployTroopToConflict(sardaukarPlaced, sardaukarPlaced.pendingAction);
  assert.equal(playerById(sardaukarDeployed, p2.id).garrison, 2, "Sardaukar Coordination deployment should spend a recruited garrison troop");
  assert.equal(playerById(sardaukarDeployed, p2.id).deployedTroops, 1, "Sardaukar Coordination deployment should add one deployed troop");
  assert.equal(playerById(sardaukarDeployed, p2.id).conflict, 2, "Sardaukar Coordination deployment should add troop strength");
  assert.equal(sardaukarDeployed.turnUnitDeployments[p2.id], 1, "Sardaukar Coordination deployment should count on the active player's turn");
  const sardaukarNoSupplyPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deployedTroops: 0,
      discard: [],
      garrison: 12,
      hand: [sardaukarCoordination],
      highCouncilSeat: true,
      jessicaMemories: 0,
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: sardaukarCoordination, selectedSpace: highCouncil },
  );
  assert.equal(
    sardaukarNoSupplyPlaced.pendingAction,
    undefined,
    "Sardaukar Coordination should not deploy existing garrison troops when no troops were recruited",
  );
  const commanderSardaukarPlacementBase = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [sardaukarCoordination],
    highCouncilSeat: true,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const commanderSardaukarPlacementFixture = {
    ...commanderSardaukarPlacementBase,
    players: commanderSardaukarPlacementBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, deployedTroops: 0, garrison: 0, jessicaMemories: 0 }
        : player
    ),
  };
  const commanderSardaukarPlaced = turnActions.placeAgentAction(commanderSardaukarPlacementFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: sardaukarCoordination,
    selectedSpace: highCouncil,
  });
  assert.equal(playerById(commanderSardaukarPlaced, p4.id).garrison, 0, "Commander Sardaukar should not recruit troops to the Commander");
  assert.equal(playerById(commanderSardaukarPlaced, p2.id).garrison, 3, "Commander Sardaukar should recruit High Council troops to the activated Ally");
  assert.deepEqual(
    commanderSardaukarPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 3,
      source: "Sardaukar Coordination",
    },
    "Commander Sardaukar should let the activated Ally deploy same-turn recruited troops",
  );
  assert.equal(commanderSardaukarPlaced.spaces[highCouncil.id], p2.id, "Commander Sardaukar should occupy High Council for the activated Ally");
  const commanderSardaukarDeployed = state.deployTroopToConflict(commanderSardaukarPlaced, commanderSardaukarPlaced.pendingAction);
  assert.equal(playerById(commanderSardaukarDeployed, p2.id).garrison, 2, "Commander Sardaukar deployment should spend the Ally's recruited troop");
  assert.equal(
    commanderSardaukarDeployed.turnUnitDeployments[p4.id],
    1,
    "Commander Sardaukar deployment should count on the active Commander's turn",
  );
  const arrakeenNoSupplyBoardEffect = state.applyBoardEffect(
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    p2,
    arrakeen,
  );
  assert.equal(
    arrakeenNoSupplyBoardEffect.source.garrison,
    12,
    "Board-space Agent troop rewards should not recruit beyond the Ally troop supply",
  );
  const arrakeenNoSupplyPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    garrison: 12,
    hand: [reconnaissance],
    jessicaMemories: 0,
    playArea: [],
  }));
  const arrakeenNoSupplyPlaced = turnActions.placeAgentAction(arrakeenNoSupplyPlacementFixture, {
    commanderTargets: {},
    selectedCard: reconnaissance,
    selectedSpace: arrakeen,
  });
  assert.equal(
    playerById(arrakeenNoSupplyPlaced, p2.id).garrison,
    12,
    "Arrakeen placement should not recruit beyond the Ally troop supply",
  );
  assert.deepEqual(
    arrakeenNoSupplyPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 2,
      source: "Arrakeen",
    },
    "Arrakeen should only allow the base +2 deployment when no board troop was actually recruited",
  );
  const arrakeenCommanderNoSupplyBoardEffect = state.applyBoardEffect(
    p4,
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    arrakeen,
  );
  assert.equal(
    arrakeenCommanderNoSupplyBoardEffect.target.garrison,
    12,
    "Commander-routed board-space troop rewards should not recruit beyond the activated Ally troop supply",
  );
  const militarySupportNoSupplyPlayers = game.players.map((player) =>
    player.team === p4.team && player.role === "Ally"
      ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
      : player
  );
  assert.equal(
    state.pendingActionForSpace(militarySupport, p4, p6, militarySupportNoSupplyPlayers),
    undefined,
    "Military Support should not queue reinforcement when the team has no Ally troop supply",
  );
  const militarySupportLimitedPlayers = game.players.map((player) => {
    if (player.id === p2.id) return { ...player, deployedTroops: 0, garrison: 11, jessicaMemories: 0 };
    if (player.id === p6.id) return { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 };
    return player;
  });
  const militarySupportLimitedPending = state.pendingActionForSpace(
    militarySupport,
    p4,
    p6,
    militarySupportLimitedPlayers,
  );
  assert.equal(
    militarySupportLimitedPending?.remaining,
    1,
    "Military Support should cap pending reinforcements to available team troop supply",
  );
  const militarySupportLimitedState = {
    ...game,
    pendingAction: militarySupportLimitedPending,
    pendingQueue: [],
    players: militarySupportLimitedPlayers,
  };
  const militarySupportLimitedResolved = state.reinforceTroop(
    militarySupportLimitedState,
    militarySupportLimitedPending,
    p2.id,
    "garrison",
  );
  assert.equal(
    playerById(militarySupportLimitedResolved, p2.id).garrison,
    12,
    "Military Support should recruit the last available troop into garrison",
  );
  assert.equal(
    militarySupportLimitedResolved.pendingAction,
    undefined,
    "Military Support should finish after the team's troop supply is exhausted",
  );
  const doubleAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [doubleAgent],
    playArea: [],
    spies: 2,
  }));
  const doubleAgentSpiedSpace = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [highCouncil.id]: p2.id, [secrets.id]: p3.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(doubleAgentSpiedSpace.pendingAction?.kind, "spy", "Double Agent should queue optional spy placement");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.ownerId, p2.id, "Double Agent spy placement should belong to the card player");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.allowSharedPost, true, "Double Agent should use shared-post placement");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.mustPlaceSpy, undefined, "Double Agent spy placement should be optional");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.source, "Double Agent");
  assert.deepEqual(
    state.placeableSpySpaces(doubleAgentSpiedSpace, doubleAgentSpiedSpace.pendingAction).map((space) => space.id),
    [secrets.id],
    "Double Agent should only allow sharing another player's observation post",
  );
  const doubleAgentSkipped = state.finishPendingAction(doubleAgentSpiedSpace);
  assert.equal(doubleAgentSkipped.pendingAction, undefined, "Double Agent optional spy placement should be skippable");
  assert.equal(playerById(doubleAgentSkipped, p2.id).spies, playerById(doubleAgentSpiedSpace, p2.id).spies);
  const doubleAgentPlacedSpy = state.placeSpyForPending(doubleAgentSpiedSpace, doubleAgentSpiedSpace.pendingAction, secrets.id);
  assert.equal(doubleAgentPlacedSpy.pendingAction, undefined, "Placing Double Agent's spy should clear the pending action");
  assert.equal(doubleAgentPlacedSpy.spyPosts[secrets.id], p3.id, "Double Agent should leave the original spy owner in place");
  assert.deepEqual(doubleAgentPlacedSpy.sharedSpyPosts[secrets.id], [p2.id], "Double Agent should share the chosen spy post");
  assert.equal(playerById(doubleAgentPlacedSpy, p2.id).spies, playerById(doubleAgentSpiedSpace, p2.id).spies - 1);
  assert.match(doubleAgentPlacedSpy.log[0], /places a spy near Secrets from Double Agent/);
  const doubleAgentUnspiedSpace = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [secrets.id]: p3.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(
    doubleAgentUnspiedSpace.pendingAction,
    undefined,
    "Double Agent should not queue placement without own spy on the current Agent space",
  );
  const doubleAgentNoSharedTarget = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [highCouncil.id]: p2.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(
    doubleAgentNoSharedTarget.pendingAction,
    undefined,
    "Double Agent should not pause when no other player's spy post can be shared",
  );
  const hiddenMissiveDraw = { ...dagger, id: "hidden-missive-agent-draw-fixture" };
  const hiddenMissiveEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p2,
      deck: [hiddenMissiveDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p2.influence, bene: 2 },
    },
    p2,
  );
  assert.equal(hiddenMissiveEffect.source.hand[0]?.id, hiddenMissiveDraw.id, "Hidden Missive Agent spec should draw 1 card");
  assert.equal(hiddenMissiveEffect.source.garrison, 1, "Hidden Missive Agent spec should recruit 1 troop");
  assert.equal(hiddenMissiveEffect.recruitedTroops, 1, "Hidden Missive Agent recruit should count for deployment limits");
  assert.match(hiddenMissiveEffect.log ?? "", /Hidden Missive: recruits 1 troop; draws 1 card/);
  const hiddenMissiveNoSupplyDraw = { ...dagger, id: "hidden-missive-no-supply-agent-draw-fixture" };
  const hiddenMissiveNoSupplyEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p2,
      deck: [hiddenMissiveNoSupplyDraw],
      deployedTroops: 0,
      discard: [],
      hand: [],
      garrison: 12,
      influence: { ...p2.influence, bene: 2 },
      jessicaMemories: 0,
    },
    p2,
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.source.hand[0]?.id,
    hiddenMissiveNoSupplyDraw.id,
    "Hidden Missive should still draw when its troop recruit is supply-capped",
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.source.garrison,
    12,
    "Hidden Missive should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Hidden Missive should not count an unplaced troop for deployment limits",
  );
  assert.match(hiddenMissiveNoSupplyEffect.log ?? "", /Hidden Missive: draws 1 card/);
  assert.equal(
    hiddenMissiveNoSupplyEffect.log?.includes("recruits 1 troop"),
    false,
    "Hidden Missive should not log an unplaced troop",
  );
  const hiddenMissiveCommanderDraw = { ...dagger, id: "hidden-missive-commander-agent-draw-fixture" };
  const hiddenMissiveCommanderEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p4,
      deck: [hiddenMissiveCommanderDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p4.influence, bene: 2 },
    },
    { ...p2, garrison: 0 },
  );
  assert.equal(
    hiddenMissiveCommanderEffect.source.hand[0]?.id,
    hiddenMissiveCommanderDraw.id,
    "Hidden Missive Commander Agent spec should draw 1 card for the source",
  );
  assert.equal(hiddenMissiveCommanderEffect.source.garrison, 0, "Hidden Missive should not recruit troops to the Commander");
  assert.equal(hiddenMissiveCommanderEffect.target.garrison, 1, "Hidden Missive should recruit 1 troop to the activated Ally");
  assert.equal(hiddenMissiveCommanderEffect.recruitedTroops, 1, "Hidden Missive Commander recruit should count for deployment limits");
  assert.match(
    hiddenMissiveCommanderEffect.log ?? "",
    /Hidden Missive: draws 1 card; Feyd-Rautha Harkonnen recruits 1 troop/,
  );
  const hiddenMissiveCommanderNoSupplyDraw = { ...dagger, id: "hidden-missive-commander-no-supply-agent-draw-fixture" };
  const hiddenMissiveCommanderNoSupplyEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p4,
      deck: [hiddenMissiveCommanderNoSupplyDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p4.influence, bene: 2 },
    },
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.source.hand[0]?.id,
    hiddenMissiveCommanderNoSupplyDraw.id,
    "Commander Hidden Missive should still draw when activated-Ally troop recruit is supply-capped",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.source.garrison,
    0,
    "Commander Hidden Missive no-supply case should not recruit troops to the Commander",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.target.garrison,
    12,
    "Commander Hidden Missive should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Commander Hidden Missive should not count unplaced activated-Ally troops for deployment limits",
  );
  assert.match(hiddenMissiveCommanderNoSupplyEffect.log ?? "", /Hidden Missive: draws 1 card/);
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.log?.includes(`${p2.leader} recruits 1 troop`),
    false,
    "Commander Hidden Missive should not log an unplaced activated-Ally troop",
  );
  const hiddenMissiveUnqualified = state.applyCardAgentEffect(
    hiddenMissive,
    { ...p2, deck: [hiddenMissiveDraw], discard: [], hand: [], garrison: 0 },
    p2,
  );
  assert.equal(hiddenMissiveUnqualified.source.hand.length, 0, "Hidden Missive should not draw below 2 Bene Gesserit Influence");
  assert.equal(hiddenMissiveUnqualified.source.garrison, 0, "Hidden Missive should not recruit below 2 Bene Gesserit Influence");
  assert.equal(hiddenMissiveUnqualified.log, undefined, "Hidden Missive should not log below its Influence threshold");
  const wheelsEffect = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, greatHouses: 2, spacing: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsEffect.source.resources,
    { solari: 2, spice: 1, water: 0 },
    "Wheels Within Wheels should gain its Agent Solari and spice through specs",
  );
  assert.match(wheelsEffect.log ?? "", /Wheels Within Wheels: gains 2 Solari and 1 spice/);
  const wheelsEmperorIconOnly = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, greatHouses: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsEmperorIconOnly.source.resources,
    { solari: 2, spice: 0, water: 0 },
    "Wheels Within Wheels should allow the Emperor-icon Influence reward independently",
  );
  const wheelsShaddamPersonalEmperor = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p4,
      influence: { ...p4.influence, emperor: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p4,
  );
  assert.deepEqual(
    wheelsShaddamPersonalEmperor.source.resources,
    { solari: 2, spice: 0, water: 0 },
    "Wheels Within Wheels should count Shaddam Commander personal Emperor Influence for the Emperor-icon reward",
  );
  const wheelsSpacingOnly = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, spacing: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsSpacingOnly.source.resources,
    { solari: 0, spice: 1, water: 0 },
    "Wheels Within Wheels should allow the Spacing Guild Influence reward independently",
  );
  const wheelsUnqualified = state.applyCardAgentEffect(
    wheelsWithinWheels,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(
    wheelsUnqualified.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Wheels Within Wheels should not gain resources below its Influence thresholds",
  );
  assert.equal(wheelsUnqualified.log, undefined, "Wheels Within Wheels should not log below its Influence thresholds");
  const wheelsRevealFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      hand: [wheelsWithinWheels],
      highCouncilSeat: false,
      persuasion: 0,
      playArea: [],
      revealed: false,
      spies: 1,
    })),
    sharedSpyPosts: {},
    spyPosts: {},
  };
  const wheelsRevealPlan = turnActions.revealTurnPlan(playerById(wheelsRevealFixture, p2.id), wheelsRevealFixture);
  assert.equal(wheelsRevealPlan.persuasion, 1, "Wheels Within Wheels should reveal for 1 persuasion through specs");
  assert.deepEqual(wheelsRevealPlan.printedRevealCards, [], "Wheels Within Wheels typed Reveal should not need manual fallback");
  const wheelsRevealed = turnActions.revealTurnAction(wheelsRevealFixture, {
    commanderTargets: {},
    revealPlan: wheelsRevealPlan,
  });
  assert.equal(wheelsRevealed.pendingAction?.kind, "spy", "Wheels Within Wheels Reveal should queue a spy placement");
  assert.equal(wheelsRevealed.pendingAction?.source, "Wheels Within Wheels");
  assert.equal(wheelsRevealed.pendingAction?.ownerId, p2.id);
  assert.equal(wheelsRevealed.pendingAction?.remaining, 1);
  assert.equal(wheelsRevealed.pendingAction?.mustPlaceSpy, true);
  assert.equal(playerById(wheelsRevealed, p2.id).persuasion, 1);
  const wheelsRevealSpySpace = state.placeableSpySpaces(wheelsRevealed, wheelsRevealed.pendingAction)[0];
  assert.ok(wheelsRevealSpySpace, "Wheels Within Wheels Reveal should have a legal spy placement space");
  const wheelsPlacedSpy = state.placeSpyForPending(wheelsRevealed, wheelsRevealed.pendingAction, wheelsRevealSpySpace.id);
  assert.equal(wheelsPlacedSpy.pendingAction, undefined, "Placing the Wheels Within Wheels reveal spy should clear pending");
  assert.equal(wheelsPlacedSpy.spyPosts[wheelsRevealSpySpace.id], p2.id, "Wheels Within Wheels should place the chosen spy");
  assert.equal(playerById(wheelsPlacedSpy, p2.id).spies, 0, "Wheels Within Wheels should spend the reveal spy");
  assert.match(wheelsPlacedSpy.log[0], /places a spy near .* from Wheels Within Wheels/);
  const wheelsRevealNoSpyFixture = {
    ...wheelsRevealFixture,
    players: wheelsRevealFixture.players.map((player) => player.id === p2.id ? { ...player, spies: 0 } : player),
  };
  const wheelsNoSpyPlan = turnActions.revealTurnPlan(playerById(wheelsRevealNoSpyFixture, p2.id), wheelsRevealNoSpyFixture);
  const wheelsNoSpyReveal = turnActions.revealTurnAction(wheelsRevealNoSpyFixture, {
    commanderTargets: {},
    revealPlan: wheelsNoSpyPlan,
  });
  assert.equal(
    wheelsNoSpyReveal.pendingAction,
    undefined,
    "Wheels Within Wheels should not pause Reveal when no spy can be placed",
  );
  const devastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    { ...p2, garrison: 0 },
  );
  assert.equal(devastatingAssaultEffect.source.resources.solari, 1, "Devastating Assault should gain 1 Agent Solari");
  assert.equal(devastatingAssaultEffect.target.garrison, 1, "Devastating Assault should recruit 1 troop for the activated Ally");
  assert.equal(devastatingAssaultEffect.recruitedTroops, 1, "Activated-Ally Agent recruits should be exposed for deployment limits");
  assert.match(devastatingAssaultEffect.log ?? "", /Devastating Assault: gains 1 Solari; .* recruits 1 troop/);
  const invalidDevastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    p4,
  );
  assert.equal(invalidDevastatingAssaultEffect.source.resources.solari, 0, "Routed Agent specs should not partially apply without an activated Ally");
  assert.equal(invalidDevastatingAssaultEffect.log, undefined, "Invalid routed Agent specs should not log");

  const manualCard = {
    ...convincingArgument,
    id: "effect-spec-manual-reveal",
    name: "Manual Reveal Fixture",
    conditionalPersuasion: true,
  };
  const manualFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    hand: [manualCard],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const manualPlan = turnActions.revealTurnPlan(playerById(manualFixture, p2.id), manualFixture);
  assert.deepEqual(manualPlan.printedRevealCards, [manualCard.name], "Manual reveal fallback should still be reported");
  const manualRevealed = turnActions.revealTurnAction(manualFixture, {
    commanderTargets: {},
    revealPlan: manualPlan,
  });
  assert.equal(manualRevealed.pendingAction?.kind, "reveal-adjust", "Manual reveal fallback should still queue reveal adjustment");

  console.log("card effect spec verification passed");
} finally {
  await server.close();
}
