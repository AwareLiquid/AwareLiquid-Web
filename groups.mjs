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
    }, 30000)
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
  const base = 'https://api.trust3.pro/api/v1/admin'
  const groups = await (await fetch(base + '/groups', { headers: { Authorization: 'Bearer ' + t } })).json()
  const list = Array.isArray(groups.data) ? groups.data : (groups.data && (groups.data.items || groups.data.list)) || []
  const pick = list.filter(g => [15,16,17,18].includes(g.id))
  return JSON.stringify(pick.map(g => ({ id: g.id, name: g.name, ratio: g.ratio, subscription_quota: g.subscription_quota, daily_quota: g.daily_quota, monthly_quota: g.monthly_quota, quota: g.quota, extra: Object.keys(g).filter(k => /quota|credit|limit|price/i.test(k)).reduce((a,k) => (a[k] = g[k], a), {}) })))
})()`
console.log(await evalV(expr))
ws.close()
