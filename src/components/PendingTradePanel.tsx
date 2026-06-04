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
  const tradeGoodLabel = tradeGoods.find((good) => good.id === pending.resource)?.label ?? pending.resource;
  const transferButtonClass = (ownerId: string, canGive: boolean, sent: number) => [
    "trade-transfer-button",
    viewerCanTransfer(ownerId) && canGive ? "can-send" : "",
    sent > 0 ? "sent" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="pending-controls trade-controls">
      <div className="trade-setup">
        <div className="trade-control-group">
          <span className="trade-control-label">Trade good</span>
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
        </div>
        <div className="trade-control-group">
          <span className="trade-control-label">Trade partner</span>
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
        </div>
      </div>
      {pending.resource === "intrigue" ? (
        <div className="trade-transfer-lanes trade-intrigue-grid">
          {[actor, partner].map((owner) => {
            const recipient = owner.id === actor.id ? partner : actor;
            const canGive = owner.id === actor.id ? actorCanGive : partnerCanGive;
            return (
              <div className="trade-intrigue-column" key={owner.id}>
                <strong>{owner.leader} to {recipient.leader}</strong>
                <span>Give 1 Intrigue</span>
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
        <div className="trade-transfer-lanes">
          <button
            type="button"
            className={transferButtonClass(actor.id, actorCanGive, pending.actorGiven)}
            onClick={() => onTransfer(actor.id, partner.id)}
            disabled={!viewerCanTransfer(actor.id) || !actorCanGive}
          >
            <strong>{actor.leader} to {partner.leader}</strong>
            <span className="trade-transfer-meta">Give 1 {tradeGoodLabel}</span>
            <small>{pending.actorGiven}/1 sent</small>
          </button>
          <button
            type="button"
            className={transferButtonClass(partner.id, partnerCanGive, pending.partnerGiven)}
            onClick={() => onTransfer(partner.id, actor.id)}
            disabled={!viewerCanTransfer(partner.id) || !partnerCanGive}
          >
            <strong>{partner.leader} to {actor.leader}</strong>
            <span className="trade-transfer-meta">Give 1 {tradeGoodLabel}</span>
            <small>{pending.partnerGiven}/1 sent</small>
          </button>
        </div>
      )}
      <button className="trade-done-button" type="button" onClick={onDone} disabled={actorControlsLocked}>Done</button>
    </div>
  );
}
