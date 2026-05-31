import {
  addAcquiredCard,
  callToArmsRecruitOwner,
} from "./market-rules";
import { advancePendingAction } from "./pending-actions";
import type {
  GameState,
  PendingAction,
} from "./types";

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type FinishPendingResolution = (state: GameState) => GameState;

export function resolveTakeChoamContract(
  state: GameState,
  pending: ContractPendingAction,
  contractId: string,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  const offerIndex = state.contractOffer.findIndex((contract) => contract.id === contractId);
  const contract = state.contractOffer[offerIndex];
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const reservedIndex = owner.reservedContracts.findIndex((reserved) => reserved.id === contractId);

  if (!contract) {
    if (pending.publicOnly) return state;
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
    return finishPendingResolution({
      ...state,
      players,
      ...advancePendingAction(state),
      log: [`${owner.leader} takes the reserved ${reservedContract.name} CHOAM contract from ${pending.source}.`, ...state.log],
    });
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
  return finishPendingResolution({
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [`${owner.leader} takes the ${contract.name} CHOAM contract from ${pending.source}.`, ...state.log],
  });
}

export function resolveAcquireCardForPending(
  state: GameState,
  pending: AcquireCardPendingAction,
  cardId: string,
  finishPendingResolution: FinishPendingResolution,
  callToArmsRecruitOwnerId?: string,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;

  const reserveCard = state.reserveMarket.find((card) => card.id === cardId);
  const throneCard = owner.team === "shaddam" ? state.throneRow.find((card) => card.id === cardId) : undefined;
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const rowCard = rowIndex >= 0 ? state.imperiumRow[rowIndex] : undefined;
  const card = reserveCard ?? throneCard ?? rowCard;
  const minCost = pending.minCost ?? 0;
  const cardCost = card?.cost ?? 0;
  if (!card || cardCost < minCost || cardCost > pending.maxCost) return state;

  const [replacement, ...marketDeckAfterDraw] = state.marketDeck;
  const marketDeck = rowCard ? marketDeckAfterDraw : state.marketDeck;
  const imperiumRow = rowCard
    ? state.imperiumRow.flatMap((candidate, index) => {
        if (index !== rowIndex) return [candidate];
        return replacement ? [replacement] : [];
      })
    : state.imperiumRow;
  const throneRow = throneCard ? state.throneRow.filter((candidate) => candidate.id !== card.id) : state.throneRow;
  const callToArmsRecruit = state.phase === "playing" && owner.revealed
    ? callToArmsRecruitOwner(state, owner, callToArmsRecruitOwnerId)
    : { valid: true, owner: undefined };
  if (!callToArmsRecruit.valid) return state;
  const recruitOwner = callToArmsRecruit.owner;
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) {
      next = addAcquiredCard(player, card, Boolean(reserveCard), pending.destination);
    }
    if (recruitOwner && player.id === recruitOwner.id) {
      next = { ...next, garrison: next.garrison + 1 };
    }
    return next;
  });
  const destinationText = pending.destination === "hand" ? "hand" : "discard pile";
  const recruitText = recruitOwner
    ? recruitOwner.id === owner.id
      ? " and recruits 1 troop"
      : ` and ${recruitOwner.leader} recruits 1 troop`
    : "";
  return finishPendingResolution({
    ...state,
    players,
    imperiumRow,
    marketDeck,
    throneRow,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} acquires ${card.name} to their ${destinationText} from ${pending.source}${recruitText}.`,
      ...state.log,
    ],
  });
}

export function resolveChoamContractFallback(
  state: GameState,
  pending: ContractPendingAction,
  finishPendingResolution: FinishPendingResolution,
): GameState {
  if (pending.publicOnly) return state;
  if (state.contractOffer.length > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.reservedContracts.length > 0) return state;
  const players = state.players.map((player) =>
    player.id === owner.id
      ? { ...player, resources: { ...player.resources, solari: player.resources.solari + 2 } }
      : player,
  );
  return finishPendingResolution({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [`${owner.leader} gains 2 Solari from ${pending.source}; no CHOAM contracts remain.`, ...state.log],
  });
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
