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
