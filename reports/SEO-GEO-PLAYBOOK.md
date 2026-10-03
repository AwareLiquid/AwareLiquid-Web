# SEO / GEO Playbook — awareliquid.ai & awareness.market

> 维护者说明:本文件记录 2026-10 一轮 SEO/GEO 优化做了什么、还差什么、以及必须人工执行的动作。
> 涉及两个仓库:`E:\AwareLiquid-Web`(awareliquid.ai,静态站→Caddy/M1 部署)、`E:\Awareness`(awareness.market,Next.js)。

## 一、已完成的改动

### awareliquid.ai(`E:\AwareLiquid-Web\web`)
- **sitemap.xml**:统一到 clean canonical URL;删除 4 个线上 404 的 `/ar/*`、5 个与 canonical 冲突的 `.html` 重复项;新增 6 个新页。`loc = lastmod = 324`。
- **hreflang**:删除 index/about/cleaning/demo/models/research/privacy/terms/api/ar-api 上"多语言全指向同一 URL"的无效簇;修 guides 错误的 x-default;去掉 hypercode/guides 指向死链的 `/ar/` alternate。
- **check.mjs**:重写为能识别子目录、动态路由(`/valuation`、`/snapshots/`、`/morning-notes/`)、重定向页。`node web/check.mjs` 现为绿(30 页 / 324 条)。
- **index.html**:title/description/OG 纳入 HyperCode 产品词;新增 HyperCode `SoftwareApplication` JSON-LD(`@id` + `publisher → #organization`)。
- **新增 6 页**:`/vibe-coding`、`/ai-coworker`、`/best-ai-coding-2026` 及 `/en/` 版,含 Article + BreadcrumbList + FAQPage 结构化数据。
- **llms.txt / llms-full.txt**:删除死掉的阿拉伯语区块;新增 Canonical Facts、Category positioning、Key pages、Guides 索引。
- **guides(4 文件)**:补 BreadcrumbList。**hypercode(2 文件)**:补 `@id` + BreadcrumbList。
- 全站 `228+` 统一为 **229**。

### awareness.market(`E:\Awareness\frontend`)
- **`public/sdk-docs/ALTERNATIVES.md`**:新增 `## vs. Supermemory`;修正"Supermemory 无公开 LongMemEval 数字"的错误说法,明确 R@5 与 QA accuracy 是不同指标。
- **`public/sdk-docs/vs-supermemory.md`(新)**:独立"Supermemory alternative"页。
- **`public/llms.txt`**:新增 vs Supermemory 小节 + 链接;新增 Markdown mirrors 索引。**`public/llms-full.txt`**:新增 vs Supermemory。
- **本地化**:`sdk-docs/{zh,ja,ar}/ALTERNATIVES.md` 均追加"vs Supermemory"章节。
- **新增 `.md` 镜像**:`public/index.md`、`developers.md`、`pricing.md`(配合已有 `deals.md`、`market.md`)。
- 审计:`/ar` 实测 200(可索引);78 个 `page.tsx` 中 28 个有 metadata,缺的多为登录后/重定向页,非真缺口。

## 二、必须人工执行(无法在代码里完成)

### 1) Google Search Console(两个域名)
1. 验证属性(你已有)。
2. 提交 `https://awareliquid.ai/sitemap.xml` 和 `https://awareness.market/sitemap.xml`。
3. 对重点页「网址检查 → 请求编入索引」:`/`、`/hypercode`、`/vibe-coding`、`/ai-coworker`、`/best-ai-coding-2026`、`/guides-hypercode-vs-cursor`、`/en/hypercode`。
4. 关注 Coverage 报告里这几类(本轮修复直接针对它们):
   - **Duplicate, Google chose different canonical** → 应该减少(canonical 与 sitemap 已对齐)。
   - **Crawled - currently not indexed / Discovered - not indexed** → 靠外链与内链推动。
   - **Not found (404)** → 应该清零(已删 `/ar/*` 死链)。
5. **IndexNow 只喂 Bing/Yandex**;Google 必须走 GSC。

### 2) 服务器 301(消除 `.html` 重复页)
Caddy(保留 `/snapshots/*.html`):
```
redir /guides-ai-coding-assistant.html /guides-ai-coding-assistant 301
redir /guides-hypercode-vs-cursor.html /guides-hypercode-vs-cursor 301
redir /en/hypercode.html /en/hypercode 301
redir /en/guides-ai-coding-assistant.html /en/guides-ai-coding-assistant 301
redir /en/guides-hypercode-vs-cursor.html /en/guides-hypercode-vs-cursor 301
redir /brand.html /brand 301
```

### 3) 站外 GEO(真正的排名杠杆)
- 从 GitHub 仓库 README(HyperCode / M1 / Awareness-SDK)链回 `awareliquid.ai/hypercode` 与 `awareness.market`。
- awareness.market:Product Hunt、AlternativeTo、r/LocalLLaMA、HN Show。
- 中文:知乎 / CSDN / 掘金 发布对比文(`HyperCode vs Cursor`、`AI 同事`、`vibe coding`)。

## 三、战略提醒
- **`hypercode` 是同名重灾区**(welshDog/HyperCode-V2.4、0al-spec/Hypercode、tomlin7/hypercode、npm gethyperai/hypercode、Applicable 低代码平台)。裸词短期难第一,主攻 **"HyperCode + AwareLiquid" / "vs Cursor" / "下载" / "AI coding software" / "vibe coding tool" / "AI coworker"**。
- **`/about` 写"open research framework, not a commercial product"、`/terms` 写"Research prototype — no warranty"** —— 与"在卖 HyperCode"矛盾,建议单独做 HyperCode 商业 ToS/About,或调整措辞。
- 每轮改完运行 `node web/check.mjs`(加 `--live` 抓线上);push 后务必实抓线上确认生效(约 1 小时)。
