import { CircleDollarSign } from "lucide-react";
import type { Card, ContractCard, Player } from "../game/types";

type PendingContractPanelProps = {
  contractOffer: ContractCard[];
  publicOnly?: boolean;
  reservedContracts: ContractCard[];
  onCollectFallback: () => void;
  onTakeContract: (contractId: string) => void;
};

export function PendingContractPanel({
  contractOffer,
  publicOnly,
  reservedContracts,
  onCollectFallback,
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
    </div>
  );
}

type PendingAcquireCardPanelProps = {
  cards: Card[];
  maxCost: number;
  owner: Player;
  onAcquireCard: (cardId: string) => void;
};

export function PendingAcquireCardPanel({
  cards,
  maxCost,
  owner,
  onAcquireCard,
}: PendingAcquireCardPanelProps) {
  return (
    <div className="pending-controls contract-choice">
      {cards.map((card) => (
        <button
          type="button"
          key={card.id}
          onClick={() => onAcquireCard(card.id)}
          title={`Acquire ${card.name} for ${owner.leader}`}
        >
          {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
          <span>{card.name}</span>
        </button>
      ))}
      {cards.length === 0 && (
        <span>No eligible cards cost {maxCost} or less.</span>
      )}
    </div>
  );
}
