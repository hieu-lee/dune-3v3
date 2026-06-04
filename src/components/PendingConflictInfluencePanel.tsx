import { Handshake } from "lucide-react";
import { factionShortLabels } from "../app-helpers";
import { factionLabels } from "../game/data";
import { mainBoardInfluenceChoices } from "../game/influence-choices";
import type { FactionId, PendingAction, Player } from "../game/types";

type ConflictInfluencePendingAction = Extract<PendingAction, { kind: "conflict-influence" }>;

type PendingConflictInfluencePanelProps = {
  owner?: Player;
  pending: ConflictInfluencePendingAction;
  onChoose: (faction: FactionId) => void;
};

export function PendingConflictInfluencePanel({
  owner,
  pending,
  onChoose,
}: PendingConflictInfluencePanelProps) {
  const choices = pending.choices ?? mainBoardInfluenceChoices;

  return (
    <div className="pending-controls support-grid influence-choice-grid">
      {owner ? (
        <>
          <div className="influence-choice-summary">
            <span>{owner.leader}: choose from {pending.source}</span>
            <strong>{pending.remaining} Influence reward{pending.remaining === 1 ? "" : "s"}</strong>
          </div>
          {choices.map((faction) => (
            <button
              type="button"
              className="influence-choice-card"
              key={faction}
              onClick={() => onChoose(faction)}
              title={`Gain 1 ${factionLabels[faction]} Influence`}
            >
              <span className="influence-choice-badge">
                <Handshake size={14} /> {factionShortLabels[faction]}
              </span>
              <strong>{factionLabels[faction]}</strong>
              <small>Gain 1 Influence</small>
            </button>
          ))}
        </>
      ) : (
        <span>Conflict Influence reward can no longer resolve with the current table state.</span>
      )}
    </div>
  );
}
