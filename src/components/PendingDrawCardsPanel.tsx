import { BookOpen } from "lucide-react";
import type { PendingAction, Player } from "../game/types";

type DrawCardsPendingAction = Extract<PendingAction, { kind: "draw-cards" }>;

type PendingDrawCardsPanelProps = {
  owner?: Player;
  pending: DrawCardsPendingAction;
  onDraw: () => void;
};

export function PendingDrawCardsPanel({
  owner,
  pending,
  onDraw,
}: PendingDrawCardsPanelProps) {
  const ownerLabel = owner?.leader ?? "Player";
  const cardLabel = `${pending.amount} card${pending.amount === 1 ? "" : "s"}`;

  return (
    <div className="pending-controls leader-choice-grid action-choice-grid">
      <div className="leader-choice-summary action-choice-summary">
        <span>{pending.source}</span>
        <strong>{ownerLabel}: draw {cardLabel}</strong>
        <small>Resolve this draw after the preceding choices.</small>
      </div>

      <button
        type="button"
        className="leader-choice-card action-choice-card leader-choice-primary"
        onClick={onDraw}
        aria-label={`Draw ${cardLabel}`}
        title={`Draw ${cardLabel}`}
      >
        <span className="leader-choice-badge action-choice-badge">
          <BookOpen size={13} />
          Draw
        </span>
        <strong>Draw {cardLabel}</strong>
        <small>{pending.source}</small>
      </button>
    </div>
  );
}
