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
    }, 40000)
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

const doc = await send("DOM.getDocument", { depth: 1 })
const q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "input[type=file]" })
console.log("set file:", JSON.stringify(await send("DOM.setFileInputFiles", {
  nodeId: q.result.nodeId,
  files: ["E:\\site-accounts\\apple-signing\\ios\\ios-dist.csr"],
})).slice(0, 120))
await sleep(2500)
console.log("continue:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => /Continue/i.test((e.innerText||'').trim()) && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(10000)
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 500)`)).replace(/\n+/g, " | ").slice(0, 500))
console.log("download buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button,a')].map(b => (b.innerText||'').trim()).filter(t => /Download/i.test(t)).slice(0,5))`))
ws.close()
