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
  if (kind === "trash-card") return <X size={15} />;
  return <BookOpen size={15} />;
}

export function PendingActionChoicePanel({
  game,
  owner,
  pending,
  onChoose,
  onSkip,
}: PendingActionChoicePanelProps) {
  return (
    <div className="pending-controls">
      {owner && pending.options.length > 0 ? (
        pending.options.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onChoose(option.id)}
            disabled={!pendingActionChoiceOptionIsResolvable(game, option)}
          >
            {optionIcon(option.pending.kind)}
            {option.label}
          </button>
        ))
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
