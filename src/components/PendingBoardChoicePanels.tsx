import { Handshake, WalletCards } from "lucide-react";
import { costLabel, factionShortLabels } from "../app-helpers";
import { factionLabels } from "../game/data";
import type { FactionId, GameState, PendingAction } from "../game/types";

type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;
type OptionalSpacePaymentPendingAction = Extract<PendingAction, { kind: "optional-space-payment" }>;

type PendingBoardInfluenceChoicePanelProps = {
  game: GameState;
  pending: BoardInfluenceChoicePendingAction;
  viewerPlayerId?: string;
  onChoose: (ownerId: string, faction: FactionId) => void;
};

export function PendingBoardInfluenceChoicePanel({
  game,
  pending,
  viewerPlayerId,
  onChoose,
}: PendingBoardInfluenceChoicePanelProps) {
  const amount = pending.amount ?? 1;
  const choices = viewerPlayerId
    ? pending.choices.filter((choice) => choice.ownerId === viewerPlayerId)
    : pending.choices;
  return (
    <div className="pending-controls support-grid influence-choice-grid">
      <div className="influence-choice-summary">
        <span>Choose Influence from {pending.source}</span>
        <strong>{amount} Influence</strong>
      </div>
      {choices.map((choice) => {
        const owner = game.players.find((player) => player.id === choice.ownerId);
        return (
          <button
            type="button"
            className="influence-choice-card"
            key={`${choice.ownerId}-${choice.faction}`}
            onClick={() => onChoose(choice.ownerId, choice.faction)}
            title={`${owner?.leader ?? "Player"} gains ${amount} ${factionLabels[choice.faction]} Influence`}
          >
            <span className="influence-choice-badge">
              <Handshake size={14} /> {factionShortLabels[choice.faction]}
            </span>
            <strong>{factionLabels[choice.faction]}</strong>
            <small>{owner?.leader ?? "Player"} gains {amount}</small>
          </button>
        );
      })}
      {choices.length === 0 && <span>No Influence choices for this seat</span>}
    </div>
  );
}

type PendingOptionalSpacePaymentPanelProps = {
  ownerName: string;
  pending: OptionalSpacePaymentPendingAction;
  onPay: () => void;
  onSkip: () => void;
};

export function PendingOptionalSpacePaymentPanel({
  ownerName,
  pending,
  onPay,
  onSkip,
}: PendingOptionalSpacePaymentPanelProps) {
  const payLabel = `Pay ${costLabel(pending.cost)}`;
  return (
    <div className="pending-controls support-grid split-choice-grid">
      <div className="split-choice-summary">
        <span>Optional payment</span>
        <strong>{ownerName}: {pending.source}</strong>
      </div>
      <button
        type="button"
        className="split-choice-card"
        onClick={onPay}
        title={`${payLabel} for ${costLabel(pending.gain)}`}
      >
        <span className="split-choice-badge">
          <WalletCards size={14} /> Pay
        </span>
        <strong>{payLabel}</strong>
        <small>Gain {costLabel(pending.gain)}</small>
      </button>
      <button type="button" className="split-choice-card split-choice-skip" onClick={onSkip}>
        <span className="split-choice-badge">Skip</span>
        <strong>Skip</strong>
        <small>Decline this optional space payment</small>
      </button>
    </div>
  );
}
