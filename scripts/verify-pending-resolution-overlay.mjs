import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const outDir = new URL("../artifacts/qa/pending-resolution-overlay/", import.meta.url);
let server;
let browser;

async function setPendingDraw(page, { amount, source }) {
  await page.evaluate(({ amount, source }) => {
    const debug = window.__DUNE_DEBUG__;
    if (!debug) throw new Error("Debug bridge is unavailable");
    const game = debug.getGame();
    const owner = game.players[game.activeSeat];
    debug.setGame({
      ...game,
      pendingAction: { kind: "draw-cards", ownerId: owner.id, source, amount },
      pendingQueue: [],
    });
  }, { amount, source });
  await page.waitForFunction(
    ({ amount, source }) => {
      const pending = window.__DUNE_DEBUG__?.getGame().pendingAction;
      return pending?.kind === "draw-cards" && pending.amount === amount && pending.source === source;
    },
    { amount, source },
  );
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
  await page.getByRole("button", { name: "Local" }).click();
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 5000 });

  await setPendingDraw(page, { amount: 2, source: "Overlay verifier" });
  await page.locator(".pending-resolution-overlay").waitFor({ state: "visible", timeout: 5000 });
  await page.locator(".pending-panel").waitFor({ state: "visible", timeout: 5000 });

  const overlayBox = await page.locator(".pending-resolution-overlay").boundingBox();
  const bodyBox = await page.locator(".pending-resolution-body").boundingBox();
  assert.ok(overlayBox, "Pending overlay should be measurable");
  assert.ok(bodyBox, "Pending overlay body should be measurable");
  assert.ok(overlayBox.width >= 1430 && overlayBox.height >= 950, "Pending overlay should cover the viewport");
  assert.ok(bodyBox.y >= 0 && bodyBox.y + bodyBox.height <= 960, "Pending overlay body should fit in desktop viewport");
  assert.equal(await page.getByRole("button", { name: "Hide pending resolution" }).count(), 1, "Pending overlay should expose one hide button");
  assert.equal(await page.getByRole("button", { name: "Create room" }).count(), 1, "Verifier should find the background Create room button");
  await page.evaluate(() => {
    window.__pendingOverlayBackgroundClicks = 0;
    const buttons = Array.from(document.querySelectorAll("button"));
    const createRoomButton = buttons.find((button) => button.textContent?.includes("Create room"));
    if (!createRoomButton) throw new Error("Create room button not found");
    createRoomButton.addEventListener("click", () => {
      window.__pendingOverlayBackgroundClicks += 1;
    });
  });
  const createRoomBox = await page.getByRole("button", { name: "Create room" }).boundingBox();
  assert.ok(createRoomBox, "Create room button should be measurable behind the overlay");
  await page.mouse.click(createRoomBox.x + createRoomBox.width / 2, createRoomBox.y + createRoomBox.height / 2);
  assert.equal(
    await page.evaluate(() => window.__pendingOverlayBackgroundClicks),
    0,
    "Visible pending overlay should block background clicks",
  );
  await page.screenshot({ path: new URL("desktop-visible.png", outDir).pathname, fullPage: false });

  await page.getByRole("button", { name: "Hide pending resolution" }).click();
  await page.locator(".pending-resolution-overlay").waitFor({ state: "hidden", timeout: 5000 });
  assert.equal(await page.getByRole("button", { name: "Show pending resolution" }).count(), 1, "Hidden overlay should expose one reveal button");
  await page.screenshot({ path: new URL("desktop-hidden.png", outDir).pathname, fullPage: false });

  await setPendingDraw(page, { amount: 1, source: "Overlay verifier next" });
  await page.locator(".pending-resolution-overlay").waitFor({ state: "visible", timeout: 5000 });
  assert.equal(
    await page.getByRole("button", { name: "Show pending resolution" }).count(),
    0,
    "A new pending action should reveal the overlay after a previous pending was hidden",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const mobileBodyBox = await page.locator(".pending-resolution-body").boundingBox();
  assert.ok(mobileBodyBox, "Pending overlay body should be measurable on mobile");
  assert.ok(mobileBodyBox.width <= 390, "Pending overlay body should fit mobile width");
  assert.ok(mobileBodyBox.y >= 0 && mobileBodyBox.y + mobileBodyBox.height <= 844, "Pending overlay body should fit mobile height");
  await page.screenshot({ path: new URL("mobile-visible.png", outDir).pathname, fullPage: false });

  assert.deepEqual(consoleErrors, [], "Pending overlay browser verification should not log console errors");
  console.log("pending resolution overlay verification passed");
} finally {
  await browser?.close();
  await server?.close();
}
