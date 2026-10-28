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
const dialogClick = (text) => evalV(`(() => {
  const d = document.querySelector('[role=dialog]');
  if (!d) return 'no-dialog';
  const el = [...d.querySelectorAll('a,button,p')].find(e => (e.innerText||e.textContent||'').trim() === ${JSON.stringify(text)});
  if (!el) return 'no-${text}';
  (el.closest('a,button') || el).click();
  return 'clicked';
})()`)

console.log("manage:", await evalV(`(() => { const b = [...document.querySelectorAll('button,a')].find(e => (e.innerText||'').trim() === 'Manage'); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(6000)
console.log("std:", await evalV(`(() => { const el = document.getElementById('encryptionCheck_standardEncryption'); if (!el) return 'no'; el.click(); return el.checked; })()`))
await sleep(1500)
console.log("next:", await dialogClick("Next"))
await sleep(5000)
console.log("no:", await evalV(`(() => { const el = document.getElementById('franceCheck_no'); if (!el) return 'no'; el.click(); return el.checked; })()`))
await sleep(1500)
console.log("save:", await dialogClick("Save"))
await sleep(9000)
console.log("row:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('Build'); return t.slice(i, i + 140) })()`)).replace(/\n+/g, " | ").slice(0, 140))
ws.close()
