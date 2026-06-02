import {
  combatIntrigueStrength,
  combatIntrigueTargets,
} from "./combat-intrigue-rules";
import {
  isGoToGroundIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isSpiceIsPowerIntrigue,
  isTacticalOptionIntrigue,
} from "./card-identifiers";
import {
  resolveAcquireCards,
  resolveCombatSpyRecallForStrengths,
  resolveTrashCardEffects,
  type AgentAcquireCard,
  type CombatSpyRecallForStrength,
  type TrashCardEffect,
} from "./effect-resolver";
import {
  allowedInfluenceLossChoices,
} from "./influence-loss-rules";
import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  placeableSpySpaces,
} from "./spy-choices";
import {
  trashableCardsForPending,
} from "./trash-rules";
import type {
  GameState,
  IntrigueCard,
  PendingAction,
  Player,
} from "./types";

export type SpiceIsPowerChoice = "spend-spice" | "retreat-troops";
export type TacticalOptionChoice = "add-strength" | { kind: "retreat-troops"; count: number };
export type CombatIntrigueChoice = SpiceIsPowerChoice | TacticalOptionChoice;

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;
type AdvanceAfterCombatIntriguePlay = (state: GameState) => GameState;

function acquirePendingForCombatEffect(
  intrigue: IntrigueCard,
  target: Player,
  effect: AgentAcquireCard,
): AcquireCardPendingAction | undefined {
  const base = {
    kind: "acquire-card" as const,
    ownerId: target.id,
    source: effect.source ?? intrigue.name,
    destination: effect.destination,
    ...(effect.minCost !== undefined ? { minCost: effect.minCost } : {}),
    ...(effect.optional ? { optional: true } : {}),
  };
  if (effect.paymentResource !== undefined) {
    return {
      ...base,
      ...(effect.maxCost !== undefined ? { maxCost: effect.maxCost } : {}),
      paymentResource: effect.paymentResource,
    };
  }
  if (effect.maxCost !== undefined) {
    return {
      ...base,
      maxCost: effect.maxCost,
    };
  }
  return undefined;
}

function combatAcquireCardDescription(pending: AcquireCardPendingAction) {
  const costText = pending.minCost !== undefined && pending.maxCost !== undefined
    ? pending.minCost === pending.maxCost
      ? ` that costs ${pending.maxCost}`
      : ` that costs ${pending.minCost} to ${pending.maxCost}`
    : pending.maxCost !== undefined
      ? ` that costs ${pending.maxCost} or less`
      : pending.minCost !== undefined
        ? ` that costs at least ${pending.minCost}`
        : "";
  const paymentText = pending.paymentResource ? ` with ${pending.paymentResource}` : "";
  return `a card${costText}${paymentText}`;
}

function resolveCombatAcquirePendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
) {
  const effects = resolveAcquireCards(intrigue.effects, {
    trigger: "combat-intrigue",
    source: actor,
    target,
    state,
  });
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue acquire-card effects");
  return effects.reduce<{ pendingActions: AcquireCardPendingAction[]; logTexts: string[] }>((result, effect) => {
    const pending = acquirePendingForCombatEffect(intrigue, target, effect);
    if (!pending) return result;
    const canAcquire = acquirableCardsForPending(state, pending).length > 0;
    return {
      pendingActions: canAcquire ? [...result.pendingActions, pending] : result.pendingActions,
      logTexts: [
        ...result.logTexts,
        canAcquire
          ? `${target.leader} ${pending.optional ? "may" : "must"} acquire ${combatAcquireCardDescription(pending)}`
          : `${target.leader} has no eligible card to acquire`,
      ],
    };
  }, { pendingActions: [], logTexts: [] });
}

function recallSpyPendingForCombatEffect(
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  effect: CombatSpyRecallForStrength,
): RecallSpyPendingAction | undefined {
  if (effect.amount <= 0 || effect.strength <= 0) return undefined;
  return {
    kind: "recall-spy",
    ownerId: actor.id,
    combatRecipientId: target.id,
    remaining: effect.amount,
    strength: effect.strength,
    source: effect.source ?? intrigue.name,
    optional: effect.optional,
  };
}

function combatSpyRecallDescription(pending: RecallSpyPendingAction) {
  const countText = pending.remaining === 1 ? "a spy" : `${pending.remaining} spies`;
  return `${pending.optional ? "may" : "must"} recall ${countText}`;
}

function resolveCombatSpyRecallPendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
) {
  const effects = resolveCombatSpyRecallForStrengths(intrigue.effects, {
    trigger: "combat-intrigue",
    source: actor,
    target,
    state,
  });
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue recall-spy effects");
  return effects.reduce<{ pendingActions: RecallSpyPendingAction[]; logTexts: string[] }>((result, effect) => {
    const pending = recallSpyPendingForCombatEffect(intrigue, actor, target, effect);
    if (!pending) return result;
    return {
      pendingActions: [...result.pendingActions, pending],
      logTexts: [...result.logTexts, combatSpyRecallDescription(pending)],
    };
  }, { pendingActions: [], logTexts: [] });
}

