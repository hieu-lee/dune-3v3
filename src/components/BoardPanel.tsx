import type { CSSProperties } from "react";
import { Crown, FileText, Hexagon, Sparkles, Swords, Users } from "lucide-react";
import { costLabel, factionShortLabels } from "../app-helpers";
import { locationControlOwnerId } from "../game/critical-locations";
import { boardSpaces, factionLabels as factionFullLabels, iconLabels, teams } from "../game/data";
import { effectiveCost, spyPostOwnerIds } from "../game/state";
import type { BoardSpace, FactionId, GameState, Player, ResourceId, TeamId } from "../game/types";
import {
  boardLayoutSpaceIds,
  boardRegions,
  commanderRegions,
  factionRegions,
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
const influenceTrackByRegionId: Partial<Record<string, FactionId>> = {
  "great-houses": "greatHouses",
  "spacing-guild": "spacing",
  "bene-gesserit": "bene",
  "fringe-worlds": "fringeWorlds",
  "muaddib-command": "fremen",
  "shaddam-command": "emperor",
};
const influenceTrackSteps = [0, 1, 2, 3, 4] as const;

function classToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function plural(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function rewardBadges(space: BoardSpace) {
  const badges: string[] = [];
  if (space.requirement) badges.push(`${space.requirement.amount}+ ${requirementShortLabel(space.requirement.faction)}`);
  if (space.influence) badges.push(`+${factionShortLabels[space.influence]}`);
  (["solari", "spice", "water"] as const).forEach((resource) => {
    const amount = space.gain?.[resource];
    if (amount) badges.push(`+${amount} ${resourceLabels[resource]}`);
  });
  if (space.gain?.intrigue) badges.push(`+${plural(space.gain.intrigue, "Intrigue")}`);
  if (space.troops) badges.push(`+${plural(space.troops, "troop")}`);
  if (space.draw) badges.push(`+${plural(space.draw, "card")}`);
  if (space.recallAgent) badges.push("recall Agent");
  if (space.intrigueSwap) badges.push("cycle Intrigue");
  if (space.spy) badges.push(`+${plural(space.spy, "spy")}`);
  if (space.revealPersuasion) badges.push(`+${space.revealPersuasion} reveal`);
  if (space.contract) badges.push("contract");
  if (space.makerWorms) badges.push(`${plural(space.makerWorms, "worm")}`);
  if (space.personal) badges.push(personalLabels[space.personal]);
  return badges;
}

function requirementShortLabel(faction: FactionId) {
  if (faction === "emperor") return "EMP/GH";
  if (faction === "fremen" || faction === "fringeWorlds") return "FRE/FW";
  return factionShortLabels[faction];
}

function shortLeaderName(leader: string) {
  return leader.split(" ")[0] || leader;
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
  const conflictSlots = conflictDeploymentOrder(game.players);
  const conflictSummary = conflictSlots
    .map(({ player }) => (
      `${player.leader}: ${player.conflict} strength, ${plural(player.deployedTroops, "troop")}, ${plural(player.deployedSandworms, "worm")}`
    ))
    .join("; ");

  function renderSpaceTile(space: BoardSpace) {
    const occupant = game.players.find((player) => player.id === game.spaces[space.id]);
    const agentOwnerId = game.agentPlacementOwners?.[space.id] ?? game.spaces[space.id];
    const agentOwner = agentOwnerId ? game.players.find((player) => player.id === agentOwnerId) ?? occupant : undefined;
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
        style={agentOwner ? { "--occupant-color": agentOwner.color } as CSSProperties : undefined}
        title={space.detail}
      >
        {(legal || unavailable) && (
          <span className="space-placement-status">
            {legal ? "Legal placement" : "Unavailable placement"}
          </span>
        )}
        {space.thumbnailPath && <img className="space-art" src={space.thumbnailPath} alt="" loading="lazy" />}
        <span className="space-occupancy" aria-hidden="true">
          {occupant ? "Occupied" : "Open"}
        </span>
        <span className="space-hover-details">
          {agentOwner && (
            <span className="agent-marker">
              <span className="agent-marker-piece" aria-hidden="true" />
              {agentOwner.leader}
            </span>
          )}
          <span className="space-zone">{space.zone}</span>
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
            <span>{occupant ? "Occupied" : costLabel(effectiveCost(space, game.players))}</span>
          </span>
        </span>
      </button>
    );
  }

  function renderInfluenceTrack(faction: FactionId) {
    const allianceHolderId = game.alliances[faction];
    const allianceHolder = allianceHolderId ? game.players.find((player) => player.id === allianceHolderId) : undefined;
    const entries = game.players
      .map((player, seat) => ({
        player,
        seat,
        amount: player.influence[faction] ?? 0,
        holdsAlliance: game.alliances[faction] === player.id,
      }))
      .filter((entry) => entry.amount > 0 || entry.holdsAlliance)
      .sort((a, b) =>
        b.amount - a.amount ||
        Number(b.holdsAlliance) - Number(a.holdsAlliance) ||
        a.seat - b.seat
      );
    const fullLabel = factionFullLabels[faction];

    return (
      <div className="influence-track" data-faction-id={faction}>
        <div className="influence-track-header">
          <span>{factionShortLabels[faction]}</span>
          <strong>{fullLabel}</strong>
          <small className={allianceHolder ? "influence-track-alliance" : ""}>
            {allianceHolder ? (
              <>
                <Crown size={11} />
                {shortLeaderName(allianceHolder.leader)}
              </>
            ) : "Alliance open"}
          </small>
        </div>
        <div className="influence-track-scale" aria-hidden="true">
          {influenceTrackSteps.map((step) => <span key={step}>{step === 4 ? "4+" : step}</span>)}
        </div>
        <div className="influence-track-markers" role="list" aria-label={`${fullLabel} influence markers`}>
          {entries.length > 0 ? entries.map(({ player, amount, holdsAlliance }) => (
            <span
              className={`influence-track-marker ${holdsAlliance ? "holds-alliance" : ""}`}
              key={player.id}
              aria-label={`${player.leader}: ${amount} ${fullLabel} Influence${holdsAlliance ? ", holds the Alliance" : ""}`}
              role="listitem"
              style={{ "--player-color": player.color } as CSSProperties}
              title={`${player.leader}: ${amount} ${fullLabel} Influence${holdsAlliance ? ", holds the Alliance" : ""}`}
            >
              <span className="influence-track-cube" aria-hidden="true" />
              <span className="influence-track-leader">{shortLeaderName(player.leader)}</span>
              <b>{amount}</b>
              {holdsAlliance && <Crown size={10} aria-hidden="true" />}
            </span>
          )) : (
            <span className="influence-track-empty">No influence</span>
          )}
        </div>
      </div>
    );
  }

  function renderRegion(region: BoardRegionSpec, variant: "faction" | "board" | "commander" = "board") {
    const spaces = region.spaceIds
      .map((spaceId) => boardSpaceById.get(spaceId))
      .filter((space): space is BoardSpace => Boolean(space));
    const influenceTrackFaction = influenceTrackByRegionId[region.id];

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
        {influenceTrackFaction && renderInfluenceTrack(influenceTrackFaction)}
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

      </div>
    </section>
  );
}
