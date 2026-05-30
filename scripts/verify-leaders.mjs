import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);

const expectedLeaderNames = [
  "Feyd-Rautha Harkonnen",
  "Gurney Halleck",
  "Lady Amber Metulli",
  "Lady Jessica",
  "Lady Margot Fenring",
  "Muad'Dib",
  "Princess Irulan",
  "Reverend Mother Jessica",
  "Shaddam Corrino IV",
  "Staban Tuek",
];

const expectedInitialSeats = [
  ["p1", "Muad'Dib"],
  ["p2", "Feyd-Rautha Harkonnen"],
  ["p3", "Gurney Halleck"],
  ["p4", "Shaddam Corrino IV"],
  ["p5", "Lady Jessica"],
  ["p6", "Princess Irulan"],
];

function assertLocalArt(leader) {
  const artPath = leader.thumbnailPath ?? leader.imagePath;
  assert.ok(artPath, `${leader.name} is missing leader art`);
  assert.ok(artPath.startsWith("/assets/"), `${leader.name} leader art must be local`);
  assert.ok(
    existsSync(join(projectRoot.pathname, "public", artPath)),
    `${leader.name} leader art does not exist at ${artPath}`,
  );
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.deepEqual(
    data.leaderCards.map((leader) => leader.name).sort(),
    expectedLeaderNames,
  );
  data.leaderCards.forEach(assertLocalArt);

  for (const leaderName of expectedLeaderNames) {
    const leader = data.leaderCardByName(leaderName);
    assert.equal(leader.name, leaderName);
    assert.ok(leader.sourceId, `${leaderName} should preserve source id`);
    assert.ok(leader.sourceSlug, `${leaderName} should preserve source slug`);
  }

  assert.throws(() => data.leaderCardByName("Not A Real Leader"), /Missing Uprising leader card/);

  const game = state.initialGame();
  assert.deepEqual(
    game.players.map((player) => [player.id, player.leader]),
    expectedInitialSeats,
  );
  for (const player of game.players) {
    assert.equal(player.leaderCard.name, player.leader, `${player.id} leader card should match leader name`);
    assertLocalArt(player.leaderCard);
  }

  console.log("leader verification passed");
} finally {
  await server.close();
}
