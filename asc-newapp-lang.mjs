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

console.log("locale options:", await evalV(`JSON.stringify([...document.querySelectorAll('#primaryLocale option')].filter(o => /English \\(U\\.S\\.\\)/i.test(o.textContent)).map(o => ({v:o.value,t:o.textContent.trim()})))`))
console.log("set locale:", await evalV(`(() => { const el = document.getElementById('primaryLocale'); if (!el) return 'no'; const opt = [...el.options].find(o => /English \\(U\\.S\\.\\)/i.test(o.textContent)); if (!opt) return 'no-opt'; Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(el, opt.value); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`))
await sleep(1200)
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button')].map(b => ({t:(b.innerText||'').trim().slice(0,20), d:b.disabled})).filter(x=>x.t).slice(0,12))`))
ws.close()
