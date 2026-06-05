import {
  addAcquiredCard,
  acquiredCardTrackerIds,
  acquiredCardIdFor,
  acquireMarketCard as acquireMarketCardBase,
  acquireCardPendingIsValid,
  acquireRewardParts,
  applyGuildSpySpiceMustFlowReward,
  applyAcquireInfluenceRewards,
  callToArmsRecruitOwner,
  drawAcquireIntrigues,
  formatAcquireOutcome,
  pendingActionsForAcquireRewards,
  recordAcquireSpiceGain,
} from "./market-rules";
import {
  resolveAgentPayResourceForContracts,
  resolveCardAcquireEffects,
} from "./effect-resolver";
import { spiceMustFlowSourceId } from "./card-identifiers";
import { drawCards, playerTroopSupply } from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import { advancePendingAction, prependPendingAction } from "./pending-actions";
import {
  hasAcquiredCardThisTurn,
  hasVisitedMakerSpaceThisTurn,
  recordTurnAcquiredCard,
  recordTurnSpiceGain,
} from "./turn-trackers";
import type {
  Card,
  ContractCard,
  FactionId,
  GameState,
  PendingAction,
  Player,
  ResourceId,
  Resources,
} from "./types";

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type PayResourceForContractsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-contracts" }>;
type FinishPendingResolution = (state: GameState) => GameState;
type ContractCompletionCondition =
  | { kind: "immediate" }
  | { kind: "board-space"; spaceId: string }
  | { kind: "acquire-card"; sourceId: number }
  | { kind: "harvest-spice"; amount: number };
type ContractCompletionReward = {
  resources?: Partial<Resources>;
  drawCards?: number;
  drawIntrigues?: number;
  recruitTroops?: number;
  recallAgents?: number;
  influence?: Partial<Record<FactionId, number>>;
};
type ContractCompletionSpec = {
  condition: ContractCompletionCondition;
  reward: ContractCompletionReward;
};
type ContractCompletionResult = {
  state: GameState;
  recruitedTroops: number;
  recalledAgents: number;
  completedContractIds: string[];
};

const automatedContractCompletionSpecsBySourceId: Record<number, ContractCompletionSpec> = {
  491: { condition: { kind: "board-space", spaceId: "secrets" }, reward: { drawIntrigues: 1 } },
  496: { condition: { kind: "board-space", spaceId: "espionage" }, reward: { resources: { solari: 1 }, drawIntrigues: 1 } },
  501: { condition: { kind: "immediate" }, reward: { resources: { solari: 2 } } },
  502: { condition: { kind: "board-space", spaceId: "sardaukar" }, reward: { recallAgents: 1 } },
  503: { condition: { kind: "board-space", spaceId: "sardaukar" }, reward: { drawCards: 2 } },
  504: { condition: { kind: "board-space", spaceId: "heighliner" }, reward: { recruitTroops: 2 } },
  505: { condition: { kind: "board-space", spaceId: "heighliner" }, reward: { resources: { water: 2 } } },
  506: { condition: { kind: "board-space", spaceId: "espionage" }, reward: { resources: { solari: 3 } } },
  507: { condition: { kind: "harvest-spice", amount: 4 }, reward: { resources: { solari: 4 } } },
  508: { condition: { kind: "harvest-spice", amount: 3 }, reward: { resources: { solari: 3 } } },
  509: { condition: { kind: "board-space", spaceId: "research-station" }, reward: { resources: { solari: 3 } } },
  510: { condition: { kind: "board-space", spaceId: "research-station" }, reward: { resources: { solari: 2 }, recruitTroops: 1 } },
  511: { condition: { kind: "board-space", spaceId: "arrakeen" }, reward: { resources: { solari: 1 }, recruitTroops: 1 } },
  512: { condition: { kind: "board-space", spaceId: "arrakeen" }, reward: { resources: { water: 1 } } },
  513: { condition: { kind: "board-space", spaceId: "spice-refinery" }, reward: { drawCards: 2 } },
  514: { condition: { kind: "board-space", spaceId: "spice-refinery" }, reward: { resources: { water: 1 } } },
  515: { condition: { kind: "board-space", spaceId: "high-council" }, reward: { resources: { solari: 3 } } },
  516: { condition: { kind: "board-space", spaceId: "high-council" }, reward: { influence: { bene: 1 } } },
  517: { condition: { kind: "acquire-card", sourceId: spiceMustFlowSourceId }, reward: { resources: { solari: 3 } } },
  518: { condition: { kind: "board-space", spaceId: "deliver-supplies" }, reward: { resources: { solari: 3 } } },
};

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function contractCompletionSpecFor(card: ContractCard) {
  return card.sourceId ? automatedContractCompletionSpecsBySourceId[card.sourceId] : undefined;
}

