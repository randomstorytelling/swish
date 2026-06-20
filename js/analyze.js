// analyze.js — the shooting-form engine.
// Input: frames from pose.analyzeClip(). Output: a structured coaching report.
// Joint (interior) angles use 3D worldLandmarks for off-axis robustness;
// view-dependent geometry (arc, flare, balance, drift) uses 2D image landmarks.
import { LM } from "./pose.js";

const VIS = 0.5; // landmark visibility threshold before we trust a point

/* ---------------- landmark accessors ---------------- */
function ipt(frame, i) {                    // image-space (normalized), gated by visibility
  const p = frame?.lm?.[i];
  if (!p) return null;
  if (p.v != null && p.v < VIS) return null;
  return p;
}
function wpt(frame, i) {                     // 3D world-space (meters), gated by image visibility
  const w = frame?.world?.[i];
  const v = frame?.lm?.[i]?.v;
  if (!w) return null;
  if (v != null && v < VIS) return null;
  return w;
}

/* ---------------- geometry ---------------- */
function angle3(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = [a.x - b.x, a.y - b.y, a.z - b.z];
  const cb = [c.x - b.x, c.y - b.y, c.z - b.z];
  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2];
  const m1 = Math.hypot(...ab), m2 = Math.hypot(...cb);
  if (!m1 || !m2) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
}
function angle2(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = [a.x - b.x, a.y - b.y], cb = [c.x - b.x, c.y - b.y];
  const dot = ab[0] * cb[0] + ab[1] * cb[1];
  const m1 = Math.hypot(...ab), m2 = Math.hypot(...cb);
  if (!m1 || !m2) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
}
// interior joint angle: prefer 3D world, fall back to 2D image
function jointAngle(f, a, b, c) {
  const w = angle3(wpt(f, a), wpt(f, b), wpt(f, c));
  if (w != null) return w;
  return angle2(ipt(f, a), ipt(f, b), ipt(f, c));
}
// elevation of vector b->a above horizontal (image space; + = up the screen)
function elevation(b, a) {
  if (!a || !b) return null;
  return Math.atan2(b.y - a.y, Math.abs(a.x - b.x)) * 180 / Math.PI;
}
function dist(a, b) { return (a && b) ? Math.hypot(a.x - b.x, a.y - b.y) : null; }
function mid(a, b) { return (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : (a || b || null); }
function smooth(arr, k = 2) {
  const out = arr.slice();
  for (let i = 0; i < arr.length; i++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++)
      if (arr[j] != null) { s += arr[j]; n++; }
    out[i] = n ? s / n : null;
  }
  return out;
}

/* ---------------- handedness ---------------- */
function detectHand(frames, setting) {
  if (setting === "right" || setting === "left") return setting;
  // Integrate over time: count frames where each wrist is the higher one, so a
  // single noisy off-hand frame can't flip the read. Low margin → peak height.
  let rCount = 0, lCount = 0, lMin = 1, rMin = 1;
  for (const f of frames) {
    const lw = ipt(f, LM.L_WRI), rw = ipt(f, LM.R_WRI);
    if (lw) lMin = Math.min(lMin, lw.y);
    if (rw) rMin = Math.min(rMin, rw.y);
    if (lw && rw) { if (rw.y < lw.y) rCount++; else lCount++; }   // smaller y = higher
  }
  if (Math.abs(rCount - lCount) >= 3) return rCount > lCount ? "right" : "left";
  return rMin <= lMin ? "right" : "left";
}

