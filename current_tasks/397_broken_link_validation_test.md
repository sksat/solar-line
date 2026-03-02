# Task 397: Add Broken Link Validation Test

## Status: **DONE**

## Summary

Task 396 fixed broken links manually, but there's no automated test to prevent regressions. Add a test that validates all internal links in report markdown files point to valid targets.

## Rationale
- CLAUDE.md: "Source citations must be clickable links"
- Manual link fixing is error-prone and doesn't prevent future breaks
- Catches absolute paths, missing .html extensions, incorrect file naming patterns

## Implementation
1. Scan all .md report files for markdown links
2. Validate internal links (non-http) against known file patterns
3. Check that episode links use ep-00X.html format
4. Check that summary links between files in same directory use relative paths
5. Flag absolute paths starting with / (should be relative)
