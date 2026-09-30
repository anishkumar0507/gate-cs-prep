# How to extract one GATE CS paper into JSON

You are turning ONE official GATE CS question paper into structured practice data for a student's prep tool.
Accuracy matters more than speed: a wrong question text or wrong answer teaches the student something false.

## Inputs (paths relative to `C:\Users\manis\Desktop\GATE PREP\pyq\`)
- `pdf/<paper>-q.pdf` — the question paper (the source of truth).
- `txt/<paper>-q.txt` — `pdftotext -layout` output of it. Fast to read, but math symbols, superscripts, subscripts, tables and figures are often lost or garbled (`�`). For scanned papers it is nearly empty.
- `pdf/<paper>-k.pdf` / `txt/<paper>-k.txt` — the official answer key, if it exists.

How to read:
1. Use the .txt for the bulk of the wording when it is complete.
2. Open the PDF pages visually (Read tool with `pages`, max 20 pages per call) whenever the text is empty, garbled, has math/code/tables/figures, or you are unsure. For scanned papers read everything visually.
3. The key: match by question number. Old keys (2011–2013) list several paper codes (A/B/C/D) whose question ORDER differs — find the paper code printed on the question paper and use that column. If you cannot determine the code with certainty, solve every question yourself and use `"key":"solved"`.
4. "Marks to All" (MTA) in the key → `"key":"mta"`, give your own carefully solved answer.

## Output
Write a JSON array to `json/<paper>.json` (UTF-8, valid JSON, nothing else in the file). One object per question, in number order:

```json
{
  "num": 12,
  "subj": "os",
  "topic": "Page replacement (LRU)",
  "type": "MCQ",
  "marks": 1,
  "q": "question text",
  "code": "",
  "opts": ["...", "...", "...", "..."],
  "ans": "B",
  "key": "official",
  "fig": false,
  "offsyl": false,
  "exp": "solution"
}
```

Field rules:
- `num`: question number as printed. Papers with GA as Q.1–Q.10 and CS as Q.11–Q.65: keep as printed. If the CS section restarts at Q.1 (e.g. 2012–2013 style "GA Q.56–65" or separate numbering), keep the printed number but make every `num` unique within the paper (GA section: add 100 if needed) — state what you did in your final reply.
- `subj`: exactly one of `ga` General Aptitude · `em` Engineering Mathematics (linear algebra, calculus, probability & statistics) · `dm` Discrete Mathematics (logic, sets/relations/functions, lattices, groups, combinatorics, recurrences, graph theory) · `dl` Digital Logic · `coa` Computer Organization & Architecture · `pds` Programming & Data Structures (C, arrays, stacks, queues, lists, trees, BST, heaps, hashing) · `algo` Algorithms · `toc` Theory of Computation · `cd` Compiler Design · `os` Operating System · `db` Databases · `cn` Computer Networks. Old-syllabus topics (software engineering, web technologies, information systems, numerical methods, etc.) → nearest id and `"offsyl": true`.
- `topic`: short, specific, consistent names (e.g. "Cache memory", "Pipelining", "LR parsing", "Normal forms", "Subnetting / CIDR", "Master theorem", "Pumping lemma / closure", "Deadlock & Banker's").
- `type`: `MCQ` (one correct), `MSQ` (one or more correct; only 2021+), `NAT` (numerical answer; 2014+).
- `marks`: 1 or 2, from the section headers ("Q.11 – Q.35 carry ONE mark each").
- `q`: the exact question, cleaned: rejoin broken lines, keep every number and word, keep line breaks where they carry meaning (lists of statements, data rows). Math in plain Unicode — x², aₙ, √, ≤, ≥, ≠, ∑, ∏, ∫, ∞, ⌈ ⌉, ⌊ ⌋, log₂, θ, λ, →, ↔, ¬, ∧, ∨, ∀, ∃, ∈, ⊆, ∪, ∩, ×. Never LaTeX (a plain `$` end-marker in parsing questions is fine). Matrices as rows, e.g. `[[1, 2], [3, 4]]` or a line per row.
- `code`: any program, pseudo-code, grammar productions, SQL query or relation instance — with its line breaks and indentation. Else `""`.
- Figures and tables: TRANSCRIBE them into `q` or `code` when possible — a graph as an edge list with weights and direction, an automaton as a transition table with start/final states, a table/relation as aligned rows, a circuit as its gate-level equations or a precise wiring description, a timing/Gantt chart as data. Set `"fig": true` only if something essential cannot be expressed in text (then describe what it shows as well as you can).
- `opts`: the four options without "(A)" labels, for MCQ/MSQ; `[]` for NAT. Options that are figures → transcribe.
- `ans`: MCQ one letter `"A"`–`"D"`; MSQ an array of letters e.g. `["B","D"]`; NAT `{"min": number, "max": number}` from the key's range.
- `alt` (optional): when the official key accepts more than one answer ("C OR D", two NAT ranges, marks-to-all with two right options), put the main one in `ans` and the others here as a list in the same format, e.g. `["C"]` or `[{"min":3.7,"max":3.8}]`.
- `key`: `"official"` if taken from the official key, `"mta"` for marks-to-all, `"solved"` if no key (you solved it).
- `exp`: a GOOD step-by-step solution in Hinglish (Hindi in Roman script mixed naturally with English technical terms, the way Indian GATE teachers explain), 4–12 short lines separated by `\n`. Show the method, every key step and number, and end with the answer. Where there is a classic trap, add one line starting "Trap:". If your own solution disagrees with the official key, re-check carefully; if still in conflict, follow the key and explain why the key's answer is right (never write a solution that contradicts `ans`).

## Final check before you finish
- Count: every question in the paper is present exactly once (usually 65; older papers 85 or 65). Linked/common-data questions: include each part as its own object with the shared data repeated in `q`.
- Run `python "C:\Users\manis\Desktop\GATE PREP\pyq\validate.py" json/<paper>.json` from the pyq folder and fix everything it reports.
- Reply with: number of questions, how many official/mta/solved, how many `fig:true`, any numbering adjustments, and anything you were unsure of.
