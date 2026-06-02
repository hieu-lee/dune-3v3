import assert from "node:assert/strict";

export async function runCombatIntriguesSmoke({
  captures,
  currentGame,
  initialPlayableGame,
  openApp,
  page,
  screenshot,
  server,
  setDebugGameAndWait,
  url,
  writeJson,
}) {
  await openApp(page, url, 1440, 1100);
  const states = await createCombatIntrigueStates(server, initialPlayableGame);
  await writeJson("combat-intrigue-states.json", states);

  await setDebugGameAndWait(page, states.commander);
  let panelText = await page.locator(".combat-panel").innerText();
  assert.match(panelText, /Combat Intrigues/i);
  assert.match(panelText, /Muad'Dib/i);
  assert.match(panelText, /Tactical Option/i);
  assert.match(panelText, /Spice is Power/i);
  assert.match(panelText, /Gurney Halleck/i);
  assert.match(panelText, /Lady Jessica/i);
  await screenshot(page, captures, "combat-intrigues-commander.png");

  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, captures, "combat-intrigues-mobile.png");

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => window.scrollTo(0, 0));

  const beforeGoToGround = await currentGame(page);
  const gurneyBeforeGoToGround = playerById(beforeGoToGround, "p3");
  await combatCard(page, "Go To Ground").getByRole("button", { name: "Gurney Halleck: retreat 2 + spy" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "spy" &&
        game.pendingAction.ownerId === "p3" &&
        game.pendingAction.remaining === 1 &&
        game.pendingAction.source === "Go To Ground" &&
        gurney?.conflict === 2 &&
        gurney?.deployedTroops === 1 &&
        !muadDib?.intrigues.some((card) => card.name === "Go To Ground"),
    );
  });
  const afterGoToGround = await currentGame(page);
  const gurneyAfterGoToGround = playerById(afterGoToGround, "p3");
  assert.equal(
    gurneyAfterGoToGround.conflict,
    gurneyBeforeGoToGround.conflict - 4,
    "Go To Ground should remove the chosen troops' strength",
  );
  assert.equal(
    gurneyAfterGoToGround.deployedTroops,
    gurneyBeforeGoToGround.deployedTroops - 2,
    "Go To Ground should retreat the selected troop count",
  );
  assert.equal(
    gurneyAfterGoToGround.garrison,
    gurneyBeforeGoToGround.garrison + 2,
    "Go To Ground should return retreated troops to the recipient's garrison",
  );
  assert.deepEqual(
    afterGoToGround.pendingAction,
    { kind: "spy", ownerId: "p3", remaining: 1, source: "Go To Ground" },
    "Go To Ground should queue an optional spy-placement pending action for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-go-to-ground-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeSpiceIsPower = await currentGame(page);
  const gurneyBeforeSpiceIsPower = playerById(beforeSpiceIsPower, "p3");
  await combatCard(page, "Spice is Power").getByRole("button", { name: "Gurney Halleck: spend 3 (+6)" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const activePlayer = game?.players[game.activeSeat];
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        !game.pendingAction &&
        activePlayer?.id === "p3" &&
        gurney?.conflict === 12 &&
        gurney?.resources.spice === 1 &&
        !muadDib?.intrigues.some((card) => card.name === "Spice is Power"),
    );
  });
  const afterSpiceIsPower = await currentGame(page);
  const gurneyAfterSpiceIsPower = playerById(afterSpiceIsPower, "p3");
  assert.equal(
    gurneyAfterSpiceIsPower.conflict,
    gurneyBeforeSpiceIsPower.conflict + 6,
    "Spice is Power should add 6 strength through its typed spend branch",
  );
  assert.equal(
    gurneyAfterSpiceIsPower.resources.spice,
    gurneyBeforeSpiceIsPower.resources.spice - 3,
    "Spice is Power should spend the recipient's spice through its typed spend branch",
  );
  assert.equal(
    gurneyAfterSpiceIsPower.deployedTroops,
    gurneyBeforeSpiceIsPower.deployedTroops,
    "Spice is Power spend branch should not retreat troops",
  );
  await screenshot(page, captures, "combat-intrigues-spice-is-power-spend.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeImpress = await currentGame(page);
  const gurneyBeforeImpress = playerById(beforeImpress, "p3");
  await combatCard(page, "Impress").getByRole("button", { name: "Gurney Halleck: +2 + acquire" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "acquire-card" &&
        game.pendingAction.ownerId === "p3" &&
        game.pendingAction.source === "Impress" &&
        game.pendingAction.maxCost === 3 &&
        game.pendingAction.destination === "discard" &&
        gurney?.conflict === 8 &&
        !muadDib?.intrigues.some((card) => card.name === "Impress"),
    );
  });
  const afterImpress = await currentGame(page);
  const gurneyAfterImpress = playerById(afterImpress, "p3");
  assert.equal(gurneyAfterImpress.conflict, gurneyBeforeImpress.conflict + 2, "Impress should add 2 strength");
  assert.deepEqual(
    afterImpress.pendingAction,
    { kind: "acquire-card", ownerId: "p3", source: "Impress", maxCost: 3, destination: "discard" },
    "Impress should queue a mandatory acquire-card pending action for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-impress-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeFindWeakness = await currentGame(page);
  const gurneyBeforeFindWeakness = playerById(beforeFindWeakness, "p3");
  await combatCard(page, "Find Weakness").getByRole("button", { name: "Gurney Halleck (+2)" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "recall-spy" &&
        game.pendingAction.ownerId === "p1" &&
        game.pendingAction.combatRecipientId === "p3" &&
        game.pendingAction.remaining === 1 &&
        game.pendingAction.strength === 3 &&
        game.pendingAction.source === "Find Weakness" &&
        game.pendingAction.optional === true &&
        gurney?.conflict === 8 &&
        !muadDib?.intrigues.some((card) => card.name === "Find Weakness"),
    );
  });
  const afterFindWeakness = await currentGame(page);
  const gurneyAfterFindWeakness = playerById(afterFindWeakness, "p3");
  assert.equal(
    gurneyAfterFindWeakness.conflict,
    gurneyBeforeFindWeakness.conflict + 2,
    "Find Weakness should add base strength before optional spy recall",
  );
  assert.deepEqual(
    afterFindWeakness.pendingAction,
    {
      kind: "recall-spy",
      ownerId: "p1",
      combatRecipientId: "p3",
      remaining: 1,
      strength: 3,
      source: "Find Weakness",
      optional: true,
    },
    "Find Weakness should queue an optional Commander-owned spy recall for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-find-weakness-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeSpring = await currentGame(page);
  const gurneyBeforeSpring = playerById(beforeSpring, "p3");
  await combatCard(page, "Spring The Trap").getByRole("button", { name: "Gurney Halleck (+7)" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "recall-spy" &&
        game.pendingAction.ownerId === "p1" &&
        game.pendingAction.combatRecipientId === "p3" &&
        game.pendingAction.remaining === 2 &&
        game.pendingAction.strength === 7 &&
        game.pendingAction.source === "Spring The Trap" &&
        game.pendingAction.optional === false &&
        gurney?.conflict === 6 &&
        !muadDib?.intrigues.some((card) => card.name === "Spring The Trap"),
    );
  });
  const afterSpring = await currentGame(page);
  const gurneyAfterSpring = playerById(afterSpring, "p3");
  assert.equal(
    gurneyAfterSpring.conflict,
    gurneyBeforeSpring.conflict,
    "Spring The Trap should wait until both spy recalls resolve before adding strength",
  );
  assert.deepEqual(
    afterSpring.pendingAction,
    {
      kind: "recall-spy",
      ownerId: "p1",
      combatRecipientId: "p3",
      remaining: 2,
      strength: 7,
      source: "Spring The Trap",
      optional: false,
    },
    "Spring The Trap should queue a required Commander-owned spy recall for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-spring-recall-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeDevour = await currentGame(page);
  const gurneyBeforeDevour = playerById(beforeDevour, "p3");
  await combatCard(page, "Devour").getByRole("button", { name: "Gurney Halleck (+4)" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "trash-card" &&
        game.pendingAction.ownerId === "p3" &&
        game.pendingAction.source === "Devour" &&
        game.pendingAction.optional === true &&
        gurney?.conflict === 10 &&
        !muadDib?.intrigues.some((card) => card.name === "Devour"),
    );
  });
  const afterDevour = await currentGame(page);
  const gurneyAfterDevour = playerById(afterDevour, "p3");
  assert.equal(
    gurneyAfterDevour.conflict,
    gurneyBeforeDevour.conflict + 4,
    "Devour should add sandworm-enhanced strength before optional trash",
  );
  assert.deepEqual(
    afterDevour.pendingAction,
    {
      kind: "trash-card",
      ownerId: "p3",
      source: "Devour",
      optional: true,
    },
    "Devour should queue an optional trash-card pending action for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-devour-trash-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeQuestionable = await currentGame(page);
  const gurneyBeforeQuestionable = playerById(beforeQuestionable, "p3");
  await combatCard(page, "Questionable Methods").getByRole("button", { name: "Gurney Halleck (+1)" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "lose-influence" &&
        game.pendingAction.ownerId === "p3" &&
        game.pendingAction.combatRecipientId === "p3" &&
        game.pendingAction.strength === 4 &&
        game.pendingAction.source === "Questionable Methods" &&
        game.pendingAction.optional === true &&
        gurney?.conflict === 7 &&
        !muadDib?.intrigues.some((card) => card.name === "Questionable Methods"),
    );
  });
  const afterQuestionable = await currentGame(page);
  const gurneyAfterQuestionable = playerById(afterQuestionable, "p3");
  assert.equal(
    gurneyAfterQuestionable.conflict,
    gurneyBeforeQuestionable.conflict + 1,
    "Questionable Methods should add base strength before optional Influence loss",
  );
  assert.deepEqual(
    afterQuestionable.pendingAction,
    {
      kind: "lose-influence",
      ownerId: "p3",
      combatRecipientId: "p3",
      strength: 4,
      source: "Questionable Methods",
      optional: true,
    },
    "Questionable Methods should queue an optional Influence-loss pending action for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-questionable-methods-pending.png");

  await setDebugGameAndWait(page, states.commander);
  const beforeReachAgreement = await currentGame(page);
  const gurneyBeforeReachAgreement = playerById(beforeReachAgreement, "p3");
  await combatCard(page, "Reach Agreement").getByRole("button", { name: "Gurney Halleck: retreat 2 + contract" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        game.pendingAction?.kind === "contract" &&
        game.pendingAction.ownerId === "p3" &&
        game.pendingAction.source === "Reach Agreement" &&
        game.pendingAction.publicOnly === true &&
        game.pendingAction.allowFallback === true &&
        gurney?.conflict === 2 &&
        gurney?.deployedTroops === 1 &&
        !muadDib?.intrigues.some((card) => card.name === "Reach Agreement"),
    );
  });
  const afterReachAgreement = await currentGame(page);
  const gurneyAfterReachAgreement = playerById(afterReachAgreement, "p3");
  assert.equal(
    gurneyAfterReachAgreement.conflict,
    gurneyBeforeReachAgreement.conflict - 4,
    "Reach Agreement should remove the chosen troops' strength",
  );
  assert.equal(
    gurneyAfterReachAgreement.deployedTroops,
    gurneyBeforeReachAgreement.deployedTroops - 2,
    "Reach Agreement should retreat the selected troop count",
  );
  assert.equal(
    gurneyAfterReachAgreement.garrison,
    gurneyBeforeReachAgreement.garrison + 2,
    "Reach Agreement should return retreated troops to the recipient's garrison",
  );
  assert.deepEqual(
    afterReachAgreement.pendingAction,
    { kind: "contract", ownerId: "p3", source: "Reach Agreement", publicOnly: true, allowFallback: true },
    "Reach Agreement should queue a mandatory public contract pending action with fallback for the chosen Ally",
  );
  await screenshot(page, captures, "combat-intrigues-reach-agreement-pending.png");

  await setDebugGameAndWait(page, states.tacticalRetreat);
  const beforeTacticalRetreat = await currentGame(page);
  const gurneyBeforeTacticalRetreat = playerById(beforeTacticalRetreat, "p3");
  await combatCard(page, "Tactical Option").getByRole("button", { name: "Gurney Halleck: retreat 3" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const activePlayer = game?.players[game.activeSeat];
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        activePlayer?.id === "p3" &&
        gurney?.conflict === 6 &&
        gurney?.deployedTroops === 0 &&
        gurney?.deployedSandworms === 1 &&
        !muadDib?.intrigues.some((card) => card.name === "Tactical Option"),
    );
  });
  const afterTacticalRetreat = await currentGame(page);
  const gurneyAfterTacticalRetreat = playerById(afterTacticalRetreat, "p3");
  assert.equal(
    gurneyAfterTacticalRetreat.conflict,
    gurneyBeforeTacticalRetreat.conflict - 6,
    "Tactical Option retreat branch should remove each selected troop's strength and preserve sandworm strength",
  );
  assert.equal(
    gurneyAfterTacticalRetreat.deployedTroops,
    0,
    "Tactical Option retreat branch should allow all target Ally troops to retreat",
  );
  assert.equal(
    gurneyAfterTacticalRetreat.garrison,
    gurneyBeforeTacticalRetreat.garrison + 3,
    "Tactical Option retreat branch should return retreated troops to the recipient's garrison",
  );
  assert.equal(
    gurneyAfterTacticalRetreat.deployedSandworms,
    gurneyBeforeTacticalRetreat.deployedSandworms,
    "Tactical Option retreat branch should not retreat sandworms",
  );
  await screenshot(page, captures, "combat-intrigues-tactical-option-retreat.png");

  await setDebugGameAndWait(page, states.commander);
  const before = await currentGame(page);
  const gurneyBefore = playerById(before, "p3");
  await combatCard(page, "Tactical Option").getByRole("button", { name: "Gurney Halleck: +2" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const activePlayer = game?.players[game.activeSeat];
    const gurney = game?.players.find((player) => player.id === "p3");
    const muadDib = game?.players.find((player) => player.id === "p1");
    return Boolean(
      game &&
        activePlayer?.id === "p3" &&
        gurney?.conflict === 8 &&
        !muadDib?.intrigues.some((card) => card.name === "Tactical Option"),
    );
  });

  const after = await currentGame(page);
  const gurneyAfter = playerById(after, "p3");
  const muadDibAfter = playerById(after, "p1");
  assert.equal(gurneyAfter.conflict, gurneyBefore.conflict + 2, "Tactical Option should add 2 strength");
  assert.equal(
    muadDibAfter.intrigues.some((card) => card.name === "Tactical Option"),
    false,
    "Played Combat Intrigue should leave the actor's hand",
  );
  panelText = await page.locator(".combat-panel").innerText();
  assert.match(panelText, /Gurney Halleck/i);
  assert.match(panelText, /No structured Combat Intrigues/i);
  await screenshot(page, captures, "combat-intrigues-after-play.png");
}

