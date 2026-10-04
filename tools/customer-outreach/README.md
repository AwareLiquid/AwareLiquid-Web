# customer-outreach — find and (safely) reach developers who fit HyperCode

Sibling of `../investor-crm/`, same safety model:
**nothing is ever sent by default**; `send` is a dry run until a provider is
configured AND every guardrail passes AND a human approved the row.

## 1. Pull candidate leads (public GitHub data, no emails harvested)

```bash
node sources/github_leads.mjs data/leads.csv
```

Pulls repos/owners in the niche (`vibe-coding`, `ai-coding-agent`, `ai-agent`,
"AI coding assistant", `autonomous-agents`) with topics, stars, homepage.
Only public data; emails are left blank on purpose — fill them from the repo
or owner page when you decide a lead is worth a real, relevant message.

## 2. Score, draft, approve, send (dry by default)

```bash
python3 outreach.py score
python3 outreach.py list --eligible
python3 outreach.py draft 1
python3 outreach.py approve 1
python3 outreach.py send            # dry run
python3 outreach.py send --apply    # sends only if provider + guardrails allow
```

## Guardrails (same 7 as the investor tool)

fit threshold · suppression list · daily/warm-up cap · unsubscribe in every
template · first touch plain text, no attachments/links-shorteners · human
approval gate · halt on complaint/bounce threshold.

## Do NOT

buy or scrape lists; email anyone whose address wasn't published or who you
can't give a genuine reason for contacting; mass-send; send attachments on a
first touch.

## Wire it to HyperCode / Awareness

- `config.json`: set `awareness_endpoint` so `draft` recalls prior context and
  `send` records each touch (verified working against the local Awareness daemon).
- To make drafting agentic, let HyperCode propose the `hook` per lead and keep
  the send path here — the agent proposes, the human approves.
