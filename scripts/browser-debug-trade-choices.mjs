import assert from "node:assert/strict";

export async function runTradeChoicesSmoke({
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
  const states = await createTradeChoiceStates(server, initialPlayableGame);
  await writeJson("pending-trade-choice-states.json", states);

  await setDebugGameAndWait(page, states.resource);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Trade from Browser debug trade/i);
  assert.match(pendingText, /Spice/i);
  assert.match(pendingText, /Feyd-Rautha Harkonnen gives 1 \(0\)/i);
  await screenshot(page, captures, "pending-trade-resource.png");

  let before = await currentGame(page);
  let actorBefore = before.players.find((player) => player.id === "p2");
  let partnerBefore = before.players.find((player) => player.id === "p4");
  await page.locator(".pending-panel").getByRole("button", { name: "Feyd-Rautha Harkonnen gives 1 (0)" }).click();
  let after = await currentGame(page);
  let actorAfter = after.players.find((player) => player.id === "p2");
  let partnerAfter = after.players.find((player) => player.id === "p4");
  assert.equal(actorAfter.resources.spice, actorBefore.resources.spice - 1, "Resource trade should spend actor spice");
  assert.equal(partnerAfter.resources.spice, partnerBefore.resources.spice + 1, "Resource trade should pay partner spice");
  assert.equal(after.pendingAction.actorGiven, 1, "Resource trade should count actor-given goods");
  await page.locator(".pending-panel").getByRole("button", { name: "Done" }).click();
  await waitForNoPending(page);

  await setDebugGameAndWait(page, states.intrigue);
  pendingText = await page.locator(".pending-panel").innerText();
  const intrigueName = states.intrigue.players.find((player) => player.id === "p2").intrigues[0].name;
  assert.match(pendingText, /Trade from Browser debug intrigue trade/i);
  assert.match(pendingText, /Intrigue/i);
  assert.match(pendingText, new RegExp(escapeRegExp(intrigueName)));
  await screenshot(page, captures, "pending-trade-intrigue.png");

  before = await currentGame(page);
  actorBefore = before.players.find((player) => player.id === "p2");
  partnerBefore = before.players.find((player) => player.id === "p4");
  await page.locator(".pending-panel").getByRole("button", { name: intrigueName }).click();
  after = await currentGame(page);
  actorAfter = after.players.find((player) => player.id === "p2");
  partnerAfter = after.players.find((player) => player.id === "p4");
  assert.equal(actorAfter.intrigues.length, actorBefore.intrigues.length - 1, "Intrigue trade should remove actor card");
  assert.equal(partnerAfter.intrigues.length, partnerBefore.intrigues.length + 1, "Intrigue trade should add partner card");
  assert.equal(partnerAfter.intrigues.at(-1).name, intrigueName, "Intrigue trade should move the selected card");
  assert.equal(after.pendingAction.actorGiven, 1, "Intrigue trade should count actor-given cards");
  await page.locator(".pending-panel").getByRole("button", { name: "Done" }).click();
  await waitForNoPending(page);
}

async function createTradeChoiceStates(server, initialPlayableGame) {
  const game = initialPlayableGame(await server.ssrLoadModule("/src/game/state.ts"));
  const activeSeat = game.players.findIndex((player) => player.id === "p2");
  assert.ok(activeSeat >= 0, "Expected p2 in browser debug game");
  assert.ok(game.intrigueDeck[0], "Expected at least one Intrigue card in browser debug game");

  const base = {
    ...game,
    activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };

  return {
    resource: {
      ...base,
      players: base.players.map((player) => {
        if (player.id === "p2") return { ...player, resources: { ...player.resources, spice: 2 } };
        if (player.id === "p4") return { ...player, resources: { ...player.resources, spice: 0 } };
        return player;
      }),
      pendingAction: tradePending("spice", "Browser debug trade"),
    },
    intrigue: {
      ...base,
      players: base.players.map((player) => {
        if (player.id === "p2") return { ...player, intrigues: [base.intrigueDeck[0]] };
        if (player.id === "p4") return { ...player, intrigues: [] };
        return player;
      }),
      intrigueDeck: base.intrigueDeck.slice(1),
      pendingAction: tradePending("intrigue", "Browser debug intrigue trade"),
    },
  };
}

function tradePending(resource, source) {
  return {
    kind: "trade",
    actorId: "p2",
    partnerId: "p4",
    resource,
    actorGiven: 0,
    partnerGiven: 0,
    source,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
