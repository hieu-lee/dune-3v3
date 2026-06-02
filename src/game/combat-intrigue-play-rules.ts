import {
  combatIntrigueStrength,
  combatIntrigueTargets,
} from "./combat-intrigue-rules";
import {
  isTacticalOptionIntrigue,
} from "./card-identifiers";
import {
  resolveAcquireCards,
  resolveCombatInfluenceLossForStrengths,
  resolveCombatRetreatTroops,
  resolveCombatSpyRecallForStrengths,
  resolveGameEffects,
  resolveTakeContracts,
  resolveTrashCardEffects,
  type AgentAcquireCard,
  type CombatInfluenceLossForStrength,
  type CombatRetreatTroops,
  type CombatSpyRecallForStrength,
  type TakeContractsEffect,
  type TrashCardEffect,
} from "./effect-resolver";
import {
  allowedInfluenceLossChoices,
} from "./influence-loss-rules";
import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  trashableCardsForPending,
} from "./trash-rules";
import { pendingActionForSpyPlacements } from "./spy-effect-pending-rules";
import type {
  GameState,
  IntrigueCard,
  PendingAction,
  Player,
  ResourceId,
  Resources,
} from "./types";

type SelectedRetreatTroopsChoice = { kind: "retreat-troops"; count: number };
export type SpiceIsPowerChoice = "spend-spice" | SelectedRetreatTroopsChoice;
export type TacticalOptionChoice = "add-strength" | SelectedRetreatTroopsChoice;
export type CombatIntrigueChoice = SpiceIsPowerChoice | TacticalOptionChoice;

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type LoseInfluencePendingAction = Extract<PendingAction, { kind: "lose-influence" }>;
type RecallSpyPendingAction = Extract<PendingAction, { kind: "recall-spy" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;
type AdvanceAfterCombatIntriguePlay = (state: GameState) => GameState;
type ResourceAdjustment = { resource: ResourceId; amount: number };

function combatChoiceIdFor(choice: CombatIntrigueChoice | undefined) {
  if (choice === "add-strength" || choice === "spend-spice") return choice;
  if (typeof choice === "object" && choice.kind === "retreat-troops") return "retreat-troops";
  return undefined;
}

function selectedTroopCountFor(choice: CombatIntrigueChoice | undefined) {
  return typeof choice === "object" && choice.kind === "retreat-troops" ? choice.count : undefined;
}

function selectedRetreatChoiceRequested(choice: CombatIntrigueChoice | undefined) {
  return typeof choice === "object" && choice.kind === "retreat-troops";
}

function combatEffectContext(
  state: GameState,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  return {
    trigger: "combat-intrigue" as const,
    choiceId: combatChoiceIdFor(combatChoice),
    selectedTroopCount: selectedTroopCountFor(combatChoice),
    source: actor,
    target,
    state,
  };
}

function resourceAdjustments(resources: Partial<Resources>): ResourceAdjustment[] {
  return (Object.entries(resources) as Array<[ResourceId, number | undefined]>)
    .filter((entry): entry is [ResourceId, number] => (entry[1] ?? 0) > 0)
    .map(([resource, amount]) => ({ resource, amount }));
}

function formatResourceAdjustments(adjustments: ResourceAdjustment[]) {
  return adjustments.map(({ amount, resource }) => `${amount} ${resource}`).join(" and ");
}

function canSpendResourceAdjustments(player: Player, adjustments: ResourceAdjustment[]) {
  return adjustments.every(({ resource, amount }) => player.resources[resource] >= amount);
}

function applyResourceAdjustments(player: Player, spends: ResourceAdjustment[], gains: ResourceAdjustment[]) {
  if (spends.length === 0 && gains.length === 0) return player;
  const resources = { ...player.resources };
  spends.forEach(({ resource, amount }) => {
    resources[resource] -= amount;
  });
  gains.forEach(({ resource, amount }) => {
    resources[resource] += amount;
  });
  return { ...player, resources };
}

function resolveCombatResourceAdjustments(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const resolved = resolveGameEffects(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
  return {
    spends: resourceAdjustments(resolved.spentResources),
    gains: resourceAdjustments(resolved.revealGain),
  };
}

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
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveAcquireCards(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
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
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveCombatSpyRecallForStrengths(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
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

function influenceLossPendingForCombatEffect(
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  effect: CombatInfluenceLossForStrength,
): LoseInfluencePendingAction | undefined {
  if (
    effect.selector !== "self" ||
    effect.amount !== 1 ||
    effect.strength <= 0 ||
    effect.owner !== "combat-recipient"
  ) return undefined;
  const alternateOwnerIds =
    effect.alternateOwner === "source-commander-personal" &&
    actor.role === "Commander" &&
    allowedInfluenceLossChoices(actor).length > 0
      ? [actor.id]
      : undefined;
  const targetCanLoseInfluence = allowedInfluenceLossChoices(target).length > 0;
  if (!targetCanLoseInfluence && !alternateOwnerIds) return undefined;
  return {
    kind: "lose-influence",
    ownerId: target.id,
    ...(alternateOwnerIds ? { alternateOwnerIds } : {}),
    combatRecipientId: target.id,
    strength: effect.strength,
    source: effect.source ?? intrigue.name,
    optional: effect.optional,
  };
}

function combatInfluenceLossDescription(pending: LoseInfluencePendingAction) {
  return `${pending.optional ? "may" : "must"} lose 1 Influence`;
}

function resolveCombatInfluenceLossPendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveCombatInfluenceLossForStrengths(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue lose-influence-for-strength effects");
  return effects.reduce<{ pendingActions: LoseInfluencePendingAction[]; logTexts: string[] }>((result, effect) => {
    const pending = influenceLossPendingForCombatEffect(intrigue, actor, target, effect);
    if (!pending) return result;
    return {
      pendingActions: [...result.pendingActions, pending],
      logTexts: [...result.logTexts, combatInfluenceLossDescription(pending)],
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
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveTrashCardEffects(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
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

function resolveCombatRetreatActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveCombatRetreatTroops(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue retreat-troops effects");
  return effects.reduce<{ retreats: CombatRetreatTroops[]; logTexts: string[] }>((result, effect) => {
    if (effect.selector !== "self") return result;
    return {
      retreats: [...result.retreats, effect],
      logTexts: [
        ...result.logTexts,
        `${target.leader} retreats ${effect.count} ${effect.count === 1 ? "troop" : "troops"}`,
      ],
    };
  }, { retreats: [], logTexts: [] });
}

function contractPendingForCombatEffect(
  intrigue: IntrigueCard,
  target: Player,
  effect: TakeContractsEffect,
): ContractPendingAction | undefined {
  if (effect.selector !== "self" || effect.sourcePool !== "public-offer") return undefined;
  if (effect.amount !== 1) throw new Error(`Unsupported Combat Intrigue contract amount ${effect.amount}`);
  return {
    kind: "contract",
    ownerId: target.id,
    source: effect.source ?? intrigue.name,
    publicOnly: true,
    allowFallback: true,
    ...(effect.optional ? { optional: true } : {}),
  };
}

function combatContractDescription(pending: ContractPendingAction) {
  return pending.optional ? "may take a CHOAM contract" : "takes a CHOAM contract";
}

function resolveCombatContractPendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const effects = resolveTakeContracts(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
  if (effects.length > 1) throw new Error("Unsupported multiple Combat Intrigue take-contracts effects");
  return effects.reduce<{ pendingActions: ContractPendingAction[]; logTexts: string[] }>((result, effect) => {
    const pending = contractPendingForCombatEffect(intrigue, target, effect);
    if (!pending) return result;
    return {
      pendingActions: [...result.pendingActions, pending],
      logTexts: [...result.logTexts, combatContractDescription(pending)],
    };
  }, { pendingActions: [], logTexts: [] });
}

function combatSpyPlacementDescription(pending: SpyPendingAction) {
  return pending.mustPlaceSpy ? "must place a spy" : "may place a spy";
}

function resolveCombatSpyPlacementPendingActions(
  state: GameState,
  intrigue: IntrigueCard,
  actor: Player,
  target: Player,
  combatChoice: CombatIntrigueChoice | undefined,
) {
  const resolved = resolveGameEffects(intrigue.effects, combatEffectContext(state, actor, target, combatChoice));
  if (resolved.activatedAlly.spyPlacements.length > 0) {
    throw new Error(`Unsupported activated Ally Combat Intrigue spy placement for ${intrigue.name}`);
  }
  const pending = pendingActionForSpyPlacements(intrigue.name, target, resolved.spyPlacements, state);
  if (!pending) return { pendingActions: [], logTexts: [] };
  if (pending.kind !== "spy") throw new Error(`Unsupported Combat Intrigue spy placement pending action for ${intrigue.name}`);
  return {
    pendingActions: [pending],
    logTexts: [combatSpyPlacementDescription(pending)],
  };
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
  const combatSwords = combatIntrigueStrength(state, actor, intrigue, target, combatChoiceIdFor(combatChoice));
  const combatRetreat = resolveCombatRetreatActions(state, intrigue, actor, target, combatChoice);
  const combatAcquire = resolveCombatAcquirePendingActions(state, intrigue, actor, target, combatChoice);
  const combatInfluenceLoss = resolveCombatInfluenceLossPendingActions(state, intrigue, actor, target, combatChoice);
  const combatContract = resolveCombatContractPendingActions(state, intrigue, actor, target, combatChoice);
  const combatSpyPlacement = resolveCombatSpyPlacementPendingActions(state, intrigue, actor, target, combatChoice);
  const combatSpyRecall = resolveCombatSpyRecallPendingActions(state, intrigue, actor, target, combatChoice);
  const combatTrash = resolveCombatTrashPendingActions(state, intrigue, actor, target, combatChoice);
  const combatResources = resolveCombatResourceAdjustments(state, intrigue, actor, target, combatChoice);
  if (selectedRetreatChoiceRequested(combatChoice) && combatRetreat.retreats.length === 0) return state;
  if (combatRetreat.retreats.some((retreat) => retreat.count <= 0 || retreat.count > target.deployedTroops)) return state;
  if (!canSpendResourceAdjustments(target, combatResources.spends)) return state;
  if (
    !combatSwords &&
    combatResources.spends.length === 0 &&
    combatResources.gains.length === 0 &&
    combatRetreat.logTexts.length === 0 &&
    combatAcquire.logTexts.length === 0 &&
    combatInfluenceLoss.logTexts.length === 0 &&
    combatContract.logTexts.length === 0 &&
    combatSpyPlacement.logTexts.length === 0 &&
    combatSpyRecall.logTexts.length === 0 &&
    combatTrash.logTexts.length === 0
  ) return state;
  const requiredSpyRecallStrength = combatSpyRecall.pendingActions
    .filter((pending) => !pending.optional)
    .reduce((total, pending) => total + pending.strength, 0);
  const immediateCombatSwords = requiredSpyRecallStrength > 0 && requiredSpyRecallStrength === combatSwords
    ? 0
    : (combatSwords ?? 0);
  const immediateRetreat = combatRetreat.retreats[0];

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === actor.id) {
      next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
    }
    if (immediateCombatSwords > 0 && player.id === target.id) {
      next = { ...next, conflict: next.conflict + immediateCombatSwords };
    }
    if (immediateRetreat && player.id === target.id) {
      next = {
        ...next,
        conflict: Math.max(0, next.conflict - immediateRetreat.count * 2),
        deployedTroops: next.deployedTroops - immediateRetreat.count,
        garrison: next.garrison + immediateRetreat.count,
      };
    }
    if (player.id === target.id) {
      next = applyResourceAdjustments(next, combatResources.spends, combatResources.gains);
    }
    return next;
  });
  const pendingActions: PendingAction[] = [];
  pendingActions.push(...combatInfluenceLoss.pendingActions);
  pendingActions.push(...combatContract.pendingActions);
  pendingActions.push(...combatTrash.pendingActions);
  pendingActions.push(...combatSpyPlacement.pendingActions);
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
  const effectTexts = [
    ...(combatResources.spends.length > 0 && immediateCombatSwords > 0
      ? [`${target.leader} spends ${formatResourceAdjustments(combatResources.spends)} to add ${immediateCombatSwords} strength`]
      : immediateCombatSwords === 0 && requiredSpyRecallStrength > 0
        ? [`preparing to add ${requiredSpyRecallStrength} strength`]
        : combatSwords
          ? [`adding ${combatSwords} strength`]
          : []),
    ...combatRetreat.logTexts,
    ...(combatResources.spends.length > 0 && immediateCombatSwords <= 0
      ? [`${target.leader} spends ${formatResourceAdjustments(combatResources.spends)}`]
      : []),
    ...(combatResources.gains.length > 0 ? [`gains ${formatResourceAdjustments(combatResources.gains)}`] : []),
    ...combatInfluenceLoss.logTexts,
    ...combatContract.logTexts,
    ...combatTrash.logTexts,
    ...combatSpyPlacement.logTexts,
    ...combatSpyRecall.logTexts,
    ...combatAcquire.logTexts,
  ];
  const firstEffectText = effectTexts[0] ?? "resolving its effect";
  const separator = firstEffectText.startsWith(`${target.leader} `) ? "; " : ", ";
  return advanceAfterCombatIntriguePlay({
    ...nextState,
    log: [
      `${actor.leader} plays ${intrigue.name} for ${target.leader}${separator}${effectTexts.join(" and ")}.`,
      ...state.log,
    ],
  });
}
