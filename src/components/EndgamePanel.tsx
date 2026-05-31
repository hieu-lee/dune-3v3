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
  game: GameState;
  iconChoices: EndgameBattleIconChoice[];
  onFinalize: () => void;
  onScoreConditional: (playerId: string, intrigueId: string) => void;
  onScoreIcon: (playerId: string, intrigueId: string, conflictId: string) => void;
};

export function EndgamePanel({
  conditionalChoices,
  game,
  iconChoices,
  onFinalize,
  onScoreConditional,
  onScoreIcon,
}: EndgamePanelProps) {
  const hasChoices = iconChoices.length + conditionalChoices.length > 0;

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
          <button type="button" onClick={onFinalize}>Finalize Scores</button>
        </div>
      )}
    </div>
  );
}
