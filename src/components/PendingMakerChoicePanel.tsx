import type { PendingAction, Player } from "../game/types";

type MakerChoicePendingAction = Extract<PendingAction, { kind: "maker-choice" }>;

type PendingMakerChoicePanelProps = {
  label?: string;
  owner: Player;
  pending: MakerChoicePendingAction;
  spiceOwner?: Player;
  viewerPlayerId?: string;
  onChoose: (choice: "spice" | "sandworms") => void;
};

export function PendingMakerChoicePanel({
  label,
  owner,
  pending,
  spiceOwner,
  viewerPlayerId,
  onChoose,
}: PendingMakerChoicePanelProps) {
  const split = Boolean(spiceOwner && owner.id !== spiceOwner.id);
  const canChooseSpice = !viewerPlayerId || viewerPlayerId === pending.spiceOwnerId;
  const canChooseSandworms = !viewerPlayerId || viewerPlayerId === pending.ownerId;

  return (
    <div className="pending-controls">
      <span>{label}</span>
      <button type="button" onClick={() => onChoose("spice")} disabled={!canChooseSpice}>
        +{pending.spice} spice{split ? `: ${spiceOwner?.leader}` : ""}
      </button>
      <button type="button" onClick={() => onChoose("sandworms")} disabled={!canChooseSandworms || !pending.canSummonSandworms}>
        Summon {pending.sandworms}{split ? `: ${owner.leader}` : ""}
      </button>
    </div>
  );
}
