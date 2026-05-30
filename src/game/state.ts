import {
  allyStarterCards,
  battleIconLabels,
  boardSpaces,
  commanderStarterDecks,
  conflictCards,
  factionLabels,
  imperiumDeck,
  intrigueCards,
  leaderCardByName,
  reserveMarket,
  shaddamReservedContracts,
  sixPlayerObjectiveCards,
  standardContracts,
  teams,
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
  ObjectiveCard,
  PendingAction,
  Player,
  BattleIconId,
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

const secureSpiceTradeSourceId = 161;
const choamProfitsSourceId = 450;
const spiceMustFlowSourceId = 538;
const shadowAllianceSourceId = 160;
const shadowAllianceFactions: FactionId[] = [
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
];

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

function cloneObjectives(objectives: ObjectiveCard[]) {
  return objectives.map((objective) => ({ ...objective }));
}

function isStandardBattleIcon(icon: ConflictCard["battleIcon"]): icon is BattleIconId {
  return icon !== "wild";
}

function buildSixPlayerConflictDeck() {
  const levelTwo = shuffleItems(conflictCards.filter((conflict) => conflict.level === 2)).slice(0, 5);
  const levelThree = shuffleItems(conflictCards.filter((conflict) => conflict.level === 3));
  return cloneConflicts([...levelTwo, ...levelThree]);
}

const opposingAdjacentAllyIds: Record<string, string> = {
  p2: "p3",
  p3: "p2",
  p5: "p6",
  p6: "p5",
};

function objectiveIconCount(players: Player[], team: TeamId, battleIcon: ObjectiveCard["battleIcon"]) {
  return players
    .filter((player) => player.team === team)
    .flatMap((player) => player.objectives)
    .filter((objective) => objective.battleIcon === battleIcon)
    .length;
}

export function balanceSixPlayerObjectives(players: Player[]) {
  const overloadedTeam = (["muaddib", "shaddam"] as TeamId[]).find(
    (team) => objectiveIconCount(players, team, "desertMouse") === 2,
  );
  if (!overloadedTeam) return players;

  const desertMouseOwner = players.find((player) =>
    player.team === overloadedTeam
      && player.objectives.some((objective) => objective.id === "objective-desert-mouse-4-6p")
  );
  if (!desertMouseOwner) return players;

  const tradePartnerId = opposingAdjacentAllyIds[desertMouseOwner.id];
  const tradePartner = players.find((player) => player.id === tradePartnerId);
  if (!tradePartner || tradePartner.team === desertMouseOwner.team || tradePartner.objectives.length !== 1) {
    return players;
  }

  const ownerObjective = desertMouseOwner.objectives[0];
  const partnerObjective = tradePartner.objectives[0];
  return players.map((player) => {
    if (player.id === desertMouseOwner.id) return { ...player, objectives: [partnerObjective] };
    if (player.id === tradePartner.id) return { ...player, objectives: [ownerObjective] };
    return player;
  });
}

export function dealSixPlayerObjectives(players: Player[]) {
  const objectives = shuffleItems(cloneObjectives(sixPlayerObjectiveCards));
  const allies = players.filter((player) => player.role === "Ally");
  if (allies.length !== objectives.length) {
    throw new Error(`Expected ${objectives.length} Allies for six-player Objectives, found ${allies.length}.`);
  }

  const objectiveByPlayerId = new Map(allies.map((player, index) => [player.id, objectives[index]]));
  const assignedPlayers = players.map((player) => ({
    ...player,
    objectives: player.role === "Ally" ? [objectiveByPlayerId.get(player.id)!] : [],
  }));
  const balancedPlayers = balanceSixPlayerObjectives(assignedPlayers);
  const firstPlayerId = balancedPlayers.find((player) =>
    player.objectives.some((objective) => objective.firstPlayer)
  )?.id;
  const firstSeat = Math.max(0, balancedPlayers.findIndex((player) => player.id === firstPlayerId));
  return { players: balancedPlayers, firstSeat };
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
export const makerSpaceIds = boardSpaces.filter((space) => space.maker).map((space) => space.id);

function emptyMakerSpice(): Record<string, number> {
  return Object.fromEntries(makerSpaceIds.map((spaceId) => [spaceId, 0]));
}

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
    deployedTroops: 0,
    spies: 3,
    revealed: false,
    persuasion: 0,
    purchaseSequence: 0,
    swordmasterBonus: false,
    contracts: [],
    reservedContracts: team === "shaddam" && role === "Commander" ? buildShaddamContractReserve() : [],
    objectives: [],
    wonConflicts: [],
  };
  return drawCards(player, 5);
}

