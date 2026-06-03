import assert from "node:assert/strict";
import { createCardChoiceDerivedStates } from "./browser-debug-card-choice-derived-states.mjs";

export async function createCardChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const game = initialPlayableGame(state);
  const ownerId = "p2";
  const activeSeat = game.players.findIndex((player) => player.id === ownerId);
  assert.ok(activeSeat >= 0, "Expected p2 in browser debug game");
  assert.ok(game.contractOffer[0], "Expected at least one public contract");
  assert.ok(game.imperiumRow[0], "Expected at least one Imperium Row card");
  const prepareTheWay = game.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Expected Prepare The Way reserve card");
  const spyNetwork = data.imperiumDeck.find((card) => card.sourceId === 25);
  assert.ok(spyNetwork, "Expected Spy Network Imperium card");
  const spyNetworkReplacement = data.imperiumDeck.find((card) => card.id !== spyNetwork.id);
  assert.ok(spyNetworkReplacement, "Expected Spy Network replacement card");
  const interstellarTrade = data.imperiumDeck.find((card) => card.sourceId === 184);
  assert.ok(interstellarTrade, "Expected Interstellar Trade Imperium card");
  const interstellarTradeReplacement = data.imperiumDeck.find((card) => card.id !== interstellarTrade.id);
  assert.ok(interstellarTradeReplacement, "Expected Interstellar Trade replacement card");
  const priorityContracts = data.imperiumDeck.find((card) => card.sourceId === 183);
  assert.ok(priorityContracts, "Expected Priority Contracts Imperium card");
  const strikeFleet = data.imperiumDeck.find((card) => card.name === "Strike Fleet");
  assert.ok(strikeFleet, "Expected Strike Fleet Imperium card");
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.sourceId === 30);
  assert.ok(beneGesseritOperative, "Expected Bene Gesserit Operative Imperium card");
  const inHighPlaces = data.imperiumDeck.find((card) => card.sourceId === 64);
  assert.ok(inHighPlaces, "Expected In High Places Imperium card");
  const dangerousRhetoric = data.imperiumDeck.find((card) => card.sourceId === 44);
  assert.ok(dangerousRhetoric, "Expected Dangerous Rhetoric Imperium card");
  const subversiveAdvisor = data.imperiumDeck.find((card) => card.sourceId === 62);
  assert.ok(subversiveAdvisor, "Expected Subversive Advisor Imperium card");
  const overthrow = data.imperiumDeck.find((card) => card.sourceId === 75);
  assert.ok(overthrow, "Expected Overthrow Imperium card");
  const seekAllies = data.allyStarterCards.find((card) => card.name === "Seek Allies");
  assert.ok(seekAllies, "Expected Seek Allies starter card");
  const desertSurvival = data.imperiumDeck.find((card) => card.sourceId === 27);
  assert.ok(desertSurvival, "Expected Desert Survival Imperium card");
  const treadInDarkness = data.imperiumDeck.find((card) => card.sourceId === 58);
  assert.ok(treadInDarkness, "Expected Tread in Darkness Imperium card");
  const shishakli = data.imperiumDeck.find((card) => card.sourceId === 48);
  assert.ok(shishakli, "Expected Shishakli Imperium card");
  const hiddenMissive = data.imperiumDeck.find((card) => card.sourceId === 21);
  assert.ok(hiddenMissive, "Expected Hidden Missive Imperium card");
  const priceIsNoObject = data.imperiumDeck.find((card) => card.sourceId === 73);
  assert.ok(priceIsNoObject, "Expected Price is No Object Imperium card");
  const doubleAgent = data.imperiumDeck.find((card) => card.sourceId === 37);
  assert.ok(doubleAgent, "Expected Double Agent Imperium card");
  const spaceTimeFolding = data.imperiumDeck.find((card) => card.sourceId === 12);
  assert.ok(spaceTimeFolding, "Expected Space-time Folding Imperium card");
  const guildEnvoy = data.imperiumDeck.find((card) => card.sourceId === 38);
  assert.ok(guildEnvoy, "Expected Guild Envoy Imperium card");
  const guildSpy = data.imperiumDeck.find((card) => card.sourceId === 43);
  assert.ok(guildSpy, "Expected Guild Spy Imperium card");
  const corrinthCity = data.imperiumDeck.find((card) => card.sourceId === 69);
  assert.ok(corrinthCity, "Expected Corrinth City Imperium card");
  const deliveryAgreement = data.imperiumDeck.find((card) => card.name === "Delivery Agreement");
  assert.ok(deliveryAgreement, "Expected Delivery Agreement Imperium card");
  const longLiveTheFighters = data.imperiumDeck.find((card) => card.sourceId === 74);
  assert.ok(longLiveTheFighters, "Expected Long Live the Fighters Imperium card");
  const branchingPath = data.imperiumDeck.find((card) => card.sourceId === 45);
  assert.ok(branchingPath, "Expected Branching Path Imperium card");
  const junctionHeadquarters = data.imperiumDeck.find((card) => card.sourceId === 68);
  assert.ok(junctionHeadquarters, "Expected Junction Headquarters Imperium card");
  const ecologicalTestingStation = data.imperiumDeck.find((card) => card.sourceId === 46);
  assert.ok(ecologicalTestingStation, "Expected Ecological Testing Station Imperium card");
  const covertOperation = data.imperiumDeck.find((card) => card.sourceId === 35);
  assert.ok(covertOperation, "Expected Covert Operation Imperium card");
  const leverage = data.intrigueCards.find((card) => card.sourceId === 447);
  assert.ok(leverage, "Expected Leverage Intrigue card");
  const shaddamsFavor = data.intrigueCards.find((card) => card.name === "Shaddam's Favor");
  assert.ok(shaddamsFavor, "Expected Shaddam's Favor Intrigue card");
  const departForArrakis = data.intrigueCards.find((card) => card.sourceId === 132);
  assert.ok(departForArrakis, "Expected Depart For Arrakis Intrigue card");
  const spySpace = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(spySpace, "Expected High Council spy placement space");
  const spyPlaceAfterRecallSpace = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(spyPlaceAfterRecallSpace, "Expected Secrets spy placement space");
  const arrakeen = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeen, "Expected Arrakeen board space");
  const deliverSupplies = data.boardSpaces.find((space) => space.id === "deliver-supplies");
  assert.ok(deliverSupplies, "Expected Deliver Supplies board space");
  const spiceRefinery = data.boardSpaces.find((space) => space.id === "spice-refinery");
  assert.ok(spiceRefinery, "Expected Spice Refinery board space");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin, "Expected Imperial Basin board space");
  const haggaBasin = data.boardSpaces.find((space) => space.id === "hagga-basin");
  assert.ok(haggaBasin, "Expected Hagga Basin board space");
  const unprotectedConflict = data.conflictCards.find((card) => card.name === "CHOAM Security");
  assert.ok(unprotectedConflict, "Expected unprotected Conflict for Junction no-pay fixture");
  const capturedMentat = data.imperiumDeck.find((card) => card.sourceId === 61);
  assert.ok(capturedMentat, "Expected Captured Mentat Imperium card");
  const capturedMentatDiscard = { ...data.allyStarterCards[0], id: "browser-captured-mentat-discard-card" };
  const capturedMentatDraw = { ...data.imperiumDeck.find((card) => card.name === "Calculus of Power"), id: "browser-captured-mentat-draw-card" };
  assert.ok(capturedMentatDraw.name, "Expected Captured Mentat draw card");
  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "browser-captured-mentat-intrigue-card" };
  assert.ok(capturedMentatIntrigue.name, "Expected Captured Mentat reveal Intrigue card");
  const spaceTimeFoldingDiscard = {
    ...spaceTimeFolding,
    id: "browser-space-time-folding-discard-card",
    name: "Spacing Guild Debug Card",
  };
  const spaceTimeFoldingDrawOne = { ...data.allyStarterCards[1], id: "browser-space-time-folding-draw-one-card" };
  const spaceTimeFoldingDrawTwo = { ...data.allyStarterCards[2], id: "browser-space-time-folding-draw-two-card" };
  const guildEnvoyDiscard = {
    ...guildEnvoy,
    id: "browser-guild-envoy-discard-card",
    name: "Guild Envoy Spacing Guild Card",
  };
  const guildEnvoyDrawOne = { ...data.allyStarterCards[3], id: "browser-guild-envoy-draw-one-card" };
  const guildEnvoyDrawTwo = { ...data.allyStarterCards[4], id: "browser-guild-envoy-draw-two-card" };
  const guildSpyDiscard = {
    ...spaceTimeFolding,
    id: "browser-guild-spy-discard-card",
    name: "Guild Spy Spacing Guild Card",
  };
  const guildSpyDraw = { ...data.allyStarterCards[0], id: "browser-guild-spy-draw-card" };
  const guildSpyBoardIntrigue = { ...data.intrigueCards[0], id: "browser-guild-spy-board-intrigue-card" };
  const guildSpyBonusIntrigue = { ...data.intrigueCards[1], id: "browser-guild-spy-bonus-intrigue-card" };
  const strikeFleetArrakeenDraw = {
    ...data.allyStarterCards[0],
    id: "browser-strike-fleet-arrakeen-draw-card",
    name: "Strike Fleet Arrakeen Draw",
  };
  const corrinthDiscardOne = {
    ...data.allyStarterCards[0],
    id: "browser-corrinth-city-discard-one",
    name: "Corrinth Debug Dagger",
  };
  const corrinthDiscardTwo = {
    ...data.allyStarterCards[1],
    id: "browser-corrinth-city-discard-two",
    name: "Corrinth Debug Argument",
  };
  const longLiveDiscarded = {
    ...data.allyStarterCards[0],
    id: "browser-long-live-discarded-card",
    name: "Long Live Browser Discard",
  };
  const longLiveDrawn = {
    ...data.allyStarterCards[1],
    id: "browser-long-live-drawn-card",
    name: "Long Live Browser Draw",
  };
  const longLiveTrashed = {
    ...data.allyStarterCards[2],
    id: "browser-long-live-trashed-card",
    name: "Long Live Browser Trash",
  };
  const longLiveRemaining = {
    ...data.allyStarterCards[3],
    id: "browser-long-live-remaining-card",
    name: "Long Live Browser Remaining",
  };
  const branchingPathTrashIntrigue = {
    ...data.intrigueCards[2],
    id: "browser-branching-path-trash-intrigue",
    name: "Branching Path Debug Intrigue",
  };
  const branchingPathRewardIntrigue = {
    ...data.intrigueCards[3],
    id: "browser-branching-path-reward-intrigue",
  };
  const branchingPathBoardIntrigue = {
    ...data.intrigueCards[4],
    id: "browser-branching-path-board-intrigue",
  };
  const junctionTrashIntrigue = {
    ...data.intrigueCards[5],
    id: "browser-junction-headquarters-trash-intrigue",
    name: "Junction Headquarters Debug Intrigue",
  };
  const ecologicalTestingStationDrawOne = {
    ...data.allyStarterCards[0],
    id: "browser-ecological-testing-station-draw-one-card",
  };
  const ecologicalTestingStationDrawTwo = {
    ...data.allyStarterCards[1],
    id: "browser-ecological-testing-station-draw-two-card",
  };
  const covertOperationDiscard = {
    ...data.allyStarterCards[0],
    id: "browser-covert-operation-discard-card",
    name: "Covert Operation Debug Discard",
  };
  const seekAlliesOtherPlayCard = {
    ...data.allyStarterCards[0],
    id: "browser-seek-allies-other-play-card",
    name: "Seek Allies Debug Other",
  };
  const desertSurvivalOtherPlayCard = {
    ...data.allyStarterCards[0],
    id: "browser-desert-survival-other-play-card",
    name: "Desert Survival Debug Other",
  };
  const treadInDarknessOtherBeneCard = {
    ...hiddenMissive,
    id: "browser-tread-in-darkness-other-bene-card",
    name: "Tread in Darkness Debug Other Bene",
  };
  const treadInDarknessDrawCard = {
    ...data.allyStarterCards[1],
    id: "browser-tread-in-darkness-draw-card",
    name: "Tread in Darkness Debug Draw",
  };
  const treadInDarknessExtraDeckCard = {
    ...data.allyStarterCards[2],
    id: "browser-tread-in-darkness-extra-deck-card",
    name: "Tread in Darkness Debug Extra Deck",
  };
  const shishakliOtherPlayCard = {
    ...data.allyStarterCards[0],
    id: "browser-shishakli-other-play-card",
    name: "Shishakli Debug Other",
  };
  const shishakliDrawCard = {
    ...data.allyStarterCards[1],
    id: "browser-shishakli-draw-card",
    name: "Shishakli Debug Draw",
  };
  const shishakliExtraDeckCard = {
    ...data.allyStarterCards[2],
    id: "browser-shishakli-extra-deck-card",
    name: "Shishakli Debug Extra Deck",
  };
  const inHighPlacesOtherBeneCard = {
    ...hiddenMissive,
    id: "browser-in-high-places-other-bene-card",
    name: "In High Places Debug Other Bene",
  };
  const inHighPlacesDrawCard = {
    ...data.allyStarterCards[3],
    id: "browser-in-high-places-draw-card",
    name: "In High Places Debug Draw",
  };
  const priceIsNoObjectAcquireCard = {
    ...beneGesseritOperative,
    id: "browser-price-is-no-object-acquire-card",
  };
  const priceIsNoObjectBlockedCard = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    (card.cost ?? 0) > priceIsNoObjectAcquireCard.cost
  );
  assert.ok(priceIsNoObjectBlockedCard, "Expected unaffordable Price is No Object browser card");
  const priceIsNoObjectReplacement = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    card.id !== priceIsNoObjectBlockedCard.id
  );
  assert.ok(priceIsNoObjectReplacement, "Expected Price is No Object replacement card");

  const base = {
    ...game,
    activeSeat,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };
  const longLiveSpace = {
    id: "browser-long-live-test-space",
    name: "Browser Long Live Test Space",
    zone: "City",
    icon: "city",
    detail: "Browser-debug city space without board pending rewards.",
  };
  const priorityContractsSpace = {
    id: "browser-priority-contracts-test-space",
    name: "Browser Priority Contracts Test Space",
    zone: "Landsraad",
    icon: "landsraad",
    detail: "Browser-debug Landsraad space without board pending rewards.",
  };
  const corrinthCitySpace = {
    id: "browser-corrinth-city-test-space",
    name: "Browser Corrinth City Test Space",
    zone: "Emperor",
    icon: "emperor",
    detail: "Browser-debug Emperor space without board pending rewards.",
  };
  const {
    acquireInterstellarTradeState,
    acquireSpyNetworkState,
    beneGesseritOperativeRecallSpyState,
    beneGesseritOperativeSpyState,
    branchingPathState,
    contractOptionalState,
    corrinthCityHighCouncilState,
    corrinthCityState,
    covertOperationOpponent,
    covertOperationState,
    dangerousRhetoricState,
    deliveryAgreementRevealTrashState,
    desertSurvivalState,
    doubleAgentSharedSpyState,
    ecologicalTestingStationState,
    guildEnvoyState,
    guildSpyState,
    inHighPlacesState,
    junctionHeadquartersState,
    junctionNoPayState,
    junctionNoPayTrashIntrigue,
    longLiveTheFightersAlternateState,
    longLiveTheFightersStaleState,
    longLiveTheFightersState,
    overthrowState,
    priceIsNoObjectAcquireState,
    priorityContractsState,
    seekAlliesState,
    shishakliState,
    spaceTimeFoldingState,
    strikeFleetDeployState,
    subversiveAdvisorState,
    treadInDarknessState,
  } = createCardChoiceDerivedStates({
    arrakeen,
    base,
    beneGesseritOperative,
    branchingPath,
    branchingPathBoardIntrigue,
    branchingPathRewardIntrigue,
    branchingPathTrashIntrigue,
    corrinthCity,
    corrinthCitySpace,
    corrinthDiscardOne,
    corrinthDiscardTwo,
    covertOperation,
    covertOperationDiscard,
    data,
    dangerousRhetoric,
    deliverSupplies,
    deliveryAgreement,
    desertSurvival,
    desertSurvivalOtherPlayCard,
    doubleAgent,
    ecologicalTestingStation,
    ecologicalTestingStationDrawOne,
    ecologicalTestingStationDrawTwo,
    guildEnvoy,
    guildEnvoyDiscard,
    guildEnvoyDrawOne,
    guildEnvoyDrawTwo,
    guildSpy,
    guildSpyBoardIntrigue,
    guildSpyBonusIntrigue,
    guildSpyDiscard,
    guildSpyDraw,
    haggaBasin,
    imperialBasin,
    inHighPlaces,
    inHighPlacesDrawCard,
    inHighPlacesOtherBeneCard,
    interstellarTrade,
    interstellarTradeReplacement,
    junctionHeadquarters,
    junctionTrashIntrigue,
    leverage,
    longLiveDiscarded,
    longLiveDrawn,
    longLiveRemaining,
    longLiveSpace,
    longLiveTheFighters,
    longLiveTrashed,
    ownerId,
    overthrow,
    priceIsNoObject,
    priceIsNoObjectAcquireCard,
    priceIsNoObjectBlockedCard,
    priceIsNoObjectReplacement,
    priorityContracts,
    priorityContractsSpace,
    seekAllies,
    seekAlliesOtherPlayCard,
    shishakli,
    shishakliDrawCard,
    shishakliExtraDeckCard,
    shishakliOtherPlayCard,
    spaceTimeFolding,
    spaceTimeFoldingDiscard,
    spaceTimeFoldingDrawOne,
    spaceTimeFoldingDrawTwo,
    spiceRefinery,
    spyNetwork,
    spyNetworkReplacement,
    spyPlaceAfterRecallSpace,
    spySpace,
    state,
    strikeFleet,
    strikeFleetArrakeenDraw,
    subversiveAdvisor,
    treadInDarkness,
    treadInDarknessDrawCard,
    treadInDarknessExtraDeckCard,
    treadInDarknessOtherBeneCard,
    turnActions,
    unprotectedConflict,
  });
  return {
    contractPublic: {
      ...base,
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug contract",
      },
    },
    contractOptional: contractOptionalState,
    contractFallback: {
      ...base,
      contractOffer: [],
      contractDeck: [],
      players: base.players.map((player) =>
        player.id === ownerId ? { ...player, reservedContracts: [] } : player,
      ),
      pendingAction: {
        kind: "contract",
        ownerId,
        source: "Browser debug empty contract",
      },
    },
    acquire: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug acquire",
        maxCost: 99,
        destination: "discard",
      },
    },
    acquireReserve: {
      ...base,
      imperiumRow: [],
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug reserve acquire",
        minCost: prepareTheWay.cost,
        maxCost: prepareTheWay.cost,
        destination: "discard",
      },
    },
    priceIsNoObjectAcquire: {
      ...priceIsNoObjectAcquireState,
      priceIsNoObjectAcquireCardCost: priceIsNoObjectAcquireCard.cost,
      priceIsNoObjectAcquireCardId: priceIsNoObjectAcquireCard.id,
      priceIsNoObjectAcquireCardName: priceIsNoObjectAcquireCard.name,
    },
    dangerousRhetoric: dangerousRhetoricState,
    subversiveAdvisor: subversiveAdvisorState,
    overthrow: overthrowState,
    seekAllies: {
      ...seekAlliesState,
      seekAlliesOtherPlayCardId: seekAlliesOtherPlayCard.id,
    },
    desertSurvival: {
      ...desertSurvivalState,
      desertSurvivalOtherPlayCardId: desertSurvivalOtherPlayCard.id,
    },
    treadInDarkness: {
      ...treadInDarknessState,
      treadInDarknessDrawCardId: treadInDarknessDrawCard.id,
      treadInDarknessExtraDeckCardId: treadInDarknessExtraDeckCard.id,
      treadInDarknessOtherBeneCardId: treadInDarknessOtherBeneCard.id,
    },
    shishakli: {
      ...shishakliState,
      shishakliDrawCardId: shishakliDrawCard.id,
      shishakliExtraDeckCardId: shishakliExtraDeckCard.id,
      shishakliOtherPlayCardId: shishakliOtherPlayCard.id,
    },
    acquireSpyNetwork: {
      ...acquireSpyNetworkState,
      spySpaceId: spySpace.id,
      spySpaceName: spySpace.name,
    },
    acquireInterstellarTrade: acquireInterstellarTradeState,
    priorityContracts: {
      ...priorityContractsState,
      priorityContractName: priorityContractsState.contractOffer[0].name,
    },
    strikeFleetDeploy: strikeFleetDeployState,
    inHighPlaces: {
      ...inHighPlacesState,
      inHighPlacesDrawCardId: inHighPlacesDrawCard.id,
      spySpaceId: spySpace.id,
      spySpaceName: spySpace.name,
    },
    beneGesseritOperativeSpy: {
      ...beneGesseritOperativeSpyState,
      spySpaceId: spySpace.id,
      spySpaceName: spySpace.name,
    },
    doubleAgentSharedSpy: {
      ...doubleAgentSharedSpyState,
      sharedSpySpaceId: spyPlaceAfterRecallSpace.id,
      sharedSpySpaceName: spyPlaceAfterRecallSpace.name,
    },
    beneGesseritOperativeRecallSpy: {
      ...beneGesseritOperativeRecallSpyState,
      spyRecallSpaceId: spySpace.id,
      spyRecallSpaceName: spySpace.name,
      spyPlaceAfterRecallSpaceId: spyPlaceAfterRecallSpace.id,
      spyPlaceAfterRecallSpaceName: spyPlaceAfterRecallSpace.name,
    },
    capturedMentat: {
      ...base,
      capturedMentatDiscardId: capturedMentatDiscard.id,
      capturedMentatDiscardName: capturedMentatDiscard.name,
      capturedMentatDrawId: capturedMentatDraw.id,
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              deck: [capturedMentatDraw],
              discard: [],
              hand: [capturedMentatDiscard],
              influence: { ...player.influence, bene: 0 },
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "discard-card-for-influence-and-draw",
        ownerId,
        source: "Captured Mentat",
        drawCards: 1,
        influenceAmount: 1,
        optional: true,
      },
    },
    spaceTimeFolding: {
      ...spaceTimeFoldingState,
      spaceTimeFoldingDiscardId: spaceTimeFoldingDiscard.id,
      spaceTimeFoldingDiscardName: spaceTimeFoldingDiscard.name,
      spaceTimeFoldingDrawOneId: spaceTimeFoldingDrawOne.id,
      spaceTimeFoldingDrawTwoId: spaceTimeFoldingDrawTwo.id,
    },
    guildEnvoy: {
      ...guildEnvoyState,
      guildEnvoyDiscardId: guildEnvoyDiscard.id,
      guildEnvoyDiscardName: guildEnvoyDiscard.name,
      guildEnvoyDrawOneId: guildEnvoyDrawOne.id,
      guildEnvoyDrawTwoId: guildEnvoyDrawTwo.id,
    },
    guildSpy: {
      ...guildSpyState,
      guildSpyDiscardId: guildSpyDiscard.id,
      guildSpyDiscardName: guildSpyDiscard.name,
      guildSpyDrawId: guildSpyDraw.id,
      guildSpyIntrigueId: guildSpyBonusIntrigue.id,
    },
    corrinthCity: {
      ...corrinthCityState,
      corrinthDiscardOneId: corrinthDiscardOne.id,
      corrinthDiscardOneName: corrinthDiscardOne.name,
      corrinthDiscardTwoId: corrinthDiscardTwo.id,
      corrinthDiscardTwoName: corrinthDiscardTwo.name,
    },
    corrinthCityHighCouncil: corrinthCityHighCouncilState,
    deliveryAgreementRevealTrash: deliveryAgreementRevealTrashState,
    longLiveTheFighters: {
      ...longLiveTheFightersState,
      longLiveDiscardedId: longLiveDiscarded.id,
      longLiveDiscardedName: longLiveDiscarded.name,
      longLiveDrawnId: longLiveDrawn.id,
      longLiveDrawnName: longLiveDrawn.name,
      longLiveRemainingId: longLiveRemaining.id,
      longLiveTrashedId: longLiveTrashed.id,
      longLiveTrashedName: longLiveTrashed.name,
    },
    longLiveTheFightersAlternate: {
      ...longLiveTheFightersAlternateState,
    },
    longLiveTheFightersStale: {
      ...longLiveTheFightersStaleState,
      longLiveDiscardedId: longLiveDiscarded.id,
      longLiveDrawnId: longLiveDrawn.id,
    },
    branchingPath: {
      ...branchingPathState,
      branchingPathRewardIntrigueId: branchingPathRewardIntrigue.id,
      branchingPathTrashId: branchingPathTrashIntrigue.id,
      branchingPathTrashName: branchingPathTrashIntrigue.name,
    },
    junctionHeadquarters: {
      ...junctionHeadquartersState,
      junctionTrashId: junctionTrashIntrigue.id,
      junctionTrashName: junctionTrashIntrigue.name,
    },
    junctionHeadquartersNoPay: {
      ...junctionNoPayState,
      junctionTrashName: junctionNoPayTrashIntrigue.name,
    },
    payResourceTroopsNoSupply: {
      ...base,
      pendingAction: {
        kind: "pay-resource-for-troops",
        ownerId: "p4",
        recipientIds: ["p2", "p6"],
        resource: "spice",
        cost: 3,
        troops: 2,
        destination: "garrison",
        optional: true,
        source: "Corrino Might",
      },
      pendingQueue: [],
      players: base.players.map((player) => {
        if (player.id === "p4") return { ...player, resources: { ...player.resources, spice: 3 } };
        if (player.id === "p2") return { ...player, deployedTroops: 0, garrison: 11, jessicaMemories: 0 };
        if (player.id === "p6") return { ...player, deployedTroops: 0, garrison: 0, jessicaMemories: 0 };
        return player;
      }),
    },
    paidRewardNoSupply: {
      ...base,
      pendingAction: {
        kind: "paid-reward-choice",
        ownerId: "p4",
        source: "Emperor of the Known Universe",
        options: [{
          id: "troop",
          resource: "solari",
          cost: 2,
          reward: {
            kind: "recruit-troops",
            recipientId: "p6",
            amount: 1,
            destination: "garrison",
          },
        }],
      },
      pendingQueue: [],
      players: base.players.map((player) => {
        if (player.id === "p4") return { ...player, resources: { ...player.resources, solari: 2 } };
        if (player.id === "p6") return { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 };
        return player;
      }),
    },
    shaddamsFavorNoSupply: {
      ...base,
      activeSeat,
      pendingAction: undefined,
      pendingQueue: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              deployedTroops: 0,
              garrison: 12,
              influence: { ...player.influence, emperor: 0, greatHouses: 0 },
              intrigues: [shaddamsFavor],
              jessicaMemories: 0,
            }
          : player
      ),
    },
    departForArrakisNoSupplyNoDraw: {
      ...base,
      activeSeat,
      pendingAction: undefined,
      pendingQueue: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              deck: [],
              deployedTroops: 0,
              discard: [],
              garrison: 12,
              influence: { ...player.influence, fremen: 0, fringeWorlds: 0 },
              intrigues: [departForArrakis],
              jessicaMemories: 0,
              resources: { ...player.resources, spice: 2 },
            }
          : player
      ),
    },
    ecologicalTestingStation: {
      ...ecologicalTestingStationState,
      ecologicalTestingStationDrawOneId: ecologicalTestingStationDrawOne.id,
      ecologicalTestingStationDrawTwoId: ecologicalTestingStationDrawTwo.id,
    },
    covertOperation: {
      ...covertOperationState,
      covertOperationDiscardId: covertOperationDiscard.id,
      covertOperationDiscardName: covertOperationDiscard.name,
      covertOperationOpponentId: covertOperationOpponent.id,
    },
    capturedMentatReveal: {
      ...base,
      capturedMentatIntrigueId: capturedMentatIntrigue.id,
      intrigueDeck: [capturedMentatIntrigue],
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === ownerId
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, bene: 1 },
              intrigues: [],
              playArea: [capturedMentat],
            }
          : player,
      ),
      pendingAction: {
        kind: "lose-influence-for-intrigues",
        ownerId,
        source: "Captured Mentat",
        amount: 1,
        optional: true,
      },
    },
    acquireEmpty: {
      ...base,
      pendingAction: {
        kind: "acquire-card",
        ownerId,
        source: "Browser debug empty acquire",
        minCost: 99,
        maxCost: 99,
        destination: "discard",
        optional: true,
      },
    },
  };
}
