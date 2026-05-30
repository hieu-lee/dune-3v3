import {
  allyStarterCards,
  commanderStarterDecks,
  conflictCards,
  imperiumDeck,
  intrigueCards,
  leaderCardByName,
  reserveMarket,
  shaddamReservedContracts,
  standardContracts,
} from "./data";
import type {
  BoardSpace,
  Card,
  ConflictCard,
  ContractCard,
  FactionId,
  GameState,
  Influence,
  IntrigueCard,
  PendingAction,
  Player,
  ResourceId,
  Resources,
  Role,
  TradeGoodId,
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
  return cards.map((card) => ({
    ...card,
    icons: [...card.icons],
    revealGain: card.revealGain ? { ...card.revealGain } : undefined,
    traits: card.traits ? [...card.traits] : undefined,
  }));
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

function cloneIntrigues(intrigues: IntrigueCard[]) {
  return intrigues.map((intrigue) => ({
    ...intrigue,
    traits: intrigue.traits ? [...intrigue.traits] : undefined,
  }));
}

function buildSixPlayerConflictDeck() {
  const levelTwo = shuffleItems(conflictCards.filter((conflict) => conflict.level === 2)).slice(0, 5);
  const levelThree = shuffleItems(conflictCards.filter((conflict) => conflict.level === 3));
  return cloneConflicts([...levelTwo, ...levelThree]);
}

function buildChoamContractDeck() {
  if (standardContracts.length !== 18) {
    throw new Error(`Expected 18 public CHOAM contracts, found ${standardContracts.length}.`);
  }
  return cloneContracts(shuffleItems(standardContracts));
}

function buildShaddamContractReserve() {
  if (shaddamReservedContracts.length !== 2) {
    throw new Error(`Expected 2 Shaddam reserved contracts, found ${shaddamReservedContracts.length}.`);
  }
  return cloneContracts(shaddamReservedContracts);
}

function buildIntrigueDeck() {
  if (intrigueCards.length !== 39) {
    throw new Error(`Expected 39 Uprising Intrigue cards, found ${intrigueCards.length}.`);
  }
  return shuffleItems(cloneIntrigues(intrigueCards));
}

const shaddamPersonalBoardThroneSource = "Emperor personal board";

function buildStarterDeck(playerId: string, team: TeamId, role: Role) {
  const starterDeck = role === "Commander" ? commanderStarterDecks[team] : allyStarterCards;
  if (starterDeck.length !== 10) {
    throw new Error(`${team} ${role} starter deck must contain 10 cards, found ${starterDeck.length}.`);
  }
  return shuffleCards(
    cloneCards(starterDeck).map((card, index) => ({ ...card, id: `${playerId}-${card.id}-${index + 1}` })),
  );
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
    leaderCard: leaderCardByName(leader),
    team,
    role,
    color,
    vp: role === "Commander" ? 4 : 1,
    resources: { solari: 2, spice: 0, water: 1 },
    influence: emptyInfluence(),
    deck: buildStarterDeck(id, team, role),
    hand: [],
    discard: [],
    playArea: [],
    intrigues: [],
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
    reservedContracts: team === "shaddam" && role === "Commander" ? buildShaddamContractReserve() : [],
  };
  return drawCards(player, 5);
}

