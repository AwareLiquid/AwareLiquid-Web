const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 25000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const tree = (await send("Page.getFrameTree")).result.frameTree
const frames = []
const walk = (n) => { frames.push(n.frame); for (const c of n.childFrames ?? []) walk(c) }
walk(tree)
const target = frames.find(f => f.url.includes("idmsa.apple.com"))
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "l" })
const ctx = world.result.executionContextId
const r1 = await send("Runtime.evaluate", { expression: `(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Trust'); if (!b) return 'no'; b.click(); return 'clicked'; })()`, contextId: ctx, returnByValue: true })
console.log("trust:", r1.result?.result?.value)
await sleep(10000)
const main = await send("Runtime.evaluate", { expression: `location.href.slice(0, 80)`, returnByValue: true })
console.log("url:", main.result?.result?.value)
ws.close()
