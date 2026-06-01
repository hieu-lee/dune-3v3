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
  onTrash: (zone: TrashCardZone, cardId: string) => void;
};

export function PendingTrashPanel({
  choices,
  owner,
  pending,
  onSkip,
  onTrash,
}: PendingTrashPanelProps) {
  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner.leader}</strong>
        {choices.length === 0 && <span>No trashable cards</span>}
        {choices.map(({ zone, card }) => (
          <button
            type="button"
            key={`${zone}-${card.id}`}
            onClick={() => onTrash(zone, card.id)}
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
