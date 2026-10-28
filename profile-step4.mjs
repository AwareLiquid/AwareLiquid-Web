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

// click the option with the classic react-select mousedown sequence
const rect = JSON.parse(await evalV(`(() => {
  const opt = [...document.querySelectorAll('[class*=option], [role=option]')].find(o => /app\\.hypercode\\.mobile/.test(o.innerText||''));
  if (!opt) return null;
  const r = opt.getBoundingClientRect();
  return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2 });
})()`))
console.log("opt rect:", JSON.stringify(rect))
if (rect) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y })
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 })
}
await sleep(2000)
console.log("continue:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => /Continue/i.test((e.innerText||'').trim()) && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 500)`)).replace(/\n+/g, " | ").slice(0, 500))
console.log("cert radios:", await evalV(`JSON.stringify([...document.querySelectorAll('input[type=radio], input[type=checkbox]')].map(r => ({id:r.id, checked:r.checked})).slice(0,8))`))
ws.close()
