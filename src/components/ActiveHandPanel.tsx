import { BookOpen, HandCoins, SkipForward, Swords } from "lucide-react";
import type { ReactNode } from "react";
import { iconLabels } from "../game/data";
import type { Player } from "../game/types";

type ActiveHandPanelProps = {
  activeAllies: readonly Player[];
  activePlayer: Player;
  activatedAlly: Player;
  agentTurnComplete: boolean;
  canPlayAgent: boolean;
  children?: ReactNode;
  pendingActionActive: boolean;
  pendingLocked: boolean;
  playingPhase: boolean;
  selectedCardId: string | null;
  onEndAgentTurn: () => void;
  onEndReveal: () => void;
  onPlaceAgent: () => void;
  onRevealTurn: () => void;
  onSelectCard: (cardId: string) => void;
  onSelectCommanderTarget: (commanderId: string, allyId: string) => void;
};

export function ActiveHandPanel({
  activeAllies,
  activePlayer,
  activatedAlly,
  agentTurnComplete,
  canPlayAgent,
  children,
  pendingActionActive,
  pendingLocked,
  playingPhase,
  selectedCardId,
  onEndAgentTurn,
  onEndReveal,
  onPlaceAgent,
  onRevealTurn,
  onSelectCard,
  onSelectCommanderTarget,
}: ActiveHandPanelProps) {
  return (
    <div className="hand-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Active hand</p>
          <h2>{activePlayer.leader}</h2>
        </div>
        <div className="turn-actions">
          <button type="button" className="primary-action" data-testid="place-agent" onClick={onPlaceAgent} disabled={!canPlayAgent}>
            <HandCoins size={17} />
            Place Agent
          </button>
          <button type="button" data-testid="end-agent" onClick={onEndAgentTurn} disabled={!playingPhase || !agentTurnComplete || pendingLocked}>
            <SkipForward size={17} />
            End Agent
          </button>
          <button type="button" data-testid="reveal-turn" onClick={onRevealTurn} disabled={!playingPhase || agentTurnComplete || activePlayer.revealed || pendingActionActive}>
            <BookOpen size={17} />
            Reveal
          </button>
          <button type="button" data-testid="end-reveal" onClick={onEndReveal} disabled={!playingPhase || !activePlayer.revealed || pendingActionActive}>
            <SkipForward size={17} />
            End
          </button>
        </div>
      </div>
      {activePlayer.role === "Commander" && (
        <div className="activation-strip">
          <span>Activating</span>
          {activeAllies.map((ally) => (
            <button
              type="button"
              key={ally.id}
              className={activatedAlly.id === ally.id ? "selected" : ""}
              disabled={!playingPhase || activePlayer.revealed}
              onClick={() => onSelectCommanderTarget(activePlayer.id, ally.id)}
            >
              {ally.leader}
            </button>
          ))}
        </div>
      )}
      <div className="card-row">
        {activePlayer.hand.map((card) => (
          <button
            type="button"
            className={`hand-card ${playingPhase && selectedCardId === card.id ? "selected" : ""}`}
            key={card.id}
            data-testid={`hand-card-${card.id}`}
            data-card-id={card.id}
            aria-pressed={playingPhase && selectedCardId === card.id}
            onClick={() => playingPhase && onSelectCard(card.id)}
            disabled={!playingPhase}
          >
            {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
            <span>{card.icons.map((icon) => iconLabels[icon]).join(" / ") || "Reveal"}</span>
            <strong>{card.name}</strong>
            <p>{card.play}</p>
            <footer>
              <span><BookOpen size={13} /> {card.persuasion}</span>
              <span><Swords size={13} /> {card.swords}</span>
              {(card.conditionalPersuasion || card.conditionalSwords) && <span>Printed</span>}
            </footer>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
