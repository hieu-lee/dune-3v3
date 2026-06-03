import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyCombatIntrigueBasicPlays } from "./verify-combat-intrigues-basic-plays.mjs";
import { verifyCombatIntrigueCatalog } from "./verify-combat-intrigues-catalog.mjs";
import { verifyCombatIntrigueCommanderBasics } from "./verify-combat-intrigues-commander-basics.mjs";
import { verifyCombatIntrigueCommanderEffects } from "./verify-combat-intrigues-commander-effects.mjs";
import { verifyCombatIntrigueGoToGround } from "./verify-combat-intrigues-go-to-ground.mjs";
import { verifyCombatIntriguePendingActions } from "./verify-combat-intrigues-pending-actions.mjs";
import { verifyCombatIntrigueStrengthAndSpies } from "./verify-combat-intrigues-strength-spies.mjs";
import { verifyCombatIntrigueReachAgreement } from "./verify-combat-intrigues-reach-agreement.mjs";
import { verifyCombatIntrigueRetreatBranches } from "./verify-combat-intrigues-retreat-branches.mjs";
import {
  boardSpaceByName,
  combatFixture,
  intrigueBySourceId,
} from "./verify-combat-intrigues-fixtures.mjs";
import { verifyCombatIntriguePhaseFlow } from "./verify-combat-intrigues-phase.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const lowCostImperiumCard = data.imperiumDeck.find((card) => (card.cost ?? 0) <= 3);
  const replacementImperiumCard = data.imperiumDeck.find((card) => card.id !== lowCostImperiumCard?.id);
  assert.ok(lowCostImperiumCard, "Expected an Imperium Row card that costs 3 or less");
  assert.ok(replacementImperiumCard, "Expected an Imperium Row replacement card");

  const impress = intrigueBySourceId(data, 152);
  const findWeakness = intrigueBySourceId(data, 149);
  const goToGround = intrigueBySourceId(data, 146);
  const spiceIsPower = intrigueBySourceId(data, 150);
  const questionableMethods = intrigueBySourceId(data, 156);
  const springTheTrap = intrigueBySourceId(data, 153);
  const tacticalOption = intrigueBySourceId(data, 155);
  const reachAgreement = intrigueBySourceId(data, 449);
  const weirdingCombat = intrigueBySourceId(data, 154);
  const contingencyPlan = intrigueBySourceId(data, 147);
  const devour = intrigueBySourceId(data, 151);
  const backedByChoam = intrigueBySourceId(data, 448);
  const mercenaries = intrigueBySourceId(data, 128);
  const espionageSpace = boardSpaceByName(data, "Espionage");
  const secretsSpace = boardSpaceByName(data, "Secrets");
  const vastWealthSpace = boardSpaceByName(data, "Vast Wealth");
  const arrakeenSpace = boardSpaceByName(data, "Arrakeen");
  verifyCombatIntrigueCatalog({
    cards: {
      backedByChoam,
      contingencyPlan,
      devour,
      findWeakness,
      goToGround,
      impress,
      mercenaries,
      questionableMethods,
      reachAgreement,
      spiceIsPower,
      springTheTrap,
      tacticalOption,
      weirdingCombat,
    },
    data,
    state,
  });
  const verifierCombat = {
    ...impress,
    id: "intrigue-verifier-auto-combat",
    name: "Verifier Combat",
    sourceId: undefined,
    combatSwords: undefined,
    effects: [{ trigger: "combat-intrigue", effects: [{ kind: "gain-strength", selector: "self", amount: 2 }] }],
  };
  verifyCombatIntriguePhaseFlow({ data, state });
  verifyCombatIntrigueBasicPlays({
    cards: { contingencyPlan, impress, verifierCombat },
    data,
    marketCards: { lowCostImperiumCard, replacementImperiumCard },
    state,
  });
  verifyCombatIntrigueRetreatBranches({
    cards: { spiceIsPower, tacticalOption },
    data,
    state,
  });
  verifyCombatIntrigueReachAgreement({
    cards: { reachAgreement },
    data,
    state,
  });
  verifyCombatIntrigueGoToGround({
    cards: { goToGround },
    data,
    spaces: { secretsSpace, vastWealthSpace },
    state,
  });

  verifyCombatIntrigueStrengthAndSpies({
    cards: { backedByChoam, findWeakness, verifierCombat, weirdingCombat },
    data,
    spaces: { arrakeenSpace, secretsSpace },
    state,
  });

  verifyCombatIntriguePendingActions({
    cards: { devour, questionableMethods, springTheTrap, verifierCombat },
    data,
    spaces: { espionageSpace, secretsSpace },
    state,
  });

  verifyCombatIntrigueCommanderBasics({
    cards: { verifierCombat },
    data,
    state,
  });

  verifyCombatIntrigueCommanderEffects({
    cards: {
      backedByChoam,
      devour,
      findWeakness,
      goToGround,
      questionableMethods,
      reachAgreement,
      spiceIsPower,
      springTheTrap,
      tacticalOption,
      weirdingCombat,
    },
    data,
    spaces: { espionageSpace, secretsSpace },
    state,
  });

  const nonCombatFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [mercenaries] }
        : player,
    ),
  );
  const nonCombat = state.startCombatPhase(nonCombatFixture);
  assert.equal(
    state.playCombatIntrigue(nonCombat, "p2", mercenaries.id),
    nonCombat,
    "Intrigues without structured Combat strength should not be playable through this reducer",
  );

  const noActors = combatFixture(state, data, (players) => players);
  const noActorResult = state.startCombatPhase(noActors);
  assert.equal(noActorResult.phase, "playing", "No eligible Combat actors should fall through to conflict resolution");
  assert.equal(noActorResult.round, noActors.round + 1);

  console.log("combat intrigue verification passed");
} finally {
  await server.close();
}
