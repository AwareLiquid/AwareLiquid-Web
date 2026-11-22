"""Idempotent hotfix: streaming decode must preserve inter-token spaces.

Both serve entrypoints decode each streamed token in isolation
(``tok.decode([tid])``), which drops the Llama tokenizer's leading-space
marker (▁/Ġ) and glues words together ("Theskyisblue").  Decoding the
cumulative id list and emitting the delta keeps the spaces.

The Dockerfile CMD runs ``serve.server:app`` while docker-compose can override
to ``serve.server_hf:app`` -- so patch BOTH files.  Only the
``piece = tok.decode([tid], ...)`` lines are rewritten and the accumulator is
seeded lazily via ``locals().get(...)``, so this is version-independent.

Run on the server (/root/M1/serve).  Exit: 0 = applied or already patched,
1 = nothing matched (drift).
"""

import ast
import os
import shutil
import sys

FILES = ("/root/M1/serve/server.py", "/root/M1/serve/server_hf.py")
PIECE = "piece = tok.decode([tid], skip_special_tokens=True)"


def patch_file(p):
    if not os.path.exists(p):
        return "missing", 0
    with open(p, encoding="utf-8") as fh:
        src = fh.read()
    if "gen_ids.append(tid)" in src:
        return "already", 0
    nl = "\r\n" if "\r\n" in src else "\n"
    out, n = [], 0
    for ln in src.splitlines(keepends=True):
        if ln.strip() == PIECE:
            n += 1
            ind = ln[: len(ln) - len(ln.lstrip())]
            out.append(f"{ind}gen_ids = locals().get('gen_ids') or []{nl}")
            out.append(f"{ind}emitted = locals().get('emitted') or ''{nl}")
            out.append(f"{ind}gen_ids.append(tid){nl}")
            out.append(f"{ind}_full = tok.decode(gen_ids, skip_special_tokens=True){nl}")
            out.append(f"{ind}piece = _full[len(emitted):]{nl}")
            out.append(f"{ind}emitted = _full{nl}")
        else:
            out.append(ln)
    if n == 0:
        return "no_site", 0
    patched = "".join(out)
    ast.parse(patched)
    shutil.copy(p, p + ".pre_spacefix")
    with open(p, "w", encoding="utf-8", newline="") as fh:
        fh.write(patched)
    return "applied", n


def main() -> int:
    applied = already = 0
    for p in FILES:
        try:
            st, n = patch_file(p)
        except Exception as exc:  # noqa: BLE001
            print(f"{p}: ERROR {exc}")
            continue
        print(f"{p}: {st} sites={n}")
        applied += st == "applied"
        already += st == "already"
    return 0 if (applied or already) else 1


if __name__ == "__main__":
    sys.exit(main())
