import type { Card, PendingAction, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

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
    <div className="pending-controls throne-choice throne-choice-grid">
      <div className="throne-choice-summary">
        <span>Throne Row</span>
        <strong>Choose an eligible card</strong>
        <small>Move one Imperium Row card into the reserved market.</small>
      </div>
      <div className="throne-choice-cards">
        {eligibleCards.map((card) => (
          <button
            type="button"
            className="throne-choice-card"
            key={card.id}
            aria-label={cardAccessibleSummary(
              card,
              `Move ${card.name} to the Throne Row`,
              `${card.cost ?? 0} persuasion`,
            )}
            onClick={() => onChoose(card.id)}
          >
            <CardAssetPreview
              card={card}
              detailLabel="Throne choice"
              metaLabel={`${card.cost ?? 0} persuasion`}
            />
          </button>
        ))}
        {noEligible && (
          <button
            type="button"
            className="throne-choice-card throne-choice-empty-card"
            aria-label="No eligible card"
            onClick={onNoEligible}
          >
            <span>No eligible card</span>
            <small>Continue without changing Throne Row.</small>
          </button>
        )}
      </div>
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
    <div className="pending-controls conflict-tie-grid">
      <div className="conflict-tie-summary">
        <span>Conflict tie</span>
        <strong>Rank {rank} concession</strong>
        <small>Choose which ally claims this reward rank.</small>
      </div>
      {allies.map((ally) => (
        <button
          type="button"
          className="conflict-tie-card conflict-tie-primary"
          key={ally.id}
          aria-label={`${ally.leader} ${chooseLabel}`}
          onClick={() => onChooseWinner(ally.id)}
        >
          <span className="conflict-tie-badge">{chooseLabel}</span>
          <strong>{ally.leader}</strong>
          <small>{ally.conflict} strength</small>
        </button>
      ))}
      <button
        type="button"
        className="conflict-tie-card conflict-tie-skip"
        aria-label="No concession"
        onClick={() => onChooseWinner()}
      >
        <span className="conflict-tie-badge">Keep order</span>
        <strong>No concession</strong>
        <small>Resolve tied allies without a concession.</small>
      </button>
    </div>
  );
}