export function contractHasAutomatedCompletion(card: ContractCard) {
  return Boolean(contractCompletionSpecFor(card));
}

function contractCompletionMatches(spec: ContractCompletionSpec, condition: ContractCompletionCondition) {
  if (spec.condition.kind !== condition.kind) return false;
  if (spec.condition.kind === "immediate" && condition.kind === "immediate") return true;
  if (spec.condition.kind === "acquire-card" && condition.kind === "acquire-card") {
    return spec.condition.sourceId === condition.sourceId;
  }
  if (spec.condition.kind === "harvest-spice" && condition.kind === "harvest-spice") {
    return condition.amount >= spec.condition.amount;
  }
  return spec.condition.kind === "board-space" &&
    condition.kind === "board-space" &&
    spec.condition.spaceId === condition.spaceId;
}

function gainRewardParts(reward: ContractCompletionReward, recruitedTroops: number) {
  return [
    ...Object.entries(reward.resources ?? {})
      .filter((entry): entry is [ResourceId, number] => (entry[1] ?? 0) > 0)
      .map(([resource, amount]) => `${amount} ${resourceLabels[resource]}`),
    recruitedTroops > 0
      ? `${recruitedTroops} troop${recruitedTroops === 1 ? "" : "s"}`
      : undefined,
    reward.drawCards ? `${reward.drawCards} card${reward.drawCards === 1 ? "" : "s"}` : undefined,
    reward.drawIntrigues ? `${reward.drawIntrigues} Intrigue card${reward.drawIntrigues === 1 ? "" : "s"}` : undefined,
    ...Object.entries(reward.influence ?? {})
      .filter((entry): entry is [FactionId, number] => (entry[1] ?? 0) > 0)
      .map(([faction, amount]) => `${amount} ${faction} Influence`),
  ].filter((part): part is string => Boolean(part));
}

function actionRewardParts(recalledAgents: number) {
  return [
    recalledAgents > 0
      ? `recalls ${recalledAgents === 1 ? "the Agent" : `${recalledAgents} Agents`}`
      : undefined,
  ].filter((part): part is string => Boolean(part));
}

function completionLog(
  owner: Player,
  contract: ContractCard,
  reward: ContractCompletionReward,
  recruitedTroops: number,
  recalledAgents: number,
) {
  const gainParts = gainRewardParts(reward, recruitedTroops);
  const actionParts = actionRewardParts(recalledAgents);
  const gainOutcome = gainParts.length > 0 ? ` and gains ${gainParts.join(", ")}` : "";
  const actionOutcome = actionParts.length > 0
    ? `${gainParts.length > 0 ? ", and " : " and "}${actionParts.join(", ")}`
    : "";
  const outcome = `${gainOutcome}${actionOutcome}`;
  return `${owner.leader} completes the ${contract.name} CHOAM contract${outcome}.`;
}

function withPrimaryLogBeforeCompletionLogs(state: GameState, primaryLog: string): GameState {
  const index = state.log.indexOf(primaryLog);
  if (index <= 0) return state;
  const precedingLogs = state.log.slice(0, index);
  const completionLogs = precedingLogs.filter((log) => /completes the .* CHOAM contract/.test(log));
  if (completionLogs.length === 0) return state;
  const otherPrecedingLogs = precedingLogs.filter((log) => !completionLogs.includes(log));
  return {
    ...state,
    log: [
      ...otherPrecedingLogs,
      primaryLog,
      ...completionLogs,
      ...state.log.slice(index + 1),
    ],
  };
}

