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

console.log("save state:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
console.log("save:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("after:", String(await evalV(`document.body.innerText.slice(0, 160)`)).replace(/\n+/g, " | ").slice(0, 160))
console.log("attachment:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('Attachment'); return t.slice(i, i + 80) })()`)).replace(/\n+/g, " | ").slice(0, 80))
ws.close()
