const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("appstoreconnect"))
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

await send("Page.navigate", { url: "https://appstoreconnect.apple.com/apps" })
await sleep(16000)
console.log("url:", await evalV(`location.href.slice(0, 80)`))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => ({t:(b.innerText||'').trim().slice(0,20), aria:b.getAttribute('aria-label')})).filter(x=>x.t||x.aria).slice(0,15))`))
console.log("links with New:", await evalV(`JSON.stringify([...document.querySelectorAll('a')].map(a => (a.innerText||'').trim()).filter(t => /New|Add/i.test(t)).slice(0,6))`))
ws.close()
