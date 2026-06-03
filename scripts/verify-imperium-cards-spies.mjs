import assert from "node:assert/strict";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";
export function verifyImperiumCardSpyEffects({
  cards,
  data,
  game,
  playerIds,
  spaces,
  state,
  turnActions,
}) {
  const { beneGesseritOperative, spyNetwork } = cards;
  const { allyId, commanderId, teammateId } = playerIds;
  const { highCouncil, secrets } = spaces;
  const p2 = playerById(game, allyId);
  const p4 = playerById(game, commanderId);
  const p6 = playerById(game, teammateId);
  const operativeFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const operativePlayed = turnActions.placeAgentAction(operativeFixture, {
    commanderTargets: {},
    selectedCard: beneGesseritOperative,
    selectedSpace: secrets,
  });
  assert.equal(
    operativePlayed.pendingAction?.kind,
    "spy",
    "Bene Gesserit Operative should queue spy placement",
  );
  assert.equal(operativePlayed.pendingAction.ownerId, p2.id);
  assert.equal(operativePlayed.pendingAction.source, "Bene Gesserit Operative");
  assert.equal(operativePlayed.pendingAction.remaining, 1);
  assert.equal(operativePlayed.pendingAction.mustPlaceSpy, true);
  assert.equal(
    state.finishPendingAction(operativePlayed),
    operativePlayed,
    "Bene Gesserit Operative spy placement should be mandatory",
  );
  const operativeSpyPlaced = state.placeSpyForPending(
    operativePlayed,
    operativePlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(operativeSpyPlaced.pendingAction, undefined);
  assert.equal(
    playerById(operativeSpyPlaced, p2.id).spies,
    2,
    "Bene Gesserit Operative should spend one spy from supply",
  );
  assert.equal(
    operativeSpyPlaced.spyPosts[highCouncil.id],
    p2.id,
    "Bene Gesserit Operative should place the selected spy",
  );
  assert.match(
    operativeSpyPlaced.log[0],
    /places a spy near High Council from Bene Gesserit Operative/,
  );
  const operativeNoSupplyBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 0,
  }));
  const operativeNoSupplyPlayed = turnActions.placeAgentAction(
    {
      ...operativeNoSupplyBase,
      spyPosts: { [highCouncil.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: beneGesseritOperative,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    operativeNoSupplyPlayed.pendingAction?.kind,
    "spy",
    "Bene Gesserit Operative should allow recalling for spy supply",
  );
  assert.equal(operativeNoSupplyPlayed.pendingAction.recallForSupply, true);
  assert.deepEqual(
    state
      .recallableSpySupplySpaces(
        operativeNoSupplyPlayed,
        operativeNoSupplyPlayed.pendingAction,
      )
      .map((space) => space.id),
    [highCouncil.id],
    "Bene Gesserit Operative should expose owned spies when supply is empty",
  );
  const operativeSupplyRecalled = state.recallSpyForSupplyForPending(
    operativeNoSupplyPlayed,
    operativeNoSupplyPlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(playerById(operativeSupplyRecalled, p2.id).spies, 1);
  assert.equal(operativeSupplyRecalled.spyPosts[highCouncil.id], undefined);
  assert.equal(operativeSupplyRecalled.pendingAction.mustPlaceSpy, true);
  const operativeAfterSupplyRecallPlaced = state.placeSpyForPending(
    operativeSupplyRecalled,
    operativeSupplyRecalled.pendingAction,
    secrets.id,
  );
  assert.equal(playerById(operativeAfterSupplyRecallPlaced, p2.id).spies, 0);
  assert.equal(operativeAfterSupplyRecallPlaced.spyPosts[secrets.id], p2.id);
  const operativeNoSpy = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [beneGesseritOperative],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 0,
    })),
    {
      commanderTargets: {},
      selectedCard: beneGesseritOperative,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    operativeNoSpy.pendingAction,
    undefined,
    "Bene Gesserit Operative should not pause without supply or an owned spy",
  );
  const commanderOperativeBase = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const commanderOperativePlayed = turnActions.placeAgentAction(
    commanderOperativeBase,
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: beneGesseritOperative,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    commanderOperativePlayed.pendingAction?.kind,
    "spy",
    "Commander Bene Gesserit Operative should queue spy placement",
  );
  assert.equal(
    commanderOperativePlayed.pendingAction.ownerId,
    p4.id,
    "Commander should own the Operative spy placement",
  );
  assert.equal(
    commanderOperativePlayed.pendingAction.source,
    "Bene Gesserit Operative",
  );
  const commanderOperativeSpyPlaced = state.placeSpyForPending(
    commanderOperativePlayed,
    commanderOperativePlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(
    playerById(commanderOperativeSpyPlaced, p4.id).spies,
    2,
    "Commander Operative should spend a Commander spy",
  );
  assert.equal(
    playerById(commanderOperativeSpyPlaced, p2.id).spies,
    playerById(commanderOperativePlayed, p2.id).spies,
    "Commander Operative should not spend the activated Ally's spy",
  );
  assert.equal(commanderOperativeSpyPlaced.spyPosts[highCouncil.id], p4.id);
  const operativeRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const operativeRevealPlan = turnActions.revealTurnPlan(
    playerById(operativeRevealFixture, p2.id),
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
    },
  );
  assert.equal(
    operativeRevealPlan.persuasion,
    3,
    "Bene Gesserit Operative should reveal for 3 persuasion with two spies",
  );
  assert.deepEqual(
    operativeRevealPlan.printedRevealCards,
    [],
    "Bene Gesserit Operative should not require a manual printed reveal adjustment",
  );
  const operativeRevealed = turnActions.revealTurnAction(
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
    },
    { commanderTargets: {}, revealPlan: operativeRevealPlan },
  );
  assert.equal(playerById(operativeRevealed, p2.id).persuasion, 3);
  assert.equal(operativeRevealed.pendingAction, undefined);
  const operativeUnboostedPlan = turnActions.revealTurnPlan(
    playerById(operativeRevealFixture, p2.id),
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id },
    },
  );
  assert.equal(
    operativeUnboostedPlan.persuasion,
    1,
    "Bene Gesserit Operative should reveal for 1 persuasion below two spies",
  );
  const operativeTeamSpyPlan = turnActions.revealTurnPlan(
    playerById(operativeRevealFixture, p2.id),
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p6.id },
    },
  );
  assert.equal(
    operativeTeamSpyPlan.persuasion,
    1,
    "Bene Gesserit Operative should ignore teammate spy posts on Reveal",
  );
  const operativeSharedSpyPlan = turnActions.revealTurnPlan(
    playerById(operativeRevealFixture, p2.id),
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
      sharedSpyPosts: { [secrets.id]: [p2.id] },
    },
  );
  assert.equal(
    operativeSharedSpyPlan.persuasion,
    3,
    "Bene Gesserit Operative should count shared spy posts owned by the revealer",
  );
  const commanderOperativeRevealFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderAllySpyPlan = turnActions.revealTurnPlan(
    playerById(commanderOperativeRevealFixture, p4.id),
    {
      ...commanderOperativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
    },
  );
  assert.equal(
    commanderAllySpyPlan.persuasion,
    1,
    "Commander Operative reveal should ignore the activated Ally's spy posts",
  );
  const commanderOwnSpyPlan = turnActions.revealTurnPlan(
    playerById(commanderOperativeRevealFixture, p4.id),
    {
      ...commanderOperativeRevealFixture,
      spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p4.id },
    },
  );
  assert.equal(
    commanderOwnSpyPlan.persuasion,
    3,
    "Commander Operative reveal should count the Commander's own spy posts",
  );
  const spyNetworkIntrigueReward = data.intrigueCards[0];
  assert.ok(
    spyNetworkIntrigueReward,
    "Expected an Intrigue card for Spy Network reveal coverage",
  );
  const spyNetworkRevealFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      discard: [],
      hand: [spyNetwork],
      highCouncilSeat: false,
      intrigues: [],
      playArea: [],
      persuasion: 0,
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 0,
    })),
    intrigueDeck: [spyNetworkIntrigueReward],
    intrigueDiscard: [],
    sharedSpyPosts: {},
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  };
  const spyNetworkRevealPlan = turnActions.revealTurnPlan(
    playerById(spyNetworkRevealFixture, p2.id),
    spyNetworkRevealFixture,
  );
  assert.equal(
    spyNetworkRevealPlan.persuasion,
    2,
    "Spy Network should reveal for 2 persuasion through specs",
  );
  assert.equal(
    spyNetworkRevealPlan.swords,
    1,
    "Spy Network should reveal for 1 strength through specs",
  );
  assert.deepEqual(
    spyNetworkRevealPlan.printedRevealCards,
    [],
    "Spy Network should not need manual Reveal text",
  );
  const spyNetworkRevealed = turnActions.revealTurnAction(
    spyNetworkRevealFixture,
    {
      commanderTargets: {},
      revealPlan: spyNetworkRevealPlan,
    },
  );
  assert.equal(
    spyNetworkRevealed.pendingAction?.kind,
    "recall-spy",
    "Spy Network should queue its conditional Reveal spy recall",
  );
  assert.equal(spyNetworkRevealed.pendingAction.ownerId, p2.id);
  assert.equal(spyNetworkRevealed.pendingAction.remaining, 1);
  assert.equal(spyNetworkRevealed.pendingAction.strength, 0);
  assert.equal(spyNetworkRevealed.pendingAction.drawIntrigues, 1);
  assert.equal(spyNetworkRevealed.pendingAction.optional, true);
  assert.equal(spyNetworkRevealed.pendingAction.source, "Spy Network");
  assert.equal(playerById(spyNetworkRevealed, p2.id).persuasion, 2);
  assert.deepEqual(
    state
      .recallableSpySpaces(spyNetworkRevealed, spyNetworkRevealed.pendingAction)
      .map((space) => space.id)
      .sort(),
    [highCouncil.id, secrets.id].sort(),
    "Spy Network should allow recalling any owned spy post",
  );
  const spyNetworkRecalled = state.recallSpyForPending(
    spyNetworkRevealed,
    spyNetworkRevealed.pendingAction,
    highCouncil.id,
  );
  assert.equal(
    spyNetworkRecalled.pendingAction,
    undefined,
    "Resolving Spy Network recall should clear the pending action",
  );
  assert.equal(
    spyNetworkRecalled.spyPosts[highCouncil.id],
    undefined,
    "Spy Network recall should remove the chosen spy post",
  );
  assert.equal(
    playerById(spyNetworkRecalled, p2.id).spies,
    1,
    "Spy Network recall should return the spy to supply",
  );
  assert.equal(
    playerById(spyNetworkRecalled, p2.id).intrigues.at(-1)?.name,
    spyNetworkIntrigueReward.name,
    "Spy Network recall should draw one Intrigue",
  );
  assert.equal(
    spyNetworkRecalled.intrigueDeck.length,
    0,
    "Spy Network recall should consume the Intrigue deck card",
  );
  assert.equal(
    spyNetworkRecalled.turnSpyRecalls[p2.id],
    1,
    "Spy Network recall should count as a same-turn spy recall",
  );
  assert.match(
    spyNetworkRecalled.log[0],
    /draws an Intrigue card from Spy Network/,
  );
  assert.match(
    spyNetworkRecalled.log[1],
    /recalls a spy from High Council for Spy Network/,
  );
  assert.doesNotMatch(spyNetworkRecalled.log[1], /adding 0 strength/);
  const spyNetworkOneSpyFixture = {
    ...spyNetworkRevealFixture,
    spyPosts: { [secrets.id]: p2.id },
  };
  const spyNetworkOneSpyPlan = turnActions.revealTurnPlan(
    playerById(spyNetworkOneSpyFixture, p2.id),
    spyNetworkOneSpyFixture,
  );
  const spyNetworkOneSpyRevealed = turnActions.revealTurnAction(
    spyNetworkOneSpyFixture,
    {
      commanderTargets: {},
      revealPlan: spyNetworkOneSpyPlan,
    },
  );
  assert.equal(
    spyNetworkOneSpyRevealed.pendingAction,
    undefined,
    "Spy Network should not queue recall below two spy posts",
  );
}
