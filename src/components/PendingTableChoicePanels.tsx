import type { Card, PendingAction, Player } from "../game/types";

type RevealAdjustPendingAction = Extract<PendingAction, { kind: "reveal-adjust" }>;

type PendingRevealAdjustPanelProps = {
  owner: Player;
  pending: RevealAdjustPendingAction;
  recipient: Player;
  onAdjust: (persuasionDelta: number, strengthDelta: number) => void;
  onDone: () => void;
};

export function PendingRevealAdjustPanel({
  owner,
  pending,
  recipient,
  onAdjust,
  onDone,
}: PendingRevealAdjustPanelProps) {
  return (
    <div className="pending-controls reveal-adjust">
      <span>{pending.cards.join(", ")}</span>
      <span>{owner.persuasion} persuasion</span>
      <button
        type="button"
        onClick={() => onAdjust(-1, 0)}
        disabled={pending.allowPersuasionAdjustment === false || pending.persuasionAdjustment <= 0}
      >
        -1
      </button>
      <button
        type="button"
        onClick={() => onAdjust(1, 0)}
        disabled={pending.allowPersuasionAdjustment === false}
      >
        +1
      </button>
      <span>{recipient.conflict} strength</span>
      <button
        type="button"
        onClick={() => onAdjust(0, -1)}
        disabled={pending.allowStrengthAdjustment === false || pending.strengthAdjustment <= 0}
      >
        -1
      </button>
      <button
        type="button"
        onClick={() => onAdjust(0, 1)}
        disabled={pending.allowStrengthAdjustment === false}
      >
        +1
      </button>
      <button type="button" onClick={onDone}>Done</button>
    </div>
  );
}

type PendingThroneRowPanelProps = {
  eligibleCards: Card[];
  noEligible: boolean;
  onChoose: (cardId: string) => void;
  onNoEligible: () => void;
};

export function PendingThroneRowPanel({
  eligibleCards,
  noEligible,
  onChoose,
  onNoEligible,
}: PendingThroneRowPanelProps) {
  return (
    <div className="pending-controls contract-choice throne-choice">
      {eligibleCards.map((card) => (
        <button type="button" key={card.id} onClick={() => onChoose(card.id)}>
          {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
          <span>{card.name}</span>
        </button>
      ))}
      {noEligible && (
        <button type="button" onClick={onNoEligible}>No eligible card</button>
      )}
    </div>
  );
}

type PendingConflictTiePanelProps = {
  allies: Player[];
  rank: 1 | 2 | 3;
  onChooseWinner: (winnerId?: string) => void;
};

export function PendingConflictTiePanel({
  allies,
  rank,
  onChooseWinner,
}: PendingConflictTiePanelProps) {
  const chooseLabel = rank === 1 ? "Takes first" : rank === 2 ? "Takes second" : "Takes third";
  return (
    <div className="pending-controls support-grid">
      {allies.map((ally) => (
        <div className="support-target" key={ally.id}>
          <strong>{ally.leader}</strong>
          <span>{ally.conflict} strength</span>
          <button type="button" onClick={() => onChooseWinner(ally.id)}>{chooseLabel}</button>
        </div>
      ))}
      <button type="button" onClick={() => onChooseWinner()}>No concession</button>
    </div>
  );
}
