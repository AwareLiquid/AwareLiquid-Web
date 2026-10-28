const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page" && t.url.includes("reviewsubmissions/details"))
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

const body = `Thanks for the review. Answers to each point, in order. The same information is now in the App Review Information notes field.

2. PURPOSE AND TARGET AUDIENCE
HyperCode AI is an autonomous coding agent for macOS, built for software developers. The user gives one high-level instruction (for example "make the failing tests green"). The agent plans the work, edits files inside the user's own project folder, runs commands and tests locally, and reports back with the changes. The value is removing the manual read-edit-rerun loop while keeping the code and the execution on the user's machine.

3. SET-UP AND ACCESS
a) Launch the app: the workspace opens with no sign-up and no sign-in.
b) Open any local folder as a project: file tree, session view, terminal and settings are all usable without an account.
c) Model responses come from either an AwareLiquid account or the reviewer's own model API key (Settings -> Providers). For the AwareLiquid path the user picks Settings -> License -> Connect; the app shows a short device pairing code and opens a browser page where the code is approved, then the API key is delivered to the app automatically. No key is copied by hand.
d) There is no demo account because the app has no account system of its own: accounts live on our website and the pairing code is the only account-related UI. It can be dismissed, and the local workspace keeps working.

Account deletion flows: not applicable, since no account can be created inside the app.
User-generated content: not applicable - nothing is published or shared between users, so reporting and blocking do not apply.
Paid content in the app: none. The App Store build contains no in-app purchase, no subscription offer and no link or button that opens an external checkout.

4. EXTERNAL SERVICES
- api.trust3.pro - our OpenAI-compatible inference gateway, used for model requests.
- www.trust3.pro - website used only for the optional device pairing step.
- DeepSeek - upstream model provider behind the gateway.
Only the prompt and the context the user chooses are sent; project files stay on the device.

5. REGIONAL DIFFERENCES
None: the app behaves identically in every region. It is tuned for users in mainland China (no VPN required, Chinese model provider by default) but works the same worldwide.

6. REGULATED INDUSTRY
Not applicable - no regulated services and no protected third-party material are offered.

1. SCREEN RECORDING
The app is a cross-platform Electron application; the macOS build is the same code and the same UI as the Windows build. We do not currently have macOS hardware to record on. If a capture of the identical UI on Windows is acceptable, we will upload it right away - please confirm. Otherwise we will provide a macOS recording as soon as we have access to a Mac.`

const expr = `(() => {
  const el = document.getElementById('messageBody');
  if (!el) return 'missing';
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(body)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  return el.value.length;
})()`
console.log("set:", await evalV(expr))
await sleep(1200)
console.log("reply btn:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Reply' && !e.disabled); return b ? 'enabled' : 'missing'; })()`))
console.log("send:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Reply' && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(9000)
console.log("after:", String(await evalV(`document.body.innerText.slice(0, 200)`)).replace(/\n+/g, " | ").slice(0, 200))
ws.close()
