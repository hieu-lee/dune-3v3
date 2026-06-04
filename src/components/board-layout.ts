export type BoardRegionSpec = {
  id: string;
  title: string;
  subtitle: string;
  tone: string;
  spaceIds: readonly string[];
};

export const factionRegions: readonly BoardRegionSpec[] = [
  {
    id: "great-houses",
    title: "Great Houses",
    subtitle: "Imperial pressure",
    tone: "emperor",
    spaceIds: ["dutiful-service", "economic-support", "military-support"],
  },
  {
    id: "spacing-guild",
    title: "Spacing Guild",
    subtitle: "Transit and ships",
    tone: "spacing",
    spaceIds: ["deliver-supplies", "heighliner"],
  },
  {
    id: "bene-gesserit",
    title: "Bene Gesserit",
    subtitle: "Secrets and spies",
    tone: "bene",
    spaceIds: ["secrets", "espionage"],
  },
  {
    id: "fringe-worlds",
    title: "Fringe Worlds",
    subtitle: "Remote leverage",
    tone: "fremen",
    spaceIds: ["expedition", "controversial-tech"],
  },
];

export const boardRegions: readonly BoardRegionSpec[] = [
  {
    id: "landsraad",
    title: "Landsraad Council",
    subtitle: "Council chambers",
    tone: "landsraad",
    spaceIds: ["high-council", "assembly-hall", "swordmaster", "gather-support"],
  },
  {
    id: "choam",
    title: "CHOAM / Shipping",
    subtitle: "Contracts and freight",
    tone: "choam",
    spaceIds: ["accept-contract", "shipping"],
  },
  {
    id: "cities",
    title: "City Strongholds",
    subtitle: "Control and deployment",
    tone: "city",
    spaceIds: ["sietch-tabr", "carthag", "research-station", "spice-refinery", "arrakeen"],
  },
  {
    id: "desert",
    title: "Deep Desert",
    subtitle: "Maker spice fields",
    tone: "desert",
    spaceIds: ["deep-desert", "habbanya-erg", "hagga-basin", "imperial-basin"],
  },
];

export const commanderRegions: readonly BoardRegionSpec[] = [
  {
    id: "muaddib-command",
    title: "Muad'Dib Command",
    subtitle: "Personal board",
    tone: "muaddib",
    spaceIds: ["hardy-warriors", "desert-mastery"],
  },
  {
    id: "shaddam-command",
    title: "Shaddam Command",
    subtitle: "Personal board",
    tone: "shaddam",
    spaceIds: ["vast-wealth", "sardaukar"],
  },
];

export const scoreTrackValues = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

export const boardLayoutSpaceIds = [
  ...factionRegions.flatMap((region) => region.spaceIds),
  ...boardRegions.flatMap((region) => region.spaceIds),
  ...commanderRegions.flatMap((region) => region.spaceIds),
];
