import {
  factionLabels,
} from "./data";
import {
  isCommandRespectCommanderCard,
  isDemandResultsCommanderCard,
  isDesertCallCommanderCard,
} from "./card-identifiers";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  recordTurnUnitDeployment,
} from "./turn-trackers";
import type {
  ContractCard,
  GameState,
  PendingAction,
  Player,
  ResourceId,
} from "./types";

type CommandRespectPendingAction = Extract<PendingAction, { kind: "command-respect" }>;
type DemandResultsPendingAction = Extract<PendingAction, { kind: "demand-results" }>;
type PayResourceForStrengthPendingAction = Extract<PendingAction, { kind: "pay-resource-for-strength" }>;
type PayResourceForTroopsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-troops" }>;
type PayResourceForInfluencePendingAction = Extract<PendingAction, { kind: "pay-resource-for-influence" }>;
type DesertCallPendingAction = Extract<PendingAction, { kind: "desert-call" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function paymentPendingOptionalIsValid(pending: { optional?: unknown }) {
  return pending.optional === true;
}

function paymentPendingTrashSourceIsValid(pending: { cardId?: string; trashSource?: unknown }) {
  if (pending.trashSource !== undefined && typeof pending.trashSource !== "boolean") return false;
  if (pending.trashSource === true && pending.cardId === undefined) return false;
  return true;
}

export function resolveCommandRespectTrade(
  state: GameState,
  pending: CommandRespectPendingAction,
  partnerId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const partner = state.players.find((player) => player.id === partnerId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    !commander.swordmasterBonus ||
    !commander.playArea.some((card) => card.id === pending.cardId && isCommandRespectCommanderCard(card)) ||
    !partner ||
    partner.team !== commander.team ||
    partner.role !== "Ally" ||
    !pending.partnerIds.includes(partner.id)
  ) {
    return state;
  }

  const players = state.players.map((player) =>
    player.id === commander.id
      ? { ...player, playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
      : player,
  );
  const tradePending: PendingAction = {
    kind: "trade",
    actorId: commander.id,
    partnerId: partner.id,
    resource: "intrigue",
    actorGiven: 0,
    partnerGiven: 0,
    partnerLocked: true,
    source: pending.source,
  };

  return {
    ...state,
    players,
    pendingAction: tradePending,
    log: [
      `${commander.leader} trashes ${pending.source} to trade with ${partner.leader}.`,
      ...state.log,
    ],
  };
}

export function skipCommandRespect(state: GameState, pending: CommandRespectPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} keeps ${pending.source} and declines to trade.`, ...state.log],
  };
}

export function resolveDemandResultsChoice(
  state: GameState,
  pending: DemandResultsPendingAction,
  optionIndex: number,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const allyA = state.players.find((player) => player.id === pending.allyIds[0]);
  const allyB = state.players.find((player) => player.id === pending.allyIds[1]);
  const contractA = state.contractOffer.find((contract) => contract.id === pending.contractIds[0]);
  const contractB = state.contractOffer.find((contract) => contract.id === pending.contractIds[1]);
  const choices = optionIndex === 0
    ? [
        { ally: allyA, contract: contractA },
        { ally: allyB, contract: contractB },
      ]
    : optionIndex === 1
      ? [
          { ally: allyA, contract: contractB },
          { ally: allyB, contract: contractA },
        ]
      : undefined;

  if (
    !commander ||
    commander.team !== "shaddam" ||
    commander.role !== "Commander" ||
    commander.resources.solari < 2 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDemandResultsCommanderCard(card)) ||
    !allyA ||
    allyA.team !== commander.team ||
    allyA.role !== "Ally" ||
    !allyB ||
    allyB.team !== commander.team ||
    allyB.role !== "Ally" ||
    allyA.id === allyB.id ||
    !contractA ||
    !contractB ||
    contractA.id === contractB.id ||
    !choices
  ) {
    return state;
  }

  const assigned = choices as Array<{ ally: Player; contract: ContractCard }>;
  const assignedText = assigned
    .map(({ ally, contract }) => `${ally.leader} takes ${contract.name}`)
    .join("; ");
  const replacementIds = new Set(pending.contractIds);
  const contractDeck = [...state.contractDeck];
  const contractOffer = state.contractOffer.flatMap((contract) => {
    if (!replacementIds.has(contract.id)) return [contract];
    const replacement = contractDeck.shift();
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((player) => {
    if (player.id === commander.id) {
      return {
        ...player,
        resources: { ...player.resources, solari: player.resources.solari - 2 },
        playArea: player.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    const assignment = assigned.find(({ ally }) => ally.id === player.id);
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
    log: [`${commander.leader} spends 2 Solari for ${pending.source}; ${assignedText}.`, ...state.log],
  };
}

export function skipDemandResults(state: GameState, pending: DemandResultsPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Shaddam"} declines to pay 2 Solari for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForTroopsChoice(
  state: GameState,
  pending: PayResourceForTroopsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipientIds = Array.isArray(pending.recipientIds) ? pending.recipientIds : [];
  const recipients = recipientIds.map((recipientId) =>
    state.players.find((player) => player.id === recipientId)
  );
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.troops <= 0 ||
    pending.destination !== "garrison" ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    recipientIds.length !== 2 ||
    new Set(recipientIds).size !== recipientIds.length ||
    recipients.some((recipient) =>
      !recipient ||
      recipient.team !== owner.team ||
      recipient.role !== "Ally"
    )
  ) {
    return state;
  }

  const recipientSet = new Set(recipientIds);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...player,
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
        ...(pending.trashSource && pending.cardId
          ? { playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    if (recipientSet.has(player.id)) {
      next = { ...next, garrison: next.garrison + pending.troops };
    }
    return next;
  });
  const recipientLabel = recipients
    .filter((recipient): recipient is Player => Boolean(recipient))
    .map((recipient) => recipient.leader)
    .join(" and ");

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipientLabel} each gain ${pending.troops} troops.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForTroops(state: GameState, pending: PayResourceForTroopsPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForStrengthChoice(
  state: GameState,
  pending: PayResourceForStrengthPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.strength <= 0 ||
    !paymentPendingOptionalIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    (owner.role === "Commander" && (recipient.team !== owner.team || recipient.role !== "Ally")) ||
    (owner.role !== "Commander" && recipient.id !== owner.id) ||
    !playerHasConflictUnits(recipient)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...player,
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
      };
    }
    if (player.id === recipient.id) {
      next = { ...next, conflict: next.conflict + pending.strength };
    }
    return next;
  });

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} adds ${pending.strength} strength.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForStrength(state: GameState, pending: PayResourceForStrengthPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  if (!paymentPendingOptionalIsValid(pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (!resourceLabel) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForInfluenceChoice(
  state: GameState,
  pending: PayResourceForInfluencePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.influenceOwnerId);
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    pending.cost <= 0 ||
    pending.amount <= 0 ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    recipient.team !== owner.team ||
    (recipient.id !== owner.id && recipient.role !== "Ally")
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...next,
        resources: { ...next.resources, [pending.resource]: availableResource - pending.cost },
        ...(pending.trashSource && pending.cardId
          ? { playArea: next.playArea.filter((card) => card.id !== pending.cardId) }
          : {}),
      };
    }
    if (player.id === recipient.id) {
      next = adjustInfluence(next, pending.faction, pending.amount);
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} gains ${pending.amount} ${factionLabels[pending.faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipPayResourceForInfluence(state: GameState, pending: PayResourceForInfluencePendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}

export function resolveDesertCallChoice(
  state: GameState,
  pending: DesertCallPendingAction,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const ally = state.players.find((player) => player.id === pending.allyId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    commander.resources.water < 1 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDesertCallCommanderCard(card)) ||
    !ally ||
    ally.team !== commander.team ||
    ally.role !== "Ally" ||
    conflictDeploymentBlockedFor(state, commander.id, ally.id) ||
    !canSummonSandworms(state, ally, 1)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...next,
        resources: { ...next.resources, water: next.resources.water - 1 },
        playArea: next.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === ally.id) {
      next = {
        ...next,
        conflict: next.conflict + 3,
        deployedSandworms: next.deployedSandworms + 1,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 1 water for ${pending.source}; ${ally.leader} summons 1 sandworm.`,
      ...state.log,
    ],
  };
  return recordTurnUnitDeployment(nextState, commander.id, 1);
}

export function skipDesertCall(state: GameState, pending: DesertCallPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} declines to pay 1 water for ${pending.source}.`, ...state.log],
  };
}
