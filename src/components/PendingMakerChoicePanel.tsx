import { Coins, Sparkles } from "lucide-react";
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
  const spiceLabel = `+${pending.spice} spice${split ? `: ${spiceOwner?.leader}` : ""}`;
  const sandwormLabel = `Summon ${pending.sandworms}${split ? `: ${owner.leader}` : ""}`;

  return (
    <div className="pending-controls support-grid split-choice-grid">
      <div className="split-choice-summary">
        <span>Maker space</span>
        <strong>{label}</strong>
      </div>
      <button
        type="button"
        className="split-choice-card"
        onClick={() => onChoose("spice")}
        disabled={!canChooseSpice}
      >
        <span className="split-choice-badge">
          <Coins size={14} /> Spice
        </span>
        <strong>{spiceLabel}</strong>
        <small>{spiceOwner?.leader ?? owner.leader} takes the spice reward</small>
      </button>
      <button
        type="button"
        className="split-choice-card"
        onClick={() => onChoose("sandworms")}
        disabled={!canChooseSandworms || !pending.canSummonSandworms}
      >
        <span className="split-choice-badge">
          <Sparkles size={14} /> Worms
        </span>
        <strong>{sandwormLabel}</strong>
        <small>{owner.leader} summons from this Maker space</small>
      </button>
    </div>
  );
}
