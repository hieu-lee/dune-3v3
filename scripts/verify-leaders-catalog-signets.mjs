import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { playerById } from "./verify-leaders-fixtures.mjs";

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

export function verifyLeaderCatalogAndSignets({ data, state }) {
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
  const feyd = shaddamAlly;
  const irulan = playerById(game, "p6");
  const gurneySeat = game.players.findIndex((player) => player.id === muadDibAllyA.id);
  assert.notEqual(gurneySeat, -1, "Expected Gurney's active seat");
  const muadDibSignet = data.muadDibCommanderCards.find((card) => card.name === "Signet Ring");
  const demandAttention = data.muadDibCommanderCards.find((card) => card.sourceId === 548);
  const allySignet = data.allyStarterCards.find((card) => card.name === "Signet Ring");
  const emperorSignet = data.emperorCommanderCards.find((card) => card.name === "Signet Ring");
  const sietchRitual = data.intrigueCards.find((card) => card.sourceId === 127);
  const changeAllegiances = data.intrigueCards.find((card) => card.sourceId === 135);
  const detonation = data.intrigueCards.find((card) => card.sourceId === 131);
  const unexpectedAllies = data.intrigueCards.find((card) => card.sourceId === 137);
  const costOneImperiumCard = data.imperiumDeck.find((card) => card.cost === 1);
  const intrigueCard = data.intrigueCards[0];
  assert.ok(muadDibSignet, "Muad'Dib Commander deck should include Signet Ring");
  assert.ok(demandAttention, "Muad'Dib Commander deck should include Demand Attention");
  assert.ok(allySignet, "Ally starter deck should include Signet Ring");
  assert.ok(emperorSignet, "Emperor Commander deck should include Signet Ring");
  assert.ok(sietchRitual, "Sietch Ritual should exist for Margot Loyalty regression");
  assert.ok(changeAllegiances, "Change Allegiances should exist for influence threshold regression");
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

  const ladyAmber = {
    ...muadDibAllyA,
    leader: "Lady Amber Metulli",
    leaderCard: data.leaderCardByName("Lady Amber Metulli"),
    resources: { ...muadDibAllyA.resources, solari: 2, spice: 0 },
    playArea: [allySignet],
  };
  const amberAllianceGame = {
    ...game,
    alliances: { bene: ladyAmber.id },
    players: game.players.map((player) => (player.id === ladyAmber.id ? ladyAmber : player)),
  };
  const amberSignet = state.applyCardAgentEffect(allySignet, ladyAmber, ladyAmber, amberAllianceGame);
  assert.equal(amberSignet.source.resources.solari, 3, "Amber's Fill Coffers should gain 1 Solari with any Alliance");
  assert.equal(amberSignet.source.resources.spice, 1, "Amber's Fill Coffers should gain 1 spice with any Alliance");
  assert.equal(amberSignet.sourceSpiceGained, 1, "Amber's Fill Coffers spice should count as a spice gain this turn");
  assert.match(amberSignet.log ?? "", /Fill Coffers/, "Amber's Fill Coffers should log the Signet reward");
  const amberNoAllianceSignet = state.applyCardAgentEffect(
    allySignet,
    ladyAmber,
    ladyAmber,
    { ...amberAllianceGame, alliances: {} },
  );
  assert.equal(amberNoAllianceSignet.source.resources.solari, 2, "Amber's Fill Coffers should require an Alliance");
  assert.equal(amberNoAllianceSignet.source.resources.spice, 0, "Amber's Fill Coffers should not gain spice without an Alliance");
  const amberWrongLeaderSignet = state.applyCardAgentEffect(
    allySignet,
    { ...muadDibAllyA, resources: { ...muadDibAllyA.resources, solari: 2, spice: 0 } },
    muadDibAllyA,
    { ...amberAllianceGame, alliances: { bene: muadDibAllyA.id } },
  );
  assert.equal(amberWrongLeaderSignet.source.resources.spice, 0, "Fill Coffers should not trigger for other Ally leaders");


  return {
    cards: {
      allySignet,
      changeAllegiances,
      costOneImperiumCard,
      demandAttention,
      detonation,
      emperorSignet,
      intrigueCard,
      leadTheWayDiscardDraw,
      leadTheWayDraw,
      muadDibSignet,
      sietchRitual,
      unexpectedAllies,
    },
    game,
    players: { emperor, feyd, irulan, ladyAmber, muadDib, muadDibAllyA, shaddamAlly },
    seats: { gurneySeat },
    spaces: { arrakeen, imperialBasin },
  };
}
