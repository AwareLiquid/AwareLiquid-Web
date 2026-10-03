#!/usr/bin/env python3
"""Investor CRM + outreach skeleton for the AwareLiquid cold start.

Design rule #1: NOTHING IS EVER SENT BY DEFAULT.
`draft` only prints. `send` refuses unless every guardrail passes AND you pass
`--apply` AND a provider is configured (see adapters.py). Offline it is a dry
run. This mirrors Polsia's SANDBOX_MODE=true default: no real emails until a
human explicitly turns it on.

Standard library only. The store is CSV/JSONL; wire it to the Awareness MCP
memory layer via config.json (awareness_endpoint) so investor context and
follow-ups persist across sessions and never repeat.

Commands:
  score                 fit-score + eligibility (weights from config.json)
  list [--eligible]     show investors
  draft <id>            print a personalised first-touch draft (no send)
  approve <id>          human approves a draft (required before send)
  suppress <val>        add to the never-contact list
  send [--apply]        dry run by default; sends only if every guardrail passes
  report                funnel + deliverability summary
"""
import argparse, csv, json, os, sys, datetime

try:
    import adapters
except Exception:  # keep the skeleton runnable even if adapters.py is missing
    adapters = None

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
    "fit_weights": {"thesis_overlap_per_tag": 15, "thesis_overlap_max_tags": 4,
                     "stage_match": 20, "warm_intro": 25, "region_match": 5},
    "unsubscribe_url": "https://awareliquid.ai/raise#unsubscribe",
    "sender": "anmuning@awareliquid.ai",
    "complaint_halt_pct": 0.1,
}
OUR_THESIS = ["agents", "ai infra", "developer tools", "open source", "memory",
              "continual learning", "edge ai", "llm", "founder-led", "devtools"]
OUR_STAGES = {"pre-seed", "seed", "both"}
OUR_REGIONS = {"sg", "sea", "global", "us", "cn"}
TODAY = datetime.date.today().isoformat()


def load_config():
    cfg = dict(DEFAULTS)
    if os.path.exists(CONFIG):
        cfg.update(json.load(open(CONFIG, encoding="utf-8")))
    cfg.setdefault("fit_weights", DEFAULTS["fit_weights"])
    return cfg


def load_investors():
    if not os.path.exists(INV):
        sys.exit(f"missing {INV} — copy data/investors.sample.csv to investors.csv")
    with open(INV, newline="", encoding="utf-8") as f:
        rows = [l for l in f if l.strip() and not l.lstrip().startswith("#")]
    return list(csv.DictReader(rows))


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


def fit_score(inv, cfg):
    w = cfg["fit_weights"]
    tags = {t.strip().lower() for t in (inv.get("thesis_tags") or "").split("|") if t.strip()}
    overlap = len(tags & set(OUR_THESIS))
    s = min(overlap, w.get("thesis_overlap_max_tags", 4)) * w.get("thesis_overlap_per_tag", 15)
    if (inv.get("stage") or "").strip().lower() in OUR_STAGES:
        s += w.get("stage_match", 20)
    if (inv.get("warm_intro") or "").strip().lower() in ("yes", "true", "1"):
        s += w.get("warm_intro", 25)
    if (inv.get("region") or "").strip().lower() in OUR_REGIONS:
        s += w.get("region_match", 5)
    return min(s, 100)


def render(inv, cfg, template="first_touch.txt"):
    t = open(os.path.join(TPL, template), encoding="utf-8").read()
    return (t.replace("{{partner}}", inv.get("partner") or "there")
             .replace("{{fund}}", inv.get("fund") or "")
             .replace("{{hook}}", inv.get("hook") or "your recent bet in this space")
             .replace("{{unsubscribe_url}}", cfg["unsubscribe_url"]))


def cmd_score(args):
    cfg = load_config(); rows = load_investors()
    for r in rows:
        sc = fit_score(r, cfg)
        r["fit_score"] = str(sc)
        r["eligible"] = "yes" if sc >= cfg["fit_threshold"] else "no"
    save_investors(rows)
    elig = sum(1 for r in rows if r["eligible"] == "yes")
    print(f"scored {len(rows)} investors; {elig} eligible (>= {cfg['fit_threshold']})")


