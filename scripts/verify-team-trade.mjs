import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  const actor = game.players.find((player) => player.id === "p2");
  const partner = game.players.find((player) => player.id === "p4");
  assert.ok(actor, "Initial game should include p2");
  assert.ok(partner, "Initial game should include p4");

  const tradeSpace = data.boardSpaces.find((space) => space.name === "Economic Support");
  assert.ok(tradeSpace, "Economic Support should be in the board model");
  const pending = state.pendingActionForSpace(tradeSpace, actor, partner, game.players);
  assert.deepEqual(
    pending,
    {
      kind: "trade",
      actorId: actor.id,
      partnerId: partner.id,
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Economic Support",
    },
    "Economic Support should queue a one-good team trade",
  );

  const spiceTradeState = {
    ...game,
    pendingAction: pending,
    players: game.players.map((player) => (
      player.id === actor.id ? { ...player, resources: { ...player.resources, spice: 1 } } : player
    )),
  };
  const waterSelection = state.updateTradeSelection(spiceTradeState, pending, "water");
  assert.equal(
    waterSelection.pendingAction?.kind === "trade" ? waterSelection.pendingAction.resource : undefined,
    "water",
    "Trade good can be changed before any goods move",
  );
  const sameSelection = state.updateTradeSelection(spiceTradeState, pending, "spice", partner.id);
  assert.equal(sameSelection, spiceTradeState, "Re-selecting the current trade good and partner should be a no-op");
  const opponentSelection = state.updateTradeSelection(spiceTradeState, pending, "spice", "p3");
  assert.equal(opponentSelection, spiceTradeState, "Trade partner selection must stay within the actor's team");
  const unsupportedSelection = state.updateTradeSelection(spiceTradeState, pending, "melange");
  assert.equal(unsupportedSelection, spiceTradeState, "Trade goods outside the supported set must be ignored");

  const spiceActor = spiceTradeState.players.find((player) => player.id === actor.id);
  const spicePartner = spiceTradeState.players.find((player) => player.id === partner.id);
  assert.ok(spiceActor, "Spice trade fixture should include actor");
  assert.ok(spicePartner, "Spice trade fixture should include partner");
  const spiceAfter = state.transferTradeGood(spiceTradeState, pending, actor.id, partner.id);
  assert.equal(
    spiceAfter.players.find((player) => player.id === actor.id)?.resources.spice,
    spiceActor.resources.spice - 1,
    "Resource trade should remove one good from the giver",
  );
  assert.equal(
    spiceAfter.players.find((player) => player.id === partner.id)?.resources.spice,
    spicePartner.resources.spice + 1,
    "Resource trade should add one good to the recipient",
  );
  assert.equal(spiceAfter.pendingAction?.kind === "trade" ? spiceAfter.pendingAction.actorGiven : 0, 1);
  const repeatedSpiceAfter = state.transferTradeGood(spiceAfter, spiceAfter.pendingAction, actor.id, partner.id);
  assert.equal(repeatedSpiceAfter, spiceAfter, "A trade participant cannot give the selected good more than once");
  const partnerReturnAfter = state.transferTradeGood(spiceAfter, spiceAfter.pendingAction, partner.id, actor.id);
  assert.equal(
    partnerReturnAfter.pendingAction?.kind === "trade" ? partnerReturnAfter.pendingAction.partnerGiven : 0,
    1,
    "The trade partner can still give their one selected good",
  );
  const lockedTrade = state.updateTradeSelection(spiceAfter, spiceAfter.pendingAction, "intrigue");
  assert.equal(lockedTrade, spiceAfter, "Trade good cannot change after goods have moved");
  const lockedPartner = state.updateTradeSelection(spiceAfter, spiceAfter.pendingAction, "spice", "p6");
  assert.equal(lockedPartner, spiceAfter, "Trade partner cannot change after goods have moved");

  const opponentPending = { ...pending, partnerId: "p3" };
  const opponentAfter = state.transferTradeGood(spiceTradeState, opponentPending, actor.id, "p3");
  assert.equal(opponentAfter, spiceTradeState, "Trade transfers must stay within one team");

  const [intrigue] = data.intrigueCards;
  assert.ok(intrigue, "Uprising Intrigue data should be available");
  const intriguePending = { ...pending, resource: "intrigue" };
  const intrigueTradeState = {
    ...game,
    pendingAction: intriguePending,
    players: game.players.map((player) => (
      player.id === actor.id ? { ...player, intrigues: [intrigue] } : player
    )),
  };
  const unspecifiedAfter = state.transferTradeGood(intrigueTradeState, intriguePending, actor.id, partner.id);
  assert.equal(unspecifiedAfter, intrigueTradeState, "Intrigue trades must specify the chosen card id");
  const staleAfter = state.transferTradeGood(intrigueTradeState, intriguePending, actor.id, partner.id, "missing-card");
  assert.equal(staleAfter, intrigueTradeState, "Specified missing Intrigue card ids must not transfer a different card");

  const intrigueAfter = state.transferTradeGood(intrigueTradeState, intriguePending, actor.id, partner.id, intrigue.id);
  assert.equal(
    intrigueAfter.players.find((player) => player.id === actor.id)?.intrigues.length,
    0,
    "Intrigue trade should remove the chosen card from the giver",
  );
  assert.deepEqual(
    intrigueAfter.players.find((player) => player.id === partner.id)?.intrigues.map((card) => card.id),
    [intrigue.id],
    "Intrigue trade should add the chosen card to the recipient",
  );
  assert.equal(intrigueAfter.pendingAction?.kind === "trade" ? intrigueAfter.pendingAction.actorGiven : 0, 1);
  assert.equal(
    intrigueAfter.log[0],
    `${actor.leader} trades 1 Intrigue card to ${partner.leader}.`,
    "Intrigue trade logs should not expose the private card name",
  );
  assert.equal(
    intrigueAfter.log[0].includes(intrigue.name),
    false,
    "Intrigue trade logs should keep the exact card private",
  );
  const repeatedIntrigueAfter = state.transferTradeGood(intrigueAfter, intrigueAfter.pendingAction, actor.id, partner.id, intrigue.id);
  assert.equal(repeatedIntrigueAfter, intrigueAfter, "A trade participant cannot give multiple Intrigue cards in one trade");

  const emptyAfter = state.transferTradeGood(intrigueTradeState, intriguePending, partner.id, actor.id);
  assert.equal(emptyAfter, intrigueTradeState, "Players without Intrigue cards cannot trade one");

  console.log("team trade verification passed");
} finally {
  await server.close();
}
