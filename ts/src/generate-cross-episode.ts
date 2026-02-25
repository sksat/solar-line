/**
 * Generate cross-episode consistency analysis report JSON.
 *
 * Usage: node --experimental-strip-types src/generate-cross-episode.ts [--out-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateCrossEpisodeReport } from "./cross-episode-analysis.ts";

const args = process.argv.slice(2);
let outDir = path.resolve("..", "reports", "data", "summary");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out-dir" && args[i + 1]) {
    outDir = path.resolve(args[++i]);
  }
}

fs.mkdirSync(outDir, { recursive: true });

// Check if MDX file exists (MDX is the preferred format)
const mdPath = path.join(outDir, "cross-episode.md");
if (fs.existsSync(mdPath)) {
  console.log(`Skipped: ${mdPath} already exists (MDX format — edit .md directly)`);
  process.exit(0);
}

const report = generateCrossEpisodeReport();
const outPath = path.join(outDir, "cross-episode.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Generated: ${outPath}`);