export function initialGame(): GameState {
  const market = shuffleCards(cloneCards(imperiumDeck));
  const [conflict, ...conflictDeck] = buildSixPlayerConflictDeck();
  if (!conflict) throw new Error("Missing Uprising conflict cards for six-player setup.");
  const contracts = buildChoamContractDeck();
  const intrigueDeck = buildIntrigueDeck();

  const playersBeforeObjectives = [
    makePlayer("p1", "Seat 1", "Muad'Dib", "muaddib", "Commander", "#45c4b0"),
    makePlayer("p2", "Seat 2", "Feyd-Rautha Harkonnen", "shaddam", "Ally", "#d26b48"),
    makePlayer("p3", "Seat 3", "Gurney Halleck", "muaddib", "Ally", "#2f8fdd"),
    makePlayer("p4", "Seat 4", "Shaddam Corrino IV", "shaddam", "Commander", "#efb447"),
    makePlayer("p5", "Seat 5", "Lady Jessica", "muaddib", "Ally", "#8ad5ff"),
    makePlayer("p6", "Seat 6", "Princess Irulan", "shaddam", "Ally", "#f08f82"),
  ];
  const { players, firstSeat } = dealSixPlayerObjectives(playersBeforeObjectives);

  const game: GameState = {
    phase: "playing",
    round: 1,
    activeSeat: firstSeat,
    firstSeat,
    players,
    spaces: {},
    spyPosts: {},
    alliances: {},
    combatPasses: [],
    makerSpice: emptyMakerSpice(),
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
    log: [
      `Round 1 begins. ${conflict.name} is revealed. ${players[firstSeat].leader} has first action.`,
      `Only Allies draw Objectives; ${players[firstSeat].leader} has the First Player marker.`,
    ],
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
type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type ReinforcePendingAction = Extract<PendingAction, { kind: "reinforce" }>;
type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;
type ThroneRowPendingAction = Extract<PendingAction, { kind: "throne-row" }>;
type RevealAdjustPendingAction = Extract<PendingAction, { kind: "reveal-adjust" }>;

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

export function setChoamContractCompleted(
  state: GameState,
  playerId: string,
  contractId: string,
  completed: boolean,
): GameState {
  const owner = state.players.find((player) => player.id === playerId);
  const contract = owner?.contracts.find((candidate) => candidate.card.id === contractId);
  if (!owner || !contract || contract.completed === completed) return state;

  const players = state.players.map((player) =>
    player.id === owner.id
      ? {
          ...player,
          contracts: player.contracts.map((candidate) =>
            candidate.card.id === contractId ? { ...candidate, completed } : candidate,
          ),
        }
      : player,
  );
  return {
    ...state,
    players,
    log: [
      `${owner.leader} ${completed ? "completes" : "marks incomplete"} the ${contract.card.name} CHOAM contract.`,
      ...state.log,
    ],
  };
}

export function setAllianceOwner(state: GameState, faction: FactionId, ownerId?: string): GameState {
  const previousOwnerId = state.alliances[faction];
  if (previousOwnerId === ownerId) return state;

  const owner = ownerId ? state.players.find((player) => player.id === ownerId) : undefined;
  if (ownerId && !owner) return state;
  const previousOwner = previousOwnerId
    ? state.players.find((player) => player.id === previousOwnerId)
    : undefined;

  const alliances = { ...state.alliances };
  if (ownerId) alliances[faction] = ownerId;
  else delete alliances[faction];

  const players = state.players.map((player) => {
    let vpDelta = 0;
    if (player.id === previousOwnerId) vpDelta -= 1;
    if (player.id === ownerId) vpDelta += 1;
    return vpDelta === 0 ? player : { ...player, vp: player.vp + vpDelta };
  });

  const label = factionLabels[faction];
  const logEntry = owner
    ? previousOwner
      ? `${owner.leader} takes the ${label} Alliance from ${previousOwner.leader}.`
      : `${owner.leader} claims the ${label} Alliance.`
    : previousOwner
      ? `${previousOwner.leader} returns the ${label} Alliance.`
      : undefined;

  return {
    ...state,
    alliances,
    players,
    log: logEntry ? [logEntry, ...state.log] : state.log,
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
  bonusSpice = 0,
): { source: Player; target: Player } {
  const resourcesNext = { ...sourcePlayer.resources };
  Object.entries(cost).forEach(([key, amount]) => {
    resourcesNext[key as ResourceId] -= amount ?? 0;
  });
  Object.entries(space.gain ?? {}).forEach(([key, amount]) => {
    if (key === "intrigue") return;
    resourcesNext[key as ResourceId] += amount ?? 0;
  });
  resourcesNext.spice += bonusSpice;

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

function faceUpBattleIconConflicts(player: Player, battleIcon: BattleIconId) {
  return player.wonConflicts.filter(
    (conflict) => !conflict.scored && (conflict.battleIcon === battleIcon || conflict.battleIcon === "wild"),
  );
}

export function endgameBattleIconChoices(state: GameState) {
  if (state.phase !== "endgame") return [];
  return state.players.flatMap((player) => {
    if (player.role !== "Ally") return [];
    return player.intrigues.flatMap((intrigue) => {
      if (!intrigue.battleIcon) return [];
      const battleIcon = intrigue.battleIcon;
      return faceUpBattleIconConflicts(player, battleIcon).map((conflict) => ({
        playerId: player.id,
        intrigueId: intrigue.id,
        conflictId: conflict.id,
        battleIcon,
      }));
    });
  });
}

export function scoreEndgameBattleIconIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  conflictId?: string,
): GameState {
  if (state.phase !== "endgame") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.role !== "Ally") return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue?.battleIcon) return state;
  const matches = faceUpBattleIconConflicts(player, intrigue.battleIcon);
  const conflict = conflictId
    ? matches.find((candidate) => candidate.id === conflictId)
    : matches[0];
  if (!conflict) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    return {
      ...candidate,
      vp: candidate.vp + 1,
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
      wonConflicts: candidate.wonConflicts.map((wonConflict) =>
        wonConflict.id === conflict.id ? { ...wonConflict, scored: true } : wonConflict,
      ),
    };
  });
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} scores ${intrigue.name} by flipping ${conflict.name} for 1 VP.`,
      ...state.log,
    ],
  };
}

function countPlayerCardsBySourceId(player: Player, sourceId: number) {
  return [...player.deck, ...player.hand, ...player.discard, ...player.playArea]
    .filter((card) => card.sourceId === sourceId)
    .length;
}

function commanderPersonalFaction(player: Player): FactionId | undefined {
  if (player.role !== "Commander") return undefined;
  return player.team === "muaddib" ? "fremen" : "emperor";
}

function effectiveEndgameInfluence(player: Player, faction: FactionId, players: Player[]) {
  if (player.role !== "Commander") return player.influence[faction];
  if (commanderPersonalFaction(player) === faction) return player.influence[faction];
  return Math.max(
    0,
    ...players
      .filter((candidate) => candidate.team === player.team && candidate.role === "Ally")
      .map((ally) => ally.influence[faction]),
  );
}

function hasShadowAllianceMatch(state: GameState, player: Player) {
  return shadowAllianceFactions.some((faction) => {
    if (effectiveEndgameInfluence(player, faction, state.players) < 4) return false;
    const ownerId = state.alliances[faction];
    const owner = ownerId ? state.players.find((candidate) => candidate.id === ownerId) : undefined;
    return Boolean(owner && owner.team !== player.team);
  });
}

function scoreableConditionalEndgameReward(state: GameState, player: Player, intrigue: IntrigueCard) {
  if (intrigue.sourceId === secureSpiceTradeSourceId) {
    return countPlayerCardsBySourceId(player, spiceMustFlowSourceId) >= 2 ? { vp: 1, spice: 2 } : undefined;
  }
  if (intrigue.sourceId === choamProfitsSourceId) {
    return player.contracts.filter((contract) => contract.completed).length >= 4 ? { vp: 1 } : undefined;
  }
  if (intrigue.sourceId === shadowAllianceSourceId) {
    return hasShadowAllianceMatch(state, player) ? { vp: 1 } : undefined;
  }
  return undefined;
}

export function endgameConditionalIntrigueChoices(state: GameState) {
  if (state.phase !== "endgame") return [];
  return state.players.flatMap((player) =>
    player.intrigues.flatMap((intrigue) => {
      const reward = scoreableConditionalEndgameReward(state, player, intrigue);
      return reward ? [{ playerId: player.id, intrigueId: intrigue.id, ...reward }] : [];
    }),
  );
}

export function scoreEndgameConditionalIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "endgame") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue) return state;
  const reward = scoreableConditionalEndgameReward(state, player, intrigue);
  if (!reward) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          vp: candidate.vp + reward.vp,
          resources: {
            ...candidate.resources,
            spice: candidate.resources.spice + (reward.spice ?? 0),
          },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} scores ${intrigue.name} for ${reward.vp} VP${reward.spice ? ` and ${reward.spice} spice` : ""}.`,
      ...state.log,
    ],
  };
}

