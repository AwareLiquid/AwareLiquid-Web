#!/usr/bin/env node
/**
 * github_leads.mjs — pull PUBLICLY-LISTED candidate leads from GitHub.
 *
 * Only public data. Emails are taken ONLY if an owner published one on their
 * public profile; we never scrape or guess addresses. Uses the authenticated
 * `gh` CLI (token stays in gh), so it is rate-limit friendly.
 *
 *   node sources/github_leads.mjs > data/leads.sample.csv
 *
 * Output columns match data/leads.sample.csv (see README). Verify each row and
 * never contact anyone without a real, relevant reason.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const QUERIES = [
  "topic:vibe-coding stars:>10",
  "topic:ai-coding-agent stars:>10",
  "topic:ai-agent in:name,description stars:>100",
  '"AI coding assistant" in:description stars:>50',
  "topic:autonomous-agents stars:>50",
];
const PER_PAGE = 25;
const OUT = process.argv[2] || ""; // optional output file

function gh(path) {
  const raw = execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(raw);
}

const rows = [];
const seen = new Set();
for (const q of QUERIES) {
  const path = `search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${PER_PAGE}`;
  let res;
  try { res = gh(path); } catch (e) { process.stderr.write(`query failed: ${q}\n`); continue; }
  for (const r of res.items || []) {
    const key = r.full_name;
    if (seen.has(key)) continue;
    seen.add(key);
    // Public profile email is rare and costs one API call per owner; leave blank
    // and fill it yourself from the repo/owner page when you decide to reach out.
    const email = "";
    rows.push({
      id: rows.length + 1,
      org: r.owner.login,
      contact: "",
      email,
      stack: (r.topics || []).slice(0, 4).join("|") || (r.language || "").toLowerCase(),
      stage: "",
      source: "github",
      source_url: r.html_url,
      stars: r.stargazers_count,
      homepage: r.homepage || "",
      warm_intro: "",
      last_touch: "",
      status: "research",
      fit_note: (r.description || "").slice(0, 120).replace(/[,\n"]/g, " "),
      hook: "",
    });
  }
}

const cols = Object.keys(rows[0]);
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
if (OUT) { writeFileSync(OUT, csv, "utf8"); process.stderr.write(`wrote ${rows.length} leads to ${OUT}\n`); }
else process.stdout.write(csv);
