import assert from "node:assert/strict";

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function verifyCallToArmsPlotIntrigue({ cards, data, game, state }) {
  const { callToArms, mercenaries } = cards;

  const spiceMustFlow = data.reserveMarket.find((card) => card.name === "The Spice Must Flow");
  assert.ok(spiceMustFlow, "The Spice Must Flow reserve card should be available for acquisition tests");
  const callToArmsFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p2"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, garrison: 2, persuasion: 18, intrigues: [callToArms] }
        : { ...candidate, intrigues: [] },
    ),
  };
  assert.equal(
    state.isCallToArmsIntrigue(callToArms),
    true,
    "Call to Arms should be recognized as a structured Plot Intrigue",
  );
  const callToArmsPlayed = state.playCallToArmsPlotIntrigue(callToArmsFixture, "p2", callToArms.id);
  assert.equal(playerById(callToArmsPlayed, "p2").callToArmsActive, true, "Call to Arms should arm reveal acquisitions");
  assert.equal(playerById(callToArmsPlayed, "p2").garrison, 2, "Call to Arms should not recruit immediately");
  assert.deepEqual(playerById(callToArmsPlayed, "p2").intrigues, []);
  assert.equal(callToArmsPlayed.intrigueDiscard.at(-1).id, callToArms.id);
  assert.match(callToArmsPlayed.log[0], /plays Call to Arms/);
  const callToArmsRevealed = {
    ...callToArmsPlayed,
    players: callToArmsPlayed.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, revealed: true, persuasion: 18 } : candidate,
    ),
  };
  const firstArmedAcquire = state.acquireMarketCard(callToArmsRevealed, "p2", spiceMustFlow.id);
  assert.equal(playerById(firstArmedAcquire, "p2").garrison, 3, "Call to Arms should recruit on the first acquisition");
  assert.equal(playerById(firstArmedAcquire, "p2").persuasion, 9);
  assert.equal(playerById(firstArmedAcquire, "p2").vp, playerById(callToArmsRevealed, "p2").vp + 1);
  assert.equal(playerById(firstArmedAcquire, "p2").resources.spice, playerById(callToArmsRevealed, "p2").resources.spice + 1);
  assert.match(firstArmedAcquire.log[0], /acquires The Spice Must Flow for 1 VP, gains 1 spice and recruits 1 troop/);
  const secondArmedAcquire = state.acquireMarketCard(firstArmedAcquire, "p2", spiceMustFlow.id);
  assert.equal(playerById(secondArmedAcquire, "p2").garrison, 4, "Call to Arms should recruit on each acquisition");
  assert.equal(playerById(secondArmedAcquire, "p2").persuasion, 0);
  assert.equal(playerById(secondArmedAcquire, "p2").resources.spice, playerById(callToArmsRevealed, "p2").resources.spice + 2);
  const rowCallToArmsCard =
    data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester") ??
    data.imperiumDeck.find((card) => (card.cost ?? 0) > 0 && (card.cost ?? 0) <= 3);
  assert.ok(rowCallToArmsCard, "Expected a low-cost Imperium Row card for Call to Arms tests");
  const rowReplacementCard = data.imperiumDeck.find((card) => card.id !== rowCallToArmsCard.id);
  assert.ok(rowReplacementCard, "Expected an Imperium Row replacement card for Call to Arms tests");
  const rowCallToArmsFixture = {
    ...callToArmsRevealed,
    imperiumRow: [rowCallToArmsCard],
    marketDeck: [rowReplacementCard],
    players: callToArmsRevealed.players.map((candidate) =>
      candidate.id === "p2"
        ? { ...candidate, garrison: 2, persuasion: rowCallToArmsCard.cost ?? 0 }
        : candidate,
    ),
  };
  const rowCallToArmsBought = state.acquireMarketCard(rowCallToArmsFixture, "p2", rowCallToArmsCard.id);
  assert.equal(playerById(rowCallToArmsBought, "p2").garrison, 3, "Call to Arms should recruit on Imperium Row buys");
  assert.equal(rowCallToArmsBought.imperiumRow[0].id, rowReplacementCard.id, "Imperium Row buys should still refill the row");
  assert.equal(playerById(rowCallToArmsBought, "p2").discard.at(-1).id, rowCallToArmsCard.id);
  assert.match(rowCallToArmsBought.log[0], /acquires .* and recruits 1 troop/);
  const callToArmsCleared = state.finishRevealTurn(firstArmedAcquire, "p2");
  assert.equal(playerById(callToArmsCleared, "p2").callToArmsActive, false, "Reveal cleanup should clear Call to Arms");
  const afterCallToArmsCleared = state.acquireMarketCard(
    {
      ...callToArmsCleared,
      activeSeat: callToArmsCleared.players.findIndex((candidate) => candidate.id === "p2"),
      players: callToArmsCleared.players.map((candidate) =>
        candidate.id === "p2" ? { ...candidate, persuasion: 9 } : candidate,
      ),
    },
    "p2",
    spiceMustFlow.id,
  );
  assert.equal(playerById(afterCallToArmsCleared, "p2").garrison, 3, "Cleared Call to Arms should not recruit later");

  const callToArmsRetroFixture = {
    ...callToArmsFixture,
    players: callToArmsFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, revealed: true, persuasion: 18 } : candidate,
    ),
  };
  const boughtBeforeCall = state.acquireMarketCard(callToArmsRetroFixture, "p2", spiceMustFlow.id);
  assert.equal(playerById(boughtBeforeCall, "p2").garrison, 2, "Call to Arms should not affect earlier acquisitions");
  const armedAfterBuy = state.playCallToArmsPlotIntrigue(boughtBeforeCall, "p2", callToArms.id);
  const boughtAfterCall = state.acquireMarketCard(armedAfterBuy, "p2", spiceMustFlow.id);
  assert.equal(playerById(boughtAfterCall, "p2").garrison, 3, "Call to Arms should affect later acquisitions only");

  const commanderCallToArmsFixture = {
    ...game,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p4"),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDiscard: [],
    players: game.players.map((candidate) => {
      if (candidate.id === "p4") {
        return {
          ...candidate,
          revealed: true,
          revealActivatedAllyId: "p6",
          persuasion: 9,
          garrison: 0,
          intrigues: [callToArms],
        };
      }
      if (candidate.id === "p6") return { ...candidate, garrison: 2, intrigues: [] };
      return { ...candidate, intrigues: [] };
    }),
  };
  const commanderArmed = state.playCallToArmsPlotIntrigue(commanderCallToArmsFixture, "p4", callToArms.id);
  const commanderBought = state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id);
  assert.equal(playerById(commanderBought, "p4").persuasion, 0, "Commander should spend their own persuasion");
  assert.equal(playerById(commanderBought, "p4").garrison, 0, "Commander should not recruit troops personally");
  assert.equal(playerById(commanderBought, "p6").garrison, 3, "Activated Ally should receive the Call to Arms troop");
  assert.match(commanderBought.log[0], /Princess Irulan recruits 1 troop/);
  const throneCallToArmsCard = { ...rowCallToArmsCard, id: `${rowCallToArmsCard.id}-throne-call-to-arms` };
  const commanderThroneCallToArms = {
    ...commanderArmed,
    imperiumRow: [],
    marketDeck: [],
    throneRow: [throneCallToArmsCard],
    players: commanderArmed.players.map((candidate) => {
      if (candidate.id === "p4") return { ...candidate, persuasion: throneCallToArmsCard.cost ?? 0 };
      if (candidate.id === "p6") return { ...candidate, garrison: 2 };
      return candidate;
    }),
  };
  const commanderThroneBought = state.acquireMarketCard(
    commanderThroneCallToArms,
    "p4",
    throneCallToArmsCard.id,
    "p6",
  );
  assert.equal(playerById(commanderThroneBought, "p6").garrison, 3, "Call to Arms should recruit on Throne Row buys");
  assert.equal(commanderThroneBought.throneRow.length, 0, "Throne Row acquisition should remove the bought card");
  assert.equal(playerById(commanderThroneBought, "p4").discard.at(-1).id, throneCallToArmsCard.id);
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p2"),
    commanderArmed,
    "Commander Call to Arms should reject a same-team Ally who was not activated for Reveal",
  );
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p3"),
    commanderArmed,
    "Commander Call to Arms should reject an opposing troop recipient",
  );
  assert.equal(
    state.acquireMarketCard(commanderArmed, "p4", spiceMustFlow.id, "p4"),
    commanderArmed,
    "Commander Call to Arms should reject recruiting for the Commander",
  );

  const callToArmsNoPersuasion = {
    ...callToArmsRevealed,
    players: callToArmsRevealed.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, persuasion: 8 } : candidate,
    ),
  };
  assert.equal(
    state.acquireMarketCard(callToArmsNoPersuasion, "p2", spiceMustFlow.id),
    callToArmsNoPersuasion,
    "Failed Call to Arms acquisitions should not recruit",
  );
  const inactiveCallToArmsAcquire = {
    ...callToArmsRevealed,
    activeSeat: game.players.findIndex((candidate) => candidate.id === "p3"),
  };
  assert.equal(
    state.acquireMarketCard(inactiveCallToArmsAcquire, "p2", spiceMustFlow.id),
    inactiveCallToArmsAcquire,
    "Call to Arms acquisitions should require the buyer to be active",
  );
  const queuedCallToArmsAcquire = {
    ...callToArmsRevealed,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.acquireMarketCard(queuedCallToArmsAcquire, "p2", spiceMustFlow.id),
    queuedCallToArmsAcquire,
    "Call to Arms acquisitions should wait for queued pending actions",
  );
  const combatCallToArmsAcquire = {
    ...callToArmsRevealed,
    phase: "combat",
  };
  assert.equal(
    state.acquireMarketCard(combatCallToArmsAcquire, "p2", spiceMustFlow.id),
    combatCallToArmsAcquire,
    "Call to Arms acquisitions should only happen during playing phase",
  );
  const allDoneCallToArms = {
    ...callToArmsRevealed,
    players: callToArmsRevealed.players.map((candidate) => ({
      ...candidate,
      agentsReady: 0,
      revealed: true,
      callToArmsActive: candidate.id === "p2",
    })),
  };
  const afterAllDoneCallToArms = state.maybeStartCombatPhase(allDoneCallToArms);
  assert.equal(
    afterAllDoneCallToArms,
    allDoneCallToArms,
    "A revealed active player should explicitly end the Reveal turn before combat starts",
  );
  const afterAllDoneEnd = state.finishRevealTurn(allDoneCallToArms, "p2");
  assert.equal(
    afterAllDoneEnd.players.some((candidate) => candidate.callToArmsActive),
    false,
    "Explicit Reveal end should clear lingering Call to Arms effects",
  );
  const pendingDeployCallToArms = {
    ...allDoneCallToArms,
    pendingAction: { kind: "deploy", ownerId: "p2", remaining: 1, source: "Test" },
    players: allDoneCallToArms.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, garrison: 1 } : candidate,
    ),
  };
  const deployedBeforeCombat = state.deployTroopToConflict(pendingDeployCallToArms, pendingDeployCallToArms.pendingAction);
  const afterDeployCallToArms = state.maybeStartCombatPhase(deployedBeforeCombat);
  assert.equal(
    afterDeployCallToArms.players.some((candidate) => candidate.callToArmsActive),
    true,
    "Pending resolution during Reveal should leave the acquisition window open",
  );
  const afterDeployEnd = state.finishRevealTurn(afterDeployCallToArms, "p2");
  assert.equal(
    afterDeployEnd.players.some((candidate) => candidate.callToArmsActive),
    false,
    "Reveal end after pending resolution should clear lingering Call to Arms effects",
  );
  const pendingCallToArms = {
    ...callToArmsFixture,
    pendingAction: { kind: "spy", ownerId: "p2", remaining: 1, source: "Test" },
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(pendingCallToArms, "p2", callToArms.id),
    pendingCallToArms,
    "Call to Arms should wait for pending actions to resolve",
  );
  const queuedCallToArms = {
    ...callToArmsFixture,
    pendingQueue: [{ kind: "spy", ownerId: "p2", remaining: 1, source: "Test" }],
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(queuedCallToArms, "p2", callToArms.id),
    queuedCallToArms,
    "Call to Arms should wait for queued pending actions to resolve",
  );
  assert.equal(
    state.playCallToArmsPlotIntrigue(callToArmsFixture, "p3", callToArms.id),
    callToArmsFixture,
    "Only the active player should play Call to Arms as a Plot Intrigue",
  );
  const callToArmsWrongCardFixture = {
    ...callToArmsFixture,
    players: callToArmsFixture.players.map((candidate) =>
      candidate.id === "p2" ? { ...candidate, intrigues: [mercenaries] } : candidate,
    ),
  };
  assert.equal(
    state.playCallToArmsPlotIntrigue(callToArmsWrongCardFixture, "p2", mercenaries.id),
    callToArmsWrongCardFixture,
    "Call to Arms should reject other Intrigue cards",
  );
}
