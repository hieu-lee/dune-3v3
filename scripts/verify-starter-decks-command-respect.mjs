import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyStarterDeckCommandRespect({
  data,
  game,
  players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB },
  state,
}) {
  const commandRespect = data.muadDibCommanderCards.find((card) => card.name === "Command Respect");
  assert.ok(commandRespect, "Muad'Dib Commander deck should include Command Respect");
  assert.equal(
    state.isCommandRespectCommanderCard(commandRespect),
    true,
    "Command Respect should be recognized as its Commander starter card",
  );
  const arrakeenForCommandRespect = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeenForCommandRespect, "Arrakeen should exist for Command Respect regression");
  const commandRespectIntrigue = data.intrigueCards[0];
  assert.ok(commandRespectIntrigue, "Verifier needs an Intrigue card for Command Respect trade");
  const baseCommandRespectCommander = {
    ...muadDib,
    swordmasterBonus: true,
    playArea: [commandRespect],
    intrigues: [commandRespectIntrigue],
  };
  const baseCommandRespectGame = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return baseCommandRespectCommander;
      if (player.id === muadDibAllyA.id) return { ...muadDibAllyA, intrigues: [] };
      if (player.id === muadDibAllyB.id) return { ...muadDibAllyB, resources: { solari: 0, spice: 2, water: 0 } };
      return player;
    }),
  };
  const commandRespectPending = state.pendingActionForCard(
    commandRespect,
    baseCommandRespectCommander,
    baseCommandRespectGame,
    muadDibAllyA,
    arrakeenForCommandRespect,
  );
  assert.deepEqual(commandRespectPending, {
    kind: "command-respect",
    commanderId: muadDib.id,
    partnerIds: [muadDibAllyA.id, muadDibAllyB.id],
    cardId: commandRespect.id,
    source: "Command Respect",
  });
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      { ...baseCommandRespectCommander, swordmasterBonus: false },
      baseCommandRespectGame,
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should require Muad'Dib's Swordmaster Bonus token",
  );
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      { ...baseCommandRespectCommander, playArea: [] },
      baseCommandRespectGame,
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should require the card in play before it can be trashed",
  );
  assert.equal(
    state.pendingActionForCard(commandRespect, muadDibAllyA, baseCommandRespectGame, muadDibAllyB, arrakeenForCommandRespect),
    undefined,
    "Command Respect should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(commandRespect, emperor, baseCommandRespectGame, shaddamAlly, arrakeenForCommandRespect),
    undefined,
    "Command Respect should not trigger for Shaddam's Commander",
  );
  assert.equal(
    state.pendingActionForCard(
      commandRespect,
      baseCommandRespectCommander,
      {
        ...baseCommandRespectGame,
        players: baseCommandRespectGame.players.filter((player) => player.id !== muadDibAllyB.id),
      },
      muadDibAllyA,
      arrakeenForCommandRespect,
    ),
    undefined,
    "Command Respect should need both Muad'Dib Allies available as trade partners",
  );
  const commandRespectState = { ...baseCommandRespectGame, pendingAction: commandRespectPending, pendingQueue: [] };
  const resolvedCommandRespect = state.resolveCommandRespectTrade(
    commandRespectState,
    commandRespectPending,
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(resolvedCommandRespect, muadDib.id).playArea.length,
    0,
    "Command Respect payment should trash the card from play",
  );
  assert.deepEqual(
    resolvedCommandRespect.pendingAction,
    {
      kind: "trade",
      actorId: muadDib.id,
      partnerId: muadDibAllyA.id,
      resource: "intrigue",
      actorGiven: 0,
      partnerGiven: 0,
      partnerLocked: true,
      source: "Command Respect",
    },
    "Command Respect should hand off to the normal trade pending action",
  );
  assert.deepEqual(
    state.updateTradeSelection(resolvedCommandRespect, resolvedCommandRespect.pendingAction, "intrigue", muadDibAllyB.id).pendingAction,
    resolvedCommandRespect.pendingAction,
    "Command Respect should lock the partner chosen when the card was trashed",
  );
  assert.match(
    resolvedCommandRespect.log[0],
    /trashes Command Respect to trade/,
    "Command Respect should log the self-trash trade payment",
  );
  const queuedCommandRespectSpy = {
    kind: "spy",
    ownerId: muadDib.id,
    remaining: 1,
    source: "Queued Command Respect regression",
  };
  const queuedCommandRespectTrade = state.resolveCommandRespectTrade(
    { ...commandRespectState, pendingQueue: [queuedCommandRespectSpy] },
    commandRespectPending,
    muadDibAllyA.id,
  );
  assert.deepEqual(
    queuedCommandRespectTrade.pendingQueue,
    [queuedCommandRespectSpy],
    "Command Respect should preserve queued actions behind the trade",
  );
  assert.deepEqual(
    state.finishPendingAction(queuedCommandRespectTrade).pendingAction,
    queuedCommandRespectSpy,
    "Finishing an empty Command Respect trade should expose the previously queued action",
  );
  const afterCommandRespectIntrigueTrade = state.transferTradeGood(
    resolvedCommandRespect,
    resolvedCommandRespect.pendingAction,
    muadDib.id,
    muadDibAllyA.id,
    commandRespectIntrigue.id,
  );
  assert.equal(
    playerById(afterCommandRespectIntrigueTrade, muadDib.id).intrigues.length,
    0,
    "Command Respect trade should let Muad'Dib give an Intrigue",
  );
  assert.equal(
    playerById(afterCommandRespectIntrigueTrade, muadDibAllyA.id).intrigues[0]?.id,
    commandRespectIntrigue.id,
    "Command Respect trade should give the chosen Ally the traded Intrigue",
  );
  const finishedCommandRespectTrade = state.finishPendingAction(afterCommandRespectIntrigueTrade);
  assert.equal(finishedCommandRespectTrade.pendingAction, undefined, "Command Respect trade should finish through the normal trade flow");
  const skippedCommandRespect = state.skipCommandRespect(commandRespectState, commandRespectPending);
  assert.equal(
    playerById(skippedCommandRespect, muadDib.id).playArea.length,
    1,
    "Skipping Command Respect should leave the card in play",
  );
  assert.equal(skippedCommandRespect.pendingAction, undefined, "Skipping Command Respect should advance pending action");
  const invalidCommandRespectPartner = state.resolveCommandRespectTrade(
    commandRespectState,
    commandRespectPending,
    shaddamAlly.id,
  );
  assert.equal(
    playerById(invalidCommandRespectPartner, muadDib.id).playArea.length,
    1,
    "Command Respect should not trash for an opposing trade partner",
  );
  assert.deepEqual(
    invalidCommandRespectPartner.pendingAction,
    commandRespectPending,
    "Command Respect should keep waiting after an invalid partner choice",
  );
}
