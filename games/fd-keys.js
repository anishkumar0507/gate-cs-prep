/* FD & Keys Lab — GATE CS Prep Desk concept game (DBMS).
   Pure logic lives in CORE (exposed as game._core for headless tests); UI in mount(). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ utils
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LET = 'ABCDEF';
  const pop = m => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  const S = m => { let s = ''; for (let i = 0; i < 6; i++) if (m >> i & 1) s += LET[i]; return s || '∅'; };
  const Set_ = m => '{' + S(m).split('').join(',') + '}';
  const fdStr = f => `${S(f.l)} → ${S(f.r)}`;
  const randSubset = (n, k) => { const idx = shuffle([...Array(n).keys()]).slice(0, k); return idx.reduce((m, i) => m | (1 << i), 0); };

  // ------------------------------------------------------------------ FD core (sets are bitmasks, A = bit 0)
  function closureSteps(X, F) {
    let cur = X; const steps = []; let changed = true;
    while (changed) {
      changed = false;
      F.forEach((f, i) => {
        if ((f.l & cur) === f.l && (f.r & ~cur)) { steps.push({ i, add: f.r & ~cur, before: cur }); cur |= f.r; changed = true; }
      });
    }
    return { cl: cur, steps };
  }
  const closure = (X, F) => closureSteps(X, F).cl;

  function genFDs(n, m, maxL) {
    const F = [], seen = new Set();
    let guard = 0;
    while (F.length < m && guard++ < 500) {
      const l = randSubset(n, 1 + rnd(maxL));
      const rest = ((1 << n) - 1) & ~l;
      if (!rest) continue;
      let r = 0; const rk = Math.random() < 0.7 ? 1 : 2;
      const cand = shuffle([...Array(n).keys()].filter(i => rest >> i & 1)).slice(0, rk);
      cand.forEach(i => { r |= 1 << i; });
      const k = l + ':' + r;
      if (seen.has(k)) continue;
      seen.add(k); F.push({ l, r });
    }
    return F;
  }

  function analyze(n, F) {
    const all = (1 << n) - 1, cl = new Array(1 << n);
    for (let X = 0; X <= all; X++) cl[X] = closure(X, F);
    const sk = []; for (let X = 0; X <= all; X++) if (cl[X] === all) sk.push(X);
    const isSK = X => cl[X] === all;
    const cks = sk.filter(X => { for (let i = 0; i < n; i++) if ((X >> i & 1) && isSK(X & ~(1 << i))) return false; return true; });
    const prime = cks.reduce((a, b) => a | b, 0);
    return { n, all, cl, isSK, sk, nsk: sk.length, cks, prime };
  }

  // Highest normal form by brute force over every X ⊆ R and every A ∈ X⁺ \ X.
  function normalForm(n, F, an) {
    an = an || analyze(n, F);
    const { all, cl, isSK, cks, prime } = an;
    const v = { 2: null, 3: null, 4: null };
    // prefer violations that are literally a given FD (split RHS), for the explanation
    const given = [];
    F.forEach((f, i) => { for (let a = 0; a < n; a++) if ((f.r >> a & 1) && !(f.l >> a & 1)) given.push({ X: f.l, A: a, fd: i }); });
    const derived = [];
    for (let X = 1; X < all; X++) for (let a = 0; a < n; a++) if ((cl[X] >> a & 1) && !(X >> a & 1)) derived.push({ X, A: a, fd: -1 });
    derived.sort((p, q) => pop(p.X) - pop(q.X));
    const check = d => {
      const np = !(prime >> d.A & 1);
      const K = cks.find(K => (d.X & K) === d.X && d.X !== K);
      if (np && K !== undefined && !v[2]) v[2] = { ...d, K };
      if (!isSK(d.X) && np && !v[3]) v[3] = d;
      if (!isSK(d.X) && !v[4]) v[4] = d;
    };
    given.forEach(check); derived.forEach(check);
    const nf = v[2] ? 1 : v[3] ? 2 : v[4] ? 3 : 4;
    return { nf, v };
  }

  // Chase test for lossless join.
  function chase(n, F, parts) {
    const T = parts.map((R, i) => [...Array(n).keys()].map(a => (R >> a & 1) ? 0 : (i + 1) * 10 + a));
    const split = []; F.forEach(f => { for (let a = 0; a < n; a++) if (f.r >> a & 1) split.push({ l: f.l, a }); });
    let changed = true;
    while (changed) {
      changed = false;
      for (const { l, a } of split) {
        const groups = new Map();
        T.forEach((row, i) => { const k = [...Array(n).keys()].filter(b => l >> b & 1).map(b => row[b]).join(','); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
        groups.forEach(rows => {
          if (rows.length < 2) return;
          const vals = rows.map(i => T[i][a]);
          const target = vals.includes(0) ? 0 : Math.min(...vals);
          rows.forEach(i => { if (T[i][a] !== target) { T[i][a] = target; changed = true; } });
        });
      }
    }
    const lossless = T.some(row => row.every(x => x === 0));
    return { lossless, T };
  }
  // Dependency preservation via the standard "closure restricted to each Ri" algorithm.
  function preserves(n, F, parts) {
    return F.map(f => {
      let Z = f.l, changed = true; const trace = [];
      while (changed) {
        changed = false;
        parts.forEach((R, i) => {
          const add = closure(Z & R, F) & R & ~Z;
          if (add) { trace.push({ i, add }); Z |= add; changed = true; }
        });
      }
      return { ok: (f.r & ~Z) === 0, Z, trace };
    });
  }

  // ------------------------------------------------------------------ generators
  function relation(level) {
    const n = level === 1 ? 4 + rnd(2) : level === 2 ? 5 + rnd(2) : 6;
    const m = level === 1 ? 3 + rnd(2) : 4 + rnd(3);
    const F = genFDs(n, m, level === 1 ? 2 : level === 2 ? 2 : 3);
    return { n, F };
  }
  function genClosure(level) {
    for (;;) {
      const { n, F } = relation(level);
      const X = randSubset(n, level === 3 ? 1 + rnd(2) : 1 + rnd(2));
      const r = closureSteps(X, F);
      const added = pop(r.cl & ~X);
      if (added < 2 || r.steps.length < 2) continue;
      return { kind: 'closure', n, F, X, ...r };
    }
  }
  function genCK(level) {
    for (;;) {
      const { n, F } = relation(level);
      const an = analyze(n, F);
      if (an.cks.length > 4 || (level > 1 && an.cks.length < 2 && Math.random() < 0.6)) continue;
      const opts = new Set(an.cks);
      const want = level === 1 ? 4 : 5;
      const distract = [];
      an.cks.forEach(K => { for (let a = 0; a < n; a++) if (!(K >> a & 1)) distract.push(K | 1 << a); for (let a = 0; a < n; a++) if (K >> a & 1 && pop(K) > 1) distract.push(K & ~(1 << a)); });
      for (let t = 0; t < 30; t++) distract.push(randSubset(n, 1 + rnd(3)));
      shuffle(distract);
      for (const d of distract) { if (opts.size >= want) break; if (d && d !== an.all) opts.add(d); }
      if (opts.size < want) continue;
      const list = shuffle([...opts]);
      return { kind: 'ck', n, F, an, list, correct: list.map((X, i) => an.cks.includes(X) ? i : -1).filter(i => i >= 0) };
    }
  }
  function genSK(level) {
    const { n, F } = relation(Math.max(level, 2));
    return { kind: 'sk', n, F, an: analyze(n, F) };
  }
  function genNF(level) {
    const target = level === 2 ? pick([1, 2, 3, 4]) : pick([1, 2, 2, 3, 3, 4]);
    let last = null;
    for (let t = 0; t < 400; t++) {
      const { n, F } = relation(level);
      const an = analyze(n, F), r = normalForm(n, F, an);
      last = { kind: 'nf', n, F, an, ...r };
      if (r.nf === target) break;
    }
    return last;
  }
  function genParts(n, F) {
    const all = (1 << n) - 1;
    for (;;) {
      let parts;
      if (Math.random() < 0.5 && F.length) {
        const f = pick(F), c = closure(f.l, F) & all;
        const R1 = c, R2 = f.l | (all & ~c);
        if (R1 === all || R2 === all) continue;
        parts = [R1, R2];
        if (Math.random() < 0.3) { // split R2 further
          const g = pick(F);
          if ((g.l & R2) === g.l) { const c2 = closure(g.l, F) & R2; const a = c2, b = g.l | (R2 & ~c2); if (a !== R2 && b !== R2 && pop(a) >= 2 && pop(b) >= 2) parts = [R1, a, b]; }
        }
      } else {
        const k = Math.random() < 0.65 ? 2 : 3;
        parts = [];
        for (let i = 0; i < k; i++) parts.push(randSubset(n, 2 + rnd(n - 2)));
        const u = parts.reduce((a, b) => a | b, 0);
        if (u !== all) continue;
      }
      if (parts.some(p => pop(p) < 2 || p === all)) continue;
      if (parts.some((p, i) => parts.some((q, j) => i !== j && (p & q) === p))) continue;
      return parts;
    }
  }
  function genDecomp() {
    const target = rnd(4); // bit0 lossless, bit1 dp
    let last = null;
    for (let t = 0; t < 400; t++) {
      const n = 5 + rnd(2), F = genFDs(n, 3 + rnd(3), 2);
      const parts = genParts(n, F);
      const ch = chase(n, F, parts), dp = preserves(n, F, parts);
      const dpOk = dp.every(x => x.ok);
      last = { kind: 'decomp', n, F, parts, chase: ch, dp, lossless: ch.lossless, dpOk };
      if ((ch.lossless ? 1 : 0) + (dpOk ? 2 : 0) === target) break;
    }
    return last;
  }

  const CORE = { closureSteps, closure, genFDs, analyze, normalForm, chase, preserves, genClosure, genCK, genSK, genNF, genDecomp, genParts, S };

  // ------------------------------------------------------------------ shell (shared pattern)
  const CSS = `
.g-fd-keys{display:flex;flex-direction:column;gap:14px}
.g-fd-keys .g-lv .btn[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}
.g-fd-keys details.g-how{border:1px solid var(--line);border-radius:8px;padding:10px 14px;background:var(--paper)}
.g-fd-keys details.g-how summary{cursor:pointer;font-weight:700}
.g-fd-keys .g-howbody{padding-top:8px;white-space:pre-wrap}
.g-fd-keys .g-rel{font:600 1rem var(--f-mono)}
.g-fd-keys .g-fds{display:flex;flex-wrap:wrap;gap:6px}
.g-fd-keys .g-fd{font:600 .92rem var(--f-mono);border:1px solid var(--line);border-radius:6px;padding:4px 10px;background:var(--sheet)}
.g-fd-keys .g-fd.can{border-color:var(--pen);background:var(--pen-soft)}
.g-fd-keys .g-fd.fired{background:var(--ok-bg);border-color:var(--ok)}
.g-fd-keys .g-fd small{font:600 .7rem var(--f-body);color:var(--muted);margin-left:6px}
.g-fd-keys .g-attrs{display:flex;flex-wrap:wrap;gap:8px}
.g-fd-keys .g-attrs .btn{font:700 1.05rem var(--f-mono);min-width:48px}
.g-fd-keys .g-attrs .btn.in{background:var(--ok-bg);border-color:var(--ok);color:var(--ok)}
.g-fd-keys .g-log{font:.85rem/1.5 var(--f-mono);display:flex;flex-direction:column;gap:2px}
.g-fd-keys .g-log .bad{color:var(--bad)} .g-fd-keys .g-log .ok{color:var(--ok)}
.g-fd-keys .g-cur{font:600 1rem var(--f-mono);background:var(--marker);padding:2px 8px;border-radius:4px}
.g-fd-keys .g-optbody{min-width:0;overflow-x:auto}
.g-fd-keys .g-mark{font-weight:700;margin-left:6px}
.g-fd-keys .g-sum .score{margin:4px 0}
`;
  let seq = 0;
  function injectCSS(id, css) {
    if (document.getElementById('g-style-' + id)) return;
    const s = document.createElement('style'); s.id = 'g-style-' + id; s.textContent = css; document.head.appendChild(s);
  }
  function renderExp(el, exp) {
    el.innerHTML = '';
    (Array.isArray(exp) ? exp : [exp]).forEach(part => {
      if (part == null) return;
      if (typeof part === 'object' && part.pre != null) { const p = document.createElement('pre'); p.className = 'code'; p.textContent = part.pre; el.appendChild(p); }
      else { const d = document.createElement('div'); d.textContent = String(part); el.appendChild(d); }
    });
  }
  function choice(el, opts, correct, multi, L, onDone) {
    const box = document.createElement('div'); box.className = 'q' + (multi ? ' msq' : '');
    box.innerHTML = `<p class="small muted" style="margin:0">${multi ? L('Select ALL that apply, then check.', 'Jitne sahi hain SAB select karo, phir check karo.') : L('Pick one option.', 'Ek option chuno.')}</p><div class="opts"></div><div class="row"><button class="btn primary" type="button" disabled>${L('Check answer', 'Answer check karo')}</button></div>`;
    const list = box.querySelector('.opts'), btn = box.querySelector('button.primary');
    const sel = new Set(), bs = [];
    opts.forEach((html, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="bub">${'ABCDEFGH'[i]}</span><div class="g-optbody">${html}</div>`;
      b.addEventListener('click', () => {
        if (btn.dataset.done) return;
        if (multi) { sel.has(i) ? sel.delete(i) : sel.add(i); } else { sel.clear(); sel.add(i); }
        bs.forEach((x, j) => { x.classList.toggle('on', sel.has(j)); x.setAttribute('aria-pressed', String(sel.has(j))); });
        btn.disabled = sel.size === 0;
      });
      bs.push(b); list.appendChild(b);
    });
    btn.addEventListener('click', () => {
      if (btn.dataset.done) return; btn.dataset.done = '1'; btn.disabled = true;
      const cs = new Set(correct);
      bs.forEach((b, j) => {
        b.classList.remove('on'); b.disabled = true;
        const m = document.createElement('span'); m.className = 'g-mark';
        if (cs.has(j)) { b.classList.add('right'); m.textContent = sel.has(j) ? '✓ ' + L('correct', 'sahi') : '✓ ' + L('correct (missed)', 'sahi (chhoot gaya)'); }
        else if (sel.has(j)) { b.classList.add('wrong'); m.textContent = '✗ ' + L('wrong pick', 'galat choice'); }
        if (m.textContent) b.querySelector('.g-optbody').appendChild(m);
      });
      const ok = sel.size === cs.size && [...sel].every(x => cs.has(x));
      onDone(ok, [...sel]);
    });
    el.appendChild(box);
  }
  function numeric(el, label, L, onDone) {
    const box = document.createElement('div'); box.className = 'row';
    const idn = 'gfdnat' + (++seq);
    box.innerHTML = `<label for="${idn}" class="small" style="font-weight:600">${esc(label)}</label><input id="${idn}" class="nat" type="text" inputmode="numeric" autocomplete="off"><button class="btn primary" type="button">${L('Check', 'Check karo')}</button>`;
    const inp = box.querySelector('input'), btn = box.querySelector('button');
    const go = () => {
      const v = inp.value.trim(); if (!/^-?\d+$/.test(v) || btn.disabled) return;
      btn.disabled = true; inp.disabled = true; onDone(parseInt(v, 10));
    };
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    el.appendChild(box);
    setTimeout(() => { try { inp.focus(); } catch (e) { /* ignore */ } }, 0);
  }
  function runShell(root, api, G) {
    const isHi = () => { try { return !!(api && typeof api.lang === 'function' && api.lang() === 'hinglish'); } catch (e) { return false; } };
    const L = (en, hi) => (isHi() ? hi : en);
    injectCSS(G.id, G.css);
    let level = 1, qi = 0, score = 0, t0 = 0, tick = null, misses = {}, answered = false, q = null, alive = true;
    root.innerHTML = '';
    const box = document.createElement('div'); box.className = 'g-' + G.id;
    root.appendChild(box);
    box.innerHTML = `<div><h2>${esc(G.title)}</h2><p class="small muted" style="margin:4px 0 0">${esc(G.blurb)}</p></div>
<div class="row g-lv" role="group" aria-label="Level"></div>
<details class="g-how"><summary></summary><div class="g-howbody small"></div></details>
<div class="row g-stat" aria-live="polite"><span class="chip g-prog"></span><span class="chip g-score"></span><span class="chip plain g-time"></span></div>
<div class="g-stage"></div><div class="g-fb"></div>
<div class="row"><button class="btn primary g-next" type="button" hidden></button></div>`;
    const $ = s => box.querySelector(s);
    const stage = $('.g-stage'), fb = $('.g-fb'), next = $('.g-next');
    const secs = () => Math.round((Date.now() - t0) / 1000);
    const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    function status() {
      $('.g-prog').textContent = `${L('Q', 'Sawaal')} ${Math.min(qi + 1, 10)} / 10`;
      $('.g-score').textContent = `${L('Score', 'Score')} ${score}`;
      $('.g-time').textContent = '⏱ ' + fmt(secs());
    }
    function levelBar() {
      const lv = $('.g-lv'); lv.innerHTML = `<span class="small muted" style="font-weight:600">${L('Level', 'Level')}</span>`;
      G.levels(L).forEach((name, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn';
        b.setAttribute('aria-pressed', String(level === i + 1)); b.textContent = `${i + 1} · ${name}`;
        b.addEventListener('click', () => { level = i + 1; startRound(); });
        lv.appendChild(b);
      });
    }
    function startRound() {
      clearInterval(tick);
      qi = 0; score = 0; misses = {}; t0 = Date.now();
      levelBar();
      $('.g-how summary').textContent = L('How it works', 'Kaise kaam karta hai');
      $('.g-howbody').innerHTML = G.how(L);
      $('.g-how').open = level === 1;
      $('.g-stat').hidden = false;
      tick = setInterval(() => { if (alive) $('.g-time').textContent = '⏱ ' + fmt(secs()); }, 1000);
      showQ();
    }
    function showQ() {
      answered = false; fb.innerHTML = ''; next.hidden = true; stage.innerHTML = '';
      status();
      q = G.gen(level, qi);
      q.build(stage, L, level, finish);
    }
    function finish(ok, exp) {
      if (answered) return; answered = true;
      if (ok) score++; else misses[q.kind] = (misses[q.kind] || 0) + 1;
      status();
      fb.innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}" role="status"><div class="verdict">${ok ? '✓ ' + L('Correct', 'Sahi jawab!') : '✗ ' + L('Not quite', 'Galat — dekho kaise hota hai')}</div><div class="exp"></div></div>`;
      renderExp(fb.querySelector('.exp'), exp);
      next.hidden = false;
      next.textContent = qi === 9 ? L('See summary', 'Summary dekho') : L('Next question →', 'Agla sawaal →');
      try { next.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    next.addEventListener('click', () => { qi++; if (qi >= 10) summary(); else showQ(); });
    function summary() {
      clearInterval(tick);
      const s = secs();
      try { api && api.done && api.done({ correct: score, total: 10, level, seconds: s }); } catch (e) { /* ignore */ }
      fb.innerHTML = ''; next.hidden = true; $('.g-stat').hidden = true;
      const rev = Object.keys(misses).map(k => `<li>${esc(G.revise(k, L))} <span class="muted">(${misses[k]} ✗)</span></li>`).join('');
      stage.innerHTML = `<div class="g-sum"><p class="eyebrow">${L('Round complete', 'Round khatam')}</p><div class="score">${score} / 10</div>
<p class="muted" style="margin:0">${L('Level', 'Level')} ${level} · ${L('time', 'time')} ${fmt(s)}</p>
${rev ? `<h3 style="margin-top:12px">${L('Revise these', 'Inko revise karo')}</h3><ul>${rev}</ul>` : `<p>${L('Perfect round — nothing to revise. Try the next level.', 'Perfect round — kuch revise nahi karna. Agla level try karo.')}</p>`}
<div class="row"><button class="btn g-again" type="button">${L('Play again', 'Phir se khelo')}</button>${level < 3 ? `<button class="btn primary g-up" type="button">${L('Next level →', 'Agla level →')}</button>` : ''}</div></div>`;
      stage.querySelector('.g-again').addEventListener('click', startRound);
      const up = stage.querySelector('.g-up'); if (up) up.addEventListener('click', () => { level++; startRound(); });
    }
    startRound();
    return () => { alive = false; clearInterval(tick); };
  }

  // ------------------------------------------------------------------ explanation helpers
  const relStr = n => `R(${LET.slice(0, n).split('').join(', ')})`;
  const fdsLine = F => F.map((f, i) => `f${i + 1}: ${fdStr(f)}`).join('   ');
  function closureLines(X, F) {
    const r = closureSteps(X, F);
    const lines = [`start: ${Set_(X)}`];
    r.steps.forEach(s => lines.push(`f${s.i + 1}: ${fdStr(F[s.i])}   (${S(F[s.i].l)} ⊆ ${S(s.before)})  → add ${S(s.add)}  ⇒ ${Set_(s.before | s.add)}`));
    lines.push(`no more FD adds anything  ⇒  ${S(X)}⁺ = ${Set_(r.cl)}`);
    return lines.join('\n');
  }
  function keyAnalysis(n, F, an, L) {
    const all = an.all;
    let lhs = 0, rhs = 0; F.forEach(f => { lhs |= f.l; rhs |= f.r; });
    const core = all & ~rhs, onlyR = rhs & ~lhs;
    const out = [];
    out.push(L(`Attributes on no right-hand side must be in EVERY key: ${core ? Set_(core) : '∅'}.`, `Jo attributes kisi RHS pe nahi hain woh HAR key mein honge: ${core ? Set_(core) : '∅'}.`));
    if (onlyR) out.push(L(`Attributes only on right-hand sides ${Set_(onlyR)} are never part of a candidate key.`, `Jo sirf RHS pe hain ${Set_(onlyR)} woh kabhi candidate key mein nahi aate.`));
    if (core) out.push({ pre: closureLines(core, F) });
    out.push(L(`Candidate keys (minimal sets whose closure is all of R): ${an.cks.map(S).join(', ')}.`, `Candidate keys (minimal sets jinka closure poora R hai): ${an.cks.map(S).join(', ')}.`));
    out.push({ pre: an.cks.map(K => `${S(K)}⁺ = ${S(an.cl[K])} = R ✓;  ` + [...Array(n).keys()].filter(a => K >> a & 1).map(a => `${S(K & ~(1 << a))}⁺ = ${S(an.cl[K & ~(1 << a)])}`).join(', ') + (pop(K) > 1 ? '  (none is R → minimal)' : '')).join('\n') });
    out.push(L(`Prime attributes (in some candidate key): ${Set_(an.prime)};  non-prime: ${an.all & ~an.prime ? Set_(an.all & ~an.prime) : '∅'}.`, `Prime attributes (kisi candidate key mein): ${Set_(an.prime)};  non-prime: ${an.all & ~an.prime ? Set_(an.all & ~an.prime) : '∅'}.`));
    return out;
  }
  const NFN = ['', '1NF', '2NF', '3NF', 'BCNF'];

  // ------------------------------------------------------------------ question UIs
  function header(el, n, F) {
    const d = document.createElement('div');
    d.innerHTML = `<div class="g-rel">${relStr(n)}</div><div class="g-fds" style="margin-top:6px">${F.map((f, i) => `<span class="g-fd" data-i="${i}">f${i + 1}: ${esc(fdStr(f))}</span>`).join('')}</div>`;
    el.appendChild(d);
    return d;
  }

  function uiClosure(q, el, L, level, finish) {
    const { n, F, X } = q;
    let cur = X, mistakes = 0; const fired = new Set(), log = [];
    const p = document.createElement('p'); p.className = 'qtext'; p.style.margin = '0';
    p.textContent = L(`Compute ${S(X)}⁺. Click attributes one at a time as they get added — each click must be justified by an FD whose left side is already inside the set. Click "Closure complete" when nothing more can be added.`,
      `${S(X)}⁺ nikalo. Attributes ek-ek karke click karo jaise woh add hote hain — har click ke liye aisa FD chahiye jiska LHS already set ke andar ho. Jab kuch aur add na ho sake to "Closure complete" dabao.`);
    el.appendChild(p);
    const head = header(el, n, F);
    const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    el.appendChild(body);
    function render() {
      head.querySelectorAll('.g-fd').forEach(s => {
        const i = +s.dataset.i, f = F[i];
        const can = (f.l & cur) === f.l && (f.r & ~cur);
        s.classList.toggle('fired', fired.has(i));
        s.classList.toggle('can', level === 1 && !!can && !fired.has(i));
        s.innerHTML = `f${i + 1}: ${esc(fdStr(f))}` + (fired.has(i) ? `<small>✓ ${L('fired', 'fire hua')}</small>` : level === 1 && can ? `<small>${L('can fire', 'fire ho sakta hai')}</small>` : '');
      });
      body.innerHTML = `<div>${L('Set so far', 'Ab tak ka set')}: <span class="g-cur">${esc(Set_(cur))}</span></div>
<div class="g-attrs" role="group" aria-label="attributes"></div>
<div class="row"><button class="btn primary g-done" type="button">${L('Closure complete', 'Closure complete')}</button></div>
<div class="g-log">${log.join('')}</div>`;
      const box = body.querySelector('.g-attrs');
      for (let a = 0; a < n; a++) {
        const b = document.createElement('button'); b.type = 'button';
        const inSet = !!(cur >> a & 1);
        b.className = 'btn' + (inSet ? ' in' : ''); b.textContent = (inSet ? '✓ ' : '+ ') + LET[a];
        b.setAttribute('aria-label', (inSet ? 'in set: ' : 'add ') + LET[a]);
        b.disabled = inSet;
        b.addEventListener('click', () => add(a)); box.appendChild(b);
      }
      body.querySelector('.g-done').addEventListener('click', done);
    }
    function add(a) {
      const i = F.findIndex(f => (f.l & cur) === f.l && (f.r >> a & 1));
      if (i >= 0) { fired.add(i); log.push(`<div class="ok">✓ f${i + 1}: ${esc(fdStr(F[i]))} — ${esc(S(F[i].l))} ⊆ ${esc(S(cur))}, ${L('add', 'add')} ${LET[a]}</div>`); cur |= 1 << a; }
      else { mistakes++; log.push(`<div class="bad">✗ ${LET[a]}: ${L(`no FD with left side inside ${esc(Set_(cur))} has ${LET[a]} on its right — not justified (yet).`, `aisa koi FD nahi jiska LHS ${esc(Set_(cur))} ke andar ho aur RHS mein ${LET[a]} ho — abhi justified nahi.`)}</div>`); }
      render();
    }
    function done() {
      body.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const missing = q.cl & ~cur;
      const ok = !missing && mistakes === 0;
      const exp = [L(`Closure algorithm: start with X; whenever an FD's left side is inside the set, add its right side; repeat until nothing changes.`, `Closure algorithm: X se shuru karo; jab bhi kisi FD ka LHS set ke andar ho, uska RHS add karo; jab tak kuch na badle repeat.`), { pre: closureLines(X, F) }];
      if (missing) {
        const i = F.findIndex(f => (f.l & cur) === f.l && (f.r & ~cur));
        exp.push(L(`You stopped too early: ${Set_(missing)} still belong to the closure` + (i >= 0 ? ` — e.g. f${i + 1}: ${fdStr(F[i])} can still fire because ${S(F[i].l)} ⊆ ${S(cur)}.` : '.'), `Aap jaldi ruk gaye: ${Set_(missing)} abhi bhi closure mein aate hain` + (i >= 0 ? ` — jaise f${i + 1}: ${fdStr(F[i])} abhi bhi fire ho sakta hai kyunki ${S(F[i].l)} ⊆ ${S(cur)}.` : '.')));
      }
      if (mistakes) exp.push(L(`${mistakes} unjustified click(s): an attribute joins the closure only when some FD's ENTIRE left side is already in the set.`, `${mistakes} bina justification ke click: attribute tabhi add hota hai jab kisi FD ka POORA LHS already set mein ho.`));
      const all = (1 << n) - 1;
      exp.push(q.cl === all ? L(`${S(X)}⁺ = R, so ${S(X)} is a superkey.`, `${S(X)}⁺ = R, isliye ${S(X)} superkey hai.`) : L(`${S(X)}⁺ ≠ R, so ${S(X)} is not a superkey.`, `${S(X)}⁺ ≠ R, isliye ${S(X)} superkey nahi hai.`));
      finish(ok, exp);
    }
    render();
  }

  function uiCK(q, el, L, level, finish) {
    const { n, F, an } = q;
    const p = document.createElement('p'); p.className = 'qtext'; p.style.margin = '0';
    p.textContent = L('Which of these are CANDIDATE keys (minimal superkeys) of R?', 'Inme se kaun R ki CANDIDATE keys (minimal superkeys) hain?');
    el.appendChild(p); header(el, n, F);
    const c = document.createElement('div'); el.appendChild(c);
    choice(c, q.list.map(X => `<span class="mono">${esc(S(X))}</span>`), q.correct, true, L, ok => {
      const exp = keyAnalysis(n, F, an, L);
      const why = q.list.filter(X => !an.cks.includes(X)).map(X => an.isSK(X)
        ? `${S(X)}: ${L('superkey but NOT minimal — contains key', 'superkey hai par minimal NAHI — isme key hai')} ${S(an.cks.find(K => (K & X) === K))}`
        : `${S(X)}: ${S(X)}⁺ = ${S(an.cl[X])} ≠ R → ${L('not even a superkey', 'superkey bhi nahi')}`);
      if (why.length) exp.push({ pre: why.join('\n') });
      finish(ok, exp);
    });
  }

  function skExp(n, an, L) {
    const K = an.cks, lines = [];
    let total = 0;
    for (let m = 1; m < (1 << K.length); m++) {
      let u = 0, c = 0; K.forEach((k, i) => { if (m >> i & 1) { u |= k; c++; } });
      const term = 2 ** (n - pop(u)); total += (c % 2 ? 1 : -1) * term;
      lines.push(`${c % 2 ? '+' : '−'} 2^(${n}−|${K.filter((k, i) => m >> i & 1).map(S).join('∪')}|) = ${c % 2 ? '+' : '−'} 2^${n - pop(u)} = ${c % 2 ? '+' : '−'}${term}`);
    }
    lines.push(`= ${total}`);
    return [L(`Candidate keys: ${K.map(S).join(', ')}. A superkey is any set containing at least one candidate key. For one key K of size k there are 2^(n−k) supersets; for several keys use inclusion–exclusion on the unions:`, `Candidate keys: ${K.map(S).join(', ')}. Superkey = koi bhi set jisme kam se kam ek candidate key ho. Ek key K (size k) ke 2^(n−k) supersets hote hain; zyada keys ho to unions pe inclusion–exclusion lagao:`), { pre: lines.join('\n') }];
  }
  function uiSK(q, el, L, level, finish) {
    const { n, F, an } = q;
    const p = document.createElement('p'); p.className = 'qtext'; p.style.margin = '0';
    p.textContent = L('How many SUPERKEYS does R have?', 'R ki kitni SUPERKEYS hain?');
    el.appendChild(p); header(el, n, F);
    const c = document.createElement('div'); el.appendChild(c);
    numeric(c, L('Superkeys:', 'Superkeys:'), L, v => {
      const exp = [...keyAnalysis(n, F, an, L).slice(-3, -1), ...skExp(n, an, L)];
      if (v !== an.nsk && an.cks.length > 1 && v === an.cks.reduce((s, k) => s + 2 ** (n - pop(k)), 0)) exp.push(L('You added the counts but forgot to subtract the overlaps (sets containing two keys are counted twice).', 'Aapne counts jode par overlap minus karna bhool gaye (do keys wale sets do baar gine gaye).'));
      finish(v === an.nsk, exp);
    });
  }

  function nfExp(q, L) {
    const { n, F, an, v, nf } = q;
    const exp = keyAnalysis(n, F, an, L).slice(-3);
    const lines = [];
    F.forEach((f, i) => {
      for (let a = 0; a < n; a++) {
        if (!(f.r >> a & 1)) continue;
        const X = f.l, sk = an.isSK(X), pr = !!(an.prime >> a & 1);
        const K = an.cks.find(K => (X & K) === X && X !== K);
        let tag;
        if (sk) tag = L('LHS is a superkey → fine for BCNF', 'LHS superkey hai → BCNF ke liye bhi theek');
        else if (pr) tag = L('LHS not a superkey, RHS prime → OK for 3NF, violates BCNF', 'LHS superkey nahi, RHS prime → 3NF theek, BCNF violate');
        else if (K !== undefined) tag = L(`LHS ⊂ key ${S(K)}, RHS non-prime → PARTIAL dependency, violates 2NF`, `LHS key ${S(K)} ka proper part, RHS non-prime → PARTIAL dependency, 2NF violate`);
        else tag = L('LHS not a superkey, RHS non-prime → TRANSITIVE dependency, violates 3NF', 'LHS superkey nahi, RHS non-prime → TRANSITIVE dependency, 3NF violate');
        lines.push(`f${i + 1}  ${S(X)} → ${LET[a]}   ${tag}`);
      }
    });
    exp.push(L('Check every FD (right side split into single attributes):', 'Har FD check karo (RHS ko single attributes mein todo):'), { pre: lines.join('\n') });
    const vs = d => `${S(d.X)} → ${LET[d.A]}` + (d.fd >= 0 ? ` (f${d.fd + 1})` : ` (${L('derived', 'derived')}: ${S(d.X)}⁺ = ${S(an.cl[d.X])})`);
    if (nf === 1) exp.push(L(`Not in 2NF: ${vs(v[2])} — ${S(v[2].X)} is a proper subset of candidate key ${S(v[2].K)} and ${LET[v[2].A]} is non-prime. Highest NF = 1NF.`, `2NF nahi: ${vs(v[2])} — ${S(v[2].X)} candidate key ${S(v[2].K)} ka proper subset hai aur ${LET[v[2].A]} non-prime hai. Highest NF = 1NF.`));
    else if (nf === 2) exp.push(L(`No partial dependency → 2NF. Not 3NF because of ${vs(v[3])}: left side is not a superkey and ${LET[v[3].A]} is non-prime. Highest NF = 2NF.`, `Koi partial dependency nahi → 2NF. 3NF nahi kyunki ${vs(v[3])}: LHS superkey nahi aur ${LET[v[3].A]} non-prime hai. Highest NF = 2NF.`));
    else if (nf === 3) exp.push(L(`Every FD has a superkey on the left or a prime attribute on the right → 3NF. Not BCNF because of ${vs(v[4])}: left side is not a superkey (${LET[v[4].A]} is prime, which 3NF allows but BCNF does not). Highest NF = 3NF.`, `Har FD mein ya to LHS superkey hai ya RHS prime → 3NF. BCNF nahi kyunki ${vs(v[4])}: LHS superkey nahi (${LET[v[4].A]} prime hai — 3NF allow karta hai, BCNF nahi). Highest NF = 3NF.`));
    else exp.push(L('Every non-trivial FD has a superkey on the left → BCNF.', 'Har non-trivial FD ka LHS superkey hai → BCNF.'));
    return exp;
  }
  function uiNF(q, el, L, level, finish) {
    const p = document.createElement('p'); p.className = 'qtext'; p.style.margin = '0';
    p.textContent = L('What is the HIGHEST normal form R satisfies? (Assume all attributes are atomic, so R is at least in 1NF.)', 'R kaunse HIGHEST normal form mein hai? (Saare attributes atomic maano, to R kam se kam 1NF mein hai.)');
    el.appendChild(p); header(el, q.n, q.F);
    const c = document.createElement('div'); el.appendChild(c);
    choice(c, ['1NF (not 2NF)', '2NF (not 3NF)', '3NF (not BCNF)', 'BCNF'], [q.nf - 1], false, L, ok => finish(ok, nfExp(q, L)));
  }

  function uiDecomp(q, el, L, level, finish) {
    const { n, F, parts } = q;
    const p = document.createElement('p'); p.className = 'qtext'; p.style.margin = '0';
    p.textContent = L(`R is decomposed into ${parts.map((P, i) => `R${i + 1}(${S(P)})`).join(', ')}. Which is true?`, `R ko ${parts.map((P, i) => `R${i + 1}(${S(P)})`).join(', ')} mein decompose kiya. Kya sahi hai?`);
    el.appendChild(p); header(el, n, F);
    const c = document.createElement('div'); el.appendChild(c);
    const opts = [L('Lossless join AND dependency preserving', 'Lossless join AUR dependency preserving'), L('Lossless join but NOT dependency preserving', 'Lossless join par dependency preserving NAHI'), L('Dependency preserving but NOT lossless', 'Dependency preserving par lossless NAHI'), L('Neither lossless nor dependency preserving', 'Na lossless, na dependency preserving')];
    const corr = q.lossless ? (q.dpOk ? 0 : 1) : (q.dpOk ? 2 : 3);
    choice(c, opts.map(esc), [corr], false, L, ok => {
      const exp = [];
      if (parts.length === 2) {
        const I = parts[0] & parts[1], cI = closure(I, F);
        exp.push(L(`Lossless (binary rule): R1 ∩ R2 = ${S(I)}; ${S(I)}⁺ = ${S(cI)}. Lossless iff (R1∩R2)⁺ contains R1 or R2.`, `Lossless (binary rule): R1 ∩ R2 = ${S(I)}; ${S(I)}⁺ = ${S(cI)}. Lossless tabhi jab (R1∩R2)⁺ mein R1 ya R2 poora ho.`));
        exp.push(`R1 = ${S(parts[0])} ${(parts[0] & ~cI) ? '⊄' : '⊆'} ${S(cI)},  R2 = ${S(parts[1])} ${(parts[1] & ~cI) ? '⊄' : '⊆'} ${S(cI)}  ⇒  ${q.lossless ? 'LOSSLESS ✓' : 'LOSSY ✗'}`);
      } else {
        const T = q.chase.T;
        const pre = '     ' + LET.slice(0, n).split('').map(c2 => c2.padEnd(4)).join('') + '\n' +
          T.map((row, i) => `R${i + 1}   ` + row.map((x, a) => (x === 0 ? 'a' : 'b' + Math.floor(x / 10)).padEnd(4)).join('') + (row.every(x => x === 0) ? '  ← all a' : '')).join('\n');
        exp.push(L(`Lossless (chase test): one row per Ri, 'a' where Ri has the attribute, else a row-specific 'b'. Apply each FD: rows that agree on the left side are made equal on the right side ('a' wins). Final tableau:`, `Lossless (chase test): har Ri ki ek row, jahan attribute Ri mein hai wahan 'a', warna row-specific 'b'. Har FD lagao: jo rows LHS pe same hain unka RHS same karo ('a' jeetta hai). Final tableau:`));
        exp.push({ pre });
        exp.push(q.lossless ? L('A row became all a → LOSSLESS ✓', 'Ek row poori a ho gayi → LOSSLESS ✓') : L('No row is all a → LOSSY ✗', 'Koi row poori a nahi → LOSSY ✗'));
      }
      exp.push(L('Dependency preservation: for each FD X → Y, grow Z = X using only the pieces: Z ∪= (Z ∩ Ri)⁺ ∩ Ri. Preserved iff Y ⊆ Z.', 'Dependency preservation: har FD X → Y ke liye Z = X ko sirf pieces se badhao: Z ∪= (Z ∩ Ri)⁺ ∩ Ri. Preserved tabhi jab Y ⊆ Z.'));
      exp.push({ pre: F.map((f, i) => { const d = q.dp[i]; return `f${i + 1} ${fdStr(f)}:  Z = ${S(f.l)}` + d.trace.map(t => ` →(R${t.i + 1}) +${S(t.add)}`).join('') + `  ⇒ Z = ${S(d.Z)}  ${d.ok ? '✓ preserved' : '✗ LOST'}`; }).join('\n') });
      const lost = F.filter((f, i) => !q.dp[i].ok);
      exp.push(lost.length ? L(`Not dependency preserving: ${lost.map(fdStr).join(', ')} cannot be checked inside the pieces.`, `Dependency preserving nahi: ${lost.map(fdStr).join(', ')} ko pieces ke andar check nahi kar sakte.`) : L('Every FD is preserved → dependency preserving.', 'Har FD preserved → dependency preserving.'));
      finish(ok, exp);
    });
  }

  const UI = { closure: uiClosure, ck: uiCK, sk: uiSK, nf: uiNF, decomp: uiDecomp };
  function planFor(level) {
    if (level === 1) return shuffle(['closure', 'closure', 'closure', 'closure', 'closure', 'closure', 'ck', 'ck', 'ck', 'ck']);
    if (level === 2) return shuffle(['closure', 'closure', 'ck', 'ck', 'ck', 'sk', 'sk', 'sk', 'nf', 'nf']);
    return shuffle(['closure', 'ck', 'sk', 'sk', 'nf', 'nf', 'nf', 'decomp', 'decomp', 'decomp']);
  }
  function genKind(kind, level) {
    return kind === 'closure' ? genClosure(level) : kind === 'ck' ? genCK(level) : kind === 'sk' ? genSK(level) : kind === 'nf' ? genNF(level) : genDecomp();
  }

  const GAME = {
    id: 'fd-keys',
    title: 'FD & Keys Lab',
    subj: 'db',
    topics: ['Functional dependencies & attribute closure', 'Relational model, keys & integrity constraints', 'Normal forms & decomposition'],
    blurb: 'Grow attribute closures FD by FD, find every candidate key, count superkeys and judge normal forms and decompositions — a GATE DBMS favourite.',
    _core: CORE,
    mount(root, api) {
      let plan = null, planLevel = 0;
      return runShell(root, api, {
        id: 'fd-keys', css: CSS, title: this.title, blurb: this.blurb,
        levels: L => [L('closure & keys', 'closure & keys'), L('superkeys & NF', 'superkeys & NF'), L('GATE mix + decomposition', 'GATE mix + decomposition')],
        how: L => esc(L(
          `• Closure X⁺: start with X; if an FD's left side ⊆ set, add its right side; repeat until nothing changes.
• Superkey: X⁺ = R.  Candidate key: a superkey with no proper subset that is a superkey.  Prime attribute: appears in some candidate key.
• Attributes on no right side are in every key; attributes only on right sides are in no key.
• #superkeys: one key of size k → 2^(n−k); several keys → inclusion–exclusion, e.g. 2^(n−|K1|) + 2^(n−|K2|) − 2^(n−|K1∪K2|).
• For each X → A (A ∉ X): BCNF needs X superkey. 3NF also allows A prime. 2NF only forbids X ⊊ candidate key with A non-prime (partial dependency).
• Lossless binary split: (R1∩R2)⁺ ⊇ R1 or R2 (general: chase test). Dependency preserving: every FD derivable from FDs inside the pieces.`,
          `• Closure X⁺: X se shuru; jis FD ka LHS ⊆ set ho uska RHS add karo; jab tak kuch na badle repeat.
• Superkey: X⁺ = R.  Candidate key: aisi superkey jiska koi proper subset superkey na ho.  Prime attribute: kisi candidate key mein aata hai.
• Jo attribute kisi RHS pe nahi woh har key mein; jo sirf RHS pe hai woh kisi key mein nahi.
• #superkeys: ek key size k → 2^(n−k); kai keys → inclusion–exclusion, jaise 2^(n−|K1|) + 2^(n−|K2|) − 2^(n−|K1∪K2|).
• Har X → A (A ∉ X) ke liye: BCNF mein X superkey chahiye. 3NF mein A prime bhi chalega. 2NF bas X ⊊ candidate key aur A non-prime (partial dependency) mana karta hai.
• Lossless binary split: (R1∩R2)⁺ ⊇ R1 ya R2 (general: chase test). Dependency preserving: har FD pieces ke andar wale FDs se derive ho.`)),
        gen(level, qi) {
          if (qi === 0 || planLevel !== level || !plan) { plan = planFor(level); planLevel = level; }
          const kind = plan[qi], data = genKind(kind, level);
          return { kind, build: (el, L, lv, fin) => UI[kind](data, el, L, lv, fin) };
        },
        revise(kind, L) {
          return ({
            closure: L('Attribute closure: add a right side only when the WHOLE left side is already in the set; keep going until nothing changes.', 'Attribute closure: RHS tabhi add karo jab POORA LHS set mein ho; jab tak kuch na badle chalte raho.'),
            ck: L('Candidate keys: start from attributes on no right side, extend minimally; check minimality by dropping each attribute.', 'Candidate keys: jo kisi RHS pe nahi unse shuru karo, minimal extend karo; har attribute hata ke minimality check karo.'),
            sk: L('Counting superkeys: 2^(n−k) per key, inclusion–exclusion for overlaps.', 'Superkeys ginna: har key ke 2^(n−k), overlap ke liye inclusion–exclusion.'),
            nf: L('Normal forms: find keys and prime attributes first, then test each FD for partial / transitive / non-superkey LHS.', 'Normal forms: pehle keys aur prime attributes, phir har FD ko partial / transitive / non-superkey LHS ke liye test karo.'),
            decomp: L('Decomposition: (R1∩R2)⁺ rule or chase for lossless; closure-within-pieces for dependency preservation.', 'Decomposition: lossless ke liye (R1∩R2)⁺ rule ya chase; dependency preservation ke liye pieces ke andar closure.')
          })[kind] || kind;
        }
      });
    }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(GAME);
})();