export function playPlotBattleIconIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue?.battleIcon) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          resources: { ...candidate.resources, spice: candidate.resources.spice + 1 },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [`${player.leader} plays ${intrigue.name} as a Plot Intrigue for 1 spice.`, ...state.log],
  };
}

function allyHasUnitsInConflict(player: Player) {
  return player.role === "Ally" && player.deployedTroops > 0;
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

export function combatIntrigueTargets(state: GameState, actorId: string) {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor || !canActInCombat(state, actor)) return [];
  if (actor.role === "Ally") return allyHasUnitsInConflict(actor) ? [actor.id] : [];
  return state.players
    .filter((player) => player.team === actor.team && allyHasUnitsInConflict(player))
    .map((player) => player.id);
}

function firstCombatSeat(state: GameState, actorIds: string[]) {
  for (let offset = 0; offset < state.players.length; offset += 1) {
    const seat = (state.firstSeat + offset) % state.players.length;
    if (actorIds.includes(state.players[seat].id)) return seat;
  }
  return state.activeSeat;
}

function nextCombatSeat(state: GameState, actorIds: string[]) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const seat = (state.activeSeat + offset) % state.players.length;
    if (actorIds.includes(state.players[seat].id)) return seat;
  }
  return state.activeSeat;
}

export function startCombatPhase(state: GameState): GameState {
  if (state.pendingAction || state.pendingQueue.length > 0) return state;
  const actorIds = combatIntrigueActorIds(state);
  if (actorIds.length === 0) return startNextRound(state);
  const activeSeat = firstCombatSeat(state, actorIds);
  return {
    ...state,
    phase: "combat",
    activeSeat,
    combatPasses: [],
    pendingAction: undefined,
    pendingQueue: [],
    log: [`Combat begins. ${state.players[activeSeat].leader} may play Combat Intrigues or pass.`, ...state.log],
  };
}

