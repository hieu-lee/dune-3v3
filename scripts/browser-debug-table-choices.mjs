import assert from "node:assert/strict";

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

  await setDebugGameAndWait(page, states.revealAdjust);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Printed reveal adjustment/i);
  assert.match(pendingText, /Browser debug reveal/i);
  await screenshot(page, captures, "pending-reveal-adjust.png");

  const revealButtons = page.locator(".pending-panel .reveal-adjust button");
  assert.equal(await revealButtons.count(), 5, "Expected reveal-adjust controls for persuasion, strength, and completion");
  const revealBefore = await currentGame(page);
  const revealOwnerBefore = revealBefore.players.find((player) => player.id === "p2");
  assert.ok(revealOwnerBefore, "Expected Feyd before reveal adjustment");
  await revealButtons.nth(1).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.persuasionAdjustment === 1);
  await revealButtons.nth(3).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.strengthAdjustment === 1);
  const revealAdjusted = await currentGame(page);
  const revealOwnerAdjusted = revealAdjusted.players.find((player) => player.id === "p2");
  assert.ok(revealOwnerAdjusted, "Expected Feyd after reveal adjustment");
  assert.equal(
    revealOwnerAdjusted.persuasion,
    revealOwnerBefore.persuasion + 1,
    "Reveal adjustment should add one persuasion",
  );
  assert.equal(
    revealOwnerAdjusted.conflict,
    revealOwnerBefore.conflict + 1,
    "Reveal adjustment should add one strength",
  );
  await revealButtons.nth(4).click();
  await waitForNoPending(page);

  await setDebugGameAndWait(page, states.retreatTroopsForStrength);
  pendingText = await page.locator(".pending-panel").innerText();
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
  assert.equal(chaniBondAfter.pendingAction, undefined, "Chani Fremen Bond should not create a reveal-adjust pending action");
  await screenshot(page, captures, "chani-fremen-bond-after-reveal.png");

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

  await setDebugGameAndWait(page, states.throneRow);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Throne Row/i);
  assert.match(pendingText, new RegExp(escapeRegExp(states.throneRowCardName)));
  await screenshot(page, captures, "pending-throne-row.png");

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
  assert.match(pendingText, new RegExp(escapeRegExp(states.imperialTentThroneRowCardName)));
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

  const tieBefore = await currentGame(page);
  assert.ok(tieBefore.conflict, "Expected a tied conflict before choosing concession");
  const tiedConflictId = tieBefore.conflict.id;
  await page.locator(".pending-panel").getByRole("button", { name: "No concession" }).click();
  await waitForNoPending(page);
  const tieAfter = await currentGame(page);
  assert.equal(tieAfter.round, tieBefore.round + 1, "No concession should advance to the next round");
  assert.equal(
    tieAfter.conflictDiscard.some((conflict) => conflict.id === tiedConflictId),
    true,
    "No concession should discard the tied conflict",
  );
}

