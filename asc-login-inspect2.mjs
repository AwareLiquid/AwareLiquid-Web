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

await send("Page.navigate", { url: "https://appstoreconnect.apple.com/login" })
await sleep(12000)
const tree = (await send("Page.getFrameTree")).result.frameTree
const frames = []
const walk = (n) => {
  frames.push(n.frame)
  for (const c of n.childFrames ?? []) walk(c)
}
walk(tree)
console.log("frames:", JSON.stringify(frames.map((f) => f.url.slice(0, 80))))
const target = frames.find((f) => f.url.includes("idmsa.apple.com"))
if (!target) {
  console.log("no idmsa frame")
  process.exit(0)
}
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "login" })
const ctx = world.result.executionContextId
const evalCtx = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true })
  if (r.timeout) return "TIMEOUT"
  if (!r.result) return "NO_RESULT"
  if (r.result.exceptionDetails) return "EXC"
  return r.result.result?.value
}
console.log("inputs:", await evalCtx(`JSON.stringify([...document.querySelectorAll('input')].map(i => ({id:i.id, type:i.type, val:(i.value||'').slice(0,20)})).slice(0,6))`))
console.log("buttons:", await evalCtx(`JSON.stringify([...document.querySelectorAll('button')].map(b => (b.innerText||'').trim()).filter(Boolean).slice(0,6))`))
ws.close()
