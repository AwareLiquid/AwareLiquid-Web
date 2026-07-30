# AwareLiquid-Web

AwareLiquid / MT-LNN 的**非模型资产仓库**（内部私有）：投资人 deck、论文成品、营销材料、字体与构建工具。从主仓库 [everest-an/M1](https://github.com/everest-an/M1) 于 2026-07-31 迁出，目的是让 M1 只保留模型代码与研究文档。

> ⚠️ **官网源码不在本仓库。** 线上站点 awareliquid.ai 由 M1 仓库的 `serve/server.py` + `serve/static/` 提供（生产服务器 bind-mount `~/M1/serve/static` 并通过 `git pull` M1 部署，见 `M1/deploy/docker-compose.prod.yml`）。若未来要把网站源码迁到本仓库，需同步修改生产服务器上的 compose 挂载路径——属于一次部署变更，须单独执行。

## 目录结构

| 目录 | 内容 | 原 M1 路径 |
|---|---|---|
| `decks/` | 投资人 deck（HTML/PDF/PPTX/LaTeX 源码 + 构建脚本 + arXiv 论文 tex/pdf 副本）| `assets/decks/`、根目录 `AwareLiquid Investor Deck Light.md` |
| `papers/` | 论文成品：MT-LNN docx、v2 预训练论文 PDF（中英）、中文 tex 源 | 根目录 |
| `blog/` | 技术博客与成本分析文章（`TECH_BLOG.md`、`CSDN_BLOG_COST_ANALYSIS.md`）| 根目录 |
| `figures/` | 营销/论文图（`fig_microtubules`、`fig_awareness_network`），可由 M1 `scripts/plots/` 重新生成 | 根目录 |
| `fonts/` | Noto Sans SC 字体（LaTeX 中文编译用；deck 的 Manrope 在 `decks/` 内）| 根目录 |
| `tools/` | LaTeX 工具链：`tectonic_bin/tectonic.exe`（Windows 本地编译）、`tectonic.zip`、`pdfminer.zip`、deck 批量编辑脚本 `deck-scripts/` | 根目录、`scripts/deck/` |
| `archive/latex-scratch/` | 历史 LaTeX 调试产物（test_font / test_zh / hello 等），仅存档 | 根目录 |

## 常用操作

- **编译 deck / 论文（Windows）**：`tools/tectonic_bin/tectonic.exe decks/investor_deck_mt_lnn.tex`（中文文档需要 `fonts/` 下的 NotoSC 字体已安装）
- **重新生成 figures**：在 M1 仓库运行 `python scripts/plots/plot_microtubules.py` 等（输出到运行目录）
- **Deck 内容修改**：`tools/deck-scripts/` 是历史一次性编辑脚本，仅供参考；直接改 `decks/*.tex` 后重编译即可
