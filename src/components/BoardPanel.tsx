import { Crown, FileText, Hexagon, Sparkles, Swords, Users } from "lucide-react";
import { costLabel } from "../app-helpers";
import { locationControlOwnerId } from "../game/critical-locations";
import { boardSpaces, iconLabels } from "../game/data";
import { effectiveCost, spyPostOwnerIds } from "../game/state";
import type { GameState, Player } from "../game/types";

type BoardPanelProps = {
  game: GameState;
  legalSpaceIds: ReadonlySet<string>;
  playingPhase: boolean;
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
};

export function BoardPanel({ game, legalSpaceIds, playingPhase, selectedSpaceId, onSelectSpace }: BoardPanelProps) {
  return (
    <section className="board-panel" aria-label="Six-player board spaces">
      <div className="board-header">
        <div>
          <p className="eyebrow">6p board side</p>
          <h2>Agent Placement</h2>
        </div>
        <div className="legend">
          <span><Hexagon size={14} /> legal</span>
          <span><Users size={14} /> team</span>
          <span><Swords size={14} /> combat</span>
        </div>
      </div>

      <div className="space-grid">
        {boardSpaces.map((space) => {
          const occupant = game.players.find((player) => player.id === game.spaces[space.id]);
          const spyOwners = spyPostOwnerIds(game, space.id)
            .map((ownerId) => game.players.find((player) => player.id === ownerId))
            .filter((player): player is Player => Boolean(player));
          const controlOwnerId = locationControlOwnerId(game, space.id);
          const controlOwner = controlOwnerId ? game.players.find((player) => player.id === controlOwnerId) : undefined;
          const unavailable = space.id === "swordmaster" && game.swordmasterClaimed;
          const legal = legalSpaceIds.has(space.id);
          const selected = playingPhase && selectedSpaceId === space.id;
          return (
            <button
              key={space.id}
              className={`space-tile ${legal ? "legal" : ""} ${selected ? "selected" : ""} ${occupant || unavailable ? "occupied" : ""}`}
              type="button"
              data-testid={`space-${space.id}`}
              data-space-id={space.id}
              aria-pressed={selected}
              onClick={() => playingPhase && onSelectSpace(space.id)}
              disabled={!playingPhase}
              title={space.detail}
            >
              <span className="space-zone">{space.zone}</span>
              {space.thumbnailPath && <img className="space-art" src={space.thumbnailPath} alt="" loading="lazy" />}
              <strong>{space.name}</strong>
              <small>{iconLabels[space.icon]}</small>
              <span className="space-detail">{space.detail}</span>
              {spyOwners.length > 0 && (
                <span className="spy-marker">
                  {spyOwners.map((owner) => owner.leader).join(" + ")} spy{spyOwners.length === 1 ? "" : "s"}
                </span>
              )}
              {controlOwner && (
                <span className="control-marker">
                  <Crown size={12} />
                  {controlOwner.leader}
                </span>
              )}
              {space.maker && (
                <span className="maker-marker">
                  <Sparkles size={12} />
                  {game.makerSpice[space.id] ?? 0} bonus
                </span>
              )}
              <span className="space-footer">
                {space.combat && <Swords size={14} />}
                {space.team && <Users size={14} />}
                {space.contract && <FileText size={14} />}
                {occupant ? occupant.leader : unavailable ? "Claimed" : costLabel(effectiveCost(space, game.players))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
