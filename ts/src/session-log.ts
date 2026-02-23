/**
 * Session log extraction from Claude Code JSONL conversation logs.
 *
 * Parses JSONL, filters conversation messages, and renders to markdown
 * suitable for the existing reports/logs/ pipeline.
 */

import type {
  JournalEntry,
  ProcessedMessage,
  ToolCallSummary,
  SessionMetadata,
  ParsedSession,
  MessageContent,
  ToolUseContent,
  TextContent,
} from "./session-log-types.ts";

/** Patterns that should be redacted from public logs */
const REDACT_PATTERNS: RegExp[] = [
  // API keys and tokens
  /(?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*["']?[\w\-./+=]{8,}/gi,
  // Absolute home directory paths (replace with ~)
  /\/home\/\w+/g,
  // Environment variable assignments with sensitive-looking values
  /(?:export\s+)?(?:API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS?)\s*=\s*\S+/gi,
];

/** Apply redaction patterns to text */
export function redactSensitive(text: string): string {
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => {
      if (pattern === REDACT_PATTERNS[1]) {
        // Home directory → replace with ~
        return "~";
      }
      return "[REDACTED]";
    });
  }
  return result;
}

/** Parse a single JSONL line, returning null for non-conversation entries */
export function parseJournalEntry(line: string): JournalEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const type = obj.type as string;
  if (type !== "user" && type !== "assistant") return null;

  // Skip meta messages (internal system messages)
  if (obj.isMeta) return null;

  // Must have a message with content
  const message = obj.message as JournalEntry["message"];
  if (!message?.content) return null;

  return obj as unknown as JournalEntry;
}

/** Extract a brief description from a tool call's input */
export function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Read":
      return String(input.file_path ?? "").replace(/\/home\/\w+/g, "~");
    case "Write":
      return `→ ${String(input.file_path ?? "").replace(/\/home\/\w+/g, "~")}`;
    case "Edit":
      return String(input.file_path ?? "").replace(/\/home\/\w+/g, "~");
    case "Bash":
      return String(input.description ?? input.command ?? "").slice(0, 80);
    case "Glob":
      return String(input.pattern ?? "");
    case "Grep":
      return `/${String(input.pattern ?? "")}/`;
    case "Task":
      return String(input.description ?? "").slice(0, 60);
    case "TodoWrite":
      return "update task list";
    case "WebSearch":
      return String(input.query ?? "").slice(0, 60);
    case "WebFetch":
      return String(input.url ?? "").slice(0, 80);
    case "Skill":
      return String(input.skill ?? "");
    default:
      return "";
  }
}

/** Process a single journal entry into a processed message */
export function processEntry(entry: JournalEntry): ProcessedMessage | null {
  const message = entry.message;
  if (!message) return null;

  const content = message.content;
  const toolCalls: ToolCallSummary[] = [];
  let textParts: string[] = [];

  if (typeof content === "string") {
    // Simple string content — skip command/system messages
    if (content.includes("<local-command") || content.includes("<command-name>")) return null;
    if (content.includes("<system-reminder>")) return null;
    textParts.push(content);
  } else if (Array.isArray(content)) {
    for (const item of content as MessageContent[]) {
      switch (item.type) {
        case "text":
          // Filter out system-reminder blocks from text
          {
            const text = (item as TextContent).text;
            if (text.includes("<system-reminder>")) {
              const cleaned = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
              if (cleaned) textParts.push(cleaned);
            } else {
              textParts.push(text);
            }
          }
          break;
        case "tool_use": {
          const tu = item as ToolUseContent;
          toolCalls.push({
            name: tu.name,
            brief: summarizeToolInput(tu.name, tu.input),
          });
          break;
        }
        case "tool_result":
          // Skip tool results — we summarize via tool_use
          break;
        case "thinking":
          // Excluded from public logs per design
          break;
      }
    }
  }

  const text = textParts.join("\n").trim();

  // Skip empty messages (e.g., pure tool_result messages from user)
  if (!text && toolCalls.length === 0) return null;

  return {
    role: message.role,
    timestamp: entry.timestamp,
    text: redactSensitive(text),
    toolCalls,
  };
}

