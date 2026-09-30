/* Accounts, cloud sync (Supabase), study-time tracking, the Progress dashboard and the Games tab.
   Loaded after the main script; uses its globals (S, save, $, el, SUBJ, SUBJECTS, allQ, qById, showTab, startSession ...). */
(() => {
const CFG = window.GATE_CONFIG || {};
const OUT_LS = LS + '.outbox';
let sb = null, user = null, syncing = false;

/* ---------- outbox: every change is queued locally, then pushed when signed in ---------- */
function outbox() { try { return JSON.parse(localStorage.getItem(OUT_LS) || '[]') } catch (e) { return [] } }
function setOutbox(a) { try { localStorage.setItem(OUT_LS, JSON.stringify(a.slice(-8000))) } catch (e) {} }
function enqueue(table, op, row) { const a = outbox(); a.push({ table, op, row }); setOutbox(a); if (user) scheduleFlush() }
let flushTimer = null;
function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 1500) }

async function flush() {
  if (!sb || !user || syncing) return;
  const items = outbox(); if (!items.length) return;
  syncing = true; setSyncLabel('Saving…');
  let done = 0;
  try {
    for (const table of ['attempts', 'mocks', 'study_log', 'game_scores']) {
      const rows = items.filter(x => x.table === table && x.op === 'insert').map(x => x.row);
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await sb.from(table).insert(rows.slice(i, i + 500)); if (error) throw error;
      }
    }
    const srsUp = new Map(), srsDel = new Set();
    items.filter(x => x.table === 'srs').forEach(x => { if (x.op === 'upsert') { srsUp.set(x.row.qid, x.row); srsDel.delete(x.row.qid) } else { srsDel.add(x.row.qid); srsUp.delete(x.row.qid) } });
    if (srsUp.size) { const { error } = await sb.from('srs').upsert([...srsUp.values()], { onConflict: 'user_id,qid' }); if (error) throw error }
    if (srsDel.size) { const { error } = await sb.from('srs').delete().in('qid', [...srsDel]); if (error) throw error }
    const uq = items.filter(x => x.table === 'user_questions').map(x => x.row);
    if (uq.length) { const { error } = await sb.from('user_questions').upsert(uq, { onConflict: 'user_id,qid' }); if (error) throw error }
    done = items.length;
  } catch (e) {
    setSyncLabel('Not saved yet — will retry'); syncing = false; setTimeout(scheduleFlush, 30000); return;
  }
  setOutbox(outbox().slice(done)); syncing = false; setSyncLabel('Saved');
}
function withUser(row) { return user ? { ...row, user_id: user.id } : row }

