import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const outDir = new URL("../artifacts/qa/intrigue-deck-panel/", import.meta.url);
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

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__?.getGame && window.__DUNE_DEBUG__?.setGame));
  const fixture = await page.evaluate(() => {
    const debug = window.__DUNE_DEBUG__;
    const game = debug.getGame();
    const deckTop = game.intrigueDeck.find((card) => card.name === "Spring the Trap") ?? game.intrigueDeck[0];
    const discardTop =
      game.intrigueDeck.find((card) => card.id !== deckTop.id && card.imagePath) ??
      game.intrigueDeck.find((card) => card.id !== deckTop.id) ??
      game.intrigueDeck[1];
    const olderDiscard =
      game.intrigueDeck.find((card) => card.id !== deckTop.id && card.id !== discardTop.id) ??
      game.intrigueDeck[2];
    if (!deckTop || !discardTop || !olderDiscard) throw new Error("Intrigue deck verifier cards unavailable");
    debug.setGame({
      ...game,
      pendingAction: undefined,
      pendingQueue: [],
      intrigueDeck: [deckTop, ...game.intrigueDeck.filter((card) => card.id !== deckTop.id && card.id !== discardTop.id && card.id !== olderDiscard.id)],
      intrigueDiscard: [olderDiscard, discardTop],
    });
    return {
      deckTopName: deckTop.name,
      deckTopSummary: deckTop.summary,
      olderDiscardName: olderDiscard.name,
      olderDiscardSummary: olderDiscard.summary,
      discardTopName: discardTop.name,
      discardTopSummary: discardTop.summary,
    };
  });

  await page.locator(".intrigue-deck-preview").waitFor({ state: "visible", timeout: 5000 });
  await waitForImages(page);
  assert.equal(await page.locator(".intrigue-deck-surface").count(), 2, "Intrigue panel should render deck and discard card surfaces");
  assert.equal(await page.locator(".intrigue-deck-back-art").count(), 1, "Intrigue deck should use a facedown card-back surface");
  assert.equal(await page.locator(".intrigue-discard-stack img.card-asset-image").count(), 1, "Intrigue discard should use the top discarded card asset");

  const deckText = await page.locator(".intrigue-deck-stack").textContent();
  assert.ok(!deckText.includes(fixture.deckTopName), "Face-down Intrigue deck should not reveal top card name");
  assert.ok(!deckText.includes(fixture.deckTopSummary), "Face-down Intrigue deck should not reveal top card effect");
  const deckAccessibleLabel = await page.locator(".intrigue-deck-stack").getAttribute("aria-label");
  assert.ok(
    !deckAccessibleLabel?.includes(fixture.deckTopName),
    "Face-down Intrigue deck accessible label should not reveal top card name",
  );
  assert.ok(
    !deckAccessibleLabel?.includes(fixture.deckTopSummary),
    "Face-down Intrigue deck accessible label should not reveal top card effect",
  );
  assert.equal(
    await page.getByRole("button", { name: fixture.deckTopName }).count(),
    0,
    "Face-down Intrigue deck should not expose top card name as an interactive label",
  );
  assert.equal(
    await page.locator(".intrigue-discard-stack").getByText(fixture.discardTopSummary, { exact: true }).count(),
    1,
    "Intrigue discard hover details should include the top discarded card text",
  );
  assert.equal(
    await page.locator(".intrigue-discard-stack").getByText(fixture.olderDiscardName, { exact: true }).count(),
    0,
    "Intrigue discard surface should show the newest discarded card rather than an older discard",
  );
  assert.equal(
    await page.locator(".intrigue-discard-stack").getByText(fixture.olderDiscardSummary, { exact: true }).count(),
    0,
    "Intrigue discard hover details should not use an older discarded card effect",
  );
  await page.locator(".intrigue-deck-card").scrollIntoViewIfNeeded();
  await page.screenshot({ path: new URL("intrigue-deck-cards.png", outDir).pathname, fullPage: false });

  await page.locator(".intrigue-deck-stack").hover();
  const transitionDelay = await page.locator(".intrigue-deck-stack .card-hold-details").evaluate((element) =>
    window.getComputedStyle(element).transitionDelay
  );
  assert.ok(transitionDelay.includes("0.5s"), `Intrigue deck hover details should keep a 500ms delay, got ${transitionDelay}`);
  await page.waitForTimeout(650);
  const hoverOpacity = await page.locator(".intrigue-deck-stack .card-hold-details").evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).opacity)
  );
  assert.ok(hoverOpacity > 0.9, "Intrigue deck hover details should become visible after the delay");
  await page.screenshot({ path: new URL("intrigue-deck-hover.png", outDir).pathname, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.locator(".intrigue-deck-card").scrollIntoViewIfNeeded();
  const panelBox = await page.locator(".intrigue-deck-card").boundingBox();
  assert.ok(panelBox, "Intrigue deck panel should be visible on mobile");
  assert.ok(panelBox.width <= 390, "Intrigue deck panel should fit mobile width");
  const surfaceBoxes = await page.locator(".intrigue-deck-surface").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }),
  );
  assert.equal(surfaceBoxes.length, 2, "Mobile Intrigue panel should still render both card surfaces");
  surfaceBoxes.forEach((box, index) => {
    assert.ok(box.left >= 0, `Mobile Intrigue card surface ${index + 1} should not overflow left`);
    assert.ok(box.right <= 390, `Mobile Intrigue card surface ${index + 1} should not overflow right`);
    assert.ok(box.top < 844 && box.bottom > 0, `Mobile Intrigue card surface ${index + 1} should be vertically visible`);
  });
  await page.locator(".intrigue-deck-card").screenshot({ path: new URL("intrigue-deck-mobile.png", outDir).pathname });

  assert.deepEqual(consoleErrors, [], "Intrigue deck panel verification should not log console errors");
  console.log("intrigue deck panel verification passed");
} finally {
  await browser?.close();
  await server?.close();
}
