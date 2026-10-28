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

console.log("cancel:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Cancel' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(3000)
// open the review submission thread to reply
await send("Page.navigate", { url: "https://appstoreconnect.apple.com/apps/6826464018/distribution/reviewsubmissions/details/5f641c27-9c3d-4902-9835-2a8c3db34c4b" })
await sleep(14000)
console.log("url:", await evalV(`location.href.slice(0, 100)`))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button,a')].map(b => (b.innerText||'').trim()).filter(t => /Reply|Resubmit|Send|Cancel/i.test(t)).slice(0, 8))`))
ws.close()
