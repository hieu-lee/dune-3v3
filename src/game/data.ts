import catalogJson from "./uprising-catalog.generated.json";
import type { BoardSpace, Card, ConflictCard, IconId, TeamId } from "./types";

type HubAttribute = [string, number | string | null];
type HubCard = {
  id: number;
  name: string;
  type: string;
  displayType: string | null;
  slug: string;
  fullImageUrl: string | null;
  thumbnailImageUrl: string | null;
  localImagePath: string | null;
  localThumbnailPath: string | null;
  attributes: HubAttribute[];
};

const catalog = catalogJson as unknown as { counts: Record<string, number>; cards: HubCard[] };
const iconAttributeMap: Record<string, IconId> = {
  "Agent icon: Emperor": "emperor",
  "Agent icon: Spacing Guild": "spacing",
  "Agent icon: Bene Gesserit": "bene",
  "Agent icon: Fremen": "fremen",
  "Agent icon: Landsraad": "landsraad",
  "Agent icon: City": "city",
  "Agent icon: Spice Trade": "spice",
  "Agent icon: Spy": "spy",
};

const summaryIgnore = new Set(["Persuasion cost", "Persuasion on reveal", "Swords"]);
const conflictLevelAttributes = new Set(["conflict-1", "conflict-2", "conflict-3"]);

export const iconLabels: Record<IconId, string> = {
  emperor: "Emperor",
  spacing: "Spacing Guild",
  bene: "Bene Gesserit",
  fremen: "Fremen / Fringe",
  landsraad: "Landsraad",
  city: "City",
  spice: "Spice Trade",
  spy: "Spy",
};

export const catalogStats = catalog.counts;

export const teams: Record<TeamId, { name: string; accent: string; commander: string; motto: string }> = {
  muaddib: {
    name: "Muad'Dib",
    accent: "#5bc0be",
    commander: "Muad'Dib",
    motto: "Fremen uprising, worms, water discipline",
  },
  shaddam: {
    name: "Shaddam",
    accent: "#f2b84b",
    commander: "Shaddam Corrino IV",
    motto: "Imperial control, Sardaukar pressure, wealth",
  },
};

export const starterCards: Card[] = [
  {
    id: "starter-diplomacy",
    name: "Diplomacy",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 1,
    swords: 0,
    play: "Advance a faction relationship.",
    reveal: "+1 persuasion.",
  },
  {
    id: "starter-recon",
    name: "Reconnaissance",
    icons: ["city", "landsraad"],
    persuasion: 1,
    swords: 0,
    play: "Draw pressure or gather information.",
    reveal: "+1 persuasion.",
  },
  {
    id: "starter-ring",
    name: "Signet Ring",
    icons: ["emperor", "landsraad", "city"],
    persuasion: 1,
    swords: 1,
    play: "Trigger the leader signet ability.",
    reveal: "+1 persuasion and +1 strength.",
  },
  {
    id: "starter-dagger",
    name: "Dagger",
    icons: ["city", "spice"],
    persuasion: 0,
    swords: 1,
    play: "Send an Agent to a city or spice space.",
    reveal: "+1 strength.",
  },
  {
    id: "starter-argument",
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
    play: "Reveal-focused starter card.",
    reveal: "+2 persuasion.",
  },
];

function attributeNumber(card: HubCard, name: string, fallback = 0) {
  const value = card.attributes.find(([attributeName]) => attributeName === name)?.[1];
  if (typeof value === "number") return value;
  return fallback;
}

function hasConditionalAttribute(card: HubCard, name: string) {
  return card.attributes.some(([attributeName, value]) => attributeName === name && value === null);
}

function summarizeAttributes(card: HubCard) {
  const traits = card.attributes
    .filter(([name]) => !summaryIgnore.has(name) && !name.startsWith("Agent icon:") && !name.includes("Commander deck"))
    .slice(0, 5)
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  return traits.length ? traits.join(", ") : "Use printed card text from the imported image.";
}

