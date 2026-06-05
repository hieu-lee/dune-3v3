import assert from "node:assert/strict";
import { createTableChoiceStates } from "./browser-debug-table-choice-states.mjs";

export async function runTableChoicesSmoke({
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
  const states = await createTableChoiceStates(server, initialPlayableGame);
  await writeJson("pending-table-choice-states.json", states);

  await setDebugGameAndWait(page, states.retreatTroopsForStrength);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Browser debug retreat/i);
  assert.match(pendingText, /Retreat 2: \+4/i);
  await screenshot(page, captures, "pending-retreat-troops-strength.png");

  const retreatBefore = await currentGame(page);
  const retreatOwnerBefore = retreatBefore.players.find((player) => player.id === "p2");
  assert.ok(retreatOwnerBefore, "Expected Feyd before troop retreat");
  await page.locator(".pending-panel").getByRole("button", { name: /Retreat 2: \+4/i }).click();
  await waitForNoPending(page);
  const retreatAfter = await currentGame(page);
  const retreatOwnerAfter = retreatAfter.players.find((player) => player.id === "p2");
  assert.ok(retreatOwnerAfter, "Expected Feyd after troop retreat");
  assert.equal(retreatOwnerAfter.deployedTroops, retreatOwnerBefore.deployedTroops - 2);
  assert.equal(retreatOwnerAfter.garrison, retreatOwnerBefore.garrison + 2);
  assert.equal(retreatOwnerAfter.conflict, retreatOwnerBefore.conflict);

  await setDebugGameAndWait(page, states.chaniFremenBondReveal);
  await screenshot(page, captures, "chani-fremen-bond-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player?.revealed &&
        player.persuasion === 2 &&
        !game.pendingAction &&
        game.pendingQueue.length === 0,
    );
  });
  const chaniBondAfter = await currentGame(page);
  const chaniBondPlayer = chaniBondAfter.players.find((player) => player.id === "p2");
  assert.ok(chaniBondPlayer, "Expected Feyd after Chani Fremen Bond reveal");
  assert.equal(chaniBondPlayer.persuasion, 2, "Chani should gain automated Fremen Bond persuasion in the browser flow");
  assert.equal(chaniBondAfter.pendingAction, undefined, "Chani Fremen Bond should not create a manual reveal pending action");
  await screenshot(page, captures, "chani-fremen-bond-after-reveal.png");

  await setDebugGameAndWait(page, states.unswervingLoyaltyRevealDeployOrRetreat);
  await screenshot(page, captures, "unswerving-loyalty-reveal-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    return game?.pendingAction?.kind === "deploy-or-retreat-troops" &&
      game.pendingAction.source === "Unswerving Loyalty";
  });
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Unswerving Loyalty/i);
  assert.match(pendingText, /Deploy 1/i);
  assert.match(pendingText, /Retreat 1/i);
  await screenshot(page, captures, "pending-unswerving-loyalty-deploy-or-retreat.png");
  const unswervingMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(unswervingMobileViewport);
  const unswervingMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    unswervingMobileScrollWidth <= unswervingMobileViewport.width,
    `Unswerving Loyalty deploy-or-retreat mobile pending panel should not overflow horizontally (${unswervingMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-unswerving-loyalty-deploy-or-retreat-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  const unswervingBefore = await currentGame(page);
  const unswervingOwnerBefore = unswervingBefore.players.find((player) => player.id === "p2");
  assert.ok(unswervingOwnerBefore, "Expected Feyd before Unswerving deploy-or-retreat");
  assert.equal(unswervingOwnerBefore.persuasion, 1, "Unswerving should grant its typed reveal persuasion");
  assert.equal(unswervingOwnerBefore.garrison, 1, "Unswerving should recruit before offering the deploy-or-retreat choice");
  await page.locator(".pending-panel").getByRole("button", { name: /Retreat 1/i }).click();
  await waitForNoPending(page);
  const unswervingAfter = await currentGame(page);
  const unswervingOwnerAfter = unswervingAfter.players.find((player) => player.id === "p2");
  assert.ok(unswervingOwnerAfter, "Expected Feyd after Unswerving retreat");
  assert.equal(unswervingOwnerAfter.deployedTroops, unswervingOwnerBefore.deployedTroops - 1);
  assert.equal(unswervingOwnerAfter.garrison, unswervingOwnerBefore.garrison + 1);
  assert.equal(unswervingOwnerAfter.conflict, unswervingOwnerBefore.conflict - 2);
  await screenshot(page, captures, "unswerving-loyalty-after-retreat.png");

  await setDebugGameAndWait(page, states.paracompassReveal);
  await screenshot(page, captures, "paracompass-reveal-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player?.revealed &&
        player.persuasion === 5 &&
        !game.pendingAction &&
        game.pendingQueue.length === 0,
    );
  });
  const paracompassRevealAfter = await currentGame(page);
  const paracompassRevealPlayer = paracompassRevealAfter.players.find((player) => player.id === "p2");
  assert.ok(paracompassRevealPlayer, "Expected Feyd after Paracompass reveal");
  assert.equal(
    paracompassRevealPlayer.persuasion,
    5,
    "Paracompass should add 3 persuasion on top of the High Council reveal bonus in the browser flow",
  );
  assert.equal(paracompassRevealAfter.pendingAction, undefined, "Paracompass should not create a manual reveal pending action");
  await screenshot(page, captures, "paracompass-reveal-after.png");

  await setDebugGameAndWait(page, states.wheelsWithinWheelsRevealSpy);
  await screenshot(page, captures, "wheels-within-wheels-reveal-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "spy");
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Wheels Within Wheels/i);
  assert.match(pendingText, /spy placement/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  await screenshot(page, captures, "pending-wheels-within-wheels-reveal-spy.png");
  const wheelsSpyMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(wheelsSpyMobileViewport);
  const wheelsSpyMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    wheelsSpyMobileScrollWidth <= wheelsSpyMobileViewport.width,
    `Wheels Within Wheels spy placement mobile pending panel should not overflow horizontally (${wheelsSpyMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-wheels-within-wheels-reveal-spy-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  const wheelsBefore = await currentGame(page);
  const wheelsOwnerBefore = wheelsBefore.players.find((player) => player.id === "p2");
  assert.ok(wheelsOwnerBefore, "Expected Feyd before Wheels Within Wheels reveal spy placement");
  await page.locator(".pending-panel").getByRole("button", { name: states.wheelsRevealSpySpaceName }).click();
  await waitForNoPending(page);
  const wheelsAfter = await currentGame(page);
  const wheelsOwnerAfter = wheelsAfter.players.find((player) => player.id === "p2");
  assert.ok(wheelsOwnerAfter, "Expected Feyd after Wheels Within Wheels reveal spy placement");
  assert.equal(wheelsAfter.spyPosts[states.wheelsRevealSpyPostId], "p2", "Wheels Within Wheels should place the chosen reveal spy");
  assert.equal(wheelsOwnerAfter.spies, wheelsOwnerBefore.spies - 1, "Wheels Within Wheels should spend one spy");
  assert.equal(wheelsOwnerAfter.persuasion, 1, "Wheels Within Wheels should keep its typed reveal persuasion after spy placement");

  await setDebugGameAndWait(page, states.spyNetworkRevealRecall);
  await screenshot(page, captures, "spy-network-reveal-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "recall-spy");
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Spy Network/i);
  assert.match(pendingText, /draw 1 Intrigue card/i);
  await screenshot(page, captures, "pending-spy-network-reveal-recall.png");
  const spyNetworkBefore = await currentGame(page);
  const spyNetworkOwnerBefore = spyNetworkBefore.players.find((player) => player.id === "p2");
  assert.ok(spyNetworkOwnerBefore, "Expected Feyd before Spy Network reveal recall");
  await page.locator(".pending-panel").getByRole("button", { name: states.spyNetworkRecallSpaceName }).click();
  await waitForNoPending(page);
  const spyNetworkAfter = await currentGame(page);
  const spyNetworkOwnerAfter = spyNetworkAfter.players.find((player) => player.id === "p2");
  assert.ok(spyNetworkOwnerAfter, "Expected Feyd after Spy Network reveal recall");
  assert.equal(spyNetworkAfter.spyPosts[states.spyNetworkRecallPostId], undefined, "Spy Network should remove the recalled spy post");
  assert.equal(spyNetworkOwnerAfter.spies, spyNetworkOwnerBefore.spies + 1, "Spy Network should return the recalled spy");
  assert.equal(spyNetworkOwnerAfter.intrigues.at(-1)?.name, states.spyNetworkRewardIntrigueName, "Spy Network should draw one Intrigue");
  assert.equal(spyNetworkOwnerAfter.persuasion, 2, "Spy Network should keep its typed reveal persuasion after recall");
  assert.equal(spyNetworkAfter.turnSpyRecalls.p2, (spyNetworkBefore.turnSpyRecalls.p2 ?? 0) + 1);
  await screenshot(page, captures, "spy-network-after-recall.png");

  await setDebugGameAndWait(page, states.calculusTrashReveal);
  await screenshot(page, captures, "calculus-trash-ready.png");
  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "trash-card");
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Calculus of Power/i);
  assert.match(pendingText, new RegExp(escapeRegExp(states.calculusTrashTargetName)));
  await screenshot(page, captures, "pending-calculus-trash.png");
  const calculusBefore = await currentGame(page);
  const calculusOwnerBefore = calculusBefore.players.find((player) => player.id === "p2");
  assert.ok(calculusOwnerBefore, "Expected Feyd before Calculus trash");
  await page.locator(".pending-panel").getByRole("button", { name: states.calculusTrashTargetName }).click();
  await waitForNoPending(page);
  const calculusAfter = await currentGame(page);
  const calculusOwnerAfter = calculusAfter.players.find((player) => player.id === "p2");
  assert.ok(calculusOwnerAfter, "Expected Feyd after Calculus trash");
  assert.equal(calculusOwnerAfter.conflict, calculusOwnerBefore.conflict + 3, "Calculus trash should add 3 strength");
  assert.equal(
    calculusOwnerAfter.playArea.some((card) => card.id === states.calculusTrashTargetId),
    false,
    "Calculus should trash the selected Emperor card",
  );

  await setDebugGameAndWait(page, states.inspireAweAlly);
  await waitForActiveIntrigue(page, "Inspire Awe");
  const allyInspireAweCard = page.locator(".intrigue-card").filter({ hasText: "Inspire Awe" });
  const allyInspireAweButton = allyInspireAweCard.getByRole("button", { name: /Acquire <=3/ });
  assert.equal(await allyInspireAweButton.count(), 1, "Expected one Ally Inspire Awe acquisition button");
  assert.equal(await allyInspireAweButton.isEnabled(), true, "Ally Inspire Awe should be playable");
  await screenshot(page, captures, "inspire-awe-ally-ready.png");

  await allyInspireAweButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    return game?.pendingAction?.kind === "acquire-card" &&
      game.pendingAction.source === "Inspire Awe" &&
      game.pendingAction.destination === "discard";
  });
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Inspire Awe/i);
  await assertPendingButtonNamed(page, states.inspireAweAcquireCardName, "Ally Inspire Awe should expose its acquisition card");
  await screenshot(page, captures, "pending-inspire-awe-ally-acquire.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.inspireAweAcquireCardName }).click();
  await waitForNoPending(page);
  const allyInspireAweAfter = await currentGame(page);
  const allyInspireAweOwnerAfter = allyInspireAweAfter.players.find((player) => player.id === "p2");
  assert.ok(allyInspireAweOwnerAfter, "Expected Feyd after Ally Inspire Awe");
  assert.equal(
    allyInspireAweOwnerAfter.discard.at(-1)?.id,
    states.inspireAweAcquireCardId,
    "Ally Inspire Awe should acquire the selected card to discard",
  );
  assert.equal(
    allyInspireAweOwnerAfter.hand.some((card) => card.id === states.inspireAweAcquireCardId),
    false,
    "Ally Inspire Awe without a sandworm should not acquire the selected card to hand",
  );
  assert.equal(
    allyInspireAweAfter.imperiumRow.some((card) => card.id === states.inspireAweReplacementCardId),
    true,
    "Ally Inspire Awe should refill the Imperium Row",
  );
  assert.match(allyInspireAweAfter.log[0], /acquires .* to their discard pile/);
  await screenshot(page, captures, "inspire-awe-ally-after-acquire.png");

  await setDebugGameAndWait(page, states.inspireAweCommander);
  await waitForActiveIntrigue(page, "Inspire Awe");
  const commanderInspireAweCard = page.locator(".intrigue-card").filter({ hasText: "Inspire Awe" });
  const commanderInspireAweButton = commanderInspireAweCard.getByRole("button", { name: /Acquire <=3 to Hand/ });
  assert.equal(await commanderInspireAweButton.count(), 1, "Expected one Commander Inspire Awe hand acquisition button");
  assert.equal(await commanderInspireAweButton.isEnabled(), true, "Commander Inspire Awe should be playable");
  await screenshot(page, captures, "inspire-awe-commander-ready.png");

  await commanderInspireAweButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    return game?.pendingAction?.kind === "acquire-card" &&
      game.pendingAction.source === "Inspire Awe" &&
      game.pendingAction.destination === "hand";
  });
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Inspire Awe/i);
  await assertPendingButtonNamed(
    page,
    states.inspireAweAcquireCardName,
    "Commander Inspire Awe should expose its acquisition card",
  );
  await screenshot(page, captures, "pending-inspire-awe-commander-acquire.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.inspireAweAcquireCardName }).click();
  await waitForNoPending(page);
  const commanderInspireAweAfter = await currentGame(page);
  const commanderInspireAweSourceAfter = commanderInspireAweAfter.players.find((player) => player.id === "p4");
  const commanderInspireAweOwnerAfter = commanderInspireAweAfter.players.find((player) => player.id === "p6");
  assert.ok(commanderInspireAweSourceAfter, "Expected Shaddam after Commander Inspire Awe");
  assert.ok(commanderInspireAweOwnerAfter, "Expected Princess Irulan after Commander Inspire Awe");
  assert.equal(
    commanderInspireAweSourceAfter.hand.at(-1)?.id,
    states.inspireAweAcquireCardId,
    "Commander Inspire Awe should acquire the selected card to the Commander's hand",
  );
  assert.equal(
    commanderInspireAweOwnerAfter.hand.some((card) => card.id === states.inspireAweAcquireCardId),
    false,
    "Commander Inspire Awe should not give the acquired card to the activated Ally",
  );
  assert.match(commanderInspireAweAfter.log[1], /through Princess Irulan's sandworm/);
  await screenshot(page, captures, "inspire-awe-commander-after-acquire.png");

  await setDebugGameAndWait(page, states.sietchRitualAlly);
  await waitForActiveIntrigue(page, "Sietch Ritual");
  const allySietchCard = page.locator(".intrigue-card").filter({ hasText: "Sietch Ritual" });
  const allySietchButton = allySietchCard.getByRole("button", {
    name: new RegExp(`Discard ${escapeRegExp(states.sietchRitualDiscardCardName)} -> BG`),
  });
  assert.equal(await allySietchButton.count(), 1, "Expected one Ally Sietch Ritual Bene button");
  assert.equal(await allySietchButton.isEnabled(), true, "Ally Sietch Ritual should be playable with a hand card");
  await screenshot(page, captures, "sietch-ritual-ally-ready.png");

  const allySietchBefore = await currentGame(page);
  const allySietchOwnerBefore = allySietchBefore.players.find((player) => player.id === "p2");
  assert.ok(allySietchOwnerBefore, "Expected Feyd before Ally Sietch Ritual");
  await allySietchButton.click();
  await page.waitForFunction(({ discardCardId }) => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        player.influence.bene === 2 &&
        player.discard.at(-1)?.id === discardCardId &&
        !player.hand.some((card) => card.id === discardCardId) &&
        !player.intrigues.some((card) => card.name === "Sietch Ritual") &&
        game?.intrigueDiscard.at(-1)?.name === "Sietch Ritual",
    );
  }, { discardCardId: states.sietchRitualDiscardCardId });
  const allySietchAfter = await currentGame(page);
  const allySietchOwnerAfter = allySietchAfter.players.find((player) => player.id === "p2");
  assert.ok(allySietchOwnerAfter, "Expected Feyd after Ally Sietch Ritual");
  assert.equal(
    allySietchOwnerAfter.vp,
    allySietchOwnerBefore.vp + 1,
    "Ally Sietch Ritual should award the Bene Gesserit threshold VP",
  );
  assert.match(allySietchAfter.log[0], /Sietch Ritual, discards .* and gains 1 Bene Gesserit Influence/);
  await screenshot(page, captures, "sietch-ritual-ally-after.png");

  await setDebugGameAndWait(page, states.sietchRitualCommander);
  await waitForActiveIntrigue(page, "Sietch Ritual");
  const commanderSietchCard = page.locator(".intrigue-card").filter({ hasText: "Sietch Ritual" });
  const commanderSietchButton = commanderSietchCard.getByRole("button", {
    name: new RegExp(`Discard ${escapeRegExp(states.sietchRitualDiscardCardName)} -> BG: Princess Irulan`),
  });
  assert.equal(await commanderSietchButton.count(), 1, "Expected one Commander routed Sietch Ritual Bene button");
  assert.equal(await commanderSietchButton.isEnabled(), true, "Commander Sietch Ritual should be playable with a hand card");
  await screenshot(page, captures, "sietch-ritual-commander-ready.png");

  const commanderSietchBefore = await currentGame(page);
  const commanderSietchSourceBefore = commanderSietchBefore.players.find((player) => player.id === "p4");
  const commanderSietchOwnerBefore = commanderSietchBefore.players.find((player) => player.id === "p6");
  assert.ok(commanderSietchSourceBefore, "Expected Shaddam before Commander Sietch Ritual");
  assert.ok(commanderSietchOwnerBefore, "Expected Princess Irulan before Commander Sietch Ritual");
  await commanderSietchButton.click();
  await page.waitForFunction(({ discardCardId }) => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const commander = game?.players.find((candidate) => candidate.id === "p4");
    const ally = game?.players.find((candidate) => candidate.id === "p6");
    return Boolean(
      commander &&
        ally &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        commander.influence.bene === 0 &&
        ally.influence.bene === 2 &&
        commander.discard.at(-1)?.id === discardCardId &&
        !commander.hand.some((card) => card.id === discardCardId) &&
        !commander.intrigues.some((card) => card.name === "Sietch Ritual") &&
        game?.intrigueDiscard.at(-1)?.name === "Sietch Ritual",
    );
  }, { discardCardId: states.sietchRitualDiscardCardId });
  const commanderSietchAfter = await currentGame(page);
  const commanderSietchSourceAfter = commanderSietchAfter.players.find((player) => player.id === "p4");
  const commanderSietchOwnerAfter = commanderSietchAfter.players.find((player) => player.id === "p6");
  assert.ok(commanderSietchSourceAfter, "Expected Shaddam after Commander Sietch Ritual");
  assert.ok(commanderSietchOwnerAfter, "Expected Princess Irulan after Commander Sietch Ritual");
  assert.equal(
    commanderSietchSourceAfter.vp,
    commanderSietchSourceBefore.vp,
    "Commander Sietch Ritual should not award the routed Bene threshold VP to Shaddam",
  );
  assert.equal(
    commanderSietchOwnerAfter.vp,
    commanderSietchOwnerBefore.vp + 1,
    "Commander Sietch Ritual should award the routed Bene threshold VP to the activated Ally",
  );
  assert.match(commanderSietchAfter.log[0], /Princess Irulan gains 1 Bene Gesserit Influence/);
  await screenshot(page, captures, "sietch-ritual-commander-after.png");

  await setDebugGameAndWait(page, states.specialMissionPlaceSpy);
  await waitForActiveIntrigue(page, "Special Mission");
  const specialMissionCard = page.locator(".intrigue-card").filter({ hasText: "Special Mission" });
  const specialMissionCityButton = specialMissionCard.getByRole("button", { name: "City Spy" });
  assert.equal(await specialMissionCityButton.count(), 1, "Expected one Special Mission City Spy button");
  assert.equal(await specialMissionCityButton.isEnabled(), true, "Special Mission City Spy should be playable");
  await screenshot(page, captures, "special-mission-ready.png");

  const specialMissionBefore = await currentGame(page);
  const specialMissionOwnerBefore = specialMissionBefore.players.find((player) => player.id === "p2");
  assert.ok(specialMissionOwnerBefore, "Expected Feyd before Special Mission");
  await specialMissionCityButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    return game?.pendingAction?.kind === "spy" &&
      game.pendingAction.source === "Special Mission" &&
      game.pendingAction.placementIcon === "city" &&
      game.pendingAction.mustPlaceSpy === true;
  });
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Special Mission City spy placement/i);
  assert.match(pendingText, new RegExp(escapeRegExp(states.specialMissionSpySpaceName)));
  await screenshot(page, captures, "pending-special-mission-city-spy.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.specialMissionSpySpaceName }).click();
  await waitForNoPending(page);
  const specialMissionAfter = await currentGame(page);
  const specialMissionOwnerAfter = specialMissionAfter.players.find((player) => player.id === "p2");
  assert.ok(specialMissionOwnerAfter, "Expected Feyd after Special Mission");
  assert.equal(
    specialMissionOwnerAfter.spies,
    specialMissionOwnerBefore.spies - 1,
    "Special Mission should spend one ready spy",
  );
  assert.equal(
    specialMissionAfter.spyPosts[states.specialMissionSpySpaceId],
    "p2",
    "Special Mission should place the spy on the selected City post",
  );
  assert.equal(
    specialMissionOwnerAfter.intrigues.some((card) => card.name === "Special Mission"),
    false,
    "Special Mission browser flow should discard the played Intrigue",
  );
  assert.equal(specialMissionAfter.intrigueDiscard.at(-1)?.name, "Special Mission");
  assert.match(specialMissionAfter.log[0], /places a spy near .* from Special Mission/);
  await screenshot(page, captures, "special-mission-after-spy.png");

  await setDebugGameAndWait(page, states.specialMissionRecallSpy);
  await waitForActiveIntrigue(page, "Special Mission");
  const specialMissionRecallCard = page.locator(".intrigue-card").filter({ hasText: "Special Mission" });
  const specialMissionRecallButton = specialMissionRecallCard.getByRole("button", {
    name: `${states.specialMissionRecallSpaceName} -> Wall + 2 Spice`,
  });
  assert.equal(await specialMissionRecallButton.count(), 1, "Expected one Special Mission recall-spy button");
  assert.equal(await specialMissionRecallButton.isEnabled(), true, "Special Mission recall-spy should be playable");
  await screenshot(page, captures, "special-mission-recall-ready.png");

  const specialMissionRecallBefore = await currentGame(page);
  const specialMissionRecallOwnerBefore = specialMissionRecallBefore.players.find((player) => player.id === "p2");
  assert.ok(specialMissionRecallOwnerBefore, "Expected Feyd before Special Mission recall");
  await specialMissionRecallButton.click();
  await waitForNoPending(page);
  const specialMissionRecallAfter = await currentGame(page);
  const specialMissionRecallOwnerAfter = specialMissionRecallAfter.players.find((player) => player.id === "p2");
  assert.ok(specialMissionRecallOwnerAfter, "Expected Feyd after Special Mission recall");
  assert.equal(
    specialMissionRecallAfter.spyPosts[states.specialMissionRecallPostId],
    undefined,
    "Special Mission recall should remove the selected spy post",
  );
  assert.equal(
    specialMissionRecallOwnerAfter.spies,
    specialMissionRecallOwnerBefore.spies + 1,
    "Special Mission recall should return the spy to supply",
  );
  assert.equal(
    specialMissionRecallOwnerAfter.resources.spice,
    specialMissionRecallOwnerBefore.resources.spice + 2,
    "Special Mission recall should gain 2 spice",
  );
  assert.equal(specialMissionRecallAfter.turnSpiceGains.p2, (specialMissionRecallBefore.turnSpiceGains.p2 ?? 0) + 2);
  assert.equal(specialMissionRecallAfter.shieldWall, false, "Special Mission recall should remove the Shield Wall");
  assert.equal(
    specialMissionRecallOwnerAfter.intrigues.some((card) => card.name === "Special Mission"),
    false,
    "Special Mission recall browser flow should discard the played Intrigue",
  );
  assert.equal(specialMissionRecallAfter.intrigueDiscard.at(-1)?.name, "Special Mission");
  assert.match(
    specialMissionRecallAfter.log[0],
    new RegExp(`plays Special Mission, recalls a spy from ${escapeRegExp(states.specialMissionRecallSpaceName)}, removes the Shield Wall, and gains 2 spice`),
  );
  await screenshot(page, captures, "special-mission-after-recall.png");

  await setDebugGameAndWait(page, states.changeAllegiancesAlly);
  await waitForActiveIntrigue(page, "Change Allegiances");
  const allyChangeCard = page.locator(".intrigue-card").filter({ hasText: "Change Allegiances" });
  await allyChangeCard.getByLabel("Change Allegiances lose Influence").selectOption("greatHouses");
  await allyChangeCard.getByLabel("Change Allegiances shift gain Influence").selectOption("bene");
  await allyChangeCard.getByLabel("Change Allegiances spice gain Influence").selectOption("spacing");
  const allyChangeBothButton = allyChangeCard.getByRole("button", { name: "Both rows" });
  assert.equal(await allyChangeBothButton.count(), 1, "Expected one Ally Change Allegiances both-rows button");
  assert.equal(await allyChangeBothButton.isEnabled(), true, "Ally Change Allegiances both rows should be playable");
  await screenshot(page, captures, "change-allegiances-ally-ready.png");

  const allyChangeBefore = await currentGame(page);
  const allyChangeOwnerBefore = allyChangeBefore.players.find((player) => player.id === "p2");
  assert.ok(allyChangeOwnerBefore, "Expected Feyd before Ally Change Allegiances");
  await allyChangeBothButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        player.resources.spice === 0 &&
        player.influence.greatHouses === 0 &&
        player.influence.bene === 2 &&
        player.influence.spacing === 2 &&
        !player.intrigues.some((card) => card.name === "Change Allegiances") &&
        game?.intrigueDiscard.at(-1)?.name === "Change Allegiances",
    );
  });
  const allyChangeAfter = await currentGame(page);
  const allyChangeOwnerAfter = allyChangeAfter.players.find((player) => player.id === "p2");
  assert.ok(allyChangeOwnerAfter, "Expected Feyd after Ally Change Allegiances");
  assert.equal(
    allyChangeOwnerAfter.vp,
    allyChangeOwnerBefore.vp + 2,
    "Ally Change Allegiances both rows should award both Influence threshold VPs",
  );
  assert.match(
    allyChangeAfter.log[0],
    /Change Allegiances; .* loses 1 Great Houses Influence, .* spends 3 spice, and gains 1 Bene Gesserit Influence and gains 1 Spacing Guild Influence/,
  );
  await screenshot(page, captures, "change-allegiances-ally-after.png");

  await setDebugGameAndWait(page, states.changeAllegiancesCommander);
  await waitForActiveIntrigue(page, "Change Allegiances");
  const commanderChangeCard = page.locator(".intrigue-card").filter({ hasText: "Change Allegiances" });
  await commanderChangeCard.getByLabel("Change Allegiances lose Influence").selectOption("bene");
  await commanderChangeCard.getByLabel("Change Allegiances shift gain Influence").selectOption("emperor");
  await commanderChangeCard.getByLabel("Change Allegiances spice gain Influence").selectOption("greatHouses");
  const commanderChangeBothButton = commanderChangeCard.getByRole("button", { name: "Both rows" });
  assert.equal(await commanderChangeBothButton.count(), 1, "Expected one Commander Change Allegiances both-rows button");
  assert.equal(
    await commanderChangeBothButton.isEnabled(),
    true,
    "Commander Change Allegiances both rows should be playable with an activated Ally",
  );
  await screenshot(page, captures, "change-allegiances-commander-ready.png");

  const commanderChangeBefore = await currentGame(page);
  const commanderChangeSourceBefore = commanderChangeBefore.players.find((player) => player.id === "p4");
  const commanderChangeOwnerBefore = commanderChangeBefore.players.find((player) => player.id === "p6");
  assert.ok(commanderChangeSourceBefore, "Expected Shaddam before Commander Change Allegiances");
  assert.ok(commanderChangeOwnerBefore, "Expected Princess Irulan before Commander Change Allegiances");
  await commanderChangeBothButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const commander = game?.players.find((candidate) => candidate.id === "p4");
    const ally = game?.players.find((candidate) => candidate.id === "p6");
    return Boolean(
      commander &&
        ally &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        commander.resources.spice === 0 &&
        commander.influence.emperor === 2 &&
        commander.influence.greatHouses === 0 &&
        ally.influence.bene === 0 &&
        ally.influence.greatHouses === 2 &&
        !commander.intrigues.some((card) => card.name === "Change Allegiances") &&
        game?.intrigueDiscard.at(-1)?.name === "Change Allegiances",
    );
  });
  const commanderChangeAfter = await currentGame(page);
  const commanderChangeSourceAfter = commanderChangeAfter.players.find((player) => player.id === "p4");
  const commanderChangeOwnerAfter = commanderChangeAfter.players.find((player) => player.id === "p6");
  assert.ok(commanderChangeSourceAfter, "Expected Shaddam after Commander Change Allegiances");
  assert.ok(commanderChangeOwnerAfter, "Expected Princess Irulan after Commander Change Allegiances");
  assert.equal(
    commanderChangeSourceAfter.vp,
    commanderChangeSourceBefore.vp + 1,
    "Commander Change Allegiances should award the personal Emperor threshold VP to Shaddam",
  );
  assert.equal(
    commanderChangeOwnerAfter.vp,
    commanderChangeOwnerBefore.vp + 1,
    "Commander Change Allegiances should award the routed Great Houses threshold VP to the activated Ally",
  );
  assert.match(
    commanderChangeAfter.log[0],
    /Princess Irulan loses 1 Bene Gesserit Influence, .* spends 3 spice, and gains 1 Emperor Influence and Princess Irulan gains 1 Great Houses Influence/,
  );
  await screenshot(page, captures, "change-allegiances-commander-after.png");

  await setDebugGameAndWait(page, states.buyAccessAlly);
  await waitForActiveIntrigue(page, "Buy Access");
  const allyBuyAccessCard = page.locator(".intrigue-card").filter({ hasText: "Buy Access" });
  const allyBuyAccessButton = allyBuyAccessCard.getByRole("button", { name: /5 Solari -> GH \+ BG/ });
  assert.equal(await allyBuyAccessButton.count(), 1, "Expected one Ally Buy Access Great Houses plus Bene Gesserit button");
  assert.equal(await allyBuyAccessButton.isEnabled(), true, "Ally Buy Access should be playable with 5 Solari");
  await screenshot(page, captures, "buy-access-ally-ready.png");

  const allyBuyAccessBefore = await currentGame(page);
  const allyBuyAccessOwnerBefore = allyBuyAccessBefore.players.find((player) => player.id === "p2");
  assert.ok(allyBuyAccessOwnerBefore, "Expected Feyd before Ally Buy Access");
  await allyBuyAccessButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        player.resources.solari === 0 &&
        player.influence.greatHouses === 2 &&
        player.influence.bene === 2 &&
        !player.intrigues.some((card) => card.name === "Buy Access") &&
        game?.intrigueDiscard.at(-1)?.name === "Buy Access",
    );
  });
  const allyBuyAccessAfter = await currentGame(page);
  const allyBuyAccessOwnerAfter = allyBuyAccessAfter.players.find((player) => player.id === "p2");
  assert.ok(allyBuyAccessOwnerAfter, "Expected Feyd after Ally Buy Access");
  assert.equal(
    allyBuyAccessOwnerAfter.vp,
    allyBuyAccessOwnerBefore.vp + 2,
    "Ally Buy Access should award both Influence threshold VPs",
  );
  assert.match(
    allyBuyAccessAfter.log[0],
    /Buy Access, spends 5 Solari, and gains 1 Great Houses Influence and 1 Bene Gesserit Influence/,
  );
  await screenshot(page, captures, "buy-access-ally-after.png");

  await setDebugGameAndWait(page, states.buyAccessCommander);
  await waitForActiveIntrigue(page, "Buy Access");
  const commanderBuyAccessCard = page.locator(".intrigue-card").filter({ hasText: "Buy Access" });
  const commanderBuyAccessButton = commanderBuyAccessCard.getByRole("button", {
    name: new RegExp(`5 Solari -> Self: EMP / ${escapeRegExp(states.buyAccessCommanderTargetName)}: BG`),
  });
  assert.equal(await commanderBuyAccessButton.count(), 1, "Expected one Commander Buy Access personal plus routed button");
  assert.equal(
    await commanderBuyAccessButton.isEnabled(),
    true,
    "Commander Buy Access should be playable with 5 Solari and an activated Ally",
  );
  await screenshot(page, captures, "buy-access-commander-ready.png");

  const commanderBuyAccessBefore = await currentGame(page);
  const commanderBuyAccessSourceBefore = commanderBuyAccessBefore.players.find((player) => player.id === "p4");
  const commanderBuyAccessOwnerBefore = commanderBuyAccessBefore.players.find((player) => player.id === "p6");
  assert.ok(commanderBuyAccessSourceBefore, "Expected Shaddam before Commander Buy Access");
  assert.ok(commanderBuyAccessOwnerBefore, "Expected Princess Irulan before Commander Buy Access");
  await commanderBuyAccessButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const commander = game?.players.find((candidate) => candidate.id === "p4");
    const ally = game?.players.find((candidate) => candidate.id === "p6");
    return Boolean(
      commander &&
        ally &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        commander.resources.solari === 0 &&
        commander.influence.emperor === 2 &&
        commander.influence.bene === 0 &&
        ally.influence.bene === 2 &&
        !commander.intrigues.some((card) => card.name === "Buy Access") &&
        game?.intrigueDiscard.at(-1)?.name === "Buy Access",
    );
  });
  const commanderBuyAccessAfter = await currentGame(page);
  const commanderBuyAccessSourceAfter = commanderBuyAccessAfter.players.find((player) => player.id === "p4");
  const commanderBuyAccessOwnerAfter = commanderBuyAccessAfter.players.find((player) => player.id === "p6");
  assert.ok(commanderBuyAccessSourceAfter, "Expected Shaddam after Commander Buy Access");
  assert.ok(commanderBuyAccessOwnerAfter, "Expected Princess Irulan after Commander Buy Access");
  assert.equal(
    commanderBuyAccessSourceAfter.vp,
    commanderBuyAccessSourceBefore.vp + 1,
    "Commander Buy Access should award the personal Emperor threshold VP to Shaddam",
  );
  assert.equal(
    commanderBuyAccessOwnerAfter.vp,
    commanderBuyAccessOwnerBefore.vp + 1,
    "Commander Buy Access should award the routed Bene Gesserit threshold VP to the activated Ally",
  );
  assert.match(commanderBuyAccessAfter.log[0], /gains 1 Emperor Influence and Princess Irulan gains 1 Bene Gesserit Influence/);
  await screenshot(page, captures, "buy-access-commander-after.png");

  await setDebugGameAndWait(page, states.imperiumPoliticsAlly);
  await waitForActiveIntrigue(page, "Imperium Politics");
  const allyPoliticsCard = page.locator(".intrigue-card").filter({ hasText: "Imperium Politics" });
  const allyPoliticsButton = allyPoliticsCard.getByRole("button", { name: /1 Solari -> GH/ });
  assert.equal(await allyPoliticsButton.count(), 1, "Expected one Ally Imperium Politics Great Houses button");
  assert.equal(await allyPoliticsButton.isEnabled(), true, "Ally Imperium Politics should be playable with 1 Solari");
  await screenshot(page, captures, "imperium-politics-ally-ready.png");

  const allyPoliticsBefore = await currentGame(page);
  const allyPoliticsOwnerBefore = allyPoliticsBefore.players.find((player) => player.id === "p2");
  assert.ok(allyPoliticsOwnerBefore, "Expected Feyd before Ally Imperium Politics");
  await allyPoliticsButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        player.resources.solari === 1 &&
        player.influence.greatHouses === 2 &&
        !player.intrigues.some((card) => card.name === "Imperium Politics") &&
        game?.intrigueDiscard.at(-1)?.name === "Imperium Politics",
    );
  });
  const allyPoliticsAfter = await currentGame(page);
  const allyPoliticsOwnerAfter = allyPoliticsAfter.players.find((player) => player.id === "p2");
  assert.ok(allyPoliticsOwnerAfter, "Expected Feyd after Ally Imperium Politics");
  assert.equal(
    allyPoliticsOwnerAfter.vp,
    allyPoliticsOwnerBefore.vp + 1,
    "Ally Imperium Politics should award the Great Houses threshold VP",
  );
  assert.match(allyPoliticsAfter.log[0], /Imperium Politics, spends 1 Solari, and gains 1 Great Houses Influence/);
  await screenshot(page, captures, "imperium-politics-ally-after.png");

  await setDebugGameAndWait(page, states.imperiumPoliticsCommander);
  await waitForActiveIntrigue(page, "Imperium Politics");
  const commanderPoliticsCard = page.locator(".intrigue-card").filter({ hasText: "Imperium Politics" });
  const commanderPoliticsButton = commanderPoliticsCard.getByRole("button", {
    name: new RegExp(`1 Solari -> GH: ${escapeRegExp(states.imperiumPoliticsCommanderTargetName)}`),
  });
  assert.equal(await commanderPoliticsButton.count(), 1, "Expected one Commander routed Imperium Politics button");
  assert.equal(
    await commanderPoliticsButton.isEnabled(),
    true,
    "Commander routed Imperium Politics should be playable with 1 Solari",
  );
  await screenshot(page, captures, "imperium-politics-commander-ready.png");

  const commanderPoliticsBefore = await currentGame(page);
  const commanderPoliticsSourceBefore = commanderPoliticsBefore.players.find((player) => player.id === "p4");
  const commanderPoliticsOwnerBefore = commanderPoliticsBefore.players.find((player) => player.id === "p6");
  assert.ok(commanderPoliticsSourceBefore, "Expected Shaddam before routed Imperium Politics");
  assert.ok(commanderPoliticsOwnerBefore, "Expected Princess Irulan before routed Imperium Politics");
  await commanderPoliticsButton.click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const commander = game?.players.find((candidate) => candidate.id === "p4");
    const ally = game?.players.find((candidate) => candidate.id === "p6");
    return Boolean(
      commander &&
        ally &&
        !game.pendingAction &&
        game.pendingQueue.length === 0 &&
        commander.resources.solari === 1 &&
        commander.influence.greatHouses === 0 &&
        ally.influence.greatHouses === 2 &&
        !commander.intrigues.some((card) => card.name === "Imperium Politics") &&
        game?.intrigueDiscard.at(-1)?.name === "Imperium Politics",
    );
  });
  const commanderPoliticsAfter = await currentGame(page);
  const commanderPoliticsSourceAfter = commanderPoliticsAfter.players.find((player) => player.id === "p4");
  const commanderPoliticsOwnerAfter = commanderPoliticsAfter.players.find((player) => player.id === "p6");
  assert.ok(commanderPoliticsSourceAfter, "Expected Shaddam after routed Imperium Politics");
  assert.ok(commanderPoliticsOwnerAfter, "Expected Princess Irulan after routed Imperium Politics");
  assert.equal(
    commanderPoliticsSourceAfter.influence.greatHouses,
    commanderPoliticsSourceBefore.influence.greatHouses,
    "Commander routed Imperium Politics should not move the Commander's Great Houses Influence",
  );
  assert.equal(
    commanderPoliticsOwnerAfter.vp,
    commanderPoliticsOwnerBefore.vp + 1,
    "Commander routed Imperium Politics should award the activated Ally threshold VP",
  );
  assert.match(commanderPoliticsAfter.log[0], /Princess Irulan gains 1 Great Houses Influence/);
  await screenshot(page, captures, "imperium-politics-commander-after.png");

  await setDebugGameAndWait(page, states.manipulatePlot);
  const manipulateButton = page.getByRole("button", { name: states.manipulateButtonName });
  await screenshot(page, captures, "manipulate-ready.png");
  const manipulateBefore = await currentGame(page);
  const manipulateOwnerBefore = manipulateBefore.players.find((player) => player.id === "p2");
  assert.ok(manipulateOwnerBefore, "Expected Feyd before Manipulate");
  await manipulateButton.click();
  await page.waitForFunction(({ cardId, replacementId }) => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const player = game?.players.find((candidate) => candidate.id === "p2");
    return Boolean(
      player?.manipulatedCards.some((card) => card.id === cardId) &&
        game?.imperiumRow.some((card) => card.id === replacementId) &&
        !game?.imperiumRow.some((card) => card.id === cardId),
    );
  }, {
    cardId: states.manipulateRowCardId,
    replacementId: states.manipulateReplacementCardId,
  });
  const manipulateAfter = await currentGame(page);
  const manipulateOwnerAfter = manipulateAfter.players.find((player) => player.id === "p2");
  assert.ok(manipulateOwnerAfter, "Expected Feyd after Manipulate");
  assert.equal(
    manipulateOwnerAfter.manipulatedCards.some((card) => card.id === states.manipulateRowCardId),
    true,
    "Manipulate browser flow should hold the removed row card as a discounted acquisition",
  );
  assert.equal(
    manipulateAfter.imperiumRow.some((card) => card.id === states.manipulateReplacementCardId),
    true,
    "Manipulate browser flow should refill the Imperium Row",
  );
  assert.equal(
    manipulateOwnerAfter.intrigues.some((card) => card.id === states.manipulateIntrigueId),
    false,
    "Manipulate browser flow should discard the played Intrigue",
  );
  const manipulateMarketText = await page.locator(".market-panel").innerText();
  assert.equal(
    await page.locator(".market-panel").getByRole("button", { name: states.manipulateRowCardName }).count(),
    1,
    "Manipulate should expose the discounted row card as an accessible market button",
  );
  assert.match(manipulateMarketText, /Manipulate/i);
  await screenshot(page, captures, "manipulate-after.png");

  await setDebugGameAndWait(page, states.throneRow);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Throne Row/i);
  await assertPendingButtonNamed(page, states.throneRowCardName, "Throne Row should expose the eligible card");
  await screenshot(page, captures, "pending-throne-row.png");
  const throneRowMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(throneRowMobileViewport);
  const throneRowMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    throneRowMobileScrollWidth <= throneRowMobileViewport.width,
    `Throne Row mobile pending panel should not overflow horizontally (${throneRowMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-throne-row-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  await page.locator(".pending-panel").getByRole("button", { name: states.throneRowCardName }).click();
  await waitForNoPending(page);
  const throneAfter = await currentGame(page);
  assert.equal(
    throneAfter.throneRow.some((card) => card.id === states.throneRowCardId),
    true,
    "Throne Row choice should move the selected card",
  );
  assert.equal(
    throneAfter.imperiumRow.some((card) => card.id === states.throneRowCardId),
    false,
    "Throne Row choice should remove the selected card from the Imperium Row",
  );

  await setDebugGameAndWait(page, states.imperialTentThroneRow);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Throne Row/i);
  await assertPendingButtonNamed(
    page,
    states.imperialTentThroneRowCardName,
    "Imperial Tent Throne Row should expose the eligible card",
  );
  const imperialTentThroneBefore = await currentGame(page);
  assert.equal(
    imperialTentThroneBefore.pendingAction?.source,
    "Imperial Tent",
    "Imperial Tent's declarative pending source should be present in the debug state snapshot",
  );
  assert.equal(
    imperialTentThroneBefore.throneRow.some((card) => card.id === states.imperialTentThroneRowCardId),
    false,
    "Imperial Tent's selected Throne Row target should start in the Imperium Row",
  );
  await screenshot(page, captures, "pending-imperial-tent-throne-row.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.imperialTentThroneRowCardName }).click();
  await waitForNoPending(page);
  const imperialTentThroneAfter = await currentGame(page);
  assert.equal(
    imperialTentThroneAfter.throneRow.some((card) => card.id === states.imperialTentThroneRowCardId),
    true,
    "Imperial Tent's declarative Throne Row choice should move the selected card",
  );
  assert.equal(
    imperialTentThroneAfter.imperiumRow.some((card) => card.id === states.imperialTentThroneRowCardId),
    false,
    "Imperial Tent's declarative Throne Row choice should remove the selected card from the Imperium Row",
  );

  await setDebugGameAndWait(page, states.conflictTie);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /conflict tie/i);
  assert.match(pendingText, /Gurney Halleck/i);
  assert.match(pendingText, /Lady Jessica/i);
  await screenshot(page, captures, "pending-conflict-tie.png");
  const conflictTieMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(conflictTieMobileViewport);
  const conflictTieMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    conflictTieMobileScrollWidth <= conflictTieMobileViewport.width,
    `Conflict tie mobile pending panel should not overflow horizontally (${conflictTieMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-conflict-tie-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  const tieBefore = await currentGame(page);
  assert.ok(tieBefore.conflict, "Expected a tied conflict before choosing concession");
  const concessionButton = page.locator(".pending-panel").getByRole("button", { name: /Gurney Halleck Takes first/i });
  assert.equal(
    await concessionButton.count(),
    1,
    "Conflict tie concession button should expose the ally identity in its accessible name",
  );
  await concessionButton.click();
  await waitForNoPending(page);
  const tieConcessionAfter = await currentGame(page);
  assert.equal(tieConcessionAfter.round, tieBefore.round + 1, "Ally concession should advance to the next round");

  await setDebugGameAndWait(page, states.conflictTie);
  const tieNoConcessionBefore = await currentGame(page);
  assert.ok(tieNoConcessionBefore.conflict, "Expected a tied conflict before choosing no concession");
  const noConcessionConflictId = tieNoConcessionBefore.conflict.id;
  await page.locator(".pending-panel").getByRole("button", { name: "No concession" }).click();
  await waitForNoPending(page);
  const tieAfter = await currentGame(page);
  assert.equal(tieAfter.round, tieNoConcessionBefore.round + 1, "No concession should advance to the next round");
  assert.equal(
    tieAfter.conflictDiscard.some((conflict) => conflict.id === noConcessionConflictId),
    true,
    "No concession should discard the tied conflict",
  );
}

async function waitForActiveIntrigue(page, cardName) {
  await page.waitForFunction((name) => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const activePlayer = game?.players[game.activeSeat];
    return Boolean(activePlayer?.intrigues.some((card) => card.name === name));
  }, cardName);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertPendingButtonNamed(page, name, message) {
  const count = await page.locator(".pending-panel").getByRole("button", { name }).count();
  assert.equal(count, 1, message);
}
