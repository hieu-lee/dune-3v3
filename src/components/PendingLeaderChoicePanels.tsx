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
  const payLabel =
    pending.reward === "landsraad"
      ? "Spend 1 spice: +3 Solari"
      : "Spend 2 Solari: Intrigue";
  const canPay = Boolean(
    owner && (pending.reward === "landsraad" ? owner.resources.spice >= 1 : owner.resources.solari >= 2),
  );
  return (
    <div className="pending-controls leader-choice-grid">
      {owner && space ? (
        <>
          <div className="leader-choice-summary">
            <span>Unseen Network</span>
            <strong>{space.name}</strong>
            <small>
              {pending.reward === "landsraad"
                ? `${owner.resources.spice} spice available`
                : `${owner.resources.solari} Solari available`}
            </small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={() => onChoose("pay")}
            disabled={!canPay}
            aria-label={payLabel}
          >
            <span className="leader-choice-badge">
              {pending.reward === "landsraad" ? <Sparkles size={13} /> : <Eye size={13} />}
              {pending.reward === "landsraad" ? "Spend 1 spice" : "Spend 2 Solari"}
            </span>
            <strong>{pending.reward === "landsraad" ? "+3 Solari" : "Intrigue"}</strong>
            <small>{pending.reward === "landsraad" ? "Convert the visit into cash." : "Draw one Intrigue card."}</small>
            <span className="visually-hidden-copy">{payLabel}</span>
          </button>
        </>
      ) : (
        <span>Unseen Network can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={() => onChoose("skip")}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Leave the optional reward unresolved.</small>
      </button>
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
    <div className="pending-controls leader-choice-grid">
      {owner ? (
        <>
          <div className="leader-choice-summary">
            <span>Desert Scouts</span>
            <strong>{owner.deployedTroops} deployed troops</strong>
            <small>{owner.garrison} in garrison</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={() => onChoose("retreat")}
            disabled={owner.deployedTroops <= 0}
            aria-label="Retreat 1 troop"
          >
            <span className="leader-choice-badge">
              <RotateCcw size={13} />
              Return
            </span>
            <strong>Retreat 1 troop</strong>
            <small>Move one deployed troop back to garrison.</small>
          </button>
        </>
      ) : (
        <span>Desert Scouts can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={() => onChoose("skip")}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Keep deployed troops where they are.</small>
      </button>
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
  const repeatLabel = space
    ? `Spend ${pending.cost} ${resourceLabels[pending.resource]}: repeat ${space.name}`
    : `Spend ${pending.cost} ${resourceLabels[pending.resource]}: repeat space`;

  return (
    <div className="pending-controls leader-choice-grid">
      {owner && space ? (
        <>
          <div className="leader-choice-summary">
            <span>Repeat space</span>
            <strong>{space.name}</strong>
            <small>{owner.resources[pending.resource]} {resourceLabels[pending.resource]} available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={() => onChoose("repeat")}
            disabled={owner.resources[pending.resource] < pending.cost}
            aria-label={repeatLabel}
          >
            <span className="leader-choice-badge">
              {resourceIcon}
              Spend {pending.cost} {resourceLabels[pending.resource]}
            </span>
            <strong>Repeat {space.name}</strong>
            <small>Resolve the board space again.</small>
            <span className="visually-hidden-copy">{repeatLabel}</span>
          </button>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={() => onChoose("skip")}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not repeat this space.</small>
      </button>
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
    <div className="pending-controls leader-choice-grid">
      {owner ? (
        <>
          <div className="leader-choice-summary">
            <span>Leader transition</span>
            <strong>{counterLabel}</strong>
            <small>Reverend Mother side becomes active.</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={() => onChoose("transition")}
            disabled={owner.leader !== pending.fromLeader || owner.jessicaMemories <= 0}
            aria-label={`Return ${counterLabel}: draw and flip`}
          >
            <span className="leader-choice-badge">
              <BookOpen size={13} />
              Return
            </span>
            <strong>{counterLabel}: draw and flip</strong>
            <small>Spend the memory counter and transform Jessica.</small>
            <span className="visually-hidden-copy">Return {counterLabel}: draw and flip</span>
          </button>
        </>
      ) : (
        <span>{pending.source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={() => onChoose("skip")}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Keep the current leader side.</small>
      </button>
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
    <div className="pending-controls leader-choice-grid">
      {owner && partners.length > 0 ? (
        <>
          <div className="leader-choice-summary">
            <span>Trash {source}</span>
            <strong>Trade with one teammate</strong>
            <small>{partners.length} teammate options</small>
          </div>
          {partners.map((partner) => (
            <button
              type="button"
              className="leader-choice-card leader-choice-primary"
              key={partner.id}
              onClick={() => onTrade(partner.id)}
              aria-label={`Trade with ${partner.leader}`}
            >
              <span className="leader-choice-badge">
                <HandCoins size={13} />
                Teammate
              </span>
              <strong>Trade with {partner.leader}</strong>
              <small>Trash {source}, then open a locked trade.</small>
              <span className="visually-hidden-copy">Trash {source} to trade with one teammate.</span>
            </button>
          ))}
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Keep {source} unresolved.</small>
      </button>
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
    <div className="pending-controls contract-choice leader-choice-grid leader-contract-choice">
      {firstRecipient && secondRecipient && firstContract && secondContract ? (
        <>
          <div className="leader-choice-summary">
            <span>Assign contracts</span>
            <strong>Spend {cost} {resourceLabel}</strong>
            <small>{trashSource ? `Then trash ${source}` : resolutionText}</small>
            <span className="visually-hidden-copy">{resolutionText}</span>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-contract-card leader-choice-primary"
            onClick={() => onChoose(0)}
            disabled={!owner || !canPay}
          >
            <span className="leader-choice-badge">Option 1</span>
            <strong>{firstRecipient.leader} / {secondRecipient.leader}</strong>
            <small>{firstContract.name} to {firstRecipient.leader}</small>
            <small>{secondContract.name} to {secondRecipient.leader}</small>
          </button>
          <button
            type="button"
            className="leader-choice-card leader-contract-card"
            onClick={() => onChoose(1)}
            disabled={!owner || !canPay}
          >
            <span className="leader-choice-badge">Option 2</span>
            <strong>{firstRecipient.leader} / {secondRecipient.leader}</strong>
            <small>{secondContract.name} to {firstRecipient.leader}</small>
            <small>{firstContract.name} to {secondRecipient.leader}</small>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not assign these contracts.</small>
      </button>
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
  const actionLabel = `Spend ${cost} ${resourceLabel}: ${recipientLabel} +${troops} troops${trashSource ? ", trash" : ""}`;
  return (
    <div className="pending-controls leader-choice-grid">
      {allRecipientsPresent ? (
        <>
          <div className="leader-choice-summary">
            <span>{source}</span>
            <strong>{recipientLabel}</strong>
            <small>{availableResource ?? 0} {resourceLabel} available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!owner || !canResolve}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <Sparkles size={13} />
              Spend {cost} {resourceLabel}
            </span>
            <strong>{recipientLabel} +{troops} troops</strong>
            <small>{trashSource ? `Then trash ${source}.` : "Recruit into garrison."}</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not spend the resource.</small>
      </button>
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
  const actionLabel = `Spend ${cost} ${resourceLabel}: draw ${drawCards} card${drawCards === 1 ? "" : "s"}`;
  return (
    <div className="pending-controls leader-choice-grid">
      {owner ? (
        <>
          <div className="leader-choice-summary">
            <span>{source}</span>
            <strong>Draw {drawCards} card{drawCards === 1 ? "" : "s"}</strong>
            <small>{availableResource ?? 0} {resourceLabel} available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!canPay}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <BookOpen size={13} />
              Spend {cost} {resourceLabel}
            </span>
            <strong>Draw {drawCards} card{drawCards === 1 ? "" : "s"}</strong>
            <small>Pay now to take the card draw.</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not draw from this effect.</small>
      </button>
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
  const actionLabel = recipient
    ? `Spend ${cost} ${resourceLabel}: ${recipient.leader} +${strength} strength`
    : `Spend ${cost} ${resourceLabel}: +${strength} strength`;
  return (
    <div className="pending-controls leader-choice-grid">
      {recipient ? (
        <>
          <div className="leader-choice-summary">
            <span>Combat boost</span>
            <strong>{recipient.leader}</strong>
            <small>{owner?.resources[resource] ?? 0} {resourceLabel} available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!owner || owner.resources[resource] < cost}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <Sparkles size={13} />
              Spend {cost} {resourceLabel}
            </span>
            <strong>{recipient.leader} +{strength} strength</strong>
            <small>Add strength to the current conflict.</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{owner?.leader ?? "Player"} can no longer add strength with the current table state.</span>
      )}
      {optional && (
        <button
          type="button"
          className="leader-choice-card"
          onClick={onSkip}
          aria-label="Skip"
        >
          <span className="leader-choice-badge">Pass</span>
          <strong>Skip</strong>
          <small>Do not add combat strength.</small>
        </button>
      )}
    </div>
  );
}

type PendingPayResourceForHighCouncilSeatPanelProps = {
  cost: number;
  onChoose: () => void;
  onSkip: () => void;
  owner?: Player;
  persuasionCost: number;
  persuasionReward: number;
  resource: ResourceId;
  source: string;
};

export function PendingPayResourceForHighCouncilSeatPanel({
  cost,
  onChoose,
  onSkip,
  owner,
  persuasionCost,
  persuasionReward,
  resource,
  source,
}: PendingPayResourceForHighCouncilSeatPanelProps) {
  const resourceLabel = resourceLabels[resource];
  const canPay = Boolean(owner && owner.resources[resource] >= cost && owner.persuasion >= persuasionCost);
  const persuasionText = [
    persuasionCost > 0 ? `forgo ${persuasionCost} persuasion` : undefined,
    persuasionReward > 0 ? `gain ${persuasionReward} persuasion` : undefined,
  ].filter((part): part is string => Boolean(part));
  const actionLabel = `Spend ${cost} ${resourceLabel}: take High Council seat${persuasionText.length > 0 ? `, ${persuasionText.join(", ")}` : ""}`;

  return (
    <div className="pending-controls leader-choice-grid">
      {owner ? (
        <>
          <div className="leader-choice-summary">
            <span>{source}</span>
            <strong>High Council seat</strong>
            <small>{owner.resources[resource]} {resourceLabel} / {owner.persuasion} persuasion available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!canPay}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <CircleDollarSign size={13} />
              Spend {cost} {resourceLabel}
            </span>
            <strong>Take High Council seat</strong>
            <small>{persuasionText.length > 0 ? persuasionText.join(", ") : "Resolve the council purchase."}</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not take the seat.</small>
      </button>
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
  const actionLabel = recipient
    ? `Spend ${cost} ${resourceLabel}: ${recipient.leader} +${amount} ${factionLabel} Influence`
    : `Spend ${cost} ${resourceLabel}: +${amount} ${factionLabel} Influence`;
  return (
    <div className="pending-controls leader-choice-grid">
      {recipient ? (
        <>
          <div className="leader-choice-summary">
            <span>Influence payment</span>
            <strong>{recipient.leader}</strong>
            <small>{owner?.resources[resource] ?? 0} {resourceLabel} available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!owner || owner.resources[resource] < cost}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <CircleDollarSign size={13} />
              Spend {cost} {resourceLabel}
            </span>
            <strong>{recipient.leader} +{amount} {factionLabel} Influence</strong>
            <small>Move the recipient up on the faction track.</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{owner?.leader ?? "Player"} can no longer add Influence with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not gain this influence.</small>
      </button>
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
  const actionLabel = recipient
    ? `Spend ${cost} ${resourceLabel}${persuasionCost > 0 ? ` and forgo ${persuasionCost} persuasion` : ""}: ${recipient.leader} summons ${sandworms} sandworm${sandworms === 1 ? "" : "s"} (+${strength} strength${trashSource ? ", trash" : ""})`
    : `Spend ${cost} ${resourceLabel}: summon ${sandworms} sandworm${sandworms === 1 ? "" : "s"}`;
  return (
    <div className="pending-controls leader-choice-grid">
      {recipient ? (
        <>
          <div className="leader-choice-summary">
            <span>{source}</span>
            <strong>{recipient.leader}</strong>
            <small>{owner?.resources[resource] ?? 0} {resourceLabel} / {owner?.persuasion ?? 0} persuasion available</small>
          </div>
          <button
            type="button"
            className="leader-choice-card leader-choice-primary"
            onClick={onChoose}
            disabled={!owner || owner.resources[resource] < cost || owner.persuasion < persuasionCost}
            aria-label={actionLabel}
          >
            <span className="leader-choice-badge">
              <Droplets size={13} />
              Spend {cost} {resourceLabel}{persuasionCost > 0 ? ` + ${persuasionCost} persuasion` : ""}
            </span>
            <strong>{recipient.leader} summons {sandworms} sandworm{sandworms === 1 ? "" : "s"}</strong>
            <small>+{strength} strength{trashSource ? `, then trash ${source}` : ""}</small>
            <span className="visually-hidden-copy">{actionLabel}</span>
          </button>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
      <button
        type="button"
        className="leader-choice-card"
        onClick={onSkip}
        aria-label="Skip"
      >
        <span className="leader-choice-badge">Pass</span>
        <strong>Skip</strong>
        <small>Do not summon sandworms.</small>
      </button>
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
  viewerPlayerId?: string;
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
  viewerPlayerId,
  onAdjust,
  onPay,
  onSkip,
}: PendingTeamResourcePaymentPanelProps) {
  const resourceLabel = resourceLabels[resource];
  const canRenderPaymentControls = Boolean(resourceLabel) && owner && contributors.length === contributorIds.length;
  const canResolvePayment = !viewerPlayerId || owner?.id === viewerPlayerId;
  const remaining = Math.max(0, cost - total);
  return (
    <div className="pending-controls threaten-spice-choice">
      {canRenderPaymentControls ? (
        <>
          <div className="threaten-spice-progress">
            <span>{source}</span>
            <strong>{remaining === 0 ? `Ready for ${vp} VP` : `${remaining} ${resourceLabel} needed`}</strong>
            <small>
              {total}/{cost} {resourceLabel} committed
              {owner ? ` by ${owner.leader}'s team` : ""}.
            </small>
          </div>
          <div className="threaten-spice-grid">
            {contributors.map((contributor) => {
              const rawContribution = contributions[contributor.id] ?? 0;
              const contribution =
                Number.isInteger(rawContribution) && rawContribution >= 0 ? rawContribution : 0;
              const available = contributor.resources[resource];
              const canAdjustContribution = !viewerPlayerId || contributor.id === viewerPlayerId;
              const reserveLabel = viewerPlayerId
                ? canAdjustContribution ? "Your reserve" : "Teammate reserve"
                : contributor.role;
              return (
                <div
                  className={[
                    "threaten-spice-contributor",
                    canAdjustContribution ? "can-adjust" : "",
                    contribution > 0 ? "has-commitment" : "",
                  ].filter(Boolean).join(" ")}
                  key={contributor.id}
                >
                  <div className="threaten-spice-contributor-name">
                    <strong>{contributor.leader}</strong>
                    <span>{reserveLabel}</span>
                  </div>
                  <span className="threaten-spice-amount">
                    <strong>{contribution}</strong>
                    <small>of {available} {resourceLabel}</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, -1)}
                    disabled={!canAdjustContribution || contribution <= 0}
                    title={`Remove 1 ${resourceLabel} from ${contributor.leader}`}
                    aria-label={`Remove 1 ${resourceLabel} from ${contributor.leader}`}
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjust(contributor.id, 1)}
                    disabled={!canAdjustContribution || contribution >= available || total >= cost}
                    title={`Add 1 ${resourceLabel} from ${contributor.leader}`}
                    aria-label={`Add 1 ${resourceLabel} from ${contributor.leader}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="threaten-spice-actions">
            <button className="threaten-spice-pay" type="button" onClick={onPay} disabled={!canResolvePayment || !canPay}>
              <Sparkles size={15} />
              Pay {cost}: +{vp} VP
            </button>
            {canResolvePayment && <button className="threaten-spice-skip" type="button" onClick={onSkip}>Skip</button>}
          </div>
        </>
      ) : (
        <span>{source} can no longer resolve with the current table state.</span>
      )}
    </div>
  );
}
