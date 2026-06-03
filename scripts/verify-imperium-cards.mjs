import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyImperiumCardAgentChoiceEffects } from "./verify-imperium-cards-agent-choices.mjs";
import { verifyImperiumCardCalculusRevealEffects } from "./verify-imperium-cards-calculus-reveal.mjs";
import { verifyImperiumCardCatalogSpecs } from "./verify-imperium-cards-catalog-specs.mjs";
import { verifyImperiumCardAcquireEffects } from "./verify-imperium-cards-acquire-effects.mjs";
import { verifyImperiumCardInfluenceDiscardEffects } from "./verify-imperium-cards-influence-discard.mjs";
import { verifyImperiumCardMarketContractEffects } from "./verify-imperium-cards-market-contracts.mjs";
import { verifyImperiumCardRevealTroopEffects } from "./verify-imperium-cards-reveal-troops.mjs";
import { verifyImperiumCardSpyEffects } from "./verify-imperium-cards-spies.mjs";
const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
function resolveSetupPendingActions(state, game) {
  let current = game;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Expected an eligible Throne Row setup card");
    current = state.moveImperiumCardToThroneRow(
      current,
      current.pendingAction,
      card.id,
    );
  }
  assert.equal(
    current.pendingAction,
    undefined,
    "Imperium card verifier setup should not leave pending actions",
  );
  return current;
}
try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");
  const game = resolveSetupPendingActions(state, state.initialGame());
  const {
    cards: {
      beneGesseritOperative,
      calculus,
      capturedMentat,
      chani,
      corrinthCity,
      dangerousRhetoric,
      deliveryAgreement,
      interstellarTrade,
      longLiveTheFighters,
      overthrow,
      prepareTheWay,
      priceIsNoObject,
      priorityContracts,
      smuggler,
      spiceMustFlow,
      spyNetwork,
      steersman,
      unswervingLoyalty,
    },
    fixtures: {
      calculusBlockedTarget,
      calculusTrashTarget,
      dune,
      fremenBondSupport,
    },
    players: { p2, p4, p6 },
    spaces: { carthag, highCouncil, imperialBasin, secrets, shipping },
  } = verifyImperiumCardCatalogSpecs({ data, game, state });
  const { chaniFremenSupport } = verifyImperiumCardRevealTroopEffects({
    cards: { chani, fremenBondSupport, unswervingLoyalty },
    game,
    playerIds: { allyId: p2.id, commanderId: p4.id },
    state,
    turnActions,
  });
  verifyImperiumCardAcquireEffects({
    cards: {
      beneGesseritOperative,
      overthrow,
      prepareTheWay,
      priceIsNoObject,
      spiceMustFlow,
      spyNetwork,
    },
    data,
    game,
    playerId: p2.id,
    spaces: { highCouncil, secrets },
    state,
    turnActions,
  });
  verifyImperiumCardAgentChoiceEffects({
    cards: {
      calculus,
      capturedMentat,
      longLiveTheFighters,
      prepareTheWay,
      steersman,
    },
    fixtures: { calculusBlockedTarget, calculusTrashTarget, fremenBondSupport },
    game,
    playerId: p2.id,
    spaces: { carthag, shipping },
    state,
    turnActions,
  });
  verifyImperiumCardSpyEffects({
    cards: { beneGesseritOperative, spyNetwork },
    data,
    game,
    playerIds: { allyId: p2.id, commanderId: p4.id, teammateId: p6.id },
    spaces: { highCouncil, secrets },
    state,
    turnActions,
  });
  verifyImperiumCardInfluenceDiscardEffects({
    cards: { capturedMentat, dangerousRhetoric, prepareTheWay },
    data,
    fixtures: { calculusTrashTarget, dune },
    game,
    playerIds: { allyId: p2.id, commanderId: p4.id, teammateId: p6.id },
    spaces: { carthag, highCouncil },
    state,
    turnActions,
  });
  verifyImperiumCardMarketContractEffects({
    cards: {
      corrinthCity,
      deliveryAgreement,
      interstellarTrade,
      priorityContracts,
      smuggler,
    },
    data,
    game,
    playerId: p2.id,
    spaces: { imperialBasin },
    state,
    turnActions,
  });
  verifyImperiumCardCalculusRevealEffects({
    cards: { calculus },
    fixtures: { calculusBlockedTarget, calculusTrashTarget },
    game,
    playerIds: { allyId: p2.id, commanderId: p4.id },
    state,
    turnActions,
  });
  console.log("Imperium card verification passed");
} finally {
  await server.close();
}
