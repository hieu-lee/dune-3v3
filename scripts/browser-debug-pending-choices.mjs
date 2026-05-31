import assert from "node:assert/strict";

export async function runPendingChoicesSmoke({
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
  const pendingChoiceStates = await createPendingChoiceStates(server, initialPlayableGame);
  await writeJson("pending-choice-states.json", pendingChoiceStates);

  await setDebugGameAndWait(page, pendingChoiceStates.recallSpy);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /recall spy/i);
  assert.match(pendingText, /Arrakeen/i);
  assert.match(pendingText, /Imperial Basin/i);
  await screenshot(page, captures, "pending-recall-spy.png");

  const recallBefore = await currentGame(page);
  const recallOwnerBefore = recallBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Arrakeen" }).click();
  await waitForNoPending(page);
  const recallAfter = await currentGame(page);
  const recallOwnerAfter = recallAfter.players.find((player) => player.id === "p2");
  assert.equal(recallAfter.spyPosts.arrakeen, undefined, "Recall spy should remove the selected spy post");
  assert.equal(recallOwnerAfter.spies, recallOwnerBefore.spies + 1, "Recall spy should return one spy to supply");
  assert.equal(recallOwnerAfter.conflict, recallOwnerBefore.conflict + 2, "Recall spy should add pending strength");

  await setDebugGameAndWait(page, pendingChoiceStates.loseInfluence);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /influence choice/i);
  assert.match(pendingText, /lose 1 Influence/i);
  await screenshot(page, captures, "pending-lose-influence.png");

  const influenceBefore = await currentGame(page);
  const influenceOwnerBefore = influenceBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Emperor/ }).click();
  await waitForNoPending(page);
  const influenceAfter = await currentGame(page);
  const influenceOwnerAfter = influenceAfter.players.find((player) => player.id === "p2");
  assert.equal(
    influenceOwnerAfter.influence.emperor,
    influenceOwnerBefore.influence.emperor - 1,
    "Influence choice should spend the selected Influence",
  );
  assert.equal(influenceOwnerAfter.conflict, influenceOwnerBefore.conflict + 2, "Influence choice should add pending strength");
}

async function createPendingChoiceStates(server, initialPlayableGame) {
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const ownerId = "p2";
  const base = {
    ...game,
    phase: "combat",
    activeSeat: 1,
    pendingAction: undefined,
    pendingQueue: [],
    spyPosts: { ...game.spyPosts, arrakeen: ownerId, "imperial-basin": ownerId },
    players: game.players.map((player) => {
      if (player.id !== ownerId) return { ...player, conflict: 0 };
      return {
        ...player,
        conflict: 0,
        spies: Math.max(0, player.spies - 2),
        influence: { ...player.influence, emperor: 1, spacing: 1, bene: 1, greatHouses: 1 },
      };
    }),
  };

  return {
    recallSpy: {
      ...base,
      pendingAction: {
        kind: "recall-spy",
        ownerId,
        combatRecipientId: ownerId,
        remaining: 1,
        strength: 2,
        source: "Browser debug",
        optional: true,
      },
    },
    loseInfluence: {
      ...base,
      pendingAction: {
        kind: "lose-influence",
        ownerId,
        combatRecipientId: ownerId,
        strength: 2,
        source: "Browser debug",
        optional: true,
      },
    },
  };
}