/** Parse an entire JSONL file into a ParsedSession */
export function parseSession(jsonlContent: string): ParsedSession {
  const lines = jsonlContent.split("\n");
  const messages: ProcessedMessage[] = [];
  let model = "unknown";
  let version = "unknown";
  let sessionId = "unknown";

  for (const line of lines) {
    const entry = parseJournalEntry(line);
    if (!entry) continue;

    // Extract metadata from first available entry
    if (sessionId === "unknown" && entry.sessionId) sessionId = entry.sessionId;
    if (version === "unknown" && entry.version) version = entry.version;
    if (model === "unknown" && entry.message?.model) model = entry.message.model;

    const processed = processEntry(entry);
    if (processed) messages.push(processed);
  }

  // Compute metadata
  const timestamps = messages.map((m) => m.timestamp).filter(Boolean);
  const startTime = timestamps[0] ?? "";
  const endTime = timestamps[timestamps.length - 1] ?? "";
  const toolCallCount = messages.reduce((sum, m) => sum + m.toolCalls.length, 0);

  return {
    metadata: {
      sessionId,
      startTime,
      endTime,
      model,
      version,
      messageCount: messages.length,
      toolCallCount,
    },
    messages,
  };
}

/** Format an ISO timestamp to HH:MM */
function formatTime(iso: string): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}

/** Format duration between two ISO timestamps */
function formatDuration(start: string, end: string): string {
  if (!start || !end) return "不明";
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 0) return "不明";
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin}分`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours}時間${mins}分`;
  } catch {
    return "不明";
  }
}

/** Render a ParsedSession to markdown for reports/logs/ */
export function renderSessionMarkdown(session: ParsedSession, title: string): string {
  const { metadata, messages } = session;
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push("");
  lines.push("## セッション情報");
  lines.push("");
  lines.push(`- **日時**: ${metadata.startTime ? new Date(metadata.startTime).toISOString().slice(0, 10) : "不明"}`);
  lines.push(`- **所要時間**: ${formatDuration(metadata.startTime, metadata.endTime)}`);
  lines.push(`- **モデル**: ${metadata.model}`);
  lines.push(`- **メッセージ数**: ${metadata.messageCount}`);
  lines.push(`- **ツール呼出**: ${metadata.toolCallCount}回`);
  lines.push(`- **バージョン**: Claude Code ${metadata.version}`);
  lines.push("");

  // Tool call summary table
  const toolCounts = new Map<string, number>();
  for (const msg of messages) {
    for (const tc of msg.toolCalls) {
      toolCounts.set(tc.name, (toolCounts.get(tc.name) ?? 0) + 1);
    }
  }
  if (toolCounts.size > 0) {
    lines.push("## ツール使用状況");
    lines.push("");
    lines.push("| ツール | 回数 |");
    lines.push("|--------|------|");
    const sorted = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      lines.push(`| ${name} | ${count} |`);
    }
    lines.push("");
  }

  // Conversation transcript (summarized)
  lines.push("## セッションログ");
  lines.push("");

  for (const msg of messages) {
    const time = formatTime(msg.timestamp);
    if (msg.role === "user" && msg.text) {
      lines.push(`### [${time}] ユーザー`);
      lines.push("");
      lines.push(msg.text);
      lines.push("");
    } else if (msg.role === "assistant") {
      if (msg.text) {
        lines.push(`### [${time}] アシスタント`);
        lines.push("");
        lines.push(msg.text);
        lines.push("");
      }
      if (msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          const brief = tc.brief ? ` — ${tc.brief}` : "";
          lines.push(`- \`${tc.name}\`${brief}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/** Generate the output filename in YYYY-MM-DD-slug format */
export function generateFilename(startTime: string, slug: string): string {
  let date: string;
  try {
    date = new Date(startTime).toISOString().slice(0, 10);
  } catch {
    date = new Date().toISOString().slice(0, 10);
  }

  // Normalize slug: lowercase, replace non-alphanumeric with hyphens, collapse
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${date}-${normalized || "session"}.md`;
}
