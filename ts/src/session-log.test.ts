import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  redactSensitive,
  parseJournalEntry,
  summarizeToolInput,
  processEntry,
  parseSession,
  renderSessionMarkdown,
  generateFilename,
} from "./session-log.ts";
import type { JournalEntry, ParsedSession } from "./session-log-types.ts";

// --- redactSensitive ---

describe("redactSensitive", () => {
  it("redacts API key patterns", () => {
    const result = redactSensitive('api_key: "sk-abc123456789"');
    assert.ok(result.includes("[REDACTED]"));
    assert.ok(!result.includes("sk-abc123456789"));
  });

  it("replaces home directory paths with ~", () => {
    const result = redactSensitive("/home/agent/.claude/projects");
    assert.equal(result, "~/.claude/projects");
  });

  it("leaves normal text unchanged", () => {
    const text = "Running orbital transfer analysis for Mars → Ganymede";
    assert.equal(redactSensitive(text), text);
  });

  it("redacts environment variable secrets", () => {
    const result = redactSensitive("export API_KEY=mysecret123");
    assert.ok(result.includes("[REDACTED]"));
  });
});

// --- parseJournalEntry ---

describe("parseJournalEntry", () => {
  it("returns null for empty lines", () => {
    assert.equal(parseJournalEntry(""), null);
    assert.equal(parseJournalEntry("  "), null);
  });

  it("returns null for invalid JSON", () => {
    assert.equal(parseJournalEntry("{bad json"), null);
  });

  it("returns null for file-history-snapshot entries", () => {
    const line = JSON.stringify({ type: "file-history-snapshot", uuid: "x" });
    assert.equal(parseJournalEntry(line), null);
  });

  it("returns null for queue-operation entries", () => {
    const line = JSON.stringify({ type: "queue-operation", uuid: "x" });
    assert.equal(parseJournalEntry(line), null);
  });

  it("returns null for meta messages", () => {
    const line = JSON.stringify({
      type: "user",
      uuid: "x",
      sessionId: "s",
      timestamp: "2026-01-01T00:00:00Z",
      isMeta: true,
      message: { role: "user", content: "meta message" },
    });
    assert.equal(parseJournalEntry(line), null);
  });

  it("parses user message with string content", () => {
    const entry = {
      type: "user",
      uuid: "u1",
      sessionId: "s1",
      timestamp: "2026-02-23T18:00:00Z",
      version: "2.1.50",
      message: { role: "user", content: "Hello" },
    };
    const result = parseJournalEntry(JSON.stringify(entry));
    assert.ok(result);
    assert.equal(result!.type, "user");
    assert.equal(result!.message!.role, "user");
  });

  it("parses assistant message with array content", () => {
    const entry = {
      type: "assistant",
      uuid: "a1",
      sessionId: "s1",
      timestamp: "2026-02-23T18:01:00Z",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "I will help" }],
        model: "claude-opus-4-6",
      },
    };
    const result = parseJournalEntry(JSON.stringify(entry));
    assert.ok(result);
    assert.equal(result!.type, "assistant");
  });

  it("returns null for entries without message content", () => {
    const line = JSON.stringify({
      type: "user",
      uuid: "x",
      sessionId: "s",
      timestamp: "2026-01-01T00:00:00Z",
      message: { role: "user" },
    });
    assert.equal(parseJournalEntry(line), null);
  });
});

// --- summarizeToolInput ---

describe("summarizeToolInput", () => {
  it("summarizes Read with file path", () => {
    assert.equal(
      summarizeToolInput("Read", { file_path: "/workspace/foo.ts" }),
      "/workspace/foo.ts",
    );
  });

  it("redacts home paths in Read", () => {
    assert.equal(
      summarizeToolInput("Read", { file_path: "/home/agent/bar.ts" }),
      "~/bar.ts",
    );
  });

  it("summarizes Bash with description", () => {
    assert.equal(
      summarizeToolInput("Bash", { command: "ls -la", description: "List files" }),
      "List files",
    );
  });

  it("summarizes Bash with command when no description", () => {
    assert.equal(
      summarizeToolInput("Bash", { command: "ls -la" }),
      "ls -la",
    );
  });

  it("summarizes Glob with pattern", () => {
    assert.equal(
      summarizeToolInput("Glob", { pattern: "**/*.ts" }),
      "**/*.ts",
    );
  });

  it("summarizes Grep with pattern", () => {
    assert.equal(
      summarizeToolInput("Grep", { pattern: "function\\s+" }),
      "/function\\s+/",
    );
  });

  it("summarizes Write with arrow prefix", () => {
    assert.equal(
      summarizeToolInput("Write", { file_path: "/workspace/new.ts" }),
      "→ /workspace/new.ts",
    );
  });

  it("summarizes Task with description", () => {
    assert.equal(
      summarizeToolInput("Task", { description: "Explore codebase" }),
      "Explore codebase",
    );
  });

  it("returns empty for unknown tools", () => {
    assert.equal(summarizeToolInput("UnknownTool", {}), "");
  });
});

