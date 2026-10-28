const CDP = "http://127.0.0.1:9222"
await fetch(CDP + "/json/new?" + encodeURI("https://www.trust3.pro/purchase"), { method: "PUT" })
await new Promise(r => setTimeout(r, 12000))
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("trust3.pro/purchase"))
if (!page) { console.log("no tab", JSON.stringify(list.filter(t=>t.type==="page").map(t=>t.url.slice(0,60)))); process.exit(0) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 25000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const evalV = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.timeout ? 'TIMEOUT' : r.result.result?.value }
console.log("url:", await evalV(`location.href.slice(0, 80)`))
const t = await evalV(`document.body.innerText`)
console.log("len:", t.length)
console.log("text:", JSON.stringify(t.slice(0, 400)))
console.log("prices:", await evalV(`(document.body.innerText.match(/¥\\d+/g)||[]).slice(0,8).join(',')`))
ws.close()
