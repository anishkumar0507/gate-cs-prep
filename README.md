# GATE CS Prep Desk

A browser-based practice tool for GATE Computer Science & IT (CS), built around the official previous-year papers.

**Live:** https://anishkumar0507.github.io/gate-cs-prep/

## What's inside

- **1,985 official GATE CS questions**: all 30 papers from 2007 to 2026, each with a step-by-step solution in Hinglish.
  - 1,680 answers come from the official answer keys.
  - 10 are marks-to-all questions; the best answer is shown.
  - 295 are from 2007–2010, years with no official key. Each was solved twice, independently.
- **Aaj (Today) tab**: questions due for revision, a daily set of unseen PYQs weighted by subject importance, and your practice streak.
- **Spaced revision**: a question you get wrong comes back after 1, 3, 7, 15 and 30 days.
- **Same-pattern practice**: 545 questions are linked to PYQs from other years that follow the same pattern.
- **Mock tests**: any full paper under a 180-minute timer, with GATE marking (MCQ −1/3 or −2/3; MSQ and NAT no negative).
- **GATE 2027 tab**: official dates and pattern from IIT Madras, subject-wise marks per paper, most-asked topics, and a statistical list of topics likely to appear.
- **AI features** (optional): lessons, a doubt chat, mistake explanations and fresh questions. To turn them on, add your own Anthropic API key under Settings. The key stays in your browser's local storage and is sent only to `api.anthropic.com`.

Your progress is saved in your own browser. Nothing is uploaded.

## Run locally

Open `gate-cs-prep.html` in Chrome or Edge. Keep the `pyq/` folder next to it.

## Data pipeline (`pyq/`)

| Path | What it is |
|---|---|
| `pdf/`, `txt/` | Official question papers and answer keys, plus their extracted text |
| `json/<paper>.json` | One file per paper; the schema is in `EXTRACT.md` |
| `validate.py` | Schema checks |
| `keycheck.py` | Compares stored answers with the official key text |
| `topic_map.json`, `topicmap_*.py` | Maps each topic to a canonical topic list |
| `build.py` | Bundles everything into `pyq-data.js` and links same-pattern questions |
| `research.md` | GATE 2027 facts and subject weightage, with sources |

To rebuild after editing any JSON file:

```
python pyq/build.py
```

GATE question papers and answer keys are published by the organising IITs/IISc, who own them. They are included here only for exam practice.
