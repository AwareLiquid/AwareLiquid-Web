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

const notes = [
  "HyperCode AI is an autonomous coding agent for macOS.",
  "",
  "PURPOSE AND AUDIENCE",
  "HyperCode is a desktop coding assistant for software developers. The user gives one high-level instruction (for example \"make the failing tests green\"); the agent plans the work, edits files in the user's own project, runs commands and tests locally, and reports back with the changes. It removes the manual loop of reading, editing and re-running code.",
  "",
  "SET-UP AND ACCESS",
  "1. Launch the app. On first run it opens the workspace; no account is required to browse the UI or open a project folder.",
  "2. Optional online features: Settings -> License -> Connect. The app shows a short device pairing code and opens a browser page where the code is approved. Approval links this install to an existing AwareLiquid account and returns an API key automatically; the user never pastes a key.",
  "3. Reviewers can exercise the core flow without an account: open any local folder as a project and the workspace, file tree, session view and settings are available. Model responses need either an AwareLiquid account (pairing) or the reviewer's own model API key entered under Settings -> Providers.",
  "4. No demo account is needed because the app has no sign-up or sign-in of its own.",
  "",
  "ACCOUNT, USER CONTENT AND PURCHASES",
  "- No account registration, sign-in or account deletion exists inside the app. Accounts are created and managed on our website. The device pairing code is the only account-related UI and can be dismissed.",
  "- No user-generated content is published or shared between users, so content reporting and blocking do not apply.",
  "- The App Store build has no in-app purchase, no subscription offer, and no link or button that leads to an external checkout.",
  "",
  "EXTERNAL SERVICES",
  "- api.trust3.pro - our OpenAI-compatible inference gateway (model requests).",
  "- www.trust3.pro - website used only for the optional device pairing step.",
  "- DeepSeek - upstream model provider behind the gateway.",
  "Only the prompt and the context the user chooses are sent; project files stay on the device.",
  "",
  "REGIONAL DIFFERENCES",
  "Identical in every region. It is built for users in mainland China (no VPN required, Chinese model provider by default) but behaves the same worldwide.",
  "",
  "REGULATED INDUSTRY",
  "Not applicable.",
  "",
  "SCREEN RECORDING",
  "The app is a cross-platform Electron application and the macOS build runs the same code as the Windows build; we do not have macOS hardware available to record on. We can provide a recording of the identical UI on Windows, or a macOS recording as soon as we have access to a Mac - whichever you prefer.",
].join("\n")

await send("Page.navigate", { url: "https://appstoreconnect.apple.com/apps/6826464018/distribution/macos/version/inflight" })
await sleep(13000)
console.log("url:", await evalV(`location.href.slice(0,80)`))
console.log("len:", notes.length)
const expr = `(() => {
  const el = document.getElementById('notes');
  if (!el) return 'missing';
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(notes)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  return el.value.length;
})()`
console.log("set:", await evalV(expr))
await sleep(1500)
console.log("save state:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null); return b ? (b.disabled ? 'disabled' : 'enabled') : 'missing'; })()`))
console.log("save:", await evalV(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim() === 'Save' && e.offsetParent !== null && !e.disabled); if (!b) return 'no'; b.click(); return 'clicked'; })()`))
await sleep(8000)
console.log("after:", String(await evalV(`document.body.innerText.slice(0, 120)`)).replace(/\n+/g, " | ").slice(0, 120))
ws.close()