export function maybeStartCombatPhase(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  if (state.pendingAction || state.pendingQueue.length > 0) return state;
  if (!allPlayersDone(state.players)) return state;
  return startCombatPhase(state);
}

export function passCombatIntrigue(state: GameState, actorId: string): GameState {
  if (state.phase !== "combat") return state;
  const actor = state.players[state.activeSeat];
  const actorIds = combatIntrigueActorIds(state);
  if (!actor || actor.id !== actorId || !actorIds.includes(actorId)) return state;

  const passLog = [`${actor.leader} passes Combat Intrigues.`, ...state.log];
  const combatPasses = [...state.combatPasses, actorId];
  if (combatPasses.length >= actorIds.length) {
    return startNextRound({ ...state, phase: "playing", combatPasses: [], log: passLog });
  }

  return {
    ...state,
    combatPasses,
    activeSeat: nextCombatSeat(state, actorIds),
    log: passLog,
  };
}

export function playCombatIntrigue(
  state: GameState,
  actorId: string,
  intrigueId: string,
  targetId?: string,
): GameState {
  if (state.phase !== "combat") return state;
  const actor = state.players[state.activeSeat];
  if (!actor || actor.id !== actorId) return state;
  const intrigue = actor.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue?.automatedCombatSwords) return state;
  const combatSwords = intrigue.automatedCombatSwords;
  const targets = combatIntrigueTargets(state, actor.id);
  const resolvedTargetId = targetId ?? targets[0];
  if (!resolvedTargetId || !targets.includes(resolvedTargetId)) return state;
  const target = state.players.find((player) => player.id === resolvedTargetId);
  if (!target) return state;

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === actor.id) {
      next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
    }
    if (player.id === target.id) {
      next = { ...next, conflict: next.conflict + combatSwords };
    }
    return next;
  });
  const nextState = { ...state, players, combatPasses: [], intrigueDiscard: [...state.intrigueDiscard, intrigue] };
  const actorIds = combatIntrigueActorIds(nextState);
  return {
    ...nextState,
    activeSeat: nextCombatSeat(nextState, actorIds),
    log: [
      `${actor.leader} plays ${intrigue.name} for ${target.leader}, adding ${combatSwords} strength.`,
      ...state.log,
    ],
  };
}

