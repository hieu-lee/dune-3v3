import assert from "node:assert/strict";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";
export function verifyImperiumCardInfluenceDiscardEffects({
  cards,
  data,
  fixtures,
  game,
  playerIds,
  spaces,
  state,
  turnActions,
}) {
  const { capturedMentat, dangerousRhetoric, prepareTheWay } = cards;
  const { calculusTrashTarget, dune } = fixtures;
  const { allyId, commanderId, teammateId } = playerIds;
  const { carthag, highCouncil } = spaces;
  const treacherousManeuver = data.imperiumDeck.find((card) => card.name === "Treacherous Maneuver");
  const economicSupport = data.boardSpaces.find((space) => space.id === "economic-support");
  assert.ok(treacherousManeuver, "Imperium deck should include Treacherous Maneuver");
  assert.ok(economicSupport, "Economic Support should exist for Treacherous Maneuver coverage");
  const p2 = playerById(game, allyId);
  const p4 = playerById(game, commanderId);
  const p6 = playerById(game, teammateId);
  const capturedDiscardCard = { ...dune, id: "captured-mentat-discard-card" };
  const capturedDrawCard = {
    ...calculusTrashTarget,
    id: "captured-mentat-draw-card",
  };
  const capturedMentatIrulanIntrigue = {
    ...data.intrigueCards[0],
    id: "captured-mentat-irulan-birthright-intrigue",
  };
  const capturedMentatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [capturedDrawCard],
    discard: [],
    hand: [capturedMentat, capturedDiscardCard],
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 0,
      fremen: 0,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(
      capturedMentat,
      playerById(capturedMentatFixture, p2.id),
      capturedMentatFixture,
    ),
    undefined,
    "Captured Mentat should only queue from play",
  );
  const capturedMentatPlayed = turnActions.placeAgentAction(
    capturedMentatFixture,
    {
      commanderTargets: {},
      selectedCard: capturedMentat,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    capturedMentatPlayed.pendingAction?.kind,
    "discard-card-for-draw",
    "Captured Mentat should queue its Agent choice",
  );
  assert.equal(capturedMentatPlayed.pendingAction.ownerId, p2.id);
  assert.equal(capturedMentatPlayed.pendingAction.drawCards, 1);
  assert.equal(capturedMentatPlayed.pendingAction.drawIntrigues, 1);
  assert.equal(capturedMentatPlayed.pendingAction.optional, false);
  assert.deepEqual(
    state
      .discardCardForDrawChoices(
        playerById(capturedMentatPlayed, p2.id),
        capturedMentatPlayed.pendingAction,
      )
      .map((card) => card.id),
      [capturedDiscardCard.id],
    "Captured Mentat should discard from the remaining hand",
  );
  assert.equal(
    state.resolveDiscardCardForDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      "missing-card",
    ),
    capturedMentatPlayed,
    "Captured Mentat should reject missing discard cards",
  );
  const capturedMentatResolved =
    state.resolveDiscardCardForDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      capturedDiscardCard.id,
    );
  assert.equal(capturedMentatResolved.pendingAction, undefined);
  assert.deepEqual(
    playerById(capturedMentatResolved, p2.id).hand.map((card) => card.id),
    [capturedDrawCard.id],
  );
  assert.equal(
    playerById(capturedMentatResolved, p2.id).discard.at(-1).id,
    capturedDiscardCard.id,
  );
  assert.equal(playerById(capturedMentatResolved, p2.id).influence.bene, 0);
  assert.equal(playerById(capturedMentatResolved, p2.id).intrigues.length, 1);
  assert.ok(
    capturedMentatResolved.log.some((entry) =>
      /Captured Mentat: discards .* and draws 1 card/.test(entry),
    ),
  );
  const capturedMentatSkipped = state.skipDiscardCardForDraw(
    capturedMentatPlayed,
    capturedMentatPlayed.pendingAction,
  );
  assert.equal(
    capturedMentatSkipped,
    capturedMentatPlayed,
    "Captured Mentat discard is mandatory while a discard card is available",
  );
  const dangerousRhetoricFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    influence: { ...p2.influence, spacing: 1 },
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    vp: 0,
  }));
  const dangerousRhetoricPlayed = turnActions.placeAgentAction(
    dangerousRhetoricFixture,
    {
      commanderTargets: {},
      selectedCard: dangerousRhetoric,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    dangerousRhetoricPlayed.pendingAction?.kind,
    "board-influence-choice",
    "Dangerous Rhetoric should queue its Agent Influence choice",
  );
  assert.equal(
    dangerousRhetoricPlayed.pendingAction.source,
    "Dangerous Rhetoric",
  );
  assert.equal(dangerousRhetoricPlayed.pendingAction.trashSource, true);
  assert.equal(
    dangerousRhetoricPlayed.pendingAction.cardId,
    dangerousRhetoric.id,
  );
  assert.equal(dangerousRhetoricPlayed.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricPlayed, p2.id).playArea.find(
      (card) => card.id === dangerousRhetoric.id,
    )?.agentPlacementSpaceId,
    highCouncil.id,
    "Dangerous Rhetoric source card should record its Agent placement space",
  );
  assert.deepEqual(
    dangerousRhetoricPlayed.pendingAction.choices.map(
      (choice) => `${choice.ownerId}:${choice.faction}`,
    ),
    [
      `${p2.id}:greatHouses`,
      `${p2.id}:spacing`,
      `${p2.id}:bene`,
      `${p2.id}:fringeWorlds`,
    ],
    "Dangerous Rhetoric should offer main-board Influence tracks to an Ally",
  );
  const dangerousRhetoricResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricPlayed,
    dangerousRhetoricPlayed.pendingAction,
    p2.id,
    "spacing",
  );
  assert.equal(dangerousRhetoricResolved.pendingAction, undefined);
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).influence.spacing,
    2,
  );
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).vp, 1);
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).playArea.some(
      (card) => card.id === dangerousRhetoric.id,
    ),
    false,
    "Dangerous Rhetoric should trash itself after resolving",
  );
  assert.match(
    dangerousRhetoricResolved.log[0],
    /gains 1 Spacing Guild Influence from Dangerous Rhetoric/,
  );
  const treacherousTrashCard = {
    ...calculusTrashTarget,
    id: "treacherous-maneuver-emperor-trash-card",
  };
  const treacherousPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [treacherousManeuver, treacherousTrashCard],
      influence: {
        emperor: 0,
        spacing: 0,
        bene: 0,
        fremen: 0,
        greatHouses: 0,
        fringeWorlds: 0,
      },
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      vp: 0,
    })),
    {
      commanderTargets: {},
      selectedCard: treacherousManeuver,
      selectedSpace: economicSupport,
    },
  );
  assert.equal(treacherousPlaced.pendingAction?.kind, "trade");
  assert.equal(
    playerById(treacherousPlaced, p2.id).influence.greatHouses,
    1,
    "Economic Support should grant its printed Influence before Treacherous Maneuver resolves",
  );
  assert.equal(
    treacherousPlaced.pendingQueue[0]?.kind,
    "board-influence-choice",
    "Treacherous Maneuver should queue behind Economic Support's trade pending",
  );
  assert.equal(
    treacherousPlaced.pendingQueue[0].amount,
    1,
    "Treacherous Maneuver should add one extra Influence after the printed board-space Influence",
  );
  const treacherousReady = state.finishPendingAction(treacherousPlaced);
  assert.equal(treacherousReady.pendingAction?.kind, "board-influence-choice");
  assert.equal(
    treacherousReady.pendingAction.amount,
    1,
    "Treacherous Maneuver pending should only carry the extra Influence",
  );
  assert.equal(treacherousReady.pendingAction.source, "Treacherous Maneuver");
  assert.equal(treacherousReady.pendingAction.trashSource, true);
  assert.equal(
    treacherousReady.pendingAction.requiredHandTrashTrait,
    "Faction: Emperor",
  );
  const treacherousResolved = state.resolveBoardInfluenceChoice(
    treacherousReady,
    treacherousReady.pendingAction,
    p2.id,
    "greatHouses",
    treacherousTrashCard.id,
  );
  assert.equal(
    playerById(treacherousResolved, p2.id).influence.greatHouses,
    2,
    "Treacherous Maneuver should resolve as two total Influence, not three",
  );
  assert.equal(
    playerById(treacherousResolved, p2.id).playArea.some(
      (card) => card.id === treacherousManeuver.id,
    ),
    false,
    "Treacherous Maneuver should trash itself after resolution",
  );
  assert.equal(
    playerById(treacherousResolved, p2.id).hand.some(
      (card) => card.id === treacherousTrashCard.id,
    ),
    false,
    "Treacherous Maneuver should trash the selected Emperor hand card",
  );
  for (const malformedPending of [
    { ...dangerousRhetoricPlayed.pendingAction, source: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, source: "  " },
    { ...dangerousRhetoricPlayed.pendingAction, amount: 0 },
    { ...dangerousRhetoricPlayed.pendingAction, amount: Number.NaN },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: "true" },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      trashSource: true,
      cardId: undefined,
      cardOwnerId: undefined,
    },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      trashSource: undefined,
      cardId: undefined,
      cardOwnerId: undefined,
    },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      trashSource: true,
      cardId: undefined,
    },
    { ...dangerousRhetoricPlayed.pendingAction, targetOwnerId: p4.id },
    { ...dangerousRhetoricPlayed.pendingAction, choices: "bene" },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [null] },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      choices: [{ ownerId: p2.id, faction: "guild" }],
    },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      choices: [{ ownerId: 17, faction: "bene" }],
    },
    {
      ...dangerousRhetoricPlayed.pendingAction,
      choices: [{ ownerId: "missing-player", faction: "bene" }],
    },
  ]) {
    const malformedFixture = {
      ...dangerousRhetoricPlayed,
      pendingAction: malformedPending,
    };
    const malformedResolved = state.resolveBoardInfluenceChoice(
      malformedFixture,
      malformedPending,
      p2.id,
      "bene",
    );
    assert.equal(
      malformedResolved,
      malformedFixture,
      "Malformed board-influence-choice pendings should remain unresolved",
    );
  }
  const forgedBoardAmountPending = {
    kind: "board-influence-choice",
    source: "Forged Shipping",
    amount: 3,
    choices: [{ ownerId: p2.id, faction: "bene" }],
  };
  const forgedBoardAmountFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedBoardAmountPending,
  };
  const forgedBoardAmountResolved = state.resolveBoardInfluenceChoice(
    forgedBoardAmountFixture,
    forgedBoardAmountPending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardAmountResolved,
    forgedBoardAmountFixture,
    "Board-space Influence choices should not accept forged multi-Influence amounts without source-card metadata",
  );
  const forgedAmountBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    amount: 2,
  };
  const forgedAmountBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    {
      ...dangerousRhetoricPlayed,
      pendingAction: forgedAmountBoardInfluencePending,
    },
    forgedAmountBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedAmountBoardInfluenceResolved.pendingAction,
    forgedAmountBoardInfluencePending,
    "Board Influence choice resolution should reject active trash-source pendings whose amount is not backed by the source card spec",
  );
  const forgedSourceCard = {
    ...capturedDiscardCard,
    id: "forged-board-influence-source-card",
  };
  const forgedSourceBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    cardId: forgedSourceCard.id,
  };
  const forgedSourceBoardInfluenceFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedSourceBoardInfluencePending,
    players: dangerousRhetoricPlayed.players.map((player) =>
      player.id === p2.id
        ? { ...player, playArea: [forgedSourceCard] }
        : player,
    ),
  };
  const forgedSourceBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    forgedSourceBoardInfluenceFixture,
    forgedSourceBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedSourceBoardInfluenceResolved,
    forgedSourceBoardInfluenceFixture,
    "Board Influence choice resolution should reject active trash-source pendings whose card does not carry a matching typed effect",
  );
  const forgedBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    source: "Forged Dangerous Rhetoric",
  };
  const forgedBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    { ...dangerousRhetoricPlayed, pendingAction: undefined },
    forgedBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardInfluenceResolved.pendingAction,
    undefined,
    "Board Influence choice resolution should require the active pending object",
  );
  const dangerousRhetoricCommanderFixture = withActivePlayer(
    game,
    p4.id,
    () => ({
      agentsReady: 1,
      hand: [dangerousRhetoric],
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
    }),
  );
  const dangerousRhetoricCommanderPlayed = turnActions.placeAgentAction(
    dangerousRhetoricCommanderFixture,
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: dangerousRhetoric,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    dangerousRhetoricCommanderPlayed.pendingAction?.kind,
    "board-influence-choice",
  );
  assert.equal(
    dangerousRhetoricCommanderPlayed.pendingAction.targetOwnerId,
    p2.id,
  );
  assert.equal(
    dangerousRhetoricCommanderPlayed.pendingAction.spaceId,
    highCouncil.id,
  );
  assert.equal(
    playerById(dangerousRhetoricCommanderPlayed, p4.id).playArea.find(
      (card) => card.id === dangerousRhetoric.id,
    )?.agentPlacementTargetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric source card should record the activated Ally target",
  );
  assert.deepEqual(
    dangerousRhetoricCommanderPlayed.pendingAction.choices.map(
      (choice) => `${choice.ownerId}:${choice.faction}`,
    ),
    [
      `${p4.id}:emperor`,
      `${p2.id}:greatHouses`,
      `${p2.id}:spacing`,
      `${p2.id}:bene`,
      `${p2.id}:fringeWorlds`,
    ],
  );
  const dangerousRhetoricForgedAllyPending = {
    ...dangerousRhetoricCommanderPlayed.pendingAction,
    choices: dangerousRhetoricCommanderPlayed.pendingAction.choices.map(
      (choice) =>
        choice.ownerId === p2.id ? { ...choice, ownerId: p6.id } : choice,
    ),
  };
  const dangerousRhetoricForgedAllyFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedAllyPending,
  };
  const dangerousRhetoricForgedAllyResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricForgedAllyFixture,
    dangerousRhetoricForgedAllyPending,
    p6.id,
    "bene",
  );
  assert.equal(
    dangerousRhetoricForgedAllyResolved,
    dangerousRhetoricForgedAllyFixture,
    "Commander Dangerous Rhetoric should reject forged choices for a different same-team Ally",
  );
  const dangerousRhetoricForgedTargetOwnerPending = {
    ...dangerousRhetoricForgedAllyPending,
    targetOwnerId: p6.id,
  };
  const dangerousRhetoricForgedTargetOwnerFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedTargetOwnerPending,
  };
  const dangerousRhetoricForgedTargetOwnerResolved =
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricForgedTargetOwnerFixture,
      dangerousRhetoricForgedTargetOwnerPending,
      p6.id,
      "bene",
    );
  assert.equal(
    dangerousRhetoricForgedTargetOwnerResolved,
    dangerousRhetoricForgedTargetOwnerFixture,
    "Commander Dangerous Rhetoric should reject forged targetOwnerId values that disagree with the source card",
  );
  const capturedMentatNoDiscard = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [capturedDrawCard],
      discard: [],
      hand: [capturedMentat],
      playArea: [],
      resources: { solari: 6, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: capturedMentat,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    capturedMentatNoDiscard.pendingAction,
    undefined,
    "Captured Mentat should not pause without a card to discard",
  );
  const commanderCapturedDiscard = {
    ...dune,
    id: "commander-captured-mentat-discard-card",
  };
  const commanderCapturedDraw = {
    ...calculusTrashTarget,
    id: "commander-captured-mentat-draw-card",
  };
  const commanderCapturedBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderCapturedDraw],
    discard: [],
    hand: [capturedMentat, commanderCapturedDiscard],
    influence: { ...player.influence, emperor: 0, greatHouses: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  const commanderCapturedFixture = {
    ...commanderCapturedBase,
    players: commanderCapturedBase.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            influence: { ...player.influence, greatHouses: 0 },
            vp: 0,
          }
        : player,
    ),
  };
  const commanderCapturedPlayed = turnActions.placeAgentAction(
    commanderCapturedFixture,
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: capturedMentat,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(commanderCapturedPlayed.pendingAction?.kind, "discard-card-for-draw");
  assert.equal(
    commanderCapturedPlayed.pendingAction.ownerId,
    p4.id,
    "Commander Captured Mentat discard should stay with the acting player",
  );
  assert.deepEqual(
    state
      .discardCardForDrawChoices(
        playerById(commanderCapturedPlayed, p4.id),
        commanderCapturedPlayed.pendingAction,
      )
      .map((card) => card.id),
    [commanderCapturedDiscard.id],
    "Commander Captured Mentat should discard from the remaining hand",
  );
  const commanderCapturedResolved =
    state.resolveDiscardCardForDrawChoice(
      commanderCapturedPlayed,
      commanderCapturedPlayed.pendingAction,
      commanderCapturedDiscard.id,
    );
  assert.equal(
    playerById(commanderCapturedResolved, p2.id).influence.greatHouses,
    0,
  );
  assert.equal(
    playerById(commanderCapturedResolved, p4.id).influence.greatHouses,
    0,
  );
  assert.deepEqual(
    playerById(commanderCapturedResolved, p4.id).hand.map((card) => card.id),
    [commanderCapturedDraw.id],
  );
  assert.equal(
    playerById(commanderCapturedResolved, p4.id).intrigues.length,
    playerById(commanderCapturedPlayed, p4.id).intrigues.length + 1,
  );
  assert.equal(
    playerById(commanderCapturedResolved, p2.id).hand.length,
    playerById(commanderCapturedPlayed, p2.id).hand.length,
  );
  const capturedMentatRevealBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 2,
      fremen: 0,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const capturedMentatRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatRevealBase, p2.id),
    capturedMentatRevealBase,
  );
  assert.equal(
    capturedMentatRevealPlan.persuasion,
    1,
    "Captured Mentat should reveal for 1 persuasion",
  );
  const capturedMentatRevealed = turnActions.revealTurnAction(
    capturedMentatRevealBase,
    {
      commanderTargets: {},
      revealPlan: capturedMentatRevealPlan,
    },
  );
  assert.equal(
    capturedMentatRevealed.pendingAction?.kind,
    "lose-influence-for-influence",
  );
  assert.equal(capturedMentatRevealed.pendingAction?.loseAmount, 1);
  assert.equal(capturedMentatRevealed.pendingAction?.gainAmount, 1);
  assert.equal(capturedMentatRevealed.pendingAction?.optional, true);
  assert.deepEqual(
    state.influenceExchangeChoices(
      capturedMentatRevealed,
      capturedMentatRevealed.pendingAction,
    ),
    [
      {
        gainFaction: "greatHouses",
        gainOwnerId: p2.id,
        loseFaction: "bene",
        loseOwnerId: p2.id,
      },
      {
        gainFaction: "spacing",
        gainOwnerId: p2.id,
        loseFaction: "bene",
        loseOwnerId: p2.id,
      },
      {
        gainFaction: "fringeWorlds",
        gainOwnerId: p2.id,
        loseFaction: "bene",
        loseOwnerId: p2.id,
      },
    ],
    "Captured Mentat reveal should expose valid Influence exchange choices",
  );
  assert.equal(
    state.resolveLoseInfluenceForInfluenceChoice(
      capturedMentatRevealed,
      capturedMentatRevealed.pendingAction,
      {
        gainFaction: "spacing",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p2.id,
      },
    ),
    capturedMentatRevealed,
    "Captured Mentat reveal should reject Influence tracks the player cannot lose",
  );
  const capturedMentatRevealResolved =
    state.resolveLoseInfluenceForInfluenceChoice(
      capturedMentatRevealed,
      capturedMentatRevealed.pendingAction,
      {
        gainFaction: "spacing",
        gainOwnerId: p2.id,
        loseFaction: "bene",
        loseOwnerId: p2.id,
      },
    );
  assert.equal(capturedMentatRevealResolved.pendingAction, undefined);
  assert.equal(
    playerById(capturedMentatRevealResolved, p2.id).influence.bene,
    1,
  );
  assert.equal(
    playerById(capturedMentatRevealResolved, p2.id).influence.spacing,
    1,
  );
  assert.equal(
    playerById(capturedMentatRevealResolved, p2.id).vp,
    0,
    "Captured Mentat reveal should lose Influence threshold VP",
  );
  assert.equal(
    playerById(capturedMentatRevealResolved, p2.id).intrigues.length,
    0,
  );
  const capturedMentatRevealSkipped = state.skipLoseInfluenceForInfluence(
    capturedMentatRevealed,
    capturedMentatRevealed.pendingAction,
  );
  assert.equal(capturedMentatRevealSkipped.pendingAction, undefined);
  assert.equal(
    playerById(capturedMentatRevealSkipped, p2.id).influence.bene,
    2,
  );
  assert.equal(
    playerById(capturedMentatRevealSkipped, p2.id).intrigues.length,
    0,
  );
  const capturedMentatIrulanRevealBase = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      discard: [],
      hand: [capturedMentat],
      influence: {
        emperor: 0,
        spacing: 0,
        bene: 1,
        fremen: 0,
        greatHouses: 1,
        fringeWorlds: 0,
      },
      intrigues: [],
      leader: "Princess Irulan",
      playArea: [],
      persuasion: 0,
      resources: { solari: 0, spice: 0, water: 0 },
      vp: 0,
    })),
    intrigueDeck: [capturedMentatIrulanIntrigue],
    intrigueDiscard: [],
  };
  const capturedMentatIrulanRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatIrulanRevealBase, p2.id),
    capturedMentatIrulanRevealBase,
  );
  const capturedMentatIrulanRevealed = turnActions.revealTurnAction(
    capturedMentatIrulanRevealBase,
    {
      commanderTargets: {},
      revealPlan: capturedMentatIrulanRevealPlan,
    },
  );
  const capturedMentatIrulanResolved =
    state.resolveLoseInfluenceForInfluenceChoice(
      capturedMentatIrulanRevealed,
      capturedMentatIrulanRevealed.pendingAction,
      {
        gainFaction: "greatHouses",
        gainOwnerId: p2.id,
        loseFaction: "bene",
        loseOwnerId: p2.id,
      },
    );
  assert.equal(
    playerById(capturedMentatIrulanResolved, p2.id).influence.greatHouses,
    2,
    "Captured Mentat reveal should gain the chosen Influence before resolving leader rewards",
  );
  assert.equal(
    playerById(capturedMentatIrulanResolved, p2.id).intrigues.at(-1)?.id,
    capturedMentatIrulanIntrigue.id,
    "Captured Mentat reveal should resolve Irulan's threshold Intrigue reward from gained Influence",
  );
  const capturedMentatMargotRevealBase = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      discard: [],
      hand: [capturedMentat],
      influence: {
        emperor: 0,
        spacing: 1,
        bene: 1,
        fremen: 0,
        greatHouses: 0,
        fringeWorlds: 0,
      },
      intrigues: [],
      leader: "Lady Margot Fenring",
      playArea: [],
      persuasion: 0,
      resources: { solari: 0, spice: 0, water: 0 },
      vp: 0,
    })),
    turnSpiceGains: {},
  };
  const capturedMentatMargotRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatMargotRevealBase, p2.id),
    capturedMentatMargotRevealBase,
  );
  const capturedMentatMargotRevealed = turnActions.revealTurnAction(
    capturedMentatMargotRevealBase,
    {
      commanderTargets: {},
      revealPlan: capturedMentatMargotRevealPlan,
    },
  );
  const capturedMentatMargotResolved =
    state.resolveLoseInfluenceForInfluenceChoice(
      capturedMentatMargotRevealed,
      capturedMentatMargotRevealed.pendingAction,
      {
        gainFaction: "bene",
        gainOwnerId: p2.id,
        loseFaction: "spacing",
        loseOwnerId: p2.id,
      },
    );
  assert.equal(
    playerById(capturedMentatMargotResolved, p2.id).resources.spice,
    2,
    "Captured Mentat reveal should resolve Margot's Loyalty spice reward from gained Influence",
  );
  assert.equal(
    capturedMentatMargotResolved.turnSpiceGains[p2.id],
    2,
    "Captured Mentat reveal should record Margot's Loyalty spice as turn spice gain",
  );
  const commanderCapturedRevealBase = withActivePlayer(
    game,
    p4.id,
    (player) => ({
      agentsReady: 0,
      discard: [],
      hand: [capturedMentat],
      influence: { ...player.influence, emperor: 2, greatHouses: 0 },
      intrigues: [],
      playArea: [],
      persuasion: 0,
      resources: { solari: 0, spice: 0, water: 0 },
      vp: 1,
    }),
  );
  const commanderCapturedRevealFixture = {
    ...commanderCapturedRevealBase,
    players: commanderCapturedRevealBase.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            influence: { ...player.influence, greatHouses: 2 },
            vp: 1,
          }
        : player,
    ),
  };
  const commanderCapturedRevealPlan = turnActions.revealTurnPlan(
    playerById(commanderCapturedRevealFixture, p4.id),
    commanderCapturedRevealFixture,
  );
  const commanderCapturedRevealed = turnActions.revealTurnAction(
    commanderCapturedRevealFixture,
    {
      commanderTargets: { [p4.id]: p2.id },
      revealPlan: commanderCapturedRevealPlan,
    },
  );
  assert.equal(
    commanderCapturedRevealed.pendingAction?.kind,
    "lose-influence-for-influence",
  );
  assert.deepEqual(
    state.influenceExchangeChoices(
      commanderCapturedRevealed,
      commanderCapturedRevealed.pendingAction,
    ),
    [
      {
        gainFaction: "greatHouses",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p4.id,
      },
      {
        gainFaction: "spacing",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p4.id,
      },
      {
        gainFaction: "bene",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p4.id,
      },
      {
        gainFaction: "fringeWorlds",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p4.id,
      },
      {
        gainFaction: "emperor",
        gainOwnerId: p4.id,
        loseFaction: "greatHouses",
        loseOwnerId: p2.id,
      },
      {
        gainFaction: "spacing",
        gainOwnerId: p2.id,
        loseFaction: "greatHouses",
        loseOwnerId: p2.id,
      },
      {
        gainFaction: "bene",
        gainOwnerId: p2.id,
        loseFaction: "greatHouses",
        loseOwnerId: p2.id,
      },
      {
        gainFaction: "fringeWorlds",
        gainOwnerId: p2.id,
        loseFaction: "greatHouses",
        loseOwnerId: p2.id,
      },
    ],
    "Commander Captured Mentat reveal should exchange personal or selected Ally Influence through the selected Ally route",
  );
  const commanderCapturedRevealResolved =
    state.resolveLoseInfluenceForInfluenceChoice(
      commanderCapturedRevealed,
      commanderCapturedRevealed.pendingAction,
      {
        gainFaction: "greatHouses",
        gainOwnerId: p2.id,
        loseFaction: "emperor",
        loseOwnerId: p4.id,
      },
    );
  assert.equal(
    playerById(commanderCapturedRevealResolved, p4.id).influence.emperor,
    1,
  );
  assert.equal(
    playerById(commanderCapturedRevealResolved, p4.id).intrigues.length,
    0,
  );
  assert.equal(
    playerById(commanderCapturedRevealResolved, p2.id).influence.greatHouses,
    3,
  );
  assert.equal(
    playerById(commanderCapturedRevealResolved, p2.id).intrigues.length,
    playerById(commanderCapturedRevealed, p2.id).intrigues.length,
  );
  const commanderPrepareDrawCard = {
    ...calculusTrashTarget,
    id: "commander-prepare-way-draw-target",
  };
  const commanderPrepareBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderPrepareDrawCard],
    discard: [],
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderPrepareFixture = {
    ...commanderPrepareBase,
    players: commanderPrepareBase.players.map((player) => {
      if (player.id === p2.id)
        return {
          ...player,
          garrison: 0,
          hand: [],
          influence: { ...player.influence, bene: 0 },
        };
      if (player.id === "p6")
        return { ...player, influence: { ...player.influence, bene: 2 } };
      return player;
    }),
  };
  const commanderPrepared = turnActions.placeAgentAction(
    commanderPrepareFixture,
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: prepareTheWay,
      selectedSpace: carthag,
    },
  );
  assert.equal(
    playerById(commanderPrepared, p4.id).hand[0].id,
    commanderPrepareDrawCard.id,
    "Commander Prepare The Way should draw for the Commander through shared Bene Gesserit Influence",
  );
  assert.equal(
    playerById(commanderPrepared, p2.id).hand.length,
    0,
    "Activated Ally should not receive the drawn card",
  );
  assert.ok(
    commanderPrepared.log.some((entry) =>
      /Prepare The Way: draws 1 card/.test(entry),
    ),
  );
}
