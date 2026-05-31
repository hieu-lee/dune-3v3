import assert from "node:assert/strict";
import { combatFixture, passCurrent, playerById } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntriguePhaseFlow({ data, state }) {
  const twoTeamConflict = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1 };
      if (player.id === "p3") return { ...player, conflict: 4, deployedTroops: 1 };
      return player;
    }),
  );
  const combat = state.startCombatPhase(twoTeamConflict);
  assert.equal(combat.phase, "combat", "Finished player turns should open a Combat phase before conflict resolution");
  assert.equal(combat.players[combat.activeSeat].id, "p2", "Combat should start at the first eligible seat from the marker");
  assert.deepEqual(
    state.combatIntrigueActorIds(combat),
    ["p1", "p2", "p3", "p4"],
    "Allies in conflict and their Commanders should receive Combat Intrigue opportunities",
  );
  assert.deepEqual(combat.combatPasses, [], "Starting Combat should clear stale pass state");
  assert.equal(playerById(combat, "p3").wonConflicts.length, 0, "Conflict should not resolve before Combat passes");

  const pendingCombat = {
    ...twoTeamConflict,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Verifier" },
  };
  assert.equal(
    state.startCombatPhase(pendingCombat),
    pendingCombat,
    "Combat should not clear unresolved pending actions",
  );
  assert.equal(
    state.maybeStartCombatPhase(pendingCombat),
    pendingCombat,
    "Automatic Combat transition should wait for pending actions",
  );
  const pendingResolvedRevealTurn = { ...pendingCombat, pendingAction: undefined };
  assert.equal(
    state.maybeStartCombatPhase(pendingResolvedRevealTurn),
    pendingResolvedRevealTurn,
    "Automatic Combat transition should wait for the active revealed player to end their Reveal turn",
  );
  assert.equal(
    state.startCombatPhase(pendingResolvedRevealTurn).phase,
    "combat",
    "Explicit Reveal end should start Combat once the pending queue is empty",
  );
  const revealAdjust = {
    kind: "reveal-adjust",
    ownerId: "p2",
    combatRecipientId: "p2",
    cards: ["Verifier printed reveal"],
    persuasionAdjustment: 0,
    strengthAdjustment: 0,
    source: "Verifier",
  };
  const revealAdjustPendingCombat = { ...twoTeamConflict, pendingAction: revealAdjust };
  assert.equal(
    state.maybeStartCombatPhase(revealAdjustPendingCombat),
    revealAdjustPendingCombat,
    "Reveal-adjust pending actions should preserve the reveal/buy window until the player ends reveal",
  );
  const revealAdjustFinished = state.finishRevealAdjustment(revealAdjustPendingCombat, revealAdjust);
  assert.equal(revealAdjustFinished.phase, "playing", "Finishing reveal adjustment should not enter Combat automatically");
  assert.equal(revealAdjustFinished.pendingAction, undefined);
  assert.match(revealAdjustFinished.log[0], /Printed reveal adjustment resolved/);

  const p2Pass = passCurrent(state, combat);
  assert.equal(p2Pass.players[p2Pass.activeSeat].id, "p3", "Passing should advance clockwise to the next actor");
  assert.deepEqual(p2Pass.combatPasses, ["p2"]);
  const p3Pass = passCurrent(state, p2Pass);
  const p4Pass = passCurrent(state, p3Pass);
  const allPassed = passCurrent(state, p4Pass);
  assert.equal(allPassed.phase, "playing", "Consecutive passes from every Combat actor should resolve the conflict");
  assert.equal(allPassed.round, twoTeamConflict.round + 1);
  assert.equal(playerById(allPassed, "p3").wonConflicts.length, 1, "Highest eligible Ally should take the Conflict after passes");
  assert.equal(playerById(allPassed, "p3").wonConflicts[0].sourceId, 454);
  assert.equal(playerById(allPassed, "p3").conflict, 0, "Round advancement should clear conflict strength");
}
