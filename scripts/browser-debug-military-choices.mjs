import assert from "node:assert/strict";

export async function runMilitaryChoicesSmoke({
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
  const states = await createMilitaryChoiceStates(server, initialPlayableGame);
  await writeJson("pending-military-choice-states.json", states);

  await setDebugGameAndWait(page, states.deploy);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /deployment/i);
  assert.match(pendingText, /1 deployable/i);
  await screenshot(page, captures, "pending-deploy.png");

  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p3");
  await page.locator(".pending-panel").getByRole("button", { name: "Deploy 1" }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p3");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison - 1, "Deploy choice should spend one garrison troop");
  assert.equal(ownerAfter.deployedTroops, ownerBefore.deployedTroops + 1, "Deploy choice should add one deployed troop");
  assert.equal(ownerAfter.conflict, ownerBefore.conflict + 2, "Deploy choice should add troop strength");

  await setDebugGameAndWait(page, states.militarySupportDeploy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Gurney Halleck deployment/i);
  assert.match(pendingText, /deployment/i);
  assert.match(pendingText, /3 deployable/i);
  await screenshot(page, captures, "pending-reinforce.png");
  const reinforceMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(reinforceMobileViewport);
  const reinforceMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert(
    reinforceMobileScrollWidth <= reinforceMobileViewport.width,
    `Reinforce mobile pending panel should not overflow horizontally (${reinforceMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-reinforce-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p3");
  for (let index = 0; index < 3; index += 1) {
    await page.locator(".pending-panel").getByRole("button", { name: "Deploy 1" }).click();
  }
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p3");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison - 3, "Military Support deploy choice should spend three garrison troops");
  assert.equal(ownerAfter.deployedTroops, ownerBefore.deployedTroops + 3, "Military Support deploy choice should deploy three troops");
  assert.equal(ownerAfter.conflict, ownerBefore.conflict + 6, "Military Support deploy choice should add troop strength");

  await setDebugGameAndWait(page, states.reinforceBlocked);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Conflict deployment is blocked this turn/i);
  await screenshot(page, captures, "pending-reinforce-blocked.png");

  const blockedTarget = reinforceTarget(page, "Gurney Halleck");
  assert.equal(
    await blockedTarget.getByRole("button", { name: "Conflict" }).isDisabled(),
    true,
    "Blocked reinforce should disable the Conflict button",
  );
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p3");
  await blockedTarget.getByRole("button", { name: "Garrison" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p3");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison + 1, "Blocked reinforce should still allow garrison");
  assert.equal(ownerAfter.conflict, ownerBefore.conflict, "Blocked reinforce garrison should not add strength");
}

async function createMilitaryChoiceStates(server, initialPlayableGame) {
  const game = initialPlayableGame(await server.ssrLoadModule("/src/game/state.ts"));
  const activeSeat = game.players.findIndex((player) => player.id === "p3");
  assert.ok(activeSeat >= 0, "Expected p3 in browser debug game");

  const base = {
    ...game,
    activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => ({
      ...player,
      conflict: 0,
      deployedTroops: 0,
    })),
  };

  return {
    deploy: {
      ...base,
      players: base.players.map((player) =>
        player.id === "p3" ? { ...player, garrison: 2 } : player,
      ),
      pendingAction: {
        kind: "deploy",
        ownerId: "p3",
        remaining: 1,
        source: "Browser debug deploy",
      },
    },
    militarySupportDeploy: {
      ...base,
      players: base.players.map((player) =>
        player.id === "p3" ? { ...player, garrison: 3 } : player,
      ),
      pendingAction: {
        kind: "deploy",
        ownerId: "p3",
        remaining: 3,
        source: "Military Support",
      },
    },
    reinforceBlocked: {
      ...base,
      pendingAction: {
        kind: "reinforce",
        team: "muaddib",
        remaining: 1,
        source: "Browser debug blocked reinforce",
        conflictBlocked: true,
      },
    },
  };
}

function reinforceTarget(page, leaderName) {
  return page.locator(".pending-panel .support-target").filter({ hasText: leaderName });
}
