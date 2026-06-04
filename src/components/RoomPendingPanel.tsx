import { Clock, Crown } from "lucide-react";
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
      <section className="room-pending-panel room-pending-generic" aria-label="Room pending action">
        <div className="room-pending-summary">
          <div>
            <p className="eyebrow">Pending online action</p>
            <h2>{owner ? owner.leader : "Table"} must resolve</h2>
            <small>{pending.kind.replaceAll("-", " ")}</small>
          </div>
          <span className="room-pending-status waiting">
            <Clock size={14} />
            Waiting
          </span>
        </div>
      </section>
    );
  }

  const owner = game.players.find((player) => player.id === pending.ownerId);
  const canChoose = claimedPlayerId === pending.ownerId;
  const eligibleCards = game.imperiumRow.filter(canMoveCardToThroneRow);
  const actorName = owner?.leader ?? "Shaddam";
  return (
    <section className="room-pending-panel room-pending-throne" aria-label="Room Throne Row choice">
      <div className="room-pending-summary">
        <div>
          <p className="eyebrow">Pending online action</p>
          <h2>{actorName} Throne Row</h2>
          <small>
            {canChoose
              ? "Choose one eligible Imperium Row card to move into the team Throne Row."
              : `Waiting for ${actorName} to choose one eligible Imperium Row card.`}
          </small>
        </div>
        <span className={`room-pending-status ${canChoose ? "ready" : "waiting"}`}>
          {canChoose ? <Crown size={14} /> : <Clock size={14} />}
          {canChoose ? "Your choice" : "Waiting"}
        </span>
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
