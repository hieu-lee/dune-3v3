import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function spaceById(data, spaceId) {
  const space = data.boardSpaces.find((candidate) => candidate.id === spaceId);
  assert.ok(space, `Expected board space ${spaceId}`);
  return space;
}

function withPlayer(game, playerId, update) {
  return {
    ...game,
    players: game.players.map((player) => player.id === playerId ? update(player) : player),
  };
}

function adjustInfluenceAndResolve(state, game, playerId, faction, amount) {
  const previousPlayers = game.players;
  const influencedState = {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? state.adjustInfluence(player, faction, amount) : player
    ),
  };
  return state.resolveLeaderInfluenceThresholdRewards(influencedState, previousPlayers);
}

function spyPostsForAllChoiceSpaces(state, ownerId) {
  return Object.fromEntries(
    state.spyObservationPostChoiceSpaces().map((space) => [
      state.spyObservationPostIdForSpace(space.id),
      ownerId,
    ]),
  );
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const game = state.initialGame();

  const feyd = playerById(game, "p2");
  const oneInfluenceFeyd = {
    ...feyd,
    influence: { ...feyd.influence, bene: 1 },
  };
  const thresholdFeyd = state.adjustInfluence(oneInfluenceFeyd, "bene", 1);
  assert.equal(thresholdFeyd.influence.bene, 2, "Influence should advance on the chosen faction track");
  assert.equal(thresholdFeyd.vp, oneInfluenceFeyd.vp + 1, "Reaching 2 Influence should score 1 VP");

  const thirdInfluenceFeyd = state.adjustInfluence(thresholdFeyd, "bene", 1);
  assert.equal(thirdInfluenceFeyd.influence.bene, 3);
  assert.equal(thirdInfluenceFeyd.vp, thresholdFeyd.vp, "Further Influence should not rescore the 2-Influence VP");

  const droppedFeyd = state.adjustInfluence(thirdInfluenceFeyd, "bene", -2);
  assert.equal(droppedFeyd.influence.bene, 1);
  assert.equal(droppedFeyd.vp, thirdInfluenceFeyd.vp - 1, "Dropping below 2 Influence should lose the VP");

  const flooredFeyd = state.adjustInfluence(droppedFeyd, "bene", -4);
  assert.equal(flooredFeyd.influence.bene, 0, "Influence should not go below zero");
  assert.equal(flooredFeyd.vp, droppedFeyd.vp, "Dropping further below the threshold should not lose more VP");

  const secrets = spaceById(data, "secrets");
  const economicSupport = spaceById(data, "economic-support");
  const allyEffect = state.applyBoardEffect(oneInfluenceFeyd, oneInfluenceFeyd, secrets);
  assert.equal(allyEffect.source.influence.bene, 2, "Faction board spaces should move the acting Ally's cube");
  assert.equal(allyEffect.source.vp, oneInfluenceFeyd.vp + 1, "Board-space Influence should score at the threshold");

  const shaddam = playerById(game, "p4");
  const activatedFeyd = {
    ...feyd,
    influence: { ...feyd.influence, bene: 1 },
  };
  const commanderDelegated = state.applyBoardEffect(shaddam, activatedFeyd, secrets);
  assert.equal(commanderDelegated.source.influence.bene, shaddam.influence.bene, "Commanders should not gain game-board faction cubes");
  assert.equal(commanderDelegated.source.vp, shaddam.vp);
  assert.equal(commanderDelegated.target.influence.bene, 2, "Activated Allies should receive delegated game-board Influence");
  assert.equal(commanderDelegated.target.vp, activatedFeyd.vp + 1, "Delegated Influence should score for the activated Ally");

  const oneGreatHouseFeyd = {
    ...feyd,
    influence: { ...feyd.influence, greatHouses: 1, emperor: 1 },
  };
  const allyOnGreatHousesSpace = state.applyBoardEffect(oneGreatHouseFeyd, oneGreatHouseFeyd, economicSupport);
  assert.equal(
    allyOnGreatHousesSpace.source.influence.greatHouses,
    2,
    "Great Houses spaces should move the acting Ally on the six-player Great Houses track",
  );
  assert.equal(
    allyOnGreatHousesSpace.source.influence.emperor,
    1,
    "Great Houses spaces should not move an Ally on Shaddam's personal Emperor track",
  );
  assert.equal(allyOnGreatHousesSpace.source.vp, oneGreatHouseFeyd.vp + 1);

  const shaddamOnGreatHousesSpace = state.applyBoardEffect(shaddam, oneGreatHouseFeyd, economicSupport);
  assert.equal(
    shaddamOnGreatHousesSpace.target.influence.greatHouses,
    2,
    "Shaddam should delegate Great Houses board Influence to the activated Ally",
  );
  assert.equal(
    shaddamOnGreatHousesSpace.target.influence.emperor,
    1,
    "Shaddam should not move an activated Ally on his personal Emperor track",
  );
  assert.equal(shaddamOnGreatHousesSpace.target.vp, oneGreatHouseFeyd.vp + 1);
  assert.equal(shaddamOnGreatHousesSpace.source.influence.emperor, shaddam.influence.emperor);

  const shaddamGreatHousesChoice = state.pendingActionForBoardInfluenceChoice(economicSupport, shaddam, oneGreatHouseFeyd);
  assert.deepEqual(
    shaddamGreatHousesChoice,
    undefined,
    "Great Houses support spaces should not queue Shaddam's old Emperor mapped-choice flow",
  );

  const vastWealth = spaceById(data, "vast-wealth");
  const oneInfluenceShaddam = {
    ...shaddam,
    influence: { ...shaddam.influence, emperor: 1 },
  };
  const commanderPersonal = state.applyBoardEffect(oneInfluenceShaddam, activatedFeyd, vastWealth);
  assert.equal(commanderPersonal.source.influence.emperor, 2, "Personal-board Influence should stay with the Commander");
  assert.equal(commanderPersonal.source.vp, oneInfluenceShaddam.vp + 1, "Commander personal-board Influence should score at 2");
  assert.equal(commanderPersonal.target.influence.emperor, activatedFeyd.influence.emperor);

  const rewardGame = { ...game, pendingAction: undefined, pendingQueue: [] };

  const greatHousesRewardFixture = withPlayer(rewardGame, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, greatHouses: 3 },
  }));
  const greatHousesReward = adjustInfluenceAndResolve(state, greatHousesRewardFixture, "p2", "greatHouses", 1);
  assert.equal(playerById(greatHousesReward, "p2").influence.greatHouses, 4);
  assert.equal(
    playerById(greatHousesReward, "p2").garrison,
    playerById(greatHousesRewardFixture, "p2").garrison + 2,
    "Reaching 4 Great Houses Influence should recruit 2 troops",
  );

  const spacingRewardFixture = withPlayer(rewardGame, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, spacing: 3 },
  }));
  const spacingReward = adjustInfluenceAndResolve(state, spacingRewardFixture, "p2", "spacing", 1);
  assert.equal(
    playerById(spacingReward, "p2").resources.solari,
    playerById(spacingRewardFixture, "p2").resources.solari + 3,
    "Reaching 4 Spacing Guild Influence should gain 3 Solari",
  );

  const beneRewardFixture = withPlayer(rewardGame, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, bene: 3 },
  }));
  const beneReward = adjustInfluenceAndResolve(state, beneRewardFixture, "p2", "bene", 1);
  assert.equal(
    playerById(beneReward, "p2").intrigues.length,
    playerById(beneRewardFixture, "p2").intrigues.length + 1,
    "Reaching 4 Bene Gesserit Influence should draw 1 Intrigue",
  );

  const fringeRewardFixture = withPlayer(rewardGame, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, fringeWorlds: 3 },
    spies: 1,
  }));
  const fringeReward = adjustInfluenceAndResolve(state, fringeRewardFixture, "p2", "fringeWorlds", 1);
  assert.equal(fringeReward.pendingAction?.kind, "spy", "Reaching 4 Fringe Worlds Influence should queue spy placement");
  assert.equal(fringeReward.pendingAction?.ownerId, "p2");
  assert.equal(fringeReward.pendingAction?.remaining, 1);
  assert.equal(fringeReward.pendingAction?.mustPlaceSpy, true);
  assert.equal(fringeReward.pendingAction?.recallForSupply, true);

  const arrakeenPostId = state.spyObservationPostIdForSpace("arrakeen");
  const fringeRecallFixture = withPlayer({
    ...rewardGame,
    spyPosts: { [arrakeenPostId]: "p2" },
  }, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, fringeWorlds: 3 },
    spies: 0,
  }));
  const fringeRecallReward = adjustInfluenceAndResolve(state, fringeRecallFixture, "p2", "fringeWorlds", 1);
  assert.equal(
    fringeRecallReward.pendingAction?.kind,
    "spy",
    "Reaching 4 Fringe Worlds Influence with no supply spies should still queue recall-for-supply placement",
  );
  assert.equal(fringeRecallReward.pendingAction?.recallForSupply, true);
  assert.deepEqual(
    state.recallableSpySupplySpaces(fringeRecallReward, fringeRecallReward.pendingAction).map((space) => space.id),
    ["arrakeen"],
    "Fringe Worlds recall-for-supply reward should expose recallable owned spies",
  );

  const fringeBlockedFixture = withPlayer({
    ...rewardGame,
    spyPosts: spyPostsForAllChoiceSpaces(state, "p3"),
  }, "p2", (player) => ({
    ...player,
    influence: { ...player.influence, fringeWorlds: 3 },
    spies: 1,
  }));
  const fringeBlockedReward = adjustInfluenceAndResolve(state, fringeBlockedFixture, "p2", "fringeWorlds", 1);
  assert.equal(
    fringeBlockedReward.pendingAction,
    undefined,
    "Reaching 4 Fringe Worlds Influence should not queue an unresolvable mandatory spy placement",
  );

  const fringePlacementCard = {
    id: "verify-influence-fringe-placement-card",
    name: "Verify Influence Fringe Placement Card",
    icons: ["fremen"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const fringeTrashableCard = {
    id: "verify-influence-fringe-trashable-card",
    name: "Verify Influence Fringe Trashable Card",
    icons: [],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const fringePlacementFixture = withPlayer({
    ...rewardGame,
    activeSeat: game.players.findIndex((player) => player.id === "p2"),
    intrigueDeck: [data.intrigueCards[0]],
    intrigueDiscard: [],
    spaces: {},
  }, "p2", (player) => ({
    ...player,
    hand: [fringePlacementCard],
    playArea: [fringeTrashableCard],
    agentsReady: Math.max(1, player.agentsReady),
    resources: { ...player.resources, spice: Math.max(player.resources.spice, 2) },
    influence: { ...player.influence, fringeWorlds: 3 },
    spies: 1,
  }));
  const fringePlacement = turnActions.placeAgentAction(fringePlacementFixture, {
    commanderTargets: {},
    selectedCard: fringePlacementCard,
    selectedSpace: spaceById(data, "controversial-tech"),
  });
  assert.equal(
    fringePlacement.pendingAction?.kind,
    "trash-card",
    "Normal Controversial Technology should queue its mandatory trash before the Fringe Worlds 4 spy reward",
  );
  assert.equal(
    fringePlacement.pendingQueue[0]?.kind,
    "spy",
    "Normal Controversial Technology should keep the Fringe Worlds 4 spy reward behind the space trash",
  );
  assert.equal(fringePlacement.pendingQueue[0]?.source, "4 Fringe Worlds Influence");

  const militarySupportCard = {
    id: "verify-influence-military-support-card",
    name: "Verify Influence Military Support Card",
    icons: ["emperor"],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
  const militarySupportFixture = withPlayer({
    ...rewardGame,
    activeSeat: game.players.findIndex((player) => player.id === "p2"),
    spaces: {},
  }, "p2", (player) => ({
    ...player,
    hand: [militarySupportCard],
    playArea: [],
    agentsReady: Math.max(1, player.agentsReady),
    resources: { ...player.resources, spice: Math.max(player.resources.spice, 2) },
    influence: { ...player.influence, greatHouses: 3 },
    garrison: 2,
  }));
  const militarySupportPlacement = turnActions.placeAgentAction(militarySupportFixture, {
    commanderTargets: {},
    selectedCard: militarySupportCard,
    selectedSpace: spaceById(data, "military-support"),
  });
  assert.equal(playerById(militarySupportPlacement, "p2").garrison, 7);
  assert.equal(
    militarySupportPlacement.pendingAction?.kind,
    "deploy",
    "Military Support crossing Great Houses 4 should still queue combat deployment",
  );
  assert.equal(
    militarySupportPlacement.pendingAction?.remaining,
    7,
    "Military Support deployment cap should include Great Houses 4 threshold troops",
  );

  const muadDib = playerById(rewardGame, "p1");
  const fremenOneReward = adjustInfluenceAndResolve(state, rewardGame, muadDib.id, "fremen", 1);
  for (const player of fremenOneReward.players.filter((candidate) => candidate.team === "muaddib")) {
    assert.equal(
      player.resources.spice,
      playerById(rewardGame, player.id).resources.spice + 1,
      "Reaching 1 Fremen Influence should give each Muad'Dib team player 1 spice",
    );
    assert.equal(fremenOneReward.turnSpiceGains[player.id], 1, "Fremen spice reward should count as turn spice gain");
  }
  for (const player of fremenOneReward.players.filter((candidate) => candidate.team === "shaddam")) {
    assert.equal(player.resources.spice, playerById(rewardGame, player.id).resources.spice);
  }

  const fremenThreeFixture = withPlayer(rewardGame, muadDib.id, (player) => ({
    ...player,
    influence: { ...player.influence, fremen: 2 },
  }));
  const fremenThreeReward = adjustInfluenceAndResolve(state, fremenThreeFixture, muadDib.id, "fremen", 1);
  for (const player of fremenThreeReward.players.filter((candidate) => candidate.team === "muaddib")) {
    assert.equal(
      player.resources.water,
      playerById(fremenThreeFixture, player.id).resources.water + 1,
      "Reaching 3 Fremen Influence should give each Muad'Dib team player 1 water",
    );
  }

  const emperorOneReward = adjustInfluenceAndResolve(state, rewardGame, shaddam.id, "emperor", 1);
  for (const player of emperorOneReward.players.filter((candidate) => candidate.team === "shaddam")) {
    assert.equal(
      player.resources.solari,
      playerById(rewardGame, player.id).resources.solari + 1,
      "Reaching 1 Emperor Influence should give each Shaddam team player 1 Solari",
    );
  }
  for (const player of emperorOneReward.players.filter((candidate) => candidate.team === "muaddib")) {
    assert.equal(player.resources.solari, playerById(rewardGame, player.id).resources.solari);
  }

  const emperorThreeFixture = withPlayer(rewardGame, shaddam.id, (player) => ({
    ...player,
    influence: { ...player.influence, emperor: 2 },
  }));
  const emperorThreeReward = adjustInfluenceAndResolve(state, emperorThreeFixture, shaddam.id, "emperor", 1);
  for (const player of emperorThreeReward.players.filter((candidate) => candidate.team === "shaddam")) {
    assert.equal(
      player.spies,
      playerById(emperorThreeFixture, player.id).spies + 1,
      "Reaching 3 Emperor Influence should give each Shaddam team player 1 spy",
    );
  }

  console.log("influence verification passed");
} finally {
  await server.close();
}
