import { effectiveRequirementInfluence } from "./board-rules";
import {
  isBackedByChoamIntrigue,
  isQuestionableMethodsIntrigue,
  isSpiceIsPowerIntrigue,
  isTacticalOptionIntrigue,
  isWeirdingCombatIntrigue,
} from "./card-identifiers";
import { playerHasConflictUnits } from "./conflict-rules";
import { resolveCombatSpyRecallForStrengths, resolveGameEffects } from "./effect-resolver";
import type { GameState, IntrigueCard, Player } from "./types";

function allyHasUnitsInConflict(player: Player) {
  return player.role === "Ally" && playerHasConflictUnits(player);
}

function commanderHasCombatAlly(state: GameState, commander: Player) {
  return state.players.some(
    (player) => player.team === commander.team && allyHasUnitsInConflict(player),
  );
}

function canActInCombat(state: GameState, player: Player) {
  if (!state.conflict) return false;
  if (allyHasUnitsInConflict(player)) return true;
  return player.role === "Commander" && commanderHasCombatAlly(state, player);
}

export function combatIntrigueActorIds(state: GameState) {
  if (!state.conflict) return [];
  return state.players.filter((player) => canActInCombat(state, player)).map((player) => player.id);
}

export function combatIntrigueStrength(
  state: GameState,
  actor: Player,
  intrigue: IntrigueCard,
  target?: Player,
) {
  const resolved = resolveGameEffects(intrigue.effects, {
    trigger: "combat-intrigue",
    source: actor,
    target,
    state,
  });
  if (resolved.swords > 0) return resolved.swords;
  const mandatoryRecallStrength = resolveCombatSpyRecallForStrengths(intrigue.effects, {
    trigger: "combat-intrigue",
    source: actor,
    target,
    state,
  })
    .filter((effect) => !effect.optional)
    .reduce((total, effect) => total + effect.strength, 0);
  if (mandatoryRecallStrength > 0) return mandatoryRecallStrength;
  if (intrigue.automatedCombatSwords) return intrigue.automatedCombatSwords;
  if (isQuestionableMethodsIntrigue(intrigue)) return 1;
  if (isSpiceIsPowerIntrigue(intrigue)) {
    const effectOwner = actor.role === "Commander" ? target : actor;
    return effectOwner && effectOwner.resources.spice >= 3 ? 6 : undefined;
  }
  if (isTacticalOptionIntrigue(intrigue)) return 2;
  if (isWeirdingCombatIntrigue(intrigue)) {
    return effectiveRequirementInfluence(actor, "bene", state.players) >= 3 ? 5 : 3;
  }
  if (isBackedByChoamIntrigue(intrigue)) {
    return actor.contracts.filter((contract) => contract.completed).length >= 2 ? 4 : undefined;
  }
  return undefined;
}

export function combatIntrigueTargets(state: GameState, actorId: string) {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor || !canActInCombat(state, actor)) return [];
  if (actor.role === "Ally") return allyHasUnitsInConflict(actor) ? [actor.id] : [];
  return state.players
    .filter((player) => player.team === actor.team && allyHasUnitsInConflict(player))
    .map((player) => player.id);
}

export function firstCombatSeat(state: GameState, actorIds: string[]) {
  for (let offset = 0; offset < state.players.length; offset += 1) {
    const seat = (state.firstSeat + offset) % state.players.length;
    if (actorIds.includes(state.players[seat].id)) return seat;
  }
  return state.activeSeat;
}

export function nextCombatSeat(state: GameState, actorIds: string[]) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const seat = (state.activeSeat + offset) % state.players.length;
    if (actorIds.includes(state.players[seat].id)) return seat;
  }
  return state.activeSeat;
}
