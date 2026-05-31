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
  return (
    <div className="pending-controls support-grid">
      {owner ? (
        <>
          <span>
            {owner.leader}: choose {pending.remaining} Influence reward{pending.remaining === 1 ? "" : "s"} from {pending.source}
          </span>
          {mainBoardInfluenceChoices.map((faction) => (
            <button
              type="button"
              key={faction}
              onClick={() => onChoose(faction)}
              title={`Gain 1 ${factionLabels[faction]} Influence`}
            >
              <Handshake size={14} />
              <span>{factionShortLabels[faction]}</span>
              {factionLabels[faction]}
            </button>
          ))}
        </>
      ) : (
        <span>Conflict Influence reward can no longer resolve with the current table state.</span>
      )}
    </div>
  );
}
