import assert from "node:assert/strict";

const occupiedSpaces = {
  arrakeen: "p2",
  carthag: "p4",
  "high-council": "p5",
  sardaukar: "p4",
  "desert-mastery": "p1",
  shipping: "p2",
  "habbanya-erg": "p6",
};

const spyPosts = {
  arrakeen: "p2",
  espionage: "p4",
  "imperial-basin": "p5",
};

const sharedSpyPosts = {
  arrakeen: ["p5"],
  "imperial-basin": ["p6"],
};

const locationControl = {
  arrakeen: "p2",
  "spice-refinery": "p4",
  "imperial-basin": "p3",
};

const makerSpice = {
  "imperial-basin": 2,
  "habbanya-erg": 3,
  "hagga-basin": 1,
  "deep-desert": 4,
};

const vpByPlayerId = {
  p1: 4,
  p2: 3,
  p3: 5,
  p4: 4,
  p5: 2,
  p6: 3,
};

export async function runBoardStatesSmoke({
  captures,
  initialPlayableGame,
  openApp,
  page,
  screenshot,
  server,
  setDebugGameAndWait,
  url,
  writeJson,
}) {
  await openApp(page, url, 1440, 1100);
  const fixture = await createBoardStatesFixture(server, initialPlayableGame);

  await writeJson("board-states-fixture.json", {
    activePlayer: fixture.activePlayerName,
    selectedCard: fixture.cardName,
    occupiedSpaces,
    spyPosts,
    sharedSpyPosts,
    locationControl,
    makerSpice,
  });

  await setDebugGameAndWait(page, fixture.game);
  await page.waitForFunction(
    ({ occupiedSpaceIds }) => {
      const occupiedReady = occupiedSpaceIds.every((spaceId) =>
        document.querySelector(`[data-testid="space-${spaceId}"]`)?.classList.contains("occupied")
      );
      return Boolean(
        occupiedReady &&
          document.querySelectorAll(".spy-marker").length >= 3 &&
          document.querySelectorAll(".control-marker").length >= 3 &&
          document.querySelectorAll(".maker-marker").length >= 4 &&
          document.querySelectorAll(".space-tile.personal.occupied").length >= 2,
      );
    },
    { occupiedSpaceIds: Object.keys(occupiedSpaces) },
  );

  const denseStats = await boardMarkerStats(page);
  assert.equal(denseStats.occupied, Object.keys(occupiedSpaces).length, "Dense board state should render all occupied spaces");
  assert.ok(denseStats.personalOccupied >= 2, "Dense board state should include occupied Commander personal spaces");
  assert.ok(denseStats.spyMarkers >= 3, "Dense board state should include spy markers");
  assert.ok(denseStats.controlMarkers >= 3, "Dense board state should include critical-location control markers");
  assert.ok(denseStats.makerMarkers >= 4, "Dense board state should include all Maker space markers");
  await screenshot(page, captures, "board-states-dense-ready.png");

  const cardButton = page.getByTestId(`hand-card-${fixture.cardId}`);
  assert.equal(await cardButton.count(), 1, `Expected one hand card button for ${fixture.cardName}`);
  await cardButton.click();

  await page.waitForFunction(
    ({ cardId }) =>
      Boolean(
        document.querySelector(`[data-testid="hand-card-${cardId}"]`)?.classList.contains("selected") &&
          document.querySelectorAll(".space-tile.legal").length > 0 &&
          document.querySelectorAll(".space-tile.unavailable").length > 0 &&
          document.querySelectorAll(".space-tile.occupied.unavailable").length > 0,
      ),
    { cardId: fixture.cardId },
  );

  const placementStats = await boardPlacementStats(page);
  assert.ok(placementStats.legal >= 3, `Expected at least three legal Dune placements, found ${placementStats.legal}`);
  assert.ok(
    placementStats.unavailable >= 10,
    `Expected non-legal board spaces to be marked unavailable, found ${placementStats.unavailable}`,
  );
  assert.ok(
    placementStats.occupiedUnavailable >= 3,
    `Expected occupied spaces to be unavailable during placement, found ${placementStats.occupiedUnavailable}`,
  );
  assert.ok(
    placementStats.legalStatuses.some((status) => status.includes("Legal placement")),
    "Legal spaces should expose placement status to assistive tech",
  );
  assert.ok(
    placementStats.unavailableStatuses.some((status) => status.includes("Unavailable placement")),
    "Unavailable spaces should expose placement status to assistive tech",
  );
  await screenshot(page, captures, "board-states-legal-unavailable.png");

  const selectedUnavailableSpaceId = await page.evaluate(() => {
    const availableInspectionTarget =
      Array.from(document.querySelectorAll(".space-tile.unavailable:not(.occupied)"))
        .find((tile) => tile.getAttribute("data-space-id"));
    const fallbackTarget = document.querySelector(".space-tile.unavailable");
    return (availableInspectionTarget ?? fallbackTarget)?.getAttribute("data-space-id") ?? null;
  });
  assert.ok(selectedUnavailableSpaceId, "Expected an unavailable board space to inspect");
  await page.getByTestId(`space-${selectedUnavailableSpaceId}`).click();
  await page.waitForFunction(
    ({ spaceId }) => {
      const tile = document.querySelector(`[data-testid="space-${spaceId}"]`);
      const placeAgent = document.querySelector('[data-testid="place-agent"]');
      return Boolean(
        tile?.classList.contains("selected") &&
          tile.classList.contains("unavailable") &&
          tile.querySelector(".space-placement-status")?.textContent?.includes("Unavailable placement") &&
          placeAgent?.matches(":disabled"),
      );
    },
    { spaceId: selectedUnavailableSpaceId },
  );

  const mobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(mobileViewport);
  const mobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    mobileScrollWidth <= mobileViewport.width,
    `Board states mobile view should not overflow horizontally (${mobileScrollWidth}px)`,
  );
  const mobilePlacementStats = await boardPlacementStats(page);
  assert.ok(mobilePlacementStats.legal >= 3, "Mobile board should preserve legal placement markers");
  assert.ok(mobilePlacementStats.unavailable >= 10, "Mobile board should preserve unavailable placement markers");
  await screenshot(page, captures, "board-states-legal-unavailable-mobile-390.png");
}

