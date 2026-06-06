#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRoomServer } from "./room-server.mjs";
import {
  assertAiSnapshotHasNoForeignPrivateCards,
  buildAiSeatSnapshot,
  chooseAiAction,
  createAiRuntime,
  createMockAiClient,
  createOpenAiResponseClient,
  discussRoundSummary,
  nextActionSeats,
} from "./ai-team-driver.mjs";

const defaultSeats = [
  ["p1", "MuadDib AI Commander"],
  ["p2", "Feyd AI Ally"],
  ["p3", "Gurney AI Ally"],
  ["p4", "Shaddam AI Commander"],
  ["p5", "Jessica AI Ally"],
  ["p6", "Irulan AI Ally"],
];

function parseArgs(argv) {
  const flags = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=");
    flags.set(key, value);
  }
  return {
    mock: flags.get("mock") === "true",
    maxSteps: Number(flags.get("max-steps") ?? 900),
    port: Number(flags.get("port") ?? 0),
    outDir: flags.get("out") ?? "artifacts/qa/ai-room-monitor",
    model: flags.get("model"),
    reasoningEffort: flags.get("reasoning-effort"),
    storageFile: flags.get("storage-file"),
    assertPrivacy: flags.get("assert-privacy") !== "false",
    aiTeam: flags.get("ai-team") ?? "all",
    waitMs: Number(flags.get("wait-ms") ?? 2_000),
  };
}

async function jsonFetch(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => undefined);
  return { response, body };
}

async function claimSeat(baseUrl, roomId, playerId, name) {
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}/seats/${playerId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-room-sync": "poll" },
    body: JSON.stringify({ name }),
  });
  assert.equal(response.status, 200, `AI seat ${playerId} should be claimable: ${JSON.stringify(body)}`);
  return body.token;
}

