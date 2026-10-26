#!/usr/bin/env node
/**
 * JevBench coverage audit — compute-light, no model training.
 * Reads per-item results (JSONL) and emits a coverage ledger, a markdown report,
 * and an experiment queue (Phase 0 = compute:none / eval-only only).
 *
 * Usage:
 *   node internal/coverage/audit.mjs --self-test
 *   node internal/coverage/audit.mjs --items <items.jsonl> --out <dir> \
 *        [--min-support 8] [--min-acc 0.5] [--family-map <map.json>]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import os from "node:os";

// Change only this if the official harness uses different field names.
const FIELD_MAP = {
  id: "id", tier: "tier", family: "task_family", labelSet: "label_set",
  gold: "gold", pred: "pred", schemaValid: "schema_valid", latency: "latency_ms",
};

function parseArgs(argv) {
  const a = { items: "", out: "", minSupport: 8, minAcc: 0.5, familyMap: "", selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--self-test") a.selfTest = true;
    else if (k === "--items") a.items = argv[++i];
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--min-support") a.minSupport = Number(argv[++i]);
    else if (k === "--min-acc") a.minAcc = Number(argv[++i]);
    else if (k === "--family-map") a.familyMap = argv[++i];
  }
  return a;
}

function loadItems(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim());
  return lines.map((l, i) => {
    try { return JSON.parse(l); }
    catch (e) { throw new Error(`bad JSONL at line ${i + 1}: ${e.message}`); }
  });
}

const famOf = (it, map) =>
  it[FIELD_MAP.family] || (map && (map[it[FIELD_MAP.id]] || map[it[FIELD_MAP.tier]])) || "UNMAPPED";

// Plan §5 step 1: required fields must be present; label_set must be an array.
function validateItems(items) {
  const required = [FIELD_MAP.tier, FIELD_MAP.labelSet, FIELD_MAP.gold, FIELD_MAP.pred];
  items.forEach((it, i) => {
    const id = it[FIELD_MAP.id] ?? `#${i + 1}`;
    const missing = required.filter((k) => it[k] === undefined);
    if (missing.length) throw new Error(`item ${id}: missing required field(s): ${missing.join(", ")}`);
    if (!Array.isArray(it[FIELD_MAP.labelSet]))
      throw new Error(`item ${id}: ${FIELD_MAP.labelSet} must be an array`);
  });
}

// Deterministic input fingerprint — keeps output idempotent (no wall-clock in artifacts).
const inputDigest = (items) =>
  createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 16);

// Human-readable gap reasons, shared by the report and the experiment queue.
function gapReasons(g, opts) {
  const reasons = [];
  if (g.family === "UNMAPPED") reasons.push("family 缺失（UNMAPPED）");
  if (g.n < opts.minSupport) reasons.push(`n=${g.n} 样本不足`);
  if (g.accuracy < opts.minAcc) reasons.push(`accuracy ${g.accuracy.toFixed(2)} (<${opts.minAcc})`);
  if (g.offTaxonomyRate > 0.1) reasons.push(`off-taxonomy ${g.offTaxonomy}/${g.n}`);
  if (g.schemaInvalid > 0) reasons.push(`schema_invalid ${g.schemaInvalid}`);
  return reasons;
}

function compute(items, opts) {
  const groups = new Map();
  let totalErrors = 0, unmapped = 0;

  for (const it of items) {
    const tier = it[FIELD_MAP.tier] ?? "unknown";
    const family = famOf(it, opts.familyMap);
    const key = family + "|" + tier;
    if (!groups.has(key)) groups.set(key, { family, tier, rows: [] });
    groups.get(key).rows.push(it);
  }

  const ledger = [];
  for (const { family, tier, rows } of groups.values()) {
    const n = rows.length;
    let correct = 0, abstain = 0, schemaInvalid = 0, offTax = 0;
    const labelSets = new Set();
    for (const it of rows) {
      const pred = it[FIELD_MAP.pred], gold = it[FIELD_MAP.gold], ls = it[FIELD_MAP.labelSet];
      if (Array.isArray(ls)) labelSets.add(ls.join("/"));
      if (pred === gold) correct++;
      if (pred === "ABSTAIN" || pred == null || pred === "") abstain++;
      if (it[FIELD_MAP.schemaValid] === false) schemaInvalid++;
      if (Array.isArray(ls) && pred != null && pred !== "ABSTAIN" && !ls.includes(pred)) offTax++;
    }
    const errors = n - correct;
    totalErrors += errors;
    if (family === "UNMAPPED") unmapped += n;
    ledger.push({
      family, tier, n, correct,
      accuracy: n ? correct / n : 0,
      abstain, schemaInvalid,
      labelSets: [...labelSets],
      offTaxonomy: offTax,
      offTaxonomyRate: n ? offTax / n : 0,
      errors,
    });
  }

  for (const r of ledger) r.errorShare = totalErrors ? r.errors / totalErrors : 0;
  for (const r of ledger) {
    r.status =
      r.family === "UNMAPPED" ? "UNMAPPED"
      : (r.n < opts.minSupport || r.accuracy < opts.minAcc || r.offTaxonomyRate > 0.1 || r.schemaInvalid > 0)
        ? "GAP" : "OK";
  }

  const sorted = [...ledger].sort((a, b) => b.errors - a.errors);
  let acc = 0; const debt = [];
  for (const r of sorted) {
    if (r.errors === 0) continue;
    acc += r.errorShare;
    if (!debt.includes(r.family)) debt.push(r.family);
    if (acc >= 0.8) break;
  }
  return { ledger, sorted, totalErrors, unmapped, debt };
}

function buildQueue(res, opts) {
  const q = [];
  const gaps = res.ledger
    .filter((r) => r.status !== "OK")
    .sort((a, b) => b.errorShare - a.errorShare || a.n - b.n);
  let i = 1;
  for (const g of gaps) {
    const reasons = gapReasons(g, opts);
    q.push({
      id: "EXP-" + String(i).padStart(3, "0"),
      priority: i++,
      family: g.family, tier: g.tier,
      gap_reason: reasons.join("; ") || "flagged",
      hypothesis: g.family === "UNMAPPED" ? "任务族未标注，先补 family_map" : "该族覆盖 / 标签约定不足",
      action: "补齐该族 label_set 覆盖样本；先 eval-only 复测（不训练）",
      compute: "none",
      expected_signal: `${g.family} accuracy > 0.30 或 off_taxonomy=0`,
      status: "todo",
    });
  }
  return q;
}

function report(res, opts) {
  const L = [];
  L.push("# JevBench Coverage Audit", "");
  L.push(`- items: ${res.ledger.reduce((s, r) => s + r.n, 0)} · groups: ${res.ledger.length} · total errors: ${res.totalErrors} · UNMAPPED: ${res.unmapped}`);
  L.push(`- thresholds: MIN_SUPPORT=${opts.minSupport}, MIN_ACC=${opts.minAcc}`, "");
  L.push("## Error Pareto (top families)", "");
  L.push("| family | tier | n | acc | off-tax | error share | status |");
  L.push("|---|---|---|---|---|---|---|");
  for (const r of res.sorted.slice(0, 10))
    L.push(`| ${r.family} | ${r.tier} | ${r.n} | ${r.accuracy.toFixed(2)} | ${r.offTaxonomy} | ${(r.errorShare * 100).toFixed(0)}% | ${r.status} |`);
  L.push("", "## Top-3 gap families (with gap_reason)", "");
  const top3 = res.ledger
    .filter((r) => r.status !== "OK")
    .sort((a, b) => b.errorShare - a.errorShare || a.n - b.n)
    .slice(0, 3);
  if (top3.length) {
    for (const r of top3)
      L.push(`- **${r.family}** (${r.tier}) — ${gapReasons(r, opts).join("; ") || "flagged"} · error share ${(r.errorShare * 100).toFixed(0)}%`);
  } else {
    L.push("(none)");
  }
  L.push("", "## Coverage debt (families covering 80% of errors)", "");
  L.push(res.debt.length ? res.debt.map((f) => "- " + f).join("\n") : "(none)");
  return L.join("\n") + "\n";
}

function writeOut(dir, res, opts) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "coverage_ledger.json"), JSON.stringify({
    input_sha256: res.inputDigest,
    thresholds: { minSupport: opts.minSupport, minAcc: opts.minAcc },
    coverage_debt_families: res.debt,
    ledger: res.ledger,
  }, null, 2));
  writeFileSync(join(dir, "COVERAGE_REPORT.md"), report(res, opts));
  writeFileSync(join(dir, "experiment_queue.json"), JSON.stringify(buildQueue(res, opts), null, 2));
}

function selfTest() {
  const items = [];
  for (let i = 0; i < 12; i++) items.push({ id: "r" + i, tier: "easy", task_family: "routing", label_set: ["A", "B", "C", "D"], gold: "B", pred: "A", schema_valid: true });
  for (let i = 0; i < 12; i++) items.push({ id: "t" + i, tier: "easy", task_family: "tool-selection", label_set: ["search", "calc", "none"], gold: "search", pred: i < 2 ? "search" : "none", schema_valid: true });
  for (let i = 0; i < 24; i++) items.push({ id: "c" + i, tier: "original", task_family: "classification", label_set: ["pos", "neg"], gold: "pos", pred: i < 20 ? "pos" : "neg", schema_valid: true });
  return items;
}

const args = parseArgs(process.argv.slice(2));
let items;
if (args.selfTest) {
  items = selfTest();
  if (!args.out) args.out = join(os.tmpdir(), "jev_coverage_selftest");
} else {
  if (!args.items || !args.out) { console.error("usage: node audit.mjs --items <jsonl> --out <dir> | --self-test"); process.exit(2); }
  items = loadItems(args.items);
}
validateItems(items);
const familyMap = args.familyMap ? JSON.parse(readFileSync(args.familyMap, "utf8")) : null;
const res = compute(items, { minSupport: args.minSupport, minAcc: args.minAcc, familyMap });
res.inputDigest = inputDigest(items);
writeOut(args.out, res, args);
const gaps = res.ledger.filter((r) => r.status !== "OK").length;
console.log(`ledger groups: ${res.ledger.length} | gaps: ${gaps} | debt: ${res.debt.join(", ") || "(none)"}`);
console.log("wrote ->", args.out);
