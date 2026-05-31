import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyCombatIntrigueBasicPlays } from "./verify-combat-intrigues-basic-plays.mjs";
import { verifyCombatIntrigueCatalog } from "./verify-combat-intrigues-catalog.mjs";
import { verifyCombatIntrigueGoToGround } from "./verify-combat-intrigues-go-to-ground.mjs";
import { verifyCombatIntrigueReachAgreement } from "./verify-combat-intrigues-reach-agreement.mjs";
import { verifyCombatIntrigueRetreatBranches } from "./verify-combat-intrigues-retreat-branches.mjs";
import {
  boardSpaceByName,
  combatFixture,
  completedContract,
  incompleteContract,
  intrigueBySourceId,
  passCurrent,
  playerById,
  starterCard,
} from "./verify-combat-intrigues-fixtures.mjs";
import { verifyCombatIntriguePhaseFlow } from "./verify-combat-intrigues-phase.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const lowCostImperiumCard = data.imperiumDeck.find((card) => (card.cost ?? 0) <= 3);
  const replacementImperiumCard = data.imperiumDeck.find((card) => card.id !== lowCostImperiumCard?.id);
  assert.ok(lowCostImperiumCard, "Expected an Imperium Row card that costs 3 or less");
  assert.ok(replacementImperiumCard, "Expected an Imperium Row replacement card");

  const impress = intrigueBySourceId(data, 152);
  const findWeakness = intrigueBySourceId(data, 149);
  const goToGround = intrigueBySourceId(data, 146);
  const spiceIsPower = intrigueBySourceId(data, 150);
  const questionableMethods = intrigueBySourceId(data, 156);
  const springTheTrap = intrigueBySourceId(data, 153);
  const tacticalOption = intrigueBySourceId(data, 155);
  const reachAgreement = intrigueBySourceId(data, 449);
  const weirdingCombat = intrigueBySourceId(data, 154);
  const contingencyPlan = intrigueBySourceId(data, 147);
  const devour = intrigueBySourceId(data, 151);
  const backedByChoam = intrigueBySourceId(data, 448);
  const mercenaries = intrigueBySourceId(data, 128);
  const espionageSpace = boardSpaceByName(data, "Espionage");
  const secretsSpace = boardSpaceByName(data, "Secrets");
  const vastWealthSpace = boardSpaceByName(data, "Vast Wealth");
  const arrakeenSpace = boardSpaceByName(data, "Arrakeen");
  verifyCombatIntrigueCatalog({
    cards: {
      backedByChoam,
      contingencyPlan,
      devour,
      findWeakness,
      goToGround,
      impress,
      mercenaries,
      questionableMethods,
      reachAgreement,
      spiceIsPower,
      springTheTrap,
      tacticalOption,
      weirdingCombat,
    },
    data,
    state,
  });
  const verifierCombat = {
    ...impress,
    id: "intrigue-verifier-auto-combat",
    name: "Verifier Combat",
    automatedCombatSwords: 2,
  };
  verifyCombatIntriguePhaseFlow({ data, state });
  verifyCombatIntrigueBasicPlays({
    cards: { contingencyPlan, impress, verifierCombat },
    data,
    marketCards: { lowCostImperiumCard, replacementImperiumCard },
    state,
  });
  verifyCombatIntrigueRetreatBranches({
    cards: { spiceIsPower, tacticalOption },
    data,
    state,
  });
  verifyCombatIntrigueReachAgreement({
    cards: { reachAgreement },
    data,
    state,
  });
  verifyCombatIntrigueGoToGround({
    cards: { goToGround },
    data,
    spaces: { secretsSpace, vastWealthSpace },
    state,
  });

  const weirdingFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [weirdingCombat] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const weirdingLow = state.startCombatPhase(weirdingFixture);
  assert.equal(
    state.combatIntrigueStrength(weirdingLow, playerById(weirdingLow, "p2"), weirdingCombat),
    3,
    "Weirding Combat should add 3 strength below the Bene Gesserit threshold",
  );
  const weirdingLowPlayed = state.playCombatIntrigue(weirdingLow, "p2", weirdingCombat.id);
  assert.equal(playerById(weirdingLowPlayed, "p2").conflict, 5);
  assert.equal(weirdingLowPlayed.intrigueDiscard.at(-1).id, weirdingCombat.id);
  assert.match(weirdingLowPlayed.log[0], /plays Weirding Combat for Feyd-Rautha Harkonnen, adding 3 strength/);

  const weirdingHighFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            influence: { ...player.influence, bene: 3 },
            intrigues: [weirdingCombat],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const weirdingHigh = state.startCombatPhase(weirdingHighFixture);
  assert.equal(
    state.combatIntrigueStrength(weirdingHigh, playerById(weirdingHigh, "p2"), weirdingCombat),
    5,
    "Weirding Combat should add 5 strength at 3+ Bene Gesserit Influence",
  );
  const weirdingHighPlayed = state.playCombatIntrigue(weirdingHigh, "p2", weirdingCombat.id);
  assert.equal(playerById(weirdingHighPlayed, "p2").conflict, 7);
  assert.match(weirdingHighPlayed.log[0], /adding 5 strength/);

  const backedIncompleteFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, contracts: [completedContract(data, 0)], intrigues: [backedByChoam] }
        : player,
    ),
  );
  const backedIncomplete = state.startCombatPhase(backedIncompleteFixture);
  assert.equal(
    state.combatIntrigueStrength(backedIncomplete, playerById(backedIncomplete, "p2"), backedByChoam),
    undefined,
    "Backed by CHOAM should require two completed contracts for its Combat branch",
  );
  assert.equal(
    state.playCombatIntrigue(backedIncomplete, "p2", backedByChoam.id),
    backedIncomplete,
    "Backed by CHOAM should not auto-resolve before the completed-contract threshold",
  );

  const backedUncompletedFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            contracts: [incompleteContract(data, 0), incompleteContract(data, 1)],
            intrigues: [backedByChoam],
          }
        : player,
    ),
  );
  const backedUncompleted = state.startCombatPhase(backedUncompletedFixture);
  assert.equal(
    state.combatIntrigueStrength(backedUncompleted, playerById(backedUncompleted, "p2"), backedByChoam),
    undefined,
    "Backed by CHOAM should count completed contracts, not merely held contracts",
  );

  const backedCompleteFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 2,
            deployedTroops: 1,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
            intrigues: [backedByChoam],
          }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const backedComplete = state.startCombatPhase(backedCompleteFixture);
  assert.equal(
    state.combatIntrigueStrength(backedComplete, playerById(backedComplete, "p2"), backedByChoam),
    4,
    "Backed by CHOAM should add 4 strength with two completed contracts",
  );
  const backedCompletePlayed = state.playCombatIntrigue(backedComplete, "p2", backedByChoam.id);
  assert.equal(playerById(backedCompletePlayed, "p2").conflict, 6);
  assert.equal(backedCompletePlayed.intrigueDiscard.at(-1).id, backedByChoam.id);
  assert.match(backedCompletePlayed.log[0], /plays Backed by CHOAM for Feyd-Rautha Harkonnen, adding 4 strength/);

  const findWeaknessNoSpyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [findWeakness] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
          : player,
    ),
  );
  const findWeaknessNoSpy = state.startCombatPhase(findWeaknessNoSpyFixture);
  assert.equal(
    state.combatIntrigueStrength(findWeaknessNoSpy, playerById(findWeaknessNoSpy, "p2"), findWeakness),
    2,
    "Find Weakness should add its base 2 strength before any spy recall",
  );
  const findWeaknessNoSpyPlayed = state.playCombatIntrigue(findWeaknessNoSpy, "p2", findWeakness.id);
  assert.equal(playerById(findWeaknessNoSpyPlayed, "p2").conflict, 4);
  assert.equal(findWeaknessNoSpyPlayed.pendingAction, undefined, "Find Weakness should not queue recall without an owned spy post");
  assert.match(findWeaknessNoSpyPlayed.log[0], /plays Find Weakness for Feyd-Rautha Harkonnen, adding 2 strength/);

  const findWeaknessSpyFixture = {
    ...combatFixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, spies: 2, intrigues: [findWeakness] }
          : player.id === "p3"
            ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [verifierCombat] }
            : player,
      ),
    ),
    spyPosts: { [secretsSpace.id]: "p2" },
  };
  const findWeaknessSpy = state.startCombatPhase(findWeaknessSpyFixture);
  const findWeaknessSpyPlayed = state.playCombatIntrigue(findWeaknessSpy, "p2", findWeakness.id);
  assert.equal(playerById(findWeaknessSpyPlayed, "p2").conflict, 4, "Find Weakness should add base strength immediately");
  assert.deepEqual(findWeaknessSpyPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 1,
    strength: 3,
    source: "Find Weakness",
    optional: true,
  });
  assert.deepEqual(
    state.recallableSpySpaces(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction).map((space) => space.name),
    ["Secrets"],
    "Find Weakness should list only the actor's spy posts for recall",
  );
  assert.equal(
    state.passCombatIntrigue(findWeaknessSpyPlayed, findWeaknessSpyPlayed.players[findWeaknessSpyPlayed.activeSeat].id),
    findWeaknessSpyPlayed,
    "Combat should stay locked while Find Weakness recall is pending",
  );
  assert.equal(
    state.playCombatIntrigue(findWeaknessSpyPlayed, findWeaknessSpyPlayed.players[findWeaknessSpyPlayed.activeSeat].id, verifierCombat.id),
    findWeaknessSpyPlayed,
    "Additional Combat Intrigues should wait for Find Weakness recall to resolve",
  );
  assert.equal(
    state.recallSpyForPending(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction, arrakeenSpace.id),
    findWeaknessSpyPlayed,
    "Find Weakness recall should reject unowned spy posts",
  );
  const findWeaknessActiveSeatAfterPlay = findWeaknessSpyPlayed.activeSeat;
  const findWeaknessSkipped = state.skipRecallSpy(findWeaknessSpyPlayed, findWeaknessSpyPlayed.pendingAction);
  assert.equal(findWeaknessSkipped.pendingAction, undefined, "Skipping Find Weakness recall should clear the pending action");
  assert.equal(findWeaknessSkipped.activeSeat, findWeaknessActiveSeatAfterPlay, "Skipping Find Weakness recall should not advance Combat again");
  assert.equal(playerById(findWeaknessSkipped, "p2").spies, 2, "Skipping Find Weakness recall should keep the spy supply unchanged");
  assert.equal(findWeaknessSkipped.spyPosts[secretsSpace.id], "p2", "Skipping Find Weakness recall should leave the spy post in place");
  assert.equal(playerById(findWeaknessSkipped, "p2").conflict, 4, "Skipping Find Weakness recall should keep only the base strength");
  assert.match(findWeaknessSkipped.log[0], /declines to recall a spy for Find Weakness/);
  const findWeaknessRecalled = state.recallSpyForPending(
    findWeaknessSpyPlayed,
    findWeaknessSpyPlayed.pendingAction,
    secretsSpace.id,
  );
  assert.equal(findWeaknessRecalled.pendingAction, undefined, "Resolving Find Weakness recall should clear the pending action");
  assert.equal(findWeaknessRecalled.activeSeat, findWeaknessActiveSeatAfterPlay, "Resolving Find Weakness recall should not advance Combat again");
  assert.equal(playerById(findWeaknessRecalled, "p2").spies, 3, "Find Weakness should return the recalled spy to supply");
  assert.equal(findWeaknessRecalled.spyPosts[secretsSpace.id], undefined, "Find Weakness should remove the recalled spy post");
  assert.equal(playerById(findWeaknessRecalled, "p2").conflict, 7, "Find Weakness recall should add the 3 strength bonus");
  assert.match(findWeaknessRecalled.log[0], /recalls a spy from Secrets for Find Weakness, adding 3 strength/);

  const questionableNoInfluenceFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [questionableMethods] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
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
    spyPosts: { [secretsSpace.id]: "p2" },
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
    spyPosts: { [secretsSpace.id]: "p2", [espionageSpace.id]: "p3" },
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
    spyPosts: { [secretsSpace.id]: "p2", [espionageSpace.id]: "p2" },
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
    ["Secrets", "Espionage"],
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
  const springFirstRecall = state.recallSpyForPending(springTheTrapPlayed, springTheTrapPlayed.pendingAction, secretsSpace.id);
  assert.equal(springFirstRecall.activeSeat, springActiveSeatAfterPlay, "First Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springFirstRecall, "p2").spies, 2, "First Spring The Trap recall should return one spy to supply");
  assert.equal(playerById(springFirstRecall, "p2").conflict, 2, "First Spring The Trap recall should not add partial strength");
  assert.equal(springFirstRecall.spyPosts[secretsSpace.id], undefined);
  assert.equal(springFirstRecall.spyPosts[espionageSpace.id], "p2");
  assert.deepEqual(springFirstRecall.pendingAction, {
    kind: "recall-spy",
    ownerId: "p2",
    combatRecipientId: "p2",
    remaining: 1,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  const springSecondRecall = state.recallSpyForPending(springFirstRecall, springFirstRecall.pendingAction, espionageSpace.id);
  assert.equal(springSecondRecall.pendingAction, undefined, "Second Spring The Trap recall should clear the pending action");
  assert.equal(springSecondRecall.activeSeat, springActiveSeatAfterPlay, "Second Spring The Trap recall should not advance Combat again");
  assert.equal(playerById(springSecondRecall, "p2").spies, 3, "Spring The Trap should return both recalled spies to supply");
  assert.equal(springSecondRecall.spyPosts[espionageSpace.id], undefined);
  assert.equal(playerById(springSecondRecall, "p2").conflict, 9, "Spring The Trap should add 7 strength after the second recall");
  assert.match(springSecondRecall.log[0], /recalls a spy from Espionage for Spring The Trap, adding 7 strength/);

  const devourNoWormFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, deployedSandworms: 0, intrigues: [devour] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1 }
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
          ? { ...player, conflict: 4, deployedTroops: 1 }
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

  const resetPassFixture = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1 };
      if (player.id === "p3") return { ...player, conflict: 3, deployedTroops: 1, intrigues: [verifierCombat] };
      return player;
    }),
  );
  const resetCombat = state.startCombatPhase(resetPassFixture);
  const resetAfterPass = passCurrent(state, resetCombat);
  const resetAfterPlay = state.playCombatIntrigue(resetAfterPass, "p3", verifierCombat.id);
  assert.deepEqual(resetAfterPlay.combatPasses, [], "Playing after a pass should require fresh passes from actors");

  const commanderFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [verifierCombat] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderCombat = state.startCombatPhase(commanderFixture);
  assert.equal(commanderCombat.players[commanderCombat.activeSeat].id, "p4", "Commander seat should act when its team has Allies in conflict");
  assert.deepEqual(
    state.combatIntrigueTargets(commanderCombat, "p4"),
    ["p2", "p6"],
    "Commanders should target only same-team Allies with units in the Conflict",
  );
  assert.equal(
    state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id),
    commanderCombat,
    "Commander Combat Intrigues should require an explicit Ally target",
  );
  const commanderPlayed = state.playCombatIntrigue(commanderCombat, "p4", verifierCombat.id, "p6");
  assert.equal(playerById(commanderPlayed, "p6").conflict, 3, "Commander Combat Intrigue should add strength to the chosen Ally");
  assert.deepEqual(playerById(commanderPlayed, "p4").intrigues, []);
  assert.equal(playerById(commanderPlayed, "p2").conflict, 5, "Other eligible Allies should not receive the chosen card's strength");

  const commanderSpiceSpendFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, resources: { ...player.resources, spice: 5 }, intrigues: [spiceIsPower] };
        }
        if (player.id === "p6") {
          return { ...player, conflict: 1, deployedTroops: 1, resources: { ...player.resources, spice: 3 } };
        }
        return player;
      }),
    3,
  );
  const commanderSpiceSpend = state.startCombatPhase(commanderSpiceSpendFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpiceSpend, playerById(commanderSpiceSpend, "p4"), spiceIsPower),
    undefined,
    "Commander Spice is Power should need a target before checking spend-branch spice",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderSpiceSpend, playerById(commanderSpiceSpend, "p4"), spiceIsPower, playerById(commanderSpiceSpend, "p6")),
    6,
    "Commander Spice is Power should use the target Ally's spice for the spend branch",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpiceSpend, "p4", spiceIsPower.id, undefined, "spend-spice"),
    commanderSpiceSpend,
    "Commander Spice is Power should require an explicit Ally target",
  );
  const commanderSpiceSpent = state.playCombatIntrigue(
    commanderSpiceSpend,
    "p4",
    spiceIsPower.id,
    "p6",
    "spend-spice",
  );
  assert.equal(playerById(commanderSpiceSpent, "p6").resources.spice, 0, "Commander Spice is Power spend branch should spend the target Ally's spice");
  assert.equal(playerById(commanderSpiceSpent, "p6").conflict, 7, "Commander Spice is Power spend branch should add strength to the target Ally");
  assert.equal(playerById(commanderSpiceSpent, "p4").resources.spice, 5, "Commander Spice is Power should not spend Commander spice");
  assert.equal(playerById(commanderSpiceSpent, "p2").conflict, 5, "Commander Spice is Power should not split effects");
  assert.match(commanderSpiceSpent.log[0], /Princess Irulan spends 3 spice to add 6 strength/);

  const commanderSpiceRetreatFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [spiceIsPower] };
        if (player.id === "p6") {
          return { ...player, conflict: 8, deployedTroops: 3, garrison: 0, resources: { ...player.resources, spice: 0 } };
        }
        return player;
      }),
    3,
  );
  const commanderSpiceRetreat = state.startCombatPhase(commanderSpiceRetreatFixture);
  const commanderSpiceRetreated = state.playCombatIntrigue(
    commanderSpiceRetreat,
    "p4",
    spiceIsPower.id,
    "p6",
    "retreat-troops",
  );
  assert.equal(playerById(commanderSpiceRetreated, "p6").deployedTroops, 0, "Commander Spice is Power should retreat the target Ally's troops");
  assert.equal(playerById(commanderSpiceRetreated, "p6").garrison, 3);
  assert.equal(playerById(commanderSpiceRetreated, "p6").resources.spice, 3);
  assert.equal(playerById(commanderSpiceRetreated, "p6").conflict, 2);
  assert.equal(playerById(commanderSpiceRetreated, "p2").conflict, 5);
  assert.match(commanderSpiceRetreated.log[0], /Princess Irulan retreats 3 troops and gains 3 spice/);

  const commanderTacticalFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [tacticalOption] };
        if (player.id === "p6") return { ...player, conflict: 7, deployedTroops: 3, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderTactical = state.startCombatPhase(commanderTacticalFixture);
  assert.equal(
    state.playCombatIntrigue(commanderTactical, "p4", tacticalOption.id, undefined, "add-strength"),
    commanderTactical,
    "Commander Tactical Option should require an explicit Ally target",
  );
  const commanderTacticalAdded = state.playCombatIntrigue(
    commanderTactical,
    "p4",
    tacticalOption.id,
    "p6",
    "add-strength",
  );
  assert.equal(playerById(commanderTacticalAdded, "p6").conflict, 9, "Commander Tactical Option should add strength to the target Ally");
  assert.equal(playerById(commanderTacticalAdded, "p2").conflict, 5, "Commander Tactical Option should not split effects");

  const commanderTacticalRetreated = state.playCombatIntrigue(
    commanderTactical,
    "p4",
    tacticalOption.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderTacticalRetreated, "p6").deployedTroops, 1, "Commander Tactical Option should retreat target Ally troops");
  assert.equal(playerById(commanderTacticalRetreated, "p6").garrison, 2);
  assert.equal(playerById(commanderTacticalRetreated, "p6").conflict, 3);
  assert.equal(playerById(commanderTacticalRetreated, "p2").conflict, 5);
  assert.match(commanderTacticalRetreated.log[0], /Princess Irulan retreats 2 troops/);

  const commanderTacticalAllRetreatFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [tacticalOption] };
        if (player.id === "p6") return { ...player, conflict: 6, deployedTroops: 3, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderTacticalAllRetreat = state.startCombatPhase(commanderTacticalAllRetreatFixture);
  const commanderTacticalAllRetreated = state.playCombatIntrigue(
    commanderTacticalAllRetreat,
    "p4",
    tacticalOption.id,
    "p6",
    { kind: "retreat-troops", count: 3 },
  );
  assert.equal(playerById(commanderTacticalAllRetreated, "p6").deployedTroops, 0);
  assert.equal(playerById(commanderTacticalAllRetreated, "p6").conflict, 0);
  assert.equal(playerById(commanderTacticalAllRetreated, "p2").conflict, 5);
  assert.equal(
    commanderTacticalAllRetreated.players[commanderTacticalAllRetreated.activeSeat].id,
    "p2",
    "Commander Tactical Option should continue with another eligible same-team Ally after the target retreats fully",
  );

  const commanderReachAgreementContract = data.standardContracts[3];
  const commanderReachAgreementFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [reachAgreement] };
          if (player.id === "p6") return { ...player, conflict: 4, deployedTroops: 2, garrison: 0 };
          return player;
        }),
      3,
    ),
    contractOffer: [commanderReachAgreementContract],
    contractDeck: [],
  };
  const commanderReachAgreement = state.startCombatPhase(commanderReachAgreementFixture);
  assert.equal(
    state.playCombatIntrigue(commanderReachAgreement, "p4", reachAgreement.id, undefined, { kind: "retreat-troops", count: 1 }),
    commanderReachAgreement,
    "Commander Reach Agreement should require an explicit Ally target",
  );
  const commanderReachAgreementPlayed = state.playCombatIntrigue(
    commanderReachAgreement,
    "p4",
    reachAgreement.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").deployedTroops, 0, "Commander Reach Agreement should retreat target Ally troops");
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").garrison, 2);
  assert.equal(playerById(commanderReachAgreementPlayed, "p6").conflict, 0);
  assert.equal(playerById(commanderReachAgreementPlayed, "p2").conflict, 5, "Commander Reach Agreement should not split effects");
  assert.deepEqual(playerById(commanderReachAgreementPlayed, "p4").intrigues, [], "Commander Reach Agreement should leave the Commander's hand");
  assert.deepEqual(commanderReachAgreementPlayed.pendingAction, {
    kind: "contract",
    ownerId: "p6",
    source: "Reach Agreement",
  });
  assert.equal(
    commanderReachAgreementPlayed.players[commanderReachAgreementPlayed.activeSeat].id,
    "p2",
    "Commander Reach Agreement should continue with another eligible Ally after the target retreats fully",
  );
  const commanderReachAgreementTookContract = state.takeChoamContract(
    commanderReachAgreementPlayed,
    commanderReachAgreementPlayed.pendingAction,
    commanderReachAgreementContract.id,
  );
  assert.equal(playerById(commanderReachAgreementTookContract, "p6").contracts.at(-1).card.id, commanderReachAgreementContract.id);
  assert.equal(playerById(commanderReachAgreementTookContract, "p4").contracts.length, 0, "Commander Reach Agreement should not give the Commander the contract");
  assert.equal(playerById(commanderReachAgreementTookContract, "p2").contracts.length, 0, "Commander Reach Agreement should not give a different Ally the contract");
  assert.equal(commanderReachAgreementTookContract.phase, "combat");
  assert.equal(commanderReachAgreementTookContract.players[commanderReachAgreementTookContract.activeSeat].id, "p2");
  assert.match(commanderReachAgreementTookContract.log[0], /Princess Irulan takes the .* CHOAM contract from Reach Agreement/);

  const commanderGoToGroundFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [goToGround] };
        if (player.id === "p6") return { ...player, conflict: 4, deployedTroops: 2, garrison: 0 };
        return player;
      }),
    3,
  );
  const commanderGoToGround = state.startCombatPhase(commanderGoToGroundFixture);
  assert.equal(
    state.playCombatIntrigue(commanderGoToGround, "p4", goToGround.id, undefined, { kind: "retreat-troops", count: 1 }),
    commanderGoToGround,
    "Commander Go To Ground should require an explicit Ally target",
  );
  const commanderGoToGroundPlayed = state.playCombatIntrigue(
    commanderGoToGround,
    "p4",
    goToGround.id,
    "p6",
    { kind: "retreat-troops", count: 2 },
  );
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").deployedTroops, 0, "Commander Go To Ground should retreat target Ally troops");
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").garrison, 2);
  assert.equal(playerById(commanderGoToGroundPlayed, "p6").conflict, 0);
  assert.equal(playerById(commanderGoToGroundPlayed, "p2").conflict, 5, "Commander Go To Ground should not split effects");
  assert.deepEqual(playerById(commanderGoToGroundPlayed, "p4").intrigues, [], "Commander Go To Ground should leave the Commander's hand");
  assert.deepEqual(commanderGoToGroundPlayed.pendingAction, {
    kind: "spy",
    ownerId: "p6",
    remaining: 1,
    source: "Go To Ground",
  });
  assert.equal(
    commanderGoToGroundPlayed.players[commanderGoToGroundPlayed.activeSeat].id,
    "p2",
    "Commander Go To Ground should continue with another eligible Ally after the target retreats fully",
  );
  const commanderGoToGroundSpyPlaced = state.placeSpyForPending(
    commanderGoToGroundPlayed,
    commanderGoToGroundPlayed.pendingAction,
    espionageSpace.id,
  );
  assert.equal(commanderGoToGroundSpyPlaced.phase, "combat");
  assert.equal(commanderGoToGroundSpyPlaced.players[commanderGoToGroundSpyPlaced.activeSeat].id, "p2");
  assert.equal(playerById(commanderGoToGroundSpyPlaced, "p6").spies, playerById(commanderGoToGroundPlayed, "p6").spies - 1);
  assert.equal(playerById(commanderGoToGroundSpyPlaced, "p4").spies, playerById(commanderGoToGroundPlayed, "p4").spies, "Commander Go To Ground should not spend a Commander spy");
  assert.equal(commanderGoToGroundSpyPlaced.spyPosts[espionageSpace.id], "p6", "Commander Go To Ground should place the target Ally's spy");
  assert.match(commanderGoToGroundSpyPlaced.log[0], /Princess Irulan places a spy near Espionage from Go To Ground/);

  const commanderFindWeaknessFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, spies: 2, intrigues: [findWeakness] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p4" },
  };
  const commanderFindWeakness = state.startCombatPhase(commanderFindWeaknessFixture);
  assert.equal(
    state.playCombatIntrigue(commanderFindWeakness, "p4", findWeakness.id),
    commanderFindWeakness,
    "Commander Find Weakness should require an explicit Ally target",
  );
  const commanderFindWeaknessPlayed = state.playCombatIntrigue(commanderFindWeakness, "p4", findWeakness.id, "p6");
  assert.equal(playerById(commanderFindWeaknessPlayed, "p6").conflict, 3, "Commander Find Weakness base strength should go to the target");
  assert.equal(playerById(commanderFindWeaknessPlayed, "p2").conflict, 5, "Commander Find Weakness should not split strength");
  assert.deepEqual(commanderFindWeaknessPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p4",
    combatRecipientId: "p6",
    remaining: 1,
    strength: 3,
    source: "Find Weakness",
    optional: true,
  });
  const commanderFindWeaknessRecalled = state.recallSpyForPending(
    commanderFindWeaknessPlayed,
    commanderFindWeaknessPlayed.pendingAction,
    secretsSpace.id,
  );
  assert.equal(playerById(commanderFindWeaknessRecalled, "p4").spies, 3, "Commander Find Weakness should recall the Commander's own spy");
  assert.equal(playerById(commanderFindWeaknessRecalled, "p6").conflict, 6, "Commander Find Weakness recall should add bonus strength to the target Ally");
  assert.equal(commanderFindWeaknessRecalled.spyPosts[secretsSpace.id], undefined);

  const commanderFindWeaknessAllySpyFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [findWeakness] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1, spies: 2 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p6" },
  };
  const commanderFindWeaknessAllySpy = state.startCombatPhase(commanderFindWeaknessAllySpyFixture);
  const commanderFindWeaknessAllySpyPlayed = state.playCombatIntrigue(
    commanderFindWeaknessAllySpy,
    "p4",
    findWeakness.id,
    "p6",
  );
  assert.equal(
    commanderFindWeaknessAllySpyPlayed.pendingAction,
    undefined,
    "Commander Find Weakness should not recall a target Ally's spy",
  );
  assert.equal(playerById(commanderFindWeaknessAllySpyPlayed, "p6").conflict, 3);
  assert.equal(commanderFindWeaknessAllySpyPlayed.spyPosts[secretsSpace.id], "p6");

  const commanderQuestionableMethodsFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") return { ...player, intrigues: [questionableMethods] };
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            influence: { ...player.influence, fringeWorlds: 2 },
            vp: 1,
          };
        }
        return player;
      }),
    3,
  );
  const commanderQuestionableMethods = state.startCombatPhase(commanderQuestionableMethodsFixture);
  assert.equal(
    state.playCombatIntrigue(commanderQuestionableMethods, "p4", questionableMethods.id),
    commanderQuestionableMethods,
    "Commander Questionable Methods should require an explicit Ally target",
  );
  const commanderQuestionableMethodsPlayed = state.playCombatIntrigue(
    commanderQuestionableMethods,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.equal(playerById(commanderQuestionableMethodsPlayed, "p6").conflict, 2, "Commander Questionable Methods base strength should go to the target");
  assert.equal(playerById(commanderQuestionableMethodsPlayed, "p2").conflict, 5, "Commander Questionable Methods should not split strength");
  assert.deepEqual(commanderQuestionableMethodsPlayed.pendingAction, {
    kind: "lose-influence",
    ownerId: "p6",
    combatRecipientId: "p6",
    strength: 4,
    source: "Questionable Methods",
    optional: true,
  });
  const commanderQuestionableMethodsLostInfluence = state.loseInfluenceForPending(
    commanderQuestionableMethodsPlayed,
    commanderQuestionableMethodsPlayed.pendingAction,
    "p6",
    "fringeWorlds",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p6").influence.fringeWorlds,
    1,
    "Commander Questionable Methods should spend the target Ally's Influence",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p6").conflict,
    6,
    "Commander Questionable Methods should add bonus strength to the target Ally",
  );
  assert.equal(
    playerById(commanderQuestionableMethodsLostInfluence, "p4").influence.fringeWorlds,
    0,
    "Commander Questionable Methods should not spend the Commander's Influence",
  );
  assert.equal(playerById(commanderQuestionableMethodsLostInfluence, "p2").conflict, 5);

  const commanderQuestionableMethodsActorInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, emperor: 2 }, vp: 1 };
        }
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsActorInfluence = state.startCombatPhase(commanderQuestionableMethodsActorInfluenceFixture);
  const commanderQuestionableMethodsActorInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsActorInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.deepEqual(
    commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    {
      kind: "lose-influence",
      ownerId: "p6",
      alternateOwnerIds: ["p4"],
      combatRecipientId: "p6",
      strength: 4,
      source: "Questionable Methods",
      optional: true,
    },
    "Commander Questionable Methods should allow the Commander to spend their personal Influence",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      commanderQuestionableMethodsActorInfluencePlayed,
      commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    ),
    [{ ownerId: "p4", faction: "emperor" }],
    "Commander Questionable Methods should expose only the Commander's personal Influence when the target Ally has none",
  );
  assert.equal(playerById(commanderQuestionableMethodsActorInfluencePlayed, "p6").conflict, 2);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluencePlayed, "p4").influence.emperor, 2);
  const commanderQuestionableMethodsActorInfluenceLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsActorInfluencePlayed,
    commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
    "p4",
    "emperor",
  );
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p4").influence.emperor, 1);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p4").vp, 0);
  assert.equal(playerById(commanderQuestionableMethodsActorInfluenceLost, "p6").conflict, 6);

  assert.equal(
    state.loseInfluenceForPending(
      commanderQuestionableMethodsActorInfluencePlayed,
      commanderQuestionableMethodsActorInfluencePlayed.pendingAction,
      "p4",
      "bene",
    ),
    commanderQuestionableMethodsActorInfluencePlayed,
    "Commander Questionable Methods should reject non-personal Commander Influence tracks",
  );

  const muadDibQuestionableMethodsActorInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p1") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, fremen: 2 }, vp: 1 };
        }
        if (player.id === "p3") return { ...player, conflict: 1, deployedTroops: 1 };
        if (player.id === "p5") return { ...player, conflict: 5, deployedTroops: 1 };
        return player;
      }),
    0,
  );
  const muadDibQuestionableMethodsActorInfluence = state.startCombatPhase(
    muadDibQuestionableMethodsActorInfluenceFixture,
  );
  const muadDibQuestionableMethodsActorInfluencePlayed = state.playCombatIntrigue(
    muadDibQuestionableMethodsActorInfluence,
    "p1",
    questionableMethods.id,
    "p3",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      muadDibQuestionableMethodsActorInfluencePlayed,
      muadDibQuestionableMethodsActorInfluencePlayed.pendingAction,
    ),
    [{ ownerId: "p1", faction: "fremen" }],
    "Muad'Dib Questionable Methods should expose the Commander's personal Fremen Influence",
  );
  const muadDibQuestionableMethodsActorInfluenceLost = state.loseInfluenceForPending(
    muadDibQuestionableMethodsActorInfluencePlayed,
    muadDibQuestionableMethodsActorInfluencePlayed.pendingAction,
    "p1",
    "fremen",
  );
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p1").influence.fremen, 1);
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p1").vp, 0);
  assert.equal(playerById(muadDibQuestionableMethodsActorInfluenceLost, "p3").conflict, 6);

  const commanderQuestionableMethodsMixedInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return { ...player, intrigues: [questionableMethods], influence: { ...player.influence, emperor: 2 }, vp: 1 };
        }
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            influence: { ...player.influence, fringeWorlds: 2 },
            vp: 1,
          };
        }
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsMixedInfluence = state.startCombatPhase(commanderQuestionableMethodsMixedInfluenceFixture);
  const commanderQuestionableMethodsMixedInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsMixedInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.deepEqual(
    state.influenceLossOptions(
      commanderQuestionableMethodsMixedInfluencePlayed,
      commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    ),
    [
      { ownerId: "p6", faction: "fringeWorlds" },
      { ownerId: "p4", faction: "emperor" },
    ],
    "Commander Questionable Methods should expose both target Ally and Commander personal Influence choices",
  );
  const commanderQuestionableMethodsMixedActiveSeat = commanderQuestionableMethodsMixedInfluencePlayed.activeSeat;
  const commanderQuestionableMethodsMixedTargetLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsMixedInfluencePlayed,
    commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    "p6",
    "fringeWorlds",
  );
  assert.equal(
    commanderQuestionableMethodsMixedTargetLost.activeSeat,
    commanderQuestionableMethodsMixedActiveSeat,
    "Mixed Questionable Methods target resolution should not advance Combat again",
  );
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p6").influence.fringeWorlds, 1);
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p4").influence.emperor, 2);
  assert.equal(playerById(commanderQuestionableMethodsMixedTargetLost, "p6").conflict, 6);
  const commanderQuestionableMethodsMixedCommanderLost = state.loseInfluenceForPending(
    commanderQuestionableMethodsMixedInfluencePlayed,
    commanderQuestionableMethodsMixedInfluencePlayed.pendingAction,
    "p4",
    "emperor",
  );
  assert.equal(
    commanderQuestionableMethodsMixedCommanderLost.activeSeat,
    commanderQuestionableMethodsMixedActiveSeat,
    "Mixed Questionable Methods Commander resolution should not advance Combat again",
  );
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p6").influence.fringeWorlds, 2);
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p4").influence.emperor, 1);
  assert.equal(playerById(commanderQuestionableMethodsMixedCommanderLost, "p6").conflict, 6);

  const commanderQuestionableMethodsUnrelatedInfluenceFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return { ...player, conflict: 5, deployedTroops: 1, influence: { ...player.influence, bene: 2 }, vp: 1 };
        }
        if (player.id === "p4") return { ...player, intrigues: [questionableMethods] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderQuestionableMethodsUnrelatedInfluence = state.startCombatPhase(
    commanderQuestionableMethodsUnrelatedInfluenceFixture,
  );
  const commanderQuestionableMethodsUnrelatedInfluencePlayed = state.playCombatIntrigue(
    commanderQuestionableMethodsUnrelatedInfluence,
    "p4",
    questionableMethods.id,
    "p6",
  );
  assert.equal(
    commanderQuestionableMethodsUnrelatedInfluencePlayed.pendingAction,
    undefined,
    "Commander Questionable Methods should not spend an unrelated Ally's Influence",
  );
  assert.equal(playerById(commanderQuestionableMethodsUnrelatedInfluencePlayed, "p6").conflict, 2);
  assert.equal(playerById(commanderQuestionableMethodsUnrelatedInfluencePlayed, "p2").influence.bene, 2);

  const commanderSpringFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, spies: 1, intrigues: [springTheTrap] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p4", [espionageSpace.id]: "p4" },
  };
  const commanderSpring = state.startCombatPhase(commanderSpringFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpring, playerById(commanderSpring, "p4"), springTheTrap),
    7,
    "Commander Spring The Trap should use the Commander's own spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpring, "p4", springTheTrap.id),
    commanderSpring,
    "Commander Spring The Trap should require an explicit Ally target",
  );
  const commanderSpringPlayed = state.playCombatIntrigue(commanderSpring, "p4", springTheTrap.id, "p6");
  assert.deepEqual(playerById(commanderSpringPlayed, "p4").intrigues, [], "Commander Spring The Trap should leave the Commander's hand");
  assert.equal(commanderSpringPlayed.intrigueDiscard.at(-1).id, springTheTrap.id);
  assert.equal(playerById(commanderSpringPlayed, "p6").conflict, 1, "Commander Spring The Trap should wait to add strength until recalls resolve");
  assert.equal(playerById(commanderSpringPlayed, "p2").conflict, 5, "Commander Spring The Trap should not split strength");
  assert.deepEqual(commanderSpringPlayed.pendingAction, {
    kind: "recall-spy",
    ownerId: "p4",
    combatRecipientId: "p6",
    remaining: 2,
    strength: 7,
    source: "Spring The Trap",
    optional: false,
  });
  const commanderSpringFirstRecall = state.recallSpyForPending(commanderSpringPlayed, commanderSpringPlayed.pendingAction, secretsSpace.id);
  const commanderSpringSecondRecall = state.recallSpyForPending(
    commanderSpringFirstRecall,
    commanderSpringFirstRecall.pendingAction,
    espionageSpace.id,
  );
  assert.equal(playerById(commanderSpringSecondRecall, "p4").spies, 3, "Commander Spring The Trap should recall the Commander's own spies");
  assert.equal(playerById(commanderSpringSecondRecall, "p6").conflict, 8, "Commander Spring The Trap should add strength to the target Ally");
  assert.equal(playerById(commanderSpringSecondRecall, "p2").conflict, 5);
  assert.equal(commanderSpringSecondRecall.spyPosts[secretsSpace.id], undefined);
  assert.equal(commanderSpringSecondRecall.spyPosts[espionageSpace.id], undefined);

  const commanderSpringAllySpyFixture = {
    ...combatFixture(
      state,
      data,
      (players) =>
        players.map((player) => {
          if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
          if (player.id === "p4") return { ...player, intrigues: [springTheTrap] };
          if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1, spies: 1 };
          return player;
        }),
      3,
    ),
    spyPosts: { [secretsSpace.id]: "p6", [espionageSpace.id]: "p6" },
  };
  const commanderSpringAllySpy = state.startCombatPhase(commanderSpringAllySpyFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderSpringAllySpy, playerById(commanderSpringAllySpy, "p4"), springTheTrap),
    undefined,
    "Commander Spring The Trap should not count the target Ally's spy posts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderSpringAllySpy, "p4", springTheTrap.id, "p6"),
    commanderSpringAllySpy,
    "Commander Spring The Trap should stay blocked when only the target Ally has spy posts",
  );

  const commanderDevourTrashChoice = starterCard(data, 1);
  const commanderDevourFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1, deployedSandworms: 0 };
        if (player.id === "p4") return { ...player, intrigues: [devour] };
        if (player.id === "p6") {
          return {
            ...player,
            conflict: 1,
            deployedTroops: 1,
            deployedSandworms: 1,
            discard: [commanderDevourTrashChoice],
          };
        }
        return player;
      }),
    3,
  );
  const commanderDevour = state.startCombatPhase(commanderDevourFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour),
    undefined,
    "Commander Devour needs a target before resolving sandworm-dependent strength",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour, playerById(commanderDevour, "p2")),
    2,
    "Commander Devour should add 2 for a target without sandworms",
  );
  assert.equal(
    state.combatIntrigueStrength(commanderDevour, playerById(commanderDevour, "p4"), devour, playerById(commanderDevour, "p6")),
    4,
    "Commander Devour should add 4 for a target with sandworms",
  );
  assert.equal(
    state.playCombatIntrigue(commanderDevour, "p4", devour.id),
    commanderDevour,
    "Commander Devour should require an explicit Ally target",
  );
  const commanderDevourPlayed = state.playCombatIntrigue(commanderDevour, "p4", devour.id, "p6");
  assert.equal(playerById(commanderDevourPlayed, "p6").conflict, 5);
  assert.equal(playerById(commanderDevourPlayed, "p2").conflict, 5);
  assert.deepEqual(commanderDevourPlayed.pendingAction, {
    kind: "trash-card",
    ownerId: "p6",
    source: "Devour",
    optional: true,
  });
  assert.match(commanderDevourPlayed.log[0], /Shaddam Corrino IV plays Devour for Princess Irulan, adding 4 strength/);
  const commanderDevourHandTrashed = state.trashPlayerCard(
    commanderDevourPlayed,
    commanderDevourPlayed.pendingAction,
    "discard",
    commanderDevourTrashChoice.id,
  );
  assert.deepEqual(playerById(commanderDevourHandTrashed, "p6").discard, [], "Devour should trash from discard when selected");

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
          ? { ...player, conflict: 4, deployedTroops: 1 }
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

  const commanderWeirdingFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return { ...player, conflict: 5, deployedTroops: 1, influence: { ...player.influence, bene: 3 } };
        }
        if (player.id === "p4") return { ...player, intrigues: [weirdingCombat] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderWeirding = state.startCombatPhase(commanderWeirdingFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderWeirding, playerById(commanderWeirding, "p4"), weirdingCombat),
    5,
    "Commander Weirding Combat should use the team's effective Bene Gesserit Influence",
  );
  const commanderWeirdingPlayed = state.playCombatIntrigue(commanderWeirding, "p4", weirdingCombat.id, "p6");
  assert.equal(playerById(commanderWeirdingPlayed, "p6").conflict, 6);
  assert.equal(playerById(commanderWeirdingPlayed, "p2").conflict, 5);
  assert.match(commanderWeirdingPlayed.log[0], /Shaddam Corrino IV plays Weirding Combat for Princess Irulan, adding 5 strength/);

  const commanderBackedFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") return { ...player, conflict: 5, deployedTroops: 1 };
        if (player.id === "p4") {
          return {
            ...player,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
            intrigues: [backedByChoam],
          };
        }
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderBacked = state.startCombatPhase(commanderBackedFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderBacked, playerById(commanderBacked, "p4"), backedByChoam),
    4,
    "Commander Backed by CHOAM should use the Commander's completed contracts",
  );
  const commanderBackedPlayed = state.playCombatIntrigue(commanderBacked, "p4", backedByChoam.id, "p6");
  assert.equal(playerById(commanderBackedPlayed, "p6").conflict, 5);
  assert.equal(playerById(commanderBackedPlayed, "p2").conflict, 5);
  assert.match(commanderBackedPlayed.log[0], /Shaddam Corrino IV plays Backed by CHOAM for Princess Irulan, adding 4 strength/);

  const commanderBackedTargetContractsFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) => {
        if (player.id === "p2") {
          return {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            contracts: [completedContract(data, 0), completedContract(data, 1)],
          };
        }
        if (player.id === "p4") return { ...player, intrigues: [backedByChoam] };
        if (player.id === "p6") return { ...player, conflict: 1, deployedTroops: 1 };
        return player;
      }),
    3,
  );
  const commanderBackedTargetContracts = state.startCombatPhase(commanderBackedTargetContractsFixture);
  assert.equal(
    state.combatIntrigueStrength(commanderBackedTargetContracts, playerById(commanderBackedTargetContracts, "p4"), backedByChoam),
    undefined,
    "Commander Backed by CHOAM should not use the target Ally's completed contracts",
  );
  assert.equal(
    state.playCombatIntrigue(commanderBackedTargetContracts, "p4", backedByChoam.id, "p2"),
    commanderBackedTargetContracts,
    "Commander Backed by CHOAM should stay blocked when only the Ally target has completed contracts",
  );

  const nonCombatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [mercenaries] }
        : player,
    ),
  );
  const nonCombat = state.startCombatPhase(nonCombatFixture);
  assert.equal(
    state.playCombatIntrigue(nonCombat, "p2", mercenaries.id),
    nonCombat,
    "Intrigues without structured Combat strength should not be playable through this reducer",
  );

  const noActors = combatFixture(state, data, (players) => players);
  const noActorResult = state.startCombatPhase(noActors);
  assert.equal(noActorResult.phase, "playing", "No eligible Combat actors should fall through to conflict resolution");
  assert.equal(noActorResult.round, noActors.round + 1);

  console.log("combat intrigue verification passed");
} finally {
  await server.close();
}
