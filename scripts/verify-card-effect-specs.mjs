import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function revealSpec(effects, conditions) {
  return {
    trigger: "reveal",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function agentSpec(effects, conditions) {
  return {
    trigger: "agent-play",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function plotSpec(effects, conditions) {
  return {
    trigger: "plot-intrigue",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function combatSpec(effects, conditions) {
  return {
    trigger: "combat-intrigue",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function acquireSpec(effects, conditions) {
  return {
    trigger: "acquire",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function discardSpec(effects, conditions) {
  return {
    trigger: "discard",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

function hasRevealSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "reveal") ?? false;
}

function hasAcquireSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "acquire") ?? false;
}

function hasAgentPlaySpec(card) {
  return card.effects?.some((spec) => spec.trigger === "agent-play") ?? false;
}

function hasAgentEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "agent-play" && spec.effects.some(predicate)) ?? false;
}

function hasAcquireEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "acquire" && spec.effects.some(predicate)) ?? false;
}

function hasPlotEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "plot-intrigue" && spec.effects.some(predicate)) ?? false;
}

function hasCombatEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "combat-intrigue" && spec.effects.some(predicate)) ?? false;
}

function hasRevealEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "reveal" && spec.effects.some(predicate)) ?? false;
}

function expectedFixedReveal(card) {
  return {
    persuasion: card.name === "Corrinth City" ? 5 : card.persuasion,
    revealGain: card.name === "Junction Headquarters"
      ? { water: 1 }
      : card.name === "Delivery Agreement"
        ? { spice: 1 }
        : card.revealGain
          ? { ...card.revealGain }
          : {},
    swords: card.swords,
  };
}

function hasFixedRevealReward(card) {
  return card.persuasion > 0 ||
    card.swords > 0 ||
    Object.values(card.revealGain ?? {}).some((amount) => (amount ?? 0) > 0);
}

