import fs from "node:fs"
const leads = JSON.parse(fs.readFileSync("E:/site-accounts/gtm/leads/hn-leads.json", "utf8"))
for (const name of ["bigwheels","willmorrison","oefrha","bluesnowmonkey","waximabbax"]) {
  const l = leads.find(x => x.author === name)
  if (l) console.log(name, "|", l.createdAt.slice(0,10), "|", l.url, "|", l.title.slice(0,90))
}
