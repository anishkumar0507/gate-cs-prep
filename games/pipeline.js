/* Pipeline Hazard Lab — GATE CS Prep Desk concept game (COA: pipelining, hazards, forwarding). */
(function () {
  'use strict';
  const GID = 'pipeline';
  const ROOT = 'g-' + GID;

  // ---------- utils ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const r2 = x => Math.round(x * 100) / 100;
  const fmt = x => String(r2(x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function parseNum(s) {
    s = String(s || '').trim().replace(/[,\s_]/g, '');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }
  const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];

  // ---------- formula questions ----------
  function genFormula(level) {
    const p = { kind: 'formula' };
    if (level === 1) {
      p.type = pick(['cycles', 'cycles', 'time', 'speedup', 'thru']);
      p.k = rnd(4, 6); p.n = p.type === 'cycles' ? rnd(4, 8) : rnd(5, 20);
      p.unit = 'ns'; p.st = Array.from({ length: p.k }, () => rnd(2, 10)); p.latch = pick([0, 1, 1]);
    } else if (level === 2) {
      p.type = pick(['cycles', 'time', 'speedup', 'speedupInf', 'thru']);
      p.k = rnd(4, 8); p.n = pick([100, 200, 250, 500, 1000]);
      p.unit = 'ps'; p.st = Array.from({ length: p.k }, () => rnd(10, 40) * 10); p.latch = pick([5, 10, 15, 20]);
    } else {
      p.type = pick(['splitStage', 'branch', 'time', 'splitStage', 'branch']);
      p.k = rnd(4, 6); p.n = pick([100, 500, 1000]);
      p.unit = 'ps'; p.st = Array.from({ length: p.k }, () => rnd(10, 40) * 10); p.latch = pick([5, 10, 20]);
      if (p.type === 'branch') { p.k = 5; p.t = pick([1, 2, 2.5, 4, 5]); p.f = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4]); p.s = pick([1, 2, 3]); }
    }
    if (p.type === 'splitStage') {
      const mx = Math.max(...p.st); p.st = p.st.map(x => x); // ensure the slowest is unique and clearly slowest
      const i = p.st.indexOf(mx); p.st[i] = mx + 60;
      p.slow = i;
    }
    p.ans = solveFormula(p);
    return p;
  }
  function cycleTime(st, latch) { return Math.max(...st) + latch; }
  function solveFormula(p) {
    const tc = cycleTime(p.st, p.latch), k = p.k, n = p.n;
    switch (p.type) {
      case 'cycles': return k + n - 1;
      case 'time': return p.unit === 'ns' ? (k + n - 1) * tc : (k + n - 1) * tc / 1000; // answer in ns
      case 'speedup': return n * sum(p.st) / ((k + n - 1) * tc);
      case 'speedupInf': return sum(p.st) / tc;
      case 'thru': return p.unit === 'ns' ? 1000 / tc : 1e6 / tc; // MIPS
      case 'splitStage': {
        const st2 = splitSlowest(p.st, p.slow);
        return tc / cycleTime(st2, p.latch);
      }
      case 'branch': return (1 + p.f * p.s) * p.t; // avg time per instruction, ns
    }
  }
  function splitSlowest(st, i) { const a = st.slice(); const h = a[i] / 2; a.splice(i, 1, h, h); return a; }

  // ---------- hazard questions ----------
  const REGS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
  function genProg(n) {
    const prog = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const op = i === 0 ? pick(['ADD', 'SUB', 'LOAD', 'LOAD']) : r < 0.32 ? 'LOAD' : r < 0.47 ? 'STORE' : r < 0.75 ? 'ADD' : 'SUB';
      const recent = prog.slice(-2).filter(x => x.dst).map(x => x.dst);
      const src = pr => (recent.length && Math.random() < pr) ? pick(recent) : pick(REGS);
      const ins = { op, imm: pick([0, 4, 8, 12, 16]) };
      if (op === 'ADD' || op === 'SUB') { ins.srcs = [src(0.6), src(0.3)]; while (ins.srcs[1] === ins.srcs[0]) ins.srcs[1] = pick(REGS); ins.dst = pick(REGS); }
      else if (op === 'LOAD') { ins.srcs = [src(0.35)]; ins.dst = pick(REGS); }
      else { ins.srcs = [src(0.6), src(0.25)]; while (ins.srcs[1] === ins.srcs[0]) ins.srcs[1] = pick(REGS); ins.dst = null; }
      prog.push(ins);
    }
    return prog;
  }
  function producers(prog) {
    return prog.map((ins, i) => ins.srcs.map(s => { for (let j = i - 1; j >= 0; j--) if (prog[j].dst === s) return j; return -1; }));
  }
  // closed-form schedule (cycle numbers are 1-based)
  function schedule(prog, fwd) {
    const pr = producers(prog), r = [];
    prog.forEach((ins, i) => {
      const IF = i === 0 ? 1 : r[i - 1].ID;
      const ID = i === 0 ? 2 : Math.max(IF + 1, r[i - 1].EX);
      let EX = ID + 1; const why = [];
      pr[i].forEach((j, t) => {
        if (j < 0) return;
        const need = fwd ? (prog[j].op === 'LOAD' ? r[j].MEM + 1 : r[j].EX + 1) : r[j].WB + 1;
        why.push({ t, j, need });
        EX = Math.max(EX, need);
      });
      r.push({ IF, ID, EX, MEM: EX + 1, WB: EX + 2, stall: EX - ID - 1, why });
    });
    return r;
  }
  function genHazard(level, type) {
    for (let t = 0; t < 5000; t++) {
      const n = level === 2 ? 4 : rnd(5, 6);
      const prog = genProg(n);
      const fwd = type === 'compare' ? null : Math.random() < 0.5;
      const sNo = schedule(prog, false), sYes = schedule(prog, true);
      const stNo = sum(sNo.map(x => x.stall)), stYes = sum(sYes.map(x => x.stall));
      if (stNo === 0) continue;
      if (level === 3 && stNo < 3) continue;
      if (fwd === true && level === 3 && stYes === 0 && Math.random() < 0.7) continue; // mostly include a load-use
      if (type === 'compare' && stYes === stNo) continue;
      const pr = producers(prog);
      const deps = []; pr.forEach((a, i) => a.forEach((j, k) => { if (j >= 0) deps.push(i + ':' + k); }));
      return { kind: 'hazard', type, prog, fwd, pr, deps, sNo, sYes, totNo: sNo[n - 1].WB, totYes: sYes[n - 1].WB, stNo, stYes };
    }
    throw new Error('genHazard failed');
  }

  function genRound(level) {
    let qs;
    if (level === 1) qs = Array.from({ length: 10 }, () => genFormula(1));
    else if (level === 2) qs = [].concat(Array.from({ length: 4 }, () => genFormula(2)), Array.from({ length: 6 }, () => genHazard(2, 'chart')));
    else qs = [].concat(Array.from({ length: 3 }, () => genFormula(3)), Array.from({ length: 4 }, () => genHazard(3, 'chart')), Array.from({ length: 3 }, () => genHazard(3, 'compare')));
    return shuffle(qs);
  }

  // ---------- rendering helpers ----------
  function insText(ins) {
    if (ins.op === 'LOAD') return `LOAD ${ins.dst}, ${ins.imm}(${ins.srcs[0]})`;
    if (ins.op === 'STORE') return `STORE ${ins.srcs[0]}, ${ins.imm}(${ins.srcs[1]})`;
    return `${ins.op} ${ins.dst}, ${ins.srcs[0]}, ${ins.srcs[1]}`;
  }
  function insMeaning(ins) {
    if (ins.op === 'LOAD') return `${ins.dst} ← M[${ins.srcs[0]} + ${ins.imm}]`;
    if (ins.op === 'STORE') return `M[${ins.srcs[1]} + ${ins.imm}] ← ${ins.srcs[0]}`;
    return `${ins.dst} ← ${ins.srcs[0]} ${ins.op === 'ADD' ? '+' : '−'} ${ins.srcs[1]}`;
  }
  // rows: [{label, IF, ID, EX}] for hazard schedules; or ideal pipeline for n,k
  function diagramHTML(rows, stageNames) {
    const T = Math.max(...rows.map(r => r.cells.length));
    const head = '<tr><th></th>' + Array.from({ length: T }, (_, c) => `<th>${c + 1}</th>`).join('') + '</tr>';
    const body = rows.map(r => `<tr><th class="pl-rl">${r.label}</th>` + Array.from({ length: T }, (_, c) => {
      const v = r.cells[c] || '';
      const cls = v === 's' ? 'pl-s' : v ? 'pl-st' : '';
      return `<td class="${cls}">${v === 's' ? 'stall' : v}</td>`;
    }).join('') + '</tr>').join('');
    return `<div class="tscroll pl-diag"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }
  function hazardRows(prog, sch) {
    return sch.map((s, i) => {
      const cells = [];
      cells[s.IF - 1] = 'IF';
      for (let c = s.IF + 1; c < s.ID; c++) cells[c - 1] = 's';
      cells[s.ID - 1] = 'ID';
      for (let c = s.ID + 1; c < s.EX; c++) cells[c - 1] = 's';
      cells[s.EX - 1] = 'EX'; cells[s.MEM - 1] = 'MEM'; cells[s.WB - 1] = 'WB';
      return { label: 'I' + (i + 1), cells };
    });
  }
  function idealRows(n, k) {
    const names = k === 5 ? STAGES : Array.from({ length: k }, (_, s) => 'S' + (s + 1));
    return Array.from({ length: n }, (_, i) => { const cells = []; for (let s = 0; s < k; s++) cells[i + s] = names[s]; return { label: 'I' + (i + 1), cells }; });
  }

  function injectStyle() {
    if (document.getElementById(ROOT + '-style')) return;
    const st = document.createElement('style'); st.id = ROOT + '-style';
    const R = '.' + ROOT;
    st.textContent = [
      R + '{display:flex;flex-direction:column;gap:16px}',
      R + ' .pl-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}',
      R + ' .pl-lv button[aria-pressed="true"]{background:var(--pen);color:var(--sheet);border-color:var(--pen)}',
      R + ' .pl-stat{gap:8px 18px;font-family:var(--f-mono)}',
      R + ' details.pl-how summary{cursor:pointer;font-weight:700}',
      R + ' details.pl-how ul,' + R + ' .pl-assume ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
      R + ' .pl-q{white-space:pre-wrap;font-size:1.02rem;line-height:1.6;overflow-wrap:anywhere;margin:0}',
      R + ' .pl-hint{border-left:3px solid var(--marker);padding-left:10px;font-size:.9rem;color:var(--muted);margin:0}',
      R + ' .pl-assume{font-size:.88rem;color:var(--muted);border:1px dashed var(--line);border-radius:8px;padding:8px 12px}',
      R + ' .pl-assume summary{cursor:pointer;font-weight:600;color:var(--ink)}',
      R + ' .pl-code{display:flex;flex-direction:column;gap:6px;font-family:var(--f-mono)}',
      R + ' .pl-line{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--paper)}',
      R + ' .pl-line .pl-lab{font-weight:700;min-width:28px}',
      R + ' .pl-line .pl-mean{font-size:.78rem;color:var(--muted);margin-left:auto}',
      R + ' .pl-tok{font:600 .95rem var(--f-mono);padding:2px 8px;border:1px dashed var(--muted);border-radius:4px;background:var(--sheet);color:var(--ink);cursor:pointer}',
      R + ' .pl-tok[aria-pressed="true"]{background:var(--marker);border-style:solid;border-color:var(--ink)}',
      R + ' .pl-tok.ok{background:var(--ok-bg);border-color:var(--ok);border-style:solid}',
      R + ' .pl-tok.bad{background:var(--bad-bg);border-color:var(--bad);border-style:solid}',
      R + ' .pl-chart{display:flex;flex-wrap:wrap;gap:8px}',
      R + ' .pl-in{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600}',
      R + ' .pl-in input{font:600 1rem var(--f-mono);width:90px;background:var(--sheet);border:1px solid var(--line);border-radius:6px;padding:6px 8px}',
      R + ' .pl-in.wide input{width:220px;max-width:100%}',
      R + ' .pl-diag table{width:auto;font-size:.78rem}',
      R + ' .pl-diag th,' + R + ' .pl-diag td{padding:4px 6px;text-align:center;border:1px solid var(--line);white-space:nowrap;font-family:var(--f-mono)}',
      R + ' .pl-diag td.pl-st{background:var(--pen-soft);color:var(--pen);font-weight:700}',
      R + ' .pl-diag td.pl-s{background:var(--bad-bg);color:var(--bad);font-style:italic}',
      R + ' .pl-exp{display:flex;flex-direction:column;gap:6px}',
      R + ' .pl-exp p{margin:0}',
      R + ' .pl-exp ul{margin:0;padding-left:1.2em}',
      R + ' .pl-big{font:800 2.2rem var(--f-display);line-height:1}'
    ].join('\n');
    document.head.appendChild(st);
  }

  const HOW = {
    english: [
      'k-stage pipeline, n instructions, no stalls: <b>cycles = k + n − 1</b> (k to fill, then one finishes per cycle).',
      'Cycle time = slowest stage + latch delay. Pipelined time = (k + n − 1) × cycle time.',
      'Non-pipelined time per instruction = sum of stage delays. Speedup = n·Σstages ÷ ((k + n − 1)·cycle); for large n → Σstages ÷ cycle.',
      'Throughput (large n) = 1 instruction per cycle. Stalls: average CPI = 1 + (stall cycles per instruction).',
      'RAW hazard: an instruction reads a register an earlier instruction has not yet written back.',
      'No forwarding (write 1st half, read 2nd half): consumer\'s ID can be in the producer\'s WB cycle → 2 stalls if back-to-back.',
      'With forwarding: ALU → ALU needs 0 stalls; LOAD → next instruction (load-use) needs 1 stall.'
    ],
    hinglish: [
      'k-stage pipeline, n instructions, koi stall nahi: <b>cycles = k + n − 1</b> (k cycles bharne mein, phir har cycle ek instruction khatam).',
      'Cycle time = sabse slow stage + latch delay. Pipelined time = (k + n − 1) × cycle time.',
      'Non-pipelined mein ek instruction = saare stage delays ka sum. Speedup = n·Σstages ÷ ((k + n − 1)·cycle); bade n ke liye → Σstages ÷ cycle.',
      'Throughput (bada n) = har cycle 1 instruction. Stalls ho to average CPI = 1 + (har instruction ke stall cycles).',
      'RAW hazard: instruction woh register padhna chahta hai jo pichla instruction abhi tak likh nahi paaya.',
      'Forwarding nahi (pehle half mein write, doosre half mein read): consumer ka ID producer ke WB wale cycle mein ho sakta hai → back-to-back ho to 2 stalls.',
      'Forwarding ke saath: ALU → ALU 0 stall; LOAD → turant agla instruction (load-use) 1 stall.'
    ]
  };
  const ASSUME = {
    english: [
      '5 stages IF ID EX MEM WB, 1 cycle each; instructions issue in order, one per cycle.',
      'Registers are read in ID and written in WB. The register file is written in the first half of a cycle and read in the second half, so ID may share a cycle with the producer\'s WB.',
      'On a hazard the instruction waits in ID (bubble into EX); the instruction behind it waits in IF.',
      'With forwarding: an ALU result is forwarded from the end of EX to the next EX; a LOAD\'s data is ready only at the end of MEM (load-use = 1 stall). Every source (including STORE\'s data register) is needed at the start of EX.',
      'Only RAW hazards cause stalls: no structural or branch hazards; WAR/WAW cannot happen in this in-order pipeline.'
    ],
    hinglish: [
      '5 stages IF ID EX MEM WB, har stage 1 cycle; instructions order mein, har cycle ek issue hota hai.',
      'Register ID mein padhe jaate hain, WB mein likhe jaate hain. Register file cycle ke pehle half mein write aur doosre half mein read karti hai, isliye ID producer ke WB wale cycle mein ho sakta hai.',
      'Hazard par instruction ID mein rukta hai (EX mein bubble); uske peeche wala IF mein rukta hai.',
      'Forwarding ke saath: ALU result EX ke end se agle EX ko forward hota hai; LOAD ka data MEM ke end mein hi milta hai (load-use = 1 stall). Har source (STORE ka data register bhi) EX ki shuruaat mein chahiye.',
      'Sirf RAW hazard stall karte hain: koi structural ya branch hazard nahi; in-order pipeline mein WAR/WAW hota hi nahi.'
    ]
  };

  // ---------- formula text + explanation ----------
  function stList(p) { return p.st.map(x => x + ' ' + p.unit).join(', '); }
  function formulaText(p, E) {
    const tc = cycleTime(p.st, p.latch);
    const base = E ? `A ${p.k}-stage pipeline has stage delays ${stList(p)}${p.latch ? ` and a latch (buffer) delay of ${p.latch} ${p.unit} between stages` : ' and no latch delay'}.`
      : `Ek ${p.k}-stage pipeline ke stage delays ${stList(p)} hain${p.latch ? `, aur har stage ke beech latch (buffer) delay ${p.latch} ${p.unit} hai` : ', latch delay nahi hai'}.`;
    switch (p.type) {
      case 'cycles': return E ? `A ${p.k}-stage pipeline (every stage takes one clock cycle, no stalls) executes ${p.n} instructions. How many clock cycles are needed in total?`
        : `Ek ${p.k}-stage pipeline (har stage 1 clock cycle, koi stall nahi) ${p.n} instructions chalata hai. Kul kitne clock cycles lagenge?`;
      case 'time': return base + (E ? ` How long (in ns) does it take to execute ${p.n} instructions with no stalls?${p.unit === 'ps' ? ' (2 decimals)' : ''}` : ` ${p.n} instructions (bina stall) chalane mein kitna time (ns mein) lagega?${p.unit === 'ps' ? ' (2 decimal)' : ''}`);
      case 'speedup': return base + (E ? ` A non-pipelined processor takes the sum of the stage delays per instruction (no latch). What is the speedup of the pipeline for ${p.n} instructions? (2 decimals)` : ` Non-pipelined processor ek instruction mein saare stage delays ka sum leta hai (latch nahi). ${p.n} instructions ke liye speedup kitna hai? (2 decimal)`);
      case 'speedupInf': return base + (E ? ' A non-pipelined processor takes the sum of the stage delays per instruction (no latch). What is the speedup for a very large number of instructions? (2 decimals)' : ' Non-pipelined processor ek instruction mein saare stage delays ka sum leta hai (latch nahi). Bahut saare instructions ke liye speedup kitna hai? (2 decimal)');
      case 'thru': return base + (E ? ' What is the throughput for a very large number of instructions, in MIPS (million instructions per second)? (2 decimals)' : ' Bahut saare instructions ke liye throughput MIPS (million instructions per second) mein kitna hai? (2 decimal)');
      case 'splitStage': return base + (E ? ` Pipeline P2 is made by splitting the slowest stage (${p.st[p.slow]} ${p.unit}) into two equal stages of ${p.st[p.slow] / 2} ${p.unit} each; the latch delay stays ${p.latch} ${p.unit}. What is the speedup of P2 over the original pipeline for a large number of instructions? (2 decimals)`
        : ` P2 pipeline mein sabse slow stage (${p.st[p.slow]} ${p.unit}) ko do barabar stages (${p.st[p.slow] / 2} ${p.unit} each) mein tod diya; latch delay ${p.latch} ${p.unit} hi hai. Bahut saare instructions ke liye P2 ka original par speedup kitna hai? (2 decimal)`);
      case 'branch': return E ? `A 5-stage pipeline has a ${p.t} ns clock. ${Math.round(p.f * 100)}% of instructions are branches, and each branch causes ${p.s} stall cycle${p.s > 1 ? 's' : ''}; there are no other stalls. What is the average time per instruction in ns for a long program? (2 decimals)`
        : `Ek 5-stage pipeline ka clock ${p.t} ns hai. ${Math.round(p.f * 100)}% instructions branch hain aur har branch ${p.s} stall cycle deta hai; aur koi stall nahi. Lambe program mein average time per instruction (ns, 2 decimal) kitna hai?`;
    }
    return tc;
  }
  function explainFormula(p, E) {
    const L = [], tc = cycleTime(p.st, p.latch), k = p.k, n = p.n, S = sum(p.st), mx = Math.max(...p.st);
    const tcLine = `${E ? 'Cycle time' : 'Cycle time'} = max(${p.st.join(', ')}) + ${p.latch} = ${mx} + ${p.latch} = <b>${tc} ${p.unit}</b>.`;
    const cyc = `${E ? 'Cycles' : 'Cycles'} = k + n − 1 = ${k} + ${n} − 1 = <b>${k + n - 1}</b>.`;
    switch (p.type) {
      case 'cycles':
        L.push(E ? `The first instruction needs k = ${k} cycles to pass through all stages; after that one instruction completes every cycle, so the other ${n - 1} need ${n - 1} more.` : `Pehla instruction saare stages paar karne mein k = ${k} cycles leta hai; uske baad har cycle ek instruction khatam hota hai, to baaki ${n - 1} ke liye ${n - 1} aur.`);
        L.push(cyc);
        if (n <= 8) L.push((E ? 'Space-time diagram:' : 'Space-time diagram:') + diagramHTML(idealRows(n, k)));
        else L.push((E ? `Space-time diagram (first 4 of ${n} instructions; each next row shifts one cycle right, so I${n} ends in cycle ${k} + ${n - 1} = ${k + n - 1}):` : `Space-time diagram (${n} mein se pehle 4 instructions; har agli row ek cycle right khisakti hai, isliye I${n} cycle ${k} + ${n - 1} = ${k + n - 1} mein khatam):`) + diagramHTML(idealRows(4, k)));
        break;
      case 'time':
        L.push(tcLine); L.push(cyc);
        L.push(`Time = ${k + n - 1} × ${tc} ${p.unit} = ${(k + n - 1) * tc} ${p.unit}${p.unit === 'ps' ? ' = <b>' + fmt(p.ans) + ' ns</b>' : ' = <b>' + p.ans + ' ns</b>'}.`);
        break;
      case 'speedup':
        L.push(E ? `Non-pipelined: each instruction takes ${p.st.join(' + ')} = ${S} ${p.unit}; ${n} instructions → ${n * S} ${p.unit}.` : `Non-pipelined: har instruction ${p.st.join(' + ')} = ${S} ${p.unit}; ${n} instructions → ${n * S} ${p.unit}.`);
        L.push(tcLine); L.push(cyc + ` Pipelined = ${k + n - 1} × ${tc} = ${(k + n - 1) * tc} ${p.unit}.`);
        L.push(`Speedup = ${n * S} / ${(k + n - 1) * tc} = <b>${fmt(p.ans)}</b>.`);
        break;
      case 'speedupInf':
        L.push(E ? `For large n, (k + n − 1) ≈ n, so pipelined time per instruction ≈ one cycle.` : `Bade n ke liye (k + n − 1) ≈ n, yaani pipelined mein har instruction ≈ ek cycle.`);
        L.push(tcLine);
        L.push(`Speedup = Σstages / cycle = ${S} / ${tc} = <b>${fmt(p.ans)}</b>.`);
        L.push(E ? `(It is below k = ${k} because stages are unequal and the latch adds delay.)` : `(Yeh k = ${k} se kam hai kyunki stages barabar nahi hain aur latch delay judta hai.)`);
        break;
      case 'thru':
        L.push(tcLine);
        L.push(E ? 'For large n one instruction completes every cycle.' : 'Bade n ke liye har cycle ek instruction complete hota hai.');
        L.push(p.unit === 'ns' ? `Throughput = 1 / ${tc} ns = 10⁹ / ${tc} per s = 1000 / ${tc} MIPS = <b>${fmt(p.ans)} MIPS</b>.` : `Throughput = 1 / ${tc} ps = 10¹² / ${tc} per s = 10⁶ / ${tc} MIPS = <b>${fmt(p.ans)} MIPS</b>.`);
        break;
      case 'splitStage': {
        const st2 = splitSlowest(p.st, p.slow), tc2 = cycleTime(st2, p.latch);
        L.push((E ? 'Original: ' : 'Original: ') + tcLine);
        L.push(`P2 stages = ${st2.join(', ')} → ${E ? 'cycle' : 'cycle'} = max = ${Math.max(...st2)} + ${p.latch} = <b>${tc2} ${p.unit}</b>.`);
        L.push(E ? `For large n both pipelines finish ≈ one instruction per cycle, so speedup = old cycle / new cycle = ${tc} / ${tc2} = <b>${fmt(p.ans)}</b>. (The extra stage only matters for the k − 1 fill cycles.)`
          : `Bade n ke liye dono har cycle ≈ ek instruction dete hain, to speedup = purana cycle / naya cycle = ${tc} / ${tc2} = <b>${fmt(p.ans)}</b>. (Extra stage sirf k − 1 fill cycles mein farak daalta hai.)`);
        if (Math.max(...st2) !== p.st[p.slow] / 2) L.push(E ? `Note: after the split, the new slowest stage is ${Math.max(...st2)} ${p.unit}, not ${p.st[p.slow] / 2}.` : `Dhyan do: split ke baad naya slowest stage ${Math.max(...st2)} ${p.unit} hai, ${p.st[p.slow] / 2} nahi.`);
        break;
      }
      case 'branch':
        L.push(E ? `Ideal CPI = 1. Each branch adds ${p.s} stall cycle(s) and a fraction ${p.f} of instructions are branches.` : `Ideal CPI = 1. Har branch ${p.s} stall cycle jodta hai aur ${p.f} fraction instructions branch hain.`);
        L.push(`CPI = 1 + ${p.f} × ${p.s} = ${fmt(1 + p.f * p.s)}.`);
        L.push(`${E ? 'Average time' : 'Average time'} = CPI × cycle = ${fmt(1 + p.f * p.s)} × ${p.t} ns = <b>${fmt(p.ans)} ns</b>.`);
        break;
    }
    return L.map(x => '<p>' + x + '</p>').join('');
  }

  // ---------- hazard explanation ----------
  function explainSchedule(q, fwd, E) {
    const sch = fwd ? q.sYes : q.sNo, prog = q.prog, L = [];
    L.push(`<b>${fwd ? (E ? 'With operand forwarding' : 'Operand forwarding ke saath') : (E ? 'Without operand forwarding' : 'Bina operand forwarding')}</b>`);
    const items = sch.map((s, i) => {
      const parts = [];
      s.why.forEach(w => {
        const src = prog[i].srcs[w.t], j = w.j, pj = sch[j];
        let rule;
        if (!fwd) rule = E ? `${src} is written by I${j + 1} in the 1st half of its WB (cycle ${pj.WB}); I${i + 1} can read it in ID (2nd half) in cycle ${pj.WB} at the earliest → EX ≥ ${w.need}`
          : `${src} ko I${j + 1} apne WB (cycle ${pj.WB}) ke pehle half mein likhta hai; I${i + 1} ID mein (doosre half mein) jaldi se jaldi cycle ${pj.WB} mein padh sakta hai → EX ≥ ${w.need}`;
        else if (prog[j].op === 'LOAD') rule = E ? `${src} comes from LOAD I${j + 1}, ready at end of MEM (cycle ${pj.MEM}) → forwarded, EX ≥ ${w.need}`
          : `${src} LOAD I${j + 1} se aata hai, MEM ke end (cycle ${pj.MEM}) par ready → forward, EX ≥ ${w.need}`;
        else rule = E ? `${src} comes from I${j + 1}'s ALU, ready at end of EX (cycle ${pj.EX}) → forwarded, EX ≥ ${w.need}`
          : `${src} I${j + 1} ke ALU se aata hai, EX ke end (cycle ${pj.EX}) par ready → forward, EX ≥ ${w.need}`;
        parts.push(rule);
      });
      const head = `I${i + 1} <span class="mono">${insText(prog[i])}</span>: ID ${s.ID}`;
      const tail = ` → EX ${s.EX}, WB ${s.WB} — <b>${s.stall} stall${s.stall === 1 ? '' : 's'}</b>`;
      return '<li>' + head + (parts.length ? '; ' + parts.join('; ') : (E ? '; no RAW dependency' : '; koi RAW dependency nahi')) + tail + '</li>';
    });
    L.push('<ul>' + items.join('') + '</ul>');
    L.push(diagramHTML(hazardRows(prog, sch)));
    const tot = sch[sch.length - 1].WB, st = sum(sch.map(x => x.stall)), n = prog.length;
    L.push(E ? `Total = last WB = cycle <b>${tot}</b> = (5 + ${n} − 1) + ${st} stalls.` : `Total = last WB = cycle <b>${tot}</b> = (5 + ${n} − 1) + ${st} stalls.`);
    return L.map(x => x.startsWith('<ul') || x.startsWith('<div') ? x : '<p>' + x + '</p>').join('');
  }
  function explainDeps(q, E) {
    const list = [];
    q.pr.forEach((a, i) => a.forEach((j, t) => { if (j >= 0) list.push(`I${i + 1} ${E ? 'reads' : 'padhta hai'} ${q.prog[i].srcs[t]} ← ${E ? 'written by' : 'likha'} I${j + 1} (${q.prog[j].op}), ${E ? 'distance' : 'distance'} ${i - j}`); }));
    return `<p><b>RAW ${E ? 'dependencies' : 'dependencies'}:</b> ${list.length ? list.join('; ') : '—'}. ${E ? '(For a register written twice, only the latest earlier writer counts.)' : '(Register do baar likha ho to sirf sabse latest writer count hota hai.)'}</p>`;
  }

  // ---------- game ----------
  const game = {
    id: GID,
    title: 'Pipeline Hazard Lab',
    subj: 'coa',
    topics: ['Pipelining (speedup & throughput)', 'Pipeline hazards & forwarding'],
    blurb: 'Count pipeline cycles, speedup and throughput, then hunt RAW hazards and fill the stall chart with and without forwarding.',
    mount(root, api) {
      injectStyle();
      const en = () => api.lang() !== 'hinglish';
      const S = { level: 1, qs: [], i: 0, correct: 0, t0: 0, timer: null, done: false, wrong: {}, collect: null };
      root.innerHTML = `<div class="${ROOT}">
        <div class="panel">
          <div class="pl-head"><h2>Pipeline Hazard Lab</h2>
            <div class="row pl-lv" role="group" aria-label="Level">${[1, 2, 3].map(l => `<button type="button" class="btn" data-lv="${l}" aria-pressed="false">Level ${l}</button>`).join('')}</div></div>
          <div class="row small pl-stat" aria-live="polite"><span class="pl-prog"></span><span class="pl-score"></span><span class="pl-time">00:00</span></div>
        </div>
        <details class="panel pl-how"><summary>How it works</summary><ul class="pl-howbody"></ul></details>
        <div class="panel pl-main"></div></div>`;
      const $ = s => root.querySelector(s);
      const main = $('.pl-main');
      root.querySelectorAll('.pl-lv button').forEach(b => b.addEventListener('click', () => start(+b.dataset.lv)));
      function tick() { if (!S.done) $('.pl-time').textContent = '⏱ ' + mmss(Math.floor((Date.now() - S.t0) / 1000)); }
      function status() {
        $('.pl-prog').textContent = (en() ? 'Question ' : 'Sawaal ') + Math.min(S.i + 1, S.qs.length) + ' / ' + S.qs.length;
        $('.pl-score').textContent = 'Score ' + S.correct;
      }
      function start(level) {
        S.level = level; S.qs = genRound(level); S.i = 0; S.correct = 0; S.wrong = {}; S.done = false; S.t0 = Date.now();
        root.querySelectorAll('.pl-lv button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lv === level)));
        $('.pl-howbody').innerHTML = HOW[en() ? 'english' : 'hinglish'].map(x => '<li>' + x + '</li>').join('');
        $('.pl-how').open = level === 1;
        clearInterval(S.timer); S.timer = setInterval(tick, 1000); tick();
        show();
      }
      function show() {
        status();
        const p = S.qs[S.i], E = en();
        main.innerHTML = '';
        const q = document.createElement('div'); q.style.cssText = 'display:flex;flex-direction:column;gap:12px';
        main.appendChild(q);
        S.collect = p.kind === 'formula' ? renderFormula(q, p, E) : renderHazard(q, p, E);
        const bar = document.createElement('div'); bar.className = 'row';
        bar.innerHTML = `<button type="button" class="btn primary pl-submit">${E ? 'Check answer' : 'Answer check karo'}</button><span class="small muted pl-msg" role="status"></span>`;
        main.appendChild(bar);
        const fb = document.createElement('div'); main.appendChild(fb);
        bar.querySelector('.pl-submit').addEventListener('click', () => submit(bar, fb));
      }
      function submit(bar, fb) {
        const p = S.qs[S.i], E = en();
        const a = S.collect();
        bar.querySelector('.pl-msg').textContent = a.err || '';
        if (a.err) return;
        let ok, exp, yours = '';
        if (p.kind === 'formula') {
          ok = p.type === 'cycles' ? a.num === p.ans : Math.abs(a.num - p.ans) <= Math.max(0.015, Math.abs(p.ans) * 0.002);
          yours = `<p class="small">${E ? 'Your answer' : 'Aapka answer'}: ${a.num} ${ok ? '✓' : '✗'} · ${E ? 'correct' : 'sahi'}: ${fmt(p.ans)}</p>`;
          if (!ok) S.wrong['f_' + p.type] = 1;
          exp = explainFormula(p, E);
        } else {
          const want = new Set(p.deps), got = new Set(a.deps);
          const okDeps = want.size === got.size && [...want].every(x => got.has(x));
          // colour the tokens: correct/incorrect marks
          main.querySelectorAll('.pl-tok').forEach(t => {
            const key = t.dataset.key, w = want.has(key), g = got.has(key);
            if (w || g) { t.classList.add(w === g ? 'ok' : 'bad'); t.textContent = t.dataset.reg + (w === g ? ' ✓' : g ? ' ✗' : ' ✗ missed'); }
          });
          let okNum, detail;
          if (p.type === 'chart') {
            const sch = p.fwd ? p.sYes : p.sNo;
            const bad = sch.map((s, i) => a.wb[i] === s.WB ? null : i).filter(x => x !== null);
            okNum = bad.length === 0;
            detail = okNum ? '✓' : '✗ ' + bad.map(i => `I${i + 1}: ${a.wb[i]} → ${sch[i].WB}`).join(', ');
          } else {
            okNum = a.no === p.totNo && a.yes === p.totYes;
            detail = `${E ? 'without' : 'bina'} ${a.no} ${a.no === p.totNo ? '✓' : '✗ (' + p.totNo + ')'}, ${E ? 'with' : 'ke saath'} ${a.yes} ${a.yes === p.totYes ? '✓' : '✗ (' + p.totYes + ')'}`;
          }
          ok = okDeps && okNum;
          if (!okDeps) S.wrong.deps = 1;
          if (!okNum) S.wrong[p.type === 'compare' ? 'cmp' : (p.fwd ? 'fwd' : 'nofwd')] = 1;
          yours = `<p class="small">${E ? 'Dependencies' : 'Dependencies'} ${okDeps ? '✓' : '✗'} · ${p.type === 'chart' ? (E ? 'WB cycles' : 'WB cycles') : (E ? 'totals' : 'totals')} ${detail}</p>`;
          exp = explainDeps(p, E) + (p.type === 'chart' ? explainSchedule(p, p.fwd, E) : explainSchedule(p, false, E) + explainSchedule(p, true, E) +
            `<p>${E ? 'Forwarding saves' : 'Forwarding se bache'} ${p.totNo} − ${p.totYes} = <b>${p.totNo - p.totYes}</b> ${E ? 'cycles' : 'cycles'}.</p>`);
        }
        if (ok) S.correct++;
        status();
        main.querySelectorAll('button, input').forEach(el => { el.disabled = true; });
        fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
        const last = S.i === S.qs.length - 1;
        fb.innerHTML = `<div class="verdict">${ok ? (E ? '✓ Correct' : '✓ Sahi jawab') : (E ? '✗ Not quite' : '✗ Galat')}</div>${yours}<div class="exp pl-exp">${exp}</div>
          <div class="row"><button type="button" class="btn primary pl-next">${last ? (E ? 'See summary' : 'Summary dekho') : (E ? 'Next question →' : 'Agla sawaal →')}</button></div>`;
        const nx = fb.querySelector('.pl-next'); nx.addEventListener('click', () => { S.i++; if (S.i >= S.qs.length) finish(); else show(); });
        nx.focus();
      }
      function finish() {
        S.done = true; clearInterval(S.timer);
        const secs = Math.floor((Date.now() - S.t0) / 1000), E = en(), tot = S.qs.length;
        const REV = {
          f_cycles: 'Cycles = k + n − 1.',
          f_time: E ? 'Time = (k + n − 1) × (max stage + latch).' : 'Time = (k + n − 1) × (max stage + latch).',
          f_speedup: E ? 'Speedup = n·Σstages ÷ ((k + n − 1)·cycle); non-pipelined has no latch.' : 'Speedup = n·Σstages ÷ ((k + n − 1)·cycle); non-pipelined mein latch nahi.',
          f_speedupInf: E ? 'Large-n speedup = Σstages ÷ cycle time.' : 'Bade n ka speedup = Σstages ÷ cycle time.',
          f_thru: E ? 'Throughput = 1 / cycle time; convert units carefully to MIPS.' : 'Throughput = 1 / cycle time; MIPS mein unit dhyan se badlo.',
          f_splitStage: E ? 'Splitting a stage: new cycle = new max stage + latch; speedup = old cycle / new cycle.' : 'Stage todne par: naya cycle = naya max stage + latch; speedup = purana / naya cycle.',
          f_branch: E ? 'CPI with stalls = 1 + (branch fraction × penalty).' : 'Stall ke saath CPI = 1 + (branch fraction × penalty).',
          deps: E ? 'Marking RAW: every source register whose latest earlier writer is in the sequence (LOAD writes its destination; STORE writes no register).' : 'RAW mark karna: har source register jiska latest pichla writer sequence mein hai (LOAD destination likhta hai; STORE koi register nahi likhta).',
          nofwd: E ? 'No forwarding: consumer ID may share the producer\'s WB cycle (split register file) → back-to-back = 2 stalls, gap of one = 1 stall.' : 'Bina forwarding: consumer ka ID producer ke WB cycle mein ho sakta hai → back-to-back = 2 stalls, ek gap = 1 stall.',
          fwd: E ? 'Forwarding: ALU→ALU 0 stalls, LOAD→next 1 stall (data ready only after MEM).' : 'Forwarding: ALU→ALU 0 stall, LOAD→agla 1 stall (data MEM ke baad hi milta hai).',
          cmp: E ? 'Build both space-time diagrams; stalls push every later instruction back too.' : 'Dono space-time diagram banao; stall se peeche ke saare instructions bhi khisakte hain.'
        };
        const rev = Object.keys(S.wrong).map(k => '<li>' + REV[k] + '</li>').join('');
        main.innerHTML = `<p class="eyebrow">${E ? 'Round complete' : 'Round khatam'} · Level ${S.level}</p>
          <div class="pl-big">${S.correct} / ${tot}</div>
          <p class="muted" style="margin:0">${E ? 'Time' : 'Samay'}: ${mmss(secs)}</p>
          ${rev ? `<div><b>${E ? 'Revise' : 'Revise karo'}:</b><ul>${rev}</ul></div>` : `<p style="margin:0">${E ? 'Clean round — nothing to revise. Try the next level.' : 'Ek bhi galti nahi — agla level try karo.'}</p>`}
          <div class="row"><button type="button" class="btn pl-again">${E ? 'Play again' : 'Phir se khelo'}</button>${S.level < 3 ? `<button type="button" class="btn primary pl-nextlv">${E ? 'Next level' : 'Agla level'} →</button>` : ''}</div>`;
        main.querySelector('.pl-again').addEventListener('click', () => start(S.level));
        const nl = main.querySelector('.pl-nextlv'); if (nl) nl.addEventListener('click', () => start(S.level + 1));
        $('.pl-prog').textContent = (E ? 'Done ' : 'Khatam ') + tot + ' / ' + tot;
        try { api.done({ correct: S.correct, total: tot, level: S.level, seconds: secs }); } catch (e) { /* ignore host errors */ }
      }

      function numInput(box, label, wide) {
        const w = document.createElement('label'); w.className = 'pl-in' + (wide ? ' wide' : '');
        w.innerHTML = `<span>${label}</span><input type="text" inputmode="decimal" autocomplete="off">`;
        box.appendChild(w); return w.querySelector('input');
      }
      function renderFormula(box, p, E) {
        const t = document.createElement('p'); t.className = 'pl-q'; t.innerHTML = formulaText(p, E); box.appendChild(t);
        if (S.level === 1) {
          const h = document.createElement('p'); h.className = 'pl-hint';
          h.textContent = E ? 'Hint: cycles = k + n − 1; cycle time = slowest stage + latch; non-pipelined time per instruction = sum of stages.' : 'Hint: cycles = k + n − 1; cycle time = slowest stage + latch; non-pipelined mein ek instruction = stages ka sum.';
          box.appendChild(h);
        }
        const unit = { cycles: E ? 'Clock cycles' : 'Clock cycles', time: 'Time (ns)', speedup: 'Speedup', speedupInf: 'Speedup', thru: 'Throughput (MIPS)', splitStage: 'Speedup', branch: 'Time per instruction (ns)' }[p.type];
        const inp = numInput(box, unit, true);
        return () => { const n = parseNum(inp.value); return isFinite(n) ? { num: n } : { err: E ? 'Type a number.' : 'Number likho.' }; };
      }
      function renderHazard(box, p, E) {
        const n = p.prog.length;
        const t = document.createElement('p'); t.className = 'pl-q';
        const scen = p.type === 'compare' ? (E ? 'both <b>without</b> and <b>with</b> operand forwarding' : '<b>bina</b> aur <b>saath</b> operand forwarding dono')
          : (p.fwd ? (E ? '<b>with</b> operand forwarding' : 'operand forwarding <b>ke saath</b>') : (E ? '<b>without</b> operand forwarding' : 'operand forwarding <b>ke bina</b>'));
        t.innerHTML = E ? `This sequence runs on a 5-stage IF–ID–EX–MEM–WB pipeline ${scen}.` : `Yeh sequence 5-stage IF–ID–EX–MEM–WB pipeline par chalta hai, ${scen}.`;
        box.appendChild(t);
        const as = document.createElement('details'); as.className = 'pl-assume'; as.open = S.level === 2 && S.i < 3;
        as.innerHTML = `<summary>${E ? 'Assumptions (as in GATE)' : 'Assumptions (GATE jaisi)'}</summary><ul>${ASSUME[E ? 'english' : 'hinglish'].map(x => '<li>' + x + '</li>').join('')}</ul>`;
        box.appendChild(as);
        const s1 = document.createElement('p'); s1.className = 'pl-q';
        s1.innerHTML = '<b>1.</b> ' + (E ? 'Click every <b>source</b> register that has a RAW dependency on an earlier instruction in this sequence.' : 'Har us <b>source</b> register par click karo jiski RAW dependency kisi pichle instruction par hai.');
        box.appendChild(s1);
        const code = document.createElement('div'); code.className = 'pl-code'; box.appendChild(code);
        const marked = new Set();
        p.prog.forEach((ins, i) => {
          const line = document.createElement('div'); line.className = 'pl-line';
          const tok = k => { const reg = ins.srcs[k]; return `<button type="button" class="pl-tok" data-key="${i}:${k}" data-reg="${reg}" aria-pressed="false" aria-label="I${i + 1} source ${reg}">${reg}</button>`; };
          let body;
          if (ins.op === 'LOAD') body = `LOAD <span>${ins.dst},</span> <span>${ins.imm}(</span>${tok(0)}<span>)</span>`;
          else if (ins.op === 'STORE') body = `STORE ${tok(0)}<span>, ${ins.imm}(</span>${tok(1)}<span>)</span>`;
          else body = `${ins.op} <span>${ins.dst},</span> ${tok(0)}<span>,</span> ${tok(1)}`;
          line.innerHTML = `<span class="pl-lab">I${i + 1}</span>${body}<span class="pl-mean">${insMeaning(ins)}</span>`;
          code.appendChild(line);
        });
        code.querySelectorAll('.pl-tok').forEach(b => b.addEventListener('click', () => {
          const k = b.dataset.key; if (marked.has(k)) marked.delete(k); else marked.add(k);
          const on = marked.has(k); b.setAttribute('aria-pressed', String(on)); b.textContent = b.dataset.reg + (on ? ' ◆' : '');
        }));
        const s2 = document.createElement('p'); s2.className = 'pl-q';
        const chart = document.createElement('div'); chart.className = 'pl-chart';
        let get;
        if (p.type === 'chart') {
          s2.innerHTML = '<b>2.</b> ' + (E ? 'Fill the cycle chart: in which clock cycle does each instruction do its <b>WB</b>? (I1 is fetched in cycle 1.)' : 'Cycle chart bharo: har instruction ka <b>WB</b> kaunse clock cycle mein hota hai? (I1 cycle 1 mein fetch hota hai.)');
          box.appendChild(s2); box.appendChild(chart);
          const ins = Array.from({ length: n }, (_, i) => numInput(chart, `I${i + 1} WB`));
          get = () => { const v = ins.map(x => parseNum(x.value)); return v.some(x => !Number.isInteger(x)) ? null : { wb: v }; };
        } else {
          s2.innerHTML = '<b>2.</b> ' + (E ? 'Total clock cycles to complete all instructions (I1 fetched in cycle 1):' : 'Saare instructions complete hone mein kul clock cycles (I1 cycle 1 mein fetch):');
          box.appendChild(s2); box.appendChild(chart);
          const a = numInput(chart, E ? 'Without forwarding' : 'Bina forwarding', true), b = numInput(chart, E ? 'With forwarding' : 'Forwarding ke saath', true);
          get = () => { const x = parseNum(a.value), y = parseNum(b.value); return Number.isInteger(x) && Number.isInteger(y) ? { no: x, yes: y } : null; };
        }
        if (S.level === 2) {
          const h = document.createElement('p'); h.className = 'pl-hint';
          h.textContent = E ? `Hint: with no stalls, Ii does WB in cycle i + 4. ${p.fwd ? 'With forwarding only a LOAD followed immediately by its user costs a stall.' : 'Without forwarding, the user\'s ID must be in (or after) the producer\'s WB cycle.'}`
            : `Hint: bina stall Ii ka WB cycle i + 4 mein hota hai. ${p.fwd ? 'Forwarding mein sirf LOAD ke turant baad uska user stall karta hai.' : 'Bina forwarding, user ka ID producer ke WB cycle mein (ya baad) hona chahiye.'}`;
          box.appendChild(h);
        }
        return () => { const g = get(); if (!g) return { err: E ? 'Fill every box with a whole number.' : 'Har box mein poora number bharo.' }; g.deps = [...marked]; return g; };
      }

      start(1);
      return () => { clearInterval(S.timer); S.done = true; };
    },
    _t: { genFormula, solveFormula, cycleTime, splitSlowest, genProg, producers, schedule, genHazard, genRound }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(game);
})();