async function seatSnapshot(baseUrl, roomId, token) {
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}`, {
    headers: { "x-room-token": token, "x-room-sync": "poll" },
  });
  assert.equal(response.status, 200, `AI seat snapshot should load: ${JSON.stringify(body)}`);
  return body;
}

async function roomAction(baseUrl, roomId, playerId, token, action) {
  const current = await seatSnapshot(baseUrl, roomId, token);
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-room-token": token,
    },
    body: JSON.stringify({ baseVersion: current.version, action }),
  });
  return { response, body };
}

function teamsFromGame(game) {
  return [...new Set(game.players.map((player) => player.team))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildTeamSeatSnapshots({
  baseUrl,
  room,
  roomId,
  runtime,
  tokenByPlayerId,
  teamId,
  previousSummary,
  assertPrivacy,
}) {
  const teamPlayers = room.game.players.filter((player) => player.team === teamId);
  const snapshots = [];
  for (const player of teamPlayers) {
    const roomSnapshot = await seatSnapshot(baseUrl, roomId, tokenByPlayerId.get(player.id));
    const legalActions = runtime ? nextActionSeats(room, runtime).find((entry) => entry.player.id === player.id)?.legalActions ?? [] : [];
    const aiSnapshot = buildAiSeatSnapshot({ roomSnapshot, teamId, previousSummary, legalActions });
    if (assertPrivacy) assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, room.game);
    snapshots.push(aiSnapshot);
  }
  return snapshots;
}

async function discussAllTeams({
  baseUrl,
  room,
  roomId,
  runtime,
  tokenByPlayerId,
  teamSummaries,
  aiClient,
  assertPrivacy,
  controlledTeamIds,
}) {
  const results = {};
  for (const teamId of teamsFromGame(room.game).filter((teamId) => controlledTeamIds.has(teamId))) {
    const seatSnapshots = await buildTeamSeatSnapshots({
      baseUrl,
      room,
      roomId,
      runtime,
      tokenByPlayerId,
      teamId,
      previousSummary: teamSummaries[teamId] ?? "",
      assertPrivacy,
    });
    const discussion = await discussRoundSummary({
      aiClient,
      teamId,
      previousSummary: teamSummaries[teamId] ?? "",
      seatSnapshots,
    });
    teamSummaries[teamId] = discussion.summary;
    results[teamId] = discussion;
  }
  return results;
}

async function chooseAndApplyAiStep({
  baseUrl,
  roomId,
  runtime,
  aiClient,
  tokenByPlayerId,
  teamSummaries,
  actionLog,
  assertPrivacy,
  aiPlayerIds,
}) {
  const room = runtime.server.rooms.get(roomId);
  assert.ok(room, `Expected room ${roomId}`);
  const allCandidates = nextActionSeats(room, runtime);
  const candidates = allCandidates.filter((entry) => aiPlayerIds.has(entry.player.id));
  if (candidates.length === 0) {
    const activePlayerId = room.game.players[room.game.activeSeat]?.id;
    const aiResolvers = room.game.players
      .filter((player) => aiPlayerIds.has(player.id) && runtime.actions.roomPendingActionCanResolve(room.game, player.id))
      .map((player) => player.id);
    const aiExpectedToAct =
      aiResolvers.length > 0 ||
      ((room.game.phase === "playing" || room.game.phase === "combat") && aiPlayerIds.has(activePlayerId)) ||
      (room.game.phase === "endgame" && room.game.players.some((player) => aiPlayerIds.has(player.id) && !room.endgameReady?.[player.id]));
    return {
      error: aiExpectedToAct ? "AI controlled seat has no generated legal actions" : "Waiting for human-controlled seat",
      waitForHuman: !aiExpectedToAct,
      phase: room.game.phase,
      round: room.game.round,
      activeSeat: room.game.activeSeat,
      activePlayerId,
      agentTurnComplete: room.game.agentTurnComplete,
      pendingKind: room.game.pendingAction?.kind,
      pendingQueueKinds: room.game.pendingQueue.map((pending) => pending.kind),
      pendingAiResolverIds: aiResolvers,
      humanCandidateIds: allCandidates.filter((entry) => !aiPlayerIds.has(entry.player.id)).map((entry) => entry.player.id),
    };
  }
  const candidate = candidates[0];
  const player = candidate.player;
  const invalidActionIds = new Set();
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const roomSnapshot = await seatSnapshot(baseUrl, roomId, tokenByPlayerId.get(player.id));
    const legalActions = candidate.legalActions.filter((action) => !invalidActionIds.has(action.id));
    if (legalActions.length === 0) {
      throw new Error(JSON.stringify({
        error: "AI retry exhausted generated legal actions",
        playerId: player.id,
        phase: room.game.phase,
        round: room.game.round,
        pendingKind: room.game.pendingAction?.kind,
        invalidActionIds: [...invalidActionIds],
        lastError,
      }, null, 2));
    }
    const aiSnapshot = buildAiSeatSnapshot({
      roomSnapshot,
      teamId: player.team,
      previousSummary: teamSummaries[player.team] ?? "",
      legalActions,
      note: lastError ? `Previous action attempt failed: ${lastError}` : undefined,
    });
    if (assertPrivacy) assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, room.game);
    const selected = await chooseAiAction({ aiClient, snapshot: aiSnapshot, legalActions, invalidActionIds });
    const { response, body } = await roomAction(baseUrl, roomId, player.id, tokenByPlayerId.get(player.id), selected.action.action);
    if (response.status === 200) {
      actionLog.push({
        step: actionLog.length + 1,
        round: body.snapshot.game.round,
        phase: body.snapshot.game.phase,
        playerId: player.id,
        team: player.team,
        actionId: selected.action.id,
        label: selected.action.label,
        reason: selected.reason,
        version: body.snapshot.version,
      });
      return body.snapshot;
    }
    invalidActionIds.add(selected.action.id);
    lastError = `${response.status} ${JSON.stringify(body)}`;
  }
  throw new Error(`AI failed after retries for ${player.id}: ${lastError}`);
}

function finalTeamScores(game) {
  return Object.fromEntries(
    teamsFromGame(game).map((teamId) => [
      teamId,
      game.players.filter((player) => player.team === teamId).reduce((sum, player) => sum + player.vp, 0),
    ]),
  );
}

export async function runAiRoomMonitor({
  mock = false,
  maxSteps = 900,
  port = 0,
  outDir = "artifacts/qa/ai-room-monitor",
  model,
  reasoningEffort,
  storageFile,
  assertPrivacy = true,
  aiTeam = "all",
  waitMs = 2_000,
  server: providedServer,
  aiClient: providedAiClient,
} = {}) {
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });

  const server = providedServer ?? await createRoomServer({
    port,
    log: false,
    storageFile: storageFile ?? join(outDir, "rooms.json"),
  });
  const ownsServer = !providedServer;
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
  const runtime = await createAiRuntime(server);
  const aiClient = providedAiClient ?? (mock
    ? createMockAiClient()
    : createOpenAiResponseClient({ model, reasoningEffort }));
  const tokenByPlayerId = new Map();
  const actionLog = [];
  const discussions = [];
  const teamSummaries = {};
  const normalizedAiTeam = aiTeam === "all" ? "all" : aiTeam;

  try {
    const created = await jsonFetch(baseUrl, "/api/rooms", { method: "POST" });
    assert.equal(created.response.status, 201, `AI monitor room creation should succeed: ${JSON.stringify(created.body)}`);
    const roomId = created.body.roomId;
    const initialRoom = server.rooms.get(roomId);
    assert.ok(initialRoom, `Expected created room ${roomId}`);
    const teamIds = teamsFromGame(initialRoom.game);
    if (normalizedAiTeam !== "all" && !teamIds.includes(normalizedAiTeam)) {
      throw new Error(`Unknown AI team "${normalizedAiTeam}". Expected one of: all, ${teamIds.join(", ")}`);
    }
    const controlledTeamIds = new Set(normalizedAiTeam === "all" ? teamIds : [normalizedAiTeam]);
    const aiPlayerIds = new Set(
      initialRoom.game.players
        .filter((player) => controlledTeamIds.has(player.team))
        .map((player) => player.id),
    );
    const humanSeats = initialRoom.game.players
      .filter((player) => !aiPlayerIds.has(player.id))
      .map((player) => ({ playerId: player.id, team: player.team, leader: player.leader, role: player.role }));

    for (const [playerId, name] of defaultSeats) {
      if (!aiPlayerIds.has(playerId)) continue;
      tokenByPlayerId.set(playerId, await claimSeat(baseUrl, roomId, playerId, name));
    }
    if (humanSeats.length > 0) {
      console.log(`AI team monitor room: ${server.resolvedUrls.local[0]}?room=${roomId}`);
      console.log(`Human seats: ${humanSeats.map((seat) => `${seat.playerId}/${seat.leader}`).join(", ")}`);
    }

    let lastDiscussedCompletedRound = 0;
    for (let step = 1; step <= maxSteps; step += 1) {
      const room = server.rooms.get(roomId);
      assert.ok(room, `Expected room ${roomId}`);

      if (room.game.phase === "finished") {
        const summary = {
          roomId,
          mock,
          model: aiClient.model,
          reasoningEffort: aiClient.reasoningEffort,
          finalPhase: room.game.phase,
          finalRound: room.game.round,
          finalTeamScores: finalTeamScores(room.game),
          finalWinningTeam: room.game.winningTeam ?? null,
          actionCount: actionLog.length,
          discussionCount: discussions.length,
          teamSummaries,
          aiTeam: normalizedAiTeam,
          humanSeats,
          url: server.resolvedUrls.local[0],
          roomUrl: `${server.resolvedUrls.local[0]}?room=${roomId}`,
        };
        await writeFile(join(outDir, "actions.json"), JSON.stringify(actionLog, null, 2));
        await writeFile(join(outDir, "discussions.json"), JSON.stringify(discussions, null, 2));
        await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
        return { summary, actionLog, discussions, server: ownsServer ? undefined : server };
      }

      const completedRound = room.game.round - 1;
      if (completedRound > lastDiscussedCompletedRound && room.game.phase === "playing") {
        const result = await discussAllTeams({
          baseUrl,
          room,
          roomId,
          runtime,
          tokenByPlayerId,
          teamSummaries,
          aiClient,
          assertPrivacy,
          controlledTeamIds,
        });
        discussions.push({ completedRound, nextRound: room.game.round, result });
        lastDiscussedCompletedRound = completedRound;
      }

      const stepResult = await chooseAndApplyAiStep({
        baseUrl,
        roomId,
        runtime,
        aiClient,
        tokenByPlayerId,
        teamSummaries,
        actionLog,
        assertPrivacy,
        aiPlayerIds,
      });
      if (stepResult?.error) {
        if (normalizedAiTeam === "all" || !stepResult.waitForHuman) {
          throw new Error(JSON.stringify(stepResult, null, 2));
        }
        await sleep(waitMs);
        step -= 1;
      }
    }

    throw new Error(`AI room monitor did not finish within ${maxSteps} steps`);
  } finally {
    if (ownsServer) await server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  const result = await runAiRoomMonitor(options);
  console.log("AI room monitor passed");
  console.log(`mode: ${options.mock ? "mock" : "openai"}`);
  console.log(`final phase: ${result.summary.finalPhase}`);
  console.log(`final round: ${result.summary.finalRound}`);
  console.log(`team scores: ${JSON.stringify(result.summary.finalTeamScores)}`);
  console.log(`winning team: ${result.summary.finalWinningTeam ?? "tie"}`);
  console.log(`actions: ${result.summary.actionCount}`);
  console.log(`discussions: ${result.summary.discussionCount}`);
  console.log(`ai team: ${result.summary.aiTeam}`);
  console.log(`room url: ${result.summary.roomUrl}`);
  if (result.summary.humanSeats.length > 0) {
    console.log(`human seats: ${result.summary.humanSeats.map((seat) => `${seat.playerId}/${seat.leader}`).join(", ")}`);
  }
  console.log(`summary: ${join(options.outDir, "summary.json")}`);
}
