import { manipulateAcquisitionCost } from "../game/state";
import type { Card, GameState, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

type MarketPanelProps = {
  activePlayer: Player;
  combatContext: boolean;
  compactForActionContext: boolean;
  game: GameState;
  pendingLocked: boolean;
  playingPhase: boolean;
  onBuyCard: (card: Card) => void;
};

export function MarketPanel({
  activePlayer,
  combatContext,
  compactForActionContext,
  game,
  pendingLocked,
  playingPhase,
  onBuyCard,
}: MarketPanelProps) {
  return (
    <div className={[
      "market-panel",
      compactForActionContext ? "market-panel-compact" : "",
      combatContext ? "market-panel-combat" : "",
    ].filter(Boolean).join(" ")}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Imperium row</p>
          <h2>Acquire After Reveal</h2>
        </div>
        <strong className="persuasion">{activePlayer.persuasion} persuasion</strong>
      </div>
      <div className="market-row">
        {[...game.imperiumRow, ...game.reserveMarket, ...activePlayer.manipulatedCards].map((card) => {
          const manipulatedCard = activePlayer.manipulatedCards.some((candidate) => candidate.id === card.id);
          const cardCost = manipulatedCard ? manipulateAcquisitionCost(card) : card.cost ?? 0;
          return (
            <button
              type="button"
              className="market-card"
              key={card.id}
              aria-label={cardAccessibleSummary(
                card,
                `Acquire ${card.name}`,
                `${cardCost} persuasion${manipulatedCard ? " after Manipulate" : ""}`,
              )}
              onClick={() => onBuyCard(card)}
              disabled={!playingPhase || pendingLocked || !activePlayer.revealed || activePlayer.persuasion < cardCost}
            >
              <CardAssetPreview
                card={card}
                detailLabel={manipulatedCard ? "Manipulate discount" : "Acquire after reveal"}
                metaLabel={[
                  `${cardCost} persuasion`,
                  manipulatedCard ? "Manipulate" : undefined,
                  card.acquired ? `${card.acquired} VP` : undefined,
                ].filter((part): part is string => Boolean(part)).join(" / ")}
              />
            </button>
          );
        })}
      </div>
      {game.throneRow.length > 0 && (
        <section className="throne-market">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Shaddam team market</p>
              <h2>Throne Row</h2>
            </div>
            <span>{game.throneRow.length} held</span>
          </div>
          <div className="market-row throne-row">
            {game.throneRow.map((card) => (
              <button
                type="button"
                className="market-card throne-card"
                key={card.id}
                aria-label={cardAccessibleSummary(
                  card,
                  `Acquire ${card.name} from Throne Row`,
                  `${card.cost ?? 0} persuasion`,
                )}
                onClick={() => onBuyCard(card)}
                disabled={
                  !playingPhase ||
                  pendingLocked ||
                  !activePlayer.revealed ||
                  activePlayer.team !== "shaddam" ||
                  activePlayer.persuasion < (card.cost ?? 0)
                }
              >
                <CardAssetPreview
                  card={card}
                  detailLabel="Throne Row"
                  metaLabel={`${card.cost ?? 0} persuasion`}
                />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
