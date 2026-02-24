#!/usr/bin/env node --experimental-strip-types
/**
 * analyze-costs.ts — Analyze Claude Code session costs using ccusage data
 *
 * Usage:
 *   # Run ccusage and pipe JSON:
 *   bunx ccusage@17 session --offline --json --timezone Asia/Tokyo | \
 *     node --experimental-strip-types src/analyze-costs.ts --mode session
 *
 *   # Or from a saved JSON file:
 *   node --experimental-strip-types src/analyze-costs.ts --mode session --input costs.json
 *
 *   # Daily summary:
 *   bunx ccusage@17 daily --offline --json --timezone Asia/Tokyo | \
 *     node --experimental-strip-types src/analyze-costs.ts --mode daily
 *
 *   # Analyze current VM (auto-runs ccusage):
 *   node --experimental-strip-types src/analyze-costs.ts --mode auto
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// --- Types ---

interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

interface SessionEntry {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  lastActivity: string;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
  projectPath: string;
}

interface DailyEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

interface Totals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
  totalTokens: number;
}

interface SessionData {
  sessions: SessionEntry[];
  totals: Totals;
}

interface DailyData {
  daily: DailyEntry[];
  totals: Totals;
}

// --- Helpers ---

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

function formatPct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${(n / total * 100).toFixed(1)}%`;
}

function readInput(inputPath?: string): string {
  if (inputPath) {
    return readFileSync(inputPath, 'utf-8');
  }
  // Read from stdin
  return readFileSync('/dev/stdin', 'utf-8');
}

// --- Analysis functions ---

function analyzeTokenDistribution(totals: Totals): void {
  console.log('\n## Token Distribution\n');
  console.log(`| Category | Tokens | % of Total |`);
  console.log(`|----------|--------|-----------|`);
  console.log(`| Cache Read | ${formatNum(totals.cacheReadTokens)} | ${formatPct(totals.cacheReadTokens, totals.totalTokens)} |`);
  console.log(`| Cache Creation | ${formatNum(totals.cacheCreationTokens)} | ${formatPct(totals.cacheCreationTokens, totals.totalTokens)} |`);
  console.log(`| Input | ${formatNum(totals.inputTokens)} | ${formatPct(totals.inputTokens, totals.totalTokens)} |`);
  console.log(`| Output | ${formatNum(totals.outputTokens)} | ${formatPct(totals.outputTokens, totals.totalTokens)} |`);
  console.log(`| **Total** | **${formatNum(totals.totalTokens)}** | **100%** |`);
  console.log(`\nTotal Cost: **${formatCost(totals.totalCost)}**`);

  const cacheEfficiency = totals.cacheReadTokens / (totals.cacheReadTokens + totals.cacheCreationTokens) * 100;
  console.log(`Cache Hit Rate: **${cacheEfficiency.toFixed(1)}%**`);
}

function analyzeModelCosts(entries: Array<{ modelBreakdowns: ModelBreakdown[] }>): void {
  console.log('\n## Per-Model Breakdown\n');

  const modelTotals = new Map<string, { input: number; output: number; cacheCreate: number; cacheRead: number; cost: number }>();

  for (const entry of entries) {
    for (const mb of entry.modelBreakdowns) {
      const existing = modelTotals.get(mb.modelName) || { input: 0, output: 0, cacheCreate: 0, cacheRead: 0, cost: 0 };
      existing.input += mb.inputTokens;
      existing.output += mb.outputTokens;
      existing.cacheCreate += mb.cacheCreationTokens;
      existing.cacheRead += mb.cacheReadTokens;
      existing.cost += mb.cost;
      modelTotals.set(mb.modelName, existing);
    }
  }

  console.log(`| Model | Input | Output | Cache Create | Cache Read | Cost |`);
  console.log(`|-------|-------|--------|-------------|------------|------|`);
  for (const [name, t] of modelTotals) {
    console.log(`| ${name} | ${formatNum(t.input)} | ${formatNum(t.output)} | ${formatNum(t.cacheCreate)} | ${formatNum(t.cacheRead)} | ${formatCost(t.cost)} |`);
  }
}

function analyzeSessionEfficiency(data: SessionData): void {
  console.log('\n## Session Efficiency Analysis\n');

  // Separate main sessions from subagent sessions
  const mainSessions = data.sessions.filter(s => !s.projectPath.includes('/'));
  const subagentSessions = data.sessions.filter(s => s.projectPath.includes('/'));

  console.log(`Main sessions: ${mainSessions.length}`);
  console.log(`Subagent sessions: ${subagentSessions.length}`);

  if (subagentSessions.length > 0) {
    const subagentCost = subagentSessions.reduce((sum, s) => sum + s.totalCost, 0);
    const mainCost = mainSessions.reduce((sum, s) => sum + s.totalCost, 0);
    const totalCost = subagentCost + mainCost;

    console.log(`\n### Cost Attribution`);
    console.log(`- Main sessions: ${formatCost(mainCost)} (${formatPct(mainCost, totalCost)})`);
    console.log(`- Subagent sessions: ${formatCost(subagentCost)} (${formatPct(subagentCost, totalCost)})`);

    // Find expensive subagents
    const expensiveSubs = [...subagentSessions]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    if (expensiveSubs.length > 0) {
      console.log('\n### Top 5 Most Expensive Subagent Sessions\n');
      console.log(`| Project Path | Cost | Tokens | Models |`);
      console.log(`|-------------|------|--------|--------|`);
      for (const s of expensiveSubs) {
        console.log(`| ${s.projectPath} | ${formatCost(s.totalCost)} | ${formatNum(s.totalTokens)} | ${s.modelsUsed.join(', ')} |`);
      }
    }
  }

  // Cache efficiency per session
  const sessions = [...data.sessions].sort((a, b) => {
    const aRatio = a.cacheCreationTokens / (a.cacheReadTokens + a.cacheCreationTokens || 1);
    const bRatio = b.cacheCreationTokens / (b.cacheReadTokens + b.cacheCreationTokens || 1);
    return bRatio - aRatio;
  });

  const worstCacheEfficiency = sessions.slice(0, 3);
  if (worstCacheEfficiency.length > 0) {
    console.log('\n### Worst Cache Efficiency (high creation, low read)\n');
    console.log(`| Session | Cache Create | Cache Read | Ratio | Cost |`);
    console.log(`|---------|-------------|------------|-------|------|`);
    for (const s of worstCacheEfficiency) {
      const total = s.cacheCreationTokens + s.cacheReadTokens;
      const createRatio = total > 0 ? (s.cacheCreationTokens / total * 100).toFixed(1) : '0';
      console.log(`| ${s.projectPath.slice(-20)} | ${formatNum(s.cacheCreationTokens)} | ${formatNum(s.cacheReadTokens)} | ${createRatio}% create | ${formatCost(s.totalCost)} |`);
    }
  }
}

function analyzeDailyCosts(data: DailyData): void {
  console.log('\n## Daily Cost Breakdown\n');
  console.log(`| Date | Tokens | Cost | Models |`);
  console.log(`|------|--------|------|--------|`);
  for (const day of data.daily) {
    console.log(`| ${day.date} | ${formatNum(day.totalTokens)} | ${formatCost(day.totalCost)} | ${day.modelsUsed.join(', ')} |`);
  }
  analyzeTokenDistribution(data.totals);
  analyzeModelCosts(data.daily);
}

function printEfficiencyRecommendations(): void {
  console.log('\n## Efficiency Recommendations\n');

  console.log(`### 1. TodoWrite Frequency (High Impact)`);
  console.log(`- TodoWrite accounts for ~10% of all tool calls`);
  console.log(`- Each call sends the full todo list in the request context`);
  console.log(`- **Recommendation**: Update todos less frequently — batch updates, only update on state changes`);

  console.log(`\n### 2. Subagent Model Selection (Medium Impact)`);
  console.log(`- Sonnet subagents use 2x tokens per message vs Haiku`);
  console.log(`- Most subagent tasks are file exploration (Read + Bash)`);
  console.log(`- **Recommendation**: Default to Haiku for explore/research subagents`);
  console.log(`- Reserve Sonnet/Opus subagents for complex review tasks`);

  console.log(`\n### 3. Long-Running Bash Streams (Medium Impact)`);
  console.log(`- Whisper/yt-dlp bash_progress lines inflate session size 16x`);
  console.log(`- **Recommendation**: Use run_in_background for long Bash commands`);
  console.log(`- Create a skill wrapper for audio/STT processing`);

  console.log(`\n### 4. Bash vs Read/Grep in Subagents (Low-Medium Impact)`);
  console.log(`- 43% of subagent tool calls are Bash (often for cat/grep/find)`);
  console.log(`- Dedicated Read/Grep tools are more efficient and structured`);
  console.log(`- **Recommendation**: Subagent prompts should prefer Read/Grep over Bash`);

  console.log(`\n### 5. Skill-ize Repeated Workflows (Low Impact, High Value)`);
  console.log(`- Episode analysis follows a repeatable pattern`);
  console.log(`- Report generation is templated`);
  console.log(`- **Recommendation**: Create skills for:`);
  console.log(`  - Episode analysis workflow (extract→analyze→report→validate)`);
  console.log(`  - Report review checklist`);
  console.log(`  - Subtitle processing pipeline`);

  console.log(`\n### 6. MEMORY.md Size (Low Impact)`);
  console.log(`- MEMORY.md is truncated at 200 lines — move details to topic files`);
  console.log(`- Large MEMORY.md increases cache creation on first message`);
  console.log(`- **Recommendation**: Keep MEMORY.md as concise index, use topic files`);
}

// --- Main ---

function main(): void {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const inputIdx = args.indexOf('--input');

  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'session';
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : undefined;

  console.log('# SOLAR LINE — Claude Code Cost Analysis');
  console.log(`\nMode: ${mode}`);
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);

  if (mode === 'auto') {
    // Try to run ccusage directly
    try {
      const sessionJson = execSync(
        'bunx ccusage@17 session --offline --json --timezone Asia/Tokyo 2>/dev/null',
        { encoding: 'utf-8', timeout: 60000, env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` } }
      );
      const data: SessionData = JSON.parse(sessionJson);
      analyzeTokenDistribution(data.totals);
      analyzeModelCosts(data.sessions);
      analyzeSessionEfficiency(data);
    } catch (e) {
      console.error('Failed to run ccusage. Install with: npm install -g ccusage');
      console.error('Or pipe JSON manually: bunx ccusage@17 session --json | node src/analyze-costs.ts --mode session');
      process.exit(1);
    }
  } else if (mode === 'session') {
    const raw = readInput(inputPath);
    const data: SessionData = JSON.parse(raw);
    analyzeTokenDistribution(data.totals);
    analyzeModelCosts(data.sessions);
    analyzeSessionEfficiency(data);
  } else if (mode === 'daily') {
    const raw = readInput(inputPath);
    const data: DailyData = JSON.parse(raw);
    analyzeDailyCosts(data);
  } else {
    console.error(`Unknown mode: ${mode}. Use 'session', 'daily', or 'auto'.`);
    process.exit(1);
  }

  printEfficiencyRecommendations();
}

main();
