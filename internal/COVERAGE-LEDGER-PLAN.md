# JevBench 覆盖台账 + Agent 实验队列 — 最小方案（v0）

> 目标：**compute-light、不训练任何权重**。先把"错在哪些任务族 / 标签约定上"量化出来，再把补充动作排队，停止用"加步数 / 换核"救准确率。
>
> 依据：research v2.5 三组追试（warm-start 20k 步官方 36.7%→33.3%；换 SFT 核 35.0%；换真实语料 28.5%、tool-selection/routing 0/12）→ **卡点 = task-family / label-convention coverage**。

---

## 1. 范围 / 非目标

- **做**：逐题结果 → 家族台账 → 错误 Pareto → 实验队列（全部不训练）
- **不做**：训练、改模型、自建新 benchmark、重跑 JevBench 官方 harness

## 2. 输入（数据契约）

JevBench 逐题结果，**JSONL**，每行一条：

```json
{
  "id": "easy-0042",
  "tier": "easy",                      // easy | original
  "task_family": "routing",            // 若缺，用 family_map.json 或 --derive-family 规则
  "label_set": ["A", "B", "C", "D"],   // 该题合法选项全集
  "gold": "B",
  "pred": "B",                         // 解析后的最终选择；"ABSTAIN" 表示弃答
  "schema_valid": true,
  "latency_ms": 168
}
```

- `task_family` 缺失时：优先 `--family-map <file>`（`{id|tier -> family}`），否则 `UNMAPPED`（**必须显式暴露，不许静默归类**）。
- 若官方 harness 的字段名不同，只改 `audit.mjs` 顶部 `FIELD_MAP` 一处。

## 3. 台账 schema（`coverage_ledger.json`）

按 `(family, tier)` 聚合，每条：

| 字段 | 定义 |
|---|---|
| `family` / `tier` | 任务族 / 难度层 |
| `n` | support（该组题数） |
| `correct` / `accuracy` | 正确数 / 准确率 |
| `abstain` | 弃答数 |
| `schema_invalid` | schema 不合规数 |
| `label_sets` | 该组出现过的合法选项集（去重） |
| `off_taxonomy` | `pred ∉ label_set` 的条数（**标签约定错配**） |
| `error_share` | 该组错误数 / 总错误数 |
| `status` | `OK` / `GAP` / `UNMAPPED` |

## 4. 指标与 GAP 判定

- `accuracy = correct / n`
- `off_taxonomy_rate = off_taxonomy / n`
- `error_share = (n - correct) / total_errors`
- **GAP 条件（任一）**：`n < MIN_SUPPORT(默认 8)` · `accuracy < MIN_ACC(默认 0.5)` · `off_taxonomy_rate > 0.1` · `schema_invalid > 0`
- **UNMAPPED**：`family` 缺失
- **覆盖债**：按 `error_share` 从大到小累计，达到 80% 错误所需的最小家族集合 = 优先处理的家族

## 5. 审计算法（5 步，全部 CPU/秒级）

1. 读入 JSONL，校验必填字段（`tier/label_set/gold/pred`）
2. 归组 `(family, tier)`，算第 4 节指标
3. 打 `status`（OK/GAP/UNMAPPED）
4. 计算错误 Pareto → `coverage_debt_families`
5. 输出台账 + 报告 + 实验队列

## 6. 实验队列 schema（`experiment_queue.json`）

```json
{
  "id": "EXP-001",
  "priority": 1,
  "family": "routing",
  "gap_reason": "accuracy 0.00 (<0.50); off_taxonomy 0/12",
  "hypothesis": "该族标签约定未被训练分布覆盖（0/12 命中）",
  "action": "补充 N 条 routing 样本，覆盖 label_set 约定；先 eval-only 复测",
  "compute": "none",
  "expected_signal": "routing accuracy > 0.30 或 off_taxonomy=0",
  "status": "todo"
}
```

**排序**：`error_share` 降序 → `n` 升序（错得多、样本少的先做）。
**Phase 0 硬约束**：`compute` 只能是 `none` / `eval-only`；任何 `train` 动作必须等本轮覆盖审计出结论后再评估。每个 GAP 至少 1 条 action。

## 7. 最小落地

```
internal/coverage/audit.mjs      # 审计脚手架（Node ESM，零依赖）
internal/COVERAGE-LEDGER-PLAN.md # 本文件
```

命令：

```bash
# 1) 自检（合成数据，验证指标逻辑，不需要真实数据）
node internal/coverage/audit.mjs --self-test

# 2) 真实数据
node internal/coverage/audit.mjs --items <jevbench_items.jsonl> --out internal/coverage/out
# 可选：--min-support 8 --min-acc 0.5 --family-map <family_map.json>
```

产物：`coverage_ledger.json`、`COVERAGE_REPORT.md`、`experiment_queue.json`。

## 8. 验收（DoD）

- [x] 100% 题目被映射或显式标 `UNMAPPED`
- [x] 报告给出 **top-3 错误家族** + 各自 `gap_reason`
- [x] 队列每条都有 `compute` 标注，Phase 0 无 `train`
- [x] 重跑幂等（同输入同输出）

> 2026-10-26 验收：`--self-test`（3 组 / 2 gap / debt = routing → tool-selection）通过；`--family-map` + UNMAPPED 用例通过（未映射项显式标 `UNMAPPED`）；两次运行三份产物 SHA-256 完全一致；缺 `label_set` 的条目按 §5.1 报错并指出 item id。

## 9. 一周执行（不占 GPU）

| Day | 动作 |
|---|---|
| 1 | 从 JevBench 仓库取逐题 JSON，确认字段；补 `family_map.json` |
| 2 | 跑 `audit.mjs`，出台账 + 报告 |
| 3 | 对 top 家族做 label-convention 深挖（错配 vs 真不会） |
| 4 | 设计补充样本（只补覆盖，不扩规模） |
| 5 | 生成/评审实验队列，冻结 Phase 0 动作 |

## 10. 风险与纪律

- **家族标注缺失**：先启发式（关键词/任务文本）→ 人工校对小样本；`UNMAPPED` 必须可见。
- **每组 n 太小**：`MIN_SUPPORT` 可调，但要在报告里注明置信度。
- **自建评测偏差**：台账是**回归基线**，不是排行榜；对外不报分数。
- **不要用本台账替代官方 harness**：它只用于内部定位与排队。
