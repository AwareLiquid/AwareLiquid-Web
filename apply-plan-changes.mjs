const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("trust3.pro"))
if (!page) {
  console.log("NO ADMIN TAB")
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
    }, 40000)
    pend.set(i, (m) => {
      clearTimeout(to)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evalV = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
  return r.timeout ? "TIMEOUT" : r.result.result?.value
}

const expr = `(async () => {
  const t = localStorage.getItem('auth_token')
  const headers = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
  const base = 'https://api.trust3.pro/api/v1/admin'
  const j = async (p, opts) => { const r = await fetch(base + p, { headers, ...(opts || {}) }); return { status: r.status, body: await r.json().catch(() => null) } }
  const out = []

  // 1) Basic plan copy: ¥80 -> ¥60
  const plans = await j('/payment/plans')
  const basic = plans.body.data.find(p => p.id === 1)
  const updated = {
    ...basic,
    description: basic.description.replace(/¥80/g, '¥60'),
    features: basic.features.replace(/¥80/g, '¥60'),
  }
  delete updated.created_at; delete updated.updated_at
  const putPlan = await j('/payment/plans/1', { method: 'PUT', body: JSON.stringify(updated) })
  out.push('plan1: ' + putPlan.status + ' desc=' + (putPlan.body?.data?.description || '').slice(0, 40))

  // 2) Basic group monthly quota: $11 -> $8.3 (≈ ¥60 at the gateway's markup)
  const groups = await j('/groups')
  const glist = Array.isArray(groups.body.data) ? groups.body.data : (groups.body.data.items || [])
  const g17 = glist.find(g => g.id === 17)
  if (g17) {
    const patch = { ...g17, monthly_limit_usd: 8.3 }
    delete patch.created_at; delete patch.updated_at
    const putGroup = await j('/groups/17', { method: 'PUT', body: JSON.stringify(patch) })
    out.push('group17: ' + putGroup.status + ' monthly=' + (putGroup.body?.data?.monthly_limit_usd ?? '?'))
  } else out.push('group17: not found')

  // 3) Trial length for new WeChat signups: 30 -> 7 days. The settings PUT replaces the whole
  //    document, so send the full object back with a single change.
  const settings = await j('/settings')
  const doc = settings.body.data
  const subs = doc.auth_source_default_wechat_subscriptions || []
  if (subs.length && subs[0].validity_days !== 7) {
    subs[0].validity_days = 7
    doc.auth_source_default_wechat_subscriptions = subs
    const putSettings = await j('/settings', { method: 'PUT', body: JSON.stringify(doc) })
    out.push('settings: ' + putSettings.status + ' trial_days=' + (putSettings.body?.data?.auth_source_default_wechat_subscriptions?.[0]?.validity_days ?? '?'))
  } else out.push('settings: trial already ' + (subs[0]?.validity_days ?? 'none'))

  // 4) Verify the payment settings survived the full replace.
  const after = await j('/settings')
  const d = after.body.data
  out.push('payment: enabled=' + d.payment_enabled + ' min=' + d.min_amount + ' types=' + JSON.stringify(d.payment_types))
  return out.join('\\n')
})()`
console.log(await evalV(expr))
ws.close()
