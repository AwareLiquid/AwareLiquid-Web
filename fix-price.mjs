import { readFileSync, writeFileSync } from "node:fs"

const files = [
  "E:/tmp-opencode/awareliquid-web/web/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/ar/hypercode.html",
]

// Prices only. Amounts follow the current product deck: ¥59 (basic) / ¥99 (pro).
// Credit allowances and the trial length are intentionally untouched: the deck does not state the
// basic allowance, and it says 7 days while the product still grants 30. Both need a product call
// before the copy can claim them.
const map = [
  ["¥89", "¥59"],
  ["¥199", "¥99"],
]

for (const path of files) {
  let html = readFileSync(path, "utf8")
  const counts = {}
  for (const [from, to] of map) {
    const before = html.split(from).length - 1
    if (!before) continue
    html = html.split(from).join(to)
    counts[from] = before
  }
  writeFileSync(path, html, "utf8")
  console.log(path.split("/").slice(-2).join("/"), JSON.stringify(counts))
}
