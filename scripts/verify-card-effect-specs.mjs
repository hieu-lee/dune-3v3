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

function hasRevealEffect(card, predicate) {
  return card.effects?.some((spec) => spec.trigger === "reveal" && spec.effects.some(predicate)) ?? false;
}

function expectedFixedReveal(card) {
  return {
    persuasion: card.persuasion,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
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
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = state.initialGame();
  const p2 = playerById(game, "p2");
  const p3 = playerById(game, "p3");
  const p4 = playerById(game, "p4");
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
  const allySignet = data.allyStarterCards.find((card) => card.name === "Signet Ring");
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  const covertOperation = data.imperiumDeck.find((card) => card.name === "Covert Operation");
  const doubleAgent = data.imperiumDeck.find((card) => card.name === "Double Agent");
  const fedaykinStilltent = data.imperiumDeck.find((card) => card.name === "Fedaykin Stilltent");
  const hiddenMissive = data.imperiumDeck.find((card) => card.name === "Hidden Missive");
  const ecologicalTestingStation = data.imperiumDeck.find((card) => card.name === "Ecological Testing Station");
  const cargoRunner = data.imperiumDeck.find((card) => card.name === "Cargo Runner");
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  const makerKeeper = data.imperiumDeck.find((card) => card.name === "Maker Keeper");
  const maulaPistol = data.imperiumDeck.find((card) => card.name === "Maula Pistol");
  const northernWatermaster = data.imperiumDeck.find((card) => card.name === "Northern Watermaster");
  const paracompass = data.imperiumDeck.find((card) => card.name === "Paracompass");
  const reliableInformant = data.imperiumDeck.find((card) => card.name === "Reliable Informant");
  const spaceTimeFolding = data.imperiumDeck.find((card) => card.name === "Space-time Folding");
  const guildEnvoy = data.imperiumDeck.find((card) => card.name === "Guild Envoy");
  const wheelsWithinWheels = data.imperiumDeck.find((card) => card.name === "Wheels Within Wheels");
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  const spiceMustFlow = data.reserveMarket.find((card) => card.sourceId === 538);
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
  const sietchTabr = data.boardSpaces.find((space) => space.id === "sietch-tabr");
  const spiceRefinery = data.boardSpaces.find((space) => space.id === "spice-refinery");
  assert.ok(
    convincingArgument &&
    dagger &&
    allySignet &&
    smuggler &&
    interstellarTrade &&
    calculus &&
    capturedMentat &&
    beneGesseritOperative &&
    covertOperation &&
    doubleAgent &&
    fedaykinStilltent &&
    hiddenMissive &&
    ecologicalTestingStation &&
    cargoRunner &&
    chani &&
    makerKeeper &&
    maulaPistol &&
    northernWatermaster &&
    paracompass &&
    reliableInformant &&
    spaceTimeFolding &&
    guildEnvoy &&
    wheelsWithinWheels,
  );
  assert.ok(commandRespect && prepareTheWay && spiceMustFlow && limitedLandsraadAccess && demandAttention && desertCall && threatenSpiceProduction && muadDibSignet && usul && corrinoMight && criticalShipments && demandResults && devastatingAssault && imperialTent && emperorSignet && imperialOrnithopter);
  assert.ok(arrakeen && acceptContract && haggaBasin && imperialBasin && secrets && highCouncil && dutifulService && deliverSupplies && sietchTabr && spiceRefinery);
  assert.equal(revealSpecCards.length, 79, "Unexpected number of cards with declarative Reveal specs");
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
      "Corrinth City",
      "Delivery Agreement",
      "Priority Contracts",
      "The Spice Must Flow",
    ],
    "Only zero-reveal reserve/Imperium cards should lack declarative Reveal specs",
  );
  assert.deepEqual(
    marketAndImperiumCards.filter(hasAcquireSpec).map((card) => card.name).sort(),
    ["The Spice Must Flow"],
    "Only The Spice Must Flow should currently carry a declarative Acquire spec",
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
  assert.deepEqual(
    marketAndImperiumCards.filter(hasAgentPlaySpec).map((card) => card.name).sort(),
    [
      "Bene Gesserit Operative",
      "Captured Mentat",
      "Cargo Runner",
      "Chani, Clever Tactician",
      "Covert Operation",
      "Double Agent",
      "Ecological Testing Station",
      "Fedaykin Stilltent",
      "Guild Envoy",
      "Hidden Missive",
      "Maker Keeper",
      "Maula Pistol",
      "Northern Watermaster",
      "Paracompass",
      "Prepare The Way",
      "Reliable Informant",
      "Space-time Folding",
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
      spaceTimeFolding,
      guildEnvoy,
      wheelsWithinWheels,
	    beneGesseritOperative,
	    chani,
	  ]) {
    assert.ok(
      card.effects?.some((spec) => spec.trigger === "reveal"),
      `${card.name} should carry a declarative Reveal effect spec`,
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
    { persuasion: 0, printedRevealCards: [], revealGain: {}, swords: 0 },
    "Reveal spy placement specs should not alter fixed reveal totals",
  );
  const agentTrashCard = {
    ...convincingArgument,
    id: "effect-spec-agent-trash-card",
    name: "Effect Spec Agent Trash Card",
    effects: [agentSpec([{ kind: "trash-card", selector: "self", optional: true }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentTrashCard, p2, p2),
    /Unsupported effect "trash-card" for agent-play/,
    "Trash-card specs should fail outside Reveal until an Agent pending-action resolver supports them",
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
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPayResourceSandwormsCard], highCouncilSeat: false }),
    /Unsupported effect "pay-resource-for-sandworms" for reveal/,
    "Resource-for-sandworms specs should stay in Agent play",
  );
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
  assert.equal(noMakerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not gain spice without a Maker visit");
  const makerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smuggler], highCouncilSeat: false },
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
  );
  assert.equal(makerReveal.revealGain.spice, 1, "Smuggler's Harvester should gain spice after a Maker visit");

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
