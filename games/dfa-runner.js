/* DFA Runner — GATE CS Prep Desk concept game (TOC).
   Pure logic lives in CORE (exposed as game._core for headless tests); UI in mount(). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ utils
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const show = s => (s === '' ? 'ε' : s);

  // ------------------------------------------------------------------ DFA core
  // D = { n, sigma:['a','b'], start:0, fin:[bool], d:[[target per symbol]], keys?:[...] }
  function runDFA(D, w) {
    let q = D.start; const trace = [q];
    for (const c of w) { q = D.d[q][D.sigma.indexOf(c)]; trace.push(q); }
    return { trace, acc: !!D.fin[q] };
  }
  function reachable(D) {
    const seen = new Array(D.n).fill(false), st = [D.start]; seen[D.start] = true;
    while (st.length) { const q = st.pop(); for (const t of D.d[q]) if (!seen[t]) { seen[t] = true; st.push(t); } }
    return seen;
  }
  function randDFA(n, sigma) {
    for (;;) {
      const d = [], fin = [];
      for (let i = 0; i < n; i++) { d.push(sigma.map(() => rnd(n))); fin.push(Math.random() < 0.4); }
      const D = { n, sigma, start: 0, fin, d };
      const nf = fin.filter(Boolean).length;
      if (nf === 0 || nf === n) continue;
      if (reachable(D).every(Boolean)) return D;
    }
  }
  const qn = i => 'q' + i;
  const blockStr = b => '{' + b.map(qn).join(',') + '}';

  // Moore / table-filling style partition refinement, recording every round.
  function minimize(D) {
    const R = reachable(D);
    const reach = [], unreach = [];
    for (let i = 0; i < D.n; i++) (R[i] ? reach : unreach).push(i);
    let cls = new Array(D.n).fill(-1);
    const hasF = reach.some(q => D.fin[q]), hasN = reach.some(q => !D.fin[q]);
    reach.forEach(q => { cls[q] = (hasF && hasN) ? (D.fin[q] ? 1 : 0) : 0; });
    const blocksOf = c => {
      const m = new Map();
      reach.forEach(q => { if (!m.has(c[q])) m.set(c[q], []); m.get(c[q]).push(q); });
      return [...m.values()].sort((x, y) => x[0] - y[0]);
    };
    const rounds = [{ blocks: blocksOf(cls), splits: [] }];
    let count = rounds[0].blocks.length;
    for (;;) {
      const prevBlocks = blocksOf(cls);
      const bIdx = new Array(D.n).fill(-1);
      prevBlocks.forEach((b, i) => b.forEach(q => { bIdx[q] = i; }));
      const sig = q => bIdx[q] + '|' + D.d[q].map(t => bIdx[t]).join(',');
      const ids = new Map(), nc = new Array(D.n).fill(-1);
      reach.forEach(q => { const s = sig(q); if (!ids.has(s)) ids.set(s, ids.size); nc[q] = ids.get(s); });
      if (ids.size === count) break;
      const splits = [];
      prevBlocks.forEach(b => {
        const groups = new Map();
        b.forEach(q => { if (!groups.has(nc[q])) groups.set(nc[q], []); groups.get(nc[q]).push(q); });
        if (groups.size < 2) return;
        const gs = [...groups.values()];
        for (let k = 1; k < gs.length; k++) {
          const a = gs[0][0], z = gs[k][0];
          const s = D.d[a].findIndex((t, si) => bIdx[t] !== bIdx[D.d[z][si]]);
          splits.push({ a, z, sym: D.sigma[s], ta: D.d[a][s], tz: D.d[z][s], ba: prevBlocks[bIdx[D.d[a][s]]], bz: prevBlocks[bIdx[D.d[z][s]]] });
        }
      });
      cls = nc; count = ids.size;
      rounds.push({ blocks: blocksOf(cls), splits });
    }
    return { count, reach, unreach, rounds };
  }

  // Shortest string on which two DFAs (same alphabet) disagree, or null if equivalent.
  function witness(A, B) {
    const key = (p, q) => p * 1000 + q;
    const start = [A.start, B.start], prev = new Map([[key(A.start, B.start), null]]);
    const queue = [start];
    for (let h = 0; h < queue.length; h++) {
      const [p, q] = queue[h];
      if (!!A.fin[p] !== !!B.fin[q]) {
        let s = '', k = key(p, q);
        while (prev.get(k)) { const e = prev.get(k); s = e.c + s; k = e.from; }
        return s;
      }
      A.sigma.forEach((c, i) => {
        const np = A.d[p][i], nq = B.d[q][i], k2 = key(np, nq);
        if (!prev.has(k2)) { prev.set(k2, { from: key(p, q), c }); queue.push([np, nq]); }
      });
    }
    return null;
  }

  // Build a DFA by exploring "what the machine must remember" keys.
  function build(sigma, start, step, acc) {
    const idx = new Map(), keys = [], d = [];
    const add = k => { if (!idx.has(k)) { idx.set(k, keys.length); keys.push(k); } return idx.get(k); };
    add(start);
    for (let i = 0; i < keys.length; i++) d[i] = sigma.map(c => add(step(keys[i], c)));
    return { n: keys.length, sigma, start: 0, fin: keys.map(acc), d, keys };
  }
  const AB = ['a', 'b'], BIN = ['0', '1'];
  const sufStep = w => (k, c) => { let s = k + c; while (s && !w.startsWith(s)) s = s.slice(1); return s; };

  // Language families. Each returns { D, name:{en,hi}, mean(key,L), rule(L), formula (number|null) }
  const FAM = {
    divK(k, r) {
      const D = build(BIN, '0', (x, c) => String((2 * +x + +c) % k), x => +x === r);
      return {
        D, id: 'divK', params: [k, r], formula: null,
        en: (r === 0 ? `binary strings (MSB first) whose value is divisible by ${k}` : `binary strings (MSB first) whose value mod ${k} = ${r}`) + ' (ε counts as value 0)',
        hi: (r === 0 ? `binary strings (MSB pehle) jinki value ${k} se divisible hai` : `binary strings (MSB pehle) jinki value mod ${k} = ${r} hai`) + ' (ε ko value 0 maano)',
        mean: x => `value mod ${k} = ${x}`,
        rule: L => L(`Remember the remainder r. Reading bit b: new r = (2·r + b) mod ${k}.`, `Remainder r yaad rakho. Bit b padhne pe: naya r = (2·r + b) mod ${k}.`)
      };
    },
    countMod(p, i, q, j) {
      const D = build(AB, '0,0', (k, c) => { const [x, y] = k.split(',').map(Number); return c === 'a' ? `${(x + 1) % p},${y}` : `${x},${(y + 1) % q}`; }, k => k === `${i},${j}`);
      const part = (sym, m, v, hi) => m === 2 ? (hi ? `${v ? 'odd' : 'even'} number of ${sym}'s` : `an ${v ? 'odd' : 'even'} number of ${sym}'s`) : `(number of ${sym}'s) mod ${m} = ${v}`;
      return {
        D, id: 'countMod', params: [p, i, q, j], formula: p * q,
        en: `strings over {a,b} with ${part('a', p, i)} and ${part('b', q, j)}`,
        hi: `{a,b} pe strings jinme ${part('a', p, i, 1)} aur ${part('b', q, j, 1)} ho`,
        mean: k => { const [x, y] = k.split(','); return `#a mod ${p} = ${x}, #b mod ${q} = ${y}`; },
        rule: L => L(`Track (#a mod ${p}, #b mod ${q}) together: ${p} × ${q} = ${p * q} pairs, and every pair is distinguishable.`, `(#a mod ${p}, #b mod ${q}) dono saath track karo: ${p} × ${q} = ${p * q} pairs, aur har pair distinguishable hai.`)
      };
    },
    endsWith(w) {
      const D = build(AB, '', sufStep(w), k => k === w);
      return {
        D, id: 'endsWith', params: [w], formula: w.length + 1,
        en: `strings over {a,b} that end with "${w}"`, hi: `{a,b} pe strings jo "${w}" pe khatam hoti hain`,
        mean: k => k === '' ? 'no part of the pattern matched' : `longest suffix matching the pattern = "${k}"`,
        rule: L => L(`State = longest suffix of the input that is a prefix of "${w}" → |w| + 1 = ${w.length + 1} states.`, `State = input ka sabse lamba suffix jo "${w}" ka prefix hai → |w| + 1 = ${w.length + 1} states.`)
      };
    },
    contains(w) {
      const D = build(AB, '', (k, c) => k === w ? w : sufStep(w)(k, c), k => k === w);
      return {
        D, id: 'contains', params: [w], formula: w.length + 1,
        en: `strings over {a,b} that contain "${w}" as a substring`, hi: `{a,b} pe strings jinme "${w}" substring ke roop mein ho`,
        mean: k => k === w ? `"${w}" already seen (accept forever)` : (k === '' ? 'no part of the pattern matched' : `matched "${k}" so far`),
        rule: L => L(`States = how much of "${w}" is matched (0…${w.length}); the last one is an accepting trap → ${w.length + 1} states.`, `States = "${w}" ka kitna part match hua (0…${w.length}); last wala accepting trap hai → ${w.length + 1} states.`)
      };
    },
    notContains(w) {
      const D = build(AB, '', (k, c) => k === w ? w : sufStep(w)(k, c), k => k !== w);
      return {
        D, id: 'notContains', params: [w], formula: w.length + 1,
        en: `strings over {a,b} that do NOT contain "${w}" as a substring`, hi: `{a,b} pe strings jinme "${w}" substring NAHI hai`,
        mean: k => k === w ? `"${w}" seen → dead state` : (k === '' ? 'no part of the pattern matched' : `matched "${k}" so far`),
        rule: L => L(`Complement of "contains ${w}": same ${w.length + 1} states, final/non-final swapped.`, `"contains ${w}" ka complement: wahi ${w.length + 1} states, bas final/non-final swap.`)
      };
    },
    startsWith(w) {
      const D = build(AB, '', (k, c) => { if (k === 'OK' || k === 'DEAD') return k; const s = k + c; return !w.startsWith(s) ? 'DEAD' : (s === w ? 'OK' : s); }, k => k === 'OK');
      return {
        D, id: 'startsWith', params: [w], formula: w.length + 2,
        en: `strings over {a,b} that start with "${w}"`, hi: `{a,b} pe strings jo "${w}" se shuru hoti hain`,
        mean: k => k === 'OK' ? 'prefix matched (accept forever)' : k === 'DEAD' ? 'dead / trap state' : `read "${show(k)}" so far`,
        rule: L => L(`${w.length} states to read the prefix + 1 accepting trap + 1 dead state = |w| + 2 = ${w.length + 2}.`, `Prefix padhne ke ${w.length} states + 1 accepting trap + 1 dead state = |w| + 2 = ${w.length + 2}.`)
      };
    },
    lenMod(k, r) {
      const D = build(AB, '0', (x) => String((+x + 1) % k), x => +x === r);
      return {
        D, id: 'lenMod', params: [k, r], formula: k,
        en: `strings over {a,b} whose length mod ${k} = ${r}`, hi: `{a,b} pe strings jinki length mod ${k} = ${r}`,
        mean: x => `length mod ${k} = ${x}`,
        rule: L => L(`Only the length mod ${k} matters → ${k} states in a cycle.`, `Sirf length mod ${k} matter karta hai → ${k} states ka cycle.`)
      };
    },
    kthFromEnd(k) {
      const D = build(AB, '', (s, c) => (s + c).slice(-k), s => s.length === k && s[0] === 'a');
      return {
        D, id: 'kthFromEnd', params: [k], formula: 2 ** k,
        en: `strings over {a,b} whose ${k === 2 ? '2nd' : k === 3 ? '3rd' : k + 'th'} symbol from the right end is 'a'`,
        hi: `{a,b} pe strings jinka right end se ${k === 2 ? '2nd' : k === 3 ? '3rd' : k + 'th'} symbol 'a' hai`,
        mean: s => `last symbols read = "${show(s)}"`,
        rule: L => L(`The DFA must remember the last ${k} symbols: 2^${k} = ${2 ** k} states (the NFA needs only ${k + 1}). Short "not yet ${k} symbols" states merge with padded ones.`, `DFA ko last ${k} symbols yaad rakhne padte hain: 2^${k} = ${2 ** k} states (NFA sirf ${k + 1} se kaam chala leta hai). Chhote strings wale states padded states mein merge ho jaate hain.`)
      };
    },
    kthFromStart(k) {
      const D = build(AB, '0', (s, c) => { if (s === 'OK' || s === 'DEAD') return s; const n = +s; return n < k - 1 ? String(n + 1) : (c === 'a' ? 'OK' : 'DEAD'); }, s => s === 'OK');
      return {
        D, id: 'kthFromStart', params: [k], formula: k + 2,
        en: `strings over {a,b} whose ${k === 2 ? '2nd' : k === 3 ? '3rd' : k + 'th'} symbol from the left is 'a'`,
        hi: `{a,b} pe strings jinka left se ${k === 2 ? '2nd' : k === 3 ? '3rd' : k + 'th'} symbol 'a' hai`,
        mean: s => s === 'OK' ? 'checked: it was a (accept forever)' : s === 'DEAD' ? 'dead / trap state' : `${s} symbols read`,
        rule: L => L(`Count ${k} positions (${k} states) + accept trap + dead state = k + 2 = ${k + 2}.`, `${k} positions gino (${k} states) + accept trap + dead state = k + 2 = ${k + 2}.`)
      };
    },
    lenAtMost(k) {
      const D = build(AB, '0', s => s === 'DEAD' || +s === k ? 'DEAD' : String(+s + 1), s => s !== 'DEAD');
      return {
        D, id: 'lenAtMost', params: [k], formula: k + 2,
        en: `strings over {a,b} of length at most ${k}`, hi: `{a,b} pe strings jinki length ≤ ${k}`,
        mean: s => s === 'DEAD' ? 'too long → dead state' : `length = ${s}`,
        rule: L => L(`Lengths 0…${k} (${k + 1} states) + 1 dead state = k + 2 = ${k + 2}.`, `Lengths 0…${k} (${k + 1} states) + 1 dead state = k + 2 = ${k + 2}.`)
      };
    },
    lenAtLeast(k) {
      const D = build(AB, '0', s => String(Math.min(+s + 1, k)), s => +s === k);
      return {
        D, id: 'lenAtLeast', params: [k], formula: k + 1,
        en: `strings over {a,b} of length at least ${k}`, hi: `{a,b} pe strings jinki length ≥ ${k}`,
        mean: s => +s === k ? `length ≥ ${k} (accept forever)` : `length = ${s}`,
        rule: L => L(`Count 0…${k}, the last is an accepting trap → k + 1 = ${k + 1} states.`, `0…${k} tak gino, last wala accepting trap → k + 1 = ${k + 1} states.`)
      };
    }
  };
  const PICK_FAMS = [
    () => { const k = pick([3, 4, 5]); return FAM.divK(k, Math.random() < 0.6 ? 0 : 1 + rnd(k - 1)); },
    () => FAM.countMod(2, rnd(2), 2, rnd(2)),
    () => FAM.countMod(3, rnd(3), 2, rnd(2)),
    () => FAM.endsWith(pick(['ab', 'ba', 'bb', 'abb', 'aab', 'bab', 'aba'])),
    () => FAM.contains(pick(['ab', 'bb', 'aba', 'abb', 'baa'])),
    () => FAM.notContains(pick(['aa', 'bb', 'ab', 'aba'])),
    () => FAM.startsWith(pick(['ab', 'ba', 'aab', 'abb'])),
    () => { const k = pick([2, 3, 4]); return FAM.lenMod(k, rnd(k)); },
    () => FAM.kthFromStart(pick([2, 3])),
    () => FAM.lenAtMost(pick([2, 3]))
  ];
  const randW = (lo, hi) => { let s = ''; const L = lo + rnd(hi - lo + 1); for (let i = 0; i < L; i++) s += pick(AB); return s; };
  const MIN_FAMS = [
    () => { const k = 2 + rnd(7); return FAM.divK(k, Math.random() < 0.7 ? 0 : rnd(k)); },
    () => { const p = pick([2, 3]), q = pick([2, 3, 4]); return FAM.countMod(p, rnd(p), q, rnd(q)); },
    () => FAM.endsWith(randW(2, 4)),
    () => FAM.contains(randW(3, 4)),
    () => FAM.notContains(randW(2, 3)),
    () => FAM.startsWith(randW(2, 4)),
    () => FAM.kthFromEnd(pick([2, 3])),
    () => FAM.kthFromStart(2 + rnd(4)),
    () => FAM.lenAtMost(2 + rnd(4)),
    () => FAM.lenAtLeast(2 + rnd(4)),
    () => { const k = 2 + rnd(5); return FAM.lenMod(k, rnd(k)); }
  ];

  // Random DFA with hidden redundancy (clones of states), sometimes an unreachable state.
  function redundantDFA(N) {
    for (;;) {
      const m = Math.random() < 0.2 ? N : 3 + rnd(2);
      const base = randDFA(Math.min(m, N), AB);
      const D = { n: base.n, sigma: AB, start: 0, fin: base.fin.slice(), d: base.d.map(r => r.slice()) };
      const origin = [...Array(D.n).keys()];
      let unreachUsed = false, guard = 0;
      while (D.n < N && guard++ < 50) {
        if (!unreachUsed && Math.random() < 0.18) {
          unreachUsed = true;
          D.d.push(AB.map(() => rnd(D.n))); D.fin.push(Math.random() < 0.5); origin.push(-1 - D.n); D.n++;
          continue;
        }
        const q = rnd(D.n);
        const inc = [];
        for (let s = 0; s < D.n; s++) D.d[s].forEach((t, i) => { if (t === q) inc.push([s, i]); });
        if (!inc.length || origin[q] < 0) continue;
        const nq = D.n;
        D.d.push(D.d[q].slice()); D.fin.push(D.fin[q]); origin.push(origin[q]); D.n++;
        const [s, i] = pick(inc); D.d[s][i] = nq;
        if (Math.random() < 0.5) {
          const ci = rnd(2), t = D.d[nq][ci];
          const alt = origin.map((o, x) => x).filter(x => x !== t && origin[x] === origin[t]);
          if (alt.length) D.d[nq][ci] = pick(alt);
        }
      }
      if (D.n !== N) continue;
      // relabel: keep start at 0, shuffle the rest
      const perm = [0, ...shuffle([...Array(N - 1).keys()].map(x => x + 1))];
      const out = { n: N, sigma: AB, start: 0, fin: [], d: [] };
      for (let x = 0; x < N; x++) { out.fin[perm[x]] = D.fin[x]; out.d[perm[x]] = D.d[x].map(t => perm[t]); }
      const nf = out.fin.filter(Boolean).length;
      if (nf === 0 || nf === N) continue;
      return out;
    }
  }
  function mutate(D) {
    const M = { n: D.n, sigma: D.sigma, start: D.start, fin: D.fin.slice(), d: D.d.map(r => r.slice()) };
    const op = rnd(3), q = rnd(D.n);
    if (op === 0) M.fin[q] = !M.fin[q];
    else if (op === 1) { const i = rnd(D.sigma.length); M.d[q][i] = (M.d[q][i] + 1 + rnd(D.n - 1)) % D.n; }
    else { M.d[q] = M.d[q].slice().reverse(); if (M.d[q][0] === M.d[q][1]) M.fin[q] = !M.fin[q]; }
    return M;
  }
  function relabel(D, perm) {
    const out = { n: D.n, sigma: D.sigma, start: perm[D.start], fin: [], d: [] };
    for (let x = 0; x < D.n; x++) { out.fin[perm[x]] = D.fin[x]; out.d[perm[x]] = D.d[x].map(t => perm[t]); }
    return out;
  }
  const randPerm = n => [0, ...shuffle([...Array(n - 1).keys()].map(x => x + 1))];

  // ------------------------------------------------------------------ question generators (pure data)
  function genStep(level) {
    const n = level === 1 ? 3 + rnd(2) : 4 + rnd(2);
    const D = randDFA(n, AB);
    const w = randW(level === 1 ? 3 : 5, level === 1 ? 5 : 7);
    return { kind: 'step', D, w, ...runDFA(D, w) };
  }
  function genMSQ() {
    for (;;) {
      const D = randDFA(4 + rnd(2), AB);
      const ws = new Set(); while (ws.size < 4) ws.add(randW(2, 6));
      const strs = [...ws], acc = strs.map(s => runDFA(D, s).acc);
      const k = acc.filter(Boolean).length;
      if (k >= 1 && k <= 3) return { kind: 'msq', D, strs, acc };
    }
  }
  function genMinRandom(level) {
    const D = redundantDFA(level === 3 ? 6 : 5 + rnd(2));
    return { kind: 'minrand', D, min: minimize(D) };
  }
  function genPick() {
    for (;;) {
      const F = pick(PICK_FAMS)();
      if (F.D.n > 6 || F.D.n < 3) continue;
      const opts = [F.D];
      let guard = 0;
      while (opts.length < 4 && guard++ < 300) {
        const M = mutate(F.D);
        if (opts.every(o => witness(o, M) !== null)) opts.push(M);
      }
      if (opts.length < 4) continue;
      const perms = opts.map(o => randPerm(o.n));
      const shown = opts.map((o, i) => relabel(o, perms[i]));
      const order = shuffle([0, 1, 2, 3]);
      return { kind: 'pick', F, options: order.map(i => shown[i]), correct: order.indexOf(0), perm: perms[0], wit: order.map(i => i === 0 ? null : witness(F.D, opts[i])) };
    }
  }
  function genMinClassic() {
    const F = pick(MIN_FAMS)();
    return { kind: 'minclassic', F, min: minimize(F.D) };
  }

  const CORE = { runDFA, reachable, randDFA, minimize, witness, build, FAM, PICK_FAMS, MIN_FAMS, redundantDFA, mutate, relabel, genStep, genMSQ, genMinRandom, genPick, genMinClassic };

  // ------------------------------------------------------------------ drawing
  let svgSeq = 0;
  function drawDFA(D, o) {
    o = o || {};
    const n = D.n, cx = 190, cy = 170, Rc = 100, r = 20, id = 'gdfa' + (++svgSeq);
    const P = [];
    for (let i = 0; i < n; i++) { const a = Math.PI + 2 * Math.PI * i / n; P.push({ x: cx + Rc * Math.cos(a), y: cy + Rc * Math.sin(a) }); }
    const f = v => v.toFixed(1);
    const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
    const rot = (u, a) => ({ x: u.x * Math.cos(a) - u.y * Math.sin(a), y: u.x * Math.sin(a) + u.y * Math.cos(a) });
    const groups = new Map();
    for (let p = 0; p < n; p++) D.d[p].forEach((q, i) => { const k = p + ',' + q; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(D.sigma[i]); });
    let edges = '', labels = '';
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    const ext = (x, y, pad) => { bx0 = Math.min(bx0, x - pad); by0 = Math.min(by0, y - pad); bx1 = Math.max(bx1, x + pad); by1 = Math.max(by1, y + pad); };
    P.forEach(p => ext(p.x, p.y, r + 4));
    const lbl = (x, y, t) => { ext(x, y, 6 + 5 * t.length); labels += `<text x="${f(x)}" y="${f(y)}" class="g-dfa-lbl">${esc(t)}</text>`; };
    groups.forEach((syms, k) => {
      const [p, q] = k.split(',').map(Number), t = syms.join(',');
      const A = P[p];
      if (p === q) {
        let u = unit(A.x - cx, A.y - cy);
        if (p === D.start) u = { x: 0, y: -1 };
        const p1 = rot(u, -0.5), p2 = rot(u, 0.5), c1 = rot(u, -0.62), c2 = rot(u, 0.62);
        edges += `<path d="M${f(A.x + r * p1.x)},${f(A.y + r * p1.y)} C${f(A.x + 3 * r * c1.x)},${f(A.y + 3 * r * c1.y)} ${f(A.x + 3 * r * c2.x)},${f(A.y + 3 * r * c2.y)} ${f(A.x + (r + 2) * p2.x)},${f(A.y + (r + 2) * p2.y)}" marker-end="url(#${id}-ah)"/>`;
        lbl(A.x + (2.1 * r + 11) * u.x, A.y + (2.1 * r + 11) * u.y, t);
        return;
      }
      const B = P[q], len = Math.hypot(B.x - A.x, B.y - A.y);
      const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
      const bend = groups.has(q + ',' + p) ? 26 : 12;
      const C = { x: (A.x + B.x) / 2 + bend * nx, y: (A.y + B.y) / 2 + bend * ny };
      const s = unit(C.x - A.x, C.y - A.y), e = unit(C.x - B.x, C.y - B.y);
      const S = { x: A.x + r * s.x, y: A.y + r * s.y }, E = { x: B.x + (r + 2) * e.x, y: B.y + (r + 2) * e.y };
      edges += `<path d="M${f(S.x)},${f(S.y)} Q${f(C.x)},${f(C.y)} ${f(E.x)},${f(E.y)}" marker-end="url(#${id}-ah)"/>`;
      const tt = len < 1.3 * Rc ? 0.5 : 0.36;
      const bx = (1 - tt) * (1 - tt) * S.x + 2 * tt * (1 - tt) * C.x + tt * tt * E.x;
      const by = (1 - tt) * (1 - tt) * S.y + 2 * tt * (1 - tt) * C.y + tt * tt * E.y;
      lbl(bx + 10 * nx, by + 10 * ny, t);
    });
    const S0 = P[D.start]; ext(S0.x - r - 36, S0.y, 4);
    edges += `<path d="M${f(S0.x - r - 34)},${f(S0.y)} L${f(S0.x - r - 2)},${f(S0.y)}" marker-end="url(#${id}-ah)"/>`;
    let nodes = '';
    for (let i = 0; i < n; i++) {
      const hl = o.hl === i ? ' g-dfa-hl' : '';
      nodes += `<g class="g-dfa-node${hl}" data-q="${i}"><circle cx="${f(P[i].x)}" cy="${f(P[i].y)}" r="${r}"/>` +
        (D.fin[i] ? `<circle cx="${f(P[i].x)}" cy="${f(P[i].y)}" r="${r - 4}"/>` : '') +
        `<text x="${f(P[i].x)}" y="${f(P[i].y)}">${qn(i)}</text></g>`;
    }
    return `<svg class="g-dfa-svg" viewBox="${f(bx0)} ${f(by0)} ${f(bx1 - bx0)} ${f(by1 - by0)}" role="img" aria-label="DFA diagram with ${n} states; start ${qn(D.start)}; final ${D.fin.map((x, i) => x ? qn(i) : '').filter(Boolean).join(', ')}">` +
      `<defs><marker id="${id}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>` +
      `<g class="g-dfa-edges">${edges}</g>${nodes}<g>${labels}</g></svg>`;
  }
  function tableHTML(D, hlRow, hlCol) {
    let h = `<div class="tscroll"><table class="g-dfa-tt"><thead><tr><th>δ</th>${D.sigma.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
    for (let q = 0; q < D.n; q++) {
      h += `<tr${q === hlRow ? ' class="g-hlrow"' : ''}><td class="mono">${q === D.start ? '→' : '&nbsp;'}${D.fin[q] ? '*' : '&nbsp;'}${qn(q)}</td>` +
        D.d[q].map((t, i) => `<td class="mono${q === hlRow && i === hlCol ? ' g-hlcell' : ''}">${qn(t)}</td>`).join('') + '</tr>';
    }
    return h + '</tbody></table></div><p class="small muted" style="margin:4px 0 0">→ start, * final</p>';
  }
  const traceStr = (D, w) => { const { trace } = runDFA(D, w); let s = qn(trace[0]); for (let i = 0; i < w.length; i++) s += ` —${w[i]}→ ${qn(trace[i + 1])}`; return s; };
  const partStr = blocks => blocks.map(blockStr).join(' ');

  // ------------------------------------------------------------------ shell (shared pattern)
  const CSS = `
.g-dfa-runner{display:flex;flex-direction:column;gap:14px}
.g-dfa-runner .g-lv .btn[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}
.g-dfa-runner details.g-how{border:1px solid var(--line);border-radius:8px;padding:10px 14px;background:var(--paper)}
.g-dfa-runner details.g-how summary{cursor:pointer;font-weight:700}
.g-dfa-runner .g-howbody{padding-top:8px;white-space:pre-wrap}
.g-dfa-runner .g-fig{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px;align-items:start}
.g-dfa-runner .g-dfa-svg{width:100%;max-width:420px;height:auto;display:block;color:var(--ink)}
.g-dfa-runner .g-dfa-edges path{fill:none;stroke:currentColor;stroke-width:1.5}
.g-dfa-runner .g-dfa-node circle{fill:var(--sheet);stroke:currentColor;stroke-width:1.6}
.g-dfa-runner .g-dfa-node.g-dfa-hl circle{fill:var(--marker);stroke-width:2.4}
.g-dfa-runner .g-dfa-node text{font:600 14px var(--f-mono);fill:currentColor;text-anchor:middle;dominant-baseline:central}
.g-dfa-runner .g-dfa-lbl{font:700 15px var(--f-mono);fill:var(--pen);text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:var(--sheet);stroke-width:4px;stroke-linejoin:round}
.g-dfa-runner .g-dfa-tt{width:auto;min-width:160px}
.g-dfa-runner .g-dfa-tt th{text-transform:none;font-size:.85rem}
.g-dfa-runner .g-dfa-tt td,.g-dfa-runner .g-dfa-tt th{padding:4px 12px}
.g-dfa-runner .g-hlrow td{background:var(--pen-soft)}
.g-dfa-runner .g-hlcell{outline:2px solid var(--pen);outline-offset:-2px}
.g-dfa-runner .g-tape{display:flex;flex-wrap:wrap;gap:4px}
.g-dfa-runner .g-tape span{font:600 1.05rem var(--f-mono);min-width:30px;text-align:center;padding:4px 6px;border:1px solid var(--line);border-radius:5px;background:var(--sheet)}
.g-dfa-runner .g-tape span.done{color:var(--muted);background:var(--paper)}
.g-dfa-runner .g-tape span.cur{background:var(--marker);border-color:var(--ink)}
.g-dfa-runner .g-log{font:.85rem/1.5 var(--f-mono);display:flex;flex-direction:column;gap:2px}
.g-dfa-runner .g-log .bad{color:var(--bad)} .g-dfa-runner .g-log .ok{color:var(--ok)}
.g-dfa-runner .g-optbody{min-width:0;overflow-x:auto}
.g-dfa-runner .g-optbody .g-dfa-tt{font-size:.85rem}
.g-dfa-runner .g-mark{font-weight:700;margin-left:6px}
.g-dfa-runner .g-sum .score{margin:4px 0}
`;
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
  // Options list (single or multi select). opts: array of HTML strings. onDone(ok, chosen[])
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
    const idn = 'gnat' + (++svgSeq);
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

  // ------------------------------------------------------------------ question UIs
  function partitionExp(D, M, L, compact) {
    const out = [];
    if (M.unreach.length) out.push(L(`Step 1 — remove unreachable states: ${M.unreach.map(qn).join(', ')} can never be reached from ${qn(D.start)}, so drop them.`, `Step 1 — unreachable states hatao: ${M.unreach.map(qn).join(', ')} tak ${qn(D.start)} se kabhi nahi pahunch sakte, isliye drop karo.`));
    else out.push(L('Step 1 — every state is reachable from the start, nothing to remove.', 'Step 1 — saare states start se reachable hain, kuch hatana nahi.'));
    let pre = '';
    M.rounds.forEach((r, i) => {
      if (compact && D.n > 10) { pre += `P${i}: ${r.blocks.length} blocks\n`; return; }
      pre += `P${i} = ${partStr(r.blocks)}\n`;
      r.splits.forEach(s => { pre += `   ${qn(s.a)} ≠ ${qn(s.z)}: on '${s.sym}' → ${qn(s.ta)} ∈ ${blockStr(s.ba)} vs ${qn(s.tz)} ∈ ${blockStr(s.bz)}\n`; });
    });
    const last = M.rounds.length - 1;
    pre += `P${last + 1} = P${last}  → ${L('stable', 'stable')}`;
    out.push(L('Step 2 — partition refinement. P0 splits final / non-final. In each round, two states stay together only if on every symbol they go into the same block of the previous partition.', 'Step 2 — partition refinement. P0 mein final / non-final alag. Har round mein do states saath tabhi rehte hain jab har symbol pe dono previous partition ke same block mein jaayein.'));
    out.push({ pre });
    out.push(L(`Each block of the stable partition is one state of the minimal DFA → ${M.count} states.`, `Stable partition ka har block minimal DFA ka ek state hai → ${M.count} states.`));
    return out;
  }

  function uiStep(q, el, L, level, finish) {
    const D = q.D, w = q.w;
    let cur = D.start, pos = 0, mistakes = 0;
    const log = [];
    el.innerHTML = `<p class="qtext" style="margin:0"></p><div class="g-fig"><div class="g-svg"></div><div class="g-tt"></div></div>
<div><div class="small muted" style="margin-bottom:4px">${L('Input string', 'Input string')}</div><div class="g-tape" aria-label="input"></div></div>
<p class="g-ask" style="margin:0;font-weight:600"></p><div class="row g-btns" role="group"></div><div class="g-log"></div>`;
    el.querySelector('.qtext').textContent = L(`Run the DFA on "${w}". At each symbol, click the state the DFA moves to. At the end, decide: accept or reject?`, `DFA ko "${w}" pe chalao. Har symbol pe click karo ki DFA kis state mein jaata hai. End mein batao: accept ya reject?`);
    const svgBox = el.querySelector('.g-svg'), ttBox = el.querySelector('.g-tt'), tape = el.querySelector('.g-tape'), ask = el.querySelector('.g-ask'), btns = el.querySelector('.g-btns'), logEl = el.querySelector('.g-log');
    svgBox.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-q]'); if (g && pos < w.length) choose(+g.dataset.q); });
    function render() {
      svgBox.innerHTML = drawDFA(D, { hl: cur });
      const ci = pos < w.length ? D.sigma.indexOf(w[pos]) : -1;
      ttBox.innerHTML = tableHTML(D, level === 1 ? cur : -1, level === 1 ? ci : -1);
      tape.innerHTML = [...w].map((c, i) => `<span class="${i < pos ? 'done' : i === pos ? 'cur' : ''}">${esc(c)}</span>`).join('');
      logEl.innerHTML = log.join('');
      btns.innerHTML = '';
      if (pos < w.length) {
        ask.textContent = L(`Now in ${qn(cur)}, reading '${w[pos]}' (symbol ${pos + 1} of ${w.length}). Next state?`, `Abhi ${qn(cur)} mein ho, '${w[pos]}' padh rahe ho (symbol ${pos + 1} / ${w.length}). Next state?`) +
          (level === 1 ? L(`  Hint: row ${qn(cur)}, column '${w[pos]}'.`, `  Hint: row ${qn(cur)}, column '${w[pos]}' dekho.`) : '');
        for (let s = 0; s < D.n; s++) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn mono'; b.textContent = qn(s);
          b.addEventListener('click', () => choose(s)); btns.appendChild(b);
        }
      } else {
        ask.textContent = L(`Input finished in ${qn(cur)}. Accept or reject "${w}"?`, `Input khatam, DFA ${qn(cur)} mein hai. "${w}" accept ya reject?`);
        [[true, L('Accept', 'Accept')], [false, L('Reject', 'Reject')]].forEach(([v, t]) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = t;
          b.addEventListener('click', () => verdict(v)); btns.appendChild(b);
        });
      }
    }
    function choose(s) {
      const t = D.d[cur][D.sigma.indexOf(w[pos])];
      if (s === t) log.push(`<div class="ok">✓ δ(${qn(cur)}, ${esc(w[pos])}) = ${qn(t)}</div>`);
      else { mistakes++; log.push(`<div class="bad">✗ ${L('you chose', 'aapne chuna')} ${qn(s)} — δ(${qn(cur)}, ${esc(w[pos])}) = ${qn(t)}</div>`); }
      cur = t; pos++; render();
    }
    function verdict(v) {
      btns.innerHTML = '';
      const ok = v === q.acc && mistakes === 0;
      const exp = [
        L('State trace (read each symbol, look up the table row of the current state):', 'State trace (har symbol pe current state ki row dekho):'),
        { pre: traceStr(D, w) },
        L(`Final state ${qn(cur)} is ${D.fin[cur] ? 'a FINAL state (double circle) → ACCEPT' : 'NOT final → REJECT'}.`, `Last state ${qn(cur)} ${D.fin[cur] ? 'FINAL hai (double circle) → ACCEPT' : 'final NAHI hai → REJECT'}.`)
      ];
      if (mistakes) exp.push(L(`You made ${mistakes} wrong move(s): each step is exactly δ(current state, symbol) — only the current state and the symbol matter, never earlier symbols.`, `Aapke ${mistakes} step galat the: har step bas δ(current state, symbol) hai — sirf current state aur symbol matter karta hai, pichhle symbols nahi.`));
      if (v !== q.acc) exp.push(L('Rule: a DFA accepts iff the state after the LAST symbol is final. Passing through final states in the middle does not matter.', 'Rule: DFA tabhi accept karta hai jab LAST symbol ke baad wala state final ho. Beech mein final states se guzarna matter nahi karta.'));
      finish(ok, exp);
    }
    render();
  }

  function uiMSQ(q, el, L, level, finish) {
    el.innerHTML = `<p class="qtext" style="margin:0"></p><div class="g-fig"><div>${drawDFA(q.D)}</div><div>${tableHTML(q.D)}</div></div><div class="g-ch"></div>`;
    el.querySelector('.qtext').textContent = L('Which of these strings does the DFA accept?', 'Inme se kaunsi strings DFA accept karta hai?');
    const correct = q.acc.map((a, i) => a ? i : -1).filter(i => i >= 0);
    choice(el.querySelector('.g-ch'), q.strs.map(s => `<span class="mono">${esc(s)}</span>`), correct, true, L, ok => {
      const pre = q.strs.map(s => { const r = runDFA(q.D, s); return `${s.padEnd(7)} ${traceStr(q.D, s)}   ${r.acc ? '✓ ACCEPT' : '✗ reject'}`; }).join('\n');
      finish(ok, [L('Trace every string from the start state; accept only if the last state is final:', 'Har string ko start state se trace karo; last state final ho tabhi accept:'), { pre },
        L(`Accepted: ${q.strs.filter((s, i) => q.acc[i]).join(', ')}.`, `Accept hone wali: ${q.strs.filter((s, i) => q.acc[i]).join(', ')}.`)]);
    });
  }

  function uiMinRand(q, el, L, level, finish) {
    el.innerHTML = `<p class="qtext" style="margin:0"></p><div class="g-fig"><div>${drawDFA(q.D)}</div><div>${tableHTML(q.D)}</div></div><div class="g-in"></div>`;
    el.querySelector('.qtext').textContent = L(`How many states does the MINIMAL DFA equivalent to this ${q.D.n}-state DFA have?`, `Is ${q.D.n}-state DFA ke equivalent MINIMAL DFA mein kitne states honge?`);
    numeric(el.querySelector('.g-in'), L('States:', 'States:'), L, v => {
      const ok = v === q.min.count;
      const exp = [L(`Answer: ${q.min.count}.`, `Answer: ${q.min.count}.`), ...partitionExp(q.D, q.min, L)];
      if (!ok && v === q.D.n - q.min.unreach.length && q.min.unreach.length) exp.push(L('You removed the unreachable state but did not merge the equivalent ones.', 'Aapne unreachable state hataya, par equivalent states merge nahi kiye.'));
      if (!ok && v === q.D.n && q.min.unreach.length) exp.push(L('Unreachable states never appear in a minimal DFA — remove them first.', 'Unreachable states minimal DFA mein kabhi nahi hote — pehle unhe hatao.'));
      finish(ok, exp);
    });
  }

  function uiPick(q, el, L, level, finish) {
    const F = q.F;
    el.innerHTML = `<p class="qtext" style="margin:0"></p><div class="g-ch"></div>`;
    el.querySelector('.qtext').textContent = L(`Which DFA accepts exactly L = { ${F.en} }?  (start state is always q0)`, `Kaunsa DFA exactly L = { ${F.hi} } accept karta hai?  (start state hamesha q0)`);
    choice(el.querySelector('.g-ch'), q.options.map(D => tableHTML(D)), [q.correct], false, L, ok => {
      const inv = []; q.perm.forEach((nw, old) => { inv[nw] = old; });
      const meaning = inv.map((old, nw) => `${qn(nw)}: ${F.mean(F.D.keys[old])}${q.options[q.correct].fin[nw] ? '  (final)' : ''}`).join('\n');
      const exp = [
        L(`Correct: option ${'ABCD'[q.correct]}. Design idea — ${F.rule(L)}`, `Sahi: option ${'ABCD'[q.correct]}. Design idea — ${F.rule(L)}`),
        L('What each state of the correct DFA remembers:', 'Sahi DFA ka har state kya yaad rakhta hai:'), { pre: meaning },
        L('Why the others fail (shortest string where they disagree with L):', 'Baaki kyun galat hain (sabse chhoti string jahan L se alag answer dete hain):')
      ];
      const lines = [];
      q.options.forEach((D, i) => {
        if (i === q.correct) return;
        const s = q.wit[i], inL = runDFA(F.D, s).acc, oa = runDFA(D, s).acc;
        lines.push(`${'ABCD'[i]}: "${show(s)}" — ${L('option', 'option')} ${oa ? 'ACCEPTS' : 'REJECTS'}, ${L('but', 'lekin')} "${show(s)}" ${inL ? '∈ L' : '∉ L'}   (${traceStr(D, s)})`);
      });
      exp.push({ pre: lines.join('\n') });
      exp.push(L('Tip: in GATE, test each option on a few short strings (ε, a, b, ab, ba…) — one counterexample kills an option.', 'Tip: GATE mein har option ko chhoti strings (ε, a, b, ab, ba…) pe test karo — ek counterexample se option khatam.'));
      finish(ok, exp);
    });
  }

  function uiMinClassic(q, el, L, level, finish) {
    const F = q.F, D = F.D;
    el.innerHTML = `<p class="qtext" style="margin:0"></p><div class="g-in"></div>`;
    el.querySelector('.qtext').textContent = L(`L = { ${F.en} }.\nHow many states are in the minimal (complete) DFA for L? Count dead/trap states too.`, `L = { ${F.hi} }.\nL ke minimal (complete) DFA mein kitne states hain? Dead/trap state bhi gino.`);
    numeric(el.querySelector('.g-in'), L('States:', 'States:'), L, v => {
      const ok = v === q.min.count;
      const legend = D.keys.map((k, i) => `${qn(i)}: ${F.mean(k)}${D.fin[i] ? '  (final)' : ''}`).join('\n');
      const exp = [
        L(`Answer: ${q.min.count}.  ${F.rule(L)}`, `Answer: ${q.min.count}.  ${F.rule(L)}`),
        L(`Build a DFA whose states are "what we must remember" — this gives ${D.n} states:`, `Aisa DFA banao jiske states "kya yaad rakhna hai" ho — isse ${D.n} states milte hain:`),
        { pre: legend + '\n\n' + D.keys.map((k, i) => `δ(${qn(i)}) : ` + D.sigma.map((c, j) => `${c}→${qn(D.d[i][j])}`).join('  ')).join('\n') },
        ...partitionExp(D, q.min, L, true).slice(1)
      ];
      if (F.id === 'divK') exp.push(L('Divisibility by k: remainders 0…k−1, but for even k some remainders merge (e.g. k = 4 needs only 3, k = 6 needs 4). Always check with refinement.', 'Divisibility by k: remainders 0…k−1, par even k mein kuch remainders merge ho jaate hain (jaise k = 4 → 3, k = 6 → 4). Hamesha refinement se check karo.'));
      finish(ok, exp);
    });
  }

  const UI = { step: uiStep, msq: uiMSQ, minrand: uiMinRand, pick: uiPick, minclassic: uiMinClassic };

  function planFor(level) {
    if (level === 1) return Array(10).fill('step');
    if (level === 2) return shuffle(['msq', 'msq', 'msq', 'msq', 'minrand', 'minrand', 'minrand', 'minrand', 'step', 'step']);
    return shuffle(['pick', 'pick', 'pick', 'pick', 'minclassic', 'minclassic', 'minclassic', 'minclassic', 'minrand', 'minrand']);
  }

  const GAME = {
    id: 'dfa-runner',
    title: 'DFA Runner',
    subj: 'toc',
    topics: ['Finite automata (DFA/NFA)', 'DFA minimization', 'Regular expressions'],
    blurb: 'Step strings through DFAs, minimise them by partition refinement, and match languages to machines — GATE asks one of these almost every year.',
    _core: CORE,
    mount(root, api) {
      let plan = null, planLevel = 0;
      return runShell(root, api, {
        id: 'dfa-runner', css: CSS, title: this.title, blurb: this.blurb,
        levels: L => [L('trace a DFA', 'DFA trace karo'), L('accept & minimise', 'accept & minimise'), L('GATE languages', 'GATE languages')],
        how: L => esc(L(
          `• A DFA has one start state (→) and some final states (double circle). δ(q, symbol) gives exactly one next state.
• To run a string: start at q0, for each symbol move to δ(current, symbol). ACCEPT iff the state after the last symbol is final.
• Minimisation: (1) delete states unreachable from the start. (2) P0 = {final}, {non-final}. (3) Split a block if two of its states go to different blocks on some symbol. (4) Repeat until nothing splits — #blocks = #states of the minimal DFA.
• Classic counts: ends with / contains w → |w|+1; starts with w → |w|+2 (with dead state); k-th symbol from the right → 2^k; (#a mod p, #b mod q) → p·q; length ≤ k → k+2.
• Designing a DFA = deciding what the machine must remember (a remainder, a count mod p, the matched part of a pattern).`,
          `• DFA mein ek start state (→) aur kuch final states (double circle) hote hain. δ(q, symbol) exactly ek next state deta hai.
• String chalana: q0 se shuru, har symbol pe δ(current, symbol) pe jao. Last symbol ke baad final state ho to ACCEPT, warna REJECT.
• Minimisation: (1) start se unreachable states hatao. (2) P0 = {final}, {non-final}. (3) Agar kisi block ke do states kisi symbol pe alag blocks mein jaate hain to block todo. (4) Jab tak kuch na toote, repeat — blocks ki ginti = minimal DFA ke states.
• Classic counts: ends with / contains w → |w|+1; starts with w → |w|+2 (dead state ke saath); right se k-th symbol → 2^k; (#a mod p, #b mod q) → p·q; length ≤ k → k+2.
• DFA design = decide karo machine ko kya yaad rakhna hai (remainder, count mod p, pattern ka matched part).`)),
        gen(level, qi) {
          if (qi === 0 || planLevel !== level || !plan) { plan = planFor(level); planLevel = level; }
          const kind = plan[qi];
          const data = kind === 'step' ? genStep(level) : kind === 'msq' ? genMSQ() : kind === 'minrand' ? genMinRandom(level) : kind === 'pick' ? genPick() : genMinClassic();
          return { kind, build: (el, L, lv, fin) => UI[kind](data, el, L, lv, fin) };
        },
        revise(kind, L) {
          return ({
            step: L('Running a DFA: δ(current, symbol) each step; accept iff the LAST state is final.', 'DFA run: har step δ(current, symbol); LAST state final ho tabhi accept.'),
            msq: L('Tracing several strings on one DFA — be systematic, one symbol at a time.', 'Ek DFA pe kai strings trace karna — ek-ek symbol karke, dhyan se.'),
            minrand: L('DFA minimisation: drop unreachable states, then refine P0 = {F, non-F} until stable.', 'DFA minimisation: unreachable hatao, phir P0 = {F, non-F} ko stable hone tak refine karo.'),
            pick: L('Language → DFA: decide what each state must remember; kill options with short counterexamples.', 'Language → DFA: har state kya yaad rakhe ye socho; chhote counterexamples se options kaato.'),
            minclassic: L('Minimal state counts of classic languages (|w|+1, |w|+2, 2^k, p·q, divisibility).', 'Classic languages ke minimal state counts (|w|+1, |w|+2, 2^k, p·q, divisibility).')
          })[kind] || kind;
        }
      });
    }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(GAME);
})();
