const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("developer.apple.com"))
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
    }, 25000)
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

console.log("has identifier text:", await evalV(`document.body.innerText.includes('app.hypercode.mobile')`))
console.log("rows:", await evalV(`JSON.stringify([...document.querySelectorAll('*')].filter(e => (e.textContent||'').includes('app.hypercode.mobile') && e.children.length === 0).map(e => e.tagName + ':' + (e.textContent||'').trim().slice(0,40)).slice(0,4))`))
console.log("inputs:", await evalV(`JSON.stringify([...document.querySelectorAll('input,select')].map(i => ({t:i.type, id:i.id, name:i.name, v:i.value})).slice(0,8))`))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => (b.innerText||'').trim()).filter(Boolean).slice(0,8))`))
ws.close()
