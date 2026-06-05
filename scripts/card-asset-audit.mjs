import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "artifacts/card-audit");
const outJson = path.join(outDir, "card-asset-audit.json");
const outHtml = path.join(outDir, "card-asset-audit.html");

function localAssetFile(imagePath) {
  if (!imagePath?.startsWith("/assets/")) return undefined;
  return path.join(repoRoot, "public", imagePath);
}

function htmlAssetPath(imagePath) {
  if (!imagePath?.startsWith("/assets/")) return "";
  return `../../public${imagePath}`;
}

function paidRewardLabel(reward) {
  if (!reward || typeof reward !== "object") return JSON.stringify(reward);
  if (reward.kind === "bundle" && Array.isArray(reward.rewards)) {
    return `bundle[${reward.rewards.map(paidRewardLabel).join(" + ")}]`;
  }

  const parts = [reward.kind ?? JSON.stringify(reward)];
  if (reward.selector) parts.push(`selector=${reward.selector}`);
  if (reward.amount !== undefined) parts.push(`amount=${JSON.stringify(reward.amount)}`);
  if (reward.resource) parts.push(`resource=${reward.resource}`);
  if (reward.faction) parts.push(`faction=${reward.faction}`);
  if (reward.destination) parts.push(`destination=${reward.destination}`);
  if (reward.counter) parts.push(`counter=${reward.counter}`);
  if (reward.troopSupplyCost !== undefined) {
    parts.push(`troopSupplyCost=${JSON.stringify(reward.troopSupplyCost)}`);
  }
  return parts.join(" ");
}

function paidRewardOptionLabel(option) {
  if (!option || typeof option !== "object") return JSON.stringify(option);

  const parts = [option.id ?? JSON.stringify(option)];
  if (option.resource) parts.push(`resource=${option.resource}`);
  if (option.cost !== undefined) parts.push(`cost=${JSON.stringify(option.cost)}`);
  if (option.reward) parts.push(`reward=${paidRewardLabel(option.reward)}`);
  return parts.join(" ");
}

function paidRewardOptionsLabel(options) {
  if (!Array.isArray(options)) return JSON.stringify(options);
  return `[${options.map(paidRewardOptionLabel).join("; ")}]`;
}

function optionLabel(option) {
  if (!option || typeof option !== "object") return JSON.stringify(option);

  const parts = [];
  if (option.id) parts.push(option.id);
  if (option.label) parts.push(`label=${JSON.stringify(option.label)}`);
  if (option.conditions?.length) {
    parts.push(`if ${option.conditions.map(effectLabel).join("; ")}`);
  }
  if (option.effect) parts.push(`effect=${effectLabel(option.effect)}`);
  appendRemainingFields(parts, option, new Set(["id", "label", "conditions", "effect"]));
  return parts.join(" ");
}

function optionsLabel(options) {
  if (!Array.isArray(options)) return JSON.stringify(options);
  return `[${options.map(optionLabel).join("; ")}]`;
}

function appendRemainingFields(parts, value, handledFields) {
  for (const [field, fieldValue] of Object.entries(value)) {
    if (handledFields.has(field) || fieldValue === undefined) continue;
    if (fieldValue === true) {
      parts.push(field);
      continue;
    }
    parts.push(`${field}=${JSON.stringify(fieldValue)}`);
  }
}

function effectLabel(effect) {
  if (!effect || typeof effect !== "object") return String(effect);
  if (effect.kind) {
    const parts = [effect.kind];
    if (effect.source) parts.push(`source=${effect.source}`);
    if (effect.selector) parts.push(`selector=${effect.selector}`);
    if (effect.requiredRecipient) parts.push(`requiredRecipient=${effect.requiredRecipient}`);
    if (effect.requirePayableOption) parts.push("requirePayableOption");
    if (effect.kind === "paid-reward-choice" && effect.options) {
      parts.push(`options=${paidRewardOptionsLabel(effect.options)}`);
    } else if (effect.options) {
      parts.push(`options=${optionsLabel(effect.options)}`);
    }
    appendRemainingFields(parts, effect, new Set([
      "kind",
      "source",
      "selector",
      "requiredRecipient",
      "requirePayableOption",
      "options",
    ]));
    return parts.join(" ");
  }
  return JSON.stringify(effect);
}

function specSummary(spec) {
  const choice = spec.choiceId ? ` choice=${spec.choiceId}` : "";
  const conditions = spec.conditions?.length ? ` if ${spec.conditions.map(effectLabel).join("; ")}` : "";
  return `${spec.trigger}${choice}${conditions}: ${spec.effects.map(effectLabel).join(" | ")}`;
}

function mapLabel(label, value) {
  return value === undefined ? undefined : `${label}=${JSON.stringify(value)}`;
}

