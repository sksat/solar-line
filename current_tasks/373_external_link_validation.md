# Task 373: External Link Validation for Reports

## Status: DONE

## Motivation

CLAUDE.md requires: "External source links: All external source citations (NASA NTRS, papers, worldbuilding documents) must be rendered as clickable hyperlinks, not plain text."

Currently, internal links between reports are validated (report-data-validation.test.ts), but there is no validation of external URLs. With ~72 external URLs across episode and summary reports, link rot or formatting issues could degrade reader experience.

## Scope

1. Add tests that extract all external URLs from episode and summary reports
2. Validate URL format (proper https://, no truncation, no malformed encoding)
3. Check for common issues: duplicate URLs, plain-text URLs not wrapped in links, HTTP vs HTTPS
4. Ensure external source citations in reports are actually rendered as clickable `<a>` tags (not just plain text URLs)
5. Validate known domains are reachable patterns (not runtime HTTP checks, but structural validation)

## Non-goals

- Runtime HTTP link checking (requires network access, flaky in CI)
- Fixing any content issues in reports (separate tasks if found)
