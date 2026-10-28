import { readFileSync, writeFileSync } from "node:fs"

const files = [
  "E:/tmp-opencode/awareliquid-web/web/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/ar/hypercode.html",
]

// The English and Arabic foot.copy entries kept the Chinese legal name inside the translated copy.
const fromEn =
  "© 2026 AwareLiquid · 深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co., Ltd 版权所有 · HyperCode preview — features may change"
const toEn =
  "© 2026 AwareLiquid · Shenzhen Sansi Dark Source Technology Co., Ltd. All rights reserved · HyperCode preview — features may change"
const fromAr =
  "© 2026 AwareLiquid · 深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co., Ltd 版权所有 · HyperCode معاينة — قد تتغير الميزات"
const toAr =
  "© 2026 AwareLiquid · شركة شنتشن سانسي دارك سورس تكنولوجي المحدودة · جميع الحقوق محفوظة · HyperCode معاينة — قد تتغير الميزات"

for (const path of files) {
  let html = readFileSync(path, "utf8")
  const a = html.includes(fromEn)
  const b = html.includes(fromAr)
  if (a) html = html.split(fromEn).join(toEn)
  if (b) html = html.split(fromAr).join(toAr)
  // The stray Chinese "版权所有" that follows the company name in some dictionary entries.
  html = html.replace(/深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co, Ltd 版权所有/g, "Shenzhen Sansi Dark Source Technology Co., Ltd. All rights reserved")
  writeFileSync(path, html, "utf8")
  console.log(path.split("/").slice(-2).join("/"), "en:", a, "ar:", b)
}
