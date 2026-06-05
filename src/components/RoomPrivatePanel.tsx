import { Eye } from "lucide-react";
import type { GamePhase, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

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
              <article
                className={`hand-card room-private-card ${hidden ? "hidden-hand-card" : ""}`}
                key={card.id}
                aria-label={hidden ? "Hidden private card" : cardAccessibleSummary(card)}
                tabIndex={hidden ? undefined : 0}
              >
                {hidden ? (
                  <div className="hidden-card-back" aria-hidden="true">
                    <span>Dune</span>
                  </div>
                ) : (
                  <CardAssetPreview card={card} detailLabel="Your hand" />
                )}
                {hidden && (
                  <>
                    <span>Private</span>
                    <strong>{card.name}</strong>
                    <p>Only visible to that player.</p>
                  </>
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
