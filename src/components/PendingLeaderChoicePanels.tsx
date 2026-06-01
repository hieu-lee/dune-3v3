import { BookOpen, CircleDollarSign, Droplets, Eye, HandCoins, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
import type { BoardSpace, ContractCard, PendingAction, Player, ResourceId } from "../game/types";

type StabanUnseenNetworkPendingAction = Extract<PendingAction, { kind: "staban-unseen-network" }>;

type PendingStabanUnseenNetworkPanelProps = {
  owner?: Player;
  pending: StabanUnseenNetworkPendingAction;
  space?: BoardSpace;
  onChoose: (choice: "pay" | "skip") => void;
};

export function PendingStabanUnseenNetworkPanel({
  owner,
  pending,
  space,
  onChoose,
}: PendingStabanUnseenNetworkPanelProps) {
  return (
    <div className="pending-controls">
      {owner && space ? (
        pending.reward === "landsraad" ? (
          <button
            type="button"
            onClick={() => onChoose("pay")}
            disabled={owner.resources.spice < 1}
          >
            <Sparkles size={15} />
            Spend 1 spice: +3 Solari
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChoose("pay")}
            disabled={owner.resources.solari < 2}
          >
            <Eye size={15} />
            Spend 2 Solari: Intrigue
          </button>
        )
      ) : (
        <span>Unseen Network can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingLadyAmberDesertScoutsPanelProps = {
  owner?: Player;
  onChoose: (choice: "retreat" | "skip") => void;
};

export function PendingLadyAmberDesertScoutsPanel({
  owner,
  onChoose,
}: PendingLadyAmberDesertScoutsPanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <button
          type="button"
          onClick={() => onChoose("retreat")}
          disabled={owner.deployedTroops <= 0}
        >
          <RotateCcw size={15} />
          Retreat 1 troop
        </button>
      ) : (
        <span>Desert Scouts can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingJessicaSpiceAgonyPanelProps = {
  canPay: boolean;
  memoryLabel: string;
  owner?: Player;
  troopSupplyLabel: string;
  onChoose: (choice: "pay" | "skip") => void;
};

export function PendingJessicaSpiceAgonyPanel({
  canPay,
  memoryLabel,
  owner,
  troopSupplyLabel,
  onChoose,
}: PendingJessicaSpiceAgonyPanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <>
          <button
            type="button"
            onClick={() => onChoose("pay")}
            disabled={!canPay}
          >
            <Sparkles size={15} />
            Spend 1 spice: Intrigue + memory
          </button>
          <span>{memoryLabel} / {troopSupplyLabel}</span>
        </>
      ) : (
        <span>Spice Agony can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingJessicaWaterOfLifePanelProps = {
  owner?: Player;
  onChoose: (choice: "pay" | "skip") => void;
};

export function PendingJessicaWaterOfLifePanel({
  owner,
  onChoose,
}: PendingJessicaWaterOfLifePanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <button
          type="button"
          onClick={() => onChoose("pay")}
          disabled={owner.resources.spice < 1}
        >
          <Droplets size={15} />
          Spend 1 spice: +1 water
        </button>
      ) : (
        <span>Water of Life can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingJessicaReverendMotherPanelProps = {
  owner?: Player;
  space?: BoardSpace;
  onChoose: (choice: "repeat" | "skip") => void;
};

export function PendingJessicaReverendMotherPanel({
  owner,
  space,
  onChoose,
}: PendingJessicaReverendMotherPanelProps) {
  return (
    <div className="pending-controls">
      {owner && space ? (
        <button
          type="button"
          onClick={() => onChoose("repeat")}
          disabled={owner.resources.water < 1}
        >
          <Droplets size={15} />
          Spend 1 water: repeat {space.name}
        </button>
      ) : (
        <span>Reverend Mother can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingJessicaOtherMemoriesPanelProps = {
  memoryLabel: string;
  owner?: Player;
  onChoose: (choice: "flip" | "skip") => void;
};

export function PendingJessicaOtherMemoriesPanel({
  memoryLabel,
  owner,
  onChoose,
}: PendingJessicaOtherMemoriesPanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <>
          <button type="button" onClick={() => onChoose("flip")}>
            <BookOpen size={15} />
            Return {memoryLabel}: draw and flip
          </button>
          <span>Reverend Mother side becomes active.</span>
        </>
      ) : (
        <span>Other Memories can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingTrashSourceForTradePanelProps = {
  owner?: Player;
  partners: Player[];
  source: string;
  onSkip: () => void;
  onTrade: (partnerId: string) => void;
};

export function PendingTrashSourceForTradePanel({
  owner,
  partners,
  source,
  onSkip,
  onTrade,
}: PendingTrashSourceForTradePanelProps) {
  return (
    <div className="pending-controls">
      {owner && partners.length > 0 ? (
        <>
          <span>Trash {source} to trade with one teammate.</span>
          {partners.map((partner) => (
            <button
              type="button"
              key={partner.id}
              onClick={() => onTrade(partner.id)}
            >
              <HandCoins size={15} />
              Trade with {partner.leader}
            </button>
          ))}
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingDemandResultsPanelProps = {
  allies: (Player | undefined)[];
  contracts: (ContractCard | undefined)[];
  onChoose: (optionIndex: number) => void;
  onSkip: () => void;
};

export function PendingDemandResultsPanel({
  allies,
  contracts,
  onChoose,
  onSkip,
}: PendingDemandResultsPanelProps) {
  const [firstAlly, secondAlly] = allies;
  const [firstContract, secondContract] = contracts;
  return (
    <div className="pending-controls contract-choice">
      {firstAlly && secondAlly && firstContract && secondContract ? (
        <>
          <span>Spend 2 Solari, assign both contracts, then trash Demand Results.</span>
          <button type="button" onClick={() => onChoose(0)}>
            <span>{firstContract.name} to {firstAlly.leader}</span>
            <span>{secondContract.name} to {secondAlly.leader}</span>
          </button>
          <button type="button" onClick={() => onChoose(1)}>
            <span>{secondContract.name} to {firstAlly.leader}</span>
            <span>{firstContract.name} to {secondAlly.leader}</span>
          </button>
        </>
      ) : (
        <span>Demand Results can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

type PendingPayResourceForTroopsPanelProps = {
  cost: number;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  recipients: (Player | undefined)[];
  resource: ResourceId;
  source: string;
  troops: number;
  trashSource?: boolean;
};

export function PendingPayResourceForTroopsPanel({
  cost,
  onChoose,
  onSkip,
  owner,
  recipients,
  resource,
  source,
  troops,
  trashSource,
}: PendingPayResourceForTroopsPanelProps) {
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[resource] ?? String(resource);
  const availableResource = owner
    ? (owner.resources as Partial<Record<string, number>>)[resource]
    : undefined;
  const resolvedRecipients = recipients.filter((recipient): recipient is Player => Boolean(recipient));
  const allRecipientsPresent = recipients.length === 2 && resolvedRecipients.length === recipients.length;
  const canPay = typeof availableResource === "number" && availableResource >= cost;
  const recipientLabel = resolvedRecipients.length === 2 && resolvedRecipients.every((recipient) => recipient.role === "Ally")
    ? "both Allies"
    : resolvedRecipients.map((recipient) => recipient.leader).join(" and ");
  return (
    <div className="pending-controls">
      {allRecipientsPresent ? (
        <button
          type="button"
          onClick={onChoose}
          disabled={!owner || !canPay}
        >
          <Sparkles size={15} />
          Spend {cost} {resourceLabel}: {recipientLabel} +{troops} troops{trashSource ? ", trash" : ""}
        </button>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingPayResourceForStrengthPanelProps = {
  cost: number;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  recipient?: Player;
  resource: ResourceId;
  optional: boolean;
  strength: number;
};

export function PendingPayResourceForStrengthPanel({
  cost,
  onChoose,
  onSkip,
  owner,
  recipient,
  resource,
  optional,
  strength,
}: PendingPayResourceForStrengthPanelProps) {
  const resourceLabel = resourceLabels[resource];
  return (
    <div className="pending-controls">
      {recipient ? (
        <button
          type="button"
          onClick={onChoose}
          disabled={!owner || owner.resources[resource] < cost}
        >
          <Sparkles size={15} />
          Spend {cost} {resourceLabel}: {recipient.leader} +{strength} strength
        </button>
      ) : (
        <span>{owner?.leader ?? "Player"} can no longer add strength with the current table state.</span>
      )}
      {optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}

type PendingPayResourceForInfluencePanelProps = {
  amount: number;
  cost: number;
  factionLabel: string;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  recipient?: Player;
  resource: ResourceId;
};

export function PendingPayResourceForInfluencePanel({
  amount,
  cost,
  factionLabel,
  onChoose,
  onSkip,
  owner,
  recipient,
  resource,
}: PendingPayResourceForInfluencePanelProps) {
  const resourceLabel = resourceLabels[resource];
  return (
    <div className="pending-controls">
      {recipient ? (
        <button type="button" onClick={onChoose} disabled={!owner || owner.resources[resource] < cost}>
          <CircleDollarSign size={15} />
          Spend {cost} {resourceLabel}: {recipient.leader} +{amount} {factionLabel} Influence
        </button>
      ) : (
        <span>{owner?.leader ?? "Player"} can no longer add Influence with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingPayResourceForSandwormsPanelProps = {
  cost: number;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  recipient?: Player;
  resource: ResourceId;
  sandworms: number;
  source: string;
  strength: number;
  trashSource?: boolean;
};

export function PendingPayResourceForSandwormsPanel({
  cost,
  onChoose,
  onSkip,
  owner,
  recipient,
  resource,
  sandworms,
  source,
  strength,
  trashSource,
}: PendingPayResourceForSandwormsPanelProps) {
  const resourceLabel = resourceLabels[resource];
  return (
    <div className="pending-controls">
      {recipient ? (
        <button type="button" onClick={onChoose} disabled={!owner || owner.resources[resource] < cost}>
          <Droplets size={15} />
          Spend {cost} {resourceLabel}: {recipient.leader} summons {sandworms} sandworm{sandworms === 1 ? "" : "s"} (+{strength} strength{trashSource ? ", trash" : ""})
        </button>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingThreatenSpiceProductionPanelProps = {
  canPay: boolean;
  commander?: Player;
  contributorIds: string[];
  contributions: Record<string, number>;
  contributors: Player[];
  cost: number;
  total: number;
  onAdjust: (contributorId: string, delta: number) => void;
  onPay: () => void;
  onSkip: () => void;
};

export function PendingThreatenSpiceProductionPanel({
  canPay,
  commander,
  contributorIds,
  contributions,
  contributors,
  cost,
  total,
  onAdjust,
  onPay,
  onSkip,
}: PendingThreatenSpiceProductionPanelProps) {
  return (
    <div className="pending-controls threaten-spice-choice">
      {commander && contributors.length === contributorIds.length ? (
        <>
          <span>{total}/{cost} spice committed</span>
          <div className="threaten-spice-grid">
            {contributors.map((contributor) => {
              const contribution = contributions[contributor.id] ?? 0;
              return (
                <div className="threaten-spice-contributor" key={contributor.id}>
                  <strong>{contributor.leader}</strong>
                  <span>{contribution}/{contributor.resources.spice}</span>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, -1)}
                    disabled={contribution <= 0}
                    title={`Remove 1 spice from ${contributor.leader}`}
                    aria-label={`Remove 1 spice from ${contributor.leader}`}
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, 1)}
                    disabled={contribution >= contributor.resources.spice || total >= cost}
                    title={`Add 1 spice from ${contributor.leader}`}
                    aria-label={`Add 1 spice from ${contributor.leader}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={onPay} disabled={!canPay}>
            <Sparkles size={15} />
            Pay {cost}: +1 VP
          </button>
        </>
      ) : (
        <span>Threaten Spice Production can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
