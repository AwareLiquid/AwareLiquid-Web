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
    }, 60000)
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

    const before = await (await fetch(base + '/settings', { headers })).json()
    const doc = before.data
    const subs = doc.auth_source_default_wechat_subscriptions || []
    if (!subs.length) return 'no wechat trial subscription configured'
    const current = subs[0].validity_days
    if (current === 7) return 'already 7 days'

    // The settings endpoint replaces the whole document: send it back with a single change.
    subs[0].validity_days = 7
    doc.auth_source_default_wechat_subscriptions = subs
    const r = await fetch(base + '/settings', { method: 'PUT', headers, body: JSON.stringify(doc) })
    const txt = await r.text()
    if (r.status !== 200) return 'PUT ' + r.status + ' ' + txt.slice(0, 300)

    const after = (await (await fetch(base + '/settings', { headers })).json()).data
    return JSON.stringify({
      trial_days: after.auth_source_default_wechat_subscriptions?.[0]?.validity_days,
      payment_enabled: after.payment_enabled,
      min_amount: after.min_amount,
      payment_types: after.payment_types,
      was: current,
    })
  } catch (e) { return 'ERR ' + String(e && e.message || e) }
})()`
console.log(await evalV(expr))
ws.close()