function applyContractCompletionReward(
  state: GameState,
  ownerId: string,
  contract: ContractCard,
  reward: ContractCompletionReward,
): ContractCompletionResult {
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner) return { state, recruitedTroops: 0, recalledAgents: 0, completedContractIds: [] };
  const recruitedTroops = Math.min(playerTroopSupply(owner), reward.recruitTroops ?? 0);
  const recalledAgents = Math.min(Math.max(0, owner.agentsTotal - owner.agentsReady), reward.recallAgents ?? 0);
  const spiceGain = reward.resources?.spice ?? 0;
  const previousPlayers = state.players;
  let nextState: GameState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== owner.id) return player;
      const resources = { ...player.resources };
      Object.entries(reward.resources ?? {}).forEach(([resource, amount]) => {
        resources[resource as ResourceId] += amount ?? 0;
      });
      let nextPlayer: Player = {
        ...player,
        resources,
        garrison: player.garrison + recruitedTroops,
        agentsReady: Math.min(player.agentsTotal, player.agentsReady + recalledAgents),
        contracts: player.contracts.map((candidate) =>
          candidate.card.id === contract.id ? { ...candidate, completed: true } : candidate
        ),
      };
      if (reward.drawCards) {
        nextPlayer = drawCards(nextPlayer, nextPlayer.hand.length + reward.drawCards);
      }
      Object.entries(reward.influence ?? {}).forEach(([faction, amount]) => {
        nextPlayer = adjustInfluence(nextPlayer, faction as FactionId, amount ?? 0);
      });
      return nextPlayer;
    }),
  };
  if (Object.keys(reward.influence ?? {}).length > 0) {
    nextState = resolveLeaderInfluenceThresholdRewards(nextState, previousPlayers);
  }
  if (reward.drawIntrigues) {
    nextState = drawIntrigueCards(nextState, owner.id, reward.drawIntrigues, contract.name);
  }
  if (spiceGain > 0) {
    nextState = recordTurnSpiceGain(nextState, owner.id, spiceGain);
  }
  return {
    state: {
      ...nextState,
      log: [completionLog(owner, contract, reward, recruitedTroops, recalledAgents), ...nextState.log],
    },
    recruitedTroops,
    recalledAgents,
    completedContractIds: [contract.id],
  };
}

function completeChoamContractsForCondition(
  state: GameState,
  ownerId: string,
  condition: ContractCompletionCondition,
  eligibleContractIds?: readonly string[],
): ContractCompletionResult {
  let nextState = state;
  let recruitedTroops = 0;
  let recalledAgents = 0;
  const completedContractIds: string[] = [];
  const owner = state.players.find((player) => player.id === ownerId);
  const eligibleContractIdSet = eligibleContractIds ? new Set(eligibleContractIds) : undefined;
  const completableContracts = owner?.contracts.filter((contract) => {
    if (eligibleContractIdSet && !eligibleContractIdSet.has(contract.card.id)) return false;
    if (contract.completed) return false;
    const spec = contractCompletionSpecFor(contract.card);
    return spec ? contractCompletionMatches(spec, condition) : false;
  }) ?? [];

  for (const contract of completableContracts) {
    const spec = contractCompletionSpecFor(contract.card);
    if (!spec) continue;
    const result = applyContractCompletionReward(nextState, ownerId, contract.card, spec.reward);
    nextState = result.state;
    recruitedTroops += result.recruitedTroops;
    recalledAgents += result.recalledAgents;
    completedContractIds.push(...result.completedContractIds);
  }

  return { state: nextState, recruitedTroops, recalledAgents, completedContractIds };
}

export function completeImmediateChoamContracts(state: GameState, ownerId: string): ContractCompletionResult {
  return completeChoamContractsForCondition(state, ownerId, { kind: "immediate" });
}

export function completeChoamContractsForBoardSpace(
  state: GameState,
  ownerId: string,
  spaceId: string,
): ContractCompletionResult {
  return completeChoamContractsForCondition(state, ownerId, { kind: "board-space", spaceId });
}

export function completeChoamContractsForAcquiredCard(
  state: GameState,
  ownerId: string,
  card: Card,
): ContractCompletionResult {
  return card.sourceId === undefined
    ? { state, recruitedTroops: 0, recalledAgents: 0, completedContractIds: [] }
    : completeChoamContractsForCondition(state, ownerId, { kind: "acquire-card", sourceId: card.sourceId });
}

