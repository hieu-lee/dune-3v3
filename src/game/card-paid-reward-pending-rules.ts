import { playersWithPendingCardEffect, potentialDeferredMakerChoiceSpice } from "./card-pending-helpers";
import { playerTroopSupply } from "./deck-utils";
import { resolveAgentPaidRewardChoices } from "./effect-resolver";
import type {
  BoardSpace,
  Card,
  GameState,
  PaidRewardChoicePendingAtomicReward,
  PaidRewardChoicePendingOption,
  PaidRewardChoicePendingReward,
  PendingAction,
  Player,
} from "./types";

function paidRewardChoiceRecipientFor(source: Player, target: Player | undefined, selector: "self" | "activated-ally") {
  if (selector === "self") return source;
  if (
    source.role === "Commander" &&
    target?.role === "Ally" &&
    target.team === source.team
  ) {
    return target;
  }
  return undefined;
}

function potentialDeferredPaidRewardResource(
  state: GameState | undefined,
  source: Player,
  target: Player | undefined,
  space: BoardSpace | undefined,
  resource: PaidRewardChoicePendingOption["resource"],
) {
  if (!state || !space) return 0;
  if (resource === "spice") return potentialDeferredMakerChoiceSpice(state, source, target, space);
  if (resource === "water" && space.sietchTabr) return 1;
  return 0;
}

export function pendingActionForAgentPaidRewardChoice(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentPaidRewardChoices(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  if (effects.length > 1) throw new Error(`Unsupported multiple paid reward choices for ${card.name}`);
  const [effect] = effects;
  if (!effect || effect.selector !== "self") return undefined;
  if (effect.requiredRecipient && !paidRewardChoiceRecipientFor(source, target, effect.requiredRecipient)) {
    return undefined;
  }
  const pendingRewardFor = (reward: typeof effect.options[number]["reward"]): PaidRewardChoicePendingReward | undefined => {
    if (reward.kind === "bundle") {
      const rewards = reward.rewards.map(pendingRewardFor);
      if (rewards.some((candidate) => !candidate || candidate.kind === "bundle")) return undefined;
      const atomicRewards = rewards as PaidRewardChoicePendingAtomicReward[];
      const troopSupplyDemandByRecipient = new Map<string, number>();
      atomicRewards.forEach((atomicReward) => {
        const demand = atomicReward.kind === "gain-leader-counter"
          ? atomicReward.troopSupplyCost
          : atomicReward.kind === "recruit-troops"
            ? atomicReward.amount
            : 0;
        if (demand <= 0) return;
        troopSupplyDemandByRecipient.set(
          atomicReward.recipientId,
          (troopSupplyDemandByRecipient.get(atomicReward.recipientId) ?? 0) + demand,
        );
      });
      for (const [recipientId, troopSupplyDemand] of troopSupplyDemandByRecipient.entries()) {
        const recipient = [source, target].find((candidate) => candidate?.id === recipientId);
        if (!recipient || playerTroopSupply(recipient) < troopSupplyDemand) return undefined;
      }
      return { kind: "bundle", rewards: atomicRewards };
    }
    const recipient = paidRewardChoiceRecipientFor(source, target, reward.selector);
    if (!recipient) return undefined;
    if (reward.kind === "gain-leader-counter") {
      if (
        reward.amount <= 0 ||
        reward.counter !== "jessicaMemories" ||
        reward.troopSupplyCost <= 0 ||
        reward.troopSupplyCost !== reward.amount ||
        playerTroopSupply(recipient) < reward.troopSupplyCost
      ) {
        return undefined;
      }
      return {
        kind: "gain-leader-counter",
        recipientId: recipient.id,
        counter: reward.counter,
        amount: reward.amount,
        troopSupplyCost: reward.troopSupplyCost,
      };
    }
    if (reward.kind === "draw-intrigues") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "draw-intrigues",
        recipientId: recipient.id,
        amount: reward.amount,
      };
    }
    if (reward.kind === "recruit-troops") {
      if (reward.amount <= 0 || reward.destination !== "garrison" || playerTroopSupply(recipient) < reward.amount) {
        return undefined;
      }
      return {
        kind: "recruit-troops",
        recipientId: recipient.id,
        amount: reward.amount,
        destination: reward.destination,
      };
    }
    if (reward.kind === "gain-influence") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "gain-influence",
        recipientId: recipient.id,
        faction: reward.faction,
        amount: reward.amount,
      };
    }
    if (reward.kind === "gain-resource") {
      if (reward.amount <= 0) return undefined;
      return {
        kind: "gain-resource",
        recipientId: recipient.id,
        resource: reward.resource,
        amount: reward.amount,
      };
    }
    const unsupported = reward as { kind?: unknown };
    throw new Error(`Unsupported paid-reward-choice reward "${String(unsupported.kind)}"`);
  };
  const options = effect.options.flatMap((option): PaidRewardChoicePendingOption[] => {
    if (option.cost <= 0) return [];
    const deferredResource = potentialDeferredPaidRewardResource(state, source, target, space, option.resource);
    if (effect.requirePayableOption && source.resources[option.resource] + deferredResource < option.cost) return [];
    const reward = pendingRewardFor(option.reward);
    return reward ? [{
      id: option.id,
      resource: option.resource,
      cost: option.cost,
      reward,
    }] : [];
  });
  return options.length > 0
    ? {
        kind: "paid-reward-choice",
        ownerId: source.id,
        cardId: card.id,
        source: effect.source ?? card.name,
        ...(effect.requirePayableOption ? { requirePayableOption: true } : {}),
        options,
      }
    : undefined;
}
