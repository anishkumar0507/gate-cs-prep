/* Cache Address Split — GATE CS Prep Desk concept game (COA: cache mapping, AMAT). */
(function () {
  'use strict';
  const GID = 'cache-address';
  const ROOT = 'g-' + GID;

  // ---------- small utils ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const P2 = e => Math.pow(2, e);
  const pw = e => '2<sup>' + e + '</sup>';
  const r2 = x => Math.round(x * 100) / 100;
  const fmt = x => String(r2(x));
  function sizeStr(e) { const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(4, Math.floor(e / 10)); return P2(e - 10 * i) + ' ' + u[i]; }
  function bitsVal(bits, from, to) { let v = 0; for (let i = from; i < to; i++) v = v * 2 + bits[i]; return v; }
  function bitsHex(bits) {
    const b = bits.slice(); while (b.length % 4) b.unshift(0);
    let s = ''; for (let i = 0; i < b.length; i += 4) s += (b[i] * 8 + b[i + 1] * 4 + b[i + 2] * 2 + b[i + 3]).toString(16).toUpperCase();
    return s;
  }
  function parseNum(s) {
    s = String(s || '').trim().replace(/[,\s_]/g, '');
    if (!s) return NaN;
    const m = s.match(/^2\^(\d+)$/); if (m) return P2(+m[1]);
    if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  // ---------- address split: generator + solver ----------
  function derive(p) {
    const A = p.memGiven ? p.memE - p.wE : p.A;
    const off = p.bE - p.wE;
    const linesE = p.cE - p.bE;
    const kE = p.mode === 'dm' ? 0 : p.mode === 'fa' ? linesE : p.kE;
    const setsE = linesE - kE;
    const tag = A - setsE - off;
    return { A, off, linesE, kE, setsE, tag };
  }
  function genSplit(level) {
    for (let t = 0; t < 5000; t++) {
      const p = { kind: 'split', wE: 0, memGiven: false, extra: 1 };
      if (level === 1) {
        p.A = pick([16, 16, 20, 24]); p.cE = rnd(9, 13); p.bE = rnd(3, 6);
        p.mode = pick(['dm', 'dm', 'k']); p.kE = rnd(1, 2);
        p.ask = pick(['tag', 'sets', 'tag', 'sets', 'setOf']);
      } else if (level === 2) {
        p.A = pick([32, 32, 24, 28]); p.cE = rnd(13, 18); p.bE = rnd(4, 7);
        p.mode = pick(['dm', 'k', 'k', 'fa']); p.kE = rnd(1, 3);
        p.ask = pick(['tag', 'sets', 'setOf', 'setOf']);
        if (p.mode === 'fa' && p.ask === 'setOf') p.ask = 'tag';
      } else {
        p.cE = rnd(14, 21); p.bE = rnd(5, 8); p.mode = pick(['dm', 'k', 'k', 'k', 'fa']); p.kE = rnd(1, 4);
        const r = Math.random();
        if (r < 0.35) { p.memGiven = true; p.wE = rnd(1, 3); p.memE = rnd(30, 38); }
        else if (r < 0.65) { p.memGiven = true; p.memE = rnd(30, 40); }
        else p.A = pick([32, 36, 40]);
        p.ask = pick(['tag', 'sets', 'setOf', 'tagdir']);
        if (p.mode === 'fa' && p.ask === 'setOf') p.ask = 'tagdir';
        p.extra = rnd(1, 2);
      }
      const d = derive(p);
      if (d.kE > d.linesE || d.off < 1 || d.tag < 2) continue;
      if (p.mode === 'k' && d.kE >= d.linesE) continue;
      p.d = d;
      p.bits = Array.from({ length: d.A }, () => rnd(0, 1));
      p.bits[0] = 1; // keep the hex readable (no leading zero run)
      p.addrVal = bitsVal(p.bits, 0, d.A);
      p.setVal = Math.floor(p.addrVal / P2(d.off)) % P2(d.setsE);
      p.tagVal = Math.floor(p.addrVal / P2(d.off + d.setsE));
      p.ans = solveAsk(p);
      return p;
    }
    throw new Error('genSplit failed');
  }
  function solveAsk(p) {
    const d = p.d;
    if (p.ask === 'tag') return d.tag;
    if (p.ask === 'sets') return p.mode === 'k' ? P2(d.setsE) : P2(d.linesE);
    if (p.ask === 'setOf') return p.setVal;
    return P2(d.linesE) * (d.tag + p.extra);
  }

  // ---------- access sequence: generator + LRU simulator ----------
  function simSeq(blocks, S, k) {
    const sets = Array.from({ length: S }, () => []);
    return blocks.map(b => {
      const s = b % S, a = sets[s], i = a.indexOf(b);
      const hit = i >= 0; let ev = null;
      if (hit) a.splice(i, 1); else if (a.length === k) ev = a.shift();
      a.push(b);
      return { hit, set: s, after: a.slice(), ev };
    });
  }
  function genSeq(level) {
    for (let t = 0; t < 5000; t++) {
      const p = { kind: 'seq' };
      if (level <= 2) { p.k = 1; p.lines = pick([4, 8]); p.form = 'block'; p.len = 8; p.bE = 0; }
      else { p.k = pick([1, 2, 2]); p.lines = pick([4, 8]); p.form = 'hex'; p.bE = pick([4, 5]); p.len = 10; }
      p.S = p.lines / p.k;
      const tsets = shuffle(Array.from({ length: p.S }, (_, i) => i)).slice(0, Math.min(p.S, rnd(2, 3)));
      const pool = [];
      tsets.forEach(s => { shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, p.k + 1).forEach(m => pool.push(s + p.S * m)); });
      const seq = [pick(pool)];
      while (seq.length < p.len) seq.push(Math.random() < 0.45 ? pick(seq.slice(-3)) : pick(pool));
      const res = simSeq(seq, p.S, p.k);
      const hits = res.filter(r => r.hit).length;
      if (hits < 2 || hits > p.len - 3) continue;
      if (p.k === 2 && !res.some(r => r.ev !== null)) continue;
      p.blocks = seq; p.res = res;
      p.addrs = seq.map(b => p.form === 'hex' ? b * P2(p.bE) + rnd(0, P2(p.bE) - 1) : b);
      p.ans = res.map(r => r.hit ? 'H' : 'M');
      return p;
    }
    throw new Error('genSeq failed');
  }
  const hex3 = n => '0x' + n.toString(16).toUpperCase().padStart(3, '0');

  // ---------- AMAT ----------
  function genAmat(level) {
    const p = { kind: 'amat', model: pick(['hier', 'sim']) };
    if (level <= 2) {
      p.levels = 1; p.t1 = pick([1, 2, 5, 10, 20]); p.h1 = pick([0.8, 0.85, 0.9, 0.95, 0.98, 0.99]); p.tm = pick([50, 80, 100, 120, 200]);
    } else {
      p.levels = 2; p.t1 = pick([1, 2, 4, 5]); p.h1 = pick([0.8, 0.85, 0.9, 0.95]); p.t2 = pick([10, 15, 20, 25, 40]);
      p.h2 = pick([0.6, 0.7, 0.75, 0.8, 0.9]); p.tm = pick([100, 150, 200, 400, 500]);
    }
    p.ans = amat(p, p.model); p.other = amat(p, p.model === 'hier' ? 'sim' : 'hier');
    return p;
  }
  function amat(p, model) {
    const m1 = 1 - p.h1;
    if (p.levels === 1) return model === 'hier' ? p.t1 + m1 * p.tm : p.h1 * p.t1 + m1 * p.tm;
    const m2 = 1 - p.h2;
    return model === 'hier' ? p.t1 + m1 * (p.t2 + m2 * p.tm) : p.h1 * p.t1 + m1 * p.h2 * p.t2 + m1 * m2 * p.tm;
  }

  function genRound(level) {
    let qs;
    if (level === 1) qs = Array.from({ length: 10 }, () => genSplit(1));
    else if (level === 2) qs = [].concat(Array.from({ length: 7 }, () => genSplit(2)), [genSeq(2), genSeq(2), genAmat(2)]);
    else qs = [].concat(Array.from({ length: 5 }, () => genSplit(3)), [genSeq(3), genSeq(3), genSeq(3), genAmat(3), genAmat(3)]);
    return shuffle(qs);
  }

  // ---------- styles ----------
  function injectStyle() {
    if (document.getElementById(ROOT + '-style')) return;
    const st = document.createElement('style'); st.id = ROOT + '-style';
    const R = '.' + ROOT;
    st.textContent = [
      R + '{display:flex;flex-direction:column;gap:16px}',
      R + ' .ca-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}',
      R + ' .ca-lv button[aria-pressed="true"]{background:var(--pen);color:var(--sheet);border-color:var(--pen)}',
      R + ' .ca-stat{gap:8px 18px;font-family:var(--f-mono)}',
      R + ' details.ca-how summary{cursor:pointer;font-weight:700}',
      R + ' details.ca-how ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
      R + ' .ca-q{white-space:pre-wrap;font-size:1.02rem;line-height:1.6;overflow-wrap:anywhere;margin:0}',
      R + ' .ca-hint{border-left:3px solid var(--marker);padding-left:10px;font-size:.9rem;color:var(--muted)}',
      R + ' .ca-bits{display:flex;overflow-x:auto;padding:2px 0 8px;max-width:100%}',
      R + ' .ca-bit{flex:0 0 auto;min-width:22px;height:44px;border:1px solid var(--line);border-right-width:1px;background:var(--sheet);color:var(--ink);font:600 .9rem var(--f-mono);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 3px;line-height:1.1}',
      R + ' .ca-bit small{font-size:.6rem;color:var(--muted);font-weight:600}',
      R + ' .ca-bit.T,' + R + ' .ca-seg.T{background:var(--marker)}',
      R + ' .ca-bit.I,' + R + ' .ca-seg.I{background:var(--pen-soft);color:var(--pen)}',
      R + ' .ca-bit.O,' + R + ' .ca-seg.O{background:var(--paper)}',
      R + ' .ca-bit.cut{border-right:3px solid var(--ink)}',
      R + ' .ca-mode button[aria-pressed="true"]{background:var(--ink);color:var(--sheet);border-color:var(--ink)}',
      R + ' .ca-step{display:inline-flex;align-items:center;gap:6px}',
      R + ' .ca-step .btn{padding:4px 10px}',
      R + ' .ca-sum{font:600 .9rem var(--f-mono)}',
      R + ' .ca-split{display:flex;flex-wrap:wrap;gap:0;font-family:var(--f-mono);margin:4px 0}',
      R + ' .ca-seg{display:flex;flex-direction:column;padding:4px 8px;border:1px solid var(--line);overflow-wrap:anywhere;max-width:100%}',
      R + ' .ca-seg b{font-size:.92rem;letter-spacing:.06em}',
      R + ' .ca-seg small{font-size:.72rem;font-weight:600}',
      R + ' .ca-refs{display:flex;flex-wrap:wrap;gap:6px}',
      R + ' .ca-ref{display:flex;flex-direction:column;align-items:center;min-width:58px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--sheet);cursor:pointer;font-family:var(--f-mono)}',
      R + ' .ca-ref .v{font-weight:800;font-size:1rem}',
      R + ' .ca-ref.H{background:var(--pen-soft);border-color:var(--pen)}',
      R + ' .ca-ref.M{background:var(--marker);border-color:var(--ink)}',
      R + ' .ca-in{display:flex;flex-direction:column;gap:4px;font-size:.88rem;font-weight:600}',
      R + ' .ca-in input{font:600 1.05rem var(--f-mono);width:220px;max-width:100%;background:var(--sheet);border:1px solid var(--line);border-radius:6px;padding:7px 10px}',
      R + ' .ca-exp{display:flex;flex-direction:column;gap:6px}',
      R + ' .ca-exp p{margin:0}',
      R + ' .ca-exp table{font-size:.85rem}',
      R + ' .ca-exp td,' + R + ' .ca-exp th{padding:5px 8px;white-space:nowrap}',
      R + ' .ca-tree{font:.88rem/1.5 var(--f-mono)}',
      R + ' .ca-big{font:800 2.2rem var(--f-display);line-height:1}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------- text ----------
  const HOW = {
    english: [
      'Address (high → low bits) = <b>TAG | INDEX | OFFSET</b>.',
      'OFFSET = log₂(block size ÷ addressable unit): count bytes if byte-addressable, words if word-addressable.',
      'Lines = cache size ÷ block size. Sets = lines ÷ k (direct-mapped: k = 1, so sets = lines; fully associative: 1 set).',
      'INDEX = log₂(sets). TAG = address bits − INDEX − OFFSET.',
      'Set of an address = ⌊address ÷ block size⌋ mod sets = block number mod sets.',
      'Tag directory = lines × (tag bits + valid/dirty bits).',
      'AMAT, hierarchical (look-through): t₁ + m₁(t₂ + m₂·t_m). Simultaneous (parallel): h₁t₁ + m₁h₂t₂ + m₁m₂t_m.'
    ],
    hinglish: [
      'Address ko high se low bits tak todo: <b>TAG | INDEX | OFFSET</b>.',
      'OFFSET = log₂(block size ÷ addressable unit): byte-addressable ho to bytes gino, word-addressable ho to words.',
      'Lines = cache size ÷ block size. Sets = lines ÷ k (direct-mapped mein k = 1 yaani sets = lines; fully associative mein sirf 1 set).',
      'INDEX = log₂(sets). TAG = baaki bache bits = address bits − INDEX − OFFSET.',
      'Kisi address ka set = ⌊address ÷ block size⌋ mod sets = block number mod sets.',
      'Tag directory = lines × (tag bits + valid/dirty bits).',
      'AMAT hierarchical (pehle L1, phir aage): t₁ + m₁(t₂ + m₂·t_m). Simultaneous (sab parallel): h₁t₁ + m₁h₂t₂ + m₁m₂t_m.'
    ]
  };

  function modeName(p, en) {
    if (p.mode === 'dm') return en ? 'direct-mapped' : 'direct-mapped';
    if (p.mode === 'fa') return en ? 'fully associative' : 'fully associative';
    return P2(p.kE) + '-way set associative';
  }
  function addrDesc(p, en) {
    const d = p.d;
    if (!p.memGiven) return en ? `The machine is byte-addressable with a ${d.A}-bit physical address.` : `Machine byte-addressable hai, physical address ${d.A} bits ka hai.`;
    if (p.wE === 0) return en ? `Main memory is ${sizeStr(p.memE)}, byte-addressable.` : `Main memory ${sizeStr(p.memE)} ki hai, byte-addressable.`;
    return en ? `Main memory is ${sizeStr(p.memE)}, word-addressable with ${P2(p.wE)}-byte words (each address names one word).`
      : `Main memory ${sizeStr(p.memE)} ki hai, word-addressable, word size ${P2(p.wE)} bytes (har address ek poore word ko point karta hai).`;
  }
  function askText(p, en) {
    const hex = '0x' + bitsHex(p.bits);
    if (p.ask === 'tag') return en ? 'How many TAG bits?' : 'TAG kitne bits ka hai?';
    if (p.ask === 'sets') {
      if (p.mode === 'k') return en ? 'How many sets does the cache have?' : 'Cache mein kitne sets hain?';
      return en ? 'How many lines (blocks) does the cache have?' : 'Cache mein kitni lines (blocks) hain?';
    }
    if (p.ask === 'setOf') return p.mode === 'dm'
      ? (en ? `Which cache line (in decimal) does address ${hex} map to?` : `Address ${hex} kaunsi cache line (decimal mein) mein jayega?`)
      : (en ? `Which set (in decimal) does address ${hex} map to?` : `Address ${hex} kaunse set (decimal mein) mein jayega?`);
    const ex = p.extra === 1 ? (en ? '1 valid bit' : '1 valid bit') : (en ? '1 valid bit and 1 dirty bit' : '1 valid bit aur 1 dirty bit');
    return en ? `Besides the tag, each line stores ${ex}. What is the total size of the tag directory in bits?`
      : `Har line mein tag ke alawa ${ex} bhi store hota hai. Poori tag directory kitne bits ki hai?`;
  }

  function splitHTML(p, off, idx) {
    const A = p.d.A, bits = p.bits;
    const tagB = bits.slice(0, A - idx - off), idxB = bits.slice(A - idx - off, A - off), offB = bits.slice(A - off);
    const seg = (cls, b, lab) => b.length ? `<span class="ca-seg ${cls}"><b>${b.join('')}</b><small>${lab}</small></span>` : '';
    return '<div class="ca-split">' +
      seg('T', tagB, `TAG · ${tagB.length} bits = 0x${bitsHex(tagB)}`) +
      seg('I', idxB, `INDEX · ${idxB.length} bits = ${bitsVal(idxB, 0, idxB.length)}`) +
      seg('O', offB, `OFFSET · ${offB.length} bits = ${bitsVal(offB, 0, offB.length)}`) + '</div>';
  }

  function explainSplit(p, a, en) {
    const d = p.d, L = [];
    const W = P2(p.wE), B = P2(p.bE);
    if (!p.memGiven) L.push(en ? `1. Address = ${d.A} bits (given).` : `1. Address = ${d.A} bits (diya hua hai).`);
    else if (p.wE === 0) L.push(en ? `1. Memory = ${sizeStr(p.memE)} = ${pw(p.memE)} bytes, byte-addressable → address bits = log₂ ${pw(p.memE)} = ${d.A}.`
      : `1. Memory = ${sizeStr(p.memE)} = ${pw(p.memE)} bytes, byte-addressable → address bits = log₂ ${pw(p.memE)} = ${d.A}.`);
    else L.push(en ? `1. Memory = ${sizeStr(p.memE)} = ${pw(p.memE)} B, word = ${W} B = ${pw(p.wE)} B, word-addressable → number of words = ${pw(p.memE)} / ${pw(p.wE)} = ${pw(d.A)} → address bits = ${d.A}.`
      : `1. Memory = ${sizeStr(p.memE)} = ${pw(p.memE)} B, word = ${W} B = ${pw(p.wE)} B, word-addressable hai → words = ${pw(p.memE)} / ${pw(p.wE)} = ${pw(d.A)} → address bits = ${d.A}.`);
    if (p.wE === 0) L.push(`2. Block = ${B} B = ${pw(p.bE)} B → OFFSET = log₂ ${B} = <b>${d.off}</b> bits.`);
    else L.push(en ? `2. Block = ${B} B = ${B}/${W} = ${P2(d.off)} words → OFFSET = log₂ ${P2(d.off)} = <b>${d.off}</b> bits (offset counts words here, not bytes).`
      : `2. Block = ${B} B = ${B}/${W} = ${P2(d.off)} words → OFFSET = log₂ ${P2(d.off)} = <b>${d.off}</b> bits (yahan offset words ginta hai, bytes nahi).`);
    L.push(`3. Lines = ${sizeStr(p.cE)} / ${B} B = ${pw(p.cE)} / ${pw(p.bE)} = ${pw(d.linesE)} = ${P2(d.linesE)}.`);
    if (p.mode === 'dm') L.push(en ? `4. Direct-mapped: every line is its own set → sets = lines = ${P2(d.setsE)} → INDEX = log₂ ${P2(d.setsE)} = <b>${d.setsE}</b> bits.`
      : `4. Direct-mapped: har line apna khud ka set hai → sets = lines = ${P2(d.setsE)} → INDEX = log₂ ${P2(d.setsE)} = <b>${d.setsE}</b> bits.`);
    else if (p.mode === 'fa') L.push(en ? `4. Fully associative: a block may go in any line, so there is only 1 set → INDEX = log₂ 1 = <b>0</b> bits.`
      : `4. Fully associative: block kisi bhi line mein ja sakta hai, sirf 1 set hai → INDEX = log₂ 1 = <b>0</b> bits.`);
    else L.push(en ? `4. ${P2(d.kE)}-way: sets = lines / k = ${P2(d.linesE)} / ${P2(d.kE)} = ${P2(d.setsE)} → INDEX = log₂ ${P2(d.setsE)} = <b>${d.setsE}</b> bits.`
      : `4. ${P2(d.kE)}-way: sets = lines / k = ${P2(d.linesE)} / ${P2(d.kE)} = ${P2(d.setsE)} → INDEX = log₂ ${P2(d.setsE)} = <b>${d.setsE}</b> bits.`);
    L.push(`5. TAG = ${d.A} − ${d.setsE} − ${d.off} = <b>${d.tag}</b> bits.`);
    L.push((en ? '6. Address 0x' + bitsHex(p.bits) + ' split into fields:' : '6. Address 0x' + bitsHex(p.bits) + ' ko fields mein todo:') + splitHTML(p, d.off, d.setsE));
    // the specific ask
    if (p.ask === 'tag') L.push(en ? `7. Answer: TAG = <b>${d.tag}</b> bits.` : `7. Answer: TAG = <b>${d.tag}</b> bits.`);
    else if (p.ask === 'sets') L.push(en ? `7. Answer: <b>${p.ans}</b> ${p.mode === 'k' ? 'sets' : 'lines'}.` : `7. Answer: <b>${p.ans}</b> ${p.mode === 'k' ? 'sets' : 'lines'}.`);
    else if (p.ask === 'setOf') {
      const idxB = p.bits.slice(d.A - d.off - d.setsE, d.A - d.off).join('');
      L.push(en ? `7. INDEX field = ${idxB}₂ = <b>${p.setVal}</b> → ${p.mode === 'dm' ? 'line' : 'set'} ${p.setVal}. (Same as block number mod sets: ⌊address / ${pw(d.off)}⌋ mod ${P2(d.setsE)} = ${p.setVal}.)`
        : `7. INDEX field = ${idxB}₂ = <b>${p.setVal}</b> → ${p.mode === 'dm' ? 'line' : 'set'} ${p.setVal}. (Yahi block number mod sets hai: ⌊address / ${pw(d.off)}⌋ mod ${P2(d.setsE)} = ${p.setVal}.)`);
    } else {
      const per = d.tag + p.extra;
      L.push(en ? `7. Bits per line in the directory = tag ${d.tag} + ${p.extra} = ${per}. Lines = ${P2(d.linesE)}. Total = ${P2(d.linesE)} × ${per} = <b>${p.ans}</b> bits.`
        : `7. Directory mein har line ke bits = tag ${d.tag} + ${p.extra} = ${per}. Lines = ${P2(d.linesE)}. Total = ${P2(d.linesE)} × ${per} = <b>${p.ans}</b> bits.`);
    }
    // diagnose a wrong split
    if (a && (a.off !== d.off || a.idx !== d.setsE)) {
      const tips = [];
      if (a.off !== d.off) {
        if (p.wE > 0 && a.off === p.bE) tips.push(en ? `You used the byte offset (log₂ ${B} = ${p.bE}). In a word-addressable memory the offset selects a word: log₂(${B}/${W}) = ${d.off}.` : `Aapne byte offset liya (log₂ ${B} = ${p.bE}). Word-addressable memory mein offset word chunta hai: log₂(${B}/${W}) = ${d.off}.`);
        else tips.push(en ? `OFFSET must be log₂(units per block) = ${d.off}, you set ${a.off}.` : `OFFSET = log₂(block mein units) = ${d.off} hona chahiye, aapne ${a.off} rakha.`);
      }
      if (a.idx !== d.setsE) {
        if (p.mode === 'fa') tips.push(en ? 'Fully associative cache has one set, so there is no INDEX field (0 bits) — everything above the offset is TAG.' : 'Fully associative mein ek hi set hota hai, INDEX field hota hi nahi (0 bits) — offset ke upar sab TAG hai.');
        else if (p.mode === 'k' && a.idx === d.linesE) tips.push(en ? `You used log₂(lines) = ${d.linesE}. In a set-associative cache the index picks a SET: log₂(lines/k) = log₂ ${P2(d.setsE)} = ${d.setsE}.` : `Aapne log₂(lines) = ${d.linesE} liya. Set-associative mein index SET chunta hai: log₂(lines/k) = log₂ ${P2(d.setsE)} = ${d.setsE}.`);
        else tips.push(en ? `INDEX must be log₂(number of sets) = ${d.setsE}, you set ${a.idx}.` : `INDEX = log₂(sets) = ${d.setsE} hona chahiye, aapne ${a.idx} rakha.`);
      }
      L.push('<b>' + (en ? 'Where it went wrong: ' : 'Galti kahan hui: ') + '</b>' + tips.join(' '));
    }
    return L.map(x => '<p>' + x + '</p>').join('');
  }

  function explainSeq(p, en) {
    const B = P2(p.bE);
    const head = en ? ['#', 'Ref', 'Block', 'Set', 'Result', 'Set after (LRU → MRU)'] : ['#', 'Ref', 'Block', 'Set', 'Result', 'Set ke baad (LRU → MRU)'];
    const rows = p.res.map((r, i) => {
      const b = p.blocks[i];
      const blk = p.form === 'hex' ? `⌊${p.addrs[i]}/${B}⌋ = ${b}` : String(b);
      const ref = p.form === 'hex' ? `${hex3(p.addrs[i])} = ${p.addrs[i]}` : String(b);
      const res = r.hit ? '✓ HIT' : '✗ MISS' + (r.ev !== null ? (en ? ` (evict ${r.ev})` : ` (${r.ev} bahar)`) : '');
      return `<tr><td>${i + 1}</td><td class="mono">${ref}</td><td class="mono">${blk}</td><td class="mono">${b} mod ${p.S} = ${r.set}</td><td>${res}</td><td class="mono">[${r.after.join(', ')}]</td></tr>`;
    }).join('');
    const hits = p.res.filter(r => r.hit).length;
    const intro = p.k === 1
      ? (en ? `Direct-mapped, ${p.lines} lines → set (line) = block mod ${p.S}. A miss simply replaces whatever is in that line.` : `Direct-mapped, ${p.lines} lines → line = block mod ${p.S}. Miss par us line ka purana block seedha replace hota hai.`)
      : (en ? `2-way, ${p.lines} lines → ${p.S} sets, set = block mod ${p.S}. On a miss in a full set, the least-recently-used block (leftmost) is evicted; every access moves the block to the MRU end.` : `2-way, ${p.lines} lines → ${p.S} sets, set = block mod ${p.S}. Full set mein miss ho to least-recently-used block (sabse left) nikalta hai; har access block ko MRU end par le jaata hai.`);
    const addrNote = p.form === 'hex' ? (en ? `<p>Block number = ⌊byte address / ${B}⌋ (block size ${B} B).</p>` : `<p>Block number = ⌊byte address / ${B}⌋ (block size ${B} B).</p>`) : '';
    return `<p>${intro}</p>${addrNote}<div class="tscroll"><table><thead><tr>${head.map(h => '<th>' + h + '</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div>` +
      `<p>${en ? 'Hits' : 'Hits'} = ${hits}, ${en ? 'misses' : 'misses'} = ${p.len - hits}, hit ratio = ${hits}/${p.len} = ${fmt(hits / p.len)}.</p>`;
  }

  function amatText(p, en) {
    const hier = p.model === 'hier';
    if (p.levels === 1) {
      const m = en ? (hier ? 'hierarchical access: the cache is checked first and memory is accessed only after a miss' : 'simultaneous access: cache and memory are looked up in parallel, so a miss costs only the memory time')
        : (hier ? 'hierarchical access: pehle cache check hota hai, miss hone par hi memory access hoti hai' : 'simultaneous access: cache aur memory dono parallel mein dekhe jaate hain, miss par sirf memory time lagta hai');
      return en ? `Cache access time = ${p.t1} ns, main-memory access time = ${p.tm} ns, cache hit ratio = ${p.h1}. Assume ${m}. Find the average memory access time in ns (2 decimals).`
        : `Cache access time = ${p.t1} ns, main memory access time = ${p.tm} ns, cache hit ratio = ${p.h1}. Maan lo ${m}. Average memory access time (ns, 2 decimal tak) nikalo.`;
    }
    const m = en ? (hier ? 'HIERARCHICAL access (L1 is checked, then L2 on an L1 miss, then memory on an L2 miss; times add up)' : 'SIMULTANEOUS access (all levels are searched in parallel; a request costs only the time of the level that supplies it)')
      : (hier ? 'HIERARCHICAL access (pehle L1, L1 miss par L2, L2 miss par memory; time judta jaata hai)' : 'SIMULTANEOUS access (sab levels parallel mein search; jo level data deta hai sirf uska time lagta hai)');
    return en ? `L1: access ${p.t1} ns, hit ratio ${p.h1}. L2: access ${p.t2} ns, local hit ratio ${p.h2}. Main memory: ${p.tm} ns. Assume ${m}. Find the AMAT in ns (2 decimals).`
      : `L1: access ${p.t1} ns, hit ratio ${p.h1}. L2: access ${p.t2} ns, local hit ratio ${p.h2}. Main memory: ${p.tm} ns. Maan lo ${m}. AMAT ns mein (2 decimal tak) nikalo.`;
  }
  function explainAmat(p, en) {
    const L = [], m1 = r2(1 - p.h1);
    if (p.levels === 1) {
      if (p.model === 'hier') {
        L.push(en ? `Hit: ${p.t1} ns. Miss: check cache first (${p.t1}) then memory (${p.tm}) = ${p.t1 + p.tm} ns.` : `Hit: ${p.t1} ns. Miss: pehle cache (${p.t1}) phir memory (${p.tm}) = ${p.t1 + p.tm} ns.`);
        L.push(`AMAT = h·t_c + (1−h)(t_c + t_m) = ${p.h1}×${p.t1} + ${m1}×${p.t1 + p.tm} = ${fmt(p.h1 * p.t1)} + ${fmt(m1 * (p.t1 + p.tm))} = <b>${fmt(p.ans)}</b> ns.`);
        L.push(en ? `(Shortcut: t_c + (1−h)·t_m = ${p.t1} + ${m1}×${p.tm}.)` : `(Shortcut: t_c + (1−h)·t_m = ${p.t1} + ${m1}×${p.tm}.)`);
      } else {
        L.push(en ? `Hit: ${p.t1} ns. Miss: memory was already being read in parallel → ${p.tm} ns.` : `Hit: ${p.t1} ns. Miss: memory parallel mein pehle se padh rahe the → ${p.tm} ns.`);
        L.push(`AMAT = h·t_c + (1−h)·t_m = ${p.h1}×${p.t1} + ${m1}×${p.tm} = ${fmt(p.h1 * p.t1)} + ${fmt(m1 * p.tm)} = <b>${fmt(p.ans)}</b> ns.`);
      }
    } else {
      const m2 = r2(1 - p.h2);
      const r4 = x => Math.round(x * 10000) / 10000;
      const pr = [[p.h1, 'L1 hit'], [r4(m1 * p.h2), 'L1 miss, L2 hit'], [r4(m1 * m2), 'L1 miss, L2 miss']];
      const tm = p.model === 'hier' ? [p.t1, p.t1 + p.t2, p.t1 + p.t2 + p.tm] : [p.t1, p.t2, p.tm];
      L.push(en ? 'Probability tree (L2 hit ratio is local, i.e. of the requests that reach L2):' : 'Probability tree (L2 ka hit ratio local hai, yaani jo requests L2 tak pahunchti hain unka):');
      L.push('<span class="ca-tree">' + pr.map((x, i) => `${x[1]}: p = ${i === 0 ? p.h1 : (i === 1 ? m1 + '×' + p.h2 : m1 + '×' + m2) + ' = ' + x[0]}, time = ${p.model === 'hier' ? ['t₁', 't₁+t₂', 't₁+t₂+t_m'][i] : ['t₁', 't₂', 't_m'][i]} = ${tm[i]} ns`).join('<br>') + '</span>');
      L.push(`AMAT = ${pr.map((x, i) => x[0] + '×' + tm[i]).join(' + ')} = <b>${fmt(p.ans)}</b> ns.`);
      if (p.model === 'hier') L.push(en ? `(Same as t₁ + m₁(t₂ + m₂·t_m) = ${p.t1} + ${m1}×(${p.t2} + ${m2}×${p.tm}).)` : `(Yahi t₁ + m₁(t₂ + m₂·t_m) = ${p.t1} + ${m1}×(${p.t2} + ${m2}×${p.tm}) hai.)`);
    }
    L.push(en ? `If you had used the ${p.model === 'hier' ? 'simultaneous' : 'hierarchical'} model you would get ${fmt(p.other)} ns — always read which access model the question states.`
      : `Agar ${p.model === 'hier' ? 'simultaneous' : 'hierarchical'} model lagate to ${fmt(p.other)} ns aata — question mein kaunsa access model diya hai, dhyan se padho.`);
    return L.map(x => '<p>' + x + '</p>').join('');
  }

  // ---------- game object ----------
  const game = {
    id: GID,
    title: 'Cache Address Split',
    subj: 'coa',
    topics: ['Cache memory (mapping & organisation)', 'Cache performance & multilevel AMAT'],
    blurb: 'Cut addresses into TAG | INDEX | OFFSET, trace hits and misses, and compute AMAT — GATE asks one of these almost every year.',
    mount(root, api) {
      injectStyle();
      const en = () => api.lang() !== 'hinglish';
      const S = { level: 1, qs: [], i: 0, correct: 0, t0: 0, timer: null, done: false, wrong: {}, ans: null, collect: null };
      root.innerHTML = `<div class="${ROOT}">
        <div class="panel">
          <div class="ca-head"><h2>Cache Address Split</h2>
            <div class="row ca-lv" role="group" aria-label="Level">${[1, 2, 3].map(l => `<button type="button" class="btn" data-lv="${l}" aria-pressed="false">Level ${l}</button>`).join('')}</div></div>
          <div class="row small ca-stat" aria-live="polite"><span class="ca-prog"></span><span class="ca-score"></span><span class="ca-time">00:00</span></div>
        </div>
        <details class="panel ca-how"><summary>How it works</summary><ul class="ca-howbody"></ul></details>
        <div class="panel ca-main"></div></div>`;
      const $ = s => root.querySelector(s);
      const main = $('.ca-main');
      root.querySelectorAll('.ca-lv button').forEach(b => b.addEventListener('click', () => start(+b.dataset.lv)));

      function tick() { if (!S.done) $('.ca-time').textContent = '⏱ ' + mmss(Math.floor((Date.now() - S.t0) / 1000)); }
      function status() {
        $('.ca-prog').textContent = (en() ? 'Question ' : 'Sawaal ') + Math.min(S.i + 1, S.qs.length) + ' / ' + S.qs.length;
        $('.ca-score').textContent = 'Score ' + S.correct;
      }
      function start(level) {
        S.level = level; S.qs = genRound(level); S.i = 0; S.correct = 0; S.wrong = {}; S.done = false; S.t0 = Date.now();
        root.querySelectorAll('.ca-lv button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lv === level)));
        $('.ca-howbody').innerHTML = HOW[en() ? 'english' : 'hinglish'].map(x => '<li>' + x + '</li>').join('');
        $('.ca-how').open = level === 1;
        clearInterval(S.timer); S.timer = setInterval(tick, 1000); tick();
        show();
      }

      function show() {
        status();
        const p = S.qs[S.i], E = en();
        main.innerHTML = '';
        const q = document.createElement('div'); q.className = 'row'; q.style.cssText = 'flex-direction:column;align-items:stretch;gap:12px';
        main.appendChild(q);
        if (p.kind === 'split') S.collect = renderSplit(q, p, E);
        else if (p.kind === 'seq') S.collect = renderSeq(q, p, E);
        else S.collect = renderAmat(q, p, E);
        const bar = document.createElement('div'); bar.className = 'row';
        bar.innerHTML = `<button type="button" class="btn primary ca-submit">${E ? 'Check answer' : 'Answer check karo'}</button><span class="small muted ca-msg" role="status"></span>`;
        main.appendChild(bar);
        const fb = document.createElement('div'); fb.className = 'ca-fb'; main.appendChild(fb);
        bar.querySelector('.ca-submit').addEventListener('click', () => submit(bar, fb));
      }

      function submit(bar, fb) {
        const p = S.qs[S.i], E = en();
        const a = S.collect();
        bar.querySelector('.ca-msg').textContent = a.err || '';
        if (a.err) return;
        let ok, exp, yours = '';
        if (p.kind === 'split') {
          const okSplit = a.off === p.d.off && a.idx === p.d.setsE;
          const okNum = a.num === p.ans;
          ok = okSplit && okNum;
          yours = `<p class="small">${E ? 'Your split' : 'Aapka split'}: TAG ${p.d.A - a.idx - a.off} | INDEX ${a.idx} | OFFSET ${a.off} — ${okSplit ? '✓' : '✗'} · ${E ? 'your answer' : 'aapka answer'} ${a.num} ${okNum ? '✓' : '✗ (' + (E ? 'correct' : 'sahi') + ': ' + p.ans + ')'}</p>`;
          if (!okSplit) S.wrong.split = 1;
          if (!okNum) S.wrong['ask_' + p.ask] = 1;
          exp = explainSplit(p, a, E);
        } else if (p.kind === 'seq') {
          const bad = p.ans.map((x, i) => x === a.marks[i] ? null : i + 1).filter(x => x !== null);
          ok = bad.length === 0;
          yours = ok ? '' : `<p class="small">✗ ${E ? 'Wrong at reference' : 'Galat reference'} #${bad.join(', #')}.</p>`;
          if (!ok) S.wrong['seq' + p.k] = 1;
          exp = explainSeq(p, E);
        } else {
          ok = Math.abs(a.num - p.ans) <= 0.015 + 1e-9;
          yours = `<p class="small">${E ? 'Your answer' : 'Aapka answer'}: ${a.num} ${ok ? '✓' : '✗'} · ${E ? 'correct' : 'sahi'}: ${fmt(p.ans)}</p>`;
          if (!ok) S.wrong['amat' + p.levels] = 1;
          exp = explainAmat(p, E);
        }
        if (ok) S.correct++;
        status();
        main.querySelectorAll('button, input').forEach(el => { if (!el.classList.contains('ca-next')) el.disabled = true; });
        fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
        const last = S.i === S.qs.length - 1;
        fb.innerHTML = `<div class="verdict">${ok ? (E ? '✓ Correct' : '✓ Sahi jawab') : (E ? '✗ Not quite' : '✗ Galat')}</div>${yours}<div class="exp ca-exp">${exp}</div>
          <div class="row"><button type="button" class="btn primary ca-next">${last ? (E ? 'See summary' : 'Summary dekho') : (E ? 'Next question →' : 'Agla sawaal →')}</button></div>`;
        const nx = fb.querySelector('.ca-next'); nx.addEventListener('click', () => { S.i++; if (S.i >= S.qs.length) finish(); else show(); });
        nx.focus();
      }

      function finish() {
        S.done = true; clearInterval(S.timer);
        const secs = Math.floor((Date.now() - S.t0) / 1000), E = en(), tot = S.qs.length;
        const REV = {
          split: E ? 'Field split: OFFSET = log₂(block ÷ unit), INDEX = log₂(lines ÷ k), TAG = rest.' : 'Field split: OFFSET = log₂(block ÷ unit), INDEX = log₂(lines ÷ k), TAG = baaki.',
          ask_tag: E ? 'Tag bits = address − index − offset.' : 'Tag bits = address − index − offset.',
          ask_sets: E ? 'Lines = cache ÷ block; sets = lines ÷ associativity.' : 'Lines = cache ÷ block; sets = lines ÷ associativity.',
          ask_setOf: E ? 'Set of an address = block number mod sets (read the INDEX bits).' : 'Address ka set = block number mod sets (INDEX bits padho).',
          ask_tagdir: E ? 'Tag directory = lines × (tag + valid/dirty bits).' : 'Tag directory = lines × (tag + valid/dirty bits).',
          seq1: E ? 'Direct-mapped tracing: line = block mod lines; conflicting blocks kick each other out.' : 'Direct-mapped tracing: line = block mod lines; ek hi line wale blocks ek doosre ko nikaalte hain.',
          seq2: E ? 'Set-associative LRU: update recency on every hit, evict the least recently used.' : 'Set-associative LRU: har hit par recency update karo, least recently used ko nikalo.',
          amat1: E ? 'Single-level AMAT: hierarchical t_c + (1−h)t_m vs simultaneous h·t_c + (1−h)t_m.' : 'Single-level AMAT: hierarchical t_c + (1−h)t_m vs simultaneous h·t_c + (1−h)t_m.',
          amat2: E ? 'Two-level AMAT with local hit ratios; hierarchical adds times, simultaneous does not.' : 'Two-level AMAT local hit ratio ke saath; hierarchical mein time judta hai, simultaneous mein nahi.'
        };
        const rev = Object.keys(S.wrong).map(k => '<li>' + REV[k] + '</li>').join('');
        main.innerHTML = `<p class="eyebrow">${E ? 'Round complete' : 'Round khatam'} · Level ${S.level}</p>
          <div class="ca-big">${S.correct} / ${tot}</div>
          <p class="muted" style="margin:0">${E ? 'Time' : 'Samay'}: ${mmss(secs)}</p>
          ${rev ? `<div><b>${E ? 'Revise' : 'Revise karo'}:</b><ul>${rev}</ul></div>` : `<p style="margin:0">${E ? 'Clean round — nothing to revise. Try the next level.' : 'Ek bhi galti nahi — agla level try karo.'}</p>`}
          <div class="row"><button type="button" class="btn ca-again">${E ? 'Play again' : 'Phir se khelo'}</button>${S.level < 3 ? `<button type="button" class="btn primary ca-nextlv">${E ? 'Next level' : 'Agla level'} →</button>` : ''}</div>`;
        main.querySelector('.ca-again').addEventListener('click', () => start(S.level));
        const nl = main.querySelector('.ca-nextlv'); if (nl) nl.addEventListener('click', () => start(S.level + 1));
        $('.ca-prog').textContent = (E ? 'Done ' : 'Khatam ') + tot + ' / ' + tot;
        try { api.done({ correct: S.correct, total: tot, level: S.level, seconds: secs }); } catch (e) { /* host error shouldn't break the game */ }
      }

      // ----- question renderers: each returns a collect() function -----
      function numInput(box, label) {
        const w = document.createElement('label'); w.className = 'ca-in';
        w.innerHTML = `<span>${label}</span><input type="text" inputmode="decimal" autocomplete="off">`;
        box.appendChild(w); return w.querySelector('input');
      }
      function renderSplit(box, p, E) {
        const d = p.d, A = d.A;
        const assoc = modeName(p, E);
        const unitNote = p.wE ? '' : '';
        const txt = document.createElement('p'); txt.className = 'ca-q';
        txt.innerHTML = `${addrDesc(p, E)} ${E ? 'The cache is' : 'Cache'} <b>${sizeStr(p.cE)}</b>, <b>${assoc}</b>, ${E ? 'block size' : 'block size'} <b>${P2(p.bE)} B</b>.${unitNote}\n` +
          `${E ? 'Address' : 'Address'}: <b class="mono">0x${bitsHex(p.bits)}</b> (${A} bits)\n\n` +
          `<b>1.</b> ${p.mode === 'fa'
            ? (E ? 'Split the bits into TAG | OFFSET (a fully associative cache has no index — put both cuts at the same place).' : 'Bits ko TAG | OFFSET mein todo (fully associative mein index nahi hota — dono cut ek hi jagah rakho).')
            : (E ? 'Split the bits into TAG | INDEX | OFFSET.' : 'Bits ko TAG | INDEX | OFFSET mein todo.')} ` +
          (E ? 'Pick a cut, then click the bit just left of where it goes (or use − / +).' : 'Cut chuno, phir us bit par click karo jiske right mein cut lagana hai (ya − / + use karo).');
        box.appendChild(txt);
        if (S.level === 1) {
          const h = document.createElement('p'); h.className = 'ca-hint'; h.style.margin = '0';
          h.innerHTML = E ? 'Hint: OFFSET = log₂(block size), INDEX = log₂(number of sets), TAG = the remaining high bits.' : 'Hint: OFFSET = log₂(block size), INDEX = log₂(sets), TAG = baaki upar ke bits.';
          box.appendChild(h);
        }
        let bO = 0, bT = 0, mode = 'O';
        const ctl = document.createElement('div'); ctl.className = 'row ca-mode';
        ctl.innerHTML = `<span class="small muted">${E ? 'Placing' : 'Abhi laga rahe'}:</span>
          <button type="button" class="btn" data-m="O" aria-pressed="true">OFFSET | ${E ? 'cut' : 'cut'}</button>
          <button type="button" class="btn" data-m="T" aria-pressed="false">TAG | ${E ? 'cut' : 'cut'}</button>`;
        box.appendChild(ctl);
        const strip = document.createElement('div'); strip.className = 'ca-bits'; strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Address bits, most significant first');
        box.appendChild(strip);
        const steps = document.createElement('div'); steps.className = 'row';
        steps.innerHTML = `<span class="ca-step"><span class="small">OFFSET</span><button type="button" class="btn" data-s="o-" aria-label="Offset minus one">−</button><button type="button" class="btn" data-s="o+" aria-label="Offset plus one">+</button></span>
          <span class="ca-step"><span class="small">INDEX</span><button type="button" class="btn" data-s="i-" aria-label="Index minus one">−</button><button type="button" class="btn" data-s="i+" aria-label="Index plus one">+</button></span>
          <span class="ca-sum" aria-live="polite"></span>`;
        box.appendChild(steps);
        const cells = p.bits.map((b, j) => {
          const c = document.createElement('button'); c.type = 'button'; c.className = 'ca-bit'; c.dataset.j = j;
          c.addEventListener('click', () => {
            const r = A - 1 - j;
            if (mode === 'O') { bO = r; if (bT < bO) bT = bO; setMode('T'); } else { bT = r; if (bO > bT) bO = bT; }
            paint();
          });
          strip.appendChild(c); return c;
        });
        function setMode(m) { mode = m; ctl.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.m === m))); }
        ctl.querySelectorAll('[data-m]').forEach(x => x.addEventListener('click', () => setMode(x.dataset.m)));
        steps.querySelectorAll('[data-s]').forEach(x => x.addEventListener('click', () => {
          const idx = bT - bO;
          if (x.dataset.s === 'o-' && bO > 0) { bO--; bT--; }
          if (x.dataset.s === 'o+' && bT < A - 1) { bO++; bT++; }
          if (x.dataset.s === 'i-' && idx > 0) bT--;
          if (x.dataset.s === 'i+' && bT < A - 1) bT++;
          paint();
        }));
        function paint() {
          cells.forEach((c, j) => {
            const r = A - 1 - j, f = r < bO ? 'O' : r < bT ? 'I' : 'T';
            c.className = 'ca-bit ' + f + ((r === bO && bO > 0) || (r === bT && bT > 0) ? ' cut' : '');
            c.innerHTML = p.bits[j] + '<small>' + f + '</small>';
            c.setAttribute('aria-label', `bit ${r} = ${p.bits[j]}, ${f === 'T' ? 'tag' : f === 'I' ? 'index' : 'offset'}`);
          });
          steps.querySelector('.ca-sum').textContent = `TAG ${A - bT} | INDEX ${bT - bO} | OFFSET ${bO}`;
        }
        paint();
        const q2 = document.createElement('p'); q2.className = 'ca-q'; q2.innerHTML = '<b>2.</b> ' + askText(p, E); box.appendChild(q2);
        const inp = numInput(box, E ? 'Your answer' : 'Aapka answer');
        return () => {
          const n = parseNum(inp.value);
          if (bO === 0) return { err: E ? 'Place the OFFSET cut first.' : 'Pehle OFFSET cut lagao.' };
          if (!isFinite(n)) return { err: E ? 'Type a number for part 2.' : 'Part 2 mein number likho.' };
          return { off: bO, idx: bT - bO, num: n };
        };
      }
      function renderSeq(box, p, E) {
        const B = P2(p.bE);
        const org = p.k === 1 ? (E ? `direct-mapped cache with ${p.lines} lines` : `${p.lines} lines wala direct-mapped cache`) : (E ? `2-way set-associative cache with ${p.lines} lines (${p.S} sets) and LRU replacement` : `${p.lines} lines (${p.S} sets) wala 2-way set-associative cache, LRU replacement`);
        const txt = document.createElement('p'); txt.className = 'ca-q';
        txt.innerHTML = p.form === 'block'
          ? (E ? `A ${org}, initially empty, receives these <b>block numbers</b> in order. Mark each access HIT or MISS.` : `Ek ${org}, shuru mein khaali, ko yeh <b>block numbers</b> is order mein milte hain. Har access ko HIT ya MISS mark karo.`)
          : (E ? `A ${org}, block size ${B} B, initially empty, receives these <b>byte addresses</b> (hex) in order. Mark each access HIT or MISS.` : `Ek ${org}, block size ${B} B, shuru mein khaali, ko yeh <b>byte addresses</b> (hex) is order mein milte hain. Har access ko HIT ya MISS mark karo.`);
        box.appendChild(txt);
        if (S.level === 2) {
          const h = document.createElement('p'); h.className = 'ca-hint'; h.style.margin = '0';
          h.textContent = E ? `Hint: line = block mod ${p.S}. Keep a little table of what each line holds.` : `Hint: line = block mod ${p.S}. Har line mein kya pada hai, uski chhoti table banao.`;
          box.appendChild(h);
        }
        const marks = p.ans.map(() => null);
        const wrap = document.createElement('div'); wrap.className = 'ca-refs'; box.appendChild(wrap);
        const small = document.createElement('p'); small.className = 'small muted'; small.style.margin = '0';
        small.textContent = E ? 'Click a reference to cycle ? → HIT → MISS.' : 'Reference par click karo: ? → HIT → MISS.';
        box.appendChild(small);
        p.addrs.forEach((a, i) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'ca-ref';
          const lab = p.form === 'hex' ? hex3(a) : String(a);
          const paint = () => { b.className = 'ca-ref' + (marks[i] ? ' ' + marks[i] : ''); b.innerHTML = `<span class="small muted">#${i + 1}</span><span>${lab}</span><span class="v">${marks[i] === 'H' ? 'HIT' : marks[i] === 'M' ? 'MISS' : '?'}</span>`; b.setAttribute('aria-label', `Reference ${i + 1}, ${lab}: ${marks[i] === 'H' ? 'hit' : marks[i] === 'M' ? 'miss' : 'not marked'}`); };
          b.addEventListener('click', () => { marks[i] = marks[i] === 'H' ? 'M' : 'H'; paint(); });
          paint(); wrap.appendChild(b);
        });
        return () => marks.some(m => !m) ? { err: E ? 'Mark every reference first.' : 'Pehle har reference mark karo.' } : { marks: marks.slice() };
      }
      function renderAmat(box, p, E) {
        const txt = document.createElement('p'); txt.className = 'ca-q'; txt.innerHTML = amatText(p, E); box.appendChild(txt);
        const inp = numInput(box, E ? 'AMAT (ns)' : 'AMAT (ns)');
        return () => { const n = parseNum(inp.value); return isFinite(n) ? { num: n } : { err: E ? 'Type a number.' : 'Number likho.' }; };
      }

      start(1);
      return () => { clearInterval(S.timer); S.done = true; };
    },
    _t: { derive, genSplit, solveAsk, genSeq, simSeq, genAmat, amat, genRound, bitsHex, bitsVal, parseNum }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(game);
})();