function signedAdjustment(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function finishRevealAdjustment(state: GameState, pending: RevealAdjustPendingAction): GameState {
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      `Printed reveal adjustment resolved: ${signedAdjustment(pending.persuasionAdjustment)} persuasion, ${signedAdjustment(pending.strengthAdjustment)} strength.`,
      ...state.log,
    ],
  };
}

export function deployTroopToConflict(state: GameState, pending: DeployPendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.garrison <= 0 || pending.remaining <= 0) return { ...state, ...advancePendingAction(state) };

  const players = state.players.map((player) =>
    player.id === pending.ownerId
      ? {
          ...player,
          garrison: player.garrison - 1,
          conflict: player.conflict + 2,
          deployedTroops: player.deployedTroops + 1,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  return {
    ...state,
    players,
    ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${owner.leader} deploys 1 troop from ${pending.source}.`, ...state.log],
  };
}

export function reinforceTroop(
  state: GameState,
  pending: ReinforcePendingAction,
  playerId: string,
  destination: "garrison" | "conflict",
): GameState {
  if (pending.remaining <= 0) return state;
  const recipient = state.players.find((player) => player.id === playerId);
  if (!recipient || recipient.team !== pending.team || recipient.role !== "Ally") return state;

  const players = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          garrison: destination === "garrison" ? player.garrison + 1 : player.garrison,
          conflict: destination === "conflict" ? player.conflict + 2 : player.conflict,
          deployedTroops: destination === "conflict" ? player.deployedTroops + 1 : player.deployedTroops,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  return {
    ...state,
    players,
    ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${recipient.leader} receives Military Support into ${destination}.`, ...state.log],
  };
}

