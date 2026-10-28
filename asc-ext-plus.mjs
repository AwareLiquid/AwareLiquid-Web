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
// click the + next to EXTERNAL TESTING
const rect = JSON.parse(await evalV(`(() => {
  const label = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'EXTERNAL TESTING' && e.children.length === 0 && e.offsetParent !== null);
  if (!label) return null;
  const row = label.parentElement;
  const plus = [...row.querySelectorAll('button,[role=button]')].find(b => (b.getAttribute('aria-label')||'').match(/group/i) || true);
  if (!plus) return null;
  const r = plus.getBoundingClientRect();
  return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2 });
})()`))
console.log("plus:", JSON.stringify(rect))
if (rect) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y })
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
}
await sleep(6000)
console.log("dialog:", String(await evalV(`document.querySelector('[role=dialog]')?.innerText || 'none'`)).replace(/\n+/g, " | ").slice(0, 220))
console.log("inputs:", await evalV(`JSON.stringify([...document.querySelectorAll('input')].map(i => ({id:i.id, ph:i.placeholder, type:i.type})).slice(0,6))`))
ws.close()
