import fs from "node:fs"
const leads = JSON.parse(fs.readFileSync("E:/site-accounts/gtm/leads/hn-leads.json", "utf8"))
const scored = leads
  .filter(l => /ban|suspend|limit|block/i.test(l.title))
  .map(l => ({ ...l, score: (/ban|suspend|block/i.test(l.title) ? 2 : 0) + (/limit/i.test(l.title) ? 1 : 0) }))
  .sort((a, b) => b.score - a.score || (a.createdAt < b.createdAt ? 1 : -1))
  .slice(0, 15)
for (const l of scored) {
  console.log(`${l.createdAt.slice(0,10)} | ${l.author} | ${l.title.slice(0, 100)}`)
}
fs.writeFileSync("E:/site-accounts/gtm/leads/hn-top.json", JSON.stringify(scored, null, 2), "utf8")
