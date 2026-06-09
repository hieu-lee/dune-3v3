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
    timeoutMs: Number(flags.get("timeout-ms") ?? 120_000),
    maxRetries: Number(flags.get("max-retries") ?? 5),
    retryBaseMs: Number(flags.get("retry-base-ms") ?? 1_000),
    storageFile: flags.get("storage-file"),
    assertPrivacy: flags.get("assert-privacy") !== "false",
    aiTeam: flags.get("ai-team") ?? "all",
    waitMs: Number(flags.get("wait-ms") ?? 2_000),
    verbose: flags.get("verbose") === "true",
  };
}

async function jsonFetch(baseUrl, path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      const body = await response.json().catch(() => undefined);
      return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await sleep(50 * attempt);
    }
  }
  throw lastError;
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

async function startRoom(baseUrl, roomId, token) {
  const { response, body } = await jsonFetch(baseUrl, `/api/rooms/${roomId}/start`, {
    method: "POST",
    headers: { "x-room-token": token, "x-room-sync": "poll" },
  });
  assert.equal(response.status, 200, `AI monitor room should start: ${JSON.stringify(body)}`);
  return body.snapshot;
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

function canGenerateCommanderSummary(aiClient) {
  return typeof aiClient.responsesCreate === "function"
    || (typeof aiClient.proposeSummary === "function" && typeof aiClient.voteSummary === "function");
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => first.localeCompare(second)));
}

function publicCardName(card) {
  if (!card) return undefined;
  return card.name ?? card.id;
}

function placementOwnerId(placement) {
  if (!placement) return undefined;
  return typeof placement === "string" ? placement : placement.playerId;
}

function placementCardName(placement) {
  if (!placement || typeof placement === "string") return undefined;
  return publicCardName(placement.card);
}

