import { readFileSync, writeFileSync } from "node:fs"

const files = {
  zh: "E:/tmp-opencode/awareliquid-web/web/hypercode.html",
  en: "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html",
  ar: "E:/tmp-opencode/awareliquid-web/web/ar/hypercode.html",
}

const read = (p) => readFileSync(p, "utf8")
const write = (p, s) => writeFileSync(p, s, "utf8")

// 1) Language switcher: show the CURRENT language on the button and cycle zh -> en -> ar -> zh.
//    Before: the button showed the NEXT language, so a Chinese page displayed "العربية" and the
//    cycle jumped zh -> ar -> en; document.documentElement.lang is "zh-CN" so the old exact
//    comparison against "zh" never matched.
const toggleBefore = /if \(langBtn\) langBtn\.textContent = lang === 'en' \? '[^']*' : \(lang === 'zh' \? '[^']*' : 'EN'\);/
const toggleAfter =
  "if (langBtn) langBtn.textContent = lang === 'en' ? 'EN' : (lang === 'ar' ? 'العربية' : '中文');"

const clickBefore = /var cur = document\.documentElement\.lang === 'ar' \? 'ar' : \(document\.documentElement\.lang === 'en' \? 'en' : '[a-z-]*'\);\s*\n\s*applyHC\(cur === 'en' \? 'zh' : \(cur === 'zh' \? 'ar' : 'en'\)\);/
const clickAfter =
  "var now = (document.documentElement.lang || '').toLowerCase();\n" +
  "  var cur = now.indexOf('ar') === 0 ? 'ar' : (now.indexOf('en') === 0 ? 'en' : 'zh');\n" +
  "  applyHC(cur === 'zh' ? 'en' : (cur === 'en' ? 'ar' : 'zh'));"

for (const [lang, path] of Object.entries(files)) {
  let html = read(path)
  const before = { len: html.length, toggle: 0, click: 0 }

  if (toggleBefore.test(html)) {
    html = html.replace(toggleBefore, toggleAfter)
    before.toggle = 1
  }
  if (clickBefore.test(html)) {
    html = html.replace(clickBefore, clickAfter)
    before.click = 1
  }

  // 2) Leftovers that stayed in Chinese on the translated pages.
  const leftovers = {
    en: [
      ["© 2026 AwareLiquid · 深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co., Ltd 版权所有 ·",
       "© 2026 AwareLiquid · Shenzhen Sansi Dark Source Technology Co., Ltd. All rights reserved ·"],
      ["macOS · Apple 芯片(.dmg)", "macOS · Apple Silicon (.dmg)"],
      ["Windows 桌面版(.exe)", "Windows desktop (.exe)"],
      ["期绝不自动扣费。", ""],
      ["HyperCode 徽记", "HyperCode mark"],
      ["HyperWork 徽记", "HyperWork mark"],
      ["切换语言 / Switch language", "Switch language"],
    ],
    ar: [
      ["© 2026 AwareLiquid · 深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co., Ltd 版权所有 ·",
       "© 2026 AwareLiquid · شركة شنتشن سانسي دارك سورس تكنولوجي المحدودة · جميع الحقوق محفوظة ·"],
      ["macOS · Apple 芯片(.dmg)", "macOS · شريحة Apple (.dmg)"],
      ["Windows 桌面版(.exe)", "Windows سطح المكتب (.exe)"],
      ["期绝不自动扣费。", ""],
      ["/ 自带 key / 免费档。", " / بمفتاحك الخاص / باقة مجانية."],
      ["订阅", "اشتراك"],
      ["试用", "تجربة"],
      ["HyperCode 徽记", "شعار HyperCode"],
      ["HyperWork 徽记", "شعار HyperWork"],
      ["切换语言 / Switch language", "تبديل اللغة"],
    ],
  }

  let replaced = 0
  for (const [from, to] of leftovers[lang] ?? []) {
    if (!html.includes(from)) continue
    html = html.split(from).join(to)
    replaced++
  }

  write(path, html)
  console.log(
    `${lang}: toggle=${before.toggle} click=${before.click} leftovers=${replaced} bytes ${before.len} -> ${html.length}`,
  )
}
