import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const outDir = new URL("../artifacts/qa/modal-layering/", import.meta.url);
let server;
let browser;

function parseZIndex(value) {
  const parsed = Number.parseInt(value, 10);
  assert.ok(Number.isFinite(parsed), `Expected numeric z-index, received ${value}`);
  return parsed;
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
  await page.getByRole("button", { name: "Local", exact: true }).click();
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 5000 });
  const hidePendingButton = page.getByRole("button", { name: "Hide pending resolution" });
  if (await hidePendingButton.count()) {
    await hidePendingButton.click();
    await page.locator(".pending-resolution-overlay").waitFor({ state: "hidden", timeout: 5000 });
  }

  await page.getByRole("button", { name: "Leaders", exact: true }).click();
  await page.locator("#leader-drawer.is-open").waitFor({ state: "visible", timeout: 5000 });

  const leaderButton = page.getByRole("button", { name: /^View .* leader card$/ }).first();
  await leaderButton.click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForFunction(() => document.querySelector(".modal-backdrop"));
  await page.screenshot({ path: new URL("leader-drawer-modal.png", outDir).pathname, fullPage: false });

  const zIndexes = await page.evaluate(() => {
    const backdrop = document.querySelector(".modal-backdrop");
    const drawer = document.querySelector("#leader-drawer");
    const controls = document.querySelector(".table-drawer-controls-right");
    const pendingReveal = document.querySelector(".pending-resolution-reveal");
    if (!backdrop || !drawer || !controls) throw new Error("Layering fixture elements are unavailable");
    const style = (element) => window.getComputedStyle(element);
    return {
      backdrop: style(backdrop).zIndex,
      drawer: style(drawer).zIndex,
      controls: style(controls).zIndex,
      pendingReveal: pendingReveal ? style(pendingReveal).zIndex : undefined,
    };
  });
  const backdropZ = parseZIndex(zIndexes.backdrop);
  const drawerZ = parseZIndex(zIndexes.drawer);
  const controlsZ = parseZIndex(zIndexes.controls);
  const pendingRevealZ = zIndexes.pendingReveal === undefined ? undefined : parseZIndex(zIndexes.pendingReveal);

  assert.ok(
    backdropZ > drawerZ,
    `Leader modal backdrop z-index ${backdropZ} should be above open leader drawer z-index ${drawerZ}`,
  );
  assert.ok(
    backdropZ > controlsZ,
    `Leader modal backdrop z-index ${backdropZ} should be above drawer controls z-index ${controlsZ}`,
  );
  if (pendingRevealZ !== undefined) {
    assert.ok(
      backdropZ > pendingRevealZ,
      `Leader modal backdrop z-index ${backdropZ} should be above pending reveal control z-index ${pendingRevealZ}`,
    );

    await page.evaluate(() => {
      const revealButton = document.querySelector(".pending-resolution-reveal");
      if (!(revealButton instanceof HTMLButtonElement)) throw new Error("Pending reveal control is unavailable");
      revealButton.click();
    });
    await page.locator(".pending-resolution-overlay").waitFor({ state: "visible", timeout: 5000 });
    const pendingOverlayZ = parseZIndex(await page.evaluate(() => {
      const overlay = document.querySelector(".pending-resolution-overlay");
      if (!overlay) throw new Error("Pending resolution overlay is unavailable");
      return window.getComputedStyle(overlay).zIndex;
    }));
    assert.ok(
      pendingOverlayZ > backdropZ,
      `Pending resolution overlay z-index ${pendingOverlayZ} should remain above modal backdrop z-index ${backdropZ}`,
    );
  }

  assert.deepEqual(consoleErrors, [], "Modal layering browser verification should not log console errors");
  console.log("modal layering verification passed");
} finally {
  await browser?.close();
  await server?.close();
}
