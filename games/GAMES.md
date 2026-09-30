# Writing a concept game for GATE CS Prep Desk

Each game is one plain-JS file in `games/`, loaded by `gate-cs-prep.html` with a `<script>` tag. No libraries, no build step, no network calls.

## Contract

```js
(window.GATE_GAMES = window.GATE_GAMES || []).push({
  id: 'page-replacement',                  // unique, kebab-case
  title: 'Page Fault Hunter',              // short, fun, 2–4 words
  subj: 'os',                              // subject id: em dm dl coa pds algo toc cd os db cn ga
  topics: ['Page replacement algorithms'], // canonical topic names the game trains
  blurb: 'One line: what you practise and why it shows up in GATE.',
  mount(root, api) {
    // Build the whole UI inside `root` (an empty <div>). Return a cleanup function (optional).
    // When a round of play finishes (e.g. 10 questions), call:
    //   api.done({ correct, total, level, seconds })
    // api.lang() returns 'hinglish' or 'english' — write explanations in that language.
  }
});
```

## What every game must do

- **Generate its own problems** with random but valid parameters, so the problems never run out. Compute the correct answer in code; never hard-code answers.
- **Levels 1–3**: level 1 teaches (small numbers, hints visible), level 3 is GATE difficulty (the numbers and twists GATE actually uses). Let the player pick the level.
- **Rounds of 10 questions.** Show progress (e.g. "4 / 10"), a score, and a timer.
- **Instant feedback**: after each answer, show right/wrong, then a **step-by-step explanation** of how to get the answer (every intermediate value, e.g. the frame contents after each reference, or the bit split). A wrong answer must teach the exact rule the player missed.
- **One interactive element beyond typing a number** where it helps understanding — e.g. clicking hit/fault for each reference, filling Gantt-chart cells, dragging a bit boundary, stepping through DFA states. Keep it simple and robust.
- **"How it works" panel** (collapsible, open on level 1): the concept in 4–8 lines with the formula(s).
- End of round: summary (correct/total, time), what to revise, buttons "Play again" and "Next level".

## Style

- Use the page's existing CSS classes and tokens: `.panel`, `.btn`, `.btn.primary`, `.row`, `.chip`, `.small`, `.muted`, `.mono`, `.feedback.ok`, `.feedback.bad`, `.verdict`, `.exp`, `pre.code`; colours only via `var(--pen)`, `var(--pen-soft)`, `var(--ok)`, `var(--ok-bg)`, `var(--bad)`, `var(--bad-bg)`, `var(--marker)`, `var(--line)`, `var(--ink)`, `var(--muted)`, `var(--sheet)`, `var(--paper)`. Put any extra CSS in a `<style>` you inject once, with selectors prefixed by `.g-<id>`.
- Must work at phone width (360px) — use flex-wrap / overflow-x:auto for tables.
- Buttons are real `<button>`s; inputs have labels; don't rely on colour alone (add ✓ / ✗ text).
- Hinglish explanations = Hindi in Roman script mixed with English technical terms, like an Indian GATE teacher.

## Check before finishing

`node --check games/<file>.js` must pass. Then test the logic headlessly: write a throwaway Node script that stubs a minimal DOM (or extract the pure generator/solver functions and test them) and verify, for at least 200 random problems per level, that the solver's answer is correct against an independent brute-force/simulation. Put throwaway files in your own scratch subfolder, not in `games/`.
