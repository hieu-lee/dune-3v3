import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyImperiumCardRevealTroopEffects({
  cards,
  game,
  playerIds,
  state,
  turnActions,
}) {
  const { chani, fremenBondSupport, leadership, unswervingLoyalty } = cards;
  const { allyId, commanderId } = playerIds;
  const p2 = playerById(game, allyId);
  const p4 = playerById(game, commanderId);

  const chaniRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniRevealPlan = turnActions.revealTurnPlan(playerById(chaniRevealFixture, p2.id), chaniRevealFixture);
  assert.equal(chaniRevealPlan.persuasion, 0, "Chani should not automatically grant Fremen Bond persuasion");
  assert.equal(chaniRevealPlan.swords, 0, "Chani should not automatically grant troop-retreat strength");
  const chaniRevealed = turnActions.revealTurnAction(chaniRevealFixture, {
    commanderTargets: {},
    revealPlan: chaniRevealPlan,
  });
  assert.equal(chaniRevealed.pendingAction, undefined, "Chani reveal should not pause for printed text");
  assert.equal(chaniRevealed.pendingQueue.length, 0, "Chani should not queue troop retreat without two deployed troops");
  const chaniFremenSupport = {
    ...fremenBondSupport,
    id: "chani-fremen-bond-support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
  };
  const chaniHandBondPlan = turnActions.revealTurnPlan(
    {
      ...playerById(chaniRevealFixture, p2.id),
      hand: [chani, chaniFremenSupport],
      playArea: [],
      highCouncilSeat: false,
    },
    chaniRevealFixture,
  );
  assert.equal(chaniHandBondPlan.persuasion, 2, "Chani Fremen Bond should count another revealed Fremen card");
  const chaniPlayAreaBondPlan = turnActions.revealTurnPlan(
    {
      ...playerById(chaniRevealFixture, p2.id),
      hand: [chani],
      playArea: [chaniFremenSupport],
      highCouncilSeat: false,
    },
    chaniRevealFixture,
  );
  assert.equal(chaniPlayAreaBondPlan.persuasion, 2, "Chani Fremen Bond should count another Fremen card already in play");

  const chaniOneTroopFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 2,
    deployedTroops: 1,
    discard: [],
    garrison: 0,
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniOneTroopPlan = turnActions.revealTurnPlan(playerById(chaniOneTroopFixture, p2.id), chaniOneTroopFixture);
  const chaniOneTroopRevealed = turnActions.revealTurnAction(chaniOneTroopFixture, {
    commanderTargets: {},
    revealPlan: chaniOneTroopPlan,
  });
  assert.equal(chaniOneTroopRevealed.pendingQueue.length, 0, "Chani should not queue troop retreat with only one deployed troop");

  const chaniRetreatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedTroops: 2,
    discard: [],
    garrison: 0,
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniRetreatPlan = turnActions.revealTurnPlan(playerById(chaniRetreatFixture, p2.id), chaniRetreatFixture);
  const chaniRetreatRevealed = turnActions.revealTurnAction(chaniRetreatFixture, {
    commanderTargets: {},
    revealPlan: chaniRetreatPlan,
  });
  assert.equal(
    chaniRetreatRevealed.pendingAction?.kind,
    "retreat-troops-for-strength",
    "Chani troop retreat should be the active reveal pending action",
  );
  assert.equal(
    chaniRetreatRevealed.pendingQueue.length,
    0,
    "Chani should not queue manual Fremen Bond before troop retreat",
  );
  assert.equal(
    chaniRetreatRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniRetreatRevealed.pendingAction.troopCount
      : undefined,
    2,
    "Chani retreat pending action should require two troops",
  );
  assert.equal(
    chaniRetreatRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniRetreatRevealed.pendingAction.strength
      : undefined,
    4,
    "Chani retreat pending action should add four strength",
  );
  const chaniRetreated = state.resolveRetreatTroopsForStrength(chaniRetreatRevealed, chaniRetreatRevealed.pendingAction);
  assert.equal(playerById(chaniRetreated, p2.id).deployedTroops, 0, "Chani should retreat the two selected troops");
  assert.equal(playerById(chaniRetreated, p2.id).garrison, 2, "Chani should return retreated troops to garrison");
  assert.equal(playerById(chaniRetreated, p2.id).conflict, 4, "Chani should replace the troops' strength with four Reveal strength");
  assert.equal(chaniRetreated.pendingAction, undefined, "Chani retreat should clear its pending action");
  const staleRevealTroopFailures = [];
  const staleChaniRetreatState = {
    ...chaniRetreatRevealed,
    pendingAction: { kind: "draw-cards", ownerId: p2.id, source: "Live pending", amount: 1 },
    pendingQueue: [],
  };
  if (!isDeepStrictEqual(
    state.resolveRetreatTroopsForStrength(staleChaniRetreatState, chaniRetreatRevealed.pendingAction),
    staleChaniRetreatState,
  )) {
    staleRevealTroopFailures.push("retreat-troops-for-strength resolve");
  }
  if (!isDeepStrictEqual(
    state.skipRetreatTroopsForStrength(staleChaniRetreatState, chaniRetreatRevealed.pendingAction),
    staleChaniRetreatState,
  )) {
    staleRevealTroopFailures.push("retreat-troops-for-strength skip");
  }

  const leadershipChaniFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedTroops: 2,
    discard: [],
    garrison: 0,
    hand: [leadership, chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const leadershipChaniPlan = turnActions.revealTurnPlan(
    playerById(leadershipChaniFixture, p2.id),
    leadershipChaniFixture,
  );
  assert.equal(
    leadershipChaniPlan.swords,
    1,
    "Leadership should not pre-count Chani before its optional retreat strength resolves",
  );
  const leadershipChaniRevealed = turnActions.revealTurnAction(leadershipChaniFixture, {
    commanderTargets: {},
    revealPlan: leadershipChaniPlan,
  });
  assert.equal(
    leadershipChaniRevealed.pendingAction?.kind,
    "retreat-troops-for-strength",
    "Leadership plus Chani should still queue Chani's reveal retreat",
  );
  const leadershipChaniRetreated = state.resolveRetreatTroopsForStrength(
    leadershipChaniRevealed,
    leadershipChaniRevealed.pendingAction,
  );
  assert.equal(
    playerById(leadershipChaniRetreated, p2.id).conflict,
    6,
    "Leadership should add 1 strength after Chani actually provides reveal strength",
  );
  assert.match(
    leadershipChaniRetreated.log.join("\n"),
    /adds 1 strength from Leadership because Chani, Clever Tactician provided strength this turn/,
  );
  const agentPlayedLeadershipChaniFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedTroops: 2,
    discard: [],
    garrison: 0,
    hand: [chani],
    playArea: [leadership],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const agentPlayedLeadershipChaniPlan = turnActions.revealTurnPlan(
    playerById(agentPlayedLeadershipChaniFixture, p2.id),
    agentPlayedLeadershipChaniFixture,
  );
  assert.equal(
    agentPlayedLeadershipChaniPlan.swords,
    0,
    "Agent-played Leadership should not contribute reveal strength",
  );
  const agentPlayedLeadershipChaniRevealed = turnActions.revealTurnAction(agentPlayedLeadershipChaniFixture, {
    commanderTargets: {},
    revealPlan: agentPlayedLeadershipChaniPlan,
  });
  const agentPlayedLeadershipChaniRetreated = state.resolveRetreatTroopsForStrength(
    agentPlayedLeadershipChaniRevealed,
    agentPlayedLeadershipChaniRevealed.pendingAction,
  );
  assert.equal(
    playerById(agentPlayedLeadershipChaniRetreated, p2.id).conflict,
    4,
    "Agent-played Leadership should not add a bonus when Chani provides reveal strength",
  );

  const syntheticRetreatState = {
    ...chaniRetreatFixture,
    pendingAction: {
      kind: "retreat-troops-for-strength",
      ownerId: p2.id,
      combatRecipientId: p2.id,
      troopCount: 1,
      strength: 4,
      optional: true,
      source: "Synthetic retreat verifier",
    },
  };
  const syntheticRetreated = state.resolveRetreatTroopsForStrength(
    syntheticRetreatState,
    syntheticRetreatState.pendingAction,
  );
  assert.equal(playerById(syntheticRetreated, p2.id).deployedTroops, 1, "Synthetic retreat should remove the requested troop count");
  assert.equal(playerById(syntheticRetreated, p2.id).garrison, 1, "Synthetic retreat should return exactly one troop to garrison");
  assert.equal(playerById(syntheticRetreated, p2.id).conflict, 6, "Synthetic retreat should subtract troop strength and add printed strength");
  const nonOptionalRetreatPending = { ...syntheticRetreatState.pendingAction, optional: false };
  const nonOptionalSkip = state.skipRetreatTroopsForStrength(
    { ...syntheticRetreatState, pendingAction: nonOptionalRetreatPending },
    nonOptionalRetreatPending,
  );
  assert.equal(
    nonOptionalSkip.pendingAction?.kind,
    "retreat-troops-for-strength",
    "Mandatory retreat-for-strength pending actions should not be skippable",
  );

  const chaniCommanderRetreatFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [chani],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const chaniCommanderRetreatState = {
    ...chaniCommanderRetreatFixture,
    players: chaniCommanderRetreatFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
        : player,
    ),
  };
  const chaniCommanderRetreatPlan = turnActions.revealTurnPlan(
    playerById(chaniCommanderRetreatState, p4.id),
    chaniCommanderRetreatState,
  );
  const chaniCommanderRevealed = turnActions.revealTurnAction(chaniCommanderRetreatState, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: chaniCommanderRetreatPlan,
  });
  assert.equal(
    chaniCommanderRevealed.pendingAction?.kind === "retreat-troops-for-strength"
      ? chaniCommanderRevealed.pendingAction.combatRecipientId
      : undefined,
    p2.id,
    "Commander Chani reveal should route troop retreat to the activated Ally",
  );
  const chaniCommanderRetreated = state.resolveRetreatTroopsForStrength(
    chaniCommanderRevealed,
    chaniCommanderRevealed.pendingAction,
  );
  assert.equal(playerById(chaniCommanderRetreated, p2.id).deployedTroops, 0, "Commander Chani should retreat the activated Ally's troops");
  assert.equal(playerById(chaniCommanderRetreated, p2.id).garrison, 2, "Commander Chani should return activated Ally troops to garrison");
  assert.equal(playerById(chaniCommanderRetreated, p2.id).conflict, 4, "Commander Chani should add strength to the activated Ally");

  const unswervingSoloFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [unswervingLoyalty],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const unswervingSoloPlan = turnActions.revealTurnPlan(playerById(unswervingSoloFixture, p2.id), unswervingSoloFixture);
  assert.equal(unswervingSoloPlan.persuasion, 1, "Unswerving Loyalty should reveal for 1 persuasion");
  assert.equal(unswervingSoloPlan.recruitedTroops, 1, "Unswerving Loyalty should recruit 1 troop on reveal");
  const unswervingSoloRevealed = turnActions.revealTurnAction(unswervingSoloFixture, {
    commanderTargets: {},
    revealPlan: unswervingSoloPlan,
  });
  assert.equal(playerById(unswervingSoloRevealed, p2.id).garrison, 1, "Unswerving Loyalty should add its recruited troop to garrison");
  assert.equal(unswervingSoloRevealed.pendingAction, undefined, "Unswerving Loyalty should not queue deploy-or-retreat without Fremen Bond");

  const unswervingDeployFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [unswervingLoyalty, chaniFremenSupport],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const unswervingDeployPlan = turnActions.revealTurnPlan(playerById(unswervingDeployFixture, p2.id), unswervingDeployFixture);
  const unswervingDeployRevealed = turnActions.revealTurnAction(unswervingDeployFixture, {
    commanderTargets: {},
    revealPlan: unswervingDeployPlan,
  });
  assert.equal(
    unswervingDeployRevealed.pendingAction?.kind,
    "deploy-or-retreat-troops",
    "Unswerving Loyalty Fremen Bond should queue deploy-or-retreat after the reveal recruit",
  );
  const unswervingDeployPending = unswervingDeployRevealed.pendingAction;
  assert.equal(unswervingDeployPending.ownerId, p2.id);
  assert.equal(unswervingDeployPending.recipientId, p2.id);
  assert.equal(unswervingDeployPending.troopCount, 1);
  assert.equal(unswervingDeployPending.source, "Unswerving Loyalty");
  assert.equal(unswervingDeployPending.optional, true);
  assert.equal(playerById(unswervingDeployRevealed, p2.id).garrison, 1, "Unswerving deploy choice should see the reveal-recruited troop");
  assert.equal(state.canDeployForDeployOrRetreatTroops(unswervingDeployRevealed, unswervingDeployPending), true);
  assert.equal(state.canRetreatForDeployOrRetreatTroops(unswervingDeployRevealed, unswervingDeployPending), false);
  const unswervingSkipped = state.skipDeployOrRetreatTroopsChoice(unswervingDeployRevealed, unswervingDeployPending);
  assert.equal(unswervingSkipped.pendingAction, undefined, "Unswerving deploy-or-retreat should be optional");
  assert.equal(playerById(unswervingSkipped, p2.id).garrison, 1, "Skipping Unswerving should keep the recruited troop in garrison");
  const unswervingMandatoryPending = { ...unswervingDeployPending, optional: false };
  const unswervingMandatorySkip = state.skipDeployOrRetreatTroopsChoice(
    { ...unswervingDeployRevealed, pendingAction: unswervingMandatoryPending },
    unswervingMandatoryPending,
  );
  assert.equal(
    unswervingMandatorySkip.pendingAction?.kind,
    "deploy-or-retreat-troops",
    "Mandatory deploy-or-retreat pending actions should not be skippable",
  );
  const unswervingDeployed = state.resolveDeployOrRetreatTroopsChoice(
    unswervingDeployRevealed,
    unswervingDeployPending,
    "deploy",
  );
  assert.equal(playerById(unswervingDeployed, p2.id).garrison, 0, "Unswerving deploy should spend the garrison troop");
  assert.equal(playerById(unswervingDeployed, p2.id).deployedTroops, 1, "Unswerving deploy should add one deployed troop");
  assert.equal(playerById(unswervingDeployed, p2.id).conflict, 2, "Unswerving deploy should add troop strength");
  assert.equal(unswervingDeployed.turnUnitDeployments[p2.id], 1, "Unswerving deploy should count as a turn deployment");
  assert.equal(unswervingDeployed.pendingAction, undefined, "Unswerving deploy should clear its pending action");
  const staleUnswervingDeployState = {
    ...unswervingDeployRevealed,
    pendingAction: { kind: "draw-cards", ownerId: p2.id, source: "Live pending", amount: 1 },
    pendingQueue: [],
  };
  if (!isDeepStrictEqual(
    state.resolveDeployOrRetreatTroopsChoice(staleUnswervingDeployState, unswervingDeployPending, "deploy"),
    staleUnswervingDeployState,
  )) {
    staleRevealTroopFailures.push("deploy-or-retreat-troops resolve");
  }
  if (!isDeepStrictEqual(
    state.skipDeployOrRetreatTroopsChoice(staleUnswervingDeployState, unswervingDeployPending),
    staleUnswervingDeployState,
  )) {
    staleRevealTroopFailures.push("deploy-or-retreat-troops skip");
  }
  assert.deepEqual(
    staleRevealTroopFailures,
    [],
    "Reveal troop pending resolvers should reject stale pending actions",
  );

  const unswervingRetreatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 2,
    deployedTroops: 1,
    discard: [],
    garrison: 0,
    hand: [unswervingLoyalty, chaniFremenSupport],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const unswervingRetreatPlan = turnActions.revealTurnPlan(playerById(unswervingRetreatFixture, p2.id), unswervingRetreatFixture);
  const unswervingRetreatRevealed = turnActions.revealTurnAction(unswervingRetreatFixture, {
    commanderTargets: {},
    revealPlan: unswervingRetreatPlan,
  });
  assert.equal(unswervingRetreatRevealed.pendingAction?.kind, "deploy-or-retreat-troops");
  assert.equal(state.canDeployForDeployOrRetreatTroops(unswervingRetreatRevealed, unswervingRetreatRevealed.pendingAction), true);
  assert.equal(state.canRetreatForDeployOrRetreatTroops(unswervingRetreatRevealed, unswervingRetreatRevealed.pendingAction), true);
  const unswervingRetreated = state.resolveDeployOrRetreatTroopsChoice(
    unswervingRetreatRevealed,
    unswervingRetreatRevealed.pendingAction,
    "retreat",
  );
  assert.equal(playerById(unswervingRetreated, p2.id).deployedTroops, 0, "Unswerving retreat should remove one deployed troop");
  assert.equal(playerById(unswervingRetreated, p2.id).garrison, 2, "Unswerving retreat should keep the reveal recruit and return the retreated troop");
  assert.equal(playerById(unswervingRetreated, p2.id).conflict, 0, "Unswerving retreat should remove the retreated troop strength");
  assert.equal(unswervingRetreated.pendingAction, undefined, "Unswerving retreat should clear its pending action");

  const unswervingCommanderFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [unswervingLoyalty, chaniFremenSupport],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const unswervingCommanderState = {
    ...unswervingCommanderFixture,
    players: unswervingCommanderFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 0, deployedTroops: 0, garrison: 0 }
        : player,
    ),
  };
  const unswervingCommanderPlan = turnActions.revealTurnPlan(
    playerById(unswervingCommanderState, p4.id),
    unswervingCommanderState,
  );
  const unswervingCommanderRevealed = turnActions.revealTurnAction(unswervingCommanderState, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: unswervingCommanderPlan,
  });
  assert.equal(
    unswervingCommanderRevealed.pendingAction?.kind === "deploy-or-retreat-troops"
      ? unswervingCommanderRevealed.pendingAction.recipientId
      : undefined,
    p2.id,
    "Commander Unswerving Loyalty should route deploy-or-retreat to the activated Ally",
  );
  assert.equal(playerById(unswervingCommanderRevealed, p2.id).garrison, 1, "Commander Unswerving should recruit to the activated Ally");
  const unswervingCommanderBlockedState = {
    ...unswervingCommanderRevealed,
    pendingAction: undefined,
    pendingQueue: [],
    conflictDeploymentBlock: {
      actorId: p4.id,
      ownerId: p2.id,
      source: "Verifier deployment block",
    },
  };
  const unswervingCommanderBlockedPendings = state.pendingActionsForReveal(
    playerById(unswervingCommanderBlockedState, p4.id),
    unswervingCommanderBlockedState,
    [unswervingLoyalty],
    p2.id,
  );
  assert.equal(
    unswervingCommanderBlockedPendings.some((pending) => pending.kind === "deploy-or-retreat-troops"),
    false,
    "Commander Unswerving should not queue deploy-or-retreat when the Commander/Ally deployment pair is blocked and no troop can retreat",
  );
  const unswervingCommanderBlockedDeploy = {
    ...unswervingCommanderRevealed,
    conflictDeploymentBlock: {
      actorId: p4.id,
      ownerId: p2.id,
      source: "Verifier deployment block",
    },
  };
  assert.equal(
    state.canDeployForDeployOrRetreatTroops(
      unswervingCommanderBlockedDeploy,
      unswervingCommanderRevealed.pendingAction,
    ),
    false,
    "Commander Unswerving deploy resolution should respect Commander/Ally deployment blocks",
  );
  assert.equal(
    state.resolveDeployOrRetreatTroopsChoice(
      unswervingCommanderBlockedDeploy,
      unswervingCommanderRevealed.pendingAction,
      "deploy",
    ),
    unswervingCommanderBlockedDeploy,
    "Commander Unswerving should not resolve a stale deploy pending when the Commander/Ally deployment pair is blocked",
  );
  const unswervingCommanderRevealedWithBlock = turnActions.revealTurnAction(
    {
      ...unswervingCommanderState,
      conflictDeploymentBlock: {
        actorId: p4.id,
        ownerId: p2.id,
        source: "Verifier deployment block",
      },
    },
    {
      commanderTargets: { [p4.id]: p2.id },
      revealPlan: unswervingCommanderPlan,
    },
  );
  assert.equal(
    unswervingCommanderRevealedWithBlock.pendingAction?.kind,
    "deploy-or-retreat-troops",
    "Reveal clears the previous Agent-play deployment block before Unswerving pending actions are generated",
  );
  const unswervingCommanderDeployed = state.resolveDeployOrRetreatTroopsChoice(
    unswervingCommanderRevealed,
    unswervingCommanderRevealed.pendingAction,
    "deploy",
  );
  assert.equal(playerById(unswervingCommanderDeployed, p2.id).deployedTroops, 1, "Commander Unswerving should deploy the activated Ally's troop");
  assert.equal(playerById(unswervingCommanderDeployed, p2.id).conflict, 2, "Commander Unswerving should add strength to the activated Ally");
  assert.equal(
    unswervingCommanderDeployed.turnUnitDeployments[p4.id],
    1,
    "Commander Unswerving deployment should count on the active Commander's turn",
  );

  return { chaniFremenSupport };
}
