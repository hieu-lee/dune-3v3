import { hasGainedSpiceThisTurn, hasVisitedMakerSpaceThisRound } from "./turn-trackers";
import {
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import { playerConflictUnitCount } from "./conflict-rules";
import { validateSpec } from "./effect-spec-validation";
import { playerHasSpyPost, spyPostCount } from "./spy-posts";
import type {
  AcquireCardDestination,
  BoardSpace,
  Card,
  CardEffectSpec,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectConditionSpec,
  GameEffectSpec,
  GameEffectTrigger,
  GameState,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
  TroopEffectDestination,
  TroopEffectRecipient,
  TrashCardZone,
} from "./types";

export type SpyPlacementEffectResult = {
  count: number;
  recallForSupply?: boolean;
  mustPlace?: boolean;
  placementIcon?: IconId;
  allowSharedPost?: boolean;
  source?: string;
  postPlacementAction?: "staban-unseen-network";
};

export type EffectResolverState = Partial<
  Pick<GameState, "alliances" | "players" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts" | "turnSpiceGains">
>;

export type GameEffectContext = {
  trigger: GameEffectTrigger;
  choiceId?: string;
  source: Player;
  target?: Player;
  space?: Pick<BoardSpace, "id" | "icon" | "maker">;
  state?: EffectResolverState;
};

export type DeferredAgentIntrigueDraw = {
  selector: PlayerSelector;
  amount: number;
  minConflictUnits: number;
};

export type RevealRetreatTroopsForStrength = {
  selector: PlayerSelector;
  troopCount: number;
  strength: number;
  optional: boolean;
};

export type RevealTrashCardEffect = {
  selector: PlayerSelector;
  optional: boolean;
  zones?: TrashCardZone[];
  excludeSource: boolean;
  requiredTrait?: string;
  strengthReward?: number;
  spiceRewardCostThreshold?: number;
  spiceReward?: number;
};

export type RevealLoseInfluenceForIntrigues = {
  selector: PlayerSelector;
  amount: number;
  optional: boolean;
};

export type RevealPayResourceForStrength = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  strength: number;
  optional: true;
  source?: string;
};

export type RevealPayResourceForTroops = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  troops: number;
  recipient: TroopEffectRecipient;
  destination: TroopEffectDestination;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type RevealPayResourceForSandworms = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  sandworms: number;
  recipient: SandwormEffectRecipient;
  destination: SandwormEffectDestination;
  optional: true;
  trashSource: boolean;
  persuasionCost: number;
  source?: string;
};

export type AgentDiscardCardForInfluenceAndDraw = {
  selector: PlayerSelector;
  drawCards: number;
  influenceAmount: number;
  optional: boolean;
};

export type AgentDiscardCardForDraw = {
  selector: PlayerSelector;
  drawCards: number;
  optional: boolean;
  bonusDraw?: {
    requiredDiscardTrait: string;
    drawCards: number;
  };
};

export type AgentOpponentsDiscardCards = {
  selector: PlayerSelector;
  amount: number;
  source?: string;
};

export type AgentAcquireCard = {
  selector: PlayerSelector;
  minCost?: number;
  maxCost?: number;
  destination: AcquireCardDestination;
  paymentResource?: ResourceId;
  optional: boolean;
  source?: string;
};

export type AgentGainInfluenceChoice = {
  selector: PlayerSelector;
  amount: number;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForInfluence = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  faction: InfluenceEffectFaction;
  amount: number;
  recipient: InfluenceEffectRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForSandworms = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  sandworms: number;
  recipient: SandwormEffectRecipient;
  destination: SandwormEffectDestination;
  optional: true;
  trashSource: boolean;
  persuasionCost: number;
  source?: string;
};

export type AgentPayResourceForContracts = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  contractCount: number;
  recipient: ContractEffectRecipient;
  sourcePool: ContractEffectSourcePool;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type TakeContractsEffect = {
  selector: PlayerSelector;
  amount: number;
  sourcePool: ContractEffectSourcePool;
  optional: boolean;
  source?: string;
};