function trashCardPendingForCombatEffect(
  intrigue: IntrigueCard,
  target: Player,
  effect: TrashCardEffect,
): TrashCardPendingAction | undefined {
  if (effect.selector !== "self") return undefined;
  return {
    kind: "trash-card",
    ownerId: target.id,
    source: intrigue.name,
    optional: effect.optional,
    ...(effect.zones ? { zones: effect.zones } : {}),
    ...(effect.excludeSource ? { excludeCardId: intrigue.id } : {}),
    ...(effect.requiredTrait ? { requiredTrait: effect.requiredTrait } : {}),
  };
}

function combatTrashDescription(pending: TrashCardPendingAction) {
  return `${pending.optional ? "may" : "must"} trash a card`;
}

function resolveCombatTrashPendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
) {
  const effects = resolveTrashCardEffects(intrigue.effects, {
    trigger: "combat-intrigue",
    source: actor,
    target,
    state,
  });
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue trash-card effects");
  return effects.reduce<{ pendingActions: TrashCardPendingAction[]; logTexts: string[] }>((result, effect) => {
    const pending = trashCardPendingForCombatEffect(intrigue, target, effect);
    if (!pending) return result;
    const canTrash = trashableCardsForPending(target, pending).length > 0;
    return {
      pendingActions: canTrash ? [...result.pendingActions, pending] : result.pendingActions,
      logTexts: canTrash ? [...result.logTexts, combatTrashDescription(pending)] : result.logTexts,
    };
  }, { pendingActions: [], logTexts: [] });
}

