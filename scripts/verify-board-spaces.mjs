import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);

const expectedCatalogArtSpaces = [
  "Accept Contract",
  "Arrakeen",
  "Assembly Hall",
  "Deep Desert",
  "Deliver Supplies",
  "Imperial Privilege",
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
];

const expectedSixPlayerArtById = {
  carthag: "/assets/dune-cards-hub/location/uprising-location-carthag.webp",
  "controversial-tech": "/assets/dune-cards-hub/location/uprising-location-controversial-technology.webp",
  "desert-mastery": "/assets/dune-cards-hub/location/uprising-location-desert-mastery.webp",
  "economic-support": "/assets/dune-cards-hub/location/uprising-location-economic-support.webp",
  expedition: "/assets/dune-cards-hub/location/uprising-location-expedition.webp",
  "habbanya-erg": "/assets/dune-cards-hub/location/uprising-location-habbanya-erg.webp",
  "hardy-warriors": "/assets/dune-cards-hub/location/uprising-location-hardy-warriors.webp",
  "military-support": "/assets/dune-cards-hub/location/uprising-location-military-support.webp",
  sardaukar: "/assets/dune-cards-hub/location/uprising-location-sardaukar-6p.webp",
  swordmaster: "/assets/dune-cards-hub/location/uprising-location-swordmaster-6p.webp",
  "vast-wealth": "/assets/dune-cards-hub/location/uprising-location-vast-wealth.webp",
};

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
  assert.equal(data.boardSpaces.length, 28, "Six-player board model should expose 28 placement spaces");

  const names = data.boardSpaces.map((space) => space.name);
  assert.equal(new Set(names).size, names.length, "Board-space names should be unique");
  assert.equal(new Set(data.boardSpaces.map((space) => space.id)).size, data.boardSpaces.length, "Board-space ids should be unique");

  for (const spaceName of expectedCatalogArtSpaces) {
    const space = data.boardSpaces.find((candidate) => candidate.name === spaceName);
    assert.ok(space, `${spaceName} should be present in the board-space model`);
    assert.ok(space.sourceId, `${spaceName} should preserve source id`);
    assert.ok(space.sourceSlug, `${spaceName} should preserve source slug`);
    assertLocalArt(space);
  }

  for (const [spaceId, artPath] of Object.entries(expectedSixPlayerArtById)) {
    const space = data.boardSpaces.find((candidate) => candidate.id === spaceId);
    assert.ok(space, `${spaceId} should be present in the board-space model`);
    assert.equal(space.imagePath, artPath, `${space.name} should use the exact six-player board-space asset`);
    assert.equal(space.thumbnailPath, artPath, `${space.name} thumbnail should use the exact six-player board-space asset`);
    assert.ok(space.sourceSlug?.startsWith("dire-wolf-"), `${space.name} should identify the official six-player art source`);
    assertLocalArt(space);
  }

  const sietch = data.boardSpaces.find((space) => space.id === "sietch-tabr");
  assert.ok(sietch, "Sietch Tabr should be present in the board-space model");
  assert.equal(sietch.icon, "city");
  assert.equal(sietch.combat, true);
  assert.equal(sietch.sietchTabr, true);
  assert.deepEqual(sietch.requirement, { faction: "fringeWorlds", amount: 2 });

  const imperialPrivilege = data.boardSpaces.find((space) => space.id === "imperial-privilege");
  assert.ok(imperialPrivilege, "Imperial Privilege should be present in the board-space model");
  assert.equal(
    imperialPrivilege.detail.includes("Emperor/Great Houses Influence"),
    true,
    "Imperial Privilege should describe its mapped Emperor/Great Houses requirement",
  );

  for (const space of data.boardSpaces) {
    assertLocalArt(space);
  }

  console.log("board-space verification passed");
} finally {
  await server.close();
}
