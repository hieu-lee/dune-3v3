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
    <div className="pending-controls support-grid">
      <span>Choose Influence from {pending.source}</span>
      {choices.map((choice) => {
        const owner = game.players.find((player) => player.id === choice.ownerId);
        return (
          <button
            type="button"
            key={`${choice.ownerId}-${choice.faction}`}
            onClick={() => onChoose(choice.ownerId, choice.faction)}
            title={`${owner?.leader ?? "Player"} gains ${amount} ${factionLabels[choice.faction]} Influence`}
          >
            <Handshake size={14} />
            <span>{factionShortLabels[choice.faction]}</span>
            {owner?.leader ?? "Player"}
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
  return (
    <div className="pending-controls support-grid">
      <span>{ownerName}: optional payment at {pending.source}</span>
      <button type="button" onClick={onPay} title={`Pay ${costLabel(pending.cost)} for ${costLabel(pending.gain)}`}>
        <WalletCards size={14} />
        Pay {costLabel(pending.cost)}
      </button>
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
