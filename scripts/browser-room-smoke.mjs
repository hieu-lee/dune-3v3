#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { createRoomServer } from "./room-server.mjs";

const outDir = "artifacts/qa/browser-room-smoke";
await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

const consoleMessages = [];
const requestFailures = [];
const screenshots = [];
const server = await createRoomServer({ port: 0, log: false, storageFile: join(outDir, "rooms.json") });
const browser = await chromium.launch({ headless: true });
const { startCombatPhase } = await server.ssrLoadModule("/src/game/state.ts");
const {
  conflictCards,
  intrigueCards,
  muadDibCommanderCards,
  standardContracts,
} = await server.ssrLoadModule("/src/game/data.ts");

function observePage(page) {
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText;
    if (request.resourceType() === "eventsource" && failure === "net::ERR_ABORTED") return;
    if (request.resourceType() === "image" && failure === "net::ERR_ABORTED") return;
    requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure,
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400 || !response.url().startsWith(server.resolvedUrls.local[0])) return;
    requestFailures.push({
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      url: response.url(),
      status,
      statusText: response.statusText(),
    });
  });
}

async function capture(page, name) {
  const screenshotPath = join(outDir, name);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const state = await page.evaluate(() => window.__DUNE_DEBUG__?.getGame?.() ?? null);
  const statePath = screenshotPath.replace(/\.png$/, ".state.json");
  await writeFile(statePath, JSON.stringify(state, null, 2));
  screenshots.push(screenshotPath);
  return { screenshot: screenshotPath, state: statePath };
}

async function currentGame(page) {
  return await page.evaluate(() => window.__DUNE_DEBUG__?.getGame?.() ?? null);
}

async function waitForSelectedSeat(page, playerId) {
  await page.waitForFunction(
    (seatId) => document.querySelector(`[data-testid="room-seat-${seatId}"]`)?.classList.contains("selected"),
    playerId,
  );
}

async function claimSeat(page, playerId, name) {
  await page.getByLabel("Player name").fill(name);
  await page.getByTestId(`room-seat-${playerId}`).click();
  await waitForSelectedSeat(page, playerId);
}

async function waitForVisiblePrivateHand(page, playerId) {
  await page.waitForFunction((ownerId) => {
    const game = window.__DUNE_DEBUG__?.getGame?.();
    const owner = game?.players.find((player) => player.id === ownerId);
    return Boolean(owner?.hand.length && owner.hand.some((card) => card.name !== "Hidden card"));
  }, playerId);
}

function assertHiddenSharedDecks(game) {
  assert.ok(game.marketDeck.every((card) => card.name === "Hidden card"), "Imperium deck should be hidden in room state");
  assert.ok(
    game.contractDeck.every((card) => card.name === "Hidden CHOAM contract"),
    "CHOAM contract deck should be hidden in room state",
  );
  assert.ok(game.intrigueDeck.every((card) => card.name === "Hidden Intrigue"), "Intrigue deck should be hidden in room state");
  assert.ok(game.conflictDeck.every((card) => card.name === "Hidden Conflict"), "Conflict deck should be hidden in room state");
}

function dataCardBySourceId(cards, sourceId, label) {
  const card = cards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(card, `Expected ${label} source ${sourceId}`);
  return { ...card };
}

function conflictBySourceId(sourceId) {
  const conflict = dataCardBySourceId(conflictCards, sourceId, "Conflict");
  return { ...conflict, rewards: [...conflict.rewards] };
}

