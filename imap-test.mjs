import tls from "node:tls"

const host = "imap.exmail.qq.com"
const user = "anmuning@awareliquid.ai"
const pass = "Amn86178130"

const socket = tls.connect({ host, port: 993, servername: host, timeout: 20000 }, () => {
  console.log("connected")
})
let buffer = ""
let stage = 0
socket.on("data", (data) => {
  buffer += data.toString("utf8")
  const lines = buffer.split("\r\n")
  buffer = lines.pop() ?? ""
  for (const line of lines) {
    if (line) console.log("<", line.slice(0, 160))
    if (stage === 0 && line.startsWith("* OK")) {
      stage = 1
      socket.write(`a1 LOGIN "${user}" "${pass}"\r\n`)
    } else if (stage === 1 && line.startsWith("a1 ")) {
      stage = 2
      console.log("login:", line.startsWith("a1 OK") ? "OK" : "FAILED")
      socket.write("a2 LOGOUT\r\n")
      setTimeout(() => socket.end(), 800)
    }
  }
})
socket.on("timeout", () => {
  console.log("timeout")
  socket.destroy()
})
socket.on("error", (e) => console.log("error:", String(e).slice(0, 120)))
setTimeout(() => {
  socket.destroy()
  process.exit(0)
}, 25000)
