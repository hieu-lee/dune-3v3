import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecSpacingGuildFavorDiscardValidation({
  boardSpaces,
  cards,
  fixtures,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { deliverSupplies } = boardSpaces;
  const {
    convincingArgument,
    sietchRitual,
    spacingGuildFavor,
    spaceTimeFolding,
  } = cards;
  const { spaceTimeDrawOne, spaceTimeDrawTwo } = fixtures;
  const { p2, p5 } = players;

  const spacingGuildFavorDraw = { ...convincingArgument, id: "spacing-guild-favor-agent-draw-card" };
  const spacingGuildFavorAgentEffect = state.applyCardAgentEffect(
    spacingGuildFavor,
    {
      ...p2,
      deck: [spacingGuildFavorDraw],
      hand: [],
      resources: { solari: 0, spice: 0, water: 0 },
    },
    p2,
    game,
  );
  assert.equal(
    spacingGuildFavorAgentEffect.source.hand[0]?.id,
    spacingGuildFavorDraw.id,
    "Spacing Guild's Favor Agent spec should draw 1 card",
  );
  assert.equal(
    spacingGuildFavorAgentEffect.source.resources.spice,
    0,
    "Spacing Guild's Favor Agent play should not trigger its discard spice",
  );

  const spacingGuildFavorDiscardCard = { ...spacingGuildFavor, id: "space-time-spacing-guild-favor-discard-card" };
  const spacingGuildFavorDiscardFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spacingGuildFavorDiscardCard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spacingGuildFavorDiscardPlaced = turnActions.placeAgentAction(spacingGuildFavorDiscardFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  const spacingGuildFavorDiscardForDrawResolved = state.resolveDiscardCardForDrawChoice(
    spacingGuildFavorDiscardPlaced,
    spacingGuildFavorDiscardPlaced.pendingAction,
    spacingGuildFavorDiscardCard.id,
  );
  const spacingGuildFavorDiscardOwner = playerById(spacingGuildFavorDiscardForDrawResolved, p2.id);
  assert.equal(
    spacingGuildFavorDiscardOwner.resources.spice,
    2,
    "Spacing Guild's Favor should gain 2 spice when discarded for another card effect",
  );
  assert.equal(
    spacingGuildFavorDiscardForDrawResolved.turnSpiceGains[p2.id],
    2,
    "Spacing Guild's Favor discard spice should count as spice gained this turn",
  );
  assert.ok(
    spacingGuildFavorDiscardOwner.hand.some((card) => card.id === spaceTimeDrawOne.id) &&
      spacingGuildFavorDiscardOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    "Spacing Guild's Favor should still count as a Spacing Guild discard for Space-time Folding's bonus draw",
  );
  assert.match(spacingGuildFavorDiscardForDrawResolved.log[0], /Space-time Folding: discards Spacing Guild's Favor/);
  assert.match(spacingGuildFavorDiscardForDrawResolved.log[1], /Spacing Guild's Favor: gains 2 spice/);

  const forcedSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "forced-spacing-guild-favor-discard-card" };
  const forcedDiscardPending = {
    kind: "discard-hand-card",
    ownerId: p5.id,
    source: "Verifier forced discard",
    remaining: 1,
  };
  const forcedDiscardFixture = {
    ...game,
    pendingAction: forcedDiscardPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p5.id
        ? {
            ...player,
            discard: [],
            hand: [forcedSpacingGuildFavorDiscard],
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const forcedDiscardResolved = state.resolveDiscardHandCardChoice(
    forcedDiscardFixture,
    forcedDiscardPending,
    forcedSpacingGuildFavorDiscard.id,
  );
  assert.equal(
    playerById(forcedDiscardResolved, p5.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded by a hand-discard pending action",
  );

  const influenceSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "influence-spacing-guild-favor-discard-card" };
  const influenceDiscardPending = {
    kind: "discard-card-for-influence-and-draw",
    ownerId: p2.id,
    influenceOwnerId: p2.id,
    source: "Verifier influence discard",
    drawCards: 1,
    influenceAmount: 1,
    optional: true,
  };
  const influenceDiscardDrawCard = { ...convincingArgument, id: "influence-spacing-guild-favor-draw-card" };
  const influenceDiscardFixture = {
    ...game,
    pendingAction: influenceDiscardPending,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [influenceDiscardDrawCard],
            discard: [],
            hand: [influenceSpacingGuildFavorDiscard],
            influence: { ...player.influence, bene: 1 },
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const influenceDiscardResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    influenceDiscardFixture,
    influenceDiscardPending,
    influenceSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(influenceDiscardResolved, p2.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded for Influence and card draw",
  );
  assert.equal(
    playerById(influenceDiscardResolved, p2.id).hand[0]?.id,
    influenceDiscardDrawCard.id,
    "Discard-trigger resource gain should compose with the original card draw",
  );

  const margotInfluenceSpacingGuildFavorDiscard = {
    ...spacingGuildFavor,
    id: "margot-influence-spacing-guild-favor-discard-card",
  };
  const margotInfluenceDiscardPending = {
    kind: "discard-card-for-influence-and-draw",
    ownerId: p2.id,
    influenceOwnerId: p2.id,
    source: "Verifier Margot influence discard",
    drawCards: 1,
    influenceAmount: 1,
    optional: true,
  };
  const margotInfluenceDrawCard = { ...convincingArgument, id: "margot-influence-spacing-guild-favor-draw-card" };
  const margotInfluenceFixture = {
    ...game,
    pendingAction: margotInfluenceDiscardPending,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            leader: "Lady Margot Fenring",
            deck: [margotInfluenceDrawCard],
            discard: [],
            hand: [margotInfluenceSpacingGuildFavorDiscard],
            influence: { ...player.influence, bene: 1 },
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  };
  const margotInfluenceResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    margotInfluenceFixture,
    margotInfluenceDiscardPending,
    margotInfluenceSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(margotInfluenceResolved, p2.id).resources.spice,
    4,
    "Discard-for-Influence should compose Spacing Guild's Favor spice with Margot Loyalty spice",
  );
  assert.equal(
    margotInfluenceResolved.turnSpiceGains[p2.id],
    4,
    "Discard-for-Influence trigger and Margot Loyalty spice should both count as turn spice gains",
  );
  assert.match(
    margotInfluenceResolved.log[0],
    /Verifier Margot influence discard: discards Spacing Guild's Favor/,
    "Discard-for-Influence action should remain the primary log entry",
  );
  assert.match(
    margotInfluenceResolved.log[1],
    /Loyalty/,
    "Influence threshold rewards should stay attached to the triggering action log",
  );
  assert.match(
    margotInfluenceResolved.log[2],
    /Spacing Guild's Favor: gains 2 spice/,
    "Discard trigger logs should remain secondary to the discard action and threshold reward",
  );

  const sietchSpacingGuildFavorDiscard = { ...spacingGuildFavor, id: "sietch-spacing-guild-favor-discard-card" };
  const sietchDiscardFixture = withActivePlayer(game, p2.id, (player) => ({
    discard: [],
    hand: [sietchSpacingGuildFavorDiscard],
    influence: { ...player.influence, bene: 1 },
    intrigues: [sietchRitual],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const sietchDiscardResolved = state.playSietchRitualPlotIntrigue(
    sietchDiscardFixture,
    p2.id,
    sietchRitual.id,
    sietchSpacingGuildFavorDiscard.id,
    "bene",
  );
  assert.equal(
    playerById(sietchDiscardResolved, p2.id).resources.spice,
    2,
    "Spacing Guild's Favor should trigger when discarded by typed Plot discard effects",
  );
  assert.equal(
    sietchDiscardResolved.turnSpiceGains[p2.id],
    2,
    "Typed Plot discards should record Spacing Guild's Favor spice as gained this turn",
  );

  const cleanupSpacingGuildFavor = { ...spacingGuildFavor, id: "cleanup-spacing-guild-favor-card" };
  const cleanupDrawCards = Array.from({ length: 5 }, (_, index) => ({
    ...convincingArgument,
    id: `cleanup-spacing-guild-favor-draw-card-${index}`,
  }));
  const cleanupState = state.startNextRound({
    ...game,
    conflict: undefined,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: cleanupDrawCards,
            discard: [],
            hand: [cleanupSpacingGuildFavor],
            playArea: [],
            resources: { solari: 0, spice: 0, water: 0 },
          }
        : player
    ),
  });
  const cleanupOwner = playerById(cleanupState, p2.id);
  assert.equal(
    cleanupOwner.resources.spice,
    0,
    "Spacing Guild's Favor should not trigger when moved to discard during round cleanup",
  );
  assert.equal(
    cleanupOwner.hand.some((card) => card.id === cleanupSpacingGuildFavor.id),
    false,
    "Round cleanup should remove Spacing Guild's Favor from hand",
  );
  assert.ok(
    cleanupOwner.discard.some((card) => card.id === cleanupSpacingGuildFavor.id),
    "Round cleanup should move Spacing Guild's Favor to discard without triggering it",
  );
}
