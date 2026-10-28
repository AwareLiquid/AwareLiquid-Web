const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("trust3.pro")) ?? list.find((t) => t.type === "page")
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
  try {
    const t = localStorage.getItem('auth_token')
    const headers = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
    const r = await fetch('https://api.trust3.pro/api/v1/payment/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 5, payment_type: 'wxpay' }),
    })
    const j = await r.json()
    return JSON.stringify({ status: r.status, code: j.code, msg: j.message, data: j.data && { order_no: j.data.order_no, amount: j.data.amount, pay_url: (j.data.pay_url || j.data.qr_code || j.data.code_url || '').slice(0, 80) } })
  } catch (e) { return 'ERR ' + String(e).slice(0, 120) }
})()`
console.log(await evalV(expr))
ws.close()
