# Task 182: Rename 考察 → 考証 across site and codebase

## Status: DONE

## Description
Per ADR-015 (Accepted), renamed the project from 「SOLAR LINE 考察」 to 「SOLAR LINE 考証」.

## Changes Made
- `ts/src/templates.ts`: Site title, footer, OG metadata, landing page, description, back-links
- `ts/src/templates.test.ts`: Updated all test assertions
- `ts/src/build.ts`: Manifest title, file comment
- `ts/src/build.test.ts`: Updated manifest test assertions
- `ts/src/dag-seed.ts`: Communications report title
- `dag/state.json`: Communications report node title
- `reports/data/summary/communications.md`: Report title
- `reports/data/summary/attitude-control.md`: Report title
- `reports/data/summary/ship-kestrel.md`: 本考察→本考証
- `reports/data/summary/ai-costs.md`: Project reference
- `reports/data/summary/tech-overview.md`: Title, project description, body text
- `adr/015-naming-kousatsu-vs-koushou.md`: Status → Accepted

## Preserved (intentionally kept as 考察)
- Generic "analysis/discussion" usage in report body text (e.g., "### 考察" section headers)
- "ヤコビアン的考察" in cross-episode analysis (generic analytical sense)
- "軌道力学的考察" in other-ships analysis (generic analytical sense)
- Human directive quotes (verbatim)

## Verification
- 1496 TS unit tests: ALL PASS
- 96 Playwright E2E tests: ALL PASS
- 48 Rust tests: ALL PASS
- 323 data validation tests: ALL PASS
- Site build: SUCCESS
