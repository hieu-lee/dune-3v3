import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecAgentSpyRevealValidation({
  boardSpaces,
  cards,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { highCouncil, secrets } = boardSpaces;
  const { convincingArgument, dagger, devastatingAssault, doubleAgent, hiddenMissive, wheelsWithinWheels } = cards;
  const { p2, p3, p4 } = players;

  const doubleAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [doubleAgent],
    playArea: [],
    spies: 2,
  }));
  const doubleAgentSpiedSpace = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [highCouncil.id]: p2.id, [secrets.id]: p3.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(doubleAgentSpiedSpace.pendingAction?.kind, "spy", "Double Agent should queue optional spy placement");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.ownerId, p2.id, "Double Agent spy placement should belong to the card player");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.allowSharedPost, true, "Double Agent should use shared-post placement");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.mustPlaceSpy, undefined, "Double Agent spy placement should be optional");
  assert.equal(doubleAgentSpiedSpace.pendingAction?.source, "Double Agent");
  assert.deepEqual(
    state.placeableSpySpaces(doubleAgentSpiedSpace, doubleAgentSpiedSpace.pendingAction).map((space) => space.id),
    [secrets.id],
    "Double Agent should only allow sharing another player's observation post",
  );
  const doubleAgentSkipped = state.finishPendingAction(doubleAgentSpiedSpace);
  assert.equal(doubleAgentSkipped.pendingAction, undefined, "Double Agent optional spy placement should be skippable");
  assert.equal(playerById(doubleAgentSkipped, p2.id).spies, playerById(doubleAgentSpiedSpace, p2.id).spies);
  const doubleAgentPlacedSpy = state.placeSpyForPending(doubleAgentSpiedSpace, doubleAgentSpiedSpace.pendingAction, secrets.id);
  assert.equal(doubleAgentPlacedSpy.pendingAction, undefined, "Placing Double Agent's spy should clear the pending action");
  assert.equal(doubleAgentPlacedSpy.spyPosts[secrets.id], p3.id, "Double Agent should leave the original spy owner in place");
  assert.deepEqual(doubleAgentPlacedSpy.sharedSpyPosts[secrets.id], [p2.id], "Double Agent should share the chosen spy post");
  assert.equal(playerById(doubleAgentPlacedSpy, p2.id).spies, playerById(doubleAgentSpiedSpace, p2.id).spies - 1);
  assert.match(doubleAgentPlacedSpy.log[0], /places a spy near Secrets from Double Agent/);
  const doubleAgentUnspiedSpace = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [secrets.id]: p3.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(
    doubleAgentUnspiedSpace.pendingAction,
    undefined,
    "Double Agent should not queue placement without own spy on the current Agent space",
  );
  const doubleAgentNoSharedTarget = turnActions.placeAgentAction(
    {
      ...doubleAgentFixture,
      spyPosts: { [highCouncil.id]: p2.id },
      sharedSpyPosts: {},
      spaces: {},
    },
    { commanderTargets: {}, selectedCard: doubleAgent, selectedSpace: highCouncil },
  );
  assert.equal(
    doubleAgentNoSharedTarget.pendingAction,
    undefined,
    "Double Agent should not pause when no other player's spy post can be shared",
  );
  const hiddenMissiveDraw = { ...dagger, id: "hidden-missive-agent-draw-fixture" };
  const hiddenMissiveEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p2,
      deck: [hiddenMissiveDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p2.influence, bene: 2 },
    },
    p2,
  );
  assert.equal(hiddenMissiveEffect.source.hand[0]?.id, hiddenMissiveDraw.id, "Hidden Missive Agent spec should draw 1 card");
  assert.equal(hiddenMissiveEffect.source.garrison, 1, "Hidden Missive Agent spec should recruit 1 troop");
  assert.equal(hiddenMissiveEffect.recruitedTroops, 1, "Hidden Missive Agent recruit should count for deployment limits");
  assert.match(hiddenMissiveEffect.log ?? "", /Hidden Missive: recruits 1 troop; draws 1 card/);
  const hiddenMissiveNoSupplyDraw = { ...dagger, id: "hidden-missive-no-supply-agent-draw-fixture" };
  const hiddenMissiveNoSupplyEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p2,
      deck: [hiddenMissiveNoSupplyDraw],
      deployedTroops: 0,
      discard: [],
      hand: [],
      garrison: 12,
      influence: { ...p2.influence, bene: 2 },
      jessicaMemories: 0,
    },
    p2,
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.source.hand[0]?.id,
    hiddenMissiveNoSupplyDraw.id,
    "Hidden Missive should still draw when its troop recruit is supply-capped",
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.source.garrison,
    12,
    "Hidden Missive should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    hiddenMissiveNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Hidden Missive should not count an unplaced troop for deployment limits",
  );
  assert.match(hiddenMissiveNoSupplyEffect.log ?? "", /Hidden Missive: draws 1 card/);
  assert.equal(
    hiddenMissiveNoSupplyEffect.log?.includes("recruits 1 troop"),
    false,
    "Hidden Missive should not log an unplaced troop",
  );
  const hiddenMissiveCommanderDraw = { ...dagger, id: "hidden-missive-commander-agent-draw-fixture" };
  const hiddenMissiveCommanderEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p4,
      deck: [hiddenMissiveCommanderDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p4.influence, bene: 2 },
    },
    { ...p2, garrison: 0 },
  );
  assert.equal(
    hiddenMissiveCommanderEffect.source.hand[0]?.id,
    hiddenMissiveCommanderDraw.id,
    "Hidden Missive Commander Agent spec should draw 1 card for the source",
  );
  assert.equal(hiddenMissiveCommanderEffect.source.garrison, 0, "Hidden Missive should not recruit troops to the Commander");
  assert.equal(hiddenMissiveCommanderEffect.target.garrison, 1, "Hidden Missive should recruit 1 troop to the activated Ally");
  assert.equal(hiddenMissiveCommanderEffect.recruitedTroops, 1, "Hidden Missive Commander recruit should count for deployment limits");
  assert.match(
    hiddenMissiveCommanderEffect.log ?? "",
    /Hidden Missive: draws 1 card; Feyd-Rautha Harkonnen recruits 1 troop/,
  );
  const hiddenMissiveCommanderNoSupplyDraw = { ...dagger, id: "hidden-missive-commander-no-supply-agent-draw-fixture" };
  const hiddenMissiveCommanderNoSupplyEffect = state.applyCardAgentEffect(
    hiddenMissive,
    {
      ...p4,
      deck: [hiddenMissiveCommanderNoSupplyDraw],
      discard: [],
      hand: [],
      garrison: 0,
      influence: { ...p4.influence, bene: 2 },
    },
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.source.hand[0]?.id,
    hiddenMissiveCommanderNoSupplyDraw.id,
    "Commander Hidden Missive should still draw when activated-Ally troop recruit is supply-capped",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.source.garrison,
    0,
    "Commander Hidden Missive no-supply case should not recruit troops to the Commander",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.target.garrison,
    12,
    "Commander Hidden Missive should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Commander Hidden Missive should not count unplaced activated-Ally troops for deployment limits",
  );
  assert.match(hiddenMissiveCommanderNoSupplyEffect.log ?? "", /Hidden Missive: draws 1 card/);
  assert.equal(
    hiddenMissiveCommanderNoSupplyEffect.log?.includes(`${p2.leader} recruits 1 troop`),
    false,
    "Commander Hidden Missive should not log an unplaced activated-Ally troop",
  );
  const hiddenMissiveUnqualified = state.applyCardAgentEffect(
    hiddenMissive,
    { ...p2, deck: [hiddenMissiveDraw], discard: [], hand: [], garrison: 0 },
    p2,
  );
  assert.equal(hiddenMissiveUnqualified.source.hand.length, 0, "Hidden Missive should not draw below 2 Bene Gesserit Influence");
  assert.equal(hiddenMissiveUnqualified.source.garrison, 0, "Hidden Missive should not recruit below 2 Bene Gesserit Influence");
  assert.equal(hiddenMissiveUnqualified.log, undefined, "Hidden Missive should not log below its Influence threshold");
  const wheelsEffect = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, greatHouses: 2, spacing: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsEffect.source.resources,
    { solari: 2, spice: 1, water: 0 },
    "Wheels Within Wheels should gain its Agent Solari and spice through specs",
  );
  assert.match(wheelsEffect.log ?? "", /Wheels Within Wheels: gains 2 Solari and 1 spice/);
  const wheelsEmperorIconOnly = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, greatHouses: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsEmperorIconOnly.source.resources,
    { solari: 2, spice: 0, water: 0 },
    "Wheels Within Wheels should allow the Emperor-icon Influence reward independently",
  );
  const wheelsShaddamPersonalEmperor = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p4,
      influence: { ...p4.influence, emperor: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p4,
  );
  assert.deepEqual(
    wheelsShaddamPersonalEmperor.source.resources,
    { solari: 2, spice: 0, water: 0 },
    "Wheels Within Wheels should count Shaddam Commander personal Emperor Influence for the Emperor-icon reward",
  );
  const wheelsSpacingOnly = state.applyCardAgentEffect(
    wheelsWithinWheels,
    {
      ...p2,
      influence: { ...p2.influence, spacing: 2 },
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
  );
  assert.deepEqual(
    wheelsSpacingOnly.source.resources,
    { solari: 0, spice: 1, water: 0 },
    "Wheels Within Wheels should allow the Spacing Guild Influence reward independently",
  );
  const wheelsUnqualified = state.applyCardAgentEffect(
    wheelsWithinWheels,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(
    wheelsUnqualified.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Wheels Within Wheels should not gain resources below its Influence thresholds",
  );
  assert.equal(wheelsUnqualified.log, undefined, "Wheels Within Wheels should not log below its Influence thresholds");
  const wheelsRevealFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      hand: [wheelsWithinWheels],
      highCouncilSeat: false,
      persuasion: 0,
      playArea: [],
      revealed: false,
      spies: 1,
    })),
    sharedSpyPosts: {},
    spyPosts: {},
  };
  const wheelsRevealPlan = turnActions.revealTurnPlan(playerById(wheelsRevealFixture, p2.id), wheelsRevealFixture);
  assert.equal(wheelsRevealPlan.persuasion, 1, "Wheels Within Wheels should reveal for 1 persuasion through specs");
  const wheelsRevealed = turnActions.revealTurnAction(wheelsRevealFixture, {
    commanderTargets: {},
    revealPlan: wheelsRevealPlan,
  });
  assert.equal(wheelsRevealed.pendingAction?.kind, "spy", "Wheels Within Wheels Reveal should queue a spy placement");
  assert.equal(wheelsRevealed.pendingAction?.source, "Wheels Within Wheels");
  assert.equal(wheelsRevealed.pendingAction?.ownerId, p2.id);
  assert.equal(wheelsRevealed.pendingAction?.remaining, 1);
  assert.equal(wheelsRevealed.pendingAction?.mustPlaceSpy, true);
  assert.equal(playerById(wheelsRevealed, p2.id).persuasion, 1);
  const wheelsRevealSpySpace = state.placeableSpySpaces(wheelsRevealed, wheelsRevealed.pendingAction)[0];
  assert.ok(wheelsRevealSpySpace, "Wheels Within Wheels Reveal should have a legal spy placement space");
  const wheelsPlacedSpy = state.placeSpyForPending(wheelsRevealed, wheelsRevealed.pendingAction, wheelsRevealSpySpace.id);
  assert.equal(wheelsPlacedSpy.pendingAction, undefined, "Placing the Wheels Within Wheels reveal spy should clear pending");
  assert.equal(wheelsPlacedSpy.spyPosts[wheelsRevealSpySpace.id], p2.id, "Wheels Within Wheels should place the chosen spy");
  assert.equal(playerById(wheelsPlacedSpy, p2.id).spies, 0, "Wheels Within Wheels should spend the reveal spy");
  assert.match(wheelsPlacedSpy.log[0], /places a spy near .* from Wheels Within Wheels/);
  const wheelsRevealNoSpyFixture = {
    ...wheelsRevealFixture,
    players: wheelsRevealFixture.players.map((player) => player.id === p2.id ? { ...player, spies: 0 } : player),
  };
  const wheelsNoSpyPlan = turnActions.revealTurnPlan(playerById(wheelsRevealNoSpyFixture, p2.id), wheelsRevealNoSpyFixture);
  const wheelsNoSpyReveal = turnActions.revealTurnAction(wheelsRevealNoSpyFixture, {
    commanderTargets: {},
    revealPlan: wheelsNoSpyPlan,
  });
  assert.equal(
    wheelsNoSpyReveal.pendingAction,
    undefined,
    "Wheels Within Wheels should not pause Reveal when no spy can be placed",
  );
  const devastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    { ...p2, garrison: 0 },
  );
  assert.equal(devastatingAssaultEffect.source.resources.solari, 1, "Devastating Assault should gain 1 Agent Solari");
  assert.equal(devastatingAssaultEffect.target.garrison, 1, "Devastating Assault should recruit 1 troop for the activated Ally");
  assert.equal(devastatingAssaultEffect.recruitedTroops, 1, "Activated-Ally Agent recruits should be exposed for deployment limits");
  assert.match(devastatingAssaultEffect.log ?? "", /Devastating Assault: gains 1 Solari; .* recruits 1 troop/);
  const invalidDevastatingAssaultEffect = state.applyCardAgentEffect(
    devastatingAssault,
    { ...p4, resources: { solari: 0, spice: 0, water: 0 } },
    p4,
  );
  assert.equal(invalidDevastatingAssaultEffect.source.resources.solari, 0, "Routed Agent specs should not partially apply without an activated Ally");
  assert.equal(invalidDevastatingAssaultEffect.log, undefined, "Invalid routed Agent specs should not log");

}
