"""Idempotent hotfix: streaming decode must preserve inter-token spaces.

server_hf.py decoded each token in isolation (``tok.decode([tid])``), which
drops the Llama tokenizer's leading-space marker (▁/Ġ) and glues words
together ("Theskyisblue").  Decoding the cumulative id list and emitting the
delta keeps the spaces.

Implemented line-based (whitespace-tolerant) so it survives minor formatting
drift on the server copy.  It rewrites the two per-token decode sites

    piece = tok.decode([tid], skip_special_tokens=True)

into

    gen_ids.append(tid)
    _full = tok.decode(gen_ids, skip_special_tokens=True)
    piece = _full[len(emitted):]
    emitted = _full

and seeds ``gen_ids``/``emitted`` right after the sentence that precedes each
streaming loop (``ent_sum, ent_n = 0.0, 0`` for the native endpoint,
``finish = "length"`` for the OpenAI-compatible one).

Run on the server (bind-mounted /root/M1/serve tree the model container
serves).  Exit codes: 0 = applied, 2 = already patched, 1 = drift (no write).
"""

import ast
import shutil
import sys

P = "/root/M1/serve/server_hf.py"

PIECE = "piece = tok.decode([tid], skip_special_tokens=True)"
SEED_AFTER = ('ent_sum, ent_n = 0.0, 0', 'finish = "length"')


def main() -> int:
    with open(P, encoding="utf-8") as fh:
        src = fh.read()

    if "gen_ids.append(tid)" in src:
        print("SPACEFIX_ALREADY")
        return 2

    nl = "\r\n" if "\r\n" in src else "\n"
    out = []
    n_piece = n_seed = 0
    for ln in src.splitlines(keepends=True):
        stripped = ln.strip()
        indent = ln[: len(ln) - len(ln.lstrip())]
        if stripped == PIECE:
            n_piece += 1
            out.append(f"{indent}gen_ids.append(tid){nl}")
            out.append(f"{indent}_full = tok.decode(gen_ids, skip_special_tokens=True){nl}")
            out.append(f"{indent}piece = _full[len(emitted):]{nl}")
            out.append(f"{indent}emitted = _full{nl}")
            continue
        out.append(ln)
        if stripped in SEED_AFTER:
            n_seed += 1
            out.append(f"{indent}gen_ids = []{nl}")
            out.append(f'{indent}emitted = ""{nl}')

    if n_piece != 2:
        print(f"SPACEFIX_MISS piece_sites={n_piece} (expected 2)")
        return 1
    if n_seed != 2:
        print(f"SPACEFIX_MISS seed_sites={n_seed} (expected 2)")
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
