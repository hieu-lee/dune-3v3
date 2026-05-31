import assert from "node:assert/strict";

export function verifySkirmishConflictAwards({
  state,
  data,
  fixture,
  playerById,
}) {
  const ornithopterSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            intrigues: [],
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 452);
  const ornithopterSkirmishResult = state.startNextRound(ornithopterSkirmishReward);
  const ornithopterSkirmishWinner = playerById(ornithopterSkirmishResult, "p2");
  assert.equal(ornithopterSkirmishWinner.resources.solari, 1, "Skirmish Ornithopter should pay first-place Solari");
  assert.equal(
    ornithopterSkirmishWinner.intrigues.length,
    1,
    "Skirmish Ornithopter should draw one first-place Intrigue",
  );
  assert.equal(
    ornithopterSkirmishResult.intrigueDeck.length,
    ornithopterSkirmishReward.intrigueDeck.length - 1,
    "Skirmish Ornithopter should draw from the Intrigue deck",
  );
  assert.equal(ornithopterSkirmishResult.pendingAction, undefined, "Skirmish Ornithopter should not require choices");
  assert.ok(
    ornithopterSkirmishResult.log.some((entry) =>
      entry.includes("draws an Intrigue card") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Skirmish Ornithopter should log the Intrigue draw",
  );
  assert.ok(
    ornithopterSkirmishResult.log.some((entry) =>
      entry.includes("gains 1 solari") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Skirmish Ornithopter should log the Solari reward",
  );

  const doubledOrnithopterSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? {
            ...player,
            conflict: 5,
            deployedSandworms: 1,
            intrigues: [],
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 452);
  const doubledOrnithopterSkirmishResult = state.startNextRound(doubledOrnithopterSkirmishReward);
  const doubledOrnithopterSkirmishWinner = playerById(doubledOrnithopterSkirmishResult, "p3");
  assert.equal(
    doubledOrnithopterSkirmishWinner.resources.solari,
    2,
    "Sandworms should double Skirmish Ornithopter Solari",
  );
  assert.equal(
    doubledOrnithopterSkirmishWinner.intrigues.length,
    2,
    "Sandworms should double Skirmish Ornithopter Intrigue draws",
  );
  assert.ok(
    doubledOrnithopterSkirmishResult.log.some((entry) =>
      entry.includes("draws 2 Intrigue cards") &&
      entry.includes("Skirmish (Ornithopter)")
    ),
    "Doubled Skirmish Ornithopter should log both Intrigue draws",
  );
  assert.ok(
    doubledOrnithopterSkirmishResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Skirmish Ornithopter should log the doubled Solari reward",
  );

  const desertMouseSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            conflict: 5,
            deployedTroops: 1,
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 453);
  const desertMouseSkirmishResult = state.startNextRound(desertMouseSkirmishReward);
  const desertMouseSkirmishWinner = playerById(desertMouseSkirmishResult, "p2");
  assert.equal(desertMouseSkirmishWinner.resources.solari, 2, "Skirmish Desert Mouse should pay first-place Solari");
  assert.equal(desertMouseSkirmishResult.pendingAction, undefined, "Skirmish Desert Mouse should not require choices");
  assert.ok(
    desertMouseSkirmishResult.log.some((entry) =>
      entry.includes("gains 2 solari") &&
      entry.includes("Skirmish (Desert Mouse)")
    ),
    "Skirmish Desert Mouse should log the paid printed reward",
  );

  const doubledDesertMouseSkirmishReward = fixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p3"
        ? {
            ...player,
            conflict: 5,
            deployedSandworms: 1,
            resources: { ...player.resources, solari: 0 },
          }
        : player,
    ), 453);
  const doubledDesertMouseSkirmishResult = state.startNextRound(doubledDesertMouseSkirmishReward);
  const doubledDesertMouseSkirmishWinner = playerById(doubledDesertMouseSkirmishResult, "p3");
  assert.equal(
    doubledDesertMouseSkirmishWinner.resources.solari,
    4,
    "Sandworms should double Skirmish Desert Mouse Solari",
  );
  assert.ok(
    doubledDesertMouseSkirmishResult.log.some((entry) =>
      entry.includes("gains 4 solari") &&
      entry.includes("sandworm doubling")
    ),
    "Doubled Skirmish Desert Mouse should log the doubled printed reward",
  );
}
