import type { CSSProperties } from "react";
import { Trophy } from "lucide-react";
import { factionShortLabels, resources } from "../app-helpers";
import { factionIds, factionLabels, teams } from "../game/data";
import type { GameState } from "../game/types";

type PlayerTableStripProps = {
  game: GameState;
};

export function PlayerTableStrip({ game }: PlayerTableStripProps) {
  const turnActive = game.phase === "playing" || game.phase === "combat";

  return (
    <section className="player-table-strip" aria-label="All players at the table">
      {game.players.map((player, index) => {
        const activeTurn = turnActive && index === game.activeSeat;
        const heldAlliances = factionIds.filter((faction) => game.alliances[faction] === player.id);
        return (
          <article
            className={[
              "player-strip-tile",
              activeTurn ? "active" : "",
            ].filter(Boolean).join(" ")}
            key={player.id}
            style={{ "--player": player.color } as CSSProperties}
            aria-current={activeTurn ? "true" : undefined}
          >
            <header className="player-strip-head">
              <span className="player-strip-swatch" aria-hidden="true" />
              <span className="player-strip-names">
                <strong>{player.leader}</strong>
                <small>{player.name} - {teams[player.team].name}</small>
              </span>
              {index === game.firstSeat && (
                <span className="player-strip-tag" title="Round starter">RS</span>
              )}
              {activeTurn && (
                <span className="player-strip-tag is-turn" title="Active turn">Turn</span>
              )}
            </header>
            <div className="player-strip-resources">
              <span className="vp-resource" title="Victory Points">
                <Trophy size={13} aria-hidden="true" />
                {player.vp}
                <span className="sr-only"> victory points</span>
              </span>
              {resources.map(({ id, label, Icon }) => (
                <span key={id} title={label}>
                  <Icon size={13} aria-hidden="true" />
                  {player.resources[id]}
                  <span className="sr-only"> {label}</span>
                </span>
              ))}
              <span title={player.role === "Commander" ? "Activations ready" : "Agents ready"}>
                {player.agentsReady}/{player.agentsTotal}
                <span className="sr-only"> {player.role === "Commander" ? "activations" : "agents"} ready</span>
              </span>
            </div>
            <div className="player-strip-influence" role="list" aria-label={`${player.leader} faction influence`}>
              {factionIds.map((faction) => {
                const holdsAlliance = heldAlliances.includes(faction);
                return (
                  <span
                    className={["player-strip-faction", holdsAlliance ? "holds-alliance" : ""].filter(Boolean).join(" ")}
                    key={faction}
                    role="listitem"
                    title={`${factionLabels[faction]}: ${player.influence[faction]} influence${holdsAlliance ? " (holds Alliance)" : ""}`}
                  >
                    <b>{factionShortLabels[faction]}</b>
                    {player.influence[faction]}
                  </span>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