/* ---------- pull everything for this student and rebuild local state ---------- */
async function pageAll(q) { const out = []; for (let from = 0; ; from += 1000) { const { data, error } = await q().range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
async function pull() {
  if (!sb || !user) return;
  setSyncLabel('Loading your progress…');
  try {
    const [att, srs, mocks, study, games, uq] = await Promise.all([
      pageAll(() => sb.from('attempts').select('qid,correct,created_at').order('created_at')),
      pageAll(() => sb.from('srs').select('qid,box,due')),
      pageAll(() => sb.from('mocks').select('label,score,max,ok,bad,na,minutes_used,taken_at').order('taken_at')),
      pageAll(() => sb.from('study_log').select('kind,subj,topic,seconds,created_at,meta').gte('created_at', new Date(Date.now() - 120 * 864e5).toISOString()).order('created_at')),
      pageAll(() => sb.from('game_scores').select('game,level,correct,total,seconds,created_at').order('created_at')),
      pageAll(() => sb.from('user_questions').select('qid,data'))
    ]);
    const pend = outbox();
    // attempts → stats, day counts, log (cloud rows + not-yet-pushed local ones)
    const rows = att.map(r => [Date.parse(r.created_at), r.qid, r.correct ? 1 : 0])
      .concat(pend.filter(x => x.table === 'attempts').map(x => [Date.parse(x.row.created_at), x.row.qid, x.row.correct ? 1 : 0]))
      .sort((a, b) => a[0] - b[0]);
    S.stats = {}; S.days = {}; S.log = rows.slice(-6000);
    rows.forEach(([t, id, ok]) => { const s = S.stats[id] || { a: 0, w: 0, c: false }; s.a++; if (!ok) s.w++; s.c = !!ok; s.t = t; S.stats[id] = s; const d = dayOf(t); S.days[d] = (S.days[d] || 0) + 1 });
    S.srs = {}; srs.forEach(r => S.srs[r.qid] = { box: r.box, due: r.due });
    pend.filter(x => x.table === 'srs').forEach(x => { if (x.op === 'upsert') S.srs[x.row.qid] = { box: x.row.box, due: x.row.due }; else delete S.srs[x.row.qid] });
    S.mocks = mocks.map(m => ({ date: Date.parse(m.taken_at), label: m.label, score: +m.score, max: +m.max, ok: m.ok, bad: m.bad, na: m.na, minutes: m.minutes_used }))
      .concat(pend.filter(x => x.table === 'mocks').map(x => ({ date: Date.parse(x.row.taken_at), label: x.row.label, score: +x.row.score, max: +x.row.max, ok: x.row.ok, bad: x.row.bad, na: x.row.na })));
    S.study = { day: {}, topic: {} }; S.read = [];
    study.concat(pend.filter(x => x.table === 'study_log').map(x => x.row)).forEach(r => addStudy(r.kind, r.subj, r.topic, r.seconds, Date.parse(r.created_at), r.meta));
    S.games = games.map(g => ({ t: Date.parse(g.created_at), game: g.game, level: g.level, correct: g.correct, total: g.total, seconds: g.seconds }));
    const have = new Set(S.bank.map(q => q.id)); uq.forEach(r => { if (!have.has(r.qid)) S.bank.push(r.data) });
    save(); setSyncLabel('Saved'); rerender();
  } catch (e) { setSyncLabel('Could not load from the cloud; showing this device only') }
}
function dayOf(t) { const d = new Date(t); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5) }

/* first sign-in on a device: send the history that was made before signing in */
function importLocal() {
  const key = LS + '.imported.' + user.id; try { if (localStorage.getItem(key)) return } catch (e) {}
  const queued = new Set(outbox().filter(x => x.table === 'attempts').map(x => x.row.qid));
  Object.entries(S.stats || {}).forEach(([id, s]) => {
    if (queued.has(id)) return; const q = qById(id); if (!q) return;
    enqueue('attempts', 'insert', { qid: id, subj: q.subj, topic: q.topic || null, source: q.src, mode: 'import', correct: !!s.c, created_at: new Date(s.t || Date.now()).toISOString() });
  });
  Object.entries(S.srs || {}).forEach(([id, r]) => enqueue('srs', 'upsert', { qid: id, box: r.box, due: r.due }));
  (S.mocks || []).forEach(m => enqueue('mocks', 'insert', { label: m.label, score: m.score, max: m.max, ok: m.ok, bad: m.bad, na: m.na, taken_at: new Date(m.date).toISOString() }));
  try { localStorage.setItem(key, '1') } catch (e) {}
}

/* ---------- public hooks used by the main script ---------- */
window.Cloud = {
  attempt(q, ok, ctx) {
    enqueue('attempts', 'insert', withUser({ qid: q.id, subj: q.subj, topic: q.topic || null, source: q.src, mode: ctx.mode || 'practice', correct: !!ok, gave_up: !!ctx.gaveUp, response: ctx.resp === undefined ? null : ctx.resp, time_ms: ctx.ms ? Math.round(ctx.ms) : null, created_at: new Date().toISOString() }));
  },
  srs(id, r) { r ? enqueue('srs', 'upsert', withUser({ qid: id, box: r.box, due: r.due })) : enqueue('srs', 'delete', { qid: id }) },
  mock(m, by) { enqueue('mocks', 'insert', withUser({ label: m.label, score: m.score, max: m.max, ok: m.ok, bad: m.bad, na: m.na, by_subject: by, minutes_used: m.minutes, taken_at: new Date(m.date).toISOString() })) },
  userQ(q) { enqueue('user_questions', 'upsert', withUser({ qid: q.id, data: q })) },
  game(g) { enqueue('game_scores', 'insert', withUser({ game: g.game, level: g.level, correct: g.correct, total: g.total, seconds: g.seconds, created_at: new Date(g.t).toISOString() })) },
  context(c) { if (c) setContext(c) }
};

/* ---------- study time: counted only while the page is visible and the student was active in the last 90 s ---------- */
let ctx = { kind: null }, lastActive = Date.now(), acc = new Map();
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastActive = Date.now() }, { passive: true }));
function setContext(c) { ctx = { kind: c.kind || null, subj: c.subj || null, topic: c.topic || null, meta: c.meta || null } }
setInterval(() => {
  if (!ctx.kind || document.visibilityState !== 'visible' || Date.now() - lastActive > 90e3) return;
  const k = JSON.stringify([ctx.kind, ctx.subj, ctx.topic]); acc.set(k, (acc.get(k) || 0) + 5);
}, 5000);
function flushStudy() {
  if (!acc.size) return;
  for (const [k, sec] of acc) { const [kind, subj, topic] = JSON.parse(k); const t = Date.now(); addStudy(kind, subj, topic, sec, t); enqueue('study_log', 'insert', withUser({ kind, subj, topic, seconds: sec, created_at: new Date(t).toISOString() })) }
  acc.clear(); save();
}
setInterval(flushStudy, 60000);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushStudy(); flush() } });
function addStudy(kind, subj, topic, sec, t, meta) {
  S.study = S.study || { day: {}, topic: {} }; S.read = S.read || [];
  const d = dayOf(t); const day = S.study.day[d] = S.study.day[d] || {}; day[kind] = (day[kind] || 0) + sec;
  const tk = [kind, subj || '', topic || ''].join('|'); S.study.topic[tk] = (S.study.topic[tk] || 0) + sec;
  if (['lesson', 'pattern', 'revision_sheet', 'doubt'].includes(kind)) {
    const last = S.read[S.read.length - 1];
    if (last && last.kind === kind && last.subj === subj && last.topic === topic && t - last.t < 30 * 60e3) { last.sec += sec; last.t = t } else S.read.push({ t, kind, subj, topic, sec });
    if (S.read.length > 300) S.read.splice(0, S.read.length - 300);
  }
}
// Learn tab: attribute time to the lesson being read
const lessonKind = { lTeach: 'lesson', lPattern: 'pattern', lRevise: 'revision_sheet' };
Object.keys(lessonKind).forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => setContext({ kind: lessonKind[id], subj: L.subj, topic: L.topic })) });
const dSend = document.getElementById('dSend'); if (dSend) dSend.addEventListener('click', () => setContext({ kind: 'doubt', subj: L.subj, topic: L.topic }));

