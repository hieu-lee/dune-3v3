import assert from "node:assert/strict";

export async function runConflictVpSmoke({
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
  const states = await createConflictVpStates(server, initialPlayableGame);
  await writeJson("pending-conflict-vp-states.json", states);

  await setDebugGameAndWait(page, states.resource);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Conflict reward/i);
  assert.match(pendingText, /Spend 2 spice: \+1 VP/i);
  await screenshot(page, captures, "pending-conflict-vp-resource.png");

  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 2 spice: \+1 VP/ }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice - 2, "Resource conversion should spend spice");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Resource conversion should add VP");

  await setDebugGameAndWait(page, states.spy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Conflict reward/i);
  assert.match(pendingText, /Recall 1 more spy/i);
  assert.match(pendingText, /Arrakeen/i);
  await screenshot(page, captures, "pending-conflict-vp-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Arrakeen" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(after.spyPosts.arrakeen, undefined, "Spy conversion should remove the recalled spy post");
  assert.equal(ownerAfter.spies, ownerBefore.spies + 1, "Spy conversion should return the spy to supply");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Spy conversion should add VP");
}

async function createConflictVpStates(server, initialPlayableGame) {
  const game = initialPlayableGame(await server.ssrLoadModule("/src/game/state.ts"));
  const base = {
    ...game,
    activeSeat: 1,
    conflict: null,
    phase: "playing",
    pendingQueue: [],
    players: game.players.map((player) => ({ ...player, conflict: 0 })),
  };

  return {
    resource: {
      ...base,
      players: base.players.map((player) =>
        player.id === "p2"
          ? { ...player, resources: { ...player.resources, spice: 3 } }
          : player,
      ),
      pendingAction: {
        kind: "conflict-vp-conversion",
        ownerId: "p2",
        source: "Browser debug conflict",
        remaining: 1,
        vp: 1,
        cost: { kind: "resource", resource: "spice", amount: 2 },
      },
    },
    spy: {
      ...base,
      spyPosts: { ...game.spyPosts, arrakeen: "p2" },
      players: base.players.map((player) =>
        player.id === "p2"
          ? { ...player, spies: Math.max(0, player.spies - 1) }
          : player,
      ),
      pendingAction: {
        kind: "conflict-vp-conversion",
        ownerId: "p2",
        source: "Browser debug conflict",
        remaining: 1,
        vp: 1,
        cost: { kind: "recall-spies", count: 1, recalled: 0 },
      },
    },
  };
}
