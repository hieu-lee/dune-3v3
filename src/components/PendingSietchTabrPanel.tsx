import type { PendingAction } from "../game/types";

type SietchTabrPendingAction = Extract<PendingAction, { kind: "sietch-tabr" }>;

type PendingSietchTabrPanelProps = {
  label?: string;
  pending: SietchTabrPendingAction;
  onChoose: (choice: "hooks" | "shield-wall") => void;
};

export function PendingSietchTabrPanel({
  label,
  pending,
  onChoose,
}: PendingSietchTabrPanelProps) {
  return (
    <div className="pending-controls">
      <span>{label}</span>
      <button type="button" onClick={() => onChoose("hooks")}>
        {pending.canTakeMakerHooks ? "Hooks + " : ""}Troop + water
      </button>
      <button type="button" onClick={() => onChoose("shield-wall")}>
        Water{pending.canRemoveShieldWall ? " + remove Shield Wall" : ""}
      </button>
    </div>
  );
}
