import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function countNames(cards) {
  return cards.reduce((counts, card) => {
    counts[card.name] = (counts[card.name] ?? 0) + 1;
    return counts;
  }, {});
}

try {
  const setup = await server.ssrLoadModule("/src/game/player-setup.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(
    state.leaderStarterDeckCards,
    setup.leaderStarterDeckCards,
    "state.ts should preserve the public leaderStarterDeckCards export",
  );

  const firstInfluence = setup.emptyInfluence();
  const secondInfluence = setup.emptyInfluence();
  firstInfluence.bene = 1;
  assert.equal(secondInfluence.bene, 0, "Each player should receive an independent Influence record");

  const stabanStarter = setup.leaderStarterDeckCards("Staban Tuek", "muaddib", "Ally");
  assert.equal(stabanStarter.length, 9, "Staban's Ally starter deck should remove Diplomacy");
  assert.equal(stabanStarter.some((card) => card.name === "Diplomacy"), false);

  const standardAllyStarter = setup.leaderStarterDeckCards("Gurney Halleck", "muaddib", "Ally");
  assert.equal(standardAllyStarter.length, 10);
  assert.equal(standardAllyStarter.filter((card) => card.name === "Diplomacy").length, 1);

  const shaddam = setup.makePlayer("p4", "Seat 4", "Shaddam Corrino IV", "shaddam", "Commander", "#efb447");
  assert.equal(shaddam.vp, 4);
  assert.equal(shaddam.garrison, 0);
  assert.equal(shaddam.hand.length, 5);
  assert.equal(shaddam.deck.length, 5);
  assert.equal(shaddam.reservedContracts.length, 2, "Shaddam Commander should start with reserved contracts");
  assert.deepEqual(shaddam.resources, { solari: 2, spice: 0, water: 1 });
  assert.deepEqual(shaddam.influence, setup.emptyInfluence());

  const staban = setup.makePlayer("p7", "Seat 7", "Staban Tuek", "muaddib", "Ally", "#5cb85c");
  assert.equal(staban.vp, 1);
  assert.equal(staban.garrison, 3);
  assert.equal(staban.hand.length, 5);
  assert.equal(staban.deck.length, 4);
  assert.equal(staban.reservedContracts.length, 0);
  assert.equal(countNames([...staban.hand, ...staban.deck]).Diplomacy ?? 0, 0);

  console.log("player setup verification passed");
} finally {
  await server.close();
}
