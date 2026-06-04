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
  const rules = await server.ssrLoadModule("/src/game/board-rules.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  const feyd = playerById(game, "p2");
  const shaddam = playerById(game, "p4");
  const muaddib = playerById(game, "p1");
  const highCouncil = spaceById(data, "high-council");
  const shipping = spaceById(data, "shipping");
  const imperialPrivilege = spaceById(data, "imperial-privilege");
  const sietchTabr = spaceById(data, "sietch-tabr");
  const swordmaster = spaceById(data, "swordmaster");
  const vastWealth = spaceById(data, "vast-wealth");

  assert.equal(rules.canPay(feyd, {}), true, "Empty costs should be payable");
  assert.equal(rules.canPay(feyd, { solari: feyd.resources.solari + 1 }), false, "Costs should require enough resources");
  assert.deepEqual(rules.effectiveCost(shipping, game.players), shipping.cost, "Effective cost should preserve printed cost");
  assert.deepEqual(rules.effectiveCost(swordmaster, game.players), { solari: 8 }, "Swordmaster should cost 8 before anyone has it");
  assert.deepEqual(
    rules.effectiveCost(swordmaster, game.players.map((player) => (player.id === feyd.id ? { ...player, swordmasterBonus: true } : player))),
    { solari: 6 },
    "Swordmaster should cost 6 once any player has it",
  );

  const fourCouncilSeatsFilled = game.players.map((player, index) => ({ ...player, highCouncilSeat: index < 4 }));
  const noSeatPlayer = { ...fourCouncilSeatsFilled[4], highCouncilSeat: false };
  const seatedPlayer = fourCouncilSeatsFilled[0];
  assert.equal(rules.highCouncilSeatsTaken(fourCouncilSeatsFilled), 4);
  assert.equal(rules.boardSpaceRewardApplies(highCouncil, noSeatPlayer), false);
  assert.equal(rules.boardSpaceRewardApplies(highCouncil, seatedPlayer), true);
  assert.equal(
    rules.canEnterSpace(highCouncil, noSeatPlayer, false, fourCouncilSeatsFilled),
    false,
    "A fifth player should not enter the full High Council",
  );
  assert.equal(
    rules.canEnterSpace(highCouncil, seatedPlayer, false, fourCouncilSeatsFilled),
    true,
    "A seated player should still enter the High Council repeat space",
  );

  assert.equal(rules.canEnterSpace(swordmaster, feyd), true);
  assert.equal(
    rules.canEnterSpace(swordmaster, feyd, true),
    true,
    "Swordmaster should remain open to players who have not claimed it",
  );
  assert.equal(
    rules.canEnterSpace(swordmaster, { ...feyd, swordmasterBonus: true }),
    false,
    "Players with Swordmaster should not claim it again",
  );

  assert.equal(rules.canEnterSpace(vastWealth, shaddam), true, "Shaddam Commander should enter Shaddam spaces");
  assert.equal(rules.canEnterSpace(vastWealth, feyd), false, "Allies should not enter Commander personal spaces");
  assert.equal(rules.canEnterSpace(vastWealth, muaddib), false, "Opposing Commanders should not enter personal spaces");

  const feydWithSpacing = { ...feyd, influence: { ...feyd.influence, spacing: 2 } };
  const shaddamPlayers = game.players.map((player) => (player.id === feyd.id ? feydWithSpacing : player));
  assert.equal(rules.canMeetInfluenceRequirement(shipping, feyd, game.players), false);
  assert.equal(rules.canMeetInfluenceRequirement(shipping, feydWithSpacing, shaddamPlayers), true);
  assert.equal(
    rules.effectiveRequirementInfluence(shaddam, "spacing", shaddamPlayers),
    2,
    "Commanders should use the best same-team Ally Influence for requirements",
  );
  assert.equal(rules.canMeetInfluenceRequirement(shipping, shaddam, shaddamPlayers), true);

  const feydWithGreatHouses = { ...feyd, influence: { ...feyd.influence, greatHouses: 2 } };
  const greatHousesPlayers = game.players.map((player) => (player.id === feyd.id ? feydWithGreatHouses : player));
  assert.equal(
    rules.canMeetInfluenceRequirement(imperialPrivilege, feydWithGreatHouses, greatHousesPlayers),
    true,
    "Imperial Privilege should accept Great Houses Influence for an Ally's Emperor-icon requirement",
  );
  const shaddamWithEmperor = { ...shaddam, influence: { ...shaddam.influence, emperor: 2 } };
  const emperorPlayers = game.players.map((player) => (player.id === shaddam.id ? shaddamWithEmperor : player));
  assert.equal(
    rules.canMeetInfluenceRequirement(imperialPrivilege, shaddamWithEmperor, emperorPlayers),
    true,
    "Imperial Privilege should accept Shaddam's personal Emperor Influence",
  );

  const muaddibWithFremen = { ...muaddib, influence: { ...muaddib.influence, fremen: 2, fringeWorlds: 0 } };
  const muaddibPlayers = game.players.map((player) => (player.id === muaddib.id ? muaddibWithFremen : player));
  assert.equal(
    rules.canMeetInfluenceRequirement(sietchTabr, muaddibWithFremen, muaddibPlayers),
    true,
    "Muad'Dib Commander should satisfy Sietch Tabr with personal Fremen influence",
  );

  console.log("board rules verification passed");
} finally {
  await server.close();
}
