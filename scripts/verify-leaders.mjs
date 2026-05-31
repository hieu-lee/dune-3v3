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

  const [muadDib, , muadDibAllyA, emperor] = game.players;
  const muadDibSignet = data.muadDibCommanderCards.find((card) => card.name === "Signet Ring");
  const allySignet = data.allyStarterCards.find((card) => card.name === "Signet Ring");
  const emperorSignet = data.emperorCommanderCards.find((card) => card.name === "Signet Ring");
  assert.ok(muadDibSignet, "Muad'Dib Commander deck should include Signet Ring");
  assert.ok(allySignet, "Ally starter deck should include Signet Ring");
  assert.ok(emperorSignet, "Emperor Commander deck should include Signet Ring");
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
  assert.match(muadDibSignet.play, /draw 1 card/i, "Muad'Dib Signet Ring should document Lead the Way");
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

  console.log("leader verification passed");
} finally {
  await server.close();
}
