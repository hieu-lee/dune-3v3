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
}

async function createSpaceChoiceStates(server, initialPlayableGame) {
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const base = {
    ...game,
    activeSeat: 0,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    shieldWall: true,
  };

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
  };
}
