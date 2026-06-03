import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecBoardInfluenceValidation({
  boardSpaces,
  cards,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { dutifulService, highCouncil, secrets, shipping } = boardSpaces;
  const { dangerousRhetoric, overthrow, subversiveAdvisor } = cards;
  const { p2, p4 } = players;

  const dangerousRhetoricFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    influence: { ...p2.influence, bene: 1 },
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(dangerousRhetoric, playerById(dangerousRhetoricFixture, p2.id), dangerousRhetoricFixture),
    undefined,
    "Dangerous Rhetoric should only queue its Influence choice from play",
  );
  const dangerousRhetoricPlaced = turnActions.placeAgentAction(dangerousRhetoricFixture, {
    commanderTargets: {},
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(
    dangerousRhetoricPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Dangerous Rhetoric should queue a typed Influence choice",
  );
  assert.equal(dangerousRhetoricPlaced.pendingAction.source, "Dangerous Rhetoric");
  assert.equal(dangerousRhetoricPlaced.pendingAction.amount, 1);
  assert.equal(dangerousRhetoricPlaced.pendingAction.trashSource, true);
  assert.equal(dangerousRhetoricPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(dangerousRhetoricPlaced.pendingAction.cardId, dangerousRhetoric.id);
  assert.equal(dangerousRhetoricPlaced.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricPlaced, p2.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementSpaceId,
    highCouncil.id,
    "Dangerous Rhetoric should record the Agent placement space on the source card in play",
  );
  assert.deepEqual(
    dangerousRhetoricPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p2.id, faction: "spacing" },
      { ownerId: p2.id, faction: "bene" },
      { ownerId: p2.id, faction: "fringeWorlds" },
    ],
    "Ally Dangerous Rhetoric should offer main-board Influence choices",
  );
  const dangerousRhetoricResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricPlaced,
    dangerousRhetoricPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(dangerousRhetoricResolved.pendingAction, undefined);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).influence.bene, 2);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).vp, 1, "Dangerous Rhetoric should award Influence threshold VP");
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should trash itself after the Influence choice",
  );
  assert.match(dangerousRhetoricResolved.log[0], /gains 1 Bene Gesserit Influence from Dangerous Rhetoric/);
  const dangerousRhetoricStrippedTrashSourcePending = {
    ...dangerousRhetoricPlaced.pendingAction,
    trashSource: true,
    cardId: undefined,
    cardOwnerId: undefined,
  };
  const dangerousRhetoricStrippedTrashSourceState = {
    ...dangerousRhetoricPlaced,
    pendingAction: dangerousRhetoricStrippedTrashSourcePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricStrippedTrashSourceState,
      dangerousRhetoricStrippedTrashSourcePending,
      p2.id,
      "bene",
    ),
    dangerousRhetoricStrippedTrashSourceState,
    "Dangerous Rhetoric should reject trash-source pendings without source-card metadata",
  );
  const dangerousRhetoricStrippedSourceCardPending = {
    ...dangerousRhetoricPlaced.pendingAction,
    trashSource: undefined,
    cardId: undefined,
    cardOwnerId: undefined,
  };
  const dangerousRhetoricStrippedSourceCardState = {
    ...dangerousRhetoricPlaced,
    pendingAction: dangerousRhetoricStrippedSourceCardPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricStrippedSourceCardState,
      dangerousRhetoricStrippedSourceCardPending,
      p2.id,
      "bene",
    ),
    dangerousRhetoricStrippedSourceCardState,
    "Dangerous Rhetoric should reject metadata-stripped card Influence pendings",
  );
  const dangerousRhetoricShippingPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, (player) => ({
        agentsReady: 1,
        hand: [dangerousRhetoric],
        influence: { ...player.influence, bene: 0, emperor: 0, greatHouses: 0, spacing: 2 },
        playArea: [],
        resources: { solari: 0, spice: 3, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [shipping.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: dangerousRhetoric,
      selectedSpace: shipping,
    },
  );
  assert.equal(
    dangerousRhetoricShippingPlaced.pendingAction?.source,
    "Shipping",
    "Shipping board Influence should remain the active pending action before Dangerous Rhetoric",
  );
  assert.equal(dangerousRhetoricShippingPlaced.pendingAction?.sourceEffect, undefined);
  assert.equal(
    dangerousRhetoricShippingPlaced.pendingQueue[0]?.source,
    "Dangerous Rhetoric",
    "Dangerous Rhetoric should stay queued separately after Shipping's board Influence",
  );
  assert.equal(dangerousRhetoricShippingPlaced.pendingQueue[0]?.sourceEffect, "gain-influence-choice");
  assert.equal(dangerousRhetoricShippingPlaced.pendingQueue[0]?.amount, 1);
  const dangerousRhetoricShippingBoardResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricShippingPlaced,
    dangerousRhetoricShippingPlaced.pendingAction,
    p2.id,
    "greatHouses",
  );
  assert.equal(playerById(dangerousRhetoricShippingBoardResolved, p2.id).influence.greatHouses, 1);
  assert.equal(
    dangerousRhetoricShippingBoardResolved.pendingAction?.source,
    "Dangerous Rhetoric",
    "Resolving Shipping should advance to the separate Dangerous Rhetoric Influence choice",
  );
  assert.equal(dangerousRhetoricShippingBoardResolved.pendingAction?.amount, 1);
  const dangerousRhetoricShippingCardResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricShippingBoardResolved,
    dangerousRhetoricShippingBoardResolved.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(dangerousRhetoricShippingCardResolved, p2.id).influence.bene, 1);
  assert.equal(dangerousRhetoricShippingCardResolved.pendingAction, undefined);
  assert.equal(
    playerById(dangerousRhetoricShippingCardResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should still resolve and trash after a separate Shipping board Influence choice",
  );
  const dangerousRhetoricCommanderPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p4.id, () => ({
      agentsReady: 1,
      hand: [dangerousRhetoric],
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
    })),
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: dangerousRhetoric,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    dangerousRhetoricCommanderPlaced.pendingAction?.targetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric should lock the activated Ally target on the pending action",
  );
  assert.equal(dangerousRhetoricCommanderPlaced.pendingAction?.spaceId, highCouncil.id);
  const dangerousRhetoricCommanderSourceCard = playerById(dangerousRhetoricCommanderPlaced, p4.id).playArea.find(
    (card) => card.id === dangerousRhetoric.id,
  );
  assert.equal(
    dangerousRhetoricCommanderSourceCard?.agentPlacementTargetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric should record the activated Ally on the source card in play",
  );
  assert.deepEqual(
    dangerousRhetoricCommanderPlaced.pendingAction?.choices,
    [
      { ownerId: p4.id, faction: "emperor" },
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p2.id, faction: "spacing" },
      { ownerId: p2.id, faction: "bene" },
      { ownerId: p2.id, faction: "fringeWorlds" },
    ],
    "Commander Dangerous Rhetoric should route personal Influence to the Commander and main-board Influence to the activated Ally",
  );
  const alternateShaddamAlly = dangerousRhetoricCommanderPlaced.players.find((player) =>
    player.team === p4.team &&
    player.role === "Ally" &&
    player.id !== p2.id
  );
  assert.ok(alternateShaddamAlly, "Expected another Shaddam Ally for Dangerous Rhetoric routing hardening");
  const dangerousRhetoricForgedTargetPending = {
    ...dangerousRhetoricCommanderPlaced.pendingAction,
    choices: dangerousRhetoricCommanderPlaced.pendingAction.choices.map((choice) =>
      choice.ownerId === p2.id ? { ...choice, ownerId: alternateShaddamAlly.id } : choice,
    ),
  };
  const dangerousRhetoricForgedTargetState = {
    ...dangerousRhetoricCommanderPlaced,
    pendingAction: dangerousRhetoricForgedTargetPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricForgedTargetState,
      dangerousRhetoricForgedTargetPending,
      alternateShaddamAlly.id,
      "bene",
    ),
    dangerousRhetoricForgedTargetState,
    "Commander Dangerous Rhetoric should reject forged choices for a different same-team Ally",
  );
  const dangerousRhetoricForgedLockedTargetPending = {
    ...dangerousRhetoricForgedTargetPending,
    targetOwnerId: alternateShaddamAlly.id,
  };
  const dangerousRhetoricForgedLockedTargetState = {
    ...dangerousRhetoricCommanderPlaced,
    pendingAction: dangerousRhetoricForgedLockedTargetPending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      dangerousRhetoricForgedLockedTargetState,
      dangerousRhetoricForgedLockedTargetPending,
      alternateShaddamAlly.id,
      "bene",
    ),
    dangerousRhetoricForgedLockedTargetState,
    "Commander Dangerous Rhetoric should reject forged targetOwnerId values that disagree with the source card",
  );
  const overthrowFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [overthrow],
    influence: { ...p2.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(overthrow, playerById(overthrowFixture, p2.id), overthrowFixture),
    undefined,
    "Overthrow should only queue its board-space Influence bonus after its Agent placement is known",
  );
  const overthrowFactionPlaced = turnActions.placeAgentAction(
    {
      ...overthrowFixture,
      sharedSpyPosts: {},
      spyPosts: { [secrets.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: overthrow,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    playerById(overthrowFactionPlaced, p2.id).influence.bene,
    1,
    "Overthrow should keep the normal board-space Influence before its pending bonus resolves",
  );
  assert.equal(overthrowFactionPlaced.pendingAction?.kind, "board-influence-choice");
  assert.equal(overthrowFactionPlaced.pendingAction.source, "Overthrow");
  assert.equal(overthrowFactionPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(overthrowFactionPlaced.pendingAction.amount, 1);
  assert.equal(overthrowFactionPlaced.pendingAction.trashSource, undefined);
  assert.equal(overthrowFactionPlaced.pendingAction.cardId, overthrow.id);
  assert.equal(overthrowFactionPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(overthrowFactionPlaced.pendingAction.spaceId, secrets.id);
  assert.deepEqual(
    overthrowFactionPlaced.pendingAction.choices,
    [{ ownerId: p2.id, faction: "bene" }],
    "Ally Overthrow should only offer the current board-space Influence",
  );
  const overthrowForgedChoicePending = {
    ...overthrowFactionPlaced.pendingAction,
    choices: [
      ...overthrowFactionPlaced.pendingAction.choices,
      { ownerId: p2.id, faction: "spacing" },
    ],
  };
  const overthrowForgedChoiceState = {
    ...overthrowFactionPlaced,
    pendingAction: overthrowForgedChoicePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      overthrowForgedChoiceState,
      overthrowForgedChoicePending,
      p2.id,
      "spacing",
    ),
    overthrowForgedChoiceState,
    "Overthrow should reject forged off-space Influence choices",
  );
  const overthrowFactionResolved = state.resolveBoardInfluenceChoice(
    overthrowFactionPlaced,
    overthrowFactionPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(overthrowFactionResolved, p2.id).influence.bene, 2);
  assert.ok(
    playerById(overthrowFactionResolved, p2.id).vp > playerById(overthrowFactionPlaced, p2.id).vp,
    "Overthrow should resolve Influence threshold rewards after its bonus",
  );
  assert.equal(
    playerById(overthrowFactionResolved, p2.id).playArea.some((card) => card.id === overthrow.id),
    true,
    "Overthrow should remain in play after its board-space Influence bonus",
  );
  assert.match(overthrowFactionResolved.log[0], /gains 1 Bene Gesserit Influence from Overthrow/);
  const overthrowCommanderPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p4.id, () => ({
        agentsReady: 1,
        hand: [overthrow],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [dutifulService.id]: p4.id },
    },
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: overthrow,
      selectedSpace: dutifulService,
    },
  );
  assert.equal(
    overthrowCommanderPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Commander Overthrow should combine with the mapped board Influence choice",
  );
  assert.equal(overthrowCommanderPlaced.pendingAction.source, "Overthrow");
  assert.equal(overthrowCommanderPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(overthrowCommanderPlaced.pendingAction.amount, 2);
  assert.equal(overthrowCommanderPlaced.pendingAction.trashSource, undefined);
  assert.equal(overthrowCommanderPlaced.pendingAction.targetOwnerId, p2.id);
  assert.deepEqual(
    overthrowCommanderPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p4.id, faction: "emperor" },
    ],
    "Commander Overthrow should keep the normal mapped board-space choices but make the chosen one worth 2",
  );
  assert.equal(
    overthrowCommanderPlaced.pendingQueue.find((pending) =>
      pending.kind === "board-influence-choice" && pending.source === "Dutiful Service"
    ),
    undefined,
    "Overthrow should not leave the original 1-Influence board choice queued separately",
  );
  const overthrowCommanderResolved = state.resolveBoardInfluenceChoice(
    overthrowCommanderPlaced,
    overthrowCommanderPlaced.pendingAction,
    p4.id,
    "emperor",
  );
  assert.equal(playerById(overthrowCommanderResolved, p4.id).influence.emperor, 2);
  assert.equal(playerById(overthrowCommanderResolved, p2.id).influence.greatHouses, 0);
  assert.equal(
    playerById(overthrowCommanderResolved, p4.id).playArea.some((card) => card.id === overthrow.id),
    true,
    "Commander Overthrow should remain in play after resolving the combined Influence choice",
  );
  const subversiveNonFactionPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 10, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [highCouncil.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: subversiveAdvisor,
      selectedSpace: highCouncil,
    },
  );
  assert.equal(
    subversiveNonFactionPlaced.pendingAction,
    undefined,
    "Subversive Advisor should not queue its Influence bonus outside Faction board spaces",
  );
  assert.equal(
    playerById(subversiveNonFactionPlaced, p2.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    true,
    "Subversive Advisor should stay in play when its Faction-space condition is not met",
  );
  const subversiveFactionPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [secrets.id]: p2.id },
    },
    {
      commanderTargets: {},
      selectedCard: subversiveAdvisor,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    playerById(subversiveFactionPlaced, p2.id).influence.bene,
    1,
    "Subversive Advisor should keep the normal board-space Influence before its pending bonus resolves",
  );
  assert.equal(subversiveFactionPlaced.pendingAction?.kind, "board-influence-choice");
  assert.equal(subversiveFactionPlaced.pendingAction.source, "Subversive Advisor");
  assert.equal(subversiveFactionPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(subversiveFactionPlaced.pendingAction.amount, 1);
  assert.equal(subversiveFactionPlaced.pendingAction.trashSource, true);
  assert.equal(subversiveFactionPlaced.pendingAction.cardId, subversiveAdvisor.id);
  assert.equal(subversiveFactionPlaced.pendingAction.cardOwnerId, p2.id);
  assert.equal(subversiveFactionPlaced.pendingAction.spaceId, secrets.id);
  assert.deepEqual(
    subversiveFactionPlaced.pendingAction.choices,
    [{ ownerId: p2.id, faction: "bene" }],
    "Ally Subversive Advisor should only offer the current board-space Influence",
  );
  const subversiveForgedChoicePending = {
    ...subversiveFactionPlaced.pendingAction,
    choices: [
      ...subversiveFactionPlaced.pendingAction.choices,
      { ownerId: p2.id, faction: "spacing" },
    ],
  };
  const subversiveForgedChoiceState = {
    ...subversiveFactionPlaced,
    pendingAction: subversiveForgedChoicePending,
  };
  assert.equal(
    state.resolveBoardInfluenceChoice(
      subversiveForgedChoiceState,
      subversiveForgedChoicePending,
      p2.id,
      "spacing",
    ),
    subversiveForgedChoiceState,
    "Subversive Advisor should reject forged off-space Influence choices",
  );
  const subversiveFactionResolved = state.resolveBoardInfluenceChoice(
    subversiveFactionPlaced,
    subversiveFactionPlaced.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(subversiveFactionResolved, p2.id).influence.bene, 2);
  assert.ok(
    playerById(subversiveFactionResolved, p2.id).vp > playerById(subversiveFactionPlaced, p2.id).vp,
    "Subversive Advisor should resolve Influence threshold rewards after its bonus",
  );
  assert.equal(
    playerById(subversiveFactionResolved, p2.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    false,
    "Subversive Advisor should trash itself after the board-space Influence bonus",
  );
  assert.match(subversiveFactionResolved.log[0], /gains 1 Bene Gesserit Influence from Subversive Advisor/);
  const subversiveCommanderPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p4.id, () => ({
        agentsReady: 1,
        hand: [subversiveAdvisor],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      sharedSpyPosts: {},
      spyPosts: { [dutifulService.id]: p4.id },
    },
    {
      commanderTargets: { [p4.id]: p2.id },
      selectedCard: subversiveAdvisor,
      selectedSpace: dutifulService,
    },
  );
  assert.equal(
    subversiveCommanderPlaced.pendingAction?.kind,
    "board-influence-choice",
    "Commander Subversive Advisor should combine with the mapped board Influence choice",
  );
  assert.equal(subversiveCommanderPlaced.pendingAction.source, "Subversive Advisor");
  assert.equal(subversiveCommanderPlaced.pendingAction.sourceEffect, "gain-board-space-influence");
  assert.equal(subversiveCommanderPlaced.pendingAction.amount, 2);
  assert.equal(subversiveCommanderPlaced.pendingAction.trashSource, true);
  assert.equal(subversiveCommanderPlaced.pendingAction.targetOwnerId, p2.id);
  assert.deepEqual(
    subversiveCommanderPlaced.pendingAction.choices,
    [
      { ownerId: p2.id, faction: "greatHouses" },
      { ownerId: p4.id, faction: "emperor" },
    ],
    "Commander Subversive Advisor should keep the normal mapped board-space choices but make the chosen one worth 2",
  );
  assert.equal(
    subversiveCommanderPlaced.pendingQueue.find((pending) =>
      pending.kind === "board-influence-choice" && pending.source === "Dutiful Service"
    ),
    undefined,
    "Subversive Advisor should not leave the original 1-Influence board choice queued separately",
  );
  const subversiveCommanderResolved = state.resolveBoardInfluenceChoice(
    subversiveCommanderPlaced,
    subversiveCommanderPlaced.pendingAction,
    p4.id,
    "emperor",
  );
  assert.equal(playerById(subversiveCommanderResolved, p4.id).influence.emperor, 2);
  assert.equal(playerById(subversiveCommanderResolved, p2.id).influence.greatHouses, 0);
  assert.equal(
    playerById(subversiveCommanderResolved, p4.id).playArea.some((card) => card.id === subversiveAdvisor.id),
    false,
    "Commander Subversive Advisor should trash itself after resolving the combined Influence choice",
  );
}
