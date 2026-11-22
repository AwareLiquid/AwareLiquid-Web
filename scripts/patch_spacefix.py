"""Idempotent hotfix: streaming decode must preserve inter-token spaces.

server_hf.py decoded each token in isolation (``tok.decode([tid])``), which
drops the Llama tokenizer's leading-space marker (▁/Ġ) and glues words
together ("Theskyisblue").  Decoding the cumulative id list and emitting the
delta keeps the spaces.

Version-independent: it only rewrites the two ``piece = tok.decode([tid], ...)``
sites and seeds the accumulator lazily via ``locals().get(...)`` so it needs no
knowledge of the surrounding loop structure (older/newer server copies differ
there).

Run on the server (bind-mounted /root/M1/serve tree the container serves).
Exit codes: 0 = applied, 2 = already patched, 1 = drift (nothing written).
"""

import ast
import shutil
import sys

P = "/root/M1/serve/server_hf.py"
PIECE = "piece = tok.decode([tid], skip_special_tokens=True)"


def main() -> int:
    with open(P, encoding="utf-8") as fh:
        src = fh.read()

    if "gen_ids.append(tid)" in src:
        print("SPACEFIX_ALREADY")
        return 2

    nl = "\r\n" if "\r\n" in src else "\n"
    out = []
    n = 0
    for ln in src.splitlines(keepends=True):
        if ln.strip() == PIECE:
            n += 1
            indent = ln[: len(ln) - len(ln.lstrip())]
            out.append(f"{indent}gen_ids = locals().get('gen_ids') or []{nl}")
            out.append(f"{indent}emitted = locals().get('emitted') or ''{nl}")
            out.append(f"{indent}gen_ids.append(tid){nl}")
            out.append(f"{indent}_full = tok.decode(gen_ids, skip_special_tokens=True){nl}")
            out.append(f"{indent}piece = _full[len(emitted):]{nl}")
            out.append(f"{indent}emitted = _full{nl}")
            continue
        out.append(ln)

    if n != 2:
        print(f"SPACEFIX_MISS piece_sites={n} (expected 2)")
        return 1

    patched = "".join(out)
    try:
        ast.parse(patched)
    except SyntaxError as exc:
        print(f"SPACEFIX_SYNTAX {exc}")
        return 1

    shutil.copy(P, P + ".pre_spacefix")
    with open(P, "w", encoding="utf-8", newline="") as fh:
        fh.write(patched)
    print("SPACEFIX_APPLIED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
