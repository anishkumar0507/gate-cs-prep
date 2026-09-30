"""Bundle every validated paper in json/ into pyq-data.js for the prep tool.

Run from anywhere:  python "pyq/build.py"
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from validate import check  # noqa: E402

ROOT = pathlib.Path(__file__).parent


def label(paper):
    m = re.fullmatch(r"(\d{4})(?:-(\d))?", paper)
    year, st = int(m.group(1)), m.group(2)
    return year, f"GATE CS {year}" + (f" Set {st}" if st else "")


def add_similar(bank, threshold=0.55, keep=6):
    """Link each question to same-pattern PYQs from other years (TF-IDF cosine on question + code + options)."""
    import collections
    import math
    tok = lambda s: re.findall(r"[a-z]+|\d+", s.lower())
    docs = [collections.Counter(tok(q["q"] + " " + (q.get("code") or "") + " " + " ".join(q.get("opts") or []))) for q in bank]
    df = collections.Counter(t for d in docs for t in d)
    idf = {t: math.log(len(docs) / c) for t, c in df.items()}
    vecs = []
    for d in docs:
        v = {t: c * idf[t] for t, c in d.items() if idf[t] > 1.0}
        n = math.sqrt(sum(x * x for x in v.values())) or 1
        vecs.append({t: x / n for t, x in v.items()})
    inv = collections.defaultdict(list)
    for i, v in enumerate(vecs):
        for t, x in v.items():
            inv[t].append((i, x))
    links = 0
    for i, v in enumerate(vecs):
        if bank[i]["subj"] == "ga":
            continue
        acc = collections.Counter()
        for t, x in v.items():
            for j, y in inv[t]:
                if j != i:
                    acc[j] += x * y
        best = [(s, j) for j, s in acc.items() if s >= threshold and bank[j]["year"] != bank[i]["year"] and bank[j]["subj"] == bank[i]["subj"]]
        best.sort(reverse=True)
        if best:
            bank[i]["sim"] = [bank[j]["id"] for s, j in best[:keep]]
            links += 1
    return links


def main():
    bank, report = [], []
    tmap_path = ROOT / "topic_map.json"
    tmap = json.loads(tmap_path.read_text(encoding="utf-8"))["map"] if tmap_path.exists() else {}
    unmapped = 0
    for path in sorted(ROOT.glob("json/*.json"), reverse=True):
        paper = path.stem
        errs, n = check(path)
        if errs:
            report.append(f"SKIP {paper}: {len(errs)} problems (run validate.py)")
            continue
        year, name = label(paper)
        qs = json.loads(path.read_text(encoding="utf-8").replace("＄", "$"))
        # Some papers restart CS numbering at Q.1 and store GA as 101-110: put GA first.
        restart = any(q["num"] > 100 for q in qs)
        for q in qs:
            printed = q["num"] - 100 if restart and q["num"] > 100 else q["num"]
            order = printed if (not restart or q["num"] > 100) else q["num"] + 10
            item = {
                "id": f"pyq-{paper}-{q['num']}",
                "paper": name,
                "year": year,
                "num": order,
                "pnum": printed,
                "pdf": f"pyq/pdf/{paper}-k.pdf" if paper.startswith("2015") else f"pyq/pdf/{paper}-q.pdf",  # 2015 q-PDFs are third-party copies; the official key PDF shows each question
            }
            for k in ("subj", "topic", "type", "marks", "q", "code", "opts", "ans", "alt", "key", "fig", "offsyl", "exp"):
                item[k] = q.get(k)
            raw = (item["topic"] or "").strip()
            canon = tmap.get(item["subj"], {}).get(raw)
            if canon:
                item["topic"] = canon
                if canon.lower() != raw.lower():
                    item["sub"] = raw
            elif tmap:
                unmapped += 1
            if not item["alt"]:
                del item["alt"]
            if item["type"] == "NAT":
                item["opts"] = []
            if item["type"] == "MSQ":
                item["ans"] = sorted(set(item["ans"]))
            bank.append(item)
        report.append(f"ok   {paper}: {n} questions")
    linked = add_similar(bank)
    report.append(f"patterns: {linked} questions have a same-pattern PYQ from another year")
    out = ROOT / "pyq-data.js"
    out.write_text(
        "/* Official GATE CS previous-year questions, extracted from the official papers and answer keys. Local use only. */\n"
        "window.PYQ_BANK=" + json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    if tmap:
        report.append(f"topics: {unmapped} questions with a topic not in topic_map.json (shown as written)")
    print("\n".join(report))
    print(f"{len(bank)} questions -> {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
