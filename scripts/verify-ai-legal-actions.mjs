#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { createAiRuntime, legalActionsForSeat } from "./ai-team-driver.mjs";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";

function cardNamed(cards, name) {
  const card = cards.find((candidate) => candidate.name === name);
  assert.ok(card, `Expected ${name}`);
  return card;
}

function makeRoom(game) {
  return {
    id: "VERIFY-AI-LEGAL-ACTIONS",
    version: 1,
    started: true,
    createdAt: 1,
    updatedAt: 1,
    game,
    endgameReady: {},
    seats: {},
  };
}

function hasPlotCommand(legalActions, expectedCommand) {
  return legalActions.some((entry) =>
    entry.action?.kind === "plot-intrigue" &&
    JSON.stringify(entry.action.command) === JSON.stringify(expectedCommand)
  );
}

function assertAllActionsApply(room, playerId, runtime, legalActions, label) {
  const invalid = legalActions.filter((entry) => {
    try {
      runtime.actions.applyRoomAction(room.game, playerId, entry.action);
      return false;
    } catch {
      return true;
    }
  });
  assert.deepEqual(
    invalid.map((entry) => ({ id: entry.id, action: entry.action })),
    [],
    `${label} should only enumerate actions accepted by the room reducer`,
  );
}

const vite = await createViteServer({ appType: "spa", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { initialGame } = await vite.ssrLoadModule("/src/game/state.ts");
  const data = await vite.ssrLoadModule("/src/game/data.ts");
  const runtime = await createAiRuntime(vite);

  const opportunism = cardNamed(data.intrigueCards, "Opportunism");
  const changeAllegiances = cardNamed(data.intrigueCards, "Change Allegiances");
  const game = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 3, solari: 3, water: 0 },
    influence: {
      emperor: 0,
      spacing: 1,
      bene: 2,
      fremen: 0,
      greatHouses: 1,
      fringeWorlds: 0,
    },
    hand: [],
    intrigues: [opportunism, changeAllegiances],
  }));
  const room = makeRoom(game);

  const legalOpportunismSameFaction = {
    kind: "plot-intrigue",
    command: { kind: "opportunism", intrigueId: opportunism.id, choice: ["bene", "bene"] },
  };
  assert.notEqual(
    runtime.actions.applyRoomAction(room.game, "p2", legalOpportunismSameFaction),
    room.game,
    "same-faction Opportunism should be a legal room action",
  );

  const legalChangeAllegiancesBoth = {
    kind: "plot-intrigue",
    command: {
      kind: "change-allegiances",
      intrigueId: changeAllegiances.id,
      choice: {
        kind: "both",
        loseFaction: "greatHouses",
        shiftGainFaction: "bene",
        spiceGainFaction: "spacing",
      },
    },
  };
  assert.notEqual(
    runtime.actions.applyRoomAction(room.game, "p2", legalChangeAllegiancesBoth),
    room.game,
    "combined Change Allegiances should be a legal room action",
  );

  const legalActions = legalActionsForSeat(room, "p2", runtime);
  assert.equal(
    hasPlotCommand(legalActions, legalOpportunismSameFaction.command),
    true,
    "AI legal actions should include same-faction Opportunism choices",
  );
  assert.equal(
    hasPlotCommand(legalActions, legalChangeAllegiancesBoth.command),
    true,
    "AI legal actions should include combined Change Allegiances choices",
  );
  assertAllActionsApply(room, "p2", runtime, legalActions, "Ally AI legal actions");

  const exhaustedCommanderBaseGame = initialGame({ includeSetupPending: false });
  const exhaustedCommanderAllyIds = exhaustedCommanderBaseGame.players
    .filter((player) => player.team === "muaddib" && player.role === "Ally")
    .map((player) => player.id);
  const exhaustedCommanderGame = withActivePlayer(exhaustedCommanderBaseGame, "p1", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 3, solari: 3, water: 0 },
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 0,
      fremen: 1,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    hand: [],
    intrigues: [changeAllegiances],
    commanderActivatedAllyIds: exhaustedCommanderAllyIds,
    swordmasterBonus: false,
    swordmasterAgentSpent: false,
  }));
  const exhaustedCommanderRoom = makeRoom(exhaustedCommanderGame);
  const exhaustedCommanderActions = legalActionsForSeat(exhaustedCommanderRoom, "p1", runtime);
  assertAllActionsApply(
    exhaustedCommanderRoom,
    "p1",
    runtime,
    exhaustedCommanderActions,
    "Commander AI legal actions without an available Ally activation",
  );

  const revealedCommanderGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p1", () => ({
    agentsReady: 0,
    revealed: true,
    resources: { spice: 3, solari: 3, water: 0 },
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 0,
      fremen: 1,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    hand: [],
    intrigues: [changeAllegiances],
    revealActivatedAllyId: "p5",
  }));
  const revealedCommanderWithAllyInfluence = {
    ...revealedCommanderGame,
    players: revealedCommanderGame.players.map((player) =>
      player.id === "p5"
        ? {
            ...player,
            influence: {
              ...player.influence,
              greatHouses: 1,
            },
          }
        : player
    ),
  };
  const revealedCommanderRoom = makeRoom(revealedCommanderWithAllyInfluence);
  const legalRevealedCommanderChange = {
    kind: "plot-intrigue",
    command: {
      kind: "change-allegiances",
      intrigueId: changeAllegiances.id,
      choice: {
        kind: "shift",
        loseFaction: "greatHouses",
        gainFaction: "fremen",
      },
    },
  };
  assert.notEqual(
    runtime.actions.applyRoomAction(revealedCommanderRoom.game, "p1", legalRevealedCommanderChange),
    revealedCommanderRoom.game,
    "revealed Commander Change Allegiances should use the locked reveal Ally for routed Influence losses",
  );
  const revealedCommanderActions = legalActionsForSeat(revealedCommanderRoom, "p1", runtime);
  assert.equal(
    hasPlotCommand(revealedCommanderActions, legalRevealedCommanderChange.command),
    true,
    "AI legal actions should include revealed Commander Change Allegiances choices routed through the locked Ally",
  );
  assertAllActionsApply(
    revealedCommanderRoom,
    "p1",
    runtime,
    revealedCommanderActions,
    "Revealed Commander AI legal actions",
  );

  console.log("AI legal action verification passed");
} finally {
  await vite.close();
}
