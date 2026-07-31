# internal/ — 不对外的工作文档

这里放**不能出现在公开仓库**的内部材料：论文短板清单、未完成实验、竞争性判断等。
公开仓库（`everest-an/M1`、`everest-an/O1`、`everest-an/O1-Anti`、`AwareLiquid/AwareLiquid-M2`）里不应再出现同类内容。

| 文件 | 内容 | 迁入原因 |
|---|---|---|
| [PUBLICATION_READINESS.md](PUBLICATION_READINESS.md) | Track A 论文投稿准备清单：逐条列出当前论文的弱点、desk-reject 风险项、未补齐的强基线与实验（P0/P1/P2） | 文件自述"内部文档，勿推公开仓库——公开等于向审稿人/竞品自曝短板"，但实际一直被 M1 的 git 跟踪且公开可见。2026-08-01 从 `M1/docs/reviews/` 迁出 |

## 注意

- **迁出不等于抹除**：这些文件在 M1 的 git 历史里仍可检索到。若某份文档的内容属于必须彻底移除的级别，需要单独做历史重写（`git filter-repo`）并强推，那是另一件事，且会影响所有已 clone 的副本。
- **M1 的 `HANDOFF.md` 仍在公开仓库**，同样包含未完成项与风险清单。目前判断它更偏工作交接、公开可接受，但每次提交前值得扫一眼。
