import { boardSpaces } from "../game/data";
import { resolveAgentPayTeamResourceForVps } from "../game/effect-resolver";
import type { GameState, PendingAction, Player, ResourceId } from "../game/types";
import { PendingTeamResourcePaymentPanel } from "./PendingLeaderChoicePanels";

type TeamResourcePaymentPendingAction = Extract<PendingAction, { kind: "team-resource-payment" }>;

const resourceIds: ResourceId[] = ["solari", "spice", "water"];

function isResourceId(value: unknown): value is ResourceId {
  return resourceIds.includes(value as ResourceId);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function teamResourcePaymentViewModel(pendingAction: TeamResourcePaymentPendingAction, game: GameState): {
  canPay: boolean;
  contributorIds: string[];
  contributions: Record<string, number>;
  contributors: Player[];
  cost: number;
  owner?: Player;
  resource: ResourceId;
  source: string;
  total: number;
  valid: boolean;
  vp: number;
} {
  const fallback = {
    canPay: false,
    contributorIds: [],
    contributions: {},
    contributors: [],
    cost: 0,
    resource: "spice" as ResourceId,
    source: "Team resource payment",
    total: 0,
    valid: false,
    vp: 0,
  };
  const rawPending = pendingAction as unknown as Record<string, unknown>;
  let valid = true;
  const resource = isResourceId(rawPending.resource) ? rawPending.resource : fallback.resource;
  if (!isResourceId(rawPending.resource)) valid = false;
  const cost = isPositiveInteger(rawPending.cost) ? rawPending.cost : 0;
  if (!isPositiveInteger(rawPending.cost)) valid = false;
  const vp = isPositiveInteger(rawPending.vp) ? rawPending.vp : 0;
  if (!isPositiveInteger(rawPending.vp)) valid = false;
  const source = typeof rawPending.source === "string" && rawPending.source.trim() ? rawPending.source : fallback.source;
  if (typeof rawPending.source !== "string" || !rawPending.source.trim()) valid = false;
  if (rawPending.optional !== true) valid = false;
  if (rawPending.trashSource !== undefined && typeof rawPending.trashSource !== "boolean") valid = false;
  const cardId = typeof rawPending.cardId === "string" && rawPending.cardId ? rawPending.cardId : undefined;
  if (!cardId) valid = false;
  const owner = typeof rawPending.ownerId === "string"
    ? game.players.find((player) => player.id === rawPending.ownerId)
    : undefined;
  if (!owner || owner.role !== "Commander") valid = false;
  const sourceCard = owner && cardId ? owner.playArea.find((card) => card.id === cardId) : undefined;
  if (!sourceCard?.effects) valid = false;

  const rawContributorIds = rawPending.contributorIds;
  const contributorIds = Array.isArray(rawContributorIds)
    ? rawContributorIds.filter((contributorId): contributorId is string => typeof contributorId === "string")
    : [];
  if (
    !Array.isArray(rawContributorIds) ||
    contributorIds.length !== rawContributorIds.length ||
    contributorIds.length !== 3 ||
    new Set(contributorIds).size !== contributorIds.length ||
    (owner && contributorIds[0] !== owner.id)
  ) {
    valid = false;
  }
  const contributors = contributorIds
    .map((contributorId) => game.players.find((player) => player.id === contributorId))
    .filter((player): player is Player => Boolean(player));
  if (contributors.length !== contributorIds.length) valid = false;
  if (
    owner &&
    contributors.slice(1).some((contributor) => contributor.team !== owner.team || contributor.role !== "Ally")
  ) {
    valid = false;
  }

  const rawContributions = rawPending.contributions;
  if (!rawContributions || typeof rawContributions !== "object" || Array.isArray(rawContributions)) {
    return { ...fallback, contributorIds, contributors, cost, owner, resource, source, vp };
  }
  const contributorIdSet = new Set(contributorIds);
  const contributions: Record<string, number> = {};
  for (const [contributorId, amount] of Object.entries(rawContributions)) {
    if (!contributorIdSet.has(contributorId) && amount !== 0) valid = false;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
      valid = false;
      continue;
    }
    contributions[contributorId] = amount;
  }

  let total = 0;
  for (const contributorId of contributorIds) {
    total += contributions[contributorId] ?? 0;
  }
  if (cost <= 0 || total > cost) valid = false;
  for (const contributor of contributors) {
    if ((contributions[contributor.id] ?? 0) > contributor.resources[resource]) valid = false;
  }
  if (owner && sourceCard?.effects) {
    const space = typeof rawPending.spaceId === "string"
      ? boardSpaces.find((candidate) => candidate.id === rawPending.spaceId)
      : undefined;
    try {
      const sourceCardSupportsPending = resolveAgentPayTeamResourceForVps(sourceCard.effects, {
        trigger: "agent-play",
        source: owner,
        ...(space ? { space } : {}),
        state: game,
      }).some((effect) =>
        effect.selector === "self" &&
        effect.resource === resource &&
        effect.cost === cost &&
        effect.vp === vp &&
        effect.contributors === "self-and-same-team-allies" &&
        effect.recipient === "self" &&
        effect.optional === true &&
        effect.trashSource === (rawPending.trashSource === true) &&
        (effect.source ?? sourceCard.name) === source
      );
      if (!sourceCardSupportsPending) valid = false;
    } catch {
      valid = false;
    }
  }
  const canPay =
    valid &&
    total === cost &&
    Object.entries(contributions).every(
      ([contributorId, amount]) => contributorIds.includes(contributorId) || amount === 0,
    ) &&
    contributors.every((contributor) => (contributions[contributor.id] ?? 0) <= contributor.resources[resource]);

  return { canPay, contributorIds, contributions, contributors: valid ? contributors : [], cost, owner, resource, source, total, valid, vp };
}

type PendingTeamResourcePaymentSectionProps = {
  game: GameState;
  pendingAction: TeamResourcePaymentPendingAction;
  onAdjust: (contributorId: string, delta: number) => void;
  onPay: () => void;
  onSkip: () => void;
};

export function PendingTeamResourcePaymentSection({
  game,
  pendingAction,
  onAdjust,
  onPay,
  onSkip,
}: PendingTeamResourcePaymentSectionProps) {
  const view = teamResourcePaymentViewModel(pendingAction, game);
  return (
    <PendingTeamResourcePaymentPanel
      canPay={view.canPay}
      contributorIds={view.contributorIds}
      contributions={view.contributions}
      contributors={view.contributors}
      cost={view.cost}
      owner={view.valid ? view.owner : undefined}
      resource={view.resource}
      source={view.source}
      total={view.total}
      vp={view.vp}
      onAdjust={onAdjust}
      onPay={onPay}
      onSkip={onSkip}
    />
  );
}
