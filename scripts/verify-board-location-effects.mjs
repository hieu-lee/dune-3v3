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
    assemblyHall: spaceById(data, "assembly-hall"),
    carthag: spaceById(data, "carthag"),
    controversialTech: spaceById(data, "controversial-tech"),
    imperialPrivilege: spaceById(data, "imperial-privilege"),
    espionage: spaceById(data, "espionage"),
    expedition: spaceById(data, "expedition"),
    gatherSupport: spaceById(data, "gather-support"),
    highCouncil: spaceById(data, "high-council"),
    militarySupport: spaceById(data, "military-support"),
    researchStation: spaceById(data, "research-station"),
    secrets: spaceById(data, "secrets"),
    shipping: spaceById(data, "shipping"),
    sietchTabr: spaceById(data, "sietch-tabr"),
    spiceRefinery: spaceById(data, "spice-refinery"),
    swordmaster: spaceById(data, "swordmaster"),
    vastWealth: spaceById(data, "vast-wealth"),
  };

  assert.equal(spaces.arrakeen.gain, undefined, "Arrakeen should not pay Solari to the visitor");
  assert.equal(spaces.espionage.gain?.intrigue, undefined, "Espionage should not draw an Intrigue card");
  assert.equal(spaces.expedition.contract, true, "Expedition should take a CHOAM contract");
  assert.equal(spaces.expedition.gain?.solari, undefined, "Expedition should not pay fallback Solari while contracts remain");
  assert.equal(spaces.gatherSupport.cost, undefined, "Gather Support should be free unless the optional Solari cost is chosen");
  assert.equal(spaces.assemblyHall.gain?.intrigue, 1, "Assembly Hall should draw one Intrigue on placement");
  assert.equal(spaces.assemblyHall.revealPersuasion, 1, "Assembly Hall should mark its Reveal-turn persuasion bonus");
  assert.equal(spaces.militarySupport.combat, true, "Military Support should allow direct deployment");
  assert.equal(spaces.militarySupport.team, undefined, "Military Support should not use split reinforcement");
  assert.deepEqual(spaces.imperialPrivilege.cost, { solari: 3 }, "Imperial Privilege should cost 3 Solari");
  assert.deepEqual(
    spaces.imperialPrivilege.requirement,
    { faction: "emperor", amount: 2 },
    "Imperial Privilege should require 2 Emperor Influence",
  );
  assert.equal(spaces.imperialPrivilege.icon, "landsraad", "Imperial Privilege should use the Landsraad icon");
  assert.equal(spaces.imperialPrivilege.draw, 1, "Imperial Privilege should draw one card");
  assert.equal(spaces.imperialPrivilege.deferDraw, true, "Imperial Privilege should defer its card draw until after its choices");
  assert.equal(spaces.imperialPrivilege.recallAgent, true, "Imperial Privilege should recall another Agent");
  assert.equal(spaces.imperialPrivilege.intrigueSwap, true, "Imperial Privilege should optionally cycle an Intrigue");
  assert.equal(spaces.imperialPrivilege.influence, undefined, "Imperial Privilege should not grant board Influence");
  assert.equal(spaces.imperialPrivilege.contract, undefined, "Imperial Privilege should not take a CHOAM contract");
  assert.deepEqual(spaces.spiceRefinery.gain, { solari: 2 }, "Spice Refinery should pay 2 Solari before its optional spice payment");
  assert.equal(spaces.shipping.influence, undefined, "Shipping should choose any one Influence instead of fixed Guild influence");

  const cityCard = testCard("test-city", "city");
  const fremenCard = testCard("test-fremen", "fremen");
  const beneCard = testCard("test-bene", "bene");
  const landsraadCard = testCard("test-landsraad", "landsraad");
  const spiceCard = testCard("test-spice", "spice");
  const emperorCard = testCard("test-emperor", "emperor");
  const spyEntryCard = testCard("test-spy-entry-city", "city");
  const spyVisitCard = testCard("test-spy-visit-landsraad", "landsraad");
  const dangerousRhetoric = data.imperiumDeck.find((card) => card.name === "Dangerous Rhetoric");
  const makerKeeper = data.imperiumDeck.find((card) => card.name === "Maker Keeper");
  const steersman = data.imperiumDeck.find((card) => card.name === "Steersman");
  const demandAttention = data.commanderStarterDecks.muaddib.find((card) => card.name === "Demand Attention");
  assert.ok(dangerousRhetoric, "Dangerous Rhetoric should exist for Assembly Hall source-trash tests");
  assert.ok(makerKeeper, "Maker Keeper should exist for optional-payment timing tests");
  assert.ok(steersman, "Steersman should exist for Assembly Hall Recall Agent tests");
  assert.ok(demandAttention, "Demand Attention should exist for Controversial Technology timing tests");

  const researchStationSpyEntryBase = {
    ...playableGame(state, "p2", spyEntryCard, (player) => ({
      ...player,
      deck: [testCard("spy-entry-draw-1", "city"), testCard("spy-entry-draw-2", "city")],
      discard: [],
      garrison: 0,
      resources: { ...player.resources, water: 2 },
      spies: 0,
    })),
    spaces: { [spaces.researchStation.id]: "p3" },
    agentPlacementOwners: { [spaces.researchStation.id]: "p3" },
    spyPosts: {
      "sietch-tabr-research-station": "p2",
      "research-station-spice-refinery": "p2",
    },
    sharedSpyPosts: {},
  };
  assert.equal(
    state.agentSpaceAvailable(researchStationSpyEntryBase, spaces.researchStation, playerById(researchStationSpyEntryBase, "p2")),
    true,
    "An occupied location should be enterable when the active player has a spy observing it",
  );
  assert.deepEqual(
    state.spyEntrySpaceIdsForOccupiedSpace(researchStationSpyEntryBase, spaces.researchStation.id, "p2"),
    [spaces.sietchTabr.id, spaces.researchStation.id],
    "Occupied Research Station spy entry should expose both observing spy slots",
  );
  assert.equal(
    place(turnActions, researchStationSpyEntryBase, spyEntryCard, spaces.researchStation),
    researchStationSpyEntryBase,
    "Occupied spy entry with multiple observing slots should require an explicit spy post choice",
  );
  const researchStationSpyEntry = turnActions.placeAgentAction(
    researchStationSpyEntryBase,
    {
      commanderTargets: {},
      selectedCard: spyEntryCard,
      selectedSpace: spaces.researchStation,
      spyEntrySpaceId: spaces.sietchTabr.id,
    },
  );
  assert.equal(
    researchStationSpyEntry.spaces[spaces.researchStation.id],
    "p3",
    "Spy entry should preserve the original occupied-space Agent",
  );
  assert.equal(
    researchStationSpyEntry.agentPlacementOwners?.[spaces.researchStation.id],
    "p3",
    "Spy entry should preserve the original placement owner",
  );
  assert.deepEqual(
    researchStationSpyEntry.agentPlacementCoOwners?.[spaces.researchStation.id],
    ["p2"],
    "Spy entry should record the entering player as a co-located Agent owner",
  );
  assert.equal(
    researchStationSpyEntry.spyPosts["sietch-tabr-research-station"],
    undefined,
    "Spy entry should recall the spy from the observing edge used to enter",
  );
  assert.equal(
    researchStationSpyEntry.spyPosts["research-station-spice-refinery"],
    "p2",
    "Spy entry should preserve unchosen observing spy edges",
  );
  assert.equal(playerById(researchStationSpyEntry, "p2").spies, 1, "Spy entry should return the recalled spy to supply");
  assert.equal(researchStationSpyEntry.turnSpyRecalls.p2, 1, "Spy entry should count as recalling a spy this turn");

  const sameOwnerSpyEntryBase = {
    ...researchStationSpyEntryBase,
    spaces: { [spaces.researchStation.id]: "p2" },
    agentPlacementOwners: { [spaces.researchStation.id]: "p2" },
    agentPlacementCoOwners: {},
    spyPosts: { "sietch-tabr-research-station": "p2" },
  };
  assert.equal(
    state.agentSpaceAvailable(sameOwnerSpyEntryBase, spaces.researchStation, playerById(sameOwnerSpyEntryBase, "p2")),
    false,
    "A player should not spy-enter a location where they already own the Agent",
  );
  assert.equal(
    place(turnActions, sameOwnerSpyEntryBase, spyEntryCard, spaces.researchStation),
    sameOwnerSpyEntryBase,
    "Direct placement should reject same-owner occupied spy entry",
  );
  const sameCoOwnerSpyEntryBase = {
    ...researchStationSpyEntryBase,
    spaces: { [spaces.researchStation.id]: "p3" },
    agentPlacementOwners: { [spaces.researchStation.id]: "p3" },
    agentPlacementCoOwners: { [spaces.researchStation.id]: ["p2"] },
    spyPosts: { "sietch-tabr-research-station": "p2" },
  };
  assert.equal(
    state.agentSpaceAvailable(sameCoOwnerSpyEntryBase, spaces.researchStation, playerById(sameCoOwnerSpyEntryBase, "p2")),
    false,
    "A player should not spy-enter a location where they already have a co-located Agent",
  );
  assert.equal(
    place(turnActions, sameCoOwnerSpyEntryBase, spyEntryCard, spaces.researchStation),
    sameCoOwnerSpyEntryBase,
    "Direct placement should reject duplicate co-located spy entry",
  );

  const standaloneSpyEntryBase = {
    ...playableGame(state, "p4", emperorCard, (player) => ({
      ...player,
      spies: 0,
    })),
    spaces: { [spaces.vastWealth.id]: "p3" },
    agentPlacementOwners: { [spaces.vastWealth.id]: "p3" },
    spyPosts: { [spaces.vastWealth.id]: "p4" },
    sharedSpyPosts: {},
  };
  assert.deepEqual(
    state.spyEntrySpaceIdsForOccupiedSpace(standaloneSpyEntryBase, spaces.vastWealth.id, "p4"),
    [],
    "Legacy Commander personal-board spy records should not expose spy-entry choices",
  );
  assert.equal(
    state.agentSpaceAvailable(standaloneSpyEntryBase, spaces.vastWealth, playerById(standaloneSpyEntryBase, "p4")),
    false,
    "Legacy Commander personal-board spy records should not make occupied personal spaces available",
  );
  const standaloneSpyEntry = place(turnActions, standaloneSpyEntryBase, emperorCard, spaces.vastWealth);
  assert.equal(
    standaloneSpyEntry,
    standaloneSpyEntryBase,
    "Direct placement should reject occupied Commander personal spaces with only a legacy personal-board spy",
  );

  const occupiedShippingSpyEntryBase = {
    ...playableGame(state, "p2", spiceCard, (player) => ({
      ...player,
      influence: { ...player.influence, spacing: 2, bene: 0 },
      resources: { ...player.resources, spice: 3, solari: 0 },
      spies: 0,
    })),
    spaces: { [spaces.shipping.id]: "p3" },
    agentPlacementOwners: { [spaces.shipping.id]: "p3" },
    spyPosts: { "shipping-accept-contract": "p2" },
    sharedSpyPosts: {},
  };
  const occupiedShippingSpyEntry = turnActions.placeAgentAction(
    occupiedShippingSpyEntryBase,
    {
      commanderTargets: {},
      selectedCard: spiceCard,
      selectedSpace: spaces.shipping,
      spyEntrySpaceId: spaces.shipping.id,
    },
  );
  assert.equal(
    occupiedShippingSpyEntry.pendingAction?.kind,
    "board-influence-choice",
    "Occupied Shipping spy entry should still queue Shipping's board Influence choice",
  );
  assert.equal(
    occupiedShippingSpyEntry.pendingAction?.targetOwnerId,
    "p2",
    "Occupied Shipping spy entry should route board Influence to the entering player",
  );
  const occupiedShippingInfluenceResolved = state.resolveBoardInfluenceChoice(
    occupiedShippingSpyEntry,
    occupiedShippingSpyEntry.pendingAction,
    "p2",
    "bene",
  );
  assert.notEqual(
    occupiedShippingInfluenceResolved,
    occupiedShippingSpyEntry,
    "Occupied Shipping board Influence should resolve instead of being rejected as same-state",
  );
  assert.equal(playerById(occupiedShippingInfluenceResolved, "p2").influence.bene, 1);
  assert.equal(playerById(occupiedShippingInfluenceResolved, "p3").influence.bene, 0);

  const commanderOccupiedShippingSpyEntryBase = {
    ...playableGame(state, "p4", spiceCard, (player) => ({
      ...player,
      influence: { ...player.influence, emperor: 2, spacing: 2 },
      resources: { ...player.resources, spice: 3, solari: 0 },
      spies: 0,
    })),
    spaces: { [spaces.shipping.id]: "p3" },
    agentPlacementOwners: { [spaces.shipping.id]: "p3" },
    spyPosts: { "shipping-accept-contract": "p4" },
    sharedSpyPosts: {},
  };
  const commanderOccupiedShippingSpyEntry = turnActions.placeAgentAction(
    commanderOccupiedShippingSpyEntryBase,
    {
      commanderTargets: { p4: "p2" },
      selectedCard: spiceCard,
      selectedSpace: spaces.shipping,
      spyEntrySpaceId: spaces.shipping.id,
    },
  );
  assert.deepEqual(
    commanderOccupiedShippingSpyEntry.agentPlacementCoOwners?.[spaces.shipping.id],
    ["p4"],
    "Commander spy entry should track the Commander as co-located placement owner",
  );
  assert.deepEqual(
    commanderOccupiedShippingSpyEntry.agentPlacementCoOwnerTargets?.[spaces.shipping.id],
    { p4: "p2" },
    "Commander spy entry should remember the activated Ally Agent piece for later promotion",
  );
  const primaryShippingRecallPending = {
    kind: "recall-agent-from-board",
    ownerId: "p3",
    source: "promotion test",
    spaceIds: [spaces.shipping.id],
  };
  const commanderShippingAfterPrimaryRecall = state.resolveBoardAgentRecallChoice(
    {
      ...commanderOccupiedShippingSpyEntry,
      pendingAction: primaryShippingRecallPending,
      pendingQueue: [],
    },
    primaryShippingRecallPending,
    spaces.shipping.id,
  );
  assert.equal(
    commanderShippingAfterPrimaryRecall.spaces[spaces.shipping.id],
    "p2",
    "Promoting a Commander spy-entry Agent should show the activated Ally as the board occupant",
  );
  assert.equal(
    commanderShippingAfterPrimaryRecall.agentPlacementOwners?.[spaces.shipping.id],
    "p4",
    "Promoting a Commander spy-entry Agent should keep the Commander as placement owner",
  );
  assert.equal(
    commanderShippingAfterPrimaryRecall.agentPlacementCoOwners?.[spaces.shipping.id],
    undefined,
    "Promoted spy-entry Agent should no longer be stored as co-located",
  );
  assert.equal(
    commanderShippingAfterPrimaryRecall.agentPlacementCoOwnerTargets?.[spaces.shipping.id],
    undefined,
    "Promoted spy-entry target metadata should be consumed",
  );

  const standaloneSpyVisitDrawBase = {
    ...playableGame(state, "p4", emperorCard, (player) => ({
      ...player,
      deck: [testCard("standalone-spy-visit-drawn-card", "emperor")],
      discard: [],
      spies: 0,
    })),
    spyPosts: { [spaces.vastWealth.id]: "p4" },
    sharedSpyPosts: {},
  };
  const standaloneSpyVisitDrawPending = place(turnActions, standaloneSpyVisitDrawBase, emperorCard, spaces.vastWealth);
  assert.notEqual(
    standaloneSpyVisitDrawPending.pendingAction?.kind,
    "recall-spy",
    "Visiting a Commander personal-board space with only a legacy personal spy should not offer a recall",
  );

  const spyVisitDrawBase = {
    ...playableGame(state, "p2", spyVisitCard, (player) => ({
      ...player,
      deck: [testCard("spy-visit-drawn-card", "city")],
      discard: [],
      garrison: 0,
      spies: 0,
    })),
    spyPosts: { "high-council-imperial-privilege-swordmaster": "p2" },
    sharedSpyPosts: {},
  };
  const spyVisitDrawPending = place(turnActions, spyVisitDrawBase, spyVisitCard, spaces.highCouncil);
  assert.equal(spyVisitDrawPending.pendingAction?.kind, "recall-spy", "Visiting a location with your spy still there should offer a recall");
  assert.deepEqual(
    spyVisitDrawPending.pendingAction?.spaceIds,
    [spaces.highCouncil.id],
    "Spy visit draw should restrict recall choices to the visited location's spy post",
  );
  assert.equal(spyVisitDrawPending.pendingAction?.drawCards, 1, "Spy visit recall should draw one normal card");
  assert.equal(spyVisitDrawPending.pendingAction?.optional, true, "Spy visit recall should be optional");
  const spyVisitDrawResolved = state.recallSpyForPending(
    spyVisitDrawPending,
    spyVisitDrawPending.pendingAction,
    spaces.highCouncil.id,
  );
  assert.equal(
    spyVisitDrawResolved.spyPosts["high-council-imperial-privilege-swordmaster"],
    undefined,
    "Spy visit draw should remove the recalled spy",
  );
  assert.equal(playerById(spyVisitDrawResolved, "p2").spies, 1, "Spy visit draw should return the recalled spy to supply");
  assert.equal(
    playerById(spyVisitDrawResolved, "p2").hand.some((card) => card.id === "spy-visit-drawn-card"),
    true,
    "Spy visit draw should draw one normal card",
  );

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

  const assemblyBase = {
    ...playableGame(state, "p2", landsraadCard),
    intrigueDeck: [testIntrigue("assembly")],
    intrigueDiscard: [],
  };
  const assemblyHall = place(turnActions, assemblyBase, landsraadCard, spaces.assemblyHall);
  assert.equal(playerById(assemblyHall, "p2").intrigues.at(-1)?.id, "assembly", "Assembly Hall should draw an Intrigue");
  assert.equal(
    playerById(assemblyHall, "p2").playArea[0]?.agentPlacementSpaceId,
    "assembly-hall",
    "Assembly Hall should preserve the active player's Agent-placement context",
  );
  assert.equal(
    assemblyHall.agentPlacementOwners?.["assembly-hall"],
    "p2",
    "Assembly Hall should record the player whose Agent occupies the space",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(assemblyHall, "p2"), assemblyHall).persuasion,
    1,
    "Assembly Hall should add 1 persuasion during the owner's Reveal turn",
  );
  const assemblyRevealed = turnActions.revealTurnAction(
    { ...assemblyHall, agentTurnComplete: false },
    {
      commanderTargets: {},
      revealPlan: turnActions.revealTurnPlan(playerById(assemblyHall, "p2"), assemblyHall),
    },
  );
  assert.equal(playerById(assemblyRevealed, "p2").persuasion, 1, "Assembly Hall Reveal bonus should resolve into spendable persuasion");

  const rhetoricAssemblyBase = {
    ...playableGame(state, "p2", dangerousRhetoric),
    intrigueDeck: [testIntrigue("rhetoric-assembly")],
    intrigueDiscard: [],
  };
  const rhetoricAssembly = place(turnActions, rhetoricAssemblyBase, dangerousRhetoric, spaces.assemblyHall);
  assert.equal(rhetoricAssembly.pendingAction?.kind, "board-influence-choice");
  assert.equal(rhetoricAssembly.pendingAction.source, "Dangerous Rhetoric");
  const [rhetoricChoice] = rhetoricAssembly.pendingAction.choices;
  assert.ok(rhetoricChoice, "Dangerous Rhetoric should expose an Influence choice after Assembly Hall placement");
  const rhetoricResolved = state.resolveBoardInfluenceChoice(
    rhetoricAssembly,
    rhetoricAssembly.pendingAction,
    rhetoricChoice.ownerId,
    rhetoricChoice.faction,
  );
  assert.equal(
    rhetoricResolved.spaces["assembly-hall"],
    "p2",
    "Dangerous Rhetoric should leave the Agent on Assembly Hall after trashing itself",
  );
  assert.equal(
    rhetoricResolved.agentPlacementOwners?.["assembly-hall"],
    "p2",
    "Assembly Hall should keep the source Agent owner after the source card is trashed",
  );
  assert.equal(
    playerById(rhetoricResolved, "p2").playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should trash itself from play",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(rhetoricResolved, "p2"), rhetoricResolved).persuasion,
    1,
    "Assembly Hall should still add Reveal persuasion after the placement source card leaves play",
  );
  const commanderRhetoricAssemblyBase = {
    ...playableGame(state, "p1", dangerousRhetoric),
    intrigueDeck: [testIntrigue("commander-rhetoric-assembly")],
    intrigueDiscard: [],
  };
  const commanderRhetoricAssembly = place(
    turnActions,
    commanderRhetoricAssemblyBase,
    dangerousRhetoric,
    spaces.assemblyHall,
    { p1: "p3" },
  );
  assert.equal(
    playerById(commanderRhetoricAssembly, "p1").commanderActivatedAllyIds?.includes("p3"),
    true,
    "Commander placement should record the activated Ally before Dangerous Rhetoric resolves",
  );
  const commanderRhetoricChoice = commanderRhetoricAssembly.pendingAction?.choices.find((choice) =>
    choice.ownerId === "p3" &&
    choice.faction === "greatHouses"
  );
  assert.ok(commanderRhetoricChoice, "Commander Dangerous Rhetoric should expose the activated Ally's influence choices");
  const commanderRhetoricResolved = state.resolveBoardInfluenceChoice(
    commanderRhetoricAssembly,
    commanderRhetoricAssembly.pendingAction,
    commanderRhetoricChoice.ownerId,
    commanderRhetoricChoice.faction,
  );
  assert.equal(
    playerById(commanderRhetoricResolved, "p3").influence.greatHouses,
    playerById(commanderRhetoricAssembly, "p3").influence.greatHouses + 1,
    "Dangerous Rhetoric should still resolve for the activated Ally after the Commander target is marked used",
  );

  const steersmanAssemblyBase = {
    ...playableGame(state, "p2", steersman, (player) => ({
      ...player,
      deck: [testCard("steersman-draw-target", "city")],
      discard: [],
    })),
    intrigueDeck: [testIntrigue("steersman-assembly")],
    intrigueDiscard: [],
  };
  const steersmanAssembly = place(turnActions, steersmanAssemblyBase, steersman, spaces.assemblyHall);
  assert.equal(
    playerById(steersmanAssembly, "p2").agentsReady,
    playerById(steersmanAssemblyBase, "p2").agentsReady,
    "Steersman should recall the Assembly Hall Agent to ready supply",
  );
  assert.equal(
    steersmanAssembly.spaces["assembly-hall"],
    undefined,
    "Steersman should leave Assembly Hall unoccupied after recalling its Agent",
  );
  assert.equal(
    steersmanAssembly.agentPlacementOwners?.["assembly-hall"],
    undefined,
    "Steersman should clear Assembly Hall's Agent owner after recalling its Agent",
  );
  assert.equal(
    playerById(steersmanAssembly, "p2").intrigues.at(-1)?.id,
    "steersman-assembly",
    "Steersman should still receive the Assembly Hall placement Intrigue",
  );
  assert.equal(
    playerById(steersmanAssembly, "p2").playArea.find((card) => card.id === steersman.id)?.agentPlacementSpaceId,
    "assembly-hall",
    "Steersman should preserve its historical Assembly Hall placement metadata after recalling the Agent",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(steersmanAssembly, "p2"), steersmanAssembly).persuasion,
    0,
    "Assembly Hall should not add Reveal persuasion after Steersman recalls the Agent",
  );
  const reoccupiedAssemblyCard = testCard("test-landsraad-reoccupied", "landsraad");
  const reoccupiedAssemblyBase = {
    ...steersmanAssembly,
    agentTurnComplete: false,
    intrigueDeck: [testIntrigue("reoccupied-assembly")],
    players: steersmanAssembly.players.map((player) =>
      player.id === "p2" ? { ...player, hand: [reoccupiedAssemblyCard] } : player
    ),
  };
  const reoccupiedAssembly = place(turnActions, reoccupiedAssemblyBase, reoccupiedAssemblyCard, spaces.assemblyHall);
  assert.equal(
    reoccupiedAssembly.agentPlacementOwners?.["assembly-hall"],
    "p2",
    "Reoccupying Assembly Hall should record the current Agent owner",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(reoccupiedAssembly, "p2"), reoccupiedAssembly).persuasion,
    1,
    "Assembly Hall should not double-count a previously recalled Steersman marker after reoccupation",
  );
  const recycledAssemblyCard = {
    ...testCard("test-recycled-landsraad", "landsraad"),
    agentPlacementSpaceId: "sardaukar",
    agentPlacementTargetOwnerId: "p2",
  };
  const recycledAssembly = place(
    turnActions,
    {
      ...playableGame(state, "p2", recycledAssemblyCard),
      intrigueDeck: [testIntrigue("recycled-assembly")],
      intrigueDiscard: [],
    },
    recycledAssemblyCard,
    spaces.assemblyHall,
  );
  assert.equal(
    playerById(recycledAssembly, "p2").playArea[0]?.agentPlacementSpaceId,
    "assembly-hall",
    "Playing a recycled card should overwrite stale placement metadata",
  );
  assert.equal(
    recycledAssembly.agentPlacementOwners?.["assembly-hall"],
    "p2",
    "A recycled card should record the current Assembly Hall Agent owner",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(recycledAssembly, "p2"), recycledAssembly).persuasion,
    1,
    "A recycled card should score Assembly Hall when its new Agent remains there",
  );

  const commanderAssemblyCard = testCard("test-commander-landsraad", "landsraad");
  const commanderAssemblyBase = {
    ...playableGame(state, "p4", commanderAssemblyCard),
    intrigueDeck: [testIntrigue("commander-assembly")],
    intrigueDiscard: [],
  };
  commanderAssemblyBase.players = commanderAssemblyBase.players.map((player) =>
    player.id === "p2" ? { ...player, hand: [], playArea: [], highCouncilSeat: false } : player
  );
  const commanderAssembly = place(
    turnActions,
    commanderAssemblyBase,
    commanderAssemblyCard,
    spaces.assemblyHall,
    { p4: "p2" },
  );
  assert.equal(
    commanderAssembly.spaces["assembly-hall"],
    "p2",
    "Commander Assembly Hall placement should keep the existing activated-Ally occupancy model",
  );
  assert.equal(
    commanderAssembly.agentPlacementOwners?.["assembly-hall"],
    "p4",
    "Commander Assembly Hall placement should record the Commander as the Agent owner",
  );
  assert.equal(
    playerById(commanderAssembly, "p4").intrigues.at(-1)?.id,
    "commander-assembly",
    "Commander should draw the Assembly Hall Intrigue directly",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(commanderAssembly, "p4"), commanderAssembly).persuasion,
    1,
    "Commander should receive Assembly Hall persuasion from their own Agent-placement card",
  );
  assert.equal(
    turnActions.revealTurnPlan(playerById(commanderAssembly, "p2"), commanderAssembly).persuasion,
    0,
    "Activated Ally occupancy should not steal the Commander's Assembly Hall Reveal bonus",
  );

  const expedition = place(turnActions, playableGame(state, "p3", fremenCard), fremenCard, spaces.expedition);
  assert.equal(playerById(expedition, "p3").resources.solari, 0, "Expedition should not add fallback Solari while contracts exist");
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

  const controversialTechSpyVisit = place(
    turnActions,
    {
      ...playableGame(state, "p3", fremenCard, (player) => ({
        ...player,
        deck: [testCard("controversial-tech-spy-visit-drawn-card", "fremen")],
        discard: [],
        resources: { ...player.resources, spice: 2 },
        spies: 0,
      })),
      spyPosts: { "controversial-tech-expedition": "p3" },
      sharedSpyPosts: {},
    },
    fremenCard,
    spaces.controversialTech,
  );
  assert.equal(
    controversialTechSpyVisit.pendingAction?.kind,
    "trash-card",
    "Controversial Technology trash should stay before spy visit draw",
  );
  assert.equal(
    controversialTechSpyVisit.pendingQueue[0]?.kind,
    "recall-spy",
    "Spy visit draw should remain queued until after mandatory Controversial Technology trash",
  );
  assert.equal(controversialTechSpyVisit.pendingQueue[0]?.drawCards, 1);
  assert.equal(
    controversialTechSpyVisit.spyPosts["controversial-tech-expedition"],
    "p3",
    "Spy visit draw should not recall the spy before mandatory Controversial Technology trash resolves",
  );

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
	      resources: { ...player.resources, spice: 6, solari: 0 },
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
  assert.equal(
    playerById(demandAttentionResolved, "p1").trash.some((card) => card.id === demandAttention.id),
    true,
    "Demand Attention should appear in the visible trash pile when it trashes itself",
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

  const militarySupportBase = playableGame(state, "p4", emperorCard, (player) => ({
    ...player,
    resources: { ...player.resources, spice: 2 },
  }));
  const militarySupport = place(
    turnActions,
    {
      ...militarySupportBase,
      players: militarySupportBase.players.map((player) =>
        player.id === "p2" ? { ...player, garrison: 0 } : player,
      ),
    },
    emperorCard,
    spaces.militarySupport,
    { p4: "p2" },
  );
  assert.equal(playerById(militarySupport, "p4").resources.spice, 0, "Military Support should spend 2 spice");
  assert.equal(playerById(militarySupport, "p2").garrison, 3, "Military Support should recruit 3 troops to the activated Ally");
  assert.deepEqual(
    militarySupport.pendingAction,
    { kind: "deploy", ownerId: "p2", remaining: 3, source: "Military Support" },
    "Military Support should allow its 3 recruited troops to deploy directly",
  );

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
  assert.equal(shipping.pendingAction.spaceId, "shipping", "Shipping Influence choice should carry its board space id");
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

  const imperialPrivilegeDrawCard = testCard("imperial-privilege-draw", "city");
  const imperialPrivilegeOldIntrigue = testIntrigue("imperial-privilege-old");
  const imperialPrivilegeNewIntrigue = testIntrigue("imperial-privilege-new");
  const imperialPrivilegeExistingDiscard = testIntrigue("imperial-privilege-existing-discard");
  const imperialPrivilege = place(
    turnActions,
    {
      ...playableGame(state, "p2", landsraadCard, (player) => ({
        ...player,
        deck: [imperialPrivilegeDrawCard],
        discard: [],
        influence: { ...player.influence, greatHouses: 2 },
        intrigues: [imperialPrivilegeOldIntrigue],
        resources: { ...player.resources, solari: 3 },
      })),
      agentPlacementOwners: { "assembly-hall": "p2" },
      intrigueDeck: [imperialPrivilegeNewIntrigue],
      intrigueDiscard: [imperialPrivilegeExistingDiscard],
      spaces: { "assembly-hall": "p2" },
    },
    landsraadCard,
    spaces.imperialPrivilege,
  );
  assert.equal(playerById(imperialPrivilege, "p2").resources.solari, 0, "Imperial Privilege should spend 3 Solari");
  assert.deepEqual(
    playerById(imperialPrivilege, "p2").hand.map((card) => card.id),
    [],
    "Imperial Privilege should not draw its card before the Intrigue discard and Agent recall choices resolve",
  );
  assert.equal(imperialPrivilege.spaces["imperial-privilege"], "p2", "Imperial Privilege should keep the newly placed Agent on its space");
  assert.equal(
    imperialPrivilege.agentPlacementOwners?.["imperial-privilege"],
    "p2",
    "Imperial Privilege should record the newly placed Agent owner",
  );
  assert.equal(imperialPrivilege.pendingAction?.kind, "trash-intrigue-for-reward", "Imperial Privilege should first offer the optional Intrigue discard");
  assert.equal(imperialPrivilege.pendingAction?.source, "Imperial Privilege");
  assert.equal(imperialPrivilege.pendingAction?.discard, true, "Imperial Privilege should discard, not trash, the chosen Intrigue");
  assert.equal(imperialPrivilege.pendingAction?.optional, true, "Imperial Privilege Intrigue cycling should be optional");
  assert.equal(imperialPrivilege.pendingAction?.drawIntrigues, 1, "Imperial Privilege should draw one replacement Intrigue");
  assert.equal(
    imperialPrivilege.pendingQueue[0]?.kind,
    "recall-agent-from-board",
    "Imperial Privilege should then require an Agent recall choice when another Agent is on the board",
  );
  assert.deepEqual(
    imperialPrivilege.pendingQueue[0]?.spaceIds,
    ["assembly-hall"],
    "Imperial Privilege should only recall other Agents owned by the acting player",
  );
  assert.deepEqual(
    imperialPrivilege.pendingQueue[1],
    {
      kind: "draw-cards",
      ownerId: "p2",
      source: "Imperial Privilege",
      amount: 1,
    },
    "Imperial Privilege should queue its card draw after the Agent recall",
  );
  assert.equal(
    imperialPrivilege.pendingQueue.some((pending) => pending.kind === "contract" || pending.kind === "board-influence-choice"),
    false,
    "Imperial Privilege should not leave the old contract or Influence behavior behind",
  );
  const imperialPrivilegeCycled = state.resolveTrashIntrigueForRewardChoice(
    imperialPrivilege,
    imperialPrivilege.pendingAction,
    imperialPrivilegeOldIntrigue.id,
  );
  assert.equal(imperialPrivilegeCycled.pendingAction?.kind, "recall-agent-from-board", "Imperial Privilege should advance to the Agent recall");
  assert.equal(imperialPrivilegeCycled.pendingQueue[0]?.kind, "draw-cards", "Imperial Privilege should still defer its card draw after discarding an Intrigue");
  assert.deepEqual(
    playerById(imperialPrivilegeCycled, "p2").intrigues.map((card) => card.id),
    [imperialPrivilegeNewIntrigue.id],
    "Imperial Privilege should replace the discarded Intrigue with a new one",
  );
  assert.deepEqual(
    imperialPrivilegeCycled.intrigueDiscard.map((card) => card.id),
    [imperialPrivilegeExistingDiscard.id, imperialPrivilegeOldIntrigue.id],
    "Imperial Privilege should append the discarded Intrigue to the top of the Intrigue discard pile",
  );
  const imperialPrivilegeRecalled = state.resolveBoardAgentRecallChoice(
    imperialPrivilegeCycled,
    imperialPrivilegeCycled.pendingAction,
    "assembly-hall",
  );
  assert.equal(imperialPrivilegeRecalled.spaces["assembly-hall"], undefined, "Imperial Privilege should clear the recalled Agent's old space");
  assert.equal(
    imperialPrivilegeRecalled.agentPlacementOwners?.["assembly-hall"],
    undefined,
    "Imperial Privilege should clear the recalled Agent owner marker",
  );
  assert.equal(imperialPrivilegeRecalled.spaces["imperial-privilege"], "p2", "Imperial Privilege should not recall its newly placed Agent");
  assert.equal(playerById(imperialPrivilegeRecalled, "p2").agentsReady, 2, "Imperial Privilege should ready the recalled Agent");
  assert.equal(imperialPrivilegeRecalled.pendingAction?.kind, "draw-cards", "Imperial Privilege should draw its card after recalling an Agent");
  assert.deepEqual(
    playerById(imperialPrivilegeRecalled, "p2").hand.map((card) => card.id),
    [],
    "Imperial Privilege should not reveal the drawn card until the draw pending resolves",
  );
  const imperialPrivilegeDrawn = state.finishPendingAction(imperialPrivilegeRecalled);
  assert.equal(imperialPrivilegeDrawn.pendingAction, undefined, "Imperial Privilege should finish after resolving its delayed card draw");
  assert.deepEqual(
    playerById(imperialPrivilegeDrawn, "p2").hand.map((card) => card.id),
    [imperialPrivilegeDrawCard.id],
    "Imperial Privilege should draw one card only after the discard and recall choices",
  );

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
  const commanderSwordmasterActivationFixture = (activatedAllyIds, targetCard = cityCard) => ({
    ...swordmasterClaim,
    activeSeat: swordmasterClaim.players.findIndex((player) => player.id === "p1"),
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    players: swordmasterClaim.players.map((player) =>
      player.id === "p1"
        ? {
            ...player,
            hand: [targetCard],
            agentsReady: 1,
            agentsTotal: 3,
            swordmasterBonus: true,
            swordmasterAgentSpent: false,
            commanderActivatedAllyIds: activatedAllyIds,
          }
        : player,
    ),
  });
  const commanderThirdActivationForFirstAllyBase = commanderSwordmasterActivationFixture(["p3", "p5"]);
  assert.equal(
    turnActions.activatedAllyIdFor(
      playerById(commanderThirdActivationForFirstAllyBase, "p1"),
      commanderThirdActivationForFirstAllyBase.players,
      { p1: "p3" },
    ),
    "p3",
    "Commander Swordmaster strict Agent target resolver should accept a legal duplicate Ally",
  );
  const commanderThirdActivationForFirstAlly = place(
    turnActions,
    commanderThirdActivationForFirstAllyBase,
    cityCard,
    spaces.carthag,
    { p1: "p3" },
  );
  assert.deepEqual(
    playerById(commanderThirdActivationForFirstAlly, "p1").commanderActivatedAllyIds,
    ["p3", "p5", "p3"],
    "Commander Swordmaster third activation should be usable for the first already activated Ally",
  );
  assert.equal(
    playerById(commanderThirdActivationForFirstAlly, "p1").swordmasterAgentSpent,
    true,
    "Commander Swordmaster third activation should spend the one-use third Agent",
  );
  const commanderEarlyDuplicateBase = commanderSwordmasterActivationFixture(["p3"]);
  const commanderEarlyDuplicate = place(
    turnActions,
    {
      ...commanderEarlyDuplicateBase,
      players: commanderEarlyDuplicateBase.players.map((player) =>
        player.id === "p1" ? { ...player, agentsReady: 2 } : player
      ),
    },
    cityCard,
    spaces.carthag,
    { p1: "p3" },
  );
  assert.equal(
    playerById(commanderEarlyDuplicate, "p1").swordmasterAgentSpent,
    true,
    "Commander duplicate Swordmaster activation should spend the one-use Agent even before the last ready Agent",
  );
  const commanderThirdActivationForSecondAllyBase = commanderSwordmasterActivationFixture(["p3", "p5"]);
  const commanderThirdActivationForSecondAlly = place(
    turnActions,
    commanderThirdActivationForSecondAllyBase,
    cityCard,
    spaces.carthag,
    { p1: "p5" },
  );
  assert.deepEqual(
    playerById(commanderThirdActivationForSecondAlly, "p1").commanderActivatedAllyIds,
    ["p3", "p5", "p5"],
    "Commander Swordmaster third activation should be usable for the second already activated Ally",
  );
  const commanderTripleSameAllyBase = commanderSwordmasterActivationFixture(["p3", "p3"]);
  assert.equal(
    turnActions.activatedAllyIdFor(
      playerById(commanderTripleSameAllyBase, "p1"),
      commanderTripleSameAllyBase.players,
      { p1: "p3" },
    ),
    undefined,
    "Commander strict Agent target resolver should reject stale illegal targets",
  );
  assert.equal(
    turnActions.legalActivatedAllyIdFor(
      playerById(commanderTripleSameAllyBase, "p1"),
      commanderTripleSameAllyBase.players,
      { p1: "p3" },
    ),
    "p5",
    "Commander legal target resolver should fall back from a stale illegal target to the other Ally",
  );
  assert.equal(
    place(turnActions, commanderTripleSameAllyBase, cityCard, spaces.carthag, { p1: "p3" }),
    commanderTripleSameAllyBase,
    "Commander Swordmaster should not allow all three activations to use the same Ally",
  );
  const commanderSpentSwordmasterFixture = commanderSwordmasterActivationFixture(["p3"]);
  const commanderSpentSwordmasterBase = {
    ...commanderSpentSwordmasterFixture,
    players: commanderSpentSwordmasterFixture.players.map((player) =>
      player.id === "p1" ? { ...player, swordmasterAgentSpent: true } : player
    ),
  };
  assert.equal(
    place(turnActions, commanderSpentSwordmasterBase, cityCard, spaces.carthag, { p1: "p3" }),
    commanderSpentSwordmasterBase,
    "Commander Swordmaster should not grant another duplicate activation after the one-use Agent is spent",
  );
  const commanderPermanentOtherAllyAfterDuplicate = place(
    turnActions,
    commanderTripleSameAllyBase,
    cityCard,
    spaces.carthag,
    { p1: "p5" },
  );
  assert.deepEqual(
    playerById(commanderPermanentOtherAllyAfterDuplicate, "p1").commanderActivatedAllyIds,
    ["p3", "p3", "p5"],
    "Commander Swordmaster should still allow the other permanent Ally activation after an early duplicate",
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
