import { manipulateAcquisitionCost } from "../game/state";
import type { Card, GameState, Player } from "../game/types";

type MarketPanelProps = {
  activePlayer: Player;
  game: GameState;
  pendingLocked: boolean;
  playingPhase: boolean;
  onBuyCard: (card: Card) => void;
};

export function MarketPanel({ activePlayer, game, pendingLocked, playingPhase, onBuyCard }: MarketPanelProps) {
  return (
    <div className="market-panel">
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
              onClick={() => onBuyCard(card)}
              disabled={!playingPhase || pendingLocked || !activePlayer.revealed || activePlayer.persuasion < cardCost}
            >
              {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
              <span>
                {cardCost} persuasion
                {manipulatedCard ? " - Manipulate" : ""}
                {card.acquired ? ` - ${card.acquired} VP` : ""}
                {(card.conditionalPersuasion || card.conditionalSwords) ? " - printed reveal" : ""}
              </span>
              <strong>{card.name}</strong>
              <p>{card.conditionalPersuasion || card.conditionalSwords ? "Resolve the printed reveal text on the card." : card.reveal}</p>
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
                onClick={() => onBuyCard(card)}
                disabled={
                  !playingPhase ||
                  pendingLocked ||
                  !activePlayer.revealed ||
                  activePlayer.team !== "shaddam" ||
                  activePlayer.persuasion < (card.cost ?? 0)
                }
              >
                {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
                <span>{card.cost} persuasion</span>
                <strong>{card.name}</strong>
                <p>{card.conditionalPersuasion || card.conditionalSwords ? "Resolve the printed reveal text on the card." : card.reveal}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
