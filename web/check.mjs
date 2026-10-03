#!/usr/bin/env node
/**
 * Static checks for the site in this directory.
 *
 *   node web/check.mjs            check the files on disk
 *   node web/check.mjs --live     also fetch awareliquid.ai and compare
 *
 * Catches the failure modes that are invisible from a browser: an IndexNow key
 * with a BOM, a page missing from the sitemap, a sitemap entry with no page,
 * a canonical/description missing. Understands subdirectories (en/), the
 * server-generated routes that have no local file, and utility/redirect pages.
 */

import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const web = path.dirname(fileURLToPath(import.meta.url))
const SITE = "https://awareliquid.ai"
const failures = []
const fail = (message) => failures.push(message)

function walk(dir, base = "") {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel))
    else if (e.name.endsWith(".html")) out.push(rel)
  }
  return out
}
const pageFiles = walk(web)
const pageKeys = new Set(pageFiles.map((f) => f.replace(/\.html$/, "")))

for (const file of readdirSync(web).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))) {
  const key = file.replace(/\.txt$/, "")
  const bytes = readFileSync(path.join(web, file))
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`${file}: starts with a UTF-8 BOM; IndexNow compares the body to the key and will reject it`)
  } else if (bytes.toString("utf8") !== key) {
    fail(`${file}: body is ${JSON.stringify(bytes.toString("utf8"))}, expected exactly ${JSON.stringify(key)}`)
  }
}

const sitemap = readFileSync(path.join(web, "sitemap.xml"), "utf8")
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
if (locs.length !== lastmods.length) {
  fail(`sitemap.xml: ${locs.length} <loc> but ${lastmods.length} <lastmod>; every entry needs one`)
}
const keyForSitemapUrl = (u) => u.replace(`${SITE}/`, "").replace(/\/$/, "") || "index"
const listed = new Set(locs.map(keyForSitemapUrl))

const GENERATED = new Set(["valuation", "en/valuation"])
const isGenerated = (key) =>
  GENERATED.has(key) || key.startsWith("snapshots/") || key.startsWith("morning-notes")

const EXCLUDED = new Set([
  "404", "brand", "partners/clawhunt",
  "ar/api", "ar/hypercode", "ar/guides-ai-coding-assistant", "ar/guides-hypercode-vs-cursor",
])

for (const key of pageKeys) {
  const norm = key.endsWith("/index") ? key.slice(0, -"/index".length) : key
  if (EXCLUDED.has(key) || EXCLUDED.has(norm) || isGenerated(norm)) continue
  if (!listed.has(key) && !listed.has(norm)) {
    fail(`sitemap.xml: /${key} exists but is not listed, so it will not be crawled`)
  }
}
for (const key of listed) {
  if (isGenerated(key)) continue
  if (!pageKeys.has(key) && !pageKeys.has(`${key}/index`)) {
    fail(`sitemap.xml: lists /${key}, which is not a page in this directory`)
  }
}

for (const f of pageFiles) {
  const key = f.replace(/\.html$/, "")
  if (EXCLUDED.has(key)) continue
  const html = readFileSync(path.join(web, f), "utf8")
  if (!/rel="canonical"/.test(html)) {
    fail(`${f}: no canonical, so query-string and trailing-slash variants compete with each other`)
  }
  if (!/name="description"/.test(html)) fail(`${f}: no meta description`)
}

if (process.argv.includes("--live")) {
  const get = async (url) => {
    const res = await fetch(url, { redirect: "follow" })
    return { status: res.status, body: Buffer.from(await res.arrayBuffer()) }
  }
  for (const loc of locs) {
    const { status } = await get(loc)
    if (status !== 200) fail(`live: ${loc} returns ${status}`)
  }
  for (const file of readdirSync(web).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))) {
    const key = file.replace(/\.txt$/, "")
    const { status, body } = await get(`${SITE}/${file}`)
    if (status !== 200) fail(`live: /${file} returns ${status}; IndexNow cannot verify it`)
    else if (body.toString("utf8") !== key) fail(`live: /${file} body does not equal the key`)
  }
}

if (failures.length) {
  console.error(`${failures.length} problem(s):\n  ${failures.join("\n  ")}`)
  process.exit(1)
}
console.log(`ok — ${pageKeys.size} pages, ${locs.length} sitemap entries`)