// --- processEntry ---

describe("processEntry", () => {
  function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
    return {
      type: "user",
      uuid: "u1",
      sessionId: "s1",
      timestamp: "2026-02-23T18:00:00Z",
      message: { role: "user", content: "Hello" },
      ...overrides,
    } as JournalEntry;
  }

  it("processes simple text user message", () => {
    const result = processEntry(makeEntry({}));
    assert.ok(result);
    assert.equal(result!.role, "user");
    assert.equal(result!.text, "Hello");
    assert.deepEqual(result!.toolCalls, []);
  });

  it("filters out command messages", () => {
    const result = processEntry(makeEntry({
      message: { role: "user", content: '<command-name>/login</command-name>\n<command-message>login</command-message>' },
    }));
    assert.equal(result, null);
  });

  it("filters out local-command messages", () => {
    const result = processEntry(makeEntry({
      message: { role: "user", content: '<local-command-caveat>Test</local-command-caveat>' },
    }));
    assert.equal(result, null);
  });

  it("extracts text from array content, skipping thinking", () => {
    const result = processEntry(makeEntry({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Let me think..." },
          { type: "text", text: "Here is my response." },
        ],
      },
    }));
    assert.ok(result);
    assert.equal(result!.text, "Here is my response.");
  });

  it("extracts tool calls", () => {
    const result = processEntry(makeEntry({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/workspace/foo.ts" } },
          { type: "tool_use", id: "t2", name: "Bash", input: { command: "ls", description: "List dir" } },
        ],
      },
    }));
    assert.ok(result);
    assert.equal(result!.toolCalls.length, 2);
    assert.equal(result!.toolCalls[0].name, "Read");
    assert.equal(result!.toolCalls[0].brief, "/workspace/foo.ts");
    assert.equal(result!.toolCalls[1].name, "Bash");
    assert.equal(result!.toolCalls[1].brief, "List dir");
  });

  it("skips tool_result entries from user", () => {
    const result = processEntry(makeEntry({
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", content: "result text" }],
      },
    }));
    assert.equal(result, null);
  });

  it("strips system-reminder blocks from text content", () => {
    const result = processEntry(makeEntry({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Hello <system-reminder>hidden</system-reminder> world" },
        ],
      },
    }));
    assert.ok(result);
    assert.equal(result!.text, "Hello  world");
  });

  it("returns null for entry without message", () => {
    const result = processEntry({ type: "user", uuid: "x", sessionId: "s", timestamp: "t" } as JournalEntry);
    assert.equal(result, null);
  });
});

// --- parseSession ---

describe("parseSession", () => {
  it("parses a minimal session", () => {
    const lines = [
      JSON.stringify({
        type: "user",
        uuid: "u1",
        sessionId: "test-session",
        timestamp: "2026-02-23T18:00:00Z",
        version: "2.1.50",
        message: { role: "user", content: "Analyze episode 1" },
      }),
      JSON.stringify({
        type: "assistant",
        uuid: "a1",
        sessionId: "test-session",
        timestamp: "2026-02-23T18:01:00Z",
        version: "2.1.50",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "I will analyze episode 1." }],
          model: "claude-opus-4-6",
        },
      }),
    ];

    const result = parseSession(lines.join("\n"));
    assert.equal(result.metadata.sessionId, "test-session");
    assert.equal(result.metadata.model, "claude-opus-4-6");
    assert.equal(result.metadata.version, "2.1.50");
    assert.equal(result.metadata.messageCount, 2);
    assert.equal(result.metadata.toolCallCount, 0);
    assert.equal(result.messages.length, 2);
    assert.equal(result.messages[0].role, "user");
    assert.equal(result.messages[1].role, "assistant");
  });

  it("skips non-conversation entries", () => {
    const lines = [
      JSON.stringify({ type: "file-history-snapshot", messageId: "x", snapshot: {} }),
      JSON.stringify({ type: "queue-operation" }),
      JSON.stringify({
        type: "user",
        uuid: "u1",
        sessionId: "s",
        timestamp: "2026-02-23T18:00:00Z",
        message: { role: "user", content: "Hello" },
      }),
    ];

    const result = parseSession(lines.join("\n"));
    assert.equal(result.messages.length, 1);
  });

  it("counts tool calls across messages", () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        uuid: "a1",
        sessionId: "s",
        timestamp: "2026-02-23T18:00:00Z",
        message: {
          role: "assistant",
          content: [
            { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/foo" } },
            { type: "tool_use", id: "t2", name: "Bash", input: { command: "ls" } },
          ],
        },
      }),
      JSON.stringify({
        type: "assistant",
        uuid: "a2",
        sessionId: "s",
        timestamp: "2026-02-23T18:01:00Z",
        message: {
          role: "assistant",
          content: [
            { type: "tool_use", id: "t3", name: "Grep", input: { pattern: "foo" } },
          ],
        },
      }),
    ];

    const result = parseSession(lines.join("\n"));
    assert.equal(result.metadata.toolCallCount, 3);
  });

  it("handles empty input", () => {
    const result = parseSession("");
    assert.equal(result.messages.length, 0);
    assert.equal(result.metadata.sessionId, "unknown");
  });
});

