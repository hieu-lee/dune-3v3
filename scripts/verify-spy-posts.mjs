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

function spaceById(data, spaceId) {
  const space = data.boardSpaces.find((candidate) => candidate.id === spaceId);
  assert.ok(space, `Expected board space ${spaceId}`);
  return space;
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const spies = await server.ssrLoadModule("/src/game/spy-posts.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(
    state.spyPostOwnerIds,
    spies.spyPostOwnerIds,
    "state.ts should preserve the public spyPostOwnerIds export",
  );
  assert.equal(
    state.canPlaceSpyPost,
    spies.canPlaceSpyPost,
    "state.ts should preserve the public canPlaceSpyPost export",
  );

  const game = state.initialGame();
  const feyd = playerById(game, "p2");
  const shaddam = playerById(game, "p4");
  const muaddib = playerById(game, "p1");
  const arrakeen = spaceById(data, "arrakeen");
  const swordmaster = spaceById(data, "swordmaster");
  const vastWealth = spaceById(data, "vast-wealth");

  const sharedState = {
    spyPosts: { [arrakeen.id]: feyd.id },
    sharedSpyPosts: { [arrakeen.id]: ["p3", feyd.id] },
  };
  assert.deepEqual(
    spies.spyPostOwnerIds(sharedState, arrakeen.id),
    [feyd.id, "p3"],
    "Spy owners should be unique across standard and shared posts",
  );
  assert.equal(spies.spyPostOccupied(sharedState, arrakeen.id), true);
  assert.equal(spies.playerHasSpyPost(sharedState, arrakeen.id, feyd.id), true);

  const removedFeyd = spies.removeSpyPostOwner(sharedState, arrakeen.id, feyd.id);
  assert.deepEqual(removedFeyd.spyPosts, {});
  assert.deepEqual(removedFeyd.sharedSpyPosts, { [arrakeen.id]: ["p3"] });
  assert.deepEqual(sharedState.spyPosts, { [arrakeen.id]: feyd.id }, "Removing a spy should not mutate input state");

  const removedP3 = spies.removeSpyPostOwner(removedFeyd, arrakeen.id, "p3");
  assert.deepEqual(removedP3.sharedSpyPosts, {}, "Removing the last shared spy should delete the shared post entry");

  assert.equal(spies.canPlaceSpyPost(game, arrakeen, feyd), true);
  assert.equal(
    spies.canPlaceSpyPost({ ...game, spyPosts: { [arrakeen.id]: "p3" } }, arrakeen, feyd),
    false,
    "Normal spy placement should reject occupied posts",
  );
  assert.equal(
    spies.canPlaceSpyPost({ ...game, swordmasterClaimed: true }, swordmaster, feyd),
    false,
    "Swordmaster observation post should close after Swordmaster is claimed",
  );

  assert.equal(spies.canPlaceSpyPost(game, vastWealth, shaddam), true, "Shaddam Commander can use Shaddam personal spaces");
  assert.equal(spies.canPlaceSpyPost(game, vastWealth, feyd), false, "Allies cannot use Commander personal spaces");
  assert.equal(spies.canPlaceSpyPost(game, vastWealth, muaddib), false, "Opposing Commanders cannot use personal spaces");

  const occupiedArrakeen = { ...game, spyPosts: { [arrakeen.id]: "p3" } };
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedArrakeen, arrakeen, feyd),
    true,
    "Shared spy placement should allow joining another player's occupied post",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(occupiedArrakeen, arrakeen, { ...feyd, id: "p3" }),
    false,
    "Shared spy placement should reject owners already on that post",
  );
  assert.equal(
    spies.canPlaceSharedSpyPost(game, arrakeen, feyd),
    false,
    "Shared spy placement should require another player's existing spy",
  );

  console.log("spy post verification passed");
} finally {
  await server.close();
}
