import { RotateCcw } from "lucide-react";
import {
  spyObservationPostDetailForSpace,
  spyObservationPostLabelForSpace,
} from "../game/state";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;

type PendingRecallSpyPanelProps = {
  choices: BoardSpace[];
  owner: Player;
  pending: RecallSpyPendingAction;
  recipient?: Player;
  onRecall: (spaceId: string) => void;
  onSkip: () => void;
};

export function PendingRecallSpyPanel({
  choices,
  owner,
  pending,
  recipient,
  onRecall,
  onSkip,
}: PendingRecallSpyPanelProps) {
  const spyCountText = `${pending.remaining} ${pending.remaining === 1 ? "spy" : "spies"}`;
  const rewardParts = [
    pending.strength > 0
      ? `add +${pending.strength} strength${recipient ? ` to ${recipient.leader}` : ""}`
      : undefined,
    pending.drawCards
      ? `draw ${pending.drawCards} card${pending.drawCards === 1 ? "" : "s"}`
      : undefined,
    pending.drawIntrigues
      ? `draw ${pending.drawIntrigues} Intrigue ${pending.drawIntrigues === 1 ? "card" : "cards"}`
      : undefined,
    pending.persuasionReward
      ? `gain ${pending.persuasionReward} persuasion`
      : undefined,
  ].filter((part): part is string => Boolean(part));
  const rewardText = rewardParts.length > 0 ? ` to ${rewardParts.join(" and ")}` : "";

  return (
    <div className="pending-controls spy-grid">
      <div className="spy-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: recall {spyCountText}</strong>
        <small>{rewardParts.length > 0 ? rewardParts.join(" and ") : "Return posted spies to supply."}</small>
      </div>

      <div className="spy-choice-actions">
        <div className="spy-choice-section">
          <div className="spy-choice-section-heading">
            <strong>Spy recall</strong>
            <span>{rewardText ? `Recall from a post${rewardText}.` : "Choose a posted spy to recall."}</span>
          </div>
          {choices.length > 0 ? (
            <div className="spy-space-grid">
              {choices.map((space) => (
                <button
                  type="button"
                  key={space.id}
                  className="spy-choice-card spy-choice-secondary"
                  aria-label={spyObservationPostLabelForSpace(space.id)}
                  onClick={() => onRecall(space.id)}
                  title={`Recall spy from ${spyObservationPostLabelForSpace(space.id)}`}
                >
                  <span className="spy-choice-badge"><RotateCcw size={13} /> Recall</span>
                  <strong>{spyObservationPostLabelForSpace(space.id)}</strong>
                  <small>{spyObservationPostDetailForSpace(space.id)}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="spy-choice-empty">No spy posts</div>
          )}
        </div>
      </div>

      {pending.optional && (
        <button
          type="button"
          className="spy-choice-card spy-choice-done"
          aria-label="Skip"
          onClick={onSkip}
        >
          <span className="spy-choice-badge">Optional</span>
          <strong>Skip</strong>
          <small>Leave spies posted.</small>
        </button>
      )}
    </div>
  );
}
