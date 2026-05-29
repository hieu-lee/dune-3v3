import { conflictCards, imperiumDeck, reserveMarket, standardContracts, starterCards } from "./data";
import type {
  BoardSpace,
  Card,
  ConflictCard,
  ContractCard,
  FactionId,
  GameState,
  Influence,
  PendingAction,
  Player,
  ResourceId,
  Resources,
  Role,
  TeamId,
} from "./types";

const emptyInfluence = (): Influence => ({
  emperor: 0,
  spacing: 0,
  bene: 0,
  fremen: 0,
  greatHouses: 0,
  fringeWorlds: 0,
});

export function cloneCards(cards: Card[]) {
  return cards.map((card) => ({ ...card }));
}

function shuffleCards(cards: Card[]) {
  return shuffleItems(cards);
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function cloneConflicts(conflicts: ConflictCard[]) {
  return conflicts.map((conflict) => ({ ...conflict, rewards: [...conflict.rewards] }));
}

function cloneContracts(contracts: ContractCard[]) {
  return contracts.map((contract) => ({ ...contract }));
}

function buildSixPlayerConflictDeck() {
  const levelTwo = shuffleItems(conflictCards.filter((conflict) => conflict.level === 2)).slice(0, 5);
  const levelThree = shuffleItems(conflictCards.filter((conflict) => conflict.level === 3));
  return cloneConflicts([...levelTwo, ...levelThree]);
}

function buildChoamContractDeck() {
  if (standardContracts.length !== 20) {
    throw new Error(`Expected 20 standard CHOAM contracts, found ${standardContracts.length}.`);
  }
  return cloneContracts(shuffleItems(standardContracts));
}

function buildStarterDeck(team: TeamId) {
  const core = cloneCards(starterCards);
  const duplicates = [core[0], core[1], core[3], core[3], core[4]].map((card, index) => ({
    ...card,
    id: `${card.id}-${team}-${index}`,
  }));
  return shuffleCards([...cloneCards(starterCards), ...duplicates]);
}

export function drawCards(player: Player, count: number): Player {
  const deck = [...player.deck];
  const hand = [...player.hand];
  const discard = [...player.discard];

  while (hand.length < count && (deck.length > 0 || discard.length > 0)) {
    if (deck.length === 0) {
      deck.push(...shuffleCards(discard.splice(0)));
    }
    const card = deck.shift();
    if (card) hand.push(card);
  }

  return { ...player, deck, hand, discard };
}

function makePlayer(
  id: string,
  name: string,
  leader: string,
  team: TeamId,
  role: Role,
  color: string,
): Player {
  const player: Player = {
    id,
    name,
    leader,
    team,
    role,
    color,
    vp: role === "Commander" ? 4 : 1,
    resources: { solari: 2, spice: 0, water: 1, intrigue: 0 },
    influence: emptyInfluence(),
    deck: buildStarterDeck(team),
    hand: [],
    discard: [],
    playArea: [],
    agentsReady: 2,
    agentsTotal: 2,
    garrison: role === "Commander" ? 0 : 3,
    conflict: 0,
    spies: 3,
    revealed: false,
    persuasion: 0,
    purchaseSequence: 0,
    swordmasterBonus: false,
    contracts: [],
  };
  return drawCards(player, 5);
}

export function initialGame(): GameState {
  const market = shuffleCards(cloneCards(imperiumDeck));
  const [conflict, ...conflictDeck] = buildSixPlayerConflictDeck();
  if (!conflict) throw new Error("Missing Uprising conflict cards for six-player setup.");
  const contracts = buildChoamContractDeck();

  const players = [
    makePlayer("p1", "Seat 1", "Muad'Dib", "muaddib", "Commander", "#45c4b0"),
    makePlayer("p2", "Seat 2", "Feyd-Rautha", "shaddam", "Ally", "#d26b48"),
    makePlayer("p3", "Seat 3", "Gurney Halleck", "muaddib", "Ally", "#2f8fdd"),
    makePlayer("p4", "Seat 4", "Shaddam Corrino IV", "shaddam", "Commander", "#efb447"),
    makePlayer("p5", "Seat 5", "Lady Jessica", "muaddib", "Ally", "#8ad5ff"),
    makePlayer("p6", "Seat 6", "Princess Irulan", "shaddam", "Ally", "#f08f82"),
  ];

  return {
    round: 1,
    activeSeat: 0,
    firstSeat: 0,
    players,
    spaces: {},
    spyPosts: {},
    imperiumRow: market.slice(0, 5),
    marketDeck: market.slice(5),
    reserveMarket: cloneCards(reserveMarket),
    contractOffer: contracts.slice(0, 2),
    contractDeck: contracts.slice(2),
    conflict,
    conflictDeck,
    conflictDiscard: [],
    shieldWall: true,
    swordmasterClaimed: false,
    pendingQueue: [],
    log: [`Round 1 begins. ${conflict.name} is revealed. Muad'Dib has first action.`],
  };
}

export function canPay(player: Player, cost: Partial<Resources> = {}) {
  return Object.entries(cost).every(([key, amount]) => player.resources[key as ResourceId] >= (amount ?? 0));
}

export function effectiveCost(space: BoardSpace, players: Player[]) {
  return space.cost;
}

function canEnterSpace(space: BoardSpace, player: Player, swordmasterClaimed = false) {
  if (space.id === "swordmaster" && (player.swordmasterBonus || swordmasterClaimed)) return false;
  if (!space.personal) return true;
  return player.role === "Commander" && player.team === space.personal;
}

export function iconCanReach(
  card: Card,
  space: BoardSpace,
  player: Player,
  swordmasterClaimed = false,
  spyPosts: Record<string, string> = {},
) {
  if (!canEnterSpace(space, player, swordmasterClaimed)) return false;
  if (card.icons.includes(space.icon)) return true;
  if (card.icons.includes("spy") && spyPosts[space.id] === player.id) return true;
  if (player.role === "Commander" && player.team === "muaddib" && space.icon === "fremen") {
    return card.icons.includes("fremen");
  }
  if (player.role === "Commander" && player.team === "shaddam" && space.icon === "emperor") {
    return card.icons.includes("emperor");
  }
  return false;
}

function resolveInfluence(space: BoardSpace, player: Player): FactionId | null {
  if (!space.influence) return null;
  if (space.personal) return space.influence;
  if (space.influence === "emperor") return player.team === "shaddam" && player.role === "Commander" ? "emperor" : "greatHouses";
  if (space.influence === "fremen") return player.team === "muaddib" && player.role === "Commander" ? "fremen" : "fringeWorlds";
  return space.influence;
}

export function defaultActivatedAllyId(player: Player, players: Player[]) {
  return players.find((candidate) => candidate.team === player.team && candidate.role === "Ally")?.id ?? player.id;
}

function defaultTradePartnerId(player: Player, target: Player, players: Player[]) {
  if (player.role === "Commander" && target.id !== player.id) return target.id;
  return players.find((candidate) => candidate.team === player.team && candidate.id !== player.id)?.id ?? target.id;
}

export function pendingActionForSpace(
  space: BoardSpace,
  source: Player,
  target: Player,
  players: Player[],
): PendingAction | undefined {
  if (space.spy && source.spies > 0) {
    return { kind: "spy", ownerId: source.id, remaining: Math.min(space.spy, source.spies), source: space.name };
  }

  if (space.team === "reinforce") {
    return { kind: "reinforce", team: source.team, remaining: space.troops ?? 0, source: space.name };
  }

  if (space.team === "trade") {
    return {
      kind: "trade",
      actorId: source.id,
      partnerId: defaultTradePartnerId(source, target, players),
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: space.name,
    };
  }

  if (space.contract) {
    return { kind: "contract", ownerId: source.id, source: space.name, spaceId: space.id };
  }

  if (space.combat) {
    const deployable = Math.min(target.garrison, (space.troops ?? 0) + 2);
    if (deployable > 0) {
      return { kind: "deploy", ownerId: target.id, remaining: deployable, source: space.name };
    }
  }

  return undefined;
}

export function pendingActionForCard(card: Card, source: Player): PendingAction | undefined {
  return undefined;
}

export function pendingActionsFor(
  spacePending: PendingAction | undefined,
  cardPending: PendingAction | undefined,
  spySupply: number,
): PendingAction[] {
  if (spacePending?.kind === "spy" && cardPending?.kind === "spy" && spacePending.ownerId === cardPending.ownerId) {
    return [{
      ...spacePending,
      remaining: Math.min(spySupply, spacePending.remaining + cardPending.remaining),
      source: `${spacePending.source} / ${cardPending.source}`,
    }];
  }
  return [spacePending, cardPending].filter((action): action is PendingAction => Boolean(action));
}

export function queuePendingActions(state: GameState, actions: PendingAction[]) {
  if (actions.length === 0) {
    return { pendingAction: state.pendingAction, pendingQueue: state.pendingQueue };
  }
  if (state.pendingAction) {
    return { pendingAction: state.pendingAction, pendingQueue: [...state.pendingQueue, ...actions] };
  }
  return { pendingAction: actions[0], pendingQueue: [...state.pendingQueue, ...actions.slice(1)] };
}

export function advancePendingAction(state: GameState) {
  const [pendingAction, ...pendingQueue] = state.pendingQueue;
  return { pendingAction, pendingQueue };
}

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;

export function takeChoamContract(state: GameState, pending: ContractPendingAction, contractId: string): GameState {
  const offerIndex = state.contractOffer.findIndex((contract) => contract.id === contractId);
  const contract = state.contractOffer[offerIndex];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!contract || !owner) return state;
  const [replacement, ...contractDeck] = state.contractDeck;
  const contractOffer = state.contractOffer.flatMap((candidate, index) => {
    if (index !== offerIndex) return [candidate];
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((player) =>
    player.id === owner.id
      ? {
          ...player,
          contracts: [
            ...player.contracts,
            {
              card: contract,
              completed: false,
              takenRound: state.round,
              takenAtSpaceId: pending.spaceId,
            },
          ],
        }
      : player,
  );
  return {
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [`${owner.leader} takes the ${contract.name} CHOAM contract from ${pending.source}.`, ...state.log],
  };
}

export function collectChoamContractFallback(state: GameState, pending: ContractPendingAction): GameState {
  if (state.contractOffer.length > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const players = state.players.map((player) =>
    player.id === owner.id
      ? { ...player, resources: { ...player.resources, solari: player.resources.solari + 2 } }
      : player,
  );
  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [`${owner.leader} gains 2 Solari from ${pending.source}; no CHOAM contracts remain.`, ...state.log],
  };
}

export function applyBoardEffect(
  sourcePlayer: Player,
  targetPlayer: Player,
  space: BoardSpace,
  cost: Partial<Resources> = {},
): { source: Player; target: Player } {
  const resourcesNext = { ...sourcePlayer.resources };
  Object.entries(cost).forEach(([key, amount]) => {
    resourcesNext[key as ResourceId] -= amount ?? 0;
  });
  Object.entries(space.gain ?? {}).forEach(([key, amount]) => {
    resourcesNext[key as ResourceId] += amount ?? 0;
  });

  let source: Player = { ...sourcePlayer, resources: resourcesNext };
  let target: Player = targetPlayer;

  const influence = resolveInfluence(space, sourcePlayer);
  if (influence) {
    if (sourcePlayer.role === "Commander" && !space.personal) {
      target = { ...target, influence: { ...target.influence, [influence]: target.influence[influence] + 1 } };
    } else {
      source = { ...source, influence: { ...source.influence, [influence]: source.influence[influence] + 1 } };
    }
  }

  if (space.draw) source = drawCards(source, source.hand.length + space.draw);

  if (space.troops && space.team !== "reinforce") {
    const troopOwner = sourcePlayer.role === "Commander" ? target : source;
    const troopNext = { ...troopOwner, garrison: troopOwner.garrison + space.troops };
    if (sourcePlayer.role === "Commander") target = troopNext;
    else source = troopNext;
  }

  if (space.id === "swordmaster" && !source.swordmasterBonus) {
    source = { ...source, agentsTotal: 3, agentsReady: source.agentsReady + 1, swordmasterBonus: true };
  }

  return { source, target };
}

export function advanceSeat(state: GameState): number {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const nextSeat = (state.activeSeat + offset) % state.players.length;
    const nextPlayer = state.players[nextSeat];
    if (!nextPlayer.revealed || nextPlayer.agentsReady > 0) return nextSeat;
  }
  return state.activeSeat;
}

export function allPlayersDone(players: Player[]) {
  return players.every((player) => player.revealed && player.agentsReady === 0);
}

export function startNextRound(state: GameState): GameState {
  const firstSeat = (state.firstSeat + 1) % state.players.length;
  const [nextConflict, ...conflictDeck] = state.conflictDeck;
  const conflictDiscard = state.conflict ? [...state.conflictDiscard, state.conflict] : state.conflictDiscard;
  const players = state.players.map((player) =>
    drawCards(
      {
        ...player,
        agentsReady: player.agentsTotal,
        revealed: false,
        persuasion: 0,
        conflict: 0,
        hand: [],
        discard: [...player.discard, ...player.playArea, ...player.hand],
        playArea: [],
      },
      5,
    ),
  );
  return {
    ...state,
    round: state.round + 1,
    firstSeat,
    activeSeat: firstSeat,
    players,
    spaces: {},
    pendingAction: undefined,
    pendingQueue: [],
    conflict: nextConflict ?? null,
    conflictDeck,
    conflictDiscard,
    log: [
      nextConflict
        ? `Round ${state.round + 1} begins. ${nextConflict.name} is revealed. ${players[firstSeat].leader} has first action.`
        : `Round ${state.round + 1} begins with no conflict cards remaining. ${players[firstSeat].leader} has first action.`,
      ...state.log,
    ],
  };
}
