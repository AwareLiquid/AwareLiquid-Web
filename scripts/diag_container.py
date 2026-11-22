"""One-shot diagnostic: find what the model container actually runs and whether
the host spacefix landed.  Writes findings into BOTH candidate served memory
pages as an HTML comment so a client with no SSH/log access can read via GET."""

import re
import subprocess


def sh(cmd, t=120):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=t)
        return ((r.stdout or "") + (r.stderr or "")).strip()
    except Exception as e:  # noqa: BLE001
        return "ERR " + repr(e)


parts = []
parts.append("[CMD] " + sh("docker inspect mtlnn_sciqa --format '{{json .Config.Cmd}} | WD={{.Config.WorkingDir}} | ENTRY={{json .Config.Entrypoint}}'"))
parts.append("[MOUNTS] " + sh("docker inspect mtlnn_sciqa --format '{{range .Mounts}}{{.Source}}=>{{.Destination}}(rw={{.RW}}) {{end}}'"))
parts.append("[LS_APP_SERVE] " + sh("docker exec mtlnn_sciqa ls -la /app/serve 2>&1 | head -40"))
parts.append("[FIND] " + sh("docker exec mtlnn_sciqa sh -c 'find / -maxdepth 5 -name \"server*.py\" -not -path \"*/site-packages/*\" 2>/dev/null | head -20'"))
parts.append("[HOST_PIECE] " + sh("grep -c 'piece = tok.decode(\\[tid\\]' /root/M1/serve/server.py /root/M1/serve/server_hf.py 2>&1"))
parts.append("[HOST_ALREADY] " + sh("grep -c 'gen_ids.append(tid)' /root/M1/serve/server.py /root/M1/serve/server_hf.py 2>&1"))
parts.append("[STREAM] " + sh("curl -s --max-time 90 -X POST -H 'Content-Type: application/json' -d '{\"prompt\":\"why sky blue\",\"max_new_tokens\":10,\"do_sample\":false}' http://127.0.0.1:8000/v1/completions/stream 2>&1 | tr -d '\\n' | head -c 300", 150))

txt = "\n".join(parts)
txt = txt.replace("<!--", "<!- -").replace("-->", "- - >").replace("--", "- -")

for p in ("/root/AwareLiquid-Web/web/memory.html", "/root/M1/serve/static/memory.html"):
    try:
        with open(p, encoding="utf-8") as fh:
            h = fh.read()
        h = re.sub(r"<!--DIAG.*?DIAG-->", "", h, flags=re.S)
        if "</body>" in h:
            h = h.replace("</body>", "<!--DIAG\n" + txt + "\nDIAG--></body>", 1)
        else:
            h = h + "<!--DIAG\n" + txt + "\nDIAG-->"
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(h)
        print("DIAG_WRITTEN " + p)
    except Exception as e:  # noqa: BLE001
        print("DIAG_SKIP " + p + " " + repr(e))