export function initialGame(): GameState {
  const market = shuffleCards(cloneCards(imperiumDeck));
  const [conflict, ...conflictDeck] = buildSixPlayerConflictDeck();
  if (!conflict) throw new Error("Missing Uprising conflict cards for six-player setup.");
  const contracts = buildChoamContractDeck();
  const intrigueDeck = buildIntrigueDeck();

  const players = [
    makePlayer("p1", "Seat 1", "Muad'Dib", "muaddib", "Commander", "#45c4b0"),
    makePlayer("p2", "Seat 2", "Feyd-Rautha Harkonnen", "shaddam", "Ally", "#d26b48"),
    makePlayer("p3", "Seat 3", "Gurney Halleck", "muaddib", "Ally", "#2f8fdd"),
    makePlayer("p4", "Seat 4", "Shaddam Corrino IV", "shaddam", "Commander", "#efb447"),
    makePlayer("p5", "Seat 5", "Lady Jessica", "muaddib", "Ally", "#8ad5ff"),
    makePlayer("p6", "Seat 6", "Princess Irulan", "shaddam", "Ally", "#f08f82"),
  ];

  const game: GameState = {
    round: 1,
    activeSeat: 0,
    firstSeat: 0,
    players,
    spaces: {},
    spyPosts: {},
    imperiumRow: market.slice(0, 5),
    marketDeck: market.slice(5),
    reserveMarket: cloneCards(reserveMarket),
    throneRow: [],
    contractOffer: contracts.slice(0, 2),
    contractDeck: contracts.slice(2),
    intrigueDeck,
    intrigueDiscard: [],
    conflict,
    conflictDeck,
    conflictDiscard: [],
    shieldWall: true,
    swordmasterClaimed: false,
    pendingQueue: [],
    log: [`Round 1 begins. ${conflict.name} is revealed. Muad'Dib has first action.`],
  };
  const setupPending = pendingActionForShaddamPersonalBoard(game);
  return setupPending
    ? {
        ...game,
        pendingAction: setupPending,
        log: [
          "Resolve Shaddam's starting Throne Row choice from the Emperor personal board.",
          ...game.log,
        ],
      }
    : game;
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

export function isFremenCard(card: Card) {
  return card.traits?.includes("Faction: Fremen") ?? false;
}

export function canMoveCardToThroneRow(card: Card) {
  return !isFremenCard(card);
}

export function pendingActionForShaddamPersonalBoard(state: GameState): PendingAction | undefined {
  const shaddam = state.players.find((player) => player.team === "shaddam" && player.role === "Commander");
  if (!shaddam || !state.imperiumRow.some(canMoveCardToThroneRow)) return undefined;
  return { kind: "throne-row", ownerId: shaddam.id, source: shaddamPersonalBoardThroneSource };
}

export function pendingActionForCard(card: Card, source: Player, state?: GameState): PendingAction | undefined {
  if (
    (card.sourceId === 561 || card.name === "Imperial Tent") &&
    source.team === "shaddam" &&
    source.role === "Commander" &&
    state?.imperiumRow.some(canMoveCardToThroneRow)
  ) {
    return { kind: "throne-row", ownerId: source.id, source: card.name };
  }
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
type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;
type ThroneRowPendingAction = Extract<PendingAction, { kind: "throne-row" }>;

function addPurchasedCard(player: Player, card: Card, fromReserve: boolean): Player {
  const purchaseSequence = player.purchaseSequence + 1;
  const acquiredCard = fromReserve
    ? { ...card, id: `${card.id}-${player.id}-${purchaseSequence}` }
    : card;
  return {
    ...player,
    vp: player.vp + (card.acquired ?? 0),
    persuasion: player.persuasion - (card.cost ?? 0),
    purchaseSequence,
    discard: [...player.discard, acquiredCard],
  };
}

export function acquireMarketCard(state: GameState, buyerId: string, cardId: string): GameState {
  if (state.pendingAction) return state;
  const buyer = state.players.find((player) => player.id === buyerId);
  if (!buyer || !buyer.revealed) return state;

  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = state.throneRow.find((card) => card.id === cardId);
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const rowCard = rowIndex >= 0 ? state.imperiumRow[rowIndex] : undefined;
  const card = reserveCard ?? throneCard ?? rowCard;
  if (!card || buyer.persuasion < (card.cost ?? 0)) return state;
  if (throneCard && buyer.team !== "shaddam") return state;

  const fromReserve = Boolean(reserveCard);
  const [replacement, ...marketDeckAfterDraw] = state.marketDeck;
  const marketDeck = rowCard ? marketDeckAfterDraw : state.marketDeck;
  const imperiumRow = rowCard
    ? state.imperiumRow.flatMap((candidate, index) => {
        if (index !== rowIndex) return [candidate];
        return replacement ? [replacement] : [];
      })
    : state.imperiumRow;
  const throneRow = throneCard ? state.throneRow.filter((candidate) => candidate.id !== card.id) : state.throneRow;
  const players = state.players.map((player) =>
    player.id === buyer.id ? addPurchasedCard(player, card, fromReserve) : player,
  );

  return {
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    log: [
      `${buyer.leader} acquires ${card.name}${card.acquired ? ` for ${card.acquired} VP` : ""}.`,
      ...state.log,
    ],
  };
}

export function moveImperiumCardToThroneRow(
  state: GameState,
  pending: ThroneRowPendingAction,
  cardId: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.team !== "shaddam" || owner.role !== "Commander") return state;

  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const card = state.imperiumRow[rowIndex];
  if (!card || !canMoveCardToThroneRow(card)) return state;

  const [replacement, ...marketDeck] = state.marketDeck;
  const imperiumRow = state.imperiumRow.flatMap((candidate, index) => {
    if (index !== rowIndex) return [candidate];
    return replacement ? [replacement] : [];
  });

  return {
    ...state,
    imperiumRow,
    marketDeck,
    throneRow: [...state.throneRow, card],
    ...advancePendingAction(state),
    log: [`${owner.leader} moves ${card.name} to the Throne Row from ${pending.source}.`, ...state.log],
  };
}

export function updateTradeSelection(
  state: GameState,
  pending: TradePendingAction,
  resource: TradeGoodId,
  partnerId?: string,
): GameState {
  const nextPartnerId = partnerId ?? pending.partnerId;
  const actor = state.players.find((player) => player.id === pending.actorId);
  const partner = state.players.find((player) => player.id === nextPartnerId);
  if (!actor || !partner || actor.id === partner.id || actor.team !== partner.team) return state;

  const transfersStarted = pending.actorGiven + pending.partnerGiven > 0;
  const selectionChanged = resource !== pending.resource || nextPartnerId !== pending.partnerId;
  if (transfersStarted && selectionChanged) return state;

  return {
    ...state,
    pendingAction: {
      ...pending,
      resource,
      partnerId: nextPartnerId,
      actorGiven: selectionChanged ? 0 : pending.actorGiven,
      partnerGiven: selectionChanged ? 0 : pending.partnerGiven,
    },
  };
}

export function takeChoamContract(state: GameState, pending: ContractPendingAction, contractId: string): GameState {
  const offerIndex = state.contractOffer.findIndex((contract) => contract.id === contractId);
  const contract = state.contractOffer[offerIndex];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const reservedIndex = owner.reservedContracts.findIndex((reserved) => reserved.id === contractId);

  if (!contract) {
    const reservedContract = owner.reservedContracts[reservedIndex];
    if (!reservedContract) return state;
    const players = state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            reservedContracts: player.reservedContracts.filter((reserved) => reserved.id !== contractId),
            contracts: [
              ...player.contracts,
              {
                card: reservedContract,
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
      ...advancePendingAction(state),
      log: [`${owner.leader} takes the reserved ${reservedContract.name} CHOAM contract from ${pending.source}.`, ...state.log],
    };
  }

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
  if (!owner || owner.reservedContracts.length > 0) return state;
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

export function transferTradeGood(
  state: GameState,
  pending: TradePendingAction,
  fromId: string,
  toId: string,
  intrigueId?: string,
): GameState {
  const from = state.players.find((player) => player.id === fromId);
  const to = state.players.find((player) => player.id === toId);
  if (!from || !to) return state;
  if (![pending.actorId, pending.partnerId].includes(fromId) || ![pending.actorId, pending.partnerId].includes(toId)) {
    return state;
  }
  if (fromId === toId) return state;
  if (from.team !== to.team) return state;

  const actorMoved = fromId === pending.actorId;
  const pendingAction = {
    ...pending,
    actorGiven: pending.actorGiven + (actorMoved ? 1 : 0),
    partnerGiven: pending.partnerGiven + (actorMoved ? 0 : 1),
  };

  if (pending.resource === "intrigue") {
    if (!intrigueId) return state;
    const card = from.intrigues.find((intrigue) => intrigue.id === intrigueId);
    if (!card) return state;
    const players = state.players.map((player) => {
      if (player.id === fromId) {
        return { ...player, intrigues: player.intrigues.filter((intrigue) => intrigue.id !== card.id) };
      }
      if (player.id === toId) {
        return { ...player, intrigues: [...player.intrigues, card] };
      }
      return player;
    });
    return {
      ...state,
      players,
      pendingAction,
      log: [`${from.leader} trades ${card.name} to ${to.leader}.`, ...state.log],
    };
  }

  const resource: ResourceId = pending.resource;
  if (from.resources[resource] <= 0) return state;
  const players = state.players.map((player) => {
    if (player.id === fromId) {
      return { ...player, resources: { ...player.resources, [resource]: player.resources[resource] - 1 } };
    }
    if (player.id === toId) {
      return { ...player, resources: { ...player.resources, [resource]: player.resources[resource] + 1 } };
    }
    return player;
  });
  return {
    ...state,
    players,
    pendingAction,
    log: [`${from.leader} trades 1 ${resource} to ${to.leader}.`, ...state.log],
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
    if (key === "intrigue") return;
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

export function drawIntrigueCards(state: GameState, ownerId: string, count: number, source: string): GameState {
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner || count <= 0) return state;

  let deck = [...state.intrigueDeck];
  let discard = [...state.intrigueDiscard];
  const drawn: IntrigueCard[] = [];

  while (drawn.length < count && (deck.length > 0 || discard.length > 0)) {
    if (deck.length === 0) {
      deck = shuffleItems(discard);
      discard = [];
    }
    const card = deck.shift();
    if (card) drawn.push(card);
  }

  if (drawn.length === 0) return state;

  const players = state.players.map((player) =>
    player.id === ownerId ? { ...player, intrigues: [...player.intrigues, ...drawn] } : player,
  );
  const cardText = drawn.length === 1 ? "an Intrigue card" : `${drawn.length} Intrigue cards`;

  return {
    ...state,
    players,
    intrigueDeck: deck,
    intrigueDiscard: discard,
    log: [`${owner.leader} draws ${cardText} from ${source}.`, ...state.log],
  };
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
