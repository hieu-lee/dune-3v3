import { BookOpen, X } from "lucide-react";
import {
  pendingActionChoiceOptionIsResolvable,
} from "../game/state";
import type { GameState, PendingAction, Player } from "../game/types";

type PendingActionChoicePendingAction = Extract<PendingAction, { kind: "pending-action-choice" }>;

type PendingActionChoicePanelProps = {
  game: GameState;
  owner?: Player;
  pending: PendingActionChoicePendingAction;
  onChoose: (optionId: string) => void;
  onSkip: () => void;
};

function optionIcon(kind: PendingActionChoicePendingAction["options"][number]["pending"]["kind"]) {
  if (kind === "trash-card") return <X size={13} />;
  return <BookOpen size={13} />;
}

function optionKindLabel(kind: PendingActionChoicePendingAction["options"][number]["pending"]["kind"]) {
  if (kind === "trash-card") return "Trash";
  return "Acquire";
}

export function PendingActionChoicePanel({
  game,
  owner,
  pending,
  onChoose,
  onSkip,
}: PendingActionChoicePanelProps) {
  const resolvableOptions = pending.options.filter((option) =>
    pendingActionChoiceOptionIsResolvable(game, option)
  ).length;
  return (
    <div className="pending-controls leader-choice-grid action-choice-grid">
      {owner && pending.options.length > 0 ? (
        <>
          <div className="leader-choice-summary action-choice-summary">
            <span>{pending.source}</span>
            <strong>{resolvableOptions}/{pending.options.length} available</strong>
            <small>Choose the follow-up action to resolve.</small>
          </div>
          {pending.options.map((option) => {
            const isResolvable = pendingActionChoiceOptionIsResolvable(game, option);
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
                  {optionIcon(option.pending.kind)}
                  {optionKindLabel(option.pending.kind)}
                </span>
                <strong>{option.label}</strong>
                <small>{isResolvable ? "Available now." : "No valid target or resource available."}</small>
              </button>
            );
          })}
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card action-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge action-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Decline this follow-up action.</small>
      </button>
    </div>
  );
}
