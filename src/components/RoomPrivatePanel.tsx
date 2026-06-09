import { Archive, Eye, FileText, ScrollText, Trash2 } from "lucide-react";
import type { Card, ContractCard, GamePhase, IntrigueCard, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

type RoomPrivatePanelProps = {
  compactForPending?: boolean;
  phase?: GamePhase;
  player?: Player;
  showHand?: boolean;
};

function cardNameList(cards: Array<Card | IntrigueCard | ContractCard>) {
  if (cards.length === 0) return <span className="private-zone-empty">Empty</span>;
  return cards.map((card) => <span key={card.id}>{card.name}</span>);
}

export function RoomPrivatePanel({ compactForPending = false, phase = "playing", player, showHand = true }: RoomPrivatePanelProps) {
  if (!player) return null;
  const hasHandCards = showHand && player.hand.length > 0;
  const hasPrivateActions = player.intrigues.length > 0;
  const trash = player.trash ?? [];
  const contracts = player.contracts.map((contract) => contract.card);
  const emptyPanel = !hasHandCards && !hasPrivateActions && player.discard.length === 0 && trash.length === 0 && contracts.length === 0;
  const compactPrivate = compactForPending || phase === "endgame" || phase === "finished";
  const compactNote = compactForPending
    ? `${player.hand.length} hand cards compacted while the team payment resolves.`
    : `${player.hand.length} hand cards hidden during final scoring.`;
  const privateZoneCount = player.discard.length + trash.length + player.intrigues.length + contracts.length;

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
          <p className="eyebrow">{showHand ? "Your hand" : "Private zones"}</p>
          <h2>{player.leader}</h2>
        </div>
        <span>{privateZoneCount} tracked</span>
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
        showHand && emptyPanel && <p className="empty-hand-note">No cards in hand.</p>
      )}
      <details className="room-private-zones" open={!showHand}>
        <summary>
          <Eye size={15} />
          <span>Private zones</span>
        </summary>
        <div className="private-zone-grid">
          <section>
            <strong><Archive size={14} />Discard ({player.discard.length})</strong>
            <div>{cardNameList(player.discard)}</div>
          </section>
          <section>
            <strong><Trash2 size={14} />Trash ({trash.length})</strong>
            <div>{cardNameList(trash)}</div>
          </section>
          <section>
            <strong><ScrollText size={14} />Intrigues ({player.intrigues.length})</strong>
            <div>{cardNameList(player.intrigues)}</div>
          </section>
          <section>
            <strong><FileText size={14} />Contracts ({contracts.length})</strong>
            <div>{cardNameList(contracts)}</div>
          </section>
        </div>
      </details>
    </section>
  );
}
