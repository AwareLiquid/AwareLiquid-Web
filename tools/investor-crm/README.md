# Investor CRM + outreach skeleton

Safety-first scaffolding for the AwareLiquid cold start (see
[`../../reports/FUNDRAISE-COLD-START-PLAYBOOK.md`](../../reports/FUNDRAISE-COLD-START-PLAYBOOK.md)).

**Rule #1: nothing is ever sent by default.** `draft` only prints. `send` is a
dry run unless you pass `--apply` *and* a provider is configured — and it still
refuses any contact that trips a guardrail.

Standard-library-only Python, so it runs anywhere. The store is CSV/JSONL; it is
designed to be wired to the **Awareness MCP memory layer** later (see below).

## Quick start

```bash
cd tools/investor-crm
cp data/investors.sample.csv data/investors.csv      # your real list (gitignored)
python3 crm.py score                                  # fit-score + eligibility
python3 crm.py list --eligible
python3 crm.py draft 2                                # personalised draft (no send)
python3 crm.py approve 2                              # human gate
python3 crm.py send                                   # dry run
python3 crm.py send --apply                           # sends ONLY if provider set + all guardrails pass
python3 crm.py report
```

## Guardrails (enforced in code)

1. **Fit threshold** — only investors scoring ≥ `fit_threshold` are eligible.
2. **Suppression list** — `data/suppression.txt` is never contacted (add via `crm.py suppress`).
3. **Daily / warm-up cap** — `warmup_cap_day1` (default 10) ramps to `daily_cap`.
4. **Unsubscribe** — every template carries an unsubscribe URL.
5. **First touch** — plain text, no attachments, no link shorteners (see templates).
6. **Human in the loop** — an investor must be `approved` before `send` will touch it.
7. **Halt on complaints** — feed provider bounces/complaints into `data/log.jsonl`;
   `report` flags the halt threshold.

## Schema (`data/investors.csv`)

`id, fund, partner, email, thesis_tags (pipe-separated), stage, check_usd, region, warm_intro, last_touch, status, fit_note, hook`

- `thesis_tags` are matched against our pitch (`OUR_THESIS` in `crm.py`).
- `hook` is the one unique line per investor — their recent bet ↔ one of our
  reproducible results. Never a template.

## Wiring to Awareness (next step)

The skeleton deliberately keeps the store dumb (CSV) so it runs with zero deps.
To get cross-session memory and non-repeating follow-ups, put the Awareness MCP
in front of it:

- `awareness_record` each touch (investor, hook used, reply, next step) so the
  daemon remembers every investor across sessions;
- `awareness_recall` before drafting so a follow-up knows what was already said;
- keep the CSV as the source of truth for the list, Awareness as the memory.

## Do NOT

- buy or scrape lists; contact anyone on suppression; send attachments/short
  links on a first touch; exceed the cap; send from a cold domain; ever let the
  agent sign or commit to terms.
