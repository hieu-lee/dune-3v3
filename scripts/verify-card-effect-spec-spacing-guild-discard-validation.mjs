import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecSpacingGuildDiscardValidation({
  boardSpaces,
  cards,
  fixtures,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { deliverSupplies, secrets } = boardSpaces;
  const {
    backedByChoam,
    buyAccess,
    convincingArgument,
    dagger,
    guildEnvoy,
    guildSpy,
    spaceTimeFolding,
  } = cards;
  const { spaceTimeDrawOne, spaceTimeDrawTwo } = fixtures;
  const { p2 } = players;
  assert.deepEqual(
    guildSpy.traits,
    ["Faction: Spacing Guild"],
    "Guild Spy should carry its printed Spacing Guild trait for discard bonuses",
  );

  const spaceTimeNonGuildDiscard = { ...dagger, id: "space-time-non-guild-discard-card" };
  const spaceTimeNonGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spaceTimeNonGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spaceTimeNonGuildPlaced = turnActions.placeAgentAction(spaceTimeNonGuildFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Space-time Folding should queue discard-for-draw after Agent placement");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.ownerId, p2.id, "Space-time Folding discard choice should belong to the card player");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.drawCards, 1, "Space-time Folding should draw one card before its trait bonus");
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.optional, false, "Space-time Folding discard should be mandatory when a hand card remains");
  assert.equal(
    spaceTimeNonGuildPlaced.pendingAction?.bonusDraw?.requiredDiscardTrait,
    "Faction: Spacing Guild",
    "Space-time Folding should preserve its Spacing Guild bonus trait",
  );
  assert.equal(spaceTimeNonGuildPlaced.pendingAction?.bonusDraw?.drawCards, 1, "Space-time Folding should draw one bonus card");
  const spaceTimeMandatorySkipped = state.skipDiscardCardForDraw(spaceTimeNonGuildPlaced, spaceTimeNonGuildPlaced.pendingAction);
  assert.equal(
    spaceTimeMandatorySkipped.pendingAction,
    spaceTimeNonGuildPlaced.pendingAction,
    "Mandatory Space-time Folding discard should not be skippable",
  );
  const spaceTimeNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    spaceTimeNonGuildPlaced,
    spaceTimeNonGuildPlaced.pendingAction,
    spaceTimeNonGuildDiscard.id,
  );
  assert.equal(spaceTimeNonGuildResolved.pendingAction, undefined, "Resolving Space-time Folding should clear its pending action");
  const spaceTimeNonGuildOwner = playerById(spaceTimeNonGuildResolved, p2.id);
  assert.equal(spaceTimeNonGuildOwner.discard.at(-1).id, spaceTimeNonGuildDiscard.id, "Space-time Folding should discard the selected card");
  assert.ok(
    spaceTimeNonGuildOwner.hand.some((card) => card.id === spaceTimeDrawOne.id),
    "Space-time Folding should draw one card when the discarded card is not Spacing Guild",
  );
  assert.equal(
    spaceTimeNonGuildOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    false,
    "Space-time Folding should not draw the bonus card for non-Spacing Guild discards",
  );
  assert.match(spaceTimeNonGuildResolved.log[0], /Space-time Folding: discards .* and draws 1 card/);

  const spaceTimeGuildDiscard = { ...spaceTimeFolding, id: "space-time-guild-discard-card" };
  const spaceTimeGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
    discard: [],
    hand: [spaceTimeFolding, spaceTimeGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const spaceTimeGuildPlaced = turnActions.placeAgentAction(spaceTimeGuildFixture, {
    commanderTargets: {},
    selectedCard: spaceTimeFolding,
    selectedSpace: deliverSupplies,
  });
  assert.equal(spaceTimeGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Space-time Folding should queue the same pending action for Spacing Guild discards");
  const spaceTimeGuildResolved = state.resolveDiscardCardForDrawChoice(
    spaceTimeGuildPlaced,
    spaceTimeGuildPlaced.pendingAction,
    spaceTimeGuildDiscard.id,
  );
  const spaceTimeGuildOwner = playerById(spaceTimeGuildResolved, p2.id);
  assert.ok(
    spaceTimeGuildOwner.hand.some((card) => card.id === spaceTimeDrawOne.id) &&
      spaceTimeGuildOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    "Space-time Folding should draw two cards when discarding a Spacing Guild card",
  );
  assert.match(spaceTimeGuildResolved.log[0], /Space-time Folding: discards .* and draws 2 cards/);

  const spaceTimeGuildSpyDiscard = { ...guildSpy, id: "space-time-guild-spy-discard-card" };
  const spaceTimeGuildSpyPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [spaceTimeDrawOne, spaceTimeDrawTwo],
      discard: [],
      hand: [spaceTimeFolding, spaceTimeGuildSpyDiscard],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: spaceTimeFolding,
      selectedSpace: deliverSupplies,
    },
  );
  const spaceTimeGuildSpyResolved = state.resolveDiscardCardForDrawChoice(
    spaceTimeGuildSpyPlaced,
    spaceTimeGuildSpyPlaced.pendingAction,
    spaceTimeGuildSpyDiscard.id,
  );
  const spaceTimeGuildSpyOwner = playerById(spaceTimeGuildSpyResolved, p2.id);
  assert.ok(
    spaceTimeGuildSpyOwner.hand.some((card) => card.id === spaceTimeDrawOne.id) &&
      spaceTimeGuildSpyOwner.hand.some((card) => card.id === spaceTimeDrawTwo.id),
    "Space-time Folding should draw its bonus card when discarding Guild Spy",
  );
  assert.match(spaceTimeGuildSpyResolved.log[0], /Space-time Folding: discards Guild Spy and draws 2 cards/);

  const spaceTimeEmptyHandPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [spaceTimeDrawOne],
      discard: [],
      hand: [spaceTimeFolding],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: spaceTimeFolding,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(
    spaceTimeEmptyHandPlaced.pendingAction,
    undefined,
    "Space-time Folding should not queue a discard choice when no card remains in hand after placement",
  );
  const spaceTimeReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [spaceTimeFolding], highCouncilSeat: false },
    game,
  );
  assert.equal(spaceTimeReveal.persuasion, 1, "Space-time Folding should reveal for 1 persuasion through specs");

  const guildEnvoyNonGuildDiscard = { ...dagger, id: "guild-envoy-non-guild-discard-card" };
  const guildEnvoyDrawOne = { ...convincingArgument, id: "guild-envoy-draw-one-card" };
  const guildEnvoyDrawTwo = { ...convincingArgument, id: "guild-envoy-draw-two-card" };
  const guildEnvoyNonGuildPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
      discard: [],
      hand: [guildEnvoy, guildEnvoyNonGuildDiscard],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Guild Envoy should queue discard-for-draw after Agent placement");
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.drawCards, 0, "Guild Envoy should have no base draw");
  assert.equal(guildEnvoyNonGuildPlaced.pendingAction?.bonusDraw?.drawCards, 2, "Guild Envoy should draw two cards only from its bonus");
  const guildEnvoyNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildEnvoyNonGuildPlaced,
    guildEnvoyNonGuildPlaced.pendingAction,
    guildEnvoyNonGuildDiscard.id,
  );
  const guildEnvoyNonGuildOwner = playerById(guildEnvoyNonGuildResolved, p2.id);
  assert.equal(guildEnvoyNonGuildOwner.discard.at(-1).id, guildEnvoyNonGuildDiscard.id, "Guild Envoy should discard the selected card");
  assert.equal(
    guildEnvoyNonGuildOwner.hand.some((card) => card.id === guildEnvoyDrawOne.id || card.id === guildEnvoyDrawTwo.id),
    false,
    "Guild Envoy should draw no cards when the discarded card is not Spacing Guild",
  );
  assert.match(guildEnvoyNonGuildResolved.log[0], /Guild Envoy: discards .* and draws no cards/);

  const guildEnvoyGuildDiscard = { ...spaceTimeFolding, id: "guild-envoy-guild-discard-card" };
  const guildEnvoyGuildPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
      discard: [],
      hand: [guildEnvoy, guildEnvoyGuildDiscard],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  const guildEnvoyGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildEnvoyGuildPlaced,
    guildEnvoyGuildPlaced.pendingAction,
    guildEnvoyGuildDiscard.id,
  );
  const guildEnvoyGuildOwner = playerById(guildEnvoyGuildResolved, p2.id);
  assert.ok(
    guildEnvoyGuildOwner.hand.some((card) => card.id === guildEnvoyDrawOne.id) &&
      guildEnvoyGuildOwner.hand.some((card) => card.id === guildEnvoyDrawTwo.id),
    "Guild Envoy should draw two cards when discarding a Spacing Guild card",
  );
  assert.match(guildEnvoyGuildResolved.log[0], /Guild Envoy: discards .* and draws 2 cards/);

  const guildEnvoyEmptyHandPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [guildEnvoyDrawOne],
      discard: [],
      hand: [guildEnvoy],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(
    guildEnvoyEmptyHandPlaced.pendingAction,
    undefined,
    "Guild Envoy should not queue a discard choice when no card remains in hand after placement",
  );
  const guildEnvoyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [guildEnvoy], highCouncilSeat: false },
    game,
  );
  assert.equal(guildEnvoyReveal.persuasion, 1, "Guild Envoy should reveal for 1 persuasion through specs");

  const guildSpyNonGuildDiscard = { ...dagger, id: "guild-spy-non-guild-discard-card", traits: [] };
  const guildSpyDrawOne = { ...convincingArgument, id: "guild-spy-draw-one-card" };
  const guildSpyDrawTwo = { ...convincingArgument, id: "guild-spy-draw-two-card" };
  const guildSpyBoardIntrigue = { ...backedByChoam, id: "guild-spy-board-intrigue-card" };
  const guildSpyBonusIntrigue = { ...buyAccess, id: "guild-spy-bonus-intrigue-card" };
  const guildSpyNonGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [guildSpyDrawOne, guildSpyDrawTwo],
    discard: [],
    hand: [guildSpy, guildSpyNonGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const guildSpyNonGuildPlaced = turnActions.placeAgentAction(
    { ...guildSpyNonGuildFixture, intrigueDeck: [guildSpyBoardIntrigue, guildSpyBonusIntrigue], intrigueDiscard: [] },
    {
      commanderTargets: {},
      selectedCard: guildSpy,
      selectedSpace: secrets,
    },
  );
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.kind, "discard-card-for-draw", "Guild Spy should queue discard-for-draw after Agent placement");
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.drawCards, 1, "Guild Spy should draw one card before its trait bonus");
  assert.equal(
    guildSpyNonGuildPlaced.pendingAction?.bonusIntrigues?.requiredDiscardTrait,
    "Faction: Spacing Guild",
    "Guild Spy should preserve its Spacing Guild bonus Intrigue trait",
  );
  assert.equal(guildSpyNonGuildPlaced.pendingAction?.bonusIntrigues?.amount, 1, "Guild Spy should draw one bonus Intrigue");
  const guildSpyNonGuildIntriguesBefore = playerById(guildSpyNonGuildPlaced, p2.id).intrigues.length;
  const guildSpyNonGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildSpyNonGuildPlaced,
    guildSpyNonGuildPlaced.pendingAction,
    guildSpyNonGuildDiscard.id,
  );
  const guildSpyNonGuildOwner = playerById(guildSpyNonGuildResolved, p2.id);
  assert.equal(guildSpyNonGuildOwner.discard.at(-1).id, guildSpyNonGuildDiscard.id, "Guild Spy should discard the selected non-Guild card");
  assert.ok(
    guildSpyNonGuildOwner.hand.some((card) => card.id === guildSpyDrawOne.id),
    "Guild Spy should draw one card when the discarded card is not Spacing Guild",
  );
  assert.equal(
    guildSpyNonGuildOwner.hand.some((card) => card.id === guildSpyDrawTwo.id),
    false,
    "Guild Spy should not draw an extra card from its Intrigue bonus",
  );
  assert.equal(
    guildSpyNonGuildOwner.intrigues.length,
    guildSpyNonGuildIntriguesBefore,
    "Guild Spy should not add an Intrigue when the discarded card is not Spacing Guild",
  );
  assert.equal(
    guildSpyNonGuildOwner.intrigues.some((card) => card.id === guildSpyBonusIntrigue.id),
    false,
    "Guild Spy should not draw its bonus Intrigue when the discarded card is not Spacing Guild",
  );
  assert.match(guildSpyNonGuildResolved.log[0], /Guild Spy: discards .* and draws 1 card/);

  const guildSpyGuildDiscard = { ...spaceTimeFolding, id: "guild-spy-guild-discard-card" };
  const guildSpyGuildFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [guildSpyDrawOne, guildSpyDrawTwo],
    discard: [],
    hand: [guildSpy, guildSpyGuildDiscard],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const guildSpyGuildPlaced = turnActions.placeAgentAction(
    { ...guildSpyGuildFixture, intrigueDeck: [guildSpyBoardIntrigue, guildSpyBonusIntrigue], intrigueDiscard: [] },
    {
      commanderTargets: {},
      selectedCard: guildSpy,
      selectedSpace: secrets,
    },
  );
  const guildSpyGuildIntriguesBefore = playerById(guildSpyGuildPlaced, p2.id).intrigues.length;
  const guildSpyGuildResolved = state.resolveDiscardCardForDrawChoice(
    guildSpyGuildPlaced,
    guildSpyGuildPlaced.pendingAction,
    guildSpyGuildDiscard.id,
  );
  const guildSpyGuildOwner = playerById(guildSpyGuildResolved, p2.id);
  assert.ok(
    guildSpyGuildOwner.hand.some((card) => card.id === guildSpyDrawOne.id),
    "Guild Spy should draw its base card after discarding a Spacing Guild card",
  );
  assert.equal(
    guildSpyGuildOwner.hand.some((card) => card.id === guildSpyDrawTwo.id),
    false,
    "Guild Spy should not convert its Intrigue bonus into an extra card draw",
  );
  assert.ok(
    guildSpyGuildOwner.intrigues.some((card) => card.id === guildSpyBonusIntrigue.id),
    "Guild Spy should draw one Intrigue after discarding a Spacing Guild card",
  );
  assert.equal(guildSpyGuildOwner.intrigues.length, guildSpyGuildIntriguesBefore + 1);
  assert.match(guildSpyGuildResolved.log[0], /Guild Spy: discards .* and draws 1 card/);
  assert.match(guildSpyGuildResolved.log[1], /draws an Intrigue card from Guild Spy/);
  assert.equal(guildSpyGuildResolved.intrigueDeck.some((card) => card.id === guildSpyBonusIntrigue.id), false);
}
