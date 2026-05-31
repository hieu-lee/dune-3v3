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

  await setDebugGameAndWait(page, states.reinforce);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Military Support - 1 troops/i);
  assert.match(pendingText, /Gurney Halleck/i);
  await screenshot(page, captures, "pending-reinforce.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p3");
  await reinforceTarget(page, "Gurney Halleck").getByRole("button", { name: "Garrison" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p3");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison + 1, "Reinforce garrison choice should add one garrison troop");
  assert.equal(ownerAfter.conflict, ownerBefore.conflict, "Reinforce garrison choice should not add strength");

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
    reinforce: {
      ...base,
      pendingAction: {
        kind: "reinforce",
        team: "muaddib",
        remaining: 1,
        source: "Browser debug reinforce",
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
