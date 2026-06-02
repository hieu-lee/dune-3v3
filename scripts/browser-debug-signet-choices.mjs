import assert from "node:assert/strict";

export async function runSignetChoicesSmoke({
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
  const states = await createSignetChoiceStates(server, initialPlayableGame);
  await writeJson("pending-signet-choice-states.json", states);

  await setDebugGameAndWait(page, states.muadDib);
  await page.getByText(/Muad'Dib resolves Lead the Way: draws 1 card/i).first().waitFor();
  const muadDibAfter = await currentGame(page);
  const muadDibCommander = muadDibAfter.players.find((player) => player.id === "p1");
  assert.ok(muadDibCommander, "Expected Muad'Dib commander after Signet draw");
  assert.equal(
    muadDibCommander.hand[0]?.id,
    "debug-muaddib-signet-draw",
    "Muad'Dib Signet should draw the scripted card into hand",
  );
  await screenshot(page, captures, "muaddib-signet-draw.png");

  await setDebugGameAndWait(page, states.gurney);
  await page.getByText(/Gurney Halleck resolves Warmaster: recruits 1 troop/i).first().waitFor();
  const gurneyAfter = await currentGame(page);
  const gurney = gurneyAfter.players.find((player) => player.id === "p3");
  assert.ok(gurney, "Expected Gurney after Signet recruit");
  assert.equal(gurney.garrison, 1, "Gurney Signet should recruit the scripted troop");
  await screenshot(page, captures, "gurney-signet-warmaster.png");

  await setDebugGameAndWait(page, states.amber);
  await page.getByText(/Lady Amber Metulli resolves Fill Coffers: gains 1 Solari and 1 spice/i).first().waitFor();
  const amberAfter = await currentGame(page);
  const amber = amberAfter.players.find((player) => player.id === "p3");
  assert.ok(amber, "Expected Lady Amber after Signet resource gain");
  assert.equal(amber.resources.solari, 3, "Amber Signet should gain the scripted Solari");
  assert.equal(amber.resources.spice, 1, "Amber Signet should gain the scripted spice");
  await screenshot(page, captures, "amber-signet-fill-coffers.png");

  await setDebugGameAndWait(page, states.margot);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Arrakis Informant/i);
  assert.match(pendingText, /Bene Gesserit/i);
  await screenshot(page, captures, "pending-margot-arrakis-informant.png");

  await setDebugGameAndWait(page, states.staban);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Unseen Network/i);
  assert.match(pendingText, /spy placement/i);
  await screenshot(page, captures, "pending-staban-signet-spy.png");

  await setDebugGameAndWait(page, states.shaddam);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Emperor of the Known Universe/i);
  assert.match(pendingText, /Spend 1: Feyd-Rautha Harkonnen recruits 1 troop/i);
  await screenshot(page, captures, "pending-shaddam-signet.png");

  const shaddamBefore = await currentGame(page);
  const commanderBefore = shaddamBefore.players.find((player) => player.id === "p4");
  const allyBefore = shaddamBefore.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1: Feyd-Rautha Harkonnen recruits 1 troop/ }).click();
  await waitForNoPending(page);
  const shaddamAfter = await currentGame(page);
  const commanderAfter = shaddamAfter.players.find((player) => player.id === "p4");
  const allyAfter = shaddamAfter.players.find((player) => player.id === "p2");
  assert.equal(commanderAfter.resources.solari, commanderBefore.resources.solari - 1, "Shaddam troop choice should spend 1 Solari");
  assert.equal(allyAfter.garrison, allyBefore.garrison + 1, "Shaddam troop choice should recruit for the activated Ally");

  await setDebugGameAndWait(page, states.irulan);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Chronicler's Insight/i);
  assert.match(pendingText, /Acquire cost-1 card to hand/i);
  assert.match(pendingText, /Trash hand card/i);
  await screenshot(page, captures, "pending-irulan-signet.png");

  await page.locator(".pending-panel").getByRole("button", { name: /Acquire cost-1 card to hand/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "acquire-card");
  const irulanAfter = await currentGame(page);
  assert.equal(irulanAfter.pendingAction.ownerId, "p6", "Irulan acquire branch should create an acquire pending action for Irulan");
  assert.equal(irulanAfter.pendingAction.destination, "hand", "Irulan acquire branch should acquire to hand");
}

