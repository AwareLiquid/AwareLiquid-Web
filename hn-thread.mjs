const ids = [50078285, 50259246]
for (const id of ids) {
  try {
    const r = await fetch(`https://hn.algolia.com/api/v1/items/${id}`)
    const j = await r.json()
    console.log(`=== item ${id}: ${j.title}`)
    console.log(`points=${j.points} created=${j.created_at}`)
    const clean = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim()
    console.log("text:", clean(j.text).slice(0, 300))
    console.log("--- children ---")
    for (const c of (j.children ?? []).slice(0, 8)) {
      console.log(`  [${c.author}] ${clean(c.text).slice(0, 180)}`)
    }
    console.log("")
  } catch (e) {
    console.log(`FAIL ${id}: ${String(e).slice(0, 80)}`)
  }
}
