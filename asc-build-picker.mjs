const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("appstoreconnect"))
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
    }, 30000)
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

// 1) detach the current build so the picker can open
console.log("del:", await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => /^0\\.1\\.\\d+ \\(0\\.1\\.\\d+\\)$/.test((e.textContent||'').trim()) && e.children.length === 0);
  if (!el) return 'no-leaf';
  let p = el; for (let i = 0; i < 5; i++) p = p.parentElement;
  const b = p.querySelector('button[aria-label="Delete"]');
  if (!b) return 'no-btn';
  b.click(); return 'clicked';
})()`))
await sleep(5000)
console.log("add:", await evalV(`(() => { const b = [...document.querySelectorAll('button,a')].find(e => (e.innerText||'').trim() === 'Add Build'); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
const info = await evalV(`(() => {
  const radios = [...document.querySelectorAll('input[type=radio]')].filter(r => /^[0-9a-f-]{36}$/.test(r.id));
  const rows = radios.map(r => ({ id: r.id, label: (r.closest('label,tr,div')?.innerText || '').slice(0, 40).replace(/\\n+/g, ' ') }));
  return JSON.stringify(rows);
})()`)
console.log("rows:", info)
ws.close()
