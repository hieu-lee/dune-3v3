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

function conflictByName(data, name) {
  const conflict = data.conflictCards.find((candidate) => candidate.name === name);
  assert.ok(conflict, `Expected Conflict ${name}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  const hagga = spaceById(data, "hagga-basin");
  const deep = spaceById(data, "deep-desert");
  assert.equal(hagga.makerWorms, 1, "Hagga Basin should offer one sandworm with Maker Hooks");
  assert.equal(deep.makerWorms, 2, "Deep Desert should offer two sandworms with Maker Hooks");

  const gurney = playerById(game, "p3");
  const hooked = state.setMakerHooks(game, gurney.id, true);
  const hookedGurney = playerById(hooked, "p3");
  assert.equal(hookedGurney.makerHooks, true, "A Muad'Dib Ally should be able to gain Maker Hooks");
  assert.equal(playerById(hooked, "p5").makerHooks, true, "The other Muad'Dib Ally should gain Maker Hooks too");
  assert.equal(playerById(hooked, "p1").makerHooks, false, "Muad'Dib should not hold Maker Hooks directly");
  assert.equal(
    state.setMakerHooks(game, "p2", true),
    game,
    "Shaddam Allies should not be able to gain Maker Hooks",
  );

  const nonProtectedConflict = conflictByName(data, "CHOAM Security");
  const wormReady = {
    ...hooked,
    conflict: nonProtectedConflict,
  };
  assert.equal(
    state.canSummonSandworms(wormReady, hookedGurney, 1),
    true,
    "An Ally with Maker Hooks should be able to summon worms into an unprotected Conflict",
  );

  const haggaPending = state.pendingActionForMakerChoice(wormReady, hagga, hookedGurney);
  assert.deepEqual(
    haggaPending,
    {
      kind: "maker-choice",
      ownerId: "p3",
      spiceOwnerId: "p3",
      spice: 2,
      sandworms: 1,
      canSummonSandworms: true,
      source: "Hagga Basin",
      spaceId: "hagga-basin",
    },
    "Hagga Basin should queue a spice-or-worm choice for a hooked Ally",
  );

  const deferred = state.applyBoardEffect(hookedGurney, hookedGurney, hagga, hagga.cost, 2, true).source;
  assert.equal(deferred.resources.spice, 2, "Deferred maker choice should pay only accumulated bonus spice first");
  const immediate = state.applyBoardEffect(hookedGurney, hookedGurney, hagga, hagga.cost, 2).source;
  assert.equal(immediate.resources.spice, 4, "Non-deferred maker spaces should still pay base plus bonus spice");

  const summoned = state.resolveMakerChoice({ ...wormReady, pendingAction: haggaPending, pendingQueue: [] }, haggaPending, "sandworms");
  const summonedGurney = playerById(summoned, "p3");
  assert.equal(summonedGurney.deployedSandworms, 1, "Resolving the worm choice should deploy a sandworm");
  assert.equal(summonedGurney.conflict, 3, "Each deployed sandworm should add 3 combat strength");
  assert.equal(summoned.pendingAction, undefined, "Resolving the maker choice should advance pending actions");

  const hooksRemovedAfterPending = state.setMakerHooks(wormReady, "p3", false);
  const lockedSummon = state.resolveMakerChoice(
    { ...hooksRemovedAfterPending, pendingAction: haggaPending, pendingQueue: [] },
    haggaPending,
    "sandworms",
  );
  assert.equal(
    playerById(lockedSummon, "p3").deployedSandworms,
    1,
    "A queued Maker choice should preserve sandworm eligibility captured at placement time",
  );

  const spiceChoice = state.resolveMakerChoice({ ...wormReady, pendingAction: haggaPending, pendingQueue: [] }, haggaPending, "spice");
  const spiceGurney = playerById(spiceChoice, "p3");
  assert.equal(spiceGurney.resources.spice, hookedGurney.resources.spice + 2, "The spice choice should pay the base maker reward");
  assert.equal(spiceGurney.deployedSandworms, 0, "The spice choice should not deploy sandworms");

  const muadDib = playerById(wormReady, "p1");
  const commanderPending = state.pendingActionForMakerChoice(wormReady, hagga, hookedGurney, muadDib);
  assert.ok(commanderPending, "Commander Maker spaces should queue choices through a hooked activated Ally");
  assert.equal(commanderPending.spiceOwnerId, "p1", "A Commander should remain the spice recipient for Maker choices");
  const commanderSpiceChoice = state.resolveMakerChoice(
    { ...wormReady, pendingAction: commanderPending, pendingQueue: [] },
    commanderPending,
    "spice",
  );
  assert.equal(
    playerById(commanderSpiceChoice, "p1").resources.spice,
    muadDib.resources.spice + 2,
    "Commander Maker spice should pay the Commander, not the activated Ally",
  );
  assert.equal(
    playerById(commanderSpiceChoice, "p3").resources.spice,
    hookedGurney.resources.spice,
    "Activated Allies should not receive Commander Maker spice",
  );
  const commanderWormChoice = state.resolveMakerChoice(
    { ...wormReady, pendingAction: commanderPending, pendingQueue: [] },
    commanderPending,
    "sandworms",
  );
  assert.equal(
    playerById(commanderWormChoice, "p3").deployedSandworms,
    hookedGurney.deployedSandworms + 1,
    "Commander Maker worm choices should deploy sandworms to the activated Ally",
  );
  assert.equal(
    playerById(commanderWormChoice, "p1").deployedSandworms,
    muadDib.deployedSandworms,
    "Commander Maker worm choices should not deploy sandworms to the Commander",
  );

  const protectedConflict = conflictByName(data, "Battle For Arrakeen");
  const shielded = { ...wormReady, conflict: protectedConflict, shieldWall: true };
  const unshielded = state.setShieldWall(shielded, false);
  assert.equal(unshielded.shieldWall, false, "Shield Wall state should be manually removable");
  assert.equal(state.setShieldWall(unshielded, true).shieldWall, true, "Shield Wall state should be manually restorable");
  assert.equal(
    state.conflictProtectedByShieldWall(protectedConflict),
    true,
    "Arrakeen Conflicts should be protected by the Shield Wall",
  );
  assert.equal(
    state.pendingActionForMakerChoice(shielded, hagga, hookedGurney),
    undefined,
    "The Shield Wall should block sandworm choices for protected Conflicts",
  );
  assert.ok(
    state.pendingActionForMakerChoice(unshielded, hagga, hookedGurney),
    "Removing the Shield Wall should reopen protected Conflicts to sandworms",
  );

  const combat = state.startCombatPhase({
    ...summoned,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  });
  assert.equal(combat.phase, "combat", "A worm-only Ally should open the Combat phase");
  assert.deepEqual(
    state.combatIntrigueTargets(combat, "p1"),
    ["p3"],
    "A Commander should be able to target a worm-only Ally with Combat Intrigues",
  );

  const nextRound = state.startNextRound({
    ...summoned,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    conflictDeck: [conflictByName(data, "Siege Of Arrakeen")],
  });
  assert.equal(playerById(nextRound, "p3").deployedSandworms, 0, "Round advancement should return sandworms to the bank");
  assert.equal(playerById(nextRound, "p3").conflict, 0, "Round advancement should clear sandworm strength");

  console.log("sandworm verification passed");
} finally {
  await server.close();
}