/* ---------------- camera-angle auto-detect (3D shoulder line) ---------------- */
// front-on: shoulders spread horizontally (world x); side-on: spread in depth (world z).
function detectView(frames) {
  let sx = 0, sz = 0, n = 0;
  for (const f of frames) {
    const L = f.world?.[LM.L_SHO], R = f.world?.[LM.R_SHO];
    const lv = f.lm?.[LM.L_SHO]?.v, rv = f.lm?.[LM.R_SHO]?.v;
    if (L && R && (lv == null || lv >= VIS) && (rv == null || rv >= VIS)) {
      sx += Math.abs(R.x - L.x); sz += Math.abs(R.z - L.z); n++;
    }
  }
  if (n < 3) return null;
  const ax = sx / n, az = sz / n;
  const ratio = ax / (Math.hypot(ax, az) || 1e-6);   // ~1 = front, ~0 = side
  if (ratio > 0.72) return "front";
  if (ratio < 0.40) return "side";
  return "45";
}

/* ================= THE RUBRIC =================
   Research-backed bands. tol = units beyond a band edge that map to score 0.
   views = reliability weight by camera angle (honest confidence). */
const RUBRIC = {
  kneeLoad: {
    label: "Leg load", unit: "°", phase: "dip", ideal: [105, 124], tol: 30, weight: 1.1,
    views: { side: 1, "45": .8, front: .5 },
    cueGood: "Strong leg load — your power's coming from the floor up.",
    cueBelow: "You're sinking into a deep squat. A quick quarter-squat is all you need — keep your release point high.",
    cueAbove: "Your legs stay stiff, so the shot's all arm. Sit into it — bend to a quarter-squat so your legs supply the power.",
  },
  elbowSet: {
    label: "Elbow set (the 'L')", unit: "°", phase: "set point", ideal: [82, 102], tol: 30, weight: 1.0,
    views: { side: 1, "45": .85, front: .9 },
    cueGood: "Clean backwards-L at your set point — loaded and ready to spring.",
    cueBelow: "Your elbow collapses past 90° — that slows the release. Set the ball to a crisp L, cocked and ready.",
    cueAbove: "Your set point's too open, so there's no spring. Load to an L before you shoot up.",
  },
  elbowFlare: {
    label: "Elbow under the ball", unit: "%", phase: "set point", ideal: [0, 11], tol: 18, weight: 1.15,
    views: { side: .35, "45": .7, front: 1 },
    cueGood: "Elbow tucked right under the ball — that's a straight line to the rim.",
    cueBelow: "Elbow's tucked in tight under the ball — exactly right.",
    cueAbove: "Your elbow's flaring out (chicken-wing), pushing the ball across your face for left/right misses. Tuck it under the ball, toward the rim.",
  },
  setHeight: {
    label: "Set-point height", unit: "t", phase: "set point", ideal: [-0.02, 0.7], tol: 0.45, weight: 0.85,
    goodAbove: true,   // higher than the band is GOOD, not a flaw
    views: { side: 1, "45": .8, front: .55 },
    cueGood: "Set point's up at your forehead — quick and hard to block.",
    cueBelow: "You're setting the ball too low, which forces a slow two-motion heave. Bring it up to your forehead so the only thing left is the snap.",
    cueAbove: "Set point's nice and high.",
  },
  releaseArc: {
    label: "Release angle / arc", unit: "°", phase: "release", ideal: [46, 56], tol: 16, weight: 1.2,
    views: { side: 1, "45": .7, front: .3 },
    cueGood: "Beautiful arc — that high, soft trajectory is what shooters live on.",
    cueBelow: "Your shot's flat, so the make-window is tiny and it rattles out. Shoot up, not out — over a seven-foot defender into a 45° arc.",
    cueAbove: "A touch over-arced. Trade a little loft for a cleaner, more direct release.",
  },
  followThru: {
    label: "Follow-through", unit: "°", phase: "follow-through", ideal: [156, 178], tol: 36, weight: 1.0,
    views: { side: 1, "45": .85, front: .8 },
    cueGood: "Full extension and a held gooseneck — finish like that every time.",
    cueBelow: "You're short-arming it. Reach into the cookie jar, snap the wrist, and hang the gooseneck till the ball lands.",
    cueAbove: "Full, clean extension — great.",
  },
  balance: {
    label: "Balance (shoulders level)", unit: "°", phase: "release", ideal: [0, 6], tol: 14, weight: 0.95,
    views: { side: .6, "45": .85, front: 1 },
    cueGood: "Square and level through the shot — your base is solid.",
    cueBelow: "Nicely square.",
    cueAbove: "You're tilting through the shot, which leaks the ball left/right. Keep your shoulders square and level to the rim.",
  },
  base: {
    label: "Stance width", unit: "×", phase: "dip", ideal: [0.9, 1.4], tol: 0.6, weight: 0.7,
    views: { side: .5, "45": .8, front: 1 },
    cueGood: "Balanced base — about shoulder width, stacked and ready to rise.",
    cueBelow: "Feet are too close together — shaky base. Widen to about shoulder width, hips stacked over your feet.",
    cueAbove: "Base is too wide, which kills your lift. Bring your feet to about shoulder width.",
  },
  drift: {
    label: "Straight up & down", unit: "sw", phase: "landing", ideal: [0, 0.35], tol: 0.6, weight: 0.85,
    views: { side: 1, "45": .8, front: .8 },
    cueGood: "You go straight up and land where you started — pure balance.",
    cueBelow: "Right on your spot.",
    cueAbove: "You're drifting/fading on the shot. Jump straight up and land where you took off — consistency starts with your base.",
  },
};

