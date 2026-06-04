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
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  const shipping = spaceById(data, "shipping");
  const imperialPrivilege = spaceById(data, "imperial-privilege");
  const spiceCard = { icons: ["spice"] };
  const landsraadCard = { icons: ["landsraad"] };
  assert.deepEqual(
    shipping.requirement,
    { faction: "spacing", amount: 2 },
    "Shipping should require two Spacing Guild Influence",
  );

  const feyd = playerById(game, "p2");
  assert.equal(
    state.canMeetInfluenceRequirement(shipping, feyd, game.players),
    false,
    "A player below the Shipping requirement should not meet it",
  );
  assert.equal(
    state.iconCanReach(spiceCard, shipping, feyd, false, {}, game.players),
    false,
    "A spice icon should not bypass the Shipping influence requirement",
  );

  const feydQualified = {
    ...feyd,
    influence: { ...feyd.influence, spacing: 2 },
  };
  const feydQualifiedPlayers = game.players.map((player) =>
    player.id === feydQualified.id ? feydQualified : player,
  );
  assert.equal(
    state.canMeetInfluenceRequirement(shipping, feydQualified, feydQualifiedPlayers),
    true,
    "A player with enough Spacing Guild Influence should meet Shipping's requirement",
  );
  assert.equal(
    state.iconCanReach(spiceCard, shipping, feydQualified, false, {}, feydQualifiedPlayers),
    true,
    "A qualified player with a spice icon should be able to reach Shipping",
  );

  const shaddam = playerById(game, "p4");
  assert.equal(
    state.iconCanReach(spiceCard, shipping, shaddam, false, {}, game.players),
    false,
    "A Commander should not use Shipping before either Ally has enough shared Influence",
  );
  assert.equal(
    state.effectiveRequirementInfluence(shaddam, "spacing", feydQualifiedPlayers),
    2,
    "A Commander should satisfy requirements through the highest same-team Ally Influence",
  );
  assert.equal(
    state.iconCanReach(spiceCard, shipping, shaddam, false, {}, feydQualifiedPlayers),
    true,
    "A Commander should be able to use Shipping when either same-team Ally has enough Spacing influence",
  );

  const secrets = spaceById(data, "secrets");
  assert.equal(
    state.iconCanReach({ icons: ["bene"] }, secrets, feyd, false, {}, game.players),
    true,
    "Spaces without requirements should keep their normal icon reachability",
  );

  assert.deepEqual(
    imperialPrivilege.requirement,
    { faction: "emperor", amount: 2 },
    "Imperial Privilege should require two Emperor Influence",
  );
  assert.equal(
    state.canMeetInfluenceRequirement(imperialPrivilege, feyd, game.players),
    false,
    "An Ally below the Great Houses/Emperor threshold should not meet Imperial Privilege's requirement",
  );
  const feydGreatHousesQualified = {
    ...feyd,
    influence: { ...feyd.influence, greatHouses: 2 },
  };
  const feydGreatHousesQualifiedPlayers = game.players.map((player) =>
    player.id === feydGreatHousesQualified.id ? feydGreatHousesQualified : player,
  );
  assert.equal(
    state.canMeetInfluenceRequirement(imperialPrivilege, feydGreatHousesQualified, feydGreatHousesQualifiedPlayers),
    true,
    "An Ally with two Great Houses Influence should meet Imperial Privilege's Emperor-icon requirement",
  );
  assert.equal(
    state.iconCanReach(landsraadCard, imperialPrivilege, feydGreatHousesQualified, false, {}, feydGreatHousesQualifiedPlayers),
    true,
    "A qualified Ally with a Landsraad icon should be able to reach Imperial Privilege",
  );
  const shaddamQualified = {
    ...shaddam,
    influence: { ...shaddam.influence, emperor: 2 },
  };
  const shaddamQualifiedPlayers = game.players.map((player) =>
    player.id === shaddamQualified.id ? shaddamQualified : player,
  );
  assert.equal(
    state.canMeetInfluenceRequirement(imperialPrivilege, shaddamQualified, shaddamQualifiedPlayers),
    true,
    "Shaddam should meet Imperial Privilege's Emperor-icon requirement with personal Emperor Influence",
  );

  console.log("board requirement verification passed");
} finally {
  await server.close();
}
