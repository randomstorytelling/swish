// ai.js — the coach voice. Local-first (zero setup), with optional BYO Gemini.
// Feedback science: external/outcome cues, ONE highest-leverage cue at a time,
// silent when in-band, summarize at the end — never beep at every rep.
import { getSettings } from "./store.js";
import { getPersona, coachCue, PRINCIPLES } from "./coaches.js";

/* The single most important thing to say right now (bandwidth feedback). */
export function primaryCue(report) {
  if (!report?.ok) return null;
  return report.topFixes[0]?.cue || "Clean rep — keep reloading exactly that.";
}

/* A short spoken line: score, then ONE fix in the chosen coach's words. */
export function coachLine(report) {
  if (!report?.ok) return report?.reason || "";
  const fix = report.topFixes[0];
  if (!fix) return `${report.overall}. ${report.grade}. That stroke is money — keep it identical.`;
  const ec = coachCue(fix.key, getSettings().coach);
  return `${report.overall} out of 100. ${ec ? ec.cue : fix.cue}`;
}

/* Optional: enrich with a conversational LLM line using a BYO Gemini key
   (browser-direct, free tier, never hits a server). Falls back to local. */
export async function enhanceCoach(report) {
  const { geminiKey, coach } = getSettings();
  if (!geminiKey || !report?.ok) return report.summary;

  const persona = getPersona(coach);
  const payload = {
    overall: report.overall,
    grade: report.grade,
    fixes: report.topFixes.map(f => ({ what: f.label, value: f.value + f.unit, cue: f.cue })),
    strengths: report.metrics.filter(m => m.status === "good").map(m => m.label),
  };
  const prompt =
`You are ${persona.coach}, an elite basketball shooting coach. Coaching voice: ${persona.style}
Non-negotiables you believe: ${PRINCIPLES.slice(0, 4).join(" ")}
Given this shot-analysis JSON, write 2 short sentences IN ${persona.coach}'s voice.
Rules: praise one real strength, then give ONE external/outcome cue (talk about the rim and the ball flight, never anatomy jargon or degrees). Encouraging, specific, no lists, no emojis.
JSON: ${JSON.stringify(payload)}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (!res.ok) return report.summary;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || report.summary;
  } catch { return report.summary; }
}

/* Voice via Web Speech (no network). */
let voiceReady = false;
export function speak(text) {
  if (!getSettings().voice) return;
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.speak(u);
    voiceReady = true;
  } catch {}
}
