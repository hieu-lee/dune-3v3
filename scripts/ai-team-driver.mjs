import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_AI_MODEL = process.env.DUNE_AI_MODEL || "gpt-5.5";
export const DEFAULT_AI_REASONING_EFFORT = process.env.DUNE_AI_REASONING_EFFORT || "medium";

export const AI_HOW_TO_PLAY = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../docs/ai-how-to-play.md"),
  "utf8",
).trim();

const RESPONSE_API_URL = "https://api.openai.com/v1/responses";
const MAX_ACTION_SNAPSHOT_LOGS = 16;
const MAX_DISCUSSION_WORDS = 2000;

export async function createAiRuntime(server) {
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const actions = await server.ssrLoadModule("/src/multiplayer/room-actions.ts");
  const influenceChoices = await server.ssrLoadModule("/src/game/influence-choices.ts");
  const cardTraits = await server.ssrLoadModule("/src/game/card-traits.ts");
  const cardIdentifiers = await server.ssrLoadModule("/src/game/card-identifiers.ts");
  return { server, state, data, actions, influenceChoices, cardTraits, cardIdentifiers };
}

export function createOpenAiResponseClient({
  apiKey = process.env.OPENAI_API_KEY,
  model = DEFAULT_AI_MODEL,
  reasoningEffort = DEFAULT_AI_REASONING_EFFORT,
  timeoutMs = 120_000,
  maxRetries = 5,
  retryBaseMs = 1_000,
  fetchFn = fetch,
  sleepFn = sleep,
  log = () => {},
} = {}) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for real AI team play");
  return {
    model,
    reasoningEffort,
    async responsesCreate(payload) {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchFn(RESPONSE_API_URL, {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          const text = await response.text();
          const body = text ? parseJson(text) : undefined;
          if (response.ok) return body;
          lastError = new Error(`OpenAI Responses API failed (${response.status}): ${text || JSON.stringify(body)}`);
          if (!shouldRetryOpenAiResponse(response.status) || attempt >= maxRetries) throw lastError;
          const delayMs = retryDelayMs(response, retryBaseMs, attempt);
          log(`retry ${attempt + 1}/${maxRetries} after HTTP ${response.status}; waiting ${delayMs}ms`);
          await sleepFn(delayMs);
        } catch (error) {
          lastError = error;
          if (!shouldRetryOpenAiError(error) || attempt >= maxRetries) throw error;
          const delayMs = retryDelayMs(undefined, retryBaseMs, attempt);
          log(`retry ${attempt + 1}/${maxRetries} after ${error?.name ?? "network error"}; waiting ${delayMs}ms`);
          await sleepFn(delayMs);
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastError;
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function shouldRetryOpenAiResponse(status) {
  return status === 429 || status >= 500;
}

function shouldRetryOpenAiError(error) {
  return error?.name === "AbortError" || error instanceof TypeError;
}

function retryDelayMs(response, retryBaseMs, attempt) {
  const retryAfter = response?.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1_000;
  }
  return retryBaseMs * 2 ** attempt;
}

export function createMockAiClient() {
  return {
    model: "mock-ai",
    reasoningEffort: "none",
    async chooseAction({ legalActions, invalidActionIds = new Set() }) {
      const preferred = legalActions.find((action) => !invalidActionIds.has(action.id));
      if (!preferred) throw new Error("Mock AI has no remaining legal actions");
      return {
        actionId: preferred.id,
        reason: "Mock AI selected the first currently legal action.",
        rawResponse: { mock: true },
      };
    },
  };
}

function resourceSummary(resources) {
  return {
    spice: resources?.spice ?? 0,
    solari: resources?.solari ?? 0,
    water: resources?.water ?? 0,
  };
}

function influenceSummary(influence) {
  return {
    emperor: influence?.emperor ?? 0,
    spacing: influence?.spacing ?? 0,
    bene: influence?.bene ?? 0,
    fremen: influence?.fremen ?? 0,
    greatHouses: influence?.greatHouses ?? 0,
    fringeWorlds: influence?.fringeWorlds ?? 0,
  };
}

function publicCard(card) {
  if (!card) return undefined;
  const hidden = typeof card.name === "string" && card.name.startsWith("Hidden");
  return {
    id: card.id,
    name: card.name,
    ...(hidden ? {} : {
      icons: card.icons,
      cost: card.cost,
      persuasion: card.persuasion,
      swords: card.swords,
      play: card.play,
      reveal: card.reveal,
      summary: card.summary,
      battleIcon: card.battleIcon,
      combatSwords: card.combatSwords,
      traits: card.traits,
    }),
  };
}

function playerPublicSummary(player, viewerPlayerId) {
  const ownSeat = player.id === viewerPlayerId;
  return {
    id: player.id,
    name: player.name,
    leader: player.leader,
    team: player.team,
    role: player.role,
    vp: player.vp,
    resources: resourceSummary(player.resources),
    influence: influenceSummary(player.influence),
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
    makerHooks: player.makerHooks,
    intrigueCount: player.intrigues.length,
    handCount: player.hand.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
    playArea: player.playArea.map(publicCard),
    discardTop: player.discard.slice(-3).map(publicCard),
    wonConflicts: player.wonConflicts.map((conflict) => conflict.name),
    contracts: player.contracts.map((contract) => ({
      name: contract.card.name,
      completed: contract.completed,
      takenRound: contract.takenRound,
    })),
    ...(ownSeat ? {
      hand: player.hand.map(publicCard),
      intrigues: player.intrigues.map(publicCard),
      objectives: player.objectives.map((objective) => ({
        id: objective.id,
        name: objective.name,
        battleIcon: objective.battleIcon,
        scored: objective.scored,
      })),
      manipulatedCards: player.manipulatedCards.map(publicCard),
      reservedContracts: player.reservedContracts.map(publicCard),
    } : {}),
  };
}

function conflictSummary(conflict) {
  if (!conflict) return undefined;
  return {
    id: conflict.id,
    name: conflict.name,
    level: conflict.level,
    battleIcon: conflict.battleIcon,
    rewards: conflict.rewards,
    stakes: conflict.stakes,
  };
}

function boardOccupancy(game) {
  return Object.fromEntries(
    Object.entries(game.spaces ?? {}).map(([spaceId, placement]) => [
      spaceId,
      {
        playerId: placement.playerId,
        cardName: placement.card?.name,
      },
    ]),
  );
}

export function buildAiSeatSnapshot({
  roomSnapshot,
  teamId,
  previousSummary = "",
  legalActions = [],
  note,
}) {
  const game = roomSnapshot.game;
  const viewerPlayerId = roomSnapshot.viewerPlayerId;
  const viewer = game.players.find((player) => player.id === viewerPlayerId);
  assert.ok(viewer, "AI seat snapshot requires a claimed viewer seat");
  return {
    schema: "dune-3v3-ai-seat-snapshot-v1",
    roomId: roomSnapshot.roomId,
    version: roomSnapshot.version,
    teamId,
    viewerPlayerId,
    viewerRole: viewer.role,
    round: game.round,
    phase: game.phase,
    firstPlayerId: game.players[game.firstSeat]?.id,
    activePlayerId: game.players[game.activeSeat]?.id,
    agentTurnComplete: game.agentTurnComplete,
    pendingAction: game.pendingAction ? compactPendingAction(game.pendingAction) : undefined,
    pendingQueueCount: game.pendingQueue.length,
    conflict: conflictSummary(game.conflict),
    publicMarkets: {
      imperiumRow: game.imperiumRow.map(publicCard),
      reserveMarket: game.reserveMarket.map(publicCard),
      throneRow: game.throneRow.map(publicCard),
      contractOffer: game.contractOffer.map(publicCard),
    },
    counts: {
      marketDeck: game.marketDeck.length,
      contractDeck: game.contractDeck.length,
      intrigueDeck: game.intrigueDeck.length,
      conflictDeck: game.conflictDeck.length,
    },
    boardOccupancy: boardOccupancy(game),
    players: game.players.map((player) => playerPublicSummary(player, viewerPlayerId)),
    recentLogsNewestFirst: game.log.slice(0, MAX_ACTION_SNAPSHOT_LOGS),
    previousTeamSummary: previousSummary,
    legalActions: legalActions.map(({ id, label, action }) => ({ id, label, action })),
    note,
  };
}

function compactPendingAction(pending) {
  return {
    kind: pending.kind,
    ownerId: pending.ownerId,
    actorId: pending.actorId,
    partnerId: pending.partnerId,
    team: pending.team,
    source: pending.source,
    optional: pending.optional,
    remaining: pending.remaining,
    choices: pending.choices,
    inspectedCards: pending.kind === "top-deck-selection" && pending.inspectedCards
      ? pending.inspectedCards.map(publicCard)
      : undefined,
  };
}

function actionEntry(id, label, playerId, action) {
  return { id, label, playerId, action };
}

function actionWouldChangeState(room, playerId, action, runtime) {
  try {
    runtime.actions.applyRoomAction(room.game, playerId, action);
    return true;
  } catch {
    return false;
  }
}

function commanderTargetVariants(player, players, { includeUntargetedFallback = true } = {}) {
  if (player.role !== "Commander") return [{ label: "", value: undefined }];
  const activatedAllyIds = player.commanderActivatedAllyIds ?? [];
  const hasDuplicateActivation = activatedAllyIds.some((allyId, _index, allIds) =>
    allIds.filter((candidateId) => candidateId === allyId).length > 1
  );
  const allies = players.filter((candidate) =>
    candidate.team === player.team &&
    candidate.role === "Ally" &&
    (
      !activatedAllyIds.includes(candidate.id) ||
      (
        player.swordmasterBonus &&
        !player.swordmasterAgentSpent &&
        !hasDuplicateActivation &&
        activatedAllyIds.filter((allyId) => allyId === candidate.id).length === 1
      )
    )
  );
  if (allies.length === 0) return includeUntargetedFallback ? [{ label: "", value: undefined }] : [];
  return allies.map((ally) => ({
    label: ` for ${ally.leader}`,
    value: { [player.id]: ally.id },
  }));
}

function effectiveAcquisitionCost(card, source) {
  const baseCost = card.cost ?? 0;
  return source === "manipulated" ? Math.max(0, baseCost - 1) : baseCost;
}

function buyCandidatesFor(game, player) {
  return [
    ...player.manipulatedCards.map((card) => ({ card, source: "manipulated" })),
    ...(player.team === "shaddam" ? game.throneRow.map((card) => ({ card, source: "throne" })) : []),
    ...game.imperiumRow.map((card) => ({ card, source: "imperium" })),
    ...game.reserveMarket.map((card) => ({ card, source: "reserve" })),
  ]
    .map((candidate) => ({
      ...candidate,
      cost: effectiveAcquisitionCost(candidate.card, candidate.source),
    }))
    .filter((candidate) => candidate.cost <= player.persuasion);
}

function firstChoiceId(choices) {
  return choices?.[0]?.optionId ?? choices?.[0]?.id ?? choices?.[0]?.faction;
}

function firstFaction(choices, fallback) {
  return choices?.[0]?.faction ?? choices?.[0] ?? fallback;
}

function pendingOwnerId(room, pending, command) {
  if (!pending) return undefined;
  if (command?.kind === "choose-board-influence") {
    return pending.requiredHandTrashTrait && command.trashCardId ? pending.cardOwnerId : command.ownerId;
  }
  if (command?.kind === "choose-maker-reward") return command.choice === "spice" ? pending.spiceOwnerId : pending.ownerId;
  if (command?.kind === "choose-sietch-tabr") return command.choice === "hooks" ? pending.ownerId : pending.waterOwnerId;
  if (command?.kind === "adjust-team-resource-payment") return command.contributorId;
  if (command?.kind === "choose-team-resource-payment" || command?.kind === "skip-team-resource-payment") return pending.ownerId;
  if (command?.kind === "transfer-trade") return command.fromId;
  if (command?.kind === "update-trade" || (pending.kind === "trade" && command?.kind === "clear-pending-action")) {
    return pending.actorId;
  }
  if (command?.kind === "reinforce-one") return command.playerId;
  if (command?.kind === "lose-influence") return command.ownerId;
  if (pending.kind === "commander-resource-split") return pending.commanderId;
  if (pending.kind === "reinforce" || pending.kind === "conflict-tie") {
    return room.game.players.find((player) => player.team === pending.team)?.id;
  }
  if ("ownerId" in pending) return pending.ownerId;
  return undefined;
}

function pendingCommand(room, pending, runtime, coverage = {}) {
  const {
    boardAgentRecallSpacesForPending,
    canMoveCardToThroneRow,
    discardCardForDrawChoices,
    discardCardsForRewardChoices,
    placeableSpySpaces,
    playerTroopSupply,
    recallableSpySupplySpaces,
    trashableCardsForPending,
  } = runtime.state;
  const mainBoardInfluenceChoices = runtime.influenceChoices.mainBoardInfluenceChoices ?? [];

  switch (pending.kind) {
    case "commander-resource-split":
      return { kind: "choose-commander-resource-split", optionIndex: 0 };
    case "paid-reward-choice":
      return { kind: "skip-paid-reward" };
    case "pending-action-choice": {
      const optionId = firstChoiceId(pending.choices ?? pending.options);
      return optionId ? { kind: "choose-pending-action-choice", optionId } : { kind: "skip-pending-action-choice" };
    }
    case "feyd-training": {
      const optionId = firstChoiceId(pending.choices ?? pending.options);
      return optionId ? { kind: "choose-feyd-training", optionId } : undefined;
    }
    case "trash-card": {
      if (pending.optional) return { kind: "skip-trash" };
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const choice = owner ? trashableCardsForPending(owner, pending)[0] : undefined;
      return choice ? { kind: "trash-card", zone: choice.zone, cardId: choice.card.id, choiceIndex: 0 } : undefined;
    }
    case "trash-intrigue-for-reward":
      return { kind: "skip-trash-intrigue-for-reward" };
    case "recall-agent-from-board": {
      const spaceId = boardAgentRecallSpacesForPending(room.game, pending)[0];
      return spaceId ? { kind: "choose-board-agent-recall", spaceId } : undefined;
    }
    case "draw-cards":
      return { kind: "clear-pending-action" };
    case "trash-source-for-trade":
      return { kind: "skip-trash-source-for-trade" };
    case "discard-card-for-draw": {
      if (pending.optional) return { kind: "skip-discard-card-for-draw" };
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const card = owner ? discardCardForDrawChoices(owner, pending)[0] : undefined;
      return card ? { kind: "choose-discard-card-for-draw", discardCardId: card.id } : undefined;
    }
    case "discard-card-for-influence-and-draw":
      return { kind: "skip-discard-card-for-influence-and-draw" };
    case "discard-cards-for-reward": {
      if (pending.optional) return { kind: "skip-discard-cards-for-reward" };
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const card = owner ? discardCardsForRewardChoices(owner, pending)[0] : undefined;
      return card ? { kind: "choose-discard-cards-for-reward", discardCardId: card.id } : undefined;
    }
    case "discard-hand-card": {
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      const card = owner?.hand[0];
      return card ? { kind: "choose-discard-hand-card", discardCardId: card.id } : undefined;
    }
    case "top-deck-selection":
      if ((pending.inspectedCards?.length ?? room.game.players.find((player) => player.id === pending.ownerId)?.deck.length ?? 0) >= pending.lookCards) {
        return { kind: "choose-top-deck-selection", choice: { drawIndex: 0, discardIndex: 1, trashIndex: 2 } };
      }
      return { kind: "skip-top-deck-selection" };
    case "lose-influence":
      return { kind: "skip-influence-loss" };
    case "lose-influence-for-intrigues":
      return { kind: "skip-lose-influence-for-intrigues" };
    case "lose-influence-for-influence":
      return { kind: "skip-lose-influence-for-influence" };
    case "pay-resource-for-strength":
      return { kind: "skip-pay-resource-for-strength" };
    case "pay-resource-for-troops":
      return { kind: "skip-pay-resource-for-troops" };
    case "pay-resource-for-influence":
      return { kind: "skip-pay-resource-for-influence" };
    case "pay-resource-for-contracts":
      return { kind: "skip-pay-resource-for-contracts" };
    case "pay-resource-for-draw-cards":
      return { kind: "skip-pay-resource-for-draw-cards" };
    case "pay-resource-for-high-council-seat":
      return { kind: "skip-pay-resource-for-high-council-seat" };
    case "pay-resource-for-sandworms":
      return { kind: "skip-pay-resource-for-sandworms" };
    case "optional-space-payment":
      return { kind: "skip-optional-space-payment" };
    case "retreat-troops-for-strength":
      return { kind: "skip-retreat-troops-for-strength" };
    case "deploy-or-retreat-troops":
      return { kind: "skip-deploy-or-retreat-troops" };
    case "recall-spy": {
      const recallSpace = runtime.state.recallableSpySpaces(room.game, pending)[0];
      if (recallSpace) return { kind: "recall-spy", spaceId: recallSpace.id };
      if (pending.optional) return { kind: "skip-recall" };
      return undefined;
    }
    case "deploy": {
      const owner = room.game.players.find((player) => player.id === pending.ownerId);
      if (
        owner &&
        owner.garrison > 0 &&
        pending.remaining > 0 &&
        !pending.conflictBlocked &&
        room.game.conflictDeploymentBlock?.ownerId !== owner.id &&
        !coverage.combatPlayerIds?.has(owner.id)
      ) {
        return { kind: "deploy-one" };
      }
      return { kind: "clear-pending-action" };
    }
    case "spy": {
      const placeSpace = placeableSpySpaces(room.game, pending)[0];
      if (placeSpace) return { kind: "place-spy", spaceId: placeSpace.id };
      const recallSpace = recallableSpySupplySpaces(room.game, pending)[0];
      if (recallSpace) return { kind: "recall-spy-for-supply", spaceId: recallSpace.id };
      return pending.mustPlaceSpy ? undefined : { kind: "clear-pending-action" };
    }
    case "control-defense":
      return { kind: "skip-control-defense" };
    case "maker-choice":
      return { kind: "choose-maker-reward", choice: "spice" };
    case "sietch-tabr":
      return { kind: "choose-sietch-tabr", choice: "shield-wall" };
    case "conflict-influence":
      return { kind: "choose-conflict-influence", faction: firstFaction(pending.choices, mainBoardInfluenceChoices[0]) };
    case "conflict-vp-conversion":
      return { kind: "skip-conflict-vp-reward" };
    case "conflict-tie":
      return { kind: "choose-conflict-tie-winner" };
    case "contract":
      if (pending.optional) return { kind: "clear-pending-action" };
      if (room.game.contractOffer[0]) return { kind: "take-contract", contractId: room.game.contractOffer[0].id };
      if (!pending.publicOnly) {
        const owner = room.game.players.find((player) => player.id === pending.ownerId);
        if (owner?.reservedContracts[0]) return { kind: "take-contract", contractId: owner.reservedContracts[0].id };
      }
      return { kind: "collect-contract-fallback" };
    case "acquire-card": {
      if (pending.optional) return { kind: "clear-pending-action" };
      const card = runtime.state.acquirableCardsForPending(room.game, pending)[0];
      return card ? { kind: "acquire-pending-card", cardId: card.id } : undefined;
    }
    case "staban-unseen-network":
      return { kind: "choose-staban-unseen-network", choice: "skip" };
    case "amber-desert-scouts":
      return { kind: "choose-lady-amber-desert-scouts", choice: "skip" };
    case "repeat-board-space":
      return { kind: "choose-repeat-board-space", choice: "skip" };
    case "leader-transition":
      return { kind: "choose-leader-transition", choice: firstChoiceId(pending.choices) ?? "skip" };
    case "throne-row": {
      const card = room.game.imperiumRow.find(canMoveCardToThroneRow);
      return card ? { kind: "choose-throne-row-card", cardId: card.id } : { kind: "clear-pending-action" };
    }
    case "reinforce": {
      const player = room.game.players.find((candidate) =>
        candidate.team === pending.team &&
        candidate.role === "Ally" &&
        playerTroopSupply(candidate) > 0
      );
      return player ? { kind: "reinforce-one", playerId: player.id, destination: "garrison" } : { kind: "clear-pending-action" };
    }
    default:
      return undefined;
  }
}

const tradeGoods = ["spice", "solari", "water", "intrigue"];

function contributionAmount(pending, contributorId) {
  const amount = pending.contributions?.[contributorId] ?? 0;
  return Number.isInteger(amount) ? amount : 0;
}

function contributionTotal(pending) {
  return (pending.contributorIds ?? []).reduce((total, contributorId) => total + contributionAmount(pending, contributorId), 0);
}

function pendingTeamResourcePaymentCommands(room, pending) {
  const commands = [];
  const total = contributionTotal(pending);
  if (total === pending.cost) return [{ kind: "choose-team-resource-payment" }];
  if (total > pending.cost) {
    for (const contributorId of pending.contributorIds ?? []) {
      if (contributionAmount(pending, contributorId) > 0) {
        commands.push({ kind: "adjust-team-resource-payment", contributorId, delta: -1 });
      }
    }
    return commands.length > 0 ? commands : [{ kind: "skip-team-resource-payment" }];
  }
  for (const contributorId of pending.contributorIds ?? []) {
    const contributor = room.game.players.find((player) => player.id === contributorId);
    if (!contributor) continue;
    const current = contributionAmount(pending, contributorId);
    if (current < (contributor.resources?.[pending.resource] ?? 0)) {
      commands.push({ kind: "adjust-team-resource-payment", contributorId, delta: 1 });
    }
  }
  return commands.length > 0 ? commands : [{ kind: "skip-team-resource-payment" }];
}

function canTransferSelectedTradeGood(player, resource) {
  if (!player) return false;
  if (resource === "intrigue") return player.intrigues.length > 0;
  return (player.resources?.[resource] ?? 0) > 0;
}

function currentTradeCanTransfer(actor, partner, pending) {
  const actorCanMove = pending.actorGiven === 0 && canTransferSelectedTradeGood(actor, pending.resource);
  const partnerCanMove = pending.partnerGiven === 0 && canTransferSelectedTradeGood(partner, pending.resource);
  return actorCanMove || partnerCanMove;
}

function tradeSelectionCanTransfer(actor, teammate, resource) {
  return canTransferSelectedTradeGood(actor, resource) || canTransferSelectedTradeGood(teammate, resource);
}

function tradeCanBeCleared(actor, partner, pending) {
  return pending.actorGiven + pending.partnerGiven > 0 || !currentTradeCanTransfer(actor, partner, pending);
}

function pendingTradeCommands(room, pending) {
  const actor = room.game.players.find((player) => player.id === pending.actorId);
  const partner = room.game.players.find((player) => player.id === pending.partnerId);
  const teammates = room.game.players.filter((player) => actor && player.team === actor.team && player.id !== actor.id);
  const commands = [];
  const transfersStarted = pending.actorGiven + pending.partnerGiven > 0;
  if (!transfersStarted) {
    for (const [from, to] of [[actor, partner], [partner, actor]]) {
      if (!from || !to) continue;
      if (pending.resource === "intrigue") {
        for (const intrigue of from.intrigues) {
          commands.push({ kind: "transfer-trade", fromId: from.id, toId: to.id, intrigueId: intrigue.id });
        }
      } else {
        commands.push({ kind: "transfer-trade", fromId: from.id, toId: to.id });
      }
    }
  }
  if (tradeCanBeCleared(actor, partner, pending) && !transfersStarted) {
    for (const teammate of teammates) {
      for (const resource of tradeGoods) {
        if (!tradeSelectionCanTransfer(actor, teammate, resource)) continue;
        commands.push({ kind: "update-trade", resource, partnerId: teammate.id });
      }
    }
  }
  if (tradeCanBeCleared(actor, partner, pending)) {
    commands.push({ kind: "clear-pending-action" });
  }
  return commands;
}

function pendingBoardInfluenceCommands(room, pending, runtime) {
  if (pending.requiredHandTrashTrait) {
    const sourceOwner = room.game.players.find((player) => player.id === pending.cardOwnerId);
    const trashCard = sourceOwner?.hand.find((card) => runtime.cardTraits.cardHasTrait(card, pending.requiredHandTrashTrait));
    if (!trashCard) return [];
    return pending.choices.map((choice) => ({
      kind: "choose-board-influence",
      ownerId: choice.ownerId,
      faction: choice.faction,
      trashCardId: trashCard.id,
    }));
  }
  return pending.choices.map((choice) => ({
    kind: "choose-board-influence",
    ownerId: choice.ownerId,
    faction: choice.faction,
  }));
}

function pendingCommands(room, pending, runtime, coverage = {}) {
  if (pending.kind === "feyd-training") {
    return (pending.options ?? []).map((option) => ({ kind: "choose-feyd-training", optionId: option.id }));
  }
  if (pending.kind === "team-resource-payment") return pendingTeamResourcePaymentCommands(room, pending);
  if (pending.kind === "trade") return pendingTradeCommands(room, pending);
  if (pending.kind === "board-influence-choice") return pendingBoardInfluenceCommands(room, pending, runtime);
  const command = pendingCommand(room, pending, runtime, coverage);
  return command ? [command] : [];
}

const plotIntrigueSourceIds = {
  sietchRitual: 127,
  mercenaries: 128,
  councilorsAmbition: 129,
  strategicStockpiling: 130,
  detonation: 131,
  departForArrakis: 132,
  cunning: 133,
  opportunism: 134,
  changeAllegiances: 135,
  specialMission: 136,
  unexpectedAllies: 137,
  callToArms: 138,
  buyAccess: 139,
  imperiumPolitics: 140,
  shaddamsFavor: 141,
  intelligenceReport: 142,
  manipulate: 143,
  distraction: 144,
  marketOpportunity: 145,
  contingencyPlan: 147,
  inspireAwe: 148,
  leverage: 447,
  backedByChoam: 448,
};

function influenceLossPairChoices(player) {
  const factions = Object.keys(player.influence);
  const pairs = [];
  factions.forEach((first, firstIndex) => {
    factions.slice(firstIndex).forEach((second) => {
      const requiredFirst = first === second ? 2 : 1;
      const requiredSecond = first === second ? 0 : 1;
      if ((player.influence[first] ?? 0) >= requiredFirst && (player.influence[second] ?? 0) >= requiredSecond) {
        pairs.push([first, second]);
      }
    });
  });
  return pairs;
}

function exhaustivePlotCommandVariants(game, player, intrigue) {
  const factions = Object.keys(player.influence);
  const variants = [
    { kind: "contingency-plan", intrigueId: intrigue.id },
    { kind: "call-to-arms", intrigueId: intrigue.id },
    { kind: "intelligence-report", intrigueId: intrigue.id },
    { kind: "inspire-awe", intrigueId: intrigue.id },
    { kind: "leverage", intrigueId: intrigue.id },
    { kind: "distraction", intrigueId: intrigue.id },
    { kind: "councilors-ambition", intrigueId: intrigue.id },
    { kind: "mercenaries", intrigueId: intrigue.id },
    { kind: "shaddams-favor", intrigueId: intrigue.id },
  ];
  for (const card of game.imperiumRow) variants.push({ kind: "manipulate", intrigueId: intrigue.id, cardId: card.id });
  for (const choice of ["draw", "paid-trash"]) variants.push({ kind: "cunning", intrigueId: intrigue.id, choice });
  for (const choice of ["draw", "spend-spice"]) variants.push({ kind: "depart-for-arrakis", intrigueId: intrigue.id, choice });
  for (const choice of ["spice", "water", "both"]) variants.push({ kind: "strategic-stockpiling", intrigueId: intrigue.id, choice });
  for (const choice of ["spice-to-solari", "solari-to-spice"]) variants.push({ kind: "market-opportunity", intrigueId: intrigue.id, choice });
  for (const faction of factions) {
    variants.push({ kind: "imperium-politics", intrigueId: intrigue.id, faction });
    variants.push({ kind: "backed-by-choam", intrigueId: intrigue.id, faction });
    for (const discardCard of player.hand) {
      variants.push({ kind: "sietch-ritual", intrigueId: intrigue.id, discardCardId: discardCard.id, faction });
    }
    variants.push({ kind: "change-allegiances", intrigueId: intrigue.id, choice: { kind: "spend-spice", gainFaction: faction } });
    for (const loseFaction of factions) {
      variants.push({ kind: "change-allegiances", intrigueId: intrigue.id, choice: { kind: "shift", loseFaction, gainFaction: faction } });
      for (const spiceGainFaction of factions) {
        variants.push({
          kind: "change-allegiances",
          intrigueId: intrigue.id,
          choice: { kind: "both", loseFaction, shiftGainFaction: faction, spiceGainFaction },
        });
      }
    }
  }
  for (const choice of influenceLossPairChoices(player)) {
    variants.push({ kind: "opportunism", intrigueId: intrigue.id, choice });
  }
  for (const first of factions) {
    for (const second of factions) {
      if (first === second) continue;
      variants.push({ kind: "buy-access", intrigueId: intrigue.id, choice: [first, second] });
    }
  }
  variants.push({ kind: "special-mission", intrigueId: intrigue.id, choice: { kind: "place-spy" } });
  for (const spaceId of Object.keys(game.spyPosts ?? {})) {
    variants.push({ kind: "special-mission", intrigueId: intrigue.id, choice: { kind: "recall-spy", spaceId } });
  }
  for (const choice of ["shield-wall", "deploy"]) variants.push({ kind: "detonation", intrigueId: intrigue.id, choice });
  for (const removeShieldWall of [false, true]) variants.push({ kind: "unexpected-allies", intrigueId: intrigue.id, removeShieldWall });

  return variants;
}

function selectedPlotCommandVariants(game, player, intrigue, commanderTargets, runtime) {
  const factions = Object.keys(player.influence);
  const variants = intrigue.battleIcon
    ? [{ kind: "score-battle-icon", intrigueId: intrigue.id }]
    : [];
  const personalFaction = player.role === "Commander"
    ? player.team === "muaddib" ? "fremen" : "emperor"
    : undefined;
  const commanderCanRouteInfluence = (faction) =>
    player.role !== "Commander" || faction === personalFaction || Boolean(commanderTargets?.[player.id]);

  switch (intrigue.sourceId) {
    case plotIntrigueSourceIds.sietchRitual:
      for (const faction of factions) {
        for (const discardCard of player.hand) {
          variants.push({ kind: "sietch-ritual", intrigueId: intrigue.id, discardCardId: discardCard.id, faction });
        }
      }
      break;
    case plotIntrigueSourceIds.mercenaries:
      variants.push({ kind: "mercenaries", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.councilorsAmbition:
      variants.push({ kind: "councilors-ambition", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.strategicStockpiling:
      {
        const hasGuildInfluence = runtime.state.effectiveRequirementInfluence(player, "spacing", game.players) >= 3;
        if (player.resources.spice >= 5) {
          variants.push({ kind: "strategic-stockpiling", intrigueId: intrigue.id, choice: "spice" });
        }
        if (hasGuildInfluence && player.resources.water >= 3) {
          variants.push({ kind: "strategic-stockpiling", intrigueId: intrigue.id, choice: "water" });
        }
        if (hasGuildInfluence && player.resources.spice >= 5 && player.resources.water >= 3) {
          variants.push({ kind: "strategic-stockpiling", intrigueId: intrigue.id, choice: "both" });
        }
        break;
      }
    case plotIntrigueSourceIds.detonation:
      for (const choice of ["shield-wall", "deploy"]) variants.push({ kind: "detonation", intrigueId: intrigue.id, choice });
      break;
    case plotIntrigueSourceIds.departForArrakis:
      for (const choice of ["draw", "spend-spice"]) variants.push({ kind: "depart-for-arrakis", intrigueId: intrigue.id, choice });
      break;
    case plotIntrigueSourceIds.cunning:
      for (const choice of ["draw", "paid-trash"]) variants.push({ kind: "cunning", intrigueId: intrigue.id, choice });
      break;
    case plotIntrigueSourceIds.opportunism:
      if (player.resources.solari >= 2) {
        for (const choice of influenceLossPairChoices(player)) {
          variants.push({ kind: "opportunism", intrigueId: intrigue.id, choice });
        }
      }
      break;
    case plotIntrigueSourceIds.changeAllegiances:
      {
        const influenceOwnerId = player.revealed ? player.revealActivatedAllyId : commanderTargets?.[player.id];
        const gainChoices = runtime.state.changeAllegiancesGainChoices(player);
        const lossChoices = runtime.state.changeAllegiancesLossChoices(game, player, influenceOwnerId);
        const canSpendSpice = player.resources.spice >= 3;
        for (const gainFaction of gainChoices) {
          if (canSpendSpice) {
            variants.push({ kind: "change-allegiances", intrigueId: intrigue.id, choice: { kind: "spend-spice", gainFaction } });
          }
          for (const loseFaction of lossChoices) {
            variants.push({ kind: "change-allegiances", intrigueId: intrigue.id, choice: { kind: "shift", loseFaction, gainFaction } });
            if (canSpendSpice) {
              for (const spiceGainFaction of gainChoices) {
                variants.push({
                  kind: "change-allegiances",
                  intrigueId: intrigue.id,
                  choice: { kind: "both", loseFaction, shiftGainFaction: gainFaction, spiceGainFaction },
                });
              }
            }
          }
        }
        break;
      }
    case plotIntrigueSourceIds.specialMission:
      variants.push({ kind: "special-mission", intrigueId: intrigue.id, choice: { kind: "place-spy" } });
      for (const spaceId of Object.keys(game.spyPosts ?? {})) {
        variants.push({ kind: "special-mission", intrigueId: intrigue.id, choice: { kind: "recall-spy", spaceId } });
      }
      break;
    case plotIntrigueSourceIds.unexpectedAllies:
      variants.push({ kind: "unexpected-allies", intrigueId: intrigue.id, removeShieldWall: true });
      break;
    case plotIntrigueSourceIds.callToArms:
      variants.push({ kind: "call-to-arms", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.buyAccess:
      if (player.resources.solari >= 5) {
        for (const first of factions) {
          for (const second of factions) {
            if (first === second) continue;
            const choice = [first, second];
            if (runtime.influenceChoices.validBuyAccessChoice(player, choice) && choice.every(commanderCanRouteInfluence)) {
              variants.push({ kind: "buy-access", intrigueId: intrigue.id, choice });
            }
          }
        }
      }
      break;
    case plotIntrigueSourceIds.imperiumPolitics:
      if (player.resources.solari >= 1) {
        for (const faction of runtime.influenceChoices.imperiumPoliticsFactionChoices(player)) {
          if (commanderCanRouteInfluence(faction)) {
            variants.push({ kind: "imperium-politics", intrigueId: intrigue.id, faction });
          }
        }
      }
      break;
    case plotIntrigueSourceIds.shaddamsFavor:
      variants.push({ kind: "shaddams-favor", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.intelligenceReport:
      variants.push({ kind: "intelligence-report", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.manipulate:
      for (const card of game.imperiumRow) variants.push({ kind: "manipulate", intrigueId: intrigue.id, cardId: card.id });
      break;
    case plotIntrigueSourceIds.distraction:
      variants.push({ kind: "distraction", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.marketOpportunity:
      if (player.resources.spice >= 2) variants.push({ kind: "market-opportunity", intrigueId: intrigue.id, choice: "spice-to-solari" });
      if (player.resources.solari >= 5) variants.push({ kind: "market-opportunity", intrigueId: intrigue.id, choice: "solari-to-spice" });
      break;
    case plotIntrigueSourceIds.contingencyPlan:
      variants.push({ kind: "contingency-plan", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.inspireAwe:
      variants.push({ kind: "inspire-awe", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.leverage:
      variants.push({ kind: "leverage", intrigueId: intrigue.id });
      break;
    case plotIntrigueSourceIds.backedByChoam:
      for (const faction of factions) {
        if ((player.influence[faction] ?? 0) > 0) {
          variants.push({ kind: "backed-by-choam", intrigueId: intrigue.id, faction });
        }
      }
      break;
    default:
      variants.push(...exhaustivePlotCommandVariants(game, player, intrigue));
      break;
  }

  return variants;
}

function plotCommandVariants(game, player, intrigue, commanderTargets, runtime) {
  return selectedPlotCommandVariants(game, player, intrigue, commanderTargets, runtime).map((command) => ({
    kind: "plot-intrigue",
    command,
    ...(commanderTargets ? { commanderTargets } : {}),
  }));
}

function generatedPlotCommandIsKnownLegal(intrigue, player, commanderTargets, command) {
  const routedCommanderTarget = player.role !== "Commander" || Boolean(commanderTargets?.[player.id]);
  return (
    (intrigue.sourceId === plotIntrigueSourceIds.callToArms && command.kind === "call-to-arms") ||
    (intrigue.sourceId === plotIntrigueSourceIds.manipulate && command.kind === "manipulate") ||
    (intrigue.sourceId === plotIntrigueSourceIds.marketOpportunity && command.kind === "market-opportunity") ||
    (intrigue.sourceId === plotIntrigueSourceIds.strategicStockpiling && command.kind === "strategic-stockpiling") ||
    (intrigue.sourceId === plotIntrigueSourceIds.imperiumPolitics && command.kind === "imperium-politics") ||
    (intrigue.sourceId === plotIntrigueSourceIds.buyAccess && command.kind === "buy-access") ||
    (intrigue.sourceId === plotIntrigueSourceIds.backedByChoam && command.kind === "backed-by-choam") ||
    (intrigue.sourceId === plotIntrigueSourceIds.opportunism && command.kind === "opportunism") ||
    (
      intrigue.sourceId === plotIntrigueSourceIds.changeAllegiances &&
      command.kind === "change-allegiances" &&
      routedCommanderTarget
    )
  );
}

function addPlotIntrigueActions(legalActions, room, player, runtime, coverage = {}) {
  const targetVariants = commanderTargetVariants(player, room.game.players);
  for (const intrigue of player.intrigues) {
    for (const target of targetVariants) {
      for (const action of plotCommandVariants(room.game, player, intrigue, target.value, runtime)) {
        coverage.plotCommandVariants = (coverage.plotCommandVariants ?? 0) + 1;
        if (generatedPlotCommandIsKnownLegal(intrigue, player, target.value, action.command)) {
          legalActions.push(actionEntry(
            `plot:${intrigue.id}:${action.command.kind}:${JSON.stringify(action.command)}:${target.value?.[player.id] ?? "self"}`,
            `Play Plot Intrigue ${intrigue.name} as ${action.command.kind}${target.label}`,
            player.id,
            action,
          ));
          continue;
        }
        if (!actionWouldChangeState(room, player.id, action, runtime)) continue;
        legalActions.push(actionEntry(
          `plot:${intrigue.id}:${action.command.kind}:${JSON.stringify(action.command)}:${target.value?.[player.id] ?? "self"}`,
          `Play Plot Intrigue ${intrigue.name} as ${action.command.kind}${target.label}`,
          player.id,
          action,
        ));
      }
    }
  }
}

function combatChoiceVariantsForIntrigue(intrigue, target, runtime) {
  const cardIdentifiers = runtime.cardIdentifiers;
  const deployedTroops = target?.deployedTroops ?? 0;
  if (cardIdentifiers.isTacticalOptionIntrigue(intrigue)) {
    const choices = ["add-strength"];
    for (let count = 1; count <= deployedTroops; count += 1) {
      choices.push({ kind: "retreat-troops", count });
    }
    return choices;
  }
  if (cardIdentifiers.isSpiceIsPowerIntrigue(intrigue)) {
    const choices = [];
    if ((target?.resources?.spice ?? 0) >= 3) choices.push("spend-spice");
    if (deployedTroops >= 3) choices.push({ kind: "retreat-troops", count: 3 });
    return choices;
  }
  if (cardIdentifiers.isGoToGroundIntrigue(intrigue) || cardIdentifiers.isReachAgreementIntrigue(intrigue)) {
    const choices = [];
    for (let count = 1; count <= Math.min(2, deployedTroops); count += 1) {
      choices.push({ kind: "retreat-troops", count });
    }
    return choices;
  }
  return [undefined];
}

function addCombatIntrigueActions(legalActions, room, player, runtime) {
  const targets = runtime.state.combatIntrigueTargets(room.game, player.id);
  for (const intrigue of player.intrigues) {
    for (const targetId of targets) {
      const target = room.game.players.find((candidate) => candidate.id === targetId);
      for (const combatChoice of combatChoiceVariantsForIntrigue(intrigue, target, runtime)) {
        const action = {
          kind: "play-combat-intrigue",
          intrigueId: intrigue.id,
          ...(player.role === "Commander" ? { targetId } : {}),
          ...(combatChoice ? { combatChoice } : {}),
        };
        if (!actionWouldChangeState(room, player.id, action, runtime)) continue;
        legalActions.push(actionEntry(
          `combat:${intrigue.id}:${targetId}:${JSON.stringify(combatChoice ?? "auto")}`,
          `Play Combat Intrigue ${intrigue.name}${combatChoice ? ` (${JSON.stringify(combatChoice)})` : ""}`,
          player.id,
          action,
        ));
      }
    }
  }
}

function placeableSpaceCandidates(game, player, runtime) {
  return runtime.data.boardSpaces
    .filter((space) =>
      runtime.state.agentSpaceAvailable(game, space, player) &&
      runtime.state.canPay(player, runtime.state.effectiveCost(space, game.players))
    )
    .map((space) => ({
      space,
      spyEntrySpaceIds: game.spaces[space.id]
        ? runtime.state.spyEntrySpaceIdsForOccupiedSpace(game, space.id, player.id)
        : [undefined],
    }));
}

export function legalActionsForSeat(room, playerId, runtime, coverage = {}) {
  const game = room.game;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return [];
  const legalActions = [];

  if (game.pendingAction) {
    if (!runtime.actions.roomPendingActionCanResolve(game, playerId)) return [];
    for (const command of pendingCommands(room, game.pendingAction, runtime, coverage)) {
      const ownerId = pendingOwnerId(room, game.pendingAction, command);
      if (ownerId !== playerId) continue;
      const action = { kind: "pending", command };
      if (!actionWouldChangeState(room, playerId, action, runtime)) continue;
      legalActions.push(actionEntry(
        `pending:${game.pendingAction.kind}:${JSON.stringify(command)}`,
        `Resolve pending ${game.pendingAction.kind} with ${command.kind}`,
        playerId,
        action,
      ));
    }
    return legalActions;
  }
  if (game.pendingQueue.length > 0) return [];

  if (game.phase === "playing") {
    if (game.players[game.activeSeat]?.id !== playerId) return [];
    if (game.agentTurnComplete) {
      legalActions.push(actionEntry("end-agent", "End completed Agent turn", playerId, { kind: "end-agent" }));
      return legalActions;
    }

    const targetVariants = commanderTargetVariants(player, game.players);
    const placeAgentTargetVariants = commanderTargetVariants(player, game.players, { includeUntargetedFallback: false });
    if (!player.revealed && player.agentsReady > 0) {
      const placeableSpaces = placeableSpaceCandidates(game, player, runtime);
      for (const card of player.hand) {
        for (const { space, spyEntrySpaceIds } of placeableSpaces) {
          if (!runtime.state.iconCanReach(card, space, player, game.swordmasterClaimed, game.spyPosts, game.players, game.sharedSpyPosts)) continue;
          for (const target of placeAgentTargetVariants) {
            for (const spyEntrySpaceId of spyEntrySpaceIds) {
              coverage.trustedPlaceAgentActions = (coverage.trustedPlaceAgentActions ?? 0) + 1;
              legalActions.push(actionEntry(
                `place:${card.id}:${space.id}:${target.value?.[player.id] ?? "self"}:${spyEntrySpaceId ?? "open"}`,
                `Place ${card.name} at ${space.name}${target.label}`,
                playerId,
                {
                  kind: "place-agent",
                  cardId: card.id,
                  spaceId: space.id,
                  ...(spyEntrySpaceId ? { spyEntrySpaceId } : {}),
                  ...(target.value ? { commanderTargets: target.value } : {}),
                },
              ));
            }
          }
        }
      }
    }

    if (!player.revealed) {
      addPlotIntrigueActions(legalActions, room, player, runtime, coverage);
      for (const target of targetVariants) {
        legalActions.push(actionEntry(
          `reveal:${target.value?.[player.id] ?? "self"}`,
          `Reveal turn${target.label}`,
          playerId,
          { kind: "reveal-turn", ...(target.value ? { commanderTargets: target.value } : {}) },
        ));
      }
      return legalActions;
    }

    for (const candidate of buyCandidatesFor(game, player)) {
      for (const target of targetVariants) {
        legalActions.push(actionEntry(
          `buy:${candidate.card.id}:${target.value?.[player.id] ?? "self"}`,
          `Buy ${candidate.card.name} from ${candidate.source} for ${candidate.cost}${target.label}`,
          playerId,
          { kind: "buy-card", cardId: candidate.card.id, ...(target.value ? { commanderTargets: target.value } : {}) },
        ));
      }
    }
    addPlotIntrigueActions(legalActions, room, player, runtime, coverage);
    legalActions.push(actionEntry("end-reveal", "End Reveal turn", playerId, { kind: "end-reveal" }));
    return legalActions;
  }

  if (game.phase === "combat") {
    if (game.players[game.activeSeat]?.id !== playerId) return [];
    addCombatIntrigueActions(legalActions, room, player, runtime);
    legalActions.push(actionEntry("pass-combat", "Pass combat intrigue window", playerId, { kind: "pass-combat" }));
    return legalActions;
  }

  if (game.phase === "endgame") {
    for (const choice of runtime.state.endgameBattleIconChoices(game).filter((choice) => choice.playerId === playerId)) {
      legalActions.push(actionEntry(
        `endgame-icon:${choice.intrigueId}:${choice.conflictId}`,
        `Score Endgame battle icon ${choice.battleIcon}`,
        playerId,
        { kind: "score-endgame-icon", playerId, intrigueId: choice.intrigueId, conflictId: choice.conflictId },
      ));
    }
    for (const choice of runtime.state.endgameConditionalIntrigueChoices(game).filter((choice) => choice.playerId === playerId)) {
      legalActions.push(actionEntry(
        `endgame-conditional:${choice.intrigueId}`,
        `Score Endgame conditional for ${choice.vp} VP`,
        playerId,
        { kind: "score-endgame-conditional", playerId, intrigueId: choice.intrigueId },
      ));
    }
    if (legalActions.length === 0 && !room.endgameReady?.[playerId]) {
      legalActions.push(actionEntry("finalize-endgame", "Mark this seat ready for final Endgame scoring", playerId, { kind: "finalize-endgame" }));
    }
    return legalActions;
  }

  return [];
}

export function nextActionSeats(room, runtime, coverage = {}) {
  return room.game.players
    .map((player) => ({
      player,
      legalActions: legalActionsForSeat(room, player.id, runtime, coverage),
    }))
    .filter((entry) => entry.legalActions.length > 0);
}

const submitActionTool = {
  type: "function",
  name: "submit_action",
  description: "Choose exactly one legal action by id for the current Dune: Imperium - Uprising seat.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      action_id: {
        type: "string",
        description: "One id from snapshot.legalActions.",
      },
      reason: {
        type: "string",
        description: "Brief tactical reason for the action.",
      },
    },
    required: ["action_id", "reason"],
  },
};

export async function chooseAiAction({
  aiClient,
  snapshot,
  legalActions,
  model = aiClient.model ?? DEFAULT_AI_MODEL,
  reasoningEffort = aiClient.reasoningEffort ?? DEFAULT_AI_REASONING_EFFORT,
  invalidActionIds = new Set(),
  maxToolRounds = 5,
}) {
  if (legalActions.length === 0) throw new Error("No legal actions available for AI choice");
  const { howToPlay, ...promptSnapshot } = snapshot;
  if (typeof aiClient.chooseAction === "function") {
    const selected = await aiClient.chooseAction({ howToPlay: AI_HOW_TO_PLAY, snapshot: promptSnapshot, legalActions, invalidActionIds });
    const action = legalActions.find((candidate) => candidate.id === selected.actionId);
    if (!action) throw new Error(`Mock AI selected illegal action id ${selected.actionId}`);
    return { ...selected, action };
  }

  const instructions = [
    "You play one seat in a private 3v3 Dune: Imperium - Uprising team game.",
    "You only know the information in the snapshot. Hidden cards are intentionally hidden.",
    "Call submit_action exactly once with one id from legalActions. Do not invent ids.",
    "Favor VP, alliances, efficient agent placement, and low-risk progress over stalling.",
  ].join("\n");
  const input = [{
    role: "user",
    content: JSON.stringify({
      task: "Choose this seat's next legal action.",
      howToPlay: AI_HOW_TO_PLAY,
      invalidActionIds: [...invalidActionIds],
      snapshot: promptSnapshot,
    }),
  }];

  for (let round = 0; round < maxToolRounds; round += 1) {
    const response = await aiClient.responsesCreate({
      model,
      reasoning: { effort: reasoningEffort },
      instructions,
      input,
      tools: [submitActionTool],
      tool_choice: { type: "function", name: "submit_action" },
      parallel_tool_calls: false,
      store: false,
    });
    input.push(...(response.output ?? []));
    const calls = (response.output ?? []).filter((item) => item.type === "function_call" && item.name === "submit_action");
    if (calls.length === 0) {
      input.push({
        role: "user",
        content: "No submit_action call was made. Call submit_action with one legal action id from the snapshot.",
      });
      continue;
    }
    for (const call of calls) {
      let args;
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        args = {};
      }
      const action = legalActions.find((candidate) => candidate.id === args.action_id);
      if (action && !invalidActionIds.has(action.id)) {
        return {
          actionId: action.id,
          reason: String(args.reason ?? ""),
          action,
          rawResponse: response,
        };
      }
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify({
          ok: false,
          error: "Invalid action_id. Choose an id from legalActions that has not failed.",
          legalActionIds: legalActions.map((candidate) => candidate.id),
          invalidActionIds: [...invalidActionIds],
        }),
      });
    }
  }
  throw new Error("AI did not submit a valid legal action");
}

const submitSummaryTool = {
  type: "function",
  name: "submit_summary",
  description: "Submit the commander's shared team summary and future strategy.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "Detailed commander after-action summary and future strategy under 2000 words.",
      },
    },
    required: ["summary"],
  },
};

const voteSummaryTool = {
  type: "function",
  name: "vote_summary",
  description: "Vote on the commander's proposed team summary.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      vote: { type: "string", enum: ["AGREE", "DISAGREE"] },
      reason: { type: "string" },
    },
    required: ["vote", "reason"],
  },
};

function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function truncateWords(text, maxWords) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function privateNamesFromSeatSnapshots(seatSnapshots) {
  const privateTokens = new Set();
  for (const snapshot of seatSnapshots) {
    const viewer = snapshot.players.find((player) => player.id === snapshot.viewerPlayerId);
    for (const card of [
      ...(viewer?.hand ?? []),
      ...(viewer?.intrigues ?? []),
      ...(viewer?.objectives ?? []),
      ...(viewer?.manipulatedCards ?? []),
      ...(viewer?.reservedContracts ?? []),
    ]) {
      if (card?.name && !card.name.startsWith("Hidden")) privateTokens.add(card.name);
      if (card?.id && !card.id.startsWith("hidden-")) privateTokens.add(card.id);
    }
  }
  return [...privateTokens].sort((first, second) => second.length - first.length);
}

function redactSharedPrivateNames(text, privateNames) {
  let redacted = String(text ?? "");
  for (const name of privateNames) {
    redacted = redacted.split(name).join("[private card]");
  }
  return redacted;
}

function publicOnlyDiscussionSnapshot(snapshot) {
  const { howToPlay, ...gameSnapshot } = snapshot;
  return {
    ...gameSnapshot,
    legalActions: [],
    pendingAction: gameSnapshot.pendingAction
      ? {
          kind: gameSnapshot.pendingAction.kind,
          ownerId: gameSnapshot.pendingAction.ownerId,
          actorId: gameSnapshot.pendingAction.actorId,
          partnerId: gameSnapshot.pendingAction.partnerId,
          team: gameSnapshot.pendingAction.team,
          source: gameSnapshot.pendingAction.source,
          optional: gameSnapshot.pendingAction.optional,
          remaining: gameSnapshot.pendingAction.remaining,
        }
      : undefined,
    players: gameSnapshot.players.map((player) => {
      const {
        hand,
        intrigues,
        objectives,
        manipulatedCards,
        reservedContracts,
        ...publicPlayer
      } = player;
      return publicPlayer;
    }),
  };
}

function sharedVote(voterPlayerId, vote) {
  const normalizedVote = vote?.vote === "DISAGREE" ? "DISAGREE" : "AGREE";
  const reason = String(vote?.reason ?? "").trim();
  return {
    voterPlayerId,
    vote: normalizedVote,
    reason: reason || (normalizedVote === "AGREE" ? "Summary accepted." : "Revision requested."),
  };
}

async function callSingleTool({ aiClient, model, reasoningEffort, instructions, inputPayload, tool, toolName }) {
  const response = await aiClient.responsesCreate({
    model,
    reasoning: { effort: reasoningEffort },
    instructions,
    input: [{ role: "user", content: JSON.stringify(inputPayload) }],
    tools: [tool],
    tool_choice: { type: "function", name: toolName },
    parallel_tool_calls: false,
    store: false,
  });
  const call = (response.output ?? []).find((item) => item.type === "function_call" && item.name === toolName);
  if (!call) throw new Error(`AI did not call ${toolName}`);
  return JSON.parse(call.arguments || "{}");
}

export async function discussRoundSummary({
  aiClient,
  teamId,
  previousSummary = "",
  seatSnapshots,
  model = aiClient.model ?? DEFAULT_AI_MODEL,
  reasoningEffort = aiClient.reasoningEffort ?? DEFAULT_AI_REASONING_EFFORT,
  maxIterations = 5,
}) {
  const canPropose = typeof aiClient.proposeSummary === "function" || typeof aiClient.responsesCreate === "function";
  const canVote = typeof aiClient.voteSummary === "function" || typeof aiClient.responsesCreate === "function";
  if (!canPropose || !canVote) {
    throw new Error("Commander summary generation requires a real AI client or explicit proposeSummary and voteSummary handlers");
  }
  assert.ok(seatSnapshots.length === 3, "Round discussion expects exactly three team seat snapshots");
  const sharedPrivateNames = privateNamesFromSeatSnapshots(seatSnapshots);
  const discussionSnapshots = seatSnapshots.map(publicOnlyDiscussionSnapshot);
  const commanderSnapshot = discussionSnapshots.find((snapshot) => snapshot.viewerRole === "Commander") ?? discussionSnapshots[0];
  const voterSnapshots = discussionSnapshots.filter((snapshot) => snapshot.viewerPlayerId !== commanderSnapshot.viewerPlayerId);
  let summary = previousSummary || "";
  const transcript = [];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    if (typeof aiClient.proposeSummary === "function") {
      summary = await aiClient.proposeSummary({
        teamId,
        iteration,
        previousSummary,
        currentSummary: summary,
        howToPlay: AI_HOW_TO_PLAY,
        seatSnapshots: discussionSnapshots,
      });
    } else {
      const args = await callSingleTool({
        aiClient,
        model,
        reasoningEffort,
        tool: submitSummaryTool,
        toolName: "submit_summary",
        instructions: [
          "You are the commander AI for one Dune: Imperium - Uprising team.",
          "You generate the shared commander after-action summary for your team.",
          "Use only the public discussion snapshot, prior summary, and public-safe voter signals.",
          "Write a detailed but public-safe review and future plan under 2000 words.",
          "Do not paste the prior summary or create recursive 'Prior summary' chains; carry forward only still-actionable points.",
          "Avoid generic advice. Use concrete public state: VP gap, conflict, resources, influence, agents, troops, spies, board occupancy, public offers, and recent public logs.",
          "Include these sections in natural language: what happened this round, what failed or was missed, how to adapt to turn the table or widen the lead, seat-by-seat assignments for Commander and both Allies, how the Commander will help teammates, and key risks/denials next round.",
          "Examples of acceptable specificity: who should rebuild resources after spending combat cards, who should contest the next combat, who can pay for Highliner or another major space, which teammate needs water/Solari/spice, and which public VP/influence path matters next.",
          "Do not mention private hand, Intrigue, objective, manipulated, reserved, or hidden-card details.",
        ].join("\n"),
        inputPayload: {
          teamId,
          iteration,
          previousSummary,
          currentSummary: summary,
          howToPlay: AI_HOW_TO_PLAY,
          commanderSnapshot,
          transcript,
        },
      });
      summary = args.summary ?? "";
    }
    summary = truncateWords(redactSharedPrivateNames(summary, sharedPrivateNames), MAX_DISCUSSION_WORDS);

    const votes = [];
    for (const voterSnapshot of voterSnapshots) {
      let vote;
      if (typeof aiClient.voteSummary === "function") {
        vote = await aiClient.voteSummary({ teamId, summary, howToPlay: AI_HOW_TO_PLAY, voterSnapshot, transcript });
      } else {
        vote = await callSingleTool({
          aiClient,
          model,
          reasoningEffort,
          tool: voteSummaryTool,
          toolName: "vote_summary",
          instructions: [
            "You are a teammate AI reviewing the commander's Dune: Imperium - Uprising team summary.",
            "Use only the public discussion snapshot.",
            "Vote AGREE only if it gives a concrete after-action review and actionable next-round assignments from public state.",
            "Vote DISAGREE if it is generic filler, recursively repeats old summaries, misses failures/adaptation, lacks seat-by-seat jobs, or leaks private information.",
            "Include feedback in the reason field using round-end public state.",
            "No intrigue info should be revealed in the feedback; do not name Intrigue cards, describe hidden Intrigue contents, or reveal private Intrigue holdings.",
          ].join("\n"),
          inputPayload: { teamId, summary, howToPlay: AI_HOW_TO_PLAY, voterSnapshot, transcript },
        });
      }
      votes.push(sharedVote(voterSnapshot.viewerPlayerId, {
        vote: vote.vote,
        reason: redactSharedPrivateNames(vote.reason, sharedPrivateNames),
      }));
    }
    transcript.push({ iteration, summary, votes });
    if (votes.filter((vote) => vote.vote === "AGREE").length >= 2) {
      return { summary, transcript, agreed: true, iterations: iteration, wordCount: wordCount(summary) };
    }
  }

  return { summary, transcript, agreed: false, iterations: maxIterations, wordCount: wordCount(summary) };
}

export function assertAiSnapshotHasNoForeignPrivateCards(snapshot, fullGame) {
  const text = JSON.stringify(snapshot);
  const containsExactId = (id) => text.includes(`"id":"${id}"`) || text.includes(`"cardId":"${id}"`) || text.includes(`"intrigueId":"${id}"`);
  const allowedIds = new Set();
  const allowCard = (card) => {
    if (card?.id) allowedIds.add(card.id);
  };
  [
    fullGame.conflict,
    ...fullGame.imperiumRow,
    ...fullGame.reserveMarket,
    ...fullGame.throneRow,
    ...fullGame.contractOffer,
  ].forEach(allowCard);
  for (const player of fullGame.players) {
    [
      ...player.discard,
      ...player.playArea,
      ...player.wonConflicts,
      ...player.contracts.map((contract) => contract.card),
    ].forEach(allowCard);
    if (player.id === snapshot.viewerPlayerId) {
      [
        ...player.hand,
        ...player.intrigues,
        ...player.objectives,
        ...player.manipulatedCards,
        ...player.reservedContracts,
      ].forEach(allowCard);
    }
  }
  for (const player of fullGame.players) {
    if (player.id === snapshot.viewerPlayerId) continue;
    for (const card of [...player.hand, ...player.intrigues, ...player.objectives]) {
      if (!card?.id || card.id.startsWith("hidden-")) continue;
      if (allowedIds.has(card.id)) continue;
      assert.equal(
        containsExactId(card.id),
        false,
        `${snapshot.viewerPlayerId} AI snapshot should not expose ${player.id} private card id ${card.id}`,
      );
    }
  }
  for (const card of [...fullGame.marketDeck, ...fullGame.intrigueDeck, ...fullGame.conflictDeck, ...fullGame.contractDeck]) {
    if (!card?.id || card.id.startsWith("hidden-")) continue;
    if (allowedIds.has(card.id)) continue;
    assert.equal(
      containsExactId(card.id),
      false,
      `${snapshot.viewerPlayerId} AI snapshot should not expose hidden deck card id ${card.id}`,
    );
  }
}
