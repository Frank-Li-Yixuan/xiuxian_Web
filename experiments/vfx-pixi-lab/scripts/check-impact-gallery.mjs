import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const types = read("src/types.ts");
const scenarios = read("src/scenarios.ts");
const html = read("index.html");
const main = read("src/main.ts");

const requiredFeedbackTypes = [
  "light_hit",
  "thunder_hit",
  "fire_dot_hit",
  "armor_break_hit",
  "kill_pop",
  "enemy_bullet_blocked",
  "enemy_bullet_clear",
  "player_bullet_impact",
  "boss_bullet_impact",
  "graze_flash"
];

if (!types.includes('"impact_gallery"') || !scenarios.includes('id: "impact_gallery"')) {
  throw new Error("Impact gallery scenario is missing.");
}

if (!html.includes('id="feedback-select"')) {
  throw new Error("Impact gallery needs a feedback type selector.");
}

if (!main.includes('feedbackControl: requireElement("feedback-control")') || !main.includes('feedbackSelect: requireElement("feedback-select"')) {
  throw new Error("Impact gallery feedback selector must be wired through queryUi.");
}

for (const feedbackType of requiredFeedbackTypes) {
  if (!types.includes(`"${feedbackType}"`) || !main.includes(`"${feedbackType}"`)) {
    throw new Error(`Missing impact feedback type: ${feedbackType}`);
  }
}

for (const helper of [
  "requireFeedback",
  "drawImpactReferenceBullets",
  "drawImpactTarget",
  "drawPlayerShotTrail",
  "drawShieldAnchor",
  "drawHitSparks",
  "drawSlashMark",
  "drawCracks",
  "drawIncomingBullet"
]) {
  if (!main.includes(`function ${helper}`)) {
    throw new Error(`Missing impact gallery helper implementation: ${helper}`);
  }
}

if (!main.includes('case "impact_gallery":') || !main.includes("this.drawImpactGallery(t);")) {
  throw new Error("Impact gallery scenario must render through drawImpactGallery.");
}

const filterCase = main.match(/case "impact_gallery":[\s\S]*?return \{[^\n]+\};/);
if (!filterCase || filterCase[0].includes("rgbSplit") || filterCase[0].includes("glitch")) {
  throw new Error("Impact gallery must avoid persistent RGBSplit/Glitch so hit readability stays clean.");
}

console.log("Impact gallery guard passed.");
