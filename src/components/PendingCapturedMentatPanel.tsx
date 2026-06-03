import { useState } from "react";
import { factionLabels } from "../game/data";
import type { Card, FactionId, PendingAction, Player, ResourceId, Resources } from "../game/types";

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
  bonusIntrigues?: {
    requiredDiscardTrait: string;
    amount: number;
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

function intrigueCountText(count: number) {
  return `${count} Intrigue card${count === 1 ? "" : "s"}`;
}

function traitLabel(trait: string) {
  return trait.startsWith("Faction: ") ? trait.slice("Faction: ".length) : trait;
}

function baseDrawText(drawCards: number) {
  return drawCards > 0 ? `Discard 1 card to draw ${cardCountText(drawCards)}` : "Discard 1 card";
}

function bonusRewardTexts(
  bonusDraw: PendingDiscardDrawPanelProps["bonusDraw"],
  bonusIntrigues: PendingDiscardDrawPanelProps["bonusIntrigues"],
  baseDrawCards: number,
) {
  const suffix = baseDrawCards > 0 ? " more" : "";
  if (
    bonusDraw &&
    bonusIntrigues &&
    bonusDraw.requiredDiscardTrait === bonusIntrigues.requiredDiscardTrait
  ) {
    return [
      `Discard a ${traitLabel(bonusDraw.requiredDiscardTrait)} card to draw ${bonusDraw.drawCards}${suffix} card${bonusDraw.drawCards === 1 ? "" : "s"} and draw ${intrigueCountText(bonusIntrigues.amount)}`,
    ];
  }
  return [
    bonusDraw
      ? `Discard a ${traitLabel(bonusDraw.requiredDiscardTrait)} card to draw ${bonusDraw.drawCards}${suffix} card${bonusDraw.drawCards === 1 ? "" : "s"}`
      : undefined,
    bonusIntrigues
      ? `Discard a ${traitLabel(bonusIntrigues.requiredDiscardTrait)} card to draw ${intrigueCountText(bonusIntrigues.amount)}`
      : undefined,
  ].filter((part): part is string => Boolean(part));
}

function selectedDrawSuffix(totalDrawCards: number, totalIntrigues: number) {
  const parts = [
    totalDrawCards > 0 ? cardCountText(totalDrawCards) : undefined,
    totalIntrigues > 0 ? intrigueCountText(totalIntrigues) : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? ` (${parts.join(", ")})` : " (no cards)";
}

export function PendingDiscardDrawPanel({
  discardChoices,
  drawCards,
  bonusDraw,
  bonusIntrigues,
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
  const selectedBonusIntrigues =
    selectedCard && bonusIntrigues && selectedCard.traits?.includes(bonusIntrigues.requiredDiscardTrait)
      ? bonusIntrigues.amount
      : 0;
  const totalDrawCards = drawCards + selectedBonusDraw;
  const bonusTexts = bonusRewardTexts(bonusDraw, bonusIntrigues, drawCards);

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>{baseDrawText(drawCards)}</span>
        {bonusTexts.map((bonusText) => <span key={bonusText}>{bonusText}</span>)}
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
        Resolve {source}{selectedCard ? selectedDrawSuffix(totalDrawCards, selectedBonusIntrigues) : ""}
      </button>
      {optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}

type PendingDiscardRewardPanelProps = {
  discardChoices: Card[];
  owner?: Player;
  pending: Extract<PendingAction, { kind: "discard-cards-for-reward" }>;
  onResolve: (discardCardId: string) => void;
  onSkip: () => void;
};

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function resourceText(resources: Partial<Resources>, verb: "spend" | "gain") {
  return (["solari", "spice", "water"] as const)
    .map((resource) => {
      const amount = resources[resource] ?? 0;
      return amount > 0 ? `${verb} ${amount} ${resourceLabels[resource]}` : undefined;
    })
    .filter((part): part is string => Boolean(part));
}

function discardRewardTexts(pending: PendingDiscardRewardPanelProps["pending"]) {
  return [
    ...resourceText(pending.cost, "spend"),
    ...resourceText(pending.gain, "gain"),
    pending.gainVp > 0 ? `gain ${pending.gainVp} VP` : undefined,
    pending.takeContracts ? "take a face-up CHOAM contract" : undefined,
  ].filter((part): part is string => Boolean(part));
}

export function PendingDiscardRewardPanel({
  discardChoices,
  owner,
  pending,
  onResolve,
  onSkip,
}: PendingDiscardRewardPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const selectedCard = discardChoices.find((card) => card.id === selectedCardId);
  const discardText = pending.total === 1 ? "Discard 1 card" : `Discard ${pending.total} cards`;
  const remainingText = pending.remaining < pending.total ? `${pending.remaining} remaining` : undefined;
  const rewardTexts = discardRewardTexts(pending);

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>
          {pending.source}: {discardText}{rewardTexts.length > 0 ? ` to ${rewardTexts.join("; ")}` : ""}
          {remainingText ? ` (${remainingText})` : ""}
        </span>
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
        {pending.remaining > 1 ? `Discard ${selectedCard?.name ?? "card"}` : `Resolve ${pending.source}`}
      </button>
      {pending.optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}

type PendingDiscardHandCardPanelProps = {
  discardChoices: Card[];
  owner?: Player;
  remaining: number;
  source: string;
  onResolve: (discardCardId: string) => void;
};

export function PendingDiscardHandCardPanel({
  discardChoices,
  owner,
  remaining,
  source,
  onResolve,
}: PendingDiscardHandCardPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const selectedCard = discardChoices.find((card) => card.id === selectedCardId);
  const remainingText = remaining === 1 ? "Discard 1 card" : `Discard ${remaining} cards`;

  return (
    <div className="pending-controls trade-intrigue-grid">
      <div className="trade-intrigue-column">
        <strong>{owner?.leader ?? "Player"}</strong>
        <span>{source}: {remainingText}</span>
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
        Discard {selectedCard?.name ?? "card"}
      </button>
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
