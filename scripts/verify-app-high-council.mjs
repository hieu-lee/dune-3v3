import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const app = await server.ssrLoadModule("/src/App.tsx");
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");

  const game = state.initialGame();
  const feyd = game.players.find((player) => player.id === "p2");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(feyd, "Verifier needs Feyd");
  assert.ok(highCouncil, "High Council should be present");

  const baseRevealPlayer = {
    ...feyd,
    hand: [
      { persuasion: 1 },
      { persuasion: 2 },
    ],
    highCouncilSeat: false,
  };
  assert.equal(
    app.revealPersuasionFor(baseRevealPlayer),
    3,
    "Reveal persuasion should sum cards without a High Council seat",
  );
  assert.equal(
    app.revealPersuasionFor({ ...baseRevealPlayer, highCouncilSeat: true }),
    5,
    "High Council seat should add 2 reveal persuasion",
  );
  assert.equal(
    app.revealPersuasionFor({ ...baseRevealPlayer, hand: [], highCouncilSeat: true }),
    2,
    "High Council reveal persuasion should apply even with an empty hand",
  );

  assert.equal(
    app.boardSpaceIntrigueGainFor(highCouncil, { ...feyd, highCouncilSeat: false }),
    0,
    "First High Council visit should not draw the repeat Intrigue reward",
  );
  assert.equal(
    app.boardSpaceIntrigueGainFor(highCouncil, { ...feyd, highCouncilSeat: true }),
    1,
    "Repeat High Council visits should draw the printed Intrigue reward",
  );

  const intrigueSpace = data.boardSpaces.find((space) => space.id !== "high-council" && (space.gain?.intrigue ?? 0) > 0);
  assert.ok(intrigueSpace, "Verifier needs another Intrigue-gaining board space");
  assert.equal(
    app.boardSpaceIntrigueGainFor(intrigueSpace, { ...feyd, highCouncilSeat: false }),
    intrigueSpace.gain.intrigue,
    "Non-High Council Intrigue rewards should be unaffected",
  );

  console.log("app High Council verification passed");
} finally {
  await server.close();
}
