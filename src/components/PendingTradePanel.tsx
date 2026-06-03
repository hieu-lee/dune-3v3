import { tradeGoods } from "../app-helpers";
import type { PendingAction, Player, TradeGoodId } from "../game/types";

type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;

type PendingTradePanelProps = {
  actor: Player;
  partner: Player;
  partners: Player[];
  pending: TradePendingAction;
  tradeLocked: boolean;
  viewerPlayerId?: string;
  onDone: () => void;
  onTransfer: (fromId: string, toId: string, intrigueId?: string) => void;
  onUpdateTrade: (resource: TradeGoodId, partnerId?: string) => void;
};

export function PendingTradePanel({
  actor,
  partner,
  partners,
  pending,
  tradeLocked,
  viewerPlayerId,
  onDone,
  onTransfer,
  onUpdateTrade,
}: PendingTradePanelProps) {
  const actorCanGive = pending.actorGiven === 0;
  const partnerCanGive = pending.partnerGiven === 0;
  const actorControlsLocked = Boolean(viewerPlayerId && viewerPlayerId !== actor.id);
  const viewerCanTransfer = (ownerId: string) => !viewerPlayerId || viewerPlayerId === ownerId;

  return (
    <div className="pending-controls trade-controls">
      <div className="resource-picker">
        {tradeGoods.map(({ id, label, Icon }) => (
          <button
            type="button"
            className={pending.resource === id ? "selected" : ""}
            key={id}
            onClick={() => onUpdateTrade(id)}
            disabled={actorControlsLocked || pending.resource === id || (tradeLocked && pending.resource !== id)}
            title={label}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="resource-picker">
        {partners.map((candidate) => (
          <button
            type="button"
            className={partner.id === candidate.id ? "selected" : ""}
            key={candidate.id}
            onClick={() => onUpdateTrade(pending.resource, candidate.id)}
            disabled={actorControlsLocked || partner.id === candidate.id || (tradeLocked && partner.id !== candidate.id)}
          >
            {candidate.leader}
          </button>
        ))}
      </div>
      {pending.resource === "intrigue" ? (
        <div className="trade-intrigue-grid">
          {[actor, partner].map((owner) => {
            const recipient = owner.id === actor.id ? partner : actor;
            const canGive = owner.id === actor.id ? actorCanGive : partnerCanGive;
            return (
              <div className="trade-intrigue-column" key={owner.id}>
                <strong>{owner.leader}</strong>
                {owner.intrigues.length === 0 && <span>No Intrigues</span>}
                {owner.intrigues.map((card) => (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => onTransfer(owner.id, recipient.id, card.id)}
                    disabled={!viewerCanTransfer(owner.id) || !canGive}
                    title={`Trade ${card.name} to ${recipient.leader}`}
                  >
                    {card.thumbnailPath && <img src={card.thumbnailPath} alt="" />}
                    <span>{card.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onTransfer(actor.id, partner.id)}
            disabled={!viewerCanTransfer(actor.id) || !actorCanGive}
          >
            {actor.leader} gives 1 ({pending.actorGiven})
          </button>
          <button
            type="button"
            onClick={() => onTransfer(partner.id, actor.id)}
            disabled={!viewerCanTransfer(partner.id) || !partnerCanGive}
          >
            {partner.leader} gives 1 ({pending.partnerGiven})
          </button>
        </>
      )}
      <button type="button" onClick={onDone} disabled={actorControlsLocked}>Done</button>
    </div>
  );
}
