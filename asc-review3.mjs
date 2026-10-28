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

console.log("links:", await evalV(`JSON.stringify([...document.querySelectorAll('a')].map(a => ({t:(a.innerText||'').trim().slice(0,30), h:(a.getAttribute('href')||'').slice(0,60)})).filter(x => x.t).slice(0, 20))`))
console.log("row click:", await evalV(`(() => {
  const td = [...document.querySelectorAll('td,div,span')].find(e => (e.textContent||'').trim() === 'Unresolved Issues');
  if (!td) return 'no-cell';
  const row = td.closest('tr, [role=row]') || td.parentElement?.parentElement;
  if (!row) return 'no-row';
  row.click();
  return 'clicked:' + row.tagName;
})()`))
await sleep(8000)
console.log("URL:", await evalV(`location.href.slice(0, 110)`))
const t = await evalV(`document.body.innerText`)
console.log("TAIL:", JSON.stringify(t.slice(-1200)))
ws.close()
