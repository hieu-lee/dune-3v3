import { ShieldOff, Sparkles, Waves } from "lucide-react";
import type { PendingAction } from "../game/types";

type SietchTabrPendingAction = Extract<PendingAction, { kind: "sietch-tabr" }>;

type PendingSietchTabrPanelProps = {
  canRecruitTroop: boolean;
  label?: string;
  pending: SietchTabrPendingAction;
  viewerPlayerId?: string;
  onChoose: (choice: "hooks" | "shield-wall") => void;
};

export function PendingSietchTabrPanel({
  canRecruitTroop,
  label,
  pending,
  viewerPlayerId,
  onChoose,
}: PendingSietchTabrPanelProps) {
  const canChooseHooks = !viewerPlayerId || viewerPlayerId === pending.ownerId;
  const canChooseShieldWall = !viewerPlayerId || viewerPlayerId === pending.waterOwnerId;
  const hooksChoiceParts = [
    pending.canTakeMakerHooks ? "Hooks" : undefined,
    canRecruitTroop ? "troop" : undefined,
    "water",
  ].filter((part): part is string => Boolean(part));
  const hooksLabel = hooksChoiceParts.join(" + ");
  const waterLabel = `Water${pending.canRemoveShieldWall ? " + remove Shield Wall" : ""}`;

  return (
    <div className="pending-controls support-grid split-choice-grid">
      <div className="split-choice-summary">
        <span>Sietch Tabr</span>
        <strong>{label}</strong>
      </div>
      <button
        type="button"
        className="split-choice-card"
        onClick={() => onChoose("hooks")}
        disabled={!canChooseHooks}
      >
        <span className="split-choice-badge">
          <Sparkles size={14} /> Units
        </span>
        <strong>{hooksLabel}</strong>
        <small>Take the Fremen-side Sietch reward</small>
      </button>
      <button
        type="button"
        className="split-choice-card"
        onClick={() => onChoose("shield-wall")}
        disabled={!canChooseShieldWall}
      >
        <span className="split-choice-badge">
          {pending.canRemoveShieldWall ? <ShieldOff size={14} /> : <Waves size={14} />}
          Water
        </span>
        <strong>{waterLabel}</strong>
        <small>{pending.canRemoveShieldWall ? "Take water and remove the Shield Wall" : "Take the water reward"}</small>
      </button>
    </div>
  );
}
