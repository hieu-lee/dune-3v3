import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

try {
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  assert.deepEqual(game.alliances, {}, "Alliance tokens should start unclaimed");

  const claimed = state.setAllianceOwner(game, "greatHouses", "p2");
  assert.equal(claimed.alliances.greatHouses, "p2");
  assert.equal(playerById(claimed, "p2").vp, playerById(game, "p2").vp + 1);
  assert.match(claimed.log[0], /claims the Great Houses Alliance/);
  assert.equal(
    state.setAllianceOwner(claimed, "greatHouses", "p2"),
    claimed,
    "Claiming an already owned Alliance should be a no-op",
  );

  const transferred = state.setAllianceOwner(claimed, "greatHouses", "p3");
  assert.equal(transferred.alliances.greatHouses, "p3");
  assert.equal(playerById(transferred, "p2").vp, playerById(game, "p2").vp);
  assert.equal(playerById(transferred, "p3").vp, playerById(game, "p3").vp + 1);
  assert.match(transferred.log[0], /takes the Great Houses Alliance from/);

  const cleared = state.setAllianceOwner(transferred, "greatHouses");
  assert.equal(cleared.alliances.greatHouses, undefined);
  assert.equal(playerById(cleared, "p3").vp, playerById(game, "p3").vp);
  assert.match(cleared.log[0], /returns the Great Houses Alliance/);

  assert.equal(
    state.setAllianceOwner(game, "greatHouses", "missing-player"),
    game,
    "Unknown Alliance owners should not mutate state",
  );

  console.log("alliance verification passed");
} finally {
  await server.close();
}
