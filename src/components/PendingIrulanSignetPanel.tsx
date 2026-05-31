import { BookOpen, X } from "lucide-react";
import type { IrulanSignetRingChoice } from "../game/state";
import type { Player } from "../game/types";

type PendingIrulanSignetPanelProps = {
  acquireCount: number;
  owner?: Player;
  trashCount: number;
  onChoose: (choice: IrulanSignetRingChoice) => void;
};

export function PendingIrulanSignetPanel({
  acquireCount,
  owner,
  trashCount,
  onChoose,
}: PendingIrulanSignetPanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <>
          <button
            type="button"
            onClick={() => onChoose("acquire")}
            disabled={acquireCount === 0}
          >
            <BookOpen size={15} />
            Acquire cost-1 card to hand
          </button>
          <button
            type="button"
            onClick={() => onChoose("trash")}
            disabled={trashCount === 0}
          >
            <X size={15} />
            Trash hand card
          </button>
        </>
      ) : (
        <span>Chronicler&apos;s Insight can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}
