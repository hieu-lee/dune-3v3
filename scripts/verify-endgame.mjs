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

function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

function intrigueBySourceId(data, sourceId) {
  const intrigue = data.intrigueCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(intrigue, `Expected Intrigue source ${sourceId}`);
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function endgameFixture(state, setupPlayers) {
  const game = state.initialGame();
  return {
    ...game,
    phase: "endgame",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: setupPlayers(game.players.map((player) => ({
      ...player,
      intrigues: [],
      wonConflicts: [],
    }))),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.battleIcon)
      .map((card) => [card.sourceId, card.battleIcon])
      .sort((left, right) => left[0] - right[0]),
    [
      [157, "desertMouse"],
      [158, "ornithopter"],
      [159, "crysknife"],
    ],
    "The three Plot/Endgame battle-icon Intrigues should be structured",
  );

  const crysknifeIntrigue = intrigueBySourceId(data, 159);
  const desertMouseIntrigue = intrigueBySourceId(data, 157);
  const secureSpiceTrade = intrigueBySourceId(data, 161);
  const choamProfits = intrigueBySourceId(data, 450);
  const shadowAlliance = intrigueBySourceId(data, 160);
  const spiceMustFlow = data.reserveMarket.find((card) => card.sourceId === 538);
  assert.ok(spiceMustFlow, "The Spice Must Flow reserve card should be available");
  const contracts = data.standardContracts.slice(0, 4);
  assert.equal(contracts.length, 4, "Expected enough contracts for CHOAM Profits fixture");
  const crysknifeConflict = { ...conflictBySourceId(data, 454), scored: false };
  const desertMouseConflict = { ...conflictBySourceId(data, 460), scored: false };
  const propaganda = { ...conflictBySourceId(data, 463), scored: false };

  const standardMatch = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, intrigues: [crysknifeIntrigue], wonConflicts: [crysknifeConflict] }
        : player,
    ),
  );
  assert.deepEqual(state.endgameBattleIconChoices(standardMatch), [{
    playerId: "p2",
    intrigueId: crysknifeIntrigue.id,
    conflictId: crysknifeConflict.id,
    battleIcon: "crysknife",
  }]);
  const scoredStandard = state.scoreEndgameBattleIconIntrigue(standardMatch, "p2", crysknifeIntrigue.id, crysknifeConflict.id);
  const standardPlayer = playerById(scoredStandard, "p2");
  assert.equal(standardPlayer.vp, playerById(standardMatch, "p2").vp + 1);
  assert.equal(standardPlayer.intrigues.length, 0, "Scored Endgame Intrigue should leave the hand");
  assert.equal(scoredStandard.intrigueDiscard.at(-1).id, crysknifeIntrigue.id);
  assert.equal(standardPlayer.wonConflicts[0].scored, true, "Matched Conflict should flip face down");

  const wildMatch = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, intrigues: [crysknifeIntrigue], wonConflicts: [propaganda] }
        : player,
    ),
  );
  const scoredWild = state.scoreEndgameBattleIconIntrigue(wildMatch, "p2", crysknifeIntrigue.id, propaganda.id);
  assert.equal(playerById(scoredWild, "p2").vp, playerById(wildMatch, "p2").vp + 1, "Wild Conflict icons should match Endgame battle-icon Intrigues");
  assert.equal(playerById(scoredWild, "p2").wonConflicts[0].scored, true);

  const explicitConflictChoice = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, intrigues: [crysknifeIntrigue], wonConflicts: [propaganda, crysknifeConflict] }
        : player,
    ),
  );
  assert.deepEqual(
    state.endgameBattleIconChoices(explicitConflictChoice).map((choice) => choice.conflictId),
    [propaganda.id, crysknifeConflict.id],
    "Each matching Conflict should be a distinct Endgame choice",
  );
  const scoredExplicit = state.scoreEndgameBattleIconIntrigue(
    explicitConflictChoice,
    "p2",
    crysknifeIntrigue.id,
    crysknifeConflict.id,
  );
  assert.equal(
    playerById(scoredExplicit, "p2").wonConflicts.find((conflict) => conflict.id === propaganda.id).scored,
    false,
    "Scoring a specific Conflict should not flip a different wild match",
  );
  assert.equal(
    playerById(scoredExplicit, "p2").wonConflicts.find((conflict) => conflict.id === crysknifeConflict.id).scored,
    true,
  );

  const mismatch = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, intrigues: [desertMouseIntrigue], wonConflicts: [crysknifeConflict] }
        : player,
    ),
  );
  assert.deepEqual(state.endgameBattleIconChoices(mismatch), [], "Mismatched icons should not create Endgame choices");
  assert.equal(state.scoreEndgameBattleIconIntrigue(mismatch, "p2", desertMouseIntrigue.id), mismatch);

  const scoredConflictIgnored = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, intrigues: [desertMouseIntrigue], wonConflicts: [{ ...desertMouseConflict, scored: true }] }
        : player,
    ),
  );
  assert.deepEqual(state.endgameBattleIconChoices(scoredConflictIgnored), []);

  const commanderCannotScore = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p4"
        ? { ...player, intrigues: [crysknifeIntrigue], wonConflicts: [crysknifeConflict] }
        : player,
    ),
  );
  assert.deepEqual(state.endgameBattleIconChoices(commanderCannotScore), []);
  assert.equal(
    state.scoreEndgameBattleIconIntrigue(commanderCannotScore, "p4", crysknifeIntrigue.id, crysknifeConflict.id),
    commanderCannotScore,
    "Commanders cannot score battle-icon Endgame Intrigues",
  );

  const secureSpiceTradeEligible = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p4"
        ? {
            ...player,
            deck: [{ ...spiceMustFlow, id: "tsmf-deck" }],
            discard: [{ ...spiceMustFlow, id: "tsmf-discard" }],
            intrigues: [secureSpiceTrade],
          }
        : player,
    ),
  );
  assert.deepEqual(state.endgameConditionalIntrigueChoices(secureSpiceTradeEligible), [{
    playerId: "p4",
    intrigueId: secureSpiceTrade.id,
    vp: 1,
    spice: 2,
  }]);
  const secureSpiceTradeScored = state.scoreEndgameConditionalIntrigue(
    secureSpiceTradeEligible,
    "p4",
    secureSpiceTrade.id,
  );
  assert.equal(playerById(secureSpiceTradeScored, "p4").vp, playerById(secureSpiceTradeEligible, "p4").vp + 1);
  assert.equal(
    playerById(secureSpiceTradeScored, "p4").resources.spice,
    playerById(secureSpiceTradeEligible, "p4").resources.spice + 2,
  );
  assert.equal(playerById(secureSpiceTradeScored, "p4").intrigues.length, 0);
  assert.equal(secureSpiceTradeScored.intrigueDiscard.at(-1).id, secureSpiceTrade.id);

  const secureSpiceTradeIneligible = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p4"
        ? { ...player, discard: [{ ...spiceMustFlow, id: "single-tsmf" }], intrigues: [secureSpiceTrade] }
        : player,
    ),
  );
  assert.deepEqual(state.endgameConditionalIntrigueChoices(secureSpiceTradeIneligible), []);
  assert.equal(
    state.scoreEndgameConditionalIntrigue(secureSpiceTradeIneligible, "p4", secureSpiceTrade.id),
    secureSpiceTradeIneligible,
  );

  const choamProfitsEligible = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            intrigues: [choamProfits],
            contracts: contracts.map((contract, index) => ({
              card: contract,
              completed: true,
              takenRound: index + 1,
            })),
          }
        : player,
    ),
  );
  assert.deepEqual(state.endgameConditionalIntrigueChoices(choamProfitsEligible), [{
    playerId: "p2",
    intrigueId: choamProfits.id,
    vp: 1,
  }]);
  const choamProfitsScored = state.scoreEndgameConditionalIntrigue(choamProfitsEligible, "p2", choamProfits.id);
  assert.equal(playerById(choamProfitsScored, "p2").vp, playerById(choamProfitsEligible, "p2").vp + 1);
  assert.equal(playerById(choamProfitsScored, "p2").resources.spice, playerById(choamProfitsEligible, "p2").resources.spice);
  assert.equal(playerById(choamProfitsScored, "p2").intrigues.length, 0);
  assert.equal(choamProfitsScored.intrigueDiscard.at(-1).id, choamProfits.id);

  const choamProfitsIneligible = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            intrigues: [choamProfits],
            contracts: contracts.map((contract, index) => ({
              card: contract,
              completed: index < 3,
              takenRound: index + 1,
            })),
          }
        : player,
    ),
  );
  assert.deepEqual(state.endgameConditionalIntrigueChoices(choamProfitsIneligible), []);

  const shadowAllianceEligibleBase = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            influence: { ...player.influence, greatHouses: 4 },
            intrigues: [shadowAlliance],
          }
        : player,
    ),
  );
  const shadowAllianceEligible = state.setAllianceOwner(shadowAllianceEligibleBase, "greatHouses", "p3");
  assert.deepEqual(state.endgameConditionalIntrigueChoices(shadowAllianceEligible), [{
    playerId: "p2",
    intrigueId: shadowAlliance.id,
    vp: 1,
  }]);
  const shadowAllianceScored = state.scoreEndgameConditionalIntrigue(
    shadowAllianceEligible,
    "p2",
    shadowAlliance.id,
  );
  assert.equal(playerById(shadowAllianceScored, "p2").vp, playerById(shadowAllianceEligible, "p2").vp + 1);
  assert.equal(playerById(shadowAllianceScored, "p2").intrigues.length, 0);
  assert.equal(shadowAllianceScored.intrigueDiscard.at(-1).id, shadowAlliance.id);

  const shadowAllianceSameTeamOwner = state.setAllianceOwner(shadowAllianceEligibleBase, "greatHouses", "p6");
  assert.deepEqual(
    state.endgameConditionalIntrigueChoices(shadowAllianceSameTeamOwner),
    [],
    "Shadow Alliance requires an opposing team to hold the matching Alliance",
  );

  const shadowAllianceTooLow = state.setAllianceOwner(
    endgameFixture(state, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              influence: { ...player.influence, greatHouses: 3 },
              intrigues: [shadowAlliance],
            }
          : player,
      ),
    ),
    "greatHouses",
    "p3",
  );
  assert.deepEqual(state.endgameConditionalIntrigueChoices(shadowAllianceTooLow), []);

  const commanderShadowAllianceBase = endgameFixture(state, (players) =>
    players.map((player) => {
      if (player.id === "p4") return { ...player, intrigues: [shadowAlliance] };
      if (player.id === "p6") return { ...player, influence: { ...player.influence, spacing: 4 } };
      return player;
    }),
  );
  const commanderShadowAlliance = state.setAllianceOwner(commanderShadowAllianceBase, "spacing", "p3");
  assert.deepEqual(
    state.endgameConditionalIntrigueChoices(commanderShadowAlliance),
    [{
      playerId: "p4",
      intrigueId: shadowAlliance.id,
      vp: 1,
    }],
    "Commanders should use their highest Ally influence for Shadow Alliance",
  );

  const commanderPersonalShadowAllianceBase = endgameFixture(state, (players) =>
    players.map((player) =>
      player.id === "p4"
        ? {
            ...player,
            influence: { ...player.influence, emperor: 4 },
            intrigues: [shadowAlliance],
          }
        : player,
    ),
  );
  const commanderPersonalShadowAlliance = state.setAllianceOwner(commanderPersonalShadowAllianceBase, "emperor", "p1");
  assert.deepEqual(state.endgameConditionalIntrigueChoices(commanderPersonalShadowAlliance), [{
    playerId: "p4",
    intrigueId: shadowAlliance.id,
    vp: 1,
  }]);

  const vpTrigger = {
    ...state.initialGame(),
    conflict: conflictBySourceId(data, 454),
    conflictDeck: [conflictBySourceId(data, 456)],
    pendingAction: undefined,
    pendingQueue: [],
  };
  vpTrigger.players = vpTrigger.players.map((player) =>
    player.id === "p2" ? { ...player, vp: 10, revealed: true, agentsReady: 0 } : { ...player, revealed: true, agentsReady: 0 },
  );
  const vpEndgame = state.startNextRound(vpTrigger);
  assert.equal(vpEndgame.phase, "endgame", "A player at 10 VP should trigger Endgame during Recall");
  assert.match(vpEndgame.endgameReason, /reached 10 VP/);

  const deckTrigger = {
    ...vpTrigger,
    players: vpTrigger.players.map((player) => ({ ...player, vp: player.role === "Commander" ? 4 : 1 })),
    conflictDeck: [],
  };
  const deckEndgame = state.startNextRound(deckTrigger);
  assert.equal(deckEndgame.phase, "endgame", "An empty Conflict deck should trigger Endgame");
  assert.match(deckEndgame.endgameReason, /Conflict deck is empty/);

  const finished = state.finishEndgame({
    ...standardMatch,
    players: standardMatch.players.map((player) => {
      if (player.team === "muaddib") return { ...player, vp: 5 };
      if (player.team === "shaddam") return { ...player, vp: 3 };
      return player;
    }),
  });
  assert.equal(finished.phase, "finished");
  assert.equal(finished.winningTeam, "muaddib");

  console.log("endgame verification passed");
} finally {
  await server.close();
}
