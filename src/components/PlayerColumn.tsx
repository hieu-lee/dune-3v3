import type { CSSProperties } from "react";
import {
  factionShortLabels,
  memoryCountLabel,
  resources,
} from "../app-helpers";
import { battleIconLabels, factionIds, factionLabels, teams } from "../game/data";
import { canHaveMakerHooks, playerDoublesConflictRewards } from "../game/state";
import type { GameState } from "../game/types";

type PlayerColumnProps = {
  game: GameState;
  tableStateLockedByPending: boolean;
  onOpenLeaderReference: (playerId: string, opener: HTMLButtonElement) => void;
  onMakerHooksChange: (playerId: string, hasHooks: boolean) => void;
};

export function PlayerColumn({
  game,
  tableStateLockedByPending,
  onOpenLeaderReference,
  onMakerHooksChange,
}: PlayerColumnProps) {
  return (
    <aside className="player-column">
      {game.players.map((player, index) => (
        <article
          className={`player-card ${index === game.activeSeat ? "active" : ""}`}
          key={player.id}
          style={{ "--player": player.color } as CSSProperties}
        >
          <div className="player-identity">
            {player.leaderCard.thumbnailPath && (
              <button
                className="leader-art-button"
                type="button"
                onClick={(event) => onOpenLeaderReference(player.id, event.currentTarget)}
                aria-label={`View ${player.leader} leader card`}
                title={`View ${player.leader} leader card`}
              >
                <img className="leader-art" src={player.leaderCard.thumbnailPath} alt="" loading="eager" />
              </button>
            )}
            <div className="player-topline">
              <span>{player.name}</span>
              <strong>{player.leader}</strong>
              <small>{player.role} - {teams[player.team].name}</small>
            </div>
          </div>
          <div className="resource-row">
            {resources.map(({ id, label, Icon }) => (
              <span key={id} title={label}>
                <Icon size={14} />
                {player.resources[id]}
              </span>
            ))}
          </div>
          <div className="mini-stats">
            <span>{player.agentsReady}/{player.agentsTotal} {player.role === "Commander" ? "activations" : "agents"}</span>
            <span>{player.garrison} garrison</span>
            {player.deployedTroops > 0 && <span>{player.deployedTroops} deployed</span>}
            {player.deployedSandworms > 0 && <span>{player.deployedSandworms} worms</span>}
            {game.conflict && playerDoublesConflictRewards(player) && (
              <span
                className="sandworm-reward-chip"
                role="note"
                aria-label="Double printed Conflict-card rewards. Battle icons and location control are not doubled."
                title="Double printed Conflict-card rewards. Battle icons and location control are not doubled."
              >
                2x printed rewards only
              </span>
            )}
            <span>{player.conflict} strength</span>
            {player.highCouncilSeat && <span>High Council</span>}
            {player.makerHooks && <span>Maker Hooks</span>}
            {player.jessicaMemories > 0 && <span>{memoryCountLabel(player.jessicaMemories)}</span>}
            <span>{player.spies} spies</span>
            <span>{player.intrigues.length} intrigue</span>
            <span>{player.contracts.length} contracts</span>
            {player.wonConflicts.length > 0 && <span>{player.wonConflicts.length} conflicts</span>}
            {player.reservedContracts.length > 0 && <span>{player.reservedContracts.length} reserved</span>}
          </div>
          {player.objectives.length > 0 && (
            <div className="objective-row">
              {player.objectives.map((objective) => (
                <span className={objective.scored ? "scored" : ""} key={objective.id} title={objective.name}>
                  {battleIconLabels[objective.battleIcon]}
                  {objective.firstPlayer ? " - first" : ""}
                </span>
              ))}
            </div>
          )}
          {player.wonConflicts.length > 0 && (
            <div className="objective-row conflict-supply-row">
              {player.wonConflicts.map((conflict) => (
                <span className={conflict.scored ? "scored" : ""} key={conflict.id} title={conflict.name}>
                  {battleIconLabels[conflict.battleIcon]}
                </span>
              ))}
            </div>
          )}
          <div className="alliance-status-row" aria-label={`${player.leader} alliance tokens`}>
            {factionIds.map((faction) => {
              const ownsAlliance = game.alliances[faction] === player.id;
              return (
                <span
                  className={`alliance-token-chip ${ownsAlliance ? "selected" : ""}`}
                  key={faction}
                  title={ownsAlliance ? `${player.leader} holds the ${factionLabels[faction]} Alliance` : `${factionLabels[faction]} Alliance`}
                  aria-label={ownsAlliance ? `${player.leader} holds the ${factionLabels[faction]} Alliance` : `${factionLabels[faction]} Alliance not held by ${player.leader}`}
                >
                  <span>{factionShortLabels[faction]}</span>
                </span>
              );
            })}
          </div>
          {canHaveMakerHooks(player) && (
            <div className="alliance-status-row" aria-label={`${player.leader} Maker Hooks`}>
              <label
                className={[player.makerHooks ? "selected" : "", tableStateLockedByPending ? "disabled" : ""]
                  .filter(Boolean)
                  .join(" ")}
                title="Maker Hooks"
              >
                <input
                  type="checkbox"
                  checked={player.makerHooks}
                  disabled={tableStateLockedByPending}
                  aria-label="Maker Hooks"
                  onChange={(event) => onMakerHooksChange(player.id, event.currentTarget.checked)}
                />
                <span>Hooks</span>
              </label>
            </div>
          )}
          {player.contracts.length > 0 && (
            <div className="contract-status-row">
              {player.contracts.map((contract) => (
                <div
                  className={`contract-status-chip ${contract.completed ? "completed" : ""}`}
                  key={contract.card.id}
                  title={contract.card.name}
                >
                  <span>{contract.card.name}</span>
                  <small>{contract.completed ? "Done" : "Pending"}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </aside>
  );
}
