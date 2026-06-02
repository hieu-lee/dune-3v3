import assert from "node:assert/strict";

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

  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: contractName }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Contract choice should add one contract");
  assert.equal(ownerAfter.contracts.at(-1).card.name, contractName, "Contract choice should take the selected contract");

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
  assert.match(pendingText, new RegExp(escapeRegExp(acquireName)));
  await screenshot(page, captures, "pending-acquire-card.png");

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
  assert.match(pendingText, /Prepare The Way/i);
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

  await setDebugGameAndWait(page, states.acquireSpyNetwork);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Spy Network/i);
  assert.match(pendingText, /spies ready/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  await screenshot(page, captures, "pending-acquire-spy-network-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: states.acquireSpyNetwork.spySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "Spy Network acquire bonus should spend one spy");
  assert.equal(after.spyPosts[states.acquireSpyNetwork.spySpaceId], "p2", "Spy Network acquire bonus should place the chosen spy");
  assert.equal(ownerAfter.discard.at(-1).name, "Spy Network", "Spy Network should remain acquired after resolving its spy bonus");

  await setDebugGameAndWait(page, states.beneGesseritOperativeSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Bene Gesserit Operative/i);
  assert.match(pendingText, /spies ready/i);
  assert.equal(await page.locator(".pending-panel").getByRole("button", { name: "Done" }).isDisabled(), true);
  await screenshot(page, captures, "pending-bene-gesserit-operative-spy.png");

  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeSpy.spySpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, ownerBefore.spies - 1, "Bene Gesserit Operative should spend one spy");
  assert.equal(after.spyPosts[states.beneGesseritOperativeSpy.spySpaceId], "p2", "Bene Gesserit Operative should place the chosen spy");

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
  assert.equal(after.spyPosts[states.doubleAgentSharedSpy.sharedSpySpaceId], "p3", "Double Agent should keep the original spy owner");
  assert.deepEqual(after.sharedSpyPosts[states.doubleAgentSharedSpy.sharedSpySpaceId], ["p2"], "Double Agent should share the target spy post");

  await setDebugGameAndWait(page, states.beneGesseritOperativeRecallSpy);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Bene Gesserit Operative/i);
  assert.match(pendingText, /0 spies ready/i);
  assert.match(pendingText, /Recall one spy for supply/i);
  await screenshot(page, captures, "pending-bene-gesserit-operative-recall-spy.png");

  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeRecallSpy.spyRecallSpaceName }).click();
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /1 spies ready/i);
  assert.match(pendingText, new RegExp(escapeRegExp(states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallSpaceName)));
  await page.locator(".pending-panel").getByRole("button", { name: states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallSpaceName }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.spies, 0, "Bene Gesserit Operative recall path should spend the recalled spy");
  assert.equal(after.spyPosts[states.beneGesseritOperativeRecallSpy.spyRecallSpaceId], undefined, "Bene Gesserit Operative should remove the recalled spy");
  assert.equal(
    after.spyPosts[states.beneGesseritOperativeRecallSpy.spyPlaceAfterRecallSpaceId],
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

  await setDebugGameAndWait(page, states.covertOperation);
  pendingText = await page.locator(".pending-panel").innerText();
  const covertOperationDiscardName = states.covertOperation.covertOperationDiscardName;
  const covertOperationDiscardId = states.covertOperation.covertOperationDiscardId;
  const covertOperationOpponentId = states.covertOperation.covertOperationOpponentId;
  assert.match(pendingText, /Covert Operation/i);
  assert.match(pendingText, new RegExp(escapeRegExp(covertOperationDiscardName)));
  await screenshot(page, captures, "pending-covert-operation-opponent-discard.png");

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
  assert.match(pendingText, /No eligible cards cost 99 or less/i);
  await screenshot(page, captures, "pending-acquire-card-empty.png");
}

