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

const rect = JSON.parse(await evalV(`(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Mandarin/Simplified Chinese' && e.children.length === 0 && e.offsetParent !== null);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2 });
})()`))
console.log("rect:", JSON.stringify(rect))
if (rect) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y })
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
}
await sleep(2500)
console.log("next state:", await evalV(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(e => (e.innerText||'').trim() === 'Next'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
console.log("next:", await evalV(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(e => (e.innerText||'').trim() === 'Next' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("dialog:", String(await evalV(`document.querySelector('[role=dialog]')?.innerText || 'none'`)).replace(/\n+/g, " | ").slice(0, 600))
console.log("files:", await evalV(`document.querySelectorAll('[role=dialog] input[type=file]').length`))
ws.close()
