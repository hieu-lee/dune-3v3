import { RotateCcw } from "lucide-react";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type BoardAgentRecallPendingAction = Extract<PendingAction, { kind: "recall-agent-from-board" }>;

type PendingBoardAgentRecallPanelProps = {
  owner?: Player;
  pending: BoardAgentRecallPendingAction;
  spaces: BoardSpace[];
  onRecall: (spaceId: string) => void;
};

export function PendingBoardAgentRecallPanel({
  owner,
  pending,
  spaces,
  onRecall,
}: PendingBoardAgentRecallPanelProps) {
  const ownerLabel = owner?.leader ?? "Player";

  return (
    <div className="pending-controls leader-choice-grid action-choice-grid">
      <div className="leader-choice-summary action-choice-summary">
        <span>{pending.source}</span>
        <strong>{ownerLabel}: recall Agent</strong>
        <small>Choose one of your other Agents on the board.</small>
      </div>

      {spaces.length > 0 ? (
        spaces.map((space) => (
          <button
            type="button"
            className="leader-choice-card action-choice-card leader-choice-primary"
            key={space.id}
            onClick={() => onRecall(space.id)}
            aria-label={`Recall Agent from ${space.name}`}
            title={`Recall Agent from ${space.name}`}
          >
            <span className="leader-choice-badge action-choice-badge">
              <RotateCcw size={13} />
              Recall
            </span>
            <strong>{space.name}</strong>
            <small>{space.zone}</small>
          </button>
        ))
      ) : (
        <span>{pending.source} has no recalled Agent choices available.</span>
      )}
    </div>
  );
}
