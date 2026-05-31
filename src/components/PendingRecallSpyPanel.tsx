import { RotateCcw } from "lucide-react";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;

type PendingRecallSpyPanelProps = {
  choices: BoardSpace[];
  owner: Player;
  pending: RecallSpyPendingAction;
  recipient?: Player;
  onRecall: (spaceId: string) => void;
  onSkip: () => void;
};

export function PendingRecallSpyPanel({
  choices,
  owner,
  pending,
  recipient,
  onRecall,
  onSkip,
}: PendingRecallSpyPanelProps) {
  return (
    <div className="pending-controls spy-grid">
      <span>
        {owner.leader}: {pending.remaining} {pending.remaining === 1 ? "spy" : "spies"} for +{pending.strength} strength
        {recipient ? ` to ${recipient.leader}` : ""}
      </span>
      {choices.map((space) => (
        <button
          type="button"
          key={space.id}
          onClick={() => onRecall(space.id)}
          title={`Recall spy from ${space.name}`}
        >
          <RotateCcw size={14} />
          {space.name}
        </button>
      ))}
      {choices.length === 0 && <span>No spy posts</span>}
      {pending.optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}
