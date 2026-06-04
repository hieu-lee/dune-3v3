import { BookOpen, Eye, Swords } from "lucide-react";
import { iconLabels } from "../game/data";
import type { GamePhase, Player } from "../game/types";

type RoomPrivatePanelProps = {
  compactForPending?: boolean;
  phase?: GamePhase;
  player?: Player;
};

export function RoomPrivatePanel({ compactForPending = false, phase = "playing", player }: RoomPrivatePanelProps) {
  if (!player) return null;
  const hasHandCards = player.hand.length > 0;
  const hasPrivateActions = player.intrigues.length > 0;
  const emptyPanel = !hasHandCards && !hasPrivateActions;
  const compactPrivate = compactForPending || phase === "endgame" || phase === "finished";
  const compactNote = compactForPending
    ? `${player.hand.length} hand cards compacted while the team payment resolves.`
    : `${player.hand.length} hand cards hidden during final scoring.`;

  return (
    <section
      className={[
        "room-private-panel",
        emptyPanel ? "empty-hand-panel" : "",
        compactPrivate ? "room-private-panel-compact" : "",
      ].filter(Boolean).join(" ")}
      aria-label={`${player.leader} private cards`}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your hand</p>
          <h2>{player.leader}</h2>
        </div>
        <span>{player.intrigues.length} Intrigue</span>
      </div>
      {compactPrivate && hasHandCards ? (
        <p className="room-private-compact-note">{compactNote}</p>
      ) : hasHandCards ? (
        <div className="card-row">
          {player.hand.map((card) => {
            const hidden = card.name === "Hidden card";
            return (
              <article className={`hand-card room-private-card ${hidden ? "hidden-hand-card" : ""}`} key={card.id}>
                {hidden ? (
                  <div className="hidden-card-back" aria-hidden="true">
                    <span>Dune</span>
                  </div>
                ) : (
                  card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />
                )}
                <span>{hidden ? "Private" : card.icons.map((icon) => iconLabels[icon]).join(" / ") || "Reveal"}</span>
                <strong>{card.name}</strong>
                <p>{hidden ? "Only visible to that player." : card.play}</p>
                {!hidden && (
                  <footer>
                    <span><BookOpen size={13} /> {card.persuasion}</span>
                    <span><Swords size={13} /> {card.swords}</span>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        emptyPanel && <p className="empty-hand-note">No cards in hand.</p>
      )}
      {player.intrigues.length > 0 && (
        <div className="room-private-intrigues">
          <Eye size={15} />
          {player.intrigues.map((card) => (
            <span key={card.id}>{card.name}</span>
          ))}
        </div>
      )}
    </section>
  );
}
