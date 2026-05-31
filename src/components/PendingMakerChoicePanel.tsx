import type { PendingAction, Player } from "../game/types";

type MakerChoicePendingAction = Extract<PendingAction, { kind: "maker-choice" }>;

type PendingMakerChoicePanelProps = {
  label?: string;
  owner: Player;
  pending: MakerChoicePendingAction;
  spiceOwner?: Player;
  onChoose: (choice: "spice" | "sandworms") => void;
};

export function PendingMakerChoicePanel({
  label,
  owner,
  pending,
  spiceOwner,
  onChoose,
}: PendingMakerChoicePanelProps) {
  const split = Boolean(spiceOwner && owner.id !== spiceOwner.id);

  return (
    <div className="pending-controls">
      <span>{label}</span>
      <button type="button" onClick={() => onChoose("spice")}>
        +{pending.spice} spice{split ? `: ${spiceOwner?.leader}` : ""}
      </button>
      <button type="button" onClick={() => onChoose("sandworms")} disabled={!pending.canSummonSandworms}>
        Summon {pending.sandworms}{split ? `: ${owner.leader}` : ""}
      </button>
    </div>
  );
}
