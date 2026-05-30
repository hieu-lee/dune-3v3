import assert from "node:assert/strict";
import { createServer } from "vite";

const expectedConflictIcons = new Map([
  [451, "crysknife"],
  [452, "ornithopter"],
  [453, "desertMouse"],
  [454, "crysknife"],
  [455, "crysknife"],
  [456, "ornithopter"],
  [457, "crysknife"],
  [458, "ornithopter"],
  [459, "ornithopter"],
  [460, "desertMouse"],
  [461, "desertMouse"],
  [462, "desertMouse"],
  [463, "wild"],
  [464, "ornithopter"],
  [465, "crysknife"],
  [466, "desertMouse"],
]);

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  assert.deepEqual(Object.keys(data.battleIconLabels).sort(), [
    "crysknife",
    "desertMouse",
    "ornithopter",
    "wild",
  ]);
  assert.equal(data.conflictCards.length, expectedConflictIcons.size, "Expected all 16 Uprising Conflict cards");

  for (const conflict of data.conflictCards) {
    assert.ok(conflict.sourceId, `${conflict.name} should retain its source catalog id`);
    assert.equal(
      conflict.battleIcon,
      expectedConflictIcons.get(conflict.sourceId),
      `${conflict.name} should map to its printed battle icon`,
    );
  }

  assert.equal(
    data.conflictCards.find((conflict) => conflict.name === "Propaganda")?.battleIcon,
    "wild",
    "Propaganda should carry the wildcard battle icon",
  );
  assert.equal(
    data.conflictCards.find((conflict) => conflict.name === "Skirmish (Crysknife)")?.battleIcon,
    "crysknife",
  );
  assert.equal(
    data.conflictCards.find((conflict) => conflict.name === "Skirmish (Desert Mouse)")?.battleIcon,
    "desertMouse",
  );
  assert.equal(
    data.conflictCards.find((conflict) => conflict.name === "Skirmish (Ornithopter)")?.battleIcon,
    "ornithopter",
  );

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const game = state.initialGame();
    assert.ok(game.conflict, "Initial game should reveal a Conflict card");
    const conflictStack = [game.conflict, ...game.conflictDeck];
    const levels = conflictStack.map((conflict) => conflict.level);
    assert.equal(conflictStack.length, 9, "Six-player setup should build a nine-card Conflict stack");
    assert.equal(new Set(conflictStack.map((conflict) => conflict.id)).size, 9, "Conflict stack should not duplicate cards");
    assert.deepEqual(levels, [2, 2, 2, 2, 2, 3, 3, 3, 3], "Six-player setup should resolve all Conflict II cards before Conflict III cards");
    assert.equal(conflictStack.filter((conflict) => conflict.level === 2).length, 5);
    assert.equal(conflictStack.filter((conflict) => conflict.level === 3).length, 4);
    assert.equal(conflictStack.some((conflict) => conflict.level === 1), false, "Six-player setup should omit Conflict I cards");
    assert.equal(
      conflictStack.every((conflict) => expectedConflictIcons.get(conflict.sourceId) === conflict.battleIcon),
      true,
      "Every six-player Conflict should carry its printed battle icon",
    );
  }

  console.log("battle icon verification passed");
} finally {
  await server.close();
}
