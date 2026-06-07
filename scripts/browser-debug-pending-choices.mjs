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
  assert.equal(await page.locator(".board-panel .spy-network-slot").count(), 19, "Board should render all spy post slots");
  assert.equal(await page.locator(".board-panel .spy-network-lines line").count(), 30, "Board should render spy post connection edges");
  assert.equal(await page.locator(".board-panel .spy-network-slot.is-legal").count(), 2, "Recall spy pending should make owned board slots actionable");
  await screenshot(page, captures, "pending-recall-spy.png");

  const recallBefore = await currentGame(page);
  const recallOwnerBefore = recallBefore.players.find((player) => player.id === "p2");
  const arrakeenRecallSlot = page.locator('.board-panel .spy-network-slot.is-legal[data-spy-space-id="arrakeen"]');
  assert.equal(await arrakeenRecallSlot.count(), 1, "Arrakeen board spy slot should be actionable for recall");
  await arrakeenRecallSlot.click();
  await waitForNoPending(page);
  const recallAfter = await currentGame(page);
  const recallOwnerAfter = recallAfter.players.find((player) => player.id === "p2");
  assert.equal(recallAfter.spyPosts.arrakeen, undefined, "Recall spy should remove the selected spy post");
  assert.equal(recallOwnerAfter.spies, recallOwnerBefore.spies + 1, "Recall spy should return one spy to supply");
  assert.equal(recallOwnerAfter.conflict, recallOwnerBefore.conflict + 2, "Recall spy should add pending strength");

  await setDebugGameAndWait(page, pendingChoiceStates.placeSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Spy placement/i);
  assert.match(pendingText, /linked locations/i);
  const firstCoverageText = await page.locator(".pending-panel .spy-choice-coverage").first().innerText();
  assert.match(firstCoverageText, /Military Support/i);
  assert.match(firstCoverageText, /Economic Support/i);
  assert.equal(await page.locator(".board-panel .spy-network-slot").count(), 19, "Board should render all spy post slots during placement");
  assert.equal(await page.locator(".board-panel .spy-network-slot.is-legal").count(), 15, "Spy placement should make every legal Ally board slot actionable");
  await screenshot(page, captures, "pending-place-spy.png");
  const spyPlacementMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(spyPlacementMobileViewport);
  const spyPlacementMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert(
    spyPlacementMobileScrollWidth <= spyPlacementMobileViewport.width,
    `Spy placement mobile pending panel should not overflow horizontally (${spyPlacementMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-place-spy-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  await setDebugGameAndWait(page, pendingChoiceStates.placeSpy);
  const boardSpyBefore = await currentGame(page);
  const boardSpyOwnerBefore = boardSpyBefore.players.find((player) => player.id === "p2");
  const researchStationSpySlot = page.locator('.board-panel .spy-network-slot.is-legal[data-spy-space-id="research-station"]');
  assert.equal(await researchStationSpySlot.count(), 1, "Research Station / Spice Refinery board spy slot should be actionable");
  await researchStationSpySlot.click();
  await waitForNoPending(page);
  const boardSpyAfter = await currentGame(page);
  const boardSpyOwnerAfter = boardSpyAfter.players.find((player) => player.id === "p2");
  assert.equal(
    boardSpyAfter.spyPosts["research-station-spice-refinery"],
    "p2",
    "Clicking a board spy slot should place the spy on that observation post",
  );
  assert.equal(boardSpyOwnerAfter.spies, boardSpyOwnerBefore.spies - 1, "Board spy placement should spend one supply spy");

  await setDebugGameAndWait(page, pendingChoiceStates.loseInfluence);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /influence choice/i);
  assert.match(pendingText, /lose 1 Influence/i);
  await screenshot(page, captures, "pending-lose-influence.png");
  const influenceLossMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(influenceLossMobileViewport);
  const influenceLossMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert(
    influenceLossMobileScrollWidth <= influenceLossMobileViewport.width,
    `Influence loss mobile pending panel should not overflow horizontally (${influenceLossMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-lose-influence-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

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

  await setDebugGameAndWait(page, pendingChoiceStates.conflictInfluence);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Conflict Influence/i);
  assert.match(pendingText, /Skirmish \(Crysknife\)/i);
  await screenshot(page, captures, "pending-conflict-influence.png");

  const conflictInfluenceBefore = await currentGame(page);
  const conflictInfluenceOwnerBefore = conflictInfluenceBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Bene Gesserit/ }).click();
  await waitForNoPending(page);
  const conflictInfluenceAfter = await currentGame(page);
  const conflictInfluenceOwnerAfter = conflictInfluenceAfter.players.find((player) => player.id === "p2");
  assert.equal(
    conflictInfluenceOwnerAfter.influence.bene,
    conflictInfluenceOwnerBefore.influence.bene + 1,
    "Conflict Influence choice should gain the selected Influence",
  );

  await setDebugGameAndWait(page, pendingChoiceStates.fixedConflictInfluence);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Propaganda/i);
  assert.match(pendingText, /Emperor/i);
  assert.match(pendingText, /Fremen/i);
  assert.doesNotMatch(pendingText, /Great Houses/i);
  await screenshot(page, captures, "pending-conflict-influence-fixed.png");

  await page.locator(".pending-panel").getByRole("button", { name: /Emperor/ }).click();
  const fixedOnce = await currentGame(page);
  assert.equal(fixedOnce.pendingAction?.kind, "conflict-influence");
  assert.equal(fixedOnce.pendingAction?.remaining, 1);
  assert.deepEqual(fixedOnce.pendingAction?.choices, ["spacing", "bene", "fremen"]);
  await page.locator(".pending-panel").getByRole("button", { name: /Fremen/ }).click();
  await waitForNoPending(page);
  const fixedAfter = await currentGame(page);
  const fixedOwnerAfter = fixedAfter.players.find((player) => player.id === "p2");
  assert.equal(fixedOwnerAfter.influence.emperor, 2);
  assert.equal(fixedOwnerAfter.influence.fremen, 1);
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
    placeSpy: {
      ...base,
      spyPosts: {},
      sharedSpyPosts: {},
      players: base.players.map((player) =>
        player.id === ownerId ? { ...player, spies: Math.max(2, player.spies) } : player
      ),
      pendingAction: {
        kind: "spy",
        ownerId,
        remaining: 1,
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
    conflictInfluence: {
      ...base,
      phase: "playing",
      conflict: null,
      pendingAction: {
        kind: "conflict-influence",
        ownerId,
        remaining: 1,
        source: "Skirmish (Crysknife)",
      },
    },
    fixedConflictInfluence: {
      ...base,
      phase: "playing",
      conflict: null,
      pendingAction: {
        kind: "conflict-influence",
        ownerId,
        remaining: 2,
        source: "Propaganda",
        choices: ["emperor", "spacing", "bene", "fremen"],
      },
    },
  };
}
