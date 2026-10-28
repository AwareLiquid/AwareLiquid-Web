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
console.log("tab:", await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Testers' && e.children.length === 0 && e.offsetParent !== null);
  if (!el) return 'no';
  const a = el.closest('a,button,[role=tab]') || el.parentElement;
  a.click();
  return 'clicked:' + a.tagName;
})()`))
await sleep(10000)
console.log("url:", await evalV(`location.href.slice(0, 130)`))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button,a')].map(b => ({t:(b.innerText||'').trim().slice(0,24), aria:b.getAttribute('aria-label')})).filter(x => /Add|Tester/i.test(x.t) || /Tester|Add/i.test(x.aria||'')).slice(0,8))`))
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 260)`)).replace(/\n+/g, " | ").slice(0, 260))
ws.close()