/* ---------- sign in / out ---------- */
function setSyncLabel(t) { const b = $('#authBtn'); if (b) b.title = t; const m = $('#authMsg'); if (m && user) m.textContent = t }
function paintAuth() {
  const b = $('#authBtn'); if (!b) return;
  b.textContent = user ? (user.email || 'Account').split('@')[0] : 'Log in';
  $('#authFields').hidden = !!user; $('#authUser').hidden = !user;
  $('#authWho').textContent = user ? 'Signed in as ' + user.email : '';
  $('#authTitle').textContent = user ? 'Your account' : 'Log in to save your progress';
}
async function init() {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || location.protocol === 'file:') { $('#authBtn').hidden = true; return }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
    sb = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  } catch (e) { $('#authBtn').hidden = true; return }
  sb.auth.onAuthStateChange((ev, session) => {
    const was = user && user.id; user = session ? session.user : null; paintAuth();
    if (user && user.id !== was) setTimeout(async () => { importLocal(); await flush(); await pull() }, 0);
  });
  const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; paintAuth();
  if (user) { importLocal(); await flush(); await pull() }
}
$('#authBtn').onclick = () => { paintAuth(); $('#authMsg').textContent = ''; $('#authDlg').showModal() };
$('#authIn').onclick = async () => {
  const email = $('#authEmail').value.trim(), password = $('#authPass').value; const m = $('#authMsg');
  if (!email || password.length < 6) { m.textContent = 'Enter your email and a password of at least 6 characters.'; return }
  m.textContent = 'Logging in…';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  m.textContent = error ? (/confirm/i.test(error.message) ? 'Confirm your email first: open the link we sent you, then log in.' : 'Wrong email or password.') : 'Logged in. Loading your progress…';
};
$('#authUp').onclick = async () => {
  const email = $('#authEmail').value.trim(), password = $('#authPass').value; const m = $('#authMsg');
  if (!email || password.length < 6) { m.textContent = 'Enter your email and a password of at least 6 characters.'; return }
  m.textContent = 'Creating your account…';
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  m.textContent = error ? (/rate limit/i.test(error.message) ? 'Too many sign-ups right now. Wait an hour and try again, or ask the site owner to turn off email confirmation.' : /already registered/i.test(error.message) ? 'This email already has an account. Use Log in instead.' : error.message) : data.session ? 'Account created. Your progress now saves to your account.' : 'Account created. Open the confirmation link in your email, then log in here.';
};
$('#authOut').onclick = async () => { flushStudy(); await flush(); await sb.auth.signOut(); $('#authDlg').close(); toast('Logged out. Progress on this device stays until you log in again.') };
$('#authSync').onclick = async () => { flushStudy(); await flush(); await pull() };