async function createCardChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const game = initialPlayableGame(state);
  const ownerId = "p2";
  const activeSeat = game.players.findIndex((player) => player.id === ownerId);
  assert.ok(activeSeat >= 0, "Expected p2 in browser debug game");
  assert.ok(game.contractOffer[0], "Expected at least one public contract");
  assert.ok(game.imperiumRow[0], "Expected at least one Imperium Row card");
  const prepareTheWay = game.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Expected Prepare The Way reserve card");
  const spyNetwork = data.imperiumDeck.find((card) => card.sourceId === 25);
  assert.ok(spyNetwork, "Expected Spy Network Imperium card");
  const spyNetworkReplacement = data.imperiumDeck.find((card) => card.id !== spyNetwork.id);
  assert.ok(spyNetworkReplacement, "Expected Spy Network replacement card");
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.sourceId === 30);
  assert.ok(beneGesseritOperative, "Expected Bene Gesserit Operative Imperium card");
  const doubleAgent = data.imperiumDeck.find((card) => card.sourceId === 37);
  assert.ok(doubleAgent, "Expected Double Agent Imperium card");
  const spaceTimeFolding = data.imperiumDeck.find((card) => card.sourceId === 12);
  assert.ok(spaceTimeFolding, "Expected Space-time Folding Imperium card");
  const guildEnvoy = data.imperiumDeck.find((card) => card.sourceId === 38);
  assert.ok(guildEnvoy, "Expected Guild Envoy Imperium card");
  const ecologicalTestingStation = data.imperiumDeck.find((card) => card.sourceId === 46);
  assert.ok(ecologicalTestingStation, "Expected Ecological Testing Station Imperium card");
  const covertOperation = data.imperiumDeck.find((card) => card.sourceId === 35);
  assert.ok(covertOperation, "Expected Covert Operation Imperium card");
  const spySpace = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(spySpace, "Expected High Council spy placement space");
  const spyPlaceAfterRecallSpace = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(spyPlaceAfterRecallSpace, "Expected Secrets spy placement space");
  const deliverSupplies = data.boardSpaces.find((space) => space.id === "deliver-supplies");
  assert.ok(deliverSupplies, "Expected Deliver Supplies board space");
  const spiceRefinery = data.boardSpaces.find((space) => space.id === "spice-refinery");
  assert.ok(spiceRefinery, "Expected Spice Refinery board space");
  const capturedMentat = data.imperiumDeck.find((card) => card.sourceId === 61);
  assert.ok(capturedMentat, "Expected Captured Mentat Imperium card");
  const capturedMentatDiscard = { ...data.allyStarterCards[0], id: "browser-captured-mentat-discard-card" };
  const capturedMentatDraw = { ...data.imperiumDeck.find((card) => card.name === "Calculus of Power"), id: "browser-captured-mentat-draw-card" };
  assert.ok(capturedMentatDraw.name, "Expected Captured Mentat draw card");
  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "browser-captured-mentat-intrigue-card" };
  assert.ok(capturedMentatIntrigue.name, "Expected Captured Mentat reveal Intrigue card");
  const spaceTimeFoldingDiscard = {
    ...spaceTimeFolding,
    id: "browser-space-time-folding-discard-card",
    name: "Spacing Guild Debug Card",
  };
  const spaceTimeFoldingDrawOne = { ...data.allyStarterCards[1], id: "browser-space-time-folding-draw-one-card" };
  const spaceTimeFoldingDrawTwo = { ...data.allyStarterCards[2], id: "browser-space-time-folding-draw-two-card" };
  const guildEnvoyDiscard = {
    ...guildEnvoy,
    id: "browser-guild-envoy-discard-card",
    name: "Guild Envoy Spacing Guild Card",
  };
  const guildEnvoyDrawOne = { ...data.allyStarterCards[3], id: "browser-guild-envoy-draw-one-card" };
  const guildEnvoyDrawTwo = { ...data.allyStarterCards[4], id: "browser-guild-envoy-draw-two-card" };
  const ecologicalTestingStationDrawOne = {
    ...data.allyStarterCards[0],
    id: "browser-ecological-testing-station-draw-one-card",
  };
  const ecologicalTestingStationDrawTwo = {
    ...data.allyStarterCards[1],
    id: "browser-ecological-testing-station-draw-two-card",
  };
  const covertOperationDiscard = {
    ...data.allyStarterCards[0],
    id: "browser-covert-operation-discard-card",
    name: "Covert Operation Debug Discard",
  };

  const base = {
    ...game,
    activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };
  const beneGesseritOperativeAgentBase = {
    ...base,
    players: base.players.map((player) =>
      player.id === ownerId
        ? {
            ...player,
            agentsReady: 1,
            hand: [beneGesseritOperative],
            playArea: [],
            resources: { solari: 0, spice: 0, water: 0 },
            spies: 3,
          }
        : player,
    ),
  };
  const beneGesseritOperativeSpyState = turnActions.placeAgentAction(beneGesseritOperativeAgentBase, {
    commanderTargets: {},
    selectedCard: beneGesseritOperative,
    selectedSpace: spyPlaceAfterRecallSpace,
  });
  const beneGesseritOperativeRecallSpyState = turnActions.placeAgentAction(
    {
      ...beneGesseritOperativeAgentBase,
      spyPosts: { [spySpace.id]: ownerId },
      players: beneGesseritOperativeAgentBase.players.map((player) =>
        player.id === ownerId ? { ...player, spies: 0 } : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: beneGesseritOperative,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  const doubleAgentSharedSpyState = turnActions.placeAgentAction(
    {
      ...base,
      spyPosts: { [spySpace.id]: ownerId, [spyPlaceAfterRecallSpace.id]: "p3" },
      sharedSpyPosts: {},
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              hand: [doubleAgent],
              playArea: [],
              resources: { solari: 6, spice: 0, water: 0 },
              spies: 2,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: doubleAgent,
      selectedSpace: spySpace,
    },
  );
  const spaceTimeFoldingState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [spaceTimeFoldingDrawOne, spaceTimeFoldingDrawTwo],
              discard: [],
              hand: [spaceTimeFolding, spaceTimeFoldingDiscard],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: spaceTimeFolding,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(spaceTimeFoldingState.pendingAction?.kind, "discard-card-for-draw", "Expected Space-time Folding discard-draw pending action");
  const guildEnvoyState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
              discard: [],
              hand: [guildEnvoy, guildEnvoyDiscard],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(guildEnvoyState.pendingAction?.kind, "discard-card-for-draw", "Expected Guild Envoy discard-draw pending action");
  const ecologicalTestingStationState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [ecologicalTestingStationDrawOne, ecologicalTestingStationDrawTwo],
              discard: [],
              garrison: 0,
              hand: [ecologicalTestingStation],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 2 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: ecologicalTestingStation,
      selectedSpace: spiceRefinery,
    },
  );
  assert.equal(
    ecologicalTestingStationState.pendingAction?.kind,
    "pay-resource-for-draw-cards",
    "Expected Ecological Testing Station resource-for-draw pending action",
  );
  const covertOperationOwner = base.players.find((player) => player.id === ownerId);
  assert.ok(covertOperationOwner, "Expected Covert Operation owner");
  const covertOperationSource = {
    ...covertOperationOwner,
    agentsReady: 0,
    hand: [],
    playArea: [covertOperation],
  };
  const covertOperationOpponent = base.players.find((player) => player.team !== covertOperationSource.team);
  assert.ok(covertOperationOpponent, "Expected an opposing player for Covert Operation");
  const covertOperationBase = {
    ...base,
    players: base.players.map((player) => {
      if (player.id === ownerId) return covertOperationSource;
      if (player.id === covertOperationOpponent.id) {
        return { ...player, discard: [], hand: [covertOperationDiscard] };
      }
      return player.team !== covertOperationSource.team ? { ...player, hand: [] } : player;
    }),
  };
  const covertOperationPendings = state.pendingActionsForCard(
    covertOperation,
    covertOperationSource,
    covertOperationBase,
  );
  assert.equal(covertOperationPendings.length, 1, "Expected one Covert Operation opponent discard pending action");
  assert.equal(covertOperationPendings[0].kind, "discard-hand-card", "Expected Covert Operation hand-discard pending action");
  const covertOperationState = {
    ...covertOperationBase,
    pendingAction: covertOperationPendings[0],
    pendingQueue: covertOperationPendings.slice(1),
  };
  const acquireSpyNetworkState = state.acquireMarketCard(
    {
      ...base,
      imperiumRow: [spyNetwork],
      marketDeck: [spyNetworkReplacement],
      spyPosts: {},
      sharedSpyPosts: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              discard: [],
              persuasion: spyNetwork.cost,
              revealed: true,
              spies: 1,
            }
          : player,
      ),
    },
    ownerId,
    spyNetwork.id,
  );
  assert.equal(
    acquireSpyNetworkState.pendingAction?.kind,
    "spy",
    "Expected Spy Network purchase to queue a spy placement pending action",
  );

  return {
    contractPublic: {
      ...base,
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug contract",
      },
    },
    contractFallback: {
      ...base,
      contractOffer: [],
      contractDeck: [],
      players: base.players.map((player) =>
        player.id === ownerId ? { ...player, reservedContracts: [] } : player,
      ),
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug empty contract",
      },
    },
    acquire: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug acquire",
        maxCost: 99,
        destination: "discard",
      },
    },
    acquireReserve: {
      ...base,
      imperiumRow: [],
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug reserve acquire",
        minCost: prepareTheWay.cost,
        maxCost: prepareTheWay.cost,
        destination: "discard",
      },
    },
    acquireSpyNetwork: {
      ...acquireSpyNetworkState,
      spySpaceId: spySpace.id,
      spySpaceName: spySpace.name,
    },
    beneGesseritOperativeSpy: {
      ...beneGesseritOperativeSpyState,
      spySpaceId: spySpace.id,
      spySpaceName: spySpace.name,
    },
    doubleAgentSharedSpy: {
      ...doubleAgentSharedSpyState,
      sharedSpySpaceId: spyPlaceAfterRecallSpace.id,
      sharedSpySpaceName: spyPlaceAfterRecallSpace.name,
    },
    beneGesseritOperativeRecallSpy: {
      ...beneGesseritOperativeRecallSpyState,
      spyRecallSpaceId: spySpace.id,
      spyRecallSpaceName: spySpace.name,
      spyPlaceAfterRecallSpaceId: spyPlaceAfterRecallSpace.id,
      spyPlaceAfterRecallSpaceName: spyPlaceAfterRecallSpace.name,
    },
    capturedMentat: {
      ...base,
      capturedMentatDiscardId: capturedMentatDiscard.id,
      capturedMentatDiscardName: capturedMentatDiscard.name,
      capturedMentatDrawId: capturedMentatDraw.id,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              deck: [capturedMentatDraw],
              discard: [],
              hand: [capturedMentatDiscard],
              influence: { ...player.influence, bene: 0 },
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "discard-card-for-influence-and-draw",
        ownerId,
        source: "Captured Mentat",
        drawCards: 1,
        influenceAmount: 1,
        optional: true,
      },
    },
    spaceTimeFolding: {
      ...spaceTimeFoldingState,
      spaceTimeFoldingDiscardId: spaceTimeFoldingDiscard.id,
      spaceTimeFoldingDiscardName: spaceTimeFoldingDiscard.name,
      spaceTimeFoldingDrawOneId: spaceTimeFoldingDrawOne.id,
      spaceTimeFoldingDrawTwoId: spaceTimeFoldingDrawTwo.id,
    },
    guildEnvoy: {
      ...guildEnvoyState,
      guildEnvoyDiscardId: guildEnvoyDiscard.id,
      guildEnvoyDiscardName: guildEnvoyDiscard.name,
      guildEnvoyDrawOneId: guildEnvoyDrawOne.id,
      guildEnvoyDrawTwoId: guildEnvoyDrawTwo.id,
    },
    ecologicalTestingStation: {
      ...ecologicalTestingStationState,
      ecologicalTestingStationDrawOneId: ecologicalTestingStationDrawOne.id,
      ecologicalTestingStationDrawTwoId: ecologicalTestingStationDrawTwo.id,
    },
    covertOperation: {
      ...covertOperationState,
      covertOperationDiscardId: covertOperationDiscard.id,
      covertOperationDiscardName: covertOperationDiscard.name,
      covertOperationOpponentId: covertOperationOpponent.id,
    },
    capturedMentatReveal: {
      ...base,
      capturedMentatIntrigueId: capturedMentatIntrigue.id,
      intrigueDeck: [capturedMentatIntrigue],
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, bene: 1 },
              intrigues: [],
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "lose-influence-for-intrigues",
        ownerId,
        source: "Captured Mentat",
        amount: 1,
        optional: true,
      },
    },
    acquireEmpty: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug empty acquire",
        minCost: 99,
        maxCost: 99,
        destination: "discard",
        optional: true,
      },
    },
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