function revealText(persuasion: number, swords: number) {
  const parts = [`+${persuasion} persuasion`];
  if (swords > 0) parts.push(`+${swords} strength`);
  return `${parts.join(" and ")}.`;
}

function toImperiumCard(card: HubCard): Card {
  const persuasion = attributeNumber(card, "Persuasion on reveal");
  const swords = attributeNumber(card, "Swords");
  const conditionalPersuasion = !card.attributes.some(([name]) => name === "Persuasion on reveal");
  const conditionalSwords = hasConditionalAttribute(card, "Swords");
  return {
    id: `hub-${card.id}`,
    name: card.name,
    icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
    acquired: hasConditionalAttribute(card, "Victory Point") ? 1 : undefined,
    persuasion,
    swords,
    conditionalPersuasion,
    conditionalSwords,
    play: summarizeAttributes(card),
    reveal: conditionalPersuasion || conditionalSwords ? "Resolve printed reveal text." : revealText(persuasion, swords),
    cost: attributeNumber(card, "Persuasion cost"),
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    sourceType: card.type,
    traits: card.attributes.map(([name]) => name),
  };
}

export const imperiumDeck: Card[] = catalog.cards
  .filter((card) => card.type === "imperium")
  .map(toImperiumCard);

function conflictLevel(card: HubCard): ConflictCard["level"] {
  if (card.attributes.some(([name]) => name === "conflict-3")) return 3;
  if (card.attributes.some(([name]) => name === "conflict-2")) return 2;
  return 1;
}