// --- renderSessionMarkdown ---

describe("renderSessionMarkdown", () => {
  const minimalSession: ParsedSession = {
    metadata: {
      sessionId: "test-session",
      startTime: "2026-02-23T18:00:00Z",
      endTime: "2026-02-23T18:30:00Z",
      model: "claude-opus-4-6",
      version: "2.1.50",
      messageCount: 3,
      toolCallCount: 2,
    },
    messages: [
      {
        role: "user",
        timestamp: "2026-02-23T18:00:00Z",
        text: "Analyze episode 1",
        toolCalls: [],
      },
      {
        role: "assistant",
        timestamp: "2026-02-23T18:01:00Z",
        text: "Starting analysis.",
        toolCalls: [
          { name: "Read", brief: "/workspace/reports/ep01.json" },
          { name: "Bash", brief: "Run tests" },
        ],
      },
      {
        role: "assistant",
        timestamp: "2026-02-23T18:30:00Z",
        text: "Analysis complete.",
        toolCalls: [],
      },
    ],
  };

  it("includes title as H1", () => {
    const md = renderSessionMarkdown(minimalSession, "Episode 1 分析セッション");
    assert.ok(md.startsWith("# Episode 1 分析セッション\n"));
  });

  it("includes session metadata in Japanese", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    assert.ok(md.includes("セッション情報"));
    assert.ok(md.includes("日時"));
    assert.ok(md.includes("所要時間"));
    assert.ok(md.includes("モデル"));
    assert.ok(md.includes("claude-opus-4-6"));
    assert.ok(md.includes("30分"));
  });

  it("includes tool usage summary table", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    assert.ok(md.includes("ツール使用状況"));
    assert.ok(md.includes("| Read | 1 |"));
    assert.ok(md.includes("| Bash | 1 |"));
  });

  it("renders user messages with timestamp", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    assert.ok(md.includes("### [18:00] ユーザー"));
    assert.ok(md.includes("Analyze episode 1"));
  });

  it("renders assistant messages with tool calls", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    assert.ok(md.includes("### [18:01] アシスタント"));
    assert.ok(md.includes("Starting analysis."));
    assert.ok(md.includes("- `Read` — /workspace/reports/ep01.json"));
    assert.ok(md.includes("- `Bash` — Run tests"));
  });

  it("handles session with no tool calls", () => {
    const noToolsSession: ParsedSession = {
      metadata: { ...minimalSession.metadata, toolCallCount: 0 },
      messages: [
        { role: "user", timestamp: "2026-02-23T18:00:00Z", text: "Hello", toolCalls: [] },
      ],
    };
    const md = renderSessionMarkdown(noToolsSession, "Test");
    assert.ok(!md.includes("ツール使用状況"));
  });
});

// --- generateFilename ---

describe("generateFilename", () => {
  it("generates date-slug format", () => {
    const result = generateFilename("2026-02-23T18:00:00Z", "episode-1-analysis");
    assert.equal(result, "2026-02-23-episode-1-analysis.md");
  });

  it("normalizes slug with special characters", () => {
    const result = generateFilename("2026-02-23T18:00:00Z", "Episode 1 Analysis!");
    assert.equal(result, "2026-02-23-episode-1-analysis.md");
  });

  it("falls back to 'session' for empty slug", () => {
    const result = generateFilename("2026-02-23T18:00:00Z", "");
    assert.equal(result, "2026-02-23-session.md");
  });

  it("handles invalid date gracefully", () => {
    const result = generateFilename("invalid", "test");
    // Should use today's date as fallback
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(result, `${today}-test.md`);
  });
});
