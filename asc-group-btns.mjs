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
// cancel the internal-group modal
await evalV(`(() => { const d = document.querySelector('[role=dialog]'); const b = d && [...d.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Cancel'); b?.click(); })()`)
await sleep(2000)
await send("Page.navigate", { url: "https://appstoreconnect.apple.com/apps/6827459566/testflight/ios" })
await sleep(14000)
console.log(await evalV(`JSON.stringify([...document.querySelectorAll('button')].filter(b => /group/i.test(b.getAttribute('aria-label')||'')).map(b => { const r = b.getBoundingClientRect(); return { aria: b.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), cls: String(b.className).slice(0,40) } }))`))
ws.close()
