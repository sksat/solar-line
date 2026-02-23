/**
 * Types for parsing Claude Code JSONL conversation logs.
 *
 * Claude Code stores session data as JSONL files where each line is one of:
 * - "user" / "assistant" messages (the actual conversation)
 * - "file-history-snapshot" (internal file tracking)
 * - "queue-operation" (internal queue management)
 *
 * We only care about user/assistant messages for log extraction.
 */

/** Content item types within a message */
export interface TextContent {
  type: "text";
  text: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string | unknown[];
}

export type MessageContent =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent;

/** The inner message object within a JSONL entry */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string | MessageContent[];
  model?: string;
  id?: string;
}

/** A single line in the Claude Code JSONL log */
export interface JournalEntry {
  type: "user" | "assistant" | "file-history-snapshot" | "queue-operation";
  uuid: string;
  sessionId: string;
  timestamp: string;
  version?: string;
  gitBranch?: string;
  cwd?: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  isMeta?: boolean;
  message?: ConversationMessage;
}

/** Summary of a tool call for the rendered log */
export interface ToolCallSummary {
  name: string;
  /** Brief description derived from tool input (e.g., file path, command) */
  brief: string;
}

/** A processed message ready for rendering */
export interface ProcessedMessage {
  role: "user" | "assistant";
  timestamp: string;
  /** Text content from the message (thinking blocks excluded) */
  text: string;
  /** Tool calls made in this message */
  toolCalls: ToolCallSummary[];
}

/** Extracted session metadata */
export interface SessionMetadata {
  sessionId: string;
  startTime: string;
  endTime: string;
  model: string;
  version: string;
  messageCount: number;
  toolCallCount: number;
}

/** Complete parsed session ready for rendering */
export interface ParsedSession {
  metadata: SessionMetadata;
  messages: ProcessedMessage[];
}
