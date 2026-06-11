#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { createRoomServer } from "./room-server.mjs";
import {
  assertCloudflaredAvailable,
  cloudflaredInstallHint,
  publicRoomUrl,
  startTryCloudflareTunnel,
  waitForPublicHttpReady,
} from "./online-tunnel-utils.mjs";

const outDir = "artifacts/qa/browser-room-online-tunnel";
await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

const cloudflaredBin = process.env.CLOUDFLARED_BIN ?? "cloudflared";
const cloudflaredLog = [];
const consoleMessages = [];
const pollAbortRequests = [];
const requestFailures = [];
const screenshots = [];
let server;
let tunnel;
let browser;

function observePage(page) {
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText;
    if (request.resourceType() === "image" && failure === "net::ERR_ABORTED") return;
    // Quick tunnels can abort in-flight poll refreshes during context churn; state assertions below verify sync health.
    if (roomPollRequestWasAborted(request, failure)) {
      pollAbortRequests.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
        failure,
      });
      return;
    }
    requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure,
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const resourceType = response.request().resourceType();
    if (resourceType === "image" && response.url().endsWith("/favicon.ico")) return;
    requestFailures.push({
      method: response.request().method(),
      resourceType,
      url: response.url(),
      status,
      statusText: response.statusText(),
    });
  });
}

function roomPollRequestWasAborted(request, failure) {
  return (
    request.resourceType() === "fetch" &&
    request.method() === "GET" &&
    failure === "net::ERR_ABORTED" &&
    /^\/api\/rooms\/[A-F0-9]{8}$/.test(new URL(request.url()).pathname)
  );
}

async function capture(page, name) {
  const screenshotPath = join(outDir, name);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const state = await page.evaluate(() => ({
    game: window.__DUNE_DEBUG__?.getGame?.() ?? null,
    room: window.__DUNE_DEBUG__?.getRoomSnapshot?.() ?? null,
    syncMode: window.__DUNE_DEBUG__?.getRoomSyncMode?.() ?? null,
  }));
  const statePath = screenshotPath.replace(/\.png$/, ".state.json");
  await writeFile(statePath, JSON.stringify(state, null, 2));
  screenshots.push(screenshotPath);
  return { screenshot: screenshotPath, state: statePath };
}

