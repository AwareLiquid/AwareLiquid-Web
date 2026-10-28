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
  if (r.result?.exceptionDetails) return "EXC: " + JSON.stringify(r.result.exceptionDetails).slice(0, 300)
  return r.result.result?.value
}

const expr = `(async () => {
  try {
    const t = localStorage.getItem('auth_token')
    const headers = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
    const base = 'https://api.trust3.pro/api/v1/admin'
    const raw = (await (await fetch(base + '/groups', { headers })).json()).data
    const list = Array.isArray(raw) ? raw : (raw.items || raw.list || [])
    const g = list.find(x => x.id === 16)
    if (!g) return 'group 16 missing'
    const body = { ...g, description: 'HyperCode Trial: 7 days x 30 CNY' }
    delete body.created_at; delete body.updated_at
    const r = await fetch(base + '/groups/16', { method: 'PUT', headers, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    return r.status + ' desc=' + (j?.data?.description || '') + ' limit=' + (j?.data?.monthly_limit_usd ?? '?')
  } catch (e) { return 'ERR ' + String(e && e.message || e) }
})()`
console.log(await evalV(expr))
ws.close()
