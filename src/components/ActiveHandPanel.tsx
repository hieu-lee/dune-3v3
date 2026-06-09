import { BookOpen, EyeOff, HandCoins, SkipForward } from "lucide-react";
import type { ReactNode } from "react";
import { commanderCanActivateAlly } from "../game/state";
import type { GamePhase, Player } from "../game/types";
import { CardAssetPreview, cardAccessibleSummary } from "./CardAssetPreview";

type ActiveHandPanelProps = {
  activeAllies: readonly Player[];
  activePlayer: Player;
  activatedAlly: Player;
  agentTurnComplete: boolean;
  canPlayAgent: boolean;
  children?: ReactNode;
  phase: GamePhase;
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
  phase,
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
  const hasHandCards = activePlayer.hand.length > 0;
  const hiddenHandCards = activePlayer.hand.filter((card) => card.name === "Hidden card");
  const allHandCardsHidden = hasHandCards && hiddenHandCards.length === activePlayer.hand.length;
  const hasPrivateActions = activePlayer.intrigues.length > 0;
  const emptyPanel = !hasHandCards && !hasPrivateActions;
  const showTurnActions = phase === "playing";
  const phaseStatusLabel = phase === "combat"
    ? "Combat phase"
    : phase === "endgame"
      ? "Final scoring"
      : "Game finished";
  const turnStageLabel = activePlayer.revealed
    ? "Reveal turn"
    : agentTurnComplete
      ? "Agent resolved"
      : "Agent turn";
  const turnStageDetail = pendingActionActive || pendingLocked
    ? "Resolve pending choice"
    : activePlayer.revealed
      ? `${activePlayer.persuasion} persuasion`
      : agentTurnComplete
        ? "Ready to end agent step"
        : activePlayer.agentsReady > 0
          ? `${activePlayer.agentsReady} agent${activePlayer.agentsReady === 1 ? "" : "s"} ready`
          : "Ready to reveal";
  const placeAgentPrimary = !activePlayer.revealed && !agentTurnComplete && activePlayer.agentsReady > 0 && !pendingActionActive;
  const endAgentPrimary = !placeAgentPrimary && agentTurnComplete && !pendingLocked;
  const revealPrimary = !placeAgentPrimary && !endAgentPrimary && !activePlayer.revealed && activePlayer.agentsReady === 0 && !pendingActionActive;
  const endRevealPrimary = activePlayer.revealed && !pendingActionActive;
  const compactForActionContext = pendingActionActive || phase === "combat";

  return (
    <div className={[
      "hand-panel",
      "active-hand-panel",
      emptyPanel ? "empty-hand-panel" : "",
      compactForActionContext ? "active-hand-compact" : "",
      phase === "combat" ? "active-hand-combat" : "",
    ].filter(Boolean).join(" ")}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Active hand</p>
          <h2>{activePlayer.leader}</h2>
        </div>
        {showTurnActions ? (
          <div className="turn-command-center">
            <div className="turn-action-summary">
              <span>{turnStageLabel}</span>
              <strong>{turnStageDetail}</strong>
            </div>
            <div className="turn-actions">
              <button
                type="button"
                className={placeAgentPrimary ? "primary-action" : ""}
                data-testid="place-agent"
                onClick={onPlaceAgent}
                disabled={!canPlayAgent}
              >
                <HandCoins size={17} />
                Place Agent
              </button>
              <button
                type="button"
                className={endAgentPrimary ? "primary-action" : ""}
                data-testid="end-agent"
                onClick={onEndAgentTurn}
                disabled={!playingPhase || !agentTurnComplete || pendingLocked}
              >
                <SkipForward size={17} />
                End Agent
              </button>
              <button
                type="button"
                className={revealPrimary ? "primary-action" : ""}
                data-testid="reveal-turn"
                onClick={onRevealTurn}
                disabled={!playingPhase || agentTurnComplete || activePlayer.revealed || pendingActionActive}
              >
                <BookOpen size={17} />
                Reveal
              </button>
              <button
                type="button"
                className={endRevealPrimary ? "primary-action" : ""}
                data-testid="end-reveal"
                onClick={onEndReveal}
                disabled={!playingPhase || !activePlayer.revealed || pendingActionActive}
              >
                <SkipForward size={17} />
                End
              </button>
            </div>
          </div>
        ) : (
          <span className="turn-status-chip">{phaseStatusLabel}</span>
        )}
      </div>
      {showTurnActions && activePlayer.role === "Commander" && (
        <div className="activation-strip">
          <span>Activating</span>
          {activeAllies.map((ally) => {
            const canActivateAlly = commanderCanActivateAlly(activePlayer, ally);
            const disabledTitle = !canActivateAlly
              ? activePlayer.swordmasterBonus
                ? "Swordmaster extra activation already used"
                : "Requires Swordmaster to activate again"
              : undefined;
            return (
              <button
                type="button"
                key={ally.id}
                className={activatedAlly.id === ally.id ? "selected" : ""}
                disabled={!playingPhase || activePlayer.revealed || !canActivateAlly}
                onClick={() => onSelectCommanderTarget(activePlayer.id, ally.id)}
                title={disabledTitle}
              >
                {ally.leader}
              </button>
            );
          })}
        </div>
      )}
      {hasHandCards ? allHandCardsHidden ? (
        <div
          className="hidden-active-hand-summary"
          role="status"
          aria-label={`${activePlayer.leader} has ${hiddenHandCards.length} hidden cards`}
        >
          <div className="hidden-active-hand-stack" aria-hidden="true">
            {hiddenHandCards.slice(0, 5).map((card) => (
              <span className="hidden-active-card-mini" key={card.id}>
                <span>Dune</span>
              </span>
            ))}
          </div>
          <div className="hidden-active-hand-copy">
            <span>
              <EyeOff size={14} />
              Private hand
            </span>
            <strong>{hiddenHandCards.length} hidden {hiddenHandCards.length === 1 ? "card" : "cards"}</strong>
            <small>Only {activePlayer.leader} can see these cards.</small>
          </div>
        </div>
      ) : (
        <div className="card-row">
          {activePlayer.hand.map((card) => {
            const hidden = card.name === "Hidden card";
            return (
              <button
                type="button"
                className={`hand-card ${hidden ? "hidden-hand-card" : ""} ${playingPhase && selectedCardId === card.id ? "selected" : ""}`}
                key={card.id}
                data-testid={`hand-card-${card.id}`}
                data-card-id={card.id}
                aria-label={hidden ? "Hidden private card" : cardAccessibleSummary(card, `Select ${card.name}`)}
                aria-pressed={playingPhase && selectedCardId === card.id}
                onClick={() => playingPhase && onSelectCard(card.id)}
                disabled={!playingPhase || hidden}
              >
                {hidden ? (
                  <div className="hidden-card-back" aria-hidden="true">
                    <span>Dune</span>
                  </div>
                ) : (
                  <CardAssetPreview card={card} detailLabel="In hand" />
                )}
                {hidden && (
                  <>
                    <span>Private</span>
                    <strong>{card.name}</strong>
                    <p>Only visible to that player.</p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        emptyPanel && <p className="empty-hand-note">No active cards in hand.</p>
      )}
      {children}
    </div>
  );
}
