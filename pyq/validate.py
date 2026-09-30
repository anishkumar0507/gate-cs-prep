"""Validate one or more extracted paper JSON files against EXTRACT.md rules."""
import json
import re
import sys

SUBJ = {"ga", "em", "dm", "dl", "coa", "pds", "algo", "toc", "cd", "os", "db", "cn"}
KEYS = {"official", "mta", "solved"}


def check(path):
    errs = []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return [f"cannot parse JSON: {e}"], 0
    if not isinstance(data, list):
        return ["top level must be an array"], 0
    seen = set()
    for i, q in enumerate(data):
        tag = f"#{i} (num {q.get('num')})"
        num = q.get("num")
        if not isinstance(num, int):
            errs.append(f"{tag}: num must be an integer")
        elif num in seen:
            errs.append(f"{tag}: duplicate num")
        seen.add(num)
        if q.get("subj") not in SUBJ:
            errs.append(f"{tag}: bad subj {q.get('subj')!r}")
        t = q.get("type")
        if t not in ("MCQ", "MSQ", "NAT"):
            errs.append(f"{tag}: bad type {t!r}")
        if q.get("marks") not in (1, 2):
            errs.append(f"{tag}: marks must be 1 or 2")
        if not str(q.get("q", "")).strip():
            errs.append(f"{tag}: empty q")
        if re.search(r"\\(frac|sqrt|times|leq|geq|sum|mathbb|text|cdot)\b|\$[^$\n]*\\[a-z]+[^$\n]*\$", str(q.get("q", ""))):
            errs.append(f"{tag}: LaTeX in q")
        if q.get("key") not in KEYS:
            errs.append(f"{tag}: bad key {q.get('key')!r}")
        if not isinstance(q.get("fig"), bool) or not isinstance(q.get("offsyl"), bool):
            errs.append(f"{tag}: fig/offsyl must be booleans")
        if not isinstance(q.get("code", ""), str):
            errs.append(f"{tag}: code must be a string")
        if len(str(q.get("exp", "")).strip()) < 40:
            errs.append(f"{tag}: exp missing or too short")
        opts, ans = q.get("opts"), q.get("ans")
        if t in ("MCQ", "MSQ"):
            if not isinstance(opts, list) or len(opts) != 4 or not all(str(o).strip() for o in opts):
                errs.append(f"{tag}: needs 4 non-empty opts")
            if t == "MCQ" and ans not in ("A", "B", "C", "D"):
                errs.append(f"{tag}: MCQ ans must be one letter")
            if t == "MSQ" and not (isinstance(ans, list) and ans and all(a in "ABCD" and len(a) == 1 for a in ans)):
                errs.append(f"{tag}: MSQ ans must be a list of letters")
        elif t == "NAT":
            if opts not in ([], None):
                errs.append(f"{tag}: NAT opts must be []")
            if not (isinstance(ans, dict) and isinstance(ans.get("min"), (int, float)) and isinstance(ans.get("max"), (int, float)) and ans["min"] <= ans["max"]):
                errs.append(f"{tag}: NAT ans must be {{min,max}} numbers, min<=max")
    return errs, len(data)


if __name__ == "__main__":
    bad = False
    for p in sys.argv[1:]:
        errs, n = check(p)
        print(f"{p}: {n} questions, {len(errs)} problems")
        for e in errs[:60]:
            print("  " + e)
        bad |= bool(errs)
    sys.exit(1 if bad else 0)
