#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createBrowserDebugArtifactStore } from "./browser-debug-artifact-store.mjs";
import { artifactStem, generatedArtifactNames, scenarios } from "./browser-debug-artifacts.mjs";
import { runConflictVpSmoke } from "./browser-debug-conflict-vp.mjs";
import { createBrowserDebugPageTools } from "./browser-debug-page-tools.mjs";
import { runPendingChoicesSmoke } from "./browser-debug-pending-choices.mjs";
import { runSignetChoicesSmoke } from "./browser-debug-signet-choices.mjs";
import { runSpaceChoicesSmoke } from "./browser-debug-space-choices.mjs";

let optionError;

function recordOptionError(message) {
  optionError ??= new Error(message);
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function optionValue(name, fallback) {
  const prefix = `${name}=`;
  let value = fallback;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) {
      const nextValue = arg.slice(prefix.length);
      if (!nextValue || nextValue.startsWith("--")) {
        recordOptionError(`${name} requires a value`);
      } else {
        value = nextValue;
      }
      continue;
    }
    if (arg === name) {
      const nextValue = process.argv[index + 1];
      if (!nextValue || nextValue.startsWith("--")) {
        recordOptionError(`${name} requires a value`);
      } else {
        value = nextValue;
        index += 1;
      }
    }
  }
  return value;
}

function optionNumber(name, fallback) {
  const rawValue = optionValue(name, String(fallback));
  const value = Number(rawValue);
  if (Number.isFinite(value)) return value;
  recordOptionError(`${name} requires a numeric value, got "${rawValue}"`);
  return fallback;
}

function optionIsMissingValue(argv, index, arg) {
  if (arg.includes("=")) {
    const nextValue = arg.slice(arg.indexOf("=") + 1);
    return !nextValue || nextValue.startsWith("--");
  }
  const nextValue = argv[index + 1];
  return !nextValue || nextValue.startsWith("--");
}

const booleanOptions = new Set([
  "--allow-console-errors",
  "--allow-request-failures",
  "--headed",
  "--keep-open",
  "--no-trace",
  "--preserve-out",
]);
const valueOptions = new Set(["--out", "--port", "--scenario", "--slow-mo"]);

function validateKnownOptions(argv) {
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) {
      recordOptionError(`Unexpected browser debug argument "${arg}"`);
      continue;
    }
    const optionName = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (booleanOptions.has(optionName)) {
      if (arg.includes("=")) recordOptionError(`${optionName} does not take a value`);
      continue;
    }
    if (valueOptions.has(optionName)) {
      if (optionIsMissingValue(argv, index, arg)) {
        recordOptionError(`${optionName} requires a value`);
        continue;
      }
      if (!arg.includes("=")) index += 1;
      continue;
    }
    recordOptionError(`Unknown browser debug option "${optionName}"`);
  }
}

validateKnownOptions(process.argv);

const headed = hasFlag("--headed");
const keepOpen = hasFlag("--keep-open");
const traceEnabled = !hasFlag("--no-trace");
const failOnConsoleErrors = !hasFlag("--allow-console-errors");
const failOnRequestFailures = !hasFlag("--allow-request-failures");
const scenario = optionValue("--scenario", "all");
const outDir = optionValue("--out", "artifacts/qa/browser-debug");
const port = optionNumber("--port", 5178);
const slowMo = optionNumber("--slow-mo", 0);

function cloneConflict(conflict) {
  return { ...conflict, rewards: [...conflict.rewards] };
}

function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return cloneConflict(conflict);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeededRandom(seed, action) {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    return action();
  } finally {
    Math.random = originalRandom;
  }
}

function resolveSetupPendingActions(state, game) {
  let current = game;
  let resolved = 0;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Throne Row setup should have an eligible Imperium Row card");
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
    resolved += 1;
    assert.ok(resolved < 6, "Unexpected setup pending-action loop");
  }
  assert.equal(current.pendingAction, undefined, `Unhandled setup pending action: ${current.pendingAction?.kind}`);
  assert.deepEqual(current.pendingQueue, [], "Browser debug base game should not leave setup actions queued");
  return current;
}

