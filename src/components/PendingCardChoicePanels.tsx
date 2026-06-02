import { CircleDollarSign } from "lucide-react";
import type { Card, ContractCard, PendingAction, Player, ResourceId } from "../game/types";

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

type PendingContractPanelProps = {
  contractOffer: ContractCard[];
  optional?: boolean;
  publicOnly?: boolean;
  reservedContracts: ContractCard[];
  onCollectFallback: () => void;
  onSkip?: () => void;
  onTakeContract: (contractId: string) => void;
};

export function PendingContractPanel({
  contractOffer,
  optional,
  publicOnly,
  reservedContracts,
  onCollectFallback,
  onSkip,
  onTakeContract,
}: PendingContractPanelProps) {
  const noContractsAvailable = contractOffer.length === 0 && reservedContracts.length === 0;
  return (
    <div className="pending-controls contract-choice">
      {contractOffer.length > 0 && <span className="choice-divider">Public</span>}
      {contractOffer.map((contract) => (
        <button type="button" key={contract.id} onClick={() => onTakeContract(contract.id)}>
          {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
          <span>{contract.name}</span>
        </button>
      ))}
      {reservedContracts.length > 0 && <span className="choice-divider">Reserved</span>}
      {reservedContracts.map((contract) => (
        <button type="button" key={contract.id} onClick={() => onTakeContract(contract.id)}>
          {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
          <span>{contract.name}</span>
        </button>
      ))}
      {noContractsAvailable && !publicOnly && (
        <button type="button" onClick={onCollectFallback}>
          <CircleDollarSign size={15} />
          Collect 2 Solari
        </button>
      )}
      {optional && onSkip && <button type="button" onClick={onSkip}>Skip</button>}
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
  return (
    <div className="pending-controls contract-choice">
      {cards.map((card) => (
        <button
          type="button"
          key={card.id}
          onClick={() => onAcquireCard(card.id)}
          title={
            pending.paymentResource
              ? `Acquire ${card.name} for ${card.cost ?? 0} ${resourceLabels[pending.paymentResource]} for ${owner.leader}`
              : `Acquire ${card.name} for ${owner.leader}`
          }
        >
          {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
          <span>{card.name}</span>
          {pending.paymentResource && (
            <span>{card.cost ?? 0} {resourceLabels[pending.paymentResource]}</span>
          )}
        </button>
      ))}
      {cards.length === 0 && (
        <span>{noEligibleText}</span>
      )}
      {pending.optional === true && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}
