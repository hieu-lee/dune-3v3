import { Archive, Eye, FileText, ScrollText, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Card, ContractCard, GamePhase, IntrigueCard, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

type RoomPrivatePanelProps = {
  compactForPending?: boolean;
  phase?: GamePhase;
  player?: Player;
  showHand?: boolean;
};

type PrivateZoneCard = Card | IntrigueCard | ContractCard;
type PrivateZoneDetail = {
  card: PrivateZoneCard;
  playerId: string;
  zoneLabel: string;
};

function privateZoneCardImage(card: PrivateZoneCard) {
  return card.imagePath ?? card.thumbnailPath;
}

function privateZoneCardEffect(card: PrivateZoneCard) {
  if ("summary" in card) return card.summary;
  if ("play" in card) {
    return [
      card.play ? `Agent: ${card.play}` : undefined,
      card.reveal ? `Reveal: ${card.reveal}` : undefined,
    ].filter((part): part is string => Boolean(part)).join(" ");
  }
  return "Complete this contract for its printed reward.";
}

function PrivateZoneCardButton({
  card,
  playerId,
  zoneLabel,
  onInspect,
}: {
  card: PrivateZoneCard;
  playerId: string;
  zoneLabel: string;
  onInspect: (detail: PrivateZoneDetail) => void;
}) {
  const imagePath = privateZoneCardImage(card);
  const effect = privateZoneCardEffect(card);

  return (
    <button
      type="button"
      className="private-zone-card"
      aria-label={`${zoneLabel}: ${card.name}. ${effect}`}
      onClick={() => onInspect({ card, playerId, zoneLabel })}
    >
      <span className="private-zone-card-art" aria-hidden="true">
        {imagePath ? (
          <img src={imagePath} alt="" loading="lazy" />
        ) : (
          <span className="private-zone-card-missing">Card asset unavailable</span>
        )}
      </span>
      <span className="private-zone-card-effect">{effect}</span>
    </button>
  );
}

function PrivateZoneCardList({
  cards,
  playerId,
  zoneLabel,
  onInspect,
}: {
  cards: PrivateZoneCard[];
  playerId: string;
  zoneLabel: string;
  onInspect: (detail: PrivateZoneDetail) => void;
}) {
  if (cards.length === 0) return <span className="private-zone-empty">Empty</span>;
  return cards.map((card) => (
    <PrivateZoneCardButton
      card={card}
      key={card.id}
      playerId={playerId}
      zoneLabel={zoneLabel}
      onInspect={onInspect}
    />
  ));
}

function PrivateZoneCardModal({ detail, onClose }: { detail: PrivateZoneDetail | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!detail) return;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [detail?.card.id]);

  if (!detail) return null;
  const imagePath = privateZoneCardImage(detail.card);
  const effect = privateZoneCardEffect(detail.card);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="private-zone-card-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${detail.card.name} card detail`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">{detail.zoneLabel}</p>
            <h2>{detail.card.name}</h2>
          </div>
          <button
            className="icon-button"
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            title="Close card detail"
          >
            <X size={18} />
          </button>
        </header>
        <div className="private-zone-card-detail">
          {imagePath ? (
            <img className="private-zone-card-detail-art" src={imagePath} alt={`${detail.card.name} card`} />
          ) : (
            <div className="private-zone-card-detail-missing">Card asset unavailable</div>
          )}
          <section className="private-zone-card-detail-copy">
            <p className="eyebrow">Effect</p>
            <p>{effect}</p>
          </section>
        </div>
      </article>
    </div>,
    document.body,
  );
}

export function RoomPrivatePanel({ compactForPending = false, phase = "playing", player, showHand = true }: RoomPrivatePanelProps) {
  const [inspectedCard, setInspectedCard] = useState<PrivateZoneDetail | null>(null);
  useEffect(() => {
    setInspectedCard(null);
  }, [player?.id]);

  if (!player) return null;
  const activeInspectedCard = inspectedCard?.playerId === player.id ? inspectedCard : null;
  const hasHandCards = showHand && player.hand.length > 0;
  const hasPrivateActions = player.intrigues.length > 0;
  const trash = player.trash ?? [];
  const contracts = player.contracts.map((contract) => contract.card);
  const graveyard = [...player.discard, ...player.playArea];
  const emptyPanel = !hasHandCards && !hasPrivateActions && graveyard.length === 0 && trash.length === 0 && contracts.length === 0;
  const compactPrivate = compactForPending || phase === "endgame" || phase === "finished";
  const compactNote = compactForPending
    ? `${player.hand.length} hand cards compacted while the team payment resolves.`
    : `${player.hand.length} hand cards hidden during final scoring.`;
  const privateZoneCount = graveyard.length + trash.length + player.intrigues.length + contracts.length;

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
            <strong><Archive size={14} />Graveyard ({graveyard.length})</strong>
            <div>
              <PrivateZoneCardList cards={graveyard} playerId={player.id} zoneLabel="Graveyard" onInspect={setInspectedCard} />
            </div>
          </section>
          <section>
            <strong><Trash2 size={14} />Trash ({trash.length})</strong>
            <div>
              <PrivateZoneCardList cards={trash} playerId={player.id} zoneLabel="Trash" onInspect={setInspectedCard} />
            </div>
          </section>
          <section>
            <strong><ScrollText size={14} />Intrigues ({player.intrigues.length})</strong>
            <div>
              <PrivateZoneCardList cards={player.intrigues} playerId={player.id} zoneLabel="Intrigues" onInspect={setInspectedCard} />
            </div>
          </section>
          <section>
            <strong><FileText size={14} />Contracts ({contracts.length})</strong>
            <div>
              <PrivateZoneCardList cards={contracts} playerId={player.id} zoneLabel="Contracts" onInspect={setInspectedCard} />
            </div>
          </section>
        </div>
      </details>
      <PrivateZoneCardModal detail={activeInspectedCard} onClose={() => setInspectedCard(null)} />
    </section>
  );
}
