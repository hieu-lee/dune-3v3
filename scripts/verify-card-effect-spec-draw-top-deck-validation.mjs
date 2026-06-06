import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecDrawTopDeckValidation({
  cards,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const {
    convincingArgument,
    dagger,
    imperialSpymaster,
    leadership,
    longLiveTheFighters,
    maulaPistol,
    prepareTheWay,
    reconnaissance,
    sardaukarSoldier,
    theacherousManeuver,
  } = cards;
  const { p2 } = players;
  const prepareDrawSource = {
    ...p2,
    deck: [{ ...dagger, id: "prepare-the-way-draw-fixture" }],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 2 },
  };
  const prepared = state.applyCardAgentEffect(
    prepareTheWay,
    prepareDrawSource,
    prepareDrawSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? prepareDrawSource : player) },
  );
  assert.equal(prepared.source.hand.length, 1, "Prepare The Way Agent spec should draw at 2 Bene Gesserit Influence");
  assert.match(prepared.log ?? "", /Prepare The Way: draws 1 card/);
  const unpreparedSource = { ...prepareDrawSource, deck: [{ ...dagger, id: "prepare-the-way-blocked-draw-fixture" }], influence: p2.influence };
  const unprepared = state.applyCardAgentEffect(
    prepareTheWay,
    unpreparedSource,
    unpreparedSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? unpreparedSource : player) },
  );
  assert.equal(unprepared.source.hand.length, 0, "Prepare The Way Agent spec should not draw below 2 Bene Gesserit Influence");
  assert.equal(unprepared.log, undefined, "Prepare The Way Agent spec should not log below its Influence threshold");

  const maulaDraw = { ...dagger, id: "maula-pistol-agent-draw-fixture" };
  const maulaPistolEffect = state.applyCardAgentEffect(
    maulaPistol,
    { ...p2, deck: [maulaDraw], discard: [], hand: [] },
    p2,
  );
  assert.equal(maulaPistolEffect.source.hand[0]?.id, maulaDraw.id, "Maula Pistol Agent spec should draw 1 card");
  assert.match(maulaPistolEffect.log ?? "", /Maula Pistol: draws 1 card/);

  const leadershipDraw = { ...dagger, id: "leadership-agent-draw-fixture" };
  const leadershipSource = { ...p2, deck: [leadershipDraw], discard: [], deployedSandworms: 1, hand: [] };
  const leadershipEffect = state.applyCardAgentEffect(
    leadership,
    leadershipSource,
    leadershipSource,
    game,
  );
  assert.equal(leadershipEffect.source.hand[0]?.id, leadershipDraw.id, "Leadership Agent spec should draw 1 card");
  assert.match(leadershipEffect.log ?? "", /Leadership: draws 1 card/);

  const longLiveDraw = { ...dagger, id: "long-live-draw-card", name: "Long Live Draw" };
  const longLiveDiscard = { ...convincingArgument, id: "long-live-discard-card", name: "Long Live Discard" };
  const longLiveTrash = { ...reconnaissance, id: "long-live-trash-card", name: "Long Live Trash" };
  const longLiveFourth = { ...dagger, id: "long-live-fourth-card", name: "Long Live Fourth" };
  const longLiveSpace = {
    id: "long-live-test-space",
    name: "Long Live Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const longLivePlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard, longLiveTrash, longLiveFourth],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(longLivePlaced.pendingAction?.kind, "top-deck-selection", "Long Live the Fighters should queue top-deck selection after Agent placement");
  assert.equal(longLivePlaced.pendingAction.ownerId, p2.id);
  assert.equal(longLivePlaced.pendingAction.source, "Long Live the Fighters");
  assert.equal(longLivePlaced.pendingAction.lookCards, 3);
  assert.equal(longLivePlaced.pendingAction.drawCards, 1);
  assert.equal(longLivePlaced.pendingAction.discardCards, 1);
  assert.equal(longLivePlaced.pendingAction.trashCards, 1);
  assert.deepEqual(
    state.topDeckSelectionCards(playerById(longLivePlaced, p2.id), longLivePlaced.pendingAction).map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should inspect the top three cards only",
  );
  assert.deepEqual(
    longLivePlaced.pendingAction.inspectedCards.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should reserve the inspected cards in the pending action",
  );
  assert.deepEqual(
    playerById(longLivePlaced, p2.id).deck.map((card) => card.id),
    [longLiveFourth.id],
    "Long Live the Fighters should remove reserved inspected cards from the draw deck while pending",
  );
  const longLiveInvalidChoice = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 0, discardIndex: 0, trashIndex: 2 },
  );
  assert.equal(
    longLiveInvalidChoice,
    longLivePlaced,
    "Long Live the Fighters should reject duplicate top-deck assignments",
  );
  assert.equal(
    state.skipTopDeckSelectionChoice(longLivePlaced, longLivePlaced.pendingAction),
    longLivePlaced,
    "Long Live the Fighters should not skip while the top-deck selection is still resolvable",
  );
  const { inspectedCards: _longLiveInspectedCards, ...longLiveLegacyPendingAction } = longLivePlaced.pendingAction;
  const longLiveStalePendingState = {
    ...longLivePlaced,
    pendingAction: longLiveLegacyPendingAction,
    players: longLivePlaced.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [longLiveDraw, longLiveDiscard],
            discard: [],
            hand: [],
            playArea: [longLiveTheFighters],
          }
        : player,
    ),
  };
  const longLiveStaleSkipped = state.skipTopDeckSelectionChoice(
    longLiveStalePendingState,
    longLiveStalePendingState.pendingAction,
  );
  assert.equal(
    longLiveStaleSkipped.pendingAction,
    undefined,
    "Long Live the Fighters should skip a stale top-deck selection when fewer than three cards remain",
  );
  assert.deepEqual(
    playerById(longLiveStaleSkipped, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters stale skip should preserve remaining deck cards",
  );
  assert.match(
    longLiveStaleSkipped.log[0],
    /cannot resolve Long Live the Fighters: fewer than 3 cards remain in deck\./,
  );
  const longLiveResolved = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 1, discardIndex: 0, trashIndex: 2 },
  );
  assert.equal(longLiveResolved.pendingAction, undefined, "Resolving Long Live the Fighters should clear its pending action");
  const longLiveOwner = playerById(longLiveResolved, p2.id);
  assert.ok(longLiveOwner.hand.some((card) => card.id === longLiveDiscard.id), "Long Live the Fighters should draw the selected top-deck card");
  assert.equal(longLiveOwner.discard.at(-1)?.id, longLiveDraw.id, "Long Live the Fighters should discard the selected top-deck card");
  assert.deepEqual(longLiveOwner.deck.map((card) => card.id), [longLiveFourth.id], "Long Live the Fighters should remove all inspected cards from deck");
  assert.equal(
    [...longLiveOwner.hand, ...longLiveOwner.discard, ...longLiveOwner.deck, ...longLiveOwner.playArea].some((card) => card.id === longLiveTrash.id),
    false,
    "Long Live the Fighters should trash the selected top-deck card",
  );
  assert.match(
    longLiveResolved.log[0],
    /resolves Long Live the Fighters: draws 1 card, discards Long Live Draw, and trashes Long Live Trash\./,
  );
  const sardaukarTriggerIntrigue = game.intrigueDeck[0];
  assert.ok(sardaukarTriggerIntrigue, "Long Live Sardaukar trigger fixture should have an Intrigue to draw");
  const longLiveSardaukarTrash = { ...sardaukarSoldier, id: "long-live-sardaukar-trash-card" };
  const longLiveSardaukarPlaced = turnActions.placeAgentAction(
    withActivePlayer(
      { ...game, intrigueDeck: [sardaukarTriggerIntrigue], intrigueDiscard: [] },
      p2.id,
      () => ({
        agentsReady: 1,
        deck: [
          { ...dagger, id: "long-live-sardaukar-draw-card", name: "Long Live Sardaukar Draw" },
          { ...convincingArgument, id: "long-live-sardaukar-discard-card", name: "Long Live Sardaukar Discard" },
          longLiveSardaukarTrash,
          { ...dagger, id: "long-live-sardaukar-fourth-card", name: "Long Live Sardaukar Fourth" },
        ],
        discard: [],
        hand: [longLiveTheFighters],
        intrigues: [],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      }),
    ),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  const longLiveSardaukarResolved = state.resolveTopDeckSelectionChoice(
    longLiveSardaukarPlaced,
    longLiveSardaukarPlaced.pendingAction,
    { drawIndex: 0, discardIndex: 1, trashIndex: 2 },
  );
  assert.equal(
    playerById(longLiveSardaukarResolved, p2.id).intrigues.at(-1)?.id,
    sardaukarTriggerIntrigue.id,
    "Trashing Sardaukar Soldier from Long Live the Fighters should draw 1 Intrigue",
  );
  assert.match(
    longLiveSardaukarResolved.log.join("\n"),
    /draws an Intrigue card from Sardaukar Soldier/,
  );
  const longLiveShortDeckPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(
    longLiveShortDeckPlaced.pendingAction,
    undefined,
    "Long Live the Fighters should not queue top-deck selection with fewer than three deck cards",
  );
  assert.deepEqual(
    playerById(longLiveShortDeckPlaced, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters should leave short decks unchanged",
  );

  const imperialSpymasterEffect = state.applyCardAgentEffect(
    imperialSpymaster,
    p2,
    p2,
    { ...game, turnSpyRecalls: { ...game.turnSpyRecalls, [p2.id]: 1 } },
  );
  assert.equal(imperialSpymasterEffect.sourceIntriguesToDraw, 1, "Imperial Spymaster Agent spec should draw 1 Intrigue after a spy recall");
  assert.ok(
    sardaukarSoldier.effects?.some(
      (spec) =>
        spec.trigger === "trash" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-intrigues" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Sardaukar Soldier should draw 1 Intrigue from a trash-trigger spec",
  );
}
