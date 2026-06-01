import {
  addAcquiredCard,
  callToArmsRecruitOwner,
} from "./market-rules";
import {
  resolveAgentPayResourceForContracts,
} from "./effect-resolver";
import { advancePendingAction } from "./pending-actions";
import type {
  ContractCard,
  GameState,
  PendingAction,
  Player,
  ResourceId,
} from "./types";

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type PayResourceForContractsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-contracts" }>;
type FinishPendingResolution = (state: GameState) => GameState;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

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

  return {
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [`${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${assignedText}.`, ...state.log],
  };
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
    return finishPendingResolution({
      ...state,
      players,
      ...advancePendingAction(state),
      log: [`${owner.leader} takes the reserved ${reservedContract.name} CHOAM contract from ${pending.source}.`, ...state.log],
    });
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
  return finishPendingResolution({
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [`${owner.leader} takes the ${contract.name} CHOAM contract from ${pending.source}.`, ...state.log],
  });
}

export function resolveAcquireCardForPending(
  state: GameState,
  pending: AcquireCardPendingAction,
  cardId: string,
  finishPendingResolution: FinishPendingResolution,
  callToArmsRecruitOwnerId?: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;

  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = owner.team === "shaddam" ? state.throneRow.find((card) => card.id === cardId) : undefined;
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const rowCard = rowIndex >= 0 ? state.imperiumRow[rowIndex] : undefined;
  const card = reserveCard ?? throneCard ?? rowCard;
  const minCost = pending.minCost ?? 0;
  const cardCost = card?.cost ?? 0;
  if (!card || cardCost < minCost || cardCost > pending.maxCost) return state;

  const [replacement, ...marketDeckAfterDraw] = state.marketDeck;
  const marketDeck = rowCard ? marketDeckAfterDraw : state.marketDeck;
  const imperiumRow = rowCard
    ? state.imperiumRow.flatMap((candidate, index) => {
        if (index !== rowIndex) return [candidate];
        return replacement ? [replacement] : [];
      })
    : state.imperiumRow;
  const throneRow = throneCard ? state.throneRow.filter((candidate) => candidate.id !== card.id) : state.throneRow;
  const callToArmsRecruit = state.phase === "playing" && owner.revealed
    ? callToArmsRecruitOwner(state, owner, callToArmsRecruitOwnerId)
    : { valid: true, owner: undefined };
  if (!callToArmsRecruit.valid) return state;
  const recruitOwner = callToArmsRecruit.owner;
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = addAcquiredCard(player, card, Boolean(reserveCard), pending.destination);
    }
    if (recruitOwner && player.id === recruitOwner.id) {
      next = { ...next, garrison: next.garrison + 1 };
    }
    return next;
  });
  const destinationText = pending.destination === "hand" ? "hand" : "discard pile";
  const recruitText = recruitOwner
    ? recruitOwner.id === owner.id
      ? " and recruits 1 troop"
      : ` and ${recruitOwner.leader} recruits 1 troop`
    : "";
  return finishPendingResolution({
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} acquires ${card.name} to their ${destinationText} from ${pending.source}${recruitText}.`,
      ...state.log,
    ],
  });
}

export function resolveChoamContractFallback(
  state: GameState,
  pending: ContractPendingAction,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  if (pending.publicOnly) return state;
  if (state.contractOffer.length > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.reservedContracts.length > 0) return state;
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

export function setChoamContractCompleted(
  state: GameState,
  playerId: string,
  contractId: string,
  completed: boolean,
): GameState {
  const owner = state.players.find((player) => player.id === playerId);
  const contract = owner?.contracts.find((candidate) => candidate.card.id === contractId);
  if (!owner || !contract || contract.completed === completed) return state;

  const players = state.players.map((player) =>
    player.id === owner.id
      ? {
          ...player,
          contracts: player.contracts.map((candidate) =>
            candidate.card.id === contractId ? { ...candidate, completed } : candidate,
          ),
        }
      : player,
  );
  return {
    ...state,
    players,
    log: [
      `${owner.leader} ${completed ? "completes" : "marks incomplete"} the ${contract.card.name} CHOAM contract.`,
      ...state.log,
    ],
  };
}
