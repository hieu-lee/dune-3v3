import assert from "node:assert/strict";

import { playerById } from "./verify-leaders-fixtures.mjs";

export function verifyLeaderIrulanSignetAndBirthright({ cards, game, players, spaces, state }) {
  const { allySignet, changeAllegiances, costOneImperiumCard, intrigueCard } = cards;
  const { emperor, irulan } = players;
  const { arrakeen } = spaces;

  const freeImperiumCard = {
    ...costOneImperiumCard,
    id: `${costOneImperiumCard.id}-free-regression`,
    name: "Free Regression",
    cost: 0,
  };
  const replacementImperiumCard = {
    ...costOneImperiumCard,
    id: `${costOneImperiumCard.id}-replacement-regression`,
    name: "Replacement Regression",
    cost: 2,
  };
  const irulanSignetOwner = {
    ...irulan,
    hand: [],
    playArea: [allySignet],
  };
  const irulanSignetState = {
    ...game,
    imperiumRow: [freeImperiumCard, costOneImperiumCard],
    marketDeck: [replacementImperiumCard],
    reserveMarket: [],
    throneRow: [],
    players: game.players.map((player) => (player.id === irulan.id ? irulanSignetOwner : player)),
  };
  const irulanSignetPending = state.pendingActionForCard(
    allySignet,
    irulanSignetOwner,
    irulanSignetState,
    irulanSignetOwner,
    arrakeen,
  );
  assert.deepEqual(irulanSignetPending, {
    kind: "pending-action-choice",
    ownerId: irulan.id,
    cardId: allySignet.id,
    source: "Chronicler's Insight",
    options: [{
      id: "acquire",
      label: "Acquire cost-1 card to hand",
      pending: {
        kind: "acquire-card",
        ownerId: irulan.id,
        source: "Chronicler's Insight",
        minCost: 1,
        maxCost: 1,
        destination: "hand",
        optional: false,
      },
    }],
  });
  assert.deepEqual(
    state.acquirableCardsForPending(irulanSignetState, irulanSignetPending.options[0].pending).map((card) => card.id),
    [costOneImperiumCard.id],
    "Chronicler's Insight should acquire exactly cost-1 cards, not cost-0 cards",
  );
  const irulanAcquireChoice = state.resolvePendingActionChoice(
    { ...irulanSignetState, pendingAction: irulanSignetPending, pendingQueue: [] },
    irulanSignetPending,
    "acquire",
  );
  assert.deepEqual(irulanAcquireChoice.pendingAction, {
    kind: "acquire-card",
    ownerId: irulan.id,
    source: "Chronicler's Insight",
    minCost: 1,
    maxCost: 1,
    destination: "hand",
    optional: false,
  });
  const blockedFreeAcquire = state.acquireCardForPending(
    irulanAcquireChoice,
    irulanAcquireChoice.pendingAction,
    freeImperiumCard.id,
  );
  assert.equal(
    playerById(blockedFreeAcquire, irulan.id).hand.some((card) => card.id === freeImperiumCard.id),
    false,
    "Chronicler's Insight resolver should reject cost-0 cards",
  );
  assert.deepEqual(
    blockedFreeAcquire.pendingAction,
    irulanAcquireChoice.pendingAction,
    "Rejected Chronicler's Insight acquisition should keep the pending action unresolved",
  );
  const irulanAcquired = state.acquireCardForPending(
    irulanAcquireChoice,
    irulanAcquireChoice.pendingAction,
    costOneImperiumCard.id,
  );
  assert.equal(
    playerById(irulanAcquired, irulan.id).hand.some((card) => card.id === costOneImperiumCard.id),
    true,
    "Chronicler's Insight should acquire the cost-1 card to Irulan's hand",
  );
  assert.equal(
    playerById(irulanAcquired, irulan.id).hand.some((card) => card.id === freeImperiumCard.id),
    false,
    "Chronicler's Insight should not acquire cost-0 cards",
  );

  const trashCostOneCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-cost-one`, cost: 1 };
  const trashFreeCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-free`, name: "Free Trash", cost: 0 };
  const trashDiscardCard = { ...costOneImperiumCard, id: `${costOneImperiumCard.id}-trash-discard`, cost: 1 };
  const irulanTrashOwner = {
    ...irulan,
    resources: { ...irulan.resources, spice: 0 },
    hand: [trashCostOneCard, trashFreeCard],
    discard: [trashDiscardCard],
    playArea: [allySignet],
  };
  const irulanTrashState = {
    ...game,
    imperiumRow: [],
    reserveMarket: [],
    throneRow: [],
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) => (player.id === irulan.id ? irulanTrashOwner : player)),
  };
  const irulanTrashPending = state.pendingActionForCard(
    allySignet,
    irulanTrashOwner,
    irulanTrashState,
    irulanTrashOwner,
    arrakeen,
  );
  assert.deepEqual(irulanTrashPending, {
    kind: "pending-action-choice",
    ownerId: irulan.id,
    cardId: allySignet.id,
    source: "Chronicler's Insight",
    options: [{
      id: "trash",
      label: "Trash hand card",
      pending: {
        kind: "trash-card",
        ownerId: irulan.id,
        source: "Chronicler's Insight",
        optional: false,
        zones: ["hand"],
        spiceRewardCostThreshold: 1,
        spiceReward: 2,
      },
    }],
  });
  const irulanTrashChoice = state.resolvePendingActionChoice(
    { ...irulanTrashState, pendingAction: irulanTrashPending },
    irulanTrashPending,
    "trash",
  );
  assert.equal(irulanTrashChoice.pendingAction.kind, "trash-card", "Chronicler's Insight should queue a trash-card pending action");
  assert.deepEqual(irulanTrashChoice.pendingAction.zones, ["hand"], "Chronicler's Insight should only trash from hand");
  assert.deepEqual(
    state.trashableCardsForPending(playerById(irulanTrashChoice, irulan.id), irulanTrashChoice.pendingAction)
      .map(({ zone, card }) => `${zone}:${card.id}`),
    [`hand:${trashCostOneCard.id}`, `hand:${trashFreeCard.id}`],
    "Chronicler's Insight trash choices should exclude discard and play area cards",
  );
  const blockedDiscardTrash = state.trashPlayerCard(
    irulanTrashChoice,
    irulanTrashChoice.pendingAction,
    "discard",
    trashDiscardCard.id,
  );
  assert.equal(
    playerById(blockedDiscardTrash, irulan.id).discard.length,
    1,
    "Chronicler's Insight should reject non-hand trash targets",
  );
  const freeTrash = state.trashPlayerCard(irulanTrashChoice, irulanTrashChoice.pendingAction, "hand", trashFreeCard.id);
  assert.equal(playerById(freeTrash, irulan.id).resources.spice, 0, "Trashing a cost-0 card should not pay Irulan spice");
  assert.equal(freeTrash.turnSpiceGains[irulan.id] ?? 0, 0, "Cost-0 Irulan trash should not count as a spice gain");
  const paidTrash = state.trashPlayerCard(irulanTrashChoice, irulanTrashChoice.pendingAction, "hand", trashCostOneCard.id);
  assert.equal(playerById(paidTrash, irulan.id).resources.spice, 2, "Trashing a cost-1 card should pay Irulan 2 spice");
  assert.equal(paidTrash.turnSpiceGains[irulan.id], 2, "Irulan's trash reward should count as a spice gain this turn");

  const irulanBirthrightBase = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === irulan.id
        ? { ...player, influence: { ...player.influence, greatHouses: 1 }, intrigues: [] }
        : player,
    ),
  };
  const irulanBirthrightReached = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...irulanBirthrightBase,
      players: irulanBirthrightBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightBase.players,
  );
  assert.equal(playerById(irulanBirthrightReached, irulan.id).influence.greatHouses, 2, "Irulan should reach Great Houses 2 Influence");
  assert.equal(playerById(irulanBirthrightReached, irulan.id).vp, irulan.vp + 1, "Irulan should still score the 2-Influence VP");
  assert.equal(playerById(irulanBirthrightReached, irulan.id).intrigues.length, 1, "Imperial Birthright should draw one Intrigue at 2 Great Houses Influence");
  const irulanBirthrightNoRepeatBase = {
    ...irulanBirthrightBase,
    intrigueDeck: [intrigueCard],
    players: irulanBirthrightBase.players.map((player) =>
      player.id === irulan.id
        ? { ...player, influence: { ...player.influence, greatHouses: 2 }, intrigues: [] }
        : player,
    ),
  };
  const irulanBirthrightNoRepeat = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...irulanBirthrightNoRepeatBase,
      players: irulanBirthrightNoRepeatBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightNoRepeatBase.players,
  );
  assert.equal(playerById(irulanBirthrightNoRepeat, irulan.id).intrigues.length, 0, "Imperial Birthright should not trigger at 2 -> 3 Influence");
  const irulanBirthrightDropped = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...irulanBirthrightNoRepeatBase,
      players: irulanBirthrightNoRepeatBase.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", -1) : player,
      ),
    },
    irulanBirthrightNoRepeatBase.players,
  );
  const irulanBirthrightRegained = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...irulanBirthrightDropped,
      intrigueDeck: [intrigueCard],
      players: irulanBirthrightDropped.players.map((player) =>
        player.id === irulan.id ? state.adjustInfluence(player, "greatHouses", 1) : player,
      ),
    },
    irulanBirthrightDropped.players,
  );
  assert.equal(playerById(irulanBirthrightRegained, irulan.id).intrigues.length, 1, "Imperial Birthright should trigger again after Irulan drops below 2 and regains it");
  const irulanChangeAllegiancesBase = {
    ...game,
    activeSeat: game.players.findIndex((player) => player.id === irulan.id),
    pendingAction: undefined,
    pendingQueue: [],
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === irulan.id
        ? {
            ...player,
            influence: { ...player.influence, greatHouses: 2 },
            intrigues: [changeAllegiances],
          }
        : player,
    ),
  };
  const irulanChangeSameFaction = state.playChangeAllegiancesPlotIntrigue(
    irulanChangeAllegiancesBase,
    irulan.id,
    changeAllegiances.id,
    { kind: "shift", loseFaction: "greatHouses", gainFaction: "greatHouses" },
  );
  assert.equal(playerById(irulanChangeSameFaction, irulan.id).influence.greatHouses, 2, "Change Allegiances should keep same-Faction Great Houses net-zero");
  assert.equal(playerById(irulanChangeSameFaction, irulan.id).intrigues.length, 1, "Irulan should draw when Change Allegiances drops and regains Great Houses 2 Influence");
  assert.equal(playerById(irulanChangeSameFaction, irulan.id).intrigues[0].id, intrigueCard.id, "Irulan's Change Allegiances Birthright draw should use the Intrigue deck");
  assert.match(irulanChangeSameFaction.log[1], /Imperial Birthright/, "Irulan's same-Faction Change Allegiances reward should log after the played Intrigue");
  const shaddamPersonalBirthrightBase = {
    ...game,
    intrigueDeck: [intrigueCard],
    intrigueDiscard: [],
    players: game.players.map((player) =>
      player.id === emperor.id
        ? { ...player, influence: { ...player.influence, emperor: 1 } }
        : player.id === irulan.id
          ? { ...player, intrigues: [] }
          : player,
    ),
  };
  const shaddamPersonalBirthright = state.resolveLeaderInfluenceThresholdRewards(
    {
      ...shaddamPersonalBirthrightBase,
      players: shaddamPersonalBirthrightBase.players.map((player) =>
        player.id === emperor.id ? state.adjustInfluence(player, "emperor", 1) : player,
      ),
    },
    shaddamPersonalBirthrightBase.players,
  );
  assert.equal(playerById(shaddamPersonalBirthright, irulan.id).intrigues.length, 0, "Shaddam reaching personal Emperor 2 should not trigger Irulan");

}
