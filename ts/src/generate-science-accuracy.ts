/**
 * Generate science accuracy analysis report JSON.
 *
 * Usage: node --experimental-strip-types src/generate-science-accuracy.ts [--out-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateScienceAccuracyReport } from "./science-accuracy-analysis.ts";

const args = process.argv.slice(2);
let outDir = path.resolve("..", "reports", "data", "summary");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out-dir" && args[i + 1]) {
    outDir = path.resolve(args[++i]);
  }
}

fs.mkdirSync(outDir, { recursive: true });

const report = generateScienceAccuracyReport();
const outPath = path.join(outDir, "science-accuracy.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Generated: ${outPath}`);
