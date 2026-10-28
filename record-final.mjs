import { execFile } from "node:child_process"
import fs from "node:fs"

const out = "E:/tmp-opencode/hypercode-app-review.mp4"
if (fs.existsSync(out)) fs.rmSync(out)

const ffmpeg = execFile("ffmpeg", [
  "-y",
  "-f", "gdigrab",
  "-offset_x", "60",
  "-offset_y", "60",
  "-video_size", "2100x1320",
  "-framerate", "15",
  "-i", "desktop",
  "-t", "70",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  out,
])

const CDP = "http://127.0.0.1:9223"
const list = await (await fetch(CDP + "/json/list")).json()
const page = list.find((t) => t.type === "page")
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
    }, 20000)
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

await sleep(3000)
// start at the top of the conversation
console.log("scroll top:", await evalV(`(() => { const els = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50); if (!els.length) return 'none'; els.sort((a,b) => b.scrollHeight - a.scrollHeight); els[0].scrollTop = 0; return els[0].scrollHeight + '/' + els[0].clientHeight; })()`))
await sleep(3000)
for (let i = 0; i < 5; i++) {
  await sleep(9000)
  console.log("scroll:", await evalV(`(() => { const els = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50); if (!els.length) return 'none'; els.sort((a,b) => b.scrollHeight - a.scrollHeight); const el = els[0]; el.scrollTop = el.scrollTop + Math.round(el.clientHeight * 0.85); return el.scrollTop + '/' + el.scrollHeight; })()`))
}
await new Promise((r) => ffmpeg.on("exit", r))
console.log("video bytes:", fs.existsSync(out) ? fs.statSync(out).size : 0)
ws.close()