function scoreBattleIconMatch(player: Player, conflict: ConflictCard) {
  const wonConflict: ConflictCard = { ...conflict, rewards: [...conflict.rewards], scored: false };
  if (!isStandardBattleIcon(conflict.battleIcon)) {
    return {
      player: { ...player, wonConflicts: [...player.wonConflicts, wonConflict] },
      matched: false,
      icon: conflict.battleIcon,
    };
  }

  const objectiveIndex = player.objectives.findIndex(
    (objective) => !objective.scored && objective.battleIcon === conflict.battleIcon,
  );
  if (objectiveIndex >= 0) {
    const objectives = player.objectives.map((objective, index) =>
      index === objectiveIndex ? { ...objective, scored: true } : objective,
    );
    return {
      player: {
        ...player,
        vp: player.vp + 1,
        objectives,
        wonConflicts: [...player.wonConflicts, { ...wonConflict, scored: true }],
      },
      matched: true,
      icon: conflict.battleIcon,
    };
  }

  const conflictIndex = player.wonConflicts.findIndex(
    (candidate) => !candidate.scored && candidate.battleIcon === conflict.battleIcon,
  );
  if (conflictIndex >= 0) {
    const wonConflicts = player.wonConflicts.map((candidate, index) =>
      index === conflictIndex ? { ...candidate, scored: true } : candidate,
    );
    return {
      player: {
        ...player,
        vp: player.vp + 1,
        wonConflicts: [...wonConflicts, { ...wonConflict, scored: true }],
      },
      matched: true,
      icon: conflict.battleIcon,
    };
  }

  return {
    player: { ...player, wonConflicts: [...player.wonConflicts, wonConflict] },
    matched: false,
    icon: conflict.battleIcon,
  };
}

