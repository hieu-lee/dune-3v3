import { CircleDollarSign } from "lucide-react";
import { factionLabels } from "../game/data";
import { playerTroopSupply } from "../game/deck-utils";
import type { PaidRewardChoicePendingAtomicReward, PaidRewardChoicePendingReward, PendingAction, Player } from "../game/types";

type PaidRewardChoicePendingAction = Extract<PendingAction, { kind: "paid-reward-choice" }>;

const resourceLabels = {
  solari: "Solari",
  spice: "spice",
  water: "water",
} as const;

type PendingPaidRewardChoicePanelProps = {
  owner?: Player;
  pending: PaidRewardChoicePendingAction;
  players: Player[];
  onChoose: (optionId: string) => void;
  onSkip: () => void;
};

function resourceAmount(owner: Player | undefined, resource: PaidRewardChoicePendingAction["options"][number]["resource"]) {
  return owner?.resources[resource] ?? 0;
}

function atomicRewardLabel(
  reward: PaidRewardChoicePendingAtomicReward,
  owner: Player,
  recipient: Player | undefined,
) {
  const recipientLabel = recipient?.leader ?? "Player";
  if (reward.kind === "recruit-troops") {
    return `${recipientLabel} recruits ${reward.amount} troop${reward.amount === 1 ? "" : "s"}`;
  }
  if (reward.kind === "gain-influence") {
    return `${recipientLabel} +${reward.amount} ${factionLabels[reward.faction]}`;
  }
  if (reward.kind === "gain-resource") {
    const label = `+${reward.amount} ${resourceLabels[reward.resource]}`;
    return recipient?.id === owner.id ? label : `${recipientLabel} ${label}`;
  }
  if (reward.kind === "gain-vp") {
    const label = `+${reward.amount} VP`;
    return recipient?.id === owner.id ? label : `${recipientLabel} ${label}`;
  }
  if (reward.kind === "draw-intrigues") {
    return reward.amount === 1 ? "Intrigue" : `${reward.amount} Intrigues`;
  }
  if (reward.kind === "gain-leader-counter" && reward.counter === "jessicaMemories") {
    return reward.amount === 1 ? "memory" : `${reward.amount} memories`;
  }
  return undefined;
}

function rewardLabel(
  reward: PaidRewardChoicePendingReward,
  owner: Player,
  players: Player[],
) {
  const rewards = reward.kind === "bundle" ? reward.rewards : [reward];
  const labels = rewards.map((atomicReward) => atomicRewardLabel(
    atomicReward,
    owner,
    players.find((player) => player.id === atomicReward.recipientId),
  ));
  return labels.every((label): label is string => Boolean(label)) ? labels.join(" + ") : undefined;
}

function atomicRewards(reward: PaidRewardChoicePendingReward) {
  return reward.kind === "bundle" ? reward.rewards : [reward];
}

function rewardCanResolve(
  reward: PaidRewardChoicePendingReward,
  owner: Player,
  players: Player[],
) {
  const troopSupplyDemandByRecipient = new Map<string, number>();
  for (const atomicReward of atomicRewards(reward)) {
    const recipient = players.find((player) => player.id === atomicReward.recipientId);
    if (
      !recipient ||
      recipient.team !== owner.team ||
      (recipient.id !== owner.id && recipient.role !== "Ally")
    ) {
      return false;
    }
    if (atomicReward.kind === "gain-leader-counter") {
      if (
        atomicReward.counter !== "jessicaMemories" ||
        atomicReward.troopSupplyCost <= 0 ||
        atomicReward.troopSupplyCost !== atomicReward.amount
      ) {
        return false;
      }
      troopSupplyDemandByRecipient.set(
        atomicReward.recipientId,
        (troopSupplyDemandByRecipient.get(atomicReward.recipientId) ?? 0) + atomicReward.troopSupplyCost,
      );
    }
    if (atomicReward.kind === "recruit-troops") {
      troopSupplyDemandByRecipient.set(
        atomicReward.recipientId,
        (troopSupplyDemandByRecipient.get(atomicReward.recipientId) ?? 0) + atomicReward.amount,
      );
    }
  }
  return [...troopSupplyDemandByRecipient.entries()].every(([recipientId, troopSupplyDemand]) => {
    const recipient = players.find((player) => player.id === recipientId);
    return Boolean(
      recipient &&
        recipient.role === "Ally" &&
        playerTroopSupply(recipient) >= troopSupplyDemand,
    );
  });
}

export function PendingPaidRewardChoicePanel({
  owner,
  pending,
  players,
  onChoose,
  onSkip,
}: PendingPaidRewardChoicePanelProps) {
  const availableOptions = owner
    ? pending.options.filter((option) => {
        const label = rewardLabel(option.reward, owner, players);
        return Boolean(label) &&
          resourceAmount(owner, option.resource) >= option.cost &&
          rewardCanResolve(option.reward, owner, players);
      }).length
    : 0;
  return (
    <div className="pending-controls leader-choice-grid paid-reward-choice-grid">
      {owner && pending.options.length > 0 ? (
        <>
          <div className="leader-choice-summary paid-reward-choice-summary">
            <span>{pending.source}</span>
            <strong>{availableOptions}/{pending.options.length} payable</strong>
            <small>Choose whether to spend resources for the listed reward.</small>
          </div>
          {pending.options.map((option) => {
            const costLabel = option.resource === "solari" ? String(option.cost) : `${option.cost} ${resourceLabels[option.resource]}`;
            const label = rewardLabel(option.reward, owner, players);
            const canAfford = resourceAmount(owner, option.resource) >= option.cost;
            const rewardResolvable = rewardCanResolve(option.reward, owner, players);
            const canChoose = Boolean(label) && canAfford && rewardResolvable;
            const actionLabel = `Spend ${costLabel}: ${label ?? "Unavailable reward"}`;
            const unavailableReason = !label
              ? "Reward cannot resolve with this table state."
              : !canAfford
                ? `Need ${costLabel}.`
                : "No valid recipient supply available.";
            return (
              <button
                type="button"
                className={[
                  "leader-choice-card",
                  "paid-reward-choice-card",
                  canChoose ? "leader-choice-primary" : "",
                ].filter(Boolean).join(" ")}
                key={option.id}
                onClick={() => onChoose(option.id)}
                disabled={!canChoose}
                aria-label={actionLabel}
              >
                <span className="leader-choice-badge paid-reward-choice-badge">
                  <CircleDollarSign size={13} />
                  Spend {costLabel}
                </span>
                <strong>{actionLabel}</strong>
                <small>{canChoose ? `${resourceAmount(owner, option.resource)} ${resourceLabels[option.resource]} available.` : unavailableReason}</small>
              </button>
            );
          })}
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card paid-reward-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge paid-reward-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Decline the paid reward.</small>
      </button>
    </div>
  );
}
