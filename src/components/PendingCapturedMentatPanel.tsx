import { useState } from "react";
import { factionLabels } from "../game/data";
import type { Card, FactionId, Player } from "../game/types";

type PendingCapturedMentatPanelProps = {
  discardChoices: Card[];
  influenceChoices: FactionId[];
  owner?: Player;
  onResolve: (discardCardId: string, faction: FactionId) => void;
  onSkip: () => void;
};

export function PendingCapturedMentatPanel({
  discardChoices,
  influenceChoices,
  owner,
  onResolve,
  onSkip,
}: PendingCapturedMentatPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [selectedFaction, setSelectedFaction] = useState<FactionId>();
  const selectedCard = discardChoices.find((card) => card.id === selectedCardId);
  const canResolve = Boolean(selectedCard && selectedFaction);

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        {discardChoices.length === 0 && <span>No discardable cards</span>}
        {discardChoices.map((card) => (
          <button
            className={selectedCardId === card.id ? "selected" : undefined}
            type="button"
            aria-pressed={selectedCardId === card.id}
            key={card.id}
            onClick={() => setSelectedCardId(card.id)}
            title={`Discard ${card.name}`}
          >
            {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
            <span>{card.name}</span>
          </button>
        ))}
      </div>

      <div className="trade-intrigue-column captured-mentat-influence-column">
        <strong>Influence</strong>
        {influenceChoices.map((faction) => (
          <button
            className={selectedFaction === faction ? "selected" : undefined}
            type="button"
            aria-pressed={selectedFaction === faction}
            key={faction}
            onClick={() => setSelectedFaction(faction)}
          >
            <span>{factionLabels[faction]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!canResolve}
        onClick={() => {
          if (selectedCard && selectedFaction) onResolve(selectedCard.id, selectedFaction);
        }}
      >
        Resolve Captured Mentat
      </button>
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingInfluenceIntriguePanelProps = {
  influenceChoices: FactionId[];
  amount: number;
  optional: boolean;
  owner?: Player;
  source: string;
  onChoose: (faction: FactionId) => void;
  onSkip: () => void;
};

export function PendingInfluenceIntriguePanel({
  influenceChoices,
  amount,
  optional,
  owner,
  source,
  onChoose,
  onSkip,
}: PendingInfluenceIntriguePanelProps) {
  return (
    <div className="pending-controls">
      <strong>{owner?.leader ?? "Player"}</strong>
      <span>{source}: lose 1 Influence to draw {amount} Intrigue{amount === 1 ? "" : "s"}</span>
      {influenceChoices.map((faction) => (
        <button
          type="button"
          key={faction}
          onClick={() => onChoose(faction)}
        >
          {factionLabels[faction]}
        </button>
      ))}
      {optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}
