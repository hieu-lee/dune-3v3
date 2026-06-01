import {
  factionLabels,
} from "./data";
import {
  isCommandRespectCommanderCard,
  isCorrinoMightCommanderCard,
  isDemandAttentionCommanderCard,
  isDemandResultsCommanderCard,
  isDesertCallCommanderCard,
} from "./card-identifiers";
import { corrinoMightCost } from "./card-pending-rules";
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
type CorrinoMightPendingAction = Extract<PendingAction, { kind: "corrino-might" }>;
type PayResourceForStrengthPendingAction = Extract<PendingAction, { kind: "pay-resource-for-strength" }>;
type DemandAttentionPendingAction = Extract<PendingAction, { kind: "demand-attention" }>;
type DesertCallPendingAction = Extract<PendingAction, { kind: "desert-call" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

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

export function resolveCorrinoMightChoice(
  state: GameState,
  pending: CorrinoMightPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const allyA = state.players.find((player) => player.id === pending.allyIds[0]);
  const allyB = state.players.find((player) => player.id === pending.allyIds[1]);
  if (
    !commander ||
    commander.team !== "shaddam" ||
    commander.role !== "Commander" ||
    commander.resources.spice < pending.cost ||
    pending.cost !== corrinoMightCost ||
    !commander.playArea.some((card) => card.id === pending.cardId && isCorrinoMightCommanderCard(card)) ||
    !allyA ||
    allyA.team !== commander.team ||
    allyA.role !== "Ally" ||
    !allyB ||
    allyB.team !== commander.team ||
    allyB.role !== "Ally" ||
    allyA.id === allyB.id
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...player,
        resources: { ...player.resources, spice: player.resources.spice - pending.cost },
        playArea: player.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === allyA.id || player.id === allyB.id) {
      next = { ...next, garrison: next.garrison + 2 };
    }
    return next;
  });

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 3 spice for ${pending.source}; ${allyA.leader} and ${allyB.leader} each gain 2 troops.`,
      ...state.log,
    ],
  };
}

export function skipCorrinoMight(state: GameState, pending: CorrinoMightPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Shaddam"} declines to pay 3 spice for ${pending.source}.`, ...state.log],
  };
}

export function resolvePayResourceForStrengthChoice(
  state: GameState,
  pending: PayResourceForStrengthPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  if (
    !owner ||
    owner.resources[pending.resource] < pending.cost ||
    pending.cost <= 0 ||
    pending.strength <= 0 ||
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
        resources: { ...player.resources, [pending.resource]: player.resources[pending.resource] - pending.cost },
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
      `${owner.leader} spends ${pending.cost} ${resourceLabels[pending.resource]} for ${pending.source}; ${recipient.leader} adds ${pending.strength} strength.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForStrength(state: GameState, pending: PayResourceForStrengthPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabels[pending.resource]} for ${pending.source}.`, ...state.log],
  };
}

export function resolveDemandAttentionChoice(
  state: GameState,
  pending: DemandAttentionPendingAction,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    commander.resources.solari < 4 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDemandAttentionCommanderCard(card)) ||
    !recipient ||
    recipient.team !== commander.team ||
    (recipient.id !== commander.id && recipient.role !== "Ally")
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 4 },
        playArea: next.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === recipient.id) {
      next = adjustInfluence(next, pending.faction, 1);
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 4 Solari for ${pending.source}; ${recipient.leader} gains 1 more ${factionLabels[pending.faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipDemandAttention(state: GameState, pending: DemandAttentionPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} declines to pay 4 Solari for ${pending.source}.`, ...state.log],
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