function definedEntries(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function compactMonitorPendingAction(pending) {
  if (!pending) return undefined;
  return definedEntries({
    kind: pending.kind,
    ownerId: pending.ownerId,
    actorId: pending.actorId,
    partnerId: pending.partnerId,
    team: pending.team,
    source: pending.source,
    optional: pending.optional,
    remaining: pending.remaining,
    combatRecipientId: pending.combatRecipientId,
    spaceId: pending.spaceId,
    spaceIds: pending.spaceIds,
    placementIcon: pending.placementIcon,
    placementIcons: pending.placementIcons,
    allowSharedPost: pending.allowSharedPost,
    recallForSupply: pending.recallForSupply,
    mustPlaceSpy: pending.mustPlaceSpy,
    drawCards: pending.drawCards,
    drawIntrigues: pending.drawIntrigues,
    strength: pending.strength,
    persuasionReward: pending.persuasionReward,
    removeShieldWall: pending.removeShieldWall,
    resources: pending.resources,
    cost: pending.cost,
    gain: pending.gain,
    choices: pending.choices?.map((choice) => definedEntries({
      id: choice.id,
      optionId: choice.optionId,
      label: choice.label,
      faction: choice.faction,
      ownerId: choice.ownerId,
      choice: choice.choice,
    })),
  });
}

function playerMonitorStatus(player) {
  return {
    id: player.id,
    leader: player.leader,
    team: player.team,
    role: player.role,
    vp: player.vp,
    resources: player.resources,
    influence: player.influence,
    agentsReady: player.agentsReady,
    agentsTotal: player.agentsTotal,
    garrison: player.garrison,
    conflict: player.conflict,
    deployedTroops: player.deployedTroops,
    deployedSandworms: player.deployedSandworms,
    spies: player.spies,
    revealed: player.revealed,
    persuasion: player.persuasion,
    highCouncilSeat: player.highCouncilSeat,
    handCount: player.hand.length,
    intrigueCount: player.intrigues.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
    playArea: player.playArea.map(publicCardName),
    discardTop: player.discard.slice(-3).map(publicCardName),
    contracts: player.contracts.map((contract) => ({
      name: contract.card.name,
      completed: contract.completed,
      takenRound: contract.takenRound,
    })),
  };
}

function compactGameStatus(game) {
  return {
    round: game.round,
    phase: game.phase,
    activePlayerId: game.players[game.activeSeat]?.id,
    firstPlayerId: game.players[game.firstSeat]?.id,
    agentTurnComplete: game.agentTurnComplete,
    pendingAction: compactMonitorPendingAction(game.pendingAction),
    pendingQueueKinds: game.pendingQueue.map((pending) => pending.kind),
    teamScores: finalTeamScores(game),
    conflict: game.conflict
      ? {
          id: game.conflict.id,
          name: game.conflict.name,
          level: game.conflict.level,
          battleIcon: game.conflict.battleIcon,
          stakes: game.conflict.stakes,
        }
      : undefined,
    publicMarkets: {
      imperiumRow: game.imperiumRow.map(publicCardName),
      reserveMarket: game.reserveMarket.map(publicCardName),
      throneRow: game.throneRow.map(publicCardName),
      contractOffer: game.contractOffer.map(publicCardName),
    },
    boardOccupancy: Object.fromEntries(
      Object.entries(game.spaces ?? {}).map(([spaceId, placement]) => [
        spaceId,
        {
          playerId: placementOwnerId(placement),
          cardName: placementCardName(placement),
          coOwnerIds: game.agentPlacementCoOwners?.[spaceId] ?? [],
        },
      ]),
    ),
    spyPosts: game.spyPosts,
    sharedSpyPosts: game.sharedSpyPosts,
    players: game.players.map(playerMonitorStatus),
  };
}

function trackedPlayerFields(player) {
  return {
    vp: player.vp,
    spice: player.resources.spice,
    solari: player.resources.solari,
    water: player.resources.water,
    emperorInfluence: player.influence.emperor,
    spacingInfluence: player.influence.spacing,
    beneInfluence: player.influence.bene,
    fremenInfluence: player.influence.fremen,
    greatHousesInfluence: player.influence.greatHouses,
    fringeWorldsInfluence: player.influence.fringeWorlds,
    agentsReady: player.agentsReady,
    garrison: player.garrison,
    conflict: player.conflict,
    deployedTroops: player.deployedTroops,
    deployedSandworms: player.deployedSandworms,
    spies: player.spies,
    persuasion: player.persuasion,
    handCount: player.hand.length,
    intrigueCount: player.intrigues.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
  };
}

function playerStatusDeltas(beforeGame, afterGame) {
  const beforeById = new Map(beforeGame.players.map((player) => [player.id, player]));
  return afterGame.players.flatMap((afterPlayer) => {
    const beforePlayer = beforeById.get(afterPlayer.id);
    if (!beforePlayer) return [];
    const before = trackedPlayerFields(beforePlayer);
    const after = trackedPlayerFields(afterPlayer);
    const changes = Object.fromEntries(
      Object.keys(after)
        .filter((key) => before[key] !== after[key])
        .map((key) => [key, { before: before[key], after: after[key], delta: after[key] - before[key] }]),
    );
    return Object.keys(changes).length > 0
      ? [{ playerId: afterPlayer.id, leader: afterPlayer.leader, team: afterPlayer.team, role: afterPlayer.role, changes }]
      : [];
  });
}

function newLogsAfter(beforeGame, afterGame) {
  const added = Math.max(0, afterGame.log.length - beforeGame.log.length);
  return afterGame.log.slice(0, added);
}

function legalActionKind(entry) {
  const action = entry.action;
  if (!action) return "unknown";
  if (action.kind === "pending") return `pending:${action.command?.kind ?? "unknown"}`;
  if (action.kind === "plot-intrigue") return `plot:${action.command?.kind ?? "unknown"}`;
  if (action.kind === "play-combat-intrigue") return `combat:${action.combatChoice ? "choice" : "auto"}`;
  if (action.kind === "place-agent" && action.spyEntrySpaceId) return "place-agent:spy-entry";
  return action.kind ?? "unknown";
}

function pendingRecallSpyInteraction(pendingAction) {
  if (pendingAction?.kind !== "recall-spy") return "pending-recall";
  if ((pendingAction.drawCards ?? 0) > 0) return "visited-location-draw";
  if ((pendingAction.drawIntrigues ?? 0) > 0) return "intrigue-draw-recall";
  if ((pendingAction.strength ?? 0) > 0) return "strength-recall";
  if ((pendingAction.persuasionReward ?? 0) > 0) return "persuasion-recall";
  if (pendingAction.removeShieldWall) return "shield-wall-recall";
  if (pendingAction.resources || pendingAction.gain) return "resource-recall";
  return "pending-recall";
}

function spyOfferKind(entry, pendingAction) {
  if (entry.spyInteraction) return entry.spyInteraction;
  const action = entry.action;
  if (action?.kind === "place-agent" && action.spyEntrySpaceId) return "occupied-entry";
  if (action?.kind === "pending" && action.command?.kind === "recall-spy") return pendingRecallSpyInteraction(pendingAction);
  if (action?.kind === "pending" && action.command?.kind === "recall-spy-for-supply") return "recall-for-supply";
  if (action?.kind === "pending" && action.command?.kind === "place-spy") return "pending-place";
  if (action?.kind === "plot-intrigue" && action.command?.choice?.kind === "recall-spy") return "plot-recall";
  if (action?.kind === "plot-intrigue" && action.command?.choice?.kind === "place-spy") return "plot-place";
  return undefined;
}

export function monitorLegalAction(entry, pendingAction) {
  const spyInteraction = spyOfferKind(entry, pendingAction);
  return definedEntries({
    id: entry.id,
    label: entry.label,
    playerId: entry.playerId,
    kind: legalActionKind(entry),
    action: entry.action,
    spyInteraction,
  });
}

function classifySpyLog(message) {
  if (/recalls a spy from .* to enter occupied /.test(message)) return "occupied-entry";
  if (/recalls a spy from .* for .* visit, drawing 1 card\./.test(message)) return "visited-location-draw";
  if (/recalls a spy from .* adding \d+ strength/.test(message)) return "strength-recall";
  if (/recalls a spy from /.test(message)) return "other-recall";
  if (/places a spy near /.test(message)) return "place-spy";
  return undefined;
}

function cappedExamples(existing, value, limit = 8) {
  const next = existing ?? [];
  if (next.length < limit && value) next.push(value);
  return next;
}

function buildMonitorReport({ summary, decisionLog, discussions, finalGame }) {
  const allOffers = decisionLog.flatMap((entry) => entry.legalActions ?? []);
  const selectedActions = decisionLog
    .map((entry) => entry.selectedAction)
    .filter(Boolean);
  const allNewLogs = decisionLog.flatMap((entry) => entry.newLogs ?? []);
  const spyOfferCounts = {};
  const spySelectedCounts = {};
  const spyLogCounts = {};
  const spyLogExamples = {};

  for (const offer of allOffers) {
    const kind = spyOfferKind(offer);
    if (!kind) continue;
    spyOfferCounts[kind] = (spyOfferCounts[kind] ?? 0) + 1;
  }
  for (const action of selectedActions) {
    const kind = spyOfferKind(action);
    if (!kind) continue;
    spySelectedCounts[kind] = (spySelectedCounts[kind] ?? 0) + 1;
  }
  for (const message of allNewLogs) {
    const kind = classifySpyLog(message);
    if (!kind) continue;
    spyLogCounts[kind] = (spyLogCounts[kind] ?? 0) + 1;
    spyLogExamples[kind] = cappedExamples(spyLogExamples[kind], message);
  }

  return {
    schema: "dune-3v3-ai-monitor-report-v1",
    summary,
    decisionCount: decisionLog.length,
    discussionCount: discussions.length,
    selectedActionKindCounts: countBy(selectedActions, legalActionKind),
    legalOfferKindCounts: countBy(allOffers, legalActionKind),
    phaseActionCounts: countBy(decisionLog, (entry) => entry.phase),
    playerActionCounts: countBy(decisionLog, (entry) => `${entry.playerId}/${entry.leader}`),
    pendingKindCounts: countBy(
      decisionLog.filter((entry) => entry.pendingAction?.kind),
      (entry) => entry.pendingAction.kind,
    ),
    selectedNotOfferedCount: decisionLog.filter((entry) => entry.selectedActionWasLegal !== true).length,
    retryCount: decisionLog.reduce((total, entry) => total + (entry.failedAttempts?.length ?? 0), 0),
    spyInteractions: {
      offerCounts: Object.fromEntries(Object.entries(spyOfferCounts).sort(([first], [second]) => first.localeCompare(second))),
      selectedCounts: Object.fromEntries(Object.entries(spySelectedCounts).sort(([first], [second]) => first.localeCompare(second))),
      logCounts: Object.fromEntries(Object.entries(spyLogCounts).sort(([first], [second]) => first.localeCompare(second))),
      logExamples: spyLogExamples,
    },
    finalStatus: compactGameStatus(finalGame),
  };
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
  if (!canGenerateCommanderSummary(aiClient)) {
    return results;
  }
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
  decisionLog,
  assertPrivacy,
  aiPlayerIds,
  log,
}) {
  const invalidActionIds = new Set();
  let lastError;
  let retryPlayerId;
  let failedAttempts = [];

  for (let attempt = 1; attempt <= 5; attempt += 1) {
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
    if (retryPlayerId !== player.id) {
      invalidActionIds.clear();
      failedAttempts = [];
      retryPlayerId = player.id;
    }
    const beforeGame = structuredClone(room.game);
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
    const pendingAction = compactMonitorPendingAction(beforeGame.pendingAction);
    const monitoredLegalActions = legalActions.map((entry) => monitorLegalAction(entry, beforeGame.pendingAction));
    const decisionBase = {
      step: actionLog.length + 1,
      round: beforeGame.round,
      phase: beforeGame.phase,
      playerId: player.id,
      leader: player.leader,
      team: player.team,
      role: player.role,
      activePlayerId: beforeGame.players[beforeGame.activeSeat]?.id,
      pendingAction,
      legalActionCount: monitoredLegalActions.length,
      legalActionKindCounts: countBy(monitoredLegalActions, legalActionKind),
      legalActions: monitoredLegalActions,
      gameStatusBefore: compactGameStatus(beforeGame),
    };
    const aiSnapshot = buildAiSeatSnapshot({
      roomSnapshot,
      teamId: player.team,
      previousSummary: teamSummaries[player.team] ?? "",
      legalActions,
      note: lastError ? `Previous action attempt failed: ${lastError}` : undefined,
    });
    if (assertPrivacy) assertAiSnapshotHasNoForeignPrivateCards(aiSnapshot, room.game);
    log?.(`step ${actionLog.length + 1} r${room.game.round} ${room.game.phase} ${player.id}/${player.leader} legal=${legalActions.length} attempt=${attempt}`);
    const selected = await chooseAiAction({ aiClient, snapshot: aiSnapshot, legalActions, invalidActionIds });
    const { response, body } = await roomAction(baseUrl, roomId, player.id, tokenByPlayerId.get(player.id), selected.action.action);
    if (response.status === 200) {
      log?.(`applied ${player.id}: ${selected.action.label}`);
      const selectedAction = monitorLegalAction(selected.action, beforeGame.pendingAction);
      const afterGame = body.snapshot.game;
      const logs = newLogsAfter(beforeGame, afterGame);
      actionLog.push({
        step: actionLog.length + 1,
        round: body.snapshot.game.round,
        phase: body.snapshot.game.phase,
        playerId: player.id,
        team: player.team,
        actionId: selected.action.id,
        label: selected.action.label,
        kind: legalActionKind(selected.action),
        spyInteraction: selectedAction.spyInteraction,
        reason: selected.reason,
        legalActionCount: monitoredLegalActions.length,
        newLogs: logs,
        version: body.snapshot.version,
      });
      decisionLog.push({
        ...decisionBase,
        attempt,
        selectedActionId: selected.action.id,
        selectedAction,
        selectedActionWasLegal: monitoredLegalActions.some((action) => action.id === selected.action.id),
        reason: selected.reason,
        failedAttempts,
        newLogs: logs,
        playerDeltas: playerStatusDeltas(beforeGame, afterGame),
        gameStatusAfter: compactGameStatus(afterGame),
        version: body.snapshot.version,
      });
      return body.snapshot;
    }
    lastError = `${response.status} ${JSON.stringify(body)}`;
    if (response.status === 409 && body?.error === "Room state changed; refresh and try again") {
      continue;
    }
    invalidActionIds.add(selected.action.id);
    failedAttempts.push({
      attempt,
      actionId: selected.action.id,
      label: selected.action.label,
      status: response.status,
      error: body?.error ?? body,
    });
  }
  throw new Error(`AI failed after retries: ${lastError}`);
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
  timeoutMs = 120_000,
  maxRetries = 5,
  retryBaseMs = 1_000,
  storageFile,
  assertPrivacy = true,
  aiTeam = "all",
  waitMs = 2_000,
  verbose = false,
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
  const log = verbose ? (message) => console.log(`[ai-monitor] ${message}`) : () => {};
  const aiClient = providedAiClient ?? (mock
    ? createMockAiClient()
    : createOpenAiResponseClient({
        model,
        reasoningEffort,
        timeoutMs,
        maxRetries,
        retryBaseMs,
        log: verbose ? (message) => console.log(`[openai] ${message}`) : undefined,
      }));
  const tokenByPlayerId = new Map();
  const actionLog = [];
  const decisionLog = [];
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
    if (normalizedAiTeam === "all") {
      const starterToken = tokenByPlayerId.values().next().value;
      assert.ok(starterToken, "AI monitor should have a claimed seat token before starting the room");
      await startRoom(baseUrl, roomId, starterToken);
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
          artifacts: {
            actions: "actions.json",
            decisions: "decisions.json",
            discussions: "discussions.json",
            monitorReport: "monitor-report.json",
            roomStorage: "rooms.json",
          },
        };
        const monitorReport = buildMonitorReport({ summary, decisionLog, discussions, finalGame: room.game });
        await writeFile(join(outDir, "actions.json"), JSON.stringify(actionLog, null, 2));
        await writeFile(join(outDir, "decisions.json"), JSON.stringify(decisionLog, null, 2));
        await writeFile(join(outDir, "discussions.json"), JSON.stringify(discussions, null, 2));
        await writeFile(join(outDir, "monitor-report.json"), JSON.stringify(monitorReport, null, 2));
        await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
        return { summary, actionLog, decisionLog, discussions, monitorReport, server: ownsServer ? undefined : server };
      }

      const completedRound = room.game.round - 1;
      if (completedRound > lastDiscussedCompletedRound && room.game.phase === "playing") {
        log(`discussing completed round ${completedRound} for next round ${room.game.round}`);
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
        if (Object.keys(result).length > 0) {
          discussions.push({ completedRound, nextRound: room.game.round, result });
        }
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
        decisionLog,
        assertPrivacy,
        aiPlayerIds,
        log,
      });
      if (stepResult?.error) {
        if (normalizedAiTeam === "all" || !stepResult.waitForHuman) {
          throw new Error(JSON.stringify(stepResult, null, 2));
        }
        log(`waiting for human-controlled seat: ${JSON.stringify(stepResult)}`);
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
