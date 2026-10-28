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

console.log("cc:", await evalV(`(() => { const el = document.querySelector('select[name="sellerContactInfo.phoneInternationalCountryCode"]'); if (!el) return 'no'; const opt = [...el.options].find(o => /\\+86/.test(o.textContent)); if (!opt) return 'no-opt'; Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(el, opt.value); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`))
await sleep(1500)
console.log("next:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Next' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
const t = await evalV(`document.body.innerText`)
const i = t.indexOf("Verify Email")
console.log("tail:", JSON.stringify(t.slice(Math.max(0, i - 100), i + 400)))
console.log("buttons:", await evalV(`JSON.stringify([...document.querySelectorAll('button,a')].map(b => ({t:(b.innerText||'').trim(), d:b.disabled})).filter(x=>x.t).slice(-8))`))
ws.close()
