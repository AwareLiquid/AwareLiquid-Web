const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 30000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const evalV = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.timeout ? 'TIMEOUT' : r.result.result?.value }
console.log("editable:", await evalV(`JSON.stringify([...document.querySelectorAll('[role=dialog] [contenteditable], [role=dialog] textarea, [role=dialog] input:not([type])')].map(e => ({tag:e.tagName, id:e.id, ce:e.getAttribute('contenteditable'), ph:e.getAttribute('placeholder')})))`))
console.log("all inputs ids:", await evalV(`JSON.stringify([...document.querySelectorAll('[role=dialog] input, [role=dialog] textarea')].map(i => i.id || i.type))`))
ws.close()
