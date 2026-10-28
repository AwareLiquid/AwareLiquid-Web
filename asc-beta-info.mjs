import fs from "node:fs"

const envText = fs.readFileSync("E:/tmp-opencode/server.env", "utf8")
const accessKey = /HYPERCODE_ACCESS_KEY=(\S+)/.exec(envText)?.[1]
if (!accessKey) {
  console.log("no access key")
  process.exit(1)
}

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
const setVal = (eid, v) => evalV(`(() => { const el = document.getElementById(${JSON.stringify(eid)}); if (!el) return 'missing'; el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); return el.value.length; })()`)

console.log("feedback:", await setVal("betaAppLocalizations[en-us].feedbackEmail", "anmuning@awareliquid.ai"))
console.log("first:", await setVal("betaAppReviewDetails.contactFirstName", "Muning"))
console.log("last:", await setVal("betaAppReviewDetails.contactLastName", "An"))
console.log("phone:", await setVal("betaAppReviewDetails.contactPhone", "+86 13653649378"))
console.log("email:", await setVal("betaAppReviewDetails.contactEmail", "anmuning@awareliquid.ai"))
console.log("demoName:", await setVal("betaAppReviewDetails.demoAccountName", "Reviewer"))
console.log("demoPass:", await setVal("betaAppReviewDetails.demoAccountPassword", accessKey))
await sleep(1500)
console.log("add state:", await evalV(`(() => { const d = document.querySelector('[role=dialog]'); const b = [...d.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Add'); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
console.log("add:", await evalV(`(() => { const d = document.querySelector('[role=dialog]'); const b = [...d.querySelectorAll('button')].find(x => (x.innerText||'').trim() === 'Add' && !x.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(10000)
console.log("dialog:", await evalV(`document.querySelector('[role=dialog]') ? 'OPEN' : 'CLOSED'`))
console.log("tail:", String(await evalV(`document.body.innerText.slice(-400)`)).replace(/\n+/g, " | ").slice(-400))
ws.close()
