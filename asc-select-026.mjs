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

console.log("pick:", await evalV(`(() => { const el = document.getElementById('bf950e03-461f-4de5-adbc-4ef0b4abf075'); if (!el) return 'no'; el.click(); return el.checked; })()`))
await sleep(2000)
console.log("done:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Done' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(7000)
console.log("save:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("build row:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('Build'); return t.slice(i, i + 120) })()`)).replace(/\n+/g, " | ").slice(0, 120))
ws.close()
