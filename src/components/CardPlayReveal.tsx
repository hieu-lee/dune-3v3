import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type { Card } from "../game/types";

export type CardPlayAnnouncement = {
  id: number;
  card: Card;
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
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (announcementId === null) return;
    const timer = window.setTimeout(() => onDoneRef.current(), REVEAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [announcementId]);

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
          <div className="card-play-reveal-card" key={announcement.id}>
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