export function resolvePlayCombatIntrigue(
  state: GameState,
  actorId: string,
  intrigueId: string,
  targetId: string | undefined,
  combatChoice: CombatIntrigueChoice | undefined,
  advanceAfterCombatIntriguePlay: AdvanceAfterCombatIntriguePlay,
): GameState {
  if (state.phase !== "combat" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const actor = state.players[state.activeSeat];
  if (!actor || actor.id !== actorId) return state;
  const intrigue = actor.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue) return state;
  const targets = combatIntrigueTargets(state, actor.id);
  if (actor.role === "Commander" && !targetId) return state;
  const resolvedTargetId = targetId ?? targets[0];
  if (!resolvedTargetId || !targets.includes(resolvedTargetId)) return state;
  const target = state.players.find((player) => player.id === resolvedTargetId);
  if (!target) return state;
  if (isGoToGroundIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    if (
      !Number.isInteger(retreatCount) ||
      (retreatCount ?? 0) < 1 ||
      (retreatCount ?? 0) > 2 ||
      (retreatCount ?? 0) > target.deployedTroops
    ) return state;
    const count = retreatCount ?? 0;
    const spyPending: SpyPendingAction = { kind: "spy", ownerId: target.id, remaining: 1, source: "Go To Ground" };
    const canPlaceSpy = placeableSpySpaces(state, spyPending).length > 0;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - count * 2),
          deployedTroops: next.deployedTroops - count,
          garrison: next.garrison + count,
        };
      }
      return next;
    });
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: canPlaceSpy ? spyPending : undefined,
      log: [
        `${actor.leader} plays Go To Ground for ${target.leader}; ${target.leader} retreats ${count} ${count === 1 ? "troop" : "troops"}${canPlaceSpy ? " and may place a spy" : ""}.`,
        ...state.log,
      ],
    });
  }
  if (isSpiceIsPowerIntrigue(intrigue)) {
    if (combatChoice !== "spend-spice" && combatChoice !== "retreat-troops") return state;
    if (combatChoice === "spend-spice" && target.resources.spice < 3) return state;
    if (combatChoice === "retreat-troops" && target.deployedTroops < 3) return state;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id && combatChoice === "spend-spice") {
        next = {
          ...next,
          conflict: next.conflict + 6,
          resources: { ...next.resources, spice: next.resources.spice - 3 },
        };
      }
      if (player.id === target.id && combatChoice === "retreat-troops") {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - 6),
          deployedTroops: next.deployedTroops - 3,
          garrison: next.garrison + 3,
          resources: { ...next.resources, spice: next.resources.spice + 3 },
        };
      }
      return next;
    });
    const logEntry = combatChoice === "spend-spice"
      ? `${actor.leader} plays Spice is Power for ${target.leader}; ${target.leader} spends 3 spice to add 6 strength.`
      : `${actor.leader} plays Spice is Power for ${target.leader}; ${target.leader} retreats 3 troops and gains 3 spice.`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [logEntry, ...state.log],
    });
  }
  if (isTacticalOptionIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    const addsStrength = combatChoice === "add-strength";
    if (!addsStrength && !retreatCount) return state;
    if (
      retreatCount !== undefined &&
      (!Number.isInteger(retreatCount) || retreatCount < 1 || retreatCount > target.deployedTroops)
    ) return state;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id && addsStrength) {
        next = { ...next, conflict: next.conflict + 2 };
      }
      if (player.id === target.id && retreatCount !== undefined) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - retreatCount * 2),
          deployedTroops: next.deployedTroops - retreatCount,
          garrison: next.garrison + retreatCount,
        };
      }
      return next;
    });
    const logEntry = addsStrength
      ? `${actor.leader} plays Tactical Option for ${target.leader}, adding 2 strength.`
      : `${actor.leader} plays Tactical Option for ${target.leader}; ${target.leader} retreats ${retreatCount} ${retreatCount === 1 ? "troop" : "troops"}.`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [logEntry, ...state.log],
    });
  }
  if (isReachAgreementIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    if (
      !Number.isInteger(retreatCount) ||
      (retreatCount ?? 0) < 1 ||
      (retreatCount ?? 0) > 2 ||
      (retreatCount ?? 0) > target.deployedTroops
    ) return state;
    const count = retreatCount ?? 0;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - count * 2),
          deployedTroops: next.deployedTroops - count,
          garrison: next.garrison + count,
        };
      }
      return next;
    });
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: { kind: "contract", ownerId: target.id, source: "Reach Agreement" },
      log: [
        `${actor.leader} plays Reach Agreement for ${target.leader}; ${target.leader} retreats ${count} ${count === 1 ? "troop" : "troops"} and takes a CHOAM contract.`,
        ...state.log,
      ],
    });
  }
  const combatSwords = combatIntrigueStrength(state, actor, intrigue, target);
  const combatAcquire = resolveCombatAcquirePendingActions(state, intrigue, actor, target);
  const combatSpyRecall = resolveCombatSpyRecallPendingActions(state, intrigue, actor, target);
  const combatTrash = resolveCombatTrashPendingActions(state, intrigue, actor, target);
  if (
    !combatSwords &&
    combatAcquire.logTexts.length === 0 &&
    combatSpyRecall.logTexts.length === 0 &&
    combatTrash.logTexts.length === 0
  ) return state;
  const alternateInfluenceLossOwnerIds =
    actor.role === "Commander" && allowedInfluenceLossChoices(actor).length > 0 ? [actor.id] : undefined;
  const canLoseInfluenceForQuestionableMethods =
    isQuestionableMethodsIntrigue(intrigue)
    && (allowedInfluenceLossChoices(target).length > 0 || Boolean(alternateInfluenceLossOwnerIds));
  const influenceLossPending: PendingAction | undefined = canLoseInfluenceForQuestionableMethods
    ? {
        kind: "lose-influence",
        ownerId: target.id,
        ...(alternateInfluenceLossOwnerIds ? { alternateOwnerIds: alternateInfluenceLossOwnerIds } : {}),
        combatRecipientId: target.id,
        strength: 4,
        source: "Questionable Methods",
        optional: true,
      }
    : undefined;
  const requiredSpyRecallStrength = combatSpyRecall.pendingActions
    .filter((pending) => !pending.optional)
    .reduce((total, pending) => total + pending.strength, 0);
  const immediateCombatSwords = requiredSpyRecallStrength > 0 && requiredSpyRecallStrength === combatSwords
    ? 0
    : (combatSwords ?? 0);

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === actor.id) {
      next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
    }
    if (immediateCombatSwords > 0 && player.id === target.id) {
      next = { ...next, conflict: next.conflict + immediateCombatSwords };
    }
    return next;
  });
  const pendingActions: PendingAction[] = [];
  const cardSpecificPending = influenceLossPending;
  if (cardSpecificPending) pendingActions.push(cardSpecificPending);
  pendingActions.push(...combatTrash.pendingActions);
  pendingActions.push(...combatSpyRecall.pendingActions);
  pendingActions.push(...combatAcquire.pendingActions);
  const nextState = {
    ...state,
    players,
    combatPasses: [],
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    pendingAction: pendingActions[0],
    pendingQueue: pendingActions.slice(1),
  };
  const pendingText = influenceLossPending
      ? " and may lose 1 Influence"
      : "";
  const trashText = combatTrash.logTexts.length > 0 ? ` and ${combatTrash.logTexts.join(" and ")}` : "";
  const spyRecallText = combatSpyRecall.logTexts.length > 0 ? ` and ${combatSpyRecall.logTexts.join(" and ")}` : "";
  const acquireText = combatAcquire.logTexts.length > 0 ? ` and ${combatAcquire.logTexts.join(" and ")}` : "";
  const strengthText = immediateCombatSwords === 0 && requiredSpyRecallStrength > 0
    ? `preparing to add ${requiredSpyRecallStrength} strength`
    : combatSwords
      ? `adding ${combatSwords} strength`
      : "resolving its effect";
  return advanceAfterCombatIntriguePlay({
    ...nextState,
    log: [
      `${actor.leader} plays ${intrigue.name} for ${target.leader}, ${strengthText}${pendingText}${trashText}${spyRecallText}${acquireText}.`,
      ...state.log,
    ],
  });
}
