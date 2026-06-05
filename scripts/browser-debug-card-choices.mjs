import assert from "node:assert/strict";
import { createCardChoiceStates } from "./browser-debug-card-choice-states.mjs";

export async function runCardChoicesSmoke({
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
  const states = await createCardChoiceStates(server, initialPlayableGame);
  await writeJson("pending-card-choice-states.json", states);

  await setDebugGameAndWait(page, states.contractPublic);
  let pendingText = await page.locator(".pending-panel").innerText();
  const contractName = states.contractPublic.contractOffer[0].name;
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, new RegExp(escapeRegExp(contractName)));
  await screenshot(page, captures, "pending-contract-public.png");
  const contractMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(contractMobileViewport);
  const contractMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    contractMobileScrollWidth <= contractMobileViewport.width,
    `Contract choice mobile pending panel should not overflow horizontally (${contractMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-contract-public-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: contractName }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Contract choice should add one contract");
  assert.equal(ownerAfter.contracts.at(-1).card.name, contractName, "Contract choice should take the selected contract");

  await setDebugGameAndWait(page, states.contractOptional);
  pendingText = await page.locator(".pending-panel").innerText();
  const optionalContractName = states.contractOptional.contractOffer[0].name;
  before = await currentGame(page);
  assert.equal(before.pendingAction?.source, "Leverage", "Optional contract browser state should come from Leverage");
  assert.match(pendingText, new RegExp(escapeRegExp(optionalContractName)));
  assert.match(pendingText, /Skip/i);
  await screenshot(page, captures, "pending-contract-optional-skip.png");

  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Skip" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length, "Skipping optional contract should not add a contract");
  assert.deepEqual(
    after.contractOffer.map((contract) => contract.id),
    before.contractOffer.map((contract) => contract.id),
    "Skipping optional contract should leave the public offer unchanged",
  );

  await setDebugGameAndWait(page, states.contractFallback);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, /Collect 2 Solari/i);
  await screenshot(page, captures, "pending-contract-fallback.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Collect 2 Solari" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari + 2, "Contract fallback should pay 2 Solari");

  await setDebugGameAndWait(page, states.acquire);
  pendingText = await page.locator(".pending-panel").innerText();
  const acquireName = states.acquire.imperiumRow[0].name;
  assert.match(pendingText, /acquisition/i);
  await assertPendingButtonNamed(page, acquireName, "Acquire choice should expose the eligible Imperium Row card");
  await screenshot(page, captures, "pending-acquire-card.png");
  const acquireMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(acquireMobileViewport);
  const acquireMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    acquireMobileScrollWidth <= acquireMobileViewport.width,
    `Acquire card mobile pending panel should not overflow horizontally (${acquireMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-acquire-card-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: acquireName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.length, ownerBefore.discard.length + 1, "Acquire choice should add one discard card");
  assert.equal(ownerAfter.discard.at(-1).name, acquireName, "Acquire choice should take the selected card");

  await setDebugGameAndWait(page, states.acquireReserve);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /acquisition/i);
  await assertPendingButtonNamed(page, "Prepare The Way", "Reserve acquire choice should expose Prepare The Way");
  await screenshot(page, captures, "pending-acquire-prepare-the-way.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Prepare The Way/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.length, ownerBefore.discard.length + 1, "Reserve acquire should add one discard card");
  assert.equal(ownerAfter.discard.at(-1).sourceId, 537, "Reserve acquire should take Prepare The Way");
  assert.ok(after.reserveMarket.some((card) => card.sourceId === 537), "Prepare The Way reserve should remain available");

  await setDebugGameAndWait(page, states.priceIsNoObjectAcquire);
  pendingText = await page.locator(".pending-panel").innerText();
  const priceAcquireName = states.priceIsNoObjectAcquire.priceIsNoObjectAcquireCardName;
  const priceAcquireId = states.priceIsNoObjectAcquire.priceIsNoObjectAcquireCardId;
  const priceAcquireCost = states.priceIsNoObjectAcquire.priceIsNoObjectAcquireCardCost;
  assert.match(pendingText, /Price is No Object/i);
  await assertPendingButtonNamed(page, priceAcquireName, "Price is No Object should expose the eligible acquisition card");
  assert.match(pendingText, /Skip/i);
  await screenshot(page, captures, "pending-price-is-no-object-acquire.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: priceAcquireName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.ok(ownerAfter, "Expected Feyd after Price is No Object acquire");
  assert.equal(
    ownerAfter.resources.solari,
    ownerBefore.resources.solari - priceAcquireCost,
    "Price is No Object acquire should spend Solari equal to the card cost",
  );
  assert.equal(ownerAfter.hand.at(-1).id, priceAcquireId, "Price is No Object acquire should move the selected card to hand");

  await setDebugGameAndWait(page, states.dangerousRhetoric);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Dangerous Rhetoric/i);
  assert.match(pendingText, /Choose Influence/i);
  assert.match(pendingText, /BG/i);
  await screenshot(page, captures, "pending-dangerous-rhetoric-influence.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /BG/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Dangerous Rhetoric should gain chosen Influence");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Dangerous Rhetoric should award Influence threshold VP");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.dangerousRhetoric.pendingAction.cardId),
    false,
    "Dangerous Rhetoric should trash itself after the Influence choice",
  );

  await setDebugGameAndWait(page, states.subversiveAdvisor);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Subversive Advisor/i);
  assert.match(pendingText, /Choose Influence/i);
  assert.match(pendingText, /BG/i);
  assert.doesNotMatch(pendingText, /SG/i);
  await screenshot(page, captures, "pending-subversive-advisor-board-influence.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /BG/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Subversive Advisor should add one more board-space Influence");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.subversiveAdvisor.pendingAction.cardId),
    false,
    "Subversive Advisor should trash itself after the board-space Influence choice",
  );

  await setDebugGameAndWait(page, states.overthrow);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Overthrow/i);
  assert.match(pendingText, /Choose Influence/i);
  assert.match(pendingText, /BG/i);
  assert.doesNotMatch(pendingText, /SG/i);
  await screenshot(page, captures, "pending-overthrow-board-influence.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /BG/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Overthrow should add one more board-space Influence");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.overthrow.pendingAction.cardId),
    true,
    "Overthrow should remain in play after the board-space Influence choice",
  );

  await setDebugGameAndWait(page, states.seekAllies);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Seek Allies/i);
  assert.doesNotMatch(pendingText, /Skip/i);
  assert.doesNotMatch(pendingText, /Seek Allies Debug Other/i);
  await screenshot(page, captures, "pending-seek-allies-trash.png");

  before = await currentGame(page);
  await page.locator(".pending-panel").getByRole("button", { name: /Seek Allies \(in play\)/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === before.pendingAction.requiredCardId),
    false,
    "Seek Allies should trash the source card from play",
  );
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.seekAllies.seekAlliesOtherPlayCardId),
    true,
    "Seek Allies should leave other in-play cards alone",
  );

  await setDebugGameAndWait(page, states.desertSurvival);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Desert Survival/i);
  assert.match(pendingText, /Skip/i);
  assert.doesNotMatch(pendingText, /Desert Survival Debug Other/i);
  await screenshot(page, captures, "pending-desert-survival-trash.png");

  before = await currentGame(page);
  await page.locator(".pending-panel").getByRole("button", { name: /Desert Survival \(in play\)/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === before.pendingAction.requiredCardId),
    false,
    "Desert Survival should trash the source card from play",
  );
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.desertSurvival.desertSurvivalOtherPlayCardId),
    true,
    "Desert Survival should leave other in-play cards alone",
  );

  await setDebugGameAndWait(page, states.treadInDarkness);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Tread in Darkness/i);
  assert.match(pendingText, /Trash reward: draw 1 card/i);
  assert.match(pendingText, /Skip/i);
  assert.doesNotMatch(pendingText, /Tread in Darkness Debug Other Bene/i);
  await screenshot(page, captures, "pending-tread-in-darkness-trash-draw.png");
  const trashCardMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(trashCardMobileViewport);
  const trashCardMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    trashCardMobileScrollWidth <= trashCardMobileViewport.width,
    `Trash card mobile pending panel should not overflow horizontally (${trashCardMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-tread-in-darkness-trash-draw-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  await page.locator(".pending-panel").getByRole("button", { name: /Tread in Darkness \(in play\)/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === before.pendingAction.requiredCardId),
    false,
    "Tread in Darkness should trash the source card from play",
  );
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.treadInDarkness.treadInDarknessOtherBeneCardId),
    true,
    "Tread in Darkness should leave the other Bene Gesserit card in play",
  );
  assert.equal(
    ownerAfter.hand.some((card) => card.id === states.treadInDarkness.treadInDarknessDrawCardId),
    true,
    "Tread in Darkness should draw the reward card after trashing itself",
  );
  assert.equal(
    ownerAfter.deck.some((card) => card.id === states.treadInDarkness.treadInDarknessExtraDeckCardId),
    true,
    "Tread in Darkness should leave the second deck card undrawn",
  );

  await setDebugGameAndWait(page, states.shishakli);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Shishakli/i);
  assert.match(pendingText, /Trash reward: draw 1 card/i);
  assert.match(pendingText, /Skip/i);
  assert.doesNotMatch(pendingText, /Shishakli Debug Other/i);
  await screenshot(page, captures, "pending-shishakli-trash-draw.png");

  before = await currentGame(page);
  await page.locator(".pending-panel").getByRole("button", { name: /Shishakli \(in play\)/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === before.pendingAction.requiredCardId),
    false,
    "Shishakli should trash the source card from play",
  );
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === states.shishakli.shishakliOtherPlayCardId),
    true,
    "Shishakli should leave other in-play cards alone",
  );
  assert.equal(
    ownerAfter.hand.some((card) => card.id === states.shishakli.shishakliDrawCardId),
    true,
    "Shishakli should draw the reward card after trashing itself",
  );
  assert.equal(
    ownerAfter.deck.some((card) => card.id === states.shishakli.shishakliExtraDeckCardId),
    true,
    "Shishakli should leave the second deck card undrawn",
  );

  await setDebugGameAndWait(page, states.acquireSpyNetwork);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Spy Network/i);
  assert.match(pendingText, /(?:spy|spies) ready/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  await screenshot(page, captures, "pending-acquire-spy-network-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: states.acquireSpyNetwork.spySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "Spy Network acquire bonus should spend one spy");
  assert.equal(after.spyPosts[states.acquireSpyNetwork.spyPostId], "p2", "Spy Network acquire bonus should place the chosen spy");
  assert.equal(ownerAfter.discard.at(-1).name, "Spy Network", "Spy Network should remain acquired after resolving its spy bonus");

  await setDebugGameAndWait(page, states.acquireInterstellarTrade);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Interstellar Trade/i);
  assert.match(pendingText, /Choose Influence/i);
  assert.match(pendingText, /BG/i);
  await screenshot(page, captures, "pending-acquire-interstellar-trade-influence.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /BG/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame()?.pendingAction?.kind === "contract");
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Interstellar Trade acquire bonus should gain chosen Influence");
  assert.equal(after.pendingAction?.source, "Interstellar Trade", "Interstellar Trade should queue its contract after Influence");

  pendingText = await page.locator(".pending-panel").innerText();
  const interstellarContractName = after.contractOffer[0].name;
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, new RegExp(escapeRegExp(interstellarContractName)));
  await screenshot(page, captures, "pending-acquire-interstellar-trade-contract.png");

  const contractBefore = after;
  await page.locator(".pending-panel").getByRole("button", { name: interstellarContractName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Interstellar Trade should add one CHOAM contract");
  assert.equal(ownerAfter.contracts.at(-1).card.name, interstellarContractName, "Interstellar Trade should take the selected contract");
  assert.equal(
    after.contractOffer.length,
    contractBefore.contractOffer.length,
    "Interstellar Trade should refill the public contract offer after taking a contract",
  );
  assert.equal(ownerAfter.discard.at(-1).name, "Interstellar Trade", "Interstellar Trade should remain acquired after its bonuses");

  await setDebugGameAndWait(page, states.priorityContracts);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /CHOAM contract/i);
  const priorityContractName = states.priorityContracts.priorityContractName;
  assert.match(pendingText, new RegExp(escapeRegExp(priorityContractName)));
  await screenshot(page, captures, "pending-priority-contracts-contract.png");

  before = await currentGame(page);
  assert.equal(before.pendingAction?.source, "Priority Contracts", "Priority Contracts should source the browser contract pending");
  ownerBefore = before.players.find((player) => player.id === "p2");
  assert.equal(ownerBefore.resources.spice, 2, "Priority Contracts should grant 2 spice before contract selection");
  assert.equal(ownerBefore.vp, 1, "Priority Contracts should grant 1 VP before contract selection");
  await page.locator(".pending-panel").getByRole("button", { name: priorityContractName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Priority Contracts should add one CHOAM contract");
  assert.equal(ownerAfter.contracts.at(-1).card.name, priorityContractName, "Priority Contracts should take the selected contract");
  assert.equal(
    after.contractOffer.length,
    before.contractOffer.length,
    "Priority Contracts should refill the public contract offer after taking a contract",
  );

  await setDebugGameAndWait(page, states.inHighPlaces);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /In High Places/i);
  assert.match(pendingText, /(?:spy|spies) ready/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  assert.equal(
    ownerBefore.hand.some((card) => card.id === states.inHighPlaces.inHighPlacesDrawCardId),
    true,
    "In High Places should draw its card before the queued spy placement",
  );
  await screenshot(page, captures, "pending-in-high-places-spy.png");
  const spyPlacementMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(spyPlacementMobileViewport);
  const spyPlacementMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    spyPlacementMobileScrollWidth <= spyPlacementMobileViewport.width,
    `Spy placement mobile pending panel should not overflow horizontally (${spyPlacementMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-in-high-places-spy-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  await page.locator(".pending-panel").getByRole("button", { name: states.inHighPlaces.spySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "In High Places should spend one spy");
  assert.equal(after.spyPosts[states.inHighPlaces.spyPostId], "p2", "In High Places should place the chosen spy");

  await setDebugGameAndWait(page, states.beneGesseritOperativeSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Bene Gesserit Operative/i);
  assert.match(pendingText, /(?:spy|spies) ready/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  await screenshot(page, captures, "pending-bene-gesserit-operative-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeSpy.spySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "Bene Gesserit Operative should spend one spy");
  assert.equal(after.spyPosts[states.beneGesseritOperativeSpy.spyPostId], "p2", "Bene Gesserit Operative should place the chosen spy");

  await setDebugGameAndWait(page, states.doubleAgentSharedSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Double Agent/i);
  assert.match(pendingText, /spy placement/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), false);
  await screenshot(page, captures, "pending-double-agent-shared-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: states.doubleAgentSharedSpy.sharedSpySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "Double Agent should spend one spy");
  assert.equal(after.spyPosts[states.doubleAgentSharedSpy.sharedSpyPostId], "p3", "Double Agent should keep the original spy owner");
  assert.deepEqual(after.sharedSpyPosts[states.doubleAgentSharedSpy.sharedSpyPostId], ["p2"], "Double Agent should share the target spy post");

  await setDebugGameAndWait(page, states.beneGesseritOperativeRecallSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Bene Gesserit Operative/i);
  assert.match(pendingText, /0 spies ready/i);
  assert.match(pendingText, /Recall one spy for supply/i);
  await screenshot(page, captures, "pending-bene-gesserit-operative-recall-spy.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeRecallSpy.spyRecallSpaceName }).click();
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /1 spy ready/i);
  assert.match(pendingText, new RegExp(escapeRegExp(states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallSpaceName)));
  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallSpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, 0, "Bene Gesserit Operative recall path should spend the recalled spy");
  assert.equal(after.spyPosts[states.beneGesseritOperativeRecallSpy.spyRecallPostId], undefined, "Bene Gesserit Operative should remove the recalled spy");
  assert.equal(
    after.spyPosts[states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallPostId],
    "p2",
    "Bene Gesserit Operative should place the recalled spy on the chosen space",
  );

  await setDebugGameAndWait(page, states.capturedMentat);
  pendingText = await page.locator(".pending-panel").innerText();
  const capturedMentatDiscardName = states.capturedMentat.capturedMentatDiscardName;
  const capturedMentatDiscardId = states.capturedMentat.capturedMentatDiscardId;
  const capturedMentatDrawId = states.capturedMentat.capturedMentatDrawId;
  assert.match(pendingText, /Captured Mentat/i);
  assert.match(pendingText, new RegExp(escapeRegExp(capturedMentatDiscardName)));
  assert.match(pendingText, /Bene Gesserit/i);
  await screenshot(page, captures, "pending-captured-mentat.png");
  const capturedMentatMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(capturedMentatMobileViewport);
  const capturedMentatMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    capturedMentatMobileScrollWidth <= capturedMentatMobileViewport.width,
    `Captured Mentat mobile pending panel should not overflow horizontally (${capturedMentatMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-captured-mentat-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: capturedMentatDiscardName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Bene Gesserit" }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Resolve Captured Mentat" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.at(-1).id, capturedMentatDiscardId, "Captured Mentat should discard the selected card");
  assert.equal(ownerAfter.hand.at(-1).id, capturedMentatDrawId, "Captured Mentat should draw one deck card");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene + 1, "Captured Mentat should gain chosen Influence");

  await setDebugGameAndWait(page, states.spaceTimeFolding);
  pendingText = await page.locator(".pending-panel").innerText();
  const spaceTimeFoldingDiscardName = states.spaceTimeFolding.spaceTimeFoldingDiscardName;
  const spaceTimeFoldingDiscardId = states.spaceTimeFolding.spaceTimeFoldingDiscardId;
  const spaceTimeFoldingDrawOneId = states.spaceTimeFolding.spaceTimeFoldingDrawOneId;
  const spaceTimeFoldingDrawTwoId = states.spaceTimeFolding.spaceTimeFoldingDrawTwoId;
  assert.match(pendingText, /Space-time Folding/i);
  assert.match(pendingText, new RegExp(escapeRegExp(spaceTimeFoldingDiscardName)));
  assert.match(pendingText, /Spacing Guild/i);
  await screenshot(page, captures, "pending-space-time-folding-discard-draw.png");

  await page.locator(".pending-panel").getByRole("button", { name: spaceTimeFoldingDiscardName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: /Resolve Space-time Folding/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.at(-1).id, spaceTimeFoldingDiscardId, "Space-time Folding should discard the selected card");
  assert.ok(
    ownerAfter.hand.some((card) => card.id === spaceTimeFoldingDrawOneId) &&
      ownerAfter.hand.some((card) => card.id === spaceTimeFoldingDrawTwoId),
    "Space-time Folding should draw two cards after discarding a Spacing Guild card",
  );

  await setDebugGameAndWait(page, states.guildEnvoy);
  pendingText = await page.locator(".pending-panel").innerText();
  const guildEnvoyDiscardName = states.guildEnvoy.guildEnvoyDiscardName;
  const guildEnvoyDiscardId = states.guildEnvoy.guildEnvoyDiscardId;
  const guildEnvoyDrawOneId = states.guildEnvoy.guildEnvoyDrawOneId;
  const guildEnvoyDrawTwoId = states.guildEnvoy.guildEnvoyDrawTwoId;
  assert.match(pendingText, /Guild Envoy/i);
  assert.match(pendingText, new RegExp(escapeRegExp(guildEnvoyDiscardName)));
  assert.match(pendingText, /draw 2 cards/i);
  await screenshot(page, captures, "pending-guild-envoy-discard-draw.png");

  await page.locator(".pending-panel").getByRole("button", { name: guildEnvoyDiscardName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: /Resolve Guild Envoy/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.at(-1).id, guildEnvoyDiscardId, "Guild Envoy should discard the selected card");
  assert.ok(
    ownerAfter.hand.some((card) => card.id === guildEnvoyDrawOneId) &&
      ownerAfter.hand.some((card) => card.id === guildEnvoyDrawTwoId),
    "Guild Envoy should draw two cards after discarding a Spacing Guild card",
  );

  await setDebugGameAndWait(page, states.guildSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  const guildSpyDiscardName = states.guildSpy.guildSpyDiscardName;
  const guildSpyDiscardId = states.guildSpy.guildSpyDiscardId;
  const guildSpyDrawId = states.guildSpy.guildSpyDrawId;
  const guildSpyIntrigueId = states.guildSpy.guildSpyIntrigueId;
  assert.match(pendingText, /Guild Spy/i);
  assert.match(pendingText, new RegExp(escapeRegExp(guildSpyDiscardName)));
  assert.match(pendingText, /Intrigue card/i);
  await screenshot(page, captures, "pending-guild-spy-discard-draw.png");

  await page.locator(".pending-panel").getByRole("button", { name: guildSpyDiscardName }).click();
  const guildSpyResolveButton = page
    .locator(".pending-panel")
    .getByRole("button", { name: "Resolve Guild Spy (1 card, 1 Intrigue card)" });
  assert.equal(await guildSpyResolveButton.isVisible(), true, "Guild Spy resolve button should include card and Intrigue rewards");
  await guildSpyResolveButton.click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.discard.at(-1).id, guildSpyDiscardId, "Guild Spy should discard the selected card");
  assert.ok(
    ownerAfter.hand.some((card) => card.id === guildSpyDrawId),
    "Guild Spy should draw one card after discarding a Spacing Guild card",
  );
  assert.ok(
    ownerAfter.intrigues.some((card) => card.id === guildSpyIntrigueId),
    "Guild Spy should draw an Intrigue after discarding a Spacing Guild card",
  );

  await setDebugGameAndWait(page, states.corrinthCity);
  pendingText = await page.locator(".pending-panel").innerText();
  const corrinthDiscardOneName = states.corrinthCity.corrinthDiscardOneName;
  const corrinthDiscardTwoName = states.corrinthCity.corrinthDiscardTwoName;
  const corrinthDiscardOneId = states.corrinthCity.corrinthDiscardOneId;
  const corrinthDiscardTwoId = states.corrinthCity.corrinthDiscardTwoId;
  assert.match(pendingText, /Corrinth City/i);
  assert.match(pendingText, /Discard 2 cards/i);
  assert.match(pendingText, /spend 5 Solari/i);
  assert.match(pendingText, /gain 1 VP/i);
  await screenshot(page, captures, "pending-corrinth-city-discard-reward.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: corrinthDiscardOneName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: `Discard ${corrinthDiscardOneName}` }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame()?.pendingAction?.remaining === 1);
  after = await currentGame(page);
  assert.equal(after.pendingAction?.kind, "discard-cards-for-reward", "Corrinth City should remain pending after one discard");
  assert.equal(after.pendingAction?.remaining, 1, "Corrinth City should show one remaining discard");
  await page.locator(".pending-panel").getByRole("button", { name: corrinthDiscardTwoName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Resolve Corrinth City" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari - 5, "Corrinth City should spend 5 Solari after both discards");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Corrinth City should grant 1 VP after both discards");
  assert.deepEqual(
    ownerAfter.discard.slice(-2).map((card) => card.id),
    [corrinthDiscardOneId, corrinthDiscardTwoId],
    "Corrinth City should discard both selected cards",
  );

  await setDebugGameAndWait(page, states.corrinthCityHighCouncil);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Corrinth City/i);
  assert.match(pendingText, /High Council seat/i);
  assert.match(pendingText, /Spend 5 Solari/i);
  assert.match(pendingText, /forgo 5 persuasion/i);
  assert.match(pendingText, /gain 2 persuasion/i);
  await screenshot(page, captures, "pending-corrinth-city-high-council.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 5 Solari/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.highCouncilSeat, true, "Corrinth City Reveal should take the High Council seat");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari - 5, "Corrinth City Reveal should spend 5 Solari");
  assert.equal(ownerAfter.persuasion, 2, "Corrinth City Reveal should replace +5 persuasion with the current High Council +2");

  await setDebugGameAndWait(page, states.deliveryAgreementRevealTrash);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Delivery Agreement/i);
  assert.match(pendingText, /Trash reward: gain 1 VP/i);
  assert.match(pendingText, /Skip/i);
  await screenshot(page, captures, "pending-delivery-agreement-reveal-trash.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  assert.equal(ownerBefore.resources.spice, 1, "Delivery Agreement should gain its Reveal spice before the VP trash choice");
  await page.locator(".pending-panel").getByRole("button", { name: /Delivery Agreement \(in play\)/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Delivery Agreement Reveal trash should gain 1 VP");
  assert.equal(
    ownerAfter.playArea.some((card) => card.id === before.pendingAction.requiredCardId),
    false,
    "Delivery Agreement Reveal trash should remove the source card from play",
  );

  await setDebugGameAndWait(page, states.longLiveTheFighters);
  pendingText = await page.locator(".pending-panel").innerText();
  const longLiveDrawnName = states.longLiveTheFighters.longLiveDrawnName;
  const longLiveDrawnId = states.longLiveTheFighters.longLiveDrawnId;
  const longLiveDiscardedName = states.longLiveTheFighters.longLiveDiscardedName;
  const longLiveDiscardedId = states.longLiveTheFighters.longLiveDiscardedId;
  const longLiveTrashedName = states.longLiveTheFighters.longLiveTrashedName;
  const longLiveTrashedId = states.longLiveTheFighters.longLiveTrashedId;
  const longLiveRemainingId = states.longLiveTheFighters.longLiveRemainingId;
  assert.match(pendingText, /Long Live the Fighters/i);
  assert.match(pendingText, /Look at the top 3 cards/i);
  assert.match(pendingText, new RegExp(escapeRegExp(longLiveDrawnName)));
  assert.match(pendingText, new RegExp(escapeRegExp(longLiveDiscardedName)));
  assert.match(pendingText, new RegExp(escapeRegExp(longLiveTrashedName)));
  const longLiveResolveButton = page.locator(".pending-panel").getByRole("button", { name: "Resolve Long Live the Fighters" });
  assert.equal(await longLiveResolveButton.isDisabled(), true, "Long Live resolve button should wait for draw/discard/trash assignments");
  await screenshot(page, captures, "pending-long-live-top-deck.png");

  const longLiveMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(longLiveMobileViewport);
  await setDebugGameAndWait(page, states.longLiveTheFighters);
  const longLiveMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    longLiveMobileScrollWidth <= longLiveMobileViewport.width,
    `Long Live mobile pending panel should not overflow horizontally (${longLiveMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-long-live-top-deck-mobile.png");
  const longLiveTabletViewport = { width: 900, height: 1000 };
  await page.setViewportSize(longLiveTabletViewport);
  await setDebugGameAndWait(page, states.longLiveTheFighters);
  const longLiveTabletScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    longLiveTabletScrollWidth <= longLiveTabletViewport.width,
    `Long Live tablet pending panel should not overflow horizontally (${longLiveTabletScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-long-live-top-deck-tablet.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await setDebugGameAndWait(page, states.longLiveTheFighters);

  const longLiveTopDeckCard = (name) => page.locator(".top-deck-selection-card").filter({ hasText: name });
  await longLiveTopDeckCard(longLiveDrawnName)
    .getByRole("button", { name: new RegExp(`^Draw ${escapeRegExp(longLiveDrawnName)}$`) })
    .click();
  await longLiveTopDeckCard(longLiveDiscardedName)
    .getByRole("button", { name: new RegExp(`^Discard ${escapeRegExp(longLiveDiscardedName)}$`) })
    .click();
  await longLiveTopDeckCard(longLiveTrashedName)
    .getByRole("button", { name: new RegExp(`^Trash ${escapeRegExp(longLiveTrashedName)}$`) })
    .click();
  assert.equal(await longLiveResolveButton.isDisabled(), false, "Long Live resolve button should enable after all roles are assigned");
  await screenshot(page, captures, "pending-long-live-top-deck-selected.png");
  await setDebugGameAndWait(page, states.longLiveTheFightersAlternate);
  const alternateResolveButton = page.locator(".pending-panel").getByRole("button", { name: "Resolve Long Live the Fighters" });
  assert.equal(await alternateResolveButton.isDisabled(), true, "Long Live selections should reset when inspected pending cards change");
  assert.equal(
    await page.locator(".top-deck-selection-roles button.selected").count(),
    0,
    "Long Live should not carry selected role styling across inspected pending cards",
  );

  await setDebugGameAndWait(page, states.longLiveTheFighters);
  await longLiveTopDeckCard(longLiveDrawnName)
    .getByRole("button", { name: new RegExp(`^Draw ${escapeRegExp(longLiveDrawnName)}$`) })
    .click();
  await longLiveTopDeckCard(longLiveDiscardedName)
    .getByRole("button", { name: new RegExp(`^Discard ${escapeRegExp(longLiveDiscardedName)}$`) })
    .click();
  await longLiveTopDeckCard(longLiveTrashedName)
    .getByRole("button", { name: new RegExp(`^Trash ${escapeRegExp(longLiveTrashedName)}$`) })
    .click();
  await longLiveResolveButton.click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.ok(ownerAfter.hand.some((card) => card.id === longLiveDrawnId), "Long Live should draw the selected inspected card");
  assert.equal(ownerAfter.discard.at(-1).id, longLiveDiscardedId, "Long Live should discard the selected inspected card");
  assert.deepEqual(ownerAfter.deck.map((card) => card.id), [longLiveRemainingId], "Long Live should leave only uninspected cards in deck");
  assert.equal(
    [...ownerAfter.hand, ...ownerAfter.discard, ...ownerAfter.deck, ...ownerAfter.playArea].some((card) => card.id === longLiveTrashedId),
    false,
    "Long Live should trash the selected inspected card",
  );

  await setDebugGameAndWait(page, states.longLiveTheFightersStale);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Long Live the Fighters/i);
  assert.match(pendingText, /Not enough deck cards/i);
  assert.equal(
    await page.locator(".top-deck-selection-roles button").count(),
    0,
    "Stale Long Live pending choices should not expose inactive role buttons",
  );
  await screenshot(page, captures, "pending-long-live-top-deck-stale.png");

  await page.locator(".pending-panel").getByRole("button", { name: "Skip Long Live the Fighters" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.deepEqual(
    ownerAfter.deck.map((card) => card.id),
    [states.longLiveTheFightersStale.longLiveDiscardedId, states.longLiveTheFightersStale.longLiveDrawnId],
    "Skipping a stale Long Live top-deck choice should leave the remaining deck intact",
  );

  await setDebugGameAndWait(page, states.branchingPath);
  pendingText = await page.locator(".pending-panel").innerText();
  const branchingPathTrashName = states.branchingPath.branchingPathTrashName;
  const branchingPathTrashId = states.branchingPath.branchingPathTrashId;
  const branchingPathRewardIntrigueId = states.branchingPath.branchingPathRewardIntrigueId;
  assert.match(pendingText, /Branching Path/i);
  assert.match(pendingText, new RegExp(escapeRegExp(branchingPathTrashName)));
  assert.match(pendingText, /draw 1 Intrigue card/i);
  assert.match(pendingText, /2 spice/i);
  assert.equal(
    await page.locator(".pending-panel").getByRole("button", { name: "Skip" }).isVisible(),
    true,
    "Branching Path should expose a Skip button",
  );
  await screenshot(page, captures, "pending-branching-path-trash-intrigue.png");
  const trashIntrigueMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(trashIntrigueMobileViewport);
  const trashIntrigueMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    trashIntrigueMobileScrollWidth <= trashIntrigueMobileViewport.width,
    `Trash Intrigue mobile pending panel should not overflow horizontally (${trashIntrigueMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-branching-path-trash-intrigue-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Skip" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.ok(
    ownerAfter.intrigues.some((card) => card.id === branchingPathTrashId),
    "Skipping Branching Path should keep the selected Intrigue",
  );
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice, "Skipping Branching Path should not gain spice");

  await setDebugGameAndWait(page, states.branchingPath);
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: branchingPathTrashName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Resolve Branching Path" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    [
      ...after.intrigueDeck,
      ...after.intrigueDiscard,
      ...ownerAfter.intrigues,
    ].some((card) => card.id === branchingPathTrashId),
    false,
    "Branching Path should remove the selected Intrigue from the Intrigue draw cycle",
  );
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice + 2, "Branching Path should gain 2 spice");
  assert.ok(
    ownerAfter.intrigues.some((card) => card.id === branchingPathRewardIntrigueId),
    "Branching Path should draw one replacement Intrigue",
  );

  await setDebugGameAndWait(page, states.junctionHeadquarters);
  pendingText = await page.locator(".pending-panel").innerText();
  const junctionTrashName = states.junctionHeadquarters.junctionTrashName;
  const junctionTrashId = states.junctionHeadquarters.junctionTrashId;
  assert.match(pendingText, /Junction Headquarters/i);
  assert.match(pendingText, new RegExp(escapeRegExp(junctionTrashName)));
  assert.match(pendingText, /spend 2 spice/i);
  assert.match(pendingText, /gain 1 VP/i);
  await screenshot(page, captures, "pending-junction-headquarters-trash-intrigue.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: junctionTrashName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: "Resolve Junction Headquarters" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(
    [
      ...after.intrigueDeck,
      ...after.intrigueDiscard,
      ...ownerAfter.intrigues,
    ].some((card) => card.id === junctionTrashId),
    false,
    "Junction Headquarters should remove the selected Intrigue from the Intrigue draw cycle",
  );
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice - 2, "Junction Headquarters should spend 2 spice");
  assert.equal(ownerAfter.vp, ownerBefore.vp + 1, "Junction Headquarters should gain 1 VP");

  await setDebugGameAndWait(page, states.junctionHeadquartersNoPay);
  pendingText = await page.locator(".pending-panel").innerText();
  const junctionNoPayTrashName = states.junctionHeadquartersNoPay.junctionTrashName;
  assert.match(pendingText, /Junction Headquarters/i);
  assert.match(pendingText, /spend 2 spice/i);
  assert.match(pendingText, /Skip/i);
  await page.locator(".pending-panel").getByRole("button", { name: junctionNoPayTrashName }).click();
  const junctionNoPayResolve = page.locator(".pending-panel").getByRole("button", { name: "Resolve Junction Headquarters" });
  assert.equal(await junctionNoPayResolve.isDisabled(), true, "Unpayable Junction Headquarters resolve button should be disabled");
  await screenshot(page, captures, "pending-junction-headquarters-no-pay-trash-intrigue.png");

  await setDebugGameAndWait(page, states.strikeFleetDeploy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /deployment/i);
  assert.match(pendingText, /4 deployable/i);
  before = await currentGame(page);
  assert.equal(before.pendingAction?.source, "Arrakeen", "Strike Fleet deployment should come from Arrakeen");
  await screenshot(page, captures, "pending-strike-fleet-deploy.png");

  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Deploy 1" }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame()?.pendingAction?.remaining === 3);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison - 1, "Strike Fleet deploy should move one garrison troop");
  assert.equal(ownerAfter.deployedTroops, ownerBefore.deployedTroops + 1, "Strike Fleet deploy should add one conflict troop");
  assert.equal(after.turnUnitDeployments.p2, 1, "Strike Fleet deploy should count as a same-turn unit deployment");
  await page.locator(".pending-panel").getByRole("button", { name: "Done" }).click();
  await waitForNoPending(page);

  await setDebugGameAndWait(page, states.payResourceTroopsNoSupply);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Corrino Might/i);
  assert.match(pendingText, /both Allies/i);
  const payResourceTroopsNoSupplyButton = page
    .locator(".pending-panel")
    .getByRole("button", { name: /Spend 3 spice: both Allies \+2 troops/ });
  assert.equal(
    await payResourceTroopsNoSupplyButton.isDisabled(),
    true,
    "No-supply pay-resource-for-troops button should be disabled",
  );
  await screenshot(page, captures, "pending-pay-resource-troops-no-supply.png");

  await setDebugGameAndWait(page, states.paidRewardNoSupply);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Emperor of the Known Universe/i);
  assert.match(pendingText, /Princess Irulan recruits 1 troop/i);
  const paidRewardNoSupplyButton = page
    .locator(".pending-panel")
    .getByRole("button", { name: /Spend 2: Princess Irulan recruits 1 troop/ });
  assert.equal(
    await paidRewardNoSupplyButton.isDisabled(),
    true,
    "No-supply paid reward troop button should be disabled",
  );
  await screenshot(page, captures, "pending-paid-reward-no-supply.png");

  await setDebugGameAndWait(page, states.shaddamsFavorNoSupply);
  const shaddamsFavorNoSupplyButton = page
    .locator(".intrigue-hand")
    .getByRole("button", { name: /Recruit/ });
  assert.equal(
    await shaddamsFavorNoSupplyButton.isDisabled(),
    true,
    "Shaddam's Favor should be disabled when it cannot recruit and cannot gain Solari",
  );
  await screenshot(page, captures, "intrigue-shaddams-favor-no-supply.png");

  await setDebugGameAndWait(page, states.departForArrakisNoSupplyNoDraw);
  const departForArrakisNoSupplyButton = page
    .locator(".intrigue-hand")
    .getByRole("button", { name: /2 Spice -> 3 Troops/ });
  assert.equal(
    await departForArrakisNoSupplyButton.isDisabled(),
    true,
    "Depart For Arrakis spend branch should be disabled when it cannot recruit or draw",
  );
  await screenshot(page, captures, "intrigue-depart-for-arrakis-no-supply.png");

  await setDebugGameAndWait(page, states.covertOperation);
  pendingText = await page.locator(".pending-panel").innerText();
  const covertOperationDiscardName = states.covertOperation.covertOperationDiscardName;
  const covertOperationDiscardId = states.covertOperation.covertOperationDiscardId;
  const covertOperationOpponentId = states.covertOperation.covertOperationOpponentId;
  assert.match(pendingText, /Covert Operation/i);
  assert.match(pendingText, new RegExp(escapeRegExp(covertOperationDiscardName)));
  await screenshot(page, captures, "pending-covert-operation-opponent-discard.png");
  const covertOperationMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(covertOperationMobileViewport);
  const covertOperationMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    covertOperationMobileScrollWidth <= covertOperationMobileViewport.width,
    `Covert Operation mobile pending panel should not overflow horizontally (${covertOperationMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-covert-operation-opponent-discard-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  await page.locator(".pending-panel").getByRole("button", { name: covertOperationDiscardName }).click();
  await page.locator(".pending-panel").getByRole("button", { name: `Discard ${covertOperationDiscardName}` }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const covertOperationOpponentAfter = after.players.find((player) => player.id === covertOperationOpponentId);
  assert.equal(
    covertOperationOpponentAfter.discard.at(-1).id,
    covertOperationDiscardId,
    "Covert Operation should discard the selected opponent card",
  );

  await setDebugGameAndWait(page, states.ecologicalTestingStation);
  pendingText = await page.locator(".pending-panel").innerText();
  const ecologicalTestingStationDrawOneId = states.ecologicalTestingStation.ecologicalTestingStationDrawOneId;
  const ecologicalTestingStationDrawTwoId = states.ecologicalTestingStation.ecologicalTestingStationDrawTwoId;
  assert.match(pendingText, /Ecological Testing Station/i);
  assert.match(pendingText, /Spend 2 water: draw 2 cards/i);
  await screenshot(page, captures, "pending-ecological-testing-station-pay-draw.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 2 water: draw 2 cards/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.water, ownerBefore.resources.water - 2, "Ecological Testing Station should spend 2 water");
  assert.ok(
    ownerAfter.hand.some((card) => card.id === ecologicalTestingStationDrawOneId) &&
      ownerAfter.hand.some((card) => card.id === ecologicalTestingStationDrawTwoId),
    "Ecological Testing Station should draw two cards after payment",
  );

  await setDebugGameAndWait(page, states.capturedMentatReveal);
  pendingText = await page.locator(".pending-panel").innerText();
  const capturedMentatIntrigueId = states.capturedMentatReveal.capturedMentatIntrigueId;
  assert.match(pendingText, /Captured Mentat reveal/i);
  assert.match(pendingText, /Bene Gesserit/i);
  await screenshot(page, captures, "pending-captured-mentat-reveal.png");
  const capturedMentatRevealMobileViewport = { width: 390, height: 900 };
  await page.setViewportSize(capturedMentatRevealMobileViewport);
  const capturedMentatRevealMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(
    capturedMentatRevealMobileScrollWidth <= capturedMentatRevealMobileViewport.width,
    `Captured Mentat reveal mobile pending panel should not overflow horizontally (${capturedMentatRevealMobileScrollWidth}px)`,
  );
  await screenshot(page, captures, "pending-captured-mentat-reveal-mobile-390.png");
  await page.setViewportSize({ width: 1440, height: 1100 });

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Bene Gesserit" }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.influence.bene, ownerBefore.influence.bene - 1, "Captured Mentat reveal should lose chosen Influence");
  assert.equal(ownerAfter.intrigues.at(-1).id, capturedMentatIntrigueId, "Captured Mentat reveal should draw one Intrigue");

  await setDebugGameAndWait(page, states.acquireEmpty);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /No eligible cards that cost exactly 99/i);
  await screenshot(page, captures, "pending-acquire-card-empty.png");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertPendingButtonNamed(page, name, message) {
  const count = await page.locator(".pending-panel").getByRole("button", { name }).count();
  assert.equal(count, 1, message);
}
