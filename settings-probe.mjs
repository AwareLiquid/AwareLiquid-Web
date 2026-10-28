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
  const api = (p) => fetch('https://api.trust3.pro/api/v1/admin' + p, { headers: { Authorization: 'Bearer ' + t } }).then(r => r.json())
  const settings = await api('/settings')
  const keys = Object.keys(settings.data || {}).filter(k => /trial|quota|credit|plan|subscription/i.test(k))
  const values = {}
  keys.forEach(k => (values[k] = settings.data[k]))
  const plans = await api('/payment/plans')
  return JSON.stringify({ trialish: values, plans: plans.data.map(p => ({ id: p.id, price: p.price, desc: p.description.slice(0, 60) })) })
})()`
console.log(await evalV(expr))
ws.close()
