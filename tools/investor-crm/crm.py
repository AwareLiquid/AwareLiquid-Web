#!/usr/bin/env python3
"""Investor CRM + outreach skeleton for the AwareLiquid cold start.

Design rule #1: NOTHING IS EVER SENT BY DEFAULT.
`draft` only prints. `send` refuses unless every guardrail passes AND you pass
`--apply` AND a real provider is configured. Until then it is a dry run.

Standard library only. The store is CSV/JSONL so it runs anywhere with no
deps; wire it to the Awareness MCP memory layer later (see README) so investor
context and follow-ups persist across sessions and never repeat.

Commands:
  score                 compute fit scores, mark eligible (>= threshold)
  list [--eligible]     show investors
  draft <id>            print a personalised first-touch draft (no send)
  approve <id>          human approves a draft (required before send)
  suppress <email|fund> add to the never-contact list
  send [--apply]        dry-run by default; sends only if guardrails all pass
  report                funnel + deliverability summary
"""
import argparse, csv, json, os, sys, datetime, re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
INV = os.path.join(DATA, "investors.csv")
SUP = os.path.join(DATA, "suppression.txt")
LOG = os.path.join(DATA, "log.jsonl")
TPL = os.path.join(ROOT, "templates")
CONFIG = os.path.join(ROOT, "config.json")

DEFAULTS = {
    "daily_cap": 25,
    "warmup_cap_day1": 10,
    "fit_threshold": 60,
    "unsubscribe_url": "https://awareliquid.ai/raise#unsubscribe",
    "sender": "anmuning@awareliquid.ai",
    "complaint_halt_pct": 0.1,
}
# what we are actually pitching — scoring matches investor thesis tags against this
OUR_THESIS = ["agents", "ai infra", "developer tools", "open source", "memory",
              "continual learning", "edge ai", "llm", "founder-led", "devtools"]
OUR_STAGES = {"pre-seed", "seed", "both"}
TODAY = datetime.date.today().isoformat()

def load_config():
    cfg = dict(DEFAULTS)
    if os.path.exists(CONFIG):
        cfg.update(json.load(open(CONFIG, encoding="utf-8")))
    return cfg

