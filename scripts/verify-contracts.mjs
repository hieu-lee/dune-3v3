import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);
const reservedNames = ["Sardaukar I", "Sardaukar II"];

function assertLocalArt(contracts, label) {
  for (const contract of contracts) {
    const artPath = contract.thumbnailPath ?? contract.imagePath;
    assert.ok(artPath, `${label}: ${contract.name} is missing an art path`);
    assert.ok(artPath.startsWith("/assets/"), `${label}: ${contract.name} art must be a local asset path`);
    assert.ok(
      existsSync(join(projectRoot.pathname, "public", artPath)),
      `${label}: ${contract.name} art does not exist at ${artPath}`,
    );
  }
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  function contractByName(name) {
    const contract = [...data.standardContracts, ...data.shaddamReservedContracts].find((candidate) => candidate.name === name);
    assert.ok(contract, `Missing CHOAM contract fixture: ${name}`);
    return contract;
  }

  function boardSpaceById(id) {
    const space = data.boardSpaces.find((candidate) => candidate.id === id);
    assert.ok(space, `Missing board-space fixture: ${id}`);
    return space;
  }

  function reserveCardByName(name) {
    const card = data.reserveMarket.find((candidate) => candidate.name === name);
    assert.ok(card, `Missing reserve card fixture: ${name}`);
    return card;
  }

  function intrigueByName(name) {
    const card = data.intrigueCards.find((candidate) => candidate.name === name);
    assert.ok(card, `Missing Intrigue fixture: ${name}`);
    return card;
  }

  function imperiumCardByName(name) {
    const card = data.imperiumDeck.find((candidate) => candidate.name === name);
    assert.ok(card, `Missing Imperium card fixture: ${name}`);
    return card;
  }

  function playerById(gameState, playerId) {
    const player = gameState.players.find((candidate) => candidate.id === playerId);
    assert.ok(player, `Missing player fixture: ${playerId}`);
    return player;
  }

  function updatePlayer(gameState, playerId, updater) {
    return {
      ...gameState,
      players: gameState.players.map((player) => player.id === playerId ? updater(player) : player),
    };
  }

  function withHeldContracts(gameState, playerId, names) {
    return updatePlayer(gameState, playerId, (player) => ({
      ...player,
      contracts: [
        ...player.contracts,
        ...names.map((name) => ({
          card: contractByName(name),
          completed: false,
          takenRound: gameState.round,
        })),
      ],
    }));
  }

  function playerContract(gameState, playerId, name) {
    const contract = playerById(gameState, playerId).contracts.find((candidate) => candidate.card.name === name);
    assert.ok(contract, `${playerId} should hold ${name}`);
    return contract;
  }

  function assertCompleted(gameState, playerId, name) {
    assert.equal(playerContract(gameState, playerId, name).completed, true, `${name} should be complete`);
  }

  assert.equal(data.standardContracts.length, 18, "Public CHOAM bank should exclude reserved Sardaukar contracts");
  assert.deepEqual(
    data.shaddamReservedContracts.map((contract) => contract.name).sort(),
    reservedNames,
  );
  assert.equal(
    data.standardContracts.some((contract) => reservedNames.includes(contract.name)),
    false,
    "Sardaukar contracts must not appear in the public CHOAM bank",
  );
  assertLocalArt(data.standardContracts, "Public CHOAM");
  assertLocalArt(data.shaddamReservedContracts, "Shaddam reserve");

  const game = state.initialGame();
  const playableContracts = [...data.standardContracts, ...data.shaddamReservedContracts];
  const automatedContracts = playableContracts
    .filter((contract) => state.contractHasAutomatedCompletion(contract))
    .map((contract) => contract.name)
    .sort();
  assert.deepEqual(
    automatedContracts,
    playableContracts.map((contract) => contract.name).sort(),
    "Every playable 6p CHOAM contract should complete automatically",
  );
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Acquire")), true);
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Harvest 3+")), true);
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Harvest 4+")), true);
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Sardaukar II")), true);
  assert.equal(game.contractOffer.length, 2, "Initial game should reveal two public CHOAM contracts");
  assert.equal(game.contractDeck.length, 16, "Initial public CHOAM deck should hold the remaining sixteen contracts");
  assert.equal(
    [...game.contractOffer, ...game.contractDeck].some((contract) => reservedNames.includes(contract.name)),
    false,
    "Initial public CHOAM cards must not include Sardaukar reserve contracts",
  );

  const shaddam = game.players.find((player) => player.leader === "Shaddam Corrino IV");
  assert.ok(shaddam, "Initial game should include Shaddam Corrino IV");
  assert.deepEqual(
    shaddam.reservedContracts.map((contract) => contract.name).sort(),
    reservedNames,
  );
  for (const player of game.players.filter((player) => player.id !== shaddam.id)) {
    assert.equal(player.reservedContracts.length, 0, `${player.leader} should not start with reserved contracts`);
  }

  const ally = game.players.find((player) => player.id === "p2");
  assert.ok(ally, "Initial game should include p2");
  const emptyPublicContracts = { ...game, contractOffer: [], contractDeck: [] };
  const shaddamFallbackPending = {
    kind: "contract",
    ownerId: shaddam.id,
    source: "Test Contract Space",
    spaceId: "accept-contract",
  };
  const shaddamFallbackState = { ...emptyPublicContracts, pendingAction: shaddamFallbackPending };
  const blockedFallback = state.collectChoamContractFallback(
    shaddamFallbackState,
    shaddamFallbackPending,
  );
  assert.equal(
    blockedFallback,
    shaddamFallbackState,
    "Shaddam must take reserved contracts before the no-public-contract fallback can resolve",
  );

  const allyFallbackPending = {
    kind: "contract",
    ownerId: ally.id,
    source: "Test Contract Space",
    spaceId: "accept-contract",
  };
  const allyFallbackState = { ...emptyPublicContracts, pendingAction: allyFallbackPending };
  const allyFallback = state.collectChoamContractFallback(
    allyFallbackState,
    allyFallbackPending,
  );
  assert.equal(
    allyFallback.players.find((player) => player.id === ally.id)?.resources.solari,
    ally.resources.solari + 2,
    "Players without reserved contracts can collect the no-public-contract fallback",
  );
  const publicOnlyBlockedFallbackPending = {
    kind: "contract",
    ownerId: ally.id,
    source: "Test Public Contract",
    publicOnly: true,
  };
  const publicOnlyBlockedFallbackState = { ...emptyPublicContracts, pendingAction: publicOnlyBlockedFallbackPending };
  const publicOnlyBlockedFallback = state.collectChoamContractFallback(
    publicOnlyBlockedFallbackState,
    publicOnlyBlockedFallbackPending,
  );
  assert.equal(
    publicOnlyBlockedFallback,
    publicOnlyBlockedFallbackState,
    "Public-only CHOAM contract choices should not fall back unless explicitly allowed",
  );
  const publicOnlyAllowedFallbackPending = {
    kind: "contract",
    ownerId: shaddam.id,
    source: "Reach Agreement",
    publicOnly: true,
    allowFallback: true,
  };
  const publicOnlyAllowedFallbackState = { ...emptyPublicContracts, pendingAction: publicOnlyAllowedFallbackPending };
  const publicOnlyAllowedFallback = state.collectChoamContractFallback(
    publicOnlyAllowedFallbackState,
    publicOnlyAllowedFallbackPending,
  );
  assert.equal(
    publicOnlyAllowedFallback.players.find((player) => player.id === shaddam.id)?.resources.solari,
    shaddam.resources.solari + 2,
    "Public-only CHOAM contract choices with fallback should ignore reserved contracts when no public contracts remain",
  );
  const forgedFallback = state.collectChoamContractFallback(
    emptyPublicContracts,
    { kind: "contract", ownerId: ally.id, source: "Forged Contract", spaceId: "accept-contract" },
  );
  assert.equal(
    forgedFallback,
    emptyPublicContracts,
    "Forged CHOAM contract fallbacks should not mutate state when there is no active contract pending action",
  );

  const publicOfferIds = game.contractOffer.map((contract) => contract.id);
  const publicDeckIds = game.contractDeck.map((contract) => contract.id);
  const sardaukar = shaddam.reservedContracts.find((contract) => contract.name === "Sardaukar I");
  assert.ok(sardaukar, "Shaddam should reserve Sardaukar I");
  const mandatoryContractPending = {
    ...game,
    pendingAction: { kind: "contract", ownerId: ally.id, source: "Test Contract Space", spaceId: "accept-contract" },
  };
  assert.equal(
    state.finishPendingAction(mandatoryContractPending),
    mandatoryContractPending,
    "Mandatory CHOAM contract choices must not be skippable through finishPendingAction",
  );

  const reservedTakePending = {
    kind: "contract",
    ownerId: shaddam.id,
    source: "Test Contract Space",
    spaceId: "accept-contract",
  };
  const reservedTakeState = { ...game, pendingAction: reservedTakePending };
  const next = state.takeChoamContract(reservedTakeState, reservedTakePending, sardaukar.id);
  const nextShaddam = next.players.find((player) => player.id === shaddam.id);
  assert.ok(nextShaddam, "Shaddam should remain in the game");
  assert.deepEqual(next.contractOffer.map((contract) => contract.id), publicOfferIds, "Reserved take should not refill public offers");
  assert.deepEqual(next.contractDeck.map((contract) => contract.id), publicDeckIds, "Reserved take should not change public deck");
  assert.deepEqual(
    nextShaddam.reservedContracts.map((contract) => contract.name),
    ["Sardaukar II"],
    "Taking Sardaukar I should leave Sardaukar II reserved",
  );
  assert.equal(nextShaddam.contracts.at(-1)?.card.name, "Sardaukar I");
  assert.equal(nextShaddam.contracts.at(-1)?.takenAtSpaceId, "accept-contract");
  const publicOnlyReservedPending = {
    kind: "contract",
    ownerId: shaddam.id,
    source: "Reach Agreement",
    publicOnly: true,
    allowFallback: true,
  };
  const publicOnlyReservedState = { ...game, pendingAction: publicOnlyReservedPending };
  const publicOnlyReservedBlocked = state.takeChoamContract(
    publicOnlyReservedState,
    publicOnlyReservedPending,
    sardaukar.id,
  );
  assert.equal(
    publicOnlyReservedBlocked,
    publicOnlyReservedState,
    "Public-only CHOAM contract choices with fallback should still reject reserved contracts",
  );
  const forgedPublicTake = state.takeChoamContract(
    game,
    { kind: "contract", ownerId: ally.id, source: "Forged Contract", publicOnly: true },
    game.contractOffer[0].id,
  );
  assert.equal(
    forgedPublicTake,
    game,
    "Forged CHOAM contract takes should not mutate state when there is no active contract pending action",
  );

  const immediate = contractByName("Immediate");
  const immediatePending = {
    ...game,
    contractOffer: [immediate, contractByName("Secrets")],
    contractDeck: [],
    pendingAction: { kind: "contract", ownerId: ally.id, source: "Immediate Test", spaceId: "accept-contract" },
  };
  const immediateTaken = state.takeChoamContract(immediatePending, immediatePending.pendingAction, immediate.id);
  const immediateOwner = playerById(immediateTaken, ally.id);
  assert.equal(
    immediateOwner.resources.solari,
    ally.resources.solari + 2,
    "Immediate should complete and pay 2 Solari as soon as it is taken",
  );
  assertCompleted(immediateTaken, ally.id, "Immediate");

  const spiceMustFlow = reserveCardByName("The Spice Must Flow");
  const prepareTheWay = reserveCardByName("Prepare The Way");
  const acquireActiveSeat = game.players.findIndex((player) => player.id === ally.id);
  const acquireHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: acquireActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
      },
      ally.id,
      (player) => ({
        ...player,
        revealed: true,
        persuasion: spiceMustFlow.cost ?? 0,
      }),
    ),
    ally.id,
    ["Acquire"],
  );
  const acquireBefore = playerById(acquireHeld, ally.id);
  const acquireCompleted = state.acquireMarketCard(acquireHeld, ally.id, spiceMustFlow.id);
  const acquireOwner = playerById(acquireCompleted, ally.id);
  assertCompleted(acquireCompleted, ally.id, "Acquire");
  assert.equal(acquireOwner.vp, acquireBefore.vp + 1, "The Spice Must Flow acquire VP should still apply");
  assert.equal(acquireOwner.resources.spice, acquireBefore.resources.spice, "The Spice Must Flow should not gain spice on acquire");
  assert.equal(acquireOwner.resources.solari, acquireBefore.resources.solari + 3, "Acquire contract should pay 3 Solari");
  assert.equal(acquireOwner.influence.spacing, acquireBefore.influence.spacing + 1, "Acquire contract should pay 1 Spacing Guild Influence");
  assert.equal(
    acquireCompleted.turnSpiceGains[ally.id] ?? 0,
    acquireHeld.turnSpiceGains?.[ally.id] ?? 0,
    "The Spice Must Flow acquisition should not be turn-spice tracked",
  );
  assert.match(acquireCompleted.log[0], /acquires The Spice Must Flow/);
  assert.match(acquireCompleted.log[1], /completes the Acquire CHOAM contract and gains 3 Solari, 1 spacing Influence/);

  const acquireAlreadyCompleted = updatePlayer(acquireCompleted, ally.id, (player) => ({
    ...player,
    persuasion: spiceMustFlow.cost ?? 0,
  }));
  const acquireBoughtAgain = state.acquireMarketCard(acquireAlreadyCompleted, ally.id, spiceMustFlow.id);
  assert.equal(
    playerById(acquireBoughtAgain, ally.id).resources.solari,
    playerById(acquireAlreadyCompleted, ally.id).resources.solari,
    "Already-completed Acquire contracts should not pay again",
  );
  assert.doesNotMatch(acquireBoughtAgain.log[0], /Acquire CHOAM contract/);

  const nonMatchingAcquire = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: acquireActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
      },
      ally.id,
      (player) => ({
        ...player,
        revealed: true,
        persuasion: prepareTheWay.cost ?? 0,
      }),
    ),
    ally.id,
    ["Acquire"],
  );
  const nonMatchingBought = state.acquireMarketCard(nonMatchingAcquire, ally.id, prepareTheWay.id);
  assert.equal(playerContract(nonMatchingBought, ally.id, "Acquire").completed, false);
  assert.equal(
    playerById(nonMatchingBought, ally.id).resources.solari,
    playerById(nonMatchingAcquire, ally.id).resources.solari,
    "Acquire should not complete for non-The Spice Must Flow acquisitions",
  );

  const pendingAcquireHeld = withHeldContracts(
    {
      ...game,
      pendingAction: {
        kind: "acquire-card",
        ownerId: ally.id,
        source: "Verifier Acquire",
        maxCost: spiceMustFlow.cost ?? 0,
        destination: "hand",
      },
      pendingQueue: [],
    },
    ally.id,
    ["Acquire"],
  );
  const pendingAcquireBefore = playerById(pendingAcquireHeld, ally.id);
  const pendingAcquireCompleted = state.acquireCardForPending(
    pendingAcquireHeld,
    pendingAcquireHeld.pendingAction,
    spiceMustFlow.id,
  );
  const pendingAcquireOwner = playerById(pendingAcquireCompleted, ally.id);
  assertCompleted(pendingAcquireCompleted, ally.id, "Acquire");
  assert.equal(pendingAcquireOwner.hand.at(-1)?.sourceId, spiceMustFlow.sourceId);
  assert.equal(pendingAcquireOwner.resources.solari, pendingAcquireBefore.resources.solari + 3);
  assert.equal(pendingAcquireOwner.influence.spacing, pendingAcquireBefore.influence.spacing + 1);

  const arrakeenContract = contractByName("Arrakeen I");
  const arrakeenTakePending = {
    ...game,
    contractOffer: [arrakeenContract],
    contractDeck: [],
    pendingAction: { kind: "contract", ownerId: ally.id, source: "Arrakeen", spaceId: "arrakeen" },
  };
  const arrakeenTaken = state.takeChoamContract(arrakeenTakePending, arrakeenTakePending.pendingAction, arrakeenContract.id);
  assert.equal(
    playerContract(arrakeenTaken, ally.id, "Arrakeen I").completed,
    false,
    "A board-space contract taken at that same space should wait for a later board-space visit",
  );
  assert.equal(playerById(arrakeenTaken, ally.id).resources.water, ally.resources.water);

  const makerAgentCard = {
    id: "verify-contract-maker-card",
    name: "Verify Contract Maker Card",
    icons: ["spice"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const makerInfluenceChoiceCard = {
    id: "verify-contract-maker-influence-choice-card",
    name: "Verify Contract Maker Influence Choice Card",
    icons: ["spice"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "gain-influence-choice", selector: "self", amount: 1 }],
    }],
  };
  const harvestActiveSeat = game.players.findIndex((player) => player.id === ally.id);
  const harvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        hand: [makerAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        resources: { ...player.resources, water: player.resources.water + 3 },
      }),
    ),
    ally.id,
    ["Harvest 3+", "Harvest 4+"],
  );
  const harvestBefore = playerById(harvestHeld, ally.id);
  const harvestCompleted = turnActions.placeAgentAction(harvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("deep-desert"),
  });
  const harvestOwner = playerById(harvestCompleted, ally.id);
  assertCompleted(harvestCompleted, ally.id, "Harvest 3+");
  assertCompleted(harvestCompleted, ally.id, "Harvest 4+");
  assert.equal(harvestOwner.resources.spice, harvestBefore.resources.spice + 4);
  assert.equal(harvestOwner.resources.solari, harvestBefore.resources.solari + 7);
  assert.equal(harvestCompleted.turnSpiceGains[ally.id], (harvestHeld.turnSpiceGains[ally.id] ?? 0) + 4);

  const lowHarvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        hand: [makerAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
      }),
    ),
    ally.id,
    ["Harvest 3+"],
  );
  const lowHarvest = turnActions.placeAgentAction(lowHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("imperial-basin"),
  });
  assert.equal(playerContract(lowHarvest, ally.id, "Harvest 3+").completed, false);

  const cumulativeHarvestHeld = state.recordTurnSpiceGain(
    withHeldContracts(
      updatePlayer(
        {
          ...game,
          activeSeat: harvestActiveSeat,
          pendingAction: undefined,
          pendingQueue: [],
          spaces: {},
        },
        ally.id,
        (player) => ({
          ...player,
          hand: [makerAgentCard],
          playArea: [],
          agentsReady: Math.max(1, player.agentsReady),
        }),
      ),
      ally.id,
      ["Harvest 3+"],
    ),
    ally.id,
    2,
  );
  const cumulativeHarvestCompleted = turnActions.placeAgentAction(cumulativeHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("imperial-basin"),
  });
  assertCompleted(cumulativeHarvestCompleted, ally.id, "Harvest 3+");

	  const priorityContracts = imperiumCardByName("Priority Contracts");
	  const desertPower = imperiumCardByName("Desert Power");
	  const cardSpiceHarvestHeld = withHeldContracts(
	    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
        contractOffer: [contractByName("Secrets")],
      },
      ally.id,
	      (player) => ({
	        ...player,
	        hand: [desertPower],
	        playArea: [],
	        agentsReady: Math.max(1, player.agentsReady),
	        resources: { ...player.resources, water: player.resources.water + 1 },
      }),
    ),
    ally.id,
    ["Harvest 4+"],
	  );
	  const cardSpiceHarvestCompleted = turnActions.placeAgentAction(cardSpiceHarvestHeld, {
	    commanderTargets: {},
	    selectedCard: desertPower,
	    selectedSpace: boardSpaceById("hagga-basin"),
	  });
  assertCompleted(cardSpiceHarvestCompleted, ally.id, "Harvest 4+");

  const marketOpportunity = intrigueByName("Market Opportunity");
  const retroactiveHarvestContract = contractByName("Harvest 4+");
  const retroactiveHarvestOffer = updatePlayer(
    {
      ...game,
      activeSeat: harvestActiveSeat,
      pendingAction: undefined,
      pendingQueue: [],
      spaces: {},
      contractOffer: [retroactiveHarvestContract],
      contractDeck: [],
    },
    ally.id,
    (player) => ({
      ...player,
      hand: [priorityContracts],
      playArea: [],
      agentsReady: Math.max(1, player.agentsReady),
      garrison: 0,
      intrigues: [marketOpportunity],
      resources: { ...player.resources, solari: player.resources.solari + 5, water: player.resources.water + 1 },
    }),
  );
  const retroactiveHarvestPending = turnActions.placeAgentAction(retroactiveHarvestOffer, {
    commanderTargets: {},
    selectedCard: priorityContracts,
    selectedSpace: boardSpaceById("hagga-basin"),
  });
  assert.equal(retroactiveHarvestPending.pendingAction?.kind, "contract");
  const retroactiveHarvestTaken = state.takeChoamContract(
    retroactiveHarvestPending,
    retroactiveHarvestPending.pendingAction,
    retroactiveHarvestContract.id,
  );
  assert.equal(
    playerContract(retroactiveHarvestTaken, ally.id, "Harvest 4+").completed,
    false,
    "Harvest contracts taken after the same-turn Maker spice trigger should wait for a later trigger",
  );
  const retroactiveHarvestAfterPlot = state.playMarketOpportunityPlotIntrigue(
    retroactiveHarvestTaken,
    ally.id,
    marketOpportunity.id,
    "solari-to-spice",
  );
  assert.equal(
    playerContract(retroactiveHarvestAfterPlot, ally.id, "Harvest 4+").completed,
    false,
    "Harvest contracts taken after the same-turn Maker trigger should not complete from later same-turn spice",
  );

  const plotSpiceHarvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        hand: [makerAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        garrison: 0,
        intrigues: [marketOpportunity],
        resources: { ...player.resources, solari: player.resources.solari + 5 },
      }),
    ),
    ally.id,
    ["Harvest 4+"],
  );
  const plotSpiceMakerPlaced = turnActions.placeAgentAction(plotSpiceHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("imperial-basin"),
  });
  assert.equal(playerContract(plotSpiceMakerPlaced, ally.id, "Harvest 4+").completed, false);
  const plotSpiceHarvestCompleted = state.playMarketOpportunityPlotIntrigue(
    plotSpiceMakerPlaced,
    ally.id,
    marketOpportunity.id,
    "solari-to-spice",
  );
  assertCompleted(plotSpiceHarvestCompleted, ally.id, "Harvest 4+");
  assert.equal(
    plotSpiceHarvestCompleted.turnSpiceGains[ally.id],
    (plotSpiceHarvestHeld.turnSpiceGains[ally.id] ?? 0) + 6,
    "Harvest should count Maker spice plus later same-Agent-turn Plot spice once",
  );

  const margotHarvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        leader: "Lady Margot Fenring",
        leaderCard: data.leaderCardByName("Lady Margot Fenring"),
        influence: { ...player.influence, bene: 1 },
        hand: [makerInfluenceChoiceCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        garrison: 0,
        resources: { ...player.resources, water: player.resources.water + 1 },
      }),
    ),
    ally.id,
    ["Harvest 4+"],
  );
  const margotBefore = playerById(margotHarvestHeld, ally.id);
  const margotHarvestPending = turnActions.placeAgentAction(margotHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerInfluenceChoiceCard,
    selectedSpace: boardSpaceById("hagga-basin"),
  });
  assert.equal(margotHarvestPending.pendingAction?.kind, "board-influence-choice");
  assert.equal(playerContract(margotHarvestPending, ally.id, "Harvest 4+").completed, false);
  assert.equal(margotHarvestPending.turnSpiceGains[ally.id], (margotHarvestHeld.turnSpiceGains[ally.id] ?? 0) + 2);
  const margotHarvestCompleted = state.resolveBoardInfluenceChoice(
    margotHarvestPending,
    margotHarvestPending.pendingAction,
    ally.id,
    "bene",
  );
  assertCompleted(margotHarvestCompleted, ally.id, "Harvest 4+");
  assert.equal(playerById(margotHarvestCompleted, ally.id).resources.spice, margotBefore.resources.spice + 4);
  assert.equal(playerById(margotHarvestCompleted, ally.id).resources.solari, margotBefore.resources.solari + 4);
  assert.equal(margotHarvestCompleted.turnSpiceGains[ally.id], (margotHarvestHeld.turnSpiceGains[ally.id] ?? 0) + 4);

  const margotPaymentHarvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: harvestActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        leader: "Lady Margot Fenring",
        leaderCard: data.leaderCardByName("Lady Margot Fenring"),
        influence: { ...player.influence, bene: 1 },
        hand: [makerAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        garrison: 0,
        resources: { ...player.resources, solari: player.resources.solari + 1, water: player.resources.water + 1 },
      }),
    ),
    ally.id,
    ["Harvest 4+"],
  );
  const margotPaymentBefore = playerById(margotPaymentHarvestHeld, ally.id);
  const margotPaymentMakerPlaced = turnActions.placeAgentAction(margotPaymentHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("hagga-basin"),
  });
  assert.equal(playerContract(margotPaymentMakerPlaced, ally.id, "Harvest 4+").completed, false);
  assert.equal(margotPaymentMakerPlaced.turnSpiceGains[ally.id], (margotPaymentHarvestHeld.turnSpiceGains[ally.id] ?? 0) + 2);
  const margotPaymentPending = {
    kind: "pay-resource-for-influence",
    ownerId: ally.id,
    influenceOwnerId: ally.id,
    resource: "solari",
    cost: 1,
    faction: "bene",
    amount: 1,
    optional: true,
    source: "Verifier Influence Payment",
  };
  const margotPaymentHarvestCompleted = state.resolvePayResourceForInfluenceChoice(
    { ...margotPaymentMakerPlaced, pendingAction: margotPaymentPending, pendingQueue: [] },
    margotPaymentPending,
  );
  assertCompleted(margotPaymentHarvestCompleted, ally.id, "Harvest 4+");
  assert.equal(playerById(margotPaymentHarvestCompleted, ally.id).resources.spice, margotPaymentBefore.resources.spice + 4);
  assert.equal(playerById(margotPaymentHarvestCompleted, ally.id).resources.solari, margotPaymentBefore.resources.solari + 3);
  assert.equal(margotPaymentHarvestCompleted.turnSpiceGains[ally.id], (margotPaymentHarvestHeld.turnSpiceGains[ally.id] ?? 0) + 4);

  const trackedSpiceOnly = state.recordTurnSpiceGain(
    withHeldContracts(game, ally.id, ["Harvest 3+"]),
    ally.id,
    3,
  );
  assert.equal(
    playerContract(trackedSpiceOnly, ally.id, "Harvest 3+").completed,
    false,
    "Harvest contracts should require a Maker-space Agent visit, not only a tracked spice gain",
  );

  const makerHookAlly = playerById(game, "p3");
  const makerHookActiveSeat = game.players.findIndex((player) => player.id === makerHookAlly.id);
  const deferredHarvestHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: makerHookActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
        shieldWall: false,
      },
      makerHookAlly.id,
      (player) => ({
        ...player,
        hand: [makerAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        makerHooks: true,
        resources: { ...player.resources, water: player.resources.water + 3 },
      }),
    ),
    makerHookAlly.id,
    ["Harvest 3+", "Harvest 4+"],
  );
  const deferredHarvestPending = turnActions.placeAgentAction(deferredHarvestHeld, {
    commanderTargets: {},
    selectedCard: makerAgentCard,
    selectedSpace: boardSpaceById("deep-desert"),
  });
  assert.equal(deferredHarvestPending.pendingAction?.kind, "maker-choice");
  assert.equal(playerContract(deferredHarvestPending, makerHookAlly.id, "Harvest 3+").completed, false);
  const deferredHarvestCompleted = state.resolveMakerChoice(
    deferredHarvestPending,
    deferredHarvestPending.pendingAction,
    "spice",
  );
  assertCompleted(deferredHarvestCompleted, makerHookAlly.id, "Harvest 3+");
  assertCompleted(deferredHarvestCompleted, makerHookAlly.id, "Harvest 4+");

  const arrakeenHeld = withHeldContracts(game, ally.id, ["Arrakeen I", "Arrakeen II"]);
  const arrakeenCompleted = state.completeChoamContractsForBoardSpace(arrakeenHeld, ally.id, "arrakeen");
  const arrakeenOwner = playerById(arrakeenCompleted.state, ally.id);
  assert.deepEqual(
    arrakeenCompleted.completedContractIds.sort(),
    [contractByName("Arrakeen I").id, contractByName("Arrakeen II").id].sort(),
    "A single board-space visit should complete every matching incomplete contract",
  );
  assert.equal(arrakeenCompleted.recruitedTroops, 1);
  assert.equal(arrakeenOwner.resources.water, ally.resources.water + 1);
  assert.equal(arrakeenOwner.resources.solari, ally.resources.solari);
  assert.equal(arrakeenOwner.garrison, ally.garrison + 1);
  assert.deepEqual(
    arrakeenCompleted.state.pendingAction,
    {
      kind: "spy",
      ownerId: ally.id,
      remaining: 1,
      source: "Arrakeen II",
      recallForSupply: true,
      mustPlaceSpy: true,
    },
    "Arrakeen II should queue its printed spy placement reward",
  );
  assertCompleted(arrakeenCompleted.state, ally.id, "Arrakeen I");
  assertCompleted(arrakeenCompleted.state, ally.id, "Arrakeen II");

  const espionageHeld = withHeldContracts(game, ally.id, ["Espionage II"]);
  const espionageCompleted = state.completeChoamContractsForBoardSpace(espionageHeld, ally.id, "espionage");
  const espionageOwner = playerById(espionageCompleted.state, ally.id);
  assert.equal(espionageOwner.resources.solari, ally.resources.solari + 1);
  assert.equal(espionageOwner.intrigues.length, ally.intrigues.length + 1);
  assertCompleted(espionageCompleted.state, ally.id, "Espionage II");
  const espionageCompletionLogIndex = espionageCompleted.state.log.findIndex((entry) =>
    /completes the Espionage II CHOAM contract/.test(entry)
  );
  const espionageDrawLogIndex = espionageCompleted.state.log.findIndex((entry) =>
    /draws an Intrigue card from Espionage II/.test(entry)
  );
  assert.ok(espionageCompletionLogIndex >= 0, "Espionage II completion log should be present");
  assert.ok(espionageDrawLogIndex > espionageCompletionLogIndex, "Espionage II draw log should follow completion");

  const highCouncilHeld = withHeldContracts(
    updatePlayer(game, ally.id, (player) => ({
      ...player,
      influence: { ...player.influence, bene: 1 },
    })),
    ally.id,
    ["High Council I"],
  );
  const highCouncilCompleted = state.completeChoamContractsForBoardSpace(highCouncilHeld, ally.id, "high-council");
  const highCouncilOwner = playerById(highCouncilCompleted.state, ally.id);
  assert.equal(highCouncilOwner.influence.bene, 2);
  assert.equal(highCouncilOwner.vp, playerById(highCouncilHeld, ally.id).vp + 1);
  assertCompleted(highCouncilCompleted.state, ally.id, "High Council I");

  const highCouncilThresholdIntrigue = intrigueByName("Cunning");
  const highCouncilThresholdHeld = withHeldContracts(
    updatePlayer({
      ...game,
      intrigueDeck: [highCouncilThresholdIntrigue],
      intrigueDiscard: [],
      log: ["Previous action log."],
    }, ally.id, (player) => ({
      ...player,
      influence: { ...player.influence, bene: 3 },
    })),
    ally.id,
    ["High Council I"],
  );
  const highCouncilThresholdCompleted = state.completeChoamContractsForBoardSpace(
    highCouncilThresholdHeld,
    ally.id,
    "high-council",
  );
  const highCouncilThresholdOwner = playerById(highCouncilThresholdCompleted.state, ally.id);
  assert.equal(highCouncilThresholdOwner.influence.bene, 4);
  assert.equal(
    highCouncilThresholdOwner.intrigues.some((card) => card.id === highCouncilThresholdIntrigue.id),
    true,
    "High Council contract Bene-4 threshold reward should draw an Intrigue",
  );
  const highCouncilCompletionLogIndex = highCouncilThresholdCompleted.state.log.findIndex((entry) =>
    /completes the High Council I CHOAM contract/.test(entry)
  );
  const highCouncilThresholdLogIndex = highCouncilThresholdCompleted.state.log.findIndex((entry) =>
    /draws an Intrigue card from 4 Bene Gesserit Influence/.test(entry)
  );
  const previousActionLogIndex = highCouncilThresholdCompleted.state.log.indexOf("Previous action log.");
  assert.ok(highCouncilCompletionLogIndex >= 0, "High Council completion log should be present");
  assert.ok(highCouncilThresholdLogIndex >= 0, "High Council Bene-4 reward log should be present");
  assert.ok(
    highCouncilThresholdLogIndex > highCouncilCompletionLogIndex,
    "High Council Bene-4 reward log should follow the contract completion log",
  );
  assert.ok(
    previousActionLogIndex < 0 || previousActionLogIndex > highCouncilThresholdLogIndex,
    "High Council Bene-4 reward log should not be separated from completion by an older action log",
  );

  const highCouncilPlacementCard = {
    id: "verify-contract-high-council-card",
    name: "Verify Contract High Council Card",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const highCouncilPlacementIntrigue = data.intrigueCards[0];
  const highCouncilPlacementBackupIntrigue = data.intrigueCards[1];
  assert.ok(highCouncilPlacementIntrigue, "High Council placement regression needs an Intrigue fixture");
  assert.ok(highCouncilPlacementBackupIntrigue, "High Council placement regression needs a backup Intrigue fixture");
  const highCouncilPlacementActiveSeat = game.players.findIndex((player) => player.id === ally.id);
  const highCouncilPlacementHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: highCouncilPlacementActiveSeat,
        intrigueDeck: [highCouncilPlacementIntrigue, highCouncilPlacementBackupIntrigue],
        intrigueDiscard: [],
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      ally.id,
      (player) => ({
        ...player,
        hand: [highCouncilPlacementCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        influence: { ...player.influence, bene: 3 },
        resources: { ...player.resources, solari: Math.max(player.resources.solari, 5) },
      }),
    ),
    ally.id,
    ["High Council I"],
  );
  const highCouncilPlacementCompleted = turnActions.placeAgentAction(highCouncilPlacementHeld, {
    commanderTargets: {},
    selectedCard: highCouncilPlacementCard,
    selectedSpace: boardSpaceById("high-council"),
  });
  const highCouncilPlacementOwner = playerById(highCouncilPlacementCompleted, ally.id);
  assertCompleted(highCouncilPlacementCompleted, ally.id, "High Council I");
  assert.equal(highCouncilPlacementOwner.influence.bene, 4);
  assert.equal(
    highCouncilPlacementOwner.intrigues.filter((card) =>
      card.id === highCouncilPlacementIntrigue.id || card.id === highCouncilPlacementBackupIntrigue.id
    ).length,
    1,
    "High Council I placement should draw exactly one Bene-4 threshold Intrigue",
  );
  assert.equal(
    highCouncilPlacementCompleted.log.filter((entry) =>
      /draws an Intrigue card from 4 Bene Gesserit Influence/.test(entry)
    ).length,
    1,
    "High Council I placement should log the Bene-4 threshold reward exactly once",
  );

  const sardaukarHeld = withHeldContracts(game, shaddam.id, ["Sardaukar I"]);
  const sardaukarCompleted = state.completeChoamContractsForBoardSpace(sardaukarHeld, shaddam.id, "sardaukar");
  assert.equal(playerById(sardaukarCompleted.state, shaddam.id).hand.length, shaddam.hand.length + 2);
  assertCompleted(sardaukarCompleted.state, shaddam.id, "Sardaukar I");

  const sardaukarAgentCard = {
    id: "verify-contract-sardaukar-card",
    name: "Verify Contract Sardaukar Card",
    icons: ["emperor"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const shaddamActiveSeat = game.players.findIndex((player) => player.id === shaddam.id);
  const sardaukarRecallHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: shaddamActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      shaddam.id,
      (player) => ({
        ...player,
        hand: [sardaukarAgentCard],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        reservedContracts: [],
        resources: { ...player.resources, spice: player.resources.spice + 3 },
      }),
    ),
    shaddam.id,
    ["Sardaukar II"],
  );
  const sardaukarRecallBefore = playerById(sardaukarRecallHeld, shaddam.id);
  const sardaukarRecallCompleted = turnActions.placeAgentAction(sardaukarRecallHeld, {
    commanderTargets: {},
    selectedCard: sardaukarAgentCard,
    selectedSpace: boardSpaceById("sardaukar"),
  });
  const sardaukarRecallOwner = playerById(sardaukarRecallCompleted, shaddam.id);
  assertCompleted(sardaukarRecallCompleted, shaddam.id, "Sardaukar II");
  assert.equal(
    sardaukarRecallOwner.agentsReady,
    sardaukarRecallBefore.agentsReady,
    "Sardaukar II should recall the just-sent Agent back to ready supply",
  );
  assert.equal(
    sardaukarRecallCompleted.spaces.sardaukar,
    undefined,
    "Sardaukar II should leave the Sardaukar space unoccupied after recalling the Agent",
  );
  assert.ok(
    sardaukarRecallCompleted.log.some((entry) =>
      /completes the Sardaukar II CHOAM contract and recalls the Agent/.test(entry)
    ),
    "Sardaukar II completion should log its Agent recall reward",
  );
  const overthrow = imperiumCardByName("Overthrow");
  const sardaukarOverthrowHeld = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: shaddamActiveSeat,
        pendingAction: undefined,
        pendingQueue: [],
        spaces: {},
      },
      shaddam.id,
      (player) => ({
        ...player,
        hand: [overthrow],
        playArea: [],
        agentsReady: Math.max(1, player.agentsReady),
        reservedContracts: [],
        resources: { ...player.resources, spice: player.resources.spice + 3 },
      }),
    ),
    shaddam.id,
    ["Sardaukar II"],
  );
  const sardaukarOverthrowPlaced = turnActions.placeAgentAction(sardaukarOverthrowHeld, {
    commanderTargets: {},
    selectedCard: overthrow,
    selectedSpace: boardSpaceById("sardaukar"),
  });
  assertCompleted(sardaukarOverthrowPlaced, shaddam.id, "Sardaukar II");
  assert.equal(sardaukarOverthrowPlaced.spaces.sardaukar, undefined);
  assert.equal(
    sardaukarOverthrowPlaced.agentPlacementOwners?.sardaukar,
    undefined,
    "Sardaukar II contract recall should clear the recalled Agent owner",
  );
  assert.equal(
    playerById(sardaukarOverthrowPlaced, shaddam.id).playArea.find((card) => card.id === overthrow.id)?.agentPlacementSpaceId,
    "sardaukar",
    "Sardaukar II contract recall should preserve source-card placement metadata for pending validation",
  );
  assert.equal(sardaukarOverthrowPlaced.pendingAction?.kind, "board-influence-choice");
  assert.equal(sardaukarOverthrowPlaced.pendingAction.source, "Overthrow");
  const [sardaukarOverthrowChoice] = sardaukarOverthrowPlaced.pendingAction.choices;
  assert.ok(sardaukarOverthrowChoice, "Overthrow on Sardaukar should expose a pending Influence choice");
  const sardaukarOverthrowResolved = state.resolveBoardInfluenceChoice(
    sardaukarOverthrowPlaced,
    sardaukarOverthrowPlaced.pendingAction,
    sardaukarOverthrowChoice.ownerId,
    sardaukarOverthrowChoice.faction,
  );
  assert.notEqual(
    sardaukarOverthrowResolved,
    sardaukarOverthrowPlaced,
    "Sardaukar II contract recall should leave Overthrow's pending Influence choice resolvable",
  );
  assert.equal(sardaukarOverthrowResolved.pendingAction, undefined);

  const agentCard = {
    id: "verify-contract-city-card",
    name: "Verify Contract City Card",
    icons: ["city"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const activeAllySeat = game.players.findIndex((player) => player.id === ally.id);
  const researchStationReady = withHeldContracts(
    updatePlayer(
      {
        ...game,
        activeSeat: activeAllySeat,
      },
      ally.id,
      (player) => ({
        ...player,
        hand: [agentCard],
        resources: { ...player.resources, water: player.resources.water + 2 },
      }),
    ),
    ally.id,
    ["Research Station I"],
  );
  const researchBefore = playerById(researchStationReady, ally.id);
  const researchPlaced = turnActions.placeAgentAction(researchStationReady, {
    commanderTargets: {},
    selectedCard: agentCard,
    selectedSpace: boardSpaceById("research-station"),
  });
  const researchAfter = playerById(researchPlaced, ally.id);
  assertCompleted(researchPlaced, ally.id, "Research Station I");
  assert.equal(researchAfter.resources.solari, researchBefore.resources.solari + 2);
  assert.equal(
    researchAfter.garrison,
    researchBefore.garrison + 2,
    "Research Station I should not recruit a troop beyond Research Station's printed troop reward",
  );
  assert.deepEqual(
    researchPlaced.pendingAction,
    {
      kind: "spy",
      ownerId: ally.id,
      remaining: 1,
      source: "Research Station I",
      recallForSupply: true,
      mustPlaceSpy: true,
    },
    "Research Station I should queue its printed spy placement reward before deployment",
  );
  const researchDeployPending = [researchPlaced.pendingAction, ...researchPlaced.pendingQueue]
    .find((pending) => pending?.kind === "deploy");
  assert.ok(researchDeployPending, "Research Station contract completion should queue a deployment");
  assert.equal(
    researchDeployPending.remaining,
    Math.min(researchAfter.garrison, 4),
    "Research Station's board-space troops should remain deployable after the contract spy placement",
  );

  const illegalReservedPending = {
    kind: "contract",
    ownerId: ally.id,
    source: "Test Contract Space",
    spaceId: "accept-contract",
  };
  const illegalReservedState = { ...game, pendingAction: illegalReservedPending };
  const illegal = state.takeChoamContract(illegalReservedState, illegalReservedPending, sardaukar.id);
  assert.equal(illegal, illegalReservedState, "Non-Shaddam players must not be able to take reserved Sardaukar contracts");

  console.log("contract verification passed");
} finally {
  await server.close();
}