function awardConflictToWinner(state: GameState, winner: Player, conflict: ConflictCard): GameState {
  const scored = scoreBattleIconMatch(winner, conflict);
  const players = state.players.map((player) => (player.id === winner.id ? scored.player : player));
  return {
    ...state,
    players,
    conflict: null,
    log: [
      scored.matched && isStandardBattleIcon(scored.icon)
        ? `${winner.leader} matches ${battleIconLabels[scored.icon]} battle icons and gains 1 VP.`
        : undefined,
      `${winner.leader} wins ${conflict.name} and takes the Conflict card.`,
      ...state.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

export function resolveCurrentConflict(state: GameState): GameState {
  if (!state.conflict) return state;

  const contenders = state.players.filter(
    (player) => player.role === "Ally" && player.deployedTroops > 0 && player.conflict > 0,
  );
  const bestStrength = Math.max(0, ...contenders.map((player) => player.conflict));
  const winners = contenders.filter((player) => player.conflict === bestStrength);

  if (winners.length !== 1) {
    const tiedTeam = winners[0]?.team;
    const sameTeamTie = winners.length > 1 && tiedTeam && winners.every((winner) => winner.team === tiedTeam);
    if (sameTeamTie) {
      return {
        ...state,
        pendingAction: {
          kind: "conflict-tie",
          team: tiedTeam,
          tiedPlayerIds: winners.map((winner) => winner.id),
          strength: bestStrength,
          source: state.conflict.name,
        },
        log: [
          `${teams[tiedTeam].name} Allies tie for ${state.conflict.name}; choose whether one Ally concedes first place.`,
          ...state.log,
        ],
      };
    }

    const reason = bestStrength === 0
      ? `${state.conflict.name} resolves with no winner.`
      : `${state.conflict.name} ends tied at ${bestStrength} strength; no one takes the Conflict card.`;
    return {
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      log: [reason, ...state.log],
    };
  }

  return awardConflictToWinner(state, winners[0], state.conflict);
}

type ConflictTiePendingAction = Extract<PendingAction, { kind: "conflict-tie" }>;

export function resolveConflictTie(
  state: GameState,
  pending: ConflictTiePendingAction,
  winnerId?: string,
): GameState {
  if (!state.conflict) return state;

  if (!winnerId) {
    return {
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      ...advancePendingAction(state),
      log: [`No Ally concedes ${state.conflict.name}; no one takes the Conflict card.`, ...state.log],
    };
  }

  const winner = state.players.find((player) =>
    player.id === winnerId &&
    player.team === pending.team &&
    pending.tiedPlayerIds.includes(player.id) &&
    player.role === "Ally"
  );
  if (!winner) return state;
  const awarded = awardConflictToWinner(state, winner, state.conflict);
  return {
    ...awarded,
    ...advancePendingAction(state),
    log: [
      `${winner.leader} takes first place after a same-team tie concession.`,
      ...awarded.log,
    ],
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

export function advanceMakerSpice(state: GameState): Record<string, number> {
  const makerSpice = { ...emptyMakerSpice(), ...state.makerSpice };
  makerSpaceIds.forEach((spaceId) => {
    if (!state.spaces[spaceId]) makerSpice[spaceId] += 1;
  });
  return makerSpice;
}

export function collectMakerSpice(state: GameState, space: BoardSpace): Record<string, number> {
  if (!space.maker) return state.makerSpice;
  return { ...emptyMakerSpice(), ...state.makerSpice, [space.id]: 0 };
}

function teamVictoryPoints(players: Player[], team: TeamId) {
  return players
    .filter((player) => player.team === team)
    .reduce((sum, player) => sum + player.vp, 0);
}

export function endgameTriggerReason(state: GameState): string | undefined {
  const leader = state.players.find((player) => player.vp >= 10);
  if (leader) return `${leader.leader} reached 10 VP.`;
  if (state.conflictDeck.length === 0) return "The Conflict deck is empty.";
  return undefined;
}

export function finishEndgame(state: GameState): GameState {
  if (state.phase === "finished") return state;
  const muaddibVp = teamVictoryPoints(state.players, "muaddib");
  const shaddamVp = teamVictoryPoints(state.players, "shaddam");
  const winningTeam = muaddibVp === shaddamVp ? undefined : muaddibVp > shaddamVp ? "muaddib" : "shaddam";
  return {
    ...state,
    phase: "finished",
    winningTeam,
    log: [
      winningTeam
        ? `${teams[winningTeam].name} wins ${Math.max(muaddibVp, shaddamVp)}-${Math.min(muaddibVp, shaddamVp)}.`
        : `The game ends tied at ${muaddibVp}-${shaddamVp}.`,
      ...state.log,
    ],
  };
}

export function startNextRound(state: GameState): GameState {
  const resolvedState = resolveCurrentConflict(state);
  if (resolvedState.pendingAction?.kind === "conflict-tie") return resolvedState;

  const endgameReason = endgameTriggerReason(resolvedState);
  if (endgameReason) {
    return {
      ...resolvedState,
      phase: "endgame",
      pendingAction: undefined,
      pendingQueue: [],
      combatPasses: [],
      endgameReason,
      log: [
        `Endgame triggered: ${endgameReason} Resolve Endgame Intrigue cards, then finalize team scores.`,
        ...resolvedState.log,
      ],
    };
  }

  const firstSeat = (resolvedState.firstSeat + 1) % resolvedState.players.length;
  const [nextConflict, ...conflictDeck] = resolvedState.conflictDeck;
  const players = resolvedState.players.map((player) =>
    drawCards(
      {
        ...player,
        agentsReady: player.agentsTotal,
        revealed: false,
        persuasion: 0,
        conflict: 0,
        deployedTroops: 0,
        hand: [],
        discard: [...player.discard, ...player.playArea, ...player.hand],
        playArea: [],
      },
      5,
    ),
  );
  return {
    ...resolvedState,
    phase: "playing",
    round: resolvedState.round + 1,
    firstSeat,
    activeSeat: firstSeat,
    players,
    spaces: {},
    makerSpice: advanceMakerSpice(resolvedState),
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: [],
    conflict: nextConflict ?? null,
    conflictDeck,
    log: [
      nextConflict
        ? `Round ${resolvedState.round + 1} begins. ${nextConflict.name} is revealed. ${players[firstSeat].leader} has first action.`
        : `Round ${resolvedState.round + 1} begins with no conflict cards remaining. ${players[firstSeat].leader} has first action.`,
      ...resolvedState.log,
    ],
  };
}
