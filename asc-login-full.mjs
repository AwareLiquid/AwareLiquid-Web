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

const framesOf = async () => {
  const tree = (await send("Page.getFrameTree")).result.frameTree
  const out = []
  const walk = (n) => {
    out.push(n.frame)
    for (const c of n.childFrames ?? []) walk(c)
  }
  walk(tree)
  return out
}
const frameCtx = async () => {
  const frames = await framesOf()
  const target = frames.find((f) => f.url.includes("idmsa.apple.com"))
  if (!target) return null
  const world = await send("Page.createIsolatedWorld", { frameId: target.id, worldName: "login" })
  return world.result.executionContextId
}
const evalCtx = async (ctx, expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true })
  return r.timeout ? "TIMEOUT" : r.result?.result?.value
}

let ctx = await frameCtx()
console.log("email:", await evalCtx(ctx, `(() => { const el = document.getElementById('account_name_text_field'); if (!el) return 'no'; el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, 'anmuning@awareliquid.ai'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'; })()`))
await sleep(800)
console.log("continue1:", await evalCtx(ctx, `(() => { const b = [...document.querySelectorAll('button')].find(x => /Continue|Next|Sign In/i.test(x.innerText||'')); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(7000)
ctx = await frameCtx()
console.log("password field:", await evalCtx(ctx, `!!document.getElementById('password_text_field')`))
console.log("pwd:", await evalCtx(ctx, `(() => { const el = document.getElementById('password_text_field'); if (!el) return 'no'; el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, 'Amn86178130'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'; })()`))
await sleep(600)
console.log("signin:", await evalCtx(ctx, `(() => { const b = [...document.querySelectorAll('button')].find(x => /Continue|Sign In/i.test(x.innerText||'')); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(10000)
console.log("url:", await evalCtx(frameCtx ? (await frameCtx()) ?? ctx : ctx, `location.href`).catch(() => "?"))
const main = await send("Runtime.evaluate", { expression: `location.href.slice(0, 90)`, returnByValue: true })
console.log("main url:", main.result?.result?.value)
ws.close()
