import json, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
B = r"C:\Users\manis\Desktop\GATE PREP\pyq"
raw = json.load(open(B + r"\topics_raw.json", encoding="utf-8"))
tm = json.load(open(B + r"\topic_map.json", encoding="utf-8"))
err = 0
for s, topics in raw.items():
    tax = tm["taxonomy"][s]; m = tm["map"][s]
    for k in topics:
        if k not in m: print("MISSING", s, k); err += 1
        elif m[k] not in tax: print("BADVAL", s, k, m[k]); err += 1
    extra = set(m) - set(topics)
    if extra: print("EXTRA", s, extra); err += 1
print("errors:", err)
for s, topics in raw.items():
    c = Counter()
    for k, n in topics.items(): c[tm["map"][s][k]] += n
    print(f"\n{s} ({len(tm['taxonomy'][s])} topics, {sum(c.values())} Qs)")
    for t in tm["taxonomy"][s]: print(f"  {c[t]:4d}  {t}")
