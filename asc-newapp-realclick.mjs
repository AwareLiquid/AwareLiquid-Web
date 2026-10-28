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

const rect = JSON.parse(await evalV(`(() => {
  const items = [...document.querySelectorAll('*')].filter(e => (e.textContent||'').trim() === 'New App' && e.children.length === 0 && e.offsetParent !== null);
  if (!items.length) return null;
  const el = items[0].closest('li, [role=menuitem], a, button') || items[0];
  const r = el.getBoundingClientRect();
  return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2, tag: el.tagName });
})()`))
console.log("rect:", JSON.stringify(rect))
if (rect) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y })
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
}
await sleep(9000)
console.log("url:", await evalV(`location.href.slice(0, 110)`))
console.log("head:", String(await evalV(`document.body.innerText.slice(0, 500)`)).replace(/\n+/g, " | ").slice(0, 500))
console.log("inputs:", await evalV(`JSON.stringify([...document.querySelectorAll('input,select')].map(i => ({t:i.type||i.tagName, id:i.id, ph:i.placeholder})).slice(0, 12))`))
ws.close()
