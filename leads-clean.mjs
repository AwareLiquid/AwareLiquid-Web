import fs from "node:fs"
const leads = JSON.parse(fs.readFileSync("E:/site-accounts/gtm/leads/hn-top.json", "utf8"))
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<")
const keep = new Set(["bigwheels","bluesnowmonkey","willmorrison","waximabbax","oefrha","melbourne_mat","Computer0","segmondy","milisp","akyuu","DaSHacka"])
const rows = leads.filter(l => keep.has(l.author)).map(l => ({ ...l, title: decode(l.title) }))
const md = ["# 线索表 · Claude 封号/限流（HN，近 60 天）\n","来源：Hacker News 公开评论（Algolia API）。先公开回复提供价值，再考虑私信；不要群发。\n","| 日期 | 账号 | 情况 | 链接 | 建议动作 |","|---|---|---|---|---|"]
for (const l of rows) {
  const action = /company|enterprise/i.test(l.title) ? "B2B：私信 + 企业版一页纸" : /limit|5-hour|weekly/i.test(l.title) ? "个人：私信给试用码" : "先公开回复，再私信"
  md.push(`| ${l.createdAt.slice(0,10)} | ${l.author} | ${l.title.replace(/\|/g,"/").slice(0,110)} | ${l.url} | ${action} |`)
}
md.push("\n## 跟进字段\n","`来源 | 账号 | 触发事件 | 首触时间 | 回复 | 试用 | 付费 | 备注`\n")
fs.writeFileSync("E:/site-accounts/gtm/leads/leads.md", md.join("\n"), "utf8")
const csv = ["source,date,author,context,url,action"]
for (const l of rows) {
  const action = /company|enterprise/i.test(l.title) ? "b2b" : /limit|5-hour|weekly/i.test(l.title) ? "individual" : "community"
  csv.push(["hackernews", l.createdAt.slice(0,10), l.author, l.title, l.url, action].map(s => `"${String(s).replace(/"/g,'""')}"`).join(","))
}
fs.writeFileSync("E:/site-accounts/gtm/leads/leads.csv", csv.join("\n"), "utf8")
console.log("clean rows:", rows.length)
