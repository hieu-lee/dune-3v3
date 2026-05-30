import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const expectedMakerIds = ["deep-desert", "habbanya-erg", "hagga-basin", "imperial-basin"];
  assert.deepEqual([...state.makerSpaceIds].sort(), expectedMakerIds);

  const makerSpaces = data.boardSpaces.filter((space) => space.maker);
  assert.deepEqual(
    makerSpaces.map((space) => space.id).sort(),
    expectedMakerIds,
    "Six-player board should mark the four Maker spaces",
  );

  const game = state.initialGame();
  assert.deepEqual(
    Object.fromEntries(Object.entries(game.makerSpice).sort()),
    Object.fromEntries(expectedMakerIds.map((spaceId) => [spaceId, 0]).sort()),
    "Maker spaces should start with no bonus spice",
  );

  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(imperialBasin, "Imperial Basin should be present");
  assert.ok(highCouncil, "High Council should be present");

  const roundFixture = {
    ...game,
    spaces: { "imperial-basin": "p1" },
    makerSpice: { ...game.makerSpice, "hagga-basin": 2 },
    pendingAction: undefined,
    pendingQueue: [],
  };
  const nextRound = state.startNextRound(roundFixture);
  assert.equal(nextRound.makerSpice["imperial-basin"], 0, "Occupied Maker spaces should not gain bonus spice");
  assert.equal(nextRound.makerSpice["hagga-basin"], 3, "Unoccupied Maker spaces should gain one bonus spice");
  assert.equal(nextRound.makerSpice["deep-desert"], 1);
  assert.equal(nextRound.makerSpice["habbanya-erg"], 1);

  const stackedRound = state.startNextRound({ ...nextRound, spaces: {}, pendingAction: undefined, pendingQueue: [] });
  assert.equal(stackedRound.makerSpice["imperial-basin"], 1, "Maker bonus spice should accumulate over rounds");
  assert.equal(stackedRound.makerSpice["hagga-basin"], 4);

  const commanderBase = game.players.find((player) => player.id === "p1");
  const ally = game.players.find((player) => player.id === "p3");
  assert.ok(commanderBase, "Verifier needs Muad'Dib Commander");
  assert.ok(ally, "Verifier needs a Muad'Dib Ally");
  const commander = {
    ...commanderBase,
    resources: { solari: 2, spice: 1, water: 1 },
  };
  const effect = state.applyBoardEffect(commander, ally, imperialBasin, {}, 3);
  assert.equal(effect.source.resources.spice, 5, "Maker bonus spice should add to printed spice gain");
  assert.equal(effect.target.resources.spice, ally.resources.spice, "Maker bonus spice should not go to the activated Ally");

  const collected = state.collectMakerSpice({
    ...game,
    makerSpice: { ...game.makerSpice, "imperial-basin": 4 },
  }, imperialBasin);
  assert.equal(collected["imperial-basin"], 0, "Visiting a Maker space should clear its bonus spice");

  const nonMakerCollected = state.collectMakerSpice(game, highCouncil);
  assert.equal(nonMakerCollected, game.makerSpice, "Non-Maker spaces should not rewrite Maker spice state");

  console.log("maker spice verification passed");
} finally {
  await server.close();
}
