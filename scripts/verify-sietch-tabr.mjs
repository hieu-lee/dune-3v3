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
  const sietch = spaceById(data, "sietch-tabr");
  assert.equal(sietch.icon, "city", "Sietch Tabr should be a City space");
  assert.equal(sietch.combat, true, "Sietch Tabr should be a Combat space");
  assert.equal(sietch.sietchTabr, true, "Sietch Tabr should queue its printed branch choice");
  assert.deepEqual(
    sietch.requirement,
    { faction: "fringeWorlds", amount: 2 },
    "Sietch Tabr should use the six-player Fremen/Fringe requirement",
  );

  const allyCityCard = data.allyStarterCards.find((card) => card.icons.includes("city"));
  assert.ok(allyCityCard, "Expected an Ally city starter card");
  assert.equal(
    state.iconCanReach(allyCityCard, sietch, playerById(game, "p3"), false, {}, game.players),
    false,
    "A Muad'Dib Ally without Fringe influence should not reach Sietch Tabr",
  );

  const fringeReady = {
    ...game,
    players: game.players.map((player) =>
      player.id === "p3"
        ? { ...player, influence: { ...player.influence, fringeWorlds: 2 } }
        : player,
    ),
  };
  assert.equal(
    state.iconCanReach(allyCityCard, sietch, playerById(fringeReady, "p3"), false, {}, fringeReady.players),
    true,
    "A Muad'Dib Ally with 2 Fringe influence should reach Sietch Tabr",
  );

  const muadDibCityCard = data.muadDibCommanderCards.find((card) => card.icons.includes("city"));
  assert.ok(muadDibCityCard, "Expected a Muad'Dib city starter card");
  const muadDibFremenReady = {
    ...game,
    players: game.players.map((player) =>
      player.id === "p1"
        ? { ...player, influence: { ...player.influence, fremen: 2 } }
        : player,
    ),
  };
  assert.equal(
    state.iconCanReach(muadDibCityCard, sietch, playerById(muadDibFremenReady, "p1"), false, {}, muadDibFremenReady.players),
    true,
    "Muad'Dib should reach Sietch Tabr with 2 personal Fremen influence",
  );

  const commander = playerById(fringeReady, "p1");
  const gurney = playerById(fringeReady, "p3");
  const commanderPending = state.pendingActionForSietchTabr(fringeReady, sietch, gurney, commander);
  assert.deepEqual(
    commanderPending,
    {
      kind: "sietch-tabr",
      ownerId: "p3",
      waterOwnerId: "p1",
      canTakeMakerHooks: true,
      canRemoveShieldWall: true,
      source: "Sietch Tabr",
      spaceId: "sietch-tabr",
    },
    "Commander Sietch Tabr should split Hooks/troop owner from water owner",
  );
  const invalidSietchBase = {
    ...fringeReady,
    shieldWall: true,
    pendingAction: commanderPending,
    pendingQueue: [],
    players: fringeReady.players.map((player) =>
      player.id === "p3"
        ? { ...player, resources: { ...player.resources, water: 0 }, makerHooks: false }
        : player.id === "p1"
          ? { ...player, resources: { ...player.resources, water: 0 } }
          : player,
    ),
  };
  assert.equal(
    state.resolveSietchTabrChoice(invalidSietchBase, commanderPending, "bogus"),
    invalidSietchBase,
    "Invalid Sietch Tabr choice values should leave state unchanged",
  );

  const hooksChoice = state.resolveSietchTabrChoice(
    { ...fringeReady, pendingAction: commanderPending, pendingQueue: [] },
    commanderPending,
    "hooks",
  );
  assert.equal(playerById(hooksChoice, "p1").resources.water, commander.resources.water + 1, "Commander should gain Sietch water");
  assert.equal(playerById(hooksChoice, "p3").garrison, gurney.garrison + 1, "Activated Ally should recruit the Sietch troop");
  assert.equal(playerById(hooksChoice, "p3").makerHooks, true, "Activated Muad'Dib Ally should gain Maker Hooks");
  assert.equal(playerById(hooksChoice, "p5").makerHooks, true, "The other Muad'Dib Ally should gain shared Maker Hooks");
  assert.deepEqual(
    hooksChoice.pendingAction,
    { kind: "deploy", ownerId: "p3", remaining: 3, source: "Sietch Tabr" },
    "Sietch Hooks branch should allow the recruited troop plus up to two garrison troops to deploy",
  );

  const shieldChoice = state.resolveSietchTabrChoice(
    { ...fringeReady, pendingAction: commanderPending, pendingQueue: [] },
    commanderPending,
    "shield-wall",
  );
  assert.equal(playerById(shieldChoice, "p1").resources.water, commander.resources.water + 1, "Shield branch should gain water");
  assert.equal(shieldChoice.shieldWall, false, "Shield branch should remove the Shield Wall");
  assert.equal(playerById(shieldChoice, "p3").makerHooks, false, "Shield branch should not grant Maker Hooks");
  assert.equal(playerById(shieldChoice, "p3").garrison, gurney.garrison, "Shield branch should not recruit a troop");
  assert.deepEqual(
    shieldChoice.pendingAction,
    { kind: "deploy", ownerId: "p3", remaining: 2, source: "Sietch Tabr" },
    "Sietch Shield branch should still allow up to two existing garrison troops to deploy",
  );
  const extraRecruitPending = { ...commanderPending, extraRecruitedTroops: 1 };
  const extraHooksChoice = state.resolveSietchTabrChoice(
    { ...fringeReady, pendingAction: extraRecruitPending, pendingQueue: [] },
    extraRecruitPending,
    "hooks",
  );
  assert.deepEqual(
    extraHooksChoice.pendingAction,
    { kind: "deploy", ownerId: "p3", remaining: 4, source: "Sietch Tabr" },
    "Sietch Hooks branch should count same-turn card recruits in its deployment cap",
  );
  const extraShieldChoice = state.resolveSietchTabrChoice(
    { ...fringeReady, pendingAction: extraRecruitPending, pendingQueue: [] },
    extraRecruitPending,
    "shield-wall",
  );
  assert.deepEqual(
    extraShieldChoice.pendingAction,
    { kind: "deploy", ownerId: "p3", remaining: 3, source: "Sietch Tabr" },
    "Sietch Shield branch should count same-turn card recruits in its deployment cap",
  );

  const shaddam = playerById(fringeReady, "p4");
  const feyd = playerById(fringeReady, "p2");
  const shaddamPending = state.pendingActionForSietchTabr(fringeReady, sietch, feyd, shaddam);
  assert.equal(shaddamPending.canTakeMakerHooks, false, "Shaddam Allies should not be eligible to take Maker Hooks");
  const shaddamHooksChoice = state.resolveSietchTabrChoice(
    { ...fringeReady, pendingAction: shaddamPending, pendingQueue: [] },
    shaddamPending,
    "hooks",
  );
  assert.equal(playerById(shaddamHooksChoice, "p4").resources.water, shaddam.resources.water + 1);
  assert.equal(playerById(shaddamHooksChoice, "p2").garrison, feyd.garrison + 1);
  assert.equal(playerById(shaddamHooksChoice, "p2").makerHooks, false);
  assert.equal(playerById(shaddamHooksChoice, "p3").makerHooks, false, "Shaddam's no-hooks branch should not grant Muad'Dib Hooks");
  assert.equal(playerById(shaddamHooksChoice, "p5").makerHooks, false, "Shaddam's no-hooks branch should not grant shared Hooks");

  console.log("sietch tabr verification passed");
} finally {
  await server.close();
}
