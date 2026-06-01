import { advancePendingAction } from "./pending-actions";
import { canPay } from "./board-rules";
import { factionLabels } from "./data";
import { adjustInfluenceAndResolveThresholdRewards } from "./leader-rewards";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { GameState, PendingAction, ResourceId } from "./types";

type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;
type OptionalSpacePaymentPendingAction = Extract<PendingAction, { kind: "optional-space-payment" }>;

function resourceLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function formatResourceEntries(resources: Partial<Record<ResourceId, number>>) {
  return Object.entries(resources)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => `${amount} ${resourceLabel(resource as ResourceId)}`)
    .join(", ");
}

export function resolveBoardInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  ownerId: string,
  faction: BoardInfluenceChoicePendingAction["choices"][number]["faction"],
): GameState {
  if (state.pendingAction?.kind !== "board-influence-choice") return state;
  const choice = pending.choices.find((candidate) => candidate.ownerId === ownerId && candidate.faction === faction);
  if (!choice) return state;
  const owner = state.players.find((player) => player.id === choice.ownerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };

  const advancedState = {
    ...state,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} gains 1 ${factionLabels[choice.faction]} Influence from ${pending.source}.`,
      ...state.log,
    ],
  };
  return adjustInfluenceAndResolveThresholdRewards(advancedState, owner.id, choice.faction, 1);
}

export function resolveOptionalSpacePayment(
  state: GameState,
  pending: OptionalSpacePaymentPendingAction,
): GameState {
  if (state.pendingAction?.kind !== "optional-space-payment") return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !canPay(owner, pending.cost)) return state;
  let nextState: GameState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== owner.id) return player;
      const resources = { ...player.resources };
      Object.entries(pending.cost).forEach(([resource, amount]) => {
        resources[resource as ResourceId] -= amount ?? 0;
      });
      Object.entries(pending.gain).forEach(([resource, amount]) => {
        resources[resource as ResourceId] += amount ?? 0;
      });
      return { ...player, resources };
    }),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} pays ${formatResourceEntries(pending.cost)} for ${formatResourceEntries(pending.gain)} at ${pending.source}.`,
      ...state.log,
    ],
  };
  const spiceGain = pending.gain.spice ?? 0;
  if (spiceGain > 0) nextState = recordTurnSpiceGain(nextState, owner.id, spiceGain);
  return nextState;
}

export function skipOptionalSpacePayment(
  state: GameState,
  pending: OptionalSpacePaymentPendingAction,
): GameState {
  if (state.pendingAction?.kind !== "optional-space-payment") return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} skips the optional payment at ${pending.source}.`, ...state.log],
  };
}

export function resolveSecretsIntriguePressure(state: GameState, actorId: string): GameState {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor) return state;
  const opponentsWithIntrigues = state.players.filter(
    (player) => player.team !== actor.team && player.intrigues.length >= 4,
  );
  if (opponentsWithIntrigues.length === 0) return state;

  const transfers = opponentsWithIntrigues.flatMap((opponent) => {
    const intrigueIndex = Math.floor(Math.random() * opponent.intrigues.length);
    const intrigue = opponent.intrigues[intrigueIndex];
    return intrigue ? [{ opponentId: opponent.id, opponentLeader: opponent.leader, intrigue, intrigueIndex }] : [];
  });
  if (transfers.length === 0) return state;

  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === actor.id) {
        return { ...player, intrigues: [...player.intrigues, ...transfers.map(({ intrigue }) => intrigue)] };
      }
      const transfer = transfers.find(({ opponentId }) => opponentId === player.id);
      if (!transfer) return player;
      return { ...player, intrigues: player.intrigues.filter((_, index) => index !== transfer.intrigueIndex) };
    }),
    log: [
      ...transfers.map(({ opponentLeader }) =>
        `${opponentLeader} gives an Intrigue card to ${actor.leader} from Secrets.`,
      ),
      ...state.log,
    ],
  };
}
