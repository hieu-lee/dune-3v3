import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecTroopDeploymentValidation({
  boardSpaces,
  cards,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { acceptContract, arrakeen, highCouncil, imperialBasin, militarySupport, secrets } = boardSpaces;
  const { fedaykinStilltent, reconnaissance, sardaukarCoordination, strikeFleet } = cards;
  const { p2, p4, p6 } = players;

  const fedaykinMakerEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    game,
    imperialBasin,
  );
  assert.equal(fedaykinMakerEffect.source.garrison, 1, "Fedaykin Stilltent should recruit 1 troop on a Maker Agent space");
  assert.equal(fedaykinMakerEffect.recruitedTroops, 1, "Fedaykin Stilltent recruit should count for deployment limits");
  assert.match(fedaykinMakerEffect.log ?? "", /Fedaykin Stilltent: recruits 1 troop/);
  const fedaykinNoSupplyEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    p2,
    game,
    imperialBasin,
  );
  assert.equal(
    fedaykinNoSupplyEffect.source.garrison,
    12,
    "Fedaykin Stilltent should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    fedaykinNoSupplyEffect.recruitedTroops ?? 0,
    0,
    "Fedaykin Stilltent should not count unplaced troops for deployment limits",
  );
  assert.equal(fedaykinNoSupplyEffect.log, undefined, "Fedaykin Stilltent should not log an unplaced troop");
  const fedaykinNonMakerEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    { ...game, roundMakerSpaceVisits: { [p2.id]: true } },
    acceptContract,
  );
  assert.equal(
    fedaykinNonMakerEffect.source.garrison,
    0,
    "Fedaykin Stilltent should not use prior round Maker visits during a non-Maker Agent placement",
  );
  assert.equal(fedaykinNonMakerEffect.log, undefined, "Fedaykin Stilltent should not log on non-Maker Agent spaces");
  const fedaykinNoSpaceEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p2, garrison: 0 },
    p2,
    { ...game, roundMakerSpaceVisits: { [p2.id]: true } },
  );
  assert.equal(
    fedaykinNoSpaceEffect.source.garrison,
    0,
    "Fedaykin Stilltent Agent specs should require current board-space context",
  );
  const fedaykinCommanderEffect = state.applyCardAgentEffect(
    fedaykinStilltent,
    { ...p4, garrison: 0 },
    { ...p2, garrison: 0 },
    game,
    imperialBasin,
  );
  assert.equal(fedaykinCommanderEffect.source.garrison, 0, "Fedaykin Stilltent should not recruit troops to the Commander");
  assert.equal(fedaykinCommanderEffect.target.garrison, 1, "Fedaykin Stilltent should recruit to the activated Ally for Commander plays");
  assert.equal(fedaykinCommanderEffect.recruitedTroops, 1, "Fedaykin Stilltent Commander recruit should count for deployment limits");
  const fedaykinReveal = turnActions.revealTurnPlan({ ...p2, hand: [fedaykinStilltent], highCouncilSeat: false }, game);
  assert.equal(fedaykinReveal.persuasion, 0, "Fedaykin Stilltent should not reveal for persuasion");
  assert.deepEqual(fedaykinReveal.revealGain, { water: 1 }, "Fedaykin Stilltent should reveal for 1 water");
  const fedaykinPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [fedaykinStilltent],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const fedaykinPlaced = turnActions.placeAgentAction(fedaykinPlacementFixture, {
    commanderTargets: {},
    selectedCard: fedaykinStilltent,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    playerById(fedaykinPlaced, p2.id).garrison,
    1,
    "Fedaykin Stilltent should receive current Maker space context through placeAgentAction",
  );
  assert.equal(fedaykinPlaced.pendingAction?.kind, "deploy", "Fedaykin Stilltent's recruited troop should be deployable");
  assert.match(fedaykinPlaced.log.join("\n"), /Fedaykin Stilltent: recruits 1 troop/);
  const strikeFleetRecallPending = {
    kind: "recall-spy",
    ownerId: p2.id,
    combatRecipientId: p2.id,
    remaining: 1,
    strength: 0,
    source: "Verifier Spy Recall",
    optional: true,
  };
  const strikeFleetSpyRecallFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deployedTroops: 0,
      discard: [],
      garrison: 0,
      hand: [strikeFleet],
      playArea: [],
    })),
    pendingAction: strikeFleetRecallPending,
    pendingQueue: [],
    spyPosts: {
      [arrakeen.id]: p2.id,
      [secrets.id]: p2.id,
    },
    sharedSpyPosts: {},
  };
  const strikeFleetSpyRecalled = state.recallSpyForPending(
    strikeFleetSpyRecallFixture,
    strikeFleetRecallPending,
    secrets.id,
  );
  assert.equal(strikeFleetSpyRecalled.turnSpyRecalls[p2.id], 1, "Spy recall pending resolution should mark same-turn spy recalls");
  const strikeFleetPlaced = turnActions.placeAgentAction(strikeFleetSpyRecalled, {
    commanderTargets: {},
    selectedCard: strikeFleet,
    selectedSpace: arrakeen,
  });
  assert.equal(
    playerById(strikeFleetPlaced, p2.id).garrison,
    4,
    "Strike Fleet should combine Arrakeen's troop with its same-turn-spy-recall recruits",
  );
  assert.deepEqual(
    strikeFleetPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 4,
      source: "Arrakeen",
    },
    "Strike Fleet recruited troops should be deployable through the normal combat-space pending cap",
  );
  assert.match(strikeFleetPlaced.log.join("\n"), /Strike Fleet: recruits 3 troops/);
  const sardaukarPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [sardaukarCoordination],
    highCouncilSeat: true,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const sardaukarPlaced = turnActions.placeAgentAction(sardaukarPlacementFixture, {
    commanderTargets: {},
    selectedCard: sardaukarCoordination,
    selectedSpace: highCouncil,
  });
  assert.equal(
    playerById(sardaukarPlaced, p2.id).garrison,
    3,
    "Sardaukar Coordination should see High Council's recruited troops in the deployment owner garrison",
  );
  assert.deepEqual(
    sardaukarPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 3,
      source: "Sardaukar Coordination",
    },
    "Sardaukar Coordination should let same-turn recruits deploy from a non-combat Landsraad space",
  );
  const sardaukarDeployed = state.deployTroopToConflict(sardaukarPlaced, sardaukarPlaced.pendingAction);
  assert.equal(playerById(sardaukarDeployed, p2.id).garrison, 2, "Sardaukar Coordination deployment should spend a recruited garrison troop");
  assert.equal(playerById(sardaukarDeployed, p2.id).deployedTroops, 1, "Sardaukar Coordination deployment should add one deployed troop");
  assert.equal(playerById(sardaukarDeployed, p2.id).conflict, 2, "Sardaukar Coordination deployment should add troop strength");
  assert.equal(sardaukarDeployed.turnUnitDeployments[p2.id], 1, "Sardaukar Coordination deployment should count on the active player's turn");
  const sardaukarNoSupplyPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deployedTroops: 0,
      discard: [],
      garrison: 12,
      hand: [sardaukarCoordination],
      highCouncilSeat: true,
      jessicaMemories: 0,
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: sardaukarCoordination, selectedSpace: highCouncil },
  );
  assert.equal(
    sardaukarNoSupplyPlaced.pendingAction,
    undefined,
    "Sardaukar Coordination should not deploy existing garrison troops when no troops were recruited",
  );
  const commanderSardaukarPlacementBase = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    discard: [],
    garrison: 0,
    hand: [sardaukarCoordination],
    highCouncilSeat: true,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const commanderSardaukarPlacementFixture = {
    ...commanderSardaukarPlacementBase,
    players: commanderSardaukarPlacementBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, deployedTroops: 0, garrison: 0, jessicaMemories: 0 }
        : player
    ),
  };
  const commanderSardaukarPlaced = turnActions.placeAgentAction(commanderSardaukarPlacementFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: sardaukarCoordination,
    selectedSpace: highCouncil,
  });
  assert.equal(playerById(commanderSardaukarPlaced, p4.id).garrison, 0, "Commander Sardaukar should not recruit troops to the Commander");
  assert.equal(playerById(commanderSardaukarPlaced, p2.id).garrison, 3, "Commander Sardaukar should recruit High Council troops to the activated Ally");
  assert.deepEqual(
    commanderSardaukarPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 3,
      source: "Sardaukar Coordination",
    },
    "Commander Sardaukar should let the activated Ally deploy same-turn recruited troops",
  );
  assert.equal(commanderSardaukarPlaced.spaces[highCouncil.id], p2.id, "Commander Sardaukar should occupy High Council for the activated Ally");
  const commanderSardaukarDeployed = state.deployTroopToConflict(commanderSardaukarPlaced, commanderSardaukarPlaced.pendingAction);
  assert.equal(playerById(commanderSardaukarDeployed, p2.id).garrison, 2, "Commander Sardaukar deployment should spend the Ally's recruited troop");
  assert.equal(
    commanderSardaukarDeployed.turnUnitDeployments[p4.id],
    1,
    "Commander Sardaukar deployment should count on the active Commander's turn",
  );
  const arrakeenNoSupplyBoardEffect = state.applyBoardEffect(
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    p2,
    arrakeen,
  );
  assert.equal(
    arrakeenNoSupplyBoardEffect.source.garrison,
    12,
    "Board-space Agent troop rewards should not recruit beyond the Ally troop supply",
  );
  const arrakeenNoSupplyPlacementFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deployedTroops: 0,
    garrison: 12,
    hand: [reconnaissance],
    jessicaMemories: 0,
    playArea: [],
  }));
  const arrakeenNoSupplyPlaced = turnActions.placeAgentAction(arrakeenNoSupplyPlacementFixture, {
    commanderTargets: {},
    selectedCard: reconnaissance,
    selectedSpace: arrakeen,
  });
  assert.equal(
    playerById(arrakeenNoSupplyPlaced, p2.id).garrison,
    12,
    "Arrakeen placement should not recruit beyond the Ally troop supply",
  );
  assert.deepEqual(
    arrakeenNoSupplyPlaced.pendingAction,
    {
      kind: "deploy",
      ownerId: p2.id,
      remaining: 2,
      source: "Arrakeen",
    },
    "Arrakeen should only allow the base +2 deployment when no board troop was actually recruited",
  );
  const arrakeenCommanderNoSupplyBoardEffect = state.applyBoardEffect(
    p4,
    { ...p2, deployedTroops: 0, garrison: 12, jessicaMemories: 0 },
    arrakeen,
  );
  assert.equal(
    arrakeenCommanderNoSupplyBoardEffect.target.garrison,
    12,
    "Commander-routed board-space troop rewards should not recruit beyond the activated Ally troop supply",
  );
  const militarySupportNoSupplyPlayers = game.players.map((player) =>
    player.team === p4.team && player.role === "Ally"
      ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
      : player
  );
  assert.equal(
    state.pendingActionForSpace(militarySupport, p4, p6, militarySupportNoSupplyPlayers),
    undefined,
    "Military Support should not queue reinforcement when the team has no Ally troop supply",
  );
  const militarySupportLimitedPlayers = game.players.map((player) => {
    if (player.id === p2.id) return { ...player, deployedTroops: 0, garrison: 11, jessicaMemories: 0 };
    if (player.id === p6.id) return { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 };
    return player;
  });
  const militarySupportLimitedPending = state.pendingActionForSpace(
    militarySupport,
    p4,
    p6,
    militarySupportLimitedPlayers,
  );
  assert.equal(
    militarySupportLimitedPending?.remaining,
    1,
    "Military Support should cap pending reinforcements to available team troop supply",
  );
  const militarySupportLimitedState = {
    ...game,
    pendingAction: militarySupportLimitedPending,
    pendingQueue: [],
    players: militarySupportLimitedPlayers,
  };
  const militarySupportLimitedResolved = state.reinforceTroop(
    militarySupportLimitedState,
    militarySupportLimitedPending,
    p2.id,
    "garrison",
  );
  assert.equal(
    playerById(militarySupportLimitedResolved, p2.id).garrison,
    12,
    "Military Support should recruit the last available troop into garrison",
  );
  assert.equal(
    militarySupportLimitedResolved.pendingAction,
    undefined,
    "Military Support should finish after the team's troop supply is exhausted",
  );
}
