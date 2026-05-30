import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);
const resourceKeys = ["solari", "spice", "water"];

function assertUnique(items, label, pick) {
  const values = items.map(pick);
  assert.equal(new Set(values).size, values.length, `${label} should be unique`);
}

function assertLocalArt(card) {
  const artPath = card.thumbnailPath ?? card.imagePath;
  assert.ok(artPath, `${card.name} is missing Intrigue art`);
  assert.ok(artPath.startsWith("/assets/"), `${card.name} Intrigue art must be local`);
  assert.ok(
    existsSync(join(projectRoot.pathname, "public", artPath)),
    `${card.name} Intrigue art does not exist at ${artPath}`,
  );
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(data.intrigueCards.length, 39, "Uprising Intrigue deck should expose 39 cards");
  assertUnique(data.intrigueCards, "Intrigue ids", (card) => card.id);
  assertUnique(data.intrigueCards, "Intrigue names", (card) => card.name);
  assertUnique(data.intrigueCards, "Intrigue source ids", (card) => card.sourceId);
  for (const card of data.intrigueCards) {
    assert.ok(card.summary, `${card.name} should include a summary`);
    assertLocalArt(card);
  }
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.battleIcon)
      .map((card) => [card.name, card.battleIcon])
      .sort(),
    [
      ["Crysknife", "crysknife"],
      ["Desert Mouse", "desertMouse"],
      ["Ornitopter", "ornithopter"],
    ],
    "Battle-icon Endgame Intrigues should expose structured icons",
  );

  const game = state.initialGame();
  assert.equal(game.intrigueDeck.length, 39, "Initial game should shuffle the full Intrigue deck");
  assert.equal(game.intrigueDiscard.length, 0, "Initial Intrigue discard should be empty");
  for (const player of game.players) {
    assert.deepEqual(Object.keys(player.resources).sort(), resourceKeys, `${player.leader} should not track Intrigue as a resource`);
    assert.equal(player.intrigues.length, 0, `${player.leader} should not start with Intrigue cards`);
  }

  const drawn = state.drawIntrigueCards(game, "p2", 2, "Test");
  const player = drawn.players.find((candidate) => candidate.id === "p2");
  assert.ok(player, "p2 should remain in the game");
  assert.equal(player.intrigues.length, 2, "Drawing should add physical Intrigue cards to the player");
  assert.equal(drawn.intrigueDeck.length, 37, "Drawing two Intrigue cards should consume the deck");
  assert.equal(drawn.intrigueDiscard.length, 0, "Drawing should not create a discard");
  assert.match(drawn.log[0], /draws 2 Intrigue cards from Test/);

  const crysknife = data.intrigueCards.find((card) => card.sourceId === 159);
  const mercenaries = data.intrigueCards.find((card) => card.sourceId === 128);
  assert.ok(crysknife, "Crysknife Intrigue should be available");
  assert.ok(mercenaries, "Mercenaries Intrigue should be available");
  const plotFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [crysknife, mercenaries] }
        : { ...candidate, intrigues: [] },
    ),
  };
  const playedPlot = state.playPlotBattleIconIntrigue(plotFixture, "p2", crysknife.id);
  assert.equal(playerById(playedPlot, "p2").vp, playerById(plotFixture, "p2").vp, "Plot battle-icon Intrigues should not score VP");
  assert.equal(playerById(playedPlot, "p2").resources.spice, playerById(plotFixture, "p2").resources.spice + 1, "Plot battle-icon Intrigues should gain 1 spice");
  assert.deepEqual(playerById(playedPlot, "p2").intrigues.map((card) => card.id), [mercenaries.id]);
  assert.equal(playedPlot.intrigueDiscard.at(-1).id, crysknife.id, "Played Plot Intrigue should go to discard");
  assert.match(playedPlot.log[0], /plays Crysknife as a Plot Intrigue for 1 spice/);

  const pendingPlot = {
    ...plotFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playPlotBattleIconIntrigue(pendingPlot, "p2", crysknife.id),
    pendingPlot,
    "Plot Intrigues should wait for pending actions to resolve",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p3", crysknife.id),
    plotFixture,
    "Only the active player should play Plot Intrigues",
  );
  assert.equal(
    state.playPlotBattleIconIntrigue(plotFixture, "p2", mercenaries.id),
    plotFixture,
    "Non-battle-icon Intrigues should not use the Plot battle-icon scorer",
  );

  for (const space of data.boardSpaces.filter((candidate) => candidate.gain?.intrigue)) {
    const source = game.players.find((candidate) => candidate.id === "p2");
    assert.ok(source, "Initial game should include p2");
    const result = state.applyBoardEffect(source, source, space);
    assert.equal(
      Object.hasOwn(result.source.resources, "intrigue"),
      false,
      `${space.name} should not write Intrigue into resource counters`,
    );
  }

  console.log("intrigue verification passed");
} finally {
  await server.close();
}
