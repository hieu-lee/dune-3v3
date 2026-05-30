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
  const opponentSelection = state.updateTradeSelection(spiceTradeState, pending, "spice", "p3");
  assert.equal(opponentSelection, spiceTradeState, "Trade partner selection must stay within the actor's team");

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
  assert.match(intrigueAfter.log[0], new RegExp(`trades ${intrigue.name} to`));

  const emptyAfter = state.transferTradeGood(intrigueTradeState, intriguePending, partner.id, actor.id);
  assert.equal(emptyAfter, intrigueTradeState, "Players without Intrigue cards cannot trade one");

  console.log("team trade verification passed");
} finally {
  await server.close();
}
