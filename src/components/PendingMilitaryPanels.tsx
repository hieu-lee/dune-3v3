import { RotateCcw, Swords } from "lucide-react";
import type { PendingAction, Player } from "../game/types";

type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type ControlDefensePendingAction = Extract<PendingAction, { kind: "control-defense" }>;
type ReinforceDestination = "garrison" | "conflict";
type ReinforcePendingAction = Extract<PendingAction, { kind: "reinforce" }>;
type RetreatTroopsForStrengthPendingAction = Extract<PendingAction, { kind: "retreat-troops-for-strength" }>;

type PendingDeployPanelProps = {
  owner?: Player;
  pending: DeployPendingAction;
  onDeploy: () => void;
  onDone: () => void;
};

export function PendingDeployPanel({
  owner,
  pending,
  onDeploy,
  onDone,
}: PendingDeployPanelProps) {
  return (
    <div className="pending-controls">
      <span>{pending.remaining} deployable</span>
      <button type="button" onClick={onDeploy} disabled={!owner || owner.garrison <= 0}>
        <Swords size={15} />
        Deploy 1
      </button>
      <button type="button" onClick={onDone}>Done</button>
    </div>
  );
}

type PendingControlDefensePanelProps = {
  locationName: string;
  owner?: Player;
  supply: number;
  onDeploy: () => void;
  onSkip: () => void;
};

export function PendingControlDefensePanel({
  locationName,
  owner,
  supply,
  onDeploy,
  onSkip,
}: PendingControlDefensePanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <>
          <span>
            {locationName} control: {supply} in supply
          </span>
          <button type="button" onClick={onDeploy} disabled={supply <= 0}>
            <Swords size={15} />
            Deploy 1
          </button>
          <button type="button" onClick={onSkip}>Skip</button>
        </>
      ) : (
        <>
          <span>Control marker owner can no longer resolve this deployment.</span>
          <button type="button" onClick={onSkip}>Skip</button>
        </>
      )}
    </div>
  );
}

type PendingReinforcePanelProps = {
  allies: Player[];
  pending: ReinforcePendingAction;
  onReinforce: (playerId: string, destination: ReinforceDestination) => void;
};

export function PendingReinforcePanel({
  allies,
  pending,
  onReinforce,
}: PendingReinforcePanelProps) {
  return (
    <div className="pending-controls support-grid">
      {allies.map((ally) => (
        <div className="support-target" key={ally.id}>
          <strong>{ally.leader}</strong>
          <button type="button" onClick={() => onReinforce(ally.id, "garrison")}>Garrison</button>
          <button
            type="button"
            onClick={() => onReinforce(ally.id, "conflict")}
            disabled={pending.conflictBlocked}
            title={pending.conflictBlocked ? "Conflict deployment is blocked this turn." : undefined}
          >
            Conflict
          </button>
        </div>
      ))}
      {pending.conflictBlocked && <span>Conflict deployment is blocked this turn.</span>}
    </div>
  );
}

type PendingRetreatTroopsForStrengthPanelProps = {
  canResolve: boolean;
  owner?: Player;
  pending: RetreatTroopsForStrengthPendingAction;
  recipient?: Player;
  onRetreat: () => void;
  onSkip: () => void;
};

export function PendingRetreatTroopsForStrengthPanel({
  canResolve,
  owner,
  pending,
  recipient,
  onRetreat,
  onSkip,
}: PendingRetreatTroopsForStrengthPanelProps) {
  return (
    <div className="pending-controls">
      {owner && recipient ? (
        <>
          <span>
            {recipient.leader}: {recipient.deployedTroops} deployed
          </span>
          <button type="button" onClick={onRetreat} disabled={!canResolve}>
            <RotateCcw size={15} />
            Retreat {pending.troopCount}: +{pending.strength}
          </button>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