def cmd_list(args):
    for r in load_investors():
        if args.eligible and r.get("eligible") != "yes":
            continue
        print(f"{r.get('id',''):>3}  {r.get('fit_score','?'):>3}  {r.get('eligible','?'):>3}  "
              f"{r.get('fund','')[:28]:<28} {r.get('partner','')[:18]:<18} {r.get('status','')}")


def cmd_draft(args):
    rows = load_investors()
    inv = next((r for r in rows if r.get("id") == args.id), None)
    if not inv:
        sys.exit(f"no investor id {args.id}")
    cfg = load_config()
    body = render(inv, cfg)
    if adapters:
        ctx = adapters.recall(cfg, f"investor {inv.get('fund')} {inv.get('partner')}")
        if ctx:
            body = "Prior context from memory:\n" + ctx[:500] + "\n\n" + body
    print(f"--- DRAFT (id {args.id}) ---")
    print(body)
    if inv.get("eligible") != "yes":
        print(f"\nWARN: fit_score {inv.get('fit_score')} below threshold — do NOT send", file=sys.stderr)
    if (inv.get("email") or "").lower() in load_suppression():
        print("BLOCK: investor is on the suppression list", file=sys.stderr)


def cmd_approve(args):
    rows = load_investors()
    for r in rows:
        if r.get("id") == args.id:
            r["status"] = "approved"; save_investors(rows); print(f"approved {args.id}"); return
    sys.exit("not found")


def cmd_suppress(args):
    val = args.value.strip().lower()
    with open(SUP, "a", encoding="utf-8") as f:
        f.write(val + "\n")
    print(f"suppressed: {val}")


def cmd_send(args):
    cfg = load_config(); rows = load_investors(); sup = load_suppression()
    cap = cfg["warmup_cap_day1"]
    already = sent_today()
    targets = [r for r in rows if r.get("eligible") == "yes" and r.get("status") == "approved"]
    print(f"eligible+approved: {len(targets)} | sent today: {already}/{cap}")
    if not args.apply:
        print("DRY RUN (no --apply). Nothing will be sent.")
    sent = 0
    for r in targets:
        email = (r.get("email") or "").lower()
        blocks = []
        if email in sup: blocks.append("suppressed")
        if not email or "@" not in email: blocks.append("no valid email")
        if already + sent >= cap: blocks.append(f"cap {cap} reached")
        if r.get("stage", "").lower() not in OUR_STAGES: blocks.append("stage out of scope")
        if blocks:
            print(f"  SKIP {r.get('id')} {r.get('fund')}: {'; '.join(blocks)}")
            continue
        body = render(r, cfg, "follow_up.txt" if r.get("last_touch") else "first_touch.txt")
        subject = body.splitlines()[0].replace("Subject:", "").strip() or "AwareLiquid"
        if args.apply and adapters and adapters.configured(cfg):
            ok, info = adapters.send_email(cfg, email, subject, body)
            if ok:
                append_log({"ts": datetime.datetime.now().isoformat(), "action": "sent",
                            "id": r.get("id"), "email": email, "sender": cfg["sender"], "info": info})
                if adapters: adapters.remember(cfg, f"Sent outreach to {r.get('fund')} ({r.get('partner')})", {"investor_id": r.get("id")})
                print(f"  SENT {r.get('id')} {r.get('fund')}")
                sent += 1
            else:
                print(f"  FAIL {r.get('id')} {r.get('fund')}: {info}")
        else:
            print(f"  WOULD SEND {r.get('id')} {r.get('fund')} <{email}>  [{subject}]")
            sent += 1
    if args.apply and not (adapters and adapters.configured(cfg)):
        print("NOTE: --apply given but no provider configured; nothing was sent (by design).")


def cmd_report(args):
    log = read_log()
    sent = [r for r in log if r.get("action") == "sent"]
    print(f"total sent: {len(sent)} | today: {sent_today()}")
    by_day = {}
    for r in sent:
        d = r["ts"][:10]; by_day[d] = by_day.get(d, 0) + 1
    for d in sorted(by_day)[-7:]:
        print(f"  {d}: {by_day[d]}")
    print(f"(halt if complaints > {load_config()['complaint_halt_pct']}% — feed provider webhooks into log.jsonl)")


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
    args.func(args)


if __name__ == "__main__":
    main()
