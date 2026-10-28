import fs from "node:fs"

const path = "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html"
let html = fs.readFileSync(path, "utf8")

const before = '<a class="btn primary" id="subBtn" href="javascript:void(0)" style="margin-top:14px;display:none" data-i18n="sub.cta">Subscribe</a>'
const after =
  '<a class="btn primary" id="subBtn" href="https://www.trust3.pro/purchase" target="_blank" rel="noopener" style="margin-top:14px" data-i18n="sub.cta">Subscribe</a>'

if (!html.includes(before)) {
  console.log("button not found")
  process.exit(1)
}
html = html.replace(before, after)
fs.writeFileSync(path, html, "utf8")
console.log("subscribe CTA enabled")
