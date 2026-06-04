import type { CSSProperties } from "react";
import { Crown, FileText, Hexagon, Sparkles, Swords, Users } from "lucide-react";
import { costLabel } from "../app-helpers";
import { locationControlOwnerId } from "../game/critical-locations";
import { boardSpaces, iconLabels, teams } from "../game/data";
import { effectiveCost, spyPostOwnerIds } from "../game/state";
import type { BoardSpace, FactionId, GameState, Player, ResourceId, TeamId } from "../game/types";
import {
  boardLayoutSpaceIds,
  boardRegions,
  commanderRegions,
  factionRegions,
  scoreTrackValues,
  type BoardRegionSpec,
} from "./board-layout";

type BoardPanelProps = {
  game: GameState;
  legalSpaceIds: ReadonlySet<string>;
  placementDecisionActive: boolean;
  playingPhase: boolean;
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
};

const factionLabels: Record<FactionId, string> = {
  bene: "BG",
  emperor: "EMP",
  fremen: "FRE",
  fringeWorlds: "FW",
  greatHouses: "GH",
  spacing: "SG",
};

const resourceLabels: Record<ResourceId, string> = {
  solari: "solari",
  spice: "spice",
  water: "water",
};

const personalLabels: Record<TeamId, string> = {
  muaddib: "Muad'Dib",
  shaddam: "Shaddam",
};

const boardSpaceById = new Map(boardSpaces.map((space) => [space.id, space]));
const layoutSpaceIds = new Set(boardLayoutSpaceIds);
const unplacedSpaces = boardSpaces.filter((space) => !layoutSpaceIds.has(space.id));
const scoreTrackMaximum = Math.max(...scoreTrackValues);
const scoreTrackMinimum = Math.min(...scoreTrackValues);
const scoreTeams = ["muaddib", "shaddam"] as const;

function classToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function plural(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function rewardBadges(space: BoardSpace) {
  const badges: string[] = [];
  if (space.requirement) badges.push(`${space.requirement.amount}+ ${factionLabels[space.requirement.faction]}`);
  if (space.influence) badges.push(`+${factionLabels[space.influence]}`);
  (["solari", "spice", "water"] as const).forEach((resource) => {
    const amount = space.gain?.[resource];
    if (amount) badges.push(`+${amount} ${resourceLabels[resource]}`);
  });
  if (space.gain?.intrigue) badges.push(`+${plural(space.gain.intrigue, "Intrigue")}`);
  if (space.troops) badges.push(`+${plural(space.troops, "troop")}`);
  if (space.draw) badges.push(`+${plural(space.draw, "card")}`);
  if (space.spy) badges.push(`+${plural(space.spy, "spy")}`);
  if (space.revealPersuasion) badges.push(`+${space.revealPersuasion} reveal`);
  if (space.contract) badges.push("contract");
  if (space.makerWorms) badges.push(`${plural(space.makerWorms, "worm")}`);
  if (space.personal) badges.push(personalLabels[space.personal]);
  return badges;
}

function teamVictoryPoints(players: readonly Player[], team: TeamId) {
  return players
    .filter((player) => player.team === team)
    .reduce((sum, player) => sum + player.vp, 0);
}

function scoreTrackSlot(score: number) {
  return Math.min(scoreTrackMaximum, Math.max(scoreTrackMinimum, score));
}

function conflictUnitCount(player: Player) {
  return player.deployedTroops + player.deployedSandworms;
}

function conflictDeploymentOrder(players: readonly Player[]) {
  return players
    .map((player, seat) => ({ player, seat }))
    .sort((a, b) =>
      b.player.conflict - a.player.conflict ||
      conflictUnitCount(b.player) - conflictUnitCount(a.player) ||
      a.seat - b.seat
    );
}

export function BoardPanel({
  game,
  legalSpaceIds,
  placementDecisionActive,
  playingPhase,
  selectedSpaceId,
  onSelectSpace,
}: BoardPanelProps) {
  const scoreMarkers = scoreTeams.map((team) => {
    const score = teamVictoryPoints(game.players, team);
    return {
      team,
      score,
      slot: scoreTrackSlot(score),
      label: teams[team].name,
      accent: teams[team].accent,
    };
  });
  const conflictSlots = conflictDeploymentOrder(game.players);
  const conflictSummary = conflictSlots
    .map(({ player }) => (
      `${player.leader}: ${player.conflict} strength, ${plural(player.deployedTroops, "troop")}, ${plural(player.deployedSandworms, "worm")}`
    ))
    .join("; ");

  function renderSpaceTile(space: BoardSpace) {
    const occupant = game.players.find((player) => player.id === game.spaces[space.id]);
    const spyOwners = spyPostOwnerIds(game, space.id)
      .map((ownerId) => game.players.find((player) => player.id === ownerId))
      .filter((player): player is Player => Boolean(player));
    const controlOwnerId = locationControlOwnerId(game, space.id);
    const controlOwner = controlOwnerId ? game.players.find((player) => player.id === controlOwnerId) : undefined;
    const legal = legalSpaceIds.has(space.id);
    const selected = playingPhase && selectedSpaceId === space.id;
    const unavailable = placementDecisionActive && !legal;
    const badges = rewardBadges(space);
    const spaceClass = [
      "space-tile",
      `space-tile--${space.icon}`,
      `space-tile--${classToken(space.zone)}`,
      legal ? "legal" : "",
      unavailable ? "unavailable" : "",
      selected ? "selected" : "",
      occupant ? "occupied" : "",
      space.personal ? "personal" : "",
      space.combat ? "combat" : "",
      space.maker ? "maker" : "",
    ].filter(Boolean).join(" ");

    return (
      <button
        key={space.id}
        className={spaceClass}
        type="button"
        data-testid={`space-${space.id}`}
        data-space-id={space.id}
        aria-pressed={selected}
        onClick={() => playingPhase && onSelectSpace(space.id)}
        disabled={!playingPhase}
        title={space.detail}
      >
        {(legal || unavailable) && (
          <span className="space-placement-status">
            {legal ? "Legal placement" : "Unavailable placement"}
          </span>
        )}
        <span className="space-zone">{space.zone}</span>
        {space.thumbnailPath && <img className="space-art" src={space.thumbnailPath} alt="" loading="lazy" />}
        <strong>{space.name}</strong>
        <small>{iconLabels[space.icon]}</small>
        <span className="space-rewards" aria-hidden="true">
          {badges.map((badge) => <span key={badge}>{badge}</span>)}
        </span>
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
          <span>
            {space.combat && <Swords size={14} />}
            {space.team && <Users size={14} />}
            {space.contract && <FileText size={14} />}
          </span>
          <span>{occupant ? occupant.leader : costLabel(effectiveCost(space, game.players))}</span>
        </span>
      </button>
    );
  }

  function renderRegion(region: BoardRegionSpec, variant: "faction" | "board" | "commander" = "board") {
    const spaces = region.spaceIds
      .map((spaceId) => boardSpaceById.get(spaceId))
      .filter((space): space is BoardSpace => Boolean(space));

    return (
      <section
        key={region.id}
        className={`board-region board-region--${region.tone} board-region--${variant}`}
        data-region-id={region.id}
        aria-label={region.title}
      >
        <header className="board-region-header">
          <span>{region.subtitle}</span>
          <strong>{region.title}</strong>
        </header>
        <div className="board-region-spaces">
          {spaces.map(renderSpaceTile)}
        </div>
      </section>
    );
  }

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

      <div className="board-stage">
        <aside className="board-faction-rail" aria-label="Faction board columns">
          {factionRegions.map((region) => renderRegion(region, "faction"))}
        </aside>

        <div className="board-map" aria-label="Main six-player board layout">
          <div className="board-top-band">
            {renderRegion(boardRegions[0])}
            {renderRegion(boardRegions[1])}
          </div>

          <div className="board-center-band">
            {renderRegion(boardRegions[2])}
            <div className="board-conflict-field" aria-label="Conflict deployment area">
              <div className="conflict-emblem">
                <Swords size={28} />
                <span>{game.conflict ? `Conflict ${game.conflict.level}` : "Conflict"}</span>
                <strong>{game.conflict?.name ?? "No active conflict"}</strong>
                <small>{game.phase === "combat" ? "Combat phase" : game.shieldWall ? "Shield Wall standing" : "Shield Wall down"}</small>
              </div>
              <span className="conflict-summary">
                {conflictSummary}
              </span>
              <div className="conflict-slots" role="list">
                {conflictSlots.map(({ player }) => {
                  const units = conflictUnitCount(player);
                  const activeCombatant = game.phase === "combat" && game.players[game.activeSeat]?.id === player.id;
                  return (
                    <article
                      className={[
                        "conflict-slot",
                        units === 0 && player.conflict === 0 ? "is-empty" : "",
                        player.deployedSandworms > 0 ? "has-worms" : "",
                        activeCombatant ? "is-active" : "",
                      ].filter(Boolean).join(" ")}
                      data-testid={`conflict-slot-${player.id}`}
                      data-player-id={player.id}
                      key={player.id}
                      role="listitem"
                      style={{ "--player-color": player.color } as CSSProperties}
                    >
                      <span>{teams[player.team].name}</span>
                      <strong>{player.leader}</strong>
                      <div className="conflict-slot-stats">
                        <span><Swords size={12} /> {player.conflict}</span>
                        <span>{player.deployedTroops}T</span>
                        <span>{player.deployedSandworms}W</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="conflict-strength-track" aria-hidden="true">
                {Array.from({ length: 10 }, (_, index) => <span key={index}>{index + 1}</span>)}
              </div>
            </div>
            {renderRegion(boardRegions[3])}
          </div>

          <div className="board-commander-dock">
            {commanderRegions.map((region) => renderRegion(region, "commander"))}
          </div>

          {unplacedSpaces.length > 0 && (
            <section className="board-region board-region--fallback" aria-label="Unplaced board spaces">
              <header className="board-region-header">
                <span>Layout fallback</span>
                <strong>Unplaced</strong>
              </header>
              <div className="board-region-spaces">
                {unplacedSpaces.map(renderSpaceTile)}
              </div>
            </section>
          )}
        </div>

        <aside className="board-score-rail" aria-label="Score track">
          <strong>VP</strong>
          <span className="board-score-summary">
            {scoreMarkers.map((marker) => `${marker.label}: ${marker.score} VP`).join("; ")}
          </span>
          {scoreTrackValues.map((score) => {
            const slotMarkers = scoreMarkers.filter((marker) => marker.slot === score);
            return (
              <div className={`board-score-row ${slotMarkers.length > 0 ? "board-score-row--marked" : ""}`} key={score}>
                <span className="board-score-value">{score}</span>
                {slotMarkers.length > 0 && (
                  <span className="board-score-markers" aria-hidden="true">
                    {slotMarkers.map((marker) => (
                      <span
                        className="board-score-marker"
                        key={marker.team}
                        style={{ "--score-marker": marker.accent } as CSSProperties}
                        title={`${marker.label}: ${marker.score} VP`}
                        aria-label={`${marker.label}: ${marker.score} VP`}
                      >
                        {marker.score}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
