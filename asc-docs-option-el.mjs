const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 25000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const evalV = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.timeout ? 'TIMEOUT' : r.result.result?.value }
console.log("option el:", await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Mandarin/Simplified Chinese' && e.children.length === 0);
  if (!el) return 'no';
  const chain = []; let c = el;
  for (let i = 0; i < 5 && c; i++) { chain.push({tag:c.tagName, role:c.getAttribute('role'), cls:String(c.className).slice(0,30)}); c = c.parentElement }
  return JSON.stringify(chain);
})()`))
console.log("selects:", await evalV(`JSON.stringify([...document.querySelectorAll('select')].map(s => ({name:s.name, val:s.value, opts:s.options.length})))`))
ws.close()