export function completeChoamContractsForHarvest(
  state: GameState,
  ownerId: string,
  spiceGainedThisTurn: number,
  primaryLog?: string,
  eligibleContractIds?: readonly string[],
): ContractCompletionResult {
  const result = completeChoamContractsForCondition(
    state,
    ownerId,
    { kind: "harvest-spice", amount: spiceGainedThisTurn },
    eligibleContractIds,
  );
  return primaryLog
    ? { ...result, state: withPrimaryLogBeforeCompletionLogs(result.state, primaryLog) }
    : result;
}

export function completeChoamContractsForCurrentTurnHarvests(
  state: GameState,
  primaryLog?: string,
): ContractCompletionResult {
  let nextState = state;
  let recruitedTroops = 0;
  let recalledAgents = 0;
  const completedContractIds: string[] = [];
  for (const player of state.players) {
    if (!hasVisitedMakerSpaceThisTurn(nextState, player.id)) continue;
    const eligibleContractIds = nextState.turnHarvestContractIds?.[player.id] ?? [];
    if (eligibleContractIds.length === 0) continue;
    const spiceGainedThisTurn = nextState.turnSpiceGains[player.id] ?? 0;
    if (spiceGainedThisTurn <= 0) continue;
    const result = completeChoamContractsForHarvest(
      nextState,
      player.id,
      spiceGainedThisTurn,
      primaryLog,
      eligibleContractIds,
    );
    nextState = result.state;
    recruitedTroops += result.recruitedTroops;
    recalledAgents += result.recalledAgents;
    completedContractIds.push(...result.completedContractIds);
  }
  return { state: nextState, recruitedTroops, recalledAgents, completedContractIds };
}

export function recordTurnSpiceGainAndCompleteHarvestContracts(
  state: GameState,
  ownerId: string,
  amount: number,
  primaryLog?: string,
): ContractCompletionResult {
  const trackedState = recordTurnSpiceGain(state, ownerId, amount);
  return completeChoamContractsForCurrentTurnHarvests(trackedState, primaryLog);
}

export function acquireMarketCard(
  state: GameState,
  buyerId: string,
  cardId: string,
  callToArmsRecruitOwnerId?: string,
): GameState {
  const buyer = state.players[state.activeSeat];
  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = state.throneRow.find((card) => card.id === cardId);
  const rowCard = state.imperiumRow.find((card) => card.id === cardId);
  const manipulatedCard = buyer?.manipulatedCards.find((card) => card.id === cardId);
  const card = reserveCard ?? throneCard ?? rowCard ?? manipulatedCard;
  const acquiredState = acquireMarketCardBase(state, buyerId, cardId, callToArmsRecruitOwnerId);
  if (acquiredState === state || !buyer || !card) return acquiredState;

  const acquisitionLog = acquiredState.log.find((log) => log.startsWith(`${buyer.leader} acquires ${card.name}`));
  const harvestCompletion = completeChoamContractsForCurrentTurnHarvests(acquiredState, acquisitionLog);
  const contractCompletion = completeChoamContractsForAcquiredCard(harvestCompletion.state, buyerId, card);
  return acquisitionLog
    ? withPrimaryLogBeforeCompletionLogs(contractCompletion.state, acquisitionLog)
    : contractCompletion.state;
}

function contractPaymentOptionalIsValid(pending: { optional?: unknown }) {
  return pending.optional === true;
}

function contractPaymentTrashSourceIsValid(pending: { cardId?: string; trashSource?: unknown }) {
  if (pending.trashSource !== undefined && typeof pending.trashSource !== "boolean") return false;
  if (pending.trashSource === true && pending.cardId === undefined) return false;
  return true;
}

