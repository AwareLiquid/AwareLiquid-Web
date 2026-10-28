const r = await fetch("https://hn.algolia.com/api/v1/items/50222093")
const j = await r.json()
console.log("title:", j.title)
console.log("points:", j.points, "created:", j.created_at)
const clean = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim()
console.log("text:", clean(j.text).slice(0, 400))
console.log("--- comments ---")
for (const c of (j.children ?? []).slice(0, 10)) {
  console.log(`  [${c.author}] ${clean(c.text).slice(0, 160)}`)
}
