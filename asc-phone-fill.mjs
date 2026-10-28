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
const target = frames.find((f) => f.url.includes("id.apple.com"))
if (!target) {
  console.log("no frame")
  process.exit(0)
}
const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "verify" })
const ctx = world.result.executionContextId
const evalCtx = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true })
  if (r.timeout) return "TIMEOUT"
  if (!r.result) return "NO_RESULT"
  if (r.result.exceptionDetails) return "EXC " + JSON.stringify(r.result.exceptionDetails).slice(0, 200)
  return r.result.result?.value
}

const code = "308847"
console.log("fill:", await evalCtx(`(() => {
  const inputs = [...document.querySelectorAll('input[type=tel]')];
  if (inputs.length < 6) return 'only ' + inputs.length;
  const digits = ${JSON.stringify(code)};
  inputs.slice(0, 6).forEach((el, i) => {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, digits[i]);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: digits[i] }));
  });
  return inputs.map(i => i.value).join('');
})()`))
await sleep(9000)
const main = await send("Runtime.evaluate", { expression: `(() => { const d = document.querySelector('[role=dialog]'); return d ? 'OPEN: ' + d.innerText.slice(0,120).replace(/\\n+/g,' | ') : 'CLOSED'; })()`, returnByValue: true })
console.log("dialog:", main.result?.result?.value)
ws.close()
