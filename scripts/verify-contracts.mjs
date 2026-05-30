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
  assertLocalArt(data.shaddamReservedContracts, "Shaddam reserve");

  const game = state.initialGame();
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

  const publicOfferIds = game.contractOffer.map((contract) => contract.id);
  const publicDeckIds = game.contractDeck.map((contract) => contract.id);
  const sardaukar = shaddam.reservedContracts.find((contract) => contract.name === "Sardaukar I");
  assert.ok(sardaukar, "Shaddam should reserve Sardaukar I");

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
