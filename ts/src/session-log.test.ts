import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  redactSensitive,
  parseJournalEntry,
  summarizeToolInput,
  extractSubAgent,
  extractTodoItems,
  extractCommitHashes,
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

// --- extractSubAgent ---

describe("extractSubAgent", () => {
  it("extracts sub-agent details from Task input", () => {
    const result = extractSubAgent({
      description: "Explore codebase",
      subagent_type: "Explore",
      model: "haiku",
    });
    assert.equal(result.description, "Explore codebase");
    assert.equal(result.subagentType, "Explore");
    assert.equal(result.model, "haiku");
  });

  it("handles missing model", () => {
    const result = extractSubAgent({
      description: "Run tests",
      subagent_type: "Bash",
    });
    assert.equal(result.subagentType, "Bash");
    assert.equal(result.model, undefined);
  });
});

// --- extractTodoItems ---

describe("extractTodoItems", () => {
  it("extracts todo items from TodoWrite input", () => {
    const result = extractTodoItems({
      todos: [
        { content: "Task A", status: "completed", activeForm: "Completing A" },
        { content: "Task B", status: "in_progress", activeForm: "Working on B" },
        { content: "Task C", status: "pending", activeForm: "Starting C" },
      ],
    });
    assert.equal(result.length, 3);
    assert.equal(result[0].content, "Task A");
    assert.equal(result[0].status, "completed");
    assert.equal(result[1].status, "in_progress");
    assert.equal(result[2].status, "pending");
  });

  it("handles missing todos array", () => {
    const result = extractTodoItems({});
    assert.equal(result.length, 0);
  });

  it("filters invalid items", () => {
    const result = extractTodoItems({
      todos: [
        { content: "Valid", status: "completed" },
        "invalid",
        42,
        null,
      ],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].content, "Valid");
  });
});

// --- extractCommitHashes ---

