const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("hypercode.html"))
if (!page) {
  console.log("NO PAGE")
  process.exit(0)
}
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
    }, 20000)
    pend.set(i, (m) => {
      clearTimeout(to)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evalV = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true })
  return r.timeout ? "TIMEOUT" : r.result.result?.value
}

await evalV(`applyHC('en')`)
const res = await evalV(`(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const out = []
  while (walker.nextNode()) {
    const n = walker.currentNode
    if (!n.nodeValue || !/[\\u4e00-\\u9fff]/.test(n.nodeValue)) continue
    const p = n.parentElement
    if (!p || p.closest('script,style')) continue
    out.push({ text: n.nodeValue.trim().slice(0, 60), tag: p.tagName, cls: String(p.className).slice(0, 28) })
  }
  return JSON.stringify(out)
})()`)
console.log(res)
ws.close()
