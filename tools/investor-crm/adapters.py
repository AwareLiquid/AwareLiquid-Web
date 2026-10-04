"""Adapters for the investor CRM: sending provider + Awareness memory.

Everything here is OFF until configured in config.json. Offline it is a no-op,
so the skeleton never sends or phones home by accident.

- Sending: `provider` = "resend" | "postmark" (HTTP, stdlib urllib). Requires
  `provider_configured: true` and an API key. Nothing else is implemented on
  purpose — you plug your own provider.
- Awareness: MCP Streamable-HTTP JSON-RPC at `awareness_endpoint`
  (local daemon http://127.0.0.1:37800/mcp or https://awareness.market/mcp).
  `awareness_record` after a touch, `awareness_recall` before drafting, so
  follow-ups never repeat and investor context persists across sessions.
"""
import json, urllib.request, urllib.error

def _post_json(url, payload, headers, timeout=20):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")

# ---------------- sending provider ----------------

def configured(cfg):
    return bool(cfg.get("provider_configured")) and bool(cfg.get("provider")) and bool(cfg.get("provider_api_key"))

def send_email(cfg, to, subject, body):
    """Return (ok: bool, info: str). No-op when not configured."""
    if not configured(cfg):
        return False, "provider not configured"
    provider = cfg.get("provider", "").lower()
    sender = cfg.get("sender")
    try:
        if provider == "resend":
            status, txt = _post_json(
                "https://api.resend.com/emails",
                {"from": sender, "to": [to], "subject": subject, "text": body},
                {"Authorization": f"Bearer {cfg['provider_api_key']}"},
            )
        elif provider == "postmark":
            status, txt = _post_json(
                "https://api.postmarkapp.com/email",
                {"From": sender, "To": to, "Subject": subject, "TextBody": body, "MessageStream": "outbound"},
                {"X-Postmark-Server-Token": cfg["provider_api_key"]},
            )
        else:
            return False, f"unknown provider {provider}"
        return (200 <= status < 300), f"HTTP {status} {txt[:160]}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code} {e.read()[:160]!r}"
    except Exception as e:  # network, timeout, etc.
        return False, f"error: {e}"

# ---------------- Awareness (MCP) ----------------

def _awareness_configured(cfg):
    return bool(cfg.get("awareness_endpoint"))

def _mcp_call(cfg, tool, arguments):
    payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/call",
               "params": {"name": tool, "arguments": arguments}}
    headers = {"Accept": "application/json, text/event-stream"}
    key = cfg.get("awareness_api_key")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    status, txt = _post_json(cfg["awareness_endpoint"], payload, headers)
    # Streamable HTTP may answer with SSE; take the last JSON line if so.
    if txt.lstrip().startswith("event:") or "\ndata:" in txt:
        for line in reversed(txt.splitlines()):
            if line.startswith("data:"):
                txt = line[5:].strip(); break
    return status, txt

def remember(cfg, text, meta=None):
    """Record an outreach touch into Awareness. No-op if not configured."""
    if not _awareness_configured(cfg):
        return False, "awareness not configured"
    try:
        status, txt = _mcp_call(cfg, "awareness_record",
                                {"action": "remember", "content": text, "metadata": meta or {}})
        return (200 <= status < 300), f"HTTP {status}"
    except Exception as e:
        return False, f"error: {e}"

def recall(cfg, query, top_k=5):
    """Recall prior context for an investor before drafting. Returns text or ''."""
    if not _awareness_configured(cfg):
        return ""
    try:
        status, txt = _mcp_call(cfg, "awareness_recall",
                                {"query": query, "detail": "summary", "top_k": top_k})
        if 200 <= status < 300:
            try:
                obj = json.loads(txt)
                content = (obj.get("result") or {}).get("content") or []
                parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("text")]
                return "\n".join(parts).strip()
            except Exception:
                return txt
    except Exception:
        pass
    return ""
