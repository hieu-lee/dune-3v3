import { Handshake, WalletCards } from "lucide-react";
import { costLabel, factionShortLabels } from "../app-helpers";
import { factionLabels } from "../game/data";
import type { FactionId, GameState, PendingAction } from "../game/types";

type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;
type OptionalSpacePaymentPendingAction = Extract<PendingAction, { kind: "optional-space-payment" }>;

type PendingBoardInfluenceChoicePanelProps = {
  game: GameState;
  pending: BoardInfluenceChoicePendingAction;
  onChoose: (ownerId: string, faction: FactionId) => void;
};

export function PendingBoardInfluenceChoicePanel({
  game,
  pending,
  onChoose,
}: PendingBoardInfluenceChoicePanelProps) {
  return (
    <div className="pending-controls support-grid">
      <span>Choose Influence from {pending.source}</span>
      {pending.choices.map((choice) => {
        const owner = game.players.find((player) => player.id === choice.ownerId);
        return (
          <button
            type="button"
            key={`${choice.ownerId}-${choice.faction}`}
            onClick={() => onChoose(choice.ownerId, choice.faction)}
            title={`${owner?.leader ?? "Player"} gains 1 ${factionLabels[choice.faction]} Influence`}
          >
            <Handshake size={14} />
            <span>{factionShortLabels[choice.faction]}</span>
            {owner?.leader ?? "Player"}
          </button>
        );
      })}
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
