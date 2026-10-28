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

const description = `HyperCode Remote is the companion client for a HyperCode workspace. It shows the assistant's chat, activity and app surfaces, and lets you follow work that runs on your Mac.

How to test: launch the app and enter the workspace access key listed in the App Review notes (sign-in required). The workspace opens immediately. Send a short request in Chat and watch the agent respond; Settings shows the workspace connection.`
const whatsNew = "First TestFlight build of HyperCode Remote."

const fill = (eid, text) => evalV(`(() => {
  const el = document.getElementById(${JSON.stringify(eid)});
  if (!el) return 'missing';
  el.focus();
  el.textContent = ${JSON.stringify(text)};
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ${JSON.stringify(text)}, inputType: 'insertText' }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  return (el.innerText || '').length;
})()`)

console.log("desc:", await fill("betaAppLocalizations[en-us].description", description))
console.log("whatsNew:", await fill("localizations[en-us].whatsNew", whatsNew))
await sleep(1500)
console.log("next state:", await evalV(`(() => { const d = document.querySelector('[role=dialog]'); const b = [...d.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Next'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
console.log("next:", await evalV(`(() => { const d = document.querySelector('[role=dialog]'); const b = [...d.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Next' && !x.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("dialog:", String(await evalV(`document.querySelector('[role=dialog]')?.innerText || 'CLOSED'`)).replace(/\n+/g, " | ").slice(0, 300))
ws.close()
