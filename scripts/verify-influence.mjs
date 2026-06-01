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

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
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
  const dutifulService = spaceById(data, "dutiful-service");
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
  const allyOnEmperorIcon = state.applyBoardEffect(oneGreatHouseFeyd, oneGreatHouseFeyd, dutifulService);
  assert.equal(
    allyOnEmperorIcon.source.influence.greatHouses,
    2,
    "Non-personal Emperor-icon spaces should use the six-player Great Houses track for Allies",
  );
  assert.equal(
    allyOnEmperorIcon.source.influence.emperor,
    1,
    "Non-personal Emperor-icon spaces should not move an Ally on Shaddam's personal Emperor track",
  );
  assert.equal(allyOnEmperorIcon.source.vp, oneGreatHouseFeyd.vp + 1);

  const shaddamOnEmperorIcon = state.applyBoardEffect(shaddam, oneGreatHouseFeyd, dutifulService);
  assert.equal(
    shaddamOnEmperorIcon.target.influence.greatHouses,
    1,
    "Shaddam should not auto-apply mapped Emperor-icon Influence before choosing a track",
  );
  assert.equal(
    shaddamOnEmperorIcon.target.influence.emperor,
    1,
    "Shaddam's mapped Emperor-icon choice should not move an Ally before it is resolved",
  );
  assert.equal(shaddamOnEmperorIcon.target.vp, oneGreatHouseFeyd.vp);
  assert.equal(shaddamOnEmperorIcon.source.influence.emperor, shaddam.influence.emperor);

  const shaddamDutifulChoice = state.pendingActionForBoardInfluenceChoice(dutifulService, shaddam, oneGreatHouseFeyd);
  assert.deepEqual(
    shaddamDutifulChoice,
    {
      kind: "board-influence-choice",
      source: "Dutiful Service",
      choices: [
        { faction: "greatHouses", ownerId: oneGreatHouseFeyd.id },
        { faction: "emperor", ownerId: shaddam.id },
      ],
    },
    "Shaddam should choose between Great Houses and personal Emperor Influence on mapped Emperor spaces",
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

  console.log("influence verification passed");
} finally {
  await server.close();
}