function intrigueBySourceId(sourceId) {
  const intrigue = dataCardBySourceId(intrigueCards, sourceId, "Intrigue");
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function combatRoomState(record, setupPlayers, firstSeat = 1) {
  const baseGame = record.game;
  return startCombatPhase({
    ...baseGame,
    phase: "playing",
    firstSeat,
    activeSeat: firstSeat,
    conflict: conflictBySourceId(453),
    conflictDeck: [conflictBySourceId(452)],
    conflictDiscard: [],
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: [],
    players: setupPlayers(baseGame.players.map((candidate) => ({
      ...candidate,
      agentsReady: 0,
      revealed: true,
      persuasion: 0,
      conflict: 0,
      deployedTroops: 0,
      hand: [],
      playArea: [],
      discard: [],
      deck: [],
      intrigues: [],
      objectives: [],
      wonConflicts: [],
    }))),
  });
}

try {
  const aliceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const alicePage = await aliceContext.newPage();
  observePage(alicePage);
  await alicePage.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await alicePage.getByRole("button", { name: "Create" }).click();
  await alicePage.waitForFunction(() => new URL(window.location.href).searchParams.has("room"));
  const roomId = await alicePage.evaluate(() => new URL(window.location.href).searchParams.get("room"));
  const inviteUrl = alicePage.url();
  assert.match(roomId, /^[A-F0-9]{8}$/);
  await alicePage.goBack();
  await alicePage.waitForFunction(() =>
    !new URL(window.location.href).searchParams.has("room") &&
    window.__DUNE_DEBUG__?.getRoomSnapshot?.() === null &&
    document.querySelector(".launch-screen")
  );
  await alicePage.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
  await alicePage.getByLabel("Room code").fill(inviteUrl);
  await alicePage.getByRole("button", { name: "Join" }).click();
  await alicePage.waitForFunction((expectedRoomId) =>
    new URL(window.location.href).searchParams.get("room") === expectedRoomId &&
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.roomId === expectedRoomId &&
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.started === false &&
    !document.querySelector(".pending-resolution-overlay"),
    roomId,
  );
  await capture(alicePage, "room-joined-by-invite-link.png");
  const joinedRoomMobileViewport = { width: 390, height: 900 };
  await alicePage.setViewportSize(joinedRoomMobileViewport);
  const joinedRoomMobileScrollWidth = await alicePage.evaluate(() => document.documentElement.scrollWidth);
  assert(
    joinedRoomMobileScrollWidth <= joinedRoomMobileViewport.width,
    `Joined room mobile view should not overflow horizontally (${joinedRoomMobileScrollWidth}px)`,
  );
  await capture(alicePage, "room-joined-by-invite-link-mobile-390.png");
  await alicePage.setViewportSize({ width: 1440, height: 1100 });
  await alicePage.getByLabel("Player name").fill("Alice");
  await alicePage.getByTestId("room-seat-p1").click();
  await alicePage.waitForFunction(() => document.querySelector(".room-seat.selected")?.textContent?.includes("Muad'Dib"));
  await waitForVisiblePrivateHand(alicePage, "p1");
  assert.doesNotMatch(
    await alicePage.locator(".room-private-panel").innerText(),
    /Hidden card/,
    "Alice's private hand panel should show her own cards",
  );
  await capture(alicePage, "room-alice-claimed.png");
  assert.equal(
    await alicePage.getByTestId("room-seat-p2").isDisabled(),
    false,
    "Claimed browsers should be able to switch to an unclaimed role",
  );
  await alicePage.getByTestId("room-seat-p2").click();
  await waitForSelectedSeat(alicePage, "p2");
  await alicePage.waitForFunction(() =>
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p1")?.claimedBy === undefined
  );
  await capture(alicePage, "room-alice-switched-seat.png");
  await alicePage.getByRole("button", { name: "Release" }).click();
  await alicePage.waitForFunction(() =>
    !document.querySelector(".room-seat.selected") &&
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.viewerPlayerId === undefined
  );
  await capture(alicePage, "room-alice-released-seat.png");
  await claimSeat(alicePage, "p1", "Alice");

  await alicePage.reload({ waitUntil: "domcontentloaded" });
  await alicePage.waitForFunction(() => document.querySelector(".room-seat.selected")?.textContent?.includes("Muad'Dib"));
  await capture(alicePage, "room-alice-recovered.png");
  await alicePage.getByLabel("Player name").fill("Alice Prime");
  await alicePage.getByTestId("room-seat-p1").click();
  await alicePage.waitForFunction(() =>
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p1")?.claimedBy === "Alice Prime"
  );

  const bobContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const bobPage = await bobContext.newPage();
  observePage(bobPage);
  await bobPage.goto(`${server.resolvedUrls.local[0]}?room=${roomId}`, { waitUntil: "domcontentloaded" });
  await bobPage.waitForFunction(() => document.querySelector(".room-seat")?.textContent?.includes("Muad'Dib"));
  assert.equal(
    await bobPage.getByTestId("room-seat-p1").isDisabled(),
    true,
    "Second browser should not be able to claim Alice's seat",
  );
  await bobPage.getByLabel("Player name").fill("Bob");
  await bobPage.getByTestId("room-seat-p2").click();
  await bobPage.waitForFunction(() => document.querySelector(".room-seat.selected")?.textContent?.includes("Feyd-Rautha"));
  await alicePage.waitForFunction(() =>
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p2")?.claimedBy === "Bob"
  );
  await waitForVisiblePrivateHand(bobPage, "p2");
  assert.doesNotMatch(
    await bobPage.locator(".room-private-panel").innerText(),
    /Hidden card/,
    "Bob's private hand panel should show his own cards",
  );
  const bobGame = await currentGame(bobPage);
  const p1 = bobGame.players.find((player) => player.id === "p1");
  const p2 = bobGame.players.find((player) => player.id === "p2");
  assert.ok(p1.hand.every((card) => card.name === "Hidden card"), "Bob should not receive Alice's hand cards");
  assert.ok(p2.hand.some((card) => card.name !== "Hidden card"), "Bob should receive his own hand cards");
  assert.ok(
    p1.objectives.every((objective) => objective.name === "Hidden Objective" || objective.name === "Scored Objective"),
    "Bob should not receive other players' objective names",
  );
  assertHiddenSharedDecks(bobGame);
  await capture(bobPage, "room-bob-claimed.png");
  await bobContext.close();
  await alicePage.waitForFunction(() =>
    window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.seats.find((seat) => seat.playerId === "p2")?.connected === false
  );
  const bobRecoveryContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const bobRecoveryPage = await bobRecoveryContext.newPage();
  observePage(bobRecoveryPage);
  await bobRecoveryPage.goto(`${server.resolvedUrls.local[0]}?room=${roomId}`, { waitUntil: "domcontentloaded" });
  await bobRecoveryPage.waitForFunction(() =>
    document.querySelector("[data-testid='room-seat-p2']")?.textContent?.includes("offline")
  );
  assert.equal(
    await bobRecoveryPage.getByTestId("room-seat-p2").isDisabled(),
    false,
    "Disconnected claimed seats should be recoverable from a browser without the old token",
  );
  await claimSeat(bobRecoveryPage, "p2", "Bob Reopened");
  await waitForVisiblePrivateHand(bobRecoveryPage, "p2");
  await capture(bobRecoveryPage, "room-bob-offline-reclaimed.png");
  await bobRecoveryContext.close();

  const actionContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const actionPage = await actionContext.newPage();
  observePage(actionPage);
  await actionPage.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await actionPage.getByRole("button", { name: "Create" }).click();
  await actionPage.waitForFunction(() => new URL(window.location.href).searchParams.has("room"));
  const actionRoomId = await actionPage.evaluate(() => new URL(window.location.href).searchParams.get("room"));
  const actionRecord = server.rooms.get(actionRoomId);
  assert.ok(actionRecord, "Action smoke room should be stored in memory");
  actionRecord.started = true;
  actionRecord.version += 1;
  actionRecord.updatedAt = Date.now();
  await actionPage.reload({ waitUntil: "domcontentloaded" });
  await actionPage.waitForFunction(() => window.__DUNE_DEBUG__?.getRoomSnapshot?.()?.started === true);
  let actionGame = await currentGame(actionPage);
  let p4Page = null;
  if (actionGame.pendingAction?.kind === "throne-row") {
    await claimSeat(actionPage, "p4", "Shaddam");
    p4Page = actionPage;
    const firstThroneCard = actionPage.locator(".pending-panel .throne-choice button").first();
    await firstThroneCard.waitFor({ state: "visible" });
    await firstThroneCard.click();
    await actionPage.waitForFunction(() => !window.__DUNE_DEBUG__?.getGame?.()?.pendingAction);
    await capture(actionPage, "room-setup-throne-resolved.png");
  }

  actionGame = await currentGame(actionPage);
  const activePlayerId = actionGame.players[actionGame.activeSeat].id;
  let activePage = actionPage;
  let activeContext = actionContext;
  if (p4Page && activePlayerId !== "p4") {
    activeContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    activePage = await activeContext.newPage();
    observePage(activePage);
    await activePage.goto(`${server.resolvedUrls.local[0]}?room=${actionRoomId}`, { waitUntil: "domcontentloaded" });
  }
  if (!p4Page || activePlayerId !== "p4") {
    await activePage.waitForFunction(() => document.querySelector(".room-seat"));
    await claimSeat(activePage, activePlayerId, "Active");
  }
  await activePage.getByTestId("reveal-turn").click();
  await activePage.waitForFunction(
    (playerId) => window.__DUNE_DEBUG__?.getGame?.()?.players.find((player) => player.id === playerId)?.revealed === true,
    activePlayerId,
  );
  await capture(activePage, "room-active-revealed.png");

  const revealedGame = await currentGame(activePage);
  assert.equal(revealedGame.pendingAction, undefined, "Online reveal smoke expects starter reveal to avoid pending choices");
  await activePage.getByTestId("end-reveal").click();
  await activePage.waitForFunction(
    (playerId) => window.__DUNE_DEBUG__?.getGame?.()?.players[window.__DUNE_DEBUG__?.getGame?.()?.activeSeat]?.id !== playerId,
    activePlayerId,
  );
  await capture(activePage, "room-active-ended.png");
  if (activeContext !== actionContext) await activeContext.close();
  await actionContext.close();

  const pendingRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(pendingRoomResponse.status, 201, "Pending UI room should be created");
  const pendingRoom = await pendingRoomResponse.json();
  const pendingRoomRecord = server.rooms.get(pendingRoom.roomId);
  assert.ok(pendingRoomRecord, "Pending UI room should be stored in memory");
  const pendingOwnerId = "p2";
  const pendingOwnerInitialSpice = pendingRoomRecord.game.players.find((player) => player.id === pendingOwnerId)?.resources.spice ?? 0;
  pendingRoomRecord.game = {
    ...pendingRoomRecord.game,
    pendingAction: {
      kind: "maker-choice",
      ownerId: pendingOwnerId,
      spiceOwnerId: pendingOwnerId,
      spice: 2,
      sandworms: 1,
      canSummonSandworms: false,
      source: "Browser Maker",
      spaceId: "hagga-basin",
    },
    pendingQueue: [],
  };
  const pendingContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const pendingPage = await pendingContext.newPage();
  observePage(pendingPage);
  await pendingPage.goto(`${server.resolvedUrls.local[0]}?room=${pendingRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(pendingPage, pendingOwnerId, "Pending");
  await pendingPage.getByRole("button", { name: /\+2 spice/ }).click();
  await pendingPage.waitForFunction(
    ({ ownerId, expectedSpice }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return !game?.pendingAction && owner?.resources.spice === expectedSpice;
    },
    { ownerId: pendingOwnerId, expectedSpice: pendingOwnerInitialSpice + 2 },
  );
  await capture(pendingPage, "room-pending-maker-resolved.png");
  await pendingContext.close();

  const splitMakerRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(splitMakerRoomResponse.status, 201, "Split Maker UI room should be created");
  const splitMakerRoom = await splitMakerRoomResponse.json();
  const splitMakerRecord = server.rooms.get(splitMakerRoom.roomId);
  assert.ok(splitMakerRecord, "Split Maker UI room should be stored in memory");
  splitMakerRecord.game = {
    ...splitMakerRecord.game,
    pendingAction: {
      kind: "maker-choice",
      ownerId: "p3",
      spiceOwnerId: "p1",
      spice: 2,
      sandworms: 1,
      canSummonSandworms: true,
      source: "Browser Split Maker",
      spaceId: "hagga-basin",
    },
    pendingQueue: [],
  };
  const splitMakerSpiceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const splitMakerSpicePage = await splitMakerSpiceContext.newPage();
  observePage(splitMakerSpicePage);
  await splitMakerSpicePage.goto(`${server.resolvedUrls.local[0]}?room=${splitMakerRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(splitMakerSpicePage, "p1", "Split Maker Spice");
  const splitMakerSpiceControls = splitMakerSpicePage.locator(".pending-panel .pending-controls");
  await splitMakerSpiceControls.waitFor({ state: "visible" });
  assert.equal(
    await splitMakerSpiceControls.getByRole("button", { name: /\+2 spice/ }).isDisabled(),
    false,
    "Room split Maker spice owners should get their own spice choice",
  );
  assert.equal(
    await splitMakerSpiceControls.getByRole("button", { name: /Summon 1/ }).isDisabled(),
    true,
    "Room split Maker spice owners should not get the sandworm owner's choice",
  );
  await capture(splitMakerSpicePage, "room-split-maker-spice-scoped.png");
  const splitMakerWormContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const splitMakerWormPage = await splitMakerWormContext.newPage();
  observePage(splitMakerWormPage);
  await splitMakerWormPage.goto(`${server.resolvedUrls.local[0]}?room=${splitMakerRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(splitMakerWormPage, "p3", "Split Maker Worms");
  const splitMakerWormControls = splitMakerWormPage.locator(".pending-panel .pending-controls");
  await splitMakerWormControls.waitFor({ state: "visible" });
  assert.equal(
    await splitMakerWormControls.getByRole("button", { name: /\+2 spice/ }).isDisabled(),
    true,
    "Room split Maker sandworm owners should not get the spice owner's choice",
  );
  assert.equal(
    await splitMakerWormControls.getByRole("button", { name: /Summon 1/ }).isDisabled(),
    false,
    "Room split Maker sandworm owners should get their own sandworm choice",
  );
  await capture(splitMakerWormPage, "room-split-maker-worm-scoped.png");
  await splitMakerWormContext.close();
  await splitMakerSpiceContext.close();

  const splitSietchRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(splitSietchRoomResponse.status, 201, "Split Sietch UI room should be created");
  const splitSietchRoom = await splitSietchRoomResponse.json();
  const splitSietchRecord = server.rooms.get(splitSietchRoom.roomId);
  assert.ok(splitSietchRecord, "Split Sietch UI room should be stored in memory");
  splitSietchRecord.game = {
    ...splitSietchRecord.game,
    shieldWall: true,
    pendingAction: {
      kind: "sietch-tabr",
      ownerId: "p3",
      waterOwnerId: "p1",
      canTakeMakerHooks: true,
      canRemoveShieldWall: true,
      source: "Browser Split Sietch",
      spaceId: "sietch-tabr",
      conflictBlocked: true,
    },
    pendingQueue: [],
  };
  const splitSietchWaterContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const splitSietchWaterPage = await splitSietchWaterContext.newPage();
  observePage(splitSietchWaterPage);
  await splitSietchWaterPage.goto(`${server.resolvedUrls.local[0]}?room=${splitSietchRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(splitSietchWaterPage, "p1", "Split Sietch Water");
  const splitSietchWaterControls = splitSietchWaterPage.locator(".pending-panel .pending-controls");
  await splitSietchWaterControls.waitFor({ state: "visible" });
  assert.equal(
    await splitSietchWaterControls.getByRole("button", { name: /Hooks/ }).isDisabled(),
    true,
    "Room split Sietch water owners should not get the hooks owner's choice",
  );
  assert.equal(
    await splitSietchWaterControls.getByRole("button", { name: /Water/ }).isDisabled(),
    false,
    "Room split Sietch water owners should get their own water choice",
  );
  await capture(splitSietchWaterPage, "room-split-sietch-water-scoped.png");
  const splitSietchHooksContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const splitSietchHooksPage = await splitSietchHooksContext.newPage();
  observePage(splitSietchHooksPage);
  await splitSietchHooksPage.goto(`${server.resolvedUrls.local[0]}?room=${splitSietchRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(splitSietchHooksPage, "p3", "Split Sietch Hooks");
  const splitSietchHooksControls = splitSietchHooksPage.locator(".pending-panel .pending-controls");
  await splitSietchHooksControls.waitFor({ state: "visible" });
  assert.equal(
    await splitSietchHooksControls.getByRole("button", { name: /Hooks/ }).isDisabled(),
    false,
    "Room split Sietch hooks owners should get their own hooks choice",
  );
  assert.equal(
    await splitSietchHooksControls.getByRole("button", { name: /Water/ }).isDisabled(),
    true,
    "Room split Sietch hooks owners should not get the water owner's choice",
  );
  await capture(splitSietchHooksPage, "room-split-sietch-hooks-scoped.png");
  await splitSietchHooksContext.close();
  await splitSietchWaterContext.close();

  const teamPaymentRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(teamPaymentRoomResponse.status, 201, "Team payment UI room should be created");
  const teamPaymentRoom = await teamPaymentRoomResponse.json();
  const teamPaymentRecord = server.rooms.get(teamPaymentRoom.roomId);
  assert.ok(teamPaymentRecord, "Team payment UI room should be stored in memory");
  const threatenSpiceProduction = muadDibCommanderCards.find((card) => card.name === "Threaten Spice Production");
  assert.ok(threatenSpiceProduction, "Threaten Spice Production should be available for room UI scoping");
  teamPaymentRecord.game = {
    ...teamPaymentRecord.game,
    pendingAction: {
      kind: "team-resource-payment",
      ownerId: "p1",
      contributorIds: ["p1", "p3", "p5"],
      contributions: { p1: 0, p3: 0, p5: 0 },
      resource: "spice",
      cost: 7,
      vp: 1,
      optional: true,
      trashSource: true,
      cardId: threatenSpiceProduction.id,
      spaceId: "imperial-basin",
      source: "Threaten Spice Production",
    },
    pendingQueue: [],
    players: teamPaymentRecord.game.players.map((candidate) => {
      if (candidate.id === "p1") return { ...candidate, resources: { ...candidate.resources, spice: 3 }, playArea: [threatenSpiceProduction] };
      if (candidate.id === "p3" || candidate.id === "p5") return { ...candidate, resources: { ...candidate.resources, spice: 2 } };
      return candidate;
    }),
  };
  const teamPaymentContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const teamPaymentPage = await teamPaymentContext.newPage();
  observePage(teamPaymentPage);
  await teamPaymentPage.goto(`${server.resolvedUrls.local[0]}?room=${teamPaymentRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(teamPaymentPage, "p3", "Team Payment Ally");
  await teamPaymentPage.locator(".threaten-spice-choice").waitFor({ state: "visible" });
  assert.equal(
    await teamPaymentPage.getByLabel("Add 1 spice from Muad'Dib").isDisabled(),
    true,
    "Room team-resource contributors should not get another contributor's add control",
  );
  assert.equal(
    await teamPaymentPage.getByLabel("Add 1 spice from Gurney Halleck").isDisabled(),
    false,
    "Room team-resource contributors should get their own add control",
  );
  assert.equal(
    await teamPaymentPage.getByLabel("Add 1 spice from Lady Jessica").isDisabled(),
    true,
    "Room team-resource contributors should not get another ally's add control",
  );
  assert.equal(
    await teamPaymentPage.getByRole("button", { name: /Pay 7/ }).isDisabled(),
    true,
    "Room team-resource contributors should not get the owner's pay control",
  );
  assert.equal(
    await teamPaymentPage.getByRole("button", { name: "Skip" }).count(),
    0,
    "Room team-resource contributors should not get the owner's skip control",
  );
  await capture(teamPaymentPage, "room-team-payment-scoped.png");
  const teamPaymentMobileViewport = { width: 390, height: 900 };
  await teamPaymentPage.setViewportSize(teamPaymentMobileViewport);
  const teamPaymentMobileScrollWidth = await teamPaymentPage.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    teamPaymentMobileScrollWidth <= teamPaymentMobileViewport.width,
    `Room team-resource payment mobile view should not overflow horizontally (${teamPaymentMobileScrollWidth}px)`,
  );
  await capture(teamPaymentPage, "room-team-payment-scoped-mobile-390.png");
  await teamPaymentContext.close();

  const influenceLossRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(influenceLossRoomResponse.status, 201, "Influence-loss UI room should be created");
  const influenceLossRoom = await influenceLossRoomResponse.json();
  const influenceLossRecord = server.rooms.get(influenceLossRoom.roomId);
  assert.ok(influenceLossRecord, "Influence-loss UI room should be stored in memory");
  influenceLossRecord.game = {
    ...influenceLossRecord.game,
    pendingAction: {
      kind: "lose-influence",
      ownerId: "p2",
      alternateOwnerIds: ["p4"],
      combatRecipientId: "p2",
      strength: 2,
      source: "Browser Influence Loss",
      optional: true,
    },
    pendingQueue: [],
    players: influenceLossRecord.game.players.map((candidate) =>
      candidate.id === "p2" || candidate.id === "p4"
        ? { ...candidate, influence: { ...candidate.influence, emperor: 1 }, conflict: 0 }
        : candidate
    ),
  };
  const influenceLossContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const influenceLossPage = await influenceLossContext.newPage();
  observePage(influenceLossPage);
  await influenceLossPage.goto(`${server.resolvedUrls.local[0]}?room=${influenceLossRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(influenceLossPage, "p4", "Influence Alternate");
  await influenceLossPage.locator(".support-grid").waitFor({ state: "visible" });
  assert.equal(
    await influenceLossPage.getByRole("button", { name: /Shaddam Corrino IV.*Emperor/ }).count(),
    1,
    "Room Influence-loss alternates should get their own Influence choice",
  );
  assert.equal(
    await influenceLossPage.getByRole("button", { name: /Feyd-Rautha Harkonnen.*Emperor/ }).count(),
    0,
    "Room Influence-loss alternates should not get the owner's Influence choice",
  );
  assert.equal(
    await influenceLossPage.getByRole("button", { name: "Skip" }).count(),
    0,
    "Room Influence-loss alternates should not get the owner's skip control",
  );
  await capture(influenceLossPage, "room-influence-loss-scoped.png");
  await influenceLossContext.close();

  const tradeScopeRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(tradeScopeRoomResponse.status, 201, "Trade scope UI room should be created");
  const tradeScopeRoom = await tradeScopeRoomResponse.json();
  const tradeScopeRecord = server.rooms.get(tradeScopeRoom.roomId);
  assert.ok(tradeScopeRecord, "Trade scope UI room should be stored in memory");
  tradeScopeRecord.game = {
    ...tradeScopeRecord.game,
    pendingAction: {
      kind: "trade",
      actorId: "p1",
      partnerId: "p3",
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: "Browser Trade Scope",
    },
    pendingQueue: [],
    players: tradeScopeRecord.game.players.map((candidate) => {
      if (candidate.id === "p1" || candidate.id === "p3") {
        return { ...candidate, resources: { ...candidate.resources, spice: 1 } };
      }
      return candidate;
    }),
  };
  const tradeActorContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const tradeActorPage = await tradeActorContext.newPage();
  observePage(tradeActorPage);
  await tradeActorPage.goto(`${server.resolvedUrls.local[0]}?room=${tradeScopeRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(tradeActorPage, "p1", "Trade Actor");
  const actorTradeControls = tradeActorPage.locator(".trade-controls");
  await actorTradeControls.waitFor({ state: "visible" });
  assert.equal(
    await actorTradeControls.getByRole("button", { name: "Water" }).isDisabled(),
    false,
    "Room trade actors should be able to change the trade resource before transfers start",
  );
  assert.equal(
    await actorTradeControls.getByRole("button", { name: /Muad'Dib to Gurney Halleck\s+Give 1 Spice\s+0\/1 sent/i }).isDisabled(),
    false,
    "Room trade actors should get their own transfer button",
  );
  assert.equal(
    await actorTradeControls.getByRole("button", { name: /Gurney Halleck to Muad'Dib\s+Give 1 Spice\s+0\/1 sent/i }).isDisabled(),
    true,
    "Room trade actors should not get the partner's transfer button",
  );
  assert.equal(
    await actorTradeControls.getByRole("button", { name: "Done" }).isDisabled(),
    false,
    "Room trade actors should be able to finish the trade",
  );
  await capture(tradeActorPage, "room-trade-actor-scoped.png");
  const tradePartnerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const tradePartnerPage = await tradePartnerContext.newPage();
  observePage(tradePartnerPage);
  await tradePartnerPage.goto(`${server.resolvedUrls.local[0]}?room=${tradeScopeRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(tradePartnerPage, "p3", "Trade Partner");
  const partnerTradeControls = tradePartnerPage.locator(".trade-controls");
  await partnerTradeControls.waitFor({ state: "visible" });
  assert.equal(
    await partnerTradeControls.getByRole("button", { name: "Water" }).isDisabled(),
    true,
    "Room trade partners should not get the actor's resource-selection control",
  );
  assert.equal(
    await partnerTradeControls.getByRole("button", { name: /Muad'Dib to Gurney Halleck\s+Give 1 Spice\s+0\/1 sent/i }).isDisabled(),
    true,
    "Room trade partners should not get the actor's transfer button",
  );
  assert.equal(
    await partnerTradeControls.getByRole("button", { name: /Gurney Halleck to Muad'Dib\s+Give 1 Spice\s+0\/1 sent/i }).isDisabled(),
    false,
    "Room trade partners should get their own transfer button",
  );
  assert.equal(
    await partnerTradeControls.getByRole("button", { name: "Done" }).isDisabled(),
    true,
    "Room trade partners should not be able to finish the whole trade",
  );
  await capture(tradePartnerPage, "room-trade-partner-scoped.png");
  await tradePartnerContext.close();
  await tradeActorContext.close();

  const boardInfluenceRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(boardInfluenceRoomResponse.status, 201, "Board influence UI room should be created");
  const boardInfluenceRoom = await boardInfluenceRoomResponse.json();
  const boardInfluenceRecord = server.rooms.get(boardInfluenceRoom.roomId);
  assert.ok(boardInfluenceRecord, "Board influence UI room should be stored in memory");
  boardInfluenceRecord.game = {
    ...boardInfluenceRecord.game,
    pendingAction: {
      kind: "board-influence-choice",
      source: "Browser Board Influence",
      choices: [
        { ownerId: "p1", faction: "fremen" },
        { ownerId: "p3", faction: "bene" },
      ],
    },
    pendingQueue: [],
  };
  const boardInfluenceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const boardInfluencePage = await boardInfluenceContext.newPage();
  observePage(boardInfluencePage);
  await boardInfluencePage.goto(`${server.resolvedUrls.local[0]}?room=${boardInfluenceRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(boardInfluencePage, "p3", "Board Influence Ally");
  const boardInfluenceControls = boardInfluencePage.locator(".pending-panel .support-grid");
  await boardInfluenceControls.waitFor({ state: "visible" });
  assert.equal(
    await boardInfluenceControls.getByRole("button", { name: /Gurney Halleck/ }).count(),
    1,
    "Room board-influence participants should get their own choice",
  );
  assert.equal(
    await boardInfluenceControls.getByRole("button", { name: /Muad'Dib/ }).count(),
    0,
    "Room board-influence participants should not get another owner's choice",
  );
  await capture(boardInfluencePage, "room-board-influence-scoped.png");
  await boardInfluenceContext.close();

  const requiredTrashInfluenceRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(requiredTrashInfluenceRoomResponse.status, 201, "Required-trash board influence UI room should be created");
  const requiredTrashInfluenceRoom = await requiredTrashInfluenceRoomResponse.json();
  const requiredTrashInfluenceRecord = server.rooms.get(requiredTrashInfluenceRoom.roomId);
  assert.ok(requiredTrashInfluenceRecord, "Required-trash board influence UI room should be stored in memory");
  requiredTrashInfluenceRecord.game = {
    ...requiredTrashInfluenceRecord.game,
    pendingAction: {
      kind: "board-influence-choice",
      source: "Treacherous Maneuver",
      cardId: "browser-treacherous-maneuver",
      cardOwnerId: "p1",
      requiredHandTrashTrait: "Faction: Emperor",
      trashSource: true,
      choices: [{ ownerId: "p3", faction: "bene" }],
    },
    pendingQueue: [],
  };
  const requiredTrashInfluenceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const requiredTrashInfluencePage = await requiredTrashInfluenceContext.newPage();
  observePage(requiredTrashInfluencePage);
  await requiredTrashInfluencePage.goto(`${server.resolvedUrls.local[0]}?room=${requiredTrashInfluenceRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(requiredTrashInfluencePage, "p3", "Required Trash Ally");
  await requiredTrashInfluencePage.locator(".room-pending-panel").waitFor({ state: "visible" });
  assert.equal(
    await requiredTrashInfluencePage.locator(".pending-panel .support-grid").count(),
    0,
    "Room required-trash board-influence recipients should see waiting UI instead of resolver controls",
  );
  await capture(requiredTrashInfluencePage, "room-board-influence-required-trash-waiting.png");
  await requiredTrashInfluenceContext.close();

  const actionChoiceRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(actionChoiceRoomResponse.status, 201, "Pending action choice UI room should be created");
  const actionChoiceRoom = await actionChoiceRoomResponse.json();
  const actionChoiceRecord = server.rooms.get(actionChoiceRoom.roomId);
  assert.ok(actionChoiceRecord, "Pending action choice UI room should be stored in memory");
  actionChoiceRecord.game = {
    ...actionChoiceRecord.game,
    pendingAction: {
      kind: "pending-action-choice",
      ownerId: "p2",
      source: "Browser Pending Choice",
      options: [
        {
          id: "spy",
          label: "Place 1 spy",
          pending: {
            kind: "spy",
            ownerId: "p2",
            remaining: 1,
            source: "Browser Pending Choice",
            recallForSupply: true,
            mustPlaceSpy: true,
          },
        },
        {
          id: "strength",
          label: "+2 strength",
          pending: {
            kind: "gain-strength",
            ownerId: "p2",
            combatRecipientId: "p2",
            source: "Browser Pending Choice",
            amount: 2,
          },
        },
      ],
    },
    pendingQueue: [],
    players: actionChoiceRecord.game.players.map((player) =>
      player.id === "p2" ? { ...player, spies: 1 } : player
    ),
  };
  const actionChoiceContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const actionChoicePage = await actionChoiceContext.newPage();
  observePage(actionChoicePage);
  await actionChoicePage.goto(`${server.resolvedUrls.local[0]}?room=${actionChoiceRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(actionChoicePage, "p2", "Pending Choice Owner");
  const actionChoiceControls = actionChoicePage.locator(".pending-panel .action-choice-grid");
  await actionChoiceControls.waitFor({ state: "visible" });
  const spyChoiceBadge = actionChoiceControls
    .locator(".action-choice-card", { hasText: "Place 1 spy" })
    .locator(".action-choice-badge")
    .first();
  const spyChoiceBadgeText = await spyChoiceBadge.textContent();
  assert.match(spyChoiceBadgeText ?? "", /Spy/, "Nested spy pending-action choices should show a Spy badge");
  assert.doesNotMatch(spyChoiceBadgeText ?? "", /Acquire/, "Nested spy pending-action choices should not show an Acquire badge");
  await capture(actionChoicePage, "room-pending-action-choice-spy-badge.png");
  await actionChoiceContext.close();

  const plotRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(plotRoomResponse.status, 201, "Plot UI room should be created");
  const plotRoom = await plotRoomResponse.json();
  const plotRecord = server.rooms.get(plotRoom.roomId);
  assert.ok(plotRecord, "Plot UI room should be stored in memory");
  plotRecord.started = true;
  const plotOwnerId = "p2";
  const contingencyPlan = intrigueBySourceId(147);
  const plotOwnerInitialSolari = plotRecord.game.players.find((player) => player.id === plotOwnerId)?.resources.solari ?? 0;
  plotRecord.game = {
    ...plotRecord.game,
    phase: "playing",
    activeSeat: plotRecord.game.players.findIndex((player) => player.id === plotOwnerId),
    pendingAction: undefined,
    pendingQueue: [],
    players: plotRecord.game.players.map((player) =>
      player.id === plotOwnerId
        ? { ...player, intrigues: [contingencyPlan], hand: [], deck: [], discard: [] }
        : { ...player, intrigues: [], hand: [], deck: [], discard: [] }
    ),
  };
  const plotContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const plotPage = await plotContext.newPage();
  observePage(plotPage);
  await plotPage.goto(`${server.resolvedUrls.local[0]}?room=${plotRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(plotPage, plotOwnerId, "Plot");
  await plotPage.locator(".intrigue-hand").getByRole("button", { name: "Gain 2 Solari", exact: true }).click();
  await plotPage.waitForFunction(
    ({ ownerId, expectedSolari }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return owner?.resources.solari === expectedSolari && owner?.intrigues.length === 0;
    },
    { ownerId: plotOwnerId, expectedSolari: plotOwnerInitialSolari + 2 },
  );
  await capture(plotPage, "room-plot-contingency-plan.png");
  await plotContext.close();

  const verifierCombat = {
    ...intrigueBySourceId(152),
    id: "browser-verifier-combat",
    name: "Browser Verifier Combat",
    sourceId: undefined,
    combatSwords: undefined,
    effects: [{ trigger: "combat-intrigue", effects: [{ kind: "gain-strength", selector: "self", amount: 2 }] }],
  };
  const combatPlayRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(combatPlayRoomResponse.status, 201, "Combat play UI room should be created");
  const combatPlayRoom = await combatPlayRoomResponse.json();
  const combatPlayRecord = server.rooms.get(combatPlayRoom.roomId);
  assert.ok(combatPlayRecord, "Combat play UI room should be stored in memory");
  combatPlayRecord.game = combatRoomState(combatPlayRecord, (players) =>
    players.map((candidate) => {
      if (candidate.id === "p2") return { ...candidate, conflict: 2, deployedTroops: 1, intrigues: [verifierCombat] };
      if (candidate.id === "p3") return { ...candidate, conflict: 3, deployedTroops: 1 };
      return candidate;
    }),
  );
  const combatPlayContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const combatPlayPage = await combatPlayContext.newPage();
  observePage(combatPlayPage);
  await combatPlayPage.goto(`${server.resolvedUrls.local[0]}?room=${combatPlayRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(combatPlayPage, "p2", "Combat Play");
  await combatPlayPage.locator(".combat-panel").waitFor({ state: "visible" });
  await combatPlayPage.locator(".combat-panel").getByRole("button", { name: "Play", exact: true }).click();
  await combatPlayPage.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame?.();
    const owner = game?.players.find((player) => player.id === "p2");
    return owner?.intrigues.length === 0 && game?.log.some((entry) => entry.includes("Browser Verifier Combat"));
  });
  await capture(combatPlayPage, "room-combat-played.png");
  await combatPlayContext.close();

  const combatRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(combatRoomResponse.status, 201, "Combat UI room should be created");
  const combatRoom = await combatRoomResponse.json();
  const combatRecord = server.rooms.get(combatRoom.roomId);
  assert.ok(combatRecord, "Combat UI room should be stored in memory");
  combatRecord.game = combatRoomState(combatRecord, (players) =>
    players.map((candidate) => {
      if (candidate.id === "p2") return { ...candidate, conflict: 2, deployedTroops: 1, intrigues: [verifierCombat] };
      if (candidate.id === "p3") {
        return {
          ...candidate,
          conflict: 3,
          deployedTroops: 1,
          intrigues: [{ ...verifierCombat, id: "browser-verifier-combat-p3" }],
        };
      }
      return candidate;
    }),
  );
  const combatContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const combatPage = await combatContext.newPage();
  observePage(combatPage);
  await combatPage.goto(`${server.resolvedUrls.local[0]}?room=${combatRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(combatPage, "p2", "Combat");
  await combatPage.locator(".combat-panel").waitFor({ state: "visible" });
  await combatPage.locator(".combat-panel .combat-pass").click();
  await combatPage.waitForFunction(
    () => window.__DUNE_DEBUG__?.getGame?.()?.players[window.__DUNE_DEBUG__?.getGame?.()?.activeSeat]?.id === "p3",
  );
  await capture(combatPage, "room-combat-passed.png");
  await combatContext.close();

  const endgameRoomResponse = await fetch(`${server.resolvedUrls.local[0]}api/rooms`, { method: "POST" });
  assert.equal(endgameRoomResponse.status, 201, "Endgame UI room should be created");
  const endgameRoom = await endgameRoomResponse.json();
  const endgameRecord = server.rooms.get(endgameRoom.roomId);
  assert.ok(endgameRecord, "Endgame UI room should be stored in memory");
  const crysknifeIntrigue = intrigueBySourceId(159);
  const choamProfits = intrigueBySourceId(450);
  const crysknifeConflict = { ...conflictBySourceId(454), scored: false };
  const completedContracts = standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  assert.equal(completedContracts.length, 4, "Endgame UI fixture should have enough contracts");
  const endgameOwnerInitialVp = endgameRecord.game.players.find((player) => player.id === "p2")?.vp ?? 0;
  endgameRecord.game = {
    ...endgameRecord.game,
    phase: "endgame",
    endgameReason: "Verifier Endgame",
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: endgameRecord.game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, intrigues: [crysknifeIntrigue, choamProfits], contracts: completedContracts, wonConflicts: [crysknifeConflict] }
        : { ...candidate, intrigues: [], wonConflicts: [] }
    ),
  };
  endgameRecord.endgameReady = Object.fromEntries(endgameRecord.game.players
    .filter((player) => player.id !== "p2")
    .map((player) => [player.id, true]));
  const endgameContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const endgamePage = await endgameContext.newPage();
  observePage(endgamePage);
  await endgamePage.goto(`${server.resolvedUrls.local[0]}?room=${endgameRoom.roomId}`, { waitUntil: "domcontentloaded" });
  await claimSeat(endgamePage, "p2", "Endgame");
  await endgamePage.locator(".endgame-panel").waitFor({ state: "visible" });
  await capture(endgamePage, "room-endgame-score-choices.png");
  const endgameMobileViewport = { width: 390, height: 900 };
  await endgamePage.setViewportSize(endgameMobileViewport);
  const endgameMobileScrollWidth = await endgamePage.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    endgameMobileScrollWidth <= endgameMobileViewport.width,
    `Endgame scoring mobile view should not overflow horizontally (${endgameMobileScrollWidth}px)`,
  );
  await capture(endgamePage, "room-endgame-score-choices-mobile-390.png");
  await endgamePage.setViewportSize({ width: 1440, height: 1100 });
  await endgamePage.getByRole("button", { name: /Score Crysknife/i }).click();
  await endgamePage.waitForFunction(
    ({ ownerId, expectedVp }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return owner?.vp === expectedVp && owner?.intrigues.length === 1;
    },
    { ownerId: "p2", expectedVp: endgameOwnerInitialVp + 1 },
  );
  await endgamePage.getByRole("button", { name: /Score 1 VP/i }).click();
  await endgamePage.waitForFunction(
    ({ ownerId, expectedVp }) => {
      const game = window.__DUNE_DEBUG__?.getGame?.();
      const owner = game?.players.find((player) => player.id === ownerId);
      return owner?.vp === expectedVp && owner?.intrigues.length === 0;
    },
    { ownerId: "p2", expectedVp: endgameOwnerInitialVp + 2 },
  );
  await endgamePage.getByRole("button", { name: /^Ready/ }).click();
  await endgamePage.waitForFunction(() => window.__DUNE_DEBUG__?.getGame?.()?.phase === "finished");
  await capture(endgamePage, "room-endgame-finalized.png");
  await endgameContext.close();

  await aliceContext.close();
  await bobContext.close();

  const consoleFailures = consoleMessages.filter((message) => message.type === "error" || message.type === "pageerror");
  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${JSON.stringify(consoleFailures, null, 2)}`);
  assert.deepEqual(requestFailures, [], `Browser request failures:\n${JSON.stringify(requestFailures, null, 2)}`);

  const summary = {
    roomId,
    screenshots,
    consoleErrorCount: consoleFailures.length,
    requestFailureCount: requestFailures.length,
    url: server.resolvedUrls.local[0],
  };
  await writeFile(join(outDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
  await writeFile(join(outDir, "request-failures.json"), JSON.stringify(requestFailures, null, 2));
  await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("browser room smoke passed");
  console.log(`screenshot count: ${summary.screenshots.length}`);
  console.log(`console error count: ${summary.consoleErrorCount}`);
  console.log(`request failure count: ${summary.requestFailureCount}`);
  console.log(`summary: ${join(outDir, "summary.json")}`);
} finally {
  await browser.close();
  await server.close();
}
