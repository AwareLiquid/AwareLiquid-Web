const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 25000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const tree = (await send("Page.getFrameTree")).result.frameTree
const frames = []
const walk = (n) => { frames.push(n.frame); for (const c of n.childFrames ?? []) walk(c) }
walk(tree)
console.log("frames:", JSON.stringify(frames.map(f => f.url.slice(0, 70))))
const target = frames.find(f => f.url.includes("id.apple.com"))
if (!target) { console.log("no frame"); process.exit(0) }
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "verify" })
const ctx = world.result.executionContextId
const r = await send("Runtime.evaluate", { expression: `document.body.innerText.slice(0, 300)`, contextId: ctx, returnByValue: true })
console.log("iframe text:", String(r.result?.result?.value || '').replace(/\n+/g, " | ").slice(0, 300))
ws.close()
