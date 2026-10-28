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

console.log("menu:", await evalV(`(() => {
  const items = [...document.querySelectorAll('[role=menuitem], [role=option], a, button, li')];
  const el = items.find(e => (e.innerText||'').trim() === 'New App' && e.offsetParent !== null);
  if (!el) return 'no';
  el.click();
  return 'clicked:' + el.tagName;
})()`))
await sleep(8000)
console.log("url:", await evalV(`location.href.slice(0, 100)`))
console.log("head:", String(await evalV(`document.body.innerText.slice(0, 400)`)).replace(/\n+/g, " | ").slice(0, 400))
console.log("inputs:", await evalV(`JSON.stringify([...document.querySelectorAll('input,select')].map(i => ({t:i.type||i.tagName, id:i.id, name:i.name, ph:i.placeholder})).slice(0,12))`))
ws.close()