function initialPlayableGame(state) {
  return withSeededRandom(0xD06E3A3, () => resolveSetupPendingActions(state, state.initialGame()));
}

function canUseDebugAgentMove(state, game, player, card, space) {
  return Boolean(
    !game.spaces[space.id] &&
      state.iconCanReach(card, space, player, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts) &&
      state.canPay(player, state.effectiveCost(space, game.players)),
  );
}

async function createInitialDebugState(server) {
  const state = await server.ssrLoadModule("/src/game/state.ts");
  return initialPlayableGame(state);
}

async function createControlDefenseState(server) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
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

async function createAgentPlacementPlan(server) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const player = game.players[game.activeSeat];
  const preferredMoves = [
    { cardName: "Dune, The Desert Planet", spaceId: "imperial-basin" },
    { cardName: "Reconnaissance", spaceId: "arrakeen" },
  ];

  for (const move of preferredMoves) {
    const card = player.hand.find((candidate) => candidate.name === move.cardName);
    const space = data.boardSpaces.find((candidate) => candidate.id === move.spaceId);
    if (card && space && canUseDebugAgentMove(state, game, player, card, space)) {
      return {
        game,
        playerId: player.id,
        playerName: player.leader,
        cardId: card.id,
        cardName: card.name,
        spaceId: space.id,
        spaceName: space.name,
        spiceBefore: player.resources.spice,
      };
    }
  }

  for (const card of player.hand) {
    for (const space of data.boardSpaces) {
      if (canUseDebugAgentMove(state, game, player, card, space)) {
        return {
          game,
          playerId: player.id,
          playerName: player.leader,
          cardId: card.id,
          cardName: card.name,
          spaceId: space.id,
          spaceName: space.name,
          spiceBefore: player.resources.spice,
        };
      }
    }
  }

  assert.fail(`Expected at least one legal Agent placement for ${player.leader}`);
}

async function runHomeSmoke(page, url, server, captures) {
  await openApp(page, url, 1440, 1100);
  await setDebugGameAndWait(page, await createInitialDebugState(server));
  await screenshot(page, captures, "home-desktop.png");

  await page.setViewportSize({ width: 390, height: 900 });
  await screenshot(page, captures, "home-mobile.png");
}

async function runAgentPlacementSmoke(page, url, server, captures) {
  await openApp(page, url, 1440, 1100);
  const plan = await createAgentPlacementPlan(server);
  await writeJson("agent-placement-plan.json", {
    player: plan.playerName,
    card: plan.cardName,
    space: plan.spaceName,
  });
  await setDebugGameAndWait(page, plan.game);
  await page.waitForFunction(
    ({ cardId, spaceId }) => {
      const game = window.__DUNE_DEBUG__?.getGame();
      const player = game?.players[game.activeSeat];
      return Boolean(
        game &&
          !game.pendingAction &&
          game.pendingQueue.length === 0 &&
          !game.spaces[spaceId] &&
          player?.hand.some((card) => card.id === cardId),
      );
    },
    { cardId: plan.cardId, spaceId: plan.spaceId },
  );

  await screenshot(page, captures, "agent-placement-ready.png");

  const cardButton = page.getByTestId(`hand-card-${plan.cardId}`);
  assert.equal(await cardButton.count(), 1, `Expected one hand card button for ${plan.cardName}`);
  await cardButton.click();

  const spaceButton = page.getByTestId(`space-${plan.spaceId}`);
  assert.equal(await spaceButton.count(), 1, `Expected one board space button for ${plan.spaceName}`);
  await spaceButton.click();
  await screenshot(page, captures, "agent-placement-selected.png");

  const placeAgent = page.getByTestId("place-agent");
  assert.equal(await placeAgent.count(), 1, "Expected one Place Agent button");
  assert.equal(await placeAgent.isEnabled(), true, "Place Agent should be enabled after selecting a legal card and space");
  await placeAgent.click();

  await page.waitForFunction(
    ({ playerId, cardId, spaceId }) => {
      const game = window.__DUNE_DEBUG__?.getGame();
      const player = game?.players.find((candidate) => candidate.id === playerId);
      return Boolean(
        game &&
          player &&
          game.spaces[spaceId] === playerId &&
          !player.hand.some((card) => card.id === cardId) &&
          player.playArea.some((card) => card.id === cardId) &&
          game.agentTurnComplete,
      );
    },
    { playerId: plan.playerId, cardId: plan.cardId, spaceId: plan.spaceId },
  );

  const after = await currentGame(page);
  const afterPlayer = after.players.find((player) => player.id === plan.playerId);
  assert.equal(after.spaces[plan.spaceId], plan.playerId, `${plan.spaceName} should be occupied by ${plan.playerName}`);
  assert.ok(afterPlayer.resources.spice >= plan.spiceBefore, "Agent placement should not reduce spice on this debug move");
  await screenshot(page, captures, "agent-placement-after.png");
}

