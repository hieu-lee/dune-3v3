import {
  combatIntrigueStrength,
  combatIntrigueTargets,
} from "./combat-intrigue-rules";
import {
  isDevourIntrigue,
  isFindWeaknessIntrigue,
  isGoToGroundIntrigue,
  isImpressIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isTacticalOptionIntrigue,
} from "./card-identifiers";
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
  spyPostCount,
} from "./spy-posts";
import {
  trashableCards,
} from "./trash-rules";
import type {
  GameState,
  PendingAction,
} from "./types";

export type SpiceIsPowerChoice = "spend-spice" | "retreat-troops";
export type TacticalOptionChoice = "add-strength" | { kind: "retreat-troops"; count: number };
export type CombatIntrigueChoice = SpiceIsPowerChoice | TacticalOptionChoice;

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type AdvanceAfterCombatIntriguePlay = (state: GameState) => GameState;

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
  if (isImpressIntrigue(intrigue)) {
    const acquirePending: AcquireCardPendingAction = {
      kind: "acquire-card",
      ownerId: target.id,
      source: "Impress",
      maxCost: 3,
      destination: "discard",
    };
    const canAcquire = acquirableCardsForPending(state, acquirePending).length > 0;
    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = { ...next, conflict: next.conflict + 2 };
      }
      return next;
    });
    const acquireText = canAcquire
      ? ` and ${target.leader} must acquire a card that costs 3 or less`
      : ` and ${target.leader} has no eligible card to acquire`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: canAcquire ? acquirePending : undefined,
      log: [
        `${actor.leader} plays Impress for ${target.leader}, adding 2 strength${acquireText}.`,
        ...state.log,
      ],
    });
  }
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
  if (!combatSwords) return state;
  const canTrashFromDevour = isDevourIntrigue(intrigue) && target.deployedSandworms > 0 && trashableCards(target).length > 0;
  const trashPending: PendingAction | undefined = canTrashFromDevour
    ? { kind: "trash-card", ownerId: target.id, source: "Devour", optional: true }
    : undefined;
  const canRecallSpyForFindWeakness = isFindWeaknessIntrigue(intrigue) && spyPostCount(state, actor.id) > 0;
  const recallSpyPending: PendingAction | undefined = canRecallSpyForFindWeakness
    ? {
        kind: "recall-spy",
        ownerId: actor.id,
        combatRecipientId: target.id,
        remaining: 1,
        strength: 3,
        source: "Find Weakness",
        optional: true,
      }
    : undefined;
  const springTheTrapPending: PendingAction | undefined = isSpringTheTrapIntrigue(intrigue)
    ? {
        kind: "recall-spy",
        ownerId: actor.id,
        combatRecipientId: target.id,
        remaining: 2,
        strength: 7,
        source: "Spring The Trap",
        optional: false,
      }
    : undefined;
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
  const immediateCombatSwords = isSpringTheTrapIntrigue(intrigue) ? 0 : combatSwords;

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
  const nextState = {
    ...state,
    players,
    combatPasses: [],
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    pendingAction: trashPending ?? recallSpyPending ?? springTheTrapPending ?? influenceLossPending,
  };
  const pendingText = canTrashFromDevour
    ? " and may trash a card"
    : canRecallSpyForFindWeakness
      ? " and may recall a spy"
      : springTheTrapPending
        ? " and must recall 2 spies"
        : influenceLossPending
          ? " and may lose 1 Influence"
      : "";
  const strengthText = isSpringTheTrapIntrigue(intrigue)
    ? "preparing to add 7 strength"
    : `adding ${combatSwords} strength`;
  return advanceAfterCombatIntriguePlay({
    ...nextState,
    log: [
      `${actor.leader} plays ${intrigue.name} for ${target.leader}, ${strengthText}${pendingText}.`,
      ...state.log,
    ],
  });
}
