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
  const automatedContracts = [...data.standardContracts, ...data.shaddamReservedContracts]
    .filter((contract) => state.contractHasAutomatedCompletion(contract))
    .map((contract) => contract.name)
    .sort();
  assert.deepEqual(
    automatedContracts,
    [
      "Arrakeen I",
      "Arrakeen II",
      "Deliver Supplies",
      "Espionage I",
      "Espionage II",
      "Heighliner I",
      "Heighliner II",
      "High Council I",
      "High Council II",
      "Immediate",
      "Research Station I",
      "Research Station II",
      "Sardaukar I",
      "Secrets",
      "Spice Refinery I",
      "Spice Refinery II",
    ].sort(),
    "Only fully modeled CHOAM contracts should leave the manual fallback path",
  );
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Acquire")), false);
  assert.equal(state.contractHasAutomatedCompletion(contractByName("Harvest 3+")), false);
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
  const blockedFallback = state.collectChoamContractFallback(
    emptyPublicContracts,
    { kind: "contract", ownerId: shaddam.id, source: "Test Contract Space", spaceId: "accept-contract" },
  );
  assert.equal(
    blockedFallback,
    emptyPublicContracts,
    "Shaddam must take reserved contracts before the no-public-contract fallback can resolve",
  );

  const allyFallback = state.collectChoamContractFallback(
    emptyPublicContracts,
    { kind: "contract", ownerId: ally.id, source: "Test Contract Space", spaceId: "accept-contract" },
  );
  assert.equal(
    allyFallback.players.find((player) => player.id === ally.id)?.resources.solari,
    ally.resources.solari + 2,
    "Players without reserved contracts can collect the no-public-contract fallback",
  );
  const publicOnlyBlockedFallback = state.collectChoamContractFallback(
    emptyPublicContracts,
    { kind: "contract", ownerId: ally.id, source: "Test Public Contract", publicOnly: true },
  );
  assert.equal(
    publicOnlyBlockedFallback,
    emptyPublicContracts,
    "Public-only CHOAM contract choices should not fall back unless explicitly allowed",
  );
  const publicOnlyAllowedFallback = state.collectChoamContractFallback(
    emptyPublicContracts,
    { kind: "contract", ownerId: shaddam.id, source: "Reach Agreement", publicOnly: true, allowFallback: true },
  );
  assert.equal(
    publicOnlyAllowedFallback.players.find((player) => player.id === shaddam.id)?.resources.solari,
    shaddam.resources.solari + 2,
    "Public-only CHOAM contract choices with fallback should ignore reserved contracts when no public contracts remain",
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

  const next = state.takeChoamContract(
    game,
    { kind: "contract", ownerId: shaddam.id, source: "Test Contract Space", spaceId: "accept-contract" },
    sardaukar.id,
  );
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
  const publicOnlyReservedBlocked = state.takeChoamContract(
    game,
    { kind: "contract", ownerId: shaddam.id, source: "Reach Agreement", publicOnly: true, allowFallback: true },
    sardaukar.id,
  );
  assert.equal(
    publicOnlyReservedBlocked,
    game,
    "Public-only CHOAM contract choices with fallback should still reject reserved contracts",
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
  assert.equal(arrakeenOwner.resources.solari, ally.resources.solari + 1);
  assert.equal(arrakeenOwner.garrison, ally.garrison + 1);
  assertCompleted(arrakeenCompleted.state, ally.id, "Arrakeen I");
  assertCompleted(arrakeenCompleted.state, ally.id, "Arrakeen II");

  const espionageHeld = withHeldContracts(game, ally.id, ["Espionage II"]);
  const espionageCompleted = state.completeChoamContractsForBoardSpace(espionageHeld, ally.id, "espionage");
  const espionageOwner = playerById(espionageCompleted.state, ally.id);
  assert.equal(espionageOwner.resources.solari, ally.resources.solari + 1);
  assert.equal(espionageOwner.intrigues.length, ally.intrigues.length + 1);
  assertCompleted(espionageCompleted.state, ally.id, "Espionage II");

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

  const sardaukarHeld = withHeldContracts(game, shaddam.id, ["Sardaukar I"]);
  const sardaukarCompleted = state.completeChoamContractsForBoardSpace(sardaukarHeld, shaddam.id, "sardaukar");
  assert.equal(playerById(sardaukarCompleted.state, shaddam.id).hand.length, shaddam.hand.length + 2);
  assertCompleted(sardaukarCompleted.state, shaddam.id, "Sardaukar I");

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
  assert.equal(
    researchAfter.garrison,
    researchBefore.garrison + 3,
    "Research Station plus Research Station I should recruit all troops before deployment is queued",
  );
  const researchDeployPending = [researchPlaced.pendingAction, ...researchPlaced.pendingQueue]
    .find((pending) => pending?.kind === "deploy");
  assert.ok(researchDeployPending, "Research Station contract completion should queue a deployment");
  assert.equal(
    researchDeployPending.remaining,
    Math.min(researchAfter.garrison, 5),
    "Contract-recruited troops should be deployable during the same combat-space Agent turn",
  );

  const completed = state.setChoamContractCompleted(next, shaddam.id, sardaukar.id, true);
  assert.equal(
    completed.players.find((player) => player.id === shaddam.id)?.contracts.at(-1)?.completed,
    true,
    "Contract completion should be tracked on the player contract",
  );
  assert.match(completed.log[0], /completes the Sardaukar I CHOAM contract/);
  assert.equal(
    state.setChoamContractCompleted(completed, shaddam.id, sardaukar.id, true),
    completed,
    "Completing an already complete contract should be a no-op",
  );

  const reopened = state.setChoamContractCompleted(completed, shaddam.id, sardaukar.id, false);
  assert.equal(
    reopened.players.find((player) => player.id === shaddam.id)?.contracts.at(-1)?.completed,
    false,
    "Contract completion should be reversible for table corrections",
  );

  const illegal = state.takeChoamContract(
    game,
    { kind: "contract", ownerId: ally.id, source: "Test Contract Space", spaceId: "accept-contract" },
    sardaukar.id,
  );
  assert.equal(illegal, game, "Non-Shaddam players must not be able to take reserved Sardaukar contracts");

  console.log("contract verification passed");
} finally {
  await server.close();
}
