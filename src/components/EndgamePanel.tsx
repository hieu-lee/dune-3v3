import { battleIconLabels } from "../game/data";
import type { BattleIconId, GameState } from "../game/types";

type EndgameBattleIconChoice = {
  playerId: string;
  intrigueId: string;
  conflictId: string;
  battleIcon: BattleIconId;
};

type EndgameConditionalChoice = {
  playerId: string;
  intrigueId: string;
  vp: number;
  spice?: number;
};

type EndgamePanelProps = {
  conditionalChoices: EndgameConditionalChoice[];
  endgameReady?: Record<string, boolean | undefined>;
  game: GameState;
  iconChoices: EndgameBattleIconChoice[];
  roomMode?: boolean;
  viewerPlayerId?: string;
  onFinalize: () => void;
  onScoreConditional: (playerId: string, intrigueId: string) => void;
  onScoreIcon: (playerId: string, intrigueId: string, conflictId: string) => void;
};

export function EndgamePanel({
  conditionalChoices,
  endgameReady = {},
  game,
  iconChoices,
  roomMode = false,
  viewerPlayerId,
  onFinalize,
  onScoreConditional,
  onScoreIcon,
}: EndgamePanelProps) {
  const hasChoices = iconChoices.length + conditionalChoices.length > 0;
  const viewerHasChoices = Boolean(
    viewerPlayerId &&
    (iconChoices.some((choice) => choice.playerId === viewerPlayerId) ||
      conditionalChoices.some((choice) => choice.playerId === viewerPlayerId)),
  );
  const viewerReady = Boolean(viewerPlayerId && endgameReady[viewerPlayerId]);
  const readyCount = game.players.filter((player) => endgameReady[player.id]).length;
  const finalizeDisabled = roomMode && (!viewerPlayerId || viewerReady || viewerHasChoices);
  const finalizeLabel = roomMode
    ? viewerReady
      ? `Ready (${readyCount}/${game.players.length})`
      : viewerHasChoices
        ? "Score Your Endgame Intrigues"
        : `Ready (${readyCount}/${game.players.length})`
    : "Finalize Scores";

  return (
    <div className="pending-panel endgame-panel">
      <div>
        <p className="eyebrow">{game.phase === "finished" ? "Final result" : "Endgame"}</p>
        <h2>{game.phase === "finished" ? "Team Scores Locked" : game.endgameReason}</h2>
      </div>
      {game.phase === "endgame" && (
        <div className="pending-controls support-grid">
          {iconChoices.map((choice) => {
            const owner = game.players.find((player) => player.id === choice.playerId);
            const intrigue = owner?.intrigues.find((card) => card.id === choice.intrigueId);
            const conflict = owner?.wonConflicts.find((card) => card.id === choice.conflictId);
            if (!owner || !intrigue || !conflict) return null;
            return (
              <div className="support-target" key={`${choice.playerId}-${choice.intrigueId}-${choice.conflictId}`}>
                <strong>{owner.leader}</strong>
                <span>{intrigue.name} / {conflict.name}</span>
                <button type="button" onClick={() => onScoreIcon(owner.id, intrigue.id, conflict.id)}>
                  Score {battleIconLabels[choice.battleIcon]}
                </button>
              </div>
            );
          })}
          {conditionalChoices.map((choice) => {
            const owner = game.players.find((player) => player.id === choice.playerId);
            const intrigue = owner?.intrigues.find((card) => card.id === choice.intrigueId);
            if (!owner || !intrigue) return null;
            const rewardText = `${choice.vp} VP${choice.spice ? ` / ${choice.spice} spice` : ""}`;
            return (
              <div className="support-target" key={`${choice.playerId}-${choice.intrigueId}`}>
                <strong>{owner.leader}</strong>
                <span>{intrigue.name}</span>
                <button type="button" onClick={() => onScoreConditional(owner.id, intrigue.id)}>
                  Score {rewardText}
                </button>
              </div>
            );
          })}
          {!hasChoices && <span>No Endgame Intrigues are scoreable.</span>}
          <button type="button" disabled={finalizeDisabled} onClick={onFinalize}>{finalizeLabel}</button>
        </div>
      )}
    </div>
  );
}