async function createCombatIntrigueStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const activeSeat = game.players.findIndex((player) => player.id === "p1");
  assert.ok(activeSeat >= 0, "Expected p1 in browser debug game");

  const combatIntrigues = [
    146, // Go To Ground
    149, // Find Weakness
    150, // Spice is Power
    151, // Devour
    152, // Impress
    153, // Spring The Trap
    155, // Tactical Option
    156, // Questionable Methods
    448, // Backed by CHOAM
    449, // Reach Agreement
  ].map((sourceId) => intrigueBySourceId(data, sourceId));

  const base = {
    ...game,
    activeSeat,
    firstSeat: activeSeat,
    phase: "combat",
    conflict: conflictBySourceId(data, 454),
    conflictDeck: [conflictBySourceId(data, 456)],
    conflictDiscard: [],
    combatPasses: [],
    pendingAction: undefined,
    pendingQueue: [],
    contractOffer: [data.standardContracts[2]],
    contractDeck: data.standardContracts.slice(3, 5),
    spyPosts: {
      ...game.spyPosts,
      arrakeen: "p1",
      "imperial-basin": "p1",
    },
    players: game.players.map((player) => {
      const cleared = {
        ...player,
        agentsReady: 0,
        revealed: true,
        conflict: 0,
        deployedTroops: 0,
        deployedSandworms: 0,
        intrigues: [],
      };

      if (player.id === "p1") {
        return {
          ...cleared,
          contracts: [completedContract(data, 0), completedContract(data, 1)],
          intrigues: combatIntrigues,
          spies: Math.max(0, player.spies - 2),
        };
      }

      if (player.id === "p3") {
        return {
          ...cleared,
          conflict: 6,
          deployedTroops: 3,
          deployedSandworms: 1,
          resources: { ...player.resources, spice: 4 },
          influence: { ...player.influence, emperor: 1, bene: 1 },
          spies: Math.max(1, player.spies),
          playArea: [data.allyStarterCards[0]],
        };
      }

      if (player.id === "p5") {
        return {
          ...cleared,
          conflict: 4,
          deployedTroops: 2,
          resources: { ...player.resources, spice: 1 },
          influence: { ...player.influence, emperor: 1, spacing: 1 },
          spies: Math.max(1, player.spies),
        };
      }

      return cleared;
    }),
  };

  const tacticalRetreat = {
    ...base,
    players: base.players.map((player) =>
      player.id === "p3"
        ? { ...player, conflict: 12 }
        : player,
    ),
  };

  return { commander: base, tacticalRetreat };
}

function combatCard(page, name) {
  return page.locator(".combat-panel .combat-target").filter({ hasText: name });
}

function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

function intrigueBySourceId(data, sourceId) {
  const intrigue = data.intrigueCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(intrigue, `Expected Intrigue source ${sourceId}`);
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function completedContract(data, index) {
  const card = data.standardContracts[index];
  assert.ok(card, `Expected standard contract ${index}`);
  return { card, completed: true, takenRound: 1 };
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}
