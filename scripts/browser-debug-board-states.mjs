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

const agentPlacementOwners = {
  ...occupiedSpaces,
  "high-council": "p1",
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

const influenceByPlayerId = {
  p1: { fremen: 4, fringeWorlds: 2 },
  p2: { greatHouses: 4, spacing: 2 },
  p3: { fremen: 2, fringeWorlds: 4, spacing: 2 },
  p4: { bene: 2, emperor: 4 },
  p5: { bene: 4, greatHouses: 2 },
  p6: { fremen: 2, spacing: 4 },
};

const allianceOwners = {
  bene: "p5",
  emperor: "p4",
  fremen: "p1",
  fringeWorlds: "p3",
  greatHouses: "p2",
  spacing: "p6",
};

const expectedAllianceLabels = {
  bene: "Lady Jessica: 4 Bene Gesserit Influence, holds the Alliance",
  emperor: "Shaddam Corrino IV: 4 Emperor Influence, holds the Alliance",
  fremen: "Muad'Dib: 4 Fremen Influence, holds the Alliance",
  fringeWorlds: "Gurney Halleck: 4 Fringe Worlds Influence, holds the Alliance",
  greatHouses: "Feyd-Rautha Harkonnen: 4 Great Houses Influence, holds the Alliance",
  spacing: "Princess Irulan: 4 Spacing Guild Influence, holds the Alliance",
};

const vpByPlayerId = {
  p1: 4,
  p2: 3,
  p3: 5,
  p4: 4,
  p5: 2,
  p6: 3,
};

const combatByPlayerId = {
  p1: { strength: 4, troops: 2, worms: 0 },
  p2: { strength: 7, troops: 3, worms: 0 },
  p3: { strength: 9, troops: 2, worms: 1 },
  p4: { strength: 6, troops: 1, worms: 1 },
  p5: { strength: 2, troops: 1, worms: 0 },
  p6: { strength: 0, troops: 0, worms: 0 },
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
    agentPlacementOwners,
    allianceOwners,
    influenceByPlayerId,
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
          document.querySelectorAll(".agent-marker").length === occupiedSpaceIds.length &&
          document.querySelectorAll(".spy-marker").length >= 3 &&
          document.querySelectorAll(".control-marker").length >= 3 &&
          document.querySelectorAll(".influence-track").length === 6 &&
          document.querySelectorAll(".influence-track-marker.holds-alliance").length === 6 &&
          document.querySelectorAll(".maker-marker").length >= 4 &&
          document.querySelectorAll(".space-tile.personal.occupied").length >= 2,
      );
    },
    { occupiedSpaceIds: Object.keys(occupiedSpaces) },
  );

  const denseStats = await boardMarkerStats(page);
  const compactStats = await compactBoardStats(page);
  const landsraadText = await page.locator('[data-region-id="landsraad"]').innerText();
  const imperialPrivilegeText = await page.getByTestId("space-imperial-privilege").innerText();
  assert.equal(denseStats.occupied, Object.keys(occupiedSpaces).length, "Dense board state should render all occupied spaces");
  assert.equal(compactStats.scoreRails, 0, "Board should not render the old vertical VP rail");
  assert.equal(compactStats.conflictStrengthTracks, 0, "Board should not render the unused conflict strength number rail");
  assert.equal(compactStats.logOpen, false, "Table log should start collapsed by default");
  assert.equal(compactStats.vpChips, 6, "Each player seat should render a VP chip");
  assert.ok(compactStats.vpChipLabels.some((label) => label.includes("4 VP")), "Seat VP chips should expose player VP values");
  assert.equal(compactStats.imperialPrivilegeDetailVisible, false, "Board location text details should be hidden before hover");
  assert.match(compactStats.imperialPrivilegeOccupancy, /Open|Occupied/, "Board locations should keep only occupancy text visible by default");
  assert.ok(compactStats.imperialPrivilegeArtRatio > 0.72, "Board location art should occupy most of the tile");
  assert.match(landsraadText, /Imperial Privilege/, "Landsraad browser board should render Imperial Privilege");
  assert.doesNotMatch(landsraadText, /Dutiful\s+Service/, "Landsraad browser board should not render the old board-space name");
  assert.match(imperialPrivilegeText, /2\+ EMP\/GH/, "Imperial Privilege should show its mapped Emperor/Great Houses requirement badge");
  assert.match(imperialPrivilegeText, /recall Agent/, "Imperial Privilege should expose the Agent recall badge");
  assert.match(imperialPrivilegeText, /cycle Intrigue/, "Imperial Privilege should expose the Intrigue cycle badge");
  assert.equal(denseStats.agentMarkers, denseStats.occupied, "Occupied spaces should render one visible Agent owner marker each");
  assert.ok(denseStats.agentMarkerLabels.some((label) => label.includes("Feyd-Rautha")), "Agent markers should include occupying leader names");
  assert.match(
    denseStats.highCouncilAgentMarker,
    /Muad'Dib/,
    "Agent markers should prefer the actual Agent owner over the activated Ally occupying owner",
  );
  assert.ok(denseStats.personalOccupied >= 2, "Dense board state should include occupied Commander personal spaces");
  assert.ok(denseStats.spyMarkers >= 3, "Dense board state should include spy markers");
  assert.ok(denseStats.controlMarkers >= 3, "Dense board state should include critical-location control markers");
  assert.equal(denseStats.influenceTracks, 6, "Dense board state should render all board-side influence tracks");
  assert.deepEqual(
    denseStats.influenceFactions,
    ["bene", "emperor", "fremen", "fringeWorlds", "greatHouses", "spacing"],
    "Dense board state should render the four main faction tracks and two Commander personal tracks",
  );
  assert.equal(denseStats.allianceMarkers, 6, "Dense board state should render every held Alliance on its influence track");
  assert.deepEqual(
    denseStats.allianceHolderLabels,
    expectedAllianceLabels,
    "Each influence track should expose the exact public Alliance holder in accessible marker text",
  );
  assert.ok(
    denseStats.influenceTrackLabels.some((label) => label.includes("Great Houses") && label.includes("Feyd-Rautha")),
    "Influence tracks should show live public influence markers",
  );
  assert.ok(
    denseStats.influenceTrackLabels.some((label) => label.includes("Fremen") && label.includes("Muad'Dib")),
    "Commander personal influence tracks should render in the Commander dock",
  );
  assert.ok(denseStats.makerMarkers >= 4, "Dense board state should include all Maker space markers");
  await screenshot(page, captures, "board-states-dense-ready.png");

  await page.getByTestId("space-imperial-privilege").hover();
  await page.waitForFunction(() => {
    const details = document.querySelector('[data-testid="space-imperial-privilege"] .space-hover-details');
    return details && Number.parseFloat(getComputedStyle(details).opacity) > 0.9;
  });
  const hoverStats = await compactBoardStats(page);
  assert.equal(hoverStats.imperialPrivilegeDetailVisible, true, "Board location hover should reveal the full detail text overlay");
  assert.match(
    hoverStats.imperialPrivilegeVisibleDetail,
    /optionally discard an Intrigue for a new one, recall another Agent, and draw a card/,
    "Board location hover should reveal the full Imperial Privilege detail text",
  );
  await screenshot(page, captures, "board-states-hover-location.png");

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
  await page.waitForFunction(
    ({ spaceId }) => {
      const details = document.querySelector(`[data-testid="space-${spaceId}"] .space-hover-details`);
      return details && Number.parseFloat(getComputedStyle(details).opacity) > 0.9;
    },
    { spaceId: selectedUnavailableSpaceId },
  );
  const mobileSelectedStats = await selectedBoardSpaceStats(page, selectedUnavailableSpaceId);
  assert.equal(mobileSelectedStats.detailVisible, true, "Mobile selected board space should reveal its detail overlay");
  assert.equal(mobileSelectedStats.detailClamped, false, "Mobile selected board space detail should not be line-clamped");
  assert.ok(mobileSelectedStats.detailLength > 20, "Mobile selected board space should expose readable detail text");
  await screenshot(page, captures, "board-states-selected-mobile-390.png");
  await screenshot(page, captures, "board-states-legal-unavailable-mobile-390.png");

  await page.setViewportSize({ width: 1440, height: 1100 });
  await setDebugGameAndWait(page, fixture.combatGame);
  await page.waitForFunction(() =>
    Boolean(
      document.querySelectorAll(".conflict-slot").length === 6 &&
        document.querySelectorAll(".conflict-slot:not(.is-empty)").length >= 5 &&
        document.querySelectorAll(".conflict-slot.has-worms").length >= 2 &&
        document.querySelectorAll(".conflict-slot.is-active").length === 1,
    )
  );
  const combatStats = await boardCombatStats(page);
  assert.equal(combatStats.slots, 6, "Combat board should render all six player deployment slots");
  assert.equal(combatStats.activeSlots, 1, "Combat board should highlight one active combatant");
  assert.ok(combatStats.nonEmptySlots >= 5, "Combat board should show deployed players distinctly");
  assert.ok(combatStats.wormSlots >= 2, "Combat board should show sandworm deployment slots");
  assert.equal(combatStats.gurneyStrength, "9", "Combat board should expose Gurney's live strength");
  await screenshot(page, captures, "board-states-combat-deployment.png");

  await page.setViewportSize(mobileViewport);
  const combatMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    combatMobileScrollWidth <= mobileViewport.width,
    `Combat deployment mobile view should not overflow horizontally (${combatMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "board-states-combat-deployment-mobile-390.png");
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
      ...Object.values(agentPlacementOwners),
      ...Object.values(allianceOwners),
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
      influence: {
        ...player.influence,
        ...(influenceByPlayerId[player.id] ?? {}),
      },
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

  const placementGame = {
    ...game,
    activeSeat,
    agentPlacementOwners: { ...agentPlacementOwners },
    agentTurnComplete: false,
    alliances: { ...allianceOwners },
    locationControl: { ...locationControl },
    makerSpice: { ...game.makerSpice, ...makerSpice },
    pendingAction: undefined,
    pendingQueue: [],
    phase: "playing",
    players,
    sharedSpyPosts: Object.fromEntries(Object.entries(sharedSpyPosts).map(([spaceId, owners]) => [spaceId, [...owners]])),
    spaces: { ...occupiedSpaces },
    spyPosts: { ...spyPosts },
  };

  return {
    activePlayerName: activePlayer.leader,
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    game: placementGame,
    combatGame: {
      ...placementGame,
      activeSeat: placementGame.players.findIndex((player) => player.id === "p4"),
      combatPasses: [],
      phase: "combat",
      players: placementGame.players.map((player) => {
        const combat = combatByPlayerId[player.id] ?? { strength: 0, troops: 0, worms: 0 };
        return {
          ...player,
          conflict: combat.strength,
          deployedTroops: combat.troops,
          deployedSandworms: combat.worms,
          garrison: Math.max(0, player.garrison - combat.troops),
        };
      }),
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
    agentMarkerLabels: Array.from(document.querySelectorAll(".agent-marker")).map((marker) => marker.textContent ?? ""),
    agentMarkers: document.querySelectorAll(".agent-marker").length,
    allianceHolderLabels: Object.fromEntries(Array.from(document.querySelectorAll(".influence-track")).map((track) => [
      track.getAttribute("data-faction-id") ?? "",
      track.querySelector(".influence-track-marker.holds-alliance")?.getAttribute("aria-label") ?? "",
    ])),
    allianceMarkers: document.querySelectorAll(".influence-track-marker.holds-alliance").length,
    controlMarkers: document.querySelectorAll(".control-marker").length,
    highCouncilAgentMarker: document.querySelector('[data-testid="space-high-council"] .agent-marker')?.textContent ?? "",
    influenceFactions: Array.from(document.querySelectorAll(".influence-track"))
      .map((track) => track.getAttribute("data-faction-id") ?? "")
      .sort(),
    influenceTrackLabels: Array.from(document.querySelectorAll(".influence-track")).map((track) => track.textContent ?? ""),
    influenceTracks: document.querySelectorAll(".influence-track").length,
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

async function compactBoardStats(page) {
  return page.evaluate(() => {
    const tile = document.querySelector('[data-testid="space-imperial-privilege"]');
    const details = tile?.querySelector(".space-hover-details");
    const art = tile?.querySelector(".space-art");
    const tileRect = tile?.getBoundingClientRect();
    const artRect = art?.getBoundingClientRect();
    const artRatio = tileRect && artRect
      ? (artRect.width * artRect.height) / Math.max(1, tileRect.width * tileRect.height)
      : 0;
    return {
      conflictStrengthTracks: document.querySelectorAll(".conflict-strength-track").length,
      imperialPrivilegeArtRatio: artRatio,
      imperialPrivilegeDetailVisible: details
        ? Number.parseFloat(getComputedStyle(details).opacity) > 0.9
        : false,
      imperialPrivilegeOccupancy: tile?.querySelector(".space-occupancy")?.textContent?.trim() ?? "",
      imperialPrivilegeVisibleDetail: tile?.querySelector(".space-detail")?.textContent?.trim() ?? "",
      logOpen: document.querySelector(".log-panel")?.hasAttribute("open") ?? false,
      scoreRails: document.querySelectorAll(".board-score-rail").length,
      vpChipLabels: Array.from(document.querySelectorAll(".player-card .vp-resource")).map((chip) => chip.textContent?.trim() ?? ""),
      vpChips: document.querySelectorAll(".player-card .vp-resource").length,
    };
  });
}

async function selectedBoardSpaceStats(page, spaceId) {
  return page.evaluate(({ targetSpaceId }) => {
    const tile = document.querySelector(`[data-testid="space-${targetSpaceId}"]`);
    const details = tile?.querySelector(".space-hover-details");
    const detail = tile?.querySelector(".space-detail");
    const detailStyle = detail ? getComputedStyle(detail) : undefined;
    return {
      detailClamped: detailStyle ? detailStyle.webkitLineClamp !== "none" : true,
      detailLength: detail?.textContent?.trim().length ?? 0,
      detailVisible: details ? Number.parseFloat(getComputedStyle(details).opacity) > 0.9 : false,
    };
  }, { targetSpaceId: spaceId });
}

async function boardCombatStats(page) {
  return page.evaluate(() => {
    const gurneySlot = document.querySelector('[data-testid="conflict-slot-p3"]');
    const gurneyStrength = gurneySlot?.querySelector(".conflict-slot-stats span")?.textContent?.trim().replace(/\D+/g, "") ?? "";
    return {
      activeSlots: document.querySelectorAll(".conflict-slot.is-active").length,
      gurneyStrength,
      nonEmptySlots: document.querySelectorAll(".conflict-slot:not(.is-empty)").length,
      slots: document.querySelectorAll(".conflict-slot").length,
      wormSlots: document.querySelectorAll(".conflict-slot.has-worms").length,
    };
  });
}
