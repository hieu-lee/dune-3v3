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

function adjustInfluenceAndResolve(state, game, playerId, faction, amount) {
  const previousPlayers = game.players;
  const influencedState = {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? state.adjustInfluence(player, faction, amount) : player,
    ),
  };
  return state.resolveLeaderInfluenceThresholdRewards(influencedState, previousPlayers);
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

  const autoClaimed = adjustInfluenceAndResolve(state, game, "p2", "greatHouses", 4);
  assert.equal(autoClaimed.alliances.greatHouses, "p2", "First player to reach 4 Influence should claim the Alliance");
  assert.equal(
    playerById(autoClaimed, "p2").vp,
    playerById(game, "p2").vp + 2,
    "Alliance claim should add the 2-Influence VP and the Alliance VP",
  );
  assert.match(autoClaimed.log[0], /claims the Great Houses Alliance/);

  const tiedAtFour = adjustInfluenceAndResolve(state, autoClaimed, "p3", "greatHouses", 4);
  assert.equal(tiedAtFour.alliances.greatHouses, "p2", "Tying the Alliance holder should not take the token");
  assert.equal(
    playerById(tiedAtFour, "p3").vp,
    playerById(game, "p3").vp + 1,
    "Tied challenger should gain only the 2-Influence VP",
  );

  const passedHolder = adjustInfluenceAndResolve(state, tiedAtFour, "p3", "greatHouses", 1);
  assert.equal(passedHolder.alliances.greatHouses, "p3", "Passing the current holder should take the token");
  assert.equal(playerById(passedHolder, "p2").vp, playerById(game, "p2").vp + 1);
  assert.equal(playerById(passedHolder, "p3").vp, playerById(game, "p3").vp + 2);
  assert.match(passedHolder.log[0], /takes the Great Houses Alliance from/);

  const holderDropsToTie = adjustInfluenceAndResolve(state, passedHolder, "p3", "greatHouses", -1);
  assert.equal(
    holderDropsToTie.alliances.greatHouses,
    "p3",
    "Holder should keep the Alliance when dropping to a tie without having been tied before the loss",
  );

  const holderDropsBelowFour = adjustInfluenceAndResolve(state, holderDropsToTie, "p3", "greatHouses", -1);
  assert.equal(
    holderDropsBelowFour.alliances.greatHouses,
    "p2",
    "A holder that drops below 4 should give the Alliance to an eligible player at 4+ Influence",
  );

  const returnedToTrack = adjustInfluenceAndResolve(state, autoClaimed, "p2", "greatHouses", -1);
  assert.equal(returnedToTrack.alliances.greatHouses, undefined, "Alliance should return to the track when the holder drops below 4 and no one else is eligible");
  assert.equal(playerById(returnedToTrack, "p2").vp, playerById(game, "p2").vp + 1);
  assert.match(returnedToTrack.log[0], /returns the Great Houses Alliance/);

  console.log("alliance verification passed");
} finally {
  await server.close();
}
