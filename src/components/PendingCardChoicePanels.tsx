import { CircleDollarSign } from "lucide-react";
import type { Card, ContractCard, PendingAction, Player, ResourceId } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function acquireDestinationLabel(destination: AcquireCardPendingAction["destination"]) {
  return destination === "hand" ? "hand" : "discard";
}

function acquireCostLabel(card: Card, paymentResource?: ResourceId) {
  const cost = card.cost ?? 0;
  if (paymentResource) return `${cost} ${resourceLabels[paymentResource]}`;
  return `${cost} persuasion`;
}

type PendingContractPanelProps = {
  contractOffer: ContractCard[];
  allowFallback?: boolean;
  owner: Player;
  optional?: boolean;
  pending: ContractPendingAction;
  publicOnly?: boolean;
  reservedContracts: ContractCard[];
  onCollectFallback: () => void;
  onSkip?: () => void;
  onTakeContract: (contractId: string) => void;
};

export function PendingContractPanel({
  contractOffer,
  allowFallback,
  owner,
  optional,
  pending,
  publicOnly,
  reservedContracts,
  onCollectFallback,
  onSkip,
  onTakeContract,
}: PendingContractPanelProps) {
  const noContractsAvailable = contractOffer.length === 0 && reservedContracts.length === 0;
  const availableCount = contractOffer.length + reservedContracts.length;
  const availabilityText = noContractsAvailable
    ? allowFallback
      ? "No contracts available; collect fallback Solari."
      : "No contracts available."
    : `${availableCount} ${availableCount === 1 ? "contract" : "contracts"} available`;
  const scopeText = publicOnly ? "Public offer only" : "Public and reserved offers";
  return (
    <div className="pending-controls contract-choice contract-choice-grid">
      <div className="contract-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: CHOAM contract</strong>
        <small>{availabilityText} - {optional ? "optional" : scopeText}</small>
      </div>

      <div className="contract-choice-body">
        {contractOffer.length > 0 && (
          <div className="contract-choice-section">
            <div className="contract-choice-section-heading">
              <strong>Public offer</strong>
              <span>Choose a visible CHOAM contract.</span>
            </div>
            <div className="contract-choice-cards">
              {contractOffer.map((contract) => (
                <button
                  type="button"
                  className="contract-choice-card"
                  key={contract.id}
                  aria-label={contract.name}
                  onClick={() => onTakeContract(contract.id)}
                >
                  {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                  <span>{contract.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {reservedContracts.length > 0 && (
          <div className="contract-choice-section">
            <div className="contract-choice-section-heading">
              <strong>Reserved contracts</strong>
              <span>Choose from {owner.leader}'s reserved contracts.</span>
            </div>
            <div className="contract-choice-cards">
              {reservedContracts.map((contract) => (
                <button
                  type="button"
                  className="contract-choice-card"
                  key={contract.id}
                  aria-label={contract.name}
                  onClick={() => onTakeContract(contract.id)}
                >
                  {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                  <span>{contract.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(noContractsAvailable && (!publicOnly || allowFallback)) || (optional && onSkip) ? (
          <div className="contract-choice-actions">
            {noContractsAvailable && (!publicOnly || allowFallback) && (
              <button
                type="button"
                className="contract-choice-action-card"
                aria-label="Collect 2 Solari"
                onClick={onCollectFallback}
              >
                <span className="contract-choice-badge"><CircleDollarSign size={13} /> Fallback</span>
                <strong>Collect 2 Solari</strong>
                <small>No CHOAM contract can be taken.</small>
              </button>
            )}
            {optional && onSkip && (
              <button
                type="button"
                className="contract-choice-action-card"
                aria-label="Skip"
                onClick={onSkip}
              >
                <span className="contract-choice-badge">Optional</span>
                <strong>Skip</strong>
                <small>Leave the contract offer unchanged.</small>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PendingAcquireCardPanelProps = {
  cards: Card[];
  owner: Player;
  pending: AcquireCardPendingAction;
  onAcquireCard: (cardId: string) => void;
  onSkip: () => void;
};

export function PendingAcquireCardPanel({
  cards,
  owner,
  pending,
  onAcquireCard,
  onSkip,
}: PendingAcquireCardPanelProps) {
  const costBoundsText =
    pending.minCost !== undefined && pending.maxCost !== undefined
      ? pending.minCost === pending.maxCost
        ? `cost exactly ${pending.minCost}`
        : `cost from ${pending.minCost} to ${pending.maxCost}`
      : pending.minCost !== undefined
        ? `cost at least ${pending.minCost}`
        : pending.maxCost !== undefined
          ? `cost ${pending.maxCost} or less`
          : undefined;
  const noEligibleText = [
    "No eligible cards",
    costBoundsText ? `that ${costBoundsText}` : undefined,
    pending.paymentResource
      ? `can be acquired with ${owner.resources[pending.paymentResource]} ${resourceLabels[pending.paymentResource]}`
      : undefined,
  ].filter((part): part is string => Boolean(part)).join(" ") + ".";
  const destinationText = `To ${acquireDestinationLabel(pending.destination)}`;
  const availabilityText = cards.length === 0
    ? noEligibleText
    : `${cards.length} eligible ${cards.length === 1 ? "card" : "cards"} available`;
  const paymentText = pending.paymentResource
    ? `${owner.resources[pending.paymentResource]} ${resourceLabels[pending.paymentResource]} available`
    : costBoundsText ?? "Choose one card";
  return (
    <div className="pending-controls contract-choice contract-choice-grid acquire-card-choice">
      <div className="contract-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: acquisition</strong>
        <small>{availabilityText} - {destinationText}. {paymentText}.</small>
      </div>

      <div className="contract-choice-body">
        <div className="contract-choice-section">
          <div className="contract-choice-section-heading">
            <strong>Acquire card</strong>
            <span>{cards.length > 0 ? "Choose one eligible card." : "No matching card can be acquired."}</span>
          </div>
          {cards.length > 0 ? (
            <div className="contract-choice-cards acquire-card-choice-cards">
              {cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className="contract-choice-card acquire-card-choice-card"
                  aria-label={cardAccessibleSummary(
                    card,
                    `Acquire ${card.name} for ${owner.leader}`,
                    acquireCostLabel(card, pending.paymentResource),
                  )}
                  onClick={() => onAcquireCard(card.id)}
                >
                  <CardAssetPreview
                    card={card}
                    detailLabel={destinationText}
                    metaLabel={acquireCostLabel(card, pending.paymentResource)}
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="contract-choice-empty acquire-card-choice-empty">{noEligibleText}</span>
          )}
        </div>

        {pending.optional === true && (
          <div className="contract-choice-actions">
            <button
              type="button"
              className="contract-choice-action-card acquire-card-choice-skip"
              aria-label="Skip"
              onClick={onSkip}
            >
              <span className="contract-choice-badge">Optional</span>
              <strong>Skip</strong>
              <small>Do not acquire a card from this effect.</small>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
