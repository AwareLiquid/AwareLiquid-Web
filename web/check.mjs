#!/usr/bin/env node
/**
 * Static checks for the site in this directory.
 *
 *   node web/check.mjs            check the files on disk
 *   node web/check.mjs --live     also fetch awareliquid.ai and compare
 *
 * Everything here failed silently at least once. An IndexNow key with a byte-order mark still returns 200
 * and still looks correct in an editor; a page missing from the sitemap is simply never crawled; a sitemap
 * entry with no matching page is a soft 404 nobody sees. None of it shows up by opening the site.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const web = path.dirname(fileURLToPath(import.meta.url))
const SITE = "https://awareliquid.ai"
const failures = []
const fail = (message) => failures.push(message)

const pages = readdirSync(web)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replace(/\.html$/, ""))

// --- IndexNow -------------------------------------------------------------
// The key file's body must equal its own filename, byte for byte. A BOM, a trailing newline or a stray
// space all fail verification, and the failure is invisible from the outside.
for (const file of readdirSync(web).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))) {
  const key = file.replace(/\.txt$/, "")
  const bytes = readFileSync(path.join(web, file))
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`${file}: starts with a UTF-8 BOM; IndexNow compares the body to the key and will reject it`)
  } else if (bytes.toString("utf8") !== key) {
    fail(`${file}: body is ${JSON.stringify(bytes.toString("utf8"))}, expected exactly ${JSON.stringify(key)}`)
  }
}

// --- sitemap --------------------------------------------------------------
const sitemapPath = path.join(web, "sitemap.xml")
const sitemap = readFileSync(sitemapPath, "utf8")
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])

if (locs.length !== lastmods.length) {
  fail(`sitemap.xml: ${locs.length} <loc> but ${lastmods.length} <lastmod>; every entry needs one`)
}

const listed = new Set(locs.map((u) => u.replace(`${SITE}/`, "").replace(/\/$/, "") || "index"))
// 404 is deliberately not indexed.
for (const page of pages.filter((p) => p !== "404")) {
  if (!listed.has(page)) fail(`sitemap.xml: /${page} exists but is not listed, so it will not be crawled`)
}
for (const entry of listed) {
  if (entry !== "index" && !pages.includes(entry)) {
    // A sitemap names HTML documents. Anything else gets fetched and then reported as an unsupported format.
    fail(`sitemap.xml: lists /${entry}, which is not a page in this directory`)
  }
}

// --- per-page meta --------------------------------------------------------
for (const page of pages.filter((p) => p !== "404")) {
  const html = readFileSync(path.join(web, `${page}.html`), "utf8")
  if (!/rel="canonical"/.test(html)) {
    fail(`${page}.html: no canonical, so query-string and trailing-slash variants compete with each other`)
  }
  if (!/name="description"/.test(html)) fail(`${page}.html: no meta description`)
}

// --- live ------------------------------------------------------------------
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
console.log(`ok — ${pages.length} pages, ${locs.length} sitemap entries`)
