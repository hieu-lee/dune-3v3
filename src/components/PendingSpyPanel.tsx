import { RotateCcw } from "lucide-react";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;

type PendingSpyPanelProps = {
  owner: Player;
  pending: SpyPendingAction;
  placementSpaces: BoardSpace[];
  supplyRecallSpaces: BoardSpace[];
  onDone: () => void;
  onPlaceSpy: (spaceId: string) => void;
  onRecallSupplySpy: (spaceId: string) => void;
};

export function PendingSpyPanel({
  owner,
  pending,
  placementSpaces,
  supplyRecallSpaces,
  onDone,
  onPlaceSpy,
  onRecallSupplySpy,
}: PendingSpyPanelProps) {
  const spyCountText = `${owner.spies} ${owner.spies === 1 ? "spy" : "spies"} ready`;
  const remainingText = `${pending.remaining} ${pending.remaining === 1 ? "placement" : "placements"} remaining`;
  const placementScope = pending.placementIcon ? `${pending.placementIcon} posts` : "Legal spy posts";
  const needsSupplyRecall = owner.spies <= 0 && supplyRecallSpaces.length > 0;

  return (
    <div className="pending-controls spy-grid">
      <div className="spy-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: {spyCountText}</strong>
        <small>{remainingText} - {pending.mustPlaceSpy ? "required placement" : "optional placement"}</small>
      </div>

      <div className="spy-choice-actions">
        {needsSupplyRecall && (
          <div className="spy-choice-note">Recall one spy for supply, then place.</div>
        )}

        {supplyRecallSpaces.length > 0 && (
          <div className="spy-choice-section">
            <div className="spy-choice-section-heading">
              <strong>Supply recall</strong>
              <span>Return a posted spy before placing.</span>
            </div>
            <div className="spy-space-grid">
              {supplyRecallSpaces.map((space) => (
                <button
                  type="button"
                  key={`recall-${space.id}`}
                  className="spy-choice-card spy-choice-secondary"
                  aria-label={space.name}
                  onClick={() => onRecallSupplySpy(space.id)}
                  title={`Recall spy from ${space.name} for no effect`}
                >
                  <span className="spy-choice-badge"><RotateCcw size={13} /> Recall</span>
                  <strong>{space.name}</strong>
                  <small>Return this spy to supply.</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="spy-choice-section">
          <div className="spy-choice-section-heading">
            <strong>Spy placement</strong>
            <span>{placementScope}</span>
          </div>
          {placementSpaces.length > 0 ? (
            <div className="spy-space-grid">
              {placementSpaces.map((space) => (
                <button
                  type="button"
                  key={space.id}
                  className="spy-choice-card spy-choice-primary"
                  aria-label={space.name}
                  onClick={() => onPlaceSpy(space.id)}
                >
                  <span className="spy-choice-badge">Place</span>
                  <strong>{space.name}</strong>
                  <small>Commit one spy here.</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="spy-choice-empty">No legal spy posts</div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="spy-choice-card spy-choice-done"
        aria-label="Done"
        onClick={onDone}
        disabled={pending.mustPlaceSpy}
        title={pending.mustPlaceSpy ? "Place the spy to finish this effect" : undefined}
      >
        <span className="spy-choice-badge">Finish</span>
        <strong>Done</strong>
        <small>{pending.mustPlaceSpy ? "Place the spy first." : "Continue without another placement."}</small>
      </button>
    </div>
  );
}
