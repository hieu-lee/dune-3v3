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
  return (
    <div className="pending-controls spy-grid">
      <span>{owner.leader}: {owner.spies} spies ready</span>
      {owner.spies <= 0 && supplyRecallSpaces.length > 0 && (
        <span>Recall one spy for supply, then place.</span>
      )}
      {supplyRecallSpaces.map((space) => (
        <button
          type="button"
          key={`recall-${space.id}`}
          onClick={() => onRecallSupplySpy(space.id)}
          title={`Recall spy from ${space.name} for no effect`}
        >
          <RotateCcw size={14} />
          {space.name}
        </button>
      ))}
      {placementSpaces.map((space) => (
        <button type="button" key={space.id} onClick={() => onPlaceSpy(space.id)}>
          {space.name}
        </button>
      ))}
      {placementSpaces.length === 0 && owner.spies > 0 && <span>No legal spy posts</span>}
      <button
        type="button"
        onClick={onDone}
        disabled={pending.mustPlaceSpy}
        title={pending.mustPlaceSpy ? "Place the spy to finish this effect" : undefined}
      >
        Done
      </button>
    </div>
  );
}
