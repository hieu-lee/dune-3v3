import assert from "node:assert/strict";
import { combatFixture, intrigueBySourceId, playerById, starterCard } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntriguePendingActions({
  cards: { devour, questionableMethods, springTheTrap, verifierCombat },
  data,
  spaces: { espionageSpace, secretsSpace },
  state,
}) {
  const plotIntrigue = intrigueBySourceId(data, 143);
  const arrakeenSpace = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeenSpace, "Arrakeen should exist for Spring The Trap spy fixtures");
  const arrakeenPostId = state.spyObservationPostIdForSpace(arrakeenSpace.id);
  const benePostId = state.spyObservationPostIdForSpace(secretsSpace.id);
  const questionableNoInfluenceFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [questionableMethods] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const questionableNoInfluence = state.startCombatPhase(questionableNoInfluenceFixture);
  assert.equal(
    state.combatIntrigueStrength(questionableNoInfluence, playerById(questionableNoInfluence, "p2"), questionableMethods),
    1,
    "Questionable Methods should add its base 1 strength before any Influence loss",
  );
  const questionableNoInfluencePlayed = state.playCombatIntrigue(
    questionableNoInfluence,
    "p2",
    questionableMethods.id,
  );
  assert.equal(playerById(questionableNoInfluencePlayed, "p2").conflict, 3);
  assert.equal(
    questionableNoInfluencePlayed.pendingAction,
    undefined,
    "Questionable Methods should not queue Influence loss when the recipient has no Influence",
  );
  assert.equal(questionableNoInfluencePlayed.intrigueDiscard.at(-1).id, questionableMethods.id);
  assert.match(questionableNoInfluencePlayed.log[0], /plays Questionable Methods for Feyd-Rautha Harkonnen, adding 1 strength/);

  const questionableInfluenceFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            intrigues: [questionableMethods],
            influence: { ...player.influence, bene: 2 },
            vp: 1,
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
          : player,
    ),
  );
  const questionableInfluence = state.startCombatPhase(questionableInfluenceFixture);
  const questionableInfluencePlayed = state.playCombatIntrigue(questionableInfluence, "p2", questionableMethods.id);
  assert.equal(playerById(questionableInfluencePlayed, "p2").conflict, 3, "Questionable Methods should add base strength immediately");
  assert.deepEqual(questionableInfluencePlayed.pendingAction, {
    kind: "lose-influence",
    ownerId: "p2",
    combatRecipientId: "p2",
    strength: 4,
    source: "Questionable Methods",
    optional: true,
  });
  assert.deepEqual(
    state.influenceLossChoices(playerById(questionableInfluencePlayed, "p2")),
    ["bene"],
    "Questionable Methods should list only positive Influence tracks",
  );
  assert.deepEqual(
    state.influenceLossOptions(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction),
    [{ ownerId: "p2", faction: "bene" }],
    "Questionable Methods should expose Influence-loss owner choices",
  );
  assert.equal(
    state.passCombatIntrigue(questionableInfluencePlayed, questionableInfluencePlayed.players[questionableInfluencePlayed.activeSeat].id),
    questionableInfluencePlayed,
    "Combat should stay locked while Questionable Methods Influence loss is pending",
  );
  assert.equal(
    state.playCombatIntrigue(questionableInfluencePlayed, questionableInfluencePlayed.players[questionableInfluencePlayed.activeSeat].id, verifierCombat.id),
    questionableInfluencePlayed,
    "Additional Combat Intrigues should wait for Questionable Methods Influence loss to resolve",
  );
  assert.equal(
    state.loseInfluenceForPending(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction, "p2", "emperor"),
    questionableInfluencePlayed,
    "Questionable Methods should reject Influence tracks the recipient cannot lose",
  );
  assert.equal(
    state.loseInfluenceForPending(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction, "missing", "bene"),
    questionableInfluencePlayed,
    "Questionable Methods should reject missing Influence-loss owners without advancing pending actions",
  );
  assert.equal(
    state.loseInfluenceForPending(
      questionableInfluencePlayed,
      { ...questionableInfluencePlayed.pendingAction, combatRecipientId: "missing" },
      "p2",
      "bene",
    ),
    questionableInfluencePlayed,
    "Questionable Methods should reject stale or forged pending actions",
  );
  const questionableMissingRecipientState = {
    ...questionableInfluencePlayed,
    pendingAction: { ...questionableInfluencePlayed.pendingAction, combatRecipientId: "missing" },
  };
  assert.equal(
    state.loseInfluenceForPending(
      questionableMissingRecipientState,
      questionableMissingRecipientState.pendingAction,
      "p2",
      "bene",
    ),
    questionableMissingRecipientState,
    "Questionable Methods should reject missing combat recipients without advancing pending actions",
  );
  const questionableActiveSeatAfterPlay = questionableInfluencePlayed.activeSeat;
  const questionableSkipped = state.skipLoseInfluence(questionableInfluencePlayed, questionableInfluencePlayed.pendingAction);
  assert.equal(questionableSkipped.pendingAction, undefined, "Skipping Questionable Methods should clear the pending action");
  assert.equal(questionableSkipped.activeSeat, questionableActiveSeatAfterPlay, "Skipping Questionable Methods should not advance Combat again");
  assert.equal(playerById(questionableSkipped, "p2").influence.bene, 2, "Skipping Questionable Methods should keep Influence");
  assert.equal(playerById(questionableSkipped, "p2").conflict, 3, "Skipping Questionable Methods should keep only the base strength");
  assert.match(questionableSkipped.log[0], /No Influence is lost for Questionable Methods/);
  const questionableLostInfluence = state.loseInfluenceForPending(
    questionableInfluencePlayed,
    questionableInfluencePlayed.pendingAction,
    "p2",
    "bene",
  );
  assert.equal(questionableLostInfluence.pendingAction, undefined, "Resolving Questionable Methods should clear the pending action");
  assert.equal(questionableLostInfluence.activeSeat, questionableActiveSeatAfterPlay, "Resolving Questionable Methods should not advance Combat again");
  assert.equal(playerById(questionableLostInfluence, "p2").influence.bene, 1, "Questionable Methods should remove 1 Influence");
  assert.equal(playerById(questionableLostInfluence, "p2").vp, 0, "Questionable Methods should remove the Influence threshold VP");
  assert.equal(playerById(questionableLostInfluence, "p2").conflict, 7, "Questionable Methods Influence loss should add 4 strength");
  assert.match(questionableLostInfluence.log[0], /loses 1 Bene Gesserit Influence for Questionable Methods, adding 4 strength/);

  const springTheTrapOneSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 2, intrigues: [springTheTrap] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1 }
            : player,
      ),
    ),
    spyPosts: { [benePostId]: "p2" },
  };
  const springTheTrapOneSpy = state.startCombatPhase(springTheTrapOneSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(springTheTrapOneSpy, playerById(springTheTrapOneSpy, "p2"), springTheTrap),
    undefined,
    "Spring The Trap should require two actor-owned spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapOneSpy, "p2", springTheTrap.id),
    springTheTrapOneSpy,
    "Spring The Trap should not play with only one actor-owned spy post",
  );
  const springTheTrapMixedSpy = {
    ...springTheTrapOneSpy,
    spyPosts: { [benePostId]: "p2", [arrakeenPostId]: "p3" },
  };
  assert.equal(
    state.combatIntrigueStrength(springTheTrapMixedSpy, playerById(springTheTrapMixedSpy, "p2"), springTheTrap),
    undefined,
    "Spring The Trap should not count another player's spy post",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapMixedSpy, "p2", springTheTrap.id),
    springTheTrapMixedSpy,
    "Spring The Trap should stay blocked with mixed spy ownership",
  );

  const springTheTrapTwoSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 1, intrigues: [springTheTrap] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
            : player,
      ),
    ),
    spyPosts: { [benePostId]: "p2", [arrakeenPostId]: "p2" },
  };
  const springTheTrapTwoSpy = state.startCombatPhase(springTheTrapTwoSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(springTheTrapTwoSpy, playerById(springTheTrapTwoSpy, "p2"), springTheTrap),
    7,
    "Spring The Trap should become playable with two actor-owned spy posts",
  );
  const springTheTrapPlayed = state.playCombatIntrigue(springTheTrapTwoSpy, "p2", springTheTrap.id);
  assert.deepEqual(playerById(springTheTrapPlayed, "p2").intrigues, [], "Spring The Trap should leave the player's hand");
  assert.equal(springTheTrapPlayed.intrigueDiscard.at(-1).id, springTheTrap.id, "Spring The Trap should be discarded when played");
  assert.equal(playerById(springTheTrapPlayed, "p2").conflict, 2, "Spring The Trap should not add strength before recalls resolve");
  assert.deepEqual(springTheTrapPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 2,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  assert.deepEqual(
    state.recallableSpySpaces(springTheTrapPlayed, springTheTrapPlayed.pendingAction).map((space) => space.name),
    ["Arrakeen", "Espionage"],
    "Spring The Trap should list the actor's two spy posts for recall",
  );
  assert.equal(
    state.skipRecallSpy(springTheTrapPlayed, springTheTrapPlayed.pendingAction),
    springTheTrapPlayed,
    "Spring The Trap recall should be required",
  );
  assert.equal(
    state.passCombatIntrigue(springTheTrapPlayed, springTheTrapPlayed.players[springTheTrapPlayed.activeSeat].id),
    springTheTrapPlayed,
    "Combat should stay locked while Spring The Trap recall is pending",
  );
  assert.equal(
    state.playCombatIntrigue(springTheTrapPlayed, springTheTrapPlayed.players[springTheTrapPlayed.activeSeat].id, verifierCombat.id),
    springTheTrapPlayed,
    "Additional Combat Intrigues should wait for Spring The Trap recall to resolve",
  );
  const springActiveSeatAfterPlay = springTheTrapPlayed.activeSeat;
  const springFirstRecall = state.recallSpyForPending(springTheTrapPlayed, springTheTrapPlayed.pendingAction, espionageSpace.id);
  assert.equal(springFirstRecall.activeSeat, springActiveSeatAfterPlay, "First Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springFirstRecall, "p2").spies, 2, "First Spring The Trap recall should return one spy to supply");
  assert.equal(playerById(springFirstRecall, "p2").conflict, 2, "First Spring The Trap recall should not add partial strength");
  assert.equal(springFirstRecall.spyPosts[benePostId], undefined);
  assert.equal(springFirstRecall.spyPosts[arrakeenPostId], "p2");
  assert.deepEqual(springFirstRecall.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 1,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  const springSecondRecall = state.recallSpyForPending(springFirstRecall, springFirstRecall.pendingAction, arrakeenSpace.id);
  assert.equal(springSecondRecall.pendingAction, undefined, "Second Spring The Trap recall should clear the pending action");
  assert.equal(springSecondRecall.activeSeat, springActiveSeatAfterPlay, "Second Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springSecondRecall, "p2").spies, 3, "Spring The Trap should return both recalled spies to supply");
  assert.equal(springSecondRecall.spyPosts[arrakeenPostId], undefined);
  assert.equal(playerById(springSecondRecall, "p2").conflict, 9, "Spring The Trap should add 7 strength after the second recall");
  assert.match(springSecondRecall.log[0], /recalls a spy from Arrakeen \/ Spice Refinery for Spring The Trap, adding 7 strength/);

  const devourNoWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, deployedSandworms: 0, intrigues: [devour] }
      : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const devourNoWorm = state.startCombatPhase(devourNoWormFixture);
  assert.equal(
    state.combatIntrigueStrength(devourNoWorm, playerById(devourNoWorm, "p2"), devour),
    2,
    "Devour should add 2 strength without a sandworm in the recipient's Conflict",
  );
  const devourNoWormPlayed = state.playCombatIntrigue(devourNoWorm, "p2", devour.id);
  assert.equal(playerById(devourNoWormPlayed, "p2").conflict, 4);
  assert.equal(devourNoWormPlayed.pendingAction, undefined, "Devour should not offer trash without a sandworm");
  assert.equal(devourNoWormPlayed.intrigueDiscard.at(-1).id, devour.id);
  assert.match(devourNoWormPlayed.log[0], /plays Devour for Feyd-Rautha Harkonnen, adding 2 strength/);

  const devourTrashChoice = starterCard(data, 0);
  const devourWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            deployedSandworms: 1,
            playArea: [devourTrashChoice],
            intrigues: [devour],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const devourWorm = state.startCombatPhase(devourWormFixture);
  assert.equal(
    state.combatIntrigueStrength(devourWorm, playerById(devourWorm, "p2"), devour),
    4,
    "Devour should add 4 strength when the recipient has a sandworm in the Conflict",
  );
  const devourWormPlayed = state.playCombatIntrigue(devourWorm, "p2", devour.id);
  assert.equal(playerById(devourWormPlayed, "p2").conflict, 6);
  assert.deepEqual(devourWormPlayed.pendingAction, {
    kind: "trash-card",
    ownerId: "p2",
    source: "Devour",
    optional: true,
  });
  assert.match(devourWormPlayed.log[0], /adding 4 strength and may trash a card/);
  assert.ok(devourWormPlayed.pendingAction, "Devour should queue an optional trash choice");
  assert.equal(
    state.passCombatIntrigue(devourWormPlayed, devourWormPlayed.players[devourWormPlayed.activeSeat].id),
    devourWormPlayed,
    "Combat should stay locked while Devour trash is pending",
  );
  assert.equal(
    state.playCombatIntrigue(devourWormPlayed, devourWormPlayed.players[devourWormPlayed.activeSeat].id, verifierCombat.id),
    devourWormPlayed,
    "Additional Combat Intrigues should wait for Devour trash to resolve",
  );
  const devourActiveSeatAfterPlay = devourWormPlayed.activeSeat;
  const devourSkipped = state.skipTrashCard(devourWormPlayed, devourWormPlayed.pendingAction);
  assert.equal(devourSkipped.pendingAction, undefined, "Skipping Devour trash should clear the pending action");
  assert.equal(devourSkipped.activeSeat, devourActiveSeatAfterPlay, "Skipping Devour trash should not advance Combat again");
  assert.equal(playerById(devourSkipped, "p2").playArea.length, 1, "Skipping Devour trash should keep the card");
  assert.match(devourSkipped.log[0], /declines to trash a card from Devour/);
  const devourTrashed = state.trashPlayerCard(devourWormPlayed, devourWormPlayed.pendingAction, "playArea", devourTrashChoice.id);
  assert.equal(devourTrashed.pendingAction, undefined, "Trashing from Devour should clear the pending action");
  assert.equal(devourTrashed.activeSeat, devourActiveSeatAfterPlay, "Resolving Devour trash should not advance Combat again");
  assert.deepEqual(playerById(devourTrashed, "p2").playArea, []);
  assert.ok(
    devourTrashed.log[0].includes(`trashes ${devourTrashChoice.name} from Devour`),
    "Devour trash should log the selected card",
  );

  const devourHandTrashChoice = starterCard(data, 2);
  const devourHandFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            deployedSandworms: 1,
            hand: [devourHandTrashChoice],
            intrigues: [devour],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const devourHand = state.startCombatPhase(devourHandFixture);
  const devourHandPlayed = state.playCombatIntrigue(devourHand, "p2", devour.id);
  assert.ok(devourHandPlayed.pendingAction, "Devour should queue trash when the only eligible card is in hand");
  const devourHandTrashed = state.trashPlayerCard(
    devourHandPlayed,
    devourHandPlayed.pendingAction,
    "hand",
    devourHandTrashChoice.id,
  );
  assert.deepEqual(playerById(devourHandTrashed, "p2").hand, [], "Devour should trash from hand when selected");
}
