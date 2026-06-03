import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecTrashIntrigueRewardValidation({
  boardSpaces,
  cards,
  fixtures,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { arrakeen, haggaBasin, imperialBasin, secrets } = boardSpaces;
  const {
    backedByChoam,
    branchingPath,
    buyAccess,
    intelligenceReport,
    junctionHeadquarters,
  } = cards;
  const { smugglersHavenConflict } = fixtures;
  const { p2, p3, p4, p6 } = players;

  const branchingPathTrashIntrigue = { ...backedByChoam, id: "branching-path-trash-intrigue-card" };
  const branchingPathBoardIntrigue = { ...intelligenceReport, id: "branching-path-board-intrigue-card" };
  const branchingPathRewardIntrigue = { ...buyAccess, id: "branching-path-reward-intrigue-card" };
  const branchingPathFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [branchingPath],
    intrigueDeck: [],
    intrigues: [branchingPathTrashIntrigue],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const branchingPathPlaced = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(branchingPathPlaced.pendingAction?.kind, "trash-intrigue-for-reward", "Branching Path should queue Intrigue trash with the Bene Gesserit Alliance");
  assert.equal(branchingPathPlaced.pendingAction?.drawIntrigues, 1, "Branching Path should draw one replacement Intrigue");
  assert.deepEqual(branchingPathPlaced.pendingAction?.gain, { spice: 2 }, "Branching Path should carry its 2-spice reward");
  assert.equal(branchingPathPlaced.pendingAction?.optional, true, "Branching Path Intrigue trash should be optional");
  const branchingPathResolved = state.resolveTrashIntrigueForRewardChoice(
    branchingPathPlaced,
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathOwner = playerById(branchingPathResolved, p2.id);
  assert.equal(
    branchingPathOwner.intrigues.some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should remove the trashed Intrigue from hand",
  );
  assert.ok(
    branchingPathOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw one Intrigue after trashing",
  );
  assert.equal(
    branchingPathResolved.intrigueDiscard.some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should remove the trashed Intrigue from the Intrigue draw cycle",
  );
  assert.equal(branchingPathOwner.resources.spice, 2, "Branching Path should gain 2 spice");
  assert.equal(
    branchingPathResolved.turnSpiceGains[p2.id],
    2,
    "Branching Path spice should count as turn spice gain",
  );
  assert.equal(branchingPathResolved.pendingAction, undefined, "Resolving Branching Path should clear its pending action");
  assert.match(branchingPathResolved.log[0], /Branching Path: trashes .* to draw 1 Intrigue card and gains 2 spice/);
  assert.match(branchingPathResolved.log[1], /draws an Intrigue card from Branching Path/);
  const branchingPathSkipped = state.skipTrashIntrigueForReward(branchingPathPlaced, branchingPathPlaced.pendingAction);
  const branchingPathSkippedOwner = playerById(branchingPathSkipped, p2.id);
  assert.ok(
    branchingPathSkippedOwner.intrigues.some((card) => card.id === branchingPathTrashIntrigue.id),
    "Skipping Branching Path should keep the selected Intrigue",
  );
  assert.ok(
    branchingPathSkippedOwner.intrigues.some((card) => card.id === branchingPathBoardIntrigue.id),
    "Skipping Branching Path should keep the Intrigue drawn from the board space",
  );
  assert.equal(branchingPathSkippedOwner.resources.spice, 0, "Skipping Branching Path should not gain spice");
  assert.equal(branchingPathSkipped.pendingAction, undefined, "Skipping Branching Path should clear its pending action");
  assert.match(branchingPathSkipped.log[0], /declines to trash an Intrigue for Branching Path/);
  const branchingPathDiscardDrawResolved = state.resolveTrashIntrigueForRewardChoice(
    {
      ...branchingPathPlaced,
      intrigueDeck: [],
      intrigueDiscard: [branchingPathRewardIntrigue],
    },
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathDiscardDrawOwner = playerById(branchingPathDiscardDrawResolved, p2.id);
  assert.ok(
    branchingPathDiscardDrawOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw its replacement Intrigue from the discard pile if the deck is empty",
  );
  assert.equal(
    [
      ...branchingPathDiscardDrawResolved.intrigueDeck,
      ...branchingPathDiscardDrawResolved.intrigueDiscard,
      ...branchingPathDiscardDrawOwner.intrigues,
    ].some((card) => card.id === branchingPathTrashIntrigue.id),
    false,
    "Branching Path should not recycle the trashed Intrigue through the deck, discard, or owner hand",
  );
  const branchingPathNoReplacementResolved = state.resolveTrashIntrigueForRewardChoice(
    {
      ...branchingPathPlaced,
      intrigueDeck: [],
      intrigueDiscard: [],
    },
    branchingPathPlaced.pendingAction,
    branchingPathTrashIntrigue.id,
  );
  const branchingPathNoReplacementOwner = playerById(branchingPathNoReplacementResolved, p2.id);
  assert.equal(branchingPathNoReplacementOwner.resources.spice, 2, "Branching Path should still gain spice without a replacement Intrigue");
  assert.equal(
    branchingPathNoReplacementOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    false,
    "Branching Path should not draw a missing replacement Intrigue",
  );
  assert.match(
    branchingPathNoReplacementResolved.log[0],
    /Branching Path: trashes .* but draws no Intrigue cards and gains 2 spice/,
    "Branching Path should log actual replacement Intrigue draws",
  );

  const branchingPathNoAlliance = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: {},
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathNoAlliance.pendingAction,
    undefined,
    "Branching Path should not queue its Intrigue-trash reward without the Bene Gesserit Alliance",
  );
  const branchingPathBoardIntrigueOnly = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
      players: branchingPathFixture.players.map((player) =>
        player.id === p2.id ? { ...player, intrigues: [] } : player
      ),
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathBoardIntrigueOnly.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Branching Path should queue when the selected board space draws an Intrigue to trash",
  );
  const branchingPathBoardIntrigueOwner = playerById(branchingPathBoardIntrigueOnly, p2.id);
  assert.ok(
    branchingPathBoardIntrigueOwner.intrigues.some((card) => card.id === branchingPathBoardIntrigue.id),
    "Branching Path should let the player choose the Intrigue drawn from Secrets",
  );
  const branchingPathBoardIntrigueResolved = state.resolveTrashIntrigueForRewardChoice(
    branchingPathBoardIntrigueOnly,
    branchingPathBoardIntrigueOnly.pendingAction,
    branchingPathBoardIntrigue.id,
  );
  const branchingPathBoardIntrigueResolvedOwner = playerById(branchingPathBoardIntrigueResolved, p2.id);
  assert.ok(
    branchingPathBoardIntrigueResolvedOwner.intrigues.some((card) => card.id === branchingPathRewardIntrigue.id),
    "Branching Path should draw a replacement after trashing the same-space Intrigue",
  );
  assert.equal(
    [
      ...branchingPathBoardIntrigueResolved.intrigueDeck,
      ...branchingPathBoardIntrigueResolved.intrigueDiscard,
      ...branchingPathBoardIntrigueResolvedOwner.intrigues,
    ].some((card) => card.id === branchingPathBoardIntrigue.id),
    false,
    "Branching Path should remove the same-space Intrigue from the draw cycle when it is trashed",
  );
  const branchingPathEmptyIntrigueSupply = turnActions.placeAgentAction(
    {
      ...branchingPathFixture,
      alliances: { bene: p2.id },
      intrigueDeck: [],
      intrigueDiscard: [],
      players: branchingPathFixture.players.map((player) => ({ ...player, intrigues: [] })),
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: secrets,
    },
  );
  assert.equal(
    branchingPathEmptyIntrigueSupply.pendingAction,
    undefined,
    "Branching Path should not queue when no starting or drawable same-space Intrigue exists",
  );
  const branchingPathNoIntrigueSource = {
    ...p2,
    hand: [],
    playArea: [branchingPath],
    intrigues: [],
  };
  const branchingPathNoIntriguePendings = state.pendingActionsForCard(
    branchingPath,
    branchingPathNoIntrigueSource,
    {
      ...game,
      alliances: { bene: p2.id },
      players: game.players.map((player) => player.id === p2.id ? branchingPathNoIntrigueSource : player),
    },
    p2,
    arrakeen,
  );
  assert.equal(
    branchingPathNoIntriguePendings.some((pending) => pending.kind === "trash-intrigue-for-reward"),
    false,
    "Branching Path should not queue without a starting or same-space Intrigue to trash",
  );

  const junctionTrashIntrigue = { ...backedByChoam, id: "junction-trash-intrigue-card" };
  const junctionFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [junctionHeadquarters],
    intrigues: [junctionTrashIntrigue],
    playArea: [],
    resources: { solari: 0, spice: 1, water: 0 },
    vp: 0,
  }));
  const junctionPlaced = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: { spacing: p2.id },
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionPlaced.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction Headquarters should queue Intrigue trash with the Spacing Guild Alliance and enough post-space spice",
  );
  assert.deepEqual(junctionPlaced.pendingAction?.cost, { spice: 2 }, "Junction Headquarters should carry its 2-spice cost");
  assert.equal(junctionPlaced.pendingAction?.drawIntrigues, 0, "Junction Headquarters should not draw a replacement Intrigue");
  assert.deepEqual(junctionPlaced.pendingAction?.gain, {}, "Junction Headquarters should not carry resource rewards");
  assert.equal(junctionPlaced.pendingAction?.gainVp, 1, "Junction Headquarters should carry its VP reward");
  assert.equal(junctionPlaced.pendingAction?.optional, true, "Junction Headquarters Intrigue trash should be optional");
  const junctionResolved = state.resolveTrashIntrigueForRewardChoice(
    junctionPlaced,
    junctionPlaced.pendingAction,
    junctionTrashIntrigue.id,
  );
  const junctionOwner = playerById(junctionResolved, p2.id);
  assert.equal(
    junctionOwner.intrigues.some((card) => card.id === junctionTrashIntrigue.id),
    false,
    "Junction Headquarters should remove the trashed Intrigue from hand",
  );
  assert.equal(junctionOwner.resources.spice, 0, "Junction Headquarters should spend the post-space 2 spice");
  assert.equal(junctionOwner.vp, 1, "Junction Headquarters should gain 1 VP");
  assert.equal(junctionResolved.turnSpiceGains[p2.id], 1, "Junction Headquarters should not erase the Imperial Basin spice gain");
  assert.equal(junctionResolved.pendingAction, undefined, "Resolving Junction Headquarters should clear its pending action");
  assert.match(junctionResolved.log[0], /Junction Headquarters: trashes .* and spends 2 spice and gains 1 VP/);
  const junctionNoAlliance = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionNoAlliance.pendingAction,
    undefined,
    "Junction Headquarters should not queue without the Spacing Guild Alliance",
  );
  const junctionNotEnoughSpice = turnActions.placeAgentAction(
    {
      ...junctionFixture,
      alliances: { spacing: p2.id },
      players: junctionFixture.players.map((player) =>
        player.id === p2.id ? { ...player, resources: { solari: 0, spice: 0, water: 0 } } : player
      ),
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionNotEnoughSpice.pendingAction,
    undefined,
    "Junction Headquarters should not queue when the owner cannot pay 2 spice after space rewards",
  );
  const junctionDeferredMakerTrashIntrigue = { ...backedByChoam, id: "junction-deferred-maker-trash-intrigue-card" };
  const junctionDeferredMakerFixture = withActivePlayer(game, p3.id, () => ({
    agentsReady: 1,
    garrison: 0,
    hand: [junctionHeadquarters],
    intrigues: [junctionDeferredMakerTrashIntrigue],
    makerHooks: true,
    playArea: [],
    resources: { solari: 0, spice: 1, water: 1 },
    vp: 0,
  }));
  const junctionDeferredMakerPlaced = turnActions.placeAgentAction(
    {
      ...junctionDeferredMakerFixture,
      alliances: { spacing: p3.id },
      conflict: smugglersHavenConflict,
      shieldWall: false,
      turnSpiceGains: {},
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: haggaBasin,
    },
  );
  assert.equal(
    junctionDeferredMakerPlaced.pendingAction?.kind,
    "maker-choice",
    "Junction Headquarters should queue Hagga Basin Maker choice before the costed Intrigue trash choice",
  );
  assert.equal(
    junctionDeferredMakerPlaced.pendingQueue[0]?.kind,
    "trash-intrigue-for-reward",
    "Junction Headquarters should count deferred Maker spice when checking its costed Intrigue trash payability",
  );
  assert.deepEqual(
    junctionDeferredMakerPlaced.pendingQueue[0]?.cost,
    { spice: 2 },
    "Junction deferred Maker pending should keep the printed 2-spice Junction cost",
  );
  const junctionDeferredMakerSpiceChosen = state.resolveMakerChoice(
    junctionDeferredMakerPlaced,
    junctionDeferredMakerPlaced.pendingAction,
    "spice",
  );
  assert.equal(
    junctionDeferredMakerSpiceChosen.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction deferred Maker choice should advance to the Intrigue trash pending after taking spice",
  );
  const junctionDeferredMakerResolved = state.resolveTrashIntrigueForRewardChoice(
    junctionDeferredMakerSpiceChosen,
    junctionDeferredMakerSpiceChosen.pendingAction,
    junctionDeferredMakerTrashIntrigue.id,
  );
  const junctionDeferredMakerOwner = playerById(junctionDeferredMakerResolved, p3.id);
  assert.equal(
    junctionDeferredMakerOwner.resources.spice,
    1,
    "Junction deferred Maker resolution should gain 2 Hagga spice and spend 2 Junction spice",
  );
  assert.equal(junctionDeferredMakerOwner.vp, 1, "Junction deferred Maker resolution should gain 1 VP");
  const junctionDeferredMakerSandwormChosen = state.resolveMakerChoice(
    junctionDeferredMakerPlaced,
    junctionDeferredMakerPlaced.pendingAction,
    "sandworms",
  );
  assert.equal(
    junctionDeferredMakerSandwormChosen.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Junction deferred Maker sandworm choice should still advance to the optional Intrigue trash pending",
  );
  assert.equal(
    state.canPayTrashIntrigueForReward(
      playerById(junctionDeferredMakerSandwormChosen, p3.id),
      junctionDeferredMakerSandwormChosen.pendingAction,
    ),
    false,
    "Junction deferred Maker sandworm choice should leave the costed Intrigue trash pending unpayable",
  );
  const junctionDeferredMakerUnpayableAttempt = state.resolveTrashIntrigueForRewardChoice(
    junctionDeferredMakerSandwormChosen,
    junctionDeferredMakerSandwormChosen.pendingAction,
    junctionDeferredMakerTrashIntrigue.id,
  );
  assert.strictEqual(
    junctionDeferredMakerUnpayableAttempt,
    junctionDeferredMakerSandwormChosen,
    "Resolving an unpayable Junction pending should not mutate game state",
  );
  const junctionDeferredMakerSkipped = state.skipTrashIntrigueForReward(
    junctionDeferredMakerSandwormChosen,
    junctionDeferredMakerSandwormChosen.pendingAction,
  );
  assert.equal(
    junctionDeferredMakerSkipped.pendingAction,
    undefined,
    "Skipping the unpayable optional Junction pending should advance the queue",
  );
  const junctionRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    garrison: 0,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionRevealPlan = turnActions.revealTurnPlan(playerById(junctionRevealFixture, p2.id), junctionRevealFixture);
  assert.equal(junctionRevealPlan.persuasion, 1, "Junction Headquarters should reveal for 1 persuasion");
  assert.equal(junctionRevealPlan.revealGain.water, 1, "Junction Headquarters should reveal for 1 water");
  assert.equal(junctionRevealPlan.recruitedTroops, 1, "Junction Headquarters should reveal for 1 recruited troop");
  const junctionRevealed = turnActions.revealTurnAction(junctionRevealFixture, {
    commanderTargets: {},
    revealPlan: junctionRevealPlan,
  });
  const junctionRevealOwner = playerById(junctionRevealed, p2.id);
  assert.equal(junctionRevealOwner.resources.water, 1, "Junction reveal should add its water");
  assert.equal(junctionRevealOwner.garrison, 1, "Junction reveal should recruit its troop");
  assert.equal(junctionRevealOwner.persuasion, 1, "Junction reveal should finalize its persuasion");
  assert.match(junctionRevealed.log[0], /reveals for 1 persuasion, 0 strength and gains 1 water and recruits 1 troop/);
  const junctionNoSupplyRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    deployedTroops: 0,
    garrison: 12,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    jessicaMemories: 0,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionNoSupplyRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionNoSupplyRevealFixture, p2.id),
    junctionNoSupplyRevealFixture,
  );
  assert.equal(
    junctionNoSupplyRevealPlan.recruitedTroops,
    1,
    "Junction Headquarters reveal plan should still expose its printed troop reward when supply is empty",
  );
  const junctionNoSupplyRevealed = turnActions.revealTurnAction(junctionNoSupplyRevealFixture, {
    commanderTargets: {},
    revealPlan: junctionNoSupplyRevealPlan,
  });
  assert.equal(
    playerById(junctionNoSupplyRevealed, p2.id).garrison,
    12,
    "Junction reveal should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    playerById(junctionNoSupplyRevealed, p2.id).resources.water,
    1,
    "Junction no-supply reveal should still add its water",
  );
  assert.equal(
    junctionNoSupplyRevealed.log[0].includes("recruits 1 troop"),
    false,
    "Junction no-supply reveal should not log an unplaced troop",
  );
  const junctionCommanderBaseRevealFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    garrison: 0,
    hand: [junctionHeadquarters],
    highCouncilSeat: false,
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const junctionCommanderRevealFixture = {
    ...junctionCommanderBaseRevealFixture,
    players: junctionCommanderBaseRevealFixture.players.map((player) =>
      player.id === p6.id ? { ...player, garrison: 0 } : player
    ),
  };
  const junctionCommanderRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionCommanderRevealFixture, p4.id),
    junctionCommanderRevealFixture,
  );
  const junctionCommanderRevealed = turnActions.revealTurnAction(junctionCommanderRevealFixture, {
    commanderTargets: { [p4.id]: p6.id },
    revealPlan: junctionCommanderRevealPlan,
  });
  assert.equal(
    playerById(junctionCommanderRevealed, p4.id).garrison,
    0,
    "Commander Junction reveal should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(junctionCommanderRevealed, p6.id).garrison,
    1,
    "Commander Junction reveal should recruit troops to the activated Ally",
  );
  assert.equal(
    playerById(junctionCommanderRevealed, p4.id).resources.water,
    1,
    "Commander Junction reveal should keep water on the Commander",
  );
  assert.ok(
    junctionCommanderRevealed.log[0].includes(`${p6.leader} recruits 1 troop`),
    "Commander Junction reveal log should name the activated Ally as the troop recipient",
  );
  const junctionCommanderNoSupplyRevealFixture = {
    ...junctionCommanderBaseRevealFixture,
    players: junctionCommanderBaseRevealFixture.players.map((player) =>
      player.id === p6.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player
    ),
  };
  const junctionCommanderNoSupplyRevealPlan = turnActions.revealTurnPlan(
    playerById(junctionCommanderNoSupplyRevealFixture, p4.id),
    junctionCommanderNoSupplyRevealFixture,
  );
  assert.equal(
    junctionCommanderNoSupplyRevealPlan.recruitedTroops,
    1,
    "Commander Junction reveal plan should still expose its activated-Ally troop reward when supply is empty",
  );
  const junctionCommanderNoSupplyRevealed = turnActions.revealTurnAction(junctionCommanderNoSupplyRevealFixture, {
    commanderTargets: { [p4.id]: p6.id },
    revealPlan: junctionCommanderNoSupplyRevealPlan,
  });
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p4.id).garrison,
    0,
    "Commander Junction no-supply reveal should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p6.id).garrison,
    12,
    "Commander Junction no-supply reveal should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    playerById(junctionCommanderNoSupplyRevealed, p4.id).resources.water,
    1,
    "Commander Junction no-supply reveal should keep water on the Commander",
  );
  assert.equal(
    junctionCommanderNoSupplyRevealed.log[0].includes(`${p6.leader} recruits 1 troop`),
    false,
    "Commander Junction no-supply reveal should not log an unplaced activated-Ally troop",
  );
}
