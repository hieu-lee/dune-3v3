import assert from "node:assert/strict";

const intrigueSpecs = {
  backedByChoam: { sourceId: 448, label: "Backed by CHOAM" },
  buyAccess: { sourceId: 139, label: "Buy Access" },
  callToArms: { sourceId: 138, label: "Call to Arms" },
  changeAllegiances: { sourceId: 135, label: "Change Allegiances" },
  contingencyPlan: { sourceId: 147, label: "Contingency Plan" },
  councilorsAmbition: { sourceId: 129, label: "Councilor's Ambition" },
  crysknife: { sourceId: 159, label: "Crysknife" },
  cunning: { sourceId: 133, label: "Cunning" },
  departForArrakis: { sourceId: 132, label: "Depart For Arrakis" },
  desertMouse: { sourceId: 157, label: "Desert Mouse" },
  detonation: { sourceId: 131, label: "Detonation" },
  devour: { sourceId: 151, label: "Devour" },
  distraction: { sourceId: 144, label: "Distraction" },
  findWeakness: { sourceId: 149, label: "Find Weakness" },
  goToGround: { sourceId: 146, label: "Go To Ground" },
  imperiumPolitics: { sourceId: 140, label: "Imperium Politics" },
  impress: { sourceId: 152, label: "Impress" },
  inspireAwe: { sourceId: 148, label: "Inspire Awe" },
  intelligenceReport: { sourceId: 142, label: "Intelligence Report" },
  leverage: { sourceId: 447, label: "Leverage" },
  manipulate: { sourceId: 143, label: "Manipulate" },
  marketOpportunity: { sourceId: 145, label: "Market Opportunity" },
  mercenaries: { sourceId: 128, label: "Mercenaries" },
  opportunism: { sourceId: 134, label: "Opportunism" },
  ornithopter: { sourceId: 158, label: "Ornithopter" },
  questionableMethods: { sourceId: 156, label: "Questionable Methods" },
  choamProfits: { sourceId: 450, label: "CHOAM Profits" },
  secureSpiceTrade: { sourceId: 161, label: "Secure Spice Trade" },
  shadowAlliance: { sourceId: 160, label: "Shadow Alliance" },
  shaddamsFavor: { sourceId: 141, label: "Shaddam's Favor" },
  sietchRitual: { sourceId: 127, label: "Sietch Ritual" },
  specialMission: { sourceId: 136, label: "Special Mission" },
  springTheTrap: { sourceId: 153, label: "Spring The Trap" },
  strategicStockpiling: { sourceId: 130, label: "Strategic Stockpiling" },
  unexpectedAllies: { sourceId: 137, label: "Unexpected Allies" },
};

