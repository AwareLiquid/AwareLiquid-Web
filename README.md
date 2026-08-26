# AwareLiquid-Web

AwareLiquid / MT-LNN 的**非模型资产仓库**（内部私有）：投资人 deck、论文成品、营销材料、字体与构建工具。从主仓库 [everest-an/M1](https://github.com/everest-an/M1) 于 2026-07-31 迁出，目的是让 M1 只保留模型代码与研究文档。

> ✅ **官网源码就在本仓库的 `web/`。** 改这里的 HTML 就是改 awareliquid.ai。
>
> 2026-08-26 核实（此前本段写的是「官网源码不在本仓库」，已不成立，并且误导过一次改动）：把线上 9 个页面全部抓下来与 `web/` 逐字节比对，换行规范化后**全部相同**，且字节差精确等于各文件的 CRLF 行数（例如 `hypercode.html` 差 356 字节 = 356 个 CRLF）。唯一的变换是部署时 CRLF → LF。`sitemap.xml`、`robots.txt`、`llms.txt` 同理。
>
> **部署**：push 到 `main` 之后改动会自己上线，实测一小时内生效。具体触发机制（webhook / 定时 `git pull` / 人工）未查证，本仓库里也没有部署脚本；线上由 Caddy 提供（响应头 `Via: 1.1 Caddy`）。**push 之后请实际抓一次线上页面确认，不要假定即时生效** —— 曾因等了 15 分钟没变化就误判成「不会自动部署」。
>
> M1 仓库的 `serve/server.py` 提供的是模型 demo 的 API（`/v1/completions` 等）；它的 `serve/static/` 在 git 里只有 `charts`，不含站点页面。

## 目录结构

| 目录 | 内容 | 原 M1 路径 |
|---|---|---|
| `web/` | **线上官网 awareliquid.ai 的源码**：`index.html`、`hypercode.html`（产品下载页）、`api`/`models`/`demo`/`about`/`research`/`privacy`/`terms`、`sitemap.xml`、`robots.txt`、`llms.txt` | 新建 |
| `decks/` | 投资人 deck（HTML/PDF/PPTX/LaTeX 源码 + 构建脚本 + arXiv 论文 tex/pdf 副本）| `assets/decks/`、根目录 `AwareLiquid Investor Deck Light.md` |
| `papers/` | 论文成品：MT-LNN docx、v2 预训练论文 PDF（中英）、中文 tex 源 | 根目录 |
| `blog/` | 技术博客与成本分析文章（`TECH_BLOG.md`、`CSDN_BLOG_COST_ANALYSIS.md`）| 根目录 |
| `figures/` | 营销/论文图（`fig_microtubules`、`fig_awareness_network`），可由 M1 `scripts/plots/` 重新生成 | 根目录 |
| `fonts/` | Noto Sans SC 字体（LaTeX 中文编译用；deck 的 Manrope 在 `decks/` 内）| 根目录 |
| `tools/` | LaTeX 工具链：`tectonic_bin/tectonic.exe`（Windows 本地编译）、`tectonic.zip`、`pdfminer.zip`、deck 批量编辑脚本 `deck-scripts/` | 根目录、`scripts/deck/` |
| `archive/latex-scratch/` | 历史 LaTeX 调试产物（test_font / test_zh / hello 等），仅存档 | 根目录 |
| `reports/` | 跨仓库开发进展报告（[DEV_PROGRESS_2026-08.md](reports/DEV_PROGRESS_2026-08.md)：M1 / M2 文档 QA 适配器 / O1 / O1-Anti 四条线现状、架构问题、短中长期行动清单） | 新建 |
| `internal/` | 不对外的工作文档（[说明](internal/README.md)）：论文短板与未完成实验清单等，从公开仓库迁出 | `M1/docs/reviews/` |

## 常用操作

- **编译 deck / 论文（Windows）**：`tools/tectonic_bin/tectonic.exe decks/investor_deck_mt_lnn.tex`（中文文档需要 `fonts/` 下的 NotoSC 字体已安装）
- **重新生成 figures**：在 M1 仓库运行 `python scripts/plots/plot_microtubules.py` 等（输出到运行目录）
- **Deck 内容修改**：`tools/deck-scripts/` 是历史一次性编辑脚本，仅供参考；直接改 `decks/*.tex` 后重编译即可
