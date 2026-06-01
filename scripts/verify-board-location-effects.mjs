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

function testCard(id, icon) {
  return {
    id,
    name: `Test ${icon}`,
    icons: [icon],
    persuasion: 0,
    swords: 0,
    play: "",
    reveal: "",
  };
}

function testIntrigue(id) {
  return { id, name: `Intrigue ${id}`, summary: "test" };
}

function withStubbedRandom(value, action) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return action();
  } finally {
    Math.random = originalRandom;
  }
}

function playableGame(state, playerId, card, updatePlayer = (player) => player) {
  const game = state.initialGame();
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected active player ${playerId}`);
  return {
    ...game,
    phase: "playing",
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    locationControl: {},
    players: game.players.map((player) =>
      player.id === playerId
        ? updatePlayer({
            ...player,
            hand: [card],
            playArea: [],
            revealed: false,
            agentsReady: 2,
            agentsTotal: 2,
          })
        : player,
    ),
  };
}

function place(turnActions, game, selectedCard, selectedSpace, commanderTargets = {}) {
  return turnActions.placeAgentAction(game, { commanderTargets, selectedCard, selectedSpace });
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const rules = await server.ssrLoadModule("/src/game/board-rules.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const spaces = {
    arrakeen: spaceById(data, "arrakeen"),
    carthag: spaceById(data, "carthag"),
    controversialTech: spaceById(data, "controversial-tech"),
    dutifulService: spaceById(data, "dutiful-service"),
    espionage: spaceById(data, "espionage"),
    expedition: spaceById(data, "expedition"),
    gatherSupport: spaceById(data, "gather-support"),
    secrets: spaceById(data, "secrets"),
    shipping: spaceById(data, "shipping"),
    spiceRefinery: spaceById(data, "spice-refinery"),
    swordmaster: spaceById(data, "swordmaster"),
  };

  assert.equal(spaces.arrakeen.gain, undefined, "Arrakeen should not pay Solari to the visitor");
  assert.equal(spaces.espionage.gain?.intrigue, undefined, "Espionage should not draw an Intrigue card");
  assert.equal(spaces.expedition.contract, true, "Expedition should take a CHOAM contract");
  assert.equal(spaces.expedition.gain?.solari, undefined, "Expedition should not pay fallback Solari while contracts remain");
  assert.equal(spaces.gatherSupport.cost, undefined, "Gather Support should be free unless the optional Solari cost is chosen");
  assert.deepEqual(spaces.spiceRefinery.gain, { solari: 2 }, "Spice Refinery should pay 2 Solari before its optional spice payment");
  assert.equal(spaces.shipping.influence, undefined, "Shipping should choose any one Influence instead of fixed Guild influence");

  const cityCard = testCard("test-city", "city");
  const fremenCard = testCard("test-fremen", "fremen");
  const beneCard = testCard("test-bene", "bene");
  const landsraadCard = testCard("test-landsraad", "landsraad");
  const spiceCard = testCard("test-spice", "spice");
  const makerKeeper = data.imperiumDeck.find((card) => card.name === "Maker Keeper");
  const demandAttention = data.commanderStarterDecks.muaddib.find((card) => card.name === "Demand Attention");
  assert.ok(makerKeeper, "Maker Keeper should exist for optional-payment timing tests");
  assert.ok(demandAttention, "Demand Attention should exist for Controversial Technology timing tests");

  const arrakeenNoControl = place(
    turnActions,
    playableGame(state, "p2", cityCard, (player) => ({ ...player, resources: { ...player.resources, solari: 0 } })),
    cityCard,
    spaces.arrakeen,
  );
  assert.equal(playerById(arrakeenNoControl, "p2").resources.solari, 0, "Arrakeen visitor should not gain control Solari");

  const arrakeenControlledBase = playableGame(state, "p2", cityCard, (player) => ({ ...player, resources: { ...player.resources, solari: 0 } }));
  const arrakeenControlled = place(
    turnActions,
    {
      ...arrakeenControlledBase,
      locationControl: { arrakeen: "p3" },
      players: arrakeenControlledBase.players.map((player) =>
        player.id === "p3" ? { ...player, resources: { ...player.resources, solari: 0 } } : player,
      ),
    },
    cityCard,
    spaces.arrakeen,
  );
  assert.equal(playerById(arrakeenControlled, "p3").resources.solari, 1, "Arrakeen controller should gain 1 Solari");
  assert.equal(playerById(arrakeenControlled, "p2").resources.solari, 0, "Arrakeen visitor should still gain no Solari");

  const expedition = place(turnActions, playableGame(state, "p3", fremenCard), fremenCard, spaces.expedition);
  assert.equal(playerById(expedition, "p3").resources.solari, 2, "Expedition should not add fallback Solari while contracts exist");
  assert.equal(expedition.pendingAction?.kind, "contract", "Expedition should queue a CHOAM contract choice");

  const controversialTech = place(
    turnActions,
    playableGame(state, "p3", fremenCard, (player) => ({ ...player, resources: { ...player.resources, spice: 2 } })),
    fremenCard,
    spaces.controversialTech,
  );
  assert.equal(controversialTech.pendingAction?.kind, "trash-card", "Controversial Technology should queue mandatory trash");
  assert.equal(controversialTech.pendingAction?.optional, false, "Controversial Technology trash should be mandatory");
  assert.equal(playerById(controversialTech, "p3").intrigues.length, 1, "Controversial Technology should draw 1 Intrigue");

  const trashOnPlayFremenCard = { ...fremenCard, id: "test-fremen-trash-on-play", trashOnPlay: true };
  const controversialTechNoTrashables = place(
    turnActions,
    playableGame(state, "p3", trashOnPlayFremenCard, (player) => ({
      ...player,
      deck: [],
      discard: [],
      playArea: [],
      resources: { ...player.resources, spice: 2 },
    })),
    trashOnPlayFremenCard,
    spaces.controversialTech,
  );
  assert.equal(
    controversialTechNoTrashables.pendingAction,
    undefined,
    "Controversial Technology should not queue mandatory trash when no cards are trashable",
  );
  const demandAttentionControversialTech = place(
    turnActions,
    playableGame(state, "p1", demandAttention, (player) => ({
      ...player,
      deck: [],
      discard: [],
      resources: { ...player.resources, spice: 2, solari: 4 },
    })),
    demandAttention,
    spaces.controversialTech,
    { p1: "p3" },
  );
  assert.equal(
    demandAttentionControversialTech.pendingAction?.kind,
    "pay-resource-for-influence",
    "Controversial Technology trash should wait for card-specific pending choices",
  );
  assert.equal(
    demandAttentionControversialTech.pendingQueue[0]?.kind,
    "trash-card",
    "Controversial Technology trash should remain queued after card-specific pending choices",
  );
  const demandAttentionResolved = state.resolvePayResourceForInfluenceChoice(
    demandAttentionControversialTech,
    demandAttentionControversialTech.pendingAction,
  );
  assert.equal(
    playerById(demandAttentionResolved, "p3").influence.fringeWorlds,
    2,
    "Demand Attention should resolve before Controversial Technology can trash it",
  );
  assert.equal(
    playerById(demandAttentionResolved, "p1").playArea.some((card) => card.id === demandAttention.id),
    false,
    "Demand Attention should trash itself when resolved",
  );
  const demandAttentionAfterEmptyTrash = state.maybeStartCombatPhase(demandAttentionResolved);
  assert.equal(
    demandAttentionAfterEmptyTrash.pendingAction,
    undefined,
    "Empty Controversial Technology trash after Demand Attention should advance instead of deadlocking",
  );

  const gatherFree = place(
    turnActions,
    playableGame(state, "p2", landsraadCard, (player) => ({ ...player, resources: { ...player.resources, solari: 0 }, garrison: 3 })),
    landsraadCard,
    spaces.gatherSupport,
  );
  assert.equal(gatherFree.pendingAction, undefined, "Gather Support should not queue payment when the player cannot pay");
  assert.equal(playerById(gatherFree, "p2").garrison, 5, "Gather Support should recruit two troops for free");

  const gatherPaidChoice = place(
    turnActions,
    playableGame(state, "p2", landsraadCard, (player) => ({ ...player, resources: { ...player.resources, solari: 2 }, garrison: 3 })),
    landsraadCard,
    spaces.gatherSupport,
  );
  assert.equal(gatherPaidChoice.pendingAction?.kind, "optional-space-payment", "Gather Support should offer its optional Solari payment");
  const gatherPaid = state.resolveOptionalSpacePayment(gatherPaidChoice, gatherPaidChoice.pendingAction);
  assert.equal(playerById(gatherPaid, "p2").resources.solari, 0);
  assert.equal(playerById(gatherPaid, "p2").resources.water, playerById(gatherPaidChoice, "p2").resources.water + 1);

  const refineryChoice = place(
    turnActions,
    playableGame(state, "p2", cityCard, (player) => ({ ...player, resources: { ...player.resources, spice: 1, solari: 0 } })),
    cityCard,
    spaces.spiceRefinery,
  );
  assert.equal(playerById(refineryChoice, "p2").resources.solari, 2, "Spice Refinery should pay its free 2 Solari first");
  assert.equal(refineryChoice.pendingAction?.kind, "optional-space-payment", "Spice Refinery should offer the optional spice payment");
  const refineryPaid = state.resolveOptionalSpacePayment(refineryChoice, refineryChoice.pendingAction);
  assert.equal(playerById(refineryPaid, "p2").resources.spice, 0);
  assert.equal(playerById(refineryPaid, "p2").resources.solari, 4);

  const makerKeeperRefinery = place(
    turnActions,
    playableGame(state, "p2", makerKeeper, (player) => ({
      ...player,
      resources: { ...player.resources, spice: 0, solari: 0 },
      influence: { ...player.influence, fringeWorlds: 2 },
    })),
    makerKeeper,
    spaces.spiceRefinery,
  );
  assert.equal(playerById(makerKeeperRefinery, "p2").resources.spice, 1, "Maker Keeper should gain spice before optional board payments are checked");
  assert.equal(makerKeeperRefinery.pendingAction?.kind, "optional-space-payment", "Agent resource gains should be able to fund Spice Refinery's optional payment");
  const makerKeeperRefineryPaid = state.resolveOptionalSpacePayment(makerKeeperRefinery, makerKeeperRefinery.pendingAction);
  assert.equal(playerById(makerKeeperRefineryPaid, "p2").resources.spice, 0);
  assert.equal(playerById(makerKeeperRefineryPaid, "p2").resources.solari, 4);

  const shippingBase = playableGame(state, "p4", spiceCard, (player) => ({
    ...player,
    resources: { ...player.resources, spice: 3, solari: 0 },
  }));
  const shipping = place(
    turnActions,
    {
      ...shippingBase,
      players: shippingBase.players.map((player) =>
        player.id === "p2" ? { ...player, influence: { ...player.influence, spacing: 2 } } : player,
      ),
    },
    spiceCard,
    spaces.shipping,
    { p4: "p2" },
  );
  assert.equal(playerById(shipping, "p4").resources.solari, 5, "Shipping should pay 5 Solari");
  assert.equal(shipping.pendingAction?.kind, "board-influence-choice", "Shipping should queue any-Faction influence");
  assert.deepEqual(
    shipping.pendingAction.choices,
    [
      { faction: "emperor", ownerId: "p4" },
      { faction: "greatHouses", ownerId: "p2" },
      { faction: "spacing", ownerId: "p2" },
      { faction: "bene", ownerId: "p2" },
      { faction: "fringeWorlds", ownerId: "p2" },
    ],
  );
  const shippingInfluence = state.resolveBoardInfluenceChoice(shipping, shipping.pendingAction, "p4", "emperor");
  assert.equal(playerById(shippingInfluence, "p4").influence.emperor, 1, "Shaddam should be able to choose personal Emperor Influence from Shipping");

  const dutifulChoice = place(
    turnActions,
    playableGame(state, "p4", testCard("test-emperor", "emperor")),
    testCard("test-emperor", "emperor"),
    spaces.dutifulService,
    { p4: "p2" },
  );
  assert.equal(dutifulChoice.pendingAction?.kind, "board-influence-choice", "Shaddam should choose Great Houses or Emperor on Dutiful Service");
  assert.deepEqual(dutifulChoice.pendingAction.choices, [
    { faction: "greatHouses", ownerId: "p2" },
    { faction: "emperor", ownerId: "p4" },
  ]);

  const espionage = place(
    turnActions,
    playableGame(state, "p2", beneCard, (player) => ({ ...player, resources: { ...player.resources, spice: 1 } })),
    beneCard,
    spaces.espionage,
  );
  assert.equal(playerById(espionage, "p2").intrigues.length, 0, "Espionage should not draw an Intrigue");
  assert.equal(espionage.pendingAction?.kind, "spy", "Espionage should queue spy placement");

  const secretsBase = playableGame(state, "p2", beneCard);
  const secrets = withStubbedRandom(0.74, () =>
    place(
      turnActions,
      {
        ...secretsBase,
        intrigueDeck: [testIntrigue("own")],
        intrigueDiscard: [],
        players: secretsBase.players.map((player) => {
          if (player.id === "p2") return { ...player, intrigues: [] };
          if (player.id === "p3") {
            return { ...player, intrigues: [testIntrigue("a"), testIntrigue("b"), testIntrigue("c"), testIntrigue("d")] };
          }
          if (player.id === "p4") {
            return { ...player, intrigues: [testIntrigue("e"), testIntrigue("f"), testIntrigue("g"), testIntrigue("h")] };
          }
          if (player.id === "p5") return { ...player, intrigues: [testIntrigue("i"), testIntrigue("j"), testIntrigue("k")] };
          return player;
        }),
      },
      beneCard,
      spaces.secrets,
    ),
  );
  assert.equal(playerById(secrets, "p2").intrigues.length, 2, "Secrets should draw one Intrigue and take one from each 4-card opponent");
  assert.deepEqual(
    playerById(secrets, "p2").intrigues.map((intrigue) => intrigue.id),
    ["own", "c"],
    "Secrets should take a random Intrigue from qualifying opponents",
  );
  assert.equal(playerById(secrets, "p3").intrigues.length, 3, "Secrets should take one Intrigue from a 4-card opponent");
  assert.deepEqual(
    playerById(secrets, "p3").intrigues.map((intrigue) => intrigue.id),
    ["a", "b", "d"],
    "Secrets should remove the randomly selected Intrigue from the opponent",
  );
  assert.equal(playerById(secrets, "p4").intrigues.length, 4, "Secrets should not affect same-team players");
  assert.equal(playerById(secrets, "p5").intrigues.length, 3, "Secrets should not affect opponents below four Intrigues");
  assert.match(secrets.log[0], /gives an Intrigue card to/, "Secrets should log the transfer without naming the card");
  assert.doesNotMatch(secrets.log[0], /Intrigue c\b/, "Secrets should not reveal the random Intrigue in the public log");

  const swordmasterClaim = place(
    turnActions,
    playableGame(state, "p2", landsraadCard, (player) => ({ ...player, resources: { ...player.resources, solari: 8 } })),
    landsraadCard,
    spaces.swordmaster,
  );
  const feydSwordmaster = playerById(swordmasterClaim, "p2");
  assert.equal(feydSwordmaster.swordmasterBonus, true, "Swordmaster should grant the permanent bonus token");
  assert.equal(feydSwordmaster.agentsTotal, 3, "Swordmaster should grant a one-use third Agent");
  assert.equal(feydSwordmaster.agentsReady, 2, "Claiming Swordmaster should make the new Agent available this round");
  assert.equal(swordmasterClaim.swordmasterClaimed, true, "Game should remember that at least one Swordmaster has been claimed");
  assert.equal(
    rules.canEnterSpace(spaces.swordmaster, playerById(swordmasterClaim, "p3"), swordmasterClaim.swordmasterClaimed, swordmasterClaim.players),
    true,
    "Other players should still be able to claim Swordmaster",
  );

  const swordmasterSpent = place(
    turnActions,
    {
      ...swordmasterClaim,
      activeSeat: swordmasterClaim.players.findIndex((player) => player.id === "p2"),
      agentTurnComplete: false,
      pendingAction: undefined,
      pendingQueue: [],
      spaces: {},
      players: swordmasterClaim.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              hand: [cityCard],
              agentsReady: 1,
              agentsTotal: 3,
              swordmasterAgentSpent: false,
            }
          : player,
      ),
    },
    cityCard,
    spaces.carthag,
  );
  assert.equal(playerById(swordmasterSpent, "p2").swordmasterAgentSpent, true, "The third Agent placement should spend the one-use Swordmaster Agent");

  const swordmasterRevealFixture = {
    ...swordmasterClaim,
    phase: "playing",
    activeSeat: swordmasterClaim.players.findIndex((player) => player.id === "p2"),
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    players: swordmasterClaim.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            hand: [spiceCard],
            revealed: false,
            agentsReady: 2,
            agentsTotal: 3,
            swordmasterAgentSpent: false,
          }
        : player,
    ),
  };
  const swordmasterReveal = turnActions.revealTurnAction(swordmasterRevealFixture, {
    commanderTargets: {},
    revealPlan: turnActions.revealTurnPlan(playerById(swordmasterRevealFixture, "p2"), swordmasterRevealFixture),
  });
  assert.equal(
    playerById(swordmasterReveal, "p2").swordmasterAgentSpent,
    false,
    "Revealing with the one-use Swordmaster Agent unspent should keep it available",
  );
  const nextRoundWithUnusedSwordmaster = state.startNextRound({
    ...swordmasterReveal,
    conflict: null,
    pendingAction: undefined,
    pendingQueue: [],
    players: swordmasterReveal.players.map((player) => ({ ...player, revealed: true, agentsReady: 0 })),
  });
  assert.equal(
    playerById(nextRoundWithUnusedSwordmaster, "p2").agentsTotal,
    3,
    "Unused Swordmaster Agent should remain available in a future round",
  );
  assert.equal(
    playerById(nextRoundWithUnusedSwordmaster, "p2").agentsReady,
    3,
    "Unused Swordmaster Agent should refresh until it is sent to a board space",
  );

  const nextRound = state.startNextRound({
    ...swordmasterSpent,
    conflict: null,
    pendingAction: undefined,
    pendingQueue: [],
    players: swordmasterSpent.players.map((player) => ({ ...player, revealed: true, agentsReady: 0 })),
  });
  assert.equal(playerById(nextRound, "p2").swordmasterBonus, true, "Swordmaster reveal bonus should persist after the Agent is spent");
  assert.equal(playerById(nextRound, "p2").agentsTotal, 2, "Spent Swordmaster Agent should be removed next round");
  assert.equal(playerById(nextRound, "p2").agentsReady, 2, "Spent Swordmaster Agent should not refresh next round");

  console.log("board location effects verification passed");
} finally {
  await server.close();
}
