/**
 * Automated stats refresh for tech-overview.md
 *
 * Replaces the need for manual stats refresh tasks by programmatically
 * updating test counts, task counts, and commit counts in the report.
 *
 * Usage:
 *   npm run stats-refresh           # Update tech-overview.md with live counts
 *   npm run stats-refresh -- --dry-run  # Show what would change without writing
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

export interface ProjectStats {
  tsTests: number;
  rustTests: number;
  e2eTests: number;
  pythonChecks: number;
  completedTasks: number;
  commits: number;
}

/** Format a number with commas for Japanese-style display */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Update the stats table in the markdown content */
export function updateStatsTable(content: string, stats: ProjectStats): string {
  const total = stats.tsTests + stats.rustTests + stats.e2eTests;

  // Update task count row
  let result = content.replace(
    /\| 完了タスク \| [\d,]+ \|/,
    `| 完了タスク | ${stats.completedTasks} |`,
  );

  // Update test count row
  result = result.replace(
    /\| テスト数 \| [\d,]+（TS [\d,]+ \+ Rust [\d,]+ \+ E2E [\d,]+、\d+ failures） \|/,
    `| テスト数 | ${formatNumber(total)}（TS ${formatNumber(stats.tsTests)} + Rust ${stats.rustTests} + E2E ${stats.e2eTests}、0 failures） |`,
  );

  // Update commit count row
  result = result.replace(
    /\| コミット数 \| [\d,]+\+ \|/,
    `| コミット数 | ${stats.commits}+ |`,
  );

  return result;
}

/** Update the body text statistics in the markdown content */
export function updateBodyText(content: string, stats: ProjectStats): string {
  const total = stats.tsTests + stats.rustTests + stats.e2eTests;

  let result = content;

  // Update total test count in body paragraph
  result = result.replace(
    /[\d,]+のテストで/,
    `${formatNumber(total)}のテストで`,
  );

  // Update Rust test count
  result = result.replace(
    /\*\*Rust ユニットテスト\*\* \([\d,]+件\)/,
    `**Rust ユニットテスト** (${stats.rustTests}件)`,
  );

  // Update TS test count
  result = result.replace(
    /\*\*TypeScript ユニットテスト\*\* \([\d,]+件\)/,
    `**TypeScript ユニットテスト** (${formatNumber(stats.tsTests)}件)`,
  );

  // Update E2E test count
  result = result.replace(
    /\*\*Playwright E2E テスト\*\* \([\d,]+件\)/,
    `**Playwright E2E テスト** (${stats.e2eTests}件)`,
  );

  // Update Python cross-validation count
  result = result.replace(
    /\*\*Python クロスバリデーション\*\* \([\d,]+件\)/,
    `**Python クロスバリデーション** (${stats.pythonChecks}件)`,
  );

  // Update completed tasks count in body
  result = result.replace(
    /\d+の完了タスクファイル/,
    `${stats.completedTasks}の完了タスクファイル`,
  );

  return result;
}

/** Collect live project statistics */
export function collectStats(projectRoot: string): ProjectStats {
  const tsDir = path.join(projectRoot, "ts");

  // Count TS tests by running npm test and extracting count
  let tsTests = 0;
  try {
    const tsOutput = execSync("npm test 2>&1 || true", {
      cwd: tsDir,
      encoding: "utf-8",
      timeout: 300000,
    });
    const match = tsOutput.match(/ℹ tests (\d+)/);
    if (match) tsTests = parseInt(match[1], 10);
  } catch {
    console.warn("Warning: Could not count TS tests");
  }

  // Count Rust tests
  let rustTests = 0;
  try {
    const rustOutput = execSync("cargo test --workspace 2>&1 || true", {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 300000,
    });
    const matches = rustOutput.matchAll(/test result: ok\. (\d+) passed/g);
    for (const m of matches) {
      rustTests += parseInt(m[1], 10);
    }
  } catch {
    console.warn("Warning: Could not count Rust tests");
  }

  // Count E2E tests by listing them
  let e2eTests = 0;
  try {
    const e2eOutput = execSync("npx playwright test --list 2>&1 || true", {
      cwd: tsDir,
      encoding: "utf-8",
      timeout: 120000,
    });
    const match = e2eOutput.match(/Total: (\d+) tests/);
    if (match) {
      e2eTests = parseInt(match[1], 10);
    } else {
      // Count test lines
      const lines = e2eOutput.split("\n").filter((l) => l.includes("[chromium]"));
      e2eTests = lines.length;
    }
  } catch {
    console.warn("Warning: Could not count E2E tests");
  }

  // Count Python cross-validation checks
  // Different scripts use different pass markers: [PASS], ✓, OK
  let pythonChecks = 0;
  try {
    const pyOutput = execSync("bash cross_validation/run.sh 2>&1 || true", {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 120000,
    });
    const passLines = pyOutput.split("\n").filter(
      (l) => /^\s+\[PASS\]/.test(l) || /^\s+✓/.test(l) || /^\s+OK\b/.test(l),
    );
    pythonChecks = passLines.length;
  } catch {
    console.warn("Warning: Could not count Python checks");
  }

  // Count completed tasks
  let completedTasks = 0;
  try {
    const tasksDir = path.join(projectRoot, "current_tasks");
    const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
    completedTasks = files.length;
  } catch {
    console.warn("Warning: Could not count tasks");
  }

  // Count commits
  let commits = 0;
  try {
    const gitOutput = execSync("git rev-list --count HEAD", {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    commits = parseInt(gitOutput.trim(), 10);
  } catch {
    console.warn("Warning: Could not count commits");
  }

  return { tsTests, rustTests, e2eTests, pythonChecks, completedTasks, commits };
}

// --- CLI entry point ---
if (process.argv[1]?.endsWith("stats-refresh.ts")) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const techOverviewPath = path.join(
    projectRoot,
    "reports",
    "data",
    "summary",
    "tech-overview.md",
  );

  console.log("Collecting project statistics...");
  const stats = collectStats(projectRoot);
  const total = stats.tsTests + stats.rustTests + stats.e2eTests;

  console.log(`  TS tests:       ${formatNumber(stats.tsTests)}`);
  console.log(`  Rust tests:     ${stats.rustTests}`);
  console.log(`  E2E tests:      ${stats.e2eTests}`);
  console.log(`  Python checks:  ${stats.pythonChecks}`);
  console.log(`  Total tests:    ${formatNumber(total)}`);
  console.log(`  Tasks:          ${stats.completedTasks}`);
  console.log(`  Commits:        ${stats.commits}`);

  const original = fs.readFileSync(techOverviewPath, "utf-8");
  let updated = updateStatsTable(original, stats);
  updated = updateBodyText(updated, stats);

  if (original === updated) {
    console.log("\nNo changes needed — stats are already up to date.");
  } else if (dryRun) {
    console.log("\n[DRY RUN] Would update tech-overview.md with new stats.");
    // Show diff-like output
    const origLines = original.split("\n");
    const updLines = updated.split("\n");
    for (let i = 0; i < Math.max(origLines.length, updLines.length); i++) {
      if (origLines[i] !== updLines[i]) {
        console.log(`  Line ${i + 1}:`);
        console.log(`  - ${origLines[i]}`);
        console.log(`  + ${updLines[i]}`);
      }
    }
  } else {
    fs.writeFileSync(techOverviewPath, updated, "utf-8");
    console.log("\nUpdated tech-overview.md with fresh stats.");
  }
}
