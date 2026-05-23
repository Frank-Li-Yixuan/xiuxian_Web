#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = ["src/sim"];
const forbidden = [
  "Math.random",
  "Date.now",
  "performance.now",
  "document.",
  "window.",
  "requestAnimationFrame",
  "setTimeout",
  "setInterval",
  "localStorage",
  "new Audio",
  "CanvasRenderingContext2D"
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

let failures = [];
for (const t of targets) {
  const abs = join(root, t);
  try {
    for (const file of walk(abs)) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        const idx = text.indexOf(token);
        if (idx !== -1) {
          const line = text.slice(0, idx).split("\n").length;
          failures.push(`${file}:${line} contains forbidden token: ${token}`);
        }
      }
    }
  } catch {
    // directory may not exist in early scaffold tasks
  }
}

if (failures.length) {
  console.error("Forbidden gameplay patterns found:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("No forbidden gameplay patterns found.");
