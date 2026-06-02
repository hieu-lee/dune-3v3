import { useState } from "react";
import type { Card, PendingAction, Player } from "../game/types";
import type { TopDeckSelectionChoice } from "../game/state";

type TopDeckSelectionPendingAction = Extract<PendingAction, { kind: "top-deck-selection" }>;
type TopDeckRole = "draw" | "discard" | "trash";

type RoleSelection = Partial<Record<TopDeckRole, number>>;
type KeyedRoleSelection = {
  key: string;
  roles: RoleSelection;
};

type PendingTopDeckSelectionPanelProps = {
  cards: Card[];
  owner?: Player;
  pending: TopDeckSelectionPendingAction;
  onResolve: (choice: TopDeckSelectionChoice) => void;
  onSkip: () => void;
};

const roleLabels: Record<TopDeckRole, string> = {
  draw: "Draw",
  discard: "Discard",
  trash: "Trash",
};

function selectionForCard(selection: RoleSelection, cardIndex: number) {
  return (Object.entries(selection) as Array<[TopDeckRole, number | undefined]>)
    .find(([, selectedIndex]) => selectedIndex === cardIndex)?.[0];
}

function chooseRole(selection: RoleSelection, role: TopDeckRole, cardIndex: number): RoleSelection {
  const nextSelection: RoleSelection = {};
  for (const [candidateRole, selectedIndex] of Object.entries(selection) as Array<[TopDeckRole, number | undefined]>) {
    if (candidateRole !== role && selectedIndex !== cardIndex) {
      nextSelection[candidateRole] = selectedIndex;
    }
  }
  return { ...nextSelection, [role]: cardIndex };
}

function completeChoice(selection: RoleSelection): TopDeckSelectionChoice | undefined {
  if (
    selection.draw === undefined ||
    selection.discard === undefined ||
    selection.trash === undefined
  ) {
    return undefined;
  }
  if (new Set([selection.draw, selection.discard, selection.trash]).size !== 3) return undefined;
  return {
    drawIndex: selection.draw,
    discardIndex: selection.discard,
    trashIndex: selection.trash,
  };
}

export function PendingTopDeckSelectionPanel({
  cards,
  owner,
  pending,
  onResolve,
  onSkip,
}: PendingTopDeckSelectionPanelProps) {
  const selectionKey = `${pending.ownerId}|${pending.source}|${cards.map((card) => card.id).join("|")}`;
  const [selectionState, setSelectionState] = useState<KeyedRoleSelection>({ key: selectionKey, roles: {} });
  const selection = selectionState.key === selectionKey ? selectionState.roles : {};
  const choice = completeChoice(selection);
  const canInspectCards = cards.length >= pending.lookCards;

  return (
    <div className="pending-controls top-deck-selection">
      <div className="trade-intrigue-column top-deck-selection-summary">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>
          Look at the top {pending.lookCards} cards. Draw {pending.drawCards}, discard {pending.discardCards}, and trash {pending.trashCards}.
        </span>
        {!canInspectCards && <span>Not enough deck cards to resolve this choice.</span>}
      </div>

      {canInspectCards && (
        <div className="top-deck-selection-grid">
          {cards.map((card, index) => {
            const selectedRole = selectionForCard(selection, index);
            return (
              <div className="top-deck-selection-card" key={`${card.id}-${index}`}>
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <strong>{card.name}</strong>
                <div className="top-deck-selection-roles">
                  {(Object.keys(roleLabels) as TopDeckRole[]).map((role) => (
                    <button
                      type="button"
                      className={selectedRole === role ? "selected" : undefined}
                      aria-pressed={selectedRole === role}
                      aria-label={`${roleLabels[role]} ${card.name}`}
                      title={`${roleLabels[role]} ${card.name}`}
                      key={role}
                      onClick={() => {
                        setSelectionState((current) => ({
                          key: selectionKey,
                          roles: chooseRole(current.key === selectionKey ? current.roles : {}, role, index),
                        }));
                      }}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canInspectCards ? (
        <button
          type="button"
          disabled={!choice}
          onClick={() => {
            if (choice) onResolve(choice);
          }}
        >
          Resolve {pending.source}
        </button>
      ) : (
        <button type="button" onClick={onSkip}>
          Skip {pending.source}
        </button>
      )}
    </div>
  );
}
