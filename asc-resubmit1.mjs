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

console.log("build:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('Build'); return t.slice(i, i + 100) })()`)).replace(/\n+/g, " | ").slice(0, 100))
console.log("add for review:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Add for Review' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
const t = await evalV(`document.body.innerText`)
const i = t.indexOf("Unable to Add for Review")
console.log(i >= 0 ? "BLOCKERS: " + JSON.stringify(t.slice(i, i + 320)) : "NO BLOCKERS")
console.log("tail:", String(await evalV(`document.body.innerText.slice(-260)`)).replace(/\n+/g, " | ").slice(0, 260))
ws.close()
