# Task 187: Episode Report MDX Migration — EP02-EP05

## Status: IN_PROGRESS

## Description

Continue the MDX migration started in Task 186 (EP01 pilot). Convert EP02, EP03, EP04, and EP05 episode reports from JSON to MDX format using the existing `convert-episode-to-mdx.ts` script and `episode-mdx-parser.ts` parser.

## Approach

1. Use `convert-episode-to-mdx.ts` to convert each episode
2. Verify each conversion passes all tests
3. Delete the source JSON files after successful migration
4. Run full test suite to ensure no regressions

## Dependencies

- Task 186 (EP01 MDX migration — DONE)
- `episode-mdx-parser.ts` parser
- `convert-episode-to-mdx.ts` conversion script
