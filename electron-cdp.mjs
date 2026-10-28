const CDP = "http://127.0.0.1:9223"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page")
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

console.log("title:", await evalV(`document.title`))
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 300)`)).replace(/\n+/g, " | ").slice(0, 300))
console.log("editors:", await evalV(`JSON.stringify([...document.querySelectorAll('textarea, [contenteditable=true]')].map(e => ({tag:e.tagName, cls:String(e.className).slice(0,40), ph:e.getAttribute('data-placeholder') || e.getAttribute('placeholder') || ''})))`))
ws.close()
