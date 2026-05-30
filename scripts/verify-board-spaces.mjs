import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);

const expectedArtSpaces = [
  "Accept Contract",
  "Arrakeen",
  "Deep Desert",
  "Deliver Supplies",
  "Dutiful Service",
  "Espionage",
  "Gather Support",
  "Hagga Basin",
  "Heighliner",
  "High Council",
  "Imperial Basin",
  "Research Station",
  "Secrets",
  "Shipping",
  "Sietch Tabr",
  "Spice Refinery",
  "Swordmaster",
];

function assertLocalArt(space) {
  const artPath = space.thumbnailPath ?? space.imagePath;
  assert.ok(artPath, `${space.name} is missing board-space art`);
  assert.ok(artPath.startsWith("/assets/"), `${space.name} board-space art must be local`);
  assert.ok(
    existsSync(join(projectRoot.pathname, "public", artPath)),
    `${space.name} board-space art does not exist at ${artPath}`,
  );
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  assert.equal(data.boardSpaces.length, 27, "Six-player board model should expose 27 placement spaces");

  const names = data.boardSpaces.map((space) => space.name);
  assert.equal(new Set(names).size, names.length, "Board-space names should be unique");
  assert.equal(new Set(data.boardSpaces.map((space) => space.id)).size, data.boardSpaces.length, "Board-space ids should be unique");

  for (const spaceName of expectedArtSpaces) {
    const space = data.boardSpaces.find((candidate) => candidate.name === spaceName);
    assert.ok(space, `${spaceName} should be present in the board-space model`);
    assert.ok(space.sourceId, `${spaceName} should preserve source id`);
    assert.ok(space.sourceSlug, `${spaceName} should preserve source slug`);
    assertLocalArt(space);
  }

  const sietch = data.boardSpaces.find((space) => space.id === "sietch-tabr");
  assert.ok(sietch, "Sietch Tabr should be present in the board-space model");
  assert.equal(sietch.icon, "city");
  assert.equal(sietch.combat, true);
  assert.equal(sietch.sietchTabr, true);
  assert.deepEqual(sietch.requirement, { faction: "fringeWorlds", amount: 2 });

  for (const space of data.boardSpaces.filter((candidate) => candidate.sourceId || candidate.sourceSlug)) {
    assert.equal(space.personal, undefined, `${space.name} personal-board space should wait for commander-board art`);
    assertLocalArt(space);
  }

  console.log("board-space verification passed");
} finally {
  await server.close();
}