export type AgentPayResourceForDrawCards = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  drawCards: number;
  optional: true;
  source?: string;
};

export type AgentPayTeamResourceForVp = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  vp: number;
  contributors: TeamResourcePaymentContributor;
  recipient: TeamResourcePaymentRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentMoveCardToThroneRow = {
  selector: PlayerSelector;
  source?: string;
};

export type AgentCommanderResourceSplit = {
  selector: PlayerSelector;
  options: CommanderResourceSplitOption[];
  source?: string;
};

export type AgentTrashSourceForTrade = {
  selector: PlayerSelector;
  partner: TradeEffectPartner;
  resource: TradeGoodId;
  optional: true;
  partnerLocked: boolean;
  source?: string;
};

type PlayerEffectResult = {
  cardsToDraw: number;
  drawCardsSource?: string;
  blocksDeploymentsThisTurn: boolean;
  deploymentBlockSource?: string;
  intriguesToDraw: number;
  recruitedTroops: number;
  recruitedTroopsSource?: string;
  revealGain: Partial<Resources>;
  revealGainSource?: string;
  spentResources: Partial<Resources>;
  spyPlacements: SpyPlacementEffectResult[];
};

export type GameEffectResult = PlayerEffectResult & {
  activatedAlly: PlayerEffectResult;
  persuasion: number;
  swords: number;
  vp: number;
};

const emptyPlayerEffectResult: PlayerEffectResult = {
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  intriguesToDraw: 0,
  recruitedTroops: 0,
  revealGain: {},
  spentResources: {},
  spyPlacements: [],
};

const emptyEffectResult: GameEffectResult = {
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  intriguesToDraw: 0,
  recruitedTroops: 0,
  persuasion: 0,
  revealGain: {},
  spentResources: {},
  spyPlacements: [],
  swords: 0,
  vp: 0,
  activatedAlly: emptyPlayerEffectResult,
};

function unsupportedKind(label: string, value: unknown): never {
  const kind = typeof value === "object" && value !== null && "kind" in value
    ? String((value as { kind?: unknown }).kind)
    : String(value);
  throw new Error(`Unsupported ${label} "${kind}"`);
}

function mergeEffectSourceLabel(
  existingHasEffect: boolean,
  existingSource: string | undefined,
  nextHasEffect: boolean,
  nextSource: string | undefined,
) {
  if (!nextHasEffect) return existingSource;
  if (!existingHasEffect) return nextSource;
  if (!existingSource || !nextSource) return undefined;
  return existingSource === nextSource ? existingSource : undefined;
}

function addRevealGain(gain: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return gain;
  return {
    ...gain,
    [resource]: (gain[resource] ?? 0) + amount,
  };
}

function addResourceSpend(spent: Partial<Resources>, resource: ResourceId, amount: number) {
  if (amount === 0) return spent;
  return {
    ...spent,
    [resource]: (spent[resource] ?? 0) + amount,
  };
}

