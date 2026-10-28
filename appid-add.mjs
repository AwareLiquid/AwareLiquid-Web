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

await send("Page.navigate", { url: "https://developer.apple.com/account/resources/identifiers/add/bundleId" })
await sleep(14000)
console.log("url:", await evalV(`location.href.slice(0, 100)`))
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 700)`)).replace(/\n+/g, " | ").slice(0, 700))
console.log("inputs:", await evalV(`JSON.stringify([...document.querySelectorAll('input')].map(i => ({type:i.type, id:i.id, name:i.name, ph:i.placeholder, val:(i.value||'').slice(0,20)})).slice(0,8))`))
ws.close()