async function dismissTryCloudflareInterstitial(page) {
  const proceedLabels = /continue|visit site|proceed/i;
  const candidates = [
    page.getByRole("button", { name: proceedLabels }).first(),
    page.getByRole("link", { name: proceedLabels }).first(),
    page.getByText(proceedLabels).first(),
  ];
  for (const candidate of candidates) {
    try {
      await candidate.click({ timeout: 1500 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
      return;
    } catch {
      // Quick tunnels normally load the app directly; tolerate copy and markup changes.
    }
  }
}

async function openPublicApp(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissTryCloudflareInterstitial(page);
  await page.waitForFunction(() => Boolean(window.__DUNE_DEBUG__?.getGame), undefined, { timeout: 60_000 });
}

async function claimSeat(page, playerId, name) {
  await page.getByLabel("Player name").fill(name);
  await page.getByTestId(`room-seat-${playerId}`).click();
  await page.waitForFunction(
    (seatId) => document.querySelector(`[data-testid="room-seat-${seatId}"]`)?.classList.contains("selected"),
    playerId,
  );
}

async function waitForVisiblePrivateHand(page, playerId) {
  await page.waitForFunction((ownerId) => {
    const game = window.__DUNE_DEBUG__?.getGame?.();
    const owner = game?.players.find((player) => player.id === ownerId);
    return Boolean(owner?.hand.length && owner.hand.some((card) => card.name !== "Hidden card"));
  }, playerId);
}

async function stopRoomPolling(page) {
  await page.evaluate(() => window.__DUNE_DEBUG__?.leaveRoom?.());
  await page.waitForFunction(() => !new URL(window.location.href).searchParams.has("room"));
  await page.waitForTimeout(250);
}

try {
  const cloudflaredVersion = await assertCloudflaredAvailable(cloudflaredBin).catch((error) => {
    throw new Error(`${error.message}\n${cloudflaredInstallHint()}`);
  });
  server = await createRoomServer({
    host: "127.0.0.1",
    log: false,
    pollDisconnectMs: 8_000,
    port: 0,
    storageFile: join(outDir, "rooms.json"),
  });
  tunnel = startTryCloudflareTunnel({
    cloudflaredBin,
    log: (line) => cloudflaredLog.push(line),
    originUrl: server.resolvedUrls.local[0],
    timeoutMs: 90_000,
  });
  const publicBaseUrl = await tunnel.ready;
  const publicLobbyUrl = publicRoomUrl(publicBaseUrl);
  const publicReady = await waitForPublicHttpReady(publicLobbyUrl, { requireIpv4: true, timeoutMs: 90_000 });

  browser = await chromium.launch({
    headless: true,
    args: [`--host-resolver-rules=MAP ${publicReady.hostname} ${publicReady.ipv4[0]}`],
  });
  const aliceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const alicePage = await aliceContext.newPage();
  observePage(alicePage);
  await openPublicApp(alicePage, publicLobbyUrl);
  await capture(alicePage, "online-tunnel-lobby-loaded.png");
  await alicePage.getByRole("button", { name: "Create" }).click();
  await alicePage.waitForFunction(() => new URL(window.location.href).searchParams.has("room"));
  const roomId = await alicePage.evaluate(() => new URL(window.location.href).searchParams.get("room"));
  const inviteUrl = alicePage.url();
  assert.match(roomId, /^[A-F0-9]{8}$/);
  assert.equal(new URL(inviteUrl).searchParams.get("sync"), "poll", "Public invite URL should force polling sync");
  await alicePage.waitForFunction(() => window.__DUNE_DEBUG__?.getRoomSyncMode?.() === "poll");
  await claimSeat(alicePage, "p1", "Alice Tunnel");
  await waitForVisiblePrivateHand(alicePage, "p1");
  await capture(alicePage, "online-tunnel-alice-claimed.png");

  const bobContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const bobPage = await bobContext.newPage();
  observePage(bobPage);
  await openPublicApp(bobPage, inviteUrl);
  await bobPage.waitForFunction(() => window.__DUNE_DEBUG__?.getRoomSyncMode?.() === "poll");
  await claimSeat(bobPage, "p2", "Bob Tunnel");
  await waitForVisiblePrivateHand(bobPage, "p2");
  await alicePage.waitForFunction(() =>
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p2")?.claimedBy === "Bob Tunnel"
  );
  const bobGame = await bobPage.evaluate(() => window.__DUNE_DEBUG__?.getGame?.());
  const aliceForBob = bobGame.players.find((player) => player.id === "p1");
  const bobForBob = bobGame.players.find((player) => player.id === "p2");
  assert.ok(aliceForBob.hand.every((card) => card.name === "Hidden card"), "Public tunnel viewer should not receive another player's hand");
  assert.ok(bobForBob.hand.some((card) => card.name !== "Hidden card"), "Public tunnel viewer should receive their own hand");
  await capture(bobPage, "online-tunnel-bob-claimed.png");
  await stopRoomPolling(bobPage);
  await bobContext.close();

  await alicePage.waitForFunction(() => {
    const bobSeat = window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p2");
    return bobSeat?.claimedBy === "Bob Tunnel" && bobSeat.connected === false;
  }, undefined, { timeout: 15_000 });

  const bobRecoveryContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const bobRecoveryPage = await bobRecoveryContext.newPage();
  observePage(bobRecoveryPage);
  await openPublicApp(bobRecoveryPage, inviteUrl);
  await bobRecoveryPage.waitForFunction(() => window.__DUNE_DEBUG__?.getRoomSyncMode?.() === "poll");
  await bobRecoveryPage.waitForFunction(() =>
    document.querySelector("[data-testid='room-seat-p2']")?.textContent?.includes("offline")
  );
  assert.equal(
    await bobRecoveryPage.getByTestId("room-seat-p2").isDisabled(),
    true,
    "Fresh public browsers should not reclaim disconnected seats without the old token",
  );
  assert.doesNotMatch(
    await bobRecoveryPage.getByTestId("room-seat-p2").innerText(),
    /reclaim/i,
    "Disconnected claimed seats should not be labeled as tokenless reclaimable over the public tunnel",
  );
  await capture(bobRecoveryPage, "online-tunnel-bob-offline-locked.png");
  await stopRoomPolling(bobRecoveryPage);
  await bobRecoveryContext.close();

  await alicePage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissTryCloudflareInterstitial(alicePage);
  await alicePage.waitForFunction(() => window.__DUNE_DEBUG__?.getRoomSyncMode?.() === "poll");
  await alicePage.waitForFunction(() => document.querySelector("[data-testid='room-seat-p1']")?.classList.contains("selected"));
  await waitForVisiblePrivateHand(alicePage, "p1");
  await capture(alicePage, "online-tunnel-alice-reconnected.png");

  await stopRoomPolling(alicePage);
  await aliceContext.close();

  const consoleFailures = consoleMessages.filter((message) => message.type === "error" || message.type === "pageerror");
  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${JSON.stringify(consoleFailures, null, 2)}`);
  assert.deepEqual(requestFailures, [], `Browser request failures:\n${JSON.stringify(requestFailures, null, 2)}`);

  const summary = {
    cloudflaredVersion,
    consoleErrorCount: consoleFailures.length,
    inviteUrl,
    pollAbortCount: pollAbortRequests.length,
    publicBaseUrl,
    publicReady,
    requestFailureCount: requestFailures.length,
    roomId,
    screenshots,
    syncMode: "poll",
  };
  await writeFile(join(outDir, "cloudflared.log"), cloudflaredLog.join("\n"));
  await writeFile(join(outDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
  await writeFile(join(outDir, "poll-aborts.json"), JSON.stringify(pollAbortRequests, null, 2));
  await writeFile(join(outDir, "request-failures.json"), JSON.stringify(requestFailures, null, 2));
  await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("browser room online tunnel passed");
  console.log(`public URL: ${publicBaseUrl}`);
  console.log(`room ID: ${roomId}`);
  console.log(`screenshot count: ${summary.screenshots.length}`);
  console.log(`console error count: ${summary.consoleErrorCount}`);
  console.log(`poll abort count: ${summary.pollAbortCount}`);
  console.log(`request failure count: ${summary.requestFailureCount}`);
  console.log(`summary: ${join(outDir, "summary.json")}`);
} finally {
  await browser?.close().catch(() => undefined);
  await tunnel?.close().catch(() => undefined);
  await server?.close().catch(() => undefined);
}
