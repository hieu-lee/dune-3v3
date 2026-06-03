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

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner.leader}</strong>
        {drawCardsReward > 0 && (
          <span>Trash reward: draw {drawCardsReward} card{drawCardsReward === 1 ? "" : "s"}</span>
        )}
        {vpReward > 0 && (
          <span>Trash reward: gain {vpReward} VP</span>
        )}
        {choices.length === 0 && <span>No trashable cards</span>}
        {choices.map(({ zone, card }, index) => (
          <button
            type="button"
            key={`${zone}-${card.id}-${index}`}
            onClick={() => onTrash(zone, card.id, index)}
            title={`Trash ${card.name}`}
          >
            {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
            <span>{card.name} ({zone === "playArea" ? "in play" : zone})</span>
          </button>
        ))}
      </div>
      {(pending.optional || choices.length === 0) && (
        <button type="button" onClick={onSkip}>{pending.optional ? "Skip" : "Continue"}</button>
      )}
    </div>
  );
}
