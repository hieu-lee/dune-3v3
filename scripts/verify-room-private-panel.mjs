import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const outDir = new URL("../artifacts/qa/room-private-panel/", import.meta.url);
let server;
let browser;

async function waitForImages(page) {
  await page.evaluate(async (timeoutMs) => {
    Array.from(document.images).forEach((image) => {
      image.loading = "eager";
    });
    const ready = Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return image.decode?.().catch(() => undefined);
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }),
    );
    await Promise.race([
      ready,
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
    ]);
  }, 5000);
}

try {
  await mkdir(outDir, { recursive: true });
  server = await createServer({
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:5173/";
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const baseGame = state.initialGame();
  const cleanupPlayer = baseGame.players[0];
  const cleanupHandCard = { ...cleanupPlayer.hand[0], id: "graveyard-cleanup-hand-card" };
  const cleanupPlayCard = { ...cleanupPlayer.hand[1], id: "graveyard-cleanup-play-card" };
  const cleanedRound = state.startNextRound({
    ...baseGame,
    pendingAction: undefined,
    pendingQueue: [],
    players: baseGame.players.map((player, index) =>
      index === 0
        ? { ...player, hand: [cleanupHandCard], playArea: [cleanupPlayCard], discard: [], deck: player.deck }
        : player
    ),
  });
  const cleanedPlayer = cleanedRound.players.find((player) => player.id === cleanupPlayer.id);
  assert.ok(cleanedPlayer?.discard.some((card) => card.id === cleanupHandCard.id), "Round cleanup should move hand cards to the Graveyard-backed discard pile");
  assert.ok(cleanedPlayer?.discard.some((card) => card.id === cleanupPlayCard.id), "Round cleanup should move played cards to the Graveyard-backed discard pile");

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Local", exact: true }).click();
  await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__?.getGame && window.__DUNE_DEBUG__?.setGame));
  const fixture = await page.evaluate(() => {
    const debug = window.__DUNE_DEBUG__;
    const game = debug.getGame();
    const activePlayer = game.players[game.activeSeat];
    const graveyardCard = activePlayer.hand.find((card) => card.imagePath) ?? activePlayer.hand[0];
    const trashCard = activePlayer.hand.find((card) => card.id !== graveyardCard.id && card.imagePath) ?? activePlayer.hand[1];
    const intrigue = game.intrigueDeck.find((card) => card.name === "Spring the Trap") ?? game.intrigueDeck.find((card) => card.imagePath) ?? game.intrigueDeck[0];
    const contract = game.contractOffer.find((card) => card.imagePath) ?? game.contractDeck.find((card) => card.imagePath) ?? game.contractOffer[0];
    if (!graveyardCard || !trashCard || !intrigue || !contract) throw new Error("Private-zone fixture cards unavailable");
    const nextPlayer = {
      ...activePlayer,
      hand: activePlayer.hand.filter((card) => card.id !== graveyardCard.id && card.id !== trashCard.id),
      discard: [graveyardCard],
      trash: [trashCard],
      intrigues: [intrigue],
      contracts: [{ card: contract, completed: false, takenRound: game.round }],
    };
    debug.setGame({
      ...game,
      pendingAction: undefined,
      pendingQueue: [],
      players: game.players.map((player) => player.id === activePlayer.id ? nextPlayer : player),
    });
    return {
      contractName: contract.name,
      contractEffect: "Complete this contract for its printed reward.",
      graveyardEffect: [
        graveyardCard.play ? `Agent: ${graveyardCard.play}` : undefined,
        graveyardCard.reveal ? `Reveal: ${graveyardCard.reveal}` : undefined,
      ].filter(Boolean).join(" "),
      graveyardName: graveyardCard.name,
      intrigueName: intrigue.name,
      intrigueSummary: intrigue.summary,
      trashEffect: [
        trashCard.play ? `Agent: ${trashCard.play}` : undefined,
        trashCard.reveal ? `Reveal: ${trashCard.reveal}` : undefined,
      ].filter(Boolean).join(" "),
      trashName: trashCard.name,
    };
  });
  await page.waitForFunction(() => document.querySelectorAll(".private-zone-card").length >= 4);
  await waitForImages(page);

  assert.equal(await page.getByText("Graveyard (1)", { exact: true }).count(), 1, "Private zone should rename Discard to Graveyard");
  assert.equal(await page.getByText("Discard (1)", { exact: true }).count(), 0, "Private zone should not show Discard label");
  assert.equal(await page.locator(".private-zone-card").count(), 4, "Private zone should render asset-backed cards");
  assert.equal(await page.locator(".private-zone-card img").count(), 4, "Private zone cards should use card assets");

  assert.equal(await page.locator(".private-zone-card strong").count(), 0, "Private zone tiles should not add visible card-name labels");
  const effectTexts = await page.locator(".private-zone-card-effect").allTextContents();
  assert.deepEqual(
    effectTexts.sort(),
    [fixture.contractEffect, fixture.graveyardEffect, fixture.intrigueSummary, fixture.trashEffect].sort(),
    "Private zone tiles should show effect text for each card",
  );
  await page.screenshot({ path: new URL("private-zone-cards.png", outDir).pathname, fullPage: false });

  const intrigueButton = page.getByRole("button", { name: new RegExp(`Intrigues: ${fixture.intrigueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
  assert.equal(await intrigueButton.count(), 1, "Intrigue tile should remain accessible by card name");
  await intrigueButton.click();
  const detailDialog = page.getByRole("dialog", { name: `${fixture.intrigueName} card detail` });
  await detailDialog.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(
    await page.evaluate(() => Number.parseInt(window.getComputedStyle(document.querySelector(".modal-backdrop")).zIndex, 10) > 30),
    "Private zone detail modal should layer above selected board regions",
  );
  assert.equal(await page.getByRole("heading", { name: fixture.intrigueName }).count(), 1, "Detail modal should show the card name");
  assert.equal(await detailDialog.getByText(fixture.intrigueSummary, { exact: true }).count(), 1, "Detail modal should show the Intrigue effect description");
  await waitForImages(page);
  await page.screenshot({ path: new URL("private-zone-detail.png", outDir).pathname, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const modalBox = await page.locator(".private-zone-card-modal").boundingBox();
  assert.ok(modalBox, "Private zone detail modal should be visible on mobile");
  assert.ok(modalBox.width <= 390 && modalBox.y >= 0, "Private zone detail modal should fit mobile viewport width");
  await page.screenshot({ path: new URL("private-zone-detail-mobile.png", outDir).pathname, fullPage: false });

  await page.evaluate(() => {
    const debug = window.__DUNE_DEBUG__;
    const game = debug.getGame();
    debug.setGame({ ...game, activeSeat: (game.activeSeat + 1) % game.players.length });
  });
  await detailDialog.waitFor({ state: "hidden", timeout: 5000 });

  assert.deepEqual(consoleErrors, [], "Private zone browser verification should not log console errors");
  console.log("room private panel verification passed");
} finally {
  await browser?.close();
  await server?.close();
}