function conflictRewardLabel(rank, reward) {
  if (!reward) return undefined;
  const parts = [
    mapLabel("fixedVp", reward.fixedVp),
    mapLabel("contracts", reward.contracts),
    mapLabel("influence", reward.influence),
    mapLabel("influenceChoices", reward.influenceChoices),
    mapLabel("influenceChoiceOptions", reward.influenceChoiceOptions),
    mapLabel("intrigues", reward.intrigues),
    mapLabel("resources", reward.resources),
    mapLabel("spies", reward.spies),
    mapLabel("trashCards", reward.trashCards),
    mapLabel("troops", reward.troops),
    mapLabel("conversion", reward.conversion),
  ].filter(Boolean);
  return `conflict-reward rank=${rank}: ${parts.join(" ")}`;
}

function bespokeImplementationSummary(group, card, context) {
  if (group === "conflict") {
    return [1, 2, 3]
      .map((rank) => conflictRewardLabel(rank, context.conflictBattleRewardsBySourceId[card.sourceId]?.[rank]))
      .filter(Boolean);
  }

  if (group === "intrigue") {
    const summaries = [];
    if (card.battleIcon) {
      summaries.push(`plot/endgame-battle-icon battleIcon=${card.battleIcon}: Plot gains 1 spice; Ally Endgame flips a matching or wild won Conflict for 1 VP`);
    }
    if (card.sourceId === context.choamProfitsSourceId) {
      summaries.push("endgame-conditional: completedContracts>=4 -> gain 1 VP");
    }
    if (card.sourceId === context.secureSpiceTradeSourceId) {
      summaries.push("endgame-conditional: theSpiceMustFlowCount>=2 -> gain 1 VP and 2 spice");
    }
    if (card.sourceId === context.shadowAllianceSourceId) {
      summaries.push("endgame-conditional: effectiveInfluence>=4 where opposing team owns Alliance -> gain 1 VP");
    }
    return summaries;
  }

  return [];
}

function displayFields(card) {
  return Object.fromEntries(
    [
      ["play", card.play],
      ["reveal", card.reveal],
      ["summary", card.summary],
      ["stakes", card.stakes],
      ["rewards", card.rewards],
      ["icons", card.icons],
      ["battleIcon", card.battleIcon],
      ["cost", card.cost],
      ["persuasion", card.persuasion],
      ["swords", card.swords],
      ["combatSwords", card.combatSwords],
      ["traits", card.traits],
      ["acquired", card.acquired],
      ["revealGain", card.revealGain],
      ["trashOnPlay", card.trashOnPlay],
      ["ignoreInfluenceRequirements", card.ignoreInfluenceRequirements],
      ["sourceType", card.sourceType],
      ["agentPlacementSpaceId", card.agentPlacementSpaceId],
      ["agentPlacementTargetOwnerId", card.agentPlacementTargetOwnerId],
    ].filter(([, value]) => value !== undefined)
  );
}

