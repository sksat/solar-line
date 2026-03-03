/**
 * Agent-readable review of animation screenshots (Task 586).
 *
 * Reads metadata from dist/screenshots/3d/metadata.json and prints a structured
 * summary that agents can use to verify animation correctness.
 *
 * Run: npm run review-screenshots
 * Prerequisite: npx playwright test e2e/animation-screenshots.spec.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

interface ScreenshotMeta {
  file: string;
  scene: string;
  timePoint: number;
  totalDays: number;
  dayValue: number;
  description: string;
  timestamp: string;
}

const SCREENSHOT_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "dist",
  "screenshots",
  "3d",
);

const META_PATH = path.join(SCREENSHOT_DIR, "metadata.json");

if (!fs.existsSync(META_PATH)) {
  console.error(
    "No screenshot metadata found at",
    META_PATH,
  );
  console.error(
    "Run: npx playwright test e2e/animation-screenshots.spec.ts",
  );
  process.exit(1);
}

const metadata: ScreenshotMeta[] = JSON.parse(
  fs.readFileSync(META_PATH, "utf-8"),
);

// Group by scene
const byScene = new Map<string, ScreenshotMeta[]>();
for (const m of metadata) {
  const arr = byScene.get(m.scene) ?? [];
  arr.push(m);
  byScene.set(m.scene, arr);
}

console.log("═══════════════════════════════════════════════════════");
console.log("  3D Animation Screenshot Review");
console.log("═══════════════════════════════════════════════════════");
console.log(`  Generated: ${metadata[0]?.timestamp ?? "unknown"}`);
console.log(`  Total screenshots: ${metadata.length}`);
console.log(`  Directory: ${SCREENSHOT_DIR}`);
console.log("");

let issues = 0;

for (const [scene, shots] of byScene) {
  console.log(`── Scene: ${scene} ──`);
  console.log(`  Total days: ${shots[0]?.totalDays ?? "?"}`);
  console.log(`  Screenshots: ${shots.length}`);
  console.log("");

  for (const shot of shots) {
    const filePath = path.join(SCREENSHOT_DIR, shot.file);
    const exists = fs.existsSync(filePath);
    const sizeKB = exists
      ? Math.round(fs.statSync(filePath).size / 1024)
      : 0;

    const pct = Math.round(shot.timePoint * 100);
    const status = exists && sizeKB > 1 ? "✓" : "⚠";
    if (!exists || sizeKB <= 1) issues++;

    console.log(
      `  ${status} ${pct}% (day ${shot.dayValue.toFixed(1)}) → ${shot.file} (${sizeKB} KB)`,
    );
    if (shot.description) {
      console.log(`    ${shot.description}`);
    }
  }
  console.log("");
}

// Verification checklist
console.log("── Verification Checklist ──");
console.log(
  "  To review screenshots, use the Read tool on each PNG file.",
);
console.log("  Key checks for each scene:");
console.log("  □ Start (0%): planets at initial positions, ship at first departure");
console.log("  □ Mid-transfer: ship visible on curved arc between planets");
console.log("  □ Between transfers: ship in parking orbit around destination");
console.log("  □ End (100%): ship at final destination (Earth for full-route)");
console.log("  □ Planet textures: realistic textures visible (Earth blue, Mars red, Jupiter banded)");
console.log("  □ No crashes: ship does NOT appear to go through planets");
console.log("");

if (issues > 0) {
  console.log(`⚠ ${issues} issue(s) found (missing or empty screenshots)`);
  process.exit(1);
} else {
  console.log("✓ All screenshots captured successfully");
}
