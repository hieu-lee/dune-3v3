import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function resolveSetupPendingActions(state, game) {
  let current = game;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Expected an eligible Throne Row setup card");
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
  }
  assert.equal(current.pendingAction, undefined, "Imperium card verifier setup should not leave pending actions");
  return current;
}

function withActivePlayer(game, playerId, patch) {
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected ${playerId}`);
  return {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    roundMakerSpaceVisits: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = resolveSetupPendingActions(state, state.initialGame());
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  assert.ok(smuggler, "Imperium deck should include Smuggler's Harvester");
  assert.equal(state.isSmugglersHarvesterCard(smuggler), true, "Smuggler's Harvester should be recognized");
  assert.match(smuggler.reveal, /Maker board space/, "Smuggler's Harvester should show its conditional Reveal text");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  assert.ok(interstellarTrade, "Imperium deck should include Interstellar Trade");
  assert.equal(state.isInterstellarTradeCard(interstellarTrade), true, "Interstellar Trade should be recognized");
  assert.equal(
    interstellarTrade.conditionalPersuasion,
    false,
    "Interstellar Trade should have structured reveal persuasion instead of manual printed reveal handling",
  );
  assert.match(interstellarTrade.reveal, /completed contract/, "Interstellar Trade should describe its contract reveal text");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin?.maker, "Imperial Basin should be a Maker board space");
  const p2 = playerById(game, "p2");
  const dune = [...p2.hand, ...p2.deck, ...p2.discard].find((card) => card.name === "Dune, The Desert Planet");
  assert.ok(dune, "Feyd should have Dune, The Desert Planet available for a Spice Trade Agent turn");

  const noMakerReveal = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const noMakerPlan = turnActions.revealTurnPlan(playerById(noMakerReveal, p2.id), noMakerReveal);
  assert.equal(noMakerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not pay without a Maker visit");

  const makerAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [dune, smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const afterMakerAgent = turnActions.placeAgentAction(makerAgentFixture, {
    commanderTargets: {},
    selectedCard: dune,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    state.hasVisitedMakerSpaceThisRound(afterMakerAgent, p2.id),
    true,
    "Sending an Agent to a Maker board space should mark that player for round reveal checks",
  );
  assert.equal(playerById(afterMakerAgent, p2.id).resources.spice, 1, "Imperial Basin should pay its base spice");
  assert.deepEqual(afterMakerAgent.pendingAction, undefined, "Zero garrison should avoid a deployment pending action");

  const revealFixture = {
    ...afterMakerAgent,
    activeSeat: makerAgentFixture.activeSeat,
    agentTurnComplete: false,
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: afterMakerAgent.players.map((player) =>
      player.id === p2.id ? { ...player, agentsReady: 0, revealed: false, persuasion: 0 } : player,
    ),
  };
  const makerPlan = turnActions.revealTurnPlan(playerById(revealFixture, p2.id), revealFixture);
  assert.equal(makerPlan.persuasion, 1, "Smuggler's Harvester should still reveal for 1 persuasion");
  assert.equal(makerPlan.revealGain.spice, 1, "Smuggler's Harvester should add 1 reveal spice after a Maker visit");

  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: {},
    revealPlan: makerPlan,
  });
  assert.equal(playerById(revealed, p2.id).resources.spice, 2, "Smuggler's Harvester should add 1 spice on Reveal");
  assert.equal(revealed.turnSpiceGains[p2.id], 1, "Smuggler's Harvester reveal spice should count as turn spice gain");
  assert.equal(playerById(revealed, p2.id).persuasion, 1);
  assert.deepEqual(playerById(revealed, p2.id).hand, [], "Reveal should move Smuggler's Harvester from hand");
  assert.ok(
    playerById(revealed, p2.id).playArea.some((card) => card.id === smuggler.id),
    "Reveal should put Smuggler's Harvester into play area",
  );

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const incompleteContract = {
    card: data.standardContracts[2],
    completed: false,
    takenRound: 1,
  };
  assert.ok(incompleteContract.card, "Expected a third standard contract for Interstellar Trade coverage");
  const interstellarFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    contracts: [...completedContracts, incompleteContract],
    discard: [],
    hand: [interstellarTrade],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const interstellarPlan = turnActions.revealTurnPlan(playerById(interstellarFixture, p2.id), interstellarFixture);
  assert.equal(interstellarPlan.persuasion, 2, "Interstellar Trade should reveal for 1 persuasion per completed contract");
  assert.deepEqual(
    interstellarPlan.printedRevealCards,
    [],
    "Interstellar Trade should not require a manual printed reveal adjustment",
  );
  const interstellarRevealed = turnActions.revealTurnAction(interstellarFixture, {
    commanderTargets: {},
    revealPlan: interstellarPlan,
  });
  assert.equal(playerById(interstellarRevealed, p2.id).persuasion, 2);
  assert.equal(interstellarRevealed.pendingAction, undefined, "Interstellar Trade reveal should not pause for printed text");
  const lateCompletedContract = {
    card: data.standardContracts[3],
    completed: true,
    takenRound: 1,
  };
  assert.ok(lateCompletedContract.card, "Expected a fourth standard contract for Interstellar Trade one-shot coverage");
  const afterLateCompletion = {
    ...interstellarRevealed,
    players: interstellarRevealed.players.map((player) =>
      player.id === p2.id
        ? { ...player, contracts: [...player.contracts, lateCompletedContract] }
        : player,
    ),
  };
  assert.equal(
    playerById(afterLateCompletion, p2.id).persuasion,
    2,
    "Interstellar Trade persuasion should be fixed by the reveal plan and not re-count later contract completions",
  );

  console.log("Imperium card verification passed");
} finally {
  await server.close();
}
