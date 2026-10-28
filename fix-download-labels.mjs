import { readFileSync, writeFileSync } from "node:fs"

const files = [
  "E:/tmp-opencode/awareliquid-web/web/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/ar/hypercode.html",
]

// The three download buttons were the only visible strings with no data-i18n, so switching the
// language in place left them in Chinese. Give them keys and extend the embedded dictionaries.
const buttons = [
  {
    href: "hypercode-desktop-win-x64.exe",
    key: "dl.win",
    zh: "Windows 桌面版(.exe)",
    en: "Windows desktop (.exe)",
    ar: "Windows سطح المكتب (.exe)",
  },
  {
    href: "hypercode-desktop-mac-arm64.dmg",
    key: "dl.macArm",
    zh: "macOS · Apple 芯片(.dmg)",
    en: "macOS · Apple Silicon (.dmg)",
    ar: "macOS · شريحة Apple (.dmg)",
  },
  {
    href: "hypercode-desktop-mac-x64.dmg",
    key: "dl.macIntel",
    zh: "macOS · Intel(.dmg)",
    en: "macOS · Intel (.dmg)",
    ar: "macOS · Intel (.dmg)",
  },
]

const patch = `
/* Download labels live outside the original dictionary; keep them switchable too. */
(function(){
  var extra = ${JSON.stringify(
    buttons.reduce((acc, b) => {
      acc[b.key] = { zh: b.zh, en: b.en, ar: b.ar }
      return acc
    }, {}),
  )};
  Object.keys(extra).forEach(function(key){
    if (window.I18N) {
      I18N.zh[key] = I18N.zh[key] || extra[key].zh;
      I18N.en[key] = I18N.en[key] || extra[key].en;
      I18N.ar[key] = I18N.ar[key] || extra[key].ar;
    }
  });
})();
`

for (const path of files) {
  let html = readFileSync(path, "utf8")
  let patched = 0

  for (const b of buttons) {
    const re = new RegExp(`(<a class="btn[^"]*" href="[^"]*${b.href}">)([^<]*)(</a>)`, "g")
    html = html.replace(re, (m, open, text, close) => {
      if (open.includes("data-i18n")) return m
      patched++
      return `${open.replace(/>$/, `><span data-i18n="${b.key}">`)}${text}</span>${close}`
    })
  }

  // Append the dictionary patch right before </body>.
  if (html.includes("</body>")) html = html.replace("</body>", `${patch}</body>`)

  writeFileSync(path, html, "utf8")
  console.log(path.split("/").slice(-2).join("/"), "buttons patched:", patched)
}