function contractPaymentAmountIsValid(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function contractPaymentSourceIsValid(pending: { source?: unknown }) {
  return typeof pending.source === "string" && pending.source.trim().length > 0;
}

function publicContractPendingIsUnavailable(state: GameState) {
  const pending = state.pendingAction;
  return pending?.kind === "contract" &&
    pending.publicOnly === true &&
    pending.allowFallback !== true &&
    pending.optional !== true &&
    state.contractOffer.length === 0;
}

function skipUnavailablePublicContractPendings(state: GameState): GameState {
  let next = state;
  const skippedLogs: string[] = [];
  while (publicContractPendingIsUnavailable(next)) {
    const pending = next.pendingAction as ContractPendingAction;
    const owner = next.players.find((player) => player.id === pending.ownerId);
    skippedLogs.push(
      `${owner?.leader ?? "Player"} cannot take a face-up CHOAM contract from ${pending.source}; no face-up CHOAM contracts remain.`,
    );
    next = { ...next, ...advancePendingAction(next) };
  }
  return skippedLogs.length > 0 ? { ...next, log: [...skippedLogs, ...next.log] } : next;
}

function spendAcquireCardPayment(player: Player, pending: AcquireCardPendingAction, cost: number): Player {
  if (!pending.paymentResource || cost <= 0) return player;
  return {
    ...player,
    resources: {
      ...player.resources,
      [pending.paymentResource]: player.resources[pending.paymentResource] - cost,
    },
  };
}

function pendingStringIds(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function sourceCardSupportsContractPayment(
  state: GameState,
  pending: PayResourceForContractsPendingAction,
  owner: Player,
) {
  const sourceCard = owner.playArea.find((card) => card.id === pending.cardId);
  if (!sourceCard?.effects) return false;
  return resolveAgentPayResourceForContracts(sourceCard.effects, {
    trigger: "agent-play",
    source: owner,
    state,
  }).some((effect) =>
    effect.selector === "self" &&
    effect.resource === pending.resource &&
    effect.cost === pending.cost &&
    effect.contractCount === pending.contractIds.length &&
    effect.recipient === "same-team-allies" &&
    effect.sourcePool === "public-offer" &&
    effect.optional === pending.optional &&
    effect.trashSource === (pending.trashSource === true) &&
    (effect.source ?? sourceCard.name) === pending.source
  );
}

export function resolvePayResourceForContractsChoice(
  state: GameState,
  pending: PayResourceForContractsPendingAction,
  optionIndex: number,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipientIds = pendingStringIds(pending.recipientIds);
  const contractIds = pendingStringIds(pending.contractIds);
  const recipients = recipientIds.map((recipientId) => state.players.find((player) => player.id === recipientId));
  const contracts = contractIds.map((contractId) => state.contractOffer.find((contract) => contract.id === contractId));
  const choices = optionIndex === 0
    ? [
        { recipient: recipients[0], contract: contracts[0] },
        { recipient: recipients[1], contract: contracts[1] },
      ]
    : optionIndex === 1
      ? [
          { recipient: recipients[0], contract: contracts[1] },
          { recipient: recipients[1], contract: contracts[0] },
        ]
      : undefined;

  if (
    !owner ||
    owner.role !== "Commander" ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    !contractPaymentAmountIsValid(pending.cost) ||
    !contractPaymentOptionalIsValid(pending) ||
    !contractPaymentTrashSourceIsValid(pending) ||
    !contractPaymentSourceIsValid(pending) ||
    recipientIds.length !== 2 ||
    new Set(recipientIds).size !== recipientIds.length ||
    recipients.some((recipient) => !recipient || recipient.team !== owner.team || recipient.role !== "Ally") ||
    contractIds.length !== 2 ||
    new Set(contractIds).size !== contractIds.length ||
    contracts.some((contract) => !contract) ||
    !choices ||
    !sourceCardSupportsContractPayment(state, pending, owner)
  ) {
    return state;
  }

  const assigned = choices as Array<{ recipient: Player; contract: ContractCard }>;
  const assignedText = assigned
    .map(({ recipient, contract }) => `${recipient.leader} takes ${contract.name}`)
    .join("; ");
  const actionLog = `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${assignedText}.`;
  const replacementIds = new Set(contractIds);
  const contractDeck = [...state.contractDeck];
  const contractOffer = state.contractOffer.flatMap((contract) => {
    if (!replacementIds.has(contract.id)) return [contract];
    const replacement = contractDeck.shift();
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((player) => {
    if (player.id === owner.id) {
      return {
        ...player,
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
        ...(pending.trashSource
          ? { playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    const assignment = assigned.find(({ recipient }) => recipient.id === player.id);
    if (assignment) {
      return {
        ...player,
        contracts: [
          ...player.contracts,
          {
            card: assignment.contract,
            completed: false,
            takenRound: state.round,
          },
        ],
      };
    }
    return player;
  });

  const assignedState: GameState = {
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [actionLog, ...state.log],
  };
  return withPrimaryLogBeforeCompletionLogs(skipUnavailablePublicContractPendings(
    assigned.reduce<GameState>(
      (nextState, { recipient }) => completeImmediateChoamContracts(nextState, recipient.id).state,
      assignedState,
    ),
  ), actionLog);
}

export function skipPayResourceForContracts(
  state: GameState,
  pending: PayResourceForContractsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !contractPaymentAmountIsValid(pending.cost) ||
    !contractPaymentOptionalIsValid(pending) ||
    !contractPaymentTrashSourceIsValid(pending) ||
    !contractPaymentSourceIsValid(pending)
  ) {
    return state;
  }
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolveTakeChoamContract(
  state: GameState,
  pending: ContractPendingAction,
  contractId: string,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  const offerIndex = state.contractOffer.findIndex((contract) => contract.id === contractId);
  const contract = state.contractOffer[offerIndex];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const reservedIndex = owner.reservedContracts.findIndex((reserved) => reserved.id === contractId);

  if (!contract) {
    if (pending.publicOnly) return state;
    const reservedContract = owner.reservedContracts[reservedIndex];
    if (!reservedContract) return state;
    const players = state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            reservedContracts: player.reservedContracts.filter((reserved) => reserved.id !== contractId),
            contracts: [
              ...player.contracts,
              {
                card: reservedContract,
                completed: false,
                takenRound: state.round,
                takenAtSpaceId: pending.spaceId,
              },
            ],
          }
        : player,
    );
    const actionLog = `${owner.leader} takes the reserved ${reservedContract.name} CHOAM contract from ${pending.source}.`;
    const takenState = skipUnavailablePublicContractPendings({
      ...state,
      players,
      ...advancePendingAction(state),
      log: [actionLog, ...state.log],
    });
    return finishPendingResolution(withPrimaryLogBeforeCompletionLogs(
      completeImmediateChoamContracts(takenState, owner.id).state,
      actionLog,
    ));
  }

  const [replacement, ...contractDeck] = state.contractDeck;
  const contractOffer = state.contractOffer.flatMap((candidate, index) => {
    if (index !== offerIndex) return [candidate];
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((player) =>
    player.id === owner.id
      ? {
          ...player,
          contracts: [
            ...player.contracts,
            {
              card: contract,
              completed: false,
              takenRound: state.round,
              takenAtSpaceId: pending.spaceId,
            },
          ],
        }
      : player,
  );
  const actionLog = `${owner.leader} takes the ${contract.name} CHOAM contract from ${pending.source}.`;
  const takenState = skipUnavailablePublicContractPendings({
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [actionLog, ...state.log],
  });
  return finishPendingResolution(withPrimaryLogBeforeCompletionLogs(
    completeImmediateChoamContracts(takenState, owner.id).state,
    actionLog,
  ));
}

export function resolveAcquireCardForPending(
  state: GameState,
  pending: AcquireCardPendingAction,
  cardId: string,
  finishPendingResolution: FinishPendingResolution,
  callToArmsRecruitOwnerId?: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;

  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = owner.team === "shaddam" ? state.throneRow.find((card) => card.id === cardId) : undefined;
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const rowCard = rowIndex >= 0 ? state.imperiumRow[rowIndex] : undefined;
  const card = reserveCard ?? throneCard ?? rowCard;
  const minCost = pending.minCost ?? 0;
  const cardCost = card?.cost ?? 0;
  if (
    !card ||
    !acquireCardPendingIsValid(pending) ||
    cardCost < minCost ||
    (pending.maxCost !== undefined && cardCost > pending.maxCost)
  ) {
    return state;
  }
  if (pending.paymentResource && owner.resources[pending.paymentResource] < cardCost) return state;

  const [replacement, ...marketDeckAfterDraw] = state.marketDeck;
  const marketDeck = rowCard ? marketDeckAfterDraw : state.marketDeck;
  const imperiumRow = rowCard
    ? state.imperiumRow.flatMap((candidate, index) => {
        if (index !== rowIndex) return [candidate];
        return replacement ? [replacement] : [];
      })
    : state.imperiumRow;
  const throneRow = throneCard ? state.throneRow.filter((candidate) => candidate.id !== card.id) : state.throneRow;
  const fromReserve = Boolean(reserveCard);
  const acquiredCardId = acquiredCardIdFor(owner, card, fromReserve);
  const callToArmsRecruit = state.phase === "playing" && owner.revealed
    ? callToArmsRecruitOwner(state, owner, callToArmsRecruitOwnerId)
    : { valid: true, owner: undefined };
  if (!callToArmsRecruit.valid) return state;
  const recruitOwner = callToArmsRecruit.owner;
  const recruitedTroops = recruitOwner ? Math.min(playerTroopSupply(recruitOwner), 1) : 0;
  const acquireReward = resolveCardAcquireEffects(card, owner, state);
  const alreadyAcquiredSpiceMustFlow = hasAcquiredCardThisTurn(
    state,
    owner.id,
    String(spiceMustFlowSourceId),
  ) || hasAcquiredCardThisTurn(state, owner.id, card.id);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = spendAcquireCardPayment(
        addAcquiredCard(player, card, fromReserve, pending.destination, 0, acquireReward),
        pending,
        cardCost,
      );
    }
    if (recruitOwner && recruitedTroops > 0 && player.id === recruitOwner.id) {
      next = { ...next, garrison: next.garrison + recruitedTroops };
    }
    return next;
  });
  const destinationText = pending.destination === "hand" ? "hand" : "discard pile";
  const paymentText = pending.paymentResource && cardCost > 0
    ? ` for ${cardCost} ${resourceLabels[pending.paymentResource]}`
    : "";
  const recruitPart = recruitOwner && recruitedTroops > 0
    ? recruitOwner.id === owner.id
      ? "recruits 1 troop"
      : `${recruitOwner.leader} recruits 1 troop`
    : undefined;
  const outcomeText = formatAcquireOutcome([
    ...acquireRewardParts(acquireReward),
    ...(recruitPart ? [recruitPart] : []),
  ]);
  const actionLog =
    `${owner.leader} acquires ${card.name} to their ${destinationText}${paymentText} from ${pending.source}${outcomeText}.`;
  const loggedState = {
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    ...advancePendingAction(state),
    log: [
      actionLog,
      ...state.log,
    ],
  };
  const spiceTrackedState = recordAcquireSpiceGain(loggedState, owner.id, acquireReward);
  const acquiredTrackedState = recordTurnAcquiredCard(spiceTrackedState, owner.id, acquiredCardTrackerIds(card));
  const acquireInfluenceState = applyAcquireInfluenceRewards(acquiredTrackedState, owner.id, acquireReward);
  const acquiredStateBase = applyGuildSpySpiceMustFlowReward(
    acquireInfluenceState,
    owner.id,
    card,
    alreadyAcquiredSpiceMustFlow,
  );
  const acquiredState = drawAcquireIntrigues(
    completeChoamContractsForCurrentTurnHarvests(acquiredStateBase, actionLog).state,
    owner.id,
    card,
    acquireReward,
  );
  const contractCompletion = completeChoamContractsForAcquiredCard(acquiredState, owner.id, card);
  const completedState = withPrimaryLogBeforeCompletionLogs(contractCompletion.state, actionLog);
  const pendingActions = pendingActionsForAcquireRewards(completedState, owner.id, card, acquiredCardId, acquireReward);
  return finishPendingResolution(
    pendingActions.reduceRight(
      (nextState, pendingAction) => prependPendingAction(nextState, pendingAction),
      completedState,
    ),
  );
}

export function resolveChoamContractFallback(
  state: GameState,
  pending: ContractPendingAction,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  if (pending.publicOnly && !pending.allowFallback) return state;
  if (state.contractOffer.length > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || (!pending.publicOnly && owner.reservedContracts.length > 0)) return state;
  const players = state.players.map((player) =>
    player.id === owner.id
      ? { ...player, resources: { ...player.resources, solari: player.resources.solari + 2 } }
      : player,
  );
  return finishPendingResolution({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [`${owner.leader} gains 2 Solari from ${pending.source}; no CHOAM contracts remain.`, ...state.log],
  });
}
