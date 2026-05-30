import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function objectiveIcons(players, team) {
  return players
    .filter((player) => player.team === team)
    .flatMap((player) => player.objectives)
    .map((objective) => objective.battleIcon)
    .sort();
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.equal(data.sixPlayerObjectiveCards.length, 4, "Six-player Objective deck should include four Ally objectives");
  assert.deepEqual(
    data.sixPlayerObjectiveCards.map((objective) => objective.battleIcon).sort(),
    ["crysknife", "crysknife", "desertMouse", "desertMouse"],
    "Six-player Objectives should be the two Crysknife and two Desert Mouse cards valid for four or six players",
  );
  assert.equal(
    data.sixPlayerObjectiveCards.filter((objective) => objective.firstPlayer).length,
    1,
    "Exactly one six-player Objective should carry the First Player marker",
  );
  assert.equal(
    data.sixPlayerObjectiveCards.find((objective) => objective.firstPlayer)?.id,
    "objective-desert-mouse-first",
    "The unmarked Desert Mouse Objective should carry the First Player marker",
  );

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const game = state.initialGame();
    assert.equal(game.players.filter((player) => player.role === "Commander" && player.objectives.length > 0).length, 0);
    assert.equal(game.players.filter((player) => player.role === "Ally" && player.objectives.length === 1).length, 4);
    assert.deepEqual(objectiveIcons(game.players, "muaddib"), ["crysknife", "desertMouse"]);
    assert.deepEqual(objectiveIcons(game.players, "shaddam"), ["crysknife", "desertMouse"]);

    const firstOwner = game.players.find((player) => player.objectives.some((objective) => objective.firstPlayer));
    assert.ok(firstOwner, "First Player Objective should be assigned to one Ally");
    assert.equal(firstOwner.role, "Ally", "Commanders should not receive the First Player Objective");
    assert.equal(game.firstSeat, game.players.findIndex((player) => player.id === firstOwner.id));
    assert.equal(game.activeSeat, game.firstSeat);
  }

  const byId = new Map(data.sixPlayerObjectiveCards.map((objective) => [objective.id, objective]));
  const desertMouseFourSix = byId.get("objective-desert-mouse-4-6p");
  const desertMouse = byId.get("objective-desert-mouse-first");
  const crysknifeOne = byId.get("objective-crysknife-1");
  const crysknifeTwo = byId.get("objective-crysknife-4-6p");
  assert.ok(desertMouseFourSix && desertMouse && crysknifeOne && crysknifeTwo, "Verifier needs all Objective cards");

  const basePlayers = state.initialGame().players.map((player) => ({ ...player, objectives: [] }));
  const shaddamImbalance = basePlayers.map((player) => {
    if (player.id === "p2") return { ...player, objectives: [desertMouseFourSix] };
    if (player.id === "p6") return { ...player, objectives: [desertMouse] };
    if (player.id === "p3") return { ...player, objectives: [crysknifeOne] };
    if (player.id === "p5") return { ...player, objectives: [crysknifeTwo] };
    return player;
  });
  const shaddamBalanced = state.balanceSixPlayerObjectives(shaddamImbalance);
  assert.deepEqual(objectiveIcons(shaddamBalanced, "muaddib"), ["crysknife", "desertMouse"]);
  assert.deepEqual(objectiveIcons(shaddamBalanced, "shaddam"), ["crysknife", "desertMouse"]);
  assert.equal(
    shaddamBalanced.find((player) => player.id === "p3")?.objectives[0].id,
    "objective-desert-mouse-4-6p",
    "The 4/6P Desert Mouse should trade to the adjacent opposing Ally",
  );

  const muadDibImbalance = basePlayers.map((player) => {
    if (player.id === "p3") return { ...player, objectives: [desertMouseFourSix] };
    if (player.id === "p5") return { ...player, objectives: [desertMouse] };
    if (player.id === "p2") return { ...player, objectives: [crysknifeOne] };
    if (player.id === "p6") return { ...player, objectives: [crysknifeTwo] };
    return player;
  });
  const muadDibBalanced = state.balanceSixPlayerObjectives(muadDibImbalance);
  assert.deepEqual(objectiveIcons(muadDibBalanced, "muaddib"), ["crysknife", "desertMouse"]);
  assert.deepEqual(objectiveIcons(muadDibBalanced, "shaddam"), ["crysknife", "desertMouse"]);
  assert.equal(
    muadDibBalanced.find((player) => player.id === "p2")?.objectives[0].id,
    "objective-desert-mouse-4-6p",
    "The 4/6P Desert Mouse should trade across when Muad'Dib's team draws both Desert Mouse cards",
  );

  const shaddamOtherSideImbalance = basePlayers.map((player) => {
    if (player.id === "p6") return { ...player, objectives: [desertMouseFourSix] };
    if (player.id === "p2") return { ...player, objectives: [desertMouse] };
    if (player.id === "p3") return { ...player, objectives: [crysknifeOne] };
    if (player.id === "p5") return { ...player, objectives: [crysknifeTwo] };
    return player;
  });
  const shaddamOtherSideBalanced = state.balanceSixPlayerObjectives(shaddamOtherSideImbalance);
  assert.deepEqual(objectiveIcons(shaddamOtherSideBalanced, "muaddib"), ["crysknife", "desertMouse"]);
  assert.deepEqual(objectiveIcons(shaddamOtherSideBalanced, "shaddam"), ["crysknife", "desertMouse"]);
  assert.equal(
    shaddamOtherSideBalanced.find((player) => player.id === "p5")?.objectives[0].id,
    "objective-desert-mouse-4-6p",
    "The other Shaddam Ally's 4/6P Desert Mouse should trade to the adjacent opposing Ally",
  );

  const muadDibOtherSideImbalance = basePlayers.map((player) => {
    if (player.id === "p5") return { ...player, objectives: [desertMouseFourSix] };
    if (player.id === "p3") return { ...player, objectives: [desertMouse] };
    if (player.id === "p2") return { ...player, objectives: [crysknifeOne] };
    if (player.id === "p6") return { ...player, objectives: [crysknifeTwo] };
    return player;
  });
  const muadDibOtherSideBalanced = state.balanceSixPlayerObjectives(muadDibOtherSideImbalance);
  assert.deepEqual(objectiveIcons(muadDibOtherSideBalanced, "muaddib"), ["crysknife", "desertMouse"]);
  assert.deepEqual(objectiveIcons(muadDibOtherSideBalanced, "shaddam"), ["crysknife", "desertMouse"]);
  assert.equal(
    muadDibOtherSideBalanced.find((player) => player.id === "p6")?.objectives[0].id,
    "objective-desert-mouse-4-6p",
    "The other Muad'Dib Ally's 4/6P Desert Mouse should trade to the adjacent opposing Ally",
  );

  console.log("objective verification passed");
} finally {
  await server.close();
}
