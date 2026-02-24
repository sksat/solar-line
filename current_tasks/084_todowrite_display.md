# Task 084: Claude Code 固有ツールの表示改善

## Status: DONE

## Motivation

Human directive: 「ToDoWrite みたいな、Claude Code 特有のログは Claude Code 見てる時みたいにいいかんじに表示したい」

## Implementation

### TodoWrite → Task Checklist Display
- Added `TodoItem` interface and `todoItems` field to `ToolCallSummary`
- `extractTodoItems()` function parses TodoWrite input
- Renders as checklist with status icons: ✅ completed, 🔄 in_progress, ⬜ pending
- Header: 📋 **タスク更新**

### Skill → Named Skill Block
- Renders as: 🛠️ **スキル**: nice-friend

### SubAgent (already existed)
- 🔀 **サブエージェント** (Explore [haiku]) — description

## Changes

- `session-log-types.ts`: Added `TodoItem` interface, `todoItems` field
- `session-log.ts`: Added `extractTodoItems()`, updated rendering
- `session-log.test.ts`: 5 new tests
- 975 TS tests passing
