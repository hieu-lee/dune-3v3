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
  const nonTradeCommanderCard = data.muadDibCommanderCards.find((card) => card.name === "Convincing Argument");
  assert.ok(nonTradeCommanderCard, "Verifier needs a non-trade Muad'Dib Commander card");
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
    kind: "trash-source-for-trade",
    ownerId: muadDib.id,
    partnerIds: [muadDibAllyA.id, muadDibAllyB.id],
    cardId: commandRespect.id,
    resource: "intrigue",
    optional: true,
    partnerLocked: true,
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
  const resolvedCommandRespect = state.resolveTrashSourceForTradeChoice(
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
  const queuedCommandRespectTrade = state.resolveTrashSourceForTradeChoice(
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
  const skippedCommandRespect = state.skipTrashSourceForTrade(commandRespectState, commandRespectPending);
  assert.equal(
    playerById(skippedCommandRespect, muadDib.id).playArea.length,
    1,
    "Skipping Command Respect should leave the card in play",
  );
  assert.equal(skippedCommandRespect.pendingAction, undefined, "Skipping Command Respect should advance pending action");
  const invalidCommandRespectPartner = state.resolveTrashSourceForTradeChoice(
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
  const forgedCardPending = { ...commandRespectPending, cardId: nonTradeCommanderCard.id };
  const forgedCardCommander = { ...baseCommandRespectCommander, playArea: [nonTradeCommanderCard] };
  const forgedCardState = {
    ...baseCommandRespectGame,
    pendingAction: forgedCardPending,
    players: baseCommandRespectGame.players.map((player) =>
      player.id === muadDib.id ? forgedCardCommander : player
    ),
  };
  const forgedCardResolve = state.resolveTrashSourceForTradeChoice(
    forgedCardState,
    forgedCardPending,
    muadDibAllyA.id,
  );
  assert.deepEqual(
    forgedCardResolve.pendingAction,
    forgedCardPending,
    "Command Respect should not let a forged pending trash a non-trade source card",
  );
  assert.equal(
    playerById(forgedCardResolve, muadDib.id).playArea[0]?.id,
    nonTradeCommanderCard.id,
    "Forged Command Respect pending should keep the unrelated card in play",
  );
  const staleSwordmasterCommander = { ...baseCommandRespectCommander, swordmasterBonus: false };
  const staleSwordmasterState = {
    ...baseCommandRespectGame,
    pendingAction: commandRespectPending,
    players: baseCommandRespectGame.players.map((player) =>
      player.id === muadDib.id ? staleSwordmasterCommander : player
    ),
  };
  assert.equal(
    state.resolveTrashSourceForTradeChoice(
      staleSwordmasterState,
      commandRespectPending,
      muadDibAllyA.id,
    ).pendingAction,
    commandRespectPending,
    "Command Respect should recheck its declarative Swordmaster condition before resolving",
  );
  for (const [patch, message] of [
    [{ optional: false }, "Command Respect should reject malformed optional flags"],
    [{ partnerLocked: "yes" }, "Command Respect should reject malformed partner lock flags"],
    [{ resource: "contracts" }, "Command Respect should reject unsupported trade resources"],
    [{ partnerIds: [muadDibAllyA.id] }, "Command Respect should reject incomplete partner choices"],
    [{ partnerIds: [muadDibAllyA.id, muadDibAllyA.id] }, "Command Respect should reject duplicate partner choices"],
  ]) {
    const malformedPending = { ...commandRespectPending, ...patch };
    assert.equal(
      state.resolveTrashSourceForTradeChoice(
        { ...baseCommandRespectGame, pendingAction: malformedPending, pendingQueue: [] },
        malformedPending,
        muadDibAllyA.id,
      ).pendingAction,
      malformedPending,
      message,
    );
  }
  for (const [patch, message] of [
    [{ optional: false }, "Skipping Command Respect should reject malformed optional flags"],
    [{ partnerLocked: "yes" }, "Skipping Command Respect should reject malformed partner lock flags"],
    [{ resource: "contracts" }, "Skipping Command Respect should reject unsupported trade resources"],
    [{ source: "" }, "Skipping Command Respect should reject empty source labels"],
  ]) {
    const malformedPending = { ...commandRespectPending, ...patch };
    assert.equal(
      state.skipTrashSourceForTrade(
        { ...baseCommandRespectGame, pendingAction: malformedPending, pendingQueue: [] },
        malformedPending,
      ).pendingAction,
      malformedPending,
      message,
    );
  }
}
