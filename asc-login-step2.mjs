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
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "login" })
const ctx = world.result.executionContextId
const evalCtx = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true })
  if (r.timeout) return "TIMEOUT"
  if (r.result?.exceptionDetails) return "EXC " + JSON.stringify(r.result.exceptionDetails).slice(0, 240)
  return r.result.result?.value
}

const setValue = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return 'missing';
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
})()`

console.log("pwd:", await evalCtx(setValue("#password_text_field", "Amn86178130")))
await sleep(500)
console.log("signin:", await evalCtx(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Sign In|Continue/i.test(x.innerText||'')); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("state:", await evalCtx(`JSON.stringify({ text: document.body.innerText.slice(0, 220).replace(/\\n+/g, ' | '), inputs: [...document.querySelectorAll('input')].map(i => i.id || i.type).slice(0, 6) })`))
ws.close()
