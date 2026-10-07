# X (Twitter) 发布草案 — JevBench 官方评测（2026-10-07 更新）

> 本机凭据无 X 账号（accounts.md 仅 TAAFT）→ 草案备好，由持有账号者发布。
> 建议配图：research.html §6 JevBench 表截图，或官网 /research#benchmarks 链接。

## EN（主推）

Official-harness benchmark: we ran four AwareLiquid configurations through
JevBench (Benchmark Heaven's decision-model benchmark), serving our own
probability distribution natively — their scorer, their schema, their clock.

Best combination so far — 2B frozen core + trained decision head:
• **39.6% raw** on the public easy tier
• **ECE 0.20** — the best-calibrated of our runs
• **p50 0.168 s** — 4× faster than our SFT path

The O1-Flash decision head hits **16–21 ms p50 — the Speed axis at its
ceiling**, ~8× faster than the board's leaders. Accuracy is still the open
problem, and we publish it exactly as measured.

Pipeline + per-item raw responses, open:
github.com/AwareLiquid/O1-Flash · awareliquid.ai/research#benchmarks

## ZH

官方基准实测——四个配置跑 JevBench 官方 harness（原生概率分布 + 官方评分器）：

最佳组合（2B 冻结核 + 决策头）：
• 公开 easy 层 raw **39.6%**
• **ECE 0.20**（校准最优）
• **p50 0.168 秒**（比 SFT 路径快 4 倍）

O1-Flash 决策头：**p50 16-21 毫秒，Speed 轴触顶**，比榜首快约 8 倍。
准确率仍是待解问题，如实披露。

管线与逐题原始响应开源：github.com/AwareLiquid/O1-Flash

## 发布检查
- [ ] 链接到位（GitHub README 有 JevBench 段落 ✓ / 官网 v2.4 changelog + §6 ✓——需 Vultr 部署）
- [ ] 配图（可选）
