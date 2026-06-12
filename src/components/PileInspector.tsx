import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Trash2, X } from "lucide-react";
import type { Card, GameState } from "../game/types";
import { graveyardCards, trashCards, type VaultPileId } from "./PlayerVault";

export type OpenPile = { playerId: string; pile: VaultPileId };

type PileInspectorProps = {
  game: GameState;
  open: OpenPile | null;
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
  onClose: () => void;
};

const PILE_META: Record<VaultPileId, { label: string; Icon: typeof Archive }> = {
  graveyard: { label: "Graveyard", Icon: Archive },
  trash: { label: "Trash", Icon: Trash2 },
};

function pileCards(game: GameState, open: OpenPile | null): Card[] {
  if (!open) return [];
  const player = game.players.find((candidate) => candidate.id === open.playerId);
  if (!player) return [];
  return open.pile === "graveyard" ? graveyardCards(player) : trashCards(player);
}

function cardEffectLines(card: Card): { label: string; text: string }[] {
  return [
    card.play ? { label: "Agent", text: card.play } : null,
    card.reveal ? { label: "Reveal", text: card.reveal } : null,
  ].filter((line): line is { label: string; text: string } => Boolean(line));
}

export function PileInspector({ game, open, selectedIndex, onSelectIndex, onClose }: PileInspectorProps) {
  // Retain the last opened pile so the panel can animate out with its content intact.
  const [shown, setShown] = useState<OpenPile | null>(open);
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) setShown(open);
  }, [open]);

  // While open, behave like a modal: move focus in, trap Tab, restore focus on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        inspectorRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((node) => node.tabIndex !== -1);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      const toRestore = restoreFocusRef.current;
      if (toRestore && typeof toRestore.focus === "function") {
        window.setTimeout(() => toRestore.focus(), 0);
      }
    };
  }, [open]);

  const listOpen = Boolean(open);
  const cards = pileCards(game, shown);
  const player = shown ? game.players.find((candidate) => candidate.id === shown.playerId) : undefined;
  const meta = shown ? PILE_META[shown.pile] : PILE_META.graveyard;
  const selectedCard = listOpen && selectedIndex !== null ? cards[selectedIndex] ?? null : null;
  const detailOpen = Boolean(selectedCard);
  const ListIcon = meta.Icon;
  const dialogLabel = `${player?.leader ?? ""} ${meta.label} pile`.trim();

  return createPortal(
    <div
      className="pile-inspector"
      ref={inspectorRef}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      aria-hidden={!listOpen}
      inert={!listOpen}
    >
      <button
        type="button"
        className={`pile-inspector-backdrop ${listOpen ? "is-open" : ""}`}
        tabIndex={-1}
        aria-label="Close pile"
        onClick={onClose}
      />

      <div
        className={`pile-detail-panel ${detailOpen ? "is-open" : ""}`}
        inert={!detailOpen}
      >
        {selectedCard && (
          <div className="pile-detail-body">
            <p className="eyebrow">{player?.leader} · {meta.label}</p>
            <h2>{selectedCard.name}</h2>
            {(selectedCard.imagePath ?? selectedCard.thumbnailPath) ? (
              <img
                className="pile-detail-art"
                src={selectedCard.imagePath ?? selectedCard.thumbnailPath}
                alt={`${selectedCard.name} card`}
              />
            ) : (
              <div className="pile-detail-art pile-detail-art-missing">Card art unavailable</div>
            )}
            {cardEffectLines(selectedCard).map((line) => (
              <p className="pile-detail-line" key={line.label}>
                <b>{line.label}</b>
                <span>{line.text}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className={`pile-list-drawer ${listOpen ? "is-open" : ""}`}>
        <header className="pile-list-header">
          <div>
            <p className="eyebrow"><ListIcon size={13} /> {player?.leader}</p>
            <h2>{meta.label} <span className="pile-list-count">{cards.length}</span></h2>
          </div>
          <button type="button" className="icon-button" ref={closeButtonRef} onClick={onClose} title="Close pile">
            <X size={18} />
          </button>
        </header>
        {cards.length === 0 ? (
          <p className="pile-list-empty">No cards in this pile.</p>
        ) : (
          <ul className="pile-list">
            {cards.map((card, index) => (
              <li key={`${card.id}-${index}`}>
                <button
                  type="button"
                  className={`pile-list-card ${selectedIndex === index ? "selected" : ""}`}
                  aria-pressed={selectedIndex === index}
                  onClick={() => onSelectIndex(selectedIndex === index ? null : index)}
                >
                  <span className="pile-list-card-art" aria-hidden="true">
                    {(card.imagePath ?? card.thumbnailPath) ? (
                      <img src={card.imagePath ?? card.thumbnailPath} alt="" loading="lazy" />
                    ) : (
                      <span className="pile-list-card-missing">{card.name}</span>
                    )}
                  </span>
                  <span className="pile-list-card-name">{card.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
