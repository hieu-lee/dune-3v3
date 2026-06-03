import { BookOpen, Eye, Swords } from "lucide-react";
import { iconLabels } from "../game/data";
import type { Player } from "../game/types";

type RoomPrivatePanelProps = {
  player?: Player;
};

export function RoomPrivatePanel({ player }: RoomPrivatePanelProps) {
  if (!player) return null;
  return (
    <section className="room-private-panel" aria-label={`${player.leader} private cards`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your hand</p>
          <h2>{player.leader}</h2>
        </div>
        <span>{player.intrigues.length} Intrigue</span>
      </div>
      <div className="card-row">
        {player.hand.map((card) => (
          <article className="hand-card room-private-card" key={card.id}>
            {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
            <span>{card.icons.map((icon) => iconLabels[icon]).join(" / ") || "Reveal"}</span>
            <strong>{card.name}</strong>
            <p>{card.play}</p>
            <footer>
              <span><BookOpen size={13} /> {card.persuasion}</span>
              <span><Swords size={13} /> {card.swords}</span>
            </footer>
          </article>
        ))}
      </div>
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