async function createTableChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const shaddamSeat = game.players.findIndex((player) => player.id === "p4");
  const feydSeat = game.players.findIndex((player) => player.id === "p2");
  assert.ok(shaddamSeat >= 0, "Expected p4 in browser debug game");
  assert.ok(feydSeat >= 0, "Expected p2 in browser debug game");

  const throneRowCard = game.imperiumRow.find(state.canMoveCardToThroneRow);
  assert.ok(throneRowCard, "Expected an eligible Imperium Row card for Throne Row");
  const conflict = game.conflict ?? game.conflictDeck[0];
  assert.ok(conflict, "Expected a conflict card for same-team tie debug state");
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  assert.ok(chani, "Expected Chani for Fremen Bond browser debug state");
  const fremenSupport = data.imperiumDeck.find((card) =>
    card.id !== chani.id && card.traits?.includes("Faction: Fremen")
  );
  assert.ok(fremenSupport, "Expected another Fremen card for Fremen Bond browser debug state");
  const chaniFremenSupport = {
    ...cloneCard(fremenSupport),
    id: "debug-chani-fremen-bond-support",
    name: "Debug Fremen Bond Support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
    conditionalPersuasion: false,
    conditionalSwords: false,
  };
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  assert.ok(calculus, "Expected Calculus of Power for browser debug state");
  const calculusTrashTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusTrashTarget, "Expected an Emperor card for Calculus browser debug state");
  const imperialTent = data.emperorCommanderCards.find((card) => card.name === "Imperial Tent");
  assert.ok(imperialTent, "Expected Imperial Tent for declarative Throne Row browser debug state");

  const base = {
    ...game,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };
  const imperialTentCard = cloneCard(imperialTent);
  const imperialTentPlayers = base.players.map((player) =>
    player.id === "p4"
      ? { ...player, playArea: [imperialTentCard], hand: [] }
      : player,
  );
  const imperialTentState = {
    ...base,
    activeSeat: shaddamSeat,
    players: imperialTentPlayers,
  };
  const imperialTentSource = imperialTentPlayers.find((player) => player.id === "p4");
  assert.ok(imperialTentSource, "Expected Shaddam for declarative Throne Row browser debug state");
  const imperialTentPending = state.pendingActionForCard(imperialTentCard, imperialTentSource, imperialTentState);
  assert.deepEqual(
    imperialTentPending,
    { kind: "throne-row", ownerId: "p4", source: "Imperial Tent" },
    "Imperial Tent should create the browser debug Throne Row pending action through card rules",
  );

  return {
    revealAdjust: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 2, deployedTroops: 1, persuasion: 2 }
          : { ...player, conflict: 0, deployedTroops: 0, persuasion: 0 },
      ),
      pendingAction: {
        kind: "reveal-adjust",
        ownerId: "p2",
        combatRecipientId: "p2",
        cards: ["Browser debug reveal"],
        persuasionAdjustment: 0,
        strengthAdjustment: 0,
        source: "Browser debug reveal",
      },
    },
    retreatTroopsForStrength: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
      pendingAction: {
        kind: "retreat-troops-for-strength",
        ownerId: "p2",
        combatRecipientId: "p2",
        troopCount: 2,
        strength: 4,
        optional: true,
        source: "Browser debug retreat",
      },
    },
    chaniFremenBondReveal: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 0,
              deployedTroops: 0,
              discard: [],
              hand: [cloneCard(chani), chaniFremenSupport],
              highCouncilSeat: false,
              persuasion: 0,
              playArea: [],
              revealed: false,
            }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
    },
    calculusTrashReveal: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 4,
              deployedSandworms: 0,
              deployedTroops: 1,
              discard: [],
              hand: [cloneCard(calculus)],
              highCouncilSeat: false,
              persuasion: 0,
              playArea: [cloneCard(calculusTrashTarget)],
              revealed: false,
            }
          : { ...player, conflict: 0, deployedSandworms: 0, deployedTroops: 0 }
      ),
    },
    calculusTrashTargetId: calculusTrashTarget.id,
    calculusTrashTargetName: calculusTrashTarget.name,
    throneRow: {
      ...base,
      activeSeat: shaddamSeat,
      pendingAction: {
        kind: "throne-row",
        ownerId: "p4",
        source: "Browser debug Throne Row",
      },
    },
    throneRowCardId: throneRowCard.id,
    throneRowCardName: throneRowCard.name,
    imperialTentThroneRow: {
      ...imperialTentState,
      pendingAction: imperialTentPending,
    },
    imperialTentThroneRowCardId: throneRowCard.id,
    imperialTentThroneRowCardName: throneRowCard.name,
    conflictTie: {
      ...base,
      activeSeat: feydSeat,
      phase: "combat",
      conflict,
      conflictDeck: game.conflict === conflict ? game.conflictDeck : game.conflictDeck.slice(1),
      locationControl: {},
      players: base.players.map((player) => {
        if (player.id === "p3" || player.id === "p5") {
          return { ...player, conflict: 4, deployedTroops: 1, deployedSandworms: 0 };
        }
        return { ...player, conflict: 0, deployedTroops: 0, deployedSandworms: 0 };
      }),
      pendingAction: {
        kind: "conflict-tie",
        team: "muaddib",
        tiedPlayerIds: ["p3", "p5"],
        strength: 4,
        rank: 1,
        source: conflict.name,
      },
    },
  };
}

function cloneCard(card) {
  return { ...card, traits: card.traits ? [...card.traits] : undefined };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
