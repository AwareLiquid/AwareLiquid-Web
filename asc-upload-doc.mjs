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

const doc = await send("DOM.getDocument", { depth: 2 })
const q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "[role=dialog] input[type=file]" })
console.log("node:", JSON.stringify(q.result))
if (q.result?.nodeId) {
  console.log("set:", JSON.stringify(await send("DOM.setFileInputFiles", {
    nodeId: q.result.nodeId,
    files: ["E:\\tmp-opencode\\dsa-letter.png"],
  })).slice(0, 100))
}
await sleep(6000)
console.log("dialog:", String(await evalV(`document.querySelector('[role=dialog]')?.innerText || 'none'`)).replace(/\n+/g, " | ").slice(0, 400))
console.log("next:", await evalV(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(e => (e.innerText||'').trim() === 'Next'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
ws.close()
