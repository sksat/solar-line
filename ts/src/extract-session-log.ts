/**
 * CLI to extract a Claude Code session log and write it as markdown.
 *
 * Usage:
 *   node --experimental-strip-types src/extract-session-log.ts <session.jsonl> [--slug <slug>] [--title <title>] [--out-dir <dir>]
 *
 * Arguments:
 *   <session.jsonl>   Path to a Claude Code JSONL session file
 *   --slug <slug>     URL-safe slug for the filename (default: auto from first user message)
 *   --title <title>   Session title in Japanese (default: auto from first user message)
 *   --out-dir <dir>   Output directory (default: ../reports/logs)
 *   --repo-url <url>  GitHub repo URL for commit links (e.g., https://github.com/owner/repo)
 *   --dry-run         Print markdown to stdout instead of writing file
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseSession,
  renderSessionMarkdown,
  generateFilename,
} from "./session-log.ts";

function printUsage(): void {
  console.error(
    "Usage: node --experimental-strip-types src/extract-session-log.ts <session.jsonl> [--slug <slug>] [--title <title>] [--out-dir <dir>] [--dry-run]",
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(args.includes("--help") ? 0 : 1);
  }

  // Parse arguments
  let inputPath = "";
  let slug = "";
  let title = "";
  let outDir = path.resolve("..", "reports", "logs");
  let repoUrl = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) {
      slug = args[++i];
    } else if (args[i] === "--title" && args[i + 1]) {
      title = args[++i];
    } else if (args[i] === "--out-dir" && args[i + 1]) {
      outDir = path.resolve(args[++i]);
    } else if (args[i] === "--repo-url" && args[i + 1]) {
      repoUrl = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (!args[i].startsWith("--") && !inputPath) {
      inputPath = path.resolve(args[i]);
    }
  }

  if (!inputPath) {
    console.error("Error: JSONL file path is required.");
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Read and parse
  const content = fs.readFileSync(inputPath, "utf-8");
  const session = parseSession(content);

  if (session.messages.length === 0) {
    console.error("Error: No conversation messages found in the session file.");
    process.exit(1);
  }

  // Auto-generate title from first user message if not provided
  if (!title) {
    const firstUser = session.messages.find((m) => m.role === "user");
    const userText = firstUser?.text ?? "Session Log";
    // Use first line, truncated
    title = userText.split("\n")[0].slice(0, 100);
  }

  // Auto-generate slug from title if not provided
  if (!slug) {
    slug = title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .slice(0, 50);
  }

  const filename = generateFilename(session.metadata.startTime, slug);
  const renderOptions = repoUrl ? { repoUrl } : undefined;
  const markdown = renderSessionMarkdown(session, title, renderOptions);

  if (dryRun) {
    console.log(markdown);
    console.error(`\nWould write to: ${path.join(outDir, filename)}`);
    return;
  }

  // Write output
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, filename);

  if (fs.existsSync(outputPath)) {
    console.error(`Warning: File already exists, overwriting: ${outputPath}`);
  }

  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`Wrote session log: ${outputPath}`);
  const commitInfo = session.metadata.commitHashes.length > 0
    ? `, Commits: ${session.metadata.commitHashes.join(", ")}`
    : "";
  console.log(
    `  Messages: ${session.metadata.messageCount}, Tool calls: ${session.metadata.toolCallCount}${commitInfo}`,
  );
}

// CLI entry point
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename ?? "")) {
  main();
}
