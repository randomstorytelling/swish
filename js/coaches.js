// coaches.js — the "coaching brain": the world's best shooting coaches, codified.
// Researched & synthesized from Engelland, Hanlen, Geschwindner, Dave Love,
// Lethal Shooter, Castellaw, Wissel (BEEF), Hoover (ProShot), Nordland (Swish),
// Noah (45/11/0) and Bob McKillop. Used to voice cues and pick a coach persona.

export const PERSONAS = [
  {
    id: "shot_doctor", name: "The Shot Doctor", coach: "Chip Engelland",
    basedOn: "Chip Engelland (+ Dave Love's diagnostic rigor)",
    blurb: "Quiet, precise. One small change at a time.",
    style: "Quiet, precise, deferential. Lowers the stakes, never a full teardown, reads your follow-through like an X-ray, asks before changing anything.",
    lines: [
      "Mind if I make one suggestion? Catch it at your lowest point and only go up.",
      "Hold that follow-through — that's the evidence trail. Let's read it.",
      "You'll make it or miss it. Not a big deal. Let's just simplify.",
    ],
  },
  {
    id: "skills_trainer", name: "The Skills Trainer", coach: "Drew Hanlen",
    basedOn: "Drew Hanlen (Pure Sweat)",
    blurb: "Demanding, transfer-obsessed. Game shots, game speed.",
    style: "Demanding, detail-obsessed, transfer-focused. Names every rep after a game action. Coaches the how AND the why. No mindless reps.",
    lines: [
      "Game shots from game spots at game speed — that's the only scoreboard.",
      "Wrist wrinkled under the ball, up and over — 78% of your misses are short.",
      "Don't circle it. Catch, lift, shoot. We chase game results, not gym results.",
    ],
  },
  {
    id: "hype", name: "The Hype", coach: "Chris Matthews",
    basedOn: "Chris Matthews (Lethal Shooter)",
    blurb: "High-energy, belief-driven. Mechanics as identity.",
    style: "High-energy, identity-driven, almost preacher-like. Lives on volume and belief. Feels what you feel and wants you to win that badly.",
    lines: [
      "Stay locked in on your greatness — that next one's already going down.",
      "You didn't fail, you understood it. Now you understand it. Run it back.",
      "Footwork, release, balance, reps. We rep it til it's automatic. Let's eat.",
    ],
  },
  {
    id: "the_professor", name: "The Professor", coach: "Holger Geschwindner",
    basedOn: "Holger Geschwindner (+ Collin Castellaw's data calm)",
    blurb: "Cerebral, rhythm & physics. The shot is a throw.",
    style: "Cerebral, rhythm-and-physics oriented, gently unconventional. Treats the shot as a throw and a dance. Calm, curious, evidence-driven, never dogmatic.",
    lines: [
      "You're not shooting — you're throwing. Elbow on the goal, and throw it up.",
      "Good shooters miss long and short, never left or right. Your line is the math; your arc is the music.",
      "The destination's always the same — about 45° dropping in. The path is yours.",
    ],
  },
  {
    id: "fundamentalist", name: "The Fundamentalist", coach: "Hal Wissel",
    basedOn: "Hal Wissel / Bob McKillop",
    blurb: "Classic checklist + earned confidence.",
    style: "Classic, checklist-driven, accountability-first. Coaches BEEF and a clean routine. Patient through misses; confidence is the residue of reps.",
    lines: [
      "Balance, Eyes, Elbow, Follow-through. Down and up, hold it till it drops.",
      "You've got license to shoot any shot you want — but you'll work for it.",
      "Confidence isn't something I hand you. It's the residue of the reps. Get me 500.",
    ],
  },
];

