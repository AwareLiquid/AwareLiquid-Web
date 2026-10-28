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

console.log("trader:", await evalV(`(() => { const el = [...document.querySelectorAll('input[type=radio]')].find(i => /trader/i.test(i.value) && !/not|non/i.test(i.value)); if (!el) return 'no'; el.click(); return el.checked; })()`))
await sleep(1500)
console.log("next1:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Next' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(7000)
const t1 = await evalV(`document.body.innerText`)
console.log("step2 tail:", JSON.stringify(t1.slice(-350)))
console.log("next2 state:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => ({t:(b.innerText||'').trim(), d:b.disabled})).filter(x=>x.t).slice(-5))`))
ws.close()
