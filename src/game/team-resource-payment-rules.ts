import { boardSpaces } from "./data";
import { resolveAgentPayTeamResourceForVps } from "./effect-resolver";
import { advancePendingAction } from "./pending-actions";
import { trashOnePlayAreaCardById } from "./trash-rules";
import type { GameState, PendingAction, Player, ResourceId } from "./types";

type TeamResourcePaymentPendingAction = Extract<PendingAction, { kind: "team-resource-payment" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function paymentAmountIsValid(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function paymentOptionalIsValid(pending: { optional?: unknown }) {
  return pending.optional === true;
}

function paymentTrashSourceIsValid(pending: { cardId?: string; trashSource?: unknown }) {
  if (pending.trashSource !== undefined && typeof pending.trashSource !== "boolean") return false;
  if (pending.trashSource === true && pending.cardId === undefined) return false;
  return true;
}

function paymentSourceIsValid(pending: { source?: unknown }) {
  return typeof pending.source === "string" && pending.source.trim().length > 0;
}

function paymentStringIds(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function paymentContributionsRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function sourceCardSupportsTeamResourcePayment(
  state: GameState,
  pending: TeamResourcePaymentPendingAction,
  owner: Player,
) {
  const sourceCard = owner.playArea.find((card) => card.id === pending.cardId);
  if (!sourceCard?.effects) return false;
  const space = pending.spaceId ? boardSpaces.find((candidate) => candidate.id === pending.spaceId) : undefined;
  return resolveAgentPayTeamResourceForVps(sourceCard.effects, {
    trigger: "agent-play",
    source: owner,
    ...(space ? { space } : {}),
    state,
  }).some((effect) =>
    effect.selector === "self" &&
    effect.resource === pending.resource &&
    effect.cost === pending.cost &&
    effect.vp === pending.vp &&
    effect.contributors === "self-and-same-team-allies" &&
    effect.recipient === "self" &&
    effect.optional === pending.optional &&
    effect.trashSource === (pending.trashSource === true) &&
    (effect.source ?? sourceCard.name) === pending.source
  );
}

function teamResourcePaymentContributors(
  state: GameState,
  pending: TeamResourcePaymentPendingAction,
  owner: Player,
) {
  const contributorIds = paymentStringIds(pending.contributorIds);
  if (contributorIds.length !== 3 || new Set(contributorIds).size !== contributorIds.length) return undefined;
  const contributors = contributorIds.map((contributorId) =>
    state.players.find((player) => player.id === contributorId),
  );
  if (contributors.some((contributor) => !contributor)) return undefined;
  const resolved = contributors as Player[];
  if (resolved[0]?.id !== owner.id) return undefined;
  const allies = resolved.slice(1);
  if (allies.some((ally) => ally.team !== owner.team || ally.role !== "Ally")) return undefined;
  return resolved;
}

function validTeamResourcePaymentChoice(
  state: GameState,
  pending: TeamResourcePaymentPendingAction,
) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const resourceLabel = (resourceLabels as Partial<Record<string, string>>)[pending.resource];
  if (
    !owner ||
    owner.role !== "Commander" ||
    !resourceLabel ||
    !paymentAmountIsValid(pending.cost) ||
    !paymentAmountIsValid(pending.vp) ||
    !paymentOptionalIsValid(pending) ||
    !paymentTrashSourceIsValid(pending) ||
    !paymentSourceIsValid(pending) ||
    !sourceCardSupportsTeamResourcePayment(state, pending, owner)
  ) {
    return undefined;
  }
  const contributors = teamResourcePaymentContributors(state, pending, owner);
  if (!contributors) return undefined;
  return { contributors, owner, resourceLabel };
}

export function teamResourcePaymentContributionTotal(pending: TeamResourcePaymentPendingAction): number {
  const contributions = paymentContributionsRecord(pending.contributions);
  if (!contributions) return 0;
  let total = 0;
  for (const amount of Object.values(contributions)) {
    if (typeof amount === "number" && Number.isFinite(amount)) total += amount;
  }
  return total;
}

function validTeamResourcePaymentContributionTotal(
  pending: TeamResourcePaymentPendingAction,
  contributors: Player[],
) {
  const contributions = paymentContributionsRecord(pending.contributions);
  if (!contributions) return undefined;
  const contributorIds = new Set(pending.contributorIds);
  for (const [contributorId, amount] of Object.entries(contributions)) {
    if (!contributorIds.has(contributorId) && amount !== 0) return undefined;
  }

  let total = 0;
  for (const contributor of contributors) {
    const amount = contributions[contributor.id] ?? 0;
    if (typeof amount !== "number") return undefined;
    if (!Number.isInteger(amount) || amount < 0 || amount > contributor.resources[pending.resource]) return undefined;
    total += amount;
  }
  return total <= pending.cost ? total : undefined;
}

export function adjustTeamResourcePaymentContribution(
  state: GameState,
  pending: TeamResourcePaymentPendingAction,
  contributorId: string,
  delta: number,
): GameState {
  if (state.pendingAction !== pending || !Number.isInteger(delta) || delta === 0) return state;
  const choice = validTeamResourcePaymentChoice(state, pending);
  if (!choice || !pending.contributorIds.includes(contributorId)) return state;
  const { contributors } = choice;
  const contributor = contributors.find((player) => player.id === contributorId);
  if (!contributor) return state;

  const currentTotal = validTeamResourcePaymentContributionTotal(pending, contributors);
  if (currentTotal === undefined) return state;
  const currentAmount = pending.contributions[contributorId] ?? 0;
  const nextAmount = currentAmount + delta;
  const nextTotal = currentTotal + delta;
  if (nextAmount < 0 || nextAmount > contributor.resources[pending.resource] || nextTotal < 0 || nextTotal > pending.cost) {
    return state;
  }

  return {
    ...state,
    pendingAction: {
      ...pending,
      contributions: { ...pending.contributions, [contributorId]: nextAmount },
    },
  };
}

export function resolveTeamResourcePaymentChoice(
  state: GameState,
  pending: TeamResourcePaymentPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const choice = validTeamResourcePaymentChoice(state, pending);
  if (!choice) return state;
  const { contributors, owner, resourceLabel } = choice;
  const total = validTeamResourcePaymentContributionTotal(pending, contributors);
  if (total !== pending.cost) return state;

  const players = state.players.map((player) => {
    const contribution = pending.contributions[player.id] ?? 0;
    let next = contribution > 0
      ? {
          ...player,
          resources: { ...player.resources, [pending.resource]: player.resources[pending.resource] - contribution },
        }
      : player;
    if (player.id === owner.id) {
      next = {
        ...(pending.trashSource ? trashOnePlayAreaCardById(next, pending.cardId) : next),
        vp: next.vp + pending.vp,
      };
    }
    return next;
  });
  const contributionSummary = contributors
    .filter((contributor) => (pending.contributions[contributor.id] ?? 0) > 0)
    .map((contributor) => `${contributor.leader} ${pending.contributions[contributor.id]} ${resourceLabel}`)
    .join(", ");

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: pays ${pending.cost} ${resourceLabel} (${contributionSummary}), gains ${pending.vp} VP${pending.trashSource ? ", and trashes the card" : ""}.`,
      ...state.log,
    ],
  };
}

export function skipTeamResourcePayment(state: GameState, pending: TeamResourcePaymentPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const choice = validTeamResourcePaymentChoice(state, pending);
  if (!choice) return state;
  const { contributors, owner, resourceLabel } = choice;
  if (validTeamResourcePaymentContributionTotal(pending, contributors) === undefined) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay ${pending.cost} ${resourceLabel} for ${pending.source}.`, ...state.log],
  };
}
