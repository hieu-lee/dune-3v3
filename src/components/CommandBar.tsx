import { RotateCcw } from "lucide-react";
import { teams } from "../game/data";
import type { GameState, Player } from "../game/types";

type CommandBarProps = {
  activePlayer: Player;
  game: GameState;
  onResetGame: () => void;
};

export function CommandBar({ activePlayer, game, onResetGame }: CommandBarProps) {
  return (
    <section className="command-bar">
      <div>
        <p className="eyebrow">Six-player team table</p>
        <h1>Dune: Imperium - Uprising 3v3</h1>
      </div>
      <div className="round-panel">
        <span>{game.phase === "playing" ? `Round ${game.round}` : game.phase}</span>
        <strong>
          {game.phase === "playing" || game.phase === "combat"
            ? activePlayer.leader
            : game.winningTeam
              ? `${teams[game.winningTeam].name} wins`
              : "Team scores"}
        </strong>
        <small>
          {game.phase === "playing"
            ? game.agentTurnComplete
              ? "Agent turn response"
              : activePlayer.agentsReady > 0 ? "Agent turn" : "Reveal turn"
            : game.phase === "combat"
              ? "Combat Intrigues"
              : game.endgameReason}
        </small>
      </div>
      <button className="icon-button" type="button" onClick={onResetGame} title="Reset table">
        <RotateCcw size={18} />
      </button>
    </section>
  );
}
