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

  return { commander: base };
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
