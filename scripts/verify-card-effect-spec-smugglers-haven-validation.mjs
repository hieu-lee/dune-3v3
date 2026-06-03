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
    smugglersHavenAllySource.vp + 1,
    "Smuggler's Haven should gain its printed VP during Agent play",
  );
  assert.match(smugglersHavenAgentEffect.log ?? "", /Smuggler's Haven: gains 1 VP/);
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
      kind: "pay-resource-for-sandworms",
      ownerId: p3.id,
      recipientId: p3.id,
      resource: "spice",
      cost: 4,
      sandworms: 1,
      strength: 3,
      destination: "conflict",
      optional: true,
      source: "Smuggler's Haven",
      cardId: smugglersHaven.id,
    },
    "Smuggler's Haven should queue a self sandworm payment for an Ally",
  );
  const smugglersHavenAllyResolved = state.resolvePayResourceForSandwormsChoice(
    { ...smugglersHavenAllyState, pendingAction: smugglersHavenAllyPending },
    smugglersHavenAllyPending,
  );
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).resources.spice, 0, "Smuggler's Haven Ally payment should spend 4 spice");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).deployedSandworms, 1, "Smuggler's Haven Ally payment should deploy a self sandworm");
  assert.equal(playerById(smugglersHavenAllyResolved, p3.id).conflict, 3, "Smuggler's Haven Ally sandworm should add 3 strength");
  assert.equal(
    smugglersHavenAllyResolved.turnUnitDeployments[p3.id],
    1,
    "Smuggler's Haven Ally sandworm should count as that player's turn deployment",
  );
  assert.equal(
    state.pendingActionForCard(
      smugglersHaven,
      { ...smugglersHavenAllySource, makerHooks: false },
      {
        ...smugglersHavenAllyState,
        players: smugglersHavenAllyState.players.map((player) =>
          player.id === p3.id ? { ...smugglersHavenAllySource, makerHooks: false } : player,
        ),
      },
      { ...smugglersHavenAllySource, makerHooks: false },
      deliverSupplies,
    ),
    undefined,
    "Smuggler's Haven should not queue self sandworms without Maker Hooks",
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
  assert.equal(
    smugglersHavenCommanderPending?.recipientId,
    p3.id,
    "Commander Smuggler's Haven payment should summon for the activated Ally",
  );
  const smugglersHavenCommanderResolved = state.resolvePayResourceForSandwormsChoice(
    { ...smugglersHavenCommanderState, pendingAction: smugglersHavenCommanderPending },
    smugglersHavenCommanderPending,
  );
  assert.equal(playerById(smugglersHavenCommanderResolved, p1.id).resources.spice, 0, "Commander Smuggler's Haven should spend Commander spice");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).deployedSandworms, 1, "Commander Smuggler's Haven should deploy the Ally sandworm");
  assert.equal(playerById(smugglersHavenCommanderResolved, p3.id).conflict, 3, "Commander Smuggler's Haven sandworm should add Ally strength");
  assert.equal(
    smugglersHavenCommanderResolved.turnUnitDeployments[p1.id],
    1,
    "Commander Smuggler's Haven sandworm should count for the Commander turn",
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
