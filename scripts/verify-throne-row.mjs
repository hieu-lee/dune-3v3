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
  assert.deepEqual(game.throneRow, [], "Initial Throne Row should start empty");
  if (game.imperiumRow.some(state.canMoveCardToThroneRow)) {
    assert.deepEqual(
      game.pendingAction,
      { kind: "throne-row", ownerId: "p4", source: "Emperor personal board" },
      "Shaddam's Emperor board should queue a starting Throne Row choice",
    );
  } else {
    assert.equal(game.pendingAction, undefined, "No starting Throne Row choice should queue without an eligible card");
  }

  const shaddam = game.players.find((player) => player.id === "p4");
  const muadDib = game.players.find((player) => player.id === "p1");
  assert.ok(shaddam, "Initial game should include Shaddam");
  assert.ok(muadDib, "Initial game should include Muad'Dib");

  const imperialTent = data.emperorCommanderCards.find((card) => card.name === "Imperial Tent");
  assert.ok(imperialTent, "Shaddam Commander deck should include Imperial Tent");

  const bySourceId = new Map(data.imperiumDeck.map((card) => [card.sourceId, card]));
  const eligible = bySourceId.get(38);
  const fremen = bySourceId.get(67);
  const replacement = bySourceId.get(75);
  const rowPurchaseCard = data.imperiumDeck.find((card) =>
    ![eligible?.id, fremen?.id, replacement?.id].includes(card.id) && state.canMoveCardToThroneRow(card)
  );
  assert.ok(eligible, "Verifier needs Guild Envoy as a non-Fremen Imperium card");
  assert.ok(fremen, "Verifier needs Chani as a Fremen Imperium card");
  assert.ok(replacement, "Verifier needs Overthrow as a replacement Imperium card");
  assert.ok(rowPurchaseCard, "Verifier needs a normal Imperium Row purchase card");
  assert.equal(state.canMoveCardToThroneRow(eligible), true, "Faction traits, not agent icons, drive Throne Row eligibility");
  assert.equal(state.canMoveCardToThroneRow(fremen), false, "Fremen faction cards cannot move to the Throne Row");

  const fixture = {
    ...game,
    imperiumRow: [eligible, fremen, rowPurchaseCard, ...data.imperiumDeck.filter((card) =>
      ![eligible.id, fremen.id, replacement.id, rowPurchaseCard.id].includes(card.id)
    ).slice(0, 2)],
    marketDeck: [replacement, ...game.marketDeck.filter((card) =>
      ![eligible.id, fremen.id, replacement.id, rowPurchaseCard.id].includes(card.id)
    )],
    throneRow: [],
    pendingAction: undefined,
    pendingQueue: [],
  };
  assert.deepEqual(
    state.pendingActionForShaddamPersonalBoard(fixture),
    { kind: "throne-row", ownerId: shaddam.id, source: "Emperor personal board" },
    "The Emperor personal board should queue a game-start Throne Row choice",
  );
  assert.equal(
    state.pendingActionForShaddamPersonalBoard({ ...fixture, imperiumRow: [fremen] }),
    undefined,
    "The Emperor personal board should not queue when no non-Fremen row card is available",
  );
  const pending = state.pendingActionForCard(imperialTent, shaddam, fixture);
  assert.deepEqual(
    pending,
    { kind: "throne-row", ownerId: shaddam.id, source: "Imperial Tent" },
    "Imperial Tent should queue a Throne Row choice when an eligible row card exists",
  );
  assert.equal(
    state.pendingActionForCard(imperialTent, muadDib, fixture),
    undefined,
    "Muad'Dib team must not trigger Shaddam's Throne Row",
  );

  const moved = state.moveImperiumCardToThroneRow(fixture, pending, eligible.id);
  assert.deepEqual(moved.throneRow.map((card) => card.id), [eligible.id]);
  assert.equal(moved.imperiumRow.length, 5, "Moving to the Throne Row should immediately refill the Imperium Row");
  assert.equal(moved.imperiumRow.some((card) => card.id === eligible.id), false);
  assert.equal(moved.imperiumRow.some((card) => card.id === replacement.id), true);
  assert.equal(moved.marketDeck.length, fixture.marketDeck.length - 1);
  assert.equal(moved.pendingAction, undefined, "Choosing a Throne Row card should advance the pending action");
  assert.match(moved.log[0], /moves .* to the Throne Row/);

  const setupPending = state.pendingActionForShaddamPersonalBoard(fixture);
  const setupMoved = state.moveImperiumCardToThroneRow(fixture, setupPending, eligible.id);
  assert.deepEqual(setupMoved.throneRow.map((card) => card.id), [eligible.id]);
  assert.match(setupMoved.log[0], /Emperor personal board/);

  assert.equal(
    state.moveImperiumCardToThroneRow(fixture, pending, fremen.id),
    fixture,
    "Fremen cards cannot be moved to the Throne Row",
  );
  assert.equal(
    state.moveImperiumCardToThroneRow(fixture, { ...pending, ownerId: muadDib.id }, eligible.id),
    fixture,
    "Only Shaddam can move cards to the Throne Row",
  );

  const buyFixture = {
    ...moved,
    activeSeat: moved.players.findIndex((player) => player.id === "p2"),
    players: moved.players.map((player) => {
      if (player.id === "p2") return { ...player, revealed: true, persuasion: eligible.cost ?? 0 };
      return player;
    }),
  };
  const shaddamBuy = state.acquireMarketCard(buyFixture, "p2", eligible.id);
  assert.equal(shaddamBuy.throneRow.length, 0, "Shaddam team should acquire from the Throne Row");
  assert.deepEqual(
    shaddamBuy.imperiumRow.map((card) => card.id),
    buyFixture.imperiumRow.map((card) => card.id),
    "Buying from the Throne Row must not refill or mutate the Imperium Row",
  );
  assert.equal(
    shaddamBuy.marketDeck.length,
    buyFixture.marketDeck.length,
    "Buying from the Throne Row must not draw from the market deck",
  );
  assert.equal(
    shaddamBuy.players.find((player) => player.id === "p2")?.discard.at(-1)?.id,
    eligible.id,
    "Acquired Throne Row card should go to the buyer discard",
  );
  const muadDibBuyFixture = {
    ...buyFixture,
    activeSeat: buyFixture.players.findIndex((player) => player.id === "p3"),
    players: buyFixture.players.map((player) =>
      player.id === "p3" ? { ...player, revealed: true, persuasion: eligible.cost ?? 0 } : player,
    ),
  };
  assert.equal(
    state.acquireMarketCard(muadDibBuyFixture, "p3", eligible.id),
    muadDibBuyFixture,
    "Muad'Dib team must not acquire Throne Row cards",
  );

  const rowBuyFixture = {
    ...fixture,
    activeSeat: fixture.players.findIndex((player) => player.id === "p3"),
    players: fixture.players.map((player) =>
      player.id === "p3" ? { ...player, revealed: true, persuasion: rowPurchaseCard.cost ?? 0 } : player,
    ),
  };
  const rowBuy = state.acquireMarketCard(rowBuyFixture, "p3", rowPurchaseCard.id);
  assert.equal(rowBuy.throneRow.length, 0, "Normal Imperium Row buys must not alter the Throne Row");
  assert.equal(rowBuy.imperiumRow.some((card) => card.id === rowPurchaseCard.id), false);
  assert.equal(rowBuy.imperiumRow.some((card) => card.id === replacement.id), true);
  assert.equal(rowBuy.marketDeck.length, rowBuyFixture.marketDeck.length - 1);
  assert.equal(
    rowBuy.players.find((player) => player.id === "p3")?.discard.at(-1)?.id,
    rowPurchaseCard.id,
    "Normal Imperium Row cards should still go to the buyer discard",
  );

  console.log("throne row verification passed");
} finally {
  await server.close();
}