function bandScore(v, [lo, hi], tol) {
  if (v == null) return null;
  if (v >= lo && v <= hi) return 100;
  const d = v < lo ? lo - v : v - hi;
  return Math.max(0, Math.round(100 * (1 - d / tol)));
}
const statusOf = (s) => s >= 80 ? "good" : s >= 55 ? "warn" : "bad";

/* ---------------- phase detection ---------------- */
function detectPhases(frames, hand) {
  const S = hand === "right"
    ? { SHO: LM.R_SHO, ELB: LM.R_ELB, WRI: LM.R_WRI, HIP: LM.R_HIP, KNE: LM.R_KNE, ANK: LM.R_ANK, IDX: LM.R_INDEX, EYE: LM.R_EYE }
    : { SHO: LM.L_SHO, ELB: LM.L_ELB, WRI: LM.L_WRI, HIP: LM.L_HIP, KNE: LM.L_KNE, ANK: LM.L_ANK, IDX: LM.L_INDEX, EYE: LM.L_EYE };

  const wristY = smooth(frames.map(f => { const w = ipt(f, S.WRI); return w ? w.y : null; }));
  const elbowAng = frames.map(f => jointAngle(f, S.SHO, S.ELB, S.WRI));
  const kneeAng = frames.map(f => jointAngle(f, S.HIP, S.KNE, S.ANK));

  // release ≈ highest wrist (min screen y)
  let releaseIdx = 0, minY = Infinity;
  wristY.forEach((y, i) => { if (y != null && y < minY) { minY = y; releaseIdx = i; } });

  // dip ≈ most-bent knee before release (fallback: lowest wrist before release)
  let dipIdx = 0, best = Infinity;
  for (let i = 0; i < releaseIdx; i++) { const k = kneeAng[i]; if (k != null && k < best) { best = k; dipIdx = i; } }
  if (best === Infinity) { let mY = -Infinity; for (let i = 0; i < releaseIdx; i++) if (wristY[i] != null && wristY[i] > mY) { mY = wristY[i]; dipIdx = i; } }

  // set ≈ most-flexed elbow between dip and release
  let setIdx = Math.round((dipIdx + releaseIdx) / 2), eb = Infinity;
  for (let i = dipIdx; i <= releaseIdx; i++) { const e = elbowAng[i]; if (e != null && e < eb) { eb = e; setIdx = i; } }

  // follow ≈ most-extended elbow shortly after release
  let followIdx = Math.min(frames.length - 1, releaseIdx + 3), ee = -Infinity;
  for (let i = releaseIdx; i <= Math.min(frames.length - 1, releaseIdx + 8); i++) { const e = elbowAng[i]; if (e != null && e > ee) { ee = e; followIdx = i; } }

  // plausibility: a real shot has the wrist below at the dip, then rising clearly
  // to a release after it. Non-shots collapse all phases to frame 0.
  const rose = (wristY[dipIdx] != null && wristY[releaseIdx] != null) ? (wristY[dipIdx] - wristY[releaseIdx]) : 0;
  const wristFrames = wristY.filter(y => y != null).length;
  const plausible = releaseIdx > dipIdx + 1 && rose > 0.12 && wristFrames >= 6;

  return { S, dipIdx, setIdx, releaseIdx, followIdx, plausible };
}

