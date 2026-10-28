const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("reviewsubmissions/details"))
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

console.log("reply:", await evalV(`(() => { const b = [...document.querySelectorAll('button,a')].find(e => (e.innerText||'').trim() === 'Reply to App Review'); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(6000)
console.log("fields:", await evalV(`JSON.stringify([...document.querySelectorAll('textarea,input[type=text]')].map(i => ({id:i.id, name:i.name, ph:i.placeholder})).slice(0,6))`))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => (b.innerText||'').trim()).filter(Boolean).slice(-8))`))
ws.close()
