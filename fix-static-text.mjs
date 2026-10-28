import { readFileSync, writeFileSync } from "node:fs"

const files = [
  "E:/tmp-opencode/awareliquid-web/web/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/en/hypercode.html",
  "E:/tmp-opencode/awareliquid-web/web/ar/hypercode.html",
]

// Text that never got a data-i18n key: nav links, comparison-table cells, the FAQ heading,
// download buttons and the footer. Rather than hand-edit every node, translate them in place
// after each language switch and remember the original so zh comes back intact.
const table = {
  "先了解再下载:": { en: "Learn first, then download:", ar: "تعرّف أولًا ثم نزّل:" },
  "对比 Cursor / Copilot": { en: "Compare with Cursor / Copilot", ar: "قارن مع Cursor / Copilot" },
  "2026 最佳 AI 编程工具": { en: "Best AI coding tool of 2026", ar: "أفضل أداة برمجة بالذكاء الاصطناعي لعام 2026" },
  "AI 同事是什么": { en: "What is an AI coworker?", ar: "ما هو زميل العمل الذكي؟" },
  "全部模型": { en: "All models", ar: "كل النماذج" },
  "最后更新: 2026年9月1日 ·": { en: "Last updated: September 1, 2026 ·", ar: "آخر تحديث: 1 سبتمبر 2026 ·" },
  "自主连续工作数小时": { en: "Hours of autonomous work", ar: "ساعات من العمل المستقل" },
  "✓ 检查点恢复 + 验证闭环": { en: "✓ Checkpoint recovery + verification loop", ar: "✓ استعادة نقاط التحقق + حلقة تحقق" },
  "部分": { en: "Partial", ar: "جزئي" },
  "内置专业技能(金融/法律/学术)": {
    en: "Built-in expertise (finance / legal / academic)",
    ar: "خبرات مدمجة (مالية / قانونية / أكاديمية)",
  },
  "跨会话记忆项目": { en: "Remembers your project across sessions", ar: "يتذكر مشروعك بين الجلسات" },
  "非编程工作(估值/合同/论文)": {
    en: "Knowledge work (valuation / contracts / papers)",
    ar: "أعمال معرفية (تقييم / عقود / أوراق)",
  },
  "完全本地运行,免 VPN": { en: "Fully local, no VPN", ar: "محلي بالكامل، بلا VPN" },
  "一键安装,零配置": { en: "One-click install, zero config", ar: "تثبيت بنقرة واحدة، بلا إعداد" },
  "HyperCode 常见问题": { en: "HyperCode FAQ", ar: "أسئلة HyperCode الشائعة" },
  "Windows 桌面版(.exe)": { en: "Windows desktop (.exe)", ar: "Windows سطح المكتب (.exe)" },
  "macOS · Apple 芯片(.dmg)": { en: "macOS · Apple Silicon (.dmg)", ar: "macOS · شريحة Apple (.dmg)" },
  "© 2026 AwareLiquid · 深圳三体暗源科技有限公司 Shenzhen Sansi Dark Source Technology Co., Ltd 版权所有 · HyperCode 预览版,功能可能变化": {
    en: "© 2026 AwareLiquid · Shenzhen Sansi Dark Source Technology Co., Ltd. All rights reserved · HyperCode preview — features may change",
    ar: "© 2026 AwareLiquid · شركة شنتشن سانسي دارك سورس تكنولوجي المحدودة · جميع الحقوق محفوظة · HyperCode معاينة — قد تتغير الميزات",
  },
}

const patch = `
(function(){
  var TABLE = ${JSON.stringify(table)};
  var ORIG = new WeakMap();
  function capture(){
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      var n = w.currentNode;
      if (!ORIG.has(n)) ORIG.set(n, n.nodeValue);
    }
  }
  function apply(lang){
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      var n = w.currentNode;
      var orig = ORIG.get(n);
      if (orig == null) continue;
      var key = orig.trim();
      var entry = TABLE[key];
      if (!entry) continue;
      var next = lang === "zh" ? orig : orig.replace(key, entry[lang] || key);
      if (n.nodeValue !== next) n.nodeValue = next;
    }
  }
  capture();
  var base = window.applyHC;
  if (typeof base === "function" && !base.__patched) {
    window.applyHC = function(lang){ base(lang); apply(lang); };
    window.applyHC.__patched = true;
    apply(document.documentElement.lang === "en" ? "en" : (document.documentElement.lang === "ar" ? "ar" : "zh"));
  }
})();
`

for (const path of files) {
  let html = readFileSync(path, "utf8")
  if (html.includes("function capture(){")) {
    console.log(path.split("/").slice(-2).join("/"), "already patched")
    continue
  }
  html = html.replace("</body>", `${patch}</body>`)
  writeFileSync(path, html, "utf8")
  console.log(path.split("/").slice(-2).join("/"), "patched")
}
