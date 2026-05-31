#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

function optionValue(name, fallback) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const headed = process.argv.includes("--headed");
const keepOpen = process.argv.includes("--keep-open");
const scenario = optionValue("--scenario", "control-defense");
const outDir = optionValue("--out", "artifacts/qa/browser-debug");
const port = Number(optionValue("--port", "5178"));
const scenarios = new Set(["home", "control-defense", "all"]);

assert.ok(
  scenarios.has(scenario),
  `Unknown browser debug scenario "${scenario}". Expected one of: ${[...scenarios].join(", ")}`,
);

function cloneConflict(conflict) {
  return { ...conflict, rewards: [...conflict.rewards] };
}

function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return cloneConflict(conflict);
}

async function createControlDefenseState(server) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = state.initialGame();
  const fixture = {
    ...game,
    conflict: null,
    conflictDeck: [conflictBySourceId(data, 460)],
    conflictDiscard: [],
    firstSeat: 1,
    activeSeat: 1,
    locationControl: { "imperial-basin": "p2" },
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => ({
      ...player,
      conflict: 0,
      deployedTroops: 0,
      deployedSandworms: 0,
      revealed: true,
      agentsReady: 0,
    })),
  };
  return state.startNextRound(fixture);
}

async function screenshot(page, name) {
  const filePath = path.join(outDir, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function setDebugGame(page, game) {
  await page.evaluate((nextGame) => window.__DUNE_DEBUG__?.setGame(nextGame), game);
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

async function runHomeSmoke(page, url, captures) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__));
  await page.locator(".app-shell").waitFor({ state: "visible" });
  captures.push(await screenshot(page, "home-desktop.png"));

  await page.setViewportSize({ width: 390, height: 900 });
  captures.push(await screenshot(page, "home-mobile.png"));
}

async function runControlDefenseSmoke(page, url, server, captures) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__));

  const controlDefenseState = await createControlDefenseState(server);
  await writeFile(
    path.join(outDir, "control-defense-state.json"),
    JSON.stringify(controlDefenseState, null, 2),
  );
  await setDebugGame(page, controlDefenseState);
  const pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /control deployment/i);
  assert.match(pendingText, /Imperial Basin control/i);
  captures.push(await screenshot(page, "control-defense-pending-desktop.png"));

  const before = await page.evaluate(() => window.__DUNE_DEBUG__?.getGame());
  const beforeOwner = before.players.find((player) => player.id === "p2");
  assert.ok(beforeOwner, "Expected p2 before deployment");

  await page.locator(".pending-panel").getByRole("button", { name: "Deploy 1" }).click();
  await waitForNoPending(page);
  const deployed = await page.evaluate(() => window.__DUNE_DEBUG__?.getGame());
  const deployedOwner = deployed.players.find((player) => player.id === "p2");
  assert.equal(deployedOwner.garrison, beforeOwner.garrison, "Control defense must not spend garrison troops");
  assert.equal(deployedOwner.deployedTroops, 1, "Control defense should deploy one troop");
  assert.equal(deployedOwner.conflict, 2, "Control defense should add one troop worth of strength");
  captures.push(await screenshot(page, "control-defense-after-deploy.png"));

  await setDebugGame(page, controlDefenseState);
  await page.setViewportSize({ width: 390, height: 900 });
  captures.push(await screenshot(page, "control-defense-pending-mobile.png"));
  await page.locator(".pending-panel").getByRole("button", { name: "Skip" }).click();
  await waitForNoPending(page);
  const skipped = await page.evaluate(() => window.__DUNE_DEBUG__?.getGame());
  const skippedOwner = skipped.players.find((player) => player.id === "p2");
  assert.equal(skippedOwner.deployedTroops, 0, "Skipping should leave deployed troops unchanged");
  assert.equal(skippedOwner.conflict, 0, "Skipping should leave conflict strength unchanged");
}

function consoleFailures(messages) {
  return messages.filter((message) => message.type === "error" || message.type === "pageerror");
}

const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port, strictPort: false },
});

let browser;
try {
  await mkdir(outDir, { recursive: true });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  const consoleMessages = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

  const captures = [];
  if (scenario === "home" || scenario === "all") await runHomeSmoke(page, url, captures);
  if (scenario === "control-defense" || scenario === "all") {
    await runControlDefenseSmoke(page, url, server, captures);
  }

  const failures = consoleFailures(consoleMessages);
  assert.deepEqual(failures, [], `Browser console failures:\n${JSON.stringify(failures, null, 2)}`);
  console.log(`browser debug passed (${scenario})`);
  captures.forEach((capture) => console.log(`screenshot: ${capture}`));
  console.log(`url: ${url}`);
  if (keepOpen) await new Promise(() => {});
} finally {
  if (!keepOpen) await browser?.close();
  await server.close();
}
