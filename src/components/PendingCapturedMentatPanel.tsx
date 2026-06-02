import { useState } from "react";
import { factionLabels } from "../game/data";
import type { Card, FactionId, Player } from "../game/types";

type PendingDiscardInfluenceDrawPanelProps = {
  discardChoices: Card[];
  drawCards: number;
  influenceAmount: number;
  influenceChoices: FactionId[];
  optional: boolean;
  owner?: Player;
  source: string;
  onResolve: (discardCardId: string, faction: FactionId) => void;
  onSkip: () => void;
};

export function PendingDiscardInfluenceDrawPanel({
  discardChoices,
  drawCards,
  influenceAmount,
  influenceChoices,
  optional,
  owner,
  source,
  onResolve,
  onSkip,
}: PendingDiscardInfluenceDrawPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [selectedFaction, setSelectedFaction] = useState<FactionId>();
  const selectedCard = discardChoices.find((card) => card.id === selectedCardId);
  const canResolve = Boolean(selectedCard && selectedFaction);
  const cardText = `${drawCards} card${drawCards === 1 ? "" : "s"}`;
  const influenceText = `${influenceAmount} Influence`;

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>Discard 1 card to gain {influenceText} and draw {cardText}</span>
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

      <div className="trade-intrigue-column discard-influence-column">
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
        Resolve {source}
      </button>
      {optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}

type PendingDiscardDrawPanelProps = {
  discardChoices: Card[];
  drawCards: number;
  bonusDraw?: {
    requiredDiscardTrait: string;
    drawCards: number;
  };
  optional: boolean;
  owner?: Player;
  source: string;
  onResolve: (discardCardId: string) => void;
  onSkip: () => void;
};

function cardCountText(count: number) {
  return `${count} card${count === 1 ? "" : "s"}`;
}

function traitLabel(trait: string) {
  return trait.startsWith("Faction: ") ? trait.slice("Faction: ".length) : trait;
}

function baseDrawText(drawCards: number) {
  return drawCards > 0 ? `Discard 1 card to draw ${cardCountText(drawCards)}` : "Discard 1 card";
}

function bonusDrawText(bonusDraw: PendingDiscardDrawPanelProps["bonusDraw"], baseDrawCards: number) {
  if (!bonusDraw) return undefined;
  const suffix = baseDrawCards > 0 ? " more" : "";
  return `Discard a ${traitLabel(bonusDraw.requiredDiscardTrait)} card to draw ${bonusDraw.drawCards}${suffix} card${bonusDraw.drawCards === 1 ? "" : "s"}`;
}

function selectedDrawSuffix(totalDrawCards: number) {
  return totalDrawCards > 0 ? ` (${cardCountText(totalDrawCards)})` : " (no cards)";
}

export function PendingDiscardDrawPanel({
  discardChoices,
  drawCards,
  bonusDraw,
  optional,
  owner,
  source,
  onResolve,
  onSkip,
}: PendingDiscardDrawPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const selectedCard = discardChoices.find((card) => card.id === selectedCardId);
  const selectedBonusDraw = selectedCard && bonusDraw && selectedCard.traits?.includes(bonusDraw.requiredDiscardTrait)
    ? bonusDraw.drawCards
    : 0;
  const totalDrawCards = drawCards + selectedBonusDraw;
  const bonusText = bonusDrawText(bonusDraw, drawCards);

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>{baseDrawText(drawCards)}</span>
        {bonusText && <span>{bonusText}</span>}
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

      <button
        type="button"
        disabled={!selectedCard}
        onClick={() => {
          if (selectedCard) onResolve(selectedCard.id);
        }}
      >
        Resolve {source}{selectedCard ? selectedDrawSuffix(totalDrawCards) : ""}
      </button>
      {optional && <button type="button" onClick={onSkip}>Skip</button>}
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
