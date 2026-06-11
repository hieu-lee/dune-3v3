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

  const standardPlaceGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: data.imperiumDeck.slice(0, 5).map((card, index) => ({ ...card, id: `place-hand-${index}` })),
    intrigues: [],
  }));
  const standardPlaceRoom = makeRoom(standardPlaceGame);
  const standardPlaceActions = legalActionsForSeat(standardPlaceRoom, "p2", runtime);
  assert.ok(
    standardPlaceActions.some((entry) => entry.action?.kind === "place-agent"),
    "AI legal actions should include generated place-agent actions",
  );
  assertAllActionsApply(
    standardPlaceRoom,
    "p2",
    runtime,
    standardPlaceActions,
    "AI generated place-agent actions",
  );

  const commanderPlaceGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p1", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: data.imperiumDeck.slice(0, 5).map((card, index) => ({ ...card, id: `commander-place-hand-${index}` })),
    intrigues: [],
  }));
  const commanderPlaceRoom = makeRoom(commanderPlaceGame);
  const commanderPlaceActions = legalActionsForSeat(commanderPlaceRoom, "p1", runtime);
  assert.ok(
    commanderPlaceActions.some((entry) => entry.action?.kind === "place-agent" && entry.action.commanderTargets),
    "Commander AI legal actions should include targeted place-agent actions",
  );
  assertAllActionsApply(
    commanderPlaceRoom,
    "p1",
    runtime,
    commanderPlaceActions,
    "AI generated Commander place-agent actions",
  );

  const calculusOfPower = cardNamed(data.imperiumDeck, "Calculus of Power");
  const occupiedSpyEntryGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p2", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: [{ ...calculusOfPower, id: "occupied-spy-entry-calculus" }],
    intrigues: [],
  }));
  const occupiedSpyEntryRoom = makeRoom({
    ...occupiedSpyEntryGame,
    spaces: { arrakeen: "p3" },
    spyPosts: { arrakeen: "p2" },
  });
  const occupiedSpyEntryActions = legalActionsForSeat(occupiedSpyEntryRoom, "p2", runtime);
  assert.ok(
    occupiedSpyEntryActions.some((entry) =>
      entry.action?.kind === "place-agent" &&
      entry.action.spaceId === "arrakeen" &&
      entry.action.spyEntrySpaceId === "arrakeen"
    ),
    "AI legal actions should include occupied-space spy-entry place-agent actions",
  );
  assertAllActionsApply(
    occupiedSpyEntryRoom,
    "p2",
    runtime,
    occupiedSpyEntryActions,
    "AI generated occupied-space spy-entry actions",
  );

  const commanderAllyIds = initialGame({ includeSetupPending: false }).players
    .filter((player) => player.team === "muaddib" && player.role === "Ally")
    .map((player) => player.id);
  const exhaustedCommanderPlaceGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p1", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: data.imperiumDeck.slice(0, 5).map((card, index) => ({ ...card, id: `exhausted-commander-hand-${index}` })),
    intrigues: [],
    commanderActivatedAllyIds: commanderAllyIds,
    swordmasterBonus: false,
    swordmasterAgentSpent: false,
  }));
  const exhaustedCommanderPlaceRoom = makeRoom(exhaustedCommanderPlaceGame);
  const exhaustedCommanderPlaceActions = legalActionsForSeat(exhaustedCommanderPlaceRoom, "p1", runtime);
  assert.equal(
    exhaustedCommanderPlaceActions.some((entry) => entry.action?.kind === "place-agent"),
    false,
    "Exhausted Commander AI legal actions should not include untargeted place-agent actions",
  );
  assertAllActionsApply(
    exhaustedCommanderPlaceRoom,
    "p1",
    runtime,
    exhaustedCommanderPlaceActions,
    "Exhausted Commander AI legal actions with a ready agent",
  );

  const swordmasterAllyId = commanderAllyIds[0];
  const swordmasterCommanderPlaceGame = withActivePlayer(initialGame({ includeSetupPending: false }), "p1", () => ({
    agentsReady: 1,
    revealed: false,
    resources: { spice: 8, solari: 8, water: 8 },
    hand: data.imperiumDeck.slice(0, 5).map((card, index) => ({ ...card, id: `swordmaster-commander-hand-${index}` })),
    intrigues: [],
    commanderActivatedAllyIds: [swordmasterAllyId],
    swordmasterBonus: true,
    swordmasterAgentSpent: false,
  }));
  const swordmasterCommanderPlaceRoom = makeRoom(swordmasterCommanderPlaceGame);
  const swordmasterCommanderPlaceActions = legalActionsForSeat(swordmasterCommanderPlaceRoom, "p1", runtime);
  assert.ok(
    swordmasterCommanderPlaceActions.some((entry) =>
      entry.action?.kind === "place-agent" &&
      entry.action.commanderTargets?.p1 === swordmasterAllyId
    ),
    "Swordmaster Commander AI legal actions should include a legal second Ally activation",
  );
  assertAllActionsApply(
    swordmasterCommanderPlaceRoom,
    "p1",
    runtime,
    swordmasterCommanderPlaceActions,
    "Swordmaster Commander AI generated place-agent actions",
  );

  const queuedWithoutActivePendingRoom = makeRoom({
    ...standardPlaceGame,
    pendingAction: undefined,
    pendingQueue: [{ kind: "draw-cards", ownerId: "p2", source: "Queued verifier pending", amount: 1 }],
  });
  assert.deepEqual(
    legalActionsForSeat(queuedWithoutActivePendingRoom, "p2", runtime),
    [],
    "AI legal actions should wait when a queued pending action remains without an active pending action",
  );

  console.log("AI legal action verification passed");
} finally {
  await vite.close();
}