async function runControlDefenseSmoke(page, url, server, captures) {
  await openApp(page, url, 1440, 1100);

  const controlDefenseState = await createControlDefenseState(server);
  await writeJson("control-defense-state.json", controlDefenseState);
  await setControlDefenseGame(page, controlDefenseState);
  const pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /control deployment/i);
  assert.match(pendingText, /Imperial Basin control/i);
  await screenshot(page, captures, "control-defense-pending-desktop.png");

  const before = await currentGame(page);
  const beforeOwner = before.players.find((player) => player.id === "p2");
  assert.ok(beforeOwner, "Expected p2 before deployment");

  await page.locator(".pending-panel").getByRole("button", { name: "Deploy 1" }).click();
  await waitForNoPending(page);
  const deployed = await currentGame(page);
  const deployedOwner = deployed.players.find((player) => player.id === "p2");
  assert.equal(deployedOwner.garrison, beforeOwner.garrison, "Control defense must not spend garrison troops");
  assert.equal(deployedOwner.deployedTroops, 1, "Control defense should deploy one troop");
  assert.equal(deployedOwner.conflict, 2, "Control defense should add one troop worth of strength");
  await screenshot(page, captures, "control-defense-after-deploy.png");

  await setControlDefenseGame(page, controlDefenseState);
  await page.setViewportSize({ width: 390, height: 900 });
  await screenshot(page, captures, "control-defense-pending-mobile.png");
  await page.locator(".pending-panel").getByRole("button", { name: "Skip" }).click();
  await waitForNoPending(page);
  const skipped = await currentGame(page);
  const skippedOwner = skipped.players.find((player) => player.id === "p2");
  assert.equal(skippedOwner.deployedTroops, 0, "Skipping should leave deployed troops unchanged");
  assert.equal(skippedOwner.conflict, 0, "Skipping should leave conflict strength unchanged");
}

