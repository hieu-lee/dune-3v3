import { canMoveCardToThroneRow } from "../game/state";
import type { GameState } from "../game/types";

type RoomPendingPanelProps = {
  claimedPlayerId?: string;
  game: GameState;
  onChooseThroneRowCard: (cardId: string) => void;
};

export function RoomPendingPanel({ claimedPlayerId, game, onChooseThroneRowCard }: RoomPendingPanelProps) {
  const pending = game.pendingAction;
  if (!pending) return null;

  if (pending.kind !== "throne-row") {
    const owner = "ownerId" in pending ? game.players.find((player) => player.id === pending.ownerId) : undefined;
    return (
      <section className="room-pending-panel" aria-label="Room pending action">
        <p className="eyebrow">Pending online action</p>
        <strong>{owner ? owner.leader : "Table"} must resolve {pending.kind}</strong>
      </section>
    );
  }

  const owner = game.players.find((player) => player.id === pending.ownerId);
  const canChoose = claimedPlayerId === pending.ownerId;
  const eligibleCards = game.imperiumRow.filter(canMoveCardToThroneRow);
  return (
    <section className="room-pending-panel" aria-label="Room Throne Row choice">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Pending online action</p>
          <h2>{owner?.leader ?? "Shaddam"} Throne Row</h2>
        </div>
        <span>{canChoose ? "Your choice" : "Waiting"}</span>
      </div>
      <div className="room-throne-row">
        {eligibleCards.map((card) => (
          <button
            type="button"
            className="market-card"
            data-testid={`room-throne-card-${card.id}`}
            disabled={!canChoose}
            key={card.id}
            onClick={() => onChooseThroneRowCard(card.id)}
          >
            {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
            <span>{card.cost ?? 0} persuasion</span>
            <strong>{card.name}</strong>
            <p>{card.reveal}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
