import assert from "node:assert/strict";
import { createServer } from "vite";
import { hasAgentEffect, hasRevealEffect, hasRevealSpec, plotSpec } from "./verify-card-effect-spec-helpers.mjs";
import { verifyCardEffectSpecAcquireConditionValidation } from "./verify-card-effect-spec-acquire-condition-validation.mjs";
import { verifyCardEffectSpecBeneWeirdingValidation } from "./verify-card-effect-spec-bene-weirding-validation.mjs";
import { verifyCardEffectSpecBoardInfluenceValidation } from "./verify-card-effect-spec-board-influence-validation.mjs";
import { verifyCardEffectSpecCatalogIntrigues } from "./verify-card-effect-spec-catalog-intrigues.mjs";
import { verifyCardEffectSpecChoiceValidation } from "./verify-card-effect-spec-choice-validation.mjs";
import { verifyCardEffectSpecCommanderLeader } from "./verify-card-effect-spec-commander-leader.mjs";
import { verifyCardEffectSpecCoreValidation } from "./verify-card-effect-spec-core-validation.mjs";
import { verifyCardEffectSpecContractCardValidation } from "./verify-card-effect-spec-contract-card-validation.mjs";
import { verifyCardEffectSpecCorrinthDeliveryValidation } from "./verify-card-effect-spec-corrinth-delivery-validation.mjs";
import { verifyCardEffectSpecDiscardManipulationValidation } from "./verify-card-effect-spec-discard-manipulation-validation.mjs";
import { verifyCardEffectSpecDrawTopDeckValidation } from "./verify-card-effect-spec-draw-top-deck-validation.mjs";
import { verifyCardEffectSpecImperiumAgentReveal } from "./verify-card-effect-spec-imperium-agent-reveal.mjs";
import { verifyCardEffectSpecImperiumContractAlliance } from "./verify-card-effect-spec-imperium-contract-alliance.mjs";
import { verifyCardEffectSpecImperiumMakerSpy } from "./verify-card-effect-spec-imperium-maker-spy.mjs";
import { verifyCardEffectSpecImperiumUtility } from "./verify-card-effect-spec-imperium-utility.mjs";
import { verifyCardEffectSpecIntrigueCombat } from "./verify-card-effect-spec-intrigue-combat.mjs";
import { verifyCardEffectSpecMakerFremenValidation } from "./verify-card-effect-spec-maker-fremen-validation.mjs";
import { verifyCardEffectSpecMarketImperiumCatalog } from "./verify-card-effect-spec-market-imperium-catalog.mjs";
import { verifyCardEffectSpecMercenaries } from "./verify-card-effect-spec-mercenaries.mjs";
import { verifyCardEffectSpecPendingRewardValidation } from "./verify-card-effect-spec-pending-reward-validation.mjs";
import { verifyCardEffectSpecPaymentInfluenceSandwormsValidation } from "./verify-card-effect-spec-payment-influence-sandworms-validation.mjs";
import { verifyCardEffectSpecPaymentTroopsDrawValidation } from "./verify-card-effect-spec-payment-troops-draw-validation.mjs";
import { verifyCardEffectSpecPaymentValidation } from "./verify-card-effect-spec-payment-validation.mjs";
import { verifyCardEffectSpecPlotInfluenceChoices } from "./verify-card-effect-spec-plot-influence-choices.mjs";
import { verifyCardEffectSpecPlotInfluenceRouting } from "./verify-card-effect-spec-plot-influence-routing.mjs";
import { verifyCardEffectSpecPlotResourcesVp } from "./verify-card-effect-spec-plot-resources-vp.mjs";
import { verifyCardEffectSpecPlotTroopsWorms } from "./verify-card-effect-spec-plot-troops-worms.mjs";
import { verifyCardEffectSpecRevealPending } from "./verify-card-effect-spec-reveal-pending.mjs";
import { verifyCardEffectSpecRecruitResourceValidation } from "./verify-card-effect-spec-recruit-resource-validation.mjs";
import { verifyCardEffectSpecResourceContractValidation } from "./verify-card-effect-spec-resource-contract-validation.mjs";
import { verifyCardEffectSpecRetreatValidation } from "./verify-card-effect-spec-retreat-validation.mjs";
import { verifyCardEffectSpecShaddamCommander } from "./verify-card-effect-spec-shaddam-commander.mjs";
import { verifyCardEffectSpecSmugglersHavenValidation } from "./verify-card-effect-spec-smugglers-haven-validation.mjs";
import { verifyCardEffectSpecSpacingGuildDiscardValidation } from "./verify-card-effect-spec-spacing-guild-discard-validation.mjs";
import { verifyCardEffectSpecSpacingGuildFavorDiscardValidation } from "./verify-card-effect-spec-spacing-guild-favor-discard-validation.mjs";
import { verifyCardEffectSpecSourceTrashValidation } from "./verify-card-effect-spec-source-trash-validation.mjs";
import { verifyCardEffectSpecSpyRecallValidation } from "./verify-card-effect-spec-spy-recall-validation.mjs";
import { verifyCardEffectSpecTrashIntrigueRewardValidation } from "./verify-card-effect-spec-trash-intrigue-reward-validation.mjs";
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
  verifyCardEffectSpecBeneWeirdingValidation({
    boardSpaces: { highCouncil, imperialBasin, secrets, shipping },
    cards: { beneGesseritOperative, weirdingWoman },
    game,
    players: { p2, p4, p6 },
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecDrawTopDeckValidation({
    cards: {
      convincingArgument,
      dagger,
      imperialSpymaster,
      leadership,
      longLiveTheFighters,
      maulaPistol,
      prepareTheWay,
      reconnaissance,
      sardaukarSoldier,
      theacherousManeuver,
    },
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecPendingRewardValidation({
    boardSpaces: { arrakeen },
    cards: {
      allySignet,
      convincingArgument,
      dagger,
      emperorSignet,
      publicSpectacle,
      theacherousManeuver,
      undercoverAsset,
    },
    game,
    groups: { marketAndImperiumCards },
    players: { p2, p4, p5, p6 },
    state,
  });
  verifyCardEffectSpecRecruitResourceValidation({
    boardSpaces: { arrakeen, haggaBasin, sietchTabr, spiceRefinery },
    cards: {
      cargoRunner,
      chani,
      convincingArgument,
      dagger,
      desertPower,
      ecologicalTestingStation,
      rebelSupplier,
      southernElders,
      stilgar,
      strikeFleet,
    },
    data,
    game,
    players: { p2, p3, p4 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecMakerFremenValidation({
    boardSpaces: { deliverSupplies, dutifulService, highCouncil, secrets },
    cards: { capturedMentat, makerKeeper, northernWatermaster, paracompass, reliableInformant, shishakli },
    fixtures: { fremenSupportCard },
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  const smugglersHavenConflict = data.conflictCards.find((card) => card.name === "CHOAM Security");
  assert.ok(smugglersHavenConflict, "Verifier needs an unprotected Conflict for Smuggler's Haven sandworms");
  verifyCardEffectSpecSmugglersHavenValidation({
    boardSpaces: { deliverSupplies, imperialBasin },
    cards: { smugglersHaven },
    fixtures: { smugglersHavenConflict },
    game,
    players: { p1, p2, p3 },
    state,
    turnActions,
    withActivePlayer,
  });
  const spaceTimeDrawOne = { ...convincingArgument, id: "space-time-draw-one-card" };
  const spaceTimeDrawTwo = { ...convincingArgument, id: "space-time-draw-two-card" };
  verifyCardEffectSpecSpacingGuildDiscardValidation({
    boardSpaces: { deliverSupplies, secrets },
    cards: {
      backedByChoam,
      buyAccess,
      convincingArgument,
      dagger,
      guildEnvoy,
      guildSpy,
      spaceTimeFolding,
    },
    fixtures: { spaceTimeDrawOne, spaceTimeDrawTwo },
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecTrashIntrigueRewardValidation({
    boardSpaces: { arrakeen, haggaBasin, imperialBasin, secrets },
    cards: {
      backedByChoam,
      branchingPath,
      buyAccess,
      intelligenceReport,
      junctionHeadquarters,
    },
    fixtures: { smugglersHavenConflict },
    game,
    players: { p2, p3, p4, p6 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecSpacingGuildFavorDiscardValidation({
    boardSpaces: { deliverSupplies },
    cards: {
      convincingArgument,
      sietchRitual,
      spacingGuildFavor,
      spaceTimeFolding,
    },
    fixtures: { spaceTimeDrawOne, spaceTimeDrawTwo },
    game,
    players: { p2, p5 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecSourceTrashValidation({
    boardSpaces: { highCouncil, imperialBasin },
    cards: {
      calculus,
      convincingArgument,
      dagger,
      desertSurvival,
      hiddenMissive,
      inHighPlaces,
      shishakli,
      treadInDarkness,
    },
    game,
    players: { p2 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecBoardInfluenceValidation({
    boardSpaces: { dutifulService, highCouncil, secrets, shipping },
    cards: { dangerousRhetoric, overthrow, subversiveAdvisor },
    game,
    players: { p2, p4 },
    state,
    turnActions,
    withActivePlayer,
  });
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
