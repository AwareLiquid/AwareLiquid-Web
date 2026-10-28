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

console.log("checked:", await evalV(`(() => { const el = document.getElementById('appStoreReviewDetails_demoAccountRequired'); return el ? el.checked : 'missing'; })()`))
console.log("uncheck:", await evalV(`(() => { const el = document.getElementById('appStoreReviewDetails_demoAccountRequired'); if (!el) return 'no'; if (el.checked) el.click(); return el.checked; })()`))
await sleep(1500)
console.log("save:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(6000)
console.log("update review:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Update Review' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(10000)
console.log("url:", await evalV(`location.href.slice(0, 100)`))
console.log("resubmit state:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Resubmit to App Review'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
ws.close()
