import {
  factionLabels,
} from "./data";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  drawCards,
  playerTroopSupply,
} from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import { addLeadershipBonusForResolvedRevealStrength } from "./leadership-reveal-bonus";
import {
  ladyJessicaLeaderName,
} from "./leader-constants";
import {
  adjustInfluence,
  resolveMuadDibUnpredictableFoe,
  resolveLeaderInfluenceThresholdRewards,
  scoreActiveGurneyAlwaysSmilingForRecipient,
} from "./leader-rewards";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  completeChoamContractsForCurrentTurnHarvests,
  recordTurnSpiceGainAndCompleteHarvestContracts,
} from "./contract-rules";
import {
  recordTurnUnitDeployment,
} from "./turn-trackers";
import {
  trashOnePlayAreaCardById,
} from "./trash-rules";
import type {
  GameState,
  PendingAction,
  PaidRewardChoicePendingAtomicReward,
  PaidRewardChoicePendingReward,
  PaidRewardChoicePendingOption,
  Player,
  ResourceId,
} from "./types";

type PayResourceForStrengthPendingAction = Extract<PendingAction, { kind: "pay-resource-for-strength" }>;
type PayResourceForTroopsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-troops" }>;
type PayResourceForDrawCardsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-draw-cards" }>;
type PayResourceForInfluencePendingAction = Extract<PendingAction, { kind: "pay-resource-for-influence" }>;
type PayResourceForSandwormsPendingAction = Extract<PendingAction, { kind: "pay-resource-for-sandworms" }>;
type PaidRewardChoicePendingAction = Extract<PendingAction, { kind: "paid-reward-choice" }>;

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

