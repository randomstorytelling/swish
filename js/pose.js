// pose.js — MediaPipe Pose Landmarker wrapper (runs fully on-device)
// Pinned to 0.10.35: a version-mismatched WASM dir is the #1 silent slowdown.
import { FilesetResolver, PoseLandmarker, DrawingUtils }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODELS = {
  lite:  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  full:  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
  heavy: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
};

// 33-landmark indices we care about
export const LM = {
  NOSE:0,
  L_EYE:2, R_EYE:5,
  L_SHO:11, R_SHO:12,
  L_ELB:13, R_ELB:14,
  L_WRI:15, R_WRI:16,
  L_PINKY:17, R_PINKY:18,
  L_INDEX:19, R_INDEX:20,
  L_THUMB:21, R_THUMB:22,
  L_HIP:23, R_HIP:24,
  L_KNE:25, R_KNE:26,
  L_ANK:27, R_ANK:28,
  L_HEEL:29, R_HEEL:30,
  L_FOOT:31, R_FOOT:32,
};

let landmarker = null;
let curMode = null;
let curModel = null;
let lastTs = 0;                              // shared monotonic clock for the single instance
function safeTs(ms) { const t = ms > lastTs ? ms : lastTs + 1; lastTs = t; return t; }
export function resetClock() { lastTs = 0; }

export async function initPose({ model = "full", runningMode = "VIDEO" } = {}) {
  if (landmarker && curMode === runningMode && curModel === model) return landmarker;
  if (landmarker) { try { landmarker.close(); } catch {} landmarker = null; }

  const vision = await FilesetResolver.forVisionTasks(WASM);
  const make = (delegate) => PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODELS[model] ?? MODELS.full, delegate },
    runningMode,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });

  try {
    landmarker = await make("GPU");
  } catch (e) {
    console.warn("[pose] GPU delegate failed, falling back to CPU", e);
    landmarker = await make("CPU");
  }
  curMode = runningMode;
  curModel = model;
  return landmarker;
}

// Tear the landmarker down (iOS discards the GPU context on backgrounding;
// the next initPose rebuilds fresh from the CDN-cached model).
export function dispose() {
  if (landmarker) { try { landmarker.close(); } catch {} }
  landmarker = null; curMode = null; curModel = null; lastTs = 0;
}

// Live camera frame
export function detectVideo(video, tsMs) {
  if (!landmarker) return null;
  try { return landmarker.detectForVideo(video, safeTs(Math.round(tsMs))); }
  catch (e) { console.warn("[pose] live detect failed", e); return null; }
}

// Run pose over an entire recorded video, frame by frame.
// Returns [{ t, lm:[{x,y,z,visibility}], world:[{x,y,z}] }, ...]
// onProgress(0..1) for the UI bar.
export async function analyzeClip(video, { fps = 30, onProgress } = {}) {
  await initPose({ runningMode: "VIDEO", model: curModel || "full" });
  resetClock();                               // fresh ~33ms deltas for this clip, untainted by the live loop
  const frames = [];
  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Clip has no duration");

  const step = 1 / fps;

  // Seek + wait. Short-circuits same-value seeks (a fresh <video> at 0 fires no
  // 'seeked' for seekTo(0) → would deadlock) and races a timeout so a missing
  // 'seeked' on iOS drops one frame instead of hanging the whole analysis.
  const seekTo = (t) => new Promise((res) => {
    const target = Math.min(t, duration - 0.001);
    if (Math.abs(video.currentTime - target) < 1e-3) { res(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); video.removeEventListener("seeked", onSeek); res(); };
    const onSeek = () => finish();
    const timer = setTimeout(finish, 400);
    video.addEventListener("seeked", onSeek);
    video.currentTime = target;
  });

  video.pause();
  for (let t = 0; t <= duration; t += step) {
    await seekTo(t);
    const tsMs = safeTs(Math.round(video.currentTime * 1000));

    let result = null;
    try { result = landmarker.detectForVideo(video, tsMs); } catch (e) { /* skip frame */ }

    const lm = result?.landmarks?.[0] || null;
    const world = result?.worldLandmarks?.[0] || null;
    frames.push({
      t: video.currentTime,
      lm: lm ? lm.map(p => ({ x: p.x, y: p.y, z: p.z, v: p.visibility })) : null,
      world: world ? world.map(p => ({ x: p.x, y: p.y, z: p.z })) : null,
    });
    if (onProgress) onProgress(Math.min(1, t / duration));
  }
  if (onProgress) onProgress(1);
  return frames;
}

// thin re-export so app.js can draw without re-importing the CDN module
export function makeDrawer(ctx) {
  return new DrawingUtils(ctx);
}
export { PoseLandmarker };
