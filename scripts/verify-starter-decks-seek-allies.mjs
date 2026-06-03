import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

function seekAlliesFrom(cards, label) {
  const card = cards.find((candidate) => candidate.name === "Seek Allies");
  assert.ok(card, `${label} should include Seek Allies`);
  return card;
}

function assertSeekAlliesSpec(card, label) {
  assert.equal(card.trashOnPlay, undefined, `${label} should not use legacy trashOnPlay`);
  assert.deepEqual(
    card.effects,
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "trash-card",
            selector: "self",
            optional: false,
            zones: ["playArea"],
            sourceOnly: true,
          },
        ],
        conditions: undefined,
      },
    ],
    `${label} should use a mandatory typed source-card trash Agent effect`,
  );
}

function assertSeekAlliesPending({ card, game, label, source, state, target }) {
  const playedCard = {
    ...card,
    agentPlacementSpaceId: "seek-allies-test-space",
    agentPlacementTargetOwnerId: target.id,
  };
  const sourceWithCard = { ...source, hand: [], playArea: [playedCard] };
  const pendingGame = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === source.id ? sourceWithCard : player),
    log: [],
  };
  const pending = state.pendingActionForCard(
    card,
    sourceWithCard,
    pendingGame,
    target,
    { id: "seek-allies-test-space" },
  );
  assert.deepEqual(
    pending,
    {
      kind: "trash-card",
      ownerId: source.id,
      source: "Seek Allies",
      optional: false,
      zones: ["playArea"],
      requiredCardId: card.id,
      requiredAgentPlacementSpaceId: "seek-allies-test-space",
      requiredAgentPlacementTargetOwnerId: target.id,
    },
    `${label} should queue a mandatory source-card trash pending action`,
  );
  assert.equal(
    state.pendingActionForCard(card, { ...source, playArea: [] }, pendingGame, target, { id: "seek-allies-test-space" }),
    undefined,
    `${label} should require the played source card in the owner's play area`,
  );
  assert.equal(
    state.pendingActionForCard(card, sourceWithCard, pendingGame, target, { id: "different-space" }),
    undefined,
    `${label} should pin the pending choice to the placed Agent space`,
  );

  const unresolvedGame = { ...pendingGame, pendingAction: pending, pendingQueue: [] };
  const skipped = state.skipTrashCard(unresolvedGame, pending);
  assert.deepEqual(skipped.pendingAction, pending, `${label} should not skip a resolvable mandatory trash`);

  const resolved = state.trashPlayerCard(unresolvedGame, pending, "playArea", card.id);
  assert.equal(
    playerById(resolved, source.id).playArea.some((candidate) => candidate.id === card.id),
    false,
    `${label} should remove the source card from play when trashed`,
  );
  assert.equal(resolved.pendingAction, undefined, `${label} should advance after trashing the source card`);
  assert.match(resolved.log[0], /trashes Seek Allies from Seek Allies/, `${label} should log the source trash`);
}

export function verifyStarterDeckSeekAllies({
  data,
  game,
  players: { muadDib, shaddamAlly, muadDibAllyA, emperor },
  state,
}) {
  const allySeekAllies = seekAlliesFrom(data.allyStarterCards, "Ally deck");
  const muadDibSeekAllies = seekAlliesFrom(data.muadDibCommanderCards, "Muad'Dib Commander deck");
  const emperorSeekAllies = seekAlliesFrom(data.emperorCommanderCards, "Emperor Commander deck");

  assertSeekAlliesSpec(allySeekAllies, "Ally Seek Allies");
  assertSeekAlliesSpec(muadDibSeekAllies, "Muad'Dib Seek Allies");
  assertSeekAlliesSpec(emperorSeekAllies, "Emperor Seek Allies");

  assertSeekAlliesPending({
    card: allySeekAllies,
    game,
    label: "Ally Seek Allies",
    source: shaddamAlly,
    state,
    target: shaddamAlly,
  });
  assertSeekAlliesPending({
    card: muadDibSeekAllies,
    game,
    label: "Muad'Dib Seek Allies",
    source: muadDib,
    state,
    target: muadDibAllyA,
  });
  assertSeekAlliesPending({
    card: emperorSeekAllies,
    game,
    label: "Emperor Seek Allies",
    source: emperor,
    state,
    target: shaddamAlly,
  });
}
