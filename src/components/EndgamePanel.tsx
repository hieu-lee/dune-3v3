import type { CSSProperties } from "react";
import { battleIconLabels, teams } from "../game/data";
import type { BattleIconId, GameState, TeamId } from "../game/types";

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
  const teamScores = (["muaddib", "shaddam"] as TeamId[]).map((team) => ({
    team,
    vp: game.players.filter((player) => player.team === team).reduce((sum, player) => sum + player.vp, 0),
  }));
  const leaderVp = Math.max(...teamScores.map((score) => score.vp));
  const winnerLabel = game.winningTeam ? `${teams[game.winningTeam].name} wins` : "Tie game";
  const statusLabel = game.phase === "finished"
    ? (game.log[0] ?? "Final team scores are locked.")
    : `${readyCount}/${game.players.length} players ready`;
  const choiceCount = iconChoices.length + conditionalChoices.length;
  const choiceGridClass = [
    "pending-controls",
    "endgame-choice-grid",
    hasChoices ? "has-choices" : "no-choices",
    viewerHasChoices ? "awaiting-scores" : "ready-open",
  ].join(" ");

  return (
    <div className="pending-panel endgame-panel">
      <div className="endgame-panel-header">
        <p className="eyebrow">{game.phase === "finished" ? "Final result" : "Endgame"}</p>
        <h2>{game.phase === "finished" ? winnerLabel : game.endgameReason}</h2>
        <small>{statusLabel}</small>
      </div>
      <div className="endgame-panel-body">
        <div className="endgame-scoreboard">
          {teamScores.map(({ team, vp }) => {
            const leading = vp === leaderVp;
            const winning = game.phase === "finished" ? (game.winningTeam ? game.winningTeam === team : leading) : leading;
            return (
              <article
                className={["endgame-score-card", winning ? "leading" : ""].filter(Boolean).join(" ")}
                key={team}
                style={{ "--accent": teams[team].accent } as CSSProperties}
              >
                <span>{teams[team].name}</span>
                <strong>{vp} VP</strong>
                <small>{game.phase === "finished" ? (game.winningTeam === team ? "Winner" : "Final") : (leading ? "Leading" : "Trailing")}</small>
              </article>
            );
          })}
        </div>
        {game.phase === "endgame" ? (
          <div className={choiceGridClass}>
            <div className="endgame-choice-summary">
              <span>Final scoring</span>
              <strong>{hasChoices ? `${choiceCount} Endgame ${choiceCount === 1 ? "Intrigue" : "Intrigues"} to score` : "Ready to finalize"}</strong>
              <small>{viewerHasChoices ? "Resolve your scoreable cards before marking ready." : statusLabel}</small>
            </div>
            {iconChoices.map((choice) => {
              const owner = game.players.find((player) => player.id === choice.playerId);
              const intrigue = owner?.intrigues.find((card) => card.id === choice.intrigueId);
              const conflict = owner?.wonConflicts.find((card) => card.id === choice.conflictId);
              if (!owner || !intrigue || !conflict) return null;
              return (
                <div className="endgame-choice-card" key={`${choice.playerId}-${choice.intrigueId}-${choice.conflictId}`}>
                  <span className="endgame-choice-badge">Battle icon</span>
                  <strong>{owner.leader}</strong>
                  <small>{intrigue.name} / {conflict.name}</small>
                  <button
                    type="button"
                    className="endgame-score-button"
                    onClick={() => onScoreIcon(owner.id, intrigue.id, conflict.id)}
                  >
                    <strong>Score {battleIconLabels[choice.battleIcon]}</strong>
                    <small>Claim 1 VP from this matching conflict.</small>
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
                <div className="endgame-choice-card" key={`${choice.playerId}-${choice.intrigueId}`}>
                  <span className="endgame-choice-badge">Condition met</span>
                  <strong>{owner.leader}</strong>
                  <small>{intrigue.name}</small>
                  <button
                    type="button"
                    className="endgame-score-button"
                    onClick={() => onScoreConditional(owner.id, intrigue.id)}
                  >
                    <strong>Score {rewardText}</strong>
                    <small>Apply this Endgame reward.</small>
                  </button>
                </div>
              );
            })}
            {!hasChoices && <span className="endgame-choice-empty">No Endgame Intrigues are scoreable.</span>}
            <button className="endgame-ready-button" type="button" disabled={finalizeDisabled} onClick={onFinalize}>
              <strong>{finalizeLabel}</strong>
              <small>{finalizeDisabled ? "Score your remaining Endgame Intrigues first." : "Mark this seat ready for final scoring."}</small>
            </button>
          </div>
        ) : (
          <p className="endgame-result-note">{game.log[0] ?? "Final team scores are locked."}</p>
        )}
      </div>
    </div>
  );
}
