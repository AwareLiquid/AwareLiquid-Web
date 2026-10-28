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

console.log("radios:", await evalV(`JSON.stringify([...document.querySelectorAll('input[type=radio]')].map(r => ({id:r.id, v:r.value, checked:r.checked, label:(r.closest('label')?.innerText||'').slice(0,40).replace(/\\n+/g,' ')})))`))
console.log("pick:", await evalV(`(() => {
  const labels = [...document.querySelectorAll('label')].filter(l => /Apple Distribution/i.test(l.innerText||'') && !/Mac App|Installer|Development/i.test(l.innerText||''));
  if (!labels.length) return 'no-label';
  const input = labels[0].querySelector('input[type=radio]');
  if (!input) return 'no-input';
  input.click();
  return input.checked;
})()`))
await sleep(1200)
console.log("continue:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => /Continue/i.test((e.innerText||'').trim()) && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("url:", await evalV(`location.href.slice(0, 100)`))
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 400)`)).replace(/\n+/g, " | ").slice(0, 400))
ws.close()
