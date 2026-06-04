import { useState } from "react";
import type { IntrigueCard, PendingAction, Player, Resources } from "../game/types";

type TrashIntrigueForRewardPendingAction = Extract<PendingAction, { kind: "trash-intrigue-for-reward" }>;

type PendingTrashIntriguePanelProps = {
  canPay: boolean;
  choices: IntrigueCard[];
  owner?: Player;
  pending: TrashIntrigueForRewardPendingAction;
  onResolve: (intrigueId: string) => void;
  onSkip: () => void;
};

function intrigueRewardText(drawIntrigues: number) {
  if (drawIntrigues <= 0) return undefined;
  return `draw ${drawIntrigues} Intrigue card${drawIntrigues === 1 ? "" : "s"}`;
}

function resourceRewardTexts(gain: Partial<Resources>) {
  const parts = [
    gain.solari ? `${gain.solari} Solari` : undefined,
    gain.spice ? `${gain.spice} spice` : undefined,
    gain.water ? `${gain.water} water` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? [`gain ${parts.join(" and ")}`] : [];
}

function resourceCostText(cost: Partial<Resources>) {
  const parts = [
    cost.solari ? `${cost.solari} Solari` : undefined,
    cost.spice ? `${cost.spice} spice` : undefined,
    cost.water ? `${cost.water} water` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? ` and spend ${parts.join(" and ")}` : "";
}

function rewardText(pending: TrashIntrigueForRewardPendingAction) {
  const parts = [
    intrigueRewardText(pending.drawIntrigues),
    ...resourceRewardTexts(pending.gain),
    pending.gainVp > 0 ? `gain ${pending.gainVp} VP` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" and ") : "no reward";
}

function actionVerb(pending: TrashIntrigueForRewardPendingAction) {
  return pending.discard ? "Discard" : "Trash";
}

export function PendingTrashIntriguePanel({
  canPay,
  choices,
  owner,
  pending,
  onResolve,
  onSkip,
}: PendingTrashIntriguePanelProps) {
  const [selectedIntrigueId, setSelectedIntrigueId] = useState<string>();
  const selectedIntrigue = choices.find((card) => card.id === selectedIntrigueId);
  const ownerLabel = owner?.leader ?? "Player";
  const verb = actionVerb(pending);
  const actionText = `${verb} 1 Intrigue${resourceCostText(pending.cost)} to ${rewardText(pending)}`;

  return (
    <div className="pending-controls trash-choice-grid trash-intrigue-choice-grid">
      <div className="trash-choice-summary">
        <span>{pending.source}</span>
        <strong>{ownerLabel}: Intrigue {pending.discard ? "discard" : "trash"}</strong>
        <small>{actionText}</small>
      </div>

      <div className="trash-choice-section">
        <div className="trash-choice-section-heading">
          <strong>Choose Intrigue</strong>
          <span>{choices.length > 0 ? `${choices.length} ${choices.length === 1 ? "card" : "cards"} available` : "No Intrigues"}</span>
        </div>
        {choices.length > 0 ? (
          <div className="trash-choice-cards">
            {choices.map((card) => (
              <button
                className={`trash-choice-card${selectedIntrigueId === card.id ? " selected" : ""}`}
                type="button"
                aria-label={card.name}
                aria-pressed={selectedIntrigueId === card.id}
                key={card.id}
                onClick={() => setSelectedIntrigueId(card.id)}
                title={`${verb} ${card.name}`}
              >
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <span className="trash-choice-badge">Select</span>
                <strong>{card.name}</strong>
                <small>Intrigue</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="trash-choice-empty">No Intrigues</div>
        )}
      </div>

      <div className="trash-choice-actions">
        <button
          type="button"
          className="trash-choice-action-card trash-choice-resolve"
          aria-label={`Resolve ${pending.source}`}
          disabled={!selectedIntrigue || !canPay}
          onClick={() => {
            if (selectedIntrigue && canPay) onResolve(selectedIntrigue.id);
          }}
          title={canPay ? `Resolve ${pending.source}` : `Cannot pay ${pending.source} cost`}
        >
          <span className="trash-choice-badge">Resolve</span>
          <strong>Resolve {pending.source}</strong>
          <small>
            {!canPay ? "Cost cannot be paid." : selectedIntrigue ? `${verb} ${selectedIntrigue.name}.` : "Select an Intrigue first."}
          </small>
        </button>

        {(pending.optional || choices.length === 0 || !canPay) && (
          <button
            type="button"
            className="trash-choice-action-card"
            aria-label={pending.optional ? "Skip" : "Continue"}
            onClick={onSkip}
          >
            <span className="trash-choice-badge">{pending.optional ? "Optional" : "Blocked"}</span>
            <strong>{pending.optional ? "Skip" : "Continue"}</strong>
            <small>{pending.optional ? `Leave Intrigues un${pending.discard ? "discarded" : "trashed"}.` : "Cannot resolve this effect."}</small>
          </button>
        )}
      </div>
    </div>
  );
}
