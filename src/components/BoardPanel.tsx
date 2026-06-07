import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Crown, FileText, Hexagon, Sparkles, Swords, Users } from "lucide-react";
import { costLabel, factionShortLabels } from "../app-helpers";
import { locationControlOwnerId } from "../game/critical-locations";
import { boardSpaces, factionLabels as factionFullLabels, iconLabels, teams } from "../game/data";
import {
  effectiveCost,
  spyObservationPostChoiceSpaces,
  spyObservationPostDetailForSpace,
  spyObservationPostIdForSpace,
  spyObservationPostLabelForSpace,
  spyObservationPostOwnerIds,
  spyObservationPostSpaceIdsForSpace,
  spyPostOwnerIds,
} from "../game/state";
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
  spySlotChoices?: BoardSpySlotChoices;
  onSelectSpace: (spaceId: string) => void;
  onSelectSpySlot?: (spaceId: string) => void;
};

export type BoardSpySlotMode = "place" | "recall" | "supply-recall" | "conflict-recall" | "agent-entry";

export type BoardSpySlotChoices = {
  mode: BoardSpySlotMode;
  legalSpaceIds: ReadonlySet<string>;
  selectedSpaceId?: string;
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

type SpaceMeasurement = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

type BoardStageMeasurements = {
  width: number;
  height: number;
  spaces: Record<string, SpaceMeasurement>;
};

type Point = {
  x: number;
  y: number;
};

const spySlotCollisionRadius = 18;
const spySlotLineStopRadius = 15;
const spySlotClampPadding = 30;
const spySlotOutsideGap = 34;
const spySlotOccupiedMargin = 36;

const emptyBoardStageMeasurements: BoardStageMeasurements = {
  width: 0,
  height: 0,
  spaces: {},
};

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

function spySlotModeLabel(mode: BoardSpySlotMode) {
  if (mode === "place") return "Place spy";
  if (mode === "agent-entry") return "Recall spy to enter";
  if (mode === "supply-recall") return "Recall spy for supply";
  if (mode === "conflict-recall") return "Recall spy for conflict reward";
  return "Recall spy";
}

function spySlotModeClass(mode: BoardSpySlotMode) {
  if (mode === "place") return "is-placeable";
  if (mode === "agent-entry") return "is-agent-entry";
  if (mode === "supply-recall") return "is-supply-recall";
  if (mode === "conflict-recall") return "is-conflict-recall";
  return "is-recallable";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const singletonSpySlotVectors: Partial<Record<string, Point>> = {
  carthag: { x: -1, y: -0.1 },
  "deep-desert": { x: 0, y: -1 },
  "habbanya-erg": { x: 0, y: -1 },
  "hagga-basin": { x: 0, y: -1 },
  "imperial-basin": { x: 0, y: -1 },
  "hardy-warriors": { x: 0, y: -1 },
  "desert-mastery": { x: 0, y: -1 },
  "vast-wealth": { x: 0, y: -1 },
  sardaukar: { x: 0, y: -1 },
};

function slotBoundsOverlapMeasurement(point: Point, measurement: SpaceMeasurement) {
  const radius = spySlotCollisionRadius;
  return (
    point.x + radius > measurement.centerX - measurement.width / 2 &&
    point.x - radius < measurement.centerX + measurement.width / 2 &&
    point.y + radius > measurement.centerY - measurement.height / 2 &&
    point.y - radius < measurement.centerY + measurement.height / 2
  );
}

function pointOverlapsAnySpace(point: Point, stage: BoardStageMeasurements) {
  return Object.values(stage.spaces).some((measurement) => slotBoundsOverlapMeasurement(point, measurement));
}

function singletonCandidatePoint(vector: Point, measurement: SpaceMeasurement, stage: BoardStageMeasurements): Point {
  const gap = spySlotOutsideGap;
  const x = measurement.centerX + vector.x * (measurement.width / 2 + gap);
  const y = measurement.centerY + vector.y * (measurement.height / 2 + gap);
  return {
    x: clamp(x, spySlotClampPadding, Math.max(spySlotClampPadding, stage.width - spySlotClampPadding)),
    y: clamp(y, spySlotClampPadding, Math.max(spySlotClampPadding, stage.height - spySlotClampPadding)),
  };
}

function singletonSpySlotPoint(spaceId: string, measurement: SpaceMeasurement, stage: BoardStageMeasurements): Point {
  const preferredVector = singletonSpySlotVectors[spaceId] ?? { x: 0, y: -1 };
  const vectors = [
    preferredVector,
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
  ];
  for (const vector of vectors) {
    const point = singletonCandidatePoint(vector, measurement, stage);
    if (!pointOverlapsAnySpace(point, stage)) return point;
  }
  return singletonCandidatePoint(preferredVector, measurement, stage);
}

function pushPointOutsideMeasurement(point: Point, measurement: SpaceMeasurement, stage: BoardStageMeasurements): Point {
  const margin = spySlotOccupiedMargin;
  const left = measurement.centerX - measurement.width / 2 - margin;
  const right = measurement.centerX + measurement.width / 2 + margin;
  const top = measurement.centerY - measurement.height / 2 - margin;
  const bottom = measurement.centerY + measurement.height / 2 + margin;
  if (point.x < left || point.x > right || point.y < top || point.y > bottom) return point;

  const distances = [
    { side: "left", distance: point.x - left },
    { side: "right", distance: right - point.x },
    { side: "top", distance: point.y - top },
    { side: "bottom", distance: bottom - point.y },
  ].sort((a, b) => a.distance - b.distance);
  const nearestSide = distances[0]?.side;
  const pushed = { ...point };
  if (nearestSide === "left") pushed.x = left;
  if (nearestSide === "right") pushed.x = right;
  if (nearestSide === "top") pushed.y = top;
  if (nearestSide === "bottom") pushed.y = bottom;
  return {
    x: clamp(pushed.x, spySlotClampPadding, Math.max(spySlotClampPadding, stage.width - spySlotClampPadding)),
    y: clamp(pushed.y, spySlotClampPadding, Math.max(spySlotClampPadding, stage.height - spySlotClampPadding)),
  };
}

function multiSpaceSpySlotPoint(measurements: readonly SpaceMeasurement[], stage: BoardStageMeasurements): Point {
  const center = measurements.reduce(
    (total, measurement) => ({
      x: total.x + measurement.centerX,
      y: total.y + measurement.centerY,
    }),
    { x: 0, y: 0 },
  );
  let point = {
    x: center.x / measurements.length,
    y: center.y / measurements.length,
  };
  for (let index = 0; index < 3; index += 1) {
    point = measurements.reduce((current, measurement) => pushPointOutsideMeasurement(current, measurement, stage), point);
  }
  return point;
}

function measurementTop(measurement: SpaceMeasurement) {
  return measurement.centerY - measurement.height / 2;
}

function measurementRight(measurement: SpaceMeasurement) {
  return measurement.centerX + measurement.width / 2;
}

function measurementBottom(measurement: SpaceMeasurement) {
  return measurement.centerY + measurement.height / 2;
}

function measurementLeft(measurement: SpaceMeasurement) {
  return measurement.centerX - measurement.width / 2;
}

function rangesOverlap(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number) {
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

function overlappingRangeMidpoint(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number) {
  return (Math.max(firstStart, secondStart) + Math.min(firstEnd, secondEnd)) / 2;
}

function pairSpySlotPoint(
  first: SpaceMeasurement,
  second: SpaceMeasurement,
  stage: BoardStageMeasurements,
): Point {
  const firstLeft = measurementLeft(first);
  const firstRight = measurementRight(first);
  const firstTop = measurementTop(first);
  const firstBottom = measurementBottom(first);
  const secondLeft = measurementLeft(second);
  const secondRight = measurementRight(second);
  const secondTop = measurementTop(second);
  const secondBottom = measurementBottom(second);
  const x = rangesOverlap(firstLeft, firstRight, secondLeft, secondRight)
    ? overlappingRangeMidpoint(firstLeft, firstRight, secondLeft, secondRight)
    : second.centerX >= first.centerX
      ? (firstRight + secondLeft) / 2
      : (firstLeft + secondRight) / 2;
  const y = rangesOverlap(firstTop, firstBottom, secondTop, secondBottom)
    ? overlappingRangeMidpoint(firstTop, firstBottom, secondTop, secondBottom)
    : second.centerY >= first.centerY
      ? (firstBottom + secondTop) / 2
      : (firstTop + secondBottom) / 2;
  return {
    x: clamp(x, spySlotClampPadding, Math.max(spySlotClampPadding, stage.width - spySlotClampPadding)),
    y: clamp(y, spySlotClampPadding, Math.max(spySlotClampPadding, stage.height - spySlotClampPadding)),
  };
}

function spySlotPointForPost(
  postId: string,
  representativeSpaceId: string,
  measuredSpaces: readonly { spaceId: string; measurement: SpaceMeasurement }[],
  stage: BoardStageMeasurements,
): Point {
  if (measuredSpaces.length === 1) {
    return singletonSpySlotPoint(representativeSpaceId, measuredSpaces[0].measurement, stage);
  }

  if (postId === "high-council-imperial-privilege-swordmaster") {
    const bySpaceId = new Map(measuredSpaces.map(({ spaceId, measurement }) => [spaceId, measurement] as const));
    const highCouncil = bySpaceId.get("high-council");
    const imperialPrivilege = bySpaceId.get("imperial-privilege");
    const swordmaster = bySpaceId.get("swordmaster");
    if (highCouncil && imperialPrivilege && swordmaster) {
      return {
        x: clamp(
          (measurementRight(imperialPrivilege) + measurementLeft(swordmaster)) / 2,
          spySlotClampPadding,
          Math.max(spySlotClampPadding, stage.width - spySlotClampPadding),
        ),
        y: clamp(
          (measurementBottom(highCouncil) + Math.min(measurementTop(imperialPrivilege), measurementTop(swordmaster))) / 2,
          spySlotClampPadding,
          Math.max(spySlotClampPadding, stage.height - spySlotClampPadding),
        ),
      };
    }
  }

  if (measuredSpaces.length === 2) {
    return pairSpySlotPoint(measuredSpaces[0].measurement, measuredSpaces[1].measurement, stage);
  }

  return multiSpaceSpySlotPoint(measuredSpaces.map(({ measurement }) => measurement), stage);
}

function edgePointToward(measurement: SpaceMeasurement, target: Point): Point {
  const dx = target.x - measurement.centerX;
  const dy = target.y - measurement.centerY;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: measurement.centerX, y: measurement.centerY };
  }
  const padding = 5;
  const widthScale = dx === 0 ? Number.POSITIVE_INFINITY : (measurement.width / 2 + padding) / Math.abs(dx);
  const heightScale = dy === 0 ? Number.POSITIVE_INFINITY : (measurement.height / 2 + padding) / Math.abs(dy);
  const scale = Math.min(widthScale, heightScale);
  return {
    x: measurement.centerX + dx * scale,
    y: measurement.centerY + dy * scale,
  };
}

function slotEdgePointToward(slotPoint: Point, measurement: SpaceMeasurement): Point {
  const dx = measurement.centerX - slotPoint.x;
  const dy = measurement.centerY - slotPoint.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= spySlotLineStopRadius) return slotPoint;
  const scale = spySlotLineStopRadius / distance;
  return {
    x: slotPoint.x + dx * scale,
    y: slotPoint.y + dy * scale,
  };
}