const summaryExpectations = {
  backedByChoam: [
    "Lose 1 Influence to gain 4 Solari as a Plot Intrigue OR add 4 strength in Combat if you have completed at least two contracts.",
    "Backed by CHOAM should expose its Plot branch and completed-contract Combat threshold",
  ],
  buyAccess: [
    "Spend 5 Solari to gain two different Influence among Emperor/Great Houses, Fremen/Fringe, Bene Gesserit, and Spacing Guild.",
    "Buy Access should expose its Solari-for-two-Influence choice",
  ],
  callToArms: [
    "During your Reveal turn this round, whenever you acquire a card, recruit 1 troop.",
    "Call to Arms should expose its reveal-turn acquisition trigger",
  ],
  changeAllegiances: [
    "Lose 1 Influence to gain 1 Influence; you may also spend 3 spice to gain 1 Influence.",
    "Change Allegiances should expose both optional Influence branches",
  ],
  contingencyPlan: [
    "Gain 2 Solari as a Plot Intrigue OR add 3 strength as a Combat Intrigue.",
    "Contingency Plan should expose both printed timing branches",
  ],
  councilorsAmbition: [
    "If you have a seat on the High Council, gain 2 water.",
    "Councilor's Ambition should expose its High Council requirement",
  ],
  choamProfits: [
    "Endgame: if you have completed four or more contracts, gain 1 VP.",
    "CHOAM Profits should expose its completed-contract Endgame condition",
  ],
  crysknife: [
    "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Crysknife or wild Conflict you won to gain 1 VP.",
    "Crysknife should expose both Plot spice and Endgame battle-icon scoring",
  ],
  cunning: [
    "Draw 1 card OR spend 1 spice to draw 1 card and trash 1 card.",
    "Cunning should expose both Plot branches",
  ],
  departForArrakis: [
    "Spend 2 spice to recruit 3 troops; with 3+ Fremen/Fringe Influence, draw 1 card.",
    "Depart For Arrakis should expose its spice troop cost and conditional card draw",
  ],
  desertMouse: [
    "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Desert Mouse or wild Conflict you won to gain 1 VP.",
    "Desert Mouse should expose both Plot spice and Endgame battle-icon scoring",
  ],
  detonation: [
    "Remove the Shield Wall OR deploy up to four troops from your garrison to the Conflict.",
    "Detonation should expose its printed Plot choice instead of a generic imported-image summary",
  ],
  devour: [
    "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
    "Devour should expose its sandworm threshold and optional trash effect",
  ],
  distraction: [
    "After you deploy three or more units to the Conflict in a single turn, you may place a spy on the same observation post as another player's spy.",
    "Distraction should expose its three-unit shared-spy trigger",
  ],
  findWeakness: [
    "Add 2 strength; you may recall 1 spy to add 3 more strength.",
    "Find Weakness should expose its base strength and optional spy recall",
  ],
  goToGround: [
    "Retreat 1 or 2 troops, then optionally place a spy.",
    "Go To Ground should expose its troop retreat and spy placement effect",
  ],
  imperiumPolitics: [
    "Spend 1 Solari to gain 1 Emperor/Great Houses or Spacing Guild Influence.",
    "Imperium Politics should expose its Solari-for-Influence choice",
  ],
  impress: [
    "Add 2 strength, then acquire a card that costs 3 or less.",
    "Impress should expose its strength and acquisition effect",
  ],
  inspireAwe: [
    "Acquire a card that costs 3 or less; put it in your hand if you have a sandworm in the Conflict.",
    "Inspire Awe should expose its acquisition and sandworm destination effect",
  ],
  intelligenceReport: [
    "Draw 1 card; draw 1 more if you have two or more spies on the board.",
    "Intelligence Report should expose its conditional card draw",
  ],
  leverage: [
    "If you gained spice this turn, gain 1 Solari and may take a face-up CHOAM contract.",
    "Leverage should expose its spice-gated Solari and contract effect",
  ],
  manipulate: [
    "Remove and replace a card in the Imperium Row; during your Reveal turn this round, you may acquire it for 1 Persuasion less.",
    "Manipulate should expose its row removal and Reveal discount effect",
  ],
  marketOpportunity: [
    "Spend 2 spice to gain 5 Solari OR spend 5 Solari to gain 5 spice.",
    "Market Opportunity should expose both resource exchange branches",
  ],
  mercenaries: [
    "Spend 3 Solari to draw 1 Intrigue and recruit 2 troops.",
    "Mercenaries should expose its Solari cost, Intrigue draw, and troop recruit",
  ],
  opportunism: [
    "Spend 2 Solari and lose 2 Influence to gain 1 VP.",
    "Opportunism should expose its Solari and Influence costs for 1 VP",
  ],
  ornithopter: [
    "Gain 1 spice as a Plot Intrigue OR at Endgame, flip a face-up Ornithopter or wild Conflict you won to gain 1 VP.",
    "Ornithopter should expose both Plot spice and Endgame battle-icon scoring",
  ],
  questionableMethods: [
    "Add 1 strength; the recipient may lose 1 Influence, or a Commander may lose personal Influence, to add 4 more strength.",
    "Questionable Methods should expose its base strength and optional Influence loss",
  ],
  secureSpiceTrade: [
    "Endgame: if you have at least two The Spice Must Flow cards, gain 1 VP and 2 spice.",
    "Secure Spice Trade should expose its The Spice Must Flow Endgame condition",
  ],
  shadowAlliance: [
    "Endgame: if you have 4+ Influence on a Faction track where an opponent has the Alliance, gain 1 VP.",
    "Shadow Alliance should expose its opposing-Alliance Endgame condition",
  ],
  shaddamsFavor: [
    "Recruit 1 troop; with 3+ Emperor/Great Houses Influence, gain 3 Solari.",
    "Shaddam's Favor should expose its recruit and conditional Solari effects",
  ],
  sietchRitual: [
    "Discard a card to gain 1 Bene Gesserit or Fremen/Fringe Influence.",
    "Sietch Ritual should expose its discard-for-Influence choice",
  ],
  specialMission: [
    "Place 1 spy on a City observation post OR recall 1 spy to remove the Shield Wall and gain 2 spice.",
    "Special Mission should expose its City spy and recall-spy branches",
  ],
  springTheTrap: [
    "Recall 2 spies to add 7 strength.",
    "Spring The Trap should expose its two-spy cost and Combat strength",
  ],
  strategicStockpiling: [
    "Spend 5 spice to gain 1 VP; with 3+ Spacing Guild Influence, you may also spend 3 water to gain 1 VP.",
    "Strategic Stockpiling should expose both VP conversion branches",
  ],
  unexpectedAllies: [
    "Pay 2 water to deploy a sandworm to the Conflict; may remove the Shield Wall.",
    "Unexpected Allies should expose its water, detonation, and sandworm effect",
  ],
};

export function collectIntrigueVerifierCards(data) {
  const cards = Object.fromEntries(
    Object.entries(intrigueSpecs).map(([key, spec]) => [
      key,
      data.intrigueCards.find((card) => card.sourceId === spec.sourceId),
    ]),
  );

  for (const [key, spec] of Object.entries(intrigueSpecs)) {
    assert.ok(cards[key], `${spec.label} Intrigue should be available`);
  }

  for (const [key, [summary, message]] of Object.entries(summaryExpectations)) {
    assert.equal(cards[key].summary, summary, message);
  }

  return cards;
}
