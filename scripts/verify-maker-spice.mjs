import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const makerSpiceAssets = await server.ssrLoadModule("/src/components/maker-spice-assets.ts");

  const expectedMakerIds = ["deep-desert", "habbanya-erg", "hagga-basin", "imperial-basin"];
  const makerSpaces = data.boardSpaces.filter((space) => space.maker);
  const makerSpaceArtById = Object.fromEntries(
    makerSpaces.map((space) => [space.id, space.thumbnailPath ?? space.imagePath]),
  );
  assert.deepEqual([...state.makerSpaceIds].sort(), expectedMakerIds);
  for (const spaceId of expectedMakerIds) {
    for (const count of makerSpiceAssets.makerSpiceAssetCounts) {
      const assetPath = makerSpiceAssets.makerSpiceAssetPathFor(spaceId, count);
      assert.ok(assetPath, `${spaceId} should resolve a maker-spice asset for ${count}`);
      const assetFile = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
      assert.equal(existsSync(assetFile), true, `${spaceId} maker-spice ${count} asset should exist`);
      const originalDimensions = webpDimensions(
        path.join(process.cwd(), "public", makerSpaceArtById[spaceId].replace(/^\//, "")),
      );
      const assetDimensions = webpDimensions(assetFile);
      assert.deepEqual(
        assetDimensions,
        originalDimensions,
        `${spaceId} maker-spice ${count} asset should match the original location art dimensions`,
      );
    }
    assert.equal(
      makerSpiceAssets.makerSpiceAssetPathFor(spaceId, 0),
      undefined,
      `${spaceId} should use its original asset at zero bonus spice`,
    );
    assert.equal(
      makerSpiceAssets.makerSpiceAssetPathFor(spaceId, 6),
      undefined,
      `${spaceId} should use its original asset above the generated range`,
    );
  }
  assert.equal(
    makerSpiceAssets.makerSpiceAssetPathFor("high-council", 1),
    undefined,
    "Non-Maker spaces should not resolve maker-spice replacement assets",
  );

  assert.deepEqual(
    makerSpaces.map((space) => space.id).sort(),
    expectedMakerIds,
    "Six-player board should mark the four Maker spaces",
  );

  const game = state.initialGame();
  const invalidMakerPending = {
    kind: "maker-choice",
    ownerId: "p3",
    spiceOwnerId: "p3",
    source: "Invalid Maker choice test",
    spaceId: "hagga-basin",
    spice: 2,
    sandworms: 1,
    canSummonSandworms: true,
  };
  const invalidMakerBase = {
    ...game,
    pendingAction: invalidMakerPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === "p3"
        ? { ...player, resources: { ...player.resources, spice: 0 }, deployedSandworms: 0 }
        : player,
    ),
  };
  assert.equal(
    state.resolveMakerChoice(invalidMakerBase, invalidMakerPending, "bogus"),
    invalidMakerBase,
    "Invalid Maker choice values should leave state unchanged",
  );

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

  const feydBase = game.players.find((player) => player.id === "p2");
  assert.ok(feydBase, "Verifier needs Feyd");
  const firstCouncilVisit = state.applyBoardEffect(
    { ...feydBase, resources: { ...feydBase.resources, solari: 5 }, garrison: 0, highCouncilSeat: false },
    feydBase,
    highCouncil,
    { solari: 5 },
  );
  assert.equal(firstCouncilVisit.source.highCouncilSeat, true, "First High Council visit should take a Council seat");
  assert.equal(firstCouncilVisit.source.resources.solari, 0, "High Council should cost 5 Solari");
  assert.equal(firstCouncilVisit.source.resources.spice, 0, "First High Council visit should not take the repeat spice reward");
  assert.equal(firstCouncilVisit.source.garrison, 0, "First High Council visit should not take the repeat troop reward");
  assert.equal(
    state.boardSpaceRewardApplies(highCouncil, firstCouncilVisit.source),
    true,
    "High Council repeat rewards should apply after the seat is taken",
  );

  const repeatCouncilVisit = state.applyBoardEffect(
    { ...feydBase, resources: { ...feydBase.resources, solari: 5 }, garrison: 0, highCouncilSeat: true },
    feydBase,
    highCouncil,
    { solari: 5 },
  );
  assert.equal(repeatCouncilVisit.source.highCouncilSeat, true);
  assert.equal(repeatCouncilVisit.source.resources.solari, 0);
  assert.equal(repeatCouncilVisit.source.resources.spice, 2, "Repeat High Council visits should gain 2 spice");
  assert.equal(repeatCouncilVisit.source.garrison, 3, "Repeat High Council visits should recruit 3 troops");

  const fourSeatsFilled = game.players.map((player, index) => ({ ...player, highCouncilSeat: index < 4 }));
  const noSeatPlayer = { ...fourSeatsFilled[4], highCouncilSeat: false, resources: { ...fourSeatsFilled[4].resources, solari: 5 } };
  const seatedPlayer = { ...fourSeatsFilled[0], resources: { ...fourSeatsFilled[0].resources, solari: 5 } };
  assert.equal(
    state.highCouncilSeatsTaken(fourSeatsFilled),
    4,
    "High Council should track the four physical Council seats",
  );
  assert.equal(
    state.iconCanReach({ icons: ["landsraad"] }, highCouncil, noSeatPlayer, false, {}, fourSeatsFilled),
    false,
    "A player without a seat should not take a fifth High Council seat",
  );
  assert.equal(
    state.iconCanReach({ icons: ["landsraad"] }, highCouncil, seatedPlayer, false, {}, fourSeatsFilled),
    true,
    "A player with a seat should still be able to use the High Council repeat space",
  );

  console.log("maker spice verification passed");
} finally {
  await server.close();
}

function webpDimensions(filePath) {
  const buffer = readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", `${filePath} should be a RIFF WebP`);
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", `${filePath} should be a WebP`);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    if (chunkType === "VP8X") {
      return {
        width: 1 + readUInt24LE(buffer, payloadOffset + 4),
        height: 1 + readUInt24LE(buffer, payloadOffset + 7),
      };
    }
    if (chunkType === "VP8 ") {
      return {
        width: buffer.readUInt16LE(payloadOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(payloadOffset + 8) & 0x3fff,
      };
    }
    if (chunkType === "VP8L") {
      const bits = buffer.readUInt32LE(payloadOffset + 1);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >> 14) & 0x3fff),
      };
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error(`${filePath} should contain a VP8, VP8L, or VP8X WebP chunk`);
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}
