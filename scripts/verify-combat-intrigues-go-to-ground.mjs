import assert from "node:assert/strict";
import { combatFixture, intrigueBySourceId, passCurrent, playerById } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntrigueGoToGround({
  cards: { goToGround },
  data,
  spaces: { secretsSpace, vastWealthSpace },
  state,
}) {
  const plotIntrigue = intrigueBySourceId(data, 143);
  const beneSpySpace = data.boardSpaces.find((space) => space.id === "espionage");
  assert.ok(beneSpySpace, "Espionage should be the Bene spy-post representative");
  const beneSpyPostId = state.spyObservationPostIdForSpace(secretsSpace.id);
  const goToGroundFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [goToGround] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const goToGroundCombat = state.startCombatPhase(goToGroundFixture);
  assert.equal(state.isGoToGroundIntrigue(goToGround), true, "Go To Ground should be recognized as a structured Combat Intrigue");
  assert.equal(
    state.combatIntrigueStrength(goToGroundCombat, playerById(goToGroundCombat, "p2"), goToGround),
    undefined,
    "Go To Ground should not expose fixed Combat strength",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id),
    goToGroundCombat,
    "Go To Ground should require an explicit retreat count",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, "retreat-troops"),
    goToGroundCombat,
    "Go To Ground should reject the legacy retreat branch string without an explicit troop count",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops" }),
    goToGroundCombat,
    "Go To Ground should reject malformed retreat choices without an explicit troop count",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 0 }),
    goToGroundCombat,
    "Go To Ground should reject zero troops",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 3 }),
    goToGroundCombat,
    "Go To Ground should reject more than two troops",
  );
  assert.equal(
    state.playCombatIntrigue(goToGroundCombat, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 1.5 }),
    goToGroundCombat,
    "Go To Ground should reject fractional troop counts",
  );
  const goToGroundPlayed = state.playCombatIntrigue(
    goToGroundCombat,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(goToGroundPlayed, "p2").deployedTroops, 0, "Go To Ground should retreat the chosen troop count");
  assert.equal(playerById(goToGroundPlayed, "p2").garrison, 2, "Go To Ground should return retreated troops to garrison");
  assert.equal(playerById(goToGroundPlayed, "p2").conflict, 0, "Go To Ground should remove retreated troop strength");
  assert.deepEqual(playerById(goToGroundPlayed, "p2").intrigues, [], "Go To Ground should leave the player's hand");
  assert.equal(goToGroundPlayed.intrigueDiscard.at(-1).id, goToGround.id);
  assert.deepEqual(goToGroundPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
    mustPlaceSpy: true,
  });
  assert.equal(
    goToGroundPlayed.players[goToGroundPlayed.activeSeat].id,
    "p3",
    "Go To Ground should continue with the next remaining Combat actor while spy placement is pending",
  );
  assert.equal(
    state.passCombatIntrigue(goToGroundPlayed, goToGroundPlayed.players[goToGroundPlayed.activeSeat].id),
    goToGroundPlayed,
    "Combat should stay locked while Go To Ground spy placement is pending",
  );
  assert.equal(
    state.finishPendingAction(goToGroundPlayed),
    goToGroundPlayed,
    "Go To Ground should not allow skipping mandatory spy placement",
  );
  assert.ok(
    state.placeableSpySpaces(goToGroundPlayed, goToGroundPlayed.pendingAction).some((space) => space.id === beneSpySpace.id),
    "Go To Ground should offer legal spy posts to the recipient",
  );
  const goToGroundOccupiedSpyPost = {
    ...goToGroundPlayed,
    spyPosts: { ...goToGroundPlayed.spyPosts, [beneSpyPostId]: "p3" },
  };
  assert.equal(
    state.placeSpyForPending(goToGroundOccupiedSpyPost, goToGroundOccupiedSpyPost.pendingAction, beneSpySpace.id),
    goToGroundOccupiedSpyPost,
    "Go To Ground spy placement should reject occupied spy posts",
  );
  assert.equal(
    state.placeSpyForPending(goToGroundPlayed, goToGroundPlayed.pendingAction, vastWealthSpace.id),
    goToGroundPlayed,
    "Go To Ground spy placement should reject personal Commander-board posts for an Ally",
  );
  const goToGroundSpyPlaced = state.placeSpyForPending(goToGroundPlayed, goToGroundPlayed.pendingAction, beneSpySpace.id);
  assert.equal(goToGroundSpyPlaced.pendingAction, undefined, "Placing the Go To Ground spy should clear the pending action");
  assert.equal(goToGroundSpyPlaced.phase, "combat", "Combat should resume after Go To Ground if actors remain");
  assert.equal(goToGroundSpyPlaced.players[goToGroundSpyPlaced.activeSeat].id, "p3");
  assert.equal(playerById(goToGroundSpyPlaced, "p2").spies, playerById(goToGroundPlayed, "p2").spies - 1);
  assert.equal(goToGroundSpyPlaced.spyPosts[beneSpyPostId], "p2");
  assert.match(goToGroundSpyPlaced.log[0], /places a spy near Espionage \/ Secrets from Go To Ground/);

  const goToGroundOneTroopFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 7, deployedTroops: 2, garrison: 1, intrigues: [goToGround] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const goToGroundOneTroop = state.startCombatPhase(goToGroundOneTroopFixture);
  const goToGroundOneTroopOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 5, deployedTroops: 1, garrison: 0, intrigues: [goToGround] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const goToGroundOneTroopOnly = state.startCombatPhase(goToGroundOneTroopOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(goToGroundOneTroopOnly, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 2 }),
    goToGroundOneTroopOnly,
    "Go To Ground should reject retreating more troops than the recipient has",
  );
  const goToGroundRetreatedOne = state.playCombatIntrigue(
    goToGroundOneTroop,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(goToGroundRetreatedOne, "p2").deployedTroops, 1, "Go To Ground should allow retreating one troop");
  assert.equal(playerById(goToGroundRetreatedOne, "p2").garrison, 2);
  assert.equal(playerById(goToGroundRetreatedOne, "p2").conflict, 5);
  assert.deepEqual(goToGroundRetreatedOne.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
    mustPlaceSpy: true,
  });

  const goToGroundWormOnlyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 3, deployedTroops: 0, deployedSandworms: 1, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundWormOnly = state.startCombatPhase(goToGroundWormOnlyFixture);
  assert.equal(
    state.playCombatIntrigue(goToGroundWormOnly, "p2", goToGround.id, undefined, { kind: "retreat-troops", count: 1 }),
    goToGroundWormOnly,
    "Go To Ground should reject a sandworm-only recipient with no troops to retreat",
  );

  const goToGroundMixedWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 4,
            deployedTroops: 1,
            deployedSandworms: 1,
            spies: 0,
            intrigues: [goToGround, plotIntrigue],
          }
        : player.id === "p3"
          ? { ...player, conflict: 1, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const goToGroundMixedWorm = state.startCombatPhase(goToGroundMixedWormFixture);
  const goToGroundMixedWormPlayed = state.playCombatIntrigue(
    goToGroundMixedWorm,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 1 },
  );
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").deployedTroops, 0, "Go To Ground should retreat troops from a mixed troop/sandworm force");
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").deployedSandworms, 1, "Go To Ground should not retreat sandworms");
  assert.equal(playerById(goToGroundMixedWormPlayed, "p2").conflict, 2, "Go To Ground should only remove troop strength from a mixed troop/sandworm force");
  assert.equal(goToGroundMixedWormPlayed.phase, "combat", "A remaining sandworm should keep the recipient in Combat");
  assert.ok(
    state.combatIntrigueActorIds(goToGroundMixedWormPlayed).includes("p2"),
    "A recipient with only sandworms left should remain a Combat actor",
  );
  let goToGroundMixedWormResolved = goToGroundMixedWormPlayed;
  for (let passCount = 0; passCount < 10 && goToGroundMixedWormResolved.phase === "combat"; passCount += 1) {
    goToGroundMixedWormResolved = passCurrent(state, goToGroundMixedWormResolved);
  }
  assert.equal(goToGroundMixedWormResolved.phase, "playing", "Combat should resolve after the mixed sandworm survivor passes");
  assert.ok(
    playerById(goToGroundMixedWormResolved, "p2").wonConflicts.some((conflict) => conflict.sourceId === goToGroundMixedWormFixture.conflict.sourceId),
    "A sandworm survivor with remaining strength should still be eligible to win the Conflict",
  );

  const goToGroundNoSpyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 0, intrigues: [goToGround] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const goToGroundNoSpy = state.startCombatPhase(goToGroundNoSpyFixture);
  const goToGroundNoSpyPlayed = state.playCombatIntrigue(
    goToGroundNoSpy,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoSpyPlayed.pendingAction, undefined, "Go To Ground should not queue spy placement with no spies in supply");
  assert.equal(goToGroundNoSpyPlayed.phase, "combat", "Combat should continue with remaining actors after a no-spy Go To Ground");
  assert.equal(goToGroundNoSpyPlayed.players[goToGroundNoSpyPlayed.activeSeat].id, "p3");
  assert.match(goToGroundNoSpyPlayed.log[0], /retreats 2 troops\./);

  const occupiedNonPersonalSpyPosts = Object.fromEntries(
    data.boardSpaces.filter((space) => !space.personal).map((space) => [space.id, "p3"]),
  );
  const goToGroundNoLegalSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 3, intrigues: [goToGround] }
        : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
            : player,
      ),
    ),
    spyPosts: occupiedNonPersonalSpyPosts,
  };
  const goToGroundNoLegalSpy = state.startCombatPhase(goToGroundNoLegalSpyFixture);
  assert.deepEqual(
    state.placeableSpySpaces(goToGroundNoLegalSpy, { kind: "spy", ownerId: "p2", remaining: 1, source: "Go To Ground" }),
    [],
    "Test fixture should leave the Go To Ground recipient with spies but no legal spy posts",
  );
  const goToGroundNoLegalSpyPlayed = state.playCombatIntrigue(
    goToGroundNoLegalSpy,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoLegalSpyPlayed.pendingAction, undefined, "Go To Ground should not queue spy placement when every legal post is occupied");
  assert.equal(goToGroundNoLegalSpyPlayed.phase, "combat", "Combat should continue when Go To Ground has spies but no legal spy post");
  assert.equal(goToGroundNoLegalSpyPlayed.players[goToGroundNoLegalSpyPlayed.activeSeat].id, "p3");
  assert.match(goToGroundNoLegalSpyPlayed.log[0], /retreats 2 troops\./);

  const goToGroundNoSpyLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, spies: 0, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundNoSpyLastActor = state.startCombatPhase(goToGroundNoSpyLastActorFixture);
  const goToGroundNoSpyLastActorPlayed = state.playCombatIntrigue(
    goToGroundNoSpyLastActor,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundNoSpyLastActorPlayed.phase, "playing", "Go To Ground should resolve empty Combat immediately when no spy can be placed");
  assert.equal(goToGroundNoSpyLastActorPlayed.round, goToGroundNoSpyLastActorFixture.round + 1);
  assert.ok(
    goToGroundNoSpyLastActorPlayed.log.some((entry) => entry.includes("resolves with no winner")),
    "Go To Ground should resolve with no winner when the last units retreat and no spy is pending",
  );

  const goToGroundLastActorFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0, intrigues: [goToGround] }
        : player,
    ),
  );
  const goToGroundLastActor = state.startCombatPhase(goToGroundLastActorFixture);
  const goToGroundLastActorPlayed = state.playCombatIntrigue(
    goToGroundLastActor,
    "p2",
    goToGround.id,
    undefined,
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(goToGroundLastActorPlayed.phase, "combat", "Go To Ground should keep Combat open while spy placement is pending");
  assert.deepEqual(goToGroundLastActorPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    source: "Go To Ground",
    mustPlaceSpy: true,
  });
  assert.deepEqual(
    state.combatIntrigueActorIds(goToGroundLastActorPlayed),
    [],
    "Go To Ground may leave no Combat actors before the spy choice resolves",
  );
  const goToGroundLastActorSpyPlaced = state.placeSpyForPending(
    goToGroundLastActorPlayed,
    goToGroundLastActorPlayed.pendingAction,
    beneSpySpace.id,
  );
  assert.equal(goToGroundLastActorSpyPlaced.phase, "playing", "Placing the pending spy should then resolve empty Combat");
  assert.equal(goToGroundLastActorSpyPlaced.round, goToGroundLastActorFixture.round + 1);
  assert.equal(goToGroundLastActorSpyPlaced.spyPosts[beneSpyPostId], "p2");
  assert.ok(
    goToGroundLastActorSpyPlaced.log.some((entry) => entry.includes("resolves with no winner")),
    "Go To Ground should resolve the Conflict with no winner after the last units retreat and the spy resolves",
  );
  assert.equal(
    state.finishPendingAction(goToGroundLastActorPlayed),
    goToGroundLastActorPlayed,
    "Go To Ground should reject skipping the mandatory pending spy",
  );
}
