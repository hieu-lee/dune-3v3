import assert from "node:assert/strict";
import { combatFixture, playerById } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntrigueReachAgreement({ cards: { reachAgreement }, data, state }) {
  const reachAgreementContract = data.standardContracts[0];
  const reachAgreementReplacement = data.standardContracts[1];
  const reachAgreementFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [reachAgreement] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    contractOffer: [reachAgreementContract],
    contractDeck: [reachAgreementReplacement],
  };
  const reachAgreementCombat = state.startCombatPhase(reachAgreementFixture);
  assert.equal(
    state.combatIntrigueStrength(reachAgreementCombat, playerById(reachAgreementCombat, "p2"), reachAgreement),
    undefined,
    "Reach Agreement should not expose fixed Combat strength",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id),
    reachAgreementCombat,
    "Reach Agreement should require an explicit retreat count",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 0 }),
    reachAgreementCombat,
    "Reach Agreement should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 3 }),
    reachAgreementCombat,
    "Reach Agreement should reject more than two troops",
  );
  assert.equal(
    state.playCombatIntrigue(reachAgreementCombat, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    reachAgreementCombat,
    "Reach Agreement should reject fractional troop counts",
  );
  const reachAgreementPlayed = state.playCombatIntrigue(
    reachAgreementCombat,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(reachAgreementPlayed, "p2").deployedTroops, 0, "Reach Agreement should retreat the chosen troop count");
  assert.equal(playerById(reachAgreementPlayed, "p2").garrison, 2, "Reach Agreement should return retreated troops to garrison");
  assert.equal(playerById(reachAgreementPlayed, "p2").conflict, 0, "Reach Agreement should remove retreated troop strength");
  assert.deepEqual(playerById(reachAgreementPlayed, "p2").intrigues, [], "Reach Agreement should leave the player's hand");
  assert.equal(reachAgreementPlayed.intrigueDiscard.at(-1).id, reachAgreement.id);
  assert.deepEqual(reachAgreementPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p2",
    source: "Reach Agreement",
  });
  assert.equal(
    reachAgreementPlayed.players[reachAgreementPlayed.activeSeat].id,
    "p3",
    "Reach Agreement should continue with the next remaining Combat actor while the contract choice is pending",
  );
  assert.equal(
    state.passCombatIntrigue(reachAgreementPlayed, reachAgreementPlayed.players[reachAgreementPlayed.activeSeat].id),
    reachAgreementPlayed,
    "Combat should stay locked while Reach Agreement contract pickup is pending",
  );
  const reachAgreementTookContract = state.takeChoamContract(
    reachAgreementPlayed,
    reachAgreementPlayed.pendingAction,
    reachAgreementContract.id,
  );
  assert.equal(reachAgreementTookContract.pendingAction, undefined, "Taking the Reach Agreement contract should clear the pending action");
  assert.equal(reachAgreementTookContract.phase, "combat", "Combat should resume after Reach Agreement if actors remain");
  assert.equal(reachAgreementTookContract.players[reachAgreementTookContract.activeSeat].id, "p3");
  assert.equal(playerById(reachAgreementTookContract, "p2").contracts.at(-1).card.id, reachAgreementContract.id);
  assert.equal(playerById(reachAgreementTookContract, "p2").contracts.at(-1).takenAtSpaceId, undefined);
  assert.deepEqual(reachAgreementTookContract.contractOffer.map((contract) => contract.id), [reachAgreementReplacement.id]);
  assert.deepEqual(reachAgreementTookContract.contractDeck, []);
  assert.match(reachAgreementTookContract.log[0], /takes the .* CHOAM contract from Reach Agreement/);

  const reachAgreementOneTroopFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 7, deployedTroops: 2, garrison: 1, intrigues: [reachAgreement] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    contractOffer: [],
    contractDeck: [],
  };
  const reachAgreementOneTroop = state.startCombatPhase(reachAgreementOneTroopFixture);
  const reachAgreementRetreatedOne = state.playCombatIntrigue(
    reachAgreementOneTroop,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").deployedTroops, 1, "Reach Agreement should allow retreating one troop");
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").garrison, 2);
  assert.equal(playerById(reachAgreementRetreatedOne, "p2").conflict, 5);
  const reachAgreementFallback = state.collectChoamContractFallback(
    reachAgreementRetreatedOne,
    reachAgreementRetreatedOne.pendingAction,
  );
  assert.equal(playerById(reachAgreementFallback, "p2").resources.solari, playerById(reachAgreementRetreatedOne, "p2").resources.solari + 2);
  assert.equal(reachAgreementFallback.pendingAction, undefined, "Reach Agreement should fall back to 2 Solari when no contracts remain");
  assert.match(reachAgreementFallback.log[0], /gains 2 Solari from Reach Agreement/);

  const reachAgreementWormOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 3, deployedTroops: 0, deployedSandworms: 1, intrigues: [reachAgreement] }
        : player,
    ),
  );
  const reachAgreementWormOnly = state.startCombatPhase(reachAgreementWormOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(reachAgreementWormOnly, "p2", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1 }),
    reachAgreementWormOnly,
    "Reach Agreement should reject a sandworm-only recipient with no troops to retreat",
  );

  const reachAgreementLastActorContract = data.standardContracts[2];
  const reachAgreementLastActorFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [reachAgreement] }
          : player,
      ),
    ),
    contractOffer: [reachAgreementLastActorContract],
    contractDeck: [],
  };
  const reachAgreementLastActor = state.startCombatPhase(reachAgreementLastActorFixture);
  const reachAgreementLastActorPlayed = state.playCombatIntrigue(
    reachAgreementLastActor,
    "p2",
    reachAgreement.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(reachAgreementLastActorPlayed.phase, "combat", "Reach Agreement should keep Combat open while its contract is pending");
  assert.deepEqual(reachAgreementLastActorPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p2",
    source: "Reach Agreement",
  });
  assert.equal(playerById(reachAgreementLastActorPlayed, "p2").deployedTroops, 0);
  assert.deepEqual(
    state.combatIntrigueActorIds(reachAgreementLastActorPlayed),
    [],
    "Reach Agreement may leave no Combat actors before the contract is chosen",
  );
  const reachAgreementLastActorTookContract = state.takeChoamContract(
    reachAgreementLastActorPlayed,
    reachAgreementLastActorPlayed.pendingAction,
    reachAgreementLastActorContract.id,
  );
  assert.equal(reachAgreementLastActorTookContract.phase, "playing", "Taking the pending contract should then resolve empty Combat");
  assert.equal(reachAgreementLastActorTookContract.round, reachAgreementLastActorFixture.round + 1);
  assert.equal(playerById(reachAgreementLastActorTookContract, "p2").contracts.at(-1).card.id, reachAgreementLastActorContract.id);
  assert.ok(
    reachAgreementLastActorTookContract.log.some((entry) => entry.includes("resolves with no winner")),
    "Reach Agreement should resolve the Conflict with no winner after the last units retreat and the contract resolves",
  );
}
