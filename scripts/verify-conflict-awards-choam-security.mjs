import assert from "node:assert/strict";

export function verifyChoamSecurityConflictAwards({
  state,
  data,
  fixture,
  conflictBySourceId,
  playerById,
}) {
  const choamSecurityReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              garrison: 0,
              influence: { ...player.influence, spacing: 1 },
              resources: { ...player.resources, solari: 0, water: 0 },
              vp: 0,
            }
          : player,
      ), 454),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const firstContractId = choamSecurityReward.contractOffer[0].id;
  const choamSecurityPending = state.startNextRound(choamSecurityReward);
  const choamSecurityWinner = playerById(choamSecurityPending, "p2");
  assert.deepEqual(
    choamSecurityPending.pendingAction,
    {
      kind: "contract",
      ownerId: "p2",
      publicOnly: true,
      source: "CHOAM Security",
    },
    "CHOAM Security should pause for a face-up CHOAM contract",
  );
  assert.equal(choamSecurityPending.pendingQueue.length, 0);
  assert.equal(choamSecurityWinner.influence.spacing, 2, "CHOAM Security should award Spacing Guild Influence");
  assert.equal(choamSecurityWinner.vp, 1, "CHOAM Security Influence should score the 2-Influence VP");
  assert.equal(choamSecurityWinner.garrison, 1, "CHOAM Security should recruit one first-place troop");
  assert.equal(choamSecurityWinner.resources.solari, 0, "CHOAM Security first place should not gain lower-place Solari");
  assert.equal(choamSecurityWinner.resources.water, 0, "CHOAM Security first place should not gain lower-place water");
  assert.equal(choamSecurityWinner.contracts.length, 0, "CHOAM Security should wait for contract choice");
  assert.equal(choamSecurityPending.round, choamSecurityReward.round, "Contract choice should pause before next round");
  assert.ok(
    choamSecurityPending.log.some((entry) =>
      entry.includes("may take 1 face-up CHOAM contract") &&
      entry.includes("CHOAM Security")
    ),
    "CHOAM Security should log the pending public contract choice",
  );

  const choamSecurityResolved = state.takeChoamContract(
    choamSecurityPending,
    choamSecurityPending.pendingAction,
    firstContractId,
  );
  const resolvedWinner = playerById(choamSecurityResolved, "p2");
  assert.equal(resolvedWinner.contracts.length, 1, "CHOAM Security should add the chosen contract");
  assert.equal(resolvedWinner.contracts[0].card.id, firstContractId);
  assert.equal(choamSecurityResolved.pendingAction, undefined);
  assert.equal(choamSecurityResolved.round, choamSecurityReward.round + 1);
  assert.equal(choamSecurityResolved.conflict.sourceId, 452, "CHOAM Security contract resolution should reveal next Conflict");
  assert.equal(resolvedWinner.conflict, 0, "Next round should clear Conflict strength after contract choice");
  assert.equal(resolvedWinner.deployedTroops, 0, "Next round should recall deployed troops after contract choice");

  const noPublicContractReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              conflict: 9,
              deployedTroops: 1,
              garrison: 0,
              influence: { ...player.influence, spacing: 0 },
            }
          : player,
      ), 454),
    conflictDeck: [conflictBySourceId(data, 452)],
    contractDeck: [],
    contractOffer: [],
  };
  const noPublicContractResult = state.startNextRound(noPublicContractReward);
  const noPublicContractWinner = playerById(noPublicContractResult, "p2");
  assert.equal(noPublicContractResult.pendingAction, undefined, "No public contracts should not create a dead pending choice");
  assert.equal(noPublicContractResult.round, noPublicContractReward.round + 1);
  assert.equal(noPublicContractResult.conflict.sourceId, 452);
  assert.equal(noPublicContractWinner.influence.spacing, 1);
  assert.equal(noPublicContractWinner.garrison, 1);

  const doubledChoamSecurityReward = {
    ...fixture(state, data, (players) =>
      players.map((player) =>
        player.id === "p3"
          ? {
              ...player,
              conflict: 9,
              deployedSandworms: 1,
              garrison: 0,
              influence: { ...player.influence, spacing: 0 },
              vp: 0,
            }
          : player,
      ), 454),
    conflictDeck: [conflictBySourceId(data, 452)],
  };
  const doubledPending = state.startNextRound(doubledChoamSecurityReward);
  assert.equal(doubledPending.pendingAction?.kind, "contract");
  assert.equal(doubledPending.pendingQueue.length, 1, "Sandworms should double the CHOAM contract reward");
  const doubledWinner = playerById(doubledPending, "p3");
  assert.equal(doubledWinner.influence.spacing, 2, "Sandworms should double CHOAM Security Influence");
  assert.equal(doubledWinner.vp, 1, "Doubled CHOAM Security Influence should score the threshold once");
  assert.equal(doubledWinner.garrison, 2, "Sandworms should double CHOAM Security troop recruitment");

  const doubledFirstContract = doubledPending.contractOffer[0].id;
  const doubledAfterFirst = state.takeChoamContract(
    doubledPending,
    doubledPending.pendingAction,
    doubledFirstContract,
  );
  assert.equal(doubledAfterFirst.pendingAction?.kind, "contract");
  assert.equal(doubledAfterFirst.round, doubledChoamSecurityReward.round);
  const doubledSecondContract = doubledAfterFirst.contractOffer[0].id;
  const doubledResolved = state.takeChoamContract(
    doubledAfterFirst,
    doubledAfterFirst.pendingAction,
    doubledSecondContract,
  );
  assert.equal(playerById(doubledResolved, "p3").contracts.length, 2);
  assert.equal(doubledResolved.pendingAction, undefined);
  assert.equal(doubledResolved.round, doubledChoamSecurityReward.round + 1);
}
