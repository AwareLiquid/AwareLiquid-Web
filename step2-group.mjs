const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("trust3.pro"))
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
    }, 40000)
    pend.set(i, (m) => {
      clearTimeout(to)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evalV = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.timeout) return "TIMEOUT"
  if (r.result?.exceptionDetails) return "EXC: " + JSON.stringify(r.result.exceptionDetails).slice(0, 400)
  return r.result.result?.value
}

const expr = `(async () => {
  try {
    const t = localStorage.getItem('auth_token')
    const headers = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
    const base = 'https://api.trust3.pro/api/v1/admin'
    const r0 = await fetch(base + '/groups', { headers })
    const raw = await r0.json()
    const data = raw.data
    const list = Array.isArray(data) ? data : (data.items || data.list || [])
    const g = list.find(x => x.id === 17)
    if (!g) return 'group 17 not found; keys=' + Object.keys(data).join(',')
    const body = { ...g, monthly_limit_usd: 8.3 }
    delete body.created_at; delete body.updated_at
    const r1 = await fetch(base + '/groups/17', { method: 'PUT', headers, body: JSON.stringify(body) })
    const txt = await r1.text()
    return 'status=' + r1.status + ' ' + txt.slice(0, 300)
  } catch (e) { return 'ERR ' + String(e && e.message || e) }
})()`
console.log(await evalV(expr))
ws.close()
