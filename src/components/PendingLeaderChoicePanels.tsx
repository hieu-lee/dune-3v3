import { BookOpen, CircleDollarSign, Droplets, Eye, HandCoins, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
import { playerTroopSupply } from "../game/deck-utils";
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

type PendingRepeatBoardSpacePanelProps = {
  owner?: Player;
  pending: Extract<PendingAction, { kind: "repeat-board-space" }>;
  space?: BoardSpace;
  onChoose: (choice: "repeat" | "skip") => void;
};

export function PendingRepeatBoardSpacePanel({
  owner,
  pending,
  space,
  onChoose,
}: PendingRepeatBoardSpacePanelProps) {
  const resourceIcon = pending.resource === "water"
    ? <Droplets size={15} />
    : pending.resource === "spice"
      ? <Sparkles size={15} />
      : <CircleDollarSign size={15} />;

  return (
    <div className="pending-controls">
      {owner && space ? (
        <button
          type="button"
          onClick={() => onChoose("repeat")}
          disabled={owner.resources[pending.resource] < pending.cost}
        >
          {resourceIcon}
          Spend {pending.cost} {resourceLabels[pending.resource]}: repeat {space.name}
        </button>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={() => onChoose("skip")}>Skip</button>
    </div>
  );
}

type PendingLeaderTransitionPanelProps = {
  counterLabel: string;
  owner?: Player;
  pending: Extract<PendingAction, { kind: "leader-transition" }>;
  onChoose: (choice: "transition" | "skip") => void;
};

export function PendingLeaderTransitionPanel({
  counterLabel,
  owner,
  pending,
  onChoose,
}: PendingLeaderTransitionPanelProps) {
  return (
    <div className="pending-controls">
      {owner ? (
        <>
          <button
            type="button"
            onClick={() => onChoose("transition")}
            disabled={owner.leader !== pending.fromLeader || owner.jessicaMemories <= 0}
          >
            <BookOpen size={15} />
            Return {counterLabel}: draw and flip
          </button>
          <span>Reverend Mother side becomes active.</span>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
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

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

type PendingPayResourceForContractsPanelProps = {
  contracts: (ContractCard | undefined)[];
  cost: number;
  owner?: Player;
  recipients: (Player | undefined)[];
  resource: ResourceId;
  source: string;
  trashSource?: boolean;
  onChoose: (optionIndex: number) => void;
  onSkip: () => void;
};

export function PendingPayResourceForContractsPanel({
  contracts,
  cost,
  owner,
  recipients,
  resource,
  source,
  trashSource,
  onChoose,
  onSkip,
}: PendingPayResourceForContractsPanelProps) {
  const [firstRecipient, secondRecipient] = recipients;
  const [firstContract, secondContract] = contracts;
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[resource] ?? String(resource);
  const availableResource = owner
    ? (owner.resources as Partial<Record<string, number>>)[resource]
    : undefined;
  const canPay = typeof availableResource === "number" && availableResource >= cost;
  const resolutionText = `Spend ${cost} ${resourceLabel}, assign both contracts${trashSource ? `, then trash ${source}` : ""}.`;
  return (
    <div className="pending-controls contract-choice">
      {firstRecipient && secondRecipient && firstContract && secondContract ? (
        <>
          <span>{resolutionText}</span>
          <button type="button" onClick={() => onChoose(0)} disabled={!owner || !canPay}>
            <span>{firstContract.name} to {firstRecipient.leader}</span>
            <span>{secondContract.name} to {secondRecipient.leader}</span>
          </button>
          <button type="button" onClick={() => onChoose(1)} disabled={!owner || !canPay}>
            <span>{secondContract.name} to {firstRecipient.leader}</span>
            <span>{firstContract.name} to {secondRecipient.leader}</span>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

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
  const recipientsHaveSupply = resolvedRecipients.every((recipient) => playerTroopSupply(recipient) >= troops);
  const canResolve = typeof availableResource === "number" && availableResource >= cost && recipientsHaveSupply;
  const recipientLabel = resolvedRecipients.length === 2 && resolvedRecipients.every((recipient) => recipient.role === "Ally")
    ? "both Allies"
    : resolvedRecipients.map((recipient) => recipient.leader).join(" and ");
  return (
    <div className="pending-controls">
      {allRecipientsPresent ? (
        <button
          type="button"
          onClick={onChoose}
          disabled={!owner || !canResolve}
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

type PendingPayResourceForDrawCardsPanelProps = {
  cost: number;
  drawCards: number;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  resource: ResourceId;
  source: string;
};

export function PendingPayResourceForDrawCardsPanel({
  cost,
  drawCards,
  onChoose,
  onSkip,
  owner,
  resource,
  source,
}: PendingPayResourceForDrawCardsPanelProps) {
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[resource] ?? String(resource);
  const availableResource = owner
    ? (owner.resources as Partial<Record<string, number>>)[resource]
    : undefined;
  const canPay = typeof availableResource === "number" && availableResource >= cost;
  return (
    <div className="pending-controls">
      {owner ? (
        <button
          type="button"
          onClick={onChoose}
          disabled={!canPay}
        >
          <BookOpen size={15} />
          Spend {cost} {resourceLabel}: draw {drawCards} card{drawCards === 1 ? "" : "s"}
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
  persuasionCost?: number;
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
  persuasionCost = 0,
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
        <button
          type="button"
          onClick={onChoose}
          disabled={!owner || owner.resources[resource] < cost || owner.persuasion < persuasionCost}
        >
          <Droplets size={15} />
          Spend {cost} {resourceLabel}{persuasionCost > 0 ? ` and forgo ${persuasionCost} persuasion` : ""}: {recipient.leader} summons {sandworms} sandworm{sandworms === 1 ? "" : "s"} (+{strength} strength{trashSource ? ", trash" : ""})
        </button>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}

type PendingTeamResourcePaymentPanelProps = {
  canPay: boolean;
  contributorIds: string[];
  contributions: Record<string, number>;
  contributors: Player[];
  cost: number;
  owner?: Player;
  resource: ResourceId;
  source: string;
  total: number;
  vp: number;
  onAdjust: (contributorId: string, delta: number) => void;
  onPay: () => void;
  onSkip: () => void;
};

export function PendingTeamResourcePaymentPanel({
  canPay,
  contributorIds,
  contributions,
  contributors,
  cost,
  owner,
  resource,
  source,
  total,
  vp,
  onAdjust,
  onPay,
  onSkip,
}: PendingTeamResourcePaymentPanelProps) {
  const resourceLabel = resourceLabels[resource];
  const canRenderPaymentControls = Boolean(resourceLabel) && owner && contributors.length === contributorIds.length;
  return (
    <div className="pending-controls threaten-spice-choice">
      {canRenderPaymentControls ? (
        <>
          <span>{total}/{cost} {resourceLabel} committed</span>
          <div className="threaten-spice-grid">
            {contributors.map((contributor) => {
              const rawContribution = contributions[contributor.id] ?? 0;
              const contribution =
                Number.isInteger(rawContribution) && rawContribution >= 0 ? rawContribution : 0;
              const available = contributor.resources[resource];
              return (
                <div className="threaten-spice-contributor" key={contributor.id}>
                  <strong>{contributor.leader}</strong>
                  <span>{contribution}/{available}</span>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, -1)}
                    disabled={contribution <= 0}
                    title={`Remove 1 ${resourceLabel} from ${contributor.leader}`}
                    aria-label={`Remove 1 ${resourceLabel} from ${contributor.leader}`}
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, 1)}
                    disabled={contribution >= available || total >= cost}
                    title={`Add 1 ${resourceLabel} from ${contributor.leader}`}
                    aria-label={`Add 1 ${resourceLabel} from ${contributor.leader}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={onPay} disabled={!canPay}>
            <Sparkles size={15} />
            Pay {cost}: +{vp} VP
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button type="button" onClick={onSkip}>Skip</button>
    </div>
  );
}
