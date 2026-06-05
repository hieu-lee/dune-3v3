import { useState } from "react";
import { Handshake } from "lucide-react";
import { factionShortLabels } from "../app-helpers";
import { factionLabels } from "../game/data";
import type { InfluenceExchangeChoice } from "../game/state";
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
  const actionText = `Discard 1 card to gain ${influenceText} and draw ${cardText}`;

  return (
    <div className="pending-controls discard-choice-grid discard-influence-draw-grid">
      <div className="discard-choice-summary">
        <span>{source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>{actionText}</small>
      </div>

      <div className="discard-choice-section">
        <div className="discard-choice-section-heading">
          <strong>Discard card</strong>
          <span>{discardChoices.length > 0 ? discardableCountText(discardChoices.length) : "No discardable cards"}</span>
        </div>
        {discardChoices.length > 0 ? (
          <div className="discard-choice-cards">
            {discardChoices.map((card) => (
              <button
                className={`discard-choice-card${selectedCardId === card.id ? " selected" : ""}`}
                type="button"
                aria-label={card.name}
                aria-pressed={selectedCardId === card.id}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                title={`Discard ${card.name}`}
              >
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <span className="discard-choice-badge">Discard</span>
                <strong>{card.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="discard-choice-empty">No discardable cards</div>
        )}
      </div>

      <div className="discard-choice-section discard-influence-section">
        <div className="discard-choice-section-heading">
          <strong>Influence</strong>
          <span>Choose one faction.</span>
        </div>
        <div className="discard-choice-options">
          {influenceChoices.map((faction) => (
            <button
              className={`discard-choice-option-card${selectedFaction === faction ? " selected" : ""}`}
              type="button"
              aria-pressed={selectedFaction === faction}
              key={faction}
              onClick={() => setSelectedFaction(faction)}
            >
              <span>{factionLabels[faction]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="discard-choice-actions">
        <button
          type="button"
          className="discard-choice-action-card"
          disabled={!canResolve}
          onClick={() => {
            if (selectedCard && selectedFaction) onResolve(selectedCard.id, selectedFaction);
          }}
        >
          <span className="discard-choice-badge">Resolve</span>
          <strong>Resolve {source}</strong>
          <small>{canResolve ? `Discard ${selectedCard?.name}.` : "Choose a card and faction first."}</small>
        </button>
        {optional && (
          <button type="button" className="discard-choice-action-card" onClick={onSkip}>
            <span className="discard-choice-badge">Optional</span>
            <strong>Skip</strong>
            <small>Leave cards undiscarded.</small>
          </button>
        )}
      </div>
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
  drawIntrigues?: number;
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

function discardableCountText(count: number) {
  return count === 1 ? "1 card available" : `${count} cards available`;
}

export function PendingDiscardDrawPanel({
  discardChoices,
  drawCards,
  drawIntrigues = 0,
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
  const totalIntrigues = drawIntrigues + selectedBonusIntrigues;
  const bonusTexts = bonusRewardTexts(bonusDraw, bonusIntrigues, drawCards);
  const baseTexts = [
    baseDrawText(drawCards),
    drawIntrigues > 0 ? `Draw ${intrigueCountText(drawIntrigues)}` : undefined,
  ].filter((part): part is string => Boolean(part));
  const summaryText = [...baseTexts, ...bonusTexts].join(". ");
  const resolveLabel = `Resolve ${source}${selectedCard ? selectedDrawSuffix(totalDrawCards, totalIntrigues) : ""}`;

  return (
    <div className="pending-controls discard-choice-grid">
      <div className="discard-choice-summary">
        <span>{source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>{summaryText}</small>
      </div>

      <div className="discard-choice-section">
        <div className="discard-choice-section-heading">
          <strong>Discard card</strong>
          <span>{discardChoices.length > 0 ? discardableCountText(discardChoices.length) : "No discardable cards"}</span>
        </div>
        {discardChoices.length > 0 ? (
          <div className="discard-choice-cards">
            {discardChoices.map((card) => (
              <button
                className={`discard-choice-card${selectedCardId === card.id ? " selected" : ""}`}
                type="button"
                aria-label={card.name}
                aria-pressed={selectedCardId === card.id}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                title={`Discard ${card.name}`}
              >
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <span className="discard-choice-badge">Discard</span>
                <strong>{card.name}</strong>
                <small>
                  {selectedCardId === card.id
                    ? selectedDrawSuffix(totalDrawCards, totalIntrigues).replace(/[()]/g, "")
                    : "Select to preview reward."}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="discard-choice-empty">No discardable cards</div>
        )}
      </div>

      <div className="discard-choice-actions">
        <button
          type="button"
          className="discard-choice-action-card"
          disabled={!selectedCard}
          onClick={() => {
            if (selectedCard) onResolve(selectedCard.id);
          }}
        >
          <span className="discard-choice-badge">Resolve</span>
          <strong>{resolveLabel}</strong>
          <small>{selectedCard ? `Discard ${selectedCard.name}.` : "Select a card first."}</small>
        </button>
        {optional && (
          <button type="button" className="discard-choice-action-card" onClick={onSkip}>
            <span className="discard-choice-badge">Optional</span>
            <strong>Skip</strong>
            <small>Leave cards undiscarded.</small>
          </button>
        )}
      </div>
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
  const actionText = `${discardText}${rewardTexts.length > 0 ? ` to ${rewardTexts.join("; ")}` : ""}${remainingText ? ` (${remainingText})` : ""}`;
  const resolveLabel = pending.remaining > 1 ? `Discard ${selectedCard?.name ?? "card"}` : `Resolve ${pending.source}`;

  return (
    <div className="pending-controls discard-choice-grid">
      <div className="discard-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>{actionText}</small>
      </div>

      <div className="discard-choice-section">
        <div className="discard-choice-section-heading">
          <strong>Discard card</strong>
          <span>{discardChoices.length > 0 ? discardableCountText(discardChoices.length) : "No discardable cards"}</span>
        </div>
        {discardChoices.length > 0 ? (
          <div className="discard-choice-cards">
            {discardChoices.map((card) => (
              <button
                className={`discard-choice-card${selectedCardId === card.id ? " selected" : ""}`}
                type="button"
                aria-label={card.name}
                aria-pressed={selectedCardId === card.id}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                title={`Discard ${card.name}`}
              >
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <span className="discard-choice-badge">Discard</span>
                <strong>{card.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="discard-choice-empty">No discardable cards</div>
        )}
      </div>

      <div className="discard-choice-actions">
        <button
          type="button"
          className="discard-choice-action-card"
          disabled={!selectedCard}
          onClick={() => {
            if (selectedCard) onResolve(selectedCard.id);
          }}
        >
          <span className="discard-choice-badge">Resolve</span>
          <strong>{resolveLabel}</strong>
          <small>{selectedCard ? `Discard ${selectedCard.name}.` : "Select a card first."}</small>
        </button>
        {pending.optional && (
          <button type="button" className="discard-choice-action-card" onClick={onSkip}>
            <span className="discard-choice-badge">Optional</span>
            <strong>Skip</strong>
            <small>Leave cards undiscarded.</small>
          </button>
        )}
      </div>
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
  const resolveLabel = `Discard ${selectedCard?.name ?? "card"}`;

  return (
    <div className="pending-controls discard-choice-grid">
      <div className="discard-choice-summary">
        <span>{source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>{remainingText} from this opponent's hand.</small>
      </div>

      <div className="discard-choice-section">
        <div className="discard-choice-section-heading">
          <strong>Opponent hand</strong>
          <span>{discardChoices.length > 0 ? discardableCountText(discardChoices.length) : "No discardable cards"}</span>
        </div>
        {discardChoices.length > 0 ? (
          <div className="discard-choice-cards">
            {discardChoices.map((card) => (
              <button
                className={`discard-choice-card${selectedCardId === card.id ? " selected" : ""}`}
                type="button"
                aria-label={card.name}
                aria-pressed={selectedCardId === card.id}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                title={`Discard ${card.name}`}
              >
                {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                <span className="discard-choice-badge">Discard</span>
                <strong>{card.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="discard-choice-empty">No discardable cards</div>
        )}
      </div>

      <div className="discard-choice-actions">
        <button
          type="button"
          className="discard-choice-action-card"
          aria-label={resolveLabel}
          disabled={!selectedCard}
          onClick={() => {
            if (selectedCard) onResolve(selectedCard.id);
          }}
        >
          <span className="discard-choice-badge">Resolve</span>
          <strong>{resolveLabel}</strong>
          <small>{selectedCard ? `Move ${selectedCard.name} to discard.` : "Select a card first."}</small>
        </button>
      </div>
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
  const intrigueText = `${amount} Intrigue${amount === 1 ? "" : "s"}`;
  return (
    <div className="pending-controls support-grid influence-choice-grid">
      <div className="influence-choice-summary">
        <span>{source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>Lose 1 Influence to draw {intrigueText}.</small>
      </div>
      {influenceChoices.map((faction) => (
        <button
          type="button"
          className="influence-choice-card"
          aria-label={factionLabels[faction]}
          key={faction}
          onClick={() => onChoose(faction)}
          title={`Lose 1 ${factionLabels[faction]} Influence`}
        >
          <span className="influence-choice-badge">
            <Handshake size={14} /> {factionShortLabels[faction]}
          </span>
          <strong>{factionLabels[faction]}</strong>
          <small>Lose 1 Influence to draw {intrigueText}</small>
        </button>
      ))}
      {optional && (
        <button type="button" className="influence-choice-skip" aria-label="Skip" onClick={onSkip}>
          Skip
        </button>
      )}
    </div>
  );
}

type PendingInfluenceExchangePanelProps = {
  choices: InfluenceExchangeChoice[];
  gainAmount: number;
  loseAmount: number;
  optional: boolean;
  owner?: Player;
  players: Player[];
  source: string;
  onChoose: (choice: InfluenceExchangeChoice) => void;
  onSkip: () => void;
};

function playerLabel(players: Player[], playerId: string) {
  return players.find((player) => player.id === playerId)?.leader ?? "Player";
}

export function PendingInfluenceExchangePanel({
  choices,
  gainAmount,
  loseAmount,
  optional,
  owner,
  players,
  source,
  onChoose,
  onSkip,
}: PendingInfluenceExchangePanelProps) {
  return (
    <div className="pending-controls support-grid influence-choice-grid">
      <div className="influence-choice-summary">
        <span>{source}</span>
        <strong>{owner?.leader ?? "Player"}</strong>
        <small>Lose {loseAmount} Influence to gain {gainAmount} Influence.</small>
      </div>
      {choices.map((choice) => {
        const key = `${choice.loseOwnerId}-${choice.loseFaction}-${choice.gainOwnerId}-${choice.gainFaction}`;
        const loseLabel = `${playerLabel(players, choice.loseOwnerId)}: ${factionLabels[choice.loseFaction]}`;
        const gainLabel = `${playerLabel(players, choice.gainOwnerId)}: ${factionLabels[choice.gainFaction]}`;
        return (
          <button
            type="button"
            className="influence-choice-card"
            aria-label={`${loseLabel} to ${gainLabel}`}
            key={key}
            onClick={() => onChoose(choice)}
            title={`Lose ${factionLabels[choice.loseFaction]} Influence and gain ${factionLabels[choice.gainFaction]} Influence`}
          >
            <span className="influence-choice-badge">
              <Handshake size={14} /> {factionShortLabels[choice.loseFaction]} to {factionShortLabels[choice.gainFaction]}
            </span>
            <strong>{gainLabel}</strong>
            <small>Lose from {loseLabel}</small>
          </button>
        );
      })}
      {optional && (
        <button type="button" className="influence-choice-skip" aria-label="Skip" onClick={onSkip}>
          Skip
        </button>
      )}
    </div>
  );
}
