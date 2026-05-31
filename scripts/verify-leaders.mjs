import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = new URL("..", import.meta.url);

const expectedLeaderNames = [
  "Feyd-Rautha Harkonnen",
  "Gurney Halleck",
  "Lady Amber Metulli",
  "Lady Jessica",
  "Lady Margot Fenring",
  "Muad'Dib",
  "Princess Irulan",
  "Reverend Mother Jessica",
  "Shaddam Corrino IV",
  "Staban Tuek",
];

const expectedInitialSeats = [
  ["p1", "Muad'Dib"],
  ["p2", "Feyd-Rautha Harkonnen"],
  ["p3", "Gurney Halleck"],
  ["p4", "Shaddam Corrino IV"],
  ["p5", "Lady Jessica"],
  ["p6", "Princess Irulan"],
];

function assertLocalArt(leader) {
  const artPath = leader.thumbnailPath ?? leader.imagePath;
  assert.ok(artPath, `${leader.name} is missing leader art`);
  assert.ok(artPath.startsWith("/assets/"), `${leader.name} leader art must be local`);
  assert.ok(
    existsSync(join(projectRoot.pathname, "public", artPath)),
    `${leader.name} leader art does not exist at ${artPath}`,
  );
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.deepEqual(
    data.leaderCards.map((leader) => leader.name).sort(),
    expectedLeaderNames,
  );
  data.leaderCards.forEach(assertLocalArt);

  for (const leaderName of expectedLeaderNames) {
    const leader = data.leaderCardByName(leaderName);
    assert.equal(leader.name, leaderName);
    assert.ok(leader.sourceId, `${leaderName} should preserve source id`);
    assert.ok(leader.sourceSlug, `${leaderName} should preserve source slug`);
  }

  assert.throws(() => data.leaderCardByName("Not A Real Leader"), /Missing Uprising leader card/);

  const game = state.initialGame();
  assert.deepEqual(
    game.players.map((player) => [player.id, player.leader]),
    expectedInitialSeats,
  );
  for (const player of game.players) {
    assert.equal(player.leaderCard.name, player.leader, `${player.id} leader card should match leader name`);
    assertLocalArt(player.leaderCard);
  }

  const [muadDib, shaddamAlly, muadDibAllyA, emperor] = game.players;
  const irulan = playerById(game, "p6");
  const gurneySeat = game.players.findIndex((player) => player.id === muadDibAllyA.id);
  assert.notEqual(gurneySeat, -1, "Expected Gurney's active seat");
  const muadDibSignet = data.muadDibCommanderCards.find((card) => card.name === "Signet Ring");
  const allySignet = data.allyStarterCards.find((card) => card.name === "Signet Ring");
  const emperorSignet = data.emperorCommanderCards.find((card) => card.name === "Signet Ring");
  const detonation = data.intrigueCards.find((card) => card.sourceId === 131);
  const unexpectedAllies = data.intrigueCards.find((card) => card.sourceId === 137);
  const costOneImperiumCard = data.imperiumDeck.find((card) => card.cost === 1);
  const intrigueCard = data.intrigueCards[0];
  assert.ok(muadDibSignet, "Muad'Dib Commander deck should include Signet Ring");
  assert.ok(allySignet, "Ally starter deck should include Signet Ring");
  assert.ok(emperorSignet, "Emperor Commander deck should include Signet Ring");
  assert.ok(detonation, "Detonation should exist for Shaddam deployment-block regression");
  assert.ok(unexpectedAllies, "Unexpected Allies should exist for Shaddam deployment-block regression");
  assert.ok(costOneImperiumCard, "Verifier needs a cost-1 Imperium card");
  assert.ok(intrigueCard, "Verifier needs an Intrigue card");
  assert.equal(
    state.isMuadDibSignetRingCard(muadDibSignet),
    true,
    "Muad'Dib Signet Ring should be recognized for Lead the Way",
  );
  assert.equal(
    state.isMuadDibSignetRingCard(allySignet),
    false,
    "Generic Ally Signet Ring should not be recognized as Muad'Dib's Signet Ring",
  );
  assert.equal(
    state.isMuadDibSignetRingCard(emperorSignet),
    false,
    "Emperor Signet Ring should not be recognized as Muad'Dib's Signet Ring",
  );
  assert.equal(
    state.isShaddamSignetRingCard(emperorSignet),
    true,
    "Emperor Signet Ring should be recognized for Emperor of the Known Universe",
  );
  assert.equal(
    state.isShaddamSignetRingCard(allySignet),
    false,
    "Generic Ally Signet Ring should not be recognized as Shaddam's Signet Ring",
  );
  assert.equal(
    state.isShaddamSignetRingCard(muadDibSignet),
    false,
    "Muad'Dib Signet Ring should not be recognized as Shaddam's Signet Ring",
  );
  assert.equal(
    state.isGenericSignetRingCard(allySignet),
    true,
    "Generic Ally Signet Ring should be recognized for Ally leader Signet abilities",
  );
  assert.equal(
    state.isGenericSignetRingCard(muadDibSignet),
    false,
    "Muad'Dib Commander Signet Ring should not be recognized as a generic Ally Signet Ring",
  );
  assert.equal(
    state.isGenericSignetRingCard(emperorSignet),
    false,
    "Emperor Commander Signet Ring should not be recognized as a generic Ally Signet Ring",
  );
  assert.match(muadDibSignet.play, /draw 1 card/i, "Muad'Dib Signet Ring should document Lead the Way");
  assert.match(
    emperorSignet.play,
    /no Conflict deployment.*pay 1 Solari.*3 Solari.*Influence/i,
    "Emperor Signet Ring should document Emperor of the Known Universe",
  );
  const leadTheWayDraw = { ...data.allyStarterCards[0], id: "lead-the-way-draw-card" };
  const leadTheWayDiscardDraw = { ...data.allyStarterCards[1], id: "lead-the-way-discard-draw-card" };
  const leadTheWaySource = {
    ...muadDib,
    hand: [],
    deck: [leadTheWayDraw],
    discard: [],
    playArea: [muadDibSignet],
  };
  const leadTheWayResult = state.applyCardAgentEffect(muadDibSignet, leadTheWaySource, muadDibAllyA);
  assert.equal(
    leadTheWayResult.source.hand[0]?.id,
    leadTheWayDraw.id,
    "Lead the Way should draw one card for Muad'Dib",
  );
  assert.equal(leadTheWayResult.source.deck.length, 0, "Lead the Way should remove the drawn card from Muad'Dib's deck");
  assert.equal(leadTheWayResult.target.id, muadDibAllyA.id, "Lead the Way should not redirect the draw to the activated Ally");
  assert.match(leadTheWayResult.log ?? "", /Lead the Way/, "Lead the Way should log the Signet Ring draw");
  const reshuffleResult = state.applyCardAgentEffect(
    muadDibSignet,
    { ...leadTheWaySource, deck: [], discard: [leadTheWayDiscardDraw] },
    muadDibAllyA,
  );
  assert.equal(
    reshuffleResult.source.hand[0]?.id,
    leadTheWayDiscardDraw.id,
    "Lead the Way should reshuffle Muad'Dib's discard when the deck is empty",
  );
  assert.equal(reshuffleResult.source.discard.length, 0, "Lead the Way should consume the reshuffled discard card");
  const noCardResult = state.applyCardAgentEffect(
    muadDibSignet,
    { ...leadTheWaySource, deck: [], discard: [] },
    muadDibAllyA,
  );
  assert.equal(noCardResult.source.hand.length, 0, "Lead the Way should not crash when no card can be drawn");
  assert.match(noCardResult.log ?? "", /no card to draw/i, "Lead the Way should log an empty-deck draw miss");
  const wrongLeaderSignetResult = state.applyCardAgentEffect(
    muadDibSignet,
    { ...emperor, hand: [], deck: [leadTheWayDraw], discard: [] },
    emperor,
  );
  assert.equal(
    wrongLeaderSignetResult.source.hand.length,
    0,
    "Muad'Dib's Signet Ring should not draw for a different leader",
  );
  const allySignetResult = state.applyCardAgentEffect(
    allySignet,
    { ...leadTheWaySource, deck: [leadTheWayDraw] },
    muadDibAllyA,
  );
  assert.equal(allySignetResult.source.hand.length, 0, "Generic Ally Signet Ring should not trigger Lead the Way");
  const emperorSignetResult = state.applyCardAgentEffect(
    emperorSignet,
    { ...leadTheWaySource, deck: [leadTheWayDraw] },
    muadDibAllyA,
  );
  assert.equal(emperorSignetResult.source.hand.length, 0, "Emperor Signet Ring should not trigger Lead the Way");

  const arrakeen = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeen, "Arrakeen should exist for Signet deployment regression");
  const gurneyBoardEffect = state.applyBoardEffect(
    { ...muadDibAllyA, garrison: 3, conflict: 0, deployedTroops: 0 },
    { ...muadDibAllyA, garrison: 3, conflict: 0, deployedTroops: 0 },
    arrakeen,
  );
  const gurneyWarmaster = state.applyCardAgentEffect(
    allySignet,
    gurneyBoardEffect.source,
    gurneyBoardEffect.source,
  );
  assert.equal(gurneyWarmaster.source.garrison, 5, "Gurney's Warmaster Signet should recruit 1 troop after Arrakeen recruits 1");
  assert.equal(gurneyWarmaster.recruitedTroops, 1, "Gurney's Warmaster troop should count as recruited this turn");
  assert.match(gurneyWarmaster.log ?? "", /Warmaster/, "Gurney's Warmaster should log the Signet troop");
  assert.deepEqual(
    state.pendingActionForSpace(
      arrakeen,
      gurneyWarmaster.source,
      gurneyWarmaster.source,
      game.players,
      gurneyWarmaster.recruitedTroops,
    ),
    { kind: "deploy", ownerId: muadDibAllyA.id, remaining: 4, source: "Arrakeen" },
    "Gurney's Signet troop should be deployable from a Combat board space this turn",
  );
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin, "Imperial Basin should exist for Gurney Warmaster deployment regression");
  const emptyGarrisonWarmaster = state.applyCardAgentEffect(
    allySignet,
    { ...muadDibAllyA, garrison: 0, conflict: 0, deployedTroops: 0 },
    { ...muadDibAllyA, garrison: 0, conflict: 0, deployedTroops: 0 },
  );
  assert.deepEqual(
    state.pendingActionForSpace(
      imperialBasin,
      emptyGarrisonWarmaster.source,
      emptyGarrisonWarmaster.source,
      game.players,
      emptyGarrisonWarmaster.recruitedTroops,
    ),
    { kind: "deploy", ownerId: muadDibAllyA.id, remaining: 1, source: "Imperial Basin" },
    "Gurney should be able to deploy only the Warmaster troop when he had no prior garrison",
  );
  const jessicaSignet = state.applyCardAgentEffect(allySignet, game.players[4], game.players[4]);
  assert.equal(jessicaSignet.source.garrison, game.players[4].garrison, "Generic Signet should not recruit for a non-Gurney Ally");

  const freeImperiumCard = {
    ...costOneImperiumCard,
    id: `${costOneImperiumCard.id}-free-regression`,
    name: "Free Regression",
    cost: 0,
  };
  const replacementImperiumCard = {
    ...costOneImperiumCard,
    id: `${costOneImperiumCard.id}-replacement-regression`,
    name: "Replacement Regression",
    cost: 2,
  };
  const irulanSignetOwner = {
    ...irulan,
    hand: [],
    playArea: [allySignet],
  };
  const irulanSignetState = {
    ...game,
    imperiumRow: [freeImperiumCard, costOneImperiumCard],
    marketDeck: [replacementImperiumCard],
    reserveMarket: [],
    throneRow: [],
    players: game.players.map((player) => (player.id === irulan.id ? irulanSignetOwner : player)),
  };
  const irulanSignetPending = state.pendingActionForCard(
    allySignet,
    irulanSignetOwner,
    irulanSignetState,
    irulanSignetOwner,
    arrakeen,
  );
  assert.deepEqual(irulanSignetPending, {
    kind: "irulan-signet-ring",
    ownerId: irulan.id,
    cardId: allySignet.id,
    source: "Chronicler's Insight",
  });
  assert.deepEqual(
    state.irulanSignetAcquireCards(irulanSignetState, irulanSignetPending).map((card) => card.id),
    [costOneImperiumCard.id],
    "Chronicler's Insight should acquire exactly cost-1 cards, not cost-0 cards",
  );
  const irulanAcquireChoice = state.resolveIrulanSignetRingChoice(
    { ...irulanSignetState, pendingAction: irulanSignetPending, pendingQueue: [] },
    irulanSignetPending,
    "acquire",
  );
  assert.deepEqual(irulanAcquireChoice.pendingAction, {
    kind: "acquire-card",
    ownerId: irulan.id,
    source: "Chronicler's Insight",
    minCost: 1,
    maxCost: 1,
    destination: "hand",
  });
  const blockedFreeAcquire = state.acquireCardForPending(
    irulanAcquireChoice,
    irulanAcquireChoice.pendingAction,
    freeImperiumCard.id,
  );
  assert.equal(
    playerById(blockedFreeAcquire, irulan.id).hand.some((card) => card.id === freeImperiumCard.id),
    false,
    "Chronicler's Insight resolver should reject cost-0 cards",
  );
  assert.deepEqual(
    blockedFreeAcquire.pendingAction,
    irulanAcquireChoice.pendingAction,
    "Rejected Chronicler's Insight acquisition should keep the pending action unresolved",
  );
  const irulanAcquired = state.acquireCardForPending(
    irulanAcquireChoice,
    irulanAcquireChoice.pendingAction,
    costOneImperiumCard.id,
  );
  assert.equal(
    playerById(irulanAcquired, irulan.id).hand.some((card) => card.id === costOneImperiumCard.id),
    true,
    "Chronicler's Insight should acquire the cost-1 card to Irulan's hand",
  );
  assert.equal(
    playerById(irulanAcquired, irulan.id).hand.some((card) => card.id === freeImperiumCard.id),
    false,
    "Chronicler's Insight should not acquire cost-0 cards",
  );

  const trashCostOneCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-cost-one`, cost: 1 };
  const trashFreeCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-free`, name: "Free Trash", cost: 0 };
  const trashDiscardCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-discard`, cost: 1 };
  const irulanTrashOwner = {
    ...irulan,
    resources: { ...irulan.resources, spice: 0 },
    hand: [trashCostOneCard, trashFreeCard],
    discard: [trashDiscardCard],
    playArea: [allySignet],
  };
  const irulanTrashState = {
    ...game,
    pendingAction: irulanSignetPending,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) => (player.id === irulan.id ? irulanTrashOwner : player)),
  };
  const irulanTrashChoice = state.resolveIrulanSignetRingChoice(irulanTrashState, irulanSignetPending, "trash");
  assert.equal(irulanTrashChoice.pendingAction.kind, "trash-card", "Chronicler's Insight should queue a trash-card pending action");
  assert.deepEqual(irulanTrashChoice.pendingAction.zones, ["hand"], "Chronicler's Insight should only trash from hand");
  assert.deepEqual(
    state.trashableCardsForPending(playerById(irulanTrashChoice, irulan.id), irulanTrashChoice.pendingAction)
      .map(({ zone, card }) => `${zone}:${card.id}`),
    [`hand:${trashCostOneCard.id}`, `hand:${trashFreeCard.id}`],
    "Chronicler's Insight trash choices should exclude discard and play area cards",
  );
  const blockedDiscardTrash = state.trashPlayerCard(
    irulanTrashChoice,
    irulanTrashChoice.pendingAction,
    "discard",
    trashDiscardCard.id,
  );
  assert.equal(
    playerById(blockedDiscardTrash, irulan.id).discard.length,
    1,
    "Chronicler's Insight should reject non-hand trash targets",
  );
  const freeTrash = state.trashPlayerCard(irulanTrashChoice, irulanTrashChoice.pendingAction, "hand", trashFreeCard.id);
  assert.equal(playerById(freeTrash, irulan.id).resources.spice, 0, "Trashing a cost-0 card should not pay Irulan spice");
  assert.equal(freeTrash.turnSpiceGains[irulan.id] ?? 0, 0, "Cost-0 Irulan trash should not count as a spice gain");
  const paidTrash = state.trashPlayerCard(irulanTrashChoice, irulanTrashChoice.pendingAction, "hand", trashCostOneCard.id);
  assert.equal(playerById(paidTrash, irulan.id).resources.spice, 2, "Trashing a cost-1 card should pay Irulan 2 spice");
  assert.equal(paidTrash.turnSpiceGains[irulan.id], 2, "Irulan's trash reward should count as a spice gain this turn");

  const irulanBirthrightBase = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === irulan.id
        ? { ...player, influence: { ...player.influence, greatHouses: 1 }, intrigues: [] }
        : player,
    ),
  };
  const irulanBirthrightReached = state.resolvePrincessIrulanBirthright(
    {
      ...irulanBirthrightBase,
      players: irulanBirthrightBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightBase.players,
  );
  assert.equal(playerById(irulanBirthrightReached, irulan.id).influence.greatHouses, 2, "Irulan should reach Great Houses 2 Influence");
  assert.equal(playerById(irulanBirthrightReached, irulan.id).vp, irulan.vp + 1, "Irulan should still score the 2-Influence VP");
  assert.equal(playerById(irulanBirthrightReached, irulan.id).intrigues.length, 1, "Imperial Birthright should draw one Intrigue at 2 Great Houses Influence");
  const irulanBirthrightNoRepeatBase = {
    ...irulanBirthrightBase,
    intrigueDeck: [intrigueCard],
    players: irulanBirthrightBase.players.map((player) =>
      player.id === irulan.id
        ? { ...player, influence: { ...player.influence, greatHouses: 2 }, intrigues: [] }
        : player,
    ),
  };
  const irulanBirthrightNoRepeat = state.resolvePrincessIrulanBirthright(
    {
      ...irulanBirthrightNoRepeatBase,
      players: irulanBirthrightNoRepeatBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightNoRepeatBase.players,
  );
  assert.equal(playerById(irulanBirthrightNoRepeat, irulan.id).intrigues.length, 0, "Imperial Birthright should not trigger at 2 -> 3 Influence");
  const irulanBirthrightDropped = state.resolvePrincessIrulanBirthright(
    {
      ...irulanBirthrightNoRepeatBase,
      players: irulanBirthrightNoRepeatBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", -1) : player,
      ),
    },
    irulanBirthrightNoRepeatBase.players,
  );
  const irulanBirthrightRegained = state.resolvePrincessIrulanBirthright(
    {
      ...irulanBirthrightDropped,
      intrigueDeck: [intrigueCard],
      players: irulanBirthrightDropped.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightDropped.players,
  );
  assert.equal(playerById(irulanBirthrightRegained, irulan.id).intrigues.length, 1, "Imperial Birthright should trigger again after Irulan drops below 2 and regains it");
  const shaddamPersonalBirthrightBase = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === emperor.id
        ? { ...player, influence: { ...player.influence, emperor: 1 } }
        : player.id === irulan.id
          ? { ...player, intrigues: [] }
          : player,
    ),
  };
  const shaddamPersonalBirthright = state.resolvePrincessIrulanBirthright(
    {
      ...shaddamPersonalBirthrightBase,
      players: shaddamPersonalBirthrightBase.players.map((player) =>
        player.id === emperor.id ? state.adjustInfluence(player, "emperor", 1) : player,
      ),
    },
    shaddamPersonalBirthrightBase.players,
  );
  assert.equal(playerById(shaddamPersonalBirthright, irulan.id).intrigues.length, 0, "Shaddam reaching personal Emperor 2 should not trigger Irulan");

  const gurneyRevealBase = {
    ...game,
    activeSeat: gurneySeat,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === muadDibAllyA.id
        ? {
            ...player,
            revealed: true,
            conflict: 10,
            deployedTroops: 5,
            vp: 1,
            gurneyAlwaysSmilingScored: false,
          }
        : player,
    ),
  };
  const gurneyScored = state.scoreGurneyAlwaysSmiling(gurneyRevealBase, muadDibAllyA.id);
  assert.equal(playerById(gurneyScored, muadDibAllyA.id).vp, 2, "Gurney should gain 1 VP at 10+ strength in six-player mode");
  assert.equal(
    playerById(gurneyScored, muadDibAllyA.id).gurneyAlwaysSmilingScored,
    true,
    "Gurney should mark Always Smiling as scored for the Reveal turn",
  );
  assert.match(gurneyScored.log[0], /Always Smiling/, "Gurney's Reveal ability should log when it scores");
  const gurneyNoDouble = state.scoreGurneyAlwaysSmiling(gurneyScored, muadDibAllyA.id);
  assert.equal(playerById(gurneyNoDouble, muadDibAllyA.id).vp, 2, "Always Smiling should score at most once per Reveal turn");
  const gurneyUnderThreshold = state.scoreGurneyAlwaysSmiling(
    {
      ...gurneyRevealBase,
      players: gurneyRevealBase.players.map((player) =>
        player.id === muadDibAllyA.id ? { ...player, conflict: 9 } : player,
      ),
    },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyUnderThreshold, muadDibAllyA.id).vp, 1, "Gurney should not score below 10 strength in six-player mode");
  const gurneyInactiveTurn = state.scoreGurneyAlwaysSmiling(
    { ...gurneyRevealBase, activeSeat: game.players.findIndex((player) => player.id === muadDib.id) },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyInactiveTurn, muadDibAllyA.id).vp, 1, "Always Smiling should only score on Gurney's own active Reveal turn");
  const gurneyNoUnits = state.scoreGurneyAlwaysSmiling(
    {
      ...gurneyRevealBase,
      players: gurneyRevealBase.players.map((player) =>
        player.id === muadDibAllyA.id ? { ...player, deployedTroops: 0, deployedSandworms: 0 } : player,
      ),
    },
    muadDibAllyA.id,
  );
  assert.equal(playerById(gurneyNoUnits, muadDibAllyA.id).vp, 1, "Gurney should not score from swords alone with no Conflict units");
  const gurneyNonSixPlayer = state.scoreGurneyAlwaysSmiling(
    { ...gurneyRevealBase, players: gurneyRevealBase.players.slice(0, 5) },
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyNonSixPlayer, muadDibAllyA.id).vp,
    1,
    "The automated Gurney threshold should only apply to this six-player implementation",
  );
  const gurneyRevealAdjustPending = {
    kind: "reveal-adjust",
    ownerId: muadDibAllyA.id,
    combatRecipientId: muadDibAllyA.id,
    cards: ["Printed strength"],
    persuasionAdjustment: 0,
    strengthAdjustment: 1,
    source: "Printed reveal",
  };
  const gurneyBeforePrintedStrength = {
    ...gurneyRevealBase,
    players: gurneyRevealBase.players.map((player) =>
      player.id === muadDibAllyA.id ? { ...player, conflict: 9 } : player,
    ),
  };
  const gurneyAfterPrintedStrength = state.finishRevealAdjustment(
    {
      ...gurneyBeforePrintedStrength,
      pendingAction: gurneyRevealAdjustPending,
      pendingQueue: [],
      players: gurneyBeforePrintedStrength.players.map((player) =>
        player.id === muadDibAllyA.id ? { ...player, conflict: 10 } : player,
      ),
    },
    gurneyRevealAdjustPending,
  );
  assert.equal(
    playerById(gurneyAfterPrintedStrength, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after printed reveal strength adjustments make Gurney eligible",
  );
  const deployCrossingPending = { kind: "deploy", ownerId: muadDibAllyA.id, remaining: 1, source: "Reveal-turn Detonation" };
  const gurneyAfterRevealDeployment = state.scoreGurneyAlwaysSmiling(
    state.deployTroopToConflict(
      {
        ...gurneyRevealBase,
        pendingAction: deployCrossingPending,
        pendingQueue: [],
        players: gurneyRevealBase.players.map((player) =>
          player.id === muadDibAllyA.id
            ? { ...player, conflict: 8, garrison: 1, deployedTroops: 4, vp: 1, gurneyAlwaysSmilingScored: false }
            : player,
        ),
      },
      deployCrossingPending,
    ),
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyAfterRevealDeployment, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after a Reveal-turn deployment brings Gurney to 10 strength",
  );
  const gurneyUnexpectedAlliesState = {
    ...gurneyRevealBase,
    shieldWall: false,
    players: gurneyRevealBase.players.map((player) =>
      player.id === muadDibAllyA.id
        ? {
            ...player,
            conflict: 7,
            deployedTroops: 4,
            deployedSandworms: 0,
            resources: { ...player.resources, water: 2 },
            intrigues: [unexpectedAllies],
            vp: 1,
            gurneyAlwaysSmilingScored: false,
          }
        : { ...player, intrigues: [] },
    ),
  };
  const gurneyAfterUnexpectedAllies = state.scoreGurneyAlwaysSmiling(
    state.playUnexpectedAlliesIntrigue(gurneyUnexpectedAlliesState, muadDibAllyA.id, unexpectedAllies.id, false),
    muadDibAllyA.id,
  );
  assert.equal(
    playerById(gurneyAfterUnexpectedAllies, muadDibAllyA.id).vp,
    2,
    "Always Smiling should score after Reveal-turn Unexpected Allies brings Gurney to 10 strength",
  );

  const shaddamSignetSource = {
    ...emperor,
    resources: { ...emperor.resources, solari: 3 },
    playArea: [emperorSignet],
  };
  const shaddamSignetEffect = state.applyCardAgentEffect(emperorSignet, shaddamSignetSource, shaddamAlly);
  assert.equal(
    shaddamSignetEffect.blocksDeploymentsThisTurn,
    true,
    "Emperor of the Known Universe should block same-turn Conflict deployment",
  );
  assert.equal(shaddamSignetEffect.target.id, shaddamAlly.id, "Shaddam Signet should keep the activated Ally target");
  assert.match(shaddamSignetEffect.log ?? "", /can't be deployed/, "Shaddam Signet should log the deployment block");
  assert.equal(
    state.pendingActionForSpace(
      arrakeen,
      shaddamSignetEffect.source,
      shaddamSignetEffect.target,
      game.players,
      0,
      shaddamSignetEffect.blocksDeploymentsThisTurn,
    ),
    undefined,
    "Shaddam Signet should suppress the activated Ally's same-turn combat-space deployment",
  );
  const militarySupport = data.boardSpaces.find((space) => space.id === "military-support");
  assert.ok(militarySupport, "Military Support should exist for Shaddam Signet reinforcement regression");
  const blockedReinforcePending = state.pendingActionForSpace(
    militarySupport,
    shaddamSignetEffect.source,
    shaddamSignetEffect.target,
    game.players,
    0,
    shaddamSignetEffect.blocksDeploymentsThisTurn,
  );
  assert.deepEqual(blockedReinforcePending, {
    kind: "reinforce",
    team: "shaddam",
    remaining: 3,
    source: "Military Support",
    conflictBlocked: true,
  });
  const blockedReinforceGame = {
    ...game,
    pendingAction: blockedReinforcePending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === shaddamAlly.id ? { ...player, garrison: 0, conflict: 0, deployedTroops: 0 } : player,
    ),
  };
  const rejectedConflictReinforce = state.reinforceTroop(
    blockedReinforceGame,
    blockedReinforcePending,
    shaddamAlly.id,
    "conflict",
  );
  assert.equal(playerById(rejectedConflictReinforce, shaddamAlly.id).conflict, 0, "Blocked reinforcement should not enter Conflict");
  assert.equal(
    rejectedConflictReinforce.pendingAction?.kind,
    "reinforce",
    "Blocked reinforcement should keep the pending action for a garrison choice",
  );
  const garrisonReinforce = state.reinforceTroop(
    blockedReinforceGame,
    blockedReinforcePending,
    shaddamAlly.id,
    "garrison",
  );
  assert.equal(playerById(garrisonReinforce, shaddamAlly.id).garrison, 1, "Blocked reinforcement should still allow garrison recruitment");
  assert.equal(garrisonReinforce.pendingAction?.remaining, 2, "Garrison reinforcement should consume one blocked reinforce choice");
  const blockedSietchPending = {
    kind: "sietch-tabr",
    ownerId: shaddamAlly.id,
    waterOwnerId: emperor.id,
    canTakeMakerHooks: false,
    canRemoveShieldWall: true,
    source: "Sietch Tabr",
    spaceId: "sietch-tabr",
    conflictBlocked: true,
  };
  const blockedSietchGame = {
    ...game,
    pendingAction: blockedSietchPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === shaddamAlly.id) return { ...player, garrison: 2, conflict: 0, deployedTroops: 0 };
      if (player.id === emperor.id) return { ...player, resources: { ...player.resources, water: 0 } };
      return player;
    }),
  };
  const blockedSietch = state.resolveSietchTabrChoice(blockedSietchGame, blockedSietchPending, "hooks");
  assert.equal(playerById(blockedSietch, shaddamAlly.id).garrison, 3, "Blocked Sietch Tabr should still recruit to garrison");
  assert.equal(playerById(blockedSietch, shaddamAlly.id).conflict, 0, "Blocked Sietch Tabr should not deploy troops");
  assert.equal(blockedSietch.pendingAction, undefined, "Blocked Sietch Tabr should not queue deployment");

  const signetDeploymentBlock = {
    actorId: emperor.id,
    ownerId: shaddamAlly.id,
    source: "Emperor of the Known Universe",
  };
  const blockedPlotDeploymentGame = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === emperor.id),
    conflictDeploymentBlock: signetDeploymentBlock,
    pendingAction: undefined,
    pendingQueue: [],
    shieldWall: false,
    players: game.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...player, resources: { ...player.resources, water: 2 }, intrigues: [detonation, unexpectedAllies] };
      }
      if (player.id === shaddamAlly.id) {
        return { ...player, garrison: 3, conflict: 0, deployedTroops: 0, deployedSandworms: 0 };
      }
      return { ...player, intrigues: [] };
    }),
  };
  assert.equal(
    state.conflictDeploymentBlockedFor(blockedPlotDeploymentGame, emperor.id, shaddamAlly.id),
    true,
    "Shaddam Signet should register the activated Ally as deployment-blocked for Shaddam's turn",
  );
  assert.equal(
    state.conflictDeploymentBlockedFor(blockedPlotDeploymentGame, emperor.id, "p6"),
    false,
    "Shaddam Signet deployment block should not affect an unactivated Ally",
  );
  const blockedDetonation = state.playDetonationIntrigue(
    blockedPlotDeploymentGame,
    emperor.id,
    detonation.id,
    "deploy",
    shaddamAlly.id,
  );
  assert.equal(blockedDetonation, blockedPlotDeploymentGame, "Shaddam Signet should block Detonation troop deployment");
  const blockedUnexpectedAllies = state.playUnexpectedAlliesIntrigue(
    blockedPlotDeploymentGame,
    emperor.id,
    unexpectedAllies.id,
    false,
    shaddamAlly.id,
  );
  assert.equal(
    blockedUnexpectedAllies,
    blockedPlotDeploymentGame,
    "Shaddam Signet should block Unexpected Allies sandworm deployment",
  );
  const blockedDeployPending = { kind: "deploy", ownerId: shaddamAlly.id, remaining: 1, source: "Blocked regression" };
  const blockedDeploy = state.deployTroopToConflict(
    { ...blockedPlotDeploymentGame, pendingAction: blockedDeployPending },
    blockedDeployPending,
  );
  assert.equal(playerById(blockedDeploy, shaddamAlly.id).garrison, 3, "Blocked deployment should not spend a garrison troop");
  assert.equal(playerById(blockedDeploy, shaddamAlly.id).conflict, 0, "Blocked deployment should not add Conflict strength");
  assert.equal(blockedDeploy.pendingAction, undefined, "Blocked deployment should advance the stale pending action");

  const shaddamSignetPending = state.pendingActionForCard(
    emperorSignet,
    shaddamSignetSource,
    game,
    shaddamAlly,
    arrakeen,
  );
  assert.deepEqual(shaddamSignetPending, {
    kind: "shaddam-signet-ring",
    commanderId: emperor.id,
    allyId: shaddamAlly.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
  });
  assert.equal(
    state.pendingActionForCard(emperorSignet, { ...shaddamSignetSource, playArea: [] }, game, shaddamAlly, arrakeen),
    undefined,
    "Shaddam Signet choice should require the Signet Ring in play",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, shaddamAlly, game, shaddamAlly, arrakeen),
    undefined,
    "Shaddam Signet choice should not trigger from an Ally owner",
  );
  assert.equal(
    state.pendingActionForCard(emperorSignet, shaddamSignetSource, game, muadDibAllyA, arrakeen),
    undefined,
    "Shaddam Signet choice should require an activated Shaddam Ally",
  );

  const signetResolutionBase = {
    ...game,
    pendingAction: shaddamSignetPending,
    pendingQueue: [],
    conflictDeploymentBlock: signetDeploymentBlock,
    players: game.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...shaddamSignetSource, influence: { ...player.influence, emperor: 1 } };
      }
      if (player.id === shaddamAlly.id) {
        return {
          ...player,
          garrison: 0,
          influence: { ...player.influence, greatHouses: 1, spacing: 1 },
        };
      }
      return player;
    }),
  };
  const troopChoice = state.resolveShaddamSignetRingChoice(signetResolutionBase, shaddamSignetPending, "troop");
  assert.equal(playerById(troopChoice, emperor.id).resources.solari, 2, "Shaddam Signet troop branch should cost Shaddam 1 Solari");
  assert.equal(playerById(troopChoice, shaddamAlly.id).garrison, 1, "Shaddam Signet troop branch should recruit for the activated Ally");
  assert.equal(playerById(troopChoice, shaddamAlly.id).conflict, 0, "Shaddam Signet troop branch should not deploy the recruited troop");
  assert.equal(troopChoice.pendingAction, undefined, "Shaddam Signet troop branch should clear the pending action");
  assert.equal(troopChoice.conflictDeploymentBlock, undefined, "Shaddam Signet block should clear when the Signet pending choice resolves");

  const greatHousesChoice = state.resolveShaddamSignetRingChoice(
    signetResolutionBase,
    shaddamSignetPending,
    { kind: "influence", faction: "greatHouses" },
  );
  assert.equal(playerById(greatHousesChoice, emperor.id).resources.solari, 0, "Shaddam Signet Influence branch should cost Shaddam 3 Solari");
  assert.equal(
    playerById(greatHousesChoice, shaddamAlly.id).influence.greatHouses,
    2,
    "Shaddam Signet main-board Influence branch should move the activated Ally",
  );
  assert.equal(playerById(greatHousesChoice, shaddamAlly.id).vp, shaddamAlly.vp + 1, "Shaddam Signet Ally Influence can score the 2-Influence VP");
  assert.equal(playerById(greatHousesChoice, emperor.id).influence.greatHouses, 0, "Shaddam should not take main-board Great Houses Influence");

  const personalEmperorChoice = state.resolveShaddamSignetRingChoice(
    signetResolutionBase,
    shaddamSignetPending,
    { kind: "influence", faction: "emperor" },
  );
  assert.equal(
    playerById(personalEmperorChoice, emperor.id).influence.emperor,
    2,
    "Shaddam Signet personal Emperor choice should move Shaddam's personal track",
  );
  assert.equal(playerById(personalEmperorChoice, emperor.id).vp, emperor.vp + 1, "Shaddam personal Influence can score the 2-Influence VP");
  assert.equal(playerById(personalEmperorChoice, shaddamAlly.id).influence.emperor, 0, "Activated Ally should not take personal Emperor Influence");
  const irulanShaddamSignetPending = {
    kind: "shaddam-signet-ring",
    commanderId: emperor.id,
    allyId: irulan.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
  };
  const irulanShaddamSignetBase = {
    ...signetResolutionBase,
    pendingAction: irulanShaddamSignetPending,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: signetResolutionBase.players.map((player) => {
      if (player.id === emperor.id) {
        return { ...player, resources: { ...player.resources, solari: 3 }, playArea: [emperorSignet] };
      }
      if (player.id === irulan.id) {
        return { ...player, influence: { ...player.influence, greatHouses: 1 }, intrigues: [] };
      }
      return player;
    }),
  };
  const irulanShaddamSignetBirthright = state.resolveShaddamSignetRingChoice(
    irulanShaddamSignetBase,
    irulanShaddamSignetPending,
    { kind: "influence", faction: "greatHouses" },
  );
  assert.equal(
    playerById(irulanShaddamSignetBirthright, irulan.id).influence.greatHouses,
    2,
    "Shaddam Signet should route Great Houses Influence to activated Irulan",
  );
  assert.equal(
    playerById(irulanShaddamSignetBirthright, irulan.id).intrigues.length,
    1,
    "Commander-routed Great Houses Influence should trigger Irulan's Imperial Birthright",
  );
  const skippedSignet = state.resolveShaddamSignetRingChoice(signetResolutionBase, shaddamSignetPending, "skip");
  assert.equal(playerById(skippedSignet, emperor.id).resources.solari, 3, "Skipping Shaddam Signet should not spend Solari");
  assert.equal(playerById(skippedSignet, shaddamAlly.id).garrison, 0, "Skipping Shaddam Signet should not recruit troops");
  assert.equal(skippedSignet.conflictDeploymentBlock, undefined, "Skipping Shaddam Signet should clear the one-turn deployment block");
  const laterDeployPending = { kind: "deploy", ownerId: shaddamAlly.id, remaining: 1, source: "Later turn" };
  const laterDeploy = state.deployTroopToConflict(
    {
      ...skippedSignet,
      pendingAction: laterDeployPending,
      players: skippedSignet.players.map((player) =>
        player.id === shaddamAlly.id ? { ...player, garrison: 3, conflict: 0, deployedTroops: 0 } : player,
      ),
    },
    laterDeployPending,
  );
  assert.equal(playerById(laterDeploy, shaddamAlly.id).garrison, 2, "Later turns should allow the Ally to deploy after Shaddam Signet clears");
  assert.equal(playerById(laterDeploy, shaddamAlly.id).conflict, 2, "Later deployment should add Conflict strength after Shaddam Signet clears");

  console.log("leader verification passed");
} finally {
  await server.close();
}
