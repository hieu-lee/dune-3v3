import assert from "node:assert/strict";
import { combatFixture, playerById } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntrigueRetreatBranches({ cards: { spiceIsPower, tacticalOption }, data, state }) {
  const spiceSpendFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, resources: { ...player.resources, spice: 3 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceSpendCombat = state.startCombatPhase(spiceSpendFixture);
  assert.equal(
    state.combatIntrigueStrength(spiceSpendCombat, playerById(spiceSpendCombat, "p2"), spiceIsPower),
    6,
    "Spice is Power should expose the spend branch when the recipient has 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceSpendCombat, "p2", spiceIsPower.id),
    spiceSpendCombat,
    "Spice is Power should require an explicit branch choice",
  );
  const spiceSpendPlayed = state.playCombatIntrigue(spiceSpendCombat, "p2", spiceIsPower.id, undefined, "spend-spice");
  assert.equal(playerById(spiceSpendPlayed, "p2").resources.spice, 0, "Spice is Power spend branch should spend recipient spice");
  assert.equal(playerById(spiceSpendPlayed, "p2").conflict, 8, "Spice is Power spend branch should add 6 strength");
  assert.equal(playerById(spiceSpendPlayed, "p2").deployedTroops, 1, "Spice is Power spend branch should not retreat troops");
  assert.equal(spiceSpendPlayed.intrigueDiscard.at(-1).id, spiceIsPower.id);
  assert.match(spiceSpendPlayed.log[0], /spends 3 spice to add 6 strength/);

  const spiceDryFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, resources: { ...player.resources, spice: 2 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceDryCombat = state.startCombatPhase(spiceDryFixture);
  assert.equal(
    state.combatIntrigueStrength(spiceDryCombat, playerById(spiceDryCombat, "p2"), spiceIsPower),
    undefined,
    "Spice is Power should not expose the spend branch before the recipient has 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceDryCombat, "p2", spiceIsPower.id, undefined, "spend-spice"),
    spiceDryCombat,
    "Spice is Power spend branch should require 3 spice",
  );
  assert.equal(
    state.playCombatIntrigue(spiceDryCombat, "p2", spiceIsPower.id, undefined, "retreat-troops"),
    spiceDryCombat,
    "Spice is Power retreat branch should require 3 deployed troops",
  );

  const spiceRetreatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 9, deployedTroops: 3, garrison: 1, resources: { ...player.resources, spice: 0 }, intrigues: [spiceIsPower] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const spiceRetreatCombat = state.startCombatPhase(spiceRetreatFixture);
  const spiceRetreatPlayed = state.playCombatIntrigue(spiceRetreatCombat, "p2", spiceIsPower.id, undefined, "retreat-troops");
  assert.equal(playerById(spiceRetreatPlayed, "p2").deployedTroops, 0, "Spice is Power should retreat three troops");
  assert.equal(playerById(spiceRetreatPlayed, "p2").garrison, 4, "Spice is Power should return retreated troops to garrison");
  assert.equal(playerById(spiceRetreatPlayed, "p2").resources.spice, 3, "Spice is Power retreat branch should gain 3 spice");
  assert.equal(playerById(spiceRetreatPlayed, "p2").conflict, 3, "Spice is Power retreat branch should remove the troops' strength");
  assert.equal(spiceRetreatPlayed.players[spiceRetreatPlayed.activeSeat].id, "p3", "Combat should continue with remaining actors after a retreat");
  assert.match(spiceRetreatPlayed.log[0], /retreats 3 troops and gains 3 spice/);

  const spiceLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 6, deployedTroops: 3, garrison: 0, resources: { ...player.resources, spice: 0 }, intrigues: [spiceIsPower] }
        : player,
    ),
  );
  const spiceLastActorCombat = state.startCombatPhase(spiceLastActorFixture);
  const spiceLastActorPlayed = state.playCombatIntrigue(
    spiceLastActorCombat,
    "p2",
    spiceIsPower.id,
    undefined,
    "retreat-troops",
  );
  assert.equal(spiceLastActorPlayed.phase, "playing", "Retreating the last units should resolve Combat instead of leaving no actors");
  assert.equal(spiceLastActorPlayed.round, spiceLastActorFixture.round + 1);
  assert.ok(
    spiceLastActorPlayed.log.some((entry) => entry.includes("resolves with no winner")),
    "Retreating the last units should resolve the Conflict with no winner",
  );

  const tacticalAddFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalAddCombat = state.startCombatPhase(tacticalAddFixture);
  assert.equal(
    state.combatIntrigueStrength(tacticalAddCombat, playerById(tacticalAddCombat, "p2"), tacticalOption),
    2,
    "Tactical Option should expose its +2 strength branch",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalAddCombat, "p2", tacticalOption.id),
    tacticalAddCombat,
    "Tactical Option should require an explicit branch choice",
  );
  const tacticalAdded = state.playCombatIntrigue(tacticalAddCombat, "p2", tacticalOption.id, undefined, "add-strength");
  assert.equal(playerById(tacticalAdded, "p2").conflict, 4, "Tactical Option strength branch should add 2 strength");
  assert.equal(playerById(tacticalAdded, "p2").deployedTroops, 1, "Tactical Option strength branch should not retreat troops");
  assert.equal(tacticalAdded.intrigueDiscard.at(-1).id, tacticalOption.id);
  assert.match(tacticalAdded.log[0], /plays Tactical Option for Feyd-Rautha Harkonnen, adding 2 strength/);

  const tacticalRetreatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 10, deployedTroops: 4, garrison: 1, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalRetreatCombat = state.startCombatPhase(tacticalRetreatFixture);
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 0 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 5 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject more troops than are deployed",
  );
  assert.equal(
    state.playCombatIntrigue(tacticalRetreatCombat, "p2", tacticalOption.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    tacticalRetreatCombat,
    "Tactical Option retreat branch should reject fractional troop counts",
  );
  const tacticalRetreated = state.playCombatIntrigue(
    tacticalRetreatCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 3 },
  );
  assert.equal(playerById(tacticalRetreated, "p2").deployedTroops, 1, "Tactical Option should retreat the chosen troop count");
  assert.equal(playerById(tacticalRetreated, "p2").garrison, 4, "Tactical Option should return retreated troops to garrison");
  assert.equal(playerById(tacticalRetreated, "p2").conflict, 4, "Tactical Option retreat should remove each retreated troop's strength");
  assert.match(tacticalRetreated.log[0], /retreats 3 troops/);

  const tacticalWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 10, deployedTroops: 2, deployedSandworms: 1, garrison: 0, intrigues: [tacticalOption] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const tacticalWormCombat = state.startCombatPhase(tacticalWormFixture);
  const tacticalWormRetreated = state.playCombatIntrigue(
    tacticalWormCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(tacticalWormRetreated, "p2").deployedTroops, 0, "Tactical Option should allow all troops to retreat");
  assert.equal(playerById(tacticalWormRetreated, "p2").deployedSandworms, 1, "Tactical Option should not retreat sandworms");
  assert.equal(playerById(tacticalWormRetreated, "p2").conflict, 6, "Tactical Option should preserve non-troop strength after retreat");
  assert.equal(tacticalWormRetreated.phase, "combat", "A remaining sandworm should keep the player in Combat");

  const tacticalLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [tacticalOption] }
        : player,
    ),
  );
  const tacticalLastActorCombat = state.startCombatPhase(tacticalLastActorFixture);
  const tacticalLastActorRetreated = state.playCombatIntrigue(
    tacticalLastActorCombat,
    "p2",
    tacticalOption.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(tacticalLastActorRetreated.phase, "playing", "Retreating the last Tactical Option units should resolve Combat");
  assert.equal(tacticalLastActorRetreated.round, tacticalLastActorFixture.round + 1);
  assert.ok(
    tacticalLastActorRetreated.log.some((entry) => entry.includes("resolves with no winner")),
    "Retreating the last Tactical Option units should resolve the Conflict with no winner",
  );
}
