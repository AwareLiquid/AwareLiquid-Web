# X (Twitter) 发布草案 — JevBench 官方评测（2026-10-07 终版）

> 本机凭据无 X 账号 → 草案备好，由持有账号者发布。
> 配图建议：research.html §6 JevBench 表截图。

## EN（主推）

Official-harness benchmark: four AwareLiquid configurations through JevBench
(Benchmark Heaven's decision-model benchmark), native distributions, their
scorer.

Best so far — 2B frozen core + trained decision head:
• 39.6% raw on the public easy tier
• ECE 0.20 (best-calibrated of our runs)
• p50 0.168 s (4× faster than our SFT path)

The O1-Flash decision head: 16–21 ms p50 — the Speed axis at its ceiling,
~8× faster than the board's leaders.

We also published three honest negatives from the same harness (a longer
run overfits our distribution; the SFT core doesn't transfer better; a
real-data corpus swap loses family coverage). The binding constraint is
task-family coverage, not step count or the real-vs-synthetic axis.

Pipeline + per-item evidence, open:
github.com/AwareLiquid/O1-Flash · awareliquid.ai/research#benchmarks

## ZH

官方基准实测——四个配置跑 JevBench 官方 harness（原生概率分布 + 官方评分器）：

最佳组合（2B 冻结核 + 决策头）：easy 层 raw 39.6%、ECE 0.20、p50 0.168 秒。
O1-Flash 决策头：16-21 毫秒，Speed 轴触顶。
同 harness 下三个诚实负结果也已公开（长效过拟合、换核不赚、换真实语料丢覆盖）——
绑定约束是任务族覆盖而非步数。

管线与逐题证据开源：github.com/AwareLiquid/O1-Flash

## 发布检查
- [ ] 链接到位（GitHub README ✓ / 官网 §6+changelog v2.5 ✓——需 Vultr 部署）
- [ ] 配图（可选）
