import { readFileSync, writeFileSync } from "node:fs"

const path = "E:/hypercode/packages/desktop/src/main/index.ts"
let text = readFileSync(path, "utf8")
const nl = text.includes("\r\n") ? "\r\n" : "\n"
const norm = text.replace(/\r\n/g, "\n")

const before1 = `  const pluginUpdater = createPluginUpdaterController({
    enabled: UPDATER_ENABLED,`
const after1 = `    const pluginUpdater = createPluginUpdaterController({
      // App Store builds are updated by the store; the plugin channel downloads executable payloads at
      // runtime, which guideline 2.5.2 does not allow, so it stays off there.
    enabled: UPDATER_ENABLED && !process.mas,`

const before2 = `  void updater.start()
  void pluginUpdater.start()
  const updateTimer = setInterval(() => void updater.check(), 10 * 60 * 1000)
  updateTimer.unref()
  app.once("will-quit", () => clearInterval(updateTimer))`
const after2 = `    if (!process.mas) {
      void updater.start()
      void pluginUpdater.start()
      const updateTimer = setInterval(() => void updater.check(), 10 * 60 * 1000)
      updateTimer.unref()
      app.once("will-quit", () => clearInterval(updateTimer))
    }`

if (!norm.includes(before1)) {
  console.log("MISS block 1")
  process.exit(1)
}
if (!norm.includes(before2)) {
  console.log("MISS block 2")
  process.exit(1)
}
const next = norm.replace(before1, after1).replace(before2, after2)
writeFileSync(path, next.replace(/\n/g, nl), "utf8")
console.log("ok")
