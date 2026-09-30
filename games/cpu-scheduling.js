/* Gantt Builder — FCFS, SJF, SRTF, Round Robin, preemptive Priority.
   Plain JS, no libraries. See games/GAMES.md for the contract. */
(function () {
  'use strict';
  var ID = 'cpu-scheduling';
  var ROUND = 10;

  /* ------------------------------------------------------------------ */
  /* Pure logic (no DOM)                                                 */
  /* ------------------------------------------------------------------ */
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // procs: [{id, at, bt, pr}] with ids 1..n. Returns every scheduling decision, the Gantt chart and the CT/TAT/WT table.
  // Rules: ties → lower id (for SRTF / Priority this holds even against the running process).
  // RR: processes arriving at time t join the queue (by id) before a process preempted at time t.
  function simulate(procs, algo, q) {
    var n = procs.length, rem = {}, ct = {};
    procs.forEach(function (p) { rem[p.id] = p.bt; });
    var byArr = procs.slice().sort(function (a, b) { return a.at - b.at || a.id - b.id; });
    var t = 0, done = 0, decisions = [], segs = [];
    function push(pid, s, e) {
      var last = segs[segs.length - 1];
      if (last && last.pid === pid && last.e === s) last.e = e; else segs.push({ pid: pid, s: s, e: e });
    }
    if (algo === 'RR') {
      var queue = [], ai = 0;
      var admit = function (upto) { var got = []; while (ai < n && byArr[ai].at <= upto) { queue.push(byArr[ai].id); got.push(byArr[ai].id); ai++; } return got; };
      admit(0);
      while (done < n) {
        if (!queue.length) {
          var nt = byArr[ai].at;
          decisions.push({ t: t, choice: 0, len: nt - t, ready: [], queue: [] });
          push(0, t, nt); t = nt;
          var got0 = admit(t);
          decisions[decisions.length - 1].arrivals = got0;
          continue;
        }
        var snap = queue.slice();
        var pid = queue.shift(), run = Math.min(q, rem[pid]);
        var d = { t: t, choice: pid, len: run, queue: snap, ready: snap.map(function (id) { return { id: id, rem: rem[id] }; }) };
        push(pid, t, t + run); t += run; rem[pid] -= run;
        d.arrivals = admit(t);
        if (rem[pid] > 0) { queue.push(pid); d.back = true; } else { ct[pid] = t; done++; d.finished = true; }
        d.after = queue.slice();
        decisions.push(d);
      }
    } else {
      var keyOf = {
        FCFS: function (p) { return [p.at, p.id]; },
        SJF: function (p) { return [p.bt, p.id]; },
        SRTF: function (p) { return [rem[p.id], p.id]; },
        PRIO: function (p) { return [p.pr, p.id]; }
      }[algo];
      var pre = algo === 'SRTF' || algo === 'PRIO';
      while (done < n) {
        var r = procs.filter(function (p) { return p.at <= t && rem[p.id] > 0; });
        if (!r.length) {
          var nt2 = Math.min.apply(null, procs.filter(function (p) { return rem[p.id] > 0; }).map(function (p) { return p.at; }));
          decisions.push({ t: t, choice: 0, len: nt2 - t, ready: [] });
          push(0, t, nt2); t = nt2; continue;
        }
        var snapR = r.map(function (p) { return { id: p.id, rem: rem[p.id], at: p.at, bt: p.bt, pr: p.pr, key: keyOf(p)[0] }; });
        r.sort(function (a, b) { var ka = keyOf(a), kb = keyOf(b); return ka[0] - kb[0] || ka[1] - kb[1]; });
        var chosen = r[0].id, runL = rem[chosen], cut = false;
        if (pre) {
          var fut = procs.filter(function (p) { return p.at > t; }).map(function (p) { return p.at; });
          if (fut.length) { var na = Math.min.apply(null, fut); if (na - t < runL) { runL = na - t; cut = true; } }
        }
        var bestKey = keyOf(r[0])[0];
        var dd = { t: t, choice: chosen, len: runL, ready: snapR, cut: cut, tie: snapR.filter(function (x) { return x.key === bestKey; }).length > 1 };
        push(chosen, t, t + runL); t += runL; rem[chosen] -= runL;
        if (rem[chosen] === 0) { ct[chosen] = t; done++; dd.finished = true; }
        decisions.push(dd);
      }
    }
    var rows = procs.map(function (p) {
      var tat = ct[p.id] - p.at;
      return { id: p.id, at: p.at, bt: p.bt, pr: p.pr, ct: ct[p.id], tat: tat, wt: tat - p.bt };
    });
    var sumT = 0, sumW = 0;
    rows.forEach(function (x) { sumT += x.tat; sumW += x.wt; });
    return { decisions: decisions, segs: segs, rows: rows, sumTAT: sumT, sumWT: sumW, avgTAT: sumT / n, avgWT: sumW / n };
  }

  function genProblem(level) {
    var algo, n, atMax, btMax, q = null, shift = 0;
    if (level === 1) { algo = pick(['FCFS', 'SJF']); n = 3; atMax = 4; btMax = 6; }
    else if (level === 2) { algo = pick(['FCFS', 'SJF', 'SRTF', 'RR', 'RR']); n = 4; atMax = 6; btMax = 7; q = 2; }
    else { algo = pick(['SJF', 'SRTF', 'SRTF', 'RR', 'RR', 'PRIO', 'PRIO', 'FCFS']); n = ri(4, 5); atMax = 8; btMax = 9; q = pick([2, 3, 4]); }
    if (algo !== 'RR') q = null;
    var best = null;
    for (var tries = 0; tries < 60; tries++) {
      if (level === 3 && Math.random() < 0.2) shift = ri(1, 2); else shift = 0;
      var procs = [];
      for (var i = 1; i <= n; i++) {
        procs.push({ id: i, at: (i === 1 ? 0 : ri(0, atMax)) + shift, bt: ri(1, btMax), pr: algo === 'PRIO' ? ri(1, 5) : null });
      }
      // sort ids by arrival so P1 arrives first (as GATE tables usually do); keep ties in random order
      procs.sort(function (a, b) { return a.at - b.at; });
      procs.forEach(function (p, j) { p.id = j + 1; });
      var sim = simulate(procs, algo, q);
      best = { algo: algo, q: q, procs: procs, ask: pick(['WT', 'TAT']), sim: sim };
      var busy = sim.segs.filter(function (s) { return s.pid; }).length;
      var preemptive = algo === 'SRTF' || algo === 'RR' || algo === 'PRIO';
      // Level 2/3 preemptive questions must actually preempt; keep RR charts a sensible length.
      if (preemptive && level >= 2 && busy <= n) continue;
      if (algo === 'RR' && sim.decisions.length > 16) continue;
      break;
    }
    return best;
  }

  var logic = { simulate: simulate, genProblem: genProblem };

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '.g-cpu-scheduling{display:flex;flex-direction:column;gap:16px}',
    '.g-cpu-scheduling .g-lv[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-cpu-scheduling details.g-how summary{cursor:pointer;font-weight:700}',
    '.g-cpu-scheduling details.g-how ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
    '.g-cpu-scheduling table.g-pt{width:auto;min-width:240px}',
    '.g-cpu-scheduling table.g-pt td,.g-cpu-scheduling table.g-pt th{text-align:center;padding:5px 10px;white-space:nowrap}',
    '.g-cpu-scheduling table.g-pt td{font-family:var(--f-mono)}',
    '.g-cpu-scheduling .g-rules{border-left:3px solid var(--marker);padding-left:10px;font-size:.9rem}',
    '.g-cpu-scheduling .g-rules ul{margin:4px 0 0;padding-left:1.2em}',
    '.g-cpu-scheduling .g-gwrap{overflow-x:auto;padding:4px 14px 26px 10px}',
    '.g-cpu-scheduling .g-gantt{display:flex;align-items:stretch;min-height:44px}',
    '.g-cpu-scheduling .g-seg{position:relative;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:1px solid var(--pen);margin-right:-1px;background:var(--pen-soft);color:var(--pen);font:700 .82rem var(--f-mono);min-height:42px}',
    '.g-cpu-scheduling .g-seg.idle{background:repeating-linear-gradient(135deg,var(--sheet) 0 5px,var(--line) 5px 7px);color:var(--muted);border-color:var(--line)}',
    '.g-cpu-scheduling .g-seg.err{background:var(--bad-bg);color:var(--bad)}',
    '.g-cpu-scheduling .g-seg.next{background:var(--marker);color:var(--ink);border-style:dashed;border-color:var(--ink)}',
    '.g-cpu-scheduling .g-seg .ts,.g-cpu-scheduling .g-end{position:absolute;bottom:-20px;left:-6px;font:600 .72rem var(--f-mono);color:var(--muted)}',
    '.g-cpu-scheduling .g-endbox{position:relative;width:0}',
    '.g-cpu-scheduling .g-pick{min-width:64px;font-family:var(--f-mono)}',
    '.g-cpu-scheduling .g-msg{min-height:1.5em;font-weight:600}',
    '.g-cpu-scheduling .g-msg.ok{color:var(--ok)}',
    '.g-cpu-scheduling .g-msg.bad{color:var(--bad)}',
    '.g-cpu-scheduling .g-hint{border-left:3px solid var(--pen);padding-left:10px}',
    '.g-cpu-scheduling .g-field{display:flex;flex-direction:column;gap:4px;font-size:.88rem;font-weight:600}',
    '.g-cpu-scheduling .g-field input{font:600 1.05rem var(--f-mono);width:180px;background:var(--sheet);border:1px solid var(--line);border-radius:6px;padding:7px 10px}',
    '.g-cpu-scheduling ol.g-steps{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:3px;font-size:.9rem}',
    '.g-cpu-scheduling ol.g-steps li.err{color:var(--bad)}',
    '.g-cpu-scheduling .g-bigscore{font:800 2.4rem var(--f-display);line-height:1}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('g-style-' + ID)) return;
    var s = document.createElement('style');
    s.id = 'g-style-' + ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var ALGO_NAME = { FCFS: 'FCFS', SJF: 'SJF (non-preemptive)', SRTF: 'SRTF (preemptive SJF)', RR: 'Round Robin', PRIO: 'Priority (preemptive)' };
  var UNIT = 24; // px per time unit in the Gantt chart

  function mount(root, api) {
    injectStyle();
    var H = function () { return api.lang && api.lang() === 'hinglish'; };
    var L = function (en, hi) { return H() ? hi : en; };

    var level = 1, qi = 0, score = 0, tStart = 0, timer = null, q = null, revise = {};

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'g-' + ID;
    root.appendChild(wrap);
    wrap.innerHTML =
      '<div class="panel">' +
      '  <div class="row" style="justify-content:space-between"><h2>Gantt Builder</h2><span class="chip">OS · Scheduling</span></div>' +
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
        '<span class="mono">CT</span> = completion time, <span class="mono">TAT = CT − AT</span>, <span class="mono">WT = TAT − BT</span> (ready queue me bitaya time). Average = sum / n.',
        '<b>FCFS</b>: arrival order me. <b>SJF</b> (non-preemptive): CPU free hote hi, aa chuke processes me sabse chhota burst; poora chalta hai.',
        '<b>SRTF</b>: preemptive SJF — har arrival pe remaining times compare karo; sabse kam remaining wala chalega.',
        '<b>Round Robin</b>: har process max q time chalta hai, phir queue ke tail pe. Usi instant aaye naye process preempted process se <i>pehle</i> queue me ghuste hain.',
        '<b>Priority</b> (preemptive): chhota number = high priority; high priority wala aate hi preempt karta hai.',
        'Koi process aaya hi nahi → CPU idle. Tie → chhoti process id pehle. Context switch overhead 0.'
      ] : [
        '<span class="mono">CT</span> = completion time, <span class="mono">TAT = CT − AT</span>, <span class="mono">WT = TAT − BT</span> (time spent in the ready queue). Average = sum / n.',
        '<b>FCFS</b>: in arrival order. <b>SJF</b> (non-preemptive): whenever the CPU is free, pick the shortest burst among arrived processes; it runs to completion.',
        '<b>SRTF</b>: preemptive SJF — at every arrival compare remaining times; the least remaining runs.',
        '<b>Round Robin</b>: each process runs at most q, then goes to the tail. Processes arriving at the same instant enter the queue <i>before</i> the preempted one.',
        '<b>Priority</b> (preemptive): lower number = higher priority; a higher-priority arrival preempts at once.',
        'Nothing has arrived → CPU idle. Ties → lower process id first. Context switch overhead is 0.'
      ];
      return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    }

    function renderHeader() {
      $('[data-blurb]').textContent = L(
        'Build the Gantt chart slice by slice for FCFS, SJF, SRTF, Round Robin and Priority, then find average waiting / turnaround time — a GATE staple.',
        'FCFS, SJF, SRTF, Round Robin aur Priority ka Gantt chart slice-by-slice banao, phir average waiting / turnaround time nikalo — GATE ka pakka sawaal.');
      $('[data-howt]').textContent = L('How it works', 'Kaise kaam karta hai');
      $('[data-how]').innerHTML = howHTML();
      wrap.querySelectorAll('.g-lv').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-lv') === level)); });
    }
    function setLevel(lv) { level = lv; $('details.g-how').open = (lv === 1); renderHeader(); }
    wrap.querySelectorAll('.g-lv').forEach(function (b) { b.addEventListener('click', function () { setLevel(+b.getAttribute('data-lv')); }); });
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
      $('[data-score]').textContent = 'Score ' + score;
      $('[data-lvchip]').textContent = 'Level ' + level;
    }
    function nextQuestion() {
      var prob = genProblem(level);
      q = { prob: prob, k: 0, picks: [], stepErr: 0, msg: '', msgOk: true, answered: false };
      updateStatus(); renderQ();
    }
    function addRevise(key) { revise[key] = (revise[key] || 0) + 1; }

    function pname(pid) { return pid ? 'P' + pid : L('Idle', 'Idle'); }

    function procTable(prob, rows) {
      var hasPr = prob.algo === 'PRIO';
      var h = '<div class="tscroll"><table class="g-pt"><thead><tr><th scope="col">' + L('Process', 'Process') + '</th><th scope="col">AT</th><th scope="col">BT</th>' +
        (hasPr ? '<th scope="col">' + L('Priority', 'Priority') + '</th>' : '') +
        (rows ? '<th scope="col">CT</th><th scope="col">TAT = CT−AT</th><th scope="col">WT = TAT−BT</th>' : '') + '</tr></thead><tbody>';
      (rows || prob.procs).forEach(function (p) {
        h += '<tr><td>P' + p.id + '</td><td>' + p.at + '</td><td>' + p.bt + '</td>' + (hasPr ? '<td>' + p.pr + '</td>' : '') +
          (rows ? '<td>' + p.ct + '</td><td>' + p.ct + '−' + p.at + ' = ' + p.tat + '</td><td>' + p.tat + '−' + p.bt + ' = ' + p.wt + '</td>' : '') + '</tr>';
      });
      if (rows) {
        var s = prob.sim, n = rows.length;
        h += '<tr><th scope="row" colspan="' + (hasPr ? 5 : 4) + '" style="text-align:right">' + L('Sum', 'Sum') + '</th><td>' + s.sumTAT + '</td><td>' + s.sumWT + '</td></tr>';
        h += '<tr><th scope="row" colspan="' + (hasPr ? 5 : 4) + '" style="text-align:right">' + L('Average', 'Average') + '</th><td>' + s.sumTAT + '/' + n + ' = ' + s.avgTAT.toFixed(2) + '</td><td>' + s.sumWT + '/' + n + ' = ' + s.avgWT.toFixed(2) + '</td></tr>';
      }
      return h + '</tbody></table></div>';
    }

    function rulesHTML(prob) {
      var r = [L('Times in ms; context-switch time 0. Any tie → lower process id first.', 'Time ms me; context switch time 0. Koi bhi tie → chhoti process id pehle.')];
      if (prob.algo === 'FCFS') r.push(L('FCFS: run in order of arrival time.', 'FCFS: arrival time ke order me chalao.'));
      if (prob.algo === 'SJF') r.push(L('SJF is non-preemptive: when the CPU becomes free, choose the smallest burst among arrived processes; it runs to completion.', 'SJF non-preemptive hai: CPU free hone pe aa chuke processes me sabse chhota burst chuno; woh poora chalega.'));
      if (prob.algo === 'SRTF') r.push(L('SRTF: at every arrival or completion choose the least remaining time; on equal remaining time the lower id wins (even against the running process).', 'SRTF: har arrival ya completion pe sabse kam remaining time chuno; remaining barabar ho to chhoti id jeetegi (running process ke against bhi).'));
      if (prob.algo === 'RR') r.push(L('Round Robin, quantum q = ' + prob.q + '. A process arriving at time t enters the ready queue before a process preempted at time t; simultaneous arrivals enter by id.', 'Round Robin, quantum q = ' + prob.q + '. Time t pe aane wala process, time t pe preempt hue process se pehle queue me aata hai; ek saath aaye processes id order me.'));
      if (prob.algo === 'PRIO') r.push(L('Preemptive priority: LOWER number = HIGHER priority. At every arrival or completion the highest priority runs; equal priority → lower id (even against the running process).', 'Preemptive priority: CHHOTA number = UNCHI priority. Har arrival ya completion pe sabse unchi priority chalegi; barabar priority → chhoti id (running process ke against bhi).'));
      return '<div class="g-rules"><b>' + L('Rules', 'Rules') + '</b><ul>' + r.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    }

    // segs: [{pid, s, e, err}] ; nextAt: draw a "?" placeholder at this time (or null)
    function ganttHTML(segs, nextAt) {
      var h = '<div class="g-gwrap" role="img" aria-label="' + L('Gantt chart: ', 'Gantt chart: ') + segs.map(function (s) { return pname(s.pid) + ' ' + s.s + '–' + s.e; }).join(', ') + '"><div class="g-gantt">';
      segs.forEach(function (s) {
        var w = Math.max(34, (s.e - s.s) * UNIT);
        h += '<div class="g-seg' + (s.pid ? '' : ' idle') + (s.err ? ' err' : '') + '" style="width:' + w + 'px">' + (s.err ? '✗ ' : '') + pname(s.pid) + '<span class="ts">' + s.s + '</span></div>';
      });
      if (nextAt !== null && nextAt !== undefined) {
        h += '<div class="g-seg next" style="width:40px">?<span class="ts">' + nextAt + '</span></div>';
      } else if (segs.length) {
        h += '<div class="g-endbox"><span class="g-end">' + segs[segs.length - 1].e + '</span></div>';
      }
      return h + '</div></div>';
    }

    // Segments the player has built so far (one per decision, merged when the same process continues).
    function builtSegs(decs, upto, errs) {
      var segs = [];
      for (var i = 0; i < upto; i++) {
        var d = decs[i], last = segs[segs.length - 1];
        if (last && last.pid === d.choice && !errs[i] && !last.err) last.e = d.t + d.len;
        else segs.push({ pid: d.choice, s: d.t, e: d.t + d.len, err: !!errs[i] });
      }
      return segs;
    }

    function hintHTML(prob, d) {
      if (!d.ready.length) return L('Ready queue is empty.', 'Ready queue khaali hai.');
      var a = prob.algo;
      var list = d.ready.map(function (x) {
        if (a === 'RR') return 'P' + x.id + '(rem ' + x.rem + ')';
        if (a === 'FCFS') return 'P' + x.id + '(AT ' + x.at + ')';
        if (a === 'SJF') return 'P' + x.id + '(BT ' + x.bt + ')';
        if (a === 'PRIO') return 'P' + x.id + '(pri ' + x.pr + ', rem ' + x.rem + ')';
        return 'P' + x.id + '(rem ' + x.rem + ')';
      }).join(a === 'RR' ? ' → ' : ', ');
      return (a === 'RR' ? L('Ready queue (head → tail): ', 'Ready queue (head → tail): ') : L('Ready: ', 'Ready: ')) + '<span class="mono">' + list + '</span>';
    }

    function renderQ() {
      var prob = q.prob, decs = prob.sim.decisions, h = '';
      h += '<div class="row"><span class="chip">' + ALGO_NAME[prob.algo] + '</span>' + (prob.q ? '<span class="chip plain">q = ' + prob.q + '</span>' : '') +
        '<span class="chip plain">' + prob.procs.length + ' ' + L('processes', 'processes') + '</span></div>';
      h += '<div class="qtext">' + L(
        'Schedule these processes with ' + ALGO_NAME[prob.algo] + '. Build the Gantt chart: at each decision point pick the process that gets the CPU (or Idle). Then find the average ' + (prob.ask === 'WT' ? 'waiting time' : 'turnaround time') + ' (2 decimals).',
        'In processes ko ' + ALGO_NAME[prob.algo] + ' se schedule karo. Gantt chart banao: har decision point pe chuno CPU kisko milega (ya Idle). Phir average ' + (prob.ask === 'WT' ? 'waiting time' : 'turnaround time') + ' nikalo (2 decimal).') + '</div>';
      h += procTable(prob, null);
      h += rulesHTML(prob);
      var done = q.k >= decs.length;
      h += ganttHTML(builtSegs(decs, q.k, q.picks.map(function (p, i) { return p !== decs[i].choice; })), done ? null : decs[q.k].t);
      if (!done) {
        var d = decs[q.k];
        var fin = {};
        for (var i = 0; i < q.k; i++) if (decs[i].finished) fin[decs[i].choice] = true;
        h += '<div style="font-weight:600">' + L('At t = ' + d.t + ', who gets the CPU?', 't = ' + d.t + ' pe CPU kisko milega?') + '</div>';
        if (level === 1) h += '<div class="small g-hint">' + L('Hint', 'Hint') + ': ' + hintHTML(prob, d) + '</div>';
        h += '<div class="row" role="group" aria-label="' + L('Choose process', 'Process chuno') + '">';
        prob.procs.forEach(function (p) {
          h += '<button type="button" class="btn g-pick" data-pick="' + p.id + '"' + (fin[p.id] ? ' disabled aria-label="P' + p.id + ' ' + L('finished', 'khatam') + '"' : '') + '>P' + p.id + (fin[p.id] ? ' ✓' : '') + '</button>';
        });
        h += '<button type="button" class="btn g-pick" data-pick="0">' + L('Idle', 'Idle') + '</button></div>';
        h += '<div class="g-msg ' + (q.msgOk ? 'ok' : 'bad') + '" aria-live="polite">' + q.msg + '</div>';
      } else {
        if (q.msg) h += '<div class="g-msg ' + (q.msgOk ? 'ok' : 'bad') + '">' + q.msg + '</div>';
        h += '<form data-final class="row" style="align-items:flex-end" novalidate><label class="g-field">' +
          (prob.ask === 'WT' ? L('Average waiting time', 'Average waiting time') : L('Average turnaround time', 'Average turnaround time')) +
          ' (ms, 2 ' + L('decimals', 'decimal') + ')<input data-in="ans" inputmode="decimal" autocomplete="off"></label>' +
          '<button type="submit" class="btn primary">' + L('Submit', 'Submit') + '</button></form><div data-fb></div>';
      }
      qEl.innerHTML = h;
      qEl.querySelectorAll('[data-pick]').forEach(function (b) {
        b.addEventListener('click', function () { onPick(+b.getAttribute('data-pick')); });
      });
      var f = qEl.querySelector('[data-final]');
      if (f) { f.addEventListener('submit', function (e) { e.preventDefault(); onSubmit(); }); f.querySelector('input').focus(); }
      else {
        var first = qEl.querySelector('[data-pick]:not([disabled])');
        if (first && document.activeElement && wrap.contains(document.activeElement)) first.focus();
      }
    }

    function reasonLine(prob, d) {
      var a = prob.algo, end = d.t + d.len, P = pname(d.choice);
      if (!d.choice) {
        return L('t' + d.t + ': no process has arrived → CPU idle until t' + end + '.', 't' + d.t + ': koi process nahi aaya → CPU t' + end + ' tak idle.');
      }
      var tie = d.tie ? L(' (tie → lower id)', ' (tie → chhoti id)') : '';
      var lst = hintHTML(prob, d).replace(/<[^>]+>/g, '');
      if (a === 'RR') {
        var arr = d.arrivals && d.arrivals.length ? d.arrivals.map(function (x) { return 'P' + x; }).join(', ') : '';
        var tail = d.finished
          ? L(P + ' finishes at t' + end + '.', P + ' t' + end + ' pe khatam.')
          : L((arr ? arr + ' arrive(s) and join first, then ' : '') + P + ' goes to the tail.', (arr ? arr + ' aake pehle queue me, phir ' : '') + P + ' tail pe.');
        if (d.finished && arr) tail += L(' ' + arr + ' join the queue.', ' ' + arr + ' queue me aaye.');
        return L('t' + d.t + ': ' + lst + ' → head ' + P + ' runs min(q=' + prob.q + ', rem ' + (d.ready[0].rem) + ') = ' + d.len + ' → t' + end + '. ' + tail + ' Queue: [' + d.after.map(pname).join(', ') + ']',
          't' + d.t + ': ' + lst + ' → head ' + P + ' chalega min(q=' + prob.q + ', rem ' + (d.ready[0].rem) + ') = ' + d.len + ' → t' + end + '. ' + tail + ' Queue: [' + d.after.map(pname).join(', ') + ']');
      }
      var why = {
        FCFS: L('earliest arrival', 'sabse pehle aaya'),
        SJF: L('shortest burst', 'sabse chhota burst'),
        SRTF: L('least remaining time', 'sabse kam remaining'),
        PRIO: L('highest priority (lowest number)', 'sabse unchi priority (chhota number)')
      }[a];
      var tailTxt = d.finished ? L(' runs to completion at t' + end + '.', ' t' + end + ' pe complete.')
        : L(' runs until t' + end + ' (next arrival → re-check).', ' t' + end + ' tak chalega (next arrival → dobara check).');
      return 't' + d.t + ': ' + lst + ' → ' + P + ' (' + why + tie + ')' + tailTxt;
    }

    function onPick(pid) {
      var prob = q.prob, d = prob.sim.decisions[q.k];
      var ok = pid === d.choice;
      q.picks.push(pid);
      if (!ok) { q.stepErr++; q.errAlgo = true; }
      q.msgOk = ok;
      var why = reasonLine(prob, d);
      q.msg = (ok ? '✓ ' + pname(pid) + '. ' : L('✗ Not ' + pname(pid) + ' — it is ' + pname(d.choice) + '. ', '✗ ' + pname(pid) + ' nahi — ' + pname(d.choice) + ' hoga. ')) +
        '<span class="small" style="font-weight:400">' + why + '</span>';
      q.k++;
      renderQ();
    }

    function parseNum(s) {
      s = String(s || '').trim();
      if (!/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(s)) return NaN;
      return parseFloat(s);
    }

    function onSubmit() {
      if (q.answered) return;
      var prob = q.prob, sim = prob.sim, inp = qEl.querySelector('[data-in="ans"]');
      var v = parseNum(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      q.answered = true;
      var exact = prob.ask === 'WT' ? sim.avgWT : sim.avgTAT;
      var ansOk = Math.abs(v - exact) <= 0.01 + 1e-9;
      var correct = ansOk && q.stepErr === 0;
      if (correct) score++;
      else {
        addRevise(ALGO_NAME[prob.algo]);
        if (q.stepErr) addRevise(L('Gantt chart order', 'Gantt chart order') + ' — ' + prob.algo);
        if (!ansOk) addRevise(prob.ask === 'WT' ? 'WT = TAT − BT' : 'TAT = CT − AT');
      }
      updateStatus();
      inp.disabled = true;
      var sb = qEl.querySelector('[data-final] button'); if (sb) sb.remove();

      var rules = [];
      if (q.stepErr) {
        var r = {
          FCFS: L('FCFS never looks at burst length — only who arrived first.', 'FCFS burst nahi dekhta — sirf kaun pehle aaya.'),
          SJF: L('Non-preemptive SJF decides only when the CPU becomes free, and only among processes that have ALREADY arrived.', 'Non-preemptive SJF sirf CPU free hone pe decide karta hai, aur sirf un processes me jo AA CHUKE hain.'),
          SRTF: L('SRTF compares REMAINING time (not original burst) at every arrival; a new shorter job preempts immediately.', 'SRTF har arrival pe REMAINING time compare karta hai (original burst nahi); naya chhota job turant preempt karta hai.'),
          RR: L('RR is a FIFO queue: at a quantum expiry first add the processes that arrived (up to and including that instant), then put the preempted process at the tail.', 'RR ek FIFO queue hai: quantum khatam hone pe pehle naye aaye processes (usi instant tak) daalo, phir preempted process tail pe.'),
          PRIO: L('Preemptive priority: lower number wins, checked at every arrival; the running process is preempted if a better one arrives.', 'Preemptive priority: chhota number jeetta hai, har arrival pe check; behtar process aaya to running wala preempt hota hai.')
        }[prob.algo];
        rules.push(r);
        rules.push(L('The CPU is Idle only when no unfinished process has arrived yet.', 'CPU Idle tabhi hota hai jab koi unfinished process abhi tak aaya hi na ho.'));
      }
      if (!ansOk) rules.push(prob.ask === 'WT'
        ? L('Waiting time = TAT − BT = CT − AT − BT for each process; then average. Don\'t use the start time alone — a preempted process waits more than once.', 'Waiting time = TAT − BT = CT − AT − BT har process ka; phir average. Sirf start time mat lo — preempt hua process kai baar wait karta hai.')
        : L('Turnaround time = CT − AT (completion minus arrival) for each process; then average.', 'Turnaround time = CT − AT (completion minus arrival) har process ka; phir average.'));

      var verdict = correct ? L('✓ Correct!', '✓ Sahi jawab!')
        : (ansOk ? L('✗ Average right, but ' + q.stepErr + ' Gantt step(s) were wrong — a question counts only when every step is right.', '✗ Average sahi, par Gantt ke ' + q.stepErr + ' step galat the — sawaal tabhi count hota hai jab har step sahi ho.')
          : L('✗ Not quite. Correct answer: ', '✗ Galat. Sahi jawab: ') + exact.toFixed(2));
      var decs = sim.decisions;
      var fb = qEl.querySelector('[data-fb]');
      fb.innerHTML = '<div class="feedback ' + (correct ? 'ok' : 'bad') + '" role="status">' +
        '<div class="verdict">' + verdict + '</div>' +
        (rules.length ? '<div><b>' + L('Rule to remember', 'Yaad rakho') + ':</b><ul style="margin:4px 0 0;padding-left:1.2em">' + rules.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div style="font-weight:700">' + L('Correct Gantt chart', 'Sahi Gantt chart') + '</div>' +
        ganttHTML(sim.segs.map(function (s) { return { pid: s.pid, s: s.s, e: s.e }; }), null) +
        '<ol class="g-steps">' + decs.map(function (d, i) {
          var err = q.picks[i] !== d.choice;
          return '<li' + (err ? ' class="err"' : '') + '>' + (err ? '✗ ' + L('you chose ', 'aapne chuna ') + pname(q.picks[i]) + '. ' : '') + reasonLine(prob, d) + '</li>';
        }).join('') + '</ol>' +
        procTable(prob, sim.rows) +
        '<div class="mono small">' + (prob.ask === 'WT'
          ? 'Avg WT = (' + sim.rows.map(function (x) { return x.wt; }).join(' + ') + ') / ' + sim.rows.length + ' = ' + sim.sumWT + '/' + sim.rows.length + ' = ' + sim.avgWT.toFixed(2)
          : 'Avg TAT = (' + sim.rows.map(function (x) { return x.tat; }).join(' + ') + ') / ' + sim.rows.length + ' = ' + sim.sumTAT + '/' + sim.rows.length + ' = ' + sim.avgTAT.toFixed(2)) + ' ms</div>' +
        '<div class="row"><button type="button" class="btn primary" data-next>' + (qi + 1 >= ROUND ? L('See results', 'Result dekho') : L('Next question →', 'Agla sawaal →')) + '</button></div>' +
        '</div>';
      var nb = fb.querySelector('[data-next]');
      nb.addEventListener('click', function () { qi++; if (qi >= ROUND) endRound(); else nextQuestion(); });
      nb.focus();
    }

    function endRound() {
      if (timer) { clearInterval(timer); timer = null; }
      var secs = elapsed();
      playEl.hidden = true; endEl.hidden = false;
      var rev = Object.keys(revise).sort(function (a, b) { return revise[b] - revise[a]; });
      endEl.innerHTML =
        '<h2>' + L('Round complete', 'Round khatam') + '</h2>' +
        '<div class="row"><span class="g-bigscore">' + score + ' / ' + ROUND + '</span><span class="muted">Level ' + level + ' · ' + fmtTime(secs) + '</span></div>' +
        (rev.length
          ? '<div><b>' + L('Revise', 'Revise karo') + ':</b><ul style="margin:4px 0 0;padding-left:1.2em">' + rev.map(function (r) { return '<li>' + r + ' (' + revise[r] + ')</li>'; }).join('') + '</ul></div>'
          : '<p style="margin:0">' + L('Clean round — nothing to revise. Try the next level.', 'Ekdum clean round — kuch revise nahi. Agla level try karo.') + '</p>') +
        '<div class="row"><button type="button" class="btn" data-again>' + L('Play again', 'Phir se khelo') + '</button>' +
        '<button type="button" class="btn primary" data-nextlv>' + (level < 3 ? L('Next level', 'Agla level') : L('Level 3 again', 'Level 3 phir se')) + '</button></div>';
      endEl.querySelector('[data-again]').addEventListener('click', startRound);
      endEl.querySelector('[data-nextlv]').addEventListener('click', function () { setLevel(Math.min(3, level + 1)); startRound(); });
      try { api.done({ correct: score, total: ROUND, level: level, seconds: secs }); } catch (e) { /* ignore host errors */ }
    }

    setLevel(1);
    return function cleanup() { if (timer) clearInterval(timer); timer = null; root.innerHTML = ''; };
  }

  (window.GATE_GAMES = window.GATE_GAMES || []).push({
    id: ID,
    title: 'Gantt Builder',
    subj: 'os',
    topics: ['CPU scheduling'],
    blurb: 'Build Gantt charts for FCFS, SJF, SRTF, Round Robin and preemptive Priority, then compute average waiting / turnaround time — asked in GATE nearly every year.',
    _logic: logic,
    mount: mount
  });
})();
