import {
  resolveRevealRetreatTroops,
  resolveRevealSpyRecallForStrengths,
} from "./effect-resolver";
import {
  leaderRevealEffectSpecs,
} from "./leader-effect-data";
import {
  recallableSpySpaces,
} from "./spy-choices";
import type {
  GameState,
  PendingAction,
  Player,
} from "./types";

function playersWithRevealLeaderEffect(state: GameState, source: Player, target?: Player) {
  return state.players.map((player) => {
    if (player.id === source.id) return source;
    if (target && player.id === target.id) return target;
    return player;
  });
}

function pendingActionsForLeaderSpyRecallStrength(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient) return [];
  if (source.role === "Commander" && (recipient.team !== source.team || recipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && recipient.id !== source.id) return [];
  const effectState = { ...state, players: playersWithRevealLeaderEffect(state, source, recipient) };
  return resolveRevealSpyRecallForStrengths(leaderRevealEffectSpecs, {
    trigger: "reveal",
    source,
    target: recipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.amount <= 0 || effect.strength <= 0) return [];
    const pending: Extract<PendingAction, { kind: "recall-spy" }> = {
      kind: "recall-spy",
      ownerId: source.id,
      combatRecipientId: recipient?.id ?? source.id,
      remaining: effect.amount,
      strength: effect.strength,
      source: effect.source ?? "Leader",
      optional: effect.optional,
    };
    return recallableSpySpaces(effectState, pending).length > 0 ? [pending] : [];
  });
}

function pendingActionsForLeaderRetreatTroops(source: Player, state: GameState): PendingAction[] {
  const effectState = { ...state, players: playersWithRevealLeaderEffect(state, source) };
  return resolveRevealRetreatTroops(leaderRevealEffectSpecs, {
    trigger: "reveal",
    source,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.count !== 1 || !effect.optional || source.deployedTroops < effect.count) {
      return [];
    }
    return [{
      kind: "amber-desert-scouts",
      ownerId: source.id,
      source: effect.source ?? "Leader",
    }];
  });
}

export function pendingActionsForRevealLeaderAbilities(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  return [
    ...pendingActionsForLeaderSpyRecallStrength(source, state, combatRecipientId),
    ...pendingActionsForLeaderRetreatTroops(source, state),
  ];
}