function paymentPendingAmountIsValid(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function drawnCardsText(requested: number, actual: number) {
  if (actual === 0) return requested === 1 ? "has no card to draw" : "has no cards to draw";
  if (actual === requested) return `draws ${actual} card${actual === 1 ? "" : "s"}`;
  return `draws ${actual} of ${requested} cards`;
}

function paidRewardChoiceOptionIsValid(option: PaidRewardChoicePendingOption) {
  if (typeof option.id !== "string" || option.id.trim().length === 0) return false;
  if (!resourceLabels[option.resource]) return false;
  if (!paymentPendingAmountIsValid(option.cost)) return false;
  const atomicRewardIsValid = (reward: PaidRewardChoicePendingAtomicReward): boolean => {
    switch (reward.kind) {
      case "recruit-troops":
        return paymentPendingAmountIsValid(reward.amount) && reward.destination === "garrison";
      case "gain-influence":
        return Boolean(factionLabels[reward.faction]) && paymentPendingAmountIsValid(reward.amount);
      case "gain-resource":
        return Boolean(resourceLabels[reward.resource]) && paymentPendingAmountIsValid(reward.amount);
      case "gain-vp":
        return paymentPendingAmountIsValid(reward.amount);
      case "draw-intrigues":
        return paymentPendingAmountIsValid(reward.amount);
      case "gain-leader-counter":
        return reward.counter === "jessicaMemories" &&
          paymentPendingAmountIsValid(reward.amount) &&
          paymentPendingAmountIsValid(reward.troopSupplyCost) &&
          reward.troopSupplyCost === reward.amount;
      default:
        return false;
    }
  };
  const rewardIsValid = (reward: PaidRewardChoicePendingReward): boolean => {
    if (reward.kind === "bundle") {
      const rewards = (reward as { rewards?: unknown }).rewards;
      return Array.isArray(rewards) &&
        rewards.length > 0 &&
        rewards.every((candidate) =>
          typeof candidate === "object" &&
          candidate !== null &&
          (candidate as { kind?: unknown }).kind !== "bundle" &&
          atomicRewardIsValid(candidate as PaidRewardChoicePendingAtomicReward)
        );
    }
    return atomicRewardIsValid(reward);
  };
  return rewardIsValid(option.reward);
}

function paidRewardChoiceAtomicRewards(reward: PaidRewardChoicePendingReward): PaidRewardChoicePendingAtomicReward[] {
  return reward.kind === "bundle" ? reward.rewards : [reward];
}

function paidRewardChoiceRewardText(reward: PaidRewardChoicePendingAtomicReward, recipient: Player) {
  switch (reward.kind) {
    case "recruit-troops":
      return `${recipient.leader} recruits ${reward.amount} troop${reward.amount === 1 ? "" : "s"}`;
    case "gain-influence":
      return `${recipient.leader} gains ${reward.amount} ${factionLabels[reward.faction]} Influence`;
    case "gain-resource":
      return `${recipient.leader} gains ${reward.amount} ${resourceLabels[reward.resource]}`;
    case "gain-vp":
      return `${recipient.leader} gains ${reward.amount} VP`;
    case "draw-intrigues":
      return `${recipient.leader} draws ${reward.amount} Intrigue${reward.amount === 1 ? "" : "s"}`;
    case "gain-leader-counter":
      return reward.counter === "jessicaMemories"
        ? `${recipient.leader} gains ${reward.amount} memor${reward.amount === 1 ? "y" : "ies"}`
        : undefined;
    default:
      return undefined;
  }
}

function paidRewardChoiceRecipientIsValid(owner: Player, recipient: Player | undefined) {
  return Boolean(
    recipient &&
      recipient.team === owner.team &&
      (
        recipient.id === owner.id ||
        recipient.role === "Ally"
      ),
  );
}

function paidRewardChoiceTroopSupplyDemand(reward: PaidRewardChoicePendingAtomicReward) {
  if (reward.kind === "recruit-troops") return reward.amount;
  if (reward.kind === "gain-leader-counter") return reward.troopSupplyCost;
  return 0;
}

export function resolvePaidRewardChoice(
  state: GameState,
  pending: PaidRewardChoicePendingAction,
  optionId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const option = pending.options.find((candidate) => candidate.id === optionId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = option ? ownerResources?.[option.resource] : undefined;
  if (
    !owner ||
    !option ||
    typeof availableResource !== "number" ||
    availableResource < option.cost ||
    !paidRewardChoiceOptionIsValid(option) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId))
  ) {
    return state;
  }

  const rewards = paidRewardChoiceAtomicRewards(option.reward);
  const recipients = rewards.map((reward) => state.players.find((player) => player.id === reward.recipientId));
  if (rewards.length === 0 || recipients.some((recipient) => !paidRewardChoiceRecipientIsValid(owner, recipient))) return state;
  const troopSupplyDemandByRecipient = new Map<string, number>();
  rewards.forEach((reward) => {
    const demand = paidRewardChoiceTroopSupplyDemand(reward);
    if (demand <= 0) return;
    troopSupplyDemandByRecipient.set(
      reward.recipientId,
      (troopSupplyDemandByRecipient.get(reward.recipientId) ?? 0) + demand,
    );
  });
  for (const [recipientId, troopSupplyDemand] of troopSupplyDemandByRecipient.entries()) {
    const counterRecipient = state.players.find((player) => player.id === recipientId);
    if (
      !counterRecipient ||
      counterRecipient.role !== "Ally" ||
      playerTroopSupply(counterRecipient) < troopSupplyDemand
    ) {
      return state;
    }
    const hasLeaderCounterReward = rewards.some(
      (reward) => reward.recipientId === recipientId && reward.kind === "gain-leader-counter",
    );
    if (hasLeaderCounterReward && counterRecipient.leader !== ladyJessicaLeaderName) return state;
  }
  const resourceLabel = resourceLabels[option.resource];
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...next,
        resources: { ...next.resources, [option.resource]: availableResource - option.cost },
      };
    }
    rewards.forEach((reward) => {
      if (player.id !== reward.recipientId) return;
      switch (reward.kind) {
        case "recruit-troops":
          next = { ...next, garrison: next.garrison + reward.amount };
          break;
        case "gain-influence":
          next = adjustInfluence(next, reward.faction, reward.amount);
          break;
        case "gain-resource":
          next = {
            ...next,
            resources: {
              ...next.resources,
              [reward.resource]: next.resources[reward.resource] + reward.amount,
            },
          };
          break;
        case "gain-vp":
          next = { ...next, vp: next.vp + reward.amount };
          break;
        case "gain-leader-counter":
          next = reward.counter === "jessicaMemories"
            ? { ...next, jessicaMemories: next.jessicaMemories + reward.amount }
            : next;
          break;
        default:
          break;
      }
    });
    return next;
  });

  const rewardText = rewards
    .map((reward, index) => {
      const recipient = recipients[index];
      return recipient ? paidRewardChoiceRewardText(reward, recipient) : undefined;
    })
    .filter((text): text is string => Boolean(text))
    .join(" and ");
  if (!rewardText || rewardText.length === 0) return state;
  const actionLog = `${owner.leader} spends ${option.cost} ${resourceLabel} for ${pending.source}: ${rewardText}.`;
  let nextState: GameState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [actionLog, ...state.log],
  };
  if (rewards.some((reward) => reward.kind === "gain-influence")) {
    nextState = completeChoamContractsForCurrentTurnHarvests(
      resolveLeaderInfluenceThresholdRewards(nextState, state.players),
      actionLog,
    ).state;
  }
  rewards.forEach((reward) => {
    if (reward.kind === "draw-intrigues") {
      nextState = drawIntrigueCards(nextState, reward.recipientId, reward.amount, pending.source);
    }
    if (reward.kind === "gain-resource" && reward.resource === "spice") {
      nextState = recordTurnSpiceGainAndCompleteHarvestContracts(nextState, reward.recipientId, reward.amount).state;
    }
  });
  return nextState;
}

