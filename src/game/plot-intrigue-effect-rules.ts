import { drawCards } from "./deck-utils";
import { resolveGameEffects, resolveTakeContracts } from "./effect-resolver";
import { drawIntrigueCards } from "./intrigue-deck";
import { adjustInfluence } from "./leader-rewards";
import { activatedAllyEffectOwner } from "./market-rules";
import type {
  FactionId,
  GameState,
  IntrigueCard,
  PendingAction,
  Player,
  Resources,
} from "./types";

const resourceIds = ["solari", "spice", "water"] as const;

type PlayTypedPlotIntrigueOptions = {
  activatedAllyOwnerId?: string;
  choiceId?: string;
  requireActivatedAlly?: boolean;
};

type TypedPlotIntrigueOutcome = {
  cardsDrawn: number;
};

function hasResourceGains(gain: Partial<Resources>) {
  return resourceIds.some((resource) => (gain[resource] ?? 0) > 0);
}

function hasResourceSpends(spent: Partial<Resources>) {
  return resourceIds.some((resource) => (spent[resource] ?? 0) > 0);
}

function hasInfluenceLosses(losses: Partial<Record<FactionId, number>>) {
  return Object.values(losses).some((amount) => (amount ?? 0) > 0);
}

function canSpendResources(resources: Resources, spent: Partial<Resources>) {
  return resourceIds.every((resource) => resources[resource] >= (spent[resource] ?? 0));
}

function canLoseInfluence(player: Player, losses: Partial<Record<FactionId, number>>) {
  return Object.entries(losses).every(([faction, amount]) => player.influence[faction as FactionId] >= (amount ?? 0));
}

function applyResourceChanges(resources: Resources, gain: Partial<Resources>, spent: Partial<Resources>): Resources {
  return resourceIds.reduce(
    (next, resource) => ({
      ...next,
      [resource]: next[resource] + (gain[resource] ?? 0) - (spent[resource] ?? 0),
    }),
    { ...resources },
  );
}

function applyInfluenceLosses(player: Player, losses: Partial<Record<FactionId, number>>) {
  return Object.entries(losses).reduce(
    (next, [faction, amount]) => adjustInfluence(next, faction as FactionId, -(amount ?? 0)),
    player,
  );
}

function publicContractPendingFor(
  state: GameState,
  player: Player,
  intrigue: IntrigueCard,
  effect: ReturnType<typeof resolveTakeContracts>[number] | undefined,
): PendingAction | undefined {
  if (!effect || effect.selector !== "self" || effect.amount <= 0 || effect.sourcePool !== "public-offer") return undefined;
  if (effect.amount !== 1) throw new Error(`Unsupported Plot Intrigue contract amount ${effect.amount}`);
  if (state.contractOffer.length === 0) return undefined;
  return {
    kind: "contract",
    ownerId: player.id,
    source: effect.source ?? intrigue.name,
    publicOnly: true,
    ...(effect.optional ? { optional: true } : {}),
  };
}

export function playTypedPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  isExpectedIntrigue: (intrigue: IntrigueCard) => boolean,
  logFor: (
    player: Player,
    contractPending: PendingAction | undefined,
    activatedAlly: Player | undefined,
    resolved: ReturnType<typeof resolveGameEffects>,
    outcome: TypedPlotIntrigueOutcome,
  ) => string,
  options: PlayTypedPlotIntrigueOptions = {},
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isExpectedIntrigue(intrigue)) return state;

  const activatedAllyResult = options.requireActivatedAlly || options.activatedAllyOwnerId
    ? activatedAllyEffectOwner(state, player, options.activatedAllyOwnerId)
    : { valid: true, owner: undefined };
  if (!activatedAllyResult.valid) return state;
  const activatedAlly = activatedAllyResult.owner;
  const context = {
    trigger: "plot-intrigue" as const,
    choiceId: options.choiceId,
    source: player,
    target: activatedAlly,
    state,
  };
  const resolved = resolveGameEffects(intrigue.effects, context);
  const contractEffects = resolveTakeContracts(intrigue.effects, context);
  if (contractEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue take-contracts effects");
  const [contractEffect] = contractEffects;
  const contractPending = publicContractPendingFor(state, player, intrigue, contractEffect);
  const hasTroopRecruits = resolved.recruitedTroops > 0 || resolved.activatedAlly.recruitedTroops > 0;
  const hasCardDraw = resolved.cardsToDraw > 0;
  const hasIntrigueDraw = resolved.intriguesToDraw > 0;
  const hasResourceSpend = hasResourceSpends(resolved.spentResources);
  const hasInfluenceLoss = hasInfluenceLosses(resolved.influenceLosses);
  const hasVpGain = resolved.vp > 0;
  if (!canSpendResources(player.resources, resolved.spentResources)) return state;
  if (!canLoseInfluence(player, resolved.influenceLosses)) return state;
  if (
    !hasResourceGains(resolved.revealGain) &&
    !hasResourceSpend &&
    !hasInfluenceLoss &&
    !hasVpGain &&
    !hasTroopRecruits &&
    !hasCardDraw &&
    !hasIntrigueDraw &&
    !contractPending
  ) {
    return state;
  }

  const outcome: TypedPlotIntrigueOutcome = { cardsDrawn: 0 };
  const players = state.players.map((candidate) => {
    if (candidate.id === player.id) {
      let next = {
        ...candidate,
        resources: applyResourceChanges(candidate.resources, resolved.revealGain, resolved.spentResources),
        garrison: candidate.garrison + resolved.recruitedTroops,
        intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
      };
      if (hasInfluenceLoss) {
        next = applyInfluenceLosses(next, resolved.influenceLosses);
      }
      if (resolved.vp > 0) {
        next = { ...next, vp: next.vp + resolved.vp };
      }
      if (hasCardDraw) {
        const handSize = next.hand.length;
        next = drawCards(next, handSize + resolved.cardsToDraw);
        outcome.cardsDrawn = next.hand.length - handSize;
      }
      return next;
    }
    return activatedAlly && candidate.id === activatedAlly.id
      ? {
          ...candidate,
          garrison: candidate.garrison + resolved.activatedAlly.recruitedTroops,
        }
      : candidate;
  });
  const immediateState = {
    ...state,
    players,
    pendingAction: contractPending,
  };
  const drawnState = hasIntrigueDraw
    ? drawIntrigueCards(immediateState, player.id, resolved.intriguesToDraw, intrigue.name)
    : immediateState;
  return {
    ...drawnState,
    intrigueDiscard: [...drawnState.intrigueDiscard, intrigue],
    log: [logFor(player, contractPending, activatedAlly, resolved, outcome), ...drawnState.log],
  };
}