/* ================= main ================= */
export function analyzeShot(frames, opts = {}) {
  let view = opts.view || "side";
  if (view === "auto") view = detectView(frames) || "side";
  const valid = frames.filter(f => f.lm);
  if (valid.length < 6)
    return { ok: false, reason: "I couldn't see a full body clearly. Get your whole body in frame, well lit, and try again." };

  const hand = detectHand(frames, opts.hand || "auto");
  const ph = detectPhases(frames, hand);
  if (!ph.plausible)
    return { ok: false, reason: "I tracked your body but couldn't read a clean shooting motion. Go side-on with your whole body in frame and take one shot per clip." };
  const { S, dipIdx, setIdx, releaseIdx, followIdx } = ph;
  const F = (i) => frames[i] || {};
  const dip = F(dipIdx), set = F(setIdx), rel = F(releaseIdx), fol = F(followIdx);

  // normalizers (image space)
  const shoulderSep = dist(ipt(rel, LM.L_SHO), ipt(rel, LM.R_SHO))
    || dist(ipt(set, LM.L_SHO), ipt(set, LM.R_SHO)) || 0.2;
  const torso = (() => {
    const sm = mid(ipt(set, LM.L_SHO), ipt(set, LM.R_SHO));
    const hm = mid(ipt(set, LM.L_HIP), ipt(set, LM.R_HIP));
    return (sm && hm) ? Math.abs(sm.y - hm.y) || 0.25 : 0.25;
  })();

  const raw = {};

  // 1 knee load
  raw.kneeLoad = jointAngle(dip, S.HIP, S.KNE, S.ANK);
  // 2 elbow set
  raw.elbowSet = jointAngle(set, S.SHO, S.ELB, S.WRI);
  // 3 elbow flare (front): horizontal offset of elbow from the shoulder→wrist line, % of shoulder width
  {
    const sh = ipt(set, S.SHO), wr = ipt(set, S.WRI), el = ipt(set, S.ELB);
    if (sh && wr && el) {
      const denom = (wr.y - sh.y);
      const interpX = Math.abs(denom) > 1e-4 ? sh.x + (wr.x - sh.x) * ((el.y - sh.y) / denom) : sh.x;
      raw.elbowFlare = Math.abs(el.x - interpX) / shoulderSep * 100;
    }
  }
  // 4 set-point height (side): wrist above eye line, in torso-lengths
  {
    const eye = ipt(set, S.EYE) || ipt(set, LM.NOSE), wr = ipt(set, S.WRI);
    if (eye && wr) raw.setHeight = (eye.y - wr.y) / torso;
  }
  // 5 release arc (forearm elevation, averaged ±1 frame around release)
  {
    let s = 0, n = 0;
    for (let i = releaseIdx - 1; i <= releaseIdx + 1; i++) {
      const e = elevation(ipt(F(i), S.ELB), ipt(F(i), S.WRI));
      if (e != null) { s += e; n++; }
    }
    if (n) raw.releaseArc = s / n;
  }
  // 6 follow-through extension
  raw.followThru = jointAngle(fol, S.SHO, S.ELB, S.WRI);
  // 7 balance — shoulder tilt at release
  {
    const ls = ipt(rel, LM.L_SHO), rs = ipt(rel, LM.R_SHO);
    if (ls && rs) { let a = Math.abs(Math.atan2(rs.y - ls.y, rs.x - ls.x) * 180 / Math.PI) % 180; raw.balance = a > 90 ? 180 - a : a; }
  }
  // 8 stance width
  {
    const aw = dist(ipt(dip, LM.L_ANK), ipt(dip, LM.R_ANK));
    const sw = dist(ipt(dip, LM.L_SHO), ipt(dip, LM.R_SHO));
    if (aw && sw) raw.base = aw / sw;
  }
  // 9 drift — ankle-midpoint move from dip to LANDING, in shoulder-widths.
  // Landing is searched only within a window after release, so end-of-clip
  // walk-off (rebounding, lowering the phone) isn't mislabeled as a fade.
  {
    const aDip = mid(ipt(dip, LM.L_ANK), ipt(dip, LM.R_ANK));
    const landWin = Math.min(frames.length - 1, releaseIdx + 24);
    let aEnd = null;
    for (let i = landWin; i >= releaseIdx; i--) {
      const a = mid(ipt(F(i), LM.L_ANK), ipt(F(i), LM.R_ANK));
      if (a) { aEnd = a; break; }
    }
    if (aDip && aEnd) raw.drift = Math.abs(aEnd.x - aDip.x) / shoulderSep;
  }

  /* ---- score ---- */
  const metrics = [];
  let wSum = 0, wScore = 0;
  for (const key of Object.keys(RUBRIC)) {
    const r = RUBRIC[key];
    const v = raw[key];
    let score = v == null ? null : bandScore(v, r.ideal, r.tol);
    if (score == null) continue;
    if (r.goodAbove && v > r.ideal[1]) score = 100;   // above-band is good for this metric
    const status = statusOf(score);
    const below = v < r.ideal[0], above = v > r.ideal[1];
    const cue = status === "good" ? r.cueGood : (below ? r.cueBelow : r.cueAbove);
    const conf = r.views[view] ?? 0.6;
    metrics.push({
      key, label: r.label, unit: r.unit, phase: r.phase,
      value: Math.round(v * 100) / 100, ideal: r.ideal, score, status, cue,
      confidence: conf, lowConf: conf < 0.55,
    });
    const w = r.weight * conf;
    wSum += w; wScore += w * score;
  }
  if (metrics.length < 3)
    return { ok: false, reason: "Not enough of your shooting motion was visible to score it. Get your whole body in frame, in good light, and try again." };

  const overall = Math.round(wScore / wSum);
  const ranked = [...metrics].sort((a, b) => (a.score - b.score) || (b.confidence - a.confidence));
  const topFixes = ranked.filter(m => m.status !== "good" && !m.lowConf).slice(0, 3);
  const grade = overall >= 90 ? "Elite stroke" : overall >= 80 ? "Smooth shot"
    : overall >= 68 ? "Solid base" : overall >= 55 ? "Coming along" : "Let's build it";

  const legsSeen = metrics.some(m => m.key === "kneeLoad" || m.key === "base");
  return {
    ok: true, overall, grade, hand, view, legsSeen,
    summary: buildSummary(overall, topFixes, metrics),
    phases: { dipIdx, setIdx, releaseIdx, followIdx },
    phaseTimes: { dip: dip.t, set: set.t, release: rel.t, follow: fol.t },
    metrics, topFixes, raw, frameCount: valid.length,
  };
}

function buildSummary(overall, topFixes, metrics) {
  const strong = metrics.filter(m => m.status === "good").sort((a, b) => b.score - a.score)[0];
  let s = overall >= 80 ? "That's a clean, repeatable stroke. "
    : overall >= 68 ? "Good foundation — your base is there. "
    : "Real upside here once we tighten a couple things. ";
  if (strong) s += `Your **${strong.label.toLowerCase()}** is a strength. `;
  s += topFixes.length ? "Fastest win — " + topFixes[0].cue : "Keep reloading reps just like that.";
  return s;
}

export { RUBRIC };