async function runLeaderModalSmoke(page, url, server, captures) {
  await openApp(page, url, 1440, 1100);
  const game = await createInitialDebugState(server);
  await setDebugGameAndWait(page, game);
  const player = game.players[0];

  const leaderButton = page.getByRole("button", { name: `View ${player.leader} leader card` });
  assert.equal(await leaderButton.count(), 1, `Expected one leader art button for ${player.leader}`);
  await leaderButton.click();

  const dialog = page.getByRole("dialog", { name: `${player.leader} leader card` });
  await dialog.waitFor({ state: "visible" });
  assert.match(await dialog.innerText(), new RegExp(player.leader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await page.waitForFunction(
    () => document.activeElement?.closest(".leader-modal")?.classList.contains("leader-modal"),
  );
  await screenshot(page, captures, "leader-modal-open.png");

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(
    (leaderLabel) => document.activeElement?.getAttribute("aria-label") === leaderLabel,
    `View ${player.leader} leader card`,
  );
  await screenshot(page, captures, "leader-modal-closed.png");
}

async function runManual(page, url, server, captures) {
  await openApp(page, url, 1440, 1100);
  await setDebugGameAndWait(page, await createInitialDebugState(server));
  await screenshot(page, captures, "manual-ready.png");
}

function consoleFailures(messages) {
  return messages.filter((message) => message.type === "error" || message.type === "pageerror");
}

function assertNoConsoleFailures(messages) {
  const failures = consoleFailures(messages);
  assert.deepEqual(failures, [], `Browser console failures:\n${JSON.stringify(failures, null, 2)}`);
}

function assertNoRequestFailures(failures) {
  assert.deepEqual(failures, [], `Browser request failures:\n${JSON.stringify(failures, null, 2)}`);
}

function isSameOriginResponse(responseUrl, appUrl) {
  try {
    return new URL(responseUrl).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

let shutdownSignal;
let resolveShutdown;
const shutdownPromise = new Promise((resolve) => {
  resolveShutdown = resolve;
});

function shutdownError() {
  const error = new Error(`Browser debug interrupted by ${shutdownSignal ?? "signal"}`);
  error.name = "BrowserDebugShutdown";
  return error;
}

function shutdownExitCode() {
  if (shutdownSignal === "SIGINT") return 130;
  if (shutdownSignal === "SIGTERM") return 143;
  return 1;
}

function shutdownSuccessExitCode() {
  if (shutdownSignal === "SIGINT" && keepOpen) return 0;
  return shutdownExitCode();
}

function handleShutdown(signal) {
  shutdownSignal ??= signal;
  resolveShutdown();
}

function installShutdownHandlers() {
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

installShutdownHandlers();

function waitForShutdownSignal() {
  return shutdownPromise;
}

async function interruptible(promise) {
  const task = Promise.resolve(promise);
  task.catch(() => {});
  return Promise.race([
    task,
    shutdownPromise.then(() => {
      throw shutdownError();
    }),
  ]);
}

async function writeRunSummary({ captures, consoleMessages, requestFailures, error, startedAt, tracePath, url }) {
  await writeJson("console.json", consoleMessages);
  await writeJson("request-failures.json", requestFailures);
  await writeJson("summary.json", {
    scenario,
    headed,
    keepOpen,
    traceEnabled,
    failOnConsoleErrors,
    failOnRequestFailures,
    url,
    outDir,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    screenshots: captures.map((capture) => capture.screenshot),
    stateSnapshots: captures.map((capture) => capture.state).filter(Boolean),
    trace: tracePath,
    consoleErrorCount: consoleFailures(consoleMessages).length,
    requestFailureCount: requestFailures.length,
    error: error ? { message: error.message, stack: error.stack } : undefined,
  });
}

let server;
let browser;
let context;
let page;
let url;
let tracePath;
let traceStarted = false;
let runError;
let outDirReady = false;
let outDirWritable = false;
let cliValidated = false;
const startedAt = Date.now();
const captures = [];
const consoleMessages = [];
const requestFailures = [];
const artifactStore = createBrowserDebugArtifactStore({
  cwd: process.cwd(),
  generatedArtifactNames,
  outDir,
  preserveOut: hasFlag("--preserve-out"),
});
const {
  artifactPath,
  assertNoGeneratedArtifactSymlinks,
  assertWritableOutDir,
  canCreateOwnedSummaryDir,
  cleanOutDir,
  ensureOutDir,
  writeJson,
  writeTrace,
} = artifactStore;
const {
  currentGame,
  openApp,
  screenshot,
  setControlDefenseGame,
  setDebugGameAndWait,
  waitForNoPending,
} = createBrowserDebugPageTools({
  artifactStem,
  consoleMessages,
  writeArtifact: artifactStore.writeArtifact,
  writeJson,
});

try {
  if (optionError) throw optionError;
  assert.ok(
    scenarios.has(scenario),
    `Unknown browser debug scenario "${scenario}". Expected one of: ${[...scenarios].join(", ")}`,
  );
  assert.ok(
    Number.isInteger(port) && port >= 0 && port <= 65535,
    `Invalid browser debug port "${port}". Expected an integer from 0 to 65535.`,
  );
  assert.ok(slowMo >= 0, `Invalid browser debug slow-mo "${slowMo}". Expected a non-negative number.`);
  cliValidated = true;
  await interruptible(assertWritableOutDir());
  await interruptible(ensureOutDir());
  outDirReady = true;
  await interruptible(cleanOutDir());
  await interruptible(assertNoGeneratedArtifactSymlinks());
  outDirWritable = true;
  server = await interruptible(createServer({
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: false },
  }));
  installShutdownHandlers();
  await interruptible(server.listen());
  installShutdownHandlers();
  url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  browser = await interruptible(chromium.launch({
    headless: !headed,
    handleSIGHUP: false,
    handleSIGINT: false,
    handleSIGTERM: false,
    slowMo,
  }));
  installShutdownHandlers();
  context = await interruptible(browser.newContext({ viewport: { width: 1440, height: 1100 } }));
  if (traceEnabled) {
    tracePath = await artifactPath(`${scenario}-trace.zip`);
    await interruptible(context.tracing.start({ screenshots: true, snapshots: true, sources: true }));
    traceStarted = true;
  }
  page = await interruptible(context.newPage());
  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });
  page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400 || !isSameOriginResponse(response.url(), url)) return;
    const request = response.request();
    requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: response.url(),
      status,
      statusText: response.statusText(),
    });
  });

  try {
    if (scenario === "home" || scenario === "all") await interruptible(runHomeSmoke(page, url, server, captures));
    if (scenario === "agent-placement" || scenario === "all") {
      await interruptible(runAgentPlacementSmoke(page, url, server, captures));
    }
    if (scenario === "control-defense" || scenario === "all") {
      await interruptible(runControlDefenseSmoke(page, url, server, captures));
    }
    if (scenario === "conflict-vp" || scenario === "all") {
      await interruptible(runConflictVpSmoke({
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
      }));
    }
    if (scenario === "pending-choices" || scenario === "all") {
      await interruptible(runPendingChoicesSmoke({
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
      }));
    }
    if (scenario === "space-choices" || scenario === "all") {
      await interruptible(runSpaceChoicesSmoke({
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
      }));
    }
    if (scenario === "signet-choices" || scenario === "all") {
      await interruptible(runSignetChoicesSmoke({
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
      }));
    }
    if (scenario === "leader-modal" || scenario === "all") {
      await interruptible(runLeaderModalSmoke(page, url, server, captures));
    }
    if (scenario === "manual") await interruptible(runManual(page, url, server, captures));

    if (keepOpen) {
      console.log(`browser debug ready (${scenario})`);
      console.log(`url: ${url}`);
      console.log("press Ctrl+C to close and write final artifacts");
      await waitForShutdownSignal();
      if (shutdownSignal !== "SIGINT") throw shutdownError();
      await screenshot(page, captures, `${scenario}-final.png`);
    }

    if (failOnConsoleErrors) {
      assertNoConsoleFailures(consoleMessages);
    }
    if (failOnRequestFailures) {
      assertNoRequestFailures(requestFailures);
    }
  } catch (error) {
    runError = error;
    if (page) {
      try {
        await screenshot(page, captures, "failure.png");
      } catch {
        // Keep the original failure.
      }
    }
  }

  if (runError) throw runError;
} catch (error) {
  runError = error;
} finally {
  if (traceEnabled && context && traceStarted) {
    try {
      tracePath = await writeTrace(context, `${scenario}-trace.zip`);
      traceStarted = false;
    } catch (error) {
      tracePath = undefined;
      consoleMessages.push({ type: "traceerror", text: error.message });
      if (!runError) runError = error;
    }
  }
  try {
    if (cliValidated && !outDirReady && (await canCreateOwnedSummaryDir())) {
      await ensureOutDir();
      outDirReady = true;
    }
    if (cliValidated && outDirReady && outDirWritable) {
      await writeRunSummary({ captures, consoleMessages, requestFailures, error: runError, startedAt, tracePath, url });
    }
  } catch (error) {
    if (!runError) runError = error;
  }
  await context?.close();
  await browser?.close();
  await server?.close();
}

if (runError) {
  if (shutdownSignal && runError.name === "BrowserDebugShutdown") process.exit(shutdownExitCode());
  throw runError;
}
console.log(`browser debug passed (${scenario})`);
captures.forEach((capture) => console.log(`screenshot: ${capture.screenshot}`));
if (tracePath) console.log(`trace: ${tracePath}`);
console.log(`summary: ${path.join(outDir, "summary.json")}`);
console.log(`url: ${url}`);
process.exitCode = 0;
if (shutdownSignal) process.exit(shutdownSuccessExitCode());
