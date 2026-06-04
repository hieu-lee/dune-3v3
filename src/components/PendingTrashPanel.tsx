import type { Card, PendingAction, Player, TrashCardZone } from "../game/types";

type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;
type TrashChoice = {
  card: Card;
  zone: TrashCardZone;
};

type PendingTrashPanelProps = {
  choices: TrashChoice[];
  owner: Player;
  pending: TrashCardPendingAction;
  onSkip: () => void;
  onTrash: (zone: TrashCardZone, cardId: string, choiceIndex: number) => void;
};

export function PendingTrashPanel({
  choices,
  owner,
  pending,
  onSkip,
  onTrash,
}: PendingTrashPanelProps) {
  const drawCardsReward = pending.drawCardsReward ?? 0;
  const vpReward = pending.vpReward ?? 0;
  const rewardParts = [
    drawCardsReward > 0
      ? `Trash reward: draw ${drawCardsReward} card${drawCardsReward === 1 ? "" : "s"}`
      : undefined,
    vpReward > 0 ? `Trash reward: gain ${vpReward} VP` : undefined,
  ].filter((part): part is string => Boolean(part));
  const choiceCountText = `${choices.length} ${choices.length === 1 ? "card" : "cards"} available`;

  return (
    <div className="pending-controls trash-choice-grid">
      <div className="trash-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: {pending.optional ? "optional " : ""}trash</strong>
        <small>{rewardParts.length > 0 ? rewardParts.join(" and ") : choiceCountText}</small>
      </div>

      <div className="trash-choice-section">
        <div className="trash-choice-section-heading">
          <strong>Trashable cards</strong>
          <span>{choices.length > 0 ? choiceCountText : "No trashable cards"}</span>
        </div>
        {choices.length > 0 ? (
          <div className="trash-choice-cards">
            {choices.map(({ zone, card }, index) => {
              const zoneLabel = zone === "playArea" ? "in play" : zone;
              return (
                <button
                  type="button"
                  className="trash-choice-card"
                  key={`${zone}-${card.id}-${index}`}
                  aria-label={`${card.name} (${zoneLabel})`}
                  onClick={() => onTrash(zone, card.id, index)}
                  title={`Trash ${card.name}`}
                >
                  {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                  <span className="trash-choice-badge">Trash</span>
                  <strong>{card.name}</strong>
                  <small>{zoneLabel}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="trash-choice-empty">No trashable cards</div>
        )}
      </div>

      {(pending.optional || choices.length === 0) && (
        <div className="trash-choice-actions">
          <button
            type="button"
            className="trash-choice-action-card"
            aria-label={pending.optional ? "Skip" : "Continue"}
            onClick={onSkip}
          >
            <span className="trash-choice-badge">{pending.optional ? "Optional" : "Blocked"}</span>
            <strong>{pending.optional ? "Skip" : "Continue"}</strong>
            <small>{pending.optional ? "Leave cards untrashed." : "No trashable cards available."}</small>
          </button>
        </div>
      )}
    </div>
  );
}
