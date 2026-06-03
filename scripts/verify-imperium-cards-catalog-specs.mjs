import assert from "node:assert/strict";
import { verifyImperiumCardLateCatalogSpecs } from "./verify-imperium-cards-catalog-late-specs.mjs";
function assertOnlyFactionTraits(card) {
  const traits = card.traits ?? [];
  assert.deepEqual(
    traits.filter((trait) => !trait.startsWith("Faction: ")),
    [],
    `${card.name} should not expose catalog reward or icon metadata as rule traits`,
  );
}
export function verifyImperiumCardCatalogSpecs({ data, game, state }) {
  for (const card of [...data.reserveMarket, ...data.imperiumDeck]) {
    assertOnlyFactionTraits(card);
  }
  const smuggler = data.imperiumDeck.find(
    (card) => card.name === "Smuggler's Harvester",
  );
  assert.ok(smuggler, "Imperium deck should include Smuggler's Harvester");
  assert.equal(
    state.isSmugglersHarvesterCard(smuggler),
    true,
    "Smuggler's Harvester should be recognized",
  );
  assert.match(
    smuggler.play,
    /Maker board space/,
    "Smuggler's Harvester should show its conditional Agent text",
  );
  assert.equal(
    smuggler.reveal,
    "+1 persuasion.",
    "Smuggler's Harvester should reveal for fixed persuasion only",
  );
  const interstellarTrade = data.imperiumDeck.find(
    (card) => card.name === "Interstellar Trade",
  );
  assert.ok(
    interstellarTrade,
    "Imperium deck should include Interstellar Trade",
  );
  assert.equal(
    state.isInterstellarTradeCard(interstellarTrade),
    true,
    "Interstellar Trade should be recognized",
  );
  assert.match(interstellarTrade.play, /No Agent effect/i);
  assert.doesNotMatch(
    interstellarTrade.play,
    /Acquire bonus|Gain one Influence|Take a face-up contract/i,
  );
  assert.match(
    interstellarTrade.reveal,
    /completed contract/,
    "Interstellar Trade should describe its contract reveal text",
  );
  assert.deepEqual(
    interstellarTrade.traits,
    ["Faction: Spacing Guild"],
    "Interstellar Trade should expose only its Spacing Guild card trait",
  );
  assert.ok(
    interstellarTrade.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence-choice" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Interstellar Trade",
        ),
    ),
    "Interstellar Trade should carry a typed acquire Influence-choice effect",
  );
  assert.ok(
    interstellarTrade.effects?.some(
      (spec) =>
        spec.trigger === "acquire" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "take-contracts" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.sourcePool === "public-offer" &&
            effect.source === "Interstellar Trade",
        ),
    ),
    "Interstellar Trade should carry a typed acquire public contract effect",
  );
  const calculus = data.imperiumDeck.find(
    (card) => card.name === "Calculus of Power",
  );
  assert.ok(calculus, "Imperium deck should include Calculus of Power");
  assert.equal(
    state.isCalculusOfPowerCard(calculus),
    true,
    "Calculus of Power should be recognized",
  );
  assert.ok(
    calculus.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ) &&
      calculus.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) =>
              effect.kind === "trash-card" &&
              effect.optional === true &&
              effect.requiredTrait === "Faction: Emperor" &&
              effect.excludeSource === true &&
              effect.strengthReward === 3,
          ),
      ),
    "Calculus of Power should use declarative Reveal persuasion and trash-card strength effects",
  );
  assert.ok(
    calculus.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) => effect.kind === "trash-card" && effect.optional === true,
        ),
    ),
    "Calculus of Power should carry a typed Agent selected-card trash effect",
  );
  assert.match(
    calculus.reveal,
    /another Emperor card/,
    "Calculus of Power should describe its structured Reveal trash text",
  );
  const capturedMentat = data.imperiumDeck.find(
    (card) => card.name === "Captured Mentat",
  );
  assert.ok(capturedMentat, "Imperium deck should include Captured Mentat");
  assert.equal(
    state.isCapturedMentatCard(capturedMentat),
    true,
    "Captured Mentat should be recognized",
  );
  assert.equal(
    capturedMentat.cost,
    5,
    "Captured Mentat should cost 5 persuasion",
  );
  assert.deepEqual(
    capturedMentat.icons,
    ["landsraad", "spice"],
    "Captured Mentat should reach Landsraad and Spice Trade spaces",
  );
  assert.equal(
    capturedMentat.persuasion,
    1,
    "Captured Mentat should reveal for 1 persuasion",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Captured Mentat should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence-for-intrigues" &&
            effect.amount === 1 &&
            effect.optional === true,
        ),
    ),
    "Captured Mentat should carry a declarative Reveal Influence-for-Intrigue spec",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card-for-influence-and-draw" &&
            effect.drawCards === 1 &&
            effect.influenceAmount === 1 &&
            effect.optional === true,
        ),
    ),
    "Captured Mentat should carry a declarative Agent discard-for-Influence-and-draw spec",
  );
  assert.match(
    capturedMentat.play,
    /discard 1 card.*gain 1 Influence.*draw 1 card/i,
  );
  assert.match(capturedMentat.reveal, /lose 1 Influence.*draw 1 Intrigue/i);
  const dangerousRhetoric = data.imperiumDeck.find(
    (card) => card.name === "Dangerous Rhetoric",
  );
  assert.ok(
    dangerousRhetoric,
    "Imperium deck should include Dangerous Rhetoric",
  );
  assert.ok(
    dangerousRhetoric.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence-choice" &&
            effect.amount === 1 &&
            effect.trashSource === true,
        ),
    ),
    "Dangerous Rhetoric should carry a declarative Agent Influence choice spec",
  );
  assert.match(dangerousRhetoric.play, /Gain 1 Influence.*trash this card/i);
  const steersman = data.imperiumDeck.find((card) => card.name === "Steersman");
  assert.ok(steersman, "Imperium deck should include Steersman");
  assert.ok(
    steersman.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ),
    "Steersman should carry a typed Agent draw spec",
  );
  assert.ok(
    steersman.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some((effect) => effect.kind === "recall-agent"),
    ),
    "Steersman should carry a typed Recall Agent spec",
  );
  assert.ok(
    steersman.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Steersman should preserve its typed Reveal persuasion",
  );
  assert.match(steersman.play, /Draw 1 card.*Recall Agent/i);
  const beneGesseritOperative = data.imperiumDeck.find(
    (card) => card.name === "Bene Gesserit Operative",
  );
  assert.ok(
    beneGesseritOperative,
    "Imperium deck should include Bene Gesserit Operative",
  );
  assert.equal(
    state.isBeneGesseritOperativeCard(beneGesseritOperative),
    true,
    "Bene Gesserit Operative should be recognized",
  );
  assert.equal(
    beneGesseritOperative.cost,
    3,
    "Bene Gesserit Operative should cost 3 persuasion",
  );
  assert.deepEqual(
    beneGesseritOperative.icons,
    ["bene"],
    "Bene Gesserit Operative should reach Bene Gesserit spaces",
  );
  assert.equal(
    beneGesseritOperative.persuasion,
    1,
    "Bene Gesserit Operative should reveal for 1 base persuasion",
  );
  assert.deepEqual(
    beneGesseritOperative.traits,
    ["Faction: Bene Gesserit"],
    "Bene Gesserit Operative should normalize its Bene Gesserit trait",
  );
  assert.ok(
    beneGesseritOperative.effects?.some(
      (spec) => spec.trigger === "agent-play",
    ),
    "Bene Gesserit Operative should use a structured Agent spy-placement effect",
  );
  assert.match(beneGesseritOperative.play, /place 1 spy/i);
  assert.match(
    beneGesseritOperative.reveal,
    /two or more spies.*\+2 persuasion/i,
  );
  const weirdingWoman = data.imperiumDeck.find(
    (card) => card.name === "Weirding Woman",
  );
  assert.ok(weirdingWoman, "Imperium deck should include Weirding Woman");
  assert.equal(
    weirdingWoman.cost,
    1,
    "Weirding Woman should cost 1 persuasion",
  );
  assert.deepEqual(
    weirdingWoman.icons,
    ["city", "spice"],
    "Weirding Woman should reach City and Spice Trade spaces",
  );
  assert.equal(
    weirdingWoman.traits.includes("Faction: Bene Gesserit"),
    true,
    "Weirding Woman should normalize its Bene Gesserit trait",
  );
  assert.ok(
    weirdingWoman.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "return-source-to-hand" &&
            effect.selector === "self",
        ),
    ),
    "Weirding Woman should use a structured another-Bene-Gesserit Agent return effect",
  );
  assert.ok(
    weirdingWoman.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ) &&
      weirdingWoman.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "gain-strength" && effect.amount === 1,
          ),
      ),
    "Weirding Woman should carry typed Reveal persuasion and strength effects",
  );
  assert.match(
    weirdingWoman.play,
    /another Bene Gesserit card.*return this card/i,
  );
  assert.equal(weirdingWoman.reveal, "+1 persuasion and +1 strength.");
  const inHighPlaces = data.imperiumDeck.find(
    (card) => card.name === "In High Places",
  );
  assert.ok(inHighPlaces, "Imperium deck should include In High Places");
  assert.ok(
    inHighPlaces.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent draw effect",
  );
  assert.ok(
    inHighPlaces.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "In High Places should use a structured another-Bene-Gesserit Agent spy-placement effect",
  );
  assert.match(
    inHighPlaces.play,
    /another Bene Gesserit card.*draw 1 card.*place 1 spy/i,
  );
  const chani = data.imperiumDeck.find(
    (card) => card.name === "Chani, Clever Tactician",
  );
  assert.ok(chani, "Imperium deck should include Chani, Clever Tactician");
  assert.equal(chani.cost, 5, "Chani should cost 5 persuasion");
  assert.deepEqual(
    chani.icons,
    ["city", "fremen", "spice"],
    "Chani should reach City, Fremen, and Spice Trade spaces",
  );
  assert.equal(
    chani.persuasion,
    0,
    "Chani's Fremen Bond persuasion should not be granted automatically",
  );
  assert.equal(
    chani.swords,
    0,
    "Chani's troop-retreat strength should not be granted automatically",
  );
  assert.ok(
    chani.effects?.some((spec) => spec.trigger === "agent-play"),
    "Chani should use a structured Agent Intrigue draw effect",
  );
  assert.ok(
    chani.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Chani should use a structured Fremen Bond persuasion effect",
  );
  assert.ok(
    chani.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops-for-strength" &&
            effect.amount === 2 &&
            effect.strength === 4,
        ),
    ),
    "Chani should use a structured Reveal troop-retreat strength effect",
  );
  assert.deepEqual(
    chani.traits,
    ["Faction: Fremen"],
    "Chani should keep her Fremen trait",
  );
  assert.match(chani.play, /three or more units.*draw 1 Intrigue/i);
  assert.match(
    chani.reveal,
    /Fremen Bond.*\+2 persuasion.*retreat two troops.*4 strength/i,
  );
  const unswervingLoyalty = data.imperiumDeck.find(
    (card) => card.name === "Unswerving Loyalty",
  );
  assert.ok(
    unswervingLoyalty,
    "Imperium deck should include Unswerving Loyalty",
  );
  assert.equal(
    unswervingLoyalty.cost,
    1,
    "Unswerving Loyalty should cost 1 persuasion",
  );
  assert.deepEqual(
    unswervingLoyalty.icons,
    [],
    "Unswerving Loyalty should have no Agent icons",
  );
  assert.equal(
    unswervingLoyalty.persuasion,
    1,
    "Unswerving Loyalty should reveal for 1 persuasion",
  );
  assert.equal(
    unswervingLoyalty.swords,
    0,
    "Unswerving Loyalty should not reveal for printed strength",
  );
  assert.ok(
    unswervingLoyalty.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ) &&
      unswervingLoyalty.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "recruit-troops" && effect.amount === 1,
          ),
      ) &&
      unswervingLoyalty.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-card-trait-in-play" &&
              condition.trait === "Faction: Fremen" &&
              condition.count === 2,
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "deploy-or-retreat-troops" &&
              effect.amount === 1 &&
              effect.optional === true,
          ),
      ),
    "Unswerving Loyalty should carry typed Reveal persuasion, troop recruit, and Fremen Bond deploy-or-retreat effects",
  );
  assert.deepEqual(
    unswervingLoyalty.traits,
    ["Faction: Fremen"],
    "Unswerving Loyalty should keep its Fremen trait",
  );
  assert.match(unswervingLoyalty.play, /No agent icons/i);
  assert.match(
    unswervingLoyalty.reveal,
    /\+1 persuasion.*Recruit 1 troop.*Fremen Bond.*deploy or retreat 1 troop/i,
  );
  const truthtrance = data.imperiumDeck.find(
    (card) => card.name === "Truthtrance",
  );
  assert.ok(truthtrance, "Imperium deck should include Truthtrance");
  assert.deepEqual(
    truthtrance.icons,
    ["bene", "emperor", "fremen", "spacing"],
    "Truthtrance should keep its Agent icons",
  );
  assert.deepEqual(
    truthtrance.traits,
    ["Faction: Bene Gesserit"],
    "Truthtrance should expose only its normalized Bene Gesserit card trait",
  );
  assert.match(truthtrance.play, /No Agent effect/i);
  assert.doesNotMatch(truthtrance.play, /Faction|Bene Geserit/i);
  assert.match(truthtrance.reveal, /\+1 persuasion/i);
  const sardaukarCoordination = data.imperiumDeck.find(
    (card) => card.name === "Sardaukar Coordination",
  );
  assert.ok(
    sardaukarCoordination,
    "Imperium deck should include Sardaukar Coordination",
  );
  assert.equal(
    sardaukarCoordination.cost,
    4,
    "Sardaukar Coordination should cost 4 persuasion",
  );
  assert.deepEqual(
    sardaukarCoordination.icons,
    ["emperor", "landsraad"],
    "Sardaukar Coordination should reach Emperor and Landsraad spaces",
  );
  assert.equal(
    sardaukarCoordination.traits.includes("Faction: Emperor"),
    true,
    "Sardaukar Coordination should normalize its Emperor trait",
  );
  assert.ok(
    sardaukarCoordination.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "deploy-recruited-troops" &&
            effect.selector === "self" &&
            effect.source === "Sardaukar Coordination",
        ),
    ),
    "Sardaukar Coordination should use a structured Agent recruited-troop deployment modifier",
  );
  assert.ok(
    sardaukarCoordination.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ) &&
      sardaukarCoordination.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "gain-strength" && effect.amount === 1,
          ),
      ),
    "Sardaukar Coordination should preserve typed Reveal persuasion and strength effects",
  );
  assert.match(
    sardaukarCoordination.play,
    /deploy any troops you recruit this turn/i,
  );
  assert.equal(sardaukarCoordination.reveal, "+2 persuasion and +1 strength.");
  const longLiveTheFighters = data.imperiumDeck.find(
    (card) => card.name === "Long Live the Fighters",
  );
  assert.ok(
    longLiveTheFighters,
    "Imperium deck should include Long Live the Fighters",
  );
  assert.deepEqual(
    longLiveTheFighters.effects?.filter(
      (spec) => spec.trigger === "agent-play",
    ),
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
    longLiveTheFighters.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ) &&
      longLiveTheFighters.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "gain-strength" && effect.amount === 3,
          ),
      ),
    "Long Live the Fighters should carry typed Reveal persuasion and strength effects",
  );
  assert.match(
    longLiveTheFighters.play,
    /deck has three or more cards.*top three cards.*Draw one.*discard one.*trash one/i,
  );
  assert.match(longLiveTheFighters.reveal, /\+2 persuasion.*3 strength/i);
  const lateCatalog = verifyImperiumCardLateCatalogSpecs({
    cards: { calculus, chani },
    data,
    game,
    state,
  });

  return {
    cards: {
      beneGesseritOperative,
      calculus,
      capturedMentat,
      chani,
      dangerousRhetoric,
      interstellarTrade,
      longLiveTheFighters,
      smuggler,
      steersman,
      unswervingLoyalty,
      ...lateCatalog.cards,
    },
    fixtures: lateCatalog.fixtures,
    players: lateCatalog.players,
    spaces: lateCatalog.spaces,
  };
}