export function skipPaidRewardChoice(state: GameState, pending: PaidRewardChoicePendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay for ${pending.source}.`, ...state.log],
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
      recipient.role !== "Ally" ||
      playerTroopSupply(recipient) < pending.troops
    )
  ) {
    return state;
  }

  const recipientSet = new Set(recipientIds);
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...(pending.trashSource && pending.cardId ? trashOnePlayAreaCardById(player, pending.cardId) : player),
        resources: { ...player.resources, [pending.resource]: availableResource - pending.cost },
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

export function resolvePayResourceForDrawCardsChoice(
  state: GameState,
  pending: PayResourceForDrawCardsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.drawCards) ||
    !paymentPendingOptionalIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId))
  ) {
    return state;
  }

  const ownerAfterPayment = {
    ...owner,
    resources: { ...owner.resources, [pending.resource]: availableResource - pending.cost },
  };
  const ownerAfterDraw = drawCards(ownerAfterPayment, ownerAfterPayment.hand.length + pending.drawCards);
  const actualDrawn = ownerAfterDraw.hand.length - ownerAfterPayment.hand.length;

  return {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterDraw : player),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${drawnCardsText(pending.drawCards, actualDrawn)}.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForDrawCards(
  state: GameState,
  pending: PayResourceForDrawCardsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.drawCards) ||
    !paymentPendingOptionalIsValid(pending)
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

  const resolvedState = scoreActiveGurneyAlwaysSmilingForRecipient({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} adds ${pending.strength} strength.`,
      ...state.log,
    ],
  }, pending.combatRecipientId);
  return addLeadershipBonusForResolvedRevealStrength(
    resolvedState,
    pending.ownerId,
    pending.combatRecipientId,
    pending.source,
    pending.cardId,
    pending.leadershipBonus,
  );
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
        ...(pending.trashSource && pending.cardId ? trashOnePlayAreaCardById(next, pending.cardId) : next),
        resources: { ...next.resources, [pending.resource]: availableResource - pending.cost },
      };
    }
    if (player.id === recipient.id) {
      next = adjustInfluence(next, pending.faction, pending.amount);
    }
    return next;
  });

  const actionLog = `${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source}; ${recipient.leader} gains ${pending.amount} ${factionLabels[pending.faction]} Influence.`;
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [actionLog, ...state.log],
  };
  return completeChoamContractsForCurrentTurnHarvests(
    resolveLeaderInfluenceThresholdRewards(nextState, state.players),
    actionLog,
  ).state;
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

export function resolvePayResourceForSandwormsChoice(
  state: GameState,
  pending: PayResourceForSandwormsPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownerResources = owner?.resources as Partial<Record<string, number>> | undefined;
  const availableResource = ownerResources?.[pending.resource];
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  const persuasionCost = pending.persuasionCost ?? 0;
  const validRecipient = Boolean(
    owner &&
      recipient &&
      (
        (owner.role === "Commander" && recipient.team === owner.team && recipient.role === "Ally") ||
        (owner.role !== "Commander" && recipient.id === owner.id)
      ),
  );
  if (
    !owner ||
    !resourceLabel ||
    typeof availableResource !== "number" ||
    availableResource < pending.cost ||
    owner.persuasion < persuasionCost ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.sandworms) ||
    !paymentPendingAmountIsValid(pending.strength) ||
    (pending.persuasionCost !== undefined && !paymentPendingAmountIsValid(pending.persuasionCost)) ||
    pending.strength !== pending.sandworms * 3 ||
    pending.destination !== "conflict" ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending) ||
    (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId)) ||
    !recipient ||
    !validRecipient ||
    conflictDeploymentBlockedFor(state, owner.id, recipient.id) ||
    !canSummonSandworms(state, recipient, pending.sandworms)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = {
        ...(pending.trashSource && pending.cardId ? trashOnePlayAreaCardById(next, pending.cardId) : next),
        resources: { ...next.resources, [pending.resource]: availableResource - pending.cost },
        persuasion: next.persuasion - persuasionCost,
      };
    }
    if (player.id === recipient.id) {
      next = {
        ...next,
        conflict: next.conflict + pending.strength,
        deployedSandworms: next.deployedSandworms + pending.sandworms,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabel}${persuasionCost > 0 ? ` and forgoes ${persuasionCost} persuasion` : ""} for ${pending.source}; ${recipient.leader} summons ${pending.sandworms} sandworm${pending.sandworms === 1 ? "" : "s"}.`,
      ...state.log,
    ],
  };
  const deploymentState = recordTurnUnitDeployment(nextState, owner.id, pending.sandworms);
  const gurneyState = scoreActiveGurneyAlwaysSmilingForRecipient(deploymentState, pending.recipientId);
  const muadDibState = resolveMuadDibUnpredictableFoe(gurneyState, pending.recipientId);
  return addLeadershipBonusForResolvedRevealStrength(
    muadDibState,
    pending.ownerId,
    pending.recipientId,
    pending.source,
    pending.cardId,
    pending.leadershipBonus,
  );
}

export function skipPayResourceForSandworms(state: GameState, pending: PayResourceForSandwormsPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !resourceLabel ||
    !paymentPendingAmountIsValid(pending.cost) ||
    !paymentPendingAmountIsValid(pending.sandworms) ||
    !paymentPendingAmountIsValid(pending.strength) ||
    (pending.persuasionCost !== undefined && !paymentPendingAmountIsValid(pending.persuasionCost)) ||
    pending.strength !== pending.sandworms * 3 ||
    !paymentPendingOptionalIsValid(pending) ||
    !paymentPendingTrashSourceIsValid(pending)
  ) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}
