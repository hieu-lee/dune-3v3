import assert from "node:assert/strict";

export function createCardChoiceDerivedStates({
  arrakeen, base, beneGesseritOperative, branchingPath, branchingPathBoardIntrigue, branchingPathRewardIntrigue,
  branchingPathTrashIntrigue, corrinthCity, corrinthCitySpace, corrinthDiscardOne, corrinthDiscardTwo, covertOperation,
  covertOperationDiscard, data, dangerousRhetoric, deliverSupplies, deliveryAgreement, desertSurvival,
  desertSurvivalOtherPlayCard, doubleAgent, ecologicalTestingStation, ecologicalTestingStationDrawOne, ecologicalTestingStationDrawTwo, guildEnvoy,
  guildEnvoyDiscard, guildEnvoyDrawOne, guildEnvoyDrawTwo, guildSpy, guildSpyBoardIntrigue, guildSpyBonusIntrigue,
  guildSpyDiscard, guildSpyDraw, haggaBasin, imperialBasin, inHighPlaces, inHighPlacesDrawCard,
  inHighPlacesOtherBeneCard, interstellarTrade, interstellarTradeReplacement, junctionHeadquarters, junctionTrashIntrigue, leverage,
  longLiveDiscarded, longLiveDrawn, longLiveRemaining, longLiveSpace, longLiveTheFighters, longLiveTrashed,
  ownerId, overthrow, priceIsNoObject, priceIsNoObjectAcquireCard, priceIsNoObjectBlockedCard, priceIsNoObjectReplacement,
  priorityContracts, priorityContractsSpace, seekAllies, seekAlliesOtherPlayCard, shishakli, shishakliDrawCard,
  shishakliExtraDeckCard, shishakliOtherPlayCard, spaceTimeFolding, spaceTimeFoldingDiscard, spaceTimeFoldingDrawOne, spaceTimeFoldingDrawTwo,
  spiceRefinery, spyNetwork, spyNetworkReplacement, spyPlaceAfterRecallSpace, spySpace, state,
  strikeFleet, strikeFleetArrakeenDraw, subversiveAdvisor, treadInDarkness, treadInDarknessDrawCard, treadInDarknessExtraDeckCard,
  treadInDarknessOtherBeneCard, turnActions, unprotectedConflict,
}) {
  const arrakeenPostId = state.spyObservationPostIdForSpace(arrakeen.id);
  const spyPostId = state.spyObservationPostIdForSpace(spySpace.id);
  const spyPlaceAfterRecallPostId = state.spyObservationPostIdForSpace(spyPlaceAfterRecallSpace.id);

  const beneGesseritOperativeAgentBase = {
    ...base,
    players: base.players.map((player) =>
      player.id === ownerId
        ? {
            ...player,
            agentsReady: 1,
            hand: [beneGesseritOperative],
            playArea: [],
            resources: { solari: 0, spice: 0, water: 0 },
            spies: 3,
          }
        : player,
    ),
  };
  const beneGesseritOperativeSpyState = turnActions.placeAgentAction(beneGesseritOperativeAgentBase, {
    commanderTargets: {},
    selectedCard: beneGesseritOperative,
    selectedSpace: spyPlaceAfterRecallSpace,
  });
  const beneGesseritOperativeRecallSpyState = turnActions.placeAgentAction(
    {
      ...beneGesseritOperativeAgentBase,
      spyPosts: { [spyPostId]: ownerId },
      players: beneGesseritOperativeAgentBase.players.map((player) =>
        player.id === ownerId ? { ...player, spies: 0 } : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: beneGesseritOperative,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  const inHighPlacesState = turnActions.placeAgentAction(
    {
      ...base,
      sharedSpyPosts: {},
      spyPosts: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [inHighPlacesDrawCard],
              discard: [],
              hand: [inHighPlaces],
              playArea: [inHighPlacesOtherBeneCard],
              resources: { solari: 0, spice: 0, water: 0 },
              spies: 2,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: inHighPlaces,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(
    inHighPlacesState.pendingAction?.kind,
    "spy",
    "Expected In High Places to queue spy placement",
  );
  assert.equal(inHighPlacesState.pendingAction.source, "In High Places");
  assert.equal(
    inHighPlacesState.players
      .find((player) => player.id === ownerId)
      ?.hand.some((card) => card.id === inHighPlacesDrawCard.id),
    true,
    "Expected In High Places to draw a card in the browser state",
  );
  const doubleAgentSharedSpyState = turnActions.placeAgentAction(
    {
      ...base,
      spyPosts: { [spyPostId]: ownerId, [spyPlaceAfterRecallPostId]: "p3" },
      sharedSpyPosts: {},
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              hand: [doubleAgent],
              playArea: [],
              resources: { solari: 6, spice: 0, water: 0 },
              spies: 2,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: doubleAgent,
      selectedSpace: spySpace,
    },
  );
  const spaceTimeFoldingState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [spaceTimeFoldingDrawOne, spaceTimeFoldingDrawTwo],
              discard: [],
              hand: [spaceTimeFolding, spaceTimeFoldingDiscard],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: spaceTimeFolding,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(spaceTimeFoldingState.pendingAction?.kind, "discard-card-for-draw", "Expected Space-time Folding discard-draw pending action");
  const guildEnvoyState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [guildEnvoyDrawOne, guildEnvoyDrawTwo],
              discard: [],
              hand: [guildEnvoy, guildEnvoyDiscard],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: guildEnvoy,
      selectedSpace: deliverSupplies,
    },
  );
  assert.equal(guildEnvoyState.pendingAction?.kind, "discard-card-for-draw", "Expected Guild Envoy discard-draw pending action");
  const guildSpyState = turnActions.placeAgentAction(
    {
      ...base,
      intrigueDeck: [guildSpyBoardIntrigue, guildSpyBonusIntrigue],
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [guildSpyDraw],
              discard: [],
              hand: [guildSpy, guildSpyDiscard],
              intrigues: [],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: guildSpy,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(guildSpyState.pendingAction?.kind, "discard-card-for-draw", "Expected Guild Spy discard-draw pending action");
  assert.equal(guildSpyState.pendingAction.bonusIntrigues?.amount, 1, "Expected Guild Spy Intrigue bonus in browser state");
  const corrinthCityState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              discard: [],
              hand: [corrinthCity, corrinthDiscardOne, corrinthDiscardTwo],
              playArea: [],
              resources: { solari: 5, spice: 0, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: corrinthCity,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.equal(corrinthCityState.pendingAction?.kind, "discard-cards-for-reward", "Expected Corrinth City discard-reward pending action");
  assert.equal(corrinthCityState.pendingAction.remaining, 2, "Expected Corrinth City to require two discards");
  const corrinthCityRevealBase = {
    ...base,
    players: base.players.map((player) =>
      player.id === ownerId
        ? {
            ...player,
            agentsReady: 0,
            discard: [],
            hand: [corrinthCity],
            highCouncilSeat: false,
            persuasion: 0,
            playArea: [],
            resources: { solari: 5, spice: 0, water: 0 },
            revealed: false,
          }
        : player,
    ),
  };
  const corrinthCityRevealPlan = turnActions.revealTurnPlan(
    corrinthCityRevealBase.players.find((player) => player.id === ownerId),
    corrinthCityRevealBase,
  );
  const corrinthCityHighCouncilState = turnActions.revealTurnAction(corrinthCityRevealBase, {
    commanderTargets: {},
    revealPlan: corrinthCityRevealPlan,
  });
  assert.equal(
    corrinthCityHighCouncilState.pendingAction?.kind,
    "pending-action-choice",
    "Expected Corrinth City Reveal to queue Solari or High Council branch choices",
  );
  assert.deepEqual(
    corrinthCityHighCouncilState.pendingAction.options.map((option) => option.id),
    ["solari", "high-council"],
    "Expected Corrinth City Reveal to offer Solari and High Council branches",
  );
  assert.equal(
    corrinthCityHighCouncilState.players.find((player) => player.id === ownerId)?.persuasion,
    0,
    "Expected Corrinth City Reveal to wait for a branch choice before adding persuasion",
  );
  const deliveryCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const deliveryAgreementRevealBase = {
    ...base,
    players: base.players.map((player) =>
      player.id === ownerId
        ? {
            ...player,
            contracts: deliveryCompletedContracts,
            discard: [],
            hand: [deliveryAgreement],
            highCouncilSeat: false,
            persuasion: 0,
            playArea: [],
            resources: { solari: 0, spice: 0, water: 0 },
            revealed: false,
            vp: 0,
          }
        : player,
    ),
  };
  const deliveryAgreementRevealPlan = turnActions.revealTurnPlan(
    deliveryAgreementRevealBase.players.find((player) => player.id === ownerId),
    deliveryAgreementRevealBase,
  );
  const deliveryAgreementRevealTrashState = turnActions.revealTurnAction(deliveryAgreementRevealBase, {
    commanderTargets: {},
    revealPlan: deliveryAgreementRevealPlan,
  });
  assert.equal(
    deliveryAgreementRevealTrashState.pendingAction?.kind,
    "pending-action-choice",
    "Expected Delivery Agreement Reveal to queue branch choices",
  );
  assert.deepEqual(
    deliveryAgreementRevealTrashState.pendingAction.options.map((option) => option.id),
    ["spice", "vp"],
    "Expected Delivery Agreement Reveal to offer spice or source-card trash",
  );
  assert.equal(
    deliveryAgreementRevealTrashState.players.find((player) => player.id === ownerId)?.resources.spice,
    0,
    "Expected Delivery Agreement Reveal to wait for a branch before gaining spice",
  );
  const longLiveTheFightersState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [longLiveDiscarded, longLiveDrawn, longLiveTrashed, longLiveRemaining],
              discard: [],
              hand: [longLiveTheFighters],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(
    longLiveTheFightersState.pendingAction?.kind,
    "top-deck-selection",
    "Expected Long Live the Fighters top-deck selection pending action",
  );
  assert.deepEqual(
    state.topDeckSelectionCards(
      longLiveTheFightersState.players.find((player) => player.id === ownerId),
      longLiveTheFightersState.pendingAction,
    ).map((card) => card.id),
    [longLiveDiscarded.id, longLiveDrawn.id, longLiveTrashed.id],
    "Expected Long Live browser state to expose top three deck cards",
  );
  assert.deepEqual(
    longLiveTheFightersState.players.find((player) => player.id === ownerId)?.deck.map((card) => card.id),
    [longLiveRemaining.id],
    "Expected Long Live browser state to reserve inspected top-deck cards",
  );
  const longLiveTheFightersAlternateState = {
    ...longLiveTheFightersState,
    pendingAction: {
      ...longLiveTheFightersState.pendingAction,
      inspectedCards: [longLiveDrawn, longLiveDiscarded, longLiveTrashed],
    },
  };
  const { inspectedCards: _longLiveBrowserInspectedCards, ...longLiveBrowserLegacyPendingAction } =
    longLiveTheFightersState.pendingAction;
  const longLiveTheFightersStaleState = {
    ...longLiveTheFightersState,
    pendingAction: longLiveBrowserLegacyPendingAction,
    players: longLiveTheFightersState.players.map((player) =>
      player.id === ownerId
        ? {
            ...player,
            deck: [longLiveDiscarded, longLiveDrawn],
            discard: [],
            hand: [],
            playArea: [longLiveTheFighters],
          }
        : player,
    ),
  };
  const branchingPathState = turnActions.placeAgentAction(
    {
      ...base,
      alliances: { ...base.alliances, bene: ownerId },
      intrigueDeck: [branchingPathBoardIntrigue, branchingPathRewardIntrigue],
      intrigueDiscard: [],
      turnSpiceGains: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              discard: [],
              hand: [branchingPath],
              intrigues: [branchingPathTrashIntrigue],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: branchingPath,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(
    branchingPathState.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Expected Branching Path Intrigue-trash pending action",
  );
  assert.equal(branchingPathState.pendingAction.drawIntrigues, 1, "Expected Branching Path replacement Intrigue reward");
  assert.equal(branchingPathState.pendingAction.gain.spice, 2, "Expected Branching Path spice reward");
  assert.equal(branchingPathState.pendingAction.optional, true, "Expected Branching Path Intrigue trash to be optional");
  const junctionHeadquartersState = turnActions.placeAgentAction(
    {
      ...base,
      alliances: { ...base.alliances, spacing: ownerId },
      turnSpiceGains: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              discard: [],
              garrison: 0,
              hand: [junctionHeadquarters],
              intrigues: [junctionTrashIntrigue],
              playArea: [],
              resources: { solari: 0, spice: 1, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    junctionHeadquartersState.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Expected Junction Headquarters Intrigue-trash pending action",
  );
  assert.deepEqual(junctionHeadquartersState.pendingAction.cost, { spice: 2 }, "Expected Junction Headquarters spice cost");
  assert.equal(junctionHeadquartersState.pendingAction.gainVp, 1, "Expected Junction Headquarters VP reward");
  assert.equal(junctionHeadquartersState.pendingAction.optional, true, "Expected Junction Headquarters Intrigue trash to be optional");
  const junctionNoPayTrashIntrigue = {
    ...junctionTrashIntrigue,
    id: "browser-junction-headquarters-no-pay-trash-intrigue",
  };
  const junctionNoPayPlaced = turnActions.placeAgentAction(
    {
      ...base,
      activeSeat: base.players.findIndex((player) => player.id === "p3"),
      alliances: { ...base.alliances, spacing: "p3" },
      conflict: unprotectedConflict,
      shieldWall: false,
      turnSpiceGains: {},
      players: base.players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              agentsReady: 1,
              discard: [],
              garrison: 0,
              hand: [junctionHeadquarters],
              intrigues: [junctionNoPayTrashIntrigue],
              makerHooks: true,
              playArea: [],
              resources: { solari: 0, spice: 1, water: 1 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: junctionHeadquarters,
      selectedSpace: haggaBasin,
    },
  );
  assert.equal(junctionNoPayPlaced.pendingAction?.kind, "maker-choice", "Expected Junction no-pay fixture to start with Maker choice");
  const junctionNoPayState = state.resolveMakerChoice(
    junctionNoPayPlaced,
    junctionNoPayPlaced.pendingAction,
    "sandworms",
  );
  assert.equal(
    junctionNoPayState.pendingAction?.kind,
    "trash-intrigue-for-reward",
    "Expected Junction no-pay fixture to advance to an unpayable Intrigue-trash pending",
  );
  const ecologicalTestingStationState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [ecologicalTestingStationDrawOne, ecologicalTestingStationDrawTwo],
              discard: [],
              garrison: 0,
              hand: [ecologicalTestingStation],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 2 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: ecologicalTestingStation,
      selectedSpace: spiceRefinery,
    },
  );
  assert.equal(
    ecologicalTestingStationState.pendingAction?.kind,
    "pay-resource-for-draw-cards",
    "Expected Ecological Testing Station resource-for-draw pending action",
  );
  const priceIsNoObjectAcquireState = turnActions.placeAgentAction(
    {
      ...base,
      imperiumRow: [priceIsNoObjectAcquireCard, priceIsNoObjectBlockedCard],
      marketDeck: [priceIsNoObjectReplacement],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              discard: [],
              hand: [priceIsNoObject],
              playArea: [],
              resources: { solari: priceIsNoObjectAcquireCard.cost, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: priceIsNoObject,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(
    priceIsNoObjectAcquireState.pendingAction?.kind,
    "acquire-card",
    "Expected Price is No Object Solari acquisition pending action",
  );
  const dangerousRhetoricState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              hand: [dangerousRhetoric],
              influence: { ...player.influence, bene: 1 },
              playArea: [],
              resources: { solari: 5, spice: 0, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: dangerousRhetoric,
      selectedSpace: spySpace,
    },
  );
  assert.equal(
    dangerousRhetoricState.pendingAction?.kind,
    "board-influence-choice",
    "Expected Dangerous Rhetoric Influence choice pending action",
  );
  const subversiveAdvisorState = turnActions.placeAgentAction(
    {
      ...base,
      sharedSpyPosts: {},
      spyPosts: { [spyPlaceAfterRecallPostId]: ownerId },
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              hand: [subversiveAdvisor],
              influence: { ...player.influence, bene: 0 },
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: subversiveAdvisor,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(
    subversiveAdvisorState.pendingAction?.kind,
    "board-influence-choice",
    "Expected Subversive Advisor board-space Influence pending action",
  );
  const overthrowState = turnActions.placeAgentAction(
    {
      ...base,
      sharedSpyPosts: {},
      spyPosts: { [spyPlaceAfterRecallPostId]: ownerId },
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              hand: [overthrow],
              influence: { ...player.influence, bene: 0 },
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: overthrow,
      selectedSpace: spyPlaceAfterRecallSpace,
    },
  );
  assert.equal(
    overthrowState.pendingAction?.kind,
    "board-influence-choice",
    "Expected Overthrow board-space Influence pending action",
  );
  const seekAlliesState = turnActions.placeAgentAction(
    {
      ...base,
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              garrison: 0,
              hand: [seekAllies],
              playArea: [seekAlliesOtherPlayCard],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: seekAllies,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.equal(
    seekAlliesState.pendingAction?.kind,
    "trash-card",
    "Expected Seek Allies source-trash pending action",
  );
  assert.equal(seekAlliesState.pendingAction.optional, false, "Seek Allies source trash should be mandatory");
  assert.equal(seekAlliesState.pendingAction.requiredCardId, seekAllies.id);
  assert.equal(seekAlliesState.pendingAction.requiredAgentPlacementSpaceId, corrinthCitySpace.id);
  assert.equal(seekAlliesState.pendingAction.requiredAgentPlacementTargetOwnerId, ownerId);
  const seekAlliesOwner = seekAlliesState.players.find((player) => player.id === ownerId);
  assert.ok(seekAlliesOwner, "Expected Seek Allies owner in browser debug state");
  assert.deepEqual(
    state.trashableCardsForPending(
      seekAlliesOwner,
      seekAlliesState.pendingAction,
    ).map(({ card }) => card.id),
    [seekAllies.id],
    "Seek Allies browser state should only offer its source card",
  );
  const desertSurvivalState = turnActions.placeAgentAction(
    {
      ...base,
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              garrison: 0,
              hand: [desertSurvival],
              playArea: [desertSurvivalOtherPlayCard],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: desertSurvival,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    desertSurvivalState.pendingAction?.kind,
    "trash-card",
    "Expected Desert Survival source-trash pending action",
  );
  assert.equal(desertSurvivalState.pendingAction.requiredCardId, desertSurvival.id);
  assert.equal(desertSurvivalState.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(desertSurvivalState.pendingAction.requiredAgentPlacementTargetOwnerId, ownerId);
  const desertSurvivalOwner = desertSurvivalState.players.find((player) => player.id === ownerId);
  assert.ok(desertSurvivalOwner, "Expected Desert Survival owner in browser debug state");
  assert.deepEqual(
    state.trashableCardsForPending(
      desertSurvivalOwner,
      desertSurvivalState.pendingAction,
    ).map(({ card }) => card.id),
    [desertSurvival.id],
    "Desert Survival browser state should only offer its source card",
  );
  const treadInDarknessState = turnActions.placeAgentAction(
    {
      ...base,
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [treadInDarknessDrawCard, treadInDarknessExtraDeckCard],
              discard: [],
              garrison: 0,
              hand: [treadInDarkness],
              playArea: [treadInDarknessOtherBeneCard],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: treadInDarkness,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    treadInDarknessState.pendingAction?.kind,
    "trash-card",
    "Expected Tread in Darkness source-trash draw pending action",
  );
  assert.equal(treadInDarknessState.pendingAction.requiredCardId, treadInDarkness.id);
  assert.equal(treadInDarknessState.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(treadInDarknessState.pendingAction.requiredAgentPlacementTargetOwnerId, ownerId);
  assert.equal(treadInDarknessState.pendingAction.drawCardsReward, 1);
  const treadInDarknessOwner = treadInDarknessState.players.find((player) => player.id === ownerId);
  assert.ok(treadInDarknessOwner, "Expected Tread in Darkness owner in browser debug state");
  assert.deepEqual(
    state.trashableCardsForPending(
      treadInDarknessOwner,
      treadInDarknessState.pendingAction,
    ).map(({ card }) => card.id),
    [treadInDarkness.id],
    "Tread in Darkness browser state should only offer its source card",
  );
  const shishakliState = turnActions.placeAgentAction(
    {
      ...base,
      spaces: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [shishakliDrawCard, shishakliExtraDeckCard],
              discard: [],
              garrison: 0,
              hand: [shishakli],
              playArea: [shishakliOtherPlayCard],
              resources: { solari: 0, spice: 0, water: 0 },
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: shishakli,
      selectedSpace: imperialBasin,
    },
  );
  assert.equal(
    shishakliState.pendingAction?.kind,
    "trash-card",
    "Expected Shishakli source-trash draw pending action",
  );
  assert.equal(shishakliState.pendingAction.requiredCardId, shishakli.id);
  assert.equal(shishakliState.pendingAction.requiredAgentPlacementSpaceId, imperialBasin.id);
  assert.equal(shishakliState.pendingAction.requiredAgentPlacementTargetOwnerId, ownerId);
  assert.equal(shishakliState.pendingAction.drawCardsReward, 1);
  const shishakliOwner = shishakliState.players.find((player) => player.id === ownerId);
  assert.ok(shishakliOwner, "Expected Shishakli owner in browser debug state");
  assert.deepEqual(
    state.trashableCardsForPending(
      shishakliOwner,
      shishakliState.pendingAction,
    ).map(({ card }) => card.id),
    [shishakli.id],
    "Shishakli browser state should only offer its source card",
  );
  const covertOperationOwner = base.players.find((player) => player.id === ownerId);
  assert.ok(covertOperationOwner, "Expected Covert Operation owner");
  const covertOperationSource = {
    ...covertOperationOwner,
    agentsReady: 0,
    hand: [],
    playArea: [covertOperation],
  };
  const covertOperationOpponent = base.players.find((player) => player.team !== covertOperationSource.team);
  assert.ok(covertOperationOpponent, "Expected an opposing player for Covert Operation");
  const covertOperationBase = {
    ...base,
    players: base.players.map((player) => {
      if (player.id === ownerId) return covertOperationSource;
      if (player.id === covertOperationOpponent.id) {
        return { ...player, discard: [], hand: [covertOperationDiscard] };
      }
      return player.team !== covertOperationSource.team ? { ...player, hand: [] } : player;
    }),
  };
  const covertOperationPendings = state.pendingActionsForCard(
    covertOperation,
    covertOperationSource,
    covertOperationBase,
  );
  assert.equal(covertOperationPendings.length, 1, "Expected one Covert Operation opponent discard pending action");
  assert.equal(covertOperationPendings[0].kind, "discard-hand-card", "Expected Covert Operation hand-discard pending action");
  const covertOperationState = {
    ...covertOperationBase,
    pendingAction: covertOperationPendings[0],
    pendingQueue: covertOperationPendings.slice(1),
  };
  const acquireSpyNetworkState = state.acquireMarketCard(
    {
      ...base,
      imperiumRow: [spyNetwork],
      marketDeck: [spyNetworkReplacement],
      spyPosts: {},
      sharedSpyPosts: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              discard: [],
              persuasion: spyNetwork.cost,
              revealed: true,
              spies: 1,
            }
          : player,
      ),
    },
    ownerId,
    spyNetwork.id,
  );
  assert.equal(
    acquireSpyNetworkState.pendingAction?.kind,
    "spy",
    "Expected Spy Network purchase to queue a spy placement pending action",
  );
  const acquireInterstellarTradeState = state.acquireMarketCard(
    {
      ...base,
      imperiumRow: [interstellarTrade],
      marketDeck: [interstellarTradeReplacement],
      spyPosts: {},
      sharedSpyPosts: {},
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              contracts: [],
              discard: [],
              influence: { ...player.influence, bene: 1 },
              persuasion: interstellarTrade.cost,
              revealed: true,
            }
          : player,
      ),
    },
    ownerId,
    interstellarTrade.id,
  );
  assert.equal(
    acquireInterstellarTradeState.pendingAction?.kind,
    "contract",
    "Expected Interstellar Trade purchase to queue a contract choice",
  );
  assert.deepEqual(
    acquireInterstellarTradeState.pendingQueue.map((pending) => pending.kind),
    [],
    "Expected Interstellar Trade purchase not to queue additional pending actions",
  );
  const priorityContractsState = turnActions.placeAgentAction(
    {
      ...base,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              contracts: [],
              hand: [priorityContracts],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
              vp: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.deepEqual(
    priorityContractsState.pendingAction,
    { kind: "contract", ownerId, source: "Priority Contracts", publicOnly: true },
    "Expected Priority Contracts Agent play to queue a public contract",
  );
  assert.equal(
    priorityContractsState.players.find((player) => player.id === ownerId)?.resources.spice,
    0,
    "Expected Priority Contracts Agent play not to grant Reveal spice",
  );
  assert.equal(
    priorityContractsState.players.find((player) => player.id === ownerId)?.vp,
    0,
    "Expected Priority Contracts Agent play not to grant Reveal VP",
  );
  const strikeFleetDeployState = turnActions.placeAgentAction(
    {
      ...base,
      sharedSpyPosts: {},
      spaces: {},
      spyPosts: { [arrakeenPostId]: ownerId },
      turnSpyRecalls: { [ownerId]: 1 },
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              agentsReady: 1,
              deck: [strikeFleetArrakeenDraw],
              deployedTroops: 0,
              discard: [],
              garrison: 0,
              hand: [strikeFleet],
              playArea: [],
              resources: { solari: 0, spice: 0, water: 0 },
              spies: 0,
            }
          : player,
      ),
    },
    {
      commanderTargets: {},
      selectedCard: strikeFleet,
      selectedSpace: arrakeen,
    },
  );
  assert.equal(strikeFleetDeployState.pendingAction?.kind, "deploy", "Expected Strike Fleet Arrakeen to queue deploy pending");
  assert.equal(strikeFleetDeployState.pendingAction.remaining, 4, "Expected Strike Fleet plus Arrakeen to make four troops deployable");
  assert.equal(
    strikeFleetDeployState.players.find((player) => player.id === ownerId)?.garrison,
    4,
    "Expected Strike Fleet to combine its three recruits with Arrakeen's troop",
  );
  const contractOptionalState = state.playLeveragePlotIntrigue(
    {
      ...base,
      turnSpiceGains: { [ownerId]: 1 },
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              contracts: [],
              intrigues: [leverage],
              resources: { ...player.resources, solari: 0 },
            }
          : { ...player, intrigues: [] },
      ),
    },
    ownerId,
    leverage.id,
  );
  assert.deepEqual(
    contractOptionalState.pendingAction,
    { kind: "contract", ownerId, source: "Leverage", publicOnly: true, optional: true },
    "Expected Leverage to queue an optional public contract pending action",
  );

  return {
    acquireInterstellarTradeState, acquireSpyNetworkState, beneGesseritOperativeRecallSpyState, beneGesseritOperativeSpyState, branchingPathState,
    contractOptionalState, corrinthCityHighCouncilState, corrinthCityState, covertOperationOpponent, covertOperationState,
    dangerousRhetoricState, deliveryAgreementRevealTrashState, desertSurvivalState, doubleAgentSharedSpyState, ecologicalTestingStationState,
    guildEnvoyState, guildSpyState, inHighPlacesState, junctionHeadquartersState, junctionNoPayState,
    junctionNoPayTrashIntrigue, longLiveTheFightersAlternateState, longLiveTheFightersStaleState, longLiveTheFightersState, overthrowState,
    priceIsNoObjectAcquireState, priorityContractsState, seekAlliesState, shishakliState, spaceTimeFoldingState,
    strikeFleetDeployState, subversiveAdvisorState, treadInDarknessState,
  };
}
