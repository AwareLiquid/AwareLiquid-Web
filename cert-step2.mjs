const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("developer.apple.com"))
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m)
    pend.delete(m.id)
  }
})
await new Promise((r) => ws.addEventListener("open", r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id
    const to = setTimeout(() => {
      pend.delete(i)
      res({ timeout: true })
    }, 25000)
    pend.set(i, (m) => {
      clearTimeout(to)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const evalV = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true })
  return r.timeout ? "TIMEOUT" : r.result.result?.value
}

console.log("chain:", await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Apple Distribution' && e.children.length === 0);
  if (!el) return 'no-el';
  const out = []; let cur = el;
  for (let i = 0; i < 6 && cur; i++) { out.push({ tag: cur.tagName, role: cur.getAttribute('role'), cls: String(cur.className).slice(0, 40) }); cur = cur.parentElement; }
  return JSON.stringify(out);
})()`))
console.log("click card:", await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Apple Distribution' && e.children.length === 0);
  if (!el) return 'no-el';
  let card = el;
  for (let i = 0; i < 4; i++) { card = card.parentElement; if (card && card.querySelector('input[type=radio]')) break; }
  if (!card) return 'no-card';
  const input = card.querySelector('input[type=radio]');
  if (input) { input.click(); return 'clicked-input:' + input.checked; }
  card.click();
  return 'clicked-card';
})()`))
await sleep(1500)
console.log("checked any:", await evalV(`JSON.stringify([...document.querySelectorAll('input[type=radio]')].filter(r => r.checked).map(r => r.id))`))
ws.close()
