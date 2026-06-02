import type { PendingAction } from "../game/types";

type SietchTabrPendingAction = Extract<PendingAction, { kind: "sietch-tabr" }>;

type PendingSietchTabrPanelProps = {
  canRecruitTroop: boolean;
  label?: string;
  pending: SietchTabrPendingAction;
  onChoose: (choice: "hooks" | "shield-wall") => void;
};

export function PendingSietchTabrPanel({
  canRecruitTroop,
  label,
  pending,
  onChoose,
}: PendingSietchTabrPanelProps) {
  const hooksChoiceParts = [
    pending.canTakeMakerHooks ? "Hooks" : undefined,
    canRecruitTroop ? "troop" : undefined,
    "water",
  ].filter((part): part is string => Boolean(part));
  return (
    <div className="pending-controls">
      <span>{label}</span>
      <button type="button" onClick={() => onChoose("hooks")}>
        {hooksChoiceParts.join(" + ")}
      </button>
      <button type="button" onClick={() => onChoose("shield-wall")}>
        Water{pending.canRemoveShieldWall ? " + remove Shield Wall" : ""}
      </button>
    </div>
  );
}
