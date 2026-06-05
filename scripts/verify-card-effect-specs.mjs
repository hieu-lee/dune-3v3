import assert from "node:assert/strict";
import { createServer } from "vite";
import { hasAgentEffect, hasRevealEffect, hasRevealSpec, plotSpec } from "./verify-card-effect-spec-helpers.mjs";
import { verifyCardEffectSpecAcquireConditionValidation } from "./verify-card-effect-spec-acquire-condition-validation.mjs";
import { verifyCardEffectSpecAgentSpyRevealValidation } from "./verify-card-effect-spec-agent-spy-reveal-validation.mjs";
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
import { verifyCardEffectSpecTroopDeploymentValidation } from "./verify-card-effect-spec-troop-deployment-validation.mjs";
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
  const theacherousManeuver = data.imperiumDeck.find((card) => card.name === "Treacherous Maneuver");
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
  const imperialPrivilege = data.boardSpaces.find((space) => space.id === "imperial-privilege");
  const economicSupport = data.boardSpaces.find((space) => space.id === "economic-support");
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
  assert.ok(arrakeen && acceptContract && haggaBasin && imperialBasin && secrets && highCouncil && imperialPrivilege && economicSupport && deliverSupplies && shipping && sietchTabr && militarySupport && spiceRefinery);
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
    boardSpaces: { deliverSupplies, highCouncil },
    cards: { convincingArgument, covertOperation, dagger, inHighPlaces },
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
    boardSpaces: { arrakeen, economicSupport },
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
    boardSpaces: { deliverSupplies },
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
    boardSpaces: { highCouncil, secrets, shipping },
    cards: { dangerousRhetoric, overthrow, subversiveAdvisor },
    game,
    players: { p2, p4 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecTroopDeploymentValidation({
    boardSpaces: { acceptContract, arrakeen, highCouncil, imperialBasin, militarySupport, secrets },
    cards: { fedaykinStilltent, reconnaissance, sardaukarCoordination, strikeFleet },
    game,
    players: { p2, p4, p6 },
    state,
    turnActions,
    withActivePlayer,
  });
  verifyCardEffectSpecAgentSpyRevealValidation({
    boardSpaces: { highCouncil, secrets },
    cards: { convincingArgument, dagger, devastatingAssault, doubleAgent, hiddenMissive, wheelsWithinWheels },
    game,
    players: { p2, p3, p4 },
    state,
    turnActions,
    withActivePlayer,
  });
  console.log("card effect spec verification passed");
} finally {
  await server.close();
}