async function createBoardStatesFixture(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const activeSeat = preferredDuneSeat(game);
  const activePlayer = game.players[activeSeat];
  const selectedCard = activePlayer.hand.find((card) => card.name === "Dune, The Desert Planet");
  assert.ok(selectedCard, "Expected active board-states player to have Dune, The Desert Planet");

  const boardSpaceIds = new Set(data.boardSpaces.map((space) => space.id));
  assert.deepEqual(
    [
      ...Object.keys(occupiedSpaces),
      ...Object.keys(spyPosts),
      ...Object.keys(sharedSpyPosts),
      ...Object.keys(locationControl),
      ...Object.keys(makerSpice),
    ].filter((spaceId) => !boardSpaceIds.has(spaceId)),
    [],
    "Board-states fixture should only reference real board spaces",
  );
  const playerIds = new Set(game.players.map((player) => player.id));
  assert.deepEqual(
    [
      ...Object.values(occupiedSpaces),
      ...Object.values(spyPosts),
      ...Object.values(sharedSpyPosts).flat(),
      ...Object.values(locationControl),
    ].filter((playerId) => !playerIds.has(playerId)),
    [],
    "Board-states fixture should only reference real player ids",
  );

  const players = game.players.map((player, index) => {
    const visiblePlayer = {
      ...player,
      vp: vpByPlayerId[player.id] ?? player.vp,
      revealed: false,
    };
    if (index !== activeSeat) return visiblePlayer;
    return {
      ...visiblePlayer,
      agentsReady: Math.max(visiblePlayer.agentsReady, 2),
      agentsTotal: Math.max(visiblePlayer.agentsTotal, 2),
      influence: {
        ...visiblePlayer.influence,
        spacing: Math.max(visiblePlayer.influence.spacing, 2),
        fremen: Math.max(visiblePlayer.influence.fremen, 2),
        fringeWorlds: Math.max(visiblePlayer.influence.fringeWorlds, 2),
      },
      resources: {
        solari: 9,
        spice: 6,
        water: 4,
      },
    };
  });

  return {
    activePlayerName: activePlayer.leader,
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    game: {
      ...game,
      activeSeat,
      agentPlacementOwners: { ...occupiedSpaces },
      agentTurnComplete: false,
      locationControl: { ...locationControl },
      makerSpice: { ...game.makerSpice, ...makerSpice },
      pendingAction: undefined,
      pendingQueue: [],
      phase: "playing",
      players,
      sharedSpyPosts: Object.fromEntries(Object.entries(sharedSpyPosts).map(([spaceId, owners]) => [spaceId, [...owners]])),
      spaces: { ...occupiedSpaces },
      spyPosts: { ...spyPosts },
    },
  };
}

function preferredDuneSeat(game) {
  const preferredSeat = game.players.findIndex((player) =>
    player.id === "p3" && player.hand.some((card) => card.name === "Dune, The Desert Planet")
  );
  if (preferredSeat >= 0) return preferredSeat;
  const fallbackSeat = game.players.findIndex((player) =>
    player.hand.some((card) => card.name === "Dune, The Desert Planet")
  );
  assert.notEqual(fallbackSeat, -1, "Expected at least one player hand to contain Dune, The Desert Planet");
  return fallbackSeat;
}

async function boardMarkerStats(page) {
  return page.evaluate(() => ({
    controlMarkers: document.querySelectorAll(".control-marker").length,
    makerMarkers: document.querySelectorAll(".maker-marker").length,
    occupied: document.querySelectorAll(".space-tile.occupied").length,
    personalOccupied: document.querySelectorAll(".space-tile.personal.occupied").length,
    spyMarkers: document.querySelectorAll(".spy-marker").length,
  }));
}

async function boardPlacementStats(page) {
  return page.evaluate(() => ({
    legal: document.querySelectorAll(".space-tile.legal").length,
    occupiedUnavailable: document.querySelectorAll(".space-tile.occupied.unavailable").length,
    unavailable: document.querySelectorAll(".space-tile.unavailable").length,
    legalStatuses: Array.from(document.querySelectorAll(".space-tile.legal .space-placement-status"))
      .map((status) => status.textContent ?? ""),
    unavailableStatuses: Array.from(document.querySelectorAll(".space-tile.unavailable .space-placement-status"))
      .map((status) => status.textContent ?? ""),
  }));
}
