import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyStarterDeckDemandAttention({
  data,
  game,
  players: { muadDib, shaddamAlly, muadDibAllyA, muadDibAllyB },
  state,
}) {
  const demandAttention = data.muadDibCommanderCards.find((card) => card.name === "Demand Attention");
  assert.ok(demandAttention, "Muad'Dib Commander deck should include Demand Attention");
  assert.equal(
    state.isDemandAttentionCommanderCard(demandAttention),
    true,
    "Demand Attention should be recognized as its Commander starter card",
  );
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(secrets, "Secrets should exist for Demand Attention faction-space regression");
  const arrakeenForDemandAttention = data.boardSpaces.find((space) => space.id === "arrakeen");
  assert.ok(arrakeenForDemandAttention, "Arrakeen should exist for Demand Attention non-faction regression");
  const desertMastery = data.boardSpaces.find((space) => space.id === "desert-mastery");
  assert.ok(desertMastery, "Desert Mastery should exist for Demand Attention personal-space regression");
  const espionage = data.boardSpaces.find((space) => space.id === "espionage");
  assert.ok(espionage, "Espionage should exist for Demand Attention queue-order regression");
  const baseDemandAttentionSource = {
    ...muadDib,
    resources: { solari: 4, spice: 0, water: 0 },
    playArea: [demandAttention],
  };
  const baseDemandAttentionTarget = {
    ...muadDibAllyA,
    influence: { ...muadDibAllyA.influence, bene: 1 },
  };
  const demandAttentionBoardEffect = state.applyBoardEffect(
    baseDemandAttentionSource,
    baseDemandAttentionTarget,
    secrets,
  );
  assert.equal(
    demandAttentionBoardEffect.target.influence.bene,
    2,
    "Secrets should first give the activated Muad'Dib Ally 1 Bene Gesserit Influence",
  );
  assert.equal(
    demandAttentionBoardEffect.target.vp,
    muadDibAllyA.vp + 1,
    "Secrets should score exactly 1 VP when the activated Ally reaches 2 Bene Gesserit Influence",
  );
  const demandAttentionPending = state.pendingActionForCard(
    demandAttention,
    demandAttentionBoardEffect.source,
    game,
    demandAttentionBoardEffect.target,
    secrets,
  );
  assert.deepEqual(demandAttentionPending, {
    kind: "demand-attention",
    commanderId: muadDib.id,
    recipientId: muadDibAllyA.id,
    faction: "bene",
    cardId: demandAttention.id,
    source: "Demand Attention",
  });
  const demandAttentionSpySource = { ...demandAttentionBoardEffect.source, spies: 1 };
  const espionageSpacePending = state.pendingActionForSpace(
    espionage,
    demandAttentionSpySource,
    demandAttentionBoardEffect.target,
    game.players,
  );
  assert.deepEqual(espionageSpacePending, {
    kind: "spy",
    ownerId: muadDib.id,
    remaining: 1,
    source: "Espionage",
  });
  const espionageDemandAttentionPending = state.pendingActionForCard(
    demandAttention,
    demandAttentionSpySource,
    game,
    demandAttentionBoardEffect.target,
    espionage,
  );
  assert.deepEqual(
    state.pendingActionsFor(espionageSpacePending, espionageDemandAttentionPending, demandAttentionSpySource.spies),
    [espionageSpacePending, espionageDemandAttentionPending],
    "Demand Attention should queue after a faction-space pending action on the same Agent turn",
  );
  assert.equal(
    state.pendingActionForCard(
      demandAttention,
      { ...demandAttentionBoardEffect.source, resources: { solari: 3, spice: 0, water: 0 } },
      game,
      demandAttentionBoardEffect.target,
      secrets,
    ),
    undefined,
    "Demand Attention should not queue when Muad'Dib cannot pay 4 Solari",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, demandAttentionBoardEffect.source, game, shaddamAlly, secrets),
    undefined,
    "Demand Attention should not target an opposing Ally",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, muadDibAllyA, game, muadDibAllyB, secrets),
    undefined,
    "Demand Attention should not trigger from an Ally starter deck owner",
  );
  assert.equal(
    state.pendingActionForCard(
      demandAttention,
      demandAttentionBoardEffect.source,
      game,
      demandAttentionBoardEffect.target,
      arrakeenForDemandAttention,
    ),
    undefined,
    "Demand Attention should not queue on non-faction spaces",
  );
  assert.equal(
    state.pendingActionForCard(demandAttention, demandAttentionBoardEffect.source, game, demandAttentionBoardEffect.target),
    undefined,
    "Demand Attention should need a faction space",
  );

  const baseDemandAttentionResolution = {
    ...game,
    pendingAction: demandAttentionPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === muadDib.id) return demandAttentionBoardEffect.source;
      if (player.id === muadDibAllyA.id) return demandAttentionBoardEffect.target;
      return player;
    }),
    log: [],
  };
  const resolvedDemandAttention = state.resolveDemandAttentionChoice(
    baseDemandAttentionResolution,
    demandAttentionPending,
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDib.id).resources.solari,
    0,
    "Demand Attention resolution spends 4 Muad'Dib Solari",
  );
  assert.deepEqual(
    playerById(resolvedDemandAttention, muadDib.id).playArea,
    [],
    "Demand Attention resolution trashes Demand Attention from play",
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDibAllyA.id).influence.bene,
    3,
    "Demand Attention should upgrade the activated Ally's faction visit from 1 Influence to 2",
  );
  assert.equal(
    playerById(resolvedDemandAttention, muadDibAllyA.id).vp,
    muadDibAllyA.vp + 1,
    "Demand Attention should not score a second VP when the activated Ally was already at 2 Influence",
  );
  assert.equal(resolvedDemandAttention.pendingAction, undefined, "Demand Attention resolution should advance pending action");
  assert.match(resolvedDemandAttention.log[0], /spends 4 Solari for Demand Attention/, "Demand Attention should log resolution");

  const skippedDemandAttention = state.skipDemandAttention(baseDemandAttentionResolution, demandAttentionPending);
  assert.equal(
    playerById(skippedDemandAttention, muadDib.id).resources.solari,
    4,
    "Skipping Demand Attention should not spend Muad'Dib Solari",
  );
  assert.deepEqual(
    playerById(skippedDemandAttention, muadDib.id).playArea,
    [demandAttention],
    "Skipping Demand Attention should keep Demand Attention in play",
  );
  assert.equal(
    playerById(skippedDemandAttention, muadDibAllyA.id).influence.bene,
    2,
    "Skipping Demand Attention should keep only the printed board-space Influence",
  );
  assert.equal(
    playerById(skippedDemandAttention, muadDibAllyA.id).vp,
    muadDibAllyA.vp + 1,
    "Skipping Demand Attention should keep only the printed board-space VP gain",
  );
  const noCardDemandAttentionState = {
    ...baseDemandAttentionResolution,
    players: baseDemandAttentionResolution.players.map((player) =>
      player.id === muadDib.id ? { ...player, playArea: [] } : player,
    ),
  };
  assert.equal(
    state.resolveDemandAttentionChoice(noCardDemandAttentionState, demandAttentionPending),
    noCardDemandAttentionState,
    "Demand Attention should not resolve if the card is no longer in play",
  );
  const missingRecipientDemandAttentionState = {
    ...baseDemandAttentionResolution,
    players: baseDemandAttentionResolution.players.filter((player) => player.id !== muadDibAllyA.id),
  };
  assert.equal(
    state.resolveDemandAttentionChoice(missingRecipientDemandAttentionState, demandAttentionPending),
    missingRecipientDemandAttentionState,
    "Demand Attention should not resolve if the pending recipient is no longer in the game",
  );

  const personalDemandAttentionSource = {
    ...baseDemandAttentionSource,
    influence: { ...muadDib.influence, fremen: 0 },
    vp: muadDib.vp,
  };
  const personalDemandAttentionTarget = {
    ...muadDibAllyB,
    influence: { ...muadDibAllyB.influence, fremen: 0 },
  };
  const personalDemandAttentionBoardEffect = state.applyBoardEffect(
    personalDemandAttentionSource,
    personalDemandAttentionTarget,
    desertMastery,
  );
  assert.equal(
    personalDemandAttentionBoardEffect.source.influence.fremen,
    1,
    "Muad'Dib personal Fremen spaces should first give their printed Influence to the Commander",
  );
  assert.equal(
    personalDemandAttentionBoardEffect.target.influence.fremen,
    0,
    "Muad'Dib personal Fremen spaces should not give printed Influence to the activated Ally",
  );
  const personalDemandAttentionPending = state.pendingActionForCard(
    demandAttention,
    personalDemandAttentionBoardEffect.source,
    game,
    personalDemandAttentionBoardEffect.target,
    desertMastery,
  );
  assert.deepEqual(personalDemandAttentionPending, {
    kind: "demand-attention",
    commanderId: muadDib.id,
    recipientId: muadDib.id,
    faction: "fremen",
    cardId: demandAttention.id,
    source: "Demand Attention",
  });
  const resolvedPersonalDemandAttention = state.resolveDemandAttentionChoice(
    {
      ...game,
      pendingAction: personalDemandAttentionPending,
      pendingQueue: [],
      players: game.players.map((player) => {
        if (player.id === muadDib.id) return personalDemandAttentionBoardEffect.source;
        if (player.id === muadDibAllyB.id) return personalDemandAttentionBoardEffect.target;
        return player;
      }),
      log: [],
    },
    personalDemandAttentionPending,
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDib.id).influence.fremen,
    2,
    "Demand Attention should upgrade Muad'Dib's personal-space Influence when the Commander received the board effect",
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDib.id).vp,
    muadDib.vp + 1,
    "Demand Attention should score Muad'Dib once when the personal-space upgrade reaches 2 Fremen Influence",
  );
  assert.equal(
    playerById(resolvedPersonalDemandAttention, muadDibAllyB.id).influence.fremen,
    0,
    "Demand Attention should not redirect personal-space Influence to the activated Ally",
  );
}
