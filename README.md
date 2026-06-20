# 🏀 Swish — AI Shooting Coach

Film your jumper. Get an elite shooting coach in your pocket. Everything runs **on your phone** — your video never leaves the device.

Swish watches your **body** (not just the ball) with on-device pose estimation, diagnoses *why* you miss (flat release, elbow flare, no leg load, drifting), gives you one specific fix at a time, and walks you up a real 7-stage drill curriculum.

---

## What it does (v1 — built & verified)

- **Record or upload a shot** → frame-by-frame breakdown with a skeleton overlay you can scrub.
- **9 research-backed mechanics**, each scored against elite ranges with a specific fix:
  Leg load · Elbow set (the "L") · Elbow under the ball · Set-point height · Release angle / arc · Follow-through · Balance · Stance width · Straight-up-and-down.
- **Coach voice** that follows real feedback science: external cues ("shoot up, not out"), **one fix at a time**, praise a strength first.
- **Drills** — the full Stage 1→7 curriculum (14 drills, beginner→game-speed), each with what the camera should watch.
- **Progress** — form-score trend, history, and the headline **Consistency** ("shot signature") metric nobody else owns.
- **PWA** — installs to your home screen, works offline after first load. Optional bring-your-own free Gemini key for conversational coaching.

## The tech

- **Pose:** MediaPipe Pose Landmarker (Tasks Vision `0.10.35`), 33 landmarks + 3D world coords, GPU delegate with CPU fallback. Joint angles use the 3D world landmarks so they hold up when you're slightly off-axis.
- **All on-device.** No server, no upload, $0 per shot.
- **Stack-matched** to your other apps: vanilla ES-module PWA → GitHub Pages + (optional) Firebase, optional Cloudflare AI proxy.

---

## Run it locally

```bash
cd Swish
python3 -m http.server 8000
# open http://localhost:8000  (camera needs https OR localhost)
```

The service worker is **disabled on localhost** so your edits aren't served stale. It turns on automatically in production.

## Deploy (GitHub Pages — same as your other apps)

1. Push the `Swish/` folder to a repo (or a `/swish` path on an existing Pages repo).
2. Enable Pages. Camera APIs need HTTPS — GitHub Pages is HTTPS, so you're set.
3. On your iPhone: open the URL in Safari → Share → **Add to Home Screen**.

### Filming tips (this is the difference between working and not)
- Prop the phone **side-on** to your shooting arm (best for arc, release, knee load). Front-on is best for elbow flare & balance — switch it in Settings.
- Get your **whole body** in frame, good light, ~1 shot per clip (auto-stops at 12s).

---

## Roadmap (next layers)

These are scoped and ready to build next — left out of v1 deliberately so the verified core could ship:

1. **Make / miss + shot arc** — tap the rim once to calibrate, then COCO-SSD ball tracking + a parabola fit gives makes/misses, entry angle, and apex over the rim. (The research flagged ball tracking as the genuinely hard part on a phone — worth doing carefully, not rushing.)
2. **Closed-loop curriculum** — auto-promote/demote your stage from your own form-score + consistency data, with weekly re-test gates.
3. **Live coaching mode** — real-time skeleton + spoken cues while you shoot (record-then-review is the v1 foundation).
4. **Hosted AI proxy** — clone your `gata-ai-proxy` pattern (origin allowlist + token) so conversational coaching is zero-setup, not BYO-key.

## File map

```
index.html              app shell (tabs, video + canvas, settings sheet)
css/app.css             dark "court" UI
js/pose.js              MediaPipe wrapper (model load, clip + live detection)
js/analyze.js           the form engine — phases, 9 metrics, scoring, cues
js/drills.js            7-stage / 14-drill curriculum
js/store.js             local-first persistence + stats (numbers only, never video)
js/ai.js                coach voice (local) + optional BYO-Gemini + speech
js/app.js               orchestrator: camera, record, review, progress, drills
manifest.webmanifest    PWA install
sw.js                   offline app-shell cache (production only)
```

> ⚠️ The camera + pose pipeline can only be truly tested on a real phone (the
> headless preview has no camera). UI, navigation, the analysis engine, drills,
> and progress are all verified. Test a real shot on your iPhone and we'll tune
> the metric thresholds from what you see.
