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

  const base = {
    ...game,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
