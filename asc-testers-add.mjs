const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 30000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const evalV = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.timeout ? 'TIMEOUT' : r.result.result?.value }
console.log("aria buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => ({aria:b.getAttribute('aria-label'), t:(b.innerText||'').trim().slice(0,20), y:Math.round(b.getBoundingClientRect().y)})).filter(x=>x.aria||x.t).slice(0,15))`))
console.log("all text:", String(await evalV(`document.body.innerText.slice(-500)`)).replace(/\n+/g, " | ").slice(-500))
ws.close()
