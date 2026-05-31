import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { teams } from "../game/data";
import type { Player } from "../game/types";

type LeaderReferenceModalProps = {
  player: Player | null;
  onClose: () => void;
};

export function LeaderReferenceModal({ player, onClose }: LeaderReferenceModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!player) return;
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
  }, [player?.id]);

  if (!player) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="leader-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${player.leader} leader card`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">{player.role} - {teams[player.team].name}</p>
            <h2>{player.leader}</h2>
          </div>
          <button
            className="icon-button"
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            title="Close leader card"
          >
            <X size={18} />
          </button>
        </header>
        {player.leaderCard.imagePath ? (
          <img
            className="leader-reference-art"
            src={player.leaderCard.imagePath}
            alt={`${player.leader} leader card`}
          />
        ) : (
          <p>Leader card art is unavailable.</p>
        )}
      </article>
    </div>
  );
}
