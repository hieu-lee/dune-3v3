import assert from "node:assert/strict";

import { playerById } from "./verify-leaders-fixtures.mjs";

function withStubbedRandom(value, action) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return action();
  } finally {
    Math.random = originalRandom;
  }
}

export function verifyLeaderSpiesAndReverendRepeat({ cards, data, game, players, spaces, state, states }) {
  const { allySignet, intrigueCard, leadTheWayDraw } = cards;
  const { feyd, irulan, ladyJessica, muadDib, muadDibAllyA, reverendJessicaOwner } = players;
  const { arrakeen, haggaBasin, imperialBasin, secrets } = spaces;
  const { jessicaOtherMemoriesResolved } = states;

  const espionage = data.boardSpaces.find((space) => space.id === "espionage");
  const expedition = data.boardSpaces.find((space) => space.id === "expedition");
  const controversialTech = data.boardSpaces.find((space) => space.id === "controversial-tech");
  const deliverSupplies = data.boardSpaces.find((space) => space.id === "deliver-supplies");
  const hardyWarriors = data.boardSpaces.find((space) => space.id === "hardy-warriors");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  const swordmaster = data.boardSpaces.find((space) => space.id === "swordmaster");
  assert.ok(espionage, "Espionage should exist for Reverend Mother repeat tests");
  assert.ok(expedition, "Expedition should exist for Reverend Mother repeat tests");
  assert.ok(controversialTech, "Controversial Technology should exist for Reverend Mother repeat tests");
  assert.ok(deliverSupplies, "Deliver Supplies should exist for Reverend Mother repeat negative tests");
  assert.ok(hardyWarriors, "Hardy Warriors should exist for Reverend Mother personal-space negative tests");
  assert.ok(highCouncil, "High Council should exist for Staban Unseen Network tests");
  assert.ok(swordmaster, "Swordmaster should exist for Staban Unseen Network tests");
  const benePostId = state.spyObservationPostIdForSpace(secrets.id);
  const stabanStarterDeck = state.leaderStarterDeckCards("Staban Tuek", "muaddib", "Ally");
  assert.equal(stabanStarterDeck.length, 9, "Staban's Limited Allies should start with a nine-card Ally deck");
  assert.equal(
    stabanStarterDeck.some((card) => card.name === "Diplomacy"),
    false,
    "Staban's Limited Allies should remove Diplomacy from the starting deck",
  );
  assert.equal(
    state.leaderStarterDeckCards("Gurney Halleck", "muaddib", "Ally").filter((card) => card.name === "Diplomacy").length,
    1,
    "Other Ally leaders should keep Diplomacy in their starting deck",
  );
  const staban = {
    ...feyd,
    leader: "Staban Tuek",
    leaderCard: data.leaderCardByName("Staban Tuek"),
    resources: { ...feyd.resources, spice: 0, solari: 2 },
    playArea: [allySignet],
    intrigues: [],
  };
  const stabanSignetState = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) => (player.id === staban.id ? staban : player)),
  };
  const stabanSignetPending = state.pendingActionForCard(
    allySignet,
    staban,
    stabanSignetState,
    staban,
    arrakeen,
  );
  assert.deepEqual(stabanSignetPending, {
    kind: "spy",
    ownerId: staban.id,
    remaining: 1,
    source: "Unseen Network",
    recallForSupply: true,
    postPlacementAction: "staban-unseen-network",
  });
  const stabanSignetSpaces = state.placeableSpySpaces(stabanSignetState, stabanSignetPending).map((space) => space.id);
  assert.ok(stabanSignetSpaces.includes(highCouncil.id), "Unseen Network should place on Landsraad observation posts");
  assert.ok(stabanSignetSpaces.includes(espionage.id), "Unseen Network should place on Faction observation posts");
  assert.ok(stabanSignetSpaces.includes(imperialBasin.id), "Unseen Network should place on Maker observation posts");
  assert.equal(stabanSignetSpaces.includes(hardyWarriors.id), false, "Unseen Network should not place on another team's personal board");
  const stabanLandsraadPlacement = state.placeSpyForPending(
    {
      ...stabanSignetState,
      pendingAction: stabanSignetPending,
      pendingQueue: [],
      players: stabanSignetState.players.map((player) =>
        player.id === staban.id ? { ...staban, resources: { ...staban.resources, spice: 1, solari: 2 } } : player,
      ),
    },
    stabanSignetPending,
    highCouncil.id,
  );
  assert.deepEqual(
    stabanLandsraadPlacement.pendingAction,
    {
      kind: "staban-unseen-network",
      ownerId: staban.id,
      spaceId: highCouncil.id,
      reward: "landsraad",
      source: "Unseen Network",
    },
    "Unseen Network should queue the Landsraad spend after placing the spy",
  );
  const stabanLandsraadReward = state.resolveStabanUnseenNetworkChoice(
    stabanLandsraadPlacement,
    stabanLandsraadPlacement.pendingAction,
    "pay",
  );
  assert.equal(playerById(stabanLandsraadReward, staban.id).resources.spice, 0, "Unseen Network Landsraad reward should spend 1 spice");
  assert.equal(playerById(stabanLandsraadReward, staban.id).resources.solari, 5, "Unseen Network Landsraad reward should gain 3 Solari");
  assert.equal(stabanLandsraadReward.pendingAction, undefined, "Unseen Network should clear after resolving the Landsraad reward");
  const staleStabanUnseenNetworkState = {
    ...stabanLandsraadPlacement,
    pendingAction: { kind: "draw-cards", ownerId: staban.id, source: "Live pending", amount: 1 },
    pendingQueue: [],
  };
  assert.deepEqual(
    state.resolveStabanUnseenNetworkChoice(staleStabanUnseenNetworkState, stabanLandsraadPlacement.pendingAction, "pay"),
    staleStabanUnseenNetworkState,
    "Unseen Network should reject stale pending actions",
  );
  const stabanFactionPlacement = state.placeSpyForPending(
    {
      ...stabanSignetState,
      pendingAction: stabanSignetPending,
      pendingQueue: [],
    },
    stabanSignetPending,
    espionage.id,
  );
  assert.equal(stabanFactionPlacement.pendingAction?.kind, "staban-unseen-network", "Unseen Network should queue a Faction spend after placing on a Faction post");
  const stabanFactionReward = state.resolveStabanUnseenNetworkChoice(
    stabanFactionPlacement,
    stabanFactionPlacement.pendingAction,
    "pay",
  );
  assert.equal(playerById(stabanFactionReward, staban.id).resources.solari, 0, "Unseen Network Faction reward should spend 2 Solari");
  assert.equal(playerById(stabanFactionReward, staban.id).intrigues.length, 1, "Unseen Network Faction reward should draw an Intrigue");
  assert.equal(playerById(stabanFactionReward, staban.id).intrigues[0].id, intrigueCard.id, "Unseen Network should draw from the Intrigue deck");
  const stabanMakerPlacement = state.placeSpyForPending(
    {
      ...stabanSignetState,
      pendingAction: stabanSignetPending,
      pendingQueue: [],
    },
    stabanSignetPending,
    imperialBasin.id,
  );
  assert.equal(stabanMakerPlacement.pendingAction, undefined, "Unseen Network should not queue a paid reward on Maker posts");
  const stabanNoPaymentPlacement = state.placeSpyForPending(
    {
      ...stabanSignetState,
      pendingAction: stabanSignetPending,
      pendingQueue: [],
      players: stabanSignetState.players.map((player) =>
        player.id === staban.id ? { ...staban, resources: { ...staban.resources, spice: 0, solari: 0 } } : player,
      ),
    },
    stabanSignetPending,
    highCouncil.id,
  );
  assert.equal(stabanNoPaymentPlacement.pendingAction, undefined, "Unseen Network should not queue an unaffordable paid reward");
  const stabanSmuggleBase = {
    ...game,
    turnSpiceGains: {},
    spyPosts: { [haggaBasin.id]: staban.id },
    players: game.players.map((player) => (player.id === staban.id ? { ...staban, resources: { ...staban.resources, spice: 0 } } : player)),
  };
  const stabanSmuggle = state.resolveStabanSmuggleSpice(stabanSmuggleBase, muadDibAllyA.id, haggaBasin.id);
  assert.equal(playerById(stabanSmuggle, staban.id).resources.spice, 1, "Smuggle Spice should pay Staban when another player visits his spied Maker space");
  assert.equal(stabanSmuggle.turnSpiceGains[staban.id], 1, "Smuggle Spice should count as Staban's spice gain this turn");
  assert.equal(
    playerById(state.resolveStabanSmuggleSpice(stabanSmuggleBase, staban.id, haggaBasin.id), staban.id).resources.spice,
    0,
    "Smuggle Spice should not pay when Staban sends the Agent himself",
  );
  assert.equal(
    playerById(state.resolveStabanSmuggleSpice(stabanSmuggleBase, muadDib.id, haggaBasin.id), staban.id).resources.spice,
    1,
    "Smuggle Spice should pay when a Commander sends the Agent while activating Staban",
  );
  assert.equal(
    playerById(state.resolveStabanSmuggleSpice(stabanSmuggleBase, muadDibAllyA.id, arrakeen.id), staban.id).resources.spice,
    0,
    "Smuggle Spice should require a Maker board space",
  );
  const stabanSharedSpySmuggle = state.resolveStabanSmuggleSpice(
    { ...stabanSmuggleBase, spyPosts: {}, sharedSpyPosts: { [haggaBasin.id]: [staban.id, irulan.id] } },
    muadDibAllyA.id,
    haggaBasin.id,
  );
  assert.equal(playerById(stabanSharedSpySmuggle, staban.id).resources.spice, 1, "Smuggle Spice should work from shared spy posts");
  const ladyMargot = {
    ...feyd,
    leader: "Lady Margot Fenring",
    leaderCard: data.leaderCardByName("Lady Margot Fenring"),
    playArea: [allySignet],
  };
  const margotSignetState = {
    ...game,
    players: game.players.map((player) => (player.id === ladyMargot.id ? ladyMargot : player)),
  };
  const margotSignetPending = state.pendingActionForCard(
    allySignet,
    ladyMargot,
    margotSignetState,
    ladyMargot,
    arrakeen,
  );
  assert.deepEqual(margotSignetPending, {
    kind: "spy",
    ownerId: ladyMargot.id,
    remaining: 1,
    source: "Arrakis Informant",
    placementIcon: "bene",
    recallForSupply: true,
  });
  assert.deepEqual(
    state.placeableSpySpaces(margotSignetState, margotSignetPending).map((space) => space.id).sort(),
    ["espionage"],
    "Arrakis Informant should place spies only on Bene Gesserit observation posts",
  );
  assert.equal(
    state.placeSpyForPending(margotSignetState, margotSignetPending, deliverSupplies.id),
    margotSignetState,
    "Arrakis Informant should reject non-Bene Gesserit spy posts",
  );
  const margotPlacedSpy = state.placeSpyForPending(
    { ...margotSignetState, pendingAction: margotSignetPending, pendingQueue: [] },
    margotSignetPending,
    espionage.id,
  );
  assert.equal(playerById(margotPlacedSpy, ladyMargot.id).spies, ladyMargot.spies - 1, "Arrakis Informant should spend one Margot spy");
  assert.equal(margotPlacedSpy.spyPosts[benePostId], ladyMargot.id, "Arrakis Informant should place Margot's spy on the chosen Bene post");
  const margotNoSupplyState = {
    ...margotSignetState,
    spyPosts: { [deliverSupplies.id]: ladyMargot.id },
    players: margotSignetState.players.map((player) =>
      player.id === ladyMargot.id ? { ...ladyMargot, spies: 0 } : player,
    ),
  };
  const margotRecallSupplyPending = state.pendingActionForCard(
    allySignet,
    playerById(margotNoSupplyState, ladyMargot.id),
    margotNoSupplyState,
    playerById(margotNoSupplyState, ladyMargot.id),
    arrakeen,
  );
  assert.equal(
    margotRecallSupplyPending?.kind,
    "spy",
    "Arrakis Informant should queue when Margot can recall a spy for supply",
  );
  assert.deepEqual(
    state.recallableSpySupplySpaces(margotNoSupplyState, margotRecallSupplyPending).map((space) => space.id),
    [deliverSupplies.id],
    "Arrakis Informant should allow recalling an existing spy to place on a Bene post",
  );
  const blockedMargotSignet = state.pendingActionForCard(
    allySignet,
    playerById(margotNoSupplyState, ladyMargot.id),
    {
      ...margotNoSupplyState,
      spyPosts: { [benePostId]: irulan.id },
    },
    playerById(margotNoSupplyState, ladyMargot.id),
    arrakeen,
  );
  assert.equal(blockedMargotSignet, undefined, "Arrakis Informant should not queue without a legal Bene post");
  assert.deepEqual(
    state.pendingActionsFor(
      { kind: "spy", ownerId: ladyMargot.id, remaining: 1, source: "Espionage" },
      margotSignetPending,
      3,
    ),
    [
      { kind: "spy", ownerId: ladyMargot.id, remaining: 1, source: "Espionage" },
      margotSignetPending,
    ],
    "Generic spy placement should not merge with Arrakis Informant and relax its Bene-only restriction",
  );
  const reverendRepeatOwner = {
    ...reverendJessicaOwner,
    resources: { ...reverendJessicaOwner.resources, spice: 0, water: 1 },
    influence: { ...reverendJessicaOwner.influence, bene: 0, fringeWorlds: 0 },
    hand: [],
    deck: [leadTheWayDraw],
    discard: [],
    intrigues: [],
  };
  const reverendRepeatGame = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) => (player.id === ladyJessica.id ? reverendRepeatOwner : player)),
  };
  const reverendRepeatPending = state.pendingActionForReverendMotherJessicaRepeat(
    reverendRepeatGame,
    reverendRepeatOwner,
    secrets,
  );
  const expectedReverendRepeatPending = (spaceId) => ({
    kind: "repeat-board-space",
    ownerId: ladyJessica.id,
    source: "Reverend Mother",
    spaceId,
    resource: "water",
    cost: 1,
    optional: true,
    ability: "reverend-mother-jessica",
  });
  assert.deepEqual(
    reverendRepeatPending,
    expectedReverendRepeatPending(secrets.id),
    "Reverend Mother Jessica should be able to repeat a Bene Gesserit space for 1 water",
  );
  assert.deepEqual(
    state.pendingActionForReverendMotherJessicaRepeat(reverendRepeatGame, reverendRepeatOwner, expedition),
    expectedReverendRepeatPending(expedition.id),
    "Reverend Mother Jessica should be able to repeat a Fremen board space for 1 water",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(
      reverendRepeatGame,
      { ...reverendRepeatOwner, resources: { ...reverendRepeatOwner.resources, water: 0 } },
      secrets,
    ),
    undefined,
    "Reverend Mother should require 1 payable water unless another queued choice can supply it",
  );
  assert.deepEqual(
    state.pendingActionForReverendMotherJessicaRepeat(
      reverendRepeatGame,
      { ...reverendRepeatOwner, resources: { ...reverendRepeatOwner.resources, water: 0 } },
      secrets,
      1,
    ),
    reverendRepeatPending,
    "Reverend Mother should queue behind Water of Life when that choice can supply the water",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(reverendRepeatGame, { ...reverendRepeatOwner, leader: "Lady Jessica" }, secrets),
    undefined,
    "Reverend Mother should require the Reverend Mother Jessica side",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(reverendRepeatGame, reverendRepeatOwner, deliverSupplies),
    undefined,
    "Reverend Mother should not repeat Spacing Guild spaces",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(reverendRepeatGame, reverendRepeatOwner, arrakeen),
    undefined,
    "Reverend Mother should not repeat City spaces",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(reverendRepeatGame, reverendRepeatOwner, hardyWarriors),
    undefined,
    "Reverend Mother should not repeat Commander personal-board Fremen spaces",
  );
  assert.equal(
    state.pendingActionForReverendMotherJessicaRepeat(
      { ...reverendRepeatGame, turnReverendMotherJessicaRepeats: { [ladyJessica.id]: true } },
      reverendRepeatOwner,
      secrets,
    ),
    undefined,
    "Reverend Mother should be once per turn",
  );
  const skippedReverendRepeat = state.resolveRepeatBoardSpaceChoice(
    { ...reverendRepeatGame, pendingAction: reverendRepeatPending, pendingQueue: [] },
    reverendRepeatPending,
    "skip",
  );
  assert.equal(playerById(skippedReverendRepeat, ladyJessica.id).resources.water, 1, "Skipping Reverend Mother should not spend water");
  assert.equal(playerById(skippedReverendRepeat, ladyJessica.id).influence.bene, 0, "Skipping Reverend Mother should not repeat Influence");
  const secretsPressureIntrigues = [
    { id: "secrets-pressure-a", name: "Secrets Pressure A", summary: "test" },
    { id: "secrets-pressure-b", name: "Secrets Pressure B", summary: "test" },
    { id: "secrets-pressure-c", name: "Secrets Pressure C", summary: "test" },
    { id: "secrets-pressure-d", name: "Secrets Pressure D", summary: "test" },
  ];
  const reverendSecretsGame = {
    ...reverendRepeatGame,
    players: reverendRepeatGame.players.map((player) =>
      player.id === feyd.id ? { ...player, intrigues: secretsPressureIntrigues } : player,
    ),
  };
  const repeatedSecrets = withStubbedRandom(0.49, () =>
    state.resolveRepeatBoardSpaceChoice(
      { ...reverendSecretsGame, pendingAction: reverendRepeatPending, pendingQueue: [] },
      reverendRepeatPending,
      "repeat",
    ),
  );
  assert.equal(playerById(repeatedSecrets, ladyJessica.id).resources.water, 0, "Reverend Mother should spend 1 water");
  assert.equal(playerById(repeatedSecrets, ladyJessica.id).influence.bene, 1, "Reverend Mother should repeat the Bene Gesserit Influence");
  assert.deepEqual(
    playerById(repeatedSecrets, ladyJessica.id).intrigues.map((card) => card.id),
    [intrigueCard.id, "secrets-pressure-b"],
    "Reverend Mother should repeat printed Intrigue gains and Secrets pressure",
  );
  assert.deepEqual(
    playerById(repeatedSecrets, feyd.id).intrigues.map((card) => card.id),
    ["secrets-pressure-a", "secrets-pressure-c", "secrets-pressure-d"],
    "Reverend Mother repeating Secrets should remove the random Intrigue from an opponent with four",
  );
  assert.equal(repeatedSecrets.turnReverendMotherJessicaRepeats[ladyJessica.id], true, "Reverend Mother use should be marked for the turn");
  assert.equal(repeatedSecrets.pendingAction, undefined, "Reverend Mother without deferred space effects should advance pending actions");
  const staleReverendRepeatState = {
    ...reverendSecretsGame,
    pendingAction: { kind: "draw-cards", ownerId: ladyJessica.id, source: "Live pending", amount: 1 },
    pendingQueue: [],
  };
  assert.deepEqual(
    state.resolveRepeatBoardSpaceChoice(staleReverendRepeatState, reverendRepeatPending, "repeat"),
    staleReverendRepeatState,
    "Reverend Mother repeat should reject stale pending actions",
  );
  const duplicateRepeatState = { ...repeatedSecrets, pendingAction: reverendRepeatPending, pendingQueue: [] };
  assert.equal(
    state.resolveRepeatBoardSpaceChoice(duplicateRepeatState, reverendRepeatPending, "repeat"),
    duplicateRepeatState,
    "A duplicate Reverend Mother pending should not resolve after the once-per-turn use",
  );
  const controversialRepeatPending = state.pendingActionForReverendMotherJessicaRepeat(
    reverendRepeatGame,
    reverendRepeatOwner,
    controversialTech,
  );
  assert.ok(controversialRepeatPending, "Controversial Technology should queue Reverend Mother repeat");
  const repeatedControversialTech = state.resolveRepeatBoardSpaceChoice(
    {
      ...reverendRepeatGame,
      intrigueDeck: [intrigueCard],
      pendingAction: controversialRepeatPending,
      pendingQueue: [],
    },
    controversialRepeatPending,
    "repeat",
  );
  assert.equal(playerById(repeatedControversialTech, ladyJessica.id).resources.spice, 0, "Reverend Mother should not pay the board-space cost a second time");
  assert.equal(playerById(repeatedControversialTech, ladyJessica.id).influence.fringeWorlds, 1, "Reverend Mother should repeat Fremen/Fringe Influence");
  assert.deepEqual(
    playerById(repeatedControversialTech, ladyJessica.id).hand.map((card) => card.id),
    [leadTheWayDraw.id],
    "Reverend Mother should repeat printed card draw",
  );
  assert.equal(repeatedControversialTech.pendingAction?.kind, "trash-card", "Reverend Mother should repeat Controversial Technology's mandatory trash");
  assert.equal(repeatedControversialTech.pendingAction?.optional, false, "Repeated Controversial Technology trash should be mandatory");
  const originalControversialTrashPending = {
    kind: "trash-card",
    ownerId: ladyJessica.id,
    source: "Controversial Technology",
    optional: false,
  };
  const oneTrashReverendRepeatGame = {
    ...reverendRepeatGame,
    players: reverendRepeatGame.players.map((player) =>
      player.id === ladyJessica.id ? { ...reverendRepeatOwner, playArea: [] } : player,
    ),
  };
  const repeatedControversialWithOriginalTrash = state.resolveRepeatBoardSpaceChoice(
    {
      ...oneTrashReverendRepeatGame,
      intrigueDeck: [intrigueCard],
      pendingAction: controversialRepeatPending,
      pendingQueue: [originalControversialTrashPending],
    },
    controversialRepeatPending,
    "repeat",
  );
  assert.equal(
    repeatedControversialWithOriginalTrash.pendingAction?.kind,
    "trash-card",
    "Reverend Mother should place the repeated Controversial Technology trash before the original one",
  );
  assert.equal(
    repeatedControversialWithOriginalTrash.pendingQueue[0]?.kind,
    "trash-card",
    "The original Controversial Technology trash should remain queued",
  );
  const repeatedControversialWithFringeReward = state.resolveRepeatBoardSpaceChoice(
    {
      ...oneTrashReverendRepeatGame,
      intrigueDeck: [intrigueCard],
      pendingAction: controversialRepeatPending,
      pendingQueue: [originalControversialTrashPending],
      players: oneTrashReverendRepeatGame.players.map((player) =>
        player.id === ladyJessica.id
          ? {
              ...reverendRepeatOwner,
              influence: { ...reverendRepeatOwner.influence, fringeWorlds: 3 },
              playArea: [],
              spies: 1,
            }
          : player
      ),
    },
    controversialRepeatPending,
    "repeat",
  );
  assert.equal(
    repeatedControversialWithFringeReward.pendingAction?.kind,
    "trash-card",
    "Repeated Controversial Technology trash should remain first when the repeat reaches Fringe Worlds 4",
  );
  assert.equal(
    repeatedControversialWithFringeReward.pendingQueue[0]?.kind,
    "spy",
    "Fringe Worlds 4 spy placement from a repeated space should queue before older pending actions",
  );
  assert.equal(
    repeatedControversialWithFringeReward.pendingQueue[0]?.source,
    "4 Fringe Worlds Influence",
    "The queued spy should be the repeated-space Fringe Worlds threshold reward",
  );
  assert.equal(
    repeatedControversialWithFringeReward.pendingQueue[1]?.kind,
    "trash-card",
    "Older queued actions should remain behind the repeated-space threshold reward",
  );
  const repeatedControversialAfterOnlyTrash = state.trashPlayerCard(
    repeatedControversialWithOriginalTrash,
    repeatedControversialWithOriginalTrash.pendingAction,
    "hand",
    leadTheWayDraw.id,
  );
  assert.equal(
    repeatedControversialAfterOnlyTrash.pendingAction,
    undefined,
    "Empty mandatory Controversial Technology trash should advance instead of deadlocking",
  );
  assert.match(
    repeatedControversialAfterOnlyTrash.log[0],
    /has no trashable cards for Controversial Technology/,
    "The skipped empty mandatory trash should be logged",
  );
  const espionageRepeatOwner = {
    ...reverendRepeatOwner,
    spies: 3,
    deck: [leadTheWayDraw],
    intrigues: [],
  };
  const espionageRepeatGame = {
    ...reverendRepeatGame,
    intrigueDeck: [intrigueCard],
    players: reverendRepeatGame.players.map((player) =>
      player.id === ladyJessica.id ? espionageRepeatOwner : player,
    ),
  };
  const espionageRepeatPending = state.pendingActionForReverendMotherJessicaRepeat(
    espionageRepeatGame,
    espionageRepeatOwner,
    espionage,
  );
  const espionageSpyPending = state.pendingActionForSpace(
    espionage,
    espionageRepeatOwner,
    espionageRepeatOwner,
    espionageRepeatGame.players,
  );
  assert.ok(espionageSpyPending, "Espionage should create an initial spy pending action");
  const repeatedEspionage = state.resolveRepeatBoardSpaceChoice(
    {
      ...espionageRepeatGame,
      pendingAction: espionageRepeatPending,
      pendingQueue: [espionageSpyPending],
    },
    espionageRepeatPending,
    "repeat",
  );
  assert.deepEqual(
    repeatedEspionage.pendingAction,
    {
      ...espionageSpyPending,
      remaining: 2,
      source: "Espionage / Espionage",
    },
    "Reverend Mother should merge Espionage's repeated spy placement with the original spy pending",
  );
  assert.equal(playerById(repeatedEspionage, ladyJessica.id).influence.bene, 1, "Repeated Espionage should repeat Bene Influence");
  assert.deepEqual(
    playerById(repeatedEspionage, ladyJessica.id).hand.map((card) => card.id),
    [leadTheWayDraw.id],
    "Repeated Espionage should draw before spy placement",
  );
  assert.deepEqual(
    playerById(repeatedEspionage, ladyJessica.id).intrigues.map((card) => card.id),
    [],
    "Repeated Espionage should not draw an Intrigue on the six-player board",
  );
  assert.equal(
    repeatedEspionage.pendingQueue.length,
    0,
    "Reverend Mother should not replay Signet or other card effects while repeating a board space",
  );
  assert.deepEqual(
    jessicaOtherMemoriesResolved.pendingAction,
    expectedReverendRepeatPending(secrets.id),
    "Other Memories should let Reverend Mother Jessica repeat the same Bene Gesserit space after flipping",
  );


  return {
    players: { ladyMargot },
  };
}