function hasResourceGain(gain: Partial<Resources>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function amountFor(amount: EffectAmountSpec, source: Player) {
  if (typeof amount === "number") return amount;
  if (amount.kind === "completed-contracts") {
    return source.contracts.filter((contract) => contract.completed).length * (amount.multiplier ?? 1);
  }
  return unsupportedKind("effect amount", amount);
}

function conditionApplies(condition: GameEffectConditionSpec, context: GameEffectContext) {
  if (condition.kind === "visited-maker-space") {
    if (context.trigger === "agent-play") return Boolean(context.space?.maker);
    return context.state?.roundMakerSpaceVisits
      ? hasVisitedMakerSpaceThisRound({ roundMakerSpaceVisits: context.state.roundMakerSpaceVisits }, context.source.id)
      : false;
  }
  if (condition.kind === "visited-space-icon") {
    return context.space?.icon === condition.icon;
  }
  if (condition.kind === "visited-space-has-spy-post") {
    return Boolean(
      context.space?.id &&
      context.state?.spyPosts &&
      context.state.sharedSpyPosts &&
      playerHasSpyPost(
        { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
        context.space.id,
        context.source.id,
      ),
    );
  }
  if (condition.kind === "has-spy-posts") {
    return context.state?.spyPosts && context.state.sharedSpyPosts
      ? spyPostCount(
        { spyPosts: context.state.spyPosts, sharedSpyPosts: context.state.sharedSpyPosts },
        context.source.id,
      ) >= condition.count
      : false;
  }
  if (condition.kind === "has-conflict-units") {
    return playerConflictUnitCount(conflictUnitConditionPlayer(context)) >= condition.count;
  }
  if (condition.kind === "has-influence") {
    return conditionInfluence(context.source, condition.faction, context.state?.players ?? [context.source]) >= condition.amount;
  }
  if (condition.kind === "has-completed-contracts") {
    return context.source.contracts.filter((contract) => contract.completed).length >= condition.count;
  }
  if (condition.kind === "has-card-trait-in-play") {
    const count = condition.count ?? 1;
    return context.source.playArea.filter((card) => card.traits?.includes(condition.trait)).length >= count;
  }
  if (condition.kind === "has-team") {
    return context.source.team === condition.team;
  }
  if (condition.kind === "has-role") {
    return context.source.role === condition.role;
  }
  if (condition.kind === "has-high-council-seat") {
    return context.source.highCouncilSeat;
  }
  if (condition.kind === "has-swordmaster-bonus") {
    return context.source.swordmasterBonus;
  }
  if (condition.kind === "has-leader") {
    return context.source.leader === condition.leader;
  }
  if (condition.kind === "has-alliance") {
    if (!context.state?.alliances) return false;
    if (condition.faction) return context.state.alliances[condition.faction] === context.source.id;
    return Object.values(context.state.alliances).includes(context.source.id);
  }
  if (condition.kind === "gained-spice-this-turn") {
    return context.state?.turnSpiceGains
      ? hasGainedSpiceThisTurn({ turnSpiceGains: context.state.turnSpiceGains }, context.source.id)
      : false;
  }
  return unsupportedKind("effect condition", condition);
}

function conditionInfluence(source: Player, faction: FactionId, players: Player[]) {
  if (faction === "emperor") return effectiveEmperorIconInfluence(source, players);
  if (faction === "fremen") return effectiveFremenIconInfluence(source, players);
  return effectiveRequirementInfluence(source, faction, players);
}

function conflictUnitConditionPlayer(context: GameEffectContext) {
  return context.source.role === "Commander" &&
    context.target?.role === "Ally" &&
    context.target.team === context.source.team
    ? context.target
    : context.source;
}

function specApplies(spec: CardEffectSpec, context: GameEffectContext) {
  return spec.trigger === context.trigger &&
    (spec.choiceId === undefined || spec.choiceId === context.choiceId) &&
    spec.effects.every((effect) => selectorApplies(effect.selector, context)) &&
    (spec.conditions ?? []).every((condition) => conditionApplies(condition, context));
}

function selectorApplies(selector: PlayerSelector, context: GameEffectContext) {
  if (selector === "self") return true;
  if (selector === "activated-ally") {
    return context.source.role === "Commander" &&
      context.target?.role === "Ally" &&
      context.target.team === context.source.team;
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedRevealGain(
  result: GameEffectResult,
  selector: PlayerSelector,
  resource: ResourceId,
  amount: number,
  source?: string,
) {
  if (selector === "self") {
    return {
      ...result,
      revealGain: addRevealGain(result.revealGain, resource, amount),
      revealGainSource: mergeEffectSourceLabel(
        hasResourceGain(result.revealGain),
        result.revealGainSource,
        amount > 0,
        source,
      ),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        revealGain: addRevealGain(result.activatedAlly.revealGain, resource, amount),
        revealGainSource: mergeEffectSourceLabel(
          hasResourceGain(result.activatedAlly.revealGain),
          result.activatedAlly.revealGainSource,
          amount > 0,
          source,
        ),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedResourceSpend(
  result: GameEffectResult,
  selector: PlayerSelector,
  resource: ResourceId,
  amount: number,
) {
  if (selector === "self") {
    return {
      ...result,
      spentResources: addResourceSpend(result.spentResources, resource, amount),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        spentResources: addResourceSpend(result.activatedAlly.spentResources, resource, amount),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedRecruitedTroops(
  result: GameEffectResult,
  selector: PlayerSelector,
  amount: number,
  source?: string,
) {
  if (selector === "self") {
    return {
      ...result,
      recruitedTroops: result.recruitedTroops + amount,
      recruitedTroopsSource: mergeEffectSourceLabel(
        result.recruitedTroops > 0,
        result.recruitedTroopsSource,
        amount > 0,
        source,
      ),
    };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        recruitedTroops: result.activatedAlly.recruitedTroops + amount,
        recruitedTroopsSource: mergeEffectSourceLabel(
          result.activatedAlly.recruitedTroops > 0,
          result.activatedAlly.recruitedTroopsSource,
          amount > 0,
          source,
        ),
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedIntriguesToDraw(result: GameEffectResult, selector: PlayerSelector, amount: number) {
  if (selector === "self") {
    return { ...result, intriguesToDraw: result.intriguesToDraw + amount };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        intriguesToDraw: result.activatedAlly.intriguesToDraw + amount,
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function addSelectedSpyPlacement(
  result: GameEffectResult,
  selector: PlayerSelector,
  placement: SpyPlacementEffectResult,
) {
  if (placement.count === 0) return result;
  if (selector === "self") {
    return { ...result, spyPlacements: [...result.spyPlacements, placement] };
  }
  if (selector === "activated-ally") {
    return {
      ...result,
      activatedAlly: {
        ...result.activatedAlly,
        spyPlacements: [...result.activatedAlly.spyPlacements, placement],
      },
    };
  }
  return unsupportedKind("effect selector", selector);
}

function resolveEffect(result: GameEffectResult, effect: GameEffectSpec, context: GameEffectContext): GameEffectResult {
  if (!selectorApplies(effect.selector, context)) return result;
  if (effect.kind === "gain-resource") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRevealGain(result, effect.selector, effect.resource, amount, effect.source);
  }
  if (effect.kind === "spend-resource") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedResourceSpend(result, effect.selector, effect.resource, amount);
  }
  if (effect.kind === "gain-persuasion") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, persuasion: result.persuasion + amount };
  }
  if (effect.kind === "gain-strength") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, swords: result.swords + amount };
  }
  if (effect.kind === "gain-vp") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return { ...result, vp: result.vp + amount };
  }
  if (effect.kind === "draw-cards") {
    if (effect.selector !== "self") {
      throw new Error(`Unsupported effect selector "${effect.selector}" for ${effect.kind}`);
    }
    const amount = amountFor(effect.amount, context.source);
    return {
      ...result,
      cardsToDraw: result.cardsToDraw + amount,
      drawCardsSource: mergeEffectSourceLabel(
        result.cardsToDraw > 0,
        result.drawCardsSource,
        amount > 0,
        effect.source,
      ),
    };
  }
  if (effect.kind === "draw-intrigues") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedIntriguesToDraw(result, effect.selector, amount);
  }
  if (effect.kind === "gain-influence-choice") {
    return result;
  }
  if (effect.kind === "acquire-card") {
    return result;
  }
  if (effect.kind === "recruit-troops") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedRecruitedTroops(result, effect.selector, amount, effect.source);
  }
  if (effect.kind === "retreat-troops-for-strength") {
    return result;
  }
  if (effect.kind === "trash-card") {
    return result;
  }
  if (effect.kind === "lose-influence-for-intrigues") {
    return result;
  }
  if (effect.kind === "pay-resource-for-strength") {
    return result;
  }
  if (effect.kind === "pay-resource-for-troops") {
    return result;
  }
  if (effect.kind === "pay-resource-for-draw-cards") {
    return result;
  }
  if (effect.kind === "discard-card-for-influence-and-draw") {
    return result;
  }
  if (effect.kind === "discard-card-for-draw") {
    return result;
  }
  if (effect.kind === "opponents-discard-cards") {
    return result;
  }
  if (effect.kind === "pay-resource-for-influence") {
    return result;
  }
  if (effect.kind === "pay-resource-for-sandworms") {
    return result;
  }
  if (effect.kind === "pay-resource-for-contracts") {
    return result;
  }
  if (effect.kind === "take-contracts") {
    return result;
  }
  if (effect.kind === "pay-team-resource-for-vp") {
    return result;
  }
  if (effect.kind === "commander-resource-split") {
    return result;
  }
  if (effect.kind === "trash-source-for-trade") {
    return result;
  }
  if (effect.kind === "block-conflict-deployment") {
    return {
      ...result,
      blocksDeploymentsThisTurn: true,
      deploymentBlockSource: effect.source ?? result.deploymentBlockSource,
    };
  }
  if (effect.kind === "move-card-to-throne-row") {
    return result;
  }
  if (effect.kind === "place-spies") {
    const amount = amountFor(effect.amount, context.source);
    return addSelectedSpyPlacement(result, effect.selector, {
      count: amount,
      recallForSupply: effect.recallForSupply,
      mustPlace: effect.mustPlace,
      placementIcon: effect.placementIcon,
      allowSharedPost: effect.allowSharedPost,
      source: effect.source,
      postPlacementAction: effect.postPlacementAction,
    });
  }
  return unsupportedKind("effect", effect);
}

export function resolveGameEffects(specs: CardEffectSpec[] | undefined, context: GameEffectContext): GameEffectResult {
  specs?.forEach(validateSpec);
  return (specs ?? []).reduce((result, spec) => {
    if (!specApplies(spec, context)) return result;
    return spec.effects.reduce((effectResult, effect) => resolveEffect(effectResult, effect, context), result);
  }, emptyEffectResult);
}

function mergeEffectResult(result: GameEffectResult, next: GameEffectResult): GameEffectResult {
  return {
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    drawCardsSource: mergeEffectSourceLabel(
      result.cardsToDraw > 0,
      result.drawCardsSource,
      next.cardsToDraw > 0,
      next.drawCardsSource,
    ),
    blocksDeploymentsThisTurn: result.blocksDeploymentsThisTurn || next.blocksDeploymentsThisTurn,
    deploymentBlockSource: result.deploymentBlockSource ?? next.deploymentBlockSource,
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    recruitedTroopsSource: mergeEffectSourceLabel(
      result.recruitedTroops > 0,
      result.recruitedTroopsSource,
      next.recruitedTroops > 0,
      next.recruitedTroopsSource,
    ),
    persuasion: result.persuasion + next.persuasion,
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    revealGainSource: mergeEffectSourceLabel(
      hasResourceGain(result.revealGain),
      result.revealGainSource,
      hasResourceGain(next.revealGain),
      next.revealGainSource,
    ),
    spentResources: Object.entries(next.spentResources ?? {}).reduce(
      (spent, [resource, amount]) => addResourceSpend(spent, resource as ResourceId, amount ?? 0),
      result.spentResources,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
    swords: result.swords + next.swords,
    vp: result.vp + next.vp,
    activatedAlly: mergePlayerEffectResult(result.activatedAlly, next.activatedAlly),
  };
}

function mergePlayerEffectResult(result: PlayerEffectResult, next: PlayerEffectResult): PlayerEffectResult {
  return {
    cardsToDraw: result.cardsToDraw + next.cardsToDraw,
    drawCardsSource: mergeEffectSourceLabel(
      result.cardsToDraw > 0,
      result.drawCardsSource,
      next.cardsToDraw > 0,
      next.drawCardsSource,
    ),
    blocksDeploymentsThisTurn: result.blocksDeploymentsThisTurn || next.blocksDeploymentsThisTurn,
    deploymentBlockSource: result.deploymentBlockSource ?? next.deploymentBlockSource,
    intriguesToDraw: result.intriguesToDraw + next.intriguesToDraw,
    recruitedTroops: result.recruitedTroops + next.recruitedTroops,
    recruitedTroopsSource: mergeEffectSourceLabel(
      result.recruitedTroops > 0,
      result.recruitedTroopsSource,
      next.recruitedTroops > 0,
      next.recruitedTroopsSource,
    ),
    revealGain: Object.entries(next.revealGain).reduce(
      (gain, [resource, amount]) => addRevealGain(gain, resource as ResourceId, amount ?? 0),
      result.revealGain,
    ),
    revealGainSource: mergeEffectSourceLabel(
      hasResourceGain(result.revealGain),
      result.revealGainSource,
      hasResourceGain(next.revealGain),
      next.revealGainSource,
    ),
    spentResources: Object.entries(next.spentResources ?? {}).reduce(
      (spent, [resource, amount]) => addResourceSpend(spent, resource as ResourceId, amount ?? 0),
      result.spentResources,
    ),
    spyPlacements: [...result.spyPlacements, ...next.spyPlacements],
  };
}

export function resolveCardEffects(cards: Array<{ effects?: CardEffectSpec[] }>, context: GameEffectContext): GameEffectResult {
  return cards.reduce((result, card) => mergeEffectResult(result, resolveGameEffects(card.effects, context)), emptyEffectResult);
}

export function resolveDeferredAgentConflictUnitIntrigueDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): DeferredAgentIntrigueDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (spec.choiceId !== undefined && spec.choiceId !== context.choiceId) return [];
    if (!spec.effects.every((effect) => selectorApplies(effect.selector, context))) return [];

    const conflictUnitConditions = (spec.conditions ?? []).filter((condition) => condition.kind === "has-conflict-units");
    if (conflictUnitConditions.length === 0) return [];
    if (conflictUnitConditions.length > 1) {
      throw new Error("Unsupported multiple has-conflict-units conditions for deferred Agent Intrigue draw");
    }
    const [condition] = conflictUnitConditions;
    if ((spec.conditions ?? [])
      .filter((candidate) => candidate.kind !== "has-conflict-units")
      .some((candidate) => !conditionApplies(candidate, context))) {
      return [];
    }
    if (playerConflictUnitCount(conflictUnitConditionPlayer(context)) >= condition.count) return [];

    const drawEffects = spec.effects.filter((effect) => effect.kind === "draw-intrigues");
    if (drawEffects.length === 0) return [];
    if (drawEffects.length !== spec.effects.length) {
      throw new Error("Unsupported mixed deferred conflict-unit Agent effects");
    }
    return drawEffects.map((effect) => ({
      selector: effect.selector,
      amount: amountFor(effect.amount, context.source),
      minConflictUnits: condition.count,
    }));
  });
}

export function resolveRevealRetreatTroopsForStrength(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealRetreatTroopsForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "retreat-troops-for-strength")
      .map((effect) => ({
        selector: effect.selector,
        troopCount: amountFor(effect.amount, context.source),
        strength: amountFor(effect.strength, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveRevealTrashCardEffects(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealTrashCardEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-card")
      .map((effect) => ({
        selector: effect.selector,
        optional: effect.optional ?? true,
        zones: effect.zones ? [...effect.zones] : undefined,
        excludeSource: effect.excludeSource ?? false,
        requiredTrait: effect.requiredTrait,
        strengthReward: effect.strengthReward === undefined ? undefined : amountFor(effect.strengthReward, context.source),
        spiceRewardCostThreshold: effect.spiceRewardCostThreshold === undefined
          ? undefined
          : amountFor(effect.spiceRewardCostThreshold, context.source),
        spiceReward: effect.spiceReward === undefined ? undefined : amountFor(effect.spiceReward, context.source),
      }));
  });
}

export function resolveRevealLoseInfluenceForIntrigues(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealLoseInfluenceForIntrigues[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "lose-influence-for-intrigues")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveRevealPayResourceForStrengths(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForStrength[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-strength")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        strength: amountFor(effect.strength, context.source),
        optional: true,
        source: effect.source,
      }));
  });
}

export function resolveRevealPayResourceForTroops(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForTroops[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-troops")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        troops: amountFor(effect.troops, context.source),
        recipient: effect.recipient,
        destination: effect.destination,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveRevealPayResourceForSandworms(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): RevealPayResourceForSandworms[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "reveal") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-sandworms")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        sandworms: amountFor(effect.sandworms, context.source),
        recipient: effect.recipient,
        destination: effect.destination,
        optional: true,
        trashSource: effect.trashSource ?? false,
        persuasionCost: effect.persuasionCost !== undefined ? amountFor(effect.persuasionCost, context.source) : 0,
        source: effect.source,
      }));
  });
}

