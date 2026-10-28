import fs from "node:fs"

const CDP = "http://127.0.0.1:9222"
const urls = [
  "https://old.reddit.com/r/ClaudeAI/search?q=banned+OR+suspended+OR+%22usage+limit%22&restrict_sr=on&sort=new&t=month",
  "https://old.reddit.com/r/ClaudeCode/search?q=banned+OR+suspended&restrict_sr=on&sort=new&t=month",
]

await fetch(CDP + "/json/new?" + encodeURI(urls[0]), { method: "PUT" })
await new Promise((r) => setTimeout(r, 8000))
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("reddit"))
if (!page) {
  console.log("no reddit tab")
  process.exit(0)
}
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m)
    pend.delete(m.id)
  }
})
await new Promise((r) => ws.addEventListener("open", r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id
    const to = setTimeout(() => {
      pend.delete(i)
      res({ timeout: true })
    }, 30000)
    pend.set(i, (m) => {
      clearTimeout(to)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const evalV = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true })
  return r.timeout ? "TIMEOUT" : r.result.result?.value
}

await sleep(4000)
console.log("url:", await evalV(`location.href.slice(0, 80)`))
const out = await evalV(`JSON.stringify({
  blocked: /blocked|whoa there|network policy/i.test(document.body.innerText),
  posts: [...document.querySelectorAll('.search-result .search-title a, .search-result a.search-title')].slice(0, 30).map(a => ({
    title: (a.innerText||'').trim().slice(0, 90),
    href: a.getAttribute('href'),
  })).filter(p => p.title)
})`)
console.log(out)
ws.close()