export function BoardPanel({
  game,
  legalSpaceIds,
  placementDecisionActive,
  playingPhase,
  selectedSpaceId,
  spySlotChoices,
  onSelectSpace,
  onSelectSpySlot,
}: BoardPanelProps) {
  const boardStageRef = useRef<HTMLDivElement | null>(null);
  const [stageMeasurements, setStageMeasurements] = useState<BoardStageMeasurements>(emptyBoardStageMeasurements);
  const conflictSlots = conflictDeploymentOrder(game.players);
  const conflictSummary = conflictSlots
    .map(({ player }) => (
      `${player.leader}: ${player.conflict} strength, ${plural(player.deployedTroops, "troop")}, ${plural(player.deployedSandworms, "worm")}`
    ))
    .join("; ");
  const spySlotLayouts = useMemo(() => {
    return spyObservationPostChoiceSpaces()
      .map((space) => {
        const representativeSpaceId = space.id;
        const observedSpaceIds = spyObservationPostSpaceIdsForSpace(representativeSpaceId);
        const measuredSpaces = observedSpaceIds
          .map((spaceId) => {
            const measurement = stageMeasurements.spaces[spaceId];
            return measurement ? { spaceId, measurement } : null;
          })
          .filter((entry): entry is { spaceId: string; measurement: SpaceMeasurement } => Boolean(entry));
        if (!representativeSpaceId || measuredSpaces.length === 0) return null;

        const singleton = measuredSpaces.length === 1;
        const postId = spyObservationPostIdForSpace(representativeSpaceId);
        const slotPoint = spySlotPointForPost(postId, representativeSpaceId, measuredSpaces, stageMeasurements);
        const segments = measuredSpaces.map(({ measurement }) => ({
          from: edgePointToward(measurement, slotPoint),
          to: slotEdgePointToward(slotPoint, measurement),
        }));
        const ownerIds = spyObservationPostOwnerIds(game, representativeSpaceId);
        const owners = ownerIds
          .map((ownerId) => game.players.find((player) => player.id === ownerId))
          .filter((player): player is Player => Boolean(player));
        const legal = Boolean(spySlotChoices?.legalSpaceIds.has(representativeSpaceId));
        const label = spyObservationPostLabelForSpace(representativeSpaceId);
        const detail = spyObservationPostDetailForSpace(representativeSpaceId);

        return {
          detail,
          label,
          legal,
          owners,
          postId,
          representativeSpaceId,
          segments,
          singleton,
          x: slotPoint.x,
          y: slotPoint.y,
        };
      })
      .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  }, [game, spySlotChoices, stageMeasurements]);

  useLayoutEffect(() => {
    const stage = boardStageRef.current;
    if (!stage) return undefined;

    const measure = () => {
      const stageRect = stage.getBoundingClientRect();
      const spaces: Record<string, SpaceMeasurement> = {};
      stage.querySelectorAll<HTMLElement>("[data-space-id]").forEach((element) => {
        const spaceId = element.dataset.spaceId;
        if (!spaceId) return;
        const rect = element.getBoundingClientRect();
        spaces[spaceId] = {
          centerX: rect.left + rect.width / 2 - stageRect.left,
          centerY: rect.top + rect.height / 2 - stageRect.top,
          height: rect.height,
          width: rect.width,
        };
      });
      setStageMeasurements({
        height: stageRect.height,
        spaces,
        width: stageRect.width,
      });
    };

    measure();
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(stage);
    stage.querySelectorAll<HTMLElement>("[data-space-id]").forEach((element) => resizeObserver?.observe(element));
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [game.players, game.spaces, game.spyPosts, game.sharedSpyPosts]);

  function renderSpyNetwork() {
    if (stageMeasurements.width <= 0 || stageMeasurements.height <= 0 || spySlotLayouts.length === 0) return null;
    const slotActionLabel = spySlotChoices ? spySlotModeLabel(spySlotChoices.mode) : "Spy post";
    const modeClass = spySlotChoices ? spySlotModeClass(spySlotChoices.mode) : "";

    return (
      <div className={`spy-network ${spySlotChoices ? "is-active" : ""}`} aria-label="Spy post network">
        <svg
          className="spy-network-lines"
          width={stageMeasurements.width}
          height={stageMeasurements.height}
          viewBox={`0 0 ${stageMeasurements.width} ${stageMeasurements.height}`}
          aria-hidden="true"
        >
          {spySlotLayouts.flatMap((slot) =>
            slot.segments.map((segment, index) => {
              return (
                <line
                  className={slot.legal ? "is-legal" : ""}
                  key={`${slot.postId}-${index}`}
                  data-spy-post-id={slot.postId}
                  data-spy-space-id={slot.representativeSpaceId}
                  x1={segment.from.x}
                  y1={segment.from.y}
                  x2={segment.to.x}
                  y2={segment.to.y}
                />
              );
            })
          )}
        </svg>
        <div className="spy-slot-layer">
          {spySlotLayouts.map((slot) => {
            const selected = spySlotChoices?.selectedSpaceId === slot.representativeSpaceId;
            const title = slot.legal
              ? `${slotActionLabel}: ${slot.label}. ${slot.detail}`
              : `${slot.label}. ${slot.detail}`;
            return (
              <button
                className={[
                  "spy-network-slot",
                  slot.singleton ? "is-singleton" : "",
                  slot.owners.length > 0 ? "is-occupied" : "",
                  slot.legal ? "is-legal" : "",
                  selected ? "is-selected" : "",
                  slot.legal ? modeClass : "",
                ].filter(Boolean).join(" ")}
                type="button"
                key={slot.postId}
                data-spy-post-id={slot.postId}
                data-spy-space-id={slot.representativeSpaceId}
                aria-label={title}
                disabled={!slot.legal || !onSelectSpySlot}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!slot.legal) return;
                  onSelectSpySlot?.(slot.representativeSpaceId);
                }}
                style={{
                  "--spy-slot-x": `${slot.x}px`,
                  "--spy-slot-y": `${slot.y}px`,
                } as CSSProperties}
                title={title}
              >
                <span className="spy-network-slot-ring" aria-hidden="true" />
                {slot.owners.length > 0 && (
                  <span className="spy-network-slot-owners" aria-hidden="true">
                    {slot.owners.map((owner) => (
                      <span
                        className="spy-network-slot-owner"
                        key={owner.id}
                        style={{ "--spy-owner-color": owner.color } as CSSProperties}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSpaceTile(space: BoardSpace) {
    const occupant = game.players.find((player) => player.id === game.spaces[space.id]);
    const agentOwnerId = game.agentPlacementOwners?.[space.id] ?? game.spaces[space.id];
    const agentOwner = agentOwnerId ? game.players.find((player) => player.id === agentOwnerId) ?? occupant : undefined;
    const coAgentOwners = (game.agentPlacementCoOwners?.[space.id] ?? [])
      .map((ownerId) => game.players.find((player) => player.id === ownerId))
      .filter((player): player is Player => Boolean(player));
    const agentOwners = [
      ...(agentOwner ? [agentOwner] : []),
      ...coAgentOwners.filter((owner) => owner.id !== agentOwner?.id),
    ];
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
          {agentOwners.map((owner, index) => (
            <span
              className={`agent-marker ${index > 0 ? "agent-marker--co-located" : ""}`}
              key={owner.id}
              style={{ "--occupant-color": owner.color } as CSSProperties}
            >
              <span className="agent-marker-piece" aria-hidden="true" />
              {owner.leader}{index > 0 ? " spy entry" : ""}
            </span>
          ))}
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

      <div className="board-stage" ref={boardStageRef}>
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

        {renderSpyNetwork()}
      </div>
    </section>
  );
}