export function resolveAgentDiscardCardForInfluenceAndDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentDiscardCardForInfluenceAndDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-card-for-influence-and-draw")
      .map((effect) => ({
        selector: effect.selector,
        drawCards: amountFor(effect.drawCards, context.source),
        influenceAmount: amountFor(effect.influenceAmount, context.source),
        optional: effect.optional ?? true,
      }));
  });
}

export function resolveAgentDiscardCardForDraws(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentDiscardCardForDraw[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "discard-card-for-draw")
      .map((effect) => ({
        selector: effect.selector,
        drawCards: amountFor(effect.drawCards, context.source),
        optional: effect.optional ?? false,
        ...(effect.bonusDraw
          ? {
              bonusDraw: {
                requiredDiscardTrait: effect.bonusDraw.requiredDiscardTrait,
                drawCards: amountFor(effect.bonusDraw.drawCards, context.source),
              },
            }
          : {}),
      }));
  });
}

export function resolveAgentGainInfluenceChoices(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentGainInfluenceChoice[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "gain-influence-choice")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentOpponentsDiscardCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentOpponentsDiscardCards[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "opponents-discard-cards")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        source: effect.source,
      }));
  });
}

export function resolveAgentAcquireCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentAcquireCard[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "acquire-card")
      .map((effect) => ({
        selector: effect.selector,
        ...(effect.minCost !== undefined ? { minCost: amountFor(effect.minCost, context.source) } : {}),
        ...(effect.maxCost !== undefined ? { maxCost: amountFor(effect.maxCost, context.source) } : {}),
        destination: effect.destination,
        paymentResource: effect.paymentResource,
        optional: effect.optional ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForInfluences(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForInfluence[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-influence")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        faction: effect.faction,
        amount: amountFor(effect.amount, context.source),
        recipient: effect.recipient,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForSandworms(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForSandworms[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-sandworms")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        sandworms: amountFor(effect.sandworms, context.source),
        recipient: effect.recipient,
        destination: effect.destination,
        optional: true,
        trashSource: effect.trashSource ?? false,
        persuasionCost: effect.persuasionCost !== undefined ? amountFor(effect.persuasionCost, context.source) : 0,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForContracts(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForContracts[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-contracts")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        contractCount: amountFor(effect.contractCount, context.source),
        recipient: effect.recipient,
        sourcePool: effect.sourcePool,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveTakeContracts(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): TakeContractsEffect[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== context.trigger) return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "take-contracts")
      .map((effect) => ({
        selector: effect.selector,
        amount: amountFor(effect.amount, context.source),
        sourcePool: effect.sourcePool,
        optional: effect.optional === true,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayResourceForDrawCards(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayResourceForDrawCards[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-resource-for-draw-cards")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        drawCards: amountFor(effect.drawCards, context.source),
        optional: true,
        source: effect.source,
      }));
  });
}

export function resolveAgentPayTeamResourceForVps(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentPayTeamResourceForVp[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "pay-team-resource-for-vp")
      .map((effect) => ({
        selector: effect.selector,
        resource: effect.resource,
        cost: amountFor(effect.cost, context.source),
        vp: amountFor(effect.vp, context.source),
        contributors: effect.contributors,
        recipient: effect.recipient,
        optional: true,
        trashSource: effect.trashSource ?? false,
        source: effect.source,
      }));
  });
}

export function resolveAgentMoveCardToThroneRows(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentMoveCardToThroneRow[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "move-card-to-throne-row")
      .map((effect) => ({
        selector: effect.selector,
        source: effect.source,
      }));
  });
}

export function resolveAgentCommanderResourceSplits(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentCommanderResourceSplit[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "commander-resource-split")
      .map((effect) => ({
        selector: effect.selector,
        options: effect.options.map((option) => ({ ...option })),
        source: effect.source,
      }));
  });
}

export function resolveAgentTrashSourceForTrades(
  specs: CardEffectSpec[] | undefined,
  context: GameEffectContext,
): AgentTrashSourceForTrade[] {
  specs?.forEach(validateSpec);
  return (specs ?? []).flatMap((spec) => {
    if (spec.trigger !== "agent-play") return [];
    if (!specApplies(spec, context)) return [];
    return spec.effects
      .filter((effect) => effect.kind === "trash-source-for-trade")
      .map((effect) => ({
        selector: effect.selector,
        partner: effect.partner,
        resource: effect.resource,
        optional: true,
        partnerLocked: effect.partnerLocked ?? true,
        source: effect.source,
      }));
  });
}

function legacyRevealResult(card: Card): GameEffectResult {
  return {
    cardsToDraw: 0,
    blocksDeploymentsThisTurn: false,
    intriguesToDraw: 0,
    recruitedTroops: 0,
    persuasion: card.persuasion,
    revealGain: card.revealGain ? { ...card.revealGain } : {},
    spentResources: {},
    spyPlacements: [],
    swords: card.swords,
    vp: 0,
    activatedAlly: emptyPlayerEffectResult,
  };
}

export function resolveCardRevealEffects(
  cards: Card[],
  source: Player,
  state?: EffectResolverState,
): GameEffectResult {
  const revealSource = cards.length > 0
    ? { ...source, playArea: [...source.playArea, ...cards] }
    : source;
  return cards.reduce((result, card) => {
    card.effects?.forEach(validateSpec);
    const revealSpecs = card.effects?.filter((spec) => spec.trigger === "reveal");
    const cardResult = revealSpecs && revealSpecs.length > 0
      ? resolveGameEffects(revealSpecs, { trigger: "reveal", source: revealSource, state })
      : legacyRevealResult(card);
    return mergeEffectResult(result, cardResult);
  }, emptyEffectResult);
}

function legacyAcquireResult(card: Card): GameEffectResult {
  return {
    cardsToDraw: 0,
    blocksDeploymentsThisTurn: false,
    intriguesToDraw: 0,
    recruitedTroops: 0,
    persuasion: 0,
    revealGain: {},
    spentResources: {},
    spyPlacements: [],
    swords: 0,
    vp: card.acquired ?? 0,
    activatedAlly: emptyPlayerEffectResult,
  };
}

export function resolveCardAcquireEffects(
  card: Card,
  source: Player,
  state?: EffectResolverState,
): GameEffectResult {
  card.effects?.forEach(validateSpec);
  const acquireSpecs = card.effects?.filter((spec) => spec.trigger === "acquire");
  return acquireSpecs && acquireSpecs.length > 0
    ? resolveGameEffects(acquireSpecs, { trigger: "acquire", source, state })
    : legacyAcquireResult(card);
}