function toConflictCard(card: HubCard): ConflictCard {
  const rewards = card.attributes
    .filter(([name]) => !conflictLevelAttributes.has(name))
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  return {
    id: `conflict-${card.id}`,
    name: card.name,
    level: conflictLevel(card),
    rewards,
    stakes: rewards.length ? rewards.join(", ") : "Resolve printed conflict rewards.",
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const conflictCards: ConflictCard[] = catalog.cards
  .filter((card) => card.type === "conflict")
  .map(toConflictCard);

export const boardSpaces: BoardSpace[] = [
  {
    id: "economic-support",
    name: "Economic Support",
    zone: "Faction",
    icon: "emperor",
    influence: "greatHouses",
    gain: { spice: 1 },
    team: "trade",
    detail: "Great Houses influence, spice, then teammate trade.",
  },
  {
    id: "military-support",
    name: "Military Support",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 2 },
    influence: "greatHouses",
    troops: 3,
    team: "reinforce",
    detail: "Recruit three troops split across allied teammates.",
  },
  {
    id: "vast-wealth",
    name: "Vast Wealth",
    zone: "Faction",
    icon: "emperor",
    influence: "emperor",
    gain: { solari: 3 },
    team: "commander",
    personal: "shaddam",
    detail: "Commander-side Emperor pressure and Solari.",
  },
  {
    id: "sardaukar",
    name: "Sardaukar",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 3 },
    influence: "emperor",
    gain: { intrigue: 1 },
    troops: 4,
    team: "commander",
    personal: "shaddam",
    detail: "Shaddam personal-board space; 3 spice in six-player mode.",
  },
  {
    id: "hardy-warriors",
    name: "Hardy Warriors",
    zone: "Faction",
    icon: "fremen",
    cost: { water: 1 },
    influence: "fremen",
    troops: 2,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence and two recruited troops.",
  },
  {
    id: "expedition",
    name: "Expedition",
    zone: "Faction",
    icon: "fremen",
    influence: "fringeWorlds",
    gain: { solari: 2 },
    detail: "Fringe Worlds influence and contract fallback value.",
  },
  {
    id: "controversial-tech",
    name: "Controversial Technology",
    zone: "Faction",
    icon: "fremen",
    cost: { spice: 2 },
    influence: "fringeWorlds",
    draw: 1,
    gain: { intrigue: 1 },
    detail: "Fringe influence, intrigue, draw, and trash hook.",
  },
  {
    id: "desert-mastery",
    name: "Desert Mastery",
    zone: "Faction",
    icon: "fremen",
    influence: "fremen",
    gain: { spice: 1 },
    draw: 1,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence, card draw, spice, combat.",
  },
  {
    id: "arrakeen",
    name: "Arrakeen",
    zone: "City",
    icon: "city",
    gain: { solari: 1 },
    troops: 1,
    draw: 1,
    combat: true,
    detail: "Recruit, draw, and city control income.",
  },
  {
    id: "carthag",
    name: "Carthag",
    zone: "City",
    icon: "city",
    gain: { intrigue: 1 },
    troops: 1,
    combat: true,
    detail: "Recruit a troop and take an Intrigue.",
  },
  {
    id: "research-station",
    name: "Research Station",
    zone: "City",
    icon: "city",
    cost: { water: 2 },
    troops: 2,
    draw: 2,
    combat: true,
    detail: "High-value draw and deployment point.",
  },
  {
    id: "swordmaster",
    name: "Swordmaster",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 8 },
    detail: "Six-player single-use Swordmaster, then +2 reveal strength.",
  },
  {
    id: "high-council",
    name: "High Council",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 5 },
    gain: { spice: 2, intrigue: 1 },
    troops: 3,
    detail: "Council seat or repeat reward shell.",
  },
  {
    id: "gather-support",
    name: "Gather Support",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 2 },
    gain: { water: 1 },
    troops: 2,
    detail: "Recruit two; paid version gains water.",
  },
  {
    id: "secrets",
    name: "Secrets",
    zone: "Faction",
    icon: "bene",
    influence: "bene",
    gain: { intrigue: 1 },
    detail: "Bene Gesserit influence and intrigue pressure.",
  },
  {
    id: "espionage",
    name: "Espionage",
    zone: "Faction",
    icon: "bene",
    cost: { spice: 1 },
    influence: "bene",
    draw: 1,
    gain: { intrigue: 1 },
    spy: 1,
    detail: "Influence, draw, and place a spy.",
  },
  {
    id: "deliver-supplies",
    name: "Deliver Supplies",
    zone: "Faction",
    icon: "spacing",
    influence: "spacing",
    gain: { water: 1 },
    detail: "Spacing Guild influence and water.",
  },
  {
    id: "shipping",
    name: "Shipping",
    zone: "Spice Trade",
    icon: "spice",
    cost: { spice: 3 },
    influence: "spacing",
    gain: { solari: 5 },
    detail: "Requires Guild influence in the full rules.",
  },
  {
    id: "spice-refinery",
    name: "Spice Refinery",
    zone: "City",
    icon: "city",
    cost: { spice: 1 },
    gain: { solari: 4 },
    combat: true,
    detail: "Convert spice to Solari and contest city control.",
  },
  {
    id: "heighliner",
    name: "Heighliner",
    zone: "Faction",
    icon: "spacing",
    cost: { spice: 5 },
    influence: "spacing",
    troops: 5,
    combat: true,
    detail: "Guild influence and a heavy troop deployment.",
  },
  {
    id: "imperial-basin",
    name: "Imperial Basin",
    zone: "Desert",
    icon: "spice",
    gain: { spice: 1 },
    combat: true,
    detail: "Maker space with bonus spice hook.",
  },
  {
    id: "habbanya-erg",
    name: "Habbanya Erg",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    draw: 1,
    combat: true,
    detail: "Six-player desert space with draw.",
  },
  {
    id: "hagga-basin",
    name: "Hagga Basin",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    combat: true,
    detail: "Maker space; worm option when hooks are owned.",
  },
  {
    id: "deep-desert",
    name: "Deep Desert",
    zone: "Desert",
    icon: "spice",
    cost: { water: 3 },
    gain: { spice: 4 },
    combat: true,
    detail: "Deep maker space; two-worm payoff later.",
  },
];

export const reserveMarket: Card[] = catalog.cards
  .filter((card) => card.name === "The Spice Must Flow")
  .map(toImperiumCard);
