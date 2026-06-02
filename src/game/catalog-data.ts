import catalogJson from "./uprising-catalog.generated.json";
import type {
  IconId,
} from "./types";

export type HubAttribute = [string, number | string | null];

export type HubCard = {
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

export const catalog = catalogJson as unknown as { counts: Record<string, number>; cards: HubCard[] };

export const iconAttributeMap: Record<string, IconId> = {
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

export const catalogStats = catalog.counts;

export function attributeNumber(card: HubCard, name: string, fallback = 0) {
  const value = card.attributes.find(([attributeName]) => attributeName === name)?.[1];
  if (typeof value === "number") return value;
  return fallback;
}

export function hasConditionalAttribute(card: HubCard, name: string) {
  return card.attributes.some(([attributeName, value]) => attributeName === name && value === null);
}

export function summarizeAttributes(card: HubCard) {
  const traits = card.attributes
    .filter(([name]) => !summaryIgnore.has(name) && !name.startsWith("Agent icon:") && !name.includes("Commander deck"))
    .slice(0, 5)
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  return traits.length ? traits.join(", ") : "Use printed card text from the imported image.";
}
