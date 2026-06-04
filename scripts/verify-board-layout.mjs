import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function sorted(values) {
  return [...values].sort((first, second) => first.localeCompare(second));
}

function flatSpaceIds(regions) {
  return regions.flatMap((region) => region.spaceIds);
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const layout = await server.ssrLoadModule("/src/components/board-layout.ts");

  const boardSpaceIds = data.boardSpaces.map((space) => space.id);
  const allLayoutIds = layout.boardLayoutSpaceIds;
  const visibleLayoutIds = [
    ...flatSpaceIds(layout.factionRegions),
    ...flatSpaceIds(layout.boardRegions),
  ];
  const commanderLayoutIds = flatSpaceIds(layout.commanderRegions);

  assert.equal(allLayoutIds.length, boardSpaceIds.length, "Board layout should place every board-space id");
  assert.equal(new Set(allLayoutIds).size, allLayoutIds.length, "Board layout should not duplicate board-space ids");
  assert.deepEqual(sorted(allLayoutIds), sorted(boardSpaceIds), "Board layout ids should match boardSpaces exactly");

  assert.equal(visibleLayoutIds.length, 24, "Main board layout should contain the 24 visible board locations");
  assert.equal(commanderLayoutIds.length, 4, "Commander dock should contain the four Commander locations");

  const spacesById = new Map(data.boardSpaces.map((space) => [space.id, space]));
  for (const spaceId of commanderLayoutIds) {
    assert.ok(spacesById.get(spaceId)?.personal, `${spaceId} should be a Commander personal-board space`);
  }

  const personalSpaceIds = data.boardSpaces.filter((space) => space.personal).map((space) => space.id);
  assert.deepEqual(
    sorted(commanderLayoutIds),
    sorted(personalSpaceIds),
    "Commander dock should contain exactly the personal-board spaces",
  );

  const regionIds = [
    ...layout.factionRegions,
    ...layout.boardRegions,
    ...layout.commanderRegions,
  ].map((region) => region.id);
  assert.equal(new Set(regionIds).size, regionIds.length, "Board layout region ids should be unique");

  console.log("board layout verification passed");
} finally {
  await server.close();
}
