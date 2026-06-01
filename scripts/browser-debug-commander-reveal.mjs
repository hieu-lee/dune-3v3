import assert from "node:assert/strict";

export async function runCommanderRevealSmoke({
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
  const fixture = await createCommanderRevealState(server, initialPlayableGame);
  await writeJson("commander-reveal-state.json", fixture);
  await setDebugGameAndWait(page, fixture.game);

  await screenshot(page, captures, "commander-reveal-ready.png");

  await page.locator(".activation-strip").getByRole("button", { name: fixture.allyName }).click();
  await page.waitForFunction(
    (allyName) => Array.from(document.querySelectorAll(".activation-strip button"))
      .some((button) => button.textContent?.trim() === allyName && button.classList.contains("selected")),
    fixture.allyName,
  );

  await page.getByRole("button", { name: "Arm Acquisitions" }).click();
  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const commander = game?.players.find((player) => player.id === "p1");
    return Boolean(
      commander?.callToArmsActive &&
        !commander.intrigues.some((card) => card.name === "Call to Arms"),
    );
  });
  await screenshot(page, captures, "commander-reveal-call-to-arms.png");

  await page.getByTestId("reveal-turn").click();
  await page.waitForFunction(
    (allyId) => {
      const game = window.__DUNE_DEBUG__?.getGame();
      const commander = game?.players.find((player) => player.id === "p1");
      return Boolean(
        commander?.revealed &&
          commander.callToArmsActive &&
          commander.revealActivatedAllyId === allyId,
      );
    },
    fixture.allyId,
  );

  const revealed = await currentGame(page);
  const revealedCommander = playerById(revealed, "p1");
  assert.equal(revealedCommander.revealActivatedAllyId, fixture.allyId, "Reveal should lock the selected activated Ally");
  assert.ok(revealedCommander.persuasion >= fixture.marketCard.cost, "Fixture commander should afford the target market card");
  await screenshot(page, captures, "commander-reveal-after-reveal.png");

  await page.evaluate(
    ({ allyId, commanderId }) => window.__DUNE_DEBUG__?.setCommanderTarget(commanderId, allyId),
    { allyId: fixture.otherAllyId, commanderId: fixture.commanderId },
  );
  await page.waitForFunction(
    ({ allyId, commanderId }) => window.__DUNE_DEBUG__?.getCommanderTargets?.()[commanderId] === allyId,
    { allyId: fixture.otherAllyId, commanderId: fixture.commanderId },
  );

  const marketCard = page.locator(".market-panel .market-card").filter({ hasText: fixture.marketCard.name }).first();
  assert.equal(await marketCard.count(), 1, `Expected one market card for ${fixture.marketCard.name}`);
  assert.equal(await marketCard.isEnabled(), true, "Target market card should be buyable after Reveal");
  await marketCard.click();

  await page.waitForFunction(
    ({ allyId, beforeGarrison, cardId }) => {
      const game = window.__DUNE_DEBUG__?.getGame();
      const commander = game?.players.find((player) => player.id === "p1");
      const ally = game?.players.find((player) => player.id === allyId);
      return Boolean(
        commander?.discard.some((card) => card.id === cardId) &&
          ally?.garrison === beforeGarrison + 1,
      );
    },
    {
      allyId: fixture.allyId,
      beforeGarrison: fixture.allyGarrison,
      cardId: fixture.marketCard.id,
    },
  );

  const acquired = await currentGame(page);
  const commander = playerById(acquired, "p1");
  const selectedAlly = playerById(acquired, fixture.allyId);
  const otherAlly = playerById(acquired, fixture.otherAllyId);
  assert.equal(
    commander.discard.some((card) => card.id === fixture.marketCard.id),
    true,
    "Commander should acquire the selected market card",
  );
  assert.equal(selectedAlly.garrison, fixture.allyGarrison + 1, "Call to Arms recruit should go to the reveal-locked Ally");
  assert.equal(otherAlly.garrison, fixture.otherAllyGarrison, "Call to Arms should not recruit to the other Ally");
  assert.match(acquired.log[0], new RegExp(escapeRegExp(fixture.allyName)));
  await screenshot(page, captures, "commander-reveal-after-acquire.png");
}

async function createCommanderRevealState(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const game = initialPlayableGame(state);
  const activeSeat = game.players.findIndex((player) => player.id === "p1");
  assert.ok(activeSeat >= 0, "Expected Muad'Dib Commander in browser debug game");

  const callToArms = intrigueBySourceId(data, 138);
  const hand = ["Convincing Argument", "Usul", "Demand Attention", "Desert Call"]
    .map((name) => commanderStarterByName(data, name));
  const persuasion = turnActions.revealTurnPlan({ ...game.players[activeSeat], hand }).persuasion;
  const marketCard = data.imperiumDeck.find((card) => (card.cost ?? 99) > 0 && (card.cost ?? 99) <= persuasion);
  assert.ok(marketCard, `Expected an Imperium Row card costing ${persuasion} or less`);
  const replacement = data.imperiumDeck.find((card) => card.id !== marketCard.id);
  assert.ok(replacement, "Expected an Imperium Row replacement card");

  const allyId = "p5";
  const otherAllyId = "p3";
  const allyName = "Lady Jessica";
  const otherAllyName = "Gurney Halleck";
  const allyGarrison = 4;
  const otherAllyGarrison = 2;
  const fixtureGame = {
    ...game,
    activeSeat,
    firstSeat: activeSeat,
    phase: "playing",
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: [],
    spaces: {},
    imperiumRow: [cloneCard(marketCard)],
    marketDeck: [cloneCard(replacement)],
    throneRow: [],
    players: game.players.map((player) => {
      const cleared = {
        ...player,
        agentsReady: 0,
        revealed: false,
        persuasion: 0,
        playArea: [],
        discard: [],
        intrigues: [],
        callToArmsActive: false,
        revealActivatedAllyId: undefined,
      };
      if (player.id === "p1") {
        return {
          ...cleared,
          hand,
          deck: [],
          intrigues: [callToArms],
        };
      }
      if (player.id === allyId) return { ...cleared, garrison: allyGarrison };
      if (player.id === otherAllyId) return { ...cleared, garrison: otherAllyGarrison };
      return cleared;
    }),
  };

  return {
    allyGarrison,
    allyId,
    allyName,
    commanderId: "p1",
    game: fixtureGame,
    marketCard: {
      cost: marketCard.cost ?? 0,
      id: marketCard.id,
      name: marketCard.name,
    },
    otherAllyGarrison,
    otherAllyId,
    otherAllyName,
  };
}

function commanderStarterByName(data, name) {
  const card = data.commanderStarterDecks.muaddib.find((candidate) => candidate.name === name);
  assert.ok(card, `Expected Muad'Dib starter card ${name}`);
  return cloneCard(card);
}

function intrigueBySourceId(data, sourceId) {
  const intrigue = data.intrigueCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(intrigue, `Expected Intrigue source ${sourceId}`);
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

function cloneCard(card) {
  return { ...card, traits: card.traits ? [...card.traits] : undefined };
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
