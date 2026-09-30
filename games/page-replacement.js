/* Page Fault Hunter — FIFO / LRU / Optimal page replacement, Belady's anomaly, EMAT.
   Plain JS, no libraries. See games/GAMES.md for the contract. */
(function () {
  'use strict';
  var ID = 'page-replacement';
  var ROUND = 10;

  /* ------------------------------------------------------------------ */
  /* Pure logic (no DOM)                                                 */
  /* ------------------------------------------------------------------ */
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function newMem(k) {
    return { frames: new Array(k).fill(null), loaded: new Array(k).fill(-1), used: new Array(k).fill(-1) };
  }
  function nextUse(refs, i, p) {
    for (var j = i + 1; j < refs.length; j++) if (refs[j] === p) return j;
    return Infinity;
  }

  // Look at reference i against the current memory. Does not mutate.
  // Returns { page, hit, slot } for a hit / free-frame fault, or
  // { page, hit:false, free:false, victims:[slots], victim:slot, info:[...] } when an eviction is needed.
  function analyse(mem, algo, refs, i) {
    var p = refs[i];
    var slot = mem.frames.indexOf(p);
    if (slot >= 0) return { page: p, hit: true, slot: slot };
    var free = mem.frames.indexOf(null);
    if (free >= 0) return { page: p, hit: false, free: true, slot: free };
    var info = mem.frames.map(function (q, s) {
      return { slot: s, page: q, loaded: mem.loaded[s], used: mem.used[s], next: nextUse(refs, i, q) };
    });
    var score = function (x) {
      return algo === 'FIFO' ? -x.loaded : algo === 'LRU' ? -x.used : x.next;
    };
    var best = -Infinity;
    info.forEach(function (x) { var v = score(x); if (v > best) best = v; });
    var victims = info.filter(function (x) { return score(x) === best; }).map(function (x) { return x.slot; });
    // Only OPT can tie (several pages never used again); canonical pick = the one loaded earliest.
    var victim = victims[0];
    victims.forEach(function (s) { if (info[s].loaded < info[victim].loaded) victim = s; });
    return { page: p, hit: false, free: false, victims: victims, victim: victim, info: info };
  }

  // Apply reference i (analysis a) to mem; victimSlot is used only when an eviction is needed.
  // Returns the column record used by the frame table and the explanation.
  function applyStep(mem, i, a, victimSlot) {
    var col = { t: i, page: a.page, hit: a.hit, free: !!a.free, a: a, evicted: null, slot: a.slot };
    if (a.hit) {
      mem.used[a.slot] = i;
    } else {
      var s = a.free ? a.slot : victimSlot;
      if (!a.free) col.evicted = mem.frames[s];
      col.slot = s;
      mem.frames[s] = a.page; mem.loaded[s] = i; mem.used[s] = i;
    }
    col.frames = mem.frames.slice();
    return col;
  }

  function solve(algo, refs, k, chooser) {
    var mem = newMem(k), cols = [], faults = 0;
    for (var i = 0; i < refs.length; i++) {
      var a = analyse(mem, algo, refs, i);
      var v = (!a.hit && !a.free) ? (chooser ? chooser(a) : a.victim) : null;
      cols.push(applyStep(mem, i, a, v));
      if (!a.hit) faults++;
    }
    return { faults: faults, cols: cols };
  }

  function genRefs(n, poolSize, k) {
    for (var tries = 0; tries < 200; tries++) {
      var refs = [], distinct = {};
      for (var i = 0; i < n; i++) {
        var p;
        do {
          if (refs.length >= 2 && Math.random() < 0.4) {
            var recent = refs.slice(-(k + 1));
            p = pick(recent);
          } else p = ri(0, poolSize - 1);
        } while (refs.length && p === refs[refs.length - 1]);
        refs.push(p); distinct[p] = 1;
      }
      if (Object.keys(distinct).length > k + 1) return refs;
    }
    return refs;
  }

  function fifoFaults(refs, k) { return solve('FIFO', refs, k).faults; }

  var CLASSIC = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  function genBelady() {
    var want = Math.random() < 0.5, refs = null;
    for (var t = 0; t < 4000 && !refs; t++) {
      var r = [];
      for (var i = 0; i < 12; i++) {
        var p;
        do { p = ri(1, 5); } while (r.length && p === r[r.length - 1]);
        r.push(p);
      }
      if ((fifoFaults(r, 4) > fifoFaults(r, 3)) === want) refs = r;
    }
    if (!refs) { // relabelled textbook string (always shows the anomaly)
      var perm = [1, 2, 3, 4, 5].sort(function () { return Math.random() - 0.5; });
      refs = CLASSIC.map(function (x) { return perm[x - 1]; });
    }
    return { kind: 'belady', algo: 'FIFO', refs: refs, ks: [3, 4] };
  }

  function genProblem(level) {
    if (level === 3 && Math.random() < 0.3) return genBelady();
    var algo, k, n, pool;
    if (level === 1) { algo = pick(['FIFO', 'LRU']); k = 3; n = ri(8, 10); pool = 6; }
    else if (level === 2) { algo = pick(['FIFO', 'LRU', 'OPT']); k = pick([3, 3, 4]); n = ri(11, 14); pool = 7; }
    else { algo = pick(['FIFO', 'LRU', 'OPT']); k = pick([3, 4]); n = ri(15, 20); pool = 8; }
    var prob = { kind: 'plain', algo: algo, refs: genRefs(n, pool, k), ks: [k], emat: null };
    if (level >= 2 && Math.random() < (level === 3 ? 0.35 : 0.25)) {
      prob.emat = { m: pick([50, 100, 150, 200]), S: pick([5, 10, 20, 50]) }; // m in ns, S in microseconds
    }
    return prob;
  }

  // Effective access time in ns: hit costs m ns, a fault costs S µs in total.
  function eat(faults, n, m, S) { return ((n - faults) / n) * m + (faults / n) * S * 1000; }

  var logic = { newMem: newMem, analyse: analyse, applyStep: applyStep, solve: solve, genProblem: genProblem, genBelady: genBelady, eat: eat };

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '.g-page-replacement{display:flex;flex-direction:column;gap:16px}',
    '.g-page-replacement .g-lv[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-page-replacement details.g-how summary{cursor:pointer;font-weight:700}',
    '.g-page-replacement details.g-how ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
    '.g-page-replacement .g-refs{display:flex;flex-wrap:wrap;gap:4px}',
    '.g-page-replacement .g-ref{font:600 .95rem var(--f-mono);min-width:30px;text-align:center;border:1px solid var(--line);border-radius:4px;padding:3px 5px;background:var(--sheet)}',
    '.g-page-replacement .g-ref.past{color:var(--muted)}',
    '.g-page-replacement .g-ref.cur{background:var(--marker);border-color:var(--ink);color:var(--ink)}',
    '.g-page-replacement table.g-ft{width:auto;border-collapse:collapse}',
    '.g-page-replacement table.g-ft th,.g-page-replacement table.g-ft td{font:600 .85rem var(--f-mono);text-align:center;padding:4px 6px;border:1px solid var(--line);min-width:30px;text-transform:none;letter-spacing:0}',
    '.g-page-replacement table.g-ft th{color:var(--muted);background:var(--paper);white-space:nowrap}',
    '.g-page-replacement table.g-ft td.new{background:var(--pen-soft);color:var(--pen)}',
    '.g-page-replacement table.g-ft td.hitc{background:var(--ok-bg);color:var(--ok)}',
    '.g-page-replacement table.g-ft td.h{color:var(--ok)}',
    '.g-page-replacement table.g-ft td.f{color:var(--bad)}',
    '.g-page-replacement table.g-ft td.cur{background:var(--marker);color:var(--ink)}',
    '.g-page-replacement table.g-ft td.err{text-decoration:underline wavy var(--bad)}',
    '.g-page-replacement .g-slots{display:flex;flex-wrap:wrap;gap:8px}',
    '.g-page-replacement .g-slot{font-family:var(--f-mono);min-width:72px;display:flex;flex-direction:column;align-items:center;gap:0;padding:6px 10px}',
    '.g-page-replacement .g-slot small{font:600 .68rem var(--f-mono);color:var(--muted)}',
    '.g-page-replacement .g-slot b{font-size:1.2rem}',
    '.g-page-replacement .g-slot:disabled{opacity:1;cursor:default}',
    '.g-page-replacement .g-slot.pickme{border-color:var(--pen);border-style:dashed}',
    '.g-page-replacement .g-msg{min-height:1.5em;font-weight:600}',
    '.g-page-replacement .g-msg.ok{color:var(--ok)}',
    '.g-page-replacement .g-msg.bad{color:var(--bad)}',
    '.g-page-replacement .g-hint{border-left:3px solid var(--marker);padding-left:10px}',
    '.g-page-replacement .g-field{display:flex;flex-direction:column;gap:4px;font-size:.88rem;font-weight:600}',
    '.g-page-replacement .g-field input{font:600 1.05rem var(--f-mono);width:180px;background:var(--sheet);border:1px solid var(--line);border-radius:6px;padding:7px 10px}',
    '.g-page-replacement ol.g-steps{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:3px;font-size:.9rem}',
    '.g-page-replacement ol.g-steps li.err{color:var(--bad)}',
    '.g-page-replacement .g-bigscore{font:800 2.4rem var(--f-display);line-height:1}',
    '.g-page-replacement .g-hf{min-width:110px}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('g-style-' + ID)) return;
    var s = document.createElement('style');
    s.id = 'g-style-' + ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var ALGO_NAME = { FIFO: 'FIFO', LRU: 'LRU', OPT: 'Optimal' };

  function mount(root, api) {
    injectStyle();
    var H = function () { return api.lang && api.lang() === 'hinglish'; };
    var L = function (en, hi) { return H() ? hi : en; };

    var level = 1, qi = 0, score = 0, tStart = 0, timer = null, q = null;
    var revise = {}; // key -> count

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'g-' + ID;
    root.appendChild(wrap);

    wrap.innerHTML =
      '<div class="panel">' +
      '  <div class="row" style="justify-content:space-between"><h2>Page Fault Hunter</h2><span class="chip">OS · Paging</span></div>' +
      '  <p class="small muted" data-blurb style="margin:0"></p>' +
      '  <div class="row" role="group" aria-label="Level">' +
      '    <span class="small" style="font-weight:600">Level</span>' +
      '    <button type="button" class="btn g-lv" data-lv="1">1 · Learn</button>' +
      '    <button type="button" class="btn g-lv" data-lv="2">2 · Practice</button>' +
      '    <button type="button" class="btn g-lv" data-lv="3">3 · GATE</button>' +
      '    <button type="button" class="btn primary" data-start>Start round</button>' +
      '  </div>' +
      '  <details class="g-how"><summary data-howt></summary><div class="small" data-how></div></details>' +
      '</div>' +
      '<div class="panel" data-play hidden>' +
      '  <div class="row">' +
      '    <span class="chip" data-prog></span><span class="chip" data-score></span>' +
      '    <span class="chip plain mono" data-timer aria-label="Time">00:00</span><span class="chip plain" data-lvchip></span>' +
      '  </div>' +
      '  <div data-q style="display:flex;flex-direction:column;gap:14px"></div>' +
      '</div>' +
      '<div class="panel" data-end hidden></div>';

    var $ = function (sel) { return wrap.querySelector(sel); };
    var playEl = $('[data-play]'), qEl = $('[data-q]'), endEl = $('[data-end]');

    function howHTML() {
      var items = H() ? [
        'Frames shuru me khaali hote hain. Har reference pe: page kisi frame me hai → <b>HIT</b>, warna → <b>FAULT</b> (page load hoga; saare frames bhare hain to ek page evict hoga).',
        '<b>FIFO</b>: jo page sabse <i>pehle load</i> hua tha use nikalo. HIT se uska time refresh nahi hota.',
        '<b>LRU</b>: jiska <i>last use</i> sabse purana hai use nikalo. Har HIT uska last-use time update karta hai.',
        '<b>Optimal (OPT)</b>: jiska <i>next use</i> sabse door future me hai (ya kabhi nahi) use nikalo. Minimum faults deta hai, par future chahiye — isliye benchmark hai.',
        '<b>Belady\'s anomaly</b>: FIFO me frames badhane pe faults <i>badh</i> sakte hain (1 2 3 4 1 2 5 1 2 3 4 5 → 3 frames: 9, 4 frames: 10). LRU/OPT stack algorithms hain — inme kabhi nahi hota.',
        'Page-fault rate p = faults / references. <span class="mono">EAT = (1 − p)·m + p·S</span> (m = hit pe memory access time, S = poora fault service time).',
        'Tip: pehle k alag pages hamesha compulsory faults hote hain.'
      ] : [
        'Frames start empty. For each reference: page already in a frame → <b>HIT</b>, otherwise → <b>FAULT</b> (the page is loaded; if all frames are full, one page is evicted).',
        '<b>FIFO</b>: evict the page that was <i>loaded</i> earliest. Hits do not refresh it.',
        '<b>LRU</b>: evict the page whose <i>last use</i> is oldest. Every hit refreshes it.',
        '<b>Optimal (OPT)</b>: evict the page whose <i>next use</i> is farthest in the future (or never). Fewest possible faults, but it needs the future, so it is a benchmark.',
        '<b>Belady\'s anomaly</b>: with FIFO, more frames can give <i>more</i> faults (1 2 3 4 1 2 5 1 2 3 4 5 → 9 faults with 3 frames, 10 with 4). LRU and OPT are stack algorithms — never.',
        'Page-fault rate p = faults / references. <span class="mono">EAT = (1 − p)·m + p·S</span> (m = memory access time on a hit, S = total fault service time).',
        'Tip: the first k distinct pages are always compulsory faults.'
      ];
      return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    }

    function renderHeader() {
      $('[data-blurb]').textContent = L(
        'Step through FIFO, LRU and Optimal by hand: call each reference HIT or FAULT and pick the victim. GATE asks page-fault counts almost every year.',
        'FIFO, LRU aur Optimal haath se chalao: har reference pe HIT ya FAULT bolo aur victim chuno. GATE me page-fault count lagbhag har saal aata hai.');
      $('[data-howt]').textContent = L('How it works', 'Kaise kaam karta hai');
      $('[data-how]').innerHTML = howHTML();
      wrap.querySelectorAll('.g-lv').forEach(function (b) {
        b.setAttribute('aria-pressed', String(+b.getAttribute('data-lv') === level));
      });
    }

    function setLevel(lv) {
      level = lv;
      $('details.g-how').open = (lv === 1);
      renderHeader();
    }

    wrap.querySelectorAll('.g-lv').forEach(function (b) {
      b.addEventListener('click', function () { setLevel(+b.getAttribute('data-lv')); });
    });
    $('[data-start]').addEventListener('click', function () { startRound(); });

    function fmtTime(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
    function elapsed() { return Math.round((Date.now() - tStart) / 1000); }
    function tick() { $('[data-timer]').textContent = fmtTime(elapsed()); }

    function startRound() {
      qi = 0; score = 0; revise = {};
      tStart = Date.now();
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 1000); tick();
      endEl.hidden = true; playEl.hidden = false;
      $('details.g-how').open = (level === 1);
      nextQuestion();
    }

    function updateStatus() {
      $('[data-prog]').textContent = L('Q ', 'Sawaal ') + Math.min(qi + 1, ROUND) + ' / ' + ROUND;
      $('[data-score]').textContent = L('Score ', 'Score ') + score;
      $('[data-lvchip]').textContent = L('Level ', 'Level ') + level;
    }

    function nextQuestion() {
      var prob = genProblem(level);
      q = {
        prob: prob, pass: 0, i: 0, mem: newMem(prob.ks[0]), cols: prob.ks.map(function () { return []; }),
        phase: 'hf', pending: null, stepErr: 0, errKinds: {}, msg: '', msgOk: true, answered: false
      };
      updateStatus();
      renderQ();
    }

    function addRevise(key) { revise[key] = (revise[key] || 0) + 1; }

    function refsHTML(refs, cur) {
      return '<div class="g-refs" aria-label="' + L('Reference string', 'Reference string') + '">' + refs.map(function (p, i) {
        var c = i < cur ? 'past' : i === cur ? 'cur' : '';
        return '<span class="g-ref ' + c + '"' + (i === cur ? ' aria-current="step"' : '') + '>' + p + '</span>';
      }).join('') + '</div>';
    }

    // Frame table: columns = references. showCur = index of the reference being decided (blank column), or -1.
    function tableHTML(refs, k, cols, showCur) {
      var n = refs.length;
      var h = '<div class="tscroll"><table class="g-ft"><thead><tr><th scope="row">t</th>';
      for (var i = 0; i < n; i++) h += '<th scope="col">' + (i + 1) + '</th>';
      h += '</tr></thead><tbody><tr><th scope="row">' + L('Ref', 'Ref') + '</th>';
      for (i = 0; i < n; i++) h += '<td' + (i === showCur ? ' class="cur"' : '') + '>' + refs[i] + '</td>';
      h += '</tr>';
      for (var s = 0; s < k; s++) {
        h += '<tr><th scope="row">F' + (s + 1) + '</th>';
        for (i = 0; i < n; i++) {
          var c = cols[i];
          if (!c) { h += '<td></td>'; continue; }
          var v = c.frames[s];
          var cls = (c.slot === s) ? (c.hit ? 'hitc' : 'new') : '';
          h += '<td class="' + cls + '">' + (v === null ? '' : v) + '</td>';
        }
        h += '</tr>';
      }
      h += '<tr><th scope="row">H/F</th>';
      for (i = 0; i < n; i++) {
        var cc = cols[i];
        if (!cc) { h += '<td>' + (i === showCur ? '?' : '') + '</td>'; continue; }
        h += '<td class="' + (cc.hit ? 'h' : 'f') + (cc.err ? ' err' : '') + '">' + (cc.hit ? 'H' : 'F') + '</td>';
      }
      h += '</tr></tbody></table></div>';
      return h;
    }

    function orderHint(mem, algo) {
      var k = mem.frames.length, items = [];
      for (var s = 0; s < k; s++) if (mem.frames[s] !== null) items.push(s);
      if (!items.length) return L('All frames empty.', 'Saare frames khaali hain.');
      if (algo === 'OPT') return L('Optimal: for each page in memory, look ahead for its next use.', 'Optimal: memory ke har page ka next use aage dekh ke nikalo.');
      var key = algo === 'FIFO' ? 'loaded' : 'used';
      items.sort(function (a, b) { return mem[key][a] - mem[key][b]; });
      var list = items.map(function (s) { return mem.frames[s]; }).join(' → ');
      return algo === 'FIFO'
        ? L('FIFO queue (oldest load → newest): ', 'FIFO queue (sabse purana load → naya): ') + '<span class="mono">' + list + '</span>'
        : L('LRU order (least recent → most recent use): ', 'LRU order (sabse purana use → latest use): ') + '<span class="mono">' + list + '</span>';
    }

    function questionText(prob) {
      var algo = ALGO_NAME[prob.algo];
      if (prob.kind === 'belady') {
        return L(
          'FIFO page replacement, frames initially empty. Run the reference string first with 3 frames, then with 4 frames. For every reference click HIT or FAULT; on a fault with all frames full, click the page to evict. Then give both fault counts and say whether Belady\'s anomaly occurs.',
          'FIFO page replacement, frames shuru me khaali. Pehle 3 frames ke saath chalao, phir 4 frames ke saath. Har reference pe HIT ya FAULT dabao; fault pe frames bhare hon to evict hone wala page click karo. Aakhir me dono fault counts do aur batao Belady\'s anomaly hua ya nahi.');
      }
      var t = L(
        algo + ' page replacement with ' + prob.ks[0] + ' frames, initially empty. For every reference click HIT or FAULT; on a fault with all frames full, click the page to evict. Then enter the total number of page faults.',
        algo + ' page replacement, ' + prob.ks[0] + ' frames, shuru me khaali. Har reference pe HIT ya FAULT dabao; fault pe frames bhare hon to evict hone wala page click karo. Phir total page faults likho.');
      if (prob.algo === 'OPT') t += L(' (If several pages are never used again, any of them is a correct victim.)', ' (Agar kai pages dobara kabhi use nahi hote, unme se koi bhi sahi victim hai.)');
      if (prob.emat) t += L(
        ' Also: a hit costs m = ' + prob.emat.m + ' ns; a page fault costs S = ' + prob.emat.S + ' µs in total (the memory access is included). Find the effective access time in ns (2 decimals).',
        ' Saath me: hit pe m = ' + prob.emat.m + ' ns lagta hai; page fault pe total S = ' + prob.emat.S + ' µs (memory access isi me shamil). Effective access time ns me nikalo (2 decimal).');
      return t;
    }

    function renderQ() {
      var prob = q.prob, k = prob.ks[q.pass], refs = prob.refs;
      var h = '';
      h += '<div class="row"><span class="chip">' + ALGO_NAME[prob.algo] + '</span><span class="chip plain">' +
        (prob.kind === 'belady' ? L('Belady check', 'Belady check') : k + ' ' + L('frames', 'frames')) + '</span>' +
        '<span class="chip plain">' + refs.length + ' ' + L('references', 'references') + '</span></div>';
      h += '<div class="qtext">' + questionText(prob) + '</div>';

      if (q.phase === 'hf' || q.phase === 'victim') {
        if (prob.kind === 'belady') h += '<div class="notice"><b>' + L('Run ', 'Run ') + (q.pass + 1) + ' / 2: ' + k + ' ' + L('frames', 'frames') + '</b></div>';
        h += refsHTML(refs, q.i);
        h += tableHTML(refs, k, q.cols[q.pass], q.i);
        h += '<div class="small muted">' + L('Memory now', 'Abhi memory') + ' (t = ' + (q.i + 1) + ', ' + L('reference', 'reference') + ' <b class="mono">' + refs[q.i] + '</b>):</div>';
        h += '<div class="g-slots">';
        for (var s = 0; s < k; s++) {
          var v = q.mem.frames[s];
          var canPick = q.phase === 'victim';
          h += '<button type="button" class="btn g-slot' + (canPick ? ' pickme' : '') + '" data-slot="' + s + '"' + (canPick ? '' : ' disabled') +
            ' aria-label="' + L('Frame ', 'Frame ') + (s + 1) + ': ' + (v === null ? L('empty', 'khaali') : L('page ', 'page ') + v) + (canPick ? L(' — evict this', ' — ise evict karo') : '') + '">' +
            '<small>F' + (s + 1) + '</small><b>' + (v === null ? '–' : v) + '</b></button>';
        }
        h += '</div>';
        if (level === 1) h += '<div class="small g-hint">' + L('Hint', 'Hint') + ': ' + orderHint(q.mem, prob.algo) + '</div>';
        if (q.phase === 'hf') {
          h += '<div class="row"><button type="button" class="btn g-hf" data-hf="HIT">✓ HIT</button><button type="button" class="btn g-hf" data-hf="FAULT">✗ FAULT</button></div>';
        } else {
          h += '<div class="small" style="font-weight:600">' + L('Frames are full — click the frame whose page should be evicted.', 'Frames bhare hain — jis page ko evict karna hai uske frame pe click karo.') + '</div>';
        }
        h += '<div class="g-msg ' + (q.msgOk ? 'ok' : 'bad') + '" aria-live="polite">' + q.msg + '</div>';
      } else {
        // final answers
        h += refsHTML(refs, -1);
        prob.ks.forEach(function (kk, pi) {
          if (prob.kind === 'belady') h += '<div class="small" style="font-weight:600">' + kk + ' ' + L('frames', 'frames') + '</div>';
          h += tableHTML(refs, kk, q.cols[pi], -1);
        });
        if (q.msg) h += '<div class="g-msg ' + (q.msgOk ? 'ok' : 'bad') + '">' + q.msg + '</div>';
        h += '<form data-final class="row" style="align-items:flex-end" novalidate>';
        if (prob.kind === 'belady') {
          h += '<label class="g-field">' + L('Faults with 3 frames', '3 frames pe faults') + '<input data-in="f0" inputmode="numeric" autocomplete="off"></label>';
          h += '<label class="g-field">' + L('Faults with 4 frames', '4 frames pe faults') + '<input data-in="f1" inputmode="numeric" autocomplete="off"></label>';
          h += '<label class="g-field">' + L('Belady\'s anomaly?', 'Belady\'s anomaly hua?') + '<select data-in="anom"><option value="">—</option><option value="yes">' + L('Yes (4 frames give more faults)', 'Haan (4 frames pe zyada faults)') + '</option><option value="no">' + L('No', 'Nahi') + '</option></select></label>';
        } else {
          h += '<label class="g-field">' + L('Total page faults', 'Total page faults') + '<input data-in="f0" inputmode="numeric" autocomplete="off"></label>';
          if (prob.emat) h += '<label class="g-field">' + L('Effective access time (ns)', 'Effective access time (ns)') + '<input data-in="eat" inputmode="decimal" autocomplete="off"></label>';
        }
        if (!q.answered) h += '<button type="submit" class="btn primary">' + L('Submit', 'Submit') + '</button>';
        h += '</form><div data-fb></div>';
      }
      qEl.innerHTML = h;
      bindQ();
    }

    function bindQ() {
      qEl.querySelectorAll('[data-hf]').forEach(function (b) {
        b.addEventListener('click', function () { onHF(b.getAttribute('data-hf')); });
      });
      qEl.querySelectorAll('[data-slot]').forEach(function (b) {
        b.addEventListener('click', function () { if (q.phase === 'victim') onVictim(+b.getAttribute('data-slot')); });
      });
      var f = qEl.querySelector('[data-final]');
      if (f) {
        f.addEventListener('submit', function (e) { e.preventDefault(); onSubmit(); });
        var first = f.querySelector('input');
        if (first) first.focus();
      } else {
        var fb = qEl.querySelector(q.phase === 'victim' ? '[data-slot]' : '[data-hf]');
        if (fb && document.activeElement && wrap.contains(document.activeElement)) fb.focus();
      }
    }

    function onHF(choice) {
      var prob = q.prob, a = analyse(q.mem, prob.algo, prob.refs, q.i);
      var p = a.page, ok = (choice === 'HIT') === a.hit;
      q.curErr = !ok;
      if (!ok) { q.stepErr++; q.errKinds.hit = 1; }
      if (a.hit) {
        q.msgOk = ok;
        q.msg = ok ? L('✓ HIT — page ' + p + ' is already in frame F' + (a.slot + 1) + '.', '✓ HIT — page ' + p + ' pehle se frame F' + (a.slot + 1) + ' me hai.')
          : L('✗ It was a HIT — page ' + p + ' is already in F' + (a.slot + 1) + '. Nothing is loaded.', '✗ Yeh HIT tha — page ' + p + ' pehle se F' + (a.slot + 1) + ' me hai. Kuch load nahi hota.');
        commit(a, null);
      } else if (a.free) {
        q.msgOk = ok;
        q.msg = ok ? L('✓ FAULT — ' + p + ' goes into the free frame F' + (a.slot + 1) + '.', '✓ FAULT — ' + p + ' khaali frame F' + (a.slot + 1) + ' me gaya.')
          : L('✗ It was a FAULT — page ' + p + ' is not in memory. Loaded into free frame F' + (a.slot + 1) + '.', '✗ Yeh FAULT tha — page ' + p + ' memory me nahi hai. Khaali frame F' + (a.slot + 1) + ' me load hua.');
        commit(a, null);
      } else {
        q.pending = a; q.phase = 'victim'; q.msgOk = ok;
        q.msg = ok ? L('✓ FAULT — ' + p + ' is not in memory. Now choose the victim.', '✓ FAULT — ' + p + ' memory me nahi hai. Ab victim chuno.')
          : L('✗ It is a FAULT — page ' + p + ' is not in any frame. Now choose the victim.', '✗ Yeh FAULT hai — page ' + p + ' kisi frame me nahi. Ab victim chuno.');
        renderQ();
      }
    }

    function onVictim(slot) {
      var a = q.pending, algo = q.prob.algo;
      var ok = a.victims.indexOf(slot) >= 0;
      var use = ok ? slot : a.victim;
      var ev = q.mem.frames[use];
      if (!ok) { q.stepErr++; q.errKinds[algo] = 1; q.curErr = true; }
      q.msgOk = ok && !q.curErr;
      q.msg = ok ? L('✓ Evict ' + ev + ' — ' + shortReason(a, use, algo, false), '✓ ' + ev + ' evict — ' + shortReason(a, use, algo, true))
        : L('✗ Not ' + q.mem.frames[slot] + '. Evict ' + ev + ' — ' + shortReason(a, use, algo, false), '✗ ' + q.mem.frames[slot] + ' nahi. ' + ev + ' evict hoga — ' + shortReason(a, use, algo, true));
      if (ok && !q.msgOk) q.msg = q.msg.replace('✓', '✓ (' + L('victim right', 'victim sahi') + ')');
      commit(a, use);
    }

    function commit(a, victimSlot) {
      var col = applyStep(q.mem, q.i, a, victimSlot);
      col.err = !!q.curErr; q.curErr = false;
      q.cols[q.pass].push(col);
      q.pending = null; q.phase = 'hf';
      q.i++;
      if (q.i >= q.prob.refs.length) {
        if (q.pass + 1 < q.prob.ks.length) {
          q.pass++; q.i = 0; q.mem = newMem(q.prob.ks[q.pass]);
          q.msg += ' ' + L('Run 1 done. Now the same string with ' + q.prob.ks[q.pass] + ' frames.', 'Run 1 khatam. Ab wahi string ' + q.prob.ks[q.pass] + ' frames ke saath.');
        } else {
          q.phase = 'final';
        }
      }
      renderQ();
    }

    function tstr(i) { return 't' + (i + 1); }

    function shortReason(a, slot, algo, hi) {
      var x = a.info[slot];
      if (algo === 'FIFO') return hi ? 'yeh sabse pehle load hua tha (' + tstr(x.loaded) + ').' : 'it was loaded earliest (' + tstr(x.loaded) + ').';
      if (algo === 'LRU') return hi ? 'iska last use sabse purana hai (' + tstr(x.used) + ').' : 'its last use is the oldest (' + tstr(x.used) + ').';
      if (x.next === Infinity) return hi ? 'yeh aage kabhi use nahi hota.' : 'it is never used again.';
      return hi ? 'iska next use sabse door hai (' + tstr(x.next) + ').' : 'its next use is farthest away (' + tstr(x.next) + ').';
    }

    function stepLine(c, algo) {
      var t = c.t + 1, p = c.page;
      if (c.hit) {
        return L('t' + t + ', ref ' + p + ': HIT (in F' + (c.slot + 1) + ')' + (algo === 'LRU' ? '; its last use becomes t' + t + '.' : '.'),
          't' + t + ', ref ' + p + ': HIT (F' + (c.slot + 1) + ' me)' + (algo === 'LRU' ? '; iska last use ab t' + t + ' hai.' : '.'));
      }
      if (c.free) return L('t' + t + ', ref ' + p + ': FAULT — free frame F' + (c.slot + 1) + ', load ' + p + '.',
        't' + t + ', ref ' + p + ': FAULT — khaali frame F' + (c.slot + 1) + ', ' + p + ' load karo.');
      var a = c.a, det;
      if (algo === 'FIFO') det = a.info.map(function (x) { return x.page + '@' + tstr(x.loaded); }).join(', ');
      else if (algo === 'LRU') det = a.info.map(function (x) { return x.page + '@' + tstr(x.used); }).join(', ');
      else det = a.info.map(function (x) { return x.page + '→' + (x.next === Infinity ? L('never', 'kabhi nahi') : tstr(x.next)); }).join(', ');
      var lab = algo === 'FIFO' ? L('loaded', 'load time') : algo === 'LRU' ? L('last used', 'last use') : L('next use', 'next use');
      return L('t' + t + ', ref ' + p + ': FAULT, frames full. ' + lab + ': ' + det + ' → evict ' + c.evicted + ' from F' + (c.slot + 1) + ' (' + shortReason(a, c.slot, algo, false).replace(/\.$/, '') + ').',
        't' + t + ', ref ' + p + ': FAULT, frames bhare. ' + lab + ': ' + det + ' → F' + (c.slot + 1) + ' se ' + c.evicted + ' evict (' + shortReason(a, c.slot, algo, true).replace(/\.$/, '') + ').');
    }

    function parseNum(s) {
      s = String(s || '').trim().replace(/,/g, '');
      if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
      return parseFloat(s);
    }

    function onSubmit() {
      if (q.answered) return;
      var prob = q.prob, n = prob.refs.length;
      var faults = q.cols.map(function (cs) { return cs.filter(function (c) { return !c.hit; }).length; });
      // Canonical recomputation (identical counts to the live run: any valid OPT tie gives the same faults).
      var canon = prob.ks.map(function (kk) { return solve(prob.algo, prob.refs, kk).faults; });
      var get = function (k) { var e = qEl.querySelector('[data-in="' + k + '"]'); return e ? e.value : ''; };
      var okParts = [], lines = [];
      var f0 = parseNum(get('f0'));
      if (isNaN(f0)) { qEl.querySelector('[data-in="f0"]').focus(); return; }
      okParts.push(f0 === canon[0]);
      var anomOk = true, eatOk = true, eatVal = null;
      if (prob.kind === 'belady') {
        var f1 = parseNum(get('f1')), an = get('anom');
        if (isNaN(f1)) { qEl.querySelector('[data-in="f1"]').focus(); return; }
        if (!an) { qEl.querySelector('[data-in="anom"]').focus(); return; }
        okParts.push(f1 === canon[1]);
        anomOk = (an === 'yes') === (canon[1] > canon[0]);
        okParts.push(anomOk);
      } else if (prob.emat) {
        var e = parseNum(get('eat'));
        if (isNaN(e)) { qEl.querySelector('[data-in="eat"]').focus(); return; }
        eatVal = eat(canon[0], n, prob.emat.m, prob.emat.S);
        eatOk = Math.abs(e - eatVal) <= Math.max(0.011, eatVal * 0.001);
        okParts.push(eatOk);
      }
      q.answered = true;
      var finalOk = okParts.every(Boolean);
      var correct = finalOk && q.stepErr === 0;
      if (correct) score++;
      else {
        addRevise(ALGO_NAME[prob.algo] + (prob.kind === 'belady' ? ' / Belady' : ''));
        Object.keys(q.errKinds).forEach(function (k) { addRevise(k === 'hit' ? 'HIT detection' : ALGO_NAME[k] + ' victim choice'); });
        if (prob.emat && !eatOk) addRevise('EMAT');
      }
      updateStatus();

      // Explanation
      var algo = prob.algo;
      prob.ks.forEach(function (kk, pi) {
        var cs = q.cols[pi];
        lines.push('<div style="font-weight:700">' + (prob.kind === 'belady' ? kk + ' ' + L('frames', 'frames') + ': ' : '') +
          L('Faults = ', 'Faults = ') + faults[pi] + ', ' + L('hits = ', 'hits = ') + (n - faults[pi]) + '</div>');
        lines.push(tableHTML(prob.refs, kk, cs, -1));
        lines.push('<ol class="g-steps">' + cs.map(function (c) {
          return '<li' + (c.err ? ' class="err"' : '') + '>' + (c.err ? '✗ ' : '') + stepLine(c, algo) + '</li>';
        }).join('') + '</ol>');
      });
      if (prob.kind === 'belady') {
        var anom = canon[1] > canon[0];
        lines.push('<p style="margin:0">' + L(
          'FIFO: ' + canon[0] + ' faults with 3 frames, ' + canon[1] + ' with 4 frames. ' + (anom ? 'More frames gave MORE faults → Belady\'s anomaly ✓.' : 'More frames did not increase faults → no anomaly here.') + ' Only FIFO-like (non-stack) algorithms can show it; LRU and OPT never do, because the set of pages in k frames is always a subset of the set in k+1 frames.',
          'FIFO: 3 frames pe ' + canon[0] + ' faults, 4 frames pe ' + canon[1] + '. ' + (anom ? 'Zyada frames pe ZYADA faults → Belady\'s anomaly ✓.' : 'Frames badhane pe faults nahi badhe → yahan anomaly nahi.') + ' Yeh sirf FIFO jaise non-stack algorithms me hota hai; LRU aur OPT me kabhi nahi, kyunki k frames ka page-set hamesha k+1 frames ke set ka subset hota hai.') + '</p>');
      }
      if (prob.emat) {
        var m = prob.emat.m, S = prob.emat.S, F = canon[0];
        lines.push('<pre class="code">p = ' + F + '/' + n + ' = ' + (F / n).toFixed(4) + '\n' +
          'EAT = (1 − p)·m + p·S\n    = (' + (n - F) + '/' + n + ')·' + m + ' ns + (' + F + '/' + n + ')·' + S + '000 ns\n    = ' + eatVal.toFixed(2) + ' ns</pre>');
      }
      // Rules missed
      var rules = [];
      if (q.errKinds.hit) rules.push(L('HIT means the page is already in some frame — check the current frames before calling it.', 'HIT ka matlab page pehle se kisi frame me hai — HIT/FAULT bolne se pehle current frames dekho.'));
      if (q.errKinds.FIFO) rules.push(L('FIFO evicts by LOAD time only — a hit does not move a page to the back of the queue.', 'FIFO sirf LOAD time dekhta hai — HIT hone se page queue ke peeche nahi jaata.'));
      if (q.errKinds.LRU) rules.push(L('LRU evicts by LAST USE — every hit refreshes the page, so scan backwards from the current reference.', 'LRU LAST USE dekhta hai — har HIT page ko refresh karta hai, isliye current reference se peeche scan karo.'));
      if (q.errKinds.OPT) rules.push(L('Optimal looks FORWARD: find each page\'s next use; evict the farthest (a page never used again is best).', 'Optimal AAGE dekhta hai: har page ka next use dhoondo; sabse door wala evict karo (jo kabhi use nahi hota woh best victim).'));
      if (!okParts[0] && q.stepErr === 0) rules.push(L('Total faults = number of F in the H/F row (compulsory faults included).', 'Total faults = H/F row me F ki ginti (compulsory faults bhi gino).'));
      if (prob.emat && !eatOk) rules.push(L('EAT uses the fault RATE p = faults / references, not the count; convert µs to ns (×1000).', 'EAT me fault RATE p = faults / references lagta hai, count nahi; µs ko ns me badlo (×1000).'));
      if (prob.kind === 'belady' && !anomOk) rules.push(L('Belady\'s anomaly = faults(4 frames) > faults(3 frames) for the same string.', 'Belady\'s anomaly = same string pe faults(4 frames) > faults(3 frames).'));

      var verdict;
      if (correct) verdict = L('✓ Correct!', '✓ Sahi jawab!');
      else if (finalOk) verdict = L('✗ Final answer right, but ' + q.stepErr + ' step(s) were wrong — a question counts only when every step is right.', '✗ Final answer sahi, par ' + q.stepErr + ' step galat the — sawaal tabhi count hota hai jab har step sahi ho.');
      else {
        var want = prob.kind === 'belady'
          ? canon[0] + ' / ' + canon[1] + ' / ' + (canon[1] > canon[0] ? L('Yes', 'Haan') : L('No', 'Nahi'))
          : canon[0] + (prob.emat ? ' ' + L('faults', 'faults') + ', EAT ' + eatVal.toFixed(2) + ' ns' : '');
        verdict = L('✗ Not quite. Correct answer: ', '✗ Galat. Sahi jawab: ') + want;
      }

      var fb = qEl.querySelector('[data-fb]');
      qEl.querySelectorAll('[data-final] input, [data-final] select').forEach(function (x) { x.disabled = true; });
      var sb = qEl.querySelector('[data-final] button'); if (sb) sb.remove();
      fb.innerHTML = '<div class="feedback ' + (correct ? 'ok' : 'bad') + '" role="status">' +
        '<div class="verdict">' + verdict + '</div>' +
        (rules.length ? '<div><b>' + L('Rule to remember', 'Yaad rakho') + ':</b><ul style="margin:4px 0 0;padding-left:1.2em">' + rules.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="exp" style="white-space:normal;display:flex;flex-direction:column;gap:10px">' + lines.join('') + '</div>' +
        '<div class="row"><button type="button" class="btn primary" data-next>' + (qi + 1 >= ROUND ? L('See results', 'Result dekho') : L('Next question →', 'Agla sawaal →')) + '</button></div>' +
        '</div>';
      var nb = fb.querySelector('[data-next]');
      nb.addEventListener('click', function () {
        qi++;
        if (qi >= ROUND) endRound(); else nextQuestion();
      });
      nb.focus();
    }

    function endRound() {
      if (timer) { clearInterval(timer); timer = null; }
      var secs = elapsed();
      playEl.hidden = true; endEl.hidden = false;
      var rev = Object.keys(revise).sort(function (a, b) { return revise[b] - revise[a]; });
      endEl.innerHTML =
        '<h2>' + L('Round complete', 'Round khatam') + '</h2>' +
        '<div class="row"><span class="g-bigscore">' + score + ' / ' + ROUND + '</span><span class="muted">' + L('Level ', 'Level ') + level + ' · ' + fmtTime(secs) + '</span></div>' +
        (rev.length
          ? '<div><b>' + L('Revise', 'Revise karo') + ':</b><ul style="margin:4px 0 0;padding-left:1.2em">' + rev.map(function (r) { return '<li>' + r + ' (' + revise[r] + ')</li>'; }).join('') + '</ul></div>'
          : '<p style="margin:0">' + L('Clean round — nothing to revise. Try the next level.', 'Ekdum clean round — kuch revise nahi. Agla level try karo.') + '</p>') +
        '<div class="row"><button type="button" class="btn" data-again>' + L('Play again', 'Phir se khelo') + '</button>' +
        '<button type="button" class="btn primary" data-nextlv>' + (level < 3 ? L('Next level', 'Agla level') : L('Level 3 again', 'Level 3 phir se')) + '</button></div>';
      endEl.querySelector('[data-again]').addEventListener('click', startRound);
      endEl.querySelector('[data-nextlv]').addEventListener('click', function () { setLevel(Math.min(3, level + 1)); startRound(); });
      try { api.done({ correct: score, total: ROUND, level: level, seconds: secs }); } catch (e) { /* host error should not break the game */ }
    }

    setLevel(1);
    return function cleanup() { if (timer) clearInterval(timer); timer = null; root.innerHTML = ''; };
  }

  (window.GATE_GAMES = window.GATE_GAMES || []).push({
    id: ID,
    title: 'Page Fault Hunter',
    subj: 'os',
    topics: ['Page replacement algorithms', 'Virtual memory & demand paging (EMAT)'],
    blurb: 'Hand-simulate FIFO, LRU and Optimal frame by frame, spot Belady\'s anomaly and turn fault counts into EMAT — a near-yearly GATE question.',
    _logic: logic,
    mount: mount
  });
})();
