import { RotateCcw, Swords } from "lucide-react";
import type { PendingAction, Player } from "../game/types";

type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type ControlDefensePendingAction = Extract<PendingAction, { kind: "control-defense" }>;
type ReinforceDestination = "garrison" | "conflict";
type ReinforcePendingAction = Extract<PendingAction, { kind: "reinforce" }>;
type RetreatTroopsForStrengthPendingAction = Extract<PendingAction, { kind: "retreat-troops-for-strength" }>;
type DeployOrRetreatTroopsPendingAction = Extract<PendingAction, { kind: "deploy-or-retreat-troops" }>;

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
    <div className="pending-controls military-choice-grid">
      <div className="military-choice-summary">
        <span>Deployment</span>
        <strong>{pending.remaining} deployable</strong>
        <small>{owner ? `${owner.garrison} in garrison` : "Owner unavailable"}</small>
      </div>
      <button
        type="button"
        className="military-choice-card military-choice-primary"
        onClick={onDeploy}
        disabled={!owner || owner.garrison <= 0}
        aria-label="Deploy 1"
      >
        <span className="military-choice-badge">
          <Swords size={13} />
          Combat
        </span>
        <strong>Deploy 1</strong>
        <small>Move one garrison troop into the conflict.</small>
      </button>
      <button
        type="button"
        className="military-choice-card"
        onClick={onDone}
        aria-label="Done"
      >
        <span className="military-choice-badge">Finish</span>
        <strong>Done</strong>
        <small>Keep the remaining troops in garrison.</small>
      </button>
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
    <div className="pending-controls support-grid military-choice-grid military-reinforce-grid">
      <div className="military-choice-summary">
        <span>Reinforce</span>
        <strong>{pending.remaining} {pending.remaining === 1 ? "troop" : "troops"} to assign</strong>
        <small>{pending.conflictBlocked ? "Conflict is blocked this turn" : "Choose each troop destination"}</small>
      </div>
      {allies.map((ally) => (
        <div className="support-target military-support-target" key={ally.id}>
          <div className="military-support-heading">
            <strong>{ally.leader}</strong>
            <span>{ally.garrison} garrison / {ally.deployedTroops} deployed</span>
          </div>
          <button
            type="button"
            className="military-choice-card"
            onClick={() => onReinforce(ally.id, "garrison")}
            aria-label="Garrison"
          >
            <span className="military-choice-badge">Reserve</span>
            <strong>Garrison</strong>
            <small>Add the troop to this ally's reserve.</small>
          </button>
          <button
            type="button"
            className="military-choice-card military-choice-primary"
            onClick={() => onReinforce(ally.id, "conflict")}
            disabled={pending.conflictBlocked}
            title={pending.conflictBlocked ? "Conflict deployment is blocked this turn." : undefined}
            aria-label="Conflict"
          >
            <span className="military-choice-badge">
              <Swords size={13} />
              Combat
            </span>
            <strong>Conflict</strong>
            <small>Deploy now for conflict strength.</small>
          </button>
        </div>
      ))}
      {pending.conflictBlocked && (
        <div className="military-choice-warning">Conflict deployment is blocked this turn.</div>
      )}
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
    <div className="pending-controls military-choice-grid">
      {owner && recipient ? (
        <>
          <div className="military-choice-summary">
            <span>{pending.source}</span>
            <strong>{recipient.leader}</strong>
            <small>{recipient.deployedTroops} deployed / {recipient.garrison} garrison</small>
          </div>
          <button
            type="button"
            className="military-choice-card military-choice-primary"
            onClick={onRetreat}
            disabled={!canResolve}
            aria-label={`Retreat ${pending.troopCount}: +${pending.strength}`}
          >
            <span className="military-choice-badge">
              <RotateCcw size={13} />
              Retreat
            </span>
            <strong>Retreat {pending.troopCount}: +{pending.strength}</strong>
            <small>Return troops to garrison and keep the printed strength bonus.</small>
          </button>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      {pending.optional && (
        <button
          type="button"
          className="military-choice-card"
          onClick={onSkip}
          aria-label="Skip"
        >
          <span className="military-choice-badge">Pass</span>
          <strong>Skip</strong>
          <small>Leave deployed troops in the conflict.</small>
        </button>
      )}
    </div>
  );
}

type PendingDeployOrRetreatTroopsPanelProps = {
  canDeploy: boolean;
  canRetreat: boolean;
  owner?: Player;
  pending: DeployOrRetreatTroopsPendingAction;
  recipient?: Player;
  onChoose: (choice: "deploy" | "retreat") => void;
  onSkip: () => void;
};

export function PendingDeployOrRetreatTroopsPanel({
  canDeploy,
  canRetreat,
  owner,
  pending,
  recipient,
  onChoose,
  onSkip,
}: PendingDeployOrRetreatTroopsPanelProps) {
  return (
    <div className="pending-controls military-choice-grid">
      {owner && recipient ? (
        <>
          <div className="military-choice-summary">
            <span>{pending.source}</span>
            <strong>{recipient.leader}</strong>
            <small>{recipient.garrison} garrison / {recipient.deployedTroops} deployed</small>
          </div>
          <button
            type="button"
            className="military-choice-card military-choice-primary"
            onClick={() => onChoose("deploy")}
            disabled={!canDeploy}
            aria-label={`Deploy ${pending.troopCount}`}
          >
            <span className="military-choice-badge">
              <Swords size={13} />
              Deploy
            </span>
            <strong>Deploy {pending.troopCount}</strong>
            <small>Move troops from garrison into the conflict.</small>
          </button>
          <button
            type="button"
            className="military-choice-card"
            onClick={() => onChoose("retreat")}
            disabled={!canRetreat}
            aria-label={`Retreat ${pending.troopCount}`}
          >
            <span className="military-choice-badge">
              <RotateCcw size={13} />
              Retreat
            </span>
            <strong>Retreat {pending.troopCount}</strong>
            <small>Pull deployed troops back to garrison.</small>
          </button>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      {pending.optional && (
        <button
          type="button"
          className="military-choice-card"
          onClick={onSkip}
          aria-label="Skip"
        >
          <span className="military-choice-badge">Pass</span>
          <strong>Skip</strong>
          <small>Do not move troops.</small>
        </button>
      )}
    </div>
  );
}