function rerender() { const t = document.querySelector('nav.tabs button[aria-selected="true"]'); if (t) showTab(t.dataset.tab) }

/* ---------- Progress dashboard ---------- */
const KIND = { practice: ['Practice', 'var(--pen)'], lesson: ['Lessons', 'var(--review)'], pattern: ['Lessons', 'var(--review)'], revision_sheet: ['Lessons', 'var(--review)'], doubt: ['Doubts', 'var(--muted)'], game: ['Games', 'var(--marker)'], mock: ['Mocks', 'var(--ok)'] };
function hm(sec) { const m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min' }
function gamesFor(topic) { return (window.GATE_GAMES || []).filter(g => (g.topics || []).includes(topic)) }
function topicImportance() {
  const pyq = allQ().filter(q => q.src === 'pyq' && q.year && !q.offsyl);
  const years = [...new Set(pyq.map(q => q.year))].sort((a, b) => b - a).slice(0, 5);
  const imp = {};
  pyq.filter(q => years.includes(q.year)).forEach(q => { const k = q.subj + '|' + q.topic; imp[k] = (imp[k] || 0) + q.marks });
  return imp;
}
window.renderProgress = function () {
  flushStudy();
  const pyq = allQ().filter(q => q.src === 'pyq');
  const ids = Object.keys(S.stats || {}), attempted = ids.length, right = ids.filter(id => S.stats[id].c).length;
  const d0 = today(); let wk = 0, all = 0;
  Object.entries((S.study || {}).day || {}).forEach(([d, k]) => { const s = Object.values(k).reduce((a, b) => a + b, 0); all += s; if (d0 - d < 7) wk += s });
  $('#prWho').textContent = user ? 'Saved to ' + user.email : (sb ? 'On this device only · log in to save it to your account' : 'On this device only');
  $('#prLede').textContent = attempted ? `You have answered ${attempted} different questions (${pyq.filter(q => S.stats[q.id]).length} of ${pyq.length} official PYQs). Latest-attempt accuracy: ${Math.round(right / attempted * 100)}%.` : 'Answer a few questions and your progress shows up here.';
  const st = $('#prStats'); st.innerHTML = '';
  [[attempted, 'questions answered'], [attempted ? Math.round(right / attempted * 100) + '%' : '—', 'accuracy (latest attempt)'], [hm(wk), 'studied in the last 7 days'], [hm(all), 'studied in total'], [streak(), 'day streak'], [dueList().length, 'due for revision'], [(S.mocks || []).length, 'mock tests']]
    .forEach(([v, l]) => { const d = el('div', 'stat'); d.append(el('b', null, v), el('span', null, l)); st.append(d) });

  // what to learn next
  const imp = topicImportance(), totalImp = Object.values(imp).reduce((a, b) => a + b, 0) || 1;
  const my = {}; pyq.concat(S.bank).forEach(q => { const s = S.stats[q.id]; if (!s) return; const k = q.subj + '|' + q.topic; const m = my[k] = my[k] || { a: 0, c: 0 }; m.a++; if (s.c) m.c++ });
  const rows = Object.entries(imp).map(([k, marks]) => {
    const m = my[k], accv = m ? m.c / m.a : null, conf = m ? Math.min(1, m.a / 8) : 0;
    const need = accv === null ? 0.9 : (1 - accv) * conf + 0.5 * (1 - conf);
    return { k, marks, m, accv, score: marks / totalImp * need };
  }).filter(r => !(r.accv !== null && r.accv >= 0.85 && r.m.a >= 6)).sort((a, b) => b.score - a.score).slice(0, 8);
  const box = $('#prLearn'); box.innerHTML = '';
  rows.forEach((r, i) => {
    const [subj, topic] = r.k.split('|');
    const row = el('div', 'prio'); row.append(el('span', 'n', i + 1));
    const mid = el('div'); mid.append(el('b', null, topic), el('div', 'why', SUBJ[subj].name + ' · ' + r.marks + ' marks in the last 5 years of papers · ' + (r.m ? `you: ${r.m.c}/${r.m.a} right` : 'not started yet')));
    const act = el('div', 'row');
    const qs = pyq.filter(q => q.subj === subj && q.topic === topic).sort((a, b) => (S.stats[a.id] ? 1 : 0) - (S.stats[b.id] ? 1 : 0) || b.year - a.year);
    const learn = el('button', 'btn', 'Learn'); learn.onclick = () => openLesson(subj, topic);
    const prac = el('button', 'btn primary', 'Practise ' + qs.length + ' PYQs'); prac.onclick = () => startSession(qs, 'PYQs · ' + topic);
    act.append(learn, prac);
    gamesFor(topic).slice(0, 1).forEach(g => { const b = el('button', 'btn', 'Play: ' + g.title); b.onclick = () => { showTab('games'); openGame(g.id) }; act.append(b) });
    row.append(mid, act); box.append(row);
  });
  if (!rows.length) box.append(el('p', 'empty', 'Great work: every high-weight topic is above 85% accuracy. Keep taking mocks.'));

  // study time chart
  const tb = $('#prTime'); tb.innerHTML = '';
  const days = []; for (let d = d0 - 13; d <= d0; d++) days.push(d);
  const per = days.map(d => (S.study && S.study.day[d]) || {}), max = Math.max(1, ...per.map(k => Object.values(k).reduce((a, b) => a + b, 0)));
  const chart = el('div', 'days');
  days.forEach((d, i) => {
    const col = el('div', 'col'); const k = per[i]; const tot = Object.values(k).reduce((a, b) => a + b, 0);
    col.title = new Date(d * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ': ' + hm(tot);
    Object.entries(k).forEach(([kind, sec]) => { const s = el('div', 'seg'); s.style.height = (sec / max * 100) + '%'; s.style.background = (KIND[kind] || ['', 'var(--line)'])[1]; col.append(s) });
    const wrap = el('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.height = '100%'; wrap.append(col, el('div', 'lbl', new Date(d * 864e5).getDate()));
    col.style.flex = '1'; chart.append(wrap);
  });
  const legend = el('div', 'row small'); [['Practice', 'var(--pen)'], ['Lessons', 'var(--review)'], ['Games', 'var(--marker)'], ['Mocks', 'var(--ok)'], ['Doubts', 'var(--muted)']].forEach(([n, c]) => { const s = el('span'); const dot = el('i'); dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;background:${c}`; s.append(dot, n); legend.append(s) });
  tb.append(chart, legend);

  // subject table
  const sj = $('#prSubj'); sj.innerHTML = '<thead><tr><th>Subject</th><th>Answered</th><th>Accuracy</th><th>Time</th><th>GATE marks</th></tr></thead>';
  const tbo = el('tbody');
  SUBJECTS.forEach(s => {
    const qs = allQ().filter(q => q.subj === s.id && S.stats[q.id]), c = qs.filter(q => S.stats[q.id].c).length;
    const sec = Object.entries((S.study || {}).topic || {}).filter(([k]) => k.split('|')[1] === s.id).reduce((a, [, v]) => a + v, 0);
    const r = el('tr'); [s.name, qs.length, qs.length ? Math.round(c / qs.length * 100) + '%' : '—', sec ? hm(sec) : '—', s.w].forEach(v => r.append(el('td', null, v))); tbo.append(r);
  });
  sj.append(tbo);

  // recent mistakes
  const wr = $('#prWrong'); wr.innerHTML = '';
  const wrong = ids.filter(id => !S.stats[id].c).sort((a, b) => S.stats[b].t - S.stats[a].t).map(qById).filter(Boolean);
  if (!wrong.length) wr.append(el('p', 'empty', 'No wrong answers waiting. Nice.'));
  else {
    wrong.slice(0, 8).forEach(q => { const p = el('div', 'small'); p.style.padding = '6px 0'; p.style.borderBottom = '1px solid var(--line)'; p.textContent = (q.paper || 'Starter') + ' · ' + q.topic + ' — ' + q.q.slice(0, 90) + (q.q.length > 90 ? '…' : ''); wr.append(p) });
    const b = el('button', 'btn primary', 'Retry all ' + wrong.length + ' mistakes'); b.style.marginTop = '10px'; b.onclick = () => startSession(wrong, 'Retry my mistakes'); wr.append(b);
  }

  // what was read
  const rd = $('#prRead'); rd.innerHTML = '';
  const reads = (S.read || []).slice(-10).reverse();
  if (!reads.length) rd.append(el('p', 'empty', 'Lessons and doubts you open in the Learn tab show up here.'));
  reads.forEach(r => { const p = el('div', 'small'); p.style.padding = '6px 0'; p.style.borderBottom = '1px solid var(--line)'; p.textContent = new Date(r.t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' + ({ lesson: 'Lesson', pattern: 'How GATE asks it', revision_sheet: 'Revision sheet', doubt: 'Doubt chat' }[r.kind] || r.kind) + ' · ' + (SUBJ[r.subj] ? SUBJ[r.subj].name + ' — ' : '') + (r.topic || '') + ' · ' + hm(r.sec); rd.append(p) });

  // mocks
  const mk = $('#prMocks'); mk.innerHTML = '';
  const ms = (S.mocks || []).slice(-6).reverse();
  if (!ms.length) mk.append(el('p', 'empty', 'No mocks yet. Sit one full paper every weekend.'));
  ms.forEach(m => { const p = el('div', 'bar'); const pct = Math.max(0, Math.round(m.score / m.max * 100)); const tr = el('div', 'track'), f = el('div', 'fill'); f.style.width = pct + '%'; tr.append(f); p.append(el('span', 'nm', m.label), el('span', 'wt', new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), tr, el('span', 'pct', r2(m.score) + '/' + m.max)); mk.append(p) });

  // games
  const gm = $('#prGames'); gm.innerHTML = '';
  const byG = {}; (S.games || []).forEach(g => { const x = byG[g.game] = byG[g.game] || { plays: 0, best: 0, last: null }; x.plays++; x.best = Math.max(x.best, g.total ? g.correct / g.total : 0); x.last = g });
  const list = window.GATE_GAMES || [];
  if (!list.length) gm.append(el('p', 'empty', 'Games are not loaded in this copy.'));
  list.forEach(g => { const x = byG[g.id]; const p = el('div', 'bar'); const tr = el('div', 'track'), f = el('div', 'fill'); f.style.width = (x ? Math.round(x.best * 100) : 0) + '%'; tr.append(f); p.append(el('span', 'nm', g.title), el('span', 'wt', x ? x.plays + ' plays' : 'not played'), tr, el('span', 'pct', x ? Math.round(x.best * 100) + '%' : '—')); gm.append(p) });
};
function openLesson(subj, topic) {
  showTab('learn'); L.subj = subj;
  const s = SUBJ[subj], words = topic.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  let best = s.topics[0], bs = -1; s.topics.forEach(t => { const sc = words.filter(w => t.toLowerCase().includes(w)).length; if (sc > bs) { bs = sc; best = t } });
  L.topic = best; renderLearn(); $('#lOut').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- Games tab ---------- */
let cleanup = null;
window.renderGames = function () {
  const list = $('#gameList'); list.innerHTML = ''; $('#gameStage').hidden = true; list.hidden = false;
  const games = window.GATE_GAMES || [];
  if (!games.length) { list.append(el('p', 'empty', 'Games are not loaded in this copy.')); return }
  games.forEach(g => {
    const c = el('button', 'panel gcard'); c.type = 'button';
    const plays = (S.games || []).filter(x => x.game === g.id);
    c.append(el('p', 'eyebrow', SUBJ[g.subj] ? SUBJ[g.subj].name : g.subj), el('h2', null, g.title), el('p', 'small muted', g.blurb), el('span', 'small', plays.length ? `Played ${plays.length}× · best ${Math.round(Math.max(...plays.map(p => p.total ? p.correct / p.total : 0)) * 100)}%` : 'Not played yet'));
    c.onclick = () => openGame(g.id); list.append(c);
  });
};
function openGame(id) {
  const g = (window.GATE_GAMES || []).find(x => x.id === id); if (!g) return;
  if (cleanup) { try { cleanup() } catch (e) {} cleanup = null }
  $('#gameList').hidden = true; $('#gameStage').hidden = false;
  $('#gameMeta').textContent = g.title + ' · ' + (SUBJ[g.subj] ? SUBJ[g.subj].name : '') + ' · ' + (g.topics || []).join(', ');
  const root = $('#gameRoot'); root.innerHTML = '';
  setContext({ kind: 'game', subj: g.subj, topic: (g.topics || [])[0], meta: { game: g.id } });
  const api = {
    lang: () => S.lang,
    done(res) {
      const rec = { t: Date.now(), game: g.id, level: res.level || 1, correct: res.correct | 0, total: res.total | 0, seconds: res.seconds | 0 };
      (S.games = S.games || []).push(rec); save(); Cloud.game(rec);
      const d = today(); S.days[d] = (S.days[d] || 0) + 1; save();
      toast(`Saved: ${rec.correct}/${rec.total} in ${g.title}`);
    }
  };
  try { const r = g.mount(root, api); if (typeof r === 'function') cleanup = r } catch (e) { root.append(el('p', 'small', 'This game failed to start: ' + e.message)) }
  $('#gameStage').scrollIntoView({ behavior: 'smooth' });
}
$('#gameBack').onclick = () => { if (cleanup) { try { cleanup() } catch (e) {} cleanup = null } window.renderGames() };

init();
const active = document.querySelector('nav.tabs button[aria-selected="true"]');
if (active && (active.dataset.tab === 'progress' || active.dataset.tab === 'games')) showTab(active.dataset.tab);
})();
