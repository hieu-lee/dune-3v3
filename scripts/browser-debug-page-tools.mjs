export function createBrowserDebugPageTools({ artifactStem, consoleMessages, writeArtifact, writeJson }) {
  async function currentGame(page) {
    return page.evaluate(() => window.__DUNE_DEBUG__?.getGame?.() ?? null).catch(() => null);
  }

  async function waitForCaptureReady(page) {
    const readiness = await page.evaluate(async (timeoutMs) => {
      const images = Array.from(document.images);
      images.forEach((image) => {
        image.loading = "eager";
      });

      const imageDescription = (image) =>
        [image.alt, image.currentSrc || image.src].filter(Boolean).join(" - ") || "(unnamed image)";

      const pendingSources = () =>
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(imageDescription)
          .slice(0, 12);

      const brokenSources = () =>
        Array.from(document.images)
          .filter((image) => (image.currentSrc || image.src) && image.complete && image.naturalWidth === 0)
          .map(imageDescription)
          .slice(0, 12);

      const ready = Promise.all([
        document.fonts?.ready.catch(() => undefined),
        Promise.all(
          images.map((image) => {
            if (image.complete) return undefined;
            return new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            });
          }),
        ),
        Promise.all(images.map((image) => image.decode?.().catch(() => undefined))),
      ]).then(() => ({ timedOut: false, pendingImages: [], brokenImages: brokenSources() }));

      const timeout = new Promise((resolve) => {
        window.setTimeout(() => resolve({
          timedOut: true,
          pendingImages: pendingSources(),
          brokenImages: brokenSources(),
        }), timeoutMs);
      });

      return Promise.race([ready, timeout]);
    }, 5000);
    if (readiness.timedOut) {
      consoleMessages.push({
        type: "warning",
        text: `Capture readiness timed out with pending images: ${readiness.pendingImages.join(", ") || "none"}`,
      });
    }
    if (readiness.brokenImages?.length > 0) {
      consoleMessages.push({
        type: "warning",
        text: `Capture readiness found broken images: ${readiness.brokenImages.join(", ")}`,
      });
    }
    await page.waitForTimeout(50);
  }

  async function screenshot(page, captures, name) {
    await waitForCaptureReady(page);
    const filePath = await writeArtifact(name, await page.screenshot({ fullPage: true }));

    const capture = { screenshot: filePath };
    const game = await currentGame(page);
    if (game) {
      capture.state = await writeJson(`${artifactStem(name)}.state.json`, game);
    }
    captures.push(capture);
    return capture;
  }

  async function setDebugGame(page, game) {
    await page.evaluate((nextGame) => window.__DUNE_DEBUG__?.setGame(nextGame), game);
  }

  async function setDebugGameAndWait(page, game) {
    await setDebugGame(page, game);
    const serializedGame = JSON.stringify(game);
    await page.waitForFunction(
      (expectedGame) => {
        const current = window.__DUNE_DEBUG__?.getGame();
        return Boolean(current && JSON.stringify(current) === expectedGame);
      },
      serializedGame,
    );
  }

  async function setControlDefenseGame(page, game) {
    await setDebugGame(page, game);
    await page.waitForFunction(
      () => {
        const pending = window.__DUNE_DEBUG__?.getGame().pendingAction;
        return pending?.kind === "control-defense" &&
          pending.ownerId === "p2" &&
          pending.location === "imperial-basin";
      },
    );
  }

  async function waitForNoPending(page) {
    await page.waitForFunction(() => {
      const game = window.__DUNE_DEBUG__?.getGame();
      return Boolean(game && !game.pendingAction);
    });
  }

  async function openApp(page, url, width = 1440, height = 1100) {
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__));
    const localButton = page.getByRole("button", { name: "Local", exact: true });
    if (await localButton.isVisible().catch(() => false)) {
      await localButton.click();
    }
    await page.locator(".app-shell").waitFor({ state: "visible" });
  }

  return {
    currentGame,
    openApp,
    screenshot,
    setControlDefenseGame,
    setDebugGame,
    setDebugGameAndWait,
    waitForCaptureReady,
    waitForNoPending,
  };
}
