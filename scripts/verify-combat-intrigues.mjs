import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyCombatIntrigueBasicPlays } from "./verify-combat-intrigues-basic-plays.mjs";
import { verifyCombatIntrigueCatalog } from "./verify-combat-intrigues-catalog.mjs";
import { verifyCombatIntrigueCommanderBasics } from "./verify-combat-intrigues-commander-basics.mjs";
import { verifyCombatIntrigueGoToGround } from "./verify-combat-intrigues-go-to-ground.mjs";
import { verifyCombatIntriguePendingActions } from "./verify-combat-intrigues-pending-actions.mjs";
import { verifyCombatIntrigueStrengthAndSpies } from "./verify-combat-intrigues-strength-spies.mjs";
import { verifyCombatIntrigueReachAgreement } from "./verify-combat-intrigues-reach-agreement.mjs";
import { verifyCombatIntrigueRetreatBranches } from "./verify-combat-intrigues-retreat-branches.mjs";
import {
  boardSpaceByName,
  combatFixture,
  completedContract,
  intrigueBySourceId,
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
    sourceId: undefined,
    combatSwords: undefined,
    effects: [{ trigger: "combat-intrigue", effects: [{ kind: "gain-strength", selector: "self", amount: 2 }] }],
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

  verifyCombatIntrigueStrengthAndSpies({
    cards: { backedByChoam, findWeakness, verifierCombat, weirdingCombat },
    data,
    spaces: { arrakeenSpace, secretsSpace },
    state,
  });

  verifyCombatIntriguePendingActions({
    cards: { devour, questionableMethods, springTheTrap, verifierCombat },
    data,
    spaces: { espionageSpace, secretsSpace },
    state,
  });

  verifyCombatIntrigueCommanderBasics({
    cards: { verifierCombat },
    data,
    state,
  });

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
    publicOnly: true,
    allowFallback: true,
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
