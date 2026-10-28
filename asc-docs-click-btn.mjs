const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find(t => t.type === "page" && t.url.includes("appstoreconnect"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pend = new Map()
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => { const i = ++id; const to = setTimeout(() => { pend.delete(i); res({ timeout: true }) }, 25000); pend.set(i, (m) => { clearTimeout(to); res(m) }); ws.send(JSON.stringify({ id: i, method, params })) })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const evalV = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.timeout ? 'TIMEOUT' : r.result.result?.value }
// re-open the menu then click the option button
await evalV(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(e => (e.innerText||'').trim() === 'Choose'); b?.click(); })()`)
await sleep(1500)
console.log("opt click:", await evalV(`(() => {
  const btn = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Mandarin/Simplified Chinese');
  if (!btn) return 'no';
  btn.click();
  return 'clicked';
})()`))
await sleep(2000)
console.log("chosen:", await evalV(`(() => { const d = document.querySelector('[role=dialog]'); return d ? d.innerText.slice(0, 160).replace(/\\n+/g,' | ') : 'none'; })()`))
console.log("next state:", await evalV(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(e => (e.innerText||'').trim() === 'Next'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
ws.close()
