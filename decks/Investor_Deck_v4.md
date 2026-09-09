---
marp: true
theme: default
class: lead
backgroundColor: #fff
size: 16:9
paginate: true
style: |
  h1 { color: #00468b; }
  h2 { color: #00468b; border-bottom: 2px solid #ed0000; }
---

# AwareLiquid (MT-LNN)

## The first AI built for devices that cannot afford attention

**Constant-memory LLM · Edge-first · Auditable**

*Confidential — for discussion purposes only*

---

## 1. The Problem: AI's memory bill is bankrupting real applications

Every useful AI deployment hits the same wall — **the KV cache**:

| Scenario | Today's cost | Who pays it |
|---|---|---|
| 100 users × 100K-token documents, concurrent | ~60× A100 ≈ **$100K/month** | Document-QA startups |
| Phone assistant with long chat history | KV cache exhausts 8GB RAM → lag, heat, kill | Consumer electronics OEMs |
| Industrial sensor monitoring, 24/7 streaming | Every device needs cloud round-trips | Energy / manufacturing |

**The market has three unmet needs, all blocked by the same wall:**
1. **Long-stream inference on edge devices** (phones, AR, cars, wearables)
2. **Memory that survives context loss** (compliance, cross-session personalization)
3. **Always-on monitoring at near-zero marginal cost**

---

## 2. The Solution: constant memory, not growing memory

**MT-LNN replaces the KV cache with a fixed-size recurrent state.**

- **0.381 MB** constant state — **1,008× smaller than KV cache at 128K context, 8,567× at 1M**
- **Cross-window recall 0.56** where attention and LoRA score **0.000 structurally** — the model remembers bindings after the context window is dropped
- **Bit-exact snapshot/restore** — memory survives across sessions, processes, even devices

**One architecture, three product lines:**

| Product | Serves | Revenue logic |
|---|---|---|
| **O-series (attention-free)** | Edge devices, streaming, always-on | Per-device license / SDK |
| **M-series (hybrid)** | Cloud serving + compliance | API + enterprise support |
| **AwareLiquid stack** | Regulated industries (finance, legal) | Auditability as the moat |

---

## 3. The Market

### TAM: the "long-stream + edge + auditable" wedge of the $1.8T AI market

| Segment | Who buys | Evidence we already have | Willingness to pay |
|---|---|---|---|
| **Edge / embedded AI** | Phone & AR OEMs, IoT vendors | O(1) state flat across 2048× context growth; int8 deploy at 1.9GB fits a 7.2GB VPS | Per-device BOM saving + battery life = hardware-level value |
| **Compliance-sensitive enterprises** | Banks, law firms, healthcare | Every fact's provenance in `evidence_log`; per-token route audit (JSONL) | Regulation forces them; today they CANNOT ship black-box AI |
| **Industrial monitoring** | Energy (battery), manufacturing | NASA battery SoH: RMSE **0.1038** (55K params) beats LSTM 0.1171 (99K); **80% data dropout degrades only +7.7% vs LSTM's +31.1%** | $ saved on cloud round-trips + safety compliance |

### Why the incumbents cannot follow

Transformer's KV cache is **architectural**, not an optimization problem. Quantization, eviction, distillation — all patch it. MT-LNN removes it.

---

## 4. The Product: what exists TODAY

| Asset | Status | Proof |
|---|---|---|
| 125M native model | ✅ Trained, published on HF | 20K steps, 3 seeds, zero NaN |
| Cross-window recall | ✅ 0.56 vs 0.000 | Reproducible benchmark |
| O(1) inference state | ✅ 0.381 MB flat | Measured across 2048× context growth |
| int8 quantization | ✅ +0.0% PPL, −62% memory | 2B → 1.9GB fits 7.2GB VPS |
| Serve stack (RAG + auth + audit) | ✅ Live | API in production |
| 1,372 tests | ✅ All passing | Open-source protocol |

**2B-scale training underway** (35L × d2912, fp32 curriculum) — the scale-up line.

---

## 4.5 Customer Stories: where the constant-memory edge is already paid for

### Case 1 — Gold exploration: data cleaning that survives irregular sensors

**Customer profile:** gold exploration companies; drilling logs, geophysical surveys, and sensor telemetry arrive **jittered, dropped, and noisy** — 20–80% of field data needs manual cleaning before any analysis.

**What we do:** stream-level data cleaning on the liquid core. The same irregular-sampling resilience measured in our battery benchmark applies here: **80% dropout degrades accuracy only +7.7%** (vs LSTM +31.1%, GRU +32.8%) — the model stays useful exactly where conventional models collapse.

**Why they pay:** cleaning is currently 40–60% of a geophysics team's time. A model that ingests raw, irregular field data directly removes a whole human step — and runs on the field laptop, not the cloud (data never leaves the site).

### Case 2 — In-vehicle edge models: wake-word + streaming voice on the MCU

**Customer profile:** automotive tier-1 suppliers needing always-on in-cabin voice; constrained by MCU RAM, thermal budget, and data-privacy requirements (voice stays on-device).

**What we do:** the O1-Sound line — a liquid-core wake-word engine in **1.27 MB int8**, streaming one frame at a time with a **constant 5,120-byte state**, already ported to **plain C (FreeRTOS)** with host-side parity gates.

**Why they pay:** Transformers physically cannot run here (KV cache + RAM). Our O(1) state means the microphone can stay open for the entire drive with zero memory growth — and everything stays on the car, no cloud round-trip, no privacy consent problem.

### Case 3 — Industrial battery monitoring (validated benchmark)

**Customer profile:** energy-storage operators needing per-cell state-of-health tracking across thousands of cells.

**Measured result:** whole-cell held-out RMSE **0.1038** (55K params) beating LSTM's 0.1171 (99K params) — smaller, and **robust to the dropout that real telemetry actually has** (+7.7% vs +31.1% under 80% dropout). CPU-reproducible in 4 minutes.

---

## 5. Business Model

1. **Open weights + enterprise license** (Mistral model): research goodwill + revenue from deployment support
2. **Edge SDK per-device licensing**: O-series runs where Transformers physically cannot
3. **Compliance inference service**: auditable reasoning as a premium — regulated buyers pay for the audit trail, not the tokens

**Unit economics:** one RTX 4090 serves 100 concurrent 100K-token users (~$200/month) vs ~60× A100 (~$100K/month) for Transformer. We pass on 10%, keep 90% margin.

---

## 6. Competition & Moat

| Player | Their edge | Why we win here |
|---|---|---|
| OpenAI / Anthropic / Google | Scale, quality | Cloud-only, black-box, KV-cache cost; cannot ship on-edge or auditable |
| Liquid AI (LFM) | Same liquid inspiration | We benchmark O(1) state + cross-window recall **with public reproducible protocol** — their numbers are not |
| Mamba / SSM startups | Efficient recurrence | No cross-session memory story; no auditability layer |

**The moat is threefold:** ① O(1) state is architectural, not patched; ② cross-window recall is impossible for attention **by construction**; ③ the E0 evidence protocol (≥3 seeds, p<0.05, pre-registered) is a trust asset nobody else offers.

---

## 7. Honesty as Strategy

We retract claims publicly when they fail. That is not a weakness — it is the only way a small team builds **credibility with enterprise compliance buyers**.

- 1,372-test suite, open-source: every number re-runnable
- Negative results published alongside positives
- All benchmark claims gated by E0 protocol

---

## 8. Roadmap & Ask

| Phase | Scope | Compute | Outcome |
|---|---|---|---|
| Now | 2B training (fp32 curriculum) | 1× A100 ongoing | Scale-up checkpoint + efficiency curve |
| 3-6m | 2B release + O-series productization | 4× A100 (~$1.5K) | Edge SDK beta + first 3 design partners |
| 6-18m | 7B + compliance stack GA | 16× H100 (~$50K) | Revenue: license + API + audit service |

**Seeking:** $— pre-seed to complete the 2B scale-up, publish the efficiency curve, and land 3 design partners.

---

## Appendix: What we retracted (and why it makes us trustworthy)

- Adapter PPL claims (−28.5% etc.) — retracted after re-arm fix; LoRA attribution confirmed
- Hybrid O(1) claim — measured null, narrowed to O-series only
- Consciousness/Φ metrics — demoted to research scaffolding

*Full record: RESULTS.md. Policy: every headline number re-runnable by any third party.*
