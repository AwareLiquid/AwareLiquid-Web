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
    const headers = { Authorization: 'Bearer ' + t }
    const base = 'https://api.trust3.pro/api/v1/admin'
    const get = async (p) => (await (await fetch(base + p, { headers })).json()).data
    const plans = await get('/payment/plans')
    const groupsRaw = await get('/groups')
    const groups = Array.isArray(groupsRaw) ? groupsRaw : (groupsRaw.items || groupsRaw.list || [])
    const settings = await get('/settings')
    return JSON.stringify({
      plans: plans.map(p => ({ id: p.id, name: p.name, price: p.price, desc: p.description })),
      groups: groups.filter(g => [16,17,18].includes(g.id)).map(g => ({ id: g.id, limit: g.monthly_limit_usd, desc: g.description })),
      trialDays: settings.auth_source_default_wechat_subscriptions?.[0]?.validity_days,
      payment: { enabled: settings.payment_enabled, types: settings.payment_enabled_types, min: settings.payment_min_amount },
    }, null, 1)
  } catch (e) { return 'ERR ' + String(e && e.message || e) }
})()`
console.log(await evalV(expr))
ws.close()