def load_investors():
    if not os.path.exists(INV):
        sys.exit(f"missing {INV} — copy data/investors.sample.csv to investors.csv")
    with open(INV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_investors(rows):
    with open(INV, "w", newline="", encoding="utf-8") as f:
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
    if not os.path.exists(LOG):
        return []
    return [json.loads(l) for l in open(LOG, encoding="utf-8") if l.strip()]

def sent_today():
    return sum(1 for r in read_log() if r.get("ts", "").startswith(TODAY) and r.get("action") == "sent")

def fit_score(inv):
    tags = {t.strip().lower() for t in (inv.get("thesis_tags") or "").split("|") if t.strip()}
    overlap = len(tags & set(OUR_THESIS))
    s = min(overlap, 4) * 15                      # thesis fit, capped
    if (inv.get("stage") or "").strip().lower() in OUR_STAGES:
        s += 20
    if (inv.get("warm_intro") or "").strip().lower() in ("yes", "true", "1"):
        s += 25
    if (inv.get("region") or "").strip().lower() in ("sg", "sea", "global", "us", "cn"):
        s += 5
    return min(s, 100)

def cmd_score(args):
    cfg = load_config(); rows = load_investors()
    for r in rows:
        sc = fit_score(r)
        r["fit_score"] = str(sc)
        r["eligible"] = "yes" if sc >= cfg["fit_threshold"] else "no"
    save_investors(rows)
    elig = sum(1 for r in rows if r["eligible"] == "yes")
    print(f"scored {len(rows)} investors; {elig} eligible (>= {cfg['fit_threshold']})")

def cmd_list(args):
    rows = load_investors()
    for r in rows:
        if args.eligible and r.get("eligible") != "yes":
            continue
        print(f"{r.get('id',''):>3}  {r.get('fit_score','?'):>3}  {r.get('eligible','?'):>3}  "
              f"{r.get('fund','')[:28]:<28} {r.get('partner','')[:18]:<18} {r.get('status','')}")

def cmd_draft(args):
    rows = load_investors()
    inv = next((r for r in rows if r.get("id") == args.id), None)
    if not inv:
        sys.exit(f"no investor id {args.id}")
    tpl = open(os.path.join(TPL, "first_touch.txt"), encoding="utf-8").read()
    cfg = load_config()
    hook = inv.get("hook") or "your recent bet in this space"
    body = (tpl
            .replace("{{partner}}", inv.get("partner", "there"))
            .replace("{{fund}}", inv.get("fund", ""))
            .replace("{{hook}}", hook)
            .replace("{{unsubscribe_url}}", cfg["unsubscribe_url"]))
    guard = []
    if inv.get("eligible") != "yes":
        guard.append(f"WARN: fit_score {inv.get('fit_score')} below threshold — do NOT send")
    if (inv.get("email") or "").lower() in load_suppression():
        guard.append("BLOCK: investor is on the suppression list")
    print(f"--- DRAFT (id {args.id}) ---")
    print(body)
    if guard:
        print("\n--- GUARDRAILS ---\n" + "\n".join(guard), file=sys.stderr)

def cmd_approve(args):
    rows = load_investors()
    for r in rows:
        if r.get("id") == args.id:
            r["status"] = "approved"; save_investors(rows)
            print(f"approved {args.id}") ; return
    sys.exit("not found")

def cmd_suppress(args):
    val = args.value.strip().lower()
    with open(SUP, "a", encoding="utf-8") as f:
        f.write(val + "\n")
    print(f"suppressed: {val}")

def cmd_send(args):
    cfg = load_config(); rows = load_investors(); sup = load_suppression()
    cap = cfg["warmup_cap_day1"] if True else cfg["daily_cap"]
    already = sent_today()
    targets = [r for r in rows if r.get("eligible") == "yes" and r.get("status") == "approved"]
    print(f"eligible+approved: {len(targets)} | sent today: {already}/{cap}")
    if not args.apply:
        print("DRY RUN (no --apply). Nothing will be sent. Guardrails that would apply:")
    sent = 0
    for r in targets:
        email = (r.get("email") or "").lower()
        blocks = []
        if email in sup: blocks.append("suppressed")
        if not email or "@" not in email: blocks.append("no valid email")
        if already + sent >= cap: blocks.append(f"daily/warmup cap {cap} reached")
        if r.get("stage", "").lower() not in OUR_STAGES: blocks.append("stage out of scope")
        if blocks:
            print(f"  SKIP {r.get('id')} {r.get('fund')}: {'; '.join(blocks)}")
            continue
        if args.apply and cfg.get("provider_configured"):
            # real sending would go here; intentionally not implemented in the skeleton
            append_log({"ts": datetime.datetime.now().isoformat(), "action": "sent",
                        "id": r.get("id"), "email": email, "sender": cfg["sender"]})
            print(f"  SENT {r.get('id')} {r.get('fund')}")
        else:
            print(f"  WOULD SEND {r.get('id')} {r.get('fund')} <{email}>")
        sent += 1
    if args.apply and not cfg.get("provider_configured"):
        print("NOTE: --apply given but no provider configured; nothing was sent (by design).")

def cmd_report(args):
    log = read_log()
    sent = [r for r in log if r.get("action") == "sent"]
    print(f"total sent: {len(sent)} | today: {sent_today()}")
    if sent:
        by_day = {}
        for r in sent:
            d = r["ts"][:10]; by_day[d] = by_day.get(d, 0) + 1
        for d in sorted(by_day)[-7:]:
            print(f"  {d}: {by_day[d]}")
    print("(bounces/complaints: feed your provider's webhook into log.jsonl, then halt if complaint>%.1f%%)" % load_config()["complaint_halt_pct"])

def main():
    ap = argparse.ArgumentParser(description="Investor CRM + outreach skeleton (safety-first)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("score").set_defaults(func=cmd_score)
    p = sub.add_parser("list"); p.add_argument("--eligible", action="store_true"); p.set_defaults(func=cmd_list)
    p = sub.add_parser("draft"); p.add_argument("id"); p.set_defaults(func=cmd_draft)
    p = sub.add_parser("approve"); p.add_argument("id"); p.set_defaults(func=cmd_approve)
    p = sub.add_parser("suppress"); p.add_argument("value"); p.set_defaults(func=cmd_suppress)
    p = sub.add_parser("send"); p.add_argument("--apply", action="store_true"); p.set_defaults(func=cmd_send)
    sub.add_parser("report").set_defaults(func=cmd_report)
    args = ap.parse_args()
    if args.cmd == "draft":
        cmd_draft(args)  # needs its own call before argparse func for id
        return
    args.func(args)

if __name__ == "__main__":
    main()
