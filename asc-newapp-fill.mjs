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

console.log("ios:", await evalV(`(() => { const el = document.getElementById('platformsById.IOS'); if (!el) return 'no'; if (!el.checked) el.click(); return el.checked; })()`))
await sleep(1200)
console.log("name:", await evalV(`(() => { const el = document.getElementById('name'); el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, 'HyperCode Remote'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); return el.value; })()`))
console.log("locales:", await evalV(`JSON.stringify([...document.querySelectorAll('#primaryLocale option')].slice(0,3).map(o => ({v:o.value,t:o.textContent.trim()})))`))
console.log("bundle options:", await evalV(`JSON.stringify([...document.querySelectorAll('#bundleId option')].map(o => ({v:o.value,t:o.textContent.trim()})))`))
console.log("pick bundle:", await evalV(`(() => { const el = document.getElementById('bundleId'); const opt = [...el.options].find(o => o.value === 'app.hypercode.mobile' || /app\\.hypercode\\.mobile/.test(o.textContent)); if (!opt) return 'no-opt'; Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(el, opt.value); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`))
console.log("sku:", await evalV(`(() => { const el = document.getElementById('sku'); el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, 'HYPERCODE-REMOTE-IOS-001'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); return el.value; })()`))
console.log("access:", await evalV(`(() => { const el = document.getElementById('userAccessFull'); if (!el) return 'no'; if (!el.checked) el.click(); return el.checked; })()`))
await sleep(1200)
console.log("create:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Create' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(12000)
console.log("url:", await evalV(`location.href.slice(0, 110)`))
console.log("head:", String(await evalV(`document.body.innerText.slice(0, 300)`)).replace(/\n+/g, " | ").slice(0, 300))
ws.close()
