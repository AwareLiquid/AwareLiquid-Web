# X (Twitter) 发布草案 — JevBench 官方评测（2026-10）

> 本机凭据无 X 账号（accounts.md 仅 TAAFT）→ 草案备好，由持有账号者发布。
> 建议配图：research.html §6 的 JevBench 表截图，或官网 /research#benchmarks 链接。

## EN（主推）

Official-harness benchmark #1 — we ran three AwareLiquid models through
JevBench (Benchmark Heaven's decision-model benchmark), serving our own
probability distribution natively. Their scorer, their schema, their clock:

• O1-Flash decision head (4.5M params): **16–21 ms p50 — the Speed axis at
  its ceiling**, ~8× faster than the board's leaders (0.15–0.25 s)
• M2-2B SFT: raw 35.8% on the public tiers
• Accuracy is the open problem — published exactly as measured.

Pipeline + per-item raw responses, open:
github.com/AwareLiquid/O1-Flash · awareliquid.ai/research#benchmarks

## ZH

官方基准首测——三个模型跑 JevBench 官方 harness（原生概率分布 + 官方评分器）：

• O1-Flash 决策头（4.5M）：**p50 16–21 毫秒，Speed 轴触顶**，比榜首快约 8 倍
• M2-2B SFT：公开层 raw 35.8%
• 准确率是待解问题，如实披露

管线与逐题原始响应开源：github.com/AwareLiquid/O1-Flash

## 发布检查
- [ ] 链接到位（GitHub README 有 JevBench 段落 ✓ / 官网 v2.4 changelog + §6 ✓——需 Vultr 部署）
- [ ] 配图（可选）
- [ ] 关联标签：#LLM #benchmark 可选
