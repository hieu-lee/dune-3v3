import { factionShortLabels } from "../app-helpers";
import { factionLabels } from "../game/data";
import type { FactionId, PendingAction, Player } from "../game/types";

type LoseInfluencePendingAction = Extract<PendingAction, { kind: "lose-influence" }>;
type InfluenceChoice = {
  ownerId: string;
  faction: FactionId;
};

type PendingInfluenceLossPanelProps = {
  choices: InfluenceChoice[];
  payerLabel: string;
  pending: LoseInfluencePendingAction;
  players: Player[];
  recipient?: Player;
  onLoseInfluence: (ownerId: string, faction: FactionId) => void;
  onSkip: () => void;
};

export function PendingInfluenceLossPanel({
  choices,
  payerLabel,
  pending,
  players,
  recipient,
  onLoseInfluence,
  onSkip,
}: PendingInfluenceLossPanelProps) {
  const choiceOwnerIds = [...new Set(choices.map((choice) => choice.ownerId))];

  return (
    <div className="pending-controls support-grid">
      <span>
        {payerLabel}: lose 1 Influence for +{pending.strength} strength
        {recipient ? ` to ${recipient.leader}` : ""}
      </span>
      {choices.map(({ ownerId, faction }) => {
        const owner = players.find((player) => player.id === ownerId);
        const showOwner = owner && (choiceOwnerIds.length > 1 || owner.id !== pending.ownerId);
        const ownerRoleLabel = owner?.id === pending.combatRecipientId ? "Recipient" : "Commander personal";
        const label = showOwner
          ? `${ownerRoleLabel}: ${owner.leader} / ${factionLabels[faction]}`
          : factionLabels[faction];
        return (
          <button
            type="button"
            key={`${ownerId}-${faction}`}
            onClick={() => onLoseInfluence(ownerId, faction)}
            title={`${owner?.leader ?? "Player"} loses 1 ${factionLabels[faction]} Influence`}
          >
            <span>{factionShortLabels[faction]}</span>
            {label}
          </button>
        );
      })}
      {choices.length === 0 && <span>No Influence to lose</span>}
      {pending.optional && <button type="button" onClick={onSkip}>Skip</button>}
    </div>
  );
}
