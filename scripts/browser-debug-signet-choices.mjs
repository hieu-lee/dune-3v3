import assert from "node:assert/strict";

export async function runSignetChoicesSmoke({
  captures,
  currentGame,
  initialPlayableGame,
  openApp,
  page,
  screenshot,
  server,
  setDebugGameAndWait,
  url,
  waitForNoPending,
  writeJson,
}) {
  await openApp(page, url, 1440, 1100);
  const states = await createSignetChoiceStates(server, initialPlayableGame);
  await writeJson("pending-signet-choice-states.json", states);

  await setDebugGameAndWait(page, states.shaddam);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Emperor of the Known Universe/i);
  assert.match(pendingText, /Spend 1: Feyd-Rautha Harkonnen recruits 1 troop/i);
  await screenshot(page, captures, "pending-shaddam-signet.png");

  const shaddamBefore = await currentGame(page);
  const commanderBefore = shaddamBefore.players.find((player) => player.id === "p4");
  const allyBefore = shaddamBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1: Feyd-Rautha Harkonnen recruits 1 troop/ }).click();
  await waitForNoPending(page);
  const shaddamAfter = await currentGame(page);
  const commanderAfter = shaddamAfter.players.find((player) => player.id === "p4");
  const allyAfter = shaddamAfter.players.find((player) => player.id === "p2");
  assert.equal(commanderAfter.resources.solari, commanderBefore.resources.solari - 1, "Shaddam troop choice should spend 1 Solari");
  assert.equal(allyAfter.garrison, allyBefore.garrison + 1, "Shaddam troop choice should recruit for the activated Ally");

  await setDebugGameAndWait(page, states.irulan);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Chronicler's Insight/i);
  assert.match(pendingText, /Acquire cost-1 card to hand/i);
  assert.match(pendingText, /Trash hand card/i);
  await screenshot(page, captures, "pending-irulan-signet.png");

  await page.locator(".pending-panel").getByRole("button", { name: /Acquire cost-1 card to hand/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "acquire-card");
  const irulanAfter = await currentGame(page);
  assert.equal(irulanAfter.pendingAction.ownerId, "p6", "Irulan acquire branch should create an acquire pending action for Irulan");
  assert.equal(irulanAfter.pendingAction.destination, "hand", "Irulan acquire branch should acquire to hand");
}

async function createSignetChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const game = initialPlayableGame(await server.ssrLoadModule("/src/game/state.ts"));
  const shaddamSignet = data.commanderStarterDecks.shaddam.find((card) => card.sourceId === 554);
  const allySignet = data.allyStarterCards.find((card) => card.sourceId === 531);
  const costOneCard = data.imperiumDeck.find((card) => card.cost === 1);
  assert.ok(shaddamSignet, "Expected Shaddam commander Signet Ring");
  assert.ok(allySignet, "Expected generic Ally Signet Ring");
  assert.ok(costOneCard, "Expected a cost-1 Imperium card for Irulan");

  const shaddamCard = { ...shaddamSignet, id: "debug-shaddam-signet-ring" };
  const irulanCard = { ...allySignet, id: "debug-irulan-signet-ring" };
  const acquireCard = { ...costOneCard, id: "debug-irulan-acquire-card" };

  const shaddam = {
    ...game,
    activeSeat: 3,
    phase: "playing",
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id !== "p4") return player;
      return {
        ...player,
        resources: { ...player.resources, solari: 3 },
        playArea: [shaddamCard, ...player.playArea],
      };
    }),
    pendingAction: {
      kind: "shaddam-signet-ring",
      commanderId: "p4",
      allyId: "p2",
      cardId: shaddamCard.id,
      source: "Emperor of the Known Universe",
    },
  };

  const irulan = {
    ...game,
    activeSeat: 5,
    phase: "playing",
    imperiumRow: [acquireCard, ...game.imperiumRow.filter((card) => card.id !== acquireCard.id).slice(0, 4)],
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id !== "p6") return player;
      return {
        ...player,
        playArea: [irulanCard, ...player.playArea],
      };
    }),
    pendingAction: {
      kind: "irulan-signet-ring",
      ownerId: "p6",
      cardId: irulanCard.id,
      source: "Chronicler's Insight",
    },
  };

  return { shaddam, irulan };
}