function auditEntry(group, card, catalogById, context) {
  const assetFile = localAssetFile(card.imagePath);
  const catalogCard = catalogById.get(card.sourceId);
  const specSummaries = card.effects?.map(specSummary) ?? [];
  return {
    group,
    id: card.id,
    sourceId: card.sourceId,
    sourceSlug: card.sourceSlug,
    name: card.name,
    imagePath: card.imagePath,
    assetFile,
    assetExists: assetFile ? existsSync(assetFile) : false,
    catalogAttributes: catalogCard?.attributes ?? [],
    display: displayFields(card),
    effectSummary: [...specSummaries, ...bespokeImplementationSummary(group, card, context)],
    effects: card.effects ?? [],
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return escapeHtml(value);
  return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderHtml(entries) {
  const groupCounts = entries.reduce((counts, entry) => {
    counts[entry.group] = (counts[entry.group] ?? 0) + 1;
    return counts;
  }, {});
  const nav = Object.entries(groupCounts)
    .map(([group, count]) => `<a href="#${escapeHtml(group)}">${escapeHtml(group)} (${count})</a>`)
    .join("");
  const sections = Object.keys(groupCounts)
    .map((group) => {
      const cards = entries
        .filter((entry) => entry.group === group)
        .map((entry) => `
          <article class="card-row" id="${escapeHtml(`${group}-${entry.id}`)}">
            <div class="asset">
              <img src="${escapeHtml(htmlAssetPath(entry.imagePath))}" alt="${escapeHtml(entry.name)} asset" loading="lazy" />
              <small>${entry.assetExists ? "asset found" : "missing asset"}${entry.sourceId ? ` · source ${entry.sourceId}` : ""}</small>
            </div>
            <div class="facts">
              <h3>${escapeHtml(entry.name)}</h3>
              <dl>
                ${
                  entry.catalogAttributes.length
                    ? `<dt>catalog attributes</dt><dd>${renderValue(entry.catalogAttributes)}</dd>`
                    : ""
                }
                ${Object.entries(entry.display)
                  .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${renderValue(value)}</dd>`)
                  .join("")}
              </dl>
              <h4>Implementation Summary</h4>
              ${
                entry.effectSummary.length
                  ? `<ul>${entry.effectSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
                  : `<p class="muted">No effect specs recorded for this card type.</p>`
              }
              <details>
                <summary>Raw effect specs</summary>
                <pre>${escapeHtml(JSON.stringify(entry.effects, null, 2))}</pre>
              </details>
            </div>
          </article>
        `)
        .join("");
      return `<section id="${escapeHtml(group)}"><h2>${escapeHtml(group)}</h2>${cards}</section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dune Card Asset Audit</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f4ef;
      color: #201c17;
    }
    body { margin: 0; }
    header {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #fffdf8;
      border-bottom: 1px solid #d8d1c5;
      padding: 16px 24px;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    nav { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 13px; }
    nav a { color: #28516d; text-decoration: none; }
    main { padding: 24px; }
    section { margin-bottom: 40px; }
    h2 { font-size: 20px; border-bottom: 1px solid #d8d1c5; padding-bottom: 8px; }
    .card-row {
      display: grid;
      grid-template-columns: minmax(180px, 250px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
      padding: 16px 0;
      border-bottom: 1px solid #e3ddd2;
    }
    .asset img {
      width: 100%;
      max-height: 520px;
      object-fit: contain;
      background: #15120f;
      border-radius: 6px;
      box-shadow: 0 1px 4px rgb(0 0 0 / 18%);
    }
    .asset small, .muted { color: #6d6254; }
    h3 { margin: 0 0 10px; font-size: 18px; }
    h4 { margin: 16px 0 6px; }
    dl {
      display: grid;
      grid-template-columns: 130px minmax(0, 1fr);
      gap: 6px 12px;
      margin: 0;
    }
    dt { font-weight: 700; color: #493f33; }
    dd { margin: 0; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #fffaf0;
      border: 1px solid #e4d9c6;
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
    }
    details { margin-top: 12px; }
    @media (max-width: 760px) {
      main { padding: 16px; }
      .card-row { grid-template-columns: 1fr; }
      .asset img { max-height: 720px; }
      dl { grid-template-columns: 1fr; }
      dt { margin-top: 6px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Dune Card Asset Audit</h1>
    <nav>${nav}</nav>
  </header>
  <main>${sections}</main>
</body>
</html>
`;
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const catalogData = await server.ssrLoadModule("/src/game/catalog-data.ts");
  const conflictRewardData = await server.ssrLoadModule("/src/game/conflict-reward-data.ts");
  const cardIdentifiers = await server.ssrLoadModule("/src/game/card-identifiers.ts");
  const catalogById = new Map(catalogData.catalog.cards.map((card) => [card.id, card]));
  const context = {
    conflictBattleRewardsBySourceId: conflictRewardData.conflictBattleRewardsBySourceId,
    choamProfitsSourceId: cardIdentifiers.choamProfitsSourceId,
    secureSpiceTradeSourceId: cardIdentifiers.secureSpiceTradeSourceId,
    shadowAllianceSourceId: cardIdentifiers.shadowAllianceSourceId,
  };
  const groups = [
    ["ally-starter", data.allyStarterCards],
    ["muad-dib-commander", data.muadDibCommanderCards],
    ["emperor-commander", data.emperorCommanderCards],
    ["reserve-market", data.reserveMarket],
    ["imperium", data.imperiumDeck],
    ["intrigue", data.intrigueCards],
    ["leader", data.leaderCards],
    ["conflict", data.conflictCards],
    ["standard-contract", data.standardContracts],
    ["shaddam-contract", data.shaddamReservedContracts],
  ];
  const entries = groups.flatMap(([group, cards]) =>
    [...cards]
      .sort((left, right) => left.name.localeCompare(right.name) || String(left.id).localeCompare(String(right.id)))
      .map((card) => auditEntry(group, card, catalogById, context))
  );
  const missingAssets = entries.filter((entry) => !entry.assetExists);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outJson, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    cardCount: entries.length,
    groupCounts: Object.fromEntries(groups.map(([group, cards]) => [group, cards.length])),
    missingAssets: missingAssets.map((entry) => ({
      group: entry.group,
      id: entry.id,
      name: entry.name,
      imagePath: entry.imagePath,
    })),
    entries,
  }, null, 2)}\n`);
  writeFileSync(outHtml, renderHtml(entries));
  if (missingAssets.length) {
    throw new Error(`Card asset audit generated with ${missingAssets.length} missing assets. See ${outJson}`);
  }
  console.log(`card asset audit generated: ${path.relative(repoRoot, outHtml)}`);
  console.log(`card asset audit data: ${path.relative(repoRoot, outJson)}`);
  console.log(`cards audited: ${entries.length}`);
} finally {
  await server.close();
}
