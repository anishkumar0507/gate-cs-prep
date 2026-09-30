"""Compare extracted answers with the official key text (2021+ key layout: Q.No Session Type Section Key Marks)."""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).parent
ROW = re.compile(r"^\s*(\d{1,2})\s+\d+\s+(MCQ|MSQ|NAT)\s+\S+\s+(.+?)\s+([12])\s*$")

def parse_key(txt):
    key = {}
    for line in txt.splitlines():
        m = ROW.match(line)
        if m:
            key[int(m.group(1))] = (m.group(2), m.group(3).strip(), int(m.group(4)))
    return key

def norm(t, a):
    if t == "MCQ": return a
    if t == "MSQ": return ";".join(sorted(a))
    return (a["min"], a["max"])

def keyval(t, k):
    k = k.split(" OR ")[0].strip()
    if t == "NAT":
        m = re.match(r"(-?[\d.]+)\s*to\s*(-?[\d.]+)", k)
        return (float(m.group(1)), float(m.group(2))) if m else k
    if t == "MSQ": return ";".join(sorted(k.replace(",", ";").split(";")))
    return k

for paper in sys.argv[1:]:
    kp = ROOT / f"txt/{paper}-k.txt"
    key = parse_key(kp.read_text(encoding="utf-8", errors="ignore"))
    qs = json.loads((ROOT / f"json/{paper}.json").read_text(encoding="utf-8"))
    restart = any(q["num"] > 100 for q in qs)
    bad = 0
    for q in qs:
        n = (q["num"] - 100) if restart and q["num"] > 100 else (q["num"] + 10 if restart else q["num"])
        if n not in key: continue
        t, k, m = key[n]
        mine = norm(q["type"], q["ans"])
        kv = keyval(q["type"], k) if q["type"] == t or not (t == "MSQ" and q["type"] == "MCQ") else keyval(t, k)
        if isinstance(mine, tuple) and isinstance(kv, tuple): same = abs(mine[0]-kv[0]) < 1e-6 and abs(mine[1]-kv[1]) < 1e-6
        else: same = str(mine) == str(kv)
        if not same or q["marks"] != m:
            bad += 1; print(f"  {paper} Q{n}: json {q['type']} {mine} {q['marks']}m | key {t} {k} {m}m | key-field {q['key']}")
    print(f"{paper}: parsed {len(key)} key rows, {bad} differences")
