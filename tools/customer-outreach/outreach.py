#!/usr/bin/env python3
"""Customer outreach skeleton for HyperCode — same safety model as investor-crm.

NOTHING IS SENT BY DEFAULT. `draft` prints; `send` is a dry run unless a
provider is configured AND every guardrail passes AND the row was approved.

Commands: score | list [--eligible] | draft <id> | approve <id> |
          suppress <val> | send [--apply] | report
"""
import argparse, csv, json, os, sys, datetime

try:
    import adapters
except Exception:
    adapters = None

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
LEADS = os.path.join(DATA, "leads.csv")
SUP = os.path.join(DATA, "suppression.txt")
LOG = os.path.join(DATA, "log.jsonl")
TPL = os.path.join(ROOT, "templates")
CONFIG = os.path.join(ROOT, "config.json")

DEFAULTS = {
    "daily_cap": 25, "warmup_cap_day1": 10, "fit_threshold": 55,
    "unsubscribe_url": "https://awareliquid.ai/raise#unsubscribe",
    "sender": "anmuning@awareliquid.ai", "complaint_halt_pct": 0.1,
    "fit_weights": {"stack_overlap_per_tag": 15, "stack_overlap_max_tags": 4,
                     "stars_reach": 15, "source_github": 5},
}
# who HyperCode is for — leads scoring matches their stack topics against this
ICP = ["ai-coding", "vibe-coding", "vibe coding", "ai-agent", "ai-agents", "agents",
       "agentic", "coding-agent", "claude-code", "claude-skills", "mcp", "llm",
       "devtools", "developer-tools", "autonomous", "copilot", "codex"]
TODAY = datetime.date.today().isoformat()


def load_config():
    cfg = dict(DEFAULTS)
    if os.path.exists(CONFIG):
        cfg.update(json.load(open(CONFIG, encoding="utf-8")))
    cfg.setdefault("fit_weights", DEFAULTS["fit_weights"])
    return cfg


def load_leads():
    if not os.path.exists(LEADS):
        sys.exit(f"missing {LEADS} — run: node sources/github_leads.mjs data/leads.csv")
    with open(LEADS, newline="", encoding="utf-8") as f:
        rows = [l for l in f if l.strip() and not l.lstrip().startswith("#")]
    return list(csv.DictReader(rows))


