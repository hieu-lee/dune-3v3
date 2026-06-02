import { useState } from "react";
import type { IntrigueCard, PendingAction, Player, Resources } from "../game/types";

type TrashIntrigueForRewardPendingAction = Extract<PendingAction, { kind: "trash-intrigue-for-reward" }>;

type PendingTrashIntriguePanelProps = {
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

function rewardText(pending: TrashIntrigueForRewardPendingAction) {
  const parts = [
    intrigueRewardText(pending.drawIntrigues),
    ...resourceRewardTexts(pending.gain),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" and ") : "no reward";
}

export function PendingTrashIntriguePanel({
  choices,
  owner,
  pending,
  onResolve,
  onSkip,
}: PendingTrashIntriguePanelProps) {
  const [selectedIntrigueId, setSelectedIntrigueId] = useState<string>();
  const selectedIntrigue = choices.find((card) => card.id === selectedIntrigueId);

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>Trash 1 Intrigue to {rewardText(pending)}</span>
        {choices.length === 0 && <span>No Intrigues</span>}
        {choices.map((card) => (
          <button
            className={selectedIntrigueId === card.id ? "selected" : undefined}
            type="button"
            aria-pressed={selectedIntrigueId === card.id}
            key={card.id}
            onClick={() => setSelectedIntrigueId(card.id)}
            title={`Trash ${card.name}`}
          >
            {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
            <span>{card.name}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedIntrigue}
        onClick={() => {
          if (selectedIntrigue) onResolve(selectedIntrigue.id);
        }}
      >
        Resolve {pending.source}
      </button>

      {(pending.optional || choices.length === 0) && (
        <button type="button" onClick={onSkip}>{pending.optional ? "Skip" : "Continue"}</button>
      )}
    </div>
  );
}
