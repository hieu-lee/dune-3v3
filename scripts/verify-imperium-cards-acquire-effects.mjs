import assert from "node:assert/strict";

import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyImperiumCardAcquireEffects({
  cards,
  data,
  game,
  playerId,
  spaces,
  state,
  turnActions,
}) {
  const { beneGesseritOperative, overthrow, prepareTheWay, priceIsNoObject, spiceMustFlow, spyNetwork } = cards;
  const { highCouncil, secrets } = spaces;
  const beneSpySpace = state.spyObservationPostChoiceSpaces().find((space) => space.id === "espionage");
  assert.ok(beneSpySpace, "Espionage should be the Bene spy-post representative");
  const p2 = playerById(game, playerId);

  const prepareBuyFixture = withActivePlayer(game, p2.id, () => ({
    revealed: true,
    persuasion: 2,
  }));
  const prepareBought = state.acquireMarketCard(prepareBuyFixture, p2.id, prepareTheWay.id);
  assert.equal(playerById(prepareBought, p2.id).persuasion, 0, "Prepare The Way should spend 2 persuasion");
  assert.equal(playerById(prepareBought, p2.id).vp, p2.vp, "Prepare The Way should not award acquisition VP");
  assert.equal(playerById(prepareBought, p2.id).discard.at(-1).sourceId, 537, "Prepare The Way should go to discard");
  assert.notEqual(
    playerById(prepareBought, p2.id).discard.at(-1).id,
    prepareTheWay.id,
    "Reserve acquisitions should create a physical card copy",
  );
  assert.deepEqual(
    prepareBought.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Buying Prepare The Way should leave the reserve stack available",
  );

  const spiceBuyFixture = withActivePlayer(game, p2.id, (player) => ({
    revealed: true,
    persuasion: 9,
    resources: { ...player.resources, spice: 0 },
    vp: 0,
  }));
  const spiceBought = state.acquireMarketCard(spiceBuyFixture, p2.id, spiceMustFlow.id);
  const spiceBuyer = playerById(spiceBought, p2.id);
  assert.equal(spiceBuyer.persuasion, 0, "The Spice Must Flow should spend 9 persuasion");
  assert.equal(spiceBuyer.vp, 1, "The Spice Must Flow should award exactly one VP through acquire specs");
  assert.equal(spiceBuyer.resources.spice, 1, "The Spice Must Flow should award its acquire spice bonus");
  assert.equal(spiceBought.turnSpiceGains[p2.id], 1, "The Spice Must Flow acquire spice should count as turn spice gain");
  assert.equal(spiceBuyer.discard.at(-1).sourceId, 538, "The Spice Must Flow should go to discard when bought");
  assert.notEqual(
    spiceBuyer.discard.at(-1).id,
    spiceMustFlow.id,
    "The Spice Must Flow reserve acquisitions should create a physical card copy",
  );
  assert.match(spiceBought.log[0], /acquires The Spice Must Flow for 1 VP and gains 1 spice/);

  const overthrowReplacement = data.imperiumDeck.find((card) => card.id !== overthrow.id);
  const overthrowIntrigue = { ...data.intrigueCards[0], id: "overthrow-acquire-intrigue" };
  assert.ok(overthrowReplacement, "Expected an Imperium row replacement card for Overthrow purchase coverage");
  assert.ok(overthrowIntrigue.name, "Expected an Intrigue card for Overthrow acquire coverage");
  const overthrowBuyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      revealed: true,
      persuasion: overthrow.cost,
      discard: [],
      intrigues: [],
    })),
    imperiumRow: [overthrow],
    intrigueDeck: [overthrowIntrigue],
    intrigueDiscard: [],
    marketDeck: [overthrowReplacement],
  };
  const overthrowBought = state.acquireMarketCard(overthrowBuyFixture, p2.id, overthrow.id);
  const overthrowBuyer = playerById(overthrowBought, p2.id);
  assert.equal(overthrowBuyer.persuasion, 0, "Overthrow should spend its persuasion cost");
  assert.equal(overthrowBuyer.discard.at(-1).id, overthrow.id, "Overthrow should go to discard when bought from the row");
  assert.equal(overthrowBuyer.intrigues.at(-1).id, overthrowIntrigue.id, "Overthrow acquire bonus should draw one Intrigue");
  assert.equal(overthrowBought.intrigueDeck.length, 0, "Overthrow acquire bonus should consume the Intrigue deck");
  assert.match(overthrowBought.log[0], /draws an Intrigue card from Overthrow/);
  assert.match(overthrowBought.log[1], /acquires Overthrow/);

  const priceReplacement = data.imperiumDeck.find((card) => card.id !== priceIsNoObject.id);
  assert.ok(priceReplacement, "Expected an Imperium row replacement card for Price is No Object purchase coverage");
  const priceBuyFixture = {
    ...withActivePlayer(game, p2.id, (player) => ({
      revealed: true,
      persuasion: priceIsNoObject.cost,
      discard: [],
      resources: { ...player.resources, solari: 0 },
    })),
    imperiumRow: [priceIsNoObject],
    marketDeck: [priceReplacement],
  };
  const priceBought = state.acquireMarketCard(priceBuyFixture, p2.id, priceIsNoObject.id);
  const priceBuyer = playerById(priceBought, p2.id);
  assert.equal(priceBuyer.persuasion, 0, "Price is No Object should spend its persuasion cost");
  assert.equal(priceBuyer.resources.solari, 2, "Price is No Object acquire bonus should award 2 Solari");
  assert.equal(priceBuyer.discard.at(-1).id, priceIsNoObject.id, "Price is No Object should go to discard when bought from the row");
  assert.match(priceBought.log[0], /acquires Price is No Object and gains 2 Solari/);

  const priceAgentAcquireTarget = { ...beneGesseritOperative, id: "price-agent-bene-gesserit-operative" };
  const priceAgentBlockedTarget = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    (card.cost ?? 0) > priceAgentAcquireTarget.cost
  );
  assert.ok(priceAgentBlockedTarget, "Expected an unaffordable Imperium card for Price is No Object Agent coverage");
  const priceAgentReplacement = data.imperiumDeck.find((card) =>
    card.id !== priceIsNoObject.id &&
    card.id !== beneGesseritOperative.id &&
    card.id !== priceAgentBlockedTarget.id
  );
  assert.ok(priceAgentReplacement, "Expected an Imperium row replacement card for Price is No Object Agent coverage");
  const priceAgentFixture = {
    ...withActivePlayer(game, p2.id, (player) => ({
      agentsReady: 1,
      discard: [],
      hand: [priceIsNoObject],
      playArea: [],
      persuasion: 0,
      resources: { ...player.resources, solari: priceAgentAcquireTarget.cost },
    })),
    imperiumRow: [priceAgentAcquireTarget, priceAgentBlockedTarget],
    marketDeck: [priceAgentReplacement],
  };
  const priceAgentPlayed = turnActions.placeAgentAction(priceAgentFixture, {
    commanderTargets: {},
    selectedCard: priceIsNoObject,
    selectedSpace: secrets,
  });
  const priceAgentPending = priceAgentPlayed.pendingAction;
  assert.equal(priceAgentPending?.kind, "acquire-card", "Price is No Object Agent play should queue an acquire-card choice");
  assert.equal(priceAgentPending.ownerId, p2.id);
  assert.equal(priceAgentPending.source, "Price is No Object");
  assert.equal(priceAgentPending.destination, "hand");
  assert.equal(priceAgentPending.paymentResource, "solari");
  assert.equal(priceAgentPending.optional, true);
  assert.equal(priceAgentPending.maxCost, undefined);
  const priceAgentChoices = state.acquirableCardsForPending(priceAgentPlayed, priceAgentPending);
  assert.ok(
    priceAgentChoices.some((card) => card.id === priceAgentAcquireTarget.id),
    "Price is No Object should offer affordable Imperium Row cards",
  );
  assert.equal(
    priceAgentChoices.some((card) => card.id === priceAgentBlockedTarget.id),
    false,
    "Price is No Object should exclude Imperium Row cards that cost more Solari than the owner has",
  );
  assert.ok(
    priceAgentChoices.every((card) => (card.cost ?? 0) <= priceAgentAcquireTarget.cost),
    "Price is No Object should only offer cards affordable with Solari",
  );
  assert.equal(
    state.finishPendingAction(priceAgentPlayed).pendingAction,
    undefined,
    "Price is No Object's optional acquire-card pending should be skippable",
  );
  const priceAgentResolved = state.acquireCardForPending(
    priceAgentPlayed,
    priceAgentPending,
    priceAgentAcquireTarget.id,
  );
  const priceAgentOwner = playerById(priceAgentResolved, p2.id);
  assert.equal(
    priceAgentOwner.resources.solari,
    0,
    "Price is No Object Agent acquire should spend the acquired card's printed cost in Solari",
  );
  assert.equal(priceAgentOwner.persuasion, 0, "Price is No Object Agent acquire should not spend persuasion");
  assert.equal(
    priceAgentOwner.hand.at(-1).id,
    priceAgentAcquireTarget.id,
    "Price is No Object Agent acquire should put the selected card into hand",
  );
  assert.match(
    priceAgentResolved.log[0],
    /acquires Bene Gesserit Operative to their hand for 3 Solari from Price is No Object/,
  );
  const priceAgentNoSolari = turnActions.placeAgentAction(
    {
      ...priceAgentFixture,
      players: priceAgentFixture.players.map((player) =>
        player.id === p2.id
          ? { ...player, resources: { ...player.resources, solari: 0 } }
          : player,
      ),
      pendingAction: undefined,
      pendingQueue: [],
    },
    {
      commanderTargets: {},
      selectedCard: priceIsNoObject,
      selectedSpace: secrets,
    },
  );
  assert.notEqual(
    priceAgentNoSolari.pendingAction?.kind,
    "acquire-card",
    "Price is No Object should not queue an acquire-card choice without enough Solari for any card",
  );
  const unconstrainedAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Unconstrained Acquire",
    destination: "hand",
    optional: true,
  };
  const unconstrainedAcquireFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      resources: { solari: 99, spice: 0, water: 0 },
    })),
    imperiumRow: [priceAgentAcquireTarget],
    marketDeck: [priceAgentReplacement],
    pendingAction: unconstrainedAcquirePending,
    pendingQueue: [],
  };
  assert.deepEqual(
    state.acquirableCardsForPending(unconstrainedAcquireFixture, unconstrainedAcquirePending),
    [],
    "Unconstrained acquire-card pendings should expose no eligible cards",
  );
  const unconstrainedResolved = state.acquireCardForPending(
    unconstrainedAcquireFixture,
    unconstrainedAcquirePending,
    priceAgentAcquireTarget.id,
  );
  assert.equal(
    playerById(unconstrainedResolved, p2.id).hand.length,
    0,
    "Unconstrained acquire-card pendings should not resolve acquisitions",
  );
  assert.equal(
    unconstrainedResolved.pendingAction,
    unconstrainedAcquirePending,
    "Unconstrained acquire-card pendings should remain unresolved",
  );
  const malformedAcquirePendingBase = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Malformed Acquire",
    maxCost: priceAgentAcquireTarget.cost,
    optional: true,
  };
  const invalidDestinationAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "deck",
  };
  const missingSourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: undefined,
  };
  const nonStringSourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: 17,
  };
  const emptySourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    source: "  ",
  };
  const nonStringOwnerAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    ownerId: 17,
  };
  const invalidResourceAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    paymentResource: "melange",
  };
  const stringCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: String(priceAgentAcquireTarget.cost),
  };
  const negativeCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: -1,
  };
  const nanCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    maxCost: Number.NaN,
  };
  const negativeMinCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    minCost: -1,
  };
  const invertedCostAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    minCost: priceAgentAcquireTarget.cost + 1,
    maxCost: priceAgentAcquireTarget.cost,
  };
  const stringOptionalAcquirePending = {
    ...malformedAcquirePendingBase,
    destination: "hand",
    optional: "true",
  };
  for (const malformedPending of [
    invalidDestinationAcquirePending,
    missingSourceAcquirePending,
    nonStringSourceAcquirePending,
    emptySourceAcquirePending,
    nonStringOwnerAcquirePending,
    invalidResourceAcquirePending,
    stringCostAcquirePending,
    negativeCostAcquirePending,
    nanCostAcquirePending,
    negativeMinCostAcquirePending,
    invertedCostAcquirePending,
    stringOptionalAcquirePending,
  ]) {
    const malformedFixture = {
      ...unconstrainedAcquireFixture,
      pendingAction: malformedPending,
    };
    assert.deepEqual(
      state.acquirableCardsForPending(malformedFixture, malformedPending),
      [],
      "Malformed acquire-card pendings should expose no eligible cards",
    );
    const malformedResolved = state.acquireCardForPending(
      malformedFixture,
      malformedPending,
      priceAgentAcquireTarget.id,
    );
    assert.equal(
      playerById(malformedResolved, p2.id).hand.length,
      0,
      "Malformed acquire-card pendings should not resolve acquisitions",
    );
    assert.equal(
      malformedResolved.pendingAction,
      malformedPending,
      "Malformed acquire-card pendings should remain unresolved",
    );
  }
  assert.equal(
    state.finishPendingAction({
      ...unconstrainedAcquireFixture,
      pendingAction: stringOptionalAcquirePending,
    }).pendingAction,
    stringOptionalAcquirePending,
    "Acquire-card pending skip should require optional to be boolean true",
  );
  const forgedAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Forged Acquire",
    maxCost: priceAgentAcquireTarget.cost,
    destination: "hand",
  };
  const forgedAcquireFixture = {
    ...unconstrainedAcquireFixture,
    pendingAction: undefined,
  };
  const forgedResolved = state.acquireCardForPending(
    forgedAcquireFixture,
    forgedAcquirePending,
    priceAgentAcquireTarget.id,
  );
  assert.equal(
    playerById(forgedResolved, p2.id).hand.length,
    0,
    "Acquire-card resolution should require the active pending object",
  );
  assert.equal(
    forgedResolved.pendingAction,
    undefined,
    "Forged acquire-card resolution should leave pending state untouched",
  );

  const spyNetworkReplacement = data.imperiumDeck.find((card) => card.id !== spyNetwork.id);
  assert.ok(spyNetworkReplacement, "Expected an Imperium row replacement card for Spy Network purchase coverage");
  const spyNetworkBuyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      revealed: true,
      persuasion: spyNetwork.cost,
      discard: [],
      spies: 1,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    spyPosts: {},
    sharedSpyPosts: {},
  };
  const spyNetworkBought = state.acquireMarketCard(spyNetworkBuyFixture, p2.id, spyNetwork.id);
  const spyNetworkBuyer = playerById(spyNetworkBought, p2.id);
  assert.equal(spyNetworkBuyer.persuasion, 0, "Spy Network should spend its persuasion cost");
  assert.equal(spyNetworkBuyer.discard.at(-1).id, spyNetwork.id, "Spy Network should go to discard when bought from the row");
  assert.deepEqual(
    spyNetworkBought.imperiumRow.map((card) => card.id),
    [spyNetworkReplacement.id],
    "Buying Spy Network from the row should draw a replacement",
  );
  assert.equal(spyNetworkBought.pendingAction?.kind, "spy", "Buying Spy Network should queue a spy placement");
  assert.equal(spyNetworkBought.pendingAction.ownerId, p2.id);
  assert.equal(spyNetworkBought.pendingAction.source, "Spy Network");
  assert.equal(spyNetworkBought.pendingAction.remaining, 1);
  assert.equal(spyNetworkBought.pendingAction.recallForSupply, true);
  assert.equal(spyNetworkBought.pendingAction.mustPlaceSpy, true);
  const spyNetworkSpyPlaced = state.placeSpyForPending(
    spyNetworkBought,
    spyNetworkBought.pendingAction,
    highCouncil.id,
  );
  assert.equal(spyNetworkSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(spyNetworkSpyPlaced, p2.id).spies, 0, "Spy Network acquire bonus should spend one spy");
  assert.equal(
    spyNetworkSpyPlaced.spyPosts[state.spyObservationPostIdForSpace(highCouncil.id)],
    p2.id,
    "Spy Network acquire bonus should place the selected spy",
  );
  assert.match(spyNetworkSpyPlaced.log[0], /places a spy near High Council \/ Imperial Privilege \/ Swordmaster from Spy Network/);

  const spiceAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: 9,
    destination: "hand",
  };
  const spicePendingFixtureBase = withActivePlayer(game, p2.id, (player) => ({
    resources: { ...player.resources, spice: 0 },
    vp: 0,
  }));
  const spicePendingFixture = {
    ...spicePendingFixtureBase,
    pendingAction: spiceAcquirePending,
    pendingQueue: [],
  };
  const spicePendingAcquired = state.acquireCardForPending(spicePendingFixture, spiceAcquirePending, spiceMustFlow.id);
  const spicePendingOwner = playerById(spicePendingAcquired, p2.id);
  assert.equal(spicePendingOwner.vp, 1, "Acquire-card pending actions should award The Spice Must Flow VP");
  assert.equal(spicePendingOwner.resources.spice, 1, "Acquire-card pending actions should award The Spice Must Flow spice");
  assert.equal(spicePendingAcquired.turnSpiceGains[p2.id], 1, "Acquire-card pending spice should count as turn spice gain");
  assert.equal(spicePendingOwner.hand.at(-1).sourceId, 538, "Acquire-card pending should honor the requested destination");
  assert.equal(spicePendingAcquired.pendingAction, undefined, "Acquire-card pending should advance after acquisition");
  assert.match(
    spicePendingAcquired.log[0],
    /acquires The Spice Must Flow to their hand from Verifier Acquire for 1 VP and gains 1 spice/,
  );

  const overthrowAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: overthrow.cost,
    destination: "hand",
  };
  const overthrowPendingIntrigue = { ...data.intrigueCards[1], id: "overthrow-pending-acquire-intrigue" };
  assert.ok(overthrowPendingIntrigue.name, "Expected an Intrigue card for pending Overthrow acquire coverage");
  const overthrowPendingFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      intrigues: [],
    })),
    imperiumRow: [overthrow],
    intrigueDeck: [overthrowPendingIntrigue],
    intrigueDiscard: [],
    marketDeck: [overthrowReplacement],
    pendingAction: overthrowAcquirePending,
    pendingQueue: [],
  };
  const overthrowPendingAcquired = state.acquireCardForPending(
    overthrowPendingFixture,
    overthrowAcquirePending,
    overthrow.id,
  );
  const overthrowPendingOwner = playerById(overthrowPendingAcquired, p2.id);
  assert.equal(overthrowPendingOwner.hand.at(-1).id, overthrow.id, "Acquire-card pending should honor Overthrow hand destination");
  assert.equal(
    overthrowPendingOwner.intrigues.at(-1).id,
    overthrowPendingIntrigue.id,
    "Acquire-card pending should apply Overthrow acquire Intrigue reward",
  );
  assert.match(overthrowPendingAcquired.log[0], /draws an Intrigue card from Overthrow/);
  assert.match(overthrowPendingAcquired.log[1], /acquires Overthrow to their hand from Verifier Acquire/);
  assert.equal(overthrowPendingAcquired.pendingAction, undefined, "Overthrow acquire-card pending should advance after acquisition");

  const queuedAfterAcquire = {
    kind: "trash-card",
    ownerId: p2.id,
    source: "Queued Verifier",
    optional: false,
    zones: ["hand"],
  };
  const spyAcquirePending = {
    kind: "acquire-card",
    ownerId: p2.id,
    source: "Verifier Acquire",
    maxCost: spyNetwork.cost,
    destination: "hand",
  };
  const spyPendingAcquireFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      spies: 1,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    pendingAction: spyAcquirePending,
    pendingQueue: [queuedAfterAcquire],
    spyPosts: {},
    sharedSpyPosts: {},
  };
  const spyPendingAcquired = state.acquireCardForPending(spyPendingAcquireFixture, spyAcquirePending, spyNetwork.id);
  const spyPendingOwner = playerById(spyPendingAcquired, p2.id);
  assert.equal(spyPendingOwner.hand.at(-1).id, spyNetwork.id, "Acquire-card pending should honor Spy Network hand destination");
  assert.equal(spyPendingAcquired.pendingAction?.kind, "spy", "Acquire-card pending should immediately queue Spy Network spy bonus");
  assert.equal(spyPendingAcquired.pendingAction.source, "Spy Network");
  assert.equal(spyPendingAcquired.pendingQueue[0], queuedAfterAcquire, "Spy Network acquire bonus should resolve before existing queued prompts");

  const queuedSpyAfterAcquire = {
    kind: "spy",
    ownerId: p2.id,
    remaining: 1,
    recallForSupply: true,
    mustPlaceSpy: true,
    source: "Queued Spy",
  };
  const spyPendingAcquireRecallFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      hand: [],
      spies: 0,
    })),
    imperiumRow: [spyNetwork],
    marketDeck: [spyNetworkReplacement],
    pendingAction: spyAcquirePending,
    pendingQueue: [queuedSpyAfterAcquire],
    spyPosts: { [highCouncil.id]: p2.id },
    sharedSpyPosts: {},
  };
  const spyPendingAcquiredWithRecall = state.acquireCardForPending(
    spyPendingAcquireRecallFixture,
    spyAcquirePending,
    spyNetwork.id,
  );
  assert.equal(
    spyPendingAcquiredWithRecall.pendingAction?.remaining,
    2,
    "Merged recall-for-supply spy rewards should not cap remaining to zero when supply is empty",
  );
  assert.equal(spyPendingAcquiredWithRecall.pendingAction.mustPlaceSpy, true);
  assert.deepEqual(
    state.recallableSpySupplySpaces(spyPendingAcquiredWithRecall, spyPendingAcquiredWithRecall.pendingAction).map((space) => space.id),
    [highCouncil.id],
    "Merged acquire spy rewards should expose recall-for-supply choices instead of deadlocking",
  );
  const spyPendingRecallResolved = state.recallSpyForSupplyForPending(
    spyPendingAcquiredWithRecall,
    spyPendingAcquiredWithRecall.pendingAction,
    highCouncil.id,
  );
  const spyPendingRecallPlaced = state.placeSpyForPending(
    spyPendingRecallResolved,
    spyPendingRecallResolved.pendingAction,
    beneSpySpace.id,
  );
  assert.equal(
    spyPendingRecallPlaced.pendingAction?.remaining,
    1,
    "Merged recall-for-supply spy rewards should remain resolvable after placing the recalled spy",
  );
  assert.equal(spyPendingRecallPlaced.pendingAction.mustPlaceSpy, false);
  assert.equal(
    state.finishPendingAction(spyPendingRecallPlaced).pendingAction,
    undefined,
    "Remaining merged recall-for-supply spy rewards should be skippable after the mandatory placement resolves",
  );
}
