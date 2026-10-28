const CDP = "http://127.0.0.1:9223"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page")
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

// focus the composer
console.log("focus:", await evalV(`(() => { const el = document.querySelector('[contenteditable=true]'); if (!el) return 'no'; el.focus(); return 'ok'; })()`))
await sleep(500)
await send("Input.insertText", { text: "Run the tests in this project and fix the failing one." })
await sleep(1200)
console.log("value:", String(await evalV(`document.querySelector('[contenteditable=true]')?.innerText || ''`)).slice(0, 80))
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })
await sleep(4000)
console.log("after:", String(await evalV(`document.body.innerText.slice(0, 400)`)).replace(/\n+/g, " | ").slice(0, 400))
ws.close()
