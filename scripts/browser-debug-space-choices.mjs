import assert from "node:assert/strict";

export async function runSpaceChoicesSmoke({
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
}) {
  await openApp(page, url, 1440, 1100);
  const states = await createSpaceChoiceStates(server, initialPlayableGame);
  await writeJson("pending-space-choice-states.json", states);

  await setDebugGameAndWait(page, states.maker);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Maker space/i);
  assert.match(pendingText, /spice \/ Gurney Halleck worms/i);
  await screenshot(page, captures, "pending-maker-choice.png");
  const makerChoiceMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(makerChoiceMobileViewport);
  const makerChoiceMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert(
    makerChoiceMobileScrollWidth <= makerChoiceMobileViewport.width,
    `Maker choice mobile pending panel should not overflow horizontally (${makerChoiceMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-maker-choice-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  const makerBefore = await currentGame(page);
  const makerSpiceOwnerBefore = makerBefore.players.find((player) => player.id === "p1");
  await page.locator(".pending-panel").getByRole("button", { name: /\+2 spice/ }).click();
  await waitForNoPending(page);
  const makerAfter = await currentGame(page);
  const makerSpiceOwnerAfter = makerAfter.players.find((player) => player.id === "p1");
  assert.equal(makerSpiceOwnerAfter.resources.spice, makerSpiceOwnerBefore.resources.spice + 2, "Maker spice choice should pay the spice owner");

  await setDebugGameAndWait(page, states.sietchTabr);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Sietch Tabr/i);
  assert.match(pendingText, /water \/ Gurney Halleck units/i);
  await screenshot(page, captures, "pending-sietch-tabr.png");

  const sietchBefore = await currentGame(page);
  const sietchWaterOwnerBefore = sietchBefore.players.find((player) => player.id === "p1");
  await page.locator(".pending-panel").getByRole("button", { name: /Water \+ remove Shield Wall/ }).click();
  await waitForNoPending(page);
  const sietchAfter = await currentGame(page);
  const sietchWaterOwnerAfter = sietchAfter.players.find((player) => player.id === "p1");
  assert.equal(sietchAfter.shieldWall, false, "Sietch Tabr shield-wall choice should remove the Shield Wall");
  assert.equal(sietchWaterOwnerAfter.resources.water, sietchWaterOwnerBefore.resources.water + 1, "Sietch Tabr should pay water to the water owner");

  await setDebugGameAndWait(page, states.resourceSplit);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Muad'Dib Browser debug split/i);
  assert.match(pendingText, /Muad'Dib \/ Gurney Halleck/i);
  await screenshot(page, captures, "pending-resource-split.png");

  const splitBefore = await currentGame(page);
  const commanderBefore = splitBefore.players.find((player) => player.id === "p1");
  const allyBefore = splitBefore.players.find((player) => player.id === "p3");
  await page.locator(".pending-panel").getByRole("button", { name: /Commander spice \/ Ally water/ }).click();
  await waitForNoPending(page);
  const splitAfter = await currentGame(page);
  const commanderAfter = splitAfter.players.find((player) => player.id === "p1");
  const allyAfter = splitAfter.players.find((player) => player.id === "p3");
  assert.equal(commanderAfter.resources.spice, commanderBefore.resources.spice + 1, "Resource split should pay the commander");
  assert.equal(allyAfter.resources.water, allyBefore.resources.water + 1, "Resource split should pay the ally");

  await setDebugGameAndWait(page, states.usulResourceSplit);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Muad'Dib Usul/i);
  assert.match(pendingText, /Muad'Dib \/ Gurney Halleck/i);
  await screenshot(page, captures, "pending-usul-resource-split.png");

  const usulBefore = await currentGame(page);
  const usulCommanderBefore = usulBefore.players.find((player) => player.id === "p1");
  const usulAllyBefore = usulBefore.players.find((player) => player.id === "p3");
  await page.locator(".pending-panel").getByRole("button", { name: /Commander water \/ Ally spice/ }).click();
  await waitForNoPending(page);
  const usulAfter = await currentGame(page);
  const usulCommanderAfter = usulAfter.players.find((player) => player.id === "p1");
  const usulAllyAfter = usulAfter.players.find((player) => player.id === "p3");
  assert.equal(usulCommanderAfter.resources.water, usulCommanderBefore.resources.water + 1, "Usul should pay Commander water through card rules");
  assert.equal(usulAllyAfter.resources.spice, usulAllyBefore.resources.spice + 1, "Usul should pay activated Ally spice through card rules");

  await setDebugGameAndWait(page, states.optionalSpacePayment);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Gather Support/i);
  assert.match(pendingText, /optional payment/i);
  await screenshot(page, captures, "pending-optional-space-payment.png");

  const optionalBefore = await currentGame(page);
  const optionalOwnerBefore = optionalBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Pay 2 solari/i }).click();
  await waitForNoPending(page);
  const optionalAfter = await currentGame(page);
  const optionalOwnerAfter = optionalAfter.players.find((player) => player.id === "p2");
  assert.equal(optionalOwnerAfter.resources.solari, optionalOwnerBefore.resources.solari - 2, "Optional space payment should spend Solari");
  assert.equal(optionalOwnerAfter.resources.water, optionalOwnerBefore.resources.water + 1, "Optional space payment should grant water");

  await setDebugGameAndWait(page, states.boardInfluenceChoice);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Shipping Influence/i);
  assert.match(pendingText, /Shaddam Corrino IV/i);
  await screenshot(page, captures, "pending-board-influence-choice.png");

  const influenceBefore = await currentGame(page);
  const shaddamBefore = influenceBefore.players.find((player) => player.id === "p4");
  await page.locator(".pending-panel").getByRole("button", { name: /Shaddam Corrino IV/i }).click();
  await waitForNoPending(page);
  const influenceAfter = await currentGame(page);
  const shaddamAfter = influenceAfter.players.find((player) => player.id === "p4");
  assert.equal(shaddamAfter.influence.emperor, shaddamBefore.influence.emperor + 1, "Board influence choice should apply to the selected owner and track");
}

async function createSpaceChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const usul = data.muadDibCommanderCards.find((card) => card.name === "Usul");
  assert.ok(usul, "Expected Usul for declarative resource-split browser debug state");
  const base = {
    ...game,
    activeSeat: 0,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    shieldWall: true,
  };
  const usulCard = cloneCard(usul);
  const usulPlayers = game.players.map((player) => {
    if (player.id === "p1") return { ...player, hand: [], playArea: [usulCard], resources: { solari: 0, spice: 0, water: 0 } };
    if (player.id === "p3") return { ...player, resources: { solari: 0, spice: 0, water: 0 } };
    return player;
  });
  const usulState = {
    ...base,
    players: usulPlayers,
  };
  const usulCommander = usulPlayers.find((player) => player.id === "p1");
  const usulAlly = usulPlayers.find((player) => player.id === "p3");
  assert.ok(usulCommander && usulAlly, "Expected Muad'Dib and Gurney for declarative resource-split browser debug state");
  const usulPending = state.pendingActionForCard(usulCard, usulCommander, usulState, usulAlly);
  assert.deepEqual(
    usulPending,
    {
      kind: "commander-resource-split",
      commanderId: "p1",
      allyId: "p3",
      team: "muaddib",
      source: "Usul",
      options: [
        { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
        { commanderResource: "spice", commanderAmount: 1, allyResource: "water", allyAmount: 1 },
      ],
    },
    "Usul should create the browser debug resource-split pending action through card rules",
  );

  return {
    maker: {
      ...base,
      players: game.players.map((player) => (player.id === "p3" ? { ...player, makerHooks: true } : player)),
      shieldWall: false,
      pendingAction: {
        kind: "maker-choice",
        ownerId: "p3",
        spiceOwnerId: "p1",
        spice: 2,
        sandworms: 1,
        canSummonSandworms: true,
        source: "Browser debug Maker",
        spaceId: "imperial-basin",
      },
    },
    sietchTabr: {
      ...base,
      pendingAction: {
        kind: "sietch-tabr",
        ownerId: "p3",
        waterOwnerId: "p1",
        canTakeMakerHooks: true,
        canRemoveShieldWall: true,
        source: "Browser debug Sietch Tabr",
        spaceId: "sietch-tabr",
        conflictBlocked: true,
      },
    },
    resourceSplit: {
      ...base,
      pendingAction: {
        kind: "commander-resource-split",
        commanderId: "p1",
        allyId: "p3",
        team: "muaddib",
        source: "Browser debug split",
        options: [{ commanderResource: "spice", commanderAmount: 1, allyResource: "water", allyAmount: 1 }],
      },
    },
    usulResourceSplit: {
      ...usulState,
      pendingAction: usulPending,
    },
    optionalSpacePayment: {
      ...base,
      players: game.players.map((player) =>
        player.id === "p2" ? { ...player, resources: { ...player.resources, solari: 3, water: 1 } } : player,
      ),
      pendingAction: {
        kind: "optional-space-payment",
        ownerId: "p2",
        source: "Gather Support",
        cost: { solari: 2 },
        gain: { water: 1 },
      },
    },
    boardInfluenceChoice: {
      ...base,
      activeSeat: game.players.findIndex((player) => player.id === "p4"),
      spaces: { ...base.spaces, shipping: "p2" },
      pendingAction: {
        kind: "board-influence-choice",
        source: "Shipping",
        spaceId: "shipping",
        choices: [
          { ownerId: "p4", faction: "emperor" },
          { ownerId: "p2", faction: "greatHouses" },
          { ownerId: "p2", faction: "spacing" },
          { ownerId: "p2", faction: "bene" },
          { ownerId: "p2", faction: "fringeWorlds" },
        ],
      },
    },
  };
}

function cloneCard(card) {
  return { ...card, traits: card.traits ? [...card.traits] : undefined };
}
