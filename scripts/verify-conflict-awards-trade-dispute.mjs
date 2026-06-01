import assert from "node:assert/strict";

function cardIdsForPlayer(player) {
  return [...player.hand, ...player.discard, ...player.playArea, ...player.deck].map((card) => card.id);
}

function testTrashCard(player, id, name) {
  const template = player.hand[0] ?? player.discard[0] ?? player.playArea[0] ?? player.deck[0];
  assert.ok(template, "Expected a template card for Trade Dispute trash tests");
  return { ...template, id, name };
}

export function verifyTradeDisputeConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const tradeDisputeReward = {
    ...fixture(state, data, (players) =>
      players.map((player) => {
        if (player.id !== "p2") return player;
        const trashCard = testTrashCard(player, "trade-dispute-trash-card", "Trade Dispute Trash Probe");
        return {
          ...player,
          conflict: 9,
          deck: [],
          deployedTroops: 1,
          discard: [],
          garrison: 0,
          hand: [trashCard],
          playArea: [],
          resources: { ...player.resources, spice: 0, water: 0 },
        };
      }), 462),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const firstContractId = tradeDisputeReward.contractOffer[0].id;
  const tradeDisputePending = state.startNextRound(tradeDisputeReward);
  const tradeDisputeWinner = playerById(tradeDisputePending, "p2");
  assert.deepEqual(
    tradeDisputePending.pendingAction,
    {
      kind: "contract",
      ownerId: "p2",
      publicOnly: true,
      source: "Trade Dispute",
    },
    "Trade Dispute should pause first for its face-up CHOAM contract",
  );
  assert.deepEqual(
    tradeDisputePending.pendingQueue,
    [{
      kind: "trash-card",
      ownerId: "p2",
      optional: false,
      source: "Trade Dispute",
    }],
    "Trade Dispute should queue its required trash after the public contract choice",
  );
  assert.equal(tradeDisputeWinner.resources.water, 1, "Trade Dispute should pay first-place water");
  assert.equal(tradeDisputeWinner.resources.spice, 0, "Trade Dispute first place should not gain lower-place spice");
  assert.equal(tradeDisputeWinner.garrison, 0, "Trade Dispute first place should not recruit lower-place troops");
  assert.equal(tradeDisputeWinner.contracts.length, 0, "Trade Dispute should wait for contract choice");
  assert.equal(tradeDisputePending.round, tradeDisputeReward.round, "Trade Dispute choices should pause before next round");

  const afterContract = state.takeChoamContract(
    tradeDisputePending,
    tradeDisputePending.pendingAction,
    firstContractId,
  );
  assert.equal(afterContract.pendingAction?.kind, "trash-card");
  assert.equal(afterContract.round, tradeDisputeReward.round);
  assert.equal(playerById(afterContract, "p2").contracts.length, 1);
  assert.equal(
    state.skipTrashCard(afterContract, afterContract.pendingAction),
    afterContract,
    "Trade Dispute trash should be required while the player has a trashable card",
  );

  const resolved = state.trashPlayerCard(
    afterContract,
    afterContract.pendingAction,
    "hand",
    "trade-dispute-trash-card",
  );
  const resolvedWinner = playerById(resolved, "p2");
  assert.equal(resolved.pendingAction, undefined);
  assert.equal(resolved.round, tradeDisputeReward.round + 1);
  assert.equal(resolved.conflict.sourceId, 452, "Trade Dispute should reveal the next Conflict after trashing");
  assert.equal(resolvedWinner.contracts[0].card.id, firstContractId);
  assert.equal(cardIdsForPlayer(resolvedWinner).includes("trade-dispute-trash-card"), false);
  assert.equal(resolvedWinner.resources.water, 1);

  const noPublicContractReward = {
    ...fixture(state, data, (players) =>
      players.map((player) => {
        if (player.id !== "p2") return player;
        const trashCard = testTrashCard(player, "trade-dispute-trash-only-card", "Trade Dispute Trash Only");
        return {
          ...player,
          conflict: 9,
          deck: [],
          deployedTroops: 1,
          discard: [],
          hand: [trashCard],
          playArea: [],
          resources: { ...player.resources, water: 0 },
        };
      }), 462),
    conflictDeck: [conflictBySourceId(data, 452)],
    contractDeck: [],
    contractOffer: [],
  };
  const noPublicContractPending = state.startNextRound(noPublicContractReward);
  assert.deepEqual(
    noPublicContractPending.pendingAction,
    {
      kind: "trash-card",
      ownerId: "p2",
      optional: false,
      source: "Trade Dispute",
    },
    "Trade Dispute should still trash when no public contracts remain",
  );
  assert.equal(playerById(noPublicContractPending, "p2").resources.water, 1);
  const noPublicContractResolved = state.trashPlayerCard(
    noPublicContractPending,
    noPublicContractPending.pendingAction,
    "hand",
    "trade-dispute-trash-only-card",
  );
  assert.equal(noPublicContractResolved.round, noPublicContractReward.round + 1);
  assert.equal(playerById(noPublicContractResolved, "p2").contracts.length, 0);

  const noPendingReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deck: [],
              deployedTroops: 1,
              discard: [],
              hand: [],
              playArea: [],
              resources: { ...player.resources, water: 0 },
            }
          : player,
      ), 462),
    conflictDeck: [conflictBySourceId(data, 452)],
    contractDeck: [],
    contractOffer: [],
  };
  const noPendingResult = state.startNextRound(noPendingReward);
  assert.equal(noPendingResult.pendingAction, undefined, "Trade Dispute should not create dead choices");
  assert.equal(noPendingResult.round, noPendingReward.round + 1);
  assert.equal(playerById(noPendingResult, "p2").resources.water, 1);

  const doubledTradeDisputeReward = {
    ...fixture(state, data, (players) =>
      players.map((player) => {
        if (player.id !== "p3") return player;
        const firstTrashCard = testTrashCard(player, "trade-dispute-doubled-trash-1", "Trade Dispute Doubled Trash 1");
        const secondTrashCard = testTrashCard(player, "trade-dispute-doubled-trash-2", "Trade Dispute Doubled Trash 2");
        return {
          ...player,
          conflict: 9,
          deck: [],
          deployedSandworms: 1,
          discard: [],
          hand: [firstTrashCard, secondTrashCard],
          playArea: [],
          resources: { ...player.resources, water: 0 },
        };
      }), 462),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const doubledPending = state.startNextRound(doubledTradeDisputeReward);
  assert.equal(playerById(doubledPending, "p3").resources.water, 2, "Sandworms should double Trade Dispute water");
  assert.equal(doubledPending.pendingAction?.kind, "contract");
  assert.deepEqual(
    doubledPending.pendingQueue.map((pending) => pending.kind),
    ["contract", "trash-card", "trash-card"],
    "Sandworms should double Trade Dispute contract and trash rewards",
  );
  const doubledAfterFirstContract = state.takeChoamContract(
    doubledPending,
    doubledPending.pendingAction,
    doubledPending.contractOffer[0].id,
  );
  const doubledAfterSecondContract = state.takeChoamContract(
    doubledAfterFirstContract,
    doubledAfterFirstContract.pendingAction,
    doubledAfterFirstContract.contractOffer[0].id,
  );
  assert.equal(doubledAfterSecondContract.pendingAction?.kind, "trash-card");
  assert.equal(playerById(doubledAfterSecondContract, "p3").contracts.length, 2);
  const doubledAfterFirstTrash = state.trashPlayerCard(
    doubledAfterSecondContract,
    doubledAfterSecondContract.pendingAction,
    "hand",
    "trade-dispute-doubled-trash-1",
  );
  assert.equal(doubledAfterFirstTrash.pendingAction?.kind, "trash-card");
  assert.equal(doubledAfterFirstTrash.round, doubledTradeDisputeReward.round);
  const doubledResolved = state.trashPlayerCard(
    doubledAfterFirstTrash,
    doubledAfterFirstTrash.pendingAction,
    "hand",
    "trade-dispute-doubled-trash-2",
  );
  const doubledWinner = playerById(doubledResolved, "p3");
  assert.equal(doubledResolved.pendingAction, undefined);
  assert.equal(doubledResolved.round, doubledTradeDisputeReward.round + 1);
  assert.equal(cardIdsForPlayer(doubledWinner).includes("trade-dispute-doubled-trash-1"), false);
  assert.equal(cardIdsForPlayer(doubledWinner).includes("trade-dispute-doubled-trash-2"), false);
}
