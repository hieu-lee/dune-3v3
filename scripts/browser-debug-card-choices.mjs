import assert from "node:assert/strict";

export async function runCardChoicesSmoke({
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
  const states = await createCardChoiceStates(server, initialPlayableGame);
  await writeJson("pending-card-choice-states.json", states);

  await setDebugGameAndWait(page, states.contractPublic);
  let pendingText = await page.locator(".pending-panel").innerText();
  const contractName = states.contractPublic.contractOffer[0].name;
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, new RegExp(escapeRegExp(contractName)));
  await screenshot(page, captures, "pending-contract-public.png");

  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: contractName }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Contract choice should add one contract");
  assert.equal(ownerAfter.contracts.at(-1).card.name, contractName, "Contract choice should take the selected contract");

  await setDebugGameAndWait(page, states.contractFallback);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, /Collect 2 Solari/i);
  await screenshot(page, captures, "pending-contract-fallback.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Collect 2 Solari" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari + 2, "Contract fallback should pay 2 Solari");

  await setDebugGameAndWait(page, states.acquire);
  pendingText = await page.locator(".pending-panel").innerText();
  const acquireName = states.acquire.imperiumRow[0].name;
  assert.match(pendingText, /acquisition/i);
  assert.match(pendingText, new RegExp(escapeRegExp(acquireName)));
  await screenshot(page, captures, "pending-acquire-card.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: acquireName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.length, ownerBefore.discard.length + 1, "Acquire choice should add one discard card");
  assert.equal(ownerAfter.discard.at(-1).name, acquireName, "Acquire choice should take the selected card");

  await setDebugGameAndWait(page, states.acquireReserve);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /acquisition/i);
  assert.match(pendingText, /Prepare The Way/i);
  await screenshot(page, captures, "pending-acquire-prepare-the-way.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Prepare The Way/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.length, ownerBefore.discard.length + 1, "Reserve acquire should add one discard card");
  assert.equal(ownerAfter.discard.at(-1).sourceId, 537, "Reserve acquire should take Prepare The Way");
  assert.ok(after.reserveMarket.some((card) => card.sourceId === 537), "Prepare The Way reserve should remain available");

  await setDebugGameAndWait(page, states.capturedMentat);
  pendingText = await page.locator(".pending-panel").innerText();
  const capturedMentatDiscardName = states.capturedMentat.capturedMentatDiscardName;
  const capturedMentatDiscardId = states.capturedMentat.capturedMentatDiscardId;
  const capturedMentatDrawId = states.capturedMentat.capturedMentatDrawId;
  assert.match(pendingText, /Captured Mentat/i);
  assert.match(pendingText, new RegExp(escapeRegExp(capturedMentatDiscardName)));
  assert.match(pendingText, /Bene Gesserit/i);
  await screenshot(page, captures, "pending-captured-mentat.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: capturedMentatDiscardName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Bene Gesserit" }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Resolve Captured Mentat" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.at(-1).id, capturedMentatDiscardId, "Captured Mentat should discard the selected card");
  assert.equal(ownerAfter.hand.at(-1).id, capturedMentatDrawId, "Captured Mentat should draw one deck card");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Captured Mentat should gain chosen Influence");

  await setDebugGameAndWait(page, states.capturedMentatReveal);
  pendingText = await page.locator(".pending-panel").innerText();
  const capturedMentatIntrigueId = states.capturedMentatReveal.capturedMentatIntrigueId;
  assert.match(pendingText, /Captured Mentat reveal/i);
  assert.match(pendingText, /Bene Gesserit/i);
  await screenshot(page, captures, "pending-captured-mentat-reveal.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Bene Gesserit" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene - 1, "Captured Mentat reveal should lose chosen Influence");
  assert.equal(ownerAfter.intrigues.at(-1).id, capturedMentatIntrigueId, "Captured Mentat reveal should draw one Intrigue");

  await setDebugGameAndWait(page, states.acquireEmpty);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /No eligible cards cost 99 or less/i);
  await screenshot(page, captures, "pending-acquire-card-empty.png");
}

async function createCardChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const ownerId = "p2";
  const activeSeat = game.players.findIndex((player) => player.id === ownerId);
  assert.ok(activeSeat >= 0, "Expected p2 in browser debug game");
  assert.ok(game.contractOffer[0], "Expected at least one public contract");
  assert.ok(game.imperiumRow[0], "Expected at least one Imperium Row card");
  const prepareTheWay = game.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Expected Prepare The Way reserve card");
  const capturedMentat = data.imperiumDeck.find((card) => card.sourceId === 61);
  assert.ok(capturedMentat, "Expected Captured Mentat Imperium card");
  const capturedMentatDiscard = { ...data.allyStarterCards[0], id: "browser-captured-mentat-discard-card" };
  const capturedMentatDraw = { ...data.imperiumDeck.find((card) => card.name === "Calculus of Power"), id: "browser-captured-mentat-draw-card" };
  assert.ok(capturedMentatDraw.name, "Expected Captured Mentat draw card");
  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "browser-captured-mentat-intrigue-card" };
  assert.ok(capturedMentatIntrigue.name, "Expected Captured Mentat reveal Intrigue card");

  const base = {
    ...game,
    activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };

  return {
    contractPublic: {
      ...base,
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug contract",
      },
    },
    contractFallback: {
      ...base,
      contractOffer: [],
      contractDeck: [],
      players: base.players.map((player) =>
        player.id === ownerId ? { ...player, reservedContracts: [] } : player,
      ),
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug empty contract",
      },
    },
    acquire: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug acquire",
        maxCost: 99,
        destination: "discard",
      },
    },
    acquireReserve: {
      ...base,
      imperiumRow: [],
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug reserve acquire",
        minCost: prepareTheWay.cost,
        maxCost: prepareTheWay.cost,
        destination: "discard",
      },
    },
    capturedMentat: {
      ...base,
      capturedMentatDiscardId: capturedMentatDiscard.id,
      capturedMentatDiscardName: capturedMentatDiscard.name,
      capturedMentatDrawId: capturedMentatDraw.id,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              deck: [capturedMentatDraw],
              discard: [],
              hand: [capturedMentatDiscard],
              influence: { ...player.influence, bene: 0 },
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "captured-mentat",
        ownerId,
        source: "Captured Mentat",
      },
    },
    capturedMentatReveal: {
      ...base,
      capturedMentatIntrigueId: capturedMentatIntrigue.id,
      intrigueDeck: [capturedMentatIntrigue],
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, bene: 1 },
              intrigues: [],
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "captured-mentat-reveal",
        ownerId,
        source: "Captured Mentat",
      },
    },
    acquireEmpty: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug empty acquire",
        minCost: 99,
        maxCost: 99,
        destination: "discard",
        optional: true,
      },
    },
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
