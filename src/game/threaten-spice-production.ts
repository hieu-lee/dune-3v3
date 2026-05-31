import { isThreatenSpiceProductionCommanderCard } from "./card-identifiers";
import { advancePendingAction } from "./pending-actions";
import type { GameState, PendingAction, Player } from "./types";

export const threatenSpiceProductionCost = 7;

type ThreatenSpiceProductionPendingAction = Extract<PendingAction, { kind: "threaten-spice-production" }>;

export function threatenSpiceProductionContributionTotal(pending: ThreatenSpiceProductionPendingAction) {
  return Object.values(pending.contributions).reduce((sum, amount) => sum + amount, 0);
}

function threatenSpiceProductionContributors(
  state: GameState,
  pending: ThreatenSpiceProductionPendingAction,
  commander: Player,
) {
  if (new Set(pending.contributorIds).size !== pending.contributorIds.length) return undefined;
  const contributors = pending.contributorIds.map((contributorId) =>
    state.players.find((player) => player.id === contributorId),
  );
  if (contributors.some((contributor) => !contributor)) return undefined;
  const resolved = contributors as Player[];
  if (resolved[0]?.id !== commander.id) return undefined;
  const allies = resolved.slice(1);
  if (allies.length < 2) return undefined;
  if (allies.some((ally) => ally.team !== commander.team || ally.role !== "Ally")) return undefined;
  return resolved;
}

function validThreatenSpiceProductionContributionTotal(
  pending: ThreatenSpiceProductionPendingAction,
  contributors: Player[],
) {
  const contributorIds = new Set(pending.contributorIds);
  for (const [contributorId, amount] of Object.entries(pending.contributions)) {
    if (!contributorIds.has(contributorId) && amount !== 0) return undefined;
  }

  let total = 0;
  for (const contributor of contributors) {
    const amount = pending.contributions[contributor.id] ?? 0;
    if (!Number.isInteger(amount) || amount < 0 || amount > contributor.resources.spice) return undefined;
    total += amount;
  }
  return total;
}

export function adjustThreatenSpiceProductionContribution(
  state: GameState,
  pending: ThreatenSpiceProductionPendingAction,
  contributorId: string,
  delta: number,
): GameState {
  if (state.pendingAction !== pending || !Number.isInteger(delta) || delta === 0) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    !commander.playArea.some((card) => card.id === pending.cardId && isThreatenSpiceProductionCommanderCard(card)) ||
    !pending.contributorIds.includes(contributorId)
  ) {
    return state;
  }

  const contributors = threatenSpiceProductionContributors(state, pending, commander);
  if (!contributors) return state;
  const contributor = contributors.find((player) => player.id === contributorId);
  if (!contributor) return state;

  const currentTotal = validThreatenSpiceProductionContributionTotal(pending, contributors);
  if (currentTotal === undefined) return state;
  const currentAmount = pending.contributions[contributorId] ?? 0;
  const nextAmount = currentAmount + delta;
  const nextTotal = currentTotal + delta;
  if (nextAmount < 0 || nextAmount > contributor.resources.spice || nextTotal < 0 || nextTotal > pending.cost) {
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

export function resolveThreatenSpiceProductionChoice(
  state: GameState,
  pending: ThreatenSpiceProductionPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    pending.cost !== threatenSpiceProductionCost ||
    !commander.playArea.some((card) => card.id === pending.cardId && isThreatenSpiceProductionCommanderCard(card))
  ) {
    return state;
  }

  const contributors = threatenSpiceProductionContributors(state, pending, commander);
  if (!contributors) return state;
  const total = validThreatenSpiceProductionContributionTotal(pending, contributors);
  if (total !== pending.cost) return state;

  const players = state.players.map((player) => {
    const contribution = pending.contributions[player.id] ?? 0;
    let next = contribution > 0
      ? {
          ...player,
          resources: { ...player.resources, spice: player.resources.spice - contribution },
        }
      : player;
    if (player.id === commander.id) {
      next = {
        ...next,
        vp: next.vp + 1,
        playArea: next.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    return next;
  });
  const contributionSummary = contributors
    .filter((contributor) => (pending.contributions[contributor.id] ?? 0) > 0)
    .map((contributor) => `${contributor.leader} ${pending.contributions[contributor.id]} spice`)
    .join(", ");

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} resolves ${pending.source}: pays ${pending.cost} spice (${contributionSummary}), gains 1 VP, and trashes the card.`,
      ...state.log,
    ],
  };
}

export function skipThreatenSpiceProduction(state: GameState, pending: ThreatenSpiceProductionPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} declines to pay 7 spice for ${pending.source}.`, ...state.log],
  };
}
