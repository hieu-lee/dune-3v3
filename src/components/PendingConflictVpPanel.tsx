import { CircleDollarSign, RotateCcw, Sparkles } from "lucide-react";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type ConflictVpPendingAction = Extract<PendingAction, { kind: "conflict-vp-conversion" }>;

type PendingConflictVpPanelProps = {
  canPay: boolean;
  owner?: Player;
  pending: ConflictVpPendingAction;
  spyChoices: BoardSpace[];
  onPay: () => void;
  onRecallSpy: (spaceId: string) => void;
  onSkip: () => void;
};

export function PendingConflictVpPanel({
  canPay,
  owner,
  pending,
  spyChoices,
  onPay,
  onRecallSpy,
  onSkip,
}: PendingConflictVpPanelProps) {
  return (
    <div className="pending-controls spy-grid">
      {owner ? (
        <>
          <span>
            {pending.remaining} available conversion{pending.remaining === 1 ? "" : "s"} from {pending.source}
          </span>
          {pending.cost.kind === "resource" ? (
            <button type="button" onClick={onPay} disabled={!canPay}>
              {pending.cost.resource === "spice" ? <Sparkles size={15} /> : <CircleDollarSign size={15} />}
              Spend {pending.cost.amount} {pending.cost.resource}: +{pending.vp} VP
            </button>
          ) : (
            <>
              <span>
                Recall {pending.cost.count - pending.cost.recalled} more {pending.cost.count - pending.cost.recalled === 1 ? "spy" : "spies"}.
              </span>
              {spyChoices.map((space) => (
                <button
                  type="button"
                  key={space.id}
                  onClick={() => onRecallSpy(space.id)}
                  title={`Recall spy from ${space.name}`}
                >
                  <RotateCcw size={14} />
                  {space.name}
                </button>
              ))}
              {spyChoices.length === 0 && <span>No spy posts to recall</span>}
            </>
          )}
          <button
            type="button"
            onClick={onSkip}
            disabled={pending.cost.kind === "recall-spies" && pending.cost.recalled > 0}
          >
            Skip
          </button>
        </>
      ) : (
        <span>Conflict reward can no longer resolve with the current table state.</span>
      )}
    </div>
  );
}
