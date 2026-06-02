import { CircleDollarSign } from "lucide-react";
import { factionLabels } from "../game/data";
import type { PendingAction, Player } from "../game/types";

type PaidRewardChoicePendingAction = Extract<PendingAction, { kind: "paid-reward-choice" }>;

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

export function PendingPaidRewardChoicePanel({
  owner,
  pending,
  players,
  onChoose,
  onSkip,
}: PendingPaidRewardChoicePanelProps) {
  return (
    <div className="pending-controls influence-buttons">
      {owner && pending.options.length > 0 ? (
        pending.options.map((option) => {
          const recipient = players.find((player) => player.id === option.reward.recipientId);
          const recipientLabel = recipient?.leader ?? "Player";
          const canChoose = Boolean(recipient) && resourceAmount(owner, option.resource) >= option.cost;
          const label = option.reward.kind === "recruit-troops"
            ? `${recipientLabel} recruits ${option.reward.amount} troop${option.reward.amount === 1 ? "" : "s"}`
            : `${recipientLabel} +${option.reward.amount} ${factionLabels[option.reward.faction]}`;
          return (
            <button
              type="button"
              key={option.id}
              onClick={() => onChoose(option.id)}
              disabled={!canChoose}
            >
              <CircleDollarSign size={15} />
              Spend {option.cost}: {label}
            </button>
          );
        })
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