describe("extractCommitHashes", () => {
  it("extracts commit hash from git output", () => {
    const text = '[main abc1234] Add feature X\n 3 files changed';
    const result = extractCommitHashes(text);
    assert.deepEqual(result, ["abc1234"]);
  });

  it("extracts multiple commit hashes", () => {
    const text = '[main abc1234] First commit\n[main def5678] Second commit';
    const result = extractCommitHashes(text);
    assert.deepEqual(result, ["abc1234", "def5678"]);
  });

  it("deduplicates hashes", () => {
    const text = '[main abc1234] Commit\n[main abc1234] Same commit';
    const result = extractCommitHashes(text);
    assert.deepEqual(result, ["abc1234"]);
  });

  it("returns empty for text without commits", () => {
    const text = "Just some regular text";
    assert.deepEqual(extractCommitHashes(text), []);
  });

  it("handles branch names with slashes", () => {
    const text = '[feature/foo abc1234] Commit on branch';
    assert.deepEqual(extractCommitHashes(text), ["abc1234"]);
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

  it("includes model in processed message", () => {
    const result = processEntry(makeEntry({
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
        model: "claude-opus-4-6",
      },
    }));
    assert.ok(result);
    assert.equal(result!.model, "claude-opus-4-6");
  });

  it("extracts sub-agent details from Task tool calls", () => {
    const result = processEntry(makeEntry({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "Task", input: {
            description: "Explore codebase",
            subagent_type: "Explore",
            model: "haiku",
            prompt: "Find all test files",
          } },
        ],
      },
    }));
    assert.ok(result);
    assert.equal(result!.toolCalls.length, 1);
    assert.ok(result!.toolCalls[0].subAgent);
    assert.equal(result!.toolCalls[0].subAgent!.subagentType, "Explore");
    assert.equal(result!.toolCalls[0].subAgent!.model, "haiku");
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
    assert.deepEqual(result.metadata.commitHashes, []);
  });

  it("extracts commit hashes from assistant text", () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        uuid: "a1",
        sessionId: "s",
        timestamp: "2026-02-23T18:00:00Z",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "[main abc1234] Add feature X\n 3 files changed" }],
        },
      }),
    ];
    const result = parseSession(lines.join("\n"));
    assert.deepEqual(result.metadata.commitHashes, ["abc1234"]);
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
      commitHashes: [],
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
        model: "claude-opus-4-6",
        toolCalls: [
          { name: "Read", brief: "/workspace/reports/ep01.json" },
          { name: "Bash", brief: "Run tests" },
        ],
      },
      {
        role: "assistant",
        timestamp: "2026-02-23T18:30:00Z",
        text: "Analysis complete.",
        model: "claude-opus-4-6",
        toolCalls: [],
      },
    ],
  };

  it("includes title as H1", () => {
    const md = renderSessionMarkdown(minimalSession, "Episode 1 分析セッション");
    assert.ok(md.startsWith("# Episode 1 分析セッション\n"));
  });

  it("includes session metadata in Japanese with JST", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    assert.ok(md.includes("セッション情報"));
    assert.ok(md.includes("日時"));
    assert.ok(md.includes("(JST)"));
    // 2026-02-23T18:00:00Z = 2026-02-24 JST
    assert.ok(md.includes("2026-02-24"));
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

  it("renders user messages with JST timestamp", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    // 2026-02-23T18:00:00Z = 2026-02-24T03:00:00 JST
    assert.ok(md.includes("### [03:00] ユーザー"));
    assert.ok(md.includes("Analyze episode 1"));
  });

  it("renders assistant messages with model label", () => {
    const md = renderSessionMarkdown(minimalSession, "Test");
    // 2026-02-23T18:01:00Z = 2026-02-24T03:01:00 JST
    assert.ok(md.includes("### [03:01] アシスタント (claude-opus-4-6)"));
    assert.ok(md.includes("Starting analysis."));
    assert.ok(md.includes("- `Read` — /workspace/reports/ep01.json"));
    assert.ok(md.includes("- `Bash` — Run tests"));
  });

  it("renders assistant without model if not set", () => {
    const session: ParsedSession = {
      ...minimalSession,
      messages: [{
        role: "assistant",
        timestamp: "2026-02-23T18:01:00Z",
        text: "No model info",
        toolCalls: [],
      }],
    };
    const md = renderSessionMarkdown(session, "Test");
    // 2026-02-23T18:01:00Z = 2026-02-24T03:01:00 JST
    assert.ok(md.includes("### [03:01] アシスタント\n"));
    assert.ok(!md.includes("アシスタント ("));
  });

  it("renders sub-agent invocations specially", () => {
    const session: ParsedSession = {
      ...minimalSession,
      messages: [{
        role: "assistant",
        timestamp: "2026-02-23T18:05:00Z",
        text: "",
        toolCalls: [{
          name: "Task",
          brief: "Explore codebase",
          subAgent: { description: "Explore codebase", subagentType: "Explore", model: "haiku" },
        }],
      }],
    };
    const md = renderSessionMarkdown(session, "Test");
    assert.ok(md.includes("サブエージェント"));
    assert.ok(md.includes("Explore"));
    assert.ok(md.includes("[haiku]"));
  });

  it("renders TodoWrite as task checklist", () => {
    const session: ParsedSession = {
      ...minimalSession,
      messages: [{
        role: "assistant",
        timestamp: "2026-02-23T18:05:00Z",
        text: "",
        toolCalls: [{
          name: "TodoWrite",
          brief: "update task list",
          todoItems: [
            { content: "Implement feature A", status: "completed" },
            { content: "Write tests for B", status: "in_progress" },
            { content: "Deploy to staging", status: "pending" },
          ],
        }],
      }],
    };
    const md = renderSessionMarkdown(session, "Test");
    assert.ok(md.includes("📋 **タスク更新**"));
    assert.ok(md.includes("✅ Implement feature A"));
    assert.ok(md.includes("🔄 Write tests for B"));
    assert.ok(md.includes("⬜ Deploy to staging"));
    assert.ok(!md.includes("`TodoWrite`"));
  });

  it("renders Skill invocations with icon", () => {
    const session: ParsedSession = {
      ...minimalSession,
      messages: [{
        role: "assistant",
        timestamp: "2026-02-23T18:05:00Z",
        text: "",
        toolCalls: [{
          name: "Skill",
          brief: "nice-friend",
        }],
      }],
    };
    const md = renderSessionMarkdown(session, "Test");
    assert.ok(md.includes("🛠️ **スキル**: nice-friend"));
    assert.ok(!md.includes("`Skill`"));
  });

  it("renders commit hashes as plain code without repoUrl", () => {
    const session: ParsedSession = {
      ...minimalSession,
      metadata: { ...minimalSession.metadata, commitHashes: ["abc1234", "def5678"] },
    };
    const md = renderSessionMarkdown(session, "Test");
    assert.ok(md.includes("コミット"));
    assert.ok(md.includes("`abc1234`"));
    assert.ok(md.includes("`def5678`"));
  });

  it("renders commit hashes as links with repoUrl", () => {
    const session: ParsedSession = {
      ...minimalSession,
      metadata: { ...minimalSession.metadata, commitHashes: ["abc1234"] },
    };
    const md = renderSessionMarkdown(session, "Test", {
      repoUrl: "https://github.com/owner/repo",
    });
    assert.ok(md.includes("[`abc1234`](https://github.com/owner/repo/commit/abc1234)"));
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
  it("generates date-slug format in JST", () => {
    // 2026-02-23T18:00:00Z = 2026-02-24T03:00:00 JST → date is 2026-02-24
    const result = generateFilename("2026-02-23T18:00:00Z", "episode-1-analysis");
    assert.equal(result, "2026-02-24-episode-1-analysis.md");
  });

  it("normalizes slug with special characters", () => {
    const result = generateFilename("2026-02-23T18:00:00Z", "Episode 1 Analysis!");
    assert.equal(result, "2026-02-24-episode-1-analysis.md");
  });

  it("falls back to 'session' for empty slug", () => {
    const result = generateFilename("2026-02-23T18:00:00Z", "");
    assert.equal(result, "2026-02-24-session.md");
  });

  it("uses JST date before midnight crossing", () => {
    // 2026-02-23T14:00:00Z = 2026-02-23T23:00:00 JST → still 2026-02-23
    const result = generateFilename("2026-02-23T14:00:00Z", "test");
    assert.equal(result, "2026-02-23-test.md");
  });

  it("handles invalid date gracefully", () => {
    const result = generateFilename("invalid", "test");
    // Should use today's date (JST) as fallback
    const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = jst.toISOString().slice(0, 10);
    assert.equal(result, `${today}-test.md`);
  });
});
