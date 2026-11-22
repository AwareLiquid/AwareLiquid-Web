"""Idempotent hotfix: streaming decode must preserve inter-token spaces.

server_hf.py decoded each token in isolation (``tok.decode([tid])``), which
drops the Llama tokenizer's leading-space marker (▁/Ġ) and glues words
together ("Theskyisblue").  Decoding the cumulative id list and emitting the
delta keeps the spaces.  Applied to both the native ``/v1/completions/stream``
path and the OpenAI-compatible ``/v1/chat/completions`` stream path.

Run on the server (the bind-mounted /root/M1/serve tree that the model
container serves).  Exit codes: 0 = applied, 2 = already patched,
1 = pattern drift (nothing written).
"""

import ast
import shutil
import sys

P = "/root/M1/serve/server_hf.py"

REPS = [
    (
        '''        ent_sum, ent_n = 0.0, 0
        try:
            for _ in range(req.max_new_tokens):''',
        '''        ent_sum, ent_n = 0.0, 0
        gen_ids = []
        emitted = ""
        try:
            for _ in range(req.max_new_tokens):''',
    ),
    (
        '''                tid = _sample_next_token(logits, req)
                piece = tok.decode([tid], skip_special_tokens=True)
                yield f"data: {json.dumps({'token': tid, 'text': piece})}\\n\\n"''',
        '''                tid = _sample_next_token(logits, req)
                gen_ids.append(tid)
                _full = tok.decode(gen_ids, skip_special_tokens=True)
                piece = _full[len(emitted):]
                emitted = _full
                yield f"data: {json.dumps({'token': tid, 'text': piece})}\\n\\n"''',
    ),
    (
        '''            past, cur = None, ids
            finish = "length"
            for _ in range(max_tokens):''',
        '''            past, cur = None, ids
            finish = "length"
            gen_ids = []
            emitted = ""
            for _ in range(max_tokens):''',
    ),
    (
        '''                piece = tok.decode([tid], skip_special_tokens=True)
                chunk = {"id": rid, "object": "chat.completion.chunk",''',
        '''                gen_ids.append(tid)
                _full = tok.decode(gen_ids, skip_special_tokens=True)
                piece = _full[len(emitted):]
                emitted = _full
                chunk = {"id": rid, "object": "chat.completion.chunk",''',
    ),
]


def main() -> int:
    src = open(P, encoding="utf-8").read()
    if "gen_ids.append(tid)" in src:
        print("SPACEFIX_ALREADY")
        return 2
    out = src
    for i, (a, b) in enumerate(REPS):
        if out.count(a) != 1:
            print(f"SPACEFIX_MISS rep={i} count={out.count(a)}")
            return 1
        out = out.replace(a, b)
    try:
        ast.parse(out)
    except SyntaxError as exc:
        print(f"SPACEFIX_SYNTAX {exc}")
        return 1
    shutil.copy(P, P + ".pre_spacefix")
    with open(P, "w", encoding="utf-8") as fh:
        fh.write(out)
    print("SPACEFIX_APPLIED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
