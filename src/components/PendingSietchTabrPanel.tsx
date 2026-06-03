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
  return (
    <div className="pending-controls">
      <span>{label}</span>
      <button type="button" onClick={() => onChoose("hooks")} disabled={!canChooseHooks}>
        {hooksChoiceParts.join(" + ")}
      </button>
      <button type="button" onClick={() => onChoose("shield-wall")} disabled={!canChooseShieldWall}>
        Water{pending.canRemoveShieldWall ? " + remove Shield Wall" : ""}
      </button>
    </div>
  );
}