async function createSignetChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const muadDibSignet = data.commanderStarterDecks.muaddib.find((card) => card.sourceId === 545);
  const shaddamSignet = data.commanderStarterDecks.shaddam.find((card) => card.sourceId === 554);
  const allySignet = data.allyStarterCards.find((card) => card.sourceId === 531);
  const drawCard = data.allyStarterCards.find((card) => card.name === "Dagger");
  const costOneCard = data.imperiumDeck.find((card) => card.cost === 1);
  assert.ok(muadDibSignet, "Expected Muad'Dib commander Signet Ring");
  assert.ok(shaddamSignet, "Expected Shaddam commander Signet Ring");
  assert.ok(allySignet, "Expected generic Ally Signet Ring");
  assert.ok(drawCard, "Expected a starter card for Muad'Dib Signet draw");
  assert.ok(costOneCard, "Expected a cost-1 Imperium card for Irulan");

  const muadDibCard = { ...muadDibSignet, id: "debug-muaddib-signet-ring" };
  const muadDibDrawCard = { ...drawCard, id: "debug-muaddib-signet-draw" };
  const shaddamCard = { ...shaddamSignet, id: "debug-shaddam-signet-ring" };
  const irulanCard = { ...allySignet, id: "debug-irulan-signet-ring" };
  const acquireCard = { ...costOneCard, id: "debug-irulan-acquire-card" };
  const muadDibCommander = game.players.find((player) => player.id === "p1");
  const muadDibTarget = game.players.find((player) => player.id === "p3");
  assert.ok(muadDibCommander && muadDibTarget, "Expected Muad'Dib commander and activated Ally");
  const muadDibSource = {
    ...muadDibCommander,
    hand: [],
    deck: [muadDibDrawCard],
    discard: [],
    playArea: [muadDibCard],
  };
  const muadDibEffect = state.applyCardAgentEffect(muadDibCard, muadDibSource, muadDibTarget, game);
  const gurneyCard = { ...allySignet, id: "debug-gurney-signet-ring" };
  const gurneySource = {
    ...muadDibTarget,
    garrison: 0,
    playArea: [gurneyCard],
  };
  const gurneyEffect = state.applyCardAgentEffect(gurneyCard, gurneySource, gurneySource, game);

  const amberCard = { ...allySignet, id: "debug-amber-signet-ring" };
  const amberSource = {
    ...muadDibTarget,
    leader: "Lady Amber Metulli",
    leaderCard: data.leaderCardByName("Lady Amber Metulli"),
    resources: { solari: 2, spice: 0, water: 1 },
    playArea: [amberCard],
  };
  const amberBase = {
    ...game,
    alliances: { bene: amberSource.id },
    players: game.players.map((player) => player.id === amberSource.id ? amberSource : player),
  };
  const amberEffect = state.applyCardAgentEffect(amberCard, amberSource, amberSource, amberBase);
  const margotCard = { ...allySignet, id: "debug-margot-signet-ring" };
  const margotSource = {
    ...muadDibTarget,
    leader: "Lady Margot Fenring",
    leaderCard: data.leaderCardByName("Lady Margot Fenring"),
    spies: 1,
    playArea: [margotCard],
  };
  const margotBase = {
    ...game,
    players: game.players.map((player) => player.id === margotSource.id ? margotSource : player),
  };
  const margotPending = state.pendingActionForCard(margotCard, margotSource, margotBase, margotSource);
  assert.equal(margotPending?.kind, "spy", "Expected Margot Signet spy pending action");
  assert.equal(margotPending.source, "Arrakis Informant", "Margot Signet should use the ability source label");
  assert.equal(margotPending.placementIcon, "bene", "Margot Signet should restrict placement to Bene posts");

  const stabanCard = { ...allySignet, id: "debug-staban-signet-ring" };
  const stabanSource = {
    ...muadDibTarget,
    leader: "Staban Tuek",
    leaderCard: data.leaderCardByName("Staban Tuek"),
    spies: 1,
    playArea: [stabanCard],
  };
  const stabanBase = {
    ...game,
    players: game.players.map((player) => player.id === stabanSource.id ? stabanSource : player),
  };
  const stabanPending = state.pendingActionForCard(stabanCard, stabanSource, stabanBase, stabanSource);
  assert.equal(stabanPending?.kind, "spy", "Expected Staban Signet spy pending action");
  assert.equal(stabanPending.source, "Unseen Network", "Staban Signet should use the ability source label");
  assert.equal(
    stabanPending.postPlacementAction,
    "staban-unseen-network",
    "Staban Signet should queue the Unseen Network follow-up",
  );

  const muadDib = {
    ...game,
    activeSeat: 0,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDibEffect.source.id) return muadDibEffect.source;
      if (player.id === muadDibEffect.target.id) return muadDibEffect.target;
      return player;
    }),
    log: [muadDibEffect.log, ...game.log].filter(Boolean),
  };

  const gurney = {
    ...game,
    activeSeat: 2,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === gurneyEffect.source.id ? gurneyEffect.source : player),
    log: [gurneyEffect.log, ...game.log].filter(Boolean),
  };

  const amber = {
    ...amberBase,
    activeSeat: 2,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    players: amberBase.players.map((player) => player.id === amberEffect.source.id ? amberEffect.source : player),
    log: [amberEffect.log, ...game.log].filter(Boolean),
  };

  const margot = {
    ...margotBase,
    activeSeat: 2,
    phase: "playing",
    pendingAction: margotPending,
    pendingQueue: [],
  };

  const staban = {
    ...stabanBase,
    activeSeat: 2,
    phase: "playing",
    pendingAction: stabanPending,
    pendingQueue: [],
  };

  const shaddam = {
    ...game,
    activeSeat: 3,
    phase: "playing",
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id !== "p4") return player;
      return {
        ...player,
        resources: { ...player.resources, solari: 3 },
        playArea: [shaddamCard, ...player.playArea],
      };
    }),
    pendingAction: {
      kind: "paid-reward-choice",
      ownerId: "p4",
      cardId: shaddamCard.id,
      source: "Emperor of the Known Universe",
      options: [
        {
          id: "troop",
          resource: "solari",
          cost: 1,
          reward: { kind: "recruit-troops", recipientId: "p2", amount: 1, destination: "garrison" },
        },
        {
          id: "emperor",
          resource: "solari",
          cost: 3,
          reward: { kind: "gain-influence", recipientId: "p4", faction: "emperor", amount: 1 },
        },
        ...["greatHouses", "spacing", "bene", "fringeWorlds"].map((faction) => ({
          id: faction,
          resource: "solari",
          cost: 3,
          reward: { kind: "gain-influence", recipientId: "p2", faction, amount: 1 },
        })),
      ],
    },
  };

  const irulan = {
    ...game,
    activeSeat: 5,
    phase: "playing",
    imperiumRow: [acquireCard, ...game.imperiumRow.filter((card) => card.id !== acquireCard.id).slice(0, 4)],
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id !== "p6") return player;
      return {
        ...player,
        playArea: [irulanCard, ...player.playArea],
      };
    }),
    pendingAction: {
      kind: "pending-action-choice",
      ownerId: "p6",
      cardId: irulanCard.id,
      source: "Chronicler's Insight",
      options: [
        {
          id: "acquire",
          label: "Acquire cost-1 card to hand",
          pending: {
            kind: "acquire-card",
            ownerId: "p6",
            source: "Chronicler's Insight",
            minCost: 1,
            maxCost: 1,
            destination: "hand",
            optional: false,
          },
        },
        {
          id: "trash",
          label: "Trash hand card",
          pending: {
            kind: "trash-card",
            ownerId: "p6",
            source: "Chronicler's Insight",
            optional: false,
            zones: ["hand"],
            spiceRewardCostThreshold: 1,
            spiceReward: 2,
          },
        },
      ],
    },
  };

  return { muadDib, gurney, amber, margot, staban, shaddam, irulan };
}
