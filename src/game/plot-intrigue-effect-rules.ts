import { drawCards } from "./deck-utils";
import { resolveGameEffects, resolveTakeContracts } from "./effect-resolver";
import { activatedAllyEffectOwner } from "./market-rules";
import type {
  GameState,
  IntrigueCard,
  PendingAction,
  Player,
  Resources,
} from "./types";

const resourceIds = ["solari", "spice", "water"] as const;

type PlayTypedPlotIntrigueOptions = {
  activatedAllyOwnerId?: string;
  requireActivatedAlly?: boolean;
};

type TypedPlotIntrigueOutcome = {
  cardsDrawn: number;
};

function hasResourceGains(gain: Partial<Resources>) {
  return resourceIds.some((resource) => (gain[resource] ?? 0) > 0);
}

function addResourceGains(resources: Resources, gain: Partial<Resources>): Resources {
  return resourceIds.reduce(
    (next, resource) => ({
      ...next,
      [resource]: next[resource] + (gain[resource] ?? 0),
    }),
    { ...resources },
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
  if (!hasResourceGains(resolved.revealGain) && !hasTroopRecruits && !hasCardDraw && !contractPending) return state;

  const outcome: TypedPlotIntrigueOutcome = { cardsDrawn: 0 };
  const players = state.players.map((candidate) => {
    if (candidate.id === player.id) {
      let next = {
        ...candidate,
        resources: addResourceGains(candidate.resources, resolved.revealGain),
        garrison: candidate.garrison + resolved.recruitedTroops,
        intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
      };
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
  return {
    ...state,
    players,
    pendingAction: contractPending,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [logFor(player, contractPending, activatedAlly, resolved, outcome), ...state.log],
  };
}
