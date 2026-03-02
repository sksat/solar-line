import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  updateStatsTable,
  updateBodyText,
  formatNumber,
  type ProjectStats,
} from "./stats-refresh.ts";

describe("stats-refresh", () => {
  const sampleStats: ProjectStats = {
    tsTests: 2500,
    rustTests: 400,
    e2eTests: 250,
    pythonChecks: 423,
    completedTasks: 375,
    commits: 520,
  };

  describe("formatNumber", () => {
    it("formats numbers under 1000 without comma", () => {
      assert.equal(formatNumber(398), "398");
    });

    it("formats numbers >= 1000 with comma", () => {
      assert.equal(formatNumber(2462), "2,462");
    });

    it("formats numbers >= 10000 with comma", () => {
      assert.equal(formatNumber(12345), "12,345");
    });
  });

  describe("updateStatsTable", () => {
    const input = [
      "| 指標 | 値 |",
      "|------|------|",
      "| 完了タスク | 371 |",
      "| 分析済み軌道遷移 | 24 / 24（全話完了） |",
      "| テスト数 | 3,103（TS 2,462 + Rust 398 + E2E 243、0 failures） |",
      "| コミット数 | 512+ |",
    ].join("\n");

    it("updates task count in stats table", () => {
      const result = updateStatsTable(input, sampleStats);
      assert.ok(result.includes("| 完了タスク | 375 |"));
    });

    it("updates test counts in stats table", () => {
      const total = sampleStats.tsTests + sampleStats.rustTests + sampleStats.e2eTests;
      const result = updateStatsTable(input, sampleStats);
      assert.ok(
        result.includes(`| テスト数 | ${formatNumber(total)}（TS ${formatNumber(sampleStats.tsTests)} + Rust ${sampleStats.rustTests} + E2E ${sampleStats.e2eTests}、0 failures） |`),
        `Expected updated test row, got: ${result}`,
      );
    });

    it("updates commit count in stats table", () => {
      const result = updateStatsTable(input, sampleStats);
      assert.ok(result.includes("| コミット数 | 520+ |"));
    });

    it("preserves non-stats rows unchanged", () => {
      const result = updateStatsTable(input, sampleStats);
      assert.ok(result.includes("| 分析済み軌道遷移 | 24 / 24（全話完了） |"));
    });
  });

  describe("updateBodyText", () => {
    it("updates total test count in body paragraph", () => {
      const input = "TDD（テスト駆動開発）を原則とし、3,055のテストで品質を保証しています。";
      const total = sampleStats.tsTests + sampleStats.rustTests + sampleStats.e2eTests;
      const result = updateBodyText(input, sampleStats);
      assert.ok(
        result.includes(`${formatNumber(total)}のテストで`),
        `Expected ${formatNumber(total)}, got: ${result}`,
      );
    });

    it("updates Rust test count in bulleted list", () => {
      const input = "- **Rust ユニットテスト** (398件): description here";
      const result = updateBodyText(input, sampleStats);
      assert.ok(result.includes(`**Rust ユニットテスト** (${sampleStats.rustTests}件)`));
    });

    it("updates Rust unit test count in body sentence", () => {
      const input = "414のユニットテストで正確性を保証しています。";
      const result = updateBodyText(input, sampleStats);
      assert.ok(
        result.includes(`${sampleStats.rustTests}のユニットテストで`),
        `Expected ${sampleStats.rustTests}, got: ${result}`,
      );
    });

    it("updates TS test count in body", () => {
      const input = "- **TypeScript ユニットテスト** (2,414件): description here";
      const result = updateBodyText(input, sampleStats);
      assert.ok(
        result.includes(`**TypeScript ユニットテスト** (${formatNumber(sampleStats.tsTests)}件)`),
      );
    });

    it("updates E2E test count in body", () => {
      const input = "- **Playwright E2E テスト** (243件): description here";
      const result = updateBodyText(input, sampleStats);
      assert.ok(result.includes(`**Playwright E2E テスト** (${sampleStats.e2eTests}件)`));
    });

    it("updates Python cross-validation count in body", () => {
      const input = "- **Python クロスバリデーション** (400件): description here";
      const result = updateBodyText(input, sampleStats);
      assert.ok(result.includes(`**Python クロスバリデーション** (${sampleStats.pythonChecks}件)`));
    });

    it("updates completed tasks count in body", () => {
      const input = "370の完了タスクファイル（`current_tasks/`）で";
      const result = updateBodyText(input, sampleStats);
      assert.ok(result.includes("375の完了タスクファイル"));
    });

    it("preserves surrounding text", () => {
      const input = "Some text before\n- **Rust ユニットテスト** (398件): long description\nSome text after";
      const result = updateBodyText(input, sampleStats);
      assert.ok(result.includes("Some text before"));
      assert.ok(result.includes("Some text after"));
      assert.ok(result.includes("long description"));
    });
  });
});
