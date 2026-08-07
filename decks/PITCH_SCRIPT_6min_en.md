# AwareLiquid Investor Pitch Script (5-7 min, EN)

> **Deck**: `decks/investor_deck_mt_lnn_25.pdf` (EN, 25 frames)
> **Length**: ~6 min (~1,100 words at 180 wpm)
> **Pacing**: 15-25 s per frame; bold = pause/emphasis; [next] marks the page turn.

---

## Open (frames 1-2, 40 s)

Hi, I'm Everest, founder of AwareLiquid. In six minutes I want to make one point: **the LLM memory wall is the next infrastructure opportunity, and we are built to cross it from the architecture up.**

[next] Three pains everyone feels. **Hallucination** — models assert nonsense confidently because they have no model of physical reality. **Cost** — the KV cache explodes with context: 100 users on 100K-token documents need ~60 A100s, about $100K a month. **Size** — models too big for phones, cars, industrial edge.

All three share one root cause: the Transformer KV cache.

## Problem (frames 4-5, 40 s)

[next] A Transformer is a compulsive recorder — every historical token pinned in VRAM. Memory grows linear, compute grows quadratic. 100K words fill an A100 instantly. This is not an engineering issue; it's a **physical memory hard wall**.

[next] Here's the cost contrast: Transformer cache balloons with length; our approach — a flat line.

## Solution & Architecture (frames 6-7, 50 s)

[next] Our answer: **MT-LNN**, a microtubule-inspired liquid neural network. The core idea comes from the brain: **the brain never stores every pixel — it extracts working memory, selectively forgets noise.** We replace the KV cache with 13 parallel continuous-time liquid pathways and an O(1) working-memory state.

[next] This is the architecture — not a Transformer patch, a ground-up continuous-time design. It embeds a global-workspace bottleneck, predictive coding, and a cross-window memory state.

## Two Product Lines (frames 8-10, 60 s)

[next] Two products. **M1 — cognitive slow thinking**: mounts on any open-weight base at ~1% parameter overhead. Its edge is **cross-window, cross-session associative recall**: 0.56 recall where attention scores 0.000 by construction — it physically cannot do it. This is the **regulated B2B story**: finance, legal, government.

[next] **O1 — edge fast thinking**: attention-free, trained from scratch, 48M–125M, genuine O(1) inference memory. At 1M tokens our carried state is flat at 0.381 MB; the matched KV cache is 3 GB — an **8,063× gap**. It runs on wearables, automotive, industrial sensors — millisecond latency on MCU-grade hardware.

## Evidence (frames 11-13, 70 s)

[next] You want evidence. This is the **official same-size benchmark** — 200K params, fair decode: whole-sequence recall under noise, we lead at every length, ×2.0 at T=229.

[next] This is the honest 125M convergence result: we beat the simple baseline, but a **modern Transformer leads us by 11% on raw perplexity**. I show it because our edge is never "smoother next-token prediction" — it's **structural memory and cost** that no Transformer config removes.

[next] Three shipped-validated use cases: NASA battery — degrades only 7.7% with 80% data missing, LSTM degrades 31%; wearable wake-word — 5 KB always-on state; financial document QA — 91.7% accuracy, fully on-prem, 179 tests green.

## Positioning & Competition (frames 17-18, 40 s)

[next] We don't compete where giants compete. They do general intelligence; we do **long-context + edge cost**. This cost-capability chart says it plainly: on the same task our per-task cost is two-to-three orders of magnitude below cloud APIs, with equal-or-better long-context capability. We are not fighting the MMLU war — that's the AGI giants' arena. We fight the **analyst, lawyer, and factory-floor** war.

## Business & The Ask (frames 19-23, 60 s)

[next] Dual revenue: B2B on-prem licensing (regulated industries) + a high-efficiency cloud API (90% cheaper, can undercut).

[next] Roadmap: validated at 1.5B adapter today → **native 2B reasoning engine** in 6–12 months (liquid core + sparse attention) → larger scale at 18 months. 7B is gated on a measured scaling curve, not assumed.

[next] Team: I've done distributed databases and venture investing; our CTO architected the NEMO protocol; plus a PolyU PhD team, advisors including a Stable Diffusion architect. Fully self-built, fully open-source, 1,083 tests permanently green.

[next] **We're raising $3.5M**: 50% compute & pretraining (the 2B engine), 30% core research (continuous-time dynamics — the deepest moat), 20% GTM. 12-month milestones: 10+ enterprise PoCs, 3–5 paid design partners, a production 2B checkpoint + public scaling curve.

## Close (frames 24-25, 30 s)

[next] The moat isn't tuning — it's the **architecture itself**: continuous-time ODE + global workspace + liquid memory, paper under submission, recipes and ablations open and reproducible. A follower needs months just to reproduce our corpus of experience.

[next] One last thought: the Transformer compute arms race is hitting a physical wall, with diminishing returns. We're betting on the **second route** — liquid computing. Welcome to be among the first to see it. Thank you.

---

## Delivery Notes

| Item | Advice |
|---|---|
| **Open with a number** | "$100K/month for 100 users" lands harder than "we are a company that..." |
| **Honesty is a weapon** | Frame 12 admits the 11% PPL gap voluntarily — investors distrust "wins everything" decks |
| **Evidence-first** | One number per frame (0.56, 8,063×, ×2.0, 91.7%, 7.7%) |
| **Q&A prep** | ① "Why not Mamba/RWKV?" — no cross-session persistent memory, long-context decay; ② "O1's PPL?" — edge-specialist, not a general LM; ③ "Monetization?" — B2B on-prem first, API second |
| **Pacing** | ~180 wpm; 15–25 s per frame; slow down and repeat key numbers |
| **CTA** | Invite: PoC collaboration / follow-up / live demo at awareliquid.ai |
