import { iconLabels } from "../game/data";
import type { Card } from "../game/types";

type CardAssetPreviewProps = {
  card: Card;
  detailLabel?: string;
  metaLabel?: string;
};

function cardIconLabel(card: Card) {
  return card.icons.map((icon) => iconLabels[icon]).join(" / ");
}

function compactMetaLabel(card: Card) {
  return cardIconLabel(card) || (card.persuasion > 0 ? `${card.persuasion} persuasion` : "Reveal");
}

function cardDetailChips(card: Card, metaLabel: string, metaLabelProvided: boolean) {
  const iconText = cardIconLabel(card);
  const acquiredChip = card.acquired ? `${card.acquired} VP` : undefined;
  return Array.from(new Set([
    metaLabelProvided && metaLabel !== iconText ? metaLabel : undefined,
    acquiredChip && !metaLabel.includes(acquiredChip) ? acquiredChip : undefined,
    card.reveal ? undefined : `Reveal ${card.persuasion} persuasion`,
    `${card.swords} swords`,
    card.traits?.join(" / "),
  ].filter((chip): chip is string => Boolean(chip))));
}

export function cardAccessibleSummary(card: Card, action?: string, costLabel?: string) {
  const iconText = cardIconLabel(card);
  const actionIncludesName = action?.toLocaleLowerCase().includes(card.name.toLocaleLowerCase()) ?? false;
  return [
    action,
    actionIncludesName ? undefined : card.name,
    iconText ? `Icons: ${iconText}` : undefined,
    costLabel ? `Cost: ${costLabel}` : card.cost !== undefined ? `Cost: ${card.cost} persuasion` : undefined,
    card.acquired ? `Acquire: ${card.acquired} victory point` : undefined,
    `Reveal persuasion: ${card.persuasion}`,
    `Swords: ${card.swords}`,
    card.play ? `Agent: ${card.play}` : undefined,
    card.reveal ? `Reveal: ${card.reveal}` : undefined,
  ].filter((part): part is string => Boolean(part)).join(". ");
}

export function CardAssetPreview({ card, detailLabel, metaLabel }: CardAssetPreviewProps) {
  const resolvedMetaLabel = metaLabel ?? compactMetaLabel(card);
  const imagePath = card.imagePath ?? card.thumbnailPath;
  const iconText = cardIconLabel(card);
  const chips = cardDetailChips(card, resolvedMetaLabel, metaLabel !== undefined);

  return (
    <span className="card-asset-preview" data-card-detail={card.id}>
      {imagePath ? (
        <img className="card-art card-asset-image" src={imagePath} alt="" loading="lazy" />
      ) : (
        <span className="card-art card-asset-missing" aria-hidden="true">
          <span>{card.name}</span>
        </span>
      )}
      <span className="card-resting-meta" aria-hidden="true">{resolvedMetaLabel}</span>
      <span className="card-hold-details" aria-hidden="true">
        <span className="card-detail-kicker">{detailLabel ?? resolvedMetaLabel}</span>
        <strong>{card.name}</strong>
        {chips.length > 0 && (
          <span className="card-detail-chips">
            {chips.map((chip) => <span key={chip}>{chip}</span>)}
          </span>
        )}
        {iconText && (
          <span className="card-detail-row">
            <b>Icons</b>
            <small>{iconText}</small>
          </span>
        )}
        {card.play && (
          <span className="card-detail-row">
            <b>Agent</b>
            <small>{card.play}</small>
          </span>
        )}
        {card.reveal && (
          <span className="card-detail-row">
            <b>Reveal</b>
            <small>{card.reveal}</small>
          </span>
        )}
      </span>
    </span>
  );
}
