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

---

## 四、2026-10-04 更新(模型全家桶 / 定价 / FAQ / 自动部署 / GSC)

### awareliquid.ai — 现在 push 即自动部署 🚀
- **`.github/workflows/deploy.yml`**(workflow `deploy-awareliquid`):push `main` → GitHub Actions runner SSH 到 `45.76.18.203` → `git config core.autocrlf false` + `git fetch` + **`git reset --hard origin/main`**(部署目标不做 merge,规避换行漂移) → 幂等确保 Caddy 路由 → `caddy reload` → 验证 `/` `/hypercode` `/vibe-coding` 等为 200。
- **Secret**:repo secret `VULTR_SSH_KEY`(= `~/.ssh/m1_deploy_key` 私钥;公钥已在服务器 `/root/.ssh/authorized_keys`)。
- **手动触发**:`gh workflow run deploy-awareliquid -R AwareLiquid/AwareLiquid-Web`。
- 服务器事实:`45.76.18.203`(Vultr Chicago,Ubuntu 26.04);容器 `mtlnn_prod`(FastAPI :8000,服务根级静态)、`caddy_prod`、`mtlnn_sciqa`;**Caddyfile 源在 `/root/M1/deploy/Caddyfile`**(bind-mount 进容器);`/root/AwareLiquid-Web/web` bind-mount 到 caddy `/web`。
- **本机连不上该服务器 SSH**(本地代理把 `45.76.18.203:22` 的握手挡了)——所以"自动部署"是让 **GitHub runner** 去连,绕开本机网络。
- **新增根级页路由**:Caddy 里用命名 matcher(不能给 `handle` 传多个路径):
  ```
  @newpages path /vibe-coding /ai-coworker /best-ai-coding-2026
  handle @newpages { @noext not path_regexp \.(html|...)$ ; rewrite @noext {uri}.html ; root * /web ; file_server }
  ```
  (既有 `/en/*` 由 Caddy 直接服务并自动补 `.html`,所以英文页 `/en/vibe-coding` 一直在工作。)

### 模型全家桶(`/models` + 首页)
- 依据 HuggingFace 组织 **AwareLiquid** 的 7 个模型重建:`M1-128M`、`M1-TinyLlama-Adapter`(线上即 M1)、**`M2-2B`(已完成:200K 步,val PPL 2.4106,1.93B,byte-level)**、`O1-48M`、`O1-Qwen05-Adapter`、`O1-Sound`、`Sparse-SNN`。
- `/models`:7 张卡 + 家族对比表 + 三语(en/zh/ar)i18n;下载链接全部指向 HuggingFace。首页:把"M1-2B 训练中"换成"**M2-2B 已完成**",新增 O1-Qwen05-Adapter,主卡下载链接改 HuggingFace。

### 定价统一(定稿)
- 定稿:`试用 ¥0（30 天 × ¥30 点数，绝不自动扣费）/ BYOK 免费 / 订阅 ¥89/月（含 ¥80 点数，Pro ¥199 含 ¥180 点数）/ 微信支付（trust3.pro/purchase）`。
- 把旧的 `7天 / ¥59 / $19` 从 `en/hypercode.html`、`vibe-coding.html`(+en)、`llms-full.txt`、`ar/hypercode.html`、`index.html` JSON-LD 全部统一。
- `/hypercode`(中英)新增 2 条 FAQ(收费 / 支付方式)+ 三语 i18n + FAQPage JSON-LD。

### 修过的 bug
- `index.html` 的 HyperCode `SoftwareApplication` JSON-LD 曾被 JS 字符串替换里的 **`"$19/mo"` 的 `$1`** 当成捕获组引用而写坏——已修复;现 `all JSON-LD valid`。

### GSC 现状(2026-10-03 抓取,报告数据截至 9/21)
- **awareliquid.ai**:已编入索引 10 / 未编入索引 8(404×2、重定向×3、noindex×1、已抓取未编入×2)。sitemap 曾因**旧文件带 UTF-8 BOM** 而"无法抓取"——新版 sitemap 已无 BOM(`3C 3F 78`),可重提交。
- **awareness.market**:已编入索引 204 / 未编入索引 256(404×88、已抓取未编入×72、重复 canonical×14、5xx×3)。已修 88 个 404 的根因(`/:locale/*.md` → `/sdk-docs/*.md` 301,已上线)。
- 已提交/请求索引:awareness `/en`、`/en/pricing`、`/en/developers`;awareliquid sitemap 已提交。

### awareness.market — canonical 修复(已上线)
- 问题:大量营销页 canonical 不带 `/{locale}` 前缀(如 `/pricing`、`/developers`、`/`),但站是 `localePrefix:always`(无前缀会 308)→ Google 判「备用网页」。
- 修复:17 个营销页 canonical 统一为 `/${locale}/...`(`benchmarks`/`agents[slug]`/`deals[id]` 补 `getLocale()`)。部署后实测 `/en/pricing`、`/en/developers` 的 canonical 已带 `/en`。
- 另:`public/{index,developers,pricing}.md` 镜像 + `vs-supermemory.md` + 三语 `ALTERNATIVES.md` 已上线。

### 待办(人工)
1. GSC:`awareliquid.ai` 重提交 sitemap(BOM 已除)+ 对 `/vibe-coding` 等新页请求索引;`awareness.market` 继续观察 404 / 「备用网页」是否下降。
2. Caddy 301:消掉 `.html` 重复页(见第二节;尚未加)。
3. `/about`「not a commercial product」+ `/terms`「Research prototype」与商业销售矛盾——待决策。
4. 站外 GEO(见第三节)。

