import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecSmugglersHavenValidation({
  boardSpaces,
  cards,
  fixtures,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { deliverSupplies, imperialBasin } = boardSpaces;
  const { smugglersHaven } = cards;
  const { smugglersHavenConflict } = fixtures;
  const { p1, p2, p3 } = players;

  const smugglersHavenAllySource = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
    playArea: [smugglersHaven],
    resources: { solari: 0, spice: 4, water: 0 },
  };
  const smugglersHavenAllyState = {
    ...game,
    conflict: smugglersHavenConflict,
    players: game.players.map((player) => player.id === p3.id ? smugglersHavenAllySource : player),
    shieldWall: false,
  };
  const smugglersHavenAgentEffect = state.applyCardAgentEffect(
    smugglersHaven,
    smugglersHavenAllySource,
    smugglersHavenAllySource,
    smugglersHavenAllyState,
    deliverSupplies,
  );
  assert.equal(
    smugglersHavenAgentEffect.source.vp,
    smugglersHavenAllySource.vp,
    "Smuggler's Haven should not gain VP before paying its printed Agent cost",
  );
  assert.equal(smugglersHavenAgentEffect.log, undefined, "Smuggler's Haven should not log an unpaid VP reward");
  const smugglersHavenAllyPending = state.pendingActionForCard(
    smugglersHaven,
    smugglersHavenAllySource,
    smugglersHavenAllyState,
    smugglersHavenAllySource,
    deliverSupplies,
  );
  assert.deepEqual(
    smugglersHavenAllyPending,
    {
      kind: "paid-reward-choice",
      ownerId: p3.id,
      source: "Smuggler's Haven",
      cardId: smugglersHaven.id,
      requirePayableOption: true,
      options: [{
        id: "vp",
        resource: "spice",
        cost: 4,
        reward: { kind: "gain-vp", recipientId: p3.id, amount: 1 },
      }],
    },
    "Smuggler's Haven should queue its printed spice-for-VP Agent payment for an Ally",
  );
  const smugglersHavenAllyResolved = state.resolvePaidRewardChoice(
    { ...smugglersHavenAllyState, pendingAction: smugglersHavenAllyPending },
    smugglersHavenAllyPending,
    "vp",
  );
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).resources.spice, 0, "Smuggler's Haven Ally payment should spend 4 spice");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).vp, smugglersHavenAllySource.vp + 1, "Smuggler's Haven Ally payment should gain 1 VP");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).deployedSandworms, 0, "Smuggler's Haven should not deploy sandworms");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).conflict, 0, "Smuggler's Haven should not add combat strength");
  assert.equal(
    smugglersHavenAllyResolved.turnUnitDeployments[p3.id] ?? 0,
    0,
    "Smuggler's Haven should not count as a unit deployment",
  );
  assert.equal(
    state.pendingActionForCard(
      smugglersHaven,
      { ...smugglersHavenAllySource, resources: { solari: 0, spice: 3, water: 0 } },
      {
        ...smugglersHavenAllyState,
        players: smugglersHavenAllyState.players.map((player) =>
          player.id === p3.id ? { ...smugglersHavenAllySource, resources: { solari: 0, spice: 3, water: 0 } } : player,
        ),
      },
      { ...smugglersHavenAllySource, resources: { solari: 0, spice: 3, water: 0 } },
      deliverSupplies,
    ),
    undefined,
    "Smuggler's Haven should not queue its paid VP reward when the player cannot pay",
  );
  const smugglersHavenCommanderSource = {
    ...p1,
    playArea: [smugglersHaven],
    resources: { solari: 0, spice: 4, water: 0 },
  };
  const smugglersHavenCommanderAlly = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
  };
  const smugglersHavenCommanderState = {
    ...game,
    conflict: smugglersHavenConflict,
    players: game.players.map((player) => {
      if (player.id === p1.id) return smugglersHavenCommanderSource;
      if (player.id === p3.id) return smugglersHavenCommanderAlly;
      return player;
    }),
    shieldWall: false,
  };
  const smugglersHavenCommanderPending = state.pendingActionForCard(
    smugglersHaven,
    smugglersHavenCommanderSource,
    smugglersHavenCommanderState,
    smugglersHavenCommanderAlly,
    deliverSupplies,
  );
  assert.ok(smugglersHavenCommanderPending, "Smuggler's Haven should queue for a Commander with a hooked activated Ally");
  assert.equal(smugglersHavenCommanderPending?.ownerId, p1.id, "Commander Smuggler's Haven payment should be paid by the Commander");
  assert.deepEqual(
    smugglersHavenCommanderPending?.options,
    [{
      id: "vp",
      resource: "spice",
      cost: 4,
      reward: { kind: "gain-vp", recipientId: p1.id, amount: 1 },
    }],
    "Commander Smuggler's Haven payment should award VP to the Commander",
  );
  const smugglersHavenCommanderResolved = state.resolvePaidRewardChoice(
    { ...smugglersHavenCommanderState, pendingAction: smugglersHavenCommanderPending },
    smugglersHavenCommanderPending,
    "vp",
  );
  assert.equal(playerById(smugglersHavenCommanderResolved, p1.id).resources.spice, 0, "Commander Smuggler's Haven should spend Commander spice");
  assert.equal(playerById(smugglersHavenCommanderResolved, p1.id).vp, smugglersHavenCommanderSource.vp + 1, "Commander Smuggler's Haven should gain Commander VP");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).deployedSandworms, 0, "Commander Smuggler's Haven should not deploy Ally sandworms");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).conflict, 0, "Commander Smuggler's Haven should not add Ally strength");
  assert.equal(
    smugglersHavenCommanderResolved.turnUnitDeployments[p1.id] ?? 0,
    0,
    "Commander Smuggler's Haven should not count as a unit deployment",
  );
  const smugglersHavenSpiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [imperialBasin.id]: p2.id } },
  );
  assert.equal(smugglersHavenSpiedMakerReveal.persuasion, 1, "Smuggler's Haven should reveal for 1 persuasion");
  assert.equal(
    smugglersHavenSpiedMakerReveal.revealGain.spice,
    2,
    "Smuggler's Haven should gain 2 Reveal spice when the player has a spy on any Maker space",
  );
  const smugglersHavenRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smugglersHaven],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const smugglersHavenRevealed = turnActions.revealTurnAction(
    { ...smugglersHavenRevealFixture, spyPosts: { [imperialBasin.id]: p2.id } },
    {
      commanderTargets: {},
      revealPlan: smugglersHavenSpiedMakerReveal,
    },
  );
  assert.equal(
    playerById(smugglersHavenRevealed, p2.id).resources.spice,
    2,
    "Smuggler's Haven should add its Maker-spy spice during Reveal resolution",
  );
  assert.equal(
    smugglersHavenRevealed.turnSpiceGains[p2.id],
    2,
    "Smuggler's Haven Reveal spice should be tracked as turn spice gain",
  );
  const smugglersHavenUnspiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    game,
  );
  assert.equal(
    smugglersHavenUnspiedMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice without the player's Maker-space spy",
  );
  const smugglersHavenOpponentSpiedMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [imperialBasin.id]: p1.id } },
  );
  assert.equal(
    smugglersHavenOpponentSpiedMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice from another player's Maker-space spy",
  );
  const smugglersHavenSpiedNonMakerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smugglersHaven], highCouncilSeat: false },
    { ...game, spyPosts: { [deliverSupplies.id]: p2.id } },
  );
  assert.equal(
    smugglersHavenSpiedNonMakerReveal.revealGain.spice ?? 0,
    0,
    "Smuggler's Haven should not gain Reveal spice from a spy on a non-Maker space",
  );
}
