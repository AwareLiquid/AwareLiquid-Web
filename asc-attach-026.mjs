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

await send("Page.navigate", { url: "https://appstoreconnect.apple.com/apps/6826464018/distribution/macos/version/inflight" })
await sleep(14000)
console.log("builds:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('Build'); return t.slice(i, i + 200) })()`)).replace(/\n+/g, " | ").slice(0, 200))
console.log("add:", await evalV(`(() => { const b = [...document.querySelectorAll('button,a')].find(e => (e.innerText||'').trim() === 'Add Build'); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("radios:", await evalV(`JSON.stringify([...document.querySelectorAll('input[type=radio]')].map(r => ({id:r.id, d:r.disabled, c:r.checked})))`))
console.log("build text:", String(await evalV(`(() => { const t = document.body.innerText; const i = t.indexOf('BUILD'); return t.slice(i, i + 240) })()`)).replace(/\n+/g, " | ").slice(0, 240))
ws.close()
