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

console.log("pick store:", await evalV(`(() => { const el = document.getElementById('IOS_APP_STORE'); if (!el) return 'no'; el.click(); return el.checked; })()`))
await sleep(1000)
console.log("continue:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => /Continue/i.test((e.innerText||'').trim()) && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 400)`)).replace(/\n+/g, " | ").slice(0, 400))
console.log("selects:", await evalV(`JSON.stringify([...document.querySelectorAll('select')].map(s => ({name:s.name, opts:[...s.options].map(o=>o.textContent.trim()).slice(0,6)})))`))
console.log("appid radios:", await evalV(`JSON.stringify([...document.querySelectorAll('input[type=radio]')].map(r => ({id:r.id, checked:r.checked})).slice(0,6))`))
ws.close()
