#!/usr/bin/env node
/**
 * community_leads.mjs — pull PUBLIC candidate leads from Hacker News + Reddit.
 * No auth, no emails harvested. Output columns match data/leads.sample.csv.
 *
 *   node sources/community_leads.mjs data/community_leads.csv
 */
import { writeFileSync } from "node:fs";

const HN_QUERIES = [
  { q: "AI coding agent", tags: "ai-agent|ai-coding|coding-agent" },
  { q: "vibe coding", tags: "vibe-coding|ai-coding" },
  { q: "autonomous agent", tags: "autonomous|agents|agentic" },
  { q: "claude code", tags: "claude-code|agents" },
  { q: "cursor ai coding", tags: "ai-coding|devtools" },
];
const REDDIT = [
  { sub: "LocalLLaMA", q: "coding agent" },
  { sub: "LocalLLaMA", q: "vibe coding" },
  { sub: "ChatGPTCoding", q: "agent" },
];
const UA = "AwareLiquid-Outreach/1.0 (research; contact anmuning@awareliquid.ai)";
const OUT = process.argv[2] || "";
const rows = [];
const seen = new Set();
const clean = (s) => String(s || "").replace(/[,\n"]/g, " ").slice(0, 140);

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// --- Hacker News (Algolia, no auth) ---
for (const { q, tags } of HN_QUERIES) {
  try {
    const j = await getJson(`https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(q)}&hitsPerPage=30`);
    for (const h of j.hits || []) {
      const key = "hn:" + h.objectID;
      if (seen.has(key) || !h.title) continue;
      seen.add(key);
      rows.push({
        id: rows.length + 1, org: h.author || "hn-user", contact: "", email: "",
        stack: tags, stage: "", source: "hackernews",
        source_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        stars: h.points || 0, homepage: h.url || "", warm_intro: "", last_touch: "",
        status: "research", fit_note: clean(h.title), hook: "",
      });
    }
  } catch (e) { process.stderr.write(`HN query failed (${q}): ${e.message}\n`); }
}

// --- Reddit (public search JSON) ---
for (const { sub, q } of REDDIT) {
  try {
    const j = await getJson(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=top&t=year&limit=40`);
    for (const c of (j.data?.children || [])) {
      const d = c.data; if (!d || !d.title) continue;
      const key = "rd:" + d.id;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: rows.length + 1, org: d.author || "reddit-user", contact: "", email: "",
        stack: q.toLowerCase(), stage: "", source: "reddit",
        source_url: `https://www.reddit.com${d.permalink}`,
        stars: d.score || 0, homepage: "", warm_intro: "", last_touch: "",
        status: "research", fit_note: clean(d.title), hook: "",
      });
    }
  } catch (e) { process.stderr.write(`Reddit r/${sub} (${q}) failed: ${e.message}\n`); }
}

const cols = Object.keys(rows[0] || { id: 1 });
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
if (OUT) { writeFileSync(OUT, csv, "utf8"); process.stderr.write(`wrote ${rows.length} leads to ${OUT}\n`); }
else process.stdout.write(csv);
