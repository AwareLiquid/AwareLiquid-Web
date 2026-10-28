import fs from "node:fs"

const path = "E:/tmp-opencode/awareliquid-web/web/sitemap.xml"
let xml = fs.readFileSync(path, "utf8")
const nl = xml.includes("\r\n") ? "\r\n" : "\n"

const anchor = "<loc>https://awareliquid.ai/en/guides-hypercode-vs-cursor</loc>"
const idx = xml.indexOf(anchor)
if (idx < 0) {
  console.log("anchor not found")
  process.exit(1)
}
const end = xml.indexOf("</url>", idx) + "</url>".length

const block = [
  "  <url>",
  "    <loc>https://awareliquid.ai/guides-hypercode-vs-claude-code</loc>",
  "    <lastmod>2026-10-28</lastmod>",
  "    <changefreq>monthly</changefreq>",
  "    <priority>0.8</priority>",
  "  </url>",
  "  <url>",
  "    <loc>https://awareliquid.ai/en/guides-hypercode-vs-claude-code</loc>",
  "    <lastmod>2026-10-28</lastmod>",
  "    <changefreq>monthly</changefreq>",
  "    <priority>0.8</priority>",
  "  </url>",
  "  <url>",
  "    <loc>https://awareliquid.ai/guides-hypercode-vs-copilot</loc>",
  "    <lastmod>2026-10-28</lastmod>",
  "    <changefreq>monthly</changefreq>",
  "    <priority>0.8</priority>",
  "  </url>",
  "  <url>",
  "    <loc>https://awareliquid.ai/en/guides-hypercode-vs-copilot</loc>",
  "    <lastmod>2026-10-28</lastmod>",
  "    <changefreq>monthly</changefreq>",
  "    <priority>0.8</priority>",
  "  </url>",
].join(nl)

xml = xml.slice(0, end) + nl + block + xml.slice(end)
fs.writeFileSync(path, xml, "utf8")
console.log("sitemap updated")
