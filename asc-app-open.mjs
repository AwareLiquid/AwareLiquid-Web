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

// open the app record
await evalV(`(() => { const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'HyperCode AI' && e.children.length === 0); if (!el) return 'no'; (el.closest('a,button,[role=button]')||el).click(); return 'clicked'; })()`)
await sleep(9000)
console.log("URL:", await evalV(`location.href.slice(0, 90)`))
console.log("TEXT:", String(await evalV(`document.body.innerText.slice(0, 900)`)).replace(/\n+/g, " | ").slice(0, 900))
ws.close()
