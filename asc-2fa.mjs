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

const tree = (await send("Page.getFrameTree")).result.frameTree
const frames = []
const walk = (n) => {
  frames.push(n.frame)
  for (const c of n.childFrames ?? []) walk(c)
}
walk(tree)
const target = frames.find((f) => f.url.includes("idmsa.apple.com"))
if (!target) {
  console.log("no idmsa frame")
  process.exit(0)
}
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "l" })
const ctx = world.result.executionContextId
const evalCtx = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true })
  if (r.timeout) return "TIMEOUT"
  if (!r.result) return "NO_RESULT"
  if (r.result.exceptionDetails) return "EXC " + JSON.stringify(r.result.exceptionDetails).slice(0, 200)
  return r.result.result?.value
}

console.log("inputs:", await evalCtx(`JSON.stringify([...document.querySelectorAll('input')].map(i => ({t:i.type, id:i.id, ph:i.placeholder, max:i.maxLength})))`))
console.log("fill:", await evalCtx(`(() => {
  const inputs = [...document.querySelectorAll('input')].filter(i => i.type === 'tel' || i.type === 'text' || i.type === 'number');
  const code = '202103';
  const sv = (el, v) => { el.focus(); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
  if (inputs.length >= 6) {
    inputs.slice(0,6).forEach((el,i) => sv(el, code[i]));
    return 'six:' + inputs.slice(0,6).map(i=>i.value).join('');
  }
  if (inputs.length === 1) { sv(inputs[0], code); return 'one:' + inputs[0].value; }
  return 'inputs=' + inputs.length;
})()`))
await sleep(2500)
console.log("submit:", await evalCtx(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Verify|Continue|Next|Submit/i.test(x.innerText||'') && !x.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(10000)
const main = await send("Runtime.evaluate", { expression: `location.href.slice(0, 90)`, returnByValue: true })
console.log("main url:", main.result?.result?.value)
ws.close()
