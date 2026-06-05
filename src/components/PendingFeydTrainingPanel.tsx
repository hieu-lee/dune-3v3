import { Coins, Dumbbell, Eye, Sparkles, X } from "lucide-react";
import { feydTrainingOptionIsResolvable } from "../game/state";
import type { GameState, PendingAction, Player } from "../game/types";

type FeydTrainingPendingAction = Extract<PendingAction, { kind: "feyd-training" }>;

type PendingFeydTrainingPanelProps = {
  game: GameState;
  owner?: Player;
  pending: FeydTrainingPendingAction;
  onChoose: (optionId: string) => void;
};

function rewardIcon(reward: FeydTrainingPendingAction["options"][number]["reward"]) {
  if (reward === "pay-solari-trash") return <Coins size={13} />;
  if (reward === "trash") return <X size={13} />;
  if (reward === "spy" || reward === "spy-spice") return <Eye size={13} />;
  return <Dumbbell size={13} />;
}

function rewardBadge(reward: FeydTrainingPendingAction["options"][number]["reward"]) {
  if (reward === "pay-solari-trash") return "Pay";
  if (reward === "trash") return "Trash";
  if (reward === "spy") return "Spy";
  if (reward === "spy-spice") return "Spy + Spice";
  return "Troop + Spy";
}

function rewardDetail(reward: FeydTrainingPendingAction["options"][number]["reward"], isResolvable: boolean) {
  if (!isResolvable) return "Unavailable.";
  if (reward === "spy-spice") return <><Sparkles size={12} /> Reward includes 2 spice.</>;
  return "Available now.";
}

export function PendingFeydTrainingPanel({
  game,
  owner,
  pending,
  onChoose,
}: PendingFeydTrainingPanelProps) {
  const availableOptions = owner
    ? pending.options.filter((option) => feydTrainingOptionIsResolvable(game, pending, option)).length
    : 0;
  return (
    <div className="pending-controls leader-choice-grid action-choice-grid">
      {owner && pending.options.length > 0 ? (
        <>
          <div className="leader-choice-summary action-choice-summary">
            <span>{pending.source}</span>
            <strong>{availableOptions}/{pending.options.length} available</strong>
            <small>Training {pending.nextPosition}/4</small>
          </div>
          {pending.options.map((option) => {
            const isResolvable = feydTrainingOptionIsResolvable(game, pending, option);
            return (
              <button
                type="button"
                className={[
                  "leader-choice-card",
                  "action-choice-card",
                  isResolvable ? "leader-choice-primary" : "",
                ].filter(Boolean).join(" ")}
                key={option.id}
                onClick={() => onChoose(option.id)}
                disabled={!isResolvable}
                aria-label={option.label}
              >
                <span className="leader-choice-badge action-choice-badge">
                  {rewardIcon(option.reward)}
                  {rewardBadge(option.reward)}
                </span>
                <strong>{option.label}</strong>
                <small>{rewardDetail(option.reward, isResolvable)}</small>
              </button>
            );
          })}
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
    </div>
  );
}
