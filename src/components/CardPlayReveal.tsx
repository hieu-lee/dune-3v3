import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type { Card } from "../game/types";

export type CardPlayAnnouncement = {
  id: number;
  card: Card;
  playerId: string;
  playerName: string;
  playerColor: string;
  action: "played" | "revealed";
};

const REVEAL_DURATION_MS = 1500;

type CardPlayRevealProps = {
  announcement: CardPlayAnnouncement | null;
  onDone: () => void;
};

export function CardPlayReveal({ announcement, onDone }: CardPlayRevealProps) {
  const announcementId = announcement?.id ?? null;
  const playerId = announcement?.playerId ?? null;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (announcementId === null) return;
    const timer = window.setTimeout(() => onDoneRef.current(), REVEAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [announcementId]);

  // Aim the fly-out at the acting player's table-strip tile. Falls back to a
  // shrink-in-place when the tile isn't on screen.
  useLayoutEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    element.style.removeProperty("--fly-x");
    element.style.removeProperty("--fly-y");
    if (announcementId === null || playerId === null) return;
    const target = document.querySelector(`.player-strip-tile[data-player-id="${CSS.escape(playerId)}"]`);
    if (!target) return;
    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    // Only fly when the destination tile is on screen; otherwise the card would
    // sail far off an edge, so shrink in place instead.
    const onScreen = targetY >= 0 && targetY <= window.innerHeight && targetX >= 0 && targetX <= window.innerWidth;
    if (!onScreen) return;
    const cardRect = element.getBoundingClientRect();
    const dx = targetX - (cardRect.left + cardRect.width / 2);
    const dy = targetY - (cardRect.top + cardRect.height / 2);
    element.style.setProperty("--fly-x", `${Math.round(dx)}px`);
    element.style.setProperty("--fly-y", `${Math.round(dy)}px`);
  }, [announcementId, playerId]);

  const caption = announcement
    ? `${announcement.playerName} ${announcement.action} ${announcement.card.name}`
    : "";
  const imagePath = announcement ? announcement.card.imagePath ?? announcement.card.thumbnailPath : undefined;

  return createPortal(
    <div className="card-play-reveal-root">
      <p className="sr-only" role="status">{caption}</p>
      {announcement && (
        <div
          className="card-play-reveal"
          aria-hidden="true"
          style={{
            "--player": announcement.playerColor,
            "--reveal-duration": `${REVEAL_DURATION_MS}ms`,
          } as CSSProperties}
        >
          <div className="card-play-reveal-card" key={announcement.id} ref={cardRef}>
            {imagePath ? (
              <img className="card-play-reveal-art" src={imagePath} alt="" loading="eager" />
            ) : (
              <div className="card-play-reveal-fallback"><span>{announcement.card.name}</span></div>
            )}
            <span className="card-play-reveal-caption">
              <b>{announcement.playerName}</b> {announcement.action} <em>{announcement.card.name}</em>
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