def save_leads(rows):
    with open(LEADS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader(); w.writerows(rows)


def load_suppression():
    if not os.path.exists(SUP):
        return set()
    return {l.strip().lower() for l in open(SUP, encoding="utf-8") if l.strip() and not l.startswith("#")}


def append_log(rec):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def read_log():
    return [json.loads(l) for l in open(LOG, encoding="utf-8") if l.strip()] if os.path.exists(LOG) else []


def sent_today():
    return sum(1 for r in read_log() if r.get("ts", "").startswith(TODAY) and r.get("action") == "sent")


def fit_score(lead, cfg):
    w = cfg["fit_weights"]
    import re as _re
    norm = _re.sub(r"[\s\-_]+", "", (lead.get("stack") or "").lower())
    overlap = sum(1 for t in ICP if _re.sub(r"[\s\-_]+", "", t) in norm)
    s = min(overlap, w.get("stack_overlap_max_tags", 4)) * w.get("stack_overlap_per_tag", 15)
    try:
        if int(lead.get("stars") or 0) >= 1000:
            s += w.get("stars_reach", 15)
    except ValueError:
        pass
    if (lead.get("source") or "") == "github":
        s += w.get("source_github", 5)
    return min(s, 100)


def render(lead, cfg):
    t = open(os.path.join(TPL, "customer_first_touch.txt"), encoding="utf-8").read()
    stack = (lead.get("stack") or "").replace("|", ", ")
    return (t.replace("{{contact_or_org}}", lead.get("contact") or lead.get("org") or "there")
             .replace("{{org}}", lead.get("org") or "")
             .replace("{{stack_short}}", stack[:60] or "AI coding")
             .replace("{{hook}}", lead.get("hook") or "thought it might overlap with what you're building")
             .replace("{{unsubscribe_url}}", cfg["unsubscribe_url"]))


def cmd_score(args):
    cfg = load_config(); rows = load_leads()
    for r in rows:
        sc = fit_score(r, cfg)
        r["fit_score"] = str(sc)
        r["eligible"] = "yes" if sc >= cfg["fit_threshold"] else "no"
    save_leads(rows)
    print(f"scored {len(rows)} leads; {sum(1 for r in rows if r['eligible']=='yes')} eligible (>= {cfg['fit_threshold']})")


def cmd_list(args):
    for r in load_leads():
        if args.eligible and r.get("eligible") != "yes":
            continue
        print(f"{r.get('id',''):>4}  {r.get('fit_score','?'):>3}  {r.get('eligible','?'):>3}  {(r.get('org') or '')[:26]:<26} {r.get('stars',''):>7}  {r.get('status','')}")


def cmd_draft(args):
    inv = next((r for r in load_leads() if r.get("id") == args.id), None)
    if not inv:
        sys.exit(f"no lead id {args.id}")
    cfg = load_config(); body = render(inv, cfg)
    if adapters:
        ctx = adapters.recall(cfg, f"lead {inv.get('org')} {inv.get('source_url')}")
        if ctx:
            body = "Prior context from memory:\n" + ctx[:400] + "\n\n" + body
    print(body)
    if inv.get("eligible") != "yes":
        print(f"\nWARN: fit {inv.get('fit_score')} below threshold — do NOT send", file=sys.stderr)


def cmd_approve(args):
    rows = load_leads()
    for r in rows:
        if r.get("id") == args.id:
            r["status"] = "approved"; save_leads(rows); print(f"approved {args.id}"); return
    sys.exit("not found")


def cmd_suppress(args):
    with open(SUP, "a", encoding="utf-8") as f:
        f.write(args.value.strip().lower() + "\n")
    print("suppressed:", args.value)


def cmd_send(args):
    cfg = load_config(); rows = load_leads(); sup = load_suppression()
    cap = cfg["warmup_cap_day1"]; already = sent_today()
    targets = [r for r in rows if r.get("eligible") == "yes" and r.get("status") == "approved"]
    print(f"eligible+approved: {len(targets)} | sent today: {already}/{cap}")
    if not args.apply:
        print("DRY RUN (no --apply). Nothing will be sent.")
    sent = 0
    for r in targets:
        email = (r.get("email") or "").lower()
        blocks = []
        if email in sup: blocks.append("suppressed")
        if "@" not in email: blocks.append("no email on file (fill it first)")
        if already + sent >= cap: blocks.append(f"cap {cap} reached")
        if blocks:
            print(f"  SKIP {r.get('id')} {r.get('org')}: {'; '.join(blocks)}"); continue
        body = render(r, cfg); subject = body.splitlines()[0].replace("Subject:", "").strip() or "HyperCode"
        if args.apply and adapters and adapters.configured(cfg):
            ok, info = adapters.send_email(cfg, email, subject, body)
            if ok:
                append_log({"ts": datetime.datetime.now().isoformat(), "action": "sent", "id": r.get("id"), "email": email})
                adapters.remember(cfg, f"Emailed {r.get('org')} about HyperCode", {"lead_id": r.get("id")})
                print(f"  SENT {r.get('id')} {r.get('org')}"); sent += 1
            else:
                print(f"  FAIL {r.get('id')}: {info}")
        else:
            print(f"  WOULD SEND {r.get('id')} {r.get('org')} <{email}>  [{subject}]"); sent += 1
    if args.apply and not (adapters and adapters.configured(cfg)):
        print("NOTE: --apply given but no provider configured; nothing sent (by design).")


def cmd_report(args):
    log = read_log(); sent = [r for r in log if r.get("action") == "sent"]
    print(f"total sent: {len(sent)} | today: {sent_today()}")


def main():
    ap = argparse.ArgumentParser(description="Customer outreach skeleton (safety-first)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("score").set_defaults(func=cmd_score)
    p = sub.add_parser("list"); p.add_argument("--eligible", action="store_true"); p.set_defaults(func=cmd_list)
    p = sub.add_parser("draft"); p.add_argument("id"); p.set_defaults(func=cmd_draft)
    p = sub.add_parser("approve"); p.add_argument("id"); p.set_defaults(func=cmd_approve)
    p = sub.add_parser("suppress"); p.add_argument("value"); p.set_defaults(func=cmd_suppress)
    p = sub.add_parser("send"); p.add_argument("--apply", action="store_true"); p.set_defaults(func=cmd_send)
    sub.add_parser("report").set_defaults(func=cmd_report)
    args = ap.parse_args(); args.func(args)


if __name__ == "__main__":
    main()
