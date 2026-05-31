import { CircleDollarSign } from "lucide-react";
import { shaddamSignetInfluenceFactions } from "../app-helpers";
import type { ShaddamSignetRingChoice } from "../game/state";
import { factionLabels } from "../game/data";
import type { Player } from "../game/types";

type PendingShaddamSignetPanelProps = {
  ally?: Player;
  commander?: Player;
  onChoose: (choice: ShaddamSignetRingChoice) => void;
};

export function PendingShaddamSignetPanel({
  ally,
  commander,
  onChoose,
}: PendingShaddamSignetPanelProps) {
  return (
    <div className="pending-controls influence-buttons">
      {commander && ally ? (
        <>
          <button
            type="button"
            onClick={() => onChoose("troop")}
            disabled={commander.resources.solari < 1}
          >
            <CircleDollarSign size={15} />
            Spend 1: {ally.leader} recruits 1 troop
          </button>
          {shaddamSignetInfluenceFactions.map((faction) => {
            const owner = faction === "emperor" ? commander : ally;
            return (
              <button
                type="button"
                key={faction}
                onClick={() => onChoose({ kind: "influence", faction })}
                disabled={commander.resources.solari < 3}
              >
                <CircleDollarSign size={15} />
                Spend 3: {owner.leader} +1 {factionLabels[faction]}
              </button>
            );
          })}
        </>
      ) : (
        <span>Emperor of the Known Universe can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}
