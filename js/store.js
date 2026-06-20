// store.js — local-first persistence (source of truth). Numbers only, never video.
const K_SESSIONS = "swish.sessions.v1";
const K_SETTINGS = "swish.settings.v1";

const DEFAULT_SETTINGS = {
  hand: "auto",
  angle: "auto",
  voice: true,
  liveSkel: true,
  model: "full",
  coach: "shot_doctor",   // which coaching voice (see coaches.js PERSONAS)
  geminiKey: "",          // optional BYO key (browser-direct, never sent to a server)
};

const subs = new Set();
function notify() { for (const fn of subs) { try { fn(); } catch {} } }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ---- settings ---- */
export function getSettings() { return { ...DEFAULT_SETTINGS, ...read(K_SETTINGS, {}) }; }
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(K_SETTINGS, next);
  notify();
  return next;
}

/* ---- sessions ---- */
export function getSessions() { return read(K_SESSIONS, []); }

function summarize(report) {
  return {
    overall: report.overall,
    grade: report.grade,
    hand: report.hand,
    view: report.view,
    metrics: report.metrics.map(m => ({ key: m.key, label: m.label, value: m.value, unit: m.unit, score: m.score, status: m.status })),
    topFix: report.topFixes[0]?.label || null,
  };
}

let idSeq = 0;
function newId() {
  let stamp; try { stamp = Date.now().toString(36); } catch { stamp = (idSeq).toString(36); }
  return `s_${stamp}_${(idSeq++).toString(36)}`;
}

export function saveSession(report, extra = {}) {
  const sessions = getSessions();
  const rec = { id: newId(), ts: nowStamp(), ...summarize(report), note: extra.note || "", drill: extra.drill || null };
  sessions.push(rec);
  write(K_SESSIONS, sessions);
  notify();
  return rec;
}

// Update an existing record in place (used when a shot is re-analyzed with a
// corrected hand/angle) so the trend isn't polluted with duplicates.
export function updateSession(id, report, extra = {}) {
  const sessions = getSessions();
  const i = sessions.findIndex(s => s.id === id);
  if (i < 0) return null;
  sessions[i] = { ...sessions[i], ...summarize(report), ...(extra.drill !== undefined ? { drill: extra.drill } : {}) };
  write(K_SESSIONS, sessions);
  notify();
  return sessions[i];
}

export function clearSessions() { write(K_SESSIONS, []); notify(); }

/* trend + headline stats */
export function stats() {
  const s = getSessions();
  if (!s.length) return { count: 0, best: 0, avg: 0, last: 0, trend: [], streak: 0 };
  const scores = s.map(x => x.overall);
  const best = Math.max(...scores);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  // consistency = how repeatable (lower std = better) — the headline "shot signature"
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const std = Math.round(Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length));
  return { count: s.length, best, avg, last: scores[scores.length - 1], std, trend: scores.slice(-20) };
}

// timestamp without Date.now sensitivity issues — uses Date at call time (UI only)
function nowStamp() {
  try { return new Date().toISOString(); } catch { return "" + performance.now(); }
}
