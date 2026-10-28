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

await send("Page.navigate", { url: "https://appstoreconnect.apple.com/business" })
await sleep(15000)
const t = await evalV(`document.body.innerText`)
const i = t.indexOf("Verify Email")
console.log("section:", JSON.stringify(t.slice(Math.max(0, i - 200), i + 300)))
console.log("clickable:", await evalV(`JSON.stringify([...document.querySelectorAll('a,button')].map(e => ({t:(e.innerText||'').trim().slice(0,40), h:(e.getAttribute('href')||'').slice(0,50)})).filter(x => x.t).slice(-10))`))
console.log("verify area html:", await evalV(`(() => { const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Verify Email Address' && e.children.length === 0); if (!el) return 'no'; let p = el.parentElement; return p ? p.outerHTML.slice(0, 600) : 'no'; })()`))
ws.close()
