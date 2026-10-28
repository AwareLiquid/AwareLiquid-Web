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

// focus + type to open the select menu
await evalV(`(() => { const el = document.getElementById('react-select-2-input'); if (!el) return 'no'; el.focus(); el.click(); return 'ok'; })()`)
await sleep(800)
await send("Input.insertText", { text: "HyperCode Remote" })
await sleep(2500)
console.log("options:", await evalV(`JSON.stringify([...document.querySelectorAll('[class*=option], [id*=option], [role=option]')].map(o => (o.innerText||'').trim().slice(0,50)).filter(Boolean).slice(0,6))`))
console.log("menu text:", String(await evalV(`(document.getElementById('react-select-2-input')?.closest('div')?.parentElement?.innerText||'').slice(0,200)`)).replace(/\n+/g, " | ").slice(0, 200))
ws.close()