// Attributed external cues mapped to Swish's measured mechanics.
export const METRIC_CUES = {
  kneeLoad: [
    { coach: "Tom Nordland", cue: "UpForce — push the floor away with your legs. More leg = quicker and more stable." },
    { coach: "Hal Wissel", cue: "Down and up — start with the knees flexed, then extend legs and arm as one motion." },
    { coach: "Drew Hanlen", cue: "Off the catch, keep the knee bend minimal to quicken your release." },
  ],
  elbowSet: [
    { coach: "Holger Geschwindner", cue: "Put the elbow on the goal — it's your aiming device, not a hinge to overthink." },
    { coach: "Chip Engelland", cue: "Lock the elbow and snap the wrist in a straight line — that's what makes shots straight." },
    { coach: "Hal Wissel", cue: "Keep the shooting elbow in; hold the ball between ear and shoulder." },
  ],
  elbowFlare: [
    { coach: "Holger Geschwindner", cue: "Elbow in, you just throw it UP. Elbow out, you have to throw it up AND in." },
    { coach: "Dave Love", cue: "Get the middle of your hand under the middle of the ball — that autocorrects the elbow." },
    { coach: "Hal Wissel", cue: "Elbow in — the second E in BEEF — to line up straight at the basket." },
  ],
  setHeight: [
    { coach: "Dave Love", cue: "Set point out in front, not behind your head — over the head leaves the elbow nowhere to go." },
    { coach: "Klay Thompson", cue: "Ball above the forehead, arms extended — same set point every single time." },
    { coach: "Dell Curry", cue: "Bring the release above your head and let it go on the way up, not at the apex." },
  ],
  releaseArc: [
    { coach: "Noah (45/11/0)", cue: "45 / 11 / 0 — get it dropping down on the rim, 11 inches deep, dead center." },
    { coach: "Drew Hanlen", cue: "Up and over — 78% of misses are short, so shoot it over the front rim, never flat." },
    { coach: "Collin Castellaw", cue: "Reign your arc in toward ~45° — too much arc adds three inches of depth error." },
  ],
  followThru: [
    { coach: "Chip Engelland", cue: "The follow-through is the evidence trail of your shot — leave some evidence." },
    { coach: "Hal Wissel", cue: "Index finger straight at the target; hold it until the ball reaches the basket." },
    { coach: "Drew Hanlen", cue: "Finish with your pointer finger at the rim, elbow at eyebrow level." },
  ],
  balance: [
    { coach: "Dave Love", cue: "Balance isn't a posture — it's control of energy. Find stability faster than the game knocks you off it." },
    { coach: "Drew Hanlen", cue: "Core engaged, hips frozen — shoulders stay square even when your feet aren't." },
    { coach: "Chip Engelland", cue: "Everything follows balance. Get level and square before you rise." },
  ],
  base: [
    { coach: "Chip Engelland", cue: "Equal feet for a 50/50 push — a stagger can cost you your balance." },
    { coach: "Hal Wissel", cue: "Feet shoulder-width, toes straight, shooting-side foot slightly forward." },
    { coach: "Klay Thompson", cue: "Wide base on takeoff so no bump pushes you off the straight line." },
  ],
  drift: [
    { coach: "Dave Love", cue: "Land where you left. Lean off-line and the body fights itself." },
    { coach: "Stephen Curry", cue: "Hardly jump — go straight up a few inches so you land balanced and your legs stay fresh." },
    { coach: "Drew Hanlen", cue: "Shoulders over knees on the landing so you're upright, never leaning back." },
  ],
  guideHand: [
    { coach: "Dave Love", cue: "Fix the shooting hand first — guide-hand push is a symptom, not the cause." },
    { coach: "Collin Castellaw", cue: "The guide hand supports the ball until it's ready — then it gets out of the way." },
    { coach: "Chip Engelland", cue: "Take the balance-hand thumb off for a few reps to expose the second-hand push." },
  ],
  rhythm: [
    { coach: "Drew Hanlen", cue: "Catch, lift, shoot — don't circle. One continuous motion, feet to follow-through." },
    { coach: "Paul Hoover", cue: "The dip is the back-swing of basketball — it produces your rhythm off the pass." },
    { coach: "Holger Geschwindner", cue: "Find the beat — shooting is rhythmic. Every move prepares the next." },
  ],
};

// What the greats AGREE on — the non-negotiables.
export const PRINCIPLES = [
  "One clean line to the rim — elbow and wrist under and behind the ball so the push goes straight.",
  "Most misses are SHORT — get the ball up and over, dropping down into the rim.",
  "Power comes from the legs in one synced 'down and up', not from the arm.",
  "The whole shot is one fluid, repeatable motion — the simpler the shot, the more consistent it is.",
  "The guide hand only supports the ball, then leaves clean — it never steers the flight.",
  "Hold the follow-through and read it — finish tall, index finger at the target.",
  "Eyes lock on one target early and stay still — don't watch the ball.",
  "Confidence is manufactured by reps and earned freedom — it matters as much as mechanics.",
];

// Where elite coaches genuinely DISAGREE — so Swish never dogmatically picks one.
export const DEBATES = [
  "One-motion vs two-motion: release on the way up (Curry/Klay) vs a clearer load-then-lift (classic). Swish reads your natural pattern instead of forcing one.",
  "How much dip: essential for rhythm/power (Engelland, Hoover) vs minimized for a quicker release (Hanlen).",
  "Set-point height: out in front for control (Love, Engelland's Kawhi fix) vs above the head for speed (Dell Curry raised Steph's).",
  "Arc number: ~45° entry (Noah/Castellaw) vs ~60° at release (Geschwindner) — coach the entry/feel, never a release-degree.",
];

export const COACHES = [
  { coach: "Chip Engelland", tag: "Spurs/Thunder 'shot doctor' — rebuilt Kawhi & Tony Parker" },
  { coach: "Drew Hanlen", tag: "Pure Sweat — Tatum, Embiid, Beal, Banchero" },
  { coach: "Holger Geschwindner", tag: "Dirk Nowitzki's lifelong coach" },
  { coach: "Dave Love", tag: "Research-driven NBA shooting specialist" },
  { coach: "Chris Matthews", tag: "'Lethal Shooter' — Jaylen Brown, AD, Candace Parker" },
  { coach: "Collin Castellaw", tag: "Shot Mechanics — Custom Shot Design" },
  { coach: "Hal Wissel", tag: "B.E.E.F. — Balance, Eyes, Elbow, Follow-through" },
  { coach: "Paul Hoover", tag: "Pro Shot System — the Turn & the Dip" },
  { coach: "Tom Nordland", tag: "Swish method — UpForce & soft touch" },
  { coach: "Noah Basketball", tag: "45/11/0 — 600M+ tracked shots" },
  { coach: "Bob McKillop", tag: "Curry's Davidson coach — license + accountability" },
];

export function getPersona(id) { return PERSONAS.find(p => p.id === id) || PERSONAS[0]; }

// Best attributed cue for a metric, preferring the selected persona's coach.
export function coachCue(metricKey, personaId) {
  const list = METRIC_CUES[metricKey] || [];
  if (!list.length) return null;
  const p = getPersona(personaId);
  return list.find(c => p.coach && c.coach.includes(p.coach)) || list[0];
}
