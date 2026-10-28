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
const setVal = (eid, v) => evalV(`(() => { const el = document.getElementById(${JSON.stringify(eid)}); if (!el) return 'missing'; el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); return el.value; })()`)

console.log("name:", await setVal("newGroupName", "Internal Testers"))
await sleep(800)
console.log("all builds:", await evalV(`(() => { const el = document.getElementById('hasAccessToAllBuilds'); if (!el) return 'no'; if (!el.checked) el.click(); return el.checked; })()`))
await sleep(1200)
console.log("create:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Create' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("url:", await evalV(`location.href.slice(0, 110)`))
console.log("text:", String(await evalV(`document.body.innerText.slice(0, 300)`)).replace(/\n+/g, " | ").slice(0, 300))
ws.close()