function actualFixedReveal(turnActions, player, card) {
  const plan = turnActions.revealTurnPlan({ ...player, hand: [card], highCouncilSeat: false });
  return {
    persuasion: plan.persuasion,
    revealGain: plan.revealGain,
    swords: plan.swords,
  };
}

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
  assert.equal(revealSpecCards.length, 81, "Unexpected number of cards with declarative Reveal specs");
  assert.equal(
    marketAndImperiumCards.filter(hasFixedRevealReward).length,
    49,
    "Unexpected number of reserve/Imperium cards with fixed reveal rewards",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter((card) => hasFixedRevealReward(card) && !hasRevealSpec(card))
      .map((card) => card.name)
      .sort(),
    [],
    "Every reserve/Imperium fixed reveal reward should have a declarative Reveal spec",
  );
  assert.deepEqual(
    marketAndImperiumCards
      .filter((card) => !hasRevealSpec(card))
      .map((card) => card.name)
      .sort(),
    [
      "Priority Contracts",
      "The Spice Must Flow",
    ],
    "Only zero-reveal reserve/Imperium cards should lack declarative Reveal specs",
  );
  assert.deepEqual(
    marketAndImperiumCards.filter(hasAcquireSpec).map((card) => card.name).sort(),
    [
      "Guild Spy",
      "In High Places",
      "Interstellar Trade",
      "Overthrow",
      "Price is No Object",
      "Spy Network",
      "Strike Fleet",
      "Subversive Advisor",
      "The Spice Must Flow",
    ],
    "Only implemented acquisition reward cards should currently carry declarative Acquire specs",
  );
  assert.ok(
    councilorsAmbition.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-high-council-seat") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 2
      )
    ),
    "Councilor's Ambition should carry a typed High Council-gated Plot Intrigue water gain spec",
  );
  const councilorsAmbitionPlotResolved = effectResolver.resolveGameEffects(councilorsAmbition.effects, {
    trigger: "plot-intrigue",
    source: { ...p2, highCouncilSeat: true },
    state: game,
  });
  assert.equal(
    councilorsAmbitionPlotResolved.revealGain.water,
    2,
    "Councilor's Ambition Plot spec should resolve its water gain with a High Council seat",
  );
  const councilorsAmbitionNoSeatResolved = effectResolver.resolveGameEffects(councilorsAmbition.effects, {
    trigger: "plot-intrigue",
    source: { ...p2, highCouncilSeat: false },
    state: game,
  });
  assert.equal(
    councilorsAmbitionNoSeatResolved.revealGain.water,
    undefined,
    "Councilor's Ambition Plot spec should not resolve without a High Council seat",
  );
  assert.ok(
    hasPlotEffect(contingencyPlan, (effect) =>
      effect.kind === "gain-resource" &&
      effect.selector === "self" &&
      effect.resource === "solari" &&
      effect.amount === 2
    ),
    "Contingency Plan should carry a typed Plot Intrigue Solari gain spec",
  );
  const contingencyPlanPlotResolved = effectResolver.resolveGameEffects(contingencyPlan.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(
    contingencyPlanPlotResolved.revealGain.solari,
    2,
    "Contingency Plan Plot spec should resolve its Solari gain",
  );
  assert.ok(
    hasCombatEffect(contingencyPlan, (effect) =>
      effect.kind === "gain-strength" &&
      effect.selector === "self" &&
      effect.amount === 3
    ),
    "Contingency Plan should carry a typed Combat Intrigue strength spec",
  );
  const contingencyPlanCombatResolved = effectResolver.resolveGameEffects(contingencyPlan.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(
    contingencyPlanCombatResolved.swords,
    3,
    "Contingency Plan Combat spec should resolve its strength",
  );
  assert.ok(
    hasCombatEffect(impress, (effect) =>
      effect.kind === "gain-strength" &&
      effect.selector === "self" &&
      effect.amount === 2
    ),
    "Impress should carry a typed Combat Intrigue strength spec",
  );
  assert.ok(
    hasCombatEffect(impress, (effect) =>
      effect.kind === "acquire-card" &&
      effect.selector === "self" &&
      effect.maxCost === 3 &&
      effect.destination === "discard" &&
      effect.source === "Impress"
    ),
    "Impress should carry a typed Combat Intrigue acquire-card spec",
  );
  const impressCombatResolved = effectResolver.resolveGameEffects(impress.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(impressCombatResolved.swords, 2, "Impress Combat spec should resolve its strength");
  const impressAcquireEffects = effectResolver.resolveAcquireCards(impress.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(impressAcquireEffects.length, 1, "Impress Combat spec should resolve one acquire-card effect");
  assert.equal(impressAcquireEffects[0]?.selector, "self", "Impress acquisition should target self in the card spec");
  assert.equal(impressAcquireEffects[0]?.maxCost, 3, "Impress acquisition should cap card cost at 3");
  assert.equal(impressAcquireEffects[0]?.destination, "discard", "Impress acquisition should go to discard");
  assert.equal(impressAcquireEffects[0]?.optional, false, "Impress acquisition should be mandatory when available");
  assert.equal(impressAcquireEffects[0]?.source, "Impress", "Impress acquire-card effect should preserve its source");
  assert.ok(
    hasCombatEffect(findWeakness, (effect) =>
      effect.kind === "gain-strength" &&
      effect.selector === "self" &&
      effect.amount === 2
    ),
    "Find Weakness should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    findWeakness.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.strengthReward === 3 &&
        effect.optional === true &&
        effect.source === "Find Weakness"
      )
    ),
    "Find Weakness should carry a typed optional Combat spy-recall strength spec",
  );
  const findWeaknessBaseCombat = effectResolver.resolveGameEffects(findWeakness.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(findWeaknessBaseCombat.swords, 2, "Find Weakness Combat spec should resolve its base strength");
  assert.deepEqual(
    effectResolver.resolveCombatSpyRecallForStrengths(findWeakness.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Find Weakness spy-recall spec should not resolve without an owned spy post",
  );
  const findWeaknessSpyRecallEffects = effectResolver.resolveCombatSpyRecallForStrengths(findWeakness.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: { ...game, spyPosts: { [secrets.id]: p2.id }, sharedSpyPosts: {} },
  });
  assert.deepEqual(
    findWeaknessSpyRecallEffects,
    [{ selector: "self", amount: 1, strength: 3, optional: true, source: "Find Weakness" }],
    "Find Weakness spy-recall spec should resolve with one owned spy post",
  );
  assert.ok(
    goToGround.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max === 2 &&
        effect.source === "Go To Ground"
      )
    ),
    "Go To Ground should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    goToGround.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Go To Ground"
      )
    ),
    "Go To Ground should carry a typed Combat spy-placement spec",
  );
  const goToGroundCombatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 2,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(goToGround.effects, goToGroundCombatContext),
    [{ selector: "self", count: 2, min: 1, max: 2, source: "Go To Ground" }],
    "Go To Ground selected retreat spec should resolve the chosen troop count",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(goToGround.effects, goToGroundCombatContext).spyPlacements,
    [{
      count: 1,
      recallForSupply: undefined,
      mustPlace: undefined,
      placementIcon: undefined,
      allowSharedPost: undefined,
      source: "Go To Ground",
      postPlacementAction: undefined,
    }],
    "Go To Ground spy-placement spec should resolve through the generic effect resolver",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(goToGround.effects, {
      ...goToGroundCombatContext,
      choiceId: undefined,
    }).spyPlacements,
    [],
    "Go To Ground spy-placement spec should remain gated by the selected-retreat choice",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 3 &&
        effect.max === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed exact Combat troop-retreat spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed Combat spice gain spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed Combat spice spend spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 6
      )
    ),
    "Spice is Power should carry a typed spend-branch Combat strength spec",
  );
  const spiceIsPowerRetreatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 3,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(spiceIsPower.effects, spiceIsPowerRetreatContext),
    [{ selector: "self", count: 3, min: 3, max: 3, source: "Spice is Power" }],
    "Spice is Power retreat branch should resolve exactly three selected troops",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(spiceIsPower.effects, spiceIsPowerRetreatContext).revealGain,
    { spice: 3 },
    "Spice is Power retreat branch should resolve its typed spice gain",
  );
  const spiceIsPowerSpendResolved = effectResolver.resolveGameEffects(spiceIsPower.effects, {
    trigger: "combat-intrigue",
    choiceId: "spend-spice",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(spiceIsPowerSpendResolved.swords, 6, "Spice is Power spend branch should resolve typed Combat strength");
  assert.deepEqual(
    spiceIsPowerSpendResolved.spentResources,
    { spice: 3 },
    "Spice is Power spend branch should resolve its typed spice spend",
  );
  const spiceIsPowerNoChoice = effectResolver.resolveGameEffects(spiceIsPower.effects, {
    trigger: "combat-intrigue",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(spiceIsPowerNoChoice.swords, 0, "Spice is Power specs should remain choice-gated");
  assert.deepEqual(spiceIsPowerNoChoice.revealGain, {}, "Spice is Power should not gain spice without a branch choice");
  assert.deepEqual(spiceIsPowerNoChoice.spentResources, {}, "Spice is Power should not spend spice without a branch choice");
  assert.ok(
    tacticalOption.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "add-strength" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Tactical Option should carry a typed selected Combat strength branch spec",
  );
  assert.ok(
    tacticalOption.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max?.kind === "deployed-troops" &&
        effect.source === "Tactical Option"
      )
    ),
    "Tactical Option should carry a typed selected Combat dynamic troop-retreat spec",
  );
  const tacticalStrengthResolved = effectResolver.resolveGameEffects(tacticalOption.effects, {
    trigger: "combat-intrigue",
    choiceId: "add-strength",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(tacticalStrengthResolved.swords, 2, "Tactical Option strength branch should resolve typed Combat strength");
  const tacticalNoChoice = effectResolver.resolveGameEffects(tacticalOption.effects, {
    trigger: "combat-intrigue",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(tacticalNoChoice.swords, 0, "Tactical Option specs should remain choice-gated");
  const tacticalRetreatSource = { ...p2, deployedTroops: 4 };
  const tacticalRetreatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 4,
    source: tacticalRetreatSource,
    target: tacticalRetreatSource,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(tacticalOption.effects, tacticalRetreatContext),
    [{ selector: "self", count: 4, min: 1, max: 4, source: "Tactical Option" }],
    "Tactical Option selected retreat spec should resolve up to the source Ally's deployed troop count",
  );
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(tacticalOption.effects, {
      ...tacticalRetreatContext,
      selectedTroopCount: 5,
    }),
    [],
    "Tactical Option selected retreat spec should reject more than the source Ally's deployed troop count",
  );
  const tacticalCommanderTarget = { ...p6, deployedTroops: 3 };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(tacticalOption.effects, {
      trigger: "combat-intrigue",
      choiceId: "retreat-troops",
      selectedTroopCount: 3,
      source: p4,
      target: tacticalCommanderTarget,
      state: game,
    }),
    [{ selector: "self", count: 3, min: 1, max: 3, source: "Tactical Option" }],
    "Tactical Option selected retreat spec should resolve up to the Commander target Ally's deployed troop count",
  );
  assert.ok(
    hasCombatEffect(questionableMethods, (effect) =>
      effect.kind === "gain-strength" &&
      effect.selector === "self" &&
      effect.amount === 1
    ),
    "Questionable Methods should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    hasCombatEffect(questionableMethods, (effect) =>
      effect.kind === "lose-influence-for-strength" &&
      effect.selector === "self" &&
      effect.amount === 1 &&
      effect.strengthReward === 4 &&
      effect.owner === "combat-recipient" &&
      effect.alternateOwner === "source-commander-personal" &&
      effect.optional === true &&
      effect.source === "Questionable Methods"
    ),
    "Questionable Methods should carry a typed optional Combat Influence-loss strength spec",
  );
  const questionableCombatResolved = effectResolver.resolveGameEffects(questionableMethods.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(questionableCombatResolved.swords, 1, "Questionable Methods Combat spec should resolve its base strength");
  const choiceGatedCombatStrength = {
    ...questionableMethods,
    id: "effect-spec-choice-gated-combat-strength-card",
    name: "Effect Spec Choice Gated Combat Strength",
    combatSwords: undefined,
    automatedCombatSwords: undefined,
    effects: [{
      trigger: "combat-intrigue",
      choiceId: "add-strength",
      effects: [{ kind: "gain-strength", selector: "self", amount: 2 }],
    }],
  };
  assert.equal(
    state.combatIntrigueStrength(game, p2, choiceGatedCombatStrength),
    undefined,
    "Choice-gated Combat strength should not resolve without its selected choice",
  );
  assert.equal(
    state.combatIntrigueStrength(game, p2, choiceGatedCombatStrength, undefined, "add-strength"),
    2,
    "Choice-gated Combat strength should resolve when gameplay supplies the selected choice",
  );
  assert.deepEqual(
    effectResolver.resolveCombatInfluenceLossForStrengths(questionableMethods.effects, {
      trigger: "combat-intrigue",
      source: p4,
      target: p6,
      state: game,
    }),
    [{
      selector: "self",
      amount: 1,
      strength: 4,
      owner: "combat-recipient",
      alternateOwner: "source-commander-personal",
      optional: true,
      source: "Questionable Methods",
    }],
    "Questionable Methods Influence-loss spec should resolve with recipient and Commander-personal owner routing",
  );
  assert.ok(
    reachAgreement.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max === 2 &&
        effect.source === "Reach Agreement"
      )
    ),
    "Reach Agreement should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    reachAgreement.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.optional !== true &&
        effect.source === "Reach Agreement"
      )
    ),
    "Reach Agreement should carry a typed Combat contract pending spec",
  );
  const reachAgreementCombatContext = {
    trigger: "combat-intrigue",
    choiceId: "retreat-troops",
    selectedTroopCount: 2,
    source: p2,
    target: p2,
    state: game,
  };
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(reachAgreement.effects, reachAgreementCombatContext),
    [{ selector: "self", count: 2, min: 1, max: 2, source: "Reach Agreement" }],
    "Reach Agreement selected retreat spec should resolve the chosen troop count",
  );
  assert.deepEqual(
    effectResolver.resolveCombatRetreatTroops(reachAgreement.effects, {
      ...reachAgreementCombatContext,
      selectedTroopCount: undefined,
    }),
    [],
    "Reach Agreement selected retreat spec should require a selected troop count",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(reachAgreement.effects, reachAgreementCombatContext),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: "Reach Agreement" }],
    "Reach Agreement contract spec should resolve through the reusable take-contracts resolver",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(reachAgreement.effects, {
      ...reachAgreementCombatContext,
      choiceId: undefined,
    }),
    [],
    "Reach Agreement contract spec should remain gated by its selected-retreat choice",
  );
  assert.ok(
    springTheTrap.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.amount === 2 &&
        effect.strengthReward === 7 &&
        effect.source === "Spring The Trap" &&
        effect.optional !== true
      )
    ),
    "Spring The Trap should carry a typed required Combat spy-recall strength spec",
  );
  assert.deepEqual(
    effectResolver.resolveCombatSpyRecallForStrengths(springTheTrap.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: { ...game, spyPosts: { [secrets.id]: p2.id }, sharedSpyPosts: {} },
    }),
    [],
    "Spring The Trap spy-recall spec should not resolve with only one owned spy post",
  );
  const springTheTrapRecallEffects = effectResolver.resolveCombatSpyRecallForStrengths(springTheTrap.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: { ...game, spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id }, sharedSpyPosts: {} },
  });
  assert.deepEqual(
    springTheTrapRecallEffects,
    [{ selector: "self", amount: 2, strength: 7, optional: false, source: "Spring The Trap" }],
    "Spring The Trap spy-recall spec should resolve as a required two-spy recall",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Devour should carry a typed Combat recipient-gated base strength spec",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient-sandworms" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Devour should carry a typed Combat recipient sandworm strength bonus spec",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient-sandworms" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.optional === true
      )
    ),
    "Devour should carry a typed Combat recipient sandworm trash-card spec",
  );
  const devourAllyNoWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, deployedSandworms: 0 },
    state: game,
  });
  assert.equal(devourAllyNoWorm.swords, 2, "Devour should resolve two strength for an Ally without sandworms");
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(devour.effects, {
      trigger: "combat-intrigue",
      source: { ...p2, deployedSandworms: 0 },
      state: game,
    }),
    [],
    "Devour trash-card spec should not resolve for an Ally without sandworms",
  );
  const devourAllyWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, deployedSandworms: 1 },
    state: game,
  });
  assert.equal(devourAllyWorm.swords, 4, "Devour should resolve four strength for an Ally with a sandworm");
  const devourTrashEffects = effectResolver.resolveTrashCardEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, deployedSandworms: 1 },
    state: game,
  });
  assert.equal(devourTrashEffects.length, 1, "Devour should resolve one Combat trash-card effect with a sandworm");
  assert.equal(devourTrashEffects[0]?.selector, "self", "Devour trash-card effect should target self in the card spec");
  assert.equal(devourTrashEffects[0]?.optional, true, "Devour trash-card effect should be optional");
  const devourCommanderNoTarget = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: p4,
    state: game,
  });
  assert.equal(devourCommanderNoTarget.swords, 0, "Commander Devour should not resolve strength without a target");
  const devourCommanderTargetNoWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: p4,
    target: { ...p6, deployedSandworms: 0 },
    state: game,
  });
  assert.equal(devourCommanderTargetNoWorm.swords, 2, "Commander Devour should resolve two strength against a no-worm target Ally");
  const devourCommanderTargetWorm = effectResolver.resolveGameEffects(devour.effects, {
    trigger: "combat-intrigue",
    source: p4,
    target: { ...p6, deployedSandworms: 1 },
    state: game,
  });
  assert.equal(devourCommanderTargetWorm.swords, 4, "Commander Devour should resolve four strength against a target Ally with a sandworm");
  assert.ok(
    inspireAwe.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "to-discard" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.selector === "self" &&
        effect.maxCost === 3 &&
        effect.destination === "discard" &&
        effect.source === "Inspire Awe"
      )
    ),
    "Inspire Awe should carry a typed Plot acquire-card-to-discard spec",
  );
  assert.ok(
    inspireAwe.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "to-hand" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.selector === "self" &&
        effect.maxCost === 3 &&
        effect.destination === "hand" &&
        effect.source === "Inspire Awe"
      )
    ),
    "Inspire Awe should carry a typed Plot acquire-card-to-hand spec",
  );
  assert.deepEqual(
    effectResolver.resolveAcquireCards(inspireAwe.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Inspire Awe should not resolve a Plot acquire-card effect without a selected choice",
  );
  const inspireAweDiscardEffects = effectResolver.resolveAcquireCards(inspireAwe.effects, {
    trigger: "plot-intrigue",
    choiceId: "to-discard",
    source: p2,
    state: game,
  });
  assert.equal(inspireAweDiscardEffects.length, 1, "Inspire Awe discard choice should resolve one acquire-card effect");
  assert.equal(inspireAweDiscardEffects[0]?.selector, "self", "Inspire Awe discard acquisition should target self");
  assert.equal(inspireAweDiscardEffects[0]?.maxCost, 3, "Inspire Awe discard acquisition should cap card cost at 3");
  assert.equal(inspireAweDiscardEffects[0]?.destination, "discard", "Inspire Awe discard choice should acquire to discard");
  assert.equal(inspireAweDiscardEffects[0]?.optional, false, "Inspire Awe acquisition should be mandatory when available");
  assert.equal(inspireAweDiscardEffects[0]?.source, "Inspire Awe", "Inspire Awe acquire-card effect should preserve its source");
  const inspireAweHandEffects = effectResolver.resolveAcquireCards(inspireAwe.effects, {
    trigger: "plot-intrigue",
    choiceId: "to-hand",
    source: p2,
    state: game,
  });
  assert.equal(inspireAweHandEffects.length, 1, "Inspire Awe hand choice should resolve one acquire-card effect");
  assert.equal(inspireAweHandEffects[0]?.selector, "self", "Inspire Awe hand acquisition should target self");
  assert.equal(inspireAweHandEffects[0]?.maxCost, 3, "Inspire Awe hand acquisition should cap card cost at 3");
  assert.equal(inspireAweHandEffects[0]?.destination, "hand", "Inspire Awe hand choice should acquire to hand");
  assert.equal(inspireAweHandEffects[0]?.optional, false, "Inspire Awe hand acquisition should be mandatory when available");
  assert.equal(inspireAweHandEffects[0]?.source, "Inspire Awe", "Inspire Awe hand acquire-card effect should preserve its source");
  assert.ok(
    sietchRitual.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "bene" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card" &&
        effect.selector === "self" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      )
    ),
    "Sietch Ritual should carry a typed Ally discard-for-Bene Influence spec",
  );
  assert.ok(
    sietchRitual.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "fringeWorlds" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card" &&
        effect.selector === "self" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "fringeWorlds" &&
        effect.amount === 1
      )
    ),
    "Sietch Ritual should carry a typed Commander routed discard-for-Fringe Worlds Influence spec",
  );
  assert.ok(
    sietchRitual.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "fremen" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      )
    ),
    "Sietch Ritual should carry a typed Muad'Dib personal Fremen Influence spec",
  );
  assert.deepEqual(
    effectResolver.resolveDiscardCardEffects(sietchRitual.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Sietch Ritual should not resolve a discard-card effect without a selected choice",
  );
  const sietchDiscardEffects = effectResolver.resolveDiscardCardEffects(sietchRitual.effects, {
    trigger: "plot-intrigue",
    choiceId: "bene",
    source: p2,
    state: game,
  });
  assert.equal(sietchDiscardEffects.length, 1, "Sietch Ritual should resolve one selected discard effect");
  assert.equal(sietchDiscardEffects[0]?.selector, "self", "Sietch Ritual selected discard should target self");
  assert.equal(sietchDiscardEffects[0]?.amount, 1, "Sietch Ritual selected discard should discard one card");
  assert.equal(sietchDiscardEffects[0]?.optional, false, "Sietch Ritual selected discard should be mandatory");
  const sietchAllyResolved = effectResolver.resolveGameEffects(sietchRitual.effects, {
    trigger: "plot-intrigue",
    choiceId: "bene",
    source: p2,
    state: game,
  });
  assert.equal(sietchAllyResolved.influenceGains.bene, 1, "Ally Sietch Ritual should gain Bene Influence");
  assert.deepEqual(
    sietchAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Sietch Ritual should not route Influence to an activated Ally",
  );
  const sietchCommanderResolved = effectResolver.resolveGameEffects(sietchRitual.effects, {
    trigger: "plot-intrigue",
    choiceId: "bene",
    source: p4,
    target: p6,
    state: game,
  });
  assert.deepEqual(
    sietchCommanderResolved.influenceGains,
    {},
    "Commander Sietch Ritual should not gain main-board Bene Influence personally",
  );
  assert.equal(
    sietchCommanderResolved.activatedAlly.influenceGains.bene,
    1,
    "Commander Sietch Ritual should route main-board Bene Influence to the activated Ally",
  );
  const sietchMuadDibResolved = effectResolver.resolveGameEffects(sietchRitual.effects, {
    trigger: "plot-intrigue",
    choiceId: "fremen",
    source: p1,
    state: game,
  });
  assert.equal(
    sietchMuadDibResolved.influenceGains.fremen,
    1,
    "Muad'Dib Sietch Ritual should gain personal Fremen Influence",
  );
  assert.deepEqual(
    sietchMuadDibResolved.activatedAlly.influenceGains,
    {},
    "Muad'Dib personal Fremen Sietch Ritual should not route to an activated Ally",
  );
  assert.ok(
    cunning.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "draw" &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Cunning should carry a typed free Plot draw choice spec",
  );
  assert.ok(
    cunning.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "paid-trash" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 1
      )
    ),
    "Cunning should carry a typed paid Plot spice spend choice spec",
  );
  assert.ok(
    cunning.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "paid-trash" &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Cunning should carry a typed paid Plot draw choice spec",
  );
  assert.ok(
    cunning.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "paid-trash" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.optional === false
      )
    ),
    "Cunning should carry a typed mandatory Plot trash-card choice spec",
  );
  const cunningNoChoiceResolved = effectResolver.resolveGameEffects(cunning.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(cunningNoChoiceResolved.cardsToDraw, 0, "Cunning Plot specs should not draw without a selected choice");
  assert.deepEqual(
    cunningNoChoiceResolved.spentResources,
    {},
    "Cunning Plot specs should not spend spice without a selected choice",
  );
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(cunning.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Cunning Plot specs should not create a trash effect without a selected choice",
  );
  const cunningDrawResolved = effectResolver.resolveGameEffects(cunning.effects, {
    trigger: "plot-intrigue",
    choiceId: "draw",
    source: p2,
    state: game,
  });
  assert.equal(cunningDrawResolved.cardsToDraw, 1, "Cunning free Plot choice should draw 1 card");
  assert.deepEqual(cunningDrawResolved.spentResources, {}, "Cunning free Plot choice should not spend spice");
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(cunning.effects, {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: p2,
      state: game,
    }),
    [],
    "Cunning free Plot choice should not create a trash effect",
  );
  const cunningPaidResolved = effectResolver.resolveGameEffects(cunning.effects, {
    trigger: "plot-intrigue",
    choiceId: "paid-trash",
    source: p2,
    state: game,
  });
  assert.equal(cunningPaidResolved.spentResources.spice, 1, "Cunning paid Plot choice should spend 1 spice");
  assert.equal(cunningPaidResolved.cardsToDraw, 1, "Cunning paid Plot choice should draw 1 card");
  const cunningTrashEffects = effectResolver.resolveTrashCardEffects(cunning.effects, {
    trigger: "plot-intrigue",
    choiceId: "paid-trash",
    source: p2,
    state: game,
  });
  assert.equal(cunningTrashEffects.length, 1, "Cunning paid Plot choice should resolve one trash effect");
  assert.equal(cunningTrashEffects[0]?.selector, "self", "Cunning trash effect should target the source player");
  assert.equal(cunningTrashEffects[0]?.optional, false, "Cunning trash effect should be mandatory");
  assert.equal(cunningTrashEffects[0]?.excludeSource, false, "Cunning trash effect should not exclude a source card");
  assert.ok(
    distraction.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "deployed-units-this-turn" && condition.count === 3) &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.allowSharedPost === true &&
        effect.source === "Distraction"
      )
    ),
    "Distraction should carry a typed Plot shared spy placement spec gated by turn deployments",
  );
  const distractionPlotResolved = effectResolver.resolveGameEffects(distraction.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: { turnUnitDeployments: { [p2.id]: 3 } },
  });
  assert.equal(
    distractionPlotResolved.spyPlacements.length,
    1,
    "Distraction Plot spec should resolve a spy placement after three deployed units this turn",
  );
  assert.deepEqual(
    distractionPlotResolved.spyPlacements[0],
    {
      count: 1,
      recallForSupply: true,
      mustPlace: undefined,
      placementIcon: undefined,
      allowSharedPost: true,
      source: "Distraction",
      postPlacementAction: undefined,
    },
    "Distraction Plot spec should resolve the shared spy placement details",
  );
  const distractionBeforeDeployResolved = effectResolver.resolveGameEffects(distraction.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: { turnUnitDeployments: { [p2.id]: 2 } },
  });
  assert.deepEqual(
    distractionBeforeDeployResolved.spyPlacements,
    [],
    "Distraction Plot spec should not resolve before three deployed units this turn",
  );
  assert.ok(
    specialMission.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "place-spy" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true &&
        effect.placementIcon === "city" &&
        effect.source === "Special Mission"
      )
    ),
    "Special Mission should carry a typed Plot City spy placement choice spec",
  );
  const specialMissionNoChoiceResolved = effectResolver.resolveGameEffects(specialMission.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    specialMissionNoChoiceResolved.spyPlacements,
    [],
    "Special Mission Plot choice spec should not place spies without a selected choice",
  );
  const specialMissionPlaceSpyResolved = effectResolver.resolveGameEffects(specialMission.effects, {
    trigger: "plot-intrigue",
    choiceId: "place-spy",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    specialMissionPlaceSpyResolved.spyPlacements,
    [
      {
        count: 1,
        recallForSupply: true,
        mustPlace: true,
        placementIcon: "city",
        allowSharedPost: undefined,
        source: "Special Mission",
        postPlacementAction: undefined,
      },
    ],
    "Special Mission Plot place-spy choice should resolve a mandatory City spy placement",
  );
  assert.ok(
    specialMission.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "recall-spy" &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.source === "Special Mission" &&
        effect.reward?.resource === "spice" &&
        effect.reward?.amount === 2 &&
        effect.removeShieldWall === true
      )
    ),
    "Special Mission should carry a typed Plot spy recall reward spec",
  );
  const specialMissionRecallWithoutSpaceResolved = effectResolver.resolveGameEffects(specialMission.effects, {
    trigger: "plot-intrigue",
    choiceId: "recall-spy",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    specialMissionRecallWithoutSpaceResolved.spyRecalls,
    [],
    "Special Mission Plot recall choice should not recall a spy without a selected space",
  );
  assert.deepEqual(
    specialMissionRecallWithoutSpaceResolved.revealGain,
    {},
    "Special Mission Plot recall choice should not gain spice without a selected space",
  );
  assert.equal(
    specialMissionRecallWithoutSpaceResolved.removeShieldWall,
    false,
    "Special Mission Plot recall choice should not remove the Shield Wall without a selected space",
  );
  const specialMissionRecallSpace = data.boardSpaces.find((space) => space.icon !== "city");
  assert.ok(specialMissionRecallSpace, "Expected a non-City space for Special Mission recall spec verification");
  const specialMissionRecallResolved = effectResolver.resolveGameEffects(specialMission.effects, {
    trigger: "plot-intrigue",
    choiceId: "recall-spy",
    source: p2,
    space: specialMissionRecallSpace,
    state: game,
  });
  assert.deepEqual(
    specialMissionRecallResolved.spyRecalls,
    [{ spaceId: specialMissionRecallSpace.id, source: "Special Mission" }],
    "Special Mission Plot recall choice should resolve the selected spy recall",
  );
  assert.deepEqual(
    specialMissionRecallResolved.revealGain,
    { spice: 2 },
    "Special Mission Plot recall choice should resolve its spice reward",
  );
  assert.equal(
    specialMissionRecallResolved.removeShieldWall,
    true,
    "Special Mission Plot recall choice should resolve Shield Wall removal",
  );
  assert.ok(
    hasPlotEffect(leverage, (effect) =>
      effect.kind === "gain-resource" &&
      effect.selector === "self" &&
      effect.resource === "solari" &&
      effect.amount === 1
    ),
    "Leverage should carry a typed Plot Intrigue Solari gain spec",
  );
  assert.ok(
    leverage.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "gained-spice-this-turn") &&
      spec.effects.some((effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.optional === true &&
        effect.source === "Leverage"
      )
    ),
    "Leverage should carry a typed Plot Intrigue public-contract pending spec gated by turn spice gain",
  );
  const leveragePlotResolved = effectResolver.resolveGameEffects(leverage.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: { turnSpiceGains: { [p2.id]: 1 } },
  });
  assert.equal(leveragePlotResolved.revealGain.solari, 1, "Leverage Plot spec should resolve its Solari gain after a spice gain");
  const leverageContractEffects = effectResolver.resolveTakeContracts(leverage.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: { turnSpiceGains: { [p2.id]: 1 } },
  });
  assert.deepEqual(
    leverageContractEffects,
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: true, source: "Leverage" }],
    "Leverage Plot spec should resolve a reusable optional public-contract effect",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(leverage.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnSpiceGains: {} },
    }),
    [],
    "Leverage Plot contract spec should not resolve without a turn spice gain",
  );
  assert.ok(
    manipulate.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "manipulate-row-card" &&
        effect.selector === "self" &&
        effect.source === "Manipulate"
      )
    ),
    "Manipulate should carry a typed Plot row-manipulation spec",
  );
  assert.deepEqual(
    effectResolver.resolveManipulateRowCards(manipulate.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [{ selector: "self", source: "Manipulate" }],
    "Manipulate Plot spec should resolve a reusable row-manipulation effect",
  );
  assert.deepEqual(
    effectResolver.resolveManipulateRowCards(manipulate.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    [],
    "Manipulate row-manipulation specs should not resolve for other triggers",
  );
  assert.ok(
    intelligenceReport.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      !spec.conditions &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Intelligence Report should carry a typed Plot card draw spec",
  );
  assert.ok(
    intelligenceReport.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Intelligence Report should carry a typed spy-count-gated Plot card draw spec",
  );
  assert.equal(
    effectResolver.resolveGameEffects(intelligenceReport.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: {
        spyPosts: { arrakeen: "p2", "hagga-basin": "p3" },
        sharedSpyPosts: {},
      },
    }).cardsToDraw,
    1,
    "Intelligence Report Plot spec should draw only 1 card below two own spy posts",
  );
  assert.equal(
    effectResolver.resolveGameEffects(intelligenceReport.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: {
        spyPosts: { arrakeen: "p2", "hagga-basin": "p2" },
        sharedSpyPosts: {},
      },
    }).cardsToDraw,
    2,
    "Intelligence Report Plot spec should draw 2 cards with two own spy posts",
  );
  assert.ok(
    hasPlotEffect(mercenaries, (effect) =>
      effect.kind === "spend-resource" &&
      effect.selector === "self" &&
      effect.resource === "solari" &&
      effect.amount === 3
    ),
    "Mercenaries should carry a typed Plot Solari spend spec",
  );
  assert.ok(
    hasPlotEffect(mercenaries, (effect) =>
      effect.kind === "draw-intrigues" &&
      effect.selector === "self" &&
      effect.amount === 1
    ),
    "Mercenaries should carry a typed Plot Intrigue draw spec",
  );
  assert.ok(
    mercenaries.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Mercenaries should carry a typed Plot self troop recruit spec for Allies",
  );
  assert.ok(
    mercenaries.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 2
      )
    ),
    "Mercenaries should carry a typed Plot activated-Ally troop recruit spec for Commanders",
  );
  const mercenariesAllyResolved = effectResolver.resolveGameEffects(mercenaries.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(mercenariesAllyResolved.spentResources.solari, 3, "Mercenaries Plot spec should spend 3 Solari");
  assert.equal(mercenariesAllyResolved.intriguesToDraw, 1, "Mercenaries Plot spec should draw 1 Intrigue");
  assert.equal(mercenariesAllyResolved.recruitedTroops, 2, "Mercenaries Plot spec should recruit for Ally actors");
  const mercenariesCommanderResolved = effectResolver.resolveGameEffects(mercenaries.effects, {
    trigger: "plot-intrigue",
    source: p4,
    target: p6,
    state: game,
  });
  assert.equal(
    mercenariesCommanderResolved.spentResources.solari,
    3,
    "Commander Mercenaries Plot spec should spend Commander Solari",
  );
  assert.equal(
    mercenariesCommanderResolved.intriguesToDraw,
    1,
    "Commander Mercenaries Plot spec should draw an Intrigue for the Commander",
  );
  assert.equal(
    mercenariesCommanderResolved.activatedAlly.recruitedTroops,
    2,
    "Mercenaries Plot spec should route Commander troop recruitment to the activated Ally",
  );
  const mercenariesNoSupplyCard = { ...mercenaries, id: "mercenaries-no-supply-fixture" };
  const mercenariesNoSupplyDraw = { ...backedByChoam, id: "mercenaries-no-supply-draw" };
  const mercenariesNoSupplyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      deployedTroops: 0,
      garrison: 12,
      intrigues: [mercenariesNoSupplyCard],
      jessicaMemories: 0,
      resources: { ...p2.resources, solari: 3 },
    })),
    intrigueDeck: [mercenariesNoSupplyDraw],
    intrigueDiscard: [],
  };
  const mercenariesNoSupplyPlayed = state.playMercenariesPlotIntrigue(
    mercenariesNoSupplyFixture,
    p2.id,
    mercenariesNoSupplyCard.id,
  );
  const mercenariesNoSupplyOwner = playerById(mercenariesNoSupplyPlayed, p2.id);
  assert.equal(
    mercenariesNoSupplyOwner.garrison,
    12,
    "Mercenaries should not recruit beyond the Ally troop supply",
  );
  assert.equal(mercenariesNoSupplyOwner.resources.solari, 0, "Mercenaries should still spend Solari when troop supply is capped");
  assert.equal(
    mercenariesNoSupplyOwner.intrigues.some((card) => card.id === mercenariesNoSupplyCard.id),
    false,
    "Mercenaries should discard the played Intrigue when troop supply is capped",
  );
  assert.equal(
    mercenariesNoSupplyOwner.intrigues.some((card) => card.id === mercenariesNoSupplyDraw.id),
    true,
    "Mercenaries should still draw its Intrigue when troop supply is capped",
  );
  assert.match(mercenariesNoSupplyPlayed.log[0] ?? "", /plays Mercenaries, spends 3 Solari\./);
  assert.equal(
    mercenariesNoSupplyPlayed.log[0]?.includes("recruits"),
    false,
    "Mercenaries should not log unplaced Ally troops",
  );
  const mercenariesCommanderNoSupplyCard = { ...mercenaries, id: "mercenaries-commander-no-supply-fixture" };
  const mercenariesCommanderNoSupplyDraw = { ...backedByChoam, id: "mercenaries-commander-no-supply-draw" };
  const mercenariesCommanderNoSupplyBase = withActivePlayer(game, p4.id, () => ({
    garrison: 0,
    intrigues: [mercenariesCommanderNoSupplyCard],
    resources: { ...p4.resources, solari: 3 },
  }));
  const mercenariesCommanderNoSupplyFixture = {
    ...mercenariesCommanderNoSupplyBase,
    intrigueDeck: [mercenariesCommanderNoSupplyDraw],
    intrigueDiscard: [],
    players: mercenariesCommanderNoSupplyBase.players.map((player) =>
      player.id === p6.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player
    ),
  };
  const mercenariesCommanderNoSupplyPlayed = state.playMercenariesPlotIntrigue(
    mercenariesCommanderNoSupplyFixture,
    p4.id,
    mercenariesCommanderNoSupplyCard.id,
    p6.id,
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).garrison,
    0,
    "Commander Mercenaries should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p6.id).garrison,
    12,
    "Commander Mercenaries should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).resources.solari,
    0,
    "Commander Mercenaries should still spend Commander Solari when activated Ally supply is capped",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).intrigues.some((card) =>
      card.id === mercenariesCommanderNoSupplyDraw.id
    ),
    true,
    "Commander Mercenaries should still draw its Intrigue when activated Ally supply is capped",
  );
  assert.equal(
    mercenariesCommanderNoSupplyPlayed.log[0]?.includes(`${p6.leader} recruits`),
    false,
    "Commander Mercenaries should not log unplaced activated-Ally troops",
  );
  const opportunismFactions = ["emperor", "spacing", "bene", "fremen", "greatHouses", "fringeWorlds"];
  const opportunismChoiceIds = opportunismFactions.flatMap((first, firstIndex) =>
    opportunismFactions.slice(firstIndex).map((second) => `${first}+${second}`)
  );
  assert.deepEqual(
    opportunism.effects
      ?.filter((spec) => spec.trigger === "plot-intrigue")
      .map((spec) => spec.choiceId)
      .sort(),
    opportunismChoiceIds.sort(),
    "Opportunism should carry typed Plot choice specs for every payable influence-loss pair shape",
  );
  assert.ok(
    opportunism.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spacing+bene" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "spacing" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Opportunism should carry a typed mixed Influence-loss Solari-for-VP Plot choice spec",
  );
  assert.ok(
    opportunism.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "bene+bene" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Opportunism should carry a typed same-Faction Influence-loss Plot choice spec",
  );
  const opportunismNoChoiceResolved = effectResolver.resolveGameEffects(opportunism.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    opportunismNoChoiceResolved.spentResources,
    {},
    "Opportunism Plot choice specs should not spend Solari without a selected choice",
  );
  assert.deepEqual(
    opportunismNoChoiceResolved.influenceLosses,
    {},
    "Opportunism Plot choice specs should not lose Influence without a selected choice",
  );
  assert.equal(opportunismNoChoiceResolved.vp, 0, "Opportunism Plot choice specs should not score VP without a selected choice");
  const opportunismSpacingBeneResolved = effectResolver.resolveGameEffects(opportunism.effects, {
    trigger: "plot-intrigue",
    choiceId: "spacing+bene",
    source: p2,
    state: game,
  });
  assert.equal(opportunismSpacingBeneResolved.spentResources.solari, 2, "Opportunism mixed choice should spend 2 Solari");
  assert.equal(opportunismSpacingBeneResolved.influenceLosses.spacing, 1, "Opportunism mixed choice should lose 1 Spacing Guild Influence");
  assert.equal(opportunismSpacingBeneResolved.influenceLosses.bene, 1, "Opportunism mixed choice should lose 1 Bene Gesserit Influence");
  assert.equal(opportunismSpacingBeneResolved.vp, 1, "Opportunism mixed choice should gain 1 VP");
  const opportunismBeneBeneResolved = effectResolver.resolveGameEffects(opportunism.effects, {
    trigger: "plot-intrigue",
    choiceId: "bene+bene",
    source: p2,
    state: game,
  });
  assert.equal(opportunismBeneBeneResolved.spentResources.solari, 2, "Opportunism same-Faction choice should spend 2 Solari");
  assert.equal(opportunismBeneBeneResolved.influenceLosses.bene, 2, "Opportunism same-Faction choice should aggregate two Influence losses");
  assert.equal(opportunismBeneBeneResolved.vp, 1, "Opportunism same-Faction choice should gain 1 VP");
  const changeAllegiancesPlotSpecs = changeAllegiances.effects?.filter((spec) => spec.trigger === "plot-intrigue") ?? [];
  assert.equal(
    changeAllegiancesPlotSpecs.length,
    394,
    "Change Allegiances should carry typed Plot choice specs for Ally, Shaddam, and Muad'Dib influence options",
  );
  assert.ok(
    changeAllegiances.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "shift:greatHouses->bene" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      )
    ),
    "Change Allegiances should carry a typed Ally Influence shift spec",
  );
  assert.ok(
    changeAllegiances.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spend:spacing" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "spacing" &&
        effect.amount === 1
      )
    ),
    "Change Allegiances should carry a typed Ally spice-for-Influence spec",
  );
  assert.ok(
    changeAllegiances.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "both:greatHouses->bene+spend:spacing" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "spacing" &&
        effect.amount === 1
      )
    ),
    "Change Allegiances should carry a typed Ally both-rows spec",
  );
  assert.ok(
    changeAllegiances.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "shift:bene->emperor" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "bene" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "emperor" &&
        effect.amount === 1
      )
    ),
    "Change Allegiances should carry a typed Shaddam routed-loss personal-gain shift spec",
  );
  assert.ok(
    changeAllegiances.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "both:fremen->fringeWorlds+spend:fremen" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "fringeWorlds" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      )
    ),
    "Change Allegiances should carry a typed Muad'Dib personal and routed both-rows spec",
  );
  const changeAllegiancesNoChoiceResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.spentResources,
    {},
    "Change Allegiances Plot choice specs should not spend spice without a selected choice",
  );
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.influenceLosses,
    {},
    "Change Allegiances Plot choice specs should not lose Influence without a selected choice",
  );
  assert.deepEqual(
    changeAllegiancesNoChoiceResolved.influenceGains,
    {},
    "Change Allegiances Plot choice specs should not gain Influence without a selected choice",
  );
  const changeAllegiancesAllyShiftResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "shift:greatHouses->bene",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    changeAllegiancesAllyShiftResolved.influenceAdjustments,
    [
      { selector: "self", faction: "greatHouses", amount: -1 },
      { selector: "self", faction: "bene", amount: 1 },
    ],
    "Ally Change Allegiances shift should resolve ordered self Influence adjustments",
  );
  assert.equal(
    changeAllegiancesAllyShiftResolved.influenceLosses.greatHouses,
    1,
    "Ally Change Allegiances shift should record the selected Influence loss",
  );
  assert.equal(
    changeAllegiancesAllyShiftResolved.influenceGains.bene,
    1,
    "Ally Change Allegiances shift should record the selected Influence gain",
  );
  const changeAllegiancesAllyBothResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "both:greatHouses->bene+spend:spacing",
    source: p2,
    state: game,
  });
  assert.equal(changeAllegiancesAllyBothResolved.spentResources.spice, 3, "Change Allegiances both rows should spend 3 spice");
  assert.deepEqual(
    changeAllegiancesAllyBothResolved.influenceAdjustments,
    [
      { selector: "self", faction: "greatHouses", amount: -1 },
      { selector: "self", faction: "bene", amount: 1 },
      { selector: "self", faction: "spacing", amount: 1 },
    ],
    "Ally Change Allegiances both rows should resolve loss before both gains",
  );
  const changeAllegiancesShaddamShiftResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "shift:bene->emperor",
    source: p4,
    target: p6,
    state: game,
  });
  assert.deepEqual(
    changeAllegiancesShaddamShiftResolved.influenceAdjustments,
    [
      { selector: "activated-ally", faction: "bene", amount: -1 },
      { selector: "self", faction: "emperor", amount: 1 },
    ],
    "Shaddam Change Allegiances should route main-board losses to the activated Ally and personal gains to self",
  );
  assert.equal(
    changeAllegiancesShaddamShiftResolved.influenceGains.emperor,
    1,
    "Shaddam Change Allegiances should record personal Emperor Influence gains",
  );
  const changeAllegiancesShaddamRoutedSpendResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend:greatHouses",
    source: p4,
    target: p6,
    state: game,
  });
  assert.equal(
    changeAllegiancesShaddamRoutedSpendResolved.spentResources.spice,
    3,
    "Shaddam Change Allegiances routed spend should spend Commander spice",
  );
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendResolved.influenceGains,
    {},
    "Shaddam Change Allegiances routed spend should not put game-board Influence on the Commander",
  );
  assert.equal(
    changeAllegiancesShaddamRoutedSpendResolved.activatedAlly.influenceGains.greatHouses,
    1,
    "Shaddam Change Allegiances routed spend should put game-board Influence on the activated Ally",
  );
  const changeAllegiancesShaddamRoutedSpendNoTarget = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend:greatHouses",
    source: p4,
    state: game,
  });
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendNoTarget.spentResources,
    {},
    "Commander Change Allegiances routed specs should not resolve without an activated Ally target",
  );
  assert.deepEqual(
    changeAllegiancesShaddamRoutedSpendNoTarget.activatedAlly.influenceGains,
    {},
    "Commander Change Allegiances routed specs should not gain activated Ally Influence without a target",
  );
  const changeAllegiancesShaddamPersonalSpendResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend:emperor",
    source: p4,
    state: game,
  });
  assert.equal(
    changeAllegiancesShaddamPersonalSpendResolved.influenceGains.emperor,
    1,
    "Shaddam Change Allegiances personal Emperor spend should resolve without an activated Ally target",
  );
  const changeAllegiancesMuadDibBothResolved = effectResolver.resolveGameEffects(changeAllegiances.effects, {
    trigger: "plot-intrigue",
    choiceId: "both:fremen->fringeWorlds+spend:fremen",
    source: p1,
    target: p5,
    state: game,
  });
  assert.equal(
    changeAllegiancesMuadDibBothResolved.spentResources.spice,
    3,
    "Muad'Dib Change Allegiances both rows should spend Commander spice",
  );
  assert.deepEqual(
    changeAllegiancesMuadDibBothResolved.influenceAdjustments,
    [
      { selector: "self", faction: "fremen", amount: -1 },
      { selector: "activated-ally", faction: "fringeWorlds", amount: 1 },
      { selector: "self", faction: "fremen", amount: 1 },
    ],
    "Muad'Dib Change Allegiances should keep personal Fremen adjustments on self and route main-board gains",
  );
  assert.ok(
    buyAccess.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "greatHouses+bene" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      )
    ),
    "Buy Access should carry a typed Ally Great Houses plus Bene Gesserit Plot choice spec",
  );
  assert.ok(
    buyAccess.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "emperor+bene" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "emperor" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "bene" &&
        effect.amount === 1
      )
    ),
    "Buy Access should carry a typed Shaddam personal Emperor plus routed Bene Gesserit Plot choice spec",
  );
  assert.ok(
    buyAccess.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "greatHouses+fremen" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      )
    ),
    "Buy Access should carry a typed Muad'Dib routed Great Houses plus personal Fremen Plot choice spec",
  );
  assert.equal(
    buyAccess.effects?.some((spec) => spec.trigger === "plot-intrigue" && spec.choiceId === "emperor+greatHouses"),
    false,
    "Buy Access typed specs should not allow both mappings of the printed Emperor icon",
  );
  assert.equal(
    buyAccess.effects?.some((spec) => spec.trigger === "plot-intrigue" && spec.choiceId === "fremen+fringeWorlds"),
    false,
    "Buy Access typed specs should not allow both mappings of the printed Fremen icon",
  );
  const buyAccessAllyResolved = effectResolver.resolveGameEffects(buyAccess.effects, {
    trigger: "plot-intrigue",
    choiceId: "greatHouses+bene",
    source: p2,
    state: game,
  });
  assert.equal(buyAccessAllyResolved.spentResources.solari, 5, "Ally Buy Access should spend 5 Solari");
  assert.equal(buyAccessAllyResolved.influenceGains.greatHouses, 1, "Ally Buy Access should gain Great Houses Influence");
  assert.equal(buyAccessAllyResolved.influenceGains.bene, 1, "Ally Buy Access should gain Bene Gesserit Influence");
  assert.deepEqual(
    buyAccessAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Buy Access should not route Influence to an activated Ally",
  );
  const buyAccessShaddamResolved = effectResolver.resolveGameEffects(buyAccess.effects, {
    trigger: "plot-intrigue",
    choiceId: "emperor+bene",
    source: p4,
    target: p6,
    state: game,
  });
  assert.equal(buyAccessShaddamResolved.spentResources.solari, 5, "Shaddam Buy Access should spend 5 Solari");
  assert.equal(buyAccessShaddamResolved.influenceGains.emperor, 1, "Shaddam Buy Access should gain personal Emperor Influence");
  assert.equal(
    buyAccessShaddamResolved.activatedAlly.influenceGains.bene,
    1,
    "Shaddam Buy Access should route game-board Influence to the activated Ally",
  );
  const buyAccessMuadDibResolved = effectResolver.resolveGameEffects(buyAccess.effects, {
    trigger: "plot-intrigue",
    choiceId: "greatHouses+fremen",
    source: p1,
    target: p5,
    state: game,
  });
  assert.equal(buyAccessMuadDibResolved.spentResources.solari, 5, "Muad'Dib Buy Access should spend 5 Solari");
  assert.equal(buyAccessMuadDibResolved.influenceGains.fremen, 1, "Muad'Dib Buy Access should gain personal Fremen Influence");
  assert.equal(
    buyAccessMuadDibResolved.activatedAlly.influenceGains.greatHouses,
    1,
    "Muad'Dib Buy Access should route game-board Influence to the activated Ally",
  );
  assert.ok(
    imperiumPolitics.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "greatHouses" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      )
    ),
    "Imperium Politics should carry a typed Ally Great Houses Plot choice spec",
  );
  assert.ok(
    imperiumPolitics.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "greatHouses" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "activated-ally" &&
        effect.faction === "greatHouses" &&
        effect.amount === 1
      )
    ),
    "Imperium Politics should carry a typed Commander routed Great Houses Plot choice spec",
  );
  assert.ok(
    imperiumPolitics.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "emperor" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "emperor" &&
        effect.amount === 1
      )
    ),
    "Imperium Politics should carry a typed Shaddam personal Emperor Plot choice spec",
  );
  const imperiumPoliticsAllyResolved = effectResolver.resolveGameEffects(imperiumPolitics.effects, {
    trigger: "plot-intrigue",
    choiceId: "greatHouses",
    source: p2,
    state: game,
  });
  assert.equal(imperiumPoliticsAllyResolved.spentResources.solari, 1, "Ally Imperium Politics should spend 1 Solari");
  assert.equal(imperiumPoliticsAllyResolved.influenceGains.greatHouses, 1, "Ally Imperium Politics should gain Great Houses Influence");
  assert.deepEqual(
    imperiumPoliticsAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Imperium Politics should not route Influence to an activated Ally",
  );
  const imperiumPoliticsCommanderResolved = effectResolver.resolveGameEffects(imperiumPolitics.effects, {
    trigger: "plot-intrigue",
    choiceId: "greatHouses",
    source: p4,
    target: p6,
    state: game,
  });
  assert.equal(
    imperiumPoliticsCommanderResolved.spentResources.solari,
    1,
    "Commander Imperium Politics should spend Commander Solari",
  );
  assert.deepEqual(
    imperiumPoliticsCommanderResolved.influenceGains,
    {},
    "Commander main-board Imperium Politics should not put game-board Influence on the Commander",
  );
  assert.equal(
    imperiumPoliticsCommanderResolved.activatedAlly.influenceGains.greatHouses,
    1,
    "Commander main-board Imperium Politics should route Influence to the activated Ally",
  );
  const imperiumPoliticsShaddamResolved = effectResolver.resolveGameEffects(imperiumPolitics.effects, {
    trigger: "plot-intrigue",
    choiceId: "emperor",
    source: p4,
    state: game,
  });
  assert.equal(imperiumPoliticsShaddamResolved.spentResources.solari, 1, "Shaddam Imperium Politics should spend 1 Solari");
  assert.equal(imperiumPoliticsShaddamResolved.influenceGains.emperor, 1, "Shaddam Imperium Politics should gain personal Emperor Influence");
  const imperiumPoliticsMuadDibEmperorResolved = effectResolver.resolveGameEffects(imperiumPolitics.effects, {
    trigger: "plot-intrigue",
    choiceId: "emperor",
    source: p1,
    state: game,
  });
  assert.deepEqual(
    imperiumPoliticsMuadDibEmperorResolved.spentResources,
    {},
    "Muad'Dib Imperium Politics should not resolve the Shaddam-only Emperor choice",
  );
  assert.deepEqual(
    imperiumPoliticsMuadDibEmperorResolved.influenceGains,
    {},
    "Muad'Dib Imperium Politics should not gain Emperor Influence",
  );
  const typedSequentialInfluence = {
    ...imperiumPolitics,
    id: "intrigue-typed-sequential-influence",
    name: "Typed Sequential Influence",
    effects: [plotSpec([
      { kind: "lose-influence", selector: "self", faction: "bene", amount: 1 },
      { kind: "gain-influence", selector: "self", faction: "bene", amount: 1 },
    ])],
  };
  const typedSequentialInfluenceFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      leader: "Lady Margot Fenring",
      resources: { ...player.resources, spice: 0 },
      influence: { ...player.influence, bene: 2 },
      intrigues: [typedSequentialInfluence],
    })),
    intrigueDiscard: [],
    turnSpiceGains: {},
  };
  const typedSequentialInfluencePlayed = plotIntrigueEffectRules.playTypedPlotIntrigue(
    typedSequentialInfluenceFixture,
    "p2",
    typedSequentialInfluence.id,
    (intrigue) => intrigue.id === typedSequentialInfluence.id,
    (player) => `${player.leader} plays Typed Sequential Influence.`,
  );
  assert.equal(
    playerById(typedSequentialInfluencePlayed, "p2").influence.bene,
    2,
    "Typed Plot ordered Influence adjustments should preserve final same-Faction Influence",
  );
  assert.equal(
    playerById(typedSequentialInfluencePlayed, "p2").resources.spice,
    2,
    "Typed Plot ordered Influence adjustments should trigger Margot Loyalty after dropping and regaining Bene Gesserit 2",
  );
  assert.equal(
    typedSequentialInfluencePlayed.turnSpiceGains.p2,
    2,
    "Typed Plot ordered Influence adjustment Loyalty spice should be tracked",
  );
  assert.match(
    typedSequentialInfluencePlayed.log[1],
    /Loyalty/,
    "Typed Plot ordered Influence adjustment rewards should log after the played Intrigue",
  );
  const typedGainThenLoseInfluence = {
    ...imperiumPolitics,
    id: "intrigue-typed-gain-then-lose-influence",
    name: "Typed Gain Then Lose Influence",
    effects: [plotSpec([
      { kind: "gain-influence", selector: "self", faction: "bene", amount: 1 },
      { kind: "lose-influence", selector: "self", faction: "bene", amount: 1 },
    ])],
  };
  const typedGainThenLoseFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      influence: { ...player.influence, bene: 0 },
      intrigues: [typedGainThenLoseInfluence],
    })),
    intrigueDiscard: [],
  };
  const typedGainThenLosePlayed = plotIntrigueEffectRules.playTypedPlotIntrigue(
    typedGainThenLoseFixture,
    "p2",
    typedGainThenLoseInfluence.id,
    (intrigue) => intrigue.id === typedGainThenLoseInfluence.id,
    (player) => `${player.leader} plays Typed Gain Then Lose Influence.`,
  );
  assert.equal(
    typedGainThenLosePlayed.intrigueDiscard.at(-1)?.id,
    typedGainThenLoseInfluence.id,
    "Typed Plot Influence affordability should allow spending Influence gained earlier in the same effect list",
  );
  assert.equal(playerById(typedGainThenLosePlayed, "p2").influence.bene, 0);
  const typedLoseThenGainBlockedFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      influence: { ...player.influence, bene: 0 },
      intrigues: [typedSequentialInfluence],
    })),
    intrigueDiscard: [],
  };
  const typedLoseThenGainBlocked = plotIntrigueEffectRules.playTypedPlotIntrigue(
    typedLoseThenGainBlockedFixture,
    "p2",
    typedSequentialInfluence.id,
    (intrigue) => intrigue.id === typedSequentialInfluence.id,
    (player) => `${player.leader} plays Typed Sequential Influence.`,
  );
  assert.equal(
    typedLoseThenGainBlocked,
    typedLoseThenGainBlockedFixture,
    "Typed Plot Influence affordability should reject losing Influence before it is gained",
  );
  assert.ok(
    backedByChoam.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "bene" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence" &&
        effect.selector === "self" &&
        effect.faction === "bene" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 4
      )
    ),
    "Backed by CHOAM should carry a typed Bene Gesserit Influence-loss Plot choice spec",
  );
  assert.ok(
    ["emperor", "spacing", "bene", "fremen", "greatHouses", "fringeWorlds"].every((faction) =>
      backedByChoam.effects?.some((spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === faction &&
        spec.effects.some((effect) =>
          effect.kind === "lose-influence" &&
          effect.selector === "self" &&
          effect.faction === faction &&
          effect.amount === 1
        ) &&
        spec.effects.some((effect) =>
          effect.kind === "gain-resource" &&
          effect.selector === "self" &&
          effect.resource === "solari" &&
          effect.amount === 4
        )
      )
    ),
    "Backed by CHOAM should carry typed Plot choice specs for every influence track",
  );
  const backedNoChoiceResolved = effectResolver.resolveGameEffects(backedByChoam.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    backedNoChoiceResolved.influenceLosses,
    {},
    "Backed by CHOAM Plot choice specs should not lose Influence without a selected choice",
  );
  assert.deepEqual(
    backedNoChoiceResolved.revealGain,
    {},
    "Backed by CHOAM Plot choice specs should not gain resources without a selected choice",
  );
  const backedBeneResolved = effectResolver.resolveGameEffects(backedByChoam.effects, {
    trigger: "plot-intrigue",
    choiceId: "bene",
    source: p2,
    state: game,
  });
  assert.equal(backedBeneResolved.influenceLosses.bene, 1, "Backed by CHOAM Bene choice should lose 1 Bene Gesserit Influence");
  assert.equal(backedBeneResolved.influenceLosses.spacing, undefined, "Backed by CHOAM Bene choice should not lose other Influence");
  assert.equal(backedBeneResolved.revealGain.solari, 4, "Backed by CHOAM Bene choice should gain 4 Solari");
  const backedSpacingResolved = effectResolver.resolveGameEffects(backedByChoam.effects, {
    trigger: "plot-intrigue",
    choiceId: "spacing",
    source: p2,
    state: game,
  });
  assert.equal(backedSpacingResolved.influenceLosses.spacing, 1, "Backed by CHOAM Spacing Guild choice should lose 1 Spacing Influence");
  assert.equal(backedSpacingResolved.influenceLosses.bene, undefined, "Backed by CHOAM Spacing Guild choice should not lose Bene Gesserit Influence");
  assert.equal(backedSpacingResolved.revealGain.solari, 4, "Backed by CHOAM Spacing Guild choice should gain 4 Solari");
  assert.ok(
    backedByChoam.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 4
      )
    ),
    "Backed by CHOAM should carry a typed Combat strength spec gated by completed contracts",
  );
  const backedCombatContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const backedUncontractedCombat = effectResolver.resolveGameEffects(backedByChoam.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, contracts: [backedCombatContracts[0]] },
    state: game,
  });
  assert.equal(
    backedUncontractedCombat.swords,
    0,
    "Backed by CHOAM Combat spec should not resolve below two completed contracts",
  );
  const backedContractedCombat = effectResolver.resolveGameEffects(backedByChoam.effects, {
    trigger: "combat-intrigue",
    source: { ...p2, contracts: backedCombatContracts },
    state: game,
  });
  assert.equal(
    backedContractedCombat.swords,
    4,
    "Backed by CHOAM Combat spec should resolve with two completed contracts",
  );
  assert.ok(
    hasCombatEffect(weirdingCombat, (effect) =>
      effect.kind === "gain-strength" &&
      effect.selector === "self" &&
      effect.amount === 3
    ) &&
    weirdingCombat.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "bene" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Weirding Combat should carry typed base and Bene Gesserit threshold Combat strength specs",
  );
  const weirdingBaseCombat = effectResolver.resolveGameEffects(weirdingCombat.effects, {
    trigger: "combat-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(weirdingBaseCombat.swords, 3, "Weirding Combat should resolve its base Combat strength");
  const weirdingThresholdSource = { ...p2, influence: { ...p2.influence, bene: 3 } };
  const weirdingThresholdCombat = effectResolver.resolveGameEffects(weirdingCombat.effects, {
    trigger: "combat-intrigue",
    source: weirdingThresholdSource,
    state: { ...game, players: game.players.map((player) => player.id === p2.id ? weirdingThresholdSource : player) },
  });
  assert.equal(
    weirdingThresholdCombat.swords,
    5,
    "Weirding Combat should add its Bene Gesserit threshold strength",
  );
  assert.ok(
    callToArms.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "activate-acquire-recruit-bonus" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Call to Arms should carry a typed Plot acquire-recruit bonus activation spec",
  );
  const callToArmsPlotResolved = effectResolver.resolveGameEffects(callToArms.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.equal(
    callToArmsPlotResolved.acquireRecruitBonus,
    1,
    "Call to Arms Plot spec should resolve one acquisition recruit bonus",
  );
  assert.equal(
    callToArmsPlotResolved.recruitedTroops,
    0,
    "Call to Arms Plot spec should not recruit immediately",
  );
  const callToArmsNoSupplyAcquireCard = {
    ...convincingArgument,
    id: "call-to-arms-no-supply-acquire-card",
    name: "Call to Arms No Supply Acquire",
    cost: 0,
    effects: undefined,
  };
  const callToArmsNoSupplyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      callToArmsActive: true,
      deployedTroops: 0,
      garrison: 12,
      jessicaMemories: 0,
      persuasion: 0,
      revealed: true,
    })),
    imperiumRow: [callToArmsNoSupplyAcquireCard],
    marketDeck: [],
  };
  const callToArmsNoSupplyAcquired = state.acquireMarketCard(
    callToArmsNoSupplyFixture,
    p2.id,
    callToArmsNoSupplyAcquireCard.id,
  );
  assert.equal(
    playerById(callToArmsNoSupplyAcquired, p2.id).garrison,
    12,
    "Call to Arms should not recruit beyond the acquisition recruit owner's troop supply",
  );
  assert.equal(
    callToArmsNoSupplyAcquired.log[0]?.includes("recruits 1 troop"),
    false,
    "Call to Arms should not log an unplaced acquisition recruit bonus",
  );
  assert.ok(
    detonation.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "shield-wall" &&
      spec.effects.some((effect) =>
        effect.kind === "remove-shield-wall" &&
        effect.selector === "self" &&
        effect.source === "Detonation"
      )
    ),
    "Detonation should carry a typed Shield Wall removal branch spec",
  );
  assert.ok(
    detonation.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "deploy" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "deploy-troops" &&
        effect.selector === "self" &&
        effect.max === 4 &&
        effect.source === "Detonation"
      )
    ),
    "Detonation should carry a typed Ally troop deployment branch spec",
  );
  assert.ok(
    detonation.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "deploy" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "deploy-troops" &&
        effect.selector === "activated-ally" &&
        effect.max === 4 &&
        effect.source === "Detonation"
      )
    ),
    "Detonation should carry a typed Commander activated-Ally troop deployment branch spec",
  );
  assert.equal(
    effectResolver.resolveGameEffects(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "shield-wall",
      source: p2,
      state: game,
    }).removeShieldWall,
    true,
    "Detonation Shield Wall branch should resolve through generic Plot effects",
  );
  assert.equal(
    effectResolver.resolveGameEffects(detonation.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }).removeShieldWall,
    false,
    "Detonation Shield Wall branch should remain choice-gated",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p2,
      state: game,
    }),
    [{ selector: "self", max: 4, source: "Detonation" }],
    "Detonation Ally deploy branch should resolve a self troop deployment effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p4,
      target: p6,
      state: game,
    }),
    [{ selector: "activated-ally", max: 4, source: "Detonation" }],
    "Detonation Commander deploy branch should resolve an activated-Ally troop deployment effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      choiceId: "deploy",
      source: p4,
      state: game,
    }),
    [],
    "Detonation Commander deploy branch should require an activated Ally target",
  );
  assert.deepEqual(
    effectResolver.resolvePlotDeployTroops(detonation.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Detonation deploy branch should remain choice-gated",
  );
  assert.ok(
    unexpectedAllies.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "summon" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 2
      )
    ),
    "Unexpected Allies should carry a typed water-spend summon branch spec",
  );
  assert.ok(
    unexpectedAllies.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "summon" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "summon-sandworms" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Unexpected Allies"
      )
    ),
    "Unexpected Allies should carry a typed Ally sandworm summon spec",
  );
  assert.ok(
    unexpectedAllies.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "summon" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "summon-sandworms" &&
        effect.selector === "activated-ally" &&
        effect.amount === 1 &&
        effect.source === "Unexpected Allies"
      )
    ),
    "Unexpected Allies should carry a typed Commander activated-Ally sandworm summon spec",
  );
  assert.ok(
    unexpectedAllies.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "remove-shield-wall" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 2
      )
    ) &&
    unexpectedAllies.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "remove-shield-wall" &&
      spec.effects.some((effect) =>
        effect.kind === "remove-shield-wall" &&
        effect.selector === "self" &&
        effect.source === "Unexpected Allies"
      )
    ),
    "Unexpected Allies should carry a typed remove-Shield-Wall branch with water spend",
  );
  assert.deepEqual(
    effectResolver.resolveGameEffects(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }).spentResources,
    { water: 2 },
    "Unexpected Allies summon branch should resolve the typed water cost",
  );
  assert.equal(
    effectResolver.resolveGameEffects(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }).removeShieldWall,
    false,
    "Unexpected Allies summon branch should not remove the Shield Wall",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "summon",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, source: "Unexpected Allies" }],
    "Unexpected Allies Ally summon branch should resolve a self sandworm summon effect",
  );
  const unexpectedAlliesWallResolved = effectResolver.resolveGameEffects(unexpectedAllies.effects, {
    trigger: "plot-intrigue",
    choiceId: "remove-shield-wall",
    source: p4,
    target: p6,
    state: game,
  });
  assert.deepEqual(
    unexpectedAlliesWallResolved.spentResources,
    { water: 2 },
    "Unexpected Allies remove-wall branch should resolve the typed water cost",
  );
  assert.equal(
    unexpectedAlliesWallResolved.removeShieldWall,
    true,
    "Unexpected Allies remove-wall branch should resolve typed Shield Wall removal",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p4,
      target: p6,
      state: game,
    }),
    [{ selector: "activated-ally", amount: 1, source: "Unexpected Allies" }],
    "Unexpected Allies Commander remove-wall branch should resolve an activated-Ally sandworm summon effect",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      choiceId: "remove-shield-wall",
      source: p4,
      state: game,
    }),
    [],
    "Unexpected Allies Commander sandworm summon should require an activated Ally target",
  );
  assert.deepEqual(
    effectResolver.resolvePlotSummonSandworms(unexpectedAllies.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Unexpected Allies summon branches should remain choice-gated",
  );
  assert.ok(
    departForArrakis.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "draw" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "fremen" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Depart For Arrakis should carry a typed Fremen-gated draw choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      )
    ),
    "Depart For Arrakis should carry a typed spice spend choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 3
      )
    ),
    "Depart For Arrakis should carry a typed Ally troop recruit choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 3
      )
    ),
    "Depart For Arrakis should carry a typed Commander activated-Ally troop recruit choice spec",
  );
  assert.ok(
    departForArrakis.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "fremen" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Depart For Arrakis should carry a typed conditional draw on the spice choice",
  );
  const departNoChoiceResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    departNoChoiceResolved.spentResources,
    {},
    "Depart For Arrakis Plot choice specs should not resolve without a selected choice",
  );
  assert.equal(departNoChoiceResolved.cardsToDraw, 0, "Depart For Arrakis should not draw without a selected choice");
  assert.equal(departNoChoiceResolved.recruitedTroops, 0, "Depart For Arrakis should not recruit without a selected choice");
  const departFringePlayer = { ...p2, influence: { ...p2.influence, fringeWorlds: 3 } };
  const departFringeState = {
    players: game.players.map((player) => player.id === p2.id ? departFringePlayer : player),
  };
  const departDrawResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "draw",
    source: departFringePlayer,
    state: departFringeState,
  });
  assert.equal(departDrawResolved.cardsToDraw, 1, "Depart For Arrakis draw choice should draw with 3 Fringe Worlds Influence");
  assert.deepEqual(departDrawResolved.spentResources, {}, "Depart For Arrakis draw choice should not spend spice");
  assert.equal(departDrawResolved.recruitedTroops, 0, "Depart For Arrakis draw choice should not recruit troops");
  const departDrawBlockedResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "draw",
    source: p2,
    state: game,
  });
  assert.equal(departDrawBlockedResolved.cardsToDraw, 0, "Depart For Arrakis draw choice should require Fremen/Fringe Influence");
  const departSpiceOnlyResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend-spice",
    source: p2,
    state: game,
  });
  assert.equal(departSpiceOnlyResolved.spentResources.spice, 2, "Depart For Arrakis spice choice should spend 2 spice");
  assert.equal(departSpiceOnlyResolved.recruitedTroops, 3, "Depart For Arrakis spice choice should recruit 3 troops for Allies");
  assert.equal(departSpiceOnlyResolved.cardsToDraw, 0, "Depart For Arrakis spice choice should skip draw below the Fremen/Fringe threshold");
  const departSpiceDrawResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend-spice",
    source: departFringePlayer,
    state: departFringeState,
  });
  assert.equal(departSpiceDrawResolved.spentResources.spice, 2, "Depart For Arrakis spice-plus-draw choice should spend 2 spice");
  assert.equal(departSpiceDrawResolved.recruitedTroops, 3, "Depart For Arrakis spice-plus-draw choice should recruit 3 troops");
  assert.equal(departSpiceDrawResolved.cardsToDraw, 1, "Depart For Arrakis spice choice should draw when the threshold is met");
  const departCommanderAlly = { ...p6, influence: { ...p6.influence, fringeWorlds: 3 } };
  const departCommanderState = {
    players: game.players.map((player) => player.id === p6.id ? departCommanderAlly : player),
  };
  const departCommanderResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "spend-spice",
    source: p4,
    target: departCommanderAlly,
    state: departCommanderState,
  });
  assert.equal(departCommanderResolved.spentResources.spice, 2, "Commander Depart For Arrakis should spend Commander spice");
  assert.equal(departCommanderResolved.recruitedTroops, 0, "Commander Depart For Arrakis should not recruit for the Commander");
  assert.equal(
    departCommanderResolved.activatedAlly.recruitedTroops,
    3,
    "Commander Depart For Arrakis should route troop recruitment to the activated Ally",
  );
  assert.equal(
    departCommanderResolved.cardsToDraw,
    1,
    "Commander Depart For Arrakis should use same-team Ally Fringe Worlds Influence for the draw threshold",
  );
  const departMuadDibPlayer = { ...p1, influence: { ...p1.influence, fremen: 3 } };
  const departMuadDibResolved = effectResolver.resolveGameEffects(departForArrakis.effects, {
    trigger: "plot-intrigue",
    choiceId: "draw",
    source: departMuadDibPlayer,
    state: {
      players: game.players.map((player) => player.id === p1.id ? departMuadDibPlayer : player),
    },
  });
  assert.equal(
    departMuadDibResolved.cardsToDraw,
    1,
    "Muad'Dib Depart For Arrakis should use personal Fremen Influence for the draw threshold",
  );
  assert.ok(
    marketOpportunity.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spice-to-solari" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 5
      )
    ),
    "Market Opportunity should carry a typed spice-to-Solari Plot choice spec",
  );
  assert.ok(
    marketOpportunity.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "solari-to-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 5
      )
    ),
    "Market Opportunity should carry a typed Solari-to-spice Plot choice spec",
  );
  const marketNoChoiceResolved = effectResolver.resolveGameEffects(marketOpportunity.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    marketNoChoiceResolved.spentResources,
    {},
    "Market Opportunity Plot choice specs should not resolve without a selected choice",
  );
  assert.deepEqual(
    marketNoChoiceResolved.revealGain,
    {},
    "Market Opportunity Plot choice specs should not gain resources without a selected choice",
  );
  const marketSpiceToSolariResolved = effectResolver.resolveGameEffects(marketOpportunity.effects, {
    trigger: "plot-intrigue",
    choiceId: "spice-to-solari",
    source: p2,
    state: game,
  });
  assert.equal(
    marketSpiceToSolariResolved.spentResources.spice,
    2,
    "Market Opportunity spice-to-Solari spec should spend 2 spice",
  );
  assert.equal(
    marketSpiceToSolariResolved.revealGain.solari,
    5,
    "Market Opportunity spice-to-Solari spec should gain 5 Solari",
  );
  assert.equal(
    marketSpiceToSolariResolved.spentResources.solari,
    undefined,
    "Market Opportunity spice-to-Solari spec should not spend Solari",
  );
  const marketSolariToSpiceResolved = effectResolver.resolveGameEffects(marketOpportunity.effects, {
    trigger: "plot-intrigue",
    choiceId: "solari-to-spice",
    source: p2,
    state: game,
  });
  assert.equal(
    marketSolariToSpiceResolved.spentResources.solari,
    5,
    "Market Opportunity Solari-to-spice spec should spend 5 Solari",
  );
  assert.equal(
    marketSolariToSpiceResolved.revealGain.spice,
    5,
    "Market Opportunity Solari-to-spice spec should gain 5 spice",
  );
  assert.equal(
    marketSolariToSpiceResolved.spentResources.spice,
    undefined,
    "Market Opportunity Solari-to-spice spec should not spend spice",
  );
  const [marketOpportunityClone] = deckUtils.cloneIntrigues([marketOpportunity]);
  assert.notEqual(
    marketOpportunityClone.effects,
    marketOpportunity.effects,
    "Intrigue cloning should deep-clone typed effect arrays",
  );
  assert.notEqual(
    marketOpportunityClone.effects?.[0],
    marketOpportunity.effects?.[0],
    "Intrigue cloning should deep-clone typed effect specs",
  );
  assert.equal(
    marketOpportunityClone.effects?.[0]?.choiceId,
    "spice-to-solari",
    "Intrigue cloning should preserve typed choice ids",
  );
  assert.ok(
    strategicStockpiling.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "spice" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Strategic Stockpiling should carry a typed spice-for-VP Plot choice spec",
  );
  assert.ok(
    strategicStockpiling.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "water" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "spacing" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Strategic Stockpiling should carry a typed Spacing-gated water-for-VP Plot choice spec",
  );
  assert.ok(
    strategicStockpiling.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.choiceId === "both" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "spacing" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 5
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Strategic Stockpiling should carry a typed combined Plot choice spec",
  );
  const strategicNoChoiceResolved = effectResolver.resolveGameEffects(strategicStockpiling.effects, {
    trigger: "plot-intrigue",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    strategicNoChoiceResolved.spentResources,
    {},
    "Strategic Stockpiling Plot choice specs should not resolve without a selected choice",
  );
  assert.equal(
    strategicNoChoiceResolved.vp,
    0,
    "Strategic Stockpiling Plot choice specs should not score VP without a selected choice",
  );
  const strategicSpacingPlayer = { ...p2, influence: { ...p2.influence, spacing: 3 } };
  const strategicSpacingState = {
    players: game.players.map((player) => player.id === p2.id ? strategicSpacingPlayer : player),
  };
  const strategicSpiceResolved = effectResolver.resolveGameEffects(strategicStockpiling.effects, {
    trigger: "plot-intrigue",
    choiceId: "spice",
    source: p2,
    state: game,
  });
  assert.equal(strategicSpiceResolved.spentResources.spice, 5, "Strategic Stockpiling spice choice should spend 5 spice");
  assert.equal(strategicSpiceResolved.spentResources.water, undefined, "Strategic Stockpiling spice choice should not spend water");
  assert.equal(strategicSpiceResolved.vp, 1, "Strategic Stockpiling spice choice should gain 1 VP");
  const strategicWaterResolved = effectResolver.resolveGameEffects(strategicStockpiling.effects, {
    trigger: "plot-intrigue",
    choiceId: "water",
    source: strategicSpacingPlayer,
    state: strategicSpacingState,
  });
  assert.equal(strategicWaterResolved.spentResources.water, 3, "Strategic Stockpiling water choice should spend 3 water");
  assert.equal(strategicWaterResolved.spentResources.spice, undefined, "Strategic Stockpiling water choice should not spend spice");
  assert.equal(strategicWaterResolved.vp, 1, "Strategic Stockpiling water choice should gain 1 VP");
  const strategicBothResolved = effectResolver.resolveGameEffects(strategicStockpiling.effects, {
    trigger: "plot-intrigue",
    choiceId: "both",
    source: strategicSpacingPlayer,
    state: strategicSpacingState,
  });
  assert.equal(strategicBothResolved.spentResources.spice, 5, "Strategic Stockpiling combined choice should spend 5 spice");
  assert.equal(strategicBothResolved.spentResources.water, 3, "Strategic Stockpiling combined choice should spend 3 water");
  assert.equal(strategicBothResolved.vp, 2, "Strategic Stockpiling combined choice should gain 2 VP");
  const strategicWaterWithoutInfluenceResolved = effectResolver.resolveGameEffects(strategicStockpiling.effects, {
    trigger: "plot-intrigue",
    choiceId: "water",
    source: p2,
    state: game,
  });
  assert.deepEqual(
    strategicWaterWithoutInfluenceResolved.spentResources,
    {},
    "Strategic Stockpiling water choice should not resolve below 3 Spacing Guild Influence",
  );
  assert.equal(
    strategicWaterWithoutInfluenceResolved.vp,
    0,
    "Strategic Stockpiling water choice should not score below 3 Spacing Guild Influence",
  );
  assert.ok(
    shaddamsFavor.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Shaddam's Favor should carry a typed Plot self troop recruit spec for Allies",
  );
  assert.ok(
    shaddamsFavor.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 1
      )
    ),
    "Shaddam's Favor should carry a typed Plot activated-Ally troop recruit spec for Commanders",
  );
  assert.ok(
    shaddamsFavor.effects?.some((spec) =>
      spec.trigger === "plot-intrigue" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "emperor" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 3
      )
    ),
    "Shaddam's Favor should carry a typed Emperor-icon-gated Plot Solari gain spec",
  );
  const shaddamsFavorAllyResolved = effectResolver.resolveGameEffects(shaddamsFavor.effects, {
    trigger: "plot-intrigue",
    source: { ...p2, influence: { ...p2.influence, greatHouses: 3, emperor: 0 } },
    state: {
      players: game.players.map((player) =>
        player.id === p2.id ? { ...player, influence: { ...player.influence, greatHouses: 3, emperor: 0 } } : player,
      ),
    },
  });
  assert.equal(shaddamsFavorAllyResolved.recruitedTroops, 1, "Shaddam's Favor Plot spec should recruit for Ally actors");
  assert.equal(shaddamsFavorAllyResolved.revealGain.solari, 3, "Shaddam's Favor Plot spec should pay Solari with 3 Great Houses Influence");
  const shaddamsFavorCommanderResolved = effectResolver.resolveGameEffects(shaddamsFavor.effects, {
    trigger: "plot-intrigue",
    source: { ...p4, influence: { ...p4.influence, emperor: 3, greatHouses: 0 } },
    target: p6,
    state: {
      players: game.players.map((player) =>
        player.id === p4.id ? { ...player, influence: { ...player.influence, emperor: 3, greatHouses: 0 } } : player,
      ),
    },
  });
  assert.equal(
    shaddamsFavorCommanderResolved.activatedAlly.recruitedTroops,
    1,
    "Shaddam's Favor Plot spec should route Commander troop recruitment to the activated Ally",
  );
  assert.equal(
    shaddamsFavorCommanderResolved.revealGain.solari,
    3,
    "Shaddam's Favor Plot spec should count Shaddam personal Emperor Influence for Solari",
  );
  for (const card of [guildSpy, inHighPlaces, spyNetwork, strikeFleet, subversiveAdvisor]) {
    assert.ok(
      card.effects?.some((spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some((effect) =>
          effect.kind === "place-spies" &&
          effect.selector === "self" &&
          effect.amount === 1 &&
          effect.recallForSupply === true &&
          effect.mustPlace === true
        )
      ),
      `${card.name} should use a typed acquire spy-placement effect`,
    );
  }
  assert.ok(
    overthrow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "draw-intrigues" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Overthrow should use a typed acquire Intrigue draw effect",
  );
  assert.deepEqual(
    overthrow.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "gain-board-space-influence",
          selector: "self",
          amount: 1,
        },
      ]),
    ],
    "Overthrow should only use its typed Agent current-board-space Influence bonus without source trash",
  );
  assert.equal(
    overthrow.play,
    "Gain two Influence instead of one.",
    "Overthrow play text should expose its automated Faction-space Influence bonus",
  );
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 2
      )
    ),
    "Price is No Object should use a typed acquire Solari effect",
  );
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.selector === "self" &&
        effect.destination === "hand" &&
        effect.paymentResource === "solari" &&
        effect.optional === true &&
        effect.minCost === undefined &&
        effect.maxCost === undefined
      )
    ),
    "Price is No Object should use a typed Agent acquire-card Solari payment effect",
  );
  assert.ok(
    subversiveAdvisor.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-board-space-influence" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.trashSource === true
      )
    ),
    "Subversive Advisor should use a typed Agent current-board-space Influence bonus with source trash",
  );
  assert.equal(
    subversiveAdvisor.play,
    "If you sent an Agent to a Faction board space this turn, gain two Influence instead of one and trash this card.",
    "Subversive Advisor play text should expose its automated Faction-space Influence bonus",
  );
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "In High Places should use a typed another-Bene-Gesserit Agent draw spec",
  );
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "In High Places should use a typed another-Bene-Gesserit Agent spy-placement spec",
  );
  assert.equal(
    inHighPlaces.play,
    "If you have another Bene Gesserit card in play, draw 1 card and place 1 spy.",
    "In High Places play text should expose its conditional Agent draw and spy placement",
  );
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-vp" && effect.selector === "self" && effect.amount === 1)
    ),
    "The Spice Must Flow should use a typed acquire VP effect",
  );
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 1
      )
    ),
    "The Spice Must Flow should use a typed acquire spice effect",
  );
  assert.ok(
    hasAcquireEffect(
      interstellarTrade,
      (effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Interstellar Trade",
    ),
    "Interstellar Trade should use a typed acquire Influence-choice effect",
  );
  assert.ok(
    hasAcquireEffect(
      interstellarTrade,
      (effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Interstellar Trade",
    ),
    "Interstellar Trade should use a typed acquire face-up contract effect",
  );
  assert.ok(
    hasAgentEffect(
      priorityContracts,
      (effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2,
    ),
    "Priority Contracts should use a typed Agent spice effect",
  );
  assert.ok(
    hasAgentEffect(
      priorityContracts,
      (effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Priority Contracts should use a typed Agent VP effect",
  );
  assert.ok(
    hasAgentEffect(
      priorityContracts,
      (effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Priority Contracts",
    ),
    "Priority Contracts should use a typed Agent face-up contract effect",
  );
  assert.equal(priorityContracts.acquired, undefined, "Priority Contracts VP should not be treated as an acquire bonus");
  assert.equal(junctionHeadquarters.acquired, undefined, "Junction Headquarters VP should be modeled by its typed Agent effect");
  assert.ok(
    hasAgentEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "discard-cards-for-reward" &&
        effect.selector === "self" &&
        effect.amount === 2 &&
        effect.cost?.solari === 5 &&
        effect.gainVp === 1 &&
        effect.source === "Corrinth City",
    ),
    "Corrinth City should use a typed Agent discard-cost VP effect",
  );
  assert.ok(
    hasRevealEffect(
      corrinthCity,
      (effect) => effect.kind === "gain-persuasion" && effect.selector === "self" && effect.amount === 5,
    ),
    "Corrinth City should carry its default +5 persuasion Reveal branch as a typed effect",
  );
  assert.ok(
    hasRevealEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "pay-resource-for-high-council-seat" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.cost === 5 &&
        effect.persuasionCost === 5 &&
        effect.persuasionReward === 2 &&
        effect.optional === true &&
        effect.source === "Corrinth City",
    ),
    "Corrinth City should carry its paid High Council Reveal branch as a typed effect",
  );
  assert.deepEqual(
    effectResolver.resolveRevealPayResourceForHighCouncilSeats(corrinthCity.effects, {
      trigger: "reveal",
      source: p2,
      state: game,
    }),
    [{
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionCost: 5,
      persuasionReward: 2,
      source: "Corrinth City",
    }],
    "Corrinth City should resolve its paid High Council Reveal branch through the typed pending resolver",
  );
  assert.ok(
    hasAgentEffect(
      deliveryAgreement,
      (effect) =>
        effect.kind === "discard-cards-for-reward" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.takeContracts?.amount === 1 &&
        effect.takeContracts?.sourcePool === "public-offer" &&
        effect.source === "Delivery Agreement",
    ),
    "Delivery Agreement should use a typed Agent discard-for-public-contract effect",
  );
  assert.ok(
    hasRevealEffect(
      deliveryAgreement,
      (effect) => effect.kind === "gain-resource" && effect.selector === "self" && effect.resource === "spice" && effect.amount === 1,
    ),
    "Delivery Agreement should carry its default Reveal spice reward as a typed effect",
  );
  assert.ok(
    deliveryAgreement.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.sourceOnly === true &&
        effect.zones?.length === 1 &&
        effect.zones[0] === "playArea" &&
        effect.vpReward === 1 &&
        effect.optional === true
      )
    ),
    "Delivery Agreement should carry its completed-contract source-trash VP Reveal branch as a typed effect",
  );
  assert.equal(corrinthCity.acquired, undefined, "Corrinth City VP should be modeled by its typed Agent effect");
  assert.equal(deliveryAgreement.acquired, undefined, "Delivery Agreement's conditional Reveal VP should not be treated as an acquire bonus");
  assert.equal(smugglersHaven.acquired, undefined, "Smuggler's Haven VP should be modeled by its typed Agent effect");
  assert.deepEqual(
    marketAndImperiumCards.filter(hasAgentPlaySpec).map((card) => card.name).sort(),
    [
      "Bene Gesserit Operative",
      "Branching Path",
      "Calculus of Power",
      "Captured Mentat",
      "Cargo Runner",
      "Chani, Clever Tactician",
      "Corrinth City",
      "Covert Operation",
      "Dangerous Rhetoric",
      "Delivery Agreement",
      "Desert Power",
      "Desert Survival",
      "Double Agent",
      "Ecological Testing Station",
      "Fedaykin Stilltent",
      "Guild Envoy",
      "Guild Spy",
      "Hidden Missive",
      "Imperial Spymaster",
      "In High Places",
      "Junction Headquarters",
      "Leadership",
      "Long Live the Fighters",
      "Maker Keeper",
      "Maula Pistol",
      "Northern Watermaster",
      "Overthrow",
      "Paracompass",
      "Prepare The Way",
      "Price is No Object",
      "Priority Contracts",
      "Public Spectacle",
      "Rebel Supplier",
      "Reliable Informant",
      "Sardaukar Soldier",
      "Shishakli",
      "Smuggler's Harvester",
      "Smuggler's Haven",
      "Southern Elders",
      "Space-time Folding",
      "Spacing Guild's Favor",
      "Steersman",
      "Stilgar, The Devoted",
      "Subversive Advisor",
      "Theacherous Maneuver",
      "Tread in Darkness",
      "Undercover Asset",
      "Wheels Within Wheels",
    ],
    "Unexpected cards with declarative Agent-play specs",
  );
  for (const card of [
    convincingArgument,
    dagger,
    prepareTheWay,
    limitedLandsraadAccess,
    imperialOrnithopter,
    smuggler,
    interstellarTrade,
    calculus,
    capturedMentat,
    covertOperation,
    doubleAgent,
    fedaykinStilltent,
    hiddenMissive,
    cargoRunner,
    makerKeeper,
    maulaPistol,
    northernWatermaster,
    paracompass,
    reliableInformant,
    smugglersHaven,
    spacingGuildFavor,
    spaceTimeFolding,
    guildEnvoy,
    wheelsWithinWheels,
    branchingPath,
    beneGesseritOperative,
    chani,
    desertPower,
    desertSurvival,
    imperialSpymaster,
    rebelSupplier,
    sardaukarSoldier,
    southernElders,
    stilgar,
    leadership,
    publicSpectacle,
    theacherousManeuver,
    undercoverAsset,
  ]) {
    assert.ok(
      card.effects?.some((spec) => spec.trigger === "reveal"),
      `${card.name} should carry a declarative Reveal effect spec`,
    );
  }
  assert.ok(
    hasAgentEffect(leadership, (effect) => effect.kind === "draw-cards" && effect.selector === "self" && effect.amount === 1),
    "Leadership should carry a declarative Agent draw-card spec",
  );
  for (const card of [imperialSpymaster, sardaukarSoldier]) {
    assert.ok(
      hasAgentEffect(
        card,
        (effect) => effect.kind === "draw-intrigues" && effect.selector === "self" && effect.amount === 1,
      ),
      `${card.name} should carry a declarative Agent Intrigue draw spec`,
    );
  }
  for (const card of [publicSpectacle, theacherousManeuver]) {
    assert.ok(
      hasAgentEffect(
        card,
        (effect) => effect.kind === "gain-influence-choice" && effect.selector === "self" && effect.amount === 1,
      ),
      `${card.name} should carry a declarative Agent Influence-choice spec`,
    );
  }
  assert.ok(
    hasAgentEffect(
      theacherousManeuver,
      (effect) => effect.kind === "draw-intrigues" && effect.selector === "self" && effect.amount === 1,
    ),
    "Theacherous Maneuver should carry a declarative Agent Intrigue draw spec",
  );
  for (const card of [publicSpectacle, undercoverAsset]) {
    assert.ok(
      hasAgentEffect(
        card,
        (effect) =>
          effect.kind === "place-spies" &&
          effect.selector === "self" &&
          effect.amount === 1 &&
          effect.recallForSupply === true &&
          effect.mustPlace === true,
      ),
      `${card.name} should carry a declarative Agent spy-placement spec`,
    );
  }
  assert.ok(
    hasAgentEffect(
      rebelSupplier,
      (effect) => effect.kind === "gain-resource" && effect.selector === "self" && effect.resource === "spice" && effect.amount === 1,
    ),
    "Rebel Supplier should carry a declarative Agent spice spec",
  );
  assert.ok(
    desertPower.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "visited-maker-space") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      )
    ),
    "Desert Power should carry a Maker-space-gated Agent spice spec",
  );
  assert.ok(
    desertPower.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-sandworms" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.cost === 1 &&
        effect.sandworms === 1 &&
        effect.recipient === "combat-recipient" &&
        effect.destination === "conflict" &&
        effect.persuasionCost === 2
      )
    ),
    "Desert Power should carry a typed Reveal payment replacing persuasion with a sandworm",
  );
  assert.equal(
    desertPower.reveal,
    "+2 persuasion, or pay 1 water to summon 1 sandworm.",
    "Desert Power reveal text should expose its typed sandworm choice",
  );
  assert.ok(
    hasAgentEffect(
      southernElders,
      (effect) => effect.kind === "gain-resource" && effect.selector === "self" && effect.resource === "water" && effect.amount === 1,
    ),
    "Southern Elders should carry a declarative Agent water spec",
  );
  for (const [card, expectedTroops] of [
    [rebelSupplier, 2],
    [southernElders, 2],
    [stilgar, 2],
  ]) {
    assert.ok(
      card.effects?.some((spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
        spec.effects.some((effect) =>
          effect.kind === "recruit-troops" &&
          effect.selector === "self" &&
          effect.amount === expectedTroops
        )
      ),
      `${card.name} should recruit troops to an Ally player through a declarative Agent spec`,
    );
    assert.ok(
      card.effects?.some((spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
        spec.effects.some((effect) =>
          effect.kind === "recruit-troops" &&
          effect.selector === "activated-ally" &&
          effect.amount === expectedTroops
        )
      ),
      `${card.name} should route Commander troop rewards to the activated Ally through a declarative Agent spec`,
    );
  }
  assert.ok(
    prepareTheWay.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Prepare The Way should carry a declarative Agent draw spec gated by Bene Gesserit influence",
  );
  assert.ok(
    muadDibSignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Lead the Way"
      )
    ),
    "Muad'Dib Signet Ring should carry a declarative Agent draw spec",
  );
  assert.ok(
    demandAttention.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-influence" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.cost === 4 &&
        effect.faction === "board-space" &&
        effect.amount === 1 &&
        effect.recipient === "board-effect-recipient" &&
        effect.trashSource === true &&
        effect.source === "Demand Attention"
      )
    ),
    "Demand Attention should carry a declarative Agent resource-for-Influence payment spec",
  );
  assert.ok(
    commandRespect.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-swordmaster-bonus") &&
      spec.effects.some((effect) =>
        effect.kind === "trash-source-for-trade" &&
        effect.selector === "self" &&
        effect.partner === "same-team-allies" &&
        effect.resource === "intrigue" &&
        effect.optional === true &&
        effect.partnerLocked === true &&
        effect.source === "Command Respect"
      )
    ),
    "Command Respect should carry a declarative Agent trash-source-for-trade spec",
  );
  assert.ok(
    desertCall.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "visited-space-icon" && condition.icon === "spice") &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-sandworms" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.cost === 1 &&
        effect.sandworms === 1 &&
        effect.recipient === "activated-ally" &&
        effect.destination === "conflict" &&
        effect.trashSource === true &&
        effect.source === "Desert Call"
      )
    ),
    "Desert Call should carry a typed Agent sandworm-payment spec",
  );
  assert.ok(
    threatenSpiceProduction.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "visited-space-icon" && condition.icon === "spice") &&
      spec.effects.some((effect) =>
        effect.kind === "pay-team-resource-for-vp" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.cost === 7 &&
        effect.vp === 1 &&
        effect.contributors === "self-and-same-team-allies" &&
        effect.recipient === "self" &&
        effect.optional === true &&
        effect.trashSource === true &&
        effect.source === "Threaten Spice Production"
      )
    ),
    "Threaten Spice Production should carry a typed Agent team resource-for-VP payment spec",
  );
  assert.ok(
    usul.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "muaddib") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "commander-resource-split" &&
        effect.selector === "self" &&
        effect.source === "Usul" &&
        effect.options.length === 2 &&
        effect.options.some((option) =>
          option.commanderResource === "water" &&
          option.commanderAmount === 1 &&
          option.allyResource === "spice" &&
          option.allyAmount === 1
        ) &&
        effect.options.some((option) =>
          option.commanderResource === "spice" &&
          option.commanderAmount === 1 &&
          option.allyResource === "water" &&
          option.allyAmount === 1
        )
      )
    ),
    "Usul should carry a declarative Commander resource-split spec",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Gurney Halleck") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Warmaster"
      )
    ),
    "Generic Ally Signet Ring should carry a declarative Gurney Warmaster recruit spec",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Lady Amber Metulli") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.conditions?.some((condition) => condition.kind === "has-alliance" && condition.faction === undefined) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1 &&
        effect.source === "Fill Coffers"
      )
    ) &&
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Lady Amber Metulli") &&
      spec.conditions?.some((condition) => condition.kind === "has-alliance" && condition.faction === undefined) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 1 &&
        effect.source === "Fill Coffers"
      )
    ),
    "Generic Ally Signet Ring should carry declarative Amber Fill Coffers resource specs",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Lady Margot Fenring") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Arrakis Informant" &&
        effect.placementIcon === "bene" &&
        effect.recallForSupply === true
      )
    ),
    "Generic Ally Signet Ring should carry declarative Margot Arrakis Informant spy spec",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Staban Tuek") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Unseen Network" &&
        effect.recallForSupply === true &&
        effect.postPlacementAction === "staban-unseen-network"
      )
    ),
    "Generic Ally Signet Ring should carry declarative Staban Unseen Network spy spec",
  );
  const irulanPendingActionChoiceOptions = [
    {
      id: "acquire",
      label: "Acquire cost-1 card to hand",
      effect: {
        kind: "acquire-card",
        selector: "self",
        minCost: 1,
        maxCost: 1,
        destination: "hand",
      },
    },
    {
      id: "trash",
      label: "Trash hand card",
      effect: {
        kind: "trash-card",
        selector: "self",
        optional: false,
        zones: ["hand"],
        spiceRewardCostThreshold: 1,
        spiceReward: 2,
      },
    },
  ];
  const irulanPendingActionChoiceSpec = allySignet.effects?.find((spec) =>
    spec.trigger === "agent-play" &&
    spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Princess Irulan") &&
    spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
    spec.effects.some((effect) => effect.kind === "pending-action-choice" && effect.source === "Chronicler's Insight")
  );
  assert.ok(irulanPendingActionChoiceSpec, "Generic Ally Signet Ring should carry a typed Irulan Chronicler's Insight pending action choice spec");
  assert.deepEqual(
    irulanPendingActionChoiceSpec.effects.find((effect) => effect.kind === "pending-action-choice"),
    {
      kind: "pending-action-choice",
      selector: "self",
      source: "Chronicler's Insight",
      options: irulanPendingActionChoiceOptions,
    },
    "Irulan Chronicler's Insight spec should encode acquire and trash pending branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPendingActionChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p6, leader: "Princess Irulan", role: "Ally" },
      target: p6,
      state: game,
    }),
    [{
      selector: "self",
      source: "Chronicler's Insight",
      options: [
        {
          id: "acquire",
          label: "Acquire cost-1 card to hand",
          effect: {
            kind: "acquire-card",
            selector: "self",
            minCost: 1,
            maxCost: 1,
            destination: "hand",
            optional: false,
          },
        },
        {
          id: "trash",
          label: "Trash hand card",
          effect: {
            kind: "trash-card",
            selector: "self",
            optional: false,
            zones: ["hand"],
            excludeSource: false,
            spiceRewardCostThreshold: 1,
            spiceReward: 2,
          },
        },
      ],
    }],
    "Irulan Chronicler's Insight resolver should expose its acquire and trash pending branches",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Reverend Mother Jessica") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "paid-reward-choice" &&
        effect.selector === "self" &&
        effect.source === "Water of Life" &&
        effect.requirePayableOption === true &&
        effect.options.length === 1 &&
        effect.options[0].id === "water" &&
        effect.options[0].resource === "spice" &&
        effect.options[0].cost === 1 &&
        effect.options[0].reward.kind === "gain-resource" &&
        effect.options[0].reward.selector === "self" &&
        effect.options[0].reward.resource === "water" &&
        effect.options[0].reward.amount === 1
      )
    ),
    "Generic Ally Signet Ring should carry a typed Reverend Mother Jessica Water of Life payment spec",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p5, leader: "Reverend Mother Jessica", role: "Ally" },
      target: p5,
      state: game,
    }),
    [{
      selector: "self",
      source: "Water of Life",
      requirePayableOption: true,
      options: [{
        id: "water",
        resource: "spice",
        cost: 1,
        reward: { kind: "gain-resource", selector: "self", resource: "water", amount: 1 },
      }],
    }],
    "Water of Life paid reward spec should resolve its spice-for-water branch",
  );
  assert.ok(
    allySignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-leader" && condition.leader === "Lady Jessica") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "paid-reward-choice" &&
        effect.selector === "self" &&
        effect.source === "Spice Agony" &&
        effect.requirePayableOption === true &&
        effect.options.length === 1 &&
        effect.options[0].id === "spice-agony" &&
        effect.options[0].resource === "spice" &&
        effect.options[0].cost === 1 &&
        effect.options[0].reward.kind === "bundle" &&
        effect.options[0].reward.rewards.some((reward) =>
          reward.kind === "draw-intrigues" &&
          reward.selector === "self" &&
          reward.amount === 1
        ) &&
        effect.options[0].reward.rewards.some((reward) =>
          reward.kind === "gain-leader-counter" &&
          reward.selector === "self" &&
          reward.counter === "jessicaMemories" &&
          reward.amount === 1 &&
          reward.troopSupplyCost === 1
        )
      )
    ),
    "Generic Ally Signet Ring should carry a typed Lady Jessica Spice Agony payment spec",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p5, leader: "Lady Jessica", role: "Ally" },
      target: p5,
      state: game,
    }),
    [{
      selector: "self",
      source: "Spice Agony",
      requirePayableOption: true,
      options: [{
        id: "spice-agony",
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
    }],
    "Spice Agony paid reward spec should resolve its spice-for-Intrigue-and-memory branch",
  );
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(leaderEffectData.leaderPlacementEffectSpecs, {
      trigger: "agent-placement",
      source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 2 },
      state: game,
      space: secrets,
    }),
    [{
      selector: "self",
      source: "Other Memories",
      fromLeader: "Lady Jessica",
      toLeader: "Reverend Mother Jessica",
      counter: "jessicaMemories",
      counterAmount: "all",
      drawCardsPerCounter: 1,
      followUp: {
        kind: "repeat-board-space",
        sameSpace: true,
        ability: "reverend-mother-jessica",
        source: "Reverend Mother",
        resource: "water",
        cost: 1,
      },
    }],
    "Other Memories leader placement spec should resolve its leader transition branch",
  );
  const validLeaderTransitionChoiceEffect = {
    kind: "leader-transition-choice",
    selector: "self",
    source: "Other Memories",
    fromLeader: "Lady Jessica",
    toLeader: "Reverend Mother Jessica",
    counter: "jessicaMemories",
    counterAmount: "all",
    drawCardsPerCounter: 1,
    followUp: {
      kind: "repeat-board-space",
      sameSpace: true,
      ability: "reverend-mother-jessica",
      source: "Reverend Mother",
      resource: "water",
      cost: 1,
    },
  };
  const leaderTransitionChoiceContext = {
    trigger: "agent-placement",
    source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 2 },
    state: game,
    space: secrets,
  };
  [
    ["fromLeader", { fromLeader: "" }, /Invalid leader-transition-choice fromLeader ""/],
    ["toLeader", { toLeader: "" }, /Invalid leader-transition-choice toLeader ""/],
    ["same toLeader", { toLeader: "Lady Jessica" }, /Invalid leader-transition-choice toLeader "Lady Jessica"/],
    ["counter", { counter: "otherMemories" }, /Invalid leader-transition-choice counter "otherMemories"/],
    ["counterAmount", { counterAmount: 1 }, /Invalid leader-transition-choice counterAmount "1"/],
    ["drawCardsPerCounter", { drawCardsPerCounter: 0 }, /Invalid leader-transition-choice drawCardsPerCounter "0"/],
    ["source", { source: "" }, /Invalid leader-transition-choice source ""/],
    [
      "followUp kind",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, kind: "gain-resource" } },
      /Unsupported leader-transition-choice followUp "gain-resource"/,
    ],
    [
      "followUp sameSpace",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, sameSpace: false } },
      /Invalid leader-transition-choice followUp sameSpace "false"/,
    ],
    [
      "followUp ability",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, ability: "other-memory" } },
      /Invalid leader-transition-choice followUp ability "other-memory"/,
    ],
    [
      "followUp source",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, source: "" } },
      /Invalid leader-transition-choice followUp source ""/,
    ],
    [
      "followUp resource",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, resource: "intrigue" } },
      /Unsupported effect resource "intrigue"/,
    ],
    [
      "followUp cost",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, cost: 0 } },
      /Invalid leader-transition-choice followUp cost "0"/,
    ],
  ].forEach(([label, effectPatch, expectedError]) => {
    assert.throws(
      () =>
        effectResolver.resolveLeaderTransitionChoices(
          [{
            trigger: "agent-placement",
            effects: [{ ...validLeaderTransitionChoiceEffect, ...effectPatch }],
          }],
          leaderTransitionChoiceContext,
        ),
      expectedError,
      `Leader transition choice specs should reject invalid ${label}`,
    );
  });
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(leaderEffectData.leaderPlacementEffectSpecs, {
      trigger: "agent-placement",
      source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 0 },
      state: game,
      space: secrets,
    }),
    [],
    "Other Memories leader placement spec should require memories",
  );
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(leaderEffectData.leaderPlacementEffectSpecs, {
      trigger: "agent-placement",
      source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 2 },
      state: game,
      space: arrakeen,
    }),
    [],
    "Other Memories leader placement spec should require a Bene Gesserit space",
  );
  assert.throws(
    () =>
      effectResolver.resolveLeaderTransitionChoices(
        [{
          trigger: "agent-placement",
          effects: [{ kind: "gain-resource", selector: "self", resource: "water", amount: 1 }],
        }],
        {
          trigger: "agent-placement",
          source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 2 },
          state: game,
          space: secrets,
        },
      ),
    /Unsupported effect "gain-resource" for agent-placement/,
    "Agent placement specs should stay scoped to leader-transition choices until runtime semantics exist",
  );
  assert.ok(
    makerKeeper.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
    ),
    "Maker Keeper should carry a Bene Gesserit Influence-gated water Agent spec",
  );
  assert.ok(
    makerKeeper.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" && condition.faction === "fremen" && condition.amount === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 1)
    ),
    "Maker Keeper should carry a Fremen Influence-gated spice Agent spec",
  );
  assert.ok(
    hasRevealEffect(makerKeeper, (effect) => effect.kind === "gain-persuasion" && effect.amount === 2),
    "Maker Keeper should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    cargoRunner.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 2) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ) &&
    cargoRunner.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Cargo Runner should carry stacked completed-contract Agent draw specs",
  );
  assert.ok(
    hasRevealEffect(cargoRunner, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1),
    "Cargo Runner should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    maulaPistol.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Maula Pistol should carry an unconditional Agent draw spec",
  );
  assert.ok(
    hasRevealEffect(maulaPistol, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1) &&
      hasRevealEffect(maulaPistol, (effect) => effect.kind === "gain-strength" && effect.amount === 1),
    "Maula Pistol should carry fixed Reveal persuasion and strength specs",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-conflict-units" && condition.count === 3) &&
      spec.effects.some((effect) => effect.kind === "draw-intrigues" && effect.amount === 1)
    ),
	    "Chani should carry a conflict-unit-gated Agent Intrigue draw spec",
	  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Chani should carry a declarative Fremen Bond Reveal persuasion spec",
  );
	  assert.ok(
	    chani.effects?.some((spec) =>
	      spec.trigger === "reveal" &&
	      spec.effects.some((effect) =>
	        effect.kind === "retreat-troops-for-strength" &&
	        effect.amount === 2 &&
	        effect.strength === 4 &&
	        effect.optional === true
	      )
	    ),
    "Chani should carry a declarative Reveal troop-retreat strength spec",
	  );
  assert.equal(unswervingLoyalty.cost, 1, "Unswerving Loyalty should cost 1 persuasion");
  assert.deepEqual(unswervingLoyalty.icons, [], "Unswerving Loyalty should have no Agent icons");
  assert.equal(unswervingLoyalty.persuasion, 1, "Unswerving Loyalty should reveal for 1 base persuasion");
  assert.equal(unswervingLoyalty.swords, 0, "Unswerving Loyalty should not reveal for printed strength");
  assert.equal(unswervingLoyalty.conditionalPersuasion, false, "Unswerving Loyalty should use typed Fremen Bond handling");
  assert.equal(unswervingLoyalty.conditionalSwords, false, "Unswerving Loyalty should not require manual reveal strength handling");
  assert.deepEqual(unswervingLoyalty.traits, ["Faction: Fremen"], "Unswerving Loyalty should keep its Fremen trait");
  assert.ok(
    hasRevealEffect(
      unswervingLoyalty,
      (effect) => effect.kind === "gain-persuasion" && effect.selector === "self" && effect.amount === 1,
    ),
    "Unswerving Loyalty should carry its base persuasion as a typed Reveal effect",
  );
  assert.ok(
    hasRevealEffect(
      unswervingLoyalty,
      (effect) => effect.kind === "recruit-troops" && effect.selector === "self" && effect.amount === 1,
    ),
    "Unswerving Loyalty should carry its printed troop recruit as a typed Reveal effect",
  );
  assert.ok(
    unswervingLoyalty.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "deploy-or-retreat-troops" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.optional === true
      )
    ),
    "Unswerving Loyalty should model its Fremen Bond deploy-or-retreat choice as a typed Reveal pending effect",
  );
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(unswervingLoyalty.effects, {
      trigger: "reveal",
      source: { ...p2, playArea: [unswervingLoyalty, fedaykinStilltent] },
      state: game,
    }),
    [{ selector: "self", troopCount: 1, optional: true, source: undefined }],
    "Unswerving Loyalty should resolve its deploy-or-retreat pending effect after Fremen Bond is active",
  );
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(unswervingLoyalty.effects, {
      trigger: "reveal",
      source: { ...p2, playArea: [unswervingLoyalty] },
      state: game,
    }),
    [],
    "Unswerving Loyalty should not resolve its deploy-or-retreat pending effect before Fremen Bond is active",
  );
  assert.match(unswervingLoyalty.play, /No agent icons/i);
  assert.match(unswervingLoyalty.reveal, /\+1 persuasion.*Recruit 1 troop.*Fremen Bond.*deploy or retreat 1 troop/i);
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Calculus of Power should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.optional === true &&
        effect.excludeSource === true &&
        effect.requiredTrait === "Faction: Emperor" &&
        effect.strengthReward === 3 &&
        effect.zones?.length === 1 &&
        effect.zones[0] === "playArea"
      )
    ),
    "Calculus of Power should carry a declarative Reveal trash-card strength spec",
  );
  assert.ok(
    hasAgentEffect(calculus, (effect) =>
      effect.kind === "trash-card" &&
      effect.optional === true &&
      effect.sourceOnly !== true
    ),
    "Calculus of Power should use a typed Agent selected-card trash effect",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Captured Mentat should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence-for-intrigues" &&
        effect.amount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Reveal Influence-for-Intrigue spec",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-influence-and-draw" &&
        effect.selector === "self" &&
        effect.drawCards === 1 &&
        effect.influenceAmount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Agent discard-for-Influence-and-draw spec",
  );
  assert.ok(
    dangerousRhetoric.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.trashSource === true
      )
    ),
    "Dangerous Rhetoric should carry a declarative Agent gain-Influence choice spec",
  );
  assert.equal(
    dangerousRhetoric.play,
    "Gain 1 Influence and trash this card.",
    "Dangerous Rhetoric play text should expose its automated Influence choice",
  );
  assert.ok(
    desertSurvival.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.optional === true &&
        effect.sourceOnly === true &&
        effect.zones?.length === 1 &&
        effect.zones[0] === "playArea"
      )
    ),
    "Desert Survival should carry a typed optional Agent source-trash spec",
  );
  assert.ok(
    desertSurvival.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Desert Survival should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    desertSurvival.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 1)
    ),
    "Desert Survival should carry its printed strength in Reveal specs",
  );
  assert.equal(desertSurvival.play, "You may trash this card.", "Desert Survival play text should expose source trash");
  assert.equal(desertSurvival.reveal, "+1 persuasion and +1 strength.", "Desert Survival reveal text should stay fixed");
  assert.deepEqual(
    treadInDarkness.traits?.filter((trait) => trait.startsWith("Faction:")),
    ["Faction: Bene Gesserit"],
    "Tread in Darkness should normalize its Bene Gesserit trait",
  );
  assert.ok(
    treadInDarkness.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.optional === true &&
        effect.sourceOnly === true &&
        effect.drawCardsReward === 1 &&
        effect.zones?.length === 1 &&
        effect.zones[0] === "playArea"
      )
    ),
    "Tread in Darkness should carry a typed Agent source-trash draw spec gated by another Bene Gesserit card",
  );
  assert.ok(
    hasRevealEffect(treadInDarkness, (effect) => effect.kind === "gain-persuasion" && effect.amount === 2) &&
      hasRevealEffect(treadInDarkness, (effect) => effect.kind === "gain-strength" && effect.amount === 1),
    "Tread in Darkness should carry fixed Reveal persuasion and strength specs",
  );
  assert.equal(
    treadInDarkness.play,
    "If you have another Bene Gesserit card in play, you may trash this card to draw 1 card.",
    "Tread in Darkness play text should expose source trash for draw",
  );
  assert.equal(treadInDarkness.reveal, "+2 persuasion and +1 strength.", "Tread in Darkness reveal text should stay fixed");
  assert.deepEqual(
    shishakli.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          zones: ["playArea"],
          sourceOnly: true,
          drawCardsReward: 1,
        },
      ]),
    ],
    "Shishakli should only carry a typed Agent source-trash draw spec",
  );
  assert.ok(
    hasRevealEffect(shishakli, (effect) => effect.kind === "gain-strength" && effect.amount === 2),
    "Shishakli should carry its fixed Reveal strength spec",
  );
  assert.ok(
    shishakli.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.selector === "self" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      )
    ),
    "Shishakli should carry a typed Fremen Bond Reveal Fremen Influence spec",
  );
  assert.equal(shishakli.play, "You may trash this card to draw 1 card.", "Shishakli play text should expose source trash for draw");
  assert.equal(
    shishakli.reveal,
    "+2 strength. Fremen Bond: gain 1 Fremen Influence.",
    "Shishakli reveal text should describe its Fremen Bond Influence reward",
  );
  assert.deepEqual(
    hiddenMissive.traits?.filter((trait) => trait.startsWith("Faction:")),
    ["Faction: Bene Gesserit"],
    "Imported Bene Gesserit traits should normalize for Tread in Darkness card-in-play checks",
  );
  assert.equal(
    covertOperation.play,
    "Each opponent discards a card.",
    "Covert Operation play text should preserve its printed opponent discard effect",
  );
  assert.equal(
    covertOperation.reveal,
    "Gain 2 Solari.",
    "Covert Operation reveal text should preserve its printed Solari reveal",
  );
  assert.ok(
    covertOperation.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 2
      )
    ),
    "Covert Operation should carry a reveal Solari spec",
  );
  assert.ok(
    covertOperation.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "opponents-discard-cards" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Covert Operation should carry a declarative Agent opponents-discard spec",
  );
  assert.equal(
    hasAgentEffect(covertOperation, (effect) => effect.kind === "place-spies"),
    false,
    "Covert Operation should not treat its image-verified Reveal Solari icons as Agent spy placement",
  );
  assert.ok(
    beneGesseritOperative.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "Bene Gesserit Operative should carry a mandatory Agent spy-placement spec",
  );
  assert.ok(steersman, "Imperium deck should include Steersman");
  assert.ok(
    hasAgentEffect(steersman, (effect) => effect.kind === "draw-cards" && effect.amount === 1),
    "Steersman should use a typed Agent draw-card effect",
  );
  assert.ok(
    hasAgentEffect(steersman, (effect) => effect.kind === "recall-agent"),
    "Steersman should use a typed Recall Agent effect",
  );
  assert.match(steersman.play, /Draw 1 card.*Recall Agent/i);
  assert.ok(
    northernWatermaster.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
    ),
    "Northern Watermaster should carry a water Agent spec",
  );
  assert.equal(
    northernWatermaster.reveal,
    "+1 persuasion. Fremen Bond: gain 2 spice.",
    "Northern Watermaster reveal text should include its Fremen Bond spice reward",
  );
  assert.ok(
    northernWatermaster.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Northern Watermaster should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    northernWatermaster.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 2)
    ),
    "Northern Watermaster should carry a Fremen Bond Reveal spice spec",
  );
  assert.ok(
    paracompass.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 2)
    ),
    "Paracompass should carry a Solari Agent spec",
  );
  assert.equal(
    paracompass.reveal,
    "If you have a seat on the High Council, +2 persuasion. If you also have a Swordmaster, +1 persuasion.",
    "Paracompass reveal text should preserve its High Council and Swordmaster conditions",
  );
  assert.equal(paracompass.persuasion, 0, "Paracompass should not expose its conditional reveal as fixed persuasion");
  assert.ok(
    paracompass.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-high-council-seat") &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Paracompass should carry a High Council-gated Reveal persuasion spec",
  );
  assert.ok(
    paracompass.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-high-council-seat") &&
      spec.conditions?.some((condition) => condition.kind === "has-swordmaster-bonus") &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Paracompass should carry a High Council plus Swordmaster Reveal persuasion spec",
  );
  assert.equal(
    reliableInformant.play,
    "Gain 1 Solari on Emperor, Bene Gesserit, or Spacing Guild board spaces.",
    "Reliable Informant play text should name its board-space icon condition",
  );
  for (const icon of ["emperor", "bene", "spacing"]) {
    assert.ok(
      reliableInformant.effects?.some((spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some((condition) => condition.kind === "visited-space-icon" && condition.icon === icon) &&
        spec.effects.some((effect) =>
          effect.kind === "gain-resource" &&
          effect.selector === "self" &&
          effect.resource === "solari" &&
          effect.amount === 1
        )
      ),
      `Reliable Informant should carry a ${icon} board-space gated Agent Solari spec`,
    );
  }
  assert.equal(
    reliableInformant.reveal,
    "+1 persuasion. Gain 1 Solari.",
    "Reliable Informant reveal text should preserve its printed reveal Solari",
  );
  assert.ok(
    reliableInformant.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Reliable Informant should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    reliableInformant.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 1)
    ),
    "Reliable Informant should carry a reveal Solari spec",
  );
  assert.equal(
    spaceTimeFolding.play,
    "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 more card.",
    "Space-time Folding play text should preserve its conditional discard-draw effect",
  );
  assert.equal(spaceTimeFolding.reveal, "+1 persuasion.", "Space-time Folding should keep its fixed reveal persuasion");
  assert.ok(
    spaceTimeFolding.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Space-time Folding should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    spaceTimeFolding.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-draw" &&
        effect.selector === "self" &&
        effect.drawCards === 1 &&
        effect.optional === false &&
        effect.bonusDraw?.requiredDiscardTrait === "Faction: Spacing Guild" &&
        effect.bonusDraw?.drawCards === 1
      )
    ),
    "Space-time Folding should carry a declarative Agent discard-for-draw spec with a Spacing Guild bonus",
  );
  assert.equal(
    guildEnvoy.play,
    "Discard 1 card. If you discarded a Spacing Guild card, draw 2 cards.",
    "Guild Envoy play text should preserve its conditional discard-draw effect",
  );
  assert.equal(guildEnvoy.reveal, "+1 persuasion.", "Guild Envoy should keep its fixed reveal persuasion");
  assert.ok(
    guildEnvoy.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Guild Envoy should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    guildEnvoy.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-draw" &&
        effect.selector === "self" &&
        effect.drawCards === 0 &&
        effect.optional === false &&
        effect.bonusDraw?.requiredDiscardTrait === "Faction: Spacing Guild" &&
        effect.bonusDraw?.drawCards === 2
      )
    ),
    "Guild Envoy should carry a declarative Agent discard-for-draw spec with only a Spacing Guild bonus",
  );
  assert.equal(
    guildSpy.play,
    "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 Intrigue card.",
    "Guild Spy play text should preserve its conditional discard-draw Intrigue effect",
  );
  assert.equal(guildSpy.reveal, "+2 persuasion.", "Guild Spy should keep its fixed reveal persuasion");
  assert.ok(
    guildSpy.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Guild Spy should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    guildSpy.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-draw" &&
        effect.selector === "self" &&
        effect.drawCards === 1 &&
        effect.optional === false &&
        effect.bonusIntrigues?.requiredDiscardTrait === "Faction: Spacing Guild" &&
        effect.bonusIntrigues?.amount === 1
      )
    ),
    "Guild Spy should carry a declarative Agent discard-for-draw spec with a Spacing Guild Intrigue bonus",
  );
  assert.equal(
    corrinthCity.play,
    "Discard 2 cards and spend 5 Solari to gain 1 VP.",
    "Corrinth City play text should expose its Agent discard-cost VP reward",
  );
  assert.equal(
    corrinthCity.reveal,
    "+5 persuasion, or spend 5 Solari to take your High Council seat.",
    "Corrinth City reveal text should preserve its High Council branch",
  );
  assert.deepEqual(
    corrinthCity.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "discard-cards-for-reward",
          selector: "self",
          amount: 2,
          cost: { solari: 5 },
          gainVp: 1,
          source: "Corrinth City",
        },
      ]),
    ],
    "Corrinth City should model its Agent discard-cost VP reward as a typed effect",
  );
  assert.ok(
    hasRevealEffect(corrinthCity, (effect) =>
      effect.kind === "pay-resource-for-high-council-seat" &&
      effect.resource === "solari" &&
      effect.cost === 5 &&
      effect.persuasionCost === 5 &&
      effect.persuasionReward === 2 &&
      effect.source === "Corrinth City"
    ),
    "Corrinth City should model its paid High Council Reveal branch as a typed effect",
  );
  assert.equal(
    deliveryAgreement.play,
    "Discard 1 card to take a face-up CHOAM contract.",
    "Delivery Agreement play text should expose its Agent discard-contract reward",
  );
  assert.equal(
    deliveryAgreement.reveal,
    "Gain 1 spice. If you have completed four or more contracts, trash this card to gain 1 VP.",
    "Delivery Agreement reveal text should preserve its conditional VP branch",
  );
  assert.deepEqual(
    deliveryAgreement.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "discard-cards-for-reward",
          selector: "self",
          amount: 1,
          takeContracts: {
            amount: 1,
            sourcePool: "public-offer",
          },
          source: "Delivery Agreement",
        },
      ]),
    ],
    "Delivery Agreement should model its Agent discard-contract reward as a typed effect",
  );
  assert.ok(
    deliveryAgreement.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.sourceOnly === true &&
        effect.vpReward === 1
      )
    ),
    "Delivery Agreement should model its completed-contract Reveal source-trash VP branch as a typed effect",
  );
  assert.equal(
    longLiveTheFighters.play,
    "If your deck has three or more cards, look at the top three cards. Draw one, discard one, and trash one.",
    "Long Live the Fighters play text should preserve its top-deck selection effect",
  );
  assert.equal(longLiveTheFighters.reveal, "+2 persuasion and +3 strength.", "Long Live the Fighters should keep its fixed reveal rewards");
  assert.ok(
    longLiveTheFighters.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "select-top-deck-cards" &&
        effect.selector === "self" &&
        effect.lookCards === 3 &&
        effect.drawCards === 1 &&
        effect.discardCards === 1 &&
        effect.trashCards === 1 &&
        effect.minimumDeckCards === 3
      )
    ),
    "Long Live the Fighters should carry a declarative Agent top-deck selection spec",
  );
  assert.ok(
    longLiveTheFighters.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ) &&
      longLiveTheFighters.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 3)
      ),
    "Long Live the Fighters should carry typed Reveal persuasion and strength specs",
  );
  assert.deepEqual(
    branchingPath.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec(
        [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            drawIntrigues: 1,
            gain: { spice: 2 },
            optional: true,
          },
        ],
        [{ kind: "has-alliance", faction: "bene" }],
      ),
    ],
    "Branching Path should model its Bene Gesserit Alliance Intrigue trash reward as a typed Agent effect",
  );
  assert.equal(
    branchingPath.play,
    "Bene Gesserit Alliance: may trash 1 Intrigue to draw 1 Intrigue card and gain 2 spice.",
    "Branching Path play text should expose its Alliance-gated Intrigue trash reward",
  );
  assert.equal(branchingPath.reveal, "+2 persuasion.", "Branching Path should keep its fixed reveal persuasion");
  assert.deepEqual(
    junctionHeadquarters.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec(
        [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            cost: { spice: 2 },
            gainVp: 1,
            optional: true,
          },
        ],
        [{ kind: "has-alliance", faction: "spacing" }],
      ),
    ],
    "Junction Headquarters should model its Spacing Guild Alliance Intrigue trash VP reward as a typed Agent effect",
  );
  assert.ok(
    hasRevealEffect(
      junctionHeadquarters,
      (effect) => effect.kind === "gain-persuasion" && effect.selector === "self" && effect.amount === 1,
    ) &&
      hasRevealEffect(
        junctionHeadquarters,
        (effect) => effect.kind === "gain-resource" && effect.selector === "self" && effect.resource === "water" && effect.amount === 1,
      ) &&
      hasRevealEffect(
        junctionHeadquarters,
        (effect) => effect.kind === "recruit-troops" && effect.selector === "self" && effect.amount === 1,
      ),
    "Junction Headquarters should carry typed Reveal persuasion, water, and troop rewards",
  );
  assert.equal(
    junctionHeadquarters.play,
    "Spacing Guild Alliance: may trash 1 Intrigue and pay 2 spice to gain 1 VP.",
    "Junction Headquarters play text should expose its costed Intrigue trash VP reward",
  );
  assert.equal(
    junctionHeadquarters.reveal,
    "+1 persuasion. Gain 1 water and recruit 1 troop.",
    "Junction Headquarters reveal text should expose all typed reveal rewards",
  );
  assert.equal(
    spacingGuildFavor.play,
    "Draw 1 card. When discarded from hand, gain 2 spice.",
    "Spacing Guild's Favor play text should preserve its Agent draw and discard trigger",
  );
  assert.equal(spacingGuildFavor.reveal, "+2 persuasion.", "Spacing Guild's Favor should keep its fixed reveal persuasion");
  assert.ok(
    spacingGuildFavor.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Spacing Guild's Favor should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    hasAgentEffect(spacingGuildFavor, (effect) =>
      effect.kind === "draw-cards" && effect.selector === "self" && effect.amount === 1
    ),
    "Spacing Guild's Favor should carry a declarative Agent draw-card spec",
  );
  assert.ok(
    spacingGuildFavor.effects?.some((spec) =>
      spec.trigger === "discard" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      )
    ),
    "Spacing Guild's Favor should carry a declarative discard-trigger spice spec",
  );
  const spacingGuildFavorDiscardResolved = effectResolver.resolveGameEffects(spacingGuildFavor.effects, {
    trigger: "discard",
    source: p2,
    state: game,
  });
  assert.equal(
    spacingGuildFavorDiscardResolved.revealGain.spice,
    2,
    "Spacing Guild's Favor discard trigger should resolve its spice gain",
  );
  assert.ok(
    fedaykinStilltent.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
    ),
    "Fedaykin Stilltent should carry a reveal water spec",
  );
  assert.equal(fedaykinStilltent.reveal, "Gain 1 water.", "Fedaykin Stilltent reveal text should preserve its water reveal");
  assert.equal(
    fedaykinStilltent.play,
    "If you sent an Agent to a Maker board space this turn, recruit 1 troop.",
    "Fedaykin Stilltent play text should include its Maker-space condition",
  );
  assert.ok(
    fedaykinStilltent.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "visited-maker-space") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" && effect.selector === "self" && effect.amount === 1
      )
    ),
    "Fedaykin Stilltent should carry an Ally routed Maker-space troop spec",
  );
  assert.ok(
    fedaykinStilltent.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "visited-maker-space") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" && effect.selector === "activated-ally" && effect.amount === 1
      )
    ),
    "Fedaykin Stilltent should carry a Commander-to-activated-Ally Maker-space troop spec",
  );
  assert.equal(
    doubleAgent.play,
    "If you have a spy on the board space you sent an Agent to this turn, you may place a spy on the same observation post as another player's spy.",
    "Double Agent play text should include its current-space spy condition",
  );
  assert.equal(
    doubleAgent.reveal,
    "+1 persuasion and +1 strength.",
    "Double Agent reveal text should preserve its printed reveal",
  );
  assert.ok(
    doubleAgent.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "visited-space-has-spy-post") &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.allowSharedPost === true
      )
    ),
    "Double Agent should carry a current-space spy-post gated shared spy placement spec",
  );
  assert.ok(
    hasRevealEffect(doubleAgent, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1) &&
      hasRevealEffect(doubleAgent, (effect) => effect.kind === "gain-strength" && effect.amount === 1),
    "Double Agent should carry fixed Reveal persuasion and strength specs",
  );
  assert.equal(
    smuggler.play,
    "If you sent an Agent to a Maker board space this turn, gain 1 spice.",
    "Smuggler's Harvester play text should expose its Maker-space Agent reward",
  );
  assert.equal(smuggler.reveal, "+1 persuasion.", "Smuggler's Harvester reveal text should be fixed persuasion only");
  assert.ok(
    smuggler.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "visited-maker-space") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 1
      )
    ),
    "Smuggler's Harvester should carry a current-Agent Maker-space gated Agent spice spec",
  );
  assert.ok(
    hasRevealEffect(smuggler, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1),
    "Smuggler's Harvester should carry its fixed Reveal persuasion spec",
  );
  assert.equal(
    smugglersHaven.play,
    "Gain 1 VP. Pay 4 spice to summon 1 sandworm.",
    "Smuggler's Haven play text should expose its Agent VP and sandworm payment",
  );
  assert.ok(
    hasAgentEffect(
      smugglersHaven,
      (effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Smuggler's Haven should carry a typed Agent VP effect",
  );
  assert.ok(
    smugglersHaven.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-sandworms" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.cost === 4 &&
        effect.sandworms === 1 &&
        effect.recipient === "self-or-activated-ally" &&
        effect.destination === "conflict" &&
        effect.optional === true
      )
    ),
    "Smuggler's Haven should carry a typed Agent self-or-activated-Ally sandworm payment spec",
  );
  assert.equal(
    smugglersHaven.reveal,
    "+1 persuasion. If you are spying on a Maker board space, gain 2 spice.",
    "Smuggler's Haven reveal text should include its Maker-space spy condition",
  );
  assert.ok(
    smugglersHaven.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-post-on-maker-space") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      )
    ),
    "Smuggler's Haven should carry an owned Maker-space spy-post gated Reveal spice spec",
  );
  assert.ok(
    hasRevealEffect(smugglersHaven, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1),
    "Smuggler's Haven should carry its fixed Reveal persuasion spec",
  );
  assert.ok(
    hiddenMissive.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Hidden Missive should carry a Bene Influence-gated card-draw spec",
  );
  assert.equal(
    hiddenMissive.play,
    "If you have 2 or more Bene Gesserit Influence, recruit 1 troop and draw 1 card.",
    "Hidden Missive play text should include its Influence condition",
  );
  assert.ok(
    hiddenMissive.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2) &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" && effect.selector === "self" && effect.amount === 1
      )
    ),
    "Hidden Missive should carry a Bene Influence-gated Ally troop spec",
  );
  assert.ok(
    hiddenMissive.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-influence" && condition.faction === "bene" && condition.amount === 2) &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" && effect.selector === "activated-ally" && effect.amount === 1
      )
    ),
    "Hidden Missive should carry a Bene Influence-gated Commander-to-activated-Ally troop spec",
  );
  assert.ok(
    hasRevealEffect(hiddenMissive, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1) &&
      hasRevealEffect(hiddenMissive, (effect) => effect.kind === "gain-strength" && effect.amount === 1),
    "Hidden Missive should carry fixed Reveal persuasion and strength specs",
  );
  assert.ok(
    hasAgentEffect(ecologicalTestingStation, (effect) =>
      effect.kind === "pay-resource-for-draw-cards" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.cost === 2 &&
        effect.drawCards === 2 &&
        effect.optional === true
    ),
    "Ecological Testing Station should carry its Agent water-payment draw spec",
  );
  assert.ok(
    hasRevealEffect(ecologicalTestingStation, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1),
    "Ecological Testing Station should carry its fixed +1 persuasion reveal spec",
  );
  assert.ok(
    ecologicalTestingStation.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
          condition.trait === "Faction: Fremen" &&
          condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
          effect.selector === "self" &&
          effect.resource === "water" &&
          effect.amount === 1
      )
    ),
    "Ecological Testing Station should carry its Fremen Bond reveal water spec",
  );
  assert.equal(
    ecologicalTestingStation.play,
    "Pay 2 water to draw 2 cards.",
    "Ecological Testing Station play text should describe its payment choice",
  );
  assert.equal(
    ecologicalTestingStation.reveal,
    "+1 persuasion. Fremen Bond: gain 1 water.",
    "Ecological Testing Station reveal text should describe its Fremen Bond reward",
  );
  assert.ok(
    wheelsWithinWheels.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-influence" && condition.faction === "emperor" && condition.amount === 2) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 2)
    ),
    "Wheels Within Wheels should carry an Emperor Influence-gated Solari spec",
  );
  assert.equal(
    wheelsWithinWheels.play,
    "If you have 2 or more Emperor/Great Houses Influence, gain 2 Solari. If you have 2 or more Spacing Guild Influence, gain 1 spice.",
    "Wheels Within Wheels play text should include its Influence conditions",
  );
  assert.equal(
    wheelsWithinWheels.reveal,
    "+1 persuasion. Place 1 spy.",
    "Wheels Within Wheels reveal text should preserve its printed spy icon",
  );
  assert.ok(
    hasRevealEffect(wheelsWithinWheels, (effect) => effect.kind === "gain-persuasion" && effect.amount === 1),
    "Wheels Within Wheels should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    hasRevealEffect(wheelsWithinWheels, (effect) =>
      effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.mustPlace === true
    ),
    "Wheels Within Wheels should carry a Reveal spy placement spec",
  );
  assert.ok(
    wheelsWithinWheels.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-influence" && condition.faction === "spacing" && condition.amount === 2) &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 1)
    ),
    "Wheels Within Wheels should carry a Spacing Guild Influence-gated spice spec",
  );
  assert.ok(
    corrinoMight.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-troops" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.cost === 3 &&
        effect.troops === 2 &&
        effect.recipient === "same-team-allies" &&
        effect.destination === "garrison" &&
        effect.trashSource === true &&
        effect.source === "Corrino Might"
      )
    ),
    "Corrino Might should carry a typed reveal troop-payment spec",
  );
  assert.ok(
    devastatingAssault.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 1
      )
    ),
    "Devastating Assault should carry a routed Agent recruit spec",
  );
  assert.ok(
    devastatingAssault.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-swordmaster-bonus") &&
      spec.conditions?.some((condition) => condition.kind === "has-conflict-units" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-strength" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.cost === 3 &&
        effect.strength === 5 &&
        effect.source === "Devastating Assault"
      )
    ),
    "Devastating Assault should carry a typed reveal payment spec",
  );
  assert.ok(
    criticalShipments.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "commander-resource-split" &&
        effect.selector === "self" &&
        effect.source === "Critical Shipments" &&
        effect.options.length === 2 &&
        effect.options.some((option) =>
          option.commanderResource === "water" &&
          option.commanderAmount === 1 &&
          option.allyResource === "solari" &&
          option.allyAmount === 2
        ) &&
        effect.options.some((option) =>
          option.commanderResource === "solari" &&
          option.commanderAmount === 2 &&
          option.allyResource === "water" &&
          option.allyAmount === 1
        )
      )
    ),
    "Critical Shipments should carry a declarative Commander resource-split spec",
  );
  assert.ok(
    demandResults.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-contracts" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.cost === 2 &&
        effect.contractCount === 2 &&
        effect.recipient === "same-team-allies" &&
        effect.sourcePool === "public-offer" &&
        effect.optional === true &&
        effect.trashSource === true &&
        effect.source === "Demand Results"
      )
    ),
    "Demand Results should carry a typed Agent public-contract payment spec",
  );
  assert.ok(
    imperialTent.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "move-card-to-throne-row" &&
        effect.selector === "self" &&
        effect.source === "Imperial Tent"
      )
    ),
    "Imperial Tent should carry a declarative Agent Throne Row movement spec",
  );
  assert.ok(
    emperorSignet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "block-conflict-deployment" &&
        effect.selector === "self" &&
        effect.source === "Emperor of the Known Universe"
      )
    ),
    "Shaddam Signet Ring should carry a declarative Agent deployment-block spec",
  );
  const shaddamSignetPaidRewardOptions = [
    {
      id: "troop",
      resource: "solari",
      cost: 1,
      reward: { kind: "recruit-troops", selector: "activated-ally", amount: 1, destination: "garrison" },
    },
    {
      id: "emperor",
      resource: "solari",
      cost: 3,
      reward: { kind: "gain-influence", selector: "self", faction: "emperor", amount: 1 },
    },
    {
      id: "greatHouses",
      resource: "solari",
      cost: 3,
      reward: { kind: "gain-influence", selector: "activated-ally", faction: "greatHouses", amount: 1 },
    },
    {
      id: "spacing",
      resource: "solari",
      cost: 3,
      reward: { kind: "gain-influence", selector: "activated-ally", faction: "spacing", amount: 1 },
    },
    {
      id: "bene",
      resource: "solari",
      cost: 3,
      reward: { kind: "gain-influence", selector: "activated-ally", faction: "bene", amount: 1 },
    },
    {
      id: "fringeWorlds",
      resource: "solari",
      cost: 3,
      reward: { kind: "gain-influence", selector: "activated-ally", faction: "fringeWorlds", amount: 1 },
    },
  ];
  const shaddamSignetPaidRewardSpec = emperorSignet.effects?.find((spec) =>
    spec.trigger === "agent-play" &&
    spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
    spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
    spec.effects.some((effect) => effect.kind === "paid-reward-choice")
  );
  assert.ok(shaddamSignetPaidRewardSpec, "Shaddam Signet Ring should carry a typed paid reward choice spec");
  const shaddamSignetPaidReward = shaddamSignetPaidRewardSpec.effects.find((effect) => effect.kind === "paid-reward-choice");
  assert.deepEqual(
    shaddamSignetPaidReward,
    {
      kind: "paid-reward-choice",
      selector: "self",
      source: "Emperor of the Known Universe",
      requiredRecipient: "activated-ally",
      options: shaddamSignetPaidRewardOptions,
    },
    "Shaddam Signet Ring paid reward spec should encode troop and Influence payment branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(emperorSignet.effects, {
      trigger: "agent-play",
      source: p4,
      target: p6,
      state: game,
    }),
    [{
      selector: "self",
      source: "Emperor of the Known Universe",
      requiredRecipient: "activated-ally",
      options: shaddamSignetPaidRewardOptions,
    }],
    "Shaddam Signet Ring paid reward resolver should expose all Solari payment branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(emperorSignet.effects, {
      trigger: "agent-play",
      source: p2,
      target: p1,
      state: game,
    }),
    [],
    "Shaddam Signet Ring paid reward spec should be Shaddam Commander gated",
  );
  for (const card of revealSpecCards) {
    assert.deepEqual(
      actualFixedReveal(turnActions, p2, card),
      expectedFixedReveal(card),
      `${card.name} reveal spec should match its fixed printed reveal fields before conditional context`,
    );
  }

  const legacyReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [{ ...convincingArgument, effects: undefined }, { ...dagger, effects: undefined }],
    highCouncilSeat: false,
  });
  assert.equal(legacyReveal.persuasion, 2, "Legacy reveal cards should still use printed persuasion");
  assert.equal(legacyReveal.swords, 1, "Legacy reveal cards should still use printed strength");

  const specReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [convincingArgument, dagger],
    highCouncilSeat: false,
  });
  assert.equal(specReveal.persuasion, 2, "Spec starter cards should reveal for their printed persuasion");
  assert.equal(specReveal.swords, 1, "Spec starter cards should reveal for their printed strength");
  const covertOperationReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [covertOperation],
    highCouncilSeat: false,
  });
  assert.equal(covertOperationReveal.persuasion, 0, "Covert Operation should not reveal for persuasion");
  assert.equal(covertOperationReveal.swords, 0, "Covert Operation should not reveal for strength");
  assert.deepEqual(covertOperationReveal.revealGain, { solari: 2 }, "Covert Operation should reveal for 2 Solari");
  assert.deepEqual(covertOperationReveal.printedRevealCards, [], "Covert Operation typed Reveal should not need manual fallback");
  const covertSource = { ...p2, hand: [], playArea: [covertOperation] };
  const covertOpponents = game.players.filter((player) => player.team !== covertSource.team);
  const covertSameTeamAlly = game.players.find((player) => player.team === covertSource.team && player.id !== covertSource.id);
  assert.ok(covertOpponents.length >= 2 && covertSameTeamAlly, "Covert Operation fixture should have opposing players and a teammate");
  const covertDiscardA = { ...dagger, id: "covert-operation-discard-a" };
  const covertDiscardA2 = { ...convincingArgument, id: "covert-operation-discard-a-2" };
  const covertDiscardB = { ...convincingArgument, id: "covert-operation-discard-b" };
  const covertSameTeamHandCard = { ...dagger, id: "covert-operation-same-team-hand" };
  const covertFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === covertSource.id) return covertSource;
      if (player.id === covertOpponents[0].id) return { ...player, hand: [covertDiscardA], discard: [] };
      if (player.id === covertOpponents[1].id) return { ...player, hand: [covertDiscardB], discard: [] };
      if (player.id === covertSameTeamAlly.id) return { ...player, hand: [covertSameTeamHandCard], discard: [] };
      return { ...player, hand: [], discard: [] };
    }),
  };
  const covertPendings = state.pendingActionsForCard(covertOperation, covertSource, covertFixture);
  assert.deepEqual(
    covertPendings.map((pending) => pending.kind),
    ["discard-hand-card", "discard-hand-card"],
    "Covert Operation should queue one hand-discard prompt for each opponent with a card",
  );
  assert.deepEqual(
    covertPendings.map((pending) => pending.ownerId),
    [covertOpponents[0].id, covertOpponents[1].id],
    "Covert Operation discard prompts should target opposing-team players in table order",
  );
  assert.equal(covertPendings[0].remaining, 1, "Covert Operation should make each targeted opponent discard one card");
  const covertQueued = {
    ...covertFixture,
    pendingAction: covertPendings[0],
    pendingQueue: covertPendings.slice(1),
  };
  const covertFinishAttempt = state.finishPendingAction(covertQueued);
  assert.equal(
    covertFinishAttempt.pendingAction,
    covertQueued.pendingAction,
    "Mandatory Covert Operation hand discard should not be skippable through finishPendingAction",
  );
  const covertFirstResolved = state.resolveDiscardHandCardChoice(
    covertQueued,
    covertQueued.pendingAction,
    covertDiscardA.id,
  );
  assert.equal(
    playerById(covertFirstResolved, covertOpponents[0].id).discard.at(-1).id,
    covertDiscardA.id,
    "Covert Operation should discard the selected opponent card",
  );
  assert.equal(
    covertFirstResolved.pendingAction?.ownerId,
    covertOpponents[1].id,
    "Covert Operation should advance to the next opponent discard prompt",
  );
  assert.deepEqual(
    playerById(covertFirstResolved, covertSameTeamAlly.id).hand.map((card) => card.id),
    [covertSameTeamHandCard.id],
    "Covert Operation should not make same-team players discard",
  );
  const covertSecondResolved = state.resolveDiscardHandCardChoice(
    covertFirstResolved,
    covertFirstResolved.pendingAction,
    covertDiscardB.id,
  );
  assert.equal(covertSecondResolved.pendingAction, undefined, "Covert Operation should clear pending after all opponents discard");
  assert.equal(
    playerById(covertSecondResolved, covertOpponents[1].id).discard.at(-1).id,
    covertDiscardB.id,
    "Covert Operation should resolve the queued second opponent discard",
  );
  assert.match(covertSecondResolved.log[0], /Covert Operation: discards Convincing Argument/);
  const covertNoOpponentsWithCardsFixture = {
    ...covertFixture,
    players: covertFixture.players.map((player) =>
      player.team !== covertSource.team ? { ...player, hand: [], discard: [] } : player
    ),
  };
  assert.deepEqual(
    state.pendingActionsForCard(covertOperation, covertSource, covertNoOpponentsWithCardsFixture),
    [],
    "Covert Operation should not queue discard prompts when no opponent has hand cards",
  );
  const stackedOpponentDiscardCard = {
    ...covertOperation,
    id: "effect-spec-stacked-opponent-discard-card",
    name: "Effect Spec Stacked Opponent Discard",
    effects: [agentSpec([
      { kind: "opponents-discard-cards", selector: "self", amount: 1 },
      { kind: "opponents-discard-cards", selector: "self", amount: 1 },
    ])],
  };
  const stackedOpponentDiscardSource = {
    ...covertSource,
    playArea: [stackedOpponentDiscardCard],
  };
  const stackedOpponentDiscardFixture = {
    ...covertFixture,
    players: covertFixture.players.map((player) =>
      player.id === stackedOpponentDiscardSource.id
        ? stackedOpponentDiscardSource
        : player.id === covertOpponents[0].id
          ? { ...player, hand: [covertDiscardA, covertDiscardA2], discard: [] }
          : player
    ),
  };
  const stackedOpponentDiscardPendings = state.pendingActionsForCard(
    stackedOpponentDiscardCard,
    stackedOpponentDiscardSource,
    stackedOpponentDiscardFixture,
  );
  assert.deepEqual(
    stackedOpponentDiscardPendings.map((pending) => pending.ownerId),
    [covertOpponents[0].id, covertOpponents[1].id],
    "Stacked opponent-discard specs should aggregate into one capped pending action per opponent",
  );
  assert.deepEqual(
    stackedOpponentDiscardPendings.map((pending) => pending.remaining),
    [2, 1],
    "Stacked opponent-discard specs should sum effects and cap each pending action by that opponent's hand size",
  );
  const spyAndOpponentDiscardCard = {
    ...covertOperation,
    id: "effect-spec-spy-and-opponent-discard-card",
    name: "Effect Spec Spy And Opponent Discard",
    effects: [agentSpec([
      { kind: "place-spies", selector: "self", amount: 1 },
      { kind: "opponents-discard-cards", selector: "self", amount: 1 },
    ])],
  };
  const spyAndDiscardSource = {
    ...covertSource,
    playArea: [spyAndOpponentDiscardCard],
    spies: 1,
  };
  const spyAndDiscardFixture = {
    ...covertFixture,
    spyPosts: {},
    sharedSpyPosts: {},
    players: covertFixture.players.map((player) => player.id === spyAndDiscardSource.id ? spyAndDiscardSource : player),
  };
  const spyAndDiscardPendings = state.pendingActionsForCard(
    spyAndOpponentDiscardCard,
    spyAndDiscardSource,
    spyAndDiscardFixture,
  );
  assert.deepEqual(
    spyAndDiscardPendings.map((pending) => pending.kind),
    ["spy", "discard-hand-card", "discard-hand-card"],
    "Typed card pending primitives should compose spy placement before opponent discard prompts",
  );
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
  const chaniSoloReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(chaniSoloReveal.persuasion, 0, "Fremen Bond should not trigger from Chani alone");
  assert.deepEqual(chaniSoloReveal.printedRevealCards, [], "Chani Fremen Bond should not need manual reveal fallback");
  const chaniHandBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani, fremenSupportCard],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(chaniHandBondReveal.persuasion, 2, "Fremen Bond should count another Fremen card revealed from hand");
  const chaniPlayAreaBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [fremenSupportCard],
    highCouncilSeat: false,
  });
  assert.equal(chaniPlayAreaBondReveal.persuasion, 2, "Fremen Bond should count another Fremen card already in play");

  const overrideCard = {
    ...convincingArgument,
    id: "effect-spec-override-card",
    name: "Effect Spec Override",
    persuasion: 99,
    swords: 99,
    revealGain: { spice: 99 },
    effects: [revealSpec([
      { kind: "gain-persuasion", selector: "self", amount: 2 },
      { kind: "gain-strength", selector: "self", amount: 1 },
      { kind: "gain-resource", selector: "self", resource: "water", amount: 1 },
    ])],
  };
  const overrideReveal = turnActions.revealTurnPlan({ ...p2, hand: [overrideCard], highCouncilSeat: false });
  assert.equal(overrideReveal.persuasion, 2, "Reveal specs should override legacy card persuasion");
  assert.equal(overrideReveal.swords, 1, "Reveal specs should override legacy card strength");
  assert.deepEqual(overrideReveal.revealGain, { water: 1 }, "Reveal specs should override legacy revealGain");
  const unsupportedSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-selector-card",
    name: "Effect Spec Unsupported Selector",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "teammate", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "teammate"/,
    "Unsupported effect selectors should fail loudly instead of silently becoming no-ops",
  );
  const unsupportedAmountCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-amount-card",
    name: "Effect Spec Unsupported Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: { kind: "renown" } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedAmountCard], highCouncilSeat: false }),
    /Unsupported effect amount "renown"/,
    "Unsupported effect amounts should fail loudly instead of silently becoming zero",
  );
  const negativeAmountCard = {
    ...convincingArgument,
    id: "effect-spec-negative-amount-card",
    name: "Effect Spec Negative Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: -1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [negativeAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Gain effect amounts should be non-negative integers",
  );
  const invalidRevealVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-vp-card",
    name: "Effect Spec Invalid Reveal VP",
    effects: [revealSpec([{ kind: "gain-vp", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealVpCard], highCouncilSeat: false }),
    /Unsupported effect "gain-vp" for reveal/,
    "Acquire VP effects should not silently run during Reveal",
  );
  const invalidRevealLoseInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-lose-influence-card",
    name: "Effect Spec Invalid Reveal Lose Influence",
    effects: [revealSpec([{ kind: "lose-influence", selector: "self", faction: "bene", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealLoseInfluenceCard], highCouncilSeat: false }),
    /Unsupported effect "lose-influence" for reveal/,
    "Influence-loss effects should stay on Plot specs until other triggers can apply them",
  );
  const invalidRevealAcquireRecruitBonusCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-acquire-recruit-bonus-card",
    name: "Effect Spec Invalid Reveal Acquire Recruit Bonus",
    effects: [revealSpec([{ kind: "activate-acquire-recruit-bonus", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealAcquireRecruitBonusCard], highCouncilSeat: false }),
    /Unsupported effect "activate-acquire-recruit-bonus" for reveal/,
    "Acquire-recruit bonus activation should stay on Plot specs",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [{ trigger: "plot-intrigue", effects: [{ kind: "activate-acquire-recruit-bonus", selector: "self", amount: 2 }] }],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid activate-acquire-recruit-bonus amount "2"/,
    "Acquire-recruit bonus activation currently supports exactly one troop per acquisition",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "remove-shield-wall", selector: "self", source: "Test" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "remove-shield-wall" for agent-play/,
    "Shield Wall removal specs should stay on Plot Intrigues",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "remove-shield-wall", selector: "activated-ally", source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Shield Wall removal specs should target only the source player",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "remove-shield-wall", selector: "self", source: "" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid remove-shield-wall source ""/,
    "Shield Wall removal specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolvePlotDeployTroops(
      [agentSpec([{ kind: "deploy-troops", selector: "self", max: 1, source: "Test" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "deploy-troops" for agent-play/,
    "Deploy-troops specs should stay on Plot Intrigues",
  );
  assert.throws(
    () => effectResolver.resolvePlotDeployTroops(
      [plotSpec([{ kind: "deploy-troops", selector: "opponent", max: 1, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "opponent" for deploy-troops/,
    "Deploy-troops specs should reject unsupported selectors",
  );
  assert.throws(
    () => effectResolver.resolvePlotDeployTroops(
      [plotSpec([{ kind: "deploy-troops", selector: "self", max: 0, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid deploy-troops max "0"/,
    "Deploy-troops specs should require a positive max",
  );
  assert.throws(
    () => effectResolver.resolvePlotDeployTroops(
      [plotSpec([{ kind: "deploy-troops", selector: "self", max: { kind: "completed-contracts" }, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid deploy-troops max "\[object Object\]"/,
    "Deploy-troops specs should reject dynamic max amounts",
  );
  assert.throws(
    () => effectResolver.resolvePlotDeployTroops(
      [plotSpec([{ kind: "deploy-troops", selector: "self", max: 1, source: "" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid deploy-troops source ""/,
    "Deploy-troops specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolvePlotSummonSandworms(
      [agentSpec([{ kind: "summon-sandworms", selector: "self", amount: 1, source: "Test" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "summon-sandworms" for agent-play/,
    "Summon-sandworms specs should stay on Plot Intrigues",
  );
  assert.throws(
    () => effectResolver.resolvePlotSummonSandworms(
      [plotSpec([{ kind: "summon-sandworms", selector: "opponent", amount: 1, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "opponent" for summon-sandworms/,
    "Summon-sandworms specs should reject unsupported selectors",
  );
  assert.throws(
    () => effectResolver.resolvePlotSummonSandworms(
      [plotSpec([{ kind: "summon-sandworms", selector: "self", amount: 0, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid summon-sandworms amount "0"/,
    "Summon-sandworms specs should require a positive amount",
  );
  assert.throws(
    () => effectResolver.resolvePlotSummonSandworms(
      [plotSpec([{ kind: "summon-sandworms", selector: "self", amount: { kind: "completed-contracts" }, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid summon-sandworms amount "\[object Object\]"/,
    "Summon-sandworms specs should reject dynamic amounts",
  );
  assert.throws(
    () => effectResolver.resolvePlotSummonSandworms(
      [plotSpec([{ kind: "summon-sandworms", selector: "self", amount: 1, source: "" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid summon-sandworms source ""/,
    "Summon-sandworms specs should reject empty source labels",
  );
  const invalidAcquirePersuasionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-persuasion-card",
    name: "Effect Spec Invalid Acquire Persuasion",
    cost: 0,
    effects: [{ trigger: "acquire", effects: [{ kind: "gain-persuasion", selector: "self", amount: 1 }] }],
  };
  const invalidAcquireFixtureBase = withActivePlayer(game, p2.id, () => ({
    revealed: true,
  }));
  const invalidAcquireFixture = {
    ...invalidAcquireFixtureBase,
    imperiumRow: [invalidAcquirePersuasionCard],
    marketDeck: [],
  };
  assert.throws(
    () => state.acquireMarketCard(invalidAcquireFixture, p2.id, invalidAcquirePersuasionCard.id),
    /Unsupported effect "gain-persuasion" for acquire/,
    "Acquire specs should reject non-acquire reward effect kinds",
  );
  const invalidAcquireSpyPlacementCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-card",
    name: "Effect Spec Invalid Acquire Spy Placement",
    cost: 0,
    effects: [{ trigger: "acquire", effects: [{ kind: "place-spies", selector: "self", amount: -1 }] }],
  };
  const invalidAcquireSpyPlacementFixture = {
    ...invalidAcquireFixtureBase,
    imperiumRow: [invalidAcquireSpyPlacementCard],
    marketDeck: [],
  };
  assert.throws(
    () => state.acquireMarketCard(invalidAcquireSpyPlacementFixture, p2.id, invalidAcquireSpyPlacementCard.id),
    /Invalid effect amount "-1"/,
    "Acquire spy-placement specs should validate effect amounts",
  );
  const invalidAcquireSpyPlacementIconCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-icon-card",
    name: "Effect Spec Invalid Acquire Spy Placement Icon",
    cost: 0,
    effects: [{ trigger: "acquire", effects: [{ kind: "place-spies", selector: "self", amount: 1, placementIcon: "worm" }] }],
  };
  assert.throws(
    () => state.acquireMarketCard(
      { ...invalidAcquireFixtureBase, imperiumRow: [invalidAcquireSpyPlacementIconCard], marketDeck: [] },
      p2.id,
      invalidAcquireSpyPlacementIconCard.id,
    ),
    /Unsupported effect icon "worm"/,
    "Acquire spy-placement specs should reject unsupported placement icons",
  );
  const invalidAcquireSpyPlacementFlagCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-flag-card",
    name: "Effect Spec Invalid Acquire Spy Placement Flag",
    cost: 0,
    effects: [{ trigger: "acquire", effects: [{ kind: "place-spies", selector: "self", amount: 1, recallForSupply: "yes" }] }],
  };
  assert.throws(
    () => state.acquireMarketCard(
      { ...invalidAcquireFixtureBase, imperiumRow: [invalidAcquireSpyPlacementFlagCard], marketDeck: [] },
      p2.id,
      invalidAcquireSpyPlacementFlagCard.id,
    ),
    /Invalid place-spies recallForSupply "yes"/,
    "Acquire spy-placement specs should reject non-boolean recallForSupply flags",
  );
  const invalidAcquireDrawIntriguesCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-draw-intrigues-card",
    name: "Effect Spec Invalid Acquire Draw Intrigues",
    cost: 0,
    effects: [{ trigger: "acquire", effects: [{ kind: "draw-intrigues", selector: "self", amount: -1 }] }],
  };
  assert.throws(
    () => state.acquireMarketCard(
      { ...invalidAcquireFixtureBase, imperiumRow: [invalidAcquireDrawIntriguesCard], marketDeck: [] },
      p2.id,
      invalidAcquireDrawIntriguesCard.id,
    ),
    /Invalid effect amount "-1"/,
    "Acquire draw-Intrigue specs should validate effect amounts",
  );
  const fractionalAmountCard = {
    ...convincingArgument,
    id: "effect-spec-fractional-amount-card",
    name: "Effect Spec Fractional Amount",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: 1.5 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [fractionalAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "1.5"/,
    "Gain effect amounts should not accept fractional values",
  );
  const invalidMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-multiplier-card",
    name: "Effect Spec Invalid Multiplier",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: {
      kind: "completed-contracts",
      multiplier: Number.NaN,
    } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidMultiplierCard], highCouncilSeat: false }),
    /Invalid completed-contracts multiplier "NaN"/,
    "Completed-contract multipliers should be finite when present",
  );
  const negativeMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-negative-multiplier-card",
    name: "Effect Spec Negative Multiplier",
    effects: [revealSpec([{ kind: "gain-persuasion", selector: "self", amount: {
      kind: "completed-contracts",
      multiplier: -1,
    } }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [negativeMultiplierCard], highCouncilSeat: false }),
    /Invalid completed-contracts multiplier "-1"/,
    "Completed-contract multipliers should be non-negative integers when present",
  );
  const unsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-condition-card",
    name: "Effect Spec Unsupported Condition",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-troops" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedConditionCard], highCouncilSeat: false }),
    /Unsupported effect condition "has-troops"/,
    "Unsupported effect conditions should fail loudly instead of silently becoming false",
  );
  const skippedUnsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-skipped-unsupported-condition-card",
    name: "Effect Spec Skipped Unsupported Condition",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "visited-maker-space" }, { kind: "has-troops" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [skippedUnsupportedConditionCard], highCouncilSeat: false }),
    /Unsupported effect condition "has-troops"/,
    "Unsupported effect conditions should fail before applicability short-circuiting can hide them",
  );
  const invalidSpyCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-count-card",
    name: "Effect Spec Invalid Spy Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-spy-posts" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidSpyCountCard], highCouncilSeat: false }),
    /Invalid has-spy-posts count "undefined"/,
    "Spy-count conditions should fail loudly when count is missing",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [combatSpec(
        [{ kind: "gain-strength", selector: "self", amount: 1 }],
        [{ kind: "has-combat-recipient-sandworms" }],
      )],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid has-combat-recipient-sandworms count "undefined"/,
    "Combat recipient sandworm conditions should fail loudly when count is missing",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [revealSpec(
        [{ kind: "gain-strength", selector: "self", amount: 1 }],
        [{ kind: "has-combat-recipient" }],
      )],
      { trigger: "reveal", source: p2, state: game },
    ),
    /Unsupported effect condition "has-combat-recipient" for reveal/,
    "Combat recipient conditions should be rejected outside Combat Intrigue specs",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [revealSpec(
        [{ kind: "gain-strength", selector: "self", amount: 1 }],
        [{ kind: "has-combat-recipient-sandworms", count: 1 }],
      )],
      { trigger: "reveal", source: p2, state: game },
    ),
    /Unsupported effect condition "has-combat-recipient-sandworms" for reveal/,
    "Combat recipient sandworm conditions should be rejected outside Combat Intrigue specs",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [combatSpec(
        [{ kind: "gain-strength", selector: "self", amount: 1 }],
        [{ kind: "has-combat-recipient-sandworms", count: 0 }],
      )],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid has-combat-recipient-sandworms count "0"/,
    "Combat recipient sandworm conditions should require a positive threshold",
  );
  const invalidDeployedUnitsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployed-units-count-card",
    name: "Effect Spec Invalid Deployed Units Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "deployed-units-this-turn", count: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployedUnitsCountCard], highCouncilSeat: false }),
    /Invalid deployed-units-this-turn count "-1"/,
    "Deployed-unit conditions should require a non-negative integer threshold",
  );
  const invalidInfluenceFactionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-faction-card",
    name: "Effect Spec Invalid Influence Faction",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-influence", faction: "guild", amount: 1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceFactionCard], highCouncilSeat: false }),
    /Unsupported effect faction "guild"/,
    "Influence conditions should reject unsupported faction ids",
  );
  const invalidInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-amount-card",
    name: "Effect Spec Invalid Influence Amount",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-influence", faction: "bene", amount: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceAmountCard], highCouncilSeat: false }),
    /Invalid has-influence amount "-1"/,
    "Influence conditions should require a non-negative integer threshold",
  );
  const invalidCompletedContractsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-completed-contracts-count-card",
    name: "Effect Spec Invalid Completed Contracts Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-completed-contracts", count: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCompletedContractsCountCard], highCouncilSeat: false }),
    /Invalid has-completed-contracts count "-1"/,
    "Completed-contract conditions should require a non-negative integer threshold",
  );
  const invalidCardTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-card",
    name: "Effect Spec Invalid Card Trait",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-card-trait-in-play", trait: "" }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCardTraitCard], highCouncilSeat: false }),
    /Invalid has-card-trait-in-play trait ""/,
    "Card-trait conditions should require a non-empty trait",
  );
  const invalidCardTraitCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-count-card",
    name: "Effect Spec Invalid Card Trait Count",
    effects: [revealSpec(
      [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      [{ kind: "has-card-trait-in-play", trait: "Faction: Fremen", count: -1 }],
    )],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidCardTraitCountCard], highCouncilSeat: false }),
    /Invalid has-card-trait-in-play count "-1"/,
    "Card-trait conditions should require a non-negative integer threshold",
  );
  const invalidTeamConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-team-condition-card",
    name: "Effect Spec Invalid Team Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-team", team: "atreides" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTeamConditionCard, p2, p2),
    /Unsupported effect team "atreides"/,
    "Team conditions should reject unsupported team ids",
  );
  const invalidRoleConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-role-condition-card",
    name: "Effect Spec Invalid Role Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-role", role: "Captain" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRoleConditionCard, p2, p2),
    /Unsupported effect role "Captain"/,
    "Role conditions should reject unsupported role ids",
  );
  const invalidLeaderConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-leader-condition-card",
    name: "Effect Spec Invalid Leader Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-leader", leader: "" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidLeaderConditionCard, p2, p2),
    /Invalid has-leader leader ""/,
    "Leader conditions should require a non-empty leader name",
  );
  const invalidAllianceConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-alliance-condition-card",
    name: "Effect Spec Invalid Alliance Condition",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "has-alliance", faction: "sardaukar" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAllianceConditionCard, p2, p2),
    /Unsupported effect faction "sardaukar"/,
    "Alliance conditions should reject unsupported factions",
  );
  const invalidGainResourceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-resource-source-card",
    name: "Effect Spec Invalid Gain Resource Source",
    effects: [agentSpec([{ kind: "gain-resource", selector: "self", resource: "spice", amount: 1, source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainResourceSourceCard, p2, p2),
    /Invalid gain-resource source ""/,
    "Resource gain specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "spend-resource", selector: "self", resource: "spice", amount: 1 }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "spend-resource" for agent-play/,
    "Spend-resource specs should stay on Plot Intrigue until other trigger resolvers support them",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "spend-resource", selector: "self", resource: "melange", amount: 1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect resource "melange"/,
    "Spend-resource specs should reject unsupported resources",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "spend-resource", selector: "self", resource: "spice", amount: -1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid effect amount "-1"/,
    "Spend-resource specs should validate effect amounts",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "spend-resource", selector: "self", resource: "spice", amount: 1, source: "" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid spend-resource source ""/,
    "Spend-resource specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "lose-influence", selector: "self", faction: "guild", amount: 1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect faction "guild"/,
    "Lose-influence specs should reject unsupported faction ids",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "lose-influence", selector: "self", faction: "bene", amount: -1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid effect amount "-1"/,
    "Lose-influence specs should validate effect amounts",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "gain-influence", selector: "self", faction: "bene", amount: 1 }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "gain-influence" for agent-play/,
    "Gain-influence specs should stay on Plot Intrigue until other trigger resolvers support them",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "gain-influence", selector: "self", faction: "guild", amount: 1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect faction "guild"/,
    "Gain-influence specs should reject unsupported faction ids",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "gain-influence", selector: "self", faction: "bene", amount: -1 }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid effect amount "-1"/,
    "Gain-influence specs should validate effect amounts",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [revealSpec([{ kind: "gain-board-space-influence", selector: "self", amount: 1 }])],
      { trigger: "reveal", source: p2, state: game },
    ),
    /Unsupported effect "gain-board-space-influence" for reveal/,
    "Board-space Influence specs should stay on Agent play",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "gain-board-space-influence", selector: "self", amount: 0 }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Invalid gain-board-space-influence amount "0"/,
    "Board-space Influence specs should validate positive effect amounts",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "gain-board-space-influence", selector: "activated-ally", amount: 1 }])],
      { trigger: "agent-play", source: p2, target: p2, state: game },
    ),
    /Unsupported effect selector "activated-ally" for gain-board-space-influence/,
    "Board-space Influence specs should stay self-scoped",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "gain-board-space-influence", selector: "self", amount: 1, trashSource: "yes" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Invalid gain-board-space-influence trashSource "yes"/,
    "Board-space Influence specs should reject malformed trashSource flags",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [{ trigger: "plot-intrigue", choiceId: "", effects: [{ kind: "draw-cards", selector: "self", amount: 1 }] }],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid choiceId ""/,
    "Choice specs should reject empty choice ids",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(
      [agentSpec([{ kind: "take-contracts", selector: "self", amount: 1, sourcePool: "public-offer" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: undefined }],
    "Take-contract specs should support Agent public-offer contract pendings",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [plotSpec([{ kind: "take-contracts", selector: "activated-ally", amount: 1, sourcePool: "public-offer" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Take-contract specs should reject activated Ally selectors",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [plotSpec([{ kind: "take-contracts", selector: "self", amount: 1, sourcePool: "reserved" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid take-contracts sourcePool "reserved"/,
    "Take-contract specs should reject unsupported contract source pools",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [plotSpec([{ kind: "take-contracts", selector: "self", amount: 0, sourcePool: "public-offer" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid take-contracts amount "0"/,
    "Take-contract specs should reject zero contract amounts",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [plotSpec([{ kind: "take-contracts", selector: "self", amount: 2, sourcePool: "public-offer" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid take-contracts amount "2"/,
    "Take-contract specs should reject unsupported multi-contract amounts",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [plotSpec([{ kind: "take-contracts", selector: "self", amount: { kind: "completed-contracts" }, sourcePool: "public-offer" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid take-contracts amount "\[object Object\]"/,
    "Take-contract specs should reject dynamic contract amounts",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [combatSpec([{ kind: "take-contracts", selector: "self", amount: 1, sourcePool: "public-offer", optional: true }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid combat take-contracts optional "true"/,
    "Combat take-contract specs should remain mandatory until an optional Combat contract UI exists",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [agentSpec([{ kind: "take-contracts", selector: "self", amount: 1, sourcePool: "public-offer", optional: true }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Invalid agent take-contracts optional "true"/,
    "Agent take-contract specs should remain mandatory until an optional Agent contract UI exists",
  );
  assert.throws(
    () => effectResolver.resolveTakeContracts(
      [acquireSpec([{ kind: "take-contracts", selector: "self", amount: 1, sourcePool: "public-offer", optional: true }])],
      { trigger: "acquire", source: p2, state: game },
    ),
    /Invalid acquire take-contracts optional "true"/,
    "Acquire take-contract specs should remain mandatory",
  );
  const invalidDrawCardsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-draw-cards-source-card",
    name: "Effect Spec Invalid Draw Cards Source",
    effects: [agentSpec([{ kind: "draw-cards", selector: "self", amount: 1, source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDrawCardsSourceCard, p2, p2),
    /Invalid draw-cards source ""/,
    "Draw-card specs should reject empty source labels",
  );
  const invalidRecruitTroopsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recruit-troops-source-card",
    name: "Effect Spec Invalid Recruit Troops Source",
    effects: [agentSpec([{ kind: "recruit-troops", selector: "self", amount: 1, source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecruitTroopsSourceCard, p2, p2),
    /Invalid recruit-troops source ""/,
    "Recruit specs should reject empty source labels",
  );
  const invalidSpyPlacementAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-amount-card",
    name: "Effect Spec Invalid Spy Placement Amount",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "place-spies", selector: "self", amount: -1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidSpyPlacementAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Spy placement effect amounts should require a non-negative integer amount",
  );
  const agentManipulateRowCard = {
    ...convincingArgument,
    id: "effect-spec-agent-manipulate-row-card",
    name: "Effect Spec Agent Manipulate Row",
    effects: [agentSpec([{ kind: "manipulate-row-card", selector: "self", source: "Test" }])],
  };
  assert.throws(
    () => effectResolver.resolveManipulateRowCards(agentManipulateRowCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Unsupported effect "manipulate-row-card" for agent-play/,
    "Manipulate-row-card specs should fail outside Plot Intrigues",
  );
  const invalidManipulateRowSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-manipulate-row-selector-card",
    name: "Effect Spec Invalid Manipulate Row Selector",
    effects: [plotSpec([{ kind: "manipulate-row-card", selector: "activated-ally", source: "Test" }])],
  };
  assert.throws(
    () => effectResolver.resolveManipulateRowCards(invalidManipulateRowSelectorCard.effects, {
      trigger: "plot-intrigue",
      source: p2,
      target: p4,
      state: game,
    }),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Manipulate-row-card specs should currently target only the source player",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [agentSpec([{ kind: "recall-spy", selector: "self", source: "Test" }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "recall-spy" for agent-play/,
    "Recall-spy specs should stay on Plot or Combat Intrigue triggers until other trigger resolvers support them",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "recall-spy", selector: "activated-ally", source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, target: p4, state: game },
    ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Recall-spy specs should currently target only the source player",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "recall-spy", selector: "self", reward: { resource: "intrigue", amount: 1 } }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect resource "intrigue"/,
    "Recall-spy specs should reject unsupported reward resources",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "recall-spy", selector: "self", removeShieldWall: "yes" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Invalid recall-spy removeShieldWall "yes"/,
    "Recall-spy specs should reject non-boolean Shield Wall flags",
  );
  assert.throws(
    () => effectResolver.resolveCombatSpyRecallForStrengths(
      [{ trigger: "combat-intrigue", effects: [{ kind: "recall-spy", selector: "self", strengthReward: 3, source: "Test" }] }],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid recall-spy amount "undefined"/,
    "Combat recall-spy specs should require a spy count",
  );
  assert.throws(
    () => effectResolver.resolveCombatSpyRecallForStrengths(
      [{ trigger: "combat-intrigue", effects: [{ kind: "recall-spy", selector: "self", amount: 1, source: "Test" }] }],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid recall-spy strengthReward "undefined"/,
    "Combat recall-spy specs should require a strength reward",
  );
  assert.throws(
    () => effectResolver.resolveCombatSpyRecallForStrengths(
      [{
        trigger: "combat-intrigue",
        effects: [{ kind: "recall-spy", selector: "self", amount: 0, strengthReward: 3, source: "Test" }],
      }],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid recall-spy amount "0"/,
    "Combat recall-spy specs should reject zero spy counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatSpyRecallForStrengths(
      [{
        trigger: "combat-intrigue",
        effects: [{ kind: "recall-spy", selector: "self", amount: 1, strengthReward: 0, source: "Test" }],
      }],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid recall-spy strengthReward "0"/,
    "Combat recall-spy specs should reject zero strength rewards",
  );
  assert.throws(
    () => effectResolver.resolveCombatSpyRecallForStrengths(
      [{
        trigger: "combat-intrigue",
        effects: [{
          kind: "recall-spy",
          selector: "self",
          amount: 1,
          strengthReward: 3,
          reward: { resource: "spice", amount: 1 },
          source: "Test",
        }],
      }],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Unsupported recall-spy reward for combat-intrigue/,
    "Combat recall-spy specs should reject Plot-style resource rewards",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [plotSpec([{ kind: "recall-spy", selector: "self", amount: 1, source: "Test" }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported recall-spy amount for plot-intrigue/,
    "Plot recall-spy specs should reject Combat-style spy counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [plotSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 4,
        owner: "combat-recipient",
        optional: true,
      }])],
      { trigger: "plot-intrigue", source: p2, state: game },
    ),
    /Unsupported effect "lose-influence-for-strength" for plot-intrigue/,
    "Influence-loss-for-strength specs should stay on Combat Intrigue triggers",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "activated-ally",
        amount: 1,
        strengthReward: 4,
        owner: "combat-recipient",
        optional: true,
      }])],
      { trigger: "combat-intrigue", source: p4, target: p6, state: game },
    ),
    /Unsupported effect selector "activated-ally" for combat-intrigue/,
    "Combat Influence-loss strength specs should target the selected recipient through self routing",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 2,
        strengthReward: 4,
        owner: "combat-recipient",
        optional: true,
      }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid lose-influence-for-strength amount "2"/,
    "Combat Influence-loss strength specs should reject unsupported Influence-loss amounts",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 0,
        owner: "combat-recipient",
        optional: true,
      }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid lose-influence-for-strength strengthReward "0"/,
    "Combat Influence-loss strength specs should reject zero strength rewards",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 4,
        owner: "self",
        optional: true,
      }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid lose-influence-for-strength owner "self"/,
    "Combat Influence-loss strength specs should reject unsupported owner routing",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 4,
        owner: "combat-recipient",
        alternateOwner: "activated-ally",
        optional: true,
      }])],
      { trigger: "combat-intrigue", source: p4, target: p6, state: game },
    ),
    /Invalid lose-influence-for-strength alternateOwner "activated-ally"/,
    "Combat Influence-loss strength specs should reject unsupported alternate owner routing",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 4,
        owner: "combat-recipient",
        optional: false,
      }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid lose-influence-for-strength optional "false"/,
    "Combat Influence-loss strength specs should stay optional so players can decline the branch",
  );
  assert.throws(
    () => effectResolver.resolveCombatInfluenceLossForStrengths(
      [combatSpec([{
        kind: "lose-influence-for-strength",
        selector: "self",
        amount: 1,
        strengthReward: 4,
        owner: "combat-recipient",
      }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid lose-influence-for-strength optional "undefined"/,
    "Combat Influence-loss strength specs should require explicit optional true",
  );
  const invalidSpyPlacementSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-source-card",
    name: "Effect Spec Invalid Spy Placement Source",
    effects: [agentSpec([{ kind: "place-spies", selector: "self", amount: 1, source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidSpyPlacementSourceCard, p2, p2),
    /Invalid place-spies source ""/,
    "Spy placement specs should reject empty source labels",
  );
  const invalidSpyPlacementPostActionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-post-action-card",
    name: "Effect Spec Invalid Spy Placement Post Action",
    effects: [agentSpec([{ kind: "place-spies", selector: "self", amount: 1, postPlacementAction: "draw-card" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidSpyPlacementPostActionCard, p2, p2),
    /Invalid place-spies postPlacementAction "draw-card"/,
    "Spy placement specs should reject unsupported post-placement actions",
  );
  const revealSpyPlacementCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-spy-placement-card",
    name: "Effect Spec Reveal Spy Placement",
    effects: [revealSpec([{ kind: "place-spies", selector: "self", amount: 1 }])],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({ ...p2, hand: [revealSpyPlacementCard], highCouncilSeat: false }),
    { influenceGains: {}, persuasion: 0, printedRevealCards: [], recruitedTroops: 0, revealGain: {}, swords: 0 },
    "Reveal spy placement specs should not alter fixed reveal totals",
  );
  const agentTrashCard = {
    ...convincingArgument,
    id: "effect-spec-agent-trash-card",
    name: "Effect Spec Agent Trash Card",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true }])],
  };
  assert.equal(
    effectResolver.resolveTrashCardEffects(agentTrashCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    })[0]?.sourceOnly,
    false,
    "Agent selected trash-card specs should resolve without sourceOnly",
  );
  const invalidAgentTrashStrengthRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-strength-reward-card",
    name: "Effect Spec Invalid Agent Trash Strength Reward",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true, strengthReward: 1 }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidAgentTrashStrengthRewardCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Unsupported trash-card strengthReward for agent-play/,
    "Agent selected trash-card specs should reject strength rewards",
  );
  const invalidAgentSelectedTrashExcludeSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-selected-trash-exclude-source-card",
    name: "Effect Spec Invalid Agent Selected Trash Exclude Source",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true, excludeSource: true }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidAgentSelectedTrashExcludeSourceCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Invalid trash-card excludeSource "true"/,
    "Agent selected trash-card specs should reject source exclusion until it can exclude by source instance",
  );
  const invalidAgentTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-draw-reward-card",
    name: "Effect Spec Invalid Agent Trash Draw Reward",
    effects: [agentSpec([{
      kind: "trash-card",
      selector: "self",
      optional: true,
      zones: ["playArea"],
      sourceOnly: true,
      drawCardsReward: -1,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidAgentTrashDrawRewardCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Invalid effect amount "-1"/,
    "Agent source trash-card draw rewards should require non-negative integer amounts",
  );
  const invalidAgentSelectedTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-selected-trash-draw-reward-card",
    name: "Effect Spec Invalid Agent Selected Trash Draw Reward",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true, drawCardsReward: 1 }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidAgentSelectedTrashDrawRewardCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Unsupported trash-card drawCardsReward for agent-play without sourceOnly/,
    "Agent selected trash-card specs should reject draw rewards until reward-bearing selected trash is supported",
  );
  const invalidAgentTrashVpRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-vp-reward-card",
    name: "Effect Spec Invalid Agent Trash VP Reward",
    effects: [agentSpec([{
      kind: "trash-card",
      selector: "self",
      optional: true,
      zones: ["playArea"],
      sourceOnly: true,
      vpReward: 1,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidAgentTrashVpRewardCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    /Unsupported trash-card vpReward for agent-play/,
    "Agent source trash-card specs should reject VP rewards until that pending path carries them explicitly",
  );
  const invalidTrashOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-optional-card",
    name: "Effect Spec Invalid Trash Optional",
    effects: [plotSpec([{ kind: "trash-card", selector: "self", optional: "yes" }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidTrashOptionalCard.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    /Invalid trash-card optional "yes"/,
    "Plot trash-card specs should require optional to be boolean when present",
  );
  const invalidPlotTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-plot-trash-strength-card",
    name: "Effect Spec Invalid Plot Trash Strength",
    effects: [plotSpec([{ kind: "trash-card", selector: "self", strengthReward: 1, optional: true }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidPlotTrashStrengthCard.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    /Unsupported trash-card strengthReward for plot-intrigue/,
    "Plot trash-card specs should reject reveal/combat reward metadata until that pending path supports it",
  );
  const invalidCombatTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-strength-card",
    name: "Effect Spec Invalid Combat Trash Strength",
    effects: [combatSpec([{ kind: "trash-card", selector: "self", strengthReward: 1, optional: true }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidCombatTrashStrengthCard.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    }),
    /Unsupported trash-card strengthReward for combat-intrigue/,
    "Combat trash-card specs should reject reward metadata until that pending path supports it",
  );
  const invalidCombatTrashRequiredCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-required-card",
    name: "Effect Spec Invalid Combat Trash Required",
    effects: [combatSpec([{ kind: "trash-card", selector: "self", optional: false }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidCombatTrashRequiredCard.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    }),
    /Invalid combat trash-card optional "false"/,
    "Combat trash-card specs should stay optional until mandatory Combat trash behavior is supported",
  );
  const invalidCombatTrashMissingOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-missing-optional-card",
    name: "Effect Spec Invalid Combat Trash Missing Optional",
    effects: [combatSpec([{ kind: "trash-card", selector: "self" }])],
  };
  assert.throws(
    () => effectResolver.resolveTrashCardEffects(invalidCombatTrashMissingOptionalCard.effects, {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    }),
    /Invalid combat trash-card optional "undefined"/,
    "Combat trash-card specs should require explicit optional true",
  );
  const invalidTrashZoneCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-zone-card",
    name: "Effect Spec Invalid Trash Zone",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", zones: ["deck"], optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashZoneCard], highCouncilSeat: false }),
    /Unsupported trash-card zone "deck"/,
    "Trash-card specs should reject unsupported zones",
  );
  const invalidTrashTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-trait-card",
    name: "Effect Spec Invalid Trash Trait",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", requiredTrait: "", optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashTraitCard], highCouncilSeat: false }),
    /Invalid trash-card requiredTrait ""/,
    "Trash-card specs should require a non-empty required trait",
  );
  const invalidTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-strength-card",
    name: "Effect Spec Invalid Trash Strength",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", strengthReward: -1, optional: true }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidTrashStrengthCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Trash-card strength rewards should require non-negative integer amounts",
  );
  const invalidRevealTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-trash-draw-reward-card",
    name: "Effect Spec Invalid Reveal Trash Draw Reward",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", optional: true, drawCardsReward: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealTrashDrawRewardCard], highCouncilSeat: false }),
    /Unsupported trash-card drawCardsReward for reveal/,
    "Trash-card draw rewards should stay scoped to Agent source trash until other pending paths support them",
  );
  const invalidRevealSourceTrashMissingVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-source-trash-missing-vp-card",
    name: "Effect Spec Invalid Reveal Source Trash Missing VP",
    effects: [revealSpec([{
      kind: "trash-card",
      selector: "self",
      optional: true,
      sourceOnly: true,
      zones: ["playArea"],
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealSourceTrashMissingVpCard], highCouncilSeat: false }),
    /Invalid trash-card vpReward "undefined"/,
    "Reveal source trash-card specs should require an explicit VP reward",
  );
  const invalidRevealSourceTrashZoneCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-source-trash-zone-card",
    name: "Effect Spec Invalid Reveal Source Trash Zone",
    effects: [revealSpec([{
      kind: "trash-card",
      selector: "self",
      optional: true,
      sourceOnly: true,
      zones: ["hand"],
      vpReward: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealSourceTrashZoneCard], highCouncilSeat: false }),
    /Invalid reveal source trash-card zones "hand"/,
    "Reveal source trash-card specs should only target the source card in play",
  );
  const invalidRevealSelectedTrashVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-selected-trash-vp-card",
    name: "Effect Spec Invalid Reveal Selected Trash VP",
    effects: [revealSpec([{ kind: "trash-card", selector: "self", optional: true, vpReward: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRevealSelectedTrashVpCard], highCouncilSeat: false }),
    /Unsupported trash-card vpReward for reveal/,
    "Reveal selected trash-card specs should reject VP rewards until that path is explicitly modeled",
  );
  const agentInfluenceIntrigueCard = {
    ...convincingArgument,
    id: "effect-spec-agent-influence-intrigue-card",
    name: "Effect Spec Agent Influence Intrigue",
    effects: [agentSpec([{ kind: "lose-influence-for-intrigues", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentInfluenceIntrigueCard, p2, p2),
    /Unsupported effect "lose-influence-for-intrigues" for agent-play/,
    "Influence-for-Intrigue specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidInfluenceIntrigueSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-selector-card",
    name: "Effect Spec Invalid Influence Intrigue Selector",
    effects: [revealSpec([{ kind: "lose-influence-for-intrigues", selector: "activated-ally", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceIntrigueSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Influence-for-Intrigue specs should reject activated Ally reveal selectors",
  );
  const invalidInfluenceIntrigueAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-amount-card",
    name: "Effect Spec Invalid Influence Intrigue Amount",
    effects: [revealSpec([{ kind: "lose-influence-for-intrigues", selector: "self", amount: -1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidInfluenceIntrigueAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Influence-for-Intrigue specs should require non-negative integer amounts",
  );
  const agentPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-strength-card",
    name: "Effect Spec Agent Pay Resource Strength",
    effects: [agentSpec([{ kind: "pay-resource-for-strength", selector: "self", resource: "spice", cost: 1, strength: 2 }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceStrengthCard, p2, p2),
    /Unsupported effect "pay-resource-for-strength" for agent-play/,
    "Resource-for-strength specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidPayResourceStrengthSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-selector-card",
    name: "Effect Spec Invalid Pay Resource Strength Selector",
    effects: [revealSpec([{ kind: "pay-resource-for-strength", selector: "activated-ally", resource: "spice", cost: 1, strength: 2 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceStrengthSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Resource-for-strength specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceStrengthResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-resource-card",
    name: "Effect Spec Invalid Pay Resource Strength Resource",
    effects: [revealSpec([{ kind: "pay-resource-for-strength", selector: "self", resource: "melange", cost: 1, strength: 2 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceStrengthResourceCard], highCouncilSeat: false }),
    /Unsupported effect resource "melange"/,
    "Resource-for-strength specs should reject unsupported resource ids",
  );
  const invalidPayResourceStrengthCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-cost-card",
    name: "Effect Spec Invalid Pay Resource Strength Cost",
    effects: [revealSpec([{ kind: "pay-resource-for-strength", selector: "self", resource: "spice", cost: -1, strength: 2 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceStrengthCostCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Resource-for-strength specs should require non-negative costs",
  );
  const invalidPayResourceStrengthSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-source-card",
    name: "Effect Spec Invalid Pay Resource Strength Source",
    effects: [revealSpec([{ kind: "pay-resource-for-strength", selector: "self", resource: "spice", cost: 1, strength: 2, source: "" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceStrengthSourceCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-strength source ""/,
    "Resource-for-strength specs should reject empty source labels",
  );
  const invalidPayResourceStrengthOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-optional-card",
    name: "Effect Spec Invalid Pay Resource Strength Optional",
    effects: [revealSpec([{
      kind: "pay-resource-for-strength",
      selector: "self",
      resource: "spice",
      cost: 1,
      strength: 2,
      optional: "false",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceStrengthOptionalCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-strength optional "false"/,
    "Resource-for-strength specs should reject non-true optional values",
  );
  const requiredPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-strength-card",
    name: "Effect Spec Required Pay Resource Strength",
    effects: [revealSpec([{
      kind: "pay-resource-for-strength",
      selector: "self",
      resource: "spice",
      cost: 1,
      strength: 2,
      optional: false,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [requiredPayResourceStrengthCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-strength optional "false"/,
    "Resource-for-strength specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const selfPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-self-pay-resource-strength-card",
    name: "Effect Spec Self Pay Resource Strength",
    effects: [revealSpec([{
      kind: "pay-resource-for-strength",
      selector: "self",
      resource: "spice",
      cost: 1,
      strength: 2,
      source: "Self Pay Strength",
    }])],
  };
  const selfPayOwner = {
    ...p2,
    resources: { ...p2.resources, spice: 1 },
    playArea: [selfPayResourceStrengthCard],
    conflict: 3,
    deployedSandworms: 0,
    deployedTroops: 1,
  };
  const selfPayState = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === p2.id ? selfPayOwner : player),
  };
  const [selfPayPending] = state.pendingActionsForRevealPayResourceForStrength(
    selfPayResourceStrengthCard,
    selfPayOwner,
    selfPayState,
    p2.id,
  );
  assert.deepEqual(selfPayPending, {
    kind: "pay-resource-for-strength",
    ownerId: p2.id,
    combatRecipientId: p2.id,
    resource: "spice",
    cost: 1,
    strength: 2,
    optional: true,
    source: "Self Pay Strength",
    cardId: selfPayResourceStrengthCard.id,
  });
  const selfPayResolved = state.resolvePayResourceForStrengthChoice(
    { ...selfPayState, pendingAction: selfPayPending },
    selfPayPending,
  );
  assert.equal(playerById(selfPayResolved, p2.id).resources.spice, 0, "Self resource-for-strength should spend the owner resource");
  assert.equal(playerById(selfPayResolved, p2.id).conflict, 5, "Self resource-for-strength should add strength to the same player");
  const agentPayResourceHighCouncilCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-high-council-card",
    name: "Effect Spec Agent Pay Resource High Council",
    effects: [agentSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: true,
      source: "Agent High Council",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceHighCouncilCard, p2, p2),
    /Unsupported effect "pay-resource-for-high-council-seat" for agent-play/,
    "High Council payment specs should stay in Reveal until other triggers support that timing",
  );
  const invalidPayResourceHighCouncilSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-selector-card",
    name: "Effect Spec Invalid Pay Resource High Council Selector",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "activated-ally",
      resource: "solari",
      cost: 5,
      optional: true,
      source: "High Council Selector",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "High Council payment specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceHighCouncilResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-resource-card",
    name: "Effect Spec Invalid Pay Resource High Council Resource",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "melange",
      cost: 5,
      optional: true,
      source: "High Council Resource",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilResourceCard], highCouncilSeat: false }),
    /Unsupported effect resource "melange"/,
    "High Council payment specs should reject unsupported resource ids",
  );
  const invalidPayResourceHighCouncilCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-cost-card",
    name: "Effect Spec Invalid Pay Resource High Council Cost",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 0,
      optional: true,
      source: "High Council Cost",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilCostCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-high-council-seat cost "0"/,
    "High Council payment specs should require a positive resource cost",
  );
  const invalidPayResourceHighCouncilSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-source-card",
    name: "Effect Spec Invalid Pay Resource High Council Source",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: true,
      source: "",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilSourceCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-high-council-seat source ""/,
    "High Council payment specs should reject empty source labels",
  );
  const invalidPayResourceHighCouncilOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-optional-card",
    name: "Effect Spec Invalid Pay Resource High Council Optional",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: false,
      source: "High Council Optional",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilOptionalCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-high-council-seat optional "false"/,
    "High Council payment specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const invalidPayResourceHighCouncilPersuasionCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-persuasion-cost-card",
    name: "Effect Spec Invalid Pay Resource High Council Persuasion Cost",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionCost: -1,
      source: "High Council Persuasion Cost",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilPersuasionCostCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "High Council payment specs should require non-negative persuasion replacement costs",
  );
  const invalidPayResourceHighCouncilPersuasionRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-persuasion-reward-card",
    name: "Effect Spec Invalid Pay Resource High Council Persuasion Reward",
    effects: [revealSpec([{
      kind: "pay-resource-for-high-council-seat",
      selector: "self",
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionReward: -1,
      source: "High Council Persuasion Reward",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceHighCouncilPersuasionRewardCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "High Council payment specs should require non-negative persuasion rewards",
  );
  const agentPayResourceTroopsCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-troops-card",
    name: "Effect Spec Agent Pay Resource Troops",
    effects: [agentSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceTroopsCard, p2, p2),
    /Unsupported effect "pay-resource-for-troops" for agent-play/,
    "Resource-for-troops specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidPayResourceTroopsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-selector-card",
    name: "Effect Spec Invalid Pay Resource Troops Selector",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "activated-ally",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Resource-for-troops specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceTroopsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-resource-card",
    name: "Effect Spec Invalid Pay Resource Troops Resource",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "melange",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsResourceCard], highCouncilSeat: false }),
    /Unsupported effect resource "melange"/,
    "Resource-for-troops specs should reject unsupported resource ids",
  );
  const invalidPayResourceTroopsRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-recipient-card",
    name: "Effect Spec Invalid Pay Resource Troops Recipient",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "self",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsRecipientCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops recipient "self"/,
    "Resource-for-troops specs should reject unsupported recipient routing",
  );
  const invalidPayResourceTroopsDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-destination-card",
    name: "Effect Spec Invalid Pay Resource Troops Destination",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsDestinationCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops destination "conflict"/,
    "Resource-for-troops specs should reject unsupported troop destinations",
  );
  const invalidPayResourceTroopsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-cost-card",
    name: "Effect Spec Invalid Pay Resource Troops Cost",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: -1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsCostCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Resource-for-troops specs should require non-negative costs",
  );
  const invalidPayResourceTroopsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-amount-card",
    name: "Effect Spec Invalid Pay Resource Troops Amount",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: -1,
      recipient: "same-team-allies",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsAmountCard], highCouncilSeat: false }),
    /Invalid effect amount "-1"/,
    "Resource-for-troops specs should require non-negative troop amounts",
  );
  const invalidPayResourceTroopsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-source-card",
    name: "Effect Spec Invalid Pay Resource Troops Source",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
      source: "",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsSourceCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops source ""/,
    "Resource-for-troops specs should reject empty source labels",
  );
  const invalidPayResourceTroopsTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Troops Trash Source",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
      trashSource: "false",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsTrashSourceCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops trashSource "false"/,
    "Resource-for-troops specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceTroopsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-optional-card",
    name: "Effect Spec Invalid Pay Resource Troops Optional",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
      optional: "false",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidPayResourceTroopsOptionalCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops optional "false"/,
    "Resource-for-troops specs should reject non-true optional values",
  );
  const requiredPayResourceTroopsCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-troops-card",
    name: "Effect Spec Required Pay Resource Troops",
    effects: [revealSpec([{
      kind: "pay-resource-for-troops",
      selector: "self",
      resource: "spice",
      cost: 1,
      troops: 2,
      recipient: "same-team-allies",
      destination: "garrison",
      optional: false,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [requiredPayResourceTroopsCard], highCouncilSeat: false }),
    /Invalid pay-resource-for-troops optional "false"/,
    "Resource-for-troops specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const stalePayResourceTroopsPending = {
    kind: "pay-resource-for-troops",
    ownerId: p4.id,
    recipientIds: [p2.id, p6.id],
    resource: "solari",
    cost: 1,
    troops: 1,
    destination: "garrison",
    optional: true,
    source: "Stale Pay Troops",
  };
  const stalePayResourceTroopsState = {
    ...game,
    pendingAction: stalePayResourceTroopsPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === p4.id) return { ...player, resources: { ...player.resources, solari: 1 } };
      if (player.id === p2.id) return { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 };
      if (player.id === p6.id) return { ...player, deployedTroops: 0, garrison: 0, jessicaMemories: 0 };
      return player;
    }),
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(stalePayResourceTroopsState, stalePayResourceTroopsPending),
    stalePayResourceTroopsState,
    "Resource-for-troops resolver should reject stale payments when any recipient lacks troop supply",
  );
  const revealPayResourceDrawCardsCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-draw-cards-card",
    name: "Effect Spec Reveal Pay Resource Draw Cards",
    effects: [revealSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "water",
      cost: 2,
      drawCards: 2,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPayResourceDrawCardsCard], highCouncilSeat: false }),
    /Unsupported effect "pay-resource-for-draw-cards" for reveal/,
    "Resource-for-draw specs should stay in Agent play",
  );
  const invalidPayResourceDrawCardsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-selector-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Selector",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "activated-ally",
      resource: "water",
      cost: 2,
      drawCards: 2,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsSelectorCard, p2, p2),
    /Unsupported effect selector "activated-ally" for pay-resource-for-draw-cards/,
    "Resource-for-draw specs should reject activated Ally selectors",
  );
  const invalidPayResourceDrawCardsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-resource-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Resource",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "melange",
      cost: 2,
      drawCards: 2,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Resource-for-draw specs should reject unsupported resource ids",
  );
  const invalidPayResourceDrawCardsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-cost-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Cost",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "water",
      cost: -1,
      drawCards: 2,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-draw specs should require non-negative costs",
  );
  const invalidPayResourceDrawCardsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-amount-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Amount",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "water",
      cost: 2,
      drawCards: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-draw specs should require non-negative draw amounts",
  );
  const invalidPayResourceDrawCardsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-source-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "water",
      cost: 2,
      drawCards: 2,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsSourceCard, p2, p2),
    /Invalid pay-resource-for-draw-cards source ""/,
    "Resource-for-draw specs should reject empty source labels",
  );
  const invalidPayResourceDrawCardsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-optional-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Optional",
    effects: [agentSpec([{
      kind: "pay-resource-for-draw-cards",
      selector: "self",
      resource: "water",
      cost: 2,
      drawCards: 2,
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceDrawCardsOptionalCard, p2, p2),
    /Invalid pay-resource-for-draw-cards optional "false"/,
    "Resource-for-draw specs should reject non-true optional values",
  );
  const revealAcquireCardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-acquire-card-card",
    name: "Effect Spec Reveal Acquire Card",
    effects: [revealSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealAcquireCardCard], highCouncilSeat: false }),
    /Unsupported effect "acquire-card" for reveal/,
    "Acquire-card specs should stay out of Reveal effects",
  );
  const invalidAcquireCardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-selector-card",
    name: "Effect Spec Invalid Acquire Card Selector",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "activated-ally",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for acquire-card/,
    "Acquire-card specs should reject activated Ally selectors",
  );
  const invalidAcquireCardDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-destination-card",
    name: "Effect Spec Invalid Acquire Card Destination",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "deck",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardDestinationCard, p2, p2),
    /Invalid acquire-card destination "deck"/,
    "Acquire-card specs should reject unsupported destinations",
  );
  const invalidAcquireCardUnconstrainedCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-unconstrained-card",
    name: "Effect Spec Invalid Acquire Card Unconstrained",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardUnconstrainedCard, p2, p2),
    /Invalid acquire-card constraint: expected maxCost or paymentResource/,
    "Acquire-card specs should reject unconstrained free acquisitions",
  );
  const invalidAcquireCardResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-resource-card",
    name: "Effect Spec Invalid Acquire Card Resource",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      paymentResource: "melange",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Acquire-card specs should reject unsupported payment resources",
  );
  const invalidAcquireCardMaxCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-max-cost-card",
    name: "Effect Spec Invalid Acquire Card Max Cost",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardMaxCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Acquire-card specs should require non-negative cost bounds",
  );
  const invalidAcquireCardCostBoundsCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-cost-bounds-card",
    name: "Effect Spec Invalid Acquire Card Cost Bounds",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      minCost: 3,
      maxCost: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardCostBoundsCard, p2, p2),
    /Invalid acquire-card cost bounds "3-1"/,
    "Acquire-card specs should reject minCost greater than maxCost",
  );
  const invalidAcquireCardOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-optional-card",
    name: "Effect Spec Invalid Acquire Card Optional",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: 1,
      optional: "true",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardOptionalCard, p2, p2),
    /Invalid acquire-card optional "true"/,
    "Acquire-card specs should reject non-boolean optional values",
  );
  const invalidAcquireCardSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-source-card",
    name: "Effect Spec Invalid Acquire Card Source",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardSourceCard, p2, p2),
    /Invalid acquire-card source ""/,
    "Acquire-card specs should reject empty source labels",
  );
  const revealGainInfluenceChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-gain-influence-choice-card",
    name: "Effect Spec Reveal Gain Influence Choice",
    effects: [revealSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealGainInfluenceChoiceCard], highCouncilSeat: false }),
    /Unsupported effect "gain-influence-choice" for reveal/,
    "Gain-Influence choice specs should stay in Agent play",
  );
  const invalidGainInfluenceChoiceSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-selector-card",
    name: "Effect Spec Invalid Gain Influence Choice Selector",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "activated-ally",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for gain-influence-choice/,
    "Gain-Influence choice specs should reject activated Ally selectors",
  );
  const invalidGainInfluenceChoiceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-amount-card",
    name: "Effect Spec Invalid Gain Influence Choice Amount",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Gain-Influence choice specs should require non-negative amounts",
  );
  const invalidGainInfluenceChoiceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-source-card",
    name: "Effect Spec Invalid Gain Influence Choice Source",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceSourceCard, p2, p2),
    /Invalid gain-influence-choice source ""/,
    "Gain-Influence choice specs should reject empty source labels",
  );
  const invalidGainInfluenceChoiceTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-trash-source-card",
    name: "Effect Spec Invalid Gain Influence Choice Trash Source",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
      trashSource: "true",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceTrashSourceCard, p2, p2),
    /Invalid gain-influence-choice trashSource "true"/,
    "Gain-Influence choice specs should reject non-boolean trashSource values",
  );
  assert.throws(
    () => effectResolver.resolveGainInfluenceChoices(
      [acquireSpec([{
        kind: "gain-influence-choice",
        selector: "self",
        amount: 1,
        trashSource: true,
      }])],
      { trigger: "acquire", source: p2, state: game },
    ),
    /Invalid acquire gain-influence-choice trashSource "true"/,
    "Acquire Influence choice specs should not trash the newly acquired source card",
  );
  const paidRewardChoiceBaseOption = {
    id: "troop",
    resource: "solari",
    cost: 1,
    reward: { kind: "recruit-troops", selector: "activated-ally", amount: 1, destination: "garrison" },
  };
  const paidRewardChoiceEffect = (overrides = {}) => ({
    kind: "paid-reward-choice",
    selector: "self",
    source: "Test Paid Reward",
    options: [paidRewardChoiceBaseOption],
    ...overrides,
  });
  const paidRewardChoiceCard = (id, effect) => ({
    ...convincingArgument,
    id,
    name: id,
    effects: [agentSpec([effect])],
  });
  const revealPaidRewardChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-paid-reward-choice-card",
    name: "Effect Spec Reveal Paid Reward Choice",
    effects: [revealSpec([paidRewardChoiceEffect()])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPaidRewardChoiceCard], highCouncilSeat: false }),
    /Unsupported effect "paid-reward-choice" for reveal/,
    "Paid reward choice specs should stay in Agent play",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-selector-card",
        paidRewardChoiceEffect({ selector: "activated-ally" }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect selector "activated-ally" for paid-reward-choice/,
    "Paid reward choice specs should reject activated Ally top-level selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-source-card",
        paidRewardChoiceEffect({ source: "" }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice source ""/,
    "Paid reward choice specs should reject empty source labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-required-recipient-card",
        paidRewardChoiceEffect({ requiredRecipient: "self" }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice requiredRecipient "self"/,
    "Paid reward choice specs should reject unsupported required recipient values",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-require-payable-option-card",
        paidRewardChoiceEffect({ requirePayableOption: false }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice requirePayableOption "false"/,
    "Paid reward choice specs should reject non-true requirePayableOption values",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-empty-options-card",
        paidRewardChoiceEffect({ options: [] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice options ""/,
    "Paid reward choice specs should require at least one option",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-option-id-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, id: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice option id ""/,
    "Paid reward choice specs should reject empty option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-duplicate-option-card",
        paidRewardChoiceEffect({
          options: [
            paidRewardChoiceBaseOption,
            { ...paidRewardChoiceBaseOption },
          ],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice duplicate option id "troop"/,
    "Paid reward choice specs should reject duplicate option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, resource: "melange" }] }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Paid reward choice specs should reject unsupported payment resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-cost-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, cost: 0 }] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice cost "0"/,
    "Paid reward choice specs should require positive costs",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-reward-selector-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, selector: "opponent" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported paid-reward-choice selector "opponent"/,
    "Paid reward choice specs should reject unsupported nested reward selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-troop-amount-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice troops "0"/,
    "Paid reward choice troop branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-troop-destination-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, destination: "conflict" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice troop destination "conflict"/,
    "Paid reward choice troop branches should only recruit to garrison",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-influence-faction-card",
        paidRewardChoiceEffect({
          options: [{
            id: "influence",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-influence", selector: "self", faction: "guild", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect faction "guild"/,
    "Paid reward choice Influence branches should reject unsupported faction ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-influence-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "influence",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-influence", selector: "self", faction: "emperor", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice influence "0"/,
    "Paid reward choice Influence branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-reward-card",
        paidRewardChoiceEffect({
          options: [{
            id: "water",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-resource", selector: "self", resource: "melange", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Paid reward choice resource branches should reject unsupported reward resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "water",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-resource", selector: "self", resource: "water", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice resource "0"/,
    "Paid reward choice resource branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-empty-bundle-card",
        paidRewardChoiceEffect({
          options: [{
            id: "bundle",
            resource: "spice",
            cost: 1,
            reward: { kind: "bundle", rewards: [] },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice bundle rewards ""/,
    "Paid reward choice bundled branches should require at least one nested reward",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-nested-bundle-card",
        paidRewardChoiceEffect({
          options: [{
            id: "bundle",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "bundle",
              rewards: [{
                kind: "bundle",
                rewards: [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
              }],
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice nested bundle "bundle"/,
    "Paid reward choice bundled branches should reject nested bundles",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-intrigue-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "intrigue",
            resource: "spice",
            cost: 1,
            reward: { kind: "draw-intrigues", selector: "self", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice intrigues "0"/,
    "Paid reward choice Intrigue branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-leader-counter", selector: "self", counter: "otherMemories", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter "otherMemories"/,
    "Paid reward choice leader-counter branches should reject unsupported counters",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-cost-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 0,
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter troopSupplyCost "0"/,
    "Paid reward choice leader-counter branches should require positive troop-supply costs",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-cost-mismatch-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 2,
              troopSupplyCost: 1,
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter troopSupplyCost "1"/,
    "Paid reward choice leader-counter branches should require troop costs to match memory counts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-reward-kind-card",
        paidRewardChoiceEffect({
          options: [{
            id: "vp",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-vp", selector: "self", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported paid-reward-choice reward "gain-vp"/,
    "Paid reward choice specs should reject unsupported reward kinds",
  );
  const pendingActionChoiceAcquireOption = {
    id: "acquire",
    label: "Acquire cost-1 card to hand",
    effect: {
      kind: "acquire-card",
      selector: "self",
      minCost: 1,
      maxCost: 1,
      destination: "hand",
    },
  };
  const pendingActionChoiceEffect = (overrides = {}) => ({
    kind: "pending-action-choice",
    selector: "self",
    source: "Test Pending Choice",
    options: [pendingActionChoiceAcquireOption],
    ...overrides,
  });
  const pendingActionChoiceCard = (id, effect) => ({
    ...convincingArgument,
    id,
    name: id,
    effects: [agentSpec([effect])],
  });
  const revealPendingActionChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pending-action-choice-card",
    name: "Effect Spec Reveal Pending Action Choice",
    effects: [revealSpec([pendingActionChoiceEffect()])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPendingActionChoiceCard], highCouncilSeat: false }),
    /Unsupported effect "pending-action-choice" for reveal/,
    "Pending action choice specs should stay in Agent play",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-selector-card",
        pendingActionChoiceEffect({ selector: "activated-ally" }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect selector "activated-ally" for pending-action-choice/,
    "Pending action choice specs should reject activated Ally top-level selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-source-card",
        pendingActionChoiceEffect({ source: "" }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice source ""/,
    "Pending action choice specs should reject empty source labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-empty-options-card",
        pendingActionChoiceEffect({ options: [] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice options ""/,
    "Pending action choice specs should require at least one option",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-option-id-card",
        pendingActionChoiceEffect({ options: [{ ...pendingActionChoiceAcquireOption, id: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice option id ""/,
    "Pending action choice specs should reject empty option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-duplicate-option-card",
        pendingActionChoiceEffect({
          options: [
            pendingActionChoiceAcquireOption,
            { ...pendingActionChoiceAcquireOption },
          ],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice duplicate option id "acquire"/,
    "Pending action choice specs should reject duplicate option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-option-label-card",
        pendingActionChoiceEffect({ options: [{ ...pendingActionChoiceAcquireOption, label: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice option label ""/,
    "Pending action choice specs should reject empty option labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-nested-selector-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, selector: "opponent" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice selector "opponent"/,
    "Pending action choice specs should reject unsupported nested selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-destination-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, destination: "trash" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire destination "trash"/,
    "Pending action choice acquire branches should reject unsupported destinations",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-resource-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, paymentResource: "melange" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Pending action choice acquire branches should reject unsupported payment resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-cost-bounds-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, minCost: 3, maxCost: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire cost bounds "3-1"/,
    "Pending action choice acquire branches should reject minCost greater than maxCost",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-unconstrained-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: {
              kind: "acquire-card",
              selector: "self",
              minCost: 1,
              destination: "hand",
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire constraint: expected maxCost or paymentResource/,
    "Pending action choice acquire branches should reject unconstrained acquisitions",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-zone-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash deck card",
            effect: { kind: "trash-card", selector: "self", optional: false, zones: ["deck"] },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported trash-card zone "deck"/,
    "Pending action choice trash branches should reject unsupported zones",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-required-trait-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash trait card",
            effect: { kind: "trash-card", selector: "self", optional: false, requiredTrait: "" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice trash requiredTrait ""/,
    "Pending action choice trash branches should reject empty required traits",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-vp-reward-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash card for VP",
            effect: { kind: "trash-card", selector: "self", optional: false, zones: ["hand"], vpReward: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice trash vpReward/,
    "Pending action choice trash branches should reject VP rewards until that nested pending path carries them explicitly",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-nested-kind-card",
        pendingActionChoiceEffect({
          options: [{
            id: "vp",
            label: "Gain VP",
            effect: { kind: "gain-vp", selector: "self", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice effect "gain-vp"/,
    "Pending action choice specs should reject unsupported nested effect kinds",
  );
  const revealPayResourceInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-influence-card",
    name: "Effect Spec Reveal Pay Resource Influence",
    effects: [revealSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPayResourceInfluenceCard], highCouncilSeat: false }),
    /Unsupported effect "pay-resource-for-influence" for reveal/,
    "Resource-for-Influence specs should stay in Agent play",
  );
  const invalidPayResourceInfluenceSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-selector-card",
    name: "Effect Spec Invalid Pay Resource Influence Selector",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "activated-ally",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for pay-resource-for-influence/,
    "Resource-for-Influence specs should reject activated Ally selectors",
  );
  const invalidPayResourceInfluenceResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-resource-card",
    name: "Effect Spec Invalid Pay Resource Influence Resource",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "melange",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Resource-for-Influence specs should reject unsupported resource ids",
  );
  const invalidPayResourceInfluenceFactionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-faction-card",
    name: "Effect Spec Invalid Pay Resource Influence Faction",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "sardaukar",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceFactionCard, p2, p2),
    /Unsupported effect faction "sardaukar"/,
    "Resource-for-Influence specs should reject unsupported faction ids",
  );
  const invalidPayResourceInfluenceRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-recipient-card",
    name: "Effect Spec Invalid Pay Resource Influence Recipient",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "self",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceRecipientCard, p2, p2),
    /Invalid pay-resource-for-influence recipient "self"/,
    "Resource-for-Influence specs should reject unsupported recipient routing",
  );
  const invalidPayResourceInfluenceCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-cost-card",
    name: "Effect Spec Invalid Pay Resource Influence Cost",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: -1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-Influence specs should require non-negative costs",
  );
  const invalidPayResourceInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-amount-card",
    name: "Effect Spec Invalid Pay Resource Influence Amount",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: -1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-Influence specs should require non-negative Influence amounts",
  );
  const invalidPayResourceInfluenceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-source-card",
    name: "Effect Spec Invalid Pay Resource Influence Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceSourceCard, p2, p2),
    /Invalid pay-resource-for-influence source ""/,
    "Resource-for-Influence specs should reject empty source labels",
  );
  const invalidPayResourceInfluenceTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Influence Trash Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      trashSource: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceTrashSourceCard, p2, p2),
    /Invalid pay-resource-for-influence trashSource "false"/,
    "Resource-for-Influence specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceInfluenceOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-optional-card",
    name: "Effect Spec Invalid Pay Resource Influence Optional",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceOptionalCard, p2, p2),
    /Invalid pay-resource-for-influence optional "false"/,
    "Resource-for-Influence specs should reject non-true optional values",
  );
  const requiredPayResourceInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-influence-card",
    name: "Effect Spec Required Pay Resource Influence",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      optional: false,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(requiredPayResourceInfluenceCard, p2, p2),
    /Invalid pay-resource-for-influence optional "false"/,
    "Resource-for-Influence specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const revealPayResourceSandwormsCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-sandworms-card",
    name: "Effect Spec Reveal Pay Resource Sandworms",
    effects: [revealSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "combat-recipient",
      destination: "conflict",
      persuasionCost: 2,
      source: "Reveal Worms",
    }])],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({ ...p3, hand: [revealPayResourceSandwormsCard], highCouncilSeat: false }, game),
    { influenceGains: {}, persuasion: 0, printedRevealCards: [], recruitedTroops: 0, revealGain: {}, swords: 0 },
    "Reveal sandworm payment specs should not add immediate reveal rewards by themselves",
  );
  const unprotectedConflict = data.conflictCards.find((card) => card.name === "Skirmish (Desert Mouse)");
  assert.ok(unprotectedConflict, "Verifier needs an unprotected Conflict fixture");
  const revealSandwormOwner = {
    ...p3,
    makerHooks: true,
    playArea: [revealPayResourceSandwormsCard],
    persuasion: 2,
    resources: { ...p3.resources, water: 1 },
  };
  const revealSandwormState = {
    ...game,
    conflict: unprotectedConflict,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === p3.id ? revealSandwormOwner : player),
    shieldWall: false,
  };
  const [revealSandwormPending] = state.pendingActionsForRevealPayResourceForSandworms(
    revealPayResourceSandwormsCard,
    revealSandwormOwner,
    revealSandwormState,
    p3.id,
  );
  assert.deepEqual(
    revealSandwormPending,
    {
      kind: "pay-resource-for-sandworms",
      ownerId: p3.id,
      recipientId: p3.id,
      resource: "water",
      cost: 1,
      sandworms: 1,
      strength: 3,
      destination: "conflict",
      optional: true,
      persuasionCost: 2,
      source: "Reveal Worms",
      cardId: revealPayResourceSandwormsCard.id,
    },
    "Reveal sandworm payments should queue against the combat recipient and carry the replaced persuasion",
  );
  const revealSandwormResolved = state.resolvePayResourceForSandwormsChoice(
    { ...revealSandwormState, pendingAction: revealSandwormPending },
    revealSandwormPending,
  );
  assert.equal(playerById(revealSandwormResolved, p3.id).resources.water, 0, "Reveal sandworm payment should spend water");
  assert.equal(playerById(revealSandwormResolved, p3.id).persuasion, 0, "Reveal sandworm payment should forgo the configured persuasion");
  assert.equal(playerById(revealSandwormResolved, p3.id).deployedSandworms, 1, "Reveal sandworm payment should deploy a sandworm");
  assert.equal(playerById(revealSandwormResolved, p3.id).conflict, p3.conflict + 3, "Reveal sandworm payment should add sandworm strength");
  assert.match(revealSandwormResolved.log[0], /spends 1 water and forgoes 2 persuasion for Reveal Worms/);
  const revealSandwormSkipped = state.skipPayResourceForSandworms(
    { ...revealSandwormState, pendingAction: revealSandwormPending },
    revealSandwormPending,
  );
  assert.equal(playerById(revealSandwormSkipped, p3.id).resources.water, 1, "Skipping Reveal sandworm payment should preserve water");
  assert.equal(playerById(revealSandwormSkipped, p3.id).persuasion, 2, "Skipping Reveal sandworm payment should keep persuasion");
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForSandworms(
      revealPayResourceSandwormsCard,
      { ...revealSandwormOwner, makerHooks: false },
      {
        ...revealSandwormState,
        players: revealSandwormState.players.map((player) =>
          player.id === p3.id ? { ...revealSandwormOwner, makerHooks: false } : player,
        ),
      },
      p3.id,
    ),
    [],
    "Reveal sandworm payments should not queue without Maker Hooks",
  );
  const commanderRevealSandwormOwner = {
    ...p1,
    playArea: [revealPayResourceSandwormsCard],
    persuasion: 2,
    resources: { ...p1.resources, water: 1 },
  };
  const commanderRevealSandwormRecipient = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
  };
  const commanderRevealSandwormState = {
    ...game,
    conflict: unprotectedConflict,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === p1.id) return commanderRevealSandwormOwner;
      if (player.id === p3.id) return commanderRevealSandwormRecipient;
      return player;
    }),
    shieldWall: false,
  };
  const [commanderRevealSandwormPending] = state.pendingActionsForRevealPayResourceForSandworms(
    revealPayResourceSandwormsCard,
    commanderRevealSandwormOwner,
    commanderRevealSandwormState,
    p3.id,
  );
  assert.equal(commanderRevealSandwormPending.ownerId, p1.id, "Commander Reveal sandworm payment should be paid by the Commander");
  assert.equal(commanderRevealSandwormPending.recipientId, p3.id, "Commander Reveal sandworm payment should summon for the selected Ally");
  const commanderRevealSandwormResolved = state.resolvePayResourceForSandwormsChoice(
    { ...commanderRevealSandwormState, pendingAction: commanderRevealSandwormPending },
    commanderRevealSandwormPending,
  );
  assert.equal(playerById(commanderRevealSandwormResolved, p1.id).resources.water, 0, "Commander Reveal sandworm payment should spend Commander water");
  assert.equal(playerById(commanderRevealSandwormResolved, p1.id).persuasion, 0, "Commander Reveal sandworm payment should forgo Commander persuasion");
  assert.equal(playerById(commanderRevealSandwormResolved, p3.id).deployedSandworms, 1, "Commander Reveal sandworm payment should deploy the Ally sandworm");
  assert.equal(playerById(commanderRevealSandwormResolved, p3.id).conflict, 3, "Commander Reveal sandworm payment should add Ally strength");
  assert.equal(commanderRevealSandwormResolved.turnUnitDeployments[p1.id], 1, "Commander Reveal sandworms should count for the Commander turn");
  const invalidVisitedSpaceIconConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-visited-space-icon-card",
    name: "Effect Spec Invalid Visited Space Icon",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "visited-space-icon", icon: "desert" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidVisitedSpaceIconConditionCard, p2, p2),
    /Unsupported effect icon "desert"/,
    "Visited-space-icon conditions should reject unsupported icon ids",
  );
  const invalidPayResourceSandwormsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-selector-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Selector",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "activated-ally",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for pay-resource-for-sandworms/,
    "Resource-for-sandworms specs should reject activated Ally selectors",
  );
  const invalidPayResourceSandwormsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-resource-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Resource",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "melange",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Resource-for-sandworms specs should reject unsupported resource ids",
  );
  const invalidPayResourceSandwormsRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-recipient-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Recipient",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "self",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsRecipientCard, p2, p2),
    /Invalid pay-resource-for-sandworms recipient "self"/,
    "Resource-for-sandworms specs should reject unsupported recipient routing",
  );
  const invalidPayResourceSandwormsDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-destination-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Destination",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsDestinationCard, p2, p2),
    /Invalid pay-resource-for-sandworms destination "garrison"/,
    "Resource-for-sandworms specs should reject unsupported destinations",
  );
  const invalidPayResourceSandwormsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-cost-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Cost",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: -1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-sandworms specs should require non-negative costs",
  );
  const invalidPayResourceSandwormsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-amount-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Amount",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: -1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-sandworms specs should require non-negative sandworm amounts",
  );
  const invalidPayResourceSandwormsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-source-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsSourceCard, p2, p2),
    /Invalid pay-resource-for-sandworms source ""/,
    "Resource-for-sandworms specs should reject empty source labels",
  );
  const invalidPayResourceSandwormsTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Trash Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      trashSource: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsTrashSourceCard, p2, p2),
    /Invalid pay-resource-for-sandworms trashSource "false"/,
    "Resource-for-sandworms specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceSandwormsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-optional-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Optional",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsOptionalCard, p2, p2),
    /Invalid pay-resource-for-sandworms optional "false"/,
    "Resource-for-sandworms specs should reject non-true optional values",
  );
  const requiredPayResourceSandwormsCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-sandworms-card",
    name: "Effect Spec Required Pay Resource Sandworms",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      optional: false,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(requiredPayResourceSandwormsCard, p2, p2),
    /Invalid pay-resource-for-sandworms optional "false"/,
    "Resource-for-sandworms specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const revealDiscardInfluenceDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-influence-draw-card",
    name: "Effect Spec Reveal Discard Influence Draw",
    effects: [revealSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardInfluenceDrawCard], highCouncilSeat: false }),
    /Unsupported effect "discard-card-for-influence-and-draw" for reveal/,
    "Discard-for-Influence-and-draw specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardInfluenceDrawSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-selector-card",
    name: "Effect Spec Invalid Discard Influence Draw Selector",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "activated-ally",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-card-for-influence-and-draw/,
    "Discard-for-Influence-and-draw specs should reject activated Ally selectors",
  );
  const invalidDiscardInfluenceDrawAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-amount-card",
    name: "Effect Spec Invalid Discard Influence Draw Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: -1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative draw amounts",
  );
  const invalidDiscardInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-amount-card",
    name: "Effect Spec Invalid Discard Influence Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative Influence amounts",
  );
  const revealDiscardDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-draw-card",
    name: "Effect Spec Reveal Discard Draw",
    effects: [revealSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardDrawCard], highCouncilSeat: false }),
    /Unsupported effect "discard-card-for-draw" for reveal/,
    "Discard-for-draw specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardDrawSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-selector-card",
    name: "Effect Spec Invalid Discard Draw Selector",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "activated-ally",
      drawCards: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-card-for-draw/,
    "Discard-for-draw specs should reject activated Ally selectors",
  );
  const invalidDiscardDrawAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-amount-card",
    name: "Effect Spec Invalid Discard Draw Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should require non-negative draw amounts",
  );
  const invalidDiscardDrawOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-optional-card",
    name: "Effect Spec Invalid Discard Draw Optional",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawOptionalCard, p2, p2),
    /Invalid discard-card-for-draw optional "false"/,
    "Discard-for-draw specs should reject non-boolean optional values",
  );
  const invalidDiscardDrawBonusTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-trait-card",
    name: "Effect Spec Invalid Discard Draw Bonus Trait",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusDraw: {
        requiredDiscardTrait: "",
        drawCards: 1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusTraitCard, p2, p2),
    /Invalid discard-card-for-draw bonusDraw requiredDiscardTrait ""/,
    "Discard-for-draw specs should reject empty bonus trait labels",
  );
  const invalidDiscardDrawBonusAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-amount-card",
    name: "Effect Spec Invalid Discard Draw Bonus Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusDraw: {
        requiredDiscardTrait: "Faction: Spacing Guild",
        drawCards: -1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should reject negative bonus draw amounts",
  );
  const invalidDiscardDrawBonusIntriguesTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-intrigues-trait-card",
    name: "Effect Spec Invalid Discard Draw Bonus Intrigues Trait",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusIntrigues: {
        requiredDiscardTrait: "",
        amount: 1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusIntriguesTraitCard, p2, p2),
    /Invalid discard-card-for-draw bonusIntrigues requiredDiscardTrait ""/,
    "Discard-for-draw specs should reject empty bonus Intrigue trait labels",
  );
  const invalidDiscardDrawBonusIntriguesAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-intrigues-amount-card",
    name: "Effect Spec Invalid Discard Draw Bonus Intrigues Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusIntrigues: {
        requiredDiscardTrait: "Faction: Spacing Guild",
        amount: -1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusIntriguesAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should reject negative bonus Intrigue amounts",
  );
  const revealDiscardRewardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-reward-card",
    name: "Effect Spec Reveal Discard Reward",
    effects: [revealSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardRewardCard], highCouncilSeat: false }),
    /Unsupported effect "discard-cards-for-reward" for reveal/,
    "Discard-for-reward specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardRewardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-selector-card",
    name: "Effect Spec Invalid Discard Reward Selector",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "activated-ally",
      amount: 1,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-cards-for-reward/,
    "Discard-for-reward specs should reject activated Ally selectors",
  );
  const invalidDiscardRewardAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-amount-card",
    name: "Effect Spec Invalid Discard Reward Amount",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 0,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardAmountCard, p2, p2),
    /Invalid discard-cards-for-reward amount "0"/,
    "Discard-for-reward specs should require positive discard amounts",
  );
  const invalidDiscardRewardCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-cost-card",
    name: "Effect Spec Invalid Discard Reward Cost",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      cost: { solari: 0 },
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardCostCard, p2, p2),
    /Invalid discard-cards-for-reward cost solari "0"/,
    "Discard-for-reward specs should reject non-positive resource costs",
  );
  const invalidDiscardRewardEmptyCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-empty-card",
    name: "Effect Spec Invalid Discard Reward Empty",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardEmptyCard, p2, p2),
    /Invalid discard-cards-for-reward reward "undefined"/,
    "Discard-for-reward specs should require at least one reward",
  );
  const invalidDiscardRewardVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-vp-card",
    name: "Effect Spec Invalid Discard Reward VP",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gainVp: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardVpCard, p2, p2),
    /Invalid discard-cards-for-reward gainVp "0"/,
    "Discard-for-reward specs should require positive VP rewards",
  );
  const invalidDiscardRewardContractAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-contract-amount-card",
    name: "Effect Spec Invalid Discard Reward Contract Amount",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      takeContracts: { amount: 2, sourcePool: "public-offer" },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardContractAmountCard, p2, p2),
    /Invalid discard-cards-for-reward takeContracts amount "2"/,
    "Discard-for-reward specs should only support one public contract",
  );
  const invalidDiscardRewardContractSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-contract-source-card",
    name: "Effect Spec Invalid Discard Reward Contract Source",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      takeContracts: { amount: 1, sourcePool: "reserved" },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardContractSourceCard, p2, p2),
    /Invalid discard-cards-for-reward takeContracts sourcePool "reserved"/,
    "Discard-for-reward specs should only support public-offer contracts",
  );
  const invalidDiscardRewardOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-optional-card",
    name: "Effect Spec Invalid Discard Reward Optional",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gain: { spice: 1 },
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardOptionalCard, p2, p2),
    /Invalid discard-cards-for-reward optional "false"/,
    "Discard-for-reward specs should reject non-boolean optional values",
  );
  const topDeckSelectionCard = {
    ...convincingArgument,
    id: "effect-spec-top-deck-selection-card",
    name: "Effect Spec Top Deck Selection",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  const topDeckSelections = effectResolver.resolveAgentTopDeckSelections(topDeckSelectionCard.effects, {
    trigger: "agent-play",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(topDeckSelections.length, 1, "Top-deck selection specs should resolve for Agent play");
  assert.equal(topDeckSelections[0].selector, "self");
  assert.equal(topDeckSelections[0].lookCards, 3);
  assert.equal(topDeckSelections[0].drawCards, 1);
  assert.equal(topDeckSelections[0].discardCards, 1);
  assert.equal(topDeckSelections[0].trashCards, 1);
  assert.equal(topDeckSelections[0].minimumDeckCards, 3);
  const revealTopDeckSelectionCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-top-deck-selection-card",
    name: "Effect Spec Reveal Top Deck Selection",
    effects: [revealSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealTopDeckSelectionCard], highCouncilSeat: false }),
    /Unsupported effect "select-top-deck-cards" for reveal/,
    "Top-deck selection specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidTopDeckSelectionSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-top-deck-selection-selector-card",
    name: "Effect Spec Invalid Top Deck Selection Selector",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "activated-ally",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveAgentTopDeckSelections(invalidTopDeckSelectionSelectorCard.effects, {
      trigger: "agent-play",
      source: p2,
      target: p2,
      state: game,
    }),
    /Unsupported effect selector "activated-ally" for select-top-deck-cards/,
    "Top-deck selection specs should reject activated Ally selectors",
  );
  const invalidTopDeckSelectionAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-top-deck-selection-amount-card",
    name: "Effect Spec Invalid Top Deck Selection Amount",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 2,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveAgentTopDeckSelections(invalidTopDeckSelectionAmountCard.effects, {
      trigger: "agent-play",
      source: p2,
      target: p2,
      state: game,
    }),
    /Invalid select-top-deck-cards drawCards "2"/,
    "Top-deck selection specs should reject unsupported card-assignment shapes",
  );
  const revealTrashIntrigueRewardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-trash-intrigue-reward-card",
    name: "Effect Spec Reveal Trash Intrigue Reward",
    effects: [revealSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealTrashIntrigueRewardCard], highCouncilSeat: false }),
    /Unsupported effect "trash-intrigue-for-reward" for reveal/,
    "Trash-Intrigue reward specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidTrashIntrigueSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-selector-card",
    name: "Effect Spec Invalid Trash Intrigue Selector",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "activated-ally",
      drawIntrigues: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for trash-intrigue-for-reward/,
    "Trash-Intrigue reward specs should reject activated Ally selectors",
  );
  const invalidTrashIntrigueAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward drawIntrigues "-1"/,
    "Trash-Intrigue reward specs should reject negative Intrigue draw amounts",
  );
  const invalidTrashIntrigueZeroAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-zero-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Zero Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueZeroAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward drawIntrigues "0"/,
    "Trash-Intrigue reward specs should reject zero Intrigue draw rewards",
  );
  const invalidTrashIntrigueResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-resource-card",
    name: "Effect Spec Invalid Trash Intrigue Resource",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { melange: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Trash-Intrigue reward specs should reject unsupported resource gains",
  );
  const invalidTrashIntrigueGainAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-gain-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Gain Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { spice: -1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueGainAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward gain spice "-1"/,
    "Trash-Intrigue reward specs should reject negative resource gains",
  );
  const invalidTrashIntrigueZeroGainAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-zero-gain-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Zero Gain Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { spice: 0 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueZeroGainAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward gain spice "0"/,
    "Trash-Intrigue reward specs should reject zero resource gains",
  );
  const invalidTrashIntrigueCostResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-cost-resource-card",
    name: "Effect Spec Invalid Trash Intrigue Cost Resource",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      cost: { melange: 1 },
      gainVp: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueCostResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Trash-Intrigue reward specs should reject unsupported resource costs",
  );
  const invalidTrashIntrigueCostAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-cost-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Cost Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      cost: { spice: 0 },
      gainVp: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueCostAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward cost spice "0"/,
    "Trash-Intrigue reward specs should reject zero resource costs",
  );
  const invalidTrashIntrigueGainVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-gain-vp-card",
    name: "Effect Spec Invalid Trash Intrigue Gain VP",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gainVp: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueGainVpCard, p2, p2),
    /Invalid trash-intrigue-for-reward gainVp "0"/,
    "Trash-Intrigue reward specs should reject zero VP rewards",
  );
  const invalidTrashIntrigueEmptyRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-empty-reward-card",
    name: "Effect Spec Invalid Trash Intrigue Empty Reward",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueEmptyRewardCard, p2, p2),
    /Invalid trash-intrigue-for-reward reward "undefined"/,
    "Trash-Intrigue reward specs should require at least one reward",
  );
  const invalidTrashIntrigueSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-source-card",
    name: "Effect Spec Invalid Trash Intrigue Source",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueSourceCard, p2, p2),
    /Invalid trash-intrigue-for-reward source ""/,
    "Trash-Intrigue reward specs should reject empty source labels",
  );
  const invalidTrashIntrigueOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-optional-card",
    name: "Effect Spec Invalid Trash Intrigue Optional",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
      optional: "yes",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueOptionalCard, p2, p2),
    /Invalid trash-intrigue-for-reward optional "yes"/,
    "Trash-Intrigue reward specs should reject non-boolean optional values",
  );
  const revealOpponentDiscardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-opponent-discard-card",
    name: "Effect Spec Reveal Opponent Discard",
    effects: [revealSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealOpponentDiscardCard], highCouncilSeat: false }),
    /Unsupported effect "opponents-discard-cards" for reveal/,
    "Opponent-discard specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidOpponentDiscardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-selector-card",
    name: "Effect Spec Invalid Opponent Discard Selector",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "activated-ally",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for opponents-discard-cards/,
    "Opponent-discard specs should reject activated Ally selectors",
  );
  const invalidOpponentDiscardAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-amount-card",
    name: "Effect Spec Invalid Opponent Discard Amount",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Opponent-discard specs should require non-negative discard amounts",
  );
  const invalidOpponentDiscardSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-source-card",
    name: "Effect Spec Invalid Opponent Discard Source",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardSourceCard, p2, p2),
    /Invalid opponents-discard-cards source ""/,
    "Opponent-discard specs should reject empty source labels",
  );
  const revealDeploymentBlockCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-deployment-block-card",
    name: "Effect Spec Reveal Deployment Block",
    effects: [revealSpec([{ kind: "block-conflict-deployment", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDeploymentBlockCard], highCouncilSeat: false }),
    /Unsupported effect "block-conflict-deployment" for reveal/,
    "Deployment-block specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDeploymentBlockSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-selector-card",
    name: "Effect Spec Invalid Deployment Block Selector",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for block-conflict-deployment/,
    "Deployment-block specs should reject activated Ally selectors",
  );
  const invalidDeploymentBlockSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-source-card",
    name: "Effect Spec Invalid Deployment Block Source",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSourceCard, p2, p2),
    /Invalid block-conflict-deployment source ""/,
    "Deployment-block specs should reject empty source labels",
  );
  const revealCommanderResourceSplitCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-commander-resource-split-card",
    name: "Effect Spec Reveal Commander Resource Split",
    effects: [revealSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealCommanderResourceSplitCard], highCouncilSeat: false }),
    /Unsupported effect "commander-resource-split" for reveal/,
    "Commander resource split specs should stay in Agent play",
  );
  const invalidCommanderResourceSplitSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-selector-card",
    name: "Effect Spec Invalid Commander Resource Split Selector",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "activated-ally", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for commander-resource-split/,
    "Commander resource split specs should reject activated Ally selectors",
  );
  const invalidCommanderResourceSplitSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-source-card",
    name: "Effect Spec Invalid Commander Resource Split Source",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", source: "", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitSourceCard, p2, p2),
    /Invalid commander-resource-split source ""/,
    "Commander resource split specs should reject empty source labels",
  );
  const invalidCommanderResourceSplitOptionsCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-options-card",
    name: "Effect Spec Invalid Commander Resource Split Options",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitOptionsCard, p2, p2),
    /Invalid commander-resource-split options/,
    "Commander resource split specs should require at least one option",
  );
  const invalidCommanderResourceSplitResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-resource-card",
    name: "Effect Spec Invalid Commander Resource Split Resource",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "melange", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Commander resource split specs should reject unsupported resource ids",
  );
  const invalidCommanderResourceSplitAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-amount-card",
    name: "Effect Spec Invalid Commander Resource Split Amount",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "water", commanderAmount: -1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitAmountCard, p2, p2),
    /Invalid commander-resource-split commanderAmount "-1"/,
    "Commander resource split specs should reject negative amounts",
  );
  const revealThroneRowMoveCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-throne-row-move-card",
    name: "Effect Spec Reveal Throne Row Move",
    effects: [revealSpec([{ kind: "move-card-to-throne-row", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealThroneRowMoveCard], highCouncilSeat: false }),
    /Unsupported effect "move-card-to-throne-row" for reveal/,
    "Throne Row movement specs should stay in Agent play",
  );
  const invalidThroneRowMoveSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-throne-row-move-selector-card",
    name: "Effect Spec Invalid Throne Row Move Selector",
    effects: [agentSpec([{ kind: "move-card-to-throne-row", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidThroneRowMoveSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for move-card-to-throne-row/,
    "Throne Row movement specs should reject activated Ally selectors",
  );
  const invalidThroneRowMoveSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-throne-row-move-source-card",
    name: "Effect Spec Invalid Throne Row Move Source",
    effects: [agentSpec([{ kind: "move-card-to-throne-row", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidThroneRowMoveSourceCard, p2, p2),
    /Invalid move-card-to-throne-row source ""/,
    "Throne Row movement specs should reject empty source labels",
  );
  const revealRecallAgentCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-recall-agent-card",
    name: "Effect Spec Reveal Recall Agent",
    effects: [revealSpec([{ kind: "recall-agent", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealRecallAgentCard], highCouncilSeat: false }),
    /Unsupported effect "recall-agent" for reveal/,
    "Recall Agent specs should stay in Agent play",
  );
  const invalidRecallAgentSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recall-agent-selector-card",
    name: "Effect Spec Invalid Recall Agent Selector",
    effects: [agentSpec([{ kind: "recall-agent", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecallAgentSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for recall-agent/,
    "Recall Agent specs should reject activated Ally selectors",
  );
  const invalidRecallAgentSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recall-agent-source-card",
    name: "Effect Spec Invalid Recall Agent Source",
    effects: [agentSpec([{ kind: "recall-agent", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecallAgentSourceCard, p2, p2),
    /Invalid recall-agent source ""/,
    "Recall Agent specs should reject empty source labels",
  );
  const recallAgentEffectCard = {
    ...convincingArgument,
    id: "effect-spec-recall-agent-effect-card",
    name: "Effect Spec Recall Agent",
    effects: [agentSpec([{ kind: "recall-agent", selector: "self", source: "Recall Test" }])],
  };
  const recallAgentApplied = state.applyCardAgentEffect(
    recallAgentEffectCard,
    { ...p2, agentsReady: 0, agentsTotal: 2 },
    { ...p2, agentsReady: 0, agentsTotal: 2 },
  );
  assert.equal(recallAgentApplied.source.agentsReady, 1, "Recall Agent should ready one spent Agent");
  assert.equal(recallAgentApplied.recalledAgents, 1, "Recall Agent should expose its immediate recall count");
  const duplicateRecallAgentEffectCard = {
    ...convincingArgument,
    id: "effect-spec-duplicate-recall-agent-effect-card",
    name: "Effect Spec Duplicate Recall Agent",
    effects: [agentSpec([
      { kind: "recall-agent", selector: "self", source: "Recall Test" },
      { kind: "recall-agent", selector: "self", source: "Recall Test" },
    ])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(duplicateRecallAgentEffectCard, p2, p2),
    /Unsupported multiple recall-agent effects/,
    "Recall Agent specs should reject multiple simultaneous Agent recalls",
  );
	  const conditionalRevealRetreatCard = {
	    ...convincingArgument,
	    id: "effect-spec-conditional-reveal-retreat-card",
	    name: "Effect Spec Conditional Reveal Retreat",
	    conditionalPersuasion: false,
	    effects: [revealSpec(
	      [{ kind: "retreat-troops-for-strength", selector: "self", amount: 1, strength: 3 }],
	      [{ kind: "has-conflict-units", count: 2 }],
	    )],
	  };
	  const commanderRetreatFixture = withActivePlayer(game, p4.id, () => ({
	    agentsReady: 0,
	    conflict: 0,
	    deployedTroops: 0,
	    hand: [conditionalRevealRetreatCard],
	    playArea: [],
	  }));
	  const commanderRetreatState = {
	    ...commanderRetreatFixture,
	    players: commanderRetreatFixture.players.map((player) =>
	      player.id === p2.id
	        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
	        : player,
	    ),
	  };
	  const commanderRetreatPlan = turnActions.revealTurnPlan(playerById(commanderRetreatState, p4.id), commanderRetreatState);
	  const commanderRetreatRevealed = turnActions.revealTurnAction(commanderRetreatState, {
	    commanderTargets: { [p4.id]: p2.id },
	    revealPlan: commanderRetreatPlan,
	  });
	  assert.equal(
	    commanderRetreatRevealed.pendingAction?.kind,
	    "retreat-troops-for-strength",
	    "Conditional Reveal retreat should evaluate conflict-unit conditions against the activated Ally",
	  );
	  const commanderRetreatUnqualifiedState = {
	    ...commanderRetreatFixture,
	    players: commanderRetreatFixture.players.map((player) =>
	      player.id === p2.id
	        ? { ...player, conflict: 2, deployedTroops: 1, garrison: 0 }
	        : player,
	    ),
	  };
	  const commanderRetreatUnqualifiedPlan = turnActions.revealTurnPlan(
	    playerById(commanderRetreatUnqualifiedState, p4.id),
	    commanderRetreatUnqualifiedState,
	  );
	  const commanderRetreatUnqualified = turnActions.revealTurnAction(commanderRetreatUnqualifiedState, {
	    commanderTargets: { [p4.id]: p2.id },
	    revealPlan: commanderRetreatUnqualifiedPlan,
	  });
	  assert.equal(
	    commanderRetreatUnqualified.pendingAction,
	    undefined,
	    "Conditional Reveal retreat should not use the Commander as the conflict-unit condition owner",
	  );
	  const invalidConflictUnitsCountCard = {
	    ...convincingArgument,
	    id: "effect-spec-invalid-conflict-units-count-card",
	    name: "Effect Spec Invalid Conflict Units Count",
	    effects: [agentSpec(
	      [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
	      [{ kind: "has-conflict-units", count: -1 }],
	    )],
	  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidConflictUnitsCountCard, p2, p2),
    /Invalid has-conflict-units count "-1"/,
    "Conflict-unit conditions should require a non-negative integer threshold",
  );
  const choiceDeferredIntrigueDrawSpecs = [agentSpec(
    [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
    [{ kind: "has-conflict-units", count: 2 }],
  )].map((spec) => ({ ...spec, choiceId: "deploy-draw" }));
  assert.throws(
    () => effectResolver.resolveDeferredAgentConflictUnitIntrigueDraws(choiceDeferredIntrigueDrawSpecs, {
      trigger: "agent-play",
      source: p2,
    }),
    /Unsupported choiceId for agent-play/,
    "Choice ids should stay on Plot Intrigue specs until Agent selected-choice plumbing exists",
  );
	  const revealIntrigueDrawCard = {
	    ...convincingArgument,
	    id: "effect-spec-reveal-intrigue-draw-card",
    name: "Effect Spec Reveal Intrigue Draw",
    effects: [revealSpec([{ kind: "draw-intrigues", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealIntrigueDrawCard], highCouncilSeat: false }),
	    /Unsupported effect "draw-intrigues" for reveal/,
	    "Intrigue draw specs should stay out of Reveal until a reveal-time state resolver supports them",
	  );
	  const agentRetreatStrengthCard = {
	    ...convincingArgument,
	    id: "effect-spec-agent-retreat-strength-card",
	    name: "Effect Spec Agent Retreat Strength",
	    effects: [{
	      trigger: "agent-play",
	      effects: [{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: 4 }],
	    }],
	  };
	  assert.throws(
	    () => state.applyCardAgentEffect(agentRetreatStrengthCard, p2, p2),
	    /Unsupported effect "retreat-troops-for-strength" for agent-play/,
	    "Retreat-for-strength specs should stay in Reveal until other trigger resolvers support them",
	  );
	  const invalidRetreatStrengthCard = {
	    ...convincingArgument,
	    id: "effect-spec-invalid-retreat-strength-card",
	    name: "Effect Spec Invalid Retreat Strength",
	    effects: [revealSpec([{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: -4 }])],
	  };
	  assert.throws(
	    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRetreatStrengthCard], highCouncilSeat: false }),
	    /Invalid effect amount "-4"/,
	    "Retreat-for-strength specs should require non-negative strength",
	  );
  const deployOrRetreatCard = {
    ...convincingArgument,
    id: "effect-spec-deploy-or-retreat-card",
    name: "Effect Spec Deploy Or Retreat",
    effects: [revealSpec([{
      kind: "deploy-or-retreat-troops",
      selector: "self",
      amount: 1,
      optional: true,
      source: "Deploy Or Retreat Test",
    }])],
  };
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(deployOrRetreatCard.effects, {
      trigger: "reveal",
      source: p2,
      state: game,
    }),
    [{ selector: "self", troopCount: 1, optional: true, source: "Deploy Or Retreat Test" }],
    "Deploy-or-retreat specs should resolve as reveal pending effects",
  );
  const agentDeployOrRetreatCard = {
    ...convincingArgument,
    id: "effect-spec-agent-deploy-or-retreat-card",
    name: "Effect Spec Agent Deploy Or Retreat",
    effects: [agentSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentDeployOrRetreatCard, p2, p2),
    /Unsupported effect "deploy-or-retreat-troops" for agent-play/,
    "Deploy-or-retreat specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidDeployOrRetreatSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-selector-card",
    name: "Effect Spec Invalid Deploy Or Retreat Selector",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "activated-ally", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Deploy-or-retreat specs should reject activated Ally selectors",
  );
  const invalidDeployOrRetreatAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-amount-card",
    name: "Effect Spec Invalid Deploy Or Retreat Amount",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 0 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatAmountCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops amount "0"/,
    "Deploy-or-retreat specs should require a positive troop count",
  );
  const invalidDeployOrRetreatOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-optional-card",
    name: "Effect Spec Invalid Deploy Or Retreat Optional",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1, optional: "true" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatOptionalCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops optional "true"/,
    "Deploy-or-retreat specs should reject non-boolean optional values",
  );
  const invalidDeployOrRetreatSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-source-card",
    name: "Effect Spec Invalid Deploy Or Retreat Source",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1, source: "" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatSourceCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops source ""/,
    "Deploy-or-retreat specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [agentSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: 2 }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "retreat-troops" for agent-play/,
    "Selected retreat specs should stay on Combat Intrigues",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "activated-ally", min: 1, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "activated-ally" for combat-intrigue/,
    "Combat selected retreat specs should reject activated Ally selectors",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 0, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops min "0"/,
    "Combat selected retreat specs should require positive minimum troop counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 2, max: 1 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops bounds "2-1"/,
    "Combat selected retreat specs should reject inverted troop-count bounds",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: { kind: "deployed-troops" }, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops min/,
    "Combat selected retreat specs should reject dynamic minimum troop counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: { kind: "garrison" } }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Unsupported retreat-troops max "garrison"/,
    "Combat selected retreat specs should reject unsupported dynamic maximum troop bounds",
  );
	  const unsupportedEffectCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-effect-card",
    name: "Effect Spec Unsupported Effect",
    effects: [revealSpec([{ kind: "draw-card", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedEffectCard], highCouncilSeat: false }),
    /Unsupported effect "draw-card"/,
    "Unsupported effects should fail loudly instead of silently becoming no-ops",
  );
  const unsupportedResourceCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-resource-card",
    name: "Effect Spec Unsupported Resource",
    effects: [revealSpec([{ kind: "gain-resource", selector: "self", resource: "melange", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedResourceCard], highCouncilSeat: false }),
    /Unsupported effect resource "melange"/,
    "Unsupported resource ids should fail before they can enter revealGain",
  );
  const unsupportedTriggerCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-trigger-card",
    name: "Effect Spec Unsupported Trigger",
    effects: [{
      trigger: "reveall",
      effects: [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [unsupportedTriggerCard], highCouncilSeat: false }),
    /Unsupported effect trigger "reveall"/,
    "Unsupported effect triggers should fail loudly instead of falling back to legacy fields",
  );
  assert.throws(
    () => effectResolver.resolveGameEffects(
      [discardSpec([{ kind: "draw-cards", selector: "self", amount: 1 }])],
      { trigger: "discard", source: p2, state: game },
    ),
    /Unsupported effect "draw-cards" for discard/,
    "Discard-trigger specs should reject effects beyond supported resource gains",
  );
  const nonRevealUnsupportedEffectCard = {
    ...convincingArgument,
    id: "effect-spec-non-reveal-unsupported-effect-card",
    name: "Effect Spec Non-Reveal Unsupported Effect",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "draw-card", selector: "self", amount: 1 }],
    }],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [nonRevealUnsupportedEffectCard], highCouncilSeat: false }),
    /Unsupported effect "draw-card"/,
    "Unsupported non-Reveal effect shapes should fail before Reveal filtering can hide them",
  );

  const noMakerReveal = turnActions.revealTurnPlan({ ...p2, hand: [smuggler], highCouncilSeat: false }, game);
  assert.equal(noMakerReveal.persuasion, 1, "Smuggler's Harvester spec should include base persuasion");
  assert.equal(noMakerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not gain spice on Reveal");
  const makerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smuggler], highCouncilSeat: false },
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
  );
  assert.equal(makerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester Maker-space spice should stay on Agent play");
  const smugglerMakerAgentEffect = state.applyCardAgentEffect(
    smuggler,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    imperialBasin,
  );
  assert.deepEqual(
    smugglerMakerAgentEffect.source.resources,
    { solari: 0, spice: 1, water: 0 },
    "Smuggler's Harvester should gain 1 Agent spice on a Maker space",
  );
  assert.equal(
    smugglerMakerAgentEffect.sourceSpiceGained,
    1,
    "Smuggler's Harvester Agent spice should be tracked as turn spice gain",
  );
  assert.match(smugglerMakerAgentEffect.log ?? "", /Smuggler's Harvester: gains 1 spice/);
  const smugglerNonMakerAgentEffect = state.applyCardAgentEffect(
    smuggler,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    deliverSupplies,
  );
  assert.deepEqual(
    smugglerNonMakerAgentEffect.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Smuggler's Harvester should not gain Agent spice on a non-Maker space",
  );
  assert.equal(smugglerNonMakerAgentEffect.log, undefined, "Smuggler's Harvester should not log on non-Maker spaces");

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const interstellarReveal = turnActions.revealTurnPlan({
    ...p2,
    contracts: [...completedContracts, { card: data.standardContracts[2], completed: false, takenRound: 1 }],
    hand: [interstellarTrade],
    highCouncilSeat: false,
  }, game);
  assert.equal(interstellarReveal.persuasion, 2, "Interstellar Trade should use completed-contract amount specs");
  assert.deepEqual(
    effectResolver.resolveGainInfluenceChoices(interstellarTrade.effects, {
      trigger: "acquire",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, trashSource: false, source: "Interstellar Trade" }],
    "Interstellar Trade acquire Influence choice should resolve from typed specs",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(interstellarTrade.effects, {
      trigger: "acquire",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: "Interstellar Trade" }],
    "Interstellar Trade acquire contract bonus should resolve from typed specs",
  );
  const priorityContractsAgentResult = effectResolver.resolveGameEffects(priorityContracts.effects, {
    trigger: "agent-play",
    source: p2,
    state: game,
  });
  assert.equal(
    priorityContractsAgentResult.revealGain.spice,
    2,
    "Priority Contracts Agent spice bonus should resolve from typed specs",
  );
  assert.equal(
    priorityContractsAgentResult.vp,
    1,
    "Priority Contracts Agent VP bonus should resolve from typed specs",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(priorityContracts.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: "Priority Contracts" }],
    "Priority Contracts contract bonus should resolve from typed Agent specs",
  );
  const priorityContractsAcquireReplacement = data.imperiumDeck.find((card) => card.id !== priorityContracts.id);
  assert.ok(priorityContractsAcquireReplacement, "Expected an Imperium Row replacement for Priority Contracts acquisition coverage");
  const priorityContractsAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: priorityContracts.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [priorityContracts],
      marketDeck: [priorityContractsAcquireReplacement],
    },
    p2.id,
    priorityContracts.id,
  );
  assert.equal(playerById(priorityContractsAcquired, p2.id).vp, 0, "Acquiring Priority Contracts should not award its Agent VP");
  assert.equal(playerById(priorityContractsAcquired, p2.id).discard.at(-1)?.id, priorityContracts.id);
  assert.equal(priorityContractsAcquired.pendingAction, undefined, "Acquiring Priority Contracts should not queue Agent contract effects");
  const priorityContractsSpace = {
    id: "priority-contracts-test-space",
    name: "Priority Contracts Test Space",
    zone: "Landsraad",
    icon: "landsraad",
    detail: "Verifier-only Landsraad space without board pending rewards.",
  };
  const priorityContractsOffer = data.standardContracts[6];
  const priorityContractsReplacement = data.standardContracts[7];
  assert.ok(priorityContractsOffer && priorityContractsReplacement, "Expected standard contracts for Priority Contracts coverage");
  const priorityContractsPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsOffer],
      contractDeck: [priorityContractsReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.deepEqual(
    priorityContractsPlaced.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true },
    "Priority Contracts should queue a public CHOAM contract after Agent placement",
  );
  assert.equal(playerById(priorityContractsPlaced, p2.id).resources.spice, 3, "Priority Contracts should grant 2 spice immediately");
  assert.equal(playerById(priorityContractsPlaced, p2.id).vp, 1, "Priority Contracts should grant 1 VP immediately");
  assert.match(priorityContractsPlaced.log[0], /Priority Contracts: gains 2 spice; gains 1 VP/);
  const priorityContractsResolved = state.takeChoamContract(
    priorityContractsPlaced,
    priorityContractsPlaced.pendingAction,
    priorityContractsOffer.id,
  );
  assert.equal(priorityContractsResolved.pendingAction, undefined);
  assert.equal(playerById(priorityContractsResolved, p2.id).contracts.at(-1)?.card.id, priorityContractsOffer.id);
  assert.deepEqual(
    priorityContractsResolved.contractOffer.map((contract) => contract.id),
    [priorityContractsReplacement.id],
    "Priority Contracts should refill the public contract offer after taking a contract",
  );
  const priorityContractsAcceptOffer = data.standardContracts[8];
  const priorityContractsAcceptRefillOffer = data.standardContracts[9];
  const priorityContractsAcceptReplacement = data.standardContracts[10];
  assert.ok(
    priorityContractsAcceptOffer && priorityContractsAcceptRefillOffer && priorityContractsAcceptReplacement,
    "Expected standard contracts for Priority Contracts Accept Contract coverage",
  );
  const priorityContractsAcceptPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        deck: [dagger],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsAcceptOffer],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: acceptContract,
    },
  );
  assert.deepEqual(
    priorityContractsAcceptPlaced.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Accept Contract", spaceId: "accept-contract" },
    "Accept Contract should queue its board contract choice before Priority Contracts",
  );
  assert.deepEqual(
    priorityContractsAcceptPlaced.pendingQueue,
    [{ kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true }],
    "Priority Contracts should queue behind the board contract choice",
  );
  const priorityContractsAcceptResolved = state.takeChoamContract(
    priorityContractsAcceptPlaced,
    priorityContractsAcceptPlaced.pendingAction,
    priorityContractsAcceptOffer.id,
  );
  assert.equal(
    priorityContractsAcceptResolved.pendingAction,
    undefined,
    "Priority Contracts should not leave a stale public-only contract pending when Accept Contract consumes the last offer",
  );
  assert.equal(priorityContractsAcceptResolved.pendingQueue.length, 0);
  assert.equal(playerById(priorityContractsAcceptResolved, p2.id).contracts.at(-1)?.card.id, priorityContractsAcceptOffer.id);
  assert.match(
    priorityContractsAcceptResolved.log[0],
    /cannot take a face-up CHOAM contract from Priority Contracts; no face-up CHOAM contracts remain/,
  );
  const priorityContractsAcceptRefillPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        deck: [dagger],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsAcceptRefillOffer],
      contractDeck: [priorityContractsAcceptReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: acceptContract,
    },
  );
  const priorityContractsAcceptRefilled = state.takeChoamContract(
    priorityContractsAcceptRefillPlaced,
    priorityContractsAcceptRefillPlaced.pendingAction,
    priorityContractsAcceptRefillOffer.id,
  );
  assert.deepEqual(
    priorityContractsAcceptRefilled.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true },
    "Priority Contracts should remain pending when Accept Contract refills a public contract",
  );
  assert.deepEqual(priorityContractsAcceptRefilled.contractOffer.map((contract) => contract.id), [
    priorityContractsAcceptReplacement.id,
  ]);
  const priorityContractsAcceptRefilledResolved = state.takeChoamContract(
    priorityContractsAcceptRefilled,
    priorityContractsAcceptRefilled.pendingAction,
    priorityContractsAcceptReplacement.id,
  );
  assert.equal(priorityContractsAcceptRefilledResolved.pendingAction, undefined);
  assert.deepEqual(
    playerById(priorityContractsAcceptRefilledResolved, p2.id).contracts.slice(-2).map((contract) => contract.card.id),
    [priorityContractsAcceptRefillOffer.id, priorityContractsAcceptReplacement.id],
    "Accept Contract plus Priority Contracts should take both contracts when the public offer refills",
  );
  const priorityContractsNoOffer = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.equal(priorityContractsNoOffer.pendingAction, undefined, "Priority Contracts should not queue when no public contracts remain");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).resources.spice, 3, "Priority Contracts no-offer path should still grant spice");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).vp, 1, "Priority Contracts no-offer path should still grant VP");

  const corrinthReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [corrinthCity], highCouncilSeat: false },
    game,
  );
  assert.equal(corrinthReveal.persuasion, 5, "Corrinth City should resolve its default +5 persuasion Reveal branch");
  const corrinthRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [corrinthCity],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    revealed: false,
  }));
  const corrinthRevealActionPlan = turnActions.revealTurnPlan(
    playerById(corrinthRevealFixture, p2.id),
    corrinthRevealFixture,
  );
  const corrinthRevealed = turnActions.revealTurnAction(corrinthRevealFixture, {
    commanderTargets: {},
    revealPlan: corrinthRevealActionPlan,
  });
  assert.deepEqual(
    corrinthRevealed.pendingAction,
    {
      kind: "pay-resource-for-high-council-seat",
      ownerId: p2.id,
      resource: "solari",
      cost: 5,
      optional: true,
      persuasionCost: 5,
      persuasionReward: 2,
      source: "Corrinth City",
      cardId: corrinthCity.id,
    },
    "Corrinth City should queue its paid High Council Reveal branch",
  );
  assert.equal(playerById(corrinthRevealed, p2.id).persuasion, 5, "Corrinth City should add +5 persuasion before branch payment");
  const corrinthCouncilPaid = state.resolvePayResourceForHighCouncilSeatChoice(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
  );
  assert.equal(corrinthCouncilPaid.pendingAction, undefined, "Corrinth City High Council payment should resolve its pending action");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).resources.solari, 0, "Corrinth City High Council branch should spend 5 Solari");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).highCouncilSeat, true, "Corrinth City High Council branch should take a seat");
  assert.equal(
    playerById(corrinthCouncilPaid, p2.id).persuasion,
    2,
    "Corrinth City High Council branch should replace +5 persuasion with the current High Council +2",
  );
  assert.match(corrinthCouncilPaid.log[0], /spends 5 Solari.*takes a High Council seat.*gains 2 persuasion/i);
  const corrinthCouncilSkipped = state.skipPayResourceForHighCouncilSeat(
    corrinthRevealed,
    corrinthRevealed.pendingAction,
  );
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).resources.solari, 5, "Skipping Corrinth City High Council should keep Solari");
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).persuasion, 5, "Skipping Corrinth City High Council should keep +5 persuasion");
  assert.equal(playerById(corrinthCouncilSkipped, p2.id).highCouncilSeat, false, "Skipping Corrinth City High Council should not take a seat");
  const { cardId: _corrinthHighCouncilCardId, ...corrinthMissingCardPending } = corrinthRevealed.pendingAction;
  const corrinthMissingCardIdState = {
    ...corrinthRevealed,
    pendingAction: corrinthMissingCardPending,
    pendingQueue: [],
  };
  const corrinthMissingCardIdResolved = state.resolvePayResourceForHighCouncilSeatChoice(
    corrinthMissingCardIdState,
    corrinthMissingCardIdState.pendingAction,
  );
  assert.equal(
    playerById(corrinthMissingCardIdResolved, p2.id).highCouncilSeat,
    false,
    "Corrinth City High Council payment should reject malformed pendings without a source card id",
  );
  assert.equal(
    playerById(corrinthMissingCardIdResolved, p2.id).resources.solari,
    5,
    "Malformed Corrinth City High Council payment should not spend Solari",
  );
  const corrinthFullCouncilFixture = {
    ...corrinthRevealFixture,
    players: corrinthRevealFixture.players.map((player) =>
      ["p1", "p3", "p4", "p5"].includes(player.id)
        ? { ...player, highCouncilSeat: true }
        : player.id === p2.id
          ? { ...player, highCouncilSeat: false }
          : player
    ),
  };
  const corrinthFullCouncilPlan = turnActions.revealTurnPlan(
    playerById(corrinthFullCouncilFixture, p2.id),
    corrinthFullCouncilFixture,
  );
  const corrinthFullCouncilRevealed = turnActions.revealTurnAction(corrinthFullCouncilFixture, {
    commanderTargets: {},
    revealPlan: corrinthFullCouncilPlan,
  });
  assert.equal(corrinthFullCouncilRevealed.pendingAction, undefined, "Corrinth City should not queue High Council payment when seats are full");
  const deliveryReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [deliveryAgreement], highCouncilSeat: false },
    game,
  );
  assert.equal(deliveryReveal.revealGain.spice, 1, "Delivery Agreement should resolve its default Reveal spice reward");
  const deliveryCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const deliveryRevealFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts,
    discard: [],
    hand: [deliveryAgreement],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    revealed: false,
    vp: 0,
  }));
  const deliveryRevealActionPlan = turnActions.revealTurnPlan(
    playerById(deliveryRevealFixture, p2.id),
    deliveryRevealFixture,
  );
  const deliveryRevealed = turnActions.revealTurnAction(deliveryRevealFixture, {
    commanderTargets: {},
    revealPlan: deliveryRevealActionPlan,
  });
  assert.deepEqual(
    deliveryRevealed.pendingAction,
    {
      kind: "trash-card",
      ownerId: p2.id,
      source: "Delivery Agreement",
      optional: true,
      zones: ["playArea"],
      requiredCardId: deliveryAgreement.id,
      vpReward: 1,
    },
    "Delivery Agreement should queue its completed-contract Reveal source-trash VP branch",
  );
  assert.equal(playerById(deliveryRevealed, p2.id).resources.spice, 1, "Delivery Agreement should gain Reveal spice before optional trash");
  const deliveryVpTrashed = state.trashPlayerCard(
    deliveryRevealed,
    deliveryRevealed.pendingAction,
    "playArea",
    deliveryAgreement.id,
    0,
  );
  assert.equal(deliveryVpTrashed.pendingAction, undefined, "Delivery Agreement Reveal trash should resolve its pending action");
  assert.equal(playerById(deliveryVpTrashed, p2.id).vp, 1, "Delivery Agreement Reveal trash should gain 1 VP");
  assert.equal(
    playerById(deliveryVpTrashed, p2.id).playArea.some((card) => card.id === deliveryAgreement.id),
    false,
    "Delivery Agreement Reveal trash should remove the source card from play",
  );
  const deliveryVpSkipped = state.skipTrashCard(deliveryRevealed, deliveryRevealed.pendingAction);
  assert.equal(playerById(deliveryVpSkipped, p2.id).vp, 0, "Skipping Delivery Agreement Reveal trash should not gain VP");
  assert.equal(
    playerById(deliveryVpSkipped, p2.id).playArea.some((card) => card.id === deliveryAgreement.id),
    true,
    "Skipping Delivery Agreement Reveal trash should leave the source card in play",
  );
  const malformedVpTrashPending = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Malformed VP Trash",
    optional: true,
    zones: ["hand"],
    vpReward: 1,
  };
  const malformedVpTrashFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      discard: [],
      hand: [dagger],
      playArea: [],
      vp: 0,
    })),
    pendingAction: malformedVpTrashPending,
    pendingQueue: [],
  };
  const malformedVpTrashResolved = state.trashPlayerCard(
    malformedVpTrashFixture,
    malformedVpTrashPending,
    "hand",
    dagger.id,
    0,
  );
  assert.equal(
    playerById(malformedVpTrashResolved, p2.id).vp,
    0,
    "Trash-card VP rewards should only apply to source-card play-area trash pendings",
  );
  const deliveryUndercontractedFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts.slice(0, 3),
    hand: [deliveryAgreement],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const deliveryUndercontractedPlan = turnActions.revealTurnPlan(
    playerById(deliveryUndercontractedFixture, p2.id),
    deliveryUndercontractedFixture,
  );
  const deliveryUndercontractedRevealed = turnActions.revealTurnAction(deliveryUndercontractedFixture, {
    commanderTargets: {},
    revealPlan: deliveryUndercontractedPlan,
  });
  assert.equal(deliveryUndercontractedRevealed.pendingAction, undefined, "Delivery Agreement should not queue Reveal trash below four completed contracts");
  const corrinthAcquireReplacement = data.imperiumDeck.find((card) => card.id !== corrinthCity.id);
  const deliveryAcquireReplacement = data.imperiumDeck.find((card) => card.id !== deliveryAgreement.id);
  assert.ok(corrinthAcquireReplacement && deliveryAcquireReplacement, "Expected Imperium Row replacements for discard-reward acquisition coverage");
  const corrinthAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: corrinthCity.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [corrinthCity],
      marketDeck: [corrinthAcquireReplacement],
    },
    p2.id,
    corrinthCity.id,
  );
  assert.equal(playerById(corrinthAcquired, p2.id).vp, 0, "Acquiring Corrinth City should not award its Agent VP");
  const deliveryAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: deliveryAgreement.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [deliveryAgreement],
      marketDeck: [deliveryAcquireReplacement],
    },
    p2.id,
    deliveryAgreement.id,
  );
  assert.equal(playerById(deliveryAcquired, p2.id).vp, 0, "Acquiring Delivery Agreement should not award its conditional Reveal VP");

  const corrinthCitySpace = {
    id: "corrinth-city-test-space",
    name: "Corrinth City Test Space",
    zone: "Emperor",
    icon: "emperor",
    detail: "Verifier-only Emperor space without board pending rewards.",
  };
  const corrinthDiscardOne = { ...dagger, id: "corrinth-city-discard-one" };
  const corrinthDiscardTwo = { ...convincingArgument, id: "corrinth-city-discard-two" };
  const corrinthPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        discard: [],
        hand: [corrinthCity, corrinthDiscardOne, corrinthDiscardTwo],
        playArea: [],
        resources: { solari: 5, spice: 0, water: 0 },
        vp: 0,
      })),
    },
    {
      commanderTargets: {},
      selectedCard: corrinthCity,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.deepEqual(
    corrinthPlaced.pendingAction,
    {
      kind: "discard-cards-for-reward",
      ownerId: p2.id,
      source: "Corrinth City",
      remaining: 2,
      total: 2,
      cost: { solari: 5 },
      gain: {},
      gainVp: 1,
      optional: false,
    },
    "Corrinth City should queue a two-card discard payment after Agent placement",
  );
  const corrinthAfterFirstDiscard = state.resolveDiscardCardsForRewardChoice(
    corrinthPlaced,
    corrinthPlaced.pendingAction,
    corrinthDiscardOne.id,
  );
  assert.equal(corrinthAfterFirstDiscard.pendingAction?.kind, "discard-cards-for-reward");
  assert.equal(corrinthAfterFirstDiscard.pendingAction?.remaining, 1, "Corrinth City should require its second discard before reward");
  assert.equal(playerById(corrinthAfterFirstDiscard, p2.id).resources.solari, 5, "Corrinth City should not spend Solari before the final discard");
  assert.equal(playerById(corrinthAfterFirstDiscard, p2.id).vp, 0, "Corrinth City should not grant VP before the final discard");
  const corrinthResolved = state.resolveDiscardCardsForRewardChoice(
    corrinthAfterFirstDiscard,
    corrinthAfterFirstDiscard.pendingAction,
    corrinthDiscardTwo.id,
  );
  assert.equal(corrinthResolved.pendingAction, undefined, "Corrinth City should clear its pending action after two discards");
  assert.equal(playerById(corrinthResolved, p2.id).resources.solari, 0, "Corrinth City should spend 5 Solari after its discards");
  assert.equal(playerById(corrinthResolved, p2.id).vp, 1, "Corrinth City should grant 1 VP after its discards and Solari payment");
  assert.deepEqual(
    playerById(corrinthResolved, p2.id).discard.slice(-2).map((card) => card.id),
    [corrinthDiscardOne.id, corrinthDiscardTwo.id],
    "Corrinth City should discard both selected hand cards",
  );
  assert.match(corrinthResolved.log[0], /resolves Corrinth City: discards .* and spends 5 Solari; gains 1 VP/);

  const deliveryAgreementSpace = {
    id: "delivery-agreement-test-space",
    name: "Delivery Agreement Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only City space without board pending rewards.",
  };
  const deliveryDiscard = { ...dagger, id: "delivery-agreement-discard-card" };
  const deliveryOffer = data.standardContracts[11];
  const deliveryReplacement = data.standardContracts[12];
  assert.ok(deliveryOffer && deliveryReplacement, "Expected standard contracts for Delivery Agreement coverage");
  const deliveryPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      contractOffer: [deliveryOffer],
      contractDeck: [deliveryReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: deliveryAgreement,
      selectedSpace: deliveryAgreementSpace,
    },
  );
  assert.deepEqual(
    deliveryPlaced.pendingAction,
    {
      kind: "discard-cards-for-reward",
      ownerId: p2.id,
      source: "Delivery Agreement",
      remaining: 1,
      total: 1,
      cost: {},
      gain: {},
      gainVp: 0,
      takeContracts: { amount: 1, sourcePool: "public-offer" },
      optional: false,
    },
    "Delivery Agreement should queue a discard before the public contract choice",
  );
  const deliveryDiscarded = state.resolveDiscardCardsForRewardChoice(
    deliveryPlaced,
    deliveryPlaced.pendingAction,
    deliveryDiscard.id,
  );
  assert.deepEqual(
    deliveryDiscarded.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Delivery Agreement", publicOnly: true },
    "Delivery Agreement should queue its public CHOAM contract after the discard resolves",
  );
  assert.equal(playerById(deliveryDiscarded, p2.id).discard.at(-1)?.id, deliveryDiscard.id, "Delivery Agreement should discard the selected card");
  assert.equal(playerById(deliveryDiscarded, p2.id).vp, 0, "Delivery Agreement Agent text should not grant VP");
  const deliveryResolved = state.takeChoamContract(
    deliveryDiscarded,
    deliveryDiscarded.pendingAction,
    deliveryOffer.id,
  );
  assert.equal(deliveryResolved.pendingAction, undefined);
  assert.equal(playerById(deliveryResolved, p2.id).contracts.at(-1)?.card.id, deliveryOffer.id);
  assert.deepEqual(
    deliveryResolved.contractOffer.map((contract) => contract.id),
    [deliveryReplacement.id],
    "Delivery Agreement should refill the public contract offer after taking a contract",
  );
  const deliveryNoOfferPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: deliveryAgreement,
      selectedSpace: deliveryAgreementSpace,
    },
  );
  assert.equal(deliveryNoOfferPlaced.pendingAction, undefined, "Delivery Agreement should not ask for a discard when no face-up contracts remain");
  assert.equal(
    playerById(deliveryNoOfferPlaced, p2.id).hand.some((card) => card.id === deliveryDiscard.id),
    true,
    "Delivery Agreement should leave discard choices in hand when no face-up contracts remain",
  );

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
  const cargoRunnerTwoContracts = state.applyCardAgentEffect(
    cargoRunner,
    { ...p2, contracts: completedContracts, deck: cargoRunnerDeck, discard: [], hand: [] },
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
