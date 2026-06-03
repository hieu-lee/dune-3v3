import assert from "node:assert/strict";
import {
  actualFixedReveal,
  agentSpec,
  expectedFixedReveal,
} from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecRevealPending({
  cards,
  game,
  players,
  revealSpecCards,
  state,
  turnActions,
}) {
  const { convincingArgument, covertOperation, dagger } = cards;
  const { p2 } = players;
  for (const card of revealSpecCards) {
    assert.deepEqual(
      actualFixedReveal(turnActions, p2, card),
      expectedFixedReveal(card),
      `${card.name} reveal spec should match its fixed printed reveal fields before conditional context`,
    );
  }

  const legacyReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [
      { ...convincingArgument, effects: undefined },
      { ...dagger, effects: undefined },
    ],
    highCouncilSeat: false,
  });
  assert.equal(
    legacyReveal.persuasion,
    2,
    "Legacy reveal cards should still use printed persuasion",
  );
  assert.equal(
    legacyReveal.swords,
    1,
    "Legacy reveal cards should still use printed strength",
  );

  const specReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [convincingArgument, dagger],
    highCouncilSeat: false,
  });
  assert.equal(
    specReveal.persuasion,
    2,
    "Spec starter cards should reveal for their printed persuasion",
  );
  assert.equal(
    specReveal.swords,
    1,
    "Spec starter cards should reveal for their printed strength",
  );
  const covertOperationReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [covertOperation],
    highCouncilSeat: false,
  });
  assert.equal(
    covertOperationReveal.persuasion,
    0,
    "Covert Operation should not reveal for persuasion",
  );
  assert.equal(
    covertOperationReveal.swords,
    0,
    "Covert Operation should not reveal for strength",
  );
  assert.deepEqual(
    covertOperationReveal.revealGain,
    { solari: 2 },
    "Covert Operation should reveal for 2 Solari",
  );
  const covertSource = { ...p2, hand: [], playArea: [covertOperation] };
  const covertOpponents = game.players.filter(
    (player) => player.team !== covertSource.team,
  );
  const covertSameTeamAlly = game.players.find(
    (player) =>
      player.team === covertSource.team && player.id !== covertSource.id,
  );
  assert.ok(
    covertOpponents.length >= 2 && covertSameTeamAlly,
    "Covert Operation fixture should have opposing players and a teammate",
  );
  const covertDiscardA = { ...dagger, id: "covert-operation-discard-a" };
  const covertDiscardA2 = {
    ...convincingArgument,
    id: "covert-operation-discard-a-2",
  };
  const covertDiscardB = {
    ...convincingArgument,
    id: "covert-operation-discard-b",
  };
  const covertSameTeamHandCard = {
    ...dagger,
    id: "covert-operation-same-team-hand",
  };
  const covertFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === covertSource.id) return covertSource;
      if (player.id === covertOpponents[0].id)
        return { ...player, hand: [covertDiscardA], discard: [] };
      if (player.id === covertOpponents[1].id)
        return { ...player, hand: [covertDiscardB], discard: [] };
      if (player.id === covertSameTeamAlly.id)
        return { ...player, hand: [covertSameTeamHandCard], discard: [] };
      return { ...player, hand: [], discard: [] };
    }),
  };
  const covertPendings = state.pendingActionsForCard(
    covertOperation,
    covertSource,
    covertFixture,
  );
  assert.deepEqual(
    covertPendings.map((pending) => pending.kind),
    ["discard-hand-card", "discard-hand-card"],
    "Covert Operation should queue one hand-discard prompt for each opponent with a card",
  );
  assert.deepEqual(
    covertPendings.map((pending) => pending.ownerId),
    [covertOpponents[0].id, covertOpponents[1].id],
    "Covert Operation discard prompts should target opposing-team players in table order",
  );
  assert.equal(
    covertPendings[0].remaining,
    1,
    "Covert Operation should make each targeted opponent discard one card",
  );
  const covertQueued = {
    ...covertFixture,
    pendingAction: covertPendings[0],
    pendingQueue: covertPendings.slice(1),
  };
  const covertFinishAttempt = state.finishPendingAction(covertQueued);
  assert.equal(
    covertFinishAttempt.pendingAction,
    covertQueued.pendingAction,
    "Mandatory Covert Operation hand discard should not be skippable through finishPendingAction",
  );
  const covertFirstResolved = state.resolveDiscardHandCardChoice(
    covertQueued,
    covertQueued.pendingAction,
    covertDiscardA.id,
  );
  assert.equal(
    playerById(covertFirstResolved, covertOpponents[0].id).discard.at(-1).id,
    covertDiscardA.id,
    "Covert Operation should discard the selected opponent card",
  );
  assert.equal(
    covertFirstResolved.pendingAction?.ownerId,
    covertOpponents[1].id,
    "Covert Operation should advance to the next opponent discard prompt",
  );
  assert.deepEqual(
    playerById(covertFirstResolved, covertSameTeamAlly.id).hand.map(
      (card) => card.id,
    ),
    [covertSameTeamHandCard.id],
    "Covert Operation should not make same-team players discard",
  );
  const covertSecondResolved = state.resolveDiscardHandCardChoice(
    covertFirstResolved,
    covertFirstResolved.pendingAction,
    covertDiscardB.id,
  );
  assert.equal(
    covertSecondResolved.pendingAction,
    undefined,
    "Covert Operation should clear pending after all opponents discard",
  );
  assert.equal(
    playerById(covertSecondResolved, covertOpponents[1].id).discard.at(-1).id,
    covertDiscardB.id,
    "Covert Operation should resolve the queued second opponent discard",
  );
  assert.match(
    covertSecondResolved.log[0],
    /Covert Operation: discards Convincing Argument/,
  );
  const covertNoOpponentsWithCardsFixture = {
    ...covertFixture,
    players: covertFixture.players.map((player) =>
      player.team !== covertSource.team
        ? { ...player, hand: [], discard: [] }
        : player,
    ),
  };
  assert.deepEqual(
    state.pendingActionsForCard(
      covertOperation,
      covertSource,
      covertNoOpponentsWithCardsFixture,
    ),
    [],
    "Covert Operation should not queue discard prompts when no opponent has hand cards",
  );
  const stackedOpponentDiscardCard = {
    ...covertOperation,
    id: "effect-spec-stacked-opponent-discard-card",
    name: "Effect Spec Stacked Opponent Discard",
    effects: [
      agentSpec([
        { kind: "opponents-discard-cards", selector: "self", amount: 1 },
        { kind: "opponents-discard-cards", selector: "self", amount: 1 },
      ]),
    ],
  };
  const stackedOpponentDiscardSource = {
    ...covertSource,
    playArea: [stackedOpponentDiscardCard],
  };
  const stackedOpponentDiscardFixture = {
    ...covertFixture,
    players: covertFixture.players.map((player) =>
      player.id === stackedOpponentDiscardSource.id
        ? stackedOpponentDiscardSource
        : player.id === covertOpponents[0].id
          ? { ...player, hand: [covertDiscardA, covertDiscardA2], discard: [] }
          : player,
    ),
  };
  const stackedOpponentDiscardPendings = state.pendingActionsForCard(
    stackedOpponentDiscardCard,
    stackedOpponentDiscardSource,
    stackedOpponentDiscardFixture,
  );
  assert.deepEqual(
    stackedOpponentDiscardPendings.map((pending) => pending.ownerId),
    [covertOpponents[0].id, covertOpponents[1].id],
    "Stacked opponent-discard specs should aggregate into one capped pending action per opponent",
  );
  assert.deepEqual(
    stackedOpponentDiscardPendings.map((pending) => pending.remaining),
    [2, 1],
    "Stacked opponent-discard specs should sum effects and cap each pending action by that opponent's hand size",
  );
  const spyAndOpponentDiscardCard = {
    ...covertOperation,
    id: "effect-spec-spy-and-opponent-discard-card",
    name: "Effect Spec Spy And Opponent Discard",
    effects: [
      agentSpec([
        { kind: "place-spies", selector: "self", amount: 1 },
        { kind: "opponents-discard-cards", selector: "self", amount: 1 },
      ]),
    ],
  };
  const spyAndDiscardSource = {
    ...covertSource,
    playArea: [spyAndOpponentDiscardCard],
    spies: 1,
  };
  const spyAndDiscardFixture = {
    ...covertFixture,
    spyPosts: {},
    sharedSpyPosts: {},
    players: covertFixture.players.map((player) =>
      player.id === spyAndDiscardSource.id ? spyAndDiscardSource : player,
    ),
  };
  const spyAndDiscardPendings = state.pendingActionsForCard(
    spyAndOpponentDiscardCard,
    spyAndDiscardSource,
    spyAndDiscardFixture,
  );
  assert.deepEqual(
    spyAndDiscardPendings.map((pending) => pending.kind),
    ["spy", "discard-hand-card", "discard-hand-card"],
    "Typed card pending primitives should compose spy placement before opponent discard prompts",
  );
}
