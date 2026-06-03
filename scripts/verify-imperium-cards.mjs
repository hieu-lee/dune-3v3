import assert from "node:assert/strict";
import { createServer } from "vite";
import { verifyImperiumCardAcquireEffects } from "./verify-imperium-cards-acquire-effects.mjs";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { verifyImperiumCardRevealTroopEffects } from "./verify-imperium-cards-reveal-troops.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

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
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
  }
  assert.equal(current.pendingAction, undefined, "Imperium card verifier setup should not leave pending actions");
  return current;
}

function assertOnlyFactionTraits(card) {
  const traits = card.traits ?? [];
  assert.deepEqual(
    traits.filter((trait) => !trait.startsWith("Faction: ")),
    [],
    `${card.name} should not expose catalog reward or icon metadata as rule traits`,
  );
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = resolveSetupPendingActions(state, state.initialGame());
  for (const card of [...data.reserveMarket, ...data.imperiumDeck]) {
    assertOnlyFactionTraits(card);
  }
  const smuggler = data.imperiumDeck.find((card) => card.name === "Smuggler's Harvester");
  assert.ok(smuggler, "Imperium deck should include Smuggler's Harvester");
  assert.equal(state.isSmugglersHarvesterCard(smuggler), true, "Smuggler's Harvester should be recognized");
  assert.match(smuggler.play, /Maker board space/, "Smuggler's Harvester should show its conditional Agent text");
  assert.equal(smuggler.reveal, "+1 persuasion.", "Smuggler's Harvester should reveal for fixed persuasion only");
  const interstellarTrade = data.imperiumDeck.find((card) => card.name === "Interstellar Trade");
  assert.ok(interstellarTrade, "Imperium deck should include Interstellar Trade");
  assert.equal(state.isInterstellarTradeCard(interstellarTrade), true, "Interstellar Trade should be recognized");
  assert.equal(
    interstellarTrade.conditionalPersuasion,
    false,
    "Interstellar Trade should have structured reveal persuasion instead of manual printed reveal handling",
  );
  assert.match(interstellarTrade.play, /No Agent effect/i);
  assert.doesNotMatch(interstellarTrade.play, /Acquire bonus|Gain one Influence|Take a face-up contract/i);
  assert.match(interstellarTrade.reveal, /completed contract/, "Interstellar Trade should describe its contract reveal text");
  assert.deepEqual(
    interstellarTrade.traits,
    ["Faction: Spacing Guild"],
    "Interstellar Trade should expose only its Spacing Guild card trait",
  );
  assert.ok(
    interstellarTrade.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Interstellar Trade"
      )
    ),
    "Interstellar Trade should carry a typed acquire Influence-choice effect",
  );
  assert.ok(
    interstellarTrade.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Interstellar Trade"
      )
    ),
    "Interstellar Trade should carry a typed acquire public contract effect",
  );
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  assert.ok(calculus, "Imperium deck should include Calculus of Power");
  assert.equal(state.isCalculusOfPowerCard(calculus), true, "Calculus of Power should be recognized");
  assert.equal(
    calculus.conditionalSwords,
    false,
    "Calculus of Power should use structured optional trash strength instead of manual printed reveal handling",
  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ) &&
    calculus.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
          effect.optional === true &&
          effect.requiredTrait === "Faction: Emperor" &&
          effect.excludeSource === true &&
          effect.strengthReward === 3
      )
    ),
    "Calculus of Power should use declarative Reveal persuasion and trash-card strength effects",
  );
  assert.ok(
    calculus.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "trash-card" && effect.optional === true)
    ),
    "Calculus of Power should carry a typed Agent selected-card trash effect",
  );
  assert.match(calculus.reveal, /another Emperor card/, "Calculus of Power should describe its structured Reveal trash text");
  const capturedMentat = data.imperiumDeck.find((card) => card.name === "Captured Mentat");
  assert.ok(capturedMentat, "Imperium deck should include Captured Mentat");
  assert.equal(state.isCapturedMentatCard(capturedMentat), true, "Captured Mentat should be recognized");
  assert.equal(capturedMentat.cost, 5, "Captured Mentat should cost 5 persuasion");
  assert.deepEqual(capturedMentat.icons, ["landsraad", "spice"], "Captured Mentat should reach Landsraad and Spice Trade spaces");
  assert.equal(capturedMentat.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.equal(capturedMentat.conditionalPersuasion, false, "Captured Mentat should not need manual persuasion entry");
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ),
    "Captured Mentat should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence-for-intrigues" &&
        effect.amount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Reveal Influence-for-Intrigue spec",
  );
  assert.ok(
    capturedMentat.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "discard-card-for-influence-and-draw" &&
        effect.drawCards === 1 &&
        effect.influenceAmount === 1 &&
        effect.optional === true
      )
    ),
    "Captured Mentat should carry a declarative Agent discard-for-Influence-and-draw spec",
  );
  assert.match(capturedMentat.play, /discard 1 card.*gain 1 Influence.*draw 1 card/i);
  assert.match(capturedMentat.reveal, /lose 1 Influence.*draw 1 Intrigue/i);
  const dangerousRhetoric = data.imperiumDeck.find((card) => card.name === "Dangerous Rhetoric");
  assert.ok(dangerousRhetoric, "Imperium deck should include Dangerous Rhetoric");
  assert.ok(
    dangerousRhetoric.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence-choice" &&
        effect.amount === 1 &&
        effect.trashSource === true
      )
    ),
    "Dangerous Rhetoric should carry a declarative Agent Influence choice spec",
  );
  assert.match(dangerousRhetoric.play, /Gain 1 Influence.*trash this card/i);
  const steersman = data.imperiumDeck.find((card) => card.name === "Steersman");
  assert.ok(steersman, "Imperium deck should include Steersman");
  assert.ok(
    steersman.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "Steersman should carry a typed Agent draw spec",
  );
  assert.ok(
    steersman.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) => effect.kind === "recall-agent")
    ),
    "Steersman should carry a typed Recall Agent spec",
  );
  assert.ok(
    steersman.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Steersman should preserve its typed Reveal persuasion",
  );
  assert.match(steersman.play, /Draw 1 card.*Recall Agent/i);
  const beneGesseritOperative = data.imperiumDeck.find((card) => card.name === "Bene Gesserit Operative");
  assert.ok(beneGesseritOperative, "Imperium deck should include Bene Gesserit Operative");
  assert.equal(state.isBeneGesseritOperativeCard(beneGesseritOperative), true, "Bene Gesserit Operative should be recognized");
  assert.equal(beneGesseritOperative.cost, 3, "Bene Gesserit Operative should cost 3 persuasion");
  assert.deepEqual(beneGesseritOperative.icons, ["bene"], "Bene Gesserit Operative should reach Bene Gesserit spaces");
  assert.equal(beneGesseritOperative.persuasion, 1, "Bene Gesserit Operative should reveal for 1 base persuasion");
  assert.equal(beneGesseritOperative.conditionalPersuasion, false, "Bene Gesserit Operative should use structured spy-count reveal handling");
  assert.deepEqual(beneGesseritOperative.traits, ["Faction: Bene Gesserit"], "Bene Gesserit Operative should normalize its Bene Gesserit trait");
  assert.ok(
    beneGesseritOperative.effects?.some((spec) => spec.trigger === "agent-play"),
    "Bene Gesserit Operative should use a structured Agent spy-placement effect",
  );
  assert.match(beneGesseritOperative.play, /place 1 spy/i);
  assert.match(beneGesseritOperative.reveal, /two or more spies.*\+2 persuasion/i);
  const weirdingWoman = data.imperiumDeck.find((card) => card.name === "Weirding Woman");
  assert.ok(weirdingWoman, "Imperium deck should include Weirding Woman");
  assert.equal(weirdingWoman.cost, 1, "Weirding Woman should cost 1 persuasion");
  assert.deepEqual(weirdingWoman.icons, ["city", "spice"], "Weirding Woman should reach City and Spice Trade spaces");
  assert.equal(
    weirdingWoman.traits.includes("Faction: Bene Gesserit"),
    true,
    "Weirding Woman should normalize its Bene Gesserit trait",
  );
  assert.ok(
    weirdingWoman.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "return-source-to-hand" && effect.selector === "self")
    ),
    "Weirding Woman should use a structured another-Bene-Gesserit Agent return effect",
  );
  assert.ok(
    weirdingWoman.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ) &&
    weirdingWoman.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 1)
    ),
    "Weirding Woman should carry typed Reveal persuasion and strength effects",
  );
  assert.match(weirdingWoman.play, /another Bene Gesserit card.*return this card/i);
  assert.equal(weirdingWoman.reveal, "+1 persuasion and +1 strength.");
  const inHighPlaces = data.imperiumDeck.find((card) => card.name === "In High Places");
  assert.ok(inHighPlaces, "Imperium deck should include In High Places");
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "draw-cards" && effect.amount === 1)
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent draw effect",
  );
  assert.ok(
    inHighPlaces.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Bene Gesserit" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent spy-placement effect",
  );
  assert.match(inHighPlaces.play, /another Bene Gesserit card.*draw 1 card.*place 1 spy/i);
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  assert.ok(chani, "Imperium deck should include Chani, Clever Tactician");
  assert.equal(chani.cost, 5, "Chani should cost 5 persuasion");
  assert.deepEqual(chani.icons, ["city", "fremen", "spice"], "Chani should reach City, Fremen, and Spice Trade spaces");
  assert.equal(chani.persuasion, 0, "Chani's Fremen Bond persuasion should not be granted automatically");
  assert.equal(chani.swords, 0, "Chani's troop-retreat strength should not be granted automatically");
  assert.equal(chani.conditionalPersuasion, false, "Chani should use automated Fremen Bond reveal handling");
  assert.equal(chani.conditionalSwords, false, "Chani troop-retreat strength should use automated retreat handling");
  assert.ok(
    chani.effects?.some((spec) => spec.trigger === "agent-play"),
    "Chani should use a structured Agent Intrigue draw effect",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ),
    "Chani should use a structured Fremen Bond persuasion effect",
  );
  assert.ok(
    chani.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops-for-strength" &&
        effect.amount === 2 &&
        effect.strength === 4
      )
    ),
    "Chani should use a structured Reveal troop-retreat strength effect",
  );
  assert.deepEqual(chani.traits, ["Faction: Fremen"], "Chani should keep her Fremen trait");
  assert.match(chani.play, /three or more units.*draw 1 Intrigue/i);
  assert.match(chani.reveal, /Fremen Bond.*\+2 persuasion.*retreat two troops.*4 strength/i);
  const unswervingLoyalty = data.imperiumDeck.find((card) => card.name === "Unswerving Loyalty");
  assert.ok(unswervingLoyalty, "Imperium deck should include Unswerving Loyalty");
  assert.equal(unswervingLoyalty.cost, 1, "Unswerving Loyalty should cost 1 persuasion");
  assert.deepEqual(unswervingLoyalty.icons, [], "Unswerving Loyalty should have no Agent icons");
  assert.equal(unswervingLoyalty.persuasion, 1, "Unswerving Loyalty should reveal for 1 persuasion");
  assert.equal(unswervingLoyalty.swords, 0, "Unswerving Loyalty should not reveal for printed strength");
  assert.equal(
    unswervingLoyalty.conditionalPersuasion,
    false,
    "Unswerving Loyalty should use typed reveal handling instead of manual printed reveal handling",
  );
  assert.ok(
    unswervingLoyalty.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ) &&
      unswervingLoyalty.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some((effect) => effect.kind === "recruit-troops" && effect.amount === 1)
      ) &&
      unswervingLoyalty.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some((condition) =>
          condition.kind === "has-card-trait-in-play" &&
          condition.trait === "Faction: Fremen" &&
          condition.count === 2
        ) &&
        spec.effects.some((effect) =>
          effect.kind === "deploy-or-retreat-troops" &&
          effect.amount === 1 &&
          effect.optional === true
        )
      ),
    "Unswerving Loyalty should carry typed Reveal persuasion, troop recruit, and Fremen Bond deploy-or-retreat effects",
  );
  assert.deepEqual(unswervingLoyalty.traits, ["Faction: Fremen"], "Unswerving Loyalty should keep its Fremen trait");
  assert.match(unswervingLoyalty.play, /No agent icons/i);
  assert.match(unswervingLoyalty.reveal, /\+1 persuasion.*Recruit 1 troop.*Fremen Bond.*deploy or retreat 1 troop/i);
  const truthtrance = data.imperiumDeck.find((card) => card.name === "Truthtrance");
  assert.ok(truthtrance, "Imperium deck should include Truthtrance");
  assert.deepEqual(truthtrance.icons, ["bene", "emperor", "fremen", "spacing"], "Truthtrance should keep its Agent icons");
  assert.deepEqual(
    truthtrance.traits,
    ["Faction: Bene Gesserit"],
    "Truthtrance should expose only its normalized Bene Gesserit card trait",
  );
  assert.match(truthtrance.play, /No Agent effect/i);
  assert.doesNotMatch(truthtrance.play, /Faction|Bene Geserit/i);
  assert.match(truthtrance.reveal, /\+1 persuasion/i);
  const sardaukarCoordination = data.imperiumDeck.find((card) => card.name === "Sardaukar Coordination");
  assert.ok(sardaukarCoordination, "Imperium deck should include Sardaukar Coordination");
  assert.equal(sardaukarCoordination.cost, 4, "Sardaukar Coordination should cost 4 persuasion");
  assert.deepEqual(sardaukarCoordination.icons, ["emperor", "landsraad"], "Sardaukar Coordination should reach Emperor and Landsraad spaces");
  assert.equal(
    sardaukarCoordination.traits.includes("Faction: Emperor"),
    true,
    "Sardaukar Coordination should normalize its Emperor trait",
  );
  assert.ok(
    sardaukarCoordination.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "deploy-recruited-troops" &&
        effect.selector === "self" &&
        effect.source === "Sardaukar Coordination"
      )
    ),
    "Sardaukar Coordination should use a structured Agent recruited-troop deployment modifier",
  );
  assert.ok(
    sardaukarCoordination.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ) &&
    sardaukarCoordination.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 1)
    ),
    "Sardaukar Coordination should preserve typed Reveal persuasion and strength effects",
  );
  assert.match(sardaukarCoordination.play, /deploy any troops you recruit this turn/i);
  assert.equal(sardaukarCoordination.reveal, "+2 persuasion and +1 strength.");
  const longLiveTheFighters = data.imperiumDeck.find((card) => card.name === "Long Live the Fighters");
  assert.ok(longLiveTheFighters, "Imperium deck should include Long Live the Fighters");
  assert.deepEqual(
    longLiveTheFighters.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "select-top-deck-cards",
            selector: "self",
            lookCards: 3,
            drawCards: 1,
            discardCards: 1,
            trashCards: 1,
            minimumDeckCards: 3,
          },
        ],
      },
    ],
    "Long Live the Fighters should model its Agent top-deck selection as a typed effect",
  );
  assert.ok(
    longLiveTheFighters.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 2)
    ) &&
      longLiveTheFighters.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 3)
      ),
    "Long Live the Fighters should carry typed Reveal persuasion and strength effects",
  );
  assert.match(longLiveTheFighters.play, /deck has three or more cards.*top three cards.*Draw one.*discard one.*trash one/i);
  assert.match(longLiveTheFighters.reveal, /\+2 persuasion.*3 strength/i);
  const priorityContracts = data.imperiumDeck.find((card) => card.name === "Priority Contracts");
  assert.ok(priorityContracts, "Imperium deck should include Priority Contracts");
  const corrinthCity = data.imperiumDeck.find((card) => card.name === "Corrinth City");
  assert.ok(corrinthCity, "Imperium deck should include Corrinth City");
  const deliveryAgreement = data.imperiumDeck.find((card) => card.name === "Delivery Agreement");
  assert.ok(deliveryAgreement, "Imperium deck should include Delivery Agreement");
  assert.ok(
    priorityContracts.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 2
      )
    ) &&
      priorityContracts.effects?.some((spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some((effect) =>
          effect.kind === "gain-vp" &&
          effect.selector === "self" &&
          effect.amount === 1
        )
      ) &&
      priorityContracts.effects?.some((spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some((effect) =>
          effect.kind === "take-contracts" &&
          effect.selector === "self" &&
          effect.amount === 1 &&
          effect.sourcePool === "public-offer" &&
          effect.source === "Priority Contracts"
        )
      ),
    "Priority Contracts should model its Agent spice, VP, and public contract rewards as typed effects",
  );
  assert.match(priorityContracts.play, /Spice 2.*Take a face-up contract.*Victory Point/i);
  assert.equal(priorityContracts.acquired, undefined, "Priority Contracts VP should not be treated as an acquire bonus");
  assert.deepEqual(
    priorityContracts.traits,
    ["Faction: Spacing Guild"],
    "Priority Contracts should expose only its Spacing Guild card trait",
  );
  assert.equal(
    data.imperiumDeck.find((card) => card.name === "Junction Headquarters")?.acquired,
    undefined,
    "Junction Headquarters VP should be modeled by its typed Agent effect",
  );
  assert.deepEqual(
    corrinthCity.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-cards-for-reward",
            selector: "self",
            amount: 2,
            cost: { solari: 5 },
            gainVp: 1,
            source: "Corrinth City",
          },
        ],
      },
    ],
    "Corrinth City should model its Agent discard-cost VP reward as a typed effect",
  );
  assert.match(corrinthCity.play, /Discard 2 cards.*spend 5 Solari.*gain 1 VP/i);
  assert.match(corrinthCity.reveal, /\+5 persuasion.*High Council/i);
  assert.ok(
    corrinthCity.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-high-council-seat" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.cost === 5 &&
        effect.persuasionCost === 5 &&
        effect.persuasionReward === 2 &&
        effect.source === "Corrinth City"
      )
    ),
    "Corrinth City should model its paid High Council Reveal branch as a typed effect",
  );
  assert.equal(
    corrinthCity.acquired,
    undefined,
    "Corrinth City VP should be modeled by its typed Agent effect",
  );
  assert.deepEqual(
    deliveryAgreement.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-cards-for-reward",
            selector: "self",
            amount: 1,
            takeContracts: {
              amount: 1,
              sourcePool: "public-offer",
            },
            source: "Delivery Agreement",
          },
        ],
      },
    ],
    "Delivery Agreement should model its Agent discard-contract reward as a typed effect",
  );
  assert.match(deliveryAgreement.play, /Discard 1 card.*face-up CHOAM contract/i);
  assert.match(deliveryAgreement.reveal, /Gain 1 spice.*four or more contracts.*gain 1 VP/i);
  assert.ok(
    deliveryAgreement.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 4) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.sourceOnly === true &&
        effect.vpReward === 1
      )
    ),
    "Delivery Agreement should model its completed-contract Reveal source-trash VP branch as a typed effect",
  );
  assert.equal(
    deliveryAgreement.acquired,
    undefined,
    "Delivery Agreement's conditional Reveal VP should not be treated as an acquire bonus",
  );
  assert.equal(
    data.imperiumDeck.find((card) => card.name === "Smuggler's Haven")?.acquired,
    undefined,
    "Smuggler's Haven VP should be modeled by its typed Agent effect",
  );
  const smugglersHaven = data.imperiumDeck.find((card) => card.name === "Smuggler's Haven");
  assert.ok(
    smugglersHaven?.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Smuggler's Haven should carry its printed Agent VP as a typed effect",
  );
  assert.match(smugglersHaven.play, /Gain 1 VP.*Pay 4 spice to summon 1 sandworm/i);
  const prepareTheWay = data.reserveMarket.find((card) => card.sourceId === 537);
  assert.ok(prepareTheWay, "Reserve market should include Prepare The Way");
  const spiceMustFlow = data.reserveMarket.find((card) => card.sourceId === 538);
  assert.ok(spiceMustFlow, "Reserve market should include The Spice Must Flow");
  const overthrow = data.imperiumDeck.find((card) => card.name === "Overthrow");
  assert.ok(overthrow, "Imperium deck should include Overthrow");
  const priceIsNoObject = data.imperiumDeck.find((card) => card.name === "Price is No Object");
  assert.ok(priceIsNoObject, "Imperium deck should include Price is No Object");
  const guildSpy = data.imperiumDeck.find((card) => card.name === "Guild Spy");
  assert.ok(guildSpy, "Imperium deck should include Guild Spy");
  const branchingPath = data.imperiumDeck.find((card) => card.name === "Branching Path");
  assert.ok(branchingPath, "Imperium deck should include Branching Path");
  const junctionHeadquarters = data.imperiumDeck.find((card) => card.name === "Junction Headquarters");
  assert.ok(junctionHeadquarters, "Imperium deck should include Junction Headquarters");
  const spyNetwork = data.imperiumDeck.find((card) => card.name === "Spy Network");
  assert.ok(spyNetwork, "Imperium deck should include Spy Network");
  const strikeFleet = data.imperiumDeck.find((card) => card.name === "Strike Fleet");
  assert.ok(strikeFleet, "Imperium deck should include Strike Fleet");
  const shishakli = data.imperiumDeck.find((card) => card.name === "Shishakli");
  assert.ok(shishakli, "Imperium deck should include Shishakli");
  assert.equal(state.isPrepareTheWayCard(prepareTheWay), true, "Prepare The Way should be recognized");
  assert.deepEqual(
    data.reserveMarket.map((card) => card.sourceId),
    [537, 538],
    "Reserve market should expose Prepare The Way and The Spice Must Flow",
  );
  assert.equal(prepareTheWay.cost, 2, "Prepare The Way should cost 2 persuasion");
  assert.deepEqual(prepareTheWay.icons, ["landsraad", "city"], "Prepare The Way should send Agents to Landsraad and City spaces");
  assert.equal(prepareTheWay.persuasion, 2, "Prepare The Way should reveal for 2 persuasion");
  assert.equal(prepareTheWay.conditionalPersuasion, false, "Prepare The Way should not require manual reveal handling");
  assert.ok(
    prepareTheWay.effects?.some((spec) => spec.trigger === "agent-play"),
    "Prepare The Way should use a structured Agent draw effect",
  );
  assert.deepEqual(prepareTheWay.traits, ["Faction: Bene Gesserit"], "Prepare The Way should keep its Bene Gesserit trait");
  assert.match(prepareTheWay.play, /2 or more Bene Gesserit Influence.*draw 1 card/i);
  assert.match(prepareTheWay.reveal, /\+2 persuasion/i);
  assert.equal(spiceMustFlow.acquired, 1, "The Spice Must Flow should keep its legacy acquisition VP display");
  assert.deepEqual(
    spiceMustFlow.traits,
    ["Faction: Spacing Guild"],
    "The Spice Must Flow should expose only its Spacing Guild card trait",
  );
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-vp" && effect.amount === 1)
    ),
    "The Spice Must Flow should model its VP as a typed acquire effect",
  );
  assert.ok(
    spiceMustFlow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "spice" && effect.amount === 1)
    ),
    "The Spice Must Flow should model its acquire spice as a typed acquire effect",
  );
  assert.ok(
    spyNetwork.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "Spy Network should model its acquisition spy bonus as a typed acquire effect",
  );
  assert.deepEqual(
    spyNetwork.traits,
    ["Faction: Emperor", "Faction: Spacing Guild"],
    "Spy Network should expose only its printed faction card traits",
  );
  assert.match(spyNetwork.play, /No agent icons/i);
  assert.doesNotMatch(spyNetwork.play, /Acquire bonus|Intrigue 1|Spy 1/i);
  assert.match(spyNetwork.reveal, /recall 1 spy to draw 1 Intrigue/i);
  assert.ok(
    spyNetwork.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.drawIntrigues === 1 &&
        effect.optional === true &&
        effect.source === "Spy Network"
      )
    ),
    "Spy Network should model its conditional Reveal spy recall Intrigue draw as a typed effect",
  );
  assert.equal(strikeFleet.cost, 5, "Strike Fleet should cost 5 persuasion");
  assert.deepEqual(strikeFleet.icons, ["spy"], "Strike Fleet should use the Spy Agent icon");
  assert.ok(
    strikeFleet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "recalled-spy-this-turn") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Ally") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 3
      )
    ),
    "Strike Fleet should model its same-turn spy recall Ally recruit as a typed Agent effect",
  );
  assert.ok(
    strikeFleet.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some((condition) => condition.kind === "recalled-spy-this-turn") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.effects.some((effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "activated-ally" &&
        effect.amount === 3
      )
    ),
    "Strike Fleet should route Commander same-turn spy recall recruits to the activated Ally",
  );
  assert.ok(
    strikeFleet.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.recallForSupply === true &&
        effect.mustPlace === true
      )
    ),
    "Strike Fleet should keep its acquisition spy bonus as a typed acquire effect",
  );
  assert.ok(
    strikeFleet.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ) &&
    strikeFleet.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 3)
    ),
    "Strike Fleet should keep typed Reveal persuasion and strength effects",
  );
  assert.equal(strikeFleet.play, "If you recalled a Spy this turn, recruit 3 troops.");
  assert.equal(strikeFleet.reveal, "+1 persuasion and +3 strength.");
  assert.ok(
    overthrow.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "draw-intrigues" && effect.amount === 1)
    ),
    "Overthrow should model its acquisition Intrigue draw as a typed acquire effect",
  );
  assert.deepEqual(
    overthrow.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "gain-board-space-influence",
            selector: "self",
            amount: 1,
          },
        ],
      },
    ],
    "Overthrow should only model its Agent Faction-space Influence bonus as a typed effect",
  );
  assert.match(overthrow.play, /Gain two Influence instead of one/i);
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "acquire" &&
      spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "solari" && effect.amount === 2)
    ),
    "Price is No Object should model its acquisition Solari as a typed acquire effect",
  );
  assert.ok(
    priceIsNoObject.effects?.some((spec) =>
      spec.trigger === "agent-play" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.destination === "hand" &&
        effect.paymentResource === "solari" &&
        effect.optional === true
      )
    ),
    "Price is No Object should model its Solari-paid Agent acquisition as a typed effect",
  );
  assert.match(
    priceIsNoObject.play,
    /acquire a card to your hand using Solari instead of persuasion/i,
    "Price is No Object should expose its automated Agent acquire text in hand",
  );
  assert.deepEqual(
    guildSpy.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "discard-card-for-draw",
            selector: "self",
            drawCards: 1,
            optional: false,
            bonusIntrigues: {
              requiredDiscardTrait: "Faction: Spacing Guild",
              amount: 1,
            },
          },
        ],
      },
    ],
    "Guild Spy should model its Agent discard-draw Intrigue bonus as a typed effect",
  );
  assert.match(guildSpy.play, /discard 1 card.*draw 1 card.*Spacing Guild.*draw 1 Intrigue card/i);
  assert.deepEqual(
    branchingPath.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        conditions: [{ kind: "has-alliance", faction: "bene" }],
        effects: [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            drawIntrigues: 1,
            gain: { spice: 2 },
            optional: true,
          },
        ],
      },
    ],
    "Branching Path should model its Bene Gesserit Alliance Intrigue trash reward as a typed effect",
  );
  assert.match(branchingPath.play, /Bene Gesserit Alliance.*may trash 1 Intrigue.*draw 1 Intrigue.*gain 2 spice/i);
  assert.equal(branchingPath.reveal, "+2 persuasion.", "Branching Path should keep its fixed Reveal persuasion");
  assert.deepEqual(
    junctionHeadquarters.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        conditions: [{ kind: "has-alliance", faction: "spacing" }],
        effects: [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            cost: { spice: 2 },
            gainVp: 1,
            optional: true,
          },
        ],
      },
    ],
    "Junction Headquarters should model its Spacing Guild Alliance Intrigue trash VP reward as a typed effect",
  );
  assert.ok(
    junctionHeadquarters.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-persuasion" && effect.amount === 1)
    ) &&
      junctionHeadquarters.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some((effect) => effect.kind === "gain-resource" && effect.resource === "water" && effect.amount === 1)
      ) &&
      junctionHeadquarters.effects?.some((spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some((effect) => effect.kind === "recruit-troops" && effect.amount === 1)
      ),
    "Junction Headquarters should carry typed Reveal persuasion, water, and troop rewards",
  );
  assert.match(junctionHeadquarters.play, /Spacing Guild Alliance.*may trash 1 Intrigue.*pay 2 spice.*gain 1 VP/i);
  assert.equal(
    junctionHeadquarters.reveal,
    "+1 persuasion. Gain 1 water and recruit 1 troop.",
    "Junction Headquarters reveal text should expose all typed reveal rewards",
  );
  assert.deepEqual(
    shishakli.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      {
        trigger: "agent-play",
        effects: [
          {
            kind: "trash-card",
            selector: "self",
            optional: true,
            zones: ["playArea"],
            sourceOnly: true,
            drawCardsReward: 1,
          },
        ],
      },
    ],
    "Shishakli should model its Agent source-trash draw as a typed effect",
  );
  assert.match(shishakli.play, /trash this card to draw 1 card/i);
  assert.ok(
    shishakli.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.effects.some((effect) => effect.kind === "gain-strength" && effect.amount === 2)
    ),
    "Shishakli should keep its fixed Reveal strength spec",
  );
  assert.ok(
    shishakli.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-card-trait-in-play" &&
        condition.trait === "Faction: Fremen" &&
        condition.count === 2
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-influence" &&
        effect.faction === "fremen" &&
        effect.amount === 1
      )
    ),
    "Shishakli should model its Fremen Bond Reveal Influence as a typed effect",
  );
  for (const name of ["Bene Gesserit Operative", "Branching Path", "Calculus of Power", "Cargo Runner", "Chani, Clever Tactician", "Corrinth City", "Delivery Agreement", "Guild Spy", "In High Places", "Junction Headquarters", "Long Live the Fighters", "Maker Keeper", "Maula Pistol", "Northern Watermaster", "Overthrow", "Paracompass", "Price is No Object", "Priority Contracts", "Shishakli", "Steersman"]) {
    const card = data.imperiumDeck.find((candidate) => candidate.name === name);
    assert.ok(card?.effects?.some((spec) => spec.trigger === "agent-play"), `${name} should use a structured Agent effect`);
  }
  const calculusTrashTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusTrashTarget, "Expected an Emperor Imperium card for Calculus of Power trash coverage");
  const calculusBlockedTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && !card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusBlockedTarget, "Expected a non-Emperor Imperium card for Calculus of Power filtering coverage");
  const fremenBondSupport = data.imperiumDeck.find((card) =>
    card.id !== chani.id && card.traits?.includes("Faction: Fremen")
  );
  assert.ok(fremenBondSupport, "Expected another Fremen Imperium card for Fremen Bond coverage");
  const imperialBasin = data.boardSpaces.find((space) => space.id === "imperial-basin");
  assert.ok(imperialBasin?.maker, "Imperial Basin should be a Maker board space");
  const carthag = data.boardSpaces.find((space) => space.id === "carthag");
  assert.ok(carthag, "Carthag should exist for Prepare The Way Agent coverage");
  const shipping = data.boardSpaces.find((space) => space.id === "shipping");
  assert.ok(shipping, "Shipping should exist for Steersman Recall Agent pending coverage");
  const highCouncil = data.boardSpaces.find((space) => space.id === "high-council");
  assert.ok(highCouncil, "High Council should exist for Captured Mentat Agent coverage");
  const secrets = data.boardSpaces.find((space) => space.id === "secrets");
  assert.ok(secrets, "Secrets should exist for Bene Gesserit Operative Agent coverage");
  const p2 = playerById(game, "p2");
  const p4 = playerById(game, "p4");
  const p6 = playerById(game, "p6");
  const dune = [...p2.hand, ...p2.deck, ...p2.discard].find((card) => card.name === "Dune, The Desert Planet");
  assert.ok(dune, "Feyd should have Dune, The Desert Planet available for a Spice Trade Agent turn");

  const { chaniFremenSupport } = verifyImperiumCardRevealTroopEffects({
    cards: { chani, fremenBondSupport, unswervingLoyalty },
    game,
    playerIds: { allyId: p2.id, commanderId: p4.id },
    state,
    turnActions,
  });

  verifyImperiumCardAcquireEffects({
    cards: { beneGesseritOperative, overthrow, prepareTheWay, priceIsNoObject, spiceMustFlow, spyNetwork },
    data,
    game,
    playerId: p2.id,
    spaces: { highCouncil, secrets },
    state,
    turnActions,
  });

  const prepareDrawCard = { ...calculusTrashTarget, id: "prepare-way-draw-target" };
  const prepareAgentFixture = withActivePlayer(game, p2.id, (player) => ({
    agentsReady: 1,
    deck: [prepareDrawCard],
    discard: [],
    garrison: 0,
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 2 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const prepared = turnActions.placeAgentAction(prepareAgentFixture, {
    commanderTargets: {},
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(playerById(prepared, p2.id).hand.length, 1, "Prepare The Way should draw 1 card at 2 Bene Gesserit Influence");
  assert.equal(playerById(prepared, p2.id).hand[0].id, prepareDrawCard.id);
  assert.ok(playerById(prepared, p2.id).playArea.some((card) => card.id === prepareTheWay.id));
  assert.ok(prepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

  const unprepared = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, (player) => ({
      agentsReady: 1,
      deck: [prepareDrawCard],
      discard: [],
      garrison: 0,
      hand: [prepareTheWay],
      influence: { ...player.influence, bene: 1 },
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: prepareTheWay, selectedSpace: carthag },
  );
  assert.equal(playerById(unprepared, p2.id).hand.length, 0, "Prepare The Way should not draw below 2 Bene Gesserit Influence");
  assert.equal(
    unprepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)),
    false,
    "Prepare The Way should not log a draw when the threshold is unmet",
  );

  const longLiveDraw = { ...calculusTrashTarget, id: "long-live-imperium-draw-card", name: "Long Live Imperium Draw" };
  const longLiveDiscard = { ...capturedMentat, id: "long-live-imperium-discard-card", name: "Long Live Imperium Discard" };
  const longLiveTrash = { ...fremenBondSupport, id: "long-live-imperium-trash-card", name: "Long Live Imperium Trash" };
  const longLiveRemaining = { ...calculusBlockedTarget, id: "long-live-imperium-remaining-card", name: "Long Live Imperium Remaining" };
  const longLiveSpace = {
    id: "long-live-imperium-test-space",
    name: "Long Live Imperium Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const longLivePlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard, longLiveTrash, longLiveRemaining],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    {
      commanderTargets: {},
      selectedCard: longLiveTheFighters,
      selectedSpace: longLiveSpace,
    },
  );
  assert.equal(longLivePlaced.pendingAction?.kind, "top-deck-selection", "Long Live the Fighters should queue top-deck selection");
  assert.deepEqual(
    state.topDeckSelectionCards(playerById(longLivePlaced, p2.id), longLivePlaced.pendingAction).map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should expose the inspected top three cards",
  );
  assert.deepEqual(
    longLivePlaced.pendingAction.inspectedCards.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id, longLiveTrash.id],
    "Long Live the Fighters should reserve inspected cards on its pending action",
  );
  assert.deepEqual(
    playerById(longLivePlaced, p2.id).deck.map((card) => card.id),
    [longLiveRemaining.id],
    "Long Live the Fighters should remove inspected cards from the deck while pending",
  );
  assert.equal(
    state.skipTopDeckSelectionChoice(longLivePlaced, longLivePlaced.pendingAction),
    longLivePlaced,
    "Long Live the Fighters should not skip while the inspected cards are still available",
  );
  const { inspectedCards: _longLiveInspectedCards, ...longLiveLegacyPendingAction } = longLivePlaced.pendingAction;
  const longLiveStalePendingState = {
    ...longLivePlaced,
    pendingAction: longLiveLegacyPendingAction,
    players: longLivePlaced.players.map((player) =>
      player.id === p2.id
        ? {
            ...player,
            deck: [longLiveDraw, longLiveDiscard],
            discard: [],
            hand: [],
            playArea: [longLiveTheFighters],
          }
        : player,
    ),
  };
  const longLiveStaleSkipped = state.skipTopDeckSelectionChoice(
    longLiveStalePendingState,
    longLiveStalePendingState.pendingAction,
  );
  assert.equal(longLiveStaleSkipped.pendingAction, undefined, "Long Live the Fighters should skip a stale top-deck pending action");
  assert.deepEqual(
    playerById(longLiveStaleSkipped, p2.id).deck.map((card) => card.id),
    [longLiveDraw.id, longLiveDiscard.id],
    "Long Live the Fighters stale skip should leave the shortened deck untouched",
  );
  assert.match(longLiveStaleSkipped.log[0], /cannot resolve Long Live the Fighters: fewer than 3 cards remain in deck\./);
  const longLiveResolved = state.resolveTopDeckSelectionChoice(
    longLivePlaced,
    longLivePlaced.pendingAction,
    { drawIndex: 1, discardIndex: 0, trashIndex: 2 },
  );
  const longLiveOwner = playerById(longLiveResolved, p2.id);
  assert.equal(longLiveResolved.pendingAction, undefined);
  assert.ok(longLiveOwner.hand.some((card) => card.id === longLiveDiscard.id), "Long Live the Fighters should draw the selected inspected card");
  assert.equal(longLiveOwner.discard.at(-1)?.id, longLiveDraw.id, "Long Live the Fighters should discard the selected inspected card");
  assert.deepEqual(longLiveOwner.deck.map((card) => card.id), [longLiveRemaining.id], "Long Live the Fighters should leave only uninspected cards in deck");
  assert.equal(
    [...longLiveOwner.hand, ...longLiveOwner.discard, ...longLiveOwner.deck, ...longLiveOwner.playArea].some((card) => card.id === longLiveTrash.id),
    false,
    "Long Live the Fighters should trash the selected inspected card",
  );
  const longLiveShortDeckPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [longLiveDraw, longLiveDiscard],
      discard: [],
      hand: [longLiveTheFighters],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: longLiveTheFighters, selectedSpace: longLiveSpace },
  );
  assert.equal(longLiveShortDeckPlaced.pendingAction, undefined, "Long Live the Fighters should not queue with fewer than three deck cards");

  const calculusAgentTrashTarget = { ...calculusTrashTarget, id: "calculus-agent-trash-target" };
  const calculusAgentSpace = {
    id: "calculus-agent-test-space",
    name: "Calculus Agent Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only city space without board pending rewards.",
  };
  const calculusAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [calculus, calculusAgentTrashTarget],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusAgentPlaced = turnActions.placeAgentAction(calculusAgentFixture, {
    commanderTargets: {},
    selectedCard: calculus,
    selectedSpace: calculusAgentSpace,
  });
  assert.equal(calculusAgentPlaced.pendingAction?.kind, "trash-card", "Calculus of Power should queue Agent trash");
  assert.equal(calculusAgentPlaced.pendingAction.source, "Calculus of Power");
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusAgentPlaced, p2.id), calculusAgentPlaced.pendingAction)
      .map(({ zone, card }) => ({ zone, id: card.id })),
    [
      { zone: "hand", id: calculusAgentTrashTarget.id },
      { zone: "playArea", id: calculus.id },
    ],
    "Calculus Agent trash should allow a card from hand or in play",
  );
  const calculusAgentResolved = state.trashPlayerCard(
    calculusAgentPlaced,
    calculusAgentPlaced.pendingAction,
    "hand",
    calculusAgentTrashTarget.id,
  );
  assert.equal(playerById(calculusAgentResolved, p2.id).hand.length, 0, "Calculus Agent trash should remove the selected hand card");
  assert.ok(playerById(calculusAgentResolved, p2.id).playArea.some((card) => card.id === calculus.id));
  assert.equal(calculusAgentResolved.pendingAction, undefined);

  const steersmanDrawTarget = { ...calculusTrashTarget, id: "steersman-draw-target" };
  const steersmanFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [steersmanDrawTarget],
    discard: [],
    garrison: 0,
    hand: [steersman],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const steersmanPlayed = turnActions.placeAgentAction(steersmanFixture, {
    commanderTargets: {},
    selectedCard: steersman,
    selectedSpace: carthag,
  });
  assert.equal(playerById(steersmanPlayed, p2.id).agentsReady, 1, "Steersman should recall the just-sent Agent to ready supply");
  assert.equal(steersmanPlayed.spaces[carthag.id], undefined, "Steersman should leave the recalled board space unoccupied");
  assert.equal(playerById(steersmanPlayed, p2.id).hand[0]?.id, steersmanDrawTarget.id, "Steersman should draw one card on Agent play");
  assert.ok(playerById(steersmanPlayed, p2.id).playArea.some((card) => card.id === steersman.id));
  assert.ok(steersmanPlayed.log.some((entry) => /Steersman: draws 1 card; recalls the Agent/.test(entry)));

  const steersmanShippingDrawTarget = { ...calculusTrashTarget, id: "steersman-shipping-draw-target" };
  const steersmanShippingFixture = withActivePlayer(game, p2.id, (player) => ({
    agentsReady: 1,
    deck: [steersmanShippingDrawTarget],
    discard: [],
    garrison: 0,
    hand: [steersman],
    influence: { ...player.influence, spacing: 2 },
    playArea: [],
    resources: { solari: 0, spice: 3, water: 0 },
  }));
  const steersmanShippingPlayed = turnActions.placeAgentAction(steersmanShippingFixture, {
    commanderTargets: {},
    selectedCard: steersman,
    selectedSpace: shipping,
  });
  assert.equal(
    steersmanShippingPlayed.pendingAction?.kind,
    "board-influence-choice",
    "Steersman on Shipping should leave the board Influence choice resolvable after Recall Agent",
  );
  assert.equal(steersmanShippingPlayed.pendingAction.targetOwnerId, p2.id);
  assert.equal(steersmanShippingPlayed.spaces[shipping.id], undefined, "Steersman should leave Shipping unoccupied before resolving its pending reward");
  const steersmanShippingResolved = state.resolveBoardInfluenceChoice(
    steersmanShippingPlayed,
    steersmanShippingPlayed.pendingAction,
    p2.id,
    "spacing",
  );
  assert.equal(playerById(steersmanShippingResolved, p2.id).influence.spacing, 3, "Steersman should resolve Shipping Influence after recalling the Agent");
  assert.equal(playerById(steersmanShippingResolved, p2.id).agentsReady, 1, "Resolving Shipping should preserve the recalled Agent");
  assert.equal(steersmanShippingResolved.pendingAction, undefined);
  assert.equal(steersmanShippingResolved.spaces[shipping.id], undefined, "Shipping should remain unoccupied after its pending reward resolves");

  const operativeFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const operativePlayed = turnActions.placeAgentAction(operativeFixture, {
    commanderTargets: {},
    selectedCard: beneGesseritOperative,
    selectedSpace: secrets,
  });
  assert.equal(operativePlayed.pendingAction?.kind, "spy", "Bene Gesserit Operative should queue spy placement");
  assert.equal(operativePlayed.pendingAction.ownerId, p2.id);
  assert.equal(operativePlayed.pendingAction.source, "Bene Gesserit Operative");
  assert.equal(operativePlayed.pendingAction.remaining, 1);
  assert.equal(operativePlayed.pendingAction.mustPlaceSpy, true);
  assert.equal(state.finishPendingAction(operativePlayed), operativePlayed, "Bene Gesserit Operative spy placement should be mandatory");
  const operativeSpyPlaced = state.placeSpyForPending(operativePlayed, operativePlayed.pendingAction, highCouncil.id);
  assert.equal(operativeSpyPlaced.pendingAction, undefined);
  assert.equal(playerById(operativeSpyPlaced, p2.id).spies, 2, "Bene Gesserit Operative should spend one spy from supply");
  assert.equal(operativeSpyPlaced.spyPosts[highCouncil.id], p2.id, "Bene Gesserit Operative should place the selected spy");
  assert.match(operativeSpyPlaced.log[0], /places a spy near High Council from Bene Gesserit Operative/);

  const operativeNoSupplyBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 0,
  }));
  const operativeNoSupplyPlayed = turnActions.placeAgentAction(
    {
      ...operativeNoSupplyBase,
      spyPosts: { [highCouncil.id]: p2.id },
    },
    { commanderTargets: {}, selectedCard: beneGesseritOperative, selectedSpace: secrets },
  );
  assert.equal(operativeNoSupplyPlayed.pendingAction?.kind, "spy", "Bene Gesserit Operative should allow recalling for spy supply");
  assert.equal(operativeNoSupplyPlayed.pendingAction.recallForSupply, true);
  assert.deepEqual(
    state.recallableSpySupplySpaces(operativeNoSupplyPlayed, operativeNoSupplyPlayed.pendingAction).map((space) => space.id),
    [highCouncil.id],
    "Bene Gesserit Operative should expose owned spies when supply is empty",
  );
  const operativeSupplyRecalled = state.recallSpyForSupplyForPending(
    operativeNoSupplyPlayed,
    operativeNoSupplyPlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(playerById(operativeSupplyRecalled, p2.id).spies, 1);
  assert.equal(operativeSupplyRecalled.spyPosts[highCouncil.id], undefined);
  assert.equal(operativeSupplyRecalled.pendingAction.mustPlaceSpy, true);
  const operativeAfterSupplyRecallPlaced = state.placeSpyForPending(
    operativeSupplyRecalled,
    operativeSupplyRecalled.pendingAction,
    secrets.id,
  );
  assert.equal(playerById(operativeAfterSupplyRecallPlaced, p2.id).spies, 0);
  assert.equal(operativeAfterSupplyRecallPlaced.spyPosts[secrets.id], p2.id);

  const operativeNoSpy = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [beneGesseritOperative],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 0,
    })),
    { commanderTargets: {}, selectedCard: beneGesseritOperative, selectedSpace: secrets },
  );
  assert.equal(operativeNoSpy.pendingAction, undefined, "Bene Gesserit Operative should not pause without supply or an owned spy");

  const commanderOperativeBase = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    spies: 3,
  }));
  const commanderOperativePlayed = turnActions.placeAgentAction(commanderOperativeBase, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: beneGesseritOperative,
    selectedSpace: secrets,
  });
  assert.equal(commanderOperativePlayed.pendingAction?.kind, "spy", "Commander Bene Gesserit Operative should queue spy placement");
  assert.equal(commanderOperativePlayed.pendingAction.ownerId, p4.id, "Commander should own the Operative spy placement");
  assert.equal(commanderOperativePlayed.pendingAction.source, "Bene Gesserit Operative");
  const commanderOperativeSpyPlaced = state.placeSpyForPending(
    commanderOperativePlayed,
    commanderOperativePlayed.pendingAction,
    highCouncil.id,
  );
  assert.equal(playerById(commanderOperativeSpyPlaced, p4.id).spies, 2, "Commander Operative should spend a Commander spy");
  assert.equal(
    playerById(commanderOperativeSpyPlaced, p2.id).spies,
    playerById(commanderOperativePlayed, p2.id).spies,
    "Commander Operative should not spend the activated Ally's spy",
  );
  assert.equal(commanderOperativeSpyPlaced.spyPosts[highCouncil.id], p4.id);

  const operativeRevealFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const operativeRevealPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  });
  assert.equal(operativeRevealPlan.persuasion, 3, "Bene Gesserit Operative should reveal for 3 persuasion with two spies");
  assert.deepEqual(
    operativeRevealPlan.printedRevealCards,
    [],
    "Bene Gesserit Operative should not require a manual printed reveal adjustment",
  );
  const operativeRevealed = turnActions.revealTurnAction(
    {
      ...operativeRevealFixture,
      spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
    },
    { commanderTargets: {}, revealPlan: operativeRevealPlan },
  );
  assert.equal(playerById(operativeRevealed, p2.id).persuasion, 3);
  assert.equal(operativeRevealed.pendingAction, undefined);
  const operativeUnboostedPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id },
  });
  assert.equal(operativeUnboostedPlan.persuasion, 1, "Bene Gesserit Operative should reveal for 1 persuasion below two spies");
  const operativeTeamSpyPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p6.id },
  });
  assert.equal(operativeTeamSpyPlan.persuasion, 1, "Bene Gesserit Operative should ignore teammate spy posts on Reveal");
  const operativeSharedSpyPlan = turnActions.revealTurnPlan(playerById(operativeRevealFixture, p2.id), {
    ...operativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p2.id },
    sharedSpyPosts: { [secrets.id]: [p2.id] },
  });
  assert.equal(operativeSharedSpyPlan.persuasion, 3, "Bene Gesserit Operative should count shared spy posts owned by the revealer");
  const commanderOperativeRevealFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [beneGesseritOperative],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderAllySpyPlan = turnActions.revealTurnPlan(playerById(commanderOperativeRevealFixture, p4.id), {
    ...commanderOperativeRevealFixture,
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  });
  assert.equal(commanderAllySpyPlan.persuasion, 1, "Commander Operative reveal should ignore the activated Ally's spy posts");
  const commanderOwnSpyPlan = turnActions.revealTurnPlan(playerById(commanderOperativeRevealFixture, p4.id), {
    ...commanderOperativeRevealFixture,
    spyPosts: { [secrets.id]: p4.id, [highCouncil.id]: p4.id },
  });
  assert.equal(commanderOwnSpyPlan.persuasion, 3, "Commander Operative reveal should count the Commander's own spy posts");

  const spyNetworkIntrigueReward = data.intrigueCards[0];
  assert.ok(spyNetworkIntrigueReward, "Expected an Intrigue card for Spy Network reveal coverage");
  const spyNetworkRevealFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      discard: [],
      hand: [spyNetwork],
      highCouncilSeat: false,
      intrigues: [],
      playArea: [],
      persuasion: 0,
      resources: { solari: 0, spice: 0, water: 0 },
      spies: 0,
    })),
    intrigueDeck: [spyNetworkIntrigueReward],
    intrigueDiscard: [],
    sharedSpyPosts: {},
    spyPosts: { [secrets.id]: p2.id, [highCouncil.id]: p2.id },
  };
  const spyNetworkRevealPlan = turnActions.revealTurnPlan(playerById(spyNetworkRevealFixture, p2.id), spyNetworkRevealFixture);
  assert.equal(spyNetworkRevealPlan.persuasion, 2, "Spy Network should reveal for 2 persuasion through specs");
  assert.equal(spyNetworkRevealPlan.swords, 1, "Spy Network should reveal for 1 strength through specs");
  assert.deepEqual(spyNetworkRevealPlan.printedRevealCards, [], "Spy Network should not need manual Reveal text");
  const spyNetworkRevealed = turnActions.revealTurnAction(spyNetworkRevealFixture, {
    commanderTargets: {},
    revealPlan: spyNetworkRevealPlan,
  });
  assert.equal(spyNetworkRevealed.pendingAction?.kind, "recall-spy", "Spy Network should queue its conditional Reveal spy recall");
  assert.equal(spyNetworkRevealed.pendingAction.ownerId, p2.id);
  assert.equal(spyNetworkRevealed.pendingAction.remaining, 1);
  assert.equal(spyNetworkRevealed.pendingAction.strength, 0);
  assert.equal(spyNetworkRevealed.pendingAction.drawIntrigues, 1);
  assert.equal(spyNetworkRevealed.pendingAction.optional, true);
  assert.equal(spyNetworkRevealed.pendingAction.source, "Spy Network");
  assert.equal(playerById(spyNetworkRevealed, p2.id).persuasion, 2);
  assert.deepEqual(
    state.recallableSpySpaces(spyNetworkRevealed, spyNetworkRevealed.pendingAction).map((space) => space.id).sort(),
    [highCouncil.id, secrets.id].sort(),
    "Spy Network should allow recalling any owned spy post",
  );
  const spyNetworkRecalled = state.recallSpyForPending(
    spyNetworkRevealed,
    spyNetworkRevealed.pendingAction,
    highCouncil.id,
  );
  assert.equal(spyNetworkRecalled.pendingAction, undefined, "Resolving Spy Network recall should clear the pending action");
  assert.equal(spyNetworkRecalled.spyPosts[highCouncil.id], undefined, "Spy Network recall should remove the chosen spy post");
  assert.equal(playerById(spyNetworkRecalled, p2.id).spies, 1, "Spy Network recall should return the spy to supply");
  assert.equal(
    playerById(spyNetworkRecalled, p2.id).intrigues.at(-1)?.name,
    spyNetworkIntrigueReward.name,
    "Spy Network recall should draw one Intrigue",
  );
  assert.equal(spyNetworkRecalled.intrigueDeck.length, 0, "Spy Network recall should consume the Intrigue deck card");
  assert.equal(spyNetworkRecalled.turnSpyRecalls[p2.id], 1, "Spy Network recall should count as a same-turn spy recall");
  assert.match(spyNetworkRecalled.log[0], /draws an Intrigue card from Spy Network/);
  assert.match(spyNetworkRecalled.log[1], /recalls a spy from High Council for Spy Network/);
  assert.doesNotMatch(spyNetworkRecalled.log[1], /adding 0 strength/);
  const spyNetworkOneSpyFixture = {
    ...spyNetworkRevealFixture,
    spyPosts: { [secrets.id]: p2.id },
  };
  const spyNetworkOneSpyPlan = turnActions.revealTurnPlan(
    playerById(spyNetworkOneSpyFixture, p2.id),
    spyNetworkOneSpyFixture,
  );
  const spyNetworkOneSpyRevealed = turnActions.revealTurnAction(spyNetworkOneSpyFixture, {
    commanderTargets: {},
    revealPlan: spyNetworkOneSpyPlan,
  });
  assert.equal(spyNetworkOneSpyRevealed.pendingAction, undefined, "Spy Network should not queue recall below two spy posts");

  const capturedDiscardCard = { ...dune, id: "captured-mentat-discard-card" };
  const capturedDrawCard = { ...calculusTrashTarget, id: "captured-mentat-draw-card" };
  const capturedMentatFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    deck: [capturedDrawCard],
    discard: [],
    hand: [capturedMentat, capturedDiscardCard],
    influence: { emperor: 0, spacing: 0, bene: 0, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  assert.equal(
    state.pendingActionForCard(capturedMentat, playerById(capturedMentatFixture, p2.id), capturedMentatFixture),
    undefined,
    "Captured Mentat should only queue from play",
  );
  const capturedMentatPlayed = turnActions.placeAgentAction(capturedMentatFixture, {
    commanderTargets: {},
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.equal(
    capturedMentatPlayed.pendingAction?.kind,
    "discard-card-for-influence-and-draw",
    "Captured Mentat should queue its Agent choice",
  );
  assert.equal(capturedMentatPlayed.pendingAction.ownerId, p2.id);
  assert.equal(capturedMentatPlayed.pendingAction.drawCards, 1);
  assert.equal(capturedMentatPlayed.pendingAction.influenceAmount, 1);
  assert.equal(capturedMentatPlayed.pendingAction.optional, true);
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawDiscardChoices(
      playerById(capturedMentatPlayed, p2.id),
      capturedMentatPlayed.pendingAction,
    ).map((card) => card.id),
    [capturedDiscardCard.id],
    "Captured Mentat should discard from the remaining hand",
  );
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawChoices(playerById(capturedMentatPlayed, p2.id)),
    ["greatHouses", "spacing", "bene", "fringeWorlds"],
    "Ally Captured Mentat should choose among main-board Influence tracks",
  );
  assert.equal(
    state.resolveDiscardCardForInfluenceAndDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      "missing-card",
      "bene",
    ),
    capturedMentatPlayed,
    "Captured Mentat should reject missing discard cards",
  );
  assert.equal(
    state.resolveDiscardCardForInfluenceAndDrawChoice(
      capturedMentatPlayed,
      capturedMentatPlayed.pendingAction,
      capturedDiscardCard.id,
      "emperor",
    ),
    capturedMentatPlayed,
    "Captured Mentat should reject invalid Influence choices",
  );
  const capturedMentatResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    capturedMentatPlayed,
    capturedMentatPlayed.pendingAction,
    capturedDiscardCard.id,
    "bene",
  );
  assert.equal(capturedMentatResolved.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatResolved, p2.id).hand.map((card) => card.id), [capturedDrawCard.id]);
  assert.equal(playerById(capturedMentatResolved, p2.id).discard.at(-1).id, capturedDiscardCard.id);
  assert.equal(playerById(capturedMentatResolved, p2.id).influence.bene, 1);
  assert.ok(capturedMentatResolved.log.some((entry) => /Captured Mentat: discards .* gains 1 Bene Gesserit Influence.*draws 1 card/.test(entry)));
  const capturedMentatSkipped = state.skipDiscardCardForInfluenceAndDraw(capturedMentatPlayed, capturedMentatPlayed.pendingAction);
  assert.equal(capturedMentatSkipped.pendingAction, undefined);
  assert.deepEqual(playerById(capturedMentatSkipped, p2.id).hand.map((card) => card.id), [capturedDiscardCard.id]);
  assert.equal(playerById(capturedMentatSkipped, p2.id).influence.bene, 0);

  const dangerousRhetoricFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    influence: { ...p2.influence, spacing: 1 },
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    vp: 0,
  }));
  const dangerousRhetoricPlayed = turnActions.placeAgentAction(dangerousRhetoricFixture, {
    commanderTargets: {},
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(
    dangerousRhetoricPlayed.pendingAction?.kind,
    "board-influence-choice",
    "Dangerous Rhetoric should queue its Agent Influence choice",
  );
  assert.equal(dangerousRhetoricPlayed.pendingAction.source, "Dangerous Rhetoric");
  assert.equal(dangerousRhetoricPlayed.pendingAction.trashSource, true);
  assert.equal(dangerousRhetoricPlayed.pendingAction.cardId, dangerousRhetoric.id);
  assert.equal(dangerousRhetoricPlayed.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricPlayed, p2.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementSpaceId,
    highCouncil.id,
    "Dangerous Rhetoric source card should record its Agent placement space",
  );
  assert.deepEqual(
    dangerousRhetoricPlayed.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
    "Dangerous Rhetoric should offer main-board Influence tracks to an Ally",
  );
  const dangerousRhetoricResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricPlayed,
    dangerousRhetoricPlayed.pendingAction,
    p2.id,
    "spacing",
  );
  assert.equal(dangerousRhetoricResolved.pendingAction, undefined);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).influence.spacing, 2);
  assert.equal(playerById(dangerousRhetoricResolved, p2.id).vp, 1);
  assert.equal(
    playerById(dangerousRhetoricResolved, p2.id).playArea.some((card) => card.id === dangerousRhetoric.id),
    false,
    "Dangerous Rhetoric should trash itself after resolving",
  );
  assert.match(dangerousRhetoricResolved.log[0], /gains 1 Spacing Guild Influence from Dangerous Rhetoric/);
  for (const malformedPending of [
    { ...dangerousRhetoricPlayed.pendingAction, source: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, source: "  " },
    { ...dangerousRhetoricPlayed.pendingAction, amount: 0 },
    { ...dangerousRhetoricPlayed.pendingAction, amount: Number.NaN },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: "true" },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: true, cardId: undefined, cardOwnerId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: undefined, cardId: undefined, cardOwnerId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, trashSource: true, cardId: undefined },
    { ...dangerousRhetoricPlayed.pendingAction, targetOwnerId: p4.id },
    { ...dangerousRhetoricPlayed.pendingAction, choices: "bene" },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [null] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: p2.id, faction: "guild" }] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: 17, faction: "bene" }] },
    { ...dangerousRhetoricPlayed.pendingAction, choices: [{ ownerId: "missing-player", faction: "bene" }] },
  ]) {
    const malformedFixture = {
      ...dangerousRhetoricPlayed,
      pendingAction: malformedPending,
    };
    const malformedResolved = state.resolveBoardInfluenceChoice(
      malformedFixture,
      malformedPending,
      p2.id,
      "bene",
    );
    assert.equal(
      malformedResolved,
      malformedFixture,
      "Malformed board-influence-choice pendings should remain unresolved",
    );
  }
  const forgedBoardAmountPending = {
    kind: "board-influence-choice",
    source: "Forged Shipping",
    amount: 3,
    choices: [{ ownerId: p2.id, faction: "bene" }],
  };
  const forgedBoardAmountFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedBoardAmountPending,
  };
  const forgedBoardAmountResolved = state.resolveBoardInfluenceChoice(
    forgedBoardAmountFixture,
    forgedBoardAmountPending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardAmountResolved,
    forgedBoardAmountFixture,
    "Board-space Influence choices should not accept forged multi-Influence amounts without source-card metadata",
  );
  const forgedAmountBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    amount: 2,
  };
  const forgedAmountBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    { ...dangerousRhetoricPlayed, pendingAction: forgedAmountBoardInfluencePending },
    forgedAmountBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedAmountBoardInfluenceResolved.pendingAction,
    forgedAmountBoardInfluencePending,
    "Board Influence choice resolution should reject active trash-source pendings whose amount is not backed by the source card spec",
  );
  const forgedSourceCard = { ...capturedDiscardCard, id: "forged-board-influence-source-card" };
  const forgedSourceBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    cardId: forgedSourceCard.id,
  };
  const forgedSourceBoardInfluenceFixture = {
    ...dangerousRhetoricPlayed,
    pendingAction: forgedSourceBoardInfluencePending,
    players: dangerousRhetoricPlayed.players.map((player) =>
      player.id === p2.id
        ? { ...player, playArea: [forgedSourceCard] }
        : player,
    ),
  };
  const forgedSourceBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    forgedSourceBoardInfluenceFixture,
    forgedSourceBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedSourceBoardInfluenceResolved,
    forgedSourceBoardInfluenceFixture,
    "Board Influence choice resolution should reject active trash-source pendings whose card does not carry a matching typed effect",
  );
  const forgedBoardInfluencePending = {
    ...dangerousRhetoricPlayed.pendingAction,
    source: "Forged Dangerous Rhetoric",
  };
  const forgedBoardInfluenceResolved = state.resolveBoardInfluenceChoice(
    { ...dangerousRhetoricPlayed, pendingAction: undefined },
    forgedBoardInfluencePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedBoardInfluenceResolved.pendingAction,
    undefined,
    "Board Influence choice resolution should require the active pending object",
  );

  const dangerousRhetoricCommanderFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 1,
    hand: [dangerousRhetoric],
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
  }));
  const dangerousRhetoricCommanderPlayed = turnActions.placeAgentAction(dangerousRhetoricCommanderFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: dangerousRhetoric,
    selectedSpace: highCouncil,
  });
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction?.kind, "board-influence-choice");
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction.targetOwnerId, p2.id);
  assert.equal(dangerousRhetoricCommanderPlayed.pendingAction.spaceId, highCouncil.id);
  assert.equal(
    playerById(dangerousRhetoricCommanderPlayed, p4.id).playArea.find((card) => card.id === dangerousRhetoric.id)?.agentPlacementTargetOwnerId,
    p2.id,
    "Commander Dangerous Rhetoric source card should record the activated Ally target",
  );
  assert.deepEqual(
    dangerousRhetoricCommanderPlayed.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p4.id}:emperor`, `${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
  );
  const dangerousRhetoricForgedAllyPending = {
    ...dangerousRhetoricCommanderPlayed.pendingAction,
    choices: dangerousRhetoricCommanderPlayed.pendingAction.choices.map((choice) =>
      choice.ownerId === p2.id ? { ...choice, ownerId: p6.id } : choice,
    ),
  };
  const dangerousRhetoricForgedAllyFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedAllyPending,
  };
  const dangerousRhetoricForgedAllyResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricForgedAllyFixture,
    dangerousRhetoricForgedAllyPending,
    p6.id,
    "bene",
  );
  assert.equal(
    dangerousRhetoricForgedAllyResolved,
    dangerousRhetoricForgedAllyFixture,
    "Commander Dangerous Rhetoric should reject forged choices for a different same-team Ally",
  );
  const dangerousRhetoricForgedTargetOwnerPending = {
    ...dangerousRhetoricForgedAllyPending,
    targetOwnerId: p6.id,
  };
  const dangerousRhetoricForgedTargetOwnerFixture = {
    ...dangerousRhetoricCommanderPlayed,
    pendingAction: dangerousRhetoricForgedTargetOwnerPending,
  };
  const dangerousRhetoricForgedTargetOwnerResolved = state.resolveBoardInfluenceChoice(
    dangerousRhetoricForgedTargetOwnerFixture,
    dangerousRhetoricForgedTargetOwnerPending,
    p6.id,
    "bene",
  );
  assert.equal(
    dangerousRhetoricForgedTargetOwnerResolved,
    dangerousRhetoricForgedTargetOwnerFixture,
    "Commander Dangerous Rhetoric should reject forged targetOwnerId values that disagree with the source card",
  );

  const capturedMentatNoDiscard = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      deck: [capturedDrawCard],
      discard: [],
      hand: [capturedMentat],
      playArea: [],
      resources: { solari: 6, spice: 0, water: 0 },
    })),
    { commanderTargets: {}, selectedCard: capturedMentat, selectedSpace: highCouncil },
  );
  assert.equal(capturedMentatNoDiscard.pendingAction, undefined, "Captured Mentat should not pause without a card to discard");

  const commanderCapturedDiscard = { ...dune, id: "commander-captured-mentat-discard-card" };
  const commanderCapturedDraw = { ...calculusTrashTarget, id: "commander-captured-mentat-draw-card" };
  const commanderCapturedBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderCapturedDraw],
    discard: [],
    hand: [capturedMentat, commanderCapturedDiscard],
    influence: { ...player.influence, emperor: 0, greatHouses: 0 },
    playArea: [],
    resources: { solari: 6, spice: 0, water: 0 },
    vp: 0,
  }));
  const commanderCapturedFixture = {
    ...commanderCapturedBase,
    players: commanderCapturedBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 0 }, vp: 0 }
        : player,
    ),
  };
  const commanderCapturedPlayed = turnActions.placeAgentAction(commanderCapturedFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: capturedMentat,
    selectedSpace: highCouncil,
  });
  assert.deepEqual(
    state.discardCardForInfluenceAndDrawChoices(playerById(commanderCapturedPlayed, p4.id)),
    ["emperor", "greatHouses", "spacing", "bene", "fringeWorlds"],
    "Shaddam Captured Mentat should include personal Emperor and main-board Influence choices",
  );
  assert.equal(commanderCapturedPlayed.pendingAction.influenceOwnerId, p2.id);
  const commanderCapturedResolved = state.resolveDiscardCardForInfluenceAndDrawChoice(
    commanderCapturedPlayed,
    commanderCapturedPlayed.pendingAction,
    commanderCapturedDiscard.id,
    "greatHouses",
  );
  assert.equal(playerById(commanderCapturedResolved, p2.id).influence.greatHouses, 1);
  assert.equal(playerById(commanderCapturedResolved, p4.id).influence.greatHouses, 0);
  assert.deepEqual(playerById(commanderCapturedResolved, p4.id).hand.map((card) => card.id), [commanderCapturedDraw.id]);
  assert.equal(playerById(commanderCapturedResolved, p2.id).hand.length, playerById(commanderCapturedPlayed, p2.id).hand.length);

  const capturedMentatIntrigue = { ...data.intrigueCards[0], id: "captured-mentat-intrigue-draw" };
  const capturedMentatRevealBase = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { emperor: 0, spacing: 0, bene: 2, fremen: 0, greatHouses: 0, fringeWorlds: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const capturedMentatRevealFixture = {
    ...capturedMentatRevealBase,
    intrigueDeck: [capturedMentatIntrigue],
    intrigueDiscard: [],
  };
  const capturedMentatRevealPlan = turnActions.revealTurnPlan(
    playerById(capturedMentatRevealFixture, p2.id),
    capturedMentatRevealFixture,
  );
  assert.equal(capturedMentatRevealPlan.persuasion, 1, "Captured Mentat should reveal for 1 persuasion");
  assert.deepEqual(
    capturedMentatRevealPlan.printedRevealCards,
    [],
    "Captured Mentat reveal should use structured Influence-for-Intrigue handling",
  );
  const capturedMentatRevealed = turnActions.revealTurnAction(capturedMentatRevealFixture, {
    commanderTargets: {},
    revealPlan: capturedMentatRevealPlan,
  });
  assert.equal(capturedMentatRevealed.pendingAction?.kind, "lose-influence-for-intrigues");
  assert.equal(capturedMentatRevealed.pendingAction?.amount, 1);
  assert.equal(capturedMentatRevealed.pendingAction?.optional, true);
  assert.deepEqual(
    state.loseInfluenceForIntriguesChoices(playerById(capturedMentatRevealed, p2.id)),
    ["bene"],
    "Captured Mentat reveal should expose positive Influence tracks",
  );
  assert.equal(
    state.resolveLoseInfluenceForIntriguesChoice(capturedMentatRevealed, capturedMentatRevealed.pendingAction, "emperor"),
    capturedMentatRevealed,
    "Captured Mentat reveal should reject Influence tracks the player cannot lose",
  );
  const capturedMentatRevealResolved = state.resolveLoseInfluenceForIntriguesChoice(
    capturedMentatRevealed,
    capturedMentatRevealed.pendingAction,
    "bene",
  );
  assert.equal(capturedMentatRevealResolved.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).influence.bene, 1);
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).vp, 0, "Captured Mentat reveal should lose Influence threshold VP");
  assert.equal(playerById(capturedMentatRevealResolved, p2.id).intrigues.at(-1).id, capturedMentatIntrigue.id);
  const capturedMentatRevealSkipped = state.skipLoseInfluenceForIntrigues(capturedMentatRevealed, capturedMentatRevealed.pendingAction);
  assert.equal(capturedMentatRevealSkipped.pendingAction, undefined);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).influence.bene, 2);
  assert.equal(playerById(capturedMentatRevealSkipped, p2.id).intrigues.length, 0);

  const commanderCapturedMentatIntrigue = { ...data.intrigueCards[1], id: "commander-captured-mentat-intrigue-draw" };
  const commanderCapturedRevealBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 0,
    discard: [],
    hand: [capturedMentat],
    influence: { ...player.influence, emperor: 2, greatHouses: 0 },
    intrigues: [],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 1,
  }));
  const commanderCapturedRevealFixture = {
    ...commanderCapturedRevealBase,
    intrigueDeck: [commanderCapturedMentatIntrigue],
    intrigueDiscard: [],
    players: commanderCapturedRevealBase.players.map((player) =>
      player.id === p2.id
        ? { ...player, influence: { ...player.influence, greatHouses: 2 }, vp: 1 }
        : player,
    ),
  };
  const commanderCapturedRevealPlan = turnActions.revealTurnPlan(
    playerById(commanderCapturedRevealFixture, p4.id),
    commanderCapturedRevealFixture,
  );
  const commanderCapturedRevealed = turnActions.revealTurnAction(commanderCapturedRevealFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCapturedRevealPlan,
  });
  assert.deepEqual(
    state.loseInfluenceForIntriguesChoices(playerById(commanderCapturedRevealed, p4.id)),
    ["emperor"],
    "Commander Captured Mentat reveal should expose only personal Influence",
  );
  const commanderCapturedRevealResolved = state.resolveLoseInfluenceForIntriguesChoice(
    commanderCapturedRevealed,
    commanderCapturedRevealed.pendingAction,
    "emperor",
  );
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).influence.emperor, 1);
  assert.equal(playerById(commanderCapturedRevealResolved, p4.id).intrigues.at(-1).id, commanderCapturedMentatIntrigue.id);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).influence.greatHouses, 2);
  assert.equal(playerById(commanderCapturedRevealResolved, p2.id).intrigues.length, playerById(commanderCapturedRevealed, p2.id).intrigues.length);

  const commanderPrepareDrawCard = { ...calculusTrashTarget, id: "commander-prepare-way-draw-target" };
  const commanderPrepareBase = withActivePlayer(game, p4.id, (player) => ({
    agentsReady: 1,
    deck: [commanderPrepareDrawCard],
    discard: [],
    hand: [prepareTheWay],
    influence: { ...player.influence, bene: 0 },
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderPrepareFixture = {
    ...commanderPrepareBase,
    players: commanderPrepareBase.players.map((player) => {
      if (player.id === p2.id) return { ...player, garrison: 0, hand: [], influence: { ...player.influence, bene: 0 } };
      if (player.id === "p6") return { ...player, influence: { ...player.influence, bene: 2 } };
      return player;
    }),
  };
  const commanderPrepared = turnActions.placeAgentAction(commanderPrepareFixture, {
    commanderTargets: { [p4.id]: p2.id },
    selectedCard: prepareTheWay,
    selectedSpace: carthag,
  });
  assert.equal(
    playerById(commanderPrepared, p4.id).hand[0].id,
    commanderPrepareDrawCard.id,
    "Commander Prepare The Way should draw for the Commander through shared Bene Gesserit Influence",
  );
  assert.equal(playerById(commanderPrepared, p2.id).hand.length, 0, "Activated Ally should not receive the drawn card");
  assert.ok(commanderPrepared.log.some((entry) => /Prepare The Way: draws 1 card/.test(entry)));

  const noMakerReveal = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    discard: [],
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const noMakerPlan = turnActions.revealTurnPlan(playerById(noMakerReveal, p2.id), noMakerReveal);
  assert.equal(noMakerPlan.persuasion, 1, "Smuggler's Harvester should reveal for 1 persuasion");
  assert.equal(noMakerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not pay spice on Reveal");

  const makerAgentFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 1,
    discard: [],
    garrison: 0,
    hand: [smuggler],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const afterMakerAgent = turnActions.placeAgentAction(makerAgentFixture, {
    commanderTargets: {},
    selectedCard: smuggler,
    selectedSpace: imperialBasin,
  });
  assert.equal(
    state.hasVisitedMakerSpaceThisRound(afterMakerAgent, p2.id),
    true,
    "Sending an Agent to a Maker board space should mark that player for round reveal checks",
  );
  assert.equal(
    playerById(afterMakerAgent, p2.id).resources.spice,
    2,
    "Imperial Basin plus Smuggler's Harvester should pay 2 total spice",
  );
  assert.deepEqual(afterMakerAgent.pendingAction, undefined, "Zero garrison should avoid a deployment pending action");

  const revealFixture = withActivePlayer(
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
    p2.id,
    () => ({
      agentsReady: 0,
      discard: [],
      hand: [smuggler],
      playArea: [],
      resources: { solari: 0, spice: 0, water: 0 },
    }),
  );
  const makerPlan = turnActions.revealTurnPlan(playerById(revealFixture, p2.id), revealFixture);
  assert.equal(makerPlan.persuasion, 1, "Smuggler's Harvester should still reveal for 1 persuasion");
  assert.equal(makerPlan.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not add reveal spice after a Maker visit");

  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: {},
    revealPlan: makerPlan,
  });
  assert.equal(playerById(revealed, p2.id).resources.spice, 0, "Smuggler's Harvester should not add spice on Reveal");
  assert.equal(revealed.turnSpiceGains[p2.id] ?? 0, 0, "Smuggler's Harvester Reveal should not count spice gain");
  assert.equal(playerById(revealed, p2.id).persuasion, 1);
  assert.deepEqual(playerById(revealed, p2.id).hand, [], "Reveal should move Smuggler's Harvester from hand");
  assert.ok(
    playerById(revealed, p2.id).playArea.some((card) => card.id === smuggler.id),
    "Reveal should put Smuggler's Harvester into play area",
  );

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const incompleteContract = {
    card: data.standardContracts[2],
    completed: false,
    takenRound: 1,
  };
  assert.ok(incompleteContract.card, "Expected a third standard contract for Interstellar Trade coverage");
  const interstellarFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    contracts: [...completedContracts, incompleteContract],
    discard: [],
    hand: [interstellarTrade],
    playArea: [],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const interstellarPlan = turnActions.revealTurnPlan(playerById(interstellarFixture, p2.id), interstellarFixture);
  assert.equal(interstellarPlan.persuasion, 2, "Interstellar Trade should reveal for 1 persuasion per completed contract");
  assert.deepEqual(
    interstellarPlan.printedRevealCards,
    [],
    "Interstellar Trade should not require a manual printed reveal adjustment",
  );
  const interstellarRevealed = turnActions.revealTurnAction(interstellarFixture, {
    commanderTargets: {},
    revealPlan: interstellarPlan,
  });
  assert.equal(playerById(interstellarRevealed, p2.id).persuasion, 2);
  assert.equal(interstellarRevealed.pendingAction, undefined, "Interstellar Trade reveal should not pause for printed text");
  const lateCompletedContract = {
    card: data.standardContracts[3],
    completed: true,
    takenRound: 1,
  };
  assert.ok(lateCompletedContract.card, "Expected a fourth standard contract for Interstellar Trade one-shot coverage");
  const afterLateCompletion = {
    ...interstellarRevealed,
    players: interstellarRevealed.players.map((player) =>
      player.id === p2.id
        ? { ...player, contracts: [...player.contracts, lateCompletedContract] }
        : player,
    ),
  };
  assert.equal(
    playerById(afterLateCompletion, p2.id).persuasion,
    2,
    "Interstellar Trade persuasion should be fixed by the reveal plan and not re-count later contract completions",
  );
  const interstellarAcquireReplacement = data.imperiumDeck.find((card) => card.id !== interstellarTrade.id);
  const interstellarAcquireContract = data.standardContracts[4];
  const interstellarAcquireContractReplacement = data.standardContracts[5];
  assert.ok(interstellarAcquireReplacement, "Expected an Imperium Row replacement for Interstellar Trade acquisition coverage");
  assert.ok(interstellarAcquireContract, "Expected a public contract for Interstellar Trade acquisition coverage");
  assert.ok(
    interstellarAcquireContractReplacement,
    "Expected a public contract replacement for Interstellar Trade acquisition coverage",
  );
  const interstellarAcquireBase = withActivePlayer(game, p2.id, () => ({
    contracts: [],
    discard: [],
    hand: [],
    influence: { ...p2.influence, bene: 1 },
    persuasion: interstellarTrade.cost,
    playArea: [],
    revealed: true,
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const interstellarAcquireFixture = {
    ...interstellarAcquireBase,
    imperiumRow: [interstellarTrade],
    marketDeck: [interstellarAcquireReplacement],
    contractOffer: [interstellarAcquireContract],
    contractDeck: [interstellarAcquireContractReplacement],
  };
  const interstellarAcquired = state.acquireMarketCard(interstellarAcquireFixture, p2.id, interstellarTrade.id);
  assert.equal(playerById(interstellarAcquired, p2.id).discard.at(-1)?.id, interstellarTrade.id);
  assert.equal(playerById(interstellarAcquired, p2.id).persuasion, 0);
  assert.equal(interstellarAcquired.pendingAction?.kind, "board-influence-choice");
  assert.equal(interstellarAcquired.pendingAction.sourceTrigger, "acquire");
  assert.equal(interstellarAcquired.pendingAction.source, "Interstellar Trade");
  assert.equal(interstellarAcquired.pendingAction.cardId, interstellarTrade.id);
  assert.deepEqual(
    interstellarAcquired.pendingAction.choices.map((choice) => `${choice.ownerId}:${choice.faction}`),
    [`${p2.id}:greatHouses`, `${p2.id}:spacing`, `${p2.id}:bene`, `${p2.id}:fringeWorlds`],
    "Interstellar Trade should offer main-board Influence choices to an Ally buyer",
  );
  assert.deepEqual(
    interstellarAcquired.pendingQueue,
    [{ kind: "contract", ownerId: p2.id, source: "Interstellar Trade", publicOnly: true }],
    "Interstellar Trade should queue its face-up CHOAM contract after the Influence choice",
  );
  const forgedInterstellarAcquirePending = {
    ...interstellarAcquired.pendingAction,
    cardId: "missing-interstellar-trade-card",
  };
  const forgedInterstellarAcquireFixture = {
    ...interstellarAcquired,
    pendingAction: forgedInterstellarAcquirePending,
  };
  const forgedInterstellarAcquireResolved = state.resolveBoardInfluenceChoice(
    forgedInterstellarAcquireFixture,
    forgedInterstellarAcquirePending,
    p2.id,
    "bene",
  );
  assert.equal(
    forgedInterstellarAcquireResolved,
    forgedInterstellarAcquireFixture,
    "Acquire Influence pendings should require the acquired source card to carry the matching spec",
  );
  const interstellarInfluenceResolved = state.resolveBoardInfluenceChoice(
    interstellarAcquired,
    interstellarAcquired.pendingAction,
    p2.id,
    "bene",
  );
  assert.equal(playerById(interstellarInfluenceResolved, p2.id).influence.bene, 2);
  assert.equal(playerById(interstellarInfluenceResolved, p2.id).vp, 1);
  assert.equal(interstellarInfluenceResolved.pendingAction?.kind, "contract");
  const interstellarContractResolved = state.takeChoamContract(
    interstellarInfluenceResolved,
    interstellarInfluenceResolved.pendingAction,
    interstellarAcquireContract.id,
  );
  assert.equal(interstellarContractResolved.pendingAction, undefined);
  assert.equal(playerById(interstellarContractResolved, p2.id).contracts.at(-1)?.card.id, interstellarAcquireContract.id);
  assert.deepEqual(
    interstellarContractResolved.contractOffer.map((contract) => contract.id),
    [interstellarAcquireContractReplacement.id],
    "Interstellar Trade contract acquisition should refill the public offer",
  );
  const noPublicInterstellarAcquired = state.acquireMarketCard(
    {
      ...interstellarAcquireBase,
      imperiumRow: [interstellarTrade],
      marketDeck: [interstellarAcquireReplacement],
      contractOffer: [],
      contractDeck: [],
    },
    p2.id,
    interstellarTrade.id,
  );
  assert.equal(noPublicInterstellarAcquired.pendingAction?.kind, "board-influence-choice");
  assert.deepEqual(
    noPublicInterstellarAcquired.pendingQueue,
    [],
    "Interstellar Trade should not queue a contract choice when no face-up contracts remain",
  );

  const priorityContractsSpace = {
    id: "priority-contracts-test-space",
    name: "Priority Contracts Test Space",
    zone: "Landsraad",
    icon: "landsraad",
    detail: "Verifier-only Landsraad space without board pending rewards.",
  };
  const priorityContractsOffer = data.standardContracts[6];
  const priorityContractsReplacement = data.standardContracts[7];
  assert.ok(priorityContractsOffer && priorityContractsReplacement, "Expected standard contracts for Priority Contracts coverage");
  const priorityContractsPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsOffer],
      contractDeck: [priorityContractsReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.deepEqual(
    priorityContractsPlaced.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true },
    "Priority Contracts should queue a public CHOAM contract after Agent placement",
  );
  assert.equal(playerById(priorityContractsPlaced, p2.id).resources.spice, 3, "Priority Contracts should grant 2 spice immediately");
  assert.equal(playerById(priorityContractsPlaced, p2.id).vp, 1, "Priority Contracts should grant 1 VP immediately");
  assert.match(priorityContractsPlaced.log[0], /Priority Contracts: gains 2 spice; gains 1 VP/);
  const priorityContractsResolved = state.takeChoamContract(
    priorityContractsPlaced,
    priorityContractsPlaced.pendingAction,
    priorityContractsOffer.id,
  );
  assert.equal(priorityContractsResolved.pendingAction, undefined);
  assert.equal(playerById(priorityContractsResolved, p2.id).contracts.at(-1)?.card.id, priorityContractsOffer.id);
  assert.deepEqual(
    priorityContractsResolved.contractOffer.map((contract) => contract.id),
    [priorityContractsReplacement.id],
    "Priority Contracts should refill the public contract offer after taking a contract",
  );
  const priorityContractsNoOffer = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.equal(priorityContractsNoOffer.pendingAction, undefined, "Priority Contracts should not queue when no public contracts remain");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).resources.spice, 3, "Priority Contracts no-offer path should still grant spice");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).vp, 1, "Priority Contracts no-offer path should still grant VP");

  const corrinthReveal = turnActions.revealTurnPlan({ ...p2, hand: [corrinthCity], highCouncilSeat: false }, game);
  assert.equal(corrinthReveal.persuasion, 5, "Corrinth City should resolve its typed +5 persuasion Reveal branch");
  const corrinthRevealFixture = withActivePlayer(game, p2.id, () => ({
    hand: [corrinthCity],
    highCouncilSeat: false,
    persuasion: 0,
    playArea: [],
    resources: { solari: 5, spice: 0, water: 0 },
    revealed: false,
  }));
  const corrinthRevealActionPlan = turnActions.revealTurnPlan(playerById(corrinthRevealFixture, p2.id), corrinthRevealFixture);
  const corrinthRevealed = turnActions.revealTurnAction(corrinthRevealFixture, {
    commanderTargets: {},
    revealPlan: corrinthRevealActionPlan,
  });
  assert.equal(corrinthRevealed.pendingAction?.kind, "pay-resource-for-high-council-seat", "Corrinth City should queue High Council payment on Reveal");
  const corrinthCouncilPaid = state.resolvePayResourceForHighCouncilSeatChoice(corrinthRevealed, corrinthRevealed.pendingAction);
  assert.equal(playerById(corrinthCouncilPaid, p2.id).highCouncilSeat, true, "Corrinth City Reveal payment should take High Council seat");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).resources.solari, 0, "Corrinth City Reveal payment should spend 5 Solari");
  assert.equal(playerById(corrinthCouncilPaid, p2.id).persuasion, 2, "Corrinth City Reveal payment should leave the current High Council +2 persuasion");
  const deliveryReveal = turnActions.revealTurnPlan({ ...p2, hand: [deliveryAgreement], highCouncilSeat: false }, game);
  assert.equal(deliveryReveal.revealGain.spice, 1, "Delivery Agreement should resolve its typed Reveal spice reward");
  const deliveryCompletedContracts = data.standardContracts.slice(0, 4).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const deliveryRevealFixture = withActivePlayer(game, p2.id, () => ({
    contracts: deliveryCompletedContracts,
    discard: [],
    hand: [deliveryAgreement],
    playArea: [],
    resources: { solari: 0, spice: 0, water: 0 },
    vp: 0,
  }));
  const deliveryRevealActionPlan = turnActions.revealTurnPlan(playerById(deliveryRevealFixture, p2.id), deliveryRevealFixture);
  const deliveryRevealed = turnActions.revealTurnAction(deliveryRevealFixture, {
    commanderTargets: {},
    revealPlan: deliveryRevealActionPlan,
  });
  assert.equal(deliveryRevealed.pendingAction?.kind, "trash-card", "Delivery Agreement should queue completed-contract Reveal trash");
  assert.equal(deliveryRevealed.pendingAction?.vpReward, 1, "Delivery Agreement Reveal trash should carry VP reward");
  const deliveryVpTrashed = state.trashPlayerCard(deliveryRevealed, deliveryRevealed.pendingAction, "playArea", deliveryAgreement.id, 0);
  assert.equal(playerById(deliveryVpTrashed, p2.id).vp, 1, "Delivery Agreement Reveal trash should gain 1 VP");
  const discardBase = data.allyStarterCards.find((card) => card.name === "Dagger");
  const discardBaseTwo = data.allyStarterCards.find((card) => card.name === "Convincing Argument");
  assert.ok(discardBase && discardBaseTwo, "Expected starter discard fixtures for discard-reward coverage");
  const corrinthCitySpace = {
    id: "corrinth-city-test-space",
    name: "Corrinth City Test Space",
    zone: "Emperor",
    icon: "emperor",
    detail: "Verifier-only Emperor space without board pending rewards.",
  };
  const corrinthDiscardOne = { ...discardBase, id: "corrinth-city-discard-one" };
  const corrinthDiscardTwo = { ...discardBaseTwo, id: "corrinth-city-discard-two" };
  const corrinthPlaced = turnActions.placeAgentAction(
    withActivePlayer(game, p2.id, () => ({
      agentsReady: 1,
      discard: [],
      hand: [corrinthCity, corrinthDiscardOne, corrinthDiscardTwo],
      playArea: [],
      resources: { solari: 5, spice: 0, water: 0 },
      vp: 0,
    })),
    {
      commanderTargets: {},
      selectedCard: corrinthCity,
      selectedSpace: corrinthCitySpace,
    },
  );
  assert.equal(corrinthPlaced.pendingAction?.kind, "discard-cards-for-reward", "Corrinth City should queue discard-for-reward");
  assert.equal(corrinthPlaced.pendingAction?.remaining, 2);
  const corrinthAfterFirstDiscard = state.resolveDiscardCardsForRewardChoice(
    corrinthPlaced,
    corrinthPlaced.pendingAction,
    corrinthDiscardOne.id,
  );
  const corrinthResolved = state.resolveDiscardCardsForRewardChoice(
    corrinthAfterFirstDiscard,
    corrinthAfterFirstDiscard.pendingAction,
    corrinthDiscardTwo.id,
  );
  assert.equal(corrinthResolved.pendingAction, undefined, "Corrinth City should resolve after two discards");
  assert.equal(playerById(corrinthResolved, p2.id).resources.solari, 0, "Corrinth City should spend 5 Solari");
  assert.equal(playerById(corrinthResolved, p2.id).vp, 1, "Corrinth City should grant 1 VP");

  const deliveryAgreementSpace = {
    id: "delivery-agreement-test-space",
    name: "Delivery Agreement Test Space",
    zone: "City",
    icon: "city",
    detail: "Verifier-only City space without board pending rewards.",
  };
  const deliveryDiscard = { ...discardBase, id: "delivery-agreement-discard-card" };
  const deliveryOffer = data.standardContracts[11];
  const deliveryReplacement = data.standardContracts[12];
  assert.ok(deliveryOffer && deliveryReplacement, "Expected standard contracts for Delivery Agreement coverage");
  const deliveryPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [deliveryAgreement, deliveryDiscard],
        playArea: [],
        resources: { solari: 0, spice: 0, water: 0 },
      })),
      contractOffer: [deliveryOffer],
      contractDeck: [deliveryReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: deliveryAgreement,
      selectedSpace: deliveryAgreementSpace,
    },
  );
  assert.equal(deliveryPlaced.pendingAction?.kind, "discard-cards-for-reward", "Delivery Agreement should queue discard-for-reward");
  const deliveryDiscarded = state.resolveDiscardCardsForRewardChoice(
    deliveryPlaced,
    deliveryPlaced.pendingAction,
    deliveryDiscard.id,
  );
  assert.deepEqual(
    deliveryDiscarded.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Delivery Agreement", publicOnly: true },
    "Delivery Agreement should queue a public contract after its discard",
  );
  const deliveryResolved = state.takeChoamContract(
    deliveryDiscarded,
    deliveryDiscarded.pendingAction,
    deliveryOffer.id,
  );
  assert.equal(playerById(deliveryResolved, p2.id).contracts.at(-1)?.card.id, deliveryOffer.id);
  assert.deepEqual(
    deliveryResolved.contractOffer.map((contract) => contract.id),
    [deliveryReplacement.id],
    "Delivery Agreement should refill the public offer after taking a contract",
  );

  const calculusFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedSandworms: 0,
    deployedTroops: 1,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget, calculusBlockedTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusPlan = turnActions.revealTurnPlan(playerById(calculusFixture, p2.id), calculusFixture);
  assert.equal(calculusPlan.persuasion, 2, "Calculus of Power should keep its printed 2 persuasion");
  assert.equal(calculusPlan.swords, 0, "Calculus of Power optional swords should not be added before trashing");
  assert.deepEqual(
    calculusPlan.printedRevealCards,
    [],
    "Calculus of Power should not require a manual printed reveal adjustment",
  );
  const calculusRevealed = turnActions.revealTurnAction(calculusFixture, {
    commanderTargets: {},
    revealPlan: calculusPlan,
  });
  assert.equal(calculusRevealed.pendingAction?.kind, "trash-card", "Calculus of Power should queue optional trash");
  const calculusPending = calculusRevealed.pendingAction;
  assert.equal(calculusPending.source, "Calculus of Power");
  assert.equal(calculusPending.optional, true);
  assert.deepEqual(calculusPending.zones, ["playArea"]);
  assert.equal(calculusPending.excludeCardId, calculus.id);
  assert.equal(calculusPending.requiredTrait, "Faction: Emperor");
  assert.equal(calculusPending.combatRecipientId, p2.id);
  assert.equal(calculusPending.strengthReward, 3);
  assert.deepEqual(
    state.trashableCardsForPending(playerById(calculusRevealed, p2.id), calculusPending).map(({ card }) => card.id),
    [calculusTrashTarget.id],
    "Calculus of Power should only allow another Emperor card in play",
  );
  const blockedCalculusTrash = state.trashPlayerCard(
    calculusRevealed,
    calculusPending,
    "playArea",
    calculusBlockedTarget.id,
  );
  assert.equal(
    blockedCalculusTrash.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should reject non-Emperor trash choices",
  );
  assert.equal(playerById(blockedCalculusTrash, p2.id).conflict, 4);
  const afterCalculusTrash = state.trashPlayerCard(calculusRevealed, calculusPending, "playArea", calculusTrashTarget.id);
  assert.equal(playerById(afterCalculusTrash, p2.id).conflict, 7, "Calculus of Power trash should add 3 strength");
  assert.equal(afterCalculusTrash.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculus.id),
    "Calculus of Power should not trash itself",
  );
  assert.equal(
    playerById(afterCalculusTrash, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    false,
    "Calculus of Power should trash the selected Emperor card",
  );
  const afterCalculusSkip = state.skipTrashCard(calculusRevealed, calculusPending);
  assert.equal(playerById(afterCalculusSkip, p2.id).conflict, 4, "Skipping Calculus of Power should not add strength");
  assert.equal(afterCalculusSkip.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusSkip, p2.id).playArea.some((card) => card.id === calculusTrashTarget.id),
    "Skipping Calculus of Power should leave eligible cards in play",
  );
  const baseCommanderCalculusFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    conflict: 0,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderCalculusFixture = {
    ...baseCommanderCalculusFixture,
    players: baseCommanderCalculusFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 5, deployedSandworms: 0, deployedTroops: 1 }
        : player,
    ),
  };
  const commanderCalculusPlan = turnActions.revealTurnPlan(playerById(commanderCalculusFixture, p4.id), commanderCalculusFixture);
  const commanderCalculusRevealed = turnActions.revealTurnAction(commanderCalculusFixture, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderCalculusPlan,
  });
  assert.equal(
    commanderCalculusRevealed.pendingAction?.kind,
    "trash-card",
    "Commander Calculus of Power should queue trash from the Commander's play area",
  );
  assert.equal(commanderCalculusRevealed.pendingAction.ownerId, p4.id);
  assert.equal(commanderCalculusRevealed.pendingAction.combatRecipientId, p2.id);
  const afterCommanderCalculusTrash = state.trashPlayerCard(
    commanderCalculusRevealed,
    commanderCalculusRevealed.pendingAction,
    "playArea",
    calculusTrashTarget.id,
  );
  assert.equal(playerById(afterCommanderCalculusTrash, p4.id).conflict, 0, "Commander should not receive Calculus strength");
  assert.equal(playerById(afterCommanderCalculusTrash, p2.id).conflict, 8, "Activated Ally should receive Calculus strength");

  console.log("Imperium card verification passed");
} finally {
  await server.close();
}
