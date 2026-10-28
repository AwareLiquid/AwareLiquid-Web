import fs from "node:fs"

const queries = [
  "claude banned",
  "claude suspended",
  "claude usage limit",
  "anthropic account banned",
  "claude rate limit",
]
const since = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60
const leads = []

for (const q of queries) {
  const url =
    "https://hn.algolia.com/api/v1/search_by_date?query=" +
    encodeURIComponent(q) +
    "&tags=(story,comment)&numericFilters=created_at_i>" +
    since +
    "&hitsPerPage=15"
  try {
    const r = await fetch(url)
    const j = await r.json()
    console.log(`${q}: ${j.nbHits} hits`)
    for (const h of j.hits ?? []) {
      const text = ((h.title ?? "") + " " + (h.comment_text ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      leads.push({
        source: "hackernews",
        author: h.author,
        title: text.slice(0, 120),
        url: h.story_url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        createdAt: h.created_at,
        query: q,
      })
    }
  } catch (e) {
    console.log(`${q}: fail ${String(e).slice(0, 60)}`)
  }
}

const seen = new Set()
const unique = leads.filter((l) => {
  const key = l.author + "|" + l.title.slice(0, 40)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

fs.mkdirSync("E:/site-accounts/gtm/leads", { recursive: true })
fs.writeFileSync("E:/site-accounts/gtm/leads/hn-leads.json", JSON.stringify(unique, null, 2), "utf8")
console.log("saved", unique.length, "leads")
